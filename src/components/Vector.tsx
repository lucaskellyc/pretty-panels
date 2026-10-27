import React, { useEffect, useRef, useState } from 'react';
import { clamp, cx, decimalsOf } from './util';

export interface VectorProps {
  /** The field values. The capsule renders one field per entry — use 2, 3, or 4. */
  value: number[];
  onChange: (axis: number, v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Paint each field with its live rgb value (expects three 0–255 components). */
  colorMode?: boolean;
  /** What the capsule sets, for assistive tech — e.g. "Rotation". Names the
   *  group the fields sit in; give it whenever no visible label says it. */
  label?: string;
  /** Per-field names, announced with each field. Default X / Y / Z / W, or
   *  R / G / B (/ A) with `colorMode`. */
  fieldLabels?: string[];
}

const AXES = ['X', 'Y', 'Z', 'W'];
const CHANNELS = ['R', 'G', 'B', 'A'];

/** Safari (desktop or iOS, any WebKit shell that isn't Chrome or Firefox on
 *  iOS). It stops delivering a scrub's moves once the page under the cursor is
 *  `pointer-events: none`, so it doesn't get the hover half of `.pp-scrubbing`. */
const isSafari = () =>
  typeof navigator !== 'undefined' && /^((?!chrome|chromium|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);

function readContrast(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#000000' : '#FFFFFF';
}

/**
 * The `.vector` control — a capsule of fused numeric fields, one per `value`
 * entry (2–4). Drag a field vertically to scrub (up = increase), or type.
 * `colorMode` paints each field with the live rgb value; text flips for contrast.
 *
 * **Typing** works on the field's text, not its number, the way `Stepper`'s
 * readout does — so the field can be emptied, or hold a `-` or a `1.` on the
 * way to a number, without snapping back. Every keystroke that reads as a
 * number inside the bounds is reported as it lands; Enter or clicking away
 * clamps and commits, and an empty field falls back to the value it opened on.
 * Escape restores that value. ArrowUp / ArrowDown step by `step`.
 */
export function Vector({
  value,
  onChange,
  step = 0.5,
  min,
  max,
  colorMode = false,
  label,
  fieldLabels,
}: VectorProps) {
  const state = useRef<{
    startVal: number;
    /** Travel so far, up = positive. Summed per move rather than read off
     *  `clientY`, because under pointer lock `clientY` stops moving. */
    dy: number;
    lastY: number;
    axis: number;
    dragging: boolean;
    field: HTMLInputElement;
    mouse: boolean;
  } | null>(null);

  /** The field being typed into, the value it opened on (what Escape restores
   *  and an empty field falls back to), and its in-progress text. Held as a
   *  **string** so the half-finished states a number passes through — an empty
   *  field, `-`, `1.` — survive to the next keystroke instead of being
   *  re-rendered back to the last value. One at a time: only one field has focus. */
  const [draft, setDraft] = useState<{ axis: number; start: number; text: string } | null>(null);
  /** Set by Escape so the blur it causes does not commit what Escape discarded. */
  const escaped = useRef(false);

  const decimals = decimalsOf(step);
  const inBounds = (v: number) => (min == null || v >= min) && (max == null || v <= max);

  const open = (axis: number) => {
    escaped.current = false;
    setDraft({ axis, start: value[axis], text: String(value[axis]) });
  };

  /** Live: report what the text reads as, but only once it is a number the
   *  bounds allow — clamping mid-entry would turn the `2` of a `25` typed
   *  against a `min` of 10 into `10`, and the `25` would never arrive. */
  const type = (axis: number, text: string) => {
    setDraft((d) => (d ? { ...d, text } : d));
    const parsed = parseFloat(text);
    if (Number.isFinite(parsed) && inBounds(parsed) && parsed !== value[axis]) onChange(axis, parsed);
  };

  /** Enter or blur: clamp what was typed, or fall back to where the field
   *  started if it is not a number at all. */
  const commit = (axis: number, text: string) => {
    const parsed = parseFloat(text);
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : (draft?.start ?? value[axis]);
    if (next !== value[axis]) onChange(axis, next);
    setDraft(null);
  };

  /** While a scrub is live the cursor sweeps across the rest of the UI, and the
   *  browser would select the labels it passes and light up the controls under
   *  it. The classes turn both off page-wide (see `.pp-scrubbing` in panels.css);
   *  Safari gets the selection half only — see `isSafari`.
   *
   *  That leaves nothing under the cursor to hit-test, so the drag is tracked on
   *  `window`, not on the field: every pointer event reaches it whatever is (or
   *  isn't) under the cursor, which pointer capture alone does not promise in
   *  every engine. */
  const move = useRef<(e: PointerEvent) => void>(() => {});
  const end = useRef<() => void>(() => {});
  // Installed once and forwarding to the refs, the way `Popover` keeps its
  // listeners current — so add and remove see the same two functions.
  const listeners = useRef({
    move: (e: PointerEvent) => move.current(e),
    end: () => end.current(),
  }).current;

  end.current = () => {
    if (state.current && document.pointerLockElement === state.current.field) document.exitPointerLock();
    state.current = null;
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.end);
    window.removeEventListener('pointercancel', listeners.end);
    document.documentElement.classList.remove('pp-scrubbing', 'pp-scrubbing-hover');
  };
  // Unmounted mid-drag: don't leave the whole page unselectable.
  useEffect(() => () => end.current(), []);

  move.current = (e) => {
    const s = state.current;
    if (!s) return;
    // If the button came up without us seeing the pointerup (e.g. released past
    // the window edge), end the scrub here so the field doesn't keep tracking.
    if (e.buttons === 0) {
      end.current();
      return;
    }
    s.dy += document.pointerLockElement === s.field ? -e.movementY : s.lastY - e.clientY;
    s.lastY = e.clientY;
    if (!s.dragging && Math.abs(s.dy) < 3) return;
    if (!s.dragging) {
      s.field.blur();
      // Whatever the first 3px already started selecting goes too.
      window.getSelection()?.removeAllRanges();
      document.documentElement.classList.add('pp-scrubbing');
      if (!isSafari()) document.documentElement.classList.add('pp-scrubbing-hover');
      // Lock the cursor to the field for the rest of the scrub: it hides, stops
      // at no screen edge, and can't stray onto anything else. Mouse only, and
      // best-effort — where the engine refuses (no lock support, no recent
      // gesture, Escape mid-drag) the classes above still keep the page inert.
      if (s.mouse && s.field.requestPointerLock) {
        try {
          (s.field.requestPointerLock() as Promise<void> | undefined)?.catch(() => {});
        } catch {
          /* refused; scrub without the lock */
        }
      }
    }
    s.dragging = true;
    const raw = s.startVal + (s.dy / 4) * step;
    onChange(s.axis, clamp(Number((Math.round(raw / step) * step).toFixed(decimals)), min, max));
  };

  const onPointerDown = (axis: number) => (e: React.PointerEvent<HTMLInputElement>) => {
    end.current();
    state.current = {
      startVal: value[axis],
      dy: 0,
      lastY: e.clientY,
      axis,
      dragging: false,
      field: e.currentTarget,
      mouse: e.pointerType === 'mouse',
    };
    // Still captured, so a drag that leaves the browser window keeps reporting
    // where the engine supports it; the window listeners are the guarantee.
    e.currentTarget.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', listeners.move);
    window.addEventListener('pointerup', listeners.end);
    window.addEventListener('pointercancel', listeners.end);
  };

  let bg: string | undefined;
  let fg: string | undefined;
  if (colorMode) {
    // Exactly three channels: a missing one reads as 0 (a 2-field value used to
    // paint `rgb(r,g,undefined)`, which is invalid and painted nothing), and a
    // fourth is a field like any other, not part of the colour.
    const [r, g, b] = [0, 1, 2].map((i) => clamp(Math.round(value[i] ?? 0), 0, 255));
    bg = `rgb(${r},${g},${b})`;
    fg = readContrast(r, g, b);
  }

  return (
    <span className={cx('vector', colorMode && 'color-vector')} role="group" aria-label={label}>
      {value.map((v, axis) => (
        <input
          key={axis}
          type="text"
          // Not `type="number"`: it reports an empty field, a `-` or a `1e` all
          // as `""`, so a controlled field cannot hold them and snaps back to
          // the last value. `inputMode` still asks for the numeric keypad.
          inputMode="decimal"
          aria-label={(fieldLabels ?? (colorMode ? CHANNELS : AXES))[axis]}
          value={draft?.axis === axis ? draft.text : String(v)}
          style={bg ? { background: bg, color: fg } : undefined}
          onPointerDown={onPointerDown(axis)}
          onFocus={() => open(axis)}
          onChange={(e) => type(axis, e.target.value)}
          onBlur={(e) => {
            if (escaped.current) {
              escaped.current = false;
              setDraft(null);
              return;
            }
            commit(axis, e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            // While a field has focus, keys are text — a host binding bare
            // letters or Backspace must not see them. Same call as `Stepper`.
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              if (draft && draft.start !== value[axis]) onChange(axis, draft.start);
              escaped.current = true;
              e.currentTarget.blur();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              // What `type="number"` used to do for free.
              e.preventDefault();
              const base = parseFloat(e.currentTarget.value);
              const from = Number.isFinite(base) ? base : v;
              const dir = e.key === 'ArrowUp' ? 1 : -1;
              const next = Number(clamp(from + dir * step, min, max).toFixed(decimals));
              setDraft((d) => (d ? { ...d, text: String(next) } : d));
              if (next !== v) onChange(axis, next);
            }
          }}
        />
      ))}
    </span>
  );
}
