import { createContext, useContext } from 'react'
import type { BucketItem, Category, Couple, DiaryEntry } from '../types'

export interface Store {
  couple: Couple
  categories: Category[]
  items: BucketItem[]
  diaries: DiaryEntry[]
  toggleItem: (id: string) => void
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore는 StoreProvider 안에서만 쓸 수 있어요')
  return store
}
