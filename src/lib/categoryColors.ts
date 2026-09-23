/**
 * 카테고리 색 팔레트.
 * Figma 64:592 / 64:605 의 6가지 색을 계열 기준(각 계열 2번째 칸)으로 두고,
 * 같은 색상·채도에서 명도만 ±7%씩 바꾼 4단계를 만듦. 카테고리는 이 중 아무 색이나 고름.
 */
export interface ColorFamily {
  key: string
  label: string
  /** 밝은 → 진한 순 */
  shades: string[]
}

export const COLOR_FAMILIES: ColorFamily[] = [
  { key: 'beige', label: '베이지', shades: ['#e7ded6', '#daccc0', '#cdbaaa', '#c0a893'] },
  { key: 'green', label: '초록', shades: ['#d6e7d8', '#c0dac3', '#aacdae', '#93c098'] },
  { key: 'pink', label: '핑크', shades: ['#f3dae5', '#ebbfd2', '#e2a4bf', '#da89ac'] },
  { key: 'purple', label: '보라', shades: ['#ded6e7', '#cbc0da', '#b8aacd', '#a693c0'] },
  { key: 'blue', label: '파랑', shades: ['#d6d9e7', '#c0c4da', '#aaafcd', '#939ac0'] },
  { key: 'rose', label: '로즈', shades: ['#debdbe', '#d2a5a6', '#c68d8e', '#ba7577'] },
]

/** Figma 기본 폴더색 (beige) */
export const DEFAULT_CATEGORY_COLOR = '#daccc0'

export function familyOf(hex: string): ColorFamily {
  return COLOR_FAMILIES.find((f) => f.shades.includes(hex.toLowerCase())) ?? COLOR_FAMILIES[0]
}

/**
 * 캘린더 기록 카드의 마스킹테이프 색 (Figma 64:577).
 * Figma rose 테이프 rgba(138,0,4,0.8) = rose와 같은 색상(hue)에 채도 100%·명도 27%.
 * 어떤 카테고리 색이든 같은 규칙으로 진하게 만듦.
 */
export function tapeColor(hex: string): string {
  const hue = hueOf(hex)
  return `hsla(${hue.toFixed(1)}, 100%, 27%, 0.8)`
}

function hueOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return 0
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  return h < 0 ? h + 360 : h
}
