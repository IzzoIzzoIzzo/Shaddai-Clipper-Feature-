import { cn } from '@/lib/utils'

interface Signals {
  linguistic: number
  audio: number
  sentiment: number
  qa: number
}

interface CandidateSignalBarsProps {
  signals: Signals
  className?: string
}

const SIGNAL_META: Record<keyof Signals, { label: string; color: string; glow: string }> = {
  linguistic: { label: 'LING', color: 'bg-info',    glow: 'rgba(90,210,255,0.6)' },
  audio:      { label: 'AUD',  color: 'bg-primary', glow: 'rgba(0,229,160,0.6)' },
  sentiment:  { label: 'SENT', color: 'bg-purple',  glow: 'rgba(183,148,255,0.6)' },
  qa:         { label: 'Q/A',  color: 'bg-warning', glow: 'rgba(255,194,75,0.6)' },
}

export function CandidateSignalBars({ signals, className }: CandidateSignalBarsProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {(Object.entries(signals) as [keyof Signals, number][]).map(([key, val]) => {
        const meta = SIGNAL_META[key]
        const pct = Math.min(100, Math.max(0, val * 100))
        return (
          <div key={key} className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-9 shrink-0"
            >
              {meta.label}
            </span>
            {/* Track */}
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', meta.color)}
                style={{
                  width: `${pct}%`,
                  boxShadow: `0 0 6px ${meta.glow}`,
                }}
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground/60 w-6 text-right tabular-nums">
              {Math.round(pct)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
