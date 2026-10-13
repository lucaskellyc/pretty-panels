import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Demo / documentation site. Served in dev (`npm run dev`) and built to
// ../dist-demo for GitHub Pages (`npm run build:demo`). The `base` must match
// the repo name so asset URLs resolve under user.github.io/pretty-panels/.
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  base: '/pretty-panels/',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    // Two pages: the docs, and Pillotalk Studio — an app built on the kit,
    // served at /pretty-panels/pillotalk-studio/.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        'pillotalk-studio': resolve(__dirname, 'demo/pillotalk-studio/index.html'),
      },
    },
  },
});
