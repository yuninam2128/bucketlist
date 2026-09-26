import { expect, type Locator, type Page } from '@playwright/test'

/** 테스트마다 겹치지 않는 이름 (실제 DB에서 남의 데이터와 헷갈리지 않게) */
export const uniqueTitle = (prefix: string) => `${prefix} ${Date.now().toString(36).slice(-5)}`

/** 팝업(테이프 종이)의 아래쪽 제출 버튼 — "추가", "완료", "저장", "지우기" */
export const popupSubmit = (page: Page, label: string) =>
  page.locator('form').getByRole('button', { name: label, exact: true })

/** 버킷리스트 한 줄 (제목으로 찾기) */
export const itemRow = (page: Page, title: string): Locator => page.locator('li').filter({ hasText: title })

export async function addItem(page: Page, title: string) {
  await page.getByRole('button', { name: '버켓리스트 추가' }).click()
  await page.getByPlaceholder('자동차 극장 가기').fill(title)
  await popupSubmit(page, '추가').click()
  await expect(itemRow(page, title)).toBeVisible()
}

/** 체크 → 완료 팝업 → (선택) 소감·사진 → 완료 */
export async function completeItem(page: Page, title: string, opts: { note?: string; photo?: string } = {}) {
  await itemRow(page, title).getByRole('button', { name: '완료', exact: true }).click()
  await expect(page.getByRole('heading', { name: '완료했어요!' })).toBeVisible()
  if (opts.photo) {
    await page.locator('input[type="file"]').setInputFiles(opts.photo)
    // 사진을 줄여서 미리보기가 뜰 때까지
    await expect(page.getByRole('button', { name: '사진 빼기' }).first()).toBeVisible()
  }
  if (opts.note) await page.getByPlaceholder('오늘은 즐거워따').fill(opts.note)
  await popupSubmit(page, '완료').click()
  await expect(itemRow(page, title).getByRole('button', { name: '완료 취소' })).toBeVisible()
}

export async function deleteItem(page: Page, title: string) {
  await itemRow(page, title).getByRole('button', { name: '삭제', exact: true }).click()
  await popupSubmit(page, '지우기').click()
  await expect(itemRow(page, title)).toHaveCount(0)
}

/** 하단 탭 이동 */
export const goTab = (page: Page, name: '홈' | '카테고리' | '캘린더') =>
  page.getByRole('navigation').getByRole('link', { name, exact: true }).click()
