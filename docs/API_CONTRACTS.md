# SHADDAI Clips — API Contracts & Integration Points

> **Document Owner:** Product Architect
> **Status:** v1.0 — Draft
> **Last Updated:** 2025-06-06

---

## 1. REST API Specification

Base URL: `https://api.shaddai.ai/clips/v1`

### Authentication
All endpoints require `Authorization: Bearer <jwt>` header.
JWT obtained from SHADDAI Auth service.

### Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <jwt>` |
| `Content-Type` | Conditional | `multipart/form-data` for uploads, `application/json` for others |
| `X-Request-Id` | No | Idempotency key for retry safety |
| `X-Team-Id` | No | Team context for team-shared resources |

### Standard Error Response

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Unsupported file type. Supported: mp4, mov, webm, mp3, wav, m4a",
    "details": { "received": "application/exe", "supported": ["video/mp4", "video/quicktime", ...] },
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_FILE_TYPE` | 400 | Unsupported MIME type |
| `FILE_TOO_LARGE` | 400 | Exceeds tier limit |
| `DURATION_EXCEEDED` | 400 | Video too long for tier |
| `QUOTA_EXCEEDED` | 429 | Tier limits hit |
| `TRANSCRIPTION_FAILED` | 500 | ASR backend error |
| `DETECTION_FAILED` | 500 | Highlight analysis error |
| `GENERATION_FAILED` | 500 | AI generation error |
| `RENDER_FAILED` | 500 | Video rendering error |
| `SOURCE_NOT_FOUND` | 404 | Source ID doesn't exist |
| `CANDIDATES_NOT_READY` | 409 | Detection still in progress |
| `PAYMENT_REQUIRED` | 402 | Tier upgrade needed |

---

### 1.1 Source Upload

```http
POST /v1/sources/upload
Content-Type: multipart/form-data

file: <binary>
title: "My Podcast Episode #42"
team_id: "team_xyz" (optional)
```

**Response (201):**
```json
{
  "sourceId": "src_abc123",
  "status": "uploading",
  "title": "My Podcast Episode #42",
  "durationSec": 3600,
  "estimatedProcessingTimeSec": 180,
  "uploadUrl": "https://storage.shaddai.ai/presigned/src_abc123/raw.mp4",
  "createdAt": "2025-06-06T12:00:00Z"
}
```

**Polling:** Upload progress tracked via `GET /v1/sources/:id` until status = `ingested` or `failed`.

---

### 1.2 Import from URL

```http
POST /v1/sources/import
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=abc123",
  "platform": "youtube",
  "title": "Interview with John Doe"
}
```

**Response (202):**
```json
{
  "sourceId": "src_def456",
  "status": "importing",
  "title": "Interview with John Doe",
  "estimatedProcessingTimeSec": 240,
  "createdAt": "2025-06-06T12:01:00Z"
}
```

---

### 1.3 Get Source

```http
GET /v1/sources/:sourceId
```

**Response (200):**
```json
{
  "sourceId": "src_abc123",
  "title": "My Podcast Episode #42",
  "originalFilename": "episode42.mp4",
  "fileSizeBytes": 1500000000,
  "durationSec": 3600,
  "mimeType": "video/mp4",
  "metadata": {
    "codec": "h264",
    "resolution": "1920x1080",
    "bitrate": 8000000,
    "fps": 30,
    "channels": 2
  },
  "thumbnailUrls": {
    "0": "https://storage.shaddai.ai/sources/src_abc123/thumbs/0.jpg",
    "25": "https://storage.shaddai.ai/sources/src_abc123/thumbs/25.jpg",
    "50": "https://storage.shaddai.ai/sources/src_abc123/thumbs/50.jpg",
    "75": "https://storage.shaddai.ai/sources/src_abc123/thumbs/75.jpg"
  },
  "status": "ingested",
  "transcriptId": "trn_def456",
  "createdAt": "2025-06-06T12:00:00Z"
}
```

---

### 1.4 Request Transcription

```http
POST /v1/transcripts

{
  "sourceId": "src_abc123",
  "model": "deepgram/nova-2" // optional, uses default if omitted
}
```

**Response (201):**
```json
{
  "transcriptId": "trn_def456",
  "sourceId": "src_abc123",
  "status": "processing",
  "estimatedCompletionSec": 90
}
```

---

### 1.5 Get Transcript

```http
GET /v1/transcripts/:transcriptId
```

**Response (200):**
```json
{
  "transcriptId": "trn_def456",
  "sourceId": "src_abc123",
  "modelUsed": "deepgram/nova-2",
  "language": "en",
  "confidence": 0.96,
  "wordCount": 12500,
  "durationSec": 3600,
  "segments": [
    {
      "id": "seg_001",
      "startSec": 0.0,
      "endSec": 45.2,
      "speaker": "A",
      "text": "Welcome to the show. Today we're talking about fundraising...",
      "topics": ["introduction", "fundraising"],
      "emotion": "positive",
      "confidence": 0.94,
      "words": [
        { "word": "Welcome", "startSec": 0.0, "endSec": 0.4, "confidence": 0.99 },
        { "word": "to", "startSec": 0.4, "endSec": 0.5, "confidence": 0.99 }
      ]
    }
  ],
  "diarizedSpeakers": [
    { "label": "A", "name": "Host" },
    { "label": "B", "name": "Guest - John Doe" }
  ],
  "status": "completed"
}
```

---

### 1.6 Detect Highlight Candidates

```http
POST /v1/clips/detect

{
  "transcriptId": "trn_def456",
  "maxCandidates": 25,    // optional, default: 10
  "minDurationSec": 15,
  "maxDurationSec": 90
}
```

**Response (201):**
```json
{
  "detectionId": "det_789ghi",
  "transcriptId": "trn_def456",
  "status": "detecting",
  "estimatedCompletionSec": 120
}
```

---

### 1.7 Get Candidates

```http
GET /v1/clips/candidates/:transcriptId?limit=25&minScore=0.5
```

**Response (200):**
```json
{
  "transcriptId": "trn_def456",
  "candidates": [
    {
      "candidateId": "can_001",
      "clipIndex": 1,
      "startSec": 1250.3,
      "endSec": 1310.8,
      "durationSec": 60.5,
      "compositeScore": 0.87,
      "signals": {
        "linguistic": 0.82,
        "audio": 0.91,
        "sentiment": 0.78,
        "qa": 0.65
      },
      "primaryTopic": "fundraising-strategy",
      "speakers": ["A"],
      "summarySentence": "The most important thing in fundraising is knowing when to walk away from a bad term sheet.",
      "status": "pending",
      "transcriptExcerpt": "The most important thing in fundraising is knowing when to walk away..."
    }
  ],
  "totalCandidates": 25,
  "selectedCount": 0
}
```

Relevant query params:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 10 | Max candidates to return |
| `minScore` | float | 0.0 | Minimum composite score filter |
| `status` | string | "pending" | Filter by candidate status |
| `topic` | string | — | Filter by primary topic |
| `sortBy` | string | "score" | Sort order (score, start, duration) |

---

### 1.8 Generate Clips

```http
POST /v1/clips/generate

{
  "sourceId": "src_abc123",
  "candidateIds": ["can_001", "can_002", "can_003"],
  "platforms": ["tiktok", "reels", "youtube_shorts", "x", "linkedin"],
  "hooksPerClip": 3,
  "durationMin": 15,
  "durationMax": 90,
  "brandProfileId": "bp_abc123",
  "autoExport": false
}
```

**Variation — Auto-generate from source (skip manual candidate selection):**
```http
POST /v1/clips/generate/all

{
  "sourceId": "src_abc123",
  "autoSelectCount": 10,
  "platforms": ["tiktok", "reels", "x"],
  "hooksPerClip": 3,
  "durationMin": 15,
  "durationMax": 60,
  "brandProfileId": "bp_abc123",
  "autoExport": false
}
```

**Response (201):**
```json
{
  "batchId": "batch_xyz",
  "sourceId": "src_abc123",
  "status": "queued",
  "totalClipsRequested": 3,
  "platforms": ["tiktok", "reels", "youtube_shorts", "x", "linkedin"],
  "estimatedCostUsd": 0.35,
  "estimatedCompletionSec": 180,
  "createdAt": "2025-06-06T12:05:00Z"
}
```

---

### 1.9 Get Batch Status

```http
GET /v1/batches/:batchId
```

**Response (200):**
```json
{
  "batchId": "batch_xyz",
  "sourceId": "src_abc123",
  "totalClipsRequested": 3,
  "totalClipsGenerated": 3,
  "platforms": ["tiktok", "reels", "x"],
  "status": "reviewing",
  "progressPct": 80,
  "currentStage": "rendering",
  "totalCostUsd": 0.42,
  "aiTokensUsed": 15000,
  "processingDurationSec": 145,
  "clips": [
    { "clipId": "clip_001", "title": "The Walking Away Strategy", "status": "draft", "durationSec": 60 },
    { "clipId": "clip_002", "title": "Why VCs Ghost You", "status": "draft", "durationSec": 45 },
    { "clipId": "clip_003", "title": "Term Sheet Red Flags", "status": "rendering", "durationSec": 75 }
  ],
  "createdAt": "2025-06-06T12:05:00Z",
  "completedAt": null
}
```

---

### 1.10 Get Clip

```http
GET /v1/clips/:clipId
```

**Response (200):**
```json
{
  "clipId": "clip_001",
  "sourceId": "src_abc123",
  "batchId": "batch_xyz",
  "userRating": null,
  "title": "The Walking Away Strategy",
  "startSec": 1250.3,
  "endSec": 1310.8,
  "durationSec": 60.5,
  "compositeScore": 0.87,
  "hooks": {
    "curiosity": "The 1 question that got the founder a $50M check 🚀",
    "contrarian": "Stop optimizing your pitch deck. Do this instead.",
    "quote": "\"Fundraising is dating, not applying.\" — @founder_name",
    "list": "3 signs your startup is about to die",
    "question": "Why do VCs ghost you after meeting?"
  },
  "captions": {
    "primary": "Most founders obsess over their pitch deck. But the real secret? Knowing when to walk away. Here's the framework that landed a $50M round.",
    "secondary": "Pitch decks don't close rounds. Walking away does."
  },
  "hashtags": {
    "core": ["#venturecapital", "#fundraising", "#startup"],
    "niche": ["#founderadvice", "#saastips", "#pitchdeck"],
    "brand": ["#shaddai", "#thestartupshow"]
  },
  "platformAssets": {
    "tiktok": {
      "videoUrl": "https://storage.shaddai.ai/clips/clip_001/tiktok.mp4?expires=...&signature=...",
      "caption": "The 1 question that got the founder a $50M check 🚀",
      "hashtagString": "#venturecapital #fundraising #startup #founderadvice #shaddai",
      "durationSec": 60,
      "resolution": "1080x1920"
    },
    "reels": {
      "videoUrl": "https://storage.shaddai.ai/clips/clip_001/reels.mp4?expires=...&signature=...",
      "caption": "Stop optimizing your pitch deck. Do this instead.",
      "durationSec": 60,
      "resolution": "1080x1920"
    },
    "x": {
      "videoUrl": "https://storage.shaddai.ai/clips/clip_001/x.mp4?expires=...&signature=...",
      "thread": [
        { "tweetNumber": 1, "text": "The most important thing in fundraising is knowing when to walk away." },
        { "tweetNumber": 2, "text": "Here's why: VCs smell desperation. When you're willing to walk, you have leverage." },
        { "tweetNumber": 3, "text": "3 signs it's time to walk: 1) Undefined terms, 2) Endless diligence, 3) They ask you to 'prove it' without committing." },
        { "tweetNumber": 4, "text": "Full breakdown in the clip ⬆️" }
      ]
    },
    "linkedin": {
      "postBody": "The fundraising secret nobody talks about: knowing when to walk away.\n\nI sat down with a founder who raised $50M and the #1 piece of advice? Stop optimizing your pitch deck and start optimizing your BATNA.\n\nHere's the framework:\n\n1. Always have a walk-away number\n2. Never let them see you need the money\n3. The best deal is the one you're willing to lose\n\nFull conversation in the comments 👇",
      "videoUrl": "https://storage.shaddai.ai/clips/clip_001/linkedin.mp4"
    }
  },
  "status": "draft",
  "brandProfileId": "bp_abc123",
  "createdAt": "2025-06-06T12:07:00Z"
}
```

---

### 1.11 Update / Approve Clip

```http
PUT /v1/clips/:clipId

{
  "title": "Edited title for this clip",
  "status": "approved",  // or "draft", "archived"
  "hooks": {
    "curiosity": "Custom hook override"
  },
  "captions": {
    "primary": "Custom primary caption"
  }
}
```

**Response (200):**
```json
{
  "clipId": "clip_001",
  "status": "approved",
  "updatedAt": "2025-06-06T12:10:00Z"
}
```

Partial updates supported — only included fields are changed.

---

### 1.12 Batch Approve Clips

```http
POST /v1/clips/batch-approve

{
  "clipIds": ["clip_001", "clip_002", "clip_003"],
  "exportAfterApprove": true
}
```

**Response (200):**
```json
{
  "approved": 3,
  "failed": 0,
  "exportQueued": 3
}
```

---

### 1.13 Export Clip

```http
POST /v1/clips/:clipId/export

{
  "platforms": ["tiktok", "x", "linkedin"] // specific platforms, or all
}
```

**Response (202):**
```json
{
  "clipId": "clip_001",
  "exports": [
    { "platform": "tiktok", "status": "exporting" },
    { "platform": "x", "status": "publishing" },
    { "platform": "linkedin", "status": "queued" }
  ],
  "totalExports": 3
}
```

---

### 1.14 Brand Profiles CRUD

```http
POST /v1/brand-profiles
Content-Type: application/json

{
  "name": "Startup Show Voice",
  "toneVoice": "educational",
  "targetAudience": "Early-stage founders raising seed to Series A",
  "keyMessaging": [
    "Fundraising is relationship-driven, not transaction-driven",
    "Founders should focus on traction over pitch decks",
    "Know your numbers cold"
  ],
  "brandHashtags": ["#shaddai", "#thestartupshow"],
  "avoidTopics": ["politics", "religion", "get-rich-quick schemes"],
  "styleNotes": "Keep it actionable. Use storytelling. Avoid buzzwords like 'synergy' or 'disrupt'.",
  "toneFormalLevel": 0.3,
  "toneEmotionLevel": 0.6,
  "sampleHooks": [
    "The one metric that matters more than revenue",
    "Why your board is wrong about growth",
    "The question that separates unicorns from zombies"
  ]
}
```

```http
GET /v1/brand-profiles
GET /v1/brand-profiles/:profileId
PUT /v1/brand-profiles/:profileId
DELETE /v1/brand-profiles/:profileId
```

---

## 2. WebSocket Events

Connect: `wss://api.shaddai.ai/clips/v1/ws?token=<jwt>`

### Server → Client Events

```json
// Progress update (every ~5 seconds during processing)
{
  "type": "clip.progress",
  "data": {
    "batchId": "batch_xyz",
    "stage": "generating",
    "progressPct": 45,
    "estimatedRemainingSec": 120,
    "currentClip": 2,
    "totalClips": 3
  }
}

// Candidates ready for review
{
  "type": "clip.candidates",
  "data": {
    "transcriptId": "trn_def456",
    "totalCandidates": 25,
    "readyAt": "2025-06-06T12:04:30Z"
  }
}

// Generation complete
{
  "type": "clip.generated",
  "data": {
    "batchId": "batch_xyz",
    "clipsGenerated": 3,
    "totalCostUsd": 0.42,
    "completedAt": "2025-06-06T12:08:00Z"
  }
}

// Export complete
{
  "type": "clip.exported",
  "data": {
    "clipId": "clip_001",
    "platform": "tiktok",
    "externalUrl": "https://tiktok.com/@user/video/123456",
    "publishedAt": "2025-06-06T12:15:00Z"
  }
}

// Error event
{
  "type": "clip.error",
  "data": {
    "batchId": "batch_xyz",
    "stage": "rendering",
    "errorCode": "RENDER_FAILED",
    "errorMessage": "FFmpeg encountered a codec mismatch in source stream 0:1",
    "retryable": true
  }
}
```

### Client → Server Events

```json
// Subscribe to batch updates
{ "type": "subscribe", "data": { "batchId": "batch_xyz" } }

// Unsubscribe
{ "type": "unsubscribe", "data": { "batchId": "batch_xyz" } }

// Ping (keepalive)
{ "type": "ping" }
```

Server responds to ping with: `{ "type": "pong" }`

---

## 3. Internal API (SHADDAI Module Integration)

These endpoints are not exposed to end users — they're used by other SHADDAI microservices.

### 3.1 Billing / Usage Metering

```http
POST /internal/usage/record
Authorization: Internal-Service-Token <shared-secret>

{
  "userId": "usr_abc",
  "teamId": "team_xyz",
  "operation": "transcribe",
  "units": { "audioMinutes": 60.0 },
  "costUsd": 0.15,
  "metadata": {
    "sourceId": "src_abc123",
    "model": "deepgram/nova-2"
  }
}
```

### 3.2 Quota Check

```http
GET /internal/users/:userId/quota
Authorization: Internal-Service-Token <shared-secret>
```

**Response:**
```json
{
  "userId": "usr_abc",
  "tier": "pro",
  "limits": {
    "maxFileSizeBytes": 5000000000,
    "maxDurationSec": 10800,
    "maxClipsPerBatch": 25,
    "concurrentJobs": 5,
    "platforms": ["tiktok", "reels", "youtube_shorts", "x", "linkedin"],
    "brandProfiles": 10
  },
  "currentUsage": {
    "activeJobs": 2,
    "storageUsedBytes": 12500000000,
    "monthlyProcessingMinutes": 340
  }
}
```

### 3.3 Agent Dispatch

```http
POST /internal/agents/dispatch
Authorization: Internal-Service-Token <shared-secret>

{
  "agentType": "transcriber",
  "jobId": "batch_xyz",
  "priority": 3,
  "payload": {
    "sourceId": "src_abc123",
    "normalizedPath": "sources/src_abc123/normalized.mp4",
    "model": "deepgram/nova-2"
  },
  "webhookUrl": "http://orchestrator:3000/internal/workflows/callback"
}
```

**Response:**
```json
{
  "dispatchId": "dsp_abc",
  "status": "accepted",
  "estimatedWaitSec": 5
}
```

### 3.4 Workflow Orchestrator

```http
POST /internal/workflows/create
Authorization: Internal-Service-Token <shared-secret>

{
  "workflowType": "clip-generation",
  "initialState": "queued",
  "context": {
    "sourceId": "src_abc123",
    "userId": "usr_abc",
    "brandProfileId": "bp_abc123",
    "platforms": ["tiktok", "reels", "x"],
    "autoSelectCount": 10
  }
}
```

```http
POST /internal/workflows/:workflowId/transition
Authorization: Internal-Service-Token <shared-secret>

{
  "toState": "detecting",
  "context": {
    "transcriptId": "trn_def456"
  }
}
```

### 3.5 Storage — Presigned URLs

```http
GET /internal/storage/presigned-upload?path=sources/usr_abc/episode42.mp4&expiresIn=3600
Authorization: Internal-Service-Token <shared-secret>
```

```http
GET /internal/storage/presigned-download?path=clips/clip_001/tiktok.mp4&expiresIn=86400
Authorization: Internal-Service-Token <shared-secret>
```

**Response:**
```json
{
  "url": "https://storage.shaddai.ai/sources/usr_abc/episode42.mp4?X-Amz-Algorithm=...&X-Amz-Signature=...",
  "method": "PUT", // or "GET" for downloads
  "expiresAt": "2025-06-06T13:00:00Z"
}
```

### 3.6 Webhook Registration

```http
POST /internal/webhooks/platforms/tiktok
Authorization: Internal-Service-Token <shared-secret>

{
  "userId": "usr_abc",
  "callbackUrl": "https://api.shaddai.ai/clips/v1/webhooks/tiktok/callback",
  "events": ["video.published", "video.performance"]
}
```

---

## 4. Webhook Callbacks (From External Platforms)

### TikTok/YouTube Publish Confirmation

```http
POST /v1/webhooks/tiktok/callback
Content-Type: application/json

{
  "event": "video.published",
  "externalId": "tiktok_vid_123456",
  "externalUrl": "https://tiktok.com/@user/video/123456",
  "publishedAt": "2025-06-06T12:15:00Z",
  "metadata": {
    "clipId": "clip_001"
  }
}
```

### X/Twitter Publish Confirmation

```http
POST /v1/webhooks/x/callback
Content-Type: application/json

{
  "event": "tweet.published",
  "externalId": "tweet_123456",
  "externalUrl": "https://x.com/user/status/123456",
  "publishedAt": "2025-06-06T12:15:00Z",
  "metadata": {
    "clipId": "clip_001",
    "tweetIds": ["tweet_1", "tweet_2", "tweet_3", "tweet_4"]
  }
}
```

---

## 5. Rate Limiting

| Endpoint Group | Free | Builder | Pro | Alpha/Agency |
|----------------|------|---------|-----|-------------|
| Upload/Import | 5/day | 25/day | 100/day | 500/day |
| Generate clips | 3/day | 15/day | 50/day | 200/day |
| API calls (general) | 100/hr | 500/hr | 2000/hr | 10000/hr |
| Concurrent renders | 1 | 2 | 3 | 10 |

Rate limit headers returned on every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1717657920
```

---

## 6. Pagination

List endpoints support cursor-based pagination:

```http
GET /v1/clips?cursor=clip_050&limit=20
```

**Response:**
```json
{
  "data": [...],
  "nextCursor": "clip_070",
  "hasMore": true
}
```

---

*End of API Contracts Document v1.0*