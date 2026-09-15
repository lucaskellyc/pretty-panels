import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { ControlRow } from './ControlRow';

export interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  /** Amount one press moves the value. */
  step?: number;
  /** Clamp to this minimum; the − button disables once the value reaches it. */
  min?: number;
  /** Clamp to this maximum; the + button disables once the value reaches it. */
  max?: number;
  /** Bold row label. */
  label?: ReactNode;
  /** Secondary hint line under the label. */
  hint?: ReactNode;
  /** Format the displayed value (the underlying number is unchanged). */
  format?: (v: number) => string;
  disabled?: boolean;
}

const MINUS = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1 5h8" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const PLUS = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1 5h8M5 1v8" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/**
 * The `.stepper` control — a recessed capsule holding −/+ buttons around a
 * tabular readout. For values that move in discrete increments (and so want a
 * click target rather than a Slider's continuous drag).
 *
 * **Double-click the readout to type a value**, for the two things a stepper is
 * bad at: distance — twenty presses to cross a second is the cost of a step fine
 * enough to place one by ear — and precision, since a typed value is clamped to
 * the bounds but *not* rounded onto the step. Enter or clicking away commits,
 * Escape restores.
 *
 * What you type is the **underlying number**, not the formatted string — a
 * `format` of `` v => `${v} fps` `` or a timecode is a decoration on the way
 * out, and asking a caller to supply a parser for it would be a second, harder
 * API. So the field opens on the raw value and reads back a plain number.
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  label,
  hint,
  format,
  disabled,
}: StepperProps) {
  const id = useId();
  const labelId = label != null ? id : undefined;
  const decimals = (String(step).split('.')[1] || '').length;

  /** `null` while the readout is showing; the in-progress text while it is being
   *  typed into. Held as a **string**, so the half-finished states every number
   *  passes through on the way to being one — `-`, `1.`, an empty field — are
   *  still there on the next keystroke. */
  const [draft, setDraft] = useState<string | null>(null);
  /** Set by Escape so the blur it causes does not commit what Escape discarded. */
  const escaped = useRef(false);
  const field = useRef<HTMLInputElement>(null);

  const editing = draft !== null;
  // Focus and select on open, from an effect rather than `autoFocus` and an
  // `onFocus` handler: a window that is not itself focused does not always
  // deliver the focus *event*, and then the field opens with the caret parked
  // instead of the value ready to be typed over. Keyed on the boolean, so it
  // runs once when the field opens and not on every keystroke.
  useEffect(() => {
    if (!editing) return;
    field.current?.focus();
    field.current?.select();
  }, [editing]);

  const clamp = (v: number) => {
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  };

  /** A **pressed** value: clamped, then put back on the step's own precision, or
   *  a `step` of 0.05 walks off into 0.15000000000000002 within a few presses. */
  const settle = (v: number) => Number(clamp(v).toFixed(decimals));

  const nudge = (dir: 1 | -1) => onChange(settle(value + dir * step));

  const open = () => {
    if (disabled) return;
    escaped.current = false;
    setDraft(String(value));
  };

  const commit = (text: string) => {
    const parsed = parseFloat(text);
    // Clamped but **not** rounded onto the step, which is the difference between
    // typing and pressing: the buttons walk a grid, and typing is how you get
    // off it. A `step` of 0.1 must not turn a typed 1.25 into 1.3 — reaching a
    // value the presses cannot is most of why the field is here. A caller that
    // needs the grid enforced enforces it in `onChange`, where the rest of its
    // rules already live.
    const next = Number.isNaN(parsed) ? value : clamp(parsed);
    // Nothing that isn't a number, and nothing that settles back to where the
    // value already was: a caller that keys, tags an undo step or marks a file
    // dirty on every `onChange` should not be handed one for typing `3` over `3`.
    if (next !== value) onChange(next);
    setDraft(null);
  };

  return (
    <ControlRow label={label} hint={hint} labelId={labelId}>
      <span className="stepper" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => nudge(-1)}
          disabled={disabled || (min != null && value <= min)}
          aria-label="decrease"
        >
          {MINUS}
        </button>
        {draft === null ? (
          <span
            className={disabled ? 'stepper-value' : 'stepper-value is-editable'}
            onDoubleClick={open}
          >
            {format ? format(value) : value}
          </span>
        ) : (
          <input
            className="stepper-value stepper-input"
            type="text"
            // Not `type="number"`: it refuses to hold the intermediate states
            // above, and brings spin buttons that would sit beside the −/+ this
            // capsule already has. `inputMode` still asks for the numeric keypad.
            inputMode="decimal"
            value={draft}
            aria-labelledby={labelId}
            ref={field}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => {
              if (escaped.current) {
                escaped.current = false;
                setDraft(null);
                return;
              }
              commit(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              // A panel's host is free to bind bare letters or Backspace to
              // something — this library's own demo does, and so does the app it
              // was written for. While this field has focus those keys are text.
              e.stopPropagation();
              if (e.key === 'Enter') commit(e.currentTarget.value);
              else if (e.key === 'Escape') {
                escaped.current = true;
                setDraft(null);
              }
            }}
          />
        )}
        <button
          type="button"
          className="stepper-btn"
          onClick={() => nudge(1)}
          disabled={disabled || (max != null && value >= max)}
          aria-label="increase"
        >
          {PLUS}
        </button>
      </span>
    </ControlRow>
  );
}
