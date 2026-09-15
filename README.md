![PrettyPanels](demo/logo.svg)

A lightweight, themeable React component library for control-panel UIs.

**[Full documentation →](https://lucaskellyc.github.io/pretty-panels/)**

- **15 components**, 0 runtime dependencies (React is a peer dep).
- **Fully controlled** — you own the state; every component is a pure function of props.
- Ships an ESM + CJS bundle, TypeScript types, and one stylesheet.

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

Grouped by kind, mirroring the documentation site. Atoms are filed by what the
part does; everything is alphabetical within its group.

**Atoms · Buttons**

| Component    | What it is                                                           |
| ------------ | -------------------------------------------------------------------- |
| `IconButton` | Round icon button with an accent `active` state.                     |
| `TextButton` | Capsule text button with an optional leading icon + accent `active`. |

**Atoms · Choices**

| Component    | What it is                                           |
| ------------ | ---------------------------------------------------- |
| `RadioGroup` | Row of dot-and-label choices over real radio inputs. |
| `Select`     | Native `<select>` restyled as a track capsule.       |
| `Toggle`     | Capsule on/off switch with optional label + hint.    |

**Atoms · Readouts**

| Component | What it is                                                   |
| --------- | ------------------------------------------------------------ |
| `Gauge`   | Read-only 270° arc gauge with a tabular readout and caption. |

**Atoms · Values**

| Component   | What it is                                                           |
| ----------- | -------------------------------------------------------------------- |
| `Slider`    | Label + value + capsule track; pointer-capture drag, keyboard arrows. |
| `Stepper`   | −/+ around a readout; bounds disable the buttons, double-click types. |
| `TextField` | Track capsule for free-form entry, set in the mono face.              |
| `Vector`    | 2–4 fused numeric fields; drag-to-scrub, optional color mode.         |

**Molecules**

| Component  | What it is                                                   |
| ---------- | ------------------------------------------------------------ |
| `GaugeRow` | Evenly-spaced strip of `Gauge` dials.                        |
| `Platter`  | Capsule tray of icon / text buttons, row or column.          |
| `Section`  | Collapsible titled section (smooth wipe).                    |
| `Tabs`     | Capsule tab strip; flush plate header via `Panel`'s `title`. |

**Organisms**

| Component | What it is                                                                 |
| --------- | -------------------------------------------------------------------------- |
| `Panel`   | Plate with optional header + padded body; collapsibly folds its body away. |

All prop types are exported (e.g. `SliderProps`, `PanelProps`).

## Develop

```bash
npm install
npm run dev          # run the demo / docs site locally
npm run build        # build the library into dist/
npm run build:demo   # build the docs site into dist-demo/ (GitHub Pages)
npm run typecheck    # tsc --noEmit
```

The demo under `demo/` doubles as the documentation site and is deployed to
GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

## License

MIT © Kelly
