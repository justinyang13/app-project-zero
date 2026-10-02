// Floating-score / popup event queue (SPEC §7) — pure, no DOM.
// Game pushes events each frame; the HUD drains and renders them.
// Bounded to MAX_POPUPS visible; oldest is dropped when full.

export type PopupKind = 'score' | 'info' | 'danger' | 'good';

export interface PopupEvent {
  id: number;
  text: string;
  kind: PopupKind;
  t: number; // seconds since creation (advanced by the queue)
  ttl: number; // lifetime in seconds
}

export const MAX_POPUPS = 4;
const DEFAULT_TTL = 1.2;

export interface PopupQueue {
  events: PopupEvent[];
  nextId: number;
}

export function createPopupQueue(): PopupQueue {
  return { events: [], nextId: 0 };
}

/** Push a popup event; drops the oldest if the queue is at capacity. */
export function pushPopup(
  q: PopupQueue,
  text: string,
  kind: PopupKind = 'score',
  ttl: number = DEFAULT_TTL,
): void {
  q.events.push({ id: q.nextId++, text, kind, t: 0, ttl });
  while (q.events.length > MAX_POPUPS) q.events.shift();
}

/** Age events and drop expired ones. Returns the number removed. */
export function stepPopups(q: PopupQueue, dt: number): number {
  let removed = 0;
  for (const e of q.events) e.t += dt;
  const before = q.events.length;
  q.events = q.events.filter((e) => e.t < e.ttl);
  removed = before - q.events.length;
  return removed;
}

export function clearPopups(q: PopupQueue): void {
  q.events.length = 0;
}
