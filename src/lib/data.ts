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
  if (!res.ok) throw new Error(`airport index not found: ${iata}`);
  return res.json();
}