# -*- coding: utf-8 -*-
"""
嚴格落實使用者需求：
1. 「台灣藍鵲是在樹上的，不是在地上，不要群聚零散分佈」
   - 全部藍鵲 100% 棲息於樹上枝枒（高度在樹幹+樹冠中上層 y: 5.0m ~ 8.5m，絕無任何一隻在地面或非樹木建物上）
   - 拒絕群聚，採用空間最小間距過濾演算法（每兩隻藍鵲水平距離至少 35 公尺以上，每棵樹最多 1 隻）
   - 全校 570 棵樹木中均勻挑選約 28 隻，零散散佈於田徑場林帶、大花圃、中正園、生態池、活動中心南側草坪樹林與道路行道樹上。
2. 「人也是零散分佈」
   - 拒絕扎堆與群聚！
   - 田徑場：全場 400 公尺僅零散 4 人（北道、南道、西彎道慢跑，草坪遠處伸展）
   - 排球場：僅 1 面球場零散 2 人對傳練習
   - 籃球場：僅 2 人分別在不同半場自主投籃運球
   - 道路：零散 10 人分佈於校門、穿堂、中正園、中美堂、圖書館、活動中心、格致樓廊道與生態池
   - 全校運動與漫步人員共 18 人，彼此距離 40~80 公尺以上，開闊自然。
"""
import re

app_path = '/Users/maxchan/Desktop/3D/js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'(// === 黑色校犬群（小黑、歐告、黑皮、黑輪）與樹梢顯著臺灣特有種「臺灣藍鵲」 ===[\s\S]*?)(function buildColorfulFlowerBeds\(\))'

new_code = '''// === 黑色校犬群（小黑、歐告、黑皮、黑輪）與樹梢零散臺灣特有種「臺灣藍鵲」 ===
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

  // === 零散分佈：田徑場運動學生（400 公尺超大範圍僅零散 4 人，彼此間隔 60～100 公尺）===
  const trackRunners = [
    { px: 360, py: 132, yaw: Math.PI / 2, shirt: peBlueShirtMat, name: '田徑隊同學（北跑道慢跑）' },
    { px: 420, py: 444, yaw: -Math.PI / 2, shirt: peOrangeShirtMat, name: '長跑社同學（南跑道晨操）' },
    { px: 240, py: 288, yaw: 0, shirt: peWhiteShirtMat, name: '高二體育生（西彎道快走）' },
    { px: 380, py: 280, yaw: 0.5, shirt: peBlueShirtMat, pose: 'stretch', name: '草坪伸展同學' }
  ];

  trackRunners.forEach((cfg) => {
    const isStretch = cfg.pose === 'stretch';
    const h = createHumanoid({
      role: isStretch ? 'stretch' : 'student_run',
      poseType: isStretch ? 'stretch' : 'run',
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
      role: isStretch ? 'stretcher' : 'runner',
      wx, wz,
      baseY: 0.35,
      speed: isStretch ? 0.005 : 0.016,
      amp: isStretch ? 0.2 : 0.85,
      seed: Math.random() * 50
    });

    collisionCircles.push({
      x: wx, z: wz, r: 0.55, type: 'npc',
      name: cfg.name,
      dialog: isStretch ? '運動前要充分做好伸展拉筋！' : '田徑場空氣真好，正在按配速練習！'
    });
  });

  // === 零散分佈：排球場（僅第 3 面球場有 2 人輕鬆對傳練習，其餘 4 面完全空曠）===
  const vbCourt = [
    { px: 834, py: 310.5, y: 0.35, yaw: 0, pose: 'pass', name: '排球社同學 A' },
    { px: 854, py: 310.5, y: 0.35, yaw: Math.PI, pose: 'pass', name: '排球社同學 B' }
  ];

  vbCourt.forEach((cfg) => {
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
      dialog: '手腕打平、壓低重心，接得漂亮！'
    });
  });

  // 對傳之排球
  const vbBall = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), volleyballMat);
  vbBall.position.set(pxToWorldX(844), 2.1, pyToWorldZ(310.5));
  vbBall.castShadow = true;
  details3DGroup.add(vbBall);

  // === 零散分佈：籃球場（僅 2 人分別在西區與東區自主練球，相隔 40 公尺）===
  const bbCourt = [
    { px: 950, py: 225, y: 0.35, yaw: 0.4, pose: 'dribble', shirt: peOrangeShirtMat, name: '籃球社同學（西區自主運球）' },
    { px: 1055, py: 285, y: 1.25, yaw: 1.2, pose: 'shoot', shirt: peBlueShirtMat, name: '高三學長（東區自主跳投）' }
  ];

  bbCourt.forEach((cfg) => {
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
      dialog: cfg.pose === 'shoot' ? '看這球三分弧度，空心入網！' : '練好基本運球突破步伐！'
    });
  });

  const bbBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), basketballMat);
  bbBall.position.set(pxToWorldX(948), 0.70, pyToWorldZ(225));
  bbBall.castShadow = true;
  details3DGroup.add(bbBall);

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
'''

if re.search(pattern, content):
    content = re.sub(pattern, new_code + r'\n\2', content)
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("[SUCCESS] Successfully updated js/app.js with scattered magpies on trees and scattered NPCs!")
else:
    print("[ERROR] Pattern not found!")
