![PrettyPanels](demo/logo.svg)

A lightweight, themeable React component library for control-panel UIs.

**[Full documentation →](https://lucaskellyc.github.io/pretty-panels/)**

- **16 components**, 0 runtime dependencies (React is a peer dep).
- **Desktop chrome** on an opt-in subpath — frosted titlebar capsules, window
  controls and an app shell for a frameless Electron window.
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

### Fonts

The stylesheet ships its own IBM Plex Sans and JetBrains Mono (latin subsets,
upright, only the weights the tokens name) and loads them from `dist/fonts/`
beside it. Nothing is fetched at runtime — a hosted `@import` fails silently
under a desktop app's `default-src 'self'` CSP and offline, and the only symptom
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

Grouped by tier and family, mirroring the documentation site — atoms are single
controls, molecules are closed sets of peers, organisms host content of yours.
Alphabetical within each family.

**Atoms · Buttons**

| Component    | What it is                                                           |
| ------------ | -------------------------------------------------------------------- |
| `IconButton` | Round icon button. An action, or `mode="toggle"` for an on/off state. |
| `TextButton` | Capsule text button with an optional leading icon; same two modes.   |

**Atoms · Choices**

| Component    | What it is                                           |
| ------------ | ---------------------------------------------------- |
| `RadioGroup` | Row of dot-and-label choices over real radio inputs. |
| `Select`     | Native `<select>` restyled as a track capsule.       |
| `Toggle`     | Capsule on/off switch with optional label + hint.    |

**Atoms · Monitors**

| Component | What it is                                                   |
| --------- | ------------------------------------------------------------ |
| `Gauge`   | Read-only 270° arc gauge with a tabular readout and caption. |
| `Readout` | Capsule that states a value and nothing else — nothing to touch. |

**Atoms · Values**

| Component   | What it is                                                           |
| ----------- | -------------------------------------------------------------------- |
| `Slider`    | Label + value + capsule track; pointer-capture drag, keyboard arrows. |
| `Stepper`   | −/+ around a readout; bounds disable the buttons, double-click types. |
| `TextField` | Track capsule for free-form entry, set in the mono face.              |
| `Vector`    | 2–4 fused numeric fields; drag-to-scrub, optional color mode.         |

**Molecules · Structures**

| Component | What it is                                                              |
| --------- | ----------------------------------------------------------------------- |
| `List`    | Stack of capsule rows with a mono readout pinned right; optionally reorderable. |
| `Table`   | `List`'s rows arranged by column; opt-in sortable headings, mono numeric columns. |
| `Tree`    | `List`'s rows arranged by depth; a drag picks both the gap and the depth. |

**Molecules · Groups**

| Component        | What it is                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `GaugeRow`       | Evenly-spaced strip of `Gauge` dials.                               |
| `Platter`        | Capsule tray of icon / text buttons, row or column. `mode="select"` makes it one choice instead of many. |
| `WindowControls` | Minimize, zoom and close as a capsule of rings; order per platform. |

**Molecules · Layout**

| Component  | What it is                                                   |
| ---------- | ------------------------------------------------------------ |
| `Section`  | Collapsible titled section (smooth wipe).                    |
| `Tabs`     | Capsule tab strip; flush plate header via `Panel`'s `title`. |

**Organisms · Surfaces**

| Component | What it is                                                                 |
| --------- | -------------------------------------------------------------------------- |
| `Panel`   | Plate with optional header + padded body; collapsibly folds its body away. |
| `Toolbar` | Surfaceless row for `Platter`s and `Readout`s: controls lead, status pins to the end. |

**Organisms · Window**

| Component  | What it is                                                                   |
| ---------- | ---------------------------------------------------------------------------- |
| `AppShell` | The window a desktop app fills: a stage under floating chrome, and nothing else. |
| `TitleBar` | Frameless-window chrome as frosted capsules; folds its slots away when narrow. |

`AppShell`, `TitleBar` and `WindowControls` ship on the `pretty-panels/window`
subpath rather than the root export — see [Desktop (Electron)](#desktop-electron).
`WindowControls` files as a molecule despite that address: it is a closed set of
peer buttons like `Platter`, where the two organisms beside it exist to hold
content of yours.

All prop types are exported (e.g. `SliderProps`, `PanelProps`).

## Desktop (Electron)

The kit draws its own window chrome, so a frameless Electron window can be built
out of the same parts as the panels inside it. It is an opt-in subpath — the root
import and `styles.css` are unchanged, and a web app never sees any of it.

The chrome is a strip of **frosted capsules floating over the app**, not a bar:
`TitleBar` is absolutely positioned and reserves no room, so the window runs
full-bleed to its own top edge and the glass has something to blur. The window
controls are rings at rest — hovering the capsule fills all three and fades their
glyphs in, the trade the system lights make. On macOS those rings carry the
system's red, amber and green; pass `graphite` for the monochrome set. Anything
that must start clear of the capsules reads their height off `--titlebar-h`.

**The strip never spills.** Narrow the window past the point where the capsules
fit and `TitleBar`'s `left` / `right` slots fold into a single ellipsis button at
the trailing end, opening as a sheet underneath. The window controls are not part
of that: they keep their platform side and never collapse. This is also why
`AppShell` has no status bar — a strip along the bottom of the window is the
furthest point from the work, and these two slots say the same thing beside the
title, with the overflow behaviour for free.

```tsx
import { AppShell, TitleBar } from 'pretty-panels/window';
import { useWindowState } from 'pretty-panels/electron';

function Chrome() {
  const win = useWindowState();
  return (
    <TitleBar
      title="Workbench"
      platform={win.platform}
      maximized={win.maximized}
      fullscreen={win.fullscreen}
      inactive={!win.focused}
      onMinimize={win.minimize}
      onMaximize={win.toggleMaximize}
      onClose={win.close}
      onTitleDoubleClick={win.titleDoubleClick}
    />
  );
}
```

```js
// main.cjs
const { attachWindowBridge, panelWindowOptions } = require('pretty-panels/main');

const win = new BrowserWindow(panelWindowOptions({
  webPreferences: { preload: require.resolve('pretty-panels/preload') },
}));
attachWindowBridge(win);
```

That is the whole integration. A runnable version is in
[`examples/electron/`](examples/electron).

| Entry | Runs in | What it is |
| --- | --- | --- |
| `pretty-panels/window` | renderer | `TitleBar`, `WindowControls`, `AppShell` — presentational, no `electron` import |
| `pretty-panels/electron` | renderer | `useWindowState()`, `useNativeTheme()` — read the preload bridge |
| `pretty-panels/preload` | preload | point `webPreferences.preload` at this file; loading it mounts the bridge |
| `pretty-panels/main` | main | `panelWindowOptions()`, `attachWindowBridge()`, `stageColor()` / `plateColor()` |

`electron` is an **optional** peer dependency: only the preload and main entries
touch it, and a web install never resolves them.

**The components work without Electron.** `useWindowState()` returns inert
defaults when no bridge is mounted, so the same tree renders in a browser — which
is how the documentation site shows it.

**Custom controls on macOS mean `frame: false`**, which also drops the native
traffic lights, double-click-to-zoom and the green fullscreen button.
`attachWindowBridge` restores the first two (the double-click honours the user's
`AppleActionOnDoubleClick` setting). To keep the native lights, create the window
with `{ frame: true, titleBarStyle: 'hidden' }` and render
`<TitleBar controls="native">`, which reserves their space instead of drawing
buttons.

**`AppShell` fills the viewport**, so the host document must not inset it — a
desktop app resets `html, body, #root` to `margin: 0; height: 100%`. The kit
won't do it for you: `base.css` deliberately keeps its reset off the host page.

**The preload must be pointed at, not imported.** A sandboxed preload — the
default since Electron 20 — can only `require` `electron` and a few Node
builtins, so `require('pretty-panels/preload')` from your own preload throws
unless you bundle it. `require.resolve` the file instead, and the bridge mounts
itself.

## Develop

```bash
npm install
npm run dev          # run the demo / docs site locally
npm run build        # build the library into dist/
npm run build:demo   # build the docs site into dist-demo/ (GitHub Pages)
npm run typecheck    # tsc --noEmit
```

`electron` is a devDependency for its **types** only — `pretty-panels/preload`
and `pretty-panels/main` are typechecked against them. Current versions ship no
install script, so nothing large is downloaded; on an older line, prefix the
install with `ELECTRON_SKIP_BINARY_DOWNLOAD=1` to keep it that way. The runnable
app under `examples/electron/` installs its own Electron, binary included, and
is deliberately outside this repo's CI.

The demo under `demo/` doubles as the documentation site and is deployed to
GitHub Pages by `.github/workflows/pages.yml` on every push to `stable`.
Work lands on `unstable`, which runs CI but deliberately does not redeploy
the site; `stable` is merged forward at each release.

## License

MIT © Kelly
