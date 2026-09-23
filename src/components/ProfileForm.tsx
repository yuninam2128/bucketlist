import { useRef, useState, type ChangeEvent } from 'react'
import { useStore } from '../data/store'
import { cropSquare } from '../lib/image'
import { DateField } from './DateField'
import { Popup } from './Popup'
import popup from './Popup.module.css'
import styles from './ProfileForm.module.css'

// 우측 상단 동그라미를 누르면: 내 프로필 사진·닉네임, 사귄 날, 짝꿍 초대코드, 로그아웃
export function ProfileForm({ onClose }: { onClose: () => void }) {
  const { couple, email, updateProfile, updateStartDate, signOut } = useStore()
  const [nickname, setNickname] = useState(couple.names.me)
  const [startDate, setStartDate] = useState(couple.startDate)
  const [avatar, setAvatar] = useState<{ blob: Blob; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const nick = nickname.trim()
  const changed = nick !== couple.names.me || startDate !== couple.startDate || !!avatar

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const blob = await cropSquare(file)
    setAvatar({ blob, url: URL.createObjectURL(blob) })
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(couple.inviteCode)
      setCopied(true)
    } catch {
      // 복사가 막힌 환경이면 코드만 보여줌
    }
  }

  return (
    <Popup
      title="프로필"
      submitLabel="저장"
      canSubmit={!!nick && changed}
      onCancel={onClose}
      onSubmit={() => {
        if (nick !== couple.names.me || avatar) updateProfile({ nickname: nick, avatar: avatar?.blob })
        if (startDate !== couple.startDate) updateStartDate(startDate)
        onClose()
      }}
    >
      <div className={styles.avatarRow}>
        <button type="button" className={styles.avatar} onClick={() => fileInput.current?.click()}>
          {avatar || couple.avatars.me ? (
            <img src={avatar?.url ?? couple.avatars.me} alt="내 프로필 사진" />
          ) : (
            <span className={styles.avatarEmpty}>+ 사진</span>
          )}
        </button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPick} />
      </div>

      <label className={popup.field}>
        <span className={popup.label}>내 닉네임</span>
        <input className={popup.input} value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={8} />
      </label>

      <DateField label="사귄 날 (D+N 기준)" value={startDate} onChange={setStartDate} />

      {!couple.partnerJoined && (
        <div className={styles.invite}>
          <p className={popup.label}>짝꿍에게 이 초대코드를 알려주세요</p>
          <button type="button" className={styles.code} onClick={copyCode}>
            {couple.inviteCode}
          </button>
          <p className={styles.hint}>{copied ? '복사했어요!' : '누르면 복사돼요'}</p>
        </div>
      )}

      <button type="button" className={styles.signOut} onClick={signOut}>
        {email} 로그아웃
      </button>
    </Popup>
  )
}
