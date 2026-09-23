import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Category, DiaryEntry } from '../types'
import { mockCategories, mockCouple, mockDiaries, mockItems } from './mock'
import { StoreContext, type Completion, type NewCategory, type NewItem, type Store } from './store'

// 임시 id (Supabase 연결 후엔 DB가 발급). randomUUID는 http 폰 테스트에서 안 돼서 사용 안 함
const tempId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

// 지금은 메모리 목업. Supabase 연결 시 이 파일만 교체하면 화면은 그대로 동작
export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState(mockCategories)
  const [items, setItems] = useState(mockItems)
  const [diaries, setDiaries] = useState(mockDiaries)

  const completeItem = useCallback((id: string, { date, photos, note }: Completion) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: true, date } : it)))
    if (photos.length === 0 && !note) return
    // TODO: 로그인 붙이면 실제 작성자로
    const entry: DiaryEntry = {
      id: tempId(),
      date,
      bucketItemId: id,
      photos,
      notes: note ? [{ author: 'me', text: note }] : [],
    }
    setDiaries((prev) => [...prev, entry])
  }, [])

  const uncompleteItem = useCallback((id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: false } : it)))
  }, [])

  const addCategory = useCallback((input: NewCategory) => {
    const category: Category = { id: tempId(), coverPhotos: [], ...input }
    setCategories((prev) => [...prev, category])
    return category
  }, [])

  const addItem = useCallback((input: NewItem) => {
    setItems((prev) => [...prev, { id: tempId(), done: false, author: 'me', ...input }])
  }, [])

  const store = useMemo<Store>(
    () => ({
      couple: mockCouple,
      categories,
      items,
      diaries,
      completeItem,
      uncompleteItem,
      addCategory,
      addItem,
    }),
    [categories, items, diaries, completeItem, uncompleteItem, addCategory, addItem],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
