import styles from './ConfirmPopup.module.css'
import { Popup } from './Popup'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** 두 번째 선택지 (예: "추억은 남기기") — 메시지 아래 밑줄 버튼으로 */
  secondary?: { label: string; onClick: () => void }
  onConfirm: () => void
  onCancel: () => void
}

// 지우기 전에 한 번 더 묻기 (앱 안에선 confirm 창이 안 떠서 테이프 종이 팝업으로)
export function ConfirmPopup({
  title,
  message,
  confirmLabel = '지우기',
  cancelLabel = '그만두기',
  secondary,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Popup
      title={title}
      submitLabel={confirmLabel}
      cancelLabel={cancelLabel}
      canSubmit
      onSubmit={onConfirm}
      onCancel={onCancel}
    >
      <p className={styles.message}>{message}</p>
      {secondary && (
        <button type="button" className={styles.secondary} onClick={secondary.onClick}>
          {secondary.label}
        </button>
      )}
    </Popup>
  )
}
