import { CATEGORY_COLORS } from '../lib/categoryColors'
import type { CategoryColor } from '../types'
import styles from './Folder.module.css'

const photoSlots = [styles.photoLeft, styles.photoCenter, styles.photoRight]

interface Props {
  color: CategoryColor
  photos?: string[]
  className?: string
}

// Figma 64:605 — 뒷판 → 삐져나온 사진(최대 3장) → 앞판 순서로 겹쳐 그림
export function Folder({ color, photos = [], className = '' }: Props) {
  const fill = CATEGORY_COLORS[color]
  return (
    <div className={`${styles.folder} ${className}`}>
      <div className={styles.back} style={{ background: fill }} />
      {photos.slice(0, 3).map((src, i) => (
        <div key={i} className={`${styles.photo} ${photoSlots[i]}`}>
          <img src={src} alt="" />
        </div>
      ))}
      {/* path는 Figma에서 내보낸 그대로 */}
      <svg className={styles.front} viewBox="0 0 162.58 116" preserveAspectRatio="none" aria-hidden>
        <path
          d="M7.72843 107.167L0.52524 10.1665C0.137697 4.94774 4.26739 0.5 9.50052 0.5H60.8768C63.1499 0.5 65.3388 1.36012 67.0038 2.90759L77.7887 12.9311C79.4537 14.4786 81.6426 15.3387 83.9157 15.3387H153.08C158.325 15.3387 162.46 19.8072 162.052 25.0372L155.656 107.199C155.292 111.884 151.383 115.5 146.684 115.5H16.7037C11.9917 115.5 8.07738 111.866 7.72843 107.167Z"
          fill={fill}
          stroke="black"
        />
      </svg>
    </div>
  )
}
