import { useRef, useState, type ChangeEvent } from 'react'
import type { Completion } from '../data/store'
import { toYmd } from '../lib/date'
import { compressImage } from '../lib/image'
import type { BucketItem } from '../types'
import styles from './CompleteForm.module.css'
import { Popup } from './Popup'
import popup from './Popup.module.css'

const MAX_PHOTOS = 2

interface Props {
  item: BucketItem
  onSubmit: (completion: Completion) => void
  onCancel: () => void
}

// 체크하면 뜨는 완료 팝업: 날짜 + (선택) 사진·소감 → 캘린더 기록
export function CompleteForm({ item, onSubmit, onCancel }: Props) {
  const [date, setDate] = useState(() => toYmd(new Date()))
  const [photos, setPhotos] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (files.length === 0) return
    setLoading(true)
    setError('')
    try {
      // TODO: Supabase 연결 시 blob을 Storage에 올리고 받은 URL로 교체
      const blobs = await Promise.all(files.map((f) => compressImage(f)))
      setPhotos((prev) => [...prev, ...blobs.map((b) => URL.createObjectURL(b))].slice(0, MAX_PHOTOS))
    } catch {
      setError('사진을 불러오지 못했어요. 다른 사진으로 해볼까요?')
    } finally {
      setLoading(false)
    }
  }

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url)
    setPhotos((prev) => prev.filter((p) => p !== url))
  }

  return (
    <Popup
      title="완료했어요!"
      submitLabel="완료"
      canSubmit={!!date && !loading}
      onCancel={() => {
        photos.forEach((url) => URL.revokeObjectURL(url))
        onCancel()
      }}
      onSubmit={() => onSubmit({ date, photos, note: note.trim() || undefined })}
    >
      <p className={styles.itemTitle}>{item.title}</p>

      <label className={popup.field}>
        <span className={popup.label}>언제</span>
        <input className={popup.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <div className={popup.field}>
        <span className={popup.label}>사진 (선택, 최대 {MAX_PHOTOS}장)</span>
        <div className={styles.photos}>
          {photos.map((url, i) => (
            <div key={url} className={`${styles.photo} ${i % 2 ? styles.tiltRight : styles.tiltLeft}`}>
              <img src={url} alt="" />
              <button type="button" className={styles.remove} onClick={() => removePhoto(url)} aria-label="사진 빼기">
                ×
              </button>
            </div>
          ))}
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
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={addPhotos} />
        {error && <p className={styles.error}>{error}</p>}
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
