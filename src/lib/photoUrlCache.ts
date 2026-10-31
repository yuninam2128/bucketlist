/**
 * 비공개 사진의 서명 URL을 폰(localStorage)에 기억해 두는 캐시.
 *
 * 서명 URL은 발급할 때마다 주소(토큰)가 달라져서, 매번 새로 받으면 브라우저가
 * 이미 받은 사진도 "다른 파일"로 보고 처음부터 다시 받음 → 같은 주소를 만료 전까지 재사용.
 * 만료 하루 전부터는 새로 발급받음. 저장소를 못 쓰는 환경(시크릿 창 등)에선 조용히 캐시 없이 동작.
 */
const KEY = 'photo-urls:v1'
/** 이만큼 남았으면 미리 새로 발급 (보는 도중 만료되지 않게) */
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000

type Store = Record<string, { url: string; exp: number }>

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store
  } catch {
    return {}
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // 저장소가 꽉 찼거나 막힌 경우 — 캐시 없이 동작
  }
}

/** 아직 넉넉히 유효한 주소들 (경로 → URL) */
export function loadCachedUrls(): Record<string, string> {
  const now = Date.now()
  const out: Record<string, string> = {}
  for (const [path, { url, exp }] of Object.entries(read())) {
    if (exp - now > RENEW_BEFORE_MS) out[path] = url
  }
  return out
}

export function saveSignedUrls(entries: { path: string; url: string }[], ttlSeconds: number) {
  if (entries.length === 0) return
  const store = read()
  const exp = Date.now() + ttlSeconds * 1000
  for (const { path, url } of entries) store[path] = { url, exp }
  write(store)
}

/** 이 사진 주소는 버림 (안 떠서 다시 발급받을 때) */
export function forgetUrl(path: string) {
  const store = read()
  delete store[path]
  write(store)
}

/** 지금 쓰는 사진만 남기고 정리 (지운 사진 주소가 쌓이지 않게) */
export function pruneCachedUrls(inUse: Set<string>) {
  const store = read()
  for (const path of Object.keys(store)) if (!inUse.has(path)) delete store[path]
  write(store)
}

export function clearCachedUrls() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}
