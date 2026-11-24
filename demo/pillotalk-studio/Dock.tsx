import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, Panel, type IconName } from '../../src';
import type { FontProject } from './font/model';
import { codepointLabel } from './font/model';
import { Inspector } from './Inspector';
import type { KeyContext } from './timeline/KeyGutter';
import type { EditMessage } from './types';

/** The docked column's width, which framing keeps the sheet clear of. */
export const DOCK_W = 320;
/** A rolled-up plate's icon, in px at its 24px size. */
const DOCK_ICON_SIZE = 24;

/** Icons whose ink sits off the middle of their frame, and the nudge that
 *  puts it back, in px at DOCK_ICON_SIZE: the negated centre of their ink,
 *  measured off the rendered glyph. The marquee's box outline outweighs its
 *  cursor, so its mass sits up and to the left. Under ~0.5px is left alone. */
const OPTICAL_OFFSET: Partial<Record<IconName, [number, number]>> = {
  marquee: [1.5, 1.5],
};

/** A kit icon sized for a rolled-up plate and centred by eye rather than by
 *  its frame. */
export function DockIcon({ name }: { name: IconName }) {
  const [x, y] = OPTICAL_OFFSET[name] ?? [0, 0];
  return (
    <span className="pt-dock-glyph" style={x || y ? { translate: `${x}px ${y}px` } : undefined}>
      <Icon name={name} size={DOCK_ICON_SIZE} />
    </span>
  );
}

/** The circle's close glyph: a plain cross in the plate's ink, where the
 *  kit's `close` icon is a filled badge with the cross knocked out of it. */
const CLOSE = (
  <svg width={DOCK_ICON_SIZE} height={DOCK_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

/** The kit's margin under a panel body (panels.css). */
const BODY_MARGIN = 4;
/** The rolled-up circle, and the gap between it and the plate it opens. */
const ORB = 48;
const ORB_GAP = 12;
/** A bottom sheet's share of its column at most, leaving the stage above it
 *  in view and in reach. */
const SHEET_MAX = 0.5;

/**
 * One docked plate, opened from a circle holding its icon. The circle stays
 * pinned to its corner whether or not the plate is open: open, the plate
 * scales out of it — headerless, under it — and the circle turns to a close
 * button.
 */
export function DockPanel({
  className,
  title,
  icon,
  width = DOCK_W,
  collapsed,
  onCollapsedChange,
  reserve,
  sheet = false,
  children,
}: {
  className: string;
  /** The name the circle opens and closes the plate by. */
  title: string;
  /** What the circle shows while the plate is closed. */
  icon: ReactNode;
  /** The plate's open width, which its content is laid out at. */
  width?: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** Given, the open body is held to the column's height less this (what
   *  else takes the column besides the circle) and scrolls inside. */
  reserve?: number;
  /** Open, sit at the foot of the column as a bottom sheet no taller than
   *  SHEET_MAX of it — a phone's layout, keeping the stage in view above. It
   *  gets there by the plate's margin (--dock-drop), worked out here from the
   *  height it opens to; the circle stays put, and the plate still scales out
   *  of it. */
  sheet?: boolean;
  children: ReactNode;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [bodyRoom, setBodyRoom] = useState<number | null>(null);
  const [drop, setDrop] = useState(0);

  useLayoutEffect(() => {
    const el = slot.current;
    const column = el?.parentElement;
    const panel = el?.querySelector<HTMLElement>('.panel');
    const inner = panel?.querySelector<HTMLElement>('.panel-body-inner');
    if (reserve == null || !column || !panel || !inner) {
      setBodyRoom(null);
      setDrop(0);
      return;
    }
    const measure = () => {
      const top = ORB + ORB_GAP;
      const edge = parseFloat(getComputedStyle(panel).borderTopWidth) * 2 + BODY_MARGIN;
      const room = Math.max(0, (sheet ? column.clientHeight * SHEET_MAX : column.clientHeight - top - reserve) - edge);
      setBodyRoom(room);
      // How far below the circle the sheet's top lands: the column's foot,
      // less the plate as it opens.
      setDrop(sheet ? Math.max(0, column.clientHeight - top - (edge + Math.min(inner.offsetHeight, room))) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(column);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [reserve, sheet]);

  // Closed, the plate is scaled away but still laid out: keep it out of the
  // tab order and the accessibility tree.
  useLayoutEffect(() => {
    const panel = slot.current?.querySelector<HTMLElement>('.panel');
    if (panel) panel.inert = collapsed;
  }, [collapsed]);

  const label = collapsed ? `Show ${title}` : `Hide ${title}`;

  return (
    <div
      ref={slot}
      className={`${className}${collapsed ? '' : ' is-open'}`}
      style={
        {
          ...(bodyRoom != null ? { '--dock-body-room': `${bodyRoom}px` } : null),
          ...(drop ? { '--dock-drop': `${drop}px` } : null),
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="pt-dock-orb"
        aria-expanded={!collapsed}
        aria-label={label}
        title={label}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        <span className="pt-dock-icon" aria-hidden>
          {icon}
        </span>
        <span className="pt-dock-icon is-close" aria-hidden>
          {CLOSE}
        </span>
      </button>
      <Panel width={width}>{children}</Panel>
    </div>
  );
}

/**
 * The inspector, docked over the stage's top-right corner. Edits go straight
 * to the studio's handler.
 */
export function Dock({
  columnClass,
  width,
  reserve,
  sheet,
  project,
  keys,
  char,
  collapsed,
  onCollapsedChange,
  onEdit,
  onImport,
  onExport,
  onOpen,
  onSave,
  onReset,
}: {
  /** ' is-compact' when the stage is too narrow for both columns (App's
   *  MIN_ROOM), ' is-compact is-phone' when a plate spans it. */
  columnClass: string;
  /** The column's width, and the plate's open width. */
  width: number;
  /** What of the column the plate leaves to others (DockPanel's). */
  reserve: number;
  /** Open as a bottom sheet (DockPanel's). */
  sheet: boolean;
  /** The project at the playhead. */
  project: FontProject;
  keys: KeyContext;
  char: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onEdit: (edit: EditMessage) => void;
  onImport: () => void;
  onExport: () => void;
  onOpen: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const title = char ? `${char}  ${codepointLabel(char)}` : 'Inspector';

  return (
    // A column down the right edge; a tall inspector scrolls inside it.
    <div className={`pt-dock${columnClass}`} style={{ width }}>
      <DockPanel
        className="pt-dock-slot is-scrolling"
        title={title}
        icon={<DockIcon name="dial" />}
        width={width}
        reserve={reserve}
        sheet={sheet}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      >
        <Inspector
          project={project}
          keys={keys}
          char={char}
          onBearingChange={(side, value) => char && onEdit({ type: side, char, value })}
          onWidthChange={(value) => char && onEdit({ type: 'width', char, value })}
          onOffsetChange={(value) => char && onEdit({ type: 'offsetY', char, value })}
          onStretchAtChange={(value) => char && onEdit({ type: 'stretchAt', char, value })}
          onTrimChange={(field, value) => char && onEdit({ type: 'trim', char, field, value })}
          onWeightChange={(value) => onEdit({ type: 'weight', value })}
          onFontChange={(field, value) => onEdit({ type: 'font', field, value })}
          onCapChange={(cap) => onEdit({ type: 'cap', cap })}
          onNameChange={(field, value) => onEdit({ type: 'name', field, value })}
          onImport={onImport}
          onExport={onExport}
          onOpen={onOpen}
          onSave={onSave}
          onReset={onReset}
        />
      </DockPanel>
    </div>
  );
}
