import { approximateSharedRoadMeters } from "./geo";
import type { RouteSegment } from "./routing-types";
import type { Place } from "./types";

export type DirectedRouteEdge = {
  from: Place;
  to: Place;
  segment: RouteSegment;
};

export type OrderedRoute = {
  order: Place[];
  edges: DirectedRouteEdge[];
  ordersTested: number;
  overlapMeters: number;
  durationSeconds: number;
  distanceMeters: number;
};

export function directedEdgeKey(from: Place, to: Place) {
  const pointKey = (point: Place) =>
    `${point.id}:${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`;
  return `${pointKey(from)}->${pointKey(to)}`;
}

export function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [
      value,
      ...rest,
    ]),
  );
}

function commonEndpoints(first: DirectedRouteEdge, second: DirectedRouteEdge) {
  const firstPoints = [first.from, first.to];
  const secondIds = new Set([second.from.id, second.to.id]);
  return firstPoints.filter((point) => secondIds.has(point.id));
}

export function totalRouteOverlapMeters(
  edges: DirectedRouteEdge[],
  overlapCache = new Map<string, number>(),
) {
  let total = 0;
  for (let firstIndex = 0; firstIndex < edges.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < edges.length; secondIndex += 1) {
      const first = edges[firstIndex];
      const second = edges[secondIndex];
      const cacheKey = [directedEdgeKey(first.from, first.to), directedEdgeKey(second.from, second.to)]
        .sort()
        .join("|");
      const cached = overlapCache.get(cacheKey);
      if (cached !== undefined) {
        total += cached;
        continue;
      }
      const exemptions = commonEndpoints(first, second);
      const secondNearFirst = approximateSharedRoadMeters(
        first.segment.geometry,
        second.segment.geometry,
        exemptions,
        5_000,
        2_000,
      );
      const firstNearSecond = approximateSharedRoadMeters(
        second.segment.geometry,
        first.segment.geometry,
        exemptions,
        5_000,
        2_000,
      );
      const overlap = Math.min(firstNearSecond, secondNearFirst);
      overlapCache.set(cacheKey, overlap);
      total += overlap;
    }
  }
  return total;
}

export function chooseLeastOverlappingOrder(
  source: Place,
  destination: Place,
  internalPoints: Place[],
  edgeMap: Map<string, DirectedRouteEdge>,
): OrderedRoute | undefined {
  const overlapCache = new Map<string, number>();
  const candidates = permutations(internalPoints).flatMap((order) => {
    const checkpoints = [source, ...order, destination];
    const edges: DirectedRouteEdge[] = [];
    for (let index = 1; index < checkpoints.length; index += 1) {
      const edge = edgeMap.get(directedEdgeKey(checkpoints[index - 1], checkpoints[index]));
      if (!edge) return [];
      edges.push(edge);
    }
    return [{
      order,
      edges,
      ordersTested: 0,
      overlapMeters: totalRouteOverlapMeters(edges, overlapCache),
      durationSeconds: edges.reduce((total, edge) => total + edge.segment.durationSeconds, 0),
      distanceMeters: edges.reduce((total, edge) => total + edge.segment.distanceMeters, 0),
    }];
  });

  const selected = candidates.sort(
    (a, b) =>
      a.overlapMeters - b.overlapMeters ||
      b.durationSeconds - a.durationSeconds ||
      b.distanceMeters - a.distanceMeters,
  )[0];
  return selected ? { ...selected, ordersTested: candidates.length } : undefined;
}
