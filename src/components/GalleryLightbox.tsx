// ============================================================
// GalleryLightbox — full-screen clip player dialog
// Video playback + caption + hashtags + download + copy caption.
// TURTLE / SHADDAI Clipper
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Clip } from '@/types/api'
import { cn, formatDuration, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Download,
  Copy,
  Check,
  Hash,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react'

interface GalleryLightboxProps {
  clip: Clip
  platformLabels: Record<string, string>
  platformIcons: Record<string, string>
  onClose: () => void
}

export function GalleryLightbox({
  clip,
  platformLabels,
  platformIcons,
  onClose,
}: GalleryLightboxProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Selected platform for playback
  const platforms = Object.keys(clip.platformAssets || {})
  const [activePlatform, setActivePlatform] = useState<string>(platforms[0] ?? '')
  const [copied, setCopied] = useState(false)

  const activeAsset = clip.platformAssets?.[activePlatform]
  const videoUrl = activeAsset?.videoUrl ?? ''

  // Keyboard handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Arrow keys cycle platforms
      if (e.key === 'ArrowRight') {
        const idx = platforms.indexOf(activePlatform)
        const next = platforms[(idx + 1) % platforms.length]
        if (next) setActivePlatform(next)
      }
      if (e.key === 'ArrowLeft') {
        const idx = platforms.indexOf(activePlatform)
        const prev = platforms[(idx - 1 + platforms.length) % platforms.length]
        if (prev) setActivePlatform(prev)
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, activePlatform, platforms])

  // Reset + play when platform changes
  useEffect(() => {
    const v = videoRef.current
    if (!v || !videoUrl) return
    v.load()
    v.play().catch(() => {/* ignore autoplay policy */})
  }, [videoUrl, activePlatform])

  // Copy caption
  const handleCopy = useCallback(async () => {
    const text = [
      clip.captions?.primary,
      clip.hashtags?.core?.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' '),
    ].filter(Boolean).join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {/* clipboard blocked */}
  }, [clip])

  const scorePercent = Math.round((clip.compositeScore ?? 0) * 100)
  const allHashtags = [
    ...(clip.hashtags?.core ?? []),
    ...(clip.hashtags?.niche ?? []),
    ...(clip.hashtags?.brand ?? []),
  ]

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-[0_40px_80px_-20px_rgba(0,0,0,.8)] overflow-hidden animate-scale-in flex flex-col lg:flex-row max-h-[90vh]">

        {/* ── Close button ────────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-surface/80 text-muted-foreground hover:text-foreground hover:bg-muted backdrop-blur-sm transition-all"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Left: video player ───────────────────────────── */}
        <div className="relative lg:w-[42%] bg-black flex flex-col">
          {/* Platform switcher tabs */}
          {platforms.length > 1 && (
            <div className="flex items-center gap-1 p-2 bg-black/60 backdrop-blur-sm border-b border-white/10 overflow-x-auto">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePlatform(p)}
                  className={cn(
                    'shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wide transition-all',
                    activePlatform === p
                      ? 'bg-primary/90 text-primary-foreground shadow-[0_0_12px_-4px_var(--color-primary)]'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                  )}
                >
                  <span>{platformIcons[p] ?? '●'}</span>
                  {platformLabels[p] ?? p}
                </button>
              ))}
            </div>
          )}

          {/* Video */}
          <div className="relative flex-1 flex items-center justify-center bg-black min-h-0">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain max-h-[60vh] lg:max-h-[80vh]"
                style={{ background: '#000' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground/50 p-12">
                <Play className="h-12 w-12 opacity-30" />
                <span className="font-mono text-xs uppercase tracking-widest">No video available</span>
              </div>
            )}
          </div>

          {/* Arrow nav for platforms */}
          {platforms.length > 1 && (
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-2" style={{ top: 'auto', bottom: 'auto' }}>
              <button
                onClick={() => {
                  const idx = platforms.indexOf(activePlatform)
                  const prev = platforms[(idx - 1 + platforms.length) % platforms.length]
                  if (prev) setActivePlatform(prev)
                }}
                className="pointer-events-auto p-1.5 rounded-full bg-black/60 text-white/60 hover:text-white hover:bg-black/80 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const idx = platforms.indexOf(activePlatform)
                  const next = platforms[(idx + 1) % platforms.length]
                  if (next) setActivePlatform(next)
                }}
                className="pointer-events-auto p-1.5 rounded-full bg-black/60 text-white/60 hover:text-white hover:bg-black/80 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Download bar */}
          {videoUrl && (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-black/70 border-t border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white/50">
                <Clock className="h-3 w-3" />
                <span className="font-mono text-[10px]">{formatDuration(clip.durationSec)}</span>
                {scorePercent > 0 && (
                  <>
                    <span className="text-white/20">·</span>
                    <Star className="h-3 w-3" />
                    <span className="font-mono text-[10px]">{scorePercent}% score</span>
                  </>
                )}
              </div>
              <a
                href={videoUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/90 text-primary-foreground text-xs font-semibold hover:bg-primary transition-all shadow-[0_0_16px_-4px_var(--color-primary)]"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
          )}
        </div>

        {/* ── Right: clip metadata ─────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 shaddai-scrollbar">

            {/* Title + date */}
            <div>
              <div className="flex items-start gap-2 mb-1">
                <h2 className="font-display text-xl font-bold leading-tight flex-1 text-foreground">
                  {clip.title}
                </h2>
                <Badge
                  variant={
                    clip.status === 'approved' || clip.status === 'exported' ? 'success' :
                    clip.status === 'reviewed' ? 'info' : 'default'
                  }
                  size="sm"
                  className="shrink-0 mt-1"
                >
                  {clip.status}
                </Badge>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {formatDate(clip.createdAt)}
                {scorePercent > 0 && (
                  <span className="ml-3 text-primary">
                    <Star className="h-2.5 w-2.5 inline -mt-px mr-0.5" />
                    {scorePercent}% match
                  </span>
                )}
              </p>
            </div>

            {/* Divider */}
            <div className="film-strip opacity-30" />

            {/* Caption */}
            {clip.captions?.primary && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Caption
                  </span>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md transition-all',
                      copied
                        ? 'text-success bg-success-light'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    title="Copy caption + hashtags"
                  >
                    {copied ? (
                      <><Check className="h-3 w-3" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-lg p-3 border border-border">
                  {clip.captions.primary}
                </p>
              </section>
            )}

            {/* Hashtags */}
            {allHashtags.length > 0 && (
              <section>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">
                  <Hash className="h-3 w-3 inline mr-1 opacity-60" />
                  Hashtags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allHashtags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className={cn(
                        'font-mono text-[10px] px-2 py-1 rounded-md border transition-colors',
                        i < (clip.hashtags?.core?.length ?? 0)
                          ? 'bg-primary-light text-primary border-primary/20'
                          : 'bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Platforms available */}
            {platforms.length > 0 && (
              <section>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">
                  Available formats
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((p) => {
                    const asset = clip.platformAssets?.[p]
                    const url = asset?.videoUrl ?? ''
                    return (
                      <div
                        key={p}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 transition-colors',
                          activePlatform === p
                            ? 'border-primary/40 bg-primary-light'
                            : 'border-border bg-surface'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{platformIcons[p] ?? '●'}</span>
                          <span className={cn(
                            'font-mono text-[10px] uppercase tracking-wide',
                            activePlatform === p ? 'text-primary' : 'text-muted-foreground'
                          )}>
                            {platformLabels[p] ?? p}
                          </span>
                        </div>
                        {url && (
                          <a
                            href={url}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                            title={`Download ${platformLabels[p] ?? p} version`}
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Timing info */}
            <section>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">
                Timing
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Start', value: formatDuration(clip.startSec) },
                  { label: 'End', value: formatDuration(clip.endSec) },
                  { label: 'Duration', value: formatDuration(clip.durationSec) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-center">
                    <div className="font-mono text-xs text-foreground font-semibold">{value}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-border bg-surface/50 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <div className="flex-1" />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy caption'}
            </Button>
            {videoUrl && (
              <a
                href={videoUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-all shadow-[0_4px_20px_-6px_var(--color-primary)] hover:shadow-[0_6px_28px_-6px_var(--color-primary)]"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GalleryLightbox
