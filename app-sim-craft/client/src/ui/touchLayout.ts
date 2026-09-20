// Where the touch controls sit, in one place, so the joystick, action buttons,
// block picker and E-key prompt stay clear of each other. Portrait stacks the
// picker and prompt above the thumb columns; landscape ("compact") is too short
// for that, so they slide into the gap between the joystick and the buttons.
export const EDGE_MARGIN = 16; // px from the screen edge, before the safe-area inset

/** Landscape: the joystick column takes this much of the left edge... */
export const COMPACT_LEFT_RESERVE = 152;
/** ...and the action-button cluster this much of the right. */
export const COMPACT_RIGHT_RESERVE = 220;

/** Portrait: how far above the bottom edge the block picker and the E-key prompt float, clear of the thumb columns. */
export const PORTRAIT_PICKER_BOTTOM = 240;
export const PORTRAIT_PROMPT_BOTTOM = 310;
/** Landscape: the prompt's fixed height, and how far the picker rises above its toggle button. */
export const COMPACT_PROMPT_BOTTOM = 74;
export const COMPACT_PICKER_ABOVE_TOGGLE = 52;

/** A CSS `bottom` that also clears the home-indicator / browser-toolbar inset. */
export function safeBottom(px: number): string {
  return `max(${px}px, calc(env(safe-area-inset-bottom) + ${px}px))`;
}

export function safeRight(px: number): string {
  return `max(${px}px, calc(env(safe-area-inset-right) + ${px}px))`;
}
