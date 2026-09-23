import { useState, type FormEvent } from 'react'
import tape from '../assets/figma/tape.svg'
import popup from '../components/Popup.module.css'
import { useStore } from '../data/store'
import { supabase } from '../lib/supabase'
import styles from './AuthScreen.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Supabase 에러를 사람 말로 */
function messageOf(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/rate limit|security purposes/i.test(msg)) return '잠깐만요! 코드는 조금 뒤에 다시 보낼 수 있어요.'
  if (/expired|invalid/i.test(msg)) return '코드가 맞지 않거나 시간이 지났어요. 다시 받아볼까요?'
  return `문제가 생겼어요: ${msg}`
}

// 로그인: 이메일로 받은 숫자 코드 입력 (홈 화면 앱에서도 되도록 링크 대신 코드)
export function LoginPage() {
  const { sendCode, verifyCode } = useStore()
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  const onSend = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      await sendCode(email.trim())
      setStep('code')
    })
  }

  const onVerify = (e: FormEvent) => {
    e.preventDefault()
    run(() => verifyCode(email.trim(), code))
  }

  // 개발용: 대시보드에서 만든 테스트 계정(비밀번호)으로 로그인 — 짝꿍 역할 테스트할 때. 배포 빌드엔 안 보임
  const onPasswordLogin = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
    })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.paper}>
        <img className={styles.tape} src={tape} alt="" />
        <h1 className={styles.logo}>우리의 버킷리스트</h1>

        {step === 'password' ? (
          <form onSubmit={onPasswordLogin}>
            <p className={styles.lead}>개발용 테스트 계정 로그인</p>
            <label className={popup.field}>
              <span className={popup.label}>이메일</span>
              <input className={popup.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className={popup.field}>
              <span className={popup.label}>비밀번호</span>
              <input
                className={popup.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.primary} disabled={busy || !email || !password}>
              {busy ? '확인 중…' : '로그인'}
            </button>
            <button type="button" className={styles.link} onClick={() => setStep('email')}>
              코드 로그인으로
            </button>
          </form>
        ) : step === 'email' ? (
          <form onSubmit={onSend}>
            <p className={styles.lead}>이메일로 로그인 코드를 보내드려요</p>
            <label className={popup.field}>
              <span className={popup.label}>이메일</span>
              <input
                className={popup.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="love@example.com"
                autoFocus
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.primary} disabled={busy || !EMAIL.test(email.trim())}>
              {busy ? '보내는 중…' : '코드 받기'}
            </button>
            {import.meta.env.DEV && (
              <button type="button" className={styles.link} onClick={() => setStep('password')}>
                개발용: 테스트 계정(비밀번호)으로 로그인
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={onVerify}>
            <p className={styles.lead}>
              {email} 으로 온 숫자 코드를 넣어주세요.
              <br />
              안 보이면 스팸함도 확인해 주세요.
            </p>
            <label className={popup.field}>
              <span className={popup.label}>코드</span>
              <input
                className={`${popup.input} ${styles.codeInput}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="123456"
                autoFocus
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.primary} disabled={busy || code.length < 6}>
              {busy ? '확인 중…' : '로그인'}
            </button>
            <button type="button" className={styles.link} onClick={() => run(() => sendCode(email.trim()))}>
              코드 다시 받기
            </button>
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
              }}
            >
              다른 이메일로
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
