# SHADDAI Clips — Data Models & Schema

> **Document Owner:** Product Architect
> **Status:** v1.0 — Draft
> **Last Updated:** 2025-06-06

This document defines the complete data models for the SHADDAI Clips system, including PostgreSQL schemas (using Prisma ORM), validation schemas (Zod), and storage layout.

---

## 1. Entity Relationship Diagram (Textual)

```
User ──1:N──> Source
User ──1:N──> BrandProfile
User ──1:N──> GenerationBatch
User ──1:N──> Clip
User ──1:N──> PlatformConnection

Source ──1:1──> Transcript
Source ──1:N──> Clip
Source ──1:N──> GenerationBatch

Transcript ──1:N──> ClipCandidate
Transcript ──N:M──> Topic (via transcript_topics)

ClipCandidate ──1:1──> Clip (optional)

GenerationBatch ──1:N──> Clip

BrandProfile ──1:N──> Clip (applied profile)

Clip ──1:N──> ClipVersion (edits/revisions)
Clip ──1:1──> ClipExport (per platform)

Team ──1:N──> User
Team ──N:M──> BrandProfile (shared profiles)
```

---

## 2. PostgreSQL Schema (Prisma)

### 2.1 User & Team Models

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  tier      Tier     @default(FREE)

  sources          Source[]
  brandProfiles    BrandProfile[]
  generationBatches GenerationBatch[]
  clips            Clip[]
  platformConnections PlatformConnection[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Tier {
  FREE
  BUILDER
  PRO
  ALPHA
  AGENCY
}

model Team {
  id      String   @id @default(cuid())
  name    String
  slug    String   @unique

  members User[]
  brandProfiles BrandProfile[] // Shared team profiles

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model TeamMembership {
  id     String @id @default(cuid())
  userId String
  teamId String
  role   TeamRole @default(MEMBER)

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@unique([userId, teamId])
}

enum TeamRole {
  ADMIN
  MEMBER
  VIEWER
}
```

### 2.2 Source (Uploaded Content)

```prisma
model Source {
  id          String   @id @default(cuid())
  userId      String
  teamId      String?
  title       String
  originalFilename String
  fileSizeBytes BigInt
  durationSec Float
  mimeType    String

  normalizedPath String
  rawPath      String
  thumbnailUrls Json?   // { "0": "url", "25": "url", ... }

  // Metadata blob
  metadata Json? // { codec: "h264", resolution: "1920x1080", bitrate: 8000000, fps: 30, channels: 2 }

  status  SourceStatus @default(UPLOADING)
  errorMessage String?

  user     User   @relation(fields: [userId], references: [id])
  team     Team?  @relation(fields: [teamId], references: [id])

  transcript       Transcript?
  clips            Clip[]
  generationBatches GenerationBatch[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

enum SourceStatus {
  UPLOADING
  INGESTED
  NORMALIZING
  NORMALIZED
  FAILED
}
```

### 2.3 Transcript

```prisma
model Transcript {
  id         String   @id @default(cuid())
  sourceId   String   @unique
  modelUsed  String   // "deepgram/nova-2", "openai/whisper-1", "whisper.cpp"
  language   String   @default("en") // BCP-47
  confidence Float
  wordCount  Int
  durationSec Float

  // Full segments array
  segments Json // see structure below

  // Speaker mappings
  diarizedSpeakers Json? // [{ label: "A", name: "John" }, ... ]

  status  TranscriptStatus @default(PROCESSING)
  errorMessage String?

  source      Source          @relation(fields: [sourceId], references: [id])
  clipCandidates ClipCandidate[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum TranscriptStatus {
  PROCESSING
  COMPLETED
  FAILED
}
```

**Segment JSON Structure:**
```json
[
  {
    "id": "seg_001",
    "startSec": 0.0,
    "endSec": 45.2,
    "speaker": "A",
    "text": "The full transcribed text for this segment...",
    "topics": ["entrepreneurship", "fundraising"],
    "emotion": "insightful",
    "confidence": 0.94,
    "words": [
      { "word": "The", "startSec": 0.0, "endSec": 0.15, "confidence": 0.99 },
      { "word": "most", "startSec": 0.15, "endSec": 0.3, "confidence": 0.98 }
    ]
  }
]
```

### 2.4 ClipCandidate (Detection Results)

```prisma
model ClipCandidate {
  id            String  @id @default(cuid())
  transcriptId  String
  clipIndex     Int
  startSec      Float
  endSec        Float
  durationSec   Float
  compositeScore Float
  signals       Json    // { linguistic: 0.82, audio: 0.91, sentiment: 0.78, qa: 0.65 }
  primaryTopic  String
  speakers      String[] // Speaker labels
  summarySentence String
  status        CandidateStatus @default(PENDING)

  transcript Transcript @relation(fields: [transcriptId], references: [id])
  clip       Clip?

  @@index([transcriptId])
  @@index([status])
}

enum CandidateStatus {
  PENDING
  SELECTED
  REJECTED
  AUTO_SELECTED
  EXPIRED
}
```

### 2.5 GenerationBatch

```prisma
model GenerationBatch {
  id                   String   @id @default(cuid())
  userId               String
  sourceId             String
  totalClipsRequested  Int      @default(10)
  totalClipsGenerated  Int      @default(0)
  platforms            String[] // ["tiktok", "reels", "youtube_shorts", "x", "linkedin", "email"]
  hooksPerClip         Int      @default(3)
  durationMinSec       Float    @default(15)
  durationMaxSec       Float    @default(90)
  brandProfileId       String?

  status               BatchStatus @default(QUEUED)
  totalCostUsd         Decimal  @default(0) @db.Decimal(10, 6)
  aiTokensUsed         Int      @default(0)
  processingDurationSec Float?

  user   User   @relation(fields: [userId], references: [id])
  source Source @relation(fields: [sourceId], references: [id])

  clips Clip[]

  createdAt   DateTime @default(now())
  completedAt DateTime?
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

enum BatchStatus {
  QUEUED
  PROCESSING
  GENERATING
  REVIEWING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 2.6 Clip (Generated Output)

```prisma
model Clip {
  id              String  @id @default(cuid())
  sourceId        String
  generationBatchId String
  candidateId     String? @unique
  userId          String
  title           String

  startSec        Float
  endSec          Float
  durationSec     Float
  compositeScore  Float

  // Content outputs
  hooks           Json    // { curiosity: "...", contrarian: "...", list: "...", quote: "...", question: "..." }
  captions        Json    // { primary: "...", secondary: "..." }
  hashtags        Json    // { core: ["#vc", "#fundraising"], niche: ["#startupfunding"], brand: ["#shaddai"] }

  // Per-platform rendered assets
  platformAssets Json // { tiktok: { videoUrl, caption, hashtagString }, reels: {...}, x: {...}, linkedin: {...} }

  status          ClipStatus @default(DRAFT)
  brandProfileId  String?

  source          Source          @relation(fields: [sourceId], references: [id])
  batch           GenerationBatch @relation(fields: [generationBatchId], references: [id])
  candidate       ClipCandidate?  @relation(fields: [candidateId], references: [id])
  user            User            @relation(fields: [userId], references: [id])
  brandProfile    BrandProfile?   @relation(fields: [brandProfileId], references: [id])
  versions        ClipVersion[]
  exports         ClipExport[]

  userRating      Int?    // Thumbs up (1), down (-1), null (unrated)
  userFeedback    String? // Free-text edit note

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([sourceId])
  @@index([status])
  @@index([generationBatchId])
}

enum ClipStatus {
  DRAFT
  REVIEWED
  APPROVED
  EXPORTED
  ARCHIVED
}
```

### 2.7 ClipVersion (Edit History)

```prisma
model ClipVersion {
  id        String   @id @default(cuid())
  clipId    String
  version   Int
  hooks     Json?
  captions  Json?
  hashtags  Json?

  changeNote String?

  clip Clip @relation(fields: [clipId], references: [id])

  createdAt DateTime @default(now())

  @@unique([clipId, version])
  @@index([clipId])
}
```

### 2.8 ClipExport (Platform Export Record)

```prisma
model ClipExport {
  id          String   @id @default(cuid())
  clipId      String
  platform    Platform
  status      ExportStatus @default(PENDING)
  externalUrl String?
  externalId  String?

  errorMessage String?
  publishedAt  DateTime?
  performanceMetrics Json? // { views: 1500, likes: 87, shares: 12 }  (future)

  clip Clip @relation(fields: [clipId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([clipId, platform])
  @@index([clipId])
}

enum Platform {
  TIKTOK
  INSTAGRAM_REELS
  YOUTUBE_SHORTS
  X
  LINKEDIN
  EMAIL
}

enum ExportStatus {
  PENDING
  EXPORTING
  PUBLISHED
  FAILED
}
```

### 2.9 BrandProfile

```prisma
model BrandProfile {
  id        String @id @default(cuid())
  userId    String
  teamId    String?
  name      String
  toneVoice ToneVoice @default(PROFESSIONAL)
  targetAudience String
  keyMessaging   String[]
  brandHashtags  String[]
  avoidTopics    Text[]
  styleNotes     String?

  // Detailed voice characteristics
  voiceCharacteristics Json?
  // { formalLevel: 0.7, emotionLevel: 0.3, jargonLevel: 0.2, sentenceLengthPreference: "medium" }

  sampleHooks    String[]
  sampleCaptions String[]

  platformPreferences Json?
  // { primaryPlatform: "tiktok", secondaryPlatforms: ["reels", "shorts"] }

  user User  @relation(fields: [userId], references: [id])
  team Team? @relation(fields: [teamId], references: [id])
  clips Clip[]

  isDefault Boolean @default(false)
  learningEnabled Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

enum ToneVoice {
  PROFESSIONAL
  CASUAL
  HUMOROUS
  EDUCATIONAL
  INSPIRATIONAL
  CONFRONTATIONAL
  CUSTOM
}
```

### 2.10 PlatformConnection (OAuth)

```prisma
model PlatformConnection {
  id           String   @id @default(cuid())
  userId       String
  platform     Platform
  accessToken  String   // Encrypted at rest
  refreshToken String?  // Encrypted at rest
  expiresAt    DateTime?
  platformUserId String? // External platform user ID
  platformName String?  // Display name on platform

  user User @relation(fields: [userId], references: [id])

  isActive Boolean @default(true)
  lastUsedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, platform])
  @@index([userId])
}
```

### 2.11 UsageMetering (Billing)

```prisma
model UsageMetering {
  id           String   @id @default(cuid())
  userId       String
  teamId       String?
  operation    OperationType
  units        Decimal  @db.Decimal(12, 4)
  costUsd      Decimal  @db.Decimal(10, 6)
  metadata     Json?

  recordedAt DateTime @default(now())

  @@index([userId, recordedAt])
  @@index([teamId, recordedAt])
}

enum OperationType {
  TRANSCRIBE
  DETECT
  GENERATE_HOOKS
  GENERATE_CAPTIONS
  RENDER_VIDEO
  STORAGE
  EXPORT
}
```

---

## 3. Zod Validation Schemas (TypeScript Runtime)

```typescript
// Upload request validation
const uploadSchema = z.object({
  file: z.instanceof(File).refine(
    (f) => VALID_MIME_TYPES.includes(f.type),
    { message: "Unsupported file type. Supported: mp4, mov, webm, mp3, wav, m4a" }
  ).refine(
    (f) => f.size <= MAX_FILE_SIZE,
    { message: `File too large. Max: ${MAX_FILE_SIZE / 1e9}GB` }
  ),
  title: z.string().min(1).max(200).optional(),
  teamId: z.string().cuid().optional(),
});

// Import from URL
const importUrlSchema = z.object({
  url: z.string().url(),
  platform: z.enum(["youtube", "vimeo", "rss", "direct"]).optional(),
  title: z.string().min(1).max(200).optional(),
});

// Generate clips request
const generateClipsSchema = z.object({
  sourceId: z.string().cuid(),
  candidateIds: z.array(z.string().cuid()).min(1).max(50).optional(),
  // If undefined, auto-select top N candidates
  autoSelectCount: z.number().int().min(1).max(50).optional(),
  platforms: z.array(z.enum(["tiktok", "reels", "youtube_shorts", "x", "linkedin", "email"])).min(1),
  hooksPerClip: z.number().int().min(1).max(5).default(3),
  durationMin: z.number().min(5).max(30).default(15),
  durationMax: z.number().min(15).max(180).default(90),
  brandProfileId: z.string().cuid().optional(),
  autoExport: z.boolean().default(false),
});

// Brand profile create/update
const brandProfileSchema = z.object({
  name: z.string().min(1).max(100),
  toneVoice: z.enum(["professional", "casual", "humorous", "educational", "inspirational", "confrontational", "custom"]),
  targetAudience: z.string().min(1).max(1000),
  keyMessaging: z.array(z.string().min(1).max(200)).min(1).max(20),
  brandHashtags: z.array(z.string().min(1).max(50)).max(10).default([]),
  avoidTopics: z.array(z.string()).max(20).default([]),
  styleNotes: z.string().max(2000).optional(),
  toneFormalLevel: z.number().min(0).max(1).optional(),
  toneEmotionLevel: z.number().min(0).max(1).optional(),
  sampleHooks: z.array(z.string()).max(10).optional(),
});
```

---

## 4. Redis Data Structures (Job Queue)

### Queue: `clip:jobs`

```json
{
  "id": "job_abc123",
  "type": "transcribe" | "detect" | "generate" | "render",
  "batchId": "batch_xyz",
  "sourceId": "src_abc",
  "payload": {},
  "priority": 1-5,
  "attempts": 0,
  "maxAttempts": 3,
  "createdAt": 1717654321,
  "ttl": 3600
}
```

### Queue: `clip:events` (WebSocket publish)

```json
{
  "event": "clip.progress",
  "batchId": "batch_xyz",
  "stage": "generating",
  "progressPct": 45,
  "estimatedRemainingSec": 120,
  "timestamp": 1717654321
}
```

### Cache Keys

```
clip:transcript:{audio_hash}         → transcript JSON (TTL: 7d)
clip:candidates:{transcript_id}:{profile_id} → candidates JSON (TTL: 24h)
clip:render:{clip_id}:{platform}:{hash(params)} → render URL (TTL: 7d)
clip:usage:{user_id}:{date}          → usage counter (TTL: 48h)
clip:rate_limit:{user_id}            → rate counter (TTL: 1h)
```

---

## 5. Indexes & Performance Notes

| Table | Index | Purpose |
|-------|-------|---------|
| `Source` | `(user_id, status)` | Dashboard listing: "my sources" filtered by status |
| `Source` | `(created_at)` | Sort by recency |
| `Clip` | `(generation_batch_id)` | Batch detail page |
| `Clip` | `(source_id, status)` | "All clips from this source" |
| `Transcript` | `(source_id)` | Fast lookup (unique) |
| `ClipCandidate` | `(transcript_id, status)` | Candidate review page |
| `UsageMetering` | `(user_id, recorded_at)` | Billing period queries |
| `BrandProfile` | `(user_id, is_default)` | Quick default profile lookup |

---

## 6. Migration Strategy

1. **Initial schema** — Prisma migrate with core tables (Source, Transcript, ClipCandidate, Clip, GenerationBatch, BrandProfile)
2. **Phase 2** — Add PlatformConnection, ClipExport, UsageMetering
3. **Phase 3** — Add ClipVersion (version history), Team & TeamMembership
4. **Phase 4** — Add pgvector extension for clip similarity search, user feedback signals

---

*End of Data Models Document v1.0*