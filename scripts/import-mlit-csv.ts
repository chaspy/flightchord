#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface MLITRouteRecord {
  year: string;
  month: string;
  airline: string;
  route_from: string;
  route_to: string;
  passengers: string;
  cargo: string;
  mail: string;
}

interface AirportFile {
  airport: string;
  updatedAt: string;
  source?: Array<{
    url: string;
    lastChecked: string;
    description: string;
  }>;
  carriers: Record<string, { 
    destinations: Array<{ 
      iata: string; 
      intl: boolean;
      sources?: Array<{ title: string; url: string }>;
      lastChecked?: string;
      note?: string;
      verified?: boolean;
      passengers_monthly?: number;
    }> 
  }>;
}

class MLITCSVImporter {
  private readonly AIRPORTS_DIR = path.join(process.cwd(), 'public/data/airports');
  private readonly TODAY = new Date().toISOString().split('T')[0];
  
  // 国土交通省の空港名からIATAコードへのマッピング
  private readonly AIRPORT_NAME_TO_IATA: Record<string, string> = {
    '東京(羽田)': 'HND',
    '羽田': 'HND',
    '東京国際': 'HND',
    '成田国際': 'NRT',
    '成田': 'NRT',
    '関西国際': 'KIX',
    '関西': 'KIX',
    '大阪国際': 'ITM',
    '伊丹': 'ITM',
    '中部国際': 'NGO',
    '中部': 'NGO',
    '福岡': 'FUK',
    '新千歳': 'CTS',
    '千歳': 'CTS',
    '那覇': 'OKA',
    '鹿児島': 'KOJ',
    '宮崎': 'KMI',
    '大分': 'OIT',
    '熊本': 'KMJ',
    '長崎': 'NGS',
    '佐賀': 'HSG',
    '広島': 'HIJ',
    '岡山': 'OKJ',
    '高松': 'TAK',
    '徳島': 'TKS',
    '高知': 'KCZ',
    '松山': 'MYJ',
    '小松': 'KMQ',
    '富山': 'TOY',
    '静岡': 'FSZ',
    '新潟': 'KIJ',
    '仙台': 'SDJ',
    '秋田': 'AXT',
    '青森': 'AOJ',
    '山形': 'GAJ',
    '花巻': 'HNA',
    '福島': 'FKS',
    '旭川': 'AKJ',
    '函館': 'HKD',
    '釧路': 'KUH',
    '女満別': 'MMB',
    '石垣': 'ISG',
    '宮古': 'MYJ',
    '北九州': 'KKJ',
    '山口宇部': 'UBJ',
    '出雲': 'IZO',
    '米子': 'YGJ',
    '神戸': 'UKB',
    '茨城': 'IBR',
    '松本': 'MMJ',
    '能登': 'NTQ',
    '帯広': 'OBO',
    '稚内': 'WKJ',
    '紋別': 'MBE',
    '中標津': 'SHB',
    '奄美': 'ASJ',
    '南紀白浜': 'SHM',
    '但馬': 'TJH',
    '対馬': 'TSJ',
    '五島福江': 'FUJ',
    '壱岐': 'IKI',
    '種子島': 'TNE',
    '屋久島': 'KUM',
    '与論': 'RNJ',
    '沖永良部': 'OKE',
    '久米島': 'UEO',
    '南大東': 'MMD',
    '北大東': 'KTD',
    '与那国': 'OGN',
    // 必要に応じて追加
  };

  // 航空会社名からIATAコードへのマッピング
  private readonly AIRLINE_NAME_TO_IATA: Record<string, string> = {
    '日本航空': 'JL',
    'JAL': 'JL',
    '全日本空輸': 'NH',
    'ANA': 'NH',
    '全日空': 'NH',
    'スカイマーク': 'BC',
    'ピーチ・アビエーション': 'MM',
    'ピーチ': 'MM',
    'ジェットスター・ジャパン': 'GK',
    'ジェットスター': 'GK',
    'スターフライヤー': '7G',
    'ソラシドエア': '6J',
    '日本トランスオーシャン航空': 'NU',
    'JTA': 'NU',
    '日本エアコミューター': 'RC',
    'JAC': 'RC',
    '琉球エアーコミューター': 'OC',
    'RAC': 'OC',
    'エアドゥ': 'HD',
    'AIRDO': 'HD',
    'IBEXエアラインズ': 'FW',
    'フジドリームエアラインズ': 'JH',
    'FDA': 'JH',
    '春秋航空日本': '9C',
    // 必要に応じて追加
  };

  /**
   * CSVファイルを解析
   */
  private parseCSV(csvPath: string): MLITRouteRecord[] {
    console.log(`📂 CSVファイルを読み込み中: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSVファイルが見つかりません: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // BOMを除去
    const contentWithoutBOM = csvContent.replace(/^\uFEFF/, '');
    
    try {
      const records = parse(contentWithoutBOM, {
        columns: true,
        skip_empty_lines: true,
        encoding: 'utf8',
        relax_column_count: true
      });

      console.log(`✅ ${records.length}件のレコードを解析`);
      return records;
    } catch (error) {
      console.error('❌ CSV解析エラー:', error);
      throw error;
    }
  }

  /**
   * 空港名をIATAコードに変換
   */
  private convertToIATA(airportName: string): string | null {
    // 正規化（空白除去、カッコ統一）
    const normalized = airportName
      .trim()
      .replace(/\s+/g, '')
      .replace(/（/g, '(')
      .replace(/）/g, ')');
    
    // マッピングから検索
    for (const [key, value] of Object.entries(this.AIRPORT_NAME_TO_IATA)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    console.warn(`⚠️  空港名をIATAコードに変換できません: ${airportName}`);
    return null;
  }

  /**
   * 航空会社名をIATAコードに変換
   */
  private convertAirlineToIATA(airlineName: string): string | null {
    const normalized = airlineName.trim();
    
    for (const [key, value] of Object.entries(this.AIRLINE_NAME_TO_IATA)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    console.warn(`⚠️  航空会社名をIATAコードに変換できません: ${airlineName}`);
    return null;
  }

  /**
   * MLITデータでルートを検証・更新
   */
  async importAndVerify(csvPath: string): Promise<void> {
    console.log('🚀 国土交通省CSVデータのインポート開始\n');
    
    // CSVを解析
    const records = this.parseCSV(csvPath);
    
    // 路線ごとに集計
    const routeStats = new Map<string, { passengers: number; verified: boolean }>();
    const verifiedRoutes = new Set<string>();
    const newRoutes = new Set<string>();
    
    for (const record of records) {
      const fromIATA = this.convertToIATA(record.route_from);
      const toIATA = this.convertToIATA(record.route_to);
      const airlineIATA = this.convertAirlineToIATA(record.airline);
      
      if (!fromIATA || !toIATA) continue;
      
      const routeKey = `${fromIATA}-${toIATA}`;
      const passengers = parseInt(record.passengers) || 0;
      
      // 路線統計を更新
      if (!routeStats.has(routeKey)) {
        routeStats.set(routeKey, { passengers: 0, verified: true });
      }
      const stats = routeStats.get(routeKey)!;
      stats.passengers += passengers;
      
      verifiedRoutes.add(routeKey);
      
      // 空港ファイルを更新
      await this.updateAirportFile(fromIATA, toIATA, airlineIATA, passengers);
    }
    
    // 検証結果をマーク
    await this.markVerifiedRoutes(verifiedRoutes);
    
    // レポート生成
    this.generateImportReport(routeStats, verifiedRoutes, newRoutes);
    
    console.log('\n✅ CSVインポート完了！');
    console.log(`   検証済み路線: ${verifiedRoutes.size}件`);
    console.log(`   新規路線: ${newRoutes.size}件`);
  }

  /**
   * 空港ファイルを更新
   */
  private async updateAirportFile(
    from: string, 
    to: string, 
    airline: string | null,
    passengers: number
  ): Promise<void> {
    const filePath = path.join(this.AIRPORTS_DIR, `${from}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`📝 新規空港ファイル作成: ${from}.json`);
      // 新規作成が必要な場合の処理
      return;
    }
    
    try {
      const airportData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AirportFile;
      
      // 航空会社が特定できた場合
      if (airline && airportData.carriers[airline]) {
        const destinations = airportData.carriers[airline].destinations;
        const destIndex = destinations.findIndex(d => d.iata === to);
        
        if (destIndex >= 0) {
          // 既存路線を更新
          destinations[destIndex].verified = true;
          destinations[destIndex].passengers_monthly = passengers;
          destinations[destIndex].lastChecked = this.TODAY;
          
          if (!destinations[destIndex].sources) {
            destinations[destIndex].sources = [];
          }
          
          // 国土交通省ソースを追加
          const mlitSource = {
            title: '国土交通省 航空輸送統計',
            url: 'https://www.mlit.go.jp/k-toukei/'
          };
          
          if (!destinations[destIndex].sources.some(s => s.title === mlitSource.title)) {
            destinations[destIndex].sources.push(mlitSource);
          }
        }
      }
      
      // ファイル保存
      fs.writeFileSync(filePath, JSON.stringify(airportData, null, 2) + '\n');
      
    } catch (error) {
      console.error(`❌ ${from}.json 更新エラー:`, error);
    }
  }

  /**
   * 検証済み路線をマーク
   */
  private async markVerifiedRoutes(verifiedRoutes: Set<string>): Promise<void> {
    console.log('✅ 検証済み路線をマーク中...');
    
    const airportFiles = fs.readdirSync(this.AIRPORTS_DIR)
      .filter(f => f.endsWith('.json'));
    
    for (const fileName of airportFiles) {
      const airportCode = fileName.replace('.json', '');
      const filePath = path.join(this.AIRPORTS_DIR, fileName);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AirportFile;
        let modified = false;
        
        for (const carrier of Object.values(data.carriers)) {
          for (const dest of carrier.destinations) {
            const routeKey = `${airportCode}-${dest.iata}`;
            if (verifiedRoutes.has(routeKey)) {
              dest.verified = true;
              modified = true;
            }
          }
        }
        
        if (modified) {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        }
      } catch (error) {
        console.error(`❌ ${fileName} 処理エラー:`, error);
      }
    }
  }

  /**
   * インポートレポート生成
   */
  private generateImportReport(
    routeStats: Map<string, { passengers: number; verified: boolean }>,
    verifiedRoutes: Set<string>,
    newRoutes: Set<string>
  ): void {
    const reportPath = path.join(process.cwd(), 'docs/mlit-import-report.md');
    
    let report = `# 国土交通省統計データインポートレポート\n\n`;
    report += `生成日時: ${new Date().toISOString()}\n\n`;
    
    report += `## 概要\n\n`;
    report += `国土交通省の航空輸送統計CSVデータをインポートし、路線データを検証しました。\n\n`;
    
    report += `## インポート結果\n\n`;
    report += `- **検証済み路線**: ${verifiedRoutes.size}件\n`;
    report += `- **新規発見路線**: ${newRoutes.size}件\n`;
    report += `- **総旅客数**: ${Array.from(routeStats.values()).reduce((sum, s) => sum + s.passengers, 0).toLocaleString()}人\n\n`;
    
    report += `## 主要路線（旅客数順）\n\n`;
    const sortedRoutes = Array.from(routeStats.entries())
      .sort((a, b) => b[1].passengers - a[1].passengers)
      .slice(0, 20);
    
    for (const [route, stats] of sortedRoutes) {
      report += `- ${route}: ${stats.passengers.toLocaleString()}人/月\n`;
    }
    
    report += `\n## データソース\n\n`;
    report += `- [国土交通省 航空輸送統計](https://www.mlit.go.jp/k-toukei/)\n`;
    report += `- [e-Stat 政府統計の総合窓口](https://www.e-stat.go.jp/)\n`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📋 レポート作成: ${reportPath}`);
  }

  /**
   * 使用方法を表示
   */
  showUsage(): void {
    console.log('📖 使用方法:\n');
    console.log('1. 国土交通省統計CSVをダウンロード:');
    console.log('   https://www.e-stat.go.jp/ から航空輸送統計を検索');
    console.log('   「国内定期航空路線別旅客輸送実績」CSVをダウンロード\n');
    console.log('2. このスクリプトを実行:');
    console.log('   tsx scripts/import-mlit-csv.ts <CSVファイルパス>\n');
    console.log('例:');
    console.log('   tsx scripts/import-mlit-csv.ts ~/Downloads/aviation-stats-202409.csv');
  }

  async run(): Promise<void> {
    const csvPath = process.argv[2];
    
    if (!csvPath) {
      this.showUsage();
      return;
    }
    
    await this.importAndVerify(csvPath);
  }
}

// スクリプト実行
new MLITCSVImporter().run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});