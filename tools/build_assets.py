#!/usr/bin/env python3
"""中正高中 3D 校園導覽：樹冠資產建置工具。

用途
----
分析校園平面圖上的綠色圓形樹冠，自動提取每棵樹的「圓心像素座標、半徑、樹冠色系」，
輸出成前端可直接以 <script> 載入的 data/trees-data.js（window.CAMPUS_TREES），
再由 js/app.js 以 THREE.InstancedMesh 一次送進 GPU 渲染。

演算法流程
----------
1. 載入平面圖：預設讀取 data/map_texture.js 內「已移除工區／紅火蟻防治區標示」的
   Base64 貼圖，確保偵測結果與 3D 地面貼圖完全一致；也可用 --source 指定 PNG。
2. 色彩分割（NumPy 向量化 HSV）：保留樹冠的三種綠色（淺黃綠、中綠、深綠與輪廓線），
   排除草皮（色相約 90°、低飽和）與黑色文字線條。
3. 形態學開運算：去除 1 至 2 px 的細線與雜訊。
4. 連通區塊標記：剔除面積過小、或填滿率過高的長條矩形（綠籬、草皮帶）。
5. 尺度空間斑點偵測：以 FFT 計算多尺度「尺度正規化高斯拉普拉斯 (LoG)」，
   取 (x, y, 半徑) 三維局部極大值；圓盤響應約 0.74、等寬長條約 0.41，
   因此可排除綠籬，並把一整排緊貼的行道樹在收窄處拆成單棵。
6. 非極大值抑制：依響應強度貪婪挑選，重疊過多的候選視為同一棵。
7. 圓形度驗證：圓盤內樹冠像素占比需達門檻，外圈環帶不得仍是大面積綠色。
8. 輸出 data/trees-data.js，並可用 --debug 產生標註疊圖供人工檢查。

使用方式
--------
    python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
    .venv/bin/python tools/build_assets.py            # 產生 data/trees-data.js
    .venv/bin/python tools/build_assets.py --debug    # 另輸出 tools/debug/ 疊圖
    執行後會自動呼叫 node tools/build_index.js 重新組裝 index.html（--no-bundle 可略過）。
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import re
import shutil
import subprocess
import sys
import time
from collections import deque
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TEXTURE_JS = ROOT / "data" / "map_texture.js"
DEFAULT_OUTPUT = ROOT / "data" / "trees-data.js"
DEBUG_DIR = ROOT / "tools" / "debug"


# ---------------------------------------------------------------------------
# 參數設定
# ---------------------------------------------------------------------------
@dataclass
class DetectParams:
    min_radius: float = 4.0       # 最小樹冠半徑 (px)，低於此值視為雜訊
    max_radius: float = 22.0      # 最大樹冠半徑 (px)，高於此值視為草皮或色塊
    min_area: int = 30            # 連通區塊最小面積 (px²)
    strip_fill_ratio: float = 0.93  # 外接矩形填滿率高於此值且狹長者視為綠籬／草皮帶
    strip_aspect: float = 3.5     # 狹長判定之長寬比
    log_threshold: float = 0.56   # LoG 響應門檻：圓盤約 0.74、等寬長條約 0.41
    nms_overlap: float = 0.80     # 兩圓心距離 < (r1 + r2) × 此值則視為同一棵
    min_disc_fill: float = 0.75   # 圓盤內樹冠像素占比門檻（圓形度驗證）
    max_ring_fill: float = 0.50   # 樹冠外圈環帶的樹冠像素占比上限（排除大面積綠色色塊）
    open_iterations: int = 1      # 形態學開運算次數
    # 排除區（x0, y0, x1, y1 像素）：圖例、標題列、大花圃與排球場旁花圃（花圃改以立體花叢與綠籬呈現，不種喬木）
    exclude_rects: tuple = (
        (600, 1005, 1406, 1078),
        (0, 0, 1406, 62),
        (545, 525, 798, 628),
        (795, 485, 885, 592),
        (335, 725, 512, 918),
    )


# ---------------------------------------------------------------------------
# 1. 影像載入
# ---------------------------------------------------------------------------
def load_map(source: Path | None) -> tuple[np.ndarray, str]:
    """回傳 (H×W×3 uint8 RGB 陣列, 來源描述)。"""
    if source is not None:
        img = Image.open(source).convert("RGB")
        return np.asarray(img), source.name

    text = DEFAULT_TEXTURE_JS.read_text(encoding="utf-8")
    match = re.search(r"data:image/png;base64,([A-Za-z0-9+/=]+)", text)
    if not match:
        sys.exit(f"[錯誤] 無法在 {DEFAULT_TEXTURE_JS} 找到 Base64 平面圖貼圖")
    img = Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert("RGB")
    return np.asarray(img), "data/map_texture.js (已清除標示之平面圖)"


# ---------------------------------------------------------------------------
# 2. 色彩分割
# ---------------------------------------------------------------------------
def rgb_to_hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """NumPy 向量化 RGB→HSV。H: 0..360 度，S/V: 0..1。"""
    arr = rgb.astype(np.float32) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    cmax = arr.max(axis=-1)
    cmin = arr.min(axis=-1)
    delta = cmax - cmin
    safe = np.where(delta == 0, 1.0, delta)

    h = np.zeros_like(cmax)
    rmax = (cmax == r) & (delta > 0)
    gmax = (cmax == g) & (delta > 0) & ~rmax
    bmax = (cmax == b) & (delta > 0) & ~rmax & ~gmax
    h[rmax] = (60.0 * ((g - b) / safe) % 360.0)[rmax]
    h[gmax] = (60.0 * ((b - r) / safe) + 120.0)[gmax]
    h[bmax] = (60.0 * ((r - g) / safe) + 240.0)[bmax]
    s = np.where(cmax == 0, 0.0, delta / np.where(cmax == 0, 1.0, cmax))
    return h, s, cmax


def build_tree_mask(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """回傳 (樹冠布林遮罩, 色系分類陣列 0=非樹 1=淺黃綠 2=中綠 3=深綠)。"""
    h, s, v = rgb_to_hsv(rgb)
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)

    green_dominant = (g >= r) & (g - b >= 25)

    # 草皮：色相約 82..102 度、飽和度偏低、明度高（例如 RGB 160,200,128）
    lawn = (h >= 82) & (h <= 102) & (s < 0.43) & (v > 0.70)

    light = green_dominant & (h >= 55) & (h < 82) & (s >= 0.38) & (v > 0.55)    # 淺黃綠樹冠
    medium = green_dominant & (h >= 102) & (h <= 150) & (s >= 0.35) & (v > 0.45)  # 中綠樹冠
    # 深綠樹冠與外框陰影（例如 RGB 35,66,32 / 14,24,17）：綠色分量略高於紅藍即可，排除純黑線條
    dark = (g >= r + 6) & (g >= b + 5) & (s >= 0.35) & (v >= 0.05) & (v <= 0.50) & (h >= 70) & (h <= 170)
    # 介於草皮與中綠間的鮮綠（色相 82..102 但飽和度高）也屬於樹冠陰影
    vivid = green_dominant & (h >= 82) & (h < 102) & (s >= 0.43) & (v > 0.45)

    mask = (light | medium | dark | vivid) & ~lawn
    classes = np.zeros(mask.shape, dtype=np.uint8)
    classes[light] = 1
    classes[medium | vivid] = 2
    classes[dark] = 3
    classes[~mask] = 0
    return mask, classes


# ---------------------------------------------------------------------------
# 3. 形態學運算（純 NumPy 位移實作，不依賴 SciPy）
# ---------------------------------------------------------------------------
def _shift(mask: np.ndarray, dy: int, dx: int, fill: bool) -> np.ndarray:
    out = np.full_like(mask, fill)
    h, w = mask.shape
    ys = slice(max(dy, 0), h + min(dy, 0))
    yd = slice(max(-dy, 0), h + min(-dy, 0))
    xs = slice(max(dx, 0), w + min(dx, 0))
    xd = slice(max(-dx, 0), w + min(-dx, 0))
    out[ys, xs] = mask[yd, xd]
    return out


CROSS = [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]
SQUARE = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]


def erode(mask: np.ndarray, kernel=SQUARE) -> np.ndarray:
    out = mask.copy()
    for dy, dx in kernel:
        out &= _shift(mask, dy, dx, False)
    return out


def dilate(mask: np.ndarray, kernel=SQUARE) -> np.ndarray:
    out = mask.copy()
    for dy, dx in kernel:
        out |= _shift(mask, dy, dx, False)
    return out


def binary_open(mask: np.ndarray, iterations: int) -> np.ndarray:
    out = mask
    for _ in range(iterations):
        out = erode(out)
    for _ in range(iterations):
        out = dilate(out)
    return out


def max_filter3(arr: np.ndarray) -> np.ndarray:
    """3×3 最大值濾波（最後兩軸），用於尋找空間局部極大值。"""
    out = arr.copy()
    for axis in (-2, -1):
        acc = out.copy()
        acc = np.maximum(acc, np.roll(out, 1, axis=axis))
        acc = np.maximum(acc, np.roll(out, -1, axis=axis))
        out = acc
    return out


def log_scale_space(mask: np.ndarray, radii: np.ndarray) -> np.ndarray:
    """尺度正規化高斯拉普拉斯 (scale-normalized LoG) 尺度空間，以 FFT 計算。

    對半徑 r 的實心圓盤，σ = r / √2 時中心響應最大（約 0.74）；
    等寬直線長條的中心響應僅約 0.41，因此可用門檻自然排除綠籬長條，
    並能把一整排緊貼的行道樹在收窄處拆成單棵。
    回傳形狀 (len(radii), H, W) 的響應值，正值代表亮色圓形斑點。
    """
    h, w = mask.shape
    # 補邊避免 FFT 環繞效應
    pad = int(np.ceil(radii.max() * 3))
    padded = np.zeros((h + 2 * pad, w + 2 * pad), dtype=np.float32)
    padded[pad:pad + h, pad:pad + w] = mask
    spec = np.fft.rfft2(padded)
    fy = np.fft.fftfreq(padded.shape[0])[:, None]
    fx = np.fft.rfftfreq(padded.shape[1])[None, :]
    f2 = (fy ** 2 + fx ** 2).astype(np.float32)

    stack = np.empty((len(radii), h, w), dtype=np.float32)
    for i, r in enumerate(radii):
        sigma = r / np.sqrt(2.0)
        # -σ²∇²G 的頻率響應：σ² · 4π²f² · exp(-2π²σ²f²)
        kernel = (sigma ** 2) * (4 * np.pi ** 2) * f2 * np.exp(-2 * np.pi ** 2 * sigma ** 2 * f2)
        resp = np.fft.irfft2(spec * kernel, s=padded.shape)
        stack[i] = resp[pad:pad + h, pad:pad + w]
    return stack


# ---------------------------------------------------------------------------
# 4. 連通區塊標記（8 連通 BFS）
# ---------------------------------------------------------------------------
def label_components(mask: np.ndarray) -> tuple[np.ndarray, list[dict]]:
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    comps: list[dict] = []
    ys, xs = np.nonzero(mask)
    next_id = 0
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if labels[y0, x0]:
            continue
        next_id += 1
        labels[y0, x0] = next_id
        queue = deque([(y0, x0)])
        area = 0
        miny, maxy, minx, maxx = y0, y0, x0, x0
        while queue:
            y, x = queue.popleft()
            area += 1
            miny, maxy = min(miny, y), max(maxy, y)
            minx, maxx = min(minx, x), max(maxx, x)
            for dy in (-1, 0, 1):
                ny = y + dy
                if ny < 0 or ny >= h:
                    continue
                for dx in (-1, 0, 1):
                    nx = x + dx
                    if 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = next_id
                        queue.append((ny, nx))
        comps.append({"id": next_id, "area": area, "bbox": (minx, miny, maxx, maxy)})
    return labels, comps


def reject_non_tree_components(mask: np.ndarray, p: DetectParams) -> tuple[np.ndarray, dict]:
    labels, comps = label_components(mask)
    keep = np.zeros(len(comps) + 1, dtype=bool)
    stats = {"components": len(comps), "tooSmall": 0, "strips": 0}
    for c in comps:
        minx, miny, maxx, maxy = c["bbox"]
        bw, bh = maxx - minx + 1, maxy - miny + 1
        fill = c["area"] / float(bw * bh)
        aspect = max(bw, bh) / max(1, min(bw, bh))
        if c["area"] < p.min_area:
            stats["tooSmall"] += 1
            continue
        # 樹冠為圓形，整排行道樹的外接矩形填滿率約 π/4；接近 1 的狹長色塊是綠籬或草皮帶
        if fill >= p.strip_fill_ratio and aspect >= p.strip_aspect:
            stats["strips"] += 1
            continue
        keep[c["id"]] = True
    return keep[labels], stats


# ---------------------------------------------------------------------------
# 5. 樹冠圓心偵測
# ---------------------------------------------------------------------------
@dataclass
class Tree:
    px: int
    py: int
    r: float
    tone: int  # 1=淺黃綠 2=中綠 3=深綠


def detect_crowns(mask: np.ndarray, classes: np.ndarray, p: DetectParams) -> list[Tree]:
    h, w = mask.shape
    # 半徑以 1.12 倍等比遞增，涵蓋 min_radius..max_radius
    n = int(np.ceil(np.log(p.max_radius / p.min_radius) / np.log(1.12))) + 1
    radii = p.min_radius * (1.12 ** np.arange(n))
    stack = log_scale_space(mask.astype(np.float32), radii)

    # 尺度空間 3×3×3 局部極大值
    spatial_max = max_filter3(stack)
    scale_max = spatial_max.copy()
    scale_max[1:] = np.maximum(scale_max[1:], spatial_max[:-1])
    scale_max[:-1] = np.maximum(scale_max[:-1], spatial_max[1:])
    peaks = (stack >= scale_max) & (stack >= p.log_threshold) & mask[None, :, :]
    si, ys, xs = np.nonzero(peaks)
    resp = stack[si, ys, xs]
    order = np.argsort(-resp, kind="stable")

    accepted: list[Tree] = []
    grid: dict[tuple[int, int], list[int]] = {}
    cell = int(p.max_radius * 2)

    for idx in order.tolist():
        x, y, r = int(xs[idx]), int(ys[idx]), float(radii[si[idx]])
        gx, gy = x // cell, y // cell
        conflict = False
        for ny in (gy - 1, gy, gy + 1):
            for nx in (gx - 1, gx, gx + 1):
                for tid in grid.get((nx, ny), []):
                    t = accepted[tid]
                    d2 = (t.px - x) ** 2 + (t.py - y) ** 2
                    if d2 < ((t.r + r) * p.nms_overlap) ** 2:
                        conflict = True
                        break
                if conflict:
                    break
            if conflict:
                break
        if conflict:
            continue

        ri = int(np.ceil(r * 1.8)) + 2
        y0, y1 = max(0, y - ri), min(h, y + ri + 1)
        x0, x1 = max(0, x - ri), min(w, x + ri + 1)
        yy, xx = np.ogrid[y0:y1, x0:x1]
        d2map = (yy - y) ** 2 + (xx - x) ** 2
        local = mask[y0:y1, x0:x1]
        # 圓形度驗證：圓盤內樹冠像素占比
        disc = d2map <= r * r
        fill = local[disc].mean() if disc.any() else 0.0
        if fill < p.min_disc_fill:
            continue
        # 外圈環帶驗證：獨立樹冠外圍應以背景為主；大面積綠色色塊外圍仍是綠色
        ring = (d2map >= (r * 1.45 + 1) ** 2) & (d2map <= (r * 1.8 + 2) ** 2)
        ring_fill = local[ring].mean() if ring.any() else 0.0
        if ring_fill > p.max_ring_fill:
            continue

        tone_vals = classes[y0:y1, x0:x1][disc]
        tone_vals = tone_vals[tone_vals > 0]
        tone = int(np.bincount(tone_vals, minlength=4)[1:].argmax() + 1) if tone_vals.size else 2

        grid.setdefault((gx, gy), []).append(len(accepted))
        accepted.append(Tree(px=x, py=y, r=round(r, 1), tone=tone))

    accepted.sort(key=lambda t: (t.py, t.px))
    return accepted


def generate_eco_pond_forest() -> list[Tree]:
    """於中庭「生態池」外圍（px: 598..772, py: 676..822）生成環繞中央大池塘之茂密森林樹群。

    中央大池塘（主池中心 686, 750, rx=46, ry=28；西側水灣 646, 756, rx=24, ry=18）
    保持開闊水面，池畔至四周教學大樓之間則配置多層次高低錯落的濃密樹林（淺黃綠、中綠、深綠針闊葉混生林）。
    """
    rng = np.random.default_rng(11503)
    forest: list[Tree] = []

    def in_pond_clear_zone(x: float, y: float, margin: float = 1.0) -> bool:
        # 主池橢圓與西側水灣保持開闊水面，確保中央大池塘完整顯露於森林中央
        d_main = ((x - 685.0) / (54.0 * margin)) ** 2 + ((y - 750.0) / (35.0 * margin)) ** 2
        d_cove = ((x - 645.0) / (28.0 * margin)) ** 2 + ((y - 756.0) / (21.0 * margin)) ** 2
        return d_main < 1.0 or d_cove < 1.0

    # 1. 第一圈：緊貼池岸之環湖林帶（錯落垂柳／常綠喬木）
    angles = np.linspace(0, 2 * np.pi, 28, endpoint=False)
    for idx, ang in enumerate(angles):
        # 東北側預留木棧道觀景缺口
        if 0.12 < ang < 0.58:
            continue
        rx = 56.0 + (idx % 3) * 3.0
        ry = 37.0 + (idx % 2) * 2.5
        cx = 684.0 + np.cos(ang) * rx
        cy = 750.0 + np.sin(ang) * ry
        if cx < 600 or cx > 770 or cy < 678 or cy > 820:
            continue
        if in_pond_clear_zone(cx, cy, margin=0.98):
            continue
        r = float(np.round(rng.uniform(6.2, 8.8), 1))
        tone = int([2, 3, 1, 3, 2][idx % 5])
        forest.append(Tree(px=int(round(cx)), py=int(round(cy)), r=r, tone=tone))

    # 2. 第二、三圈：填滿中庭四周的茂密深林（格點抖動採樣，確保濃密且自然交錯）
    for gy in range(678, 823, 12):
        for gx in range(600, 772, 12):
            jx = gx + float(rng.uniform(-3.8, 3.8))
            jy = gy + float(rng.uniform(-3.8, 3.8))
            if in_pond_clear_zone(jx, jy, margin=1.08):
                continue
            # 避開已放置之環湖樹過近處
            if any((t.px - jx) ** 2 + (t.py - jy) ** 2 < 7.8 ** 2 for t in forest):
                continue
            r = float(np.round(rng.uniform(7.5, 11.8), 1))
            # 外圍深綠高大喬木較多，營造深林包圍感
            tone = int(rng.choice([1, 2, 3], p=[0.24, 0.38, 0.38]))
            forest.append(Tree(px=int(round(jx)), py=int(round(jy)), r=r, tone=tone))

    # 3. 依實景補齊各處濃密大榕樹群：
    # (A) 田徑場北彎道與排球場交界處大榕樹群 (px: 705..775, py: 125..195)
    # (B) 大花圃大榕樹群 (px: 558..788, py: 566..618) — 現況整座大花圃皆為濃密高大榕樹冠
    # (C) 排球場旁花圃大榕樹群 (px: 806..868, py: 522..582) — 現況排球場南側花圃皆為大榕樹
    # (D) 校門迎賓廣場停車場中央分隔島喬木列與活動中心東南側圍牆濃密林帶（依 Google Maps 3D 實景）
    banyan_grove = [
        # (A) 操場北彎道大榕樹群
        (718, 142, 16.5, 2), (742, 136, 17.5, 2), (764, 148, 16.0, 1),
        (728, 165, 17.0, 2), (752, 168, 18.0, 2), (710, 172, 15.0, 1),
        (768, 178, 15.5, 2), (736, 188, 16.0, 1),
        # (B) 大花圃濃密大榕樹群（雙排交錯巨型榕樹冠）
        (568, 578, 17.5, 2), (596, 574, 18.5, 2), (626, 576, 17.8, 1),
        (656, 573, 19.0, 2), (686, 576, 18.2, 2), (716, 574, 17.5, 1),
        (746, 577, 18.5, 2), (776, 579, 17.0, 2),
        (582, 606, 17.0, 1), (612, 608, 18.2, 2), (642, 605, 18.8, 2),
        (672, 608, 17.6, 1), (702, 606, 18.5, 2), (732, 608, 18.0, 2),
        (762, 605, 17.2, 1),
        # (C) 排球場旁花圃濃密大榕樹群
        (816, 530, 17.5, 2), (844, 526, 18.5, 2), (866, 534, 16.8, 1),
        (828, 554, 18.8, 2), (856, 556, 18.0, 2),
        (818, 576, 17.0, 1), (848, 578, 17.8, 2),
        # (D) 校園平面圖中正樓東側補齊綠樹與裝置藝術中央綠島植栽（對齊平面圖 px=972 與 px=1048）
        (972, 668, 5.2, 1), (972, 722, 5.2, 1),
        (1048, 556, 6.2, 1), (1048, 598, 6.5, 2), (1048, 640, 6.2, 1), (1048, 682, 6.5, 2),
        # (E) 西邊洲美街沿著校區圍牆種滿雙排行道樹 (px: -40..1380, py: -85 & -50)
        *[(px, -85, 14.5, 2) for px in range(-30, 1370, 36)],
        *[(px, -50, 13.8, 1 if (px // 36) % 2 == 0 else 3) for px in range(-12, 1360, 36)],
    ]
    for bx, by, br, btone in banyan_grove:
        forest.append(Tree(px=bx, py=by, r=br, tone=btone))

    return forest


# ---------------------------------------------------------------------------
# 6. 輸出
# ---------------------------------------------------------------------------
def write_trees_js(trees: list[Tree], out_path: Path, meta: dict) -> None:
    rows = ",\n".join(f"    [{t.px}, {t.py}, {t.r}, {t.tone}]" for t in trees)
    header = (
        "// 本檔由 tools/build_assets.py 自動產生，請勿手動修改。\n"
        "// 重新產生：.venv/bin/python tools/build_assets.py\n"
        "// 方位定義：校園平面圖右邊為北方 (+X = North)\n"
        "// trees 欄位：[px 圓心 X 像素, py 圓心 Y 像素, r 樹冠半徑像素, tone 色系 1=淺黃綠 2=中綠 3=深綠]\n"
    )
    body = (
        "window.CAMPUS_TREES = {\n"
        f"  meta: {json.dumps(meta, ensure_ascii=False)},\n"
        "  fields: [\"px\", \"py\", \"r\", \"tone\"],\n"
        "  trees: [\n"
        f"{rows}\n"
        "  ]\n"
        "};\n"
    )
    out_path.write_text(header + body, encoding="utf-8")


def write_debug(rgb: np.ndarray, mask: np.ndarray, trees: list[Tree]) -> list[Path]:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    mask_path = DEBUG_DIR / "tree_mask.png"
    Image.fromarray((mask * 255).astype(np.uint8)).save(mask_path)

    overlay = Image.fromarray(rgb).convert("RGB")
    draw = ImageDraw.Draw(overlay)
    tone_color = {1: (255, 140, 0), 2: (220, 0, 60), 3: (40, 60, 255)}
    for t in trees:
        c = tone_color.get(t.tone, (255, 0, 0))
        draw.ellipse([t.px - t.r, t.py - t.r, t.px + t.r, t.py + t.r], outline=c, width=2)
        draw.point((t.px, t.py), fill=c)
    overlay_path = DEBUG_DIR / "tree_overlay.png"
    overlay.save(overlay_path)
    return [mask_path, overlay_path]


# ---------------------------------------------------------------------------
# 主程式
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="分析平面圖樹冠並產生 data/trees-data.js")
    ap.add_argument("--source", type=Path, default=None, help="改用指定 PNG 平面圖（預設讀取 data/map_texture.js 內已清理貼圖）")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUTPUT, help="輸出 JS 路徑（預設 data/trees-data.js）")
    ap.add_argument("--debug", action="store_true", help="輸出 tools/debug/ 遮罩與標註疊圖")
    ap.add_argument("--no-bundle", action="store_true", help="不重新組裝 index.html（預設會呼叫 node tools/build_index.js）")
    ap.add_argument("--min-radius", type=float, default=DetectParams.min_radius)
    ap.add_argument("--max-radius", type=float, default=DetectParams.max_radius)
    args = ap.parse_args()

    params = DetectParams(min_radius=args.min_radius, max_radius=args.max_radius)
    t0 = time.perf_counter()

    rgb, source_desc = load_map(args.source)
    h, w = rgb.shape[:2]
    raw_mask, classes = build_tree_mask(rgb)
    for x0, y0, x1, y1 in params.exclude_rects:
        raw_mask[y0:y1, x0:x1] = False
    mask = binary_open(raw_mask, params.open_iterations)
    mask, comp_stats = reject_non_tree_components(mask, params)
    detected_trees = detect_crowns(mask, classes, params)
    eco_forest_trees = generate_eco_pond_forest()
    trees = detected_trees + eco_forest_trees

    elapsed = time.perf_counter() - t0
    tone_count = {k: sum(1 for t in trees if t.tone == k) for k in (1, 2, 3)}
    meta = {
        "source": source_desc,
        "width": w,
        "height": h,
        "count": len(trees),
        "detectedCount": len(detected_trees),
        "ecoForestCount": len(eco_forest_trees),
        "tones": {"light": tone_count[1], "medium": tone_count[2], "dark": tone_count[3]},
        "params": asdict(params),
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    write_trees_js(trees, args.out, meta)

    print(f"[完成] 來源：{source_desc}（{w} × {h} px）")
    print(f"[完成] 連通區塊 {comp_stats['components']} 個；剔除過小 {comp_stats['tooSmall']}、狹長色塊 {comp_stats['strips']}")
    print(
        f"[完成] 偵測平面圖樹冠 {len(detected_trees)} 棵 + 生態池茂密深林 {len(eco_forest_trees)} 棵 = 共 {len(trees)} 棵"
        f"（淺黃綠 {tone_count[1]}／中綠 {tone_count[2]}／深綠 {tone_count[3]}），耗時 {elapsed:.2f} 秒"
    )
    print(f"[完成] 輸出：{args.out}")
    if args.debug:
        for path in write_debug(rgb, mask, trees):
            print(f"[除錯] {path}")
    if not args.no_bundle:
        bundle_index_html()
    return 0


def bundle_index_html() -> None:
    """index.html 內嵌各資料檔作為 file:// 備援，資料更新後需重新組裝。"""
    node = shutil.which("node")
    if node is None:
        print("[警告] 找不到 node，略過 index.html 組裝；請手動執行 node tools/build_index.js")
        return
    subprocess.run([node, str(ROOT / "tools" / "build_index.js")], check=True)


if __name__ == "__main__":
    raise SystemExit(main())
