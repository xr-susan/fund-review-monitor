import { memo } from 'react'

/**
 * 优化的卡片组件
 * 使用 React.memo 避免不必要的重渲染
 */
const OptimizedCard = memo(({
  title,
  children,
  className = '',
  headerRight,
  noPadding = false
}) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${noPadding ? '' : 'p-5'} ${className}`}>
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {headerRight}
        </div>
      )}
      {children}
    </div>
  )
})

OptimizedCard.displayName = 'OptimizedCard'

export default OptimizedCard
