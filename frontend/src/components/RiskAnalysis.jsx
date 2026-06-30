import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts'
import { AlertTriangle, Shield, TrendingDown, Activity, BarChart3 } from 'lucide-react'
import { calculateVolatility, calculateMaxDrawdown, calculateSharpeRatio, calculateConcentration } from '../utils/indicators'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

// 通用图表样式
const chartTooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
}

/**
 * 风险评分卡
 */
function RiskScoreCard({ score, label, description, icon: Icon, color }) {
  const getScoreLevel = (score) => {
    if (score >= 80) return { text: '优秀', color: 'text-green-600' }
    if (score >= 60) return { text: '良好', color: 'text-blue-600' }
    if (score >= 40) return { text: '中等', color: 'text-yellow-600' }
    if (score >= 20) return { text: '较差', color: 'text-orange-600' }
    return { text: '危险', color: 'text-red-600' }
  }

  const level = getScoreLevel(score)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`text-sm font-medium ${level.color}`}>{level.text}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{score}</div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{description}</div>

      {/* 进度条 */}
      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            score >= 60 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

/**
 * 持仓集中度分析
 */
function ConcentrationAnalysis({ holdings }) {
  const data = useMemo(() => {
    if (!holdings || holdings.length === 0) return []

    // 按权重排序
    const sorted = [...holdings].sort((a, b) => b.weight - a.weight)

    // 计算累计占比
    let cumulative = 0
    return sorted.map((h, index) => {
      cumulative += h.weight
      return {
        name: h.name.slice(0, 4),
        weight: h.weight,
        cumulative: cumulative,
        isTop5: index < 5,
        isTop10: index < 10
      }
    })
  }, [holdings])

  const top5Concentration = useMemo(() => {
    if (!holdings || holdings.length < 5) return 0
    return holdings
      .sort((a, b) => Number(b.weight) - Number(a.weight))
      .slice(0, 5)
      .reduce((sum, h) => sum + (Number(h.weight) || 0), 0)
  }, [holdings])

  const top10Concentration = useMemo(() => {
    if (!holdings || holdings.length < 10) return 0
    return holdings
      .sort((a, b) => Number(b.weight) - Number(a.weight))
      .slice(0, 10)
      .reduce((sum, h) => sum + (Number(h.weight) || 0), 0)
  }, [holdings])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-sm font-medium text-gray-500 mb-3">持仓集中度分析</h4>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">前5大持仓占比</div>
          <div className={`text-xl font-bold ${
            top5Concentration > 60 ? 'text-red-600' : top5Concentration > 40 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {Number(top5Concentration).toFixed(1)}%
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">前10大持仓占比</div>
          <div className={`text-xl font-bold ${
            top10Concentration > 80 ? 'text-red-600' : top10Concentration > 60 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {Number(top10Concentration).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 集中度风险提示 */}
      {top5Concentration > 50 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">持仓集中度较高，分散风险不足</span>
          </div>
        </div>
      )}

      {/* 持仓占比图表 */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.slice(0, 8)}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="weight"
            >
              {data.slice(0, 8).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${Number(value).toFixed(2)}%`, '持仓占比']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * 风险雷达图
 */
function RiskRadar({ fund }) {
  const data = useMemo(() => {
    if (!fund) return []

    // 计算各项风险指标（0-100分）
    const volatilityScore = Math.max(0, 100 - (Math.abs(fund.maxDrawdown || 20) * 2))
    const returnScore = Math.min(100, Math.max(0, (fund.yearChange || 0) + 50))
    const sharpeScore = Math.min(100, Math.max(0, (fund.sharpeRatio || 1) * 30))
    const rankScore = fund.rank && fund.rankTotal
      ? Math.max(0, 100 - (fund.rank / fund.rankTotal * 100))
      : 50

    return [
      { metric: '收益能力', score: returnScore, fullMark: 100 },
      { metric: '稳定性', score: volatilityScore, fullMark: 100 },
      { metric: '风险调整', score: sharpeScore, fullMark: 100 },
      { metric: '排名表现', score: rankScore, fullMark: 100 },
      { metric: '回撤控制', score: volatilityScore, fullMark: 100 }
    ]
  }, [fund])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-sm font-medium text-gray-500 mb-3">风险能力雷达图</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="metric" stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis stroke="#94A3B8" tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Radar
              name="风险指标"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * 风险指标详情
 */
function RiskMetricsDetail({ fund, holdings }) {
  const metrics = useMemo(() => {
    if (!fund) return []

    const navHistory = fund.navHistory || []
    const returns = navHistory.map((_, i) => i > 0 ? (navHistory[i].nav - navHistory[i-1].nav) / navHistory[i-1].nav * 100 : 0)

    return [
      {
        name: '最大回撤',
        value: `${Number(fund.maxDrawdown || 0).toFixed(2)}%`,
        description: '历史最大亏损幅度',
        status: Math.abs(Number(fund.maxDrawdown) || 0) < 15 ? 'good' : Math.abs(Number(fund.maxDrawdown) || 0) < 25 ? 'warning' : 'danger',
        icon: TrendingDown
      },
      {
        name: '年化波动率',
        value: navHistory.length > 0 ? `${calculateVolatility(returns).toFixed(2)}%` : '--',
        description: '收益波动程度',
        status: 'info',
        icon: Activity
      },
      {
        name: '夏普比率',
        value: Number(fund.sharpeRatio || 0).toFixed(2),
        description: '风险调整后收益',
        status: Number(fund.sharpeRatio || 0) > 1 ? 'good' : Number(fund.sharpeRatio || 0) > 0.5 ? 'warning' : 'danger',
        icon: BarChart3
      },
      {
        name: '持仓集中度',
        value: holdings ? `${calculateConcentration(holdings, 5).toFixed(1)}%` : '--',
        description: '前5大持仓占比',
        status: holdings && calculateConcentration(holdings, 5) < 40 ? 'good' : 'warning',
        icon: Shield
      }
    ]
  }, [fund, holdings])

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'danger': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-sm font-medium text-gray-500 mb-3">风险指标详情</h4>
      <div className="space-y-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${getStatusColor(metric.status)}`} />
                <div>
                  <div className="text-sm text-gray-900">{metric.name}</div>
                  <div className="text-xs text-gray-500">{metric.description}</div>
                </div>
              </div>
              <div className={`text-lg font-bold ${getStatusColor(metric.status)}`}>
                {metric.value}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 风险分析组件
 */
export default function RiskAnalysis({ fund, holdings }) {
  // 计算综合风险评分
  const overallScore = useMemo(() => {
    if (!fund) return 0

    let score = 50 // 基础分

    // 夏普比率加分
    if (fund.sharpeRatio > 1.5) score += 20
    else if (fund.sharpeRatio > 1) score += 10
    else if (fund.sharpeRatio < 0.5) score -= 10

    // 最大回撤减分
    const drawdown = Math.abs(fund.maxDrawdown || 0)
    if (drawdown < 10) score += 15
    else if (drawdown < 20) score += 5
    else if (drawdown > 30) score -= 15

    // 年收益加分
    if (fund.yearChange > 20) score += 15
    else if (fund.yearChange > 10) score += 10
    else if (fund.yearChange < -10) score -= 10

    return Math.max(0, Math.min(100, score))
  }, [fund])

  return (
    <div className="space-y-6">
      {/* 综合评分 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RiskScoreCard
          score={overallScore}
          label="综合风险评分"
          description="基于多个指标的综合评估"
          icon={Shield}
          color="bg-blue-100 text-blue-600"
        />
        <RiskScoreCard
          score={Math.max(0, 100 - Math.abs(fund?.maxDrawdown || 0) * 3)}
          label="回撤控制"
          description="最大回撤表现"
          icon={TrendingDown}
          color="bg-green-100 text-green-600"
        />
        <RiskScoreCard
          score={Math.min(100, Math.max(0, (fund?.sharpeRatio || 0) * 40))}
          label="风险调整收益"
          description="夏普比率表现"
          icon={Activity}
          color="bg-purple-100 text-purple-600"
        />
        <RiskScoreCard
          score={fund?.rank && fund?.rankTotal
            ? Math.max(0, 100 - (fund.rank / fund.rankTotal * 100))
            : 50}
          label="同类排名"
          description="在同类基金中的排名"
          icon={BarChart3}
          color="bg-yellow-100 text-yellow-600"
        />
      </div>

      {/* 详细分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConcentrationAnalysis holdings={holdings} />
        <RiskRadar fund={fund} />
      </div>

      {/* 风险指标详情 */}
      <RiskMetricsDetail fund={fund} holdings={holdings} />
    </div>
  )
}
