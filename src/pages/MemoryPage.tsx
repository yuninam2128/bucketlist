import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import arrowLeft from '../assets/figma/icon-arrow-left.png'
import nameEllipse from '../assets/figma/name-ellipse.svg'
import { AddButton } from '../components/AddButton'
import { CategoryBadge } from '../components/CategoryBadge'
import { ConfirmPopup } from '../components/ConfirmPopup'
import { NoteForm } from '../components/NoteForm'
import { useStore } from '../data/store'
import { tapeColor } from '../lib/categoryColors'
import { formatMonthDay } from '../lib/date'
import { loadPhotos, stickerJobFor } from '../lib/photos'
import styles from './MemoryPage.module.css'

// 추억 상세: 사진 전부 넘겨보기 + 두 사람 소감 전문 + 사진/한마디 더하기
export function MemoryPage() {
  const { memoryId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { diaries, items, categories, couple, currentUser, saveNote, addPhotos, removePhoto, setSticker } = useStore()
  const [stickerState, setStickerState] = useState<{ status: 'idle' | 'working' | 'done' | 'failed'; message?: string }>(
    { status: 'idle' },
  )
  const [writing, setWriting] = useState(false)
  /** 지울지 물어보는 중인 사진 번호 */
  const [removing, setRemoving] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [current, setCurrent] = useState(0)
  const strip = useRef<HTMLUListElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const entry = diaries.find((d) => d.id === memoryId)
  const startPhoto = Number(params.get('photo') ?? 0)

  // 앨범에서 특정 사진을 눌러 들어오면 그 사진부터
  useEffect(() => {
    const el = strip.current
    const target = el?.children[startPhoto] as HTMLElement | undefined
    if (el && target) el.scrollLeft = target.offsetLeft - (el.clientWidth - target.clientWidth) / 2
  }, [startPhoto])

  if (!entry) return <Navigate to="/calendar" replace />

  const item = items.find((it) => it.id === entry.bucketItemId)
  const category = item && categories.find((c) => c.id === item.categoryId)
  const mine = entry.notes.find((n) => n.author === currentUser)
  // 지금 보고 있는 사진 (사진이 줄어들어도 범위 안으로)
  const shown = Math.max(0, Math.min(current, entry.photos.length - 1))

  const makeStickerFromShown = async () => {
    setStickerState({ status: 'working' })
    try {
      const photo = await (await fetch(entry.photos[shown])).blob()
      await setSticker(entry.id, await stickerJobFor(photo))
      setStickerState({ status: 'done' })
    } catch (e) {
      console.error(e)
      setStickerState({ status: 'failed', message: e instanceof Error ? e.message : '' })
    }
  }

  const onScroll = () => {
    const el = strip.current
    if (!el || el.children.length < 2) return
    // 사진 한 장 + 간격만큼이 한 칸
    const step = (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft
    setCurrent(Math.round(el.scrollLeft / step))
  }

  const onPickPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    try {
      const photos = await loadPhotos(files)
      // 첫 사진이 생기는 순간이면 캘린더 스티커도 만들기
      const job = entry.photos.length === 0 && !entry.sticker ? stickerJobFor(photos[0].blob) : undefined
      await addPhotos(entry.id, photos, job)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="뒤로">
        <img src={arrowLeft} alt="" />
      </button>

      <header className={styles.header}>
        <div className={styles.tape} style={{ background: tapeColor(category?.color ?? '#d2a5a6') }} />
        <p className={styles.date}>{formatMonthDay(entry.date)} 완료</p>
        <h1 className={styles.title}>{item?.title ?? '우리의 추억'}</h1>
        {category && <CategoryBadge category={category} />}
      </header>

      {entry.photos.length > 0 ? (
        <>
          <ul ref={strip} className={styles.strip} onScroll={onScroll}>
            {entry.photos.map((src, i) => (
              <li key={i} className={`${styles.slide} ${i % 2 ? styles.tiltRight : styles.tiltLeft}`}>
                <img src={src} alt={`사진 ${i + 1}`} />
              </li>
            ))}
          </ul>
          <p className={styles.counter}>
            {shown + 1} / {entry.photos.length}
            <span aria-hidden> | </span>
            <button type="button" className={styles.removePhoto} onClick={() => setRemoving(shown)}>
              이 사진 지우기
            </button>
          </p>
          {/* 누끼가 실패했거나 다른 사진으로 바꾸고 싶을 때 */}
          <p className={styles.stickerRow}>
            {stickerState.status === 'working' ? (
              '스티커 만드는 중… (처음엔 1분 정도 걸릴 수 있어요)'
            ) : (
              <button type="button" className={styles.removePhoto} onClick={makeStickerFromShown}>
                {entry.sticker ? '이 사진으로 캘린더 스티커 바꾸기' : '이 사진으로 캘린더 스티커 만들기'}
              </button>
            )}
            {stickerState.status === 'done' && ' ✓'}
            {stickerState.status === 'failed' && (
              <span className={styles.stickerError}>못 만들었어요. {stickerState.message}</span>
            )}
          </p>
        </>
      ) : (
        <p className={styles.empty}>아직 사진이 없어요</p>
      )}

      <div className={styles.addPhoto}>
        <AddButton label={uploading ? '올리는 중…' : '사진 추가'} onClick={() => fileInput.current?.click()} />
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onPickPhotos} />
      </div>

      <section className={styles.notes}>
        {entry.notes.map((n) => (
          <div key={n.author} className={styles.note}>
            <div className={styles.noteHead}>
              <span className={styles.name}>
                <img src={nameEllipse} alt="" />
                <span>{couple.names[n.author]}</span>
              </span>
              {n.author === currentUser && (
                <button type="button" className={styles.edit} onClick={() => setWriting(true)}>
                  고치기
                </button>
              )}
            </div>
            <p className={styles.text}>{n.text}</p>
          </div>
        ))}
        {!mine && (
          <AddButton label="한마디 추가" className={styles.addNote} onClick={() => setWriting(true)} />
        )}
      </section>

      {removing !== null && (
        <ConfirmPopup
          title="이 사진을 지울까요?"
          message={`${removing + 1}번째 사진이 추억에서 빠져요.`}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            removePhoto(entry.id, removing)
            setRemoving(null)
          }}
        />
      )}

      {writing && (
        <NoteForm
          entry={entry}
          onCancel={() => setWriting(false)}
          onSubmit={(text) => {
            saveNote(entry.id, text)
            setWriting(false)
          }}
        />
      )}
    </div>
  )
}
