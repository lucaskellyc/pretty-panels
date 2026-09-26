import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs: the built page is loaded over file://, where the
  // default absolute '/assets/…' would resolve to the filesystem root.
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  // The library is linked from the repo root (`file:../..`), so React would
  // otherwise resolve twice — once here, once through the link.
  resolve: { dedupe: ['react', 'react-dom'] },
});
