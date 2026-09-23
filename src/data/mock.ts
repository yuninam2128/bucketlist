import samplePhoto from '../assets/figma/sample-photo.jpg'
import type { BucketItem, Category, Couple, DiaryEntry } from '../types'

// Supabase 연결 전까지 쓰는 임시 데이터

export const mockCouple: Couple = {
  startDate: '2026-08-21',
  names: { me: '로빈슨', partner: '방드르디' },
}

// 완료한 항목에 남긴 기록
export const mockDiaries: DiaryEntry[] = [
  {
    id: 'd-0921',
    date: '2026-09-21',
    bucketItemId: 'movie-3',
    photos: [samplePhoto, samplePhoto],
    notes: [
      { author: 'me', text: '오늘은 즐거워따' },
      { author: 'partner', text: '일을 너무 많이 시켜서 담배피다가\n죄다 날려먹었다! 쫓겨나겠지' },
    ],
  },
  {
    id: 'd-0913',
    date: '2026-09-13',
    bucketItemId: 'movie-4',
    photos: [samplePhoto],
    notes: [{ author: 'partner', text: '팝콘 대성공 🍿' }],
  },
]

export const mockCategories: Category[] = [
  { id: 'movie', title: '영화', color: 'green', description: '뭐볼까', coverPhotos: [] },
  { id: 'travel', title: '여행', color: 'blue', description: '어디갈까', coverPhotos: [] },
  { id: 'food', title: '맛집', color: 'pink', description: '뭐먹을까', coverPhotos: [] },
  { id: 'etc', title: '해보고 싶은 것', color: 'beige', coverPhotos: [] },
]

const movie = (i: number, title: string, done = false, date = '2026-12-25'): BucketItem => ({
  id: `movie-${i}`,
  categoryId: 'movie',
  title,
  done,
  date,
  author: i % 2 === 0 ? 'me' : 'partner',
})

export const mockItems: BucketItem[] = [
  movie(0, '인터스텔라 재개봉 보기'),
  movie(1, '심야영화 보기'),
  movie(2, '자동차 극장 가기'),
  movie(3, '영화제 가기', true, '2026-09-21'),
  movie(4, '팝콘 직접 만들기', true, '2026-09-13'),
  { id: 'travel-0', categoryId: 'travel', title: '제주도 한달살기', done: false, author: 'me' },
  { id: 'travel-1', categoryId: 'travel', title: '오사카 가기', done: true, date: '2026-09-01', author: 'partner' },
  { id: 'food-0', categoryId: 'food', title: '오마카세 가기', done: false, author: 'partner' },
]
