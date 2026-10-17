/**
 * The seeker's view window, and the ruler drawn across it.
 *
 * Pure arithmetic, kept out of `Timeline.tsx` for two reasons. It is the part
 * worth checking without a renderer — the float behaviour of a tick grid and the
 * clamping of a zoom are exactly the things that go quietly wrong. And a module
 * that exports React components has to export *only* components, or Fast Refresh
 * gives up on it and every edit becomes a full reload.
 *
 * The window is held as **fractions** of the composition's duration rather than
 * as seconds. That is what keeps the whole comp in view when the whole comp was
 * in view and its length then changes — which the inspector can do — instead of
 * stranding the window past the new end.
 */

/** The whole composition, as the fractions the window is stored in. */
export const FULL_VIEW = { in: 0, out: 1 };

/** The shortest the window will zoom to. Four frames still shows a key and both
 *  its neighbours, which is as far in as there is anything to see. */
const MIN_SPAN_FRAMES = 4;

/**
 * A window clamped into the composition, returned as the fractions the view is
 * stored in. Everything that moves the view funnels through here, so none of
 * them has to think about the ends, or about zooming in past the point where
 * there is anything left to look at.
 */
export function clampWindow(
  inSec: number,
  outSec: number,
  duration: number,
  fps: number,
): { in: number; out: number } {
  const floor = Math.min(MIN_SPAN_FRAMES / fps, duration);
  const width = Math.max(floor, Math.min(duration, outSec - inSec));
  const start = Math.max(0, Math.min(inSec, duration - width));
  return { in: start / duration, out: (start + width) / duration };
}

/** Major-tick steps in seconds, coarsest last. */
const TICK_STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
/** Majors allowed across the window before the next coarser step is taken.
 *  Eight, so a 6s composition at full zoom still picks 1s majors over 0.25s
 *  minors — the ruler the DS component was drawn with, unchanged until you
 *  actually zoom. */
const MAX_MAJORS = 8;

/**
 * Ruler ticks across the **visible window**, minors at a quarter of the major —
 * the DS ruler's proportions, but with the step chosen for the zoom rather than
 * fixed at quarter-seconds.
 *
 * Only the window is generated. A fixed 0.25s walk of a ten-minute composition
 * is 2,400 elements with all but a dozen off-screen, and zoomed the other way it
 * would draw one tick every few hundred pixels.
 */
export function rulerTicks(
  viewIn: number,
  viewOut: number,
  duration: number,
): Array<{ t: number; major: boolean; label: string }> {
  {
    const span = Math.max(1e-6, viewOut - viewIn);
    const step =
      TICK_STEPS.find((s) => span / s <= MAX_MAJORS) ?? TICK_STEPS[TICK_STEPS.length - 1];
    const minor = step / 4;
    const from = Math.max(0, viewIn);
    const to = Math.min(duration, viewOut);
    const ticks: Array<{ t: number; major: boolean; label: string }> = [];
    // Indexed off the grid rather than accumulated: adding a small step a few
    // hundred times drifts far enough that a major stops landing on one.
    for (let n = Math.floor(from / minor); n * minor <= to + 1e-6; n++) {
      const t = n * minor;
      if (t < from - 1e-6) continue;
      ticks.push({
        t,
        major: n % 4 === 0,
        // Whole seconds read as `4s`; a zoomed-in ruler needs the fraction.
        label: step >= 1 ? `${Math.round(t)}s` : `${+t.toFixed(2)}s`,
      });
    }
    return ticks;
  }
}

