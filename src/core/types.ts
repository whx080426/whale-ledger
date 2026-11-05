export type EntryType = 'expense' | 'income'

/** 分类：预置分类和用户自定义分类共用这个结构 */
export interface Category {
  id: string
  name: string
  type: EntryType
  color: string
  /** 用户自己添加的分类 */
  custom?: boolean
  /** 同步用：最后修改时间 */
  updatedAt?: number
  /** 同步用：软删除墓碑 */
  deleted?: boolean
}

/** 一笔手动记录 */
export interface Entry {
  id: string
  type: EntryType
  amount: number
  note: string
  /** 分类 id，早期数据可能没有 */
  categoryId?: string
  /** YYYY-MM-DD */
  date: string
  createdAt: number
  /** 同步用：最后修改时间 */
  updatedAt: number
  /** 同步用：软删除墓碑 */
  deleted?: boolean
}

/** 攒钱计划：收入、存款，以及「计划攒 / 计划花」四个联动数字 */
export interface Plan {
  /** 每月收入 */
  monthlyIncome: number
  /** 已经攒下的钱（开始记账时的存款） */
  startingSavings: number
  /** 每月计划攒 */
  monthlySave: number
  /** 每月计划花 */
  monthlyBudget: number
  /** 每周计划花 */
  weeklyBudget: number
  /** 每天计划花 */
  dailyBudget: number
  /** 攒钱总目标：账户里想存到多少钱，0 表示未设定 */
  savingGoal: number
  /** 同步用：最后修改时间 */
  updatedAt: number
}
