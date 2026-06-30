import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// 通用图表样式
const chartTooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
}

/**
 * 收益归因分析
 */
export default function PerformanceAttribution({ fund, holdings, benchmark }) {
  // 计算 Alpha 和 Beta
  const attribution = useMemo(() => {
    if (!fund || !holdings) return null

    const fundReturn = Number(fund.yearChange) || 0
    const benchmarkReturn = Number(benchmark?.yearChange) || 0

    // 计算 Alpha（超额收益）
    const alpha = fundReturn - benchmarkReturn

    // 计算 Beta（基于持仓波动率的简化计算）
    // Beta = 基金波动率 / 基准波动率
    // 这里使用持仓加权波动率来估算
    const holdingVolatility = holdings.reduce((sum, h) => {
      const weight = (Number(h.weight) || 0) / 100
      const change = Math.abs(Number(h.change) || 0)
      return sum + weight * change
    }, 0)
    const benchmarkVolatility = Math.abs(benchmarkReturn) * 0.3 || 1
    const beta = benchmarkVolatility > 0 ? Math.min(2, Math.max(0.3, holdingVolatility / benchmarkVolatility)) : 1

    // 持仓贡献分析
    const holdingsContribution = holdings.map(h => ({
      name: (h.name || '').slice(0, 6),
      code: h.code,
      weight: Number(h.weight) || 0,
      change: Number(h.change) || 0,
      contribution: (Number(h.weight) || 0) * (Number(h.change) || 0) / 100,
      isPositive: (Number(h.change) || 0) > 0
    }))

    // 按贡献排序
    holdingsContribution.sort((a, b) => b.contribution - a.contribution)

    return {
      fundReturn,
      benchmarkReturn,
      alpha,
      beta: parseFloat(beta.toFixed(2)),
      informationRatio: alpha !== 0 ? alpha / (Math.abs(fundReturn - benchmarkReturn) * 0.5 || 1) : 0,
      holdings: holdingsContribution,
      totalContribution: holdingsContribution.reduce((sum, h) => sum + h.contribution, 0)
    }
  }, [fund, holdings, benchmark])

  if (!attribution) {
    return <div className="text-gray-500 text-center py-8">暂无数据</div>
  }

  return (
    <div className="space-y-6">
      {/* 归因概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">基金收益</div>
          <div className={`text-2xl font-bold ${
            attribution.fundReturn >= 0 ? 'text-stock-up' : 'text-stock-down'
          }`}>
            {attribution.fundReturn >= 0 ? '+' : ''}{Number(attribution.fundReturn).toFixed(2)}%
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">基准收益</div>
          <div className={`text-2xl font-bold ${
            attribution.benchmarkReturn >= 0 ? 'text-stock-up' : 'text-stock-down'
          }`}>
            {attribution.benchmarkReturn >= 0 ? '+' : ''}{Number(attribution.benchmarkReturn).toFixed(2)}%
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Alpha</div>
          <div className={`text-2xl font-bold ${
            attribution.alpha >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {attribution.alpha >= 0 ? '+' : ''}{Number(attribution.alpha).toFixed(2)}%
          </div>
          <div className="text-xs text-gray-400 mt-1">超额收益</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Beta</div>
          <div className="text-2xl font-bold text-gray-900">
            {Number(attribution.beta).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">市场敏感度</div>
        </div>
      </div>

      {/* 持仓贡献分析 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">持仓贡献分析</h4>

        {/* 贡献图表 */}
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attribution.holdings.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" stroke="#94A3B8" tick={{ fontSize: 10 }} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#94A3B8"
                tick={{ fontSize: 10 }}
                width={60}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, '贡献度']}
              />
              <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                {attribution.holdings.slice(0, 10).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPositive ? '#22c55e' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 贡献明细表 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-gray-200">
                <th className="text-left py-2">股票名称</th>
                <th className="text-right py-2">持仓占比</th>
                <th className="text-right py-2">涨跌幅</th>
                <th className="text-right py-2">贡献度</th>
                <th className="text-center py-2">状态</th>
              </tr>
            </thead>
            <tbody>
              {attribution.holdings.slice(0, 10).map((h, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2">
                    <div className="text-gray-900">{h.name}</div>
                    <div className="text-xs text-gray-500">{h.code}</div>
                  </td>
                  <td className="text-right py-2 text-gray-600">{Number(h.weight).toFixed(2)}%</td>
                  <td className={`text-right py-2 ${
                    h.change >= 0 ? 'text-stock-up' : 'text-stock-down'
                  }`}>
                    {h.change >= 0 ? '+' : ''}{Number(h.change).toFixed(2)}%
                  </td>
                  <td className={`text-right py-2 font-medium ${
                    h.contribution >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {h.contribution >= 0 ? '+' : ''}{Number(h.contribution).toFixed(2)}%
                  </td>
                  <td className="text-center py-2">
                    {h.isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
                    ) : h.change < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-600 mx-auto" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 归因总结 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">归因总结</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-medium text-green-700 mb-2">正向贡献</h5>
            <div className="space-y-2">
              {attribution.holdings.filter(h => h.contribution > 0).slice(0, 3).map((h, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{h.name}</span>
                  <span className="text-green-600">+{Number(h.contribution).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h5 className="font-medium text-red-700 mb-2">负向贡献</h5>
            <div className="space-y-2">
              {attribution.holdings.filter(h => h.contribution < 0).slice(0, 3).map((h, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{h.name}</span>
                  <span className="text-red-600">{Number(h.contribution).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
