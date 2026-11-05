interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  suffix?: string
}

/** 设置页 / 引导页里的金额输入行 */
export default function MoneyField({
  label,
  value,
  onChange,
  placeholder = '0',
  hint,
  suffix = '元',
}: Props) {
  const handle = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, '')
    const [head, ...rest] = cleaned.split('.')
    onChange(rest.length === 0 ? head : `${head}.${rest.join('').slice(0, 2)}`)
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-[13.5px] text-ink">{label}</span>
        <span className="flex flex-1 items-center justify-end gap-1">
          <input
            value={value}
            onChange={(e) => handle(e.target.value)}
            inputMode="decimal"
            placeholder={placeholder}
            className="w-full max-w-[160px] bg-transparent text-right text-[15px] font-medium tabular text-ink outline-none placeholder:font-normal placeholder:text-soft/40"
          />
          <span className="text-[12px] text-soft">{suffix}</span>
        </span>
      </div>
      {hint && <p className="mt-1 text-right text-[11px] text-soft/80">{hint}</p>}
    </div>
  )
}
