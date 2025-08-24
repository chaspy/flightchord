import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Popup } from "maplibre-gl";
import MapCanvas from "./components/MapCanvas";
import Controls from "./components/Controls";
import CoverageInfo from "./components/CoverageInfo";
import { arc } from "./lib/geo";
import { loadAirports, loadAirlines, loadAirportIndex } from "./lib/data";
import { isDomestic } from "./lib/filters";
import type { Airport, Airline } from "./lib/types";

export default function App() {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [airports, setAirports] = useState<Record<string, Airport>>({});
  const [airlines, setAirlines] = useState<Record<string, Airline>>({});
  const [selected, setSelected] = useState<string>("");
  const [domesticOnly, setDomesticOnly] = useState(true);
  const [enabledCarriers, setEnabledCarriers] = useState<Record<string, boolean>>({});
  const [mapReady, setMapReady] = useState(false);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const airportsData = await loadAirports();
        setAirports(airportsData);
        const airlinesData = await loadAirlines();
        setAirlines(airlinesData);
        setEnabledCarriers(Object.fromEntries(Object.keys(airlinesData).map(k => [k, true])));
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    })();
  }, []);

  // データ読み込み完了後に初期表示
  useEffect(() => {
    if (Object.keys(airports).length > 0 && mapReady && Object.keys(enabledCarriers).length > 0) {
      if (selected && selected.trim() !== "") {
        renderAirport(selected);
      } else {
        renderAllAirports();
      }
    }
  }, [airports, selected, domesticOnly, enabledCarriers, mapReady]);

  // 空港クリック時のハンドラー
  const handleAirportClick = async (e: any) => {
    if (!e.features || !e.features[0]) return;
    
    const feature = e.features[0];
    const { iata, name, connections } = feature.properties;
    const coordinates = e.lngLat;
    
    // 既存のポップアップを削除
    if (popupRef.current) {
      popupRef.current.remove();
    }
    
    try {
      // 空港データを読み込み
      const airportIndex = await loadAirportIndex(iata);
      
      // 表示する航空会社をフィルタリング
      const availableAirlines = Object.entries(airportIndex.carriers)
        .filter(([code]) => enabledCarriers[code])
        .map(([code, carrier]) => ({
          code,
          name: airlines[code]?.name || code,
          destinations: carrier.destinations.filter(dest => {
            if (domesticOnly && !isDomestic(iata, dest.iata, airports)) return false;
            return true;
          })
        }));
      
      const totalRoutes = availableAirlines.reduce((sum, airline) => sum + airline.destinations.length, 0);
      
      // ポップアップのHTMLコンテンツを作成
      const popupContent = `
        <div class="airport-popup-content">
          <div class="popup-header">
            <h3>${iata} - ${name}</h3>
          </div>
          <div class="popup-content">
            <div class="summary">
              <div class="metric">
                <span class="label">総接続数:</span>
                <span class="value">${connections}</span>
              </div>
              <div class="metric">
                <span class="label">総路線数:</span>
                <span class="value">${totalRoutes}</span>
              </div>
            </div>
            <div class="airlines-section">
              <h4>運航航空会社 (${availableAirlines.length}社)</h4>
              ${availableAirlines.length === 0 ? 
                '<p class="no-data">表示可能な航空会社がありません</p>' :
                `<div class="airlines-list">
                  ${availableAirlines.map(airline => `
                    <div class="airline-item">
                      <div class="airline-header">
                        <span class="airline-code">${airline.code}</span>
                        <span class="airline-name">${airline.name}</span>
                        <span class="route-count">${airline.destinations.length}路線</span>
                      </div>
                      <div class="destinations">
                        ${airline.destinations.slice(0, 6).map(dest => `
                          <span class="destination">
                            ${dest.iata}
                            ${dest.freq_per_day && dest.freq_per_day > 0 ? 
                              `<span class="frequency">(${dest.freq_per_day}/日)</span>` : ''}
                          </span>
                        `).join('')}
                        ${airline.destinations.length > 6 ? 
                          `<span class="more">他${airline.destinations.length - 6}路線</span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>`
              }
            </div>
          </div>
        </div>
      `;
      
      // 新しいポップアップを作成
      popupRef.current = new Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '300px'
      })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(mapRef.current!);
      
    } catch (error) {
      console.error(`Failed to load airport data for ${iata}:`, error);
      
      // エラー時のシンプルなポップアップ
      popupRef.current = new Popup({
        closeButton: true,
        closeOnClick: true
      })
        .setLngLat(coordinates)
        .setHTML(`
          <div class="airport-popup-content">
            <h3>${iata} - ${name}</h3>
            <p>データの読み込みに失敗しました</p>
          </div>
        `)
        .addTo(mapRef.current!);
    }
  };

  // 空港レイヤーにクリックイベントを追加する関数
  const addAirportClickHandler = (map: MapLibreMap) => {
    // 既存のイベントリスナーを削除（重複を避ける）
    map.off('click', 'airports', handleAirportClick);
    
    // 空港クリック用イベントリスナーのみ追加
    map.on('click', 'airports', handleAirportClick);
    
    // マウスカーソルをポインターに変更
    map.on('mouseenter', 'airports', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'airports', () => {
      map.getCanvas().style.cursor = '';
    });
  };

  async function renderAllAirports() {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (Object.keys(airports).length === 0) return;
    if (Object.keys(enabledCarriers).length === 0) return;
    
    if (!map.isStyleLoaded()) {
      setTimeout(() => renderAllAirports(), 100);
      return;
    }
    
    try {
      const availableAirports = ["HND", "NRT", "KIX", "ITM", "NGO", "FUK", "KKJ", "CTS", "OKA", "SDJ", "KMJ", "MYJ", "ISG", "SIN", "ICN", "LAX"];
      const routeFeatures: any[] = [];
      const airportFeatures: any[] = [];
      const airportCounts = new Map<string, number>();

      // 全空港のデータを並行読み込み
      const allIndexes = await Promise.all(
        availableAirports.map(async (airportCode) => {
          try {
            const idx = await loadAirportIndex(airportCode);
            return { airportCode, idx };
          } catch (error) {
            return null;
          }
        })
      );

      // 全路線データを統合
      for (const result of allIndexes) {
        if (!result) continue;
        const { airportCode: iata, idx } = result;

        for (const [carrier, payload] of Object.entries(idx.carriers)) {
          if (!enabledCarriers[carrier]) continue;
          for (const dest of payload.destinations) {
            if (domesticOnly && !isDomestic(iata, dest.iata, airports)) continue;
            const s = airports[iata];
            const d = airports[dest.iata];
            if (!s || !d) continue;
            
            // 路線アーク作成
            const feature = arc([s.lon, s.lat], [d.lon, d.lat]);
            feature.properties = { 
              carrier, 
              freq: dest.freq_per_day || 0,
              src: iata,
              dst: dest.iata
            };
            routeFeatures.push(feature);
            
            // 接続数カウント
            airportCounts.set(iata, (airportCounts.get(iata) || 0) + 1);
            airportCounts.set(dest.iata, (airportCounts.get(dest.iata) || 0) + 1);
          }
        }
      }

      // 空港ノード作成
      for (const [airportCode, count] of airportCounts) {
        const airport = airports[airportCode];
        if (!airport) continue;
        
        const nodeFeature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [airport.lon, airport.lat]
          },
          properties: {
            iata: airportCode,
            name: airport.name,
            connections: count
          }
        };
        airportFeatures.push(nodeFeature);
      }

      // レイヤー更新（既存のロジックと同じ）
      const routeCollection = { type: "FeatureCollection", features: routeFeatures } as const;
      let routesSource;
      try {
        routesSource = map.getSource("routes");
      } catch (error) {
        routesSource = null;
      }
      
      if (!routesSource) {
        try {
          map.addSource("routes", { type: "geojson", data: routeCollection });
          map.addLayer({
            id: "routes",
            type: "line",
            source: "routes",
            paint: {
              "line-color": ["case", [">", ["get", "freq"], 0], "#3388ff", "#888"],
              "line-width": ["interpolate", ["linear"], ["get", "freq"], 0, 1.0, 10, 4.0],
              "line-opacity": 0.75
            }
          });
        } catch (error) {
          console.error("Failed to add routes layer:", error);
          return;
        }
      } else {
        try {
          (routesSource as any).setData(routeCollection);
        } catch (error) {
          console.error("Failed to update routes data:", error);
        }
      }

      const airportCollection = { type: "FeatureCollection", features: airportFeatures } as const;
      let airportsSource;
      try {
        airportsSource = map.getSource("airports");
      } catch (error) {
        airportsSource = null;
      }
      
      if (!airportsSource) {
        try {
          map.addSource("airports", { type: "geojson", data: airportCollection });
          map.addLayer({
            id: "airports",
            type: "circle",
            source: "airports",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "connections"], 1, 6, 20, 30],
              "circle-color": "#ff6b35",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.8
            }
          });
          
          map.addLayer({
            id: "airport-labels",
            type: "symbol",
            source: "airports",
            layout: {
              "text-field": ["get", "iata"],
              "text-offset": [0, -2],
              "text-anchor": "bottom",
              "text-size": 12
            },
            paint: {
              "text-color": "#333",
              "text-halo-color": "#fff",
              "text-halo-width": 2
            }
          });
        } catch (error) {
          console.error("Failed to add airports layer:", error);
          return;
        }
      } else {
        try {
          (airportsSource as any).setData(airportCollection);
        } catch (error) {
          console.error("Failed to update airports data:", error);
        }
      }

      // 空港レイヤーが存在する場合のみクリックイベントを追加
      if (map.getLayer('airports')) {
        addAirportClickHandler(map);
      }

      // 全体表示モードでは最適なズームレベルに設定
      if (domesticOnly) {
        const japanBounds = [
          [123.0, 24.0], // 南西
          [146.0, 46.0]  // 北東
        ];
        map.fitBounds(japanBounds as any, {
          padding: 50,
          duration: 1000
        });
      } else {
        // 全世界の主要空港を含む範囲にズーム
        map.flyTo({
          center: [139.76, 35.68],
          zoom: 1.5,
          duration: 1000
        });
      }

    } catch (error) {
      console.error("Failed to load all airports data:", error);
    }
  }

  async function renderAirport(iata: string) {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (Object.keys(airports).length === 0) return;
    
    if (!map.isStyleLoaded()) {
      setTimeout(() => renderAirport(iata), 100);
      return;
    }
    
    try {
      const idx = await loadAirportIndex(iata);
      const routeFeatures: any[] = [];
      const airportFeatures: any[] = [];
      const airportCounts = new Map<string, number>();

      // 路線データ収集と接続数カウント
      for (const [carrier, payload] of Object.entries(idx.carriers)) {
        if (!enabledCarriers[carrier]) continue;
        for (const dest of payload.destinations) {
          if (domesticOnly && !isDomestic(iata, dest.iata, airports)) continue;
          const s = airports[iata];
          const d = airports[dest.iata];
          if (!s || !d) continue;
          
          // 路線アーク作成
          const feature = arc([s.lon, s.lat], [d.lon, d.lat]);
          feature.properties = { carrier, freq: dest.freq_per_day || 0 };
          routeFeatures.push(feature);
          
          // 接続数カウント
          airportCounts.set(iata, (airportCounts.get(iata) || 0) + 1);
          airportCounts.set(dest.iata, (airportCounts.get(dest.iata) || 0) + 1);
        }
      }

      // 空港ノード作成
      for (const [airportCode, count] of airportCounts) {
        const airport = airports[airportCode];
        if (!airport) continue;
        
        const nodeFeature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [airport.lon, airport.lat]
          },
          properties: {
            iata: airportCode,
            name: airport.name,
            connections: count
          }
        };
        airportFeatures.push(nodeFeature);
      }

      // 路線レイヤーの更新
      const routeCollection = { type: "FeatureCollection", features: routeFeatures } as const;
      
      // より安全なソース存在チェック
      let routesSource;
      try {
        routesSource = map.getSource("routes");
      } catch (error) {
        routesSource = null;
      }
      
      if (!routesSource) {
        try {
          map.addSource("routes", { type: "geojson", data: routeCollection });
          map.addLayer({
            id: "routes",
            type: "line",
            source: "routes",
            paint: {
              "line-color": ["case", [">", ["get", "freq"], 0], "#3388ff", "#888"],
              "line-width": ["interpolate", ["linear"], ["get", "freq"], 0, 1.0, 10, 4.0],
              "line-opacity": 0.75
            }
          });
        } catch (error) {
          console.error("Failed to add routes layer:", error);
          return;
        }
      } else {
        try {
          (routesSource as any).setData(routeCollection);
        } catch (error) {
          console.error("Failed to update routes data:", error);
        }
      }

      // 空港ノードレイヤーの更新
      const airportCollection = { type: "FeatureCollection", features: airportFeatures } as const;
      
      let airportsSource;
      try {
        airportsSource = map.getSource("airports");
      } catch (error) {
        airportsSource = null;
      }
      
      if (!airportsSource) {
        try {
          map.addSource("airports", { type: "geojson", data: airportCollection });
          map.addLayer({
            id: "airports",
            type: "circle",
            source: "airports",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "connections"], 1, 6, 10, 20],
              "circle-color": "#ff6b35",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.8
            }
          });
          
          // 空港ラベルレイヤー
          map.addLayer({
            id: "airport-labels",
            type: "symbol",
            source: "airports",
            layout: {
              "text-field": ["get", "iata"],
              "text-offset": [0, -2],
              "text-anchor": "bottom",
              "text-size": 12
            },
            paint: {
              "text-color": "#333",
              "text-halo-color": "#fff",
              "text-halo-width": 2
            }
          });
        } catch (error) {
          console.error("Failed to add airports layer:", error);
          return;
        }
      } else {
        try {
          (airportsSource as any).setData(airportCollection);
        } catch (error) {
          console.error("Failed to update airports data:", error);
        }
      }

      // 空港レイヤーが存在する場合のみクリックイベントを追加
      if (map.getLayer('airports')) {
        addAirportClickHandler(map);
      }

      // ズーム設定: Domestic onlyモード時は日本、そうでなければ世界全体
      if (domesticOnly) {
        const japanBounds = [
          [123.0, 24.0], // 南西
          [146.0, 46.0]  // 北東
        ];
        map.fitBounds(japanBounds as any, {
          padding: 50,
          duration: 1000
        });
      } else {
        // 国際モード: 世界全体表示
        map.flyTo({
          center: [139.76, 35.68],
          zoom: 2,
          duration: 1000
        });
      }

    } catch (error) {
      console.error("Failed to load airport data:", error);
    }
  }

  return (
    <>
      <MapCanvas onMapReady={(m) => { 
        mapRef.current = m; 
        setMapReady(true);
      }} />
      <div className="panel">
        <Controls
          airports={airports}
          airlines={airlines}
          onSelectAirport={(iata) => { 
            setSelected(iata.trim()); 
          }}
          onToggleDomestic={(flag) => { 
            setDomesticOnly(flag); 
          }}
          onToggleAirline={(code, checked) => { 
            setEnabledCarriers(s => ({ ...s, [code]: checked })); 
          }}
        />
      </div>
      <div className="coverage-panel">
        <CoverageInfo />
      </div>
    </>
  );
}