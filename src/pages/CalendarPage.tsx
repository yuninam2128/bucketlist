import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { DdayCard } from '../components/DdayCard'
import { DiaryCard } from '../components/DiaryCard'
import { MonthCalendar } from '../components/MonthCalendar'
import { NoteForm } from '../components/NoteForm'
import { useStore } from '../data/store'
import styles from './CalendarPage.module.css'

export function CalendarPage() {
  const { diaries, saveNote } = useStore()
  const navigate = useNavigate()
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const noteEntry = diaries.find((d) => d.id === noteFor)
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState<string>()

  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`
  // 보고 있는 달의 기록, 최신순
  const monthEntries = useMemo(
    () => diaries.filter((d) => d.date.startsWith(monthPrefix)).sort((a, b) => b.date.localeCompare(a.date)),
    [diaries, monthPrefix],
  )
  const markedDates = useMemo(() => new Set(monthEntries.map((d) => d.date)), [monthEntries])
  // 하루에 기록이 여러 개면 가장 최근 기록의 스티커
  const stickers = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of monthEntries) if (d.sticker && !map.has(d.date)) map.set(d.date, d.sticker)
    return map
  }, [monthEntries])

  const moveMonth = (delta: number) => {
    setSelected(undefined)
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const selectDate = (ymd: string) => {
    setSelected(ymd)
    document.querySelector(`[data-date="${ymd}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>
      <DdayCard className={styles.ddayCard} />

      <MonthCalendar
        year={view.year}
        month={view.month}
        markedDates={markedDates}
        stickers={stickers}
        selected={selected}
        onSelect={selectDate}
        onPrevMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
      />

      <div className={styles.diaries}>
        {monthEntries.map((entry, i) => (
          <DiaryCard
            key={entry.id}
            entry={entry}
            index={i}
            onOpen={() => navigate(`/memories/${entry.id}`)}
            onAddNote={() => setNoteFor(entry.id)}
          />
        ))}
        {monthEntries.length === 0 && <p className={styles.empty}>이 달의 기록이 아직 없어요</p>}
      </div>

      {noteEntry && (
        <NoteForm
          entry={noteEntry}
          onCancel={() => setNoteFor(null)}
          onSubmit={(text) => {
            saveNote(noteEntry.id, text)
            setNoteFor(null)
          }}
        />
      )}
    </div>
  )
}
