import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Format the displayed value (the underlying number is unchanged). */
  format?: (v: number) => string;
  /**
   * How the pointer drives the value. `'relative'` (default): a drag nudges
   * the value from where it is, and a click opens a field to type into.
   * `'absolute'`: a press jumps the value to the pointer and a drag follows
   * it — right for a seek bar, where the position on the track *is* the value.
   * Enter types a value in either mode.
   */
  mode?: 'relative' | 'absolute';
}

/** Travel (px) before a press commits to a direction. Under it, it's a click. */
const DRAG_SLOP = 3;
/** Shift-drag moves at this fraction of the normal rate, for fine adjustment. */
const FINE = 0.1;

/**
 * The `.slider-row` control — label + value + capsule track in one object, with
 * a real range input overlaid (opacity 0). Driven under explicit pointer
 * capture so a release outside the track (or a missed pointerup) can never
 * leave it stuck tracking the mouse.
 *
 * A press is a click until it travels DRAG_SLOP. A click opens a field to type
 * an exact number into (so does Enter). A sideways drag scrubs *relative* to
 * the current value — one track width covers the full range, Shift for fine —
 * so nothing jumps to where you pressed. A mostly-vertical drag is let go, and
 * on touch the page scrolls (`touch-action: pan-y`). Arrow keys still flow
 * through the native `onChange`. `mode="absolute"` swaps all of that for
 * press-to-jump, drag-to-follow.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  mode = 'relative',
}: SliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [scrubbing, setScrubbing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  // The live press. `raw` is the unsnapped value the drag accumulates into, so
  // slow movement still adds up across step boundaries.
  const press = useRef<{
    mode: 'pending' | 'scrub' | 'ignore';
    x0: number;
    y0: number;
    x: number;
    raw: number;
  } | null>(null);
  const decimals = (String(step).split('.')[1] || '').length;

  // Snap to the step grid relative to min, matching native range semantics.
  const snap = (raw: number) => {
    const snapped = min + Math.round((raw - min) / step) * step;
    return Math.max(min, Math.min(max, Number(snapped.toFixed(decimals))));
  };

  const valueFromClientX = (clientX: number) => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snap(min + t * (max - min));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); // suppress the native thumb jump and drag
    e.currentTarget.setPointerCapture(e.pointerId);
    // preventDefault dropped the implicit focus. Not a keyboard focus, so no
    // ring — engines without the option fall back to their own heuristic.
    e.currentTarget.focus({ focusVisible: false } as FocusOptions);
    if (mode === 'absolute') {
      press.current = { mode: 'scrub', x0: e.clientX, y0: e.clientY, x: e.clientX, raw: value };
      setScrubbing(true);
      onChange(valueFromClientX(e.clientX));
      return;
    }
    press.current = { mode: 'pending', x0: e.clientX, y0: e.clientY, x: e.clientX, raw: value };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    const p = press.current;
    if (!p || p.mode === 'ignore') return;
    // A missed up-event leaves us mid-press with no button down — end it here.
    if (e.buttons === 0) {
      endPress();
      return;
    }
    if (p.mode === 'pending') {
      const dx = Math.abs(e.clientX - p.x0);
      const dy = Math.abs(e.clientY - p.y0);
      if (Math.max(dx, dy) < DRAG_SLOP) return;
      // Fall through with p.x still at the press point, so the slop counts
      // toward the drag and the value tracks the pointer from where it went down.
      p.mode = dx >= dy ? 'scrub' : 'ignore';
      if (p.mode === 'ignore') return;
      setScrubbing(true);
    }
    if (mode === 'absolute') {
      onChange(valueFromClientX(e.clientX));
      return;
    }
    const width = inputRef.current?.getBoundingClientRect().width || 1;
    const rate = ((max - min) / width) * (e.shiftKey ? FINE : 1);
    // Clamp the accumulator too, so reversing at an end responds at once.
    p.raw = Math.max(min, Math.min(max, p.raw + (e.clientX - p.x) * rate));
    p.x = e.clientX;
    const next = snap(p.raw);
    if (next !== value) onChange(next);
  };
  const endPress = () => {
    press.current = null;
    setScrubbing(false);
  };
  const onPointerUp = () => {
    const wasClick = press.current?.mode === 'pending';
    endPress();
    if (wasClick) startEdit();
  };

  const startEdit = () => {
    endPress();
    setDraft(String(value));
  };
  const commitEdit = () => {
    if (draft === null) return;
    const typed = Number(draft.trim());
    setDraft(null);
    if (draft.trim() !== '' && Number.isFinite(typed)) onChange(snap(typed));
  };
  const cancelEdit = () => setDraft(null);

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const shown = format ? format(value) : value;
  const editing = draft !== null;
  // Hand focus back to the range once the field is gone (it's `hidden` until
  // then, and a hidden input can't take focus) — unless the edit ended because
  // focus already went somewhere else.
  // The field can't be cloned into .slider-ink like the readout, so its ink is
  // a two-stop gradient clipped to the glyphs instead, the stop placed where
  // the fill's edge crosses the field. The value can't change mid-edit, so one
  // measurement when the field opens holds until it closes.
  useLayoutEffect(() => {
    const field = editRef.current;
    const row = field?.parentElement;
    if (!field || !row) return;
    const r = row.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    const edge = (r.width * pct) / 100 - (f.left - r.left);
    field.style.setProperty('--edge', `${edge}px`);
    // The digits are right-aligned, so the caret and the selection sit at the
    // field's right end; their single-colour styling follows that side.
    field.classList.toggle('is-on-fill', edge >= f.width);
  }, [editing, pct]);
  // WebKit won't recolour gradient-clipped glyphs inside a selection, so while
  // one exists the field falls back to solid ink (see CSS). Native listeners:
  // React's onSelect misses the select-all on open.
  useEffect(() => {
    const field = editRef.current;
    if (!field) return;
    const sync = () =>
      field.classList.toggle('has-selection', field.selectionStart !== field.selectionEnd);
    sync();
    field.addEventListener('select', sync);
    field.addEventListener('input', sync);
    document.addEventListener('selectionchange', sync);
    return () => {
      field.removeEventListener('select', sync);
      field.removeEventListener('input', sync);
      document.removeEventListener('selectionchange', sync);
    };
  }, [editing]);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) {
      const active = document.activeElement;
      if (!active || active === document.body) {
        inputRef.current?.focus({ focusVisible: false } as FocusOptions);
      }
    }
    wasEditing.current = editing;
  }, [editing]);
  return (
    <div
      className={`slider-row${scrubbing ? ' is-scrubbing' : ''}${editing ? ' is-editing' : ''}`}
      style={{ ['--fill' as string]: `${pct}%` }}
    >
      <span className="slider-fill" />
      <span className="control-name" id={labelId}>{label}</span>
      {editing ? (
        <input
          ref={editRef}
          className="slider-edit"
          type="text"
          inputMode="decimal"
          aria-labelledby={labelId}
          value={draft}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            else if (e.key === 'Escape') cancelEdit();
          }}
        />
      ) : (
        <span className="control-value">{shown}</span>
      )}
      {/* The same label and value again in on-accent ink, clipped to the fill,
          so text flips colour exactly where the accent edge crosses it. */}
      <span className="slider-ink" aria-hidden="true">
        <span className="control-name">{label}</span>
        {!editing && <span className="control-value">{shown}</span>}
      </span>
      <input
        ref={inputRef}
        type="range"
        // The visible label names it; a formatted readout ("40%", "1.2 s") is
        // what a screen reader should say for the value, not the raw number.
        aria-labelledby={labelId}
        aria-valuetext={format?.(value)}
        min={min}
        max={max}
        step={step}
        value={value}
        hidden={editing}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endPress}
        onLostPointerCapture={endPress}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            startEdit();
          }
        }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
