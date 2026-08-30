import { NextRequest, NextResponse } from "next/server";
import { isSupportedRoadPlace, roadRegionForPlace } from "@/lib/road-regions";

type PhotonFeature = {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
};

type PhotonResponse = { features?: PhotonFeature[] };

function displayName(properties: NonNullable<PhotonFeature["properties"]>) {
  const streetAddress = [properties.housenumber, properties.street].filter(Boolean).join(" ");
  return [...new Set([
    properties.name,
    streetAddress,
    properties.locality,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.postcode,
    properties.country,
  ].filter(Boolean))].join(", ");
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  const baseUrl = process.env.PHOTON_BASE_URL ?? "https://photon.komoot.io";
  const params = new URLSearchParams({
    q: query,
    limit: "12",
    lang: "en",
    bbox: "-169,-56,180,79",
  });

  try {
    const response = await fetch(`${baseUrl}/api?${params}`, {
      headers: {
        "User-Agent": process.env.APP_USER_AGENT ?? "AreWeThereYet-MVP/0.1",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    const payload = (await response.json()) as PhotonResponse;
    const results = (payload.features ?? []).flatMap((feature) => {
      const properties = feature.properties;
      const coordinates = feature.geometry?.coordinates;
      if (!properties || !coordinates || feature.geometry?.type !== "Point") return [];
      const countryCode = properties.countrycode?.toUpperCase();
      const place = { lat: coordinates[1], lng: coordinates[0], countryCode };
      if (!isSupportedRoadPlace(place)) return [];
      const region = roadRegionForPlace(place);
      const name = displayName(properties);
      if (!name) return [];
      return [{
        id: `${properties.osm_type ?? "osm"}-${properties.osm_id ?? coordinates.join("-")}`,
        name,
        lat: coordinates[1],
        lng: coordinates[0],
        countryCode,
        regionId: region?.id,
        regionName: region?.name,
        type: properties.osm_value ?? "place",
      }];
    }).slice(0, 6);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Place suggestions are taking a tea break. Try again shortly." }, { status: 502 });
  }
}
