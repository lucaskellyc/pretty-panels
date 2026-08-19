import React, { useRef } from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Format the displayed value (the underlying number is unchanged). */
  format?: (v: number) => string;
}

/**
 * The `.slider-row` control — label + value + capsule track in one object, with
 * a real range input overlaid (opacity 0). The value is driven from pointer
 * geometry under explicit pointer capture so a release outside the track (or a
 * missed pointerup) can never leave the thumb stuck tracking the mouse.
 * Keyboard (arrows) still flows through the native `onChange`.
 */
export function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const decimals = (String(step).split('.')[1] || '').length;

  const valueFromClientX = (clientX: number) => {
    const el = inputRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const t = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const raw = min + Math.max(0, Math.min(1, t)) * (max - min);
    // Snap to the step grid relative to min, matching native range semantics.
    const snapped = min + Math.round((raw - min) / step) * step;
    return Math.max(min, Math.min(max, Number(snapped.toFixed(decimals))));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); // suppress the native drag so it can never get stuck
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus(); // preventDefault dropped the implicit focus
    dragging.current = true;
    onChange(valueFromClientX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!dragging.current) return;
    // A missed up-event leaves us mid-drag with no button pressed — end it here.
    if (e.buttons === 0) {
      dragging.current = false;
      return;
    }
    onChange(valueFromClientX(e.clientX));
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className="slider-row" style={{ ['--fill' as string]: `${pct}%` }}>
      <span className="slider-fill" />
      <span className="control-name">{label}</span>
      <span className="control-value">{format ? format(value) : value}</span>
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
