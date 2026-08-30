"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LocationSearch } from "@/components/LocationSearch";
import { RouteSummary } from "@/components/RouteSummary";
import type { Place, RouteResult } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView").then((module) => module.MapView), { ssr: false });

type CrossRegionError = { sourceRegion: string; destinationRegion: string };

export default function Home() {
  const [source, setSource] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [crossRegionError, setCrossRegionError] = useState<CrossRegionError | null>(null);

  async function calculateRoute() {
    if (!source || !destination) return;
    if (source.regionId && destination.regionId && source.regionId !== destination.regionId) {
      setError("");
      setCrossRegionError({
        sourceRegion: source.regionName ?? "the starting region",
        destinationRegion: destination.regionName ?? "the destination region",
      });
      return;
    }
    setLoading(true);
    setError("");
    setCrossRegionError(null);
    setRoute(null);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, destination }),
      });
      const payload = (await response.json()) as RouteResult & {
        error?: string;
        code?: string;
        sourceRegion?: string;
        destinationRegion?: string;
      };
      if (payload.code === "CROSS_REGION") {
        setCrossRegionError({
          sourceRegion: payload.sourceRegion ?? "the starting region",
          destinationRegion: payload.destinationRegion ?? "the destination region",
        });
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "Route calculation failed");
      setRoute(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Route calculation failed");
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setSource(destination);
    setDestination(source);
    setRoute(null);
    setCrossRegionError(null);
  }

  return (
    <main>
      <MapView source={source} destination={destination} route={route} />
      <header className="brand-bar">
        <div className="brand-mark" aria-hidden="true"><span>?</span></div>
        <div>
          <h1>Are We There Yet?</h1>
          <p>I&apos;m sure we&apos;ll get there</p>
        </div>
      </header>

      <section className="search-panel" aria-label="Plan a terrible route">
        <div className="panel-heading">
          <div><span className="overline">ROAD TRIP PLANNER</span><h2>Where shouldn’t we go?</h2></div>
          <button type="button" className="swap-button" onClick={swap} disabled={!source && !destination} aria-label="Swap source and destination">⇅</button>
        </div>
        <div className="location-stack">
          <div className="connector-line" aria-hidden="true" />
          <LocationSearch label="Starting point" placeholder="Search across supported regions" value={source} marker="A" onChange={(place) => { setSource(place); setRoute(null); setCrossRegionError(null); }} />
          <LocationSearch label="Actual destination" placeholder="Where do you want to end up?" value={destination} marker="B" onChange={(place) => { setDestination(place); setRoute(null); setCrossRegionError(null); }} />
        </div>
        {error && <div className="route-error"><span>!</span>{error}</div>}
        <button className="calculate-button" type="button" onClick={() => void calculateRoute()} disabled={!source || !destination || loading}>
          {loading ? <><span className="button-spinner" />Finding the worst possible idea…</> : <>Take me the long way <span>→</span></>}
        </button>
        <p className="panel-footnote">Physical roads within each supported landmass count. Border rules, common sense and efficiency do not.</p>
      </section>

      {route && <RouteSummary route={route} onClose={() => setRoute(null)} />}
      {crossRegionError && (
        <div className="modal-backdrop" onClick={() => setCrossRegionError(null)}>
          <section
            className="road-gap-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="road-gap-title"
            aria-describedby="road-gap-description"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setCrossRegionError(null)}
              aria-label="Close message"
            >
              ×
            </button>
            <div className="road-gap-icon" aria-hidden="true">≋</div>
            <span className="modal-eyebrow">Road trip interrupted</span>
            <h2 id="road-gap-title">The road ends here.</h2>
            <p id="road-gap-description">
              There is no continuous roadway connecting {crossRegionError.sourceRegion} and {" "}
              {crossRegionError.destinationRegion}. Even we cannot make a car cross an ocean.
            </p>
            <a
              className="learn-more-link"
              href="https://www.youtube.com/watch?v=Aq5WXmQQooo"
              target="_blank"
              rel="noreferrer"
            >
              Learn more <span aria-hidden="true">→</span>
            </a>
          </section>
        </div>
      )}
      {loading && (
        <div className="loading-toast" role="status">
          <div className="loading-road"><span /></div>
          <div><strong>Consulting several questionable roads</strong><small>This usually takes a few seconds.</small></div>
        </div>
      )}
    </main>
  );
}
