import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Packaged builds load index.html via file:// (see src/main/index.ts),
  // where root-absolute asset paths ("/assets/...", Vite's default) resolve
  // against the filesystem root instead of the html file's own folder and
  // 404 - the app never mounts and shows a blank white screen. A relative
  // base keeps asset paths ("./assets/...") working under file:// as well
  // as the dev server.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
