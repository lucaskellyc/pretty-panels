import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef } from 'react';
import { pxVar } from './ListRow';
import { clamp, cx } from './util';

/** Which edge of the anchor the surface hangs off. */
export type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
/** How it lines up along that edge. */
export type PopoverAlign = 'start' | 'center' | 'end';

/** A spot in the viewport — a right-click's `clientX` / `clientY`. */
export interface PopoverPoint {
  x: number;
  y: number;
}

/**
 * What the surface hangs off: an element, by ref or in the hand, or a point the
 * pointer named.
 *
 * The point is not a convenience — it is the context-menu case. A right-click
 * has no element to open from, only the place it happened, and a menu that
 * opened off the row instead would land somewhere the pointer isn't.
 */
export type PopoverAnchor = RefObject<HTMLElement | null> | HTMLElement | PopoverPoint | null;

export interface PopoverProps {
  /** Whether the surface is up (fully controlled, like every other state here). */
  open: boolean;
  /** Called when the surface asks to close — Escape, or a press outside it.
   *  Pressing the anchor itself doesn't count; see the note in the component. */
  onClose: () => void;
  /** What it hangs off — an element (by ref or directly) or a viewport point. */
  anchor: PopoverAnchor;
  /** Preferred edge of the anchor. Flips to the opposite one when the room isn't
   *  there. */
  side?: PopoverSide;
  /** Which way it lines up along that edge. Shifts to stay on screen. */
  align?: PopoverAlign;
  /** What floats. Bring the semantics with it: the surface is a mechanism, so it
   *  takes no `role` of its own — see the component note. */
  children: ReactNode;
  /** Extra class names on the surface. */
  className?: string;
}

/** The anchor as a rect, which is all the placement below needs of it. */
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** What can take focus inside the surface, in DOM order — the first of these is
 *  where focus lands when the surface opens. */
const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** The element an anchor names, if it names one at all. A point doesn't. */
function elementOf(anchor: PopoverAnchor): HTMLElement | null {
  if (!anchor) return null;
  // Duck-typed rather than `instanceof HTMLElement`: this runs in an effect, but
  // the check would still be a reference to a DOM global in module scope for
  // anything that renders the kit outside a browser.
  if ('nodeType' in anchor) return anchor;
  if ('current' in anchor) return anchor.current;
  return null;
}

/** The anchor's box in viewport coordinates. A point becomes a zero-size rect —
 *  every rule below then treats it as an edge with no length, which is exactly
 *  what a cursor is. */
function rectOf(anchor: PopoverAnchor): Rect | null {
  const el = elementOf(anchor);
  if (el) {
    const b = el.getBoundingClientRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  }
  if (anchor && 'x' in anchor) return { left: anchor.x, top: anchor.y, width: 0, height: 0 };
  return null;
}

const OPPOSITE: Record<PopoverSide, PopoverSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * Where a surface of `size` lands when it hangs off `rect` on `side`, aligned
 * `align`, inside a `vw × vh` viewport.
 *
 * Two corrections, in the order every placement makes them. **Flip**: the
 * preferred side gives way to its opposite when it cannot hold the surface and
 * the opposite one has more room — a menu under a row near the bottom of the
 * window opens upward instead. **Shift**: the cross axis then slides back inside
 * the viewport, which is the same trade `TitleBar`'s sheet makes in the one axis
 * it has, and for the same reason — the least movement that puts the surface
 * back on screen beats hopping to the other edge of the anchor.
 *
 * What it can't fix by moving, it reports: `maxWidth` / `maxHeight` are what the
 * surface is allowed to be where it ended up, and a taller menu scrolls inside
 * them rather than running off the screen. So a surface that fits nowhere keeps
 * the side it was asked for instead of flipping back and forth over a pixel.
 */
function place(
  rect: Rect,
  size: { width: number; height: number },
  side: PopoverSide,
  align: PopoverAlign,
  /** What the surface keeps off the anchor. */
  gap: number,
  /** What it keeps off the viewport's edges. */
  inset: number,
  vw: number,
  vh: number,
) {
  /** Free space between the anchor's `s` edge and the viewport's, less both
   *  clearances — i.e. what a surface on that side actually has to live in. */
  const roomOn = (s: PopoverSide) =>
    s === 'top'
      ? rect.top - gap - inset
      : s === 'bottom'
        ? vh - (rect.top + rect.height) - gap - inset
        : s === 'left'
          ? rect.left - gap - inset
          : vw - (rect.left + rect.width) - gap - inset;

  const vertical = side === 'top' || side === 'bottom';
  const need = vertical ? size.height : size.width;
  const used = roomOn(side) < need && roomOn(OPPOSITE[side]) > roomOn(side) ? OPPOSITE[side] : side;
  const room = Math.max(roomOn(used), 0);

  // The main axis is bounded by the side's own room; the cross axis only by the
  // viewport.
  const maxHeight = vertical ? room : Math.max(vh - 2 * inset, 0);
  const maxWidth = vertical ? Math.max(vw - 2 * inset, 0) : room;
  const width = Math.min(size.width, maxWidth);
  const height = Math.min(size.height, maxHeight);

  // Main axis: one gap off the anchor's edge. A surface on the leading side has
  // to know its own length to sit *before* that edge, which is why the clamped
  // width / height above are measured first.
  const main =
    used === 'top'
      ? rect.top - gap - height
      : used === 'bottom'
        ? rect.top + rect.height + gap
        : used === 'left'
          ? rect.left - gap - width
          : rect.left + rect.width + gap;

  // Cross axis: lined up with the anchor's leading edge, its middle or its
  // trailing edge, then held inside the viewport. The lower bound wins a tie, so
  // a surface wider than the screen starts at the inset and overflows the end,
  // the way a line too long for its box does.
  const span = vertical ? rect.width : rect.height;
  const from = vertical ? rect.left : rect.top;
  const length = vertical ? width : height;
  const limit = vertical ? vw : vh;
  const lined =
    align === 'start'
      ? from
      : align === 'end'
        ? from + span - length
        : from + (span - length) / 2;
  const cross = clamp(lined, inset, Math.max(inset, limit - length - inset));

  return {
    left: vertical ? cross : main,
    top: vertical ? main : cross,
    side: used,
    maxWidth,
    maxHeight,
  };
}

/**
 * A surface that floats over the work, anchored to something in it.
 *
 * It is the mechanism a `Menu` is built on, and it holds anything: a few
 * controls, a colour picker, a form. Three jobs, and deliberately no fourth —
 *
 * - **It stays on screen.** The surface hangs off `side` / `align` and is flipped
 *   and shifted from there as the room runs out (see `place`); a surface too
 *   tall for the space left scrolls inside it.
 * - **It floats clear of everything.** Where the browser has a top layer the
 *   surface is put in it, so no ancestor's `overflow` can clip it and no later
 *   stacking context can paint over it. That is not a nicety here: `.panel`
 *   clips, `Table` puts its rows in a scroller, and a menu on a row inside
 *   either would otherwise be cut off at the plate's edge.
 * - **It dismisses.** Escape, or a press anywhere outside it.
 *
 * While it is up it marks its anchor with `data-pp-anchored`, which is how a
 * trigger that is only drawn on hover — a `Tree` row's ⋯ — stays drawn for as
 * long as the surface it opened is on screen. Style your own triggers off it the
 * same way.
 *
 * The fourth job — saying what the thing *is* — belongs to the content. A menu,
 * a non-modal dialog and a tooltip are three different sets of semantics, and a
 * surface that guessed at one of them would be wrong two thirds of the time. So
 * this renders an unlabelled, roleless box: `Menu` puts `role="menu"` inside it,
 * and a form popover brings its own `role` and name the same way.
 *
 * The trigger's own half of that contract is yours too: `aria-expanded` and
 * `aria-haspopup` belong on the control that opens the surface, which this
 * component never sees.
 */
export function Popover({
  open,
  onClose,
  anchor,
  side = 'bottom',
  align = 'start',
  children,
  className,
}: PopoverProps) {
  const surface = useRef<HTMLDivElement>(null);

  // Held in a ref and refreshed on every render — the same arrangement
  // `TitleBar`'s sheet uses — so the listeners below install once and still
  // read current props.
  const position = useRef<() => void>(() => {});
  position.current = () => {
    const el = surface.current;
    const rect = rectOf(anchor);
    // No anchor resolved yet (a ref that hasn't been attached). Leave the last
    // placement standing rather than throwing the surface into a corner.
    if (!el || !rect) return;

    // Measure what the surface *wants*, not what the last pass allowed it: the
    // caps below are the output of this function, so leaving them on would feed
    // one placement's answer into the next one's question.
    el.style.removeProperty('--pp-popover-room');
    el.style.removeProperty('--pp-popover-span');
    const box = el.getBoundingClientRect();

    // A point anchor has no box to clear, so it keeps no gap from one: a context
    // menu opens with its corner at the cursor, the way every platform's does.
    const gap = rect.width || rect.height ? pxVar(el, '--pp-popover-gap', 4) : 0;
    const inset = pxVar(el, '--pp-popover-inset', 8);
    // The documentElement's client box rather than `innerWidth` / `innerHeight`:
    // those count a classic scrollbar as room the surface doesn't have.
    const root = document.documentElement;
    const p = place(rect, box, side, align, gap, inset, root.clientWidth, root.clientHeight);

    el.style.left = `${Math.round(p.left)}px`;
    el.style.top = `${Math.round(p.top)}px`;
    // Rounded down: half a pixel over the cap is still a pixel off the screen.
    el.style.setProperty('--pp-popover-room', `${Math.floor(p.maxHeight)}px`);
    el.style.setProperty('--pp-popover-span', `${Math.floor(p.maxWidth)}px`);
    el.dataset.side = p.side;
  };

  // Raise, place and focus — all before the browser paints, so the surface is
  // never seen at the top-left corner on its way to the anchor.
  useLayoutEffect(() => {
    if (!open) return;
    const el = surface.current;
    if (!el) return;
    const returnTo = document.activeElement as HTMLElement | null;

    // The top layer, where there is one. The attribute is set from here rather
    // than in JSX on purpose: React must not own it, because @types/react 18 —
    // inside this package's peer range — doesn't know it, and a browser without
    // the API must not be left with a `[popover]` element it will only ever
    // render `display: none`. Those browsers fall back to the stylesheet's
    // `position: fixed` + `--z-overlay`, which is the same placement one stacking
    // context lower.
    if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) {
      el.setAttribute('popover', 'manual');
      el.showPopover();
    }
    position.current();
    // The surface itself is the fallback, which is what its `tabIndex` is for:
    // a popover holding nothing focusable still has to take focus, or Escape
    // has nowhere to be pressed.
    (el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus();

    return () => {
      // Hand focus back — but only if the surface still holds it. Dismissing by
      // pressing something else has already moved focus on, and taking it back
      // to the trigger would undo the press that closed us.
      const active = document.activeElement;
      if (active && active !== document.body && !el.contains(active)) return;
      // Whatever had focus when the surface opened, and the anchor as the
      // fallback: a pointer press doesn't always leave focus on the control it
      // pressed (Safari doesn't focus a pressed button), and the trigger is a
      // better answer than the top of the document. A wrapper anchored in its
      // place stands in for the control inside it.
      const anchored = elementOf(anchor);
      const back =
        returnTo && returnTo !== document.body && returnTo.isConnected
          ? returnTo
          : anchored?.matches(FOCUSABLE)
            ? anchored
            : (anchored?.querySelector<HTMLElement>(FOCUSABLE) ?? null);
      back?.focus();
    };
    // Keyed on `open` alone: this raises and lowers the surface, and a mid-life
    // change of anchor is the placement's business, not this one's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mark the anchor for as long as the surface is up, so a trigger that is only
  // drawn on hover can stay drawn while the menu it opened is on screen. Without
  // it a `Tree` row's ⋯ — which is `opacity: 0` until the row is hovered — fades
  // out the moment the menu takes focus, leaving the menu hanging off nothing.
  // A data attribute rather than `aria-expanded`: that one is the trigger's own
  // claim about itself, and a surface has no business putting words in its
  // mouth. This is CSS state, and it says only what is true from here — that
  // something is anchored to this element right now.
  useEffect(() => {
    const el = open ? elementOf(anchor) : null;
    if (!el) return;
    el.setAttribute('data-pp-anchored', '');
    return () => el.removeAttribute('data-pp-anchored');
  }, [open, anchor]);

  // The anchor can move without the window resizing — a row scrolling inside a
  // Table, a sidebar folding away — and the contents can change width under the
  // surface. So this runs after every render as well as on the two events, and
  // it has to be a layout effect: measuring in a passive one paints a frame at
  // the old spot first.
  useLayoutEffect(() => {
    if (open) position.current();
  });

  useEffect(() => {
    if (!open) return;
    const reposition = () => position.current();
    // Capture, because scroll doesn't bubble: this is how a scroll in whatever
    // container the anchor sits in is heard, not just the page's.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // Dismissal. Captured on the document so a press on the app below closes the
  // surface rather than acting on the app through it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      const target = e.target as Node;
      if (surface.current?.contains(target)) return;
      // A press on the anchor is not "outside". A trigger that anchors its own
      // popover would otherwise be dismissed here and reopened by its own click
      // a moment later, which reads as a surface that cannot be closed by the
      // button that opened it.
      if (elementOf(anchor)?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;

  return (
    <div
      ref={surface}
      className={cx('pp-popover', className)}
      // The side the entrance animation grows from. Corrected by the placement
      // above before the first paint if the preference didn't survive; declared
      // here so the first frame is already right in the common case.
      data-side={side}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
