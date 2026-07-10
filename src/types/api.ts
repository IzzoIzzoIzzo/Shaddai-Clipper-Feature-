// ============================================================
// API Response & Request Types — matching the API contracts
// ============================================================

// --- Sources ---
export interface Source {
  sourceId: string
  title: string
  originalFilename: string
  fileSizeBytes: number
  durationSec: number
  mimeType: string
  metadata: {
    codec: string
    resolution: string
    bitrate: number
    fps: number
    channels: number
  }
  thumbnailUrls: Record<string, string>
  status: 'uploading' | 'ingested' | 'normalizing' | 'normalized' | 'failed'
  stage?: string
  progressPct?: number
  transcriptId?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface UploadResponse {
  sourceId: string
  status: 'uploading'
  title: string
  durationSec: number
  estimatedProcessingTimeSec: number
  uploadUrl: string
  createdAt: string
}

export interface ImportRequest {
  url: string
  platform?: 'youtube' | 'vimeo' | 'rss' | 'direct'
  title?: string
}

// --- Transcripts ---
export interface Transcript {
  transcriptId: string
  sourceId: string
  modelUsed: string
  language: string
  confidence: number
  wordCount: number
  durationSec: number
  segments: TranscriptSegment[]
  diarizedSpeakers: { label: string; name?: string }[]
  status: 'processing' | 'completed' | 'failed'
}

export interface TranscriptSegment {
  id: string
  startSec: number
  endSec: number
  speaker: string
  text: string
  topics: string[]
  emotion: string
  confidence: number
  words?: { word: string; startSec: number; endSec: number; confidence: number }[]
}

// --- Clip Candidates ---
export interface ClipCandidate {
  candidateId: string
  clipIndex: number
  startSec: number
  endSec: number
  durationSec: number
  compositeScore: number
  signals: {
    linguistic: number
    audio: number
    sentiment: number
    qa: number
  }
  primaryTopic: string
  speakers: string[]
  summarySentence: string
  status: 'pending' | 'selected' | 'rejected' | 'auto_selected'
  transcriptExcerpt?: string
}

// --- Clips ---
export interface Clip {
  clipId: string
  sourceId: string
  batchId: string
  userRating: number | null
  title: string
  startSec: number
  endSec: number
  durationSec: number
  compositeScore: number
  hooks: {
    curiosity?: string
    contrarian?: string
    quote?: string
    list?: string
    question?: string
  }
  captions: {
    primary: string
    secondary: string
  }
  hashtags: {
    core: string[]
    niche: string[]
    brand: string[]
  }
  platformAssets: Record<string, PlatformAsset>
  coverUrl?: string
  status: 'draft' | 'reviewed' | 'approved' | 'exported' | 'archived'
  brandProfileId?: string
  createdAt: string
  updatedAt: string
}

export interface PlatformAsset {
  videoUrl?: string
  caption?: string
  hashtagString?: string
  durationSec?: number
  resolution?: string
  thread?: { tweetNumber: number; text: string }[]
  postBody?: string
}

// --- Generation Batches ---
export interface GenerationBatch {
  batchId: string
  sourceId: string
  totalClipsRequested: number
  totalClipsGenerated: number
  platforms: string[]
  status: BatchStatus
  progressPct: number
  currentStage: string
  totalCostUsd: number
  aiTokensUsed: number
  processingDurationSec: number | null
  clips: BatchClipSummary[]
  createdAt: string
  completedAt: string | null
}

export type BatchStatus =
  | 'queued'
  | 'processing'
  | 'generating'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface BatchClipSummary {
  clipId: string
  title: string
  status: string
  durationSec: number
}

export interface GenerateClipsRequest {
  sourceId: string
  candidateIds?: string[]
  autoSelectCount?: number
  platforms: string[]
  hooksPerClip?: number
  durationMin?: number
  durationMax?: number
  brandProfileId?: string
  autoExport?: boolean
}

export interface GenerateAllRequest {
  sourceId: string
  autoSelectCount: number
  platforms: string[]
  hooksPerClip?: number
  durationMin?: number
  durationMax?: number
  brandProfileId?: string
  autoExport?: boolean
}

// --- Brand Profiles ---
export interface BrandProfile {
  profileId: string
  name: string
  toneVoice: ToneVoice
  targetAudience: string
  keyMessaging: string[]
  brandHashtags: string[]
  avoidTopics: string[]
  styleNotes?: string
  voiceCharacteristics?: {
    formalLevel: number
    emotionLevel: number
    jargonLevel: number
    sentenceLengthPreference: string
  }
  sampleHooks: string[]
  sampleCaptions: string[]
  platformPreferences?: {
    primaryPlatform: string
    secondaryPlatforms: string[]
  }
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type ToneVoice =
  | 'professional'
  | 'casual'
  | 'humorous'
  | 'educational'
  | 'inspirational'
  | 'confrontational'
  | 'custom'

// --- Exports ---
export interface ClipExport {
  clipId: string
  platform: string
  status: 'pending' | 'exporting' | 'published' | 'failed'
  externalUrl?: string
  externalId?: string
  errorMessage?: string
  publishedAt?: string
}

// --- WebSocket Events ---
export type WSEvent =
  | { type: 'clip.progress'; data: { batchId: string; stage: string; progressPct: number; estimatedRemainingSec: number; currentClip: number; totalClips: number } }
  | { type: 'clip.candidates'; data: { transcriptId: string; totalCandidates: number; readyAt: string } }
  | { type: 'clip.generated'; data: { batchId: string; clipsGenerated: number; totalCostUsd: number; completedAt: string } }
  | { type: 'clip.exported'; data: { clipId: string; platform: string; externalUrl: string; publishedAt: string } }
  | { type: 'clip.error'; data: { batchId: string; stage: string; errorCode: string; errorMessage: string; retryable: boolean } }

// --- User Quota ---
export interface UserQuota {
  userId: string
  tier: string
  limits: {
    maxFileSizeBytes: number
    maxDurationSec: number
    maxClipsPerBatch: number
    concurrentJobs: number
    platforms: string[]
    brandProfiles: number
  }
  currentUsage: {
    activeJobs: number
    storageUsedBytes: number
    monthlyProcessingMinutes: number
  }
}