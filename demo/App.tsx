import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
// The SVG-only player, as the design canvas used — the default entry also
// carries the canvas/html renderers, which this page never asks for.
import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_svg';
import { familiesOf, pages, type DocPage, type Group } from './catalog';
import { PropsTable } from './pages';
import { IconButton, Slider, Stepper } from '../src';
import { version } from '../package.json';
// Imported as URLs, not as modules: these two compositions are ~340KB of JSON
// together, and lottie fetches them itself rather than having them inlined into
// the demo bundle.
import prettyUrl from './pretty.json?url';
import panelsUrl from './panels.json?url';

const GITHUB = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.03.08-2.13 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

/** Page footer — a repo link and the full package version. */
function Footer() {
  return (
    <footer className="doc-footer">
      <a
        className="doc-footer-link"
        href="https://github.com/lucaskellyc/pretty-panels"
        target="_blank"
        rel="noreferrer"
      >
        {GITHUB}
        <span>GitHub</span>
      </a>
      <span className="doc-footer-version">v{version}</span>
    </footer>
  );
}

const GROUPS: { id: Group; label: string }[] = [
  { id: 'atoms', label: 'Atoms' },
  { id: 'molecules', label: 'Molecules' },
  { id: 'organisms', label: 'Organisms' },
];

/** Tier prefix for a component's part-code (A1 / M1 / O1). The letter is real
 *  taxonomy — the atomic level it sits at — so the code encodes something true. */
const TIER_CODE: Record<Group, string> = { atoms: 'A', molecules: 'M', organisms: 'O' };

// Slugs in the order the sidebar actually renders them: by tier, then by family
// within the tier. The `pages` array is alphabetical across every tier, so
// page-to-page slides key off *this* order instead — moving to a later entry
// slides down, an earlier one slides up, matching the sidebar.
const sidebarOrder = GROUPS.flatMap((g) =>
  familiesOf(g.id).flatMap((f) => f.items.map((p) => p.slug)),
);

/** Part-code per slug (A1 / M2 / O1), numbered down each tier in sidebar order
 *  so the catalog's codes read consecutively across a tier's families. */
const PART_CODE = new Map<string, string>();
GROUPS.forEach((g) => {
  let n = 0;
  familiesOf(g.id).forEach((f) =>
    f.items.forEach((p) => PART_CODE.set(p.slug, `${TIER_CODE[g.id]}${++n}`)),
  );
});

/** The home catalog's cells — one per component class, in sidebar order. A class
 *  is a tier's family (Buttons, Choices, Groups …), and every page carries one, so
 *  the grid labels by family alone and never falls back to a tier name. */
const CLASSES = GROUPS.flatMap((g) =>
  familiesOf(g.id).map((f) => ({
    key: `${g.id}:${f.label}`,
    tier: g.id,
    label: f.label,
    items: f.items,
  })),
);

/** Track the active component slug from the URL hash (`#/atoms/slider`),
 *  animating swaps with a View Transition. <html> is tagged per navigation so
 *  the CSS can choose the motion: the sidebar slides in/out when it appears or
 *  disappears (to/from the home page), and page-to-page jumps slide vertically
 *  toward the target link's position in the sidebar order. */
function useHashSlug() {
  const read = () => window.location.hash.split('/').pop() ?? '';
  const [slug, setSlug] = useState(read);
  const slugRef = useRef(slug);
  slugRef.current = slug;

  useEffect(() => {
    const onHash = () => {
      const prev = slugRef.current;
      const next = read();
      if (prev === next) return;

      // flushSync makes React commit the new page synchronously inside the
      // transition callback so the API captures it as the "new" state.
      const startViewTransition = (
        document as unknown as {
          startViewTransition?: (cb: () => void) => { finished: Promise<unknown> };
        }
      ).startViewTransition;
      if (!startViewTransition) {
        setSlug(next);
        window.scrollTo(0, 0);
        return;
      }

      const prevIndex = sidebarOrder.indexOf(prev);
      const nextIndex = sidebarOrder.indexOf(next);
      // Home isn't in the sidebar order (index -1): entering or leaving it slides
      // the sidebar in / out while the content swaps. Page-to-page slides the
      // content vertically toward the target's position in the sidebar.
      const isHome = prevIndex === -1 || nextIndex === -1;
      let classes: string[];
      if (isHome) classes = ['vt-home']; // to / from home
      else if (nextIndex > prevIndex) classes = ['vt-down']; // target lower in list
      else classes = ['vt-up']; // target higher in list

      const root = document.documentElement;
      root.classList.add(...classes);
      const clear = () => root.classList.remove(...classes);

      if (isHome) {
        // Home nav has no doc-page slide — the `.doc` snapshot folds into the
        // static root — so old and new don't need a shared scroll offset. Reset
        // scroll *inside* the callback so the old snapshot captures the home page
        // where the user actually was, rather than flashing a frame of it jumped
        // to the top before the new page paints.
        const transition = startViewTransition.call(document, () => {
          flushSync(() => setSlug(next));
          window.scrollTo(0, 0);
        });
        transition.finished.then(clear, clear);
        return;
      }

      // Page → page slides doc-page vertically. Reset scroll *before* the old
      // snapshot is captured so old and new share a scroll position; otherwise the
      // transition group lurches the full scroll height instead of a small slide.
      window.scrollTo(0, 0);
      const transition = startViewTransition.call(document, () =>
        flushSync(() => setSlug(next)),
      );
      transition.finished.then(clear, clear);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // `sidebarOrder` is a real dependency, not a formality: the handler reads it
    // to decide direction. Declaring it is also what makes the listener survive
    // a hot update — a re-executed module builds a fresh array, the identity
    // changes, and the effect re-binds. With `[]` the listener kept the array
    // from first mount, so a page added mid-session looked like index -1 and
    // navigated with the home transition instead of the page slide.
  }, [sidebarOrder]);

  return slug;
}

export function App() {
  const slug = useHashSlug();
  const page = pages.find((p) => p.slug === slug);
  // Drawer state for the narrow-screen sidebar overlay. Ignored on wide screens,
  // where the sidebar is always a visible grid column.
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer after navigating (link click or back/forward)...
  useEffect(() => setMenuOpen(false), [slug]);
  // ...and on Escape while it's open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className={page ? 'docs' : 'docs is-home'}>
      {page && (
        <>
          {/* Clicking the drawer's blue area (outside the menu card) light-dismisses
              it, like the scrim; stopPropagation on the card keeps menu clicks from
              closing it (nav links still close via the slug effect). */}
          <aside
            className={`sidebar${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <div className="sidebar-container" onClick={(e) => e.stopPropagation()}>
              <a className="brand" href="#/">
                <span className="brand-name">PrettyPanels</span>
                <span className="brand-badge">alpha</span>
              </a>
              <nav>
                {GROUPS.map((g) => (
                  // No tier caption here — `data-tier` inks each link's part code
                  // (A1 / M2 / O1) in the tier's own hue, the same code-and-colour
                  // pair the home catalog prints, so the grouping reads without
                  // repeating "Atoms / Molecules / Organisms" down the rail.
                  <div className="nav-group" data-tier={g.id} key={g.id}>
                    {familiesOf(g.id).map((f) => (
                      <div className="nav-family" key={f.label}>
                        <div className="nav-family-title">{f.label}</div>
                        {f.items.map((p) => (
                          <a
                            key={p.slug}
                            className={`nav-link${p.slug === slug ? ' is-active' : ''}`}
                            href={`#/${p.group}/${p.slug}`}
                          >
                            <span className="nav-code">{PART_CODE.get(p.slug)}</span>
                            <span className="nav-name">{p.name}</span>
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </nav>
            </div>

          </aside>
          <div
            className={`docs-scrim${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        </>
      )}

      <main className="content">
        {page ? (
          <DocPageView
            page={page}
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((o) => !o)}
          />
        ) : (
          <Overview />
        )}
        <Footer />
      </main>
    </div>
  );
}

function DocPageView({
  page,
  menuOpen,
  onToggleMenu,
}: {
  page: DocPage;
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const { Example, Guide } = page;
  const dir = GROUPS.find((g) => g.id === page.group)?.label ?? page.group;
  return (
    <article className="doc">
      <header className="doc-head">
        <h1 className="doc-title">
          {/* The parent dir doubles as the sidebar toggle (narrow only; hidden
              on wide, where the sidebar is always visible). */}
          <button
            type="button"
            className="doc-title-dir"
            onClick={onToggleMenu}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {dir}
          </button>
          <span className="doc-title-slash" aria-hidden="true">
            /
          </span>
          <span className="doc-title-name">{page.name}</span>
        </h1>
        <p className="doc-summary">{page.summary}</p>
      </header>

      {Example && (
        <section className="doc-section">
          <h2>Example</h2>
          <div className="doc-example">
            <Example />
          </div>
        </section>
      )}

      {Guide && <Guide />}

      <section className="doc-section">
        <h2>Props</h2>
        <PropsTable rows={page.props} />
      </section>

      <section className="doc-section">
        <h2>Import</h2>
        <pre className="code">
          {/* The display name carries a space ("Title Bar"); the export doesn't. */}
          <code>{`import { ${page.name.replace(/\s/g, '')} } from '${page.importFrom ?? 'pretty-panels'}';`}</code>
        </pre>
      </section>
    </article>
  );
}

/** Both Lottie compositions are 270 frames at 60fps — 4.5s — so one clock can
 *  drive the pair and keep them locked to each other. */
const BENCH_DUR = 4.5;
const BENCH_LAST_FRAME = 269;

/** The posterize ladder, in fps. The bench quantises a smooth 60fps clock down
 *  onto one of these: the artwork snaps to held frames while the timeline under
 *  it keeps running smoothly, and that gap is what the hero is demonstrating. */
const BENCH_FPS = [12, 24, 60];

/** Which rung of BENCH_FPS the bench starts on, as an index into it: 0 → 12fps,
 *  1 → 24fps, 2 → 60fps. Starts coarse, because the held frames are the whole
 *  point and 60fps just looks like ordinary playback. Change this one number to
 *  open on a different rate (or add a rung to BENCH_FPS above and point at it —
 *  the Stepper's bounds and readout both derive from the array). */
const BENCH_FPS_START = 1;

/* Sized for IconButton's 34px round plate. The triangle is nudged right: its
   mass sits toward the flat edge, so a geometrically centred play glyph reads
   as left-of-centre inside a circle. The pause bars are symmetric and need no
   such correction. */
const PLAY_ICON = (
  <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
    <path d="M2 1v10l9-5z" transform="translate(0.7 0)" />
  </svg>
);
const PAUSE_ICON = (
  <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
    <path d="M2 1h3v10H2zM7 1h3v10H7z" />
  </svg>
);

/** The hero — a motion bench. Two Lottie stages run off a single posterized
 *  clock, and the transport under them is real pretty-panels hardware: a
 *  IconButton for play, a Slider that also scrubs, a Stepper on the frame rate.
 *  The page is the demo — a visitor is driving the library before reading a word
 *  about it. Drop the rate and each drawn frame is held longer while the
 *  timeline keeps moving, which is the whole point of the piece. */
function HeroBench() {
  const prettyStage = useRef<HTMLDivElement>(null);
  const panelsStage = useRef<HTMLDivElement>(null);
  const anims = useRef<AnimationItem[]>([]);
  const raf = useRef(0);
  const lastTs = useRef<number | null>(null);
  const lastFrame = useRef<number | null>(null);
  const elapsed = useRef(0);

  const [playing, setPlaying] = useState(true);
  const [fpsIdx, setFpsIdx] = useState(BENCH_FPS_START);
  const [time, setTime] = useState(0);

  // The rAF loop is installed once and never torn down, so it reads the live
  // transport state through refs rather than closing over one render's values.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const fpsIdxRef = useRef(fpsIdx);
  fpsIdxRef.current = fpsIdx;

  useEffect(() => {
    const stages: [HTMLDivElement | null, string][] = [
      [prettyStage.current, prettyUrl],
      [panelsStage.current, panelsUrl],
    ];
    anims.current = stages
      .filter((s): s is [HTMLDivElement, string] => s[0] != null)
      .map(([container, path]) =>
        lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          path,
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        }),
      );

    const tick = (ts: number) => {
      raf.current = requestAnimationFrame(tick);
      const last = lastTs.current ?? ts;
      lastTs.current = ts;
      // Capped so a backgrounded tab doesn't fast-forward the clock on return.
      if (playingRef.current) elapsed.current += Math.min(0.1, (ts - last) / 1000);

      const now = elapsed.current % BENCH_DUR;
      const hold = 60 / BENCH_FPS[fpsIdxRef.current];
      const frame = Math.min(BENCH_LAST_FRAME, Math.floor((now * 60) / hold) * hold);
      if (frame !== lastFrame.current) {
        lastFrame.current = frame;
        for (const a of anims.current) a.goToAndStop(frame, true);
      }
      setTime(now);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      for (const a of anims.current) a.destroy();
      anims.current = [];
    };
  }, []);

  // Scrubbing moves the shared clock; the next tick repaints both stages off it.
  // Clearing lastFrame forces that repaint even when the scrub lands inside the
  // frame currently being held, so the stages track the thumb at any rate.
  const seek = (v: number) => {
    elapsed.current = v;
    lastFrame.current = null;
    setTime(v);
  };

  // A drag pauses for its own duration — otherwise the clock keeps advancing
  // under the thumb and the two fight over the playhead. Release restores what
  // the transport was doing before, so a scrub started while paused stays
  // paused. Slider captures the pointer on its input, so a release outside the
  // track still bubbles pointerup through this wrapper.
  const resumeAfterScrub = useRef(false);
  const startScrub = () => {
    resumeAfterScrub.current = playingRef.current;
    setPlaying(false);
  };
  const endScrub = () => {
    if (resumeAfterScrub.current) setPlaying(true);
    resumeAfterScrub.current = false;
  };

  return (
    <div className="hero-poster" aria-label="pretty-panels live demo">
      <div className="hero-stages">
        <div className="hero-stage" ref={prettyStage} />
        <div className="hero-stage" ref={panelsStage} />
      </div>

      <div className="hero-transport">
        {/* The glyph is the only thing naming this control now, so `label`
            carries the whole accessible name (and the tooltip). */}
        <IconButton
          mode="toggle"
          active={playing}
          onChange={setPlaying}
          label={playing ? 'Pause' : 'Play'}
        >
          {playing ? PAUSE_ICON : PLAY_ICON}
        </IconButton>
        <div
          className="hero-seek"
          onPointerDown={startScrub}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        >
          <Slider
            label="Time"
            value={time}
            min={0}
            max={BENCH_DUR}
            step={0.01}
            onChange={seek}
            format={(v) => `${v.toFixed(2)}s`}
          />
        </div>
        {/* Stepped by index, not by fps — the rate ladder isn't evenly spaced.
            `format` turns the index back into the rate for display. */}
        <Stepper
          value={fpsIdx}
          onChange={setFpsIdx}
          min={0}
          max={BENCH_FPS.length - 1}
          step={1}
          format={(i) => `${BENCH_FPS[i]} FPS`}
        />
      </div>

      <p className="hero-tagline">A compact, stylish component library</p>
      <p className="hero-sub">
        Quickly assemble sophisticated control-panel UIs with an intuitive set of components.
      </p>

      <div className="hero-specs">
        <span>
          <b>{pages.length} components</b>
        </span>
        <span>v{version}</span>
      </div>
    </div>
  );
}

function Overview() {
  return (
    <article className="home">
      <HeroBench />
      <section className="catalog">
        {CLASSES.map((c) => (
          // `data-tier` tints the cell and every card inside it: pink / teal /
          // warm yellow per atomic level. It's a second read of the part code
          // each card already prints (A1 / M2 / O1), never the only one.
          <div className="catalog-cell" data-tier={c.tier} key={c.key}>
            <h3 className="catalog-cell-title">{c.label}</h3>
            <ul className="catalog-list">
              {c.items.map((p) => (
                <li key={p.slug}>
                  <a className="catalog-row" href={`#/${p.group}/${p.slug}`}>
                    <span className="catalog-code">{PART_CODE.get(p.slug)}</span>
                    <span className="catalog-name">{p.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </article>
  );
}
