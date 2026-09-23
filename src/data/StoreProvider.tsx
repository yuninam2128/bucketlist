import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toYmd } from '../lib/date'
import type { Author, Category, DiaryEntry } from '../types'
import { mockCategories, mockCouple, mockDiaries, mockItems } from './mock'
import { StoreContext, type Completion, type NewCategory, type NewItem, type Store } from './store'

// 임시 id (Supabase 연결 후엔 DB가 발급). randomUUID는 http 폰 테스트에서 안 돼서 사용 안 함
const tempId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

// TODO: 로그인 붙이면 로그인한 사람으로
const currentUser: Author = 'me'

// 지금은 메모리 목업. Supabase 연결 시 이 파일만 교체하면 화면은 그대로 동작
export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState(mockCategories)
  const [items, setItems] = useState(mockItems)
  const [diaries, setDiaries] = useState(mockDiaries)

  // 누끼가 늦게 끝나도 기록에 붙여줌. 실패하면 스티커 없이(빨간 점) 표시
  const attachSticker = (diaryId: string, stickerJob?: Promise<string>) =>
    stickerJob
      ?.then((sticker) => setDiaries((prev) => prev.map((d) => (d.id === diaryId ? { ...d, sticker } : d))))
      .catch(() => {})

  const completeItem = useCallback((id: string, { date, photos, note, stickerJob }: Completion) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: true, date } : it)))
    if (photos.length === 0 && !note) return
    const entry: DiaryEntry = {
      id: tempId(),
      date,
      bucketItemId: id,
      photos,
      notes: note ? [{ author: currentUser, text: note }] : [],
    }
    setDiaries((prev) => [...prev, entry])
    attachSticker(entry.id, stickerJob)
  }, [])

  const uncompleteItem = useCallback((id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: false } : it)))
  }, [])

  const saveNote = useCallback((diaryId: string, text: string) => {
    const trimmed = text.trim()
    setDiaries((prev) =>
      prev.map((d) => {
        if (d.id !== diaryId) return d
        const others = d.notes.filter((n) => n.author !== currentUser)
        const mine = d.notes.find((n) => n.author === currentUser)
        if (!trimmed) return { ...d, notes: others }
        // 이미 쓴 한마디는 제자리에서 수정, 처음이면 뒤에 추가
        const notes = mine
          ? d.notes.map((n) => (n.author === currentUser ? { ...n, text: trimmed } : n))
          : [...d.notes, { author: currentUser, text: trimmed }]
        return { ...d, notes }
      }),
    )
  }, [])

  const addPhotos = useCallback((diaryId: string, photos: string[], stickerJob?: Promise<string>) => {
    setDiaries((prev) => prev.map((d) => (d.id === diaryId ? { ...d, photos: [...d.photos, ...photos] } : d)))
    attachSticker(diaryId, stickerJob)
  }, [])

  const startMemory = useCallback(
    (itemId: string) => {
      const item = items.find((it) => it.id === itemId)
      const entry: DiaryEntry = {
        id: tempId(),
        date: item?.date ?? toYmd(new Date()),
        bucketItemId: itemId,
        photos: [],
        notes: [],
      }
      setDiaries((prev) => [...prev, entry])
      return entry.id
    },
    [items],
  )

  const addCategory = useCallback((input: NewCategory) => {
    const category: Category = { id: tempId(), coverPhotos: [], ...input }
    setCategories((prev) => [...prev, category])
    return category
  }, [])

  const addItem = useCallback((input: NewItem) => {
    setItems((prev) => [...prev, { id: tempId(), done: false, author: currentUser, ...input }])
  }, [])

  const updateItem = useCallback((id: string, input: NewItem) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...input } : it)))
  }, [])

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
    setDiaries((prev) => prev.filter((d) => d.bucketItemId !== id))
  }, [])

  const store = useMemo<Store>(
    () => ({
      currentUser,
      couple: mockCouple,
      categories,
      items,
      diaries,
      completeItem,
      uncompleteItem,
      saveNote,
      addPhotos,
      startMemory,
      addCategory,
      addItem,
      updateItem,
      deleteItem,
    }),
    [categories, items, diaries, completeItem, uncompleteItem, saveNote, addPhotos, startMemory, addCategory, addItem, updateItem, deleteItem],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
