import { Link, Navigate, useNavigate, useParams } from 'react-router'
import arrowLeft from '../assets/figma/icon-arrow-left.png'
import arrowRight from '../assets/figma/icon-arrow-right.png'
import categoryRule from '../assets/figma/category-rule.svg'
import { BucketItemRow } from '../components/BucketItemRow'
import { DdayCard } from '../components/DdayCard'
import { useStore } from '../data/store'
import styles from './BucketListPage.module.css'

export function BucketListPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const { categories, items, toggleItem } = useStore()

  const index = categories.findIndex((c) => c.id === categoryId)
  if (index === -1) return <Navigate to="/categories" replace />

  const category = categories[index]
  const prev = categories[(index - 1 + categories.length) % categories.length]
  const next = categories[(index + 1) % categories.length]
  // 안 한 것 먼저, 완료한 건 아래로
  const list = items
    .filter((it) => it.categoryId === category.id)
    .sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate('/categories')} aria-label="뒤로">
        <img src={arrowLeft} alt="" />
      </button>

      <section className={styles.paper}>
        <DdayCard className={styles.ddayCard} />

        <div className={styles.sticky}>
          <p className={styles.stickyLabel}>CATEGORY</p>
          <img className={styles.stickyRule} src={categoryRule} alt="" />
          <p className={styles.stickyTitle}>{category.title}</p>
          {category.description && <p className={styles.stickyTitle}>{category.description}</p>}
        </div>

        <ul className={styles.items}>
          {list.map((item) => (
            <BucketItemRow key={item.id} item={item} onToggle={toggleItem} />
          ))}
          {list.length === 0 && <li className={styles.empty}>아직 버킷리스트가 없어요</li>}
        </ul>
      </section>

      <Link to={`/categories/${prev.id}`} replace className={styles.prev} aria-label={`이전 카테고리: ${prev.title}`}>
        <img src={arrowLeft} alt="" />
      </Link>
      <Link to={`/categories/${next.id}`} replace className={styles.next} aria-label={`다음 카테고리: ${next.title}`}>
        <img src={arrowRight} alt="" />
      </Link>
    </div>
  )
}
