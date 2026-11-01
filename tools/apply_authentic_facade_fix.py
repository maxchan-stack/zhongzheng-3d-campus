# -*- coding: utf-8 -*-
"""
依據使用者提供的最新特寫實景航拍照 (media_1793510116358_3348b031.jpg) 精準重構：
1. 左側大樓（至聖樓，py: 760..885）：
   - 學校核心正門挑空大穿堂位於至聖樓中央軸線（py: 815），挑高兩層樓（1F~2F）通透門廊。
   - 門前設置 8 階深灰色大理石大階梯（寬 24m，進深 5m），正對迎賓廣場與中正園「The statue」雕像島！
   - 門廊懸掛兩道標誌性長條垂直紅底榮譽長幅。
   - 穿堂上方 3F~5F 為橫向出挑的水泥陽台與橫條窗帶。
   - 最左端為格致樓轉角圓弧立面，帶有密集垂直遮陽格柵細條。
2. 右側大樓（中正樓，py: 530..760，長 62 公尺）：
   - 徹底移除此處原先誤植的大穿堂與大階梯！
   - 2F~5F 全棟正面建立極致規律的「混凝土立體方格遮陽深窗陣列（Grid Facade）」，16 個立體凸出框單元，具備深邃凹窗陰影與空調外機托架！
   - 1F 底部外側建立長達 60 公尺的「連續墨綠色斜面遮雨棚」，完美遮蔽 1 樓走道與空調外機！
   - 正面前方為整齊劃一的教職員汽車斜向停車場。
3. 中正園「The statue」雕像島精準對齊至聖樓正門穿堂大階梯軸線（py: 815）。
"""
import re

app_path = '/Users/maxchan/Desktop/3D/js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'function buildGateAndEastPlazaDetails\(\) \{[\s\S]*?(?=\nfunction buildColorfulFlowerBeds)'

new_func = '''function buildGateAndEastPlazaDetails() {
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

  // A. 迎賓廣場米白地磚嵌紅磚方格網線鋪面
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

  // B. 中正園「The statue」雕像島（精確正對至聖樓正門大階梯軸線 py: 815！）
  const islandX = pxToWorldX(1048);
  const islandZ = pyToWorldZ(815);
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
  details3DGroup.add(lawnMound);

  // 假山岩石
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a756b, roughness: 0.88 });
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

  // 「The statue」深青銅色紀念雕像
  const statueMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.4, metalness: 0.6 });
  const statuePedestal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.4), new THREE.MeshStandardMaterial({ color: 0xbab5ab, roughness: 0.8 }));
  statuePedestal.position.set(islandX, 1.6, islandZ);
  statuePedestal.castShadow = true;
  const statueBody = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.2, 10), statueMat);
  statueBody.position.set(islandX, 3.4, islandZ);
  statueBody.castShadow = true;
  const statueHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), statueMat);
  statueHead.position.set(islandX, 4.7, islandZ);
  statueHead.castShadow = true;
  details3DGroup.add(statuePedestal, statueBody, statueHead);

  // C. 教職員斜向停車場（整齊分佈於中正樓正面迎賓廣場 px: 1018..1078, py: 540..745）
  const carColors = [0xf5f5f5, 0x2c333d, 0xd8dce0, 0x8c2d2d, 0x364f6b, 0xfafafa, 0x45494e];
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

  // 天井中央獨立樓梯塔樓
  const stairTower = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 12.0, 6.8),
    new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: 0.8 })
  );
  stairTower.position.set(palmGardenCx, 6.0, palmGardenCz);
  stairTower.castShadow = true;
  details3DGroup.add(stairTower);

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
'''

# 取得原有的警衛室與校門伸縮門代碼 (從 // 7. 校門口警衛室平頂出簷建築 到該函式結尾)
m_guard = re.search(r'(  // 7\. 校門口警衛室平頂出簷建築[\s\S]*?)(?=\nfunction buildColorfulFlowerBeds)', content)
guard_code = m_guard.group(1) if m_guard else ""

complete_new_func = new_func + "\n" + guard_code

content = re.sub(pattern, complete_new_func, content)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("[SUCCESS] Successfully updated js/app.js with authentic facade details!")
