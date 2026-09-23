import { compressImage } from './image'

/**
 * 대표 사진 → 캘린더 칸에 붙일 누끼 스티커 PNG.
 *
 * 폰 브라우저 안에서 AI 모델(@imgly/background-removal, isnet_quint8)로 배경을 지움.
 * 처음 한 번 모델·런타임 약 56MB를 imgly CDN에서 받고, 이후엔 브라우저 캐시 사용.
 * 라이브러리가 무거워서(onnxruntime) 필요할 때만 동적 import.
 */
export async function makeSticker(photo: Blob): Promise<Blob> {
  // 칸이 49px라 작게 넣어도 충분하고, 작을수록 폰에서 빠름
  const small = await compressImage(photo, 512, 0.9)
  const { removeBackground } = await import('@imgly/background-removal')
  const cutout = await removeBackground(small, {
    model: 'isnet_quint8',
    output: { format: 'image/png' },
  })
  return cleanAndTrim(cutout)
}

/**
 * 모델 결과엔 배경에 반투명 부스러기가 흩어져 있어서
 * 1) 큰 덩어리(피사체)만 남기고 2) 투명 여백을 잘라 칸을 꽉 채우게 함
 */
async function cleanAndTrim(png: Blob, pad = 6): Promise<Blob> {
  const bitmap = await createImageBitmap(png)
  const { width, height } = bitmap
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const image = ctx.getImageData(0, 0, width, height)
  const { data } = image
  const alpha = new Uint8Array(width * height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
  const kept = keepMainBlobs(alpha, width, height)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let i = 0; i < kept.length; i++) {
    data[i * 4 + 3] = kept[i]
    if (kept[i] === 0) continue
    const x = i % width
    const y = (i - x) / width
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  if (maxX < 0) throw new Error('사진에서 피사체를 찾지 못했어요')
  ctx.putImageData(image, 0, 0)

  // 흰 테두리가 잘리지 않게 약간 여유
  const x = Math.max(0, minX - pad)
  const y = Math.max(0, minY - pad)
  const w = Math.min(width, maxX + pad + 1) - x
  const h = Math.min(height, maxY + pad + 1) - y

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')!.drawImage(canvas, x, y, w, h, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('스티커 변환 실패'))), 'image/png'),
  )
}

/**
 * 불투명한 픽셀끼리 이어진 덩어리를 찾아, 가장 큰 덩어리의 30% 이상인 것만 남김
 * (두 사람이 떨어져 있어도 둘 다 남도록). 경계의 옅은 픽셀도 정리.
 */
function keepMainBlobs(alpha: Uint8Array, width: number, height: number, threshold = 176, minRatio = 0.3) {
  const n = width * height
  const label = new Int32Array(n).fill(-1)
  const sizes: number[] = []
  const queue = new Int32Array(n)

  for (let start = 0; start < n; start++) {
    if (label[start] !== -1 || alpha[start] < threshold) continue
    const id = sizes.length
    let head = 0
    let tail = 0
    queue[tail++] = start
    label[start] = id
    while (head < tail) {
      const p = queue[head++]
      const x = p % width
      const neighbors = [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        p >= width ? p - width : -1,
        p < n - width ? p + width : -1,
      ]
      for (const q of neighbors) {
        if (q >= 0 && label[q] === -1 && alpha[q] >= threshold) {
          label[q] = id
          queue[tail++] = q
        }
      }
    }
    sizes.push(tail)
  }

  const largest = Math.max(0, ...sizes)
  const keep = sizes.map((s) => s >= largest * minRatio)
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (label[i] >= 0 && keep[label[i]] && alpha[i] >= 96) out[i] = alpha[i]
  }
  return out
}
