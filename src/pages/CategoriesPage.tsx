import { useState } from 'react'
import { Link } from 'react-router'
import { AddButton } from '../components/AddButton'
import { CategoryForm } from '../components/CategoryForm'
import { ConfirmPopup } from '../components/ConfirmPopup'
import { Folder } from '../components/Folder'
import { useStore } from '../data/store'
import type { Category } from '../types'
import styles from './CategoriesPage.module.css'

export function CategoriesPage() {
  const { categories, items, diaries, addCategory, updateCategory, deleteCategory } = useStore()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  // 폴더에서 삐져나오는 사진: 그 카테고리 항목을 완료하며 남긴 사진(최신순) + 직접 지정한 표지
  const photosOf = (categoryId: string, coverPhotos: string[]) => {
    const itemIds = new Set(items.filter((it) => it.categoryId === categoryId).map((it) => it.id))
    const fromDiaries = diaries
      .filter((d) => d.bucketItemId && itemIds.has(d.bucketItemId))
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((d) => d.photos)
    return [...fromDiaries, ...coverPhotos]
  }

  return (
    <>
      <ul className={styles.list}>
        {categories.map((category, i) => {
          const count = items.filter((it) => it.categoryId === category.id).length
          return (
            <li key={category.id}>
              {/* 지그재그: 짝수 줄은 폴더-글자, 홀수 줄은 글자-폴더 */}
              <Link to={`/categories/${category.id}`} className={`${styles.row} ${i % 2 ? styles.reversed : ''}`}>
                <Folder color={category.color} photos={photosOf(category.id, category.coverPhotos)} />
                <div className={styles.text}>
                  <p className={styles.title}>{category.title}</p>
                  <p className={styles.count}>총 {count}개의 버켓리스트</p>
                </div>
              </Link>
              {/* 폴더 링크 밖에 둬서 누르면 이동 대신 고치기 */}
              <button
                type="button"
                className={`${styles.edit} ${i % 2 ? styles.editReversed : ''}`}
                onClick={() => setEditing(category)}
              >
                수정
              </button>
            </li>
          )
        })}
      </ul>

      <AddButton label="카테고리 추가" className={styles.add} onClick={() => setAdding(true)} />

      {editing && (
        <CategoryForm
          category={editing}
          onCancel={() => setEditing(null)}
          onSubmit={(input) => {
            updateCategory(editing.id, input)
            setEditing(null)
          }}
          onDelete={() => {
            setDeleting(editing)
            setEditing(null)
          }}
        />
      )}

      {deleting && (
        <ConfirmPopup
          title="카테고리를 지울까요?"
          message={`'${deleting.title}' 안의 버킷리스트와 남긴 추억(사진·소감)이 모두 지워져요.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteCategory(deleting.id)
            setDeleting(null)
          }}
        />
      )}

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
