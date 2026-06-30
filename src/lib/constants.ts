export const API_BASE = '/api/clips/v1'
export const WS_BASE = 'wss://api.shaddai.ai/clips/v1/ws'

export const VALID_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'audio/ogg',
] as const

export const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB free tier

export const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', aspectRatio: '9:16', maxDuration: 60 },
  { id: 'reels', label: 'Instagram Reels', icon: '📸', aspectRatio: '9:16', maxDuration: 90 },
  { id: 'youtube_shorts', label: 'YouTube Shorts', icon: '▶️', aspectRatio: '9:16', maxDuration: 60 },
  { id: 'x', label: 'X / Twitter', icon: '🐦', aspectRatio: '16:9', maxDuration: 140 },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', aspectRatio: '16:9', maxDuration: 600 },
  { id: 'email', label: 'Email', icon: '✉️', aspectRatio: null, maxDuration: null },
] as const

export const HOOK_TYPES = [
  { id: 'curiosity', label: 'Curiosity Gap', icon: '🔥', color: 'text-warning' },
  { id: 'contrarian', label: 'Contrarian', icon: '⚡', color: 'text-purple' },
  { id: 'quote', label: 'Quote Punch', icon: '💬', color: 'text-info' },
  { id: 'list', label: 'Numbered List', icon: '📋', color: 'text-success' },
  { id: 'question', label: 'Question', icon: '❓', color: 'text-secondary' },
] as const

export const PIPELINE_STAGES = [
  { id: 'queued', label: 'Queued' },
  { id: 'ingesting', label: 'Ingesting' },
  { id: 'transcribing', label: 'Transcribing' },
  { id: 'detecting', label: 'Detecting' },
  { id: 'generating', label: 'Generating' },
  { id: 'rendering', label: 'Rendering' },
  { id: 'exporting', label: 'Exporting' },
  { id: 'done', label: 'Done' },
] as const

export const USER_TIERS = {
  free: { maxFileSize: 500 * 1024 * 1024, maxDuration: 1800, maxClipsPerBatch: 5, concurrentJobs: 1 },
  builder: { maxFileSize: 2 * 1024 * 1024 * 1024, maxDuration: 3600, maxClipsPerBatch: 10, concurrentJobs: 3 },
  pro: { maxFileSize: 5 * 1024 * 1024 * 1024, maxDuration: 10800, maxClipsPerBatch: 25, concurrentJobs: 5 },
  alpha: { maxFileSize: 16 * 1024 * 1024 * 1024, maxDuration: 21600, maxClipsPerBatch: 50, concurrentJobs: 20 },
} as const