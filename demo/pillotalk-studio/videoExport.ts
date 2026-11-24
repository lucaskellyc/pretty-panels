import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } from 'mediabunny';
import { canvasScene, type CanvasSettings } from './Canvas';
import { strokePathData, type FontProject, type GlyphData } from './font/model';
import { shapedGlyph } from './font/stretch';
import { frameCount } from './timeline/timecode';

/**
 * The canvas as an .mp4: every frame of the work area painted onto an
 * offscreen canvas from the same scene the stage draws (`canvasScene`), then
 * encoded through WebCodecs and muxed by Mediabunny. Rendered offline, a frame
 * at a time, so the file has every frame whatever the machine's speed.
 *
 * The matte is the stage's: the Colors section's ground and letters. An MP4
 * has no alpha, so a transparent frame is written on its background colour.
 * H.264 wants even dimensions, so an odd frame gains one row or column of
 * ground.
 */

/** A letter's stretched, trimmed outlines as path data, in font units with y
 *  down from the baseline — drawn as the stage's `Letter` draws them. */
function letterPaths(glyph: GlyphData, stretch: number) {
  const g = shapedGlyph(glyph, stretch);
  const fill = g.contours
    .filter((c) => c.points.length >= 3)
    .map((c) => c.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${-p.y}`).join('') + 'Z')
    .join('');
  const stroke = g.strokes?.length ? strokePathData(g.strokes, 0) : '';
  return { fill, stroke, cap: g.cap ?? 'round', join: g.join ?? 'round' } as const;
}
export async function exportMp4({
  resolveAt,
  settings,
  fps,
  work,
  fileName,
  onProgress,
}: {
  resolveAt: (t: number) => FontProject;
  settings: CanvasSettings;
  fps: number;
  /** The span to write, in seconds. */
  work: { in: number; out: number };
  fileName: string;
  onProgress: (done: number) => void;
}): Promise<void> {
  const width = settings.frameWidth + (settings.frameWidth % 2);
  const height = settings.frameHeight + (settings.frameHeight % 2);
  const codec = await getFirstEncodableVideoCodec(new Mp4OutputFormat().getSupportedVideoCodecs(), {
    width,
    height,
  });
  if (!codec) throw new Error(`This browser can't encode a ${width}×${height} video.`);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas available.');

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  // Letters keep their glyph's identity across frames where nothing about
  // them moves, so their paths are built once.
  // Keyed by glyph, then by the height it is stretched to.
  type Built = ReturnType<typeof letterPaths> & { fill2d: Path2D; stroke2d: Path2D };
  const paths = new WeakMap<object, Map<number, Built>>();
  const pathsOf = (glyph: GlyphData, stretch: number) => {
    let byStretch = paths.get(glyph);
    if (!byStretch) paths.set(glyph, (byStretch = new Map()));
    let p = byStretch.get(stretch);
    if (!p) {
      const lp = letterPaths(glyph, stretch);
      byStretch.set(stretch, (p = { ...lp, fill2d: new Path2D(lp.fill), stroke2d: new Path2D(lp.stroke) }));
    }
    return p;
  };

  const frames = Math.max(1, frameCount(work.out - work.in, fps));
  try {
    for (let f = 0; f < frames; f++) {
      const t = work.in + f / fps;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = settings.background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = settings.textColor;
      ctx.strokeStyle = settings.textColor;
      for (const { glyph, weight, stretch, x, y, scale } of canvasScene(resolveAt(t), resolveAt, t, settings)) {
        const p = pathsOf(glyph, stretch);
        ctx.setTransform(scale, 0, 0, scale, x, y);
        if (p.fill) ctx.fill(p.fill2d);
        if (p.stroke) {
          ctx.lineWidth = weight;
          ctx.lineCap = p.cap;
          ctx.lineJoin = p.join;
          ctx.stroke(p.stroke2d);
        }
      }
      await source.add(f / fps, 1 / fps);
      onProgress((f + 1) / frames);
    }
    await output.finalize();
  } catch (e) {
    await output.cancel();
    throw e;
  }

  const blob = new Blob([output.target.buffer!], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
