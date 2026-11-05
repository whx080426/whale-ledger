import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { Entry, Plan } from './core/types'
import { useLedger } from './core/store'
import { CategoriesProvider } from './core/categories'
import { ClockProvider } from './core/clock'
import TabBar, { type TabKey } from './ui/TabBar'
import AddSheet from './ui/AddSheet'
import Toast from './ui/Toast'
import PlanConfirm from './ui/PlanConfirm'
import DeleteConfirm from './ui/DeleteConfirm'
import Setup from './ui/Setup'
import Home from './screens/Home'
import Ledger from './screens/Ledger'
import PlanPage from './screens/PlanPage'

interface ToastState {
  id: number
  message: string
  undo?: () => void
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#E6E9F0] md:p-4 lg:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas pt-[env(safe-area-inset-top)] md:h-[calc(100dvh-2rem)] md:max-w-[720px] md:rounded-[28px] md:pt-0 md:shadow-[0_30px_70px_-30px_rgba(15,23,42,0.35)] md:ring-1 md:ring-black/5 lg:h-[min(820px,calc(100dvh-3rem))] lg:max-w-[1120px] lg:rounded-[34px] lg:shadow-[0_40px_90px_-40px_rgba(15,23,42,0.45)]">
        {children}
      </div>
    </div>
  )
}

function AppInner() {
  const {
    plan,
    entries,
    savePlan,
    addEntry,
    removeEntry,
    restoreEntry,
    clearEntries,
    resetAll,
  } = useLedger()

  const [tab, setTab] = useState<TabKey>('home')
  const [ledgerPage, setLedgerPage] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleDelete = useCallback(
    (entry: Entry) => {
      removeEntry(entry.id)
      setToast({
        id: Date.now(),
        message: '已删除 1 笔记录',
        undo: () => restoreEntry(entry),
      })
    },
    [removeEntry, restoreEntry],
  )

  const handleSaveEntry = useCallback(
    (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => {
      addEntry(input)
      setSheetOpen(false)
      setToast({
        id: Date.now(),
        message: input.type === 'expense' ? '已记录支出' : '已记录收入',
      })
    },
    [addEntry],
  )

  if (!plan) {
    return (
      <Frame>
        <Setup
          onSubmit={(next) => {
            savePlan(next)
            setToast({ id: Date.now(), message: '计划已设定' })
          }}
        />
      </Frame>
    )
  }

  return (
    <Frame>
      <div className="relative flex-1 overflow-hidden">
        <main className="no-scrollbar h-full overflow-y-auto overscroll-contain">
          {tab === 'home' && (
            <Home
              entries={entries}
              plan={plan}
              onAdd={() => setSheetOpen(true)}
              onOpenPlan={() => setTab('plan')}
            />
          )}
          {tab === 'ledger' && (
            <Ledger
              entries={entries}
              plan={plan}
              onDelete={setPendingDelete}
              onPageChange={setLedgerPage}
            />
          )}
          {tab === 'plan' && (
            <PlanPage
              plan={plan}
              entries={entries}
              onSave={(next) => setPendingPlan(next)}
              onClearEntries={() => {
                clearEntries()
                setToast({ id: Date.now(), message: '记录已清空' })
              }}
              onReset={resetAll}
            />
          )}
        </main>

        {/* 底部渐隐，避免列表被硬切一条边 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-canvas to-transparent" />
      </div>

      {tab !== 'plan' && !(tab === 'ledger' && ledgerPage === 1) && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="记一笔"
          className="absolute right-5 bottom-[calc(78px+env(safe-area-inset-bottom))] z-30 grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(140deg,#12A876_0%,#0A7A55_100%)] text-white shadow-[0_14px_28px_-10px_rgba(10,122,85,0.9)] ring-4 ring-white transition active:scale-95 lg:right-auto lg:bottom-[calc(96px+env(safe-area-inset-bottom))] lg:left-8"
        >
          <Plus size={26} strokeWidth={2.6} />
        </button>
      )}

      <TabBar active={tab} onChange={setTab} />

      {sheetOpen && (
        <AddSheet onClose={() => setSheetOpen(false)} onSave={handleSaveEntry} />
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          undo={toast.undo}
          onClose={() => setToast(null)}
        />
      )}

      {pendingPlan && (
        <PlanConfirm
          from={plan}
          to={pendingPlan}
          onCancel={() => setPendingPlan(null)}
          onConfirm={() => {
            savePlan(pendingPlan)
            setPendingPlan(null)
            setToast({ id: Date.now(), message: '计划已更新' })
          }}
        />
      )}

      {pendingDelete && (
        <DeleteConfirm
          entry={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            handleDelete(pendingDelete)
            setPendingDelete(null)
          }}
        />
      )}
    </Frame>
  )
}

export default function App() {
  return (
    <CategoriesProvider>
      <ClockProvider>
        <AppInner />
      </ClockProvider>
    </CategoriesProvider>
  )
}
