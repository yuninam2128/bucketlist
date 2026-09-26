import { expect, test } from '@playwright/test'
import { addItem, completeItem, deleteItem, goTab, itemRow, popupSubmit, uniqueTitle } from './helpers'

// 가짜 데이터(?preview)로 화면 흐름만 확인 — 로그인·DB 없이 매번 같은 결과
test.describe('미리보기(가짜 데이터)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?preview')
    await expect(page.getByRole('button', { name: '버켓리스트 추가' })).toBeVisible()
  })

  test('버킷리스트 추가 → 완료 → 완료 취소 → 삭제', async ({ page }) => {
    const title = uniqueTitle('E2E 항목')
    await addItem(page, title)
    await completeItem(page, title)
    // 사진·소감 없이 완료했으니 확인 팝업 없이 바로 취소
    await itemRow(page, title).getByRole('button', { name: '완료 취소' }).click()
    await expect(itemRow(page, title).getByRole('button', { name: '완료', exact: true })).toBeVisible()
    await deleteItem(page, title)
  })

  test('소감을 남기고 완료하면 캘린더에 추억 카드가 생김', async ({ page }) => {
    const title = uniqueTitle('E2E 추억')
    const note = uniqueTitle('즐거워따')
    await addItem(page, title)
    await completeItem(page, title, { note })
    await goTab(page, '캘린더')
    await expect(page.getByText(note)).toBeVisible()
    // 카드를 누르면 추억 상세 → 소감 전문
    await page.getByText(note).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  })

  test('추억이 있는 항목을 완료 취소하면 물어보고, 추억도 지우기', async ({ page }) => {
    const title = uniqueTitle('E2E 취소')
    const note = uniqueTitle('남긴말')
    await addItem(page, title)
    await completeItem(page, title, { note })
    await itemRow(page, title).getByRole('button', { name: '완료 취소' }).click()
    await expect(page.getByRole('heading', { name: '완료를 취소할까요?' })).toBeVisible()
    await popupSubmit(page, '추억도 지우기').click()
    await goTab(page, '캘린더')
    await expect(page.getByText(note)).toHaveCount(0)
  })

  test('카테고리 추가하면 카테고리 목록에 나옴', async ({ page }) => {
    const name = uniqueTitle('E2E').slice(0, 12)
    await goTab(page, '카테고리')
    await page.getByRole('button', { name: '카테고리 추가' }).click()
    await page.getByPlaceholder('영화 뭐볼까').fill(name)
    await popupSubmit(page, '추가').click()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  })

  test('하단 탭으로 홈·카테고리·캘린더 이동', async ({ page }) => {
    await goTab(page, '카테고리')
    await expect(page).toHaveURL(/\/categories/)
    await goTab(page, '캘린더')
    await expect(page.getByRole('button', { name: '이전 달' })).toBeVisible()
    await goTab(page, '홈')
    await expect(page.getByText('전체')).toBeVisible()
  })
})
