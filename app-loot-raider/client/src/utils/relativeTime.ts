const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Formats a UTC ISO timestamp as "x ago" while it's under 24 hours old, and
 * falls back to an absolute date/time beyond that — matching how collectors
 * actually read a sighting feed: "3m ago" is useful, "Aug 12, 3:04 PM" from
 * three weeks ago is what you actually want at that distance.
 */
export function formatCheckInTime(isoString: string): string {
  const reportedAt = new Date(isoString).getTime();
  const diffMs = Date.now() - reportedAt;

  if (diffMs < 0 || diffMs >= DAY_MS) {
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (diffMs < MINUTE_MS) {
    return "just now";
  }

  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS);
    return `${minutes}m ago`;
  }

  const hours = Math.floor(diffMs / HOUR_MS);
  return `${hours}h ago`;
}
