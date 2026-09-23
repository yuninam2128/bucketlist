import ddayEllipse from '../assets/figma/dday-ellipse.svg'
import { useStore } from '../data/store'
import { coupleDays } from '../lib/date'
import styles from './DdayCard.module.css'

// 위치는 부모가 className으로 지정
export function DdayCard({ className = '' }: { className?: string }) {
  const { couple } = useStore()
  const dday = coupleDays(couple.startDate)

  return (
    <div className={`${styles.card} ${className}`}>
      <img className={styles.ellipse} src={ddayEllipse} alt="" />
      <p className={styles.dday} aria-label={`D+${dday}`}>
        <span className={styles.d}>D</span>
        <span className={styles.plus}>+</span>
        <span className={styles.num}>{dday}</span>
      </p>
    </div>
  )
}
