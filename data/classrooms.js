// 中正高中 115 學年度第 1 學期教室配置資料檔 (115.8.12)
// 每學年僅需更新此檔案，即可自動更新：
// 1. 點選建物右側之原色樓層配置表
// 2. 樓層切換時自動產生之 3D 教室方塊與名稱標籤
// 3. 班級號碼、處室、專科教室與建物名稱之全域搜尋與鏡頭飛躍定位

window.CAMPUS_CLASSROOMS = {
  academicYear: "115 學年度第 1 學期 (115.8.12)",
  orientationNote: "校園平面圖右邊為北方；教室配置圖右側為西方",
  colorPalette: {
    classRoom: "#ffffff",      // 普通班與藝才班教室（白底黑字）
    adminOffice: "#ffffff",    // 行政處室與科辦公室（白底粗體）
    specialLab: "#ffffff",     // 專科教室與實驗室
    hollow: "#d9d9d9",         // 架空層、穿堂走道、部分儲藏空間（灰階網底）
    service: "#f5f5f5",        // 廁所、樓梯、電梯、機房
    basement: "#e8eef5",       // 地下室空間
    aed: "#e53935"             // AED 急救設備標記
  },
  buildings: {
    zhongzheng: {
      buildingId: "zhongzheng",
      buildingName: "中正樓",
      layoutOrientation: "horizontal",
      floors: {
        "5F": [
          { id: "zz-501", name: "219", type: "class", grade: 2, fullName: "二年 19 班 (219)" },
          { id: "zz-502", name: "218", type: "class", grade: 2, fullName: "二年 18 班 (218)" },
          { id: "zz-503", name: "217", type: "class", grade: 2, fullName: "二年 17 班 (217)" },
          { id: "zz-504", name: "檔案室(三)", type: "admin", fullName: "檔案室（三）" },
          { id: "zz-505", name: "216", type: "class", grade: 2, fullName: "二年 16 班 (216)" },
          { id: "zz-506", name: "215", type: "class", grade: 2, bg: "#d9d9d9", fullName: "二年 15 班 (215)" },
          { id: "zz-507", name: "214", type: "class", grade: 2, fullName: "二年 14 班 (214)" },
          { id: "zz-508", name: "樓梯", type: "service", span: 0.6 }
        ],
        "4F": [
          { id: "zz-401", name: "207", type: "class", grade: 2, fullName: "二年 7 班 (207)" },
          { id: "zz-402", name: "208", type: "class", grade: 2, fullName: "二年 8 班 (208)" },
          { id: "zz-403", name: "210", type: "class", grade: 2, fullName: "二年 10 班 (210)" },
          { id: "zz-404", name: "檔案室(二)", type: "admin", fullName: "檔案室（二）" },
          { id: "zz-405", name: "211", type: "class", grade: 2, fullName: "二年 11 班 (211)" },
          { id: "zz-406", name: "212", type: "class", grade: 2, bg: "#d9d9d9", fullName: "二年 12 班 (212)" },
          { id: "zz-407", name: "213", type: "class", grade: 2, fullName: "二年 13 班 (213)" },
          { id: "zz-408", name: "樓梯", type: "service", span: 0.6 }
        ],
        "3F": [
          { id: "zz-301", name: "209", type: "class", grade: 2, fullName: "二年 9 班 (209)" },
          { id: "zz-302", name: "206", type: "class", grade: 2, fullName: "二年 6 班 (206)" },
          { id: "zz-303", name: "205", type: "class", grade: 2, fullName: "二年 5 班 (205)" },
          { id: "zz-304", name: "檔案室(一)", type: "admin", fullName: "檔案室（一）" },
          { id: "zz-305", name: "204", type: "class", grade: 2, fullName: "二年 4 班 (204)" },
          { id: "zz-306", name: "203", type: "class", grade: 2, fullName: "二年 3 班 (203)" },
          { id: "zz-307", name: "數學科辦公室(二)", type: "office", fullName: "數學科辦公室（二）" },
          { id: "zz-308", name: "樓梯", type: "service", span: 0.6 }
        ],
        "2F": [
          { id: "zz-201", name: "總務處", type: "office", fullName: "總務處" },
          { id: "zz-202", name: "會計室", type: "office", fullName: "會計室" },
          { id: "zz-203", name: "校長室", type: "office", fullName: "校長室" },
          { id: "zz-204", name: "會議室(一)", type: "office", span: 3, fullName: "會議室（一）" },
          { id: "zz-205", name: "數學科辦公室(一)", type: "office", fullName: "數學科辦公室（一）" },
          { id: "zz-206", name: "樓梯", type: "service", span: 0.6 }
        ],
        "1F": [
          { id: "zz-101", name: "倉庫", type: "service", fullName: "中正樓一樓倉庫" },
          { id: "zz-102", name: "修繕中心", type: "office", bg: "#d9d9d9", fullName: "修繕中心" },
          { id: "zz-103", name: "生活科技教室(三)", type: "lab", span: 2, fullName: "生活科技教室（三）" },
          { id: "zz-104", name: "架空層", type: "hollow", span: 2, bg: "#d9d9d9", fullName: "中正樓穿堂架空層" },
          { id: "zz-105", name: "架空層(西)", type: "hollow", bg: "#d9d9d9", fullName: "中正樓西側架空層（電梯旁）" },
          { id: "zz-106", name: "電梯", type: "service", span: 0.6 }
        ],
        "B1": [
          { id: "zz-b01", name: "防空避難室(中正)", type: "basement", span: 4, bg: "#e8eef5", fullName: "中正樓地下防空避難室與機電室" }
        ]
      }
    },

    zhisheng: {
      buildingId: "zhisheng",
      buildingName: "至聖樓",
      layoutOrientation: "horizontal",
      floors: {
        "5F": [
          { id: "zs-501", name: "電氣室", type: "service", span: 1.5, fullName: "至聖樓電氣室" },
          { id: "zs-502", name: "樓梯", type: "service", span: 0.6 },
          { id: "zs-503", name: "儲藏室", type: "service", bg: "#d9d9d9", fullName: "至聖樓五樓儲藏室" },
          { id: "zs-504", name: "穿堂走道(5F)", type: "hollow", span: 0.7 }
        ],
        "4F": [
          { id: "zs-401", name: "儀隊", type: "special", span: 1.5, fullName: "儀隊社團教室" },
          { id: "zs-402", name: "樓梯", type: "service", span: 0.6 },
          { id: "zs-403", name: "國防器材室", type: "special", fullName: "全民國防器材室" },
          { id: "zs-404", name: "穿堂走道(4F)", type: "hollow", span: 0.7 }
        ],
        "3F": [
          { id: "zs-301", name: "家長會", type: "office", span: 1.5, fullName: "家長會辦公室" },
          { id: "zs-302", name: "樓梯", type: "service", span: 0.6 },
          { id: "zs-303", name: "管樂室", type: "special", fullName: "管樂社練習室" },
          { id: "zs-304", name: "穿堂走道(3F)", type: "hollow", span: 0.7 }
        ],
        "2F": [
          { id: "zs-201", name: "校安中心值勤室", type: "office", span: 1.5, fullName: "校安中心值勤室（教官值勤）" },
          { id: "zs-202", name: "樓梯", type: "service", span: 0.6 },
          { id: "zs-203", name: "人事室", type: "office", fullName: "人事室" },
          { id: "zs-204", name: "穿堂走道(2F)", type: "hollow", span: 0.7 }
        ],
        "1F": [
          { id: "zs-101", name: "學生會辦公室", type: "special", span: 1.5, fullName: "學生會辦公室" },
          { id: "zs-102", name: "樓梯", type: "service", span: 0.6 },
          { id: "zs-103", name: "儲物間", type: "service", bg: "#d9d9d9", fullName: "至聖樓一樓儲物間" },
          { id: "zs-104", name: "穿堂走道(1F)", type: "hollow", span: 0.7 }
        ]
      }
    },

    meiling: {
      buildingId: "meiling",
      buildingName: "美齡樓",
      layoutOrientation: "horizontal",
      floors: {
        "5F": [
          { id: "ml-500", name: "樓梯", type: "service", span: 0.6 },
          { id: "ml-501", name: "318", type: "class", grade: 3, fullName: "三年 18 班 (318)" },
          { id: "ml-502", name: "317", type: "class", grade: 3, fullName: "三年 17 班 (317)" },
          { id: "ml-503", name: "316", type: "class", grade: 3, fullName: "三年 16 班 (316)" },
          { id: "ml-504", name: "315", type: "class", grade: 3, fullName: "三年 15 班 (315)" },
          { id: "ml-505", name: "倉庫", type: "service", fullName: "美齡樓五樓倉庫" },
          { id: "ml-506", name: "314", type: "class", grade: 3, fullName: "三年 14 班 (314)" },
          { id: "ml-507", name: "313", type: "class", grade: 3, span: 1.5, fullName: "三年 13 班 (313)" },
          { id: "ml-508", name: "312", type: "class", grade: 3, fullName: "三年 12 班 (312)" },
          { id: "ml-509", name: "311", type: "class", grade: 3, fullName: "三年 11 班 (311)" }
        ],
        "4F": [
          { id: "ml-400", name: "樓梯", type: "service", span: 0.6 },
          { id: "ml-401", name: "303", type: "class", grade: 3, fullName: "三年 3 班 (303)" },
          { id: "ml-402", name: "304", type: "class", grade: 3, fullName: "三年 4 班 (304)" },
          { id: "ml-403", name: "306", type: "class", grade: 3, fullName: "三年 6 班 (306)" },
          { id: "ml-404", name: "307", type: "class", grade: 3, fullName: "三年 7 班 (307)" },
          { id: "ml-405", name: "國際課程辦公室", type: "office", fullName: "國際課程辦公室" },
          { id: "ml-406", name: "308", type: "class", grade: 3, fullName: "三年 8 班 (308)" },
          { id: "ml-407", name: "穿堂走道", type: "hollow", span: 0.8 },
          { id: "ml-408", name: "藝能科辦公室", type: "office", span: 0.8, fullName: "藝能科辦公室" },
          { id: "ml-409", name: "309", type: "class", grade: 3, fullName: "三年 9 班 (309)" },
          { id: "ml-410", name: "310", type: "class", grade: 3, fullName: "三年 10 班 (310)" }
        ],
        "3F": [
          { id: "ml-300", name: "樓梯", type: "service", span: 0.6 },
          { id: "ml-301", name: "305", type: "class", grade: 3, fullName: "三年 5 班 (305)" },
          { id: "ml-302", name: "302", type: "class", grade: 3, fullName: "三年 2 班 (302)" },
          { id: "ml-303", name: "301", type: "class", grade: 3, fullName: "三年 1 班 (301)" },
          { id: "ml-304", name: "202", type: "class", grade: 2, fullName: "二年 2 班 (202)" },
          { id: "ml-305", name: "多功能教室", type: "special", fullName: "多功能教室" },
          { id: "ml-306", name: "小組教室", type: "special", fullName: "小組教室" },
          { id: "ml-307", name: "穿堂走道", type: "hollow", span: 0.8 },
          { id: "ml-308", name: "教師會辦公室", type: "office", span: 0.8, fullName: "教師會辦公室" },
          { id: "ml-309", name: "320", type: "class", grade: 3, fullName: "三年 20 班 (320)" },
          { id: "ml-310", name: "201", type: "class", grade: 2, fullName: "二年 1 班 (201)" }
        ],
        "2F": [
          { id: "ml-200", name: "樓梯", type: "service", span: 0.6 },
          { id: "ml-201", name: "自然科辦公室", type: "office", span: 2.5, fullName: "自然科辦公室" },
          { id: "ml-202", name: "社會科辦公室", type: "office", span: 2, fullName: "社會科辦公室" },
          { id: "ml-203", name: "學習教室", type: "special", fullName: "學習教室" },
          { id: "ml-204", name: "學習中心", type: "special", fullName: "學習中心（資源教室）" },
          { id: "ml-205", name: "穿堂走道", type: "hollow", span: 0.8 },
          { id: "ml-206", name: "英文科辦公室", type: "office", span: 2.5, fullName: "英文科辦公室" }
        ],
        "1F": [
          { id: "ml-100", name: "樓梯", type: "service", span: 0.6 },
          { id: "ml-101", name: "生活科技教室(一)", type: "lab", span: 2.8, fullName: "生活科技教室（一）" },
          { id: "ml-102", name: "生活科技教室(二)", type: "lab", span: 2.2, fullName: "生活科技教室（二）" },
          { id: "ml-103", name: "重量訓練室", type: "special", span: 2.8, fullName: "重量訓練室" },
          { id: "ml-104", name: "烹飪教室", type: "lab", span: 2.2, fullName: "家政烹飪教室" }
        ],
        "B1": [
          { id: "ml-b01", name: "美齡地下防空室", type: "basement", span: 6, bg: "#e8eef5", fullName: "美齡樓地下防空避難室" }
        ]
      }
    },

    gezhi: {
      buildingId: "gezhi",
      buildingName: "格致樓",
      layoutOrientation: "vertical-columns",
      floors: {
        "5F": [
          { id: "gz-501", name: "地球科學專科教室", type: "lab", fullName: "地球科學專科教室" },
          { id: "gz-502", name: "電腦教室(三)", type: "lab", fullName: "電腦教室（三）" },
          { id: "gz-503", name: "素養學習教室", type: "special", fullName: "素養學習教室" },
          { id: "gz-504", name: "倉庫", type: "service", fullName: "格致樓五樓倉庫" },
          { id: "gz-505", name: "生物實驗室(二)", type: "lab", fullName: "生物實驗室（二）" },
          { id: "gz-506", name: "生物準備室", type: "lab", fullName: "生物準備室" },
          { id: "gz-507", name: "生物實驗室(一)", type: "lab", fullName: "生物實驗室（一）" },
          { id: "gz-508", name: "音樂教室(二)", type: "special", fullName: "音樂教室（二）" },
          { id: "gz-509", name: "倉庫(東)", type: "service", fullName: "格致樓五樓東側倉庫" }
        ],
        "4F": [
          { id: "gz-401", name: "未來教室", type: "special", fullName: "未來教室" },
          { id: "gz-402", name: "團輔室", type: "office", fullName: "團體輔導室" },
          { id: "gz-403", name: "設備組", type: "office", fullName: "教務處設備組" },
          { id: "gz-404", name: "廁所", type: "service" },
          { id: "gz-405", name: "物理實驗室(二)", type: "lab", fullName: "物理實驗室（二）" },
          { id: "gz-406", name: "物理準備室", type: "lab", fullName: "物理準備室" },
          { id: "gz-407", name: "物理實驗室(一)", type: "lab", fullName: "物理實驗室（一）" },
          { id: "gz-408", name: "音樂教室(一)", type: "special", fullName: "音樂教室（一）" },
          { id: "gz-409", name: "合作社儲區", type: "service", fullName: "合作社四樓空間" }
        ],
        "3F": [
          { id: "gz-301", name: "國文專科教室", type: "special", fullName: "國文專科教室" },
          { id: "gz-302", name: "輔導室辦公室、諮商室", type: "office", span: 1.5, fullName: "輔導室辦公室與諮商室" },
          { id: "gz-303", name: "廁所", type: "service" },
          { id: "gz-304", name: "化學實驗室(二)", type: "lab", fullName: "化學實驗室（二）" },
          { id: "gz-305", name: "化學準備室", type: "lab", fullName: "化學準備室" },
          { id: "gz-306", name: "化學實驗室(一)", type: "lab", fullName: "化學實驗室（一）" },
          { id: "gz-307", name: "跨域講堂", type: "special", fullName: "跨域講堂" },
          { id: "gz-308", name: "衛糾室", type: "special", fullName: "衛生糾察室（衛糾室）" }
        ],
        "2F": [
          { id: "gz-201", name: "國文科辦公室", type: "office", span: 1.5, fullName: "國文科辦公室" },
          { id: "gz-202", name: "會議室(二)", type: "office", fullName: "會議室（二）" },
          { id: "gz-203", name: "廁所", type: "service" },
          { id: "gz-204", name: "教務處", type: "office", fullName: "教務處" },
          { id: "gz-205", name: "印刷室、播音室", type: "office", fullName: "印刷室與播音室" },
          { id: "gz-206", name: "教官室", type: "office", fullName: "教官室" },
          { id: "gz-207", name: "學生事務處", type: "office", span: 1.5, fullName: "學生事務處（學務處）" }
        ],
        "1F": [
          { id: "gz-101", name: "原生種復育中心", type: "lab", fullName: "原生種復育中心" },
          { id: "gz-102", name: "消防間", type: "service", fullName: "消防間" },
          { id: "gz-103", name: "創課中心", type: "lab", fullName: "創課中心" },
          { id: "gz-104", name: "掃具間", type: "service", fullName: "掃具間" },
          { id: "gz-105", name: "團練室1~3", type: "special", fullName: "團練室 1、2、3" },
          { id: "gz-106", name: "合作社冰庫", type: "service", fullName: "合作社冰庫" },
          { id: "gz-107", name: "情境教室", type: "special", fullName: "情境教室" },
          { id: "gz-108", name: "合作社", type: "special", span: 1.5, fullName: "員生消費合作社" },
          { id: "gz-109", name: "糾察隊", type: "special", fullName: "糾察隊" }
        ],
        "B1": [
          { id: "gz-b01", name: "格致地下實驗儲藏室", type: "basement", span: 5, bg: "#e8eef5", fullName: "格致樓地下防空避難室" }
        ]
      }
    },

    chengzheng: {
      buildingId: "chengzheng",
      buildingName: "誠正樓",
      layoutOrientation: "horizontal",
      floors: {
        "5F": [
          { id: "cz-501", name: "106", type: "class", grade: 1, fullName: "一年 6 班 (106)" },
          { id: "cz-502", name: "105", type: "class", grade: 1, fullName: "一年 5 班 (105)" },
          { id: "cz-503", name: "104", type: "class", grade: 1, fullName: "一年 4 班 (104)" },
          { id: "cz-504", name: "103", type: "class", grade: 1, fullName: "一年 3 班 (103)" },
          { id: "cz-505", name: "樓梯", type: "service", span: 0.6 },
          { id: "cz-506", name: "男廁/空間", type: "service", span: 0.8 },
          { id: "cz-507", name: "102", type: "class", grade: 1, fullName: "一年 2 班 (102)" },
          { id: "cz-508", name: "101", type: "class", grade: 1, fullName: "一年 1 班 (101)" }
        ],
        "4F": [
          { id: "cz-401", name: "107", type: "class", grade: 1, fullName: "一年 7 班 (107)" },
          { id: "cz-402", name: "108", type: "class", grade: 1, fullName: "一年 8 班 (108)" },
          { id: "cz-403", name: "109", type: "class", grade: 1, fullName: "一年 9 班 (109)" },
          { id: "cz-404", name: "110", type: "class", grade: 1, fullName: "一年 10 班 (110)" },
          { id: "cz-405", name: "樓梯", type: "service", span: 0.6 },
          { id: "cz-406", name: "女廁/空間", type: "service", span: 0.8 },
          { id: "cz-407", name: "111", type: "class", grade: 1, fullName: "一年 11 班 (111)" },
          { id: "cz-408", name: "112", type: "class", grade: 1, fullName: "一年 12 班 (112)" }
        ],
        "3F": [
          { id: "cz-301", name: "119", type: "class", grade: 1, fullName: "一年 19 班 (119)" },
          { id: "cz-302", name: "118", type: "class", grade: 1, fullName: "一年 18 班 (118)" },
          { id: "cz-303", name: "117", type: "class", grade: 1, fullName: "一年 17 班 (117)" },
          { id: "cz-304", name: "116", type: "class", grade: 1, fullName: "一年 16 班 (116)" },
          { id: "cz-305", name: "樓梯", type: "service", span: 0.6 },
          { id: "cz-306", name: "男廁/空間", type: "service", span: 0.8 },
          { id: "cz-307", name: "114", type: "class", grade: 1, fullName: "一年 14 班 (114)" },
          { id: "cz-308", name: "113", type: "class", grade: 1, fullName: "一年 13 班 (113)" }
        ],
        "2F": [
          { id: "cz-201", name: "共學空間一", type: "special", fullName: "共學空間（一）" },
          { id: "cz-202", name: "共學空間二", type: "special", fullName: "共學空間（二）" },
          { id: "cz-203", name: "共學空間三", type: "special", fullName: "共學空間（三）" },
          { id: "cz-204", name: "共學空間四", type: "special", fullName: "共學空間（四）" },
          { id: "cz-205", name: "樓梯", type: "service", span: 0.6 },
          { id: "cz-206", name: "女廁/空間", type: "service", span: 0.8 },
          { id: "cz-207", name: "115", type: "class", grade: 1, fullName: "一年 15 班 (115)" },
          { id: "cz-208", name: "319", type: "class", grade: 3, fullName: "三年 19 班 (319)" }
        ],
        "1F": [
          { id: "cz-101", name: "生研社", type: "special", fullName: "生物研究社（生研社）" },
          { id: "cz-102", name: "地理專科教室", type: "lab", fullName: "地理專科教室" },
          { id: "cz-103", name: "史地準備室", type: "lab", fullName: "史地準備室" },
          { id: "cz-104", name: "智慧教室", type: "special", fullName: "智慧教室" },
          { id: "cz-105", name: "樓梯", type: "service", span: 0.6 },
          { id: "cz-106", name: "廁所", type: "service", span: 0.8 },
          { id: "cz-107", name: "AI教室", type: "lab", fullName: "AI 教室" },
          { id: "cz-108", name: "健康中心(AED)", type: "office", hasAED: true, fullName: "健康中心（設有 AED）" }
        ]
      }
    },

    zhuangjing: {
      buildingId: "zhuangjing",
      buildingName: "莊敬樓",
      layoutOrientation: "vertical-columns",
      floors: {
        "5F": [
          { id: "zj-501", name: "儲物間", type: "service", fullName: "莊敬樓五樓儲物間" },
          { id: "zj-502", name: "電腦教室(一)", type: "lab", fullName: "電腦教室（一）" },
          { id: "zj-503", name: "電腦教室(二)", type: "lab", fullName: "電腦教室（二）" }
        ],
        "4F": [
          { id: "zj-401", name: "儲物間", type: "service", fullName: "莊敬樓四樓儲物間" },
          { id: "zj-402", name: "視聽教室(一)", type: "special", span: 1.5, fullName: "視聽教室（一）" },
          { id: "zj-403", name: "視聽教室(二)", type: "special", span: 1.5, fullName: "視聽教室（二）" }
        ],
        "3F": [
          { id: "zj-301", name: "儲物間", type: "service", fullName: "莊敬樓三樓儲物間" },
          { id: "zj-302", name: "美術專科教室", type: "special", fullName: "美術專科教室" },
          { id: "zj-303", name: "英文專科教室", type: "special", fullName: "英文專科教室" },
          { id: "zj-304", name: "樓梯", type: "service", span: 0.6 }
        ],
        "2F": [
          { id: "zj-201", name: "哺乳室", type: "office", fullName: "哺乳室" },
          { id: "zj-202", name: "生物活體室", type: "lab", fullName: "生物活體室" },
          { id: "zj-203", name: "電腦教室(四)", type: "lab", fullName: "電腦教室（四）" }
        ],
        "1F": [
          { id: "zj-101", name: "儲物間", type: "service", fullName: "莊敬樓一樓儲物間" },
          { id: "zj-102", name: "國舞教室", type: "special", fullName: "國舞教室" },
          { id: "zj-103", name: "家政教室", type: "lab", fullName: "家政教室" }
        ]
      }
    },

    yide: {
      buildingId: "yide",
      buildingName: "藝德樓",
      layoutOrientation: "horizontal",
      floors: {
        "5F": [
          { id: "yd-501", name: "琴房501~511", type: "special", span: 2.2, fullName: "個人練習琴房 501～511" },
          { id: "yd-502", name: "廁所", type: "service", span: 0.6 },
          { id: "yd-503", name: "演藝廳", type: "special", span: 2.2, fullName: "藝德樓五樓演藝廳" },
          { id: "yd-504", name: "琴房512~521", type: "special", span: 2.2, fullName: "個人練習琴房 512～521" }
        ],
        "4F": [
          { id: "yd-401", name: "琴房401~410", type: "special", span: 1.6, fullName: "個人練習琴房 401～410" },
          { id: "yd-402", name: "音樂班辦公室", type: "office", fullName: "音樂班辦公室" },
          { id: "yd-403", name: "廁所", type: "service", span: 0.6 },
          { id: "yd-404", name: "合奏教室", type: "special", span: 2.0, fullName: "合奏教室" },
          { id: "yd-405", name: "音122", type: "class", grade: 1, fullName: "音樂班一年 22 班（音 122）" },
          { id: "yd-406", name: "音222", type: "class", grade: 2, fullName: "音樂班二年 22 班（音 222）" },
          { id: "yd-407", name: "音322", type: "class", grade: 3, fullName: "音樂班三年 22 班（音 322）" }
        ],
        "3F": [
          { id: "yd-301", name: "版畫教室", type: "special", fullName: "版畫教室" },
          { id: "yd-302", name: "美220", type: "class", grade: 2, fullName: "美術班二年 20 班（美 220）" },
          { id: "yd-303", name: "美術班辦公室", type: "office", fullName: "美術班辦公室" },
          { id: "yd-304", name: "電梯/廁所", type: "service", span: 0.8 },
          { id: "yd-305", name: "國畫書法教室", type: "special", fullName: "國畫書法教室" },
          { id: "yd-306", name: "數位攝影教室", type: "special", fullName: "數位攝影教室" },
          { id: "yd-307", name: "美120", type: "class", grade: 1, fullName: "美術班一年 20 班（美 120）" },
          { id: "yd-308", name: "素描水彩教室II", type: "special", span: 1.4, fullName: "素描水彩教室 II" },
          { id: "yd-309", name: "素描水彩教室III", type: "special", span: 1.4, fullName: "素描水彩教室 III" }
        ],
        "2F": [
          { id: "yd-201", name: "舞221", type: "class", grade: 2, fullName: "舞蹈班二年 21 班（舞 221）" },
          { id: "yd-202", name: "舞321", type: "class", grade: 3, fullName: "舞蹈班三年 21 班（舞 321）" },
          { id: "yd-203", name: "雙語跨域講堂", type: "special", fullName: "雙語跨域講堂" },
          { id: "yd-204", name: "廁所", type: "service", span: 0.6 },
          { id: "yd-205", name: "展覽室", type: "special", span: 2.0, fullName: "展覽室" },
          { id: "yd-206", name: "美術設計教室", type: "special", span: 1.4, fullName: "美術設計教室" },
          { id: "yd-207", name: "素描水彩教室I", type: "special", span: 1.4, fullName: "素描水彩教室 I" }
        ],
        "1F": [
          { id: "yd-101", name: "舞蹈教室I(現代舞)", type: "special", span: 2.6, fullName: "舞蹈教室 I（現代舞）" },
          { id: "yd-102", name: "廁所", type: "service", span: 0.6 },
          { id: "yd-103", name: "舞121", type: "class", grade: 1, fullName: "舞蹈班一年 21 班（舞 121）" },
          { id: "yd-104", name: "舞蹈班辦公室", type: "office", fullName: "舞蹈班辦公室" },
          { id: "yd-105", name: "舞蹈教室II(芭蕾)", type: "special", span: 2.8, fullName: "舞蹈教室 II（芭蕾）" }
        ],
        "B1": [
          { id: "yd-b01", name: "藝德地下樂器與畫材室", type: "basement", span: 4, bg: "#e8eef5", fullName: "藝德樓地下室" }
        ]
      }
    },

    library: {
      buildingId: "library",
      buildingName: "圖書館",
      layoutOrientation: "horizontal",
      floors: {
        "3F": [
          { id: "lib-301", name: "第一~四閱覽室", type: "special", span: 3, fullName: "第一至四閱覽室" }
        ],
        "2F": [
          { id: "lib-201", name: "討論教室", type: "special", span: 1, fullName: "討論教室" },
          { id: "lib-202", name: "書庫", type: "special", span: 2, fullName: "圖書館書庫" }
        ],
        "1F": [
          { id: "lib-101", name: "圖書館大廳", type: "hollow", span: 2, fullName: "圖書館一樓大廳" },
          { id: "lib-102", name: "辦公室", type: "office", span: 1, fullName: "圖書館辦公室" }
        ],
        "B1": [
          { id: "lib-b01", name: "密集書庫(B1)", type: "basement", span: 3, bg: "#e8eef5", fullName: "圖書館地下書庫" }
        ]
      }
    },

    activity_center: {
      buildingId: "activity_center",
      buildingName: "活動中心",
      layoutOrientation: "horizontal",
      floors: {
        "3F": [
          { id: "ac-301", name: "活動中心〈2.3F〉", type: "special", span: 4, fullName: "學生活動中心（2, 3F 禮堂與球場）" }
        ],
        "2F": [
          { id: "ac-201", name: "活動中心〈2.3F〉", type: "special", span: 4, fullName: "學生活動中心（2, 3F 禮堂與球場）" }
        ],
        "1F": [
          { id: "ac-101", name: "校史室", type: "special", span: 0.8, fullName: "校史室" },
          { id: "ac-102", name: "校友講堂1F / 中正廳", type: "special", span: 1.8, fullName: "校友講堂 1F 與中正廳" },
          { id: "ac-103", name: "電梯", type: "service", span: 0.5 },
          { id: "ac-104", name: "韻律教室", type: "special", span: 1.2, fullName: "韻律教室" }
        ],
        "B1": [
          { id: "ac-b01", name: "地下防空與社團空間", type: "basement", span: 4, bg: "#e8eef5", fullName: "活動中心地下室" }
        ]
      }
    },

    yingxi: {
      buildingId: "yingxi",
      buildingName: "迎曦樓（游泳池）",
      layoutOrientation: "horizontal",
      floors: {
        "5F": [
          { id: "yx-501", name: "機房", type: "service", span: 3, fullName: "迎曦樓五樓機房" },
          { id: "yx-502", name: "電梯", type: "service", span: 0.6 }
        ],
        "4F": [
          { id: "yx-401", name: "桌球場", type: "special", span: 3, fullName: "迎曦樓四樓桌球場" },
          { id: "yx-402", name: "電梯", type: "service", span: 0.6 }
        ],
        "3F": [
          { id: "yx-301", name: "擊劍武術場", type: "special", span: 3, fullName: "迎曦樓三樓擊劍武術場" },
          { id: "yx-302", name: "電梯", type: "service", span: 0.6 }
        ],
        "2F": [
          { id: "yx-201", name: "體育科辦公室", type: "office", span: 3, fullName: "體育科辦公室" },
          { id: "yx-202", name: "電梯", type: "service", span: 0.6 }
        ],
        "1F": [
          { id: "yx-101", name: "游泳池(AED)", type: "special", span: 3, hasAED: true, fullName: "迎曦樓一樓游泳池（設有 AED）" },
          { id: "yx-102", name: "電梯", type: "service", span: 0.6 }
        ]
      }
    },

    guardhouse: {
      buildingId: "guardhouse",
      buildingName: "警衛室",
      layoutOrientation: "horizontal",
      floors: {
        "1F": [
          { id: "gh-101", name: "警衛室(AED)", type: "office", span: 1, hasAED: true, fullName: "大門警衛室（設有急救 AED）" }
        ]
      }
    },

    command_platform: {
      buildingId: "command_platform",
      buildingName: "司令台",
      layoutOrientation: "horizontal",
      floors: {
        "1F": [
          { id: "cp-101", name: "司令台", type: "special", span: 1, fullName: "田徑場司令台" }
        ]
      }
    }
  }
};
