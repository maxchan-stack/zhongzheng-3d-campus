# -*- coding: utf-8 -*-
import os
import re

# 1. 讀取 js/app.js
with open('js/app.js', 'r', encoding='utf-8') as f:
    app = f.read()

# 1a. 在全域宣告處加入 xmas 相關宣告
decl_target = "let classroom214AuraAnim = null;"
decl_repl = """let classroom214AuraAnim = null;
let xmasAtmosphereAnim = null;
const xmasDecorationsGroup = new THREE.Group();
xmasDecorationsGroup.name = 'XMAS_DECORATIONS';"""

if decl_target in app and "let xmasAtmosphereAnim = null;" not in app:
    app = app.replace(decl_target, decl_repl, 1)

# 1b. 在場景添加處加入 scene.add(xmasDecorationsGroup);
scene_target = "const details3DGroup = new THREE.Group();\nscene.add(details3DGroup);"
scene_repl = """const details3DGroup = new THREE.Group();
scene.add(details3DGroup);

scene.add(xmasDecorationsGroup);"""

if scene_target in app and "scene.add(xmasDecorationsGroup);" not in app:
    app = app.replace(scene_target, scene_repl, 1)

# 1c. 在 3D 細節組裝處呼叫 buildChristmasAtmosphere();
call_target = "  // 1d. 214 教室傳奇金色光暈與天降聖光 (Heavenly Sunbeam & Golden Aura)\n  buildClassroom214HeavenlyAura();"
call_repl = """  // 1d. 214 教室傳奇金色光暈與天降聖光 (Heavenly Sunbeam & Golden Aura)
  buildClassroom214HeavenlyAura();

  // 1e. 聖誕節日歡慶氣氛：全校飄雪粒子系統、迎賓廣場巨型立體聖誕樹、聖誕花圈與雪人
  buildChristmasAtmosphere();"""

if call_target in app and "buildChristmasAtmosphere();" not in app:
    app = app.replace(call_target, call_repl, 1)

# 1d. 插入 buildChristmasAtmosphere 和 animateChristmasAtmosphere 函式定義
func_target = "function buildColorfulFlowerBeds() {"
func_code = '''// ==========================================
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
  function createWreath(radius = 1.25) {
    const wGroup = new THREE.Group();
    const wMat = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.85 });
    const wRing = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.28, 12, 32), wMat);
    wGroup.add(wRing);

    const bowMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.5 });
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.24, 10, 10), bowMat);
    bowCenter.position.set(0, -radius * 0.9, radius * 0.15);
    wGroup.add(bowCenter);

    const bowWing1 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.32, radius * 0.1, 8, 16), bowMat);
    bowWing1.position.set(-radius * 0.32, -radius * 0.9, radius * 0.15);
    bowWing1.rotation.y = -0.3;
    wGroup.add(bowWing1);

    const bowWing2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.32, radius * 0.1, 8, 16), bowMat);
    bowWing2.position.set(radius * 0.32, -radius * 0.9, radius * 0.15);
    bowWing2.rotation.y = 0.3;
    wGroup.add(bowWing2);

    const bellMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.25 });
    [-0.14, 0.14].forEach((dx) => {
      const bell = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.18, radius * 0.28, 12), bellMat);
      bell.position.set(dx, -radius * 1.15, radius * 0.18);
      wGroup.add(bell);
    });

    for (let i = 0; i < 8; i++) {
      const bAng = i * (Math.PI * 2 / 8);
      const berry = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.09, 8, 8), bowMat);
      berry.position.set(Math.cos(bAng) * radius, Math.sin(bAng) * radius, radius * 0.22);
      wGroup.add(berry);
    }

    return wGroup;
  }

  // 掛載 1：中正樓挑空大穿堂正門頂部 (高聳大氣)
  const wreathZhongzheng = createWreath(1.35);
  wreathZhongzheng.position.set(pxToWorldX(945), 6.5, pyToWorldZ(745));
  wreathZhongzheng.rotation.y = Math.PI;
  cGroup.add(wreathZhongzheng);

  // 掛載 2：校門口警衛室正面外牆 (入校第一視角)
  const wreathGate = createWreath(0.95);
  wreathGate.position.set(pxToWorldX(1048) - 0.2, 3.4, pyToWorldZ(895) - 1.2);
  wreathGate.rotation.y = Math.PI;
  cGroup.add(wreathGate);

  // 掛載 3：214 教室外廊女兒牆
  const wreath214 = createWreath(0.85);
  wreath214.position.set(pxToWorldX(924) - 2.8, 18.3, pyToWorldZ(563.3));
  wreath214.rotation.y = Math.PI / 2;
  cGroup.add(wreath214);

  // 4. 214 教室專屬立體聖誕雪人 (Classroom 214 Snowman)
  const snowmanGroup = new THREE.Group();
  snowmanGroup.position.set(pxToWorldX(924) + 3.8, 18.25, pyToWorldZ(563.3) - 1.5);
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

function buildColorfulFlowerBeds() {'''

if func_target in app and "function buildChristmasAtmosphere()" not in app:
    app = app.replace(func_target, func_code, 1)

# 1e. 在 animate 函式中呼叫 animateChristmasAtmosphere(now, dt);
anim_target = "  // 運動學生群（田徑奔跑、排球起跳與扣球、籃球跳投與運球）"
anim_repl = """  // 聖誕節日飄雪與彩燈旋轉動態
  animateChristmasAtmosphere(now, dt);

  // 運動學生群（田徑奔跑、排球起跳與扣球、籃球跳投與運球）"""

if anim_target in app and "animateChristmasAtmosphere(now, dt);" not in app:
    app = app.replace(anim_target, anim_repl, 1)

# 1f. 更新 setVisualTheme(theme) 支援 xmas
theme_label_target = "const labelMap = { day: '晴空寫實', pixel: '像素冒險', brick: '微縮積木', night: '星夜光彩' };"
theme_label_repl = "const labelMap = { day: '晴空寫實', pixel: '像素冒險', brick: '微縮積木', night: '星夜光彩', xmas: '聖誕冬雪' };"
if theme_label_target in app:
    app = app.replace(theme_label_target, theme_label_repl, 1)

theme_sky_target = "const skyHex = state.isNight ? 0x081326 : (theme === 'brick' ? 0xcde6f5 : 0xc8dff5);"
theme_sky_repl = """const isXmas = (theme === 'xmas');
  const skyHex = state.isNight ? 0x081326 : (theme === 'brick' ? 0xcde6f5 : (isXmas ? 0xd0e2f2 : 0xc8dff5));"""
if theme_sky_target in app:
    app = app.replace(theme_sky_target, theme_sky_repl, 1)

theme_fog_target = """  scene.fog.density = state.isNight ? 0.0006 : 0.0013;
  hemiLight.intensity = state.isNight ? 0.45 : 0.88;
  hemiLight.color.setHex(state.isNight ? 0x90b8f0 : 0xffffff);
  dirLight.intensity = state.isNight ? 0.35 : 1.18;
  dirLight.color.setHex(state.isNight ? 0xffea9f : 0xfff8e7);"""
theme_fog_repl = """  scene.fog.density = state.isNight ? 0.0006 : (isXmas ? 0.0011 : 0.0013);
  hemiLight.intensity = state.isNight ? 0.45 : (isXmas ? 0.95 : 0.88);
  hemiLight.color.setHex(state.isNight ? 0x90b8f0 : (isXmas ? 0xeef5fc : 0xffffff));
  dirLight.intensity = state.isNight ? 0.35 : (isXmas ? 1.25 : 1.18);
  dirLight.color.setHex(state.isNight ? 0xffea9f : (isXmas ? 0xfffaed : 0xfff8e7));"""
if theme_fog_target in app:
    app = app.replace(theme_fog_target, theme_fog_repl, 1)

# 1g. 在 handleTestHash 支援 #test=xmas
hash_target = "  } else if (h === '#test=gate') {"
hash_repl = """  } else if (h === '#test=xmas') {
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
  } else if (h === '#test=gate') {"""
if hash_target in app and "#test=xmas" not in app:
    app = app.replace(hash_target, hash_repl, 1)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(app)
print('Updated js/app.js successfully.')

# 2. 更新 tools/build_index.js 裡的主題選單
with open('tools/build_index.js', 'r', encoding='utf-8') as f:
    bi = f.read()

bi_menu_target = """          <button type="button" class="theme-item" data-theme="brick">微縮積木</button>
          <button type="button" class="theme-item" data-theme="night">星夜光彩</button>"""
bi_menu_repl = """          <button type="button" class="theme-item" data-theme="brick">微縮積木</button>
          <button type="button" class="theme-item" data-theme="night">星夜光彩</button>
          <button type="button" class="theme-item" data-theme="xmas">聖誕冬雪</button>"""

if bi_menu_target in bi and 'data-theme="xmas"' not in bi:
    bi = bi.replace(bi_menu_target, bi_menu_repl, 1)
    with open('tools/build_index.js', 'w', encoding='utf-8') as f:
        f.write(bi)
    print('Updated tools/build_index.js successfully.')
else:
    print('tools/build_index.js already contains xmas or target not found.')

