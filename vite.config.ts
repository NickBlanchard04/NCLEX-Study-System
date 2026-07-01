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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
          if (id.includes('react-router-dom')) return 'vendor-router'
          if (
            id.includes('recharts') ||
            id.includes('d3-') ||
            id.includes('victory-vendor') ||
            id.includes('react-redux') ||
            id.includes('redux') ||
            id.includes('reselect') ||
            id.includes('immer') ||
            id.includes('use-sync-external-store')
          ) {
            return 'vendor-charts'
          }
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'vendor-motion'
          }
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (
            id.includes('pdfjs-dist') ||
            id.includes('mammoth') ||
            id.includes('idb') ||
            id.includes('bluebird') ||
            id.includes('xmlbuilder') ||
            id.includes('@xmldom') ||
            id.includes('dingbat-to-unicode') ||
            id.includes('jszip') ||
            id.includes('lop') ||
            id.includes('underscore')
          ) {
            return 'vendor-materials'
          }
          if (id.includes('eventemitter3')) return 'vendor-phaser'
          if (id.includes('phaser')) return 'vendor-phaser'
          if (id.includes('three')) return 'vendor-three'
          if (id.includes('es-toolkit')) return 'vendor-utils'
          return 'vendor'
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
})
