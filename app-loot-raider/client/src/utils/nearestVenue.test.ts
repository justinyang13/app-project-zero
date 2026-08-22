import { describe, expect, it } from "vitest";
import { findNearestVenue } from "./nearestVenue";

describe("findNearestVenue", () => {
  it("returns null for an empty list", () => {
    expect(findNearestVenue({ lat: 0, lng: 0 }, [])).toBeNull();
  });

  it("returns the closest venue by great-circle distance", () => {
    const near = { id: "near", latitude: 0.01, longitude: 0.01 };
    const far = { id: "far", latitude: 5, longitude: 5 };

    expect(findNearestVenue({ lat: 0, lng: 0 }, [far, near])).toBe(near);
  });

  it("returns the exact match when a venue is at the given coordinates", () => {
    const here = { id: "here", latitude: 40.758, longitude: -73.9855 };
    const away = { id: "away", latitude: 41, longitude: -74 };

    expect(findNearestVenue({ lat: 40.758, lng: -73.9855 }, [away, here])).toBe(here);
  });
});
