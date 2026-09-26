/**
 * Renderer half of the window bridge — the `pretty-panels/electron` entry.
 *
 * This is the only piece an app's UI code touches, and it **never imports
 * `electron`**: it reads the object `pretty-panels/preload` mounted on
 * `window`. That is what lets the same component tree run in a browser — the
 * docs site renders `TitleBar` this way — instead of throwing on a missing
 * module. Outside Electron the state is inert defaults and the actions are
 * no-ops.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { detectPlatform } from '../components/platform';
import {
  type Platform,
  type ThemeSource,
  WINDOW_BRIDGE_KEY,
  type WindowBridge,
  type WindowState,
} from './protocol';

export type { Platform, ThemeSource, WindowBridge, WindowState };

/** The bridge, or `undefined` outside Electron (or before the preload ran). */
export function getWindowBridge(key: string = WINDOW_BRIDGE_KEY): WindowBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as Record<string, WindowBridge | undefined>)[key];
}

export interface WindowControlsApi extends WindowState {
  /** False in a browser: no preload bridge is mounted. Use it to hide chrome
   *  that would be dead, or leave it — the actions below are already safe. */
  available: boolean;
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  titleDoubleClick: () => void;
}

/**
 * Live window state plus the actions that change it — everything `TitleBar`
 * takes:
 *
 *     const win = useWindowState();
 *     <TitleBar
 *       title="Workbench"
 *       platform={win.platform}
 *       maximized={win.maximized}
 *       fullscreen={win.fullscreen}
 *       inactive={!win.focused}
 *       onMinimize={win.minimize}
 *       onMaximize={win.toggleMaximize}
 *       onClose={win.close}
 *       onTitleDoubleClick={win.titleDoubleClick}
 *     />
 *
 * State arrives from the main process: an initial `getState()` and then a push
 * on every change, so nothing here polls.
 */
export function useWindowState(key: string = WINDOW_BRIDGE_KEY): WindowControlsApi {
  const bridge = getWindowBridge(key);

  const [state, setState] = useState<WindowState>(() => ({
    maximized: false,
    fullscreen: false,
    // A browser window is always "focused" as far as this chrome is concerned;
    // starting false would render the bar dimmed until the first push.
    focused: true,
    platform: bridge?.platform ?? detectPlatform(),
  }));

  useEffect(() => {
    if (!bridge) return;
    let live = true;
    bridge.getState().then((s) => {
      if (live) setState(s);
    });
    const off = bridge.onState(setState);
    return () => {
      live = false;
      off();
    };
  }, [bridge]);

  // Stable identities so a titlebar deep in a tree doesn't re-render on every
  // parent pass, and so the no-op branch is indistinguishable from the real one.
  const actions = useMemo(
    () => ({
      minimize: () => bridge?.minimize(),
      toggleMaximize: () => bridge?.toggleMaximize(),
      close: () => bridge?.close(),
      titleDoubleClick: () => bridge?.titleDoubleClick(),
    }),
    [bridge],
  );

  return { ...state, ...actions, available: bridge !== undefined };
}

export interface NativeThemeApi {
  /** What the OS (or an override you set below) is currently asking for. The
   *  stylesheet already follows this on its own — read it when your own markup
   *  needs to branch. */
  colorScheme: 'light' | 'dark';
  /** Override the OS preference process-wide, Electron's `themeSource`.
   *  `'system'` hands control back. No-op outside Electron. */
  setThemeSource: (source: ThemeSource) => void;
}

/**
 * The OS colour scheme, and the switch that overrides it.
 *
 * The kit needs no help to follow the OS — `styles.css` moves `--mono-l` on
 * `prefers-color-scheme` — and inside Electron that media query already tracks
 * `nativeTheme`. This is for the app that wants a Light/Dark/System control of
 * its own, which has to reach the main process to stick.
 */
export function useNativeTheme(key: string = WINDOW_BRIDGE_KEY): NativeThemeApi {
  const bridge = getWindowBridge(key);

  const query = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(query);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setColorScheme(mq.matches ? 'dark' : 'light');
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setThemeSource = useCallback(
    (source: ThemeSource) => bridge?.setThemeSource(source),
    [bridge],
  );

  return { colorScheme, setThemeSource };
}
