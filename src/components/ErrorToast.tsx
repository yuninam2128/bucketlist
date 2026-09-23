import { useEffect, useState } from 'react'
import styles from './ErrorToast.module.css'

// 팝업은 바로 닫히고 저장은 뒤에서 하기 때문에, 저장이 실패하면 여기서 알려줌
export function ErrorToast() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timer: number | undefined
    const onError = (e: PromiseRejectionEvent) => {
      console.error(e.reason)
      setMessage(navigator.onLine ? '저장하지 못했어요. 잠시 후 다시 해볼까요?' : '인터넷이 끊겨서 저장하지 못했어요.')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(''), 4000)
    }
    window.addEventListener('unhandledrejection', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onError)
      window.clearTimeout(timer)
    }
  }, [])

  if (!message) return null
  return (
    <div className={styles.toast} role="alert" onClick={() => setMessage('')}>
      {message}
    </div>
  )
}
