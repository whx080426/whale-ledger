export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function money(n: number): string {
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(mk: string): string {
  const [y, m] = mk.split('-')
  return `${y}年${Number(m)}月`
}

export function shortMonth(mk: string): string {
  return `${Number(mk.split('-')[1])}月`
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000)

  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${m}月${d}日 ${WEEK[target.getDay()]}`
}

/** 日期加减天数，返回 YYYY-MM-DD */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return todayISO(new Date(y, m - 1, d + days))
}

/** 11月5日 周三 */
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${m}月${d}日 ${WEEK[new Date(y, m - 1, d).getDay()]}`
}

/** 20:15:32 */
export function clockLabel(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function shiftMonth(mk: string, delta: number): string {
  const [y, m] = mk.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** 本月还剩多少天（含今天） */
export function daysLeftInMonth(today: string): number {
  const [y, m, d] = today.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return last - d + 1
}

export function daysInMonth(mk: string): number {
  const [y, m] = mk.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
