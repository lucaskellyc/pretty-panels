import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { strokePathData, type FontProject } from './font/model';
import { shapedGlyph } from './font/stretch';
import { canvasScene, type CanvasSettings, type SceneLetter } from './Canvas';
import { frameAt } from './timeline/timecode';
import type { LottieRange } from './lottie';

/**
 * The canvas as an animated GIF: each frame of the range drawn to a 2D canvas
 * from the same scene the stage draws, then quantised and encoded.
 *
 * GIF keeps time in hundredths of a second, so 30 fps can't be held exactly;
 * each frame's delay is rounded against the running total instead, so the
 * whole still lasts as long as the range. A transparent frame keeps one-bit
 * alpha, as GIF has no other kind: edges are hard where they meet the ground.
 */

/** One letter, drawn as the stage's `Letter` draws it. */
function drawLetter(ctx: OffscreenCanvasRenderingContext2D, letter: SceneLetter, color: string) {
  const g = shapedGlyph(letter.glyph, letter.stretch);
  ctx.save();
  ctx.translate(letter.x, letter.y);
  ctx.scale(letter.scale, letter.scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const fill = new Path2D();
  for (const c of g.contours) {
    if (c.points.length < 3) continue;
    c.points.forEach((p, i) => (i ? fill.lineTo(p.x, -p.y) : fill.moveTo(p.x, -p.y)));
    fill.closePath();
  }
  ctx.fill(fill, 'nonzero');
  if (g.strokes?.length && letter.weight > 0) {
    ctx.lineWidth = letter.weight;
    ctx.lineCap = g.cap ?? 'round';
    ctx.lineJoin = g.join ?? 'round';
    ctx.stroke(new Path2D(strokePathData(g.strokes, 0)));
  }
  ctx.restore();
}

export interface GifOptions {
  /** Play the range over and over, or once and stop on its last frame. */
  loop: boolean;
  /** Called after each frame with how far along it is, 0–1. */
  onProgress?: (done: number) => void;
}

/** The canvas over `range`, as GIF bytes. Yields between frames, so the
 *  window stays responsive while a long range renders. */
export async function canvasGif(
  resolveAt: (t: number) => FontProject,
  settings: CanvasSettings,
  range: LottieRange,
  { loop, onProgress }: GifOptions,
): Promise<Uint8Array> {
  const { fps } = range;
  const { frameWidth: w, frameHeight: h, transparent } = settings;
  const first = frameAt(range.start, fps);
  const frames = Math.max(1, frameAt(range.end, fps) - first);
  const ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No 2D canvas to draw the GIF with');
  const gif = GIFEncoder();
  const format = transparent ? 'rgba4444' : 'rgb565';
  /** Hundredths of a second from the start to frame `f`. */
  const cs = (f: number) => Math.round((f * 100) / fps);

  for (let f = 0; f < frames; f++) {
    const t = (first + f) / fps;
    ctx.clearRect(0, 0, w, h);
    if (!transparent) {
      ctx.fillStyle = settings.background;
      ctx.fillRect(0, 0, w, h);
    }
    for (const letter of canvasScene(resolveAt(t), resolveAt, t, settings)) drawLetter(ctx, letter, settings.textColor);

    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256, { format, oneBitAlpha: transparent });
    const index = applyPalette(data, palette, format);
    const clear = transparent ? palette.findIndex((c) => c[3] === 0) : -1;
    gif.writeFrame(index, w, h, {
      palette,
      delay: (cs(f + 1) - cs(f)) * 10,
      repeat: loop ? 0 : -1,
      transparent: clear >= 0,
      transparentIndex: Math.max(0, clear),
    });
    onProgress?.((f + 1) / frames);
    await new Promise((done) => setTimeout(done, 0));
  }
  gif.finish();
  return gif.bytes();
}

/** Hand the file to the browser as a download. */
export async function exportGif(
  resolveAt: (t: number) => FontProject,
  settings: CanvasSettings,
  range: LottieRange,
  project: FontProject,
  opts: GifOptions,
): Promise<void> {
  const part = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '') || 'Untitled';
  const bytes = await canvasGif(resolveAt, settings, range, opts);
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/gif' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${part(project.familyName)}-${part(project.styleName)}.gif`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
