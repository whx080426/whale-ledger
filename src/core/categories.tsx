import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Category, EntryType } from './types'
import { mergeRecords, pushSlice, registerSlice } from './sync'

const KEY = 'ledger.categories.v2'

/** 预置分类 */
export const PRESETS: Category[] = [
  { id: 'food', name: '餐饮', type: 'expense', color: '#FF7A59' },
  { id: 'transport', name: '交通', type: 'expense', color: '#4F9CF9' },
  { id: 'shopping', name: '购物', type: 'expense', color: '#A78BFA' },
  { id: 'home', name: '居家', type: 'expense', color: '#2DD4BF' },
  { id: 'fun', name: '娱乐', type: 'expense', color: '#F5B942' },
  { id: 'health', name: '医疗', type: 'expense', color: '#F87171' },
  { id: 'study', name: '学习', type: 'expense', color: '#818CF8' },
  { id: 'other', name: '其他', type: 'expense', color: '#94A3B8' },
  { id: 'salary', name: '工资', type: 'income', color: '#22C55E' },
  { id: 'bonus', name: '奖金', type: 'income', color: '#FB923C' },
  { id: 'invest', name: '理财', type: 'income', color: '#14B8A6' },
  { id: 'otherIn', name: '其他', type: 'income', color: '#94A3B8' },
]

const CUSTOM_COLORS = [
  '#F97316',
  '#0EA5E9',
  '#8B5CF6',
  '#10B981',
  '#F43F5E',
  '#F59E0B',
  '#6366F1',
  '#14B8A6',
]

function readCustom(): Category[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? (data as Category[]) : []
  } catch {
    return []
  }
}

interface CategoriesValue {
  /** 预置 + 自定义（不含墓碑） */
  all: Category[]
  custom: Category[]
  /** 某个收支类型下可选的分类 */
  options: (type: EntryType) => Category[]
  get: (id?: string) => Category | undefined
  addCustom: (name: string, type: EntryType) => Category | null
  removeCustom: (id: string) => void
}

const CategoriesContext = createContext<CategoriesValue | null>(null)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  /** 含墓碑的全量自定义分类 */
  const [customAll, setCustomAll] = useState<Category[]>(readCustom)

  const customRef = useRef(customAll)
  customRef.current = customAll

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(customAll))
    } catch {
      /* 忽略 */
    }
  }, [customAll])

  useEffect(() => {
    registerSlice('categories', {
      get: () => customRef.current,
      apply: (remote) => {
        if (!Array.isArray(remote)) return
        setCustomAll((prev) => mergeRecords(prev, remote as Category[]))
      },
    })
  }, [])

  const custom = useMemo(() => customAll.filter((item) => !item.deleted), [customAll])

  const addCustom = useCallback((name: string, type: EntryType): Category | null => {
    const trimmed = name.trim().slice(0, 8)
    if (!trimmed) return null

    const existing = customRef.current.find(
      (item) => item.type === type && item.name === trimmed && !item.deleted,
    )
    if (existing) return existing

    const created: Category = {
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      type,
      color: CUSTOM_COLORS[customRef.current.length % CUSTOM_COLORS.length],
      custom: true,
      updatedAt: Date.now(),
    }
    setCustomAll((prev) => [...prev, created])
    window.setTimeout(() => pushSlice('categories'), 0)
    return created
  }, [])

  const removeCustom = useCallback((id: string) => {
    const now = Date.now()
    setCustomAll((prev) =>
      prev.map((item) => (item.id === id ? { ...item, deleted: true, updatedAt: now } : item)),
    )
    window.setTimeout(() => pushSlice('categories'), 0)
  }, [])

  const value = useMemo<CategoriesValue>(() => {
    const all = [...PRESETS, ...custom]
    return {
      all,
      custom,
      options: (type) => all.filter((item) => item.type === type),
      get: (id) => all.find((item) => item.id === id),
      addCustom,
      removeCustom,
    }
  }, [custom, addCustom, removeCustom])

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories(): CategoriesValue {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories 必须在 CategoriesProvider 内使用')
  return ctx
}
