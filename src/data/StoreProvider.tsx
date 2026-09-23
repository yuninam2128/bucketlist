import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { mockCategories, mockCouple, mockDiaries, mockItems } from './mock'
import { StoreContext, type Store } from './store'

// 지금은 메모리 목업. Supabase 연결 시 이 파일만 교체하면 화면은 그대로 동작
export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(mockItems)

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))
  }, [])

  const store = useMemo<Store>(
    () => ({ couple: mockCouple, categories: mockCategories, items, diaries: mockDiaries, toggleItem }),
    [items, toggleItem],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
