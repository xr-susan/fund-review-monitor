import { useState, useEffect, useMemo, useRef } from 'react'
import { useFundStore } from '../store/fundStore'
import { Bell, BellOff, Plus, Trash2, Edit2, Save, X, AlertTriangle, TrendingDown, TrendingUp, Percent, Award } from 'lucide-react'

const ALERT_TYPES = [
  {
    id: 'fund_drop',
    name: '基金跌幅预警',
    icon: TrendingDown,
    description: '当基金单日跌幅超过阈值时触发',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  {
    id: 'fund_rise',
    name: '基金涨幅预警',
    icon: TrendingUp,
    description: '当基金单日涨幅超过阈值时触发',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    id: 'pe_high',
    name: 'PE高位预警',
    icon: Percent,
    description: '当持仓股票PE超过历史分位时触发',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  {
    id: 'rank_drop',
    name: '排名下滑预警',
    icon: Award,
    description: '当基金排名跌出同类前N%时触发',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    id: 'drawdown',
    name: '回撤预警',
    icon: AlertTriangle,
    description: '当基金回撤超过阈值时触发',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
]

const DEFAULT_RULES = [
  {
    id: 1,
    type: 'fund_drop',
    name: '单日跌幅超2%',
    fundCode: 'all',
    threshold: 2,
    enabled: true,
    notifyMethod: 'browser'
  },
  {
    id: 2,
    type: 'fund_rise',
    name: '单日涨幅超3%',
    fundCode: 'all',
    threshold: 3,
    enabled: true,
    notifyMethod: 'browser'
  }
]

/**
 * 根据基金数据实时检查预警
 */
function checkAlerts(funds, rules) {
  const triggered = []

  funds.forEach(fund => {
    rules.forEach(rule => {
      if (!rule.enabled) return
      if (rule.fundCode !== 'all' && rule.fundCode !== fund.code) return

      const dayChange = Number(fund.dayChange) || 0
      const estimateChange = Number(fund.estimateChange) || 0

      switch (rule.type) {
        case 'fund_drop':
          if (dayChange < 0 && Math.abs(dayChange) >= rule.threshold) {
            triggered.push({
              id: `${rule.id}-${fund.code}`,
              ruleId: rule.id,
              fundCode: fund.code,
              fundName: fund.name,
              type: rule.type,
              title: `${fund.name} 跌幅预警`,
              message: `当日跌幅 ${dayChange.toFixed(2)}%，超过阈值 ${rule.threshold}%`,
              value: dayChange,
              threshold: rule.threshold,
              time: new Date().toLocaleTimeString(),
              level: Math.abs(dayChange) >= rule.threshold * 2 ? 'critical' : 'warning'
            })
          }
          break

        case 'fund_rise':
          if (dayChange > 0 && dayChange >= rule.threshold) {
            triggered.push({
              id: `${rule.id}-${fund.code}`,
              ruleId: rule.id,
              fundCode: fund.code,
              fundName: fund.name,
              type: rule.type,
              title: `${fund.name} 涨幅预警`,
              message: `当日涨幅 +${dayChange.toFixed(2)}%，超过阈值 ${rule.threshold}%`,
              value: dayChange,
              threshold: rule.threshold,
              time: new Date().toLocaleTimeString(),
              level: 'info'
            })
          }
          break

        case 'estimate_drop':
          if (estimateChange < 0 && Math.abs(estimateChange) >= rule.threshold) {
            triggered.push({
              id: `${rule.id}-${fund.code}`,
              ruleId: rule.id,
              fundCode: fund.code,
              fundName: fund.name,
              type: rule.type,
              title: `${fund.name} 估算下跌`,
              message: `估算跌幅 ${estimateChange.toFixed(2)}%，超过阈值 ${rule.threshold}%`,
              value: estimateChange,
              threshold: rule.threshold,
              time: new Date().toLocaleTimeString(),
              level: 'warning'
            })
          }
          break
      }
    })
  })

  return triggered
}

const AlertRuleCard = ({ rule, onEdit, onDelete, onToggle }) => {
  const alertType = ALERT_TYPES.find(t => t.id === rule.type)
  const Icon = alertType?.icon || Bell

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${!rule.enabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${alertType?.bgColor || 'bg-gray-100'}`}>
            <Icon className={`w-5 h-5 ${alertType?.color || 'text-gray-600'}`} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{rule.name}</h4>
            <p className="text-sm text-gray-500 mt-1">{alertType?.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
              <span>阈值: {rule.threshold}{rule.type.includes('drop') || rule.type.includes('rise') ? '%' : ''}</span>
              <span>适用: {rule.fundCode === 'all' ? '所有基金' : rule.fundCode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggle(rule.id)}
            className={`p-2 rounded-lg transition-colors ${
              rule.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {rule.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

const AlertRuleForm = ({ rule, funds, onSave, onCancel }) => {
  const [formData, setFormData] = useState(rule || {
    type: 'fund_drop',
    name: '',
    fundCode: 'all',
    threshold: 2,
    enabled: true,
    notifyMethod: 'browser'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {rule ? '编辑预警规则' : '新建预警规则'}
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 预警类型 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">预警类型</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const type = ALERT_TYPES.find(t => t.id === e.target.value)
                setFormData({
                  ...formData,
                  type: e.target.value,
                  name: type?.name || ''
                })
              }}
              className="input-field w-full"
            >
              {ALERT_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {/* 规则名称 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">规则名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入规则名称"
              className="input-field w-full"
              required
            />
          </div>

          {/* 适用基金 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">适用基金</label>
            <select
              value={formData.fundCode}
              onChange={(e) => setFormData({ ...formData, fundCode: e.target.value })}
              className="input-field w-full"
            >
              <option value="all">所有基金</option>
              {funds.map(fund => (
                <option key={fund.code} value={fund.code}>{fund.name}</option>
              ))}
            </select>
          </div>

          {/* 阈值 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              阈值 {formData.type.includes('drop') || formData.type.includes('rise') ? '(%)' : ''}
            </label>
            <input
              type="number"
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
              className="input-field w-full"
              min="0"
              step="0.1"
              required
            />
          </div>

          {/* 通知方式 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">通知方式</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.notifyMethod === 'browser'}
                  onChange={(e) => setFormData({ ...formData, notifyMethod: e.target.checked ? 'browser' : 'none' })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">浏览器通知</span>
              </label>
            </div>
          </div>

          {/* 启用状态 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">立即启用</span>
          </div>

          {/* 按钮 */}
          <div className="flex space-x-3 pt-4">
            <button type="submit" className="flex-1 btn-primary flex items-center justify-center space-x-2">
              <Save className="w-4 h-4" />
              <span>保存</span>
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

const AlertSettings = ({ funds = [] }) => {
  const { funds: storeFunds } = useFundStore()
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // 使用 store 中的基金数据
  const allFunds = funds.length > 0 ? funds : storeFunds

  // 实时计算触发的预警
  const triggeredAlerts = useMemo(() => {
    return checkAlerts(allFunds, rules)
  }, [allFunds, rules])

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  // 发送浏览器通知（去重：同一 alert 周期内只通知一次）
  const notifiedRef = useRef(new Set())
  useEffect(() => {
    if (notificationsEnabled && triggeredAlerts.length > 0) {
      const currentIds = new Set(triggeredAlerts.map(a => a.id))
      // 清理已消失的 alert 的通知记录
      for (const id of notifiedRef.current) {
        if (!currentIds.has(id)) notifiedRef.current.delete(id)
      }
      triggeredAlerts.forEach(alert => {
        if ((alert.level === 'critical' || alert.level === 'warning') && !notifiedRef.current.has(alert.id)) {
          notifiedRef.current.add(alert.id)
          new Notification(alert.title, {
            body: alert.message,
            icon: '/favicon.ico'
          })
        }
      })
    }
  }, [triggeredAlerts, notificationsEnabled])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === 'granted')
    }
  }

  const handleSave = (formData) => {
    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? { ...formData, id: editingRule.id } : r))
    } else {
      setRules([...rules, { ...formData, id: Date.now() }])
    }
    setShowForm(false)
    setEditingRule(null)
  }

  const handleDelete = (id) => {
    if (confirm('确定要删除这条预警规则吗？')) {
      setRules(rules.filter(r => r.id !== id))
    }
  }

  const handleToggle = (id) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const handleEdit = (rule) => {
    setEditingRule(rule)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🔔 预警设置</h2>
        <button
          onClick={() => {
            setEditingRule(null)
            setShowForm(true)
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>新建规则</span>
        </button>
      </div>

      {/* 实时预警状态 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">实时预警监控</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${triggeredAlerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-sm text-gray-500">
              {triggeredAlerts.length > 0 ? `${triggeredAlerts.length} 条预警触发` : '正常'}
            </span>
          </div>
        </div>

        {triggeredAlerts.length > 0 ? (
          <div className="space-y-3">
            {triggeredAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
                alert.level === 'critical' ? 'bg-red-50 border border-red-200' :
                alert.level === 'warning' ? 'bg-amber-50 border border-amber-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  alert.level === 'critical' ? 'text-red-600' :
                  alert.level === 'warning' ? 'text-amber-600' :
                  'text-blue-600'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>当前无预警触发</p>
          </div>
        )}
      </div>

      {/* 通知权限 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">浏览器通知</h3>
            <p className="text-sm text-gray-500 mt-1">
              {notificationsEnabled ? '已开启浏览器通知' : '开启后可接收实时预警推送'}
            </p>
          </div>
          {!notificationsEnabled && (
            <button
              onClick={requestNotificationPermission}
              className="btn-secondary"
            >
              开启通知
            </button>
          )}
          {notificationsEnabled && (
            <span className="text-green-600 text-sm">✓ 已开启</span>
          )}
        </div>
      </div>

      {/* 预警规则列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">预警规则</h3>

        {rules.length > 0 ? (
          rules.map(rule => (
            <AlertRuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">暂无预警规则</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:text-blue-700 mt-2"
            >
              创建第一条规则
            </button>
          </div>
        )}
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <AlertRuleForm
          rule={editingRule}
          funds={allFunds}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingRule(null)
          }}
        />
      )}
    </div>
  )
}

export default AlertSettings
