import type { ReactNode } from 'react';

/**
 * The fields every row-shaped control in this set draws from. `List` rows and
 * `Tree` nodes are the same capsule with different arrangements around it, so
 * the fields — and the markup below — live here rather than being kept in step
 * by hand in two files.
 */
export interface RowFields {
  /** Identifies the row. This is what the move callbacks report against. */
  id: string;
  /** Visible text. Defaults to `id`. */
  label?: ReactNode;
  /** Leading icon (e.g. an inline `<svg>`). */
  icon?: ReactNode;
  /** Trailing text, set in the mono face — a value, count or status. */
  meta?: ReactNode;
  /** Dim the row and take away its handle, so it can't be picked up. */
  disabled?: boolean;
}

/* Two columns of three — the grip reads as something to grab at any size, and
   it inherits the row's on-track colour like every other glyph in the set. */
export const GRIP = (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
    <circle cx="2.5" cy="2.5" r="1.25" />
    <circle cx="7.5" cy="2.5" r="1.25" />
    <circle cx="2.5" cy="7" r="1.25" />
    <circle cx="7.5" cy="7" r="1.25" />
    <circle cx="2.5" cy="11.5" r="1.25" />
    <circle cx="7.5" cy="11.5" r="1.25" />
  </svg>
);

/** Disclosure chevron. Points right when closed; CSS rotates it when open. */
export const CHEVRON = (
  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
    <path d="M2.5 1L6 4l-3.5 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Horizontal ellipsis — the "more actions" affordance on a row's right edge. */
export const ELLIPSIS = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="6" r="1.25" />
    <circle cx="6" cy="6" r="1.25" />
    <circle cx="10" cy="6" r="1.25" />
  </svg>
);

/** The inside of a row capsule, after whatever handles precede it. */
export function RowContent({ row }: { row: RowFields }) {
  return (
    <>
      {row.icon && <span className="pp-list-icon">{row.icon}</span>}
      <span className="pp-list-label">{row.label ?? row.id}</span>
      {row.meta != null && <span className="pp-list-meta">{row.meta}</span>}
    </>
  );
}

/** Name for a screen reader, falling back to the id when `label` isn't a string. */
export const nameOf = (row: RowFields) => (typeof row.label === 'string' ? row.label : row.id);

/** Read a pixel-valued custom property off an element, so CSS stays the source
 *  of truth for a measurement the drag math also needs. */
export function pxVar(el: Element | null, name: string, fallback: number) {
  if (!el) return fallback;
  const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}
