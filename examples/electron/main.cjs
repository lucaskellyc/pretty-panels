/**
 * Electron main process. Plain CommonJS on purpose — an example should be
 * runnable, not built.
 *
 * Two pretty-panels helpers do the desktop-specific work:
 *   panelWindowOptions()  window options for chrome the kit draws itself
 *   attachWindowBridge()  the IPC the titlebar's buttons act through
 */
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { attachWindowBridge, panelWindowOptions } = require('pretty-panels/main');

/** Set by `npm run dev` (see README); unset in the normal build-and-run path. */
const DEV_URL = process.env.ELECTRON_RENDERER_URL;

function createWindow() {
  const win = new BrowserWindow(
    panelWindowOptions({
      width: 1040,
      height: 700,
      minWidth: 640,
      minHeight: 420,
      webPreferences: {
        // `require.resolve` lands on the package's CJS preload build, which is
        // the one a sandboxed preload can load.
        preload: require.resolve('pretty-panels/preload'),
      },
    }),
  );

  // Everything the titlebar needs: the window's live state pushed to the
  // renderer, and the actions its buttons invoke.
  attachWindowBridge(win);

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, 'dist/index.html'));

  return win;
}

app.whenReady().then(() => {
  createWindow();

  // macOS: re-open a window when the dock icon is clicked and none are open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
