import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import type { Entry, EntryType } from '../core/types'
import { todayISO } from '../core/format'
import { useCategories } from '../core/categories'

interface Props {
  initialType?: EntryType
  onClose: () => void
  onSave: (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => void
}

function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [head, ...rest] = cleaned.split('.')
  if (rest.length === 0) return head.slice(0, 8)
  return `${head.slice(0, 8)}.${rest.join('').slice(0, 2)}`
}

export default function AddSheet({ initialType = 'expense', onClose, onSave }: Props) {
  const { options, addCustom } = useCategories()

  const [type, setType] = useState<EntryType>(initialType)
  const [categoryId, setCategoryId] = useState(() => options(initialType)[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')

  const cats = options(type)
  const current = cats.find((c) => c.id === categoryId)
  const num = Number(amount)
  const valid = Number.isFinite(num) && num > 0

  const switchType = (next: EntryType) => {
    setType(next)
    const list = options(next)
    if (!list.some((c) => c.id === categoryId)) setCategoryId(list[0]?.id ?? '')
    setCustomOpen(false)
  }

  const submitCustom = () => {
    const created = addCustom(customName, type)
    if (!created) return
    setCategoryId(created.id)
    setCustomName('')
    setCustomOpen(false)
  }

  const submit = () => {
    if (!valid) return
    onSave({
      type,
      amount: Math.round(num * 100) / 100,
      note: note.trim(),
      categoryId,
      date,
    })
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        aria-label="关闭"
        onClick={onClose}
        className="animate-fade absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
      />

      <div className="animate-sheet no-scrollbar relative max-h-[93%] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 pb-6 shadow-[0_-20px_60px_-20px_rgba(15,23,42,0.35)] lg:mx-auto lg:mb-8 lg:max-w-[520px] lg:rounded-[28px]">
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onClose}
            aria-label="取消"
            className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-soft"
          >
            <X size={16} />
          </button>

          <div className="flex rounded-full bg-canvas p-1">
            {(['expense', 'income'] as EntryType[]).map((t) => (
              <button
                key={t}
                onClick={() => switchType(t)}
                className={`rounded-full px-6 py-1.5 text-[13px] font-medium transition ${
                  type === t ? 'bg-white text-ink shadow-sm' : 'text-soft'
                }`}
              >
                {t === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>

          <span className="h-8 w-8" />
        </div>

        <div className="mt-6 flex items-baseline justify-center gap-1">
          <span className="text-[22px] font-medium text-soft">¥</span>
          <input
            value={amount}
            onChange={(e) => setAmount(sanitize(e.target.value))}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            className="w-[200px] bg-transparent text-center text-[42px] leading-none font-semibold tabular text-ink outline-none placeholder:text-soft/25"
          />
        </div>

        {/* 分类 */}
        <div className="mt-5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11.5px] text-soft">分类</span>
            <span className="text-[11px] text-soft/60">{current?.name ?? '未选择'}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {cats.map((c) => {
              const active = c.id === categoryId
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition ${
                    active ? 'bg-brand text-white' : 'bg-canvas text-soft'
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: active ? '#ffffff' : c.color }}
                  />
                  {c.name}
                </button>
              )
            })}

            <button
              onClick={() => setCustomOpen((v) => !v)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-[12.5px] text-soft"
            >
              <Plus size={12} />
              自定义
            </button>
          </div>

          {customOpen && (
            <div className="animate-pop mt-2 flex items-center gap-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCustom()
                }}
                maxLength={8}
                autoFocus
                placeholder="新分类名，如 宠物"
                className="h-9 flex-1 rounded-xl bg-canvas px-3 text-[13px] text-ink outline-none placeholder:text-soft/50"
              />
              <button
                onClick={submitCustom}
                disabled={!customName.trim()}
                className="h-9 shrink-0 rounded-xl bg-brand px-4 text-[13px] font-medium text-white disabled:opacity-40"
              >
                添加
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-canvas">
          <label className="flex items-center gap-3 px-4 py-3">
            <span className="w-12 shrink-0 text-[13px] text-soft">备注</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="午餐、打车、工资…"
              className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-soft/50"
            />
          </label>
          <div className="mx-4 h-px bg-line" />
          <label className="flex items-center gap-3 px-4 py-3">
            <span className="w-12 shrink-0 text-[13px] text-soft">日期</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-[13.5px] text-ink outline-none"
            />
          </label>
        </div>

        <button
          onClick={submit}
          disabled={!valid}
          className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium transition active:scale-[0.99] ${
            valid
              ? 'bg-[linear-gradient(140deg,#12A876_0%,#0A7A55_100%)] text-white shadow-[0_12px_24px_-10px_rgba(10,122,85,0.8)]'
              : 'bg-line text-soft/60'
          }`}
        >
          <Check size={18} />
          保存
        </button>
      </div>
    </div>
  )
}
