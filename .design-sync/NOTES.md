# design-sync notes — pretty-panels

## Shape: package (no Storybook)

- Confirmed with the user (2026-09-18): there is **no Storybook anywhere** for this
  repo — no `.storybook/`, no `*.stories.*`. `shape: "package"` is pinned in
  config.json; don't re-run detection.
- Component list comes from the shipped `dist/*.d.ts` exports: **15 components**.
  `src/components/ControlRow.tsx` exists but is **not exported** from `src/index.ts`,
  so it is correctly absent — that is not a discovery miss.
- The desktop chrome added 2026-09-22 (`TitleBar`, `WindowControls`, `AppShell`)
  is exported from `src/window.ts`, a **separate package entry**
  (`pretty-panels/window`), not from the root. Discovery reads the root entry, so
  the synced surface stays at 15 and none of the `docsMap` / `overrides` bookkeeping
  below changes. That was the point of putting them on a subpath: they are window
  chrome for a frameless Electron window, not control-panel atoms. If they should
  ever appear in the design project, point `--entry` at `dist/pretty-panels.window.js`
  as a second sync rather than re-exporting them from the root.

## Build

- `npm ci` alone is enough to produce `dist/` — the package has a `prepare` script
  (`npm run build` → `vite build`), so install builds it. `buildCmd` is recorded
  anyway for re-syncs that only touch source.
- `--entry ./dist/pretty-panels.js` (package.json `module`). The repo's own
  `node_modules` resolves react fine; no monorepo/scratch-dir workaround needed.

## CSS / tokens

- `cfg.cssEntry: "dist/pretty-panels.css"` is **required**. The ESM entry
  (`dist/pretty-panels.js`) contains **zero** CSS imports — vite extracts the CSS
  to a sibling file — so esbuild emits no `_ds_bundle.css` on its own and the
  bundle would ship unstyled without this.
- There is **no separate tokens package**, so `tokensPkg`/`tokensGlob` do not apply
  and `tokens/` in the bundle is empty by design. All 97 tokens are defined inside
  the compiled `dist/pretty-panels.css` and therefore reach designs through the
  `styles.css` → `_ds_bundle.css` closure. `tokens: 97 defined, 66 referenced` —
  no `[TOKENS_MISSING]`.
- **Fonts are now local** (changed 2026-09-22, when the Electron support landed).
  There is no Google Fonts `@import` any more: `src/styles/fonts/` holds 11
  woff2 subsets and `src/styles/fonts.css` declares the faces over them.
  `src/styles/index.css` does **not** import that file — Vite's library mode
  inlines every asset a stylesheet references, which would base64 the lot into
  the bundle — so the `pretty-panels:vendor-fonts` plugin in `vite.config.ts`
  copies the files to `dist/fonts/` and prepends the rules to
  `dist/pretty-panels.css` instead. The faces are therefore the first rules in
  the published CSS, with `url('./fonts/…')` relative to it.
- **Consequence for the bundle:** `cssEntry` copies only the stylesheet, so a DS
  bundle that does not also carry `dist/fonts/` renders in the fallback system
  faces. Same end state as the old remote `@import`, different cause.

## Known render warns

- `[FONT_REMOTE]` — "Cascadia Code", "Roboto Mono", and the rest of the fallback
  stacks. **Expected and correct** for those: they are system-font fallbacks
  named in the token stacks, with nothing to point at.
  "JetBrains Mono" and "IBM Plex Sans" are **no longer remote** — they ship as
  woff2 files in `dist/fonts/`. If a render check still warns about those two, it
  is because the bundle carried the stylesheet without that directory (see the
  CSS / tokens section), and `extraFonts` pointed at `src/styles/fonts/` is the
  right fix.
- `[RENDER_SKIPPED]` — see the verification note below. Expected on every run made
  with `--no-render-check`.

## Verification (IMPORTANT — this sync did not machine-verify)

- The user **declined the Playwright + chromium install** (2026-09-18, ~200MB),
  choosing "I'll check in my own browser". Consequences, all of them expected:
  - `package-validate.mjs` must be run with `--no-render-check`, and the driver
    likewise, or it fails `[RENDER_SKIPPED]`.
  - `package-capture.mjs` **cannot run at all** ("playwright not installed"), so
    `resync.mjs` always exits **1** with `ok: false` and all 15 components in
    `verification.pendingGrade`. That exit code reflects the missing grade stage,
    **not** a broken build — build and validate both succeed.
  - There are no `.grade.json` verdicts and no `_ds_sync.json`-anchored
    verified-by-upload skips of the usual kind. A future sync that installs
    playwright will grade all 15 for the first time.
- What replaced grading: the local `.review.html` served over
  `.ds-sync/storybook/http-serve.mjs`, reviewed by the user in their own browser.

## Previews (all 15 authored)

- Sources curated from the repo's **own** `demo/pages.tsx`, which carries an
  author-written canonical example for every component except `Panel`. Ported
  props verbatim where they still matched the shipped `.d.ts`.
- Authored as **static** cells: fixed values + a `noop` handler rather than
  `useState`, so each variant cell shows a deliberately different state instead of
  every cell rendering the same initial state.
- **Every preview wraps its cells in a `Panel width={320}`.** Two reasons: the
  plate is the honest context for this kit, and it guarantees a correct
  `--ctl-panel` ground regardless of the card's own background.
- Because of that fixed 320px plate, **`cardMode: "column"` is set for all 15** in
  `cfg.overrides`. This was applied *pre-emptively*, not in response to a
  `[GRID_OVERFLOW]` warn — with no render check there is no warn to react to. If a
  future sync does install playwright and grid checks come back clean, some of
  these could be relaxed to the default grid.
- `Vector.tsx` needs a labelled row; the repo's own `Row` helper depends on
  `demo/demo.css` (`.doc-row`), which never ships. Re-implemented with inline
  styles using real tokens (`--type-label`, `--ctl-text`).

## Grouping

- The repo has its **own** taxonomy in `demo/catalog.ts` (it lived in
  `demo/pages.tsx` until 2026-09-24, when the data was split out of the module
  holding the example components so the latter could Fast Refresh): tiers
  `atoms`/`molecules`/`organisms` plus families `Buttons`/`Choices`/`Readouts`/`Values`.
  The four family names are preserved verbatim as picker groups; `Layout` was added
  for the structural pieces (Panel, Section, Tabs) that carry no family upstream.
- Grouping is done with **frontmatter-only stubs** in `.design-sync/groups/<Name>.md`
  wired through `cfg.docsMap`. These are *not* real docs — they exist solely to set
  `category`. The `.prompt.md` bodies are still synthesized from the `.d.ts` +
  authored previews. If real per-component docs ever get written, point `docsDir`
  at them and delete the stubs.

## `rm -rf ds-bundle` before every build

Running the build repeatedly into an existing `ds-bundle/` **accumulates
duplicate vendor files**: after four runs `_vendor/` held `react.js`,
`react 2.js`, `react 3.js` (1.1 MB each) plus the matching `react-dom *.js`
stubs — 3.3 MB of junk that `_vendor/**` would have happily uploaded. A clean
build leaves exactly two files (`react.js`, `react-dom.js`) and a 1.5 MB bundle.
Always `rm -rf ds-bundle` first; the `[OUT_UNSAFE]` guard permits it because the
directory is a prior bundle, so nothing warns you.

## Re-sync risks — what can silently go stale

- **The 320px/`cardMode: column` decision** is tied to preview authoring, not to
  anything the converter measures. If the previews are ever rewritten without the
  Panel wrapper, revisit both together.
- **`Toolbar` is the 16th component** (added 2026-09-24, a row layout for
  `Platter`s and `Readout`s). The hazard flagged below was handled at the time:
  `.design-sync/groups/Toolbar.md` exists, and both `docsMap` and `overrides`
  carry an entry, so it groups under `Layout` rather than landing in `general`.
  The counts in `conventions.md` were moved to sixteen with it.
- **`Toolbar` was stripped to a surfaceless row** later the same day, on the
  user's call: background, `--ctl-panel` border, `--shadow-inset` and padding all
  removed, leaving flex + `gap`. It no longer carries a plate, so the grounds
  argument that originally justified `--ctl-panel` over `--ctl-bar` is gone from
  the CSS comment, `conventions.md`, the README row and the docs summary — all
  four asserted a plate and all four were rewritten. Its preview is still the one
  that **does not** wrap its cells in a `Panel`: that is now a *choice* rather
  than a necessity (a Panel wrapper would work fine on a surfaceless bar), kept
  because the `--stage-bg` wrapper shows the controls floating, which is the
  look the change was made for.
- **`docsMap` names all 16 components**, which the skill warns is normally a smell
  (it duplicates discovery and rots on every component add). Here it is deliberate
  — they are grouping stubs, not discovered docs — but **a 16th component will not
  get a group until someone adds its stub + docsMap entry**, and it will silently
  land in `general`.
- **Fonts are vendored, and the vendoring is a build plugin.** If
  `pretty-panels:vendor-fonts` is ever dropped from `vite.config.ts`, or
  `fonts.css` gets `@import`ed back into `index.css`, the published stylesheet
  silently either loses its faces or balloons to ~330 kB of base64. Check
  `dist/fonts/` exists and `dist/pretty-panels.css` opens with `@font-face`.
- **Grades do not exist yet** (see Verification). The first sync that installs
  playwright will re-grade everything from scratch — expect a long pass, not a
  fast carried-forward one.
- **Toolchain assumed**: node v22.18.0, npm lockfile v3, vite 5.4.x. The converter
  deps in `.ds-sync/` are installed separately from the repo's lockfile.
