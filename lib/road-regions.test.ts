import { describe, expect, it } from "vitest";
import { geographicMidpoint, haversineKm } from "./geo";
import {
  ROAD_REGIONS,
  farthestRegionRoadPoint,
  nearestRegionAntipodeCandidates,
  roadRegionForPlace,
  sharedRoadRegion,
} from "./road-regions";

describe("supported road regions", () => {
  it.each([
    ["Delhi", 28.6139, 77.209, "IN", "afro-eurasia"],
    ["Toronto", 43.6532, -79.3832, "CA", "north-america"],
    ["Mexico City", 19.4326, -99.1332, "MX", "north-america"],
    ["Buenos Aires", -34.6037, -58.3816, "AR", "south-america"],
    ["Lima", -12.0464, -77.0428, "PE", "south-america"],
    ["Sydney", -33.8688, 151.2093, "AU", "australia"],
  ])("assigns %s to %s", (_name, lat, lng, countryCode, expectedRegion) => {
    expect(roadRegionForPlace({ lat, lng, countryCode })?.id).toBe(expectedRegion);
  });

  it.each([
    ["Honolulu", 21.3099, -157.8581, "US"],
    ["Vancouver Island", 49.65, -125.45, "CA"],
    ["Hobart", -42.8821, 147.3272, "AU"],
    ["Ushuaia", -54.8019, -68.303, "AR"],
  ])("excludes disconnected place %s", (_name, lat, lng, countryCode) => {
    expect(roadRegionForPlace({ lat, lng, countryCode })).toBeUndefined();
  });

  it("requires both endpoints to be in the same road group", () => {
    expect(
      sharedRoadRegion(
        { lat: 40.7128, lng: -74.006, countryCode: "US" },
        { lat: 34.0522, lng: -118.2437, countryCode: "US" },
      )?.id,
    ).toBe("north-america");
    expect(
      sharedRoadRegion(
        { lat: 40.7128, lng: -74.006, countryCode: "US" },
        { lat: -34.6037, lng: -58.3816, countryCode: "AR" },
      ),
    ).toBeUndefined();
  });
});

describe.each(ROAD_REGIONS)("$name detour catalog", (region) => {
  it("uses only anchors from its own region", () => {
    const destination = region.anchors[Math.floor(region.anchors.length / 2)];
    const antipodalPoint = nearestRegionAntipodeCandidates(region, destination, 1)[0];
    const farthestPoint = farthestRegionRoadPoint(region, antipodalPoint);
    const midpoint = geographicMidpoint(antipodalPoint, farthestPoint!);
    const midpointFarthestPoint = farthestRegionRoadPoint(
      region,
      midpoint,
      undefined,
      [antipodalPoint.id, farthestPoint!.id],
    );
    const anchorIds = new Set(region.anchors.map((anchor) => anchor.id));

    expect(anchorIds.has(antipodalPoint.id)).toBe(true);
    expect(anchorIds.has(farthestPoint!.id)).toBe(true);
    expect(anchorIds.has(midpointFarthestPoint!.id)).toBe(true);
    expect(new Set([antipodalPoint.id, farthestPoint!.id, midpointFarthestPoint!.id]).size).toBe(3);
  });

  it("keeps the farthest point in the same two-percent distance band", () => {
    const first = region.anchors[0];
    const farthest = farthestRegionRoadPoint(region, first)!;
    const maximumDistance = Math.max(
      ...region.anchors
        .filter((anchor) => anchor.id !== first.id)
        .map((anchor) => haversineKm(first, anchor)),
    );

    expect(haversineKm(first, farthest)).toBeGreaterThanOrEqual(maximumDistance * 0.98);
  });
});
