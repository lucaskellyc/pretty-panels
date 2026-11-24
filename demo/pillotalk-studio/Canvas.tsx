import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { RadioGroup, Section, Slider, TextButton, Toggle, Vector } from '../../src';
import { isDrawn, riseOf, strokePathData, type FontProject, type GlyphData } from './font/model';
import { shapedGlyph } from './font/stretch';
import { useFitView } from './view';
import { DURATION_MAX, DURATION_MIN, FPS } from './timeline/state';

/**
 * The canvas: a frame of fixed size with a line of text set on it in the font
 * being drawn — where the timeline's animation is meant to be watched.
 *
 * It is drawn from the glyphs' own paths, the way the specimen sheet is, not
 * through a compiled font as the preview is: so every frame of playback shows
 * the weight, widths, offsets and trims at the playhead, with nothing to
 * rebuild between them.
 */

export type TextAlign = 'left' | 'center' | 'right';
export type UnwriteOrder = 'first' | 'last';
const ALIGNS: TextAlign[] = ['left', 'center', 'right'];

export interface CanvasSettings {
  text: string;
  /** Type size: pixels per em, in the frame's own pixels. */
  size: number;
  /** Baseline to baseline, as a multiple of the font's ascender-to-descender
   *  height. */
  leading: number;
  /** How the lines line up with each other; the block they make stays
   *  centred in the frame. */
  align: TextAlign;
  /** Seconds each repeat of a letter runs behind the one before it: the
   *  second A plays its animation this much later than the first, the third
   *  twice as late. 0 plays them together. */
  stagger: number;
  /** Seconds each letter's weight runs behind the one before it, in the order
   *  typed: the font's keyed weight ripples along the text. 0 moves them
   *  together. */
  weightStagger: number;
  /** The same for the font's tracking: the gap before each letter, in the
   *  order typed, opens and closes this many seconds after the one before. */
  trackingStagger: number;
  /** The same for the font's vertical offset: a keyed rise travels along the
   *  text as a wave. */
  offsetStagger: number;
  /** The same for the font's keyed height. */
  heightStagger: number;
  frameWidth: number;
  frameHeight: number;
  /** Write the line on: each letter's strokes drawn out, in the order typed,
   *  without a key — so the same animation plays on any text. */
  writeOn: boolean;
  /** Seconds before the first letter starts. */
  writeStart: number;
  /** Seconds each letter takes to draw. */
  writeDuration: number;
  /** Seconds from one letter starting to the next: the duration runs them
   *  back to back, less overlaps them, more leaves a pause. */
  writeGap: number;
  /** Per-character speed, ×1 when unset: a letter at ×2 draws in half the
   *  time, and the letters after it start sooner to keep the same overlap.
   *  Keyed by character, so it carries to any text. */
  writeSpeed: Record<string, number>;
  /** Once the whole line is written, wait and then take it back off: each
   *  letter retracts to where its pen started, at the same speeds. */
  unwrite: boolean;
  /** Seconds the finished line holds before the first letter un-writes. */
  unwriteDelay: number;
  /** Which letter un-writes first. */
  unwriteOrder: UnwriteOrder;
  /** The letters' colour, as `#rrggbb`. */
  textColor: string;
  /** The frame's ground, as `#rrggbb` — unless `transparent`. */
  background: string;
  /** No ground at all: the frame shows a checkerboard, and Lottie export
   *  leaves the background layer out. */
  transparent: boolean;
  /** GIF export plays over and over; off, it plays once and holds its last
   *  frame. */
  gifLoop: boolean;
}

export const CANVAS_DEFAULTS: CanvasSettings = {
  text: 'Pillotalk',
  size: 240,
  leading: 1.1,
  align: 'center',
  stagger: 0,
  weightStagger: 0,
  trackingStagger: 0,
  offsetStagger: 0,
  heightStagger: 0,
  frameWidth: 1920,
  frameHeight: 1080,
  writeOn: false,
  writeStart: 0,
  writeDuration: 0.6,
  writeGap: 0.4,
  writeSpeed: {},
  unwrite: false,
  unwriteDelay: 2,
  unwriteOrder: 'first',
  textColor: '#ffffff',
  background: '#000000',
  transparent: false,
  gifLoop: true,
};
const STORAGE_KEY = 'pillotalk-studio:canvas';
const FRAME_MIN = 16;
const FRAME_MAX = 8192;

/** The canvas's settings, remembered with the project. */
export function useCanvasSettings(): [CanvasSettings, (patch: Partial<CanvasSettings>) => void] {
  const [settings, setSettings] = useState<CanvasSettings>(() => {
    try {
      return { ...CANVAS_DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
    } catch {
      return CANVAS_DEFAULTS;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);
  return [settings, (patch) => setSettings((s) => ({ ...s, ...patch }))];
}

/* ---- Layout ------------------------------------------------------------------ */

interface Placed {
  /** Index in the text, so a letter that repeats keeps its own key. */
  i: number;
  char: string;
  /** The glyph as this occurrence draws it — later repeats run behind when
   *  staggered, so two As can be at different points in their animation. */
  glyph: GlyphData | undefined;
  /** Which line it sits on, from 0. */
  line: number;
  /** Left edge, in font units from its line's start. */
  x: number;
}

/** The text's letters in the order typed, broken into lines at each newline,
 *  and each line's width in font units. Each letter is laid out at its own
 *  advance, so a staggered width animation ripples down the line. A character
 *  the font doesn't have takes a space's width, as export's space glyph does,
 *  and draws nothing. Repeats are counted across lines. `tracking` gives the
 *  gap before the kth letter typed (newlines aside), so it can be staggered. */
function layoutText(
  text: string,
  tracking: (k: number) => number,
  space: number,
  glyphAt: (char: string, repeat: number) => GlyphData | undefined,
): { placed: Placed[]; widths: number[] } {
  const placed: Placed[] = [];
  const widths: number[] = [];
  const seen = new Map<string, number>();
  let line = 0;
  let x = 0;
  let first = true;
  [...text].forEach((char, i) => {
    if (char === '\n') {
      widths.push(Math.max(0, x));
      line++;
      x = 0;
      first = true;
      return;
    }
    if (!first) x += tracking(placed.length);
    first = false;
    const repeat = seen.get(char) ?? 0;
    seen.set(char, repeat + 1);
    const glyph = glyphAt(char, repeat);
    placed.push({ i, char, glyph, line, x });
    x += glyph ? glyph.advanceWidth : space;
  });
  widths.push(Math.max(0, x));
  return { placed, widths };
}

/** Whether a letter appears twice — line breaks and spaces aside. */
const hasRepeats = (text: string) => {
  const chars = [...text].filter((c) => c.trim());
  return new Set(chars).size < chars.length;
};

const SPEED_MIN = 0.25;
const SPEED_MAX = 4;
const speedOf = (settings: CanvasSettings, char: string) =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, settings.writeSpeed[char] ?? 1));

type Slot = { start: number; duration: number };

/** Letters timed one after another from `from`, in the order given: a
 *  letter's speed divides both its duration and the gap to the next, so a
 *  slow letter holds the ones after it back. */
function runSlots(settings: CanvasSettings, chars: string[], from: number): Slot[] {
  let at = from;
  return chars.map((c) => {
    const k = speedOf(settings, c);
    const slot = { start: at, duration: settings.writeDuration / k };
    at += settings.writeGap / k;
    return slot;
  });
}

/** When each drawn letter writes on, in the order typed — and, with
 *  `unwrite`, when it comes back off: the same run again, starting
 *  `unwriteDelay` after the last letter is done, first or last letter first. */
function writeSchedule(settings: CanvasSettings, chars: string[]): { on: Slot; off?: Slot }[] {
  const on = runSlots(settings, chars, settings.writeStart);
  if (!settings.unwrite || !on.length) return on.map((slot) => ({ on: slot }));
  const done = Math.max(...on.map((s) => s.start + s.duration));
  const last = settings.unwriteOrder === 'last';
  const order = last ? [...chars].reverse() : chars;
  const off = runSlots(settings, order, done + settings.unwriteDelay);
  if (last) off.reverse();
  return on.map((slot, n) => ({ on: slot, off: off[n] }));
}

/** How far a slot has run at `t`, 0–1, at an even pen speed. */
function slotProgress(slot: Slot, t: number): number {
  const local = t - slot.start;
  if (slot.duration <= 0) return local >= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, local / slot.duration));
}

/** How much of a letter is written at `t`, 0–1: drawn on, then — if it
 *  un-writes — retracted back toward where its pen started. */
function writeProgress({ on, off }: { on: Slot; off?: Slot }, t: number): number {
  const p = slotProgress(on, t);
  return off ? Math.min(p, 1 - slotProgress(off, t)) : p;
}

/** The glyph part-written: its own trim window, whichever way round its start
 *  and end are set, opened from its low end by the progress — so a keyed trim
 *  still holds once the letter is done. Itself when finished, so the
 *  memoised letter keeps its identity. */
function writtenGlyph(glyph: GlyphData, p: number): GlyphData {
  if (p >= 1) return glyph;
  const a = glyph.trimStart ?? 0;
  const b = glyph.trimEnd ?? 100;
  const lo = Math.min(a, b);
  return { ...glyph, trimStart: lo, trimEnd: lo + (Math.max(a, b) - lo) * p };
}

/** One letter as the frame draws it at some moment: its glyph part-written
 *  and staggered as it stands then, the weight it strokes at, the height it
 *  is stretched by, and where it
 *  sits — `x`, `y` the baseline origin in frame pixels, `scale` pixels per
 *  font unit (glyph y is up, so a point lands at x + px·s, y − py·s). */
export interface SceneLetter {
  /** Index in the text, so a letter that repeats keeps its own key. */
  key: number;
  char: string;
  glyph: GlyphData;
  weight: number;
  /** Font units added above the glyph's cut (see stretch.ts). */
  stretch: number;
  x: number;
  y: number;
  scale: number;
}

/**
 * The frame's letters at `time`, with `project` the project resolved there —
 * what the stage draws and what Lottie export samples, frame by frame.
 */
export function canvasScene(
  project: FontProject,
  resolveAt: (t: number) => FontProject,
  time: number,
  settings: CanvasSettings,
): SceneLetter[] {
  const { frameWidth: fw, frameHeight: fh, size, leading, align, stagger, text } = settings;
  // The nth repeat of a letter is sampled `n × stagger` behind the playhead,
  // its own channels only — the weight is the whole font's, so it stays put.
  // One resolve per repeat index, shared by every letter at that index.
  const behind = new Map<number, FontProject>();
  const glyphAt = (c: string, repeat: number) => {
    if (!stagger || repeat === 0) return project.glyphs[c];
    let p = behind.get(repeat);
    if (!p) behind.set(repeat, (p = resolveAt(time - repeat * stagger)));
    return p.glyphs[c];
  };
  // The font's channels as they stood `n × seconds` behind the playhead — how
  // weight, tracking, offset and height ripple along the text. One resolve per
  // moment, shared by whichever channels land on it.
  const past = new Map<number, FontProject>();
  const fontAt = (seconds: number, n: number): FontProject => {
    if (!seconds || n <= 0) return project;
    const t = time - n * seconds;
    let p = past.get(t);
    if (!p) past.set(t, (p = resolveAt(t)));
    return p;
  };
  // Tracking is the font's (keyable on its timeline row), not the canvas's.
  const { placed, widths } = layoutText(
    text,
    (k) => fontAt(settings.trackingStagger, k).tracking ?? 0,
    project.unitsPerEm / 4,
    glyphAt,
  );
  // The block centred both ways: across by its widest line, down by its
  // lines' ascender-to-descender boxes, so it sits where its metrics say.
  // Within it, each line is set left, centre or right.
  const s = size / project.unitsPerEm;
  const em = project.ascender - project.descender;
  const lineStep = em * leading * s;
  const top = (fh - (em * s + (widths.length - 1) * lineStep)) / 2;
  const blockWidth = Math.max(...widths);
  const blockLeft = (fw - blockWidth * s) / 2;
  const slack = { left: 0, center: 0.5, right: 1 }[align] ?? 0.5;
  const leftOf = (line: number) => blockLeft + (blockWidth - widths[line]) * s * slack;
  const baselineOf = (line: number) => top + project.ascender * s + line * lineStep;

  // Write-on order counts only the letters that draw, so a space doesn't
  // leave a pause.
  const schedule = settings.writeOn
    ? writeSchedule(settings, placed.filter((p) => p.glyph && isDrawn(p.glyph)).map((p) => p.char))
    : [];
  // The nth drawn letter takes the weight from `n × weightStagger` behind the
  // playhead, and the font's offset from `n × offsetStagger`; those alone, so
  // its other channels stay on time.
  const weightOf = (n: number) => fontAt(settings.weightStagger, n).strokeWeight;
  const riseAt = (n: number, glyph: GlyphData) => riseOf(fontAt(settings.offsetStagger, n), glyph);
  // The height ripples the same way, on its own stagger.
  const stretchOf = (n: number) => fontAt(settings.heightStagger, n).stretch ?? 0;

  const out: SceneLetter[] = [];
  for (const { i, char, glyph: own, line, x } of placed) {
    if (!own || !isDrawn(own)) continue;
    const n = out.length;
    const slot = schedule[n];
    const glyph = slot ? writtenGlyph(own, writeProgress(slot, time)) : own;
    out.push({
      key: i,
      char,
      glyph,
      weight: weightOf(n),
      stretch: stretchOf(n),
      x: leftOf(line) + x * s,
      y: baselineOf(line) - riseAt(n, glyph) * s,
      scale: s,
    });
  }
  return out;
}

/* ---- Drawing ----------------------------------------------------------------- */

/** One letter in glyph space (y up, baseline 0), flipped by the group above.
 *  Memoised on the glyph and its height, so playback redraws only what is
 *  animated. */
const Letter = memo(function Letter({ glyph, weight, stretch }: { glyph: GlyphData; weight: number; stretch: number }) {
  const g = useMemo(() => shapedGlyph(glyph, stretch), [glyph, stretch]);
  // `strokePathData` flips about its ascender; at 0 that is a plain y-flip,
  // undone by the group's own, so the paths can be drawn as stored.
  const fill = g.contours
    .filter((c) => c.points.length >= 3)
    .map((c) => c.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${-p.y}`).join('') + 'Z')
    .join('');
  return (
    <>
      {fill && <path className="pt-ink" d={fill} />}
      {g.strokes?.length ? (
        <path
          className="pt-stroke"
          d={strokePathData(g.strokes, 0)}
          strokeWidth={weight}
          strokeLinecap={g.cap ?? 'round'}
          strokeLinejoin={g.join ?? 'round'}
        />
      ) : null}
    </>
  );
});

const CLICK_SLOP = 3;

/**
 * The frame on the stage: pan by dragging empty space (or two-finger scroll),
 * pinch / ⌘-scroll to zoom, double-click to fit. Clicking a letter
 * selects its glyph, so the inspector can key it.
 */
export function CanvasStage({
  project,
  resolveAt,
  time,
  settings,
  char,
  onSelectGlyph,
}: {
  /** The project at the playhead. */
  project: FontProject;
  /** The project at any time — what a staggered repeat is drawn from. */
  resolveAt: (t: number) => FontProject;
  time: number;
  settings: CanvasSettings;
  char: string | null;
  onSelectGlyph: (char: string | null) => void;
}) {
  const { frameWidth: fw, frameHeight: fh } = settings;
  const fitView = useFitView(fw, fh);
  const { box, view, scale } = fitView;
  const pan = useRef<{ x: number; y: number; travel: number } | null>(null);

  const letters = useMemo(
    () => canvasScene(project, resolveAt, time, settings),
    [project, resolveAt, time, settings],
  );

  const hit = (e: { target: EventTarget }) =>
    (e.target as Element).closest('[data-char]')?.getAttribute('data-char') ?? null;

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const c = hit(e);
    if (c) return onSelectGlyph(c);
    pan.current = { x: e.clientX, y: e.clientY, travel: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    const g = pan.current;
    if (!g) return;
    if (e.buttons === 0) {
      pan.current = null;
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    g.x = e.clientX;
    g.y = e.clientY;
    g.travel += Math.abs(dx) + Math.abs(dy);
    fitView.pan(dx, dy);
  };
  const onPointerUp = () => {
    const g = pan.current;
    pan.current = null;
    if (g && g.travel < CLICK_SLOP) onSelectGlyph(null);
  };

  const transform =
    `translate(${box.width / 2 + view.x} ${box.height / 2 + view.y}) ` + `scale(${scale}) translate(${-fw / 2} ${-fh / 2})`;

  return (
    <div ref={fitView.ref} className="pt-stage">
      <svg
        className="pt-sheet"
        width={box.width}
        height={box.height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e: MouseEvent) => !hit(e) && fitView.reset()}
        role="img"
        aria-label="Canvas"
      >
        <defs>
          {/* What a transparent frame shows through. */}
          <pattern id="pt-canvas-checker" width={32} height={32} patternUnits="userSpaceOnUse">
            <rect width={32} height={32} fill="#fff" />
            <rect width={16} height={16} fill="#d6d6d6" />
            <rect x={16} y={16} width={16} height={16} fill="#d6d6d6" />
          </pattern>
        </defs>
        <g transform={transform}>
          <rect
            className="pt-canvas-frame"
            width={fw}
            height={fh}
            style={{ fill: settings.transparent ? 'url(#pt-canvas-checker)' : settings.background }}
          />
          <svg
            width={fw}
            height={fh}
            overflow="hidden"
            style={{ '--canvas-ink': settings.textColor } as CSSProperties}
          >
            {letters.map(({ key, char: c, glyph, weight, stretch, x, y, scale: s }) => (
              <g
                key={key}
                data-char={c}
                data-selected={c === char || undefined}
                className="pt-canvas-letter"
                transform={`translate(${x} ${y}) scale(${s})`}
              >
                {/* The letter's advance box: what catches the click. */}
                <rect
                  x={0}
                  y={-project.ascender}
                  width={glyph.advanceWidth}
                  height={project.ascender - project.descender}
                  fill="transparent"
                  pointerEvents="all"
                />
                <Letter glyph={glyph} weight={weight} stretch={stretch} />
              </g>
            ))}
          </svg>
        </g>
      </svg>
    </div>
  );
}

/* ---- The sidebar's Canvas tab --------------------------------------------- */

/** A labelled colour well: the system's own picker, and the hex beside it. */
function ColorRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={disabled ? 'pt-canvas-color is-disabled' : 'pt-canvas-color'}>
      <span className="pt-canvas-field-label">{label}</span>
      <span className="pt-canvas-color-value">{value.toUpperCase()}</span>
      <input type="color" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function CanvasControls({
  settings,
  onChange,
  onExportLottie,
  onExportGif,
  gifProgress,
  onExportVideo,
  videoProgress,
  duration,
  onDurationChange,
}: {
  settings: CanvasSettings;
  onChange: (patch: Partial<CanvasSettings>) => void;
  /** The clip's length in seconds: the timeline's, which playback and export
   *  run within. */
  duration: number;
  onDurationChange: (seconds: number) => void;
  /** Write the frame's animation out as a Lottie file; unset when there is
   *  nothing drawn to export. */
  onExportLottie?: () => void;
  /** The same as an animated GIF; unset when there is nothing to export. */
  onExportGif?: () => void;
  /** How far a GIF export has got, 0–1, while one is rendering. */
  gifProgress?: number | null;
  /** The same as an .mp4; unset when there is nothing to export. */
  onExportVideo?: () => void;
  /** How far an MP4 export has got, 0–1, while one is being written. */
  videoProgress?: number | null;
}) {
  const rendering = gifProgress != null;
  const encoding = videoProgress != null;
  return (
    <>
      <Section title="Text">
        <div className="pt-canvas-field">
          <span className="pt-canvas-field-label">Text</span>
          {/* A text area, not the kit's one-line field: Return breaks the line. */}
          <textarea
            className="text-field pt-canvas-text"
            value={settings.text}
            rows={Math.min(6, Math.max(2, settings.text.split('\n').length))}
            spellCheck={false}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </div>
        <Slider
          label="Size"
          value={settings.size}
          min={12}
          max={1000}
          step={1}
          onChange={(size) => onChange({ size })}
          format={(v) => `${v}px`}
        />
        {/* Only matters once there's a second line. */}
        {settings.text.includes('\n') && (
          <RadioGroup
            label="Align"
            value={settings.align}
            options={ALIGNS.map((a) => ({ value: a, label: a[0].toUpperCase() + a.slice(1) }))}
            onChange={(v) => onChange({ align: v as TextAlign })}
          />
        )}
        {settings.text.includes('\n') && (
          <Slider
            label="Line spacing"
            value={settings.leading}
            min={0.5}
            max={3}
            step={0.05}
            onChange={(leading) => onChange({ leading })}
            format={(v) => `×${v.toFixed(2)}`}
          />
        )}
        {/* Only repeats are staggered, so it's moot without one. */}
        {hasRepeats(settings.text) && (
          <Slider
            label="Stagger repeats"
            value={settings.stagger}
            min={0}
            max={2}
            step={0.05}
            onChange={(stagger) => onChange({ stagger })}
            format={(v) => (v ? `${v.toFixed(2)} s` : 'Off')}
          />
        )}
        <Slider
          label="Stagger weight"
          value={settings.weightStagger}
          min={0}
          max={2}
          step={0.01}
          onChange={(weightStagger) => onChange({ weightStagger })}
          format={(v) => (v ? `${v.toFixed(2)} s` : 'Off')}
        />
        <Slider
          label="Stagger tracking"
          value={settings.trackingStagger}
          min={0}
          max={2}
          step={0.01}
          onChange={(trackingStagger) => onChange({ trackingStagger })}
          format={(v) => (v ? `${v.toFixed(2)} s` : 'Off')}
        />
        <Slider
          label="Stagger offset"
          value={settings.offsetStagger}
          min={0}
          max={2}
          step={0.01}
          onChange={(offsetStagger) => onChange({ offsetStagger })}
          format={(v) => (v ? `${v.toFixed(2)} s` : 'Off')}
        />
        <Slider
          label="Stagger height"
          value={settings.heightStagger}
          min={0}
          max={2}
          step={0.01}
          onChange={(heightStagger) => onChange({ heightStagger })}
          format={(v) => (v ? `${v.toFixed(2)} s` : 'Off')}
        />
      </Section>
      <Section title="Write on">
        <Toggle
          label="Write on"
          hint="Draws each letter in the order typed"
          checked={settings.writeOn}
          onChange={(writeOn) => onChange({ writeOn })}
        />
        {settings.writeOn && (
          <>
            <Slider
              label="Start at"
              value={settings.writeStart}
              min={0}
              max={10}
              step={0.05}
              onChange={(writeStart) => onChange({ writeStart })}
              format={(v) => `${v.toFixed(2)} s`}
            />
            <Slider
              label="Each letter"
              value={settings.writeDuration}
              min={0}
              max={5}
              step={0.05}
              onChange={(writeDuration) => onChange({ writeDuration })}
              format={(v) => `${v.toFixed(2)} s`}
            />
            <Slider
              label="Between letters"
              value={settings.writeGap}
              min={0}
              max={5}
              step={0.05}
              onChange={(writeGap) => onChange({ writeGap })}
              format={(v) => `${v.toFixed(2)} s`}
            />
            <Toggle
              label="Un-write"
              hint="Takes the line back off once it's written"
              checked={settings.unwrite}
              onChange={(unwrite) => onChange({ unwrite })}
            />
            {settings.unwrite && (
              <>
                <Slider
                  label="Hold for"
                  value={settings.unwriteDelay}
                  min={0}
                  max={10}
                  step={0.05}
                  onChange={(unwriteDelay) => onChange({ unwriteDelay })}
                  format={(v) => `${v.toFixed(2)} s`}
                />
                <RadioGroup
                  label="Un-write from"
                  value={settings.unwriteOrder}
                  options={[
                    { value: 'first', label: 'First letter' },
                    { value: 'last', label: 'Last letter' },
                  ]}
                  onChange={(v) => onChange({ unwriteOrder: v as UnwriteOrder })}
                />
              </>
            )}
          </>
        )}
      </Section>
      {settings.writeOn && (
        <Section title="Letter speed">
          {[...new Set([...settings.text].filter((c) => c.trim()))].map((c) => (
            <Slider
              key={c}
              label={c}
              value={speedOf(settings, c)}
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={0.05}
              onChange={(v) => {
                // ×1 is the default, so it's left unset rather than stored.
                const { [c]: _, ...rest } = settings.writeSpeed;
                onChange({ writeSpeed: v === 1 ? rest : { ...rest, [c]: v } });
              }}
              format={(v) => `×${v.toFixed(2)}`}
            />
          ))}
        </Section>
      )}
      <Section title="Colors">
        <ColorRow label="Text" value={settings.textColor} onChange={(textColor) => onChange({ textColor })} />
        <ColorRow
          label="Background"
          value={settings.background}
          disabled={settings.transparent}
          onChange={(background) => onChange({ background })}
        />
        <Toggle
          label="Transparent background"
          hint="No ground on the canvas or in the export"
          checked={settings.transparent}
          onChange={(transparent) => onChange({ transparent })}
        />
      </Section>
      <Section title="Frame">
        <div className="pt-canvas-dims">
          <span className="pt-canvas-dims-label">Width × height</span>
          <Vector
            value={[settings.frameWidth, settings.frameHeight]}
            step={1}
            min={FRAME_MIN}
            max={FRAME_MAX}
            onChange={(axis, v) => {
              const n = Math.round(Math.min(FRAME_MAX, Math.max(FRAME_MIN, v)));
              onChange(axis === 0 ? { frameWidth: n } : { frameHeight: n });
            }}
          />
        </div>
        <Slider
          label="Duration"
          value={duration}
          min={DURATION_MIN}
          max={DURATION_MAX}
          step={1 / FPS}
          onChange={onDurationChange}
          format={(v) => `${v.toFixed(2)} s`}
        />
      </Section>
      <Section title="Export">
        <div className="pt-actions">
          <TextButton label="Export Lottie" disabled={!onExportLottie} onClick={() => onExportLottie?.()}>
            Export Lottie…
          </TextButton>
          <TextButton label="Export GIF" disabled={!onExportGif || rendering} onClick={() => onExportGif?.()}>
            {rendering ? `Rendering GIF… ${Math.round(gifProgress * 100)}%` : 'Export GIF…'}
          </TextButton>
          <TextButton label="Export MP4" disabled={!onExportVideo || encoding} onClick={() => onExportVideo?.()}>
            {encoding ? `Exporting MP4… ${Math.round(videoProgress * 100)}%` : 'Export MP4…'}
          </TextButton>
        </div>
        <Toggle
          label="Loop GIF"
          hint={settings.gifLoop ? 'Plays over and over' : 'Plays once and holds the last frame'}
          checked={settings.gifLoop}
          onChange={(gifLoop) => onChange({ gifLoop })}
        />
        <p className="pt-empty">
          {settings.transparent ? 'Transparent background' : 'With the background'}, over the timeline's work area.
          {settings.transparent && ' An MP4 has no transparency, so it takes the background colour.'}
        </p>
      </Section>
    </>
  );
}
