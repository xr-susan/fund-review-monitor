import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1']

/**
 * 持仓分布图
 * 展示基金当前持仓占比分布
 */
const HoldingsTrendChart = ({ fundCode, fundName, currentHoldings }) => {
  // 获取前10大持仓
  const topHoldings = useMemo(() => {
    return currentHoldings?.slice(0, 10) || []
  }, [currentHoldings])

  // 计算其他持仓占比
  const otherWeight = useMemo(() => {
    if (!currentHoldings || currentHoldings.length <= 10) return 0
    return currentHoldings.slice(10).reduce((sum, h) => sum + (h.weight || 0), 0)
  }, [currentHoldings])

  // 生成饼图数据
  const pieData = useMemo(() => {
    const data = topHoldings.map(h => ({
      name: h.name,
      value: h.weight || 0
    }))

    if (otherWeight > 0) {
      data.push({ name: '其他', value: otherWeight })
    }

    return data
  }, [topHoldings, otherWeight])

  if (!currentHoldings || currentHoldings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 持仓分布</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          暂无持仓数据
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">📊 持仓分布</h3>
        <span className="text-xs text-gray-500">前10大持仓</span>
      </div>

      {/* 饼图 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name.slice(0, 4)} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
              }}
              formatter={(value) => [`${value.toFixed(2)}%`, '持仓占比']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 持仓明细 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
        {topHoldings.slice(0, 5).map((holding, index) => (
          <div key={holding.code} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[index] }}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{holding.name}</div>
              <div className="text-xs text-gray-500">{holding.weight}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HoldingsTrendChart
