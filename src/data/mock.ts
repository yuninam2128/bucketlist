import samplePhoto from '../assets/figma/sample-photo.jpg'
import type { BucketItem, Category, Couple } from '../types'

// Supabase 연결 전까지 쓰는 임시 데이터

export const mockCouple: Couple = {
  startDate: '2026-08-21',
}

export const mockCategories: Category[] = [
  {
    id: 'movie',
    title: '영화',
    description: '뭐볼까',
    coverPhotos: [samplePhoto, samplePhoto, samplePhoto],
  },
  { id: 'travel', title: '여행', description: '어디갈까', coverPhotos: [] },
  { id: 'food', title: '맛집', description: '뭐먹을까', coverPhotos: [] },
  { id: 'etc', title: '해보고 싶은 것', coverPhotos: [] },
]

const titles = ['인터스텔라 재개봉 보기', '심야영화 보기', '자동차 극장 가기', '영화제 가기', '팝콘 직접 만들기']

export const mockItems: BucketItem[] = [
  ...titles.map((title, i) => ({
    id: `movie-${i}`,
    categoryId: 'movie',
    title,
    done: i >= 3,
    date: '2026-12-25',
    tag: i % 2 === 0 ? '같이' : '데이트',
    author: (i % 2 === 0 ? 'me' : 'partner') as BucketItem['author'],
  })),
  { id: 'travel-0', categoryId: 'travel', title: '제주도 한달살기', done: false, author: 'me' },
  { id: 'travel-1', categoryId: 'travel', title: '오사카 가기', done: true, date: '2026-09-01', author: 'partner' },
  { id: 'food-0', categoryId: 'food', title: '오마카세 가기', done: false, author: 'partner' },
]
