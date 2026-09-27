import type { ComponentType, ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ErrorToast } from './components/ErrorToast'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { CACHE_MAX_AGE, CACHE_VERSION, markRestored, persister, queryClient } from './data/queryClient'
import { useStore } from './data/store'
import { StoreProvider } from './data/StoreProvider'
import { BucketListPage } from './pages/BucketListPage'
import { CalendarPage } from './pages/CalendarPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { CouplePage } from './pages/CouplePage'
import { HomePage } from './pages/HomePage'
import { LoadErrorPage } from './pages/LoadErrorPage'
import { LoginPage } from './pages/LoginPage'
import { MemoryPage } from './pages/MemoryPage'
import styles from './App.module.css'

// 로그인 → 커플 연결 → 앱 순서로 보여줌
function Gate() {
  const { status } = useStore()

  if (status === 'loading') return <p className={styles.splash}>우리의 버킷리스트</p>
  if (status === 'signedOut') return <LoginPage />
  if (status === 'error') return <LoadErrorPage />
  if (status === 'noCouple') return <CouplePage />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:categoryId" element={<BucketListPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="memories/:memoryId" element={<MemoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

interface AppProps {
  /** 개발용 미리보기에선 가짜 데이터 Provider로 바꿔 끼움 (main.tsx) */
  Provider?: ComponentType<{ children: ReactNode }>
}

export default function App({ Provider = StoreProvider }: AppProps) {
  return (
    // 서버 데이터 캐시를 폰에 저장·복원 (data/queryClient.ts)
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_VERSION }}
      onSuccess={markRestored}
      onError={markRestored}
    >
      <Provider>
        <BrowserRouter>
          <Gate />
          <ErrorToast />
        </BrowserRouter>
      </Provider>
    </PersistQueryClientProvider>
  )
}
