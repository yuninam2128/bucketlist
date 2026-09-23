import addTape from '../assets/figma/add-tape.svg'
import iconPlus from '../assets/figma/icon-plus.png'
import styles from './AddButton.module.css'

interface Props {
  label: string
  onClick: () => void
  className?: string
}

// Figma 75:711 — 분홍 모눈 테이프 위에 "OO 추가" + 스티커 + 아이콘
export function AddButton({ label, onClick, className = '' }: Props) {
  return (
    <button type="button" className={`${styles.button} ${className}`} onClick={onClick}>
      <img className={styles.tape} src={addTape} alt="" />
      <span className={styles.label}>{label}</span>
      <img className={styles.plus} src={iconPlus} alt="" />
    </button>
  )
}
