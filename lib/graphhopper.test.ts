import { describe, expect, it } from "vitest";
import { snappedPointsAreClose } from "./graphhopper";
import { roadOnlyPlan } from "./road-plan";

describe("routing provider safety", () => {
  it("accepts nearby snaps and rejects a distant silent snap", () => {
    const requested = [
      { lat: 48.8566, lng: 2.3522 },
      { lat: -34.831, lng: 20 },
    ];

    expect(snappedPointsAreClose(requested, [[2.353, 48.857], [20.01, -34.83]])).toBe(true);
    expect(snappedPointsAreClose(requested, [[2.353, 48.857], [46.9848, 28.0098]])).toBe(false);
  });

  it("alternates road gateways when an itinerary enters and leaves Africa", () => {
    const plan = roadOnlyPlan([
      { id: "paris", name: "Paris", lat: 48.8566, lng: 2.3522, countryCode: "FR" },
      { id: "cape", name: "Cape Agulhas", lat: -34.831, lng: 20 },
      { id: "berlin", name: "Berlin", lat: 52.52, lng: 13.405, countryCode: "DE" },
    ], "outbound");

    expect(plan.map((point) => point.id)).toEqual([
      "paris",
      "gateway-ahmed-hamdi",
      "cape",
      "gateway-east-ismailia",
      "berlin",
    ]);
  });

  it("uses the northern road spine for long routes within Africa", () => {
    const plan = roadOnlyPlan([
      { id: "nairobi", name: "Nairobi", lat: -1.2921, lng: 36.8219, countryCode: "KE" },
      { id: "dakar", name: "Dakar", lat: 14.7167, lng: -17.4677 },
      { id: "delhi", name: "Delhi", lat: 28.6139, lng: 77.209, countryCode: "IN" },
    ], "return");

    expect(plan.map((point) => point.id)).toEqual([
      "nairobi",
      "gateway-cairo",
      "dakar",
      "gateway-east-ismailia",
      "delhi",
    ]);
  });
});
