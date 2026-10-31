import type { Session } from '@supabase/supabase-js'
import { useIsRestoring, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { StoreContext, type AuthStatus, type NewItem, type SavingState, type Store } from './store'

// 비공개 사진은 서명된 URL로 보여줌 (7일짜리). 발급받은 주소는 폰에 기억해 두고 만료 전까지 재사용 (lib/photoUrlCache)
const SIGNED_URL_TTL = 60 * 60 * 24 * 7

const randomName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
/** 서버 응답 전에 화면에 먼저 넣는 행의 임시 id (응답이 오면 진짜 id로 바뀜) */
const tempId = () => `tmp-${randomName()}`

/** Supabase 응답에서 에러면 던지고 아니면 data */
function must<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error
  return res.data as NonNullable<T>
}

/** 우리 커플 데이터 전부 — TanStack Query 캐시 한 칸에 담기고 폰에도 저장됨 */
interface CoupleData {
  me: ProfileRow
  partner: ProfileRow | null
  couple: CoupleRow | null
  categories: CategoryRow[]
  items: ItemRow[]
  memories: MemoryRow[]
  notes: NoteRow[]
}

/** 권한 규칙(RLS)이 알아서 우리 커플 것만 줌 */
async function fetchCoupleData(userId: string): Promise<CoupleData> {
  // 프로필이 아직 없으면(트리거 전에 가입 등) 커플 연결 전으로 취급 — create/join 함수가 만들어 줌
  const me = must(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>()) ?? {
    id: userId,
    couple_id: null,
    nickname: '',
    avatar_path: null,
  }
  if (!me.couple_id) return { me, partner: null, couple: null, categories: [], items: [], memories: [], notes: [] }

  const [couple, profiles, categories, items, memories, notes] = await Promise.all([
    supabase.from('couples').select('*').eq('id', me.couple_id).single<CoupleRow>(),
    supabase.from('profiles').select('*'),
    supabase.from('categories').select('*').order('created_at'),
    supabase.from('bucket_items').select('*').order('created_at'),
    supabase.from('memories').select('*').order('created_at'),
    supabase.from('memory_notes').select('*').order('author_id'),
  ])
  return {
    me,
    partner: (must(profiles) as ProfileRow[]).find((p) => p.id !== userId) ?? null,
    couple: must(couple),
    categories: must(categories) as CategoryRow[],
    items: must(items) as ItemRow[],
    memories: must(memories) as MemoryRow[],
    notes: must(notes) as NoteRow[],
  }
}

const photoPathsOf = (m: MemoryRow) => [...m.photos, ...(m.sticker_path ? [m.sticker_path] : [])]

// Supabase 연결 버전. 화면들은 useStore()만 쓰기 때문에 같은 모양(Store)으로 바꿔서 내려줌.
// 서버 데이터는 TanStack Query 캐시(폰에 저장)에 두고, 고치기·지우기·체크는 화면을 먼저 바꾼 뒤
// 서버에 저장(낙관적 업데이트) — 실패하면 원래대로 되돌리고 알림(ErrorToast)
export function StoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const isRestoring = useIsRestoring()
  // undefined = 세션 확인 중
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // Storage 경로 → 보여줄 URL (지난번에 받아둔 서명 URL로 시작 → 사진이 브라우저 캐시에서 바로 뜸)
  const [urls, setUrls] = useState<Record<string, string>>(loadCachedUrls)
  const urlsRef = useRef(urls)
  useEffect(() => {
    urlsRef.current = urls
  }, [urls])

  // ---- 올리는 중 추적: 화면 위 진행 표시 + 앱 닫기 경고 + 누끼는 업로드 끝난 뒤에 ----
  const [saving, setSaving] = useState<SavingState>({ busy: false, photosDone: 0, photosTotal: 0 })
  const counts = useRef({ tasks: 0, photosDone: 0, photosTotal: 0 })
  const idleWaiters = useRef<(() => void)[]>([])
  const publishSaving = () => {
    const c = counts.current
    if (c.tasks === 0) {
      c.photosDone = 0
      c.photosTotal = 0
      idleWaiters.current.splice(0).forEach((resolve) => resolve())
    }
    setSaving({ busy: c.tasks > 0, photosDone: c.photosDone, photosTotal: c.photosTotal })
  }
  /** 이 작업이 끝날 때까지 저장 중으로 셈 (isPhoto면 사진 n/m에도 셈) */
  const track = <T,>(work: Promise<T>, isPhoto = false): Promise<T> => {
    counts.current.tasks++
    if (isPhoto) counts.current.photosTotal++
    publishSaving()
    return work.finally(() => {
      counts.current.tasks--
      if (isPhoto) counts.current.photosDone++
      publishSaving()
    })
  }

  // 올리는 중에 새로고침·탭 닫기를 하면 경고 (앱을 완전히 끄는 건 막을 수 없어서 진행 표시로도 안내)
  useEffect(() => {
    if (!saving.busy) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saving.busy])

  // ---- 세션 ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  // ---- 서버 데이터 (폰 캐시 → 즉시 표시, 뒤에서 새로고침. 앱으로 돌아오면 자동 새로고침) ----
  const dataKey = ['couple-data', userId] as const
  const query = useQuery({
    queryKey: dataKey,
    queryFn: () => fetchCoupleData(userId!),
    enabled: !!userId,
  })
  const data = query.data

  // 앱을 열 때는 폰에 저장된 데이터를 먼저 보여주되, 방금 저장된 것이어도 한 번은 꼭 새로 받아옴
  // (안 그러면 짝꿍이 그 사이 바꾼 게 30초 동안 안 보임).
  // refetchOnMount로는 안 됨: 세션 확인 뒤 userId가 생기며 키만 바뀌는 거라 staleTime만 보고 건너뜀
  const refreshedFor = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!userId || isRestoring || refreshedFor.current === userId) return
    refreshedFor.current = userId
    void qc.invalidateQueries({ queryKey: ['couple-data', userId] })
  }, [userId, isRestoring, qc])
  const coupleId = data?.me.couple_id ?? null

  /** 캐시의 지금 값 (비동기 작업 중에도 최신) */
  const current = () => qc.getQueryData<CoupleData>(dataKey)
  const patch = (fn: (d: CoupleData) => CoupleData) => qc.setQueryData<CoupleData>(dataKey, (d) => (d ? fn(d) : d))
  const setRows = <K extends keyof CoupleData>(key: K, fn: (rows: CoupleData[K]) => CoupleData[K]) =>
    patch((d) => ({ ...d, [key]: fn(d[key]) }))

  /** 화면 먼저 바꾸고(apply) 서버에 저장. 실패하면 되돌리고 에러를 다시 던짐(→ 알림) */
  const optimistic = async <T,>(apply: (d: CoupleData) => CoupleData, save: (before: CoupleData) => Promise<T>) => {
    await qc.cancelQueries({ queryKey: dataKey })
    const before = current()
    if (!before) throw new Error('데이터를 아직 못 불러왔어요')
    patch(apply)
    try {
      return await save(before)
    } catch (e) {
      qc.setQueryData(dataKey, before)
      throw e
    }
  }

  const signPaths = useCallback(async (paths: (string | null | undefined)[]) => {
    const missing = [...new Set(paths.filter((p): p is string => !!p && !urlsRef.current[p]))]
    if (missing.length === 0) return
    const signed = must(await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(missing, SIGNED_URL_TTL))
    const entries = signed.flatMap((s) => (s.path && s.signedUrl ? [{ path: s.path, url: s.signedUrl }] : []))
    saveSignedUrls(entries, SIGNED_URL_TTL)
    setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries.map((e) => [e.path, e.url])) }))
  }, [])

  // 데이터가 바뀌면 사진 주소 준비 (이미 기억해 둔 건 건너뜀) + 안 쓰는 주소 정리
  useEffect(() => {
    if (!data) return
    const paths = [...data.memories.flatMap(photoPathsOf), data.me.avatar_path, data.partner?.avatar_path]
    signPaths(paths)
      .then(() => pruneCachedUrls(new Set(paths.filter((p): p is string => !!p))))
      .catch(console.error)
  }, [data, signPaths])

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

  const replaceMemory = (row: MemoryRow) => setRows('memories', (rows) => rows.map((m) => (m.id === row.id ? row : m)))

  // 누끼가 늦게 끝나도 추억에 붙여줌. 실패하면 스티커 없이(점) 표시
  const attachSticker = (memoryId: string, stickerJob?: Promise<Blob>) =>
    stickerJob?.then((blob) => saveSticker(memoryId, blob)).catch(console.error)

  // 스티커 파일은 매번 새 이름으로 (같은 이름이면 짝꿍 폰 캐시에 예전 스티커가 남을 수 있음), 예전 파일은 정리
  const saveSticker = async (memoryId: string, blob: Blob) => {
    const old = current()?.memories.find((m) => m.id === memoryId)?.sticker_path
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

  /** 새 사진 올리기 — 추억이 생기기 전에도 올릴 수 있게 커플 폴더의 uploads/ 에 */
  const uploadNew = (photo: LocalPhoto) => track(uploadPhoto('uploads', photo.blob, photo.url), true)

  /** 미리 올린 사진은 끝나기만 기다리고, 실패했거나 안 올린 사진은 지금 (다시) 올림. 성공한 것만 추억에 붙임 */
  const appendPhotos = async (memoryId: string, photos: LocalPhoto[]) => {
    const results = await Promise.allSettled(
      photos.map((p) => (p.uploaded ?? Promise.reject(new Error('not uploaded'))).catch(() => uploadNew(p))),
    )
    const paths = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    // 업로드하는 동안 다른 사진이 붙었을 수 있어서 붙이기 직전의 최신 목록 기준
    const latest = current()?.memories.find((m) => m.id === memoryId)?.photos ?? []
    const row = must(
      await supabase
        .from('memories')
        .update({ photos: [...latest, ...paths] })
        .eq('id', memoryId)
        .select()
        .single<MemoryRow>(),
    )
    replaceMemory(row)
    // 일부라도 실패하면 알림(ErrorToast) — 성공한 사진은 이미 붙어 있음
    if (paths.length < photos.length) throw new Error(`사진 ${photos.length - paths.length}장을 올리지 못했어요`)
    return row
  }

  const saveMyNote = (memoryId: string, text: string) =>
    optimistic(
      (d) => ({
        ...d,
        notes: [
          ...d.notes.filter((n) => !(n.memory_id === memoryId && n.author_id === userId)),
          ...(text ? [{ memory_id: memoryId, author_id: userId!, text }] : []),
        ],
      }),
      async () => {
        if (!text) {
          must(await supabase.from('memory_notes').delete().eq('memory_id', memoryId).eq('author_id', userId))
          return
        }
        must(
          await supabase
            .from('memory_notes')
            .upsert({ memory_id: memoryId, author_id: userId, text, updated_at: new Date().toISOString() }),
        )
      },
    )

  const insertMemory = async (itemId: string, date: string) => {
    const row = must(
      await supabase
        .from('memories')
        .insert({ couple_id: coupleId, item_id: itemId, date })
        .select()
        .single<MemoryRow>(),
    )
    setRows('memories', (rows) => [...rows, row])
    return row
  }

  /** 항목 고치기: 화면 먼저, 서버 응답으로 확정 */
  const updateItemRow = (id: string, changes: Partial<ItemRow>) =>
    optimistic(
      (d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...changes } : it)) }),
      async () => {
        const row = must(await supabase.from('bucket_items').update(changes).eq('id', id).select().single<ItemRow>())
        setRows('items', (rows) => rows.map((it) => (it.id === row.id ? row : it)))
      },
    )

  /** 추억들의 사진·스티커 파일 지우기 */
  const removeFiles = async (memories: MemoryRow[]) => {
    const paths = memories.flatMap(photoPathsOf)
    if (paths.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  }

  // ---- 화면용 모양으로 바꾸기 ----
  const authorOf = (id: string | null): Author => (id === userId ? 'me' : 'partner')
  const me = data?.me ?? null
  const partner = data?.partner ?? null

  const couple: Couple = {
    startDate: data?.couple?.start_date ?? toYmd(new Date()),
    names: { me: me?.nickname || '나', partner: partner?.nickname || '짝꿍' },
    avatars: {
      me: me?.avatar_path ? urls[me.avatar_path] : undefined,
      partner: partner?.avatar_path ? urls[partner.avatar_path] : undefined,
    },
    inviteCode: data?.couple?.invite_code ?? '',
    partnerJoined: !!partner,
  }

  const categories: Category[] = (data?.categories ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    color: c.color,
    coverPhotos: [],
  }))

  const items: BucketItem[] = (data?.items ?? []).map((it) => ({
    id: it.id,
    categoryId: it.category_id,
    title: it.title,
    done: it.done,
    date: it.date ?? undefined,
    author: authorOf(it.author_id),
  }))

  const diaries: DiaryEntry[] = (data?.memories ?? []).map((m) => ({
    id: m.id,
    date: m.date,
    bucketItemId: m.item_id ?? undefined,
    photos: m.photos.map((p) => urls[p]).filter(Boolean),
    sticker: m.sticker_path ? urls[m.sticker_path] : undefined,
    notes: (data?.notes ?? [])
      .filter((n) => n.memory_id === m.id)
      .map((n) => ({ author: authorOf(n.author_id), text: n.text })),
  }))

  const loadError = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : undefined
  // 폰에 저장된 데이터가 있으면 새로고침 중이거나 오프라인이어도 바로 보여줌
  const status: AuthStatus =
    session === undefined || isRestoring
      ? 'loading'
      : !session
        ? 'signedOut'
        : data
          ? data.me.couple_id
            ? 'ready'
            : 'noCouple'
          : query.isError
            ? 'error'
            : 'loading'

  const refetch = async () => {
    await qc.invalidateQueries({ queryKey: dataKey })
  }

  const store: Store = {
    status,
    loadError,
    retry: () => {
      query.refetch()
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
      await refetch()
    },
    joinCouple: async (inviteCode, nickname) => {
      must(await supabase.rpc('join_couple', { p_code: inviteCode, p_nickname: nickname }))
      await refetch()
    },
    signOut: async () => {
      await supabase.auth.signOut()
      clearCachedUrls()
      // 폰에 저장된 데이터도 비움 (다른 계정으로 들어와도 안 보이게)
      qc.clear()
    },

    currentUser: 'me',
    couple,
    categories,
    items,
    diaries,

    // 팝업은 바로 닫히고 저장은 뒤에서 — 체크는 즉시 화면에, 끝날 때까지 "저장 중"(진행 표시·닫기 경고)
    completeItem: (id, { date, photos, note, stickerJob }) =>
      track(
        (async () => {
          await updateItemRow(id, { done: true, date })
          // 예전에 완료 취소하면서 추억을 남겨뒀으면 새로 만들지 않고 거기에 이어 붙임 (카드 중복 방지)
          const existing = current()?.memories.find((m) => m.item_id === id)
          if (!existing && photos.length === 0 && !note) return
          let memory = existing ?? (await insertMemory(id, date))
          if (existing && existing.date !== date) {
            memory = must(
              await supabase.from('memories').update({ date }).eq('id', existing.id).select().single<MemoryRow>(),
            )
            replaceMemory(memory)
          }
          if (note) await saveMyNote(memory.id, note)
          // 이미 스티커가 있으면 그대로 둠. 사진 일부가 실패해도 스티커는 붙임
          const sticker = memory.sticker_path ? undefined : stickerJob
          try {
            if (photos.length > 0) memory = await appendPhotos(memory.id, photos)
          } finally {
            attachSticker(memory.id, sticker)
          }
        })(),
      ),

    uncompleteItem: (id, { removeMemory = false } = {}) =>
      optimistic(
        (d) => ({
          ...d,
          items: d.items.map((it) => (it.id === id ? { ...it, done: false } : it)),
          memories: removeMemory ? d.memories.filter((m) => m.item_id !== id) : d.memories,
        }),
        async (before) => {
          must(await supabase.from('bucket_items').update({ done: false }).eq('id', id))
          if (!removeMemory) return
          // 추억(한마디는 FK cascade) + 사진 파일까지 정리
          await removeFiles(before.memories.filter((m) => m.item_id === id))
          must(await supabase.from('memories').delete().eq('item_id', id))
        },
      ),

    saveNote: (diaryId, text) => saveMyNote(diaryId, text.trim()),

    addPhotos: (diaryId, photos, stickerJob) =>
      track(
        (async () => {
          try {
            await appendPhotos(diaryId, photos)
          } finally {
            attachSticker(diaryId, stickerJob)
          }
        })(),
      ),

    preUpload: uploadNew,
    discardUploads: (paths) => {
      if (paths.length > 0) supabase.storage.from(PHOTO_BUCKET).remove(paths).catch(console.error)
    },
    whenUploadsIdle: () =>
      counts.current.tasks === 0 ? Promise.resolve() : new Promise((resolve) => idleWaiters.current.push(resolve)),
    saving,

    setSticker: (diaryId, sticker) => saveSticker(diaryId, sticker),

    startMemory: async (itemId) => {
      const item = current()?.items.find((it) => it.id === itemId)
      return (await insertMemory(itemId, item?.date ?? toYmd(new Date()))).id
    },

    // 추가: 임시 id로 화면에 먼저 넣고, 서버가 준 진짜 행으로 바꿔 끼움
    addCategory: async ({ title, color }) => {
      const temp: CategoryRow = {
        id: tempId(),
        couple_id: coupleId!,
        title,
        color,
        created_at: new Date().toISOString(),
      }
      await optimistic(
        (d) => ({ ...d, categories: [...d.categories, temp] }),
        async () => {
          const row = must(
            await supabase.from('categories').insert({ couple_id: coupleId, title, color }).select().single<CategoryRow>(),
          )
          setRows('categories', (rows) => rows.map((c) => (c.id === temp.id ? row : c)))
        },
      )
    },

    addItem: async ({ title, categoryId, date }) => {
      const temp: ItemRow = {
        id: tempId(),
        couple_id: coupleId!,
        category_id: categoryId,
        title,
        done: false,
        date: date ?? null,
        author_id: userId ?? null,
        created_at: new Date().toISOString(),
      }
      await optimistic(
        (d) => ({ ...d, items: [...d.items, temp] }),
        async () => {
          const row = must(
            await supabase
              .from('bucket_items')
              .insert({ couple_id: coupleId, category_id: categoryId, title, date: date ?? null, author_id: userId })
              .select()
              .single<ItemRow>(),
          )
          setRows('items', (rows) => rows.map((it) => (it.id === temp.id ? row : it)))
        },
      )
    },

    updateItem: (id, { title, categoryId, date }: NewItem) => {
      const done = current()?.items.find((it) => it.id === id)?.done
      // 완료한 항목의 날짜 = 완료일이라, 그 추억(캘린더 카드·스티커)도 같은 날로 옮김
      const moveMemories = !!done && !!date
      return optimistic(
        (d) => ({
          ...d,
          items: d.items.map((it) =>
            it.id === id ? { ...it, title, category_id: categoryId, date: date ?? null } : it,
          ),
          memories: moveMemories ? d.memories.map((m) => (m.item_id === id ? { ...m, date: date! } : m)) : d.memories,
        }),
        async (before) => {
          must(
            await supabase
              .from('bucket_items')
              .update({ title, category_id: categoryId, date: date ?? null })
              .eq('id', id),
          )
          if (moveMemories && before.memories.some((m) => m.item_id === id && m.date !== date)) {
            must(await supabase.from('memories').update({ date }).eq('item_id', id))
          }
        },
      )
    },

    deleteItem: (id) =>
      optimistic(
        (d) => ({
          ...d,
          items: d.items.filter((it) => it.id !== id),
          memories: d.memories.filter((m) => m.item_id !== id),
        }),
        async (before) => {
          // 추억/한마디는 FK cascade로 같이 지워지고, 사진 파일은 직접 정리
          await removeFiles(before.memories.filter((m) => m.item_id === id))
          must(await supabase.from('bucket_items').delete().eq('id', id))
        },
      ),

    updateCategory: (id, { title, color }) =>
      optimistic(
        (d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, title, color } : c)) }),
        async () => {
          must(await supabase.from('categories').update({ title, color }).eq('id', id))
        },
      ),

    deleteCategory: (id) => {
      const itemIds = new Set(current()?.items.filter((it) => it.category_id === id).map((it) => it.id))
      return optimistic(
        (d) => ({
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
          items: d.items.filter((it) => it.category_id !== id),
          memories: d.memories.filter((m) => !m.item_id || !itemIds.has(m.item_id)),
        }),
        async (before) => {
          // 버킷리스트 → 추억 → 한마디 까지 FK cascade, 사진 파일은 직접 정리
          await removeFiles(before.memories.filter((m) => m.item_id && itemIds.has(m.item_id)))
          must(await supabase.from('categories').delete().eq('id', id))
        },
      )
    },

    removePhoto: (diaryId, index) => {
      const path = current()?.memories.find((m) => m.id === diaryId)?.photos[index]
      if (!path) return Promise.resolve()
      return optimistic(
        (d) => ({
          ...d,
          memories: d.memories.map((m) => (m.id === diaryId ? { ...m, photos: m.photos.filter((p) => p !== path) } : m)),
        }),
        async () => {
          const latest = current()?.memories.find((m) => m.id === diaryId)?.photos ?? []
          must(await supabase.from('memories').update({ photos: latest }).eq('id', diaryId))
          await supabase.storage.from(PHOTO_BUCKET).remove([path])
        },
      )
    },

    updateProfile: async ({ nickname, avatar }) => {
      // 닉네임은 바로, 사진은 올린 뒤에
      const avatarPath = avatar ? await uploadPhoto('avatars', avatar) : undefined
      const changes: Partial<ProfileRow> = {}
      if (nickname !== undefined) changes.nickname = nickname
      if (avatarPath) changes.avatar_path = avatarPath
      await optimistic(
        (d) => ({ ...d, me: { ...d.me, ...changes } }),
        async (before) => {
          must(await supabase.from('profiles').update(changes).eq('id', userId))
          if (avatarPath && before.me.avatar_path) supabase.storage.from(PHOTO_BUCKET).remove([before.me.avatar_path])
        },
      )
    },

    updateStartDate: (date) =>
      optimistic(
        (d) => ({ ...d, couple: d.couple && { ...d.couple, start_date: date } }),
        async () => {
          must(await supabase.from('couples').update({ start_date: date }).eq('id', coupleId))
        },
      ),
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
