import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, Download, Eye, Star,
  Save, Check, Clapperboard, ChevronRight,
  Clock, BarChart2, Hash, MessageSquare, Sparkles, Film,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useClipsStore } from '@/stores/clipsStore'
import { useUIStore } from '@/stores/uiStore'
import { PLATFORMS } from '@/lib/constants'
import { cn, formatDuration } from '@/lib/utils'

// ── Helpers ─────────────────────────────────────────────────────────────────
const VERTICAL_PLATFORMS = new Set(['tiktok', 'reels', 'youtube_shorts'])

function isVertical(platform: string) {
  return VERTICAL_PLATFORMS.has(platform)
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'text-info',
  reels: 'text-purple',
  youtube_shorts: 'text-danger',
  x: 'text-muted-foreground',
  linkedin: 'text-primary',
}

const HOOK_META: Record<string, { label: string; badgeVariant: 'info' | 'purple' | 'success' | 'warning' | 'danger' }> = {
  curiosity: { label: 'Curiosity Gap', badgeVariant: 'info' },
  contrarian: { label: 'Contrarian', badgeVariant: 'purple' },
  quote: { label: 'Quote Punch', badgeVariant: 'success' },
  list: { label: 'List Hook', badgeVariant: 'warning' },
  question: { label: 'Question', badgeVariant: 'danger' },
}

// ── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value ?? 0
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          className={cn(
            'transition-all duration-150',
            display >= n ? 'text-warning scale-110' : 'text-border hover:text-warning/50'
          )}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <Star className="w-4 h-4" fill={display >= n ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

// ── Platform Tab ─────────────────────────────────────────────────────────────
function PlatformTab({
  platform,
  active,
  onClick,
  hasAsset,
}: {
  platform: (typeof PLATFORMS)[number]
  active: boolean
  onClick: () => void
  hasAsset: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
        active
          ? 'bg-primary-light text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <span className="text-base leading-none">{platform.icon}</span>
      <span className="hidden sm:block leading-none">{platform.label.split(' ')[0]}</span>
      {hasAsset && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </button>
  )
}

// ── Video Player ──────────────────────────────────────────────────────────────
function VideoPlayer({ src, poster }: { src?: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => setProgress(v.duration ? v.currentTime / v.duration : 0)
    const onMeta = () => setDuration(v.duration)
    const onEnded = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('ended', onEnded)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('ended', onEnded)
    }
  }, [src])

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }

  return (
    <div className="relative bg-black rounded-xl overflow-hidden group">
      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-full object-contain"
          onClick={toggle}
          playsInline
        />
      ) : (
        <div className="aspect-video flex flex-col items-center justify-center bg-surface gap-3">
          <Film className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No asset for this platform</p>
        </div>
      )}

      {src && (
        <div className="absolute inset-0 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Play overlay */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={toggle}
              className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors"
            >
              {playing
                ? <Pause className="w-6 h-6 text-white" />
                : <Play className="w-6 h-6 text-white ml-0.5" />}
            </button>
          </div>
          {/* Progress bar */}
          <div className="p-3 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center gap-2 text-white/70 text-xs font-mono mb-1.5">
              <span>{duration ? formatDuration(progress * duration) : '0:00'}</span>
              <span className="text-white/30">/</span>
              <span>{duration ? formatDuration(duration) : '0:00'}</span>
            </div>
            <div
              className="h-1 bg-white/20 rounded-full cursor-pointer"
              onClick={seek}
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label }: { icon: React.FC<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex-1 film-strip" />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ClipEditorPage() {
  const { clipId } = useParams<{ clipId: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const clip = useClipsStore((s) => s.clips.find((c) => c.clipId === clipId))
  const updateClip = useClipsStore((s) => s.updateClip)
  const rateClip = useClipsStore((s) => s.rateClip)
  const enqueueExport = useClipsStore((s) => s.enqueueExport)

  const [activePlatform, setActivePlatform] = useState<string>(PLATFORMS[0].id)
  const [title, setTitle] = useState(clip?.title ?? '')
  const [primaryCaption, setPrimaryCaption] = useState(clip?.captions.primary ?? '')
  const [secondaryCaption, setSecondaryCaption] = useState(clip?.captions.secondary ?? '')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedHook, setSelectedHook] = useState<string | null>(
    clip?.hooks ? Object.keys(clip.hooks).find(k => !!clip.hooks[k as keyof typeof clip.hooks]) ?? null : null
  )

  // ── Empty state
  if (!clip) {
    return (
      <div className="max-w-6xl mx-auto animate-fade-in space-y-4">
        <Link
          to="/clips"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <EmptyState
          icon={<Clapperboard />}
          title="Clip not found"
          description="This clip may have been removed or the ID is incorrect. Generate clips from a source to populate the editor."
          action={{ label: 'Back to Clips', onClick: () => navigate('/clips') }}
        />
      </div>
    )
  }

  // ── Derived
  const firstPlatformWithAsset = PLATFORMS.find((p) => !!clip.platformAssets[p.id])?.id ?? PLATFORMS[0].id
  const resolvedPlatform = activePlatform
  const asset = clip.platformAssets[resolvedPlatform]
  const videoSrc = asset?.videoUrl ?? undefined
  const scorePercent = Math.round(clip.compositeScore * 100)
  const hooks = clip.hooks as Record<string, string | undefined>
  const hookEntries = Object.entries(hooks).filter(([, v]) => !!v) as [string, string][]

  const markDirty = () => { setDirty(true); setSaved(false) }

  const handleSave = async () => {
    setSaving(true)
    updateClip(clip.clipId, {
      title,
      captions: { primary: primaryCaption, secondary: secondaryCaption },
    })
    await new Promise((r) => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
    setDirty(false)
    addToast({ type: 'success', title: 'Saved', message: 'Changes written to clip.', duration: 2500 })
  }

  const handleApprove = () => {
    updateClip(clip.clipId, { status: 'approved' })
    addToast({
      type: 'success',
      title: 'Clip approved',
      message: 'Ready for export queue.',
      duration: 4000,
      action: { label: 'Go to Queue', onClick: () => navigate('/clips/export-queue') },
    })
  }

  const handleExport = () => {
    enqueueExport(clip.clipId, resolvedPlatform)
    addToast({ type: 'info', title: 'Export queued', message: `Sending to ${resolvedPlatform}…`, duration: 3000 })
    navigate('/clips/export-queue')
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-0">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold truncate text-foreground leading-tight">
              {clip.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">
                {formatDuration(clip.startSec)} — {formatDuration(clip.endSec)}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatDuration(clip.durationSec)}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <Badge
                variant={clip.status === 'approved' ? 'success' : clip.status === 'exported' ? 'info' : 'default'}
                size="sm"
              >
                {clip.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!dirty && !saving}
          >
            {saved ? <Check className="w-4 h-4 text-success" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save'}
          </Button>
          <Button size="sm" onClick={handleApprove} disabled={clip.status === 'approved'}>
            <Check className="w-4 h-4" />
            Approve
          </Button>
        </div>
      </div>

      {/* ── Body: 3-col editing console ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px_280px] gap-5">

        {/* ── Column 1: Video + Platform Switcher ── */}
        <div className="space-y-4">
          {/* Score strip */}
          <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Score</span>
            </div>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <span className="font-mono text-sm font-bold text-primary tabular-nums">{scorePercent}</span>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">
                {formatDuration(clip.durationSec)}
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <StarRating
              value={clip.userRating}
              onChange={(n) => rateClip(clip.clipId, n)}
            />
          </div>

          {/* Platform tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-3">
            {PLATFORMS.filter(p => p.id !== 'email').map((p) => (
              <PlatformTab
                key={p.id}
                platform={p}
                active={activePlatform === p.id}
                onClick={() => setActivePlatform(p.id)}
                hasAsset={!!clip.platformAssets[p.id]?.videoUrl}
              />
            ))}
            <div className="flex-1" />
            <Link
              to={`/clips/clips/${clipId}/preview/${resolvedPlatform}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary-light"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Video player */}
          <VideoPlayer src={videoSrc} poster={clip.coverUrl} />

          {/* Export / Download row */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="flex-1" onClick={handleExport}>
              Export to {PLATFORMS.find((p) => p.id === resolvedPlatform)?.label ?? resolvedPlatform}
            </Button>
            {videoSrc && (
              <a href={videoSrc} download className="shrink-0">
                <Button variant="outline" size="md">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* ── Column 2: Editor Panel ── */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <SectionLabel icon={Film} label="Title" />
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty() }}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg bg-surface border text-sm font-medium text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
                'placeholder:text-muted-foreground/40 transition-colors',
                'border-border hover:border-muted-foreground/30'
              )}
              placeholder="Clip title…"
            />
          </div>

          {/* Captions */}
          <div>
            <SectionLabel icon={MessageSquare} label="Captions" />
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Primary
                </label>
                <textarea
                  value={primaryCaption}
                  onChange={(e) => { setPrimaryCaption(e.target.value); markDirty() }}
                  rows={4}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg bg-surface border text-sm text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
                    'placeholder:text-muted-foreground/40 resize-none transition-colors',
                    'border-border hover:border-muted-foreground/30 shaddai-scrollbar'
                  )}
                  placeholder="Caption for this clip…"
                />
                <p className="text-right text-[11px] font-mono text-muted-foreground/50 mt-1">
                  {primaryCaption.length} chars
                </p>
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Secondary / CTA
                </label>
                <textarea
                  value={secondaryCaption}
                  onChange={(e) => { setSecondaryCaption(e.target.value); markDirty() }}
                  rows={2}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg bg-surface border text-sm text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
                    'placeholder:text-muted-foreground/40 resize-none transition-colors',
                    'border-border hover:border-muted-foreground/30 shaddai-scrollbar'
                  )}
                  placeholder="Call-to-action or secondary caption…"
                />
              </div>
            </div>
          </div>

          {/* Hashtag groups */}
          {(clip.hashtags.core.length > 0 || clip.hashtags.niche.length > 0 || clip.hashtags.brand.length > 0) && (
            <div>
              <SectionLabel icon={Hash} label="Hashtags" />
              <div className="space-y-2">
                {[
                  { label: 'Core', tags: clip.hashtags.core, variant: 'info' as const },
                  { label: 'Niche', tags: clip.hashtags.niche, variant: 'purple' as const },
                  { label: 'Brand', tags: clip.hashtags.brand, variant: 'warning' as const },
                ].filter(g => g.tags.length > 0).map((group) => (
                  <div key={group.label}>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/60">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.tags.map((tag) => (
                        <Badge key={tag} variant={group.variant} size="sm">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Column 3: Hooks Panel ── */}
        <div className="space-y-5">
          {hookEntries.length > 0 && (
            <div>
              <SectionLabel icon={Sparkles} label="Hooks" />
              <div className="space-y-2">
                {hookEntries.map(([type, text], i) => {
                  const meta = HOOK_META[type] ?? { label: type, badgeVariant: 'default' as const }
                  const isSelected = selectedHook === type
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedHook(isSelected ? null : type)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-all duration-200 animate-slide-up',
                        `stagger-${Math.min(i + 1, 8)}`,
                        isSelected
                          ? 'border-primary/50 bg-primary-light ring-1 ring-primary/20'
                          : 'border-border bg-surface hover:border-muted-foreground/30 hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant={meta.badgeVariant as any} size="sm">
                          {meta.label}
                        </Badge>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{text}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Platform asset summary */}
          <div>
            <SectionLabel icon={Film} label="Assets" />
            <div className="space-y-1.5">
              {PLATFORMS.filter(p => p.id !== 'email').map((p) => {
                const a = clip.platformAssets[p.id]
                const has = !!a?.videoUrl
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors',
                      activePlatform === p.id
                        ? 'border-primary/30 bg-primary-light'
                        : 'border-border bg-surface'
                    )}
                  >
                    <span className={cn('flex items-center gap-2 font-medium', PLATFORM_COLORS[p.id])}>
                      <span>{p.icon}</span>
                      <span className="text-foreground">{p.label.split(' ')[0]}</span>
                    </span>
                    {has
                      ? <span className="font-mono text-success text-[10px]">READY</span>
                      : <span className="font-mono text-muted-foreground/40 text-[10px]">—</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
