import { cn, formatDuration } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ClipCandidate } from '@/types/api'

// ── signal metadata ───────────────────────────────────────────
const SIGNAL_META: Record<string, { label: string; color: string; dim: string }> = {
  linguistic: { label: 'LING', color: 'bg-info',    dim: 'bg-info/15'    },
  audio:      { label: 'AUD',  color: 'bg-warning',  dim: 'bg-warning/15'  },
  sentiment:  { label: 'SENT', color: 'bg-purple',   dim: 'bg-purple/15'   },
  qa:         { label: 'Q/A',  color: 'bg-secondary', dim: 'bg-secondary/15' },
}

// ── radial gauge (SVG) ────────────────────────────────────────
function RadialGauge({ score }: { score: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, score))
  const dash = pct * circ
  const gap  = circ - dash

  // color band: danger → warning → success
  const color =
    pct >= 0.8 ? 'var(--color-success)'
    : pct >= 0.6 ? 'var(--color-warning)'
    : 'var(--color-danger)'

  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        {/* track */}
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-border)" strokeWidth="4" />
        {/* fill */}
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray .6s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <span
        className="absolute font-mono font-bold text-[13px] leading-none"
        style={{ color }}
      >
        {Math.round(pct * 100)}
      </span>
    </div>
  )
}

// ── signal bar row ────────────────────────────────────────────
function SignalBar({ label, value, color, dim }: { label: string; value: number; color: string; dim: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('font-mono text-[9px] font-bold tracking-widest shrink-0 w-8', 'text-muted-foreground')}>{label}</span>
      <div className={cn('flex-1 h-1 rounded-full', dim)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="font-mono text-[9px] text-muted-foreground w-6 text-right">{Math.round(value * 100)}</span>
    </div>
  )
}

// ── main card ─────────────────────────────────────────────────
interface CandidateCardProps {
  candidate: ClipCandidate
  index: number
  isSelected: boolean
  onToggle: (id: string) => void
}

export function CandidateCard({ candidate, index, isSelected, onToggle }: CandidateCardProps) {
  const { candidateId, startSec, endSec, durationSec, compositeScore, signals, primaryTopic, summarySentence, transcriptExcerpt } = candidate

  // stagger classes cycle 1–8
  const stagger = `stagger-${((index % 8) + 1)}`

  return (
    <button
      type="button"
      onClick={() => onToggle(candidateId)}
      className={cn(
        'group relative w-full text-left rounded-xl border transition-all duration-300 animate-fade-in card-hover',
        stagger,
        'bg-card border-border',
        isSelected
          ? 'border-primary/70 shadow-[0_0_0_1px_var(--color-primary),0_8px_32px_-8px_color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-primary-light/30'
          : 'hover:border-border/80'
      )}
    >
      {/* selected lime hairline top edge */}
      {isSelected && (
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl bg-primary animate-fade-in" />
      )}

      {/* ── header row ── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* radial score */}
        <RadialGauge score={compositeScore} />

        {/* meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="info" size="sm">{primaryTopic}</Badge>
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
              CLIP {String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <p className="text-sm text-foreground leading-snug line-clamp-2 font-medium">
            {summarySentence}
          </p>
        </div>

        {/* checkbox */}
        <div
          className={cn(
            'shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
            isSelected
              ? 'border-primary bg-primary'
              : 'border-border group-hover:border-primary/50'
          )}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* ── timecode strip ── */}
      <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-surface border border-border flex items-center gap-3">
        <div className="film-strip flex-1 rounded-sm" />
        <span className="font-mono text-[11px] text-primary shrink-0">
          {formatDuration(startSec)}
        </span>
        <span className="text-muted-foreground/40 text-[10px]">→</span>
        <span className="font-mono text-[11px] text-primary shrink-0">
          {formatDuration(endSec)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
          ({formatDuration(durationSec)})
        </span>
        <div className="film-strip flex-1 rounded-sm" />
      </div>

      {/* ── signal bars ── */}
      <div className="px-4 pb-3 space-y-1.5">
        {(Object.entries(signals) as [keyof typeof signals, number][]).map(([key, val]) => {
          const meta = SIGNAL_META[key]
          if (!meta) return null
          return (
            <SignalBar
              key={key}
              label={meta.label}
              value={val}
              color={meta.color}
              dim={meta.dim}
            />
          )
        })}
      </div>

      {/* ── excerpt ── */}
      {transcriptExcerpt && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-lg bg-muted/60 border-l-2 border-primary/30">
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed line-clamp-2 italic">
            "{transcriptExcerpt}"
          </p>
        </div>
      )}
    </button>
  )
}
