// ============================================================
// GalleryPage — Media Gallery / Clip Vault
// Cinematic keepsake library. Film-vault editorial aesthetic.
// TURTLE / SHADDAI Clipper — src/routes/GalleryPage.tsx
// ============================================================

import { useState, useMemo, useRef, useCallback } from 'react'
import { useClipsStore } from '@/stores/clipsStore'
import { GalleryClipCard } from '@/components/GalleryClipCard'
import { GalleryLightbox } from '@/components/GalleryLightbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Clip } from '@/types/api'
import {
  Search,
  Film,
  SlidersHorizontal,
  LayoutGrid,
  LayoutList,
  ChevronDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Platform display helpers ──────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  reels: 'Reels',
  youtube_shorts: 'YT Shorts',
  x: 'X',
  linkedin: 'LinkedIn',
}
const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵',
  reels: '📸',
  youtube_shorts: '▶',
  x: '✦',
  linkedin: '💼',
}

// ── Sort options ──────────────────────────────────────────────
type SortKey = 'newest' | 'oldest' | 'score' | 'duration'
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'score', label: 'Best score' },
  { value: 'duration', label: 'Longest first' },
]

// ── Layout modes ──────────────────────────────────────────────
type ViewMode = 'masonry' | 'grid'

// ── Main page ─────────────────────────────────────────────────
export function GalleryPage() {
  const clips = useClipsStore((s) => s.clips)
  const navigate = useNavigate()

  // Filters / search state
  const [search, setSearch] = useState('')
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('masonry')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // Lightbox state
  const [lightboxClip, setLightboxClip] = useState<Clip | null>(null)

  // Collect all platforms across clips (deduplicated)
  const allPlatforms = useMemo(() => {
    const set = new Set<string>()
    clips.forEach((c) => Object.keys(c.platformAssets || {}).forEach((p) => set.add(p)))
    return Array.from(set).sort()
  }, [clips])

  // Filtered + sorted clips
  const filtered = useMemo(() => {
    let result = [...clips]

    // Search by title
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.captions?.primary || '').toLowerCase().includes(q)
      )
    }

    // Filter by platform
    if (activePlatform) {
      result = result.filter((c) => c.platformAssets && activePlatform in c.platformAssets)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'score':
          return (b.compositeScore ?? 0) - (a.compositeScore ?? 0)
        case 'duration':
          return (b.durationSec ?? 0) - (a.durationSec ?? 0)
        default:
          return 0
      }
    })

    return result
  }, [clips, search, activePlatform, sortKey])

  // Close sort dropdown on outside click
  const handleSortToggle = useCallback(() => setSortOpen((v) => !v), [])

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortKey)

  // ── Masonry column distribution (3-col on lg, 2-col on md) ──
  const masonryColumns = useMemo(() => {
    // Distribute cards across 3 columns alternating, for visual rhythm
    const cols: Clip[][] = [[], [], []]
    filtered.forEach((clip, i) => cols[i % 3]!.push(clip))
    return cols
  }, [filtered])

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary opacity-80" />
              <span className="font-mono text-[10px] uppercase tracking-[0.36em] text-muted-foreground">
                Clip Vault
              </span>
            </div>
            {/* Live count */}
            <span className="font-mono text-[11px] text-primary bg-primary-light px-2.5 py-0.5 rounded-full border border-primary/20">
              {filtered.length}
              {filtered.length !== clips.length && (
                <span className="text-muted-foreground">/{clips.length}</span>
              )}{' '}
              clips
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Media Gallery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every clip you've forged — browse, preview, download.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 shrink-0">
          <button
            onClick={() => setViewMode('masonry')}
            title="Masonry layout"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'masonry'
                ? 'bg-primary-light text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            title="Grid layout"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-primary-light text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Toolbar: search + platform filter + sort ─────────── */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search clips…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
            className="h-9 text-sm"
          />
        </div>

        {/* Platform filters */}
        {allPlatforms.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
              <SlidersHorizontal className="h-3 w-3 inline mr-1 opacity-60" />
              Filter
            </span>
            <button
              onClick={() => setActivePlatform(null)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wide border transition-all',
                activePlatform === null
                  ? 'bg-primary-light text-primary border-primary/30 shadow-[0_0_10px_-4px_var(--color-primary)]'
                  : 'bg-surface text-muted-foreground border-border hover:border-primary/20 hover:text-foreground'
              )}
            >
              All
            </button>
            {allPlatforms.map((p) => (
              <button
                key={p}
                onClick={() => setActivePlatform(p === activePlatform ? null : p)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wide border transition-all flex items-center gap-1',
                  activePlatform === p
                    ? 'bg-primary-light text-primary border-primary/30 shadow-[0_0_10px_-4px_var(--color-primary)]'
                    : 'bg-surface text-muted-foreground border-border hover:border-primary/20 hover:text-foreground'
                )}
              >
                <span className="text-[10px]">{PLATFORM_ICONS[p] ?? '●'}</span>
                {PLATFORM_LABELS[p] ?? p}
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        <div className="relative ml-auto" ref={sortRef}>
          <button
            onClick={handleSortToggle}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all font-mono"
          >
            <span className="text-[10px] uppercase tracking-widest">{currentSort?.label}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', sortOpen && 'rotate-180')} />
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-lg shadow-2xl z-30 overflow-hidden animate-scale-in"
              onMouseLeave={() => setSortOpen(false)}
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortKey(opt.value); setSortOpen(false) }}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-[11px] font-mono uppercase tracking-wide transition-colors',
                    sortKey === opt.value
                      ? 'text-primary bg-primary-light'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────── */}
      {clips.length === 0 && (
        <GalleryEmptyState onUpload={() => navigate('/clips/upload')} />
      )}

      {/* No results from filter */}
      {clips.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center animate-fade-in">
          <div className="text-4xl mb-4 opacity-40">⌀</div>
          <p className="font-display text-lg font-semibold text-foreground">No clips match</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term or clear the platform filter.
          </p>
          <button
            onClick={() => { setSearch(''); setActivePlatform(null) }}
            className="mt-5 px-4 py-2 rounded-lg bg-primary-light text-primary text-sm font-medium border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Clip grid ─────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <>
          {viewMode === 'masonry' ? (
            /* Masonry: 3 columns, cards distributed */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {masonryColumns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-4">
                  {col.map((clip, idx) => (
                    <GalleryClipCard
                      key={clip.clipId}
                      clip={clip}
                      platformLabels={PLATFORM_LABELS}
                      platformIcons={PLATFORM_ICONS}
                      onClick={() => setLightboxClip(clip)}
                      className={cn(
                        `stagger-${Math.min((ci * 3 + idx + 1), 8)}`
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            /* Grid: uniform 16:9 card grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((clip, idx) => (
                <GalleryClipCard
                  key={clip.clipId}
                  clip={clip}
                  platformLabels={PLATFORM_LABELS}
                  platformIcons={PLATFORM_ICONS}
                  onClick={() => setLightboxClip(clip)}
                  compact
                  className={cn(`stagger-${Math.min(idx + 1, 8)}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Lightbox ──────────────────────────────────────────── */}
      {lightboxClip && (
        <GalleryLightbox
          clip={lightboxClip}
          platformLabels={PLATFORM_LABELS}
          platformIcons={PLATFORM_ICONS}
          onClose={() => setLightboxClip(null)}
        />
      )}
    </div>
  )
}

// ── Beautiful empty state ─────────────────────────────────────
function GalleryEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center py-24 animate-fade-in">
      {/* Film frame decorative */}
      <div className="relative mb-8">
        <div className="w-40 h-28 rounded-xl border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden">
          {/* Sprocket holes top */}
          <div className="absolute top-2 inset-x-0 flex justify-around px-3 pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-2.5 h-2 rounded-[2px] bg-muted border border-border opacity-60" />
            ))}
          </div>
          {/* Sprocket holes bottom */}
          <div className="absolute bottom-2 inset-x-0 flex justify-around px-3 pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-2.5 h-2 rounded-[2px] bg-muted border border-border opacity-60" />
            ))}
          </div>
          <Film className="h-10 w-10 text-muted-foreground opacity-30" />
        </div>
        {/* Glow accent */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-primary opacity-10 blur-xl" />
      </div>

      <h3 className="font-display text-xl font-bold text-foreground mb-1.5">
        Your vault is empty
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
        Generate clips from a source video and they'll appear here — ready to preview, download, and share.
      </p>

      <button
        onClick={onUpload}
        className="mt-7 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-[0_4px_20px_-6px_var(--color-primary)] hover:bg-primary-hover transition-all active:scale-95"
      >
        Upload a source
      </button>

      {/* Decorative film strip below */}
      <div className="mt-10 film-strip w-64 opacity-30" />
    </div>
  )
}

export default GalleryPage
