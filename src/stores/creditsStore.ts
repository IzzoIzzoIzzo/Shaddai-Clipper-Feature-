// creditsStore — scaffolding for usage-based billing.
//
// BETA: everyone runs FREE. The balance / spend / gate plumbing all exists so we
// can flip BETA_FREE=false later and start charging (renders, transcript/clip
// downloads) with zero rewrite — just enforce canAfford()/spend() at the gates.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Flip to false to enforce credits. Keep true during the free beta.
export const BETA_FREE = true

// Suggested costs (used for display + when billing turns on).
export const COSTS = { render: 5, transcriptDownload: 1, clipDownload: 1 } as const

interface CreditsState {
  balance: number
  spent: number
  canAfford: (n: number) => boolean
  spend: (n: number, reason?: string) => boolean // true = allowed to proceed
  add: (n: number) => void
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
      balance: 100,
      spent: 0,
      canAfford: (n) => BETA_FREE || get().balance >= n,
      spend: (n, _reason) => {
        if (BETA_FREE) { set((s) => ({ spent: s.spent + n })); return true }
        if (get().balance < n) return false
        set((s) => ({ balance: s.balance - n, spent: s.spent + n }))
        return true
      },
      add: (n) => set((s) => ({ balance: s.balance + n })),
    }),
    { name: 'shaddai-clips-credits' },
  ),
)
