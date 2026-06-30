import { useState, useMemo } from 'react'
import { Calculator, TrendingUp, Calendar, DollarSign, Percent, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'

/**
 * 定投计算器
 */
const DCACalculator = () => {
  const [monthlyAmount, setMonthlyAmount] = useState(1000)
  const [annualReturn, setAnnualReturn] = useState(8)
  const [years, setYears] = useState(10)

  const result = useMemo(() => {
    const monthlyReturn = annualReturn / 100 / 12
    const totalMonths = years * 12
    let totalInvested = 0
    let totalValue = 0
    const chartData = []

    for (let month = 1; month <= totalMonths; month++) {
      totalInvested += monthlyAmount
      totalValue = (totalValue + monthlyAmount) * (1 + monthlyReturn)

      if (month % 12 === 0 || month === totalMonths) {
        const year = Math.ceil(month / 12)
        chartData.push({
          year: `第${year}年`,
          invested: totalInvested,
          value: Math.round(totalValue),
          profit: Math.round(totalValue - totalInvested)
        })
      }
    }

    return {
      totalInvested,
      totalValue: Math.round(totalValue),
      totalProfit: Math.round(totalValue - totalInvested),
      returnRate: ((totalValue - totalInvested) / totalInvested * 100).toFixed(2),
      chartData
    }
  }, [monthlyAmount, annualReturn, years])

  return (
    <div className="space-y-6">
      {/* 输入参数 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            每月定投金额（元）
          </label>
          <input
            type="number"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(Number(e.target.value) || 0)}
            className="input-field w-full"
            min="100"
            step="100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Percent className="w-4 h-4 inline mr-1" />
            预期年化收益率（%）
          </label>
          <input
            type="number"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(Number(e.target.value) || 0)}
            className="input-field w-full"
            min="0"
            max="30"
            step="0.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            定投年限（年）
          </label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value) || 1)}
            className="input-field w-full"
            min="1"
            max="30"
          />
        </div>
      </div>

      {/* 计算结果 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="text-sm text-blue-600 mb-1">累计投入</div>
          <div className="text-xl font-bold text-blue-900 font-mono">
            ¥{(result.totalInvested / 10000).toFixed(2)}万
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-sm text-green-600 mb-1">预计总值</div>
          <div className="text-xl font-bold text-green-900 font-mono">
            ¥{(result.totalValue / 10000).toFixed(2)}万
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="text-sm text-amber-600 mb-1">预计收益</div>
          <div className="text-xl font-bold text-amber-900 font-mono">
            ¥{(result.totalProfit / 10000).toFixed(2)}万
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="text-sm text-purple-600 mb-1">收益率</div>
          <div className="text-xl font-bold text-purple-900 font-mono">
            {result.returnRate}%
          </div>
        </div>
      </div>

      {/* 增长曲线 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 资产增长曲线</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.chartData}>
              <defs>
                <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px'
                }}
                formatter={(value) => [`¥${(value / 10000).toFixed(2)}万`]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="invested"
                name="累计投入"
                stroke="#3b82f6"
                fill="url(#investedGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="资产总值"
                stroke="#22c55e"
                fill="url(#valueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/**
 * 复利计算器
 */
const CompoundCalculator = () => {
  const [principal, setPrincipal] = useState(10000)
  const [annualReturn, setAnnualReturn] = useState(8)
  const [years, setYears] = useState(10)
  const [compoundFrequency, setCompoundFrequency] = useState(12) // 月复利

  const result = useMemo(() => {
    const rate = annualReturn / 100
    const n = compoundFrequency
    const t = years

    // 复利公式: A = P(1 + r/n)^(nt)
    const totalValue = principal * Math.pow(1 + rate / n, n * t)
    const totalProfit = totalValue - principal
    const effectiveRate = (Math.pow(1 + rate / n, n) - 1) * 100

    // 生成每年数据
    const chartData = []
    for (let year = 1; year <= t; year++) {
      const value = principal * Math.pow(1 + rate / n, n * year)
      chartData.push({
        year: `第${year}年`,
        value: Math.round(value),
        profit: Math.round(value - principal)
      })
    }

    return {
      totalValue: Math.round(totalValue),
      totalProfit: Math.round(totalProfit),
      effectiveRate: effectiveRate.toFixed(2),
      chartData
    }
  }, [principal, annualReturn, years, compoundFrequency])

  return (
    <div className="space-y-6">
      {/* 输入参数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            初始本金（元）
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
            className="input-field w-full"
            min="1000"
            step="1000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Percent className="w-4 h-4 inline mr-1" />
            年化收益率（%）
          </label>
          <input
            type="number"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(Number(e.target.value) || 0)}
            className="input-field w-full"
            min="0"
            max="30"
            step="0.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            投资年限（年）
          </label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value) || 1)}
            className="input-field w-full"
            min="1"
            max="30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <RefreshCw className="w-4 h-4 inline mr-1" />
            复利频率
          </label>
          <select
            value={compoundFrequency}
            onChange={(e) => setCompoundFrequency(Number(e.target.value))}
            className="select-field w-full"
          >
            <option value={1}>年复利</option>
            <option value={4}>季复利</option>
            <option value={12}>月复利</option>
            <option value={52}>周复利</option>
            <option value={365}>日复利</option>
          </select>
        </div>
      </div>

      {/* 计算结果 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="text-sm text-blue-600 mb-1">初始本金</div>
          <div className="text-xl font-bold text-blue-900 font-mono">
            ¥{(principal / 10000).toFixed(2)}万
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-sm text-green-600 mb-1">最终总值</div>
          <div className="text-xl font-bold text-green-900 font-mono">
            ¥{(result.totalValue / 10000).toFixed(2)}万
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="text-sm text-amber-600 mb-1">总收益</div>
          <div className="text-xl font-bold text-amber-900 font-mono">
            ¥{(result.totalProfit / 10000).toFixed(2)}万
          </div>
        </div>
      </div>

      <div className="bg-purple-50 rounded-xl p-4">
        <div className="text-sm text-purple-600 mb-1">实际年化收益率（考虑复利）</div>
        <div className="text-2xl font-bold text-purple-900 font-mono">
          {result.effectiveRate}%
        </div>
      </div>

      {/* 增长曲线 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 资产增长曲线</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.chartData}>
              <defs>
                <linearGradient id="compoundGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px'
                }}
                formatter={(value) => [`¥${(value / 10000).toFixed(2)}万`]}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="资产总值"
                stroke="#8b5cf6"
                fill="url(#compoundGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/**
 * 收益率计算页面
 */
const ReturnCalculator = () => {
  const [activeTab, setActiveTab] = useState('dca')

  const tabs = [
    { id: 'dca', label: '定投计算器', icon: Calendar },
    { id: 'compound', label: '复利计算器', icon: TrendingUp }
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🧮 收益计算器</h2>
        <p className="text-sm text-gray-500 mt-1">测算投资收益，制定理财计划</p>
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

      {/* 计算器内容 */}
      {activeTab === 'dca' && <DCACalculator />}
      {activeTab === 'compound' && <CompoundCalculator />}

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 使用说明</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 定投计算器：计算每月定期投资的长期收益</li>
          <li>• 复利计算器：计算一次性投资的复利增长</li>
          <li>• 实际收益可能因市场波动而有所差异</li>
          <li>• 建议根据自身风险承受能力选择合适的收益率</li>
        </ul>
      </div>
    </div>
  )
}

export default ReturnCalculator
