import { useRef, useState, type ChangeEvent } from 'react'
import { useStore, type Completion } from '../data/store'
import { toYmd } from '../lib/date'
import { loadPhotos, stickerJobFor, type LocalPhoto } from '../lib/photos'
import type { BucketItem } from '../types'
import styles from './CompleteForm.module.css'
import { DateField } from './DateField'
import { Popup } from './Popup'
import popup from './Popup.module.css'

// 완료할 때 한 번에 올리는 최대 장수. 더 필요하면 추억 상세의 "사진 추가"로 (거긴 제한 없음)
const MAX_PHOTOS = 30

type Photo = LocalPhoto
type UploadStatus = 'uploading' | 'done' | 'failed'

interface StickerJob {
  /** 어떤 사진으로 만든 스티커인지 (대표 사진이 바뀌면 새로 만듦) */
  photoUrl: string
  job: Promise<Blob>
}

interface Props {
  item: BucketItem
  onSubmit: (completion: Completion) => void
  onCancel: () => void
}

// 체크하면 뜨는 완료 팝업: 날짜 + (선택) 사진·소감 → 캘린더 기록.
// 사진은 고르는 즉시 뒤에서 올리기 시작 → 소감 쓰는 동안 다 올라가서 완료 누를 땐 거의 안 기다림
export function CompleteForm({ item, onSubmit, onCancel }: Props) {
  const { preUpload, discardUploads, whenUploadsIdle } = useStore()
  const [date, setDate] = useState(() => toYmd(new Date()))
  const [photos, setPhotos] = useState<Photo[]>([])
  const photosRef = useRef<Photo[]>([])
  const [uploads, setUploads] = useState<Record<string, UploadStatus>>({})
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stickerStatus, setStickerStatus] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')
  const [stickerError, setStickerError] = useState('')
  const sticker = useRef<StickerJob | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const updatePhotos = (next: Photo[]) => {
    photosRef.current = next
    setPhotos(next)
  }

  // 대표 사진(첫 장)이 정해지면 누끼 준비. 모델(56MB) 다운로드가 사진 업로드와 인터넷을 나눠 쓰지 않게
  // 올리던 사진이 다 올라간 뒤에 시작
  const syncSticker = (next: Photo[], force = false) => {
    const first = next[0]
    if (!first) {
      sticker.current = null
      setStickerStatus('idle')
      return
    }
    if (!force && sticker.current?.photoUrl === first.url) return
    const job = whenUploadsIdle().then(() => stickerJobFor(first.blob))
    const current: StickerJob = { photoUrl: first.url, job }
    sticker.current = current
    setStickerStatus('working')
    job.then(
      () => sticker.current === current && setStickerStatus('done'),
      (e) => {
        if (sticker.current !== current) return
        setStickerStatus('failed')
        setStickerError(e instanceof Error ? e.message : '')
      },
    )
  }

  /** 줄이기가 끝난 사진부터 바로 목록에 넣고 업로드 시작 */
  const startUpload = (photo: Photo) => {
    if (photosRef.current.length >= MAX_PHOTOS) return URL.revokeObjectURL(photo.url)
    photo.uploaded = preUpload(photo)
    setUploads((prev) => ({ ...prev, [photo.url]: 'uploading' }))
    photo.uploaded.then(
      () => setUploads((prev) => ({ ...prev, [photo.url]: 'done' })),
      () => setUploads((prev) => ({ ...prev, [photo.url]: 'failed' })),
    )
    updatePhotos([...photosRef.current, photo])
  }

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (files.length === 0) return
    setLoading(true)
    setError('')
    try {
      await loadPhotos(files, startUpload)
    } catch {
      setError('사진을 불러오지 못했어요. 다른 사진으로 해볼까요?')
    } finally {
      setLoading(false)
      syncSticker(photosRef.current)
    }
  }

  /** 미리 올린 파일도 같이 정리 */
  const discard = (list: Photo[]) => {
    for (const p of list) {
      URL.revokeObjectURL(p.url)
      p.uploaded?.then((path) => discardUploads([path])).catch(() => {})
    }
  }

  const removePhoto = (url: string) => {
    discard(photos.filter((p) => p.url === url))
    const next = photos.filter((p) => p.url !== url)
    updatePhotos(next)
    syncSticker(next)
  }

  const uploadingCount = photos.filter((p) => uploads[p.url] === 'uploading').length

  return (
    <Popup
      title="완료했어요!"
      submitLabel="완료"
      canSubmit={!!date && !loading}
      onCancel={() => {
        discard(photos)
        onCancel()
      }}
      onSubmit={() =>
        onSubmit({
          date,
          photos,
          note: note.trim() || undefined,
          stickerJob: sticker.current?.job,
        })
      }
    >
      <p className={styles.itemTitle}>{item.title}</p>

      <DateField label="언제" value={date} onChange={setDate} />

      <div className={popup.field}>
        <span className={popup.label}>
          사진 (선택 · {photos.length}/{MAX_PHOTOS}장 · 첫 장이 대표)
          {uploadingCount > 0 && ` · ${uploadingCount}장 올리는 중`}
        </span>
        <div className={styles.photos}>
          {/* 사진이 많아져도 바로 누를 수 있게 추가 칸은 맨 앞 */}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              className={styles.addPhoto}
              onClick={() => fileInput.current?.click()}
              disabled={loading}
            >
              {loading ? '...' : '+ 사진'}
            </button>
          )}
          {photos.map((p, i) => (
            <div key={p.url} className={`${styles.photo} ${i % 2 ? styles.tiltRight : styles.tiltLeft}`}>
              <img src={p.url} alt="" />
              {uploads[p.url] === 'uploading' && <span className={styles.uploading} aria-label="올리는 중" />}
              {uploads[p.url] === 'failed' && (
                <span className={styles.failed} title="완료할 때 한 번 더 올려봐요">
                  !
                </span>
              )}
              <button
                type="button"
                className={styles.remove}
                onClick={() => removePhoto(p.url)}
                aria-label="사진 빼기"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={addPhotos} />
        {error && <p className={styles.error}>{error}</p>}
        {stickerStatus !== 'idle' && (
          <p className={styles.stickerStatus}>
            {stickerStatus === 'working' && '사진이 다 올라가면 첫 사진으로 캘린더 스티커를 만들어요 (완료 눌러도 계속)'}
            {stickerStatus === 'done' && '캘린더 스티커 준비 완료 ✓'}
            {stickerStatus === 'failed' && (
              <>
                스티커를 못 만들었어요. {stickerError}
                <button type="button" className={styles.retry} onClick={() => syncSticker(photos, true)}>
                  다시 시도
                </button>
                <br />
                (안 되면 그냥 완료해도 돼요. 나중에 추억에서 다시 만들 수 있어요)
              </>
            )}
          </p>
        )}
      </div>

      <label className={popup.field}>
        <span className={popup.label}>소감 (선택)</span>
        <textarea
          className={`${popup.input} ${popup.textarea}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          rows={3}
          placeholder="오늘은 즐거워따"
        />
      </label>
    </Popup>
  )
}
