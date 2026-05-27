import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works on a GitHub Pages project subpath
// and ports cleanly to Base44 later.
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
