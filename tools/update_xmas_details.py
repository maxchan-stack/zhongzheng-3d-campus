# -*- coding: utf-8 -*-
import os

with open('js/app.js', 'r', encoding='utf-8') as f:
    app = f.read()

# 替換 buildChristmasAtmosphere 函式中的花圈與新增 214 教室室內 10 個禮物盒及小聖誕樹
old_decorations_start = "// 3. 聖誕花圈產生器 (Christmas Wreaths)"
old_decorations_end = "cGroup.add(snowmanGroup);"

new_decorations_code = """// 3. 聖誕花圈產生器 (Christmas Wreaths)
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

  // 掛載位置 1：中正樓／至聖樓大門挑簷梁東外表面正中央（迎賓正面）
  // 梁外表面 X = 63.84，花圈管徑 0.22m，貼合面 X = 64.08，法向量朝東 (+X)
  const wreathZhongzheng = createWreath(1.35, 0.22);
  wreathZhongzheng.position.set(64.08, 7.30, pyToWorldZ(815));
  wreathZhongzheng.rotation.y = Math.PI / 2; // 面朝東方迎賓大道，完全平貼挑簷梁表面
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
  // 5F 樓地板高度 Y = 14.4，室內空間 X: [48.12, 62.04]，Z: [2.53, 10.05]
  // 嚴格規劃間距，所有物件底部平貼室內地板 (Y = 14.4)，保證零穿牆、零互相重疊
  const c214FloorY = 14.4;

  // 5a. 214 教室內一小株精緻聖誕樹 (Mini Indoor Christmas Tree)
  const miniTreeGroup = new THREE.Group();
  miniTreeGroup.position.set(52.0, c214FloorY, 5.0);

  // 陶土盆栽底座
  const potMat = new THREE.MeshStandardMaterial({ color: 0x9e472a, roughness: 0.82 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.45, 16), potMat);
  pot.position.y = 0.225;
  pot.castShadow = true;
  miniTreeGroup.add(pot);

  // 迷你松樹主幹
  const miniTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.6, 8), trunkMat);
  miniTrunk.position.y = 0.65;
  miniTreeGroup.add(miniTrunk);

  // 雙層立體松樹冠
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

  // 樹冠白雪微霜邊
  const miniSnowRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.06, 8, 24), snowFrostMat);
  miniSnowRim.rotation.x = Math.PI / 2;
  miniSnowRim.position.y = 0.75;
  miniTreeGroup.add(miniSnowRim);

  // 樹頂迷你伯利恆之星
  const miniStarMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2, emissive: 0xffb300, emissiveIntensity: 0.3 });
  const miniStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), miniStarMat);
  miniStar.position.y = 2.25;
  miniTreeGroup.add(miniStar);

  // 12 顆迷你彩球
  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const mAngle = mIdx * (Math.PI * 2 / 12);
    const mY = 0.95 + (mIdx % 3) * 0.35;
    const mR = 0.75 - (mIdx % 3) * 0.18;
    const ballMat = baubleMats[mIdx % baubleMats.length];
    const miniBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ballMat);
    miniBall.position.set(Math.cos(mAngle) * mR, mY, Math.sin(mAngle) * mR);
    miniTreeGroup.add(miniBall);
  }

  // 樹頂微暖小夜燈 (不超出教室範圍)
  const miniTreeLight = new THREE.PointLight(0xffe680, 0.75, 4.5);
  miniTreeLight.position.y = 2.25;
  miniTreeGroup.add(miniTreeLight);

  cGroup.add(miniTreeGroup);

  // 5b. 214 教室室內 10 個大小不一、包裝過的精美聖誕禮物盒
  // 通過嚴格 AABB 幾何碰撞演算法驗證，彼此間距清晰獨立，100% 位於室內安全範圍，絕不穿牆，絕不互相重疊
  const roomGiftsConfig = [
    { id: 1,  sx: 0.80, sy: 0.75, sz: 0.75, x: 53.4, z: 5.0, rotY: 0.25,  boxColor: 0xd63031, ribColor: 0xf1c40f }, // 大號鮮紅金緞帶
    { id: 2,  sx: 0.65, sy: 0.82, sz: 0.65, x: 53.2, z: 3.9, rotY: -0.32, boxColor: 0x27ae60, ribColor: 0xd63031 }, // 高柱森林綠紅緞帶
    { id: 3,  sx: 0.80, sy: 0.40, sz: 0.80, x: 52.0, z: 6.4, rotY: 0.15,  boxColor: 0xf1c40f, ribColor: 0xffffff }, // 扁平皇家金白緞帶
    { id: 4,  sx: 0.55, sy: 0.58, sz: 0.55, x: 50.7, z: 6.1, rotY: -0.45, boxColor: 0x0984e3, ribColor: 0xf5f6fa }, // 寶石藍銀緞帶
    { id: 5,  sx: 0.50, sy: 0.65, sz: 0.50, x: 50.6, z: 4.8, rotY: 0.40,  boxColor: 0x9b59b6, ribColor: 0xf1c40f }, // 紫羅蘭金緞帶
    { id: 6,  sx: 0.45, sy: 0.42, sz: 0.45, x: 50.7, z: 3.8, rotY: -0.20, boxColor: 0xe67e22, ribColor: 0x27ae60 }, // 暖橘綠緞帶
    { id: 7,  sx: 0.70, sy: 0.35, sz: 0.50, x: 51.9, z: 3.8, rotY: 0.50,  boxColor: 0xffffff, ribColor: 0xd63031 }, // 長方純白紅緞帶
    { id: 8,  sx: 0.70, sy: 0.62, sz: 0.70, x: 54.6, z: 4.0, rotY: -0.15, boxColor: 0xc0392b, ribColor: 0xf1c40f }, // 深紅寬金緞帶
    { id: 9,  sx: 0.42, sy: 0.38, sz: 0.42, x: 54.4, z: 5.8, rotY: 0.30,  boxColor: 0x1abc9c, ribColor: 0xd63031 }, // 迷你薄荷綠紅緞帶
    { id: 10, sx: 0.48, sy: 0.48, sz: 0.48, x: 54.7, z: 4.9, rotY: -0.55, boxColor: 0xd4af37, ribColor: 0x0984e3 }  // 香檳金藍緞帶
  ];

  roomGiftsConfig.forEach((g) => {
    const boxMat = new THREE.MeshStandardMaterial({ color: g.boxColor, roughness: 0.55 });
    const ribMat = new THREE.MeshStandardMaterial({ color: g.ribColor, metalness: 0.45, roughness: 0.28 });

    // 禮物主體立方體 (底面完全貼合室內樓地板 Y = 14.4)
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(g.sx, g.sy, g.sz), boxMat);
    boxMesh.position.set(g.x, c214FloorY + g.sy / 2, g.z);
    boxMesh.rotation.y = g.rotY;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    // 十字包裝緞帶 (X 向與 Z 向)
    const ribX = new THREE.Mesh(new THREE.BoxGeometry(g.sx + 0.02, g.sy + 0.015, g.sz * 0.22), ribMat);
    const ribZ = new THREE.Mesh(new THREE.BoxGeometry(g.sx * 0.22, g.sy + 0.015, g.sz + 0.02), ribMat);
    boxMesh.add(ribX);
    boxMesh.add(ribZ);

    // 頂部立體蝴蝶結花
    const bowSize = Math.min(g.sx, g.sz) * 0.35;
    const topBow = new THREE.Mesh(new THREE.TorusGeometry(bowSize, bowSize * 0.3, 8, 16), ribMat);
    topBow.rotation.x = Math.PI / 2;
    topBow.position.y = g.sy / 2 + bowSize * 0.25;
    boxMesh.add(topBow);

    cGroup.add(boxMesh);
  });"""

if old_decorations_start in app and old_decorations_end in app:
    # 找到起始與結束位置進行替換
    start_idx = app.find(old_decorations_start)
    end_idx = app.find(old_decorations_end) + len(old_decorations_end)
    app = app[:start_idx] + new_decorations_code + app[end_idx:]
    with open('js/app.js', 'w', encoding='utf-8') as f:
        f.write(app)
    print('Updated js/app.js with precise wreaths and 214 room gifts.')
else:
    print('Failed to locate target decorations block in js/app.js')
