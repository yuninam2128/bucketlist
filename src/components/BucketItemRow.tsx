import check from '../assets/figma/check.svg'
import rowLine from '../assets/figma/item-row.svg'
import tagBg from '../assets/figma/tag.svg'
import { formatMonthDay } from '../lib/date'
import type { BucketItem } from '../types'
import styles from './BucketItemRow.module.css'

interface Props {
  item: BucketItem
  onToggle: (id: string) => void
}

export function BucketItemRow({ item, onToggle }: Props) {
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
      {item.tag && (
        <span className={styles.tag}>
          <img src={tagBg} alt="" />
          <span>{item.tag}</span>
        </span>
      )}
      {item.date && <p className={styles.date}>{formatMonthDay(item.date)}</p>}
    </li>
  )
}
