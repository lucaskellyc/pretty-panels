import { memo, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { RadioGroup, Section, Slider, TextButton, Toggle, Vector } from '../../src';
import { isDrawn, strokePathData, type FontProject, type GlyphData } from './font/model';
import { trimmedGlyph } from './font/trim';
import { useFitView } from './view';

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
const ALIGNS: TextAlign[] = ['left', 'center', 'right'];

export interface CanvasSettings {
  text: string;
  /** Type size: pixels per em, in the frame's own pixels. */
  size: number;
  /** Extra space between letters, in font units. */
  tracking: number;
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
}

const DEFAULTS: CanvasSettings = {
  text: 'Pillotalk',
  size: 240,
  tracking: 0,
  leading: 1.1,
  align: 'center',
  stagger: 0,
  weightStagger: 0,
  frameWidth: 1920,
  frameHeight: 1080,
  writeOn: false,
  writeStart: 0,
  writeDuration: 0.6,
  writeGap: 0.4,
  writeSpeed: {},
};
const STORAGE_KEY = 'pillotalk-studio:canvas';
const FRAME_MIN = 16;
const FRAME_MAX = 8192;

/** The canvas's settings, remembered with the project. */
export function useCanvasSettings(): [CanvasSettings, (patch: Partial<CanvasSettings>) => void] {
  const [settings, setSettings] = useState<CanvasSettings>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
    } catch {
      return DEFAULTS;
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
 *  and draws nothing. Repeats are counted across lines. */
function layoutText(
  text: string,
  tracking: number,
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
    if (!first) x += tracking;
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

/** When each drawn letter starts and how long it takes, in the order typed:
 *  a letter's speed divides both its duration and the gap to the next, so a
 *  slow letter holds the ones after it back. */
function writeSchedule(settings: CanvasSettings, chars: string[]): { start: number; duration: number }[] {
  let at = settings.writeStart;
  return chars.map((c) => {
    const k = speedOf(settings, c);
    const slot = { start: at, duration: settings.writeDuration / k };
    at += settings.writeGap / k;
    return slot;
  });
}

/** How far a letter is written at `t`, 0–1, at an even pen speed. */
function writeProgress(slot: { start: number; duration: number }, t: number): number {
  const local = t - slot.start;
  if (slot.duration <= 0) return local >= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, local / slot.duration));
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

/* ---- Drawing ----------------------------------------------------------------- */

/** A letter's trimmed outlines as path data, in font units with y down from
 *  the baseline — ready for an SVG <path> or a canvas Path2D alike. */
export function letterPaths(glyph: GlyphData) {
  const g = trimmedGlyph(glyph);
  // `strokePathData` flips about its ascender; at 0 that is a plain y-flip.
  const fill = g.contours
    .filter((c) => c.points.length >= 3)
    .map((c) => c.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${-p.y}`).join('') + 'Z')
    .join('');
  const stroke = g.strokes?.length ? strokePathData(g.strokes, 0) : '';
  return { fill, stroke, cap: g.cap ?? 'round', join: g.join ?? 'round' } as const;
}

/** One letter in glyph space, placed by the group above. Memoised on the
 *  glyph, so playback redraws only what is animated. */
const Letter = memo(function Letter({ glyph, weight }: { glyph: GlyphData; weight: number }) {
  const { fill, stroke, cap, join } = useMemo(() => letterPaths(glyph), [glyph]);
  return (
    <>
      {fill && <path className="pt-ink" d={fill} />}
      {stroke && (
        <path className="pt-stroke" d={stroke} strokeWidth={weight} strokeLinecap={cap} strokeLinejoin={join} />
      )}
    </>
  );
});

/** One drawn letter in the frame: its baseline origin in frame pixels, the
 *  glyph as it stands at that moment, and the weight it is stroked at. */
export interface FrameLetter {
  /** Index in the text, a stable key. */
  i: number;
  char: string;
  glyph: GlyphData;
  weight: number;
  x: number;
  y: number;
}

/**
 * What the frame shows at `time`: every drawn letter, placed. The stage draws
 * this as SVG and the video export paints it frame by frame, so the two can't
 * disagree. `project` is the project at `time`; `resolveAt` reaches behind it
 * for staggered repeats and weights.
 */
export function frameLetters(
  project: FontProject,
  resolveAt: (t: number) => FontProject,
  time: number,
  settings: CanvasSettings,
): { letters: FrameLetter[]; scale: number } {
  const { frameWidth: fw, frameHeight: fh, size, tracking, leading, align, stagger, text } = settings;

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
  const { placed, widths } = layoutText(text, tracking, project.unitsPerEm / 4, glyphAt);

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
  const drawable = placed.filter((p): p is Placed & { glyph: GlyphData } => !!p.glyph && isDrawn(p.glyph));
  const schedule = settings.writeOn ? writeSchedule(settings, drawable.map((p) => p.char)) : [];
  // The nth drawn letter takes the weight from `n × weightStagger` behind the
  // playhead; the weight alone, so its other channels stay on time.
  const weightOf = (n: number) =>
    settings.weightStagger && n > 0 ? resolveAt(time - n * settings.weightStagger).strokeWeight : project.strokeWeight;

  const letters = drawable.map(({ i, char, glyph: own, line, x }, n) => {
    const slot = schedule[n];
    const glyph = slot ? writtenGlyph(own, writeProgress(slot, time)) : own;
    return {
      i,
      char,
      glyph,
      weight: weightOf(n),
      x: leftOf(line) + x * s,
      y: baselineOf(line) - (glyph.offsetY ?? 0) * s,
    };
  });
  return { letters, scale: s };
}

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
  const { letters, scale: s } = useMemo(
    () => frameLetters(project, resolveAt, time, settings),
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
        <g transform={transform}>
          <rect className="pt-canvas-frame" width={fw} height={fh} />
          <svg width={fw} height={fh} overflow="hidden">
            {letters.map(({ i, char: c, glyph, weight, x, y }) => (
                <g
                  key={i}
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
                  <Letter glyph={glyph} weight={weight} />
                </g>
            ))}
          </svg>
        </g>
      </svg>
    </div>
  );
}

/* ---- The sidebar's Canvas tab --------------------------------------------- */

export function CanvasControls({
  settings,
  onChange,
  exportProgress,
  onExportVideo,
}: {
  settings: CanvasSettings;
  onChange: (patch: Partial<CanvasSettings>) => void;
  /** 0–1 while an MP4 is being written, null otherwise. */
  exportProgress: number | null;
  onExportVideo: () => void;
}) {
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
        <Slider
          label="Tracking"
          value={settings.tracking}
          min={-300}
          max={600}
          step={5}
          onChange={(tracking) => onChange({ tracking })}
          format={(v) => `${v} u`}
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
      </Section>
      <Section title="Export">
        <div className="pt-actions">
          <TextButton label="Export as MP4" disabled={exportProgress !== null} onClick={onExportVideo}>
            {exportProgress === null ? 'Export as MP4' : `Exporting… ${Math.round(exportProgress * 100)}%`}
          </TextButton>
        </div>
        <p className="pt-empty">The frame, over the timeline's work area.</p>
      </Section>
    </>
  );
}
