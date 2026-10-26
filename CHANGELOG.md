# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version stays below `1.0.0` the minor slot carries breaking changes as
well as features, so read the **Changed** notes before bumping a minor.

## [Unreleased]

pretty-panels is a browser library now. The desktop window chrome and the
Electron integration that were in development alongside it are gone.

### Removed

- **The `pretty-panels/window`, `pretty-panels/electron`,
  `pretty-panels/preload` and `pretty-panels/main` subpaths**, and everything
  they exported: `AppShell`, `TitleBar`, `WindowControls` and `detectPlatform`;
  `useWindowState()`, `useNativeTheme()` and `getWindowBridge()`; the preload's
  `createWindowBridge()` and `exposeWindowBridge()`; and `panelWindowOptions()`,
  `attachWindowBridge()`, `stageColor()` and `plateColor()`. None of them were documented as released, but 0.3.x packages
  did carry these entries in `exports`, so an app importing any of them has to
  stop before upgrading. The root export and `styles.css` are unaffected.
- `electron` as an optional peer dependency, and the runnable app under
  `examples/electron/`.

### Fixed

- **`Vector` fields can be emptied while typing.** They were controlled
  `type="number"` inputs, which report an empty field — and a lone `-` or `1.` —
  as `""`, so deleting the last digit was ignored and the digit re-rendered
  straight back. They now hold their text while focused, the way `Stepper`'s
  readout does: in-range numbers are reported as they are typed, Enter or
  clicking away clamps and commits, an empty field falls back to the value it
  started on, and Escape restores it. Clamping no longer happens mid-entry, so
  a value below `min` on its way to a valid one (`2` → `25` with `min={10}`) is
  no longer snapped up. ArrowUp / ArrowDown still step by `step`.
- **Scrubbing a `Vector` field no longer scrolls the page or selects text on the
  way** ([#4](https://github.com/lucaskellyc/pretty-panels/issues/4)). Once a
  mouse drag passes 3px the cursor is locked to the field (Pointer Lock) and
  hidden until release, so it can't reach a screen edge or wander onto other
  controls; the value follows raw mouse travel. Where the lock is refused, the
  page still turns off selection and hover for the length of the drag. Fields
  take `touch-action: none`, so a touch drag scrubs instead of panning.
- **Panels no longer clip their controls on narrow screens**
  ([#6](https://github.com/lucaskellyc/pretty-panels/issues/6)). A
  `.switch-row` (`Toggle`, `TextField`, `RadioGroup`, `Stepper`, `Select`) whose label and
  control don't fit side by side now wraps, dropping the control to its own
  line, still right-aligned, instead of running past the plate's edge where
  `.panel-body` cut it off. The label gives up width first, so a row only wraps
  when even its longest word won't fit beside the control. A `GaugeRow` wraps
  too, and a `Vector`'s fields shrink from 58px when the capsule is wider than
  its row. Panels wide enough for their rows lay out exactly as before.
- **Controls no longer stay lit after a tap on a touch screen**
  ([#2](https://github.com/lucaskellyc/pretty-panels/issues/2)). A touch screen
  leaves the last-tapped element "hovered" until the next tap lands elsewhere,
  so buttons, tabs and platter segments held their hover ground after being
  pressed. Every hover style is now gated to `@media (hover: hover)`. On touch
  screens (`hover: none`) buttons, tabs, platter segments, stepper buttons and
  the panel collapse toggle show their hover ground while pressed (`:active`)
  instead, and drop the browser's rectangular tap flash. A `Tree` row's `⋯`
  button, which only appeared on hover, is always shown on touch screens.

### Changed

- `--stage-bg`, the ground an app's panels float on, moves from the removed
  window layer into `colors.css`, so it is still defined under the root
  stylesheet.

## [0.3.2-alpha] — 2026-10-17

Lighter capsule tracks, and Pillotalk Studio on the docs site. Nothing here is
breaking.

### Added

- **Pillotalk Studio, an app built on the kit, is served beside the docs** at
  `/pretty-panels/pillotalk-studio/` and linked from a new Experiments section
  on the home page. It is a font editor: import SVG glyphs, set weight, caps and
  spacing in a docked inspector, and export an `.otf`. It is a demo page, not
  part of the package — nothing under `src/` depends on it.

  Since its first cut it has gained a **Canvas** tab beside the glyph sheet (a
  fixed frame with a line of text set in the font: tracking, leading, staggered
  repeats and weight, and a write-on), **keyframes** on weight, width, offset
  and the new trim-paths controls, a **timeline** along the bottom that resizes
  and folds down to its transport, **Export as MP4** of the canvas over the
  timeline's work area, and Space to play and pause on the Canvas tab. The
  Preview panel is gone. Its capsules follow the plate's polarity — dark labels
  on pale tracks in light mode, white on deep ones in dark.

  `mediabunny` (WebCodecs encoding and MP4 muxing) joins opentype.js and
  clipper-lib as a devDependency for the docs build only, loaded the first time
  a video is exported.

### Changed

- **Capsule tracks are lighter.** `--ctl-track` goes from 38% to 54% lightness
  and `--ctl-track-hover` from 32% to 46%, so every capsule ground — `Slider`,
  `TextField`, `Select`, `Vector`, `Stepper`, the radio dots — reads as a
  mid-tone rather than a deep one, in both polarities. Hue and saturation still
  come from `--mono-h` / `--mono-s`.

  The labels on them are unchanged: `--ctl-on-track` is still pinned at 96%. On
  a grey ramp that takes white-on-track from about 5.6:1 down to about 3.2:1
  (4.2:1 on hover), under WCAG AA's 4.5:1 for small text. An app that needs AA
  can set `--ctl-track` / `--ctl-track-hover` back, or flip `--ctl-on-track` to
  dark on a light plate the way Pillotalk Studio does (above).

## [0.3.1-alpha] — 2026-09-26

A surface that floats over the work, the commands that usually go on it, and a
bar that folds away what it has no room for. Nothing here is breaking.

### Added

- **`Popover` and `Menu` — a surface that floats over the work, and the commands
  that usually go on it.** `Popover` is the mechanism: it hangs off an element
  (by ref, or in the hand) or off a viewport point, which is the context-menu
  case — a right-click has no element to open from, only the place it happened.
  From there it flips to the anchor's other side when the room runs out, shifts
  along the edge to stay inside the window, and caps itself to what is left, so
  a surface with nowhere to go scrolls instead of running off the screen.

  It floats in the browser's **top layer**, which is the part that could not be
  had by hand: `.panel` clips its plate and `Table` puts its rows in a scroller,
  so a menu opened on anything inside either would otherwise be cut off at the
  plate's edge. It gets there without a portal, so a `data-mono` subtree's tokens
  still reach it, the press that opened it is still inside it, and focus moves in
  and out of it in document order. Browsers with no Popover API fall back to
  `position: fixed` at `--z-overlay`. Dismissal is Escape or a press outside —
  and a press on the anchor is not "outside", so the button that opened a surface
  is the one that closes it.

  While it is up it marks its anchor with **`data-pp-anchored`**. That is what
  keeps a trigger drawn only on hover — a `Tree` row's `⋯` — on screen once its
  menu has taken the focus away from the row, rather than fading out and leaving
  the menu hanging off nothing; `.pp-list-more` keys off it, and so can a trigger
  of your own. A data attribute rather than `aria-expanded`, which is the
  trigger's own claim about itself and not a surface's to make.

  `Menu` is that surface holding commands: capsule rows on the sheet, an optional
  tick column (one checkable command opens it for the whole menu, so the labels
  stay on one rule), trailing keystroke hints in the mono face, `{ separator:
  true }` between runs, and the ARIA menu keyboard over all of it — arrows that
  wrap, Home / End, Enter and Space from the buttons themselves, Escape to
  dismiss and Tab to leave. `closeOnSelect={false}` keeps a menu of checkboxes up
  while several are set. Submenus are deliberately absent.

  Two components rather than one because they are two jobs. `Popover` says
  nothing about what floats — no `role`, no name — since a menu, a non-modal
  dialog and a tooltip want three different sets of semantics and a guess would
  be wrong two thirds of the time; the content brings its own, the way `Menu`
  puts `role="menu"` inside it.

- **`IconButton` and `TextButton` can be a trigger.** Both now forward a ref to
  their `<button>` — which is what a `Menu` or `Popover` anchors to — and both
  take **`aria-haspopup`** and **`aria-expanded`**, the trigger's half of the
  contract. A surface cannot set either one for you: it never sees the control
  that opened it, and without them a screen reader announces a plain button and
  never says the menu is open.

- **`Toolbar` folds what it has no room for.** The new **`overflow`** prop gives
  the bar the bargain the window strip already makes: items leave it from the
  trailing end, one at a time, into a `⋯` that opens them as a sheet — built on
  `Popover`, so the sheet stays on screen, dismisses on Escape or an outside
  press, and floats clear of whatever the bar is sitting in. **`overflowLabel`**
  names the button and the sheet.

  One item at a time rather than all or nothing, because a toolbar's contents are
  a list where a strip's are two slots — but an item folds *whole*: a `Platter`
  is one item however many segments are on it, since half a segmented control is
  not a control. **Nothing shrinks** to make room, which is the premise the count
  rests on: a squeezed `Platter` drops its labels and a squeezed `Readout`
  reports `19…`, so a bar out of room is better off taking items away than
  making them smaller. Each item's width is recorded while it is in the bar and
  kept after it leaves, filed under its key rather than its index — that stored
  number is the only one that can decide to put it back.

  `end` does not fold. It is what the bar *reports* rather than what it offers,
  and it already sits at the edge the sheet opens from, so folding it would trade
  a glance for a click — which makes the `⋯` plus whatever `end` holds the floor,
  and narrower than that the bar spills the way it always has. Pressing a button
  in the sheet closes it, the way the strip's does; anything you set rather than
  press — a slider, a toggle — leaves it up. A vertical bar folds against its
  height and so wants one: a column is otherwise as tall as its contents and
  never runs out of room, where a row fills its parent and always has a width.

  Off by default, and deliberately: a bar that spills, wraps or scrolls is a good
  answer too, and which one a layout wants is not this component's call. It also
  has a cost worth knowing about — folding an item moves it into the sheet, which
  re-mounts it, so anything holding state the DOM owns rather than your props
  loses it at the fold.

- **`Table` scrolls sideways when the plate is too narrow for it.** The rows now
  sit in a scroller of their own and hold a floor — so the squeeze falls on the
  plate rather than on the columns, and a row stays a whole capsule instead of
  going to ellipses everywhere at once or, where the declared widths already
  came to more than the plate, running past its edge with its rounded ends
  clipped off. The floor is built from `columns`: every `width` that was
  declared, plus `--pp-table-col-min` (112px) for each column that left it off.
  The new **`minWidth`** prop sets it yourself — a CSS length, or `'0'` for the
  old squeeze. While it is actually scrolling the scroller takes a tab stop, so
  the far columns are reachable without a pointer, and `label` names it as a
  region; a table that fits adds nothing to the tab order.

  The row stays a **whole capsule at every scroll position**. Its ground is no
  longer painted by the cells between them — a row that scrolls is cut square
  wherever the scrollport ends, and no cell can round an edge it doesn't know
  about. One zero-width cell leads each row and carries the capsule as a pseudo,
  pinned to the scrollport and exactly as wide as it, so the cut falls on the
  text instead of on the shape.

### Fixed

- **`Table` no longer overflows its container.** Its cells have always carried
  `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, but under
  the default `table-layout: auto` a column can never be narrower than its own
  content — so `width: 100%` was a preference, not a limit. A table of long
  values grew past the plate, a `Panel` clipped the rows' outer corners off, and
  the ellipsis never fired, because nothing ever asked a cell to shrink. It now
  lays out `fixed`. That is the table's `min-width: 0` — the same job the flex
  rule already does for a `List`'s label.

### Changed

- **`Tree`'s `onMore` also hands over the element to open a menu on**, as a
  second argument: the ⋯ button when the press came from the pointer, and the
  row itself when it came from the keyboard, where the ⋯ is not what was aimed
  at and is not even on screen yet. Additive — a handler that only wants the
  `id` still fits — and it is what turns the ⋯ from a reported press into a
  menu. The `Tree` example now opens a real `Menu` from it.
- **`.pp-table` and `.pp-table-scroll` are now a pair.** The row's ground
  measures the scroller as a container (`100cqi`), so hand-written table markup
  wants the wrapper too — the component renders it for you. Cells no longer
  carry a `background` or corner radii of their own; both moved to
  `.pp-table-ground`, the zero-width cell that leads every row.
- **`TableColumn.width` is now honoured exactly**, and the columns that leave it
  off split what is left over evenly, where before each took what its own
  content needed. This follows from the fixed layout above. Size the predictable
  columns — a count, a status — and let the open-ended one take the slack.

### Removed

- `Splitter`, which an earlier draft of this section named as coming. It never
  reached a release, so nothing that shipped is affected.

### Notes

- Still unreleased: desktop window chrome (`AppShell`, `TitleBar`,
  `WindowControls`) on a `pretty-panels/window` subpath, and the Electron
  integration behind `pretty-panels/electron`, `pretty-panels/preload` and
  `pretty-panels/main`.
- Docs site: the sidebar card's fill and shadow lived in a narrow-screen media
  block, so above it the card floated over the content with neither — one rule
  now paints it at every width. The overlay pages (`Menu`, `Popover`) join the
  catalogue, and `Toolbar`'s example gains a width slider to fold it with.
- Docs site: props-table descriptions hold a 40ch measure rather than absorbing
  whatever the other columns leave, so a long entry wraps to about three lines
  instead of six or seven and the table scrolls sideways instead of the row
  growing tall. Example wells and the page header drop their borders in favour
  of shadow and spacing.

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

[Unreleased]: https://github.com/lucaskellyc/pretty-panels/compare/v0.3.2-alpha...HEAD
[0.3.2-alpha]: https://github.com/lucaskellyc/pretty-panels/compare/v0.3.1-alpha...v0.3.2-alpha
[0.3.1-alpha]: https://github.com/lucaskellyc/pretty-panels/compare/v0.3.0-alpha...v0.3.1-alpha
[0.3.0-alpha]: https://github.com/lucaskellyc/pretty-panels/compare/v0.2.0-alpha...v0.3.0-alpha
[0.2.0-alpha]: https://github.com/lucaskellyc/pretty-panels/compare/v0.1.0-alpha...v0.2.0-alpha
[0.1.0-alpha]: https://github.com/lucaskellyc/pretty-panels/releases/tag/v0.1.0-alpha
