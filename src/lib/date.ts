const DAY = 24 * 60 * 60 * 1000

/** 사귄 날로부터 오늘까지 지난 일수 (D+N) */
export function daysSince(ymd: string, today = new Date()): number {
  const [y, m, d] = ymd.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.floor((now - start) / DAY)
}

/** 'YYYY-MM-DD' → '12월 25일' */
export function formatMonthDay(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number)
  return `${m}월 ${d}일`
}
