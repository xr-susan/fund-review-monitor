import { memo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

/**
 * 优化的统计卡片组件
 * 使用 React.memo 避免不必要的重渲染
 */
const StatCard = memo(({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
  loading = false,
  subtitle
}) => {
  const isPositive = Number(change) >= 0

  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 bg-gray-200 rounded-lg animate-shimmer" />
      ) : (
        <div className="text-2xl font-bold text-gray-900 font-mono">{value}</div>
      )}

      {change !== undefined && (
        <div className={`flex items-center mt-2 text-sm font-medium ${
          isPositive ? 'text-red-600' : 'text-green-600'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1" />
          )}
          <span className="font-mono">{change}%</span>
        </div>
      )}

      {subtitle && (
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      )}
    </div>
  )
})

StatCard.displayName = 'StatCard'

export default StatCard
