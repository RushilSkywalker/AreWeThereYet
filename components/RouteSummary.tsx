import type { RouteResult } from "@/lib/types";

function formatDuration(totalSeconds: number) {
  const totalHours = Math.round(totalSeconds / 3600);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days ? `${days} days ${hours} hr` : `${hours} hr`;
}

export function RouteSummary({ route, onClose }: { route: RouteResult; onClose: () => void }) {
  const kilometres = Math.round(route.distanceMeters / 1000).toLocaleString("en-IN");
  return (
    <aside className="route-summary">
      <button className="summary-close" type="button" onClick={onClose} aria-label="Close route summary">
        ×
      </button>
      <span className="summary-eyebrow">Our least helpful suggestion</span>
      <h2>{formatDuration(route.durationSeconds)}</h2>
      <p className="summary-distance">{kilometres} km · eventually</p>
      <p className="route-message">{route.message}</p>
      <p className="entertainment-note">For entertainment only. This is deliberately bad routing, not navigation advice.</p>
    </aside>
  );
}
