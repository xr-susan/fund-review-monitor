import { useToastStore } from '../store/toastStore'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle
}

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-primary-50 border-primary-200 text-primary-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800'
}

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-primary-500',
  warning: 'text-amber-500'
}

export default function Toast() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => {
        const Icon = iconMap[toast.type] || Info
        const colorClass = colorMap[toast.type] || colorMap.info
        const iconColorClass = iconColorMap[toast.type] || iconColorMap.info

        return (
          <div
            key={toast.id}
            className={`${colorClass} px-4 py-3 rounded-xl shadow-dropdown border
              flex items-start gap-3 animate-slide-in`}
            role="alert"
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColorClass}`} />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
