"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LocationSearch } from "@/components/LocationSearch";
import { RouteSummary } from "@/components/RouteSummary";
import type { Place, RouteResult } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView").then((module) => module.MapView), { ssr: false });

export default function Home() {
  const [source, setSource] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function calculateRoute() {
    if (!source || !destination) return;
    setLoading(true);
    setError("");
    setRoute(null);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, destination }),
      });
      const payload = (await response.json()) as RouteResult & { error?: string };
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
          <LocationSearch label="Starting point" placeholder="Search across Afro-Eurasia" value={source} marker="A" onChange={(place) => { setSource(place); setRoute(null); }} />
          <LocationSearch label="Actual destination" placeholder="Where do you want to end up?" value={destination} marker="B" onChange={(place) => { setDestination(place); setRoute(null); }} />
        </div>
        {error && <div className="route-error"><span>!</span>{error}</div>}
        <button className="calculate-button" type="button" onClick={() => void calculateRoute()} disabled={!source || !destination || loading}>
          {loading ? <><span className="button-spinner" />Finding the worst possible idea…</> : <>Take me the long way <span>→</span></>}
        </button>
        <p className="panel-footnote">Physical roads across Afro-Eurasia count. Border rules, common sense and efficiency do not.</p>
      </section>

      {route && <RouteSummary route={route} onClose={() => setRoute(null)} />}
      {loading && (
        <div className="loading-toast" role="status">
          <div className="loading-road"><span /></div>
          <div><strong>Consulting several questionable roads</strong><small>This usually takes a few seconds.</small></div>
        </div>
      )}
    </main>
  );
}
