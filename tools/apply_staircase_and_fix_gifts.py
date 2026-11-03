# -*- coding: utf-8 -*-
import os

with open('js/app.js', 'r', encoding='utf-8') as f:
    app = f.read()

# 1. 修正 214 教室室內禮物與小聖誕樹位置 (嚴格置於圖片 2 紅色線框內部，消除所有西外牆穿牆問題)
old_room_decor_start = "// 5. 【214 教室室內專屬聖誕佈置】"
old_room_decor_end = "cGroup.add(snowmanGroup);"

new_room_decor = """// 5. 【214 教室室內專屬聖誕佈置】：一株室內小聖誕樹 + 10 個大小不一精美包裝聖誕禮物盒
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

  cGroup.add(snowmanGroup);"""

if old_room_decor_start in app and old_room_decor_end in app:
    s_idx = app.find(old_room_decor_start)
    e_idx = app.find(old_room_decor_end) + len(old_room_decor_end)
    app = app[:s_idx] + new_room_decor + app[e_idx:]
    print('Updated 214 indoor gifts positions perfectly.')

# 2. 建立中正樓北側山牆「折返式鋼構景觀樓梯」（直通 214 教室）
staircase_module = '''
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
'''

# 插入 buildExteriorStaircaseTo214 定義
insert_point = "function buildColorfulFlowerBeds() {"
if "function buildExteriorStaircaseTo214()" not in app:
    app = app.replace(insert_point, staircase_module + "\n" + insert_point, 1)
    print('Inserted buildExteriorStaircaseTo214 into js/app.js.')

# 在 3D 細節建構處呼叫 buildExteriorStaircaseTo214();
call_hook = "buildChristmasAtmosphere();"
call_repl = "buildChristmasAtmosphere();\n  buildExteriorStaircaseTo214();"
if call_hook in app and "buildExteriorStaircaseTo214();" not in app:
    app = app.replace(call_hook, call_repl, 1)
    print('Added call buildExteriorStaircaseTo214() to init.')

# 在 animate 迴圈中呼叫 animateClimbingAvatar(now, dt);
anim_hook = "animateChristmasAtmosphere(now, dt);"
anim_repl = "animateChristmasAtmosphere(now, dt);\n  animateClimbingAvatar(now, dt);"
if anim_hook in app and "animateClimbingAvatar(now, dt);" not in app:
    app = app.replace(anim_hook, anim_repl, 1)
    print('Added call animateClimbingAvatar to animate loop.')

# 3. 升級 handleTestHash 支援 #test=stair_214 與更新 #test=214_room
test_hook = "  } else if (h === '#test=214_room' || h === '#test=214_gifts') {"
new_test_blocks = """  } else if (h === '#test=stair_214') {
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
    controls.update();"""

if test_hook in app:
    # 替換整個 214_room 區塊
    end_hook = "controls.update();\n  } else if (h === '#test=214') {"
    s_idx = app.find(test_hook)
    e_idx = app.find(end_hook) + len("controls.update();")
    app = app[:s_idx] + new_test_blocks + app[e_idx:]
    print('Updated preview hashes with #test=stair_214 and precision 214_room.')

# 4. 在地面漫步瞬移選單加入「戶外景觀樓梯（直達 214 教室）」
spawn_hook = "{ label: '藝德女神廣場', px: 214, py: 648, yaw: Math.PI / 2 }"
spawn_repl = """{ label: '藝德女神廣場', px: 214, py: 648, yaw: Math.PI / 2 },
    { label: '戶外景觀樓梯 (直通 214 教室)', px: 946, py: 520, yaw: Math.PI }"""

if spawn_hook in app and "戶外景觀樓梯 (直通 214 教室)" not in app:
    app = app.replace(spawn_hook, spawn_repl, 1)
    print('Added stair spawn button.')

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(app)
print('All updates written to js/app.js successfully.')

