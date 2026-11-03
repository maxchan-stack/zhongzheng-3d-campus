# -*- coding: utf-8 -*-
import os
import re

app_path = 'js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    app = f.read()

# 1. 檢查並更新 studentAvatarGroup 的高度支援
old_avatar_pos = "studentAvatarGroup.position.set(state.fpv.pos.x, 0, state.fpv.pos.z);"
new_avatar_pos = """const groundY = Math.max(0, state.fpv.pos.y - 1.72);
  studentAvatarGroup.position.set(state.fpv.pos.x, groundY, state.fpv.pos.z);"""

if old_avatar_pos in app:
    app = app.replace(old_avatar_pos, new_avatar_pos, 1)
    print("Updated studentAvatarGroup position to support elevation groundY.")

# 2. 檢查並更新 syncFpvCamera 的高度支援
old_sync_cam = """function syncFpvCamera() {
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
}"""

new_sync_cam = """function syncFpvCamera() {
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
}"""

if old_sync_cam in app:
    app = app.replace(old_sync_cam, new_sync_cam, 1)
    print("Updated syncFpvCamera to support 3D ground elevation.")

# 3. 更新 checkBuildingCollision：5F 高度時跳過 1F 建築物阻擋，並限制在 214 教室與空橋邊界內
old_collision = """function checkBuildingCollision(nx, nz) {
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
  }"""

new_collision = """function checkBuildingCollision(nx, nz) {
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
  }"""

if old_collision in app:
    app = app.replace(old_collision, new_collision, 1)
    print("Updated checkBuildingCollision to support 5F 214 room navigation.")

# 4. 新增樓梯攀爬系統核心代碼 (STAIRCASE CLIMB SYSTEM)
stair_system_code = """
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
"""

if 'STAIR_WAYPOINTS' not in app:
    app = app.replace('function buildExteriorStaircaseTo214() {', stair_system_code + '\nfunction buildExteriorStaircaseTo214() {', 1)
    print("Injected Player Stair Climbing System.")

# 5. 更新 animate() 中的移動更新邏輯
old_animate_block = """    } else {
      const fwd = (state.fpv.moveForward ? 1 : 0) - (state.fpv.moveBackward ? 1 : 0) + state.fpv.joyY;
      const strafe = (state.fpv.moveRight ? 1 : 0) - (state.fpv.moveLeft ? 1 : 0) + state.fpv.joyX * 0.5;"""

new_animate_block = """    } else if (state.fpv.isClimbingStairs) {
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
      const strafe = (state.fpv.moveRight ? 1 : 0) - (state.fpv.moveLeft ? 1 : 0) + state.fpv.joyX * 0.5;"""

if old_animate_block in app:
    app = app.replace(old_animate_block, new_animate_block, 1)
    print("Updated animate() to process player stair climbing motion.")

# 6. 新增按鍵與 UI 事件監聽
old_setup_events = "document.getElementById('walk-pace-btn')?.addEventListener('click', (e) => {"
new_setup_events = """document.getElementById('climb-stair-btn')?.addEventListener('click', () => {
    if (state.fpv.isClimbingStairs) {
      state.fpv.isClimbingStairs = false;
      updateClimbButtonState();
      showToast('已暫停爬梯（可使用 WASD 手動行走，或再次點擊按鈕繼續）');
    } else {
      startClimbingStairs();
    }
  });

  document.getElementById('walk-pace-btn')?.addEventListener('click', (e) => {"""

if old_setup_events in app:
    app = app.replace(old_setup_events, new_setup_events, 1)
    print("Added click listener for climb-stair-btn.")

# 7. 在鍵盤事件中加入 KeyE 快速觸發樓梯攀爬
old_keydown = "if (code === 'KeyH' && state.viewMode === 'fpv') {"
new_keydown = """if (code === 'KeyE' && state.viewMode === 'fpv') {
      startClimbingStairs();
      return;
    }
    if (code === 'KeyH' && state.viewMode === 'fpv') {"""

if old_keydown in app:
    app = app.replace(old_keydown, new_keydown, 1)
    print("Added KeyE hotkey for climbing stairs.")

# 8. 在 3D 場景中點擊戶外樓梯直接進入爬梯模式
old_raycast_b = "const bHits = raycaster.intersectObjects(buildingMeshes, false);"
new_raycast_b = """const sHits = raycaster.intersectObjects(exteriorStairsGroup.children, true);
    if (sHits.length > 0) {
      showToast('點擊戶外折返樓梯：開始爬梯探索！');
      startClimbingStairs();
      return;
    }

    const bHits = raycaster.intersectObjects(buildingMeshes, false);"""

if old_raycast_b in app:
    app = app.replace(old_raycast_b, new_raycast_b, 1)
    print("Added 3D click interaction on staircase.")

# 9. 加入 test hash: #test=climb_walk 和 #test=in_214_walk
old_testhash = "} else if (h === '#test=walk') {"
new_testhash = """} else if (h === '#test=walk_stair' || h === '#test=climb') {
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
  } else if (h === '#test=walk') {"""

if old_testhash in app:
    app = app.replace(old_testhash, new_testhash, 1)
    print("Added test hashes for climbing and 214 room walking.")

# 10. 在 setupWalkSpawnButtons 加入 214 教室室內 (5F)
old_spawns = "{ label: '戶外景觀樓梯 (直通 214 教室)', px: 946, py: 520, yaw: Math.PI }"
new_spawns = """{ label: '戶外景觀樓梯 (1F 入口)', px: 946, py: 520, yaw: Math.PI },
    { label: '214 教室室內 (5F 露台)', customPos: new THREE.Vector3(58.2, 14.4 + 1.72, 5.0), yaw: 0 }"""

if old_spawns in app:
    app = app.replace(old_spawns, new_spawns, 1)
    print("Updated spawn buttons in setupWalkSpawnButtons.")

old_spawn_click = "state.fpv.pos.set(pxToWorldX(sp.px), 1.72, pyToWorldZ(sp.py));"
new_spawn_click = """if (sp.customPos) {
        state.fpv.pos.copy(sp.customPos);
      } else {
        state.fpv.pos.set(pxToWorldX(sp.px), 1.72, pyToWorldZ(sp.py));
      }
      updateClimbButtonState();"""

if old_spawn_click in app:
    app = app.replace(old_spawn_click, new_spawn_click, 1)
    print("Updated spawn button click handler.")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)

print("Updated js/app.js successfully!")
