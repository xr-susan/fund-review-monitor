import { useMemo } from 'react'
import { useFundStore } from '../store/fundStore'
import { useFundRealtime } from '../hooks/useWebSocket'
import { LayoutDashboard, BarChart3, PieChart, FileText, GitCompare, Bell, Briefcase, Calculator } from 'lucide-react'

const menuItems = [
  { id: 'dashboard', label: '仪表板', icon: LayoutDashboard },
  { id: 'monitor', label: '基金监控', icon: BarChart3 },
  { id: 'holdings', label: '持仓分析', icon: PieChart },
  { id: 'portfolio', label: '投资组合', icon: Briefcase },
  { id: 'benchmark', label: '对标分析', icon: GitCompare },
  { id: 'calculator', label: '收益计算器', icon: Calculator },
  { id: 'notes', label: '复盘笔记', icon: FileText },
  { id: 'alerts', label: '预警设置', icon: Bell },
]

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const { funds, notes } = useFundStore()
  const { connected } = useFundRealtime(() => {})

  // 计算预警触发数量
  const alertCount = useMemo(() => {
    let count = 0
    funds.forEach(fund => {
      const dayChange = Number(fund.dayChange) || 0
      const estimateChange = Number(fund.estimateChange) || 0
      // 跌幅超过2%触发预警
      if (dayChange < -2) count++
      // 估算跌幅超过3%触发预警
      if (estimateChange < -3) count++
    })
    return count
  }, [funds])

  return (
    <aside className="w-64 h-[calc(100vh-56px)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <nav className="p-4 space-y-1.5">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* 快速统计 - 实时数据 */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-3">快速统计</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">监控基金</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{funds.length} 只</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">预警触发</span>
            <span className={`text-sm font-semibold ${alertCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {alertCount} 条
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">复盘笔记</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{notes.length} 篇</span>
          </div>
        </div>
      </div>

      {/* 连接状态 */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-xs text-gray-500">{connected ? '实时连接' : '未连接'}</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
