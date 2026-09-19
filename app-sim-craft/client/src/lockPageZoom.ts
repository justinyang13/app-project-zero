// A game canvas has no use for page zoom, and on iOS Safari it breaks the
// layout: pinch or double-tap zooms the page, window.innerWidth shrinks,
// and the HUD ends up panned half off-screen. Safari ignores
// user-scalable=no for pinch, so the gestures are cancelled here as well
// (double-tap is covered by touch-action: manipulation in index.css).

export function lockPageZoom(): void {
  const block = (e: Event): void => e.preventDefault();
  // Safari-only pinch events.
  document.addEventListener("gesturestart", block);
  document.addEventListener("gesturechange", block);
  document.addEventListener("gestureend", block);
  // Other browsers: a second finger down means a pinch, not a game input.
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
}
