import { useState, useEffect, lazy, Suspense } from 'react'
import { useFundStore } from './store/fundStore'
import { authService } from './services/auth'
import Login from './pages/Login'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import InstallPrompt from './components/InstallPrompt'
import MobileBottomNav from './components/MobileBottomNav'

// 懒加载页面组件 - 实现代码分割
const Dashboard = lazy(() => import('./pages/Dashboard'))
const FundMonitor = lazy(() => import('./pages/FundMonitor'))
const HoldingsAnalysis = lazy(() => import('./pages/HoldingsAnalysis'))
const NotesCenter = lazy(() => import('./pages/NotesCenter'))
const BenchmarkCompare = lazy(() => import('./pages/BenchmarkCompare'))
const AlertSettings = lazy(() => import('./pages/AlertSettings'))
const PortfolioAnalysis = lazy(() => import('./pages/PortfolioAnalysis'))
const ReturnCalculator = lazy(() => import('./pages/ReturnCalculator'))

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const { funds, refreshData, refreshInterval, loadFunds, loadBenchmark, loadNotes, reloadUserData, clearUserData, darkMode } = useFundStore()

  // 初始化暗色模式
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // 检查登录状态
  useEffect(() => {
    console.log('App: 检查登录状态...')
    const checkAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser()
        console.log('App: 当前用户:', currentUser)
        if (currentUser) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error('App: 检查登录状态失败:', error)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  // 初始化数据
  useEffect(() => {
    if (user) {
      console.log('App: 用户已登录，加载数据...')
      loadFunds()
      loadBenchmark()
      loadNotes()
    }
  }, [user])

  // 定时刷新数据
  useEffect(() => {
    if (!user) return

    const timer = setInterval(() => {
      refreshData()
    }, refreshInterval * 60 * 1000)
    return () => clearInterval(timer)
  }, [refreshInterval, refreshData, user])

  // 处理登录
  const handleLogin = (userData) => {
    console.log('App: 登录成功:', userData)
    setUser(userData)
    // 重新加载用户本地数据（持仓金额/日期等）
    reloadUserData()
  }

  // 处理登出
  const handleLogout = () => {
    console.log('App: 用户登出')
    authService.logout()
    clearUserData()
    setUser(null)
    setCurrentPage('dashboard')
  }

  // 加载中
  if (loading) {
    console.log('App: 加载中...')
    return (
      <div className="min-h-screen bg-surface-secondary dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // 未登录显示登录页
  if (!user) {
    console.log('App: 未登录，显示登录页')
    return <Login onLogin={handleLogin} />
  }

  // 页面加载状态组件
  const PageLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    </div>
  )

  const renderPage = () => {
    return (
      <Suspense fallback={<PageLoading />}>
        {(() => {
          switch (currentPage) {
            case 'dashboard':
              return <Dashboard />
            case 'monitor':
              return <FundMonitor onNavigate={setCurrentPage} />
            case 'holdings':
              return <HoldingsAnalysis />
            case 'notes':
              return <NotesCenter />
            case 'benchmark':
              return <BenchmarkCompare />
            case 'alerts':
              return <AlertSettings funds={funds} />
            case 'portfolio':
              return <PortfolioAnalysis />
            case 'calculator':
              return <ReturnCalculator />
            default:
              return <Dashboard />
          }
        })()}
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-surface-secondary dark:bg-gray-900">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex">
        {/* 移动端遮罩 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 侧边栏 */}
        <div className={`
          fixed md:sticky top-14 left-0 z-50 md:z-0
          transform transition-transform duration-300 md:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={(page) => {
              setCurrentPage(page)
              setSidebarOpen(false)
            }}
          />
        </div>

        {/* 主内容区 */}
        <main className="flex-1 p-4 md:p-6 w-full min-w-0">
          {renderPage()}
        </main>
      </div>

      {/* Toast 通知 */}
      <Toast />

      {/* PWA 安装提示 */}
      <InstallPrompt />

      {/* 移动端底部导航 */}
      <MobileBottomNav
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  )
}

export default App
