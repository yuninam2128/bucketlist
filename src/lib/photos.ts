import { compressImage } from './image'
import { makeSticker } from './sticker'

export interface LocalPhoto {
  /** 올리기 전 미리보기용 URL */
  url: string
  /** Storage에 올릴 줄인 JPEG */
  blob: Blob
}

/** 고른 파일들을 줄여서(긴 변 1600px) 미리보기 URL과 함께 */
export async function loadPhotos(files: File[]): Promise<LocalPhoto[]> {
  const blobs = await Promise.all(files.map((f) => compressImage(f)))
  return blobs.map((blob) => ({ url: URL.createObjectURL(blob), blob }))
}

/** 대표 사진 누끼 스티커 만들기 (백그라운드로 오래 걸림) */
export function stickerJobFor(photo: Blob): Promise<Blob> {
  return makeSticker(photo)
}
