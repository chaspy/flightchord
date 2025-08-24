import { useState } from "react";
import { calculateCoverage, ALL_AIRLINES, ALL_AIRPORTS } from "../lib/coverage-data";

export default function CoverageInfo() {
  const [expanded, setExpanded] = useState(false);
  const coverage = calculateCoverage();

  const implementedAirlines = Object.entries(ALL_AIRLINES).filter(([, info]) => info.status === 'implemented');
  const plannedAirlines = Object.entries(ALL_AIRLINES).filter(([, info]) => info.status === 'planned');
  const implementedAirports = Object.entries(ALL_AIRPORTS).filter(([, info]) => info.status === 'implemented');
  const plannedAirports = Object.entries(ALL_AIRPORTS).filter(([, info]) => info.status === 'planned');

  return (
    <div className="coverage-info">
      <div className="coverage-header" onClick={() => setExpanded(!expanded)}>
        <h3>📊 データカバー状況 {expanded ? '▼' : '▶'}</h3>
        <div className="coverage-summary">
          <div className="metric">
            <span className="label">航空会社:</span>
            <span className="value">{coverage.airlines.implemented}/{coverage.airlines.total}社</span>
            <span className="percentage">({coverage.airlines.coverage}%)</span>
          </div>
          <div className="metric">
            <span className="label">空港:</span>
            <span className="value">{coverage.airports.implemented}/{coverage.airports.total}港</span>
            <span className="percentage">({coverage.airports.coverage}%)</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="coverage-details">
          <div className="section">
            <h4>✅ 実装済み航空会社 ({coverage.airlines.implemented}社)</h4>
            <div className="airline-grid">
              {implementedAirlines.map(([code, info]) => (
                <div key={code} className="airline-item implemented">
                  <span className="code">{info.iata || code}</span>
                  <span className="name">{info.name}</span>
                  <span className="type">{getTypeLabel(info.type)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h4>🔄 実装予定航空会社 ({coverage.airlines.planned}社)</h4>
            <div className="airline-grid">
              {plannedAirlines.map(([code, info]) => (
                <div key={code} className="airline-item planned">
                  <span className="code">{info.iata || code}</span>
                  <span className="name">{info.name}</span>
                  <span className="type">{getTypeLabel(info.type)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h4>✅ 実装済み空港 ({coverage.airports.implemented}港)</h4>
            <div className="airport-grid">
              {implementedAirports.map(([code, info]) => (
                <div key={code} className="airport-item implemented">
                  <span className="code">{code}</span>
                  <span className="name">{info.name}</span>
                  <span className="region">{getRegionLabel(info.region)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h4>🔄 実装予定空港 ({coverage.airports.planned}港)</h4>
            <div className="airport-grid">
              {plannedAirports.map(([code, info]) => (
                <div key={code} className="airport-item planned">
                  <span className="code">{code}</span>
                  <span className="name">{info.name}</span>
                  <span className="region">{getRegionLabel(info.region)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="meta-info">
            <p><strong>最終更新:</strong> 2025年8月24日</p>
            <p><strong>データソース:</strong> 航空会社公式サイト、国土交通省航空局</p>
            <p><strong>今後の予定:</strong> Phase 2でLCC 3社、Phase 3で地方空港を順次追加予定</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'major': return '大手';
    case 'lcc': return 'LCC';
    case 'regional': return '地方';
    case 'commuter': return 'コミューター';
    default: return type;
  }
}

function getRegionLabel(region: string): string {
  const regions: Record<string, string> = {
    hokkaido: '北海道',
    tohoku: '東北',
    kanto: '関東',
    chubu: '中部',
    kansai: '関西',
    chugoku: '中国',
    shikoku: '四国',
    kyushu: '九州',
    okinawa: '沖縄'
  };
  return regions[region] || region;
}