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
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x4f545c, roughness: 0.9 });
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

  // 校園內部主要道路與廣場鋪面（取代原本 2D 平面圖貼圖）
  addGroundSlab(110, 492, 815, 58, walkwayMat, 0.05);   // 林蔭大道
  addGroundSlab(150, 775, 400, 185, asphaltMat, 0.04);  // 藝德樓南側車道與停車區
  addGroundSlab(552, 908, 465, 86, asphaltMat, 0.04);   // 校門至停車棚車道
  addGroundSlab(770, 462, 195, 55, asphaltMat, 0.05);   // 排球場南側柏油空地（214 實景照片前景）
  addGroundSlab(80, 560, 455, 165, baseballGrassMat, 0.05); // 棒球場外野草皮

  // 藝德女神半圓廣場與棒球場紅土內野
  const yidePlaza = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.10, 28), plazaStoneMat);
  yidePlaza.position.set(pxToWorldX(214), 0.08, pyToWorldZ(648));
  yidePlaza.receiveShadow = true;
  details3DGroup.add(yidePlaza);

  const baseballClay = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.09, 20), clayMat);
  baseballClay.position.set(pxToWorldX(425), 0.09, pyToWorldZ(665));
  details3DGroup.add(baseballClay);

  // 校園外圍真實街道（文林北路、明德路側、承德路側、河濱側）
  addGroundSlab(1355, -120, 95, 1320, asphaltMat, 0.03); // 北側 (+X)：文林北路
  addGroundSlab(-90, 995, 1540, 80, asphaltMat, 0.03);   // 東側 (+Z)：文林北路 75 巷（校門前道路）
  addGroundSlab(-90, -120, 1540, 75, asphaltMat, 0.03);  // 西側 (-Z)：洲美街／河濱公園側
  addGroundSlab(-95, -120, 80, 1190, asphaltMat, 0.03);  // 南側 (-X)：明德路／承德路側

  // 校園四周實體圍牆（含東北側活動中心旁斜向圍牆 px: 1142, py: 852 -> px: 1338, py: 702）
  const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, (702 - 62) * SCALE), wallMat);
  wallNorth.position.set(pxToWorldX(1338), 0.9, pyToWorldZ((62 + 702) / 2));
  const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, WORLD_D * 0.92), wallMat);
  wallSouth.position.set(pxToWorldX(28), 0.9, pyToWorldZ(520));
  const wallWest = new THREE.Mesh(new THREE.BoxGeometry(WORLD_W * 0.92, 1.8, 0.6), wallMat);
  wallWest.position.set(pxToWorldX(685), 0.9, pyToWorldZ(62));

  const diagX1 = pxToWorldX(1142), diagZ1 = pyToWorldZ(852);
  const diagX2 = pxToWorldX(1338), diagZ2 = pyToWorldZ(702);
  const diagLen = Math.hypot(diagX2 - diagX1, diagZ2 - diagZ1);
  const wallDiag = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 1.8, 0.6), wallMat);
  wallDiag.position.set((diagX1 + diagX2) / 2, 0.9, (diagZ1 + diagZ2) / 2);
  wallDiag.rotation.y = -Math.atan2(diagZ2 - diagZ1, diagX2 - diagX1);

  details3DGroup.add(wallNorth, wallSouth, wallWest, wallDiag);

  // 周邊道路與東西南北 3D 浮動標籤
  const perimeterLabels = [
    { text: '⬆ 北 (N) · 文林北路', px: 1385, py: 520 },
    { text: '⬇ 南 (S) · 明德路／軟橋裕民側', px: -45, py: 520 },
    { text: '⬅ 西 (W) · 洲美街／基隆河濱側', px: 680, py: -45 },
    { text: '➡ 東 (E) · 文林北路 75 巷（校門側）', px: 680, py: 1035 }
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
  // 1. 迎賓廣場米白地磚嵌紅磚方格網線鋪面（嚴格沿校園平面圖迎賓廣場多邊形邊界切割，不超出斜向校門圍牆與樹林區）
  const plazaCanvas = document.createElement('canvas');
  plazaCanvas.width = 512;
  plazaCanvas.height = 512;
  const pCtx = plazaCanvas.getContext('2d');
  pCtx.fillStyle = '#ddd5c9';
  pCtx.fillRect(0, 0, 512, 512);
  pCtx.strokeStyle = '#b87662';
  pCtx.lineWidth = 6;
  for (let x = 0; x <= 512; x += 48) {
    pCtx.beginPath();
    pCtx.moveTo(x, 0);
    pCtx.lineTo(x, 512);
    pCtx.stroke();
  }
  for (let y = 0; y <= 512; y += 48) {
    pCtx.beginPath();
    pCtx.moveTo(0, y);
    pCtx.lineTo(512, y);
    pCtx.stroke();
  }
  const plazaTex = new THREE.CanvasTexture(plazaCanvas);
  plazaTex.colorSpace = THREE.SRGBColorSpace;
  plazaTex.wrapS = THREE.RepeatWrapping;
  plazaTex.wrapT = THREE.RepeatWrapping;
  plazaTex.repeat.set(0.18, 0.18);

  // 平面圖迎賓廣場真實多邊形頂點 (px, py)：左接中正樓與至聖樓 (952)，右接活動中心與南側樹林區西緣 (1126)，南接斜向校門口與警衛室
  const plazaPolyPx = [
    [952, 492],
    [1146, 492],
    [1146, 662],
    [1124, 662],
    [1124, 852],
    [1045, 898],
    [1016, 928],
    [965, 982],
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

  // 活動中心南側三角形森林綠地鋪面 (px: 1126..1335, py: 658..850)，對齊平面圖門口方位樹木區底色
  const grovePolyPx = [
    [1126, 658],
    [1336, 658],
    [1336, 702],
    [1142, 852],
    [1126, 852]
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

  // 2. 中正園圓形假山草坪景觀島（嚴格對齊平面圖中正園座標 px: 1048, py: 762）
  const islandX = pxToWorldX(1048);
  const islandZ = pyToWorldZ(762);
  const curbRing = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 8.5, 0.48, 32),
    new THREE.MeshStandardMaterial({ color: 0x9b968c, roughness: 0.85 })
  );
  curbRing.position.set(islandX, 0.38, islandZ);
  curbRing.receiveShadow = true;
  details3DGroup.add(curbRing);

  const lawnMound = new THREE.Mesh(
    new THREE.CylinderGeometry(7.6, 8.0, 0.56, 32),
    new THREE.MeshStandardMaterial({ color: 0x5c7f43, roughness: 0.9 })
  );
  lawnMound.position.set(islandX, 0.46, islandZ);
  lawnMound.receiveShadow = true;
  lawnMound.userData = { buildingId: 'zhongzheng_garden', floorNum: 1, partIdx: 0 };
  buildingMeshes.push(lawnMound);
  details3DGroup.add(lawnMound);

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x827d73, roughness: 0.88 });
  [
    { dx: 0.2, dz: -0.3, r: 1.45, h: 1.85 },
    { dx: -2.2, dz: 1.3, r: 1.05, h: 1.15 },
    { dx: 2.4, dz: 1.6, r: 0.92, h: 0.98 },
    { dx: -1.7, dz: -2.3, r: 0.82, h: 0.88 },
    { dx: 2.0, dz: -1.9, r: 1.0, h: 1.1 }
  ].forEach((rk) => {
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(rk.r, 1), rockMat);
    boulder.scale.set(1.1, rk.h / rk.r, 0.95);
    boulder.position.set(islandX + rk.dx, 0.8 + rk.h * 0.35, islandZ + rk.dz);
    boulder.castShadow = true;
    details3DGroup.add(boulder);
  });

  // 3. 裝置藝術中央綠島與兩側 P 教職員汽車停車格及 3D 停放車輛（嚴格對齊平面圖 px: 1018..1078, py: 536..704）
  const carColors = [0xf5f5f5, 0x2c333d, 0xd8dce0, 0x8c2d2d, 0x364f6b, 0xfafafa, 0x45494e];
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2efe9 });
  [-1, 1].forEach((side) => {
    const rowPx = 1048 + side * 26;
    for (let i = 0; i < 8; i++) {
      const cpy = 548 + i * 19.5;
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
          roughness: 0.35,
          metalness: 0.25
        });
        const carBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.76, 1.72), bodyMat);
        carBody.position.y = 0.55;
        carBody.castShadow = true;
        carGroup.add(carBody);

        const carCabin = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 0.60, 1.50),
          new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.2, metalness: 0.5 })
        );
        carCabin.position.set(-0.15, 1.10, 0);
        carGroup.add(carCabin);

        carGroup.position.set(sx, 0.16, sz);
        carGroup.rotation.y = side * 0.32;
        details3DGroup.add(carGroup);

        // 登錄車輛碰撞邊界盒（人物不能穿過車輛）
        collisionBoxes.push({
          minX: sx - 2.1,
          maxX: sx + 2.1,
          minZ: sz - 1.25,
          maxZ: sz + 1.25,
          type: 'vehicle',
          name: '停放車輛'
        });
      }
    }
  });

  // 4. 格致樓與至聖樓圓弧轉角量體 (px: 938, py: 892)、至聖樓正門階梯 (px: 952..968, py: 775..862) 與紅粉直幅榮譽布條
  const cornerH = 5 * FLOOR_H - 0.1;
  const cornerCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 3.8, cornerH, 24),
    new THREE.MeshStandardMaterial({ color: 0xcfcdc6, roughness: 0.78 })
  );
  cornerCyl.position.set(pxToWorldX(938), cornerH / 2, pyToWorldZ(892));
  cornerCyl.castShadow = true;
  details3DGroup.add(cornerCyl);

  const stepMat = new THREE.MeshStandardMaterial({ color: 0xbcb8b0, roughness: 0.85 });
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.6 - s * 0.9, 0.25, 22.0), stepMat);
    step.position.set(pxToWorldX(956 - s * 1.5), 0.22 + s * 0.22, pyToWorldZ(818));
    details3DGroup.add(step);
  }
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xc85a70, roughness: 0.65 });
  [792, 845].forEach((bpy) => {
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 9.2, 1.55), bannerMat);
    banner.position.set(pxToWorldX(953), 8.2, pyToWorldZ(bpy));
    details3DGroup.add(banner);
  });

  // 5. 中正樓南端山牆彩虹直條馬賽克壁畫与北側一樓綠色遮雨棚 (px: 896..952, py: 530..760)
  const muralColors = [0x2b8cbe, 0x4eb3d3, 0x7bccc4, 0xfdae61, 0xd73027];
  muralColors.forEach((mc, idx) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 4 * FLOOR_H * 0.82, 0.24),
      new THREE.MeshStandardMaterial({ color: mc, roughness: 0.5 })
    );
    stripe.position.set(pxToWorldX(904 + idx * 8.5), 2.5 * FLOOR_H, pyToWorldZ(760));
    details3DGroup.add(stripe);
  });

  const awningMat = new THREE.MeshStandardMaterial({ color: 0x26734d, roughness: 0.55 });
  for (let ay = 552; ay <= 736; ay += 26) {
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 4.6), awningMat);
    awning.position.set(pxToWorldX(954), 3.6, pyToWorldZ(ay));
    awning.rotation.z = -0.22;
    details3DGroup.add(awning);
  }

  // 6. 格致樓外牆雙排綠色波浪頂棚停車棚骨架与斑馬線（嚴格對齊平面圖 px: 625..950, py: 912 & 954）
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

  // 校門口前斑馬線與道路標線
  for (let s = 0; s < 7; s++) {
    const zebra = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.55), lineMat);
    zebra.rotation.x = -Math.PI / 2;
    zebra.position.set(pxToWorldX(935), 0.19, pyToWorldZ(992 + s * 6.2));
    details3DGroup.add(zebra);
  }

  // 7. 校門口警衛室圓拱頂棚與直立校名石柱碑（嚴格對齊平面圖警衛室座標 px: 1016..1045, py: 874..932）
  const guardCanopy = new THREE.Mesh(
    new THREE.CylinderGeometry(3.9, 3.9, 58 * SCALE, 16, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x8da2b5, roughness: 0.35, metalness: 0.35 })
  );
  guardCanopy.rotation.x = Math.PI / 2;
  guardCanopy.scale.set(1, 1, 0.45);
  guardCanopy.position.set(pxToWorldX(1030.5), 3.55, pyToWorldZ(903));
  details3DGroup.add(guardCanopy);

  const gatePylon = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 6.8, 1.85),
    new THREE.MeshStandardMaterial({ color: 0xcac4b8, roughness: 0.72 })
  );
  gatePylon.position.set(pxToWorldX(1048), 3.4, pyToWorldZ(885));
  gatePylon.castShadow = true;
  details3DGroup.add(gatePylon);

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

  const glassTowerX = pxToWorldX(995);
  const glassTowerZ = pyToWorldZ(-28);
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

  // 2. 照片中央背景之雙子星米白格柵住宅大樓 (位於大榕樹與田徑場北彎道後方 px: 685 & 775, py: -34)
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
    const tz = pyToWorldZ(-34);
    const tGeo = new THREE.BoxGeometry(21, 46, 18);
    const tMesh = new THREE.Mesh(tGeo, twinMat);
    tMesh.position.set(tx, 23, tz);
    tMesh.castShadow = true;
    details3DGroup.add(tMesh);
  });

  // 3. 更遠方西南位置 (-X 南方、-Z 西方) 之兒童新樂園摩天輪 (px: -480, py: -380)
  // 完整渲染：中央旋轉軸心、雙層外圈鋼骨、24 根放射狀輻條支架、A 字型支撐立柱與 24 個彩虹漸層色彩車廂 (Gondolas)
  const wheelX = pxToWorldX(-480);
  const wheelZ = pyToWorldZ(-380);
  const wheelCenterY = 46.0;
  const wheelRadius = 32.0;
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(wheelX, wheelCenterY, wheelZ);
  wheelGroup.rotation.y = 0.42;

  const steelMat = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, metalness: 0.35, roughness: 0.3 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x2471a3, metalness: 0.4, roughness: 0.3 });

  // 雙層外圈鋼環 (外環與內環)
  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.55, 10, 48), steelMat);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius * 0.82, 0.42, 8, 48), steelMat);
  wheelGroup.add(outerRim, innerRim);

  // 中央主軸轂心
  const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2.6, 18), hubMat);
  centerHub.rotation.x = Math.PI / 2;
  wheelGroup.add(centerHub);

  // 24 根放射鋼構輻條 (Spokes) 與 24 座彩虹車廂
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xdde4eb, roughness: 0.4 });
  const gondolaCount = 24;
  for (let i = 0; i < gondolaCount; i++) {
    const angle = (i / gondolaCount) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // 鋼構輻條
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, wheelRadius, 6), spokeMat);
    spoke.position.set((wheelRadius / 2) * cosA, (wheelRadius / 2) * sinA, 0);
    spoke.rotation.z = angle - Math.PI / 2;
    wheelGroup.add(spoke);

    // 環間桁架交叉斜撐
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, wheelRadius * 0.18), spokeMat);
    crossBar.position.set((wheelRadius * 0.91) * cosA, (wheelRadius * 0.91) * sinA, 0);
    wheelGroup.add(crossBar);

    // 24 個彩虹漸層顏色車廂 (紅、橙、黃、綠、藍、靛、紫光譜平滑循環)
    const hue = (i / gondolaCount);
    const cabColor = new THREE.Color().setHSL(hue, 0.92, 0.54);
    const gondolaMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.28, metalness: 0.2 });

    const gondola = new THREE.Group();
    gondola.position.set(wheelRadius * cosA, wheelRadius * sinA, 0);

    // 車廂主艙體 (六角柱圓頂流線觀景艙)
    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.25, 2.4, 8), gondolaMat);
    cabin.position.y = -1.2;
    gondola.add(cabin);

    // 觀景窗橫條玻璃環
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x1a2e40, roughness: 0.1, metalness: 0.8 });
    const cabinWindow = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.30, 0.9, 8), windowMat);
    cabinWindow.position.y = -1.15;
    gondola.add(cabinWindow);

    // 吊掛桿臂
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 6), steelMat);
    hanger.position.y = -0.55;
    gondola.add(hanger);

    wheelGroup.add(gondola);
  }
  details3DGroup.add(wheelGroup);

  // A 字型雙向四柱斜向主支架與基座
  const legMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.45, roughness: 0.35 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.7 });
  [-1, 1].forEach((dirX) => {
    [-1, 1].forEach((dirZ) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 1.15, wheelCenterY + 4, 8), legMat);
      leg.position.set(wheelX + dirX * 11.5, wheelCenterY / 2, wheelZ + dirZ * 5.2);
      leg.rotation.z = -dirX * 0.24;
      leg.rotation.x = dirZ * 0.11;
      details3DGroup.add(leg);
    });
  });

  // 支架底座承台
  const wheelBase = new THREE.Mesh(new THREE.BoxGeometry(32, 2.5, 18), baseMat);
  wheelBase.position.set(wheelX, 1.25, wheelZ);
  wheelBase.rotation.y = 0.42;
  details3DGroup.add(wheelBase);
}

function buildRoofSolarAndBrickStuds() {
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0xbab8b1, roughness: 0.85 });
  const penthouseMat = new THREE.MeshStandardMaterial({ color: 0xc8c6be, roughness: 0.8 });
  const studGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 10);
  studGeo.translate(0, 0.21, 0);

  BUILDINGS.forEach((b) => {
    const part = b.parts[0];
    if (!part || part.isPlaza || b.floors < 3) return;
    const w = part.pw * SCALE;
    const d = part.ph * SCALE;
    const cx = pxToWorldX(part.px + part.pw / 2);
    const cz = pyToWorldZ(part.py + part.ph / 2);
    const roofY = b.floors * FLOOR_H;

    // 依 Google Maps 3D 實景建立灰白混凝土平屋頂周圍女兒牆與樓梯間屋突機房（移除不符實景之太陽能板）
    if (b.id !== 'activity_center') {
      const wallT = 0.45;
      const wallH = 0.85;
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

      // 屋突樓梯間機房
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

// 色系造型：1=淺黃綠（圓球闊葉樹）2=中綠（雙層闊葉樹）3=深綠（錐形常綠樹）
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

  const byTone = { 1: [], 2: [], 3: [] };
  rows.forEach((row) => (byTone[TREE_TONES[row[3]] ? row[3] : 2]).push(row));

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
    const mat = new THREE.MeshStandardMaterial({
      color: fillHex,
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: isSelected ? 0.98 : 0.9
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

  renderRightPanel(bObj.data, floorKey, highlightRoomId);
  applyFloorVisibility(buildingId, floorKey);

  if (flyCamera && state.viewMode === 'birdseye') {
    const targetPos = bObj.centerWorld.clone();
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

  const targetMesh = roomMeshes.find((m) => m.userData.roomId === roomId);
  if (targetMesh) {
    const worldPos = targetMesh.position.clone();
    const camPos = worldPos.clone().add(new THREE.Vector3(18, 24, 28));
    animateCameraTo(camPos, worldPos);
    showToast(`已定位：${bObj.data.name} ${floorKey} — ${targetMesh.userData.roomData.fullName || targetMesh.userData.roomData.name}`);
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
  studentAvatarGroup.position.set(state.fpv.pos.x, 0, state.fpv.pos.z);
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

  if (state.viewMode === 'fpv' && state.walkPersp === '3rd') {
    studentAvatarGroup.visible = true;
    const distBack = 5.4;
    const camHeight = 3.2 - Math.sin(state.fpv.pitch) * 1.8;
    camera.position.set(
      state.fpv.pos.x - sinY * distBack,
      Math.max(1.2, camHeight),
      state.fpv.pos.z + cosY * distBack
    );
    camera.lookAt(
      state.fpv.pos.x + sinY * 4.5,
      1.45 + Math.sin(state.fpv.pitch) * 1.5,
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
  const reopenPill = document.getElementById('reopen-drawer-pill');
  if (reopenPill) {
    reopenPill.classList.toggle('visible', !rightOpen && Boolean(state.selectedBuildingId) && state.viewMode === 'birdseye');
  }

  // 動態讀取當前畫面實際可見 UI 區塊的邊界盒，確保手機、平板與桌機皆精準避讓且不誤擋 3D 標籤
  const uiBlockingEls = [
    document.getElementById('top-bar'),
    document.getElementById('left-dock'),
    document.getElementById('compass-box'),
    rightOpen ? rightPanelEl : null,
    document.getElementById('programs-drawer')?.classList.contains('open') ? document.getElementById('programs-drawer') : null,
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
      const overlaps = placedRects.some(
        (pr) => !(rect.r < pr.l || rect.l > pr.r || rect.b < pr.t || rect.t > pr.b)
      );
      if (!overlaps) {
        chosenOffset = { cx, cy, rect };
        break;
      }
    }

    if (chosenOffset || item.id === state.selectedBuildingId) {
      const finalPos = chosenOffset || { cx: sx, cy: sy, rect: { l: sx - w / 2, r: sx + w / 2, t: sy - h, b: sy } };
      placedRects.push(finalPos.rect);
      item.el.style.left = `${finalPos.cx}px`;
      item.el.style.top = `${finalPos.cy}px`;
      item.el.style.opacity = '1';
      item.el.style.pointerEvents = 'auto';
    } else {
      item.el.style.opacity = '0';
      item.el.style.pointerEvents = 'none';
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

// === 13. 視覺風格切換、特色班群導覽與 UI 事件綁定 ===
function setVisualTheme(theme) {
  state.theme = theme;
  state.isNight = (theme === 'night');
  document.body.classList.toggle('night-mode', state.isNight);

  const labelMap = { day: '晴空寫實', pixel: '像素冒險', brick: '微縮積木', night: '星夜光彩' };
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

  const skyHex = state.isNight ? 0x081326 : (theme === 'brick' ? 0xcde6f5 : 0xc8dff5);
  scene.background.setHex(skyHex);
  scene.fog.color.setHex(state.isNight ? 0x0a1628 : skyHex);
  scene.fog.density = state.isNight ? 0.0006 : 0.0013;
  hemiLight.intensity = state.isNight ? 0.45 : 0.88;
  hemiLight.color.setHex(state.isNight ? 0x90b8f0 : 0xffffff);
  dirLight.intensity = state.isNight ? 0.35 : 1.18;
  dirLight.color.setHex(state.isNight ? 0xffea9f : 0xfff8e7);
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

function setupProgramsDrawer() {
  const programs = [
    {
      badge: '藝術才能資優 · 藝德樓 1F–3F',
      title: '音樂班（管弦樂、國樂、鋼琴與理論作曲）',
      desc: '設於校園西南側藝德樓，配備專業演奏廳、合唱教室、琴房群與藝德女神音樂廣場，培育國內外頂尖音樂人才。',
      buildingId: 'yide',
      floorKey: '1F'
    },
    {
      badge: '藝術才能資優 · 藝德樓 3F–4F',
      title: '美術班（西畫、水墨、版畫與視覺設計）',
      desc: '擁有挑高採光畫室、素描水彩專科教室、版畫工坊與展覽藝廊，結合北投人文地景進行創作。',
      buildingId: 'yide',
      floorKey: '3F'
    },
    {
      badge: '藝術才能資優 · 藝德樓／學生活動中心',
      title: '舞蹈班（現代舞、芭蕾、中華民族舞蹈）',
      desc: '配置專業彈性木地板韻律舞蹈教室與學生活動中心展演舞台，每年舉辦大型舞展。',
      buildingId: 'activity_center',
      floorKey: '2F'
    },
    {
      badge: '科學與跨域探究 · 科學館／求真樓',
      title: 'AI 與數理科學實驗班群',
      desc: '整合科學館物理、化學、生物實驗室與 AI 智慧教室專科空間及生態池實地觀測場域。',
      buildingId: 'science',
      floorKey: '2F'
    },
    {
      badge: '國際教育 · 圖書館／敏求樓／中正樓',
      title: '雙語實驗班與國際人文班群',
      desc: '結合 3 層樓獨立圖書館數位學習中心、國際交流專科教室與雙語課程，拓展全球視野。',
      buildingId: 'library',
      floorKey: '2F'
    },
    {
      badge: '競技運動 · 400m 藍色跑道／格致樓／游泳池',
      title: '體育班與校隊訓練場域（擊劍、籃球、排球、田徑）',
      desc: '配備國際標準 400 公尺鮮藍色 PU 跑道、5 座東西向排球場、6 座籃球場、游泳池與格致樓擊劍練習室。',
      buildingId: 'sports_courts',
      floorKey: 'ALL'
    }
  ];

  const listEl = document.getElementById('programs-list');
  const drawerEl = document.getElementById('programs-drawer');
  if (!listEl || !drawerEl) return;

  listEl.innerHTML = '';
  programs.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'program-card';
    card.innerHTML = `
      <span class="program-badge">${p.badge}</span>
      <h4>${p.title}</h4>
      <p>${p.desc}</p>
    `;
    card.addEventListener('click', () => {
      drawerEl.classList.remove('open');
      selectBuilding(p.buildingId, p.floorKey, null, true);
    });
    listEl.appendChild(card);
  });

  document.getElementById('btn-programs')?.addEventListener('click', () => {
    drawerEl.classList.toggle('open');
  });
  document.getElementById('programs-close')?.addEventListener('click', () => {
    drawerEl.classList.remove('open');
  });
}

function setupWalkSpawnButtons() {
  const spawns = [
    { label: '校門迎賓廣場', px: 1005, py: 915, yaw: -Math.PI / 2 },
    { label: '中正園水池', px: 905, py: 760, yaw: 0 },
    { label: '排球場與操場', px: 840, py: 472, yaw: 0 },
    { label: '森林生態池', px: 735, py: 740, yaw: -Math.PI / 2 },
    { label: '大花圃林蔭道', px: 675, py: 535, yaw: 0 },
    { label: '藝德女神廣場', px: 214, py: 648, yaw: Math.PI / 2 }
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
      state.fpv.pos.set(pxToWorldX(sp.px), 1.72, pyToWorldZ(sp.py));
      state.fpv.yaw = sp.yaw;
      syncFpvCamera();
      state.needsRender = true;
      showToast(`已瞬移至「${sp.label}」`);
    });
    containerEl.appendChild(btn);
  });
}

function setupUIAndInteractions() {
  setupProgramsDrawer();
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
      document.getElementById('programs-drawer')?.classList.remove('open');
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

  // 滑鼠左鍵平移／旋轉切換
  const panModeBtn = document.getElementById('left-drag-pan-btn');
  const rotModeBtn = document.getElementById('left-drag-rot-btn');
  panModeBtn?.addEventListener('click', () => {
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    panModeBtn.classList.add('active');
    rotModeBtn?.classList.remove('active');
    showToast('已切換為「左鍵拖曳平移地圖」');
  });
  rotModeBtn?.addEventListener('click', () => {
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    rotModeBtn.classList.add('active');
    panModeBtn?.classList.remove('active');
    showToast('已切換為「左鍵拖曳旋轉視角」');
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
    if (state.viewMode === 'fpv') {
      isDraggingLook = true;
      prevLook = { x: e.clientX, y: e.clientY };
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (state.viewMode === 'fpv' && isDraggingLook) {
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
    isDraggingLook = false;
    const moveDist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    if (moveDist > 6 || e.target !== renderer.domElement) return;

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

  joyZone.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    joyActive = true;
    if (state.viewMode !== 'fpv') setViewMode('fpv');
    state.autoWalking = false;
    state.fpv.targetWalkPoint = null;
    updateJoystick(e);
  });

  window.addEventListener('pointermove', (e) => {
    if (joyActive) updateJoystick(e);
  });

  window.addEventListener('pointerup', () => {
    if (joyActive) {
      joyActive = false;
      state.fpv.joyX = 0;
      state.fpv.joyY = 0;
      joyKnob.style.transform = 'translate(0px, 0px)';
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
            showToast(`碰撞阻擋：${hit.name}`);
            lastCollisionToast = now;
          }
        }
        syncFpvCamera();
        state.needsRender = true;
      }
    }
  }

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
  } else if (h === '#test=garden') {
    selectBuilding('zhongzheng_garden', 'ALL', null, true);
    if (state.cameraTween) {
      camera.position.copy(state.cameraTween.endCam);
      controls.target.copy(state.cameraTween.endTarget);
      state.cameraTween = null;
    }
  } else if (h === '#test=gate') {
    // 校門口警衛室一側俯瞰視角（對照 Google Maps 3D 實景圖）
    document.getElementById('right-panel')?.classList.add('collapsed');
    camera.fov = 46;
    camera.updateProjectionMatrix();
    camera.position.set(pxToWorldX(920), 78, pyToWorldZ(1125));
    controls.target.set(pxToWorldX(1020), 6, pyToWorldZ(720));
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

requestAnimationFrame(animate);
