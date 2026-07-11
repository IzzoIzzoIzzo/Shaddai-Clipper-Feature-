// ============================================================
// asset-manifest.ts — flatten rendered clips into the shared
// MediaAsset shape consumed by the SHADDAI dashboard gallery.
// HTTP is the source of truth; postMessage only signals "refetch".
// ============================================================

export type MediaAsset = {
  id: string
  sourceApp: 'clipper'
  ownerUserId?: string
  kind: 'clip' | 'cover'
  title: string
  status: 'ready' | 'processing' | 'error'
  thumbUrl?: string
  fileUrl: string
  previewUrl?: string
  mimeType?: string
  width?: number
  height?: number
  durationSec?: number
  createdAt: string
  tags?: string[]
  originMeta?: {
    sourceId?: string
    batchId?: string
    clipId?: string
    candidateId?: string
    platform?: string
  }
}

// Batch shape as seen from server.ts (kept local so this file has no import cycle).
interface BatchLike {
  batchId: string
  sourceId: string
  status: string
  clips: Array<{
    clipId: string
    title: string
    durationSec: number
    status: string
    platformAssets: Record<string, string>
    coverUrl?: string
    createdAt?: string
    narration?: { title?: string }
  }>
  createdAt: string
}

/**
 * Flatten all rendered clips across every batch into MediaAsset objects.
 * Only clips that have at least one platform file and are in a terminal
 * (non-error) batch are included. One MediaAsset is emitted per clip
 * (using the first platform's URL as the primary fileUrl); the cover
 * image is exposed as thumbUrl when available.
 */
export function clipsToAssets(batches: Iterable<BatchLike>): MediaAsset[] {
  const assets: MediaAsset[] = []

  for (const batch of batches) {
    // Skip batches that never finished — clips may be partially rendered.
    if (batch.status === 'failed') continue

    for (const clip of batch.clips) {
      const platformEntries = Object.entries(clip.platformAssets || {})
      if (platformEntries.length === 0) continue

      // Determine clip-level status from the batch status.
      // Batch statuses: queued | generating | reviewing | failed
      // reviewing = rendering complete (the engine word for "done")
      const clipStatus: MediaAsset['status'] =
        batch.status === 'reviewing' || batch.status === 'completed'
          ? 'ready'
          : batch.status === 'failed'
          ? 'error'
          : 'processing'

      // Use the first platform URL as the canonical fileUrl.
      const [firstPlatform, firstUrl] = platformEntries[0]!

      assets.push({
        id: clip.clipId,
        sourceApp: 'clipper',
        kind: 'clip',
        title: clip.title || 'Clip',
        status: clipStatus,
        thumbUrl: clip.coverUrl ?? undefined,
        fileUrl: firstUrl,
        previewUrl: clip.coverUrl ?? undefined,
        mimeType: 'video/mp4',
        durationSec: clip.durationSec,
        createdAt: clip.createdAt || batch.createdAt,
        tags: [firstPlatform],
        originMeta: {
          sourceId: batch.sourceId,
          batchId: batch.batchId,
          clipId: clip.clipId,
          platform: firstPlatform,
        },
      })
    }
  }

  // Newest first — mirrors the dashboard's "latest assets" gallery expectation.
  assets.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))

  return assets
}
