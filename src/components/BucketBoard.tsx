import { useState, type ReactNode } from 'react'
import categoryRule from '../assets/figma/category-rule.svg'
import { useStore } from '../data/store'
import type { BucketItem } from '../types'
import styles from './BucketBoard.module.css'
import { BucketItemRow } from './BucketItemRow'
import { CompleteForm } from './CompleteForm'
import { DdayCard } from './DdayCard'
import { ItemForm } from './ItemForm'

interface Props {
  items: BucketItem[]
  sticky: { title: string; description?: string; color: string }
  /** 추가 팝업에서 기본으로 선택할 카테고리 */
  defaultCategoryId?: string
  /** 뒤로가기·화살표 등 종이 바깥에 얹을 요소 */
  children?: ReactNode
}

// Figma 45:2 — D+N 카드 + 스티커 + 체크리스트 종이. 홈(전체)과 카테고리별 화면이 공유
export function BucketBoard({ items, sticky, defaultCategoryId, children }: Props) {
  const { categories, completeItem, uncompleteItem, addItem } = useStore()
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState<BucketItem | null>(null)

  // 체크 → 완료 팝업, 체크 해제 → 바로 완료 취소
  const toggle = (id: string) => {
    const item = items.find((it) => it.id === id)
    if (!item) return
    if (item.done) uncompleteItem(id)
    else setCompleting(item)
  }
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
            return category && <BucketItemRow key={item.id} item={item} category={category} onToggle={toggle} />
          })}
          {list.length === 0 && <li className={styles.empty}>아직 버킷리스트가 없어요</li>}
          <li>
            <button type="button" className={styles.add} onClick={() => setAdding(true)}>
              + 버킷리스트 추가
            </button>
          </li>
        </ul>
      </section>
      {children}

      {adding && (
        <ItemForm
          defaultCategoryId={defaultCategoryId}
          onCancel={() => setAdding(false)}
          onSubmit={(input) => {
            addItem(input)
            setAdding(false)
          }}
        />
      )}

      {completing && (
        <CompleteForm
          item={completing}
          onCancel={() => setCompleting(null)}
          onSubmit={(completion) => {
            completeItem(completing.id, completion)
            setCompleting(null)
          }}
        />
      )}
    </div>
  )
}
