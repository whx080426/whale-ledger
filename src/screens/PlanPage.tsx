import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'
import type { Entry, Plan } from '../core/types'
import { cumulativeSavings, monthStats } from '../core/calc'
import { money, monthKey } from '../core/format'
import { useToday } from '../core/clock'
import { overshoot } from '../core/plan'
import { useCategories } from '../core/categories'
import PlanForm from '../ui/PlanForm'
import SyncCard from '../ui/SyncCard'

interface Props {
  plan: Plan
  entries: Entry[]
  onSave: (plan: Plan) => void
  onClearEntries: () => void
  onReset: () => void
}

export default function PlanPage({ plan, entries, onSave, onClearEntries, onReset }: Props) {
  const { custom, removeCustom } = useCategories()
  const today = useToday()

  const [draftPlan, setDraftPlan] = useState<Plan>(plan)
  const [confirming, setConfirming] = useState<'clear' | 'reset' | null>(null)

  const dirty = JSON.stringify(draftPlan) !== JSON.stringify(plan)
  const over = overshoot(draftPlan)

  const monthly = useMemo(
    () => monthStats(entries, plan, monthKey(today)),
    [entries, plan, today],
  )
  const saved = useMemo(() => cumulativeSavings(entries, plan, monthKey(today)), [entries, plan, today])

  return (
    <div className="pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-5 lg:px-6 lg:pb-8">
      <header className="px-5 pt-7 pb-4 lg:col-span-2 lg:px-0 lg:pt-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">设置</h1>
        <p className="mt-1 text-[12px] text-soft">这几个数字决定首页所有计算</p>
      </header>

      <div className="px-5 lg:col-start-1 lg:row-start-2 lg:px-0">
        <PlanForm initial={plan} saved={saved} onChange={setDraftPlan} />

        {over > 0 && (
          <p className="mt-2 flex items-start gap-1 px-1 text-[11px] leading-relaxed text-danger">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            计划攒 + 计划花 比月收入多 ¥{money(over)}，请调整其中一项
          </p>
        )}

        <div className="mt-3 flex items-center justify-between rounded-[18px] bg-white px-4 py-3 ring-1 ring-line">
          <div>
            <p className="text-[11px] text-soft">每月计划攒</p>
            <p className="mt-1 text-[15px] font-semibold tabular text-ink">
              ¥{money(draftPlan.monthlySave)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-soft">每周计划花</p>
            <p className="mt-1 text-[15px] font-semibold tabular text-ink">
              ¥{money(draftPlan.weeklyBudget)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-soft">当前累计存款</p>
            <p className="mt-1 text-[15px] font-semibold tabular text-brand">¥{money(saved)}</p>
          </div>
        </div>

        <button
          onClick={() => onSave(draftPlan)}
          disabled={!dirty}
          className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium transition active:scale-[0.99] ${
            dirty
              ? 'bg-[linear-gradient(140deg,#12A876_0%,#0A7A55_100%)] text-white shadow-[0_12px_24px_-10px_rgba(10,122,85,0.8)]'
              : 'bg-line text-soft/60'
          }`}
        >
          <CheckCircle2 size={17} />
          {dirty ? '保存计划' : '已保存'}
        </button>
      </div>

      <div className="px-5 lg:col-start-2 lg:row-start-2 lg:px-0">
        <section className="mt-6 lg:mt-0">
          <h2 className="px-1 pb-2 text-[13px] font-semibold text-ink">本月小结</h2>
          <div className="rounded-[22px] bg-white p-4 ring-1 ring-line">
            <div className="grid grid-cols-2 gap-y-3">
              <div>
                <p className="text-[11px] text-soft">本月已花</p>
                <p className="mt-1 text-[15px] font-semibold tabular">¥{money(monthly.spent)}</p>
              </div>
              <div>
                <p className="text-[11px] text-soft">本月记录</p>
                <p className="mt-1 text-[15px] font-semibold tabular">{monthly.count} 笔</p>
              </div>
              <div>
                <p className="text-[11px] text-soft">计划能攒</p>
                <p className="mt-1 text-[15px] font-semibold tabular">
                  ¥{money(monthly.plannedSave)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-soft">实际能攒</p>
                <p className="mt-1 text-[15px] font-semibold tabular text-brand">
                  ¥{money(monthly.actualSave)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="px-1 pb-2 text-[13px] font-semibold text-ink">分类管理</h2>
          <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
            {custom.length === 0 ? (
              <p className="px-4 py-4 text-[12px] leading-relaxed text-soft">
                还没有自定义分类。记一笔时点「自定义」就能添加。
              </p>
            ) : (
              custom.map((c, i) => (
                <div key={c.id} className={i > 0 ? 'border-t border-line/70' : ''}>
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="flex-1 text-[13.5px] text-ink">{c.name}</span>
                    <span className="text-[11px] text-soft">
                      {c.type === 'expense' ? '支出' : '收入'}
                    </span>
                    <button
                      onClick={() => removeCustom(c.id)}
                      aria-label={`删除分类 ${c.name}`}
                      className="grid h-7 w-7 place-items-center rounded-full text-soft/40 transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="px-1 pb-2 text-[13px] font-semibold text-ink">设备同步</h2>
          <SyncCard />
        </section>

        <section className="mt-6">
          <h2 className="px-1 pb-2 text-[13px] font-semibold text-ink">数据</h2>
          <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
            <button
              onClick={() => setConfirming('clear')}
              className="w-full px-4 py-3.5 text-left text-[13.5px] text-ink active:bg-canvas"
            >
              清空所有记账记录
            </button>
            <div className="mx-4 h-px bg-line" />
            <button
              onClick={() => setConfirming('reset')}
              className="w-full px-4 py-3.5 text-left text-[13.5px] text-danger active:bg-canvas"
            >
              清空记录并重新设定计划
            </button>
          </div>

          {confirming && (
            <div className="mt-3 rounded-2xl bg-danger/5 p-4 ring-1 ring-danger/20">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
                <p className="text-[12px] leading-relaxed text-ink">
                  {confirming === 'clear'
                    ? '所有记账记录会被删除，无法恢复。计划里的数字会保留。'
                    : '所有记录和计划都会清空，回到初始设定页面。'}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfirming(null)}
                  className="h-9 flex-1 rounded-xl bg-white text-[12.5px] font-medium text-ink ring-1 ring-line"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (confirming === 'clear') onClearEntries()
                    else onReset()
                    setConfirming(null)
                  }}
                  className="h-9 flex-1 rounded-xl bg-danger text-[12.5px] font-medium text-white"
                >
                  确认删除
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="mt-6 pb-2 text-center text-[11px] text-soft/70 lg:pb-0">
          数据只保存在本机浏览器
        </p>
      </div>
    </div>
  )
}
