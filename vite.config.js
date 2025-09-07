// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/new_weather/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: '날씨 기반 식물관리',
        short_name: 'PlantWeather',
        start_url: '/new_weather/',
        scope: '/new_weather/',
        display: 'standalone',
        theme_color: '#111218',
        background_color: '#f7f7f8',
        icons: [
          { src: '/new_weather/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/new_weather/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/new_weather/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/new_weather/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
      },
      workbox: {
        navigateFallback: '/new_weather/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.weatherapi\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-weather', networkTimeoutSeconds: 4 }
          }
        ]
      }
    })
  ]
});
