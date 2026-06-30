import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">⚠️</div>
                <h1 className="text-2xl font-bold text-gray-900">出现错误</h1>
                <p className="text-gray-500 mt-2">应用程序遇到了一个错误</p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-600 text-sm font-mono">
                  {this.state.error?.message || '未知错误'}
                </p>
              </div>

              {this.state.errorInfo && (
                <details className="mb-4">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    查看详细信息
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 btn-primary"
                >
                  刷新页面
                </button>
                <button
                  onClick={() => {
                    localStorage.clear()
                    window.location.href = '/'
                  }}
                  className="flex-1 btn-secondary"
                >
                  清除缓存
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
