import { type ReactNode, useState } from 'react';

export interface SectionProps {
  title: string;
  /** Start collapsed. Defaults to open. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/** `.collapse-section` — a bold header that folds its body with a smooth wipe. */
export function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapse-section">
      <button className="collapse-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <svg className="chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <div className={`collapsible${open ? '' : ' is-collapsed'}`}>
        <div className="collapsible-clip">
          <div className="collapse-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
