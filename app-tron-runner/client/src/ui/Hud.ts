/**
 * Neon HUD (SPEC §7): score count-up + TARGET + progress bar + section name,
 * multiplier SVG ring, integrity pips with hit flash, contextual prompt panel
 * (key-cap + action + hint), floating popups (max 4), section banners,
 * and a bottom-right debug panel (fps / draw calls / triangles) when ?debug=1.
 *
 * Pure DOM; all selection logic lives in ./prompts.ts (unit-tested).
 */

import { TARGET_SCORE, LEVEL_LENGTH } from '../config';
import type { PopupQueue } from '../game/events';
import type { Prompt } from './prompts';
import './styles.css';

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

export interface DebugInfo {
  fps: number;
  drawCalls: number;
  triangles: number;
  quality: string;
  muted: boolean;
}

export class Hud {
  private root: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private sectionEl: HTMLDivElement;
  private multEl: HTMLDivElement;
  private multPanel: HTMLDivElement;
  private ringFg: SVGCircleElement;
  private pipsPanel: HTMLDivElement;
  private pips: HTMLDivElement[] = [];
  private promptEl: HTMLDivElement;
  private promptKey: HTMLSpanElement;
  private promptAction: HTMLDivElement;
  private promptHint: HTMLDivElement;
  private popupsEl: HTMLDivElement;
  private bannerEl: HTMLDivElement;
  private debugEl: HTMLDivElement;
  private bannerTimer = 0;
  private hitTimer = 0;
  private displayScore = 0;
  private lastMult = 1;
  private lastIntegrity = 3;

  constructor() {
    const root = document.createElement('div');
    root.id = 'hud';
    document.body.appendChild(root);
    this.root = root;

    const panel = (cls: string): HTMLDivElement => {
      const d = document.createElement('div');
      d.className = `hud-panel ${cls}`;
      root.appendChild(d);
      return d;
    };

    // ---- top-left: score / target / progress / section ----
    const topLeft = panel('hud-score-panel');
    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-score';
    this.scoreEl.textContent = '0';
    const targetEl = document.createElement('div');
    targetEl.className = 'hud-target';
    targetEl.textContent = `TARGET ${TARGET_SCORE.toLocaleString('en-US')}`;
    const track = document.createElement('div');
    track.className = 'hud-progress-track';
    this.progressFill = document.createElement('div');
    this.progressFill.className = 'hud-progress-fill';
    track.appendChild(this.progressFill);
    this.sectionEl = document.createElement('div');
    this.sectionEl.className = 'hud-section';
    this.sectionEl.textContent = 'BOOT SEQUENCE';
    topLeft.append(this.scoreEl, targetEl, track, this.sectionEl);

    // ---- top-right: multiplier ring ----
    const topRight = panel('hud-mult-panel');
    this.multPanel = topRight;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'hud-mult-ring');
    svg.setAttribute('viewBox', '0 0 64 64');
    const bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('class', 'ring-bg');
    bg.setAttribute('cx', '32');
    bg.setAttribute('cy', '32');
    bg.setAttribute('r', String(RING_R));
    this.ringFg = document.createElementNS(svgNS, 'circle');
    this.ringFg.setAttribute('class', 'ring-fg');
    this.ringFg.setAttribute('cx', '32');
    this.ringFg.setAttribute('cy', '32');
    this.ringFg.setAttribute('r', String(RING_R));
    this.ringFg.setAttribute('stroke-dasharray', String(RING_C));
    this.ringFg.setAttribute('stroke-dashoffset', String(RING_C));
    svg.append(bg, this.ringFg);
    this.multEl = document.createElement('div');
    this.multEl.className = 'hud-mult-value';
    this.multEl.textContent = '×1';
    topRight.append(svg, this.multEl);

    // ---- top-center: integrity pips ----
    const topCenter = panel('hud-pips-panel');
    this.pipsPanel = topCenter;
    const pips = document.createElement('div');
    pips.className = 'hud-pips';
    for (let i = 0; i < 3; i++) {
      const pip = document.createElement('div');
      pip.className = 'hud-pip on';
      pips.appendChild(pip);
      this.pips.push(pip);
    }
    topCenter.appendChild(pips);

    // ---- right-middle: contextual prompt ----
    const prompt = panel('hud-prompt-panel');
    this.promptEl = prompt;
    this.promptAction = document.createElement('div');
    this.promptAction.className = 'hud-prompt-action';
    this.promptHint = document.createElement('div');
    this.promptHint.className = 'hud-prompt-hint';
    this.promptKey = document.createElement('span');
    this.promptKey.className = 'hud-prompt-key';
    prompt.append(this.promptAction, this.promptHint, this.promptKey);

    // ---- floating popups ----
    const popups = document.createElement('div');
    popups.className = 'hud-popups';
    root.appendChild(popups);
    this.popupsEl = popups;

    // ---- section banner ----
    const banner = document.createElement('div');
    banner.className = 'hud-banner';
    root.appendChild(banner);
    this.bannerEl = banner;

    // ---- bottom-right: debug / quality ----
    const debug = panel('hud-debug-panel');
    debug.style.display = 'none';
    this.debugEl = debug;
  }

  /**
   * Per-frame update. `dt` drives the score count-up easing.
   * `streak` fills the multiplier ring (streak mod 8 / 8).
   */
  update(
    score: number,
    integrity: number,
    mult: number,
    streak: number,
    dist: number,
    sectionName: string,
    dt: number,
  ): void {
    // Score count-up: ease the displayed value toward the real one.
    const target = Math.floor(score);
    if (this.displayScore !== target) {
      const step = (target - this.displayScore) * Math.min(1, dt * 8);
      this.displayScore = Math.abs(step) < 1 ? target : this.displayScore + step;
    }
    this.scoreEl.textContent = Math.floor(this.displayScore).toLocaleString('en-US');

    // Multiplier + ring progress.
    this.multEl.textContent = '×' + mult;
    const progress = (streak % 8) / 8;
    this.ringFg.setAttribute('stroke-dashoffset', String(RING_C * (1 - progress)));
    if (mult > this.lastMult) this.pulseMult();
    this.lastMult = mult;

    // Progress bar + section name.
    this.progressFill.style.width = Math.min(100, (dist / LEVEL_LENGTH) * 100) + '%';
    this.sectionEl.textContent = sectionName;

    // Integrity pips + hit flash.
    if (integrity < this.lastIntegrity) this.flashHit();
    this.lastIntegrity = integrity;
    for (let i = 0; i < this.pips.length; i++) {
      this.pips[i].classList.toggle('on', i < integrity);
    }
  }

  /** Explicit hit flash (Game calls this on every harmful collision). */
  flashHit(): void {
    this.pipsPanel.classList.remove('hit-flash');
    // Force reflow so the animation restarts on consecutive hits.
    void this.pipsPanel.offsetWidth;
    this.pipsPanel.classList.add('hit-flash');
    window.clearTimeout(this.hitTimer);
    this.hitTimer = window.setTimeout(() => this.pipsPanel.classList.remove('hit-flash'), 500);
  }

  private pulseMult(): void {
    this.multPanel.classList.remove('mult-pulse');
    void this.multPanel.offsetWidth;
    this.multPanel.classList.add('mult-pulse');
  }

  /** Show or hide the contextual prompt (null hides it). */
  setPrompt(prompt: Prompt | null): void {
    if (!prompt) {
      this.promptEl.style.display = 'none';
      return;
    }
    this.promptKey.textContent = prompt.key;
    this.promptKey.style.display = prompt.key ? 'inline-block' : 'none';
    this.promptAction.textContent = prompt.action;
    this.promptHint.textContent = prompt.hint;
    this.promptEl.style.display = 'block';
  }

  /** Render floating popups from the pure event queue (max 4 visible). */
  renderPopups(q: PopupQueue): void {
    for (const e of q.events) {
      if (document.getElementById(`popup-${e.id}`)) continue;
      const d = document.createElement('div');
      d.id = `popup-${e.id}`;
      d.className = `hud-popup ${e.kind}`;
      d.textContent = e.text;
      d.style.animationDuration = `${e.ttl}s`;
      this.popupsEl.appendChild(d);
      while (this.popupsEl.children.length > 4) {
        this.popupsEl.removeChild(this.popupsEl.firstChild as Node);
      }
    }
    // Remove DOM nodes whose events expired.
    const alive = new Set(q.events.map((e) => `popup-${e.id}`));
    for (const child of Array.from(this.popupsEl.children)) {
      if (child instanceof HTMLElement && !alive.has(child.id)) child.remove();
    }
  }

  /** Section banner: fades in/out over 2.5 s. */
  showBanner(text: string): void {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.remove('show'), 2500);
  }

  /** Debug panel (only rendered when ?debug=1). */
  setDebug(enabled: boolean, info?: DebugInfo): void {
    if (!enabled) {
      this.debugEl.style.display = 'none';
      return;
    }
    this.debugEl.style.display = 'block';
    if (!info) return;
    this.debugEl.innerHTML =
      `<div class="fps">FPS ${info.fps}</div>` +
      `<div class="dim">DRAWS ${info.drawCalls} · TRIS ${(info.triangles / 1000).toFixed(0)}k</div>` +
      `<div class="dim">${info.quality.toUpperCase()} · ${info.muted ? 'MUTED' : 'SOUND ON'}</div>`;
  }

  /** Reset transient state at the start of a run. */
  reset(): void {
    this.displayScore = 0;
    this.scoreEl.textContent = '0';
    this.lastMult = 1;
    this.lastIntegrity = 3;
    this.ringFg.setAttribute('stroke-dashoffset', String(RING_C));
    this.progressFill.style.width = '0%';
    this.popupsEl.innerHTML = '';
    this.setPrompt(null);
    this.bannerEl.classList.remove('show');
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  show(): void {
    this.root.style.display = 'block';
  }

  destroy(): void {
    window.clearTimeout(this.bannerTimer);
    window.clearTimeout(this.hitTimer);
    this.root.remove();
  }
}
