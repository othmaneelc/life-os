/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.js',
    registerType: 'autoUpdate',
    includeAssets: ['images/**/*'],
    manifest: {
      name: 'Life OS',
      short_name: 'LifeOS',
      description: 'Personal Life Operating System',
      theme_color: '#5B5BD6',
      background_color: '#0A0A0F',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        { src: 'images/agency/logo.png', sizes: '192x192', type: 'image/png' },
        { src: 'images/agency/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    },
  })],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
   build: {
      rollupOptions: {
        output: {
           manualChunks(id) {
             if (id.includes('node_modules/react-') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router') || id.includes('node_modules/@tanstack/react-query')) return 'vendor-react'
             if (id.includes('node_modules/framer-motion')) return 'vendor-framer'
             if (id.includes('node_modules/recharts')) return 'vendor-charts'
             if (id.includes('node_modules/@dnd-kit')) return 'vendor-dnd'
           },
        },
      },
    },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'zustand/traditional', '@tanstack/react-query'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
