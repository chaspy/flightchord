import { describe, it, expect } from "vitest";
import { isDomestic } from "./filters";
import type { Airport } from "./types";

describe("isDomestic", () => {
  const airports: Record<string, Airport> = {
    HND: { 
      iata: "HND", 
      name: "Tokyo Haneda", 
      lat: 35.5494, 
      lon: 139.7798, 
      iso_country: "JP" 
    },
    CTS: { 
      iata: "CTS", 
      name: "New Chitose", 
      lat: 42.7752, 
      lon: 141.6923, 
      iso_country: "JP" 
    },
    SIN: { 
      iata: "SIN", 
      name: "Singapore Changi", 
      lat: 1.3502, 
      lon: 103.9944, 
      iso_country: "SG" 
    },
    ICN: { 
      iata: "ICN", 
      name: "Seoul Incheon", 
      lat: 37.4602, 
      lon: 126.4407, 
      iso_country: "KR" 
    },
    CJU: { 
      iata: "CJU", 
      name: "Jeju International", 
      lat: 33.5126, 
      lon: 126.4930, 
      iso_country: "KR" 
    }
  };

  it("returns true for JP-JP routes", () => {
    expect(isDomestic("HND", "CTS", airports)).toBe(true);
  });

  it("returns false for JP-SG routes", () => {
    expect(isDomestic("HND", "SIN", airports)).toBe(false);
  });

  it("returns false for JP-KR routes", () => {
    expect(isDomestic("HND", "ICN", airports)).toBe(false);
  });

  it("returns false for KR-KR routes (only JP domestic allowed)", () => {
    expect(isDomestic("ICN", "CJU", airports)).toBe(false);
  });

  it("returns false when source airport not found", () => {
    expect(isDomestic("XXX", "CTS", airports)).toBe(false);
  });

  it("returns false when destination airport not found", () => {
    expect(isDomestic("HND", "XXX", airports)).toBe(false);
  });

  it("returns false when both airports not found", () => {
    expect(isDomestic("XXX", "YYY", airports)).toBe(false);
  });
});