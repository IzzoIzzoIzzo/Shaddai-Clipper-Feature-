# SHADDAI Clips — System Architecture

> **Document Owner:** Product Architect
> **Status:** v1.0 — Draft
> **Last Updated:** 2025-06-06

---

## 1. Overview

SHADDAI Clips is the viral content repurposing engine inside the SHADDAI multi-agent OS. It ingests long-form video/audio content and automatically produces a full campaign of viral short-form clips, hooks, captions, titles, and platform-specific posts — all within a single AI operating system.

**The Core Promise:** One piece of long-form content → entire campaign of viral clips → 10x output without hiring a team.

### 1.1 Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Pipeline-first architecture** | Each stage (ingest → transcribe → detect → generate → format → export) is an isolated, observable step. Failures are contained; retries are per-stage. |
| **Agent-driven workflows** | Individual AI agents handle transcription, highlight detection, hook writing, caption generation, and formatting — orchestrated by a main Clip Workflow Agent. |
| **Pluggable model backend** | No hard dependency on any single AI provider. Swap between OpenAI Whisper, Deepgram, or local models per user preference/tier. |
| **Progressively augmentable** | Users start with quick default output; they can refine, approve, set brand tone, and schedule. The system learns from edits. |
| **Cost-aware processing** | Each stage reports token usage, duration, and cost. Users see estimated processing cost before confirmation. |

### 1.2 Key Differentiators

- **Batch intelligence** — generates 10–50 curated clips instead of 1–3
- **Viral moment detection** — NLP + audio peaks + engagement patterns identify highlight reels
- **Brand tone memory** — per-user/team tone profiles applied to hooks, captions, and CTA
- **Platform-native formatting** — platform-aware aspect ratios, duration limits, style guides
- **Human-in-the-loop** — export/approval gate before publishing

---

## 2. High-Level Architecture

```
                        ┌─────────────────────────────────────┐
                        │         SHADDAI Clips               │
                        │        Multi-Agent System            │
                        └─────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │              │              │              │              │
        ▼              ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Ingest     │ │  Transcribe  │ │  Detect      │ │  Generate    │ │  Export      │
│   Agent      │ │  Agent       │ │  Agent       │ │  Agent       │ │  Agent       │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│ - Validate   │ │ - Diarize    │ │ - Highlights │ │ - Hooks      │ │ - Format     │
│ - Extract    │ │ - Segment    │ │ - Emotions   │ │ - Captions   │ │ - Render     │
│ - Normalize  │ │ - Annotate   │ │ - Moments    │ │ - Hashtags   │ │ - Package    │
│ - Store raw  │ │ - Chunk      │ │ - Topics     │ │ - Threads    │ │ - Upload     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │              │              │              │              │
        └──────────────┴──────────────┴──────────────┴──────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │  Workflow    │ │  Brand Tone  │ │  Clip Store  │
            │  Orchestrator│ │  Memory      │ │  (S3/R2)     │
            └──────────────┘ └──────────────┘ └──────────────┘
```

### 2.1 Four-Phase Pipeline

| Phase | Agents | Duration (est.) | Output |
|-------|--------|-----------------|--------|
| **1. Ingest** | Uploader, Validator, Normalizer | < 1 min | Normalized source + metadata |
| **2. Understand** | Transcriber, Diarizer, Segmenter | 1–5 min | Annotated transcript with speaker labels, timestamps, topics |
| **3. Harvest** | Highlight Detector, Emotion Analyzer, Engagement Predictor | 2–8 min | Ranked clip candidates with scores |
| **4. Produce** | Hook Writer, Caption Writer, Platform Formatter, Renderer | 3–10 min | Finished clips + metadata package per platform |

### 2.2 Module Map

```
shaddai-clips/
├── api/                  # REST + WebSocket API gateway
│   ├── routes/
│   ├── middleware/
│   └── validators/
├── agents/               # Individual processing agents
│   ├── ingest/
│   ├── transcribe/
│   ├── detect/
│   ├── generate/
│   └── export/
├── orchestrator/         # Clip Workflow Orchestrator
│   ├── workflows/
│   ├── state-machines/
│   └── event-bus/
├── models/               # Data models & schemas (Prisma/Zod)
│   ├── prisma/
│   └── types/
├── brand-memory/         # Brand tone profile store
│   ├── profiles/
│   └── templates/
├── storage/              # File storage abstraction
│   ├── local/
│   ├── s3/
│   └── presigned-urls/
├── rendering/            # Video rendering engine
│   ├── ffmpeg/
│   ├── captions/
│   └── overlays/
├── webhooks/             # External platform integration
│   └── platforms/
├── billing/              # Usage tracking & metering
│   └── metrics/
└── infrastructure/       # Deployment configs
    ├── docker/
    └── terraform/
```

---

## 3. Processing Pipeline — Detailed Walkthrough

### 3.1 Phase 1: Ingest

**Trigger:** User uploads file via API, dashboard, or webhook URL.

**Steps:**
1. **Validation** — Check format (mp4, mov, webm, mp3, wav, m4a), size (< 4GB for free tier, < 16GB for Pro), duration (< 3h)
2. **Normalization** — Convert to standard format (H.264 + AAC in MP4 container), standardize sample rate (48kHz), normalize audio levels (LUFS -14dB)
3. **Thumbnail extraction** — Extract keyframes at 10% intervals
4. **Metadata extraction** — Duration, resolution, codec, bitrate, speaker count guess
5. **Storage** — Upload raw + normalized to object store, return `source_id`

**Output:**
```json
{
  "source_id": "src_abc123",
  "status": "ingested",
  "duration_sec": 3600,
  "file_size_bytes": 1500000000,
  "normalized_path": "sources/src_abc123/normalized.mp4",
  "extracted_metadata": { ... }
}
```

### 3.2 Phase 2: Understand

**Trigger:** Source ingested → transcription job queued.

**Steps:**
1. **Audio extraction** — Extract audio track to WAV/PCM
2. **Transcription** — Send to configured ASR engine (OpenAI Whisper, Deepgram Nova-2, or local Whisper.cpp for on-prem)
3. **Diarization** — Speaker identification and labeling (Speaker A, B, C... or named if available)
4. **Segmentation** — Split transcript into logical segments (paragraphs, sentence groups)
5. **Chunking** — Break into overlapping chunks of ~30 seconds for highlight analysis
6. **Topic labeling** — NLP-based topic extraction per segment (LDA/KeyBERT)
7. **Sentiment/emotion tagging** — Per-segment emotion labels (excitement, controversy, insight, humor, etc.)

**Output:**
```json
{
  "transcript_id": "trn_def456",
  "source_id": "src_abc123",
  "segments": [
    {
      "id": "seg_001",
      "start_sec": 0.0,
      "end_sec": 45.2,
      "speaker": "A",
      "text": "...",
      "topics": ["entrepreneurship", "fundraising"],
      "emotion": "insightful",
      "confidence": 0.94
    }
  ],
  "total_words": 12500,
  "language": "en"
}
```

### 3.3 Phase 3: Harvest (Highlight Detection)

**Trigger:** Transcript complete → highlight analysis queued.

**Detection signals (composite score):**

| Signal | Weight | Method |
|--------|--------|--------|
| Linguistic importance | 0.25 | Key phrase density, named entity frequency, topic transitions |
| Audio energy | 0.20 | Volume/loudness peaks, laughter detection, applause detection |
| Sentiment intensity | 0.15 | Absolute deviation from mean sentiment score per segment |
| Question-answer pairs | 0.15 | Q&A pattern detection — high engagement moments |
| Narrative structure | 0.10 | Story arc position (setup, conflict, resolution) |
| Speech velocity changes | 0.10 | Rapid speech, emphasis patterns |
| Callout/name drops | 0.05 | Proper noun frequency (guests, brands, notable people) |

**Clip candidate generation:**
1. Calculate composite score for each segment
2. Merge adjacent high-scoring segments into clip candidates
3. Score each candidate by total engagement potential
4. Rank and filter top N candidates (user-configurable, default 10)
5. Ensure minimum (15s) and maximum (90s) clip duration
6. Generate transition padding (±0.5s before/after)

**Output:**
```json
{
  "detection_id": "det_789ghi",
  "candidates": [
    {
      "clip_index": 1,
      "start_sec": 1250.3,
      "end_sec": 1310.8,
      "duration_sec": 60.5,
      "composite_score": 0.87,
      "signals": { "linguistic": 0.82, "audio": 0.91, "sentiment": 0.78, "qa": 0.65 },
      "primary_topic": "fundraising-strategy",
      "speakers_involved": ["A"],
      "summary_sentence": "The most important thing in fundraising is knowing when to walk away..."
    }
  ]
}
```

### 3.4 Phase 4: Produce

**Trigger:** Clip candidates approved (auto or manual) → generation queued.

**Sub-phases:**

#### 3.4.1 Hook Generation
For each clip candidate, generate 3–5 hook variants:
- **Curiosity gap** — "The 1 question that got the founder a $50M check 🚀"
- **Contrarian** — "Stop optimizing your pitch deck. Do this instead."
- **Numbered list** — "3 signs your startup is about to die"
- **Quote punch** — "\"Fundraising is dating, not applying.\" — @founder_name"
- **Question** — "Why do VCs ghost you after meeting?"

#### 3.4.2 Caption Generation
- Primary caption (2–3 sentences)
- Secondary caption (shorter, punchier)
- Alt-text/accessibility caption

#### 3.4.3 Hashtag Set
- Core (3 high-volume)
- Niche (3 mid-volume)
- Brand (1–2 custom per user)

#### 3.4.4 Platform Variants

| Platform | Aspect Ratio | Max Duration | Format | Style Notes |
|----------|-------------|-------------|--------|-------------|
| TikTok | 9:16 (1080×1920) | 60s | MP4 | Fast cuts, text overlays, trending audio |
| Instagram Reels | 9:16 (1080×1920) | 90s | MP4 | Cinematic, branded, caption overlay |
| YouTube Shorts | 9:16 (1080×1920) | 60s | MP4 | Vertical, title at top, subscribe prompt |
| X/Twitter | 16:9 (1920×1080) | 140s | MP4 | Square caption, no aggressive overlays |
| LinkedIn | 16:9 (1920×1080) | 10min | MP4 | Professional, minimal flash effects |
| Email/newsletter | N/A | N/A | HTML | Embed link + text excerpt + hook |

#### 3.4.5 Thread/Post Expansion
- **X/Twitter thread** — Expand clip insight into 3–5 tweet thread
- **LinkedIn post** — Long-form professional writeup
- **Email snippet** — Newsletter-ready summary

#### 3.4.6 Video Rendering
- Clip extraction via FFmpeg (seamless cuts)
- Caption overlay (burn-in or SRT)
- Aspect ratio cropping with intelligent center tracking
- Transition smoothing
- Brand watermark overlay (if configured)

**Output:**
```json
{
  "generation_id": "gen_jkl012",
  "clips": [
    {
      "clip_id": "clip_001",
      "hooks": {
        "curiosity": "...",
        "contrarian": "...",
        "quote": "..."
      },
      "captions": {
        "primary": "...",
        "secondary": "..."
      },
      "hashtags": { "core": [...], "niche": [...], "brand": [...] },
      "platform_assets": {
        "tiktok": { "video_url": "...", "caption": "...", "hashtag_string": "..." },
        "reels": { "video_url": "...", "caption": "..." },
        "x": { "thread": [...] },
        "linkedin": { "post_body": "..." }
      },
      "rendered_video_path": "clips/clip_001/tiktok.mp4"
    }
  ],
  "hook_variants": 5,
  "platforms_generated": ["tiktok", "reels", "youtube_shorts", "x", "linkedin"],
  "total_cost_usd": 0.42
}
```

---

## 4. Agent Architecture

### 4.1 Agent Types

| Agent | Role | Model Preference | Parallelism |
|-------|------|-----------------|-------------|
| **Orchestrator** | Schedule, dispatch, retry, state machine | Deterministic rules + GPT-4o-mini | 1 per job |
| **Ingestor** | Validate, normalize, extract metadata, store | Rule-based + FFmpeg | Up to 5 concurrent |
| **Transcriber** | ASR + diarization + segmentation | Deepgram Nova-2 / Whisper large-v3 | Up to 3 concurrent queues |
| **Highlight Detector** | Score segments, rank candidates | GPT-4o / Claude 3.5 Sonnet | 1 per transcript |
| **Hook Writer** | Generate hook variants per clip | GPT-4o-mini / Claude Haiku | Batch per clip set |
| **Caption Writer** | Write platform-optimized captions | GPT-4o-mini / Claude Haiku | Batch per clip set |
| **Formatter** | Platform-specific formatting & thread expansion | GPT-4o-mini | Batch per clip set |
| **Renderer** | FFmpeg video processing, overlay, rendering | Technical (no AI) | Up to 2 concurrent |

### 4.2 Orchestration State Machine

```
                  ┌──────────┐
                  │  QUEUED  │
                  └────┬─────┘
                       │
                  ┌────▼─────┐
                  │ INGESTING│
                  └────┬─────┘
                       │
                  ┌────▼──────┐
           ┌──────┤TRANSCRIBING│
           │      └────┬──────┘
           │           │
    ┌──────▼──┐  ┌─────▼──────┐
    │  FAILED  │  │ DETECTING  │
    └──────────┘  └─────┬──────┘
                         │
                    ┌────▼──────┐
                    │ GENERATING│
                    └────┬──────┘
                         │
                    ┌────▼─────┐
                    │ REVIEWING│
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ APPROVED │
                    └────┬─────┘
                         │
                    ┌────▼────┐
                    │EXPORTING│
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  DONE   │
                    └─────────┘
```

---

## 5. Data Models

### 5.1 Core Entities

#### Source
```
source_id: UUID (pk)
user_id: UUID (fk → users)
team_id: UUID (fk → teams, nullable)
title: string
original_filename: string
file_size_bytes: bigint
duration_sec: float
mime_type: string
normalized_path: string
raw_path: string
thumbnail_urls: jsonb
metadata: jsonb { codec, resolution, bitrate, fps, channels }
status: enum [uploading, ingested, failed]
created_at: timestamp
updated_at: timestamp
```

#### Transcript
```
transcript_id: UUID (pk)
source_id: UUID (fk → sources)
model_used: string (e.g. "deepgram/nova-2")
language: string (BCP-47)
confidence: float
word_count: integer
duration_sec: float
status: enum [processing, completed, failed]
created_at: timestamp
segments: jsonb[] — [ { id, start_sec, end_sec, speaker, text, topics[], emotion, confidence } ]
diarized_speakers: jsonb — [ { label: "A", name?: string } ]
```

#### ClipCandidate (detection output — cached, not user-visible)
```
candidate_id: UUID (pk)
transcript_id: UUID (fk → transcripts)
clip_index: integer
start_sec: float
end_sec: float
duration_sec: float
composite_score: float
signals: jsonb { linguistic, audio, sentiment, qa }
primary_topic: string
speakers: string[]
summary_sentence: text
status: enum [pending, selected, rejected, auto_selected]
```

#### Clip (user-visible generated clip)
```
clip_id: UUID (pk)
source_id: UUID (fk → sources)
generation_batch_id: UUID (fk → generation_batches)
candidate_id: UUID (nullable, fk → clip_candidates)
user_id: UUID (fk → users)
title: string
start_sec: float
end_sec: float
duration_sec: float
composite_score: float
hooks: jsonb { curiosity?, contrarian?, list?, quote?, question? }
captions: jsonb { primary, secondary }
hashtags: jsonb { core: [], niche: [], brand: [] }
platform_assets: jsonb { tiktok: { video_url, caption }, reels: {...}, x: {...}, linkedin: {...} }
status: enum [draft, approved, exported, archived]
brand_profile_id: UUID (nullable, fk → brand_profiles)
created_at: timestamp
updated_at: timestamp
```

#### GenerationBatch
```
batch_id: UUID (pk)
user_id: UUID (fk → users)
source_id: UUID (fk → sources)
total_clips_requested: integer
total_clips_generated: integer
platforms: string[] — ["tiktok", "reels", "youtube_shorts", "x", "linkedin", "email"]
hooks_per_clip: integer (default: 3)
duration_min_sec: float (default: 15)
duration_max_sec: float (default: 90)
brand_profile_id: UUID (nullable)
status: enum [queued, processing, generating, reviewing, completed, failed]
total_cost_usd: decimal(10,6)
ai_tokens_used: integer
processing_duration_sec: float
created_at: timestamp
completed_at: timestamp
```

#### BrandProfile
```
profile_id: UUID (pk)
user_id: UUID (fk → users)
team_id: UUID (nullable, fk → teams)
name: string
tone_voice: enum [professional, casual, humorous, educational, inspirational, confrontational]
target_audience: text
key_messaging: text[]
brand_hashtags: string[]
avoid_topics: text[]
style_notes: text
voice_characteristics: jsonb { formal_level, emotion_level, jargon_level, sentence_length_preference }
sample_hooks: text[]
sample_captions: text[]
platform_preferences: jsonb { primary_platform, secondary_platforms }
created_at: timestamp
updated_at: timestamp
```

### 5.2 Storage Layout (Object Store)

```
sources/{source_id}/raw.{ext}
sources/{source_id}/normalized.mp4
sources/{source_id}/audio.wav
sources/{source_id}/thumbnails/thumbnail_{index}.jpg
transcripts/{transcript_id}/transcript.json
transcripts/{transcript_id}/segments_full.json
clips/{clip_id}/tiktok.mp4
clips/{clip_id}/reels.mp4
clips/{clip_id}/shorts.mp4
clips/{clip_id}/x.mp4
clips/{clip_id}/linkedin.mp4
exports/{batch_id}/{timestamp}/package.zip
```

---

## 6. API Contracts

### 6.1 REST API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v1/sources/upload` | Upload file (multipart) |
| POST | `/v1/sources/import` | Import from URL (youtube, vimeo, rss) |
| GET | `/v1/sources/:id` | Get source metadata |
| POST | `/v1/transcripts` | Request transcription |
| GET | `/v1/transcripts/:id` | Get transcript + segments |
| POST | `/v1/clips/detect` | Request highlight detection |
| GET | `/v1/clips/candidates/:transcript_id` | Get clip candidates |
| POST | `/v1/clips/generate` | Generate clips from selected candidates |
| POST | `/v1/clips/generate/all` | Auto-detect + auto-generate (full pipeline) |
| GET | `/v1/clips/:id` | Get clip with all platform assets |
| PUT | `/v1/clips/:id` | Update/approve/edit clip |
| POST | `/v1/clips/:id/export` | Trigger platform export |
| POST | `/v1/clips/batch-approve` | Approve multiple clips |
| GET | `/v1/batches/:id` | Get generation batch status |
| GET | `/v1/batches` | List user's generation history |
| POST | `/v1/brand-profiles` | Create brand profile |
| PUT | `/v1/brand-profiles/:id` | Update brand profile |
| GET | `/v1/brand-profiles` | List user's profiles |
| POST | `/v1/webhooks/platforms/:platform` | Register platform webhook |

### 6.2 WebSocket Events (Real-time Updates)

```
clip.progress     → { batch_id, stage, progress_pct, estimated_remaining_sec }
clip.candidates   → { transcript_id, candidates[] }  (ready for review)
clip.generated    → { batch_id, clips_generated, total_cost }
clip.exported     → { clip_id, platform, external_url }
clip.error        → { batch_id, stage, error_code, error_message }
```

### 6.3 Integration Points with SHADDAI

#### Billing Module
```
// Per-operation metering event emitted to billing service
{
  "event": "clip.usage.meter",
  "user_id": "...",
  "team_id": "...",
  "operation": "transcribe" | "detect" | "generate" | "render",
  "units": {
    "audio_minutes": float,
    "ai_calls": integer,
    "tokens": integer,
    "rendering_seconds": float,
    "storage_bytes": integer
  },
  "cost_estimate_usd": decimal(10,6)
}
```

#### Agent Dispatch Module
```
// Reserving and dispatching agents
POST /internal/agents/dispatch
Body: {
  "agent_type": "transcriber" | "detector" | "writer" | "renderer",
  "job_id": "batch_id",
  "priority": 1-5,
  "payload": { ... }
}
```

#### Workflow Module
```
// Long-running workflow creation
POST /internal/workflows/create
Body: {
  "workflow_type": "clip-generation",
  "initial_state": "queued",
  "context": { "source_id": "...", "user_id": "..." }
}
```

#### Storage Module
```
// Presigned URL generation for uploads/downloads
GET /internal/storage/presigned-upload?path=sources/{user_id}/{filename}
GET /internal/storage/presigned-download?path=clips/{clip_id}/{platform}.mp4
```

#### User/Team Module
```
// Fetch user tier limits
GET /internal/users/:id/quota
Response: { max_file_size, max_duration, max_clips_per_batch, concurrent_jobs, platforms }
```

---

## 7. Brand Tone Memory System

### 7.1 How It Works

1. **Profile creation** — User fills out brand profile form OR system generates initial profile from analyzing existing content
2. **Profile application** — Selected profile injected into prompt context for hook, caption, and formatting agents
3. **Feedback loop** — User edits on generated clips are collected, patterns extracted, profile refined
4. **Learning** — After 5+ edits, system proposes profile updates (`"I notice you prefer shorter hooks — update your profile?"`)

### 7.2 Prompt Injection Pattern

```
--- BRAND PROFILE ---
Tone: {tone_voice}
Audience: {target_audience}
Key Messages: {key_messaging}
Avoid: {avoid_topics}
Style Notes: {style_notes}

Generate hooks that match this brand voice. Use {sentence_length_preference} sentences.
Avoid topics like {avoid_topics}. Reference key messaging where natural.
--- END PROFILE ---
```

---

## 8. Platform Integration Architecture

### 8.1 Export Flow

```
User approves clip
       │
       ▼
Export Agent formats per platform spec
       │
       ▼
┌──────────────────────────────────────────────┐
│ Platform Router                              │
│                                              │
│  TikTok ──→ Direct API upload (if OAuth'ed) │
│  Reels   ──→ Download link + caption text    │
│  Shorts  ──→ Direct API upload (YouTube API) │
│  X       ──→ API post with media            │
│  LinkedIn ─→ API post (if OAuth'ed)         │
│  Email    ─→ HTML render + send             │
└──────────────────────────────────────────────┘
```

### 8.2 Platform Webhooks
- **Publish success** — `{ clip_id, platform, external_url, published_at }`
- **Publish failure** — `{ clip_id, platform, error_code, error_detail }`
- **Performance callback** (optional, future) — `{ clip_id, platform, views, engagement_24h }`

---

## 9. Scaling & Performance

### 9.1 Concurrency Model

| Tier | Concurrent Jobs | Max Clip Candidates | Max Platforms | Video Duration Cap | File Size Cap |
|------|----------------|--------------------|---------------|-------------------|--------------|
| **Free** | 1 | 5 | 2 (TikTok, Reels) | 30 min | 500 MB |
| **Builder** ($19/mo) | 3 | 10 | 3 (+ Shorts) | 60 min | 2 GB |
| **Pro** ($49/mo) | 5 | 25 | 5 (+ X, LinkedIn) | 3h | 5 GB |
| **Alpha/Agency** ($149/mo) | 20 | 50 | All + custom | 6h | 16 GB |

### 9.2 Caching Strategy
- **Transcript cache** — Identical audio fingerprints reuse existing transcripts (SHA-256 audio hash)
- **Detection cache** — Same transcript + same brand profile = cached candidates (24h TTL)
- **Rendered clip cache** — Identical parameters = cached render (7d TTL)

### 9.3 Async Processing
- All phases are async with status polling (REST) or real-time (WebSocket)
- Job queue: Redis Bull/BullMQ or RabbitMQ
- Worker pool: Auto-scaling based on queue depth
- Retry policy: 3 attempts with exponential backoff (1s → 4s → 15s)

---

## 10. Security & Compliance

| Concern | Mitigation |
|---------|-----------|
| **File upload security** | MIME validation, magic byte check, virus scan, size limits |
| **User data isolation** | All storage paths namespaced by `user_id`, RLS in DB |
| **AI prompt injection** | Input sanitization, output validation, rate limits per user |
| **Platform credentials** | OAuth tokens stored encrypted, never exposed to frontend |
| **Watermarking** | Optional visible watermark for free tier (deters misuse) |
| **Processing cost fraud** | Pre-auth payment method for Pro+ tiers, usage caps |

---

## 11. Monitoring & Observability

| Signal | Tool/Method | Purpose |
|--------|------------|---------|
| Queue depth | Prometheus + Grafana | Detect processing bottlenecks |
| Per-stage latency | OpenTelemetry tracing | Identify slow phases |
| AI token usage | Metered counters | Cost tracking per user/team |
| Clip quality score | User feedback (thumbs up/down) | Model improvement |
| Render failure rate | Error rate dashboard | FFmpeg/encoding issues |
| API p50/p95/p99 | API gateway metrics | Endpoint performance |
| Conversion rate | Free → paid analytics | Product-market fit |

---

## 12. Future Roadmap

| Phase | Features | Timeline |
|-------|----------|----------|
| **V1** | Core pipeline: upload → transcribe → detect → generate (3 clips) → manual export | Launch |
| **V1.5** | Brand profiles, batch 10 clips, platform auto-export, LinkedIn posts | Month 1 |
| **V2** | Brand tone learning from edits, auto-scheduling calendar, A/B hook testing | Month 3 |
| **V3** | Livestream clipping (real-time), multi-source batch, team collaboration | Month 6 |
| **V4** | AI video repurposing (auto-remix, meme detection, full shows from clips) | Month 9+ |

---

## 13. Decision Log

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| ASR backend | Deepgram vs Whisper vs Local | Deepgram Nova-2 (primary) + Whisper (fallback) | Speed + accuracy + diarization built-in |
| Clip detection strategy | LLM-only vs signal-based composite | Composite scoring | More robust, verifiable scoring; LLM adds nuance on top |
| Rendering engine | FFmpeg vs cloud API | FFmpeg | Cost control, self-hosted, unlimited render time |
| Storage | S3 vs R2 vs local | Cloudflare R2 (no egress fees) + local cache | egress costs kill margins in S3 |
| Brand memory storage | Vector DB vs JSON | PostgreSQL JSONB + vector index (pgvector) | Simpler stack, good enough, no new infra |
| Async job queue | BullMQ vs RabbitMQ vs Temporal | BullMQ (Redis) | Fits Node.js stack, battle-tested, low ops overhead |
| State machine | Custom vs XState vs Temporal | XState | Type-safe, visualizable, testable |

---

*End of Architecture Document v1.0*