// 나중에 Supabase 테이블 스키마의 기준이 되는 타입들

export type Author = 'me' | 'partner'

export interface Category {
  id: string
  /** 폴더·스티커·배지에 공통으로 쓰는 이름 (예: "영화 뭐볼까") */
  title: string
  /** 팔레트(lib/categoryColors) 중 하나의 hex */
  color: string
  /** 폴더에서 삐져나오는 대표 사진 (최대 3장 표시) */
  coverPhotos: string[]
}

export interface BucketItem {
  id: string
  categoryId: string
  title: string
  done: boolean
  /** 목표일, 완료하면 완료일 (YYYY-MM-DD) */
  date?: string
  author: Author
}

export interface Couple {
  /** 사귄 날 (YYYY-MM-DD) — D+N 계산 기준 */
  startDate: string
  /** 일기 메모에 붙는 각자 닉네임 */
  names: Record<Author, string>
}

/** 추억: 버킷리스트를 완료하며 남긴 사진 여러 장 + 각자 한마디. 캘린더에 표시 */
export interface DiaryEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** 이 기록을 남긴 완료 항목 */
  bucketItemId?: string
  photos: string[]
  /** 대표 사진(첫 장) 누끼 PNG — 캘린더 칸에 스티커로 붙음 */
  sticker?: string
  notes: { author: Author; text: string }[]
}
