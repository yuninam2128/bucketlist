import { Outlet } from 'react-router'
import { Avatars } from './Avatars'
import styles from './AppLayout.module.css'
import { TabBar } from './TabBar'

export function AppLayout() {
  return (
    <div className={styles.app}>
      <Avatars />
      <main className={styles.main}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
