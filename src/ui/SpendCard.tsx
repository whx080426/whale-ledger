import { useState, type PointerEvent } from 'react'
import type { Entry, Plan } from '../core/types'
import { dayStats } from '../core/calc'
import { weekStats } from '../core/week'
import { money } from '../core/format'
import Progress from './Progress'

interface Props {
  entries: Entry[]
  plan: Plan
  /** 当前日期，来自全局时钟，跨天会自动变 */
  today: string
}

function Dots({ active, onPick }: { active: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center">
      {[0, 1].map((i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          aria-label={i === 0 ? '今日' : '本周'}
          className="grid h-6 w-6 place-items-center"
        >
          <span
            className={`h-1.5 rounded-full transition-all ${
              i === active ? 'w-4 bg-brand' : 'w-1.5 bg-line'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function SpendCard({ entries, plan, today }: Props) {
  const [page, setPage] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [startX, setStartX] = useState(0)

  const d = dayStats(entries, plan, today)
  const w = weekStats(entries, plan, today)

  const dayLeft = plan.dailyBudget - d.spent
  const dayOk = dayLeft >= 0
  const dayPct =
    plan.dailyBudget > 0 ? Math.round((d.spent / plan.dailyBudget) * 100) : 0

  const weekLeft = w.left
  const weekOk = weekLeft >= 0
  const weekPct = Math.round(w.usedRatio * 100)
  const weekAllow = Math.max(weekLeft, 0) / Math.max(w.daysLeft, 1)

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    // 点在圆点按钮上时不启动拖拽，否则指针捕获会吞掉按钮的 click
    if ((e.target as HTMLElement).closest('button')) return

    setDragging(true)
    setStartX(e.clientX)
    setDx(0)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 忽略 */
    }
  }

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const delta = e.clientX - startX
    setDx(Math.max(-170, Math.min(170, delta)))
  }

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    if (dx < -45) setPage(1)
    else if (dx > 45) setPage(0)
    setDx(0)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* 忽略 */
    }
  }

  return (
    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
      <div
        className="flex w-[200%] touch-pan-y select-none"
        style={{
          transform: `translateX(calc(${page === 1 ? '-50%' : '0%'} + ${dx}px))`,
          transition: dragging ? 'none' : 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* 今日 */}
        <div className="w-1/2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-soft">今日支出</p>
            <Dots active={page} onPick={setPage} />
          </div>

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[26px] leading-none font-semibold tabular text-ink">
                ¥{money(d.spent)}
              </p>
              <p className="mt-1.5 text-[11.5px] text-soft">日预算 ¥{money(plan.dailyBudget)}</p>
            </div>
            <span
              className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                dayOk ? 'bg-brand/10 text-brand' : 'bg-danger/10 text-danger'
              }`}
            >
              {dayOk ? `今日盈余 ¥${money(dayLeft)}` : `今日超支 ¥${money(-dayLeft)}`}
            </span>
          </div>

          <div className="mt-3">
            <Progress
              value={plan.dailyBudget > 0 ? d.spent / plan.dailyBudget : 0}
              tone={dayOk ? 'accent' : 'danger'}
            />
          </div>

          <p className="mt-2 text-[11px] text-soft">
            {dayOk ? (
              <>
                预算用了 {dayPct}%
                <span className="mx-1.5 text-line">|</span>
                今天还能花 ¥{money(Math.max(dayLeft, 0))}
              </>
            ) : (
              <>已超出日预算 ¥{money(d.spent - plan.dailyBudget)}</>
            )}
          </p>
        </div>

        {/* 本周 */}
        <div className="w-1/2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-soft">本周支出</p>
            <Dots active={page} onPick={setPage} />
          </div>

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[26px] leading-none font-semibold tabular text-ink">
                ¥{money(w.spent)}
              </p>
              <p className="mt-1.5 text-[11.5px] text-soft">
                周预算 ¥{money(plan.weeklyBudget)}
              </p>
            </div>
            <span
              className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                weekOk ? 'bg-brand/10 text-brand' : 'bg-danger/10 text-danger'
              }`}
            >
              {weekOk ? `本周盈余 ¥${money(weekLeft)}` : `本周超支 ¥${money(-weekLeft)}`}
            </span>
          </div>

          <div className="mt-3">
            <Progress value={w.usedRatio} tone={weekOk ? 'accent' : 'danger'} />
          </div>

          <p className="mt-2 text-[11px] text-soft">
            {weekOk ? (
              <>
                预算用了 {weekPct}%
                <span className="mx-1.5 text-line">|</span>
                还剩 {w.daysLeft} 天 · 日均 ¥{money(weekAllow)}
              </>
            ) : (
              <>
                已超出周预算 ¥{money(w.spent - plan.weeklyBudget)}
                <span className="mx-1.5 text-line">|</span>
                还剩 {w.daysLeft} 天
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
