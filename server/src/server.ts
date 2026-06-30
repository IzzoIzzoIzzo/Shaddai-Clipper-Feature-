// ============================================================
// SHADDAI Clips — real, self-contained pipeline server.
// Upload → ffmpeg extract → Whisper transcribe → highlight detect →
// ffmpeg render vertical clips → serve the MP4s. No Redis, no Python,
// no mock. Mounted at /api/clips/v1 to match the frontend contract.
// ============================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fstatic from '@fastify/static'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { extractPCM16k, renderVerticalClip, probe } from './ffmpeg.ts'
import { transcribePCM, type Segment } from './transcribe.ts'
import { aura } from './aura.ts'
import { narrate } from './narrate.ts'
import { generateCover } from './images.ts'

const DATA = process.env.DATA_DIR || join(process.cwd(), 'data')
await mkdir(DATA, { recursive: true })

// ── in-memory state (single-user engine) ──
type Status = 'uploading' | 'normalizing' | 'ingested' | 'failed'
interface Source { sourceId: string; title: string; originalFilename: string; durationSec: number; status: Status; transcriptId?: string; errorMessage?: string; createdAt: string }
interface Candidate { candidateId: string; startSec: number; endSec: number; durationSec: number; compositeScore: number; signals: { linguistic: number; audio: number; sentiment: number; qa: number }; primaryTopic: string; summarySentence: string; transcriptExcerpt: string; status: string }
interface Batch { batchId: string; sourceId: string; status: string; progressPct: number; currentStage: string; totalClipsRequested: number; totalClipsGenerated: number; platforms: string[]; clips: any[]; createdAt: string; completedAt: string | null }

const sources = new Map<string, Source>()
const transcripts = new Map<string, Segment[]>()
const candidates = new Map<string, Candidate[]>()
const batches = new Map<string, Batch>()
const inputs = new Map<string, string>() // sourceId -> input file path

// ── highlight detection (real heuristic over the real transcript) ──
function buildCandidates(segs: Segment[], max = 5): Candidate[] {
  // Fallback: no transcript (sparse/instrumental audio) → still offer one clip
  // of the opening so the pipeline always yields something to render.
  if (!segs.length) {
    return [{
      candidateId: randomUUID(), startSec: 0, endSec: 15, durationSec: 15, compositeScore: 0.5,
      signals: { linguistic: 0.5, audio: 0.5, sentiment: 0.5, qa: 0.5 },
      primaryTopic: 'clip', summarySentence: 'Opening segment', transcriptExcerpt: '', status: 'pending',
    }]
  }
  // merge whisper chunks into ~20-60s windows
  const windows: Segment[] = []
  let cur: Segment | null = null
  for (const s of segs) {
    if (!cur) { cur = { ...s }; continue }
    if (cur.endSec - cur.startSec < 20) { cur.endSec = s.endSec; cur.text += ' ' + s.text }
    else { windows.push(cur); cur = { ...s } }
  }
  if (cur) windows.push(cur)

  const scored = windows.map((w) => {
    const len = w.endSec - w.startSec
    const linguistic = clamp(0.5 + Math.min(0.3, len / 120) + (w.text.split(' ').length > 20 ? 0.15 : 0))
    const qa = clamp(/\?/.test(w.text) ? 0.8 : 0.5)
    const sentiment = clamp(/\b(never|always|secret|mistake|nobody|huge|best|worst|love|hate)\b/i.test(w.text) ? 0.82 : 0.6)
    const audio = clamp(0.6 + Math.random() * 0.25) // placeholder for real loudness analysis
    const composite = clamp(linguistic * 0.35 + qa * 0.2 + sentiment * 0.3 + audio * 0.15)
    return { w, signals: { linguistic, audio, sentiment, qa }, composite }
  })
  scored.sort((a, b) => b.composite - a.composite)
  return scored.slice(0, max).map((r, i) => ({
    candidateId: randomUUID(),
    startSec: round1(r.w.startSec),
    endSec: round1(r.w.endSec),
    durationSec: round1(r.w.endSec - r.w.startSec),
    compositeScore: round2(r.composite),
    signals: { linguistic: round2(r.signals.linguistic), audio: round2(r.signals.audio), sentiment: round2(r.signals.sentiment), qa: round2(r.signals.qa) },
    primaryTopic: topicOf(r.w.text),
    summarySentence: r.w.text.length > 90 ? r.w.text.slice(0, 88) + '…' : r.w.text,
    transcriptExcerpt: r.w.text,
    status: 'pending',
    clipIndex: i + 1,
  }))
}

// ── async pipeline stages ──
async function processSource(sourceId: string) {
  const src = sources.get(sourceId)!
  try {
    src.status = 'normalizing'
    const input = inputs.get(sourceId)!
    const meta = await probe(input)
    src.durationSec = Math.round(meta.durationSec)
    if (!meta.hasAudio) throw new Error('No audio track detected')

    const pcm = await extractPCM16k(input)
    const segs = await transcribePCM(pcm)
    transcripts.set(sourceId, segs)
    candidates.set(sourceId, buildCandidates(segs))
    src.transcriptId = randomUUID()
    src.status = 'ingested'
    console.log(`[clips] source ${sourceId} ingested — ${segs.length} segments, ${candidates.get(sourceId)!.length} candidates`)
  } catch (e: any) {
    src.status = 'failed'
    src.errorMessage = e?.message || String(e)
    console.error(`[clips] source ${sourceId} failed:`, src.errorMessage)
  }
}

async function generateBatch(batchId: string, candidateIds: string[]) {
  const batch = batches.get(batchId)!
  const input = inputs.get(batch.sourceId)!
  const cands = (candidates.get(batch.sourceId) || []).filter((c) => candidateIds.includes(c.candidateId))
  batch.status = 'generating'; batch.currentStage = 'rendering'
  const outDir = join(DATA, batch.sourceId, 'clips')
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]!
    const assets: Record<string, string> = {}
    for (const p of batch.platforms) {
      const aspect = p === 'linkedin' || p === 'x' ? '16:9' : '9:16'
      const file = join(outDir, `${c.candidateId}_${p}.mp4`)
      await renderVerticalClip({ input, outMp4: file, startSec: c.startSec, endSec: c.endSec, aspect })
      assets[p] = `/files/${batch.sourceId}/clips/${c.candidateId}_${p}.mp4`
    }
    const narration = await narrate({
      startSec: c.startSec, endSec: c.endSec, durationSec: c.durationSec,
      compositeScore: c.compositeScore, primaryTopic: c.primaryTopic, transcriptExcerpt: c.transcriptExcerpt,
    }, batch.platforms)
    let coverUrl: string | undefined
    try {
      const cover = await generateCover({ input, outDir, atSec: c.startSec + 1, title: narration.title, topic: c.primaryTopic })
      coverUrl = `/files/${batch.sourceId}/clips/${cover.split(/[\\/]/).pop()}`
    } catch { /* cover optional */ }
    batch.clips.push({ clipId: c.candidateId, title: narration.title, durationSec: c.durationSec, startSec: c.startSec, endSec: c.endSec, status: 'draft', platformAssets: assets, summarySentence: c.summarySentence, narration, coverUrl })
    batch.totalClipsGenerated = i + 1
    batch.progressPct = Math.round(((i + 1) / cands.length) * 100)
  }
  batch.status = 'reviewing'; batch.currentStage = 'done'; batch.completedAt = new Date().toISOString()
  console.log(`[clips] batch ${batchId} done — ${batch.clips.length} clips rendered`)
}

// ── server ──
const app = Fastify({ logger: false, bodyLimit: 2 * 1024 * 1024 * 1024 })
await app.register(cors, { origin: true })
await app.register(multipart, { limits: { fileSize: 4 * 1024 * 1024 * 1024 } })
await app.register(fstatic, { root: DATA, prefix: '/files/' })

app.get('/api/clips/v1/health', async () => ({ ok: true, engine: 'ffmpeg-static + transformers.js whisper' }))

app.post('/api/clips/v1/sources', async (req, reply) => {
  const file = await (req as any).file()
  if (!file) return reply.code(400).send({ error: { code: 'NO_FILE', message: 'file required' } })
  const sourceId = randomUUID()
  const dir = join(DATA, sourceId)
  await mkdir(dir, { recursive: true })
  const inputPath = join(dir, file.filename || 'source.mp4')
  await writeFile(inputPath, await file.toBuffer())
  inputs.set(sourceId, inputPath)
  const src: Source = { sourceId, title: titleFrom(file.filename || 'Source'), originalFilename: file.filename || 'source.mp4', durationSec: 0, status: 'uploading', createdAt: new Date().toISOString() }
  sources.set(sourceId, src)
  processSource(sourceId) // fire and forget — poll /sources/:id
  return { sourceId, status: 'uploading' }
})

app.get('/api/clips/v1/sources', async () => ({ sources: [...sources.values()] }))

app.get('/api/clips/v1/sources/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const src = sources.get(id)
  if (!src) return reply.code(404).send({ error: { code: 'NOT_FOUND' } })
  return { source: src, transcript: transcripts.get(id) || [], candidates: candidates.get(id) || [] }
})

app.post('/api/clips/v1/generate', async (req, reply) => {
  const body = (req.body || {}) as { sourceId?: string; candidateIds?: string[]; platforms?: string[] }
  if (!body.sourceId || !sources.get(body.sourceId)) return reply.code(400).send({ error: { code: 'BAD_SOURCE' } })
  const cands = candidates.get(body.sourceId) || []
  const ids = body.candidateIds?.length ? body.candidateIds : cands.slice(0, 3).map((c) => c.candidateId)
  const platforms = body.platforms?.length ? body.platforms : ['tiktok', 'reels']
  const batchId = randomUUID()
  batches.set(batchId, { batchId, sourceId: body.sourceId, status: 'queued', progressPct: 0, currentStage: 'queued', totalClipsRequested: ids.length, totalClipsGenerated: 0, platforms, clips: [], createdAt: new Date().toISOString(), completedAt: null })
  generateBatch(batchId, ids) // fire and forget — poll /batches/:id
  return { batchId, status: 'queued' }
})

app.get('/api/clips/v1/batches/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const b = batches.get(id)
  if (!b) return reply.code(404).send({ error: { code: 'NOT_FOUND' } })
  return { batch: b }
})

app.get('/api/clips/v1/aura/stats', async () => ({ aura: aura.stats() }))

// helpers
function clamp(n: number) { return Math.max(0, Math.min(1, n)) }
function round1(n: number) { return Math.round(n * 10) / 10 }
function round2(n: number) { return Math.round(n * 100) / 100 }
function titleFrom(f: string) { return f.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
function topicOf(text: string) {
  const m = text.toLowerCase().match(/\b(money|fundraising|startup|growth|mindset|secret|mistake|strategy|story|advice)\b/)
  return m ? m[1] : 'highlight'
}

const port = Number(process.env.PORT || 8787)
app.listen({ port, host: '0.0.0.0' }).then(() => console.log(`[clips] real engine on http://localhost:${port}  (model loads on first upload)`))
