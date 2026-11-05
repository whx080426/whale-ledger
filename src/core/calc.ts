import type { Entry, Plan } from './types'
import { daysLeftInMonth, monthKey, todayISO } from './format'

export interface MonthStats {
  key: string
  /** 本月收入 = 设定的月收入 + 本月额外记的收入 */
  income: number
  /** 本月已花 */
  spent: number
  /** 本月额外收入（手动记的） */
  extraIncome: number
  /** 预计能攒 = 月收入 - 月预算 */
  plannedSave: number
  /** 实际能攒 = 本月收入 - 本月已花 */
  actualSave: number
  /** 实际 - 预计 */
  diff: number
  count: number
  /** 预算还剩多少（负数表示超支） */
  budgetLeft: number
  /** 预算使用比例 */
  usedRatio: number
}

export function monthStats(entries: Entry[], plan: Plan, mk: string): MonthStats {
  const list = entries.filter((e) => monthKey(e.date) === mk)
  const spent = list
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)
  const extraIncome = list
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  const income = plan.monthlyIncome + extraIncome
  const plannedSave = plan.monthlySave
  const count = list.length
  // 这个月还没有任何记录时，实际按预计处理，避免显示成「一分没花」
  const actualSave = count === 0 ? plannedSave : income - spent
  const budgetLeft = plan.monthlyBudget - spent

  return {
    key: mk,
    income,
    spent,
    extraIncome,
    plannedSave,
    actualSave,
    diff: actualSave - plannedSave,
    count,
    budgetLeft,
    usedRatio: plan.monthlyBudget > 0 ? spent / plan.monthlyBudget : 0,
  }
}

export interface DayStats {
  date: string
  spent: number
  income: number
  /** 当天盈亏 = 收入 - 支出 */
  net: number
  /** 相对日预算的结余：正数=省下，负数=超支 */
  vsBudget: number
  count: number
}

export function dayStats(entries: Entry[], plan: Plan, date: string): DayStats {
  const list = entries.filter((e) => e.date === date)
  const spent = list
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)
  const income = list
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  return {
    date,
    spent,
    income,
    net: income - spent,
    vsBudget: plan.dailyBudget - spent,
    count: list.length,
  }
}

/**
 * 累计存款 = 期初存款 + 各月的（收入 − 支出），也就是能动的总资产。
 * 本月始终计入：即使一笔没记，月收入也算进来（支出按 0 算）。
 */
export function cumulativeSavings(entries: Entry[], plan: Plan, mk: string): number {
  const months = new Set(
    entries.map((entry) => monthKey(entry.date)).filter((key) => key <= mk),
  )
  months.add(mk)

  let total = plan.startingSavings
  for (const key of months) {
    const list = entries.filter((entry) => monthKey(entry.date) === key)
    const income =
      plan.monthlyIncome +
      list.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0)
    const spent = list
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0)
    total += income - spent
  }
  return total
}

/**
 * 可用存款 = 累计存款 − 本月计划攒。
 * 支出先花「本月计划花」，花超了就动到「计划攒」，所以这个数会跟着往下走。
 */
export function availableSavings(entries: Entry[], plan: Plan, mk: string): number {
  return cumulativeSavings(entries, plan, mk) - plan.monthlySave
}

/**
 * 已经存下的钱：期初存款 + 本月之前各月的实际攒钱。
 * 不含本月收入，所以月内不会随记账跳动。
 */
export function settledSavings(entries: Entry[], plan: Plan, mk: string): number {
  const months = new Set(
    entries.filter((entry) => monthKey(entry.date) < mk).map((entry) => monthKey(entry.date)),
  )
  let total = plan.startingSavings
  for (const key of months) {
    total += monthStats(entries, plan, key).actualSave
  }
  return total
}

/** 今天建议能花多少：剩余预算平摊到本月剩下的天数 */
export function dailyAllowance(monthBudgetLeft: number): number {
  return Math.max(monthBudgetLeft, 0) / Math.max(daysLeftInMonth(todayISO()), 1)
}

export function sortByDateDesc(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.createdAt - a.createdAt
  })
}

export interface DayGroup {
  date: string
  items: Entry[]
  spent: number
  income: number
}

export function groupByDay(entries: Entry[]): DayGroup[] {
  const map = new Map<string, Entry[]>()
  for (const e of sortByDateDesc(entries)) {
    const arr = map.get(e.date)
    if (arr) arr.push(e)
    else map.set(e.date, [e])
  }
  return [...map.entries()].map(([date, items]) => ({
    date,
    items,
    spent: items.filter((i) => i.type === 'expense').reduce((s, i) => s + i.amount, 0),
    income: items.filter((i) => i.type === 'income').reduce((s, i) => s + i.amount, 0),
  }))
}
