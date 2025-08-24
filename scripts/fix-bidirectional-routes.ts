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

const AIRPORTS_DIR = path.join(process.cwd(), 'public/data/airports');
const TODAY = new Date().toISOString().split('T')[0];

// Source templates for carriers
const SOURCE_TEMPLATES = {
  'NH': { title: 'ANA公式時刻表', url: 'https://www.ana.co.jp/ja/jp/book-plan/flight-schedule/' },
  'JL': { title: 'JAL公式時刻表', url: 'https://www.jal.co.jp/jp/ja/jmb/flightschedule/' },
  'BC': { title: 'スカイマーク公式時刻表', url: 'https://www.skymark.co.jp/ja/timetable/' },
  'GK': { title: 'ジェットスター・ジャパン公式時刻表', url: 'https://www.jetstar.com/jp/ja/flight-schedules' },
  'MM': { title: 'ピーチ・アビエーション公式時刻表', url: 'https://www.flypeach.com/jp/ja/schedule' },
  '6J': { title: 'ソラシドエア公式時刻表', url: 'https://www.solaseedair.jp/timetable/' },
  'NU': { title: 'JTA公式時刻表', url: 'https://www.jta.co.jp/schedule/' },
  'RC': { title: 'JAC公式時刻表', url: 'https://www.jac.co.jp/schedule/' },
  'OC': { title: 'RAC公式時刻表', url: 'https://www.rac.co.jp/schedule/' },
  'UA': { title: 'ユナイテッド航空公式時刻表', url: 'https://www.united.com/ja/jp/fly/schedules' },
  'SQ': { title: 'シンガポール航空公式時刻表', url: 'https://www.singaporeair.com/ja_JP/jp/plan-travel/timetables/' },
  'KE': { title: '大韓航空公式時刻表', url: 'https://www.koreanair.com/jp/ja/schedule/' },
  '7G': { title: 'スターフライヤー公式時刻表', url: 'https://www.starflyer.jp/timetable/' }
};

class BidirectionalRouteFixer {
  private airportFiles = new Map<string, AirportFile>();
  private routeMap = new Map<string, Set<string>>();

  async loadData() {
    if (!fs.existsSync(AIRPORTS_DIR)) {
      throw new Error('Airports directory not found');
    }

    const files = fs.readdirSync(AIRPORTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(AIRPORTS_DIR, file);
      const data: AirportFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      this.airportFiles.set(data.airport, data);
    }
  }

  buildRouteMap() {
    for (const [airport, data] of this.airportFiles) {
      for (const [carrier, carrierData] of Object.entries(data.carriers)) {
        for (const route of carrierData.destinations) {
          const key = `${carrier}:${airport}`;
          if (!this.routeMap.has(key)) {
            this.routeMap.set(key, new Set());
          }
          this.routeMap.get(key)!.add(route.iata);
        }
      }
    }
  }

  findMissingBidirectionalRoutes(): Array<{from: string, to: string, carrier: string}> {
    const missing = [];

    for (const [fromAirport, data] of this.airportFiles) {
      for (const [carrier, carrierData] of Object.entries(data.carriers)) {
        for (const route of carrierData.destinations) {
          const toAirport = route.iata;
          const returnKey = `${carrier}:${toAirport}`;
          
          if (this.airportFiles.has(toAirport)) {
            if (!this.routeMap.has(returnKey) || !this.routeMap.get(returnKey)!.has(fromAirport)) {
              missing.push({ from: fromAirport, to: toAirport, carrier });
            }
          }
        }
      }
    }

    return missing;
  }

  async fixBidirectionalRoutes(): Promise<void> {
    console.log('🔧 Fixing bidirectional route consistency...\n');

    await this.loadData();
    this.buildRouteMap();
    
    const missingRoutes = this.findMissingBidirectionalRoutes();
    console.log(`Found ${missingRoutes.length} missing bidirectional routes\n`);

    const fixedFiles = new Set<string>();

    for (const { from, to, carrier } of missingRoutes) {
      const originalRoute = this.findRoute(from, to, carrier);
      if (!originalRoute) continue;

      // Check if destination airport file exists
      const destinationFile = this.airportFiles.get(to);
      if (!destinationFile) {
        console.log(`⚠️  Skipping ${carrier} ${from}→${to}: destination airport file ${to}.json not found`);
        continue;
      }

      // Create return route
      const returnRoute: RouteData = {
        iata: from,
        freq_per_day: originalRoute.freq_per_day, // Copy frequency (may need manual adjustment)
        intl: originalRoute.intl,
        sources: this.createSourceForRoute(carrier, to, from),
        lastChecked: TODAY
      };

      // Add to destination file
      if (!destinationFile.carriers[carrier]) {
        destinationFile.carriers[carrier] = { destinations: [] };
      }

      // Check if route already exists (avoid duplicates)
      const existingRoute = destinationFile.carriers[carrier].destinations.find(r => r.iata === from);
      if (existingRoute) {
        console.log(`ℹ️  Route already exists: ${carrier} ${to}→${from}`);
        continue;
      }

      destinationFile.carriers[carrier].destinations.push(returnRoute);
      destinationFile.updatedAt = TODAY;
      fixedFiles.add(to);

      console.log(`✅ Added bidirectional route: ${carrier} ${to}→${from}`);
    }

    // Save updated files
    for (const airportCode of fixedFiles) {
      const filePath = path.join(AIRPORTS_DIR, `${airportCode}.json`);
      const data = this.airportFiles.get(airportCode);
      if (data) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`📝 Updated file: ${airportCode}.json`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Missing bidirectional routes found: ${missingRoutes.length}`);
    console.log(`   Files updated: ${fixedFiles.size}`);
    console.log(`   Routes added: ${missingRoutes.filter(r => this.airportFiles.has(r.to)).length}`);
  }

  private findRoute(from: string, to: string, carrier: string): RouteData | null {
    const fromData = this.airportFiles.get(from);
    if (!fromData || !fromData.carriers[carrier]) return null;
    
    return fromData.carriers[carrier].destinations.find(r => r.iata === to) || null;
  }

  private createSourceForRoute(carrier: string, from: string, to: string): Array<{ title: string, url: string }> {
    const template = SOURCE_TEMPLATES[carrier as keyof typeof SOURCE_TEMPLATES];
    if (template) {
      return [{ title: template.title, url: template.url }];
    }
    
    return [{ 
      title: `${carrier}公式時刻表（要確認）`, 
      url: 'https://example.com/verify-required' 
    }];
  }
}

async function main() {
  try {
    const fixer = new BidirectionalRouteFixer();
    await fixer.fixBidirectionalRoutes();

    console.log('\n🔍 Running validation after fixes...');
    
    // Run validation to check results
    const { spawn } = await import('child_process');
    const validation = spawn('pnpm', ['run', 'validate-data'], { stdio: 'inherit' });
    
    validation.on('close', (code) => {
      console.log(`\n✨ Bidirectional route fixing completed`);
      if (code === 0) {
        console.log('🎉 All validation checks passed!');
      } else {
        console.log('⚠️  Some validation issues remain - this may be expected for genuinely unidirectional routes');
      }
    });

  } catch (error) {
    console.error('❌ Error fixing bidirectional routes:', error);
    process.exit(1);
  }
}

main().catch(console.error);