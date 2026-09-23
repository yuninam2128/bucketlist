import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Category } from '../types'
import { mockCategories, mockCouple, mockDiaries, mockItems } from './mock'
import { StoreContext, type NewCategory, type Store } from './store'

// 지금은 메모리 목업. Supabase 연결 시 이 파일만 교체하면 화면은 그대로 동작
export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState(mockCategories)
  const [items, setItems] = useState(mockItems)

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))
  }, [])

  const addCategory = useCallback((input: NewCategory) => {
    // 임시 id (Supabase 연결 후엔 DB가 발급). randomUUID는 http 폰 테스트에서 안 돼서 사용 안 함
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
    const category: Category = { id, coverPhotos: [], ...input }
    setCategories((prev) => [...prev, category])
    return category
  }, [])

  const store = useMemo<Store>(
    () => ({ couple: mockCouple, categories, items, diaries: mockDiaries, toggleItem, addCategory }),
    [categories, items, toggleItem, addCategory],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
