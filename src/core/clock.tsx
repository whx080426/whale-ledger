import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { todayISO } from './format'

/**
 * 跟着系统时钟走的一个时间源：
 * - 定时刷新（默认 20 秒）
 * - 切回标签页、窗口重新获得焦点时立刻刷新
 * - 跨过午夜时「今天」会自动变化
 */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())

    const timer = window.setInterval(tick, intervalMs)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', tick)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', tick)
    }
  }, [intervalMs])

  return now
}

const TodayContext = createContext<string>(todayISO())

export function ClockProvider({ children }: { children: ReactNode }) {
  const now = useNow(20_000)
  const today = useMemo(() => todayISO(now), [now])
  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>
}

/** 当前日期 YYYY-MM-DD，跨天自动更新 */
export function useToday(): string {
  return useContext(TodayContext)
}

/** 每秒走动的当前时间，只给时钟组件用 */
export function useClock(): Date {
  return useNow(1000)
}
