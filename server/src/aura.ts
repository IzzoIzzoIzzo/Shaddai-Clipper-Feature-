// ============================================================
// AURA — zero-dep LLM token-saver for the clipper engine.
// Mirrors backend/lib/aura.js concept: exact-hash FETCH cache around
// every agent text/image-prompt call. Never throws. Counts savings.
// Local by default; set AURA_URL to forward to the dashboard's AURA later.
// ============================================================
import { createHash } from 'node:crypto'

interface Stats { hits: number; misses: number; tokensSaved: number }

// rough token estimate: ~4 chars/token (used only for the savings counter)
function estTokens(s: string): number { return Math.max(1, Math.round(s.length / 4)) }

function key(taskType: string, input: string): string {
  return createHash('sha256').update(taskType + ' ' + input.trim().toLowerCase()).digest('hex')
}

export class Aura {
  private cache = new Map<string, string>()
  private _stats: Stats = { hits: 0, misses: 0, tokensSaved: 0 }

  /** Run fn unless an identical (taskType,input) was seen before. Never throws. */
  async text(taskType: string, input: string, fn: () => Promise<string>): Promise<string> {
    const k = key(taskType, input)
    const cached = this.cache.get(k)
    if (cached !== undefined) {
      this._stats.hits++
      this._stats.tokensSaved += estTokens(input) + estTokens(cached)
      return cached
    }
    this._stats.misses++
    let out: string
    try { out = await fn() } catch { out = '' } // fallback handled by caller
    if (out) this.cache.set(k, out)
    return out
  }

  stats(): Stats { return { ...this._stats } }
  reset() { this.cache.clear(); this._stats = { hits: 0, misses: 0, tokensSaved: 0 } }
}

// shared singleton for the engine
export const aura = new Aura()
