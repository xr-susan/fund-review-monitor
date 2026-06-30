import { useState, useEffect } from 'react'
import { useFundStore } from '../store/fundStore'
import { format } from 'date-fns'
import { Plus, Edit2, Trash2, Tag, Download, Search, Filter } from 'lucide-react'

const TAGS = ['#看好赛道', '#价值挖掘', '#定投', '#反弹交易', '#止损', '#加仓', '#减仓', '#短线', '#长线']

const NoteCard = ({ note, onEdit, onDelete }) => {
  const isBuy = note.type === 'buy'
  const isAchieved = note.actualReturn >= note.expectedReturn

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isBuy ? '📥 买入' : '📤 卖出'}
          </span>
          <span className="text-gray-500 text-sm">{note.date}</span>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => onEdit(note)} className="p-1 hover:bg-gray-100 rounded">
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => onDelete(note.id)} className="p-1 hover:bg-gray-100 rounded">
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="font-medium text-gray-900">{note.fundName}</h4>
        <div className="text-sm text-gray-500">{note.fundCode}</div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">买入理由</span>
          <span className="text-gray-900">{note.reason}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">预期收益</span>
          <span className="text-stock-up">{note.expectedReturn}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">止损线</span>
          <span className="text-stock-down">{note.stopLoss}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">持有周期</span>
          <span className="text-gray-900">{note.holdingPeriod}</span>
        </div>
      </div>

      {/* 实际收益 */}
      <div className="p-3 bg-gray-50 rounded-lg mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">实际收益</span>
          <div className="flex items-center space-x-2">
            <span className={`font-medium ${
              (note.actualReturn ?? 0) >= 0 ? 'text-stock-up' : 'text-stock-down'
            }`}>
              {note.actualReturn != null ? `${note.actualReturn >= 0 ? '+' : ''}${note.actualReturn}%` : '--'}
            </span>
            {isAchieved ? (
              <span className="text-green-600">✓</span>
            ) : (
              <span className="text-red-600">✗</span>
            )}
          </div>
        </div>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2">
        {note.tags?.map(tag => (
          <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            {tag}
          </span>
        ))}
      </div>

      {/* 状态 */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
          note.status === 'holding' ? 'bg-yellow-100 text-yellow-700' :
          note.status === 'sold' ? 'bg-gray-100 text-gray-600' :
          'bg-green-100 text-green-700'
        }`}>
          {note.status === 'holding' ? '⏳ 持有中' :
           note.status === 'sold' ? '✅ 已卖出' : '🎯 已达标'}
        </span>
      </div>
    </div>
  )
}

const NoteForm = ({ note, onSave, onCancel }) => {
  const { funds } = useFundStore()
  const [formData, setFormData] = useState(note || {
    fundCode: funds[0]?.code || '',
    fundName: funds[0]?.name || '',
    type: 'buy',
    date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
    expectedReturn: 15,
    stopLoss: -10,
    holdingPeriod: '6个月',
    tags: [],
    actualReturn: 0,
    status: 'holding'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {note ? '编辑复盘笔记' : '新建复盘笔记'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基金选择 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">选择基金</label>
            <select
              value={formData.fundCode}
              onChange={(e) => {
                const fund = funds.find(f => f.code === e.target.value)
                if (fund) {
                  setFormData({ ...formData, fundCode: fund.code, fundName: fund.name })
                }
              }}
              className="input-field w-full"
            >
              {funds.map(fund => (
                <option key={fund.code} value={fund.code}>{fund.name}</option>
              ))}
            </select>
          </div>

          {/* 操作类型 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">操作类型</label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'buy' })}
                className={`flex-1 py-2 rounded-lg ${
                  formData.type === 'buy' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                买入
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'sell' })}
                className={`flex-1 py-2 rounded-lg ${
                  formData.type === 'sell' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                卖出
              </button>
            </div>
          </div>

          {/* 日期 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">操作日期</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input-field w-full"
            />
          </div>

          {/* 买入理由 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">买入理由</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="input-field w-full h-20"
              placeholder="请输入买入理由..."
            />
          </div>

          {/* 预期收益和止损 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">预期收益 (%)</label>
              <input
                type="number"
                value={formData.expectedReturn}
                onChange={(e) => setFormData({ ...formData, expectedReturn: parseFloat(e.target.value) || 0 })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">止损线 (%)</label>
              <input
                type="number"
                value={formData.stopLoss}
                onChange={(e) => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) || 0 })}
                className="input-field w-full"
              />
            </div>
          </div>

          {/* 持有周期 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">预期持有周期</label>
            <select
              value={formData.holdingPeriod}
              onChange={(e) => setFormData({ ...formData, holdingPeriod: e.target.value })}
              className="input-field w-full"
            >
              <option value="1个月">1个月</option>
              <option value="3个月">3个月</option>
              <option value="6个月">6个月</option>
              <option value="1年">1年</option>
              <option value="长期">长期</option>
            </select>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">标签</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const tags = formData.tags?.includes(tag)
                      ? formData.tags.filter(t => t !== tag)
                      : [...(formData.tags || []), tag]
                    setFormData({ ...formData, tags })
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.tags?.includes(tag)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex space-x-3 pt-4">
            <button type="submit" className="flex-1 btn-primary">
              保存
            </button>
            <button type="button" onClick={onCancel} className="flex-1 btn-secondary">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const NotesCenter = () => {
  const {
    notes,
    loading,
    loadNotes,
    addNote,
    updateNote,
    deleteNote,
    exportNotes
  } = useFundStore()

  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [filterTag, setFilterTag] = useState('all')
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    loadNotes()
  }, [])

  const filteredNotes = notes
    .filter(n => filterTag === 'all' || n.tags?.includes(filterTag))
    .filter(n => {
      if (!searchKeyword) return true
      const keyword = searchKeyword.toLowerCase()
      return (
        n.fundName?.toLowerCase().includes(keyword) ||
        n.fundCode?.includes(keyword) ||
        n.reason?.toLowerCase().includes(keyword)
      )
    })

  // 统计数据
  const totalNotes = notes.length
  const achievedNotes = notes.filter(n => n.actualReturn >= n.expectedReturn).length
  const correctRate = totalNotes > 0 ? ((achievedNotes / totalNotes) * 100).toFixed(1) : 0
  const avgReturn = totalNotes > 0
    ? (notes.reduce((sum, n) => sum + (n.actualReturn || 0), 0) / totalNotes).toFixed(2)
    : 0

  const handleSave = async (formData) => {
    if (editingNote) {
      await updateNote(editingNote.id, formData)
    } else {
      await addNote(formData)
    }
    setShowForm(false)
    setEditingNote(null)
  }

  const handleEdit = (note) => {
    setEditingNote(note)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('确定要删除这条复盘笔记吗？')) {
      await deleteNote(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📝 投资决策中心</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setEditingNote(null)
              setShowForm(true)
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>新建笔记</span>
          </button>
          <button
            onClick={exportNotes}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>导出笔记</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">总操作笔数</div>
          <div className="text-2xl font-bold text-gray-900">{totalNotes}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">预期达成</div>
          <div className="text-2xl font-bold text-green-600">{achievedNotes} 笔</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">正确率</div>
          <div className="text-2xl font-bold text-blue-600">{correctRate}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">平均收益</div>
          <div className={`text-2xl font-bold ${avgReturn >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {avgReturn >= 0 ? '+' : ''}{avgReturn}%
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索基金名称、代码或理由..."
                className="input-field w-full pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">标签:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterTag('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterTag === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                全部
              </button>
              {TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filterTag === tag ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 笔记列表 */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-gray-500 mb-2">暂无复盘笔记</div>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            点击创建第一篇笔记
          </button>
        </div>
      )}

      {/* 笔记表单 */}
      {showForm && (
        <NoteForm
          note={editingNote}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingNote(null)
          }}
        />
      )}
    </div>
  )
}

export default NotesCenter
