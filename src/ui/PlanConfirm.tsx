import { ArrowRight, ShieldCheck } from 'lucide-react'
import type { Plan } from '../core/types'
import { money } from '../core/format'
import { overshoot } from '../core/plan'

interface Props {
  from: Plan
  to: Plan
  onCancel: () => void
  onConfirm: () => void
}

const ROWS: Array<{ key: keyof Plan; label: string }> = [
  { key: 'monthlyIncome', label: '每月收入' },
  { key: 'startingSavings', label: '已经攒了多少' },
  { key: 'monthlySave', label: '每月计划攒' },
  { key: 'monthlyBudget', label: '每月计划花' },
  { key: 'weeklyBudget', label: '每周计划花' },
  { key: 'dailyBudget', label: '每天计划花' },
  { key: 'savingGoal', label: '攒钱目标' },
]

export default function PlanConfirm({ from, to, onCancel, onConfirm }: Props) {
  const changed = ROWS.filter((row) => from[row.key] !== to[row.key])
  const rows = changed.length > 0 ? changed : ROWS
  const over = overshoot(to)

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="取消"
        onClick={onCancel}
        className="animate-fade absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
      />

      <div className="animate-sheet relative rounded-t-[28px] bg-white px-5 pt-3 pb-6 shadow-[0_-20px_60px_-20px_rgba(15,23,42,0.35)] lg:mx-auto lg:mb-8 lg:max-w-[520px] lg:rounded-[28px]">
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="mt-4 flex items-start gap-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <ShieldCheck size={16} />
          </span>
          <div>
            <h3 className="text-[16px] font-semibold text-ink">确认保存新计划？</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-soft">
              保存后首页的收入、预算和攒钱目标会立刻按新计划重算。
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-canvas">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className={`flex items-center justify-between px-4 py-2.5 ${
                i > 0 ? 'border-t border-line/80' : ''
              }`}
            >
              <span className="text-[12.5px] text-soft">{row.label}</span>
              <span className="flex items-center gap-1.5 text-[12.5px] tabular">
                <span className="text-soft/70 line-through">¥{money(from[row.key])}</span>
                <ArrowRight size={11} className="text-soft/50" />
                <span className="font-medium text-ink">¥{money(to[row.key])}</span>
              </span>
            </div>
          ))}
        </div>

        {over > 0 && (
          <p className="mt-2 px-1 text-[11px] text-danger">
            注意：计划攒 + 计划花 比月收入多 ¥{money(over)}
          </p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="h-11 flex-1 rounded-2xl bg-canvas text-[14.5px] font-medium text-ink"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="h-11 flex-[1.4] rounded-2xl bg-[linear-gradient(140deg,#12A876_0%,#0A7A55_100%)] text-[14.5px] font-medium text-white shadow-[0_12px_24px_-12px_rgba(10,122,85,0.9)]"
          >
            确认保存
          </button>
        </div>

        <p className="mt-3 text-center text-[10.5px] text-soft/60">计划随时可以再修改</p>
      </div>
    </div>
  )
}
