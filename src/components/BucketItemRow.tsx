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
}

export function BucketItemRow({ item, category, onToggle }: Props) {
  return (
    <li className={`${styles.row} ${item.done ? styles.done : ''}`}>
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
      <p className={styles.title}>{item.title}</p>
      <CategoryBadge category={category} className={styles.badge} />
      {item.date && <p className={styles.date}>{formatMonthDay(item.date)}</p>}
    </li>
  )
}
