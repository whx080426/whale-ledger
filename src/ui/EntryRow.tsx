import { Trash2 } from 'lucide-react'
import type { Entry } from '../core/types'
import { money } from '../core/format'
import { useCategories } from '../core/categories'

interface Props {
  entry: Entry
  onDelete?: (entry: Entry) => void
  showDate?: boolean
}

export default function EntryRow({ entry, onDelete, showDate = false }: Props) {
  const { get } = useCategories()

  const isIncome = entry.type === 'income'
  const category = get(entry.categoryId)
  const color = category?.color ?? '#94A3B8'
  const label = category?.name ?? '未分类'

  // 拆成整数和小数两段，小数段宽度固定，各行小数点才能对齐
  const [intPart, decPart] = money(entry.amount).split('.')

  return (
    <div className="group flex items-center gap-3 px-4 py-3">
      <span className="flex w-3 shrink-0 justify-center" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink">{entry.note || label}</p>
        <p className="mt-0.5 truncate text-[11px] text-soft">
          {label}
          {showDate && <span className="text-soft/60"> · {entry.date.slice(5).replace('-', '/')}</span>}
        </p>
      </div>

      <span
        className={`flex shrink-0 items-baseline text-[15px] font-semibold tabular ${
          isIncome ? 'text-brand' : 'text-ink'
        }`}
      >
        <span className="text-right">
          {isIncome ? '+' : '−'}
          {intPart}
        </span>
        <span className="text-left">.{decPart}</span>
      </span>

      {onDelete && (
        <button
          onClick={() => onDelete(entry)}
          aria-label="删除"
          className="ml-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-soft/40 reveal-on-hover transition hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
