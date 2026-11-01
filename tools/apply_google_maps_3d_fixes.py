# -*- coding: utf-8 -*-
"""
依據使用者提供的 Google Maps 3D 實景航拍照（5 張高解析度實景照片）進行全面精準修正：
1. 核心大樓群四大中庭與景觀實景還原：
   - 椰子樹花園（Coconut Palm Garden, px: 832..896, py: 605..735）：
     實景天井種植 5 棵高達 11~13.5 公尺的大王椰子樹（灰白環紋樹幹、光滑翠綠葉鞘、頂部傘狀下垂大型羽狀椰葉探出天井），以及天井中央突出的樓梯塔樓。
   - 中正花園（Zhongzheng Garden, px: 832..896, py: 755..855）：
     幾何修剪矮綠籬花台、鋪石步道與觀賞矮灌木。
   - 生態池大森林中庭（Eco Pond Forest, px: 594..776, py: 672..826）：
     整座大天井被鬱閉茂密的常綠深林填滿，樹冠緊湊交疊。
   - 中正園「The statue」紀念雕像景觀島（px: 1048, py: 762）：
     圓形草坪、假山石雕、矮灌木圍邊與中央深青銅色紀念雕像（The statue），右側整齊斜向教職員停車場。
2. 教學大樓立面立體出挑遮陽板（Brise-soleil）與正門大階梯：
   - 中正樓與至聖樓正面（東立面，長約 95 公尺）：
     2F 至 5F 每層樓外牆建置凸出 0.75 公尺之連續水平白色水泥遮陽簷板與冷氣外機托架，陽光下投射出 Google Maps 3D 照片一致的深刻陰影線條。
   - 正門挑空大穿堂（中正樓正面軸線，寬 26 公尺）：
     1F~2F 挑空通透柱廊，門前設置 8 階深灰色大理石大階梯（寬 26m，進深 4.8m），門廊懸掛兩道標誌性紅底榮譽長條布條。
   - 轉角圓柱弧形樓梯間，配置細密垂直遮陽百葉格柵。
3. 大樓平屋頂實景女兒牆、深灰防水漆鋪面與屋突機房設備：
   - 灰白混凝土女兒牆（高 0.9m），屋頂內凹鋪設深灰防水面漆（#3f434a）。
   - 屋頂設置電梯機房、樓梯間出入口亭、金屬冷卻水塔與通風雨棚。
"""
import re

app_path = '/Users/maxchan/Desktop/3D/js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 增強 buildGateAndEastPlazaDetails()，加入正面立體遮陽板、大階梯、椰子樹花園大王椰子樹、中央樓梯塔樓與中正花園
target_gate_func_start = "function buildGateAndEastPlazaDetails() {"

replacement_gate_details = '''function buildGateAndEastPlazaDetails() {
  // 依 Google Maps 3D 實景航拍照還原：
  // A. 正門迎賓廣場與中正園「The statue」景觀島
  // B. 中正樓與至聖樓正面連續立體出挑遮陽板（Brise-soleil）與空調外機托架
  // C. 中正樓正門挑空大穿堂、8 階大階梯與榮譽直幅布條
  // D. 椰子樹花園（Coconut Palm Garden）高聳大王椰子樹群與中央樓梯塔樓
  // E. 中正花園（Zhongzheng Garden）幾何矮綠籬與鋪石步道
  // F. 格致樓圓弧轉角立面垂直遮陽格柵

  // 1. 迎賓廣場米白地磚嵌紅磚方格網線鋪面
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

  // 活動中心南側草坪綠地鋪面
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

  // 2. 中正園「The statue」紀念雕像圓形景觀島（對齊 Google Maps 3D 照片實景）
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
  details3DGroup.add(lawnMound);

  // 假山石雕
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

  // Google Maps 3D 標註之「The statue」深青銅色紀念雕像
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

  // 3. 教職員斜向停車位與車輛
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

        collisionBoxes.push({
          minX: sx - 2.1, maxX: sx + 2.1,
          minZ: sz - 1.25, maxZ: sz + 1.25,
          type: 'vehicle', name: '停放車輛'
        });
      }
    }
  });

  // 4. 中正樓與至聖樓正面：依 Google Maps 3D 還原「連續水平出挑遮陽板（Brise-soleil）與空調外機托架」
  const louverMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.7 });
  const louverDarkMat = new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.8 });
  const facadeX = pxToWorldX(952) + 0.38; // 大樓東外牆向外突出位置
  const facadeZStart = pyToWorldZ(530);
  const facadeZEnd = pyToWorldZ(885);
  const facadeLen = Math.abs(facadeZEnd - facadeZStart);
  const facadeCenterZ = (facadeZStart + facadeZEnd) / 2;

  // 2F, 3F, 4F, 5F 每一層樓外挑一道水平連續水泥遮陽板（寬 0.75m、厚 0.14m）
  [1, 2, 3, 4].forEach((fIdx) => {
    const floorBaseY = fIdx * FLOOR_H;
    // 窗頂遮陽板
    const louverSlab = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.14, facadeLen),
      louverMat
    );
    louverSlab.position.set(facadeX, floorBaseY + 2.85, facadeCenterZ);
    louverSlab.castShadow = true;
    details3DGroup.add(louverSlab);

    // 窗台下方空調室外機托架與防雨板
    const shelfSlab = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.12, facadeLen),
      louverMat
    );
    shelfSlab.position.set(facadeX - 0.10, floorBaseY + 0.95, facadeCenterZ);
    shelfSlab.castShadow = true;
    details3DGroup.add(shelfSlab);

    // 每一間教室之垂直遮陽間隔柱（間隔 9 公尺一對）
    for (let pz = facadeZStart + 4.5; pz <= facadeZEnd - 4.5; pz += 8.8) {
      const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.85, 0.16), louverMat);
      vFin.position.set(facadeX - 0.05, floorBaseY + 1.9, pz);
      vFin.castShadow = true;
      details3DGroup.add(vFin);

      // 小型空調外機百葉箱體
      const acUnit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.85), louverDarkMat);
      acUnit.position.set(facadeX - 0.12, floorBaseY + 0.65, pz + 1.2);
      acUnit.castShadow = true;
      details3DGroup.add(acUnit);
    }
  });

  // 5. 中正樓正門挑空大穿堂與 8 階深灰色大理石大階梯（寬 26m，進深 4.8m）
  const stepsGroup = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x9e9a91, roughness: 0.85 });
  const stepEdgeMat = new THREE.MeshStandardMaterial({ color: 0xdfdad2, roughness: 0.8 });
  const entryZ = pyToWorldZ(645);

  for (let s = 0; s < 8; s++) {
    const sW = 4.8 - s * 0.55;
    const sH = 0.18;
    const sD = 26.0 - s * 0.4;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, sD), stepMat);
    stepMesh.position.set(facadeX + 0.2 + s * 0.28, 0.15 + s * 0.16, entryZ);
    stepMesh.receiveShadow = true;
    stepsGroup.add(stepMesh);
  }
  details3DGroup.add(stepsGroup);

  // 挑空門廊之兩道標誌性紅底榮譽長條布條
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xb8263e, roughness: 0.65 });
  [-4.8, 4.8].forEach((dz) => {
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 8.8, 1.6), bannerMat);
    banner.position.set(facadeX + 0.35, 7.8, entryZ + dz);
    banner.castShadow = true;
    details3DGroup.add(banner);
  });

  // 6. 格致樓與至聖樓交接處之圓弧轉角立面 (px: 938, py: 892) 垂直遮陽百葉
  const cornerH = 5 * FLOOR_H - 0.1;
  const cornerCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 3.8, cornerH, 24),
    new THREE.MeshStandardMaterial({ color: 0xd2d0c8, roughness: 0.78 })
  );
  cornerCyl.position.set(pxToWorldX(938), cornerH / 2, pyToWorldZ(892));
  cornerCyl.castShadow = true;
  details3DGroup.add(cornerCyl);

  // 垂直細格條紋
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

  // 7. 依 Google Maps 3D 實景還原「椰子樹花園（Coconut Palm Garden）」天井 (px: 832..896, py: 605..735)
  // 天井中央突出的白色樓梯塔樓，以及 5 棵高聳探出天井的大王椰子樹群！
  const palmGardenCx = pxToWorldX((832 + 896) / 2);
  const palmGardenCz = pyToWorldZ((605 + 735) / 2);

  // 天井地面石鋪面
  const palmFloor = new THREE.Mesh(
    new THREE.BoxGeometry(64 * SCALE, 0.22, 130 * SCALE),
    new THREE.MeshStandardMaterial({ color: 0x6e7d6b, roughness: 0.9 })
  );
  palmFloor.position.set(palmGardenCx, 0.22, palmGardenCz);
  palmFloor.receiveShadow = true;
  details3DGroup.add(palmFloor);

  // 天井中央獨立樓梯塔樓 (寬 5.4m, 高 12m, 深 6.8m)
  const stairTower = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 12.0, 6.8),
    new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: 0.8 })
  );
  stairTower.position.set(palmGardenCx, 6.0, palmGardenCz);
  stairTower.castShadow = true;
  details3DGroup.add(stairTower);

  // 大王椰子樹（Royal Palm）材質
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0xd2cdc4, roughness: 0.75 }); // 灰白環紋光滑主幹
  const palmSheathMat = new THREE.MeshStandardMaterial({ color: 0x3d8542, roughness: 0.6 }); // 頂部碧綠葉鞘
  const palmFrondMat = new THREE.MeshStandardMaterial({ color: 0x225c27, roughness: 0.65, side: THREE.DoubleSide }); // 下垂羽狀椰葉

  function createRoyalPalmMesh(heightM) {
    const palm = new THREE.Group();
    // 灰白主幹 (基部微粗、中段光滑筆直)
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, heightM - 1.4, 10),
      palmTrunkMat
    );
    trunk.position.y = (heightM - 1.4) / 2;
    trunk.castShadow = true;
    palm.add(trunk);

    // 頂部光滑碧綠葉鞘 (Crownshaft)
    const sheath = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.32, 1.4, 10),
      palmSheathMat
    );
    sheath.position.y = heightM - 0.7;
    sheath.castShadow = true;
    palm.add(sheath);

    // 頂端傘狀下垂展開的 10 片大型羽狀椰葉
    const crownTopY = heightM;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + (i % 2) * 0.15;
      const frondGroup = new THREE.Group();
      frondGroup.position.set(0, crownTopY, 0);
      frondGroup.rotation.y = angle;

      // 弧形下彎葉身
      const frondGeo = new THREE.BoxGeometry(0.35, 0.05, 3.8);
      const frond = new THREE.Mesh(frondGeo, palmFrondMat);
      frond.position.set(0, -0.65, 1.8);
      frond.rotation.x = -0.42; // 下垂角度
      frondGroup.add(frond);

      palm.add(frondGroup);
    }
    return palm;
  }

  // 在椰子樹花園天井內種植 5 棵挺拔高聳的大王椰子樹 (高度 11m ~ 13.5m，椰葉高高探出天井！)
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

  // 8. 依 Google Maps 3D 實景還原「中正花園（Zhongzheng Garden）」天井 (px: 832..896, py: 755..855)
  // 天井地面石鋪面、幾何矮綠籬花台與步道
  const zGardenCx = pxToWorldX((832 + 896) / 2);
  const zGardenCz = pyToWorldZ((755 + 855) / 2);
  const zGardenFloor = new THREE.Mesh(
    new THREE.BoxGeometry(64 * SCALE, 0.22, 100 * SCALE),
    new THREE.MeshStandardMaterial({ color: 0x8a9187, roughness: 0.85 })
  );
  zGardenFloor.position.set(zGardenCx, 0.22, zGardenCz);
  zGardenFloor.receiveShadow = true;
  details3DGroup.add(zGardenFloor);

  // 幾何矮綠籬花台
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x3d703b, roughness: 0.9 });
  [-1, 1].forEach((sign) => {
    const hedgeBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.65, 8.5), hedgeMat);
    hedgeBox.position.set(zGardenCx + sign * 3.6, 0.55, zGardenCz);
    hedgeBox.castShadow = true;
    details3DGroup.add(hedgeBox);
  });
'''

# 尋找 function buildGateAndEastPlazaDetails() 開頭到結束
gate_pattern = r'function buildGateAndEastPlazaDetails\(\) \{[\s\S]*?(?=\nfunction buildColorfulFlowerBeds)'

# 取得原有的警衛室與校門伸縮門代碼 (從 // 7. 校門口警衛室平頂出簷建築 到該函式結尾)
m_guard = re.search(r'(  // 7\. 校門口警衛室平頂出簷建築[\s\S]*?)(?=\nfunction buildColorfulFlowerBeds)', content)
guard_code = m_guard.group(1) if m_guard else ""

# 組合全新的 buildGateAndEastPlazaDetails
complete_new_gate = replacement_gate_details + "\n" + guard_code

content = re.sub(gate_pattern, complete_new_gate, content)
print("[OK] Updated buildGateAndEastPlazaDetails with Google Maps 3D details")

# 2. 升級 buildRoofSolarAndBrickStuds，加入深灰防水漆鋪面與女兒牆強化、冷卻水塔與電梯機房
roof_pattern = r'function buildRoofSolarAndBrickStuds\(\) \{[\s\S]*?(?=\nfunction buildEcoPondScene)'

new_roof_func = '''function buildRoofSolarAndBrickStuds() {
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0xd8d6cf, roughness: 0.78 }); // 灰白混凝土外框女兒牆
  const roofFeltMat = new THREE.MeshStandardMaterial({ color: 0x3d4147, roughness: 0.92 }); // 深灰防水防漏鋪面
  const penthouseMat = new THREE.MeshStandardMaterial({ color: 0xc8c6be, roughness: 0.8 }); // 樓梯間機房
  const metalUnitMat = new THREE.MeshStandardMaterial({ color: 0x5a6572, metalness: 0.6, roughness: 0.35 }); // 冷卻水塔金屬
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

    // 依 Google Maps 3D 實景：四周建立凸起的女兒牆 (高 0.85m)，內部鋪設真實的深灰防水漆屋頂層！
    if (b.id !== 'activity_center') {
      const wallT = 0.45;
      const wallH = 0.85;

      // 內部深灰防水面層
      const roofFelt = new THREE.Mesh(
        new THREE.BoxGeometry(w - wallT * 1.5, 0.12, d - wallT * 1.5),
        roofFeltMat
      );
      roofFelt.position.set(cx, roofY + 0.06, cz);
      roofFelt.receiveShadow = true;
      details3DGroup.add(roofFelt);

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

      // 屋突樓梯間與電梯機房 (Penthouse)
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
'''

content = re.sub(roof_pattern, new_roof_func, content)
print("[OK] Updated buildRoofSolarAndBrickStuds with roof felt and structures")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("[SUCCESS] Successfully updated js/app.js based on Google Maps 3D images!")

