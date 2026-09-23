import arrow1 from '../assets/figma/diary-arrow-1.svg'
import arrow2 from '../assets/figma/diary-arrow-2.svg'
import nameEllipse from '../assets/figma/name-ellipse.svg'
import { useStore } from '../data/store'
import { formatMonthDay } from '../lib/date'
import type { DiaryEntry } from '../types'
import styles from './DiaryCard.module.css'

const photoSlots = [styles.photo1, styles.photo2]
const noteSlots = [styles.note1, styles.note2]
const arrows = [
  { src: arrow1, className: styles.arrow1 },
  { src: arrow2, className: styles.arrow2 },
]

interface Props {
  entry: DiaryEntry
  /** 카드를 누르면 한마디 남기기 */
  onOpen: () => void
}

// 사진 2장 + 각자 한마디가 화살표로 이어지는 하루 기록 카드
export function DiaryCard({ entry, onOpen }: Props) {
  const { couple, items, currentUser } = useStore()
  const notes = entry.notes.slice(0, 2)
  const item = entry.bucketItemId ? items.find((it) => it.id === entry.bucketItemId) : undefined
  const iWrote = entry.notes.some((n) => n.author === currentUser)

  return (
    // 같은 날 기록이 여러 개일 수 있어 id 대신 data-date (캘린더에서 날짜 탭 시 스크롤 대상)
    <article
      data-date={entry.date}
      className={styles.card}
      role="button"
      tabIndex={0}
      aria-label={iWrote ? '내 한마디 고치기' : '한마디 남기기'}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
    >
      <div className={styles.tape} aria-hidden />

      {entry.photos.slice(0, 2).map((src, i) => (
        <div key={i} className={`${styles.photo} ${photoSlots[i]}`}>
          <img src={src} alt="" />
        </div>
      ))}

      {notes.map((note, i) => (
        <div key={i}>
          <img className={arrows[i].className} src={arrows[i].src} alt="" />
          <div className={`${styles.note} ${noteSlots[i]}`}>
            <span className={styles.name}>
              <img src={nameEllipse} alt="" />
              <span>{couple.names[note.author]}</span>
            </span>
            <p className={styles.text}>{note.text}</p>
          </div>
        </div>
      ))}

      {/* 아직 내 한마디가 없으면 빈 자리에 안내 */}
      {!iWrote && notes.length < 2 && (
        <p className={`${styles.note} ${noteSlots[notes.length]} ${styles.addNote}`}>+ 한마디 남기기</p>
      )}

      <p className={styles.date}>
        {item && <span className={styles.itemTitle}>✓ {item.title} · </span>}
        {formatMonthDay(entry.date)}
      </p>
    </article>
  )
}
