import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CHEVRON, ELLIPSIS, GRIP, RowContent, type RowFields, nameOf, pxVar } from './ListRow';
import { clamp, cx } from './util';

export interface TreeNode extends RowFields {
  /** Nested nodes. A node with children gets a disclosure chevron. */
  children?: TreeNode[];
}

/** Where a dragged (or arrow-moved) node landed. `index` is its position among
 *  `parentId`'s children *after* the node has been lifted out of its old
 *  parent — i.e. exactly what a remove-then-insert expects. */
export interface TreeMove {
  id: string;
  parentId: string | null;
  index: number;
}

export interface TreeProps {
  /** The roots. Each node may carry `children`. */
  items: TreeNode[];
  /** Ids of the expanded nodes (controlled). Omit to use `defaultExpanded`. */
  expanded?: string[];
  /** Ids expanded on first render (uncontrolled). */
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Give every enabled node a drag handle, and turn on the Alt+arrow moves. */
  reorderable?: boolean;
  /** Called once on drop, or on an Alt+arrow keypress. Applying it to `items`
   *  is yours, like every other control here. */
  onMove?: (move: TreeMove) => void;
  /** Give every leaf — a node with no children of its own — a ⋯ button on its
   *  right edge, and call this with the node's id when it is pressed. What the
   *  button opens is yours; the tree only reports the press. Omit it and no
   *  button is rendered.
   *
   *  The second argument is the element to hang a `Menu` off: the ⋯ button when
   *  the press came from the pointer, and the row itself when it came from the
   *  keyboard, where there is no pointer to have aimed at the button. Take it
   *  or leave it — a handler that only wants the id still fits. */
  onMore?: (id: string, anchor: HTMLElement) => void;
  /** Accessible name for the tree. */
  label?: string;
  className?: string;
}

/** One visible line: a node plus everything the drag math and the keyboard need
 *  to know about where it sits. Flattening is what lets the tree reuse the flat
 *  list's drag wholesale — a depth-first walk that skips collapsed subtrees. */
interface Row {
  node: TreeNode;
  depth: number;
  parentId: string | null;
  /** The array this node lives in, so a move can count and index its siblings. */
  siblings: TreeNode[];
  siblingIndex: number;
  hasChildren: boolean;
  open: boolean;
}

/** A drag in flight. The carried node is held by id, not by index: a node can
 *  spring open mid-drag and renumber everything under it. `dy`/`dx` stay the raw
 *  pointer delta; the landing slot and depth are projected from them on every
 *  render (see `project`). */
interface Drag {
  id: string;
  dy: number;
  dx: number;
}

/** Where a drag would land: a slot in the list and a depth at that slot, plus
 *  the parent that pair resolves to. */
interface Projection {
  slot: number;
  depth: number;
  parentId: string | null;
  index: number;
  /** A closed node the drag is hovering just below — the one hover-to-expand
   *  would spring open, so you can pick a place among its children instead of
   *  only appending to them. */
  springId: string | null;
}

/** How long the drag has to dwell below a closed node before it springs open. */
const SPRING_MS = 450;

/**
 * `.pp-tree` — a scene-outliner tree built from the same capsule rows as
 * `List`, indented by depth, with a disclosure chevron on any node that has
 * children.
 *
 * It renders a flattened depth-first walk of `items`, skipping collapsed
 * subtrees, which is what lets the drag be the flat list's drag plus one axis:
 * vertical movement picks the gap to land in, horizontal movement picks the
 * depth at that gap. The legal depth range at a gap is bounded by its
 * neighbours — at most one level deeper than the row above (anything deeper has
 * no parent) and never shallower than the row below (that would orphan it) —
 * and the pair resolves to a `parentId` by walking back to the nearest row one
 * level up. Picking a node up hides its own descendants, so a subtree can't be
 * dropped inside itself and the row pitch stays exact.
 *
 * Keyboard follows the ARIA tree pattern: the tree is one tab stop, arrows
 * navigate (Left collapses or goes to the parent, Right expands or goes to the
 * first child), and Alt+arrows *move* the focused node — up/down among its
 * siblings, right to indent under the previous sibling, left to outdent past
 * its parent.
 */
export function Tree({
  items,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  reorderable = false,
  onMove,
  onMore,
  label,
  className,
}: TreeProps) {
  const [ownExpanded, setOwnExpanded] = useState<string[]>(defaultExpanded);
  const isControlled = expandedProp !== undefined;
  const expandedIds = isControlled ? expandedProp : ownExpanded;
  const open = new Set(expandedIds);

  const listEl = useRef<HTMLUListElement>(null);
  const rowEls = useRef(new Map<string, HTMLLIElement | null>());
  const pitch = useRef(0);
  const indent = useRef(16);
  const start = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const setExpanded = (ids: string[]) => {
    if (!isControlled) setOwnExpanded(ids);
    onExpandedChange?.(ids);
  };
  const setOpen = (id: string, next: boolean) =>
    setExpanded(next ? [...expandedIds, id] : expandedIds.filter((x) => x !== id));

  const rows: Row[] = [];
  const walk = (nodes: TreeNode[], depth: number, parentId: string | null) => {
    nodes.forEach((node, siblingIndex) => {
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isOpen = hasChildren && open.has(node.id);
      rows.push({ node, depth, parentId, siblings: nodes, siblingIndex, hasChildren, open: isOpen });
      if (isOpen) walk(node.children!, depth + 1, node.id);
    });
  };
  walk(items, 0, null);

  // Resolved fresh every render: a spring-open above the carried node shifts
  // every index below it, so the index is derived from the id rather than kept.
  const from = drag ? rows.findIndex((r) => r.node.id === drag.id) : -1;

  // For the length of a drag the carried node's descendants leave the list —
  // the contiguous run after it at a greater depth. That is what stops a subtree
  // being dropped inside itself: the illegal targets aren't there to land on.
  // The cut is entirely below `from`, so it leaves that index alone.
  let visible = rows;
  if (from >= 0) {
    let end = from + 1;
    while (end < rows.length && rows[end].depth > rows[from].depth) end++;
    visible = [...rows.slice(0, from + 1), ...rows.slice(end)];
  }

  /** Project a drag onto a landing slot, a depth, and the parent they mean. */
  const project = (d: Drag): Projection | null => {
    const carried = visible[from];
    if (!carried) return null;
    const rest = visible.filter((_, i) => i !== from);
    const slot = clamp(from + Math.round(d.dy / pitch.current), 0, rest.length);
    const prev = rest[slot - 1];
    const next = rest[slot];
    // One level deeper than the row above at most, and never shallower than the
    // row below. A valid flattened tree always satisfies min <= max here.
    const maxDepth = prev ? prev.depth + 1 : 0;
    const minDepth = next ? next.depth : 0;
    const depth = clamp(
      carried.depth + Math.round(d.dx / indent.current),
      minDepth,
      maxDepth,
    );

    let parentId: string | null = null;
    let parentRow: Row | undefined;
    if (depth > 0) {
      for (let i = slot - 1; i >= 0; i--) {
        if (rest[i].depth === depth - 1) {
          parentRow = rest[i];
          parentId = rest[i].node.id;
          break;
        }
      }
    }
    // Dropping onto a closed parent puts the node at the end of the children you
    // can't see, rather than silently in front of them.
    let index: number;
    if (parentRow && parentRow.hasChildren && !parentRow.open) {
      index = parentRow.node.children!.length;
    } else {
      index = 0;
      for (let i = 0; i < slot; i++) if (rest[i].parentId === parentId) index++;
    }
    // Hovering just under a closed node is the cue to spring it open: that is
    // the one gap where its children are what you'd want to aim between.
    const springId = prev && prev.hasChildren && !prev.open ? prev.node.id : null;
    return { slot, depth, parentId, index, springId };
  };

  const projection = drag ? project(drag) : null;

  // Dwell below a closed node and it opens, so a position among its children can
  // be picked instead of only appending to them. Re-armed whenever the target
  // changes; dropping or moving away clears it.
  useEffect(() => {
    const id = projection?.springId;
    if (!id) return;
    const t = setTimeout(() => setOpen(id, true), SPRING_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection?.springId]);

  // A spring-open above the carried row pushes it down a slot in the layout,
  // which would jump it out from under the pointer. Measure the shift and take
  // it back out of the drag's origin so the row stays where the hand left it.
  const carriedTop = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!drag) {
      carriedTop.current = null;
      return;
    }
    const top = rowEls.current.get(drag.id)?.offsetTop;
    if (top == null) return;
    const was = carriedTop.current;
    carriedTop.current = top;
    if (was != null && top !== was) {
      const shift = top - was;
      start.current.y += shift;
      setDrag((d) => (d ? { ...d, dy: d.dy - shift } : d));
    }
  });

  const onPointerDown = (id: string) => (e: React.PointerEvent<HTMLSpanElement>) => {
    if (visible.length < 2) return;
    const first = rowEls.current.get(visible[0].node.id);
    const second = rowEls.current.get(visible[1].node.id);
    pitch.current = Math.abs((second?.offsetTop ?? 0) - (first?.offsetTop ?? 0));
    if (!pitch.current) return;
    indent.current = pxVar(listEl.current, '--tree-indent', 16);
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id, dy: 0, dx: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    // Released past the window edge without a pointerup: drop it where it stands.
    if (e.buttons === 0) {
      endDrag();
      return;
    }
    const dy = e.clientY - start.current.y;
    const dx = e.clientX - start.current.x;
    setDrag((d) => (d ? { ...d, dy, dx } : d));
  };

  const endDrag = () => {
    if (!drag) return;
    const carried = visible[from];
    if (carried && projection) {
      const moved =
        projection.parentId !== carried.parentId || projection.index !== carried.siblingIndex;
      if (moved) {
        // Land inside a closed parent and it opens, so the node doesn't vanish.
        if (projection.parentId && !open.has(projection.parentId)) {
          setOpen(projection.parentId, true);
        }
        onMove?.({ id: carried.node.id, parentId: projection.parentId, index: projection.index });
      }
    }
    setDrag(null);
  };

  /** How far row `i` is pushed while a drag is in flight. */
  const offsetOf = (i: number) => {
    if (!drag || !projection) return { x: 0, y: 0 };
    const { slot } = projection;
    if (i === from) {
      // Stops at the ends of the stack, as in `List`; the sideways offset is the
      // gap between the depth it would land at and the one it came from.
      const up = -from * pitch.current;
      const down = (visible.length - 1 - from) * pitch.current;
      return {
        x: (projection.depth - visible[from].depth) * indent.current,
        y: clamp(drag.dy, up, down),
      };
    }
    if (slot > from && i > from && i <= slot) return { x: 0, y: -pitch.current };
    if (slot < from && i >= slot && i < from) return { x: 0, y: pitch.current };
    return { x: 0, y: 0 };
  };

  // Roving tabindex: the tree is a single tab stop, parked on the focused node
  // or the first one when that node is gone (collapsed away, or deleted).
  const focusIndex = visible.findIndex((r) => r.node.id === focusId);
  const stop = focusIndex >= 0 ? focusIndex : 0;

  const focusRow = (i: number) => {
    const row = visible[clamp(i, 0, visible.length - 1)];
    if (!row) return;
    setFocusId(row.node.id);
    rowEls.current.get(row.node.id)?.focus();
  };

  /** Alt+arrow moves, each expressed as the same `{ parentId, index }` the drag
   *  reports. Anything with nowhere to go is a no-op. */
  const moveRow = (row: Row, key: string) => {
    const { node, siblings, siblingIndex, parentId } = row;
    if (key === 'ArrowUp' && siblingIndex > 0) {
      onMove?.({ id: node.id, parentId, index: siblingIndex - 1 });
    } else if (key === 'ArrowDown' && siblingIndex < siblings.length - 1) {
      onMove?.({ id: node.id, parentId, index: siblingIndex + 1 });
    } else if (key === 'ArrowRight' && siblingIndex > 0) {
      // Indent: become the last child of the sibling above, which opens so the
      // node stays on screen.
      const target = siblings[siblingIndex - 1];
      if (!open.has(target.id)) setOpen(target.id, true);
      onMove?.({ id: node.id, parentId: target.id, index: target.children?.length ?? 0 });
    } else if (key === 'ArrowLeft' && parentId != null) {
      // Outdent: become the parent's next sibling.
      const parent = rows.find((r) => r.node.id === parentId)!;
      onMove?.({ id: node.id, parentId: parent.parentId, index: parent.siblingIndex + 1 });
    }
  };

  const onKeyDown = (i: number, row: Row) => (e: React.KeyboardEvent<HTMLLIElement>) => {
    const { key, altKey } = e;
    if (altKey && reorderable && !row.node.disabled && key.startsWith('Arrow')) {
      e.preventDefault();
      moveRow(row, key);
      return;
    }
    // The pointer's ⋯, from the keyboard. Both spellings of "open the context
    // menu" that terminals and keyboards actually send.
    if (onMore && !row.hasChildren && (key === 'ContextMenu' || (e.shiftKey && key === 'F10'))) {
      e.preventDefault();
      // The row, not the ⋯ inside it: the button is hidden until the row is
      // hovered or focused, and a menu hung off something invisible reads as
      // having come from nowhere. From the keyboard the row *is* the target.
      onMore(row.node.id, e.currentTarget);
      return;
    }
    switch (key) {
      case 'ArrowDown':
        focusRow(i + 1);
        break;
      case 'ArrowUp':
        focusRow(i - 1);
        break;
      case 'ArrowRight':
        if (row.hasChildren && !row.open) setOpen(row.node.id, true);
        else if (row.open) focusRow(i + 1);
        else return;
        break;
      case 'ArrowLeft':
        if (row.open) setOpen(row.node.id, false);
        else if (row.parentId != null) {
          const up = visible.findIndex((r) => r.node.id === row.parentId);
          if (up >= 0) focusRow(up);
        } else return;
        break;
      case 'Home':
        focusRow(0);
        break;
      case 'End':
        focusRow(visible.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (!row.hasChildren) return;
        setOpen(row.node.id, !row.open);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <ul
      ref={listEl}
      className={cx(
        'pp-list',
        'pp-tree',
        reorderable && 'is-reorderable',
        // Scopes the push transition to a live drag; left on afterwards it would
        // animate each pushed row back just as the new order drops it a slot.
        drag && 'is-dragging',
        className,
      )}
      role="tree"
      aria-label={label}
    >
      {visible.map((row, i) => {
        const { node } = row;
        const offset = offsetOf(i);
        const carried = i === from;
        return (
          <li
            key={node.id}
            ref={(el) => {
              rowEls.current.set(node.id, el);
            }}
            className={cx(
              'pp-list-row',
              // The tint that marks a branch — leaves stay on the plain ground.
              row.hasChildren && 'has-children',
              node.disabled && 'is-disabled',
              carried && 'is-carried',
            )}
            role="treeitem"
            aria-level={row.depth + 1}
            aria-setsize={row.siblings.length}
            aria-posinset={row.siblingIndex + 1}
            aria-expanded={row.hasChildren ? row.open : undefined}
            aria-keyshortcuts={reorderable && !node.disabled ? 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight' : undefined}
            tabIndex={i === stop ? 0 : -1}
            style={{
              // Depth is the row's own; the carried row's projected depth rides
              // on the transform instead, so it tracks the pointer rather than
              // snapping a step at a time.
              '--depth': row.depth,
              transform: offset.y || offset.x ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
            } as React.CSSProperties}
            onKeyDown={onKeyDown(i, row)}
            onFocus={() => setFocusId(node.id)}
          >
            {reorderable && (
              <span
                className={cx('pp-list-grip', node.disabled && 'is-locked')}
                aria-hidden="true"
                onPointerDown={node.disabled ? undefined : onPointerDown(node.id)}
                onPointerMove={node.disabled ? undefined : onPointerMove}
                onPointerUp={node.disabled ? undefined : endDrag}
                onPointerCancel={node.disabled ? undefined : endDrag}
              >
                {GRIP}
              </span>
            )}
            {/* aria-hidden because the treeitem itself carries `aria-expanded`
                — the chevron is the pointer's way to reach it, not a second
                control for a screen reader to find. */}
            {row.hasChildren ? (
              <span
                className={cx('pp-tree-chevron', row.open && 'is-open')}
                aria-hidden="true"
                onClick={() => setOpen(node.id, !row.open)}
              >
                {CHEVRON}
              </span>
            ) : (
              // Keeps leaf labels on the same rule as their branching siblings.
              <span className="pp-tree-chevron is-leaf" aria-hidden="true" />
            )}
            <RowContent row={node} />
            {/* Deepest in its branch: a node with children is a container, so
                the actions belong to the things it contains, not to it. The
                spacer keeps every row's right edge on one rule either way. */}
            {onMore &&
              (row.hasChildren ? (
                <span className="pp-list-more is-spacer" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className="pp-list-more"
                  /* The tree is a single tab stop, so this is reachable by
                     pointer or by the context-menu key on the focused row —
                     never as a tab stop of its own. */
                  tabIndex={-1}
                  aria-label={`More options for ${nameOf(node)}`}
                  aria-keyshortcuts="Shift+F10"
                  onClick={(e) => onMore(node.id, e.currentTarget)}
                >
                  {ELLIPSIS}
                </button>
              ))}
          </li>
        );
      })}
    </ul>
  );
}
