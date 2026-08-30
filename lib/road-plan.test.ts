import { describe, expect, it } from "vitest";
import { roadOnlyPlan } from "./road-plan";
import type { Place } from "./types";

function place(
  id: string,
  lat: number,
  lng: number,
  countryCode?: string,
): Place {
  return { id, name: id, lat, lng, countryCode };
}

describe("road-only regional planning", () => {
  it.each([
    [
      "North America",
      place("texas", 31, -99, "US"),
      place("yaviza", 8.1583, -77.6917),
    ],
    [
      "South America",
      place("buenos-aires", -34.6037, -58.3816, "AR"),
      place("rio", -22.9068, -43.1729),
    ],
    [
      "Australia",
      place("sydney", -33.8688, 151.2093, "AU"),
      place("perth", -31.9523, 115.8613),
    ],
  ])("does not insert an African gateway into %s", (_region, start, end) => {
    expect(roadOnlyPlan([start, end], "outbound")).toEqual([start, end]);
  });

  it("still inserts a road gateway for an Afro-Eurasia crossing", () => {
    const delhi = place("delhi", 28.6139, 77.209, "IN");
    const capeTown = place("cape-town", -33.9249, 18.4241);
    const plan = roadOnlyPlan([delhi, capeTown], "outbound");

    expect(plan).toHaveLength(3);
    expect(plan[1].id).toBe("gateway-ahmed-hamdi");
  });
});
