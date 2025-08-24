import fs from 'fs';
import path from 'path';

interface RouteData {
  iata: string;
  freq_per_day?: number | null;
  intl: boolean;
  sources?: Array<{
    title: string;
    url: string;
  }>;
  lastChecked?: string;
}

interface CarrierData {
  destinations: RouteData[];
}

interface AirportFile {
  airport: string;
  updatedAt: string;
  source?: Array<{
    url: string;
    lastChecked: string;
    description: string;
  }>;
  carriers: Record<string, CarrierData>;
}

// Common source templates based on carrier
const SOURCE_TEMPLATES = {
  'NH': {
    title: 'ANA公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.ana.co.jp/ja/jp/book-plan/flight-schedule/`
  },
  'JL': {
    title: 'JAL公式時刻表', 
    urlTemplate: (from: string, to: string) => `https://www.jal.co.jp/jp/ja/jmb/flightschedule/`
  },
  'BC': {
    title: 'スカイマーク公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.skymark.co.jp/ja/timetable/`
  },
  'GK': {
    title: 'ジェットスター・ジャパン公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.jetstar.com/jp/ja/flight-schedules`
  },
  'MM': {
    title: 'ピーチ・アビエーション公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.flypeach.com/jp/ja/schedule`
  },
  '6J': {
    title: 'ソラシドエア公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.solaseedair.jp/timetable/`
  },
  'NU': {
    title: 'JTA公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.jta.co.jp/schedule/`
  },
  'RC': {
    title: 'JAC公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.jac.co.jp/schedule/`
  },
  'OC': {
    title: 'RAC公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.rac.co.jp/schedule/`
  },
  'UA': {
    title: 'ユナイテッド航空公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.united.com/ja/jp/fly/schedules`
  },
  'SQ': {
    title: 'シンガポール航空公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.singaporeair.com/ja_JP/jp/plan-travel/timetables/`
  },
  'KE': {
    title: '大韓航空公式時刻表',
    urlTemplate: (from: string, to: string) => `https://www.koreanair.com/jp/ja/schedule/`
  }
};

const AIRPORTS_DIR = path.join(process.cwd(), 'public/data/airports');
const TODAY = new Date().toISOString().split('T')[0];

async function addSourceAttributionToFiles() {
  console.log('🔧 Adding source attribution to legacy route data...\n');

  if (!fs.existsSync(AIRPORTS_DIR)) {
    console.error('❌ Airports directory not found');
    return;
  }

  const files = fs.readdirSync(AIRPORTS_DIR).filter(f => f.endsWith('.json'));
  let totalProcessed = 0;
  let totalUpdated = 0;

  for (const file of files) {
    const filePath = path.join(AIRPORTS_DIR, file);
    const data: AirportFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    let fileUpdated = false;

    for (const [carrier, carrierData] of Object.entries(data.carriers)) {
      for (const route of carrierData.destinations) {
        totalProcessed++;
        
        // Skip routes that already have source attribution
        if (route.sources && route.sources.length > 0) {
          continue;
        }

        // Add source attribution
        const sourceTemplate = SOURCE_TEMPLATES[carrier as keyof typeof SOURCE_TEMPLATES];
        if (sourceTemplate) {
          route.sources = [
            {
              title: sourceTemplate.title,
              url: sourceTemplate.urlTemplate(data.airport, route.iata)
            }
          ];
          route.lastChecked = TODAY;
          fileUpdated = true;
          totalUpdated++;

          console.log(`✅ Added source: ${carrier} ${data.airport}→${route.iata}`);
        } else {
          // For unknown carriers, add placeholder that requires manual verification
          route.sources = [
            {
              title: `${carrier}公式時刻表（要確認）`,
              url: 'https://example.com/verify-required'
            }
          ];
          route.lastChecked = TODAY;
          fileUpdated = true;
          totalUpdated++;

          console.log(`⚠️  Added placeholder: ${carrier} ${data.airport}→${route.iata} (requires verification)`);
        }
      }
    }

    // Update the file if changes were made
    if (fileUpdated) {
      data.updatedAt = TODAY;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`📝 Updated file: ${file}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total routes processed: ${totalProcessed}`);
  console.log(`   Routes updated with sources: ${totalUpdated}`);
  console.log(`   Files updated: ${files.length}`);

  // Run validation after updates
  console.log('\n🔍 Running validation after updates...');
  
  const { spawn } = await import('child_process');
  const validation = spawn('pnpm', ['run', 'validate-data'], { stdio: 'inherit' });
  
  validation.on('close', (code) => {
    console.log(`\n✨ Source attribution process completed`);
    if (code === 0) {
      console.log('🎉 All validation checks passed!');
    } else {
      console.log('⚠️  Some validation issues remain - check output above');
    }
  });
}

addSourceAttributionToFiles().catch(console.error);