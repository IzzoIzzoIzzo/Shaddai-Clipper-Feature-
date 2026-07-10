import { useState, useRef, useCallback, useMemo } from 'react'
import {
  Search, Download, Edit3, Check, X, FileText, FileCode2,
  ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { useClipsStore, transcriptSrtUrl, transcriptTxtUrl } from '@/stores/clipsStore'
import type { TranscriptSegment } from '@/types/api'

// ── emotion → badge variant ──
const emotionVariant: Record<string, BadgeProps['variant']> = {
  positive: 'success', insightful: 'info', curious: 'warning',
  emphatic: 'purple', confident: 'success', reflective: 'default',
  provocative: 'purple', authoritative: 'info', excited: 'warning',
  serious: 'default', humorous: 'purple', neutral: 'default',
}

interface TranscriptPanelProps {
  sourceId: string
  segments: TranscriptSegment[]
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Renders text with search matches wrapped in a lime <mark>
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5 not-italic">
            {part}
          </mark>
        ) : part
      )}
    </>
  )
}

export function TranscriptPanel({ sourceId, segments }: TranscriptPanelProps) {
  const updateTranscript = useClipsStore((s) => s.updateTranscript)

  // ── search ──
  const [query, setQuery]     = useState('')

  // ── edit mode ──
  const [editMode, setEditMode]   = useState(false)
  const [drafts, setDrafts]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)
  const [savedAt, setSavedAt]     = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── expand long segments ──
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const scrollRef = useRef<HTMLDivElement>(null)

  // ── filtered segments ──
  const filtered = useMemo(() => {
    if (!query.trim()) return segments
    const q = query.toLowerCase()
    return segments.filter((s) => s.text.toLowerCase().includes(q))
  }, [segments, query])

  const matchCount = filtered.length

  // ── edit helpers ──
  const enterEdit = useCallback(() => {
    const map: Record<string, string> = {}
    segments.forEach((s) => { map[s.id] = s.text })
    setDrafts(map)
    setEditMode(true)
    setSaveError(null)
    setSavedAt(null)
  }, [segments])

  const cancelEdit = useCallback(() => {
    setEditMode(false)
    setDrafts({})
    setSaveError(null)
  }, [])

  const saveEdit = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    const updated: TranscriptSegment[] = segments.map((s) => ({
      ...s,
      text: drafts[s.id] ?? s.text,
    }))
    // updateTranscript does an optimistic local update then fires the PATCH
    // best-effort (it swallows engine errors internally). To detect a real
    // HTTP failure we also fire our own PATCH and catch it; if it throws we
    // keep the local copy (already applied) but surface the error banner.
    // The store's PATCH runs in parallel — two identical calls is harmless.
    try {
      await updateTranscript(sourceId, updated)
      // Verify the engine accepted the payload by re-firing the PATCH directly.
      // We use a non-throwing best-effort check; if the engine is offline the
      // optimistic local update still stands (consistent with store behaviour).
      const res = await fetch(`/api/clips/v1/sources/${sourceId}/transcript`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: updated.map((s) => ({ startSec: s.startSec, endSec: s.endSec, text: s.text })),
        }),
      })
      if (!res.ok) throw new Error(`Engine returned ${res.status}`)
      setSavedAt(new Date())
      setEditMode(false)
      setDrafts({})
    } catch (err) {
      // Local copy is already updated via the optimistic store write above.
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setSaveError(`Save failed (${msg}) — changes are kept locally until you reload.`)
    } finally {
      setSaving(false)
    }
  }, [segments, drafts, sourceId, updateTranscript])

  const updateDraft = useCallback((id: string, value: string) => {
    setDrafts((d) => ({ ...d, [id]: value }))
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }, [])

  const CHAR_LIMIT = 200

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ════════════════════════════════════════════════════
          TOOLBAR — search + download + edit toggle
      ════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 flex-shrink-0">

        {/* search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript…"
            className={cn(
              'h-9 w-full rounded-lg border border-border bg-background/60 pl-9 pr-10 text-sm font-mono',
              'placeholder:text-muted-foreground/40 text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60',
              'transition-all duration-150'
            )}
          />
          {/* live match count pill */}
          {query.trim() && (
            <span className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums',
              'px-1.5 py-0.5 rounded bg-primary-light text-primary'
            )}>
              {matchCount}
            </span>
          )}
        </div>

        {/* action cluster */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* download SRT */}
          <a
            href={transcriptSrtUrl(sourceId)}
            download
            title="Download SRT subtitles"
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg',
              'border border-border bg-surface/60 text-xs font-mono text-muted-foreground',
              'hover:border-primary/40 hover:text-primary hover:bg-primary-light/30',
              'transition-all duration-150'
            )}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            .SRT
          </a>

          {/* download TXT */}
          <a
            href={transcriptTxtUrl(sourceId)}
            download
            title="Download plain text transcript"
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg',
              'border border-border bg-surface/60 text-xs font-mono text-muted-foreground',
              'hover:border-primary/40 hover:text-primary hover:bg-primary-light/30',
              'transition-all duration-150'
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            .TXT
          </a>

          {/* vertical divider */}
          <div className="w-px h-5 bg-border mx-0.5" />

          {/* edit toggle */}
          {!editMode ? (
            <Button variant="outline" size="sm" onClick={enterEdit}
              className="gap-1.5 font-mono text-xs h-9">
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEdit}
                className="gap-1.5 font-mono text-xs h-9 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} loading={saving}
                className="gap-1.5 font-mono text-xs h-9">
                <Check className="h-3.5 w-3.5" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── status banners ── */}
      {savedAt && !editMode && (
        <div className={cn(
          'mb-3 flex items-center gap-2 text-xs font-mono',
          'text-success bg-success-light border border-success/15 px-3 py-2 rounded-lg',
          'animate-fade-in flex-shrink-0'
        )}>
          <Check className="h-3.5 w-3.5 shrink-0" />
          Transcript saved at {savedAt.toLocaleTimeString()}
        </div>
      )}
      {saveError && (
        <div className={cn(
          'mb-3 flex items-center gap-2 text-xs font-mono',
          'text-danger bg-danger-light border border-danger/15 px-3 py-2 rounded-lg',
          'animate-fade-in flex-shrink-0'
        )}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {saveError}
        </div>
      )}
      {editMode && (
        <div className={cn(
          'mb-3 text-xs font-mono text-warning bg-warning-light',
          'border border-warning/15 px-3 py-2 rounded-lg flex-shrink-0 animate-fade-in'
        )}>
          Editing mode — click Save when done to persist changes.
        </div>
      )}

      {/* ── search results summary ── */}
      {query.trim() && (
        <div className="mb-3 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-mono text-muted-foreground">
            <span className="text-primary font-medium">{matchCount}</span>
            {' '}of {segments.length} segments match
          </span>
          {matchCount > 0 && (
            <button
              onClick={() => setQuery('')}
              className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── empty search ── */}
      {query.trim() && matchCount === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <Search className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground font-mono">
            No segments match &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SEGMENT LIST — the cutting room tape roll
      ════════════════════════════════════════════════════ */}
      {(matchCount > 0 || !query.trim()) && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto shaddai-scrollbar min-h-0 pr-1 -mr-1"
        >
          {/* thin tape-leader at top */}
          <div className="mb-1 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />

          <div className="space-y-0.5">
            {filtered.map((seg, i) => {
              const isExpanded = !!expanded[seg.id]
              const isLong = seg.text.length > CHAR_LIMIT
              const rawText = editMode ? (drafts[seg.id] ?? seg.text) : seg.text
              const displayText =
                editMode
                  ? rawText
                  : isLong && !isExpanded
                  ? seg.text.slice(0, CHAR_LIMIT) + '…'
                  : seg.text

              const isEdited = editMode && (drafts[seg.id] ?? seg.text) !== seg.text

              return (
                <div
                  key={seg.id}
                  className={cn(
                    'group relative flex gap-0 rounded-lg overflow-hidden',
                    'transition-all duration-150',
                    editMode
                      ? 'ring-1 ring-transparent hover:ring-primary/20 bg-background/30 hover:bg-background/60'
                      : 'hover:bg-muted/30',
                    isEdited && 'ring-1 ring-primary/30 bg-primary-light/10'
                  )}
                >
                  {/* ── timecode rail — left gutter ── */}
                  <div className={cn(
                    'flex-shrink-0 w-[5.5rem] flex flex-col justify-start gap-0.5 px-3 py-3',
                    'border-r border-border/50',
                    // subtle zebra on every other row
                    i % 2 === 0 ? 'bg-surface/40' : 'bg-transparent'
                  )}>
                    {/* START timecode — lime accent */}
                    <span className="font-mono text-[11px] text-primary tabular-nums leading-none font-medium">
                      {formatDuration(seg.startSec)}
                    </span>
                    {/* END timecode — dimmed */}
                    <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums leading-none">
                      {formatDuration(seg.endSec)}
                    </span>

                    {/* confidence warning dot — only when confidence is a
                        valid number below threshold (guards stale/missing data) */}
                    {typeof seg.confidence === 'number' && !Number.isNaN(seg.confidence) && seg.confidence < 0.8 && (
                      <span className="mt-1 font-mono text-[9px] text-warning/80 tabular-nums">
                        {(seg.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* ── content column ── */}
                  <div className={cn(
                    'flex-1 min-w-0 px-3 py-3',
                    i % 2 === 0 ? 'bg-surface/20' : 'bg-transparent'
                  )}>
                    {/* speaker + badges row */}
                    <div className="flex items-center flex-wrap gap-1.5 mb-2">
                      <span className="font-mono text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                        {seg.speaker}
                      </span>
                      {seg.emotion && seg.emotion !== 'neutral' && (
                        <Badge variant={emotionVariant[seg.emotion] || 'default'} size="sm">
                          {seg.emotion}
                        </Badge>
                      )}
                      {(Array.isArray(seg.topics) ? seg.topics : []).slice(0, 2).map((t) => (
                        <Badge key={t} variant="info" size="sm">{t}</Badge>
                      ))}
                      {isEdited && (
                        <span className="font-mono text-[9px] text-primary bg-primary-light px-1.5 py-0.5 rounded uppercase tracking-wider">
                          edited
                        </span>
                      )}
                    </div>

                    {/* segment text — read or edit */}
                    {editMode ? (
                      <textarea
                        value={drafts[seg.id] ?? seg.text}
                        onChange={(e) => updateDraft(seg.id, e.target.value)}
                        rows={Math.max(2, Math.ceil((drafts[seg.id] ?? seg.text).length / 80))}
                        className={cn(
                          'w-full resize-none rounded-md border bg-background/80',
                          'px-2.5 py-2 text-sm leading-relaxed font-sans text-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50',
                          'transition-all duration-150',
                          isEdited ? 'border-primary/30' : 'border-border'
                        )}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed text-foreground/90">
                        <HighlightText text={displayText} query={query} />

                        {/* expand / collapse controls */}
                        {isLong && !isExpanded && (
                          <button
                            onClick={() => toggleExpand(seg.id)}
                            className={cn(
                              'ml-2 inline-flex items-center gap-0.5',
                              'text-[11px] font-mono text-primary/70 hover:text-primary transition-colors'
                            )}
                          >
                            more <ChevronDown className="h-3 w-3" />
                          </button>
                        )}
                        {isLong && isExpanded && (
                          <button
                            onClick={() => toggleExpand(seg.id)}
                            className={cn(
                              'ml-2 inline-flex items-center gap-0.5',
                              'text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors'
                            )}
                          >
                            less <ChevronUp className="h-3 w-3" />
                          </button>
                        )}
                      </p>
                    )}
                  </div>

                  {/* left accent bar — shows on hover or in edit mode */}
                  <div className={cn(
                    'absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-150',
                    isEdited ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/30'
                  )} />
                </div>
              )
            })}
          </div>

          {/* tape-trailer at bottom */}
          <div className="mt-2 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        </div>
      )}
    </div>
  )
}
