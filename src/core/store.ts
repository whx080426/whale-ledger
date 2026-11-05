import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Entry, Plan } from './types'
import { normalizePlan } from './plan'
import { mergePlan, mergeRecords, pushSlice, registerSlice } from './sync'

const PLAN_KEY = 'ledger.plan.v2'
const ENTRY_KEY = 'ledger.entries.v2'

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readEntries(): Entry[] {
  const data = readJSON<Entry[]>(ENTRY_KEY)
  if (!Array.isArray(data)) return []
  return data.map((entry) => ({
    ...entry,
    updatedAt: entry.updatedAt ?? entry.createdAt ?? Date.now(),
  }))
}

export function useLedger() {
  /** null 表示还没设定计划，先引导用户填写 */
  const [plan, setPlan] = useState<Plan | null>(() =>
    normalizePlan(readJSON<Partial<Plan>>(PLAN_KEY)),
  )
  /** 含墓碑的全量记录，对外只暴露未删除的 */
  const [all, setAll] = useState<Entry[]>(readEntries)

  const entries = useMemo(() => all.filter((entry) => !entry.deleted), [all])

  const planRef = useRef(plan)
  planRef.current = plan
  const allRef = useRef(all)
  allRef.current = all

  useEffect(() => {
    if (!plan) return
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
    } catch {
      /* 忽略 */
    }
  }, [plan])

  useEffect(() => {
    try {
      localStorage.setItem(ENTRY_KEY, JSON.stringify(all))
    } catch {
      /* 忽略 */
    }
  }, [all])

  // 把读写注册给同步引擎
  useEffect(() => {
    registerSlice('plan', {
      get: () => planRef.current,
      apply: (remote) => {
        const next = mergePlan(planRef.current, (remote as Plan | null) ?? null)
        if (next) setPlan(next)
      },
    })

    registerSlice('entries', {
      get: () => allRef.current,
      apply: (remote) => {
        if (!Array.isArray(remote)) return
        setAll((prev) => mergeRecords(prev, remote as Entry[]))
      },
    })
  }, [])

  const flush = useCallback((key: 'entries' | 'plan' | 'categories') => {
    window.setTimeout(() => pushSlice(key), 0)
  }, [])

  const savePlan = useCallback((next: Plan) => {
    setPlan({ ...next, updatedAt: Date.now() })
    flush('plan')
  }, [flush])

  const addEntry = useCallback(
    (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const entry: Entry = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
      setAll((prev) => [entry, ...prev])
      flush('entries')
    },
    [flush],
  )

  const removeEntry = useCallback(
    (id: string) => {
      const now = Date.now()
      setAll((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, deleted: true, updatedAt: now } : entry)),
      )
      flush('entries')
    },
    [flush],
  )

  const restoreEntry = useCallback(
    (entry: Entry) => {
      const now = Date.now()
      setAll((prev) => {
        const revived: Entry = { ...entry, deleted: false, updatedAt: now }
        return prev.some((item) => item.id === entry.id)
          ? prev.map((item) => (item.id === entry.id ? revived : item))
          : [revived, ...prev]
      })
      flush('entries')
    },
    [flush],
  )

  const clearEntries = useCallback(() => {
    const now = Date.now()
    setAll((prev) => prev.map((entry) => ({ ...entry, deleted: true, updatedAt: now })))
    flush('entries')
  }, [flush])

  const resetAll = useCallback(() => {
    setAll([])
    setPlan(null)
  }, [])

  return {
    plan,
    entries,
    savePlan,
    addEntry,
    removeEntry,
    restoreEntry,
    clearEntries,
    resetAll,
  }
}
