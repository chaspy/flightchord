import type { Airport, Airline, AirportIndex } from "./types";

export async function loadAirports(): Promise<Record<string, Airport>> {
  const res = await fetch("/data/airports.json");
  return res.json();
}

export async function loadAirlines(): Promise<Record<string, Airline>> {
  const res = await fetch("/data/airlines.json");
  return res.json();
}

export async function loadAirportIndex(iata: string): Promise<AirportIndex> {
  const res = await fetch(`/data/airports/${iata}.json`);
  if (!res.ok) {
    if (res.status === 404) {
      // Return empty airport index for missing data
      return {
        airport: iata,
        updatedAt: new Date().toISOString().slice(0, 10),
        carriers: {}
      };
    }
    throw new Error(`Failed to load airport ${iata}: ${res.status} ${res.statusText}`);
  }
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error(`Invalid JSON for airport ${iata}:`, text.slice(0, 100));
    throw new Error(`Invalid airport data format for ${iata}`);
  }
}