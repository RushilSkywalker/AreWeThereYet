import type { RouteGeometry } from "./types";

export type RouteSegment = {
  durationSeconds: number;
  distanceMeters: number;
  geometry: RouteGeometry;
};
