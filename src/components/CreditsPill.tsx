// CreditsPill — header status + credits explainer. Shows "Free Beta" while
// BETA_FREE, otherwise the live balance. Opens a small modal explaining the model.
import { useState } from 'react'
import { Gem, X, Sparkles } from 'lucide-react'
import { useCreditsStore, BETA_FREE, COSTS } from '@/stores/creditsStore'

export function CreditsPill() {
  const balance = useCreditsStore((s) => s.balance)
  const spent = useCreditsStore((s) => s.spent)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-light px-2.5 py-1.5 text-xs font-mono text-primary hover:border-primary/60 transition-colors"
        title="Credits"
      >
        <Gem className="h-3.5 w-3.5" />
        {BETA_FREE ? <span className="uppercase tracking-wider">Free&nbsp;Beta</span> : <span>{balance}&nbsp;cr</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary-light border border-primary/20">
                  <Gem className="h-4 w-4 text-primary" />
                </span>
                <h3 className="font-display text-lg font-bold">Credits</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {BETA_FREE ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-primary-light border border-primary/20 px-3 py-2 text-sm text-primary">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">Free beta — everything's on the house.</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Unlimited transcription, highlight detection, rendering, and downloads while we test.
                  No card, no limits. You've run <span className="text-foreground font-mono">{spent}</span> credits&nbsp;worth so far — that's what billing
                  will meter when we launch.
                </p>
                <div className="rounded-lg border border-border bg-surface p-3 text-xs font-mono text-muted-foreground space-y-1">
                  <p className="text-foreground uppercase tracking-widest text-[10px] mb-1.5">Planned pricing</p>
                  <div className="flex justify-between"><span>Render a clip set</span><span className="text-primary">{COSTS.render} cr</span></div>
                  <div className="flex justify-between"><span>Download transcript</span><span className="text-primary">{COSTS.transcriptDownload} cr</span></div>
                  <div className="flex justify-between"><span>Download a clip</span><span className="text-primary">{COSTS.clipDownload} cr</span></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Balance: <span className="text-primary font-semibold">{balance} credits</span>. Renders and downloads spend credits.
              </p>
            )}

            <button
              disabled
              className="mt-5 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold opacity-55 cursor-not-allowed"
            >
              Buy credits — coming soon
            </button>
          </div>
        </div>
      )}
    </>
  )
}
