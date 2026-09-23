import { useState } from 'react'
import { useStore, type NewItem } from '../data/store'
import { CategoryBadge } from './CategoryBadge'
import styles from './ItemForm.module.css'
import { Popup } from './Popup'
import popup from './Popup.module.css'

interface Props {
  /** 카테고리 화면에서 열면 그 카테고리가 기본 선택 */
  defaultCategoryId?: string
  onSubmit: (input: NewItem) => void
  onCancel: () => void
}

// 새 버킷리스트 항목: 할 일 + 카테고리 + 목표일(선택)
export function ItemForm({ defaultCategoryId, onSubmit, onCancel }: Props) {
  const { categories } = useStore()
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? categories[0]?.id)
  const [date, setDate] = useState('')

  const trimmed = title.trim()

  return (
    <Popup
      title="새 버킷리스트"
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
          maxLength={30}
          placeholder="자동차 극장 가기"
          autoFocus
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

      <label className={popup.field}>
        <span className={popup.label}>언제까지 (선택)</span>
        <input className={popup.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
    </Popup>
  )
}
