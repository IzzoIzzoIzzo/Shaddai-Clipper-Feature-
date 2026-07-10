import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, FileVideo, Loader2, FolderOpen,
  AlertTriangle, Clock, AlignLeft, Clapperboard, Film,
} from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDuration, formatDate, cn } from '@/lib/utils'
import { useClipsStore } from '@/stores/clipsStore'
import { TranscriptPanel } from '@/components/TranscriptPanel'

// ── status → badge variant ──
const statusVariant: Record<string, BadgeProps['variant']> = {
  uploading:   'info',
  normalizing: 'warning',
  ingested:    'success',
  normalized:  'success',
  failed:      'danger',
}

// ── status → human label ──
const statusLabel: Record<string, string> = {
  uploading:   'Uploading',
  normalizing: 'Processing',
  ingested:    'Ready',
  normalized:  'Ready',
  failed:      'Failed',
}

// ── processing phase messages ──
const processingMessage: Record<string, string> = {
  uploading:   'Ingesting & extracting audio…',
  normalizing: 'Transcribing & detecting highlights…',
}

export function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>()
  const navigate = useNavigate()
  const source = useClipsStore((s) => s.sources.find((x) => x.sourceId === sourceId))
  const segments = useClipsStore((s) => (sourceId ? s.transcripts[sourceId] : undefined)) ?? []
  const loadSourceDetail = useClipsStore((s) => s.loadSourceDetail)

  // Track whether the initial loadSourceDetail fetch has settled so we don't
  // flash "No transcript available yet" while data is still in-flight.
  const [detailLoading, setDetailLoading] = useState(true)

  // Fetch transcript + candidates on mount (covers direct nav / reload where the
  // upload poller never ran, so the transcript panel isn't empty).
  useEffect(() => {
    if (!sourceId) { setDetailLoading(false); return }
    setDetailLoading(true)
    // loadSourceDetail is async but its type is declared void; cast to Promise to
    // await completion and clear the loading flag regardless of outcome.
    Promise.resolve((loadSourceDetail as (id: string) => Promise<void>)(sourceId))
      .catch(() => { /* engine offline — proceed to empty state */ })
      .finally(() => setDetailLoading(false))
  }, [sourceId, loadSourceDetail])

  // ── Back nav ──
  const BackLink = () => (
    <button
      onClick={() => navigate('/clips/sources')}
      className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors mb-5 group"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      All Sources
    </button>
  )

  // ── not found ──
  if (!source) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <BackLink />
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-mono">Source not found or was deleted.</p>
        </div>
      </div>
    )
  }

  const processing = source.status === 'uploading' || source.status === 'normalizing'
  const failed = source.status === 'failed'
  // Only consider transcript absent once the initial fetch has settled; avoids
  // a false "No transcript" flash on direct navigation / reload.
  const hasTranscript = segments.length > 0
  const transcriptLoading = detailLoading && !hasTranscript

  // ─────────────────────────────────────────────────────────────
  // PROCESSING STATE — scan-line console
  // ─────────────────────────────────────────────────────────────
  if (processing) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <BackLink />

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="film-strip w-full" />

          <div className="p-8">
            {/* title row */}
            <div className="flex items-start gap-4 mb-8">
              <div className="shrink-0 p-3 rounded-xl bg-primary-light border border-primary/20">
                <FileVideo className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl font-bold truncate text-foreground">
                  {source.title}
                </h1>
                {source.originalFilename !== source.title && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {source.originalFilename}
                  </p>
                )}
              </div>
              <Badge variant={statusVariant[source.status] || 'default'} size="md">
                <span className="rec-dot inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 align-middle" />
                {statusLabel[source.status] ?? source.status}
              </Badge>
            </div>

            {/* scan-line transcribing console */}
            <div className="scan-line rounded-xl border border-primary/10 bg-surface/70 p-10 text-center relative">
              {/* corner accents */}
              <span className="absolute top-3 left-3 w-4 h-4 border-l border-t border-primary/30 rounded-tl" />
              <span className="absolute top-3 right-3 w-4 h-4 border-r border-t border-primary/30 rounded-tr" />
              <span className="absolute bottom-3 left-3 w-4 h-4 border-l border-b border-primary/30 rounded-bl" />
              <span className="absolute bottom-3 right-3 w-4 h-4 border-r border-b border-primary/30 rounded-br" />

              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-light border border-primary/20 mx-auto mb-5">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <p className="font-display text-base font-semibold text-foreground mb-2">
                {processingMessage[source.status] ?? 'Processing…'}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                This page refreshes automatically when processing completes.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // FAILED STATE
  // ─────────────────────────────────────────────────────────────
  if (failed) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <BackLink />
        <div className="rounded-xl border border-danger/20 bg-danger-light/50 p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger font-display">{source.title}</p>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {source.errorMessage || 'Processing failed. Please re-upload the file.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // READY STATE — full editorial view
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <BackLink />

      {/* ═══════════════════════════════════════════════════════
          SOURCE HEADER — cinematic editing console header
      ═══════════════════════════════════════════════════════ */}
      <div className={cn(
        'rounded-2xl border border-border bg-card overflow-hidden',
        'stagger-1 animate-slide-up',
        'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)]'
      )}>
        {/* film-strip top edge */}
        <div className="film-strip w-full" />

        {/* header body */}
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            {/* icon + title block */}
            <div className="flex items-start gap-4 min-w-0">
              {/* icon badge with gradient border */}
              <div className={cn(
                'relative shrink-0 p-3.5 rounded-xl bg-primary-light border border-primary/20',
                'gradient-border'
              )}>
                <FileVideo className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0 pt-0.5">
                <h1 className="font-display text-2xl font-bold leading-tight text-foreground truncate">
                  {source.title}
                </h1>
                {source.originalFilename !== source.title && (
                  <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                    {source.originalFilename}
                  </p>
                )}

                {/* meta pills row — only real data, no placeholders */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {source.durationSec > 0 && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-mono text-foreground font-medium tabular-nums">
                        {formatDuration(source.durationSec)}
                      </span>
                    </div>
                  )}
                  {hasTranscript && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlignLeft className="h-3.5 w-3.5" />
                      <span className="font-mono text-foreground font-medium tabular-nums">
                        {segments.length}
                      </span>
                      <span>segments</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clapperboard className="h-3.5 w-3.5" />
                    <span>{formatDate(source.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* status badge — top-right */}
            <div className="shrink-0 pt-0.5">
              <Badge variant={statusVariant[source.status] || 'default'} size="md">
                <span className="rec-dot inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 align-middle" />
                {statusLabel[source.status] ?? source.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* film-strip bottom divider */}
        <div className="film-strip w-full opacity-60" />

        {/* ── CTA bar ── */}
        <div className="px-6 sm:px-8 py-4 bg-surface/60 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            {hasTranscript
              ? `${segments.length} transcript segments · ready for clip generation`
              : 'No transcript available yet'}
          </p>
          <Button
            size="lg"
            onClick={() => navigate(`/clips/sources/${sourceId}/candidates`)}
            className="shrink-0 font-display tracking-tight"
          >
            <Sparkles className="h-4 w-4" />
            Generate Clips
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TRANSCRIPT PANEL
      ═══════════════════════════════════════════════════════ */}
      <div className="mt-5 stagger-3 animate-slide-up">
        {hasTranscript ? (
          <div className={cn(
            'rounded-2xl border border-border bg-card overflow-hidden',
            'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)]'
          )}>
            {/* panel header — film-strip motif */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface/40">
              {/* decorative film-frame icon */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Film className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground tracking-tight">
                  Full Transcript
                </h2>
              </div>

              {/* ticker strip accent */}
              <div className="flex-1 mx-2 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />

              {/* segment count chip */}
              <span className="font-mono text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-md shrink-0">
                {segments.length} segs
              </span>
            </div>

            {/* transcript body — 680px fixed scroll window */}
            <div className="p-5 h-[680px] flex flex-col">
              <TranscriptPanel sourceId={sourceId!} segments={segments} />
            </div>
          </div>
        ) : transcriptLoading ? (
          /* loading state — initial fetch in-flight; prevents false "No transcript" flash */
          <div className={cn(
            'rounded-2xl border border-dashed border-border bg-card/50',
            'p-16 text-center'
          )}>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4 mx-auto">
              <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Loading transcript…
            </p>
          </div>
        ) : (
          /* empty transcript state — fetch settled, genuinely no data */
          <div className={cn(
            'rounded-2xl border border-dashed border-border bg-card/50',
            'p-16 text-center'
          )}>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4 mx-auto">
              <AlignLeft className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              No transcript available yet.
            </p>
          </div>
        )}
      </div>

      {/* ── floating Generate Clips sticky CTA (visible when scrolled past header) ── */}
      <div className="mt-6 stagger-5 animate-slide-up">
        <div className={cn(
          'rounded-xl border border-primary/20 bg-primary-light/60',
          'px-6 py-4 flex items-center justify-between gap-4'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary rec-dot" />
            <p className="text-sm font-display font-semibold text-foreground">
              Ready to generate clips from this source
            </p>
          </div>
          <Button
            size="md"
            onClick={() => navigate(`/clips/sources/${sourceId}/candidates`)}
            className="shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Generate Clips
          </Button>
        </div>
      </div>
    </div>
  )
}
