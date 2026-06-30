/**
 * 格式化数字为百分比
 */
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '--'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * 格式化金额
 */
export const formatCurrency = (value, currency = 'CNY') => {
  if (value === null || value === undefined) return '--'

  if (currency === 'CNY') {
    if (value >= 100000000) {
      return `¥${(value / 100000000).toFixed(2)}亿`
    } else if (value >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`
    }
    return `¥${value.toFixed(2)}`
  }

  return value.toFixed(2)
}

/**
 * 格式化日期
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '--'

  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 计算涨跌颜色类名
 */
export const getChangeColor = (value) => {
  if (value > 0) return 'text-stock-up'
  if (value < 0) return 'text-stock-down'
  return 'text-stock-flat'
}

/**
 * 计算风险等级
 */
export const getRiskLevel = (maxDrawdown) => {
  if (maxDrawdown > -10) return { level: '低风险', color: 'text-green-400' }
  if (maxDrawdown > -20) return { level: '中风险', color: 'text-yellow-400' }
  if (maxDrawdown > -30) return { level: '高风险', color: 'text-orange-400' }
  return { level: '极高风险', color: 'text-red-400' }
}

/**
 * 计算排名百分位
 */
export const getRankPercentile = (rank, total) => {
  if (!rank || !total) return null
  return ((rank / total) * 100).toFixed(0)
}

/**
 * 获取排名等级
 */
export const getRankGrade = (percentile) => {
  if (percentile <= 10) return { grade: '优秀', color: 'text-green-400', bg: 'bg-green-600/20' }
  if (percentile <= 25) return { grade: '良好', color: 'text-blue-400', bg: 'bg-blue-600/20' }
  if (percentile <= 50) return { grade: '中等', color: 'text-yellow-400', bg: 'bg-yellow-600/20' }
  if (percentile <= 75) return { grade: '一般', color: 'text-orange-400', bg: 'bg-orange-600/20' }
  return { grade: '较差', color: 'text-red-400', bg: 'bg-red-600/20' }
}

/**
 * 计算夏普比率等级
 */
export const getSharpeGrade = (sharpe) => {
  if (sharpe >= 2) return { grade: '优秀', color: 'text-green-400' }
  if (sharpe >= 1) return { grade: '良好', color: 'text-blue-400' }
  if (sharpe >= 0.5) return { grade: '中等', color: 'text-yellow-400' }
  return { grade: '较差', color: 'text-red-400' }
}

/**
 * 生成随机ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
