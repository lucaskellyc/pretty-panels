/** Frame-grid helpers. Time is seconds everywhere; frames only exist for display
 *  and for snapping the playhead. */

/** The frame index containing time `t`. */
export const frameAt = (t: number, fps: number): number => Math.round(t * fps);

/** Snap a time onto the frame grid. The playhead never sits between frames. */
export const snapToFrame = (t: number, fps: number): number => frameAt(t, fps) / fps;

/** Total frames in a composition of `duration` seconds. */
export const frameCount = (duration: number, fps: number): number => Math.round(duration * fps);

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** `mm:ss:ff` — minutes, seconds, and the frame within the second. */
export function timecode(t: number, fps: number): string {
  const frame = frameAt(t, fps);
  const totalSeconds = Math.floor(frame / fps);
  return `${pad(totalSeconds / 60)}:${pad(totalSeconds % 60)}:${pad(frame % fps)}`;
}
