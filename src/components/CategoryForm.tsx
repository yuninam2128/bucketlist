import { useState } from 'react'
import type { NewCategory } from '../data/store'
import { COLOR_FAMILIES, DEFAULT_CATEGORY_COLOR, familyOf } from '../lib/categoryColors'
import { CategoryBadge } from './CategoryBadge'
import styles from './CategoryForm.module.css'
import { Folder } from './Folder'
import { Popup } from './Popup'
import popup from './Popup.module.css'

interface Props {
  onSubmit: (input: NewCategory) => void
  onCancel: () => void
}

// 새 카테고리: 이름 + 색 (계열 6개 → 그 계열의 진하기 4단계)
export function CategoryForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR)
  const family = familyOf(color)

  const trimmed = title.trim()

  return (
    <Popup
      title="새 카테고리"
      canSubmit={!!trimmed}
      onCancel={onCancel}
      onSubmit={() => onSubmit({ title: trimmed, color })}
    >
      <label className={popup.field}>
        <span className={popup.label}>이름</span>
        <input
          className={popup.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={12}
          placeholder="영화 뭐볼까"
          autoFocus
        />
      </label>

      <fieldset className={styles.colors}>
        <legend className={popup.label}>폴더 색</legend>
        {COLOR_FAMILIES.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.swatch} ${f.key === family.key ? styles.selected : ''}`}
            // 계열을 바꾸면 그 계열의 기본(2번째) 색으로
            onClick={() => setColor(f.shades[1])}
            aria-pressed={f.key === family.key}
            aria-label={f.label}
          >
            <Folder color={f.key === family.key ? color : f.shades[1]} className={styles.miniFolder} />
          </button>
        ))}
      </fieldset>

      <div className={styles.shades} role="radiogroup" aria-label={`${family.label} 진하기`}>
        {family.shades.map((shade, i) => (
          <button
            key={shade}
            type="button"
            role="radio"
            aria-checked={shade === color}
            aria-label={`${family.label} ${i + 1}단계`}
            className={`${styles.shade} ${shade === color ? styles.shadeSelected : ''}`}
            style={{ background: shade }}
            onClick={() => setColor(shade)}
          />
        ))}
      </div>

      <div className={styles.preview}>
        <CategoryBadge category={{ id: 'preview', title: trimmed || '미리보기', color, coverPhotos: [] }} />
      </div>
    </Popup>
  )
}
