import { useState, useEffect, useMemo } from 'react'
import { useFundStore } from '../store/fundStore'
import { TrendingUp, TrendingDown, AlertTriangle, Eye, FileText, Plus, X, Download, Search, SlidersHorizontal, BarChart3 } from 'lucide-react'
import ExportModal from '../components/ExportModal'

const FundCard = ({ fund, onViewHoldings, onViewNotes, onRemove }) => {
  const isPositive = Number(fund.dayChange) >= 0
  const estimatePositive = Number(fund.estimateChange) >= 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-card-hover hover:border-primary-200 transition-all duration-200 cursor-pointer">
      {/* 头部：基金基本信息 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 text-lg">{fund.name}</h3>
            <span className="badge badge-blue">
              {fund.type || '混合型'}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {fund.code} | 基金经理: {fund.manager || '未知'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 font-mono">{Number(fund.nav || 0).toFixed(4)}</div>
          <div className={`flex items-center justify-end ${estimatePositive ? 'text-stock-up' : 'text-stock-down'}`}>
            {estimatePositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            <span className="font-medium font-mono">
              {fund.estimateChange != null ? `${Number(fund.estimateChange) >= 0 ? '+' : ''}${Number(fund.estimateChange).toFixed(2)}%` : '--'}
            </span>
          </div>
          <div className="text-xs text-gray-400">估算涨跌</div>
        </div>
      </div>

      {/* 实时估值信息 */}
      {fund.estimateNav && (
        <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-primary-600">实时估算净值</span>
            <span className="text-lg font-bold text-primary-700 font-mono">{Number(fund.estimateNav).toFixed(4)}</span>
          </div>
          <div className="text-xs text-primary-500 mt-1">
            估算时间: {fund.estimateTime || '--'}
          </div>
        </div>
      )}

      {/* 涨跌统计 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">日涨跌</div>
          <div className={`font-semibold font-mono ${isPositive ? 'text-stock-up' : 'text-stock-down'}`}>
            {fund.dayChange != null ? `${Number(fund.dayChange) >= 0 ? '+' : ''}${Number(fund.dayChange).toFixed(2)}%` : '--'}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">周涨跌</div>
          <div className={`font-semibold font-mono ${Number(fund.weekChange) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {fund.weekChange != null ? `${Number(fund.weekChange) >= 0 ? '+' : ''}${Number(fund.weekChange).toFixed(2)}%` : '--'}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">月涨跌</div>
          <div className={`font-semibold font-mono ${Number(fund.monthChange) >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {fund.monthChange != null ? `${Number(fund.monthChange) >= 0 ? '+' : ''}${Number(fund.monthChange).toFixed(2)}%` : '--'}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-2">
        <button
          onClick={(e) => { e.stopPropagation(); onViewHoldings(fund); }}
          className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">查看持仓</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onViewNotes(fund); }}
          className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">复盘笔记</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(fund.code); }}
          className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors cursor-pointer"
          title="删除基金"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const AddFundModal = ({ isOpen, onClose, onAdd }) => {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [activeTab, setActiveTab] = useState('search')
  const { searchFund } = useFundStore()

  const handleSearch = async () => {
    if (!keyword.trim()) return

    setSearching(true)
    try {
      const data = await searchFund(keyword)
      setResults(data)
    } catch (error) {
      console.error('搜索失败:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async (code) => {
    const success = await onAdd(code)
    if (success) {
      setKeyword('')
      setResults([])
      setManualCode('')
      onClose()
    }
  }

  const handleManualAdd = async () => {
    if (!manualCode.trim()) return

    if (!/^\d{6}$/.test(manualCode.trim())) {
      alert('请输入正确的6位基金代码')
      return
    }

    await handleAdd(manualCode.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">添加自选基金</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 标签页切换 */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-5">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'search' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            搜索添加
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'manual' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            手动输入
          </button>
        </div>

        {/* 搜索添加 */}
        {activeTab === 'search' && (
          <>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入基金代码或名称搜索..."
                className="input-field flex-1"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="btn-primary"
              >
                {searching ? '搜索中...' : '搜索'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.map(fund => (
                <div
                  key={fund.code}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{fund.name}</div>
                    <div className="text-sm text-gray-500">{fund.code} | {fund.type}</div>
                  </div>
                  <button
                    onClick={() => handleAdd(fund.code)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    添加
                  </button>
                </div>
              ))}

              {results.length === 0 && keyword && !searching && (
                <div className="text-center py-8 text-gray-400">
                  未找到相关基金
                </div>
              )}
            </div>
          </>
        )}

        {/* 手动输入 */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">基金代码</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="请输入6位基金代码，如 012922"
                className="input-field w-full"
                maxLength={6}
              />
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
              <div className="text-sm font-medium text-primary-700 mb-2">常用基金代码</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>012922 - 易方达全球成长精选C</div>
                <div>025209 - 永赢先锋半导体智选C</div>
                <div>011452 - 华泰柏瑞质量成长C</div>
                <div>024239 - 华夏全球科技先锋C</div>
              </div>
            </div>

            <button
              onClick={handleManualAdd}
              disabled={!manualCode.trim() || !/^\d{6}$/.test(manualCode.trim())}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加基金
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const FundMonitor = ({ onNavigate }) => {
  const {
    funds,
    loading,
    loadFunds,
    selectFund,
    removeFund,
    addFund,
    exportFunds
  } = useFundStore()

  const [sortBy, setSortBy] = useState('dayChange')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterType, setFilterType] = useState('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [changeFilter, setChangeFilter] = useState('all') // all, up, down, big_up, big_down
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    loadFunds()
  }, [])

  // 使用 useMemo 优化筛选和排序性能
  const filteredFunds = useMemo(() => {
    return funds
      .filter(f => {
        // 类型筛选
        if (filterType !== 'all' && f.type !== filterType) return false

        // 搜索筛选
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase()
          const matchName = f.name?.toLowerCase().includes(keyword)
          const matchCode = f.code?.includes(keyword)
          const matchManager = f.manager?.toLowerCase().includes(keyword)
          if (!matchName && !matchCode && !matchManager) return false
        }

        // 涨跌筛选
        if (changeFilter !== 'all') {
          const dayChange = Number(f.dayChange) || 0
          switch (changeFilter) {
            case 'up':
              if (dayChange <= 0) return false
              break
            case 'down':
              if (dayChange >= 0) return false
              break
            case 'big_up':
              if (dayChange < 2) return false
              break
            case 'big_down':
              if (dayChange > -2) return false
              break
          }
        }

        return true
      })
      .sort((a, b) => {
        const multiplier = sortOrder === 'desc' ? -1 : 1
        if (sortBy === 'dayChange') return multiplier * ((Number(a.dayChange) || 0) - (Number(b.dayChange) || 0))
        if (sortBy === 'estimateChange') return multiplier * ((Number(a.estimateChange) || 0) - (Number(b.estimateChange) || 0))
        if (sortBy === 'weekChange') return multiplier * ((Number(a.weekChange) || 0) - (Number(b.weekChange) || 0))
        if (sortBy === 'monthChange') return multiplier * ((Number(a.monthChange) || 0) - (Number(b.monthChange) || 0))
        if (sortBy === 'name') return multiplier * (a.name || '').localeCompare(b.name || '')
        if (sortBy === 'nav') return multiplier * ((Number(a.nav) || 0) - (Number(b.nav) || 0))
        return 0
      })
  }, [funds, filterType, searchKeyword, changeFilter, sortBy, sortOrder])

  const handleViewHoldings = (fund) => {
    selectFund(fund)
    if (onNavigate) {
      onNavigate('holdings')
    }
  }

  const handleViewNotes = (fund) => {
    selectFund(fund)
    if (onNavigate) {
      onNavigate('notes')
    }
  }

  const handleRemove = async (code) => {
    if (confirm('确定要删除这只基金吗？')) {
      await removeFund(code)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">基金监控</h2>
          <p className="text-sm text-gray-500 mt-1">实时追踪您的自选基金</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>添加基金</span>
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>导出</span>
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* 搜索框 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索基金名称、代码或经理..."
              className="input-field pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center space-x-2 ${showFilters ? 'bg-primary-50 text-primary-600 border-primary-200' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>筛选</span>
          </button>
        </div>

        {/* 展开的筛选选项 */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">类型:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="select-field text-sm"
              >
                <option value="all">全部类型</option>
                <option value="混合型">混合型</option>
                <option value="股票型">股票型</option>
                <option value="指数型">指数型</option>
                <option value="债券型">债券型</option>
                <option value="货币型">货币型</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">涨跌:</span>
              <select
                value={changeFilter}
                onChange={(e) => setChangeFilter(e.target.value)}
                className="select-field text-sm"
              >
                <option value="all">全部</option>
                <option value="up">今日上涨</option>
                <option value="down">今日下跌</option>
                <option value="big_up">涨幅 &gt; 2%</option>
                <option value="big_down">跌幅 &gt; 2%</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">排序:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-field text-sm"
              >
                <option value="dayChange">日涨跌</option>
                <option value="estimateChange">估算涨跌</option>
                <option value="weekChange">周涨跌</option>
                <option value="monthChange">月涨跌</option>
                <option value="name">基金名称</option>
                <option value="nav">净值</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={sortOrder === 'desc' ? '降序' : '升序'}
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        )}

        {/* 筛选结果统计 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 <span className="font-semibold text-gray-900">{filteredFunds.length}</span> 只基金
            {searchKeyword && <span className="ml-2 text-primary-600">搜索: "{searchKeyword}"</span>}
          </div>
          {(searchKeyword || filterType !== 'all' || changeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchKeyword('')
                setFilterType('all')
                setChangeFilter('all')
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 加载状态 */}
      {loading && funds.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded-lg w-3/4 animate-shimmer"></div>
                <div className="h-4 bg-gray-200 rounded-lg w-1/2 animate-shimmer"></div>
                <div className="h-20 bg-gray-200 rounded-lg animate-shimmer"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 基金卡片网格 */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFunds.map(fund => (
            <FundCard
              key={fund.code}
              fund={fund}
              onViewHoldings={handleViewHoldings}
              onViewNotes={handleViewNotes}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* 空状态 */}
      {funds.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无自选基金</h3>
          <p className="text-gray-500 mb-4">添加您关注的基金开始追踪</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            添加第一只基金
          </button>
        </div>
      )}

      {/* 预警提示 */}
      {funds.some(f => (f.dayChange || 0) < -2) && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">风险预警</h3>
          </div>
          <div className="space-y-2">
            {funds.filter(f => (f.dayChange || 0) < -2).map(fund => (
              <div key={fund.code} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <span className="font-medium text-gray-900">{fund.name}</span>
                  <span className="text-gray-500 ml-2 text-sm">{fund.code}</span>
                </div>
                <span className="text-stock-down font-semibold font-mono">日跌幅 {Number(fund.dayChange).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 添加基金弹窗 */}
      <AddFundModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addFund}
      />

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="funds"
        data={filteredFunds}
      />
    </div>
  )
}

export default FundMonitor
