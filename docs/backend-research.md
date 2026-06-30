# SHADDAI Clips — Backend Processing Pipeline Research & Recommendations

> **Author:** Backend Engineer
> **Status:** Complete
> **Date:** 2025-06-09

---

## Table of Contents

1. [Video Processing](#1-video-processing)
2. [Transcription Options](#2-transcription-options)
3. [Highlight / Viral Moment Detection](#3-highlight--viral-moment-detection)
4. [AI Generation (Hooks, Captions, Titles)](#4-ai-generation-hooks-captions-titles)
5. [Processing Architecture](#5-processing-architecture)
6. [Existing SHADDAI Integration Points](#6-existing-shaddai-integration-points)
7. [Final Recommendation](#7-final-recommendation)

---

## 1. Video Processing

### 1.1 Core Technology: FFmpeg (via fluent-ffmpeg)

**Recommendation:** FFmpeg + `fluent-ffmpeg` (npm) + `@ffmpeg-installer/ffmpeg` (static binary bundling)

**Why FFmpeg** — No cloud video API can beat FFmpeg on cost. Cloud APIs (Mux, api.video, Shotstack) charge $0.05-0.20/min for processing + $0.01-0.12/GB egress. FFmpeg is free, runs on our infrastructure, and gives us full control.

| Approach | Cost/Clip | Egress | Control | Scaling |
|----------|-----------|--------|---------|---------|
| **FFmpeg (chosen)** | ~$0.001 | $0 | Full | Add workers |
| Mux / api.video | $0.05-0.20 | $0.01/GB | Limited | Auto-scaled |
| Pillow/PyAV (Python) | Similar | $0 | Moderate | Slower, less mature |

### 1.2 Supported Formats

| Format | Codec | MIME | Clip Extraction | Notes |
|--------|-------|------|----------------|-------|
| MP4 | H.264 + AAC | `video/mp4` | ✅ Excellent | Primary format; -c copy works |
| MOV | ProRes / H.264 | `video/quicktime` | ✅ Good | May need re-encoding |
| WebM | VP8/VP9 | `video/webm` | ⚠️ Partial | Opus audio; re-encode for MP4 output |
| MP3 | — | `audio/mpeg` | ✅ N/A | Audio-only; no clip extraction needed |
| WAV | PCM | `audio/wav` | ✅ N/A | Audio-only; uncompressed |
| M4A | AAC | `audio/x-m4a` | ✅ N/A | Audio-only; good quality |

### 1.3 Processing Operations

#### Clip Extraction (Fast Path — Stream Copy)
```bash
# For H.264/AAC in MP4 — no re-encode needed
ffmpeg -i input.mp4 -ss 1250.3 -t 60.5 -c copy clip_temp.mp4
# ~0.5s for a 1-hour video seeking to 20min mark
```

#### Aspect Ratio Conversion
```bash
# 9:16 (TikTok, Reels, Shorts) — smart crop, center detection
ffmpeg -i clip_temp.mp4 -vf "crop=ih*9/16:ih" tiktok.mp4

# 16:9 (X, LinkedIn) — letterbox if source is vertical
ffmpeg -i clip_temp.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" x.mp4
```

#### Audio Normalization
```bash
# LUFS normalization — consistent volume across clips
ffmpeg -i clip_temp.mp4 -af "loudnorm=I=-14:LRA=1:TP=-1" normalized.mp4
```

#### Caption Burn-In
```bash
# drawtext filter — white text, black outline, bottom third
ffmpeg -i clip_temp.mp4 -vf "drawtext=text='Hook text here':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-th-200" output.mp4
```

### 1.4 Node.js Integration (fluent-ffmpeg)

```typescript
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
ffmpeg.setFfmpegPath(installer.path);

async function extractClip(
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSec)
      .setDuration(durationSec)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset medium', '-crf 23', '-movflags +faststart'])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}
```

### 1.5 Performance Targets (CPU-only)

| Operation | 30s clip from 60min video | Notes |
|-----------|--------------------------|-------|
| Stream copy extraction | < 1s | -c copy; no re-encode |
| Aspect ratio crop | 3-5s | Single filter |
| Caption burn-in | 5-10s | drawtext filter |
| Full re-encode | 10-20s | libx264 + AAC |
| **Total per clip per platform** | **~15-30s** | |

**Concurrency limit:** 2 simultaneous renders per instance (CPU-bound).

---

## 2. Transcription Options

### 2.1 Comparison

| Feature | **Deepgram Nova-2** (Recommended) | OpenAI Whisper API | Whisper.cpp (Local) |
|---------|------------------------|-------------------|---------------------|
| **Cost** | $0.0043/min | $0.006/min | ~$0.001/min (compute) |
| **Speed** | 2-5× realtime | 5-10× realtime | 10-30× realtime |
| **Diarization** | ✅ Built-in, excellent | ⚠️ Requires post-processing | ⚠️ Separate speaker model |
| **Word timestamps** | ✅ Native | ✅ Available | ✅ Available |
| **Punctuation** | ✅ Auto | ✅ Via prompt | ❌ Manual |
| **Accuracy (WER)** | ~6% | ~8% | ~10-15% |
| **Self-hostable** | ❌ | ❌ | ✅ Yes |
| **30-min video cost** | $0.13 | $0.18 | ~$0.03 (compute) |

### 2.2 Recommendation: Deepgram Nova-2 (Primary) + Whisper API (Fallback)

**Deepgram is the clear winner** due to:
- Lowest latency (2-5× realtime — a 60min podcast transcribes in 12-30min)
- Built-in diarization (speaker labels without extra processing)
- Smart formatting (numbers, dates, currency auto-formatted)
- Word-level timestamps for precise clip boundaries

**Fallback strategy:**
1. Deepgram Nova-2 → success 🟢
2. If Deepgram fails/timeout → retry with OpenAI Whisper API
3. If both fail → FAILED status with descriptive error

### 2.3 Implementation

```typescript
import { Deepgram } from '@deepgram/sdk';

const deepgram = new Deepgram({ apiKey: process.env.DEEPGRAM_API_KEY });

async function transcribeSource(sourceId: string, audioUrl: string) {
  const { result } = await deepgram.transcription.prerecorded({
    audio: { url: audioUrl },
    options: {
      model: 'nova-2',
      language: 'en',
      punctuate: true,
      diarize: true,
      utterances: true,       // speaker-separated blocks
      paragraphs: true,       // logical paragraph breaks
      smart_format: true,     // "42" → "forty-two", "$50M" → "$50M"
      numerals: true,         // preserve numbers
      callback: `https://api.shaddai.ai/clips/v1/internal/transcribe/callback?source=${sourceId}`
    }
  });

  return result;
}
```

### 2.4 Supported Languages

| Tier | Languages |
|------|-----------|
| **Full support** | en, es, fr, de, pt, ja, ko, zh |
| **Beta support** | ar, hi, ru, it, nl, pl, tr, vi, th |

---

## 3. Highlight / Viral Moment Detection

### 3.1 Approach: Composite Multi-Signal Scoring

**Do NOT rely on a single LLM call to "find the best clips."** Use a composite scoring system combining 7 weighted signals for robust, verifiable results.

### 3.2 The 7 Signals

| Signal | Weight | Detection Method | Implementation |
|--------|--------|-----------------|----------------|
| **1. Linguistic importance** | 0.25 | Key phrase density, named entities, topic transitions | GPT-4o-mini analysis OR rule-based (NER via `compromise` npm) |
| **2. Audio energy** | 0.20 | Volume/loudness peaks, laughter, applause | FFmpeg RMS extraction per 0.01s window |
| **3. Sentiment intensity** | 0.15 | Absolute deviation from mean sentiment | LLM per-segment sentiment OR `sentiment` npm |
| **4. Q&A pairs** | 0.15 | Interrogative syntax + speaker turn mapping | Regex + speaker turn detection |
| **5. Narrative position** | 0.10 | Proximity to beginning/end/topic transitions | Positional analysis (rule-based) |
| **6. Speech velocity** | 0.10 | Words-per-second anomalies | WPS per 5s window |
| **7. Callouts/name drops** | 0.05 | Proper noun frequency (guests, brands, notable people) | NER via `compromise` or LLM |

### 3.3 Composite Score Calculation

```
composite = (linguistic × 0.25) + (audio × 0.20) + (sentiment × 0.15) + 
            (qa × 0.15) + (narrative × 0.10) + (velocity × 0.10) + (callouts × 0.05)
```

### 3.4 Clip Candidate Merging Algorithm

```typescript
function extractCandidates(
  segments: Segment[],
  options: { minDuration: number; maxDuration: number; topN: number }
): ClipCandidate[] {
  // 1. Score every segment via composite formula
  const scored = segments.map(s => ({ ...s, compositeScore: computeComposite(s) }));
  
  // 2. Find seed segments (score > 0.6)
  const seeds = scored.filter(s => s.compositeScore > 0.6);
  
  // 3. Expand: merge adjacent segments while score > 0.4
  // 4. Trim to maxDuration (drop lowest-scoring edges)
  // 5. Deduplicate overlapping candidates (keep highest score)
  // 6. Sort by score descending
  // 7. Return top N
}
```

### 3.5 Cost Comparison: LLM vs Rule-Based

| Approach | Cost/hr of video | Accuracy | Best For |
|----------|-----------------|----------|----------|
| **Hybrid (Recommended)** | ~$0.50/hr | High | Production — rule-based pass, LLM refinement on top 20 |
| LLM-only (GPT-4o) | $2-5/hr | Very high | Pro tier (quality priority) |
| LLM-only (GPT-4o-mini) | $0.20/hr | High | Builder tier |
| Rule-based only | ~$0.001/hr | Moderate | Free tier (cost priority) |

### 3.6 Empty Results Fallback

If no segment scores above threshold:
1. Lower threshold to 0.4 → re-score
2. If still empty, lower to 0.3
3. If still empty → return equally-spaced clips as fallback + notify user

---

## 4. AI Generation (Hooks, Captions, Titles)

### 4.1 Provider Comparison

| Provider | Model | Cost | Quality | Latency | Best For |
|----------|-------|------|---------|---------|----------|
| **OpenAI** | GPT-4o-mini | $0.15/1M input, $0.60/1M output | Excellent | Fast | Primary — hooks, captions, hashtags |
| **Anthropic** | Claude 3.5 Haiku | $0.25/1M input, $1.25/1M output | Excellent | Fast | Fallback; creative writing |
| OpenAI | GPT-4o | $2.50/1M input, $10/1M output | Best | Moderate | Pro tier only (quality override) |

**Recommendation: GPT-4o-mini as primary, Claude Haiku as fallback.**

### 4.2 Cost Per Clip (Text Generation Only)

| Task | Tokens (approx) | Cost (GPT-4o-mini) |
|------|----------------|-------------------|
| 3 hook variants | 400 input / 150 output | ~$0.0002 |
| 2 caption variants | 300 input / 200 output | ~$0.0002 |
| Hashtag set | 100 input / 50 output | ~$0.00005 |
| X thread (5 tweets) | 400 input / 350 output | ~$0.0003 |
| LinkedIn post | 500 input / 400 output | ~$0.0003 |
| **Total per clip** | **~2,000 tokens** | **~$0.001** |

### 4.3 Prompt Engineering Patterns

#### Hook Generation

```
You are a viral content strategist. Generate {hooks_per_clip} hook variants for this clip.

CLIP CONTEXT:
Topic: {primary_topic}
Speaker quote: "{transcript_excerpt}"
Summary: {summary_sentence}

--- BRAND PROFILE ---
Tone: {tone_voice}
Audience: {target_audience}
Key Messages: {key_messaging}
Avoid: {avoid_topics}
--- END BRAND PROFILE ---

Generate one of each type (each ≤ 120 characters):
1. Curiosity gap — intriguing, incomplete information
2. Contrarian — challenges common belief
3. Quote punch — speaker's most impactful words
4. Numbered list — specific, scannable
5. Question — engages, provokes thought
```

#### Caption Generation

```
Write 2 caption variants for a {platform} clip:

Primary caption (2-3 sentences): The story/context leading to a CTA
Secondary caption (1 sentence): Punchy, shareable standalone

Platform: {platform}
Brand tone: {tone_voice} + {style_notes}
Target audience: {target_audience}
Platform style: {platform_style_notes}
```

### 4.4 Output Structure

```typescript
interface GeneratedContent {
  hooks: {
    curiosity: string;    // "The 1 question that got the founder $50M 🚀"
    contrarian: string;   // "Stop optimizing your pitch deck. Do this instead."
    quote: string;        // "\"Fundraising is dating, not applying.\" — @founder"
    list: string;         // "3 signs your startup is about to die"
    question: string;     // "Why do VCs ghost you after meeting?"
  };
  captions: {
    primary: string;      // 2-3 sentences + CTA
    secondary: string;    // 1 punchy sentence
  };
  hashtags: {
    core: string[];       // 3 high-volume tags
    niche: string[];      // 3 mid-volume tags  
    brand: string[];      // 1-2 custom brand tags
  };
}
```

### 4.5 Platform-Specific Output Styles

| Platform | Hook Style | Caption Style | Hashtag Count | Emoji Use | CTA Style |
|----------|-----------|---------------|--------------|-----------|-----------|
| TikTok | Curiosity gap, punchy | Minimal, hashtag-heavy | 5-8 | Heavy (2-3) | "Follow for more" |
| Reels | Aspirational, aesthetic | Brand voice, hook in first line | 3-5 | Moderate (1-2) | "Save this" |
| Shorts | Informational, direct | Descriptive, SEO-friendly | 2-3 | Light (0-1) | "Subscribe" |
| X/Twitter | Thread hook | Concise, link heavy | 2-3 | Moderate (1) | "RT/share" |
| LinkedIn | Professional, thought-leadership | Long-form storytelling | 3-5 | Minimal (0-1) | "Comment your thoughts" |

---

## 5. Processing Architecture

### 5.1 Queue-Based Processing (Recommended over Real-Time)

**Recommendation: Hybrid — Queue-based pipeline with WebSocket progress events.**

| Factor | Queue-Based (chosen) | Real-Time | 
|--------|---------------------|-----------|
| Reliability | ★★★★★ (retry, death letter, persistence) | ★★★ (drop on failure) |
| Back-pressure | ★★★★★ (queue depth controls concurrency) | ★★ (throttling complex) |
| Cost control | ★★★★★ (predictable, batched) | ★★★ (spiky) |
| User experience | ★★★★ (polling/progress WS) | ★★★★★ (instant) |
| Implementation | More complex upfront | Simpler | 

**The pipeline has stages that require 1-15 minutes of processing. Queue-based is the only practical choice for reliability and cost control. WebSocket events provide real-time UX.**

### 5.2 Pipeline Stages

```
                     ┌──────────┐
                     │  QUEUED   │
                     └────┬─────┘
                          │
                     ┌────▼─────┐
                     │ INGEST   │ ← File validation, normalization, storage
                     └────┬─────┘
                          │
                     ┌────▼──────┐
                     │TRANSCRIBE │ ← Deepgram API call
                     └────┬──────┘
                          │
                     ┌────▼──────┐
                     │  DETECT   │ ← Signal analysis, scoring, ranking
                     └────┬──────┘
                          │
                     ┌────▼──────┐
                     │  REVIEW   │ ← User approves/rejects candidates
                     └────┬──────┘
                          │
                     ┌────▼──────┐
                     │ GENERATE  │ ← Hooks, captions, hashtags per clip
                     └────┬──────┘
                          │
                     ┌────▼──────┐
                     │  RENDER   │ ← FFmpeg clip extraction + overlays
                     └────┬──────┘
                          │
                     ┌────▼──────┐
                     │  EXPORT   │ ← Platform upload / download links
                     └────┬──────┘
                          │
                     ┌────▼────┐
                     │  DONE   │
                     └─────────┘
```

### 5.3 Job Queue: BullMQ + Redis

```typescript
import { Queue, Worker } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Define queues per pipeline stage for independent scaling
const ingestQueue = new Queue('clip:ingest', { connection });
const transcribeQueue = new Queue('clip:transcribe', { connection });
const detectQueue = new Queue('clip:detect', { connection });
const generateQueue = new Queue('clip:generate', { connection });
const renderQueue = new Queue('clip:render', { connection });

// Worker with per-tier concurrency
const renderWorker = new Worker('clip:render', async (job) => {
  const { clipId, platform, startSec, durationSec } = job.data;
  await renderClip(clipId, platform, startSec, durationSec);
}, {
  connection,
  concurrency: 2,          // CPU-bound, limit parallel renders
  limiter: { max: 5, duration: 1000 }  // 5 renders per second
});
```

### 5.4 Concurrency Limits Per Tier

| Tier | Concurrent Jobs | Max Clip Candidates | Max Platforms | Duration Cap | File Size Cap |
|------|----------------|--------------------|---------------|-------------|--------------|
| **Free** | 1 | 5 | 2 (TikTok, Reels) | 30 min | 500 MB |
| **Builder** ($19/mo) | 3 | 10 | 3 (+ Shorts) | 60 min | 2 GB |
| **Pro** ($49/mo) | 5 | 25 | 5 (+ X, LinkedIn) | 3h | 5 GB |
| **Alpha/Agency** ($149/mo) | 20 | 50 | All + custom | 6h | 16 GB |

### 5.5 Storage Layout

```
sources/{user_id}/{source_id}/raw.{ext}          # Original upload
sources/{user_id}/{source_id}/normalized.mp4      # Normalized H.264/AAC
sources/{user_id}/{source_id}/audio.wav           # Extracted audio for ASR
sources/{user_id}/{source_id}/thumbnails/{n}.jpg      # Keyframe thumbnails
transcripts/{user_id}/{transcript_id}.json         # Full transcript
clips/{user_id}/{clip_id}/{platform}.mp4           # Rendered clip per platform
exports/{user_id}/{batch_id}/package.zip          # Batch export package
```

### 5.6 Caching Strategy

| Cache Key | TTL | Benefit |
|-----------|-----|---------|
| `transcript:{audio_hash}` | 7 days | Avoid re-transcribing same audio |
| `candidates:{transcript_id}:{profile_id}` | 24h | Reuse detection results with same profile |
| `render:{clip_id}:{platform}:{params_hash}` | 7 days | Avoid re-rendering identical parameters |

---

## 6. Existing SHADDAI Integration Points

### 6.1 Billing Module

```typescript
// Emit usage events after each pipeline stage
interface UsageEvent {
  userId: string;
  teamId?: string;
  operation: 'transcribe' | 'detect' | 'generate' | 'render';
  units: { audioMinutes: number; aiCalls: number; tokens: number; renderingSeconds: number; storageBytes: number };
  costEstimateUsd: number;
}

// Quota check before starting jobs
// GET /internal/users/:userId/quota → tier limits + current usage
```

### 6.2 Agent Dispatch Module

```typescript
interface AgentRequest {
  agentType: 'transcriber' | 'detector' | 'writer' | 'renderer';
  jobId: string;
  priority: 1 | 3 | 5;
  payload: Record<string, unknown>;
  webhookUrl: string;  // callback on completion
  timeoutMs: number;
}

// POST /internal/agents/dispatch
```

### 6.3 Workflow Orchestrator (XState)

```typescript
// State machine managed by XState
// States: queued → ingesting → transcribing → detecting → reviewing → generating → rendering → exporting → done
// Transitions triggered by callbacks from agent dispatch
```

### 6.4 Storage Module

- Presigned URL generation for uploads/downloads
- Namespace by user_id for isolation
- Cloudflare R2 (primary) with zero egress fees

### 6.5 User/Team Module

- Fetch user tier + quotas before job creation
- Verify OAuth tokens for platform exports
- Fetch team membership for shared brand profiles

### 6.6 Webhook/Notification Module

- `clip.ready` → notify user: "Your clips are generated"
- `clip.exported` → notify: "Published to TikTok"
- `clip.failed` → notify: "Something went wrong, here's why"

---

## 7. Final Recommendation

### Recommended Stack

| Component | Technology | Priority |
|-----------|-----------|----------|
| API Framework | **Hono** (Node.js/TypeScript) | High |
| Video Processing | **FFmpeg** + fluent-ffmpeg + ffmpeg-static | High |
| Transcription | **Deepgram Nova-2** (primary) + Whisper API (fallback) | High |
| Highlight Detection | **Composite scoring** (7 signals, hybrid LLM + rule-based) | High |
| Hook/Caption Gen | **GPT-4o-mini** (primary) + Claude Haiku (fallback) | High |
| Job Queue | **BullMQ** + Redis (ioredis) | High |
| State Machine | **XState v5** | Medium |
| Database | **PostgreSQL** + Prisma ORM | High |
| Validation | **Zod** | Medium |
| Storage | **Cloudflare R2** (S3 API) | High |
| Real-time | **uWebSockets.js** | Medium |

### Cost Per Source (60min video → 10 clips)

| Stage | Cost |
|-------|------|
| Transcribe (Deepgram) | $0.26 |
| Detect (GPT-4o-mini) | $0.20 |
| Generate hooks/captions (10 clips) | $0.01 |
| Format for 5 platforms (10 clips) | $0.03 |
| Render (10 clips × 5 platforms) | $0.05 |
| **Total** | **~$0.55** |

### Margin Analysis

| Tier | Price | Clips | Cost to Serve | Gross Margin |
|------|-------|-------|---------------|-------------|
| Free | $0 | 5 | ~$0.28 | -$0.28 (acq cost) |
| Builder | $19/mo | 50 | ~$2.75 | 85% |
| Pro | $49/mo | 250 | ~$13.75 | 72% |
| Alpha | $149/mo | 2000 | ~$55.00 | 63% |

### Implementation Order (10 Steps)

1. **Scaffold project** — `shaddai-clips/` directory, package.json, TypeScript config
2. **Install system deps** — FFmpeg via apt, start Redis
3. **Install npm deps** — All packages listed above
4. **Build Ingest pipeline** — File validation, normalization, thumbnails, storage
5. **Build Transcribe Agent** — Audio extraction, Deepgram API, segment processing
6. **Build Detect Agent** — Signal analysis, composite scoring, clip candidate ranking
7. **Build Generate Agent** — Hook/caption/hashtag with brand profile injection
8. **Build Render Agent** — FFmpeg clip extraction, aspect ratio, overlays, output
9. **Build Orchestrator** — XState state machine + BullMQ queues + WebSocket events
10. **Wire up APIs** — Hono routes matching API contracts, quota checks, WebSocket

---

*End of Research & Recommendations Document*