import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isStandalone = mode === 'standalone'

  return {
    base: isStandalone ? '/standalone/' : '/',
    plugins: [
      react(),
      tailwindcss(),
      ...(isStandalone
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.svg'],
              manifest: {
                name: 'French Vocabulary Flashcards',
                short_name: 'FR Flashcards',
                start_url: '/standalone/',
                scope: '/standalone/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#7e14ff',
                icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,woff2}'],
                navigateFallback: '/standalone/index.html',
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
    build: {
      outDir: isStandalone ? 'dist-standalone' : 'dist',
    },
  }
})
