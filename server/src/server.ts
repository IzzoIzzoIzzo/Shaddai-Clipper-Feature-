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
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync, createWriteStream } from 'node:fs'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { extractPCM16k, renderVerticalClip, probe } from './ffmpeg.ts'
import { transcribePCM, type Segment } from './transcribe.ts'
import { aura } from './aura.ts'
import { narrate } from './narrate.ts'
import { generateCover } from './images.ts'
import { dedupeText } from './clean.ts'

const DATA = process.env.DATA_DIR || join(process.cwd(), 'data')
await mkdir(DATA, { recursive: true })

// ── in-memory state (single-user engine) ──
type Status = 'uploading' | 'normalizing' | 'ingested' | 'failed'
interface Source { sourceId: string; title: string; originalFilename: string; durationSec: number; status: Status; stage?: string; progressPct?: number; transcriptId?: string; errorMessage?: string; createdAt: string }
interface Candidate { candidateId: string; startSec: number; endSec: number; durationSec: number; compositeScore: number; signals: { linguistic: number; audio: number; sentiment: number; qa: number }; primaryTopic: string; summarySentence: string; transcriptExcerpt: string; status: string }
interface Batch { batchId: string; sourceId: string; status: string; progressPct: number; currentStage: string; totalClipsRequested: number; totalClipsGenerated: number; platforms: string[]; burnCaptions: boolean; clips: any[]; createdAt: string; completedAt: string | null }

const sources = new Map<string, Source>()
const transcripts = new Map<string, Segment[]>()
const candidates = new Map<string, Candidate[]>()
const batches = new Map<string, Batch>()
const inputs = new Map<string, string>() // sourceId -> input file path

// ── highlight detection (real heuristic over the real transcript + real audio) ──
// `pcm` is the same 16kHz mono Float32 buffer used for transcription; we reuse it
// to measure REAL per-window loudness (RMS) instead of guessing — louder, more
// emphatic moments score higher. No extra ffmpeg pass. Falls back gracefully
// when pcm is unavailable (energy defaults to neutral, never random).
function buildCandidates(segs: Segment[], pcm: Float32Array | null = null, max = 5): Candidate[] {
  // Fallback: no transcript (sparse/instrumental audio) → still offer one clip
  // of the opening so the pipeline always yields something to render.
  if (!segs.length) {
    return [{
      candidateId: randomUUID(), startSec: 0, endSec: 15, durationSec: 15, compositeScore: 0.5,
      signals: { linguistic: 0.5, audio: 0.5, sentiment: 0.5, qa: 0.5 },
      primaryTopic: 'clip', summarySentence: 'Opening segment', transcriptExcerpt: '', status: 'pending',
    }]
  }
  // merge whisper chunks into ~20-60s windows (chunk edges are pause-aligned by
  // Whisper, so windows already start/end near natural sentence boundaries)
  const windows: Segment[] = []
  let cur: Segment | null = null
  for (const s of segs) {
    if (!cur) { cur = { ...s }; continue }
    if (cur.endSec - cur.startSec < 20) { cur.endSec = s.endSec; cur.text += ' ' + s.text }
    else { windows.push(cur); cur = { ...s } }
  }
  if (cur) windows.push(cur)

  // real loudness per window, normalized against the loudest window (0..1)
  const rms = windows.map((w) => windowRms(pcm, w.startSec, w.endSec))
  const maxRms = Math.max(0, ...rms.filter((r): r is number => r !== null))

  const scored = windows.map((w, idx) => {
    const len = w.endSec - w.startSec
    const linguistic = clamp(0.5 + Math.min(0.3, len / 120) + (w.text.split(' ').length > 20 ? 0.15 : 0))
    const qa = clamp(/\?/.test(w.text) ? 0.8 : 0.5)
    const sentiment = clamp(/\b(never|always|secret|mistake|nobody|huge|best|worst|love|hate)\b/i.test(w.text) ? 0.82 : 0.6)
    // real audio energy → relative loudness; neutral 0.6 when we can't measure it
    const r = rms[idx]
    const audio = (r !== null && maxRms > 0) ? clamp(0.3 + 0.7 * (r / maxRms)) : 0.6
    const composite = clamp(linguistic * 0.3 + qa * 0.2 + sentiment * 0.28 + audio * 0.22)
    return { w, signals: { linguistic, audio, sentiment, qa }, composite }
  })

  // Diversity: don't return five near-identical adjacent windows. Pick the
  // highest-scoring windows while enforcing a minimum gap between clip centers
  // so results span DIFFERENT parts of the video.
  const totalDur = windows.length ? windows[windows.length - 1]!.endSec - windows[0]!.startSec : 0
  const chosen = selectDiverse(scored, max, totalDur)

  return chosen
    .sort((a, b) => a.w.startSec - b.w.startSec) // chronological — reads as a timeline
    .map((r, i) => {
      const cleaned = dedupeText(r.w.text)
      return {
        candidateId: randomUUID(),
        startSec: round1(r.w.startSec),
        endSec: round1(r.w.endSec),
        durationSec: round1(r.w.endSec - r.w.startSec),
        compositeScore: round2(r.composite),
        signals: { linguistic: round2(r.signals.linguistic), audio: round2(r.signals.audio), sentiment: round2(r.signals.sentiment), qa: round2(r.signals.qa) },
        primaryTopic: topicOf(cleaned),
        summarySentence: cleaned.length > 90 ? cleaned.slice(0, 88) + '…' : cleaned,
        transcriptExcerpt: cleaned,
        status: 'pending',
        clipIndex: i + 1,
      }
    })
}

// Mean RMS amplitude of the pcm slice covering [startSec, endSec] at 16kHz.
function windowRms(pcm: Float32Array | null, startSec: number, endSec: number): number | null {
  if (!pcm || !pcm.length) return null
  const sr = 16000
  const a = Math.max(0, Math.floor(startSec * sr))
  const b = Math.min(pcm.length, Math.floor(endSec * sr))
  if (b <= a) return null
  let sum = 0
  for (let i = a; i < b; i++) { const v = pcm[i]!; sum += v * v }
  return Math.sqrt(sum / (b - a))
}

// Greedy best-first pick with a minimum spacing between clip centers, so the
// returned highlights are spread across the video rather than clustered.
function selectDiverse<T extends { w: Segment; composite: number }>(scored: T[], max: number, totalDur: number): T[] {
  const sorted = [...scored].sort((a, b) => b.composite - a.composite)
  const minGap = Math.max(15, totalDur / (max * 2)) // spacing scales with video length
  const center = (t: T) => (t.w.startSec + t.w.endSec) / 2
  const picked: T[] = []
  for (const c of sorted) {
    if (picked.every((p) => Math.abs(center(p) - center(c)) >= minGap)) {
      picked.push(c)
      if (picked.length >= max) break
    }
  }
  // If spacing was too strict to fill `max`, top up with the next best remaining.
  if (picked.length < max) {
    for (const c of sorted) {
      if (!picked.includes(c)) { picked.push(c); if (picked.length >= max) break }
    }
  }
  return picked
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
    src.stage = 'transcribing'; src.progressPct = 0
    const segs = await transcribePCM(pcm, (frac) => { src.progressPct = Math.round(frac * 100) })
    transcripts.set(sourceId, segs)
    src.stage = 'detecting'
    candidates.set(sourceId, buildCandidates(segs, pcm))
    src.transcriptId = randomUUID()
    src.stage = 'done'; src.progressPct = 100
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
  await mkdir(outDir, { recursive: true })
  const allSegs = transcripts.get(batch.sourceId) || []
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]!
    // If captions are requested, write a clip-relative .srt (timings shifted so
    // the window starts at 0) and hand it to ffmpeg's subtitles filter to burn in.
    let subtitlePath: string | undefined
    if (batch.burnCaptions) {
      const inWindow = allSegs.filter((s) => s.endSec > c.startSec && s.startSec < c.endSec)
      if (inWindow.length) {
        subtitlePath = join(outDir, `${c.candidateId}.srt`)
        await writeFile(subtitlePath, toSrt(inWindow, c.startSec), 'utf8')
      }
    }
    const assets: Record<string, string> = {}
    for (const p of batch.platforms) {
      const aspect = p === 'linkedin' || p === 'x' ? '16:9' : '9:16'
      const file = join(outDir, `${c.candidateId}_${p}.mp4`)
      await renderVerticalClip({ input, outMp4: file, startSec: c.startSec, endSec: c.endSec, aspect, subtitlePath })
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
// Upload cap (env-tunable). Bounds memory/disk so a huge upload can't OOM the host.
const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 1024) * 1024 * 1024
const app = Fastify({ logger: false, bodyLimit: 1 * 1024 * 1024 }) // JSON bodies are tiny; video uses multipart
await app.register(cors, { origin: true })
await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })
await app.register(fstatic, { root: DATA, prefix: '/files/' })

// Serve the built frontend (dist/) so ONE process serves the whole app.
// Only mounts if a production build exists — dev still uses the Vite server.
const DIST = join(process.cwd(), '..', 'dist')
const hasDist = existsSync(join(DIST, 'index.html'))
if (hasDist) {
  await app.register(fstatic, { root: DIST, prefix: '/', decorateReply: false })
  // SPA fallback: send index.html for any non-API, non-file route (client routing).
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/files/')) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND' } })
    }
    return reply.sendFile('index.html', DIST)
  })
}

app.get('/api/clips/v1/health', async () => ({ ok: true, engine: 'ffmpeg-static + transformers.js whisper' }))

app.post('/api/clips/v1/sources', async (req, reply) => {
  const file = await (req as any).file()
  if (!file) return reply.code(400).send({ error: { code: 'NO_FILE', message: 'file required' } })
  const sourceId = randomUUID()
  const dir = join(DATA, sourceId)
  await mkdir(dir, { recursive: true })
  // Sanitize client filename: basename strips any path, then restrict chars — prevents path traversal.
  const safeName = (basename(file.filename || 'source.mp4').replace(/[^\w.\-]+/g, '_').slice(0, 120)) || 'source.mp4'
  const inputPath = join(dir, safeName)
  // Stream to disk bounded by the multipart fileSize limit — never buffer the whole upload in memory.
  await pipeline(file.file, createWriteStream(inputPath))
  if ((file.file as any).truncated) {
    await rm(dir, { recursive: true, force: true })
    return reply.code(413).send({ error: { code: 'FILE_TOO_LARGE', message: `file exceeds ${Math.round(MAX_UPLOAD_BYTES / 1048576)}MB limit` } })
  }
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

// Download the full transcript as SubRip subtitles (.srt) — ready to upload
// alongside a clip or import into any editor.
app.get('/api/clips/v1/sources/:id/transcript.srt', async (req, reply) => {
  const { id } = req.params as { id: string }
  const segs = transcripts.get(id)
  if (!segs) return reply.code(404).send({ error: { code: 'NOT_FOUND' } })
  reply.header('Content-Type', 'application/x-subrip; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${(sources.get(id)?.title || 'transcript').replace(/[^\w.\-]+/g, '_')}.srt"`)
  return toSrt(segs)
})

// Download the transcript as plain text (.txt).
app.get('/api/clips/v1/sources/:id/transcript.txt', async (req, reply) => {
  const { id } = req.params as { id: string }
  const segs = transcripts.get(id)
  if (!segs) return reply.code(404).send({ error: { code: 'NOT_FOUND' } })
  reply.header('Content-Type', 'text/plain; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${(sources.get(id)?.title || 'transcript').replace(/[^\w.\-]+/g, '_')}.txt"`)
  return segs.map((s) => dedupeText(s.text)).join('\n')
})

// Edit the transcript — replace segment text (e.g. after the user fixes a
// mis-heard word in the UI). Accepts a full segments array; keeps timings.
app.patch('/api/clips/v1/sources/:id/transcript', async (req, reply) => {
  const { id } = req.params as { id: string }
  const existing = transcripts.get(id)
  if (!existing) return reply.code(404).send({ error: { code: 'NOT_FOUND' } })
  const body = (req.body || {}) as { segments?: Array<{ startSec: number; endSec: number; text: string }> }
  if (!Array.isArray(body.segments)) return reply.code(400).send({ error: { code: 'BAD_SEGMENTS' } })
  const updated: Segment[] = body.segments.map((s) => ({
    startSec: Number(s.startSec) || 0,
    endSec: Number(s.endSec) || 0,
    text: String(s.text || '').slice(0, 2000),
  }))
  transcripts.set(id, updated)
  return { ok: true, segments: updated.length }
})

// Delete a source + its files (so the UI delete actually sticks across reloads).
app.delete('/api/clips/v1/sources/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  if (!sources.has(id)) return reply.code(404).send({ error: { code: 'NOT_FOUND' } })
  sources.delete(id); transcripts.delete(id); candidates.delete(id); inputs.delete(id)
  try { await rm(join(DATA, id), { recursive: true, force: true }) } catch { /* best effort */ }
  return { ok: true }
})

app.post('/api/clips/v1/generate', async (req, reply) => {
  const body = (req.body || {}) as { sourceId?: string; candidateIds?: string[]; platforms?: string[] }
  if (!body.sourceId || !sources.get(body.sourceId)) return reply.code(400).send({ error: { code: 'BAD_SOURCE' } })
  const cands = candidates.get(body.sourceId) || []
  const ids = body.candidateIds?.length ? body.candidateIds : cands.slice(0, 3).map((c) => c.candidateId)
  const platforms = body.platforms?.length ? body.platforms : ['tiktok', 'reels']
  const burnCaptions = (body as any).burnCaptions === true
  const batchId = randomUUID()
  batches.set(batchId, { batchId, sourceId: body.sourceId, status: 'queued', progressPct: 0, currentStage: 'queued', totalClipsRequested: ids.length, totalClipsGenerated: 0, platforms, burnCaptions, clips: [], createdAt: new Date().toISOString(), completedAt: null })
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

// Format seconds as an SRT timestamp: HH:MM:SS,mmm
function fmtTs(sec: number) {
  const t = Math.max(0, sec)
  const ms = Math.floor((t % 1) * 1000)
  const s = Math.floor(t) % 60
  const m = Math.floor(t / 60) % 60
  const h = Math.floor(t / 3600)
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`
}

// Build an SRT document from segments. `offsetSec` shifts timings so a clip's
// captions start at 0 (used when burning captions into a cut window).
function toSrt(segs: Segment[], offsetSec = 0): string {
  return segs
    .map((s, i) => `${i + 1}\n${fmtTs(s.startSec - offsetSec)} --> ${fmtTs(s.endSec - offsetSec)}\n${dedupeText(s.text)}\n`)
    .join('\n')
}

const port = Number(process.env.PORT || 8787)
app.listen({ port, host: '0.0.0.0' }).then(() => console.log(`[clips] real engine on http://localhost:${port}  (model loads on first upload)`))
