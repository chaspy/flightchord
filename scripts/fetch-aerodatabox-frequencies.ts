#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import https from 'https';

interface AeroDataBoxRoute {
  departure: {
    iataCode: string;
    icaoCode: string;
    scheduledTime: string;
  };
  arrival: {
    iataCode: string;
    icaoCode: string;
    scheduledTime: string;
  };
  airline: {
    iataCode: string;
    icaoCode: string;
  };
  flight: {
    number: string;
    iataNumber: string;
  };
}

interface AirportFile {
  airport: string;
  updatedAt: string;
  carriers: Record<string, { 
    destinations: Array<{ 
      iata: string;
      freq_per_day: number | null;
      freq_per_week?: number;
      intl: boolean;
      sources?: Array<{ title: string; url: string }>;
      lastChecked?: string;
    }> 
  }>;
}

class AeroDataBoxFetcher {
  private readonly AIRPORTS_DIR = path.join(process.cwd(), 'public/data/airports');
  private readonly CACHE_DIR = path.join(process.cwd(), 'cache/aerodatabox');
  private readonly TODAY = new Date().toISOString().split('T')[0];
  
  // AeroDataBox API設定
  private readonly API_HOST = 'aerodatabox.p.rapidapi.com';
  private readonly API_KEY = process.env.AERODATABOX_API_KEY || '';

  constructor() {
    // キャッシュディレクトリ作成
    if (!fs.existsSync(this.CACHE_DIR)) {
      fs.mkdirSync(this.CACHE_DIR, { recursive: true });
    }
  }

  /**
   * AeroDataBox APIから空港の便数データ取得
   */
  private async fetchAirportSchedule(iataCode: string): Promise<AeroDataBoxRoute[]> {
    console.log(`✈️  ${iataCode}の便数データを取得中...`);
    
    // キャッシュ確認
    const cacheFile = path.join(this.CACHE_DIR, `${iataCode}-${this.TODAY}.json`);
    if (fs.existsSync(cacheFile)) {
      console.log(`   キャッシュから読み込み`);
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }

    if (!this.API_KEY) {
      console.log(`   ⚠️  APIキーが設定されていません（プレースホルダーデータ使用）`);
      return this.generatePlaceholderData(iataCode);
    }

    // API実装例
    const options = {
      method: 'GET',
      hostname: this.API_HOST,
      port: 443,
      path: `/flights/airports/iata/${iataCode}/${this.TODAY}?withCancelled=false&direction=Departure`,
      headers: {
        'X-RapidAPI-Key': this.API_KEY,
        'X-RapidAPI-Host': this.API_HOST
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            // キャッシュ保存
            fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
            
            resolve(result.departures || []);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
  }

  /**
   * プレースホルダーデータ生成（APIキーがない場合）
   */
  private generatePlaceholderData(iataCode: string): AeroDataBoxRoute[] {
    // 主要空港の便数目安（仮データ）
    const frequencyEstimates: Record<string, number> = {
      'HND': 500,  // 羽田: 約500便/日
      'NRT': 300,  // 成田: 約300便/日
      'KIX': 200,  // 関西: 約200便/日
      'ITM': 250,  // 伊丹: 約250便/日
      'FUK': 180,  // 福岡: 約180便/日
      'CTS': 150,  // 新千歳: 約150便/日
      'OKA': 140,  // 那覇: 約140便/日
      'NGO': 120,  // 中部: 約120便/日
      'KOJ': 60,   // 鹿児島: 約60便/日
      'KMI': 50,   // 宮崎: 約50便/日
      'SDJ': 45,   // 仙台: 約45便/日
      'HIJ': 40,   // 広島: 約40便/日
      'KMJ': 35,   // 熊本: 約35便/日
      'OIT': 30,   // 大分: 約30便/日
      'NGS': 25,   // 長崎: 約25便/日
      'default': 20 // その他: 約20便/日
    };

    const dailyFlights = frequencyEstimates[iataCode] || frequencyEstimates.default;
    
    // ダミーデータ生成（便数の推定値を返す）
    return Array(dailyFlights).fill(null).map(() => ({
      departure: { iataCode, icaoCode: '', scheduledTime: '' },
      arrival: { iataCode: '', icaoCode: '', scheduledTime: '' },
      airline: { iataCode: '', icaoCode: '' },
      flight: { number: '', iataNumber: '' }
    }));
  }

  /**
   * 便数データを集計
   */
  private aggregateFrequencies(routes: AeroDataBoxRoute[]): Map<string, Map<string, number>> {
    const frequencies = new Map<string, Map<string, number>>();
    
    for (const route of routes) {
      const destCode = route.arrival.iataCode;
      const airlineCode = route.airline.iataCode;
      
      if (!destCode || !airlineCode) continue;
      
      if (!frequencies.has(airlineCode)) {
        frequencies.set(airlineCode, new Map());
      }
      
      const airlineFreqs = frequencies.get(airlineCode)!;
      airlineFreqs.set(destCode, (airlineFreqs.get(destCode) || 0) + 1);
    }
    
    return frequencies;
  }

  /**
   * 空港ファイルを便数データで更新
   */
  private async updateAirportWithFrequencies(
    airportCode: string,
    frequencies: Map<string, Map<string, number>>
  ): Promise<void> {
    const filePath = path.join(this.AIRPORTS_DIR, `${airportCode}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  ${airportCode}.json が存在しません`);
      return;
    }
    
    const airportData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AirportFile;
    let updateCount = 0;
    
    for (const [airline, destinations] of frequencies) {
      if (!airportData.carriers[airline]) continue;
      
      for (const [destCode, freq] of destinations) {
        const destIndex = airportData.carriers[airline].destinations.findIndex(
          d => d.iata === destCode
        );
        
        if (destIndex >= 0) {
          airportData.carriers[airline].destinations[destIndex].freq_per_day = freq;
          airportData.carriers[airline].destinations[destIndex].freq_per_week = freq * 7;
          updateCount++;
          
          // AeroDataBoxソースを追加
          if (!airportData.carriers[airline].destinations[destIndex].sources) {
            airportData.carriers[airline].destinations[destIndex].sources = [];
          }
          
          const adbSource = {
            title: 'AeroDataBox Flight Schedule API',
            url: 'https://aerodatabox.com/'
          };
          
          if (!airportData.carriers[airline].destinations[destIndex].sources.some(
            s => s.title === adbSource.title
          )) {
            airportData.carriers[airline].destinations[destIndex].sources.push(adbSource);
          }
        }
      }
    }
    
    if (updateCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(airportData, null, 2) + '\n');
      console.log(`   ✅ ${updateCount}路線の便数を更新`);
    }
  }

  /**
   * すべての主要空港の便数データを取得・更新
   */
  async fetchAllAirports(): Promise<void> {
    console.log('🚀 AeroDataBox便数データ取得開始\n');
    
    if (!this.API_KEY) {
      console.log('⚠️  AeroDataBox APIキーが設定されていません');
      console.log('📝 取得方法:');
      console.log('1. https://rapidapi.com/aerodatabox/api/aerodatabox/ にアクセス');
      console.log('2. 無料プランに登録（月500リクエストまで無料）');
      console.log('3. APIキーを取得');
      console.log('4. 環境変数に設定: export AERODATABOX_API_KEY="your-api-key"');
      console.log('\n💡 デモモード: プレースホルダーデータで便数を推定します\n');
    }

    // 主要空港のみ処理（API制限を考慮）
    const majorAirports = [
      'HND', 'NRT', 'KIX', 'ITM', 'NGO', 'FUK', 'CTS', 'OKA',
      'KOJ', 'KMI', 'SDJ', 'HIJ', 'KMJ', 'OIT', 'NGS', 'KKJ'
    ];
    
    const results = new Map<string, number>();
    
    for (const airportCode of majorAirports) {
      try {
        // 便数データ取得
        const schedules = await this.fetchAirportSchedule(airportCode);
        
        // 集計
        const frequencies = this.aggregateFrequencies(schedules);
        
        // ファイル更新
        await this.updateAirportWithFrequencies(airportCode, frequencies);
        
        // 統計収集
        let totalFlights = 0;
        for (const dests of frequencies.values()) {
          for (const freq of dests.values()) {
            totalFlights += freq;
          }
        }
        results.set(airportCode, totalFlights);
        
        // API制限対策（1秒待機）
        if (this.API_KEY) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ ${airportCode} エラー:`, error);
      }
    }
    
    // レポート生成
    this.generateFrequencyReport(results);
    
    console.log('\n✅ 便数データ取得完了！');
  }

  /**
   * 便数レポート生成
   */
  private generateFrequencyReport(results: Map<string, number>): void {
    const reportPath = path.join(process.cwd(), 'docs/aerodatabox-frequency-report.md');
    
    let report = `# AeroDataBox便数データレポート\n\n`;
    report += `生成日時: ${new Date().toISOString()}\n\n`;
    
    report += `## 概要\n\n`;
    report += `AeroDataBox APIを使用して主要空港の便数データを取得しました。\n\n`;
    
    report += `## 空港別便数（日次）\n\n`;
    
    const sorted = Array.from(results.entries()).sort((a, b) => b[1] - a[1]);
    
    for (const [airport, flights] of sorted) {
      report += `- **${airport}**: 約${flights}便/日\n`;
    }
    
    report += `\n## データ活用\n\n`;
    report += `便数データは以下の用途で活用されます：\n\n`;
    report += `- 路線の線幅調整（便数が多いほど太く表示）\n`;
    report += `- 主要路線の識別\n`;
    report += `- カバレッジ統計の精度向上\n`;
    
    report += `\n## 制限事項\n\n`;
    report += `- 無料プランは月500リクエストまで\n`;
    report += `- リアルタイムデータのため変動あり\n`;
    report += `- 季節運航・臨時便は含まれない場合あり\n`;
    
    report += `\n## データソース\n\n`;
    report += `- [AeroDataBox](https://aerodatabox.com/)\n`;
    report += `- [RapidAPI](https://rapidapi.com/aerodatabox/api/aerodatabox/)\n`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📋 レポート作成: ${reportPath}`);
  }

  /**
   * 線幅計算用の便数カテゴリー判定
   */
  static getLineWidthCategory(freq_per_day: number | null): 'thick' | 'medium' | 'thin' {
    if (!freq_per_day) return 'thin';
    
    if (freq_per_day >= 10) return 'thick';   // 10便/日以上: 太線
    if (freq_per_day >= 5) return 'medium';   // 5-9便/日: 中線
    return 'thin';                            // 4便/日以下: 細線
  }
}

// スクリプト実行
new AeroDataBoxFetcher().fetchAllAirports().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { AeroDataBoxFetcher };