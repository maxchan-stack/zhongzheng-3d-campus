// 將 css/js/data 組裝成可雙擊開啟的 index.html（外部 <script src> 載入 + 內嵌備援）。
// 使用方式：node tools/build_index.js（tools/build_assets.py 執行完畢後會自動呼叫）
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const mapTex = read('data/map_texture.js');
const bldgs = read('data/buildings.js');
const rooms = read('data/classrooms.js');
const roads = read('data/road_network.js');
const tours = read('data/tours.js');
const trees = read('data/trees-data.js');
const css = read('css/style.css');
const appJs = read('js/app.js');

const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>臺北市立中正高級中學 3D 校園導覽系統 (115 學年度)</title>
  <link rel="stylesheet" href="./css/style.css" />
  <style>${css}</style>
  <!-- Three.js Import Map 從 CDN 載入 -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <!-- 啟動載入畫面：3D 場景渲染第一幀後自動淡出 -->
  <div id="loading-screen" role="status" aria-live="polite">
    <div class="loading-badge">中正</div>
    <div style="font-size:18px;font-weight:700;">臺北市立中正高級中學 3D 校園導覽</div>
    <div class="loading-spinner"></div>
    <div id="loading-msg" style="font-size:12.5px;opacity:0.85;">正在建構 3D 校園地形、運動場與樹冠模型...</div>
  </div>

  <!-- 3D 畫布與浮動標籤層 -->
  <div id="canvas-container"></div>
  <div id="labels-container"></div>

  <!-- 頂部品牌、搜尋與全域控制列 -->
  <header id="top-bar">
    <div class="top-brand">
      <div class="brand-mark">中正</div>
      <div class="brand-text">
        <h1>中正高中 3D 校園導覽</h1>
        <p>115 學年度 · 臺北市北投區文林北路 77 號</p>
      </div>
    </div>

    <div class="search-wrapper">
      <div class="search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input id="search-input" type="text" placeholder="搜尋班級 (如 214、101、318、音122)、處室、中正園、生態池..." autocomplete="off" />
        <button id="search-clear" class="search-clear-btn" title="清除">✕</button>
      </div>
      <div id="search-results" class="search-results"></div>
    </div>

    <div class="top-controls">
      <button id="btn-reset-cam" class="ctrl-btn active" title="回到全校最佳全覽視角">最佳全覽</button>
      <button id="btn-mode-fpv" class="ctrl-btn" title="以中正高中同學角色在校園地面漫步探索">地面實境漫步</button>
      <button id="btn-programs" class="ctrl-btn" title="檢視中正高中藝才班、實驗班與特色教學空間">特色班群導覽</button>
      <div class="theme-dropdown" id="theme-dropdown">
        <button id="btn-theme-menu" class="ctrl-btn" title="切換 3D 視覺風格主題"><span id="theme-menu-label">晴空寫實</span> ▾</button>
        <div id="theme-menu" class="theme-menu">
          <button type="button" class="theme-item active" data-theme="day">晴空寫實</button>
          <button type="button" class="theme-item" data-theme="pixel">像素冒險</button>
          <button type="button" class="theme-item" data-theme="brick">微縮積木</button>
          <button type="button" class="theme-item" data-theme="night">星夜光影</button>
        </div>
      </div>
      <button id="btn-toggle-eco" class="ctrl-btn" title="切換省電渲染模式">省電模式</button>
      <button id="btn-mode-bird" class="ctrl-btn" style="display:none;">鳥瞰模式</button>
      <button id="btn-toggle-night" class="ctrl-btn" style="display:none;">白天模式</button>
    </div>
  </header>

  <!-- 右上角：3D 動態方位羅盤指北針 + 滑鼠左鍵模式切換 + 十字方向平移縮放控制盤 -->
  <div id="compass-box">
    <button type="button" id="compass-reset-btn" title="點擊回正北方視角（平面圖右方 +X 為北方）">
      <div id="compass-dial">
        <span class="c-dir c-n">北N</span>
        <span class="c-dir c-e">E</span>
        <span class="c-dir c-s">S</span>
        <span class="c-dir c-w">W</span>
        <div class="c-needle">
          <span class="n-red"></span>
          <span class="s-white"></span>
        </div>
      </div>
    </button>
    <div class="compass-caption" id="compass-heading-txt">北方：文林北路側 (+X)</div>

    <div class="mouse-mode-switch" role="group" aria-label="滑鼠左鍵拖曳模式">
      <button type="button" id="left-drag-pan-btn" class="m-mode-btn" title="按住左鍵拖曳平移畫面">左鍵平移</button>
      <button type="button" id="left-drag-rot-btn" class="m-mode-btn active" title="按住左鍵拖曳 360 度旋轉視角">左鍵旋轉</button>
    </div>

    <div class="pan-dpad-grid" role="group" aria-label="畫面平移與縮放控制">
      <span></span>
      <button type="button" class="pan-btn" data-pan="up" title="畫面往前平移">▲</button>
      <span></span>
      <button type="button" class="pan-btn" data-pan="left" title="畫面往左平移">◀</button>
      <button type="button" class="pan-btn home" id="pan-home-btn" title="回到最佳全覽">全覽</button>
      <button type="button" class="pan-btn" data-pan="right" title="畫面往右平移">▶</button>
      <button type="button" class="pan-btn" data-pan="zoomIn" title="放大視角">＋</button>
      <button type="button" class="pan-btn" data-pan="down" title="畫面往後平移">▼</button>
      <button type="button" class="pan-btn" data-pan="zoomOut" title="縮小視角">－</button>
    </div>
  </div>

  <!-- 左側功能面板：樓層切換、A* 路線規劃、精選導覽、小地圖 -->
  <aside id="left-dock">
    <div class="dock-card">
      <div class="section-header">
        <h2>樓層剖面切換</h2>
        <span>每層高 3.6m · 選層自動展開教室</span>
      </div>
      <div class="floor-switcher">
        <button class="floor-btn active" data-floor="ALL">全棟</button>
        <button class="floor-btn" data-floor="5F">5F</button>
        <button class="floor-btn" data-floor="4F">4F</button>
        <button class="floor-btn" data-floor="3F">3F</button>
        <button class="floor-btn" data-floor="2F">2F</button>
        <button class="floor-btn" data-floor="1F">1F</button>
        <button class="floor-btn" data-floor="B1">B1</button>
      </div>
    </div>

    <div class="dock-card">
      <div class="dock-tabs">
        <button class="tab-btn active" data-tab="tab-route">路線規劃 (A*)</button>
        <button class="tab-btn" data-tab="tab-tours">精選導覽</button>
        <button class="tab-btn" data-tab="tab-guide">方向與圖例</button>
      </div>

      <!-- 頁籤 1：A* 校園步道路線規劃 -->
      <div id="tab-route" class="tab-pane active">
        <div class="route-form">
          <div class="route-row">
            <span class="route-badge start">起</span>
            <select id="route-start" class="route-select"></select>
          </div>
          <div class="route-row">
            <span class="route-badge end">終</span>
            <select id="route-end" class="route-select"></select>
          </div>
          <div class="route-actions">
            <button id="btn-calc-route" class="primary-btn">A* 規劃路線</button>
            <button id="btn-walk-route" class="secondary-btn">第一人稱行走</button>
            <button id="btn-clear-route" class="secondary-btn" title="清除路線">清除</button>
          </div>
        </div>

        <div id="route-summary" class="route-summary">
          <div class="route-metrics">
            <div class="metric-box">
              <div class="metric-label">預估總距離</div>
              <div id="metric-dist" class="metric-val">0 公尺</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">步行時間 (75m/分)</div>
              <div id="metric-time" class="metric-val">0 分鐘</div>
            </div>
          </div>
          <div class="section-header">
            <h2>轉彎與導引指示</h2>
          </div>
          <ul id="turn-list" class="turn-list"></ul>
        </div>
      </div>

      <!-- 頁籤 2：精選導覽路線 -->
      <div id="tab-tours" class="tab-pane">
        <div id="tours-list" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>

      <!-- 頁籤 3：方位判斷與校園圖例說明 -->
      <div id="tab-guide" class="tab-pane">
        <div class="building-desc" style="font-size:12px;">
          <strong>方位與比例尺基準說明：</strong><br/>
          1. <strong>校園平面圖</strong>：以圖面<strong>右邊為北方 (+X)</strong>，左邊為南方 (-X)，上方為西方 (-Z)，下方為東方 (+Z)。<br/>
          2. <strong>教室配置圖 (115.8.12)</strong>：圖面<strong>右側為西方</strong>，左側為東方。<br/>
          3. <strong>400m 田徑場比例尺</strong>：田徑場跑道外圍總長約 162.8 m，換算比例尺為 <code>1 px = 0.27 m</code>，每層樓高 <code>3.6 m</code>。<br/>
          4. <strong>全區立體設施</strong>：包含各教學大樓、圖書館 (3 層)、中正園、裝置藝術、藝德女神、四格池、生態池、大榕樹花圃、停車棚／停車位 (P) 與各類運動球場。
        </div>
      </div>
    </div>

    <!-- 左下角互動小地圖 -->
    <div id="minimap-card">
      <div class="minimap-header">
        <span>校園互動小地圖（點擊瞬移）</span>
        <span class="compass-pill" title="平面圖右邊為北方">► 北 (N)</span>
      </div>
      <canvas id="minimap-canvas" width="290" height="222"></canvas>
    </div>
  </aside>

  <!-- 右側建物詳情與原色樓層配置表面板 -->
  <aside id="right-panel" class="collapsed">
    <div class="panel-header">
      <div>
        <div id="panel-category" class="panel-category">教學大樓</div>
        <h2 id="panel-title" class="panel-title">中正樓</h2>
      </div>
      <button id="panel-close" class="panel-close" title="關閉面板">✕</button>
    </div>
    <div class="panel-body">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">地上/地下樓層</div>
          <div id="stat-floors" class="stat-value">5 層</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">量體高度</div>
          <div id="stat-height" class="stat-value">18.0 m</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">配置空間數</div>
          <div id="stat-rooms" class="stat-value">28 間</div>
        </div>
      </div>

      <div id="panel-desc" class="building-desc"></div>
      <div id="panel-config-container"></div>
    </div>
  </aside>

  <!-- 收合右側介紹抽屜時的浮動展開按鈕 -->
  <button type="button" id="reopen-drawer-pill">展開大樓介紹 ▴</button>

  <!-- 特色班群與科館導覽抽屜 -->
  <aside id="programs-drawer">
    <div class="panel-header">
      <div>
        <div class="panel-category">中正高中多元與藝術實驗教育</div>
        <h2 class="panel-title">特色班群與專科場館導覽</h2>
      </div>
      <button id="programs-close" class="panel-close" title="關閉面板">✕</button>
    </div>
    <div id="programs-list" class="programs-grid"></div>
  </aside>

  <!-- 底部中央：第三人稱地面漫步冒險控制列 (支援男同學/女同學角色、第三/第一人稱、步行/跑步與出生點瞬移) -->
  <div id="walk-hud-bar">
    <div class="walk-head">
      <div class="walk-head-title">
        <b>地面漫步冒險（第三人稱角色探索／第一人稱切換）</b>
        <small id="walk-status-txt">使用 W/A/S/D 或方向鍵操控同學行走 · 滑鼠拖曳旋轉視角 · 點擊地面自動行走</small>
      </div>
      <div class="walk-char-select">
        <button type="button" class="char-chip active" id="char-boy-btn" data-char="boy">男同學</button>
        <button type="button" class="char-chip" id="char-girl-btn" data-char="girl">女同學</button>
        <button type="button" class="char-chip active" id="walk-cam-view-btn">視角：第三人稱</button>
        <button type="button" class="char-chip" id="walk-pace-btn">速度：步行</button>
        <button type="button" class="char-chip" id="walk-hud-collapse-btn" title="快捷鍵 H">收合面板</button>
        <button type="button" class="primary-btn" id="exit-walk-btn" style="flex:none;padding:5px 11px;">返回鳥瞰</button>
      </div>
    </div>
    <div class="walk-controls-row">
      <div class="walk-dpad">
        <button type="button" class="w-btn" data-wact="turnLeft">↺ 左轉</button>
        <button type="button" class="w-btn pri" data-wact="forward">▲ 前進</button>
        <button type="button" class="w-btn" data-wact="backward">▼ 後退</button>
        <button type="button" class="w-btn" data-wact="turnRight">↻ 右轉</button>
      </div>
      <div class="walk-spawns" id="walk-spawn-btns"></div>
    </div>
  </div>

  <!-- 底部導航狀態列 (含播放/暫停、速度切換、帶路視角切換與即時進度條) -->
  <div id="nav-status-bar">
    <div class="nav-bar-top">
      <div class="nav-info">
        <b id="nav-route-title">校園步行導航路線</b>
        <small id="nav-route-meta"></small>
      </div>
      <div class="nav-actions">
        <button type="button" class="primary-btn" id="sim-walk-btn" style="flex:none;">模擬沿路帶路</button>
        <button type="button" class="secondary-btn" id="walk-speed-btn" style="padding:6px 10px;">1x 速度</button>
        <button type="button" class="secondary-btn" id="walk-cam-height-btn" style="padding:6px 10px;">視角：高空全景</button>
        <button type="button" class="panel-close" id="clear-nav-bar-btn" title="清除導航">✕</button>
      </div>
    </div>
    <div class="nav-walk-bar">
      <div id="nav-walk-progress-bar"></div>
    </div>
  </div>

  <!-- 舊版簡易 HUD (保留相容) -->
  <div id="fpv-hud" style="display:none !important;"></div>

  <div id="joystick-zone" title="手機虛擬移動搖桿">
    <div id="joystick-knob"></div>
  </div>

  <div id="toast-msg"></div>

  <!-- 底部操作說明與版權列 -->
  <footer id="campus-footer">
    <span>操作：滑鼠拖曳旋轉或平移（右上角可切換） · 滾輪縮放 · WASD 移動 · 點擊「最佳全覽」回到全景構圖</span>
    <span style="display:flex;align-items:center;gap:12px;">
      <button type="button" id="open-gesture-btn" class="footer-btn">操作說明</button>
      <button type="button" id="open-copyright-btn" class="footer-btn">關於本系統與資料來源</button>
    </span>
  </footer>

  <!-- 操作說明視窗 -->
  <div id="gesture-modal" class="modal-backdrop">
    <div class="modal-box">
      <div class="panel-header" style="padding:0 0 8px;">
        <h3>滑鼠與觸控操作說明</h3>
        <button type="button" class="panel-close" id="close-gesture-btn">✕</button>
      </div>
      <ul>
        <li><b>滑鼠拖曳／單指拖曳</b>：360 度旋轉視角或平移地圖（可於右上角羅盤下方切換「左鍵平移／左鍵旋轉」）。</li>
        <li><b>滾輪／雙指捏合</b>：放大或縮小校園視角。</li>
        <li><b>點選建築或標籤</b>：展開右側大樓介紹與 115 學年度同色系樓層配置表。</li>
        <li><b>點選右上角羅盤</b>：一鍵回正北方視角（平面圖右方 +X 為北方，文林北路側）。</li>
        <li><b>地面實境漫步</b>：可切換男同學／女同學 3D 角色、第三人稱／第一人稱視角、步行／跑步與快速瞬移點。</li>
      </ul>
      <button type="button" class="primary-btn" id="ok-gesture-btn">了解並關閉</button>
    </div>
  </div>

  <!-- 關於系統與資料來源視窗 -->
  <div id="copyright-modal" class="modal-backdrop">
    <div class="modal-box">
      <div class="panel-header" style="padding:0 0 8px;">
        <h3>關於本系統與空間資料說明</h3>
        <button type="button" class="panel-close" id="close-copyright-btn">✕</button>
      </div>
      <p><b>學校名稱：</b>臺北市立中正高級中學（Taipei Municipal Zhongzheng Senior High School）</p>
      <p><b>學校地址：</b>112046 臺北市北投區文林北路 77 號</p>
      <p><b>空間與配置基準：</b>依據 115 學年度班級教室配置圖（115.8.12）、校園平面圖與 214 教室實景照片建置。400 公尺藍色 PU 標準田徑場換算比例尺（1 px = 0.27 m，標準樓高 3.6 m）。</p>
      <p><b>3D 引擎技術：</b>基於 WebGL / Three.js、程序化建築與運動場建模，以及 Pillow + NumPy 尺度空間樹冠偵測與 <code>THREE.InstancedMesh</code> 批次渲染。</p>
      <button type="button" class="primary-btn" id="ok-copyright-btn">了解並關閉</button>
    </div>
  </div>

  <!-- 載入獨立資料檔 (同時內嵌確保 file:// 雙擊 100% 離線可用) -->
  <script src="./data/map_texture.js"></script>
  <script src="./data/buildings.js"></script>
  <script src="./data/classrooms.js"></script>
  <script src="./data/road_network.js"></script>
  <script src="./data/tours.js"></script>
  <script src="./data/trees-data.js"></script>
  <script>
    if (!window.CAMPUS_MAP_TEXTURE) { ${mapTex} }
    if (!window.CAMPUS_BUILDINGS) { ${bldgs} }
    if (!window.CAMPUS_CLASSROOMS) { ${rooms} }
    if (!window.CAMPUS_ROAD_NETWORK) { ${roads} }
    if (!window.CAMPUS_TOURS) { ${tours} }
    if (!window.CAMPUS_TREES) { ${trees} }
  </script>

  <!-- 啟動 3D 導覽主程式 -->
  <script type="module">
${appJs}
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('[完成] 已產生 index.html，大小：', html.length, 'bytes');
