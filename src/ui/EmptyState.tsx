import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
  compact?: boolean
}

/** 统一的空状态：淡色圆底 + 线性图标 + 标题 + 说明 + 可选操作 */
export default function EmptyState({ icon, title, hint, action, compact = false }: Props) {
  return (
    <div
      className={`flex flex-col items-center px-6 text-center ${compact ? 'py-8' : 'py-11'}`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-brand/[0.07] text-brand/55 ring-1 ring-brand/10">
        {icon}
      </div>
      <p className="mt-3 text-[13px] font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-[11.5px] leading-relaxed text-soft">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
