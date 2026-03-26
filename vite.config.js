import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Inline le fichier CSS généré directement dans le HTML → élimine la requête bloquante
function inlineCSSPlugin() {
  return {
    name: 'inline-css',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return html
        return html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
          (match, href) => {
            const key = href.startsWith('/') ? href.slice(1) : href
            const chunk = bundle[key]
            if (chunk?.type === 'asset' && typeof chunk.source === 'string') {
              return `<style>${chunk.source}</style>`
            }
            return match
          }
        )
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), inlineCSSPlugin()],
  server: {
    host: true
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-vendor'
          }
          if (id.includes('@supabase')) {
            return 'supabase'
          }
          if (id.includes('@dnd-kit')) {
            return 'dnd'
          }
          if (id.includes('stripe')) {
            return 'stripe'
          }
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    },
    chunkSizeWarningLimit: 600,
  }
})