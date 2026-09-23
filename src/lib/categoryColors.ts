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

export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_COLORS) as CategoryColor[]
