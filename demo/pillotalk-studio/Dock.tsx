import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Panel } from '../../src';
import type { FontProject } from './font/model';
import { codepointLabel } from './font/model';
import { Inspector } from './Inspector';
import type { KeyContext } from './timeline/KeyGutter';
import type { EditMessage } from './types';

/** The docked column's width, which framing keeps the sheet clear of. */
export const DOCK_W = 320;

/**
 * One docked plate. Rolled up, it draws in from the column's width to hug its
 * header — the title and the −/+ — pinned to its corner. The kit's Panel keeps its width when collapsed, so the
 * header is measured here and the plate's width overridden (app.css).
 */
export function DockPanel({
  className,
  title,
  width = DOCK_W,
  collapsed,
  onCollapsedChange,
  children,
}: {
  className: string;
  /** A string, or a node such as a `Tabs` strip, which the Panel makes its
   *  header. Only a string title can be rolled up to — see the measurement. */
  title: ReactNode;
  /** The plate's open width, which its content is laid out at. */
  width?: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children: ReactNode;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [stripWidth, setStripWidth] = useState<number | null>(null);

  // Re-measured when the title changes too: the inspector's follows the
  // selection, rolled up or not.
  useLayoutEffect(() => {
    const measure = () => {
      const panel = slot.current?.querySelector<HTMLElement>('.panel');
      const head = panel?.querySelector<HTMLElement>('.panel-head');
      const label = head?.querySelector<HTMLElement>('b');
      const button = head?.querySelector<HTMLElement>('.panel-collapse-btn');
      if (!collapsed || !panel || !head || !label || !button) return setStripWidth(null);
      const h = getComputedStyle(head);
      const border = parseFloat(getComputedStyle(panel).borderLeftWidth) * 2;
      setStripWidth(
        Math.ceil(
          parseFloat(h.paddingLeft) +
            label.getBoundingClientRect().width +
            parseFloat(h.columnGap) +
            button.offsetWidth +
            parseFloat(h.paddingRight) +
            border,
        ),
      );
    };
    measure();
    // Rolled up from the last visit, it is measured before the label's face
    // has loaded; measure again once it has.
    let live = true;
    document.fonts.ready.then(() => live && measure());
    return () => {
      live = false;
    };
  }, [collapsed, title]);

  return (
    <div
      ref={slot}
      className={className}
      style={stripWidth ? ({ '--dock-panel-w': `${stripWidth}px` } as CSSProperties) : undefined}
    >
      <Panel title={title} width={width} collapsible collapsed={collapsed} onCollapsedChange={onCollapsedChange}>
        {children}
      </Panel>
    </div>
  );
}

/**
 * The inspector, docked over the stage's top-right corner. Edits go straight
 * to the studio's handler.
 */
export function Dock({
  project,
  keys,
  char,
  collapsed,
  onCollapsedChange,
  onEdit,
  onImport,
  onExport,
  onReset,
}: {
  /** The project at the playhead. */
  project: FontProject;
  keys: KeyContext;
  char: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onEdit: (edit: EditMessage) => void;
  onImport: () => void;
  onExport: () => void;
  onReset: () => void;
}) {
  const title = char ? `${char}  ${codepointLabel(char)}` : 'Inspector';

  return (
    // A column down the right edge; a tall inspector scrolls inside it.
    <div className="pt-dock" style={{ width: DOCK_W }}>
      <DockPanel
        className="pt-dock-slot is-scrolling"
        title={title}
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
          onTrimChange={(field, value) => char && onEdit({ type: 'trim', char, field, value })}
          onWeightChange={(value) => onEdit({ type: 'weight', value })}
          onCapChange={(cap) => onEdit({ type: 'cap', cap })}
          onImport={onImport}
          onExport={onExport}
          onReset={onReset}
        />
      </DockPanel>
    </div>
  );
}
