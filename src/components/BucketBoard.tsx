import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import categoryRule from '../assets/figma/category-rule.svg'
import { useStore } from '../data/store'
import type { BucketItem } from '../types'
import { AddButton } from './AddButton'
import styles from './BucketBoard.module.css'
import { BucketItemRow } from './BucketItemRow'
import { CompleteForm } from './CompleteForm'
import { ConfirmPopup } from './ConfirmPopup'
import { DdayCard } from './DdayCard'
import { ItemForm } from './ItemForm'

interface Props {
  items: BucketItem[]
  /** 스티커: 카테고리 이름(줄바꿈 가능) + 필요하면 아래 작은 글씨 */
  sticky: { title: string; sub?: string; color: string }
  /** 추가 팝업에서 기본으로 선택할 카테고리 */
  defaultCategoryId?: string
  /** 뒤로가기·화살표 등 종이 바깥에 얹을 요소 */
  children?: ReactNode
}

// Figma 45:2 — D+N 카드 + 스티커 + 체크리스트 종이. 홈(전체)과 카테고리별 화면이 공유.
// [리스트 | 사진] 으로 이 목록의 추억 사진을 모아볼 수 있음 (폴더 = 앨범)
export function BucketBoard({ items, sticky, defaultCategoryId, children }: Props) {
  const { categories, diaries, completeItem, uncompleteItem, addItem, updateItem, deleteItem, startMemory } =
    useStore()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'photos'>('list')
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState<BucketItem | null>(null)
  const [editing, setEditing] = useState<BucketItem | null>(null)
  const [deleting, setDeleting] = useState<BucketItem | null>(null)
  const [uncompleting, setUncompleting] = useState<BucketItem | null>(null)

  // 체크 → 완료 팝업, 체크 해제 → 바로 완료 취소
  const toggle = (id: string) => {
    const item = items.find((it) => it.id === id)
    if (!item) return
    if (!item.done) return setCompleting(item)
    // 남긴 추억이 있으면 어떻게 할지 물어보고, 없으면 바로 완료 취소
    if (memories.some((d) => d.bucketItemId === id)) setUncompleting(item)
    else uncompleteItem(id)
  }
  // 안 한 것 먼저, 완료한 건 아래로
  const list = [...items].sort((a, b) => Number(a.done) - Number(b.done))

  // 이 목록 항목들의 추억 (최신순)
  const itemIds = new Set(items.map((it) => it.id))
  const memories = diaries
    .filter((d) => d.bucketItemId && itemIds.has(d.bucketItemId))
    .sort((a, b) => b.date.localeCompare(a.date))
  const photos = memories.flatMap((d) => d.photos.map((src, index) => ({ src, memoryId: d.id, index })))

  // 완료했지만 기록이 없던 항목이면 빈 추억을 만들어서라도 열어줌 (사진은 거기서 추가)
  const openMemory = async (itemId: string) => {
    const memory = memories.find((d) => d.bucketItemId === itemId)
    navigate(`/memories/${memory?.id ?? (await startMemory(itemId))}`)
  }

  return (
    <div className={styles.page}>
      <section className={styles.paper}>
        <DdayCard className={styles.ddayCard} />

        <div className={styles.sticky} style={{ background: sticky.color }}>
          <p className={styles.stickyLabel}>CATEGORY</p>
          <img className={styles.stickyRule} src={categoryRule} alt="" />
          <p className={styles.stickyTitle}>{sticky.title}</p>
          {sticky.sub && <p className={styles.stickySub}>{sticky.sub}</p>}
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={view === 'list' ? styles.tabActive : ''}
            onClick={() => setView('list')}
          >
            리스트
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'photos'}
            className={view === 'photos' ? styles.tabActive : ''}
            onClick={() => setView('photos')}
          >
            사진 {photos.length > 0 && photos.length}
          </button>
        </div>

        {view === 'list' ? (
          <ul className={styles.items}>
            {list.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId)
              return (
                category && (
                  <BucketItemRow
                    key={item.id}
                    item={item}
                    category={category}
                    onToggle={toggle}
                    onEdit={() => setEditing(item)}
                    onDelete={() => setDeleting(item)}
                    onOpenMemory={() => openMemory(item.id)}
                  />
                )
              )
            })}
            {list.length === 0 && <li className={styles.empty}>아직 버킷리스트가 없어요</li>}
            <li>
              <AddButton label="버켓리스트 추가" className={styles.add} onClick={() => setAdding(true)} />
            </li>
          </ul>
        ) : (
          <ul className={`${styles.items} ${styles.album}`}>
            {photos.map((p) => (
              <li key={`${p.memoryId}-${p.index}`}>
                <button
                  type="button"
                  className={styles.albumPhoto}
                  onClick={() => navigate(`/memories/${p.memoryId}?photo=${p.index}`)}
                >
                  <img src={p.src} alt="" />
                </button>
              </li>
            ))}
            {photos.length === 0 && (
              <li className={styles.empty}>버킷리스트를 완료하고 사진을 남기면 여기 모여요</li>
            )}
          </ul>
        )}
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

      {editing && (
        <ItemForm
          item={editing}
          onCancel={() => setEditing(null)}
          onSubmit={(input) => {
            updateItem(editing.id, input)
            setEditing(null)
          }}
          onDelete={() => {
            deleteItem(editing.id)
            setEditing(null)
          }}
        />
      )}

      {uncompleting && (
        <ConfirmPopup
          title="완료를 취소할까요?"
          message={`'${uncompleting.title}'에 남긴 추억(사진·소감)은 어떻게 할까요?`}
          confirmLabel="추억도 지우기"
          secondary={{
            label: '추억은 남겨두기',
            onClick: () => {
              uncompleteItem(uncompleting.id)
              setUncompleting(null)
            },
          }}
          onCancel={() => setUncompleting(null)}
          onConfirm={() => {
            uncompleteItem(uncompleting.id, { removeMemory: true })
            setUncompleting(null)
          }}
        />
      )}

      {deleting && (
        <ConfirmPopup
          title="버킷리스트를 지울까요?"
          message={`'${deleting.title}'${
            memories.some((d) => d.bucketItemId === deleting.id) ? ' — 남긴 추억(사진·소감)도 같이 지워져요.' : ''
          }`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteItem(deleting.id)
            setDeleting(null)
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
