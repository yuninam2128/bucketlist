/** 프로필 사진: 가운데를 정사각형으로 잘라 size px JPEG로 */
export async function cropSquare(file: Blob, size = 400, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('사진 변환 실패'))), 'image/jpeg', quality),
  )
}

/**
 * 업로드 전에 사진을 줄여서 JPEG로 변환 (긴 변 1600px, 장당 보통 200~400KB).
 * Supabase 무료 저장공간(1GB)을 아끼기 위함.
 */
export async function compressImage(file: Blob, maxSize = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('사진 변환 실패'))), 'image/jpeg', quality),
  )
}
