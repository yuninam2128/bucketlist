import { useRef, useState, type ChangeEvent } from 'react'
import type { Completion } from '../data/store'
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

// 체크하면 뜨는 완료 팝업: 날짜 + (선택) 사진·소감 → 캘린더 기록
export function CompleteForm({ item, onSubmit, onCancel }: Props) {
  const [date, setDate] = useState(() => toYmd(new Date()))
  const [photos, setPhotos] = useState<Photo[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stickerStatus, setStickerStatus] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')
  const sticker = useRef<StickerJob | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // 대표 사진(첫 장)이 정해지는 즉시 누끼 시작 — 완료를 누를 때 기다리지 않게
  const syncSticker = (next: Photo[]) => {
    const first = next[0]
    if (!first) {
      sticker.current = null
      setStickerStatus('idle')
      return
    }
    if (sticker.current?.photoUrl === first.url) return
    const job = stickerJobFor(first.blob)
    const current: StickerJob = { photoUrl: first.url, job }
    sticker.current = current
    setStickerStatus('working')
    job.then(
      () => sticker.current === current && setStickerStatus('done'),
      () => sticker.current === current && setStickerStatus('failed'),
    )
  }

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (files.length === 0) return
    setLoading(true)
    setError('')
    try {
      const next = [...photos, ...(await loadPhotos(files))].slice(0, MAX_PHOTOS)
      setPhotos(next)
      syncSticker(next)
    } catch {
      setError('사진을 불러오지 못했어요. 다른 사진으로 해볼까요?')
    } finally {
      setLoading(false)
    }
  }

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url)
    const next = photos.filter((p) => p.url !== url)
    setPhotos(next)
    syncSticker(next)
  }

  return (
    <Popup
      title="완료했어요!"
      submitLabel="완료"
      canSubmit={!!date && !loading}
      onCancel={() => {
        photos.forEach((p) => URL.revokeObjectURL(p.url))
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
            {stickerStatus === 'working' && '첫 사진으로 캘린더 스티커 만드는 중… (완료 눌러도 계속 만들어요)'}
            {stickerStatus === 'done' && '캘린더 스티커 준비 완료 ✓'}
            {stickerStatus === 'failed' && '스티커를 못 만들었어요. 캘린더엔 점으로 표시돼요'}
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
