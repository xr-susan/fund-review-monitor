import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart, Area, Bar
} from 'recharts'
import { calculateMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '../utils/indicators'

const COLORS = {
  ma5: '#f59e0b',
  ma10: '#3b82f6',
  ma20: '#8b5cf6',
  ma60: '#ec4899',
  ema12: '#22c55e',
  ema26: '#ef4444',
  bollingerUpper: '#6b7280',
  bollingerMiddle: '#3b82f6',
  bollingerLower: '#6b7280',
  dif: '#3b82f6',
  dea: '#f59e0b',
  macdPositive: '#22c55e',
  macdNegative: '#ef4444',
  rsi: '#8b5cf6',
  price: '#1f2937'
}

// 通用图表样式
const chartTooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)'
}

/**
 * K线图 + 均线
 */
export function CandlestickChart({ data, showMA = true, showBollinger = false }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const closes = data.map(d => d.close || d.nav || 0)

    return data.map((item, index) => ({
      ...item,
      date: item.date?.slice(5) || '',
      ma5: showMA ? calculateMA(closes, 5)[index] : null,
      ma10: showMA ? calculateMA(closes, 10)[index] : null,
      ma20: showMA ? calculateMA(closes, 20)[index] : null,
      bollingerUpper: showBollinger ? calculateBollingerBands(closes, 20, 2).upper[index] : null,
      bollingerMiddle: showBollinger ? calculateBollingerBands(closes, 20, 2).middle[index] : null,
      bollingerLower: showBollinger ? calculateBollingerBands(closes, 20, 2).lower[index] : null
    }))
  }, [data, showMA, showBollinger])

  if (chartData.length === 0) {
    return <div className="text-gray-500 text-center py-8">暂无数据</div>
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            stroke="#94A3B8"
            tick={{ fontSize: 10 }}
          />
          <YAxis
            stroke="#94A3B8"
            tick={{ fontSize: 10 }}
            domain={['auto', 'auto']}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend />

          {/* 布林带 */}
          {showBollinger && (
            <>
              <Line
                type="monotone"
                dataKey="bollingerUpper"
                stroke={COLORS.bollingerUpper}
                strokeDasharray="3 3"
                dot={false}
                name="布林上轨"
              />
              <Line
                type="monotone"
                dataKey="bollingerMiddle"
                stroke={COLORS.bollingerMiddle}
                dot={false}
                name="布林中轨"
              />
              <Line
                type="monotone"
                dataKey="bollingerLower"
                stroke={COLORS.bollingerLower}
                strokeDasharray="3 3"
                dot={false}
                name="布林下轨"
              />
            </>
          )}

          {/* 均线 */}
          {showMA && (
            <>
              <Line
                type="monotone"
                dataKey="ma5"
                stroke={COLORS.ma5}
                dot={false}
                name="MA5"
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="ma10"
                stroke={COLORS.ma10}
                dot={false}
                name="MA10"
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="ma20"
                stroke={COLORS.ma20}
                dot={false}
                name="MA20"
                strokeWidth={1}
              />
            </>
          )}

          {/* 价格线 */}
          <Line
            type="monotone"
            dataKey="nav"
            stroke={COLORS.price}
            dot={false}
            name="净值"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * MACD 图
 */
export function MACDChart({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const closes = data.map(d => d.close || d.nav || 0)
    const { dif, dea, macd } = calculateMACD(closes)

    return data.map((item, index) => ({
      date: item.date?.slice(5) || '',
      dif: dif[index] ? parseFloat(dif[index].toFixed(4)) : null,
      dea: dea[index] ? parseFloat(dea[index].toFixed(4)) : null,
      macd: macd[index] ? parseFloat(macd[index].toFixed(4)) : null
    }))
  }, [data])

  if (chartData.length === 0) {
    return <div className="text-gray-500 text-center py-8">暂无数据</div>
  }

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            stroke="#94A3B8"
            tick={{ fontSize: 10 }}
          />
          <YAxis
            stroke="#94A3B8"
            tick={{ fontSize: 10 }}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend />
          <ReferenceLine y={0} stroke="#94A3B8" />

          {/* MACD 柱 */}
          <Bar
            dataKey="macd"
            name="MACD柱"
            fill={COLORS.macdPositive}
          />

          {/* DIF 线 */}
          <Line
            type="monotone"
            dataKey="dif"
            stroke={COLORS.dif}
            dot={false}
            name="DIF"
            strokeWidth={1.5}
          />

          {/* DEA 线 */}
          <Line
            type="monotone"
            dataKey="dea"
            stroke={COLORS.dea}
            dot={false}
            name="DEA"
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * RSI 图
 */
export function RSIChart({ data, period = 14 }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const closes = data.map(d => d.close || d.nav || 0)
    const rsi = calculateRSI(closes, period)

    return data.map((item, index) => ({
      date: item.date?.slice(5) || '',
      rsi: rsi[index] ? parseFloat(rsi[index].toFixed(2)) : null
    }))
  }, [data, period])

  if (chartData.length === 0) {
    return <div className="text-gray-500 text-center py-8">暂无数据</div>
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            stroke="#94A3B8"
            tick={{ fontSize: 10 }}
          />
          <YAxis
            stroke="#94A3B8"
            tick={{ fontSize: 10 }}
            domain={[0, 100]}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend />

          {/* 超买超卖线 */}
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '超买', fill: '#ef4444', fontSize: 10 }} />
          <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '超卖', fill: '#22c55e', fontSize: 10 }} />

          {/* RSI 线 */}
          <Line
            type="monotone"
            dataKey="rsi"
            stroke={COLORS.rsi}
            dot={false}
            name={`RSI(${period})`}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * 技术指标选择器
 */
export function TechnicalIndicatorSelector({ selectedIndicators, onChange }) {
  const indicators = [
    { id: 'ma', name: '均线', description: 'MA5/MA10/MA20' },
    { id: 'bollinger', name: '布林带', description: '20日布林带' },
    { id: 'macd', name: 'MACD', description: '异同移动平均' },
    { id: 'rsi', name: 'RSI', description: '相对强弱指数' }
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {indicators.map(indicator => (
        <button
          key={indicator.id}
          onClick={() => {
            const newSelected = selectedIndicators.includes(indicator.id)
              ? selectedIndicators.filter(i => i !== indicator.id)
              : [...selectedIndicators, indicator.id]
            onChange(newSelected)
          }}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            selectedIndicators.includes(indicator.id)
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {indicator.name}
        </button>
      ))}
    </div>
  )
}

/**
 * 完整技术分析图表
 */
export function TechnicalAnalysisChart({ data, title = '技术分析' }) {
  const [selectedIndicators, setSelectedIndicators] = useState(['ma'])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <TechnicalIndicatorSelector
          selectedIndicators={selectedIndicators}
          onChange={setSelectedIndicators}
        />
      </div>

      {/* 主图：K线 + 均线/布林带 */}
      <CandlestickChart
        data={data}
        showMA={selectedIndicators.includes('ma')}
        showBollinger={selectedIndicators.includes('bollinger')}
      />

      {/* MACD 副图 */}
      {selectedIndicators.includes('macd') && (
        <div className="mt-4">
          <h4 className="text-sm text-gray-500 mb-2">MACD</h4>
          <MACDChart data={data} />
        </div>
      )}

      {/* RSI 副图 */}
      {selectedIndicators.includes('rsi') && (
        <div className="mt-4">
          <h4 className="text-sm text-gray-500 mb-2">RSI</h4>
          <RSIChart data={data} />
        </div>
      )}
    </div>
  )
}

export default TechnicalAnalysisChart
