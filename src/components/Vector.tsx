import React, { useRef } from 'react';

export interface VectorProps {
  /** The field values. The capsule renders one field per entry — use 2, 3, or 4. */
  value: number[];
  onChange: (axis: number, v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Paint each field with its live rgb value (expects three 0–255 components). */
  colorMode?: boolean;
}

function readContrast(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#000000' : '#FFFFFF';
}

/**
 * The `.vector` control — a capsule of fused numeric fields, one per `value`
 * entry (2–4). Drag a field vertically to scrub (up = increase), or type.
 * `colorMode` paints each field with the live rgb value; text flips for contrast.
 */
export function Vector({ value, onChange, step = 0.5, min, max, colorMode = false }: VectorProps) {
  const state = useRef<{
    startY: number;
    startVal: number;
    axis: number;
    dragging: boolean;
  } | null>(null);

  const clamp = (v: number) => {
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  };

  const onPointerDown = (axis: number) => (e: React.PointerEvent<HTMLInputElement>) => {
    state.current = { startY: e.clientY, startVal: value[axis], axis, dragging: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    const s = state.current;
    if (!s) return;
    // If the button came up without us seeing the pointerup (e.g. released past
    // the window edge), end the scrub here so the field doesn't keep tracking.
    if (e.buttons === 0) {
      state.current = null;
      return;
    }
    const dy = s.startY - e.clientY;
    if (!s.dragging && Math.abs(dy) < 3) return;
    s.dragging = true;
    (e.target as HTMLInputElement).blur();
    const decimals = (String(step).split('.')[1] || '').length;
    const raw = s.startVal + (dy / 4) * step;
    onChange(s.axis, clamp(Number((Math.round(raw / step) * step).toFixed(decimals))));
  };
  const onPointerUp = () => (state.current = null);

  let bg: string | undefined;
  let fg: string | undefined;
  if (colorMode) {
    const [r, g, b] = value.map((v) => Math.min(255, Math.max(0, Math.round(v))));
    bg = `rgb(${r},${g},${b})`;
    fg = readContrast(r, g, b);
  }

  return (
    <span className={colorMode ? 'vector color-vector' : 'vector'}>
      {value.map((v, axis) => (
        <input
          key={axis}
          type="number"
          value={v}
          step={step}
          style={bg ? { background: bg, color: fg } : undefined}
          onPointerDown={onPointerDown(axis)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onLostPointerCapture={onPointerUp}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) onChange(axis, clamp(parsed));
          }}
        />
      ))}
    </span>
  );
}
