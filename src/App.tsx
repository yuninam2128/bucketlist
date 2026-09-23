import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { StoreProvider } from './data/StoreProvider'
import { BucketListPage } from './pages/BucketListPage'
import { CalendarPage } from './pages/CalendarPage'
import { CategoriesPage } from './pages/CategoriesPage'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* 홈 화면 디자인이 나오기 전까지는 카테고리로 */}
            <Route index element={<Navigate to="/categories" replace />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categories/:categoryId" element={<BucketListPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            {/* TODO: 추가 화면 */}
            <Route path="*" element={<Navigate to="/categories" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
