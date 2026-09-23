import { useState } from 'react'
import avatar from '../assets/figma/avatar.svg'
import { useStore } from '../data/store'
import styles from './Avatars.module.css'
import { ProfileForm } from './ProfileForm'

// 우측 상단 두 사람 프로필. 누르면 프로필 팝업
export function Avatars() {
  const { couple } = useStore()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className={styles.avatars} onClick={() => setOpen(true)} aria-label="프로필">
        <span className={`${styles.circle} ${styles.me}`}>
          <img className={styles.frame} src={avatar} alt="" />
          {couple.avatars.me && <img className={styles.photo} src={couple.avatars.me} alt="" />}
        </span>
        <span className={`${styles.circle} ${styles.partner}`}>
          <img className={styles.frame} src={avatar} alt="" />
          {couple.avatars.partner && <img className={styles.photo} src={couple.avatars.partner} alt="" />}
          {/* 짝꿍이 아직 안 들어왔으면 초대하라는 표시 */}
          {!couple.partnerJoined && <span className={styles.invite}>+</span>}
        </span>
      </button>
      {open && <ProfileForm onClose={() => setOpen(false)} />}
    </>
  )
}
