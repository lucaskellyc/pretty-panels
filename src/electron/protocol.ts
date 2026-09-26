/**
 * The contract between the three Electron entries — the only thing `main`,
 * `preload` and the renderer hooks share. Types and channel names, no runtime
 * behaviour, so importing it costs nothing in any of the three processes.
 */
import type { Platform } from '../components/platform';

export type { Platform };

/** Where the preload bridge is mounted: `window.prettyPanels`. */
export const WINDOW_BRIDGE_KEY = 'prettyPanels';

/** Renderer → main, one channel carrying a fixed verb. Deliberately not a
 *  general-purpose IPC pipe: a compromised renderer can ask for these five
 *  things and nothing else. */
export const WINDOW_CHANNEL = 'pretty-panels:window';
/** Main → renderer, pushed whenever the window's state changes. */
export const WINDOW_STATE_CHANNEL = 'pretty-panels:window-state';
/** Renderer → main, `nativeTheme.themeSource`. */
export const THEME_CHANNEL = 'pretty-panels:theme';

export type WindowAction =
  | 'minimize'
  | 'toggle-maximize'
  | 'close'
  /** The titlebar's double-click gesture. Separate from `toggle-maximize`
   *  because macOS lets the user redefine what it does. */
  | 'title-double-click'
  | 'get-state';

export type ThemeSource = 'system' | 'light' | 'dark';

/** Everything the chrome needs to draw itself correctly. */
export interface WindowState {
  maximized: boolean;
  fullscreen: boolean;
  focused: boolean;
  platform: Platform;
}

/** The object `preload` mounts and the renderer hooks consume. */
export interface WindowBridge {
  platform: Platform;
  minimize(): void;
  toggleMaximize(): void;
  close(): void;
  titleDoubleClick(): void;
  getState(): Promise<WindowState>;
  /** Subscribe to state pushes. Returns an unsubscribe function. */
  onState(listener: (state: WindowState) => void): () => void;
  setThemeSource(source: ThemeSource): void;
}

/** Map Node's `process.platform` onto the kit's three-way split. */
export function toPlatform(nodePlatform: string): Platform {
  if (nodePlatform === 'darwin') return 'mac';
  if (nodePlatform === 'win32') return 'win';
  return 'linux';
}
