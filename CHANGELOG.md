# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version stays below `1.0.0` the minor slot carries breaking changes as
well as features, so read the **Changed** notes before bumping a minor.

## [Unreleased]

Desktop window chrome (`AppShell`, `TitleBar`, `WindowControls`) on a
`pretty-panels/window` subpath, the Electron integration behind
`pretty-panels/electron`, `pretty-panels/preload` and `pretty-panels/main`, and
a `Splitter` layout component. None of these have shipped in a release yet.

## [0.3.0-alpha] — 2026-09-24

Five new components, and the stylesheet stops reaching for the network.

### Added

- **`List`** — a stack of capsule rows with a mono readout pinned right.
  Optionally reorderable.
- **`Table`** — `List`'s rows arranged by column, with opt-in sortable headings
  and mono numeric columns.
- **`Tree`** — `List`'s rows arranged by depth, where a drag picks both the gap
  and the destination depth. Optionally reorderable.
- **`Readout`** — a capsule that states a value and nothing else; an atom beside
  `Gauge` under Monitors.
- **`Toolbar`** — a surfaceless row for `Platter`s and `Readout`s: controls lead,
  status pins to the end.
- **`mode="toggle"`** on `IconButton` and `TextButton`, turning either into an
  on/off control that reports through `onChange` instead of `onClick`.
- **`mode="select"`** on `Platter`, making the tray one exclusive choice rather
  than a set of independent buttons. `PlatterItem` gains an optional `value`,
  which is what `onChange` reports.
- Vendored **IBM Plex Sans and JetBrains Mono** (latin subsets, upright, only the
  weights the tokens name), emitted to `dist/fonts/` beside the stylesheet.

### Changed

- **Fonts are no longer fetched at runtime.** The hosted `@import` is gone. It
  failed silently under a desktop app's `default-src 'self'` CSP and offline,
  and the only symptom was every label quietly rendering in the system face.
  Token stacks still fall back to system fonts, so dropping the faces costs
  nothing but the brand.

  `src/styles/index.css` deliberately does not import `fonts.css`: Vite's
  library mode inlines every asset a stylesheet references with no way to opt
  out, which would base64 all eleven files into the bundle and take it from
  ~19 kB to ~330 kB. The `pretty-panels:vendor-fonts` plugin in `vite.config.ts`
  copies the files and prepends the `@font-face` rules at build time instead.

- **`IconButtonProps`, `TextButtonProps` and `PlatterProps` are now union types**
  rather than interfaces, discriminated on `mode`. Existing usage compiles
  unchanged, and no prop was removed or renamed — but `interface Mine extends
  IconButtonProps` no longer type-checks, because a union cannot be extended.
  Use `type Mine = IconButtonProps & { … }`, or target one arm directly through
  the new `IconButtonStandardProps` / `IconButtonToggleProps` exports (and their
  `TextButton` / `Platter` equivalents).

- Shared `clamp` / `cx` / `decimalsOf` helpers moved to an internal
  `components/util.ts` that seventeen components now import instead of
  redeclaring them. Internal only; nothing about it is exported from the
  package.

### Notes

- `ListRow` backs `List`, `Table` and `Tree` but is intentionally **not**
  exported — it is an implementation detail, not a public component.
- Repository only: design-sync configuration, conventions and per-component
  docs and previews now live under `.design-sync/`.

## [0.2.0-alpha] — 2026-09-14

### Added

- Seven new components: `Gauge`, `GaugeRow`, `RadioGroup`, `Select`, `Stepper`,
  `Tabs` and `TextField`. (An eighth, `ControlRow`, exists internally and is not
  exported.)

### Changed

- The hand-picked palette is replaced by the generative **mono** ramp, dialled
  from `--mono-h` / `--mono-s` / `--mono-l`, with `--mono-sgn` reversing the
  offsets on its own when the plate goes dark.
- `Platter` hover moves to `--ctl-deep-hover`.

### Fixed

- **Contrast.** The light plate failed WCAG AA on 17 of 25 text pairs: the five
  capsule grounds rode the plate, so on a light plate they landed mid-grey and
  capsule labels fell to ~3.3:1, with hover reaching 2.7:1. Those grounds are
  now pinned to fixed lightnesses and take only hue and saturation from the
  knobs. All 24 text pairs clear AA in both polarities, tightest 4.90, with no
  non-text pair regressed.
- Nine `--webkit-user-select` typos that declared no-op custom properties, an
  undeclared `--doc-shadow` that left the hero spec pills shadowless, and
  `-webkit-border-*-spacing` with no standard fallback.

### Removed

- Nine dead tokens, the unused `.divider` rule, a redundant
  `.tab[aria-selected]:hover` rule, and dead `border-color` on borderless
  buttons.

## [0.1.0-alpha] — 2026-08-19

### Added

- First release: `Panel`, `Section`, `Slider`, `Vector`, `Toggle`, `IconButton`,
  `TextButton` and `Platter`, shipped as ESM + CJS bundles with TypeScript types
  and a single extracted stylesheet.

[Unreleased]: https://github.com/lucaskellyc/pretty-panels/compare/v0.3.0-alpha...HEAD
[0.3.0-alpha]: https://github.com/lucaskellyc/pretty-panels/compare/v0.2.0-alpha...v0.3.0-alpha
[0.2.0-alpha]: https://github.com/lucaskellyc/pretty-panels/compare/v0.1.0-alpha...v0.2.0-alpha
[0.1.0-alpha]: https://github.com/lucaskellyc/pretty-panels/releases/tag/v0.1.0-alpha
