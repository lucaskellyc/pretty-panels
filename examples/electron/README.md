# pretty-panels · Electron example

A frameless window whose chrome — titlebar, window controls, shell — is drawn by
the kit rather than the OS.

```bash
npm install     # links the library from ../.. and builds it
npm start       # vite build && electron .
```

The first `npm start` downloads the Electron binary (~270 MB; Electron 44 fetches
it on first run rather than at install). That is why this example is **not** part
of the repo's CI — up there Electron is a types-only devDependency, and the root
`tsconfig.json` includes `src` and `demo` alone, so `npm run typecheck` never
looks in here. Run `npm run typecheck` inside this directory to check the example
itself.

## What to look at

| File | What it shows |
| --- | --- |
| `main.cjs` | `panelWindowOptions()` for a frameless window grounded in the plate colour, and `attachWindowBridge(win)` for the IPC behind the buttons |
| — | there is no preload file: `main.cjs` points `webPreferences.preload` straight at `require.resolve('pretty-panels/preload')`, which mounts the bridge on load. A sandboxed preload cannot `require` an npm package, so this is the supported shape; to add APIs of your own, bundle a preload (it can then import `createWindowBridge`) or run unsandboxed |
| `src/renderer/App.tsx` | `useWindowState()` → `<TitleBar>`; everything below the bar is the ordinary kit |
| `index.html` | the CSP a packaged app should ship (`default-src 'self'`) |

## Dev server

`npm start` builds first, which is the honest path — it runs the same files a
packaged app would. For HMR instead:

```bash
npm run dev            # terminal 1: vite on :5173
npm run dev:electron   # terminal 2: electron pointed at it
```

The CSP meta tag in `index.html` has to be relaxed for that (Vite's HMR socket
is a `connect-src`), and on Windows `dev:electron` needs `cross-env` to set
`ELECTRON_RENDERER_URL`.

## Things worth knowing

- **Custom controls on macOS mean `frame: false`**, which removes the traffic
  lights, the system's double-click-to-zoom and the green fullscreen button.
  `attachWindowBridge` puts the first two back (the double-click even honours
  the user's `AppleActionOnDoubleClick` setting). If you would rather keep the
  native lights, create the window with `{ frame: true, titleBarStyle: 'hidden' }`
  and render `<TitleBar controls="native">`, which reserves their space instead
  of drawing buttons.
- **Every interactive thing on the bar needs `-webkit-app-region: no-drag`.**
  The kit does this for its own parts and for any `button`, `input`, `select` or
  `a` inside the bar; custom widgets in the `left` / `right` slots are covered
  because the slots themselves opt out.
- **Fonts are local.** With `default-src 'self'` a hosted font `@import` fails
  silently — the app just renders in the system face. The stylesheet ships its
  own woff2 files under `dist/fonts/`.
