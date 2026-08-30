"use client";

import { useEffect, useId, useState } from "react";
import type { Place, SearchResult } from "@/lib/types";

type Props = {
  label: string;
  placeholder: string;
  value: Place | null;
  marker: "A" | "B";
  onChange: (place: Place | null) => void;
};

export function LocationSearch({ label, placeholder, value, marker, onChange }: Props) {
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (value || trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const payload = (await response.json()) as { results?: SearchResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Search failed");
        setResults(payload.results ?? []);
        if (!payload.results?.length) setError("No matching place found in a supported road region.");
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);

  function choose(place: SearchResult) {
    onChange(place);
    setQuery("");
    setResults([]);
    setError("");
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setResults([]);
    setLoading(false);
    setError("");
  }

  return (
    <div className="location-field">
      <span className={`route-marker route-marker-${marker.toLowerCase()}`} aria-hidden="true">
        {marker}
      </span>
      <div className="location-control">
        <label>{label}</label>
        {value ? (
          <div className="selected-place">
            <span title={value.name}>{value.name}</span>
            <button type="button" onClick={() => onChange(null)} aria-label={`Clear ${label}`}>
              ×
            </button>
          </div>
        ) : (
          <div className="search-row">
            <input
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              autoComplete="off"
              placeholder={placeholder}
              aria-label={label}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={resultsId}
              aria-expanded={results.length > 0}
            />
            <span className="search-status" aria-hidden="true">
              {loading ? <span className="tiny-spinner" /> : <span className="search-glyph">⌕</span>}
            </span>
          </div>
        )}
        {error && <p className="field-error">{error}</p>}
        {results.length > 0 && (
          <div id={resultsId} className="search-results" role="listbox" aria-label={`${label} results`}>
            {results.map((result) => (
              <button key={result.id} type="button" onClick={() => choose(result)} role="option" aria-selected="false">
                <span className="result-pin">●</span>
                <span>{result.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
