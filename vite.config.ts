import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: projectRoot,
  base: process.env.VITE_APP_BASE ?? '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
})
