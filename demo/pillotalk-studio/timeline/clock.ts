/**
 * The playback clock — framework-free, so the transport engine stays testable
 * and React only subscribes to it.
 *
 * Time is derived from the wall clock rather than accumulated per frame: each
 * tick reads `performance.now()` against an origin captured at the last
 * play/seek. Dropped frames therefore cost smoothness, never sync — a six
 * second comp still takes six seconds.
 */
export class Clock {
  private raf = 0;
  /** `performance.now()` at the last play/seek. */
  private wallOrigin = 0;
  /** Composition time at the last play/seek. */
  private timeOrigin = 0;
  private current = 0;
  private running = false;

  /** Length in seconds. Nothing plays or seeks past it. */
  duration: number;
  /** Wrap to the work area's start at its end instead of stopping. */
  loop = true;
  /**
   * The work area: the band playback runs in. Scrubbing is still free to go
   * anywhere in the composition — this only bounds the transport.
   */
  rangeIn = 0;
  rangeOut: number;

  constructor(
    duration: number,
    /** Called on every tick and on every state change. */
    private onTick: (time: number, playing: boolean) => void,
  ) {
    this.duration = duration;
    this.rangeOut = duration;
  }

  /** Work area clamped into the composition, so a stale range can't strand it. */
  private get outPoint(): number {
    return Math.min(this.rangeOut, this.duration);
  }
  private get inPoint(): number {
    return Math.max(0, Math.min(this.rangeIn, this.outPoint));
  }

  get time(): number {
    return this.current;
  }

  get playing(): boolean {
    return this.running;
  }

  play(): void {
    if (this.running) return;
    // Playing from the end of the work area is a replay — rewind to its start
    // rather than sit there.
    if (this.current >= this.outPoint) this.current = this.inPoint;
    this.running = true;
    this.sync();
    this.raf = requestAnimationFrame(this.frame);
    this.onTick(this.current, true);
  }

  pause(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.onTick(this.current, false);
  }

  toggle(): void {
    this.running ? this.pause() : this.play();
  }

  /**
   * Move the playhead. Safe to call mid-playback (scrubbing) — re-anchoring the
   * origin means playback simply continues from the new time.
   */
  seek(time: number): void {
    this.current = Math.max(0, Math.min(this.duration, time));
    this.sync();
    this.onTick(this.current, this.running);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.running = false;
  }

  /** Re-anchor the wall/comp origin pair to right now. */
  private sync(): void {
    this.wallOrigin = performance.now();
    this.timeOrigin = this.current;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const elapsed = this.timeOrigin + (now - this.wallOrigin) / 1000;

    const out = this.outPoint;
    if (elapsed >= out) {
      if (!this.loop) {
        this.current = out;
        this.running = false;
        this.raf = 0;
        this.onTick(this.current, false);
        return;
      }
      // Modulo the overshoot so a long frame doesn't lose time across the wrap.
      const start = this.inPoint;
      const span = out - start;
      this.current = span > 0 ? start + ((elapsed - start) % span) : start;
      this.sync();
    } else {
      this.current = elapsed;
    }

    this.onTick(this.current, true);
    this.raf = requestAnimationFrame(this.frame);
  };
}
