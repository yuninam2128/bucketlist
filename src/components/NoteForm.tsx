import { useState } from 'react'
import { useStore } from '../data/store'
import type { DiaryEntry } from '../types'
import styles from './NoteForm.module.css'
import { Popup } from './Popup'
import popup from './Popup.module.css'

interface Props {
  entry: DiaryEntry
  onSubmit: (text: string) => void
  onCancel: () => void
}

// 캘린더 기록에 내 한마디 남기기/수정. 상대 한마디는 위에 보여줌
export function NoteForm({ entry, onSubmit, onCancel }: Props) {
  const { currentUser, couple, items } = useStore()
  const mine = entry.notes.find((n) => n.author === currentUser)
  const others = entry.notes.filter((n) => n.author !== currentUser)
  const item = items.find((it) => it.id === entry.bucketItemId)
  const [text, setText] = useState(mine?.text ?? '')

  // 수정 중엔 비워서 저장하면 삭제
  const canSubmit = mine ? text.trim() !== mine.text : !!text.trim()

  return (
    <Popup
      title={mine ? '한마디 고치기' : '한마디 남기기'}
      submitLabel="저장"
      canSubmit={canSubmit}
      onCancel={onCancel}
      onSubmit={() => onSubmit(text)}
    >
      {item && <p className={styles.itemTitle}>✓ {item.title}</p>}

      {others.map((n) => (
        <div key={n.author} className={styles.other}>
          <span className={popup.label}>{couple.names[n.author]}</span>
          <p className={styles.otherText}>{n.text}</p>
        </div>
      ))}

      <label className={popup.field}>
        <span className={popup.label}>{couple.names[currentUser]}</span>
        <textarea
          className={`${popup.input} ${popup.textarea}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          rows={3}
          placeholder="나도 즐거워따"
          autoFocus
        />
      </label>
      {mine && <p className={styles.hint}>다 지우고 저장하면 한마디가 삭제돼요</p>}
    </Popup>
  )
}
