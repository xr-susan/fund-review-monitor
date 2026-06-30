import { useState, useMemo } from 'react'
import { useFundStore } from '../store/fundStore'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { PieChart as PieIcon, BarChart3, TrendingUp, TrendingDown, AlertTriangle, Shield, Target } from 'lucide-react'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1']

/**
 * 资产配置饼图
 */
const AllocationPieChart = ({ data, title }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
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
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px'
              }}
              formatter={(value) => [`¥${Number(value).toLocaleString()}`, '金额']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center space-x-1 text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 风险评估雷达图
 */
const RiskRadarChart = ({ funds }) => {
  const radarData = useMemo(() => {
    if (!funds || funds.length === 0) return []

    const avgDayChange = funds.reduce((sum, f) => sum + Math.abs(Number(f.dayChange) || 0), 0) / funds.length
    const avgWeekChange = funds.reduce((sum, f) => sum + Math.abs(Number(f.weekChange) || 0), 0) / funds.length
    const avgMonthChange = funds.reduce((sum, f) => sum + Math.abs(Number(f.monthChange) || 0), 0) / funds.length
    const concentration = 100 / funds.length // 简化的集中度指标
    const volatility = avgWeekChange * 2 // 简化的波动率

    return [
      { metric: '日波动', value: Math.min(avgDayChange * 10, 100), fullMark: 100 },
      { metric: '周波动', value: Math.min(avgWeekChange * 2, 100), fullMark: 100 },
      { metric: '月波动', value: Math.min(avgMonthChange, 100), fullMark: 100 },
      { metric: '集中度', value: concentration, fullMark: 100 },
      { metric: '波动率', value: Math.min(volatility, 100), fullMark: 100 }
    ]
  }, [funds])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 风险评估雷达</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="metric" stroke="#94A3B8" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis stroke="#94A3B8" tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Radar
              name="风险指标"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px'
              }}
              formatter={(value) => [`${value.toFixed(1)}分`]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * 收益分布柱状图
 */
const ReturnBarChart = ({ funds }) => {
  const data = useMemo(() => {
    return funds.map(f => ({
      name: f.name?.slice(0, 4) || f.code,
      day: Number(f.dayChange) || 0,
      week: Number(f.weekChange) || 0,
      month: Number(f.monthChange) || 0
    }))
  }, [funds])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 收益对比</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px'
              }}
              formatter={(value) => [`${value.toFixed(2)}%`]}
            />
            <Legend />
            <Bar dataKey="day" name="日收益" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="week" name="周收益" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="month" name="月收益" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * 投资组合分析页面
 */
const PortfolioAnalysis = () => {
  const { funds, holdingsAmounts, loading } = useFundStore()
  const [activeTab, setActiveTab] = useState('allocation')

  // 计算资产配置数据
  const allocationData = useMemo(() => {
    if (Object.keys(holdingsAmounts).length > 0) {
      return funds
        .filter(f => holdingsAmounts[f.code] > 0)
        .map(f => ({
          name: f.name,
          value: holdingsAmounts[f.code]
        }))
        .sort((a, b) => b.value - a.value)
    }

    // 如果没有自定义持仓金额，使用默认值
    return funds.map(f => ({
      name: f.name,
      value: (f.nav || 1) * 1000
    }))
  }, [funds, holdingsAmounts])

  // 计算统计指标
  const stats = useMemo(() => {
    const totalAssets = allocationData.reduce((sum, item) => sum + item.value, 0)
    const fundCount = funds.length
    const avgAllocation = fundCount > 0 ? totalAssets / fundCount : 0

    // 计算加权平均收益
    let weightedDayChange = 0
    let weightedWeekChange = 0
    let weightedMonthChange = 0

    if (totalAssets > 0) {
      funds.forEach(f => {
        const amount = holdingsAmounts[f.code] || (f.nav || 1) * 1000
        const weight = amount / totalAssets
        weightedDayChange += weight * (Number(f.dayChange) || 0)
        weightedWeekChange += weight * (Number(f.weekChange) || 0)
        weightedMonthChange += weight * (Number(f.monthChange) || 0)
      })
    }

    // 计算集中度（前3大持仓占比）
    const sorted = [...allocationData].sort((a, b) => b.value - a.value)
    const top3Value = sorted.slice(0, 3).reduce((sum, item) => sum + item.value, 0)
    const concentration = totalAssets > 0 ? (top3Value / totalAssets * 100) : 0

    return {
      totalAssets,
      fundCount,
      avgAllocation,
      weightedDayChange,
      weightedWeekChange,
      weightedMonthChange,
      concentration
    }
  }, [funds, holdingsAmounts, allocationData])

  const tabs = [
    { id: 'allocation', label: '资产配置', icon: PieIcon },
    { id: 'risk', label: '风险分析', icon: Shield },
    { id: 'return', label: '收益分析', icon: TrendingUp }
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📊 投资组合分析</h2>
        <p className="text-sm text-gray-500 mt-1">分析您的资产配置和风险状况</p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">总资产</div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            ¥{(stats.totalAssets / 10000).toFixed(2)}万
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">基金数量</div>
          <div className="text-xl font-bold text-gray-900">{stats.fundCount} 只</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">加权日收益</div>
          <div className={`text-xl font-bold font-mono ${
            stats.weightedDayChange >= 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {stats.weightedDayChange >= 0 ? '+' : ''}{stats.weightedDayChange.toFixed(2)}%
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">前3集中度</div>
          <div className={`text-xl font-bold font-mono ${
            stats.concentration > 60 ? 'text-amber-600' : 'text-gray-900'
          }`}>
            {stats.concentration.toFixed(1)}%
          </div>
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
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-colors flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 标签页内容 */}
      {activeTab === 'allocation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationPieChart data={allocationData} title="🎯 资产配置" />
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 持仓明细</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {allocationData.map((item, index) => {
                const percentage = stats.totalAssets > 0
                  ? (item.value / stats.totalAssets * 100).toFixed(1)
                  : 0
                return (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-gray-900">¥{item.value.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskRadarChart funds={funds} />
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ 风险提示</h3>
            <div className="space-y-4">
              {stats.concentration > 60 && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-800">集中度过高</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    前3大持仓占比 {stats.concentration.toFixed(1)}%，建议分散投资以降低风险。
                  </p>
                </div>
              )}

              {stats.fundCount < 3 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">持仓较少</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    当前仅持有 {stats.fundCount} 只基金，建议增加至 5-10 只以实现更好的分散。
                  </p>
                </div>
              )}

              {stats.weightedDayChange < -2 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">今日下跌较大</span>
                  </div>
                  <p className="text-sm text-red-700">
                    加权日收益 {stats.weightedDayChange.toFixed(2)}%，请关注市场动态。
                  </p>
                </div>
              )}

              {stats.concentration <= 60 && stats.fundCount >= 3 && stats.weightedDayChange >= -2 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">风险状况良好</span>
                  </div>
                  <p className="text-sm text-green-700">
                    持仓分散度适中，整体风险可控。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'return' && (
        <div className="space-y-6">
          <ReturnBarChart funds={funds} />
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 收益统计</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">加权周收益</div>
                <div className={`text-xl font-bold font-mono ${
                  stats.weightedWeekChange >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {stats.weightedWeekChange >= 0 ? '+' : ''}{stats.weightedWeekChange.toFixed(2)}%
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">加权月收益</div>
                <div className={`text-xl font-bold font-mono ${
                  stats.weightedMonthChange >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {stats.weightedMonthChange >= 0 ? '+' : ''}{stats.weightedMonthChange.toFixed(2)}%
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">平均持仓</div>
                <div className="text-xl font-bold font-mono text-gray-900">
                  ¥{(stats.avgAllocation / 10000).toFixed(2)}万
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PortfolioAnalysis
