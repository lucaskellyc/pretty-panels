![PrettyPanels](demo/logo.svg)

A lightweight, themeable React component library for control-panel UIs.

**[Full documentation →](https://lucaskellyc.github.io/pretty-panels/)**

- **25 components**, 0 runtime dependencies (React is a peer dep).
- **Fully controlled** — you own the state; every component is a pure function of props.
- Ships an ESM + CJS bundle, TypeScript types, and one stylesheet.

## Contents

- [Install](#install)
- [Usage](#usage)
- [Theming](#theming) — [dark mode](#dark-mode), [fonts](#fonts), [scoping](#scoping)
- [Components](#components)
- [Roadmap](#roadmap)
- [Develop](#develop)
- [License](#license)

## Install

```bash
npm install github:lucaskellyc/pretty-panels
```

## Usage

Import the stylesheet once (anywhere in your app), then use the components:

```tsx
import 'pretty-panels/styles.css';
import { Panel, Slider, Toggle } from 'pretty-panels';

function Controls() {
  const [focus, setFocus] = useState(42);
  const [grid, setGrid] = useState(true);

  return (
    <Panel title="Camera">
      <Slider label="focus" value={focus} min={0} max={100} step={1} onChange={setFocus} />
      <Toggle checked={grid} onChange={setGrid} label="Grid" hint="Reference floor grid" />
    </Panel>
  );
}
```

## Theming

There is one theme, **mono** — a monochrome workbench. Every control surface is
the same hue and saturation at a different lightness, so the whole panel is
dialled from three knobs instead of a hand-picked palette:

```css
:root {
  --mono-h: 194;   /* hue, 0–360                          */
  --mono-s: 14%;   /* saturation, 0%–60% (0% = true grey) */
  --mono-l: 12;    /* lightness of the panel plate, 0–100 */
}
```

Lightness is the interesting one. Most tokens are the plate lightness minus a
fixed offset, and a fourth knob — `--mono-sgn` — decides which way those offsets
run. It derives itself from `--mono-l`, flipping at 50, so the ramp reverses on
its own when the plate goes dark: sections stay recessed, text stays legible,
and the same numbers serve both polarities. Set `--mono-l: 90` for a light panel
and everything else follows. `--mono-sgn` is overridable (`1` or `-1`) but
rarely worth it — forcing it against the plate lightness runs the whole ramp off
the end and crushes every token to black or white.

The capsule surfaces are the exception. `--ctl-track`, `--ctl-accent` and their
hover variants are pinned to fixed lightnesses rather than riding the plate,
because the labels on them (`--ctl-on-track`) are pinned bright in both
polarities — white-on-track is the design language. A pinned text colour needs a
ground that stays deep, so those five tokens take hue and saturation from the
knobs but keep their own lightness. It means capsules look much the same on a
light plate as a dark one: the plate changes, the hardware on it doesn't.

Value fields are the one capsule that switches sides. `TextField`, `Vector`,
`Stepper`, `Slider` and `Select` use `--ctl-field`, `--ctl-field-hover`, `--ctl-field-deep-hover` and
`--ctl-field-text`. On a dark plate they match the pinned track with white text,
and on a light plate they ride the ramp with dark text, because a value you
read closely shouldn't be the weakest pairing in the set. A `Vector` in
`colorMode` ignores them and paints its own colors, and a `Slider`'s text
turns white wherever the accent fill sits under it.

Useful range for `--mono-l` is **0–30 or 66–95**. Between those the plate sits
near mid-grey, both ends of the ramp clamp toward the middle, and tab labels
drop below 4.5:1 contrast; above 95 the hint text does the same.

### Dark mode

Panels follow the OS dark preference out of the box. Because `--mono-sgn`
re-polarises the ramp on its own, the entire dark theme is one number — same
hue, same saturation, lower plate:

```css
@media (prefers-color-scheme: dark) {
  :root { --mono-l: 5; }
}
```

Setting `--mono-l` yourself in a stylesheet that loads after this one wins in
both schemes, which is how you opt out and pin a single fixed appearance.

### Fonts

The stylesheet ships its own IBM Plex Sans and JetBrains Mono (latin subsets,
upright, only the weights the tokens name) and loads them from `dist/fonts/`
beside it. Nothing is fetched at runtime — a hosted `@import` fails silently
under a strict `default-src 'self'` CSP and offline, and the only symptom
is that every label quietly renders in the system face. Every token stack still
falls back to system fonts, so dropping the faces costs you nothing but the
brand.

### Scoping

The knobs resolve where the `--ctl-*` set is *declared*, so re-dialling a
subtree needs the `data-mono` marker — it re-runs the ramp on that element from
whatever knobs it inherits or sets:

```html
<div data-mono style="--mono-h: 20">   <!-- warm panels, same lightness -->
```

Below the ramp, everything the components paint with comes from the `--ctl-*`
properties it generates (see `src/styles/colors.css`). Those inherit normally —
override one on any subtree, no marker needed:

```css
.danger-zone {
  --ctl-accent: #ff5f52;   /* one accent, this subtree only */
}
```

## Components

Grouped by family, mirroring the documentation site. Alphabetical within each
family.

**Buttons**

| Component    | What it is                                                           |
| ------------ | -------------------------------------------------------------------- |
| `IconButton` | Round icon button. An action, or `mode="toggle"` for an on/off state. |
| `TextButton` | Capsule text button with an optional leading icon; same two modes.   |

**Choices**

| Component    | What it is                                           |
| ------------ | ---------------------------------------------------- |
| `RadioGroup` | Row of dot-and-label choices over real radio inputs. |
| `Select`     | Track capsule that opens its choices as a `Menu`.    |
| `Toggle`     | Capsule on/off switch with optional label + hint.    |

**Glyphs**

| Component | What it is                                                                  |
| --------- | --------------------------------------------------------------------------- |
| `Icon`    | A glyph from the kit's own set, by name. Solid, 16px, inked in `currentColor`. |

**Groups**

| Component  | What it is                                                                |
| ---------- | ------------------------------------------------------------------------- |
| `GaugeRow` | Evenly-spaced strip of `Gauge` dials.                                     |
| `Menu`     | Commands on a floating sheet: a context menu, or the menu a `⋯` button opens. Ticks, keystroke hints, the ARIA keyboard. |
| `Platter`  | Capsule tray of icon / text buttons, row or column. `mode="single"` makes it one choice instead of many. |

**Layout**

| Component  | What it is                                                   |
| ---------- | ------------------------------------------------------------ |
| `Section`  | Collapsible titled section (smooth wipe).                    |
| `Tabs`     | Capsule tab strip; flush plate header via `Panel`'s `title`. |

**Monitors**

| Component | What it is                                                   |
| --------- | ------------------------------------------------------------ |
| `Gauge`   | Read-only 270° arc gauge with a tabular readout and caption. |
| `ProgressBar` | Recessed capsule that fills; candy-stripes once full, or runs indeterminate. |
| `Readout` | Capsule that states a value and nothing else — nothing to touch. |

**Structures**

| Component | What it is                                                              |
| --------- | ----------------------------------------------------------------------- |
| `List`    | Stack of capsule rows with a mono readout pinned right; optionally reorderable. |
| `Table`   | `List`'s rows arranged by column; opt-in sortable headings, mono numeric columns. |
| `Tree`    | `List`'s rows arranged by depth; a drag picks both the gap and the depth. |

**Surfaces**

| Component | What it is                                                                 |
| --------- | -------------------------------------------------------------------------- |
| `Panel`   | Plate with optional header + padded body; collapsibly folds its body away. |
| `Popover` | A surface that floats over the work, anchored to an element or to a point. Holds anything; stays on screen; dismisses itself. |
| `SplashScreen` | Startup banner: artwork edge to edge, the app's mark, name and version, and a line of loading status. Fades itself out. |
| `Toolbar` | Surfaceless row for `Platter`s and `Readout`s: controls lead, status pins to the end. Folds what doesn't fit into a `⋯`. |

**Values**

| Component   | What it is                                                           |
| ----------- | -------------------------------------------------------------------- |
| `Slider`    | Label + value + capsule track; relative drag, click to type, keyboard arrows. |
| `Stepper`   | −/+ around a readout; bounds disable the buttons, click the value to type. |
| `TextField` | Track capsule for free-form entry, set in the mono face.              |
| `Vector`    | 2–4 fused numeric fields; drag-to-scrub, optional color mode.         |

All prop types are exported (e.g. `SliderProps`, `PanelProps`).

## Roadmap

Shipped, and what's next. Each open item links to its issue.

- [x] Touch-screen support across components ([#2](https://github.com/lucaskellyc/pretty-panels/issues/2))
- [x] Nothing clipped on phones: controls wrap at 320px and up ([#6](https://github.com/lucaskellyc/pretty-panels/issues/6))
- [x] Overflow `⋯` button, `Popover` and `Menu` ([#7](https://github.com/lucaskellyc/pretty-panels/issues/7))
- [x] `Icon`, `ProgressBar` and `SplashScreen`; a controllable `Section`
- [ ] Forward refs on every component ([#11](https://github.com/lucaskellyc/pretty-panels/issues/11))
- [ ] `Slider` reads its formatted value in Chrome ([#12](https://github.com/lucaskellyc/pretty-panels/issues/12))
- [ ] An automated test suite ([#10](https://github.com/lucaskellyc/pretty-panels/issues/10))
- [ ] Pillotalk Studio on a phone, not just a note that it needs more room ([#13](https://github.com/lucaskellyc/pretty-panels/issues/13))
- [ ] v1.0: a frozen API and a stable changelog cadence

## Develop

```bash
npm install
npm run dev          # run the demo / docs site locally
npm run build        # build the library into dist/
npm run build:demo   # build the docs site into dist-demo/ (GitHub Pages)
npm run typecheck    # tsc --noEmit
npm test             # vitest, headless (jsdom); `npm run test:watch` to keep it running
```

Tests sit beside their components as `src/components/*.test.tsx` and cover
the behaviour a browser check would — keys, pointer drags, what a screen
reader is told — so a regression there fails CI rather than waiting to be
noticed by hand.

The demo under `demo/` doubles as the documentation site and is deployed to
GitHub Pages by `.github/workflows/pages.yml` on every push to `stable`.
Work lands on `unstable`, which runs CI but deliberately does not redeploy
the site; `stable` is merged forward at each release.

`npm install` runs the library build through `prepare`, so that
`npm install github:lucaskellyc/pretty-panels` ships `dist/`; expect a few
extra seconds when installing dev dependencies too.

Bugs and rough edges are tracked as
[GitHub issues](https://github.com/lucaskellyc/pretty-panels/issues).

## License

MIT © Kelly
