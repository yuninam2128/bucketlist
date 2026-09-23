import folderFront from '../assets/figma/folder.svg'
import styles from './Folder.module.css'

const photoSlots = [styles.photoLeft, styles.photoCenter, styles.photoRight]

// 뒷판 → 삐져나온 사진(최대 3장) → 앞판 순서로 겹쳐 그림
export function Folder({ photos }: { photos: string[] }) {
  return (
    <div className={styles.folder}>
      <div className={styles.back} />
      {photos.slice(0, 3).map((src, i) => (
        <div key={i} className={`${styles.photo} ${photoSlots[i]}`}>
          <img src={src} alt="" />
        </div>
      ))}
      <img className={styles.front} src={folderFront} alt="" />
    </div>
  )
}
