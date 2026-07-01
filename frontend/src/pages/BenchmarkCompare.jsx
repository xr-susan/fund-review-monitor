import { useState, useEffect, useMemo } from 'react'
import { useFundStore } from '../store/fundStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Award, Download, RefreshCw } from 'lucide-react'
import FundComparisonChart from '../components/FundComparisonChart'
import { fundApi } from '../services/api'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

// 通用图表样式
const chartTooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
}

const toNumberOrNull = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const formatPercent = (value) => {
  const number = toNumberOrNull(value)
  if (number === null) return '--'
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`
}

/**
 * 基准对比图表 - 使用真实历史数据
 */
const BenchmarkChart = ({ funds, benchmarkKey, benchmark }) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const data = []
      const allDates = new Set()
      const navHistories = {}

      // 加载基金历史数据
      for (const fund of funds.slice(0, 3)) {
        try {
          const history = await fundApi.getNavHistory(fund.code, 30)
          if (history && history.length > 0) {
            navHistories[fund.code] = history
            history.forEach(h => allDates.add(h.date))
          }
        } catch (error) {
          console.error(`加载 ${fund.name} 历史数据失败:`, error)
        }
      }

      // 排序日期
      const sortedDates = Array.from(allDates).sort()

      // 计算基准净值
      const baseNavs = {}
      funds.slice(0, 3).forEach(fund => {
        const history = navHistories[fund.code]
        if (history && history.length > 0) {
          baseNavs[fund.code] = history[0].nav
        }
      })

      // 生成图表数据（归一化到100）
      sortedDates.forEach(date => {
        const entry = { date: date.slice(5) }

        funds.slice(0, 3).forEach(fund => {
          const history = navHistories[fund.code]
          if (history) {
            const item = history.find(h => h.date === date)
            if (item) {
          const baseNav = baseNavs[fund.code]
          entry[fund.name] = baseNav ? Number(((item.nav / baseNav) * 100).toFixed(2)) : null
            }
          }
        })

        data.push(entry)
      })

      setChartData(data)
      setLoading(false)
    }

    if (funds.length > 0) {
      loadData()
    }
  }, [funds])

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">加载历史数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            stroke="#94A3B8"
            tick={{ fontSize: 11 }}
          />
          <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend />
          {funds.slice(0, 3).map((fund, index) => (
            <Line
              key={fund.code}
              type="monotone"
              dataKey={fund.name}
              stroke={COLORS[index]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const ExcessReturnTable = ({ funds, benchmarkKey, benchmark }) => {
  const benchData = benchmark[benchmarkKey]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 text-sm border-b border-gray-200">
            <th className="text-left py-3 px-2">基金名称</th>
            <th className="text-right py-3 px-2">基金收益</th>
            <th className="text-right py-3 px-2">基准收益</th>
            <th className="text-right py-3 px-2">超额收益</th>
            <th className="text-right py-3 px-2">信息比率</th>
            <th className="text-center py-3 px-2">评价</th>
          </tr>
        </thead>
        <tbody>
          {funds.map((fund, index) => {
            const fundReturn = toNumberOrNull(fund.yearChange)
            const benchReturn = toNumberOrNull(benchData?.yearChange) ?? 0
            const effectiveFundReturn = fundReturn ?? 0
            const excess = effectiveFundReturn - benchReturn
            const infoRatio = benchReturn !== 0 ? (excess / Math.abs(benchReturn) * 0.5).toFixed(2) : 'N/A'

            return (
              <tr key={fund.code} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2">
                  <div className="font-medium text-gray-900">{fund.name}</div>
                  <div className="text-xs text-gray-500">{fund.code}</div>
                </td>
                <td className={`text-right py-3 px-2 font-medium ${
                  effectiveFundReturn >= 0 ? 'text-stock-up' : 'text-stock-down'
                }`}>
                  {formatPercent(fundReturn)}
                </td>
                <td className={`text-right py-3 px-2 ${
                  benchReturn >= 0 ? 'text-stock-up' : 'text-stock-down'
                }`}>
                  {benchReturn >= 0 ? '+' : ''}{benchReturn.toFixed(2)}%
                </td>
                <td className={`text-right py-3 px-2 font-bold ${
                  excess >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {excess >= 0 ? '+' : ''}{excess.toFixed(2)}%
                </td>
                <td className="text-right py-3 px-2 text-gray-600">{infoRatio}</td>
                <td className="text-center py-3 px-2">
                  {excess > 5 ? (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      <Award className="w-3 h-3 mr-1" /> 优秀
                    </span>
                  ) : excess > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      良好
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      落后
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const FundComparisonTable = () => {
  const { funds } = useFundStore()

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 text-sm border-b border-gray-200">
            <th className="text-left py-3 px-2">基金名称</th>
            <th className="text-right py-3 px-2">日涨跌</th>
            <th className="text-right py-3 px-2">周涨跌</th>
            <th className="text-right py-3 px-2">月涨跌</th>
            <th className="text-right py-3 px-2">年涨跌</th>
            <th className="text-right py-3 px-2">夏普比率</th>
            <th className="text-right py-3 px-2">最大回撤</th>
          </tr>
        </thead>
        <tbody>
          {funds.map(fund => (
            <tr key={fund.code} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-2">
                <div className="font-medium text-gray-900">{fund.name}</div>
                <div className="text-xs text-gray-500">{fund.type || '混合型'}</div>
              </td>
              <td className={`text-right py-3 px-2 ${Number(fund.dayChange) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                {formatPercent(fund.dayChange)}
              </td>
              <td className={`text-right py-3 px-2 ${Number(fund.weekChange) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                {formatPercent(fund.weekChange)}
              </td>
              <td className={`text-right py-3 px-2 ${Number(fund.monthChange) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                {formatPercent(fund.monthChange)}
              </td>
              <td className={`text-right py-3 px-2 font-medium ${Number(fund.yearChange) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                {formatPercent(fund.yearChange)}
              </td>
              <td className="text-right py-3 px-2 text-gray-600">{fund.sharpeRatio || '--'}</td>
              <td className="text-right py-3 px-2 text-stock-down">{fund.maxDrawdown ? `${fund.maxDrawdown}%` : '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const RiskReturnScatter = ({ funds }) => {
  const data = funds.map(f => ({
    name: f.name.slice(0, 6),
    risk: Math.abs(toNumberOrNull(f.maxDrawdown) ?? 15),
    return: toNumberOrNull(f.yearChange) ?? 0,
    code: f.code
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 风险收益散点图</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" stroke="#94A3B8" tick={{ fontSize: 11 }} width={80} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [formatPercent(value), '年化收益']}
            />
            <Bar dataKey="return" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const PerformanceRadar = ({ funds }) => {
  // 取前5只基金做雷达图对比
  const radarData = [
    { metric: '收益', ...Object.fromEntries(funds.slice(0, 3).map(f => [f.name, (f.yearChange || 0) + 50])) },
    { metric: '稳定性', ...Object.fromEntries(funds.slice(0, 3).map(f => [f.name, 100 - Math.abs(f.maxDrawdown || 20)])) },
    { metric: '夏普', ...Object.fromEntries(funds.slice(0, 3).map(f => [f.name, (f.sharpeRatio || 1) * 30])) },
    { metric: '排名', ...Object.fromEntries(funds.slice(0, 3).map(f => [f.name, 100 - (f.rank || 50)])) },
    { metric: '回撤控制', ...Object.fromEntries(funds.slice(0, 3).map(f => [f.name, 100 - Math.abs(f.maxDrawdown || 20)])) }
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 基金综合能力雷达图</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="metric" stroke="#94A3B8" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis stroke="#94A3B8" tick={{ fontSize: 10 }} />
            {funds.slice(0, 3).map((fund, index) => (
              <Radar
                key={fund.code}
                name={fund.name}
                dataKey={fund.name}
                stroke={COLORS[index]}
                fill={COLORS[index]}
                fillOpacity={0.1}
              />
            ))}
            <Legend />
            <Tooltip contentStyle={chartTooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const BenchmarkCompare = () => {
  const { funds, benchmark, loadFunds, loadBenchmark } = useFundStore()
  const [benchmarkKey, setBenchmarkKey] = useState('hs300')

  useEffect(() => {
    loadFunds()
    loadBenchmark()
  }, [])

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📊 对标分析</h2>
        <div className="flex items-center space-x-3">
          <select
            value={benchmarkKey}
            onChange={(e) => setBenchmarkKey(e.target.value)}
            className="input-field"
          >
            {Object.entries(benchmark).map(([key, data]) => (
              <option key={key} value={key}>{data.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 基准信息 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{benchmark[benchmarkKey]?.name || '基准指数'}</h3>
            <div className="text-sm text-gray-500 mt-1">基准指数</div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${
              Number(benchmark[benchmarkKey]?.change) >= 0 ? 'text-stock-up' : 'text-stock-down'
            }`}>
              {formatPercent(benchmark[benchmarkKey]?.change)}
            </div>
            <div className="text-sm text-gray-500">
              年收益: {formatPercent(benchmark[benchmarkKey]?.yearChange)}
            </div>
          </div>
        </div>
      </div>

      {/* 收益曲线对比 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 收益曲线对比（近30日）</h3>
        <BenchmarkChart funds={funds} benchmarkKey={benchmarkKey} benchmark={benchmark} />
      </div>

      {/* 增强对比分析 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 多基金深度对比</h3>
        <FundComparisonChart
          funds={funds}
          benchmark={benchmark}
          benchmarkKey={benchmarkKey}
          period={30}
        />
      </div>

      {/* 超额收益分析 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 超额收益分析</h3>
        <ExcessReturnTable funds={funds} benchmarkKey={benchmarkKey} benchmark={benchmark} />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskReturnScatter funds={funds} />
        <PerformanceRadar funds={funds} />
      </div>

      {/* 同类基金对比 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 同类基金对比</h3>
        <FundComparisonTable />
      </div>

      {/* 投资建议 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 投资建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-700 mb-2">🏆 表现优秀</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              {funds.filter(f => Number(f.yearChange) > Number(benchmark[benchmarkKey]?.yearChange || 0)).map(f => (
                <li key={f.code}>• {f.name} 超额 {(Number(f.yearChange) - Number(benchmark[benchmarkKey]?.yearChange || 0)).toFixed(2)}%</li>
              ))}
              {funds.filter(f => Number(f.yearChange) > Number(benchmark[benchmarkKey]?.yearChange || 0)).length === 0 && (
                <li className="text-gray-500">暂无超额收益基金</li>
              )}
            </ul>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-700 mb-2">⚠️ 需要关注</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              {funds.filter(f => Number(f.yearChange) < Number(benchmark[benchmarkKey]?.yearChange || 0)).map(f => (
                <li key={f.code}>• {f.name} 落后 {Math.abs(Number(f.yearChange) - Number(benchmark[benchmarkKey]?.yearChange || 0)).toFixed(2)}%</li>
              ))}
              {funds.filter(f => Number(f.yearChange) < Number(benchmark[benchmarkKey]?.yearChange || 0)).length === 0 && (
                <li className="text-gray-500">所有基金均跑赢基准</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BenchmarkCompare
