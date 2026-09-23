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

// 사진 2장 + 각자 한마디가 화살표로 이어지는 하루 기록 카드
export function DiaryCard({ entry }: { entry: DiaryEntry }) {
  const { couple } = useStore()
  const notes = entry.notes.slice(0, 2)

  return (
    <article id={`diary-${entry.date}`} className={styles.card}>
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

      <p className={styles.date}>{formatMonthDay(entry.date)}</p>
    </article>
  )
}
