import {
  AFRO_EURASIA_COUNTRY_CODES,
  AFRO_EURASIA_ROUTABLE_ANCHORS,
  isAfroEurasiaCoordinate,
} from "./afro-eurasia";
import { antipode, haversineKm, minimumDistanceToGeometryKm } from "./geo";
import type { Coordinate, Place, RouteGeometry } from "./types";

export type RoadRegionId =
  | "afro-eurasia"
  | "north-america"
  | "south-america"
  | "australia";

export type RoadRegion = {
  id: RoadRegionId;
  name: string;
  countryCodes: ReadonlySet<string>;
  anchors: readonly Place[];
  containsCoordinate: (point: Coordinate) => boolean;
};

type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

function insideBounds(point: Coordinate, bounds: Bounds) {
  return point.lat >= bounds.minLat && point.lat <= bounds.maxLat && point.lng >= bounds.minLng && point.lng <= bounds.maxLng;
}

const NORTH_AMERICA_COUNTRY_CODES = new Set([
  "BZ", "CA", "CR", "GT", "HN", "MX", "NI", "PA", "SV", "US",
]);

const NORTH_AMERICA_DISCONNECTED_BOUNDS: Bounds[] = [
  { minLat: 18, maxLat: 23, minLng: -161, maxLng: -154 }, // Hawaii
  { minLat: 46, maxLat: 52.5, minLng: -60, maxLng: -52 }, // Newfoundland
  { minLat: 48, maxLat: 51.2, minLng: -129, maxLng: -123 }, // Vancouver Island
  { minLat: 19.4, maxLat: 21.7, minLng: -88, maxLng: -86 }, // Cozumel and nearby islands
];

function isNorthAmericaCoordinate(point: Coordinate) {
  if (!insideBounds(point, { minLat: 7, maxLat: 72, minLng: -169, maxLng: -52 })) return false;
  if (point.lat > 50 && point.lng < -152) return false; // Road-isolated western Alaska and Aleutians
  if (point.lat > 60 && point.lng > -90) return false; // Canadian Arctic islands
  return !NORTH_AMERICA_DISCONNECTED_BOUNDS.some((bounds) => insideBounds(point, bounds));
}

const NORTH_AMERICA_ANCHORS: Place[] = [
  { id: "na-tuktoyaktuk", name: "Tuktoyaktuk, Canada", lat: 69.4454, lng: -133.0342 },
  { id: "na-deadhorse", name: "Deadhorse, Alaska", lat: 70.2002, lng: -148.4597 },
  { id: "na-fairbanks", name: "Fairbanks, Alaska", lat: 64.8378, lng: -147.7164 },
  { id: "na-homer", name: "Homer, Alaska", lat: 59.6425, lng: -151.5483 },
  { id: "na-haines", name: "Haines, Alaska", lat: 59.2358, lng: -135.445 },
  { id: "na-prince-rupert", name: "Prince Rupert, Canada", lat: 54.315, lng: -130.3208 },
  { id: "na-vancouver", name: "Vancouver, Canada", lat: 49.2827, lng: -123.1207 },
  { id: "na-tijuana", name: "Tijuana, Mexico", lat: 32.5149, lng: -117.0382 },
  { id: "na-cabo-san-lucas", name: "Cabo San Lucas, Mexico", lat: 22.8905, lng: -109.9167 },
  { id: "na-mazatlan", name: "Mazatlán, Mexico", lat: 23.2494, lng: -106.4111 },
  { id: "na-acapulco", name: "Acapulco, Mexico", lat: 16.8531, lng: -99.8237 },
  { id: "na-puerto-escondido", name: "Puerto Escondido, Mexico", lat: 15.8719, lng: -97.0767 },
  { id: "na-tapachula", name: "Tapachula, Mexico", lat: 14.9056, lng: -92.2634 },
  { id: "na-acajutla", name: "Acajutla, El Salvador", lat: 13.5928, lng: -89.8275 },
  { id: "na-san-juan-del-sur", name: "San Juan del Sur, Nicaragua", lat: 11.2529, lng: -85.8705 },
  { id: "na-david", name: "David, Panama", lat: 8.4273, lng: -82.4308 },
  { id: "na-yaviza", name: "Yaviza road end, Panama", lat: 8.1583, lng: -77.6917 },
  { id: "na-panama-city", name: "Panama City, Panama", lat: 8.9824, lng: -79.5199 },
  { id: "na-portobelo", name: "Portobelo, Panama", lat: 9.554, lng: -79.6557 },
  { id: "na-puerto-limon", name: "Puerto Limón, Costa Rica", lat: 9.9913, lng: -83.0415 },
  { id: "na-puerto-cortes", name: "Puerto Cortés, Honduras", lat: 15.8256, lng: -87.9297 },
  { id: "na-belize-city", name: "Belize City, Belize", lat: 17.5046, lng: -88.1962 },
  { id: "na-cancun", name: "Cancún, Mexico", lat: 21.1619, lng: -86.8515 },
  { id: "na-key-west", name: "Key West, Florida", lat: 24.5551, lng: -81.78 },
  { id: "na-miami", name: "Miami, Florida", lat: 25.7617, lng: -80.1918 },
  { id: "na-boston", name: "Boston, Massachusetts", lat: 42.3601, lng: -71.0589 },
  { id: "na-halifax", name: "Halifax, Canada", lat: 44.6488, lng: -63.5752 },
  { id: "na-gaspe", name: "Gaspé, Canada", lat: 48.8316, lng: -64.4819 },
  { id: "na-goose-bay", name: "Happy Valley-Goose Bay, Canada", lat: 53.3017, lng: -60.3261 },
  { id: "na-yellowknife", name: "Yellowknife, Canada", lat: 62.454, lng: -114.3718 },
];

const SOUTH_AMERICA_COUNTRY_CODES = new Set([
  "AR", "BO", "BR", "CL", "CO", "EC", "GF", "GY", "PE", "PY", "SR", "UY", "VE",
]);

const SOUTH_AMERICA_DISCONNECTED_BOUNDS: Bounds[] = [
  { minLat: -44.2, maxLat: -41, minLng: -75, maxLng: -73 }, // Chiloé and nearby islands
  { minLat: -56, maxLat: -53.4, minLng: -72.5, maxLng: -64 }, // Tierra del Fuego
];

function isSouthAmericaCoordinate(point: Coordinate) {
  if (!insideBounds(point, { minLat: -56, maxLat: 13, minLng: -82, maxLng: -34 })) return false;
  return !SOUTH_AMERICA_DISCONNECTED_BOUNDS.some((bounds) => insideBounds(point, bounds));
}

const SOUTH_AMERICA_ANCHORS: Place[] = [
  { id: "sa-turbo", name: "Turbo, Colombia", lat: 8.0937, lng: -76.7269 },
  { id: "sa-cartagena", name: "Cartagena, Colombia", lat: 10.391, lng: -75.4794 },
  { id: "sa-santa-marta", name: "Santa Marta, Colombia", lat: 11.2408, lng: -74.199 },
  { id: "sa-riohacha", name: "Riohacha, Colombia", lat: 11.5444, lng: -72.9072 },
  { id: "sa-maracaibo", name: "Maracaibo, Venezuela", lat: 10.6545, lng: -71.6406 },
  { id: "sa-coro", name: "Coro, Venezuela", lat: 11.3947, lng: -69.681 },
  { id: "sa-caracas", name: "Caracas, Venezuela", lat: 10.4806, lng: -66.9036 },
  { id: "sa-cumana", name: "Cumaná, Venezuela", lat: 10.449, lng: -64.1305 },
  { id: "sa-fortaleza", name: "Fortaleza, Brazil", lat: -3.7319, lng: -38.5267 },
  { id: "sa-natal", name: "Natal, Brazil", lat: -5.7793, lng: -35.2009 },
  { id: "sa-recife", name: "Recife, Brazil", lat: -8.0476, lng: -34.877 },
  { id: "sa-salvador", name: "Salvador, Brazil", lat: -12.9777, lng: -38.5016 },
  { id: "sa-vitoria", name: "Vitória, Brazil", lat: -20.3155, lng: -40.3128 },
  { id: "sa-rio", name: "Rio de Janeiro, Brazil", lat: -22.9068, lng: -43.1729 },
  { id: "sa-florianopolis", name: "Florianópolis road gateway, Brazil", lat: -27.5954, lng: -48.548 },
  { id: "sa-porto-alegre", name: "Porto Alegre, Brazil", lat: -30.0346, lng: -51.2177 },
  { id: "sa-chui", name: "Chuí, Brazil", lat: -33.6917, lng: -53.4567 },
  { id: "sa-montevideo", name: "Montevideo, Uruguay", lat: -34.9011, lng: -56.1645 },
  { id: "sa-mar-del-plata", name: "Mar del Plata, Argentina", lat: -38.0055, lng: -57.5426 },
  { id: "sa-comodoro-rivadavia", name: "Comodoro Rivadavia, Argentina", lat: -45.8641, lng: -67.4966 },
  { id: "sa-rio-gallegos", name: "Río Gallegos, Argentina", lat: -51.623, lng: -69.2168 },
  { id: "sa-punta-arenas", name: "Punta Arenas, Chile", lat: -53.1638, lng: -70.9171 },
  { id: "sa-puerto-natales", name: "Puerto Natales, Chile", lat: -51.7269, lng: -72.506 },
  { id: "sa-puerto-montt", name: "Puerto Montt, Chile", lat: -41.4689, lng: -72.9411 },
  { id: "sa-concepcion", name: "Concepción, Chile", lat: -36.8201, lng: -73.0444 },
  { id: "sa-valparaiso", name: "Valparaíso, Chile", lat: -33.0472, lng: -71.6127 },
  { id: "sa-la-serena", name: "La Serena, Chile", lat: -29.9027, lng: -71.2519 },
  { id: "sa-antofagasta", name: "Antofagasta, Chile", lat: -23.6509, lng: -70.3975 },
  { id: "sa-arica", name: "Arica, Chile", lat: -18.4783, lng: -70.3126 },
  { id: "sa-lima", name: "Lima, Peru", lat: -12.0464, lng: -77.0428 },
  { id: "sa-guayaquil", name: "Guayaquil, Ecuador", lat: -2.1709, lng: -79.9224 },
  { id: "sa-esmeraldas", name: "Esmeraldas, Ecuador", lat: 0.9682, lng: -79.6517 },
  { id: "sa-buenaventura", name: "Buenaventura, Colombia", lat: 3.8801, lng: -77.0312 },
];

const AUSTRALIA_COUNTRY_CODES = new Set(["AU"]);

function isAustraliaCoordinate(point: Coordinate) {
  return insideBounds(point, { minLat: -39.2, maxLat: -10, minLng: 112, maxLng: 154.5 });
}

const AUSTRALIA_ANCHORS: Place[] = [
  { id: "au-darwin", name: "Darwin, Australia", lat: -12.4634, lng: 130.8456 },
  { id: "au-wyndham", name: "Wyndham, Australia", lat: -15.4869, lng: 128.1236 },
  { id: "au-broome", name: "Broome, Australia", lat: -17.9614, lng: 122.2359 },
  { id: "au-port-hedland", name: "Port Hedland, Australia", lat: -20.31, lng: 118.6011 },
  { id: "au-exmouth", name: "Exmouth, Australia", lat: -21.9445, lng: 114.1267 },
  { id: "au-geraldton", name: "Geraldton, Australia", lat: -28.7774, lng: 114.6149 },
  { id: "au-perth", name: "Perth, Australia", lat: -31.9523, lng: 115.8613 },
  { id: "au-augusta", name: "Augusta, Australia", lat: -34.315, lng: 115.159 },
  { id: "au-albany", name: "Albany, Australia", lat: -35.0275, lng: 117.884 },
  { id: "au-esperance", name: "Esperance, Australia", lat: -33.8608, lng: 121.8896 },
  { id: "au-ceduna", name: "Ceduna, Australia", lat: -32.1266, lng: 133.6763 },
  { id: "au-adelaide", name: "Adelaide, Australia", lat: -34.9285, lng: 138.6007 },
  { id: "au-portland", name: "Portland, Australia", lat: -38.3499, lng: 141.6041 },
  { id: "au-melbourne", name: "Melbourne, Australia", lat: -37.8136, lng: 144.9631 },
  { id: "au-eden", name: "Eden, Australia", lat: -37.0658, lng: 149.9003 },
  { id: "au-sydney", name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
  { id: "au-brisbane", name: "Brisbane, Australia", lat: -27.4698, lng: 153.0251 },
  { id: "au-rockhampton", name: "Rockhampton, Australia", lat: -23.3791, lng: 150.5101 },
  { id: "au-townsville", name: "Townsville, Australia", lat: -19.2589, lng: 146.8169 },
  { id: "au-cairns", name: "Cairns, Australia", lat: -16.9186, lng: 145.7781 },
  { id: "au-cooktown", name: "Cooktown, Australia", lat: -15.467, lng: 145.2498 },
  { id: "au-borroloola", name: "Borroloola, Australia", lat: -16.0696, lng: 136.307 },
];

export const ROAD_REGIONS: readonly RoadRegion[] = [
  {
    id: "afro-eurasia",
    name: "Afro-Eurasia",
    countryCodes: AFRO_EURASIA_COUNTRY_CODES,
    anchors: AFRO_EURASIA_ROUTABLE_ANCHORS,
    containsCoordinate: isAfroEurasiaCoordinate,
  },
  {
    id: "north-america",
    name: "North America",
    countryCodes: NORTH_AMERICA_COUNTRY_CODES,
    anchors: NORTH_AMERICA_ANCHORS,
    containsCoordinate: isNorthAmericaCoordinate,
  },
  {
    id: "south-america",
    name: "South America",
    countryCodes: SOUTH_AMERICA_COUNTRY_CODES,
    anchors: SOUTH_AMERICA_ANCHORS,
    containsCoordinate: isSouthAmericaCoordinate,
  },
  {
    id: "australia",
    name: "Australia",
    countryCodes: AUSTRALIA_COUNTRY_CODES,
    anchors: AUSTRALIA_ANCHORS,
    containsCoordinate: isAustraliaCoordinate,
  },
];

export function roadRegionForPlace(point: Coordinate & { countryCode?: string }) {
  const countryCode = point.countryCode?.toUpperCase();
  if (!countryCode) return undefined;
  return ROAD_REGIONS.find(
    (region) => region.countryCodes.has(countryCode) && region.containsCoordinate(point),
  );
}

export function sharedRoadRegion(
  source: Coordinate & { countryCode?: string },
  destination: Coordinate & { countryCode?: string },
) {
  const sourceRegion = roadRegionForPlace(source);
  const destinationRegion = roadRegionForPlace(destination);
  return sourceRegion?.id === destinationRegion?.id ? sourceRegion : undefined;
}

export function isSupportedRoadPlace(point: Coordinate & { countryCode?: string }) {
  return Boolean(roadRegionForPlace(point));
}

export function nearestRegionAntipodeCandidates(
  region: RoadRegion,
  destination: Coordinate,
  limit = 2,
) {
  const target = antipode(destination);
  return [...region.anchors]
    .sort((a, b) => haversineKm(a, target) - haversineKm(b, target))
    .slice(0, limit);
}

export function farthestRegionRoadPoint(
  region: RoadRegion,
  from: Coordinate & { id?: string },
  avoidedGeometry?: RouteGeometry,
  excludedAnchorIds: Iterable<string> = [],
) {
  const excludedIds = new Set(excludedAnchorIds);
  const ranked = region.anchors
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
