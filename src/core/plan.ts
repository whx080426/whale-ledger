import type { Plan } from './types'

/** 月度与日度之间的折算天数 */
export const DAYS = 30

/** 首次进入时的示例计划 */
export const DEFAULT_PLAN: Plan = {
  monthlyIncome: 12000,
  startingSavings: 30000,
  monthlySave: 7500,
  monthlyBudget: 4500,
  weeklyBudget: 1050,
  dailyBudget: 150,
  savingGoal: 0,
  updatedAt: 0,
}

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}

/** 输入框里显示的数字：整数不带小数点 */
export function fmtInput(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(round2(n))
}

export function sanitizeNumber(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [head, ...rest] = cleaned.split('.')
  if (rest.length === 0) return head.slice(0, 9)
  return `${head.slice(0, 9)}.${rest.join('').slice(0, 2)}`
}

/**
 * 修正历史数据：老版本可能缺 monthlySave / weeklyBudget / savingGoal。
 */
export function normalizePlan(raw: Partial<Plan> | null | undefined): Plan | null {
  if (!raw) return null

  const monthlyIncome = round2(Number(raw.monthlyIncome) || 0)
  const startingSavings = round2(Number(raw.startingSavings) || 0)

  const monthlyBudget =
    raw.monthlyBudget != null
      ? round2(Number(raw.monthlyBudget) || 0)
      : Math.max(monthlyIncome - (Number(raw.monthlySave) || 0), 0)

  const monthlySave =
    raw.monthlySave != null
      ? round2(Number(raw.monthlySave) || 0)
      : Math.max(monthlyIncome - monthlyBudget, 0)

  return {
    monthlyIncome,
    startingSavings,
    monthlySave,
    monthlyBudget,
    weeklyBudget:
      raw.weeklyBudget != null
        ? round2(Number(raw.weeklyBudget) || 0)
        : round2((monthlyBudget * 7) / DAYS),
    dailyBudget:
      raw.dailyBudget != null ? round2(Number(raw.dailyBudget) || 0) : round2(monthlyBudget / DAYS),
    savingGoal: round2(Number(raw.savingGoal) || 0),
    updatedAt: Number(raw.updatedAt) || 0,
  }
}

export type PlanField = Exclude<keyof Plan, 'updatedAt'>

/**
 * 改任意一个数字，其余按「收入 = 计划攒 + 计划花」「月 = 日 × 30」「周 = 月 × 7 / 30」自动算好。
 */
export function applyPlanChange(plan: Plan, field: PlanField, input: number): Plan {
  const value = Math.max(0, Number.isFinite(input) ? input : 0)

  if (field === 'startingSavings') {
    return { ...plan, startingSavings: round2(value) }
  }

  if (field === 'savingGoal') {
    return { ...plan, savingGoal: round2(value) }
  }

  let monthlyIncome = plan.monthlyIncome
  let monthlySave = plan.monthlySave
  let monthlyBudget = plan.monthlyBudget

  switch (field) {
    case 'monthlyIncome': {
      monthlyIncome = round2(value)
      monthlySave = Math.min(plan.monthlySave, monthlyIncome)
      monthlyBudget = Math.max(monthlyIncome - monthlySave, 0)
      break
    }
    case 'monthlySave': {
      monthlySave = value
      monthlyBudget = Math.max(monthlyIncome - value, 0)
      break
    }
    case 'monthlyBudget': {
      monthlyBudget = value
      monthlySave = Math.max(monthlyIncome - value, 0)
      break
    }
    case 'weeklyBudget': {
      monthlyBudget = value * (DAYS / 7)
      monthlySave = Math.max(monthlyIncome - monthlyBudget, 0)
      break
    }
    case 'dailyBudget': {
      monthlyBudget = value * DAYS
      monthlySave = Math.max(monthlyIncome - monthlyBudget, 0)
      break
    }
  }

  return {
    ...plan,
    monthlyIncome: round2(monthlyIncome),
    monthlySave: round2(monthlySave),
    monthlyBudget: round2(monthlyBudget),
    weeklyBudget: round2((monthlyBudget * 7) / DAYS),
    dailyBudget: round2(monthlyBudget / DAYS),
  }
}

/** 计划攒超过收入时的提示值（正数表示超出多少） */
export function overshoot(plan: Plan): number {
  return round2(plan.monthlySave + plan.monthlyBudget - plan.monthlyIncome)
}
