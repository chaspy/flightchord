import fs from 'fs';
import path from 'path';
import https from 'https';
import { parse } from 'csv-parse/sync';

interface OpenFlightsRoute {
  airline: string;
  airline_id: string;
  source_airport: string;
  source_airport_id: string;
  destination_airport: string;
  destination_airport_id: string;
  codeshare: string;
  stops: string;
  equipment: string;
}

interface FlightChordRoute {
  iata: string;
  freq_per_day: null;
  intl: boolean;
  sources: Array<{
    title: string;
    url: string;
  }>;
  lastChecked: string;
  note?: string;
}

interface AirportFile {
  airport: string;
  updatedAt: string;
  source?: Array<{
    url: string;
    lastChecked: string;
    description: string;
  }>;
  carriers: Record<string, { destinations: FlightChordRoute[] }>;
}

const OPENFLIGHTS_ROUTES_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat';
const AIRPORTS_DIR = path.join(process.cwd(), 'public/data/airports');
const TODAY = new Date().toISOString().split('T')[0];

// 真のグローバル対応：世界主要空港
const TARGET_AIRPORTS_AUTO = (() => {
  return new Set([
    // 東アジア
    'HND', 'NRT', 'KIX', 'ITM', 'NGO', 'FUK', 'CTS', 'OKA', // 日本
    'ICN', 'GMP', 'PUS', // 韓国
    'PEK', 'PVG', 'CAN', 'SZX', 'CTU', 'XIY', 'WUH', 'KMG', 'URC', // 中国
    'TPE', 'KHH', // 台湾
    'HKG', // 香港
    'MFM', // マカオ
    
    // 東南アジア
    'SIN', // シンガポール
    'KUL', 'JHB', // マレーシア
    'BKK', 'DMK', 'CNX', 'HKT', // タイ
    'SGN', 'HAN', 'DAD', // ベトナム
    'MNL', 'CEB', 'DVO', // フィリピン
    'CGK', 'DPS', 'SUB', 'MDC', 'BPN', // インドネシア
    'RGN', 'MDL', // ミャンマー
    'PNH', 'REP', // カンボジア
    'VTE', 'LPQ', // ラオス
    'BWN', // ブルネイ
    
    // 南アジア
    'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'AMD', 'COK', 'GOI', // インド
    'KHI', 'LHE', 'ISB', // パキスタン
    'DAC', 'CGP', // バングラデシュ
    'CMB', 'HRI', // スリランカ
    'KTM', // ネパール
    'PBH', // ブータン
    'MLE', // モルディブ
    
    // 中東
    'DXB', 'AUH', 'SHJ', // UAE
    'DOH', // カタール
    'RUH', 'JED', 'DMM', // サウジアラビア
    'KWI', // クウェート
    'BAH', // バーレーン
    'MCT', // オマーン
    'IKA', 'ISF', // イラン
    'BGW', 'BSR', // イラク
    'AMM', // ヨルダン
    'BEY', // レバノン
    'TLV', 'ETH', // イスラエル
    'IST', 'SAW', 'ADB', 'AYT', // トルコ
    'CAI', 'HRG', 'SSH', // エジプト
    
    // ヨーロッパ
    'LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA', // イギリス
    'FRA', 'MUC', 'DUS', 'BER', 'HAM', 'STR', 'CGN', // ドイツ
    'CDG', 'ORY', 'NCE', 'LYS', 'MRS', 'TLS', // フランス
    'FCO', 'MXP', 'VCE', 'NAP', 'PMO', 'BLQ', // イタリア
    'MAD', 'BCN', 'PMI', 'LPA', 'AGP', 'VLC', // スペイン
    'AMS', 'RTM', // オランダ
    'ZUR', 'GVA', 'BSL', // スイス
    'VIE', // オーストリア
    'BRU', // ベルギー
    'ARN', 'GOT', // スウェーデン
    'OSL', 'BGO', // ノルウェー
    'CPH', 'AAL', // デンマーク
    'HEL', // フィンランド
    'DUB', 'ORK', // アイルランド
    'LIS', 'OPO', // ポルトガル
    'ATH', 'SKG', // ギリシャ
    'WAW', 'KRK', 'GDN', // ポーランド
    'PRG', // チェコ
    'BUD', // ハンガリー
    'OTP', // ルーマニア
    'SOF', // ブルガリア
    'ZAG', // クロアチア
    'LJU', // スロベニア
    'BTS', // スロバキア
    'TLL', // エストニア
    'RIX', // ラトビア
    'VNO', // リトアニア
    'KEF', // アイスランド
    
    // 北米
    'ATL', 'LAX', 'ORD', 'DFW', 'DEN', 'JFK', 'SFO', 'SEA', 'LAS', 'MCO', 'EWR', 'CLT', 'PHX', 'IAH', 'MIA', 'BOS', 'MSP', 'FLL', 'DTW', 'PHL', 'LGA', 'BWI', 'SLC', 'DCA', 'MDW', 'TPA', 'PDX', 'STL', 'HNL', // アメリカ
    'YYZ', 'YVR', 'YUL', 'YYC', 'YEG', 'YOW', 'YHZ', 'YWG', // カナダ
    'MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'SJD', // メキシコ
    
    // 南米
    'GRU', 'CGH', 'GIG', 'BSB', 'CNF', 'REC', 'FOR', 'SSA', 'CWB', 'POA', // ブラジル
    'EZE', 'AEP', 'COR', 'MDZ', 'IGR', // アルゼンチン
    'SCL', 'IPC', // チリ
    'LIM', 'CUZ', 'AQP', // ペルー
    'BOG', 'MDE', 'CLO', 'CTG', 'BAQ', // コロンビア
    'CCS', 'MAR', // ベネズエラ
    'UIO', 'GYE', // エクアドル
    'VVI', 'LPB', 'CBB', // ボリビア
    'ASU', // パラグアイ
    'MVD', 'PDP', // ウルグアイ
    
    // アフリカ
    'JNB', 'CPT', 'DUR', 'PLZ', // 南アフリカ
    'CAI', 'HRG', 'SSH', 'LXR', // エジプト
    'LOS', 'ABV', 'KAN', // ナイジェリア
    'NBO', 'MBA', // ケニア
    'ADD', // エチオピア
    'DAR', 'JRO', 'ZNZ', // タンザニア
    'EBB', // ウガンダ
    'KGL', // ルワンダ
    'ACC', // ガーナ
    'ABJ', // コートジボワール
    'DKR', // セネガル
    'CMN', 'RAK', 'FEZ', // モロッコ
    'ALG', // アルジェリア
    'TUN', // チュニジア
    'TIP', // リビア
    
    // オセアニア
    'SYD', 'MEL', 'BNE', 'PER', 'ADL', 'GC', 'HBA', 'CNS', 'DRW', // オーストラリア
    'AKL', 'CHC', 'WLG', 'ZQN', // ニュージーランド
    'NAN', // フィジー
    'NOU', // ニューカレドニア
    'VLI', // バヌアツ
    
    // その他
    'SVO', 'DME', 'VKO', 'LED', 'SVX', 'OVB', 'KJA', 'ROV', // ロシア
    'ALA', 'NQZ', // カザフスタン
    'TAS', 'FRU', // 中央アジア
    'ULN', // モンゴル
    'TBS', 'KUT', // ジョージア・アルメニア
    'GYD' // アゼルバイジャン
  ]);
})();

// 主要航空会社のマッピング（IATA/ICAOから統一コードへ）
const AIRLINE_MAPPING: Record<string, string> = {
  'NH': 'NH', 'ANA': 'NH',
  'JL': 'JL', 'JAL': 'JL', 
  'BC': 'BC', 'SKY': 'BC',
  'GK': 'GK', 'JJP': 'GK',
  'MM': 'MM', 'APJ': 'MM',
  '7G': '7G', 'SFJ': '7G',
  '6J': '6J', 'SNJ': '6J',
  'NU': 'NU', 'JTA': 'NU',
  'RC': 'RC', 'JAC': 'RC',
  'OC': 'OC', 'RAC': 'OC',
  'LJ': 'LJ', 'JNA': 'LJ',
  'KE': 'KE', 'KAL': 'KE',
  'UA': 'UA', 'UAL': 'UA',
  'SQ': 'SQ', 'SIA': 'SQ'
};

class OpenFlightsBootstrap {
  
  private async downloadRoutes(): Promise<string> {
    console.log('📥 OpenFlights routes.dat をダウンロード中...');
    
    return new Promise((resolve, reject) => {
      let data = '';
      
      https.get(OPENFLIGHTS_ROUTES_URL, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTPエラー: ${response.statusCode}`));
          return;
        }

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          console.log(`✅ ダウンロード完了: ${Math.round(data.length / 1024)}KB`);
          resolve(data);
        });

        response.on('error', (error) => {
          reject(error);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseRoutes(data: string): OpenFlightsRoute[] {
    console.log('📊 Routes データを解析中...');
    
    try {
      // OpenFlightsはCSVではなくTSV（タブ区切り）形式だが、実際はカンマ区切り
      const lines = data.split('\n').filter(line => line.trim());
      const routes: OpenFlightsRoute[] = [];

      for (const line of lines) {
        const fields = line.split(',');
        if (fields.length >= 9) {
          routes.push({
            airline: fields[0]?.trim() || '',
            airline_id: fields[1]?.trim() || '',
            source_airport: fields[2]?.trim() || '',
            source_airport_id: fields[3]?.trim() || '',
            destination_airport: fields[4]?.trim() || '',
            destination_airport_id: fields[5]?.trim() || '',
            codeshare: fields[6]?.trim() || '',
            stops: fields[7]?.trim() || '',
            equipment: fields[8]?.trim() || ''
          });
        }
      }

      console.log(`✅ ${routes.length} 件のルートデータを解析`);
      return routes;
    } catch (error) {
      throw new Error(`Routes解析エラー: ${error}`);
    }
  }

  private filterTargetRoutes(routes: OpenFlightsRoute[]): OpenFlightsRoute[] {
    console.log('🌏 対象地域関連ルートを抽出中...');
    
    const targetRoutes = routes.filter(route => 
      TARGET_AIRPORTS_AUTO.has(route.source_airport) || 
      TARGET_AIRPORTS_AUTO.has(route.destination_airport)
    );

    console.log(`✅ ${targetRoutes.length} 件の対象地域関連ルートを抽出`);
    return targetRoutes;
  }

  private async loadExistingAirportFile(iata: string): Promise<AirportFile | null> {
    const filePath = path.join(AIRPORTS_DIR, `${iata}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ ${iata}.json 読み込みエラー:`, error);
      return null;
    }
  }

  private async bootstrapRoutes(routes: OpenFlightsRoute[]): Promise<void> {
    console.log('🔄 ルートデータをブートストラップ中...');

    const routesByAirport = new Map<string, Map<string, FlightChordRoute[]>>();
    let processedCount = 0;
    let addedCount = 0;

    // ルートをAirport別に整理
    for (const route of routes) {
      const sourceAirport = route.source_airport;
      const destAirport = route.destination_airport;
      const airline = AIRLINE_MAPPING[route.airline] || route.airline;

      // 対象地域の空港発のルートのみ処理
      if (!TARGET_AIRPORTS_AUTO.has(sourceAirport)) {
        continue;
      }

      processedCount++;

      if (!routesByAirport.has(sourceAirport)) {
        routesByAirport.set(sourceAirport, new Map());
      }

      const airportRoutes = routesByAirport.get(sourceAirport)!;
      if (!airportRoutes.has(airline)) {
        airportRoutes.set(airline, []);
      }

      // 国内線判定：同一国内の場合は国内線
      const isInternational = (() => {
        // 簡易的な国内線判定（必要に応じて拡充）
        const domesticPairs = [
          ['JP', ['HND', 'NRT', 'KIX', 'ITM', 'NGO', 'FUK', 'KKJ', 'CTS', 'OKA']],
          ['US', ['LAX', 'SFO', 'SEA', 'DEN', 'ORD', 'ATL', 'JFK', 'LGA', 'EWR', 'DFW']],
          ['AU', ['SYD', 'MEL', 'BNE', 'PER']],
          ['KR', ['ICN', 'GMP', 'PUS']]
        ];
        
        for (const [country, airports] of domesticPairs) {
          if (airports.includes(sourceAirport) && airports.includes(destAirport)) {
            return false; // 国内線
          }
        }
        return true; // 国際線
      })();
      
      const flightchordRoute: FlightChordRoute = {
        iata: destAirport,
        freq_per_day: null, // OpenFlightsには便数情報なし
        intl: isInternational,
        sources: [
          {
            title: 'OpenFlights Route Database',
            url: 'https://openflights.org/data.php'
          }
        ],
        lastChecked: TODAY,
        ...(route.codeshare === 'Y' && { note: 'コードシェア' }),
        ...(route.stops !== '0' && { note: `経由${route.stops}回` })
      };

      airportRoutes.get(airline)!.push(flightchordRoute);
      addedCount++;
    }

    // 各空港のファイルを更新または作成
    for (const [airportCode, airportRoutes] of routesByAirport) {
      let airportFile = await this.loadExistingAirportFile(airportCode);
      
      if (!airportFile) {
        // 新規空港ファイル作成
        airportFile = {
          airport: airportCode,
          updatedAt: TODAY,
          source: [
            {
              url: 'https://openflights.org/data.php',
              lastChecked: TODAY,
              description: 'OpenFlights Route Database (Historical)'
            }
          ],
          carriers: {}
        };
      }

      // ルートを統合（既存データは保持、OpenFlightsは初期データとして追加）
      for (const [airline, routes] of airportRoutes) {
        if (!airportFile.carriers[airline]) {
          airportFile.carriers[airline] = { destinations: [] };
        }

        // 既存ルートとの重複チェック（IATAコードベース）
        const existingDestinations = new Set(
          airportFile.carriers[airline].destinations.map(r => r.iata)
        );

        for (const route of routes) {
          if (!existingDestinations.has(route.iata)) {
            airportFile.carriers[airline].destinations.push(route);
          }
        }
      }

      // ファイル保存
      const filePath = path.join(AIRPORTS_DIR, `${airportCode}.json`);
      fs.writeFileSync(filePath, JSON.stringify(airportFile, null, 2) + '\n');
      console.log(`📝 更新: ${airportCode}.json (${airportRoutes.size}キャリア)`);
    }

    console.log(`✅ ブートストラップ完了:`);
    console.log(`   処理済みルート: ${processedCount} 件`);
    console.log(`   追加ルート: ${addedCount} 件`);
    console.log(`   更新空港: ${routesByAirport.size} 空港`);
  }

  private generateReport(routes: OpenFlightsRoute[], targetRoutes: OpenFlightsRoute[]): void {
    const reportPath = path.join(process.cwd(), 'docs/openflights-bootstrap-report.md');
    const now = new Date().toISOString().split('T')[0];
    
    let report = `# OpenFlights ブートストラップレポート - ${now}\n\n`;
    
    report += `## 概要\n\n`;
    report += `OpenFlightsの歴史的ルートデータ（2014年6月まで）を使用して、FlightChordのグローバル路線網をブートストラップしました。\n\n`;
    
    report += `## データ統計\n\n`;
    report += `- **全ルート数**: ${routes.length.toLocaleString()} 件\n`;
    report += `- **対象地域関連ルート**: ${targetRoutes.length.toLocaleString()} 件\n`;
    report += `- **ブートストラップ率**: ${((targetRoutes.length / routes.length) * 100).toFixed(2)}%\n\n`;

    // 航空会社別統計
    const airlineStats = new Map<string, number>();
    for (const route of targetRoutes) {
      const airline = AIRLINE_MAPPING[route.airline] || route.airline;
      airlineStats.set(airline, (airlineStats.get(airline) || 0) + 1);
    }

    report += `## 航空会社別ルート数\n\n`;
    const sortedAirlines = Array.from(airlineStats.entries()).sort((a, b) => b[1] - a[1]);
    for (const [airline, count] of sortedAirlines.slice(0, 20)) {
      report += `- **${airline}**: ${count} ルート\n`;
    }
    report += `\n`;

    report += `## 重要な注意事項\n\n`;
    report += `⚠️ **データの制限**:\n`;
    report += `- OpenFlightsデータは2014年6月で更新停止\n`;
    report += `- 歴史的データのため、現在運航していないルートが含まれる可能性\n`;
    report += `- 便数情報は含まれていない（\`freq_per_day: null\`）\n\n`;

    report += `## 次のステップ\n\n`;
    report += `1. **公式時刻表で検証**: 各航空会社の公式サイトでルート情報を確認\n`;
    report += `2. **運休ルートの除去**: 現在運航していないルートを特定・削除\n`;
    report += `3. **便数データ追加**: AeroDataBox等から便数情報を取得\n`;
    report += `4. **双方向整合性**: 欠けている逆方向ルートを補完\n\n`;

    report += `## ライセンス情報\n\n`;
    report += `- **データソース**: [OpenFlights](https://openflights.org/data.php)\n`;
    report += `- **ライセンス**: Open Database License (ODbL)\n`;
    report += `- **帰属表記**: このデータベースはOpenFlightsの一部を含んでいます\n`;
    report += `- **継承義務**: ODbLライセンスに従い、派生データも同ライセンスで公開\n\n`;

    report += `---\n`;
    report += `*Generated on ${new Date().toISOString()}*\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`📋 レポート作成: ${reportPath}`);
  }

  async bootstrap(): Promise<void> {
    try {
      console.log('🚀 OpenFlights ルートデータ ブートストラップ開始\n');

      // OpenFlightsルートデータをダウンロード
      const routesData = await this.downloadRoutes();
      const routes = this.parseRoutes(routesData);
      const targetRoutes = this.filterTargetRoutes(routes);

      // ルートをブートストラップ
      await this.bootstrapRoutes(targetRoutes);

      // レポート生成
      this.generateReport(routes, targetRoutes);

      console.log('\n🎉 OpenFlights ブートストラップ完了！');
      console.log('\n📝 次のステップ:');
      console.log('1. レポート確認: docs/openflights-bootstrap-report.md');
      console.log('2. データ検証: pnpm run validate-data');
      console.log('3. 公式時刻表での検証開始');
      console.log('4. コミット: git add . && git commit');

    } catch (error) {
      console.error('\n❌ ブートストラップエラー:', error);
      throw error;
    }
  }
}

// Script execution
new OpenFlightsBootstrap().bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});