import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 디자인 기준 폭(Figma 429px)보다 좁은 폰에선 앱을 비율대로 줄임 (AppLayout.module.css의 zoom)
const DESIGN_WIDTH = 429
const updateScale = () =>
  document.documentElement.style.setProperty('--app-scale', String(Math.min(1, window.innerWidth / DESIGN_WIDTH)))
updateScale()
window.addEventListener('resize', updateScale)

const root = createRoot(document.getElementById('root')!)

// 개발용 미리보기: npm run dev 에서 주소 끝에 ?preview → 로그인 없이 가짜 데이터로 화면 확인
// (import.meta.env.DEV 가 false인 배포 빌드에선 이 분기와 src/dev 파일이 통째로 빠짐)
if (import.meta.env.DEV && new URLSearchParams(location.search).has('preview')) {
  import('./dev/PreviewStoreProvider').then(({ PreviewStoreProvider }) =>
    root.render(
      <StrictMode>
        <App Provider={PreviewStoreProvider} />
      </StrictMode>,
    ),
  )
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
