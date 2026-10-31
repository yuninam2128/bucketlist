import { createContext, useContext } from 'react'
import type { LocalPhoto } from '../lib/photos'
import type { Author, BucketItem, Category, Couple, DiaryEntry } from '../types'

export interface NewCategory {
  title: string
  color: string
}

export interface NewItem {
  title: string
  categoryId: string
  date?: string
}

/** 올리는 중 상태 — 화면 위 진행 표시와 "앱 닫지 마세요" 경고에 씀 */
export interface SavingState {
  /** 사진 업로드나 저장이 하나라도 진행 중 */
  busy: boolean
  photosDone: number
  photosTotal: number
}

export interface Completion {
  /** 완료한 날 (YYYY-MM-DD) */
  date: string
  /** 고른 사진 (미리보기 URL + 올릴 원본) */
  photos: LocalPhoto[]
  note?: string
  /** 대표 사진 누끼 작업 (오래 걸려서 완료 후에도 백그라운드로 계속) */
  stickerJob?: Promise<Blob>
}

export interface ProfileInput {
  nickname?: string
  /** 새 프로필 사진 (정사각형으로 줄인 것) */
  avatar?: Blob
}

/**
 * - loading: 세션/데이터 불러오는 중
 * - signedOut: 로그인 화면
 * - noCouple: 로그인은 했는데 아직 커플 연결 전 (만들기 / 초대코드로 들어가기)
 * - ready: 앱 사용
 * - error: 데이터를 못 불러옴 (DB 설정 전, 인터넷 끊김 등)
 */
export type AuthStatus = 'loading' | 'signedOut' | 'noCouple' | 'ready' | 'error'

export interface Store {
  status: AuthStatus
  loadError?: string
  /** 불러오기 다시 시도 */
  retry: () => void
  /** 로그인한 이메일 */
  email?: string

  // ---- 로그인 / 커플 연결 ----
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  createCouple: (nickname: string, startDate: string) => Promise<void>
  joinCouple: (inviteCode: string, nickname: string) => Promise<void>
  signOut: () => Promise<void>

  // ---- 데이터 ----
  /** 지금 앱을 쓰는 사람은 항상 'me', 짝꿍은 'partner' */
  currentUser: Author
  couple: Couple
  categories: Category[]
  items: BucketItem[]
  diaries: DiaryEntry[]

  /** 완료 처리 + 사진/소감이 있으면 그 날짜의 추억으로 저장 (누끼는 준비되면 자동으로 붙음) */
  completeItem: (id: string, completion: Completion) => Promise<void>
  /** 완료 취소. removeMemory면 남긴 추억(사진·소감)도 지우고, 아니면 남겨둠 (다시 완료하면 거기에 이어짐) */
  uncompleteItem: (id: string, options?: { removeMemory?: boolean }) => Promise<void>
  /** 추억에 내 한마디 남기기/수정 (빈 문자열이면 삭제) */
  saveNote: (diaryId: string, text: string) => Promise<void>
  /** 추억에 사진 더하기 (첫 사진이면 누끼 스티커도) */
  addPhotos: (diaryId: string, photos: LocalPhoto[], stickerJob?: Promise<Blob>) => Promise<void>

  // ---- 사진 미리 올리기 (고르자마자 뒤에서 업로드 → 완료 누를 땐 거의 안 기다림) ----
  /** 바로 업로드 시작 → Storage 경로 */
  preUpload: (photo: LocalPhoto) => Promise<string>
  /** 미리 올렸는데 안 쓰게 된 사진 지우기 (팝업 취소, 사진 빼기) */
  discardUploads: (paths: string[]) => void
  /** 진행 중인 업로드가 다 끝나면 — 누끼 모델(56MB) 다운로드가 업로드와 인터넷을 나눠 쓰지 않게 */
  whenUploadsIdle: () => Promise<void>
  saving: SavingState
  /** 캘린더 스티커를 새로 붙이거나 바꾸기 (누끼 실패 후 다시 시도, 다른 사진으로 바꾸기) */
  setSticker: (diaryId: string, sticker: Blob) => Promise<void>
  /** 기록 없이 완료한 항목에 빈 추억 만들기 → 추억 id */
  startMemory: (itemId: string) => Promise<string>
  addCategory: (input: NewCategory) => Promise<void>
  updateCategory: (id: string, input: NewCategory) => Promise<void>
  /** 카테고리 삭제 — 안의 버킷리스트·추억(사진 포함)도 같이 지움 */
  deleteCategory: (id: string) => Promise<void>
  /** 추억에서 사진 한 장 빼기 (index = 추억 사진 순서) */
  removePhoto: (diaryId: string, index: number) => Promise<void>
  addItem: (input: NewItem) => Promise<void>
  updateItem: (id: string, input: NewItem) => Promise<void>
  /** 항목 삭제 — 그 항목으로 남긴 추억(사진 포함)도 같이 지움 */
  deleteItem: (id: string) => Promise<void>
  updateProfile: (input: ProfileInput) => Promise<void>
  updateStartDate: (date: string) => Promise<void>
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore는 StoreProvider 안에서만 쓸 수 있어요')
  return store
}
