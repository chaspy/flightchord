import type { Airport } from "./types";

export function isDomestic(srcIata: string, dstIata: string, airports: Record<string, Airport>): boolean {
  const s = airports[srcIata];
  const d = airports[dstIata];
  if (!s || !d) return false;
  // FlightChordでは「国内線」は日本国内線のみを意味する
  return s.iso_country === 'JP' && d.iso_country === 'JP';
}