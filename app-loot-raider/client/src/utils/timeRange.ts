export type TimeRangeHours = 1 | 2 | 6 | 12 | 24 | "all";

export const TIME_RANGE_OPTIONS: { label: string; value: TimeRangeHours }[] = [
  { label: "1h", value: 1 },
  { label: "2h", value: 2 },
  { label: "6h", value: 6 },
  { label: "12h", value: 12 },
  { label: "24h", value: 24 },
  { label: "All", value: "all" },
];

export const DEFAULT_TIME_RANGE_HOURS: TimeRangeHours = 24;

/** Whether a venue's most recent check-in falls within the selected time range. */
export function isWithinTimeRange(lastCheckInAtUtc: string | null, range: TimeRangeHours): boolean {
  if (range === "all") {
    return true;
  }

  if (!lastCheckInAtUtc) {
    return false;
  }

  const ageMs = Date.now() - new Date(lastCheckInAtUtc).getTime();
  return ageMs <= range * 60 * 60 * 1000;
}
