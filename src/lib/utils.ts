import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]!}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Source statuses
    uploading: 'text-info bg-info-light',
    ingested: 'text-success bg-success-light',
    normalizing: 'text-warning bg-warning-light',
    failed: 'text-danger bg-danger-light',
    // Batch statuses
    queued: 'text-info bg-info-light',
    processing: 'text-warning bg-warning-light',
    generating: 'text-primary bg-primary-light',
    reviewing: 'text-purple bg-purple-light',
    completed: 'text-success bg-success-light',
    cancelled: 'text-muted-foreground bg-muted',
    // Clip statuses
    draft: 'text-muted-foreground bg-muted',
    approved: 'text-success bg-success-light',
    exported: 'text-success bg-success-light',
    archived: 'text-muted-foreground bg-muted',
    // Export statuses
    pending: 'text-warning bg-warning-light',
    exporting: 'text-info bg-info-light',
    published: 'text-success bg-success-light',
  }
  return colors[status] || 'text-muted-foreground bg-muted'
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    tiktok: '🎵',
    reels: '📸',
    youtube_shorts: '▶️',
    x: '🐦',
    linkedin: '💼',
    email: '✉️',
  }
  return icons[platform] || '📹'
}

export function getStageEmoji(stage: string): string {
  const emojis: Record<string, string> = {
    queued: '⏳',
    ingesting: '📥',
    transcribing: '📝',
    detecting: '🔍',
    generating: '⚡',
    rendering: '🎬',
    exporting: '📤',
    done: '✅',
    failed: '❌',
  }
  return emojis[stage] || '●'
}