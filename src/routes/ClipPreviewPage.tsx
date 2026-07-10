import { useRef, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Download, Play, Pause, Volume2, VolumeX,
  Maximize2, Clapperboard, MonitorPlay, Smartphone,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClipsStore } from '@/stores/clipsStore'
import { PLATFORMS } from '@/lib/constants'
import { cn, formatDuration } from '@/lib/utils'

// ── Constants ──────────────────────────────────────────────────────────────────
const VERTICAL_PLATFORMS = new Set(['tiktok', 'reels', 'youtube_shorts'])

const PLATFORM_META: Record<string, {
  label: string
  icon: string
  accentClass: string
  badgeVariant: 'info' | 'purple' | 'danger' | 'default' | 'warning'
  frameLabel: string
  ui: 'tiktok' | 'reels' | 'shorts' | 'x' | 'linkedin'
}> = {
  tiktok: {
    label: 'TikTok',
    icon: '🎵',
    accentClass: 'text-info',
    badgeVariant: 'info',
    frameLabel: 'TikTok For You',
    ui: 'tiktok',
  },
  reels: {
    label: 'Instagram Reels',
    icon: '📸',
    accentClass: 'text-purple',
    badgeVariant: 'purple',
    frameLabel: 'Reels',
    ui: 'reels',
  },
  youtube_shorts: {
    label: 'YouTube Shorts',
    icon: '▶️',
    accentClass: 'text-danger',
    badgeVariant: 'danger',
    frameLabel: 'Shorts',
    ui: 'shorts',
  },
  x: {
    label: 'X / Twitter',
    icon: '🐦',
    accentClass: 'text-muted-foreground',
    badgeVariant: 'default',
    frameLabel: 'X Post',
    ui: 'x',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: '💼',
    accentClass: 'text-primary',
    badgeVariant: 'warning',
    frameLabel: 'LinkedIn Feed',
    ui: 'linkedin',
  },
}

// ── Clip Video Player (shared, internal) ──────────────────────────────────────
function ClipVideoPlayer({
  src,
  poster,
  className,
  onPlayingChange,
}: {
  src?: string
  poster?: string
  className?: string
  onPlayingChange?: (p: boolean) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hovered, setHovered] = useState(false)

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true); onPlayingChange?.(true) }
    else { v.pause(); setPlaying(false); onPlayingChange?.(false) }
  }, [onPlayingChange])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => setProgress(v.duration ? v.currentTime / v.duration : 0)
    const onMeta = () => setDuration(v.duration)
    const onEnded = () => { setPlaying(false); onPlayingChange?.(false) }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('ended', onEnded)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('ended', onEnded)
    }
  }, [src, onPlayingChange])

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }, [])

  if (!src) {
    return (
      <div className={cn('relative bg-muted flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <MonitorPlay className="w-10 h-10 opacity-30" />
          <p className="text-xs font-mono uppercase tracking-widest opacity-50">No asset</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('relative bg-black group cursor-pointer select-none', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={toggle}
        playsInline
      />

      {/* Big play button — initial state */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={toggle}
        >
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/15 hover:bg-black/80 transition-all hover:scale-105">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls overlay — on hover while playing */}
      {playing && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
            hovered ? 'opacity-100' : 'opacity-0'
          )}
          onClick={toggle}
        >
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <Pause className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Bottom HUD — progress + time + controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 transition-opacity duration-200',
          'bg-gradient-to-t from-black/80 to-transparent',
          hovered || !playing ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Progress bar */}
        <div
          className="h-1 bg-white/20 rounded-full mb-2.5 cursor-pointer relative overflow-hidden"
          onClick={seek}
        >
          <div
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <button onClick={toggle} className="text-white/80 hover:text-white transition-colors">
            {playing
              ? <Pause className="w-4 h-4" />
              : <Play className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1.5 text-white/60 font-mono text-[10px] tabular-nums">
            <span>{duration ? formatDuration(progress * duration) : '0:00'}</span>
            <span>/</span>
            <span>{duration ? formatDuration(duration) : '0:00'}</span>
          </div>

          <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
            {muted
              ? <VolumeX className="w-4 h-4" />
              : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Phone Frame (9:16 vertical) ───────────────────────────────────────────────
function PhoneFrame({
  src,
  poster,
  title,
  caption,
  platform,
}: {
  src?: string
  poster?: string
  title: string
  caption: string
  platform: string
}) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META['tiktok']!

  return (
    <div className="relative mx-auto" style={{ width: 300 }}>
      {/* Phone shell */}
      <div className="relative rounded-[2.5rem] border-[3px] border-border bg-black shadow-[0_32px_80px_-20px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.04)] overflow-hidden" style={{ aspectRatio: '9/19.5' }}>

        {/* Status bar notch */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-white/70 text-[9px] font-mono tabular-nums">9:41</span>
          <div className="w-16 h-4 bg-black rounded-full" />
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5 items-end">
              {[3, 5, 7, 9].map((h, i) => (
                <div key={i} className="w-[2px] bg-white/60 rounded-[1px]" style={{ height: h }} />
              ))}
            </div>
            <svg viewBox="0 0 24 12" className="w-5 h-2.5 fill-white/60">
              <rect x="0" y="2" width="20" height="8" rx="2" stroke="white" strokeWidth="1.5" fillOpacity="0" />
              <rect x="21" y="4" width="2" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="1" y="3" width="14" height="6" rx="1" />
            </svg>
          </div>
        </div>

        {/* Video fill */}
        <ClipVideoPlayer
          src={src}
          poster={poster}
          className="absolute inset-0 w-full h-full"
        />

        {/* Platform-specific overlay UI */}
        {meta.ui === 'tiktok' && (
          <TikTokOverlay title={title} caption={caption} />
        )}
        {meta.ui === 'reels' && (
          <ReelsOverlay title={title} caption={caption} />
        )}
        {meta.ui === 'shorts' && (
          <ShortsOverlay title={title} caption={caption} />
        )}
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />

      {/* Glow halo */}
      <div className="absolute -inset-6 -z-10 rounded-[3rem] opacity-20 blur-2xl"
        style={{ background: 'radial-gradient(ellipse at 50% 70%, var(--color-primary), transparent 70%)' }} />
    </div>
  )
}

// ── TikTok Overlay ─────────────────────────────────────────────────────────────
function TikTokOverlay({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3">
      {/* Top: For You */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <span className="text-white/50 text-[11px]">Following</span>
        <span className="text-white text-[11px] font-semibold border-b border-white pb-0.5">For You</span>
        <span className="text-white/50 text-[11px]">LIVE</span>
      </div>

      {/* Bottom: info + actions */}
      <div className="flex items-end justify-between gap-2">
        {/* Left: user + caption */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-muted-foreground/30 shrink-0" />
            <span className="text-white text-[10px] font-semibold">@shaddai_ai</span>
          </div>
          <p className="text-white text-[10px] leading-relaxed line-clamp-3">{caption || title}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-white/60 text-[9px]">♫</span>
            <span className="text-white/60 text-[9px] truncate">Original sound · shaddai_ai</span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-danger" />
            </div>
            <span className="text-white text-[9px]">31.2K</span>
          </div>
          {[['♥', '142K'], ['💬', '1.2K'], ['↗', '4.8K'], ['⊕', '']].map(([icon, val]) => (
            <div key={icon} className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white text-sm">{icon}</span>
              </div>
              {val && <span className="text-white text-[9px]">{val}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Instagram Reels Overlay ────────────────────────────────────────────────────
function ReelsOverlay({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3">
      {/* Top */}
      <div className="flex items-center justify-between mt-8">
        <span className="text-white font-semibold text-xs">Reels</span>
        <div className="flex items-center gap-3 text-white">
          <span className="text-lg">📷</span>
          <span className="text-lg">✉️</span>
        </div>
      </div>
      {/* Bottom */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple to-secondary shrink-0" />
            <span className="text-white text-[10px] font-semibold">shaddai_ai</span>
            <span className="text-white/60 text-[9px] border border-white/40 px-1 rounded">Follow</span>
          </div>
          <p className="text-white text-[10px] leading-relaxed line-clamp-2">{caption || title}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-white/60 text-[9px]">♫ Original Audio</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          {[['♥', '98K'], ['💬', '842'], ['↗', '3.1K'], ['⋯', '']].map(([icon, val]) => (
            <div key={icon} className="flex flex-col items-center gap-0.5">
              <span className="text-white text-lg drop-shadow">{icon}</span>
              {val && <span className="text-white text-[9px]">{val}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── YouTube Shorts Overlay ─────────────────────────────────────────────────────
function ShortsOverlay({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3">
      <div className="flex items-center gap-2 mt-8">
        <span className="text-danger font-bold text-sm">▶ Shorts</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[11px] line-clamp-2 leading-snug">{title}</p>
          <p className="text-white/70 text-[9px] mt-0.5 line-clamp-2">{caption}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-4 h-4 rounded-full bg-danger shrink-0" />
            <span className="text-white text-[10px]">@shaddai_ai</span>
            <span className="text-white/50 text-[9px] border border-white/30 px-1 rounded">Subscribe</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          {[['👍', '4.2K'], ['👎', ''], ['💬', '312'], ['↗', '891'], ['⋮', '']].map(([icon, val]) => (
            <div key={icon} className="flex flex-col items-center gap-0.5">
              <span className="text-white text-base drop-shadow">{icon}</span>
              {val && <span className="text-white text-[9px]">{val}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Desktop Frame (16:9 horizontal) ───────────────────────────────────────────
function DesktopFrame({
  src,
  poster,
  title,
  caption,
  platform,
}: {
  src?: string
  poster?: string
  title: string
  caption: string
  platform: string
}) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META['x']!
  const isLinkedIn = platform === 'linkedin'

  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      {/* Browser/app chrome */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-[0_24px_60px_-16px_rgba(0,0,0,.7)]">
        {/* Tab bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-muted rounded-full px-4 py-1 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">🔒</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {isLinkedIn ? 'linkedin.com/feed' : 'x.com/home'}
              </span>
            </div>
          </div>
          <div className="w-16" />
        </div>

        {/* Feed wrapper */}
        <div className="bg-background p-4">
          {/* Post card */}
          <div className="max-w-[520px] mx-auto bg-card border border-border rounded-xl overflow-hidden">
            {/* Post header */}
            <div className="flex items-center gap-3 p-3">
              <div className={cn(
                'w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold',
                isLinkedIn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}>S</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">SHADDAI AI</span>
                  {isLinkedIn && <span className="text-[10px] text-primary font-mono">• 1st</span>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isLinkedIn ? 'AI Agent Marketplace · Just now' : '@shaddai_ai · just now'}
                </p>
              </div>
              {!isLinkedIn && (
                <span className="text-xs font-bold text-foreground/80">✕</span>
              )}
            </div>

            {/* Caption */}
            <div className="px-3 pb-2">
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                {caption || title}
              </p>
            </div>

            {/* Video */}
            <div className="relative bg-black w-full" style={{ aspectRatio: '16/9' }}>
              <ClipVideoPlayer src={src} poster={poster} className="w-full h-full" />
            </div>

            {/* Engagement row */}
            <div className="flex items-center gap-1 px-3 py-2.5 border-t border-border">
              {isLinkedIn
                ? ['👍 Like', '💬 Comment', '↗ Repost', '✉️ Send'].map((a) => (
                    <button key={a} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] text-muted-foreground hover:bg-muted transition-colors">
                      {a}
                    </button>
                  ))
                : ['💬 42', '🔁 188', '♥ 1.4K', '📊', '↗'].map((a) => (
                    <button key={a} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] text-muted-foreground hover:bg-muted transition-colors">
                      {a}
                    </button>
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute -inset-4 -z-10 opacity-15 blur-3xl rounded-2xl"
        style={{ background: `radial-gradient(ellipse, var(--color-primary), transparent 70%)` }} />
    </div>
  )
}

// ── Platform Selector Strip ────────────────────────────────────────────────────
function PlatformStrip({
  active,
  availablePlatforms,
  clipId,
}: {
  active: string
  availablePlatforms: string[]
  clipId: string
}) {
  const platforms = PLATFORMS.filter((p) => p.id !== 'email')

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {platforms.map((p) => {
        const hasAsset = availablePlatforms.includes(p.id)
        const isActive = active === p.id
        const meta = PLATFORM_META[p.id]
        return (
          <Link
            key={p.id}
            to={`/clips/clips/${clipId}/preview/${p.id}`}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
              isActive
                ? 'bg-primary-light text-primary border border-primary/30'
                : hasAsset
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
                  : 'text-muted-foreground/40 border border-border/50 cursor-default pointer-events-none'
            )}
          >
            <span>{p.icon}</span>
            <span>{p.label.split(' ')[0]}</span>
            {hasAsset && !isActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Link>
        )
      })}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function ClipPreviewPage() {
  const { clipId, platform } = useParams<{ clipId: string; platform: string }>()
  const navigate = useNavigate()
  const clip = useClipsStore((s) => s.clips.find((c) => c.clipId === clipId))

  const resolvedPlatform = platform ?? 'tiktok'
  const isVertical = VERTICAL_PLATFORMS.has(resolvedPlatform)
  const meta = PLATFORM_META[resolvedPlatform] ?? PLATFORM_META['tiktok']!

  // Get the asset URL for this platform
  const platformAsset = clip?.platformAssets[resolvedPlatform]
  const videoSrc = platformAsset?.videoUrl ?? undefined

  // Which platforms have assets
  const availablePlatforms = clip
    ? Object.entries(clip.platformAssets)
        .filter(([, a]) => !!a?.videoUrl)
        .map(([id]) => id)
    : []

  // Navigate between platforms that have assets
  const platformsWithAssets = PLATFORMS
    .filter((p) => p.id !== 'email' && availablePlatforms.includes(p.id))
    .map((p) => p.id as string)

  const currentIndex = platformsWithAssets.indexOf(resolvedPlatform)

  const prevPlatform = currentIndex > 0 ? platformsWithAssets[currentIndex - 1] : null
  const nextPlatform = currentIndex < platformsWithAssets.length - 1
    ? platformsWithAssets[currentIndex + 1]
    : null

  // ── Not found ──
  if (!clip) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <Link
          to="/clips"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to clips
        </Link>
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-border rounded-2xl bg-surface">
          <Clapperboard className="w-10 h-10 text-muted-foreground/30" />
          <div className="text-center">
            <p className="font-display font-bold text-foreground text-lg">Clip not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This clip may have been removed or the ID is incorrect.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/clips')}>
            Back to Clips
          </Button>
        </div>
      </div>
    )
  }

  const caption = platformAsset?.caption ?? platformAsset?.postBody ?? clip.captions.primary
  const scorePercent = Math.round(clip.compositeScore * 100)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coverUrl: string | undefined = (clip as any).coverUrl

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">

      {/* ── Top navigation bar ── */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/clips/clips/${clipId}`}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm', meta.accentClass)}>{meta.icon}</span>
              <h1 className="font-display font-bold text-foreground text-lg leading-tight">
                {meta.frameLabel} Preview
              </h1>
              <Badge variant={meta.badgeVariant} size="sm">{meta.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {clip.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Frame toggle hint */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-lg border border-border bg-surface">
            {isVertical
              ? <><Smartphone className="w-3.5 h-3.5" /> 9:16</>
              : <><MonitorPlay className="w-3.5 h-3.5" /> 16:9</>}
          </div>

          {/* Download */}
          {videoSrc ? (
            <a href={videoSrc} download={`${clip.title}-${resolvedPlatform}.mp4`}>
              <Button variant="primary" size="sm">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </a>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <Download className="w-4 h-4" />
              No asset
            </Button>
          )}
        </div>
      </div>

      {/* ── Platform navigator ── */}
      <div className="mb-8">
        <PlatformStrip
          active={resolvedPlatform}
          availablePlatforms={availablePlatforms}
          clipId={clipId!}
        />
      </div>

      {/* ── Frame area ── */}
      <div className="flex items-start justify-center gap-8">
        {/* Prev arrow */}
        <button
          onClick={() => prevPlatform && navigate(`/clips/clips/${clipId}/preview/${prevPlatform}`)}
          disabled={!prevPlatform}
          className="mt-24 p-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-20 disabled:pointer-events-none shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* The frame */}
        <div className="flex-1 flex justify-center">
          {isVertical ? (
            <PhoneFrame
              src={videoSrc}
              poster={coverUrl}
              title={clip.title}
              caption={caption}
              platform={resolvedPlatform}
            />
          ) : (
            <DesktopFrame
              src={videoSrc}
              poster={coverUrl}
              title={clip.title}
              caption={caption}
              platform={resolvedPlatform}
            />
          )}
        </div>

        {/* Next arrow */}
        <button
          onClick={() => nextPlatform && navigate(`/clips/clips/${clipId}/preview/${nextPlatform}`)}
          disabled={!nextPlatform}
          className="mt-24 p-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-20 disabled:pointer-events-none shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Clip metadata strip ── */}
      <div className="mt-10 flex items-center justify-center gap-6 text-xs flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-mono uppercase tracking-widest text-[10px]">Duration</span>
          <span className="font-mono text-foreground font-bold">
            {formatDuration(clip.durationSec)}
          </span>
        </div>

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-mono uppercase tracking-widest text-[10px]">Timecode</span>
          <span className="font-mono text-foreground">
            {formatDuration(clip.startSec)} – {formatDuration(clip.endSec)}
          </span>
        </div>

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-mono uppercase tracking-widest text-[10px]">Score</span>
          <span className={cn(
            'font-mono font-bold tabular-nums',
            scorePercent >= 70 ? 'text-primary' : scorePercent >= 40 ? 'text-warning' : 'text-muted-foreground'
          )}>
            {scorePercent}
          </span>
        </div>

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-mono uppercase tracking-widest text-[10px]">Status</span>
          <Badge
            variant={clip.status === 'approved' ? 'success' : clip.status === 'exported' ? 'info' : 'default'}
            size="sm"
          >
            {clip.status}
          </Badge>
        </div>
      </div>

      {/* ── Caption preview ── */}
      {caption && (
        <div className="mt-6 max-w-xl mx-auto">
          <div className="px-4 py-3 rounded-xl bg-surface border border-border">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              {meta.label} Caption
            </p>
            <p className="text-sm text-foreground leading-relaxed">{caption}</p>
            {clip.hashtags.core.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {[...clip.hashtags.core, ...clip.hashtags.niche, ...clip.hashtags.brand]
                  .slice(0, 8)
                  .map((tag) => (
                    <span key={tag} className="text-[10px] font-mono text-primary">#{tag}</span>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action footer ── */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link to={`/clips/clips/${clipId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Editor
          </Button>
        </Link>

        {videoSrc && (
          <a href={videoSrc} download={`${clip.title}-${resolvedPlatform}.mp4`}>
            <Button variant="primary" size="md">
              <Download className="w-4 h-4" />
              Download {meta.label}
            </Button>
          </a>
        )}
      </div>
    </div>
  )
}
