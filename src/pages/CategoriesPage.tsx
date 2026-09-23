import { useState } from 'react'
import { Link } from 'react-router'
import { CategoryForm } from '../components/CategoryForm'
import { Folder } from '../components/Folder'
import { useStore } from '../data/store'
import styles from './CategoriesPage.module.css'

export function CategoriesPage() {
  const { categories, items, addCategory } = useStore()
  const [adding, setAdding] = useState(false)

  return (
    <>
      <ul className={styles.list}>
        {categories.map((category, i) => {
          const count = items.filter((it) => it.categoryId === category.id).length
          return (
            <li key={category.id}>
              {/* 지그재그: 짝수 줄은 폴더-글자, 홀수 줄은 글자-폴더 */}
              <Link to={`/categories/${category.id}`} className={`${styles.row} ${i % 2 ? styles.reversed : ''}`}>
                <Folder color={category.color} photos={category.coverPhotos} />
                <div className={styles.text}>
                  <p className={styles.title}>{category.title}</p>
                  <p className={styles.count}>총 {count}개의 버켓리스트</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <button type="button" className={styles.add} onClick={() => setAdding(true)}>
        + 새 카테고리
      </button>

      {adding && (
        <CategoryForm
          onCancel={() => setAdding(false)}
          onSubmit={(input) => {
            addCategory(input)
            setAdding(false)
          }}
        />
      )}
    </>
  )
}
