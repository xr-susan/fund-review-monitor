import { useState, useEffect } from 'react'
import { useFundStore } from '../store/fundStore'
import { fundApi } from '../services/api'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Download, RefreshCw, Edit2, Save, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import ExportModal from '../components/ExportModal'
import { useFundRealtime } from '../hooks/useWebSocket'

const StatCard = ({ title, value, change, icon: Icon, color = 'blue', loading = false }) => {
  const hasChange = change !== null && change !== undefined && Number.isFinite(Number(change))
  const isPositive = hasChange && Number(change) >= 0
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    blue: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer"></div>
      ) : (
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">{value}</div>
      )}
      <div className={`flex items-center mt-2 text-sm font-medium ${
        !hasChange ? 'text-gray-400' : isPositive ? 'text-stock-up' : 'text-stock-down'
      }`}>
        {hasChange && (isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />)}
        <span className="font-mono">{hasChange ? `${Number(change).toFixed(2)}%` : '--'}</span>
      </div>
    </div>
  )
}

const formatChangeValue = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '--'
  const number = Number(value)
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`
}

const FundRankingTable = () => {
  const { funds, selectFund, loading, holdingsAmounts, holdingsDates, getFundDayProfit } = useFundStore()
  const sorted = [...funds].sort((a, b) => (Number(b.dayChange) || 0) - (Number(a.dayChange) || 0))
  const hasCustomAmounts = Object.keys(holdingsAmounts).length > 0

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">今日涨跌排行</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">今日涨跌排行</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-3 font-medium">排名</th>
              <th className="text-left py-3 font-medium">基金名称</th>
              <th className="text-right py-3 font-medium">净值</th>
              <th className="text-right py-3 font-medium">估算涨跌</th>
              <th className="text-right py-3 font-medium">日涨跌</th>
              {hasCustomAmounts && (
                <>
                  <th className="text-right py-3 font-medium">持仓金额</th>
                  <th className="text-right py-3 font-medium">持仓日期</th>
                  <th className="text-right py-3 font-medium">日收益</th>
                </>
              )}
              <th className="text-right py-3 font-medium">周涨跌</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((fund, index) => {
              const amount = holdingsAmounts[fund.code] || 0
              const holdingDate = holdingsDates[fund.code] || ''
              const dayProfit = getFundDayProfit(fund.code)
              return (
                <tr
                  key={fund.code}
                  onClick={() => selectFund(fund)}
                  className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <td className="py-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                      index === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      index === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                      index === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                      'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{fund.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{fund.code}</div>
                  </td>
                  <td className="text-right py-3 text-gray-900 dark:text-gray-100 font-mono">{Number(fund.nav || 0).toFixed(4)}</td>
                  <td className={`text-right py-3 font-semibold font-mono ${
                    (Number(fund.estimateChange) || 0) >= 0 ? 'text-stock-up' : 'text-stock-down'
                  }`}>
                    {fund.estimateChange != null ? `${Number(fund.estimateChange) >= 0 ? '+' : ''}${Number(fund.estimateChange).toFixed(2)}%` : '--'}
                  </td>
                  <td className={`text-right py-3 font-semibold font-mono ${
                    (Number(fund.dayChange) || 0) >= 0 ? 'text-stock-up' : 'text-stock-down'
                  }`}>
                    {fund.dayChange != null ? `${Number(fund.dayChange) >= 0 ? '+' : ''}${Number(fund.dayChange).toFixed(2)}%` : '--'}
                  </td>
                  {hasCustomAmounts && (
                    <>
                      <td className="text-right py-3 text-gray-700 dark:text-gray-300 font-mono">
                        {amount > 0 ? `¥${amount.toLocaleString()}` : '--'}
                      </td>
                      <td className="text-right py-3 text-gray-400 dark:text-gray-500 text-xs">
                        {holdingDate || '--'}
                      </td>
                      <td className={`text-right py-3 font-semibold font-mono ${
                        dayProfit >= 0 ? 'text-stock-up' : 'text-stock-down'
                      }`}>
                        {amount > 0 ? `${dayProfit >= 0 ? '+' : ''}¥${dayProfit.toFixed(2)}` : '--'}
                      </td>
                    </>
                  )}
                  <td className={`text-right py-3 font-mono ${
                    (Number(fund.weekChange) || 0) >= 0 ? 'text-stock-up' : 'text-stock-down'
                  }`}>
                    {fund.weekChange != null ? `${Number(fund.weekChange) >= 0 ? '+' : ''}${Number(fund.weekChange).toFixed(2)}%` : '--'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PerformanceChart = () => {
  const { funds, selectedFund, loadFundDetail } = useFundStore()
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)

  const targetFund = selectedFund || funds[0]

  useEffect(() => {
    const loadHistory = async () => {
      if (!targetFund) return

      setLoading(true)
      try {
        const detail = await loadFundDetail(targetFund.code)
        if (detail?.navHistory) {
          setChartData(detail.navHistory.map(item => ({
            date: item.date.slice(5),
            nav: item.nav,
            change: item.change
          })))
        }
      } catch (error) {
        console.error('加载历史数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [targetFund?.code])

  if (!targetFund) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">净值走势（近30日）</h3>
      {loading ? (
        <div className="h-80 bg-gray-100 rounded-lg animate-shimmer"></div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
                }}
                formatter={(value) => [Number(value).toFixed(4), '净值']}
              />
              <Area
                type="monotone"
                dataKey="nav"
                name={targetFund.name}
                stroke="#3b82f6"
                fill="url(#navGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

const MultiFundCompareChart = () => {
  const { funds } = useFundStore()
  const [compareData, setCompareData] = useState([])
  const [loading, setLoading] = useState(false)

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b']

  useEffect(() => {
    const loadCompareData = async () => {
      setLoading(true)
      const allDates = new Set()
      const navHistories = {}

      // 加载前3只基金的历史数据
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
      const data = sortedDates.map(date => {
        const entry = { date: date.slice(5) }

        funds.slice(0, 3).forEach(fund => {
          const history = navHistories[fund.code]
          if (history) {
            const item = history.find(h => h.date === date)
            if (item) {
              const baseNav = baseNavs[fund.code]
              entry[fund.name] = baseNav ? ((item.nav / baseNav) * 100).toFixed(2) : null
            }
          }
        })

        return entry
      })

      setCompareData(data)
      setLoading(false)
    }

    if (funds.length > 0) {
      loadCompareData()
    }
  }, [funds])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">收益曲线对比</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">加载历史数据...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">收益曲线对比（近30日）</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={compareData}>
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
            />
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
    </div>
  )
}

// 持仓金额编辑弹窗
const HoldingsAmountModal = ({ isOpen, onClose }) => {
  const { funds, holdingsAmounts, holdingsDates, setHoldingAmount, setHoldingDate } = useFundStore()
  const [amounts, setAmounts] = useState({})
  const [dates, setDates] = useState({})

  useEffect(() => {
    if (isOpen) {
      setAmounts({ ...holdingsAmounts })
      setDates({ ...holdingsDates })
    }
  }, [isOpen, holdingsAmounts, holdingsDates])

  const handleSave = () => {
    Object.entries(amounts).forEach(([code, amount]) => {
      setHoldingAmount(code, amount)
    })
    Object.entries(dates).forEach(([code, date]) => {
      if (date) {
        setHoldingDate(code, date)
      }
    })
    onClose()
  }

  const handleAmountChange = (code, value) => {
    const cleanValue = value.replace(/[^\d.]/g, '')
    setAmounts(prev => ({ ...prev, [code]: cleanValue }))
  }

  const handleDateChange = (code, value) => {
    setDates(prev => ({ ...prev, [code]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">设置持仓信息</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {funds.map(fund => (
            <div key={fund.code} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{fund.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{fund.code}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500 w-12">金额:</span>
                  <div className="flex-1 flex items-center space-x-1">
                    <span className="text-gray-400">¥</span>
                    <input
                      type="text"
                      value={amounts[fund.code] || ''}
                      onChange={(e) => handleAmountChange(fund.code, e.target.value)}
                      placeholder="0"
                      className="flex-1 input-field text-right text-sm py-2"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500 w-12">日期:</span>
                  <input
                    type="date"
                    value={dates[fund.code] || ''}
                    onChange={(e) => handleDateChange(fund.code, e.target.value)}
                    className="flex-1 input-field text-sm py-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-3">
          <button onClick={handleSave} className="flex-1 btn-primary flex items-center justify-center space-x-2">
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">取消</button>
        </div>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const {
    funds,
    benchmark,
    loading,
    lastUpdate,
    holdingsAmounts,
    loadFunds,
    loadBenchmark,
    getTotalAssets,
    getTotalDayChange,
    exportFunds
  } = useFundStore()

  const [showAmountModal, setShowAmountModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // WebSocket 实时数据
  const { connected } = useFundRealtime((data) => {
    if (data.type === 'fund_update') {
      loadFunds()
    }
  })

  useEffect(() => {
    loadFunds()
    loadBenchmark()
  }, [])

  const totalAssets = getTotalAssets()
  const dayChange = getTotalDayChange()
  const hasCustomAmounts = Object.keys(holdingsAmounts).length > 0

  const calculateWeightedChange = (field) => {
    if (funds.length === 0) return null
    if (hasCustomAmounts) {
      let totalAmount = 0
      let weightedSum = 0
      funds.forEach(f => {
        const amount = holdingsAmounts[f.code] || 0
        const change = Number(f[field])
        if (amount > 0 && Number.isFinite(change)) {
          totalAmount += amount
          weightedSum += amount * change
        }
      })
      return totalAmount > 0 ? (weightedSum / totalAmount).toFixed(2) : null
    }
    const validChanges = funds
      .map(f => Number(f[field]))
      .filter(value => Number.isFinite(value))

    return validChanges.length > 0
      ? (validChanges.reduce((sum, value) => sum + value, 0) / validChanges.length).toFixed(2)
      : null
  }

  const weekChange = calculateWeightedChange('weekChange')
  const monthChange = calculateWeightedChange('monthChange')
  const yearChange = calculateWeightedChange('yearChange')

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">仪表板</h2>
          {lastUpdate && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              最后更新: {new Date(lastUpdate).toLocaleString('zh-CN')}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAmountModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">设置持仓</span>
          </button>
          <button
            onClick={() => loadFunds()}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">刷新</span>
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">导出数据</span>
          </button>
        </div>
      </div>

      {/* 持仓金额编辑弹窗 */}
      <HoldingsAmountModal
        isOpen={showAmountModal}
        onClose={() => setShowAmountModal(false)}
      />

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="自选基金总资产"
          value={`¥${(totalAssets / 10000).toFixed(2)}万`}
          change={dayChange}
          icon={DollarSign}
          color="green"
          loading={loading}
        />
        <StatCard
          title="近7日净值涨跌"
          value={formatChangeValue(weekChange)}
          change={weekChange}
          icon={TrendingUp}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="近30日净值涨跌"
          value={formatChangeValue(monthChange)}
          change={monthChange}
          icon={BarChart3}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="近1年净值涨跌"
          value={formatChangeValue(yearChange)}
          change={yearChange}
          icon={PieChart}
          color="orange"
          loading={loading}
        />
      </div>

      {/* 基准对比 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">基准指数今日表现</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(benchmark).map(([key, index]) => (
            <div key={key} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{index.name}</div>
              <div className={`text-xl font-bold font-mono ${Number(index.change) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                {Number(index.change) >= 0 ? '+' : ''}{Number(index.change || 0).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                年收益: {Number(index.yearChange) >= 0 ? '+' : ''}{Number(index.yearChange || 0).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <MultiFundCompareChart />
      </div>

      {/* 涨跌排行 */}
      <FundRankingTable />

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="funds"
        data={funds}
      />
    </div>
  )
}

export default Dashboard
