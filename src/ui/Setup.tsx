import { useState } from 'react'
import type { Plan } from '../core/types'
import { DEFAULT_PLAN } from '../core/plan'
import { money } from '../core/format'
import PlanForm from './PlanForm'

interface Props {
  onSubmit: (plan: Plan) => void
}

export default function Setup({ onSubmit }: Props) {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN)
  const valid = plan.monthlyIncome > 0

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-canvas">
      <div className="bg-[linear-gradient(160deg,#12A876_0%,#0A7A55_60%,#065C41_100%)] px-6 pt-10 pb-12 text-white">
        <div className="mx-auto w-full max-w-[560px]">
          <p className="text-[11px] tracking-[0.2em] text-white/60">SAVING PLAN</p>
          <h1 className="mt-3 text-[26px] leading-tight font-semibold">先设定你的攒钱计划</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/70">
            填收入和攒钱目标，之后随时可以在「设置」里改。
            <br />
            下面的数值是示例，直接改成你自己的就行。
          </p>
        </div>
      </div>

      <div className="-mt-6 px-5 pb-8">
        <div className="mx-auto w-full max-w-[560px]">
        <PlanForm initial={DEFAULT_PLAN} onChange={setPlan} />

        <div className="mt-4 rounded-[18px] bg-white/70 px-4 py-3 ring-1 ring-line">
          <p className="text-[11.5px] leading-relaxed text-soft">
            按这个计划：每月攒
            <span className="mx-1 font-medium text-ink">¥{money(plan.monthlySave)}</span>
            ，每月花
            <span className="mx-1 font-medium text-ink">¥{money(plan.monthlyBudget)}</span>
          </p>
        </div>

        <button
          onClick={() => onSubmit(plan)}
          disabled={!valid}
          className={`mt-5 w-full rounded-2xl py-3.5 text-[15px] font-medium transition active:scale-[0.99] ${
            valid
              ? 'bg-[linear-gradient(140deg,#12A876_0%,#0A7A55_100%)] text-white shadow-[0_14px_26px_-12px_rgba(10,122,85,0.85)]'
              : 'bg-line text-soft/60'
          }`}
        >
          开始记账
        </button>

          <p className="mt-3 text-center text-[11px] text-soft/70">数据只保存在本机浏览器里</p>
        </div>
      </div>
    </div>
  )
}
