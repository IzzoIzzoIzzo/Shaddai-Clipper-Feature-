import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useUIStore, type Toast } from '@/stores/uiStore'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  progress: Loader2,
}

const colorMap = {
  success: 'border-l-success bg-success-light text-success',
  error: 'border-l-danger bg-danger-light text-danger',
  warning: 'border-l-warning bg-warning-light text-warning',
  info: 'border-l-info bg-info-light text-info',
  progress: 'border-l-primary bg-primary-light text-primary',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(onDismiss, toast.duration || 4000)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, onDismiss])

  const Icon = iconMap[toast.type]

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4 animate-slide-in-right',
        colorMap[toast.type]
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', toast.type === 'progress' && 'animate-spin')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.message && <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs font-medium underline mt-1 opacity-80 hover:opacity-100"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
