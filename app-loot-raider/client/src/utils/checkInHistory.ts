// UC-6 alt flow: soft-limits one report per item per venue per device per
// day. Spam friction only, not a security boundary — nothing here is ever
// sent to the server (see the domain model note in the app README).
const STORAGE_KEY = "loot-raider:reported-items";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function entryKey(venueId: string, collectibleItemId: string): string {
  return `${venueId}:${collectibleItemId}`;
}

function readAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function hasReportedToday(venueId: string, collectibleItemId: string): boolean {
  return readAll()[entryKey(venueId, collectibleItemId)] === todayKey();
}

export function recordReport(venueId: string, collectibleItemId: string): void {
  try {
    const all = readAll();
    all[entryKey(venueId, collectibleItemId)] = todayKey();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable (private browsing, quota) — safe to skip
    // persisting spam-friction state.
  }
}
