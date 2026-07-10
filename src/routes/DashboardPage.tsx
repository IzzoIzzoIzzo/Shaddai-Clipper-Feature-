import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Film, Scissors, Clock, Upload, ChevronRight, Clapperboard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn, formatDuration, formatDate } from '@/lib/utils'
import { useClipsStore } from '@/stores/clipsStore'
import type { Source } from '@/types/api'

// ── helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: Source['status']): 'success' | 'danger' | 'info' | 'warning' {
  if (status === 'ingested') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'normalizing') return 'warning'
  return 'info'
}

// ── sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accentClass: string
  delay: string
}

function StatCard({ label, value, icon, accentClass, delay }: StatCardProps) {
  return (
    <Card
      className={cn(
        'card-hover animate-slide-up relative overflow-hidden',
        delay,
      )}
    >
      {/* subtle accent stripe at top */}
      <div className={cn('absolute top-0 left-0 right-0 h-px', accentClass)} />
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('p-2.5 rounded-lg shrink-0', accentClass.replace('bg-', 'bg-').replace('-foreground', ''))}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-display text-3xl font-extrabold leading-none tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-mono">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface SourceTileProps {
  source: Source
  index: number
}

function SourceTile({ source, index }: SourceTileProps) {
  const stagger = `stagger-${Math.min(index + 1, 8)}` as const

  return (
    <Link
      to={`/clips/sources/${source.sourceId}`}
      className={cn(
        'block group animate-scale-in',
        stagger,
      )}
    >
      <Card className="card-hover h-full cursor-pointer">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          {/* thumbnail placeholder — film-strip motif */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-surface border border-border">
            {/* film holes */}
            <div className="absolute inset-y-0 left-0 w-4 flex flex-col justify-around items-center py-1 gap-1 z-10">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-sm bg-background/70 border border-border/60" />
              ))}
            </div>
            <div className="absolute inset-y-0 right-0 w-4 flex flex-col justify-around items-center py-1 gap-1 z-10">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-sm bg-background/70 border border-border/60" />
              ))}
            </div>

            {/* center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Clapperboard className="w-7 h-7 text-muted-foreground/30 group-hover:text-primary/50 transition-colors duration-300" />
            </div>

            {/* scanning line on hover for in-progress sources */}
            {(source.status === 'normalizing' || source.status === 'uploading') && (
              <div className="absolute inset-0 scan-line" />
            )}
          </div>

          {/* info */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
              {source.title}
            </h4>
            <Badge variant={statusVariant(source.status)} size="sm" className="shrink-0 mt-0.5">
              {source.status}
            </Badge>
          </div>

          {/* meta row */}
          <div className="flex items-center gap-2 mt-auto font-mono text-[11px] text-muted-foreground">
            {source.durationSec > 0 && (
              <>
                <Clock className="w-3 h-3 shrink-0" />
                <span>{formatDuration(source.durationSec)}</span>
                <span className="text-border">·</span>
              </>
            )}
            <span className="truncate">{formatDate(source.createdAt)}</span>
            <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const sources = useClipsStore((s) => s.sources)
  const clips = useClipsStore((s) => s.clips)
  const batches = useClipsStore((s) => s.batches)
  const ensureSeeded = useClipsStore((s) => s.ensureSeeded)

  useEffect(() => {
    ensureSeeded()
  }, [ensureSeeded])

  // derived stats
  const totalSources = sources.length
  const totalClips = batches.reduce((acc, b) => acc + b.totalClipsGenerated, 0) + clips.length
  const totalSecProcessed = sources.reduce((acc, src) => acc + (src.durationSec ?? 0), 0)

  // format processed time: prefer minutes if ≥60s, else seconds
  const processedLabel =
    totalSecProcessed >= 3600
      ? `${(totalSecProcessed / 3600).toFixed(1)}h`
      : totalSecProcessed >= 60
      ? `${Math.round(totalSecProcessed / 60)}m`
      : `${Math.round(totalSecProcessed)}s`

  const recentSources = [...sources]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 9)

  return (
    <div className="space-y-10 max-w-6xl">

      {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
      <header className="animate-fade-in">
        {/* timecode label */}
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-primary mb-3 flex items-center gap-2">
          <span className="rec-dot inline-block w-1.5 h-1.5 rounded-full bg-secondary" />
          Command Deck · {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>

        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            {/* big numeral anchor */}
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[5rem] font-black leading-none gradient-text select-none">
                {String(totalSources).padStart(2, '0')}
              </span>
              <div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight leading-[1.05] text-foreground">
                  Sources<br />on the table.
                </h1>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
              Drop a long-form video — SHADDAI finds the viral moments, writes the hooks,
              and renders clips ready for every platform.
            </p>
          </div>

          <Button size="lg" onClick={() => navigate('/clips/upload')} className="shrink-0 animate-scale-in stagger-3">
            <Upload className="h-4 w-4" />
            New Source
          </Button>
        </div>

        {/* film-strip divider */}
        <div className="film-strip mt-6 rounded-full" />
      </header>

      {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Sources Uploaded"
          value={totalSources}
          icon={<Film className="h-5 w-5 text-primary" />}
          accentClass="bg-primary-light"
          delay="stagger-1"
        />
        <StatCard
          label="Clips Generated"
          value={totalClips}
          icon={<Scissors className="h-5 w-5 text-success" />}
          accentClass="bg-success-light"
          delay="stagger-2"
        />
        <StatCard
          label="Content Processed"
          value={processedLabel || '0s'}
          icon={<Clock className="h-5 w-5 text-warning" />}
          accentClass="bg-warning-light"
          delay="stagger-3"
        />
      </div>

      {/* ── RECENT SOURCES GRID ─────────────────────────────────────────── */}
      <section className="animate-slide-up stagger-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            Recent Sources
          </h2>
          {sources.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/clips/sources')}
            >
              View All
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {recentSources.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Clapperboard />}
              title="The table is clean."
              description="Feed it something. Drop a long-form video and SHADDAI will find every viral moment inside."
              action={{
                label: 'Upload Source',
                onClick: () => navigate('/clips/upload'),
              }}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSources.map((source, i) => (
              <SourceTile key={source.sourceId} source={source} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
