import { useState } from 'react'
import type { Plan } from '../core/types'
import { applyPlanChange, fmtInput, sanitizeNumber, type PlanField } from '../core/plan'
import { money } from '../core/format'
import MoneyField from './MoneyField'

const FIELDS: PlanField[] = [
  'monthlyIncome',
  'startingSavings',
  'monthlySave',
  'monthlyBudget',
  'weeklyBudget',
  'dailyBudget',
  'savingGoal',
]

interface Props {
  initial: Plan
  /** 当前累计存款，用来给攒钱目标显示「还差多少」；不传则用「已经攒了多少」 */
  saved?: number
  onChange: (plan: Plan) => void
}

function toDraft(plan: Plan): Record<PlanField, string> {
  const draft = {} as Record<PlanField, string>
  for (const field of FIELDS) draft[field] = fmtInput(plan[field])
  return draft
}

/** 四个「攒/花」数字互相关联：改一个，其余三个自动算好 */
export default function PlanForm({ initial, saved, onChange }: Props) {
  const [value, setValue] = useState<Plan>(initial)
  const [draft, setDraft] = useState<Record<PlanField, string>>(() => toDraft(initial))

  const update = (field: PlanField, raw: string) => {
    const clean = sanitizeNumber(raw)
    const num = Number(clean) || 0

    // 攒钱总目标是独立数字，不参与联动
    const next: Plan =
      field === 'savingGoal'
        ? { ...value, savingGoal: Math.round(num * 100) / 100 }
        : applyPlanChange(value, field, num)

    setValue(next)
    onChange(next)

    setDraft((prev) => {
      const merged = { ...prev, [field]: clean }
      for (const f of FIELDS) {
        if (f !== field) merged[f] = fmtInput(next[f])
      }
      return merged
    })
  }

  const goalValue = Number(draft.savingGoal) || 0
  const baseSaved = saved ?? (Number(draft.startingSavings) || 0)
  const goalHint =
    goalValue > 0
      ? `当前 ¥${money(baseSaved)}，还差 ¥${money(Math.max(goalValue - baseSaved, 0))}`
      : '想在账户里存到多少，0 表示暂不设定'

  return (
    <>
      <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
        <MoneyField
          label="每月收入"
          value={draft.monthlyIncome}
          onChange={(v) => update('monthlyIncome', v)}
          hint="税后到手"
        />
        <div className="mx-4 h-px bg-line" />
        <MoneyField
          label="已经攒了多少"
          value={draft.startingSavings}
          onChange={(v) => update('startingSavings', v)}
          hint="开始记账前的存款"
        />
      </div>

      <p className="px-1 pt-4 pb-2 text-[11.5px] text-soft">
        每月目标 · 改任意一个，其余三个自动算好
      </p>

      <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
        <MoneyField
          label="每月计划攒"
          value={draft.monthlySave}
          onChange={(v) => update('monthlySave', v)}
          hint="一个月想存下多少"
        />
        <div className="mx-4 h-px bg-line" />
        <MoneyField
          label="每月计划花"
          value={draft.monthlyBudget}
          onChange={(v) => update('monthlyBudget', v)}
          hint="收入 − 计划攒"
        />
        <div className="mx-4 h-px bg-line" />
        <MoneyField
          label="每周计划花"
          value={draft.weeklyBudget}
          onChange={(v) => update('weeklyBudget', v)}
          hint="每月计划花 ÷ 30 × 7"
        />
        <div className="mx-4 h-px bg-line" />
        <MoneyField
          label="每天计划花"
          value={draft.dailyBudget}
          onChange={(v) => update('dailyBudget', v)}
          hint="每月计划花 ÷ 30"
        />
      </div>

      <p className="px-1 pt-4 pb-2 text-[11.5px] text-soft">攒钱目标 · 首页会显示进度条</p>

      <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
        <MoneyField
          label="想存到多少"
          value={draft.savingGoal}
          onChange={(v) => update('savingGoal', v)}
          hint={goalHint}
        />
      </div>
    </>
  )
}
