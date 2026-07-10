import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { PLATFORMS } from '@/lib/constants'
import {
  ArrowLeft,
  Sparkles,
  Flame,
  Clapperboard,
  ChevronRight,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'
import { CandidateCard } from '@/components/CandidateCard'

// ── platform toggle pill ──────────────────────────────────────
function PlatformPill({
  id, label, icon, isSelected, onToggle,
}: { id: string; label: string; icon: string; isSelected: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 font-mono tracking-wide',
        isSelected
          ? 'border-primary/70 bg-primary-light text-primary shadow-[0_0_10px_-2px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ── burn captions toggle ──────────────────────────────────────
function BurnCaptionsToggle({
  value, onChange,
}: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 w-full text-left',
        value
          ? 'border-secondary/60 bg-secondary-light shadow-[0_0_12px_-4px_color-mix(in_srgb,var(--color-secondary)_30%,transparent)]'
          : 'border-border hover:border-secondary/40 bg-card'
      )}
    >
      {/* pill toggle switch */}
      <div
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0',
          value ? 'bg-secondary' : 'bg-muted'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
            value ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Flame
            className={cn('h-4 w-4 shrink-0', value ? 'text-secondary' : 'text-muted-foreground')}
          />
          <span className={cn('text-sm font-semibold', value ? 'text-secondary' : 'text-foreground')}>
            Burn captions into video
          </span>
          {value && (
            <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-secondary/20 text-secondary">
              ON
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          Bake TikTok-style animated subtitles directly into the rendered MP4
        </p>
      </div>
    </button>
  )
}

// ── page ─────────────────────────────────────────────────────
export function CandidateReviewPage() {
  const { sourceId } = useParams<{ sourceId: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)

  const candidates = useClipsStore(
    (s) => (sourceId ? (s.candidates[sourceId] ?? []) : [])
  )
  const generateClips  = useClipsStore((s) => s.generateClips)
  const setCandidateSelection = useClipsStore((s) => s.setCandidateSelection)

  const [selected, setSelected] = useState<string[]>(
    () => candidates.slice(0, 3).map((c) => c.candidateId)
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'reels', 'x'])
  const [burnCaptions, setBurnCaptions] = useState(false)
  const [generating, setGenerating] = useState(false)

  // ── helpers ──────────────────────────────────────────────
  const toggleCandidate = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )

  const togglePlatform = (id: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const autoSelect = () => {
    const top = [...candidates]
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 3)
      .map((c) => c.candidateId)
    setSelected(top)
    addToast({ type: 'info', title: 'Top 3 selected', message: 'Auto-selected highest-scoring candidates', duration: 3000 })
  }

  const handleGenerate = async () => {
    if (!sourceId || selected.length === 0 || selectedPlatforms.length === 0) return
    setGenerating(true)
    try {
      setCandidateSelection(sourceId, selected)
      const batchId = await generateClips({
        sourceId,
        candidateIds: selected,
        platforms: selectedPlatforms,
        burnCaptions,
      })
      addToast({
        type: 'info',
        title: 'Rendering started',
        message: `Cutting ${selected.length} clip${selected.length !== 1 ? 's' : ''} across ${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? 's' : ''}`,
        duration: 3000,
      })
      navigate(`/clips/batches/${batchId}`)
    } catch (err: any) {
      addToast({ type: 'error', title: 'Generation failed', message: String(err?.message ?? err), duration: 5000 })
    } finally {
      setGenerating(false)
    }
  }

  const canGenerate = selected.length > 0 && selectedPlatforms.length > 0 && !generating

  // ── empty state ───────────────────────────────────────────
  if (candidates.length === 0) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Source
        </button>
        <EmptyState
          icon={<Clapperboard />}
          title="No candidates yet"
          description="The analysis engine hasn't detected any highlight moments yet. Check back once the source has finished processing."
          action={{ label: 'Back to Source', onClick: () => navigate(-1) }}
        />
      </div>
    )
  }

  // ── main layout ───────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* ── back ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Source
      </button>

      {/* ── page header ── */}
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          {/* film-strip accent above heading */}
          <div className="film-strip w-32 mb-3 rounded-sm" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            THE TABLE
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} detected — select the moments worth cutting
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* selection counter */}
          <span className="font-mono text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{selected.length}</span>
            /{candidates.length} selected
          </span>
          <Button variant="ghost" size="sm" onClick={autoSelect} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Auto Top 3
          </Button>
        </div>
      </div>

      {/* ── two-column layout: candidates left, config right ── */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT: candidate grid ── */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidates.map((candidate, i) => (
              <CandidateCard
                key={candidate.candidateId}
                candidate={candidate}
                index={i}
                isSelected={selected.includes(candidate.candidateId)}
                onToggle={toggleCandidate}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: sticky config panel ── */}
        <div className="w-72 shrink-0 sticky top-6 space-y-4 animate-slide-in-right">

          {/* panel shell */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* panel header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface">
              <Clapperboard className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Export Config</span>
            </div>

            <div className="p-4 space-y-5">
              {/* ── platforms ── */}
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2.5">
                  Target Platforms
                </p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <PlatformPill
                      key={p.id}
                      id={p.id}
                      label={p.label}
                      icon={p.icon}
                      isSelected={selectedPlatforms.includes(p.id)}
                      onToggle={togglePlatform}
                    />
                  ))}
                </div>
                {selectedPlatforms.length === 0 && (
                  <p className="text-[11px] text-danger mt-2">Select at least one platform</p>
                )}
              </div>

              {/* divider */}
              <div className="h-px bg-border" />

              {/* ── burn captions ── */}
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2.5">
                  Captions
                </p>
                <BurnCaptionsToggle value={burnCaptions} onChange={setBurnCaptions} />
              </div>

              {/* divider */}
              <div className="h-px bg-border" />

              {/* ── summary ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Clips selected</span>
                  <span className="font-mono font-semibold text-foreground">{selected.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Platforms</span>
                  <span className="font-mono font-semibold text-foreground">{selectedPlatforms.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total renders</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selected.length * selectedPlatforms.length}
                  </span>
                </div>
                {burnCaptions && (
                  <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-lg bg-secondary-light border border-secondary/30">
                    <Flame className="h-3 w-3 text-secondary shrink-0" />
                    <span className="text-[11px] text-secondary font-medium">Captions will be baked in</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── GENERATE BUTTON — the only lime fill CTA ── */}
          <Button
            size="lg"
            variant="primary"
            disabled={!canGenerate}
            loading={generating}
            onClick={handleGenerate}
            className="w-full gap-2.5 text-base font-bold"
          >
            {!generating && <ChevronRight className="h-5 w-5" />}
            Generate {selected.length > 0 ? `${selected.length} ` : ''}Clip{selected.length !== 1 ? 's' : ''}
          </Button>

          {!canGenerate && !generating && (
            <p className="text-[11px] text-muted-foreground text-center">
              {selected.length === 0
                ? 'Select at least one candidate above'
                : 'Select at least one platform'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
