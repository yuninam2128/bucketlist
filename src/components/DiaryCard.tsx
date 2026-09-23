import arrow1 from '../assets/figma/diary-arrow-1.svg'
import arrow2 from '../assets/figma/diary-arrow-2.svg'
import nameEllipse from '../assets/figma/name-ellipse.svg'
import { useStore } from '../data/store'
import { AddButton } from './AddButton'
import { tapeColor } from '../lib/categoryColors'
import { formatMonthDay } from '../lib/date'
import type { DiaryEntry } from '../types'
import styles from './DiaryCard.module.css'

const photoSlots = [styles.photo1, styles.photo2]
// Figma 64:577 — 테이프 방향 3가지, 카드마다 돌아가며 사용
const tapeSlots = [styles.tape1, styles.tape2, styles.tape3]
const noteSlots = [styles.note1, styles.note2]
const addNoteSlots = [styles.addNote1, styles.addNote2]
const arrows = [
  { src: arrow1, className: styles.arrow1 },
  { src: arrow2, className: styles.arrow2 },
]

interface Props {
  entry: DiaryEntry
  /** 목록에서의 순서 — 이웃한 카드끼리 테이프 방향이 겹치지 않게 */
  index: number
  /** 카드를 누르면 추억 상세 */
  onOpen: () => void
  /** "한마디 추가" 테이프 */
  onAddNote: () => void
}

// 사진 2장(+N) + 각자 한마디(길면 말줄임)가 화살표로 이어지는 추억 카드. 전체는 추억 상세에서
export function DiaryCard({ entry, index, onOpen, onAddNote }: Props) {
  const { couple, items, categories, currentUser } = useStore()
  const notes = entry.notes.slice(0, 2)
  const item = entry.bucketItemId ? items.find((it) => it.id === entry.bucketItemId) : undefined
  const category = item && categories.find((c) => c.id === item.categoryId)
  // 테이프는 그 버킷리스트 카테고리 색을 진하게 (카테고리 없으면 Figma 기본 rose)
  const tape = tapeColor(category?.color ?? '#d2a5a6')
  const iWrote = entry.notes.some((n) => n.author === currentUser)

  return (
    // 같은 날 기록이 여러 개일 수 있어 id 대신 data-date (캘린더에서 날짜 탭 시 스크롤 대상)
    <article
      data-date={entry.date}
      className={styles.card}
      role="button"
      tabIndex={0}
      aria-label={`${item?.title ?? '추억'} 자세히 보기`}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
    >
      <div
        className={`${styles.tape} ${tapeSlots[index % tapeSlots.length]}`}
        style={{ background: tape }}
        aria-hidden
      />

      {entry.photos.slice(0, 2).map((src, i) => (
        <div key={i} className={`${styles.photo} ${photoSlots[i]}`}>
          <img src={src} alt="" />
          {i === 1 && entry.photos.length > 2 && <span className={styles.more}>+{entry.photos.length - 2}</span>}
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

      {/* 아직 내 한마디가 없으면 빈 자리에 추가 테이프 */}
      {!iWrote && notes.length < 2 && (
        <AddButton
          label="한마디 추가"
          className={`${styles.addNote} ${addNoteSlots[notes.length]}`}
          onClick={(e) => {
            e.stopPropagation()
            onAddNote()
          }}
        />
      )}

      <p className={styles.date}>
        {item && <span className={styles.itemTitle}>✓ {item.title} · </span>}
        {formatMonthDay(entry.date)}
      </p>
    </article>
  )
}
