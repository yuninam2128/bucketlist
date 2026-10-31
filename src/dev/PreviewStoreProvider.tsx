import { useState, type ReactNode } from 'react'
import { StoreContext, type Store } from '../data/store'
import type { BucketItem, Category, DiaryEntry } from '../types'
import { mockCategories, mockCouple, mockDiaries, mockItems } from './mock'

const tempId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const noop = async () => {}

/**
 * 개발용 미리보기: 로그인·Supabase 없이 가짜 데이터로 화면만 띄움.
 * `npm run dev` 에서 주소 끝에 ?preview 를 붙이면 켜짐 (main.tsx). 저장은 메모리에만.
 */
export function PreviewStoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(mockCategories)
  const [items, setItems] = useState<BucketItem[]>(mockItems)
  const [diaries, setDiaries] = useState<DiaryEntry[]>(mockDiaries)

  const store: Store = {
    status: 'ready',
    retry: () => {},
    email: 'preview@example.com',
    sendCode: noop,
    verifyCode: noop,
    createCouple: noop,
    joinCouple: noop,
    signOut: noop,

    currentUser: 'me',
    couple: mockCouple,
    categories,
    items,
    diaries,

    completeItem: async (id, { date, photos, note }) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: true, date } : it)))
      // 남겨둔 추억이 있으면 거기에 이어 붙임
      if (diaries.some((d) => d.bucketItemId === id)) {
        setDiaries((prev) =>
          prev.map((d) =>
            d.bucketItemId !== id
              ? d
              : {
                  ...d,
                  date,
                  photos: [...d.photos, ...photos.map((p) => p.url)],
                  notes: note ? [...d.notes.filter((n) => n.author !== 'me'), { author: 'me', text: note }] : d.notes,
                },
          ),
        )
        return
      }
      if (photos.length === 0 && !note) return
      setDiaries((prev) => [
        ...prev,
        {
          id: tempId(),
          date,
          bucketItemId: id,
          photos: photos.map((p) => p.url),
          notes: note ? [{ author: 'me', text: note }] : [],
        },
      ])
    },
    uncompleteItem: async (id, { removeMemory = false } = {}) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: false } : it)))
      if (removeMemory) setDiaries((prev) => prev.filter((d) => d.bucketItemId !== id))
    },
    saveNote: async (diaryId, text) =>
      setDiaries((prev) =>
        prev.map((d) =>
          d.id !== diaryId
            ? d
            : {
                ...d,
                notes: [
                  ...d.notes.filter((n) => n.author !== 'me'),
                  ...(text.trim() ? [{ author: 'me' as const, text: text.trim() }] : []),
                ],
              },
        ),
      ),
    addPhotos: async (diaryId, photos) =>
      setDiaries((prev) =>
        prev.map((d) => (d.id === diaryId ? { ...d, photos: [...d.photos, ...photos.map((p) => p.url)] } : d)),
      ),
    // 미리보기는 서버가 없으니 "올린 경로" = 미리보기 URL
    preUpload: async (photo) => photo.url,
    discardUploads: () => {},
    whenUploadsIdle: async () => {},
    saving: { busy: false, photosDone: 0, photosTotal: 0 },
    setSticker: async (diaryId, sticker) => {
      const url = URL.createObjectURL(sticker)
      setDiaries((prev) => prev.map((d) => (d.id === diaryId ? { ...d, sticker: url } : d)))
    },
    startMemory: async (itemId) => {
      const id = tempId()
      const item = items.find((it) => it.id === itemId)
      setDiaries((prev) => [...prev, { id, date: item?.date ?? '2026-01-01', bucketItemId: itemId, photos: [], notes: [] }])
      return id
    },
    addCategory: async (input) => setCategories((prev) => [...prev, { id: tempId(), coverPhotos: [], ...input }]),
    updateCategory: async (id, input) => setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c))),
    deleteCategory: async (id) => {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setItems((prev) => prev.filter((it) => it.categoryId !== id))
    },
    removePhoto: async (diaryId, index) =>
      setDiaries((prev) =>
        prev.map((d) => (d.id === diaryId ? { ...d, photos: d.photos.filter((_, i) => i !== index) } : d)),
      ),
    addItem: async (input) => setItems((prev) => [...prev, { id: tempId(), done: false, author: 'me', ...input }]),
    updateItem: async (id, input) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...input } : it)))
      // 완료한 항목이면 추억 날짜도 같이
      if (items.find((it) => it.id === id)?.done && input.date)
        setDiaries((prev) => prev.map((d) => (d.bucketItemId === id ? { ...d, date: input.date! } : d)))
    },
    deleteItem: async (id) => {
      setItems((prev) => prev.filter((it) => it.id !== id))
      setDiaries((prev) => prev.filter((d) => d.bucketItemId !== id))
    },
    updateProfile: noop,
    updateStartDate: noop,
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
