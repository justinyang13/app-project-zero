/**
 * Game screens (SPEC §2): title, countdown, pause, game over, victory.
 * DOM overlays above the canvas.
 */

export type ScreenKind = 'title' | 'countdown' | 'paused' | 'gameover' | 'victory' | 'none';

interface VictoryStats {
  score: number;
  bits: number;
  nearMisses: number;
  bestMult: number;
  time: number;
  integrity: number;
  stars: number;
}

export class Screens {
  private overlay: HTMLDivElement;
  private content: HTMLDivElement;
  private countdownTimer: number | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'screens';
    this.overlay.style.cssText =
      'position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;' +
      "font-family:'Orbitron','Rajdhani','Eurostile','Segoe UI',sans-serif;color:#fff;";
    this.content = document.createElement('div');
    this.content.style.cssText = 'text-align:center;max-width:80vw;';
    this.overlay.appendChild(this.content);
    document.body.appendChild(this.overlay);
  }

  private glow(color: string): string {
    return `text-shadow:0 0 20px ${color},0 0 60px ${color};`;
  }

  private title(): void {
    this.overlay.style.background =
      `url('${import.meta.env.BASE_URL}assets/img/title.jpg') center/cover no-repeat, rgba(2,4,12,0.75)`;
    this.content.innerHTML =
      `<div style="font-size:clamp(40px,8vmin,96px);letter-spacing:14px;font-weight:800;${this.glow('#19f2ff')}">NEON RUNNER</div>` +
      `<div style="margin-top:14px;letter-spacing:4px;opacity:0.8;font-size:clamp(12px,1.6vmin,18px);">Reach the portal. Stay derezzed-free.</div>` +
      `<div style="margin-top:40px;font-size:clamp(14px,2vmin,22px);letter-spacing:4px;color:#ffe600;animation:blink 1.2s step-end infinite;">PRESS ENTER TO START</div>` +
      `<div style="margin-top:30px;font-size:clamp(10px,1.3vmin,14px);letter-spacing:2px;opacity:0.7;line-height:2;">` +
      `[A]/[D] CHANGE LANE &nbsp; [W]/[SPACE] JUMP &nbsp; [S]/[SHIFT] SLIDE<br>` +
      `[ESC] PAUSE &nbsp; [R] RESTART &nbsp; [M] MUTE &nbsp; [Q] QUALITY</div>`;
    const style = document.createElement('style');
    style.textContent = '@keyframes blink{50%{opacity:0.15}}';
    document.head.appendChild(style);
  }

  private countdown(n: number): void {
    this.overlay.style.background = 'rgba(2,4,12,0.55)';
    this.content.innerHTML =
      `<div style="font-size:clamp(80px,18vmin,220px);font-weight:800;${this.glow('#19f2ff')}animation:count-pop 1s ease-out;">` +
      (n === 0 ? 'GO' : String(n)) + '</div>';
  }

  private paused(): void {
    this.overlay.style.background = 'rgba(2,4,12,0.7)';
    this.content.innerHTML =
      `<div style="font-size:clamp(36px,7vmin,80px);letter-spacing:10px;${this.glow('#19f2ff')}">PAUSED</div>` +
      `<div style="margin-top:30px;font-size:clamp(12px,1.6vmin,18px);letter-spacing:3px;line-height:2.4;opacity:0.85;">` +
      `RESUME — [ESC]<br>RESTART — [R]</div>`;
  }

  private gameover(score: number, dist: number, bestMult: number): void {
    this.overlay.style.background = 'rgba(10,2,4,0.8)';
    this.content.innerHTML =
      `<div style="font-size:clamp(40px,8vmin,90px);letter-spacing:10px;color:#ff1744;${this.glow('#ff1744')}">DEREZZED</div>` +
      `<div style="margin-top:24px;font-size:clamp(14px,2vmin,22px);letter-spacing:3px;line-height:2;">` +
      `SCORE ${Math.floor(score).toLocaleString('en-US')}<br>` +
      `DISTANCE ${(Math.min(100, (dist / 7800) * 100).toFixed(1))}%<br>` +
      `BEST MULTIPLIER ×${bestMult}</div>` +
      `<div style="margin-top:36px;font-size:clamp(14px,2vmin,20px);letter-spacing:4px;color:#ffe600;animation:blink 1.2s step-end infinite;">PRESS R TO RETRY</div>`;
  }

  private victory(stats: VictoryStats): void {
    this.overlay.style.background = 'rgba(2,8,6,0.8)';
    const stars = '★'.repeat(stats.stars) + '☆'.repeat(3 - stats.stars);
    this.content.innerHTML =
      `<div style="font-size:clamp(36px,7vmin,80px);letter-spacing:10px;color:#2bff88;${this.glow('#2bff88')}">GRID CLEARED</div>` +
      `<div style="margin-top:16px;font-size:clamp(28px,5vmin,56px);color:#ffe600;${this.glow('#ffe600')}">${stars}</div>` +
      `<div style="margin-top:24px;font-size:clamp(12px,1.6vmin,18px);letter-spacing:3px;line-height:2.2;">` +
      `SCORE ${Math.floor(stats.score).toLocaleString('en-US')}<br>` +
      `BITS ${stats.bits} &nbsp; NEAR MISSES ${stats.nearMisses}<br>` +
      `BEST MULTIPLIER ×${stats.bestMult}<br>` +
      `TIME ${stats.time.toFixed(1)}s &nbsp; INTEGRITY ${stats.integrity}/3</div>` +
      `<div style="margin-top:36px;font-size:clamp(14px,2vmin,20px);letter-spacing:4px;color:#ffe600;animation:blink 1.2s step-end infinite;">PRESS R TO PLAY AGAIN</div>`;
  }

  show(kind: ScreenKind, data?: { score?: number; dist?: number; bestMult?: number; stats?: VictoryStats }): void {
    switch (kind) {
      case 'title':
        this.title();
        break;
      case 'paused':
        this.paused();
        break;
      case 'gameover':
        this.gameover(data?.score ?? 0, data?.dist ?? 0, data?.bestMult ?? 1);
        break;
      case 'victory':
        this.victory(data?.stats ?? { score: 0, bits: 0, nearMisses: 0, bestMult: 1, time: 0, integrity: 3, stars: 1 });
        break;
      case 'countdown':
        this.countdown(3);
        break;
      case 'none':
        this.overlay.style.display = 'none';
        return;
    }
    this.overlay.style.display = 'flex';
  }

  /** Run the 3-2-1-GO sequence, calling onTick(n) each second and onDone at the end. */
  runCountdown(onTick: (n: number) => void, onDone: () => void): void {
    let n = 3;
    this.countdown(n);
    onTick(n);
    const step = (): void => {
      n -= 1;
      if (n < 0) {
        this.overlay.style.display = 'none';
        onDone();
        return;
      }
      this.countdown(n);
      onTick(n);
      this.countdownTimer = window.setTimeout(step, 1000);
    };
    this.countdownTimer = window.setTimeout(step, 1000);
  }

  cancelCountdown(): void {
    if (this.countdownTimer !== null) {
      window.clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
