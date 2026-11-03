// 中正高中 3D 校園導覽主程式 (ES Module, 透過 import map 載入 Three.js)
// 方位定義：校園平面圖右邊為北方 (+X = North)，左邊為南方 (-X = South)，上方為西方 (-Z = West)，下方為東方 (+Z = East)
// 教室配置圖右側為西方
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// === 1. 全域常數與狀態管理 ===
const MAP_META = window.CAMPUS_MAP_TEXTURE;
const BUILDINGS = window.CAMPUS_BUILDINGS;
const CLASSROOMS = window.CAMPUS_CLASSROOMS;
const ROAD_NET = window.CAMPUS_ROAD_NETWORK;
const TOURS = window.CAMPUS_TOURS;

const SCALE = MAP_META.scale; // 0.27 m / px
const FLOOR_H = MAP_META.floorHeight; // 3.6 m
const WORLD_W = MAP_META.width * SCALE;  // 379.62 m
const WORLD_D = MAP_META.height * SCALE; // 291.06 m

function pxToWorldX(px) {
  return (px - MAP_META.width / 2) * SCALE;
}
function pyToWorldZ(py) {
  return (py - MAP_META.height / 2) * SCALE;
}
function worldXToPx(wx) {
  return wx / SCALE + MAP_META.width / 2;
}
function worldZToPy(wz) {
  return wz / SCALE + MAP_META.height / 2;
}

const animatedAnimals = {
  dogs: [],
  magpies: []
};

let ferrisWheelAnim = null;
let classroom214AuraAnim = null;
let xmasAtmosphereAnim = null;
const xmasDecorationsGroup = new THREE.Group();
xmasDecorationsGroup.name = 'XMAS_DECORATIONS';

const campusNpcs = {
  sports: [],
  walkway: []
};

const state = {
  viewMode: 'birdseye',      // 'birdseye' | 'fpv'
  selectedBuildingId: null,
  selectedFloor: 'ALL',      // 'ALL' | '5F' | '4F' | '3F' | '2F' | '1F' | 'B1'
  selectedRoomId: null,
  theme: 'day',              // 'day' | 'pixel' | 'brick' | 'night'
  isNight: false,
  isEcoMode: false,
  activeRoute: null,
  autoWalking: false,
  autoWalkProgress: 0,
  autoWalkSpeed: 6.5,
  walkSpeedMult: 1,
  routeCamMode: 'high',      // 'high' | 'mid' | 'close'
  walkChar: 'boy',           // 'boy' | 'girl'
  walkPersp: '3rd',          // '3rd' | '1st'
  walkPace: 'walk',          // 'walk' | 'run'
  dpadPan: null,
  dpadWalk: null,
  cameraTween: null,
  needsRender: true,
  fpv: {
    pos: new THREE.Vector3(pxToWorldX(1005), 1.7, pyToWorldZ(915)),
    yaw: 0,
    pitch: 0,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    turnLeft: false,
    turnRight: false,
    joyX: 0,
    joyY: 0,
    targetWalkPoint: null
  }
};

// === 2. Three.js 場景、相機、光源與渲染器初始化 ===
const container = document.getElementById('canvas-container');
const labelsContainer = document.getElementById('labels-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdbe7e0);
scene.fog = new THREE.FogExp2(0xdbe7e0, 0.0013);

function getResponsiveOverviewCamera() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  if (aspect < 0.72) {
    // 手機直向：擴大視角並拉遠相機，使全校東西向跑道與活動中心完整納入窄螢幕
    return {
      fov: 56,
      pos: new THREE.Vector3(-4, 248, 258),
      target: new THREE.Vector3(6, 0, 12)
    };
  }
  if (aspect < 1.12) {
    // 平板直向或方形視窗
    return {
      fov: 52,
      pos: new THREE.Vector3(-2, 212, 222),
      target: new THREE.Vector3(8, 0, 15)
    };
  }
  return {
    fov: 48,
    pos: new THREE.Vector3(0, 185, 195),
    target: new THREE.Vector3(10, 0, 18)
  };
}

const initCamCfg = getResponsiveOverviewCamera();
const camera = new THREE.PerspectiveCamera(initCamCfg.fov, window.innerWidth / window.innerHeight, 0.5, 2200);
camera.position.copy(initCamCfg.pos);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.minDistance = 8;
controls.maxDistance = 450;
controls.target.copy(initCamCfg.target);
controls.addEventListener('change', () => { state.needsRender = true; });

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8ea895, 0.85);
hemiLight.position.set(0, 200, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.15);
dirLight.position.set(110, 190, 120);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 500;
const dBound = 220;
dirLight.shadow.camera.left = -dBound;
dirLight.shadow.camera.right = dBound;
dirLight.shadow.camera.top = dBound;
dirLight.shadow.camera.bottom = -dBound;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const nightLightsGroup = new THREE.Group();
nightLightsGroup.visible = false;
scene.add(nightLightsGroup);

// === 3. 鋪設乾淨 3D 土地與草地基底（建築物底部不放 2D 平面圖，直接為自然土地；2D 平面圖僅供小地圖使用） ===
const mapImage = new Image();
mapImage.onload = () => {
  drawMinimap();
};
mapImage.src = MAP_META.dataUri;

function createCleanLandTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7da668';
  ctx.fillRect(0, 0, 512, 512);
  // 自然草土微肌理，無任何 2D 文字或平面圖框線
  for (let i = 0; i < 3600; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(104, 145, 82, 0.35)' : (i % 3 === 1 ? 'rgba(142, 178, 114, 0.28)' : 'rgba(138, 128, 102, 0.22)');
    ctx.fillRect(x, y, 3, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 12);
  return tex;
}

const groundGeo = new THREE.PlaneGeometry(WORLD_W, WORLD_D);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({
  map: createCleanLandTexture(),
  roughness: 0.94,
  metalness: 0.02
});
let groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.receiveShadow = true;
groundMesh.name = 'GROUND';
scene.add(groundMesh);

const subGroundGeo = new THREE.PlaneGeometry(WORLD_W + 260, WORLD_D + 260);
subGroundGeo.rotateX(-Math.PI / 2);
const subGroundMat = new THREE.MeshStandardMaterial({ color: 0xc8cfc0, roughness: 0.98 });
const subGround = new THREE.Mesh(subGroundGeo, subGroundMat);
subGround.position.y = -0.18;
subGround.receiveShadow = true;
scene.add(subGround);

// === 4. 建立 3D 建物量體、立體景觀設施（停車棚、花圃、球場、中正園、裝置藝術）與碰撞盒 ===
const buildingsGroup = new THREE.Group();
scene.add(buildingsGroup);

const details3DGroup = new THREE.Group();
scene.add(details3DGroup);

scene.add(xmasDecorationsGroup);

const classroomBlocksGroup = new THREE.Group();
scene.add(classroomBlocksGroup);

const buildingMeshes = [];
const roomMeshes = [];
const buildingMap = new Map();
const collisionBoxes = [];
const collisionCircles = [];
const labelElements = [];
const roomLabelElements = [];

function createFacadeTexture(baseHex, isNight, isSensitive) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 64);

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, 128, 5);
  ctx.fillRect(0, 59, 128, 5);

  const winCount = 4;
  const padX = 8;
  const slotW = (128 - padX * 2) / winCount;
  for (let i = 0; i < winCount; i++) {
    const wx = padX + i * slotW + 3;
    const ww = slotW - 6;
    if (isSensitive) {
      ctx.fillStyle = isNight ? '#3a4652' : '#6c7a86';
    } else if (isNight) {
      ctx.fillStyle = (i % 2 === 0) ? '#ffe082' : '#4a607a';
    } else {
      ctx.fillStyle = '#4f6d7a';
    }
    ctx.fillRect(wx, 14, ww, 34);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildAllBuildings() {
  BUILDINGS.forEach((b) => {
    const bGroup = new THREE.Group();
    bGroup.userData = { buildingId: b.id };
    const floorGroups = {};

    for (let f = 0; f <= b.floors; f++) {
      floorGroups[f] = new THREE.Group();
      floorGroups[f].userData = { floorNum: f, buildingId: b.id };
      bGroup.add(floorGroups[f]);
    }

    b.parts.forEach((part, pIdx) => {
      const w = part.pw * SCALE;
      const d = part.ph * SCALE;
      const cx = pxToWorldX(part.px + part.pw / 2);
      const cz = pyToWorldZ(part.py + part.ph / 2);
      const partFloors = part.floors || b.floors;
      const partColor = part.color || b.color;
      const isWalkablePlaza = Boolean(part.isPlaza);

      if (!isWalkablePlaza) {
        collisionBoxes.push({
          minX: cx - w / 2 - 0.45,
          maxX: cx + w / 2 + 0.45,
          minZ: cz - d / 2 - 0.45,
          maxZ: cz + d / 2 + 0.45,
          buildingId: b.id,
          name: part.name || b.name
        });
      }

      for (let f = 1; f <= partFloors; f++) {
        const h = part.heightM ? part.heightM : (FLOOR_H - 0.08);
        const geo = new THREE.BoxGeometry(w, h, d);
        const useFacade = !isWalkablePlaza && !part.heightM;
        const tex = useFacade ? createFacadeTexture(partColor, false, b.sensitive) : null;
        if (tex) tex.repeat.set(Math.max(1, Math.round(w / 10)), 1);

        const roofMat = new THREE.MeshStandardMaterial({
          color: f === partFloors ? (part.color || b.roofColor || partColor) : partColor,
          roughness: 0.8
        });
        const sideMat = useFacade
          ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.08 })
          : new THREE.MeshStandardMaterial({ color: partColor, roughness: 0.85, metalness: 0.1 });

        const materials = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
        const mesh = new THREE.Mesh(geo, materials);
        const yCenter = part.heightM ? (h / 2) : ((f - 1) * FLOOR_H + h / 2);
        mesh.position.set(cx, yCenter, cz);
        mesh.castShadow = !isWalkablePlaza;
        mesh.receiveShadow = true;
        mesh.userData = {
          buildingId: b.id,
          floorNum: f,
          partIdx: pIdx,
          baseColor: partColor,
          isPlaza: isWalkablePlaza || Boolean(part.heightM),
          sensitive: b.sensitive
        };

        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x3a3228, transparent: true, opacity: isWalkablePlaza ? 0.18 : 0.28 })
        );
        mesh.add(line);

        floorGroups[f].add(mesh);
        buildingMeshes.push(mesh);
      }

      if (b.hasBasement && pIdx === 0) {
        const bGeo = new THREE.BoxGeometry(w * 0.96, FLOOR_H - 0.15, d * 0.96);
        const bMat = new THREE.MeshStandardMaterial({
          color: 0x7a8b99,
          roughness: 0.85,
          transparent: true,
          opacity: 0.9
        });
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(cx, -FLOOR_H / 2, cz);
        bMesh.userData = { buildingId: b.id, floorNum: 0, partIdx: 0 };
        floorGroups[0].add(bMesh);
        buildingMeshes.push(bMesh);
      }
    });

    floorGroups[0].visible = false;
    buildingsGroup.add(bGroup);

    const lx = pxToWorldX(b.labelPos.px);
    const lz = pyToWorldZ(b.labelPos.py);
    const maxPartH = b.parts[0].heightM ? b.parts[0].heightM : (b.floors * FLOOR_H);
    const ly = maxPartH + 2.2;

    const el = document.createElement('div');
    el.className = 'map-label' + (b.sensitive ? ' sensitive-label' : '');
    el.dataset.buildingId = b.id;
    const badgeText = b.parts[0].heightM && b.floors === 1 ? '景觀/設施' : `${b.floors}F`;
    el.innerHTML = `<span class="label-dot"></span><span>${b.name}</span><span class="floor-badge">${badgeText}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectBuilding(b.id, 'ALL', null, true);
    });
    labelsContainer.appendChild(el);

    labelElements.push({
      id: b.id,
      el,
      worldPos: new THREE.Vector3(lx, ly, lz),
      priority: b.floors >= 3 ? 2 : 1
    });

    buildingMap.set(b.id, {
      data: b,
      group: bGroup,
      floorGroups,
      centerWorld: new THREE.Vector3(lx, maxPartH / 2, lz)
    });
  });

  // 建立中正園八角涼亭、裝置藝術雕塑、藝德女神雕像、排球網、籃球架、停車棚支柱與植栽花叢等精緻 3D 細節
  buildCampus3DDetails();

  const lampNodes = ['n_gate', 'n_zz_garden_n', 'n_lib_south', 'n_meiling_center', 'n_linyin_e', 'n_command', 'n_yide_plaza', 'n_south_path_m'];
  lampNodes.forEach((nid) => {
    const nd = ROAD_NET.nodes.find((n) => n.id === nid);
    if (!nd) return;
    const pl = new THREE.PointLight(0xffca7a, 1.8, 55, 1.5);
    pl.position.set(pxToWorldX(nd.px), 8, pyToWorldZ(nd.py));
    nightLightsGroup.add(pl);
  });
}

const brickStudsGroup = new THREE.Group();
brickStudsGroup.visible = false;
scene.add(brickStudsGroup);

let monetSkyMesh = null;
function createMonetStarrySky() {
  const W = 1800;
  const H = 760;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 因 SphereGeometry 使用 BackSide 內側投影，水平翻轉畫布使左右構圖（左絲柏、中雙漩渦、右弦月）與參考畫作完全一致
  ctx.translate(W, 0);
  ctx.scale(-1, 1);

  let seed = 18890619;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // 1. 深普魯士藍與鈷藍厚塗底色
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0.0, '#0a1c4e');
  bgGrad.addColorStop(0.45, '#123178');
  bgGrad.addColorStop(0.78, '#1b479c');
  bgGrad.addColorStop(1.0, '#0b1b45');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 對照參考畫作精準定義弦月、10 顆同心星辰與雙螺旋漩渦座標
  const moon = { x: 0.755 * W, y: 0.24 * H, r: 90 };
  const stars = [
    { x: 0.140 * W, y: 0.11 * H, r: 40, whiteCore: false },
    { x: 0.250 * W, y: 0.23 * H, r: 37, whiteCore: false },
    { x: 0.330 * W, y: 0.08 * H, r: 27, whiteCore: false },
    { x: 0.400 * W, y: 0.11 * H, r: 25, whiteCore: false },
    { x: 0.545 * W, y: 0.14 * H, r: 44, whiteCore: false },
    { x: 0.625 * W, y: 0.31 * H, r: 38, whiteCore: true },
    { x: 0.320 * W, y: 0.44 * H, r: 27, whiteCore: false },
    { x: 0.345 * W, y: 0.68 * H, r: 54, whiteCore: true },
    { x: 0.075 * W, y: 0.62 * H, r: 24, whiteCore: false },
    { x: 0.155 * W, y: 0.67 * H, r: 35, whiteCore: false }
  ];

  // 主漩渦 (v1) 與右下副漩渦 (v2)
  const v1 = { x: 0.455 * W, y: 0.510 * H, r: 162, dir: -1 };
  const v2 = { x: 0.615 * W, y: 0.655 * H, r: 94, dir: 1 };

  // 週期性水平距離（處理左右無縫拼接）
  function wrapDx(x1, x2) {
    let d = x1 - x2;
    if (d > W * 0.5) d -= W;
    if (d < -W * 0.5) d += W;
    return d;
  }

  // 連續流線向量場：結合全畫面波浪氣流、中央雙漩渦與星辰同心環流，杜絕生硬水平直線
  function getFlowVector(x, y) {
    const nx = ((x % W) + W) % W / W;
    const ny = y / H;
    const twoPi = Math.PI * 2;

    // 基礎大波浪流場（具有明顯起伏斜率與諧波，使所有背景筆觸皆呈有機波浪流動）
    const dWave =
      0.52 * Math.sin(nx * twoPi - 0.85) +
      0.34 * Math.cos(nx * twoPi * 2 + ny * 3.8) +
      0.22 * Math.sin(nx * twoPi * 3 - ny * 5.2);
    let vx = 1.0;
    let vy = dWave;

    // 疊加主漩渦 (v1) 與副漩渦 (v2) 的流線捲動
    const vortices = [
      { ...v1, reach: 2.1, strength: 4.2, pull: 0.16 },
      { ...v2, reach: 2.0, strength: 3.8, pull: 0.18 }
    ];
    for (const v of vortices) {
      const dx = wrapDx(x, v.x);
      const dy = y - v.y;
      const dist = Math.hypot(dx, dy) + 1e-4;
      const maxD = v.r * v.reach;
      if (dist < maxD) {
        const t = 1 - dist / maxD;
        const w = t * t * v.strength;
        const tx = (-dy / dist) * v.dir - (dx / dist) * v.pull;
        const ty = (dx / dist) * v.dir - (dy / dist) * v.pull;
        vx += tx * w;
        vy += ty * w;
      }
    }

    // 疊加每顆星辰與弦月外圍的同心漣漪流向，使藍天筆觸自然繞星旋轉
    const celestials = [moon, ...stars];
    for (const c of celestials) {
      const dx = wrapDx(x, c.x);
      const dy = y - c.y;
      const dist = Math.hypot(dx, dy) + 1e-4;
      const haloR = c.r * 2.15;
      if (dist < haloR) {
        const t = 1 - dist / haloR;
        const w = t * t * 4.5;
        vx += (-dy / dist) * w;
        vy += (dx / dist) * w;
      }
    }

    const mag = Math.hypot(vx, vy) + 1e-5;
    return { ux: vx / mag, uy: vy / mag };
  }

  // 繪製跨邊界無縫的多段流線油畫筆觸（Streamline Ribbon Stroke）
  function drawStreamStroke(startX, startY, totalLen, lineWidth, color, jitter = 0.08) {
    const steps = 5;
    const stepLen = totalLen / steps;
    const pts = [{ x: startX, y: startY }];
    let cx = startX;
    let cy = startY;
    for (let s = 0; s < steps; s++) {
      const { ux, uy } = getFlowVector(cx, cy);
      const ang = Math.atan2(uy, ux) + (rand() - 0.5) * jitter;
      cx += Math.cos(ang) * stepLen;
      cy += Math.sin(ang) * stepLen;
      pts.push({ x: cx, y: cy });
    }

    // 若筆觸靠近左右邊界，同時在 +/- W 繪製以確保 360 度環景完全無接縫
    const offsets = [0];
    if (startX < 80 || cx < 80) offsets.push(W);
    if (startX > W - 80 || cx > W - 80) offsets.push(-W);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const ox of offsets) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x + ox, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x + ox, pts[i].y);
      }
      ctx.stroke();
    }
  }

  // 計算區域色彩權重（對應參考畫作的 S 型星雲亮帶、地平線亮黃白雲帶與深藍山稜）
  function pickRegionColor(x, y) {
    const nx = ((x % W) + W) % W / W;
    const ny = y / H;

    // 週期性平滑地平線雲浪與山稜高度
    const hillWave = 0.87 - 0.09 * Math.sin(nx * Math.PI * 2 - 1.1) - 0.04 * Math.cos(nx * Math.PI * 4);
    const glowWave = hillWave - 0.065;

    if (ny > hillWave) {
      const hillPalette = ['#061130', '#0a1b48', '#102966', '#183b82', '#224e9e'];
      return hillPalette[Math.floor(rand() * hillPalette.length)];
    }

    if (Math.abs(ny - glowWave) < 0.055) {
      const horizonGlow = ['#ffffff', '#eef7fd', '#b8dff7', '#fce878', '#f5d042', '#5296d6'];
      return horizonGlow[Math.floor(rand() * horizonGlow.length)];
    }

    // 左中至中央大漩渦再延伸至右下副漩渦的 S 型星雲主氣流帶
    const streamCenterY =
      0.46 +
      0.13 * Math.sin(nx * Math.PI * 2 - 0.35) -
      0.11 * Math.exp(-Math.pow((nx - 0.43) / 0.14, 2));
    const distStream = Math.abs(ny - streamCenterY);
    const d1 = Math.hypot(wrapDx(x, v1.x), y - v1.y);
    const d2 = Math.hypot(wrapDx(x, v2.x), y - v2.y);

    const inSwirlCore =
      (d1 < v1.r * 1.12 && d1 > v1.r * 0.10) ||
      (d2 < v2.r * 1.12 && d2 > v2.r * 0.10) ||
      distStream < 0.095;

    const deepNight = ['#081844', '#0d235e', '#133178', '#193f91', '#2150ab'];
    const ceruleanBlues = ['#2860bd', '#3574ce', '#488cdb', '#62a6e6', '#85c0f0'];
    const impastoLights = ['#b8dff8', '#e1f2fc', '#ffffff', '#', '#fce97e', '#f2cf4b'];

    if (inSwirlCore) {
      const r = rand();
      if (r < 0.38) {
        const lights = ['#c4e4fa', '#e8f5fd', '#ffffff', '#', '#fce87a', '#f0cb48'];
        return lights[Math.floor(rand() * lights.length)].replace('#', '#ffffff');
      }
      if (r < 0.80) return ceruleanBlues[Math.floor(rand() * ceruleanBlues.length)];
      return deepNight[Math.floor(rand() * deepNight.length)];
    }

    return rand() < 0.56
      ? deepNight[Math.floor(rand() * deepNight.length)]
      : ceruleanBlues[Math.floor(rand() * ceruleanBlues.length)];
  }

  // 2. 全畫布鋪滿 26,000 道連續流線厚塗油畫筆觸
  for (let i = 0; i < 26000; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = 22 + rand() * 26;
    const thick = 2.8 + rand() * 2.6;
    const col = pickRegionColor(x, y);
    drawStreamStroke(x, y, len, thick, col, 0.09);
  }

  // 3. 精雕中央雙螺旋 S 型漩渦（v1 與 v2）及左翼湧入氣流的漸進捲動筆觸
  function paintVortexArms(cx, cy, maxR, dir, arms, count) {
    const armPalette = [
      '#ffffff', '#eef7fd', '#bce0f9', '#7fbbe8',
      '#468ad6', '#255bb5', '#102b6e', '#fce77c', '#e8c444'
    ];
    for (let i = 0; i < count; i++) {
      const armIdx = i % arms;
      const t = Math.pow(rand(), 0.78);
      const r = 8 + t * maxR;
      const theta =
        (armIdx * Math.PI * 2) / arms +
        t * Math.PI * 2.35 * dir +
        (rand() - 0.5) * 0.55;
      const sx = cx + Math.cos(theta) * r;
      const sy = cy + Math.sin(theta) * r * 0.90;
      const col = armPalette[Math.floor(rand() * armPalette.length)];
      drawStreamStroke(sx, sy, 20 + rand() * 24, 3.0 + rand() * 2.4, col, 0.06);
    }
  }

  paintVortexArms(v1.x, v1.y, v1.r * 1.18, -1, 3, 2200);
  paintVortexArms(v2.x, v2.y, v2.r * 1.15, 1, 2, 1300);

  // 4. 繪製 10 顆同心圓短弧厚塗星辰（完全遵循梵谷／參考畫作同心虛線筆觸技法）
  const starInnerCols = ['#ffffff', '#fffbe0', '#fff28c', '#fceb4f', '#f7c91e'];
  const starMidCols = ['#fceb4f', '#fad62c', '#f5b814', '#fff5a8'];
  const starEdgeCols = ['#96ccf2', '#5ca0e0', '#2e6bc2', '#fceb4f', '#fff394'];

  for (const st of stars) {
    for (let rad = st.r * 1.32; rad >= st.r * 0.20; rad -= 5.2) {
      const circumference = Math.PI * 2 * rad;
      const dashCount = Math.max(7, Math.floor(circumference / 18));
      const stepAngle = (Math.PI * 2) / dashCount;
      const ratio = rad / st.r;

      for (let d = 0; d < dashCount; d++) {
        const a0 = d * stepAngle + (rand() - 0.5) * stepAngle * 0.28;
        const a1 = a0 + stepAngle * (0.58 + rand() * 0.25);
        const rJit = Math.max(2, rad + (rand() - 0.5) * 2.2);

        let col;
        if (ratio > 0.96) col = starEdgeCols[Math.floor(rand() * starEdgeCols.length)];
        else if (ratio > 0.52) col = starMidCols[Math.floor(rand() * starMidCols.length)];
        else col = st.whiteCore && rand() < 0.65 ? '#ffffff' : starInnerCols[Math.floor(rand() * starInnerCols.length)];

        ctx.strokeStyle = col;
        ctx.lineWidth = 3.4 + rand() * 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(st.x, st.y, rJit, a0, a1);
        ctx.stroke();
      }
    }

    ctx.fillStyle = st.whiteCore ? '#ffffff' : '#ffe954';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. 繪製右上角經典金橘色弦月與同心檸檬黃筆觸月暈
  for (let rad = moon.r * 1.35; rad >= moon.r * 0.36; rad -= 5.5) {
    const circumference = Math.PI * 2 * rad;
    const dashCount = Math.max(10, Math.floor(circumference / 19));
    const stepAngle = (Math.PI * 2) / dashCount;
    const ratio = rad / moon.r;

    for (let d = 0; d < dashCount; d++) {
      const a0 = d * stepAngle + (rand() - 0.5) * stepAngle * 0.24;
      const a1 = a0 + stepAngle * (0.62 + rand() * 0.22);
      const rJit = rad + (rand() - 0.5) * 2.4;

      let col;
      if (ratio > 1.06) col = rand() < 0.55 ? '#89c4ee' : '#fceb4f';
      else if (ratio > 0.72) col = rand() < 0.52 ? '#fff9c4' : '#fceb4f';
      else col = rand() < 0.58 ? '#fce340' : '#f6be16';

      ctx.strokeStyle = col;
      ctx.lineWidth = 4.0 + rand() * 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, rJit, a0, a1);
      ctx.stroke();
    }
  }

  // 弦月中央鮮明鎘橘黃彎月造型（對照參考畫作右上角大型橘金弦月）
  const mr = moon.r * 0.54;
  ctx.fillStyle = '#f59b0f';
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, mr, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fceb4f';
  ctx.beginPath();
  ctx.arc(moon.x - mr * 0.30, moon.y - mr * 0.16, mr * 0.74, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 110; i++) {
    const isOuter = i < 68;
    const cx = isOuter ? moon.x : moon.x - mr * 0.30;
    const cy = isOuter ? moon.y : moon.y - mr * 0.16;
    const baseR = isOuter ? mr * (0.78 + rand() * 0.24) : mr * (0.18 + rand() * 0.50);
    const a0 = rand() * Math.PI * 2;
    const a1 = a0 + 0.35 + rand() * 0.35;
    ctx.strokeStyle = isOuter ? (rand() < 0.65 ? '#f0870a' : '#ffb814') : (rand() < 0.6 ? '#fff7ad' : '#fceb4f');
    ctx.lineWidth = 3.8 + rand() * 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, a0, a1);
    ctx.stroke();
  }

  // 6. 左側火焰狀絲柏樹剪影筆觸
  const cypX = 0.215 * W;
  const cypCols = ['#071210', '#0d1f1a', '#152d23', '#203b2a', '#2e3721', '#0f1b24'];
  for (let i = 0; i < 720; i++) {
    const ny = 0.06 + Math.pow(rand(), 0.85) * 0.94;
    const y = ny * H;
    const halfWidth = Math.pow(ny, 1.38) * 62 + (ny > 0.55 ? (ny - 0.55) * 48 : 0);
    const centerShift = Math.sin(ny * 9.5) * 9 - (1 - ny) * 7;
    const x = cypX + centerShift + (rand() - 0.5) * 2 * halfWidth;
    const len = 18 + rand() * 26;
    const angle = -Math.PI * 0.5 + Math.cos(ny * 9.5) * 0.22 + (rand() - 0.5) * 0.22;

    ctx.strokeStyle = cypCols[Math.floor(rand() * cypCols.length)];
    ctx.lineWidth = 3.0 + rand() * 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * len * 0.5 + Math.sin(y * 0.05) * 4,
      y + Math.sin(angle) * len * 0.5,
      x + Math.cos(angle) * len,
      y + Math.sin(angle) * len
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);

  const skyGroup = new THREE.Group();

  // 將整張星夜畫作完整映射於地平線下方至仰角 28 度之間（phi: 0.345*PI .. 0.565*PI），消除地平線縫隙並使弦月、群星、雙漩渦、絲柏樹完整同框
  const bandPhiStart = Math.PI * 0.345;
  const bandPhiLength = Math.PI * 0.22;
  const skyGeo = new THREE.SphereGeometry(1650, 72, 36, 0, Math.PI * 2, bandPhiStart, bandPhiLength);
  const skyMat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });
  const bandMesh = new THREE.Mesh(skyGeo, skyMat);
  bandMesh.rotation.y = 0.30;
  skyGroup.add(bandMesh);

  // 仰角 28 度以上之天頂深普魯士藍封頂
  const capGeo = new THREE.SphereGeometry(1650, 32, 12, 0, Math.PI * 2, 0, bandPhiStart + 0.01);
  const capMat = new THREE.MeshBasicMaterial({
    color: 0x0a1c4e,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });
  skyGroup.add(new THREE.Mesh(capGeo, capMat));

  skyGroup.visible = false;
  scene.add(skyGroup);
  return skyGroup;
}

const roadLabelElements = [];

// 補充校園平面圖上未單獨成棟之立體景觀與設施細節（乾淨土地鋪面、藍色 PU 田徑場、綠框藍底排球與籃球場、立體花圃、214 教室窗外天際線地標）
function buildCampus3DDetails() {
  // 0. 乾淨土地上之校園內部柏油路網、周邊街道、圍牆與棒球場／溫室鋪面
  buildCleanGroundRoadsAndWalls();

  // 0b. 400 公尺鮮藍色 PU 標準田徑場、天然草皮足球場、足球門、護網籠與水泥階梯看台（依 214 教室實拍照片還原）
  buildBlueTrackAndField();

  // 0c. 大花圃與排球場旁花圃之立體修剪綠籬與四季繽紛花叢（取代原本誤植之喬木）
  buildColorfulFlowerBeds();

  // 0d. 214 教室實拍背景之北投士林科技園區天際線地標（藍色玻璃帷幕大樓、雙子星住宅大樓、兒童新樂園摩天輪）
  buildSurroundingSkyline();

  // 0e. 教學大樓混凝土女兒牆、屋突機房與微縮積木主題 (brick) 屋頂凸點
  buildRoofSolarAndBrickStuds();

  // 1. 校門口警衛室一側實景 3D 細節：米白嵌紅磚方格迎賓廣場、中正園圓形假山草坪景觀島、斜向教職員停車格與房車、格致樓至聖樓圓弧轉角、榮譽布條、中正樓彩虹壁畫、活動中心青綠斜屋頂
  buildGateAndEastPlazaDetails();

  // 1b. 校園守護者黑色小狗群（校犬小黑、歐告、黑皮、黑輪）與樹梢隨機棲息之臺灣特有種「臺灣藍鵲」
  buildCampusDogsAndMagpies();

  // 1c. 400 公尺田徑場、排球場、籃球場運動學生群，以及校園主要幹道漫步之師生群
  buildCampusSportsAndWalkwayNPCs();

  // 1d. 214 教室傳奇金色光暈與天降聖光 (Heavenly Sunbeam & Golden Aura)
  buildClassroom214HeavenlyAura();

  // 1e. 聖誕節日歡慶氣氛：全校飄雪粒子系統、迎賓廣場巨型立體聖誕樹、聖誕花圈與雪人
  buildChristmasAtmosphere();
  buildExteriorStaircaseTo214();

  // 2. 裝置藝術立體雕塑群 (嚴格對齊平面圖裝置藝術綠帶中心 px: 1048, py: 565..675)
  [565, 620, 675].forEach((py, idx) => {
    const artX = pxToWorldX(1048);
    const artZ = pyToWorldZ(py);
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xe0dcd5 })
    );
    ped.position.set(artX, 1.1, artZ);
    details3DGroup.add(ped);

    const artPiece = new THREE.Mesh(
      idx === 1 ? new THREE.TorusKnotGeometry(0.9, 0.25, 48, 8) : new THREE.OctahedronGeometry(1.2, 0),
      new THREE.MeshStandardMaterial({ color: idx === 1 ? 0xd97757 : 0x5b8a72, metalness: 0.3, roughness: 0.4 })
    );
    artPiece.position.set(artX, 2.8, artZ);
    artPiece.castShadow = true;
    details3DGroup.add(artPiece);
  });

  // 3. 藝德女神立體雕像 (px: 214, py: 628)
  const ydX = pxToWorldX(214);
  const ydZ = pyToWorldZ(628);
  const statuePed = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.0, 2.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xd6cfc2 })
  );
  statuePed.position.set(ydX, 1.1, ydZ);
  details3DGroup.add(statuePed);

  const goddess = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 3.8, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5efe6, roughness: 0.3, metalness: 0.2 })
  );
  goddess.position.set(ydX, 4.1, ydZ);
  goddess.castShadow = true;
  details3DGroup.add(goddess);

  // 5. 排球場五面「綠框藍底」球場標線、東西方向球網、水藍防撞球柱與裁判椅 (依 214 教室實拍照片還原)
  const netMat = new THREE.MeshStandardMaterial({ color: 0xf7fafc, transparent: true, opacity: 0.84, roughness: 0.35 });
  const netTapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const netPostMat = new THREE.MeshStandardMaterial({ color: 0x1b75bc, metalness: 0.35, roughness: 0.35 });
  const blueCourtMat = new THREE.MeshStandardMaterial({ color: 0x1d5da6, roughness: 0.68 });
  const courtLineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const refStandMat = new THREE.MeshStandardMaterial({ color: 0x2b8a58, roughness: 0.5 });

  [189.5, 250.0, 310.5, 370.0, 432.0].forEach((py) => {
    const cx = pxToWorldX(844);
    const cz = pyToWorldZ(py);
    const courtW = 62 * SCALE; // 南北向長約 16.74 m
    const courtD = 35 * SCALE; // 東西向寬約 9.45 m

    // 排球場深藍色內場鋪面（外框為 #389c64 鮮綠色 PU）
    const innerGeo = new THREE.BoxGeometry(courtW, 0.06, courtD);
    const innerMesh = new THREE.Mesh(innerGeo, blueCourtMat);
    innerMesh.position.set(cx, 0.33, cz);
    innerMesh.receiveShadow = true;
    details3DGroup.add(innerMesh);

    // 白色邊線與三米攻擊線
    const borderEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(courtW, 0.02, courtD));
    const borderLines = new THREE.LineSegments(borderEdges, courtLineMat);
    borderLines.position.set(cx, 0.37, cz);
    details3DGroup.add(borderLines);

    [-courtW * 0.18, courtW * 0.18].forEach((dx) => {
      const atkLine = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, courtD), netTapeMat);
      atkLine.position.set(cx + dx, 0.37, cz);
      details3DGroup.add(atkLine);
    });

    // 東西方向球網（沿 Z 軸延伸）
    const netLenZ = courtD + 0.7;
    const net = new THREE.Mesh(new THREE.BoxGeometry(0.20, 1.45, netLenZ), netMat);
    net.position.set(cx, 1.32, cz);
    net.castShadow = true;
    details3DGroup.add(net);

    // 球網頂部白色網帶（東西方向）
    const topTape = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, netLenZ), netTapeMat);
    topTape.position.set(cx, 2.10, cz);
    details3DGroup.add(topTape);

    // 西端 (-Z) 與東端 (+Z) 水藍色防撞球柱與裁判椅
    [-netLenZ / 2, netLenZ / 2].forEach((dz, pIdx) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.35, 10), netPostMat);
      post.position.set(cx, 1.18, cz + dz);
      post.castShadow = true;
      details3DGroup.add(post);

      if (pIdx === 1) {
        const refStand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.65, 0.65), refStandMat);
        refStand.position.set(cx, 0.85, cz + dz + 0.55);
        details3DGroup.add(refStand);
      }
    });
  });

  // 排球場與籃球場交界處之白色水溝蓋排水帶 (px: 896, py: 150..460)
  for (let py = 156; py <= 456; py += 10) {
    const drain = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 1.6), netTapeMat);
    drain.position.set(pxToWorldX(896), 0.33, pyToWorldZ(py));
    details3DGroup.add(drain);
  }

  // 6. 籃球場六面「綠框藍底」球場標線與 12 座水藍色曲臂籃球架 (px: 912..988 & 1018..1092, py: 165, 225, 285)
  const hoopMat = new THREE.MeshStandardMaterial({ color: 0x2998d6, metalness: 0.35, roughness: 0.35 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe65100, metalness: 0.5 });

  [165, 225, 285].forEach((py) => {
    [950, 1055].forEach((cPx) => {
      const isTennis = (py === 165 && cPx > 1000);
      const bCourtW = 76 * SCALE;
      const bCourtD = 44 * SCALE;
      const bInner = new THREE.Mesh(
        new THREE.BoxGeometry(bCourtW, 0.06, bCourtD),
        isTennis ? new THREE.MeshStandardMaterial({ color: 0x266eb5, roughness: 0.7 }) : blueCourtMat
      );
      bInner.position.set(pxToWorldX(cPx), 0.33, pyToWorldZ(py));
      bInner.receiveShadow = true;
      details3DGroup.add(bInner);

      const bEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(bCourtW, 0.02, bCourtD));
      const bLines = new THREE.LineSegments(bEdges, courtLineMat);
      bLines.position.set(pxToWorldX(cPx), 0.37, pyToWorldZ(py));
      details3DGroup.add(bLines);
    });

    [912, 988, 1018, 1092].forEach((px, idx) => {
      if (py === 165 && px > 1000) return; // 東區最上方為網球場
      const dir = idx % 2 === 0 ? 1 : -1;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 3.2, 8), hoopMat);
      post.position.set(pxToWorldX(px), 1.6, pyToWorldZ(py));
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.18), hoopMat);
      arm.position.set(pxToWorldX(px) + dir * 0.5, 3.05, pyToWorldZ(py));
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.2, 1.85), boardMat);
      board.position.set(pxToWorldX(px) + dir * 1.0, 3.0, pyToWorldZ(py));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 16), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(pxToWorldX(px) + dir * 1.32, 2.75, pyToWorldZ(py));
      details3DGroup.add(post, arm, board, rim);
    });
  });

  // 網球場球網 (px: 1055, py: 167)
  const tennisNet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 12.5), netMat);
  tennisNet.position.set(pxToWorldX(1055), 0.9, pyToWorldZ(167));
  details3DGroup.add(tennisNet);

  // 7. 生態池：茂密深林中間之大池塘立體渲染 (中庭範圍 px: 594..776, py: 672..826；中央大池塘 px: 684, py: 751)
  buildEcoPondScene();
}

function buildCleanGroundRoadsAndWalls() {
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x4a4f57, roughness: 0.88 });
  const roadEdgeMat = new THREE.MeshBasicMaterial({ color: 0xe6e4dc });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xe8b931 });
  const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x6c727a, roughness: 0.88 });
  const plazaStoneMat = new THREE.MeshStandardMaterial({ color: 0xdfd8c8, roughness: 0.85 });
  const baseballGrassMat = new THREE.MeshStandardMaterial({ color: 0x62a146, roughness: 0.9 });
  const clayMat = new THREE.MeshStandardMaterial({ color: 0xb87652, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd6d0c4, roughness: 0.85 });

  function addGroundSlab(px, py, pw, ph, mat, y = 0.06) {
    const w = pw * SCALE;
    const d = ph * SCALE;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), mat);
    m.position.set(pxToWorldX(px + pw / 2), y, pyToWorldZ(py + ph / 2));
    m.receiveShadow = true;
    details3DGroup.add(m);
  }

  function addPolygonRoad(polyPx, mat, y = 0.07) {
    const shape = new THREE.Shape();
    polyPx.forEach(([px, py], idx) => {
      const sx = pxToWorldX(px);
      const sy = -pyToWorldZ(py);
      if (idx === 0) shape.moveTo(sx, sy);
      else shape.lineTo(sx, sy);
    });
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    mesh.receiveShadow = true;
    details3DGroup.add(mesh);
  }

  function addRoadStripLine(x1, y1, x2, y2, widthM, mat, y = 0.16) {
    const wx1 = pxToWorldX(x1);
    const wz1 = pyToWorldZ(y1);
    const wx2 = pxToWorldX(x2);
    const wz2 = pyToWorldZ(y2);
    const len = Math.hypot(wx2 - wx1, wz2 - wz1);
    const geo = new THREE.PlaneGeometry(len, widthM);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((wx1 + wx2) / 2, y, (wz1 + wz2) / 2);
    mesh.rotation.y = -Math.atan2(wz2 - wz1, wx2 - wx1);
    details3DGroup.add(mesh);
  }

  function addZebraCrosswalk(x1, y1, x2, y2, stripeLenM, stripeWidthM, numStripes, mat, y = 0.17) {
    const wx1 = pxToWorldX(x1);
    const wz1 = pyToWorldZ(y1);
    const wx2 = pxToWorldX(x2);
    const wz2 = pyToWorldZ(y2);
    const dx = wx2 - wx1;
    const dz = wz2 - wz1;
    // 斑馬線枕木紋長軸平行於車行方向（垂直於行人穿越方向）
    const rx = -dz;
    const rz = dx;
    const rotY = -Math.atan2(rz, rx);
    for (let i = 0; i < numStripes; i++) {
      const t = (i + 0.5) / numStripes;
      const geo = new THREE.PlaneGeometry(stripeLenM, stripeWidthM);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(wx1 + dx * t, y, wz1 + dz * t);
      mesh.rotation.y = rotY;
      details3DGroup.add(mesh);
    }
  }

  // 校園內部主要道路與廣場鋪面
  addGroundSlab(110, 492, 815, 58, walkwayMat, 0.05);   // 林蔭大道
  addGroundSlab(150, 775, 400, 185, asphaltMat, 0.04);  // 藝德樓南側車道與停車區
  addGroundSlab(552, 908, 405, 76, asphaltMat, 0.05);   // 格致樓外車道（機車與腳踏車停車棚通道）
  addGroundSlab(770, 462, 195, 55, asphaltMat, 0.05);   // 排球場南側柏油空地
  addGroundSlab(80, 560, 455, 165, baseballGrassMat, 0.05); // 棒球場外野草皮

  // 藝德女神半圓廣場與棒球場紅土內野
  const yidePlaza = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.10, 28), plazaStoneMat);
  yidePlaza.position.set(pxToWorldX(214), 0.08, pyToWorldZ(648));
  yidePlaza.receiveShadow = true;
  details3DGroup.add(yidePlaza);

  const baseballClay = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.09, 20), clayMat);
  baseballClay.position.set(pxToWorldX(425), 0.09, pyToWorldZ(665));
  details3DGroup.add(baseballClay);

  // === 校園四周真實道路網（依 Google Maps 衛星圖與 3D 實景圖精確繪製） ===
  // 1. 西側 (-Z，圖面上方)：士科路
  addGroundSlab(-160, -118, 1590, 76, asphaltMat, 0.04);
  addRoadStripLine(-140, -80, 1340, -80, 0.35, yellowLineMat, 0.11);

  // 2. 南側 (-X，圖面左方)：文林北路 53 巷（緊鄰圍牆）與福國路／文林橋（外側雙向幹道）
  addGroundSlab(-45, -118, 68, 1184, asphaltMat, 0.04);  // 文林北路 53 巷
  addGroundSlab(-160, -118, 96, 1184, asphaltMat, 0.04); // 福國路／文林橋
  addRoadStripLine(-112, -100, -112, 1050, 0.40, yellowLineMat, 0.11);

  // 3. 北側 (+X，圖面右上方)：文承路（沿迎曦樓與活動中心外側延伸，至活動中心東南角轉折）
  addPolygonRoad([
    [1338, -118],
    [1422, -118],
    [1422, 680],
    [1520, 825],
    [1448, 875],
    [1338, 702]
  ], asphaltMat, 0.06);
  addRoadStripLine(1380, -100, 1380, 675, 0.35, yellowLineMat, 0.11);

  // 4. 東側 (+Z，圖面下方)：文林北路 75 巷、東北斜向「北科路」、校門口前路口與東南向「文林北路」主幹道
  addPolygonRoad([
    // 文林北路 75 巷內側邊界（嚴格位於東側圍牆 py=985 外側）
    [-160, 988],
    [960, 988],
    // 沿校門口大門線 (960, 988 -> 1018, 934) 與警衛室外緣銜接北科路內側邊界
    [1018, 934],
    [1048, 902],
    [1142, 852],
    [1338, 702],
    // 北科路東北端（接文承路）外緣
    [1420, 702],
    [1412, 750],
    // 北科路東南側外緣往西南斜下至校門口大路口
    [1118, 976],
    // 東南向延伸之「文林北路」主幹道
    [1295, 1140],
    [1215, 1205],
    [1015, 1066],
    // 接回文林北路 75 巷南側外緣
    [-160, 1066]
  ], asphaltMat, 0.08);

  // 校門口前道路標線：雙黃線、路邊白線、停止線與三向行人穿越道（斑馬線）
  addRoadStripLine(-140, 1027, 896, 1027, 0.42, yellowLineMat, 0.15); // 文林北路 75 巷雙黃線
  addRoadStripLine(960, 991, -140, 991, 0.22, roadEdgeMat, 0.15);     // 文林北路 75 巷靠校牆白邊線
  addRoadStripLine(1098, 932, 1372, 722, 0.42, yellowLineMat, 0.15);  // 北科路中央雙黃線
  addRoadStripLine(1048, 905, 1144, 854, 0.24, roadEdgeMat, 0.15);    // 北科路靠校牆白邊線（前段）
  addRoadStripLine(1144, 854, 1338, 705, 0.24, roadEdgeMat, 0.15);    // 北科路靠校牆白邊線（後段）
  addRoadStripLine(1062, 1038, 1245, 1168, 0.42, yellowLineMat, 0.15);// 文林北路雙黃線

  // 校門大門出入口停止線與路口三組標準枕木紋斑馬線
  addRoadStripLine(962, 984, 1016, 934, 0.35, roadEdgeMat, 0.16);     // 校門口出車停止線
  addRoadStripLine(902, 1027, 902, 1063, 0.32, roadEdgeMat, 0.15);    // 文林北路 75 巷停止線
  addZebraCrosswalk(928, 994, 928, 1060, 3.6, 0.48, 7, roadEdgeMat, 0.16);  // 文林北路 75 巷斑馬線
  addZebraCrosswalk(1058, 908, 1112, 970, 3.6, 0.48, 7, roadEdgeMat, 0.16); // 北科路路口斑馬線
  addZebraCrosswalk(1018, 1060, 1082, 1002, 3.6, 0.48, 7, roadEdgeMat, 0.16);// 文林北路路口斑馬線

  // 校園四周實體圍牆（含東側文林北路 75 巷圍牆與東北側北科路斜向圍牆）
  const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, (702 - 62) * SCALE), wallMat);
  wallNorth.position.set(pxToWorldX(1338), 0.9, pyToWorldZ((62 + 702) / 2));
  const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, (985 - 62) * SCALE), wallMat);
  wallSouth.position.set(pxToWorldX(28), 0.9, pyToWorldZ((62 + 985) / 2));
  const wallWest = new THREE.Mesh(new THREE.BoxGeometry((1338 - 28) * SCALE, 1.8, 0.6), wallMat);
  wallWest.position.set(pxToWorldX((28 + 1338) / 2), 0.9, pyToWorldZ(62));
  const wallEast = new THREE.Mesh(new THREE.BoxGeometry((960 - 28) * SCALE, 1.8, 0.6), wallMat);
  wallEast.position.set(pxToWorldX((28 + 960) / 2), 0.9, pyToWorldZ(985));

  const diagX1 = pxToWorldX(1142), diagZ1 = pyToWorldZ(852);
  const diagX2 = pxToWorldX(1338), diagZ2 = pyToWorldZ(702);
  const diagLen = Math.hypot(diagX2 - diagX1, diagZ2 - diagZ1);
  const wallDiag = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 1.8, 0.6), wallMat);
  wallDiag.position.set((diagX1 + diagX2) / 2, 0.9, (diagZ1 + diagZ2) / 2);
  wallDiag.rotation.y = -Math.atan2(diagZ2 - diagZ1, diagX2 - diagX1);

  // 校門石柱碑 (1054, 892) 連接至斜牆起點 (1142, 852) 依實景照片為「不鏽鋼菱形格柵自動伸縮鐵門」，不設實體圍牆
  details3DGroup.add(wallNorth, wallSouth, wallWest, wallEast, wallDiag);

  // 周邊真實道路與東西南北 3D 浮動標籤（完全對照 Google Maps 衛星圖路名）
  const perimeterLabels = [
    { text: '⬆ 北 (N) · 文承路', px: 1385, py: 420 },
    { text: '↗ 北科路', px: 1225, py: 835 },
    { text: '↘ 文林北路（校門路口）', px: 1125, py: 1085 },
    { text: '➡ 東 (E) · 文林北路 75 巷', px: 650, py: 1032 },
    { text: '⬇ 南 (S) · 福國路／文林北路 53 巷（文林橋）', px: -75, py: 520 },
    { text: '⬅ 西 (W) · 士科路', px: 660, py: -78 }
  ];
  perimeterLabels.forEach((info) => {
    const el = document.createElement('div');
    el.className = 'road-3d-label';
    el.textContent = info.text;
    labelsContainer.appendChild(el);
    roadLabelElements.push({
      el,
      worldPos: new THREE.Vector3(pxToWorldX(info.px), 1.5, pyToWorldZ(info.py))
    });
  });
}

function buildBlueTrackAndField() {
  // 依 214 教室實拍照片：400 公尺鮮藍色 PU 跑道 (#1d63b8) + 白色分道線 + 鮮綠草皮足球場 (#6eb344)
  // 田徑場中心約 px: 412, py: 288；直線段長約 310 px (83.7 m)，彎道外徑半徑約 156 px (42.1 m)，內徑約 98 px (26.5 m)
  const cx = pxToWorldX(412);
  const cz = pyToWorldZ(288);
  const straightLen = 304 * SCALE; // 82.08 m
  const rOuter = 156 * SCALE;      // 42.12 m
  const rInner = 98 * SCALE;       // 26.46 m
  const trackWidth = rOuter - rInner;

  const blueTrackMat = new THREE.MeshStandardMaterial({ color: 0x1d63b8, roughness: 0.62, metalness: 0.05 });
  const blueDZoneMat = new THREE.MeshStandardMaterial({ color: 0x2672cc, roughness: 0.65 });
  const fieldGrassMat = new THREE.MeshStandardMaterial({ color: 0x6cb342, roughness: 0.88 });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

  // 兩側直線藍色跑道
  [-1, 1].forEach((side) => {
    const zMid = cz + side * ((rOuter + rInner) / 2);
    const straightGeo = new THREE.BoxGeometry(straightLen, 0.14, trackWidth);
    const straightMesh = new THREE.Mesh(straightGeo, blueTrackMat);
    straightMesh.position.set(cx, 0.10, zMid);
    straightMesh.receiveShadow = true;
    details3DGroup.add(straightMesh);

    // 跑道白色分道線 (6 條)
    for (let lane = 1; lane <= 6; lane++) {
      const lz = cz + side * (rInner + (trackWidth / 7) * lane);
      const line = new THREE.Mesh(new THREE.BoxGeometry(straightLen, 0.02, 0.12), whiteLineMat);
      line.position.set(cx, 0.18, lz);
      details3DGroup.add(line);
    }
  });

  // 左右（南北）兩端半圓藍色彎道與助跑半圓區
  [-1, 1].forEach((dirX) => {
    const curveCenterX = cx + dirX * (straightLen / 2);
    const startAng = dirX > 0 ? -Math.PI / 2 : Math.PI / 2;
    const ringGeo = new THREE.RingGeometry(rInner, rOuter, 48, 1, startAng, Math.PI);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, blueTrackMat);
    ringMesh.position.set(curveCenterX, 0.16, cz);
    ringMesh.receiveShadow = true;
    details3DGroup.add(ringMesh);

    // 彎道白色分道弧線
    for (let lane = 1; lane <= 6; lane++) {
      const rLane = rInner + (trackWidth / 7) * lane;
      const laneRing = new THREE.RingGeometry(rLane - 0.06, rLane + 0.06, 44, 1, startAng, Math.PI);
      laneRing.rotateX(-Math.PI / 2);
      const laneMesh = new THREE.Mesh(laneRing, whiteLineMat);
      laneMesh.position.set(curveCenterX, 0.18, cz);
      details3DGroup.add(laneMesh);
    }

    // 彎道內側藍色半圓跳遠／跳高助跑區 (照片中清晰可見的藍色半圓區)
    const dGeo = new THREE.CircleGeometry(rInner - 0.3, 36, startAng, Math.PI);
    dGeo.rotateX(-Math.PI / 2);
    const dMesh = new THREE.Mesh(dGeo, blueDZoneMat);
    dMesh.position.set(curveCenterX, 0.14, cz);
    dMesh.receiveShadow = true;
    details3DGroup.add(dMesh);
  });

  // 中央天然草皮足球場
  const soccerW = straightLen + 4;
  const soccerD = rInner * 1.92;
  const soccerField = new THREE.Mesh(new THREE.BoxGeometry(soccerW, 0.15, soccerD), fieldGrassMat);
  soccerField.position.set(cx, 0.10, cz);
  soccerField.receiveShadow = true;
  details3DGroup.add(soccerField);

  // 足球場白線與中圈
  const fieldEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(soccerW - 2, 0.02, soccerD - 2));
  const fieldLines = new THREE.LineSegments(fieldEdges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  fieldLines.position.set(cx, 0.19, cz);
  details3DGroup.add(fieldLines);

  const centerCircle = new THREE.Mesh(
    new THREE.RingGeometry(7.2, 7.45, 32).rotateX(-Math.PI / 2),
    whiteLineMat
  );
  centerCircle.position.set(cx, 0.19, cz);
  details3DGroup.add(centerCircle);

  // 兩端白色立體足球門 (照片草皮兩端可見)
  const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  [-soccerW / 2 + 1.5, soccerW / 2 - 1.5].forEach((gx) => {
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 7.3, 8), goalMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(cx + gx, 2.45, cz);
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 2.45, 8), goalMat);
    postL.position.set(cx + gx, 1.22, cz - 3.65);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 2.45, 8), goalMat);
    postR.position.set(cx + gx, 1.22, cz + 3.65);
    details3DGroup.add(crossbar, postL, postR);
  });

  // 照片中草皮右側（北彎道內緣）之高大金屬防護網籠 (Backstop Cage)
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.5, roughness: 0.4, wireframe: true });
  const cageNet = new THREE.Mesh(new THREE.BoxGeometry(22, 4.8, 12), cageMat);
  cageNet.position.set(cx + straightLen * 0.28, 2.5, cz + rInner * 0.55);
  details3DGroup.add(cageNet);

  // 照片中排球場與跑道之間的水泥階梯看台 (px: 752..782, py: 155..455) 與黑色鐵欄杆
  const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x8d939b, roughness: 0.85 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.5, roughness: 0.4 });
  for (let step = 0; step < 4; step++) {
    const stepW = (4 - step) * 1.1;
    const stepH = (step + 1) * 0.48;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, 290 * SCALE), bleacherMat);
    stepMesh.position.set(pxToWorldX(772) + step * 0.55, stepH / 2, pyToWorldZ(305));
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    details3DGroup.add(stepMesh);
  }
  const railBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 290 * SCALE), fenceMat);
  railBar.position.set(pxToWorldX(748), 0.65, pyToWorldZ(305));
  details3DGroup.add(railBar);
}

function buildGateAndEastPlazaDetails() {
  // 依據 Google Maps 3D 實景航拍照 (media_1793510116358_3348b031.jpg) 精準還原中正樓與至聖樓真實外觀：
  // 1. 左側大樓（至聖樓）：
  //    - 正門挑空大穿堂、8 階大階梯、兩道長條垂直紅底榮譽布條，正對「The statue」中正園雕像島！
  //    - 最左端格致樓轉角圓弧立面帶密集垂直細百葉。
  // 2. 右側大樓（中正樓）：
  //    - 全棟正面為極致規律之「立體混凝土方格遮陽深窗網格（Grid Facade）」，凹凸立體。
  //    - 1 樓外側為長達 60 公尺之「連續墨綠色斜面遮雨棚」！
  //    - 前方為教職員汽車斜向停車場。
  // 3. 雙中庭天井：
  //    - 左側天井為「中正花園」，右側天井為高聳大王椰子樹之「椰子樹花園」。

  // A. 迎賓廣場灰石板壓花地磚嵌雙拼紅磚方格網線鋪面（依實拍照片 media_1793575277815~824 還原）
  const plazaCanvas = document.createElement('canvas');
  plazaCanvas.width = 512;
  plazaCanvas.height = 512;
  const pCtx = plazaCanvas.getContext('2d');
  // 實景為冷灰色壓花石板地坪
  pCtx.fillStyle = '#a9b1b8';
  pCtx.fillRect(0, 0, 512, 512);
  // 細緻石板縫隙雜點紋理
  pCtx.strokeStyle = 'rgba(120, 128, 136, 0.45)';
  pCtx.lineWidth = 1.5;
  for (let i = 0; i < 512; i += 24) {
    pCtx.beginPath();
    pCtx.moveTo(i, 0); pCtx.lineTo(i, 512);
    pCtx.moveTo(0, i); pCtx.lineTo(512, i);
    pCtx.stroke();
  }
  // 標誌性「雙拼深紅磚」分隔網格線（照片中規整的大方格網）
  pCtx.strokeStyle = '#9c3d2e';
  pCtx.lineWidth = 8;
  for (let x = 0; x <= 512; x += 64) {
    pCtx.beginPath();
    pCtx.moveTo(x, 0); pCtx.lineTo(x, 512);
    pCtx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    pCtx.beginPath();
    pCtx.moveTo(0, y); pCtx.lineTo(512, y);
    pCtx.stroke();
  }
  const plazaTex = new THREE.CanvasTexture(plazaCanvas);
  plazaTex.colorSpace = THREE.SRGBColorSpace;
  plazaTex.wrapS = THREE.RepeatWrapping;
  plazaTex.wrapT = THREE.RepeatWrapping;
  plazaTex.repeat.set(0.18, 0.18);

  const plazaPolyPx = [
    [952, 492],
    [1146, 492],
    [1146, 662],
    [1124, 662],
    [1124, 852],
    [1048, 895],
    [1016, 932],
    [962, 982],
    [952, 982]
  ];
  const plazaShape = new THREE.Shape();
  plazaPolyPx.forEach(([px, py], idx) => {
    const sx = pxToWorldX(px);
    const sy = -pyToWorldZ(py);
    if (idx === 0) plazaShape.moveTo(sx, sy);
    else plazaShape.lineTo(sx, sy);
  });
  plazaShape.closePath();

  const plazaMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(plazaShape),
    new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.88 })
  );
  plazaMesh.rotation.x = -Math.PI / 2;
  plazaMesh.position.y = 0.14;
  plazaMesh.receiveShadow = true;
  details3DGroup.add(plazaMesh);

  // 活動中心南側草坪綠地
  const grovePolyPx = [
    [1124, 658],
    [1336, 658],
    [1336, 702],
    [1142, 852],
    [1048, 895],
    [1124, 852]
  ];
  const groveShape = new THREE.Shape();
  grovePolyPx.forEach(([px, py], idx) => {
    const sx = pxToWorldX(px);
    const sy = -pyToWorldZ(py);
    if (idx === 0) groveShape.moveTo(sx, sy);
    else groveShape.lineTo(sx, sy);
  });
  groveShape.closePath();
  const groveMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(groveShape),
    new THREE.MeshStandardMaterial({ color: 0x5c854c, roughness: 0.92 })
  );
  groveMesh.rotation.x = -Math.PI / 2;
  groveMesh.position.y = 0.12;
  groveMesh.receiveShadow = true;
  details3DGroup.add(groveMesh);

  // B. 【中正園與現代幾何太極裝置藝術區】實景精準建模（依實拍照片 media_1793575277815~824 還原）：
  // 1. 圓形黃褐色板岩矮石牆花台（外壁砌石線條、壓頂石收邊、隆起草坡）
  // 2. 直立天然石碑巨原石、散置天然黑灰大景石
  // 3. 秋季盛開粉紅果實之「台灣欒樹」（雙層冠：綠葉冠 + 繁盛欒樹蒴果冠）
  // 4. 【現代幾何太極大石雕】（長方形雙層白砂臺座 + 深墨綠色大理石剛勁斜切互鎖塊面）
  // 5. 迎賓車道黃黑相間橡膠減速坡（Speed Bump）與立式圓形「禁止進入」交通反光標誌
  // 6. 至聖樓側翼洗石子矮駁坎與修剪金露花綠籬
  const islandX = pxToWorldX(1048);
  // 依使用者指示校正：中正園圓形景觀島與裝置藝術雕像整體北移，緊密對齊「中正園與裝置藝術區」標籤與綠帶（px: 1048, py: 765）
  const islandZ = pyToWorldZ(765);

  // 1. 黃褐色板岩砌石花台矮牆（直徑約 17.2m，高約 0.65m）
  const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0xba9b73, roughness: 0.88 });
  const capStoneMat = new THREE.MeshStandardMaterial({ color: 0xc8b293, roughness: 0.82 });
  const curbRing = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 8.8, 0.62, 36),
    stoneWallMat
  );
  curbRing.position.set(islandX, 0.45, islandZ);
  curbRing.receiveShadow = true;
  curbRing.castShadow = true;
  details3DGroup.add(curbRing);

  // 頂部石材收邊壓頂條
  const curbCap = new THREE.Mesh(
    new THREE.CylinderGeometry(8.85, 8.85, 0.12, 36),
    capStoneMat
  );
  curbCap.position.set(islandX, 0.78, islandZ);
  curbCap.receiveShadow = true;
  details3DGroup.add(curbCap);

  // 花台內部青翠隆起草皮
  const lawnMound = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 8.4, 0.72, 32),
    new THREE.MeshStandardMaterial({ color: 0x4e7837, roughness: 0.9 })
  );
  lawnMound.position.set(islandX, 0.58, islandZ);
  lawnMound.receiveShadow = true;
  details3DGroup.add(lawnMound);

  // 2. 花台內部天然景觀原石群（對齊照片 1、2、3、4 特寫）
  // 2a. 直立天然石碑巨原石（位於花台中間偏後方，高約 2.9m，灰黑花崗岩質）
  const monolithMat = new THREE.MeshStandardMaterial({ color: 0x3d413f, roughness: 0.85 });
  const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.9, 0.95), monolithMat);
  monolith.position.set(islandX + 1.2, 1.85, islandZ - 2.2);
  monolith.rotation.y = 0.35;
  monolith.rotation.z = -0.06;
  monolith.castShadow = true;
  details3DGroup.add(monolith);

  // 2b. 散置天然黑色河卵大景石（半嵌於草皮與石磚路緣邊）
  const darkRockMat = new THREE.MeshStandardMaterial({ color: 0x2e3330, roughness: 0.88 });
  [
    { dx: -2.8, dz: 4.8, rx: 1.6, ry: 0.7, rz: 1.1, rotY: 0.4 },
    { dx: -0.8, dz: 6.2, rx: 1.4, ry: 0.65, rz: 0.95, rotY: -0.6 },
    { dx: 3.2, dz: 4.2, rx: 1.3, ry: 0.6, rz: 1.0, rotY: 1.1 },
    { dx: 4.5, dz: -1.2, rx: 1.5, ry: 0.8, rz: 1.2, rotY: -0.2 }
  ].forEach((rk) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), darkRockMat);
    rock.scale.set(rk.rx, rk.ry, rk.rz);
    rock.position.set(islandX + rk.dx, 0.65 + rk.ry * 0.4, islandZ + rk.dz);
    rock.rotation.y = rk.rotY;
    rock.castShadow = true;
    details3DGroup.add(rock);
  });

  // 3. 秋季盛放粉紅/紅褐色果實之「台灣欒樹」（照片 1、2、3、4 標誌性景觀！）
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a382c, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3e6628, roughness: 0.85 });
  const luanFruitMat = new THREE.MeshStandardMaterial({ color: 0xc45c47, roughness: 0.75 }); // 秋天紅褐色蒴果花團

  const luanGroup = new THREE.Group();
  luanGroup.position.set(islandX + 2.2, 0.6, islandZ + 0.8);

  // 欒樹主幹與大分枝
  const luanTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 4.2, 10), trunkMat);
  luanTrunk.position.y = 2.1;
  luanTrunk.castShadow = true;
  luanGroup.add(luanTrunk);

  // 茂密深綠葉冠底層
  const leafCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(3.6, 1), foliageMat);
  leafCrown.position.set(0, 4.8, 0);
  leafCrown.scale.set(1.2, 0.85, 1.1);
  leafCrown.castShadow = true;
  luanGroup.add(leafCrown);

  // 頂層覆蓋大片秋季紅粉橘色果實冠（極致真實還原現場欒樹）
  [
    { ox: 0.3, oy: 5.6, oz: 0.2, s: 2.5 },
    { ox: -1.4, oy: 5.1, oz: 0.8, s: 1.8 },
    { ox: 1.2, oy: 5.2, oz: -1.0, s: 1.9 },
    { ox: 0.8, oy: 4.8, oz: 1.3, s: 1.7 }
  ].forEach((f) => {
    const fruitCluster = new THREE.Mesh(new THREE.DodecahedronGeometry(f.s, 1), luanFruitMat);
    fruitCluster.position.set(f.ox, f.oy, f.oz);
    fruitCluster.scale.set(1.15, 0.85, 1.05);
    fruitCluster.castShadow = true;
    luanGroup.add(fruitCluster);
  });
  details3DGroup.add(luanGroup);

  // 花台旁幾球深綠修剪圓球灌木
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x274921, roughness: 0.9 });
  [
    { ox: -3.5, oz: -1.5, r: 1.1 },
    { ox: -4.2, oz: 1.8, r: 0.85 },
    { ox: 4.8, oz: 2.2, r: 0.95 }
  ].forEach((sb) => {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(sb.r, 12, 10), shrubMat);
    shrub.scale.set(1.0, 0.75, 1.0);
    shrub.position.set(islandX + sb.ox, 0.85 + sb.r * 0.4, islandZ + sb.oz);
    shrub.castShadow = true;
    details3DGroup.add(shrub);
  });

  // 4. 【現代幾何太極大石雕】本體（依實拍照片與使用者指示校正至東南南側藍框位置）：
  // 座落於中正園花台東南南前緣開闊灰石板廣場（緊鄰藍框處）
  const scX = islandX + 5.0;
  const scZ = islandZ + 7.2;

  // 4a. 雙層長方形臺座（下層水泥紅磚底、上層黑大理石圍邊、內部純白碎石床）
  const basePlinthMat = new THREE.MeshStandardMaterial({ color: 0x82776d, roughness: 0.85 });
  const blackBorderMat = new THREE.MeshStandardMaterial({ color: 0x181c1e, roughness: 0.6 });
  const whiteGravelMat = new THREE.MeshStandardMaterial({ color: 0xf5f4f0, roughness: 0.95 });

  // 底座
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.22, 4.2), basePlinthMat);
  plinth.position.set(scX, 0.25, scZ);
  plinth.receiveShadow = true;
  details3DGroup.add(plinth);

  // 黑石圍邊
  const plinthBorder = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 4.0), blackBorderMat);
  plinthBorder.position.set(scX, 0.40, scZ);
  plinthBorder.receiveShadow = true;
  details3DGroup.add(plinthBorder);

  // 白碎石床
  const whiteBed = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.05, 3.6), whiteGravelMat);
  whiteBed.position.set(scX, 0.48, scZ);
  whiteBed.receiveShadow = true;
  details3DGroup.add(whiteBed);

  // 4b. 深墨綠色幾何現代太極雕塑主體（深墨綠色花崗岩質感，斜切厚重塊面互鎖）
  const sculptureMat = new THREE.MeshStandardMaterial({
    color: 0x20352e,
    roughness: 0.36,
    metalness: 0.22
  });
  const scGroup = new THREE.Group();
  scGroup.position.set(scX, 0.48, scZ);
  scGroup.rotation.y = 0.22; // 迎向校門與迎賓車道大門迎賓視角

  // 塊體 1：下部大斜跨支撐厚塊（大蹲姿發力體量，左低右高斜向跨撐）
  const legBlock = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 1.35), sculptureMat);
  legBlock.position.set(-0.35, 0.78, 0);
  legBlock.rotation.z = -0.36;
  legBlock.rotation.y = 0.06;
  legBlock.castShadow = true;
  scGroup.add(legBlock);

  // 塊體 2：上部橫斜大挑切面（主斜切面刀口，右側斜向上挑）
  const armBlock = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.88, 1.45), sculptureMat);
  armBlock.position.set(0.25, 1.58, 0.12);
  armBlock.rotation.z = 0.28;
  armBlock.rotation.x = -0.10;
  armBlock.castShadow = true;
  scGroup.add(armBlock);

  // 塊體 3：中央互鎖核心咬合體（連貫上下，形成通透虛實光影）
  const coreBlock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.30, 1.15), sculptureMat);
  coreBlock.position.set(-0.08, 1.12, -0.05);
  coreBlock.rotation.y = -0.22;
  coreBlock.castShadow = true;
  scGroup.add(coreBlock);

  // 塊體 4：頂部幾何方首塊（斜切稜角倒角）
  const headBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.72, 0.65), sculptureMat);
  headBlock.position.set(-0.75, 2.08, 0.18);
  headBlock.rotation.z = -0.18;
  headBlock.rotation.y = 0.28;
  headBlock.castShadow = true;
  scGroup.add(headBlock);

  details3DGroup.add(scGroup);

  collisionBoxes.push({
    minX: scX - 2.8, maxX: scX + 2.8,
    minZ: scZ - 2.0, maxZ: scZ + 2.0,
    type: 'landmark', name: '中正園太極幾何裝置藝術'
  });

  // 5. 迎賓車道黃黑相間橡膠減速坡（Speed Bump，依照片 1、2 還原）
  const bumpX = pxToWorldX(996);
  const bumpZ = pyToWorldZ(775);
  const bumpGroup = new THREE.Group();
  bumpGroup.position.set(bumpX, 0.14, bumpZ);
  bumpGroup.rotation.y = 0.18;

  const bumpLen = 5.6;
  const numSegments = 14;
  const segW = bumpLen / numSegments;
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xdeb814, roughness: 0.5 });
  const blackRubberMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.7 });

  for (let s = 0; s < numSegments; s++) {
    const isYellow = (s % 2 === 0);
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, segW, 8),
      isYellow ? yellowMat : blackRubberMat
    );
    seg.rotation.x = Math.PI / 2;
    seg.scale.set(1.0, 0.22, 1.0);
    seg.position.set(0, 0.04, -bumpLen / 2 + (s + 0.5) * segW);
    seg.receiveShadow = true;
    bumpGroup.add(seg);
  }
  details3DGroup.add(bumpGroup);

  // 6. 「禁止進入」圓形紅底白色橫槓反光標誌（依照片 1 還原）
  const signPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xc8ced4, metalness: 0.6, roughness: 0.3 })
  );
  signPole.position.set(bumpX - 3.4, 1.2, bumpZ - 0.5);
  signPole.castShadow = true;
  details3DGroup.add(signPole);

  const signDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.025, 24),
    new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 })
  );
  signDisc.position.set(bumpX - 3.4, 2.35, bumpZ - 0.5);
  signDisc.rotation.z = Math.PI / 2;
  signDisc.rotation.x = Math.PI / 2 + 0.18;
  details3DGroup.add(signDisc);

  const signBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.028, 0.13),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  signBar.position.set(bumpX - 3.4, 2.35, bumpZ - 0.48);
  signBar.rotation.y = -0.18;
  details3DGroup.add(signBar);

  // 7. 依使用者指示校正：修剪整齊之金露花綠籬與矮駁坎由至聖樓側翼移至中正樓正面迎賓走廊（藍框位置 px: 972, py: 540..735）
  const curbWallMat = new THREE.MeshStandardMaterial({ color: 0x948f87, roughness: 0.85 });
  const goldenHedgeMat = new THREE.MeshStandardMaterial({ color: 0x8cb836, roughness: 0.8 });
  const hedgeShadeMat = new THREE.MeshStandardMaterial({ color: 0x2e5224, roughness: 0.88 });

  const hedgeLen = (735 - 540) * SCALE; // 52.65 m
  const hedgeZ = pyToWorldZ((540 + 735) / 2); // py: 637.5

  const hedgeWall = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, hedgeLen), curbWallMat);
  hedgeWall.position.set(pxToWorldX(972), 0.35, hedgeZ);
  hedgeWall.receiveShadow = true;
  hedgeWall.castShadow = true;
  details3DGroup.add(hedgeWall);

  const goldenHedge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.52, hedgeLen - 0.4), goldenHedgeMat);
  goldenHedge.position.set(pxToWorldX(972), 0.78, hedgeZ);
  goldenHedge.castShadow = true;
  details3DGroup.add(goldenHedge);

  // 綠籬上每隔約 4.8m 點綴修剪整齊之深綠圓球灌木
  const hedgeBushesCount = 11;
  const bushSpacing = hedgeLen / (hedgeBushesCount - 1);
  for (let bIdx = 0; bIdx < hedgeBushesCount; bIdx++) {
    const bZ = hedgeZ - hedgeLen / 2 + bIdx * bushSpacing;
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), hedgeShadeMat);
    bush.scale.set(1.0, 0.8, 1.0);
    bush.position.set(pxToWorldX(972), 1.15, bZ);
    bush.castShadow = true;
    details3DGroup.add(bush);
  }

  // C. 教職員斜向停車場（整齊分佈於中正樓正面迎賓廣場 px: 1018..1078, py: 540..745）
  // 依照片 1 特寫：第一位停放深邃金屬黑轎車（AKZ-1355 Honda Civic）、第二位極光銀轎車
  const carColors = [0x151618, 0xd4d8dc, 0xf5f5f5, 0x8c2d2d, 0x364f6b, 0x45494e, 0x2c333d];
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2efe9 });
  [-1, 1].forEach((side) => {
    const rowPx = 1048 + side * 26;
    for (let i = 0; i < 9; i++) {
      const cpy = 548 + i * 21.0;
      const sx = pxToWorldX(rowPx);
      const sz = pyToWorldZ(cpy);
      const slotLine = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.15), lineMat);
      slotLine.rotation.x = -Math.PI / 2;
      slotLine.rotation.z = side * 0.32;
      slotLine.position.set(sx, 0.19, sz - 1.0);
      details3DGroup.add(slotLine);

      if ((i + (side > 0 ? 1 : 0)) % 7 !== 3) {
        const carGroup = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({
          color: carColors[(i + (side > 0 ? 2 : 0)) % carColors.length],
          roughness: 0.30,
          metalness: 0.35
        });
        const carBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.76, 1.72), bodyMat);
        carBody.position.y = 0.55;
        carBody.castShadow = true;
        carGroup.add(carBody);

        const carCabin = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 0.60, 1.50),
          new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.2, metalness: 0.5 })
        );
        carCabin.position.set(-0.15, 1.10, 0);
        carGroup.add(carCabin);

        carGroup.position.set(sx, 0.16, sz);
        carGroup.rotation.y = side * 0.32;
        details3DGroup.add(carGroup);

        collisionBoxes.push({
          minX: sx - 2.1, maxX: sx + 2.1,
          minZ: sz - 1.25, maxZ: sz + 1.25,
          type: 'vehicle', name: '停放車輛'
        });
      }
    }
  });

  // D. 【左側大樓：至聖樓】實景還原（正門大穿堂、8 階大階梯、榮譽長幅布條與圓弧格柵）
  const zhishengX = pxToWorldX(952) + 0.35;
  const entryZ = pyToWorldZ(815); // 正對中正園「The statue」中心！

  // 1. 正門挑空大穿堂（1F~2F 挑高約 7.2m，寬約 26m，兩側大柱門廊）
  const portalFrameMat = new THREE.MeshStandardMaterial({ color: 0xd8d6cf, roughness: 0.8 });
  const portalVoidMat = new THREE.MeshStandardMaterial({ color: 0x1f242b, roughness: 0.9 });
  // 挑空內凹背景門廳
  const portalVoid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.0, 24.0), portalVoidMat);
  portalVoid.position.set(zhishengX - 0.4, 3.6, entryZ);
  details3DGroup.add(portalVoid);

  // 門廊頂部大挑簷梁（高 7.2m）
  const portalBeam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 26.5), portalFrameMat);
  portalBeam.position.set(zhishengX + 0.15, 7.3, entryZ);
  portalBeam.castShadow = true;
  details3DGroup.add(portalBeam);

  // 兩側挑空立柱
  [-13.0, 13.0].forEach((dz) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.2, 1.2), portalFrameMat);
    col.position.set(zhishengX + 0.15, 3.6, entryZ + dz);
    col.castShadow = true;
    details3DGroup.add(col);
  });

  // 2. 正門前寬達 26m、進深 5m 的 8 階深灰色大理石階梯
  const stepsGroup = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x949086, roughness: 0.85 });
  for (let s = 0; s < 8; s++) {
    const sW = 5.0 - s * 0.58;
    const sH = 0.18;
    const sD = 26.0 - s * 0.35;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, sD), stepMat);
    stepMesh.position.set(zhishengX + 0.25 + s * 0.28, 0.15 + s * 0.16, entryZ);
    stepMesh.receiveShadow = true;
    stepsGroup.add(stepMesh);
  }
  details3DGroup.add(stepsGroup);

  // 3. 門廊上方懸掛之兩道標誌性長條垂直紅色榮譽長幅布條
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xb5243b, roughness: 0.65 });
  [-5.2, 5.2].forEach((dz) => {
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 8.8, 1.7), bannerMat);
    banner.position.set(zhishengX + 0.45, 8.2, entryZ + dz);
    banner.castShadow = true;
    details3DGroup.add(banner);
  });

  // 4. 穿堂上方 3F~5F 橫向挑出陽台護欄板
  const balconyMat = new THREE.MeshStandardMaterial({ color: 0xe6e4dc, roughness: 0.75 });
  [2, 3, 4].forEach((fIdx) => {
    const bY = fIdx * FLOOR_H;
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 25.5), balconyMat);
    balcony.position.set(zhishengX + 0.25, bY + 0.45, entryZ);
    balcony.castShadow = true;
    details3DGroup.add(balcony);
  });

  // 5. 最左端格致樓與至聖樓交接處之圓弧轉角立面 (px: 938, py: 892) 垂直遮陽百葉
  const cornerH = 5 * FLOOR_H - 0.1;
  const cornerCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 3.8, cornerH, 24),
    new THREE.MeshStandardMaterial({ color: 0xd2d0c8, roughness: 0.78 })
  );
  cornerCyl.position.set(pxToWorldX(938), cornerH / 2, pyToWorldZ(892));
  cornerCyl.castShadow = true;
  details3DGroup.add(cornerCyl);

  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x8a867c, roughness: 0.7 });
  for (let a = 0; a < Math.PI / 2; a += 0.16) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, cornerH - 0.5, 0.12), stripeMat);
    stripe.position.set(
      pxToWorldX(938) + Math.cos(a) * 3.88,
      cornerH / 2,
      pyToWorldZ(892) + Math.sin(a) * 3.88
    );
    details3DGroup.add(stripe);
  }

  // E. 【右側大樓：中正樓】實景還原（立體方格遮陽深窗網格 Grid Facade + 1 樓連續墨綠色斜面遮雨棚）
  const zhongzhengX = pxToWorldX(952) + 0.42;
  const zzZStart = pyToWorldZ(532);
  const zzZEnd = pyToWorldZ(758);
  const zzLen = Math.abs(zzZEnd - zzZStart); // 約 61 公尺
  const zzCenterZ = (zzZStart + zzZEnd) / 2;

  // 1. 2F、3F、4F、5F 全棟正面規律的立體混凝土方格深窗陣列
  const gridFrameMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.65 });
  const gridRecessMat = new THREE.MeshStandardMaterial({ color: 0x27303a, roughness: 0.85 }); // 深邃凹窗
  const acBoxMat = new THREE.MeshStandardMaterial({ color: 0x48515c, roughness: 0.75 }); // 冷氣機百葉

  // 16 個規律窗格單元 (沿 Z 軸展開)
  const numBays = 16;
  const bayW = zzLen / numBays;

  [1, 2, 3, 4].forEach((fIdx) => {
    const floorY = fIdx * FLOOR_H;
    // 每層樓頂部的水平凸簷板
    const browSlab = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, zzLen), gridFrameMat);
    browSlab.position.set(zhongzhengX, floorY + 2.9, zzCenterZ);
    browSlab.castShadow = true;
    details3DGroup.add(browSlab);

    // 每層樓下方的窗台外凸托架板
    const sillSlab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, zzLen), gridFrameMat);
    sillSlab.position.set(zhongzhengX - 0.05, floorY + 0.95, zzCenterZ);
    sillSlab.castShadow = true;
    details3DGroup.add(sillSlab);

    // 垂直遮陽隔板與深凹窗格
    for (let i = 0; i < numBays; i++) {
      const bayCenterZ = zzZStart + (i + 0.5) * bayW;

      // 左右立體邊框垂直板
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.50, 1.85, 0.16), gridFrameMat);
      finMesh.position.set(zhongzhengX, floorY + 1.9, zzZStart + i * bayW);
      finMesh.castShadow = true;
      details3DGroup.add(finMesh);

      // 凹陷玻璃窗面
      const winRecess = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.70, bayW - 0.28), gridRecessMat);
      winRecess.position.set(zhongzhengX - 0.22, floorY + 1.9, bayCenterZ);
      details3DGroup.add(winRecess);

      // 空調托架上之小型冷氣百葉箱
      const acUnit = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.75), acBoxMat);
      acUnit.position.set(zhongzhengX - 0.08, floorY + 0.62, bayCenterZ);
      acUnit.castShadow = true;
      details3DGroup.add(acUnit);
    }
  });

  // 2. 1 樓底部整排連續 60 公尺長之「墨綠色斜面遮雨棚」
  const greenAwningMat = new THREE.MeshStandardMaterial({ color: 0x1f5c38, roughness: 0.55 });
  const awningMesh = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, zzLen - 2.0), greenAwningMat);
  awningMesh.position.set(zhongzhengX + 0.95, 3.25, zzCenterZ);
  awningMesh.rotation.z = -0.26; // 向外向下斜面傾角
  awningMesh.castShadow = true;
  details3DGroup.add(awningMesh);

  // 雨棚下方支撐鋼柱
  const awningPostMat = new THREE.MeshStandardMaterial({ color: 0x7c838a, metalness: 0.5 });
  for (let z = zzZStart + 2.0; z <= zzZEnd - 2.0; z += 5.5) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.0, 8), awningPostMat);
    post.position.set(zhongzhengX + 1.95, 1.5, z);
    post.castShadow = true;
    details3DGroup.add(post);
  }

  // 3. 中正樓南端山牆（靠近運動場 py: 530）之彩虹馬賽克壁畫
  const muralColors = [0x2b8cbe, 0x4eb3d3, 0x7bccc4, 0xfdae61, 0xd73027];
  muralColors.forEach((mc, idx) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 4 * FLOOR_H * 0.82, 0.24),
      new THREE.MeshStandardMaterial({ color: mc, roughness: 0.5 })
    );
    stripe.position.set(pxToWorldX(904 + idx * 8.5), 2.5 * FLOOR_H, zzZStart);
    details3DGroup.add(stripe);
  });

  // F. 雙中庭天井：「椰子樹花園」與「中正花園」
  // 1. 椰子樹花園（Coconut Palm Garden, px: 832..896, py: 605..735）
  const palmGardenCx = pxToWorldX((832 + 896) / 2);
  const palmGardenCz = pyToWorldZ((605 + 735) / 2);

  const palmFloor = new THREE.Mesh(
    new THREE.BoxGeometry(64 * SCALE, 0.22, 130 * SCALE),
    new THREE.MeshStandardMaterial({ color: 0x6e7d6b, roughness: 0.9 })
  );
  palmFloor.position.set(palmGardenCx, 0.22, palmGardenCz);
  palmFloor.receiveShadow = true;
  details3DGroup.add(palmFloor);

  // 依使用者指示校正：1~5層獨立樓梯/電梯塔樓由中庭中央移至北側中美西廊道相連處（藍圈位置 px: 864, py: 618）
  const towerZ = pyToWorldZ(618);
  const towerH = 18.0; // 1~5層完整樓高（5 * 3.6m = 18m）
  const stairTower = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, towerH, 6.8),
    new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: 0.8 })
  );
  stairTower.position.set(palmGardenCx, towerH / 2, towerZ);
  stairTower.castShadow = true;
  stairTower.receiveShadow = true;
  details3DGroup.add(stairTower);

  // 樓梯塔樓頂部女兒牆與電梯機房屋突（Penthouse）
  const towerRoofY = towerH;
  const towerPh = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.2, 4.4),
    new THREE.MeshStandardMaterial({ color: 0xc8c6be, roughness: 0.8 })
  );
  towerPh.position.set(palmGardenCx, towerRoofY + 1.1, towerZ);
  towerPh.castShadow = true;
  details3DGroup.add(towerPh);

  // 5 棵挺拔高聳的大王椰子樹
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0xd2cdc4, roughness: 0.75 });
  const palmSheathMat = new THREE.MeshStandardMaterial({ color: 0x3d8542, roughness: 0.6 });
  const palmFrondMat = new THREE.MeshStandardMaterial({ color: 0x225c27, roughness: 0.65, side: THREE.DoubleSide });

  function createRoyalPalmMesh(heightM) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, heightM - 1.4, 10),
      palmTrunkMat
    );
    trunk.position.y = (heightM - 1.4) / 2;
    trunk.castShadow = true;
    palm.add(trunk);

    const sheath = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.32, 1.4, 10),
      palmSheathMat
    );
    sheath.position.y = heightM - 0.7;
    sheath.castShadow = true;
    palm.add(sheath);

    const crownTopY = heightM;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + (i % 2) * 0.15;
      const frondGroup = new THREE.Group();
      frondGroup.position.set(0, crownTopY, 0);
      frondGroup.rotation.y = angle;

      const frondGeo = new THREE.BoxGeometry(0.35, 0.05, 3.8);
      const frond = new THREE.Mesh(frondGeo, palmFrondMat);
      frond.position.set(0, -0.65, 1.8);
      frond.rotation.x = -0.42;
      frondGroup.add(frond);

      palm.add(frondGroup);
    }
    return palm;
  }

  const palmConfigs = [
    { dx: -4.5, dz: -8.5, h: 12.8 },
    { dx: 4.2, dz: -9.2, h: 13.5 },
    { dx: -5.0, dz: 7.8, h: 11.5 },
    { dx: 4.8, dz: 8.5, h: 12.2 },
    { dx: 0.0, dz: 12.5, h: 13.0 }
  ];
  palmConfigs.forEach((cfg) => {
    const palm = createRoyalPalmMesh(cfg.h);
    palm.position.set(palmGardenCx + cfg.dx, 0.22, palmGardenCz + cfg.dz);
    details3DGroup.add(palm);
  });

  // 2. 中正花園（Zhongzheng Garden, px: 832..896, py: 755..855）
  const zGardenCx = pxToWorldX((832 + 896) / 2);
  const zGardenCz = pyToWorldZ((755 + 855) / 2);
  const zGardenFloor = new THREE.Mesh(
    new THREE.BoxGeometry(64 * SCALE, 0.22, 100 * SCALE),
    new THREE.MeshStandardMaterial({ color: 0x8a9187, roughness: 0.85 })
  );
  zGardenFloor.position.set(zGardenCx, 0.22, zGardenCz);
  zGardenFloor.receiveShadow = true;
  details3DGroup.add(zGardenFloor);

  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x3d703b, roughness: 0.9 });
  [-1, 1].forEach((sign) => {
    const hedgeBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.65, 8.5), hedgeMat);
    hedgeBox.position.set(zGardenCx + sign * 3.6, 0.55, zGardenCz);
    hedgeBox.castShadow = true;
    details3DGroup.add(hedgeBox);
  });

  // G. 格致樓外牆雙排綠色波浪頂棚停車棚
  const shedRoofMat = new THREE.MeshStandardMaterial({ color: 0x1e8758, roughness: 0.45, metalness: 0.15 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x7a8288, metalness: 0.5 });
  [
    { x0: 642, pw: 308, py: 923 },
    { x0: 625, pw: 325, py: 965 }
  ].forEach((sh) => {
    const shedW = sh.pw * SCALE;
    const shedD = 20 * SCALE;
    const shedCx = pxToWorldX(sh.x0 + sh.pw / 2);
    const shedCz = pyToWorldZ(sh.py);
    const shedCap = new THREE.Mesh(new THREE.BoxGeometry(shedW, 0.22, shedD), shedRoofMat);
    shedCap.position.set(shedCx, 3.05, shedCz);
    shedCap.rotation.x = 0.10;
    shedCap.castShadow = true;
    details3DGroup.add(shedCap);

    for (let px = sh.x0 + 15; px <= sh.x0 + sh.pw - 15; px += 38) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.0, 8), postMat);
      post.position.set(pxToWorldX(px), 1.5, shedCz);
      details3DGroup.add(post);
    }
  });

  // 7. 校門口警衛室平頂出簷建築、高聳簍空「臺北市立中正高級中學」校名石柱碑、行人側門與雙向不鏽鋼自動伸縮鐵門
  // （完全對照 4 張實景照片與平面圖 px: 1016..1045, py: 874..932）
  const guardCx = pxToWorldX(1030.5);
  const guardCz = pyToWorldZ(903);
  const guardW = 29 * SCALE; // 7.83 m
  const guardD = 58 * SCALE; // 15.66 m

  // 警衛室本體：下半部洗石子水泥矮牆基座 (高 1.15m)
  const guardBase = new THREE.Mesh(
    new THREE.BoxGeometry(guardW, 1.15, guardD),
    new THREE.MeshStandardMaterial({ color: 0xd6d3cb, roughness: 0.85 })
  );
  guardBase.position.set(guardCx, 0.575, guardCz);
  guardBase.castShadow = true;
  guardBase.receiveShadow = true;

  // 警衛室中段：深色環景窗帶與警衛窗口 (高 1.4m)
  const guardWindows = new THREE.Mesh(
    new THREE.BoxGeometry(guardW * 0.98, 1.4, guardD * 0.98),
    new THREE.MeshStandardMaterial({ color: 0x18241f, roughness: 0.18, metalness: 0.45 })
  );
  guardWindows.position.set(guardCx, 1.15 + 0.7, guardCz);
  guardWindows.castShadow = true;

  // 警衛室平屋頂出簷遮雨棚（深綠色平頂挑簷，四向延伸 0.85m）
  const guardEaves = new THREE.Mesh(
    new THREE.BoxGeometry(guardW + 1.7, 0.18, guardD + 1.7),
    new THREE.MeshStandardMaterial({ color: 0x225540, roughness: 0.35, metalness: 0.25 })
  );
  guardEaves.position.set(guardCx, 2.64, guardCz);
  guardEaves.castShadow = true;

  // 警衛室上方平頂白色女兒牆 (高 0.85m)
  const guardParapet = new THREE.Mesh(
    new THREE.BoxGeometry(guardW, 0.85, guardD),
    new THREE.MeshStandardMaterial({ color: 0xe2ded7, roughness: 0.72 })
  );
  guardParapet.position.set(guardCx, 2.73 + 0.425, guardCz);
  guardParapet.castShadow = true;

  // 警衛室屋頂銀灰色金屬花架構件
  const trellisMat = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.65, roughness: 0.35 });
  for (let tz = -guardD / 2 + 1; tz <= guardD / 2 - 1; tz += 3.2) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(guardW + 0.4, 0.08, 0.08), trellisMat);
    beam.position.set(guardCx, 3.8, guardCz + tz);
    details3DGroup.add(beam);
  }
  for (let tx = -guardW / 2 + 0.8; tx <= guardW / 2 - 0.8; tx += 2.8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, guardD - 0.5), trellisMat);
    beam.position.set(guardCx + tx, 3.88, guardCz);
    details3DGroup.add(beam);
  }

  details3DGroup.add(guardBase, guardWindows, guardEaves, guardParapet);

  // === 高聳簍空頂框校名石柱碑（高 9.6m，中央粉褐花崗岩垂直金字「臺北市立中正高級中學」）===
  const pylonCanvas = document.createElement('canvas');
  pylonCanvas.width = 256;
  pylonCanvas.height = 1024;
  const pylCtx = pylonCanvas.getContext('2d');
  pylCtx.fillStyle = '#c7b4a3';
  pylCtx.fillRect(0, 0, 256, 1024);
  // 花崗岩石材雜點紋理
  for (let i = 0; i < 4000; i++) {
    const nx = Math.random() * 256;
    const ny = Math.random() * 1024;
    pylCtx.fillStyle = Math.random() < 0.5 ? '#b8a392' : '#d8c7b8';
    pylCtx.fillRect(nx, ny, 2, 2);
  }
  // 金色立體雕刻直書校名「臺北市立中正高級中學」
  pylCtx.font = 'bold 64px "DFKai-SB", "Kaiti TC", "BiauKai", "Noto Serif TC", serif';
  pylCtx.textAlign = 'center';
  pylCtx.textBaseline = 'middle';
  const schoolChars = ['臺', '北', '市', '立', '中', '正', '高', '級', '中', '學'];
  schoolChars.forEach((ch, idx) => {
    const cy = 110 + idx * 84;
    // 陰影立體浮雕感
    pylCtx.fillStyle = '#6e4f1a';
    pylCtx.fillText(ch, 131, cy + 3);
    // 金箔亮面
    pylCtx.fillStyle = '#f0c842';
    pylCtx.fillText(ch, 128, cy);
    pylCtx.fillStyle = '#fff4a8';
    pylCtx.fillText(ch, 126, cy - 2);
  });
  const pylonTex = new THREE.CanvasTexture(pylonCanvas);
  pylonTex.colorSpace = THREE.SRGBColorSpace;

  const pylonGroup = new THREE.Group();
  const pylonWx = pxToWorldX(1054);
  const pylonWz = pyToWorldZ(892);
  pylonGroup.position.set(pylonWx, 0, pylonWz);
  pylonGroup.rotation.y = -0.46; // 面向文林北路與北科路交會路口

  const pylonColMat = new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.72 });
  // 兩側高聳支柱 (高 9.6m)
  const leftCol = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.6, 1.6), pylonColMat);
  leftCol.position.set(-1.05, 4.8, 0);
  leftCol.castShadow = true;
  const rightCol = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.6, 1.6), pylonColMat);
  rightCol.position.set(1.05, 4.8, 0);
  rightCol.castShadow = true;

  // 頂部橫樑與頂蓋（構成標誌性頂部簍空方框造型）
  const topLintel = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.05, 1.6), pylonColMat);
  topLintel.position.set(0, 9.075, 0);
  topLintel.castShadow = true;

  const midBeam = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.45, 1.6), pylonColMat);
  midBeam.position.set(0, 7.35, 0);
  midBeam.castShadow = true;

  // 中央石碑本體（粉褐花崗岩貼圖）
  const pylonCoreMat = new THREE.MeshStandardMaterial({
    map: pylonTex,
    roughness: 0.65,
    metalness: 0.15
  });
  const pylonCore = new THREE.Mesh(new THREE.BoxGeometry(1.45, 7.1, 1.5), pylonCoreMat);
  pylonCore.position.set(0, 3.55, 0);
  pylonCore.castShadow = true;

  // 石碑基座前方紅白相間安全三角錐 (Traffic Cones，對照實景照片)
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xfa5214, roughness: 0.4 });
  const coneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  [-0.6, 0.0, 0.6].forEach((cxOffset) => {
    const coneBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), coneMat);
    coneBase.position.set(cxOffset, 0.02, 1.25);
    const coneBody = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.75, 14), coneMat);
    coneBody.position.set(cxOffset, 0.395, 1.25);
    const coneRing = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.22, 14), coneWhiteMat);
    coneRing.position.set(cxOffset, 0.42, 1.25);
    pylonGroup.add(coneBase, coneBody, coneRing);
  });

  pylonGroup.add(leftCol, rightCol, topLintel, midBeam, pylonCore);
  details3DGroup.add(pylonGroup);

  // === 行人直柵金屬側門 (位於警衛室東北側與校門石柱碑之間 px: 1045..1053) ===
  const pedGateMat = new THREE.MeshStandardMaterial({ color: 0xa4a9ad, metalness: 0.65, roughness: 0.35 });
  const pedGateGroup = new THREE.Group();
  const pedWx1 = pxToWorldX(1043.5), pedWz1 = pyToWorldZ(898);
  const pedWx2 = pxToWorldX(1052.5), pedWz2 = pyToWorldZ(893);
  const pedLen = Math.hypot(pedWx2 - pedWx1, pedWz2 - pedWz1);
  pedGateGroup.position.set((pedWx1 + pedWx2) / 2, 0, (pedWz1 + pedWz2) / 2);
  pedGateGroup.rotation.y = -Math.atan2(pedWz2 - pedWz1, pedWx2 - pedWx1);

  // 上下橫軌與直立欄杆 (高 2.2m)
  const pedTopRail = new THREE.Mesh(new THREE.BoxGeometry(pedLen, 0.08, 0.08), pedGateMat);
  pedTopRail.position.set(0, 2.15, 0);
  const pedBotRail = new THREE.Mesh(new THREE.BoxGeometry(pedLen, 0.08, 0.08), pedGateMat);
  pedBotRail.position.set(0, 0.12, 0);
  pedGateGroup.add(pedTopRail, pedBotRail);
  const barCount = Math.floor(pedLen / 0.18);
  for (let bi = 0; bi <= barCount; bi++) {
    const barX = -pedLen / 2 + (bi / barCount) * pedLen;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.05, 8), pedGateMat);
    bar.position.set(barX, 1.135, 0);
    pedGateGroup.add(bar);
  }
  details3DGroup.add(pedGateGroup);

  // === 不鏽鋼菱形格柵自動伸縮鐵門共用建構函式 ===
  function buildRetractableIronGate(p1, p2, height = 1.55, isMain = true) {
    const gGroup = new THREE.Group();
    const x1 = pxToWorldX(p1.px), z1 = pyToWorldZ(p1.py);
    const x2 = pxToWorldX(p2.px), z2 = pyToWorldZ(p2.py);
    const dx = x2 - x1, dz = z2 - z1;
    const gateLen = Math.hypot(dx, dz);
    const rotY = -Math.atan2(dz, dx);

    gGroup.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    gGroup.rotation.y = rotY;

    // 1. 地面黃黑相間警示緣石軌道條
    const trackCanvas = document.createElement('canvas');
    trackCanvas.width = 256;
    trackCanvas.height = 32;
    const tCtx = trackCanvas.getContext('2d');
    for (let s = 0; s < 16; s++) {
      tCtx.fillStyle = s % 2 === 0 ? '#f7d117' : '#1e2022';
      tCtx.beginPath();
      tCtx.moveTo(s * 16, 0);
      tCtx.lineTo(s * 16 + 12, 0);
      tCtx.lineTo(s * 16 - 4, 32);
      tCtx.lineTo(s * 16 - 16, 32);
      tCtx.closePath();
      tCtx.fill();
    }
    const trackTex = new THREE.CanvasTexture(trackCanvas);
    trackTex.wrapS = THREE.RepeatWrapping;
    trackTex.wrapT = THREE.ClampToEdgeWrapping;
    trackTex.repeat.set(Math.ceil(gateLen / 1.2), 1);
    const trackMesh = new THREE.Mesh(
      new THREE.BoxGeometry(gateLen, 0.08, 0.42),
      new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.65 })
    );
    trackMesh.position.set(0, 0.04, 0);
    gGroup.add(trackMesh);

    // 2. 不鏽鋼直立排管與底部滑輪
    const ssMat = new THREE.MeshStandardMaterial({ color: 0xe6e9ec, metalness: 0.85, roughness: 0.22 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.8 });
    const postCount = Math.floor(gateLen / 0.85);
    const postGeo = new THREE.BoxGeometry(0.05, height, 0.05);
    const wheelGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 10);
    wheelGeo.rotateZ(Math.PI / 2);

    for (let pi = 0; pi <= postCount; pi++) {
      const pxOffset = -gateLen / 2 + (pi / postCount) * gateLen;
      const post = new THREE.Mesh(postGeo, ssMat);
      post.position.set(pxOffset, height / 2 + 0.08, 0);
      post.castShadow = true;
      gGroup.add(post);

      const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
      wheelL.position.set(pxOffset, 0.08, -0.14);
      const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
      wheelR.position.set(pxOffset, 0.08, 0.14);
      gGroup.add(wheelL, wheelR);
    }

    // 3. 不鏽鋼菱形伸縮交叉剪刀桿（X 格柵）
    const scissorMat = new THREE.MeshStandardMaterial({ color: 0xd9dde0, metalness: 0.75, roughness: 0.28 });
    const segCount = postCount;
    for (let si = 0; si < segCount; si++) {
      const segX1 = -gateLen / 2 + (si / postCount) * gateLen;
      const segX2 = -gateLen / 2 + ((si + 1) / postCount) * gateLen;
      const segMid = (segX1 + segX2) / 2;
      const segW = segX2 - segX1;
      const barDiagLen = Math.hypot(segW, height * 0.7);

      // 上下兩段 X 剪刀格
      [height * 0.45, height * 0.85].forEach((cyLevel) => {
        const barA = new THREE.Mesh(new THREE.BoxGeometry(barDiagLen, 0.025, 0.025), scissorMat);
        barA.position.set(segMid, cyLevel, 0.015);
        barA.rotation.z = Math.atan2(height * 0.35, segW);
        const barB = new THREE.Mesh(new THREE.BoxGeometry(barDiagLen, 0.025, 0.025), scissorMat);
        barB.position.set(segMid, cyLevel, -0.015);
        barB.rotation.z = -Math.atan2(height * 0.35, segW);
        gGroup.add(barA, barB);
      });
    }

    // 4. 中央電動驅動機頭箱 (Motor Drive Box)
    const motorBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, height + 0.15, 0.48),
      new THREE.MeshStandardMaterial({ color: 0x303438, metalness: 0.45, roughness: 0.55 })
    );
    motorBox.position.set(0, (height + 0.15) / 2 + 0.08, 0);
    motorBox.castShadow = true;
    // 機頭箱頂部黃色警示旋轉燈
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0xff8800, roughness: 0.2 })
    );
    beacon.position.set(0, height + 0.15 + 0.16, 0);
    gGroup.add(motorBox, beacon);

    // 5. 右側端點白色控制柱與圓形標誌（主入口右端 px: 1142, py: 852 銜接北科路圍牆）
    if (isMain) {
      const endPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.85, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xdedcd6, roughness: 0.75 })
      );
      endPillar.position.set(gateLen / 2 + 0.35, 0.925, 0);
      endPillar.castShadow = true;

      // 藍底白向右箭頭指示標誌
      const signBlue = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.03, 16),
        new THREE.MeshStandardMaterial({ color: 0x1d68ba, roughness: 0.4 })
      );
      signBlue.rotation.x = Math.PI / 2;
      signBlue.position.set(gateLen / 2 + 0.35, 1.35, 0.38);

      // 紅圈禁停標誌
      const signRed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16),
        new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.4 })
      );
      signRed.rotation.x = Math.PI / 2;
      signRed.position.set(gateLen / 2 + 0.35, 0.75, 0.38);

      gGroup.add(endPillar, signBlue, signRed);
    }

    details3DGroup.add(gGroup);
  }

  // 建置主入口自動伸縮鐵門（黃色圈選處右側，由校名石柱碑 px: 1056, py: 890 連接至北科路圍牆 px: 1142, py: 852）
  buildRetractableIronGate({ px: 1056, py: 890 }, { px: 1142, py: 852 }, 1.55, true);

  // 建置左側車道自動伸縮鐵門（黃色圈選處左側，由圍牆轉角 px: 964, py: 980 連接至警衛室西南側 px: 1016, py: 934）
  buildRetractableIronGate({ px: 964, py: 980 }, { px: 1016, py: 934 }, 1.55, false);

  // 左側車道轉角控制基石與矮牆
  const southCornerWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.72 })
  );
  southCornerWall.position.set(pxToWorldX(963), 0.9, pyToWorldZ(981));
  southCornerWall.castShadow = true;
  details3DGroup.add(southCornerWall);

  // 車道前方柏油路面兩組反光「慢」字方框地面標線 (對照實景照片 3 & 4)
  const slowCanvas = document.createElement('canvas');
  slowCanvas.width = 256;
  slowCanvas.height = 256;
  const sCtx = slowCanvas.getContext('2d');
  sCtx.fillStyle = '#ffffff';
  sCtx.lineWidth = 14;
  sCtx.strokeStyle = '#ffffff';
  sCtx.strokeRect(18, 18, 220, 220);
  sCtx.font = 'bold 150px "DFKai-SB", "Kaiti TC", "Noto Sans TC", sans-serif';
  sCtx.textAlign = 'center';
  sCtx.textBaseline = 'middle';
  sCtx.fillText('慢', 128, 128);
  const slowTex = new THREE.CanvasTexture(slowCanvas);
  slowTex.colorSpace = THREE.SRGBColorSpace;
  const slowMat = new THREE.MeshBasicMaterial({ map: slowTex, transparent: true, opacity: 0.88 });

  [
    { px: 978, py: 996, rot: 0.65 },
    { px: 996, py: 978, rot: 0.65 }
  ].forEach((pos) => {
    const slowDecal = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), slowMat);
    slowDecal.rotation.x = -Math.PI / 2;
    slowDecal.rotation.z = pos.rot;
    slowDecal.position.set(pxToWorldX(pos.px), 0.12, pyToWorldZ(pos.py));
    details3DGroup.add(slowDecal);
  });

  // 8. 活動中心青綠色斜屋頂（嚴格對齊平面圖活動中心座標 px: 1150..1300, py: 425..656，消除旋轉錯位）
  const acW = 150 * SCALE;
  const acD = 231 * SCALE;
  const acCx = pxToWorldX(1150 + 75);
  const acCz = pyToWorldZ(425 + 115.5);
  const acBaseY = 3 * FLOOR_H;
  const acRoofGeo = new THREE.ConeGeometry(1, 4.2, 4);
  acRoofGeo.rotateY(Math.PI / 4);
  acRoofGeo.scale(acW / Math.SQRT2, 1, acD / Math.SQRT2);
  const hipRoof = new THREE.Mesh(
    acRoofGeo,
    new THREE.MeshStandardMaterial({ color: 0x2d8a6c, roughness: 0.55, metalness: 0.15 })
  );
  hipRoof.position.set(acCx, acBaseY + 2.1, acCz);
  hipRoof.castShadow = true;
  details3DGroup.add(hipRoof);
}

// === 黑色校犬群（小黑、歐告、黑皮、黑輪）與樹梢零散臺灣特有種「臺灣藍鵲」 ===
function buildCampusDogsAndMagpies() {
  const furMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.72 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.4 });
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xf5b82a, metalness: 0.8, roughness: 0.2 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3d2010 });
  const noseMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

  function createDogMesh(name, isLying = false) {
    const dog = new THREE.Group();
    dog.name = `DOG_${name}`;

    // 軀幹 (Body)
    const bodyH = isLying ? 0.22 : 0.46;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.72), furMat);
    body.position.set(0, bodyH, 0);
    body.castShadow = true;
    dog.add(body);

    // 胸肩部 (Chest)
    const chestH = isLying ? 0.26 : 0.52;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.32), furMat);
    chest.position.set(0, chestH, 0.22);
    chest.castShadow = true;
    dog.add(chest);

    // 頸部 (Neck)
    const neckH = isLying ? 0.38 : 0.68;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.26, 8), furMat);
    neck.position.set(0, neckH, 0.32);
    neck.rotation.x = isLying ? 0.22 : 0.35;
    neck.castShadow = true;
    dog.add(neck);

    // 紅色項圈與金色名牌 (Collar & Tag)
    const collarH = isLying ? 0.35 : 0.65;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.06, 10), collarMat);
    collar.position.set(0, collarH, 0.31);
    collar.rotation.x = isLying ? 0.22 : 0.35;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), bellMat);
    bell.position.set(0, collarH - 0.07, 0.41);
    dog.add(collar, bell);

    // 頭部組件 (Head Group)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, isLying ? 0.52 : 0.82, 0.38);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.26), furMat);
    head.castShadow = true;
    headGroup.add(head);

    // 口鼻部與黑鼻子 (Snout & Nose)
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.22), furMat);
    snout.position.set(0, -0.04, 0.22);
    snout.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), noseMat);
    nose.position.set(0, 0.02, 0.33);
    headGroup.add(snout, nose);

    // 雙眼 (Eyes)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    eyeL.position.set(-0.09, 0.05, 0.14);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    eyeR.position.set(0.09, 0.05, 0.14);
    headGroup.add(eyeL, eyeR);

    // 臺灣高砂犬直立尖耳 (Pricked Ears)
    const earGeo = new THREE.ConeGeometry(0.06, 0.18, 4);
    const earL = new THREE.Mesh(earGeo, furMat);
    earL.position.set(-0.11, 0.18, -0.02);
    earL.rotation.set(-0.1, 0, -0.25);
    const earR = new THREE.Mesh(earGeo, furMat);
    earR.position.set(0.11, 0.18, -0.02);
    earR.rotation.set(-0.1, 0, 0.25);
    headGroup.add(earL, earR);

    dog.add(headGroup);

    // 四肢 (Legs)
    if (isLying) {
      const pawGeo = new THREE.BoxGeometry(0.12, 0.10, 0.24);
      [[-0.18, 0.05, 0.28], [0.18, 0.05, 0.28], [-0.20, 0.05, -0.22], [0.20, 0.05, -0.22]].forEach(([lx, ly, lz]) => {
        const paw = new THREE.Mesh(pawGeo, furMat);
        paw.position.set(lx, ly, lz);
        paw.castShadow = true;
        dog.add(paw);
      });
    } else {
      const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.42, 6);
      const pawGeo = new THREE.BoxGeometry(0.09, 0.06, 0.12);
      [
        [-0.12, 0.21, 0.24],
        [0.12, 0.21, 0.24],
        [-0.12, 0.21, -0.24],
        [0.12, 0.21, -0.24]
      ].forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, furMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        const paw = new THREE.Mesh(pawGeo, furMat);
        paw.position.set(lx, 0.03, lz + 0.02);
        dog.add(leg, paw);
      });
    }

    // 經典向上捲曲之鐮刀尾 (Sickle Tail)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, isLying ? 0.32 : 0.58, -0.34);
    const tailSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 6), furMat);
    tailSeg1.position.set(0, 0.1, -0.06);
    tailSeg1.rotation.x = -0.55;
    const tailSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.20, 6), furMat);
    tailSeg2.position.set(0, 0.22, -0.02);
    tailSeg2.rotation.x = 0.65;
    tailGroup.add(tailSeg1, tailSeg2);
    dog.add(tailGroup);

    return { group: dog, headGroup, tailGroup, name };
  }

  // 4 隻黑色校犬零散配置於校園主要出入口與操場草坪
  const dogConfigs = [
    { name: '小黑', px: 1040, py: 916, yaw: -0.75, isLying: false, intro: '校門口大門值勤警備隊長，守護師生上下學！' },
    { name: '歐告', px: 1085, py: 760, yaw: 1.15, isLying: true, intro: '在中正園草坪享受溫暖陽光曬太陽，個性溫和！' },
    { name: '黑皮', px: 785, py: 575, yaw: 0.32, isLying: false, intro: '大花圃老榕樹下的運動健將，喜歡看球賽！' },
    { name: '黑輪', px: 360, py: 125, yaw: -1.45, isLying: false, intro: '田徑場跑道巡查員，陪著同學晨操熱身！' }
  ];

  dogConfigs.forEach((cfg) => {
    const d = createDogMesh(cfg.name, cfg.isLying);
    const wx = pxToWorldX(cfg.px);
    const wz = pyToWorldZ(cfg.py);
    d.group.position.set(wx, 0, wz);
    d.group.rotation.y = cfg.yaw;
    details3DGroup.add(d.group);

    animatedAnimals.dogs.push({
      ...d,
      wx, wz,
      seed: Math.random() * 100,
      intro: cfg.intro
    });

    collisionCircles.push({
      x: wx,
      z: wz,
      r: 0.58,
      type: 'dog',
      name: `校犬「${cfg.name}」`
    });
  });

  // === 臺灣特有種「臺灣藍鵲（長尾山娘）」===
  // 嚴格落實要求：100% 棲息於樹上（絕不在地面），絕不群聚，採用空間最小間距演算法均勻零散分佈於全校樹梢！
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.6 });
  const royalBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1875d2,
    roughness: 0.32,
    metalness: 0.22,
    emissive: 0x092659
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xff1e1e,
    roughness: 0.35,
    emissive: 0x3d0000
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const yellowEyeMat = new THREE.MeshBasicMaterial({ color: 0xffd600 });

  function createMagpieMesh() {
    const bird = new THREE.Group();

    // 軀幹（體長放大 2.4 倍，長度約 0.85m）
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), royalBlueMat);
    body.scale.set(0.88, 0.95, 1.5);
    body.castShadow = true;
    bird.add(body);

    // 胸部與頸部（黑羽頭套）
    const breast = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), blackMat);
    breast.position.set(0, 0.08, 0.24);
    breast.scale.set(0.86, 0.95, 0.92);
    bird.add(breast);

    // 頭部組件（黑頭）
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.26, 0.38);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), blackMat);
    head.castShadow = true;
    headGroup.add(head);

    // 珊瑚鮮紅粗長喙 (Coral Red Beak, 長 0.26m)
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 8), redMat);
    beak.position.set(0, -0.02, 0.25);
    beak.rotation.x = Math.PI / 2;
    beak.castShadow = true;
    headGroup.add(beak);

    // 醒目金黃色雙眼
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), yellowEyeMat);
    eyeL.position.set(-0.12, 0.05, 0.09);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), yellowEyeMat);
    eyeR.position.set(0.12, 0.05, 0.09);
    headGroup.add(eyeL, eyeR);

    bird.add(headGroup);

    // 雙翼（折合琉璃寶藍與黑翼羽）
    const wingGeo = new THREE.BoxGeometry(0.09, 0.26, 0.72);
    const wingL = new THREE.Mesh(wingGeo, royalBlueMat);
    wingL.position.set(-0.25, 0.04, -0.12);
    wingL.rotation.set(-0.18, 0.08, 0.15);
    const wingR = new THREE.Mesh(wingGeo, royalBlueMat);
    wingR.position.set(0.25, 0.04, -0.12);
    wingR.rotation.set(-0.18, -0.08, -0.15);
    bird.add(wingL, wingR);

    // 鮮紅雙爪 (Red Legs)
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), redMat);
    legL.position.set(-0.11, -0.26, 0.06);
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), redMat);
    legR.position.set(0.11, -0.26, 0.06);
    bird.add(legL, legR);

    // 臺灣藍鵲靈魂特徵：1.15 公尺長之階梯狀超長黑白斑紋尾羽
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.04, -0.35);

    const tailMain = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, 0.98), royalBlueMat);
    tailMain.position.set(0, -0.18, -0.49);
    tailMain.rotation.x = 0.38;

    const tailBand = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.028, 0.16), blackMat);
    tailBand.position.set(0, -0.345, -0.89);
    tailBand.rotation.x = 0.38;

    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.028, 0.25), whiteMat);
    tailTip.position.set(0, -0.42, -1.08);
    tailTip.rotation.x = 0.38;

    tailGroup.add(tailMain, tailBand, tailTip);
    bird.add(tailGroup);

    return { group: bird, headGroup, tailGroup };
  }

  // 從全校 570 棵樹木資料中，篩選全校各區樹木，並以空間最小距離（至少 32 公尺）過濾，保證「零散分佈在樹上，絕不群聚」
  const allTrees = (window.CAMPUS_TREES && window.CAMPUS_TREES.trees) || [];
  const selectedTreeMagpies = [];
  const MIN_DIST_SQ = (32 / SCALE) * (32 / SCALE); // 像素距離平方閥值（約 118 像素，即實體距離 32 公尺）

  // 優先分區遍歷全校各個主要綠帶（田徑場周圍、大花圃、中正園、活動中心南側、生態池、外圍街道行道樹）
  for (let i = 0; i < allTrees.length && selectedTreeMagpies.length < 28; i++) {
    // 偽亂數挑選樹木以均勻遍歷全校各區
    const candidateIdx = (i * 19 + 7) % allTrees.length;
    const [tpx, tpy, tr, tone] = allTrees[candidateIdx];

    // 檢查與已選取藍鵲之樹木間距，過近則跳過，確保絕對零散
    let tooClose = false;
    for (const sel of selectedTreeMagpies) {
      const dx = tpx - sel.tpx;
      const dy = tpy - sel.py;
      if (dx * dx + dy * dy < MIN_DIST_SQ) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // 計算該樹木之精準樹幹高度與樹冠半徑
    const crownR = Math.max(1.5, Math.min(6, tr * SCALE));
    const rand = treeRand(tpx, tpy, 1);
    const trunkH = crownR * (1.1 + rand * 0.35) + 0.6;
    const crownH = crownR * (0.95 + treeRand(tpx, tpy, 2) * 0.2);

    // 嚴格設置在「樹木上層枝枒外緣」（高度 5.2m ~ 8.5m，100% 在樹上，絕不在地面）
    const ang = treeRand(tpx, tpy, 15) * Math.PI * 2;
    const branchDist = crownR * (0.65 + treeRand(tpx, tpy, 16) * 0.2);
    const wx = pxToWorldX(tpx) + Math.cos(ang) * branchDist;
    const wz = pyToWorldZ(tpy) + Math.sin(ang) * branchDist;
    const birdY = trunkH + crownH * (0.48 + treeRand(tpx, tpy, 17) * 0.22); // 樹梢中上部開闊枝枒

    selectedTreeMagpies.push({
      tpx, py: tpy, wx, wz, birdY,
      yaw: ang + Math.PI / 2 + (treeRand(tpx, tpy, 18) - 0.5) * 0.5
    });
  }

  // 實體化所有零散樹上藍鵲
  selectedTreeMagpies.forEach((p) => {
    const m = createMagpieMesh();
    m.group.position.set(p.wx, p.birdY, p.wz);
    m.group.rotation.y = p.yaw;
    details3DGroup.add(m.group);

    animatedAnimals.magpies.push({
      ...m,
      wx: p.wx, wz: p.wz,
      baseY: p.birdY,
      seed: Math.random() * 100
    });
  });
}

// === 運動學生與校園道路漫步師生 NPC 群（零散分佈，拒絕群聚） ===
function buildCampusSportsAndWalkwayNPCs() {
  // 1. 共用材質定義
  const uniformShirtMat = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.5 });
  const uniformPantsMat = new THREE.MeshStandardMaterial({ color: 0x182a44, roughness: 0.65 });
  const uniformSkirtMat = new THREE.MeshStandardMaterial({ color: 0x1a2e4c, roughness: 0.65 });

  const peBlueShirtMat = new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.45 });
  const peOrangeShirtMat = new THREE.MeshStandardMaterial({ color: 0xf4511e, roughness: 0.45 });
  const peWhiteShirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const peShortsNavyMat = new THREE.MeshStandardMaterial({ color: 0x0f1c2e, roughness: 0.7 });

  const teacherShirtMat = new THREE.MeshStandardMaterial({ color: 0xd8e6f3, roughness: 0.55 });
  const teacherPoloMat = new THREE.MeshStandardMaterial({ color: 0xf0dfcf, roughness: 0.6 });
  const teacherPantsMat = new THREE.MeshStandardMaterial({ color: 0x333b47, roughness: 0.7 });

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf7c4a1, roughness: 0.65 });
  const hairBlackMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.8 });
  const hairBrownMat = new THREE.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.8 });

  const bagNavyMat = new THREE.MeshStandardMaterial({ color: 0x1a334f, roughness: 0.6 });
  const briefcaseMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1d, roughness: 0.5 });
  const binderMat = new THREE.MeshStandardMaterial({ color: 0x2e6aa8, roughness: 0.4 });

  const basketballMat = new THREE.MeshStandardMaterial({ color: 0xdf5b12, roughness: 0.55 });
  const volleyballMat = new THREE.MeshStandardMaterial({ color: 0xf0e68c, roughness: 0.4 });

  // 人形產生器
  function createHumanoid({
    gender = 'boy',
    role = 'student_walk',
    poseType = 'walk',
    shirtMat = uniformShirtMat,
    bottomMat = uniformPantsMat,
    hairColor = 'black',
    hasBag = true,
    hasBriefcase = false,
    hasBinder = false
  }) {
    const root = new THREE.Group();

    // 軀幹 (Torso)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.24), shirtMat);
    torso.position.set(0, 0.98, 0);
    torso.castShadow = true;
    root.add(torso);

    // 女學生百褶裙
    if (gender === 'girl' && role === 'student_walk') {
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.30, 8), uniformSkirtMat);
      skirt.position.set(0, 0.66, 0);
      skirt.castShadow = true;
      root.add(skirt);
    }

    // 頸部
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.10, 8), skinMat);
    neck.position.set(0, 1.28, 0);
    root.add(neck);

    // 頭部組件
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.44, 0);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // 頭髮
    const hairM = hairColor === 'brown' ? hairBrownMat : hairBlackMat;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.26), hairM);
    hair.position.set(0, 0.08, 0);
    headGroup.add(hair);

    if (gender === 'girl') {
      const ponytail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), hairM);
      ponytail.position.set(0, 0.02, -0.16);
      ponytail.rotation.x = -0.25;
      headGroup.add(ponytail);
    }
    root.add(headGroup);

    // 配件
    if (hasBag) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.40, 0.16), bagNavyMat);
      bag.position.set(0, 1.00, -0.18);
      bag.castShadow = true;
      root.add(bag);
    }
    if (hasBriefcase) {
      const bcase = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.36), briefcaseMat);
      bcase.position.set(0.34, 0.68, 0.05);
      bcase.castShadow = true;
      root.add(bcase);
    }
    if (hasBinder) {
      const binder = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.30, 0.24), binderMat);
      binder.position.set(-0.28, 1.02, 0.12);
      binder.rotation.z = 0.25;
      root.add(binder);
    }

    // 四肢 Pivot 關節建構
    function makePivot(x, y, z, w, h, d, mat) {
      const p = new THREE.Group();
      p.position.set(x, y, z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(0, -h / 2, 0);
      m.castShadow = true;
      p.add(m);
      root.add(p);
      return p;
    }

    const leftArm = makePivot(-0.31, 1.24, 0, 0.14, 0.50, 0.14, shirtMat);
    const rightArm = makePivot(0.31, 1.24, 0, 0.14, 0.50, 0.14, shirtMat);
    const leftLeg = makePivot(-0.13, 0.70, 0, 0.16, 0.68, 0.16, bottomMat);
    const rightLeg = makePivot(0.13, 0.70, 0, 0.16, 0.68, 0.16, bottomMat);

    // 姿態微調
    if (poseType === 'pass') {
      leftArm.rotation.x = -0.75;
      rightArm.rotation.x = -0.75;
      leftArm.rotation.z = -0.22;
      rightArm.rotation.z = 0.22;
      leftLeg.rotation.x = -0.35;
      rightLeg.rotation.x = -0.35;
    } else if (poseType === 'shoot') {
      rightArm.rotation.x = -2.4;
      leftArm.rotation.x = -1.8;
      leftLeg.rotation.x = 0.25;
      rightLeg.rotation.x = 0.25;
    } else if (poseType === 'dribble') {
      rightArm.rotation.x = -0.65;
      leftArm.rotation.x = 0.45;
      leftLeg.rotation.x = -0.4;
      rightLeg.rotation.x = 0.4;
    } else if (poseType === 'stretch') {
      leftLeg.rotation.x = -0.7;
      rightLeg.rotation.x = 0.8;
      leftArm.rotation.x = -0.3;
      rightArm.rotation.x = -0.3;
    }

    return { root, headGroup, leftArm, rightArm, leftLeg, rightLeg };
  }

  // === 零散分佈：田徑場運動學生（400 公尺超大範圍均勻散佈 17 人：跑道跑者 10 人、中央草坪足球與伸展 7 人）===
  const trackAthletes = [
    // 1. 北直線跑道（py: 132，X 朝東配速跑，前後間隔約 30～40 公尺）
    { px: 320, py: 132, yaw: Math.PI / 2, shirt: peBlueShirtMat, role: 'runner', pose: 'run', name: '田徑隊同學（北跑道節奏跑）', dialog: '北跑道視野真好，維持每圈 80 秒配速！' },
    { px: 410, py: 132, yaw: Math.PI / 2, shirt: peWhiteShirtMat, role: 'runner', pose: 'run', name: '體育班學長（北跑道均速跑）', dialog: '呼吸要兩吸一呼，步伐自然邁開！' },
    { px: 505, py: 132, yaw: Math.PI / 2, shirt: peOrangeShirtMat, role: 'runner', pose: 'run', name: '高二田徑隊員（北跑道衝刺練習）', dialog: '最後一百公尺核心收緊，全力加速！' },

    // 2. 南直線跑道（py: 444，X 朝西跑步，前後間隔約 30～40 公尺）
    { px: 515, py: 444, yaw: -Math.PI / 2, shirt: peOrangeShirtMat, role: 'runner', pose: 'run', name: '長跑社同學（南跑道晨跑）', dialog: '早晨空氣清新，已經跑完第五圈了。' },
    { px: 415, py: 444, yaw: -Math.PI / 2, shirt: peBlueShirtMat, role: 'runner', pose: 'run', name: '體育課學生（南跑道慢跑測驗）', dialog: '還有兩圈，穩住配速就能拿滿分！' },
    { px: 315, py: 444, yaw: -Math.PI / 2, shirt: peWhiteShirtMat, role: 'runner', pose: 'run', name: '高一新生（南跑道自主練習）', dialog: '藍色 PU 跑道跑起來彈性真好，膝蓋完全不吃力。' },

    // 3. 西側半圓彎道（沿彎道切線方向）
    { px: 238, py: 235, yaw: 0.35, shirt: peBlueShirtMat, role: 'runner', pose: 'run', name: '短跑選手（西彎道入彎）', dialog: '入彎道身體重心要微向內傾斜！' },
    { px: 242, py: 345, yaw: -0.35, shirt: peOrangeShirtMat, role: 'runner', pose: 'run', name: '長跑隊員（西彎道出彎）', dialog: '彎道維持步伐節奏，出彎馬上順勢擺臂！' },

    // 4. 東側半圓彎道（沿彎道切線方向）
    { px: 586, py: 235, yaw: Math.PI - 0.35, shirt: peWhiteShirtMat, role: 'runner', pose: 'run', name: '田徑學妹（東彎道入彎）', dialog: '跟著前方的節奏，慢慢將速度提上來！' },
    { px: 582, py: 345, yaw: Math.PI + 0.35, shirt: peBlueShirtMat, role: 'runner', pose: 'run', name: '體育生（東彎道調整）', dialog: '維持住擺臂幅度，調整呼吸節奏！' },

    // 5. 中央草坪足球傳接小組 A（西側草坪）
    { px: 350, py: 260, yaw: 0.8, shirt: peBlueShirtMat, role: 'soccer', pose: 'dribble', name: '足球隊隊長（草坪短傳練習）', dialog: '注意右腳內側推傳球的準確度！' },
    { px: 385, py: 285, yaw: 0.8 - Math.PI, shirt: peWhiteShirtMat, role: 'soccer', pose: 'dribble', name: '足球隊隊員（草坪迎球接應）', dialog: '球傳得恰到好處，直接迎球推傳回去！' },

    // 6. 中央草坪足球傳接小組 B（東側草坪）
    { px: 450, py: 300, yaw: -0.7, shirt: peOrangeShirtMat, role: 'soccer', pose: 'dribble', name: '足球社同學（草坪長傳策應）', dialog: '看好落點，長傳前場空檔！' },
    { px: 485, py: 325, yaw: -0.7 + Math.PI, shirt: peBlueShirtMat, role: 'soccer', pose: 'dribble', name: '足球社社員（停球抽射練習）', dialog: '胸口停球順勢起腳，完美控球！' },

    // 7. 中央草坪角隅伸展與體能暖身同學
    { px: 410, py: 225, yaw: 0, shirt: peOrangeShirtMat, role: 'stretcher', pose: 'stretch', name: '長跑選手（草坪壓腿伸展）', dialog: '跑完一定要徹底拉伸小腿與大腿肌群。' },
    { px: 415, py: 350, yaw: Math.PI, shirt: peWhiteShirtMat, role: 'stretcher', pose: 'stretch', name: '體育班同學（草坪弓箭步熱身）', dialog: '充分熱身能有效預防運動傷害！' },
    { px: 340, py: 320, yaw: 0.5, shirt: peBlueShirtMat, role: 'runner', pose: 'run', name: '田徑學員（草坪高抬腿暖身）', dialog: '原地高抬腿暖身，啟動核心肌群！' }
  ];

  trackAthletes.forEach((cfg) => {
    const isStretch = cfg.role === 'stretcher';
    const isSoccer = cfg.role === 'soccer';
    const isRunner = cfg.role === 'runner';
    const h = createHumanoid({
      role: cfg.role,
      poseType: cfg.pose,
      shirtMat: cfg.shirt,
      bottomMat: peShortsNavyMat,
      hasBag: false
    });
    const wx = pxToWorldX(cfg.px);
    const wz = pyToWorldZ(cfg.py);
    h.root.position.set(wx, 0.35, wz);
    h.root.rotation.y = cfg.yaw;
    details3DGroup.add(h.root);

    campusNpcs.sports.push({
      ...h,
      role: cfg.role,
      wx, wz,
      baseY: 0.35,
      speed: isRunner ? 0.016 : (isSoccer ? 0.008 : 0.005),
      amp: isRunner ? 0.85 : 0.35,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: cfg.dialog
    });
  });

  // 草坪足球兩顆（黑白斑紋皮革質感）
  function createCampusSoccerBall(px, py, y = 0.22) {
    const ballGroup = new THREE.Group();
    const wx = pxToWorldX(px);
    const wz = pyToWorldZ(py);
    ballGroup.position.set(wx, y, wz);
    const baseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.35 })
    );
    baseMesh.castShadow = true;
    ballGroup.add(baseMesh);

    const patchMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    const patches = [
      [0, 0.19, 0],
      [0.15, 0.07, 0.09],
      [-0.15, 0.07, 0.09],
      [0, 0.07, -0.18],
      [0.10, -0.13, 0.10],
      [-0.10, -0.13, 0.10]
    ];
    patches.forEach(([pxOff, pyOff, pzOff]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), patchMat);
      p.position.set(pxOff, pyOff, pzOff);
      p.lookAt(pxOff * 2, pyOff * 2, pzOff * 2);
      ballGroup.add(p);
    });
    details3DGroup.add(ballGroup);
  }
  createCampusSoccerBall(367, 272);
  createCampusSoccerBall(467, 312);

  // === 零散分佈：排球場（分佈於第 1、2、4 面球場及看台，共 10 人，避免單一場地扎堆）===
  const vbCourt = [
    // 1. 第 1 面球場（py: 189.5，雙人基礎墊球對傳練習）
    { px: 835, py: 189.5, y: 0.35, yaw: 0, pose: 'pass', shirt: peWhiteShirtMat, role: 'volleyball', name: '排球隊高一隊員（北半場低手墊球）', dialog: '膝蓋微彎重心壓低，手臂打平成平面！' },
    { px: 853, py: 189.5, y: 0.35, yaw: Math.PI, pose: 'pass', shirt: peBlueShirtMat, role: 'volleyball', name: '排球隊同學（南半場對傳練習）', dialog: '墊球弧度很好，繼續保持穩定對傳！' },

    // 2. 第 2 面球場（py: 250.0，4 人實戰扣球攔網攻防）
    { px: 839, py: 250.0, y: 1.15, isAir: true, yaw: 0, pose: 'shoot', shirt: peOrangeShirtMat, role: 'volleyball', name: '排球隊主攻手（起跳暴扣）', dialog: '看準二傳舉球最高點，全力扣殺！' },
    { px: 835, py: 247.0, y: 0.35, yaw: 0.35, pose: 'pass', shirt: peWhiteShirtMat, role: 'volleyball', name: '排球隊舉球員（精準二傳托球）', dialog: '托球到位，抓好起跳節奏！' },
    { px: 849, py: 250.0, y: 0.85, isAir: true, yaw: Math.PI, pose: 'shoot', shirt: peBlueShirtMat, role: 'volleyball', name: '副攻手（前排雙手攔網）', dialog: '雙手伸直封死直線球路！' },
    { px: 856, py: 252.0, y: 0.35, yaw: Math.PI, pose: 'pass', shirt: peOrangeShirtMat, role: 'volleyball', name: '自由球員（後排救球防守）', dialog: '後排我包辦，隨時準備補位魚躍！' },

    // 3. 第 4 面球場（py: 370.0，發球與接球陣型練習）
    { px: 825, py: 370.0, y: 0.35, yaw: 0, pose: 'pass', shirt: peBlueShirtMat, role: 'volleyball', name: '發球選手（端線跳躍發球）', dialog: '盯準底角落點，發出強勁平衝球！' },
    { px: 853, py: 366.0, y: 0.35, yaw: Math.PI, pose: 'pass', shirt: peWhiteShirtMat, role: 'volleyball', name: '接發手 A（重心降低接發）', dialog: '這球帶著強烈旋轉，手腕一定要繃緊！' },
    { px: 853, py: 374.0, y: 0.35, yaw: Math.PI, pose: 'pass', shirt: peBlueShirtMat, role: 'volleyball', name: '接發手 B（後排協防呼應）', dialog: '我來！交給我處理！' },

    // 4. 水泥階梯看台場邊（休息與計分補給同學）
    { px: 775, py: 420.0, y: 0.85, yaw: Math.PI / 2, pose: 'stretch', shirt: peWhiteShirtMat, role: 'stretcher', name: '排球社經理（看台計分與補給）', dialog: '大家練習辛苦了，場邊隨時有毛巾與運動飲料！' }
  ];

  vbCourt.forEach((cfg) => {
    const h = createHumanoid({
      role: cfg.role,
      poseType: cfg.pose,
      shirtMat: cfg.shirt,
      bottomMat: peShortsNavyMat,
      hasBag: false
    });
    const wx = pxToWorldX(cfg.px);
    const wz = pyToWorldZ(cfg.py);
    h.root.position.set(wx, cfg.y, wz);
    h.root.rotation.y = cfg.yaw;
    details3DGroup.add(h.root);

    campusNpcs.sports.push({
      ...h,
      role: cfg.role,
      wx, wz,
      baseY: cfg.y,
      isAir: !!cfg.isAir,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: cfg.dialog
    });
  });

  // 三面活躍排球場之空中排球
  const vbBallPositions = [
    { px: 844, py: 189.5, y: 2.10 },
    { px: 842, py: 250.0, y: 2.75 },
    { px: 838, py: 368.5, y: 2.35 }
  ];
  vbBallPositions.forEach((bPos) => {
    const vb = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), volleyballMat);
    vb.position.set(pxToWorldX(bPos.px), bPos.y, pyToWorldZ(bPos.py));
    vb.castShadow = true;
    details3DGroup.add(vb);
  });

  // === 零散分佈：籃球場（分佈於 4 面球場，共 12 人：半場鬥牛 4 人、跳投卡位 3 人、快攻上籃 3 人、罰球與休息 2 人）===
  const bbCourt = [
    // 1. 西區中央球場（px: 950, py: 225，2 on 2 激烈鬥牛）
    { px: 943, py: 225, y: 0.35, yaw: 0.5, pose: 'dribble', shirt: peOrangeShirtMat, role: 'basketball_dribble', name: '籃球隊控球後衛（胯下運球變向切入）', dialog: '看我的急停變向，拉開防守身位！' },
    { px: 947, py: 226, y: 0.35, yaw: -2.6, pose: 'pass', shirt: peBlueShirtMat, role: 'volleyball', name: '得分後衛（外線貼身嚴防）', dialog: '休想輕易切入禁區，看緊你的突破路線！' },
    { px: 938, py: 220, y: 0.35, yaw: 0.25, pose: 'dribble', shirt: peWhiteShirtMat, role: 'basketball_dribble', name: '射手學長（底角空檔要球）', dialog: '這裡有大空檔，隨時準備外線出手！' },
    { px: 954, py: 224, y: 0.35, yaw: -1.8, pose: 'pass', shirt: peBlueShirtMat, role: 'volleyball', name: '大前鋒（禁區要位單打）', dialog: '把球吊進來，內線優勢在我！' },

    // 2. 西區北側球場（px: 950, py: 165，三分跳投與卡位練習）
    { px: 937, py: 165, y: 1.25, isAir: true, yaw: 0, pose: 'shoot', shirt: peBlueShirtMat, role: 'basketball', name: '三分射手（外線拔起跳投）', dialog: '手腕完美跟隨動作，這球必進！' },
    { px: 958, py: 165, y: 0.35, yaw: Math.PI, pose: 'pass', shirt: peOrangeShirtMat, role: 'volleyball', name: '中鋒學弟（籃下卡位衝搶籃板）', dialog: '擋人卡位，籃板球是我的！' },
    { px: 947, py: 161, y: 0.35, yaw: -1.3, pose: 'pass', shirt: peWhiteShirtMat, role: 'volleyball', name: '前鋒同學（罰球線策應傳導）', dialog: '球流動起來，製造最好的出手時機！' },

    // 3. 東區南側球場（px: 1055, py: 285，快攻反擊上籃）
    { px: 1063, py: 285, y: 1.35, isAir: true, yaw: 0, pose: 'shoot', shirt: peOrangeShirtMat, role: 'basketball', name: '快攻前鋒（三步歐洲步騰空挑籃）', dialog: '反擊快攻，空中換手挑籃！' },
    { px: 1053, py: 286, y: 0.35, yaw: 0.1, pose: 'run', role: 'runner', shirt: peBlueShirtMat, name: '防守後衛（全速回防干擾）', dialog: '全力回防，追上去封蓋！' },
    { px: 1042, py: 283, y: 0.35, yaw: 0.25, pose: 'pass', shirt: peWhiteShirtMat, role: 'volleyball', name: '後衛同學（後場精準長傳推進）', dialog: '一箭穿心長傳，好球！' },

    // 4. 東區北側球場（px: 1055, py: 165，定點罰球與場邊放鬆）
    { px: 1050, py: 165, y: 0.35, yaw: 0, pose: 'pass', shirt: peWhiteShirtMat, role: 'volleyball', name: '副隊長（定點罰球練習）', dialog: '深呼吸兩次，維持穩定出手手感！' },
    { px: 1033, py: 160, y: 0.35, yaw: 0.7, pose: 'stretch', shirt: peBlueShirtMat, role: 'stretcher', name: '體育課同學（場邊休息補充水分）', dialog: '打了一節全場好過癮，休息一下再戰！' }
  ];

  bbCourt.forEach((cfg) => {
    const isRunner = cfg.role === 'runner';
    const h = createHumanoid({
      role: cfg.role,
      poseType: cfg.pose,
      shirtMat: cfg.shirt,
      bottomMat: peShortsNavyMat,
      hasBag: false
    });
    const wx = pxToWorldX(cfg.px);
    const wz = pyToWorldZ(cfg.py);
    h.root.position.set(wx, cfg.y, wz);
    h.root.rotation.y = cfg.yaw;
    details3DGroup.add(h.root);

    campusNpcs.sports.push({
      ...h,
      role: cfg.role,
      wx, wz,
      baseY: cfg.y,
      isAir: !!cfg.isAir,
      speed: isRunner ? 0.016 : 0.008,
      amp: isRunner ? 0.85 : 0.35,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: cfg.dialog
    });
  });

  // 四顆籃球（運球、跳投飛行、挑籃與罰球定位）
  const bbBallPositions = [
    { px: 944, py: 225, y: 0.58 },
    { px: 946, py: 165, y: 2.85 },
    { px: 1064, py: 285, y: 2.65 },
    { px: 1051, py: 166, y: 0.24 }
  ];
  bbBallPositions.forEach((bPos) => {
    const bb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), basketballMat);
    bb.position.set(pxToWorldX(bPos.px), bPos.y, pyToWorldZ(bPos.py));
    bb.castShadow = true;
    details3DGroup.add(bb);
  });

  // === 零散分佈：校園主要道路（全校各大動線僅零散 10 位師生，彼此間隔 50～80 公尺）===
  const walkwayNPCConfigs = [
    // 1. 校門迎賓大道寬闊路面（1 位學生）
    {
      px: 1035, py: 850, yaw: -0.2, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '中正高中 同學', dialog: '早安！今天第一節課在中正樓，得快點走！'
    },
    // 2. 警衛室旁通道（1 位老師走向行政樓）
    {
      px: 1010, py: 790, yaw: -0.15, gender: 'boy', role: 'teacher_walk',
      shirt: teacherShirtMat, bottom: teacherPantsMat, hasBriefcase: true,
      name: '教務處 英文科老師', dialog: '同學早安！今天第一節在 214 教室上課喔！'
    },
    // 3. 中正樓穿堂入口台階（1 位女同學步入）
    {
      px: 980, py: 730, yaw: -0.3, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '中正高中 女同學', dialog: '等等要在穿堂公布社團聯展的排練時間表。'
    },
    // 4. 中正園環道石徑（1 位同學漫步）
    {
      px: 930, py: 660, yaw: 0.8, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '高二 同學', dialog: '中正園圓形草坪大榕樹上看到臺灣藍鵲飛過，尾羽好長！'
    },
    // 5. 中美堂前空曠林蔭路（1 位體育老師慢步巡視）
    {
      px: 890, py: 620, yaw: 0.1, gender: 'boy', role: 'teacher_walk',
      shirt: peBlueShirtMat, bottom: peShortsNavyMat, hasBinder: true,
      name: '體育組 老師', dialog: '同學早，進入運動場地記得遵守各項安全規定！'
    },
    // 6. 圖書館前寬闊廣場（1 位同學抱書前行）
    {
      px: 1130, py: 450, yaw: 0.5, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '圖書館 研讀同學', dialog: '剛借了參考書，準備去五樓自習室專心讀書。'
    },
    // 7. 活動中心前廣場側邊（1 位女同學走過花台）
    {
      px: 1175, py: 485, yaw: 1.8, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '社聯會 幹部同學', dialog: '今天下午活動中心大禮堂有公演彩排！'
    },
    // 8. 至聖樓與格致樓間廊道（1 位同學快步走過）
    {
      px: 1060, py: 650, yaw: -0.9, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '自然實驗班 同學', dialog: '正要去格致樓三樓專科實驗室上物理實驗課。'
    },
    // 9. 生態池木棧道旁（1 位生物研究社同學觀察生態）
    {
      px: 710, py: 700, yaw: 1.4, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '生物研究社 同學', dialog: '生態池旁的樹上常有臺灣藍鵲築巢，環境生態維持得真好！'
    },
    // 10. 大花圃石階旁（1 位同學散步）
    {
      px: 780, py: 540, yaw: -0.6, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '高一 新生同學', dialog: '大花圃老榕樹的氣根好壯觀，坐在這乘涼真舒服。'
    }
  ];

  walkwayNPCConfigs.forEach((cfg) => {
    const h = createHumanoid({
      gender: cfg.gender,
      role: cfg.role,
      poseType: 'walk',
      shirtMat: cfg.shirt,
      bottomMat: cfg.bottom,
      hasBag: !!cfg.hasBag,
      hasBriefcase: !!cfg.hasBriefcase,
      hasBinder: !!cfg.hasBinder
    });
    const wx = pxToWorldX(cfg.px);
    const wz = pyToWorldZ(cfg.py);
    h.root.position.set(wx, 0.35, wz);
    h.root.rotation.y = cfg.yaw;
    details3DGroup.add(h.root);

    campusNpcs.walkway.push({
      ...h,
      wx, wz,
      baseY: 0.35,
      speed: 0.009,
      amp: 0.45,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: cfg.dialog
    });
  });
}

// === 214 教室傳奇光芒：自天際傾瀉而下的金色神聖光柱 (Heavenly Sunbeam)、金黃能量光暈 (Golden Aura) 與飄浮星屑 ===
function buildClassroom214HeavenlyAura() {
  // 精準計算中正樓 5F 214 教室在 3D 場景中的世界座標
  // 中正樓主量體 px: 896, py: 530, pw: 56, ph: 230，5F 214 教室中心約在 px: 924, py: 563.3
  const c214X = pxToWorldX(924);
  const c214Z = pyToWorldZ(563.3);
  const c214BaseY = 14.4;    // 5F 樓地板
  const c214CenterY = 16.2;  // 5F 教室室內中心
  const c214RoofY = 18.25;   // 5F 屋頂面

  const auraRoot = new THREE.Group();
  auraRoot.name = 'CLASSROOM_214_AURA';

  // 1. 金色天降神聖光柱 (Heavenly Sunbeam / God Ray)
  // 天空起點：Y = 175m，自東南天穹高處傾瀉而下，直達 214 教室屋頂
  const skyOrigin = new THREE.Vector3(c214X + 22.0, 175.0, c214Z + 18.0);
  const targetPoint = new THREE.Vector3(c214X, c214RoofY, c214Z);
  const beamVec = new THREE.Vector3().subVectors(targetPoint, skyOrigin);
  const beamLength = beamVec.length();
  const beamMid = new THREE.Vector3().addVectors(skyOrigin, targetPoint).multiplyScalar(0.5);
  const beamDir = beamVec.clone().normalize();

  // 漸變光束專屬紋理 (縱向漸變：極致柔和淡雅之丁達爾陽光灑落質感)
  const beamCanvas = document.createElement('canvas');
  beamCanvas.width = 64;
  beamCanvas.height = 512;
  const bCtx = beamCanvas.getContext('2d');
  const bGrad = bCtx.createLinearGradient(0, 0, 0, 512);
  bGrad.addColorStop(0.0, 'rgba(255, 248, 215, 0.0)');  // 天頂極淡微光
  bGrad.addColorStop(0.18, 'rgba(255, 238, 160, 0.06)'); // 輕柔半透明雲光
  bGrad.addColorStop(0.62, 'rgba(255, 225, 120, 0.16)'); // 中段淡淡溫暖金光
  bGrad.addColorStop(0.92, 'rgba(255, 235, 150, 0.24)'); // 降落點柔和光暈
  bGrad.addColorStop(1.0, 'rgba(255, 245, 190, 0.05)');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, 64, 512);

  const beamTex = new THREE.CanvasTexture(beamCanvas);
  beamTex.colorSpace = THREE.SRGBColorSpace;

  // 1a. 雙層體積光圓錐光柱：外層擴散淡金光束 (Outer Beam)
  const outerGeo = new THREE.CylinderGeometry(3.2, 11.2, beamLength, 32, 1, true);
  const outerMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    color: 0xffe082,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const outerBeam = new THREE.Mesh(outerGeo, outerMat);
  outerBeam.position.copy(beamMid);
  outerBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDir);
  auraRoot.add(outerBeam);

  // 1b. 內層柔和核心光束 (Core Gentle Sunbeam)
  const coreGeo = new THREE.CylinderGeometry(1.4, 5.2, beamLength, 32, 1, true);
  const coreMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    color: 0xfff3b0,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const coreBeam = new THREE.Mesh(coreGeo, coreMat);
  coreBeam.position.copy(beamMid);
  coreBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDir);
  auraRoot.add(coreBeam);

  // 2. 214 教室周圍立體金黃色柔和光暈 (Soft Golden Aura Sphere & Subtle Rings)
  // 2a. 教室發光淡金色光罩球體 (包裹著 5F 214 教室，清透不遮蔽建物)
  const sphereGeo = new THREE.SphereGeometry(5.2, 24, 18);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xffca28,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const auraSphere = new THREE.Mesh(sphereGeo, sphereMat);
  auraSphere.position.set(c214X, c214CenterY + 0.6, c214Z);
  auraRoot.add(auraSphere);

  // 2b. 屋頂柔和光暈雙環 (淡雅光圈)
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: 0xffeb3b,
    transparent: true,
    opacity: 0.20,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 36), ringMat1);
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.set(c214X, c214RoofY + 0.12, c214Z);
  auraRoot.add(ring1);

  const ringMat2 = new THREE.MeshBasicMaterial({
    color: 0xffb300,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(5.0, 6.2, 36), ringMat2);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.set(c214X, c214RoofY + 0.15, c214Z);
  auraRoot.add(ring2);

  // 2c. 柔和金黃微醺點光源 (溫潤點綴中正樓 5F 女兒牆，不爆光)
  const auraLight = new THREE.PointLight(0xffe082, 0.9, 24, 2.0);
  auraLight.position.set(c214X, c214RoofY + 2.5, c214Z);
  auraRoot.add(auraLight);

  // 3. 飄浮淡金星屑粒子 (Subtle Golden Stardust Particles)
  const sparkles = [];
  const sparkleCount = 18;
  const sparkleMat = new THREE.MeshBasicMaterial({
    color: 0xfff9c4,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sparkleGeo = new THREE.DodecahedronGeometry(0.12, 0);

  for (let i = 0; i < sparkleCount; i++) {
    const pMesh = new THREE.Mesh(sparkleGeo, sparkleMat);
    const rad = 1.2 + Math.random() * 6.5;
    const ang = Math.random() * Math.PI * 2;
    const initY = c214RoofY + Math.random() * 38.0;
    pMesh.position.set(c214X + Math.cos(ang) * rad, initY, c214Z + Math.sin(ang) * rad);
    auraRoot.add(pMesh);
    sparkles.push({
      mesh: pMesh,
      baseRadius: rad,
      angle: ang,
      speedY: 0.04 + Math.random() * 0.07,
      rotSpeed: 0.02 + Math.random() * 0.04,
      minY: c214RoofY,
      maxY: c214RoofY + 45.0
    });
  }

  details3DGroup.add(auraRoot);

  // 4. 註冊全域動畫控制器
  classroom214AuraAnim = {
    outerBeam,
    coreBeam,
    auraSphere,
    ring1,
    ring2,
    auraLight,
    sparkles,
    c214X,
    c214Z,
    c214RoofY
  };
}

// ==========================================
// 聖誕節日歡慶氣氛模組 (Christmas Holiday Atmosphere)
// 包含：全校飄雪粒子系統、迎賓廣場巨型立體聖誕樹、樹下精緻禮物盒、
// 伯利恆之星、閃爍彩燈、大門穿堂聖誕花圈、214 教室專屬雪人與花圈
// ==========================================

function buildChristmasAtmosphere() {
  const cGroup = xmasDecorationsGroup;

  // 1. 全校飄雪粒子系統 (Snowfall Particles)
  const snowCount = 2800;
  const snowGeo = new THREE.BufferGeometry();
  const snowPositions = new Float32Array(snowCount * 3);
  const snowVelocities = new Float32Array(snowCount * 3);
  const snowPhases = new Float32Array(snowCount);

  // 柔軟發光圓潤雪花貼圖 (Canvas 繪製，無外部圖檔依賴)
  const sCanvas = document.createElement('canvas');
  sCanvas.width = 64;
  sCanvas.height = 64;
  const sCtx = sCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(240, 248, 255, 0.85)');
  grad.addColorStop(0.7, 'rgba(215, 235, 255, 0.35)');
  grad.addColorStop(1.0, 'rgba(215, 235, 255, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.beginPath();
  sCtx.arc(32, 32, 30, 0, Math.PI * 2);
  sCtx.fill();

  const snowTex = new THREE.CanvasTexture(sCanvas);
  snowTex.colorSpace = THREE.SRGBColorSpace;

  const wSpread = WORLD_W * 1.15;
  const dSpread = WORLD_D * 1.15;

  for (let i = 0; i < snowCount; i++) {
    snowPositions[i * 3 + 0] = (Math.random() - 0.5) * wSpread;
    snowPositions[i * 3 + 1] = Math.random() * 88 + 0.5;
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * dSpread;

    snowVelocities[i * 3 + 0] = (Math.random() - 0.5) * 0.9;
    snowVelocities[i * 3 + 1] = 2.2 + Math.random() * 3.2; // 柔和下落速度
    snowVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
    snowPhases[i] = Math.random() * Math.PI * 2;
  }

  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));

  const snowMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.3,
    map: snowTex,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const snowMesh = new THREE.Points(snowGeo, snowMat);
  snowMesh.name = 'CAMPUS_SNOW_PARTICLES';
  cGroup.add(snowMesh);

  // 2. 迎賓廣場巨型立體聖誕樹 (Grand Christmas Tree)
  // 位置設在迎賓廣場開闊處：px: 985, py: 780，視線焦點開朗大器
  const treeX = pxToWorldX(985);
  const treeZ = pyToWorldZ(780);

  const treeGroup = new THREE.Group();
  treeGroup.position.set(treeX, 0, treeZ);

  // 2a. 紅金雙色立體圓形樹裙 (Tree Skirt)
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.75 });
  const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.5, 0.22, 36), skirtMat);
  skirtMesh.position.y = 0.11;
  skirtMesh.receiveShadow = true;
  treeGroup.add(skirtMesh);

  // 樹裙外緣金邊刺繡環
  const goldBorderMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
  const goldRing = new THREE.Mesh(new THREE.TorusGeometry(7.35, 0.12, 12, 48), goldBorderMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.23;
  treeGroup.add(goldRing);

  // 2b. 實木粗壯樹幹 (Tree Trunk)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.92 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.98, 2.6, 16), trunkMat);
  trunk.position.y = 1.3;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  // 2c. 四層漸進深綠立體松樹冠與波浪積雪霜邊 (Snow-Frosted Foliage Tiers)
  const foliageColors = [0x194d28, 0x1d582f, 0x226435, 0x27703c];
  const snowFrostMat = new THREE.MeshStandardMaterial({ color: 0xf5f8fa, roughness: 0.45, metalness: 0.05 });
  const tiers = [
    { botR: 4.8, topR: 1.4, h: 3.6, y: 3.4, cIdx: 0 },
    { botR: 3.8, topR: 1.0, h: 3.2, y: 5.8, cIdx: 1 },
    { botR: 2.8, topR: 0.6, h: 2.7, y: 8.0, cIdx: 2 },
    { botR: 1.8, topR: 0.0, h: 2.3, y: 10.0, cIdx: 3 }
  ];

  tiers.forEach((t) => {
    const tierMat = new THREE.MeshStandardMaterial({ color: foliageColors[t.cIdx], roughness: 0.72 });
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(t.topR, t.botR, t.h, 24), tierMat);
    cone.position.y = t.y;
    cone.castShadow = true;
    cone.receiveShadow = true;
    treeGroup.add(cone);

    // 樹冠底緣立體白雪霜邊
    const snowRim = new THREE.Mesh(new THREE.TorusGeometry(t.botR + 0.05, 0.22, 10, 32), snowFrostMat);
    snowRim.rotation.x = Math.PI / 2;
    snowRim.position.y = t.y - t.h * 0.48;
    snowRim.castShadow = true;
    treeGroup.add(snowRim);
  });

  // 2d. 樹頂雙重立體八角「伯利恆之星」 (Christmas Bethlehem Star)
  const starGroup = new THREE.Group();
  starGroup.position.y = 11.6;
  const starGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.85,
    roughness: 0.2,
    emissive: 0xffae19,
    emissiveIntensity: 0.35
  });

  const rShape = new THREE.Shape();
  rShape.moveTo(0, 1.1);
  rShape.lineTo(0.35, 0.35);
  rShape.lineTo(1.1, 0);
  rShape.lineTo(0.35, -0.35);
  rShape.lineTo(0, -1.1);
  rShape.lineTo(-0.35, -0.35);
  rShape.lineTo(-1.1, 0);
  rShape.lineTo(-0.35, 0.35);
  rShape.closePath();

  const starGeo = new THREE.ExtrudeGeometry(rShape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
  starGeo.center();
  const starMesh1 = new THREE.Mesh(starGeo, starGoldMat);
  starGroup.add(starMesh1);

  const starMesh2 = new THREE.Mesh(starGeo, starGoldMat);
  starMesh2.rotation.z = Math.PI / 4;
  starMesh2.scale.set(0.72, 0.72, 0.72);
  starGroup.add(starMesh2);

  const starLight = new THREE.PointLight(0xffe680, 1.4, 24, 1.8);
  starLight.position.y = 0.2;
  starGroup.add(starLight);

  treeGroup.add(starGroup);

  // 2e. 樹冠繽紛聖誕彩球裝飾 (Christmas Baubles)
  const baubleColors = [0xd63031, 0xf1c40f, 0x0984e3, 0xf5f6fa, 0x27ae60, 0x9b59b6];
  const baubleMats = baubleColors.map(c => new THREE.MeshStandardMaterial({ color: c, metalness: 0.82, roughness: 0.18 }));
  const baubleGeo = new THREE.SphereGeometry(0.24, 14, 14);

  const baubleCount = 52;
  for (let i = 0; i < baubleCount; i++) {
    const progress = (i / baubleCount);
    const tierY = 2.6 + progress * 7.5;
    const tierR = 4.4 * (1 - progress * 0.78);
    const angle = i * 2.39996;
    const bx = Math.cos(angle) * (tierR + 0.15);
    const bz = Math.sin(angle) * (tierR + 0.15);

    const bMesh = new THREE.Mesh(baubleGeo, baubleMats[i % baubleMats.length]);
    bMesh.position.set(bx, tierY, bz);
    bMesh.castShadow = true;
    treeGroup.add(bMesh);
  }

  // 2f. 螺旋環繞微光 LED 燈珠串 (Spiral Fairy Lights)
  const fairyLights = [];
  const fairyGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const fairyColors = [0xff4757, 0xffa502, 0x2ed573, 0x1e90ff, 0xffffff, 0xff6b81];
  const fairyMats = fairyColors.map(c => new THREE.MeshBasicMaterial({ color: c }));

  const fairyCount = 84;
  for (let i = 0; i < fairyCount; i++) {
    const fProg = i / fairyCount;
    const fY = 2.4 + fProg * 8.2;
    const fR = 4.6 * (1 - fProg * 0.82) + 0.18;
    const fAngle = fProg * Math.PI * 14;
    const fx = Math.cos(fAngle) * fR;
    const fz = Math.sin(fAngle) * fR;

    const fMat = fairyMats[i % fairyMats.length].clone();
    const fMesh = new THREE.Mesh(fairyGeo, fMat);
    fMesh.position.set(fx, fY, fz);
    treeGroup.add(fMesh);
    fairyLights.push({ mesh: fMesh, mat: fMat, baseColor: fairyColors[i % fairyColors.length], phase: i * 0.45 });
  }

  // 2g. 樹下彩色禮品盒堆 (Wrapped Gift Boxes)
  const giftConfigs = [
    { sx: 1.1, sy: 0.9, sz: 1.0, x: -2.4, z: 2.2, rotY: 0.35, boxColor: 0xd63031, ribColor: 0xf1c40f },
    { sx: 0.9, sy: 1.1, sz: 0.9, x: -1.2, z: 3.2, rotY: -0.2, boxColor: 0x27ae60, ribColor: 0xd63031 },
    { sx: 1.3, sy: 0.7, sz: 1.1, x: 1.8, z: 2.6, rotY: 0.8, boxColor: 0x0984e3, ribColor: 0xf5f6fa },
    { sx: 0.8, sy: 0.8, sz: 0.8, x: 2.8, z: 1.4, rotY: -0.5, boxColor: 0xf1c40f, ribColor: 0xd63031 },
    { sx: 1.0, sy: 0.95, sz: 1.0, x: 0.2, z: 3.6, rotY: 0.1, boxColor: 0x9b59b6, ribColor: 0xf1c40f },
    { sx: 0.75, sy: 0.7, sz: 0.75, x: -3.2, z: 0.8, rotY: 0.6, boxColor: 0xe67e22, ribColor: 0x27ae60 },
    { sx: 1.1, sy: 0.85, sz: 0.9, x: 2.2, z: -2.2, rotY: -0.4, boxColor: 0xd63031, ribColor: 0xf5f6fa }
  ];

  giftConfigs.forEach((g) => {
    const gBoxMat = new THREE.MeshStandardMaterial({ color: g.boxColor, roughness: 0.6 });
    const gRibMat = new THREE.MeshStandardMaterial({ color: g.ribColor, metalness: 0.4, roughness: 0.3 });

    const gMesh = new THREE.Mesh(new THREE.BoxGeometry(g.sx, g.sy, g.sz), gBoxMat);
    gMesh.position.set(g.x, 0.22 + g.sy / 2, g.z);
    gMesh.rotation.y = g.rotY;
    gMesh.castShadow = true;
    gMesh.receiveShadow = true;

    // 十字立體緞帶
    const ribX = new THREE.Mesh(new THREE.BoxGeometry(g.sx + 0.04, g.sy + 0.02, g.sz * 0.24), gRibMat);
    const ribZ = new THREE.Mesh(new THREE.BoxGeometry(g.sx * 0.24, g.sy + 0.02, g.sz + 0.04), gRibMat);
    gMesh.add(ribX);
    gMesh.add(ribZ);

    const bowMesh = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 8, 16), gRibMat);
    bowMesh.rotation.x = Math.PI / 2;
    bowMesh.position.y = g.sy / 2 + 0.08;
    gMesh.add(bowMesh);

    treeGroup.add(gMesh);
  });

  cGroup.add(treeGroup);

  // 3. 聖誕花圈產生器 (Christmas Wreaths)
  // 精準計算接觸面外法向與表面幾何，厚度嚴格向外凸出，100% 貼合牆面，零穿牆、零懸空
  function createWreath(radius = 1.25, tubeR = 0.22) {
    const wGroup = new THREE.Group();
    // 松枝圈 (TorusGeometry 預設垂直於 Z 軸)
    const wMat = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.85 });
    const wRing = new THREE.Mesh(new THREE.TorusGeometry(radius, tubeR, 12, 32), wMat);
    wRing.castShadow = true;
    wGroup.add(wRing);

    // 紅色大蝴蝶結緞帶 (置於正面 +Z 側，浮出 0.08m，完全不穿透後方貼牆接觸面)
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.5 });
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 10, 10), bowMat);
    bowCenter.position.set(0, -radius * 0.88, tubeR + 0.06);
    wGroup.add(bowCenter);

    const bowWing1 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.30, radius * 0.09, 8, 16), bowMat);
    bowWing1.position.set(-radius * 0.30, -radius * 0.88, tubeR + 0.06);
    bowWing1.rotation.y = -0.25;
    wGroup.add(bowWing1);

    const bowWing2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.30, radius * 0.09, 8, 16), bowMat);
    bowWing2.position.set(radius * 0.30, -radius * 0.88, tubeR + 0.06);
    bowWing2.rotation.y = 0.25;
    wGroup.add(bowWing2);

    // 雙金色鈴鐺 (懸於下方正面)
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.25 });
    [-0.14, 0.14].forEach((dx) => {
      const bell = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.16, radius * 0.26, 12), bellMat);
      bell.position.set(dx, -radius * 1.15, tubeR + 0.08);
      wGroup.add(bell);
    });

    // 點綴紅色冬青漿果
    for (let i = 0; i < 8; i++) {
      const bAng = i * (Math.PI * 2 / 8);
      const berry = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.08, 8, 8), bowMat);
      berry.position.set(Math.cos(bAng) * radius, Math.sin(bAng) * radius, tubeR + 0.04);
      wGroup.add(berry);
    }

    return wGroup;
  }

  // 掛載位置 1：中正樓挑空大穿堂正門上方（迎賓正面正中央）
  // 中正樓東立面 X = 63.06，花圈管徑 0.22m，貼合面 X = 63.30，門楣正中 Z = pyToWorldZ(645) = 28.35，Y = 5.8m
  const wreathZhongzheng = createWreath(1.35, 0.22);
  wreathZhongzheng.position.set(63.30, 5.80, pyToWorldZ(645));
  wreathZhongzheng.rotation.y = Math.PI / 2; // 面朝東方迎賓廣場，完全平貼中正樓大穿堂正門上方
  cGroup.add(wreathZhongzheng);

  // 掛載位置 2：校門口警衛室北外牆表面正中央（入校迎賓正面）
  // 警衛室北外牆 Z = 90.18，花圈管徑 0.18m，貼合面 Z = 89.98，法向量朝北 (-Z)
  const wreathGate = createWreath(0.95, 0.18);
  wreathGate.position.set(pxToWorldX(1030.5), 2.05, 89.98);
  wreathGate.rotation.y = 0; // 面朝北方迎賓車道，完全平貼北外牆表面
  cGroup.add(wreathGate);

  // 掛載位置 3：214 教室東外牆女兒牆表面（中正樓 5F 東立面）
  // 東外牆 X = 62.64，花圈管徑 0.16m，貼合面 X = 62.82，法向量朝東 (+X)
  const wreath214 = createWreath(0.85, 0.16);
  wreath214.position.set(62.82, 17.20, 6.29);
  wreath214.rotation.y = Math.PI / 2; // 面朝東方，完全平貼中正樓東外牆
  cGroup.add(wreath214);

  // 4. 214 教室外廊立體聖誕雪人 (位於露台外地板，嚴格不與牆面重疊)
  const snowmanGroup = new THREE.Group();
  snowmanGroup.position.set(58.5, 18.25, 6.29); // 位於 214 屋頂露台安全中心
  snowmanGroup.rotation.y = -Math.PI / 4;

  const snowBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fbfd, roughness: 0.45 });
  const bottomBall = new THREE.Mesh(new THREE.SphereGeometry(1.05, 18, 18), snowBodyMat);
  bottomBall.position.y = 1.0;
  bottomBall.castShadow = true;
  snowmanGroup.add(bottomBall);

  const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 16), snowBodyMat);
  headBall.position.y = 2.35;
  headBall.castShadow = true;
  snowmanGroup.add(headBall);

  const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6 });
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 16), hatMat);
  hatBrim.position.y = 2.92;
  snowmanGroup.add(hatBrim);

  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.82, 16), hatMat);
  hatTop.position.y = 3.35;
  snowmanGroup.add(hatTop);

  const bowMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.5 });
  const hatRib = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.16, 16), bowMat);
  hatRib.position.y = 3.02;
  snowmanGroup.add(hatRib);

  const carrotMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.5 });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 10), carrotMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.35, 0.85);
  snowmanGroup.add(nose);

  const coalMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.18, 0.18].forEach((dx) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), coalMat);
    eye.position.set(dx, 2.52, 0.65);
    snowmanGroup.add(eye);
  });

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.14, 8, 20), bowMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.82;
  snowmanGroup.add(scarf);

  cGroup.add(snowmanGroup);

  // 5. 【214 教室室內專屬聖誕佈置】：一株室內小聖誕樹 + 10 個大小不一精美包裝聖誕禮物盒
  // 精準定位於圖片 2 紅色線框內部地板 (Y = 14.4)，安全範圍 X: [56.2, 60.8]，Z: [4.0, 8.5]
  // 100% 位於 214 教室內部，徹底排除穿出西側外牆或北側外牆之懸空問題
  const c214FloorY = 14.4;

  // 5a. 214 教室室內一小株精緻聖誕樹 (Mini Indoor Christmas Tree)
  const miniTreeGroup = new THREE.Group();
  miniTreeGroup.position.set(58.2, c214FloorY, 5.0); // 位於 214 教室內部正中央

  const potMat = new THREE.MeshStandardMaterial({ color: 0x9e472a, roughness: 0.82 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.45, 16), potMat);
  pot.position.y = 0.225;
  pot.castShadow = true;
  miniTreeGroup.add(pot);

  const miniTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.6, 8), trunkMat);
  miniTrunk.position.y = 0.65;
  miniTreeGroup.add(miniTrunk);

  const miniFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.75 });
  const miniFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x276d3c, roughness: 0.72 });
  const miniTier1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.05, 16), miniFoliageMat1);
  miniTier1.position.y = 1.25;
  miniTier1.castShadow = true;
  miniTreeGroup.add(miniTier1);

  const miniTier2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 16), miniFoliageMat2);
  miniTier2.position.y = 1.75;
  miniTier2.castShadow = true;
  miniTreeGroup.add(miniTier2);

  const miniSnowRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.06, 8, 24), snowFrostMat);
  miniSnowRim.rotation.x = Math.PI / 2;
  miniSnowRim.position.y = 0.75;
  miniTreeGroup.add(miniSnowRim);

  const miniStarMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2, emissive: 0xffb300, emissiveIntensity: 0.3 });
  const miniStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), miniStarMat);
  miniStar.position.y = 2.25;
  miniTreeGroup.add(miniStar);

  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const mAngle = mIdx * (Math.PI * 2 / 12);
    const mY = 0.95 + (mIdx % 3) * 0.35;
    const mR = 0.75 - (mIdx % 3) * 0.18;
    const ballMat = baubleMats[mIdx % baubleMats.length];
    const miniBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ballMat);
    miniBall.position.set(Math.cos(mAngle) * mR, mY, Math.sin(mAngle) * mR);
    miniTreeGroup.add(miniBall);
  }

  const miniTreeLight = new THREE.PointLight(0xffe680, 0.75, 5.0);
  miniTreeLight.position.y = 2.25;
  miniTreeGroup.add(miniTreeLight);

  cGroup.add(miniTreeGroup);

  // 5b. 214 教室室內 10 個大小不一、包裝過的精美聖誕禮物盒
  // 精準分佈於雪人南側前方室內核心區域，各禮物盒嚴格分離無重疊，完全在室內地板上
  const roomGiftsConfig = [
    { id: 1,  sx: 0.75, sy: 0.70, sz: 0.70, x: 59.4, z: 5.2, rotY: 0.25,  boxColor: 0xd63031, ribColor: 0xf1c40f }, // 大號鮮紅金緞帶
    { id: 2,  sx: 0.60, sy: 0.80, sz: 0.60, x: 59.2, z: 4.0, rotY: -0.32, boxColor: 0x27ae60, ribColor: 0xd63031 }, // 高柱森林綠紅緞帶
    { id: 3,  sx: 0.75, sy: 0.38, sz: 0.75, x: 58.0, z: 6.4, rotY: 0.15,  boxColor: 0xf1c40f, ribColor: 0xffffff }, // 扁平皇家金白緞帶
    { id: 4,  sx: 0.55, sy: 0.55, sz: 0.55, x: 56.8, z: 6.0, rotY: -0.45, boxColor: 0x0984e3, ribColor: 0xf5f6fa }, // 寶石藍銀緞帶
    { id: 5,  sx: 0.50, sy: 0.65, sz: 0.50, x: 56.6, z: 4.8, rotY: 0.40,  boxColor: 0x9b59b6, ribColor: 0xf1c40f }, // 紫羅蘭金緞帶
    { id: 6,  sx: 0.45, sy: 0.42, sz: 0.45, x: 56.8, z: 3.8, rotY: -0.20, boxColor: 0xe67e22, ribColor: 0x27ae60 }, // 暖橘綠緞帶
    { id: 7,  sx: 0.65, sy: 0.32, sz: 0.48, x: 58.0, z: 3.8, rotY: 0.50,  boxColor: 0xffffff, ribColor: 0xd63031 }, // 長方純白紅緞帶
    { id: 8,  sx: 0.65, sy: 0.60, sz: 0.65, x: 60.2, z: 4.2, rotY: -0.15, boxColor: 0xc0392b, ribColor: 0xf1c40f }, // 深紅寬金緞帶
    { id: 9,  sx: 0.42, sy: 0.38, sz: 0.42, x: 60.0, z: 6.0, rotY: 0.30,  boxColor: 0x1abc9c, ribColor: 0xd63031 }, // 迷你薄荷綠紅緞帶
    { id: 10, sx: 0.48, sy: 0.48, sz: 0.48, x: 60.4, z: 5.1, rotY: -0.55, boxColor: 0xd4af37, ribColor: 0x0984e3 }  // 香檳金藍緞帶
  ];

  roomGiftsConfig.forEach((g) => {
    const boxMat = new THREE.MeshStandardMaterial({ color: g.boxColor, roughness: 0.55 });
    const ribMat = new THREE.MeshStandardMaterial({ color: g.ribColor, metalness: 0.45, roughness: 0.28 });

    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(g.sx, g.sy, g.sz), boxMat);
    boxMesh.position.set(g.x, c214FloorY + g.sy / 2, g.z);
    boxMesh.rotation.y = g.rotY;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    const ribX = new THREE.Mesh(new THREE.BoxGeometry(g.sx + 0.02, g.sy + 0.015, g.sz * 0.22), ribMat);
    const ribZ = new THREE.Mesh(new THREE.BoxGeometry(g.sx * 0.22, g.sy + 0.015, g.sz + 0.02), ribMat);
    boxMesh.add(ribX);
    boxMesh.add(ribZ);

    const bowSize = Math.min(g.sx, g.sz) * 0.35;
    const topBow = new THREE.Mesh(new THREE.TorusGeometry(bowSize, bowSize * 0.3, 8, 16), ribMat);
    topBow.rotation.x = Math.PI / 2;
    topBow.position.y = g.sy / 2 + bowSize * 0.25;
    boxMesh.add(topBow);

    cGroup.add(boxMesh);
  });

  // 5c. 214 教室頂部專屬水晶採光天窗
  const skylightGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.1,
    metalness: 0.1,
    depthWrite: false
  });
  const skylightBox = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.15, 6.2), skylightGlassMat);
  skylightBox.position.set(58.5, 18.15, 5.2);
  cGroup.add(skylightBox);

  const skylightEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(7.5, 0.25, 6.2)),
    new THREE.LineBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.75 })
  );
  skylightEdges.position.copy(skylightBox.position);
  cGroup.add(skylightEdges);




  // 註冊全域聖誕動畫控制器
  xmasAtmosphereAnim = {
    snowMesh,
    snowPositions,
    snowVelocities,
    snowPhases,
    snowCount,
    wSpread,
    dSpread,
    treeGroup,
    starGroup,
    starLight,
    fairyLights,
    snowmanGroup
  };
}

function animateChristmasAtmosphere(now, dt) {
  if (!xmasAtmosphereAnim) return;
  const anim = xmasAtmosphereAnim;

  // 1. 飄雪粒子更新 (輕盈飄落與微風擺動)
  const pos = anim.snowPositions;
  const vel = anim.snowVelocities;
  const count = anim.snowCount;
  const windX = Math.sin(now * 0.0009) * 0.45;
  const windZ = Math.cos(now * 0.0007) * 0.35;

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    pos[idx + 1] -= vel[idx + 1] * dt;
    pos[idx + 0] += (vel[idx + 0] + windX) * dt;
    pos[idx + 2] += (vel[idx + 2] + windZ) * dt;

    if (pos[idx + 1] < 0.2) {
      pos[idx + 1] = 82.0 + Math.random() * 8.0;
      pos[idx + 0] = (Math.random() - 0.5) * anim.wSpread;
      pos[idx + 2] = (Math.random() - 0.5) * anim.dSpread;
    }
  }
  anim.snowMesh.geometry.attributes.position.needsUpdate = true;

  // 2. 樹頂伯利恆之星與點光源微幅金色呼吸動態
  const starBreath = Math.sin(now * 0.0022);
  anim.starGroup.rotation.y = now * 0.0005;
  anim.starLight.intensity = 1.3 + starBreath * 0.35;

  // 3. 螺旋環繞彩燈交替微閃
  anim.fairyLights.forEach((fl) => {
    const fBreath = Math.sin(now * 0.004 + fl.phase);
    fl.mat.color.setHex(fBreath > 0.1 ? fl.baseColor : 0xffffff);
  });
}


// ==========================================
// 中正樓北側外牆「折返式鋼構景觀樓梯」模組 (Exterior Zigzag Staircase to 214)
// 完全對照使用者標註圖 (media_1793673499454_81208ee1.jpg) 之紅線折返路徑：
// 1F 地面起點 (東側) -> 2F 平台 (西側) -> 3F 平台 (東側) -> 4F 平台 (西側) -> 5F 平台 (東側直通 214 教室)
// 包含防滑金屬踏板、轉折平台、雙側安全扶手護欄、結構立柱與互動虛擬人物路網節點
// ==========================================

const exteriorStairsGroup = new THREE.Group();
exteriorStairsGroup.name = 'EXTERIOR_STAIRCASE_214';
scene.add(exteriorStairsGroup);

let climbingAvatarAnim = null;


// ==========================================
// 玩家專屬「戶外折返式鋼構樓梯」攀爬系統 (Player Stair Climbing System)
// 支援玩家於地面實境漫步模式下，由 1F 沿折返樓梯逐階爬升至 5F 214 教室，
// 或由 214 教室沿樓梯下樓回到地面，包含視角自動追蹤與手動/自動接管切換
// ==========================================

const STAIR_WAYPOINTS = [
  // 0. 1F 地面平緩接入處
  new THREE.Vector3(64.5, 0.0, -3.45),
  // 1. 1F 梯段起點 (東側)
  new THREE.Vector3(61.2, 0.1, -3.45),
  // 2. 2F 轉折休息平台 (西側)
  new THREE.Vector3(48.0, 3.6, -3.45),
  // 3. 3F 轉折休息平台 (東側)
  new THREE.Vector3(61.2, 7.2, -3.45),
  // 4. 4F 轉折休息平台 (西側)
  new THREE.Vector3(48.0, 10.8, -3.45),
  // 5. 5F 抵達平台 (東側)
  new THREE.Vector3(61.2, 14.4, -3.45),
  // 6. 5F 連通空橋北端
  new THREE.Vector3(62.5, 14.4, -3.45),
  // 7. 5F 連通空橋南端 (214 教室正門口外廊)
  new THREE.Vector3(62.5, 14.4, 5.0),
  // 8. 走入 214 教室室內核心 (聖誕樹與禮物區)
  new THREE.Vector3(58.5, 14.4, 5.0)
];

let totalStairDistance = 0;
const stairDistances = [0];
for (let i = 0; i < STAIR_WAYPOINTS.length - 1; i++) {
  const d = STAIR_WAYPOINTS[i].distanceTo(STAIR_WAYPOINTS[i + 1]);
  totalStairDistance += d;
  stairDistances.push(totalStairDistance);
}

function getStairPositionAtDist(dist) {
  const clamped = Math.max(0, Math.min(totalStairDistance, dist));
  let segIdx = 0;
  for (let i = 0; i < stairDistances.length - 1; i++) {
    if (clamped >= stairDistances[i] && clamped <= stairDistances[i + 1]) {
      segIdx = i;
      break;
    }
  }
  const segStartDist = stairDistances[segIdx];
  const segLen = stairDistances[segIdx + 1] - segStartDist;
  const t = segLen > 0.0001 ? (clamped - segStartDist) / segLen : 0;
  const p1 = STAIR_WAYPOINTS[segIdx];
  const p2 = STAIR_WAYPOINTS[segIdx + 1];
  const pos = new THREE.Vector3().lerpVectors(p1, p2, t);
  const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
  const yaw = Math.atan2(dir.x, -dir.z);
  return { pos, dir, yaw, segIdx, progress: clamped / totalStairDistance };
}

// 樓梯攀爬狀態管理
state.fpv.isClimbingStairs = false;
state.fpv.stairDist = 0;
state.fpv.stairDir = 1; // +1: 上樓往 214; -1: 下樓往 1F 地面

function updateClimbButtonState() {
  const btn = document.getElementById('climb-stair-btn');
  if (!btn) return;
  const is5F = state.fpv.pos.y >= 13.5;
  if (state.fpv.isClimbingStairs) {
    btn.textContent = state.fpv.stairDir > 0 ? '⏸ 爬梯中：點擊暫停' : '⏸ 下樓中：點擊暫停';
    btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
  } else if (is5F) {
    btn.textContent = '🪜 走樓梯下樓至 1F';
    btn.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  } else {
    btn.textContent = '🪜 爬樓梯上 214';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  }
}

function startClimbingStairs(targetDir) {
  if (state.viewMode !== 'fpv') {
    setViewMode('fpv');
  }
  state.autoWalking = false;
  state.fpv.targetWalkPoint = null;

  const is5F = state.fpv.pos.y >= 13.5;
  if (targetDir !== undefined) {
    state.fpv.stairDir = targetDir;
  } else {
    state.fpv.stairDir = is5F ? -1 : 1;
  }

  // 若人物距離樓梯很遠，先將人物就定位
  if (!state.fpv.isClimbingStairs) {
    if (state.fpv.stairDir > 0) {
      if (state.fpv.pos.distanceTo(STAIR_WAYPOINTS[0]) > 8.0 && !is5F) {
        state.fpv.pos.set(STAIR_WAYPOINTS[0].x, STAIR_WAYPOINTS[0].y + 1.72, STAIR_WAYPOINTS[0].z);
        state.fpv.stairDist = 0;
        showToast('已瞬移至戶外樓梯 1F 入口，開始沿樓梯爬上 214 教室！');
      } else {
        showToast('開始沿樓梯爬上 214 教室！');
      }
    } else {
      if (state.fpv.pos.distanceTo(STAIR_WAYPOINTS[STAIR_WAYPOINTS.length - 1]) > 8.0 && is5F) {
        state.fpv.pos.set(STAIR_WAYPOINTS[8].x, STAIR_WAYPOINTS[8].y + 1.72, STAIR_WAYPOINTS[8].z);
        state.fpv.stairDist = totalStairDistance;
        showToast('開始沿戶外樓梯下樓至 1F 地面！');
      } else {
        showToast('開始沿戶外樓梯下樓至 1F 地面！');
      }
    }
  }

  state.fpv.isClimbingStairs = true;
  updateClimbButtonState();
}

function buildExteriorStaircaseTo214() {
  const g = exteriorStairsGroup;

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.75, roughness: 0.35 }); // 工業鋼構立柱與橫梁
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.65, roughness: 0.45 }); // 防滑金屬踏板
  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.25 });  // 亮銀安全欄杆扶手
  const postMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.7, roughness: 0.4 });

  const stairZ = -3.45; // 緊貼中正樓北外牆外側表面 (Z = -2.70)，進深約 1.3m
  const stairW = 1.35;  // 踏板寬度 (進深)

  // A. 貫穿 1F 至 5F 的四根堅固支撐鋼管立柱
  const colXs = [48.0, 61.8];
  const colZs = [stairZ - 0.65, stairZ + 0.65];
  colXs.forEach((cx) => {
    colZs.forEach((cz) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 15.0, 12), steelMat);
      col.position.set(cx, 7.5, cz);
      col.castShadow = true;
      g.add(col);
    });
  });

  // 輔助函式：建立轉折休息平台 (Landing)
  function createLanding(cx, y, w = 2.4, d = 1.5) {
    const landingMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), steelMat);
    landingMesh.position.set(cx, y, stairZ);
    landingMesh.castShadow = true;
    landingMesh.receiveShadow = true;
    g.add(landingMesh);

    // 外側三面安全欄杆 (高 1.05m)
    const rH = 1.05;
    // 北側外緣欄杆
    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.06), railMat);
    railNorth.position.set(cx, y + rH, stairZ - d / 2 + 0.03);
    g.add(railNorth);

    // 豎直安全立柱
    for (let rx = -w / 2 + 0.1; rx <= w / 2 - 0.1; rx += 0.5) {
      const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, rH, 6), postMat);
      rPost.position.set(cx + rx, y + rH / 2, stairZ - d / 2 + 0.03);
      g.add(rPost);
    }
  }

  // 輔助函式：建立斜向梯段 (Flight of Stairs)
  function createStairFlight(startX, startY, endX, endY, numSteps = 16) {
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // 兩側斜向主承重鋼梁 (Stringers)
    [-stairW / 2 + 0.05, stairW / 2 - 0.05].forEach((dz) => {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 0.08), steelMat);
      stringer.position.set((startX + endX) / 2, (startY + endY) / 2, stairZ + dz);
      stringer.rotation.z = angle;
      stringer.castShadow = true;
      g.add(stringer);

      // 沿梁安全扶手
      const handrail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), railMat);
      handrail.position.set((startX + endX) / 2, (startY + endY) / 2 + 1.02, stairZ + dz);
      handrail.rotation.z = angle;
      g.add(handrail);
    });

    // 階梯踏板 (Treads)
    for (let s = 0; s < numSteps; s++) {
      const t = (s + 0.5) / numSteps;
      const stepX = startX + dx * t;
      const stepY = startY + dy * t;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(len / numSteps * 0.92, 0.05, stairW - 0.12), treadMat);
      tread.position.set(stepX, stepY, stairZ);
      tread.castShadow = true;
      tread.receiveShadow = true;
      g.add(tread);
    }
  }

  // B. 依紅線折返建構 4 段梯段與各層轉折平台：
  // 1F 地面起點：X = 61.2, Y = 0.1 (東側)
  // 第 1 段：由東向西上升至 2F 平台 (X = 49.0, Y = 3.6)
  createStairFlight(61.2, 0.1, 49.0, 3.6, 18);
  createLanding(48.0, 3.6);

  // 第 2 段：由西向東折返上升至 3F 平台 (X = 61.2, Y = 7.2)
  createStairFlight(49.0, 3.6, 61.2, 7.2, 18);
  createLanding(62.0, 7.2);

  // 第 3 段：由東向西折返上升至 4F 平台 (X = 49.0, Y = 10.8)
  createStairFlight(61.2, 7.2, 49.0, 10.8, 18);
  createLanding(48.0, 10.8);

  // 第 4 段：由西向東折返上升至 5F 平台 (X = 61.2, Y = 14.4)
  createStairFlight(49.0, 10.8, 61.2, 14.4, 18);
  createLanding(62.0, 14.4);

  // C. 5F 抵達平台向南延伸接入 214 教室門口外廊露台 (連通空橋)
  const bridgeLen = Math.abs(6.29 - stairZ); // 約 9.7 公尺
  const bridgeCenterZ = (stairZ + 6.29) / 2;
  const bridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, bridgeLen), steelMat);
  bridgeMesh.position.set(62.5, 14.4, bridgeCenterZ);
  bridgeMesh.castShadow = true;
  bridgeMesh.receiveShadow = true;
  g.add(bridgeMesh);

  // 空橋外側安全護欄
  const bridgeRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, bridgeLen), railMat);
  bridgeRail.position.set(63.25, 14.4 + 0.525, bridgeCenterZ);
  g.add(bridgeRail);

  // D. 建立戶外樓梯爬梯互動虛擬人物 NPC (身穿冬季校服的學生角色)
  const studentNpcGroup = new THREE.Group();
  studentNpcGroup.name = 'CLIMBING_STUDENT_214';

  const uniformBlueMat = new THREE.MeshStandardMaterial({ color: 0x1a3a60, roughness: 0.65 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x24292e, roughness: 0.75 });
  const redScarfMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 });

  // 軀幹
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.24), uniformBlueMat);
  torso.position.y = 0.88;
  torso.castShadow = true;
  studentNpcGroup.add(torso);

  // 圍巾
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 12), redScarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.16;
  studentNpcGroup.add(scarf);

  // 頭部
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), skinMat);
  head.position.y = 1.34;
  head.castShadow = true;
  studentNpcGroup.add(head);

  // 頭髮
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
  hair.position.set(0, 1.38, -0.02);
  studentNpcGroup.add(hair);

  // 雙臂與雙腿 (具有擺臂與換腿關節組)
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), pantsMat);
  leftLeg.position.set(-0.12, 0.35, 0);
  leftLeg.castShadow = true;
  studentNpcGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), pantsMat);
  rightLeg.position.set(0.12, 0.35, 0);
  rightLeg.castShadow = true;
  studentNpcGroup.add(rightLeg);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.50, 0.12), uniformBlueMat);
  leftArm.position.set(-0.28, 0.82, 0);
  studentNpcGroup.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.50, 0.12), uniformBlueMat);
  rightArm.position.set(0.28, 0.82, 0);
  studentNpcGroup.add(rightArm);

  // 初始位置放置於 3F 梯段中央，正朝 214 教室方向上樓
  studentNpcGroup.position.set(55.0, 5.4, stairZ);
  g.add(studentNpcGroup);

  // 註冊攀爬人物控制器
  climbingAvatarAnim = {
    root: studentNpcGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    stairZ,
    // 折返關鍵節點陣列 (1F -> 2F -> 3F -> 4F -> 5F -> 214 教室室內)
    waypoints: [
      new THREE.Vector3(61.2, 0.1, stairZ),
      new THREE.Vector3(48.5, 3.6, stairZ),
      new THREE.Vector3(61.2, 7.2, stairZ),
      new THREE.Vector3(48.5, 10.8, stairZ),
      new THREE.Vector3(61.2, 14.4, stairZ),
      new THREE.Vector3(62.5, 14.4, 0.0),
      new THREE.Vector3(58.5, 14.4, 5.0)
    ]
  };
}

function animateClimbingAvatar(now, dt) {
  if (!climbingAvatarAnim) return;
  const a = climbingAvatarAnim;
  const pts = a.waypoints;

  // 計算循環路徑進度 (約 28 秒爬一趟循環)
  const cycleTime = 28.0;
  const t = (now * 0.001) % cycleTime;
  const prog = t / cycleTime; // 0 到 1

  const totalSegments = pts.length - 1;
  const segIdx = Math.min(totalSegments - 1, Math.floor(prog * totalSegments));
  const segT = (prog * totalSegments) - segIdx;

  const p1 = pts[segIdx];
  const p2 = pts[segIdx + 1];

  // 線性插值位置
  a.root.position.lerpVectors(p1, p2, segT);

  // 朝向移動方向
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const yaw = Math.atan2(dx, dz);
  a.root.rotation.y = yaw;

  // 爬梯雙腿與手臂擺動動畫
  const stepSwing = Math.sin(now * 0.007) * 0.45;
  a.leftLeg.rotation.x = stepSwing;
  a.rightLeg.rotation.x = -stepSwing;
  a.leftArm.rotation.x = -stepSwing * 0.8;
  a.rightArm.rotation.x = stepSwing * 0.8;
}

function buildColorfulFlowerBeds() {
  // 大花圃 (px: 552..794, py: 562..622) 與排球場旁花圃 (px: 800..872, py: 518..586)
  // 真實校園現況皆為茂密大榕樹群：建立石砌花台基座、深綠蔭下灌木地被、粗壯榕樹主幹與垂懸氣根（搭配 InstancedMesh 大榕樹冠）
  const underbrushMat = new THREE.MeshStandardMaterial({ color: 0x2d5e31, roughness: 0.9 });
  const borderStoneMat = new THREE.MeshStandardMaterial({ color: 0xc2bcb0, roughness: 0.85 });
  const banyanTrunkMat = new THREE.MeshStandardMaterial({ color: 0x594636, roughness: 0.92 });

  // 大花圃石砌圍邊與林下灌木層
  const bigBedW = (794 - 552) * SCALE;
  const bigBedD = (622 - 562) * SCALE;
  const bigBedCx = pxToWorldX((552 + 794) / 2);
  const bigBedCz = pyToWorldZ((562 + 622) / 2);

  const bigCurb = new THREE.Mesh(new THREE.BoxGeometry(bigBedW, 0.52, bigBedD), borderStoneMat);
  bigCurb.position.set(bigBedCx, 0.45, bigBedCz);
  details3DGroup.add(bigCurb);

  const bigBrush = new THREE.Mesh(new THREE.BoxGeometry(bigBedW - 1.2, 0.68, bigBedD - 1.2), underbrushMat);
  bigBrush.position.set(bigBedCx, 0.72, bigBedCz);
  details3DGroup.add(bigBrush);

  // 排球場旁花圃石砌圍邊與林下灌木層
  const vBedW = (872 - 800) * SCALE;
  const vBedD = (586 - 518) * SCALE;
  const vBedCx = pxToWorldX((800 + 872) / 2);
  const vBedCz = pyToWorldZ((518 + 586) / 2);

  const vCurb = new THREE.Mesh(new THREE.BoxGeometry(vBedW, 0.52, vBedD), borderStoneMat);
  vCurb.position.set(vBedCx, 0.45, vBedCz);
  details3DGroup.add(vCurb);

  const vBrush = new THREE.Mesh(new THREE.BoxGeometry(vBedW - 1.0, 0.68, vBedD - 1.0), underbrushMat);
  vBrush.position.set(vBedCx, 0.72, vBedCz);
  details3DGroup.add(vBrush);

  // 大榕樹粗壯複合樹幹與氣根群
  const banyanCoords = [
    [572, 588], [608, 592], [645, 586], [682, 594], [720, 588], [758, 592], [782, 590],
    [820, 535], [848, 538], [824, 566], [852, 568]
  ];
  banyanCoords.forEach(([bpx, bpy]) => {
    const bx = pxToWorldX(bpx);
    const bz = pyToWorldZ(bpy);
    const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 3.8, 8), banyanTrunkMat);
    mainTrunk.position.set(bx, 2.1, bz);
    mainTrunk.castShadow = true;
    details3DGroup.add(mainTrunk);

    // 氣根與副幹
    [-0.65, 0.65].forEach((offset, idx) => {
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 3.4, 6), banyanTrunkMat);
      root.position.set(bx + offset, 1.9, bz + (idx === 0 ? 0.45 : -0.45));
      root.rotation.z = offset * 0.18;
      details3DGroup.add(root);
    });

    // 登錄大榕樹主幹實體碰撞圓形
    collisionCircles.push({
      x: bx,
      z: bz,
      r: 1.15,
      type: 'tree',
      name: '大榕樹'
    });
  });
}

function buildSurroundingSkyline() {
  // 還原 214 教室往操場拍攝照片中的北投士林科技園區真實背景大樓與遠景摩天輪
  // 1. 照片右側高聳藍色玻璃帷幕大樓 (位於籃球場後方 px: 995, py: -28)
  const glassCanvas = document.createElement('canvas');
  glassCanvas.width = 256;
  glassCanvas.height = 512;
  const gCtx = glassCanvas.getContext('2d');
  const grad = gCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1355a3');
  grad.addColorStop(0.55, '#2678cf');
  grad.addColorStop(1, '#5ca4eb');
  gCtx.fillStyle = grad;
  gCtx.fillRect(0, 0, 256, 512);

  // 玻璃帷幕銀白鋁框格柵與高光反射色塊
  gCtx.strokeStyle = 'rgba(225, 240, 255, 0.72)';
  gCtx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 24) {
    gCtx.beginPath();
    gCtx.moveTo(x, 0);
    gCtx.lineTo(x, 512);
    gCtx.stroke();
  }
  for (let y = 0; y <= 512; y += 32) {
    gCtx.beginPath();
    gCtx.moveTo(0, y);
    gCtx.lineTo(256, y);
    gCtx.stroke();
  }
  // 頂層橫向深色百頁機電層 (照片中大樓頂部下方有一道橫向深色槽線)
  gCtx.fillStyle = '#0c2442';
  gCtx.fillRect(52, 54, 152, 16);

  const glassTex = new THREE.CanvasTexture(glassCanvas);
  glassTex.colorSpace = THREE.SRGBColorSpace;

  // 士科路西側建築基地鋪面（確保大樓座落於士科路西側 py < -118）
  const westPlazaW = 640 * SCALE;
  const westPlazaD = 165 * SCALE;
  const westBase = new THREE.Mesh(
    new THREE.BoxGeometry(westPlazaW, 0.08, westPlazaD),
    new THREE.MeshStandardMaterial({ color: 0x4a4f57, roughness: 0.88 })
  );
  westBase.position.set(pxToWorldX(500 + 320), 0.03, pyToWorldZ(-290 + 82.5));
  westBase.receiveShadow = true;
  details3DGroup.add(westBase);

  // 1. 士科路西側之北士科藍色玻璃帷幕大樓（px: 995, py: -210，坐落於士科路西側）
  const glassTowerX = pxToWorldX(995);
  const glassTowerZ = pyToWorldZ(-210);
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0xedeae2, roughness: 0.65 });
  const blueGlassMat = new THREE.MeshStandardMaterial({
    map: glassTex,
    roughness: 0.14,
    metalness: 0.55
  });

  const podium = new THREE.Mesh(new THREE.BoxGeometry(42, 14, 24), podiumMat);
  podium.position.set(glassTowerX, 7.0, glassTowerZ);
  podium.rotation.y = 0.08;
  podium.castShadow = true;
  details3DGroup.add(podium);

  const glassTower = new THREE.Mesh(new THREE.BoxGeometry(36, 66, 20), blueGlassMat);
  glassTower.position.set(glassTowerX, 14 + 33, glassTowerZ);
  glassTower.rotation.y = 0.08;
  glassTower.castShadow = true;
  details3DGroup.add(glassTower);

  // 2. 士科路西側之雙子星米白格柵住宅大樓（坐落於士科路西側 px: 685 & 775, py: -195）
  const resCanvas = document.createElement('canvas');
  resCanvas.width = 128;
  resCanvas.height = 256;
  const rCtx = resCanvas.getContext('2d');
  rCtx.fillStyle = '#d6cbb9';
  rCtx.fillRect(0, 0, 128, 256);
  for (let ry = 10; ry < 246; ry += 16) {
    for (let rx = 8; rx < 120; rx += 22) {
      rCtx.fillStyle = '#383430';
      rCtx.fillRect(rx, ry, 15, 10);
      rCtx.fillStyle = '#9c9284';
      rCtx.fillRect(rx, ry + 8, 15, 3);
    }
  }
  const resTex = new THREE.CanvasTexture(resCanvas);
  resTex.colorSpace = THREE.SRGBColorSpace;
  const twinMat = new THREE.MeshStandardMaterial({ map: resTex, roughness: 0.78 });

  [685, 775].forEach((tpx) => {
    const tx = pxToWorldX(tpx);
    const tz = pyToWorldZ(-195);
    const tGeo = new THREE.BoxGeometry(21, 46, 18);
    const tMesh = new THREE.Mesh(tGeo, twinMat);
    tMesh.position.set(tx, 23, tz);
    tMesh.castShadow = true;
    details3DGroup.add(tMesh);
  });

  // 3. 遠方西南南位置 (-X 南方、-Z 西方微偏，精確 SSW 201.5° 方位) 之兒童新樂園摩天輪 (px: -550, py: 45)
  // 依真實地理座標定位：中正高中向南約 1.5 公里、微偏西 0.35 公里處
  // 完整渲染：中央旋轉軸心、雙層外圈鋼骨、24 根放射狀輻條支架、A 字型支撐立柱與 24 個彩虹漸層色彩車廂 (Gondolas)
  const wheelX = pxToWorldX(-550);
  const wheelZ = pyToWorldZ(45);
  const wheelCenterY = 48.0;
  const wheelRadius = 34.0;

  const ferrisRoot = new THREE.Group();
  ferrisRoot.position.set(wheelX, 0, wheelZ);
  ferrisRoot.rotation.y = -0.68; // 輪盤正面朝向校園中心視野

  const steelMat = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, metalness: 0.35, roughness: 0.3 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x2471a3, metalness: 0.4, roughness: 0.3 });

  // 旋轉輪盤組
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(0, wheelCenterY, 0);

  // 雙層外圈鋼環 (外環與內環)
  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.58, 10, 48), steelMat);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius * 0.82, 0.44, 8, 48), steelMat);
  wheelGroup.add(outerRim, innerRim);

  // 中央主軸轂心
  const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 2.8, 18), hubMat);
  centerHub.rotation.x = Math.PI / 2;
  wheelGroup.add(centerHub);

  // 24 根放射鋼構輻條 (Spokes) 與 24 座彩虹車廂
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xdde4eb, roughness: 0.4 });
  const gondolaCount = 24;
  const wheelGondolas = [];

  for (let i = 0; i < gondolaCount; i++) {
    const angle = (i / gondolaCount) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // 鋼構輻條
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, wheelRadius, 6), spokeMat);
    spoke.position.set((wheelRadius / 2) * cosA, (wheelRadius / 2) * sinA, 0);
    spoke.rotation.z = angle - Math.PI / 2;
    wheelGroup.add(spoke);

    // 環間桁架交叉斜撐
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, wheelRadius * 0.18), spokeMat);
    crossBar.position.set((wheelRadius * 0.91) * cosA, (wheelRadius * 0.91) * sinA, 0);
    wheelGroup.add(crossBar);

    // 24 個彩虹漸層顏色車廂 (紅、橙、黃、綠、藍、靛、紫光譜平滑循環)
    const hue = (i / gondolaCount);
    const cabColor = new THREE.Color().setHSL(hue, 0.92, 0.54);
    const gondolaMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.28, metalness: 0.2 });

    const gondola = new THREE.Group();
    gondola.position.set(wheelRadius * cosA, wheelRadius * sinA, 0);

    // 車廂主艙體 (六角柱圓頂流線觀景艙)
    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.3, 2.5, 8), gondolaMat);
    cabin.position.y = -1.25;
    gondola.add(cabin);

    // 觀景窗橫條玻璃環
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x1a2e40, roughness: 0.1, metalness: 0.8 });
    const cabinWindow = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.35, 0.95, 8), windowMat);
    cabinWindow.position.y = -1.2;
    gondola.add(cabinWindow);

    // 吊掛桿臂
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.15, 6), steelMat);
    hanger.position.y = -0.58;
    gondola.add(hanger);

    wheelGroup.add(gondola);
    wheelGondolas.push(gondola);
  }
  ferrisRoot.add(wheelGroup);

  // A 字型雙向四柱斜向主支架與基座
  const legMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.45, roughness: 0.35 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.7 });
  [-1, 1].forEach((dirX) => {
    [-1, 1].forEach((dirZ) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.25, wheelCenterY + 4, 8), legMat);
      leg.position.set(dirX * 12.0, wheelCenterY / 2, dirZ * 4.8);
      leg.rotation.z = -dirX * 0.24;
      leg.rotation.x = dirZ * 0.11;
      ferrisRoot.add(leg);
    });
  });

  // 支架底座承台
  const wheelBase = new THREE.Mesh(new THREE.BoxGeometry(34, 2.5, 18), baseMat);
  wheelBase.position.set(0, 1.25, 0);
  ferrisRoot.add(wheelBase);

  details3DGroup.add(ferrisRoot);
  ferrisWheelAnim = { wheelGroup, gondolas: wheelGondolas };
}

function buildRoofSolarAndBrickStuds() {
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0xd8d6cf, roughness: 0.78 }); // 灰白混凝土外框女兒牆
  const roofFeltMat = new THREE.MeshStandardMaterial({ color: 0x3d4147, roughness: 0.92 }); // 深灰防水防漏鋪面
  const penthouseMat = new THREE.MeshStandardMaterial({ color: 0xc8c6be, roughness: 0.8 }); // 樓梯間機房
  const metalUnitMat = new THREE.MeshStandardMaterial({ color: 0x5a6572, metalness: 0.6, roughness: 0.35 }); // 冷卻水塔金屬
  const studGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 10);
  studGeo.translate(0, 0.21, 0);

  BUILDINGS.forEach((b) => {
    b.parts.forEach((part, pIdx) => {
      if (!part || part.isPlaza) return;
      const partFloors = part.floors || b.floors;
      if (partFloors < 3) return;
      const w = part.pw * SCALE;
      const d = part.ph * SCALE;
      const cx = pxToWorldX(part.px + part.pw / 2);
      const cz = pyToWorldZ(part.py + part.ph / 2);
      const roofY = partFloors * FLOOR_H;

      // 依 Google Maps 3D 實景：四周建立凸起的女兒牆 (高 0.85m)，內部鋪設真實的深灰防水漆屋頂層！
      if (b.id !== 'activity_center') {
        const wallT = 0.45;
        const wallH = 0.85;

        // 內部深灰防水面層 (中正樓 214 教室上方特別開設透光天窗，讓聖光穿透並直接呈現室內 10 個禮物盒與聖誕樹)
        if (b.id === 'zhongzheng') {
          const southD = d - 14.5;
          const southZ = cz + 7.0;
          const southFelt = new THREE.Mesh(new THREE.BoxGeometry(w - wallT * 1.5, 0.12, southD), roofFeltMat);
          southFelt.position.set(cx, roofY + 0.06, southZ);
          southFelt.receiveShadow = true;
          details3DGroup.add(southFelt);

          const northD = 4.2;
          const northZ = cz - d / 2 + northD / 2 + wallT;
          const northFelt = new THREE.Mesh(new THREE.BoxGeometry(w - wallT * 1.5, 0.12, northD), roofFeltMat);
          northFelt.position.set(cx, roofY + 0.06, northZ);
          northFelt.receiveShadow = true;
          details3DGroup.add(northFelt);
        } else {
          const roofFelt = new THREE.Mesh(
            new THREE.BoxGeometry(w - wallT * 1.5, 0.12, d - wallT * 1.5),
            roofFeltMat
          );
          roofFelt.position.set(cx, roofY + 0.06, cz);
          roofFelt.receiveShadow = true;
          details3DGroup.add(roofFelt);
        }

        // 四周灰白女兒牆
        const nWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallT), parapetMat);
        nWall.position.set(cx, roofY + wallH / 2, cz - d / 2 + wallT / 2);
        details3DGroup.add(nWall);

        const sWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallT), parapetMat);
        sWall.position.set(cx, roofY + wallH / 2, cz + d / 2 - wallT / 2);
        details3DGroup.add(sWall);

        const wWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d), parapetMat);
        wWall.position.set(cx - w / 2 + wallT / 2, roofY + wallH / 2, cz);
        details3DGroup.add(wWall);

        const eWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d), parapetMat);
        eWall.position.set(cx + w / 2 - wallT / 2, roofY + wallH / 2, cz);
        details3DGroup.add(eWall);

        // 屋突樓梯間與電梯機房 (Penthouse，僅主樓頂配置)
        if (pIdx === 0) {
          const isLongZ = d > w;
          const phW = Math.min(w * 0.55, 5.2);
          const phD = Math.min(d * 0.55, 6.4);
          const penthouse = new THREE.Mesh(new THREE.BoxGeometry(phW, 2.8, phD), penthouseMat);
          penthouse.position.set(
            cx + (isLongZ ? 0 : w * 0.22),
            roofY + 1.4,
            cz + (isLongZ ? d * 0.22 : 0)
          );
          penthouse.castShadow = true;
          details3DGroup.add(penthouse);

          // 冷卻水塔圓柱體 (金屬風扇格柵)
          if (b.id === 'zhongzheng' || b.id === 'gezhi') {
            const cooler = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 12), metalUnitMat);
            cooler.position.set(cx + (isLongZ ? 2.5 : 0), roofY + 0.9, cz + (isLongZ ? 0 : 2.5));
            cooler.castShadow = true;
            details3DGroup.add(cooler);
          }
        }
      }

      // 微縮積木主題 (brick) 屋頂 LEGO 凸點
      const cols = Math.max(2, Math.floor(w / 2.2));
      const rows = Math.max(2, Math.floor(d / 2.2));
      const inst = new THREE.InstancedMesh(
        studGeo,
        new THREE.MeshStandardMaterial({ color: b.roofColor || b.color, roughness: 0.45 }),
        cols * rows
      );
      const dummy = new THREE.Object3D();
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dummy.position.set(
            cx - w / 2 + 1.1 + c * ((w - 2.2) / Math.max(1, cols - 1)),
            roofY,
            cz - d / 2 + 1.1 + r * ((d - 2.2) / Math.max(1, rows - 1))
          );
          dummy.updateMatrix();
          inst.setMatrixAt(idx++, dummy.matrix);
        }
      }
      inst.instanceMatrix.needsUpdate = true;
      brickStudsGroup.add(inst);
    });
  });
}

function buildEcoPondScene() {
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x7c766b, roughness: 0.92 });
  const shallowWaterMat = new THREE.MeshStandardMaterial({
    color: 0x228ba8,
    emissive: 0x0b3c4d,
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.28
  });
  const deepWaterMat = new THREE.MeshStandardMaterial({
    color: 0x0f5e7a,
    emissive: 0x072d3d,
    emissiveIntensity: 0.38,
    roughness: 0.10,
    metalness: 0.45
  });

  // 以三組交疊有機橢圓構成森林中央的自然大池塘（主池 + 西南灣 + 東南灣）
  const pondLobes = [
    { px: 686, py: 750, rx: 47 * SCALE, rz: 29 * SCALE, rot: -0.10 },
    { px: 645, py: 756, rx: 26 * SCALE, rz: 19 * SCALE, rot: 0.16 },
    { px: 706, py: 762, rx: 24 * SCALE, rz: 17 * SCALE, rot: -0.22 }
  ];

  pondLobes.forEach((lobe) => {
    const lx = pxToWorldX(lobe.px);
    const lz = pyToWorldZ(lobe.py);

    // 卵石護岸層
    const bankGeo = new THREE.CylinderGeometry(1, 1.05, 0.24, 32);
    bankGeo.scale(lobe.rx + 1.15, 1, lobe.rz + 1.15);
    const bankMesh = new THREE.Mesh(bankGeo, bankMat);
    bankMesh.position.set(lx, 0.26, lz);
    bankMesh.rotation.y = lobe.rot;
    bankMesh.receiveShadow = true;
    details3DGroup.add(bankMesh);

    // 淺水翠藍岸緣層
    const shallowGeo = new THREE.CylinderGeometry(1, 1, 0.26, 32);
    shallowGeo.scale(lobe.rx + 0.35, 1, lobe.rz + 0.35);
    const shallowMesh = new THREE.Mesh(shallowGeo, shallowWaterMat);
    shallowMesh.position.set(lx, 0.31, lz);
    shallowMesh.rotation.y = lobe.rot;
    shallowMesh.receiveShadow = true;
    shallowMesh.userData = { buildingId: 'eco_pond', floorNum: 1, partIdx: 0 };
    buildingMeshes.push(shallowMesh);
    details3DGroup.add(shallowMesh);

    // 深水鏡面池心層
    const deepGeo = new THREE.CylinderGeometry(1, 1, 0.28, 32);
    deepGeo.scale(lobe.rx * 0.86, 1, lobe.rz * 0.86);
    const deepMesh = new THREE.Mesh(deepGeo, deepWaterMat);
    deepMesh.position.set(lx, 0.34, lz);
    deepMesh.rotation.y = lobe.rot;
    deepMesh.receiveShadow = true;
    deepMesh.userData = { buildingId: 'eco_pond', floorNum: 1, partIdx: 0 };
    buildingMeshes.push(deepMesh);
    details3DGroup.add(deepMesh);
  });

  // 池岸天然景觀疊石（沿大池塘岸線環繞排列）
  const rockMatA = new THREE.MeshStandardMaterial({ color: 0x6e6a61, roughness: 0.9, flatShading: true });
  const rockMatB = new THREE.MeshStandardMaterial({ color: 0x57544d, roughness: 0.92, flatShading: true });
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2;
    const isWestLobe = ang > 2.2 && ang < 4.1;
    const centerPx = isWestLobe ? 654 : 686;
    const centerPy = isWestLobe ? 754 : 750;
    const rxPx = isWestLobe ? 32 : 44;
    const ryPx = isWestLobe ? 20 : 26;
    const rpx = centerPx + Math.cos(ang) * rxPx + ((i % 3) - 1) * 1.8;
    const rpy = centerPy + Math.sin(ang) * ryPx + ((i % 2) - 0.5) * 1.8;
    const rockR = 0.45 + (i % 4) * 0.16;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockR, 0), i % 2 === 0 ? rockMatA : rockMatB);
    rock.scale.set(1.2, 0.65, 1.0);
    rock.position.set(pxToWorldX(rpx), 0.42, pyToWorldZ(rpy));
    rock.rotation.y = i * 1.1;
    rock.castShadow = true;
    rock.receiveShadow = true;
    details3DGroup.add(rock);
  }

  // 池面漂浮睡蓮荷葉與粉紅蓮花
  const padMat = new THREE.MeshStandardMaterial({ color: 0x4ca64c, roughness: 0.65 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf49ac0, roughness: 0.4 });
  const padCoords = [
    [668, 742, 0.65, true], [674, 745, 0.52, false], [663, 747, 0.48, false],
    [698, 744, 0.70, true], [704, 748, 0.55, false], [693, 751, 0.50, false],
    [682, 760, 0.68, true], [688, 763, 0.52, false], [676, 758, 0.46, false],
    [648, 754, 0.60, true], [653, 759, 0.48, false], [643, 758, 0.50, false]
  ];
  padCoords.forEach(([px, py, rad, hasLotus], idx) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.05, 14), padMat);
    pad.position.set(pxToWorldX(px), 0.49, pyToWorldZ(py));
    pad.rotation.y = idx * 0.8;
    details3DGroup.add(pad);
    if (hasLotus) {
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 7), flowerMat);
      lotus.position.set(pxToWorldX(px), 0.64, pyToWorldZ(py));
      details3DGroup.add(lotus);
    }
  });

  // 池畔生態觀察木棧道平台（位於大池塘東北岸，由美齡樓側延伸入池畔）
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8f5b38, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6e4326, roughness: 0.85 });
  const deckX = pxToWorldX(726);
  const deckZ = pyToWorldZ(736);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 3.2), deckMat);
  deck.position.set(deckX, 0.56, deckZ);
  deck.rotation.y = -0.35;
  deck.castShadow = true;
  deck.receiveShadow = true;
  details3DGroup.add(deck);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.75, 0.14), railMat);
  rail.position.set(deckX - 0.4, 0.95, deckZ - 1.3);
  rail.rotation.y = -0.35;
  details3DGroup.add(rail);

  // 森林底層灌木叢與蕨類植栽（分佈於茂密喬木樹冠下方與池岸周圍，強化多層次深林質感）
  const bushMats = [
    new THREE.MeshStandardMaterial({ color: 0x2d6e36, roughness: 0.88, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x3d8242, roughness: 0.85, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x1f5228, roughness: 0.90, flatShading: true })
  ];
  for (let i = 0; i < 44; i++) {
    const ang = (i / 44) * Math.PI * 2 + (i % 3) * 0.12;
    const ringFactor = 1.06 + (i % 4) * 0.15;
    const bpx = 684 + Math.cos(ang) * (53 * ringFactor);
    const bpy = 750 + Math.sin(ang) * (34 * ringFactor);
    if (bpx < 598 || bpx > 772 || bpy < 676 || bpy > 822) continue;
    const bushR = 0.85 + (i % 5) * 0.22;
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(bushR, 1), bushMats[i % 3]);
    bush.scale.set(1.15, 0.72, 1.15);
    bush.position.set(pxToWorldX(bpx), 0.65, pyToWorldZ(bpy));
    bush.rotation.y = i * 0.9;
    bush.castShadow = true;
    bush.receiveShadow = true;
    details3DGroup.add(bush);
  }
}

// === 5. 依平面圖樹冠自動產生 3D 樹木 (InstancedMesh) ===
// 樹冠資料由 tools/build_assets.py（Pillow + NumPy 尺度空間 LoG 斑點偵測）產生於 data/trees-data.js。
// 渲染策略：樹幹 1 個 InstancedMesh；樹冠依平面圖色系分 3 種造型，各 1 個 InstancedMesh。
// 不論樹木數量多寡，全部樹木只產生 4 次 draw call。
const TREE_DATA = window.CAMPUS_TREES || { trees: [], fields: ['px', 'py', 'r', 'tone'] };
const treeGroup = new THREE.Group();
treeGroup.name = 'TREES';
scene.add(treeGroup);

// 色系造型：1=淺黃綠（圓球闊葉樹）2=中綠（雙層闊葉樹）3=深綠（錐形常綠樹）4=金黃棕櫚／椰子樹 5=粉紅開花喬木（櫻花／杜鵑）6=密生常綠灌木矮樹叢
const TREE_TONES = {
  1: { hue: 0.22, sat: 0.48, light: 0.47, build: () => new THREE.IcosahedronGeometry(1, 1) },
  2: {
    hue: 0.31, sat: 0.45, light: 0.38,
    build: () => {
      const g = new THREE.IcosahedronGeometry(1, 1);
      g.scale(1, 0.82, 1);
      return g;
    }
  },
  3: {
    hue: 0.36, sat: 0.50, light: 0.27,
    build: () => {
      const g = new THREE.ConeGeometry(0.95, 2.4, 9, 1);
      g.translate(0, 0.35, 0);
      return g;
    }
  },
  4: {
    hue: 0.25, sat: 0.58, light: 0.44,
    build: () => {
      const g = new THREE.CylinderGeometry(1.25, 0.22, 0.75, 7);
      g.scale(1.2, 0.85, 1.2);
      return g;
    }
  },
  5: {
    hue: 0.94, sat: 0.52, light: 0.62,
    build: () => new THREE.DodecahedronGeometry(1, 1)
  },
  6: {
    hue: 0.29, sat: 0.44, light: 0.34,
    build: () => {
      const g = new THREE.SphereGeometry(1, 7, 5);
      g.scale(1.2, 0.62, 1.2);
      return g;
    }
  }
};

// 以座標產生穩定的偽亂數，重新整理頁面時每棵樹造型固定
function treeRand(px, py, salt) {
  const v = Math.sin(px * 12.9898 + py * 78.233 + salt * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

function disposeTreeGroup() {
  collisionCircles.length = 0;
  while (treeGroup.children.length > 0) {
    const m = treeGroup.children[0];
    treeGroup.remove(m);
    m.geometry.dispose();
    m.material.dispose();
    if (m.dispose) m.dispose();
  }
}

/**
 * 以 InstancedMesh 建立整片樹林。
 * @param {Array<[number, number, number, number]>} rows - [px, py, r, tone]，座標為平面圖像素
 * @returns {{count: number, drawCalls: number, ms: number}}
 */
function buildTreesInstanced(rows) {
  const t0 = performance.now();
  disposeTreeGroup();
  if (!rows.length) return { count: 0, drawCalls: 0, ms: 0 };

  const byTone = {};
  Object.keys(TREE_TONES).forEach((k) => { byTone[k] = []; });
  rows.forEach((row) => {
    const toneKey = TREE_TONES[row[3]] ? row[3] : 2;
    byTone[toneKey].push(row);
  });

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // 登錄所有樹木樹幹之實體碰撞圓形（半徑配合樹冠與樹幹半徑，人物不能穿過樹木）
  rows.forEach(([px, py, pr]) => {
    const wx = pxToWorldX(px);
    const wz = pyToWorldZ(py);
    const crownR = Math.max(1.1, Math.min(6, pr * SCALE));
    const trunkR = Math.max(0.48, Math.min(1.2, 0.28 + crownR * 0.14));
    collisionCircles.push({
      x: wx,
      z: wz,
      r: trunkR,
      type: 'tree',
      name: '樹木'
    });
  });

  // 樹幹：單一 InstancedMesh
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 1, 6);
  trunkGeo.translate(0, 0.5, 0);
  const trunkMesh = new THREE.InstancedMesh(
    trunkGeo,
    new THREE.MeshStandardMaterial({ color: 0x6e4f35, roughness: 0.95 }),
    rows.length
  );
  trunkMesh.castShadow = true;
  trunkMesh.name = 'TREE_TRUNKS';

  let trunkIdx = 0;
  let drawCalls = 1;

  Object.entries(byTone).forEach(([toneKey, list]) => {
    if (!list.length) return;
    const tone = TREE_TONES[toneKey];
    const crownMesh = new THREE.InstancedMesh(
      tone.build(),
      new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
      list.length
    );
    crownMesh.castShadow = true;
    crownMesh.receiveShadow = true;
    crownMesh.name = `TREE_CROWNS_TONE_${toneKey}`;

    list.forEach(([px, py, pr], i) => {
      const wx = pxToWorldX(px);
      const wz = pyToWorldZ(py);
      // 平面圖樹冠半徑換算公尺，限制在 1.1 至 6 公尺之間
      const crownR = Math.max(1.1, Math.min(6, pr * SCALE));
      const rand = treeRand(px, py, 1);
      const trunkH = crownR * (1.1 + rand * 0.35) + 0.6;
      const crownH = crownR * (0.95 + treeRand(px, py, 2) * 0.2);

      dummy.position.set(wx, 0, wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1 + crownR * 0.25, trunkH, 1 + crownR * 0.25);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(trunkIdx++, dummy.matrix);

      dummy.position.set(wx, trunkH + crownH * 0.55, wz);
      dummy.rotation.set(0, rand * Math.PI * 2, 0);
      dummy.scale.set(crownR, crownH, crownR);
      dummy.updateMatrix();
      crownMesh.setMatrixAt(i, dummy.matrix);

      color.setHSL(
        tone.hue + (treeRand(px, py, 3) - 0.5) * 0.04,
        tone.sat,
        tone.light + (treeRand(px, py, 4) - 0.5) * 0.08
      );
      crownMesh.setColorAt(i, color);
    });

    crownMesh.instanceMatrix.needsUpdate = true;
    if (crownMesh.instanceColor) crownMesh.instanceColor.needsUpdate = true;
    crownMesh.computeBoundingSphere();
    treeGroup.add(crownMesh);
    drawCalls += 1;
  });

  trunkMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.computeBoundingSphere();
  treeGroup.add(trunkMesh);
  state.needsRender = true;

  const stats = { count: rows.length, drawCalls, ms: Math.round((performance.now() - t0) * 10) / 10 };
  console.info(`[Trees] InstancedMesh 建立 ${stats.count} 棵樹，${stats.drawCalls} 次 draw call，耗時 ${stats.ms} ms`);
  return stats;
}

function buildDetectedTrees() {
  return buildTreesInstanced(TREE_DATA.trees || []);
}

// 壓力測試：在平面圖非建物範圍隨機種植 n 棵樹，驗證 InstancedMesh 的大量渲染能力（網址 #test=trees5000）
function buildStressTrees(n) {
  const rows = [];
  let guard = 0;
  while (rows.length < n && guard < n * 20) {
    guard += 1;
    const px = 30 + treeRand(guard, 7, 5) * (MAP_META.width - 60);
    const py = 70 + treeRand(guard, 11, 6) * (MAP_META.height - 140);
    if (checkBuildingCollision(pxToWorldX(px), pyToWorldZ(py))) continue;
    rows.push([px, py, 8 + treeRand(px, py, 9) * 10, 1 + Math.floor(treeRand(px, py, 8) * 3)]);
  }
  return buildTreesInstanced(rows);
}

// === 6. 樓層切換與自動產生該層 3D 教室方塊與名稱標籤 ===
function clearClassroom3DBlocks() {
  while (classroomBlocksGroup.children.length > 0) {
    const child = classroomBlocksGroup.children[0];
    classroomBlocksGroup.remove(child);
  }
  roomMeshes.length = 0;
  roomLabelElements.forEach((item) => item.el.remove());
  roomLabelElements.length = 0;
}

function generateClassroom3DBlocks(buildingId, floorKey, highlightRoomId = null) {
  clearClassroom3DBlocks();
  if (!buildingId || floorKey === 'ALL') return;

  const bObj = buildingMap.get(buildingId);
  if (!bObj || bObj.data.sensitive) return;

  const cfg = CLASSROOMS.buildings[buildingId];
  if (!cfg || !cfg.floors || !cfg.floors[floorKey]) return;

  const rooms = cfg.floors[floorKey];
  const mainPart = bObj.data.parts[0];
  const totalW = mainPart.pw * SCALE;
  const totalD = mainPart.ph * SCALE;
  const startX = pxToWorldX(mainPart.px);
  const startZ = pyToWorldZ(mainPart.py);

  const floorNum = floorKey === 'B1' ? 0 : parseInt(floorKey.replace('F', ''), 10);
  const baseY = floorNum === 0 ? -FLOOR_H : (floorNum - 1) * FLOOR_H;

  const totalSpan = rooms.reduce((acc, r) => acc + (r.span || 1), 0);
  const isLongZ = totalD > totalW * 1.15;

  let cursor = 0;
  rooms.forEach((r) => {
    const span = r.span || 1;
    const ratio = span / totalSpan;

    let rx, rz, rw, rd;
    // 依據「教室配置圖右側為西方（平面圖上方 -Z）」精確對齊：
    // 配置圖由左（東 +Z）至右（西 -Z）排列時，3D 座標由 +Z 往 -Z 排布！
    if (isLongZ) {
      rw = totalW * 0.92;
      rd = totalD * ratio * 0.92;
      rx = startX + totalW / 2;
      rz = startZ + totalD * (1 - (cursor + ratio / 2));
    } else {
      rw = totalW * ratio * 0.92;
      rd = totalD * 0.92;
      rx = startX + totalW * (cursor + ratio / 2);
      rz = startZ + totalD / 2;
    }
    cursor += ratio;

    const isSelected = r.id === highlightRoomId;
    let fillHex = 0xffffff;
    if (isSelected) fillHex = 0xe53935;
    else if (r.hasAED) fillHex = 0xffcdd2;
    else if (r.type === 'class') fillHex = 0xfff9c4;
    else if (r.type === 'office') fillHex = 0xdcedc8;
    else if (r.type === 'lab') fillHex = 0xb3e5fc;
    else if (r.type === 'hollow' || r.bg === '#d9d9d9') fillHex = 0xcfd8dc;
    else if (r.type === 'service') fillHex = 0xe0e0e0;

    const blockH = FLOOR_H * 0.82;
    const geo = new THREE.BoxGeometry(Math.max(1.2, rw), blockH, Math.max(1.2, rd));
    const is214 = (r.name === '214' || r.id === 'zz-507');
    const mat = new THREE.MeshStandardMaterial({
      color: fillHex,
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: is214 ? 0.18 : (isSelected ? 0.98 : 0.9),
      depthWrite: !is214
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rx, baseY + blockH / 2 + 0.15, rz);
    mesh.userData = { roomId: r.id, buildingId, floorKey, roomData: r };

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: isSelected ? 0xb71c1c : 0x263238 })
    );
    mesh.add(line);

    classroomBlocksGroup.add(mesh);
    roomMeshes.push(mesh);

    const rLabel = document.createElement('div');
    rLabel.className = 'room-3d-label' + (isSelected ? ' highlight' : '');
    rLabel.textContent = r.name;
    rLabel.addEventListener('click', (e) => {
      e.stopPropagation();
      focusOnRoom(buildingId, floorKey, r.id);
    });
    labelsContainer.appendChild(rLabel);

    roomLabelElements.push({
      id: r.id,
      buildingId,
      floorKey,
      el: rLabel,
      worldPos: new THREE.Vector3(rx, baseY + blockH + 1.1, rz),
      isSelected
    });
  });
}

function applyFloorVisibility(targetBuildingId, floorKey) {
  state.selectedFloor = floorKey;

  document.querySelectorAll('.floor-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.floor === floorKey);
  });

  if (groundMesh) {
    groundMesh.material.transparent = (floorKey === 'B1');
    groundMesh.material.opacity = (floorKey === 'B1') ? 0.32 : 1.0;
    groundMesh.material.needsUpdate = true;
  }

  buildingMap.forEach((bObj, bid) => {
    const isTarget = !targetBuildingId || bid === targetBuildingId;
    const maxF = bObj.data.floors;
    const hasRoomsOnFloor = CLASSROOMS.buildings[bid] && CLASSROOMS.buildings[bid].floors && CLASSROOMS.buildings[bid].floors[floorKey];

    if (floorKey === 'ALL') {
      bObj.floorGroups[0].visible = false;
      for (let f = 1; f <= maxF; f++) {
        bObj.floorGroups[f].visible = true;
      }
    } else if (floorKey === 'B1') {
      bObj.floorGroups[0].visible = true;
      for (let f = 1; f <= maxF; f++) {
        bObj.floorGroups[f].visible = isTarget ? false : true;
      }
    } else {
      const fNum = parseInt(floorKey.replace('F', ''), 10);
      bObj.floorGroups[0].visible = false;
      for (let f = 1; f <= maxF; f++) {
        if (isTarget) {
          if (bObj.data.sensitive || !hasRoomsOnFloor) {
            bObj.floorGroups[f].visible = (f <= fNum);
          } else {
            bObj.floorGroups[f].visible = (f < fNum);
          }
        } else {
          bObj.floorGroups[f].visible = (f <= fNum);
        }
      }
    }
  });

  if (targetBuildingId && floorKey !== 'ALL') {
    generateClassroom3DBlocks(targetBuildingId, floorKey, state.selectedRoomId);
  } else {
    clearClassroom3DBlocks();
  }

  document.querySelectorAll('.pdf-floor-row').forEach((row) => {
    row.classList.toggle('active-floor-row', row.dataset.floor === floorKey);
  });

  state.needsRender = true;
}

// === 7. 點選建物、右側配置表面板渲染與鏡頭平滑飛躍 ===
function selectBuilding(buildingId, floorKey = 'ALL', highlightRoomId = null, flyCamera = true) {
  const bObj = buildingMap.get(buildingId);
  if (!bObj) return;

  state.selectedBuildingId = buildingId;
  state.selectedRoomId = highlightRoomId;

  labelElements.forEach((item) => {
    item.el.classList.toggle('active', item.id === buildingId);
  });

  if (window.innerWidth <= 1024) {
    document.getElementById('left-dock')?.classList.add('mobile-collapsed');
    const toggleBtn = document.getElementById('mobile-dock-toggle-btn');
    if (toggleBtn) toggleBtn.textContent = '路線與導覽 ▴';
  }

  renderRightPanel(bObj.data, floorKey, highlightRoomId);
  applyFloorVisibility(buildingId, floorKey);

  if (flyCamera && state.viewMode === 'birdseye') {
    const targetPos = bObj.centerWorld.clone();
    const isMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    if (isMobilePortrait) {
      // 手機直向時底部抽屜占據下方約 42% 高度，將相機注視點往畫面下方推移，使建物落於上半部可視區中央
      targetPos.z += 14;
    }
    const offset = buildingId === 'eco_pond'
      ? new THREE.Vector3(-8, 66, 34)
      : new THREE.Vector3(35, Math.max(42, bObj.data.floors * 11), 52);
    animateCameraTo(targetPos.clone().add(offset), targetPos);
  }
}

function renderRightPanel(bData, activeFloorKey, highlightRoomId) {
  const panel = document.getElementById('right-panel');
  panel.classList.remove('collapsed');

  document.getElementById('panel-category').textContent = bData.category;
  document.getElementById('panel-title').textContent = bData.name;
  document.getElementById('stat-floors').textContent = `${bData.floors} 層` + (bData.hasBasement ? ' + B1' : '');
  const hVal = bData.parts[0].heightM ? bData.parts[0].heightM : (bData.floors * FLOOR_H);
  document.getElementById('stat-height').textContent = `${hVal.toFixed(1)} m`;

  const cfg = CLASSROOMS.buildings[bData.id];
  let totalRooms = 0;
  if (cfg && cfg.floors) {
    Object.entries(cfg.floors).forEach(([fk, arr]) => {
      if (fk !== 'B1') {
        totalRooms += arr.filter((r) => r.type !== 'service' && r.type !== 'hollow').length;
      }
    });
  }
  document.getElementById('stat-rooms').textContent = bData.sensitive ? '管制區' : (totalRooms > 0 ? `${totalRooms} 間` : `${bData.parts.length} 區`);
  document.getElementById('panel-desc').textContent = bData.description;

  const containerEl = document.getElementById('panel-config-container');
  containerEl.innerHTML = '';

  if (bData.sensitive) {
    const warnEl = document.createElement('div');
    warnEl.className = 'sensitive-banner';
    warnEl.textContent = '安全與後勤管制提示：本區域（' + bData.name + '）屬於校園環保後勤管制設施，僅呈現 3D 立體外觀量體。';
    containerEl.appendChild(warnEl);
    return;
  }

  if (!cfg || !cfg.floors) {
    // 針對校園景觀、花圃、停車場、球場顯示分區清單
    const wrapper = document.createElement('div');
    wrapper.className = 'config-table-wrapper';
    wrapper.innerHTML = `<div class="config-table-header"><h3>${bData.name} 包含之立體設施分區</h3></div>`;
    const table = document.createElement('div');
    table.className = 'pdf-floor-table';
    bData.parts.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'pdf-floor-row';
      row.innerHTML = `
        <div class="pdf-floor-label">${idx + 1}</div>
        <div class="pdf-rooms-strip">
          <div class="pdf-room-cell">${p.name || bData.name}（面積約 ${Math.round(p.pw * SCALE * p.ph * SCALE)} m²）</div>
        </div>
      `;
      table.appendChild(row);
    });
    wrapper.appendChild(table);
    containerEl.appendChild(wrapper);
    return;
  }

  // 若選中中正樓 5F 214 教室，在配置表面板上方最醒目處加入「學校行事曆」與排在其下方的「214 班 學生服務入口」
  if (highlightRoomId === 'zz-507') {
    const portalBox = document.createElement('div');
    portalBox.style.cssText = 'margin: 0 0 14px; padding: 14px; background: linear-gradient(135deg, rgba(26,93,87,0.06) 0%, rgba(76,114,159,0.10) 100%); border: 1.5px solid #4c729f; border-radius: 12px;';
    portalBox.innerHTML = `
      <div style="font-weight: 700; color: #1a5d57; font-size: 0.95rem; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 6px;">🌟 214 教室專屬服務平台</span>
        <span style="font-size: 0.72rem; color: #4c729f; background: rgba(76,114,159,0.12); padding: 2px 8px; border-radius: 10px; font-weight: 600;">學生與導師專區</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <!-- 學校行事曆 -->
        <a href="https://maxchan-stack.github.io/bulletin-board-web/calendar.pdf" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #ffffff; border-radius: 8px; color: #7a59a0; text-decoration: none; font-weight: 600; font-size: 0.88rem; border: 1.5px solid #7a59a0; transition: all 0.2s ease;">
          <span style="display: flex; align-items: center; gap: 6px;">📅 學校行事曆 (中正高中)</span>
          <span style="font-size: 0.8rem; background: rgba(122,89,160,0.12); padding: 2px 8px; border-radius: 6px;">查閱 ↗</span>
        </a>
        <!-- 排在學校行事曆下方：214 班 學生服務入口 -->
        <a href="https://maxchan-stack.github.io/bulletin-board-web/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #4c729f; border-radius: 8px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 0.88rem; transition: all 0.2s ease;">
          <span style="display: flex; align-items: center; gap: 6px;">🎓 214 班 學生服務入口</span>
          <span style="font-size: 0.8rem; background: rgba(255,255,255,0.22); padding: 2px 8px; border-radius: 6px;">進入入口 ➔</span>
        </a>
      </div>
    `;
    containerEl.appendChild(portalBox);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'config-table-wrapper';

  const header = document.createElement('div');
  header.className = 'config-table-header';
  header.innerHTML = `
    <h3>${bData.name} 樓層配置表（點擊切換 3D 剖面）</h3>
    <div class="config-legend">
      <span><i class="legend-box" style="background:#ffffff"></i>教室/處室</span>
      <span><i class="legend-box" style="background:#d9d9d9"></i>架空/特殊</span>
      <span>右側為西方</span>
    </div>
  `;
  wrapper.appendChild(header);

  const table = document.createElement('div');
  table.className = 'pdf-floor-table';

  const floorOrder = ['5F', '4F', '3F', '2F', '1F', 'B1'].filter((fk) => cfg.floors[fk]);
  floorOrder.forEach((fk) => {
    const row = document.createElement('div');
    row.className = 'pdf-floor-row' + (fk === activeFloorKey ? ' active-floor-row' : '');
    row.dataset.floor = fk;

    const label = document.createElement('div');
    label.className = 'pdf-floor-label';
    label.textContent = fk === 'B1' ? '地下' : fk.replace('F', '樓');
    label.title = `點擊檢視 ${bData.name} ${fk} 3D 教室配置`;
    label.addEventListener('click', () => {
      applyFloorVisibility(bData.id, fk);
    });
    row.appendChild(label);

    const strip = document.createElement('div');
    strip.className = 'pdf-rooms-strip';

    cfg.floors[fk].forEach((r) => {
      const cell = document.createElement('div');
      let cls = 'pdf-room-cell';
      if (r.type === 'hollow' || r.bg === '#d9d9d9') cls += ' hollow-cell';
      else if (r.type === 'service') cls += ' service-cell';
      else if (r.type === 'basement') cls += ' basement-cell';
      if (r.hasAED) cls += ' aed-cell';
      if (r.id === highlightRoomId) cls += ' selected-cell';

      cell.className = cls;
      cell.style.flex = String(r.span || 1);
      cell.textContent = r.name;
      cell.title = r.fullName || r.name;
      cell.addEventListener('click', () => {
        focusOnRoom(bData.id, fk, r.id);
      });
      strip.appendChild(cell);
    });

    row.appendChild(strip);
    table.appendChild(row);
  });

  wrapper.appendChild(table);
  containerEl.appendChild(wrapper);
}

function focusOnRoom(buildingId, floorKey, roomId) {
  state.selectedBuildingId = buildingId;
  state.selectedRoomId = roomId;

  const bObj = buildingMap.get(buildingId);
  if (!bObj) return;

  if (state.viewMode !== 'birdseye') {
    setViewMode('birdseye');
  }

  renderRightPanel(bObj.data, floorKey, roomId);
  applyFloorVisibility(buildingId, floorKey);

  if (window.innerWidth <= 768) {
    // 手機點選特定教室後自動收合底部配置面板，讓 3D 剖面與高亮教室完整呈現於視野中央
    document.getElementById('right-panel')?.classList.add('collapsed');
    document.getElementById('left-dock')?.classList.add('mobile-collapsed');
    const toggleBtn = document.getElementById('mobile-dock-toggle-btn');
    if (toggleBtn) toggleBtn.textContent = '路線與導覽 ▴';
  }

  const targetMesh = roomMeshes.find((m) => m.userData.roomId === roomId);
  if (targetMesh) {
    const worldPos = targetMesh.position.clone();
    const camPos = worldPos.clone().add(new THREE.Vector3(18, 24, 28));
    animateCameraTo(camPos, worldPos);
    const roomName = targetMesh.userData.roomData.fullName || targetMesh.userData.roomData.name;
    if (targetMesh.userData.roomData.name === '214') {
      showToast('✨ 二年 14 班 (214 教室)：天降金色聖光與尊榮光暈，與眾不凡！');
    } else {
      showToast(`已定位：${bObj.data.name} ${floorKey} — ${roomName}`);
    }
  }
}

function animateCameraTo(targetCamPos, targetLookAt) {
  state.cameraTween = {
    startCam: camera.position.clone(),
    endCam: targetCamPos.clone(),
    startTarget: controls.target.clone(),
    endTarget: targetLookAt.clone(),
    startTime: performance.now(),
    duration: 850
  };
  state.needsRender = true;
}

// === 8. 全域搜尋引擎（班級號碼、處室、專科教室、建物與校園設施） ===
const searchIndex = [];
function buildSearchIndex() {
  BUILDINGS.forEach((b) => {
    searchIndex.push({
      kind: '建物/設施',
      title: b.name,
      subtitle: b.category,
      keywords: [b.name, ...(b.aliases || []), b.category, ...b.parts.map((p) => p.name || '')].join(' ').toLowerCase(),
      buildingId: b.id,
      floorKey: 'ALL',
      roomId: null
    });

    const cfg = CLASSROOMS.buildings[b.id];
    if (cfg && cfg.floors && !b.sensitive) {
      Object.entries(cfg.floors).forEach(([fk, rooms]) => {
        rooms.forEach((r) => {
          if (r.type === 'service' && r.name === '樓梯') return;
          const badge = r.type === 'class' ? '班級教室' : (r.type === 'office' ? '行政處室' : '專科空間');
          searchIndex.push({
            kind: badge,
            title: `${r.name} ${r.fullName && r.fullName !== r.name ? '— ' + r.fullName : ''}`,
            subtitle: `${b.name} ${fk}`,
            keywords: `${r.name} ${r.fullName || ''} ${b.name} ${(b.aliases || []).join(' ')} ${fk}`.toLowerCase(),
            buildingId: b.id,
            floorKey: fk,
            roomId: r.id
          });
        });
      });
    }
  });
}

function setupSearchUI() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const resultsEl = document.getElementById('search-results');

  function runSearch(q) {
    const query = q.trim().toLowerCase();
    clearBtn.style.display = query ? 'flex' : 'none';
    if (!query) {
      resultsEl.classList.remove('open');
      resultsEl.innerHTML = '';
      return;
    }

    const matched = searchIndex
      .filter((item) => item.keywords.includes(query))
      .slice(0, 18);

    resultsEl.innerHTML = '';
    if (matched.length === 0) {
      resultsEl.innerHTML = `<div class="search-item"><span class="search-item-sub">找不到符合「${q}」的班級、處室或設施</span></div>`;
    } else {
      matched.forEach((m) => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
          <div>
            <div class="search-item-title">${m.title}</div>
            <div class="search-item-sub">${m.subtitle}</div>
          </div>
          <span class="search-item-badge">${m.kind}</span>
        `;
        div.addEventListener('click', () => {
          resultsEl.classList.remove('open');
          input.value = m.title.split(' — ')[0];
          if (m.roomId) {
            focusOnRoom(m.buildingId, m.floorKey, m.roomId);
          } else {
            selectBuilding(m.buildingId, 'ALL', null, true);
          }
        });
        resultsEl.appendChild(div);
      });
    }
    resultsEl.classList.add('open');
  }

  input.addEventListener('input', (e) => runSearch(e.target.value));
  input.addEventListener('focus', (e) => {
    if (e.target.value.trim()) runSearch(e.target.value);
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    runSearch('');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      resultsEl.classList.remove('open');
    }
  });
}

// === 9. A* 步道路網演算法、轉彎指示與 3D 導引線 ===
const routeGroup = new THREE.Group();
scene.add(routeGroup);

const nodeMap = new Map();
const adjList = new Map();

function initRoadGraph() {
  ROAD_NET.nodes.forEach((n) => {
    const wx = pxToWorldX(n.px);
    const wz = pyToWorldZ(n.py);
    nodeMap.set(n.id, { ...n, wx, wz });
    adjList.set(n.id, []);
  });

  ROAD_NET.edges.forEach(([u, v]) => {
    const nu = nodeMap.get(u);
    const nv = nodeMap.get(v);
    if (!nu || !nv) return;
    const dist = Math.hypot(nu.wx - nv.wx, nu.wz - nv.wz);
    adjList.get(u).push({ to: v, weight: dist });
    adjList.get(v).push({ to: u, weight: dist });
  });
}

function findAStarPath(startId, goalId) {
  if (!nodeMap.has(startId) || !nodeMap.has(goalId)) return null;
  const goalNode = nodeMap.get(goalId);
  const openSet = new Set([startId]);
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  nodeMap.forEach((_, id) => {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
  });

  const startNode = nodeMap.get(startId);
  gScore.set(startId, 0);
  fScore.set(startId, Math.hypot(startNode.wx - goalNode.wx, startNode.wz - goalNode.wz));

  while (openSet.size > 0) {
    let current = null;
    let bestF = Infinity;
    openSet.forEach((id) => {
      const f = fScore.get(id);
      if (f < bestF) {
        bestF = f;
        current = id;
      }
    });

    if (current === goalId) {
      const path = [current];
      while (cameFrom.has(current)) {
        current = cameFrom.get(current);
        path.unshift(current);
      }
      return path.map((id) => nodeMap.get(id));
    }

    openSet.delete(current);
    const neighbors = adjList.get(current) || [];
    for (const edge of neighbors) {
      const tentativeG = gScore.get(current) + edge.weight;
      if (tentativeG < gScore.get(edge.to)) {
        cameFrom.set(edge.to, current);
        gScore.set(edge.to, tentativeG);
        const nb = nodeMap.get(edge.to);
        const h = Math.hypot(nb.wx - goalNode.wx, nb.wz - goalNode.wz);
        fScore.set(edge.to, tentativeG + h);
        openSet.add(edge.to);
      }
    }
  }
  return null;
}

function computeRouteDetails(pathNodes) {
  if (!pathNodes || pathNodes.length < 2) return null;

  let totalDist = 0;
  const turns = [];

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const a = pathNodes[i];
    const b = pathNodes[i + 1];
    const segDist = Math.hypot(b.wx - a.wx, b.wz - a.wz);
    totalDist += segDist;

    if (i === 0) {
      const dirText = getCompassDirection(b.wx - a.wx, b.wz - a.wz);
      turns.push({
        step: 1,
        text: `由「${a.name}」出發，往${dirText}直行至「${b.name}」`,
        dist: `${Math.round(segDist)} m`
      });
    } else {
      const prev = pathNodes[i - 1];
      const v1x = a.wx - prev.wx;
      const v1z = a.wz - prev.wz;
      const v2x = b.wx - a.wx;
      const v2z = b.wz - a.wz;
      const cross = v1x * v2z - v1z * v2x;
      const dot = v1x * v2x + v1z * v2z;
      const angleDeg = (Math.atan2(cross, dot) * 180) / Math.PI;

      let action = '直行';
      if (angleDeg > 28) action = '右轉';
      else if (angleDeg < -28) action = '左轉';

      turns.push({
        step: i + 1,
        text: `於「${a.name}」${action}，前往「${b.name}」`,
        dist: `${Math.round(segDist)} m`
      });
    }
  }

  turns.push({
    step: turns.length + 1,
    text: `抵達目的地：「${pathNodes[pathNodes.length - 1].name}」`,
    dist: '終點'
  });

  const points3D = pathNodes.map((n) => new THREE.Vector3(n.wx, 0.55, n.wz));
  const curve = new THREE.CatmullRomCurve3(points3D, false, 'catmullrom', 0.15);

  return {
    pathNodes,
    distanceMeters: Math.round(totalDist),
    timeMinutes: Math.max(1, Math.round(totalDist / (ROAD_NET.walkingSpeedMps * 60))),
    turns,
    curve
  };
}

// 依據「校園平面圖右邊為北方 (+X = North)」計算方位：
// +X 為北方，+Z（下方）為東方，-X（左方）為南方，-Z（上方）為西方
function getCompassDirection(dx, dz) {
  const angle = (Math.atan2(dz, dx) * 180) / Math.PI; // +X (North) = 0 deg, +Z (East) = 90 deg
  const norm = (angle + 360) % 360;
  if (norm >= 315 || norm < 45) return '北方';
  if (norm >= 45 && norm < 135) return '東方';
  if (norm >= 135 && norm < 225) return '南方';
  return '西方';
}

function renderRoute3D(routeInfo) {
  while (routeGroup.children.length > 0) {
    routeGroup.remove(routeGroup.children[0]);
  }
  const navBar = document.getElementById('nav-status-bar');
  const progBar = document.getElementById('nav-walk-progress-bar');

  if (!routeInfo) {
    state.activeRoute = null;
    if (navBar) navBar.classList.remove('visible');
    if (progBar) progBar.style.width = '0%';
    state.needsRender = true;
    drawMinimap();
    return;
  }

  state.activeRoute = routeInfo;

  const tubeGeo = new THREE.TubeGeometry(routeInfo.curve, Math.max(24, routeInfo.pathNodes.length * 10), 0.55, 8, false);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.45,
    roughness: 0.3
  });
  const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
  routeGroup.add(tubeMesh);

  const startNode = routeInfo.pathNodes[0];
  const endNode = routeInfo.pathNodes[routeInfo.pathNodes.length - 1];

  const pinGeo = new THREE.CylinderGeometry(0.9, 0.2, 5.5, 16);
  pinGeo.translate(0, 2.75, 0);
  const startMesh = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color: 0x2b5b44, emissive: 0x1b4332, emissiveIntensity: 0.3 }));
  startMesh.position.set(startNode.wx, 0, startNode.wz);
  routeGroup.add(startMesh);

  const endMesh = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color: 0xc94a38, emissive: 0x8f2d1e, emissiveIntensity: 0.3 }));
  endMesh.position.set(endNode.wx, 0, endNode.wz);
  routeGroup.add(endMesh);

  if (navBar && state.viewMode !== 'fpv') {
    navBar.classList.add('visible');
    const titleEl = document.getElementById('nav-route-title');
    const metaEl = document.getElementById('nav-route-meta');
    if (titleEl) titleEl.textContent = `${startNode.name} → ${endNode.name}`;
    if (metaEl) metaEl.textContent = `總長 ${routeInfo.distanceMeters} 公尺 · 步行約 ${routeInfo.timeMinutes} 分鐘`;
  }

  state.needsRender = true;
  drawMinimap();
}

// === 10. 第三人稱與第一人稱漫遊、3D 同學角色模型與 214 教室實景視角 ===
const studentAvatarGroup = new THREE.Group();
studentAvatarGroup.visible = false;
scene.add(studentAvatarGroup);
let avatarLimbs = { leftArm: null, rightArm: null, leftLeg: null, rightLeg: null };

function buildStudentAvatar(gender = 'boy') {
  while (studentAvatarGroup.children.length > 0) {
    studentAvatarGroup.remove(studentAvatarGroup.children[0]);
  }
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfad2b8, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x232020, roughness: 0.85 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf7f9fb, roughness: 0.65 }); // 中正白色制服上衣
  const bottomMat = new THREE.MeshStandardMaterial({
    color: gender === 'girl' ? 0x1e293b : 0x273549,
    roughness: 0.75
  });
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.7 });

  // 頭部與髮型
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
  head.position.set(0, 1.56, 0);
  head.castShadow = true;
  studentAvatarGroup.add(head);

  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.22, 0.50), hairMat);
  hairCap.position.set(0, 1.72, 0);
  studentAvatarGroup.add(hairCap);

  if (gender === 'girl') {
    const ponytail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), hairMat);
    ponytail.position.set(0, 1.48, 0.28);
    ponytail.rotation.x = 0.25;
    studentAvatarGroup.add(ponytail);
  }

  // 軀幹與書包
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.62, 0.28), shirtMat);
  torso.position.set(0, 1.02, 0);
  torso.castShadow = true;
  studentAvatarGroup.add(torso);

  if (gender === 'girl') {
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.32, 8), bottomMat);
    skirt.position.set(0, 0.66, 0);
    studentAvatarGroup.add(skirt);
  }

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.18), bagMat);
  backpack.position.set(0, 1.04, 0.22);
  studentAvatarGroup.add(backpack);

  // 四肢（以關節點為旋轉軸心，走路時自然擺動）
  function makeLimb(w, h, d, mat, x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(0, -h / 2, 0);
    mesh.castShadow = true;
    pivot.add(mesh);
    studentAvatarGroup.add(pivot);
    return pivot;
  }

  avatarLimbs.leftArm = makeLimb(0.16, 0.54, 0.16, shirtMat, -0.35, 1.28, 0);
  avatarLimbs.rightArm = makeLimb(0.16, 0.54, 0.16, shirtMat, 0.35, 1.28, 0);
  avatarLimbs.leftLeg = makeLimb(0.18, 0.66, 0.18, bottomMat, -0.14, 0.68, 0);
  avatarLimbs.rightLeg = makeLimb(0.18, 0.66, 0.18, bottomMat, 0.14, 0.68, 0);
}
buildStudentAvatar('boy');

function animateStudentAvatar(now, isMoving) {
  if (!studentAvatarGroup.visible) return;
  const groundY = Math.max(0, state.fpv.pos.y - 1.72);
  studentAvatarGroup.position.set(state.fpv.pos.x, groundY, state.fpv.pos.z);
  studentAvatarGroup.rotation.y = -state.fpv.yaw;

  if (isMoving) {
    const freq = state.walkPace === 'run' ? 0.016 : 0.010;
    const amp = state.walkPace === 'run' ? 0.85 : 0.55;
    const swing = Math.sin(now * freq) * amp;
    if (avatarLimbs.leftArm) avatarLimbs.leftArm.rotation.x = swing;
    if (avatarLimbs.rightArm) avatarLimbs.rightArm.rotation.x = -swing;
    if (avatarLimbs.leftLeg) avatarLimbs.leftLeg.rotation.x = -swing;
    if (avatarLimbs.rightLeg) avatarLimbs.rightLeg.rotation.x = swing;
  } else {
    if (avatarLimbs.leftArm) avatarLimbs.leftArm.rotation.x *= 0.8;
    if (avatarLimbs.rightArm) avatarLimbs.rightArm.rotation.x *= 0.8;
    if (avatarLimbs.leftLeg) avatarLimbs.leftLeg.rotation.x *= 0.8;
    if (avatarLimbs.rightLeg) avatarLimbs.rightLeg.rotation.x *= 0.8;
  }
}

function checkBuildingCollision(nx, nz) {
  const charR = 0.32; // 人物身軀半徑緩衝

  // 特殊處理：若人物在 5F 高度 (Y >= 13.5)，位於 214 教室室內或 5F 戶外連通空橋
  if (state.fpv && state.fpv.pos.y >= 13.5) {
    // 允許範圍：5F 連通空橋 (X: [61.2, 63.6], Z: [-4.2, 5.5]) 或 214 教室室內 (X: [55.2, 62.0], Z: [3.5, 9.2])
    const onBridge = (nx >= 61.2 && nx <= 63.6 && nz >= -4.2 && nz <= 5.5);
    const in214Room = (nx >= 55.2 && nx <= 62.0 && nz >= 3.5 && nz <= 9.2);
    if (onBridge || in214Room) {
      return null; // 在安全 5F 走道或室內，不阻擋
    }
    // 若超出 5F 安全活動範圍，阻擋防止墜落
    return { name: '5F 露台安全護欄', type: 'railing' };
  }

  // 1. 建築物與車輛矩形邊界盒碰撞判定
  for (const box of collisionBoxes) {
    if (
      nx >= box.minX - charR &&
      nx <= box.maxX + charR &&
      nz >= box.minZ - charR &&
      nz <= box.maxZ + charR
    ) {
      return box;
    }
  }

  // 2. 樹木樹幹實體圓形碰撞判定（人物不能穿過樹木）
  for (const tc of collisionCircles) {
    const dx = nx - tc.x;
    const dz = nz - tc.z;
    const minDist = tc.r + charR;
    if (dx * dx + dz * dz <= minDist * minDist) {
      return tc;
    }
  }

  return null;
}

function setViewMode(mode) {
  state.viewMode = mode;
  const isFpv = mode === 'fpv';
  document.body.classList.toggle('fpv-mode', isFpv);
  document.getElementById('btn-mode-bird')?.classList.toggle('active', !isFpv);
  document.getElementById('btn-mode-fpv')?.classList.toggle('active', isFpv);
  document.getElementById('btn-reset-cam')?.classList.toggle('active', !isFpv);
  document.getElementById('walk-hud-bar')?.classList.toggle('visible', isFpv);

  if (isFpv) {
    controls.enabled = false;
    document.getElementById('nav-status-bar')?.classList.remove('visible');
    if (window.innerWidth <= 768) {
      const walkBar = document.getElementById('walk-hud-bar');
      walkBar?.classList.add('minimized');
      const colBtn = document.getElementById('walk-hud-collapse-btn');
      if (colBtn) colBtn.textContent = '展開面板';
    }
    const startX = state.activeRoute ? state.activeRoute.pathNodes[0].wx : pxToWorldX(1005);
    const startZ = state.activeRoute ? state.activeRoute.pathNodes[0].wz : pyToWorldZ(915);
    state.fpv.pos.set(startX, 1.72, startZ);
    state.fpv.pitch = 0;
    studentAvatarGroup.visible = (state.walkPersp === '3rd');
    syncFpvCamera();
    showToast('已進入地面漫步冒險：可切換男／女同學角色、第三／第一人稱視角或瞬移至各大景點');
  } else {
    state.autoWalking = false;
    state.fpv.targetWalkPoint = null;
    studentAvatarGroup.visible = false;
    controls.enabled = true;
    if (state.activeRoute) {
      document.getElementById('nav-status-bar')?.classList.add('visible');
    }
    const lookTarget = state.fpv.pos.clone();
    lookTarget.y = 0;
    animateCameraTo(lookTarget.clone().add(new THREE.Vector3(0, 120, 110)), lookTarget);
  }
  state.needsRender = true;
}

function syncFpvCamera() {
  const sinY = Math.sin(state.fpv.yaw);
  const cosY = Math.cos(state.fpv.yaw);
  const groundY = Math.max(0, state.fpv.pos.y - 1.72);

  if (state.viewMode === 'fpv' && state.walkPersp === '3rd') {
    studentAvatarGroup.visible = true;
    const distBack = 5.4;
    const camHeight = 3.2 - Math.sin(state.fpv.pitch) * 1.8;
    camera.position.set(
      state.fpv.pos.x - sinY * distBack,
      groundY + Math.max(1.2, camHeight),
      state.fpv.pos.z + cosY * distBack
    );
    camera.lookAt(
      state.fpv.pos.x + sinY * 4.5,
      groundY + 1.45 + Math.sin(state.fpv.pitch) * 1.5,
      state.fpv.pos.z - cosY * 4.5
    );
  } else {
    studentAvatarGroup.visible = false;
    camera.position.copy(state.fpv.pos);
    const lookDir = new THREE.Vector3(
      sinY * Math.cos(state.fpv.pitch),
      Math.sin(state.fpv.pitch),
      -cosY * Math.cos(state.fpv.pitch)
    );
    camera.lookAt(state.fpv.pos.clone().add(lookDir));
  }
}

function startRouteAutoWalk() {
  if (!state.activeRoute) {
    showToast('請先計算一條校園路線或選擇精選導覽');
    return;
  }
  state.autoWalking = true;
  state.autoWalkProgress = 0;
  state.fpv.targetWalkPoint = null;
  const simBtn = document.getElementById('sim-walk-btn');
  if (simBtn) simBtn.textContent = '暫停帶路';
  if (state.viewMode === 'birdseye') {
    studentAvatarGroup.visible = true;
    showToast('開始沿規劃路線模擬帶路（可於底部切換速度與跟隨視角高度）');
  } else {
    showToast('開始沿規劃路線自動導覽行走');
  }
}

// === 11. 標籤自動避讓演算法与 3D 羅盤同步 ===
function updateCompass() {
  const dial = document.getElementById('compass-dial');
  const txt = document.getElementById('compass-heading-txt');
  if (!dial) return;

  // 校園平面圖右邊 (+X) 為北方：計算相機視線方向在 XZ 平面的方位角
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  // 當相機往 +X (北方) 看時，羅盤北針朝上 (0 deg)
  const angleRad = Math.atan2(dir.z, dir.x);
  const deg = (angleRad * 180) / Math.PI;
  dial.style.transform = `rotate(${-deg}deg)`;

  if (txt) {
    const dirName = getCompassDirection(dir.x, dir.z);
    txt.textContent = `目前視角朝向：${dirName}`;
  }
}

function updateFloatingLabels() {
  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;
  const placedRects = [];

  const rightPanelEl = document.getElementById('right-panel');
  const rightOpen = rightPanelEl && !rightPanelEl.classList.contains('collapsed');
  const leftDockEl = document.getElementById('left-dock');
  const leftDockExpanded = window.innerWidth <= 1024 && leftDockEl && !leftDockEl.classList.contains('mobile-collapsed');
  const navVisible = document.getElementById('nav-status-bar')?.classList.contains('visible');
  const reopenPill = document.getElementById('reopen-drawer-pill');
  if (reopenPill) {
    reopenPill.classList.toggle(
      'visible',
      !rightOpen && !leftDockExpanded && !navVisible && Boolean(state.selectedBuildingId) && state.viewMode === 'birdseye'
    );
  }

  // 動態讀取當前畫面實際可見 UI 區塊的邊界盒，確保手機、平板與桌機皆精準避讓且不誤擋 3D 標籤
  const uiBlockingEls = [
    document.getElementById('top-bar'),
    document.getElementById('left-dock'),
    document.getElementById('compass-box'),
    rightOpen ? rightPanelEl : null,
    document.getElementById('walk-hud-bar')?.classList.contains('visible') ? document.getElementById('walk-hud-bar') : null,
    document.getElementById('nav-status-bar')?.classList.contains('visible') ? document.getElementById('nav-status-bar') : null
  ];

  for (const el of uiBlockingEls) {
    if (!el) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      placedRects.push({ l: r.left - 4, r: r.right + 4, t: r.top - 4, b: r.bottom + 4 });
    }
  }

  // 周邊道路與方位 3D 標籤投影
  roadLabelElements.forEach((item) => {
    const v = item.worldPos.clone().project(camera);
    if (v.z > 1 || v.z < -1 || state.viewMode === 'fpv') {
      item.el.style.display = 'none';
      return;
    }
    const sx = v.x * halfW + halfW;
    const sy = -v.y * halfH + halfH;
    if (sx < 40 || sx > window.innerWidth - 40 || sy < 70 || sy > window.innerHeight - 40) {
      item.el.style.display = 'none';
      return;
    }
    item.el.style.display = 'block';
    item.el.style.left = `${sx}px`;
    item.el.style.top = `${sy}px`;
  });

  const sortedRoomLabels = [...roomLabelElements].sort((a, b) => (b.isSelected ? 1 : 0) - (a.isSelected ? 1 : 0));
  sortedRoomLabels.forEach((item) => {
    const v = item.worldPos.clone().project(camera);
    if (v.z > 1 || v.z < -1) {
      item.el.style.display = 'none';
      return;
    }
    const sx = v.x * halfW + halfW;
    const sy = -v.y * halfH + halfH;
    item.el.style.display = 'block';

    const w = item.el.offsetWidth || 44;
    const h = item.el.offsetHeight || 20;
    const rOffsets = [
      [0, 0],
      [0, -22],
      [0, 22],
      [-28, -14],
      [28, -14],
      [0, -42],
      [0, 42]
    ];
    let chosen = null;
    for (const [ox, oy] of rOffsets) {
      const cx = sx + ox;
      const cy = sy + oy;
      const rect = { l: cx - w / 2 - 2, r: cx + w / 2 + 2, t: cy - h / 2 - 2, b: cy + h / 2 + 2 };
      const overlaps = placedRects.some(
        (pr) => !(rect.r < pr.l || rect.l > pr.r || rect.b < pr.t || rect.t > pr.b)
      );
      if (!overlaps) {
        chosen = { cx, cy, rect };
        break;
      }
    }
    if (chosen || item.isSelected) {
      const fin = chosen || { cx: sx, cy: sy, rect: { l: sx - w / 2, r: sx + w / 2, t: sy - h / 2, b: sy + h / 2 } };
      placedRects.push(fin.rect);
      item.el.style.left = `${fin.cx}px`;
      item.el.style.top = `${fin.cy}px`;
      item.el.style.opacity = '1';
    } else {
      item.el.style.opacity = '0';
      item.el.style.left = `${sx}px`;
      item.el.style.top = `${sy}px`;
    }
  });

  const isInspectingFloor = state.selectedFloor !== 'ALL' && state.selectedBuildingId;
  const sortedLabels = [...labelElements].sort((a, b) => {
    if (a.id === state.selectedBuildingId) return -1;
    if (b.id === state.selectedBuildingId) return 1;
    return b.priority - a.priority;
  });

  sortedLabels.forEach((item) => {
    if (isInspectingFloor && item.id !== state.selectedBuildingId) {
      item.el.style.opacity = '0';
      item.el.style.pointerEvents = 'none';
      return;
    }
    const v = item.worldPos.clone().project(camera);
    if (v.z > 1 || v.z < -1) {
      item.el.style.opacity = '0';
      item.el.style.pointerEvents = 'none';
      return;
    }

    let sx = v.x * halfW + halfW;
    let sy = -v.y * halfH + halfH;

    const w = item.el.offsetWidth || 92;
    const h = item.el.offsetHeight || 26;

    const offsets = [
      [0, 0],
      [0, -28],
      [0, 28],
      [-55, -14],
      [55, -14],
      [0, -54]
    ];

    let chosenOffset = null;
    for (const [ox, oy] of offsets) {
      const cx = sx + ox;
      const cy = sy + oy;
      const rect = { l: cx - w / 2 - 4, r: cx + w / 2 + 4, t: cy - h - 4, b: cy + 4 };
      const outOfBounds = rect.l < 6 || rect.r > window.innerWidth - 6 || rect.t < 6 || rect.b > window.innerHeight - 24;
      if (outOfBounds) continue;
      const overlaps = placedRects.some(
        (pr) => !(rect.r < pr.l || rect.l > pr.r || rect.b < pr.t || rect.t > pr.b)
      );
      if (!overlaps) {
        chosenOffset = { cx, cy, rect };
        break;
      }
    }

    if (chosenOffset || item.id === state.selectedBuildingId) {
      const clampedCx = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, sx));
      const finalPos = chosenOffset || { cx: clampedCx, cy: sy, rect: { l: clampedCx - w / 2, r: clampedCx + w / 2, t: sy - h, b: sy } };
      placedRects.push(finalPos.rect);
      item.el.style.left = `${finalPos.cx}px`;
      item.el.style.top = `${finalPos.cy}px`;
      item.el.style.opacity = '1';
    } else {
      item.el.style.opacity = '0';
      item.el.style.left = `${sx}px`;
      item.el.style.top = `${sy}px`;
    }
  });
}

// === 12. 互動小地圖 (2D Minimap) ===
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

function drawMinimap() {
  if (!minimapCtx) return;
  const cw = minimapCanvas.width;
  const ch = minimapCanvas.height;
  minimapCtx.clearRect(0, 0, cw, ch);

  if (mapImage.complete && mapImage.naturalWidth > 0) {
    minimapCtx.drawImage(mapImage, 0, 0, cw, ch);
  } else {
    minimapCtx.fillStyle = '#e9f0ec';
    minimapCtx.fillRect(0, 0, cw, ch);
  }

  const sx = cw / MAP_META.width;
  const sy = ch / MAP_META.height;

  if (state.activeRoute && state.activeRoute.pathNodes.length > 1) {
    minimapCtx.strokeStyle = '#10b981';
    minimapCtx.lineWidth = 3;
    minimapCtx.beginPath();
    state.activeRoute.pathNodes.forEach((n, idx) => {
      const mx = n.px * sx;
      const my = n.py * sy;
      if (idx === 0) minimapCtx.moveTo(mx, my);
      else minimapCtx.lineTo(mx, my);
    });
    minimapCtx.stroke();
  }

  const refPos = state.viewMode === 'fpv' ? state.fpv.pos : controls.target;
  const px = worldXToPx(refPos.x) * sx;
  const py = worldZToPy(refPos.z) * sy;

  minimapCtx.fillStyle = '#c94a38';
  minimapCtx.beginPath();
  minimapCtx.arc(px, py, 5, 0, Math.PI * 2);
  minimapCtx.fill();
  minimapCtx.strokeStyle = '#ffffff';
  minimapCtx.lineWidth = 2;
  minimapCtx.stroke();
}

function setupMinimapEvents() {
  minimapCanvas.addEventListener('click', (e) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const ratioX = (e.clientX - rect.left) / rect.width;
    const ratioY = (e.clientY - rect.top) / rect.height;
    const px = ratioX * MAP_META.width;
    const py = ratioY * MAP_META.height;
    const wx = pxToWorldX(px);
    const wz = pyToWorldZ(py);

    if (state.viewMode === 'fpv') {
      if (!checkBuildingCollision(wx, wz)) {
        state.fpv.pos.set(wx, 1.72, wz);
        syncFpvCamera();
      }
    } else {
      const target = new THREE.Vector3(wx, 0, wz);
      animateCameraTo(target.clone().add(new THREE.Vector3(0, 95, 95)), target);
    }
  });
}

// === 13. 視覺風格切換與 UI 事件綁定 ===
function setVisualTheme(theme) {
  state.theme = theme;
  state.isNight = (theme === 'night');
  document.body.classList.toggle('night-mode', state.isNight);

  const labelMap = { day: '晴空寫實', pixel: '像素冒險', brick: '微縮積木', night: '星夜光彩', xmas: '聖誕冬雪' };
  const labelEl = document.getElementById('theme-menu-label');
  if (labelEl) labelEl.textContent = labelMap[theme] || '晴空寫實';

  document.querySelectorAll('.theme-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  // 像素冒險：降低渲染解析度並使用 pixelated 畫布濾鏡；微縮積木：顯示屋頂 LEGO 積木顆粒
  if (theme === 'pixel') {
    renderer.setPixelRatio(0.42);
    renderer.domElement.style.imageRendering = 'pixelated';
  } else {
    renderer.setPixelRatio(state.isEcoMode ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.imageRendering = 'auto';
  }

  brickStudsGroup.visible = (theme === 'brick');

  // 莫內星夜天空球切換
  if (!monetSkyMesh) monetSkyMesh = createMonetStarrySky();
  monetSkyMesh.visible = state.isNight;

  const isXmas = (theme === 'xmas');
  const skyHex = state.isNight ? 0x081326 : (theme === 'brick' ? 0xcde6f5 : (isXmas ? 0xd0e2f2 : 0xc8dff5));
  scene.background.setHex(skyHex);
  scene.fog.color.setHex(state.isNight ? 0x0a1628 : skyHex);
  scene.fog.density = state.isNight ? 0.0006 : (isXmas ? 0.0011 : 0.0013);
  hemiLight.intensity = state.isNight ? 0.45 : (isXmas ? 0.95 : 0.88);
  hemiLight.color.setHex(state.isNight ? 0x90b8f0 : (isXmas ? 0xeef5fc : 0xffffff));
  dirLight.intensity = state.isNight ? 0.35 : (isXmas ? 1.25 : 1.18);
  dirLight.color.setHex(state.isNight ? 0xffea9f : (isXmas ? 0xfffaed : 0xfff8e7));
  nightLightsGroup.visible = state.isNight;

  buildingMeshes.forEach((m) => {
    if (m.userData && m.userData.baseColor && !m.userData.isPlaza && Array.isArray(m.material)) {
      const newTex = createFacadeTexture(m.userData.baseColor, state.isNight, m.userData.sensitive);
      m.material.forEach((mat, idx) => {
        if (idx !== 2 && idx !== 3) {
          mat.map = newTex;
          mat.needsUpdate = true;
        }
      });
    }
  });

  state.needsRender = true;
  showToast(`已切換至「${labelMap[theme]}」3D 視覺風格`);
}

function setupWalkSpawnButtons() {
  const spawns = [
    { label: '校門迎賓廣場', px: 1005, py: 915, yaw: -Math.PI / 2 },
    { label: '中正園水池', px: 905, py: 760, yaw: 0 },
    { label: '排球場與操場', px: 840, py: 472, yaw: 0 },
    { label: '森林生態池', px: 735, py: 740, yaw: -Math.PI / 2 },
    { label: '大花圃林蔭道', px: 675, py: 535, yaw: 0 },
    { label: '藝德女神廣場', px: 214, py: 648, yaw: Math.PI / 2 },
    { label: '戶外景觀樓梯 (1F 入口)', px: 946, py: 520, yaw: Math.PI },
    { label: '214 教室室內 (5F 露台)', customPos: new THREE.Vector3(58.2, 14.4 + 1.72, 5.0), yaw: 0 }
  ];
  const containerEl = document.getElementById('walk-spawn-btns');
  if (!containerEl) return;
  containerEl.innerHTML = '';
  spawns.forEach((sp) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spawn-pill';
    btn.textContent = `瞬移：${sp.label}`;
    btn.addEventListener('click', () => {
      state.autoWalking = false;
      state.fpv.targetWalkPoint = null;
      if (sp.customPos) {
        state.fpv.pos.copy(sp.customPos);
      } else {
        state.fpv.pos.set(pxToWorldX(sp.px), 1.72, pyToWorldZ(sp.py));
      }
      updateClimbButtonState();
      state.fpv.yaw = sp.yaw;
      syncFpvCamera();
      state.needsRender = true;
      showToast(`已瞬移至「${sp.label}」`);
    });
    containerEl.appendChild(btn);
  });
}

function setupUIAndInteractions() {
  setupWalkSpawnButtons();

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.toggle('active', p.id === targetTab));
    });
  });

  document.querySelectorAll('.floor-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyFloorVisibility(state.selectedBuildingId, btn.dataset.floor);
    });
  });

  const startSel = document.getElementById('route-start');
  const endSel = document.getElementById('route-end');
  const landmarkNodes = ROAD_NET.nodes.filter((n) => n.isLandmark || n.buildingId);
  landmarkNodes.forEach((n) => {
    startSel.add(new Option(n.name, n.id));
    endSel.add(new Option(n.name, n.id));
  });
  startSel.value = 'n_gate';
  endSel.value = 'n_yide_main';

  function triggerRouteCalculation() {
    const sId = startSel.value;
    const eId = endSel.value;
    if (sId === eId) {
      showToast('起點與終點相同，請選擇不同地點');
      return;
    }
    const pathNodes = findAStarPath(sId, eId);
    if (!pathNodes) {
      showToast('無法找到連通路徑');
      return;
    }
    const details = computeRouteDetails(pathNodes);
    renderRoute3D(details);

    const summaryEl = document.getElementById('route-summary');
    summaryEl.classList.add('visible');
    document.getElementById('metric-dist').textContent = `${details.distanceMeters} 公尺`;
    document.getElementById('metric-time').textContent = `約 ${details.timeMinutes} 分鐘`;

    const listEl = document.getElementById('turn-list');
    listEl.innerHTML = '';
    details.turns.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'turn-item';
      li.innerHTML = `<span>${t.step}. ${t.text}</span><span class="turn-dist">${t.dist}</span>`;
      listEl.appendChild(li);
    });
  }

  document.getElementById('btn-calc-route').addEventListener('click', () => {
    triggerRouteCalculation();
    if (window.innerWidth <= 1024) {
      document.getElementById('left-dock')?.classList.add('mobile-collapsed');
      const toggleBtn = document.getElementById('mobile-dock-toggle-btn');
      if (toggleBtn) toggleBtn.textContent = '路線與導覽 ▴';
    }
  });
  document.getElementById('btn-walk-route').addEventListener('click', () => {
    if (!state.activeRoute) triggerRouteCalculation();
    if (window.innerWidth <= 1024) {
      document.getElementById('left-dock')?.classList.add('mobile-collapsed');
      const toggleBtn = document.getElementById('mobile-dock-toggle-btn');
      if (toggleBtn) toggleBtn.textContent = '路線與導覽 ▴';
    }
    setViewMode('fpv');
    startRouteAutoWalk();
  });
  document.getElementById('btn-clear-route').addEventListener('click', () => {
    renderRoute3D(null);
    state.autoWalking = false;
    studentAvatarGroup.visible = (state.viewMode === 'fpv' && state.walkPersp === '3rd');
    document.getElementById('route-summary').classList.remove('visible');
  });

  // 底部導航狀態列控制按鈕
  document.getElementById('sim-walk-btn')?.addEventListener('click', (e) => {
    if (!state.activeRoute) return;
    if (state.autoWalking) {
      state.autoWalking = false;
      e.currentTarget.textContent = '繼續帶路';
    } else {
      startRouteAutoWalk();
      e.currentTarget.textContent = '暫停帶路';
    }
  });
  document.getElementById('walk-speed-btn')?.addEventListener('click', (e) => {
    const speeds = [1, 2, 0.5];
    const next = speeds[(speeds.indexOf(state.walkSpeedMult) + 1) % speeds.length];
    state.walkSpeedMult = next;
    e.currentTarget.textContent = `${next}x 速度`;
  });
  document.getElementById('walk-cam-height-btn')?.addEventListener('click', (e) => {
    const modes = ['high', 'mid', 'close'];
    const labels = { high: '視角：高空全景', mid: '視角：中景跟隨', close: '視角：近距特寫' };
    const next = modes[(modes.indexOf(state.routeCamMode) + 1) % modes.length];
    state.routeCamMode = next;
    e.currentTarget.textContent = labels[next];
  });
  document.getElementById('clear-nav-bar-btn')?.addEventListener('click', () => {
    renderRoute3D(null);
    state.autoWalking = false;
    studentAvatarGroup.visible = false;
    document.getElementById('route-summary').classList.remove('visible');
  });

  const toursContainer = document.getElementById('tours-list');
  TOURS.forEach((tour) => {
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.innerHTML = `
      <div class="tour-card-top">
        <span class="tour-badge">${tour.badge}</span>
        <span class="tour-time">${tour.durationText}</span>
      </div>
      <div class="tour-title">${tour.title}</div>
      <div class="tour-desc">${tour.description}</div>
      <div class="tour-stops-box">
        ${tour.stops.map((st) => `<div class="tour-stop-row" data-node="${st.nodeId}" data-bldg="${st.buildingId}"><strong>${st.title}</strong>：${st.note}</div>`).join('')}
      </div>
      <div class="route-actions" style="margin-top:4px;">
        <button class="primary-btn btn-start-tour">預覽並沿線導覽</button>
      </div>
    `;

    card.querySelectorAll('.tour-stop-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const bid = row.dataset.bldg;
        if (bid) selectBuilding(bid, 'ALL', null, true);
      });
    });

    card.querySelector('.btn-start-tour').addEventListener('click', (e) => {
      e.stopPropagation();
      const fullPath = [];
      for (let i = 0; i < tour.stops.length - 1; i++) {
        const seg = findAStarPath(tour.stops[i].nodeId, tour.stops[i + 1].nodeId);
        if (seg) {
          if (i > 0) seg.shift();
          fullPath.push(...seg);
        }
      }
      const details = computeRouteDetails(fullPath);
      renderRoute3D(details);
      if (window.innerWidth <= 1024) {
        document.getElementById('left-dock')?.classList.add('mobile-collapsed');
        const toggleBtn = document.getElementById('mobile-dock-toggle-btn');
        if (toggleBtn) toggleBtn.textContent = '路線與導覽 ▴';
      }
      startRouteAutoWalk();
    });

    toursContainer.appendChild(card);
  });

  document.getElementById('btn-mode-bird')?.addEventListener('click', () => setViewMode('birdseye'));
  document.getElementById('btn-mode-fpv')?.addEventListener('click', () => setViewMode(state.viewMode === 'fpv' ? 'birdseye' : 'fpv'));

  // 視覺風格下拉選單
  const themeMenuBtn = document.getElementById('btn-theme-menu');
  const themeMenu = document.getElementById('theme-menu');
  themeMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu?.classList.toggle('open');
  });
  document.querySelectorAll('.theme-item').forEach((item) => {
    item.addEventListener('click', () => {
      themeMenu?.classList.remove('open');
      setVisualTheme(item.dataset.theme);
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#theme-dropdown')) {
      themeMenu?.classList.remove('open');
    }
  });

  // 相容舊版日夜切換按鈕
  document.getElementById('btn-toggle-night')?.addEventListener('click', () => {
    setVisualTheme(state.isNight ? 'day' : 'night');
  });

  document.getElementById('btn-toggle-eco').addEventListener('click', (e) => {
    state.isEcoMode = !state.isEcoMode;
    e.currentTarget.classList.toggle('active', state.isEcoMode);
    renderer.setPixelRatio(state.isEcoMode ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !state.isEcoMode;
    dirLight.castShadow = !state.isEcoMode;
    showToast(state.isEcoMode ? '已開啟省電模式：降低像素渲染倍率並關閉動態陰影' : '已關閉省電模式：恢復高畫質光影');
    state.needsRender = true;
  });

  document.getElementById('btn-reset-cam').addEventListener('click', () => {
    if (state.viewMode !== 'birdseye') setViewMode('birdseye');
    const cfg = getResponsiveOverviewCamera();
    camera.fov = cfg.fov;
    camera.updateProjectionMatrix();
    document.getElementById('btn-reset-cam')?.classList.add('active');
    applyFloorVisibility(null, 'ALL');
    document.getElementById('right-panel').classList.add('collapsed');
    document.getElementById('left-dock')?.classList.add('mobile-collapsed');
    const toggleBtn = document.getElementById('mobile-dock-toggle-btn');
    if (toggleBtn) toggleBtn.textContent = '路線與導覽 ▴';
    animateCameraTo(cfg.pos, cfg.target);
  });

  // 行動裝置底部「路線與導覽」面板展開／收合切換
  const mobileDockToggleBtn = document.getElementById('mobile-dock-toggle-btn');
  mobileDockToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dock = document.getElementById('left-dock');
    if (!dock) return;
    const isCollapsed = dock.classList.toggle('mobile-collapsed');
    mobileDockToggleBtn.textContent = isCollapsed ? '路線與導覽 ▴' : '收合面板 ▾';
    if (!isCollapsed) {
      document.getElementById('right-panel')?.classList.add('collapsed');
    }
  });

  // 行動裝置右上角羅盤十字操控盤展開／收合切換
  const compassExpandBtn = document.getElementById('compass-expand-btn');
  compassExpandBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const box = document.getElementById('compass-box');
    if (!box) return;
    const isCompact = box.classList.toggle('mobile-compact');
    compassExpandBtn.textContent = isCompact ? '操控 ▾' : '收合 ▴';
  });

  document.getElementById('panel-close').addEventListener('click', () => {
    document.getElementById('right-panel').classList.add('collapsed');
  });

  document.getElementById('reopen-drawer-pill')?.addEventListener('click', () => {
    document.getElementById('right-panel').classList.remove('collapsed');
  });

  // 右上角羅盤點擊回正北方 (+X 為北方，因此相機位於 -X 往 +X 看)
  document.getElementById('compass-reset-btn')?.addEventListener('click', () => {
    if (state.viewMode !== 'birdseye') setViewMode('birdseye');
    const target = controls.target.clone();
    const dist = Math.max(110, camera.position.distanceTo(target));
    animateCameraTo(new THREE.Vector3(target.x - dist * 0.72, dist * 0.68, target.z), target);
    showToast('已對齊正北方視角（前方 +X 為北投文林北路側）');
  });

  // 滑鼠左鍵與行動裝置單指拖曳：平移／旋轉切換
  const panModeBtn = document.getElementById('left-drag-pan-btn');
  const rotModeBtn = document.getElementById('left-drag-rot-btn');
  panModeBtn?.addEventListener('click', () => {
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN;
    panModeBtn.classList.add('active');
    rotModeBtn?.classList.remove('active');
    showToast('已切換為「單指／左鍵拖曳平移地圖」');
  });
  rotModeBtn?.addEventListener('click', () => {
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    rotModeBtn.classList.add('active');
    panModeBtn?.classList.remove('active');
    showToast('已切換為「單指／左鍵拖曳旋轉視角」');
  });

  // 右上角十字方向平移與縮放按鈕
  document.getElementById('pan-home-btn')?.addEventListener('click', () => {
    document.getElementById('btn-reset-cam')?.click();
  });
  document.querySelectorAll('.pan-btn[data-pan]').forEach((btn) => {
    const act = btn.dataset.pan;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      state.dpadPan = act;
    });
    btn.addEventListener('pointerup', () => { state.dpadPan = null; });
    btn.addEventListener('pointerleave', () => { state.dpadPan = null; });
  });

  // 地面漫步冒險 HUD 控制列事件
  document.getElementById('char-boy-btn')?.addEventListener('click', (e) => {
    state.walkChar = 'boy';
    e.currentTarget.classList.add('active');
    document.getElementById('char-girl-btn')?.classList.remove('active');
    buildStudentAvatar('boy');
    state.needsRender = true;
  });
  document.getElementById('char-girl-btn')?.addEventListener('click', (e) => {
    state.walkChar = 'girl';
    e.currentTarget.classList.add('active');
    document.getElementById('char-boy-btn')?.classList.remove('active');
    buildStudentAvatar('girl');
    state.needsRender = true;
  });
  document.getElementById('walk-cam-view-btn')?.addEventListener('click', (e) => {
    state.walkPersp = state.walkPersp === '3rd' ? '1st' : '3rd';
    e.currentTarget.textContent = state.walkPersp === '3rd' ? '視角：第三人稱' : '視角：第一人稱';
    e.currentTarget.classList.toggle('active', state.walkPersp === '3rd');
    syncFpvCamera();
    state.needsRender = true;
  });
  document.getElementById('climb-stair-btn')?.addEventListener('click', () => {
    if (state.fpv.isClimbingStairs) {
      state.fpv.isClimbingStairs = false;
      updateClimbButtonState();
      showToast('已暫停爬梯（可使用 WASD 手動行走，或再次點擊按鈕繼續）');
    } else {
      startClimbingStairs();
    }
  });

  document.getElementById('walk-pace-btn')?.addEventListener('click', (e) => {
    state.walkPace = state.walkPace === 'walk' ? 'run' : 'walk';
    e.currentTarget.textContent = state.walkPace === 'run' ? '速度：跑步' : '速度：步行';
    e.currentTarget.classList.toggle('active', state.walkPace === 'run');
  });
  document.getElementById('walk-hud-collapse-btn')?.addEventListener('click', (e) => {
    const bar = document.getElementById('walk-hud-bar');
    const minimized = bar?.classList.toggle('minimized');
    e.currentTarget.textContent = minimized ? '展開面板' : '收合面板';
  });
  document.getElementById('exit-walk-btn')?.addEventListener('click', () => {
    setViewMode('birdseye');
  });

  document.querySelectorAll('.w-btn[data-wact]').forEach((btn) => {
    const act = btn.dataset.wact;
    const setAct = (val) => {
      if (act === 'forward') state.fpv.moveForward = val;
      if (act === 'backward') state.fpv.moveBackward = val;
      if (act === 'turnLeft') state.fpv.turnLeft = val;
      if (act === 'turnRight') state.fpv.turnRight = val;
    };
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      state.autoWalking = false;
      state.fpv.targetWalkPoint = null;
      setAct(true);
    });
    btn.addEventListener('pointerup', () => setAct(false));
    btn.addEventListener('pointerleave', () => setAct(false));
  });

  // 底部操作說明與版權對話框
  const gestureModal = document.getElementById('gesture-modal');
  const copyrightModal = document.getElementById('copyright-modal');
  document.getElementById('open-gesture-btn')?.addEventListener('click', () => gestureModal?.classList.add('open'));
  document.getElementById('close-gesture-btn')?.addEventListener('click', () => gestureModal?.classList.remove('open'));
  document.getElementById('ok-gesture-btn')?.addEventListener('click', () => gestureModal?.classList.remove('open'));
  document.getElementById('open-copyright-btn')?.addEventListener('click', () => copyrightModal?.classList.add('open'));
  document.getElementById('close-copyright-btn')?.addEventListener('click', () => copyrightModal?.classList.remove('open'));
  document.getElementById('ok-copyright-btn')?.addEventListener('click', () => copyrightModal?.classList.remove('open'));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos = { x: 0, y: 0 };
  let isDraggingLook = false;
  let lookPointerId = null;
  let prevLook = { x: 0, y: 0 };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
    if (window.innerWidth <= 1024) {
      const dock = document.getElementById('left-dock');
      if (dock && !dock.classList.contains('mobile-collapsed')) {
        dock.classList.add('mobile-collapsed');
        const toggleBtn = document.getElementById('mobile-dock-toggle-btn');
        if (toggleBtn) toggleBtn.textContent = '路線與導覽 ▴';
      }
      const cBox = document.getElementById('compass-box');
      if (cBox && !cBox.classList.contains('mobile-compact')) {
        cBox.classList.add('mobile-compact');
        const expBtn = document.getElementById('compass-expand-btn');
        if (expBtn) expBtn.textContent = '操控 ▾';
      }
    }
    if (state.viewMode === 'fpv' && lookPointerId === null) {
      isDraggingLook = true;
      lookPointerId = e.pointerId;
      prevLook = { x: e.clientX, y: e.clientY };
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (state.viewMode === 'fpv' && isDraggingLook && e.pointerId === lookPointerId) {
      const dx = e.clientX - prevLook.x;
      const dy = e.clientY - prevLook.y;
      prevLook = { x: e.clientX, y: e.clientY };
      state.fpv.yaw += dx * 0.0045;
      state.fpv.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, state.fpv.pitch - dy * 0.0035));
      syncFpvCamera();
      state.needsRender = true;
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (e.pointerId === lookPointerId) {
      isDraggingLook = false;
      lookPointerId = null;
    }
    const moveDist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    if (moveDist > 10 || e.target !== renderer.domElement) return;

    // 1. 優先檢測是否點擊在可見的 3D 教室浮動標籤或建物浮動標籤上
    for (const rItem of roomLabelElements) {
      if (rItem.el.style.display === 'none' || rItem.el.style.opacity === '0') continue;
      const rect = rItem.el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        focusOnRoom(rItem.buildingId, rItem.floorKey, rItem.id);
        return;
      }
    }
    for (const bItem of labelElements) {
      if (bItem.el.style.opacity === '0') continue;
      const rect = bItem.el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        selectBuilding(bItem.id, state.selectedFloor, null, state.viewMode === 'birdseye');
        return;
      }
    }

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    if (roomMeshes.length > 0) {
      const roomHits = raycaster.intersectObjects(roomMeshes, false);
      if (roomHits.length > 0) {
        const hit = roomHits[0].object;
        focusOnRoom(hit.userData.buildingId, hit.userData.floorKey, hit.userData.roomId);
        return;
      }
    }

    const sHits = raycaster.intersectObjects(exteriorStairsGroup.children, true);
    if (sHits.length > 0) {
      showToast('點擊戶外折返樓梯：開始爬梯探索！');
      startClimbingStairs();
      return;
    }

    const bHits = raycaster.intersectObjects(buildingMeshes, false);
    if (bHits.length > 0) {
      const hitMesh = bHits.find((h) => h.object.parent && h.object.parent.visible);
      if (hitMesh && hitMesh.object.userData.buildingId) {
        selectBuilding(hitMesh.object.userData.buildingId, state.selectedFloor, null, state.viewMode === 'birdseye');
        return;
      }
    }

    if (state.viewMode === 'fpv' && groundMesh) {
      const gHits = raycaster.intersectObject(groundMesh, false);
      if (gHits.length > 0) {
        const pt = gHits[0].point;
        state.autoWalking = false;
        state.fpv.targetWalkPoint = new THREE.Vector3(pt.x, 1.72, pt.z);
        showToast('正在步行前往點擊位置...');
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const code = e.code;
    if (code === 'KeyE' && state.viewMode === 'fpv') {
      startClimbingStairs();
      return;
    }
    if (code === 'KeyH' && state.viewMode === 'fpv') {
      document.getElementById('walk-hud-collapse-btn')?.click();
      return;
    }
    if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(code)) {
      if (state.viewMode !== 'fpv') setViewMode('fpv');
      state.autoWalking = false;
      state.fpv.targetWalkPoint = null;
    }
    if (code === 'KeyW' || code === 'ArrowUp') state.fpv.moveForward = true;
    if (code === 'KeyS' || code === 'ArrowDown') state.fpv.moveBackward = true;
    if (code === 'KeyA' || code === 'ArrowLeft') state.fpv.moveLeft = true;
    if (code === 'KeyD' || code === 'ArrowRight') state.fpv.moveRight = true;
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') state.fpv.moveForward = false;
    if (code === 'KeyS' || code === 'ArrowDown') state.fpv.moveBackward = false;
    if (code === 'KeyA' || code === 'ArrowLeft') state.fpv.moveLeft = false;
    if (code === 'KeyD' || code === 'ArrowRight') state.fpv.moveRight = false;
  });

  const joyZone = document.getElementById('joystick-zone');
  const joyKnob = document.getElementById('joystick-knob');
  let joyActive = false;
  let joyPointerId = null;

  joyZone.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    joyActive = true;
    joyPointerId = e.pointerId;
    if (state.viewMode !== 'fpv') setViewMode('fpv');
    state.autoWalking = false;
    state.fpv.targetWalkPoint = null;
    updateJoystick(e);
  });

  window.addEventListener('pointermove', (e) => {
    if (joyActive && e.pointerId === joyPointerId) updateJoystick(e);
  });

  window.addEventListener('pointerup', (e) => {
    if (joyActive && e.pointerId === joyPointerId) {
      joyActive = false;
      joyPointerId = null;
      state.fpv.joyX = 0;
      state.fpv.joyY = 0;
      joyKnob.style.transform = 'translate(0px, 0px)';
    }
  });
  window.addEventListener('pointercancel', (e) => {
    if (joyActive && e.pointerId === joyPointerId) {
      joyActive = false;
      joyPointerId = null;
      state.fpv.joyX = 0;
      state.fpv.joyY = 0;
      joyKnob.style.transform = 'translate(0px, 0px)';
    }
    if (e.pointerId === lookPointerId) {
      isDraggingLook = false;
      lookPointerId = null;
    }
  });

  function updateJoystick(e) {
    const rect = joyZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 16;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    state.fpv.joyX = dx / maxR;
    state.fpv.joyY = -dy / maxR;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    state.needsRender = true;
  });
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast-msg');
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// === 14. 主動畫迴圈 ===
let lastTime = performance.now();
let lastCollisionToast = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (state.cameraTween) {
    const tw = state.cameraTween;
    const t = Math.min(1, (now - tw.startTime) / tw.duration);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tw.startCam, tw.endCam, ease);
    controls.target.lerpVectors(tw.startTarget, tw.endTarget, ease);
    if (t >= 1) state.cameraTween = null;
    state.needsRender = true;
  }

  // 右上角十字平移與縮放按住連續動作
  if (state.dpadPan && state.viewMode === 'birdseye') {
    const panStep = 65 * dt;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    if (state.dpadPan === 'up') {
      camera.position.addScaledVector(fwd, panStep);
      controls.target.addScaledVector(fwd, panStep);
    } else if (state.dpadPan === 'down') {
      camera.position.addScaledVector(fwd, -panStep);
      controls.target.addScaledVector(fwd, -panStep);
    } else if (state.dpadPan === 'left') {
      camera.position.addScaledVector(right, -panStep);
      controls.target.addScaledVector(right, -panStep);
    } else if (state.dpadPan === 'right') {
      camera.position.addScaledVector(right, panStep);
      controls.target.addScaledVector(right, panStep);
    } else if (state.dpadPan === 'zoomIn') {
      camera.position.lerp(controls.target, 1.8 * dt);
    } else if (state.dpadPan === 'zoomOut') {
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(1 + 1.8 * dt);
      camera.position.copy(controls.target).add(offset);
    }
    state.needsRender = true;
  }

  let avatarMoving = false;

  if (state.autoWalking && state.activeRoute) {
    const totalLen = state.activeRoute.curve.getLength();
    state.autoWalkProgress += (state.autoWalkSpeed * state.walkSpeedMult * dt) / Math.max(1, totalLen);
    if (state.autoWalkProgress >= 1) {
      state.autoWalkProgress = 1;
      state.autoWalking = false;
      const simBtn = document.getElementById('sim-walk-btn');
      if (simBtn) simBtn.textContent = '重新帶路';
      showToast('已抵達導覽路線終點！');
    }
    const progBar = document.getElementById('nav-walk-progress-bar');
    if (progBar) progBar.style.width = `${Math.round(state.autoWalkProgress * 100)}%`;

    const pt = state.activeRoute.curve.getPointAt(state.autoWalkProgress);
    const tangent = state.activeRoute.curve.getTangentAt(state.autoWalkProgress);
    state.fpv.pos.set(pt.x, 1.72, pt.z);
    state.fpv.yaw = Math.atan2(tangent.x, -tangent.z);
    avatarMoving = state.autoWalking;

    if (state.viewMode === 'fpv') {
      syncFpvCamera();
    } else {
      studentAvatarGroup.visible = true;
      if (state.routeCamMode === 'mid') {
        controls.target.lerp(new THREE.Vector3(pt.x, 1.5, pt.z), 0.12);
        camera.position.lerp(new THREE.Vector3(pt.x - tangent.x * 26, 26, pt.z - tangent.z * 26), 0.08);
      } else if (state.routeCamMode === 'close') {
        controls.target.lerp(new THREE.Vector3(pt.x, 1.6, pt.z), 0.18);
        camera.position.lerp(new THREE.Vector3(pt.x - tangent.x * 10, 8.5, pt.z - tangent.z * 10), 0.12);
      }
      controls.update();
    }
    state.needsRender = true;
  } else if (state.viewMode === 'birdseye') {
    controls.update();
  } else {
    if (state.fpv.turnLeft) state.fpv.yaw -= 1.8 * dt;
    if (state.fpv.turnRight) state.fpv.yaw += 1.8 * dt;

    if (state.fpv.targetWalkPoint) {
      const toTarget = state.fpv.targetWalkPoint.clone().sub(state.fpv.pos);
      toTarget.y = 0;
      const dist = toTarget.length();
      if (dist < 0.8) {
        state.fpv.targetWalkPoint = null;
      } else {
        toTarget.normalize();
        const paceSpeed = state.walkPace === 'run' ? 16.5 : 9.5;
        const step = Math.min(dist, paceSpeed * dt);
        const nx = state.fpv.pos.x + toTarget.x * step;
        const nz = state.fpv.pos.z + toTarget.z * step;
        const hit = checkBuildingCollision(nx, nz);
        if (hit) {
          state.fpv.targetWalkPoint = null;
          showToast(`前方為「${hit.name}」，已停止自動行走`);
        } else {
          state.fpv.pos.x = nx;
          state.fpv.pos.z = nz;
          state.fpv.yaw = Math.atan2(toTarget.x, -toTarget.z);
          avatarMoving = true;
          syncFpvCamera();
          state.needsRender = true;
        }
      }
    } else if (state.fpv.isClimbingStairs) {
      // 玩家正在沿樓梯爬升或下樓
      const climbSpeed = state.walkPace === 'run' ? 5.8 : 3.8; // 公尺/秒
      state.fpv.stairDist += state.fpv.stairDir * climbSpeed * dt;

      if (state.fpv.stairDist >= totalStairDistance) {
        state.fpv.stairDist = totalStairDistance;
        state.fpv.isClimbingStairs = false;
        const res = getStairPositionAtDist(totalStairDistance);
        state.fpv.pos.set(res.pos.x, res.pos.y + 1.72, res.pos.z);
        state.fpv.yaw = res.yaw;
        updateClimbButtonState();
        showToast('🎉 已登上 5F 戶外樓梯並進入 214 教室！可在教室內自由走動參觀。');
      } else if (state.fpv.stairDist <= 0) {
        state.fpv.stairDist = 0;
        state.fpv.isClimbingStairs = false;
        const res = getStairPositionAtDist(0);
        state.fpv.pos.set(res.pos.x, res.pos.y + 1.72, res.pos.z);
        state.fpv.yaw = res.yaw;
        updateClimbButtonState();
        showToast('已順利沿戶外樓梯走下至校園地面。');
      } else {
        const res = getStairPositionAtDist(state.fpv.stairDist);
        state.fpv.pos.set(res.pos.x, res.pos.y + 1.72, res.pos.z);
        state.fpv.yaw = res.yaw;
        avatarMoving = true;
      }
      syncFpvCamera();
      state.needsRender = true;
    } else {
      const fwd = (state.fpv.moveForward ? 1 : 0) - (state.fpv.moveBackward ? 1 : 0) + state.fpv.joyY;
      const strafe = (state.fpv.moveRight ? 1 : 0) - (state.fpv.moveLeft ? 1 : 0) + state.fpv.joyX * 0.5;
      if (Math.abs(state.fpv.joyX) > 0.15) {
        state.fpv.yaw += state.fpv.joyX * 1.6 * dt;
      }
      if (
        Math.abs(fwd) > 0.01 ||
        Math.abs(strafe) > 0.01 ||
        Math.abs(state.fpv.joyX) > 0.05 ||
        state.fpv.turnLeft ||
        state.fpv.turnRight
      ) {
        const basePace = state.walkPace === 'run' ? 18.0 : 10.5;
        const speed = basePace * dt;
        const sinY = Math.sin(state.fpv.yaw);
        const cosY = Math.cos(state.fpv.yaw);
        const dx = (sinY * fwd + cosY * strafe) * speed;
        const dz = (-cosY * fwd + sinY * strafe) * speed;

        const nx = state.fpv.pos.x + dx;
        const nz = state.fpv.pos.z + dz;
        const hit = checkBuildingCollision(nx, nz);
        if (!hit) {
          state.fpv.pos.x = Math.max(-WORLD_W / 2 + 2, Math.min(WORLD_W / 2 - 2, nx));
          state.fpv.pos.z = Math.max(-WORLD_D / 2 + 2, Math.min(WORLD_D / 2 - 2, nz));
          avatarMoving = Math.abs(fwd) > 0.01 || Math.abs(strafe) > 0.01;
        } else {
          if (!checkBuildingCollision(nx, state.fpv.pos.z)) state.fpv.pos.x = nx;
          else if (!checkBuildingCollision(state.fpv.pos.x, nz)) state.fpv.pos.z = nz;
          if (now - lastCollisionToast > 2200) {
            if (hit.type === 'dog') {
              const dogObj = animatedAnimals.dogs.find(d => `校犬「${d.name}」` === hit.name);
              const intro = dogObj ? `：${dogObj.intro}` : '：汪！';
              showToast(`🐾 ${hit.name}${intro}`);
            } else if (hit.type === 'npc') {
              showToast(`👋 ${hit.name}：「${hit.dialog || '同學好！'}」`);
            } else {
              showToast(`碰撞阻擋：${hit.name}`);
            }
            lastCollisionToast = now;
          }
        }
        syncFpvCamera();
        state.needsRender = true;
      }
    }
  }

  // 校犬尾巴輕搖與頭部微動
  animatedAnimals.dogs.forEach((d) => {
    d.tailGroup.rotation.z = Math.sin(now * 0.007 + d.seed) * 0.35;
    d.headGroup.rotation.y = Math.sin(now * 0.002 + d.seed) * 0.16;
  });
  // 樹梢顯著臺灣藍鵲之擺尾與靈動轉頭微動
  animatedAnimals.magpies.forEach((b) => {
    b.tailGroup.rotation.x = 0.38 + Math.sin(now * 0.0035 + b.seed) * 0.18;
    b.headGroup.rotation.y = Math.sin(now * 0.0016 + b.seed) * 0.38;
  });

  // 西南南兒童新樂園摩天輪緩慢旋轉與車廂重力垂直自平衡
  if (ferrisWheelAnim) {
    const wheelRot = now * 0.00018;
    ferrisWheelAnim.wheelGroup.rotation.z = wheelRot;
    ferrisWheelAnim.gondolas.forEach((g) => {
      g.rotation.z = -wheelRot;
    });
  }

  // 214 教室天降聖光與金色光暈動態呼吸迴圈（柔和淡雅）
  if (classroom214AuraAnim) {
    const pulse1 = Math.sin(now * 0.0018);
    const pulse2 = Math.sin(now * 0.0025);
    // 天降光束輕微柔和波動（淡淡的透明天光）
    classroom214AuraAnim.outerBeam.material.opacity = 0.14 + pulse1 * 0.03;
    classroom214AuraAnim.coreBeam.material.opacity = 0.20 + pulse2 * 0.04;
    // 214 教室光罩微幅擴張（淡金透明）
    const sScale = 1.0 + pulse1 * 0.03;
    classroom214AuraAnim.auraSphere.scale.set(sScale, sScale * 1.05, sScale);
    classroom214AuraAnim.auraSphere.material.opacity = 0.08 + pulse2 * 0.02;
    // 屋頂雙光環旋轉
    classroom214AuraAnim.ring1.rotation.z = now * 0.0006;
    classroom214AuraAnim.ring2.rotation.z = -now * 0.0004;
    // 點光源輕撫照耀中正樓 5F 女兒牆（低強度溫和微光）
    classroom214AuraAnim.auraLight.intensity = 0.85 + pulse1 * 0.15;
    // 金色星屑粒子緩步上升翻飛
    classroom214AuraAnim.sparkles.forEach((sp) => {
      sp.mesh.position.y += sp.speedY;
      sp.mesh.rotation.x += sp.rotSpeed;
      sp.mesh.rotation.y += sp.rotSpeed;
      if (sp.mesh.position.y > sp.maxY) {
        sp.mesh.position.y = sp.minY + Math.random() * 2.0;
      }
    });
  }

  // 聖誕節日飄雪與彩燈旋轉動態
  animateChristmasAtmosphere(now, dt);
  animateClimbingAvatar(now, dt);

  // 運動學生群（田徑奔跑、排球起跳與扣球、籃球跳投與運球）
  campusNpcs.sports.forEach((s) => {
    if (s.role === 'runner') {
      const swing = Math.sin(now * s.speed + s.seed) * s.amp;
      if (s.leftArm) s.leftArm.rotation.x = swing;
      if (s.rightArm) s.rightArm.rotation.x = -swing;
      if (s.leftLeg) s.leftLeg.rotation.x = -swing;
      if (s.rightLeg) s.rightLeg.rotation.x = swing;
      s.root.position.y = s.baseY + Math.abs(Math.sin(now * s.speed + s.seed)) * 0.08;
    } else if (s.isAir) {
      // 扣球手與跳投手半空滯空浮動微動
      s.root.position.y = s.baseY + Math.sin(now * 0.003 + s.seed) * 0.08;
      if (s.rightArm) s.rightArm.rotation.x = -2.2 + Math.sin(now * 0.004 + s.seed) * 0.15;
    } else if (s.role === 'soccer') {
      const kick = Math.sin(now * 0.006 + s.seed) * 0.35;
      if (s.rightLeg) s.rightLeg.rotation.x = kick;
      if (s.leftArm) s.leftArm.rotation.x = -kick * 0.5;
    } else if (s.role === 'stretcher') {
      const breathe = Math.sin(now * 0.002 + s.seed) * 0.04;
      if (s.leftArm) s.leftArm.rotation.x = -0.3 + breathe;
      if (s.rightArm) s.rightArm.rotation.x = -0.3 + breathe;
    } else if (s.role === 'volleyball') {
      const squat = Math.sin(now * 0.004 + s.seed) * 0.04;
      s.root.position.y = s.baseY + Math.abs(squat);
    } else if (s.role === 'basketball_dribble') {
      const bounce = Math.sin(now * 0.008 + s.seed) * 0.05;
      s.root.position.y = s.baseY + Math.abs(bounce);
      if (s.rightArm) s.rightArm.rotation.x = -0.65 + bounce * 2.5;
    }
  });

  // 校園主要道路漫步師生群（自然換步與手臂輕擺）
  campusNpcs.walkway.forEach((w) => {
    const swing = Math.sin(now * w.speed + w.seed) * w.amp;
    if (w.leftArm) w.leftArm.rotation.x = swing;
    if (w.rightArm) w.rightArm.rotation.x = -swing;
    if (w.leftLeg) w.leftLeg.rotation.x = -swing;
    if (w.rightLeg) w.rightLeg.rotation.x = swing;
    if (w.headGroup) w.headGroup.rotation.y = Math.sin(now * 0.0012 + w.seed) * 0.14;
  });

  animateStudentAvatar(now, avatarMoving);
  renderer.render(scene, camera);
  updateFloatingLabels();
  updateCompass();
  drawMinimap();
}

buildAllBuildings();
buildDetectedTrees();
initRoadGraph();
buildSearchIndex();
setupSearchUI();
setupUIAndInteractions();
setupMinimapEvents();

// 隱藏啟動載入畫面
const loaderEl = document.getElementById('loading-screen');
if (loaderEl) {
  loaderEl.classList.add('fade-out');
  loaderEl.style.display = 'none';
}

window.CAMPUS_APP = {
  selectBuilding,
  focusOnRoom,
  applyFloorVisibility,
  setViewMode,
  setVisualTheme,
  findAStarPath,
  computeRouteDetails,
  renderRoute3D,
  buildTreesInstanced,
  buildStressTrees
};

function handleTestHash() {
  const h = window.location.hash;
  if (!h) return;
  if (h === '#test=panel') {
    selectBuilding('library', 'ALL', null, false);
  } else if (h === '#test=corridors') {
    // 俯瞰紅圈處（中美廊道 5 樓全通）與藍圈處（莊敬美齡 4 樓全通）
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 48;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(980), 92, pyToWorldZ(880));
    controls.target.set(pxToWorldX(720), 12, pyToWorldZ(670));
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=google3d') {
    // 依 Google Maps 3D 實景照片視角：迎賓廣場中正園「The statue」正對至聖樓穿堂大階梯，以及右側中正樓立體方格深窗與綠色雨棚
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 45;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(1160), 38, pyToWorldZ(760));
    controls.target.set(pxToWorldX(915), 11, pyToWorldZ(750));
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=stair_214') {
    // 中正樓北側折返式鋼構樓梯與攀爬互動人物特寫視角
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 42;
    camera.updateProjectionMatrix();
    const stairTarget = new THREE.Vector3(55.0, 7.5, -3.45);
    camera.position.set(55.0, 9.5, -3.45 - 24.0); // 自北側道路正對山牆全景仰視
    controls.target.copy(stairTarget);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=214_room' || h === '#test=214_gifts') {
    selectBuilding('zhongzheng', '5F', 'zz-507', false);
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 36;
    camera.updateProjectionMatrix();
    const roomCenter = new THREE.Vector3(58.2, 14.4, 5.0);
    camera.position.set(58.2 + 8.5, 21.0, 5.0 + 8.5);
    controls.target.copy(roomCenter);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=214') {
    // 214 教室天降金色聖光 (Heavenly Sunbeam) 與金黃光暈特寫視角
    selectBuilding('zhongzheng', '5F', 'zz-507', false);
    camera.fov = 46;
    camera.updateProjectionMatrix();
    const c214Pos = new THREE.Vector3(pxToWorldX(924), 18.25, pyToWorldZ(563.3));
    camera.position.set(c214Pos.x + 38, 38, c214Pos.z + 46);
    controls.target.copy(c214Pos);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=garden') {
    // 依實拍照片警衛室往中正園現代幾何太極石雕（東南側新位）特寫視角
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 42;
    camera.updateProjectionMatrix();
    const scCenter = new THREE.Vector3(pxToWorldX(1048) + 5.0, 1.6, pyToWorldZ(765) + 7.2);
    camera.position.set(scCenter.x - 12, 4.2, scCenter.z + 16);
    controls.target.copy(scCenter);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=garden_compare' || h === '#test=three_changes') {
    // 依使用者三處紅圈藍框標註圖視角 (media_1793578827639_8b37a8d8.jpg)：
    // 自南向北高角度俯瞰：1~5層中庭塔樓北移、中正樓正面長綠籬、太極裝置移至東南側藍框
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 48;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(940), 118, pyToWorldZ(940));
    controls.target.set(pxToWorldX(940), 2.0, pyToWorldZ(685));
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=xmas') {
    // 聖誕迎賓巨型聖誕樹、漫天飄雪與迎賓廣場特寫視角
    setVisualTheme('xmas');
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 44;
    camera.updateProjectionMatrix();
    const treeCenter = new THREE.Vector3(pxToWorldX(985), 7.5, pyToWorldZ(780));
    camera.position.set(treeCenter.x + 22, 16, treeCenter.z + 26);
    controls.target.copy(treeCenter);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=wreath_portal') {
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 38;
    camera.updateProjectionMatrix();
    const portalWreathPos = new THREE.Vector3(63.30, 5.80, pyToWorldZ(645));
    camera.position.set(portalWreathPos.x + 15.0, 7.2, portalWreathPos.z);
    controls.target.copy(portalWreathPos);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=wreath_gate') {
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 36;
    camera.updateProjectionMatrix();
    const gateWreathPos = new THREE.Vector3(83.835, 2.05, 89.98);
    camera.position.set(83.835, 2.4, 80.5);
    controls.target.set(83.835, 2.05, 89.98);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=gate') {
    // 校門口警衛室、高聳簍空校名石柱碑與自動伸縮鐵門特寫視角
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 42;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(995), 16, pyToWorldZ(1005));
    controls.target.set(pxToWorldX(1054), 5.5, pyToWorldZ(892));
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=lawn') {
    // 俯瞰活動中心東南草坪（紅色框框植栽區）與中正園、警衛室
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 48;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(930), 82, pyToWorldZ(1050));
    controls.target.set(pxToWorldX(1120), 4, pyToWorldZ(720));
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=dog') {
    // 校犬「小黑」與校門口警衛室特寫
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 38;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(1032), 2.2, pyToWorldZ(928));
    controls.target.set(pxToWorldX(1040), 0.55, pyToWorldZ(916));
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=ferris') {
    // 遠眺西南南（SSW 方位）兒童新樂園摩天輪特寫視角
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 42;
    camera.updateProjectionMatrix();
    const wheelCenter = new THREE.Vector3(pxToWorldX(-550), 48.0, pyToWorldZ(45));
    camera.position.set(pxToWorldX(320), 22.0, pyToWorldZ(240));
    controls.target.copy(wheelCenter);
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=banyan') {
    // 俯瞰大花圃與排球場旁花圃的大榕樹群以及遠方西南側摩天輪
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 52;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(895), 42, pyToWorldZ(665));
    controls.target.set(pxToWorldX(520), 8, pyToWorldZ(320));
    state.cameraTween = null;
    controls.update();
  } else if (h === '#test=floor3f') {
    selectBuilding('chengzheng', '3F', 'cz-308', true);
    if (state.cameraTween) {
      camera.position.copy(state.cameraTween.endCam);
      controls.target.copy(state.cameraTween.endTarget);
      state.cameraTween = null;
    }
  } else if (h === '#test=ecopond') {
    selectBuilding('eco_pond', 'ALL', null, false);
    const target = new THREE.Vector3(pxToWorldX(684), 0, pyToWorldZ(750));
    camera.position.set(pxToWorldX(684) - 8, 66, pyToWorldZ(750) + 34);
    controls.target.copy(target);
    state.cameraTween = null;
  } else if (h === '#test=volleyball') {
    selectBuilding('sports_courts', 'ALL', null, true);
    const target = new THREE.Vector3(pxToWorldX(844), 0, pyToWorldZ(310));
    camera.position.set(pxToWorldX(844) - 25, 62, pyToWorldZ(310) + 52);
    controls.target.copy(target);
    state.cameraTween = null;
  } else if (h === '#test=track') {
    selectBuilding('sports_courts', 'ALL', null, true);
    const target = new THREE.Vector3(pxToWorldX(412), 0, pyToWorldZ(288));
    camera.position.set(pxToWorldX(412) - 30, 85, pyToWorldZ(288) + 90);
    controls.target.copy(target);
    state.cameraTween = null;
  } else if (h === '#test=courts') {
    selectBuilding('sports_courts', 'ALL', null, true);
    const target = new THREE.Vector3(pxToWorldX(950), 0, pyToWorldZ(250));
    camera.position.set(pxToWorldX(950) - 35, 75, pyToWorldZ(250) + 65);
    controls.target.copy(target);
    state.cameraTween = null;
  } else if (h === '#test=walk_stair' || h === '#test=climb') {
    setViewMode('fpv');
    state.walkPersp = '3rd';
    state.fpv.pos.set(64.5, 1.72, -3.45);
    state.fpv.yaw = Math.PI / 2;
    syncFpvCamera();
    updateClimbButtonState();
  } else if (h === '#test=mid_stair') {
    setViewMode('fpv');
    state.walkPersp = '3rd';
    const res = getStairPositionAtDist(28.0);
    state.fpv.pos.set(res.pos.x, res.pos.y + 1.72, res.pos.z);
    state.fpv.yaw = res.yaw;
    syncFpvCamera();
    updateClimbButtonState();
  } else if (h === '#test=walk_in_214') {
    setViewMode('fpv');
    state.walkPersp = '3rd';
    state.fpv.pos.set(58.2, 14.4 + 1.72, 5.0);
    state.fpv.yaw = 0;
    syncFpvCamera();
    updateClimbButtonState();
  } else if (h === '#test=walk') {
    setViewMode('fpv');
    state.fpv.pos.set(pxToWorldX(840), 1.72, pyToWorldZ(475));
    state.fpv.yaw = 0;
    syncFpvCamera();
  } else if (h === '#test=brick') {
    setVisualTheme('brick');
  } else if (h === '#test=night') {
    setVisualTheme('night');
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 54;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(920), 34, pyToWorldZ(680));
    controls.target.set(pxToWorldX(420), 48, pyToWorldZ(200));
    state.cameraTween = null;
    controls.update();
  } else if (h.startsWith('#test=trees')) {
    const n = parseInt(h.replace('#test=trees', ''), 10) || 5000;
    const stats = buildStressTrees(n);
    showToast(`壓力測試：InstancedMesh 建立 ${stats.count} 棵樹，${stats.drawCalls} 次 draw call，耗時 ${stats.ms} ms`);
  } else if (h === '#test=route') {
    document.getElementById('btn-calc-route').click();
  }
}
handleTestHash();
window.addEventListener('hashchange', handleTestHash);

console.log('%c3D Campus Map by Max CHAN', 'color: #8ce0b5; font-weight: bold; font-size: 12px;');

requestAnimationFrame(animate);
