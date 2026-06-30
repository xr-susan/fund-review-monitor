import { useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Download, RotateCcw, Crosshair, Move } from 'lucide-react'

/**
 * 图表工具栏
 */
export function ChartToolbar({ onZoomIn, onZoomOut, onReset, onDownload, onFullscreen }) {
  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={onZoomIn}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="放大"
      >
        <ZoomIn className="w-4 h-4 text-gray-500" />
      </button>
      <button
        onClick={onZoomOut}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="缩小"
      >
        <ZoomOut className="w-4 h-4 text-gray-500" />
      </button>
      <button
        onClick={onReset}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="重置"
      >
        <RotateCcw className="w-4 h-4 text-gray-500" />
      </button>
      <div className="w-px h-4 bg-gray-200" />
      <button
        onClick={onDownload}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="下载图表"
      >
        <Download className="w-4 h-4 text-gray-500" />
      </button>
      <button
        onClick={onFullscreen}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="全屏"
      >
        <Maximize2 className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  )
}

/**
 * 时间周期选择器
 */
export function TimeframeSelector({ value, onChange }) {
  const timeframes = [
    { id: '1D', label: '1日' },
    { id: '1W', label: '1周' },
    { id: '1M', label: '1月' },
    { id: '3M', label: '3月' },
    { id: '6M', label: '6月' },
    { id: '1Y', label: '1年' },
    { id: 'ALL', label: '全部' }
  ]

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      {timeframes.map(tf => (
        <button
          key={tf.id}
          onClick={() => onChange(tf.id)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            value === tf.id
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}

/**
 * 图表类型选择器
 */
export function ChartTypeSelector({ value, onChange }) {
  const types = [
    { id: 'line', label: '折线图', icon: '📈' },
    { id: 'area', label: '面积图', icon: '📊' },
    { id: 'candle', label: 'K线图', icon: '🕯️' }
  ]

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      {types.map(type => (
        <button
          key={type.id}
          onClick={() => onChange(type.id)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            value === type.id
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          title={type.label}
        >
          {type.icon}
        </button>
      ))}
    </div>
  )
}

/**
 * 十字光标信息
 */
export function CrosshairInfo({ data, x, y, visible }) {
  if (!visible || !data) return null

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{ left: x + 10, top: y - 10 }}
    >
      <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow-lg">
        <div className="text-gray-500">{data.date}</div>
        <div className="text-gray-900">净值: {data.nav?.toFixed(4)}</div>
        {data.change !== undefined && (
          <div className={data.change >= 0 ? 'text-red-600' : 'text-green-600'}>
            涨跌: {data.change >= 0 ? '+' : ''}{data.change?.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 图表导出工具
 */
export function useChartExport(chartRef) {
  const exportToPNG = useCallback(() => {
    if (!chartRef.current) return

    const svg = chartRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      const link = document.createElement('a')
      link.download = `chart-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [chartRef])

  const exportToCSV = useCallback((data, filename = 'data') => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `${filename}-${Date.now()}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }, [])

  return { exportToPNG, exportToCSV }
}

/**
 * 图表缩放控制
 */
export function useChartZoom(initialDomain = { start: 0, end: 100 }) {
  const [domain, setDomain] = useState(initialDomain)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef(null)

  const zoomIn = useCallback(() => {
    setDomain(prev => ({
      start: prev.start + (prev.end - prev.start) * 0.1,
      end: prev.end - (prev.end - prev.start) * 0.1
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setDomain(prev => ({
      start: Math.max(0, prev.start - (prev.end - prev.start) * 0.1),
      end: Math.min(100, prev.end + (prev.end - prev.start) * 0.1)
    }))
  }, [])

  const reset = useCallback(() => {
    setDomain(initialDomain)
  }, [initialDomain])

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true)
    dragStart.current = e.clientX
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart.current) return

    const diff = e.clientX - dragStart.current
    const range = domain.end - domain.start
    const shift = (diff / 500) * range // 500px 为假设的图表宽度

    setDomain(prev => ({
      start: Math.max(0, prev.start - shift),
      end: Math.min(100, prev.end - shift)
    }))

    dragStart.current = e.clientX
  }, [isDragging, domain])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStart.current = null
  }, [])

  return {
    domain,
    zoomIn,
    zoomOut,
    reset,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp
    }
  }
}

/**
 * 数据标注组件
 */
export function DataAnnotations({ annotations, yScale }) {
  if (!annotations || annotations.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {annotations.map((ann, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: `${ann.x}%`,
            top: `${ann.y}%`
          }}
        >
          {ann.type === 'buy' && (
            <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-green-300" title={ann.label} />
          )}
          {ann.type === 'sell' && (
            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-red-300" title={ann.label} />
          )}
          {ann.type === 'note' && (
            <div className="bg-yellow-100 text-yellow-700 text-xs px-1 rounded" title={ann.label}>
              📝
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * 对比模式选择器
 */
export function CompareModeSelector({ value, onChange }) {
  const modes = [
    { id: 'absolute', label: '绝对值' },
    { id: 'relative', label: '相对值' },
    { id: 'normalized', label: '归一化' }
  ]

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-500">对比模式:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700"
      >
        {modes.map(mode => (
          <option key={mode.id} value={mode.id}>{mode.label}</option>
        ))}
      </select>
    </div>
  )
}

/**
 * 图表图例
 */
export function ChartLegend({ items, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onToggle?.(item.id)}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
            item.visible !== false
              ? 'bg-gray-100 text-gray-700'
              : 'bg-gray-50 text-gray-400'
          }`}
        >
          <div
            className="w-3 h-0.5 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export default {
  ChartToolbar,
  TimeframeSelector,
  ChartTypeSelector,
  CrosshairInfo,
  useChartExport,
  useChartZoom,
  DataAnnotations,
  CompareModeSelector,
  ChartLegend
}
