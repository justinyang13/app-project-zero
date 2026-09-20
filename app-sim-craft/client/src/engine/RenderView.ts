// The WebGL renderer and everything about how big and how sharp it draws:
// the canvas viewport, the pixel ratio, and dynamic resolution — if the frame
// rate sags it renders at a lower pixel ratio (crisp UI is DOM, so only the 3D
// view softens) and creeps back up when there's headroom. Also counts frames
// per second, since that's what drives the resolution adaptation.
import * as THREE from "three";
import type { GraphicsSettings } from "../state/graphicsStore";

const MIN_PIXEL_RATIO = 0.75;
const PIXEL_RATIO_STEP = 0.25;
const ADAPT_LOW_FPS = 38; // below this for 1.5s, drop the render resolution a step
const ADAPT_HIGH_FPS = 57; // at/above this for 15s, take a step back up
const SLOW_WINDOWS_TO_DROP = 3; // 500ms measurement windows
const FAST_WINDOWS_TO_RAISE = 30;
const FPS_WINDOW_MS = 500;
const STALL_WINDOW_MS = 1500; // a longer window means the tab was hidden or stalled, not slow rendering

export class RenderView {
  readonly renderer: THREE.WebGLRenderer;
  private readonly canvas: HTMLCanvasElement;
  private readonly onResize: (width: number, height: number) => void;
  private readonly resizeObserver: ResizeObserver;
  private adaptive = true;
  private maxPixelRatio: number;
  private pixelRatio: number;
  private slowWindows = 0;
  private fastWindows = 0;
  private fpsFrameCount = 0;
  private fpsWindowStart = performance.now();
  private currentFps = 0;

  constructor(canvas: HTMLCanvasElement, settings: GraphicsSettings, onResize: (width: number, height: number) => void) {
    this.canvas = canvas;
    this.onResize = onResize;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.maxPixelRatio = Math.min(window.devicePixelRatio, settings.resolution);
    this.pixelRatio = this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    const { width, height } = this.size;
    this.renderer.setSize(width, height, false);

    window.addEventListener("resize", this.handleResize);
    // Orientation flips and the iOS toolbar collapsing don't always fire a window resize; the canvas's own box always changes.
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(canvas);
  }

  /**
   * The canvas's layout size (CSS: fixed, inset 0). Not window.innerWidth —
   * iOS Safari shrinks that while the page is pinch- or double-tap-zoomed,
   * which left the canvas cut off at a fraction of the screen.
   */
  get size(): { width: number; height: number } {
    return {
      width: this.canvas.clientWidth || window.innerWidth,
      height: this.canvas.clientHeight || window.innerHeight,
    };
  }

  get fps(): number {
    return this.currentFps;
  }

  /** Applies the resolution and adaptive-resolution parts of the graphics settings — at startup and whenever they change. */
  configure(settings: GraphicsSettings): void {
    this.adaptive = settings.adaptive;
    this.maxPixelRatio = Math.min(window.devicePixelRatio, settings.resolution);
    this.slowWindows = 0;
    this.fastWindows = 0;
    this.setPixelRatio(this.maxPixelRatio);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /** Call once per frame with the frame's start time: keeps the FPS reading and steps the resolution up or down. */
  recordFrame(frameStart: number): void {
    this.fpsFrameCount++;
    const sinceWindowStart = frameStart - this.fpsWindowStart;
    if (sinceWindowStart < FPS_WINDOW_MS) return;
    this.currentFps = Math.round((this.fpsFrameCount * 1000) / sinceWindowStart);
    this.fpsFrameCount = 0;
    this.fpsWindowStart = frameStart;
    if (sinceWindowStart < STALL_WINDOW_MS) this.adaptResolution(this.currentFps);
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }

  private adaptResolution(fps: number): void {
    if (!this.adaptive) return;
    if (fps < ADAPT_LOW_FPS) {
      this.fastWindows = 0;
      if (++this.slowWindows >= SLOW_WINDOWS_TO_DROP && this.pixelRatio > MIN_PIXEL_RATIO) {
        this.slowWindows = 0;
        this.setPixelRatio(Math.max(MIN_PIXEL_RATIO, this.pixelRatio - PIXEL_RATIO_STEP));
      }
    } else if (fps >= ADAPT_HIGH_FPS) {
      this.slowWindows = 0;
      if (++this.fastWindows >= FAST_WINDOWS_TO_RAISE && this.pixelRatio < this.maxPixelRatio) {
        this.fastWindows = 0;
        this.setPixelRatio(Math.min(this.maxPixelRatio, this.pixelRatio + PIXEL_RATIO_STEP));
      }
    } else {
      this.slowWindows = 0;
      this.fastWindows = 0;
    }
  }

  private setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.renderer.setPixelRatio(ratio);
    const { width, height } = this.size;
    this.renderer.setSize(width, height, false);
  }

  private handleResize = (): void => {
    const { width, height } = this.size;
    this.renderer.setSize(width, height, false);
    this.onResize(width, height);
  };
}
