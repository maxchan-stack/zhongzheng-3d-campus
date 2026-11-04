# -*- coding: utf-8 -*-
import re

app_path = 'js/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    app = f.read()

# 1. 調整相機 near 裁切面為 0.25，防止貼近地面時近端裁切穿透 1F 地板
old_cam_def = "const camera = new THREE.PerspectiveCamera(initCamCfg.fov, window.innerWidth / window.innerHeight, 0.5, 2200);"
new_cam_def = "const camera = new THREE.PerspectiveCamera(initCamCfg.fov, window.innerWidth / window.innerHeight, 0.25, 2200);"

if old_cam_def in app:
    app = app.replace(old_cam_def, new_cam_def, 1)
    print("Updated camera.near to 0.25 to prevent near-plane clipping through 1F floor.")

# 2. 嚴格約束 OrbitControls 的 maxPolarAngle 與 change 監聽事件，強制禁止高度低於 1F 地板
old_controls_def = """const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.minDistance = 8;
controls.maxDistance = 450;
controls.target.copy(initCamCfg.target);
controls.addEventListener('change', () => { state.needsRender = true; });"""

new_controls_def = """const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
// 嚴格限制最大極角為 85.5 度 (Math.PI / 2 - 0.08)，保證視線相對於目標永遠維持俯角，絕對禁止由 1F 地板以下往上仰視
controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.minDistance = 6;
controls.maxDistance = 450;
controls.target.copy(initCamCfg.target);

// 限制最低攝影機高度常數 (絕對禁止穿越 1F 地表 Y = 0)
const MIN_CAMERA_WORLD_Y = 1.0;  // 攝影機絕對高度最低 1.0 公尺
const MIN_TARGET_WORLD_Y = 0.2;  // 目標注視點最低 0.2 公尺

controls.addEventListener('change', () => {
  // 即時鉗位：任何滑鼠拖曳、雙指手勢、視角平移操作，一律強制限制在 1F 地板以上
  if (camera.position.y < MIN_CAMERA_WORLD_Y) {
    camera.position.y = MIN_CAMERA_WORLD_Y;
  }
  if (controls.target.y < MIN_TARGET_WORLD_Y) {
    controls.target.y = MIN_TARGET_WORLD_Y;
  }
  state.needsRender = true;
});"""

if old_controls_def in app:
    app = app.replace(old_controls_def, new_controls_def, 1)
    print("Updated controls constraints and change listener for strict 1F ground protection.")

# 3. 建立 1F 地面實體深層地基盒 (Subterranean Foundation Slab)，消除任何地底漏光與邊緣穿透
old_subground = """const subGround = new THREE.Mesh(subGroundGeo, subGroundMat);
subGround.position.y = -0.18;
subGround.receiveShadow = true;
scene.add(subGround);"""

new_subground = """const subGround = new THREE.Mesh(subGroundGeo, subGroundMat);
subGround.position.y = -0.18;
subGround.receiveShadow = true;
scene.add(subGround);

// 1F 地板實體厚度地基（深色密實盒體，自 Y = -0.05 延伸至 Y = -30.0，杜絕任何視角自地底穿越）
const solidFoundationGeo = new THREE.BoxGeometry(WORLD_W + 100, 30.0, WORLD_D + 100);
const solidFoundationMat = new THREE.MeshStandardMaterial({ color: 0x1f2327, roughness: 0.98, metalness: 0.1 });
const solidFoundation = new THREE.Mesh(solidFoundationGeo, solidFoundationMat);
solidFoundation.position.y = -15.05;
scene.add(solidFoundation);"""

if old_subground in app:
    app = app.replace(old_subground, new_subground, 1)
    print("Added solid subterranean foundation slab.")

# 4. 強化 animateCameraTo，保證所有相機動畫補間終點與過程絕對高於 1F 地板
old_anim_cam = """function animateCameraTo(targetCamPos, targetLookAt) {
  state.cameraTween = {
    startCam: camera.position.clone(),
    endCam: targetCamPos.clone(),
    startTarget: controls.target.clone(),
    endTarget: targetLookAt.clone(),
    startTime: performance.now(),
    duration: 850
  };
  state.needsRender = true;
}"""

new_anim_cam = """function animateCameraTo(targetCamPos, targetLookAt) {
  const safeCamPos = targetCamPos.clone();
  const safeLookAt = targetLookAt.clone();
  if (safeCamPos.y < 1.2) safeCamPos.y = 1.2;
  if (safeLookAt.y < 0.5) safeLookAt.y = 0.5;

  state.cameraTween = {
    startCam: camera.position.clone(),
    endCam: safeCamPos,
    startTarget: controls.target.clone(),
    endTarget: safeLookAt,
    startTime: performance.now(),
    duration: 850
  };
  state.needsRender = true;
}"""

if old_anim_cam in app:
    app = app.replace(old_anim_cam, new_anim_cam, 1)
    print("Hardened animateCameraTo with ground clamping.")

# 5. 更新 animate() 中的每幀相機邊界保護
old_render_block = """  if (state.cameraTween) {
    const tw = state.cameraTween;
    const t = Math.min(1, (now - tw.startTime) / tw.duration);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tw.startCam, tw.endCam, ease);
    controls.target.lerpVectors(tw.startTarget, tw.endTarget, ease);
    if (t >= 1) state.cameraTween = null;
    state.needsRender = true;
  }"""

new_render_block = """  if (state.cameraTween) {
    const tw = state.cameraTween;
    const t = Math.min(1, (now - tw.startTime) / tw.duration);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tw.startCam, tw.endCam, ease);
    controls.target.lerpVectors(tw.startTarget, tw.endTarget, ease);
    if (camera.position.y < MIN_CAMERA_WORLD_Y) camera.position.y = MIN_CAMERA_WORLD_Y;
    if (controls.target.y < MIN_TARGET_WORLD_Y) controls.target.y = MIN_TARGET_WORLD_Y;
    if (t >= 1) state.cameraTween = null;
    state.needsRender = true;
  }"""

if old_render_block in app:
    app = app.replace(old_render_block, new_render_block, 1)
    print("Added tween frame clamping.")

old_birdseye_update = """  } else if (state.viewMode === 'birdseye') {
    controls.update();
  } else {"""

new_birdseye_update = """  } else if (state.viewMode === 'birdseye') {
    controls.update();
    // 每幀強制保護：絕對防止 OrbitControls 慣性或平移使攝影機進入 1F 地板以下
    if (camera.position.y < MIN_CAMERA_WORLD_Y) {
      camera.position.y = MIN_CAMERA_WORLD_Y;
    }
    if (controls.target.y < MIN_TARGET_WORLD_Y) {
      controls.target.y = MIN_TARGET_WORLD_Y;
    }
  } else {"""

if old_birdseye_update in app:
    app = app.replace(old_birdseye_update, new_birdseye_update, 1)
    print("Added per-frame OrbitControls clamp in birdseye mode.")

# 6. 加入測試用 hash #test=ground_limit，測試相機在極限貼地時是否能成功被限制在 1F 地面之上
test_hash_anchor = "} else if (h === '#test=walk_stair' || h === '#test=climb') {"
test_hash_ground = """} else if (h === '#test=ground_limit') {
    // 測試極限貼地仰視保護：嘗試將相機設為負值，驗證強制防護機制
    camera.position.set(pxToWorldX(1000), -5.0, pyToWorldZ(800));
    controls.target.set(pxToWorldX(1000), -2.0, pyToWorldZ(700));
    controls.update();
    state.needsRender = true;
  } else if (h === '#test=walk_stair' || h === '#test=climb') {"""

if test_hash_anchor in app:
    app = app.replace(test_hash_anchor, test_hash_ground, 1)
    print("Added #test=ground_limit test hash.")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)

print("Updated js/app.js with strict ground boundary protection successfully!")
