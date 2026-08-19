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
  /** Plate width (default 380px from the stylesheet). Unchanged while collapsed —
   *  collapsing only folds the body away. */
  width?: number | string;
  /** Show a header toggle (−/+) that folds the plate's body away. */
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
 * With `collapsible`, the header grows a −/+ toggle that folds the body away
 * while the plate keeps its width.
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
  const innerRef = useRef<HTMLDivElement>(null);

  // Collapse folds the body away vertically while the plate keeps its width, so
  // measure the body's natural height and expose it as --panel-body-h for the
  // height animation. The content is laid out at a fixed width (never reflows),
  // so observing the inner catches only genuine content-size changes, not the
  // collapse animation itself.
  useLayoutEffect(() => {
    if (!collapsible) return;
    const panel = panelRef.current;
    const inner = innerRef.current;
    if (!panel || !inner) return;

    const measure = () => {
      panel.style.setProperty('--panel-body-h', `${inner.offsetHeight}px`);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
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
  // Drive the plate width through a custom property so a stylesheet can theme it
  // (an inline `width` couldn't be beaten by a class). Collapsing leaves the
  // width untouched — only the body folds away.
  const w = typeof width === 'number' ? `${width}px` : width;
  const mergedStyle = { ...(w != null ? { '--panel-w': w } : null), ...style } as CSSProperties;

  return (
    <div ref={panelRef} className={cls} style={mergedStyle}>
      {showHead && (
        <div className="panel-head">
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
