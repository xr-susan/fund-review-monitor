import { create } from 'zustand'
import { fundApi, notesApi, benchmarkApi, exportApi } from '../services/api'

// 获取当前用户名（用于隔离不同用户的数据）
const getCurrentUsername = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.username || 'default'
  } catch {
    return 'default'
  }
}

// 从本地存储加载持仓金额（按用户隔离）
const loadHoldingsAmounts = () => {
  try {
    const username = getCurrentUsername()
    const saved = localStorage.getItem(`fundHoldingsAmounts_${username}`)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 保存持仓金额到本地存储（按用户隔离）
const saveHoldingsAmounts = (amounts) => {
  try {
    const username = getCurrentUsername()
    localStorage.setItem(`fundHoldingsAmounts_${username}`, JSON.stringify(amounts))
  } catch (error) {
    console.error('保存持仓金额失败:', error)
  }
}

// 从本地存储加载持仓日期（按用户隔离）
const loadHoldingsDates = () => {
  try {
    const username = getCurrentUsername()
    const saved = localStorage.getItem(`fundHoldingsDates_${username}`)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 保存持仓日期到本地存储（按用户隔离）
const saveHoldingsDates = (dates) => {
  try {
    const username = getCurrentUsername()
    localStorage.setItem(`fundHoldingsDates_${username}`, JSON.stringify(dates))
  } catch (error) {
    console.error('保存持仓日期失败:', error)
  }
}

export const useFundStore = create((set, get) => ({
  // ==================== 状态 ====================
  funds: [],
  selectedFund: null,
  notes: [],
  benchmark: {},
  darkMode: localStorage.getItem('darkMode') === 'true',
  refreshInterval: 5, // 分钟
  lastUpdate: null,
  loading: false,
  error: null,
  holdingsAmounts: loadHoldingsAmounts(), // { fundCode: amount }
  holdingsDates: loadHoldingsDates(), // { fundCode: date }

  /**
   * 重新加载用户本地数据（登录/切换用户时调用）
   */
  reloadUserData: () => {
    set({
      holdingsAmounts: loadHoldingsAmounts(),
      holdingsDates: loadHoldingsDates(),
      funds: [],
      notes: [],
      selectedFund: null
    })
  },

  /**
   * 清除用户本地数据（登出时调用）
   */
  clearUserData: () => {
    set({
      funds: [],
      selectedFund: null,
      notes: [],
      benchmark: {},
      holdingsAmounts: {},
      holdingsDates: {},
      lastUpdate: null,
      error: null
    })
  },

  // ==================== 数据加载 ====================

  /**
   * 加载所有自选基金
   */
  loadFunds: async () => {
    set({ loading: true, error: null })
    try {
      const funds = await fundApi.getAll()
      console.log('加载基金数据:', funds)
      set({ funds: funds || [], loading: false, lastUpdate: new Date().toISOString() })
    } catch (error) {
      console.error('加载基金失败:', error)
      set({ error: error.message, loading: false, funds: [] })
    }
  },

  /**
   * 加载单个基金详情（含历史净值）
   */
  loadFundDetail: async (code) => {
    try {
      const detail = await fundApi.getDetail(code)
      const navHistory = await fundApi.getNavHistory(code, 30)

      const fundWithHistory = {
        ...detail,
        navHistory: navHistory || []
      }

      set(state => ({
        funds: state.funds.map(f => f.code === code ? { ...f, ...fundWithHistory } : f),
        selectedFund: state.selectedFund?.code === code ? { ...state.selectedFund, ...fundWithHistory } : state.selectedFund
      }))
      return fundWithHistory
    } catch (error) {
      console.error('加载基金详情失败:', error)
      return null
    }
  },

  /**
   * 加载基金持仓
   */
  loadFundHoldings: async (code) => {
    try {
      const holdings = await fundApi.getHoldings(code)
      set(state => ({
        funds: state.funds.map(f => f.code === code ? { ...f, topHoldings: holdings } : f),
        selectedFund: state.selectedFund?.code === code ? { ...state.selectedFund, topHoldings: holdings } : state.selectedFund
      }))
      return holdings
    } catch (error) {
      console.error('加载基金持仓失败:', error)
      return []
    }
  },

  /**
   * 加载基准指数
   * @param {boolean} refresh - 是否强制刷新
   */
  loadBenchmark: async (refresh = false) => {
    try {
      const benchmark = await benchmarkApi.getAll(refresh)
      console.log('加载基准指数:', benchmark)
      set({ benchmark: benchmark || {} })
    } catch (error) {
      console.error('加载基准指数失败:', error)
      set({ benchmark: {} })
    }
  },

  /**
   * 加载复盘笔记
   */
  loadNotes: async () => {
    try {
      const notes = await notesApi.getAll()
      console.log('加载复盘笔记:', notes)
      set({ notes: notes || [] })
    } catch (error) {
      console.error('加载复盘笔记失败:', error)
      set({ notes: [] })
    }
  },

  // ==================== 基金操作 ====================

  /**
   * 选择基金
   */
  selectFund: (fund) => set({ selectedFund: fund }),

  /**
   * 搜索基金
   */
  searchFund: async (keyword) => {
    try {
      const results = await fundApi.search(keyword)
      return results
    } catch (error) {
      console.error('搜索基金失败:', error)
      return []
    }
  },

  /**
   * 添加自选基金
   */
  addFund: async (code) => {
    try {
      await fundApi.addToWatchlist(code)
      // 重新加载基金列表
      await get().loadFunds()
      return true
    } catch (error) {
      console.error('添加基金失败:', error)
      return false
    }
  },

  /**
   * 删除自选基金
   */
  removeFund: async (code) => {
    try {
      await fundApi.removeFromWatchlist(code)
      // 清除缓存，确保下次加载时获取最新数据
      const cacheKey = `funds:${localStorage.getItem('userId') || 'default'}`
      set(state => ({
        funds: state.funds.filter(f => f.code !== code),
        selectedFund: state.selectedFund?.code === code ? null : state.selectedFund
      }))
      return true
    } catch (error) {
      console.error('删除基金失败:', error)
      return false
    }
  },

  // ==================== 笔记操作 ====================

  /**
   * 添加笔记
   */
  addNote: async (note) => {
    try {
      const newNote = await notesApi.create(note)
      set(state => ({ notes: [...state.notes, newNote] }))
      return newNote
    } catch (error) {
      console.error('添加笔记失败:', error)
      return null
    }
  },

  /**
   * 更新笔记
   */
  updateNote: async (id, updates) => {
    try {
      const updated = await notesApi.update(id, updates)
      set(state => ({
        notes: state.notes.map(n => n.id === id ? updated : n)
      }))
      return updated
    } catch (error) {
      console.error('更新笔记失败:', error)
      return null
    }
  },

  /**
   * 删除笔记
   */
  deleteNote: async (id) => {
    try {
      await notesApi.delete(id)
      set(state => ({ notes: state.notes.filter(n => n.id !== id) }))
      return true
    } catch (error) {
      console.error('删除笔记失败:', error)
      return false
    }
  },

  // ==================== 数据导出 ====================

  /**
   * 导出基金数据
   */
  exportFunds: async () => {
    try {
      await exportApi.exportFunds()
      return true
    } catch (error) {
      console.error('导出基金数据失败:', error)
      return false
    }
  },

  /**
   * 导出持仓数据
   */
  exportHoldings: async (code) => {
    try {
      await exportApi.exportHoldings(code)
      return true
    } catch (error) {
      console.error('导出持仓数据失败:', error)
      return false
    }
  },

  /**
   * 导出复盘笔记
   */
  exportNotes: async () => {
    try {
      await exportApi.exportNotes()
      return true
    } catch (error) {
      console.error('导出笔记失败:', error)
      return false
    }
  },

  // ==================== 设置 ====================

  /**
   * 刷新数据（强制刷新基准指数）
   */
  refreshData: async () => {
    const { loadFunds, loadBenchmark, loadNotes } = get()
    await Promise.all([
      loadFunds(),
      loadBenchmark(true), // 强制刷新基准指数
      loadNotes()
    ])
  },

  /**
   * 设置单个基金的持仓金额
   */
  setHoldingAmount: (fundCode, amount) => {
    set(state => {
      const newAmounts = { ...state.holdingsAmounts, [fundCode]: Number(amount) || 0 }
      saveHoldingsAmounts(newAmounts)
      return { holdingsAmounts: newAmounts }
    })
  },

  /**
   * 获取单个基金的持仓金额
   */
  getHoldingAmount: (fundCode) => {
    const { holdingsAmounts } = get()
    return holdingsAmounts[fundCode] || 0
  },

  /**
   * 设置单个基金的持仓日期
   */
  setHoldingDate: (fundCode, date) => {
    set(state => {
      const newDates = { ...state.holdingsDates, [fundCode]: date }
      saveHoldingsDates(newDates)
      return { holdingsDates: newDates }
    })
  },

  /**
   * 获取单个基金的持仓日期
   */
  getHoldingDate: (fundCode) => {
    const { holdingsDates } = get()
    return holdingsDates[fundCode] || ''
  },

  /**
   * 计算总资产
   */
  getTotalAssets: () => {
    const { funds, holdingsAmounts } = get()
    // 如果有自定义持仓金额，使用自定义金额
    if (Object.keys(holdingsAmounts).length > 0) {
      return Object.values(holdingsAmounts).reduce((sum, amount) => sum + amount, 0)
    }
    // 否则使用默认计算
    return funds.reduce((sum, fund) => sum + (fund.nav || 0) * 1000, 0)
  },

  /**
   * 计算日收益
   */
  getTotalDayChange: () => {
    const { funds, holdingsAmounts } = get()
    if (funds.length === 0) return 0

    // 如果有自定义持仓金额，按金额加权计算
    if (Object.keys(holdingsAmounts).length > 0) {
      let totalAmount = 0
      let totalProfit = 0
      funds.forEach(fund => {
        const amount = holdingsAmounts[fund.code] || 0
        if (amount > 0) {
          totalAmount += amount
          totalProfit += amount * (Number(fund.dayChange) || 0) / 100
        }
      })
      return totalAmount > 0 ? (totalProfit / totalAmount * 100).toFixed(2) : '0.00'
    }

    // 否则使用平均值
    const totalChange = funds.reduce((sum, fund) => sum + (Number(fund.dayChange) || 0), 0)
    return (totalChange / funds.length).toFixed(2)
  },

  /**
   * 计算基金当日收益金额
   */
  getFundDayProfit: (fundCode) => {
    const { funds, holdingsAmounts } = get()
    const fund = funds.find(f => f.code === fundCode)
    const amount = holdingsAmounts[fundCode] || 0
    if (!fund || amount === 0) return 0
    return amount * (Number(fund.dayChange) || 0) / 100
  },

  toggleDarkMode: () => {
    const newMode = !get().darkMode
    localStorage.setItem('darkMode', String(newMode))
    document.documentElement.classList.toggle('dark', newMode)
    set({ darkMode: newMode })
  },

  setRefreshInterval: (interval) => set({ refreshInterval: interval }),

  // ==================== 计算属性 ====================

  /**
   * 获取基金历史净值
   */
  getFundNavHistory: (fundCode) => {
    const fund = get().funds.find(f => f.code === fundCode)
    return fund?.navHistory || []
  }
}))
