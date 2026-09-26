import { expect, test, type Browser, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { addItem, completeItem, deleteItem, goTab, itemRow, popupSubmit, uniqueTitle } from './helpers'

/**
 * 실제 Supabase 테스트 — 테스트 커플(E2E_EMAIL_A + E2E_EMAIL_B)로 로그인해서 저장·사진·짝꿍 공유까지 확인.
 * 두 분의 진짜 커플과는 권한 규칙(RLS)으로 완전히 분리돼 있음.
 * 계정은 Supabase 대시보드에서 Auto Confirm으로 만든 비밀번호 계정 (로그인은 dev 전용 비밀번호 로그인 사용).
 */
const env = loadEnv('development', process.cwd(), ['E2E_', 'VITE_'])
const A = env.E2E_EMAIL_A
const B = env.E2E_EMAIL_B
const PASSWORD = env.E2E_PASSWORD
const PHOTO = 'src/dev/sample-photo.jpg'

test.skip(!A || !B || !PASSWORD, '.env.local 에 E2E_EMAIL_A / E2E_EMAIL_B / E2E_PASSWORD 가 없어서 건너뜀')

async function login(page: Page, email: string) {
  // 누끼 모델(56MB)은 받지 않게 막음 — 스티커는 조용히 실패하고 나머지 흐름만 확인
  await page.route('**/staticimgly.com/**', (route) => route.abort())
  await page.goto('/')
  // dev 서버 첫 로딩이 느릴 수 있어서 넉넉히
  const devLogin = page.getByRole('button', { name: '개발용: 테스트 계정(비밀번호)으로 로그인' })
  await expect(devLogin).toBeVisible({ timeout: 45_000 })
  await devLogin.click()
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  // 커플 연결 전이면 "반가워요!", 연결돼 있으면 홈
  await expect(page.getByRole('heading', { name: '반가워요!' }).or(page.getByText('버켓리스트 추가'))).toBeVisible()
}

const isOnboarding = (page: Page) => page.getByRole('heading', { name: '반가워요!' }).isVisible()

async function newPage(browser: Browser) {
  const context = await browser.newContext()
  return context.newPage()
}

/** 테스트 커플 준비: A가 커플을 만들고, B가 A의 초대코드로 들어옴 (처음 한 번만 실제로 일어남) */
async function ensureTestCouple(browser: Browser) {
  const a = await newPage(browser)
  await login(a, A)
  if (await isOnboarding(a)) {
    await a.getByPlaceholder('로빈슨').fill('E2E-A')
    await a.getByRole('button', { name: '날짜 고르기' }).click()
    await a.getByRole('button', { name: '1', exact: true }).first().click()
    await a.getByRole('button', { name: '시작하기' }).click()
    await expect(a.getByText('버켓리스트 추가')).toBeVisible()
  }

  const b = await newPage(browser)
  await login(b, B)
  if (await isOnboarding(b)) {
    await a.getByRole('button', { name: '프로필' }).click()
    const code = (await a.getByRole('button', { name: /^[0-9A-F]{6}$/ }).textContent())?.trim() ?? ''
    await b.getByRole('tab', { name: '초대코드 받았어요' }).click()
    await b.getByPlaceholder('A1B2C3').fill(code)
    await b.getByPlaceholder('로빈슨').fill('E2E-B')
    await b.getByRole('button', { name: '들어가기' }).click()
    await expect(b.getByText('버켓리스트 추가')).toBeVisible()
  }
  await a.context().close()
  await b.context().close()
}

/** 테스트가 중간에 실패해도 남지 않게: 테스트 커플의 "E2E"로 시작하는 항목과 그 사진 정리 */
async function cleanup() {
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  })
  const { error } = await supabase.auth.signInWithPassword({ email: A, password: PASSWORD })
  if (error) return
  const { data: items } = await supabase.from('bucket_items').select('id').like('title', 'E2E%')
  const ids = (items ?? []).map((i) => i.id)
  if (ids.length > 0) {
    const { data: memories } = await supabase.from('memories').select('photos, sticker_path').in('item_id', ids)
    const paths = (memories ?? []).flatMap((m) => [...m.photos, ...(m.sticker_path ? [m.sticker_path] : [])])
    if (paths.length > 0) await supabase.storage.from('photos').remove(paths)
    await supabase.from('bucket_items').delete().in('id', ids)
  }
  await supabase.auth.signOut()
}

test.describe('실제 Supabase (테스트 커플)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000)
    await ensureTestCouple(browser)
    await cleanup()
  })
  test.afterAll(cleanup)

  test('사진·소감 남기고 완료 → 캘린더·추억 상세에 사진 → 삭제하면 사라짐', async ({ page }) => {
    const title = uniqueTitle('E2E 사진')
    const note = uniqueTitle('소감')
    await login(page, A)
    await addItem(page, title)
    await completeItem(page, title, { note, photo: PHOTO })

    await goTab(page, '캘린더')
    await page.getByText(note).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    // 사진 업로드는 팝업이 닫힌 뒤 뒤에서 진행 → 추억 상세에 사진이 붙을 때까지 기다림
    const photo = page.getByRole('img', { name: '사진 1' })
    await expect(photo).toBeVisible({ timeout: 30_000 })

    // 새로고침해도 사진이 서버에서 다시 불러와짐 = 실제로 저장됨 (깨진 이미지면 naturalWidth 0)
    await page.reload()
    await expect(photo).toBeVisible()
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

    await goTab(page, '홈')
    await deleteItem(page, title)
    await goTab(page, '캘린더')
    await expect(page.getByText(note)).toHaveCount(0)
  })

  test('한쪽이 추가한 항목이 짝꿍 화면에도 보임', async ({ browser }) => {
    const title = uniqueTitle('E2E 공유')
    const a = await newPage(browser)
    const b = await newPage(browser)
    await login(a, A)
    await addItem(a, title)

    await login(b, B)
    await expect(itemRow(b, title)).toBeVisible()
    await deleteItem(b, title)

    // A 쪽도 새로 불러오면 사라져 있음
    await a.reload()
    await expect(a.getByText('버켓리스트 추가')).toBeVisible()
    await expect(itemRow(a, title)).toHaveCount(0)
    await a.context().close()
    await b.context().close()
  })

  test('완료 취소하며 추억 남겨두기 → 다시 완료하면 추억 카드가 하나만', async ({ page }) => {
    const title = uniqueTitle('E2E 재완료')
    const note1 = uniqueTitle('첫소감')
    const note2 = uniqueTitle('둘째')
    await login(page, A)
    await addItem(page, title)
    await completeItem(page, title, { note: note1 })
    await itemRow(page, title).getByRole('button', { name: '완료 취소' }).click()
    await page.getByRole('button', { name: '추억은 남겨두기' }).click()
    await completeItem(page, title, { note: note2 })

    await goTab(page, '캘린더')
    // 같은 사람이 다시 쓴 소감은 덮어써지고, 카드는 하나
    await expect(page.getByText(note2)).toHaveCount(1)
    await expect(page.getByText(note1)).toHaveCount(0)
    await goTab(page, '홈')
    await deleteItem(page, title)
    // 팝업 확인 버튼 헬퍼가 잘 닫혔는지
    await expect(popupSubmit(page, '지우기')).toHaveCount(0)
  })
})
