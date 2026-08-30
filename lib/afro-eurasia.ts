import { antipode, haversineKm, minimumDistanceToGeometryKm } from "./geo";
import type { Coordinate, Place, RouteGeometry } from "./types";

// Mainland countries connected through physical roads, bridges, or tunnels.
// Border policy and whether a crossing is currently open are intentionally ignored.
export const AFRO_EURASIA_COUNTRY_CODES = new Set([
  // Continental Europe and the Caucasus
  "AD", "AL", "AM", "AT", "AZ", "BA", "BE", "BG", "BY", "CH", "CZ", "DE", "DK", "EE", "ES",
  "FI", "FR", "GE", "GR", "HR", "HU", "IT", "KZ", "LI", "LT", "LU", "LV", "MC", "MD", "ME",
  "MK", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "SK", "SM", "TR", "UA", "VA", "XK",
  // Mainland Asia, including road-linked peninsulas and city states
  "AE", "AF", "BD", "BH", "BT", "CN", "HK", "IL", "IN", "IQ", "IR", "JO", "KG", "KH", "KP", "KR",
  "KW", "LA", "LB", "MM", "MN", "MO", "MY", "NP", "OM", "PK", "PS", "QA", "SA", "SG", "SY", "TJ",
  "TM", "TH", "UZ", "VN", "YE",
  // Continental Africa
  "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "DJ", "DZ", "EG", "EH", "ER", "ET",
  "GA", "GH", "GM", "GN", "GQ", "GW", "KE", "LR", "LS", "LY", "MA", "ML", "MR", "MW", "MZ", "NA",
  "NE", "NG", "RW", "SD", "SL", "SN", "SO", "SS", "SZ", "TD", "TG", "TN", "TZ", "UG", "ZA", "ZM", "ZW",
]);

type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

const DISCONNECTED_ISLAND_BOUNDS: Bounds[] = [
  { minLat: 27, maxLat: 30, minLng: -18.5, maxLng: -13 }, // Canary Islands
  { minLat: 32, maxLat: 34, minLng: -17.5, maxLng: -15.5 }, // Madeira
  { minLat: 38.5, maxLat: 40.5, minLng: 1, maxLng: 4.5 }, // Balearic Islands
  { minLat: 38, maxLat: 43.5, minLng: 8, maxLng: 10.2 }, // Sardinia and Corsica
  { minLat: 36, maxLat: 38.8, minLng: 12, maxLng: 16 }, // Sicily
  { minLat: 34.5, maxLat: 35.9, minLng: 23, maxLng: 27 }, // Crete
  { minLat: 3, maxLat: 4.1, minLng: 8.3, maxLng: 9.1 }, // Bioko
  { minLat: -6.7, maxLat: -5.5, minLng: 39, maxLng: 40 }, // Zanzibar
  { minLat: 11.8, maxLat: 13.1, minLng: 53.5, maxLng: 54.8 }, // Socotra
  { minLat: 8, maxLat: 14, minLng: 71, maxLng: 74 }, // Lakshadweep
  { minLat: 5, maxLat: 15, minLng: 90, maxLng: 96 }, // Andaman and Nicobar Islands
  { minLat: 18, maxLat: 21, minLng: 108, maxLng: 112 }, // Hainan
  { minLat: -5, maxLat: 8, minLng: 108, maxLng: 120 }, // Malaysian Borneo
  { minLat: 33, maxLat: 34, minLng: 126, maxLng: 127 }, // Jeju
  { minLat: 45, maxLat: 55, minLng: 141, maxLng: 145 }, // Sakhalin
];

function insideBounds(point: Coordinate, bounds: Bounds) {
  return point.lat >= bounds.minLat && point.lat <= bounds.maxLat && point.lng >= bounds.minLng && point.lng <= bounds.maxLng;
}

export function isAfroEurasiaCoordinate(point: Coordinate) {
  if (point.lat < -36 || point.lat > 79 || point.lng < -19 || point.lng > 180) return false;
  if (point.lat < 0 && point.lng > 60) return false;
  return !DISCONNECTED_ISLAND_BOUNDS.some((bounds) => insideBounds(point, bounds));
}

export function isAfroEurasiaPlace(point: Coordinate & { countryCode?: string }) {
  const countryCode = point.countryCode?.toUpperCase();
  return Boolean(countryCode && AFRO_EURASIA_COUNTRY_CODES.has(countryCode) && isAfroEurasiaCoordinate(point));
}

// Road-accessible perimeter points approximate the nearest feasible road to an
// antipode. A dedicated continental graph index can replace this catalog later.
export const AFRO_EURASIA_PERIMETER_ANCHORS: Place[] = [
  { id: "ae-bissau", name: "Bissau, Guinea-Bissau", lat: 11.8817, lng: -15.617 },
  { id: "ae-dakar", name: "Dakar, Senegal", lat: 14.7167, lng: -17.4677 },
  { id: "ae-nouakchott", name: "Nouakchott, Mauritania", lat: 18.0735, lng: -15.9582 },
  { id: "ae-dakhla", name: "Dakhla, Western Sahara", lat: 23.6848, lng: -15.958 },
  { id: "ae-tangier", name: "Tangier, Morocco", lat: 35.7595, lng: -5.834 },
  { id: "ae-lisbon", name: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393 },
  { id: "ae-a-coruna", name: "A Coruña, Spain", lat: 43.3623, lng: -8.4115 },
  { id: "ae-brest", name: "Brest, France", lat: 48.3904, lng: -4.4861 },
  { id: "ae-rotterdam", name: "Rotterdam, Netherlands", lat: 51.9244, lng: 4.4777 },
  { id: "ae-skagen", name: "Skagen, Denmark", lat: 57.72, lng: 10.5839 },
  { id: "ae-nordkapp", name: "Nordkapp road, Norway", lat: 71.1695, lng: 25.7832 },
  { id: "ae-murmansk", name: "Murmansk, Russia", lat: 68.9585, lng: 33.0827 },
  { id: "ae-arkhangelsk", name: "Arkhangelsk, Russia", lat: 64.5393, lng: 40.5187 },
  { id: "ae-vanino", name: "Vanino, Russia", lat: 49.0869, lng: 140.255 },
  { id: "ae-khabarovsk", name: "Khabarovsk, Russia", lat: 48.4802, lng: 135.0719 },
  { id: "ae-vladivostok", name: "Vladivostok, Russia", lat: 43.1155, lng: 131.8855 },
  { id: "ae-seoul", name: "Seoul, South Korea", lat: 37.5665, lng: 126.978 },
  { id: "ae-shanghai", name: "Shanghai, China", lat: 31.2304, lng: 121.4737 },
  { id: "ae-fuzhou", name: "Fuzhou, China", lat: 26.0745, lng: 119.2965 },
  { id: "ae-shenzhen", name: "Shenzhen, China", lat: 22.5431, lng: 114.0579 },
  { id: "ae-hanoi", name: "Hanoi, Vietnam", lat: 21.0278, lng: 105.8342 },
  { id: "ae-ho-chi-minh", name: "Ho Chi Minh City, Vietnam", lat: 10.8231, lng: 106.6297 },
  { id: "ae-singapore", name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { id: "ae-dawei", name: "Dawei, Myanmar", lat: 14.0738, lng: 98.1942 },
  { id: "ae-coxs-bazar", name: "Cox's Bazar, Bangladesh", lat: 21.4272, lng: 92.0058 },
  { id: "ae-kanyakumari", name: "Kanyakumari, India", lat: 8.0883, lng: 77.5385 },
  { id: "ae-kochi", name: "Kochi, India", lat: 9.9312, lng: 76.2673 },
  { id: "ae-karachi", name: "Karachi, Pakistan", lat: 24.8607, lng: 67.0011 },
  { id: "ae-gwadar", name: "Gwadar, Pakistan", lat: 25.1264, lng: 62.3225 },
  { id: "ae-salalah", name: "Salalah, Oman", lat: 17.0194, lng: 54.0897 },
  { id: "ae-aden", name: "Aden, Yemen", lat: 12.7855, lng: 45.0187 },
  { id: "ae-djibouti", name: "Djibouti", lat: 11.5721, lng: 43.1456 },
  { id: "ae-mogadishu", name: "Mogadishu, Somalia", lat: 2.0469, lng: 45.3182 },
  { id: "ae-mombasa", name: "Mombasa, Kenya", lat: -4.0435, lng: 39.6682 },
  { id: "ae-maputo", name: "Maputo, Mozambique", lat: -25.9692, lng: 32.5732 },
  { id: "ae-durban", name: "Durban, South Africa", lat: -29.8587, lng: 31.0218 },
  { id: "ae-gqeberha", name: "Gqeberha, South Africa", lat: -33.9608, lng: 25.6022 },
  { id: "ae-cape-agulhas", name: "Cape Agulhas road, South Africa", lat: -34.831, lng: 20.0 },
  { id: "ae-cape-town", name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
  { id: "ae-luderitz", name: "Lüderitz, Namibia", lat: -26.6481, lng: 15.1594 },
  { id: "ae-walvis-bay", name: "Walvis Bay, Namibia", lat: -22.9576, lng: 14.5053 },
  { id: "ae-luanda", name: "Luanda, Angola", lat: -8.839, lng: 13.2894 },
  { id: "ae-pointe-noire", name: "Pointe-Noire, Republic of the Congo", lat: -4.7692, lng: 11.8664 },
  { id: "ae-libreville", name: "Libreville, Gabon", lat: 0.4162, lng: 9.4673 },
  { id: "ae-douala", name: "Douala, Cameroon", lat: 4.0511, lng: 9.7679 },
  { id: "ae-lagos", name: "Lagos, Nigeria", lat: 6.5244, lng: 3.3792 },
  { id: "ae-accra", name: "Accra, Ghana", lat: 5.6037, lng: -0.187 },
  { id: "ae-freetown", name: "Freetown, Sierra Leone", lat: 8.4657, lng: -13.2317 },
  { id: "ae-conakry", name: "Conakry, Guinea", lat: 9.6412, lng: -13.5784 },
  { id: "ae-alexandria", name: "Alexandria, Egypt", lat: 31.2001, lng: 29.9187 },
  { id: "ae-port-said", name: "Port Said, Egypt", lat: 31.2653, lng: 32.3019 },
];

const FERRY_PRONE_ANCHOR_IDS = new Set([
  "ae-bissau",
  "ae-vanino",
  "ae-khabarovsk",
  "ae-vladivostok",
  "ae-seoul",
]);

export const AFRO_EURASIA_ROUTABLE_ANCHORS = AFRO_EURASIA_PERIMETER_ANCHORS.filter(
  (anchor) => !FERRY_PRONE_ANCHOR_IDS.has(anchor.id),
);

export function nearestAfroEurasiaAntipodeCandidates(destination: Coordinate, limit = 2) {
  const target = antipode(destination);
  return [...AFRO_EURASIA_ROUTABLE_ANCHORS]
    .sort((a, b) => haversineKm(a, target) - haversineKm(b, target))
    .slice(0, limit);
}

export function farthestAfroEurasiaRoadPoint(
  from: Coordinate & { id?: string },
  avoidedGeometry?: RouteGeometry,
  excludedAnchorIds: Iterable<string> = [],
) {
  const excludedIds = new Set(excludedAnchorIds);
  const ranked = AFRO_EURASIA_ROUTABLE_ANCHORS
    .filter((anchor) => anchor.id !== from.id && !excludedIds.has(anchor.id))
    .map((anchor) => ({
      anchor,
      distanceKm: haversineKm(from, anchor),
      separationKm: avoidedGeometry ? minimumDistanceToGeometryKm(anchor, avoidedGeometry) : 0,
    }))
    .sort((a, b) => b.distanceKm - a.distanceKm);

  const maximumDistance = ranked[0]?.distanceKm ?? 0;
  const farthestBand = ranked.filter((entry) => entry.distanceKm >= maximumDistance * 0.98);
  return [...farthestBand].sort(
    (a, b) => b.separationKm - a.separationKm || b.distanceKm - a.distanceKm,
  )[0]?.anchor;
}
