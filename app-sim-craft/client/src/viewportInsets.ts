// Publishes the height of the screen that is really usable as --app-h.
//
// The game's HUD is anchored to the bottom of the viewport, but iPhone
// Safari (iOS 26's floating toolbar in particular) lays the page out to the
// very bottom of the screen and draws its toolbar over it — burying the
// joystick and the bottom buttons. Where the browser reports a smaller
// viewport (svh / visualViewport) that is used as is; where it does not,
// room for the toolbar is reserved.

export interface ViewportMeasure {
  innerWidth: number;
  innerHeight: number;
  visualHeight: number;
  /** Height of `100svh` (the viewport with toolbars showing); 0 when unsupported. */
  smallHeight: number;
  screenWidth: number;
  screenHeight: number;
  /** An iPhone in the browser (not an installed home-screen app, which has no toolbar). */
  iphoneBrowser: boolean;
}

const TOOLBAR_RESERVE_PORTRAIT = 84;
const TOOLBAR_RESERVE_LANDSCAPE = 56;
// If the viewport is within this much of the screen's height, the toolbars are not being excluded from it — they overlap the page.
const OVERLAP_MAX_OUTSIDE_PORTRAIT = 150;
const OVERLAP_MAX_OUTSIDE_LANDSCAPE = 90;

export function computeUsableHeight(m: ViewportMeasure): number {
  let height = Math.min(m.innerHeight, m.visualHeight, m.smallHeight > 0 ? m.smallHeight : Infinity);
  if (m.iphoneBrowser) {
    const landscape = m.innerWidth > m.innerHeight;
    const screenHeight = landscape ? Math.min(m.screenWidth, m.screenHeight) : Math.max(m.screenWidth, m.screenHeight);
    const outside = screenHeight - height;
    if (outside < (landscape ? OVERLAP_MAX_OUTSIDE_LANDSCAPE : OVERLAP_MAX_OUTSIDE_PORTRAIT)) {
      height -= landscape ? TOOLBAR_RESERVE_LANDSCAPE : TOOLBAR_RESERVE_PORTRAIT;
    }
  }
  return Math.max(0, Math.floor(height));
}

export function trackUsableHeight(): void {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);

  const iphoneBrowser =
    /iPhone|iPod/.test(navigator.userAgent) &&
    !(navigator as Navigator & { standalone?: boolean }).standalone &&
    !window.matchMedia("(display-mode: standalone)").matches;

  const update = (): void => {
    const height = computeUsableHeight({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualHeight: window.visualViewport?.height ?? window.innerHeight,
      smallHeight: probe.getBoundingClientRect().height,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      iphoneBrowser,
    });
    document.documentElement.style.setProperty("--app-h", `${height}px`);
  };

  update();
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  // iOS reports stale sizes right after a rotation.
  window.addEventListener("orientationchange", () => window.setTimeout(update, 300));
}
