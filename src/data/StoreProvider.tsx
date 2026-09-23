import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { toYmd } from '../lib/date'
import type { LocalPhoto } from '../lib/photos'
import {
  PHOTO_BUCKET,
  supabase,
  type CategoryRow,
  type CoupleRow,
  type ItemRow,
  type MemoryRow,
  type NoteRow,
  type ProfileRow,
} from '../lib/supabase'
import type { Author, BucketItem, Category, Couple, DiaryEntry } from '../types'
import { StoreContext, type AuthStatus, type NewItem, type Store } from './store'

// 비공개 사진은 서명된 URL로 보여줌 (7일짜리, 앱을 다시 열면 새로 받음)
const SIGNED_URL_TTL = 60 * 60 * 24 * 7

const randomName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/** Supabase 응답에서 에러면 던지고 아니면 data */
function must<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error
  return res.data as NonNullable<T>
}

// Supabase 연결 버전. 화면들은 useStore()만 쓰기 때문에 목업 때와 같은 모양(Store)으로 바꿔서 내려줌
export function StoreProvider({ children }: { children: ReactNode }) {
  // undefined = 세션 확인 중
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [me, setMe] = useState<ProfileRow | null>(null)
  const [partner, setPartner] = useState<ProfileRow | null>(null)
  const [coupleRow, setCoupleRow] = useState<CoupleRow | null>(null)
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [memoryRows, setMemoryRows] = useState<MemoryRow[]>([])
  const [noteRows, setNoteRows] = useState<NoteRow[]>([])
  // Storage 경로 → 보여줄 URL
  const [urls, setUrls] = useState<Record<string, string>>({})
  const urlsRef = useRef(urls)
  useEffect(() => {
    urlsRef.current = urls
  }, [urls])

  const userId = session?.user.id
  const coupleId = me?.couple_id ?? null

  // ---- 세션 ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const signPaths = useCallback(async (paths: (string | null | undefined)[]) => {
    const missing = [...new Set(paths.filter((p): p is string => !!p && !urlsRef.current[p]))]
    if (missing.length === 0) return
    const signed = must(await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(missing, SIGNED_URL_TTL))
    const next: Record<string, string> = {}
    for (const s of signed) if (s.path && s.signedUrl) next[s.path] = s.signedUrl
    setUrls((prev) => ({ ...prev, ...next }))
  }, [])

  // ---- 우리 커플 데이터 전부 불러오기 (권한 규칙이 알아서 우리 것만 줌) ----
  const load = useCallback(async () => {
    if (!userId) return
    // 프로필이 아직 없으면(트리거 전에 가입 등) 커플 연결 전으로 취급 — create/join 함수가 만들어 줌
    const profile = must(
      await supabase.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>(),
    ) ?? { id: userId, couple_id: null, nickname: '', avatar_path: null }
    setMe(profile)
    if (!profile.couple_id) {
      setLoaded(true)
      return
    }
    const [couple, profiles, categories, items, memories, notes] = await Promise.all([
      supabase.from('couples').select('*').eq('id', profile.couple_id).single<CoupleRow>(),
      supabase.from('profiles').select('*'),
      supabase.from('categories').select('*').order('created_at'),
      supabase.from('bucket_items').select('*').order('created_at'),
      supabase.from('memories').select('*').order('created_at'),
      supabase.from('memory_notes').select('*').order('author_id'),
    ])
    const profileRows = must(profiles) as ProfileRow[]
    const memoryList = must(memories) as MemoryRow[]
    setCoupleRow(must(couple))
    setPartner(profileRows.find((p) => p.id !== userId) ?? null)
    setCategoryRows(must(categories) as CategoryRow[])
    setItemRows(must(items) as ItemRow[])
    setMemoryRows(memoryList)
    setNoteRows(must(notes) as NoteRow[])
    await signPaths([
      ...memoryList.flatMap((m) => [...m.photos, m.sticker_path]),
      ...profileRows.map((p) => p.avatar_path),
    ])
    setLoaded(true)
  }, [userId, signPaths])

  useEffect(() => {
    if (!userId) return
    load()
      .then(() => setLoadError(undefined))
      .catch((e) => {
        console.error(e)
        setLoadError(e instanceof Error ? e.message : String(e?.message ?? e))
      })
  }, [userId, load])

  // 앱으로 돌아올 때마다 새로고침 → 짝꿍이 바꾼 것도 보임
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load().catch(console.error)
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  // ---- 사진 올리기 ----
  const uploadPhoto = async (folder: string, photo: Blob, preview?: string, name = `${randomName()}.jpg`) => {
    const path = `${coupleId}/${folder}/${name}`
    must(
      await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, photo, { contentType: photo.type || 'image/jpeg', upsert: true }),
    )
    // 방금 올린 건 서명 URL 기다리지 않고 로컬 미리보기로 바로 보여줌
    setUrls((prev) => ({ ...prev, [path]: preview ?? URL.createObjectURL(photo) }))
    return path
  }

  const replaceMemory = (row: MemoryRow) => setMemoryRows((prev) => prev.map((m) => (m.id === row.id ? row : m)))

  // 누끼가 늦게 끝나도 추억에 붙여줌. 실패하면 스티커 없이(점) 표시
  const attachSticker = (memoryId: string, stickerJob?: Promise<Blob>) =>
    stickerJob
      ?.then(async (blob) => {
        const path = await uploadPhoto(memoryId, blob, undefined, 'sticker.png')
        replaceMemory(
          must(
            await supabase
              .from('memories')
              .update({ sticker_path: path })
              .eq('id', memoryId)
              .select()
              .single<MemoryRow>(),
          ),
        )
      })
      .catch(console.error)

  const appendPhotos = async (memory: MemoryRow, photos: LocalPhoto[]) => {
    const paths = await Promise.all(photos.map((p) => uploadPhoto(memory.id, p.blob, p.url)))
    return must(
      await supabase
        .from('memories')
        .update({ photos: [...memory.photos, ...paths] })
        .eq('id', memory.id)
        .select()
        .single<MemoryRow>(),
    )
  }

  const upsertMyNote = async (memoryId: string, text: string) => {
    const row = must(
      await supabase
        .from('memory_notes')
        .upsert({ memory_id: memoryId, author_id: userId, text, updated_at: new Date().toISOString() })
        .select()
        .single<NoteRow>(),
    )
    setNoteRows((prev) => [...prev.filter((n) => !(n.memory_id === memoryId && n.author_id === userId)), row])
  }

  const insertMemory = async (itemId: string, date: string) => {
    const row = must(
      await supabase
        .from('memories')
        .insert({ couple_id: coupleId, item_id: itemId, date })
        .select()
        .single<MemoryRow>(),
    )
    setMemoryRows((prev) => [...prev, row])
    return row
  }

  const updateItemRow = async (id: string, patch: Partial<ItemRow>) => {
    const row = must(await supabase.from('bucket_items').update(patch).eq('id', id).select().single<ItemRow>())
    setItemRows((prev) => prev.map((it) => (it.id === row.id ? row : it)))
  }

  // ---- 화면용 모양으로 바꾸기 ----
  const authorOf = (id: string | null): Author => (id === userId ? 'me' : 'partner')

  const couple: Couple = {
    startDate: coupleRow?.start_date ?? toYmd(new Date()),
    names: { me: me?.nickname || '나', partner: partner?.nickname || '짝꿍' },
    avatars: {
      me: me?.avatar_path ? urls[me.avatar_path] : undefined,
      partner: partner?.avatar_path ? urls[partner.avatar_path] : undefined,
    },
    inviteCode: coupleRow?.invite_code ?? '',
    partnerJoined: !!partner,
  }

  const categories: Category[] = categoryRows.map((c) => ({ id: c.id, title: c.title, color: c.color, coverPhotos: [] }))

  const items: BucketItem[] = itemRows.map((it) => ({
    id: it.id,
    categoryId: it.category_id,
    title: it.title,
    done: it.done,
    date: it.date ?? undefined,
    author: authorOf(it.author_id),
  }))

  const diaries: DiaryEntry[] = memoryRows.map((m) => ({
    id: m.id,
    date: m.date,
    bucketItemId: m.item_id ?? undefined,
    photos: m.photos.map((p) => urls[p]).filter(Boolean),
    sticker: m.sticker_path ? urls[m.sticker_path] : undefined,
    notes: noteRows.filter((n) => n.memory_id === m.id).map((n) => ({ author: authorOf(n.author_id), text: n.text })),
  }))

  const status: AuthStatus =
    session === undefined
      ? 'loading'
      : !session
        ? 'signedOut'
        : loadError
          ? 'error'
          : !loaded
            ? 'loading'
            : !coupleId
              ? 'noCouple'
              : 'ready'

  const store: Store = {
    status,
    loadError,
    retry: () => {
      setLoadError(undefined)
      load().catch((e) => setLoadError(e instanceof Error ? e.message : String(e?.message ?? e)))
    },
    email: session?.user.email,

    // ---- 로그인: 이메일로 6자리 코드 ----
    sendCode: async (email) => {
      must(await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }))
    },
    verifyCode: async (email, code) => {
      must(await supabase.auth.verifyOtp({ email, token: code, type: 'email' }))
    },
    createCouple: async (nickname, startDate) => {
      must(await supabase.rpc('create_couple', { p_nickname: nickname, p_start_date: startDate }))
      await load()
    },
    joinCouple: async (inviteCode, nickname) => {
      must(await supabase.rpc('join_couple', { p_code: inviteCode, p_nickname: nickname }))
      await load()
    },
    signOut: async () => {
      await supabase.auth.signOut()
      setLoaded(false)
      setMe(null)
      setPartner(null)
      setCoupleRow(null)
      setCategoryRows([])
      setItemRows([])
      setMemoryRows([])
      setNoteRows([])
    },

    currentUser: 'me',
    couple,
    categories,
    items,
    diaries,

    completeItem: async (id, { date, photos, note, stickerJob }) => {
      await updateItemRow(id, { done: true, date })
      if (photos.length === 0 && !note) return
      let memory = await insertMemory(id, date)
      if (note) await upsertMyNote(memory.id, note)
      if (photos.length > 0) {
        memory = await appendPhotos(memory, photos)
        replaceMemory(memory)
      }
      attachSticker(memory.id, stickerJob)
    },

    uncompleteItem: async (id) => {
      await updateItemRow(id, { done: false })
    },

    saveNote: async (diaryId, text) => {
      const trimmed = text.trim()
      if (trimmed) return upsertMyNote(diaryId, trimmed)
      must(await supabase.from('memory_notes').delete().eq('memory_id', diaryId).eq('author_id', userId))
      setNoteRows((prev) => prev.filter((n) => !(n.memory_id === diaryId && n.author_id === userId)))
    },

    addPhotos: async (diaryId, photos, stickerJob) => {
      const memory = memoryRows.find((m) => m.id === diaryId)
      if (!memory) return
      replaceMemory(await appendPhotos(memory, photos))
      attachSticker(diaryId, stickerJob)
    },

    startMemory: async (itemId) => {
      const item = itemRows.find((it) => it.id === itemId)
      return (await insertMemory(itemId, item?.date ?? toYmd(new Date()))).id
    },

    addCategory: async ({ title, color }) => {
      const row = must(
        await supabase
          .from('categories')
          .insert({ couple_id: coupleId, title, color })
          .select()
          .single<CategoryRow>(),
      )
      setCategoryRows((prev) => [...prev, row])
    },

    addItem: async ({ title, categoryId, date }) => {
      const row = must(
        await supabase
          .from('bucket_items')
          .insert({ couple_id: coupleId, category_id: categoryId, title, date: date ?? null, author_id: userId })
          .select()
          .single<ItemRow>(),
      )
      setItemRows((prev) => [...prev, row])
    },

    updateItem: async (id, { title, categoryId, date }: NewItem) => {
      await updateItemRow(id, { title, category_id: categoryId, date: date ?? null })
    },

    deleteItem: async (id) => {
      // 추억 사진 파일도 같이 정리 (DB의 추억/한마디는 FK cascade로 지워짐)
      const memories = memoryRows.filter((m) => m.item_id === id)
      const paths = memories.flatMap((m) => [...m.photos, ...(m.sticker_path ? [m.sticker_path] : [])])
      if (paths.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
      must(await supabase.from('bucket_items').delete().eq('id', id))
      setItemRows((prev) => prev.filter((it) => it.id !== id))
      setMemoryRows((prev) => prev.filter((m) => m.item_id !== id))
    },

    updateProfile: async ({ nickname, avatar }) => {
      const patch: Partial<ProfileRow> = {}
      if (nickname !== undefined) patch.nickname = nickname
      if (avatar) patch.avatar_path = await uploadPhoto('avatars', avatar)
      const row = must(await supabase.from('profiles').update(patch).eq('id', userId).select().single<ProfileRow>())
      if (avatar && me?.avatar_path) supabase.storage.from(PHOTO_BUCKET).remove([me.avatar_path])
      setMe(row)
    },

    updateStartDate: async (date) => {
      setCoupleRow(
        must(await supabase.from('couples').update({ start_date: date }).eq('id', coupleId).select().single<CoupleRow>()),
      )
    },
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
