import samplePhoto from './sample-photo.jpg'
import sampleSticker from './sample-sticker.png'
import type { BucketItem, Category, Couple, DiaryEntry } from '../types'

// 개발용 미리보기(?preview) 가짜 데이터 — 로그인 없이 화면 확인할 때만 씀. 배포 빌드엔 안 들어감

export const mockCouple: Couple = {
  startDate: '2026-07-18',
  names: { me: '유니', partner: '차니' },
  avatars: {},
  inviteCode: 'A1B2C3',
  partnerJoined: true,
}

// 완료한 항목에 남긴 기록
export const mockDiaries: DiaryEntry[] = [
  {
    id: 'd-0921',
    date: '2026-09-21',
    bucketItemId: 'movie-3',
    photos: Array(5).fill(samplePhoto),
    sticker: sampleSticker,
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
  {
    id: 'd-0901',
    date: '2026-09-01',
    bucketItemId: 'travel-1',
    photos: [samplePhoto, samplePhoto],
    sticker: sampleSticker,
    notes: [
      { author: 'me', text: '도톤보리 최고' },
      { author: 'partner', text: '또 가자!' },
    ],
  },
]

export const mockCategories: Category[] = [
  { id: 'movie', title: '영화 뭐볼까', color: '#c0dac3', coverPhotos: [] },
  { id: 'travel', title: '여행 어디갈까', color: '#c0c4da', coverPhotos: [] },
  { id: 'food', title: '맛집 뭐먹을까', color: '#e2a4bf', coverPhotos: [] },
  { id: 'etc', title: '해보고 싶은 것', color: '#daccc0', coverPhotos: [] },
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
  movie(5, '크리스마스에 영화관 전세 내고 좋아하는 영화 세 편 연달아 보기'),
  movie(3, '영화제 가기', true, '2026-09-21'),
  movie(4, '팝콘 직접 만들기', true, '2026-09-13'),
  { id: 'travel-0', categoryId: 'travel', title: '제주도 한달살기', done: false, author: 'me' },
  { id: 'travel-1', categoryId: 'travel', title: '오사카 가기', done: true, date: '2026-09-01', author: 'partner' },
  { id: 'food-0', categoryId: 'food', title: '오마카세 가기', done: false, author: 'partner' },
]
