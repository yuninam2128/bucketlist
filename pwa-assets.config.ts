import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// public/logo.svg 하나로 favicon, apple-touch-icon, PWA 아이콘(192/512/maskable)을 생성
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset,
  images: ['public/logo.svg'],
})
