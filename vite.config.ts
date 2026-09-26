import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type Plugin, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

const FONT_DIR = resolve(__dirname, 'src/styles/fonts');

/**
 * Ships the vendored faces with the published stylesheet.
 *
 * It exists because library mode inlines *every* asset a stylesheet references
 * — `shouldInline()` returns true for `build.lib` before it ever consults
 * `assetsInlineLimit` — so an `@import "./fonts.css"` would base64 all eleven
 * woff2s into the bundle and take it from ~19 kB to ~330 kB. So `index.css`
 * leaves the faces out, and this puts them back the only way that keeps them as
 * files: copy them beside the CSS, and prepend the rules verbatim. The url()s
 * in fonts.css are already written relative to the stylesheet (`./fonts/…`),
 * which is exactly where they land.
 */
function vendorFonts(): Plugin {
  return {
    name: 'pretty-panels:vendor-fonts',
    // After Vite's own CSS plugin, which only emits the extracted stylesheet
    // during its generateBundle — an earlier hook would find no asset to
    // prepend to.
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of readdirSync(FONT_DIR)) {
        this.emitFile({
          type: 'asset',
          fileName: `fonts/${file}`,
          source: readFileSync(join(FONT_DIR, file)),
        });
      }

      const faces = readFileSync(join(FONT_DIR, '..', 'fonts.css'), 'utf8');
      for (const asset of Object.values(bundle)) {
        if (asset.type === 'asset' && asset.fileName.endsWith('.css')) {
          asset.source = `${faces}\n${asset.source as string}`;
        }
      }
    },
  };
}

// Library build. Emits ESM + CJS bundles, a single extracted stylesheet
// (dist/pretty-panels.css), the vendored font files, and per-file .d.ts types.
//
// Four entries here, one package. The root is the component kit; `window` is
// the desktop chrome; `electron` is renderer-side and pure while `main` imports
// `electron` itself and must never be pulled into a browser bundle. Splitting
// them is what lets a web consumer's bundler drop all of it.
//
// The fifth entry, the preload, is built separately (vite.preload.config.ts) —
// it has to be self-contained, which it cannot be while it shares this graph.
export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], exclude: ['demo', '**/*.test.*'], rollupTypes: false }),
    vendorFonts(),
  ],
  build: {
    lib: {
      // Flat keys on purpose: the entry name goes into the output filename, so
      // a nested key ('electron/preload') would emit a directory.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        window: resolve(__dirname, 'src/window.ts'),
        electron: resolve(__dirname, 'src/electron/renderer.ts'),
        main: resolve(__dirname, 'src/electron/main.ts'),
      },
      name: 'PrettyPanels',
      formats: ['es', 'cjs'],
      fileName: (format, entry) =>
        `pretty-panels${entry === 'index' ? '' : `.${entry}`}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    // One stylesheet for every entry — the desktop chrome included — so
    // consumers keep importing exactly one file.
    cssCodeSplit: false,
    rollupOptions: {
      // React is a peer dependency — never bundle it. `electron` is resolved by
      // the runtime that loads the preload/main entries and is never present in
      // a renderer bundle, so it is external for the same reason.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'electron'],
      output: {
        // The stylesheet keeps its published name; the font files keep theirs,
        // under dist/fonts/, where the url()s in the CSS point. A single
        // '[ext]' pattern would collapse all eleven woff2s onto one name.
        assetFileNames: (asset) => {
          const name = (asset as { names?: string[]; name?: string }).names?.[0] ?? asset.name ?? '';
          return name.endsWith('.css') ? 'pretty-panels.css' : 'fonts/[name][extname]';
        },
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
      },
    },
  },
});
