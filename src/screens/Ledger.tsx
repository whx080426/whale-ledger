import { useEffect, useMemo, useState, type PointerEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Entry, Plan } from '../core/types'
import { groupByDay, monthStats } from '../core/calc'
import { dayLabel, money, monthKey, monthLabel, shiftMonth } from '../core/format'
import { useToday } from '../core/clock'
import EntryRow from '../ui/EntryRow'
import EmptyState from '../ui/EmptyState'
import PagerDots from '../ui/PagerDots'
import EarningsCalendar from '../ui/EarningsCalendar'

interface Props {
  entries: Entry[]
  plan: Plan
  onDelete: (entry: Entry) => void
  /** 0 = 明细，1 = 收益日历 */
  onPageChange?: (page: number) => void
}

export default function Ledger({ entries, plan, onDelete, onPageChange }: Props) {
  const today = useToday()

  const [month, setMonth] = useState(() => monthKey(today))
  const [page, setPage] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [startX, setStartX] = useState(0)

  const m = useMemo(() => monthStats(entries, plan, month), [entries, plan, month])
  const groups = useMemo(
    () => groupByDay(entries.filter((e) => e.date.slice(0, 7) === month)),
    [entries, month, today],
  )

  useEffect(() => {
    onPageChange?.(page)
  }, [page, onPageChange])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
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
    <div className="pb-24 lg:pb-8">
      <header
        className={`px-5 pt-7 pb-2 lg:mx-auto lg:px-5 lg:pt-6 ${
          page === 0 ? 'lg:max-w-[760px]' : 'lg:max-w-[560px]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            {page === 0 ? '账单明细' : '收益日历'}
          </h1>
          <PagerDots count={2} active={page} onPick={setPage} labels={['账单明细', '收益日历']} />
        </div>
      </header>

      <div className="overflow-hidden">
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
          {/* 明细 */}
          <div className="w-1/2">
            <div className="lg:mx-auto lg:max-w-[760px]">
              <div className="flex items-center justify-center gap-2 px-5 pt-1 pb-3">
                <button
                  onClick={() => setMonth(shiftMonth(month, -1))}
                  aria-label="上个月"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-soft ring-1 ring-line active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-[88px] text-center text-[13px] font-medium text-ink">
                  {monthLabel(month)}
                </span>
                <button
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  aria-label="下个月"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-soft ring-1 ring-line active:scale-95"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <section className="px-5">
                <div className="flex items-stretch rounded-2xl bg-white p-4 ring-1 ring-line">
                  <div className="flex-1">
                    <p className="text-[11px] text-soft">收入</p>
                    <p className="mt-1 text-[16px] font-semibold tabular text-ink">
                      ¥{money(m.income)}
                    </p>
                  </div>
                  <div className="mx-2 w-px bg-line" />
                  <div className="flex-1">
                    <p className="text-[11px] text-soft">支出</p>
                    <p className="mt-1 text-[16px] font-semibold tabular text-ink">
                      ¥{money(m.spent)}
                    </p>
                  </div>
                  <div className="mx-2 w-px bg-line" />
                  <div className="flex-1">
                    <p className="text-[11px] text-soft">本月结余</p>
                    <p
                      className={`mt-1 text-[16px] font-semibold tabular ${
                        m.actualSave >= 0 ? 'text-brand' : 'text-danger'
                      }`}
                    >
                      ¥{money(m.actualSave)}
                    </p>
                  </div>
                </div>
              </section>

              {groups.length === 0 && (
                <div className="mx-5 mt-6 overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
                  <EmptyState
                    icon={<CalendarDays size={24} strokeWidth={1.7} />}
                    title="这个月还没有记账"
                    hint="换个日期看看，或者点右下角的 + 记一笔"
                  />
                </div>
              )}

              {groups.map((g) => {
                return (
                  <section key={g.date} className="mt-4 px-5">
                    <div className="flex items-center justify-between px-1 pb-2">
                      <span className="text-[12px] font-medium text-soft">{dayLabel(g.date)}</span>
                      <span className="text-[11.5px] font-medium tabular text-soft">
                        支出 ¥{money(g.spent)}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                      {g.items.map((e, i) => (
                        <div key={e.id} className={i > 0 ? 'border-t border-line/70' : ''}>
                          <EntryRow entry={e} onDelete={onDelete} />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          {/* 收益日历 */}
          <div className="w-1/2 pt-1">
            <div className="lg:mx-auto lg:max-w-[560px]">
              <EarningsCalendar entries={entries} plan={plan} today={today} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
