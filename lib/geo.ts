import type { Coordinate, RouteGeometry } from "@/lib/types";

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function antipode(point: Coordinate): Coordinate {
  const shiftedLongitude = point.lng >= 0 ? point.lng - 180 : point.lng + 180;
  return { lat: -point.lat, lng: shiftedLongitude };
}

export function haversineKm(a: Coordinate, b: Coordinate): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.lng - a.lng);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(value));
}

export function geographicMidpoint(a: Coordinate, b: Coordinate): Coordinate {
  const shortestLongitudeDelta = ((b.lng - a.lng + 540) % 360) - 180;
  const unwrappedLongitude = a.lng + shortestLongitudeDelta / 2;
  const lng = ((unwrappedLongitude + 540) % 360) - 180;
  return { lat: (a.lat + b.lat) / 2, lng };
}

export function geometryDistanceMeters(geometry: RouteGeometry): number {
  let total = 0;
  for (let index = 1; index < geometry.coordinates.length; index += 1) {
    const [previousLng, previousLat] = geometry.coordinates[index - 1];
    const [lng, lat] = geometry.coordinates[index];
    total += haversineKm({ lat: previousLat, lng: previousLng }, { lat, lng }) * 1000;
  }
  return total;
}

function midpoint(a: [number, number], b: [number, number]): Coordinate {
  return { lat: (a[1] + b[1]) / 2, lng: (a[0] + b[0]) / 2 };
}

function cell(point: Coordinate, cellDegrees: number): string {
  return `${Math.floor(point.lat / cellDegrees)}:${Math.floor(point.lng / cellDegrees)}`;
}

export function approximateSharedRoadMeters(
  outbound: RouteGeometry,
  returning: RouteGeometry,
  exemptPoints: Coordinate[],
  exemptionMeters = 5_000,
  proximityMeters = 2_000,
): number {
  const cellDegrees = Math.max(proximityMeters / 111_320, 0.001);
  const occupied = new Set<string>();
  for (let index = 1; index < outbound.coordinates.length; index += 1) {
    const center = midpoint(outbound.coordinates[index - 1], outbound.coordinates[index]);
    if (exemptPoints.every((point) => haversineKm(center, point) * 1000 > exemptionMeters)) {
      occupied.add(cell(center, cellDegrees));
    }
  }

  let overlap = 0;
  for (let index = 1; index < returning.coordinates.length; index += 1) {
    const previous = returning.coordinates[index - 1];
    const current = returning.coordinates[index];
    const center = midpoint(previous, current);
    const latitudeScale = Math.max(Math.cos(toRadians(center.lat)), 0.2);
    const longitudeRadius = Math.ceil(1 / latitudeScale);
    const latitudeCell = Math.floor(center.lat / cellDegrees);
    const longitudeCell = Math.floor(center.lng / cellDegrees);
    let nearOutbound = false;
    for (let latOffset = -1; latOffset <= 1 && !nearOutbound; latOffset += 1) {
      for (let lngOffset = -longitudeRadius; lngOffset <= longitudeRadius; lngOffset += 1) {
        if (occupied.has(`${latitudeCell + latOffset}:${longitudeCell + lngOffset}`)) {
          nearOutbound = true;
          break;
        }
      }
    }
    if (
      nearOutbound &&
      exemptPoints.every((point) => haversineKm(center, point) * 1000 > exemptionMeters)
    ) {
      overlap +=
        haversineKm(
          { lat: previous[1], lng: previous[0] },
          { lat: current[1], lng: current[0] },
        ) * 1000;
    }
  }
  return overlap;
}

export function minimumDistanceToGeometryKm(point: Coordinate, geometry: RouteGeometry, maxSamples = 2_000) {
  if (!geometry.coordinates.length) return Number.POSITIVE_INFINITY;
  const stride = Math.max(1, Math.ceil(geometry.coordinates.length / maxSamples));
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < geometry.coordinates.length; index += stride) {
    const [lng, lat] = geometry.coordinates[index];
    minimum = Math.min(minimum, haversineKm(point, { lat, lng }));
  }
  const [lastLng, lastLat] = geometry.coordinates.at(-1)!;
  return Math.min(minimum, haversineKm(point, { lat: lastLat, lng: lastLng }));
}

export function combineGeometries(...geometries: RouteGeometry[]): RouteGeometry {
  const coordinates: [number, number][] = [];
  for (const geometry of geometries) {
    for (const coordinate of geometry.coordinates) {
      const previous = coordinates.at(-1);
      if (!previous || previous[0] !== coordinate[0] || previous[1] !== coordinate[1]) {
        coordinates.push(coordinate);
      }
    }
  }
  return { type: "LineString", coordinates };
}

export function downsampleGeometry(geometry: RouteGeometry, maxPoints = 12_000): RouteGeometry {
  if (geometry.coordinates.length <= maxPoints) return geometry;
  const stride = Math.ceil(geometry.coordinates.length / maxPoints);
  const coordinates = geometry.coordinates.filter(
    (_, index) => index === 0 || index === geometry.coordinates.length - 1 || index % stride === 0,
  );
  return { type: "LineString", coordinates };
}

export function bearingDegrees(from: Coordinate, to: Coordinate): number {
  const phi1 = toRadians(from.lat);
  const phi2 = toRadians(to.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const y = Math.sin(deltaLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}
