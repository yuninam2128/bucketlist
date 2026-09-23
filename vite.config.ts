import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // pwa-assets.config.ts 기준으로 아이콘 생성 + manifest/head 링크 자동 주입
      pwaAssets: {
        config: true,
      },
      manifest: {
        name: '우리의 버킷리스트',
        short_name: '버킷리스트',
        description: '둘이 함께 쓰는 버킷리스트',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ff6b81',
        background_color: '#ffffff',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff,webmanifest}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
