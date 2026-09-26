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

  // 어느 단계에서 실패했는지 화면에 보여주려고 단계별로 메시지를 나눔
  let removeBackground: typeof import('@imgly/background-removal').removeBackground
  try {
    ;({ removeBackground } = await import('@imgly/background-removal'))
  } catch (e) {
    throw new Error('누끼 도구를 불러오지 못했어요 (인터넷 연결 확인)', { cause: e })
  }

  let cutout: Blob
  try {
    cutout = await removeBackground(small, {
      model: 'isnet_quint8',
      output: { format: 'image/png' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      /fetch|network|load/i.test(msg)
        ? '누끼 모델을 받지 못했어요 (와이파이에서 다시 해보세요)'
        : '누끼를 따다 멈췄어요 (폰 메모리가 부족했을 수 있어요)',
      { cause: e },
    )
  }
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
  // 피사체가 흐릿하게 잡힌 사진(풍경·음식 등)은 기준을 낮춰 가며 다시 찾아봄
  const minPixels = width * height * 0.01
  let kept = new Uint8Array(0)
  for (const threshold of [176, 112, 64]) {
    kept = keepMainBlobs(alpha, width, height, threshold)
    if (countOpaque(kept) >= minPixels) break
  }

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
  if (maxX < 0 || countOpaque(kept) < minPixels) {
    throw new Error('사진에서 사람·물건을 찾지 못했어요 (다른 사진으로 해볼까요?)')
  }
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

  // 부스러기가 수만 개일 수 있어서 Math.max(...sizes) 대신 (인자 개수 한도 초과 방지)
  const largest = sizes.reduce((max, s) => (s > max ? s : max), 0)
  const keep = sizes.map((s) => s >= largest * minRatio)
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (label[i] >= 0 && keep[label[i]] && alpha[i] >= Math.min(96, threshold)) out[i] = alpha[i]
  }
  return out
}

function countOpaque(alpha: Uint8Array): number {
  let n = 0
  for (let i = 0; i < alpha.length; i++) if (alpha[i] > 0) n++
  return n
}
