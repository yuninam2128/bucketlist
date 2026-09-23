import { NavLink } from 'react-router'
import iconCalendar from '../assets/figma/icon-calendar.png'
import iconGrid from '../assets/figma/icon-grid.png'
import iconHome from '../assets/figma/icon-home.png'
import iconPlus from '../assets/figma/icon-plus.png'
import styles from './TabBar.module.css'

const tabs = [
  { to: '/', label: '홈', icon: iconHome, className: styles.home },
  { to: '/categories', label: '카테고리', icon: iconGrid, className: styles.grid },
  { to: '/calendar', label: '캘린더', icon: iconCalendar, className: styles.calendar },
  { to: '/new', label: '추가', icon: iconPlus, className: styles.plus },
]

export function TabBar() {
  return (
    <nav className={styles.bar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end className={`${styles.tab} ${tab.className}`} aria-label={tab.label}>
            <img src={tab.icon} alt="" />
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
