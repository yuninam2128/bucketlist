import { BucketBoard } from '../components/BucketBoard'
import { useStore } from '../data/store'

// 홈: 카테고리 상관없이 전체 버킷리스트
export function HomePage() {
  const { items } = useStore()
  const done = items.filter((it) => it.done).length

  return (
    <BucketBoard
      items={items}
      // 전체 스티커는 어느 카테고리 색과도 겹치지 않게 Figma 기본 회색(#d9d9d9)
      sticky={{ title: '전체', sub: `${done}/${items.length} 완료`, color: '#d9d9d9' }}
    />
  )
}
