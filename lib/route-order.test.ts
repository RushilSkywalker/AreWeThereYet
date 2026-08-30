import { describe, expect, it } from "vitest";
import {
  chooseLeastOverlappingOrder,
  directedEdgeKey,
  permutations,
  type DirectedRouteEdge,
} from "./route-order";
import type { Place, RouteGeometry } from "./types";

const source: Place = { id: "source", name: "Source", lat: 0, lng: 0 };
const pointA: Place = { id: "a", name: "A", lat: 0, lng: 1 };
const pointB: Place = { id: "b", name: "B", lat: 0, lng: 2 };
const pointC: Place = { id: "c", name: "C", lat: 0, lng: 3 };
const destination: Place = { id: "destination", name: "Destination", lat: 0, lng: 4 };

function geometry(lat: number): RouteGeometry {
  return { type: "LineString", coordinates: [[0, lat], [1, lat]] };
}

function edge(from: Place, to: Place, routeGeometry: RouteGeometry, durationSeconds = 1) {
  return {
    from,
    to,
    segment: { geometry: routeGeometry, durationSeconds, distanceMeters: 1_000 },
  } satisfies DirectedRouteEdge;
}

describe("route-order optimizer", () => {
  it("enumerates all six orders for three internal points", () => {
    const orders = permutations([pointA, pointB, pointC]);
    expect(orders).toHaveLength(6);
    expect(new Set(orders.map((order) => order.map((point) => point.id).join(""))).size).toBe(6);
  });

  it("chooses minimum corridor overlap before maximum duration", () => {
    const points = [pointA, pointB, pointC];
    const preferredKeys = new Map([
      [directedEdgeKey(source, pointA), geometry(20)],
      [directedEdgeKey(pointA, pointB), geometry(30)],
      [directedEdgeKey(pointB, pointC), geometry(40)],
      [directedEdgeKey(pointC, destination), geometry(50)],
    ]);
    const requests = [
      ...points.map((point) => [source, point] as const),
      ...points.flatMap((from) =>
        points.filter((to) => to.id !== from.id).map((to) => [from, to] as const),
      ),
      ...points.map((point) => [point, destination] as const),
    ];
    const edgeMap = new Map(
      requests.map(([from, to]) => {
        const key = directedEdgeKey(from, to);
        const isPreferred = preferredKeys.has(key);
        const routeEdge = edge(
          from,
          to,
          preferredKeys.get(key) ?? geometry(0),
          isPreferred ? 1 : 10_000,
        );
        return [key, routeEdge];
      }),
    );

    const selected = chooseLeastOverlappingOrder(source, destination, points, edgeMap);
    expect(selected?.order.map((point) => point.id)).toEqual(["a", "b", "c"]);
    expect(selected?.ordersTested).toBe(6);
    expect(selected?.overlapMeters).toBe(0);
  });
});
