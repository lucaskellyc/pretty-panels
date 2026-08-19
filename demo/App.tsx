import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { pages, PropsTable, type DocPage, type Group } from './pages';
import { Panel, Slider, Toggle, Vector } from '../src';
import { version } from '../package.json';

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

// Slugs in the order the sidebar actually renders them: grouped by GROUPS, then
// by each page's position within its group. The flat `pages` array interleaves
// groups, so page-to-page slides key off *this* order instead — moving to a
// later group slides down, an earlier group slides up, matching the sidebar.
const sidebarOrder = GROUPS.flatMap((g) =>
  pages.filter((p) => p.group === g.id).map((p) => p.slug),
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
  }, []);

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

  // Freeze page scroll while the drawer overlay is open (CSS gates the actual
  // lock to narrow widths, so a resize to desktop can't strand the layout).
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', menuOpen);
    return () => document.documentElement.classList.remove('menu-open');
  }, [menuOpen]);

  return (
    <div className={page ? 'docs' : 'docs is-home'}>
      {page && (
        <>
          <aside className={`sidebar${menuOpen ? ' is-open' : ''}`}>
            <a className="brand" href="#/">
              <span className="brand-name">PrettyPanels</span>
              <span className="brand-badge">alpha</span>
            </a>
            <nav>
              {GROUPS.map((g) => (
                <div className="nav-group" key={g.id}>
                  <div className="nav-group-title">{g.label}</div>
                  {pages
                    .filter((p) => p.group === g.id)
                    .map((p) => (
                      <a
                        key={p.slug}
                        className={`nav-link${p.slug === slug ? ' is-active' : ''}`}
                        href={`#/${p.group}/${p.slug}`}
                      >
                        {p.name}
                      </a>
                    ))}
                </div>
              ))}
            </nav>
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
  const { Example } = page;
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

      <section className="doc-section">
        <h2>Props</h2>
        <PropsTable rows={page.props} />
      </section>

      <section className="doc-section">
        <h2>Import</h2>
        <pre className="code">
          <code>{`import { ${page.name} } from 'pretty-panels';`}</code>
        </pre>
      </section>
    </article>
  );
}

/** Tier prefix for a component's part-code (A1 / M1 / O1). The letter is real
 *  taxonomy — the atomic level it sits at — so the code encodes something true. */
const TIER_CODE: Record<Group, string> = { atoms: 'A', molecules: 'M', organisms: 'O' };

/** The install command, shown in the "Get started" section. */
const INSTALL_CMD = 'npm install github:lucaskellyc/pretty-panels';

/** The pretty-panels wordmark, as its glyph paths in a 276×56 user
 *  space. Kept as a constant so the mark's markup below stays legible. */
const MARK_PATHS = [
  "M7.446 30.472C6.06358 30.5127 4.964 31.6451 4.964 33.0281V52.591C4.964 53.9618 3.85277 55.073 2.482 55.073C1.11123 55.073 0 53.9618 0 52.591V4.396C0 2.18686 1.79086 0.395996 4 0.395996H7.957C9.22233 0.395996 10.4147 0.566329 11.534 0.906994C12.702 1.24766 13.6997 1.83166 14.527 2.659C15.403 3.43766 16.0843 4.484 16.571 5.798C17.1063 7.06333 17.374 8.645 17.374 10.543V20.325C17.374 21.6877 17.1793 22.9773 16.79 24.194C16.4007 25.4107 15.7923 26.4813 14.965 27.406C14.1863 28.3307 13.1643 29.085 11.899 29.669C10.6337 30.2043 9.14933 30.472 7.446 30.472ZM7.665 4.338C6.17328 4.338 4.964 5.54728 4.964 7.039V24.2657C4.964 25.3833 5.89113 26.2779 7.008 26.238C8.71133 25.9947 10.0253 25.362 10.95 24.34C11.9233 23.318 12.41 21.7607 12.41 19.668V10.178C12.41 8.134 11.972 6.64966 11.096 5.725C10.2687 4.80033 9.125 4.338 7.665 4.338Z",
  "M41.4697 52.5542C41.4697 53.9393 40.3361 55.0563 38.9512 55.036C37.5948 55.016 36.5057 53.9108 36.5057 52.5542V36.166C36.5057 33.684 36.0434 31.8103 35.1187 30.545C34.2427 29.2797 33.0017 28.647 31.3957 28.647C30.1056 28.647 29.0597 29.6929 29.0597 30.983V52.5542C29.0597 53.9108 27.9706 55.016 26.6142 55.036C25.2293 55.0563 24.0957 53.9393 24.0957 52.5542V29.8515C24.0957 29.2266 23.5891 28.72 22.9642 28.72C22.3393 28.72 21.8327 28.2134 21.8327 27.5885V25.3985C21.8327 24.7736 22.3393 24.267 22.9642 24.267C23.5891 24.267 24.0957 23.7604 24.0957 23.1355V4.396C24.0957 2.18686 25.8866 0.395996 28.0957 0.395996H32.4907C33.756 0.395996 34.924 0.566329 35.9947 0.906994C37.114 1.24766 38.063 1.83166 38.8417 2.659C39.669 3.43766 40.3017 4.484 40.7397 5.798C41.2264 7.06333 41.4697 8.645 41.4697 10.543V18.354C41.4697 19.3273 41.3724 20.179 41.1777 20.909C40.983 21.639 40.691 22.3203 40.3017 22.953C39.9124 23.537 39.4014 24.0967 38.7687 24.632C37.8992 25.3008 38.1181 26.787 38.9615 27.4885C39.558 27.9846 40.0291 28.5897 40.3747 29.304C41.1047 30.8127 41.4697 33.1487 41.4697 36.312V52.5542ZM31.8337 4.55699C30.3017 4.55699 29.0597 5.79896 29.0597 7.331V21.785C29.0597 23.1155 30.1383 24.194 31.4687 24.194C34.8267 24.194 36.5057 22.1257 36.5057 17.989V11.346C36.5057 8.91266 36.1164 7.185 35.3377 6.163C34.559 5.09233 33.391 4.55699 31.8337 4.55699Z",
  "M60.8136 50.839C61.8601 50.7518 62.7846 51.5531 62.7846 52.6033V52.912C62.7846 53.9344 62.016 54.7985 60.9964 54.8754C60.7385 54.8949 60.4829 54.9121 60.2296 54.927C59.4509 54.9757 58.7209 55 58.0396 55C54.3896 55 51.8832 54.0023 50.5206 52.007C49.1579 50.0117 48.4766 47.189 48.4766 43.539V30.2165C48.4766 29.5916 47.97 29.085 47.3451 29.085C46.7202 29.085 46.2136 28.5784 46.2136 27.9535V25.9825C46.2136 25.3576 46.7202 24.851 47.3451 24.851C47.97 24.851 48.4766 24.3444 48.4766 23.7195V12.222C48.4766 7.89066 49.2066 4.849 50.6666 3.097C52.1266 1.29633 54.4626 0.395996 57.6746 0.395996C58.2586 0.395996 58.9156 0.395996 59.6456 0.395996C59.8367 0.395996 60.0329 0.399333 60.2341 0.406008C61.273 0.440477 62.0546 1.32844 62.0546 2.36797C62.0546 3.57771 61.008 4.51185 59.7999 4.44858C59.3216 4.42352 58.8808 4.411 58.4776 4.411C57.2122 4.411 56.2389 4.58133 55.5576 4.92199C54.8762 5.214 54.3652 5.67633 54.0246 6.30899C53.7326 6.94166 53.5622 7.74466 53.5136 8.718C53.4649 9.69133 53.4406 10.835 53.4406 12.149V20.982C53.4406 23.1591 55.2055 24.924 57.3826 24.924H59.2441C60.3931 24.924 61.3246 25.8555 61.3246 27.0045C61.3246 28.1535 60.3931 29.085 59.2441 29.085H57.3826C55.2055 29.085 53.4406 30.8499 53.4406 33.027V43.612C53.4406 44.5853 53.4892 45.5343 53.5866 46.459C53.7326 47.335 54.0002 48.1137 54.3896 48.795C54.7789 49.4277 55.3629 49.9387 56.1416 50.328C56.9689 50.7173 58.0396 50.912 59.3536 50.912C59.7429 50.912 60.2296 50.8877 60.8136 50.839Z",
  "M77.2808 52.518C77.2808 53.8888 76.1695 55 74.7988 55C73.428 55 72.3168 53.8888 72.3168 52.518V7.80549C72.3168 6.13235 70.9604 4.776 69.2873 4.776H68.4478C67.2383 4.776 66.2578 3.7955 66.2578 2.586C66.2578 1.37649 67.2383 0.395996 68.4478 0.395996H81.0768C82.2863 0.395996 83.2668 1.37649 83.2668 2.586C83.2668 3.7955 82.2863 4.776 81.0768 4.776H80.2738C78.6208 4.776 77.2808 6.11601 77.2808 7.76899V52.518Z",
  "M97.812 52.518C97.812 53.8888 96.7008 55 95.33 55C93.9592 55 92.848 53.8888 92.848 52.518V7.80549C92.848 6.13235 91.4917 4.776 89.8185 4.776H88.979C87.7695 4.776 86.789 3.7955 86.789 2.586C86.789 1.37649 87.7695 0.395996 88.979 0.395996H101.608C102.818 0.395996 103.798 1.37649 103.798 2.586C103.798 3.7955 102.818 4.776 101.608 4.776H100.805C99.152 4.776 97.812 6.11601 97.812 7.76899V52.518Z",
  "M121.482 43.393V39.2867C121.482 38.4059 120.459 37.9185 119.657 38.283C119.171 38.4777 118.514 38.575 117.686 38.575C114.474 38.575 112.236 37.626 110.97 35.728C109.705 33.7813 109.072 30.8127 109.072 26.822V2.87799C109.072 1.50722 110.183 0.395996 111.554 0.395996C112.925 0.395996 114.036 1.50722 114.036 2.87799V26.676C114.036 29.012 114.255 30.91 114.693 32.37C115.131 33.7813 116.129 34.487 117.686 34.487C119.341 34.487 120.387 33.7813 120.825 32.37C121.263 30.9587 121.482 29.085 121.482 26.749V2.87799C121.482 1.50722 122.593 0.395996 123.964 0.395996C125.335 0.395996 126.446 1.50722 126.446 2.87799V43.174C126.446 47.3593 125.668 50.4983 124.11 52.591C122.553 54.6837 119.974 55.73 116.372 55.73C115.107 55.73 114.012 55.5353 113.087 55.146C112.524 54.909 111.844 54.6359 111.047 54.3267C110.102 53.9604 109.59 52.9323 109.882 51.9619C110.196 50.912 111.321 50.3471 112.38 50.6278C112.798 50.7385 113.204 50.8332 113.598 50.912C114.572 51.1067 115.399 51.204 116.08 51.204C117.297 51.204 118.27 51.0337 119 50.693C119.73 50.3523 120.266 49.8657 120.606 49.233C120.996 48.5517 121.239 47.7243 121.336 46.751C121.434 45.7777 121.482 44.6583 121.482 43.393Z",
  "M152.942 30.514C151.56 30.5547 150.46 31.6871 150.46 33.0701V52.633C150.46 54.0038 149.349 55.115 147.978 55.115C146.607 55.115 145.496 54.0038 145.496 52.633V4.438C145.496 2.22886 147.287 0.437996 149.496 0.437996H153.453C154.718 0.437996 155.911 0.608332 157.03 0.948997C158.198 1.28967 159.196 1.87366 160.023 2.701C160.899 3.47966 161.58 4.526 162.067 5.84C162.602 7.10533 162.87 8.687 162.87 10.585V20.367C162.87 21.7297 162.675 23.0193 162.286 24.236C161.897 25.4527 161.288 26.5233 160.461 27.448C159.682 28.3727 158.66 29.127 157.395 29.711C156.13 30.2463 154.645 30.514 152.942 30.514ZM153.161 4.38C151.669 4.38 150.46 5.58928 150.46 7.081V24.3077C150.46 25.4253 151.387 26.3199 152.504 26.28C154.207 26.0367 155.521 25.404 156.446 24.382C157.419 23.36 157.906 21.8027 157.906 19.71V10.22C157.906 8.17599 157.468 6.69166 156.592 5.767C155.765 4.84233 154.621 4.38 153.161 4.38Z",
  "M167.329 24.9295C167.329 24.3046 167.835 23.798 168.46 23.798C169.085 23.798 169.592 23.2914 169.592 22.6665V9.70899C169.592 6.78899 170.346 4.45299 171.855 2.701C173.412 0.90033 175.553 0 178.279 0C179.593 0 180.761 0.24333 181.783 0.729996C182.853 1.21666 183.778 1.89799 184.557 2.77399C185.335 3.64999 185.919 4.69633 186.309 5.91299C186.747 7.08099 186.966 8.34633 186.966 9.70899V52.56C186.966 53.9308 185.854 55.042 184.484 55.042C183.113 55.042 182.002 53.9308 182.002 52.56V32.266C182.002 30.2098 180.335 28.543 178.279 28.543C176.223 28.543 174.556 30.2098 174.556 32.266V52.5962C174.556 53.9813 173.422 55.0983 172.037 55.078C170.681 55.058 169.592 53.9528 169.592 52.5962V29.6745C169.592 29.0496 169.085 28.543 168.46 28.543C167.835 28.543 167.329 28.0364 167.329 27.4115V24.9295ZM174.556 9.271V20.075C174.556 22.1312 176.223 23.798 178.279 23.798C180.335 23.798 182.002 22.1312 182.002 20.075V9.271C182.002 7.42166 181.661 6.10766 180.98 5.32899C180.298 4.55033 179.398 4.161 178.279 4.161C177.062 4.161 176.137 4.55033 175.505 5.32899C174.872 6.059 174.556 7.373 174.556 9.271Z",
  "M198.937 52.56C198.937 53.9308 197.825 55.042 196.455 55.042C195.084 55.042 193.973 53.9308 193.973 52.56V2.7375C193.973 1.46752 195.002 0.437996 196.272 0.437996H197.738C198.198 0.437996 198.572 0.811333 198.572 1.27187C198.572 2.01476 199.479 2.39467 200.045 1.91373C200.674 1.37927 201.229 0.984693 201.711 0.729996C202.587 0.24333 203.584 0 204.704 0C206.553 0 208.11 0.705664 209.376 2.117C210.69 3.47966 211.347 5.57233 211.347 8.395V52.633C211.347 54.0038 210.235 55.115 208.865 55.115C207.494 55.115 206.383 54.0038 206.383 52.633V8.395C206.383 7.227 206.139 6.351 205.653 5.767C205.166 5.13433 204.533 4.81799 203.755 4.81799C202.489 4.81799 201.37 5.37766 200.397 6.49699C199.423 7.61633 198.937 9.07633 198.937 10.877V52.56Z",
  "M230.69 50.881C231.737 50.7938 232.661 51.5951 232.661 52.6453V52.954C232.661 53.9764 231.893 54.8405 230.873 54.9174C230.615 54.9369 230.36 54.9541 230.106 54.969C229.328 55.0177 228.598 55.042 227.916 55.042C224.266 55.042 221.76 54.0443 220.397 52.049C219.035 50.0537 218.353 47.231 218.353 43.581V30.2585C218.353 29.6336 217.847 29.127 217.222 29.127C216.597 29.127 216.09 28.6204 216.09 27.9955V26.0245C216.09 25.3996 216.597 24.893 217.222 24.893C217.847 24.893 218.353 24.3864 218.353 23.7615V12.264C218.353 7.93266 219.083 4.89099 220.543 3.13899C222.003 1.33833 224.339 0.437996 227.551 0.437996C228.135 0.437996 228.792 0.437996 229.522 0.437996C229.714 0.437996 229.91 0.441332 230.111 0.448006C231.15 0.482474 231.931 1.37044 231.931 2.40997C231.931 3.61972 230.885 4.55385 229.677 4.49058C229.198 4.46552 228.758 4.453 228.354 4.453C227.089 4.453 226.116 4.62333 225.434 4.964C224.753 5.256 224.242 5.71833 223.901 6.35099C223.609 6.98366 223.439 7.78666 223.39 8.75999C223.342 9.73333 223.317 10.877 223.317 12.191V21.024C223.317 23.2011 225.082 24.966 227.259 24.966H229.121C230.27 24.966 231.201 25.8975 231.201 27.0465C231.201 28.1955 230.27 29.127 229.121 29.127H227.259C225.082 29.127 223.317 30.8919 223.317 33.069V43.654C223.317 44.6273 223.366 45.5763 223.463 46.501C223.609 47.377 223.877 48.1557 224.266 48.837C224.656 49.4697 225.24 49.9807 226.018 50.37C226.846 50.7593 227.916 50.954 229.23 50.954C229.62 50.954 230.106 50.9297 230.69 50.881Z",
  "M252.852 52.706C252.852 53.9961 251.806 55.042 250.516 55.042H241.887C239.677 55.042 237.887 53.2511 237.887 51.042V2.91999C237.887 1.54922 238.998 0.437996 240.369 0.437996C241.739 0.437996 242.851 1.54922 242.851 2.91999V46.37C242.851 48.5791 244.641 50.37 246.851 50.37H250.516C251.806 50.37 252.852 51.4159 252.852 52.706Z",
  "M266.382 0C269.058 0 271.054 1.168 272.368 3.504C273.535 5.46287 274.202 8.5104 274.37 12.6466C274.418 13.8451 273.439 14.819 272.24 14.819C271.084 14.819 270.136 13.913 270.043 12.761C269.825 10.0654 269.481 8.05045 269.01 6.716C268.474 5.06133 267.574 4.23399 266.309 4.23399C265.238 4.23399 264.386 4.79366 263.754 5.91299C263.17 6.98366 262.878 8.56533 262.878 10.658C262.878 13.0427 263.194 15.1353 263.827 16.936C264.459 18.688 265.238 20.3183 266.163 21.827C267.087 23.287 268.085 24.6983 269.156 26.061C270.275 27.4237 271.297 28.908 272.222 30.514C273.146 32.0713 273.925 33.872 274.558 35.916C275.19 37.9113 275.507 40.2717 275.507 42.997C275.507 44.7003 275.336 46.3063 274.996 47.815C274.655 49.275 274.12 50.589 273.39 51.757C272.66 52.8763 271.735 53.7767 270.616 54.458C269.545 55.0907 268.255 55.407 266.747 55.407C264.995 55.407 263.559 55.042 262.44 54.312C261.32 53.582 260.444 52.6087 259.812 51.392C259.179 50.1267 258.741 48.6667 258.498 47.012C258.254 45.3573 258.133 43.581 258.133 41.683V41.464C258.133 40.0932 259.244 38.982 260.615 38.982C261.985 38.982 263.097 40.0932 263.097 41.464V42.851C263.097 45.3817 263.34 47.4013 263.827 48.91C264.362 50.4187 265.384 51.173 266.893 51.173C267.574 51.173 268.158 50.9783 268.645 50.589C269.18 50.151 269.594 49.5913 269.886 48.91C270.226 48.2287 270.47 47.45 270.616 46.574C270.81 45.6493 270.908 44.7003 270.908 43.727C270.908 41.099 270.591 38.8117 269.959 36.865C269.326 34.8697 268.523 33.0933 267.55 31.536C266.625 29.93 265.603 28.4457 264.484 27.083C263.364 25.7203 262.318 24.3333 261.345 22.922C260.42 21.462 259.641 19.929 259.009 18.323C258.376 16.6683 258.06 14.746 258.06 12.556C258.06 8.51667 258.741 5.42633 260.104 3.285C261.466 1.095 263.559 0 266.382 0Z",
];

/** Peak inset-highlight offset, in the mark's 276×56 user space. Small by
 *  design: the highlight reads as a lit edge on the letterforms, not a glow. */
const HIGHLIGHT_AMOUNT = 1.0;

/** The poster's logo: the wordmark lit by a warm inset rim. The
 *  Inspector's `highlight` toggle enables the rim and the `angle` slider spins its
 *  direction around the letterforms — so a visitor is driving a pretty-panels
 *  control the moment the page loads. The rim is the crescent left when the letter
 *  silhouette is subtracted from a nudged copy of itself, feathered and flooded
 *  warm white. The mark names the product, so it stays a labelled image. */
function HeroMark({
  angle,
  highlight,
  color,
}: {
  angle: number;
  highlight: boolean;
  color: number[];
}) {
  const rad = (angle * Math.PI) / 180;
  const [r, g, b] = color;
  const dx = (Math.cos(rad) * HIGHLIGHT_AMOUNT).toFixed(2);
  const dy = (Math.sin(rad) * HIGHLIGHT_AMOUNT).toFixed(2);
  const feather = Math.max(0.1, HIGHLIGHT_AMOUNT * 0.1).toFixed(1);
  return (
    <div className="hero-mark">
      <svg viewBox="0 0 276 56" role="img" aria-label="pretty-panels">
        <defs>
          <filter id="hero-mark-hi" x="-25%" y="-25%" width="150%" height="150%">
            <feOffset in="SourceAlpha" dx={dx} dy={dy} result="sh" />
            <feFlood floodColor="rgba(255, 255, 255, 0.5)" result="col" />
            <feComposite in="SourceAlpha" in2="sh" operator="out" result="rim" />
            <feGaussianBlur in="rim" stdDeviation={feather} result="brim" />
            <feComposite in="brim" in2="SourceAlpha" operator="in" result="rimIn" />
            <feComposite in="col" in2="rimIn" operator="in" result="hi" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="hi" />
            </feMerge>
          </filter>
        </defs>
        <g filter={highlight ? 'url(#hero-mark-hi)' : undefined} fill={`rgb(${r}, ${g}, ${b})`}>
          {MARK_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/** The hero — a poster plate. The wordmark sits above a real
 *  pretty-panels Inspector whose controls light the mark: a `highlight` toggle
 *  arming a warm inset rim, an `angle` slider spinning its direction, and a color
 *  vector repainting it live. The page IS the demo: a visitor is handling
 *  pretty-panels before reading a word about it. A tagline and the spec strip
 *  round out the card. */
function HeroPoster() {
  const [angle, setAngle] = useState(200);
  const [highlight, setHighlight] = useState(true);

  const [color, setColor] = useState([125, 100, 150]);

  return (
    <div className="hero-poster" aria-label="pretty-panels live demo">
      <HeroMark angle={angle} highlight={highlight} color={color} />

      <Panel>
        <Toggle
          checked={highlight}
          onChange={setHighlight}
          label="Highlight"
          hint="Warm inset rim on the mark"
        />
        <Slider
          label="Highlight angle"
          value={angle}
          min={0}
          max={360}
          step={1}
          onChange={setAngle}
          format={(v) => `${v}°`}
        />
        <div className="doc-row">
          <span className="doc-row-label">Fill color</span>
          <Vector
            value={color}
            colorMode
            step={1}
            min={0}
            max={255}
            onChange={(axis, v) => setColor((c) => c.map((x, i) => (i === axis ? v : x)))}
          />
        </div>
      </Panel>

      <p className="hero-tagline">Control-panel UI in a handful of parts.</p>
      <p className="hero-sub">
        Panel plates, capsule tracks, collapsible sections. Fully controlled, zero
        runtime dependencies.
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
      <HeroPoster />
      <section className="catalog" id="components">
        {GROUPS.map((g) => {
          const items = pages.filter((p) => p.group === g.id);
          return (
            <div className="catalog-group" key={g.id}>
              <h2 className="catalog-tier">
                {g.label}
                <span className="tier-code">
                  {TIER_CODE[g.id]} · {items.length}
                </span>
              </h2>
              <ul className="catalog-list">
                {items.map((p, i) => (
                  <li key={p.slug}>
                    <a className="catalog-row" href={`#/${p.group}/${p.slug}`}>
                      <span className="catalog-code">
                        {TIER_CODE[g.id]}
                        {i + 1}
                      </span>
                      <span className="catalog-name">{p.name}</span>
                      <span className="catalog-desc">{p.summary}</span>
                      <span className="catalog-go" aria-hidden="true">
                        →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="home-quickstart">
        <h2>Get started</h2>
        <pre className="code">
          <code>{INSTALL_CMD}</code>
        </pre>
        <pre className="code">
          <code>{`import 'pretty-panels/styles.css';\nimport { Panel, Slider } from 'pretty-panels';`}</code>
        </pre>
      </section>
    </article>
  );
}
