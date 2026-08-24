import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCheckInTime } from "./relativeTime";

describe("formatCheckInTime", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for under a minute ago", () => {
    expect(formatCheckInTime(new Date(now.getTime() - 30 * 1000).toISOString())).toBe("just now");
  });

  it("returns minutes ago for under an hour", () => {
    expect(formatCheckInTime(new Date(now.getTime() - 5 * 60 * 1000).toISOString())).toBe("5m ago");
  });

  it("returns hours ago for under 24 hours", () => {
    expect(formatCheckInTime(new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString())).toBe("3h ago");
  });

  it("returns an absolute date/time at 24 hours or beyond", () => {
    const result = formatCheckInTime(new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString());
    expect(result).not.toMatch(/ago/);
    expect(result.length).toBeGreaterThan(0);
  });
});
