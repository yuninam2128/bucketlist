const DAY = 24 * 60 * 60 * 1000

/** 그 날로부터 오늘까지 지난 일수 (당일 = 0) */
export function daysSince(ymd: string, today = new Date()): number {
  const [y, m, d] = ymd.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.floor((now - start) / DAY)
}

/** 커플 D+N: 한국식으로 사귄 날을 1일로 셈 (당일 = D+1) */
export function coupleDays(startYmd: string, today = new Date()): number {
  return daysSince(startYmd, today) + 1
}

/** 로컬 날짜 → 'YYYY-MM-DD' */
export function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** 'YYYY-MM-DD' → '12월 25일' */
export function formatMonthDay(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number)
  return `${m}월 ${d}일`
}
