import { useState, useMemo } from 'react'
import { Download, X, FileSpreadsheet, FileText, Check } from 'lucide-react'

/**
 * 字段配置
 */
const FIELD_CONFIGS = {
  funds: [
    { key: 'code', label: '基金代码', default: true },
    { key: 'name', label: '基金名称', default: true },
    { key: 'nav', label: '当前净值', default: true },
    { key: 'estimateNav', label: '估算净值', default: true },
    { key: 'estimateChange', label: '估算涨跌%', default: true },
    { key: 'dayChange', label: '日涨跌%', default: true },
    { key: 'weekChange', label: '周涨跌%', default: false },
    { key: 'monthChange', label: '月涨跌%', default: false },
    { key: 'yearChange', label: '年涨跌%', default: false },
    { key: 'manager', label: '基金经理', default: false },
    { key: 'type', label: '基金类型', default: false },
    { key: 'navDate', label: '净值日期', default: false }
  ],
  holdings: [
    { key: 'code', label: '股票代码', default: true },
    { key: 'name', label: '股票名称', default: true },
    { key: 'weight', label: '持仓占比%', default: true },
    { key: 'price', label: '当前价格', default: true },
    { key: 'change', label: '涨跌%', default: true },
    { key: 'pe', label: '市盈率PE', default: true },
    { key: 'pb', label: '市净率PB', default: false },
    { key: 'industry', label: '所属行业', default: false }
  ],
  notes: [
    { key: 'date', label: '日期', default: true },
    { key: 'fundCode', label: '基金代码', default: true },
    { key: 'fundName', label: '基金名称', default: true },
    { key: 'type', label: '操作类型', default: true },
    { key: 'reason', label: '买入理由', default: true },
    { key: 'expectedReturn', label: '预期收益%', default: true },
    { key: 'stopLoss', label: '止损%', default: true },
    { key: 'holdingPeriod', label: '持有周期', default: false },
    { key: 'actualReturn', label: '实际收益%', default: false },
    { key: 'status', label: '状态', default: false },
    { key: 'tags', label: '标签', default: false }
  ]
}

/**
 * 数据导出弹窗
 * 支持 CSV 和 Excel 格式，可自定义导出字段
 */
const ExportModal = ({ isOpen, onClose, exportType = 'funds', data = [], onExport }) => {
  const [format, setFormat] = useState('csv')
  const [selectedFields, setSelectedFields] = useState(
    FIELD_CONFIGS[exportType]?.filter(f => f.default).map(f => f.key) || []
  )
  const [exporting, setExporting] = useState(false)

  const fields = FIELD_CONFIGS[exportType] || []

  const toggleField = (key) => {
    setSelectedFields(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }

  const selectAll = () => {
    setSelectedFields(fields.map(f => f.key))
  }

  const deselectAll = () => {
    setSelectedFields([])
  }

  // 生成 CSV 内容
  const generateCSV = () => {
    const headers = fields
      .filter(f => selectedFields.includes(f.key))
      .map(f => f.label)

    const rows = data.map(item =>
      fields
        .filter(f => selectedFields.includes(f.key))
        .map(f => {
          const value = item[f.key]
          if (Array.isArray(value)) return value.join(' ')
          if (value === null || value === undefined) return ''
          return String(value)
        })
    )

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return '﻿' + csvContent // 添加 BOM 支持中文
  }

  // 生成 Excel 格式（使用简单的 HTML 表格，可被 Excel 打开）
  const generateExcelHTML = () => {
    const headers = fields
      .filter(f => selectedFields.includes(f.key))
      .map(f => f.label)

    const rows = data.map(item =>
      fields
        .filter(f => selectedFields.includes(f.key))
        .map(f => {
          const value = item[f.key]
          if (Array.isArray(value)) return value.join(' ')
          if (value === null || value === undefined) return ''
          return String(value)
        })
    )

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>基金数据</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            th { background-color: #4472C4; color: white; font-weight: bold; }
            td { border: 1px solid #D9D9D9; }
            tr:nth-child(even) { background-color: #F2F2F2; }
          </style>
        </head>
        <body>
          <table>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </table>
        </body>
      </html>
    `
    return html
  }

  // 执行导出
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert('请至少选择一个导出字段')
      return
    }

    setExporting(true)

    try {
      let content, mimeType, extension

      if (format === 'csv') {
        content = generateCSV()
        mimeType = 'text/csv;charset=utf-8'
        extension = 'csv'
      } else {
        content = generateExcelHTML()
        mimeType = 'application/vnd.ms-excel;charset=utf-8'
        extension = 'xls'
      }

      // 创建下载链接
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `基金数据_${exportType}_${new Date().toISOString().slice(0, 10)}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // 调用回调
      if (onExport) {
        onExport({ format, fields: selectedFields })
      }

      onClose()
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">导出数据</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 格式选择 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('csv')}
              className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-colors ${
                format === 'csv'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className={`w-6 h-6 ${format === 'csv' ? 'text-primary-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="font-medium text-gray-900">CSV</div>
                <div className="text-xs text-gray-500">通用格式，体积小</div>
              </div>
            </button>
            <button
              onClick={() => setFormat('excel')}
              className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-colors ${
                format === 'excel'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileSpreadsheet className={`w-6 h-6 ${format === 'excel' ? 'text-primary-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="font-medium text-gray-900">Excel</div>
                <div className="text-xs text-gray-500">支持格式化</div>
              </div>
            </button>
          </div>
        </div>

        {/* 字段选择 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">选择导出字段</label>
            <div className="flex space-x-2">
              <button
                onClick={selectAll}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                全选
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={deselectAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                清空
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-xl">
            {fields.map(field => (
              <label
                key={field.key}
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedFields.includes(field.key)
                    ? 'bg-white shadow-sm'
                    : 'hover:bg-white/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.key)}
                  onChange={() => toggleField(field.key)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{field.label}</span>
              </label>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            已选择 {selectedFields.length} / {fields.length} 个字段
          </div>
        </div>

        {/* 数据预览 */}
        <div className="mb-5">
          <div className="text-sm font-medium text-gray-700 mb-2">数据预览</div>
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl">
            共 {data.length} 条数据将被导出
          </div>
        </div>

        {/* 导出按钮 */}
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={exporting || selectedFields.length === 0}
            className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>导出中...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>导出 {format === 'csv' ? 'CSV' : 'Excel'}</span>
              </>
            )}
          </button>
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
