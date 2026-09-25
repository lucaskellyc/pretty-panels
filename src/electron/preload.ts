/**
 * Preload half of the window bridge — the `pretty-panels/preload` entry.
 *
 * Point a window straight at this file; loading it mounts the bridge:
 *
 *     webPreferences: { preload: require.resolve('pretty-panels/preload') }
 *
 * It has to work that way. A preload script is *executed*, not imported, so a
 * module that only exported a mount function would do nothing at all — and
 * under `sandbox: true` (Electron's default since 20) a preload cannot
 * `require` an npm package or a sibling file to call one either: only
 * `electron` and a few Node builtins resolve. Hence a file that is
 * self-contained (built alone — see vite.preload.config.ts), touches no Node
 * API beyond `process.platform`, and mounts itself on load.
 *
 * An app that also exposes APIs of its own has two ways in: bundle its own
 * preload (importing this module then both mounts the bridge and gives you
 * `createWindowBridge` to compose with), or run unsandboxed. `contextIsolation`
 * must stay on either way.
 */
import { contextBridge, ipcRenderer } from 'electron';
import {
  THEME_CHANNEL,
  type ThemeSource,
  WINDOW_BRIDGE_KEY,
  WINDOW_CHANNEL,
  WINDOW_STATE_CHANNEL,
  type WindowBridge,
  type WindowState,
  toPlatform,
} from './protocol';

/** Build the bridge object without mounting it — for apps that expose their own
 *  API object and want these methods nested inside it. */
export function createWindowBridge(): WindowBridge {
  return {
    platform: toPlatform(process.platform),
    minimize: () => ipcRenderer.send(WINDOW_CHANNEL, 'minimize'),
    toggleMaximize: () => ipcRenderer.send(WINDOW_CHANNEL, 'toggle-maximize'),
    close: () => ipcRenderer.send(WINDOW_CHANNEL, 'close'),
    titleDoubleClick: () => ipcRenderer.send(WINDOW_CHANNEL, 'title-double-click'),
    getState: () => ipcRenderer.invoke(WINDOW_CHANNEL, 'get-state') as Promise<WindowState>,
    onState: (listener) => {
      // The IpcRendererEvent is dropped on the floor deliberately: handing a
      // renderer-side event object across the bridge would leak `sender`, and
      // the state payload is the whole point.
      const wrapped = (_event: unknown, state: WindowState) => listener(state);
      ipcRenderer.on(WINDOW_STATE_CHANNEL, wrapped);
      return () => ipcRenderer.removeListener(WINDOW_STATE_CHANNEL, wrapped);
    },
    setThemeSource: (source: ThemeSource) => ipcRenderer.send(THEME_CHANNEL, source),
  };
}

/** Keys already mounted in this renderer. `exposeInMainWorld` throws on a
 *  second bind to the same key, and loading this module mounts the default one
 *  — so a bundled preload that imports it and then calls this explicitly (the
 *  documented composition path) must not blow up. */
const mounted = new Set<string>();

/**
 * Expose the bridge on `window.prettyPanels`, where `useWindowState()` looks
 * for it. Pass a key to mount it somewhere else (and tell the hook where with
 * its own `key` argument). Mounting a key twice is a no-op, not an error.
 */
export function exposeWindowBridge(key: string = WINDOW_BRIDGE_KEY): void {
  if (mounted.has(key)) return;
  mounted.add(key);
  contextBridge.exposeInMainWorld(key, createWindowBridge());
}

// The side effect that makes this file usable as a preload script on its own.
exposeWindowBridge();
