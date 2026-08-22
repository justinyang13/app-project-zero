import { describe, expect, it } from "vitest";
import { timeValueToUtcIso, toTimeValue } from "./reportTime";

describe("toTimeValue", () => {
  it("formats hours and minutes as zero-padded HH:mm", () => {
    expect(toTimeValue(new Date(2026, 0, 1, 9, 5))).toBe("09:05");
    expect(toTimeValue(new Date(2026, 0, 1, 23, 45))).toBe("23:45");
    expect(toTimeValue(new Date(2026, 0, 1, 0, 0))).toBe("00:00");
  });
});

describe("timeValueToUtcIso", () => {
  it("combines today's local date with the given time-of-day", () => {
    const iso = timeValueToUtcIso("14:30");
    const result = new Date(iso);
    const today = new Date();

    expect(result.getFullYear()).toBe(today.getFullYear());
    expect(result.getMonth()).toBe(today.getMonth());
    expect(result.getDate()).toBe(today.getDate());
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});
