/**
 * Which window chrome to draw. The three desktop platforms disagree about two
 * things — where the window controls sit and what shape they are — so every
 * piece of chrome in this layer takes a `platform` and the components that draw
 * controls consult it rather than sniffing the environment themselves.
 */
export type Platform = 'mac' | 'win' | 'linux';

/**
 * Best-effort guess from the renderer. `userAgentData.platform` is the modern
 * spelling and is what Electron's Chromium reports; `navigator.platform` is the
 * deprecated fallback that still answers everywhere. Neither exists during SSR
 * or a non-DOM test run, hence the `linux` default — it is the plainest chrome
 * of the three, so an unknown environment gets the least surprising bar.
 *
 * Apps that already know (Electron's `process.platform`, reported through the
 * preload bridge) should pass `platform` explicitly instead.
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'linux';
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const raw = (nav.userAgentData?.platform || nav.platform || '').toLowerCase();
  if (raw.includes('mac')) return 'mac';
  if (raw.includes('win')) return 'win';
  return 'linux';
}
