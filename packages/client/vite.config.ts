import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';

// wasm(): @midnight-ntwrk/ledger-v8 ships a WASM module using the "ESM
// integration proposal for Wasm" that Vite/Rollup can't load natively
// (confirmed by a real `vite build` failure in this sandbox — see
// docs/DECISIONS.md), pulled in transitively via
// @midnight-ntwrk/midnight-js-contracts. `target: 'esnext'` covers the
// top-level-await the WASM glue code needs — vite-plugin-top-level-await
// was tried too but its Rollup output step crashed on this dependency tree
// (also logged in docs/DECISIONS.md); esnext alone was sufficient.
export default defineConfig({
  plugins: [wasm(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext'
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/ledger-v8']
  }
});
