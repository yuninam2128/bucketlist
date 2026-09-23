import tape from '../assets/figma/tape.svg'
import { useStore } from '../data/store'
import styles from './AuthScreen.module.css'

// 데이터를 못 불러왔을 때 (DB 설정 전, 인터넷 끊김 등)
export function LoadErrorPage() {
  const { loadError, retry, signOut } = useStore()
  // 테이블/함수가 없다는 에러면 schema.sql 을 아직 안 돌린 것
  const needsSetup = /schema cache|does not exist/i.test(loadError ?? '')

  return (
    <div className={styles.screen}>
      <div className={styles.paper}>
        <img className={styles.tape} src={tape} alt="" />
        <h1 className={styles.logo}>앗, 불러오지 못했어요</h1>
        <p className={styles.lead}>
          {needsSetup
            ? 'Supabase에 DB가 아직 없어요. SQL Editor에서 supabase/schema.sql 을 실행해 주세요.'
            : navigator.onLine
              ? '잠시 후 다시 해볼까요?'
              : '인터넷 연결을 확인해 주세요.'}
        </p>
        <p className={styles.error}>{loadError}</p>
        <button type="button" className={styles.primary} onClick={retry}>
          다시 불러오기
        </button>
        <button type="button" className={styles.link} onClick={signOut}>
          로그아웃
        </button>
      </div>
    </div>
  )
}
