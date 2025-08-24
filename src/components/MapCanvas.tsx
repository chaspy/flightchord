import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapCanvasProps = {
  onMapReady?: (map: Map) => void;
};

export default function MapCanvas({ onMapReady }: MapCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [139.76, 35.68],
      zoom: 3
    });
    
    const handleLoad = () => {
      if (map.isStyleLoaded()) {
        onMapReady?.(map);
      } else {
        map.once("styledata", () => {
          onMapReady?.(map);
        });
      }
    };
    
    map.on("load", handleLoad);
    return () => map.remove();
  }, [onMapReady]);

  return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
}