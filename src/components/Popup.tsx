import type { FormEvent, ReactNode } from 'react'
import tape from '../assets/figma/tape.svg'
import styles from './Popup.module.css'

interface Props {
  title: string
  submitLabel?: string
  canSubmit: boolean
  onSubmit: () => void
  onCancel: () => void
  children: ReactNode
}

// Figma 64:579 — 모눈 마스킹테이프로 붙인 종이 팝업. 추가 폼들이 공유
export function Popup({ title, submitLabel = '추가', canSubmit, onSubmit, onCancel, children }: Props) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (canSubmit) onSubmit()
  }

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <form className={styles.paper} onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <img className={styles.tape} src={tape} alt="" />
        <div className={styles.body}>
          <h2 className={styles.heading}>{title}</h2>
          {children}
          <div className={styles.actions}>
            <button type="button" onClick={onCancel}>
              취소
            </button>
            <button type="submit" className={styles.primary} disabled={!canSubmit}>
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
