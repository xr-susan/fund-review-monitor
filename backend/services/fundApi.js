import axios from 'axios'

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

export async function requestFirstAvailable(providers, options = {}) {
  const {
    isValid = value => value !== null && value !== undefined,
    defaultValue = null,
    logger = console
  } = options

  const errors = []

  for (const provider of providers) {
    try {
      const value = await provider.fetch()
      if (isValid(value)) {
        return {
          data: value,
          provider: provider.name,
          errors
        }
      }
      errors.push({ provider: provider.name, error: 'empty response' })
    } catch (error) {
      errors.push({ provider: provider.name, error: error.message })
      logger.warn?.(`Data provider failed: ${provider.name}`, error.message)
    }
  }

  return {
    data: defaultValue,
    provider: null,
    errors
  }
}

// 天天基金 / 东方财富 API 接口

/**
 * 获取基金实时估值
 * @param {string} fundCode - 基金代码
 */
export async function getFundEstimate(fundCode) {
  try {
    const url = `http://fundgz.1234567.com.cn/js/${fundCode}.js`
    const response = await axios.get(url, {
      headers: {
        'Referer': 'http://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    // 解析 JSONP 响应
    const jsonStr = response.data.replace(/^jsonpgz\(/, '').replace(/\);$/, '')
    const data = JSON.parse(jsonStr)

    return {
      code: data.fundcode,
      name: data.name,
      nav: parseFloat(data.dwjz),        // 单位净值
      estimateNav: parseFloat(data.gsz),  // 估算净值
      estimateChange: parseFloat(data.gszzl), // 估算涨跌幅
      navDate: data.jzrq,                // 净值日期
      estimateTime: data.gztime,         // 估算时间
      lastNav: parseFloat(data.dwjz),
      lastChange: parseFloat(data.jzzl)  // 上一交易日涨跌幅
    }
  } catch (error) {
    console.error(`获取基金 ${fundCode} 估值失败:`, error.message)
    const fallbackHistory = await getFundNavHistory(fundCode, 1)
    const latest = fallbackHistory[0]
    if (!latest) return null

    return {
      code: fundCode,
      name: '',
      nav: latest.nav,
      estimateNav: latest.nav,
      estimateChange: latest.change || 0,
      navDate: latest.date,
      estimateTime: new Date().toISOString(),
      lastNav: latest.nav,
      lastChange: latest.change || 0,
      dataSource: 'nav-history-fallback'
    }
  }
}

/**
 * 获取基金历史净值
 * @param {string} fundCode - 基金代码
 * @param {number} pageSize - 获取条数
 */
export async function getFundNavHistory(fundCode, pageSize = 30) {
  try {
    // 使用东方财富另一个 API 端点
    const url = `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js`
    const response = await axios.get(url, {
      headers: {
        'Referer': 'http://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    const content = response.data

    // 提取历史净值数据 - Data_netWorthTrend
    const navMatch = content.match(/Data_netWorthTrend\s*=\s*(\[.*?\])\s*;/s)
    if (navMatch) {
      try {
        const navData = JSON.parse(navMatch[1])
        const result = navData.slice(-pageSize).map(item => ({
          date: new Date(item.x).toISOString().split('T')[0],
          nav: item.y,
          totalNav: item.equityReturn || item.y,
          change: item.equityReturn || 0
        }))
        console.log(`获取基金 ${fundCode} 历史净值成功: ${result.length} 条`)
        return result
      } catch (e) {
        console.error(`解析历史净值数据失败:`, e.message)
      }
    }

    console.log(`获取基金 ${fundCode} 历史净值: 未找到有效数据`)
    return []
  } catch (error) {
    console.error(`获取基金 ${fundCode} 历史净值失败:`, error.message)
    return []
  }
}

/**
 * 获取基金详细信息
 * @param {string} fundCode - 基金代码
 */
export async function getFundDetail(fundCode) {
  try {
    const url = `http://fund.eastmoney.com/pingzhongdata/${fundCode}.js`
    const response = await axios.get(url, {
      headers: {
        'Referer': 'http://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    // 解析基金详细数据
    const content = response.data

    // 提取基金名称
    const nameMatch = content.match(/fS_name\s*=\s*"([^"]+)"/)
    const codeMatch = content.match(/fS_code\s*=\s*"([^"]+)"/)

    // 提取基金经理（使用更宽松的正则）
    let manager = ''
    try {
      const managerMatch = content.match(/Data_currentFundManager\s*=\s*(\[[\s\S]*?\])\s*;/)
      if (managerMatch && managerMatch[1]) {
        // 清理JSON字符串
        const jsonStr = managerMatch[1].replace(/\n/g, '').replace(/\s+/g, ' ')
        const managerData = JSON.parse(jsonStr)
        if (Array.isArray(managerData) && managerData.length > 0) {
          manager = managerData[0]?.name || ''
        }
      }
    } catch (e) {
      // 忽略解析错误
    }

    // 提取持仓数据
    const stockCodesMatch = content.match(/stockCodes\s*=\s*"([^"]+)"/)

    return {
      code: codeMatch ? codeMatch[1] : fundCode,
      name: nameMatch ? nameMatch[1] : '',
      manager: manager,
      stockCodes: stockCodesMatch ? stockCodesMatch[1] : ''
    }
  } catch (error) {
    console.error(`获取基金 ${fundCode} 详情失败:`, error.message)
    return null
  }
}

/**
 * 获取基金持仓数据
 * @param {string} fundCode - 基金代码
 */
export async function getFundHoldings(fundCode) {
  try {
    // 使用东方财富基金持仓接口
    const url = `http://fundf10.eastmoney.com/FundArchivesDatas.aspx`
    const response = await axios.get(url, {
      params: {
        type: 'jjcc',
        code: fundCode,
        topline: 10,
        year: '',
        month: '',
        rt: Math.random()
      },
      headers: {
        'Referer': 'http://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    // 解析持仓数据（HTML格式）
    const content = response.data
    const holdings = []

    // 使用正则提取持仓信息
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi
    const tables = content.match(tableRegex)

    if (tables && tables.length > 0) {
      const rows = tables[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []

      for (let i = 1; i < rows.length && i <= 10; i++) {
        const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
        if (cells.length >= 7) {
          // 解析股票代码（在链接中）
          const codeMatch = cells[1]?.match(/code=(\d+)/)
          const stockCode = codeMatch ? codeMatch[1] : cells[1]?.replace(/<[^>]+>/g, '').trim()

          // 解析股票名称
          const stockName = cells[2]?.replace(/<[^>]+>/g, '').trim()

          // 解析持仓占比（第7列，去掉%号）
          const weightStr = cells[6]?.replace(/<[^>]+>/g, '').trim().replace('%', '')
          const weight = parseFloat(weightStr) || 0

          if (stockCode && stockName) {
            holdings.push({
              code: stockCode,
              name: stockName,
              weight: weight
            })
          }
        }
      }
    }

    return holdings
  } catch (error) {
    console.error(`获取基金 ${fundCode} 持仓失败:`, error.message)
    return []
  }
}

/**
 * 获取股票实时价格
 * @param {string} stockCode - 股票代码
 */
export async function getStockPrice(stockCode) {
  const { data } = await requestFirstAvailable([
    {
      name: 'eastmoney-stock',
      fetch: () => getEastmoneyStockPrice(stockCode)
    },
    {
      name: 'sina-stock',
      fetch: () => getSinaStockPrice(stockCode)
    }
  ])

  return data
}

async function getSinaStockPrice(stockCode) {
    // 使用新浪财经 API（更稳定）
    const prefix = stockCode.startsWith('6') ? 'sh' : 'sz'
    const symbol = `${prefix}${stockCode}`

    const url = `http://hq.sinajs.cn/list=${symbol}`
    const response = await axios.get(url, {
      headers: {
        'Referer': 'http://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    // 解析新浪行情数据
    const content = response.data
    const match = content.match(/var hq_str_[^=]+="([^"]+)"/)

    if (match && match[1]) {
      const fields = match[1].split(',')
      if (fields.length >= 32) {
        const yesterdayClose = parseFloat(fields[2]) || 0
        const currentPrice = parseFloat(fields[3]) || 0
        const change = yesterdayClose > 0 ? ((currentPrice - yesterdayClose) / yesterdayClose * 100) : 0

        return {
          code: stockCode,
          name: fields[0] || '',
          price: currentPrice,
          open: parseFloat(fields[1]) || 0,
          high: parseFloat(fields[4]) || 0,
          low: parseFloat(fields[5]) || 0,
          volume: parseFloat(fields[8]) || 0,
          amount: parseFloat(fields[9]) || 0,
          change: parseFloat(change.toFixed(2)),
          changeAmount: parseFloat((currentPrice - yesterdayClose).toFixed(2)),
          yesterdayClose: yesterdayClose,
          pe: null, // 新浪接口不直接提供PE
          pb: null,
          marketCap: 0,
          timestamp: new Date().toISOString(),
          dataSource: 'sina-stock'
        }
      }
    }

    throw new Error('Sina stock quote returned no usable data')
}

async function getEastmoneyStockPrice(stockCode) {
  const candidates = getEastmoneyStockCandidates(stockCode)
  let lastError = null

  for (const candidate of candidates) {
    try {
      const response = await axios.get('https://push2.eastmoney.com/api/qt/stock/get', {
        params: {
          secid: candidate.secid,
          fields: 'f43,f44,f45,f46,f47,f48,f57,f58,f60,f162,f169,f170'
        },
        headers: {
          ...DEFAULT_HEADERS,
          Referer: 'https://quote.eastmoney.com/'
        },
        timeout: 10000
      })

      const quote = response.data?.data
      if (!quote) {
        lastError = new Error(`Eastmoney stock quote returned no usable data for ${candidate.secid}`)
        continue
      }

      const price = normalizeMarketPrice(quote.f43, candidate.priceScale)
      const yesterdayClose = normalizeMarketPrice(quote.f60, candidate.priceScale)
      if (!price || !yesterdayClose) {
        lastError = new Error(`Eastmoney stock quote returned empty price for ${candidate.secid}`)
        continue
      }

      return {
        code: stockCode,
        name: quote.f58 || '',
        price,
        open: normalizeMarketPrice(quote.f46, candidate.priceScale),
        high: normalizeMarketPrice(quote.f44, candidate.priceScale),
        low: normalizeMarketPrice(quote.f45, candidate.priceScale),
        volume: quote.f47 || 0,
        amount: quote.f48 || 0,
        change: normalizeEastmoneyPercent(quote.f170),
        changeAmount: normalizeMarketPrice(quote.f169, candidate.priceScale),
        yesterdayClose,
        pe: normalizeEastmoneyRatio(quote.f162),
        pb: null,
        marketCap: 0,
        timestamp: new Date().toISOString(),
        dataSource: 'eastmoney-stock',
        market: candidate.market
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Eastmoney stock quote returned no usable data')
}

function normalizeEastmoneyPrice(value) {
  if (value === undefined || value === null || value === '-') return 0
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return parseFloat((numeric / 100).toFixed(2))
}

function normalizeMarketPrice(value, scale) {
  if (value === undefined || value === null || value === '-') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return parseFloat((numeric / scale).toFixed(3))
}

function normalizeEastmoneyPercent(value) {
  if (value === undefined || value === null || value === '-') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return parseFloat((numeric / 100).toFixed(2))
}

function normalizeEastmoneyRatio(value) {
  if (value === undefined || value === null || value === '-' || Number(value) <= 0) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return parseFloat((numeric / 100).toFixed(2))
}

function getEastmoneyStockCandidates(stockCode) {
  const code = String(stockCode || '').trim().toUpperCase()

  if (/^\d{5}$/.test(code)) {
    return [
      { secid: `116.${code}`, market: 'HK', priceScale: 10000 },
      { secid: `128.${code}`, market: 'HK', priceScale: 10000 }
    ]
  }

  if (/^[A-Z.]+$/.test(code)) {
    return [
      { secid: `105.${code}`, market: 'US', priceScale: 1000 },
      { secid: `106.${code}`, market: 'US', priceScale: 1000 },
      { secid: `107.${code}`, market: 'US', priceScale: 1000 }
    ]
  }

  return [{
    secid: `${code.startsWith('6') ? '1' : '0'}.${code}`,
    market: code.startsWith('6') ? 'SH' : 'SZ',
    priceScale: 100
  }]
}

/**
 * 批量获取股票价格
 * @param {string[]} stockCodes - 股票代码数组
 */
export async function getBatchStockPrices(stockCodes) {
  try {
    const promises = stockCodes.map(code => getStockPrice(code))
    const results = await Promise.allSettled(promises)

    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
  } catch (error) {
    console.error('批量获取股票价格失败:', error.message)
    return []
  }
}

/**
 * 获取基金排行
 * @param {string} type - 基金类型 (gp:股票型, hh:混合型, zs:指数型, etc.)
 * @param {number} pageSize - 获取条数
 */
export async function getFundRanking(type = 'hh', pageSize = 20) {
  try {
    const url = `http://fund.eastmoney.com/data/rankhandler.aspx`
    const response = await axios.get(url, {
      params: {
        op: 'ph',
        dt: 'kf',
        ft: type,
        rs: '',
        gs: 0,
        sc: '1nzf',
        st: 'desc',
        sd: '2023-01-01',
        ed: '2024-01-01',
        qdii: '',
        tabSubtype: ',,,,,',
        pi: 1,
        pn: pageSize,
        dx: 1,
        v: Math.random()
      },
      headers: {
        'Referer': 'http://fund.eastmoney.com/data/fundranking.html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    // 解析排行数据
    const content = response.data
    const dataMatch = content.match(/var rankData = ({[\s\S]*?});/)

    if (dataMatch) {
      const rankData = JSON.parse(dataMatch[1])
      return rankData.datas.map(item => {
        const fields = item.split(',')
        return {
          code: fields[0],
          name: fields[1],
          type: fields[3],
          nav: parseFloat(fields[4]),
          navDate: fields[5],
          dayChange: parseFloat(fields[6]),
          weekChange: parseFloat(fields[7]),
          monthChange: parseFloat(fields[8]),
          yearChange: parseFloat(fields[11])
        }
      })
    }

    return []
  } catch (error) {
    console.error('获取基金排行失败:', error.message)
    return []
  }
}

/**
 * 获取指数实时行情
 * @param {string} indexCode - 指数代码 (如: 1.000300, 1.000905, 0.399006)
 */
export async function getIndexQuote(indexCode) {
  const { data } = await requestFirstAvailable([
    {
      name: 'tencent-index',
      fetch: () => getTencentIndexQuote(indexCode)
    },
    {
      name: 'eastmoney-index',
      fetch: () => getEastmoneyIndexQuote(indexCode)
    }
  ])

  return data
}

async function getTencentIndexQuote(indexCode) {
    // 使用腾讯财经 API 获取指数数据
    const codeMap = {
      '1.000300': 'sh000300',
      '1.000905': 'sh000905',
      '0.399006': 'sz399006'
    }
    const qqCode = codeMap[indexCode]
    if (!qqCode) return null

    const url = `http://qt.gtimg.cn/q=${qqCode}`
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://finance.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    const content = response.data
    // 解析腾讯财经数据格式
    const match = content.match(/v_[^=]+="([^"]+)"/)
    if (match && match[1]) {
      const fields = match[1].split('~')
      if (fields.length >= 45) {
        const name = fields[1]
        const currentPrice = parseFloat(fields[3]) || 0
        const yesterdayClose = parseFloat(fields[4]) || 0
        const change = parseFloat(fields[32]) || 0

        // 计算年涨跌幅（使用年初价格）
        // 2026年初价格
        const yearStartPrices = {
          '1.000300': 3900, // 沪深300
          '1.000905': 5500, // 中证500
          '0.399006': 2100  // 创业板指
        }
        const yearStartPrice = yearStartPrices[indexCode] || 0
        const yearChange = yearStartPrice > 0 ? ((currentPrice - yearStartPrice) / yearStartPrice * 100) : 0

        return {
          code: indexCode,
          name: name,
          price: currentPrice,
          change: parseFloat(change.toFixed(2)),
          yearChange: parseFloat(yearChange.toFixed(2)),
          open: parseFloat(fields[5]) || 0,
          high: parseFloat(fields[33]) || 0,
          low: parseFloat(fields[34]) || 0,
          yesterdayClose: yesterdayClose
        }
      }
    }

    throw new Error('Tencent index quote returned no usable data')
}

async function getEastmoneyIndexQuote(indexCode) {
  const secid = indexCode
  const response = await axios.get('https://push2.eastmoney.com/api/qt/stock/get', {
    params: {
      secid,
      fields: 'f43,f44,f45,f46,f57,f58,f60,f169,f170'
    },
    headers: {
      ...DEFAULT_HEADERS,
      Referer: 'https://quote.eastmoney.com/'
    },
    timeout: 10000
  })

  const quote = response.data?.data
  if (!quote) {
    throw new Error('Eastmoney index quote returned no usable data')
  }

  const price = normalizeEastmoneyPrice(quote.f43)
  const yearStartPrices = {
    '1.000300': 3900,
    '1.000905': 5500,
    '0.399006': 2100
  }
  const yearStartPrice = yearStartPrices[indexCode] || 0
  const yearChange = yearStartPrice > 0 ? ((price - yearStartPrice) / yearStartPrice * 100) : 0

  return {
    code: indexCode,
    name: quote.f58 || '',
    price,
    change: normalizeEastmoneyPrice(quote.f170),
    yearChange: parseFloat(yearChange.toFixed(2)),
    open: normalizeEastmoneyPrice(quote.f46),
    high: normalizeEastmoneyPrice(quote.f44),
    low: normalizeEastmoneyPrice(quote.f45),
    yesterdayClose: normalizeEastmoneyPrice(quote.f60),
    dataSource: 'eastmoney-index'
  }
}

/**
 * 批量获取指数行情
 */
export async function getBatchIndexQuotes() {
  const indices = [
    { key: 'hs300', code: '1.000300', name: '沪深300' },
    { key: 'zz500', code: '1.000905', name: '中证500' },
    { key: 'cyb', code: '0.399006', name: '创业板指' }
  ]

  const result = {}

  // 并行获取所有指数
  const promises = indices.map(async (index) => {
    try {
      const quote = await getIndexQuote(index.code)
      if (quote) {
        return {
          key: index.key,
          data: {
            name: index.name,
            code: index.code,
            price: quote.price,
            change: quote.change,
            yearChange: quote.yearChange
          }
        }
      }
      return {
        key: index.key,
        data: {
          name: index.name,
          code: index.code,
          change: 0,
          yearChange: 0
        }
      }
    } catch (error) {
      console.error(`获取 ${index.name} 行情失败:`, error.message)
      return {
        key: index.key,
        data: {
          name: index.name,
          code: index.code,
          change: 0,
          yearChange: 0
        }
      }
    }
  })

  const results = await Promise.all(promises)
  results.forEach(r => {
    result[r.key] = r.data
  })

  return result
}

/**
 * 搜索基金
 * @param {string} keyword - 搜索关键词
 */
export async function searchFund(keyword) {
  const { data } = await requestFirstAvailable([
    {
      name: 'eastmoney-suggest',
      fetch: () => searchFundFromSuggest(keyword)
    },
    {
      name: 'eastmoney-fundcode',
      fetch: () => searchFundFromFundCode(keyword)
    }
  ], {
    defaultValue: [],
    isValid: value => Array.isArray(value) && value.length > 0
  })

  return data
}

async function searchFundFromSuggest(keyword) {
    // 使用东方财富的基金搜索 API
    const url = `http://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx`
    const response = await axios.get(url, {
      params: {
        m: 1,
        key: keyword,
        _: Date.now()
      },
      headers: {
        'Referer': 'http://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    if (response.data && response.data.Datas && response.data.Datas.length > 0) {
      return response.data.Datas.map(item => ({
        code: item.CODE,
        name: item.NAME,
        type: item.FundBaseInfo?.FTYPE || '',
        pinyin: item.JPCODE
      }))
    }

    throw new Error('Eastmoney suggest returned no results')
}

async function searchFundFromFundCode(keyword) {
    // 如果东方财富 API 返回空，尝试使用天天基金的搜索 API
    const ttjjUrl = `http://fund.eastmoney.com/js/fundcode_search.js`
    const ttjjResponse = await axios.get(ttjjUrl, {
      headers: {
        'Referer': 'http://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    // 解析天天基金的搜索数据
    const content = ttjjResponse.data
    const match = content.match(/var r = (\[.*?\])/s)
    if (match) {
      const allFunds = JSON.parse(match[1])
      const results = allFunds
        .filter(fund => {
          const code = fund[0] || ''
          const name = fund[2] || ''
          const pinyin = fund[1] || ''
          return code.includes(keyword) ||
                 name.includes(keyword) ||
                 pinyin.toLowerCase().includes(keyword.toLowerCase())
        })
        .slice(0, 20) // 限制返回数量
        .map(fund => ({
          code: fund[0],
          name: fund[2],
          type: fund[3] || '',
          pinyin: fund[1]
        }))

      return results
    }

    throw new Error('Fund code search returned no results')
}
