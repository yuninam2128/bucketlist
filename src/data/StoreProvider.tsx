import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { toYmd } from '../lib/date'
import type { LocalPhoto } from '../lib/photos'
import { clearCachedUrls, forgetUrl, loadCachedUrls, pruneCachedUrls, saveSignedUrls } from '../lib/photoUrlCache'
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

// 비공개 사진은 서명된 URL로 보여줌 (7일짜리). 발급받은 주소는 폰에 기억해 두고 만료 전까지 재사용 (lib/photoUrlCache)
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
  // Storage 경로 → 보여줄 URL (지난번에 받아둔 서명 URL로 시작 → 사진이 브라우저 캐시에서 바로 뜸)
  const [urls, setUrls] = useState<Record<string, string>>(loadCachedUrls)
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
    const entries = signed.flatMap((s) => (s.path && s.signedUrl ? [{ path: s.path, url: s.signedUrl }] : []))
    saveSignedUrls(entries, SIGNED_URL_TTL)
    setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries.map((e) => [e.path, e.url])) }))
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
    const paths = [...memoryList.flatMap((m) => [...m.photos, m.sticker_path]), ...profileRows.map((p) => p.avatar_path)]
    await signPaths(paths)
    pruneCachedUrls(new Set(paths.filter((p): p is string => !!p)))
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

  // 사진이 안 뜨면(주소 만료 등) 그 사진만 새 주소로 다시 받음 — 경로마다 한 번만 시도
  useEffect(() => {
    const retried = new Set<string>()
    const onError = (e: Event) => {
      const img = e.target
      if (!(img instanceof HTMLImageElement) || !img.src.includes('/storage/v1/object/sign/')) return
      const path = Object.keys(urlsRef.current).find((p) => urlsRef.current[p] === img.src)
      if (!path || retried.has(path)) return
      retried.add(path)
      forgetUrl(path)
      const without = { ...urlsRef.current }
      delete without[path]
      // signPaths 가 바로 "없는 주소"로 보고 새로 발급하게 ref도 먼저 갱신
      urlsRef.current = without
      setUrls(without)
      signPaths([path]).catch(console.error)
    }
    // img 의 error 이벤트는 버블링되지 않아서 capture 로 받음
    document.addEventListener('error', onError, true)
    return () => document.removeEventListener('error', onError, true)
  }, [signPaths])

  // ---- 사진 올리기 ----
  const uploadPhoto = async (folder: string, photo: Blob, preview?: string, name = `${randomName()}.jpg`) => {
    const path = `${coupleId}/${folder}/${name}`
    must(
      await supabase.storage
        .from(PHOTO_BUCKET)
        // 파일 이름이 매번 새로 생겨 내용이 안 바뀌므로 브라우저가 1년 캐시해도 됨 (기본 1시간)
        .upload(path, photo, { contentType: photo.type || 'image/jpeg', upsert: true, cacheControl: '31536000' }),
    )
    // 방금 올린 건 서명 URL 기다리지 않고 로컬 미리보기로 바로 보여줌
    setUrls((prev) => ({ ...prev, [path]: preview ?? URL.createObjectURL(photo) }))
    return path
  }

  const replaceMemory = (row: MemoryRow) => setMemoryRows((prev) => prev.map((m) => (m.id === row.id ? row : m)))

  // 누끼가 늦게 끝나도 추억에 붙여줌. 실패하면 스티커 없이(점) 표시
  const attachSticker = (memoryId: string, stickerJob?: Promise<Blob>) =>
    stickerJob?.then((blob) => saveSticker(memoryId, blob)).catch(console.error)

  // 스티커 파일은 매번 새 이름으로 (같은 이름이면 짝꿍 폰 캐시에 예전 스티커가 남을 수 있음), 예전 파일은 정리
  const saveSticker = async (memoryId: string, blob: Blob) => {
    const old = memoryRows.find((m) => m.id === memoryId)?.sticker_path
    const path = await uploadPhoto(memoryId, blob, undefined, `sticker-${randomName()}.png`)
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
    if (old) supabase.storage.from(PHOTO_BUCKET).remove([old])
  }

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

  /** 이 항목들로 남긴 추억의 사진·스티커 파일 지우기 */
  const removeMemoryFiles = async (itemIds: Set<string>) => {
    const paths = memoryRows
      .filter((m) => m.item_id && itemIds.has(m.item_id))
      .flatMap((m) => [...m.photos, ...(m.sticker_path ? [m.sticker_path] : [])])
    if (paths.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
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
      clearCachedUrls()
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
      // 예전에 완료 취소하면서 추억을 남겨뒀으면 새로 만들지 않고 거기에 이어 붙임 (카드 중복 방지)
      const existing = memoryRows.find((m) => m.item_id === id)
      if (!existing && photos.length === 0 && !note) return
      let memory = existing ?? (await insertMemory(id, date))
      if (existing && existing.date !== date) {
        memory = must(
          await supabase.from('memories').update({ date }).eq('id', existing.id).select().single<MemoryRow>(),
        )
        replaceMemory(memory)
      }
      if (note) await upsertMyNote(memory.id, note)
      if (photos.length > 0) {
        memory = await appendPhotos(memory, photos)
        replaceMemory(memory)
      }
      // 이미 스티커가 있으면 그대로 둠
      if (!memory.sticker_path) attachSticker(memory.id, stickerJob)
    },

    uncompleteItem: async (id, { removeMemory = false } = {}) => {
      await updateItemRow(id, { done: false })
      if (!removeMemory) return
      // 추억(한마디는 FK cascade) + 사진 파일까지 정리
      await removeMemoryFiles(new Set([id]))
      must(await supabase.from('memories').delete().eq('item_id', id))
      setMemoryRows((prev) => prev.filter((m) => m.item_id !== id))
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

    setSticker: (diaryId, sticker) => saveSticker(diaryId, sticker),

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
      // 완료한 항목의 날짜 = 완료일이라, 그 추억(캘린더 카드·스티커)도 같은 날로 옮김
      const done = itemRows.find((it) => it.id === id)?.done
      const moved = memoryRows.filter((m) => m.item_id === id && m.date !== date)
      if (!done || !date || moved.length === 0) return
      const rows = must(await supabase.from('memories').update({ date }).eq('item_id', id).select()) as MemoryRow[]
      setMemoryRows((prev) => prev.map((m) => rows.find((r) => r.id === m.id) ?? m))
    },

    deleteItem: async (id) => {
      // 추억/한마디는 FK cascade로 같이 지워지고, 사진 파일은 직접 정리
      await removeMemoryFiles(new Set([id]))
      must(await supabase.from('bucket_items').delete().eq('id', id))
      setItemRows((prev) => prev.filter((it) => it.id !== id))
      setMemoryRows((prev) => prev.filter((m) => m.item_id !== id))
    },

    updateCategory: async (id, { title, color }) => {
      const row = must(
        await supabase.from('categories').update({ title, color }).eq('id', id).select().single<CategoryRow>(),
      )
      setCategoryRows((prev) => prev.map((c) => (c.id === id ? row : c)))
    },

    deleteCategory: async (id) => {
      // 버킷리스트 → 추억 → 한마디 까지 FK cascade, 사진 파일은 직접 정리
      const itemIds = new Set(itemRows.filter((it) => it.category_id === id).map((it) => it.id))
      await removeMemoryFiles(itemIds)
      must(await supabase.from('categories').delete().eq('id', id))
      setCategoryRows((prev) => prev.filter((c) => c.id !== id))
      setItemRows((prev) => prev.filter((it) => it.category_id !== id))
      setMemoryRows((prev) => prev.filter((m) => !m.item_id || !itemIds.has(m.item_id)))
    },

    removePhoto: async (diaryId, index) => {
      const memory = memoryRows.find((m) => m.id === diaryId)
      const path = memory?.photos[index]
      if (!memory || !path) return
      replaceMemory(
        must(
          await supabase
            .from('memories')
            .update({ photos: memory.photos.filter((_, i) => i !== index) })
            .eq('id', diaryId)
            .select()
            .single<MemoryRow>(),
        ),
      )
      await supabase.storage.from(PHOTO_BUCKET).remove([path])
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
