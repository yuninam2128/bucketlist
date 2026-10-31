import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { dehydrate, QueryClient } from '@tanstack/react-query'

/**
 * 서버 데이터 캐시 (TanStack Query).
 * - 폰(localStorage)에 저장해 둬서 앱을 열면 지난 데이터를 즉시 보여주고, 새 데이터는 뒤에서 받음
 * - 앱으로 돌아오면(창 포커스) 자동으로 새로고침 → 짝꿍이 바꾼 것도 보임
 * - 인터넷이 잠깐 끊겨도 두 번까지 자동 재시도
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30초 안에 다시 오면 그냥 캐시 사용 (탭 이동마다 새로 받지 않게)
      staleTime: 30_000,
      // 폰 캐시는 일주일 보관
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
})


const STORAGE_KEY = 'couple-bucketlist:data'

export const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: STORAGE_KEY,
  // 저장이 너무 잦지 않게 1초에 한 번만
  throttleTime: 1000,
})

/** 데이터 모양이 바뀌면 이 값을 올려서 예전 캐시를 버림 */
export const CACHE_VERSION = 'v1'
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7

// 1초 몰아 저장 때문에, 저장 직후 앱을 닫거나 새로고침하면 마지막 변경이 폰 캐시에 빠질 수 있음
// → 앱이 뒤로 가거나 닫힐 때 바로 저장. 단, 복원이 끝나기 전엔 빈 캐시로 덮어쓰지 않게 기다림
let restored = false
export const markRestored = () => {
  restored = true
}

function saveNow() {
  if (!restored) return
  try {
    const client = { buster: CACHE_VERSION, timestamp: Date.now(), clientState: dehydrate(queryClient) }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(client))
  } catch {
    // 저장 공간 부족 등 — 다음 1초 저장에 맡김
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveNow)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow()
  })
}
