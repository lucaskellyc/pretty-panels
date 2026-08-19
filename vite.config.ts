import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// Library build. Emits ESM + CJS bundles, a single extracted stylesheet
// (dist/pretty-panels.css), and per-file .d.ts types.
export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], exclude: ['demo', '**/*.test.*'], rollupTypes: false }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PrettyPanels',
      formats: ['es', 'cjs'],
      fileName: (format) => `pretty-panels.${format === 'es' ? 'js' : 'cjs'}`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      // React is a peer dependency — never bundle it.
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        assetFileNames: 'pretty-panels.[ext]',
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
      },
    },
  },
});
