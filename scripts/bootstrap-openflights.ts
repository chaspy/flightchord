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

// 日本の空港IATAコード（国内・国際問わず）
const JAPANESE_AIRPORTS = new Set([
  'HND', 'NRT', 'KIX', 'ITM', 'NGO', 'FUK', 'KKJ', 'UBJ', 'CTS', 'OKA', 
  'SDJ', 'KMJ', 'MYJ', 'ISG', 'MMJ', 'IBR', 'SHM', 'UKB', 'TJH', 'OBO',
  'HKD', 'KUH', 'MMB', 'SHB', 'OKD', 'RBJ', 'WKJ', 'AXJ', 'IKI', 'TSJ',
  'MBE', 'AKJ', 'OIR', 'RIS', 'KUM', 'FUJ', 'TNE', 'KOJ', 'KMI', 'OIT',
  'HSG', 'NGS', 'ASJ', 'OKE', 'KKX', 'TKN', 'NKM', 'FKJ', 'QGU', 'KMQ',
  'OKI', 'FSZ', 'TOY', 'NTQ', 'HIJ', 'OKJ', 'IZO', 'YGJ', 'IWK', 'KCZ',
  'TTJ', 'TKS', 'TAK', 'IWJ', 'AOJ', 'GAJ', 'SDS', 'FKS', 'HHE', 'HNA',
  'AXT', 'MSJ', 'KIJ', 'ONJ', 'SYO', 'HAC', 'OIM', 'MYE', 'DNA', 'UEO',
  'KJP', 'MMD', 'MMY', 'AGJ', 'IEJ', 'HTR', 'KTD', 'SHI', 'TRA', 'RNJ', 'OGN'
]);

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

  private filterJapaneseRoutes(routes: OpenFlightsRoute[]): OpenFlightsRoute[] {
    console.log('🇯🇵 日本関連ルートを抽出中...');
    
    const japaneseRoutes = routes.filter(route => 
      JAPANESE_AIRPORTS.has(route.source_airport) || 
      JAPANESE_AIRPORTS.has(route.destination_airport)
    );

    console.log(`✅ ${japaneseRoutes.length} 件の日本関連ルートを抽出`);
    return japaneseRoutes;
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

      // 日本の空港発のルートのみ処理
      if (!JAPANESE_AIRPORTS.has(sourceAirport)) {
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

      const flightchordRoute: FlightChordRoute = {
        iata: destAirport,
        freq_per_day: null, // OpenFlightsには便数情報なし
        intl: !JAPANESE_AIRPORTS.has(destAirport), // 日本の空港以外は国際線
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

  private generateReport(routes: OpenFlightsRoute[], japaneseRoutes: OpenFlightsRoute[]): void {
    const reportPath = path.join(process.cwd(), 'docs/openflights-bootstrap-report.md');
    const now = new Date().toISOString().split('T')[0];
    
    let report = `# OpenFlights ブートストラップレポート - ${now}\n\n`;
    
    report += `## 概要\n\n`;
    report += `OpenFlightsの歴史的ルートデータ（2014年6月まで）を使用して、FlightChordの初期路線網をブートストラップしました。\n\n`;
    
    report += `## データ統計\n\n`;
    report += `- **全ルート数**: ${routes.length.toLocaleString()} 件\n`;
    report += `- **日本関連ルート**: ${japaneseRoutes.length.toLocaleString()} 件\n`;
    report += `- **ブートストラップ率**: ${((japaneseRoutes.length / routes.length) * 100).toFixed(2)}%\n\n`;

    // 航空会社別統計
    const airlineStats = new Map<string, number>();
    for (const route of japaneseRoutes) {
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
      const japaneseRoutes = this.filterJapaneseRoutes(routes);

      // ルートをブートストラップ
      await this.bootstrapRoutes(japaneseRoutes);

      // レポート生成
      this.generateReport(routes, japaneseRoutes);

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