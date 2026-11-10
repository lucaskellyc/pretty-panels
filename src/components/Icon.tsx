import type { CSSProperties } from 'react';
import { forwardRef } from 'react';
import { ICONS, type IconName } from './icons';
import { cx } from './util';

export { ICON_NAMES } from './icons';
export type { IconName } from './icons';

export interface IconProps {
  /** Which glyph. `ICON_NAMES` lists them and `IconName` is their union. */
  name: IconName;
  /** Width and height, in px or any CSS length. Every glyph is drawn in a
   *  square frame, so one number sizes it. */
  size?: number | string;
  /** Accessible name, for an icon that stands alone and means something — the
   *  one thing in a table cell. Left off, the icon is decorative and hidden
   *  from assistive tech, which is right beside a label or inside a button
   *  that already carries its own. */
  label?: string;
  /** Extra class names on the svg. */
  className?: string;
  /** Inline styles on the svg — `color`, most often, since the ink is
   *  `currentColor`. */
  style?: CSSProperties;
}

/**
 * A glyph from the kit's own set, by name: `<Icon name="trash" />`.
 *
 * One component and a string rather than an import per icon, because the set
 * is small enough to ship whole and the places it is used want to *swap* a
 * glyph — a transport button that shows `pause` while it plays — which a
 * string does and a component reference does less gracefully.
 *
 * It carries its own `width` and `height`, as every icon handed to a button or
 * a row has to (the kit places an icon and does not size it), and paints with
 * `currentColor`, so the button's tier repaints it: dark ink at rest, white on
 * the accent. Nothing here styles its surroundings; it is an `<svg>` and sits
 * wherever an inline element would.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon({ name, size = 16, label, className, style }: IconProps, ref) {
  const { box, paths } = ICONS[name];
  return (
    <svg ref={ref}
      className={cx('pp-icon', className)}
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      fill="currentColor"
      /* An unlabelled icon is decoration beside the thing that names it, so it
         is hidden; a labelled one is the thing, so it is an image with a name. */
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={style}
    >
      {paths.map((p, i) =>
        typeof p === 'string' ? (
          <path key={i} d={p} />
        ) : (
          <path key={i} d={p.d} fillRule={p.fillRule} />
        ),
      )}
    </svg>
  );
});
