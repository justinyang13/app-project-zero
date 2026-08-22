import { describe, expect, it } from "vitest";
import { isWithinTimeRange } from "./timeRange";

describe("isWithinTimeRange", () => {
  it("always returns true for 'all'", () => {
    expect(isWithinTimeRange(null, "all")).toBe(true);
    expect(isWithinTimeRange(new Date(0).toISOString(), "all")).toBe(true);
  });

  it("returns false when there is no last check-in and range is not 'all'", () => {
    expect(isWithinTimeRange(null, 24)).toBe(false);
  });

  it("returns true when the last check-in is within the range", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isWithinTimeRange(oneHourAgo, 2)).toBe(true);
  });

  it("returns false when the last check-in is outside the range", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(isWithinTimeRange(threeHoursAgo, 2)).toBe(false);
  });
});
