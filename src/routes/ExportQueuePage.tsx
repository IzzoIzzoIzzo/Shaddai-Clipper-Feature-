import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { cn, formatDate, getPlatformIcon } from '@/lib/utils'
import { RefreshCw, ExternalLink, XCircle, CheckCircle, Clock, Send } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'

interface ExportItem {
  id: string
  clipTitle: string
  platform: string
  icon: string
  status: 'pending' | 'exporting' | 'published' | 'failed'
  externalUrl?: string
  errorMessage?: string
  createdAt: string
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'exporting', label: 'In Progress' },
  { id: 'published', label: 'Published' },
  { id: 'failed', label: 'Failed' },
]

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning-light' },
  exporting: { icon: RefreshCw, color: 'text-info', bg: 'bg-info-light' },
  published: { icon: CheckCircle, color: 'text-success', bg: 'bg-success-light' },
  failed: { icon: XCircle, color: 'text-danger', bg: 'bg-danger-light' },
}

export function ExportQueuePage() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const rawExports = useClipsStore((s) => s.exports)
  const clips = useClipsStore((s) => s.clips)
  const enqueueExport = useClipsStore((s) => s.enqueueExport)
  const [filter, setFilter] = useState('all')

  const exports: ExportItem[] = rawExports.map((e, i) => ({
    id: `${e.clipId}_${e.platform}_${i}`,
    clipTitle: clips.find((c) => c.clipId === e.clipId)?.title || 'Untitled clip',
    platform: e.platform,
    icon: getPlatformIcon(e.platform),
    status: e.status,
    externalUrl: e.externalUrl,
    errorMessage: e.errorMessage,
    createdAt: e.publishedAt || new Date().toISOString(),
    clipId: e.clipId,
  } as ExportItem & { clipId: string }))

  const filtered = filter === 'all' ? exports : exports.filter((e) => e.status === filter)

  const handleRetry = (item: ExportItem & { clipId?: string }) => {
    if (item.clipId) enqueueExport(item.clipId, item.platform)
    addToast({ type: 'info', title: 'Retrying export...', message: `${item.clipTitle} to ${item.platform}`, duration: 3000 })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Export Queue</h2>
          <p className="text-muted-foreground mt-1">Track your clip exports to social platforms</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs tabs={FILTER_TABS} activeTab={filter} onChange={setFilter} variant="pills" />

      {/* Export List */}
      <div className="space-y-3">
        {filtered.length > 0 ? filtered.map((item, i) => {
          const config = statusConfig[item.status] || { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' }
          const Icon = config.icon
          return (
            <Card
              key={item.id}
              className={cn('card-hover', `animate-fade-in stagger-${i + 1}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg mt-0.5', config.bg)}>
                      <Icon className={cn('h-4 w-4', item.status === 'exporting' && 'animate-spin', config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{item.clipTitle}</p>
                        <Badge
                          size="sm"
                          variant={
                            item.status === 'published' ? 'success' :
                            item.status === 'exporting' ? 'info' :
                            item.status === 'failed' ? 'danger' : 'warning'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span className="text-base">{item.icon}</span>
                        <span className="capitalize">{item.platform}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </p>
                      {item.errorMessage && (
                        <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
                          <XCircle className="h-3 w-3 shrink-0" />
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.status === 'published' && item.externalUrl && (
                      <Button variant="ghost" size="sm" onClick={() => window.open(item.externalUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {item.status === 'failed' && (
                      <Button variant="ghost" size="sm" onClick={() => handleRetry(item)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        }) : (
          <Card className="p-16 text-center animate-fade-in">
            <Send className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">
              {filter === 'all'
                ? 'No exports yet. Approve and export your clips to see them here.'
                : `No ${filter} exports.`}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/clips/sources')}>
              Go to Sources
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
