import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The preload gets its own build, and this is not a style choice.
//
// A preload script runs sandboxed (Electron's default since 20) and in that
// context `require` resolves ONLY `electron` and a handful of Node builtins —
// a relative require of a sibling file throws, the script never runs, and the
// bridge silently never mounts. Built alongside the other entries, Rollup
// factors the shared `protocol` module into a chunk and the preload comes out
// as `require("./protocol-<hash>.cjs")`: exactly that failure.
//
// Building it alone leaves it the only entry, so the shared module is inlined
// and the file is self-contained. CJS only, for the same reason — ESM preloads
// are rejected under `sandbox: true`.
//
// Types are not emitted here: the main build's dts pass covers all of src/,
// dist/electron/preload.d.ts included.
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: { preload: resolve(__dirname, 'src/electron/preload.ts') },
      formats: ['cjs'],
      fileName: (_format, entry) => `pretty-panels.${entry}.cjs`,
    },
    rollupOptions: { external: ['electron'] },
  },
});
