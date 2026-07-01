import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { createServer } from 'http'
import {
  getFundEstimate,
  getFundNavHistory,
  getFundDetail,
  getFundHoldings,
  getStockPrice,
  getBatchStockPrices,
  getFundRanking,
  searchFund,
  getIndexQuote,
  getBatchIndexQuotes
} from './services/fundApi.js'
import { setupWebSocket } from './websocket.js'
import {
  register,
  login,
  getUserById,
  updateUser,
  getAllUsers,
  authMiddleware,
  requireRole,
  initDefaultUser,
  refreshToken
} from './auth.js'
import {
  fundCache,
  stockCache,
  holdingsCache,
  navHistoryCache,
  clearFundCache,
  clearAllCache
} from './cache.js'
import {
  configureEmail,
  DEFAULT_ALERT_RULES,
  DEFAULT_NOTIFICATION_TEMPLATES,
  notificationManager
} from './notifications.js'
import { initDatabase } from './database.js'
import watchlistRepo from './repositories/watchlistRepo.js'
import noteRepo from './repositories/noteRepo.js'
import { apiLimiter, authLimiter, searchLimiter } from './middleware/rateLimiter.js'
import { validate, commonSchemas } from './middleware/validate.js'

const app = express()
const PORT = process.env.PORT || 5000
const corsOrigin = process.env.CORS_ORIGIN || true

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

// 应用通用 API 限流
app.use('/api/', apiLimiter)

// 初始化数据库
initDatabase()
initDefaultUser()

// 创建 HTTP 服务器
const server = createServer(app)

// 设置 WebSocket
const wss = setupWebSocket(server)

// 默认自选基金列表（用于新用户）
const DEFAULT_FUNDS = ['012922', '025209', '011452', '024239']

// 缓存数据
const cache = {
  funds: {},
  holdings: {},
  prices: {},
  lastUpdate: null
}

// ==================== API 路由 ====================

// ==================== 认证 API ====================

/**
 * 用户注册
 */
app.post('/api/auth/register', authLimiter, validate(commonSchemas.register), (req, res) => {
  const { username, password, email } = req.body

  if (!username || !password || !email) {
    return res.status(400).json({ error: '请提供完整的注册信息' })
  }

  const result = register(username, password, email)
  if (result.success) {
    res.json(result)
  } else {
    res.status(400).json(result)
  }
})

/**
 * 用户登录
 */
app.post('/api/auth/login', authLimiter, validate(commonSchemas.login), (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: '请提供用户名和密码' })
  }

  const result = login(username, password)
  if (result.success) {
    res.json(result)
  } else {
    res.status(401).json(result)
  }
})

/**
 * 获取当前用户信息
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id)
  if (user) {
    res.json({ user })
  } else {
    res.status(404).json({ error: '用户不存在' })
  }
})

/**
 * 更新用户信息
 */
app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const result = updateUser(req.user.id, req.body)
  if (result.success) {
    res.json(result)
  } else {
    res.status(400).json(result)
  }
})

/**
 * 获取所有用户（管理员）
 */
app.get('/api/auth/users', authMiddleware, requireRole('admin'), (req, res) => {
  const users = getAllUsers()
  res.json({ users })
})

/**
 * 刷新 Token
 */
app.post('/api/auth/refresh', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader.split(' ')[1]

  const result = refreshToken(token)
  if (result.success) {
    res.json(result)
  } else {
    res.status(401).json(result)
  }
})

/**
 * 搜索基金
 */
app.get('/api/funds/search', searchLimiter, validate(commonSchemas.searchFund), async (req, res) => {
  const { keyword } = req.query
  if (!keyword) {
    return res.status(400).json({ error: '请提供搜索关键词' })
  }

  const results = await searchFund(keyword)
  res.json(results)
})

/**
 * 计算涨跌幅
 */
function toFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getLatestHistoryChange(navHistory) {
  if (!Array.isArray(navHistory) || navHistory.length === 0) return null

  for (let i = navHistory.length - 1; i >= 0; i--) {
    const change = toFiniteNumber(navHistory[i]?.change)
    if (change !== null) return change
  }

  return null
}

function calculateChange(navHistory, currentNav, days) {
  if (!navHistory || navHistory.length === 0) {
    console.log(`calculateChange: 历史数据为空`)
    return null
  }

  const current = toFiniteNumber(currentNav)
  if (current === null) return null

  console.log(`calculateChange: 计算 ${days} 天涨跌幅, 当前净值: ${current}, 历史数据条数: ${navHistory.length}`)

  // 找到N天前的净值
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() - days)
  console.log(`calculateChange: 目标日期: ${targetDate.toISOString()}`)

  let oldNav = null

  // 从后往前找，找到最接近目标日期的净值
  for (let i = navHistory.length - 1; i >= 0; i--) {
    const itemDate = new Date(navHistory[i].date)
    const itemNav = toFiniteNumber(navHistory[i].nav)
    if (itemDate <= targetDate && itemNav !== null) {
      oldNav = itemNav
      console.log(`calculateChange: 找到历史净值: ${oldNav}, 日期: ${navHistory[i].date}`)
      break
    }
  }

  if (oldNav === null) return null

  if (oldNav && oldNav > 0) {
    const change = ((current - oldNav) / oldNav * 100).toFixed(2)
    console.log(`calculateChange: 计算涨跌幅: ${change}%`)
    return change
  }

  console.log(`calculateChange: 无法计算涨跌幅`)
  return null
}

/**
 * 获取所有自选基金列表
 */
app.get('/api/funds', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id

    // 尝试从缓存获取
    const cacheKey = `funds:${userId}`
    const cached = fundCache.get(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    // 从数据库获取用户的自选基金
    const watchlist = watchlistRepo.findByUserId(userId)
    let fundCodes = watchlist.map(w => w.fund_code)

    // 如果用户没有自选基金，为其添加默认基金列表
    if (fundCodes.length === 0) {
      // 为新用户添加默认基金
      for (const code of DEFAULT_FUNDS) {
        watchlistRepo.add(userId, code)
      }
      fundCodes = DEFAULT_FUNDS
    }

    const funds = []

    for (const code of fundCodes) {
      // 尝试从缓存获取单个基金
      const fundCacheKey = `fund:${code}`
      let estimate = fundCache.get(fundCacheKey)

      if (!estimate) {
        estimate = await getFundEstimate(code)
        if (estimate) {
          fundCache.set(fundCacheKey, estimate, 2 * 60 * 1000) // 2分钟缓存
        }
      }

      if (estimate) {
        // 获取基金详情和历史净值
        const [detail, navHistory] = await Promise.all([
          getFundDetail(code),
          getFundNavHistory(code, 365)
        ])

        let weekChange = null
        let monthChange = null
        let yearChange = null
        let dayChange = toFiniteNumber(estimate.lastChange)

        try {
          if (navHistory && navHistory.length > 0) {
            weekChange = calculateChange(navHistory, estimate.nav, 7)
            monthChange = calculateChange(navHistory, estimate.nav, 30)
            yearChange = calculateChange(navHistory, estimate.nav, 365)
            if (dayChange === null) {
              dayChange = getLatestHistoryChange(navHistory)
            }
          }
        } catch (error) {
          console.error(`计算基金 ${code} 涨跌幅失败:`, error.message)
        }

        funds.push({
          code: estimate.code,
          name: estimate.name || detail?.name || code,
          manager: detail?.manager || '',
          nav: estimate.nav,
          estimateNav: estimate.estimateNav,
          estimateChange: estimate.estimateChange,
          navDate: estimate.navDate,
          estimateTime: estimate.estimateTime,
          dayChange,
          weekChange: weekChange,
          monthChange: monthChange,
          yearChange: yearChange,
          type: '混合型',
          rank: 0,
          rankTotal: 0
        })
      }
    }

    // 缓存结果
    fundCache.set(cacheKey, funds, 1 * 60 * 1000) // 1分钟缓存

    res.json(funds)
  } catch (error) {
    console.error('获取基金列表失败:', error)
    res.status(500).json({ error: '获取基金列表失败' })
  }
})

/**
 * 获取用户自选基金列表
 */
app.get('/api/funds/watchlist', authMiddleware, (req, res) => {
  const userId = req.user.id
  const watchlist = watchlistRepo.findByUserId(userId)
  const fundCodes = watchlist.map(w => w.fund_code)
  res.json({ watchlist: fundCodes })
})

/**
 * 添加自选基金
 */
app.post('/api/funds/watchlist', authMiddleware, async (req, res) => {
  const { code } = req.body
  const userId = req.user.id

  if (!code) {
    return res.status(400).json({ error: '请提供基金代码' })
  }

  // 验证基金是否存在
  const estimate = await getFundEstimate(code)
  if (!estimate) {
    return res.status(404).json({ error: '基金不存在' })
  }

  watchlistRepo.add(userId, code)

  // 失效该用户的基金列表缓存
  fundCache.delete(`funds:${userId}`)

  const watchlist = watchlistRepo.findByUserId(userId)
  const fundCodes = watchlist.map(w => w.fund_code)
  res.json({ success: true, message: '添加成功', watchlist: fundCodes })
})

/**
 * 删除自选基金
 */
app.delete('/api/funds/watchlist/:code', authMiddleware, (req, res) => {
  const { code } = req.params
  const userId = req.user.id

  watchlistRepo.remove(userId, code)

  // 失效该用户的基金列表缓存
  fundCache.delete(`funds:${userId}`)

  const watchlist = watchlistRepo.findByUserId(userId)
  const fundCodes = watchlist.map(w => w.fund_code)
  res.json({ success: true, message: '删除成功', watchlist: fundCodes })
})

/**
 * 获取单个基金详情
 */
app.get('/api/funds/:code', async (req, res) => {
  const { code } = req.params

  try {
    const [estimate, detail, navHistory] = await Promise.all([
      getFundEstimate(code),
      getFundDetail(code),
      getFundNavHistory(code, 365)
    ])

    if (!estimate) {
      return res.status(404).json({ error: '基金未找到' })
    }

    console.log(`基金 ${code} 详情:`, {
      estimateNav: estimate.nav,
      navHistoryLength: navHistory?.length || 0
    })

    let weekChange = null
    let monthChange = null
    let yearChange = null
    let dayChange = toFiniteNumber(estimate.lastChange)

    if (navHistory && navHistory.length > 0) {
      console.log(`开始计算涨跌幅, 历史数据条数: ${navHistory.length}`)
      weekChange = calculateChange(navHistory, estimate.nav, 7)
      monthChange = calculateChange(navHistory, estimate.nav, 30)
      yearChange = calculateChange(navHistory, estimate.nav, 365)
      if (dayChange === null) {
        dayChange = getLatestHistoryChange(navHistory)
      }
      console.log(`计算结果: weekChange=${weekChange}, monthChange=${monthChange}, yearChange=${yearChange}`)
    } else {
      console.log(`历史数据为空, 跳过涨跌幅计算`)
    }

    const fund = {
      code: estimate.code,
      name: estimate.name || detail?.name,
      manager: detail?.manager || '',
      nav: estimate.nav,
      estimateNav: estimate.estimateNav,
      estimateChange: estimate.estimateChange,
      navDate: estimate.navDate,
      estimateTime: estimate.estimateTime,
      dayChange,
      weekChange: weekChange,
      monthChange: monthChange,
      yearChange: yearChange,
      type: '混合型',
      navHistory: navHistory.slice(0, 30)
    }

    res.json(fund)
  } catch (error) {
    console.error(`获取基金 ${code} 详情失败:`, error)
    res.status(500).json({ error: '获取基金详情失败' })
  }
})

/**
 * 获取基金持仓
 */
app.get('/api/funds/:code/holdings', async (req, res) => {
  const { code } = req.params

  try {
    // 尝试从缓存获取
    const cacheKey = `holdings:${code}`
    const cached = holdingsCache.get(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    const holdings = await getFundHoldings(code)

    // 获取持仓股票的实时价格
    const stockCodes = holdings.map(h => h.code)
    const prices = await getBatchStockPrices(stockCodes)

    // 合并持仓和价格数据
    const holdingsWithPrice = holdings.map(holding => {
      const priceData = prices.find(p => p.code === holding.code)
      return {
        ...holding,
        price: priceData?.price || 0,
        change: priceData?.change || 0,
        pe: priceData?.pe || 0,
        pb: priceData?.pb || 0
      }
    })

    // 缓存结果（持仓数据变化不频繁）
    holdingsCache.set(cacheKey, holdingsWithPrice, 30 * 60 * 1000) // 30分钟缓存

    res.json(holdingsWithPrice)
  } catch (error) {
    console.error(`获取基金 ${code} 持仓失败:`, error)
    res.status(500).json({ error: '获取基金持仓失败' })
  }
})

/**
 * 获取股票实时价格
 */
app.get('/api/stocks/:code/price', async (req, res) => {
  const { code } = req.params

  try {
    const price = await getStockPrice(code)
    if (price) {
      res.json(price)
    } else {
      res.status(404).json({ error: '股票未找到' })
    }
  } catch (error) {
    console.error(`获取股票 ${code} 价格失败:`, error)
    res.status(500).json({ error: '获取股票价格失败' })
  }
})

/**
 * 获取基准指数数据（实时）
 * 支持 ?refresh=true 参数强制刷新
 */
app.get('/api/benchmark', async (req, res) => {
  try {
    const { refresh } = req.query
    const cacheKey = 'benchmark'

    // 如果不是强制刷新，尝试从缓存获取
    if (refresh !== 'true') {
      const cached = fundCache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }
    }

    // 获取实时指数数据
    const result = await getBatchIndexQuotes()

    // 缓存结果（2分钟）
    fundCache.set(cacheKey, result, 2 * 60 * 1000)

    res.json(result)
  } catch (error) {
    console.error('获取基准指数失败:', error)
    res.status(500).json({ error: '获取基准指数失败' })
  }
})

/**
 * 获取基金历史净值
 */
app.get('/api/funds/:code/nav-history', async (req, res) => {
  const { code } = req.params
  const { days = 30 } = req.query

  try {
    const history = await getFundNavHistory(code, parseInt(days))
    res.json(history)
  } catch (error) {
    console.error(`获取基金 ${code} 历史净值失败:`, error)
    res.status(500).json({ error: '获取历史净值失败' })
  }
})

// ==================== 复盘笔记 API ====================

/**
 * 获取当前用户的所有笔记
 */
app.get('/api/notes', authMiddleware, (req, res) => {
  const userId = req.user.id
  const notes = noteRepo.findAll(userId)
  res.json(notes)
})

/**
 * 创建笔记
 */
app.post('/api/notes', authMiddleware, validate(commonSchemas.createNote), (req, res) => {
  const userId = req.user.id
  const note = noteRepo.create({
    ...req.body,
    userId
  })
  res.status(201).json(note)
})

/**
 * 更新笔记
 */
app.put('/api/notes/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id)
  const userId = req.user.id

  // 检查笔记是否存在且属于当前用户
  const existing = noteRepo.findById(id)
  if (!existing) {
    return res.status(404).json({ error: '笔记未找到' })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: '无权修改此笔记' })
  }

  const updated = noteRepo.update(id, req.body)
  res.json(updated)
})

/**
 * 删除笔记
 */
app.delete('/api/notes/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id)
  const userId = req.user.id

  // 检查笔记是否存在且属于当前用户
  const existing = noteRepo.findById(id)
  if (!existing) {
    return res.status(404).json({ error: '笔记未找到' })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: '无权删除此笔记' })
  }

  noteRepo.delete(id)
  res.json({ success: true })
})

// ==================== 数据导出 API ====================

/**
 * CSV 字段转义（RFC 4180）
 * 如果字段包含逗号、双引号或换行，用双引号包裹并将内部双引号转义为两个双引号
 */
function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * 导出基金数据为 CSV
 */
app.get('/api/export/funds', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const watchlist = watchlistRepo.findByUserId(userId)
    const fundCodes = watchlist.map(w => w.fund_code)

    const funds = []

    for (const code of fundCodes) {
      const estimate = await getFundEstimate(code)
      if (estimate) {
        funds.push(estimate)
      }
    }

    // 生成 CSV
    const headers = ['基金代码', '基金名称', '当前净值', '估算净值', '估算涨跌%', '净值日期']
    const rows = funds.map(f => [
      f.code,
      f.name,
      f.nav,
      f.estimateNav,
      f.estimateChange,
      f.navDate
    ])

    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map(r => r.map(csvEscape).join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=funds.csv')
    res.send('﻿' + csv) // 添加 BOM 支持中文
  } catch (error) {
    console.error('导出失败:', error)
    res.status(500).json({ error: '导出失败' })
  }
})

/**
 * 导出持仓数据为 CSV
 */
app.get('/api/export/holdings/:code', async (req, res) => {
  const { code } = req.params

  try {
    const holdings = await getFundHoldings(code)
    const stockCodes = holdings.map(h => h.code)
    const prices = await getBatchStockPrices(stockCodes)

    const holdingsWithPrice = holdings.map(holding => {
      const priceData = prices.find(p => p.code === holding.code)
      return {
        ...holding,
        price: priceData?.price || 0,
        change: priceData?.change || 0,
        pe: priceData?.pe || 0
      }
    })

    // 生成 CSV
    const headers = ['股票代码', '股票名称', '持仓占比%', '当前价格', '涨跌%', '市盈率PE']
    const rows = holdingsWithPrice.map(h => [
      h.code,
      h.name,
      h.weight,
      h.price,
      h.change,
      h.pe
    ])

    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map(r => r.map(csvEscape).join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=holdings_${code}.csv`)
    res.send('﻿' + csv)
  } catch (error) {
    console.error('导出失败:', error)
    res.status(500).json({ error: '导出失败' })
  }
})

/**
 * 导出复盘笔记为 CSV
 */
app.get('/api/export/notes', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id
    const notes = noteRepo.findAll(userId)

    const headers = ['日期', '基金代码', '基金名称', '操作类型', '买入理由', '预期收益%', '止损%', '持有周期', '实际收益%', '状态', '标签']
    const rows = notes.map(n => [
      n.date,
      n.fund_code,
      n.fund_name,
      n.type === 'buy' ? '买入' : '卖出',
      n.reason,
      n.expected_return,
      n.stop_loss,
      n.holding_period,
      n.actual_return,
      n.status,
      n.tags.join(' ')
    ])

    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map(r => r.map(csvEscape).join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=notes.csv')
    res.send('﻿' + csv)
  } catch (error) {
    console.error('导出失败:', error)
    res.status(500).json({ error: '导出失败' })
  }
})

// ==================== 健康检查 ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: {
      funds: fundCache.getStats(),
      stocks: stockCache.getStats(),
      holdings: holdingsCache.getStats(),
      navHistory: navHistoryCache.getStats()
    }
  })
})

// ==================== 缓存管理 ====================

/**
 * 获取缓存统计
 */
app.get('/api/cache/stats', authMiddleware, (req, res) => {
  res.json({
    funds: fundCache.getStats(),
    stocks: stockCache.getStats(),
    holdings: holdingsCache.getStats(),
    navHistory: navHistoryCache.getStats()
  })
})

/**
 * 清除指定基金缓存
 */
app.delete('/api/cache/funds/:code', authMiddleware, (req, res) => {
  const { code } = req.params
  clearFundCache(code)
  res.json({ success: true, message: `已清除基金 ${code} 的缓存` })
})

/**
 * 清除所有缓存
 */
app.delete('/api/cache/all', authMiddleware, requireRole('admin'), (req, res) => {
  clearAllCache()
  res.json({ success: true, message: '已清除所有缓存' })
})

// ==================== 通知管理 ====================

/**
 * 获取通知渠道列表
 */
app.get('/api/notifications/channels', authMiddleware, (req, res) => {
  const channels = notificationManager.getChannels()
  res.json({ channels })
})

app.get('/api/notifications/rules/defaults', authMiddleware, (req, res) => {
  res.json({
    rules: DEFAULT_ALERT_RULES,
    templates: DEFAULT_NOTIFICATION_TEMPLATES
  })
})

/**
 * 添加通知渠道
 */
app.post('/api/notifications/channels', authMiddleware, (req, res) => {
  const { id, type, ...config } = req.body

  if (!id || !type) {
    return res.status(400).json({ error: '请提供渠道ID和类型' })
  }

  notificationManager.registerChannel(id, { type, enabled: true, ...config })
  res.json({ success: true, message: '通知渠道添加成功' })
})

/**
 * 删除通知渠道
 */
app.delete('/api/notifications/channels/:id', authMiddleware, (req, res) => {
  const { id } = req.params
  notificationManager.removeChannel(id)
  res.json({ success: true, message: '通知渠道删除成功' })
})

/**
 * 获取通知历史
 */
app.get('/api/notifications/history', authMiddleware, (req, res) => {
  const { limit = 50 } = req.query
  const history = notificationManager.getHistory(parseInt(limit))
  res.json({ history })
})

/**
 * 测试通知
 */
app.post('/api/notifications/test', authMiddleware, async (req, res) => {
  const { channelId } = req.body

  const testAlert = {
    title: '测试通知',
    content: '这是一条测试通知，如果您收到此消息，说明通知配置正确。',
    level: 'info'
  }

  const results = await notificationManager.send(testAlert)
  res.json({ results })
})

// ==================== 定时任务 ====================

// 每5分钟更新缓存（交易时间内）
cron.schedule('*/5 * * * *', async () => {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const day = now.getDay()

  // 交易日 9:30-15:00 才更新
  if (day >= 1 && day <= 5 && ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 15))) {
    console.log('📊 更新基金数据缓存...')

    // 获取所有用户的自选基金（去重）
    const allFundCodes = watchlistRepo.findAllFundCodes()

    for (const code of allFundCodes) {
      try {
        const estimate = await getFundEstimate(code)
        if (estimate) {
          cache.funds[code] = estimate
        }
      } catch (error) {
        console.error(`更新基金 ${code} 失败:`, error.message)
      }
    }

    cache.lastUpdate = new Date().toISOString()
    console.log('✅ 缓存更新完成')
  }
})

// ==================== 错误处理中间件 ====================

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

// 404 处理（放在所有路由之后）
app.use(notFoundHandler)

// 全局错误处理
app.use(errorHandler)

// ==================== 启动服务器 ====================

server.listen(PORT, () => {
  console.log(`🚀 基金监控后端服务运行在 http://localhost:${PORT}`)
  console.log(`📡 WebSocket 服务运行在 ws://localhost:${PORT}`)
  console.log(`📊 API 文档:`)
  console.log(`   GET    /api/funds                    - 获取所有自选基金`)
  console.log(`   GET    /api/funds/search?keyword=xxx  - 搜索基金`)
  console.log(`   GET    /api/funds/:code               - 获取单个基金详情`)
  console.log(`   GET    /api/funds/:code/holdings      - 获取基金持仓`)
  console.log(`   GET    /api/funds/:code/nav-history   - 获取历史净值`)
  console.log(`   POST   /api/funds/watchlist           - 添加自选基金`)
  console.log(`   DELETE /api/funds/watchlist/:code      - 删除自选基金`)
  console.log(`   GET    /api/stocks/:code/price        - 获取股票实时价格`)
  console.log(`   GET    /api/benchmark                 - 获取基准指数`)
  console.log(`   GET    /api/notes                     - 获取复盘笔记`)
  console.log(`   POST   /api/notes                     - 创建复盘笔记`)
  console.log(`   GET    /api/export/funds              - 导出基金数据`)
  console.log(`   GET    /api/export/holdings/:code     - 导出持仓数据`)
  console.log(`   GET    /api/export/notes              - 导出复盘笔记`)
  console.log(`   GET    /api/health                    - 健康检查`)
})
