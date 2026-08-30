import { haversineKm } from "./geo";
import { roadOnlyPlan, type RoutePhase } from "./road-plan";
import type { RouteSegment } from "./routing-types";
import type { Coordinate, Place, RouteGeometry } from "./types";

type GraphHopperDetail = [number, number, unknown];
type GraphHopperPath = {
  distance: number;
  time: number;
  points: RouteGeometry;
  snapped_waypoints: RouteGeometry;
  details?: { road_environment?: GraphHopperDetail[] };
};
type GraphHopperResponse = { paths?: GraphHopperPath[]; message?: string };

const DEFAULT_MAX_SNAP_METERS = 25_000;

function maxSnapMeters() {
  const configured = Number(process.env.ROUTING_MAX_SNAP_METERS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_SNAP_METERS;
}

export function snappedPointsAreClose(
  requested: Coordinate[],
  snappedCoordinates: [number, number][],
  maximumMeters = DEFAULT_MAX_SNAP_METERS,
) {
  return (
    requested.length === snappedCoordinates.length &&
    requested.every((point, index) => {
      const [lng, lat] = snappedCoordinates[index];
      return haversineKm(point, { lat, lng }) * 1000 <= maximumMeters;
    })
  );
}

function containsFerry(path: GraphHopperPath) {
  return Boolean(
    path.details?.road_environment?.some((detail) => String(detail[2]).toUpperCase() === "FERRY"),
  );
}

export async function routeGraphHopperSegment(
  checkpoints: Place[],
  phase: RoutePhase,
): Promise<RouteSegment | null> {
  const apiKey = process.env.GRAPHHOPPER_API_KEY;
  if (!apiKey) return null;
  const points = roadOnlyPlan(checkpoints, phase);

  const response = await fetch(`https://graphhopper.com/api/1/route?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      points: points.map((point) => [point.lng, point.lat]),
      profile: "car",
      locale: "en",
      elevation: false,
      points_encoded: false,
      instructions: false,
      calc_points: true,
      snap_preventions: ["ferry"],
      details: ["road_environment"],
    }),
    signal: AbortSignal.timeout(28_000),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as GraphHopperResponse;
  const path = payload.paths?.[0];
  if (!path || containsFerry(path)) return null;
  if (!snappedPointsAreClose(points, path.snapped_waypoints?.coordinates ?? [], maxSnapMeters())) return null;

  return {
    durationSeconds: path.time / 1000,
    distanceMeters: path.distance,
    geometry: path.points,
  };
}
