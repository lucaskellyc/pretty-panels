import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

/** How long the ring stays solid after a copy. */
const SETTLE_MS = 1000;

/** How long the screen-reader confirmation stays in the live region. */
const ANNOUNCE_MS = 1400;

/** Roughly how long one dash + gap of the hover ring runs, in px. */
const DASH_PERIOD = 10;

/**
 * A pill that copies its text when clicked. Hover grows it a touch and runs
 * marching ants around it; a click copies, and the ring settles — it stops
 * marching and goes solid for a moment. The label never changes and the chip
 * keeps its size, so a copy never shifts anything around it. `solid` is the filled accent, `soft` its pale tint, `plain` no fill at
 * all — then the ants take `antsColor`, so they match the text they surround.
 *
 * `children` is what shows, when it isn't simply `value` (a coloured type
 * signature, say); `value` is always what gets copied. The confirmation is
 * announced through a polite live region, since the ring itself is visual.
 */
export function CopyChip({
  value,
  children,
  tone = 'soft',
  antsColor,
  label,
  title,
}: {
  value: string;
  children?: ReactNode;
  tone?: 'solid' | 'soft' | 'plain';
  antsColor?: string;
  /** What a screen reader calls the button; "Copy <value>" by default. */
  label?: string;
  title?: string;
}) {
  const [settled, setSettled] = useState(false);
  const [announced, setAnnounced] = useState(false);
  const settleTimer = useRef<number | undefined>(undefined);
  const announceTimer = useRef<number | undefined>(undefined);
  const ring = useRef<SVGRectElement>(null);
  // The dash pattern is fitted to the ring's measured length (below), so it
  // starts as a sensible default and settles on first hover.
  const [ants, setAnts] = useState({ r: 0, dash: '6 4', period: DASH_PERIOD });

  useEffect(
    () => () => {
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(announceTimer.current);
    },
    [],
  );

  const copy = () => {
    const done = () => {
      // A keyboard or touch copy may come with no hover first, so fit the
      // ring here too — otherwise it would show as a square.
      measure();
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(announceTimer.current);
      setSettled(true);
      setAnnounced(true);
      settleTimer.current = window.setTimeout(() => setSettled(false), SETTLE_MS);
      announceTimer.current = window.setTimeout(() => setAnnounced(false), ANNOUNCE_MS);
    };
    // Confirm even if the clipboard refuses (an insecure origin, a denied
    // permission) — there's nothing more useful the chip can say.
    const write = navigator.clipboard?.writeText(value);
    if (write) write.then(done, done);
    else done();
  };

  // Fit a whole number of dashes around the pill so the pattern has no seam
  // where it meets itself. The corner radius has to be set before measuring,
  // since it changes the outline's length.
  const measure = () => {
    const el = ring.current;
    const box = el?.ownerSVGElement?.getBoundingClientRect();
    if (!el || !box || !box.height) return;
    // Half the height: a capsule, the same shape as the chip it surrounds.
    const r = box.height / 2;
    el.setAttribute('rx', String(r));
    el.setAttribute('ry', String(r));
    const len = el.getTotalLength();
    if (!len) return;
    const period = len / Math.max(4, Math.round(len / DASH_PERIOD));
    const dash = `${(period * 0.58).toFixed(2)} ${(period * 0.42).toFixed(2)}`;
    if (dash !== ants.dash || r !== ants.r) setAnts({ r, dash, period });
  };

  return (
    <span
      className="copy-chip-wrap"
      onMouseEnter={measure}
      style={antsColor ? ({ '--ants-color': antsColor } as CSSProperties) : undefined}
    >
      <button
        type="button"
        className={`copy-chip is-${tone}${settled ? ' is-copied' : ''}`}
        onClick={copy}
        aria-label={label ?? `Copy ${value}`}
        title={title ?? 'Click to copy'}
      >
        <span className="copy-chip-fill" aria-hidden="true" />
        <span className="copy-chip-track">
          <span className="copy-chip-label">{children ?? value}</span>
        </span>
        <svg className="copy-chip-ants" aria-hidden="true">
          <rect
            ref={ring}
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx={ants.r}
            ry={ants.r}
            style={{ strokeDasharray: ants.dash, ['--ants-period' as string]: `${-ants.period}px` }}
          />
        </svg>
      </button>
      <span className="copy-chip-status" role="status" aria-live="polite">
        {announced ? `Copied ${value}` : ''}
      </span>
    </span>
  );
}
