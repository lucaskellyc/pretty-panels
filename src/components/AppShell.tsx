import type { CSSProperties, ReactNode } from 'react';
import { cx } from './util';

export interface AppShellProps {
  /** The chrome over the top of the window — normally a `TitleBar`. It is an
   *  overlay: the shell reserves no room for it and the stage below runs to
   *  the window's own top edge, with the capsules floating over it. Anything
   *  that has to clear them reads `--titlebar-h`. */
  titleBar?: ReactNode;
  /** The stage. Scrolls; the chrome stays put. Runs full-bleed under the
   *  chrome — pad it with `--titlebar-h` if its content must start clear. */
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The window a desktop app fills: a stage under floating chrome.
 *
 * Two things make it a desktop window rather than a page. It owns the viewport
 * (`100dvh`, no document scroll) and gives the stage the only scrollbar —
 * otherwise the chrome slides away under the pointer that is dragging the
 * window. And it is the **containing block** for that chrome: `TitleBar` is
 * absolutely positioned, so the shell is what it pins to.
 *
 * The stage carries the app's ground — the deep plate the panels float on, with
 * the kit's dotted backdrop over it — because the capsules above need something
 * to blur, and a flat band under glass is just a bar with extra steps.
 *
 * It has exactly two slots, and that is the design. A status bar along the
 * bottom is the furthest point in the window from the work, so the readouts go
 * in `TitleBar`'s `left` / `right` slots instead; and a sidebar is just panels
 * in a column, which the stage already holds — owning one here would mean
 * owning its width, its side, its scrolling and its collapse, none of which the
 * shell knows better than you do. Put your own column on the stage.
 *
 * Layout only: it paints that ground and places the two slots. What goes in
 * them is yours.
 */
export function AppShell({ titleBar, children, className, style }: AppShellProps) {
  return (
    <div className={cx('pp-app-shell', className)} style={style}>
      {titleBar}
      <main className="pp-app-content">{children}</main>
    </div>
  );
}
