import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('.env.local 에 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 를 넣어주세요')
}

// 로그인 세션은 브라우저(홈 화면 앱)에 저장돼서 한 번 로그인하면 유지됨
export const supabase = createClient(url, key)

export const PHOTO_BUCKET = 'photos'

// ---- DB 행 타입 (supabase/schema.sql 과 맞춤) ----

export interface CoupleRow {
  id: string
  start_date: string | null
  invite_code: string
}

export interface ProfileRow {
  id: string
  couple_id: string | null
  nickname: string
  avatar_path: string | null
}

export interface CategoryRow {
  id: string
  couple_id: string
  title: string
  color: string
  created_at: string
}

export interface ItemRow {
  id: string
  couple_id: string
  category_id: string
  title: string
  done: boolean
  date: string | null
  author_id: string | null
  created_at: string
}

export interface MemoryRow {
  id: string
  couple_id: string
  item_id: string | null
  date: string
  photos: string[]
  sticker_path: string | null
  created_at: string
}

export interface NoteRow {
  memory_id: string
  author_id: string
  text: string
}
