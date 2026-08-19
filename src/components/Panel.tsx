import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export interface PanelProps {
  /** Optional header bar. A string renders bold; pass a node for custom markup. */
  title?: ReactNode;
  /** Plate width (default 380px from the stylesheet). While collapsed the plate
   *  animates down to hug its header. */
  width?: number | string;
  /** Show a header toggle (−/+) that collapses the plate into a title capsule. */
  collapsible?: boolean;
  /** Collapsed state (controlled). Pair with `onCollapsedChange`; omit for
   *  uncontrolled behavior via `defaultCollapsed`. */
  collapsed?: boolean;
  /** Start collapsed (uncontrolled). Only meaningful with `collapsible`. */
  defaultCollapsed?: boolean;
  /** Called with the next state whenever the collapse toggle is clicked. */
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const MINUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);
const PLUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/**
 * A static control-panel plate — the grey `.panel` surface with an optional
 * header bar and a padded body. Use it to group controls anywhere in a layout.
 * With `collapsible`, the header grows a −/+ toggle that folds the plate down to
 * a title capsule.
 */
export function Panel({
  title,
  width,
  collapsible = false,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  className,
  style,
  children,
}: PanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isControlled = collapsedProp !== undefined;
  const collapsed = isControlled ? collapsedProp : internalCollapsed;
  const isCollapsed = collapsible && collapsed;
  const showHead = title != null || collapsible;

  const panelRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Collapse animates between fixed pixel sizes rather than intrinsic keywords,
  // so measure the two dynamic endpoints and expose them as custom properties:
  //   --panel-collapsed-w  the header's hug width (+ plate borders)
  //   --panel-body-h       the body's natural height at its fixed width
  // The body content is laid out at a fixed width (never reflows), so we observe
  // only the inner — its size is stable during the collapse, so this never runs
  // mid-animation. The header is measured by momentarily letting it hug.
  useLayoutEffect(() => {
    if (!collapsible) return;
    const panel = panelRef.current;
    const inner = innerRef.current;
    if (!panel) return;

    const measure = () => {
      const head = headRef.current;
      if (head) {
        const prev = head.style.width;
        head.style.width = 'max-content';
        const hug = head.getBoundingClientRect().width;
        head.style.width = prev;
        const border = parseFloat(getComputedStyle(panel).borderLeftWidth) || 0;
        panel.style.setProperty('--panel-collapsed-w', `${Math.ceil(hug + border * 2)}px`);
      }
      if (inner) {
        panel.style.setProperty('--panel-body-h', `${inner.offsetHeight}px`);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (inner) ro.observe(inner);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [collapsible]);

  const toggle = () => {
    const next = !collapsed;
    if (!isControlled) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  const cls = [
    'panel',
    collapsible ? 'is-collapsible' : '',
    isCollapsed ? 'is-collapsed' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  // Drive the plate width through a custom property so the `.is-collapsed` rule
  // can override it (an inline `width` couldn't be beaten by a class), and so the
  // collapse can animate between the two.
  const w = typeof width === 'number' ? `${width}px` : width;
  const mergedStyle = { ...(w != null ? { '--panel-w': w } : null), ...style } as CSSProperties;

  return (
    <div ref={panelRef} className={cls} style={mergedStyle}>
      {showHead && (
        <div ref={headRef} className="panel-head">
          {title != null && (typeof title === 'string' ? <b>{title}</b> : title)}
          {collapsible && (
            <button
              type="button"
              className="panel-collapse-btn"
              onClick={toggle}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? PLUS : MINUS}
            </button>
          )}
        </div>
      )}
      {/* Kept mounted so the collapse can animate; the fixed-width inner keeps the
          content from reflowing while the body clips it to 0. */}
      <div className="panel-body">
        <div ref={innerRef} className="panel-body-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
