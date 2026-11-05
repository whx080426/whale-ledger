import { useMemo, useState, type PointerEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Entry, Plan } from '../core/types'
import { availableSavings, cumulativeSavings, settledSavings } from '../core/calc'
import { money, monthKey } from '../core/format'

interface Props {
  entries: Entry[]
  plan: Plan
  /** 当前日期，来自全局时钟 */
  today: string
  onOpenPlan: () => void
}

interface Page {
  title: string
  value: number
  /** 卡片底部左侧：期初 */
  footerLeft: string
  /** 卡片底部右侧 */
  footerRight: string
  bg: string
  shadow: string
}

const BG_AVAILABLE = 'linear-gradient(150deg,#5B7BFF 0%,#3A55D9 55%,#22307F 100%)'
const BG_TOTAL = 'linear-gradient(150deg,#12A876 0%,#0A7A55 55%,#065C41 100%)'

function Dots({ active, onPick }: { active: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1].map((i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          aria-label={i === 0 ? '可用存款' : '累计存款'}
          className="grid h-6 w-6 place-items-center"
        >
          <span
            className={`h-1.5 rounded-full transition-all ${
              i === active ? 'w-4 bg-white' : 'w-1.5 bg-white/35'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function SavingsCard({ entries, plan, today, onOpenPlan }: Props) {
  const [page, setPage] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [startX, setStartX] = useState(0)

  const mk = monthKey(today)
  const total = useMemo(() => cumulativeSavings(entries, plan, mk), [entries, plan, mk])
  const available = useMemo(() => availableSavings(entries, plan, mk), [entries, plan, mk])
  const settled = useMemo(() => settledSavings(entries, plan, mk), [entries, plan, mk])

  const goal = plan.savingGoal

  const pages: Page[] = [
    {
      title: '可用存款',
      value: available,
      footerLeft: `期初 ¥${money(plan.startingSavings)}`,
      footerRight: `锁住计划攒 ¥${money(plan.monthlySave)}`,
      bg: BG_AVAILABLE,
      shadow: 'rgba(34,48,127,0.9)',
    },
    {
      title: '累计存款',
      value: total,
      footerLeft: `期初 ¥${money(plan.startingSavings)}`,
      footerRight: `本月已攒 ¥${money(total - settled)}`,
      bg: BG_TOTAL,
      shadow: 'rgba(6,92,65,1)',
    },
  ]

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
    setDx(Math.max(-200, Math.min(200, delta)))
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

  const renderPage = (data: Page) => {
    const progress = goal > 0 ? Math.min(data.value / goal, 1) : 0
    const remain = Math.max(goal - data.value, 0)
    const reached = goal > 0 && data.value >= goal

    return (
      <div
        key={data.title}
        className="relative w-1/2 overflow-hidden p-5 text-white"
        style={{ background: data.bg }}
      >
        <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between">
          <p className="text-[12.5px] text-white/70">{data.title}</p>
        </div>

        <p className="relative mt-2 flex items-baseline gap-1">
          <span className="text-lg font-medium text-white/80">
            {data.value < 0 ? '−¥' : '¥'}
          </span>
          <span className="text-[36px] leading-none font-semibold tracking-tight tabular">
            {money(Math.abs(data.value))}
          </span>
        </p>

        {goal > 0 ? (
          <div className="relative mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-white/70">
                目标 ¥{money(goal)} · 已完成 {Math.round(progress * 100)}%
              </span>
              <span className="font-medium text-white/90">
                {reached ? '已达成 🎉' : `还差 ¥${money(remain)}`}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenPlan}
            className="relative mt-4 flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-[11.5px] text-white/85"
          >
            <span>还没设定攒钱目标</span>
            <span className="flex items-center gap-0.5 font-medium">
              去设定
              <ChevronRight size={12} />
            </span>
          </button>
        )}

        <div className="relative mt-4 flex items-center justify-between border-t border-white/15 pt-3.5 text-[11.5px]">
          <span className="text-white/60">{data.footerLeft}</span>
          <span className="text-white/85">{data.footerRight}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-[26px]"
      style={{ boxShadow: `0 22px 45px -24px ${pages[page].shadow}` }}
    >
      {/* 圆点只放一份，避免两页各一套互相挡点击 */}
      <div className="absolute top-3.5 right-4 z-10">
        <Dots active={page} onPick={setPage} />
      </div>

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
        {pages.map(renderPage)}
      </div>
    </div>
  )
}
