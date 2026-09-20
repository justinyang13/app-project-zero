// What the E key would do right now, as data — not as display text. The game
// publishes this; the UI decides the wording (a keyboard "Press E to …" hint,
// a touch "Tap to …" button) and reads behaviour off `kind` instead of
// pattern-matching on a string.
export type MountHint =
  | { kind: "exit-vehicle" }
  | { kind: "dismount" }
  | { kind: "drive" }
  | { kind: "ride"; name: string };

export function sameMountHint(a: MountHint | null, b: MountHint | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && (a.kind !== "ride" || a.name === (b as { name: string }).name);
}

/** True when the player is currently on or in something (so E gets them off it). */
export function isMounted(hint: MountHint | null): boolean {
  return hint?.kind === "exit-vehicle" || hint?.kind === "dismount";
}
