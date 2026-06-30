// ============================================================
// mockApi — in-browser simulation of the SHADDAI Clips backend.
//
// This is the "basis" for the real backend: every generator here
// (transcript → candidate detection → hook/caption/hashtag writing →
// clip assembly) maps to a backend agent/step described in docs/.
// When the real Hono/Prisma/FFmpeg pipeline exists, the store swaps
// these pure functions for `apiClient(...)` calls of the same shape.
//
// Pure + deterministic-ish: no state lives here. clipsStore owns state.
// ============================================================

import type {
  Source,
  TranscriptSegment,
  ClipCandidate,
  Clip,
  GenerationBatch,
  BrandProfile,
} from '@/types/api'

let _seq = 0
export function uid(prefix: string): string {
  _seq += 1
  return `${prefix}_${Date.now().toString(36)}${_seq.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

const nowISO = () => new Date().toISOString()

// ── Title extraction (mirrors backend filename → title heuristic) ──
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
  if (!base) return 'Untitled Source'
  return base.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function titleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    if (/youtube|youtu\.be/.test(u.hostname)) return 'YouTube Import — ' + (u.searchParams.get('v') || 'video')
    if (/vimeo/.test(u.hostname)) return 'Vimeo Import'
    return u.hostname.replace(/^www\./, '') + ' import'
  } catch {
    return 'URL Import'
  }
}

// ── A small corpus of realistic transcript lines for demo variety ──
const TRANSCRIPT_POOL: { text: string; topics: string[]; emotion: string }[] = [
  { text: "Welcome to the show. Today we're talking about the one thing most people get completely wrong.", topics: ['introduction'], emotion: 'positive' },
  { text: "The biggest mistake I see is optimizing for the wrong metric. When you chase vanity numbers, you lose the plot.", topics: ['mistakes', 'strategy'], emotion: 'insightful' },
  { text: "So you're saying the conventional advice is actually backwards? That's contrarian.", topics: ['contrarian'], emotion: 'curious' },
  { text: "The single most important move is knowing when to walk away. Here's why: people smell desperation.", topics: ['negotiation', 'strategy'], emotion: 'emphatic' },
  { text: "Let me give you the three-step framework I use every single time, no exceptions.", topics: ['framework', 'tactics'], emotion: 'confident' },
  { text: "I failed at this four times before it clicked. The lesson cost me two years and a lot of money.", topics: ['failure', 'lessons'], emotion: 'reflective' },
  { text: "Most experts won't tell you this because it threatens their entire business model.", topics: ['contrarian', 'industry'], emotion: 'provocative' },
  { text: "If you only remember one thing from this conversation, make it this next sentence.", topics: ['key-insight'], emotion: 'emphatic' },
  { text: "The data is unambiguous: the top one percent do the opposite of what everyone else does.", topics: ['data', 'strategy'], emotion: 'authoritative' },
  { text: "Here's a question that changed everything for me — and it's deceptively simple.", topics: ['question', 'mindset'], emotion: 'curious' },
]

export function makeTranscript(durationSec: number): TranscriptSegment[] {
  const segs: TranscriptSegment[] = []
  let t = 0
  let i = 0
  while (t < durationSec - 30 && i < 40) {
    const pool = TRANSCRIPT_POOL[i % TRANSCRIPT_POOL.length]!
    const len = 25 + Math.random() * 70
    segs.push({
      id: uid('seg'),
      startSec: Math.round(t * 10) / 10,
      endSec: Math.round((t + len) * 10) / 10,
      speaker: i % 3 === 0 ? 'A' : 'B',
      text: pool.text,
      topics: pool.topics,
      emotion: pool.emotion,
      confidence: Math.round((0.85 + Math.random() * 0.14) * 100) / 100,
    })
    t += len
    i += 1
  }
  return segs
}

// ── Highlight detection → clip candidates (rule-based scoring sim) ──
export function makeCandidates(segments: TranscriptSegment[], count = 5): ClipCandidate[] {
  // Score each segment by simple signals, take the top N, sort by score.
  const scored = segments.map((s, idx) => {
    const linguistic = clamp(0.55 + (s.topics.length * 0.08) + Math.random() * 0.2)
    const audio = clamp(0.55 + Math.random() * 0.4)
    const sentiment = clamp((/emphatic|provocative|confident|authoritative/.test(s.emotion) ? 0.78 : 0.6) + Math.random() * 0.18)
    const qa = clamp((/question|curious/.test(s.emotion) ? 0.72 : 0.5) + Math.random() * 0.2)
    const composite = clamp(linguistic * 0.3 + audio * 0.25 + sentiment * 0.3 + qa * 0.15)
    return { s, idx, signals: { linguistic, audio, sentiment, qa }, composite }
  })
  scored.sort((a, b) => b.composite - a.composite)
  return scored.slice(0, count).map((r, i) => ({
    candidateId: uid('can'),
    clipIndex: i + 1,
    startSec: r.s.startSec,
    endSec: r.s.endSec,
    durationSec: Math.round((r.s.endSec - r.s.startSec) * 10) / 10,
    compositeScore: Math.round(r.composite * 100) / 100,
    signals: {
      linguistic: round2(r.signals.linguistic),
      audio: round2(r.signals.audio),
      sentiment: round2(r.signals.sentiment),
      qa: round2(r.signals.qa),
    },
    primaryTopic: r.s.topics[0] || 'general',
    speakers: [r.s.speaker],
    summarySentence: r.s.text.length > 90 ? r.s.text.slice(0, 88) + '…' : r.s.text,
    status: 'pending',
    transcriptExcerpt: r.s.text,
  }))
}

// ── Hook writer (GPT-style) — one variant per framework ──
function buildHooks(topic: string, excerpt: string): Clip['hooks'] {
  const t = topic.replace(/-/g, ' ')
  return {
    curiosity: `The truth about ${t} that nobody talks about…`,
    contrarian: `Everyone's wrong about ${t}. Here's the proof.`,
    quote: `"${excerpt.slice(0, 60).trim()}${excerpt.length > 60 ? '…' : ''}"`,
    list: `3 things about ${t} that changed everything`,
    question: `What if everything you knew about ${t} was backwards?`,
  }
}

function buildCaptions(topic: string, summary: string): Clip['captions'] {
  const t = topic.replace(/-/g, ' ')
  return {
    primary: `${summary} 🎯 Save this for later.`,
    secondary: `Full breakdown on ${t} — drop a 🔥 if this hit.`,
  }
}

function buildHashtags(topic: string, brand?: BrandProfile): Clip['hashtags'] {
  const t = topic.replace(/-/g, '')
  return {
    core: ['#viral', '#contentcreator', '#growth'],
    niche: [`#${t}`, '#founders', '#startup'],
    brand: brand?.brandHashtags?.length ? brand.brandHashtags : ['#SHADDAI'],
  }
}

// ── Clip assembly — combines hooks/captions/hashtags + platform assets ──
export function makeClip(
  source: Source,
  candidate: ClipCandidate,
  batchId: string,
  platforms: string[],
  brand?: BrandProfile
): Clip {
  const topic = candidate.primaryTopic
  const excerpt = candidate.transcriptExcerpt || candidate.summarySentence
  const hooks = buildHooks(topic, excerpt)
  const captions = buildCaptions(topic, candidate.summarySentence)
  const hashtags = buildHashtags(topic, brand)
  const platformAssets: Clip['platformAssets'] = {}
  for (const p of platforms) {
    if (p === 'x') {
      platformAssets[p] = {
        caption: hooks.contrarian,
        thread: [
          { tweetNumber: 1, text: hooks.curiosity || '' },
          { tweetNumber: 2, text: candidate.summarySentence },
          { tweetNumber: 3, text: captions.secondary },
        ],
      }
    } else if (p === 'email') {
      platformAssets[p] = { postBody: `${hooks.question}\n\n${candidate.summarySentence}\n\n— sent via SHADDAI Clips` }
    } else {
      platformAssets[p] = {
        videoUrl: '',
        caption: captions.primary,
        hashtagString: [...hashtags.core, ...hashtags.niche, ...hashtags.brand].join(' '),
        durationSec: candidate.durationSec,
        resolution: p === 'linkedin' ? '1920x1080' : '1080x1920',
      }
    }
  }
  return {
    clipId: uid('clip'),
    sourceId: source.sourceId,
    batchId,
    userRating: null,
    title: titleCaseSummary(candidate.summarySentence),
    startSec: candidate.startSec,
    endSec: candidate.endSec,
    durationSec: candidate.durationSec,
    compositeScore: candidate.compositeScore,
    hooks,
    captions,
    hashtags,
    platformAssets,
    status: 'draft',
    brandProfileId: brand?.profileId,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
}

function titleCaseSummary(s: string): string {
  const words = s.replace(/[.…"]/g, '').split(/\s+/).slice(0, 6)
  return words.join(' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Seed data (so a fresh load isn't empty — mirrors a returning user) ──
export function seedBrandProfiles(): BrandProfile[] {
  return [
    {
      profileId: 'bp_default',
      name: 'Default Voice',
      toneVoice: 'educational',
      targetAudience: 'Founders & creators building in public',
      keyMessaging: ['Practical over theoretical', 'Show the work', 'No fluff'],
      brandHashtags: ['#SHADDAI', '#BuildInPublic'],
      avoidTopics: ['politics', 'doom'],
      styleNotes: 'Punchy, confident, second-person.',
      sampleHooks: ['The truth nobody tells you about X', 'I wasted 2 years so you don\'t have to'],
      sampleCaptions: ['Save this 🔖', 'Drop a 🔥 if this helped'],
      isDefault: true,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: nowISO(),
    },
  ]
}

export function seedSources(): { sources: Source[]; transcripts: Record<string, TranscriptSegment[]>; candidates: Record<string, ClipCandidate[]> } {
  const presets = [
    { title: 'My Podcast Episode #42 — Fundraising Strategies', file: 'episode42.mp4', dur: 3660, size: 250_000_000, ageMs: 3_600_000 },
    { title: 'Interview with John — Building in Public', file: 'interview_john.mp4', dur: 2400, size: 180_000_000, ageMs: 7_200_000 },
    { title: 'Weekly Livestream Q&A — June 2025', file: 'livestream_qa.mp4', dur: 5400, size: 500_000_000, ageMs: 86_400_000 },
  ]
  const sources: Source[] = []
  const transcripts: Record<string, TranscriptSegment[]> = {}
  const candidates: Record<string, ClipCandidate[]> = {}
  for (const p of presets) {
    const sourceId = uid('src')
    const transcriptId = uid('trn')
    const segs = makeTranscript(p.dur)
    transcripts[sourceId] = segs
    candidates[sourceId] = makeCandidates(segs)
    sources.push({
      sourceId,
      title: p.title,
      originalFilename: p.file,
      fileSizeBytes: p.size,
      durationSec: p.dur,
      mimeType: 'video/mp4',
      metadata: { codec: 'h264', resolution: '1920x1080', bitrate: 8_000_000, fps: 30, channels: 2 },
      thumbnailUrls: {},
      status: 'ingested',
      transcriptId,
      createdAt: new Date(Date.now() - p.ageMs).toISOString(),
      updatedAt: nowISO(),
    })
  }
  return { sources, transcripts, candidates }
}

// ── helpers ──
function clamp(n: number): number { return Math.max(0, Math.min(1, n)) }
function round2(n: number): number { return Math.round(n * 100) / 100 }
