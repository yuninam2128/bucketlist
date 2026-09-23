import { Link } from 'react-router'
import { Folder } from '../components/Folder'
import { useStore } from '../data/store'
import styles from './CategoriesPage.module.css'

export function CategoriesPage() {
  const { categories, items } = useStore()

  return (
    <ul className={styles.list}>
      {categories.map((category, i) => {
        const count = items.filter((it) => it.categoryId === category.id).length
        return (
          <li key={category.id}>
            {/* 지그재그: 짝수 줄은 폴더-글자, 홀수 줄은 글자-폴더 */}
            <Link to={`/categories/${category.id}`} className={`${styles.row} ${i % 2 ? styles.reversed : ''}`}>
              <Folder photos={category.coverPhotos} />
              <div className={styles.text}>
                <p className={styles.title}>{category.title}</p>
                <p className={styles.count}>총 {count}개의 버켓리스트</p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
