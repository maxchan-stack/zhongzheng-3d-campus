// 中正高中 3D 校園導覽 — 精選導覽路線資料檔
// 結合校園步道路網節點 (nodeId) 與沿途景點解說，支援一鍵路線預覽與第一人稱自動導覽漫遊

window.CAMPUS_TOURS = [
  {
    id: "tour_freshman",
    title: "新生入學必看核心動線",
    subtitle: "校門 → 中正園 → 中正樓 → 美齡樓 → 誠正樓 → 格致樓（合作社） → 圖書館",
    badge: "人氣首選",
    durationText: "約 6 分鐘",
    description: "專為高一新生與家長設計的校園核心導覽。從大門警衛室與中正園出發，依序走訪行政中樞中正樓、高二高三美齡樓、高一專屬誠正樓、下課最愛去的格致樓合作社，最後抵達圖書館。",
    stops: [
      {
        nodeId: "n_gate",
        buildingId: "guardhouse",
        title: "第一站：校門與大門警衛室",
        note: "中正高中正門入口，設有警衛室與急救 AED，旁為中正園涼亭與機車、腳踏車停車棚。"
      },
      {
        nodeId: "n_zz_south",
        buildingId: "zhongzheng",
        title: "第二站：中正樓（行政中心與高二教室）",
        note: "一樓設有架空層穿堂與生活科技教室（三）；二樓為校長室、總務處、會計室與第一會議室；三至五樓為二年級 203～219 班教室。"
      },
      {
        nodeId: "n_meiling_center",
        buildingId: "meiling",
        title: "第三站：美齡樓與四維園",
        note: "穿過中美東廊道與四維園中庭抵達美齡樓。一樓有重訓室與烹飪教室，二樓為英文、社會、自然科辦公室，三至五樓為高三與部分高二班級。"
      },
      {
        nodeId: "n_chengzheng",
        buildingId: "chengzheng",
        title: "第四站：誠正樓（高一教室與 AI 教室）",
        note: "跨越生態池中庭抵達誠正樓。一樓設有健康中心（含 AED）、AI 教室與地理專科教室；二樓為共學空間一至四；三至五樓為高一 101～119 班。"
      },
      {
        nodeId: "n_gezhi_center",
        buildingId: "gezhi",
        title: "第五站：格致樓（自然實驗室、處室與合作社）",
        note: "一樓有員生消費合作社、創課中心與原生種復育中心；二樓為教務處、學務處、教官室；三至五樓為物理、化學、生物、地科實驗室及輔導室。"
      },
      {
        nodeId: "n_lib_south",
        buildingId: "library",
        title: "終點站：圖書館",
        note: "三層樓圖書資訊大樓，一樓為流通櫃台與辦公室，二樓為討論教室與開架書庫，三樓為第一至四閱覽室。"
      }
    ]
  },
  {
    id: "tour_arts_ecology",
    title: "洛城藝文與綠意景觀巡禮",
    subtitle: "裝置藝術與中正園 → 大花圃與莊敬樓 → 藝德女神廣場 → 藝德樓",
    badge: "特色專科",
    durationText: "約 4 分鐘",
    description: "探索中正園、裝置藝術綠帶、大花圃大榕樹群與四格池，並造訪音樂、美術、舞蹈藝才班殿堂「藝德樓」。",
    stops: [
      {
        nodeId: "n_zz_garden_n",
        buildingId: "zhongzheng_garden",
        title: "第一站：中正園與裝置藝術區",
        note: "位於中正樓與活動中心之間，設有中正園圓形假山草坪景觀島、裝置藝術雕塑綠帶與景觀步道。"
      },
      {
        nodeId: "n_zhuangjing_s",
        buildingId: "zhuangjing",
        title: "第二站：莊敬樓與大花圃、四格池",
        note: "五層樓專科教學大樓，緊鄰大花圃大榕樹群與四格池，包含家政、國舞、生物活體室、美術與英文專科、視聽教室及電腦教室（一）（二）（四）。"
      },
      {
        nodeId: "n_yide_plaza",
        buildingId: "zhongzheng_garden",
        title: "第三站：藝德女神廣場",
        note: "位於藝德樓前方圓形劇場旁之代表性雕塑「藝德女神」，象徵中正高中深厚的人文與藝術底蘊。"
      },
      {
        nodeId: "n_yide_main",
        buildingId: "yide",
        title: "終點站：藝德樓（音樂、美術、舞蹈班殿堂）",
        note: "五層樓專業藝術大樓：一樓現代舞與芭蕾教室、二樓展覽室與水彩設計、三樓版畫國畫與攝影、四樓合奏室與 401～410 琴房、五樓演藝廳與 501～521 琴房。"
      }
    ]
  },
  {
    id: "tour_sports",
    title: "熱血陽光運動場館巡禮",
    subtitle: "活動中心 → 迎曦樓（游泳池／擊劍場） → 籃網排球場與棒球場 → 400m 田徑場",
    badge: "運動活力",
    durationText: "約 5 分鐘",
    description: "走訪中正高中傲視北市的超大運動空間：從挑高活動中心出發，途經五層樓迎曦樓（室內溫水泳池、擊劍武術場、桌球場）、戶外籃網排球場群、棒球場，最後抵達 400 公尺標準田徑場與司令台。",
    stops: [
      {
        nodeId: "n_ac_west",
        buildingId: "activity_center",
        title: "第一站：學生活動中心",
        note: "一樓設有校史室、校友講堂 1F、中正廳與韻律教室；二、三樓為大型室內綜合球場與集會禮堂。"
      },
      {
        nodeId: "n_yingxi_south",
        buildingId: "yingxi",
        title: "第二站：迎曦樓（游泳池與擊劍武術場）",
        note: "五層樓複合運動場館：一樓為標準室內游泳池（備有 AED），二樓體育科辦公室，三樓為擊劍武術場，四樓桌球場，五樓機房。"
      },
      {
        nodeId: "n_basketball",
        buildingId: "sports_courts",
        title: "第三站：戶外籃球場、網球場與排球場群",
        note: "包含六面全場籃球場、網球場與五面排球場，以及排球場旁花圃。"
      },
      {
        nodeId: "n_command",
        buildingId: "command_platform",
        title: "第四站：司令台與林蔭大道",
        note: "座落於林蔭大道與 400 公尺田徑場之間，兩側連接大型看台階梯，對面為棒球場練習區。"
      },
      {
        nodeId: "n_track_s",
        buildingId: "sports_courts",
        title: "終點站：400 公尺標準田徑場",
        note: "全校最開闊的運動場域，擁有標準 400 公尺跑道與中央草皮球場。"
      }
    ]
  }
];
