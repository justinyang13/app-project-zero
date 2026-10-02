// Pure layout helpers (SPEC M11 item 8): the canvas must be a fixed,
// full-viewport element so it is never pushed below the fold by #app.

export interface CanvasStyle {
  position: string;
  inset: string;
  width: string;
  height: string;
  zIndex: string;
  display: string;
}

/** Fixed-position style object applied to the WebGL canvas element. */
export function canvasStyle(): CanvasStyle {
  return {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '0',
    display: 'block',
  };
}
