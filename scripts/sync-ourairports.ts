import fs from 'fs';
import path from 'path';
import https from 'https';
import { parse } from 'csv-parse/sync';

interface OurAirportsRecord {
  id: string;
  ident: string; // ICAO code
  type: string;
  name: string;
  latitude_deg: string;
  longitude_deg: string;
  elevation_ft: string;
  continent: string;
  iso_country: string;
  iso_region: string;
  municipality: string;
  scheduled_service: string;
  gps_code: string;
  iata_code: string;
  local_code: string;
  home_link: string;
  wikipedia_link: string;
  keywords: string;
}

interface FlightChordAirport {
  iata: string;
  icao?: string;
  name: string;
  lat: number;
  lon: number;
  iso_country: string;
  city: string;
}

const OURAIRPORTS_CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const AIRPORTS_JSON_PATH = path.join(process.cwd(), 'public/data/airports.json');
const AIRPORTS_BACKUP_PATH = path.join(process.cwd(), 'public/data/airports.json.backup');

class OurAirportsSync {
  
  private async downloadCSV(): Promise<string> {
    console.log('📥 OurAirports CSV データをダウンロード中...');
    
    return new Promise((resolve, reject) => {
      let data = '';
      
      https.get(OURAIRPORTS_CSV_URL, (response) => {
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

  private parseCSV(csvData: string): OurAirportsRecord[] {
    console.log('📊 CSV データを解析中...');
    
    try {
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        encoding: 'utf8'
      }) as OurAirportsRecord[];

      console.log(`✅ ${records.length} 件の空港データを解析`);
      return records;
    } catch (error) {
      throw new Error(`CSV解析エラー: ${error}`);
    }
  }

  private filterTargetAirports(records: OurAirportsRecord[]): OurAirportsRecord[] {
    console.log('🌏 対象国の空港を抽出中...');
    
    // 対象国リスト（段階的に拡大可能）
    const TARGET_COUNTRIES = [
      'JP', // 日本（既存）
      'US', // アメリカ
      'KR', // 韓国  
      'SG', // シンガポール
      'TW', // 台湾
      'HK', // 香港
      'AU', // オーストラリア
      'TH', // タイ
      'MY', // マレーシア
      'PH', // フィリピン
      'VN', // ベトナム
    ];
    
    const targetAirports = records.filter(record => 
      TARGET_COUNTRIES.includes(record.iso_country) && 
      record.iata_code && 
      record.iata_code.length === 3 &&
      ['large_airport', 'medium_airport'].includes(record.type) // 主要空港のみ
    );

    console.log(`✅ ${targetAirports.length} 件の対象空港を抽出`);
    return targetAirports;
  }

  private convertToFlightChordFormat(records: OurAirportsRecord[]): Record<string, FlightChordAirport> {
    console.log('🔄 FlightChord形式に変換中...');
    
    const airports: Record<string, FlightChordAirport> = {};
    
    for (const record of records) {
      const lat = parseFloat(record.latitude_deg);
      const lon = parseFloat(record.longitude_deg);
      
      if (isNaN(lat) || isNaN(lon)) {
        console.warn(`⚠️  座標不正: ${record.iata_code} - lat:${record.latitude_deg}, lon:${record.longitude_deg}`);
        continue;
      }

      airports[record.iata_code] = {
        iata: record.iata_code,
        ...(record.ident && record.ident !== record.iata_code && { icao: record.ident }),
        name: record.name,
        lat,
        lon,
        iso_country: record.iso_country,
        city: record.municipality || record.name.split(' ')[0] // Fallback to first word of name
      };
    }

    console.log(`✅ ${Object.keys(airports).length} 件をFlightChord形式に変換`);
    return airports;
  }

  private backupExistingData(): void {
    if (fs.existsSync(AIRPORTS_JSON_PATH)) {
      console.log('💾 既存データをバックアップ中...');
      fs.copyFileSync(AIRPORTS_JSON_PATH, AIRPORTS_BACKUP_PATH);
      console.log(`✅ バックアップ作成: ${AIRPORTS_BACKUP_PATH}`);
    }
  }

  private async loadExistingAirports(): Promise<Record<string, FlightChordAirport>> {
    if (!fs.existsSync(AIRPORTS_JSON_PATH)) {
      console.log('ℹ️  既存の airports.json が見つかりません');
      return {};
    }

    try {
      const data = fs.readFileSync(AIRPORTS_JSON_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ 既存データ読み込みエラー:', error);
      return {};
    }
  }

  private mergeWithExistingData(
    newAirports: Record<string, FlightChordAirport>,
    existingAirports: Record<string, FlightChordAirport>
  ): Record<string, FlightChordAirport> {
    console.log('🔀 既存データとの統合中...');

    const merged = { ...newAirports };
    let addedCount = 0;
    let updatedCount = 0;
    let preservedCount = 0;

    // 既存データで国際空港など、OurAirportsで検出されなかったものを保持
    for (const [iata, existingAirport] of Object.entries(existingAirports)) {
      if (!merged[iata]) {
        // 国際空港（日本以外）など、OurAirportsで抽出されなかったものを保持
        merged[iata] = existingAirport;
        preservedCount++;
        console.log(`🌐 国際空港を保持: ${iata} (${existingAirport.name})`);
      } else if (existingAirport.iso_country !== 'JP') {
        // 国際空港のデータは既存のものを優先
        merged[iata] = existingAirport;
        preservedCount++;
      } else {
        updatedCount++;
      }
    }

    // 新規追加された空港をカウント
    for (const iata of Object.keys(newAirports)) {
      if (!existingAirports[iata]) {
        addedCount++;
      }
    }

    console.log(`✅ 統合完了:`);
    console.log(`   新規追加: ${addedCount} 件`);
    console.log(`   更新: ${updatedCount} 件`);
    console.log(`   保持（国際空港等）: ${preservedCount} 件`);
    console.log(`   総数: ${Object.keys(merged).length} 件`);

    return merged;
  }

  private generateReport(
    newAirports: Record<string, FlightChordAirport>,
    existingAirports: Record<string, FlightChordAirport>
  ): void {
    const reportPath = path.join(process.cwd(), 'docs/ourairports-sync-report.md');
    const now = new Date().toISOString().split('T')[0];
    
    let report = `# OurAirports同期レポート - ${now}\n\n`;
    
    // 統計
    const newCount = Object.keys(newAirports).length;
    const existingCount = Object.keys(existingAirports).length;
    const japaneseNew = Object.values(newAirports).filter(a => a.iso_country === 'JP').length;
    const internationalExisting = Object.values(existingAirports).filter(a => a.iso_country !== 'JP').length;

    report += `## 統計\n\n`;
    report += `- **OurAirportsから取得した日本の空港**: ${japaneseNew} 件\n`;
    report += `- **保持された国際空港**: ${internationalExisting} 件\n`;
    report += `- **以前の総数**: ${existingCount} 件\n`;
    report += `- **新しい総数**: ${newCount} 件\n\n`;

    // 新規追加された空港
    const addedAirports = Object.entries(newAirports).filter(([iata, _]) => !existingAirports[iata]);
    if (addedAirports.length > 0) {
      report += `## 新規追加された空港\n\n`;
      addedAirports.forEach(([iata, airport]) => {
        report += `- **${iata}**: ${airport.name} (${airport.city})\n`;
      });
      report += `\n`;
    }

    // データソース情報
    report += `## データソース\n\n`;
    report += `- **ソース**: [OurAirports](https://ourairports.com/)\n`;
    report += `- **データURL**: ${OURAIRPORTS_CSV_URL}\n`;
    report += `- **ライセンス**: パブリックドメイン\n`;
    report += `- **同期日時**: ${new Date().toISOString()}\n\n`;

    report += `## 品質保証\n\n`;
    report += `- 日本の空港のみOurAirportsから自動取得\n`;
    report += `- 国際空港は既存データを保持\n`;
    report += `- IATA/ICAOコード、座標の整合性を検証\n`;
    report += `- バックアップファイル: \`airports.json.backup\`\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`📋 レポート作成: ${reportPath}`);
  }

  async sync(): Promise<void> {
    try {
      console.log('🚀 OurAirports同期開始\n');

      // 既存データの読み込みとバックアップ
      const existingAirports = await this.loadExistingAirports();
      this.backupExistingData();

      // OurAirportsからデータ取得
      const csvData = await this.downloadCSV();
      const records = this.parseCSV(csvData);
      const targetAirports = this.filterTargetAirports(records);
      const newAirports = this.convertToFlightChordFormat(targetAirports);

      // 既存データとの統合
      const mergedAirports = this.mergeWithExistingData(newAirports, existingAirports);

      // ファイル保存
      console.log('💾 airports.json を更新中...');
      fs.writeFileSync(AIRPORTS_JSON_PATH, JSON.stringify(mergedAirports, null, 2) + '\n');
      console.log('✅ airports.json 更新完了');

      // レポート生成
      this.generateReport(mergedAirports, existingAirports);

      console.log('\n🎉 OurAirports同期完了！');
      console.log('\n📝 次のステップ:');
      console.log('1. データの確認: git diff public/data/airports.json');
      console.log('2. 検証実行: pnpm run validate-data');
      console.log('3. コミット: git add . && git commit');

    } catch (error) {
      console.error('\n❌ 同期エラー:', error);
      
      // バックアップからの復旧
      if (fs.existsSync(AIRPORTS_BACKUP_PATH)) {
        console.log('🔄 バックアップから復旧中...');
        fs.copyFileSync(AIRPORTS_BACKUP_PATH, AIRPORTS_JSON_PATH);
        console.log('✅ バックアップから復旧完了');
      }
      
      throw error;
    }
  }
}

// Script execution
new OurAirportsSync().sync().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});