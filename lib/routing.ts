import { routeGraphHopperSegment } from "@/lib/graphhopper";
import { routeOsrmSegment } from "@/lib/osrm";
import type { RoutePhase } from "@/lib/road-plan";
import type { RouteSegment } from "@/lib/routing-types";
import type { Place } from "@/lib/types";

export function hasContinentalRoutingProvider() {
  return Boolean(process.env.GRAPHHOPPER_API_KEY || process.env.ROUTING_BASE_URL);
}

export async function routeSegment(checkpoints: Place[], phase: RoutePhase): Promise<RouteSegment | null> {
  if (process.env.GRAPHHOPPER_API_KEY) return routeGraphHopperSegment(checkpoints, phase);
  return routeOsrmSegment(checkpoints, phase);
}
