import { useEffect, useRef, useState } from "react";
import type { Map } from "maplibre-gl";
import MapCanvas from "./components/MapCanvas";
import Controls from "./components/Controls";
import { arc } from "./lib/geo";
import { loadAirports, loadAirlines, loadAirportIndex } from "./lib/data";
import { isDomestic } from "./lib/filters";
import type { Airport, Airline } from "./lib/types";

export default function App() {
  const mapRef = useRef<Map | null>(null);
  const [airports, setAirports] = useState<Record<string, Airport>>({});
  const [airlines, setAirlines] = useState<Record<string, Airline>>({});
  const [selected, setSelected] = useState<string>("");
  const [domesticOnly, setDomesticOnly] = useState(true);
  const [enabledCarriers, setEnabledCarriers] = useState<Record<string, boolean>>({});
  const [mapReady, setMapReady] = useState(false);

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
      const availableAirports = ["HND", "NRT", "FUK", "CTS", "OKA", "KIX", "SIN", "ICN", "LAX"];
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
    </>
  );
}