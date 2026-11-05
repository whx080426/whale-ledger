import { House, ReceiptText, Settings2 } from 'lucide-react'

export type TabKey = 'home' | 'ledger' | 'plan'

interface Props {
  active: TabKey
  onChange: (key: TabKey) => void
}

const TABS: Array<{ key: TabKey; label: string; icon: typeof House }> = [
  { key: 'home', label: '首页', icon: House },
  { key: 'ledger', label: '明细', icon: ReceiptText },
  { key: 'plan', label: '设置', icon: Settings2 },
]

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav className="relative z-20 border-t border-line bg-white/95 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[480px] items-center justify-around">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex w-20 flex-col items-center gap-1 py-1 transition ${
                isActive ? 'text-brand' : 'text-soft/70'
              }`}
            >
              <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
