import { useEffect, useState } from "react";

export type ControlsProps = {
  airports: Record<string, { name: string }>;
  airlines: Record<string, { name: string }>;
  onSelectAirport: (iata: string) => void;
  onToggleDomestic: (flag: boolean) => void;
  onToggleAirline: (code: string, checked: boolean) => void;
};

export default function Controls({ airports: _airports, airlines, onSelectAirport, onToggleDomestic, onToggleAirline }: ControlsProps) {
  const [query, setQuery] = useState("");
  const [domestic, setDomestic] = useState(true);

  useEffect(() => onToggleDomestic(domestic), [domestic, onToggleDomestic]);

  return (
    <div className="controls">
      <input 
        value={query} 
        onChange={e => setQuery(e.target.value.toUpperCase())} 
        placeholder="空欄で全体表示 / IATA (e.g., HND)" 
      />
      <button onClick={() => onSelectAirport(query)}>Go</button>
      <label>
        <input 
          type="checkbox" 
          checked={domestic} 
          onChange={e => setDomestic(e.target.checked)} 
        />
        Domestic only
      </label>
      <div className="airlines">
        {Object.entries(airlines).map(([code, a]) => (
          <label key={code}>
            <input 
              type="checkbox" 
              defaultChecked 
              onChange={e => onToggleAirline(code, e.target.checked)} 
            />
            {code} {a.name}
          </label>
        ))}
      </div>
    </div>
  );
}