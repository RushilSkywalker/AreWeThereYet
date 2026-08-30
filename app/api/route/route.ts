import { NextResponse } from "next/server";
import { z } from "zod";
import {
  antipode,
  combineGeometries,
  downsampleGeometry,
  geographicMidpoint,
} from "@/lib/geo";
import {
  farthestRegionRoadPoint,
  nearestRegionAntipodeCandidates,
  roadRegionForPlace,
  sharedRoadRegion,
} from "@/lib/road-regions";
import {
  chooseLeastOverlappingOrder,
  directedEdgeKey,
  type DirectedRouteEdge,
} from "@/lib/route-order";
import type { RoutePhase } from "@/lib/road-plan";
import { hasContinentalRoutingProvider, routeSegment } from "@/lib/routing";
import type { Place } from "@/lib/types";

export const maxDuration = 60;

const placeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  countryCode: z.string().length(2),
});

const requestSchema = z.object({ source: placeSchema, destination: placeSchema });
const routeCache = new Map<string, { expiresAt: number; payload: Record<string, unknown> }>();
const edgeRouteCache = new Map<string, { expiresAt: number; edge: DirectedRouteEdge }>();

type EdgeRequest = { from: Place; to: Place; phase: RoutePhase };

function edgeRequestKey(request: EdgeRequest) {
  return `${request.phase}:${directedEdgeKey(request.from, request.to)}`;
}

async function routeEdges(requests: EdgeRequest[], concurrency = 1) {
  const results: Array<DirectedRouteEdge | null> = Array(requests.length).fill(null);
  const pendingIndices: number[] = [];
  const now = Date.now();
  requests.forEach((request, index) => {
    const cached = edgeRouteCache.get(edgeRequestKey(request));
    if (cached && cached.expiresAt > now) results[index] = cached.edge;
    else pendingIndices.push(index);
  });

  async function run(indices: number[], workerCount: number) {
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < indices.length) {
        const resultIndex = indices[nextIndex];
        nextIndex += 1;
        const request = requests[resultIndex];
        const segment = await routeSegment([request.from, request.to], request.phase).catch(() => null);
        if (segment) {
          const edge = { from: request.from, to: request.to, segment };
          results[resultIndex] = edge;
          edgeRouteCache.set(edgeRequestKey(request), {
            expiresAt: Date.now() + 60 * 60 * 1000,
            edge,
          });
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(workerCount, indices.length) }, () => worker()),
    );
  }

  await run(pendingIndices, concurrency);
  return results.filter((result): result is DirectedRouteEdge => Boolean(result));
}

function internalEdgePhase(from: Place, to: Place): RoutePhase {
  return from.id.localeCompare(to.id) < 0 ? "outbound" : "return";
}

function routingError() {
  return hasContinentalRoutingProvider()
    ? "We found roads, but none were prepared to participate in this terrible idea."
    : "Continental routing is not configured yet. Add a GraphHopper API key to calculate this route.";
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid source and destination inside a supported road region." },
      { status: 400 },
    );
  }

  const { source, destination } = parsed.data;
  const sourceRegion = roadRegionForPlace(source);
  const destinationRegion = roadRegionForPlace(destination);
  if (!sourceRegion || !destinationRegion) {
    return NextResponse.json(
      { error: "Both places must be inside one of the supported road regions." },
      { status: 400 },
    );
  }
  const region = sharedRoadRegion(source, destination);
  if (!region) {
    return NextResponse.json(
      {
        code: "CROSS_REGION",
        error: `There is no continuous roadway connecting ${sourceRegion.name} and ${destinationRegion.name}.`,
        sourceRegion: sourceRegion.name,
        destinationRegion: destinationRegion.name,
      },
      { status: 400 },
    );
  }

  const cacheKey = `v5:${region.id}:${[source.lat, source.lng, destination.lat, destination.lng]
    .map((value) => value.toFixed(5))
    .join(":")}`;
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.payload);

  const target = antipode(destination);
  const antipodalPoint = nearestRegionAntipodeCandidates(region, destination, 1)[0];
  if (!antipodalPoint) return NextResponse.json({ error: routingError() }, { status: 502 });

  const farthestPoint = farthestRegionRoadPoint(region, antipodalPoint);
  if (!farthestPoint) return NextResponse.json({ error: routingError() }, { status: 502 });

  const midpoint = geographicMidpoint(antipodalPoint, farthestPoint);
  const midpointFarthestPoint = farthestRegionRoadPoint(
    region,
    midpoint,
    undefined,
    [antipodalPoint.id, farthestPoint.id],
  );
  if (!midpointFarthestPoint) return NextResponse.json({ error: routingError() }, { status: 502 });

  const internalPoints = [antipodalPoint, farthestPoint, midpointFarthestPoint];
  const baselineRequests: EdgeRequest[] = [
    { from: source, to: antipodalPoint, phase: "outbound" },
    {
      from: antipodalPoint,
      to: farthestPoint,
      phase: internalEdgePhase(antipodalPoint, farthestPoint),
    },
    {
      from: farthestPoint,
      to: midpointFarthestPoint,
      phase: internalEdgePhase(farthestPoint, midpointFarthestPoint),
    },
    { from: midpointFarthestPoint, to: destination, phase: "return" },
  ];
  const allRequests: EdgeRequest[] = [
    ...internalPoints.map((point) => ({ from: source, to: point, phase: "outbound" as const })),
    ...internalPoints.flatMap((from) =>
      internalPoints
        .filter((to) => to.id !== from.id)
        .map((to) => ({ from, to, phase: internalEdgePhase(from, to) })),
    ),
    ...internalPoints.map((point) => ({ from: point, to: destination, phase: "return" as const })),
  ];
  const requestedKeys = new Set<string>();
  const edgeRequests = [...baselineRequests, ...allRequests].filter((request) => {
    const key = directedEdgeKey(request.from, request.to);
    if (requestedKeys.has(key)) return false;
    requestedKeys.add(key);
    return true;
  });
  const routedEdges = await routeEdges(edgeRequests);
  const edgeMap = new Map(routedEdges.map((edge) => [directedEdgeKey(edge.from, edge.to), edge]));
  const selectedRoute = chooseLeastOverlappingOrder(
    source,
    destination,
    internalPoints,
    edgeMap,
  );
  if (!selectedRoute) return NextResponse.json({ error: routingError() }, { status: 502 });

  const nearbyRoadMeters = selectedRoute.overlapMeters;
  const isFallback = nearbyRoadMeters > 10_000;
  const geometry = combineGeometries(...selectedRoute.edges.map((edge) => edge.segment.geometry));
  const outboundGeometry = selectedRoute.edges[0].segment.geometry;
  const returnGeometry = combineGeometries(
    ...selectedRoute.edges.slice(1).map((edge) => edge.segment.geometry),
  );
  const payload = {
    region: { id: region.id, name: region.name },
    source,
    destination,
    waypoint: antipodalPoint,
    farthestPoint,
    midpoint,
    midpointFarthestPoint,
    visitOrder: selectedRoute.order,
    ordersTested: selectedRoute.ordersTested,
    antipode: target,
    geometry: downsampleGeometry(geometry, 6_000),
    outboundGeometry: downsampleGeometry(outboundGeometry, 2_000),
    returnGeometry: downsampleGeometry(returnGeometry, 4_500),
    durationSeconds: selectedRoute.durationSeconds,
    distanceMeters: selectedRoute.distanceMeters,
    sharedRoadMeters: Math.round(nearbyRoadMeters),
    isFallback,
  };
  routeCache.set(cacheKey, { expiresAt: Date.now() + 60 * 60 * 1000, payload });
  return NextResponse.json(payload);
}
