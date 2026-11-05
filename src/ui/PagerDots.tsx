interface Props {
  count: number
  active: number
  onPick: (index: number) => void
  labels: string[]
}

/** 两个小圆点，提示这一屏可以左右翻 */
export default function PagerDots({ count, active, onPick, labels }: Props) {
  return (
    <div className="flex items-center">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          aria-label={labels[i] ?? String(i + 1)}
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
