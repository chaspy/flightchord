#!/usr/bin/env tsx

/**
 * 航空会社データのブートストラップ
 * OpenFlightsのairlines.datから全キャリア情報を取得
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

interface Airline {
  iata: string;
  icao?: string;
  name: string;
}

async function downloadAirlinesData(): Promise<string> {
  console.log('📥 OpenFlights airlines.dat をダウンロード中...');
  
  return new Promise((resolve, reject) => {
    const url = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat';
    let data = '';
    
    https.get(url, (res) => {
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ ダウンロード完了');
        resolve(data);
      });
    }).on('error', reject);
  });
}

function parseAirlinesData(csv: string): Record<string, Airline> {
  const lines = csv.trim().split('\n');
  const airlines: Record<string, Airline> = {};
  
  // 既存の日本の航空会社（保持）
  const existing = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'public/data/airlines.json'), 'utf8')
  );
  
  // 既存データをコピー
  Object.assign(airlines, existing);
  
  // OpenFlights CSVフォーマット:
  // ID,Name,Alias,IATA,ICAO,Callsign,Country,Active
  for (const line of lines) {
    try {
      // CSVパース（簡易版）
      const parts = line.split(',');
      if (parts.length < 8) continue;
      
      const name = parts[1].replace(/^"|"$/g, '');
      const iata = parts[3].replace(/^"|"$/g, '');
      const icao = parts[4].replace(/^"|"$/g, '');
      const active = parts[7].replace(/^"|"$/g, '');
      
      // 有効なIATAコードを持つアクティブな航空会社のみ
      if (iata && iata !== '\\N' && iata.length === 2 && active === 'Y') {
        // 既存データがある場合は上書きしない
        if (!airlines[iata]) {
          airlines[iata] = {
            iata,
            icao: icao !== '\\N' ? icao : undefined,
            name: name.replace(/\\"/g, '"')
          };
        }
      }
    } catch (error) {
      // パースエラーは無視
    }
  }
  
  return airlines;
}

async function updateMissingCarriers() {
  // 実際に使用されているキャリアコードを収集
  const airportsDir = path.join(process.cwd(), 'public/data/airports');
  const usedCarriers = new Set<string>();
  
  fs.readdirSync(airportsDir).forEach(file => {
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(airportsDir, file), 'utf8'));
      Object.keys(data.carriers || {}).forEach(code => usedCarriers.add(code));
    }
  });
  
  // OpenFlightsデータをダウンロード・パース
  const csv = await downloadAirlinesData();
  const allAirlines = parseAirlinesData(csv);
  
  // 使用されているが登録されていないキャリアを特定
  const missing: string[] = [];
  usedCarriers.forEach(code => {
    if (!allAirlines[code]) {
      missing.push(code);
    }
  });
  
  // 不明なキャリアにはプレースホルダーを追加
  missing.forEach(code => {
    allAirlines[code] = {
      iata: code,
      name: `${code} (Unknown Carrier)`
    };
  });
  
  // airlines.jsonを更新
  const outputPath = path.join(process.cwd(), 'public/data/airlines.json');
  fs.writeFileSync(outputPath, JSON.stringify(allAirlines, null, 2) + '\n');
  
  console.log(`\n📊 航空会社データ更新完了:`);
  console.log(`   総キャリア数: ${Object.keys(allAirlines).length}`);
  console.log(`   使用中キャリア: ${usedCarriers.size}`);
  console.log(`   不明キャリア: ${missing.length}`);
  
  // 主要キャリアの確認
  const majorCarriers = ['AF', 'ET', 'EK', 'TK', 'AT', 'AH', 'LH', 'BA', 'AA', 'DL', 'UA'];
  console.log('\n🌍 主要グローバルキャリア:');
  majorCarriers.forEach(code => {
    const airline = allAirlines[code];
    if (airline) {
      console.log(`   ${code}: ${airline.name}`);
    }
  });
}

async function main() {
  console.log('🚀 航空会社データ ブートストラップ開始\n');
  
  try {
    await updateMissingCarriers();
    console.log('\n✅ 航空会社データのブートストラップ完了！');
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();