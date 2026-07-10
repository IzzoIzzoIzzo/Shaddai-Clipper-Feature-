import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { PIPELINE_STAGES, PLATFORMS } from '@/lib/constants'
import { cn, formatDuration, getPlatformIcon } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Sparkles,
  UploadCloud,
  Clapperboard,
  PlayCircle,
} from 'lucide-react'
import { useClipsStore } from '@/stores/clipsStore'
import type { Clip } from '@/types/api'

const API = '/api/clips/v1'

// Normalize a raw engine clip (platformAssets may be string URLs or {videoUrl} objects)
// into the store's Clip shape so download buttons can read .videoUrl.
function hydrateClip(c: any, sourceId: string, batchId: string): Clip {
  const platformAssets: Record<string, { videoUrl?: string }> = {}
  for (const [p, v] of Object.entries(c.platformAssets || {})) {
    platformAssets[p] = typeof v === 'string' ? { videoUrl: v as string } : (v as any)
  }
  const narr = c.narration || {}
  return {
    clipId: c.clipId,
    sourceId,
    batchId,
    userRating: null,
    title: c.title || 'Clip',
    startSec: c.startSec || 0,
    endSec: c.endSec || 0,
    durationSec: c.durationSec || 0,
    compositeScore: c.compositeScore || 0,
    hooks: narr.hook ? { curiosity: narr.hook } : {},
    captions: { primary: narr.caption || c.summarySentence || '', secondary: '' },
    hashtags: { core: narr.hashtags || [], niche: [], brand: [] },
    platformAssets,
    coverUrl: c.coverUrl,
    status: (c.status as Clip['status']) || 'draft',
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

const stageOrder = PIPELINE_STAGES.map((s) => s.id) as string[]

const platformLabel = (id: string) =>
  PLATFORMS.find((p) => p.id === id)?.label ?? id

function clipBadgeVariant(status: string): 'success' | 'danger' | 'info' | 'warning' | 'default' {
  if (status === 'draft' || status === 'approved' || status === 'exported') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'rendering' || status === 'generating') return 'info'
  return 'default'
}

function isReady(clip: Clip) {
  return (
    clip.status === 'draft' ||
    clip.status === 'approved' ||
    clip.status === 'exported'
  )
}

// ── RenderBayHeader ───────────────────────────────────────────────────────────

function RenderBayHeader({
  progressPct,
  currentStage,
  totalClipsGenerated,
  totalClipsRequested,
  status,
}: {
  progressPct: number
  currentStage: string
  totalClipsGenerated: number
  totalClipsRequested: number
  status: string
}) {
  const isProcessing = status !== 'reviewing' && status !== 'completed' && status !== 'failed'
  const isFailed = status === 'failed'
  const isDone = !isProcessing && !isFailed

  return (
    <div className="animate-fade-in space-y-5">
      {/* Top meta row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isProcessing && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-secondary uppercase tracking-[0.18em]">
              <span className="rec-dot inline-block w-1.5 h-1.5 rounded-full bg-secondary" />
              Live Render
            </span>
          )}
          {isFailed && (
            <span className="text-[11px] font-mono text-danger uppercase tracking-[0.18em]">
              Pipeline Failed
            </span>
          )}
          {isDone && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-success uppercase tracking-[0.18em]">
              <CheckCircle2 className="w-3 h-3" />
              Developed
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-muted-foreground tracking-[0.12em]">
          BATCH ·{' '}
          <span className="text-foreground tabular-nums">
            {(totalClipsRequested ?? 0).toString().padStart(2, '0')}
          </span>
        </span>
      </div>

      {/* Big percentage + clip counter */}
      <div className="flex items-end gap-4">
        {/* Giant numeral */}
        <div className="relative">
          <span
            className={cn(
              'font-display text-8xl font-black leading-none tabular-nums',
              isDone ? 'gradient-text' : isFailed ? 'text-danger' : 'gradient-text',
            )}
          >
            {Math.round(progressPct)}
          </span>
          <span className="font-display text-3xl font-black text-muted-foreground/30 ml-0.5 mb-1.5 inline-block">
            %
          </span>
        </div>

        {/* Vertical divider */}
        <div className="w-px h-12 bg-border self-center mx-1" />

        {/* Right stats stack */}
        <div className="flex flex-col gap-1 pb-1.5">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
            Clips Developed
          </p>
          <p className="font-display text-2xl font-black leading-none">
            <span className={isDone ? 'text-success' : 'text-foreground'}>{totalClipsGenerated}</span>
            <span className="text-muted-foreground/40 text-lg"> / {totalClipsRequested}</span>
          </p>
        </div>

        {/* Stage label — pushed right */}
        <div className="ml-auto pb-1.5 text-right">
          {isProcessing && (
            <div className="flex flex-col gap-1 items-end">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                Current Stage
              </p>
              <p className="font-mono text-sm text-primary capitalize tracking-wide">
                <Loader2 className="inline w-3 h-3 animate-spin mr-1" />
                {currentStage}
              </p>
            </div>
          )}
          {isFailed && (
            <p className="font-mono text-xs text-danger">Check logs ↓</p>
          )}
          {isDone && (
            <div className="flex flex-col gap-1 items-end">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                Status
              </p>
              <p className="font-mono text-sm text-success tracking-wide">
                Ready for Export
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar — scan-line while active */}
      <div className={cn('rounded-xl overflow-hidden', isProcessing && 'scan-line')}>
        <ProgressBar
          value={progressPct}
          size="lg"
          className="mb-0"
          barClassName={cn(
            'transition-all duration-700',
            isProcessing
              ? 'bg-gradient-to-r from-primary via-info to-primary bg-[length:200%_100%]'
              : isDone
              ? 'bg-gradient-to-r from-primary to-success'
              : 'bg-danger',
          )}
        />
      </div>

      {/* Stage + percentage label below bar */}
      <p className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
        {isProcessing ? (
          <>
            <span className="text-primary">{Math.round(progressPct)}%</span>
            <span className="text-border mx-0.5">·</span>
            {currentStage === 'generating'
              ? `generating clips ${totalClipsGenerated}/${totalClipsRequested}`
              : `stage: ${currentStage}`}
          </>
        ) : isFailed ? (
          <span className="text-danger">Pipeline error — check logs</span>
        ) : (
          <span className="text-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            All {totalClipsGenerated} clip{totalClipsGenerated !== 1 ? 's' : ''} developed — ready for export
          </span>
        )}
      </p>
    </div>
  )
}

// ── PipelineStepper ───────────────────────────────────────────────────────────

function PipelineStepper({ currentStage }: { currentStage: string }) {
  const currentIdx = stageOrder.indexOf(currentStage)

  return (
    <div className="animate-slide-up stagger-2">
      {/* Decorative film-strip header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="film-strip flex-1" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">
          Pipeline
        </span>
        <div className="film-strip flex-1" />
      </div>

      {/* Step dots */}
      <div className="flex items-start gap-0">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isPending = idx > currentIdx
          const isLast = idx === PIPELINE_STAGES.length - 1

          return (
            <div key={stage.id} className="flex flex-col items-center flex-1 gap-1.5">
              <div className="relative flex items-center w-full">
                {/* Node */}
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ring-2 transition-all duration-500 z-10',
                    isDone && 'bg-primary ring-primary/40 shadow-[0_0_10px_2px_color-mix(in_srgb,var(--color-primary)_45%,transparent)]',
                    isCurrent && 'bg-card ring-primary animate-pulse-soft shadow-[0_0_14px_3px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]',
                    isPending && 'bg-muted ring-border',
                  )}
                >
                  {isDone && <CheckCircle2 className="w-2 h-2 text-primary-foreground" />}
                  {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                {/* Connector */}
                {!isLast && (
                  <div
                    className={cn(
                      'h-px flex-1 transition-all duration-700',
                      isDone ? 'bg-primary/40' : 'bg-border',
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-[9px] font-mono text-center uppercase tracking-wider leading-tight px-0.5',
                  isCurrent && 'text-primary font-semibold',
                  isDone && 'text-primary/50',
                  isPending && 'text-muted-foreground/30',
                )}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── ClipTrayCard ─────────────────────────────────────────────────────────────

function ClipTrayCard({
  clip,
  index,
  batchPlatforms,
}: {
  clip: Clip
  index: number
  batchPlatforms: string[]
}) {
  const ready = isReady(clip)
  const variant = clipBadgeVariant(clip.status)
  const coverUrl: string | undefined = clip.coverUrl

  const platformsToShow =
    Object.keys(clip.platformAssets).length > 0
      ? Object.keys(clip.platformAssets)
      : batchPlatforms

  // Find a video URL to preview
  const previewVideoUrl: string | undefined = (() => {
    for (const pid of platformsToShow) {
      const asset = clip.platformAssets[pid]
      if (asset?.videoUrl) return asset.videoUrl
    }
    return undefined
  })()

  return (
    <Card
      className={cn(
        'animate-slide-up card-hover overflow-hidden border-border',
        ready && 'gradient-border',
        `stagger-${Math.min(index + 1, 8)}`,
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch gap-0">

          {/* Thumbnail / mini-preview */}
          <div className="relative w-24 flex-shrink-0 bg-surface border-r border-border flex items-center justify-center overflow-hidden">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={clip.title}
                className="w-full h-full object-cover"
              />
            ) : previewVideoUrl ? (
              <video
                src={previewVideoUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <div
                className={cn(
                  'w-full h-full flex items-center justify-center',
                  ready ? 'opacity-70' : 'opacity-25',
                )}
              >
                <Film className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {/* Aspect ratio label overlay */}
            <div className="absolute bottom-1 left-1">
              <span className="text-[8px] font-mono bg-background/80 text-muted-foreground px-1 py-0.5 rounded">
                {platformsToShow[0] === 'x' || platformsToShow[0] === 'linkedin' ? '16:9' : '9:16'}
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-2.5">

            {/* Title + badge */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 font-display">
                {clip.title}
              </p>
              <Badge
                variant={variant}
                size="sm"
                className={cn(
                  'flex-shrink-0 ml-1',
                  !ready && variant === 'info' && 'animate-pulse-soft',
                )}
              >
                {clip.status}
              </Badge>
            </div>

            {/* Caption preview */}
            {clip.captions?.primary && (
              <p className="text-xs text-muted-foreground line-clamp-1 font-mono leading-relaxed">
                "{clip.captions.primary}"
              </p>
            )}

            {/* Duration + platform chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded">
                {formatDuration(clip.durationSec)}
              </span>
              <div className="flex gap-1 flex-wrap">
                {platformsToShow.map((pid) => (
                  <span
                    key={pid}
                    className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground ring-1 ring-border"
                  >
                    {getPlatformIcon(pid)}{' '}
                    <span className="hidden sm:inline">{platformLabel(pid).split(' ')[0]}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Download + preview buttons when ready */}
            {ready && platformsToShow.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5 border-t border-border mt-0.5">
                {platformsToShow.map((pid) => {
                  const asset = clip.platformAssets[pid]
                  const href = asset?.videoUrl ?? undefined
                  if (!href) return null
                  return (
                    <div key={pid} className="flex items-center gap-1.5">
                      <a
                        href={href}
                        download
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all duration-200',
                          'bg-primary-light text-primary ring-1 ring-primary/30',
                          'hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_16px_-4px_var(--color-primary)] hover:scale-[1.03]',
                        )}
                      >
                        <Download className="w-3 h-3" />
                        {getPlatformIcon(pid)}{' '}
                        {PLATFORMS.find((p) => p.id === pid)?.label?.split(' ')[0] ?? pid}
                      </a>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all duration-200',
                          'bg-muted text-muted-foreground ring-1 ring-border',
                          'hover:bg-surface hover:text-foreground',
                        )}
                        title="Preview"
                      >
                        <PlayCircle className="w-3 h-3" />
                      </a>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Still-rendering pulse bar */}
            {!ready && variant === 'info' && (
              <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-info/60 rounded-full shimmer" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── BatchSummarySkeletons ─────────────────────────────────────────────────────

function BatchSummarySkeletons({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={cn('animate-slide-up', `stagger-${Math.min(i + 1, 8)}`)}>
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/4 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-14 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── BatchCompleteHero ─────────────────────────────────────────────────────────

function BatchCompleteHero({
  clipCount,
  onBackToSource,
  onNewUpload,
}: {
  clipCount: number
  onBackToSource: () => void
  onNewUpload: () => void
}) {
  return (
    <div className="animate-scale-in flex flex-col items-center text-center py-10 gap-6">
      {/* Glow icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-primary-light ring-2 ring-primary/40 flex items-center justify-center shadow-[0_0_48px_-8px_var(--color-primary)]">
          <Clapperboard className="w-9 h-9 text-primary" />
        </div>
        <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-success flex items-center justify-center shadow-[0_0_14px_var(--color-success)]">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
        </span>
      </div>

      <div className="space-y-1.5">
        <h2 className="font-display text-3xl font-black gradient-text">Print That.</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          {clipCount} clip{clipCount !== 1 ? 's' : ''}{' '}
          {clipCount !== 1 ? 'have' : 'has'} cleared the gate — download above or start a new session.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Button size="lg" onClick={onNewUpload}>
          <UploadCloud className="w-4 h-4" />
          New Upload
        </Button>
        <Button variant="outline" size="lg" onClick={onBackToSource}>
          <ArrowLeft className="w-4 h-4" />
          Back to Source
        </Button>
      </div>
    </div>
  )
}

// ── FallbackClipRow ───────────────────────────────────────────────────────────

function FallbackClipRow({
  summary,
  index,
}: {
  summary: { clipId: string; title: string; status: string; durationSec: number }
  index: number
}) {
  const variant = clipBadgeVariant(summary.status)
  const ready = variant === 'success'
  const processing = variant === 'info'

  return (
    <Card
      className={cn(
        'card-hover animate-slide-up',
        ready && 'gradient-border',
        `stagger-${Math.min(index + 1, 8)}`,
      )}
    >
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
              ready ? 'bg-success-light' : processing ? 'bg-info-light' : 'bg-muted',
            )}
          >
            {ready ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : processing ? (
              <Loader2 className="w-4 h-4 text-info animate-spin" />
            ) : (
              <Film className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold font-display line-clamp-1">{summary.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{formatDuration(summary.durationSec)}</p>
          </div>
        </div>
        <Badge variant={variant} size="sm" className={cn(processing && 'animate-pulse-soft')}>
          {summary.status}
        </Badge>
      </CardContent>
    </Card>
  )
}

// ── BatchProgressPage ─────────────────────────────────────────────────────────

export function BatchProgressPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()

  const batch = useClipsStore((s) => s.batches.find((b) => b.batchId === batchId))
  const storeClips = useClipsStore((s) => s.clips.filter((c) => c.batchId === batchId))

  // Local-hydrated clips: fetched directly from the engine when the store's s.clips
  // is empty for this batch (happens on page reload because s.clips is not persisted).
  const [hydratedClips, setHydratedClips] = useState<Clip[]>([])

  useEffect(() => {
    if (!batchId) return
    // Only fetch if we have no full clips in the store yet for this batch.
    if (storeClips.length > 0) return
    let cancelled = false
    async function fetchBatch() {
      try {
        const res = await fetch(`${API}/batches/${batchId}`)
        if (!res.ok || cancelled) return
        const d = await res.json()
        const b = d.batch
        if (!b || !b.clips?.length) return
        const mapped = (b.clips as any[]).map((c) => hydrateClip(c, b.sourceId, batchId!))
        if (!cancelled) setHydratedClips(mapped)
      } catch {
        // engine offline — leave hydratedClips empty
      }
    }
    fetchBatch()
    return () => { cancelled = true }
  // Re-run only when batchId changes or storeClips goes from 0 → populated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, storeClips.length])

  // Prefer live store clips (populated by the poller); fall back to one-shot hydrated clips.
  const fullClips = storeClips.length > 0 ? storeClips : hydratedClips

  // Not found
  if (!batch) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <button
          onClick={() => navigate('/clips')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <EmptyState
          icon={<Film />}
          title="Batch not found"
          description="This render batch doesn't exist or has expired. Head back to the dashboard to start a new one."
          action={{ label: 'Go to Dashboard', onClick: () => navigate('/clips') }}
        />
      </div>
    )
  }

  const isDone = batch.status === 'reviewing' || batch.status === 'completed'
  const isFailed = batch.status === 'failed'
  const isQueued = batch.status === 'queued'

  // Choose which clip list to render
  const useFullClips = fullClips.length > 0
  const useBatchSummaries = !useFullClips && batch.clips.length > 0
  const showSkeletons = isQueued && !useFullClips && !useBatchSummaries

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-16">

      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>

      {/* ── RENDER BAY CARD ──────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden border-border',
          !isDone && !isFailed && 'scan-line',
        )}
      >
        <CardContent className="p-6 space-y-7">
          <RenderBayHeader
            progressPct={batch.progressPct}
            currentStage={batch.currentStage}
            totalClipsGenerated={batch.totalClipsGenerated}
            totalClipsRequested={batch.totalClipsRequested}
            status={batch.status}
          />
          <PipelineStepper currentStage={batch.currentStage} />
        </CardContent>
      </Card>

      {/* ── QUEUED SKELETONS ─────────────────────────────────────────────── */}
      {showSkeletons && (
        <section className="space-y-3 animate-slide-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="film-strip flex-1" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest whitespace-nowrap px-2">
              Queuing…
            </span>
            <div className="film-strip flex-1" />
          </div>
          <BatchSummarySkeletons count={batch.totalClipsRequested || 3} />
        </section>
      )}

      {/* ── FULL CLIP TRAY (rich cards from store) ───────────────────────── */}
      {useFullClips && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="film-strip flex-1" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest whitespace-nowrap px-2">
              Developed Tray — {fullClips.length} clip{fullClips.length !== 1 ? 's' : ''}
            </span>
            <div className="film-strip flex-1" />
          </div>
          <div className="space-y-2">
            {fullClips.map((clip, i) => (
              <ClipTrayCard
                key={clip.clipId}
                clip={clip}
                index={i}
                batchPlatforms={batch.platforms}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── FALLBACK BATCH SUMMARY (batch.clips stubs only) ──────────────── */}
      {useBatchSummaries && (
        <section className="space-y-3 animate-slide-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="film-strip flex-1" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest whitespace-nowrap px-2">
              Developing — {batch.clips.length} clip{batch.clips.length !== 1 ? 's' : ''}
            </span>
            <div className="film-strip flex-1" />
          </div>
          <div className="space-y-2">
            {batch.clips.map((summary, i) => (
              <FallbackClipRow key={summary.clipId} summary={summary} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── COMPLETE HERO ────────────────────────────────────────────────── */}
      {isDone && !isFailed && (
        <BatchCompleteHero
          clipCount={fullClips.length || batch.totalClipsGenerated}
          onBackToSource={() => navigate(`/clips/sources/${batch.sourceId}`)}
          onNewUpload={() => navigate('/clips/upload')}
        />
      )}

      {/* ── IN-PROGRESS CTA ──────────────────────────────────────────────── */}
      {!isDone && !isFailed && batch.totalClipsGenerated > 0 && batch.clips[0] && (
        <div className="animate-slide-up stagger-4 flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate(`/clips/clips/${batch.clips[0]!.clipId}`)}
          >
            <Sparkles className="w-4 h-4" />
            Preview Early Clips
          </Button>
        </div>
      )}
    </div>
  )
}
