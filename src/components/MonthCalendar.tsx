import { toYmd } from '../lib/date'
import styles from './MonthCalendar.module.css'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface Props {
  year: number
  /** 0-11 */
  month: number
  /** 기록이 있는 날짜 (YYYY-MM-DD) */
  markedDates?: Set<string>
  /** 날짜별 대표 누끼 스티커. 없으면 점으로 표시 */
  stickers?: Map<string, string>
  /** 팝업 안 날짜 선택용 작은 달력 (폭 100%, 칸 낮게, 숫자 가운데) */
  compact?: boolean
  selected?: string
  onSelect: (ymd: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function MonthCalendar({
  year,
  month,
  markedDates,
  stickers,
  compact = false,
  selected,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7)
  const today = toYmd(new Date())

  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const day = i - firstWeekday + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  return (
    <section className={`${styles.calendar} ${compact ? styles.compact : ''}`}>
      {/* 가운데는 D+N 카드가 덮으므로 양쪽 모서리만 사용 */}
      <header className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.year}>{year}</span>
          {month + 1}월
        </h2>
        <div className={styles.navs}>
          <button type="button" className={styles.nav} onClick={onPrevMonth} aria-label="이전 달">
            ‹
          </button>
          <button type="button" className={styles.nav} onClick={onNextMonth} aria-label="다음 달">
            ›
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} className={styles.weekday}>
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className={styles.cell} />
          const ymd = toYmd(new Date(year, month, day))
          const classes = [
            styles.cell,
            styles.day,
            ymd === selected && styles.selected,
            ymd === today && styles.today,
          ]
            .filter(Boolean)
            .join(' ')
          const sticker = stickers?.get(ymd)
          return (
            <button key={i} type="button" className={classes} onClick={() => onSelect(ymd)}>
              {sticker ? (
                // 날짜마다 살짝 다른 각도로 붙인 스티커
                <img
                  className={`${styles.sticker} ${day % 2 ? styles.tiltLeft : styles.tiltRight}`}
                  src={sticker}
                  alt="기록 있음"
                />
              ) : (
                markedDates?.has(ymd) && <span className={styles.mark} aria-label="기록 있음" />
              )}
              <span className={styles.num}>{day}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
