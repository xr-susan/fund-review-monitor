import { useState, useEffect } from 'react'
import { useFundStore } from '../store/fundStore'
import { format } from 'date-fns'
import { RefreshCw, Bell, Menu, User, LogOut, ChevronDown, X, Sun, Moon } from 'lucide-react'

const Header = ({ onMenuClick, user, onLogout }) => {
  const { lastUpdate, refreshData, loading, funds, darkMode, toggleDarkMode } = useFundStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])

  // 生成通知
  useEffect(() => {
    const generateNotifications = () => {
      const alerts = []

      funds.forEach(fund => {
        if (fund.dayChange && Number(fund.dayChange) < -2) {
          alerts.push({
            id: `drop-${fund.code}`,
            type: 'warning',
            title: `${fund.name} 跌幅预警`,
            message: `当日跌幅 ${Number(fund.dayChange).toFixed(2)}%`,
            time: new Date().toLocaleTimeString()
          })
        }

        if (fund.estimateChange && Number(fund.estimateChange) < -3) {
          alerts.push({
            id: `est-${fund.code}`,
            type: 'info',
            title: `${fund.name} 估算下跌`,
            message: `估算跌幅 ${Number(fund.estimateChange).toFixed(2)}%`,
            time: new Date().toLocaleTimeString()
          })
        }
      })

      setNotifications(alerts)
    }

    generateNotifications()
  }, [funds])

  const handleRefresh = async () => {
    await refreshData()
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* 移动端菜单按钮 */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-primary-800 dark:text-primary-300">基金复盘监控</h1>
              {lastUpdate && (
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  最后更新: {format(new Date(lastUpdate), 'HH:mm:ss')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3">
          {/* 暗色模式切换 */}
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            title={darkMode ? '切换亮色模式' : '切换暗色模式'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            title="刷新数据"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* 通知按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative cursor-pointer"
            >
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* 通知面板 */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-dropdown z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">通知提醒</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(alert => (
                        <div key={alert.id} className="p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                              alert.type === 'warning' ? 'bg-amber-500' : 'bg-primary-500'
                            }`} />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.message}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{alert.time}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-400 dark:text-gray-500">
                        暂无通知
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 用户菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:block">{user?.username}</span>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
            </button>

            {/* 下拉菜单 */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-dropdown z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{user?.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onLogout()
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">退出登录</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
