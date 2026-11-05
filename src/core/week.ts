import type { Entry, Plan } from './types'
import { todayISO } from './format'

export interface WeekStats {
  /** 本周一 */
  start: string
  /** 本周日 */
  end: string
  spent: number
  income: number
  /** 周预算还剩多少（负数=超支） */
  left: number
  /** 本周剩余天数（含今天） */
  daysLeft: number
  count: number
  usedRatio: number
}

/** 周一作为一周的开始 */
export function weekStart(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const offset = (new Date(y, m - 1, d).getDay() + 6) % 7
  return todayISO(new Date(y, m - 1, d - offset))
}

export function weekEnd(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const offset = (new Date(y, m - 1, d).getDay() + 6) % 7
  return todayISO(new Date(y, m - 1, d - offset + 6))
}

/** 本周剩余天数，含今天 */
export function weekDaysLeft(today: string): number {
  const [y, m, d] = today.split('-').map(Number)
  const offset = (new Date(y, m - 1, d).getDay() + 6) % 7
  return 7 - offset
}

export function weekStats(entries: Entry[], plan: Plan, today: string): WeekStats {
  const start = weekStart(today)
  const end = weekEnd(today)

  const list = entries.filter((e) => e.date >= start && e.date <= end)
  const spent = list
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)
  const income = list
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  return {
    start,
    end,
    spent,
    income,
    left: plan.weeklyBudget - spent,
    daysLeft: weekDaysLeft(today),
    count: list.length,
    usedRatio: plan.weeklyBudget > 0 ? spent / plan.weeklyBudget : 0,
  }
}
