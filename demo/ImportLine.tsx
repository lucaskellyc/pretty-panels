import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../src';
import { Tokens } from './Code';

/** How long the ring stays solid after a copy, as on a copy chip. */
const SETTLE_MS = 1000;

/** Roughly how long one dash + gap of the hover ring runs, in px. */
const DASH_PERIOD = 10;

const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="4.75" y="4.75" width="7.5" height="7.5" rx="1.75" />
    <path d="M9.25 2.75v-.5a1.5 1.5 0 0 0-1.5-1.5h-5a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 1.5 1.5h.5" />
  </svg>
);

/**
 * A one-line snippet in a recessed capsule, coloured like a code block, with a
 * copy button at its left end. The text stays selectable; the button is the
 * way to copy it. Hovering the button runs a copy chip's marching ants round
 * the whole capsule, and a copy settles that ring solid for a moment. The
 * confirmation is announced through a polite live region, since the ring itself
 * is visual.
 */
export function ImportLine({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const ring = useRef<SVGRectElement>(null);
  const [ants, setAnts] = useState({ r: 0, dash: '6 4', period: DASH_PERIOD });

  // Fit a whole number of dashes round the capsule, as CopyChip does — its
  // width follows the component's name, so the ring is measured, not fixed.
  const measure = () => {
    const el = ring.current;
    const box = el?.ownerSVGElement?.getBoundingClientRect();
    if (!el || !box || !box.height) return;
    const r = box.height / 2;
    el.setAttribute('rx', String(r));
    el.setAttribute('ry', String(r));
    const len = el.getTotalLength();
    if (!len) return;
    const period = len / Math.max(4, Math.round(len / DASH_PERIOD));
    const dash = `${(period * 0.58).toFixed(2)} ${(period * 0.42).toFixed(2)}`;
    if (dash !== ants.dash || r !== ants.r) setAnts({ r, dash, period });
  };

  const copy = () => {
    const done = () => {
      // A keyboard copy may come with no hover first, so fit the ring here too.
      measure();
      window.clearTimeout(timer.current);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), SETTLE_MS);
    };
    // Confirm even if the clipboard refuses, as CopyChip does.
    const write = navigator.clipboard?.writeText(code);
    if (write) write.then(done, done);
    else done();
  };

  return (
    <div className={`import-line${copied ? ' is-copied' : ''}`}>
      <span className="import-line-btn" onMouseEnter={measure}>
        <IconButton onClick={copy} label={label}>
          {COPY_ICON}
        </IconButton>
      </span>
      <code className="import-line-code">
        <Tokens lang="tsx" src={code} />
      </code>
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
      <span className="copy-chip-status" role="status" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </div>
  );
}
