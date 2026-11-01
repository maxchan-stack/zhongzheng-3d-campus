# -*- coding: utf-8 -*-
"""
更新 js/app.js：
1. 宣告 campusNpcs = { sports: [], walkway: [] }
2. 在 buildCampus3DDetails 中加入 buildCampusSportsAndWalkwayNPCs()
3. 大幅強化 buildCampusDogsAndMagpies()：
   - 放大藍鵲比例 2.4 倍，尾羽長 1.15m，增加琉璃藍發光微感
   - 數量擴展至 54 隻，精確分佈在向陽開闊樹梢、石柱碑橫樑、警衛室花架、中正園圓形草坪老榕樹、紅框草坪樹林外緣枝枒、田徑場西側雙排大樹外側、大花圃垂枝榕樹與生態池岸邊
4. 新增 buildCampusSportsAndWalkwayNPCs()：
   - 操場運動學生（8 人跑步、8 人踢球與拉筋）
   - 排球場攻防學生（16 人分佈在 2 面球場 + 2 顆排球）
   - 籃球場 3 on 3 鬥牛學生（16 人分佈在 2 面球場 + 2 顆橘色籃球）
   - 校園主要道路漫步師生（24 位分佈在迎賓道、中正園與圖書館廣場）
5. 在 animate(now) 中驅動運動與步行動畫
6. 支援 NPC 碰撞對話 Toast
"""
import re

app_path = '/Users/maxchan/Desktop/3D/js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 在 animatedAnimals 後加入 campusNpcs
target_decl = """const animatedAnimals = {
  dogs: [],
  magpies: []
};"""

replacement_decl = """const animatedAnimals = {
  dogs: [],
  magpies: []
};

const campusNpcs = {
  sports: [],
  walkway: []
};"""

if target_decl in content:
    content = content.replace(target_decl, replacement_decl, 1)
    print("[OK] Replaced animatedAnimals declaration")
else:
    print("[WARN] target_decl not found")

# 2. 在 buildCampus3DDetails() 中加入 buildCampusSportsAndWalkwayNPCs()
target_call = """  // 1b. 校園守護者黑色小狗群（校犬小黑、歐告、黑皮、黑輪）與樹梢隨機棲息之臺灣特有種「臺灣藍鵲」
  buildCampusDogsAndMagpies();"""

replacement_call = """  // 1b. 校園守護者黑色小狗群（校犬小黑、歐告、黑皮、黑輪）與樹梢隨機棲息之臺灣特有種「臺灣藍鵲」
  buildCampusDogsAndMagpies();

  // 1c. 400 公尺田徑場、排球場、籃球場運動學生群，以及校園主要幹道漫步之師生群
  buildCampusSportsAndWalkwayNPCs();"""

if target_call in content:
    content = content.replace(target_call, replacement_call, 1)
    print("[OK] Added buildCampusSportsAndWalkwayNPCs() call in buildCampus3DDetails")
else:
    print("[WARN] target_call not found")

# 3. 替換 buildCampusDogsAndMagpies 函式，並在下方追加 buildCampusSportsAndWalkwayNPCs
# 找到 function buildCampusDogsAndMagpies() 到 function buildColorfulFlowerBeds() 之間的內容
pattern = r'(// === 黑色校犬群（小黑、歐告、黑皮、黑輪）與樹梢隨機臺灣藍鵲（臺灣特有種） ===\s*function buildCampusDogsAndMagpies\(\) \{[\s\S]*?\n\}\n\n)(function buildColorfulFlowerBeds\(\))'

new_dogs_and_magpies_and_npcs = '''// === 黑色校犬群（小黑、歐告、黑皮、黑輪）與樹梢顯著臺灣特有種「臺灣藍鵲」 ===
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

    // 臺灣高砂犬標誌性直立尖耳 (Pricked Ears)
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
      // 趴姿四肢微曲
      const pawGeo = new THREE.BoxGeometry(0.12, 0.10, 0.24);
      [[-0.18, 0.05, 0.28], [0.18, 0.05, 0.28], [-0.20, 0.05, -0.22], [0.20, 0.05, -0.22]].forEach(([lx, ly, lz]) => {
        const paw = new THREE.Mesh(pawGeo, furMat);
        paw.position.set(lx, ly, lz);
        paw.castShadow = true;
        dog.add(paw);
      });
    } else {
      // 站立四肢
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

    // 臺灣犬特徵：經典向上捲曲之鐮刀尾 (Sickle Tail)
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

  // 4 隻黑色校犬配置位置
  const dogConfigs = [
    { name: '小黑', px: 1040, py: 916, yaw: -0.75, isLying: false, intro: '校門口大門值勤警備隊長，每天守護同學平安上下學！' },
    { name: '歐告', px: 1085, py: 760, yaw: 1.15, isLying: true, intro: '在中正園草坪享受溫暖陽光曬太陽，個性溫和親人！' },
    { name: '黑皮', px: 785, py: 575, yaw: 0.32, isLying: false, intro: '大花圃老榕樹下的運動健將，最愛看排球與籃球比賽！' },
    { name: '黑輪', px: 360, py: 125, yaw: -1.45, isLying: false, intro: '田徑場跑道巡查員，陪著體育班選手一同晨操熱身！' }
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

    // 登錄實體碰撞體（人物不能穿過黑色小狗）
    collisionCircles.push({
      x: wx,
      z: wz,
      r: 0.58,
      type: 'dog',
      name: `校犬「${cfg.name}」`
    });
  });

  // === 54 隻大幅放大顯著者臺灣特有種「臺灣藍鵲（長尾山娘）」===
  // 尺寸放大 2.4 倍，色彩更耀眼，具備微弱寶藍色自發光，不再埋藏在樹冠中央，而是分佈在開闊向陽枝枒、大門橫樑與圍欄！
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

  // 54 隻藍鵲精準分佈點：向陽外緣、建築標誌、老樹垂枝（避開樹頂盲點）
  const magpiePlacements = [
    // 1. 校門口簍空金字石柱碑頂部橫樑 (px: 1054, py: 890..895, y: 7.6m，一進門最醒目的地標)
    { px: 1054, py: 890, y: 7.6, yaw: 0.4 },
    { px: 1054, py: 896, y: 7.6, yaw: -0.6 },

    // 2. 警衛室花架與自動鐵門立柱 (y: 2.2m..3.8m)
    { px: 1022, py: 868, y: 3.8, yaw: 1.2 },
    { px: 1018, py: 874, y: 3.6, yaw: -1.5 },
    { px: 1068, py: 894, y: 2.1, yaw: 0.8 },

    // 3. 中正園圓形草坪假山與老榕樹向陽突出低枝 (px: 1070..1100, py: 740..780, y: 3.2m..4.6m)
    { px: 1074, py: 746, y: 3.6, yaw: -0.8 },
    { px: 1092, py: 752, y: 4.2, yaw: 1.5 },
    { px: 1084, py: 768, y: 3.8, yaw: 2.4 },
    { px: 1068, py: 760, y: 3.4, yaw: -2.1 },
    { px: 1098, py: 772, y: 4.5, yaw: 0.1 },
    { px: 1088, py: 740, y: 3.9, yaw: 1.8 },

    // 4. 活動中心南側紅框新植景觀樹林向陽樹梢 (px: 1160..1310, py: 680..810, y: 3.5m..5.5m)
    { px: 1162, py: 685, y: 4.2, yaw: 0.7 },
    { px: 1185, py: 692, y: 4.8, yaw: -1.2 },
    { px: 1210, py: 700, y: 3.8, yaw: 2.1 },
    { px: 1235, py: 712, y: 5.2, yaw: -0.4 },
    { px: 1260, py: 725, y: 4.5, yaw: 1.1 },
    { px: 1285, py: 738, y: 3.9, yaw: -2.3 },
    { px: 1308, py: 750, y: 4.8, yaw: 0.5 },
    { px: 1172, py: 720, y: 4.0, yaw: -0.9 },
    { px: 1198, py: 735, y: 5.0, yaw: 1.7 },
    { px: 1222, py: 750, y: 3.7, yaw: -1.8 },
    { px: 1248, py: 765, y: 4.6, yaw: 0.3 },
    { px: 1272, py: 780, y: 4.1, yaw: 2.6 },
    { px: 1295, py: 795, y: 5.3, yaw: -1.5 },
    { px: 1215, py: 785, y: 3.9, yaw: 1.4 },

    // 5. 400 公尺藍色田徑場西側雙排大樹向外突出枝枒 (px: 210..690, py: 86..108, y: 3.8m..5.2m)
    { px: 215, py: 92, y: 4.2, yaw: 1.6 },
    { px: 268, py: 88, y: 4.8, yaw: -1.1 },
    { px: 320, py: 94, y: 3.9, yaw: 0.4 },
    { px: 375, py: 90, y: 5.1, yaw: 2.2 },
    { px: 430, py: 96, y: 4.4, yaw: -2.0 },
    { px: 485, py: 91, y: 4.7, yaw: 0.9 },
    { px: 540, py: 95, y: 3.8, yaw: -0.7 },
    { px: 595, py: 89, y: 5.0, yaw: 1.3 },
    { px: 645, py: 94, y: 4.3, yaw: -1.7 },
    { px: 690, py: 90, y: 4.9, yaw: 0.2 },

    // 6. 排球場看台後方與大花圃大榕樹垂枝 (px: 620..830, py: 530..610, y: 2.8m..4.6m)
    { px: 625, py: 575, y: 3.8, yaw: -1.4 },
    { px: 665, py: 585, y: 4.5, yaw: 0.6 },
    { px: 705, py: 565, y: 3.2, yaw: 2.0 },
    { px: 745, py: 590, y: 4.2, yaw: -0.5 },
    { px: 785, py: 555, y: 3.5, yaw: 1.1 },
    { px: 825, py: 580, y: 4.6, yaw: -2.4 },
    { px: 645, py: 545, y: 4.0, yaw: 0.8 },
    { px: 725, py: 605, y: 3.6, yaw: -1.9 },
    { px: 765, py: 535, y: 4.4, yaw: 1.7 },
    { px: 805, py: 600, y: 3.9, yaw: -0.3 },

    // 7. 生態池深林岸邊低垂枝枒 (px: 640..740, py: 710..790, y: 2.6m..4.4m)
    { px: 645, py: 720, y: 3.2, yaw: 1.2 },
    { px: 675, py: 735, y: 4.1, yaw: -1.6 },
    { px: 705, py: 715, y: 3.5, yaw: 0.5 },
    { px: 735, py: 740, y: 4.3, yaw: 2.3 },
    { px: 655, py: 765, y: 2.9, yaw: -0.8 },
    { px: 685, py: 780, y: 4.0, yaw: 1.9 },
    { px: 715, py: 770, y: 3.7, yaw: -2.2 },
    { px: 660, py: 745, y: 3.4, yaw: 0.1 },
    { px: 725, py: 785, y: 4.2, yaw: -1.1 }
  ];

  magpiePlacements.forEach((p) => {
    const m = createMagpieMesh();
    const wx = pxToWorldX(p.px);
    const wz = pyToWorldZ(p.py);
    m.group.position.set(wx, p.y, wz);
    m.group.rotation.y = p.yaw;
    details3DGroup.add(m.group);

    animatedAnimals.magpies.push({
      ...m,
      wx, wz,
      baseY: p.y,
      seed: Math.random() * 100
    });
  });
}

// === 運動學生（田徑場、排球場、籃球場）與校園道路漫步師生 NPC 群 ===
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

  // 運動球體材質
  const soccerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const soccerPatchMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const basketballMat = new THREE.MeshStandardMaterial({ color: 0xdf5b12, roughness: 0.55 });
  const volleyballMat = new THREE.MeshStandardMaterial({ color: 0xf0e68c, roughness: 0.4 });

  // 人形產生器
  function createHumanoid({
    gender = 'boy',
    role = 'student_walk', // 'student_walk' | 'student_run' | 'teacher_walk' | 'volleyball' | 'basketball' | 'soccer' | 'stretch'
    poseType = 'walk',
    shirtMat = uniformShirtMat,
    bottomMat = uniformPantsMat,
    hairColor = 'black',
    hasBag = true,
    hasBriefcase = false,
    hasBinder = false
  }) {
    const root = new THREE.Group();

    // 軀幹 (Torso, 寬 0.46, 高 0.56, 厚 0.24)
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

    // 配件：書包 / 公事包 / 講義夾
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

    const armMat = shirtMat;
    const legMat = bottomMat;

    const leftArm = makePivot(-0.31, 1.24, 0, 0.14, 0.50, 0.14, armMat);
    const rightArm = makePivot(0.31, 1.24, 0, 0.14, 0.50, 0.14, armMat);
    const leftLeg = makePivot(-0.13, 0.70, 0, 0.16, 0.68, 0.16, legMat);
    const rightLeg = makePivot(0.13, 0.70, 0, 0.16, 0.68, 0.16, legMat);

    // 依姿態給定初始關節角度
    if (poseType === 'spike') {
      // 網前起跳暴扣
      rightArm.rotation.x = -2.3; // 右手大幅後拉高舉扣球
      leftArm.rotation.x = -1.2;  // 左手前伸維持平衡
      leftLeg.rotation.x = 0.45;  // 雙腿屈膝滯空
      rightLeg.rotation.x = 0.35;
    } else if (poseType === 'block') {
      // 雙人起跳攔網
      leftArm.rotation.x = -2.7;  // 雙手垂直高舉過網
      rightArm.rotation.x = -2.7;
      leftLeg.rotation.x = 0.3;
      rightLeg.rotation.x = 0.3;
    } else if (poseType === 'pass') {
      // 低手墊球
      leftArm.rotation.x = -0.75;
      rightArm.rotation.x = -0.75;
      leftArm.rotation.z = -0.22;
      rightArm.rotation.z = 0.22;
      leftLeg.rotation.x = -0.35;
      rightLeg.rotation.x = -0.35;
    } else if (poseType === 'shoot') {
      // 籃球跳投
      rightArm.rotation.x = -2.4;
      leftArm.rotation.x = -1.8;
      leftLeg.rotation.x = 0.25;
      rightLeg.rotation.x = 0.25;
    } else if (poseType === 'dribble') {
      // 運球突破壓低重心
      rightArm.rotation.x = -0.65;
      leftArm.rotation.x = 0.45;
      leftLeg.rotation.x = -0.4;
      rightLeg.rotation.x = 0.4;
    } else if (poseType === 'stretch') {
      // 弓箭步伸展
      leftLeg.rotation.x = -0.7;
      rightLeg.rotation.x = 0.8;
      leftArm.rotation.x = -0.3;
      rightArm.rotation.x = -0.3;
    }

    return { root, headGroup, leftArm, rightArm, leftLeg, rightLeg };
  }

  // 2. 建立田徑場運動學生（跑道 8 人跑步、中央草坪 8 人踢球與拉筋）
  const trackRunners = [
    // 西側跑道（由西向東奔馳）
    { px: 290, py: 132, yaw: Math.PI / 2, shirt: peBlueShirtMat, name: '體育班 400 接力第一棒' },
    { px: 350, py: 135, yaw: Math.PI / 2, shirt: peOrangeShirtMat, name: '田徑隊衝刺選手' },
    { px: 410, py: 132, yaw: Math.PI / 2, shirt: peWhiteShirtMat, name: '高二體育課跑步學生' },
    { px: 470, py: 135, yaw: Math.PI / 2, shirt: peBlueShirtMat, name: '體育班 400 接力第二棒' },

    // 東側跑道（由東向西衝刺）
    { px: 320, py: 444, yaw: -Math.PI / 2, shirt: peOrangeShirtMat, name: '中正高中長跑選手' },
    { px: 380, py: 441, yaw: -Math.PI / 2, shirt: peBlueShirtMat, name: '田徑隊彎道跨步選手' },
    { px: 450, py: 444, yaw: -Math.PI / 2, shirt: peWhiteShirtMat, name: '高一熱身慢跑同學' },
    { px: 520, py: 441, yaw: -Math.PI / 2, shirt: peOrangeShirtMat, name: '田徑隊衝刺主力' }
  ];

  trackRunners.forEach((cfg) => {
    const h = createHumanoid({
      role: 'student_run',
      poseType: 'run',
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
      role: 'runner',
      wx, wz,
      baseY: 0.35,
      speed: 0.016,
      amp: 0.85,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: '今天田徑場天氣超棒，正在全力衝刺練習中！'
    });
  });

  // 中央足球草皮群（4 位踢球 + 4 位拉筋熱身 + 1 顆足球）
  const fieldStudents = [
    { px: 360, py: 270, yaw: 0.8, pose: 'dribble', shirt: peWhiteShirtMat, name: '足球社 前鋒' },
    { px: 380, py: 275, yaw: -2.3, pose: 'run', shirt: peBlueShirtMat, name: '足球社 中場' },
    { px: 420, py: 265, yaw: 1.6, pose: 'dribble', shirt: peOrangeShirtMat, name: '足球社 邊鋒' },
    { px: 440, py: 290, yaw: -1.2, pose: 'run', shirt: peWhiteShirtMat, name: '足球社 後衛' },

    { px: 310, py: 230, yaw: 0.4, pose: 'stretch', shirt: peBlueShirtMat, name: '熱身伸展同學 A' },
    { px: 330, py: 240, yaw: -0.7, pose: 'stretch', shirt: peOrangeShirtMat, name: '熱身伸展同學 B' },
    { px: 480, py: 320, yaw: 2.1, pose: 'stretch', shirt: peWhiteShirtMat, name: '熱身伸展同學 C' },
    { px: 500, py: 335, yaw: -1.9, pose: 'stretch', shirt: peBlueShirtMat, name: '熱身伸展同學 D' }
  ];

  fieldStudents.forEach((cfg) => {
    const h = createHumanoid({
      role: cfg.pose === 'stretch' ? 'stretch' : 'soccer',
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
      role: cfg.pose === 'stretch' ? 'stretcher' : 'soccer',
      wx, wz,
      baseY: 0.35,
      speed: 0.006,
      amp: 0.25,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: cfg.pose === 'stretch' ? '運動前要充分做好伸展拉筋，預防運動傷害！' : '傳球！注意身後的防守空檔！'
    });
  });

  // 草坪足球
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), soccerMat);
  ballMesh.position.set(pxToWorldX(372), 0.54, pyToWorldZ(272));
  ballMesh.castShadow = true;
  details3DGroup.add(ballMesh);

  // 3. 建立排球場運動學生（2 面球場共 16 人 + 2 顆排球）
  // 第 2 面球場 (py = 250, 4 vs 4 攻防)
  const vbCourt1 = [
    // 網子北側（扣球隊伍）
    { px: 836, py: 250, y: 1.45, yaw: 0, pose: 'spike', name: '排球隊 主攻手（起跳暴扣）' },
    { px: 830, py: 250, y: 0.35, yaw: 0, pose: 'dribble', name: '排球隊 二傳托球手' },
    { px: 820, py: 243, y: 0.35, yaw: 0.2, pose: 'pass', name: '排球隊 自由球員（接應）' },
    { px: 820, py: 257, y: 0.35, yaw: -0.2, pose: 'pass', name: '排球隊 後排防守手' },

    // 網子南側（防守與攔網隊伍）
    { px: 852, py: 248, y: 1.35, yaw: Math.PI, pose: 'block', name: '排球隊 攔網手 A' },
    { px: 852, py: 253, y: 1.35, yaw: Math.PI, pose: 'block', name: '排球隊 攔網手 B' },
    { px: 866, py: 244, y: 0.35, yaw: Math.PI - 0.2, pose: 'pass', name: '排球隊 後排接球手' },
    { px: 866, py: 256, y: 0.35, yaw: Math.PI + 0.2, pose: 'pass', name: '排球隊 隊長（準備救球）' }
  ];

  vbCourt1.forEach((cfg) => {
    const h = createHumanoid({
      role: 'volleyball',
      poseType: cfg.pose,
      shirtMat: cfg.px < 844 ? peBlueShirtMat : peOrangeShirtMat,
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
      role: 'volleyball',
      wx, wz,
      baseY: cfg.y,
      isAir: cfg.y > 0.5,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: '漂亮的一傳！看我的強力扣殺！'
    });
  });

  // 球網上方排球
  const vbBall1 = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), volleyballMat);
  vbBall1.position.set(pxToWorldX(842), 2.75, pyToWorldZ(249.5));
  vbBall1.castShadow = true;
  details3DGroup.add(vbBall1);

  // 第 4 面排球場 (py = 370, 8 人發球與對空接球練習)
  const vbCourt2 = [
    { px: 822, py: 362, y: 0.35, yaw: 0.3, pose: 'pass', name: '高二排球社 發球手' },
    { px: 825, py: 378, y: 0.35, yaw: -0.2, pose: 'dribble', name: '高二排球社 托球練習' },
    { px: 834, py: 370, y: 0.35, yaw: 0, pose: 'pass', name: '高二排球社 墊球練習' },
    { px: 816, py: 370, y: 0.35, yaw: 0.1, pose: 'pass', name: '高二排球社 準備接球' },

    { px: 864, py: 362, y: 0.35, yaw: Math.PI - 0.2, pose: 'pass', name: '高一排球新生 A' },
    { px: 862, py: 378, y: 0.35, yaw: Math.PI + 0.1, pose: 'pass', name: '高一排球新生 B' },
    { px: 854, py: 370, y: 0.35, yaw: Math.PI, pose: 'dribble', name: '高一排球新生 C' },
    { px: 872, py: 370, y: 0.35, yaw: Math.PI, pose: 'pass', name: '高一排球新生 D' }
  ];

  vbCourt2.forEach((cfg) => {
    const h = createHumanoid({
      role: 'volleyball',
      poseType: cfg.pose,
      shirtMat: peWhiteShirtMat,
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
      role: 'volleyball',
      wx, wz,
      baseY: cfg.y,
      isAir: false,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: '手腕打平、壓低重心，把球穩穩送到二傳手頭頂！'
    });
  });

  const vbBall2 = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), volleyballMat);
  vbBall2.position.set(pxToWorldX(840), 1.95, pyToWorldZ(370));
  vbBall2.castShadow = true;
  details3DGroup.add(vbBall2);

  // 4. 建立籃球場 3 on 3 鬥牛與外線投籃學生（16 人 + 2 顆籃球）
  // 西區第 2 場 (px: 950, py: 225, 3 on 3 鬥牛)
  const bbCourt1 = [
    { px: 940, py: 225, y: 0.35, yaw: 0.5, pose: 'dribble', shirt: peOrangeShirtMat, name: '籃球隊 控球後衛（突破運球）' },
    { px: 946, py: 225, y: 0.35, yaw: -2.6, pose: 'pass', shirt: peBlueShirtMat, name: '籃球隊 防守大鎖（貼身緊逼）' },
    { px: 928, py: 223, y: 1.25, yaw: 0.8, pose: 'shoot', shirt: peOrangeShirtMat, name: '籃球隊 得分後衛（挑籃上籃）' },
    { px: 924, py: 227, y: 0.35, yaw: -1.9, pose: 'block', shirt: peBlueShirtMat, name: '籃球隊 中鋒（禁區卡位）' },
    { px: 958, py: 218, y: 0.35, yaw: -1.2, pose: 'stretch', shirt: peOrangeShirtMat, name: '籃球隊 側翼射手' },
    { px: 956, py: 232, y: 0.35, yaw: 1.4, pose: 'pass', shirt: peBlueShirtMat, name: '籃球隊 大前鋒' },

    // 外圍練投與加油同學
    { px: 975, py: 220, y: 0.35, yaw: -1.6, pose: 'dribble', shirt: peWhiteShirtMat, name: '高二籃球社 候補球員' },
    { px: 975, py: 230, y: 0.35, yaw: -1.4, pose: 'stretch', shirt: peWhiteShirtMat, name: '高二籃球社 經理' }
  ];

  bbCourt1.forEach((cfg) => {
    const h = createHumanoid({
      role: 'basketball',
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
      role: 'basketball',
      wx, wz,
      baseY: cfg.y,
      isAir: cfg.y > 0.5,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: '注意掩護擋拆！空檔出來了直接出手！'
    });
  });

  // 籃球 1
  const bbBall1 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), basketballMat);
  bbBall1.position.set(pxToWorldX(939), 0.72, pyToWorldZ(225));
  bbBall1.castShadow = true;
  details3DGroup.add(bbBall1);

  // 東區第 2 場 (px: 1055, py: 285, 3 on 3 外線跳投)
  const bbCourt2 = [
    { px: 1045, py: 285, y: 1.30, yaw: 1.2, pose: 'shoot', shirt: peBlueShirtMat, name: '高三學長（三分跳投）' },
    { px: 1050, py: 285, y: 0.35, yaw: -1.9, pose: 'block', shirt: peOrangeShirtMat, name: '防守起跳封阻' },
    { px: 1066, py: 282, y: 0.35, yaw: 0.7, pose: 'dribble', shirt: peBlueShirtMat, name: '籃下搶籃板球員 A' },
    { px: 1066, py: 288, y: 0.35, yaw: -2.3, pose: 'pass', shirt: peOrangeShirtMat, name: '籃下搶籃板球員 B' },
    { px: 1035, py: 278, y: 0.35, yaw: 1.8, pose: 'stretch', shirt: peBlueShirtMat, name: '外線導傳球員' },
    { px: 1038, py: 292, y: 0.35, yaw: -0.6, pose: 'pass', shirt: peOrangeShirtMat, name: '防守緊盯射手' },

    { px: 1025, py: 285, y: 0.35, yaw: 0.9, pose: 'dribble', shirt: peWhiteShirtMat, name: '準備上場同學 A' },
    { px: 1075, py: 285, y: 0.35, yaw: -1.8, pose: 'stretch', shirt: peWhiteShirtMat, name: '準備上場同學 B' }
  ];

  bbCourt2.forEach((cfg) => {
    const h = createHumanoid({
      role: 'basketball',
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
      role: 'basketball',
      wx, wz,
      baseY: cfg.y,
      isAir: cfg.y > 0.5,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: '看這球弧度超完美，空心入網！'
    });
  });

  // 籃球 2（半空中投籃球）
  const bbBall2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), basketballMat);
  bbBall2.position.set(pxToWorldX(1054), 2.85, pyToWorldZ(285));
  bbBall2.castShadow = true;
  details3DGroup.add(bbBall2);

  // 5. 建立校園主要道路漫步師生（24 位：迎賓大道 10 位、中正園 8 位、圖書館活動中心廣場 6 位）
  const walkwayNPCConfigs = [
    // === 校門迎賓大道（從大門自動鐵門到中正樓穿堂主幹道 px: 980..1050, py: 720..880）===
    {
      px: 1035, py: 875, yaw: -0.2, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '中正高中 男同學', dialog: '早安！等等第一節微積分小考，趕快去格致樓教室！'
    },
    {
      px: 1038, py: 872, yaw: -0.25, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '中正高中 女同學', dialog: '今天下午有管樂社的成果發表會，在中美堂舉行喔！'
    },
    {
      px: 1025, py: 835, yaw: -0.15, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '高三理組 同學', dialog: '剛剛在警衛室遇到校犬小黑，牠今天精神真好！'
    },
    {
      px: 1018, py: 805, yaw: 0.1, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '高一新生 同學', dialog: '中正高中的校園真的好大，花圃和林蔭步道真漂亮！'
    },
    {
      px: 1028, py: 765, yaw: -0.3, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '擊劍隊 同學', dialog: '下午要去格致樓地下擊劍練習室訓練，備戰全中運！'
    },
    // 任課老師（手持講義夾或公事包）
    {
      px: 1042, py: 845, yaw: -0.1, gender: 'boy', role: 'teacher_walk',
      shirt: teacherShirtMat, bottom: teacherPantsMat, hasBriefcase: true,
      name: '教務處 英文科老師', dialog: '同學早安！今天第一節在中正樓 214 教室上課喔！'
    },
    {
      px: 1010, py: 785, yaw: -0.2, gender: 'girl', role: 'teacher_walk',
      shirt: teacherPoloMat, bottom: teacherPantsMat, hasBinder: true,
      name: '學務處 數學科老師', dialog: '同學早安，進入校門記得注意路口車輛慢行！'
    },
    {
      px: 1032, py: 730, yaw: -0.05, gender: 'boy', role: 'teacher_walk',
      shirt: teacherShirtMat, bottom: teacherPantsMat, hasBriefcase: true,
      name: '圖書館 主任', dialog: '今天圖書館有新進科技與 AI 專題特展，歡迎大家借閱！'
    },
    {
      px: 995, py: 740, yaw: -0.4, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '美術班 同學', dialog: '正要去至聖樓專科教室畫素描，晨光灑在樹蔭下真美。'
    },
    {
      px: 998, py: 736, yaw: -0.35, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '舞蹈班 同學', dialog: '等等要在學生活動中心練舞，準備校慶公演！'
    },

    // === 中正園環道與中美堂前林蔭步道 (px: 880..1020, py: 620..710) ===
    {
      px: 955, py: 685, yaw: 1.4, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '中正高中 班聯會幹部', dialog: '中正園圓形草坪老榕樹上有好多臺灣藍鵲在築巢！'
    },
    {
      px: 958, py: 688, yaw: -1.7, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '中正高中 社聯會幹部', dialog: '對呀，長尾巴黑白相間超顯眼，嘴喙還是鮮紅色的！'
    },
    {
      px: 920, py: 660, yaw: 0.8, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '高二文組 同學', dialog: '中美堂前這條林蔭步道夏天好涼爽，微風很舒服。'
    },
    {
      px: 890, py: 640, yaw: -0.6, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '管樂社 同學', dialog: '中午放學要借中美堂大廳排練法國號重奏。'
    },
    {
      px: 980, py: 645, yaw: 0.1, gender: 'boy', role: 'teacher_walk',
      shirt: peBlueShirtMat, bottom: peShortsNavyMat, hasBinder: true,
      name: '體育組組長', dialog: '各班體育股長注意，操場與排球場器材借用請遵守登記！'
    },
    {
      px: 1015, py: 670, yaw: -1.2, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '高一 同學', dialog: '剛經過大花圃，看到校犬黑皮在榕樹下乘涼睡覺，超可愛！'
    },
    {
      px: 935, py: 630, yaw: 0.3, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '生物研究社 社長', dialog: '生態池旁的樹上有臺灣藍鵲群飛過，長尾山娘滑翔姿勢超優美！'
    },
    {
      px: 905, py: 675, yaw: -0.9, gender: 'girl', role: 'teacher_walk',
      shirt: teacherPoloMat, bottom: teacherPantsMat, hasBinder: true,
      name: '高二 導師', dialog: '大家走廊上腳步放輕，準備開始早自習囉！'
    },

    // === 圖書館與學生活動中心前廣場 (px: 1110..1180, py: 430..495) ===
    {
      px: 1125, py: 445, yaw: 0.5, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '圖書館 志工同學', dialog: '圖書館二樓自習室環境超安靜，採光也很棒！'
    },
    {
      px: 1130, py: 448, yaw: -2.4, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '科展代表 同學', dialog: '我們專題用 3D 模擬探討校園微氣候，成果很棒！'
    },
    {
      px: 1160, py: 465, yaw: -1.1, gender: 'boy', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformPantsMat, hasBag: true,
      name: '活動中心 音控組長', dialog: '大禮堂的音響和舞台投影設備剛完成全面升級！'
    },
    {
      px: 1175, py: 480, yaw: 1.8, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '熱舞社 同學', dialog: '學生活動中心前廣場的大鏡子練舞超好用！'
    },
    {
      px: 1145, py: 485, yaw: 0.2, gender: 'boy', role: 'teacher_walk',
      shirt: teacherShirtMat, bottom: teacherPantsMat, hasBriefcase: true,
      name: '學務處 訓育組長', dialog: '校園各處活動熱鬧進行，大家注意運動安全！'
    },
    {
      px: 1115, py: 475, yaw: -0.4, gender: 'girl', role: 'student_walk',
      shirt: uniformShirtMat, bottom: uniformSkirtMat, hasBag: true,
      name: '自習室 研讀同學', dialog: '抱著參考書準備去五樓圖書館專心衝刺學測！'
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
'''

if re.search(pattern, content):
    content = re.sub(pattern, new_dogs_and_magpies_and_npcs + r'\n\2', content)
    print("[OK] Replaced buildCampusDogsAndMagpies and added buildCampusSportsAndWalkwayNPCs")
else:
    print("[WARN] pattern for buildCampusDogsAndMagpies not matched")

# 4. 在 animate(now) 中驅動運動與步行動畫，並支援 NPC Toast
target_anim = """  // 校犬尾巴輕搖與頭部微動
  animatedAnimals.dogs.forEach((d) => {
    d.tailGroup.rotation.z = Math.sin(now * 0.007 + d.seed) * 0.35;
    d.headGroup.rotation.y = Math.sin(now * 0.002 + d.seed) * 0.16;
  });
  // 樹梢隨機臺灣藍鵲之擺尾與轉頭動作
  animatedAnimals.magpies.forEach((b) => {
    b.tailGroup.rotation.x = 0.38 + Math.sin(now * 0.0035 + b.seed) * 0.14;
    b.headGroup.rotation.y = Math.sin(now * 0.0018 + b.seed) * 0.32;
  });"""

replacement_anim = """  // 校犬尾巴輕搖與頭部微動
  animatedAnimals.dogs.forEach((d) => {
    d.tailGroup.rotation.z = Math.sin(now * 0.007 + d.seed) * 0.35;
    d.headGroup.rotation.y = Math.sin(now * 0.002 + d.seed) * 0.16;
  });
  // 樹梢顯著臺灣藍鵲之擺尾與靈動轉頭微動
  animatedAnimals.magpies.forEach((b) => {
    b.tailGroup.rotation.x = 0.38 + Math.sin(now * 0.0035 + b.seed) * 0.18;
    b.headGroup.rotation.y = Math.sin(now * 0.0016 + b.seed) * 0.38;
  });

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
  });"""

if target_anim in content:
    content = content.replace(target_anim, replacement_anim, 1)
    print("[OK] Replaced animation loop in animate()")
else:
    print("[WARN] target_anim not found")

# 5. 更新 checkBuildingCollision 碰到 NPC 時的對話提示
target_collision_toast = """            if (hit.type === 'dog') {
              const dogObj = animatedAnimals.dogs.find(d => `校犬「${d.name}」` === hit.name);
              const intro = dogObj ? `：${dogObj.intro}` : '：汪！';
              showToast(`🐾 ${hit.name}${intro}`);
            } else {
              showToast(`碰撞阻擋：${hit.name}`);
            }"""

replacement_collision_toast = """            if (hit.type === 'dog') {
              const dogObj = animatedAnimals.dogs.find(d => `校犬「${d.name}」` === hit.name);
              const intro = dogObj ? `：${dogObj.intro}` : '：汪！';
              showToast(`🐾 ${hit.name}${intro}`);
            } else if (hit.type === 'npc') {
              showToast(`👋 ${hit.name}：「${hit.dialog || '同學好！'}」`);
            } else {
              showToast(`碰撞阻擋：${hit.name}`);
            }"""

if target_collision_toast in content:
    content = content.replace(target_collision_toast, replacement_collision_toast, 1)
    print("[OK] Updated collision toast for NPCs")
else:
    print("[WARN] target_collision_toast not found")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("[DONE] Successfully wrote updated js/app.js")

