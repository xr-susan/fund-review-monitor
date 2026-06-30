/**
 * 技术指标计算工具
 */

/**
 * 计算移动平均线 (MA)
 * @param {number[]} data - 数据数组
 * @param {number} period - 周期
 */
export function calculateMA(data, period) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
  }
  return result
}

/**
 * 计算指数移动平均线 (EMA)
 * @param {number[]} data - 数据数组
 * @param {number} period - 周期
 */
export function calculateEMA(data, period) {
  const result = []
  const multiplier = 2 / (period + 1)

  // 第一个值使用 SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      result.push(ema)
    } else {
      ema = (data[i] - ema) * multiplier + ema
      result.push(ema)
    }
  }
  return result
}

/**
 * 计算相对强弱指数 (RSI)
 * @param {number[]} data - 价格数据
 * @param {number} period - 周期（默认14）
 */
export function calculateRSI(data, period = 14) {
  const result = []
  const gains = []
  const losses = []

  // 计算涨跌
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // 计算 RSI
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null)
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period

      if (avgLoss === 0) {
        result.push(100)
      } else {
        const rs = avgGain / avgLoss
        result.push(100 - (100 / (1 + rs)))
      }
    }
  }
  return result
}

/**
 * 计算 MACD
 * @param {number[]} data - 价格数据
 * @param {number} fastPeriod - 快线周期（默认12）
 * @param {number} slowPeriod - 慢线周期（默认26）
 * @param {number} signalPeriod - 信号线周期（默认9）
 */
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)

  // DIF = 快线 - 慢线
  const dif = []
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      dif.push(null)
    } else {
      dif.push(fastEMA[i] - slowEMA[i])
    }
  }

  // DEA = DIF 的 EMA
  const validDif = dif.filter(d => d !== null)
  const dea = calculateEMA(validDif, signalPeriod)

  // 补齐长度
  const deaResult = []
  let deaIndex = 0
  for (let i = 0; i < data.length; i++) {
    if (dif[i] === null) {
      deaResult.push(null)
    } else {
      deaResult.push(dea[deaIndex] || null)
      deaIndex++
    }
  }

  // MACD 柱 = (DIF - DEA) * 2
  const macd = []
  for (let i = 0; i < data.length; i++) {
    if (dif[i] === null || deaResult[i] === null) {
      macd.push(null)
    } else {
      macd.push((dif[i] - deaResult[i]) * 2)
    }
  }

  return { dif, dea: deaResult, macd }
}

/**
 * 计算布林带 (Bollinger Bands)
 * @param {number[]} data - 价格数据
 * @param {number} period - 周期（默认20）
 * @param {number} stdDev - 标准差倍数（默认2）
 */
export function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const middle = calculateMA(data, period)
  const upper = []
  const lower = []

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null)
      lower.push(null)
    } else {
      const slice = data.slice(i - period + 1, i + 1)
      const mean = middle[i]
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)

      upper.push(mean + stdDev * standardDeviation)
      lower.push(mean - stdDev * standardDeviation)
    }
  }

  return { upper, middle, lower }
}

/**
 * 计算随机指标 (KDJ)
 * @param {number[]} high - 最高价
 * @param {number[]} low - 最低价
 * @param {number[]} close - 收盘价
 * @param {number} period - 周期（默认9）
 */
export function calculateKDJ(high, low, close, period = 9) {
  const k = []
  const d = []
  const j = []

  let prevK = 50
  let prevD = 50

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      k.push(null)
      d.push(null)
      j.push(null)
    } else {
      const highSlice = high.slice(i - period + 1, i + 1)
      const lowSlice = low.slice(i - period + 1, i + 1)

      const highestHigh = Math.max(...highSlice)
      const lowestLow = Math.min(...lowSlice)

      const rsv = highestHigh === lowestLow ? 50 : ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100

      const currentK = (2 / 3) * prevK + (1 / 3) * rsv
      const currentD = (2 / 3) * prevD + (1 / 3) * currentK
      const currentJ = 3 * currentK - 2 * currentD

      k.push(currentK)
      d.push(currentD)
      j.push(currentJ)

      prevK = currentK
      prevD = currentD
    }
  }

  return { k, d, j }
}

/**
 * 计算收益率
 * @param {number[]} navData - 净值数据
 */
export function calculateReturns(navData) {
  const returns = []
  for (let i = 1; i < navData.length; i++) {
    returns.push((navData[i] - navData[i - 1]) / navData[i - 1] * 100)
  }
  return returns
}

/**
 * 计算波动率（年化标准差）
 * @param {number[]} returns - 收益率数据
 */
export function calculateVolatility(returns) {
  if (returns.length === 0) return 0

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const dailyVolatility = Math.sqrt(variance)

  // 年化（假设252个交易日）
  return dailyVolatility * Math.sqrt(252)
}

/**
 * 计算夏普比率
 * @param {number} annualReturn - 年化收益率
 * @param {number} volatility - 波动率
 * @param {number} riskFreeRate - 无风险利率（默认3%）
 */
export function calculateSharpeRatio(annualReturn, volatility, riskFreeRate = 3) {
  if (volatility === 0) return 0
  return (annualReturn - riskFreeRate) / volatility
}

/**
 * 计算最大回撤
 * @param {number[]} navData - 净值数据
 */
export function calculateMaxDrawdown(navData) {
  let maxDrawdown = 0
  let peak = navData[0]

  for (let i = 1; i < navData.length; i++) {
    if (navData[i] > peak) {
      peak = navData[i]
    }
    const drawdown = (peak - navData[i]) / peak
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return maxDrawdown * 100
}

/**
 * 计算信息比率
 * @param {number[]} fundReturns - 基金收益率
 * @param {number[]} benchmarkReturns - 基准收益率
 */
export function calculateInformationRatio(fundReturns, benchmarkReturns) {
  if (fundReturns.length !== benchmarkReturns.length || fundReturns.length === 0) return 0

  const excessReturns = fundReturns.map((r, i) => r - benchmarkReturns[i])
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length
  const trackingError = calculateVolatility(excessReturns)

  if (trackingError === 0) return 0
  return meanExcess / trackingError
}

/**
 * 计算持仓集中度
 * @param {object[]} holdings - 持仓数据
 * @param {number} topN - 前N大持仓
 */
export function calculateConcentration(holdings, topN = 10) {
  if (!holdings || holdings.length === 0) return 0

  const sorted = [...holdings].sort((a, b) => b.weight - a.weight)
  const topHoldings = sorted.slice(0, topN)

  return topHoldings.reduce((sum, h) => sum + h.weight, 0)
}

/**
 * 计算行业集中度
 * @param {object[]} holdings - 持仓数据（需要包含industry字段）
 */
export function calculateIndustryConcentration(holdings) {
  if (!holdings || holdings.length === 0) return 0

  const industryWeights = {}
  holdings.forEach(h => {
    const industry = h.industry || '其他'
    industryWeights[industry] = (industryWeights[industry] || 0) + h.weight
  })

  const maxWeight = Math.max(...Object.values(industryWeights))
  return maxWeight
}
