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
  region: 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kansai' | 'chugoku' | 'shikoku' | 'kyushu' | 'okinawa';
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

  // 未実装（正直な表示）
  // 実際には100以上の空港が存在するが、現在は上記のみ実装
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