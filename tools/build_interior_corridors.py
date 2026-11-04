# -*- coding: utf-8 -*-
import re

app_path = 'js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    app = f.read()

# 1. 建立校園可漫步室內走廊與穿堂管理架構 (WALKABLE_INTERIOR_CORRIDORS)
corridors_code = """
// ==========================================
// 校園建物內部可漫步走廊與穿堂系統 (Walkable Interior Corridors & Breezeways)
// 支援角色在地面漫步模式下走入大樓內部走廊、架空穿堂、連通空橋與教室前長廊
// ==========================================

const WALKABLE_CORRIDORS = [
  // 1. 中正樓 1F 挑空迎賓大穿堂 (東西向貫穿，連接迎賓廣場與中庭椰子樹花園)
  {
    id: 'zz_1f_breezeway',
    name: '中正樓 1F 挑空大穿堂',
    floor: '1F',
    floorY: 0.0,
    minX: 51.2,
    maxX: 67.8,
    minZ: 25.4,
    maxZ: 31.8,
    ceilingY: 3.55
  },
  // 2. 中正樓與美齡樓「中美西 1F 廊道」 (連接中正樓穿堂與美齡樓中庭)
  {
    id: 'zm_west_1f_corridor',
    name: '中美西 1F 連通廊道',
    floor: '1F',
    floorY: 0.0,
    minX: 34.5,
    maxX: 53.0,
    minZ: 14.0,
    maxZ: 16.8,
    ceilingY: 3.55
  },
  // 3. 中正樓 5F 教室前長廊與景觀空橋 (連接戶外折返樓梯、214 教室至 219 班)
  {
    id: 'zz_5f_classroom_corridor',
    name: '中正樓 5F 教室前長廊與 214 露台',
    floor: '5F',
    floorY: 14.4,
    minX: 55.0,
    maxX: 67.2,
    minZ: -3.5,
    maxZ: 32.0,
    ceilingY: 17.95
  },
  // 4. 中美 5F 空中連通走廊 (高空跨越大王椰子樹天井花園，直通美齡樓)
  {
    id: 'zm_west_5f_skybridge',
    name: '中美西 5F 空中連通走廊',
    floor: '5F',
    floorY: 14.4,
    minX: 34.5,
    maxX: 56.5,
    minZ: 14.0,
    maxZ: 16.8,
    ceilingY: 17.95
  }
];

// 建立 3D 走廊內部實體結構 (地磚、天花板、照明筒燈、穿堂立柱與布告欄)
const interiorCorridorsGroup = new THREE.Group();
interiorCorridorsGroup.name = 'INTERIOR_CORRIDORS';
scene.add(interiorCorridorsGroup);

function buildInteriorCorridorDetails() {
  const g = interiorCorridorsGroup;

  // A. 【中正樓 1F 挑空迎賓大穿堂】
  // 尺寸：長 16.4m (貫穿東西), 寬 6.0m (南北), 淨高 3.55m
  const cFloorMat = new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.55 }); // 磨石子防滑地磚
  const cCeilMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.75 });  // 象牙白平頂天花板
  const cWallMat = new THREE.MeshStandardMaterial({ color: 0xefede6, roughness: 0.8 });
  const cPillarMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.65 }); // 深灰承重方柱
  const cBoardMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });  // 深藍公佈欄

  // 1. 穿堂平整室內地板 (厚度 0.08m，Y = 0.04)
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.08, 6.0), cFloorMat);
  floorMesh.position.set(59.5, 0.04, 28.6);
  floorMesh.receiveShadow = true;
  g.add(floorMesh);

  // 2. 穿堂天花板頂棚 (Y = 3.55)
  const ceilMesh = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.12, 6.0), cCeilMat);
  ceilMesh.position.set(59.5, 3.55, 28.6);
  ceilMesh.castShadow = true;
  g.add(ceilMesh);

  // 3. 南北兩側分隔實體牆面 (留出兩側進入班級與辦公室之鋁門通道)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(16.4, 3.45, 0.25), cWallMat);
  northWall.position.set(59.5, 1.77, 25.5);
  g.add(northWall);

  const southWall = new THREE.Mesh(new THREE.BoxGeometry(16.4, 3.45, 0.25), cWallMat);
  southWall.position.set(59.5, 1.77, 31.7);
  g.add(southWall);

  // 4. 穿堂內部雙排建築承重方柱 (每排 4 根，共 8 根)
  for (let x = 53.5; x <= 65.5; x += 4.0) {
    [26.8, 30.4].forEach((z) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.45, 0.55), cPillarMat);
      pillar.position.set(x, 1.77, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      g.add(pillar);
    });
  }

  // 5. 穿堂兩側榮譽榜公佈欄與校園導覽看板
  const boardNorth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.5, 0.08), cBoardMat);
  boardNorth.position.set(59.5, 1.85, 25.65);
  g.add(boardNorth);

  const boardSouth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x991b1b })); // 紅底榮譽榜
  boardSouth.position.set(59.5, 1.85, 31.55);
  g.add(boardSouth);

  // 6. 穿堂內部溫暖吸頂照明 (3 盞柔和點光源)
  [54.5, 59.5, 64.5].forEach((lx) => {
    const lampFixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xffedd5, emissiveIntensity: 0.65 })
    );
    lampFixture.position.set(lx, 3.48, 28.6);
    g.add(lampFixture);

    const lampLight = new THREE.PointLight(0xfff3d6, 0.9, 10.0);
    lampLight.position.set(lx, 3.30, 28.6);
    g.add(lampLight);
  });

  // B. 【中美西 5F 空中連通走廊】 (跨越大王椰子樹天井花園)
  const skyFloor = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.22, 2.5), cFloorMat);
  skyFloor.position.set(45.5, 14.40, 15.4);
  skyFloor.castShadow = true;
  skyFloor.receiveShadow = true;
  g.add(skyFloor);

  const skyCeil = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.16, 2.5), cCeilMat);
  skyCeil.position.set(45.5, 17.85, 15.4);
  g.add(skyCeil);

  // 兩側通透安全鋁合金護欄
  const skyRailMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
  [14.2, 16.6].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(18.5, 1.05, 0.08), skyRailMat);
    rail.position.set(45.5, 14.95, rz);
    g.add(rail);
  });
}
"""

if 'WALKABLE_CORRIDORS' not in app:
    app = app.replace('function buildAllBuildings() {', corridors_code + '\nfunction buildAllBuildings() {', 1)
    print("Injected WALKABLE_CORRIDORS architecture and interior models.")

# 2. 在 buildCampus3DDetails 中呼叫 buildInteriorCorridorDetails
old_details_call = "buildExteriorStaircaseTo214();"
new_details_call = """buildExteriorStaircaseTo214();
  buildInteriorCorridorDetails();"""

if old_details_call in app and "buildInteriorCorridorDetails();" not in app:
    app = app.replace(old_details_call, new_details_call, 1)
    print("Added buildInteriorCorridorDetails() call into buildCampus3DDetails().")

# 3. 升級 checkBuildingCollision：智慧識別室內走廊，豁免建築外圍阻擋並約束在走廊通道內
old_collision_func = """function checkBuildingCollision(nx, nz) {
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
  }"""

new_collision_func = """function checkBuildingCollision(nx, nz) {
  const charR = 0.32; // 人物身軀半徑緩衝
  const pY = state.fpv ? state.fpv.pos.y : 1.72;

  // 1. 校園室內走廊與穿堂通道檢查 (優先權最高：允許人物在走廊內部自由行走)
  for (const c of WALKABLE_CORRIDORS) {
    const isFloorMatch = Math.abs((pY - 1.72) - c.floorY) < 1.8;
    if (isFloorMatch) {
      // 判定是否位於此走廊的長度與寬度區間內
      if (nx >= c.minX && nx <= c.maxX && nz >= c.minZ && nz <= c.maxZ) {
        // 人物位於合法走廊內部通道，自動豁免大樓外框碰撞！
        // 同時提供走廊側向牆體邊界保護 (防止穿透南北側牆體)
        if (c.id === 'zz_1f_breezeway') {
          if (nz < c.minZ + charR || nz > c.maxZ - charR) {
            return { name: '穿堂側牆', type: 'wall' };
          }
        } else if (c.id === 'zm_west_5f_skybridge') {
          if (nz < c.minZ + charR || nz > c.maxZ - charR) {
            return { name: '空中連廊安全護欄', type: 'railing' };
          }
        }
        return null; // 完全暢行無阻！
      }
    }
  }

  // 特殊處理：若人物在 5F 高度 (Y >= 13.5)，位於 214 教室室內或 5F 戶外連通空橋
  if (state.fpv && state.fpv.pos.y >= 13.5) {
    const onBridge = (nx >= 60.5 && nx <= 67.2 && nz >= -4.2 && nz <= 5.5);
    const in214Room = (nx >= 55.0 && nx <= 62.0 && nz >= 3.5 && nz <= 9.2);
    if (onBridge || in214Room) {
      return null;
    }
    return { name: '5F 露台安全護欄', type: 'railing' };
  }"""

if old_collision_func in app:
    app = app.replace(old_collision_func, new_collision_func, 1)
    print("Upgraded checkBuildingCollision with WALKABLE_CORRIDORS support.")

# 4. 更新 setupWalkSpawnButtons，增加穿堂與空中連廊的快速傳送點
old_spawns = """{ label: '戶外景觀樓梯 (1F 入口)', px: 946, py: 520, yaw: Math.PI },
    { label: '214 教室室內 (5F 露台)', customPos: new THREE.Vector3(58.2, 14.4 + 1.72, 5.0), yaw: 0 }"""

new_spawns = """{ label: '戶外景觀樓梯 (1F 入口)', px: 946, py: 520, yaw: Math.PI },
    { label: '214 教室室內 (5F 露台)', customPos: new THREE.Vector3(58.2, 14.4 + 1.72, 5.0), yaw: 0 },
    { label: '中正樓 1F 挑空大穿堂', customPos: new THREE.Vector3(59.5, 1.72, 28.6), yaw: -Math.PI / 2 },
    { label: '中美西 5F 空中連廊', customPos: new THREE.Vector3(45.5, 14.4 + 1.72, 15.4), yaw: Math.PI / 2 }"""

if old_spawns in app:
    app = app.replace(old_spawns, new_spawns, 1)
    print("Added corridor spawn options in setupWalkSpawnButtons.")

# 5. 新增 test hash: #test=corridor_1f 和 #test=corridor_5f
old_hash_ground = "} else if (h === '#test=ground_limit') {"
new_hash_ground = """} else if (h === '#test=corridor_1f') {
    // 進入中正樓 1F 挑空大穿堂走廊漫步視角
    setViewMode('fpv');
    state.walkPersp = '3rd';
    state.fpv.pos.set(65.0, 1.72, 28.6); // 位於穿堂東側入口，朝西穿堂內部看
    state.fpv.yaw = -Math.PI / 2;
    syncFpvCamera();
    updateClimbButtonState();
  } else if (h === '#test=corridor_5f') {
    // 進入中美 5F 空中連通走廊高空漫步視角
    setViewMode('fpv');
    state.walkPersp = '3rd';
    state.fpv.pos.set(45.5, 14.4 + 1.72, 15.4);
    state.fpv.yaw = Math.PI / 2;
    syncFpvCamera();
    updateClimbButtonState();
  } else if (h === '#test=ground_limit') {"""

if old_hash_ground in app:
    app = app.replace(old_hash_ground, new_hash_ground, 1)
    print("Added #test=corridor_1f and #test=corridor_5f hashes.")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)

print("Updated js/app.js with interior corridor walking capabilities!")
