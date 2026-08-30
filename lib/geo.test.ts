import { describe, expect, it } from "vitest";
import {
  antipode,
  approximateSharedRoadMeters,
  downsampleGeometry,
  geographicMidpoint,
  haversineKm,
} from "./geo";

describe("antipode", () => {
  it("returns the geographic opposite of an eastern coordinate", () => {
    expect(antipode({ lat: 19.076, lng: 72.8777 })).toEqual({ lat: -19.076, lng: -107.1223 });
  });

  it("wraps western longitudes", () => {
    expect(antipode({ lat: 10, lng: -70 })).toEqual({ lat: -10, lng: 110 });
  });
});

describe("haversineKm", () => {
  it("returns zero for the same point", () => {
    expect(haversineKm({ lat: 20, lng: 75 }, { lat: 20, lng: 75 })).toBe(0);
  });
});

describe("geographicMidpoint", () => {
  it("finds the midpoint inside the regional bounding box", () => {
    expect(geographicMidpoint({ lat: 10, lng: 20 }, { lat: 30, lng: 60 })).toEqual({
      lat: 20,
      lng: 40,
    });
  });

  it("uses the short longitude span across the antimeridian", () => {
    expect(geographicMidpoint({ lat: 0, lng: 170 }, { lat: 0, lng: -170 })).toEqual({
      lat: 0,
      lng: -180,
    });
  });
});

describe("road overlap approximation", () => {
  it("detects a shared corridor outside the endpoint exemption", () => {
    const outbound = { type: "LineString" as const, coordinates: [[75, 20], [75, 21], [75, 22]] as [number, number][] };
    const returning = { type: "LineString" as const, coordinates: [[76, 23], [75, 22], [75, 21], [75, 20]] as [number, number][] };
    expect(approximateSharedRoadMeters(outbound, returning, [], 0)).toBeGreaterThan(100_000);
  });

  it("treats nearby parallel roads as a shared corridor", () => {
    const outbound = { type: "LineString" as const, coordinates: [[75, 20], [75, 21], [75, 22]] as [number, number][] };
    const nearby = { type: "LineString" as const, coordinates: [[75.01, 22], [75.01, 21], [75.01, 20]] as [number, number][] };
    const distant = { type: "LineString" as const, coordinates: [[75.08, 22], [75.08, 21], [75.08, 20]] as [number, number][] };

    expect(approximateSharedRoadMeters(outbound, nearby, [], 0, 2_000)).toBeGreaterThan(100_000);
    expect(approximateSharedRoadMeters(outbound, distant, [], 0, 2_000)).toBe(0);
  });

  it("keeps geometry endpoints while limiting response size", () => {
    const coordinates = Array.from({ length: 100 }, (_, index) => [70 + index / 100, 20] as [number, number]);
    const result = downsampleGeometry({ type: "LineString", coordinates }, 10);
    expect(result.coordinates[0]).toEqual(coordinates[0]);
    expect(result.coordinates.at(-1)).toEqual(coordinates.at(-1));
    expect(result.coordinates.length).toBeLessThanOrEqual(11);
  });
});
