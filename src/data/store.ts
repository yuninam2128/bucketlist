import { createContext, useContext } from 'react'
import type { Author, BucketItem, Category, CategoryColor, Couple, DiaryEntry } from '../types'

export interface NewCategory {
  title: string
  description?: string
  color: CategoryColor
}

export interface NewItem {
  title: string
  categoryId: string
  date?: string
}

export interface Completion {
  /** 완료한 날 (YYYY-MM-DD) */
  date: string
  /** 사진 URL (최대 2장) */
  photos: string[]
  note?: string
  /** 대표 사진 누끼 작업 (오래 걸려서 완료 후에도 백그라운드로 계속) */
  stickerJob?: Promise<string>
}

export interface Store {
  /** 지금 앱을 쓰는 사람 (로그인 붙이기 전까진 'me' 고정) */
  currentUser: Author
  couple: Couple
  categories: Category[]
  items: BucketItem[]
  diaries: DiaryEntry[]
  /** 완료 처리 + 사진/소감이 있으면 그 날짜의 캘린더 기록으로 저장 (누끼는 준비되면 자동으로 붙음) */
  completeItem: (id: string, completion: Completion) => void
  /** 완료 취소 (남긴 기록은 유지) */
  uncompleteItem: (id: string) => void
  /** 기록에 내 한마디 남기기/수정 (빈 문자열이면 삭제) */
  saveNote: (diaryId: string, text: string) => void
  addCategory: (input: NewCategory) => Category
  addItem: (input: NewItem) => void
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore는 StoreProvider 안에서만 쓸 수 있어요')
  return store
}
