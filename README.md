# pretty-panels

A tiny, themeable React component library of control-panel UI — plates,
capsule tracks, collapsible sections.

- **6 components**, ~0 runtime dependencies (React is a peer dep).
- **Fully controlled** — you own the state; every component is a pure function of props.
- **Soft light-gray look** — light plates, recessed capsule tracks, a warm gold accent.
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

Everything the components paint with comes from a set of `--ctl-*` custom
properties (see `src/styles/colors.css`). Override them in your own CSS — on
`:root` or any subtree — to retint every panel beneath:

```css
:root {
  --ctl-accent: #4d9eff;   /* swap the gold accent for blue */
  --ctl-panel:  #1a1a1a;   /* darker plates */
}
```

## Components

Grouped by kind, mirroring the documentation site:

**Atoms**

| Component    | What it is                                                            |
| ------------ | --------------------------------------------------------------------- |
| `Slider`     | Label + value + capsule track; pointer-capture drag, keyboard arrows. |
| `Toggle`     | Capsule on/off switch with optional label + hint.                     |
| `IconButton` | Round icon button with an accent `active` state.                      |
| `TextButton` | Capsule text button with an optional leading icon + accent `active`.  |
| `Vector`     | 2–4 fused numeric fields; drag-to-scrub, optional color mode.         |

**Molecules**

| Component  | What it is                                          |
| ---------- | --------------------------------------------------- |
| `Panel`    | Plate with optional header + padded body; collapses to a capsule. |
| `Section`  | Collapsible titled section (smooth wipe).           |
| `Platter`  | Capsule tray of icon / text buttons, row or column. |

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
