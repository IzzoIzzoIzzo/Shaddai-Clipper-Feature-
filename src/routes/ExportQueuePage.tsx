import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn, formatDate, getPlatformIcon } from '@/lib/utils'
import {
  RefreshCw, ExternalLink, XCircle, CheckCircle, Clock,
  Send, Download, Film, Plus, Clapperboard,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'
import type { BadgeProps } from '@/components/ui/badge'

// ── types ──────────────────────────────────────────────────────────────────
interface ExportItem {
  id: string
  clipId: string
  clipTitle: string
  platform: string
  icon: string
  status: 'pending' | 'exporting' | 'published' | 'failed'
  downloadUrl?: string
  externalUrl?: string
  errorMessage?: string
  publishedAt: string
}

// ── constants ───────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'pending',   label: 'Pending' },
  { id: 'exporting', label: 'In Progress' },
  { id: 'published', label: 'Ready' },
  { id: 'failed',    label: 'Failed' },
]

type StatusKey = 'pending' | 'exporting' | 'published' | 'failed'

const STATUS_CONFIG: Record<StatusKey, {
  icon: React.ElementType
  color: string
  bg: string
  label: string
}> = {
  pending:   { icon: Clock,        color: 'text-warning',  bg: 'bg-warning-light',  label: 'Pending' },
  exporting: { icon: RefreshCw,    color: 'text-info',     bg: 'bg-info-light',     label: 'Exporting' },
  published: { icon: CheckCircle,  color: 'text-success',  bg: 'bg-success-light',  label: 'Ready' },
  failed:    { icon: XCircle,      color: 'text-danger',   bg: 'bg-danger-light',   label: 'Failed' },
}

const BADGE_VARIANT: Record<StatusKey, BadgeProps['variant']> = {
  pending:   'warning',
  exporting: 'info',
  published: 'success',
  failed:    'danger',
}

const PLATFORM_OPTIONS = ['tiktok', 'reels', 'youtube_shorts', 'x', 'linkedin']

// ── component ───────────────────────────────────────────────────────────────
export function ExportQueuePage() {
  const navigate        = useNavigate()
  const addToast        = useUIStore((s) => s.addToast)
  const rawExports      = useClipsStore((s) => s.exports)
  const clips           = useClipsStore((s) => s.clips)
  const enqueueExport   = useClipsStore((s) => s.enqueueExport)
  const [filter, setFilter]         = useState('all')
  const [showEnqueue, setShowEnqueue] = useState(false)
  const [selectedClip, setSelectedClip] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok')

  // Join exports with clip titles + download URLs
  const exports: ExportItem[] = rawExports.map((e, i) => {
    const clip = clips.find((c) => c.clipId === e.clipId)
    const platformAsset = clip?.platformAssets?.[e.platform]
    return {
      id:           `${e.clipId}_${e.platform}_${i}`,
      clipId:       e.clipId,
      clipTitle:    clip?.title ?? 'Untitled clip',
      platform:     e.platform,
      icon:         getPlatformIcon(e.platform),
      status:       e.status as StatusKey,
      downloadUrl:  platformAsset?.videoUrl,
      externalUrl:  e.externalUrl,
      errorMessage: e.errorMessage,
      publishedAt:  e.publishedAt ?? new Date().toISOString(),
    }
  })

  const filtered = filter === 'all' ? exports : exports.filter((e) => e.status === filter)

  const counts = exports.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1
    return acc
  }, {})

  const handleRetry = (item: ExportItem) => {
    enqueueExport(item.clipId, item.platform)
    addToast({ type: 'info', title: 'Retrying export…', message: `${item.clipTitle} → ${item.platform}`, duration: 3000 })
  }

  const handleEnqueue = () => {
    if (!selectedClip || !selectedPlatform) return
    const clip = clips.find((c) => c.clipId === selectedClip)
    enqueueExport(selectedClip, selectedPlatform)
    addToast({ type: 'success', title: 'Added to dock', message: `${clip?.title ?? 'Clip'} queued for ${selectedPlatform}`, duration: 3000 })
    setShowEnqueue(false)
    setSelectedClip('')
  }

  // Clips that have platform assets available for export
  const exportableClips = clips.filter((c) => Object.keys(c.platformAssets ?? {}).length > 0 || c.status === 'approved')

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">
            Shipping Dock
          </p>
          <h2 className="text-2xl font-display font-bold tracking-tight">Export Queue</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Rendered clips ready for download or publish
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Summary pill */}
          {exports.length > 0 && (
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
              <Film className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">
                {exports.length} export{exports.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {/* Enqueue new export */}
          {clips.length > 0 && (
            <Button size="sm" onClick={() => setShowEnqueue((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              Add Export
            </Button>
          )}
        </div>
      </div>

      {/* ── Quick-enqueue panel ── */}
      {showEnqueue && (
        <Card className="border-primary/30 bg-primary-light/30 animate-slide-up">
          <CardContent className="p-4">
            <p className="font-mono text-xs text-primary tracking-widest uppercase mb-3">
              — Enqueue Export —
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Clip</label>
                <select
                  value={selectedClip}
                  onChange={(e) => setSelectedClip(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="">Select clip…</option>
                  {clips.map((c) => (
                    <option key={c.clipId} value={c.clipId}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="flex h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>{getPlatformIcon(p)} {p}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleEnqueue} disabled={!selectedClip} size="sm">
                  <Send className="h-3.5 w-3.5" />
                  Enqueue
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEnqueue(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Film-strip divider ── */}
      <div className="film-strip rounded-full" />

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count = tab.id === 'all' ? exports.length : counts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                filter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface',
              )}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  'font-mono text-[10px] leading-none px-1.5 py-0.5 rounded-full',
                  filter === tab.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Export list ── */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((item, i) => {
            const cfg  = STATUS_CONFIG[item.status as StatusKey] ?? STATUS_CONFIG.pending
            const Icon = cfg.icon

            // Resolve download URL: prefer clip's platformAssets, fall back to externalUrl
            const resolvedDownloadUrl = item.downloadUrl ?? (
              (() => {
                const clip = clips.find((c) => c.clipId === item.clipId)
                return clip?.platformAssets?.[item.platform]?.videoUrl
              })()
            )

            return (
              <Card
                key={item.id}
                className={cn(
                  'card-hover border-border/60 overflow-hidden',
                  `animate-fade-in stagger-${Math.min(i + 1, 8)}`,
                )}
              >
                {/* Slim status accent bar on the left */}
                <div className="flex">
                  <div className={cn(
                    'w-0.5 shrink-0',
                    item.status === 'published' && 'bg-success',
                    item.status === 'exporting' && 'bg-info scan-line',
                    item.status === 'pending'   && 'bg-warning',
                    item.status === 'failed'    && 'bg-danger',
                  )} />

                  <CardContent className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-3">

                      {/* Status icon + info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('p-2 rounded-lg mt-0.5 shrink-0', cfg.bg)}>
                          <Icon className={cn(
                            'h-3.5 w-3.5',
                            item.status === 'exporting' && 'animate-spin',
                            cfg.color,
                          )} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{item.clipTitle}</p>
                            <Badge size="sm" variant={BADGE_VARIANT[item.status as StatusKey] ?? 'default'}>
                              {cfg.label}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="text-sm">{item.icon}</span>
                            <span className="capitalize font-mono">{item.platform}</span>
                            <span className="text-border">·</span>
                            <span>{formatDate(item.publishedAt)}</span>
                          </p>

                          {item.errorMessage && (
                            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
                              <XCircle className="h-3 w-3 shrink-0" />
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Download anchor — uses platformAssets[platform].videoUrl */}
                        {item.status === 'published' && resolvedDownloadUrl && (
                          <a
                            href={resolvedDownloadUrl}
                            download
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface border border-border hover:bg-muted transition-colors text-foreground"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        )}

                        {/* External link */}
                        {item.status === 'published' && item.externalUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(item.externalUrl, '_blank')}
                            title="View published"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Retry failed */}
                        {item.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(item)}
                            title="Retry export"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            )
          })
        ) : (
          <Card>
            <EmptyState
              icon={<Clapperboard />}
              title={filter === 'all' ? 'Nothing in the dock' : `No ${filter} exports`}
              description={
                filter === 'all'
                  ? 'Approve clips and hit Export to see them queue up here.'
                  : `Switch to "All" to see your full export history.`
              }
              action={
                filter === 'all'
                  ? { label: 'Go to Sources', onClick: () => navigate('/clips/sources') }
                  : { label: 'Show all', onClick: () => setFilter('all') }
              }
            />
          </Card>
        )}
      </div>

      {/* ── Footer hint ── */}
      {exports.length > 0 && (
        <p className="text-xs text-muted-foreground/50 font-mono text-center pt-2">
          {exports.filter((e) => e.status === 'published').length} / {exports.length} shipped
        </p>
      )}
    </div>
  )
}
