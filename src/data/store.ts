import { createContext, useContext } from 'react'
import type { BucketItem, Category, CategoryColor, Couple, DiaryEntry } from '../types'

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
}

export interface Store {
  couple: Couple
  categories: Category[]
  items: BucketItem[]
  diaries: DiaryEntry[]
  /** 완료 처리 + 사진/소감이 있으면 그 날짜의 캘린더 기록으로 저장 */
  completeItem: (id: string, completion: Completion) => void
  /** 완료 취소 (남긴 기록은 유지) */
  uncompleteItem: (id: string) => void
  addCategory: (input: NewCategory) => Category
  addItem: (input: NewItem) => void
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore는 StoreProvider 안에서만 쓸 수 있어요')
  return store
}
