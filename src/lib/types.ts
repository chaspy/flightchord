export type Airport = {
  iata: string;
  icao?: string;
  name: string;
  lat: number;
  lon: number;
  iso_country: string;
  city?: string;
};

export type Airline = {
  iata?: string;
  icao?: string;
  name: string;
};

export type RouteRecord = {
  airline: string;
  src: string;
  dst: string;
  codeshare?: boolean;
};

export type AirportIndex = {
  airport: string;
  updatedAt: string;
  carriers: Record<string, {
    destinations: Array<{
      iata: string;
      freq_per_day?: number;
      intl: boolean;
    }>
  }>;
};