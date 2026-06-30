// ============================================================
// Narration — agent-written text for each clip. LLM-optional.
// With no API key, deterministic fallbacks derive copy from the real
// transcript so a clip ALWAYS gets usable narration. AURA-wrapped.
// QUILL = copy (hook/caption/title/hashtags), TURTLE = virality score.
// ============================================================
import { aura } from './aura.ts'

export interface NarrationInput {
  startSec: number; endSec: number; durationSec: number; compositeScore: number
  primaryTopic: string; transcriptExcerpt: string
}
export interface Narration {
  hook: string; caption: string; title: string; hashtags: string[]
  viralityScore: number; agentCredits: { copy: string; score: string }
}

const STOP = new Set(['the','a','an','and','or','but','is','are','to','of','in','on','for','with','that','this','it','you','we','i'])

function firstStrongSentence(text: string): string {
  const parts = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  // prefer a question or one containing a punchy word
  const punchy = parts.find((p) => /\?|\b(never|always|secret|mistake|nobody|biggest|best|worst)\b/i.test(p))
  return (punchy || parts[0] || text).slice(0, 90)
}
function keywords(text: string, n: number): string[] {
  const freq = new Map<string, number>()
  for (const w of text.toLowerCase().match(/[a-z]{4,}/g) || []) {
    if (STOP.has(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w)
}
function titleCase(s: string): string { return s.replace(/\b\w/g, (c) => c.toUpperCase()) }

// ── deterministic fallbacks (no LLM) ──
function fbHook(c: NarrationInput): string { return firstStrongSentence(c.transcriptExcerpt) }
function fbCaption(c: NarrationInput): string { return c.transcriptExcerpt.slice(0, 140).trim() }
function fbTitle(c: NarrationInput): string {
  const kw = keywords(c.transcriptExcerpt, 3)
  return titleCase(kw.length ? kw.join(' ') : c.primaryTopic || 'Highlight')
}
function fbHashtags(c: NarrationInput, platforms: string[]): string[] {
  const base = ['#fyp', '#viral']
  const topic = (c.primaryTopic || 'clip').replace(/[^a-z0-9]/gi, '')
  const kw = keywords(c.transcriptExcerpt, 2).map((w) => '#' + w)
  const plat = platforms.includes('linkedin') ? ['#business'] : ['#shorts']
  return [...new Set([...base, '#' + topic, ...kw, ...plat])].slice(0, 6)
}

// ── optional LLM (only if configured); AURA wraps the call ──
function llmEnabled(): boolean { return !!(process.env.OPENAI_API_KEY || process.env.LLM_URL) }
async function llmText(taskType: string, prompt: string, fallback: string): Promise<string> {
  if (!llmEnabled()) return fallback
  const out = await aura.text(taskType, prompt, async () => {
    // Minimal OpenAI-compatible call; any failure → '' (aura) → caller uses fallback.
    const url = (process.env.LLM_URL || 'https://api.openai.com/v1') + '/chat/completions'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` },
      body: JSON.stringify({ model: process.env.LLM_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 60 }),
    })
    if (!res.ok) throw new Error('llm ' + res.status)
    const j: any = await res.json()
    return String(j?.choices?.[0]?.message?.content || '').trim()
  })
  return out || fallback
}

export async function narrate(c: NarrationInput, platforms: string[]): Promise<Narration> {
  const ex = c.transcriptExcerpt || ''
  const [hook, caption, title] = await Promise.all([
    llmText('hook', `Write a punchy 1-line hook for a short video clip about: "${ex}". Max 90 chars, no hashtags.`, fbHook(c)),
    llmText('caption', `Write a 1-2 sentence on-screen caption for: "${ex}". Max 140 chars.`, fbCaption(c)),
    llmText('title', `Write a 3-6 word punchy title for a clip about: "${ex}".`, fbTitle(c)),
  ])
  return {
    hook, caption, title,
    hashtags: fbHashtags(c, platforms), // deterministic; LLM hashtags can come later
    viralityScore: c.compositeScore,
    agentCredits: { copy: 'QUILL', score: 'TURTLE' },
  }
}
