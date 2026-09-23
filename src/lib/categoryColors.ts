import type { CategoryColor } from '../types'

// Figma 64:592 / 64:605 에서 추출한 카테고리 색 (배지·폴더·스티커 공통)
export const CATEGORY_COLORS: Record<CategoryColor, string> = {
  beige: '#daccc0',
  green: '#c0dac3',
  pink: '#ebbfd2',
  purple: '#cbc0da',
  blue: '#c0c4da',
  rose: '#d2a5a6',
}

/**
 * 캘린더 기록 카드의 마스킹테이프 색 (Figma 64:577).
 * Figma의 rose 테이프 rgba(138,0,4,0.8) = rose와 같은 색상(hue)에 채도 100%·명도 27%.
 * 나머지도 같은 규칙으로 각 카테고리 색을 진하게 만든 값.
 */
export const CATEGORY_TAPE_COLORS: Record<CategoryColor, string> = {
  beige: 'rgba(138, 64, 0, 0.8)',
  green: 'rgba(0, 138, 16, 0.8)',
  pink: 'rgba(138, 0, 60, 0.8)',
  purple: 'rgba(58, 0, 138, 0.8)',
  blue: 'rgba(0, 21, 138, 0.8)',
  rose: 'rgba(138, 0, 4, 0.8)',
}

export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_COLORS) as CategoryColor[]
