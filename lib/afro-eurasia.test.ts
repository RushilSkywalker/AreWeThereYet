import { describe, expect, it } from "vitest";
import {
  AFRO_EURASIA_ROUTABLE_ANCHORS,
  farthestAfroEurasiaRoadPoint,
  isAfroEurasiaCoordinate,
  isAfroEurasiaPlace,
  nearestAfroEurasiaAntipodeCandidates,
} from "./afro-eurasia";
import { geographicMidpoint, haversineKm } from "./geo";

describe("Afro-Eurasia region membership", () => {
  it.each([
    ["Paris", 48.8566, 2.3522, "FR"],
    ["Nairobi", -1.2921, 36.8219, "KE"],
    ["Delhi", 28.6139, 77.209, "IN"],
    ["Seoul", 37.5665, 126.978, "KR"],
  ])("includes road-connected mainland place %s", (_name, lat, lng, countryCode) => {
    expect(isAfroEurasiaPlace({ lat, lng, countryCode })).toBe(true);
  });

  it.each([
    ["London", 51.5072, -0.1276, "GB"],
    ["Tokyo", 35.6762, 139.6503, "JP"],
    ["Sydney", -33.8688, 151.2093, "AU"],
    ["Antananarivo", -18.8792, 47.5079, "MG"],
  ])("excludes disconnected land group place %s", (_name, lat, lng, countryCode) => {
    expect(isAfroEurasiaPlace({ lat, lng, countryCode })).toBe(false);
  });

  it.each([
    ["Corsica", 42.0396, 9.0129],
    ["Hainan", 19.2, 109.7],
    ["Andaman", 11.7401, 92.6586],
    ["Borneo", 3.139, 113.041],
  ])("excludes disconnected island territory %s", (_name, lat, lng) => {
    expect(isAfroEurasiaCoordinate({ lat, lng })).toBe(false);
  });
});

describe("continental detour catalog", () => {
  it("returns exactly two nearby antipodal candidates", () => {
    const candidates = nearestAfroEurasiaAntipodeCandidates({ lat: 52.52, lng: 13.405 }, 2);
    expect(candidates).toHaveLength(2);
    expect(candidates.every(isAfroEurasiaCoordinate)).toBe(true);
  });

  it("returns a road point within the farthest two-percent distance band", () => {
    const candidate = nearestAfroEurasiaAntipodeCandidates({ lat: 28.6139, lng: 77.209 }, 1)[0];
    const farthest = farthestAfroEurasiaRoadPoint(candidate);
    const maximumDistance = Math.max(
      ...AFRO_EURASIA_ROUTABLE_ANCHORS
        .filter((anchor) => anchor.id !== candidate.id)
        .map((anchor) => haversineKm(candidate, anchor)),
    );
    expect(farthest?.id).not.toBe(candidate.id);
    expect(haversineKm(candidate, farthest!)).toBeGreaterThanOrEqual(maximumDistance * 0.98);
    expect(isAfroEurasiaCoordinate(farthest!)).toBe(true);
  });

  it("finds a distinct farthest road point from the midpoint of the first two extremes", () => {
    const antipodalPoint = nearestAfroEurasiaAntipodeCandidates({ lat: 52.52, lng: 13.405 }, 1)[0];
    const firstExtreme = farthestAfroEurasiaRoadPoint(antipodalPoint)!;
    const midpoint = geographicMidpoint(antipodalPoint, firstExtreme);
    const thirdExtreme = farthestAfroEurasiaRoadPoint(
      midpoint,
      undefined,
      [antipodalPoint.id, firstExtreme.id],
    );
    const eligible = AFRO_EURASIA_ROUTABLE_ANCHORS.filter(
      (anchor) => anchor.id !== antipodalPoint.id && anchor.id !== firstExtreme.id,
    );
    const maximumDistance = Math.max(...eligible.map((anchor) => haversineKm(midpoint, anchor)));

    expect(thirdExtreme?.id).not.toBe(antipodalPoint.id);
    expect(thirdExtreme?.id).not.toBe(firstExtreme.id);
    expect(haversineKm(midpoint, thirdExtreme!)).toBeGreaterThanOrEqual(maximumDistance * 0.98);
  });
});
