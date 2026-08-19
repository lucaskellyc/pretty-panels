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
      {/* Placeholder — point this at the real repo once it's published. */}
      <a
        className="doc-footer-link"
        href="https://github.com/pretty-panels/pretty-panels"
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
              <span className="brand-badge">v0.1</span>
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

      <section className="doc-section">
        <h2>Example</h2>
        <div className="doc-example">
          <Example />
        </div>
      </section>

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

/** The install command — shown in the hero CTA and echoed in Get started. */
const INSTALL_CMD = 'npm install pretty-panels';

/** The home's primary call to action: copy the install command. Styled as a
 *  recessed track; the trailing label flips to "copied" briefly on success. */
function CopyInstall() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard blocked — the command stays visible to copy by hand. */
    }
  };
  return (
    <button
      type="button"
      className={`hero-cta${copied ? ' is-copied' : ''}`}
      onClick={copy}
      aria-label={`Copy install command: ${INSTALL_CMD}`}
    >
      <span className="cta-cmd">
        <span className="cta-prompt" aria-hidden="true">$</span> {INSTALL_CMD}
      </span>
      <span className="cta-copy">{copied ? 'copied' : 'copy'}</span>
    </button>
  );
}

/** The stacked pretty-panels monogram, as its glyph paths in a 131×120 user
 *  space. Kept as a constant so the mark's markup below stays legible. */
const MARK_PATHS = [
  "M7.446 30.076C6.06358 30.1167 4.964 31.2491 4.964 32.6321V52.195C4.964 53.5658 3.85277 54.677 2.482 54.677C1.11123 54.677 0 53.5658 0 52.195V4C0 1.79086 1.79086 0 4 0H7.957C9.22233 0 10.4147 0.170333 11.534 0.510998C12.702 0.851666 13.6997 1.43567 14.527 2.263C15.403 3.04167 16.0843 4.088 16.571 5.402C17.1063 6.66733 17.374 8.249 17.374 10.147V19.929C17.374 21.2917 17.1793 22.5813 16.79 23.798C16.4007 25.0147 15.7923 26.0853 14.965 27.01C14.1863 27.9347 13.1643 28.689 11.899 29.273C10.6337 29.8083 9.14933 30.076 7.446 30.076ZM7.665 3.942C6.17328 3.942 4.964 5.15128 4.964 6.643V23.8697C4.964 24.9873 5.89113 25.8819 7.008 25.842C8.71133 25.5987 10.0253 24.966 10.95 23.944C11.9233 22.922 12.41 21.3647 12.41 19.272V9.782C12.41 7.738 11.972 6.25367 11.096 5.329C10.2687 4.40433 9.125 3.942 7.665 3.942Z",
  "M41.4697 52.1582C41.4697 53.5433 40.3361 54.6603 38.9512 54.64C37.5948 54.62 36.5057 53.5148 36.5057 52.1582V35.77C36.5057 33.288 36.0434 31.4143 35.1187 30.149C34.2427 28.8837 33.0017 28.251 31.3957 28.251C30.1056 28.251 29.0597 29.2969 29.0597 30.587V52.1582C29.0597 53.5148 27.9706 54.62 26.6142 54.64C25.2293 54.6603 24.0957 53.5433 24.0957 52.1582V29.4555C24.0957 28.8306 23.5891 28.324 22.9642 28.324C22.3393 28.324 21.8327 27.8174 21.8327 27.1925V25.0025C21.8327 24.3776 22.3393 23.871 22.9642 23.871C23.5891 23.871 24.0957 23.3644 24.0957 22.7395V4.00001C24.0957 1.79087 25.8866 0 28.0957 0H32.4907C33.756 0 34.924 0.170333 35.9947 0.510998C37.114 0.851666 38.063 1.43567 38.8417 2.263C39.669 3.04167 40.3017 4.088 40.7397 5.402C41.2264 6.66733 41.4697 8.249 41.4697 10.147V17.958C41.4697 18.9313 41.3724 19.783 41.1777 20.513C40.983 21.243 40.691 21.9243 40.3017 22.557C39.9124 23.141 39.4014 23.7007 38.7687 24.236C37.8992 24.9048 38.1181 26.391 38.9615 27.0925C39.558 27.5886 40.0291 28.1937 40.3747 28.908C41.1047 30.4167 41.4697 32.7527 41.4697 35.916V52.1582ZM31.8337 4.161C30.3017 4.161 29.0597 5.40296 29.0597 6.935V21.389C29.0597 22.7195 30.1383 23.798 31.4687 23.798C34.8267 23.798 36.5057 21.7297 36.5057 17.593V10.95C36.5057 8.51667 36.1164 6.789 35.3377 5.767C34.559 4.69633 33.391 4.161 31.8337 4.161Z",
  "M60.8136 50.443C61.8601 50.3558 62.7846 51.1572 62.7846 52.2073V52.516C62.7846 53.5385 62.016 54.4025 60.9964 54.4795C60.7385 54.4989 60.4829 54.5161 60.2296 54.531C59.4509 54.5797 58.7209 54.604 58.0396 54.604C54.3896 54.604 51.8832 53.6063 50.5206 51.611C49.1579 49.6157 48.4766 46.793 48.4766 43.143V29.8205C48.4766 29.1956 47.97 28.689 47.3451 28.689C46.7202 28.689 46.2136 28.1824 46.2136 27.5575V25.5865C46.2136 24.9616 46.7202 24.455 47.3451 24.455C47.97 24.455 48.4766 23.9484 48.4766 23.3235V11.826C48.4766 7.49467 49.2066 4.453 50.6666 2.701C52.1266 0.900333 54.4626 0 57.6746 0C58.2586 0 58.9156 0 59.6456 0C59.8367 0 60.0329 0.00333716 60.2341 0.0100115C61.273 0.0444811 62.0546 0.932444 62.0546 1.97197C62.0546 3.18172 61.008 4.11586 59.7999 4.05258C59.3216 4.02753 58.8808 4.015 58.4776 4.015C57.2122 4.015 56.2389 4.18533 55.5576 4.526C54.8762 4.818 54.3652 5.28033 54.0246 5.913C53.7326 6.54566 53.5622 7.34867 53.5136 8.322C53.4649 9.29533 53.4406 10.439 53.4406 11.753V20.586C53.4406 22.7631 55.2055 24.528 57.3826 24.528H59.2441C60.3931 24.528 61.3246 25.4595 61.3246 26.6085C61.3246 27.7575 60.3931 28.689 59.2441 28.689H57.3826C55.2055 28.689 53.4406 30.4539 53.4406 32.631V43.216C53.4406 44.1893 53.4892 45.1383 53.5866 46.063C53.7326 46.939 54.0002 47.7177 54.3896 48.399C54.7789 49.0317 55.3629 49.5427 56.1416 49.932C56.9689 50.3213 58.0396 50.516 59.3536 50.516C59.7429 50.516 60.2296 50.4917 60.8136 50.443Z",
  "M77.2808 52.122C77.2808 53.4928 76.1695 54.604 74.7988 54.604C73.428 54.604 72.3168 53.4928 72.3168 52.122V7.4095C72.3168 5.73635 70.9604 4.38 69.2873 4.38H68.4478C67.2383 4.38 66.2578 3.3995 66.2578 2.19C66.2578 0.980497 67.2383 0 68.4478 0H81.0768C82.2863 0 83.2668 0.980497 83.2668 2.19C83.2668 3.3995 82.2863 4.38 81.0768 4.38H80.2738C78.6208 4.38 77.2808 5.72001 77.2808 7.373V52.122Z",
  "M97.812 52.122C97.812 53.4928 96.7008 54.604 95.33 54.604C93.9592 54.604 92.848 53.4928 92.848 52.122V7.4095C92.848 5.73635 91.4917 4.38 89.8185 4.38H88.979C87.7695 4.38 86.789 3.3995 86.789 2.19C86.789 0.980497 87.7695 0 88.979 0H101.608C102.818 0 103.798 0.980497 103.798 2.19C103.798 3.3995 102.818 4.38 101.608 4.38H100.805C99.152 4.38 97.812 5.72001 97.812 7.373V52.122Z",
  "M121.482 42.997V38.8907C121.482 38.0099 120.459 37.5225 119.657 37.887C119.171 38.0817 118.514 38.179 117.686 38.179C114.474 38.179 112.236 37.23 110.97 35.332C109.705 33.3853 109.072 30.4167 109.072 26.426V2.482C109.072 1.11123 110.183 0 111.554 0C112.925 0 114.036 1.11123 114.036 2.482V26.28C114.036 28.616 114.255 30.514 114.693 31.974C115.131 33.3853 116.129 34.091 117.686 34.091C119.341 34.091 120.387 33.3853 120.825 31.974C121.263 30.5627 121.482 28.689 121.482 26.353V2.482C121.482 1.11123 122.593 0 123.964 0C125.335 0 126.446 1.11123 126.446 2.482V42.778C126.446 46.9633 125.668 50.1023 124.11 52.195C122.553 54.2877 119.974 55.334 116.372 55.334C115.107 55.334 114.012 55.1393 113.087 54.75C112.524 54.513 111.844 54.2399 111.047 53.9307C110.102 53.5644 109.59 52.5363 109.882 51.5659C110.196 50.516 111.321 49.9511 112.38 50.2318C112.798 50.3425 113.204 50.4372 113.598 50.516C114.572 50.7107 115.399 50.808 116.08 50.808C117.297 50.808 118.27 50.6377 119 50.297C119.73 49.9563 120.266 49.4697 120.606 48.837C120.996 48.1557 121.239 47.3283 121.336 46.355C121.434 45.3817 121.482 44.2623 121.482 42.997Z",
  "M7.446 95.076C6.06358 95.1167 4.964 96.2491 4.964 97.6321V117.195C4.964 118.566 3.85277 119.677 2.482 119.677C1.11123 119.677 0 118.566 0 117.195V69C0 66.7909 1.79086 65 4 65H7.957C9.22233 65 10.4147 65.1703 11.534 65.511C12.702 65.8517 13.6997 66.4357 14.527 67.263C15.403 68.0417 16.0843 69.088 16.571 70.402C17.1063 71.6673 17.374 73.249 17.374 75.147V84.929C17.374 86.2917 17.1793 87.5813 16.79 88.798C16.4007 90.0147 15.7923 91.0853 14.965 92.01C14.1863 92.9347 13.1643 93.689 11.899 94.273C10.6337 94.8083 9.14933 95.076 7.446 95.076ZM7.665 68.942C6.17328 68.942 4.964 70.1513 4.964 71.643V88.8697C4.964 89.9873 5.89113 90.8819 7.008 90.842C8.71133 90.5987 10.0253 89.966 10.95 88.944C11.9233 87.922 12.41 86.3647 12.41 84.272V74.782C12.41 72.738 11.972 71.2537 11.096 70.329C10.2687 69.4043 9.125 68.942 7.665 68.942Z",
  "M21.8327 89.4915C21.8327 88.8666 22.3393 88.36 22.9642 88.36C23.5891 88.36 24.0957 87.8534 24.0957 87.2285V74.271C24.0957 71.351 24.85 69.015 26.3587 67.263C27.916 65.4623 30.0574 64.562 32.7827 64.562C34.0967 64.562 35.2647 64.8053 36.2867 65.292C37.3574 65.7787 38.282 66.46 39.0607 67.336C39.8394 68.212 40.4234 69.2583 40.8127 70.475C41.2507 71.643 41.4697 72.9083 41.4697 74.271V117.122C41.4697 118.493 40.3585 119.604 38.9877 119.604C37.6169 119.604 36.5057 118.493 36.5057 117.122V96.828C36.5057 94.7718 34.8389 93.105 32.7827 93.105C30.7265 93.105 29.0597 94.7718 29.0597 96.828V117.158C29.0597 118.543 27.9261 119.66 26.5412 119.64C25.1848 119.62 24.0957 118.515 24.0957 117.158V94.2365C24.0957 93.6116 23.5891 93.105 22.9642 93.105C22.3393 93.105 21.8327 92.5984 21.8327 91.9735V89.4915ZM29.0597 73.833V84.637C29.0597 86.6932 30.7265 88.36 32.7827 88.36C34.8389 88.36 36.5057 86.6932 36.5057 84.637V73.833C36.5057 71.9837 36.165 70.6697 35.4837 69.891C34.8024 69.1123 33.902 68.723 32.7827 68.723C31.566 68.723 30.6414 69.1123 30.0087 69.891C29.376 70.621 29.0597 71.935 29.0597 73.833Z",
  "M53.4406 117.122C53.4406 118.493 52.3293 119.604 50.9586 119.604C49.5878 119.604 48.4766 118.493 48.4766 117.122V67.2995C48.4766 66.0295 49.5061 65 50.7761 65H52.2417C52.7022 65 53.0756 65.3733 53.0756 65.8339C53.0756 66.5768 53.9829 66.9567 54.5491 66.4757C55.1783 65.9413 55.7335 65.5467 56.2146 65.292C57.0906 64.8053 58.0882 64.562 59.2076 64.562C61.0569 64.562 62.6142 65.2677 63.8796 66.679C65.1936 68.0417 65.8506 70.1343 65.8506 72.957V117.195C65.8506 118.566 64.7393 119.677 63.3686 119.677C61.9978 119.677 60.8866 118.566 60.8866 117.195V72.957C60.8866 71.789 60.6432 70.913 60.1566 70.329C59.6699 69.6963 59.0372 69.38 58.2586 69.38C56.9932 69.38 55.8739 69.9397 54.9006 71.059C53.9272 72.1783 53.4406 73.6383 53.4406 75.439V117.122Z",
  "M85.1944 115.443C86.241 115.356 87.1654 116.157 87.1654 117.207V117.516C87.1654 118.538 86.3969 119.402 85.3773 119.479C85.1194 119.499 84.8638 119.516 84.6104 119.531C83.8318 119.58 83.1018 119.604 82.4204 119.604C78.7704 119.604 76.2641 118.606 74.9014 116.611C73.5388 114.616 72.8574 111.793 72.8574 108.143V94.8205C72.8574 94.1956 72.3508 93.689 71.7259 93.689C71.101 93.689 70.5944 93.1824 70.5944 92.5575V90.5865C70.5944 89.9616 71.101 89.455 71.7259 89.455C72.3508 89.455 72.8574 88.9484 72.8574 88.3235V76.826C72.8574 72.4947 73.5874 69.453 75.0474 67.701C76.5074 65.9003 78.8434 65 82.0554 65C82.6394 65 83.2964 65 84.0264 65C84.2176 65 84.4137 65.0033 84.6149 65.01C85.6539 65.0445 86.4354 65.9324 86.4354 66.972C86.4354 68.1817 85.3889 69.1159 84.1808 69.0526C83.7024 69.0275 83.2616 69.015 82.8584 69.015C81.5931 69.015 80.6198 69.1853 79.9384 69.526C79.2571 69.818 78.7461 70.2803 78.4054 70.913C78.1134 71.5457 77.9431 72.3487 77.8944 73.322C77.8458 74.2953 77.8214 75.439 77.8214 76.753V85.586C77.8214 87.7631 79.5863 89.528 81.7634 89.528H83.6249C84.7739 89.528 85.7054 90.4595 85.7054 91.6085C85.7054 92.7575 84.774 93.689 83.6249 93.689H81.7634C79.5863 93.689 77.8214 95.4539 77.8214 97.631V108.216C77.8214 109.189 77.8701 110.138 77.9674 111.063C78.1134 111.939 78.3811 112.718 78.7704 113.399C79.1598 114.032 79.7438 114.543 80.5224 114.932C81.3498 115.321 82.4204 115.516 83.7344 115.516C84.1238 115.516 84.6104 115.492 85.1944 115.443Z",
  "M107.356 117.268C107.356 118.558 106.31 119.604 105.02 119.604H96.3906C94.1815 119.604 92.3906 117.813 92.3906 115.604V67.482C92.3906 66.1112 93.5019 65 94.8726 65C96.2434 65 97.3546 66.1112 97.3546 67.482V110.932C97.3546 113.141 99.1455 114.932 101.355 114.932H105.02C106.31 114.932 107.356 115.978 107.356 117.268Z",
  "M120.886 64.562C123.562 64.562 125.558 65.73 126.872 68.066C128.039 70.0249 128.706 73.0724 128.874 77.2086C128.922 78.4071 127.943 79.381 126.744 79.381C125.588 79.381 124.64 78.475 124.547 77.323C124.329 74.6274 123.985 72.6125 123.514 71.278C122.978 69.6233 122.078 68.796 120.813 68.796C119.742 68.796 118.89 69.3557 118.258 70.475C117.674 71.5457 117.382 73.1273 117.382 75.22C117.382 77.6047 117.698 79.6973 118.331 81.498C118.963 83.25 119.742 84.8803 120.667 86.389C121.591 87.849 122.589 89.2603 123.66 90.623C124.779 91.9857 125.801 93.47 126.726 95.076C127.65 96.6333 128.429 98.434 129.062 100.478C129.694 102.473 130.011 104.834 130.011 107.559C130.011 109.262 129.84 110.868 129.5 112.377C129.159 113.837 128.624 115.151 127.894 116.319C127.164 117.438 126.239 118.339 125.12 119.02C124.049 119.653 122.759 119.969 121.251 119.969C119.499 119.969 118.063 119.604 116.944 118.874C115.824 118.144 114.948 117.171 114.316 115.954C113.683 114.689 113.245 113.229 113.002 111.574C112.758 109.919 112.637 108.143 112.637 106.245V106.026C112.637 104.655 113.748 103.544 115.119 103.544C116.489 103.544 117.601 104.655 117.601 106.026V107.413C117.601 109.944 117.844 111.963 118.331 113.472C118.866 114.981 119.888 115.735 121.397 115.735C122.078 115.735 122.662 115.54 123.149 115.151C123.684 114.713 124.098 114.153 124.39 113.472C124.73 112.791 124.974 112.012 125.12 111.136C125.314 110.211 125.412 109.262 125.412 108.289C125.412 105.661 125.095 103.374 124.463 101.427C123.83 99.4317 123.027 97.6553 122.054 96.098C121.129 94.492 120.107 93.0077 118.988 91.645C117.868 90.2823 116.822 88.8953 115.849 87.484C114.924 86.024 114.145 84.491 113.513 82.885C112.88 81.2303 112.564 79.308 112.564 77.118C112.564 73.0787 113.245 69.9883 114.608 67.847C115.97 65.657 118.063 64.562 120.886 64.562Z",
];

/** Peak inset-highlight offset, in the mark's 131×120 user space. Small by
 *  design: the highlight reads as a lit edge on the letterforms, not a glow. */
const HIGHLIGHT_AMOUNT = 0.5;

/** The poster's logo: the stacked wordmark lit by a warm inset rim. The
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
  const feather = Math.max(0.3, HIGHLIGHT_AMOUNT * 0.5).toFixed(2);
  return (
    <div className="hero-mark">
      <svg viewBox="0 0 131 120" role="img" aria-label="pretty-panels">
        <defs>
          <filter id="hero-mark-hi" x="-25%" y="-25%" width="150%" height="150%">
            <feOffset in="SourceAlpha" dx={dx} dy={dy} result="sh" />
            <feFlood floodColor="#fff7e0" result="col" />
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

/** The hero — a poster plate. The stacked wordmark sits above a real
 *  pretty-panels Inspector whose two controls light the mark: a `highlight` toggle
 *  arming a warm inset rim, and an `angle` slider spinning its direction. The page
 *  IS the demo: a visitor is handling pretty-panels before reading a word about
 *  it. Tagline, install CTA, and the spec strip round out the card. */
function HeroPoster() {
  const [angle, setAngle] = useState(135);
  const [highlight, setHighlight] = useState(true);
  // Seeded to the mark's poster purple (#C792EA); the color vector repaints it live.
  const [color, setColor] = useState([199, 146, 234]);

  return (
    <section className="hero-poster" aria-label="pretty-panels live demo">
      <HeroMark angle={angle} highlight={highlight} color={color} />

      <Panel>
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

      <CopyInstall />

      <div className="hero-specs">


        <span>
          <b>{pages.length} components</b>
        </span>
        <span className="dot">·</span>
        <span>
          v0.1.0
        </span>
      </div>
    </section>
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
