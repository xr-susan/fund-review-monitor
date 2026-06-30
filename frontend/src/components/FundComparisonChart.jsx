import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts'
import { fundApi } from '../services/api'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

/**
 * 多基金收益对比图表
 * 使用真实历史净值数据
 */
const FundComparisonChart = ({
  funds,
  benchmark,
  benchmarkKey = 'hs300',
  period = 30,
  chartType: initialChartType = 'line'
}) => {
  const [chartType, setChartType] = useState(initialChartType)
  const [selectedFunds, setSelectedFunds] = useState(funds.slice(0, 5).map(f => f.code))
  const [compareMode, setCompareMode] = useState('normalized')
  const [navHistories, setNavHistories] = useState({})
  const [loading, setLoading] = useState(false)

  // 加载历史净值数据
  useEffect(() => {
    const loadNavHistories = async () => {
      setLoading(true)
      const histories = {}

      for (const fund of funds.filter(f => selectedFunds.includes(f.code))) {
        try {
          const history = await fundApi.getNavHistory(fund.code, period)
          if (history && history.length > 0) {
            histories[fund.code] = history
          }
        } catch (error) {
          console.error(`加载 ${fund.name} 历史数据失败:`, error)
        }
      }

      setNavHistories(histories)
      setLoading(false)
    }

    if (selectedFunds.length > 0) {
      loadNavHistories()
    }
  }, [funds, selectedFunds, period])

  // 生成对比数据
  const chartData = useMemo(() => {
    const data = []
    const allDates = new Set()

    // 收集所有日期
    Object.values(navHistories).forEach(history => {
      history.forEach(item => allDates.add(item.date))
    })

    // 排序日期
    const sortedDates = Array.from(allDates).sort()

    // 计算基准净值（从100开始）
    let baseNavs = {}
    funds.filter(f => selectedFunds.includes(f.code)).forEach(fund => {
      const history = navHistories[fund.code]
      if (history && history.length > 0) {
        baseNavs[fund.code] = history[0].nav
      }
    })

    // 生成图表数据
    sortedDates.forEach(date => {
      const entry = { date: date.slice(5) }

      funds.filter(f => selectedFunds.includes(f.code)).forEach(fund => {
        const history = navHistories[fund.code]
        if (history) {
          const item = history.find(h => h.date === date)
          if (item) {
            if (compareMode === 'normalized') {
              // 归一化：从100开始
              const baseNav = baseNavs[fund.code]
              entry[fund.name] = baseNav ? ((item.nav / baseNav) * 100).toFixed(2) : null
            } else {
              // 绝对值：涨跌幅
              entry[fund.name] = item.change || 0
            }
          }
        }
      })

      data.push(entry)
    })

    return data
  }, [navHistories, funds, selectedFunds, compareMode])

  // 计算统计数据
  const stats = useMemo(() => {
    return funds.filter(f => selectedFunds.includes(f.code)).map(fund => {
      const history = navHistories[fund.code]
      if (!history || history.length === 0) {
        return {
          code: fund.code,
          name: fund.name,
          dayChange: Number(fund.dayChange) || 0,
          weekChange: Number(fund.weekChange) || 0,
          monthChange: Number(fund.monthChange) || 0,
          yearChange: Number(fund.yearChange) || 0,
          volatility: 0
        }
      }

      // 计算波动率
      const changes = history.map(h => h.change || 0)
      const avg = changes.reduce((s, c) => s + c, 0) / changes.length
      const volatility = Math.sqrt(changes.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / changes.length)

      return {
        code: fund.code,
        name: fund.name,
        dayChange: Number(fund.dayChange) || 0,
        weekChange: Number(fund.weekChange) || 0,
        monthChange: Number(fund.monthChange) || 0,
        yearChange: Number(fund.yearChange) || 0,
        volatility: volatility
      }
    })
  }, [funds, selectedFunds, navHistories])

  const toggleFund = (code) => {
    setSelectedFunds(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">加载历史数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 控制面板 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 图表类型选择 */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'line', label: '折线图' },
            { id: 'area', label: '面积图' },
            { id: 'bar', label: '柱状图' }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setChartType(type.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                chartType === type.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* 对比模式 */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'normalized', label: '归一化' },
            { id: 'absolute', label: '涨跌幅' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setCompareMode(mode.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                compareMode === mode.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 基金选择器 */}
      <div className="flex flex-wrap gap-2">
        {funds.map((fund, index) => (
          <button
            key={fund.code}
            onClick={() => toggleFund(fund.code)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedFunds.includes(fund.code)
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
            }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: selectedFunds.includes(fund.code)
                  ? COLORS[index % COLORS.length]
                  : '#d1d5db'
              }}
            />
            <span>{fund.name}</span>
          </button>
        ))}
      </div>

      {/* 图表 */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}${compareMode === 'normalized' ? '' : '%'}`]}
              />
              <Legend />
              {funds.filter(f => selectedFunds.includes(f.code)).map((fund, index) => (
                <Line
                  key={fund.code}
                  type="monotone"
                  dataKey={fund.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={chartData}>
              <defs>
                {funds.filter(f => selectedFunds.includes(f.code)).map((fund, index) => (
                  <linearGradient
                    key={fund.code}
                    id={`area-gradient-${index}`}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px'
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}${compareMode === 'normalized' ? '' : '%'}`]}
              />
              <Legend />
              {funds.filter(f => selectedFunds.includes(f.code)).map((fund, index) => (
                <Area
                  key={fund.code}
                  type="monotone"
                  dataKey={fund.name}
                  stroke={COLORS[index % COLORS.length]}
                  fill={`url(#area-gradient-${index})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={chartData.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px'
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`]}
              />
              <Legend />
              {funds.filter(f => selectedFunds.includes(f.code)).map((fund, index) => (
                <Bar
                  key={fund.code}
                  dataKey={fund.name}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 统计对比表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200">
              <th className="text-left py-2 px-3">基金名称</th>
              <th className="text-right py-2 px-3">日涨跌</th>
              <th className="text-right py-2 px-3">周涨跌</th>
              <th className="text-right py-2 px-3">月涨跌</th>
              <th className="text-right py-2 px-3">年涨跌</th>
              <th className="text-right py-2 px-3">波动率</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, index) => (
              <tr key={stat.code} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-gray-900">{stat.name}</span>
                  </div>
                </td>
                <td className={`text-right py-2 px-3 font-mono ${
                  stat.dayChange >= 0 ? 'text-stock-up' : 'text-stock-down'
                }`}>
                  {stat.dayChange >= 0 ? '+' : ''}{stat.dayChange.toFixed(2)}%
                </td>
                <td className={`text-right py-2 px-3 font-mono ${
                  stat.weekChange >= 0 ? 'text-stock-up' : 'text-stock-down'
                }`}>
                  {stat.weekChange >= 0 ? '+' : ''}{stat.weekChange.toFixed(2)}%
                </td>
                <td className={`text-right py-2 px-3 font-mono ${
                  stat.monthChange >= 0 ? 'text-stock-up' : 'text-stock-down'
                }`}>
                  {stat.monthChange >= 0 ? '+' : ''}{stat.monthChange.toFixed(2)}%
                </td>
                <td className={`text-right py-2 px-3 font-mono font-semibold ${
                  stat.yearChange >= 0 ? 'text-stock-up' : 'text-stock-down'
                }`}>
                  {stat.yearChange >= 0 ? '+' : ''}{stat.yearChange.toFixed(2)}%
                </td>
                <td className="text-right py-2 px-3 text-gray-600">
                  {stat.volatility.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FundComparisonChart
