import { compressImage } from './image'
import { makeSticker } from './sticker'

export interface LocalPhoto {
  url: string
  blob: Blob
}

/** 고른 파일들을 줄여서 미리보기 URL로. TODO: Supabase 연결 시 Storage 업로드 후 받은 URL로 교체 */
export async function loadPhotos(files: File[]): Promise<LocalPhoto[]> {
  const blobs = await Promise.all(files.map((f) => compressImage(f)))
  return blobs.map((blob) => ({ url: URL.createObjectURL(blob), blob }))
}

/** 대표 사진 누끼 스티커 만들기 (백그라운드로 오래 걸림) */
export function stickerJobFor(photo: Blob): Promise<string> {
  return makeSticker(photo).then((b) => URL.createObjectURL(b))
}
