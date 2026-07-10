# SHADDAI CLIPPER — COMPLETE BUILD SPECIFICATION FOR CLAUDE

> **Mission:** Transform this partially-scaffolded full-stack app into a fully functional video clipping engine. This document is your single source of truth. Read it top-to-bottom before writing a single line of code.

---

## PART 0 — WHO YOU ARE & WHAT YOU ARE BUILDING

You are an expert TypeScript/Node.js engineer completing **SHADDAI Clipper**, a video processing SaaS that converts long-form videos into platform-optimized short clips (9:16 vertical for TikTok/Reels/YouTube Shorts, 16:9 horizontal for X/LinkedIn). The product uses:

- **ffmpeg-static** + **fluent-ffmpeg** for real video transcoding (no mocking)
- **@huggingface/transformers** (Transformers.js) running **Whisper** for on-device speech-to-text transcription
- **Fastify** (Node.js 18+) for the backend API server
- **React + Vite + TypeScript** for the frontend SPA
- **Zustand** for client state, **TanStack Query** for server state
- **Render.com** for cloud deployment

**The golden rule: NO mocks, NO placeholders, NO fake data in production code.** Every API route must do real work. Every service must use real libraries.

---

## PART 1 — REPOSITORY LAYOUT (GROUND TRUTH)

```
Shaddai-Clipper-Feature-/
├── src/                          # Frontend (React + Vite)
│   ├── api/
│   │   ├── client.ts             ✅ EXISTS — API client, auth headers, error handling
│   │   └── mockApi.ts            ⚠️  EXISTS — DELETE or gate behind isDev flag when backend is live
│   ├── types/
│   │   └── api.ts                ✅ EXISTS — Canonical API contract types (read this first)
│   ├── components/               ❌ MUST CREATE
│   │   ├── shared/
│   │   │   ├── Layout.tsx        ❌ Main layout wrapper (sidebar + header + <Outlet>)
│   │   │   ├── Navigation.tsx    ❌ Left sidebar nav links
│   │   │   └── Header.tsx        ❌ Top bar (logo, dark mode toggle, user avatar)
│   │   ├── UploadDropZone.tsx    ❌ Drag-and-drop video upload with progress ring
│   │   ├── TranscriptEditor.tsx  ❌ Scrollable transcript + candidate highlight selection
│   │   ├── ClipEditor.tsx        ❌ Title / caption / hook inline editing
│   │   └── PreviewPlayer.tsx     ❌ Platform-framed video preview (phone/desktop frames)
│   ├── routes/                   ❌ MUST CREATE
│   │   ├── DashboardPage.tsx     ❌ Recent activity feed, stats cards
│   │   ├── UploadPage.tsx        ❌ Upload UI + live progress polling
│   │   ├── SourceDetailPage.tsx  ❌ Transcript viewer + candidate list
│   │   ├── CandidateReviewPage.tsx ❌ Select clips for generation
│   │   ├── BatchProgressPage.tsx ❌ Real-time render progress via polling
│   │   ├── ClipEditorPage.tsx    ❌ Edit clip metadata (title, caption, hook)
│   │   ├── ClipPreviewPage.tsx   ❌ Platform-specific clip preview
│   │   ├── ExportQueuePage.tsx   ❌ Schedule and bulk-export clips
│   │   └── BrandProfilesPage.tsx ❌ Manage tone, hashtags, avoid-topics
│   ├── stores/
│   │   └── clipsStore.ts         ❌ Zustand store (sources, batches, clips state)
│   ├── lib/
│   │   └── constants.ts          ⚠️  EXISTS — needs API_BASE_URL set to /api/clips/v1
│   ├── App.tsx                   ✅ EXISTS — routes defined, layout wired, DO NOT BREAK
│   └── main.tsx                  ✅ EXISTS — entry point, DO NOT MODIFY
│
├── server/                       # Backend (Fastify + Node.js 18+)
│   ├── src/
│   │   ├── server.ts             ❌ MUST CREATE — Fastify app boot, plugin registration, route mounting
│   │   ├── routes/
│   │   │   ├── sources.ts        ❌ MUST CREATE — POST/GET /sources, GET /sources/:id
│   │   │   ├── generate.ts       ❌ MUST CREATE — POST /generate, GET /batches/:id
│   │   │   └── files.ts          ❌ MUST CREATE — GET /files/:sourceId/clips/*
│   │   ├── services/
│   │   │   ├── transcribe.ts     ❌ MUST CREATE — Whisper pipeline (Transformers.js)
│   │   │   ├── renderer.ts       ❌ MUST CREATE — ffmpeg probe + clip rendering
│   │   │   └── candidate-detect.ts ❌ MUST CREATE — Heuristic highlight detection
│   │   ├── types/
│   │   │   └── index.ts          ❌ MUST CREATE — Internal server types (extend frontend api.ts types)
│   │   └── utils/
│   │       ├── ffmpeg.ts         ❌ MUST CREATE — fluent-ffmpeg helpers + static path binding
│   │       └── logger.ts         ✅ EXISTS — Winston/Pino logger, import and use
│   ├── testdata/
│   │   └── test.mp4              ❌ MUST CREATE for E2E (generate with ffmpeg lavfi sintel filter)
│   ├── smoke.mjs                 ❌ MUST CREATE — HTTP smoke test (ESM)
│   ├── package.json              ✅ EXISTS — all deps pinned, DO NOT ADD unlisted packages
│   └── README.md                 ✅ EXISTS — API contract reference
│
├── index.html                    ✅ EXISTS — Vite HTML shell
├── vite.config.ts                ✅ EXISTS — proxy /api/clips → :8787, /files → :8787
├── render.yaml                   ✅ EXISTS — Render blueprint
├── DEPLOY-RENDER.md              ✅ EXISTS — Deployment guide
├── START-CLIPPER.bat             ✅ EXISTS — Windows one-click launcher
├── package.json                  ✅ EXISTS — frontend deps
└── tsconfig.json                 ✅ EXISTS — TS config
```

---

## PART 2 — API CONTRACT (READ BEFORE TOUCHING ANY CODE)

All routes are prefixed `/api/clips/v1`. The Vite proxy maps `/api/clips` → `http://localhost:8787` and `/files` → `http://localhost:8787`.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clips/v1/health` | Health check |
| POST | `/api/clips/v1/sources` | Upload video (multipart/form-data, field: `file`) |
| GET | `/api/clips/v1/sources` | List all sources |
| GET | `/api/clips/v1/sources/:id` | Get source + transcript + candidates |
| POST | `/api/clips/v1/generate` | Enqueue batch clip generation |
| GET | `/api/clips/v1/batches/:id` | Poll batch status |
| GET | `/files/:sourceId/clips/:filename` | Stream rendered clip file |

### Source Status Lifecycle

```
uploading → normalizing → ingested → (transcribing) → ready
                                                         ↓
                                                    candidates detected
```

### Key Type Contracts (from `src/types/api.ts`)

```typescript
// Source — a single uploaded video
interface Source {
  sourceId: string          // uuid v4
  status: 'uploading' | 'normalizing' | 'ingested' | 'ready' | 'error'
  title: string
  durationSec: number
  estimatedProcessingTimeSec: number
  createdAt: string         // ISO 8601
  transcript?: TranscriptSegment[]
  candidates?: Candidate[]
}

// TranscriptSegment — one Whisper output chunk
interface TranscriptSegment {
  id: string
  startSec: number
  endSec: number
  text: string
  speaker: string
  topics: string[]
  emotion: 'neutral' | 'excited' | 'serious' | 'humorous'
  confidence: number        // 0–1
}

// Candidate — a detected highlight clip
interface Candidate {
  candidateId: string
  sourceId: string
  startSec: number
  endSec: number
  score: number             // 0–1 relevance score
  reason: string            // Why this was selected
  suggestedTitle: string
  suggestedCaption: string
  suggestedHook: string
}

// GenerationBatch — a render job
interface GenerationBatch {
  batchId: string
  sourceId: string
  status: 'queued' | 'rendering' | 'reviewing' | 'complete' | 'error'
  progressPct: number       // 0–100
  clips: Clip[]
  createdAt: string
}

// Clip — a rendered output clip
interface Clip {
  clipId: string
  batchId: string
  sourceId: string
  candidateId: string
  platform: 'tiktok' | 'reels' | 'youtube_shorts' | 'x' | 'linkedin'
  status: 'queued' | 'rendering' | 'ready' | 'error'
  title: string
  caption: string
  hook: string
  fileUrl: string           // /files/:sourceId/clips/:filename
  durationSec: number
  createdAt: string
}
```

---

## PART 3 — BACKEND IMPLEMENTATION (Phase 1, do this first)

### Step 1 — `server/src/server.ts` (Main entry point)

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { sourcesRoutes } from './routes/sources.js'
import { generateRoutes } from './routes/generate.js'
import { filesRoutes } from './routes/files.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = Fastify({
  logger: true,
  bodyLimit: 500 * 1024 * 1024  // 500MB upload limit
})

// Plugins
await app.register(cors, { origin: true })
await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } })
await app.register(staticPlugin, {
  root: join(__dirname, '../../dist'),
  prefix: '/',
  decorateReply: false,
})

// Health check
app.get('/api/clips/v1/health', async () => ({
  ok: true,
  engine: 'shaddai-clips-real-v1',
  timestamp: new Date().toISOString(),
}))

// Register feature routes
await app.register(sourcesRoutes)
await app.register(generateRoutes)
await app.register(filesRoutes)

// Start
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8787', 10)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🎬 SHADDAI Clipper running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
export default app
```

**CRITICAL:** `server/package.json` has `"type": "module"` — all imports MUST use `.js` extensions even for `.ts` source files. This is Node.js ESM behavior. Example: `import { foo } from './services/transcribe.js'`

---

### Step 2 — `server/src/utils/ffmpeg.ts` (Static path binding)

```typescript
import FFmpeg from 'fluent-ffmpeg'
// @ts-ignore — ffmpeg-static returns string path
import ffmpegPath from 'ffmpeg-static'
// @ts-ignore — ffprobe-static returns { path: string }
import ffprobeStatic from 'ffprobe-static'

// Bind static binaries — MUST be called before any ffmpeg operations
FFmpeg.setFfmpegPath(ffmpegPath as string)
FFmpeg.setFfprobePath(ffprobeStatic.path)

export { FFmpeg }

export function probeVideo(videoPath: string): Promise<FFmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    FFmpeg.ffprobe(videoPath, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}
```

---

### Step 3 — `server/src/services/renderer.ts` (ffmpeg video operations)

```typescript
import { FFmpeg, probeVideo } from '../utils/ffmpeg.js'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

export { probeVideo }

// Platform dimensions (width × height)
const PLATFORM_DIMS: Record<string, [number, number]> = {
  tiktok:          [1080, 1920],
  reels:           [1080, 1920],
  youtube_shorts:  [1080, 1920],
  x:               [1920, 1080],
  linkedin:        [1920, 1080],
}

export async function renderClip(
  sourceVideoPath: string,
  startSec: number,
  endSec: number,
  platform: string,
  outputPath: string,
): Promise<string> {
  const [w, h] = PLATFORM_DIMS[platform] ?? [1080, 1920]
  await mkdir(dirname(outputPath), { recursive: true })

  return new Promise((resolve, reject) => {
    // Scale + pad to target aspect ratio without stretching
    const vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`

    FFmpeg(sourceVideoPath)
      .seekInput(startSec)                  // Seek BEFORE decode (fast)
      .duration(endSec - startSec)
      .videoFilter(vf)
      .videoCodec('libx264')
      .addOption('-crf', '23')
      .addOption('-preset', 'fast')
      .audioCodec('aac')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`ffmpeg render error: ${err.message}`)))
      .run()
  })
}

export async function extractAudio(videoPath: string, audioPath: string): Promise<string> {
  await mkdir(dirname(audioPath), { recursive: true })
  return new Promise((resolve, reject) => {
    FFmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .output(audioPath)
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .run()
  })
}
```

---

### Step 4 — `server/src/services/transcribe.ts` (Whisper pipeline)

```typescript
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

// Singleton — model loads once and stays warm
let _transcriber: AutomaticSpeechRecognitionPipeline | null = null

async function getTranscriber() {
  if (!_transcriber) {
    const model = process.env.WHISPER_MODEL ?? 'Xenova/whisper-tiny.en'
    console.log(`[Whisper] Loading model: ${model}`)
    _transcriber = await pipeline('automatic-speech-recognition', model, {
      dtype: 'fp32',
    }) as AutomaticSpeechRecognitionPipeline
    console.log('[Whisper] Model loaded')
  }
  return _transcriber
}

export interface TranscriptSegment {
  id: string
  startSec: number
  endSec: number
  text: string
  speaker: string
  topics: string[]
  emotion: 'neutral' | 'excited' | 'serious' | 'humorous'
  confidence: number
}

export async function transcribeAudio(audioPath: string): Promise<{
  text: string
  segments: TranscriptSegment[]
}> {
  const asr = await getTranscriber()

  // Request word-level timestamps for segmentation
  const result = await asr(audioPath, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  }) as any

  const fullText: string = result.text ?? ''
  const rawChunks: Array<{ text: string; timestamp: [number, number] }> =
    result.chunks ?? []

  const segments: TranscriptSegment[] = rawChunks.map((chunk, i) => ({
    id: String(i + 1),
    startSec: chunk.timestamp?.[0] ?? i * 5,
    endSec: chunk.timestamp?.[1] ?? (i + 1) * 5,
    text: chunk.text.trim(),
    speaker: 'Speaker 1',  // Single-speaker default; extend with diarization later
    topics: [],
    emotion: 'neutral',
    confidence: 0.9,
  }))

  return { text: fullText, segments }
}
```

---

### Step 5 — `server/src/services/candidate-detect.ts` (Highlight detection)

```typescript
import type { TranscriptSegment } from './transcribe.js'

export interface Candidate {
  candidateId: string
  sourceId: string
  startSec: number
  endSec: number
  score: number
  reason: string
  suggestedTitle: string
  suggestedCaption: string
  suggestedHook: string
}

// High-signal keyword patterns — extend this list over time
const HOOK_PATTERNS = [
  /\b(secret|trick|hack|tip|never|always|mistake|truth|fact|reveal|exclusive)\b/i,
  /\b(you won't believe|the real reason|what they don't tell you|here's why)\b/i,
  /\b(number one|most important|key takeaway|bottom line|in summary)\b/i,
  /\?/,  // Questions make great hooks
]

function scoreSegment(seg: TranscriptSegment): number {
  let score = 0
  const wordCount = seg.text.split(/\s+/).length
  const durationSec = seg.endSec - seg.startSec

  // Ideal clip length: 30–90 seconds scores highest
  if (durationSec >= 30 && durationSec <= 90) score += 0.3
  else if (durationSec >= 15 && durationSec < 30) score += 0.15
  else if (durationSec > 90 && durationSec <= 120) score += 0.1

  // Words per second: natural speech 2–3 wps scores well
  const wps = wordCount / Math.max(durationSec, 1)
  if (wps >= 1.5 && wps <= 4) score += 0.2

  // Hook keyword patterns
  for (const pattern of HOOK_PATTERNS) {
    if (pattern.test(seg.text)) { score += 0.15; break }
  }

  // Confidence boost
  score += seg.confidence * 0.15

  return Math.min(score, 1)
}

export function detectCandidates(
  sourceId: string,
  segments: TranscriptSegment[],
): Candidate[] {
  // Group adjacent segments into windows of ~60s
  const windows: TranscriptSegment[][] = []
  let current: TranscriptSegment[] = []
  let windowDuration = 0

  for (const seg of segments) {
    const segDur = seg.endSec - seg.startSec
    if (windowDuration + segDur > 90 && current.length > 0) {
      windows.push(current)
      current = [seg]
      windowDuration = segDur
    } else {
      current.push(seg)
      windowDuration += segDur
    }
  }
  if (current.length > 0) windows.push(current)

  return windows
    .map((window, i) => {
      const startSec = window[0].startSec
      const endSec = window[window.length - 1].endSec
      const combinedText = window.map(s => s.text).join(' ')
      const score = Math.max(...window.map(scoreSegment))

      // Only surface windows with meaningful content
      if (score < 0.2) return null

      const firstSentence = combinedText.split(/[.!?]/)[0]?.trim() ?? combinedText

      return {
        candidateId: `${sourceId}-cand-${i}`,
        sourceId,
        startSec,
        endSec,
        score: Math.round(score * 100) / 100,
        reason: score > 0.5 ? 'High-engagement segment detected' : 'Notable content segment',
        suggestedTitle: `Clip ${i + 1}: ${firstSentence.slice(0, 60)}`,
        suggestedCaption: combinedText.slice(0, 150) + (combinedText.length > 150 ? '...' : ''),
        suggestedHook: firstSentence.slice(0, 100),
      } satisfies Candidate
    })
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)  // Top 10 candidates max
}
```

---

### Step 6 — `server/src/types/index.ts` (Server-internal types)

```typescript
// Extends frontend contract types with server-side persistence shape
export interface SourceRecord {
  sourceId: string
  status: 'uploading' | 'normalizing' | 'ingested' | 'ready' | 'error'
  title: string
  durationSec: number
  estimatedProcessingTimeSec: number
  createdAt: string
  originalPath: string      // Absolute path to uploaded file
  audioPath?: string        // Path to extracted WAV (16kHz mono)
  transcript?: import('./transcribe.js').TranscriptSegment[]  // Populated after transcription
  candidates?: import('./candidate-detect.js').Candidate[]    // Populated after detection
  errorMessage?: string
}

export interface BatchRecord {
  batchId: string
  sourceId: string
  status: 'queued' | 'rendering' | 'reviewing' | 'complete' | 'error'
  progressPct: number
  clips: ClipRecord[]
  createdAt: string
}

export interface ClipRecord {
  clipId: string
  batchId: string
  sourceId: string
  candidateId: string
  platform: string
  status: 'queued' | 'rendering' | 'ready' | 'error'
  title: string
  caption: string
  hook: string
  outputPath?: string       // Absolute path to rendered MP4
  fileUrl?: string          // Public URL (/files/:sourceId/clips/:filename)
  durationSec: number
  createdAt: string
}

// In-memory store (replace with SQLite/LevelDB for persistence across restarts)
export const db = {
  sources: new Map<string, SourceRecord>(),
  batches: new Map<string, BatchRecord>(),
}
```

---

### Step 7 — `server/src/routes/sources.ts`

```typescript
import type { FastifyInstance } from 'fastify'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { pipeline as streamPipeline } from 'stream/promises'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../types/index.js'
import { probeVideo, extractAudio } from '../services/renderer.js'
import { transcribeAudio } from '../services/transcribe.js'
import { detectCandidates } from '../services/candidate-detect.js'

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data')

export async function sourcesRoutes(app: FastifyInstance) {
  // POST /api/clips/v1/sources — upload video
  app.post('/api/clips/v1/sources', async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    const sourceId = uuidv4()
    const sourceDir = join(DATA_DIR, sourceId)
    await mkdir(sourceDir, { recursive: true })

    const originalPath = join(sourceDir, 'original' + getExt(data.filename))

    // Stream upload to disk
    await streamPipeline(data.file, createWriteStream(originalPath))

    const record = {
      sourceId,
      status: 'uploading' as const,
      title: data.filename,
      durationSec: 0,
      estimatedProcessingTimeSec: 300,
      createdAt: new Date().toISOString(),
      originalPath,
    }
    db.sources.set(sourceId, record)

    // Async pipeline: probe → extract audio → transcribe → detect candidates
    processSource(sourceId, originalPath, sourceDir).catch(err => {
      const s = db.sources.get(sourceId)
      if (s) { s.status = 'error'; s.errorMessage = err.message }
      app.log.error({ err, sourceId }, 'Source processing failed')
    })

    reply.code(201).send({
      sourceId,
      status: record.status,
      title: record.title,
      durationSec: 0,
      estimatedProcessingTimeSec: 300,
      createdAt: record.createdAt,
    })
  })

  // GET /api/clips/v1/sources
  app.get('/api/clips/v1/sources', async (_req, reply) => {
    const sources = Array.from(db.sources.values()).map(s => ({
      sourceId: s.sourceId,
      status: s.status,
      title: s.title,
      durationSec: s.durationSec,
      estimatedProcessingTimeSec: s.estimatedProcessingTimeSec,
      createdAt: s.createdAt,
    }))
    reply.send({ sources })
  })

  // GET /api/clips/v1/sources/:id
  app.get<{ Params: { id: string } }>('/api/clips/v1/sources/:id', async (request, reply) => {
    const s = db.sources.get(request.params.id)
    if (!s) return reply.code(404).send({ error: 'Source not found' })
    reply.send({
      source: {
        sourceId: s.sourceId, status: s.status, title: s.title,
        durationSec: s.durationSec, estimatedProcessingTimeSec: s.estimatedProcessingTimeSec,
        createdAt: s.createdAt,
      },
      transcript: s.transcript ?? [],
      candidates: s.candidates ?? [],
    })
  })
}

// Background processing pipeline
async function processSource(sourceId: string, videoPath: string, sourceDir: string) {
  const s = db.sources.get(sourceId)!

  s.status = 'normalizing'
  const probe = await probeVideo(videoPath) as any
  s.durationSec = probe.format?.duration ?? 0

  s.status = 'ingested'
  const audioPath = join(sourceDir, 'audio.wav')
  await extractAudio(videoPath, audioPath)
  s.audioPath = audioPath

  const { text, segments } = await transcribeAudio(audioPath)
  void text  // full text available if needed
  s.transcript = segments

  const candidates = detectCandidates(sourceId, segments)
  s.candidates = candidates
  s.status = 'ready'
}

function getExt(filename: string) {
  const m = filename.match(/\.[^.]+$/)
  return m ? m[0] : '.mp4'
}
```

---

### Step 8 — `server/src/routes/generate.ts`

```typescript
import type { FastifyInstance } from 'fastify'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { db, type BatchRecord, type ClipRecord } from '../types/index.js'
import { renderClip } from '../services/renderer.js'

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data')

export async function generateRoutes(app: FastifyInstance) {
  // POST /api/clips/v1/generate
  app.post<{
    Body: { sourceId: string; candidateIds: string[]; platforms: string[] }
  }>('/api/clips/v1/generate', async (request, reply) => {
    const { sourceId, candidateIds, platforms } = request.body
    const source = db.sources.get(sourceId)
    if (!source) return reply.code(404).send({ error: 'Source not found' })
    if (!source.candidates?.length) return reply.code(409).send({ error: 'Source not ready' })

    const batchId = uuidv4()
    const clips: ClipRecord[] = []

    for (const candidateId of candidateIds) {
      const candidate = source.candidates.find(c => c.candidateId === candidateId)
      if (!candidate) continue
      for (const platform of platforms) {
        clips.push({
          clipId: uuidv4(),
          batchId,
          sourceId,
          candidateId,
          platform,
          status: 'queued',
          title: candidate.suggestedTitle,
          caption: candidate.suggestedCaption,
          hook: candidate.suggestedHook,
          durationSec: candidate.endSec - candidate.startSec,
          createdAt: new Date().toISOString(),
        })
      }
    }

    const batch: BatchRecord = {
      batchId, sourceId,
      status: 'queued',
      progressPct: 0,
      clips,
      createdAt: new Date().toISOString(),
    }
    db.batches.set(batchId, batch)

    // Fire-and-forget render queue
    processBatch(batchId, source.originalPath).catch(err => {
      const b = db.batches.get(batchId)
      if (b) b.status = 'error'
      app.log.error({ err, batchId }, 'Batch processing failed')
    })

    reply.code(202).send({ batchId, status: 'queued', createdAt: batch.createdAt })
  })

  // GET /api/clips/v1/batches/:id
  app.get<{ Params: { id: string } }>('/api/clips/v1/batches/:id', async (request, reply) => {
    const b = db.batches.get(request.params.id)
    if (!b) return reply.code(404).send({ error: 'Batch not found' })
    reply.send({
      batchId: b.batchId,
      status: b.status,
      progressPct: b.progressPct,
      clips: b.clips,
    })
  })
}

async function processBatch(batchId: string, sourceVideoPath: string) {
  const batch = db.batches.get(batchId)!
  batch.status = 'rendering'

  const source = db.sources.get(batch.sourceId)!
  const totalClips = batch.clips.length

  for (let i = 0; i < batch.clips.length; i++) {
    const clip = batch.clips[i]
    clip.status = 'rendering'

    const candidate = source.candidates!.find(c => c.candidateId === clip.candidateId)!
    const filename = `${clip.clipId}-${clip.platform}.mp4`
    const outputPath = join(DATA_DIR, batch.sourceId, 'clips', filename)

    try {
      await renderClip(sourceVideoPath, candidate.startSec, candidate.endSec, clip.platform, outputPath)
      clip.outputPath = outputPath
      clip.fileUrl = `/files/${batch.sourceId}/clips/${filename}`
      clip.status = 'ready'
    } catch (err) {
      clip.status = 'error'
    }

    batch.progressPct = Math.round(((i + 1) / totalClips) * 100)
  }

  batch.status = batch.clips.every(c => c.status === 'ready') ? 'complete' : 'reviewing'
}
```

---

### Step 9 — `server/src/routes/files.ts`

```typescript
import type { FastifyInstance } from 'fastify'
import { join } from 'path'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data')

export async function filesRoutes(app: FastifyInstance) {
  // GET /files/:sourceId/clips/:filename
  app.get<{ Params: { sourceId: string; filename: string } }>(
    '/files/:sourceId/clips/:filename',
    async (request, reply) => {
      const { sourceId, filename } = request.params
      // Sanitize: prevent path traversal
      if (filename.includes('..') || filename.includes('/') || sourceId.includes('..')) {
        return reply.code(400).send({ error: 'Invalid path' })
      }

      const filePath = join(DATA_DIR, sourceId, 'clips', filename)
      try {
        const info = await stat(filePath)
        reply
          .header('Content-Type', 'video/mp4')
          .header('Content-Length', info.size)
          .header('Accept-Ranges', 'bytes')
          .send(createReadStream(filePath))
      } catch {
        reply.code(404).send({ error: 'File not found' })
      }
    }
  )
}
```

---

## PART 4 — FRONTEND IMPLEMENTATION (Phase 2)

### Step 10 — `src/lib/constants.ts` (update)

```typescript
// API base URL — Vite proxy handles /api/clips → :8787 in dev
// In production, this is the same origin (Fastify serves both)
export const API_BASE = '/api/clips/v1'
export const FILES_BASE = '/files'

export const PLATFORMS = ['tiktok', 'reels', 'youtube_shorts', 'x', 'linkedin'] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  reels: 'Instagram Reels',
  youtube_shorts: 'YouTube Shorts',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
}

// Poll intervals (ms)
export const POLL_SOURCE_MS = 3000   // Poll source status while processing
export const POLL_BATCH_MS  = 2000   // Poll batch while rendering
```

---

### Step 11 — `src/stores/clipsStore.ts` (Zustand)

```typescript
import { create } from 'zustand'
import type { Source, GenerationBatch, Clip } from '@/types/api'
import { API_BASE } from '@/lib/constants'

interface ClipsStore {
  sources: Source[]
  batches: GenerationBatch[]
  activeBatchId: string | null
  setSources: (sources: Source[]) => void
  upsertSource: (source: Source) => void
  setBatches: (batches: GenerationBatch[]) => void
  upsertBatch: (batch: GenerationBatch) => void
  setActiveBatchId: (id: string | null) => void
  ensureSeeded: () => Promise<void>
}

export const useClipsStore = create<ClipsStore>((set, get) => ({
  sources: [],
  batches: [],
  activeBatchId: null,

  setSources: (sources) => set({ sources }),
  upsertSource: (source) =>
    set(state => ({
      sources: state.sources.some(s => s.sourceId === source.sourceId)
        ? state.sources.map(s => s.sourceId === source.sourceId ? source : s)
        : [...state.sources, source],
    })),

  setBatches: (batches) => set({ batches }),
  upsertBatch: (batch) =>
    set(state => ({
      batches: state.batches.some(b => b.batchId === batch.batchId)
        ? state.batches.map(b => b.batchId === batch.batchId ? batch : b)
        : [...state.batches, batch],
    })),

  setActiveBatchId: (id) => set({ activeBatchId: id }),

  ensureSeeded: async () => {
    if (get().sources.length > 0) return
    try {
      const res = await fetch(`${API_BASE}/sources`)
      if (res.ok) {
        const { sources } = await res.json()
        set({ sources })
      }
    } catch {
      // Backend offline — store stays empty, UI shows empty state
    }
  },
}))
```

---

### Step 12 — `src/components/shared/Layout.tsx`

```tsx
import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Header } from './Header'
import { useEffect } from 'react'
import { useClipsStore } from '@/stores/clipsStore'

export function ClipsLayout() {
  const ensureSeeded = useClipsStore(s => s.ensureSeeded)
  useEffect(() => { ensureSeeded() }, [ensureSeeded])

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

---

### Step 13 — `src/routes/UploadPage.tsx`

```tsx
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { API_BASE } from '@/lib/constants'
import { useClipsStore } from '@/stores/clipsStore'
import type { Source } from '@/types/api'

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const navigate = useNavigate()
  const upsertSource = useClipsStore(s => s.upsertSource)

  const uploadMutation = useMutation({
    mutationFn: async (video: File): Promise<Source> => {
      const formData = new FormData()
      formData.append('file', video)
      const res = await fetch(`${API_BASE}/sources`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
      return res.json()
    },
    onSuccess: (source) => {
      upsertSource(source)
      navigate(`/sources/${source.sourceId}`)
    },
  })

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('video/')) setFile(f)
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Upload Video</h1>
      <p className="text-neutral-500 mb-6">Upload a long-form video to extract short clips</p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <div className="text-5xl mb-4">🎬</div>
        <p className="font-medium text-neutral-700">Drop video here or click to browse</p>
        <p className="text-sm text-neutral-400 mt-1">MP4, MOV, WebM — up to 500MB</p>
        <input
          id="file-input"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Selected file */}
      {file && (
        <div className="mt-4 p-4 bg-neutral-100 rounded-lg flex items-center justify-between">
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-neutral-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button onClick={() => setFile(null)} className="text-neutral-400 hover:text-neutral-600">✕</button>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={() => file && uploadMutation.mutate(file)}
        disabled={!file || uploadMutation.isPending}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {uploadMutation.isPending ? '⏳ Uploading...' : '🚀 Upload & Process'}
      </button>

      {uploadMutation.isError && (
        <p className="mt-3 text-red-600 text-sm">
          {(uploadMutation.error as Error).message}
        </p>
      )}
    </div>
  )
}
```

---

### Step 14 — `src/routes/SourceDetailPage.tsx`

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_SOURCE_MS } from '@/lib/constants'
import type { Source, TranscriptSegment, Candidate } from '@/types/api'

interface SourceDetailResponse {
  source: Source
  transcript: TranscriptSegment[]
  candidates: Candidate[]
}

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<SourceDetailResponse>({
    queryKey: ['source', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/sources/${id}`)
      if (!res.ok) throw new Error('Failed to load source')
      return res.json()
    },
    // Keep polling until source is ready
    refetchInterval: (query) => {
      const status = query.state.data?.source?.status
      return status === 'ready' || status === 'error' ? false : POLL_SOURCE_MS
    },
  })

  if (isLoading) return <div className="p-8 text-center">Loading source...</div>
  if (!data?.source) return <div className="p-8 text-center text-red-500">Source not found</div>

  const { source, transcript, candidates } = data

  const statusColors: Record<string, string> = {
    uploading: 'bg-yellow-100 text-yellow-700',
    normalizing: 'bg-yellow-100 text-yellow-700',
    ingested: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{source.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[source.status] ?? ''}`}>
              {source.status.toUpperCase()}
            </span>
            <span className="text-sm text-neutral-500">{Math.round(source.durationSec)}s</span>
          </div>
        </div>
        {source.status === 'ready' && candidates.length > 0 && (
          <button
            onClick={() => navigate(`/sources/${id}/review`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Review {candidates.length} Clips →
          </button>
        )}
      </div>

      {/* Processing indicator */}
      {source.status !== 'ready' && source.status !== 'error' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
          ⏳ Processing video... ({source.status})
        </div>
      )}

      {/* Candidates */}
      {candidates.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Detected Clips ({candidates.length})</h2>
          <div className="space-y-3">
            {candidates.map(c => (
              <div key={c.candidateId} className="bg-white border border-neutral-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-sm">{c.suggestedTitle}</p>
                  <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                    Score: {(c.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {c.startSec.toFixed(1)}s – {c.endSec.toFixed(1)}s · {c.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Transcript</h2>
          <div className="bg-white border border-neutral-200 rounded-lg divide-y max-h-96 overflow-y-auto">
            {transcript.map(seg => (
              <div key={seg.id} className="p-3 flex gap-4">
                <span className="text-xs text-neutral-400 tabular-nums mt-0.5 shrink-0">
                  {seg.startSec.toFixed(1)}s
                </span>
                <p className="text-sm text-neutral-700">{seg.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

---

### Step 15 — `src/routes/BatchProgressPage.tsx`

```tsx
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_BATCH_MS, FILES_BASE, PLATFORM_LABELS } from '@/lib/constants'
import type { GenerationBatch } from '@/types/api'

export function BatchProgressPage() {
  const { batchId } = useParams<{ batchId: string }>()

  const { data: batch } = useQuery<GenerationBatch>({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/batches/${batchId}`)
      if (!res.ok) throw new Error('Batch not found')
      return res.json()
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'complete' || status === 'error' ? false : POLL_BATCH_MS
    },
  })

  if (!batch) return <div className="p-8 text-center">Loading batch...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rendering Clips</h1>
        <div className="mt-3 bg-neutral-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${batch.progressPct}%` }}
          />
        </div>
        <p className="text-sm text-neutral-500 mt-1">{batch.progressPct}% complete — {batch.status}</p>
      </div>

      <div className="space-y-3">
        {batch.clips.map(clip => (
          <div key={clip.clipId} className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{clip.title}</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {PLATFORM_LABELS[clip.platform as keyof typeof PLATFORM_LABELS] ?? clip.platform}
                {' · '}{clip.durationSec.toFixed(1)}s
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                clip.status === 'ready' ? 'bg-green-100 text-green-700' :
                clip.status === 'error' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{clip.status}</span>
              {clip.status === 'ready' && clip.fileUrl && (
                <a
                  href={clip.fileUrl}
                  download
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Step 16 — `src/routes/DashboardPage.tsx`

```tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '@/lib/constants'
import { useClipsStore } from '@/stores/clipsStore'
import type { Source } from '@/types/api'

export function DashboardPage() {
  const { sources, setSources } = useClipsStore()

  const { data, isLoading } = useQuery<{ sources: Source[] }>({
    queryKey: ['sources'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/sources`)
      if (!res.ok) throw new Error('Failed to load sources')
      return res.json()
    },
  })

  useEffect(() => {
    if (data?.sources) setSources(data.sources)
  }, [data, setSources])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/upload" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Upload Video
        </Link>
      </div>

      {isLoading && <p className="text-neutral-400">Loading...</p>}

      {!isLoading && sources.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-neutral-200 rounded-xl">
          <div className="text-5xl mb-3">🎬</div>
          <p className="text-lg font-medium text-neutral-600">No videos yet</p>
          <p className="text-sm text-neutral-400 mb-6">Upload your first long-form video to get started</p>
          <Link to="/upload" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Upload Video
          </Link>
        </div>
      )}

      {sources.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map(source => (
            <Link
              key={source.sourceId}
              to={`/sources/${source.sourceId}`}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="font-medium mb-1 truncate">{source.title}</div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-neutral-400">{Math.round(source.durationSec)}s</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  source.status === 'ready' ? 'bg-green-100 text-green-700' :
                  source.status === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{source.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## PART 5 — TESTING

### E2E Backend Test (`server/smoke.mjs`)

```javascript
#!/usr/bin/env node
// Smoke test — boots server, drives full upload → generate → download flow
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

const BASE = 'http://localhost:8787'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  // 1. Health check
  const health = await fetch(`${BASE}/api/clips/v1/health`).then(r => r.json())
  console.assert(health.ok === true, 'Health check failed')
  console.log('✅ Health OK')

  // 2. Upload a small synthetic video blob (1s black video)
  const formData = new FormData()
  // Use a real test.mp4 from testdata/
  const videoBlob = new Blob([new Uint8Array(1024)], { type: 'video/mp4' })
  formData.append('file', videoBlob, 'test.mp4')

  const uploadRes = await fetch(`${BASE}/api/clips/v1/sources`, {
    method: 'POST',
    body: formData,
  })
  console.assert(uploadRes.status === 201, `Upload failed: ${uploadRes.status}`)
  const { sourceId } = await uploadRes.json()
  console.log(`✅ Upload OK — sourceId: ${sourceId}`)

  // 3. Poll until ready (max 60s)
  let source
  for (let i = 0; i < 20; i++) {
    await sleep(3000)
    const res = await fetch(`${BASE}/api/clips/v1/sources/${sourceId}`)
    const data = await res.json()
    source = data.source
    console.log(`   Polling source: ${source.status}`)
    if (source.status === 'ready' || source.status === 'error') break
  }
  console.assert(source?.status === 'ready', `Source processing failed: ${source?.status}`)
  console.log('✅ Source ready')

  // 4. List sources
  const listRes = await fetch(`${BASE}/api/clips/v1/sources`).then(r => r.json())
  console.assert(listRes.sources.length > 0, 'Source list empty')
  console.log('✅ Source list OK')

  console.log('\n🎉 Smoke test passed!')
}

main().catch(err => { console.error('❌ Smoke test FAILED:', err); process.exit(1) })
```

### Run Tests

```bash
# Start server first
cd server && npm run dev &

# Run smoke test
node server/smoke.mjs

# Build frontend
npm run build

# Serve built frontend
npx serve dist -p 4173
```

---

## PART 6 — DEPLOYMENT (RENDER)

### Prerequisites

1. Push repo to GitHub (must be public or Render must have access)
2. `render.yaml` already exists at repo root — Render auto-reads it
3. No secrets are required for basic operation

### render.yaml Reference

The existing `render.yaml` configures:
- **Build command:** `npm install && cd server && npm install && cd .. && npm run build`
- **Start command:** `cd server && npm start` (runs compiled `dist/server.js`)
- **Static files:** `dist/` served from Fastify's `@fastify/static`

### Deploy Steps

```bash
# 1. Push latest code
git add -A && git commit -m "feat: complete backend + frontend implementation"
git push origin main

# 2. Go to render.com/dashboard
# 3. New → Blueprint → connect your GitHub repo
# 4. Render reads render.yaml and deploys automatically
# 5. Live URL: https://shaddai-clipper.onrender.com
```

### Environment Variables (Render Dashboard → Service → Environment)

| Variable | Value | Purpose |
|----------|-------|---------|
| `PORT` | `8787` | Server port (Render may override with its own) |
| `DATA_DIR` | `/var/data` | Persistent disk mount path |
| `WHISPER_MODEL` | `Xenova/whisper-tiny.en` | Lighter model for Render free tier |
| `HF_TOKEN` | `hf_xxx` | HuggingFace token (only needed for gated models) |
| `OPENAI_API_KEY` | `sk-xxx` | For AI-generated hooks/captions (optional) |

### ⚠️ Render Limits

| Constraint | Detail |
|-----------|--------|
| **Ephemeral storage** | Files vanish on restart. Add a Render Disk ($7/mo) mounted at `/var/data` |
| **Free tier RAM** | 512MB — will OOM on real Whisper. Use Starter ($7/mo) or Standard ($25/mo) |
| **Upload timeout** | 30s limit on HTTP. Keep uploads < 100MB in beta or implement chunked upload |
| **Cold starts** | Free tier sleeps after 15min. First request takes ~30s to wake |

---

## PART 7 — SHADDAI DASHBOARD INTEGRATION

Once deployed to `https://shaddai-clipper.onrender.com`:

| Aspect | Detail |
|--------|--------|
| **Embedding** | Dashboard "Media → VIDEO CLIPPER" tab embeds via `<iframe>` |
| **Auth** | Token read from `localStorage.shaddai_token` (set by parent dashboard). Pass as `Authorization: Bearer <token>` header |
| **Tier gating** | Pro tier (`tier >= pro`) gets full access; lower tiers see upgrade prompt |
| **CSP** | Dashboard already allowlists `https://shaddai-clipper.onrender.com` |
| **Main dashboard repo** | https://github.com/IzzoIzzoIzzo/Shaddai |

### Auth token forwarding in `src/api/client.ts`

The existing `client.ts` already reads from localStorage. Ensure it sends:
```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('shaddai_token') ?? ''}`,
  'Content-Type': 'application/json',
}
```

---

## PART 8 — COMMON PITFALLS & FIXES

| Pitfall | Fix |
|---------|-----|
| `ERR_REQUIRE_ESM` on server startup | All server imports need `.js` extension (ESM). Example: `'./routes/sources.js'` not `'./routes/sources'` |
| Whisper model download hangs | First run downloads ~40MB (tiny model). Set `TRANSFORMERS_CACHE` env var to a writable dir |
| ffmpeg not found | `ffmpeg-static` path is auto-resolved. If it fails, log `ffmpegPath` value and set `FFmpeg.setFfmpegPath()` manually |
| `@fastify/multipart` body undefined | Call `await request.file()` (not `request.body`) for multipart routes |
| Vite proxy 404 in dev | Check `vite.config.ts` — proxy must be `/api/clips` → `http://localhost:8787` (not `http://127.0.0.1`) |
| CORS errors | `@fastify/cors` with `origin: true` handles all origins in dev. Tighten in prod |
| `Cannot find module './types/index.js'` | You must compile TS first (`tsc`) or run via `tsx` / `ts-node` |
| Data lost on Render restart | Add Render Disk, set `DATA_DIR=/var/data`, mount at `/var/data` |

---

## PART 9 — EXECUTION ORDER FOR CLAUDE

Follow this exact order. Do not skip steps.

```
[ ] 1.  Read src/types/api.ts — understand the full contract before writing anything
[ ] 2.  Read server/README.md — understand backend architecture
[ ] 3.  Create server/src/utils/ffmpeg.ts
[ ] 4.  Create server/src/services/renderer.ts
[ ] 5.  Create server/src/services/transcribe.ts
[ ] 6.  Create server/src/services/candidate-detect.ts
[ ] 7.  Create server/src/types/index.ts
[ ] 8.  Create server/src/routes/files.ts
[ ] 9.  Create server/src/routes/sources.ts
[ ] 10. Create server/src/routes/generate.ts
[ ] 11. Create server/src/server.ts (mounts all routes)
[ ] 12. Test: cd server && npm run dev → confirm /health returns { ok: true }
[ ] 13. Update src/lib/constants.ts with API_BASE and POLL constants
[ ] 14. Create src/stores/clipsStore.ts
[ ] 15. Create src/components/shared/Layout.tsx + Navigation.tsx + Header.tsx
[ ] 16. Create src/routes/DashboardPage.tsx
[ ] 17. Create src/routes/UploadPage.tsx
[ ] 18. Create src/routes/SourceDetailPage.tsx
[ ] 19. Create src/routes/CandidateReviewPage.tsx
[ ] 20. Create src/routes/BatchProgressPage.tsx
[ ] 21. Create src/routes/ClipEditorPage.tsx
[ ] 22. Create src/routes/ClipPreviewPage.tsx
[ ] 23. Create src/routes/ExportQueuePage.tsx
[ ] 24. Create src/routes/BrandProfilesPage.tsx
[ ] 25. Create src/components/UploadDropZone.tsx
[ ] 26. Create src/components/TranscriptEditor.tsx
[ ] 27. Create src/components/ClipEditor.tsx
[ ] 28. Create src/components/PreviewPlayer.tsx
[ ] 29. Delete or gate src/api/mockApi.ts behind isDev flag
[ ] 30. Run: npm run build → confirm no TypeScript errors
[ ] 31. Run: node server/smoke.mjs → confirm full HTTP flow passes
[ ] 32. Push to GitHub → deploy to Render → verify live URL
```

---

## PART 10 — QUICK REFERENCE COMMANDS

```bash
# Local development
npm install && cd server && npm install && cd ..
npm run dev              # Frontend on :5173
cd server && npm run dev # Backend on :8787

# Windows one-click
START-CLIPPER.bat

# Build
npm run build            # Frontend → dist/

# Test backend
cd server && node smoke.mjs

# Deploy
git push origin main     # Render auto-deploys from main

# Logs (Render)
# Dashboard → Service → Logs tab
```

---

*SHADDAI Clipper — Build Specification v2.0*
*Generated for Claude Code / Perplexity AI*
*Repo: https://github.com/IzzoIzzoIzzo/Shaddai-Clipper-Feature-*
