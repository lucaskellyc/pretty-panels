import React, { type ReactNode, useRef } from 'react';
import {
  Popover,
  type PopoverAlign,
  type PopoverAnchor,
  type PopoverSide,
} from './Popover';
import { cx } from './util';

export interface MenuItem {
  /** Identifies the command — this is what `onSelect` reports. */
  id: string;
  /** Visible text. Defaults to `id`. */
  label?: ReactNode;
  /** Leading icon (e.g. an inline `<svg>`). */
  icon?: ReactNode;
  /** Trailing keystroke, set in the mono face — `⌘S`, `Del`. A hint and nothing
   *  more: binding the key is the app's job, not the menu's. */
  shortcut?: ReactNode;
  /** Present — `true` *or* `false` — makes the command a checkbox: it announces
   *  as one, states itself with a tick, and every command in the menu reserves
   *  the tick's column so the labels stay on one rule. */
  checked?: boolean;
  /** Dim the command and take it out of the arrow keys' reach. */
  disabled?: boolean;
}

/** A rule between two runs of commands. It has nothing to say but where it
 *  sits, which is why it is its own shape rather than a flag on a command. */
export interface MenuSeparator {
  separator: true;
}

/** One line of a menu. A bare string is shorthand for `{ id: theString }`. */
export type MenuEntry = string | MenuItem | MenuSeparator;

export interface MenuProps {
  /** Whether the menu is up (fully controlled). */
  open: boolean;
  /** Called when the menu asks to close — Escape, Tab, a press outside, or a
   *  command being chosen. */
  onClose: () => void;
  /** What it hangs off: an element (by ref or directly), or the point a
   *  right-click named. See `Popover`. */
  anchor: PopoverAnchor;
  /** The commands, top to bottom, with `{ separator: true }` between the runs
   *  you want fenced off. */
  items: MenuEntry[];
  /** Called with the chosen command's `id`. One handler for the menu rather than
   *  one per item: what a menu does is a single switch, and splitting it across
   *  the items would hide half of it in the data. */
  onSelect: (id: string) => void;
  /** Whether choosing a command dismisses the menu. On by default — it is what a
   *  menu is. Turn it off for a menu of checkboxes, where the point is to set
   *  several without reopening it each time. */
  closeOnSelect?: boolean;
  /** Preferred edge of the anchor; flips when the room isn't there. */
  side?: PopoverSide;
  /** Which way the menu lines up along that edge; shifts to stay on screen. */
  align?: PopoverAlign;
  /** Accessible name for the menu. */
  label?: string;
  /** Extra class names on the menu. */
  className?: string;
}

/* The tick a checkable command states itself with. Drawn rather than typed, for
   the reason the strip's ellipsis is: `✓` is a different glyph, at a different
   weight, on every platform this renders on. */
const TICK = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path
      d="M1.5 5.5L4 8l4.5-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Normalize the `string | MenuItem` shorthand. */
const toEntry = (e: MenuEntry): MenuItem | MenuSeparator => (typeof e === 'string' ? { id: e } : e);

const isSeparator = (e: MenuItem | MenuSeparator): e is MenuSeparator => 'separator' in e;

/**
 * A `Popover` holding commands — the context menu, and the menu a ⋯ button
 * opens.
 *
 * It brings the surface's whole job with it (anchoring, flipping, the top layer,
 * light dismissal — see `Popover`) and adds what makes a menu a menu: capsule
 * rows on the sheet, an optional tick column and trailing keystroke hints, and
 * the keyboard. One command, one `id`, reported through `onSelect`; which of
 * them are `checked` and what the app does about it stays yours, like every
 * other control here.
 *
 * Keyboard follows the ARIA menu pattern. Arrows move between commands and wrap
 * at the ends, Home / End jump to the ends, Enter and Space choose (they are
 * real buttons — the platform does that part), Escape dismisses, and Tab leaves:
 * a menu is not somewhere to tab *through*, so the focus moving on closes it.
 * Disabled commands are skipped rather than landed on.
 *
 * Submenus are deliberately absent for now — nesting one menu's dismissal inside
 * another's is a different problem from this one, and a flat menu with a
 * separator is almost always the better answer anyway.
 */
export function Menu({
  open,
  onClose,
  anchor,
  items,
  onSelect,
  closeOnSelect = true,
  side = 'bottom',
  align = 'start',
  label,
  className,
}: MenuProps) {
  const entries = items.map(toEntry);
  /** By entry index, so a separator simply leaves a hole rather than knocking
   *  every command after it out of step with its own row. */
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Can the focus land here? Separators and disabled commands cannot take it. */
  const pickable = (e: MenuItem | MenuSeparator) => !isSeparator(e) && !e.disabled;
  // Roving tabindex: the menu is a single tab stop, parked on the first command
  // that can hold it. Which one has *focus* is the browser's business from there.
  const stop = entries.findIndex(pickable);

  /** Focus the next pickable command from `from`, wrapping around. */
  const step = (from: number, dir: 1 | -1) => {
    const n = entries.length;
    if (!n) return;
    for (let i = 1; i <= n; i++) {
      const next = (((from + dir * i) % n) + n) % n;
      if (pickable(entries[next])) {
        refs.current[next]?.focus();
        return;
      }
    }
  };

  const choose = (item: MenuItem) => {
    onSelect(item.id);
    if (closeOnSelect) onClose();
  };

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        step(i, 1);
        break;
      case 'ArrowUp':
        step(i, -1);
        break;
      case 'Home':
        step(-1, 1);
        break;
      case 'End':
        step(entries.length, -1);
        break;
      case 'Tab':
        // Not prevented: the focus is meant to move on. Closing as it goes is
        // what keeps a dismissed menu from being left hanging over the app.
        onClose();
        return;
      default:
        return;
    }
    e.preventDefault();
  };

  // One command carrying `checked` gives the whole menu a tick column — see the
  // `checked` note above.
  const ticks = entries.some((e) => !isSeparator(e) && e.checked !== undefined);

  return (
    <Popover open={open} onClose={onClose} anchor={anchor} side={side} align={align}>
      <div className={cx('pp-menu', className)} role="menu" aria-label={label}>
        {entries.map((entry, i) => {
          if (isSeparator(entry)) {
            // Indexed key: a rule has no identity of its own, and its place in
            // the sequence is the only thing about it that can change.
            return <div key={`sep-${i}`} className="pp-menu-sep" role="separator" />;
          }
          return (
            <button
              key={entry.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className="pp-menu-item"
              /* A command that states a state is a checkbox, and `aria-checked`
                 is what says so — the tick beside it is only how it looks. */
              role={entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
              aria-checked={entry.checked}
              disabled={entry.disabled}
              tabIndex={i === stop ? 0 : -1}
              onClick={() => choose(entry)}
              onKeyDown={onKeyDown(i)}
            >
              {/* Empty on an unticked command rather than absent: the column is
                  what keeps the labels on one rule. */}
              {ticks && (
                <span className="pp-menu-tick" aria-hidden="true">
                  {entry.checked ? TICK : null}
                </span>
              )}
              {entry.icon && <span className="pp-menu-icon">{entry.icon}</span>}
              <span className="pp-menu-label">{entry.label ?? entry.id}</span>
              {entry.shortcut != null && <span className="pp-menu-shortcut">{entry.shortcut}</span>}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
