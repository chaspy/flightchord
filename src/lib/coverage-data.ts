// 日本国内航空会社・空港の完全リスト（カバー率計算用）

export type AirlineStatus = 'implemented' | 'planned' | 'not_planned';
export type AirportStatus = 'implemented' | 'planned' | 'not_planned';

export interface AirlineInfo {
  iata?: string;
  icao?: string;
  name: string;
  nameEn: string;
  status: AirlineStatus;
  type: 'major' | 'lcc' | 'regional' | 'commuter';
  base?: string;
}

export interface AirportInfo {
  iata: string;
  icao?: string;
  name: string;
  nameEn: string;
  status: AirportStatus;
  region: 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kansai' | 'chugoku' | 'shikoku' | 'kyushu' | 'okinawa' | 'international';
  type: 'major' | 'regional' | 'local';
}

// 日本国内全航空会社リスト
export const ALL_AIRLINES: Record<string, AirlineInfo> = {
  // 大手キャリア
  NH: {
    iata: 'NH', icao: 'ANA', name: '全日本空輸', nameEn: 'All Nippon Airways',
    status: 'implemented', type: 'major', base: 'HND'
  },
  JL: {
    iata: 'JL', icao: 'JAL', name: '日本航空', nameEn: 'Japan Airlines',
    status: 'implemented', type: 'major', base: 'HND'
  },

  // LCC
  GK: {
    iata: 'GK', icao: 'JJP', name: 'ジェットスター・ジャパン', nameEn: 'Jetstar Japan',
    status: 'implemented', type: 'lcc', base: 'NRT'
  },
  MM: {
    iata: 'MM', icao: 'APJ', name: 'ピーチ・アビエーション', nameEn: 'Peach Aviation',
    status: 'implemented', type: 'lcc', base: 'KIX'
  },
  '9C': {
    iata: '9C', icao: 'SJO', name: '春秋航空日本', nameEn: 'Spring Airlines Japan',
    status: 'planned', type: 'lcc', base: 'NRT'
  },

  // 地方・リージョナル
  BC: {
    iata: 'BC', icao: 'SKY', name: 'スカイマーク', nameEn: 'Skymark Airlines',
    status: 'implemented', type: 'regional', base: 'HND'
  },
  '7G': {
    iata: '7G', icao: 'SFJ', name: 'スターフライヤー', nameEn: 'StarFlyer',
    status: 'implemented', type: 'regional', base: 'KKJ'
  },
  '6J': {
    iata: '6J', icao: 'SNJ', name: 'ソラシドエア', nameEn: 'Solaseed Air',
    status: 'implemented', type: 'regional', base: 'MYJ'
  },
  NU: {
    iata: 'NU', icao: 'JTA', name: '日本トランスオーシャン航空', nameEn: 'Japan Transocean Air',
    status: 'implemented', type: 'regional', base: 'OKA'
  },
  RC: {
    iata: 'RC', icao: 'JAC', name: '日本エアコミューター', nameEn: 'Japan Air Commuter',
    status: 'implemented', type: 'commuter', base: 'KOJ'
  },
  OC: {
    iata: 'OC', icao: 'RAC', name: '琉球エアーコミューター', nameEn: 'Ryukyu Air Commuter',
    status: 'implemented', type: 'commuter', base: 'OKA'
  },
  FW: {
    iata: 'FW', name: 'フェアリンク', nameEn: 'FAIR',
    status: 'not_planned', type: 'commuter'
  },

  // 国際キャリア（日本路線運航）
  SQ: {
    iata: 'SQ', icao: 'SIA', name: 'シンガポール航空', nameEn: 'Singapore Airlines',
    status: 'implemented', type: 'major'
  },
  KE: {
    iata: 'KE', icao: 'KAL', name: '大韓航空', nameEn: 'Korean Air',
    status: 'implemented', type: 'major'
  },
  UA: {
    iata: 'UA', icao: 'UAL', name: 'ユナイテッド航空', nameEn: 'United Airlines',
    status: 'implemented', type: 'major'
  },
  LJ: {
    iata: 'LJ', icao: 'JNA', name: 'ジンエアー', nameEn: 'Jin Air',
    status: 'implemented', type: 'lcc'
  }
};

// 実際に実装済みの空港のみ（虚偽カバレッジを廃止）
export const ALL_AIRPORTS: Record<string, AirportInfo> = {
  // 実装済み（データファイル存在確認済み）
  HND: {
    iata: 'HND', icao: 'RJTT', name: '東京国際空港（羽田）', nameEn: 'Tokyo Haneda',
    status: 'implemented', region: 'kanto', type: 'major'
  },
  NRT: {
    iata: 'NRT', icao: 'RJAA', name: '成田国際空港', nameEn: 'Narita International',
    status: 'implemented', region: 'kanto', type: 'major'
  },
  KIX: {
    iata: 'KIX', icao: 'RJBB', name: '関西国際空港', nameEn: 'Kansai International',
    status: 'implemented', region: 'kansai', type: 'major'
  },
  ITM: {
    iata: 'ITM', icao: 'RJOO', name: '大阪国際空港（伊丹）', nameEn: 'Osaka International (Itami)',
    status: 'implemented', region: 'kansai', type: 'major'
  },
  NGO: {
    iata: 'NGO', icao: 'RJGG', name: '中部国際空港', nameEn: 'Chubu Centrair International',
    status: 'implemented', region: 'chubu', type: 'major'
  },
  FUK: {
    iata: 'FUK', icao: 'RJFF', name: '福岡空港', nameEn: 'Fukuoka Airport',
    status: 'implemented', region: 'kyushu', type: 'major'
  },
  KKJ: {
    iata: 'KKJ', icao: 'RJFR', name: '北九州空港', nameEn: 'Kitakyushu Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  CTS: {
    iata: 'CTS', icao: 'RJCC', name: '新千歳空港', nameEn: 'New Chitose',
    status: 'implemented', region: 'hokkaido', type: 'major'
  },
  OKA: {
    iata: 'OKA', icao: 'ROAH', name: '那覇空港', nameEn: 'Naha Airport',
    status: 'implemented', region: 'okinawa', type: 'major'
  },
  SDJ: {
    iata: 'SDJ', icao: 'RJSS', name: '仙台空港', nameEn: 'Sendai Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  KMJ: {
    iata: 'KMJ', icao: 'RJFT', name: '熊本空港', nameEn: 'Kumamoto Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  MYJ: {
    iata: 'MYJ', icao: 'RJFM', name: '宮古空港', nameEn: 'Miyako Airport',
    status: 'implemented', region: 'okinawa', type: 'regional'
  },
  ISG: {
    iata: 'ISG', icao: 'ROIG', name: '石垣空港', nameEn: 'Ishigaki Airport',
    status: 'implemented', region: 'okinawa', type: 'regional'
  },

  // 国際空港（参考）
  SIN: {
    iata: 'SIN', icao: 'WSSS', name: 'チャンギ国際空港', nameEn: 'Singapore Changi',
    status: 'implemented', region: 'international', type: 'major'
  },
  ICN: {
    iata: 'ICN', icao: 'RKSI', name: '仁川国際空港', nameEn: 'Seoul Incheon',
    status: 'implemented', region: 'international', type: 'major'
  },
  LAX: {
    iata: 'LAX', icao: 'KLAX', name: 'ロサンゼルス国際空港', nameEn: 'Los Angeles International',
    status: 'implemented', region: 'international', type: 'major'
  },

  UBJ: {
    iata: 'UBJ', icao: 'RJDC', name: '山口宇部空港', nameEn: 'Yamaguchi Ube Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },

  // OpenFlightsブートストラップで追加された空港
  // 北海道
  HKD: {
    iata: 'HKD', name: '函館空港', nameEn: 'Hakodate Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },
  KUH: {
    iata: 'KUH', name: '釧路空港', nameEn: 'Kushiro Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },
  MMB: {
    iata: 'MMB', name: '女満別空港', nameEn: 'Memanbetsu Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },
  SHB: {
    iata: 'SHB', name: '中標津空港', nameEn: 'Nakashibetsu Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },
  OBO: {
    iata: 'OBO', name: '帯広空港', nameEn: 'Tokachi-Obihiro Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },
  AKJ: {
    iata: 'AKJ', name: '旭川空港', nameEn: 'Asahikawa Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },
  MBE: {
    iata: 'MBE', name: '紋別空港', nameEn: 'Monbetsu Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },
  WKJ: {
    iata: 'WKJ', name: '稚内空港', nameEn: 'Wakkanai Airport',
    status: 'implemented', region: 'hokkaido', type: 'regional'
  },

  // 東北
  AOJ: {
    iata: 'AOJ', name: '青森空港', nameEn: 'Aomori Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  AXT: {
    iata: 'AXT', name: '秋田空港', nameEn: 'Akita Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  GAJ: {
    iata: 'GAJ', name: '山形空港', nameEn: 'Yamagata Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  HNA: {
    iata: 'HNA', name: '花巻空港', nameEn: 'Iwate Hanamaki Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  FKS: {
    iata: 'FKS', name: '福島空港', nameEn: 'Fukushima Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  MSJ: {
    iata: 'MSJ', name: '三沢空港', nameEn: 'Misawa Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  SYO: {
    iata: 'SYO', name: '庄内空港', nameEn: 'Shonai Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },
  ONJ: {
    iata: 'ONJ', name: '大館能代空港', nameEn: 'Odate Noshiro Airport',
    status: 'implemented', region: 'tohoku', type: 'regional'
  },

  // 関東
  IBR: {
    iata: 'IBR', name: '茨城空港', nameEn: 'Ibaraki Airport',
    status: 'implemented', region: 'kanto', type: 'regional'
  },
  HAC: {
    iata: 'HAC', name: '八丈島空港', nameEn: 'Hachijojima Airport',
    status: 'implemented', region: 'kanto', type: 'regional'
  },
  OIM: {
    iata: 'OIM', name: '大島空港', nameEn: 'Oshima Airport',
    status: 'implemented', region: 'kanto', type: 'regional'
  },

  // 中部
  MMJ: {
    iata: 'MMJ', name: '松本空港', nameEn: 'Shinshu-Matsumoto Airport',
    status: 'implemented', region: 'chubu', type: 'regional'
  },
  TOY: {
    iata: 'TOY', name: '富山空港', nameEn: 'Toyama Airport',
    status: 'implemented', region: 'chubu', type: 'regional'
  },
  KMQ: {
    iata: 'KMQ', name: '小松空港', nameEn: 'Komatsu Airport',
    status: 'implemented', region: 'chubu', type: 'regional'
  },
  FSZ: {
    iata: 'FSZ', name: '静岡空港', nameEn: 'Mount Fuji Shizuoka Airport',
    status: 'implemented', region: 'chubu', type: 'regional'
  },
  KIJ: {
    iata: 'KIJ', name: '新潟空港', nameEn: 'Niigata Airport',
    status: 'implemented', region: 'chubu', type: 'regional'
  },
  NTQ: {
    iata: 'NTQ', name: '能登空港', nameEn: 'Noto Satoyama Airport',
    status: 'implemented', region: 'chubu', type: 'regional'
  },
  NKM: {
    iata: 'NKM', name: '名古屋空港', nameEn: 'Nagoya Airport',
    status: 'implemented', region: 'chubu', type: 'regional'
  },

  // 関西
  UKB: {
    iata: 'UKB', name: '神戸空港', nameEn: 'Kobe Airport',
    status: 'implemented', region: 'kansai', type: 'regional'
  },
  SHM: {
    iata: 'SHM', name: '白浜空港', nameEn: 'Nanki Shirahama Airport',
    status: 'implemented', region: 'kansai', type: 'regional'
  },

  // 中国・四国
  HIJ: {
    iata: 'HIJ', name: '広島空港', nameEn: 'Hiroshima Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },
  OKJ: {
    iata: 'OKJ', name: '岡山空港', nameEn: 'Okayama Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },
  YGJ: {
    iata: 'YGJ', name: '米子空港', nameEn: 'Yonago Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },
  IZO: {
    iata: 'IZO', name: '出雲空港', nameEn: 'Izumo Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },
  IWJ: {
    iata: 'IWJ', name: '岩国空港', nameEn: 'Iwami Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },
  IWK: {
    iata: 'IWK', name: '岩国錦帯橋空港', nameEn: 'Iwakuni Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },
  TTJ: {
    iata: 'TTJ', name: '鳥取空港', nameEn: 'Tottori Airport',
    status: 'implemented', region: 'chugoku', type: 'regional'
  },
  TAK: {
    iata: 'TAK', name: '高松空港', nameEn: 'Takamatsu Airport',
    status: 'implemented', region: 'shikoku', type: 'regional'
  },
  TKS: {
    iata: 'TKS', name: '徳島空港', nameEn: 'Tokushima Airport',
    status: 'implemented', region: 'shikoku', type: 'regional'
  },
  KCZ: {
    iata: 'KCZ', name: '高知空港', nameEn: 'Kochi Airport',
    status: 'implemented', region: 'shikoku', type: 'regional'
  },

  // 九州
  HSG: {
    iata: 'HSG', name: '佐賀空港', nameEn: 'Saga Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  NGS: {
    iata: 'NGS', name: '長崎空港', nameEn: 'Nagasaki Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  KOJ: {
    iata: 'KOJ', name: '鹿児島空港', nameEn: 'Kagoshima Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  KMI: {
    iata: 'KMI', name: '宮崎空港', nameEn: 'Miyazaki Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  OIT: {
    iata: 'OIT', name: '大分空港', nameEn: 'Oita Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  FUJ: {
    iata: 'FUJ', name: '五島福江空港', nameEn: 'Fukue Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  IKI: {
    iata: 'IKI', name: '壱岐空港', nameEn: 'Iki Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  TSJ: {
    iata: 'TSJ', name: '対馬空港', nameEn: 'Tsushima Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },
  ASJ: {
    iata: 'ASJ', name: '奄美空港', nameEn: 'Amami Airport',
    status: 'implemented', region: 'kyushu', type: 'regional'
  },

  // 沖縄
  MMY: {
    iata: 'MMY', name: '宮古空港', nameEn: 'Miyako Airport',
    status: 'implemented', region: 'okinawa', type: 'regional'
  },
  UEO: {
    iata: 'UEO', name: '久米島空港', nameEn: 'Kumejima Airport',
    status: 'implemented', region: 'okinawa', type: 'regional'
  }
};

// カバー率計算ユーティリティ
export function calculateCoverage() {
  const airlines = Object.values(ALL_AIRLINES);
  const airports = Object.values(ALL_AIRPORTS);

  const airlinesImplemented = airlines.filter(a => a.status === 'implemented').length;
  const airlinesCoverage = Math.round((airlinesImplemented / airlines.length) * 100);

  const airportsImplemented = airports.filter(a => a.status === 'implemented').length;
  const airportsCoverage = Math.round((airportsImplemented / airports.length) * 100);

  return {
    airlines: {
      implemented: airlinesImplemented,
      total: airlines.length,
      coverage: airlinesCoverage,
      planned: airlines.filter(a => a.status === 'planned').length
    },
    airports: {
      implemented: airportsImplemented,
      total: airports.length,
      coverage: airportsCoverage,
      planned: airports.filter(a => a.status === 'planned').length
    }
  };
}