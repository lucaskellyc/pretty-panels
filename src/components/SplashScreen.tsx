import { type ReactNode, useEffect, useId, useState, forwardRef } from 'react';
import { ProgressBar } from './ProgressBar';
import { cx } from './util';

/** One of the ways in a landing splash offers once loading is done. */
export interface SplashAction {
  /** The choice, in a word or two ("Start from scratch"). */
  label: ReactNode;
  /** A line under the label saying what it gets you. */
  description?: ReactNode;
  /** A glyph above the label — an inline SVG, sized by the card. */
  icon?: ReactNode;
  onClick: () => void;
  /** Disables the card, e.g. while the action it starts is still running. */
  disabled?: boolean;
}

export interface SplashScreenProps {
  /** Whether the splash is up (fully controlled). Going false plays the fade-out
   *  and unmounts once it finishes. */
  open: boolean;
  /** The app's name, set large in the banner's top corner. */
  title: ReactNode;
  /** A mark beside the title — an `<img>` or inline SVG. */
  logo?: ReactNode;
  /** A small mono line under the title, usually the version. */
  version?: ReactNode;
  /** What's loading right now, along the banner's foot ("Initializing
   *  plug-ins…"). Announced politely as it changes. */
  status?: ReactNode;
  /** Load progress, 0–1, drawn as a hairline along the bottom edge. Omit for no
   *  line at all — the status text alone is the classic look. */
  progress?: number;
  /** How `progress` is drawn: `'line'`, the hairline along the bottom edge, or
   *  `'bar'`, a ProgressBar under the status that candy-stripes once it's full. */
  progressStyle?: 'line' | 'bar';
  /** Turns the splash into a landing page: once set, the status and progress
   *  give way to these as a row of cards that fade in, and the banner stays up
   *  until the app flips `open` false — usually from one of their `onClick`s.
   *  Leave unset while loading, then pass them when it's done. */
  actions?: SplashAction[];
  /** Fills the window edge to edge instead of floating as a card — the usual
   *  choice for a landing page, where nothing behind it is worth seeing. */
  fullscreen?: boolean;
  /** The banner's artwork, filling it edge to edge behind the text — an `<img>`,
   *  `<video>` or SVG. Defaults to none, leaving the blurred page behind it. */
  art?: ReactNode;
  /** Small print in the bottom-right corner — credits, a copyright line. */
  children?: ReactNode;
  /** Called once the fade-out has finished and the splash has unmounted. */
  onExited?: () => void;
  /** Extra class names on the banner. */
  className?: string;
}

/**
 * The banner an app shows while it starts: a borderless card floating in the
 * middle of the window, its artwork running edge to edge, with the app's mark,
 * name and version in one corner and a line of loading status along the foot.
 * Given `actions` once loaded, it becomes the app's landing page instead: the
 * status makes way for a row of choices and the banner waits for one.
 *
 * It isn't a dialog — there's nothing to answer. A blurring layer under it
 * swallows clicks so the half-loaded app behind can't be used, and the page
 * stays visible, blurred, around the banner. Controlled like everything else:
 * flip `open` false when loading is done and it fades out on its own before it
 * unmounts.
 */
export const SplashScreen = forwardRef<HTMLDivElement, SplashScreenProps>(function SplashScreen({
  open,
  title,
  logo,
  version,
  status,
  progress,
  progressStyle = 'line',
  actions,
  fullscreen = false,
  art,
  children,
  onExited,
  className,
}: SplashScreenProps, ref) {
  // Stays mounted after `open` goes false so the fade-out can play; the
  // animationend below is what finally takes it down.
  const [mounted, setMounted] = useState(open);
  const titleId = useId();

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  const landing = actions != null && actions.length > 0;
  const pct = !landing && progress != null ? Math.round(Math.max(0, Math.min(1, progress)) * 1000) / 10 : null;

  return (
    <div ref={ref}
      className={cx('pp-splash', fullscreen && 'is-fullscreen', !open && 'is-leaving')}
      onAnimationEnd={(e) => {
        // Only the layer's own exit counts — the banner's bubbles up too.
        if (e.target !== e.currentTarget || open) return;
        setMounted(false);
        onExited?.();
      }}
    >
      <div className={cx('pp-splash-banner', landing && 'is-landing', art != null && 'has-art', className)} aria-labelledby={titleId} aria-busy={open && !landing} role="region">
        <div className="pp-splash-art" aria-hidden="true">
          {art}
        </div>
        <div className="pp-splash-head">
          {logo != null && <div className="pp-splash-logo">{logo}</div>}
          <div>
            <div className="pp-splash-title" id={titleId}>
              {title}
            </div>
            {version != null && <div className="pp-splash-version">{version}</div>}
          </div>
        </div>
        {landing && (
          <div className="pp-splash-actions">
            {actions.map((a, i) => (
              <button
                key={i}
                type="button"
                className="pp-splash-action"
                style={{ ['--i' as string]: i }}
                disabled={a.disabled}
                onClick={a.onClick}
              >
                {a.icon != null && (
                  <span className="pp-splash-action-icon" aria-hidden="true">
                    {a.icon}
                  </span>
                )}
                <span className="pp-splash-action-label">{a.label}</span>
                {a.description != null && <span className="pp-splash-action-desc">{a.description}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="pp-splash-foot">
          {/* Kept mounted once landing, empty, so the credits hold their corner. */}
          <div className="pp-splash-load">
            {!landing && (
              <>
                <div className="pp-splash-status" role="status">
                  {status}
                </div>
                {progress != null && progressStyle === 'bar' && (
                  <ProgressBar className="pp-splash-bar" value={progress} labelledBy={titleId} />
                )}
              </>
            )}
          </div>
          {children != null && <div className="pp-splash-credits">{children}</div>}
        </div>
        {pct != null && progressStyle === 'line' && (
          <div
            className="pp-splash-progress"
            role="progressbar"
            aria-labelledby={titleId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            style={{ ['--pp-splash-fill' as string]: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
});
