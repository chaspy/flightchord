import fs from 'fs';
import path from 'path';
import readline from 'readline';

interface AirportInput {
  iata: string;
  icao?: string;
  name: string;
  nameEn: string;
  lat: number;
  lon: number;
  city: string;
  region: 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kansai' | 'chugoku' | 'shikoku' | 'kyushu' | 'okinawa' | 'international';
  type: 'major' | 'regional' | 'local';
  officialUrl?: string;
}

interface AirportDataFile {
  airport: string;
  updatedAt: string;
  source?: Array<{
    url: string;
    lastChecked: string;
    description: string;
  }>;
  carriers: Record<string, any>;
}

const AIRPORTS_DIR = path.join(process.cwd(), 'public/data/airports');
const AIRPORTS_JSON = path.join(process.cwd(), 'public/data/airports.json');
const COVERAGE_DATA_PATH = path.join(process.cwd(), 'src/lib/coverage-data.ts');
const TODAY = new Date().toISOString().split('T')[0];

class AirportAdder {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }

  private async collectAirportInfo(): Promise<AirportInput> {
    console.log('🛫 新規空港追加ウィザード\n');

    const iata = await this.question('IATAコード（3文字、例: KKJ）: ');
    if (!/^[A-Z]{3}$/.test(iata)) {
      throw new Error('IATAコードは3文字のアルファベットで入力してください');
    }

    const icao = await this.question('ICAOコード（4文字、例: RJFR、不明なら空白）: ');
    if (icao && !/^[A-Z]{4}$/.test(icao)) {
      throw new Error('ICAOコードは4文字のアルファベットで入力してください');
    }

    const name = await this.question('空港名（日本語、例: 北九州空港）: ');
    const nameEn = await this.question('空港名（英語、例: Kitakyushu Airport）: ');
    
    const latStr = await this.question('緯度（例: 33.8459）: ');
    const lat = parseFloat(latStr);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error('緯度は-90から90の間の数値で入力してください');
    }

    const lonStr = await this.question('経度（例: 131.0347）: ');
    const lon = parseFloat(lonStr);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      throw new Error('経度は-180から180の間の数値で入力してください');
    }

    const city = await this.question('都市名（英語、例: Kitakyushu）: ');

    console.log('\n地域を選択してください:');
    console.log('1: hokkaido, 2: tohoku, 3: kanto, 4: chubu, 5: kansai');
    console.log('6: chugoku, 7: shikoku, 8: kyushu, 9: okinawa, 0: international');
    const regionChoice = await this.question('地域番号: ');
    
    const regions = ['international', 'hokkaido', 'tohoku', 'kanto', 'chubu', 'kansai', 'chugoku', 'shikoku', 'kyushu', 'okinawa'];
    const region = regions[parseInt(regionChoice)] as AirportInput['region'];
    if (!region) {
      throw new Error('地域番号は0-9で入力してください');
    }

    console.log('\n空港タイプを選択してください:');
    console.log('1: major（主要空港）, 2: regional（地方空港）, 3: local（ローカル空港）');
    const typeChoice = await this.question('タイプ番号: ');
    
    const types = ['', 'major', 'regional', 'local'];
    const type = types[parseInt(typeChoice)] as AirportInput['type'];
    if (!type) {
      throw new Error('タイプ番号は1-3で入力してください');
    }

    const officialUrl = await this.question('空港公式サイトURL（任意）: ');

    return {
      iata: iata.toUpperCase(),
      icao: icao ? icao.toUpperCase() : undefined,
      name,
      nameEn,
      lat,
      lon,
      city,
      region,
      type,
      officialUrl: officialUrl || undefined
    };
  }

  private createAirportDataFile(airportInfo: AirportInput): void {
    const filePath = path.join(AIRPORTS_DIR, `${airportInfo.iata}.json`);
    
    if (fs.existsSync(filePath)) {
      throw new Error(`空港データファイル ${airportInfo.iata}.json は既に存在します`);
    }

    const dataFile: AirportDataFile = {
      airport: airportInfo.iata,
      updatedAt: TODAY,
      carriers: {}
    };

    if (airportInfo.officialUrl) {
      dataFile.source = [
        {
          url: airportInfo.officialUrl,
          lastChecked: TODAY,
          description: `${airportInfo.name}公式時刻表`
        }
      ];
    }

    fs.writeFileSync(filePath, JSON.stringify(dataFile, null, 2) + '\n');
    console.log(`✅ 作成: ${filePath}`);
  }

  private updateAirportsJson(airportInfo: AirportInput): void {
    let airportsData: Record<string, any> = {};
    
    if (fs.existsSync(AIRPORTS_JSON)) {
      airportsData = JSON.parse(fs.readFileSync(AIRPORTS_JSON, 'utf-8'));
    }

    if (airportsData[airportInfo.iata]) {
      throw new Error(`空港 ${airportInfo.iata} は既にairports.jsonに存在します`);
    }

    airportsData[airportInfo.iata] = {
      iata: airportInfo.iata,
      ...(airportInfo.icao && { icao: airportInfo.icao }),
      name: airportInfo.name,
      lat: airportInfo.lat,
      lon: airportInfo.lon,
      iso_country: airportInfo.region === 'international' ? '??' : 'JP',
      city: airportInfo.city
    };

    fs.writeFileSync(AIRPORTS_JSON, JSON.stringify(airportsData, null, 2) + '\n');
    console.log(`✅ 更新: airports.json`);
  }

  private updateCoverageData(airportInfo: AirportInput): void {
    let coverageContent = fs.readFileSync(COVERAGE_DATA_PATH, 'utf-8');
    
    // Check if airport already exists
    if (coverageContent.includes(`${airportInfo.iata}:`)) {
      throw new Error(`空港 ${airportInfo.iata} は既にcoverage-data.tsに存在します`);
    }

    // Find the insertion point (before the closing brace of ALL_AIRPORTS)
    const insertionPoint = coverageContent.lastIndexOf('};', coverageContent.indexOf('export const ALL_AIRPORTS'));
    
    if (insertionPoint === -1) {
      throw new Error('coverage-data.tsのALL_AIRPORTS挿入位置が見つかりません');
    }

    const newAirportEntry = `  ${airportInfo.iata}: {\n` +
      `    iata: '${airportInfo.iata}', ${airportInfo.icao ? `icao: '${airportInfo.icao}', ` : ''}name: '${airportInfo.name}', nameEn: '${airportInfo.nameEn}',\n` +
      `    status: 'implemented', region: '${airportInfo.region}', type: '${airportInfo.type}'\n` +
      `  },\n\n`;

    const beforeInsertion = coverageContent.substring(0, insertionPoint);
    const afterInsertion = coverageContent.substring(insertionPoint);

    const newContent = beforeInsertion + newAirportEntry + afterInsertion;
    
    fs.writeFileSync(COVERAGE_DATA_PATH, newContent);
    console.log(`✅ 更新: coverage-data.ts`);
  }

  private async runValidation(): Promise<void> {
    console.log('\n🔍 データ検証を実行中...');
    
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const validation = spawn('pnpm', ['run', 'validate-data'], { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      validation.on('close', (code) => {
        if (code === 0) {
          console.log('✅ データ検証成功');
          resolve();
        } else {
          console.log('⚠️ データ検証で問題が検出されました');
          console.log('手動で問題を修正するか、pnpm run fix-bidirectional を実行してください');
          resolve(); // エラーでも続行
        }
      });

      validation.on('error', (error) => {
        console.error('❌ 検証実行エラー:', error.message);
        reject(error);
      });
    });
  }

  async run(): Promise<void> {
    try {
      console.log('FlightChord 新規空港追加スクリプト\n');

      // Collect airport information
      const airportInfo = await this.collectAirportInfo();
      
      console.log('\n📋 入力された情報:');
      console.log(`IATA: ${airportInfo.iata}`);
      console.log(`ICAO: ${airportInfo.icao || '未設定'}`);
      console.log(`名前: ${airportInfo.name} (${airportInfo.nameEn})`);
      console.log(`座標: ${airportInfo.lat}, ${airportInfo.lon}`);
      console.log(`地域: ${airportInfo.region} (${airportInfo.type})`);
      console.log(`公式URL: ${airportInfo.officialUrl || '未設定'}`);

      const confirm = await this.question('\n✅ この情報で空港を追加しますか？ (y/N): ');
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('キャンセルしました');
        return;
      }

      // Create files and update data
      console.log('\n🔧 ファイル作成・更新中...');
      
      if (!fs.existsSync(AIRPORTS_DIR)) {
        fs.mkdirSync(AIRPORTS_DIR, { recursive: true });
      }

      this.createAirportDataFile(airportInfo);
      this.updateAirportsJson(airportInfo);
      this.updateCoverageData(airportInfo);

      // Run validation
      await this.runValidation();

      console.log('\n🎉 空港追加完了！');
      console.log('\n📝 次のステップ:');
      console.log('1. 就航航空会社の路線データを追加してください');
      console.log('2. 双方向路線を確認してください');
      console.log('3. pnpm run validate-data で最終確認してください');
      console.log('4. git add . && git commit で変更をコミットしてください');

    } catch (error) {
      console.error('\n❌ エラー:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Script execution
new AirportAdder().run().catch(console.error);

export default AirportAdder;