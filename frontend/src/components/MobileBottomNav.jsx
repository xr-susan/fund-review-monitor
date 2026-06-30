import { LayoutDashboard, BarChart2, PieChart, FileText, Settings } from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: '仪表板', icon: LayoutDashboard },
  { id: 'monitor', label: '监控', icon: BarChart2 },
  { id: 'holdings', label: '持仓', icon: PieChart },
  { id: 'notes', label: '笔记', icon: FileText },
  { id: 'alerts', label: '设置', icon: Settings }
]

/**
 * 移动端底部导航栏
 */
const MobileBottomNav = ({ currentPage, setCurrentPage }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
      <nav className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
              <span className={`text-xs mt-1 font-medium ${isActive ? 'text-primary-600' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default MobileBottomNav
