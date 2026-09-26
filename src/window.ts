// Desktop window chrome — the opt-in `pretty-panels/window` entry.
//
// Kept out of the root export on purpose: these are app-shell parts for a
// frameless desktop window, not control-panel atoms, and a web app has no use
// for a drag region. The styling still comes from the one stylesheet
// (`pretty-panels/styles.css`), so there is nothing extra to import.
//
// Nothing here imports `electron`. The components are presentational and fully
// controlled like the rest of the kit; `pretty-panels/electron` is what hands
// them real window state.

export { AppShell } from './components/AppShell';
export type { AppShellProps } from './components/AppShell';

export { TitleBar } from './components/TitleBar';
export type { TitleBarProps } from './components/TitleBar';

export { WindowControls } from './components/WindowControls';
export type { WindowControlsProps } from './components/WindowControls';

export { detectPlatform } from './components/platform';
export type { Platform } from './components/platform';
