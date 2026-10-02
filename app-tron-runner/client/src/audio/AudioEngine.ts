/**
 * AudioEngine — owns the shared AudioContext, master gain and mute state
 * (SPEC §9). Everything is defensive: if Web Audio is unavailable or blocked
 * the game must still run, so every method swallows errors and reports
 * `available === false`.
 */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private _available = false;
  private unlockAttempts = 0;

  /** True once a usable AudioContext exists. */
  get available(): boolean {
    return this._available;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get masterGain(): GainNode | null {
    return this.master;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Create (or resume) the AudioContext. Call from a user gesture (first key
   * press) to satisfy browser autoplay rules. Safe to call repeatedly.
   */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => undefined);
      }
      return;
    }
    this.unlockAttempts += 1;
    if (this.unlockAttempts > 5) return; // give up quietly
    try {
      const Ctor: typeof AudioContext | undefined =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5; // master gain 0.5 (SPEC §9)
      this.master.connect(this.ctx.destination);
      this._available = true;
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => undefined);
      }
    } catch {
      this.ctx = null;
      this.master = null;
      this._available = false;
    }
  }

  /** Mute / unmute (key M). */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      try {
        this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
      } catch {
        // ignore
      }
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Suspend the context (game pause). */
  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend().catch(() => undefined);
    }
  }

  /** Resume the context (game resume). */
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
      this._available = false;
    }
  }
}
