// 나중에 Supabase 테이블 스키마의 기준이 되는 타입들

export type Author = 'me' | 'partner'

/** Figma 카테고리 컴포넌트(64:592 배지, 64:605 폴더)의 6가지 색 */
export type CategoryColor = 'beige' | 'green' | 'pink' | 'purple' | 'blue' | 'rose'

export interface Category {
  id: string
  title: string
  color: CategoryColor
  /** 카테고리 스티커에 제목 아래로 들어가는 짧은 설명 (예: "뭐볼까") */
  description?: string
  /** 폴더에서 삐져나오는 대표 사진 (최대 3장 표시) */
  coverPhotos: string[]
}

export interface BucketItem {
  id: string
  categoryId: string
  title: string
  done: boolean
  /** 목표일 또는 완료일 (YYYY-MM-DD) */
  date?: string
  author: Author
}

export interface Couple {
  /** 사귄 날 (YYYY-MM-DD) — D+N 계산 기준 */
  startDate: string
  /** 일기 메모에 붙는 각자 닉네임 */
  names: Record<Author, string>
}

/** 캘린더 하루 기록: 사진 최대 2장 + 각자 한마디 */
export interface DiaryEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  photos: string[]
  notes: { author: Author; text: string }[]
}
