import avatar from '../assets/figma/avatar.svg'
import styles from './Avatars.module.css'

// 우측 상단 두 사람 프로필 (나중에 프로필 사진으로 교체)
export function Avatars() {
  return (
    <div className={styles.avatars} aria-hidden>
      <img className={styles.me} src={avatar} alt="" />
      <img className={styles.partner} src={avatar} alt="" />
    </div>
  )
}
