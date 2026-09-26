import { defineConfig } from '@playwright/test'
import { loadEnv } from 'vite'

// .env.local 의 E2E_EMAIL_A / E2E_EMAIL_B / E2E_PASSWORD (테스트 커플 계정, git에 안 올라감)
Object.assign(process.env, loadEnv('development', process.cwd(), 'E2E_'))

const PORT = 5188

/**
 * E2E 테스트
 * - e2e/preview.spec.ts : 가짜 데이터(?preview)로 화면 흐름 확인 — 계정 필요 없음, DB 안 건드림
 * - e2e/supabase.spec.ts: 테스트 커플 계정으로 실제 Supabase에 로그인해서 저장·사진까지 확인
 *   (계정 정보가 없으면 건너뜀. 만든 항목·사진은 테스트가 끝나며 지움)
 *
 * 실행: npm run test:e2e
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // 실제 DB 테스트가 같은 테스트 커플을 쓰므로 순서대로
  workers: 1,
  // dev 서버가 처음 뜰 때(의존성 준비) 가끔 첫 화면이 늦게 떠서 한 번은 다시 시도
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // 따로 브라우저를 받지 않고 설치된 Chrome 사용
    channel: 'chrome',
    // Figma 디자인 기준 폭 (앱 축소 없이 원래 크기)
    viewport: { width: 429, height: 930 },
    locale: 'ko-KR',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    env: { E2E: '1' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
