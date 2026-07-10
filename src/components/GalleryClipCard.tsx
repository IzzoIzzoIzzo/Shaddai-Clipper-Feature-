// ============================================================
// GalleryClipCard — individual clip card for the media gallery
// Hover-reveal controls, cover thumbnail, platform chips.
// TURTLE / SHADDAI Clipper
// ============================================================

import { useRef, useState, useCallback } from 'react'
import type { Clip } from '@/types/api'
import { cn, formatDuration, formatDate } from '@/lib/utils'
import { Play, Download, Hash, Star, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface GalleryClipCardProps {
  clip: Clip
  platformLabels: Record<string, string>
  platformIcons: Record<string, string>
  onClick: () => void
  compact?: boolean
  className?: string
}

export function GalleryClipCard({
  clip,
  platformLabels,
  platformIcons,
  onClick,
  compact = false,
  className,
}: GalleryClipCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)
  const [thumbError, setThumbError] = useState(false)

  // First available platform video URL
  const platforms = Object.keys(clip.platformAssets || {})
  const firstPlatform = platforms[0] ?? ''
  const firstAsset = clip.platformAssets?.[firstPlatform]
  const videoUrl = firstAsset?.videoUrl ?? ''

  // Composite score as 0-100
  const scorePercent = Math.round((clip.compositeScore ?? 0) * 100)

  // Score color semantic
  const scoreVariant =
    scorePercent >= 75 ? 'success' :
    scorePercent >= 50 ? 'info' :
    scorePercent >= 30 ? 'warning' : 'default'

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {/* ignore autoplay block */})
    }
  }, [videoUrl])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [])

  return (
    <article
      className={cn(
        'group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer card-hover animate-fade-in',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Open ${clip.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      {/* ── Thumbnail / video area ────────────────────────── */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-muted',
          compact ? 'aspect-video' : 'aspect-[9/16] max-h-72'
        )}
      >
        {/* Cover image */}
        {clip.coverUrl && !thumbError ? (
          <img
            src={clip.coverUrl}
            alt={clip.title}
            onError={() => setThumbError(true)}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              hovered && videoUrl ? 'opacity-0' : 'opacity-100'
            )}
            loading="lazy"
          />
        ) : (
          /* Fallback placeholder with film-frame feel */
          <div className={cn(
            'absolute inset-0 flex items-center justify-center',
            hovered && videoUrl ? 'opacity-0' : 'opacity-100',
            'transition-opacity duration-300'
          )}>
            {/* Film grain bg */}
            <div className="absolute inset-0 bg-muted" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative flex flex-col items-center gap-2 text-muted-foreground/40">
              <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center bg-card">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest">No preview</span>
            </div>
          </div>
        )}

        {/* Hover video preview — muted, loop */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            preload="metadata"
            muted
            loop
            playsInline
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              hovered ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {/* Top gradient overlay (always) */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* Bottom gradient (for metadata legibility) */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Score badge — top left */}
        {scorePercent > 0 && (
          <div className="absolute top-2 left-2">
            <span className={cn(
              'inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm',
              scorePercent >= 75 ? 'bg-success/20 text-success' :
              scorePercent >= 50 ? 'bg-info/20 text-info' :
              'bg-warning/20 text-warning'
            )}>
              <Star className="h-2.5 w-2.5" />
              {scorePercent}
            </span>
          </div>
        )}

        {/* Duration — bottom left (always visible) */}
        <div className="absolute bottom-2 left-2">
          <span className="font-mono text-[10px] text-white/90 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(clip.durationSec)}
          </span>
        </div>

        {/* Platform chips — bottom right */}
        {platforms.length > 0 && (
          <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 justify-end max-w-[60%]">
            {platforms.slice(0, compact ? 1 : 2).map((p) => (
              <span
                key={p}
                className="font-mono text-[9px] uppercase tracking-wide bg-black/60 text-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded"
              >
                {platformIcons[p] ?? '●'} {!compact && (platformLabels[p] ?? p)}
              </span>
            ))}
            {platforms.length > (compact ? 1 : 2) && (
              <span className="font-mono text-[9px] bg-black/60 text-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                +{platforms.length - (compact ? 1 : 2)}
              </span>
            )}
          </div>
        )}

        {/* Play button overlay on hover */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none',
          hovered ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_30px_-4px_var(--color-primary)] backdrop-blur-sm">
            <Play className="h-6 w-6 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>

        {/* Download hover CTA — top right */}
        {videoUrl && (
          <a
            href={videoUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-primary/80 backdrop-blur-sm transition-all pointer-events-auto',
              hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
            )}
            title="Download clip"
            aria-label="Download clip"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* ── Card body ─────────────────────────────────────── */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-semibold leading-tight text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {clip.title}
        </h3>

        {/* Caption preview */}
        {clip.captions?.primary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
            {clip.captions.primary}
          </p>
        )}

        {/* Hashtags */}
        {clip.hashtags?.core && clip.hashtags.core.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {clip.hashtags.core.slice(0, compact ? 2 : 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9px] uppercase tracking-wide text-primary/70 bg-primary-light px-1.5 py-0.5 rounded-md"
              >
                <Hash className="h-2 w-2 inline -mt-px" />
                {tag.replace(/^#/, '')}
              </span>
            ))}
            {(clip.hashtags.core.length > (compact ? 2 : 3)) && (
              <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                +{clip.hashtags.core.length - (compact ? 2 : 3)}
              </span>
            )}
          </div>
        )}

        {/* Meta row: date + status */}
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {formatDate(clip.createdAt)}
          </span>
          <Badge
            variant={
              clip.status === 'approved' || clip.status === 'exported' ? 'success' :
              clip.status === 'reviewed' ? 'info' :
              clip.status === 'archived' ? 'default' : 'default'
            }
            size="sm"
          >
            {clip.status}
          </Badge>
        </div>
      </div>

      {/* Gradient-border accent on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300',
          hovered ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 30%, transparent)',
        }}
      />
    </article>
  )
}

export default GalleryClipCard
