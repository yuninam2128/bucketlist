import type { ReactNode } from 'react'
import categoryRule from '../assets/figma/category-rule.svg'
import { useStore } from '../data/store'
import type { BucketItem } from '../types'
import styles from './BucketBoard.module.css'
import { BucketItemRow } from './BucketItemRow'
import { DdayCard } from './DdayCard'

interface Props {
  items: BucketItem[]
  sticky: { title: string; description?: string; color: string }
  /** 뒤로가기·화살표 등 종이 바깥에 얹을 요소 */
  children?: ReactNode
}

// Figma 45:2 — D+N 카드 + 스티커 + 체크리스트 종이. 홈(전체)과 카테고리별 화면이 공유
export function BucketBoard({ items, sticky, children }: Props) {
  const { categories, toggleItem } = useStore()
  // 안 한 것 먼저, 완료한 건 아래로
  const list = [...items].sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <div className={styles.page}>
      <section className={styles.paper}>
        <DdayCard className={styles.ddayCard} />

        <div className={styles.sticky} style={{ background: sticky.color }}>
          <p className={styles.stickyLabel}>CATEGORY</p>
          <img className={styles.stickyRule} src={categoryRule} alt="" />
          <p className={styles.stickyTitle}>{sticky.title}</p>
          {sticky.description && <p className={styles.stickyTitle}>{sticky.description}</p>}
        </div>

        <ul className={styles.items}>
          {list.map((item) => {
            const category = categories.find((c) => c.id === item.categoryId)
            return category && <BucketItemRow key={item.id} item={item} category={category} onToggle={toggleItem} />
          })}
          {list.length === 0 && <li className={styles.empty}>아직 버킷리스트가 없어요</li>}
        </ul>
      </section>
      {children}
    </div>
  )
}
