import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// E2E 테스트(playwright.config.ts)가 띄우는 서버: 켜져 있는 dev 서버와 의존성 캐시가 겹치지 않게 따로 쓰고,
// 개발용 서비스워커(예전 화면을 붙잡음)는 끔
const isE2E = !!process.env.E2E

// https://vite.dev/config/
export default defineConfig({
  cacheDir: isE2E ? 'node_modules/.vite-e2e' : 'node_modules/.vite',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // pwa-assets.config.ts 기준으로 아이콘 생성 + manifest/head 링크 자동 주입
      pwaAssets: {
        config: true,
        // 탭 아이콘은 테이프 없는 버전을 쓰려고 head 링크는 index.html 에 직접 적음
        includeHtmlHeadLinks: false,
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
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff,ttf}'],
        // 누끼용 AI 런타임(onnxruntime)은 스티커 만들 때만 받도록 미리 캐시에서 제외
        globIgnores: ['**/ort*.js', '**/*.wasm'],
        // 사진은 서비스워커에 따로 저장하지 않음: 다른 도메인(Supabase) 이미지를 그대로 담으면
        // 크롬이 장당 약 7MB로 계산해서 저장공간이 금방 참. 대신 주소를 고정해(lib/photoUrlCache)
        // 브라우저 기본 캐시가 재사용하게 함
      },
      devOptions: {
        enabled: !isE2E,
      },
    }),
  ],
})
