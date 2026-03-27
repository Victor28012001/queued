import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({}),
    react(),
    tailwindcss(),
    viteTsconfigPaths({
      root: resolve(__dirname),
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
    fs: {
      allow: ['..', './public']
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  publicDir: 'public',
  optimizeDeps: {
    // Exclude Three.js from optimization
    exclude: ['three'],
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      // Don't try to bundle Three.js
      external: ['three'],
    },
  },
  // Configure esbuild options
  esbuild: {
    // No unsupported 'external' key here; externals are handled via rollupOptions and optimizeDeps
  },
})