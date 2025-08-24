import fs from 'fs';
import path from 'path';
import readline from 'readline';

interface AirlineInput {
  iata: string;
  icao?: string;
  name: string;
  nameEn: string;
  status: 'implemented' | 'planned' | 'not_planned';
  type: 'major' | 'lcc' | 'regional' | 'commuter';
  base?: string;
}

const COVERAGE_DATA_PATH = path.join(process.cwd(), 'src/lib/coverage-data.ts');

class AirlineAdder {
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

  private async collectAirlineInfo(): Promise<AirlineInput> {
    console.log('✈️ 新規航空会社追加ウィザード\n');

    const iata = await this.question('IATAコード（2文字、例: LJ）: ');
    if (!/^[A-Z0-9]{2}$/.test(iata)) {
      throw new Error('IATAコードは2文字のアルファベット/数字で入力してください');
    }

    const icao = await this.question('ICAOコード（3文字、例: JNA、不明なら空白）: ');
    if (icao && !/^[A-Z]{3}$/.test(icao)) {
      throw new Error('ICAOコードは3文字のアルファベットで入力してください');
    }

    const name = await this.question('航空会社名（日本語、例: ジンエアー）: ');
    const nameEn = await this.question('航空会社名（英語、例: Jin Air）: ');

    console.log('\n航空会社タイプを選択してください:');
    console.log('1: major（大手航空会社）, 2: lcc（格安航空会社）');
    console.log('3: regional（地方航空会社）, 4: commuter（コミューター航空）');
    const typeChoice = await this.question('タイプ番号: ');
    
    const types = ['', 'major', 'lcc', 'regional', 'commuter'];
    const type = types[parseInt(typeChoice)] as AirlineInput['type'];
    if (!type) {
      throw new Error('タイプ番号は1-4で入力してください');
    }

    console.log('\n実装ステータスを選択してください:');
    console.log('1: implemented（実装済み）, 2: planned（計画中）, 3: not_planned（計画なし）');
    const statusChoice = await this.question('ステータス番号: ');
    
    const statuses = ['', 'implemented', 'planned', 'not_planned'];
    const status = statuses[parseInt(statusChoice)] as AirlineInput['status'];
    if (!status) {
      throw new Error('ステータス番号は1-3で入力してください');
    }

    const base = await this.question('本拠地空港（IATAコード、例: ICN、不明なら空白）: ');
    if (base && !/^[A-Z]{3}$/.test(base)) {
      throw new Error('本拠地空港は3文字のIATAコードで入力してください');
    }

    return {
      iata: iata.toUpperCase(),
      icao: icao ? icao.toUpperCase() : undefined,
      name,
      nameEn,
      status,
      type,
      base: base ? base.toUpperCase() : undefined
    };
  }

  private checkAirlineExists(airlineInfo: AirlineInput): boolean {
    const coverageContent = fs.readFileSync(COVERAGE_DATA_PATH, 'utf-8');
    return coverageContent.includes(`${airlineInfo.iata}:`);
  }

  private updateCoverageData(airlineInfo: AirlineInput): void {
    let coverageContent = fs.readFileSync(COVERAGE_DATA_PATH, 'utf-8');
    
    if (this.checkAirlineExists(airlineInfo)) {
      throw new Error(`航空会社 ${airlineInfo.iata} は既にcoverage-data.tsに存在します`);
    }

    // Find the insertion point (before the closing brace of ALL_AIRLINES)
    const allAirlinesStart = coverageContent.indexOf('export const ALL_AIRLINES');
    const allAirlinesEnd = coverageContent.indexOf('};', allAirlinesStart);
    
    if (allAirlinesStart === -1 || allAirlinesEnd === -1) {
      throw new Error('coverage-data.tsのALL_AIRLINES挿入位置が見つかりません');
    }

    // Determine where to insert based on airline type
    const insertionPatterns = {
      major: '// 大手キャリア',
      lcc: '// LCC', 
      regional: '// 地方・リージョナル',
      commuter: '// コミューター'
    };

    let insertionPoint = -1;
    const pattern = insertionPatterns[airlineInfo.type];
    
    if (pattern) {
      const patternIndex = coverageContent.indexOf(pattern, allAirlinesStart);
      if (patternIndex !== -1) {
        // Find the next airline entry after the pattern
        const nextCommaIndex = coverageContent.indexOf('},', patternIndex);
        if (nextCommaIndex !== -1) {
          insertionPoint = nextCommaIndex + 2; // After '},\n'
        }
      }
    }
    
    // If no specific insertion point found, insert before the closing brace
    if (insertionPoint === -1) {
      insertionPoint = allAirlinesEnd;
    }

    const newAirlineEntry = `  ${airlineInfo.iata}: {\n` +
      `    iata: '${airlineInfo.iata}', ${airlineInfo.icao ? `icao: '${airlineInfo.icao}', ` : ''}name: '${airlineInfo.name}', nameEn: '${airlineInfo.nameEn}',\n` +
      `    status: '${airlineInfo.status}', type: '${airlineInfo.type}'${airlineInfo.base ? `, base: '${airlineInfo.base}'` : ''}\n` +
      `  },\n`;

    const beforeInsertion = coverageContent.substring(0, insertionPoint);
    const afterInsertion = coverageContent.substring(insertionPoint);

    const newContent = beforeInsertion + '\n' + newAirlineEntry + afterInsertion;
    
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
        } else {
          console.log('⚠️ データ検証で問題が検出されました（通常は路線データが未追加のため）');
        }
        resolve();
      });

      validation.on('error', (error) => {
        console.error('❌ 検証実行エラー:', error.message);
        reject(error);
      });
    });
  }

  async run(): Promise<void> {
    try {
      console.log('FlightChord 新規航空会社追加スクリプト\n');

      // Collect airline information
      const airlineInfo = await this.collectAirlineInfo();
      
      console.log('\n📋 入力された情報:');
      console.log(`IATA: ${airlineInfo.iata}`);
      console.log(`ICAO: ${airlineInfo.icao || '未設定'}`);
      console.log(`名前: ${airlineInfo.name} (${airlineInfo.nameEn})`);
      console.log(`タイプ: ${airlineInfo.type}`);
      console.log(`ステータス: ${airlineInfo.status}`);
      console.log(`本拠地: ${airlineInfo.base || '未設定'}`);

      const confirm = await this.question('\n✅ この情報で航空会社を追加しますか？ (y/N): ');
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('キャンセルしました');
        return;
      }

      // Update coverage data
      console.log('\n🔧 データ更新中...');
      this.updateCoverageData(airlineInfo);

      // Run validation
      await this.runValidation();

      console.log('\n🎉 航空会社追加完了！');
      console.log('\n📝 次のステップ:');
      console.log('1. 該当する空港データファイルに路線情報を追加してください');
      console.log('2. 公式時刻表のURLを確認・追加してください');
      console.log('3. pnpm run validate-data で最終確認してください');
      console.log('4. git add . && git commit で変更をコミットしてください');

      // Show template for route data
      console.log('\n📋 路線データのテンプレート:');
      console.log(`"${airlineInfo.iata}": {`);
      console.log('  "destinations": [');
      console.log('    {');
      console.log('      "iata": "HND",');
      console.log('      "freq_per_day": null,');
      console.log('      "intl": false,');
      console.log('      "sources": [');
      console.log('        {');
      console.log(`          "title": "${airlineInfo.name}公式時刻表",`);
      console.log('          "url": "https://[公式サイトURL]"');
      console.log('        }');
      console.log('      ],');
      console.log(`      "lastChecked": "${new Date().toISOString().split('T')[0]}"`);
      console.log('    }');
      console.log('  ]');
      console.log('}');

    } catch (error) {
      console.error('\n❌ エラー:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Script execution  
new AirlineAdder().run().catch(console.error);

export default AirlineAdder;