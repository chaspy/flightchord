import type { Feature, LineString, MultiLineString } from "geojson";
import { point } from "@turf/helpers";
import greatCircle from "@turf/great-circle";

export function arc(src: [number, number], dst: [number, number], npoints = 64): Feature<LineString | MultiLineString> {
  const s = point(src);
  const d = point(dst);
  return greatCircle(s, d, { npoints });
}