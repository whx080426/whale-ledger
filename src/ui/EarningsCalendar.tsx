import { useMemo, useState } from 'react'
import type { Entry, Plan } from '../core/types'
import { money, pad } from '../core/format'

interface Props {
  entries: Entry[]
  plan: Plan
  /** 今天，YYYY-MM-DD */
  today: string
}

type Metric = 'net' | 'budget'
type Grain = 'day' | 'week'

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

/** 日历格子里的紧凑金额：1.28万 / 2521 / 32.80 */
function compact(n: number): string {
  const abs = Math.abs(n)
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(2)}万`
  if (abs >= 1000) return `${sign}${Math.round(abs)}`
  return `${sign}${abs.toFixed(2)}`
}

interface Bucket {
  /** 起始日期与结束日期，用于周视图的区间标签 */
  start: string
  end: string
  days: string[]
  income: number
  expense: number
  /** 有记录的天数 */
  recorded: number
  /** 该桶对应的预算（日计划花 × 天数） */
  budget: number
}

function emptyBucket(start: string, end: string, days: string[], dailyBudget: number): Bucket {
  return {
    start,
    end,
    days,
    income: 0,
    expense: 0,
    recorded: 0,
    budget: dailyBudget * days.length,
  }
}

function bucketValue(bucket: Bucket | null, metric: Metric): number | null {
  if (!bucket) return null
  if (metric === 'net') return bucket.income - bucket.expense
  return bucket.budget - bucket.expense
}

function valueClass(value: number | null): string {
  if (value === null) return 'text-soft/30'
  if (value > 0) return 'text-brand'
  if (value < 0) return 'text-danger'
  return 'text-soft'
}

export default function EarningsCalendar({ entries, plan, today }: Props) {
  const [metric, setMetric] = useState<Metric>('net')
  const [grain, setGrain] = useState<Grain>('day')
  const [anchor, setAnchor] = useState(today)

  const month = anchor.slice(0, 7)
  const [year, monthNumber] = month.split('-').map(Number)

  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const startOffset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7
  const isThisMonth = month === today.slice(0, 7)

  /** 本月所有记录，按天聚合成 Map */
  const byDay = useMemo(() => {
    const map = new Map<string, Bucket>()
    for (const entry of entries) {
      if (!entry.date.startsWith(month)) continue
      let bucket = map.get(entry.date)
      if (!bucket) {
        bucket = emptyBucket(entry.date, entry.date, [entry.date], plan.dailyBudget)
        bucket.recorded = 1
        map.set(entry.date, bucket)
      }
      if (entry.type === 'income') bucket.income += entry.amount
      else bucket.expense += entry.amount
    }
    return map
  }, [entries, month, plan.dailyBudget])

  /** 按 ISO 周切分本月，首尾周只统计落在本月内的那几天 */
  const weeks = useMemo(() => {
    const list: Bucket[] = []
    let cursor = 1
    while (cursor <= daysInMonth) {
      const weekday = (new Date(year, monthNumber - 1, cursor).getDay() + 6) % 7
      const span = Math.min(7 - weekday, daysInMonth - cursor + 1)
      const days: string[] = []
      for (let i = 0; i < span; i += 1) days.push(`${month}-${pad(cursor + i)}`)

      const bucket = emptyBucket(days[0], days[days.length - 1], days, plan.dailyBudget)
      for (const day of days) {
        const record = byDay.get(day)
        if (!record) continue
        bucket.income += record.income
        bucket.expense += record.expense
        bucket.recorded += record.recorded
      }
      list.push(bucket)
      cursor += span
    }
    return list
  }, [byDay, daysInMonth, month, monthNumber, plan.dailyBudget, year])

  const totalIncome = [...byDay.values()].reduce((sum, b) => sum + b.income, 0)
  const totalExpense = [...byDay.values()].reduce((sum, b) => sum + b.expense, 0)
  const overspentDays = [...byDay.values()].filter(
    (b) => b.recorded > 0 && b.expense > plan.dailyBudget,
  ).length

  const monthBudget = plan.monthlyBudget
  const headValue = metric === 'net' ? totalIncome - totalExpense : monthBudget - totalExpense
  const headColor = headValue > 0 ? 'text-brand' : headValue < 0 ? 'text-danger' : 'text-ink'

  const title =
    metric === 'net'
      ? isThisMonth
        ? '本月净收益'
        : '当月净收益'
      : headValue < 0
        ? isThisMonth
          ? '本月超支'
          : '当月超支'
        : isThisMonth
          ? '本月结余'
          : '当月结余'

  const step = (dir: number) => {
    const next = new Date(year, monthNumber - 1 + dir, 1)
    setAnchor(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`)
  }

  const dayCell = (iso: string) => {
    const bucket = byDay.get(iso) ?? null
    const value = bucketValue(bucket, metric)
    const isToday = iso === today
    const isFuture = iso > today
    const day = Number(iso.slice(8, 10))

    return (
      <div
        key={iso}
        className={`flex h-[42px] flex-col items-center justify-center rounded-xl ${
          isToday ? 'bg-ink/[0.045] ring-1 ring-ink/10' : ''
        }`}
      >
        <span
          className={`text-[10px] ${
            isToday ? 'font-semibold text-ink' : isFuture ? 'text-soft/40' : 'text-soft/70'
          }`}
        >
          {day}
        </span>
        <span className={`mt-0.5 text-[10px] font-medium tabular ${valueClass(value)}`}>
          {value === null ? (isFuture ? '' : '—') : compact(value)}
        </span>
      </div>
    )
  }

  const weekRow = (bucket: Bucket, index: number) => {
    const value = bucketValue(bucket.recorded > 0 ? bucket : null, metric)
    const sm = Number(bucket.start.slice(5, 7))
    const sd = Number(bucket.start.slice(8, 10))
    const em = Number(bucket.end.slice(5, 7))
    const ed = Number(bucket.end.slice(8, 10))
    const range =
      sm === em
        ? sd === ed
          ? `${sm}/${sd}`
          : `${sm}/${sd} – ${ed}`
        : `${sm}/${sd} – ${em}/${ed}`

    return (
      <div key={bucket.start} className="flex items-center gap-2.5 px-2.5 py-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass(value)}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-medium text-ink">第 {index + 1} 周</p>
          <p className="mt-0.5 truncate text-[10px] text-soft">
            {range}
            {bucket.recorded > 0 ? ` · 记账 ${bucket.recorded} 天` : ' · 无记录'}
          </p>
        </div>
        <span className={`shrink-0 text-[12.5px] font-semibold tabular ${valueClass(value)}`}>
          {value === null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}¥${money(Math.abs(value))}`}
        </span>
      </div>
    )
  }

  return (
    <div className="px-5">
      <div className="rounded-[22px] bg-white p-3.5 ring-1 ring-line">
        {/* 口径 + 日/周 */}
        <div className="flex items-center justify-between">
          <div className="flex rounded-full bg-canvas p-0.5">
            {(['net', 'budget'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  metric === m ? 'bg-white text-ink shadow-sm' : 'text-soft'
                }`}
              >
                {m === 'net' ? '净收益' : '预算'}
              </button>
            ))}
          </div>

          <div className="flex rounded-full bg-canvas p-0.5">
            {(['day', 'week'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGrain(g)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  grain === g ? 'bg-white text-ink shadow-sm' : 'text-soft'
                }`}
              >
                {g === 'day' ? '日' : '周'}
              </button>
            ))}
          </div>
        </div>

        {/* 标题 + 汇总数字 */}
        <div className="mt-2.5">
          <p className="text-[11.5px] text-soft">{title}</p>
          <p className={`mt-0.5 flex items-baseline gap-1 ${headColor}`}>
            <span className="text-[13px] font-medium opacity-70">
              {headValue > 0 ? '+' : headValue < 0 ? '−' : ''}¥
            </span>
            <span className="text-[26px] leading-none font-semibold tabular">
              {money(Math.abs(headValue))}
            </span>
          </p>
        </div>

        <p className="mt-1.5 text-[10.5px] text-soft">
          {metric === 'net' ? (
            <>
              收入 ¥{money(totalIncome)}
              <span className="mx-1 text-line">|</span>
              支出 ¥{money(totalExpense)}
              <span className="mx-1 text-line">|</span>
              记账 {byDay.size} 天
            </>
          ) : (
            <>
              日预算 ¥{money(plan.dailyBudget)}
              <span className="mx-1 text-line">|</span>
              已花 ¥{money(totalExpense)}
              <span className="mx-1 text-line">|</span>
              超支 {overspentDays} 天
            </>
          )}
        </p>

        {/* 月份切换 */}
        <div className="mt-2 flex items-center justify-between rounded-xl bg-canvas px-1.5 py-1">
          <button
            onClick={() => step(-1)}
            aria-label="上个月"
            className="grid h-6 w-6 place-items-center rounded-full text-soft active:bg-white"
          >
            ‹
          </button>
          <span className="text-[11.5px] font-medium text-ink">
            {year}年{monthNumber}月
          </span>
          <button
            onClick={() => step(1)}
            aria-label="下个月"
            className="grid h-6 w-6 place-items-center rounded-full text-soft active:bg-white"
          >
            ›
          </button>
        </div>

        {/* 日视图：整月网格 */}
        {grain === 'day' && (
          <div className="mt-2 grid grid-cols-7 gap-[3px]">
            {WEEK.map((w) => (
              <div key={w} className="pb-0.5 text-center text-[10px] text-soft/70">
                {w}
              </div>
            ))}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => dayCell(`${month}-${pad(i + 1)}`))}
          </div>
        )}

        {/* 周视图：本月按周列出 */}
        {grain === 'week' && (
          <div className="mt-2 divide-y divide-line/70 overflow-hidden rounded-xl bg-canvas/70">
            {weeks.map((bucket, index) => weekRow(bucket, index))}
          </div>
        )}

        <p className="mt-2 flex items-center justify-center gap-3 border-t border-line/70 pt-1.5 text-[10px] text-soft/70">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {metric === 'net' ? '有结余' : '没超预算'}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
            超支
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-soft/30" />
            无记录
          </span>
        </p>
      </div>

      <p className="mt-2 px-1 text-[10px] leading-relaxed text-soft/60">
        {metric === 'net'
          ? grain === 'day'
            ? '净收益 = 当天记录的收入 − 当天记录的支出。'
            : '净收益 = 该周记录的收入 − 该周记录的支出（只算本月内的日期）。'
          : grain === 'day'
            ? '结余 = 日计划花 − 当天支出，负数就是超支。'
            : '结余 = 日计划花 × 该周在本月的天数 − 该周支出。'}
      </p>
    </div>
  )
}

function dotClass(value: number | null): string {
  if (value === null) return 'bg-soft/30'
  if (value > 0) return 'bg-brand'
  if (value < 0) return 'bg-danger'
  return 'bg-soft/50'
}
