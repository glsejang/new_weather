// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages 레포 이름
  base: '/new_weather/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'], // public/ 기준
      manifest: {
        name: '날씨 기반 식물관리',
        short_name: 'PlantWeather',
        // 절대경로 대신 상대경로/점 표기 사용: 배포/개발 모두 안전
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#111218',
        background_color: '#f7f7f8',
        // 중요: 앞에 슬래시(/) 금지! (base가 자동 접두됨)
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          // { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          // { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          // { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
      },
      workbox: {
        // 이건 절대경로여도 괜찮습니다(배포 경로 고정 목적)
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
