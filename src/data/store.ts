import { createContext, useContext } from 'react'
import type { BucketItem, Category, CategoryColor, Couple, DiaryEntry } from '../types'

export interface NewCategory {
  title: string
  description?: string
  color: CategoryColor
}

export interface Store {
  couple: Couple
  categories: Category[]
  items: BucketItem[]
  diaries: DiaryEntry[]
  toggleItem: (id: string) => void
  addCategory: (input: NewCategory) => Category
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore는 StoreProvider 안에서만 쓸 수 있어요')
  return store
}
