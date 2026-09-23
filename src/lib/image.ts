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
