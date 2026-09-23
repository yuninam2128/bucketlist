import { Link, Navigate, useNavigate, useParams } from 'react-router'
import arrowLeft from '../assets/figma/icon-arrow-left.png'
import arrowRight from '../assets/figma/icon-arrow-right.png'
import { BucketBoard } from '../components/BucketBoard'
import { useStore } from '../data/store'
import styles from './BucketListPage.module.css'

export function BucketListPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const { categories, items } = useStore()

  const index = categories.findIndex((c) => c.id === categoryId)
  if (index === -1) return <Navigate to="/categories" replace />

  const category = categories[index]
  const prev = categories[(index - 1 + categories.length) % categories.length]
  const next = categories[(index + 1) % categories.length]

  return (
    <BucketBoard
      items={items.filter((it) => it.categoryId === category.id)}
      defaultCategoryId={category.id}
      sticky={{ title: category.title, color: category.color }}
    >
      <button type="button" className={styles.back} onClick={() => navigate('/categories')} aria-label="뒤로">
        <img src={arrowLeft} alt="" />
      </button>
      <Link to={`/categories/${prev.id}`} replace className={styles.prev} aria-label={`이전 카테고리: ${prev.title}`}>
        <img src={arrowLeft} alt="" />
      </Link>
      <Link to={`/categories/${next.id}`} replace className={styles.next} aria-label={`다음 카테고리: ${next.title}`}>
        <img src={arrowRight} alt="" />
      </Link>
    </BucketBoard>
  )
}
