import { useState } from 'react'
import { toYmd } from '../lib/date'
import styles from './DateField.module.css'
import { MonthCalendar } from './MonthCalendar'
import popup from './Popup.module.css'

interface Props {
  label: string
  /** YYYY-MM-DD, 비어 있으면 '' */
  value: string
  onChange: (ymd: string) => void
  /** 비울 수 있는지 (목표일처럼 선택 입력) */
  optional?: boolean
}

// OS 기본 달력 대신 앱 캘린더 디자인으로 날짜 고르기. 누르면 입력칸 아래에 달력이 펼쳐짐
export function DateField({ label, value, onChange, optional = false }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const [y, m] = (value || toYmd(new Date())).split('-').map(Number)
    return { year: y, month: m - 1 }
  })

  const moveMonth = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const [y, m, d] = value ? value.split('-').map(Number) : []

  return (
    <div className={popup.field}>
      <span className={popup.label}>{label}</span>
      <div className={styles.row}>
        <button
          type="button"
          className={`${popup.input} ${styles.trigger}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {value ? `${y}년 ${m}월 ${d}일` : <span className={styles.placeholder}>날짜 고르기</span>}
        </button>
        {optional && value && (
          <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="날짜 지우기">
            ×
          </button>
        )}
      </div>

      {open && (
        <div className={styles.calendar}>
          <MonthCalendar
            compact
            year={view.year}
            month={view.month}
            selected={value}
            onSelect={(ymd) => {
              onChange(ymd)
              setOpen(false)
            }}
            onPrevMonth={() => moveMonth(-1)}
            onNextMonth={() => moveMonth(1)}
          />
        </div>
      )}
    </div>
  )
}
