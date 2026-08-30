export type Coordinate = {
  lat: number;
  lng: number;
};

export type Place = Coordinate & {
  id: string;
  name: string;
  countryCode?: string;
};

export type SearchResult = Place & {
  type: string;
};

export type RouteGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type RouteResult = {
  source: Place;
  destination: Place;
  waypoint: Place;
  farthestPoint: Place;
  midpoint: Coordinate;
  midpointFarthestPoint: Place;
  visitOrder: Place[];
  ordersTested: number;
  antipode: Coordinate;
  geometry: RouteGeometry;
  outboundGeometry: RouteGeometry;
  returnGeometry: RouteGeometry;
  durationSeconds: number;
  distanceMeters: number;
  sharedRoadMeters: number;
  isFallback: boolean;
};
