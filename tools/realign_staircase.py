# -*- coding: utf-8 -*-
import re

app_path = 'js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    app = f.read()

# 1. 替換 STAIR_WAYPOINTS
old_waypoints_pattern = r'const STAIR_WAYPOINTS = \[.*?\];'
new_waypoints = """const STAIR_WAYPOINTS = [
  // 0. 1F 地面平緩接入處 (東側迎賓步道)
  new THREE.Vector3(67.5, 0.0, -3.15),
  // 1. 1F 梯段起點 (東側平台中心)
  new THREE.Vector3(66.05, 0.1, -3.15),
  // 2. 2F 轉折休息平台 (西側平台中心，嚴格對齊西牆角 52.11)
  new THREE.Vector3(53.30, 3.6, -3.15),
  // 3. 3F 轉折休息平台 (東側平台中心，嚴格對齊東牆角 67.23)
  new THREE.Vector3(66.05, 7.2, -3.15),
  // 4. 4F 轉折休息平台 (西側平台中心)
  new THREE.Vector3(53.30, 10.8, -3.15),
  // 5. 5F 抵達平台 (東側平台中心)
  new THREE.Vector3(66.05, 14.4, -3.15),
  // 6. 5F 空橋外側銜接處
  new THREE.Vector3(66.05, 14.4, -2.0),
  // 7. 5F 連通外廊直通 214 教室正門
  new THREE.Vector3(66.05, 14.4, 5.0),
  // 8. 走入 214 教室室內核心 (聖誕樹與禮物區)
  new THREE.Vector3(58.5, 14.4, 5.0)
];"""

app = re.sub(old_waypoints_pattern, new_waypoints, app, flags=re.DOTALL)
print("Updated STAIR_WAYPOINTS with precise building alignment.")

# 2. 重寫 buildExteriorStaircaseTo214 函式，確保幾何對齊、無歪斜、緊貼北外牆且左右公分級對稱
stair_func_start = "function buildExteriorStaircaseTo214() {"
stair_func_end = "function buildColorfulFlowerBeds() {"

start_idx = app.find(stair_func_start)
end_idx = app.find(stair_func_end)

if start_idx != -1 and end_idx != -1:
    new_stair_func = """function buildExteriorStaircaseTo214() {
  const g = exteriorStairsGroup;

  // 結構材質 (消光深鐵灰鋼構、耐磨鋁合金防滑踏板、安全霧銀欄杆)
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x222a33, metalness: 0.8, roughness: 0.35 });
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x6e7882, metalness: 0.65, roughness: 0.45 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xc8ced4, metalness: 0.85, roughness: 0.2 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.75, roughness: 0.35 });
  const anchorMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.9, roughness: 0.3 });

  // 幾何基準：
  // 中正樓北外牆面位於 Z = -2.43，立面寬度 X: [52.11, 67.23]，立面中心 X = 59.67，總寬度 15.12m
  // 樓梯結構進深中心設於 Z = -3.15，梯寬 1.30m，靠牆內緣在 Z = -2.50，緊密貼合北外牆
  const stairZ = -3.15;
  const stairW = 1.30;
  const wallZ = -2.43;

  // 左右兩側平台中心座標 (均內縮 1.18m，平台寬度 2.0m，外緣距建築邊角僅 0.18m，左右對稱)
  const westPlatformX = 53.30;
  const eastPlatformX = 66.05;

  // A. 4 根垂直貫穿 1F 至 5F 的重型主承重鋼管立柱 (立柱端正筆直，垂直於地面零歪斜)
  const colXs = [52.45, 66.90];
  const colZs = [stairZ - 0.55, stairZ + 0.55];
  colXs.forEach((cx) => {
    colZs.forEach((cz) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 15.2, 16), steelMat);
      col.position.set(cx, 7.5, cz);
      col.castShadow = true;
      g.add(col);
    });
  });

  // 輔助函式：建立水平轉折休息平台 (Landing Platform)
  function createLanding(cx, y, isWest) {
    const pW = 2.0;
    const pD = stairW;
    const landingMesh = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.18, pD), steelMat);
    landingMesh.position.set(cx, y, stairZ);
    landingMesh.castShadow = true;
    landingMesh.receiveShadow = true;
    g.add(landingMesh);

    // 牆體錨定固結梁 (Cantilever Wall Anchors)：橫向咬入中正樓北外牆，確保結構端正貼齊不脫節
    [-pW / 3, pW / 3].forEach((ox) => {
      const anchorBeam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.20, Math.abs(wallZ - (stairZ + pD / 2)) + 0.15), anchorMat);
      anchorBeam.position.set(cx + ox, y - 0.08, (stairZ + pD / 2 + wallZ) / 2);
      anchorBeam.castShadow = true;
      g.add(anchorBeam);
    });

    // 安全防護欄杆 (高 1.05m)
    const rH = 1.05;
    // 北側外緣扶手
    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.06, 0.06), railMat);
    railNorth.position.set(cx, y + rH, stairZ - pD / 2 + 0.03);
    g.add(railNorth);

    // 外側封閉端部扶手 (西側平台封閉西側，東側平台封閉東側)
    const endX = isWest ? (cx - pW / 2 + 0.03) : (cx + pW / 2 - 0.03);
    const railEnd = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, pD), railMat);
    railEnd.position.set(endX, y + rH, stairZ);
    g.add(railEnd);

    // 垂直欄杆柱 (間距 0.4m)
    for (let rx = -pW / 2 + 0.1; rx <= pW / 2 - 0.1; rx += 0.45) {
      const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, rH, 6), postMat);
      rPost.position.set(cx + rx, y + rH / 2, stairZ - pD / 2 + 0.03);
      g.add(rPost);
    }
  }

  // 輔助函式：建立水平踏步斜向梯段 (Flight of Stairs)
  function createStairFlight(startX, startY, endX, endY, numSteps = 18) {
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // 雙側斜向承重縱梁 (Stringers)
    [-stairW / 2 + 0.04, stairW / 2 - 0.04].forEach((dz) => {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(len, 0.20, 0.08), steelMat);
      stringer.position.set((startX + endX) / 2, (startY + endY) / 2 - 0.06, stairZ + dz);
      stringer.rotation.z = angle;
      stringer.castShadow = true;
      g.add(stringer);

      // 安全扶手 (沿梯段外側平行傾斜)
      if (dz < 0) { // 僅外側設置扶手，靠牆內側保持視野開朗
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), railMat);
        handrail.position.set((startX + endX) / 2, (startY + endY) / 2 + 0.98, stairZ + dz);
        handrail.rotation.z = angle;
        g.add(handrail);

        // 每隔 2 公尺設置立柱加固扶手
        for (let t = 0.15; t <= 0.85; t += 0.35) {
          const fx = startX + dx * t;
          const fy = startY + dy * t;
          const fPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), postMat);
          fPost.position.set(fx, fy + 0.48, stairZ + dz);
          g.add(fPost);
        }
      }
    });

    // 階梯踏板 (Treads)：踏面絕對水平放置 (rotation = 0，無任何角度歪斜)，平整端正
    const stepDx = dx / numSteps;
    const stepDy = dy / numSteps;
    const treadLen = Math.abs(stepDx) * 1.06;
    for (let s = 0; s < numSteps; s++) {
      const sx = startX + stepDx * (s + 0.5);
      const sy = startY + stepDy * (s + 0.5);
      const tread = new THREE.Mesh(new THREE.BoxGeometry(treadLen, 0.045, stairW - 0.10), treadMat);
      tread.position.set(sx, sy, stairZ);
      tread.castShadow = true;
      tread.receiveShadow = true;
      g.add(tread);
    }
  }

  // B. 依使用者標註圖走勢，精準構建 4 段折返梯段與 5 層休息平台：
  // 1. 1F 地面起點 (東側 X = 66.05) -> 由東向西上升至 2F 平台 (西側 X = 53.30, Y = 3.60)
  createStairFlight(65.10, 0.10, 54.25, 3.60, 18);
  createLanding(westPlatformX, 3.60, true);

  // 2. 2F 平台 -> 由西向東折返上升至 3F 平台 (東側 X = 66.05, Y = 7.20)
  createStairFlight(54.25, 3.60, 65.10, 7.20, 18);
  createLanding(eastPlatformX, 7.20, false);

  // 3. 3F 平台 -> 由東向西折返上升至 4F 平台 (西側 X = 53.30, Y = 10.80)
  createStairFlight(65.10, 7.20, 54.25, 10.80, 18);
  createLanding(westPlatformX, 10.80, true);

  // 4. 4F 平台 -> 由西向東折返上升至 5F 抵達平台 (東側 X = 66.05, Y = 14.40)
  createStairFlight(54.25, 10.80, 65.10, 14.40, 18);
  createLanding(eastPlatformX, 14.40, false);

  // C. 5F 抵達平台向南直通 214 教室正門口外廊 (連通空橋，沿 X = 66.05 東立面延伸)
  const bridgeZStart = stairZ;
  const bridgeZEnd = 5.0;
  const bridgeLen = Math.abs(bridgeZEnd - bridgeZStart);
  const bridgeCenterZ = (bridgeZStart + bridgeZEnd) / 2;

  const bridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.20, bridgeLen), steelMat);
  bridgeMesh.position.set(eastPlatformX, 14.40, bridgeCenterZ);
  bridgeMesh.castShadow = true;
  bridgeMesh.receiveShadow = true;
  g.add(bridgeMesh);

  // 空橋外側安全護欄
  const bridgeRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, bridgeLen), railMat);
  bridgeRail.position.set(eastPlatformX + 0.65, 14.40 + 0.525, bridgeCenterZ);
  g.add(bridgeRail);

  // 空橋錨定支撐托架
  for (let bz = bridgeZStart + 1.8; bz <= bridgeZEnd - 0.5; bz += 2.2) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.16), anchorMat);
    bracket.position.set(eastPlatformX - 0.45, 14.40 - 0.25, bz);
    g.add(bracket);
  }
}

"""
    app = app[:start_idx] + new_stair_func + app[end_idx:]
    print("Rebuilt buildExteriorStaircaseTo214 with precise bilateral symmetry and horizontal alignment.")
else:
    print(f"Failed to locate buildExteriorStaircaseTo214 markers: start={start_idx}, end={end_idx}")

# 3. 更新 handleTestHash 中 #test=stair_214 的視角，採正視對稱構圖
old_cam_test = """} else if (h === '#test=stair_214') {
    // 中正樓北側折返式鋼構樓梯與攀爬互動人物特寫視角
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 42;
    camera.updateProjectionMatrix();
    const stairTarget = new THREE.Vector3(55.0, 7.5, -3.45);
    camera.position.set(55.0, 9.5, -3.45 - 24.0); // 自北側道路正對山牆全景仰視
    controls.target.copy(stairTarget);
    state.cameraTween = null;
    controls.update();"""

new_cam_test = """} else if (h === '#test=stair_214') {
    // 中正樓北側折返式鋼構樓梯正對全景視角 (精準對齊立面中軸 X = 59.67)
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 40;
    camera.updateProjectionMatrix();
    const stairTarget = new THREE.Vector3(59.67, 7.8, -2.43);
    camera.position.set(59.67, 8.2, -2.43 - 26.5); // 嚴格自正北方朝正南方 (+Z) 水平正視，檢視左右兩側對稱性與無歪斜
    controls.target.copy(stairTarget);
    state.cameraTween = null;
    controls.update();"""

if old_cam_test in app:
    app = app.replace(old_cam_test, new_cam_test, 1)
    print("Updated #test=stair_214 camera to exact orthogonal center view.")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)

print("Updated js/app.js successfully!")
