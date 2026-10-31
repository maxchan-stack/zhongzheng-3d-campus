// 中正高中 3D 校園導覽 — 建物與校園立體設施空間幾何資料檔
// 座標系統說明：
// - px, py, pw, ph 為對應「校園平面圖.png」(1406 x 1078) 之像素座標
// - 3D 引擎載入時，自動以比例尺 (1 px = 0.27 m) 轉換為公尺，標準樓高每層 3.6 公尺
// - 方位定義：校園平面圖右邊為北方 (+X = North)，左邊為南方 (-X = South)，上方為西方 (-Z = West)，下方為東方 (+Z = East)
// - 教室配置圖右側為西方

window.CAMPUS_BUILDINGS = [
  // ================= 一、 核心教學與行政大樓 =================
  {
    id: "zhongzheng",
    name: "中正樓",
    category: "行政與教學大樓",
    floors: 5,
    hasBasement: true,
    color: "#d4d2ce",
    roofColor: "#9e9d98",
    sensitive: false,
    description: "學校核心行政與教學大樓，位於大門迎賓廣場前方，南端山牆設有彩虹直條馬賽克壁畫與綠色遮雨棚。一樓設有生活科技教室（三）、修繕中心、倉庫與架空層穿堂；二樓為校長室、總務處、會計室、會議室（一）與數學科辦公室（一）；三至五樓為二年級普通班教室（203 至 219 班）與檔案室。",
    labelPos: { px: 924, py: 645 },
    parts: [
      { px: 896, py: 530, pw: 56, ph: 230, floors: 5 }
    ],
    entrances: [
      { px: 952, py: 645, name: "中正樓東側穿堂入口" },
      { px: 896, py: 745, name: "中美東連通口" },
      { px: 896, py: 600, name: "中美西連通口" }
    ]
  },
  {
    id: "zhisheng",
    name: "至聖樓",
    category: "行政與社團大樓",
    floors: 5,
    hasBasement: false,
    color: "#d0ceca",
    roofColor: "#9a9994",
    sensitive: false,
    description: "緊鄰中正樓與校門警衛室之五層樓灰白色鋼筋混凝土建築，與格致樓以圓弧轉角相連，正面設有穿堂大階梯與榮譽直幅布條。一樓為學生會辦公室與儲物間；二樓為校安中心值勤室與人事室；三樓為家長會與管樂室；四樓為儀隊與國防器材室；五樓為電氣室與儲藏室。",
    labelPos: { px: 924, py: 825 },
    parts: [
      { px: 896, py: 760, pw: 56, ph: 145, floors: 5 }
    ],
    entrances: [
      { px: 952, py: 825, name: "至聖樓大門側入口" }
    ]
  },
  {
    id: "meiling",
    name: "美齡樓",
    category: "教學大樓",
    floors: 5,
    hasBasement: true,
    color: "#d4d2ce",
    roofColor: "#9e9d98",
    sensitive: false,
    description: "位於校園中軸線中央之五層樓主力教學大樓，北側透過「中美東」、「中美西」廊道與中正樓合圍出「四維園」中庭，南側面向生態池與誠正樓中庭。一樓為烹飪教室、重量訓練室與生活科技教室（一）（二）；二樓為英文、社會、自然科辦公室與學習中心；三至五樓為三年級與二年級班級教室（201、202、301 至 320 班）。",
    labelPos: { px: 805, py: 730 },
    parts: [
      { px: 780, py: 595, pw: 52, ph: 295, floors: 5 },
      { px: 832, py: 595, pw: 92, ph: 22, floors: 3, name: "中美西廊道" },
      { px: 832, py: 740, pw: 92, ph: 22, floors: 3, name: "中美東廊道" },
      { px: 842, py: 618, pw: 76, ph: 120, floors: 1, heightM: 0.45, isPlaza: true, color: "#687066", name: "四維園中庭平台" }
    ],
    entrances: [
      { px: 805, py: 730, name: "美齡樓穿堂走道" },
      { px: 805, py: 600, name: "美齡樓西側入口" },
      { px: 805, py: 880, name: "美齡樓東側入口" }
    ]
  },
  {
    id: "gezhi",
    name: "格致樓",
    category: "實驗與行政大樓",
    floors: 5,
    hasBasement: true,
    color: "#cfcdc8",
    roofColor: "#9a9893",
    sensitive: false,
    description: "位於中庭東側（平面圖下方）之五層樓灰白色大樓，東南隅以流線圓弧轉角與至聖樓銜接，外牆側設有雙排綠色波浪頂棚停車棚。一樓設有合作社、糾察隊、衛糾室、情境教室、創課中心與原生種復育中心；二樓為學務處、教務處、教官室與國文科辦公室；三樓為輔導室、諮商室、跨域講堂與化學實驗室；四樓為物理實驗室、音樂教室（一）、未來教室、團輔室與設備組；五樓為生物實驗室、地球科學專科教室、電腦教室（三）與素養學習教室。",
    labelPos: { px: 640, py: 885 },
    parts: [
      { px: 552, py: 858, pw: 355, ph: 52, floors: 5 },
      { px: 595, py: 830, pw: 175, ph: 28, floors: 3, color: "#c8c6c0", name: "格致樓內側專科與走廊區" }
    ],
    entrances: [
      { px: 675, py: 858, name: "格致樓中庭入口" },
      { px: 750, py: 908, name: "格致樓停車棚側入口" }
    ]
  },
  {
    id: "chengzheng",
    name: "誠正樓",
    category: "教學大樓",
    floors: 5,
    hasBasement: false,
    color: "#d4d2ce",
    roofColor: "#9e9d98",
    sensitive: false,
    description: "位於中庭南側（平面圖中左方）之五層樓教學大樓，與莊敬樓、美齡樓、格致樓合圍出中央生態池中庭。一樓設有健康中心（含 AED）、AI 教室、智慧教室、史地準備室、地理專科教室與生研社；二樓為共學空間一至四及 115、319 班；三至五樓為一年級普通班教室（101 至 119 班）。",
    labelPos: { px: 568, py: 730 },
    parts: [
      { px: 552, py: 668, pw: 38, ph: 192, floors: 5 }
    ],
    entrances: [
      { px: 590, py: 730, name: "誠正樓中庭側入口" },
      { px: 552, py: 730, name: "誠正樓外側入口" }
    ]
  },
  {
    id: "zhuangjing",
    name: "莊敬樓",
    category: "專科教學大樓",
    floors: 5,
    hasBasement: false,
    color: "#d0ceca",
    roofColor: "#9a9994",
    sensitive: false,
    description: "位於中庭西側（大花圃與四格池旁）之五層樓專科大樓。一樓為家政教室、國舞教室與儲物間；二樓為電腦教室（四）、生物活體室與哺乳室；三樓為英文專科與美術專科教室；四樓為視聽教室（一）、（二）；五樓為電腦教室（一）、（二）。",
    labelPos: { px: 640, py: 658 },
    parts: [
      { px: 552, py: 625, pw: 175, ph: 44, floors: 5 }
    ],
    entrances: [
      { px: 640, py: 669, name: "莊敬樓中庭入口" },
      { px: 640, py: 625, name: "莊敬樓大花圃側入口" }
    ]
  },
  {
    id: "yide",
    name: "藝德樓",
    category: "藝術大樓",
    floors: 5,
    hasBasement: true,
    color: "#d4cec3",
    roofColor: "#9e988e",
    sensitive: false,
    description: "環抱「藝德女神」雕塑廣場之五層樓藝術大樓，為音樂班、美術班與舞蹈班專業教學空間。一樓設舞蹈教室 I（現代舞）、舞蹈教室 II（芭蕾）、舞 121 及舞蹈班辦公室；二樓為展覽室、美術設計、素描水彩教室 I 及舞 221、321；三樓為版畫、國畫書法、數位攝影、素描水彩教室 II/III 及美 120、220；四樓為合奏教室、琴房 401～410 及音 122、222、322；五樓為演藝廳與琴房 501～521。",
    labelPos: { px: 225, py: 752 },
    parts: [
      { px: 145, py: 728, pw: 166, ph: 49, floors: 5, name: "藝德樓東翼" },
      { px: 76, py: 600, pw: 52, ph: 128, floors: 5, name: "藝德樓南翼" },
      { px: 110, py: 665, pw: 120, ph: 65, floors: 1, heightM: 3.2, color: "#dad4c8", name: "藝德圓形劇場與連通平台" }
    ],
    entrances: [
      { px: 225, py: 728, name: "藝德樓廣場主入口" },
      { px: 128, py: 660, name: "藝德樓側翼入口" }
    ]
  },
  {
    id: "library",
    name: "圖書館",
    category: "圖書資訊大樓",
    floors: 3,
    hasBasement: true,
    color: "#cfcdc6",
    roofColor: "#9c9a94",
    sensitive: false,
    description: "位於排球場與籃球場旁之三層樓現代主義コンクリート建築（上層外挑造型，一樓至三樓）。一樓為圖書館辦公室與流通服務台；二樓為討論教室與開架書庫；三樓為第一至四閱覽室。",
    labelPos: { px: 1030, py: 432 },
    parts: [
      { px: 964, py: 385, pw: 129, ph: 95, floors: 3 },
      { px: 955, py: 364, pw: 163, ph: 126, floors: 1, heightM: 0.6, isPlaza: true, color: "#b8b4aa", name: "圖書館基座與階梯" }
    ],
    entrances: [
      { px: 1030, py: 480, name: "圖書館階梯主入口" }
    ]
  },
  {
    id: "activity_center",
    name: "活動中心",
    aliases: ["學生活動中心"],
    category: "體育與集會場館",
    floors: 3,
    hasBasement: true,
    color: "#d8d6d0",
    roofColor: "#2d8a6c",
    sensitive: false,
    description: "位於校園北側（平面圖右方）之大型多功能場館（學生活動中心），具鮮明青綠色斜屋頂與灰白色外牆。一樓設有校史室、校友講堂（1F）、中正廳、韻律教室與電梯；二至三樓為挑高大禮堂與室內綜合體育館（活動中心 2, 3F）。",
    labelPos: { px: 1225, py: 540 },
    parts: [
      { px: 1150, py: 425, pw: 150, ph: 231, floors: 3 }
    ],
    entrances: [
      { px: 1150, py: 540, name: "活動中心主入口" },
      { px: 1225, py: 656, name: "活動中心東側入口" }
    ]
  },
  {
    id: "yingxi",
    name: "迎曦樓（游泳池）",
    aliases: ["游泳池", "迎曦樓"],
    category: "體育場館",
    floors: 5,
    hasBasement: false,
    color: "#d9cdb4",
    roofColor: "#bfb299",
    sensitive: false,
    description: "位於網球場與活動中心旁之五層樓複合體育館。一樓為室內溫水游泳池（含 AED）；二樓為體育科辦公室；三樓為擊劍武術場；四樓為桌球場；五樓為機房。",
    labelPos: { px: 1255, py: 280 },
    parts: [
      { px: 1228, py: 137, pw: 67, ph: 180, floors: 5, name: "迎曦樓主體" },
      { px: 1132, py: 139, pw: 96, ph: 160, floors: 2, color: "#b8d4df", name: "室內游泳池水池區" },
      { px: 1235, py: 331, pw: 36, ph: 42, floors: 2, color: "#cfb284", name: "泳池附屬設施" }
    ],
    entrances: [
      { px: 1228, py: 280, name: "迎曦樓游泳池入口" }
    ]
  },

  // ================= 二、 校園門禁、環保與集會建物 =================
  {
    id: "guardhouse",
    name: "警衛室",
    category: "校園安全與門禁",
    floors: 1,
    hasBasement: false,
    color: "#d4d8dd",
    roofColor: "#899eb2",
    sensitive: false,
    description: "位於校園大門口旁（平面圖座標 px: 1016..1045, py: 874..932），為淺灰白長型門禁亭搭配車道遮雨棚與直立校名石柱碑，負責校園門禁安全管制、訪客登記與緊急應變通報，外牆設有急救 AED 設備。",
    labelPos: { px: 1030, py: 903 },
    parts: [
      { px: 1016, py: 874, pw: 29, ph: 58, floors: 1, heightM: 3.5 }
    ],
    entrances: [
      { px: 1030, py: 874, name: "大門警衛室窗口" }
    ]
  },
  {
    id: "command_platform",
    name: "司令台",
    category: "體育與集會設施",
    floors: 1,
    hasBasement: false,
    color: "#c87d65",
    roofColor: "#a65e46",
    sensitive: false,
    description: "位於 400 公尺標準田徑場與林蔭大道之間，兩側連接田徑場看台階梯，為全校朝會、校慶運動會與大型戶外集會之主持檢閱平台。",
    labelPos: { px: 410, py: 472 },
    parts: [
      { px: 393, py: 462, pw: 34, ph: 18, floors: 1, heightM: 4.5, name: "司令台主體" },
      { px: 152, py: 464, pw: 225, ph: 14, floors: 1, heightM: 2.2, color: "#9e9e9e", name: "田徑場看台（南段）" },
      { px: 442, py: 464, pw: 220, ph: 14, floors: 1, heightM: 2.2, color: "#9e9e9e", name: "田徑場看台（北段）" },
      { px: 760, py: 95, pw: 16, ph: 330, floors: 1, heightM: 2.2, color: "#9e9e9e", name: "田徑場看台（東側）" }
    ],
    entrances: [
      { px: 410, py: 462, name: "司令台階梯" }
    ]
  },
  {
    id: "recycling",
    name: "垃圾場與資源回收站",
    aliases: ["垃圾場", "資源回收"],
    category: "環保與後勤設施",
    floors: 1,
    hasBasement: false,
    color: "#b87a68",
    roofColor: "#965c4b",
    sensitive: true,
    description: "位於藝德樓旁，包含垃圾集中場與資源回收分類站，由衛生糾察隊協助全校環保回收作業（後勤敏感管制區域僅呈現立體外觀）。",
    labelPos: { px: 108, py: 880 },
    parts: [
      { px: 75, py: 822, pw: 63, ph: 36, floors: 1, name: "垃圾場" },
      { px: 73, py: 907, pw: 72, ph: 34, floors: 1, name: "資源回收" }
    ],
    entrances: [
      { px: 140, py: 840, name: "環保站入口" }
    ]
  },

  // ================= 三、 校園立體景觀、中正園、裝置藝術、花圃、球場與停車位 =================
  {
    id: "zhongzheng_garden",
    name: "中正園與裝置藝術區",
    aliases: ["中正園", "裝置藝術", "藝德女神", "生態池", "四格池"],
    category: "校園景觀與裝置藝術",
    floors: 1,
    hasBasement: false,
    color: "#6b9e5e",
    roofColor: "#538248",
    sensitive: false,
    hideLabelWhenZoomedOut: false,
    description: "嚴格對齊校園平面圖座標（px: 1008..1088, py: 522..816）與實景細節：包含迎賓廣場南段之「中正園」圓形假山草坪景觀島（中心 px: 1048, py: 762）、北段「裝置藝術」雕塑中央綠島（px: 1034..1062, py: 536..704）與兩側教職員停車區（P），以及藝德樓前「藝德女神」雕像與莊敬樓前「四格池」。",
    labelPos: { px: 1048, py: 755 },
    parts: [
      { px: 1040, py: 754, pw: 16, ph: 16, floors: 1, heightM: 0.2, isPlaza: true, color: "#5c7f43", name: "中正園圓形假山草坪景觀島" },
      { px: 1034, py: 536, pw: 28, ph: 168, floors: 1, heightM: 0.42, isPlaza: true, color: "#5e8f52", name: "裝置藝術中央綠島" },
      { px: 204, py: 618, pw: 20, ph: 20, floors: 1, heightM: 3.5, color: "#d88a8a", name: "藝德女神雕塑基座" },
      { px: 732, py: 632, pw: 38, ph: 28, floors: 1, heightM: 0.75, isPlaza: true, color: "#9eb8b0", name: "四格池" }
    ],
    entrances: [
      { px: 1048, py: 762, name: "中正園步道口" }
    ]
  },
  {
    id: "eco_pond",
    name: "生態池",
    aliases: ["中庭生態池", "生態池森林", "大池塘"],
    category: "校園自然生態景觀",
    floors: 1,
    hasBasement: false,
    color: "#1b7895",
    roofColor: "#145c73",
    sensitive: false,
    hideLabelWhenZoomedOut: false,
    description: "位於誠正樓、莊敬樓、美齡樓與格致樓合圍之中庭核心區。外圍由茂密多層次之闊葉與常綠喬木構成森林綠帶，森林正中央為開闊之自然生態大池塘，池畔設景觀疊石、水生睡蓮荷葉與生態觀察木棧道。",
    labelPos: { px: 684, py: 750 },
    parts: [
      { px: 594, py: 672, pw: 182, ph: 154, floors: 1, heightM: 0.22, isPlaza: true, color: "#2d5e34", name: "生態池外圍茂密深林與中央大池塘" }
    ],
    entrances: [
      { px: 735, py: 750, name: "生態池木棧道入口" }
    ]
  },
  {
    id: "flower_beds",
    name: "大花圃與排球場旁花圃",
    aliases: ["大花圃", "排球場旁花圃", "花圃", "大榕樹"],
    category: "校園大榕樹林蔭花圃",
    floors: 1,
    hasBasement: false,
    color: "#356b38",
    roofColor: "#2a572d",
    sensitive: false,
    description: "包含莊敬樓西側（林蔭大道旁）之「大花圃」以及排球場與美齡樓之間的「排球場旁花圃」。現況兩處花圃皆生長為樹冠相連、枝葉繁茂之高大濃密大榕樹群，形成校園核心綠蔭廊帶。",
    labelPos: { px: 685, py: 585 },
    parts: [
      { px: 552, py: 562, pw: 242, ph: 60, floors: 1, heightM: 0.45, isPlaza: true, color: "#356b38", name: "大花圃（濃密大榕樹林蔭區）" },
      { px: 800, py: 518, pw: 72, ph: 68, floors: 1, heightM: 0.48, isPlaza: true, color: "#356b38", name: "排球場旁花圃（大榕樹群）" }
    ],
    entrances: [
      { px: 685, py: 562, name: "大花圃林蔭步道" }
    ]
  },
  {
    id: "parking_zones",
    name: "機車／腳踏車停車棚與停車場",
    aliases: ["機車停車棚", "腳踏車停車棚", "停車場", "停車位"],
    category: "校園交通與停車設施",
    floors: 1,
    hasBasement: false,
    color: "#1e8758",
    roofColor: "#176e47",
    sensitive: false,
    description: "嚴格對齊校園平面圖座標與 Google Maps 3D 實景：包含格致樓外牆側並排延伸之雙排綠色波浪頂棚「機車／腳踏車停車棚」（px: 625..950, py: 912 & 954）、裝置藝術綠島兩側之教職員汽車停車格（P，px: 1014..1082, py: 536..704），以及藝德樓旁之汽車停車格（P）。",
    labelPos: { px: 790, py: 945 },
    parts: [
      { px: 642, py: 912, pw: 308, ph: 22, floors: 1, heightM: 2.7, color: "#1e8758", name: "機車停車棚（內排綠色波浪頂棚）" },
      { px: 625, py: 954, pw: 325, ph: 22, floors: 1, heightM: 2.7, color: "#19754b", name: "腳踏車停車棚（外排綠色波浪頂棚）" },
      { px: 1014, py: 536, pw: 68, ph: 168, floors: 1, heightM: 0.12, isPlaza: true, color: "#9c968c", name: "裝置藝術兩側教職員汽車停車區 (P)" },
      { px: 158, py: 782, pw: 162, ph: 18, floors: 1, heightM: 0.5, isPlaza: true, color: "#687078", name: "藝德樓停車位北排 (P)" },
      { px: 158, py: 858, pw: 162, ph: 20, floors: 1, heightM: 0.5, isPlaza: true, color: "#687078", name: "藝德樓停車位中排 (P)" },
      { px: 158, py: 924, pw: 278, ph: 22, floors: 1, heightM: 0.5, isPlaza: true, color: "#687078", name: "藝德樓南側停車位 (P)" }
    ],
    entrances: [
      { px: 760, py: 915, name: "停車棚通道" }
    ]
  },
  {
    id: "sports_courts",
    name: "田徑場、排球、籃球、網球與棒球場",
    aliases: ["田徑場", "排球場", "籃球場", "網球場", "棒球場", "球場", "操場"],
    category: "戶外運動場群",
    floors: 1,
    hasBasement: false,
    color: "#2268ba",
    roofColor: "#1b5499",
    sensitive: false,
    description: "依 214 教室實景還原：包含 400 公尺鮮藍色 PU 標準田徑場（含中央天然草皮足球場、白色足球門、護網籠與東側階梯看台）、五面綠框藍底排球場（含東西向球網、防撞藍柱與裁判椅）、六面綠框藍底籃球場（含水藍色曲臂籃球架）、網球場以及棒球場。",
    labelPos: { px: 900, py: 245 },
    parts: [
      { px: 792, py: 160, pw: 104, ph: 302, floors: 1, heightM: 0.30, isPlaza: true, color: "#389c64", name: "排球場（五面綠框藍底 PU 球場）" },
      { px: 898, py: 138, pw: 104, ph: 184, floors: 1, heightM: 0.30, isPlaza: true, color: "#389c64", name: "籃球場（西區三面綠框藍底球場）" },
      { px: 1004, py: 198, pw: 102, ph: 124, floors: 1, heightM: 0.30, isPlaza: true, color: "#389c64", name: "籃球場（東區三面綠框藍底球場）" },
      { px: 1004, py: 138, pw: 102, ph: 58, floors: 1, heightM: 0.30, isPlaza: true, color: "#389c64", name: "網球場" },
      { px: 898, py: 324, pw: 56, ph: 138, floors: 1, heightM: 0.26, isPlaza: true, color: "#52575e", name: "球場前柏油集會廣場" },
      { px: 444, py: 562, pw: 48, ph: 148, floors: 1, heightM: 0.32, isPlaza: true, color: "#dfd8c0", name: "棒球場壘包與練習場" }
    ],
    entrances: [
      { px: 830, py: 465, name: "排球場入口" },
      { px: 960, py: 325, name: "籃網球場入口" }
    ]
  }
];
