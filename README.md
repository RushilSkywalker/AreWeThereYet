# Are We There Yet?

A single-region Afro-Eurasia MVP for deliberately terrible road trips. A user selects a road-connected mainland source and destination, the service projects the destination's antipode onto a peripheral Afro-Eurasian road, sends the trip through the farthest feasible road point, then finds the midpoint between those two extremes and visits the road point farthest from that midpoint before finally reaching the destination.

## What works

- Search-as-you-type suggestions restricted to the road-connected Afro-Eurasia mainland
- MapLibre map with MapTiler Streets when configured and an OpenFreeMap fallback
- Any-order source → three calculated extreme road points → destination algorithm
- Twelve reusable directed road calculations covering all six possible detour orders
- One-hour edge caching so repeated internal road pairs do not consume more provider calls
- Corridor-aware extreme-point selection and a 2 km nearby-road overlap estimate
- Server-side GraphHopper routing with ferry exclusion and waypoint snap validation
- Separate outward and return route visualization
- Responsive desktop/mobile interface
- Vercel-compatible Next.js application and server routes

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Before using the public Photon instance, replace the placeholder email in `APP_USER_AGENT`. Create a GraphHopper key and set `GRAPHHOPPER_API_KEY` for full Afro-Eurasia routing. The key is used only by the server route and is never sent to the browser.

## Commands

```bash
npm run lint
npm test
npm run build
```

## Architecture

The frontend and orchestration API run on Vercel. External integrations are isolated behind `app/api/search` and `lib/routing.ts`. GraphHopper is the recommended hosted routing provider; a dedicated OSRM-compatible endpoint remains supported through `ROUTING_BASE_URL`.

The production routing upgrade is intentionally separate:

1. Download and merge the required Africa, Europe and Asia OpenStreetMap PBF snapshots.
2. Build a permissive car/track graph excluding ferries and rail transfers.
3. Generate a 10–20 km antipodal and farthest-road candidate index.
4. Replace the static anchor catalog with nearest-neighbour graph lookup.
5. Replace approximate cell overlap with edge-ID-disjoint path calculation.
6. Point `ROUTING_BASE_URL` at the dedicated OSRM-compatible service instead of GraphHopper.

The MVP cannot guarantee strict graph-edge disjointness because the hosted free routing profile cannot accept per-request forbidden corridors. It first calculates all three extreme points, routes the 12 directed edges needed to assemble every possible visit order, and selects the order with the least pairwise corridor overlap. Longer duration and distance break overlap ties. Physical road gateways are varied by direction, roads within roughly 2 km count as the same corridor, and every provider response is checked for ferries and distant waypoint snaps.

## Deployment

Deploy the Next.js project to Vercel and configure the variables from `.env.example`. A self-hosted full Afro-Eurasia routing graph needs substantial persistent infrastructure; it cannot live inside a Vercel serverless function, which is why the hosted GraphHopper adapter is the practical MVP default.

## Data attribution

Map and route data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Map rendering uses [MapLibre](https://maplibre.org/) with [MapTiler](https://www.maptiler.com/) when configured and [OpenFreeMap](https://openfreemap.org/) as a fallback. Hosted routes use [GraphHopper](https://www.graphhopper.com/); dedicated OSRM-compatible routing is also supported.
