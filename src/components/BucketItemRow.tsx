import check from '../assets/figma/check.svg'
import rowLine from '../assets/figma/item-row.svg'
import { formatMonthDay } from '../lib/date'
import type { BucketItem, Category } from '../types'
import styles from './BucketItemRow.module.css'
import { CategoryBadge } from './CategoryBadge'

interface Props {
  item: BucketItem
  category: Category
  onToggle: (id: string) => void
  onEdit: () => void
  /** 완료한 항목 제목을 누르면 그 추억으로 */
  onOpenMemory?: () => void
}

// Figma 45:2 항목 한 줄. 제목이 길면 위로 줄바꿈되고, 동그라미+밑줄은 항상 마지막 줄 아래에 (공책처럼)
export function BucketItemRow({ item, category, onToggle, onEdit, onOpenMemory }: Props) {
  return (
    <li className={`${styles.row} ${item.done ? styles.done : ''}`}>
      <div className={styles.lineArea}>
        <img className={styles.line} src={rowLine} alt="" />
        <button
          type="button"
          className={styles.checkbox}
          onClick={() => onToggle(item.id)}
          aria-pressed={item.done}
          aria-label={item.done ? '완료 취소' : '완료'}
        >
          {item.done && <img className={styles.check} src={check} alt="" />}
        </button>
        {item.done && onOpenMemory ? (
          <button type="button" className={`${styles.title} ${styles.titleLink}`} onClick={onOpenMemory}>
            {item.title}
          </button>
        ) : (
          <p className={styles.title}>{item.title}</p>
        )}
        <CategoryBadge category={category} className={styles.badge} />
      </div>
      <p className={styles.meta}>
        {item.date && (
          <>
            {formatMonthDay(item.date)}
            <span aria-hidden>|</span>
          </>
        )}
        <button type="button" className={styles.edit} onClick={onEdit}>
          수정
        </button>
      </p>
    </li>
  )
}
