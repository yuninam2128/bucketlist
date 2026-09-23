import type { Category } from '../types'
import styles from './CategoryBadge.module.css'

// Figma 64:592 — 손그림 알약 배지. path는 Figma에서 내보낸 그대로, 색만 카테고리별로 바꿈
export function CategoryBadge({ category, className = '' }: { category: Category; className?: string }) {
  return (
    <span className={`${styles.badge} ${className}`}>
      <svg className={styles.shape} viewBox="0 0 65.9461 20.0566" preserveAspectRatio="none" aria-hidden>
        <path
          d="M21.4382 0.323701C14.2626 -0.407849 8.23122 0.234799 4.71956 0.925648C3.25121 1.21452 2.19111 2.42598 1.93163 3.89981L0.0616338 14.5216C-0.365421 16.9473 1.48021 19.1789 3.94296 19.2147L61.8879 20.0562C64.2218 20.0901 66.0889 18.1266 65.9375 15.7973L65.1823 4.17453C65.0427 2.02578 63.2272 0.373144 61.0748 0.435563L47.2208 0.83733C36.5692 1.22946 30.6696 1.26484 21.4382 0.323701Z"
          fill={category.color}
        />
      </svg>
      <span className={styles.label}>{category.title}</span>
    </span>
  )
}
