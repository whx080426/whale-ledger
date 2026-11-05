import { Trash2 } from 'lucide-react'
import type { Entry } from '../core/types'
import { dayLabel, money } from '../core/format'
import { useCategories } from '../core/categories'

interface Props {
  entry: Entry
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteConfirm({ entry, onCancel, onConfirm }: Props) {
  const { get } = useCategories()

  const isIncome = entry.type === 'income'
  const category = get(entry.categoryId)
  const label = category?.name ?? '未分类'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-7">
      <button
        aria-label="取消"
        onClick={onCancel}
        className="animate-fade absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
      />

      <div className="animate-pop relative w-full max-w-[340px] rounded-[26px] bg-white p-5 shadow-2xl">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-danger/10 text-danger">
          <Trash2 size={19} />
        </div>

        <h3 className="mt-3 text-center text-[16px] font-semibold text-ink">删除这笔记录？</h3>
        <p className="mt-1 text-center text-[11.5px] text-soft">删除后会从本月收支里扣除</p>

        <div className="mt-4 overflow-hidden rounded-2xl bg-canvas">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[12px] text-soft">{label}</span>
            <span className="text-[11.5px] text-soft">{dayLabel(entry.date)}</span>
          </div>
          <div className="mx-4 h-px bg-line" />
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="max-w-[150px] truncate text-[12.5px] text-ink">
              {entry.note || (isIncome ? '收入' : '支出')}
            </span>
            <span
              className={`text-[14px] font-semibold tabular ${
                isIncome ? 'text-brand' : 'text-ink'
              }`}
            >
              {isIncome ? '+' : '−'}
              {money(entry.amount)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onCancel}
            className="h-11 flex-1 rounded-2xl bg-canvas text-[14.5px] font-medium text-ink"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="h-11 flex-1 rounded-2xl bg-danger text-[14.5px] font-medium text-white shadow-[0_10px_20px_-10px_rgba(239,68,68,0.9)]"
          >
            删除
          </button>
        </div>

        <p className="mt-3 text-center text-[10.5px] text-soft/60">删错了可以点提示条上的「撤销」</p>
      </div>
    </div>
  )
}
