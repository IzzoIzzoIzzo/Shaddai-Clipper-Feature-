# SHADDAI Clips — Pipeline Detail & Integration Map

> **Document Owner:** Product Architect
> **Status:** v1.0 — Draft
> **Last Updated:** 2025-06-06

---

## 1. Processing Pipeline — Deep Dive

This document details how each pipeline stage works internally: what happens, which agents are involved, what data flows between stages, and how failures are handled.

---

### 1.1 Ingest Pipeline

```
User Upload ──→ Validator ──→ Normalizer ──→ Storage ──→ Event: source.ingested
```

**Ingest Agent Responsibilities:**

1. **File validation**
   - MIME type check against allowlist: `video/mp4`, `video/quicktime`, `video/webm`, `audio/mpeg`, `audio/wav`, `audio/x-m4a`, `audio/ogg`
   - Magic byte verification (first 4KB) to catch MIME spoofing
   - Size check against user tier limits
   - Duration probe (ffprobe) — reject if exceeds tier limit
   - Virus scan (ClamAV) for uploaded files

2. **Normalization**
   - Video: transcode to H.264 High Profile, AAC 128kbps audio, YUV420 pixel format
   - Resolution: capped at 1920×1080 (downscale if larger)
   - Frame rate: normalize to 30fps (variable FPS → constant)
   - Audio: normalize to 48kHz sample rate, stereo, LUFS -14dB integrated loudness
   - Generate thumbnails at 0%, 25%, 50%, 75% positions
   - Extract waveform data (for audio peak visualization in highlight analysis)

3. **Edge cases**
   - **Corrupted file**: detect via ffprobe exit code → return `FILE_CORRUPTED` error
   - **No audio track**: return `NO_AUDIO_TRACK` error
   - **Very short (< 60s)**: warn user but allow (clips may be minimal)
   - **DRM-protected**: detect via missing/damaged stream headers → `DRM_PROTECTED`
   - **Duplicate upload**: SHA-256 hash of first 64KB + file size → detect if already processed

**Failure Mode:**
- Transient (storage write failure): retry 3x with exponential backoff
- Permanent (unsupported format): return error to user immediately, no retry

---

### 1.2 Transcribe Pipeline

```
Event: source.ingested ──→ Audio Extraction ──→ ASR Engine ──→ Post-process ──→ Store
```

**Transcribe Agent Responsibilities:**

1. **Audio extraction**
   - Extract PCM audio from normalized video
   - Downmix to mono for ASR (most ASR engines prefer mono)
   - For files > 1hr, chunk into 30-minute segments with 30-second overlap (context windows)

2. **ASR execution**
   - Primary: **Deepgram Nova-2** (best accuracy + speed + built-in diarization)
   - Fallback: **OpenAI Whisper large-v3** (when Deepgram unavailable)
   - Local/self-hosted: **Whisper.cpp** (for on-prem deployments, lower cost but slower)
   - Configurable per user tier / team preference

3. **Post-processing**
   - Speaker diarization: label speakers (A, B, C...) with confidence scores
   - Punctuation restoration & capitalization
   - Segment merging: join utterance-level output into logical segments (paragraphs)
   - Word-level timestamps (for clip boundary precision)
   - Confidence filtering: segments below 0.6 confidence flagged for manual review

4. **Enrichment** (optional, Pro+ tier)
   - Topic extraction per segment (KeyBERT or GPT-4o-mini)
   - Emotion tagging per segment
   - Key phrase extraction (noun phrases, named entities)
   - Question-answer pair detection

**Supported Languages:**
- Full support: en, es, fr, de, pt, ja, ko, zh
- Beta support: ar, hi, ru, it, nl, pl, tr, vi, th

**Failure Mode:**
- ASR timeout (> 10min processing): chunk retry with smaller segments
- Model returns empty: check audio levels, attempt audio amplification + retry
- Diarization failure: fall back to single-speaker transcript, flag for user

---

### 1.3 Detect Pipeline

```
Event: transcript.completed ──→ Signal Analysis ──→ Scoring ──→ Candidate Ranking ──→ Store
```

**Detect Agent (Highlight Analyzer) Responsibilities:**

The heart of the system. Combines multiple signal sources into a composite score.

#### Signal 1: Linguistic Importance (Weight: 0.25)

**Method:** GPT-4o / Claude analysis of transcript segments

Input to LLM:
```
Analyze this transcript segment for clip-worthiness.
Consider: is this a key insight, a surprising fact, a powerful quote,
a story turning point, or a controversial statement?

Segment: "{segment_text}"
Context: This is segment {N} of {total} in a conversation about {topic}.

Rate 0-1: [key_insight, surprising, quotable, narrative_turning, controversial]
```

**Alternative (cost-saving):** Rule-based approach using:
- Named entity density (people, companies, numbers)
- Key phrase presence ("most important", "the key is", "here's the thing")
- Question count
- Transition words ("but", "however", "suddenly", "the truth is")

#### Signal 2: Audio Energy (Weight: 0.20)

**Method:** FFmpeg audio analysis
- Extract RMS energy per frame (0.01s windows)
- Detect peaks (≥ 2x mean energy)
- Detect laughter segments (spectral pattern matching)
- Detect applause segments
- Normalize: 0 = silence, 1 = maximum peak

#### Signal 3: Sentiment Intensity (Weight: 0.15)

**Method:** Per-segment sentiment analysis
- Calculate absolute deviation from rolling mean sentiment
- High deviation = emotional high point (surprise, anger, excitement, revelation)
- Low deviation = neutral exposition

#### Signal 4: Question-Answer Pairs (Weight: 0.15)

**Method:** Pattern matching + speaker turn analysis
- Detect questions (interrogative syntax, rising intonation via pitch analysis)
- Map to following answer (within 2 speaker turns)
- Score: 1 = clear Q&A, 0.5 = partial, 0 = none

#### Signal 5: Narrative Position (Weight: 0.10)

**Method:** Positional analysis
- Weight segments near content boundaries (beginning and end of video/conversation segments)
- Weight segments near topic transitions
- Pattern: hooks near starts, conclusions near ends

#### Signal 6: Speech Velocity (Weight: 0.10)

**Method:** Words-per-second analysis
- Calculate WPS per 5-second window
- Detect rapid speech (excitement) vs. slow speech (emphasis)
- Anomaly detection: sudden changes in pace

#### Signal 7: Callouts (Weight: 0.05)

**Method:** Proper noun extraction
- Named entity recognition (people, brands, products)
- Higher score when notable entities appear (configurable list per user)

#### Composite Score Calculation

```
composite = Σ(signal_i × weight_i)
```

Adjacent high-scoring segments are merged into clip candidates with the following algorithm:

```
1. Find all segments with composite > 0.6
2. Sort by score descending
3. For each seed segment:
   a. Expand outward, adding adjacent segments while score > 0.4
   b. Clip: if expanded duration > maxDurationSec, trim from lowest-scoring edges
   c. Cap: ensure 15s ≤ duration ≤ 90s (configurable)
4. Deduplicate overlapping candidates (keep highest-scoring)
5. Sort by composite score descending
6. Return top N (configurable, default 10-25)
```

**Failure Mode:**
- Empty candidate list: lower threshold to 0.4, then 0.3; if still empty, return "no strong highlights detected" with equally-spaced clips as fallback

---

### 1.4 Generate Pipeline

```
Event: candidates.selected ──→ Hook Gen → Caption Gen → Platform Format → Render → Store
```

#### Hook Generation

**Agent:** HookWriter (GPT-4o-mini / Claude Haiku)

Per clip candidate, generates N variants (default: 3):

```
Context: This clip is about {topic}. The key insight is: {summary_sentence}.
The speaker's exact quote: "{excerpt}"

--- BRAND TONE ---
{tone_profile}
--- END TONE ---

Generate {hooks_per_clip} hook variants, one of each type:
1. Curiosity gap (intriguing, incomplete information)
2. Contrarian/challenge (challenges common belief)
3. Quote punch (speaker's most impactful words)
4. Numbered list (specific, scannable)
5. Question (engages, provokes thought)

Each hook: max 120 characters. Make them scroll-stopping.
```

#### Caption Generation

**Agent:** CaptionWriter (GPT-4o-mini / Claude Haiku)

```
Write 2 caption variants for this clip:

Primary caption (2-3 sentences): the story/context, ends with CTA
Secondary caption (1 sentence): punchy, sharable standalone

Include relevant emojis (2-3 max).
Match brand tone: {tone_profile}
Target audience: {target_audience}
```

#### Hashtag Generation

- **Core (3):** broad, high-volume tags related to content topic
- **Niche (3):** specific community/industry tags
- **Brand (1-2):** user's custom brand tags

#### Platform Formatting

**Agent:** Formatter (GPT-4o-mini / rule-based)

| Platform | Hook Style | Caption Style | Emoji Use | CTA |
|----------|-----------|---------------|-----------|-----|
| TikTok | Short, punchy, curiosity gap | Minimal, hashtag-heavy | Heavy | "Follow for more" |
| Reels | Aspirational, aesthetic | Brand voice, hook in first line | Moderate | "Save this" |
| Shorts | Informational, direct | Descriptive, SEO-friendly | Light | "Subscribe" |
| X/Twitter | Thread: first tweet hooks | Concise, link heavy | Moderate | "RT/share" |
| LinkedIn | Professional, thought-leadership | Long-form, storytelling | Minimal | "Comment your thoughts" |

#### X/Twitter Thread Expansion

For clips on X, generate a 3-5 tweet thread:

```
Tweet 1 (hook): "{hook}" + "🧵"
Tweet 2 (context): Set up the story/insight
Tweet 3 (insight): The core message
Tweet 4 (application): How to apply it (optional)
Tweet 5 (CTA): "Full context in the clip ⬆️" + relevant hashtags

Each tweet: max 280 characters. Include relevant mentions.
```

#### LinkedIn Post Expansion

```
Professional long-form post (800-1200 characters):
- Compelling first line (no "I'm excited to share...")
- Storytelling structure with line breaks
- 3-4 key takeaways as bullet points
- Question CTA to drive comments
- 3-5 relevant hashtags
```

#### Video Rendering

**Agent:** Renderer (FFmpeg pipeline)

1. **Clip extraction**
   ```bash
   ffmpeg -i normalized.mp4 -ss {start_sec - 0.5} -t {duration + 1.0} -c copy clip_temp.mp4
   ```

2. **Aspect ratio conversion** (per platform)
   - TikTok/Reels/Shorts: 9:16 (1080×1920) — detect center of interest, crop
   - X/LinkedIn: 16:9 (1920×1080) — letterbox if needed

3. **Caption burn-in** (optional, configurable)
   - SRT: subtitle file for platform-native captions
   - Burn-in: FFmpeg drawtext for hardcoded captions
   - Styling: white text, black outline, centered bottom 1/3

4. **Brand overlay** (optional)
   - Watermark at bottom-right corner (semi-transparent)
   - For free tier: mandatory SHADDAI watermark

5. **Output encoding**
   - Codec: H.264 (libx264), CRF 23, preset medium
   - Audio: AAC 128kbps
   - Container: MP4 with faststart (moov atom at front for streaming)

**Failure Mode:**
- FFmpeg crash: retry once with `-c:v libx264 -preset slow` (more reliable)
- Aspect ratio crop gets wrong center: fall back to center crop
- Caption overlay fails: provide SRT separately

---

## 2. Integration Points with SHADDAI Modules

### 2.1 Billing Module Integration

```
SHADDAI Clips ────→ Usage Metering Events ────→ SHADDAI Billing
                         │
                         ├── transcribe: $0.006/audio-minute (Deepgram cost + margin)
                         ├── detect: $0.002/segment (LLM inference)
                         ├── generate: $0.005/clip-platform (hooks + captions + formatting)
                         └── render: $0.003/clip-platform (compute + storage)
```

**Integration Pattern:**
- Clip service emits `UsageRecord` to internal event bus after each stage completes
- Billing service consumes events, accumulates per-user/team counters
- Billing service enforces quota before jobs begin (`GET /internal/users/:id/quota`)
- Free tier: capped at 5 clips/month total across all sources
- Overages: 402 Payment Required response with upgrade link

### 2.2 Agent Dispatch Module Integration

```
SHADDAI Clips ────→ Agent Request ────→ SHADDAI Agent Dispatch
                         │
                         ├── Agent types: transcriber, detector, hook_writer, caption_writer, formatter, renderer
                         ├── Priority tiers: 1 (free, best-effort), 3 (builder), 5 (pro, priority)
                         └── Each agent runs in isolated container with timeout
```

**Agent Contract:**
```typescript
interface AgentRequest {
  agentType: AgentType;
  jobId: string;
  priority: 1 | 2 | 3 | 4 | 5;
  payload: Record<string, unknown>;
  webhookUrl: string;  // callback on completion
  timeoutMs: number;   // max execution time
  maxRetries: number;  // default: 2
}

interface AgentResponse {
  status: 'completed' | 'failed';
  jobId: string;
  output: Record<string, unknown>;
  metrics: {
    durationMs: number;
    tokensUsed?: number;
    costUsd?: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

### 2.3 Workflow Orchestrator Integration

```
SHADDAI Clips ────→ State Machine ────→ SHADDAI Workflow Engine
```

The Clip Workflow Orchestrator manages the lifecycle of each generation job using XState state machines.

**State Machine Definition (XState v5):**

```typescript
const clipWorkflow = createMachine({
  id: 'clipGeneration',
  initial: 'queued',
  states: {
    queued: {
      on: { START: 'ingesting' }
    },
    ingesting: {
      invoke: { src: 'ingestAgent' },
      on: {
        INGESTED: 'transcribing',
        FAILED: 'failed'
      }
    },
    transcribing: {
      invoke: { src: 'transcribeAgent' },
      on: {
        TRANSCRIBED: 'detecting',
        FAILED: 'failed'
      }
    },
    detecting: {
      invoke: { src: 'detectAgent' },
      on: {
        DETECTED: 'reviewing',
        FAILED: 'failed'
      }
    },
    reviewing: {
      on: {
        APPROVE: 'generating',
        REJECT: 'rejected',
        REGENERATE: 'detecting'  // user adjusts parameters
      }
    },
    generating: {
      invoke: { src: 'generateAgent' },
      on: {
        GENERATED: 'rendering',
        FAILED: 'failed'
      }
    },
    rendering: {
      invoke: { src: 'renderAgent' },
      on: {
        RENDERED: 'exporting',
        FAILED: 'failed'
      }
    },
    exporting: {
      invoke: { src: 'exportAgent' },
      on: {
        EXPORTED: 'done',
        PARTIAL_EXPORT: 'done',  // some platforms failed
        FAILED: 'failed'
      }
    },
    failed: { type: 'final' },
    rejected: { type: 'final' },
    done: { type: 'final' }
  }
});
```

**Workflow Persistence:**
- State stored in PostgreSQL (jsonb column on `generation_batches`)
- Active workflows tracked in Redis for fast querying
- Dead letter queue for workflows that exceed retry limits (> 3 retries)

### 2.4 Storage Module Integration

```
SHADDAI Clips ────→ S3/R2 Object Store
                         │
                         ├── Raw uploads → sources/{user_id}/{source_id}/raw.{ext}
                         ├── Normalized files → sources/{user_id}/{source_id}/normalized.mp4
                         ├── Audio → sources/{user_id}/{source_id}/audio.wav
                         ├── Thumbnails → sources/{user_id}/{source_id}/thumbs/
                         ├── Transcripts → transcripts/{user_id}/{transcript_id}.json
                         ├── Rendered clips → clips/{user_id}/{clip_id}/{platform}.mp4
                         └── Export packages → exports/{user_id}/{batch_id}/package.zip
```

**Storage Backend:**
- **Cloudflare R2** (primary) — zero egress fees, S3-compatible API
- **AWS S3** (alternative) — higher egress costs but broader region availability
- **Local filesystem** (dev/staging) — `/mnt/shaddai-storage/`

**Access Pattern:**
- Uploads: direct-to-storage presigned URLs (client uploads directly, not through API server)
- Downloads: presigned URLs with 24h TTL for free tier, 7d for Pro+
- Cleanup: lifecycle policy deletes raw files after 30d (normalized + clips retained 90d)

### 2.5 User/Team Module Integration

```
SHADDAI Clips ────→ User Profile ────→ SHADDAI Auth/User Service
                         │
                         ├── Fetch user tier + quotas
                         ├── Fetch team membership + shared brand profiles
                         ├── Verify OAuth tokens for platform exports
                         └── Update usage statistics
```

### 2.6 Webhook/Notification Module Integration

```
SHADDAI Clips ────→ Events ────→ SHADDAI Notification Service
                         │
                         ├── clip.ready → email/slack/push: "Your clips are ready"
                         ├── clip.exported → email: "Published to TikTok"
                         ├── clip.failed → email: "Something went wrong"
                         └── clip.weekly_report → email: "Your clips got X views"
```

---

## 3. Cost Model

### Processing Cost Per Clip (Estimates)

| Stage | Provider | Cost Factor | Cost per Hour of Video | Notes |
|-------|----------|-------------|----------------------|-------|
| Transcribe | Deepgram Nova-2 | $0.0043/min | $0.26/hr | Pre-pay volume discount at 50k+ min |
| Transcribe | Whisper API | $0.006/min | $0.36/hr | Fallback |
| Detect | GPT-4o | $0.01/segment ± | $2-5/hr for ~200 segments | ~20 segment groups = $0.20 |
| Detect | GPT-4o-mini | $0.001/segment | $0.20/hr | Cheaper alternative |
| Generate hooks | GPT-4o-mini | $0.002/clip | $0.02/clip × 3 variants | |
| Generate captions | GPT-4o-mini | $0.001/clip | $0.01/clip | |
| Format (x5 platforms) | GPT-4o-mini | $0.003/clip | $0.03/clip | |
| Render | Compute (FFmpeg) | ~$0.001/clip-platform | $0.01/clip × 5 platforms | CPU cost |
| **Total per clip** | | | **~$0.05-0.12** | |
| **Total per source (10 clips)** | | | **~$0.50-1.20** | |

### User Pricing Tiers

| Tier | Price | Monthly Clip Allowance | Cost to Serve | Gross Margin |
|------|-------|----------------------|---------------|-------------|
| Free | $0 | 5 clips | ~$0.50 | -$0.50 (acquisition cost) |
| Builder | $19/mo | 50 clips | ~$5.00 | 74% |
| Pro | $49/mo | 250 clips | ~$25.00 | 49% |
| Alpha | $149/mo | 2000 clips | ~$100.00 | 33% |

**Note:** Pro+ tiers subsidize margin with brand profile learning, auto-export, team features. Volume discounts on AI inference at scale improve margins over time.

---

## 4. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| P95 time: upload to clips ready | < 10 min for 60-min video | OpenTelemetry trace |
| API response time (p95) | < 200ms | API gateway metrics |
| WebSocket event latency | < 500ms | End-to-end timing |
| Concurrent jobs per instance | 5 | Load test |
| Clip render time | < 30s per clip-platform | FFmpeg benchmark |
| System uptime | 99.9% | Health check endpoint |

---

## 5. Technology Stack Recommendations

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **API framework** | Hono (Node.js/TypeScript) | Fast, edge-ready, lightweight |
| **Database** | PostgreSQL + pgvector | JSONB for flexible schemas, vector search for brand similarity |
| **Queue** | Redis + BullMQ | Battle-tested job queues with scheduling |
| **State machine** | XState v5 | Type-safe, visualizable, testable |
| **AI/LLM** | OpenAI + Anthropic (multi-provider) | Best quality; fallback redundancy |
| **ASR** | Deepgram Nova-2 | Fastest + most accurate with diarization |
| **Video processing** | FFmpeg (fluent-ffmpeg) | Mature, self-hosted, cost-effective |
| **Object storage** | Cloudflare R2 | Zero egress, S3-compatible |
| **Auth** | SHADDAI Auth (JWT) | Shared module |
| **Orchestration** | Custom agent dispatch + XState | Lightweight, no infra overhead |
| **Monitoring** | OpenTelemetry + Grafana/Prometheus | Standard observability stack |
| **Realtime** | WebSocket (uWebSockets.js) | Low-latency event streaming |
| **Validation** | Zod | Runtime type safety |

---

*End of Pipeline & Integration Document v1.0*