import { type ReactNode, useId, useState } from 'react';
import { cx } from './util';

export interface SectionProps {
  title: string;
  /** Open state (controlled). Pair with `onOpenChange`; omit for uncontrolled
   *  behavior via `defaultOpen`. */
  open?: boolean;
  /** Start open (uncontrolled). Defaults to open. */
  defaultOpen?: boolean;
  /** Called with the next state whenever the header is clicked. */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** `.collapse-section` — a bold header that folds its body with a smooth wipe. */
export function Section({ title, open: openProp, defaultOpen = true, onOpenChange, children }: SectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const bodyId = useId();

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className="collapse-section">
      <button className="collapse-head" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
        <span>{title}</span>
        <svg className="chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <div id={bodyId} className={cx('collapsible', !open && 'is-collapsed')}>
        <div className="collapsible-clip">
          <div className="collapse-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
