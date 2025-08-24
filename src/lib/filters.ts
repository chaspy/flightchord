import type { Airport } from "./types";

export function isDomestic(srcIata: string, dstIata: string, airports: Record<string, Airport>): boolean {
  const s = airports[srcIata];
  const d = airports[dstIata];
  if (!s || !d) return false;
  return s.iso_country === d.iso_country;
}