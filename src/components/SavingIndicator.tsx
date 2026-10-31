import { useStore } from '../data/store'
import styles from './SavingIndicator.module.css'

// 사진·기록이 뒤에서 저장되는 동안 화면 위에 작게 — 이때 앱을 끄면 사진이 날아갈 수 있어서 안내
export function SavingIndicator() {
  const { saving } = useStore()
  if (!saving.busy) return null

  const { photosDone, photosTotal } = saving
  return (
    <div className={styles.indicator} role="status">
      <span className={styles.spinner} aria-hidden />
      {photosTotal > 0 ? `사진 올리는 중 ${photosDone}/${photosTotal}` : '저장 중'}
      <span className={styles.hint}>· 앱을 닫지 마세요</span>
    </div>
  )
}
