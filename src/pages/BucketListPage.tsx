import { Link, Navigate, useNavigate, useParams } from 'react-router'
import arrowLeft from '../assets/figma/icon-arrow-left.png'
import arrowRight from '../assets/figma/icon-arrow-right.png'
import categoryRule from '../assets/figma/category-rule.svg'
import ddayEllipse from '../assets/figma/dday-ellipse.svg'
import { BucketItemRow } from '../components/BucketItemRow'
import { useStore } from '../data/store'
import { daysSince } from '../lib/date'
import styles from './BucketListPage.module.css'

export function BucketListPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const { couple, categories, items, toggleItem } = useStore()

  const index = categories.findIndex((c) => c.id === categoryId)
  if (index === -1) return <Navigate to="/categories" replace />

  const category = categories[index]
  const prev = categories[(index - 1 + categories.length) % categories.length]
  const next = categories[(index + 1) % categories.length]
  // 안 한 것 먼저, 완료한 건 아래로
  const list = items
    .filter((it) => it.categoryId === category.id)
    .sort((a, b) => Number(a.done) - Number(b.done))
  const dday = daysSince(couple.startDate)

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate('/categories')} aria-label="뒤로">
        <img src={arrowLeft} alt="" />
      </button>

      <section className={styles.paper}>
        <div className={styles.ddayCard}>
          <img className={styles.ddayEllipse} src={ddayEllipse} alt="" />
          <p className={styles.dday} aria-label={`D+${dday}`}>
            <span className={styles.ddayD}>D</span>
            <span className={styles.ddayPlus}>+</span>
            <span className={styles.ddayNum}>{dday}</span>
          </p>
        </div>

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
