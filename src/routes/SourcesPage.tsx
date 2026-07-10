import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { formatDuration, formatDate, cn } from '@/lib/utils'
import {
  Upload,
  Search,
  Film,
  Clock,
  Calendar,
  Trash2,
  ChevronRight,
  AlertCircle,
  FileVideo,
  Loader2,
  LayoutGrid,
  List,
  CheckCircle2,
  X,
} from 'lucide-react'
import { useClipsStore } from '@/stores/clipsStore'
import type { Source } from '@/types/api'

// ── status helpers ──────────────────────────────────────────────────────────

type StatusKey = Source['status']

const STATUS_BADGE: Record<StatusKey, 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
  ingested: 'success',
  failed: 'danger',
  uploading: 'info',
  normalizing: 'info',
  normalized: 'info',
}

const STATUS_LABEL: Record<StatusKey, string> = {
  ingested: 'READY',
  failed: 'FAILED',
  uploading: 'UPLOADING',
  normalizing: 'PROCESSING',
  normalized: 'PROCESSING',
}

const isProcessing = (s: StatusKey) =>
  s === 'uploading' || s === 'normalizing' || s === 'normalized'

// ── Sprocket column — pure CSS film-strip motif ──────────────────────────

function SprocketColumn({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col justify-evenly items-center py-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-[5px] h-[5px] rounded-[1px] bg-background ring-1 ring-border/60 shrink-0"
        />
      ))}
    </div>
  )
}

// ── Film thumbnail strip ─────────────────────────────────────────────────

function FilmThumb({ status }: { status: StatusKey }) {
  const processing = isProcessing(status)
  return (
    <div
      className={cn(
        'relative flex items-center justify-center w-[72px] shrink-0',
        'bg-surface border-r border-border',
        processing && 'scan-line',
      )}
    >
      <SprocketColumn count={4} />
      <div className="mx-1 flex items-center justify-center w-9 h-full">
        {status === 'ingested' ? (
          <CheckCircle2 className="h-4 w-4 text-success/50" />
        ) : status === 'failed' ? (
          <AlertCircle className="h-4 w-4 text-danger/50" />
        ) : (
          <FileVideo className="h-4 w-4 text-muted-foreground/30" />
        )}
      </div>
      <SprocketColumn count={4} />
    </div>
  )
}

// ── Processing badge ─────────────────────────────────────────────────────

function ProcessingCue({ status }: { status: StatusKey }) {
  if (!isProcessing(status)) return null
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-info tracking-widest uppercase">
      <span className="rec-dot w-1.5 h-1.5 rounded-full bg-info shrink-0" />
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── Evidence index number ─────────────────────────────────────────────────

function CaseNumber({ n }: { n: number }) {
  return (
    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/40 select-none shrink-0 w-[26px] pt-px leading-none">
      {String(n).padStart(3, '0')}
    </span>
  )
}

// ── LIST view card ────────────────────────────────────────────────────────

interface TileProps {
  source: Source
  index: number
  onDeleteRequest: (s: Source) => void
}

function EvidenceRow({ source, index, onDeleteRequest }: TileProps) {
  const navigate = useNavigate()
  const processing = isProcessing(source.status)

  return (
    <div
      className={cn(
        'group relative flex items-stretch gap-0 overflow-hidden',
        'border border-border bg-card rounded-lg',
        'card-hover cursor-pointer animate-slide-up',
        `stagger-${Math.min(index + 1, 8)}`,
        source.status === 'failed' && 'border-danger/25 bg-danger-light/5',
      )}
      onClick={() => navigate(`/clips/sources/${source.sourceId}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clips/sources/${source.sourceId}`) }}
      aria-label={`Open ${source.title}`}
    >
      {/* Status accent stripe */}
      <div
        className={cn(
          'w-[3px] shrink-0 rounded-l-lg',
          source.status === 'ingested' && 'bg-success',
          source.status === 'failed'   && 'bg-danger',
          isProcessing(source.status)  && 'bg-info',
        )}
      />

      {/* Film thumbnail */}
      <FilmThumb status={source.status} />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col gap-1.5 justify-between">
        {/* Row 1 — number + title + status */}
        <div className="flex items-start gap-2">
          <CaseNumber n={index + 1} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="font-display font-semibold text-sm text-foreground leading-snug truncate">
                {source.title}
              </h3>
              {processing
                ? <ProcessingCue status={source.status} />
                : <Badge variant={STATUS_BADGE[source.status]} size="sm">
                    {STATUS_LABEL[source.status]}
                  </Badge>
              }
            </div>
            <p className="font-mono text-[10px] text-muted-foreground/50 mt-0.5 truncate">
              {source.originalFilename}
            </p>
          </div>
        </div>

        {/* Row 2 — meta */}
        <div className="flex items-center gap-4 flex-wrap pl-7">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground tabular-nums">
            <Clock className="w-3 h-3 opacity-40" />
            {source.durationSec > 0 ? formatDuration(source.durationSec) : '--:--'}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3 opacity-40" />
            {formatDate(source.createdAt)}
          </span>
          {source.transcriptId && (
            <span className="font-mono text-[10px] text-success/70 tracking-widest">
              ● TRANSCRIPT
            </span>
          )}
        </div>

        {/* Row 3 — error */}
        {source.status === 'failed' && source.errorMessage && (
          <div className="flex items-start gap-1.5 pl-7">
            <AlertCircle className="w-3 h-3 text-danger shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] text-danger leading-snug">
              {source.errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 pr-3 shrink-0 border-l border-border/40 pl-3">
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteRequest(source) }}
          className={cn(
            'p-1.5 rounded-md text-muted-foreground/30',
            'hover:text-danger hover:bg-danger-light transition-all duration-150',
            'opacity-0 group-hover:opacity-100 focus:opacity-100',
          )}
          aria-label="Delete source"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground/25 group-hover:text-primary transition-colors" />
      </div>
    </div>
  )
}

// ── GRID view card ────────────────────────────────────────────────────────

function EvidenceCard({ source, index, onDeleteRequest }: TileProps) {
  const navigate = useNavigate()
  const processing = isProcessing(source.status)

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden',
        'border border-border bg-card rounded-xl',
        'card-hover cursor-pointer animate-slide-up',
        `stagger-${Math.min(index + 1, 8)}`,
        source.status === 'failed' && 'border-danger/25 bg-danger-light/5',
      )}
      onClick={() => navigate(`/clips/sources/${source.sourceId}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clips/sources/${source.sourceId}`) }}
      aria-label={`Open ${source.title}`}
    >
      {/* Film-strip header */}
      <div
        className={cn(
          'relative h-[80px] bg-surface border-b border-border',
          'flex items-center justify-between px-2',
          processing && 'scan-line',
        )}
      >
        {/* Top sprocket row */}
        <div className="absolute top-2 left-0 right-0 flex justify-between px-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-[5px] h-[5px] rounded-[1px] bg-background ring-1 ring-border/50" />
          ))}
        </div>
        {/* Bottom sprocket row */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-between px-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-[5px] h-[5px] rounded-[1px] bg-background ring-1 ring-border/50" />
          ))}
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-center justify-center">
          {source.status === 'ingested' ? (
            <CheckCircle2 className="h-7 w-7 text-success/40" />
          ) : source.status === 'failed' ? (
            <AlertCircle className="h-7 w-7 text-danger/40" />
          ) : (
            <FileVideo className="h-7 w-7 text-muted-foreground/20" />
          )}
        </div>

        {/* Case number top-left */}
        <span className="absolute top-4 left-3 font-mono text-[9px] text-muted-foreground/40 tabular-nums select-none">
          #{String(index + 1).padStart(3, '0')}
        </span>

        {/* Status accent top-right */}
        <div
          className={cn(
            'absolute top-0 right-0 w-0.5 h-full',
            source.status === 'ingested' && 'bg-success',
            source.status === 'failed'   && 'bg-danger',
            isProcessing(source.status)  && 'bg-info',
          )}
        />

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteRequest(source) }}
          className={cn(
            'absolute top-2 right-3 p-1 rounded-md z-10',
            'text-muted-foreground/30 hover:text-danger hover:bg-danger-light',
            'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all',
          )}
          aria-label="Delete source"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Title + badge */}
        <div className="flex items-start gap-2 justify-between">
          <h3 className="font-display font-semibold text-sm text-foreground leading-snug line-clamp-2 flex-1">
            {source.title}
          </h3>
        </div>

        {/* Status */}
        <div>
          {processing
            ? <ProcessingCue status={source.status} />
            : <Badge variant={STATUS_BADGE[source.status]} size="sm">
                {STATUS_LABEL[source.status]}
              </Badge>
          }
        </div>

        {/* Error message */}
        {source.status === 'failed' && source.errorMessage && (
          <p className="font-mono text-[10px] text-danger leading-snug line-clamp-2">
            {source.errorMessage}
          </p>
        )}

        {/* Meta */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/50">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground tabular-nums">
            <Clock className="w-2.5 h-2.5 opacity-40" />
            {source.durationSec > 0 ? formatDuration(source.durationSec) : '--:--'}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <Calendar className="w-2.5 h-2.5 opacity-40" />
            {formatDate(source.createdAt)}
          </span>
        </div>
      </div>

      {/* Hover chevron */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-3.5 h-3.5 text-primary" />
      </div>
    </div>
  )
}

// ── Delete confirm dialog ─────────────────────────────────────────────────

interface DeleteDialogProps {
  source: Source | null
  onClose: () => void
  onConfirm: (sourceId: string) => void
}

function DeleteDialog({ source, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <Dialog
      open={!!source}
      onClose={onClose}
      title="Remove Evidence File"
      description={source ? `"${source.title}" will be permanently erased.` : undefined}
    >
      <p className="text-sm text-muted-foreground mb-1">
        Deletes the source footage along with all associated transcripts and clips. This action cannot be undone.
      </p>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => { if (source) { onConfirm(source.sourceId); onClose() } }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'grid'

export function SourcesPage() {
  const navigate = useNavigate()
  const sources = useClipsStore((s) => s.sources)
  const deleteSource = useClipsStore((s) => s.deleteSource)

  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Source | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const filtered = sources.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.originalFilename.toLowerCase().includes(search.toLowerCase()),
  )

  const ingestCount    = sources.filter((s) => s.status === 'ingested').length
  const processingCount = sources.filter((s) => isProcessing(s.status)).length
  const failedCount    = sources.filter((s) => s.status === 'failed').length

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight gradient-text">
              Evidence Files
            </h2>
            {sources.length > 0 && (
              <span className="font-mono text-sm text-muted-foreground/60 tabular-nums">
                [{String(sources.length).padStart(3, '0')}]
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1 font-mono text-[12px] tracking-wide">
            {sources.length === 0
              ? 'NO FOOTAGE ON RECORD'
              : [
                  ingestCount    > 0 ? `${ingestCount} READY`      : null,
                  processingCount > 0 ? `${processingCount} INGESTING` : null,
                  failedCount    > 0 ? `${failedCount} FAILED`     : null,
                ].filter(Boolean).join(' · ')
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          {sources.length > 0 && (
            <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground/50 hover:text-muted-foreground',
                )}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground/50 hover:text-muted-foreground',
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Button onClick={() => navigate('/clips/upload')}>
            <Upload className="h-4 w-4" />
            New Footage
          </Button>
        </div>
      </div>

      {/* ── Film-strip divider ── */}
      <div className="film-strip rounded-sm" />

      {/* ── Search ── */}
      {sources.length > 0 && (
        <div className="relative animate-slide-up stagger-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title or filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full h-10 pl-9 pr-10 rounded-lg border border-border',
              'bg-surface font-mono text-sm text-foreground placeholder:text-muted-foreground/30',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
              'transition-all duration-150',
            )}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Processing banner ── */}
      {processingCount > 0 && !search && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-info/20 bg-info-light animate-slide-up stagger-2">
          <Loader2 className="w-3.5 h-3.5 text-info animate-spin shrink-0" />
          <span className="font-mono text-[11px] text-info tracking-widest">
            {processingCount} FILE{processingCount > 1 ? 'S' : ''} INGESTING — STAND BY
          </span>
          <span className="ml-auto font-mono text-[10px] text-info/50">
            POLLING LIVE
          </span>
        </div>
      )}

      {/* ── Content ── */}
      {filtered.length > 0 && (
        viewMode === 'list' ? (
          <div className="space-y-2">
            {filtered.map((source, i) => (
              <EvidenceRow
                key={source.sourceId}
                source={source}
                index={i}
                onDeleteRequest={setPendingDelete}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((source, i) => (
              <EvidenceCard
                key={source.sourceId}
                source={source}
                index={i}
                onDeleteRequest={setPendingDelete}
              />
            ))}
          </div>
        )
      )}

      {/* ── Empty states ── */}
      {filtered.length === 0 && (
        <div className="border border-dashed border-border rounded-xl animate-fade-in">
          {search ? (
            <EmptyState
              icon={<Search />}
              title="No matching footage"
              description={`No files match "${search}".`}
              action={{ label: 'Clear search', onClick: () => setSearch('') }}
            />
          ) : (
            <EmptyState
              icon={<Film />}
              title="No footage on record"
              description="Upload your first long-form video to begin cutting highlights."
              action={{ label: 'Upload Footage', onClick: () => navigate('/clips/upload') }}
            />
          )}
        </div>
      )}

      {/* ── Footer tally ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between pb-2">
          {search && (
            <span className="font-mono text-[10px] text-muted-foreground/40">
              {filtered.length} MATCH{filtered.length !== 1 ? 'ES' : ''} FOR "{search.toUpperCase()}"
            </span>
          )}
          <span className="font-mono text-[10px] text-muted-foreground/30 ml-auto tabular-nums">
            {filtered.length}/{sources.length} FILES DISPLAYED
          </span>
        </div>
      )}

      {/* ── Delete confirm ── */}
      <DeleteDialog
        source={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={deleteSource}
      />
    </div>
  )
}
