import { useMemo } from 'react'
import { ChevronRight, ReceiptText, Sparkles } from 'lucide-react'
import type { Entry, Plan } from '../core/types'
import { monthStats, sortByDateDesc } from '../core/calc'
import { dateLabel, money, monthKey } from '../core/format'
import { useToday } from '../core/clock'
import Progress from '../ui/Progress'
import SavingsCard from '../ui/SavingsCard'
import EntryRow from '../ui/EntryRow'
import SpendCard from '../ui/SpendCard'
import EmptyState from '../ui/EmptyState'

interface Props {
  entries: Entry[]
  plan: Plan
  onAdd: () => void
  onOpenPlan: () => void
}

export default function Home({ entries, plan, onAdd, onOpenPlan }: Props) {
  const today = useToday()
  const mk = monthKey(today)

  const m = useMemo(() => monthStats(entries, plan, mk), [entries, plan, mk])
  const recent = useMemo(() => sortByDateDesc(entries).slice(0, 5), [entries])


  const saveRatio = m.plannedSave > 0 ? m.actualSave / m.plannedSave : 0
  const budgetOver = m.budgetLeft < 0

  return (
    <div className="pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-5 lg:px-6 lg:pb-8">
      <header className="flex items-end justify-between px-5 pt-7 pb-4 lg:col-span-2 lg:px-0 lg:pt-6 lg:pb-5">
        <div>
          <p className="text-[12.5px] text-soft">
            {dateLabel(today)}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">我的攒钱账本</h1>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-soft ring-1 ring-line">
          {m.count} 笔
        </span>
      </header>

      {/* 可用存款 / 累计存款（左右滑动） */}
      <section className="px-5 lg:col-start-1 lg:row-start-2 lg:px-0">
        <SavingsCard entries={entries} plan={plan} today={today} onOpenPlan={onOpenPlan} />
      </section>
      {/* 今日 / 本周（左右滑动） */}
      <section className="mt-4 px-5 lg:col-start-1 lg:row-start-3 lg:mt-4 lg:px-0">
        <SpendCard entries={entries} plan={plan} today={today} />
      </section>

      {/* 本月收支 */}
      <section className="mt-3 px-5 lg:col-start-2 lg:row-start-2 lg:mt-0 lg:px-0">
        <div className="rounded-[22px] bg-white p-4 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-ink">本月收支</h2>
            <span className="text-[11px] text-soft">
              预算 ¥{money(plan.monthlyBudget)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <p className="text-[11px] text-soft">收入</p>
              <p className="mt-1 text-[15px] font-semibold tabular text-ink">¥{money(m.income)}</p>
            </div>
            <div>
              <p className="text-[11px] text-soft">已花</p>
              <p className="mt-1 text-[15px] font-semibold tabular text-ink">¥{money(m.spent)}</p>
            </div>
            <div>
              <p className="text-[11px] text-soft">{budgetOver ? '已超支' : '预算剩余'}</p>
              <p
                className={`mt-1 text-[15px] font-semibold tabular ${
                  budgetOver ? 'text-danger' : 'text-accent'
                }`}
              >
                ¥{money(Math.abs(m.budgetLeft))}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Progress value={m.usedRatio} tone={budgetOver ? 'danger' : 'accent'} />
          </div>
          <p className="mt-2 text-[11px] text-soft">
            预算已用 {Math.round(m.usedRatio * 100)}%
            {budgetOver && '，本月已经超出计划'}
          </p>
        </div>
      </section>

      {/* 计划 vs 实际 */}
      <section className="mt-3 px-5 lg:col-start-2 lg:row-start-3 lg:mt-3 lg:px-0">
        <div className="rounded-[22px] bg-white p-4 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-ink">本月能攒多少</h2>
            <button
              onClick={onOpenPlan}
              className="flex items-center gap-0.5 text-[11.5px] font-medium text-brand"
            >
              调整计划
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] text-soft">计划能攒</p>
              <p className="mt-1 text-[17px] font-semibold tabular text-soft">
                ¥{money(m.plannedSave)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-soft">实际能攒</p>
              <p className="mt-1 text-[24px] leading-none font-semibold tabular text-brand">
                ¥{money(m.actualSave)}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Progress value={saveRatio} tone={m.diff >= 0 ? 'brand' : 'danger'} />
          </div>
          <p className="mt-2 flex items-center justify-between text-[11px] text-soft">
            <span>计划 = 月收入 − 月计划花</span>
            <span className={m.diff >= 0 ? 'text-brand' : 'text-danger'}>
              {m.diff >= 0 ? `比计划多 ¥${money(m.diff)}` : `比计划少 ¥${money(-m.diff)}`}
            </span>
          </p>
        </div>
      </section>

      {/* 最近记录 */}
      <section className="mt-4 px-5 lg:col-start-2 lg:row-start-4 lg:mt-4 lg:px-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink">最近记录</h2>
          <span className="text-[11.5px] text-soft">共 {entries.length} 笔</span>
        </div>

        <div className="mt-2.5 overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {recent.length === 0 ? (
            <EmptyState
              icon={<ReceiptText size={24} strokeWidth={1.7} />}
              title="还没有记录"
              hint="今天花的每一笔，都可以记在这里"
              action={
                <button
                  onClick={onAdd}
                  className="flex items-center gap-1.5 rounded-full bg-brand/10 px-3.5 py-1.5 text-[12px] font-medium text-brand"
                >
                  <Sparkles size={13} />
                  记一笔
                </button>
              }
            />
          ) : (
            recent.map((e, i) => (
              <div key={e.id} className={i > 0 ? 'border-t border-line/70' : ''}>
                <EntryRow entry={e} showDate />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
