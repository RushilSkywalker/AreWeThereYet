import { haversineKm } from "./geo";
import type { Coordinate, Place } from "./types";

export type RoutePhase = "outbound" | "return";

const AFRICAN_COUNTRY_CODES = new Set([
  "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "DJ", "DZ", "EG", "EH", "ER", "ET",
  "GA", "GH", "GM", "GN", "GQ", "GW", "KE", "LR", "LS", "LY", "MA", "ML", "MR", "MW", "MZ", "NA",
  "NE", "NG", "RW", "SD", "SL", "SN", "SO", "SS", "SZ", "TD", "TG", "TN", "TZ", "UG", "ZA", "ZM", "ZW",
]);

const OUTBOUND_AFRICA_GATEWAY: Place = {
  id: "gateway-ahmed-hamdi",
  name: "Ahmed Hamdi road gateway, Egypt",
  lat: 29.95,
  lng: 32.59,
  countryCode: "EG",
};
const RETURN_AFRICA_GATEWAY: Place = {
  id: "gateway-east-ismailia",
  name: "East Ismailia road gateway, Egypt",
  lat: 30.58,
  lng: 32.36,
  countryCode: "EG",
};
const AFRICA_NORTH_SPINE: Place = {
  id: "gateway-cairo",
  name: "Cairo road spine, Egypt",
  lat: 30.0444,
  lng: 31.2357,
  countryCode: "EG",
};

function isAfrican(point: Coordinate & { countryCode?: string }) {
  if (point.countryCode) return AFRICAN_COUNTRY_CODES.has(point.countryCode.toUpperCase());
  return point.lng < 46 && point.lat < 36 && (point.lat < 12 || point.lng < 35);
}

function addIntermediate(points: Place[], intermediate: Place, start: Place, end: Place) {
  if (haversineKm(start, intermediate) > 25 && haversineKm(intermediate, end) > 25) points.push(intermediate);
}

export function roadOnlyPlan(checkpoints: Place[], phase: RoutePhase) {
  if (checkpoints.length < 2) return checkpoints;
  const points: Place[] = [checkpoints[0]];
  let crossingIndex = phase === "outbound" ? 0 : 1;

  for (let index = 1; index < checkpoints.length; index += 1) {
    const start = checkpoints[index - 1];
    const end = checkpoints[index];
    const startIsAfrican = isAfrican(start);
    const endIsAfrican = isAfrican(end);

    if (startIsAfrican !== endIsAfrican) {
      const gateway = crossingIndex % 2 === 0 ? OUTBOUND_AFRICA_GATEWAY : RETURN_AFRICA_GATEWAY;
      addIntermediate(points, gateway, start, end);
      crossingIndex += 1;
    } else if (startIsAfrican && haversineKm(start, end) > 2_500) {
      addIntermediate(points, AFRICA_NORTH_SPINE, start, end);
    }
    points.push(end);
  }

  return points;
}
