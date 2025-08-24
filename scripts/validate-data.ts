import fs from 'fs';
import path from 'path';
import { ALL_AIRPORTS, ALL_AIRLINES, calculateCoverage } from '../src/lib/coverage-data.js';

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

interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}

const DATA_DIR = path.join(process.cwd(), 'public/data');
const AIRPORTS_DIR = path.join(DATA_DIR, 'airports');
const AIRPORTS_JSON = path.join(DATA_DIR, 'airports.json');

class DataValidator {
  private results: ValidationResult[] = [];
  private airportFiles: Map<string, AirportFile> = new Map();
  private airportsMetadata: any = {};

  async validate(): Promise<ValidationResult[]> {
    console.log('🔍 FlightChord Data Validation Starting...\n');

    await this.loadData();
    this.validateFileStructure();
    this.validateBidirectionalRoutes();
    this.validateSourceAttribution();
    this.validateCoverage();
    this.validateMetadataConsistency();

    return this.results;
  }

  private async loadData() {
    // Load airports metadata
    if (fs.existsSync(AIRPORTS_JSON)) {
      this.airportsMetadata = JSON.parse(fs.readFileSync(AIRPORTS_JSON, 'utf-8'));
    }

    // Load all airport data files
    if (fs.existsSync(AIRPORTS_DIR)) {
      const files = fs.readdirSync(AIRPORTS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(AIRPORTS_DIR, file);
        const data: AirportFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        this.airportFiles.set(data.airport, data);
      }
    }
  }

  private validateFileStructure() {
    this.addResult('info', `Loaded ${this.airportFiles.size} airport data files`);

    // Check for missing data files for implemented airports
    const implementedAirports = Object.entries(ALL_AIRPORTS)
      .filter(([_, info]) => info.status === 'implemented')
      .map(([iata, _]) => iata);

    for (const iata of implementedAirports) {
      if (!this.airportFiles.has(iata)) {
        this.addResult('error', `Missing data file for implemented airport: ${iata}`);
      }
    }

    // Check for orphaned data files
    for (const [iata, _] of this.airportFiles) {
      if (!ALL_AIRPORTS[iata]) {
        this.addResult('warning', `Data file exists for airport not in coverage list: ${iata}`);
      }
    }
  }

  private validateBidirectionalRoutes() {
    const routeMap = new Map<string, Set<string>>();

    // Build route map
    for (const [airport, data] of this.airportFiles) {
      for (const [carrier, carrierData] of Object.entries(data.carriers)) {
        for (const route of carrierData.destinations) {
          const key = `${airport}-${carrier}`;
          if (!routeMap.has(key)) {
            routeMap.set(key, new Set());
          }
          routeMap.get(key)!.add(route.iata);
        }
      }
    }

    // Check bidirectional consistency
    for (const [fromAirport, data] of this.airportFiles) {
      for (const [carrier, carrierData] of Object.entries(data.carriers)) {
        for (const route of carrierData.destinations) {
          const toAirport = route.iata;
          const returnKey = `${toAirport}-${carrier}`;
          
          if (this.airportFiles.has(toAirport)) {
            if (!routeMap.has(returnKey) || !routeMap.get(returnKey)!.has(fromAirport)) {
              this.addResult('error', 
                `Missing bidirectional route: ${carrier} ${fromAirport}⇄${toAirport} (${toAirport}→${fromAirport} missing)`);
            }
          }
        }
      }
    }
  }

  private validateSourceAttribution() {
    for (const [airport, data] of this.airportFiles) {
      for (const [carrier, carrierData] of Object.entries(data.carriers)) {
        for (const route of carrierData.destinations) {
          if (!route.sources || route.sources.length === 0) {
            this.addResult('error', 
              `Missing source attribution: ${carrier} ${airport}→${route.iata}`);
          } else {
            // Check source structure
            for (const source of route.sources) {
              if (!source.title || !source.url) {
                this.addResult('error', 
                  `Invalid source structure: ${carrier} ${airport}→${route.iata}`);
              }
            }
          }

          if (!route.lastChecked) {
            this.addResult('warning', 
              `Missing lastChecked timestamp: ${carrier} ${airport}→${route.iata}`);
          }
        }
      }
    }
  }

  private validateCoverage() {
    const coverage = calculateCoverage();
    const actualAirportsWithData = this.airportFiles.size;
    const coverageListImplemented = coverage.airports.implemented;

    if (actualAirportsWithData !== coverageListImplemented) {
      this.addResult('error', 
        `Coverage mismatch: ${actualAirportsWithData} data files vs ${coverageListImplemented} in coverage list`);
    }

    // Check for inflated coverage
    const allCoverageAirports = Object.keys(ALL_AIRPORTS);
    const implementedAirports = Object.entries(ALL_AIRPORTS)
      .filter(([_, info]) => info.status === 'implemented')
      .length;

    this.addResult('info', 
      `Coverage: ${implementedAirports}/${allCoverageAirports.length} airports (${coverage.airports.coverage}%)`);

    const allCoverageAirlines = Object.keys(ALL_AIRLINES);
    const implementedAirlines = Object.entries(ALL_AIRLINES)
      .filter(([_, info]) => info.status === 'implemented')
      .length;

    this.addResult('info', 
      `Coverage: ${implementedAirlines}/${allCoverageAirlines.length} airlines (${coverage.airlines.coverage}%)`);
  }

  private validateMetadataConsistency() {
    // Check consistency between airports.json and airport data files
    for (const [iata, _] of this.airportFiles) {
      if (!this.airportsMetadata[iata]) {
        this.addResult('warning', `Airport ${iata} missing from airports.json metadata`);
      }
    }

    for (const iata of Object.keys(this.airportsMetadata)) {
      if (!this.airportFiles.has(iata) && ALL_AIRPORTS[iata]?.status === 'implemented') {
        this.addResult('error', `Airport ${iata} in metadata but missing data file`);
      }
    }
  }

  private addResult(type: 'error' | 'warning' | 'info', message: string, details?: any) {
    this.results.push({ type, message, details });
  }
}

async function main() {
  const validator = new DataValidator();
  const results = await validator.validate();

  const errors = results.filter(r => r.type === 'error');
  const warnings = results.filter(r => r.type === 'warning');
  const info = results.filter(r => r.type === 'info');

  console.log('\n📊 Validation Results:');
  console.log(`✅ Info: ${info.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}\n`);

  if (info.length > 0) {
    console.log('ℹ️  Information:');
    info.forEach(r => console.log(`   ${r.message}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(r => console.log(`   ${r.message}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach(r => console.log(`   ${r.message}`));
    console.log('');
  }

  if (errors.length === 0) {
    console.log('🎉 Data validation passed! No critical errors found.');
  } else {
    console.log('🚨 Data validation failed! Please fix the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);