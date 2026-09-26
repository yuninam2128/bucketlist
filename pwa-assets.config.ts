import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// public/logo.svg(테이프 있는 로고)로 앱 아이콘(홈 화면: apple-touch-icon, PWA 192/512/maskable)을 생성.
// 브라우저 탭 아이콘(파비콘)은 테이프 없는 public/favicon-64.png 를 따로 씀 → 여기선 favicon.ico 안 만듦
//
// 여백(padding): 생성기 기본값은 홈 화면 아이콘에 30%라, 로고 자체 여백까지 더해져 그림이 너무 작아짐.
// - apple: 0 (아이폰은 모서리만 둥글게 깎음)
// - maskable: 0.1 (안드로이드가 동그라미·물방울 모양으로 잘라서 가장자리 약간은 남겨둠)
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    transparent: { ...preset.transparent, padding: 0, favicons: [] },
    maskable: { ...preset.maskable, padding: 0.1 },
    apple: { ...preset.apple, padding: 0 },
  },
  images: ['public/logo.svg'],
})
