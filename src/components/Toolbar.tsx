import {
  Children,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { IconButton } from './IconButton';
import { ELLIPSIS } from './ListRow';
import { Popover } from './Popover';
import { cx } from './util';

export interface ToolbarProps {
  /** The bar's contents, laid out from the leading edge — `Platter`s, buttons,
   *  a `Select`, whatever the job needs. */
  children: ReactNode;
  /** Content pinned to the trailing edge, with the slack between: the status a
   *  bar reports rather than the controls it offers, usually `Readout`s. */
  end?: ReactNode;
  /** Lay the bar out as a row (default) or a column — a strip across the top of
   *  a view, or a tool palette down its side. */
  orientation?: 'horizontal' | 'vertical';
  /** Fold the items there is no room for into a trailing `⋯`, which opens them
   *  as a sheet. Off by default: a bar that spills, wraps or scrolls is a
   *  perfectly good answer too, and which one you want is layout — see the note
   *  in the component. */
  overflow?: boolean;
  /** Accessible name + tooltip for the overflow button, and the name of the
   *  sheet it opens. Worth setting in a localised app; the default is English. */
  overflowLabel?: string;
  /** Accessible name. With one the bar becomes a labelled `group`; without, it
   *  is chrome, and the things inside it carry their own semantics. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** What one of the bar's blocks needs along the axis that is running out.
 *  Measured off the rect rather than `offsetWidth`, which is already rounded,
 *  and rounded *up*: half a pixel more than there is room for is still a spill. */
function extentOf(el: Element, vertical: boolean) {
  const box = el.getBoundingClientRect();
  return Math.ceil(vertical ? box.height : box.width);
}

/** Direct children of the bar carrying `cls` — `:scope` so the folded items,
 *  which live inside the sheet, are never mistaken for items still in it. */
function partsOf(bar: HTMLElement, cls: string) {
  return bar.querySelectorAll<HTMLElement>(`:scope > .${cls}`);
}

/**
 * How many of the bar's items still fit, the rest being folded away.
 *
 * **Nothing shrinks.** That is the premise the whole measurement rests on, and
 * the reason the items are wrapped in boxes of their own: a squeezed `Platter`
 * drops its labels and a squeezed `Readout` reports `19…`, so when the room runs
 * out the right answer is to take items away, not to make them smaller. Fixed
 * item sizes are also what makes the count below stable — every number in it is
 * a natural size, and none of them moves in response to the fold.
 *
 * So the count is computed rather than stepped toward: the most items that fit
 * alongside the overflow button they'd fold into and whatever `end` holds. Each
 * item's size is recorded while it is in the bar and kept after it leaves, which
 * is the only number that can decide to put it back — and it is filed under the
 * item's key, not its index, so an item inserted ahead of another doesn't
 * inherit its width.
 *
 * Fitting `n` items is not monotonic in `n`: dropping the last one to make room
 * brings the ⋯ with it, and the button can be wider than the item was. Hence the
 * walk down from all of them, which lands on the largest count that fits rather
 * than the first place a spill stops.
 */
function useFold(
  bar: RefObject<HTMLDivElement | null>,
  keys: string[],
  vertical: boolean,
  enabled: boolean,
) {
  const [kept, setKept] = useState(keys.length);
  /** What each item needed the last time it was in the bar, by key. */
  const need = useRef(new Map<string, number>());
  /** What the ⋯ needs, once there has been one to measure. Zero until then: the
   *  first fold reserves nothing for it, discovers it, and refolds — before the
   *  browser paints, since all of this happens in a layout effect. */
  const button = useRef(0);

  // Held in a ref and refreshed on every render — the arrangement `TitleBar`'s
  // strip and `Popover` both use — so the observer below installs once and still
  // reads current props.
  const fit = useRef<() => void>(() => {});
  fit.current = () => {
    const el = bar.current;
    if (!el || !enabled) return;

    const cs = getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    // `client*` is the padding box, and the bar declares no padding — but a
    // `className` of yours can, and an item laid out into it would spill.
    const room = vertical
      ? el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom)
      : el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    // Not laid out yet — a hidden tab, a first paint under `display: none`. Zero
    // is no evidence, and folding on it would make a lone ⋯ the bar's first
    // frame. (A bar that hugs its contents never fills a box either, so it never
    // runs out of room and never folds, which is right: it has no edge to reach.)
    if (room <= 0) return;
    const gap = px(vertical ? cs.rowGap : cs.columnGap);

    // Everything in the bar right now, measured while it is there to measure.
    partsOf(el, 'pp-toolbar-item').forEach((item, i) => {
      if (i < keys.length) need.current.set(keys[i], extentOf(item, vertical));
    });
    const more = partsOf(el, 'pp-toolbar-more')[0];
    if (more) button.current = extentOf(more, vertical);
    const status = partsOf(el, 'pp-toolbar-end')[0];
    // `end` is not folded away with the items. It is what the bar *reports* —
    // the one thing in it you read rather than reach for — and it is already at
    // the edge the sheet would open from, so folding it would trade a glance for
    // a click and gain nothing. It is counted here because it is in the way.
    const reported = status ? extentOf(status, vertical) : 0;

    /** Whether the first `n` items, the ⋯ the rest would fold into and the
     *  status block all fit at once. */
    const fits = (n: number) => {
      let total = reported;
      let blocks = reported ? 1 : 0;
      for (let i = 0; i < n; i++) {
        // An item never yet seen in the bar is assumed to cost nothing, so it is
        // shown, measured and refolded if it turns out not to fit. Guessing it
        // large instead would fold a new item away before anyone saw it.
        total += need.current.get(keys[i]) ?? 0;
        blocks++;
      }
      if (n < keys.length) {
        total += button.current;
        blocks++;
      }
      return total + Math.max(blocks - 1, 0) * gap <= room;
    };

    let n = keys.length;
    while (n > 0 && !fits(n)) n--;
    if (n !== kept) setKept(n);
  };

  // After every render, not only on resize: an item's content can change width
  // without the bar's box moving — a `Readout` going from `60` to `1920×1080`.
  // It has to be a layout effect, because measuring in a passive one paints a
  // frame of the spilled bar first.
  useLayoutEffect(() => {
    fit.current();
  });

  useLayoutEffect(() => {
    const el = bar.current;
    if (!el || !enabled) return;
    const ro = new ResizeObserver(() => fit.current());
    // The bar, for the box it is given changing...
    ro.observe(el);
    // ...and the items, for content that changes width without this component
    // rendering at all — a webfont swapping in under the labels. It is the
    // wrappers that are observed rather than what is in them: React keeps those
    // nodes across renders, so the set only changes when the fold does.
    partsOf(el, 'pp-toolbar-item').forEach((item) => ro.observe(item));
    return () => ro.disconnect();
    // Re-targeted when the fold changes, which is when the wrapper set does:
    // `kept` is how many there are, and the length is what could be in them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar, enabled, kept, keys.length]);

  // Clamped rather than trusted: the children can change between a render and
  // the measurement that answers for it, and a stale count must never cut an
  // item out of a bar that has room for it.
  return Math.min(kept, keys.length);
}

/**
 * A bar surface — the plate a row of controls sits on, the way `Panel` is the
 * plate a column of them sits on. Fill it with `Platter`s and `Readout`s.
 *
 * It is a **plate, not a header bar**, and that is a deliberate choice about
 * grounds rather than a shade picked by eye. Everything this is built to hold is
 * drawn for a plate: a `Readout` rests one step *below* the plate and a
 * `Platter` two, so on a `--ctl-bar` ground they would sit shallower than their
 * own container and pop out of it. On `--ctl-panel` they recess exactly as they
 * do inside a `Panel`, which means anything that looks right in a panel body
 * looks right here with no adjustment.
 *
 * It fills the width it is given, so `end` has an edge to pin to. Hand it a
 * width of your own if it should hug its contents instead — that is layout, and
 * layout is yours.
 *
 * **`overflow` folds it.** Set it and the items the bar has run out of room for
 * fold, last first, into a trailing ⋯ that opens them as a sheet — the same
 * bargain `TitleBar` strikes with its strip, one item at a time instead of all
 * or nothing, since a toolbar's contents are a list and a strip's are two slots.
 * Items fold whole: a `Platter` is one item however many segments are on it,
 * because half a segmented control is not a control.
 *
 * It is opt-in because it is not the only right answer — a bar can spill, wrap
 * or scroll, and which of those you want is a layout decision this component
 * shouldn't make for you. It also has a cost worth knowing about: folding an
 * item moves it into the sheet, which re-mounts it, so anything in the bar
 * holding state the DOM owns rather than your props (an uncontrolled field
 * mid-edit) loses it at the fold.
 *
 * Two things it folds against, and one it doesn't. A bar folds against the box
 * it is *given*: a row fills its parent's width and so always has one, but a
 * column is only as tall as what is in it unless you say otherwise, so a
 * vertical bar wants a height (`100%`, or a flex parent) before it can run out
 * of one. And `end` never folds — it is what the bar reports rather than what it
 * offers, and it already sits at the edge the sheet would open from — so the ⋯
 * plus whatever `end` holds is the floor. Narrower than that and the bar spills
 * the way it always has.
 *
 * It renders no controls of its own — the ⋯ is the one exception, and only when
 * it has something to hold. A `Toolbar` with nothing in it is an empty plate,
 * which is the point: the parts are the components you put on it.
 */
export function Toolbar({
  children,
  end,
  orientation = 'horizontal',
  overflow = false,
  overflowLabel = 'More tools',
  label,
  className,
  style,
}: ToolbarProps) {
  const vertical = orientation === 'vertical';
  const bar = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // One level deep, and only when there is folding to do: `Children.toArray`
  // flattens fragments and gives every item a stable key — which is what the
  // measurements are filed under — and it is skipped entirely with `overflow`
  // off, so a bar that doesn't fold keeps the markup it always had.
  const items = overflow ? Children.toArray(children) : [];
  const keys = items.map((item, i) => (isValidElement(item) ? String(item.key ?? i) : `#${i}`));
  const kept = useFold(bar, keys, vertical, overflow);
  const folded = items.slice(kept);

  // Everything came back — so there is nothing left to open, and the button
  // holding the sheet up has gone with the fold. Without this the sheet would
  // spring open by itself the next time the bar ran out of room.
  useEffect(() => {
    if (folded.length === 0) setOpen(false);
  }, [folded.length]);

  return (
    <div
      ref={bar}
      className={cx('pp-toolbar', vertical && 'is-vertical', className)}
      style={style}
      /* Unlabelled, it claims nothing: a `Platter` inside already announces
         itself as a toolbar or a radiogroup, and wrapping those in a second
         unnamed landmark only adds a level to walk through. */
      role={label ? 'group' : undefined}
      aria-label={label}
      aria-orientation={label ? orientation : undefined}
      /* Something is folded away right now — a hook for a bar that wants to say
         so, the way the strip's `data-collapsed` does. */
      data-collapsed={folded.length > 0 ? '' : undefined}
    >
      {overflow
        ? items.slice(0, kept).map((item, i) => (
            <div key={keys[i]} className="pp-toolbar-item">
              {item}
            </div>
          ))
        : children}
      {folded.length > 0 && (
        <IconButton
          ref={more}
          className="pp-toolbar-more"
          label={overflowLabel}
          /* `dialog`, not `menu`: what folds in here are controls — a tool
             picker, a toggle, a readout — and a menu is a list of commands. */
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {ELLIPSIS}
        </IconButton>
      )}
      {end != null && <div className="pp-toolbar-end">{end}</div>}
      {folded.length > 0 && (
        /* Rendered inside the bar, where the top layer means it costs nothing in
           layout and keeps the one thing a portal would lose: the sheet inherits
           from the bar, so a `[data-mono]` subtree theming its controls themes
           the folded ones the same way.

           The sheet's trailing edge lines up with the button's, so it opens back
           over the bar the items came from — and `Popover` shifts it from there
           if the window's edge says otherwise. */
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          anchor={more}
          side={vertical ? 'right' : 'bottom'}
          align="end"
        >
          <div
            className="pp-toolbar-sheet"
            role="group"
            aria-label={overflowLabel}
            /* Pressing a button in the sheet is the user finishing with it — the
               same call the strip's sheet makes, and it keeps a tool pick from
               leaving a stale sheet over the work. Anything you set rather than
               press — a slider, a toggle, a field — stays open, because one turn
               of a value is rarely the only one. */
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button, a, [role="button"]')) setOpen(false);
            }}
          >
            {folded}
          </div>
        </Popover>
      )}
    </div>
  );
}
