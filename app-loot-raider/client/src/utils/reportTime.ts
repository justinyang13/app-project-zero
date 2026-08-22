// UC-6: the report form always logs against today's date, but lets the
// visitor say what time they actually saw it (defaulting to right now)
// rather than only ever "this exact instant".

export function currentTimeValue(): string {
  return toTimeValue(new Date());
}

export function toTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Combines today's local date with a "HH:mm" time-of-day into a UTC ISO timestamp. */
export function timeValueToUtcIso(timeValue: string): string {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
