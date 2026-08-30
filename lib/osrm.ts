import { roadOnlyPlan, type RoutePhase } from "@/lib/road-plan";
import { snappedPointsAreClose } from "@/lib/graphhopper";
import type { RouteSegment } from "@/lib/routing-types";
import type { Place, RouteGeometry } from "@/lib/types";

type OsrmStep = { mode?: string };
type OsrmLeg = { steps: OsrmStep[] };
type OsrmRoute = { duration: number; distance: number; geometry: RouteGeometry; legs: OsrmLeg[] };
type OsrmWaypoint = { location: [number, number] };
type OsrmResponse = { code: string; routes?: OsrmRoute[]; waypoints?: OsrmWaypoint[] };

export async function routeOsrmSegment(
  checkpoints: Place[],
  phase: RoutePhase,
): Promise<RouteSegment | null> {
  const baseUrl = process.env.ROUTING_BASE_URL ?? "https://router.project-osrm.org";
  const points = roadOnlyPlan(checkpoints, phase);
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = `${baseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true&continue_straight=true`;
  const response = await fetch(url, {
    headers: { "User-Agent": process.env.APP_USER_AGENT ?? "AreWeThereYet-MVP/0.1" },
    signal: AbortSignal.timeout(18_000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as OsrmResponse;
  const route = payload.routes?.[0];
  if (payload.code !== "Ok" || !route) return null;
  if (!snappedPointsAreClose(points, payload.waypoints?.map((point) => point.location) ?? [])) return null;
  if (route.legs.some((leg) => leg.steps.some((step) => step.mode && step.mode !== "driving"))) return null;

  return { durationSeconds: route.duration, distanceMeters: route.distance, geometry: route.geometry };
}
