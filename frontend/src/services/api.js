import { useToastStore } from '../store/toastStore'

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`

/**
 * 获取认证头
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 通用请求方法
 */
async function request(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers
      },
      ...options
    })

    // 处理 401 未授权
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
      throw new Error('登录已过期，请重新登录')
    }

    // 处理其他错误
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error || `请求失败 (${response.status})`
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    // 网络错误
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      const networkError = new Error('网络连接失败，请检查后端服务是否启动')
      networkError.code = 'NETWORK_ERROR'
      throw networkError
    }

    console.error(`API 请求失败: ${url}`, error)
    throw error
  }
}

/**
 * 基金 API
 */
export const fundApi = {
  // 搜索基金
  search: (keyword) => request(`/funds/search?keyword=${encodeURIComponent(keyword)}`),

  // 获取所有自选基金
  getAll: () => request('/funds'),

  // 获取单个基金详情
  getDetail: (code) => request(`/funds/${code}`),

  // 获取基金持仓
  getHoldings: (code) => request(`/funds/${code}/holdings`),

  // 获取历史净值
  getNavHistory: (code, days = 30) => request(`/funds/${code}/nav-history?days=${days}`),

  // 添加自选基金
  addToWatchlist: (code) => request('/funds/watchlist', {
    method: 'POST',
    body: JSON.stringify({ code })
  }),

  // 删除自选基金
  removeFromWatchlist: (code) => request(`/funds/watchlist/${code}`, {
    method: 'DELETE'
  }),

  // 获取自选列表
  getWatchlist: () => request('/funds/watchlist')
}

/**
 * 股票 API
 */
export const stockApi = {
  // 获取股票实时价格
  getPrice: (code) => request(`/stocks/${code}/price`)
}

/**
 * 基准指数 API
 */
export const benchmarkApi = {
  // 获取基准指数
  // refresh=true 时强制刷新，不使用缓存
  getAll: (refresh = false) => request(`/benchmark${refresh ? '?refresh=true' : ''}`)
}

/**
 * 转换笔记数据格式（snake_case -> camelCase）
 */
function convertNoteFromApi(note) {
  return {
    id: note.id,
    fundCode: note.fund_code,
    fundName: note.fund_name,
    type: note.type,
    date: note.date,
    reason: note.reason,
    expectedReturn: note.expected_return,
    stopLoss: note.stop_loss,
    holdingPeriod: note.holding_period,
    actualReturn: note.actual_return,
    status: note.status,
    tags: note.tags || [],
    createdAt: note.created_at,
    updatedAt: note.updated_at
  }
}

/**
 * 转换笔记数据格式（camelCase -> snake_case）
 */
function convertNoteToApi(note) {
  return {
    fund_code: note.fundCode,
    fund_name: note.fundName,
    type: note.type,
    date: note.date,
    reason: note.reason,
    expected_return: note.expectedReturn,
    stop_loss: note.stopLoss,
    holding_period: note.holdingPeriod,
    actual_return: note.actualReturn,
    status: note.status,
    tags: note.tags
  }
}

/**
 * 复盘笔记 API
 */
export const notesApi = {
  // 获取所有笔记
  getAll: async () => {
    const notes = await request('/notes')
    return notes.map(convertNoteFromApi)
  },

  // 创建笔记
  create: async (note) => {
    const result = await request('/notes', {
      method: 'POST',
      body: JSON.stringify(convertNoteToApi(note))
    })
    return convertNoteFromApi(result)
  },

  // 更新笔记
  update: async (id, note) => {
    const result = await request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(convertNoteToApi(note))
    })
    return convertNoteFromApi(result)
  },

  // 删除笔记
  delete: (id) => request(`/notes/${id}`, {
    method: 'DELETE'
  })
}

/**
 * 数据导出 API
 */
export const exportApi = {
  // 导出基金数据
  exportFunds: async () => {
    const response = await fetch(`${API_BASE}/export/funds`, {
      headers: getAuthHeaders()
    })

    if (response.status === 401) {
      throw new Error('登录已过期，请重新登录')
    }
    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    downloadBlob(blob, 'funds.csv')
  },

  // 导出持仓数据
  exportHoldings: async (code) => {
    const response = await fetch(`${API_BASE}/export/holdings/${code}`, {
      headers: getAuthHeaders()
    })

    if (response.status === 401) {
      throw new Error('登录已过期，请重新登录')
    }
    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    downloadBlob(blob, `holdings_${code}.csv`)
  },

  // 导出复盘笔记
  exportNotes: async () => {
    const response = await fetch(`${API_BASE}/export/notes`, {
      headers: getAuthHeaders()
    })

    if (response.status === 401) {
      throw new Error('登录已过期，请重新登录')
    }
    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    downloadBlob(blob, 'notes.csv')
  }
}

export const notificationApi = {
  getChannels: () => request('/notifications/channels'),
  getDefaultRules: () => request('/notifications/rules/defaults'),
  addChannel: (channel) => request('/notifications/channels', {
    method: 'POST',
    body: JSON.stringify(channel)
  }),
  removeChannel: (id) => request(`/notifications/channels/${id}`, {
    method: 'DELETE'
  }),
  getHistory: (limit = 50) => request(`/notifications/history?limit=${limit}`),
  testChannel: (channelId) => request('/notifications/test', {
    method: 'POST',
    body: JSON.stringify({ channelId })
  })
}

/**
 * 下载 Blob 文件
 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * 健康检查
 */
export const healthApi = {
  check: () => request('/health')
}
