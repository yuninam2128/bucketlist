import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ErrorToast } from './components/ErrorToast'
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

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Gate />
        <ErrorToast />
      </BrowserRouter>
    </StoreProvider>
  )
}
