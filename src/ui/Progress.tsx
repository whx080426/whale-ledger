interface Props {
  value: number
  tone?: 'brand' | 'danger' | 'soft' | 'accent'
}

export default function Progress({ value, tone = 'brand' }: Props) {
  const pct = Math.max(0, Math.min(value, 1)) * 100
  const color =
    tone === 'danger'
      ? 'bg-danger'
      : tone === 'soft'
        ? 'bg-soft/40'
        : tone === 'accent'
          ? 'bg-[linear-gradient(90deg,#7189FA_0%,#4A6CF7_100%)]'
          : 'bg-brand'

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
