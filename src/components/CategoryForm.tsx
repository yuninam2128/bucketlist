import { useState } from 'react'
import type { NewCategory } from '../data/store'
import { CATEGORY_COLOR_KEYS } from '../lib/categoryColors'
import type { CategoryColor } from '../types'
import { CategoryBadge } from './CategoryBadge'
import styles from './CategoryForm.module.css'
import { Folder } from './Folder'
import { Popup } from './Popup'
import popup from './Popup.module.css'

interface Props {
  onSubmit: (input: NewCategory) => void
  onCancel: () => void
}

// 새 카테고리: 이름 + 한줄 설명 + 폴더 색 6가지 중 선택
export function CategoryForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<CategoryColor>(CATEGORY_COLOR_KEYS[0])

  const trimmed = title.trim()

  return (
    <Popup
      title="새 카테고리"
      canSubmit={!!trimmed}
      onCancel={onCancel}
      onSubmit={() => onSubmit({ title: trimmed, description: description.trim() || undefined, color })}
    >
      <label className={popup.field}>
        <span className={popup.label}>이름</span>
        <input
          className={popup.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={12}
          placeholder="영화"
          autoFocus
        />
      </label>
      <label className={popup.field}>
        <span className={popup.label}>한줄 설명</span>
        <input
          className={popup.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={10}
          placeholder="뭐볼까"
        />
      </label>

      <fieldset className={styles.colors}>
        <legend className={popup.label}>폴더 색</legend>
        {CATEGORY_COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.swatch} ${key === color ? styles.selected : ''}`}
            onClick={() => setColor(key)}
            aria-pressed={key === color}
            aria-label={key}
          >
            <Folder color={key} className={styles.miniFolder} />
          </button>
        ))}
      </fieldset>

      <div className={styles.preview}>
        <CategoryBadge category={{ id: 'preview', title: trimmed || '미리보기', color, coverPhotos: [] }} />
      </div>
    </Popup>
  )
}
