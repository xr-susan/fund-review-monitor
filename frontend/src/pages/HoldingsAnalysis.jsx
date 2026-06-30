import { useState, useEffect } from 'react'
import { useFundStore } from '../store/fundStore'
import { TrendingUp, TrendingDown, AlertTriangle, Download, RefreshCw, BarChart3, Shield, GitCompare } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ScatterChart, Scatter, ZAxis } from 'recharts'
import RiskAnalysis from '../components/RiskAnalysis'
import PerformanceAttribution from '../components/PerformanceAttribution'
import ReturnDistributionChart from '../components/ReturnDistributionChart'
import HoldingsTrendChart from '../components/HoldingsTrendChart'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1']

// 通用图表样式
const chartTooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
}

const HoldingsTable = ({ fund, loading }) => {
  const getRiskTag = (stock) => {
    const isHigh = stock.change > 2
    const isLow = stock.change < -2
    const isHighPE = stock.pe > 30

    return (
      <div className="flex space-x-1">
        {isHigh && (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded" title="涨幅较大">
            🔴
          </span>
        )}
        {isLow && (
          <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded" title="跌幅较大">
            🟢
          </span>
        )}
        {isHighPE && (
          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-600 text-xs rounded" title="PE较高">
            🟡
          </span>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 text-sm border-b border-gray-200">
            <th className="text-left py-3 px-2">股票名称</th>
            <th className="text-left py-3 px-2">代码</th>
            <th className="text-right py-3 px-2">持仓占比</th>
            <th className="text-right py-3 px-2">当前股价</th>
            <th className="text-right py-3 px-2">涨跌%</th>
            <th className="text-right py-3 px-2">市盈率(PE)</th>
            <th className="text-center py-3 px-2">风险标记</th>
          </tr>
        </thead>
        <tbody>
          {fund.topHoldings?.map((stock, index) => (
            <tr key={stock.code} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-2">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-gray-900">{stock.name}</span>
                </div>
              </td>
              <td className="py-3 px-2 text-gray-500">{stock.code}</td>
              <td className="py-3 px-2 text-right">
                <div className="flex items-center justify-end space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(stock.weight * 10, 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-900 font-medium">{stock.weight}%</span>
                </div>
              </td>
              <td className="py-3 px-2 text-right text-gray-900">
                ¥{stock.price?.toFixed(2) || '--'}
              </td>
              <td className={`py-3 px-2 text-right font-medium ${
                (stock.change || 0) >= 0 ? 'text-stock-up' : 'text-stock-down'
              }`}>
                {stock.change ? `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%` : '--'}
              </td>
              <td className="py-3 px-2 text-right text-gray-600">
                {stock.pe?.toFixed(1) || '--'}
              </td>
              <td className="py-3 px-2 text-center">{getRiskTag(stock)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const HoldingsPieChart = ({ holdings }) => {
  const data = holdings?.map(h => ({
    name: h.name,
    value: h.weight
  })) || []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 持仓占比分布</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name.slice(0, 4)} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${value}%`, '持仓占比']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const HoldingsBarChart = ({ holdings }) => {
  const data = holdings?.map(h => ({
    name: h.name.slice(0, 4),
    change: h.change || 0,
    fill: (h.change || 0) >= 0 ? '#ef4444' : '#22c55e'
  })) || []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 持仓股票涨跌分布</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${value.toFixed(2)}%`, '涨跌幅']}
            />
            <Bar dataKey="change" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const PEHeatmap = ({ holdings }) => {
  const data = holdings?.map(h => ({
    name: h.name.slice(0, 4),
    pe: h.pe || 0,
    weight: h.weight || 0,
    change: h.change || 0
  })) || []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 PE vs 持仓占比散点图</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="pe"
              name="市盈率"
              stroke="#94A3B8"
              tick={{ fontSize: 11 }}
              label={{ value: 'PE', position: 'bottom', fill: '#94A3B8' }}
            />
            <YAxis
              dataKey="weight"
              name="持仓占比"
              stroke="#94A3B8"
              tick={{ fontSize: 11 }}
              label={{ value: '持仓占比%', angle: -90, position: 'insideLeft', fill: '#94A3B8' }}
            />
            <ZAxis dataKey="change" range={[50, 400]} name="涨跌幅" />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value, name) => {
                if (name === '市盈率') return [value.toFixed(1), name]
                if (name === '持仓占比') return [`${value}%`, name]
                return [`${value.toFixed(2)}%`, name]
              }}
            />
            <Scatter
              data={data}
              fill="#3b82f6"
              name="股票"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const HoldingsAnalysis = () => {
  const {
    funds,
    selectedFund,
    selectFund,
    loadFundHoldings,
    exportHoldings,
    benchmark
  } = useFundStore()

  const [loading, setLoading] = useState(false)
  const [currentHoldings, setCurrentHoldings] = useState([])
  const [activeTab, setActiveTab] = useState('holdings')

  const currentFund = selectedFund || funds[0]

  useEffect(() => {
    const loadHoldings = async () => {
      if (!currentFund) return

      setLoading(true)
      try {
        const holdings = await loadFundHoldings(currentFund.code)
        setCurrentHoldings(holdings)
      } catch (error) {
        console.error('加载持仓失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHoldings()
  }, [currentFund?.code])

  const handleExport = async () => {
    if (currentFund) {
      await exportHoldings(currentFund.code)
    }
  }

  if (!currentFund) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-gray-500">请先选择一只基金</div>
      </div>
    )
  }

  // 标签页配置
  const tabs = [
    { id: 'holdings', label: '持仓分析', icon: BarChart3 },
    { id: 'risk', label: '风险分析', icon: Shield },
    { id: 'attribution', label: '收益归因', icon: GitCompare }
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🎯 持仓深度分析</h2>
        <div className="flex items-center space-x-3">
          <select
            value={currentFund.code}
            onChange={(e) => {
              const fund = funds.find(f => f.code === e.target.value)
              selectFund(fund)
            }}
            className="input-field"
          >
            {funds.map(fund => (
              <option key={fund.code} value={fund.code}>
                {fund.name} ({fund.code})
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>导出持仓</span>
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 基金信息卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{currentFund.name}</h3>
            <div className="text-sm text-gray-500 mt-1">
              {currentFund.code} | 基金经理: {currentFund.manager || '未知'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{currentFund.nav?.toFixed(4)}</div>
            <div className={`text-sm ${(currentFund.dayChange || 0) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
              今日: {currentFund.dayChange ? `${currentFund.dayChange >= 0 ? '+' : ''}${currentFund.dayChange.toFixed(2)}%` : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'holdings' && (
        <>
          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HoldingsPieChart holdings={currentHoldings} />
            <HoldingsBarChart holdings={currentHoldings} />
          </div>

          {/* 新增图表：收益分布和持仓变动趋势 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReturnDistributionChart holdings={currentHoldings} />
            <HoldingsTrendChart
              fundCode={currentFund.code}
              fundName={currentFund.name}
              currentHoldings={currentHoldings}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PEHeatmap holdings={currentHoldings} />
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 持仓统计</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">持仓集中度（前5大）</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentHoldings.slice(0, 5).reduce((sum, h) => sum + (h.weight || 0), 0).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">平均市盈率</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentHoldings.length > 0
                      ? (currentHoldings.reduce((sum, h) => sum + (h.pe || 0), 0) / currentHoldings.length).toFixed(1)
                      : '--'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">今日上涨股票</div>
                  <div className="text-2xl font-bold text-stock-up">
                    {currentHoldings.filter(h => (h.change || 0) > 0).length} / {currentHoldings.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 持仓明细表 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">📋 前十大持仓明细</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span>涨幅较大</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span>跌幅较大</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span>PE较高</span>
                </div>
              </div>
            </div>
            <HoldingsTable fund={{ ...currentFund, topHoldings: currentHoldings }} loading={loading} />
          </div>

          {/* 风险提示 */}
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">风险提示</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">高PE股票</div>
                <div className="text-xl font-bold text-amber-600">
                  {currentHoldings.filter(h => (h.pe || 0) > 30).length} 只
                </div>
                <div className="text-xs text-gray-400 mt-1">PE &gt; 30 的股票数量</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">今日下跌股票</div>
                <div className="text-xl font-bold text-stock-down">
                  {currentHoldings.filter(h => (h.change || 0) < 0).length} 只
                </div>
                <div className="text-xs text-gray-400 mt-1">今日下跌的持仓股票</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">单只股票最大占比</div>
                <div className="text-xl font-bold text-gray-900">
                  {currentHoldings.length > 0 ? Math.max(...currentHoldings.map(h => h.weight || 0)).toFixed(1) : 0}%
                </div>
                <div className="text-xs text-gray-400 mt-1">持仓最集中的股票</div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'risk' && (
        <RiskAnalysis fund={currentFund} holdings={currentHoldings} />
      )}

      {activeTab === 'attribution' && (
        <PerformanceAttribution
          fund={currentFund}
          holdings={currentHoldings}
          benchmark={benchmark?.hs300}
        />
      )}
    </div>
  )
}

export default HoldingsAnalysis
