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
  const [selected, setSelected] = useState<string>("HND");
  const [domesticOnly, setDomesticOnly] = useState(true);
  const [enabledCarriers, setEnabledCarriers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const airportsData = await loadAirports();
      setAirports(airportsData);
      const airlinesData = await loadAirlines();
      setAirlines(airlinesData);
      setEnabledCarriers(Object.fromEntries(Object.keys(airlinesData).map(k => [k, true])));
    })();
  }, []);

  async function renderAirport(iata: string) {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    try {
      const idx = await loadAirportIndex(iata);
      const feats: any[] = [];

      for (const [carrier, payload] of Object.entries(idx.carriers)) {
        if (!enabledCarriers[carrier]) continue;
        for (const dest of payload.destinations) {
          if (domesticOnly && !isDomestic(iata, dest.iata, airports)) continue;
          const s = airports[iata];
          const d = airports[dest.iata];
          if (!s || !d) continue;
          const feature = arc([s.lon, s.lat], [d.lon, d.lat]);
          feature.properties = { carrier, freq: dest.freq_per_day || 0 };
          feats.push(feature);
        }
      }

      const fc = { type: "FeatureCollection", features: feats } as const;

      if (!map.getSource("routes")) {
        map.addSource("routes", { type: "geojson", data: fc });
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
      } else {
        (map.getSource("routes") as any).setData(fc);
      }
    } catch (error) {
      console.error("Failed to load airport data:", error);
    }
  }

  return (
    <>
      <MapCanvas onMapReady={(m) => { 
        mapRef.current = m; 
        renderAirport(selected); 
      }} />
      <div className="panel">
        <Controls
          airports={airports}
          airlines={airlines}
          onSelectAirport={(iata) => { 
            setSelected(iata); 
            renderAirport(iata); 
          }}
          onToggleDomestic={(flag) => { 
            setDomesticOnly(flag); 
            renderAirport(selected); 
          }}
          onToggleAirline={(code, checked) => { 
            setEnabledCarriers(s => ({ ...s, [code]: checked })); 
            setTimeout(() => renderAirport(selected)); 
          }}
        />
      </div>
    </>
  );
}