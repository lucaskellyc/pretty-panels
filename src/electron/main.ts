/**
 * Main-process half of the window bridge — the `pretty-panels/main` entry.
 *
 *     const { app, BrowserWindow } = require('electron');
 *     const { attachWindowBridge, panelWindowOptions } = require('pretty-panels/main');
 *
 *     const win = new BrowserWindow(panelWindowOptions({
 *       webPreferences: { preload: require.resolve('pretty-panels/preload') },
 *     }));
 *     attachWindowBridge(win);
 *
 * From an ESM main process, resolve the preload with
 * `createRequire(import.meta.url).resolve('pretty-panels/preload')` — a preload
 * has to be a real file path, and the CJS build is the one a sandboxed preload
 * can load.
 */
import {
  BrowserWindow,
  type BrowserWindowConstructorOptions,
  ipcMain,
  nativeTheme,
  systemPreferences,
} from 'electron';
import {
  THEME_CHANNEL,
  type ThemeSource,
  WINDOW_CHANNEL,
  WINDOW_STATE_CHANNEL,
  type WindowAction,
  type WindowState,
  toPlatform,
} from './protocol';

/* The mono ramp's three knobs, mirrored from src/styles/colors.css. Only the
   plate lightness differs between schemes — that is the whole dark theme — so
   these three numbers plus the scheme give the exact colours the renderer will
   paint, and the window can be created already wearing one. */
const MONO_H = 212;
const MONO_S = 0.24;
const MONO_L = { light: 0.87, dark: 0.05 };

/** hsl → #rrggbb, enough for the one colour this module needs. */
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * The panel plate as a hex colour, for the current OS scheme — `--ctl-panel`,
 * the surface a `Panel` paints.
 */
export function plateColor(scheme?: 'light' | 'dark'): string {
  const dark = scheme ? scheme === 'dark' : nativeTheme.shouldUseDarkColors;
  return hslToHex(MONO_H, MONO_S, dark ? MONO_L.dark : MONO_L.light);
}

/**
 * The app's ground as a hex colour — `--stage-bg`, what `AppShell` paints
 * behind everything. This, not the plate, is what a window shows before the
 * renderer has drawn and behind it during a resize, so it is what
 * `panelWindowOptions` grounds a window in.
 *
 * It sits a step *away* from the plate rather than deeper into it — the stage
 * is the room, not another surface — which is `--stage-bg`'s own arithmetic in
 * window.css, mirrored here.
 */
export function stageColor(scheme?: 'light' | 'dark'): string {
  const dark = scheme ? scheme === 'dark' : nativeTheme.shouldUseDarkColors;
  const sign = dark ? -1 : 1;
  const l = (dark ? MONO_L.dark : MONO_L.light) + 0.06 * sign;
  return hslToHex(MONO_H, MONO_S, Math.min(1, Math.max(0, l)));
}

/**
 * `BrowserWindow` options for a window whose chrome the kit draws: frameless on
 * every platform (`TitleBar`'s default `controls="custom"` replaces the OS
 * buttons), grounded in the plate colour, with `contextIsolation` left on.
 *
 * Your overrides win, shallowly — `webPreferences` is merged one level deep so
 * passing a `preload` doesn't drop the rest. For native macOS traffic lights
 * instead, override `{ frame: true, titleBarStyle: 'hidden' }` and pair it with
 * `<TitleBar controls="native">`.
 */
export function panelWindowOptions(
  overrides: BrowserWindowConstructorOptions = {},
): BrowserWindowConstructorOptions {
  const { webPreferences, ...rest } = overrides;
  return {
    width: 1100,
    height: 720,
    frame: false,
    // What the window paints before the renderer has drawn, and behind it
    // during a resize — the shell's own ground rather than a white flash.
    // `attachWindowBridge` keeps it in step when the OS scheme changes.
    backgroundColor: stageColor(),
    ...rest,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      ...webPreferences,
    },
  };
}

function stateOf(win: BrowserWindow): WindowState {
  return {
    maximized: win.isMaximized(),
    fullscreen: win.isFullScreen(),
    focused: win.isFocused(),
    platform: toPlatform(process.platform),
  };
}

/** macOS lets the user redefine what a double-click on a titlebar does; a
 *  hand-drawn bar has to ask, or it overrides a system preference. */
function doubleClickAction(): 'maximize' | 'minimize' | 'none' {
  if (process.platform !== 'darwin') return 'maximize';
  const pref = systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string');
  if (pref === 'Minimize') return 'minimize';
  if (pref === 'None') return 'none';
  return 'maximize';
}

function act(win: BrowserWindow, action: WindowAction): void {
  switch (action) {
    case 'minimize':
      win.minimize();
      break;
    case 'toggle-maximize':
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
      break;
    case 'close':
      win.close();
      break;
    case 'title-double-click': {
      const what = doubleClickAction();
      if (what === 'minimize') win.minimize();
      else if (what === 'maximize') act(win, 'toggle-maximize');
      break;
    }
    case 'get-state':
      break;
  }
}

let handlersRegistered = false;

/** The renderer-facing handlers, registered once per process. Every call
 *  resolves the window from the sender, so one registration serves any number
 *  of windows. */
function registerHandlers(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  ipcMain.on(WINDOW_CHANNEL, (event, action: WindowAction) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) act(win, action);
  });

  ipcMain.handle(WINDOW_CHANNEL, (event, action: WindowAction) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    act(win, action);
    return stateOf(win);
  });

  ipcMain.on(THEME_CHANNEL, (_event, source: ThemeSource) => {
    nativeTheme.themeSource = source;
  });
}

/**
 * Wire one window to the bridge: register the handlers (once per process) and
 * push this window's state to its renderer whenever it changes, so `TitleBar`
 * can flip the maximize glyph, dim while unfocused and hide its controls in
 * fullscreen.
 *
 * Returns a dispose function; the listeners are also dropped with the window,
 * so calling it is only necessary if you detach the bridge from a live window.
 */
export function attachWindowBridge(win: BrowserWindow): () => void {
  registerHandlers();

  const push = () => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return;
    win.webContents.send(WINDOW_STATE_CHANNEL, stateOf(win));
  };

  const events = [
    'maximize',
    'unmaximize',
    'enter-full-screen',
    'leave-full-screen',
    'focus',
    'blur',
    'restore',
  ] as const;

  /* Electron declares one `on` overload per event name, so a loop over a list
     of them doesn't typecheck against any single overload. Narrow the pair once
     here rather than casting at each call. */
  type Listen = (event: (typeof events)[number], listener: () => void) => void;
  const listen = win.on.bind(win) as Listen;
  const unlisten = win.off.bind(win) as Listen;

  events.forEach((name) => listen(name, push));
  // The first paint happens before any of those fire, so seed the renderer as
  // soon as it can receive.
  win.webContents.on('did-finish-load', push);
  // A window created while the OS is in the other scheme was grounded in the
  // wrong plate colour; keep it in step.
  const onTheme = () => {
    if (!win.isDestroyed()) win.setBackgroundColor(stageColor());
  };
  nativeTheme.on('updated', onTheme);

  return () => {
    events.forEach((name) => unlisten(name, push));
    nativeTheme.off('updated', onTheme);
  };
}
