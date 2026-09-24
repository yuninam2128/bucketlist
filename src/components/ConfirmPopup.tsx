import { Popup } from './Popup'
import styles from './ConfirmPopup.module.css'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

// 지우기 전에 한 번 더 묻기 (앱 안에선 confirm 창이 안 떠서 테이프 종이 팝업으로)
export function ConfirmPopup({ title, message, confirmLabel = '지우기', onConfirm, onCancel }: Props) {
  return (
    <Popup title={title} submitLabel={confirmLabel} canSubmit onSubmit={onConfirm} onCancel={onCancel}>
      <p className={styles.message}>{message}</p>
    </Popup>
  )
}
