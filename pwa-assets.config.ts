import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// public/logo.svg(테이프 있는 로고)로 앱 아이콘(홈 화면: apple-touch-icon, PWA 192/512/maskable)을 생성.
// 브라우저 탭 아이콘(파비콘)은 테이프 없는 public/favicon-64.png 를 따로 씀 → 여기선 favicon.ico 안 만듦
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...preset,
    transparent: { ...preset.transparent, favicons: [] },
  },
  images: ['public/logo.svg'],
})
