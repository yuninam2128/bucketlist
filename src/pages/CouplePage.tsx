import { useState, type FormEvent } from 'react'
import tape from '../assets/figma/tape.svg'
import { DateField } from '../components/DateField'
import popup from '../components/Popup.module.css'
import { useStore } from '../data/store'
import styles from './AuthScreen.module.css'

function messageOf(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : ''
  if (msg.includes('INVALID_CODE')) return '초대코드가 맞지 않아요. 다시 확인해 주세요.'
  if (msg.includes('COUPLE_FULL')) return '이미 두 사람이 들어간 코드예요.'
  if (msg.includes('ALREADY_IN_COUPLE')) return '이미 커플에 연결돼 있어요.'
  return `문제가 생겼어요: ${msg}`
}

// 로그인 후 처음 한 번: 먼저 시작하는 사람은 커플 만들기(초대코드 발급), 짝꿍은 코드로 들어오기
export function CouplePage() {
  const { createCouple, joinCouple, signOut, email } = useStore()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [startDate, setStartDate] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const nick = nickname.trim()
  const canSubmit = !!nick && (mode === 'create' ? !!startDate : code.trim().length === 6)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'create') await createCouple(nick, startDate)
      else await joinCouple(code.trim(), nick)
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.paper} onSubmit={onSubmit}>
        <img className={styles.tape} src={tape} alt="" />
        <h1 className={styles.logo}>반가워요!</h1>
        <p className={styles.lead}>둘이 같이 쓰려면 한 사람이 먼저 시작하고, 짝꿍은 초대코드로 들어오면 돼요</p>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            className={mode === 'create' ? styles.tabActive : ''}
            onClick={() => setMode('create')}
          >
            먼저 시작하기
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'join'}
            className={mode === 'join' ? styles.tabActive : ''}
            onClick={() => setMode('join')}
          >
            초대코드 받았어요
          </button>
        </div>

        {mode === 'join' && (
          <label className={popup.field}>
            <span className={popup.label}>초대코드 (6자리)</span>
            <input
              className={`${popup.input} ${styles.codeInput}`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6))}
              placeholder="A1B2C3"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>
        )}

        <label className={popup.field}>
          <span className={popup.label}>내 닉네임 (추억에 이름으로 나와요)</span>
          <input
            className={popup.input}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={8}
            placeholder="로빈슨"
          />
        </label>

        {mode === 'create' && <DateField label="사귄 날" value={startDate} onChange={setStartDate} />}

        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.primary} disabled={busy || !canSubmit}>
          {busy ? '잠깐만요…' : mode === 'create' ? '시작하기' : '들어가기'}
        </button>
        <button type="button" className={styles.link} onClick={signOut}>
          {email} 로그아웃
        </button>
      </form>
    </div>
  )
}
