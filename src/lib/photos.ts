import { compressImage } from './image'
import { makeSticker } from './sticker'

export interface LocalPhoto {
  /** 올리기 전 미리보기용 URL */
  url: string
  /** Storage에 올릴 줄인 JPEG */
  blob: Blob
  /** 고르자마자 시작한 업로드 → 끝나면 Storage 경로 (없으면 저장할 때 올림) */
  uploaded?: Promise<string>
}

/** 동시에 줄이는 사진 수: 한 장씩은 느리고, 한꺼번에는 폰 메모리가 모자람 */
const CONCURRENCY = 3

/**
 * 고른 파일들을 줄여서(긴 변 1280px) 미리보기 URL과 함께.
 * 3장씩 나눠 처리하고, 한 장 끝날 때마다 onPhoto로 바로 알려줌(미리보기가 하나씩 뜸). 순서는 고른 순서 그대로.
 */
export async function loadPhotos(files: File[], onPhoto?: (photo: LocalPhoto, index: number) => void) {
  const photos: LocalPhoto[] = new Array(files.length)
  let next = 0
  const worker = async () => {
    while (next < files.length) {
      const i = next++
      const blob = await compressImage(files[i])
      photos[i] = { url: URL.createObjectURL(blob), blob }
      onPhoto?.(photos[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker))
  return photos
}

/** 대표 사진 누끼 스티커 만들기 (백그라운드로 오래 걸림) */
export function stickerJobFor(photo: Blob): Promise<Blob> {
  return makeSticker(photo)
}
