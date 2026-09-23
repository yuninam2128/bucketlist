import { useState } from 'react'
import { useStore, type NewItem } from '../data/store'
import type { BucketItem } from '../types'
import { CategoryBadge } from './CategoryBadge'
import { DateField } from './DateField'
import styles from './ItemForm.module.css'
import { Popup } from './Popup'
import popup from './Popup.module.css'

interface Props {
  /** 있으면 고치기 모드 (값 채워서 열고, 삭제 가능) */
  item?: BucketItem
  /** 카테고리 화면에서 열면 그 카테고리가 기본 선택 */
  defaultCategoryId?: string
  onSubmit: (input: NewItem) => void
  onDelete?: () => void
  onCancel: () => void
}

// 버킷리스트 항목 추가/고치기: 할 일 + 카테고리 + 날짜(선택)
export function ItemForm({ item, defaultCategoryId, onSubmit, onDelete, onCancel }: Props) {
  const { categories } = useStore()
  const [title, setTitle] = useState(item?.title ?? '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId ?? categories[0]?.id)
  const [date, setDate] = useState(item?.date ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const trimmed = title.trim()

  return (
    <Popup
      title={item ? '버킷리스트 고치기' : '새 버킷리스트'}
      submitLabel={item ? '저장' : '추가'}
      canSubmit={!!trimmed && !!categoryId}
      onCancel={onCancel}
      onSubmit={() => categoryId && onSubmit({ title: trimmed, categoryId, date: date || undefined })}
    >
      <label className={popup.field}>
        <span className={popup.label}>하고 싶은 것</span>
        <input
          className={popup.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={40}
          placeholder="자동차 극장 가기"
          autoFocus={!item}
        />
      </label>

      <fieldset className={`${popup.field} ${styles.categories}`}>
        <legend className={popup.label}>카테고리</legend>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.chip} ${c.id === categoryId ? styles.selected : ''}`}
            onClick={() => setCategoryId(c.id)}
            aria-pressed={c.id === categoryId}
          >
            <CategoryBadge category={c} />
          </button>
        ))}
      </fieldset>

      <DateField
        label={item?.done ? '완료한 날' : '언제까지 (선택)'}
        value={date}
        onChange={setDate}
        optional={!item?.done}
      />

      {/* 삭제는 한 번 더 확인 (앱 안에선 confirm 창 대신 문구로) */}
      {onDelete &&
        (confirmDelete ? (
          <div className={styles.confirm}>
            <p>이 버킷리스트와 남긴 추억(사진·소감)이 모두 지워져요.</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDelete(false)}>
                그만두기
              </button>
              <button type="button" className={styles.danger} onClick={onDelete}>
                지우기
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.deleteLink} onClick={() => setConfirmDelete(true)}>
            이 버킷리스트 지우기
          </button>
        ))}
    </Popup>
  )
}
