import { memo, useMemo } from 'react'

/**
 * 表格行组件
 */
const TableRow = memo(({ row, columns, rowIndex, onRowClick }) => {
  return (
    <tr
      onClick={() => onRowClick?.(row)}
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        onRowClick ? 'cursor-pointer' : ''
      }`}
    >
      {columns.map((col, colIndex) => (
        <td
          key={col.key}
          className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
        >
          {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
        </td>
      ))}
    </tr>
  )
})

TableRow.displayName = 'TableRow'

/**
 * 优化的表格组件
 * 使用 React.memo 和 useMemo 优化大数据表格渲染
 */
const OptimizedTable = memo(({
  columns,
  data = [],
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  className = ''
}) => {
  // 缓存表头
  const header = useMemo(() => (
    <thead>
      <tr className="text-gray-500 text-sm border-b border-gray-200 bg-gray-50">
        {columns.map(col => (
          <th
            key={col.key}
            className={`py-3 px-4 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.headerClassName || ''}`}
          >
            {col.title}
          </th>
        ))}
      </tr>
    </thead>
  ), [columns])

  // 加载状态
  if (loading) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  // 空状态
  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-12 text-gray-400 ${className}`}>
        {emptyText}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        {header}
        <tbody>
          {data.map((row, index) => (
            <TableRow
              key={row.id || index}
              row={row}
              columns={columns}
              rowIndex={index}
              onRowClick={onRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
})

OptimizedTable.displayName = 'OptimizedTable'

export default OptimizedTable
