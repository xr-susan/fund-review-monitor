import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

/**
 * 收益分布直方图
 * 展示持仓股票的涨跌幅分布情况
 */
const ReturnDistributionChart = ({ holdings, title = "📊 收益分布图" }) => {
  // 计算收益分布
  const { data, stats } = useMemo(() => {
    if (!holdings || holdings.length === 0) {
      return { data: [], stats: null }
    }

    const changes = holdings.map(h => h.change || 0)
    const min = Math.floor(Math.min(...changes))
    const max = Math.ceil(Math.max(...changes))

    // 创建分布区间
    const bucketSize = 1
    const buckets = {}
    for (let i = min; i <= max; i += bucketSize) {
      const key = `${i}%`
      buckets[key] = { range: key, count: 0, stocks: [] }
    }

    // 统计每个区间的股票
    holdings.forEach(h => {
      const change = h.change || 0
      const bucketKey = `${Math.floor(change)}%`
      if (buckets[bucketKey]) {
        buckets[bucketKey].count++
        buckets[bucketKey].stocks.push(h.name)
      }
    })

    const distributionData = Object.values(buckets).filter(b => b.count > 0)

    // 计算统计数据
    const avg = changes.reduce((s, c) => s + c, 0) / changes.length
    const sorted = [...changes].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const upCount = changes.filter(c => c > 0).length
    const downCount = changes.filter(c => c < 0).length

    return {
      data: distributionData,
      stats: {
        average: avg,
        median,
        upCount,
        downCount,
        total: changes.length,
        max: Math.max(...changes),
        min: Math.min(...changes)
      }
    }
  }, [holdings])

  if (!holdings || holdings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          暂无持仓数据
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      {/* 统计摘要 */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">平均涨跌</div>
            <div className={`font-semibold ${stats.average >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
              {stats.average >= 0 ? '+' : ''}{stats.average.toFixed(2)}%
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">上涨/下跌</div>
            <div className="font-semibold">
              <span className="text-stock-up">{stats.upCount}</span>
              <span className="text-gray-400">/</span>
              <span className="text-stock-down">{stats.downCount}</span>
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">最大涨幅</div>
            <div className="font-semibold text-stock-up">+{stats.max.toFixed(2)}%</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">最大跌幅</div>
            <div className="font-semibold text-stock-down">{stats.min.toFixed(2)}%</div>
          </div>
        </div>
      )}

      {/* 分布图 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="range"
              stroke="#94A3B8"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
              }}
              formatter={(value, name, props) => [
                `${value} 只股票`,
                props.payload.stocks?.join(', ') || ''
              ]}
              labelFormatter={(label) => `涨跌幅: ${label}`}
            />
            <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                const rangeValue = parseFloat(entry.range)
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={rangeValue >= 0 ? '#ef4444' : '#22c55e'}
                    fillOpacity={0.8}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center space-x-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>上涨</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>下跌</span>
        </div>
      </div>
    </div>
  )
}

export default ReturnDistributionChart
