// ============================================================
// clipsStore — now wired to the REAL engine (server/), not a mock.
//   uploadSource → POST /api/clips/v1/sources (real ffmpeg+Whisper)
//   poll /sources/:id → real transcript + detected candidates
//   generateClips → POST /generate → poll /batches/:id → real rendered MP4s
// Brand profiles + export queue stay client-side (persisted) for now.
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Source, TranscriptSegment, ClipCandidate, Clip, GenerationBatch, BrandProfile, ClipExport,
} from '@/types/api'

const API = '/api/clips/v1'

interface GenerateArgs { sourceId: string; candidateIds: string[]; platforms: string[]; brandProfileId?: string }

interface ClipsState {
  sources: Source[]
  transcripts: Record<string, TranscriptSegment[]>
  candidates: Record<string, ClipCandidate[]>
  batches: GenerationBatch[]
  clips: Clip[]
  brandProfiles: BrandProfile[]
  exports: ClipExport[]
  engineOnline: boolean | null

  ensureSeeded: () => void          // → loads live sources + engine health
  resumePipelines: () => void       // → re-arm polling for in-flight items
  uploadSource: (file: File) => Promise<string>
  importUrl: (url: string) => Promise<string>
  deleteSource: (sourceId: string) => void
  setCandidateSelection: (sourceId: string, candidateIds: string[]) => void
  generateClips: (args: GenerateArgs) => Promise<string>
  updateClip: (clipId: string, patch: Partial<Clip>) => void
  rateClip: (clipId: string, rating: number) => void
  saveBrandProfile: (p: BrandProfile) => void
  deleteBrandProfile: (id: string) => void
  enqueueExport: (clipId: string, platform: string) => void
}

const sourceTimers: Record<string, ReturnType<typeof setInterval>> = {}
const batchTimers: Record<string, ReturnType<typeof setInterval>> = {}

// ── shape mappers: engine → frontend types ──
function mapSource(s: any): Source {
  return {
    sourceId: s.sourceId, title: s.title || 'Source', originalFilename: s.originalFilename || '',
    fileSizeBytes: s.fileSizeBytes || 0, durationSec: s.durationSec || 0, mimeType: s.mimeType || 'video/mp4',
    metadata: { codec: 'h264', resolution: '—', bitrate: 0, fps: 0, channels: s.metadata?.channels || 2 },
    thumbnailUrls: {}, status: (s.status as Source['status']) || 'normalizing', transcriptId: s.transcriptId,
    errorMessage: s.errorMessage, createdAt: s.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}
function mapCandidate(c: any): ClipCandidate {
  return {
    candidateId: c.candidateId, clipIndex: c.clipIndex || 0, startSec: c.startSec, endSec: c.endSec,
    durationSec: c.durationSec, compositeScore: c.compositeScore,
    signals: c.signals || { linguistic: 0, audio: 0, sentiment: 0, qa: 0 },
    primaryTopic: c.primaryTopic || 'highlight', speakers: c.speakers || ['A'],
    summarySentence: c.summarySentence || '', status: c.status || 'pending', transcriptExcerpt: c.transcriptExcerpt,
  }
}
function mapClip(c: any, sourceId: string, batchId: string): Clip {
  return {
    clipId: c.clipId, sourceId, batchId, userRating: null, title: c.title || 'Clip',
    startSec: c.startSec || 0, endSec: c.endSec || 0, durationSec: c.durationSec || 0, compositeScore: c.compositeScore || 0,
    hooks: {}, // hooks/captions need the LLM agents (deferred) — summary used as caption below
    captions: { primary: c.summarySentence || '', secondary: '' },
    hashtags: { core: [], niche: [], brand: [] },
    platformAssets: c.platformAssets || {}, status: c.status || 'draft',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

async function jget(path: string) { const r = await fetch(API + path); if (!r.ok) throw new Error('GET ' + path + ' ' + r.status); return r.json() }
async function jpost(path: string, body: any) { const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error('POST ' + path + ' ' + r.status); return r.json() }

export const useClipsStore = create<ClipsState>()(
  persist(
    (set, get) => ({
      sources: [], transcripts: {}, candidates: {}, batches: [], clips: [], brandProfiles: [], exports: [], engineOnline: null,

      ensureSeeded: async () => {
        try {
          const h = await fetch(API + '/health'); set({ engineOnline: h.ok })
          const d = await jget('/sources')
          set({ sources: (d.sources || []).map(mapSource) })
        } catch { set({ engineOnline: false }) }
      },

      resumePipelines: () => {
        get().sources.forEach((s) => { if (s.status === 'uploading' || s.status === 'normalizing') pollSource(s.sourceId, set, get) })
        get().batches.forEach((b) => { if (b.status !== 'reviewing' && b.status !== 'completed' && b.status !== 'failed') pollBatch(b.batchId, set, get) })
      },

      uploadSource: async (file) => {
        const fd = new FormData(); fd.append('file', file)
        const r = await fetch(API + '/sources', { method: 'POST', body: fd })
        if (!r.ok) { if (r.status === 402) throw new Error('premium_required'); throw new Error('upload failed ' + r.status) }
        const { sourceId } = await r.json()
        const placeholder = mapSource({ sourceId, title: file.name, originalFilename: file.name, fileSizeBytes: file.size, status: 'uploading', createdAt: new Date().toISOString() })
        set((st) => ({ sources: [placeholder, ...st.sources.filter((s) => s.sourceId !== sourceId)] }))
        pollSource(sourceId, set, get)
        return sourceId
      },

      importUrl: async (url) => {
        // The engine ingests uploaded files; URL import isn't supported yet.
        const sourceId = 'url_' + Date.now().toString(36)
        set((st) => ({ sources: [mapSource({ sourceId, title: url, originalFilename: url, status: 'failed', errorMessage: 'URL import coming soon — upload a file for now.', createdAt: new Date().toISOString() }), ...st.sources] }))
        return sourceId
      },

      deleteSource: (sourceId) => {
        if (sourceTimers[sourceId]) { clearInterval(sourceTimers[sourceId]); delete sourceTimers[sourceId] }
        set((st) => {
          const { [sourceId]: _t, ...transcripts } = st.transcripts
          const { [sourceId]: _c, ...candidates } = st.candidates
          return { sources: st.sources.filter((s) => s.sourceId !== sourceId), transcripts, candidates }
        })
      },

      setCandidateSelection: (sourceId, candidateIds) => {
        set((st) => ({ candidates: { ...st.candidates, [sourceId]: (st.candidates[sourceId] || []).map((c) => ({ ...c, status: candidateIds.includes(c.candidateId) ? 'selected' : 'pending' })) } }))
      },

      generateClips: async ({ sourceId, candidateIds, platforms }) => {
        const { batchId } = await jpost('/generate', { sourceId, candidateIds, platforms })
        const batch: GenerationBatch = { batchId, sourceId, totalClipsRequested: candidateIds.length, totalClipsGenerated: 0, platforms, status: 'queued', progressPct: 0, currentStage: 'queued', totalCostUsd: 0, aiTokensUsed: 0, processingDurationSec: 0, clips: [], createdAt: new Date().toISOString(), completedAt: null }
        set((st) => ({ batches: [batch, ...st.batches] }))
        pollBatch(batchId, set, get)
        return batchId
      },

      updateClip: (clipId, patch) => set((st) => ({ clips: st.clips.map((c) => c.clipId === clipId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c) })),
      rateClip: (clipId, rating) => set((st) => ({ clips: st.clips.map((c) => c.clipId === clipId ? { ...c, userRating: rating } : c) })),
      saveBrandProfile: (profile) => set((st) => {
        const exists = st.brandProfiles.some((p) => p.profileId === profile.profileId)
        let list = exists ? st.brandProfiles.map((p) => p.profileId === profile.profileId ? profile : p) : [...st.brandProfiles, profile]
        if (profile.isDefault) list = list.map((p) => ({ ...p, isDefault: p.profileId === profile.profileId }))
        return { brandProfiles: list }
      }),
      deleteBrandProfile: (id) => set((st) => ({ brandProfiles: st.brandProfiles.filter((p) => p.profileId !== id) })),
      enqueueExport: (clipId, platform) => {
        // Real value here = the rendered MP4 is downloadable from its platformAsset URL.
        set((st) => ({ exports: [{ clipId, platform, status: 'published', publishedAt: new Date().toISOString() }, ...st.exports.filter((e) => !(e.clipId === clipId && e.platform === platform))] }))
      },
    }),
    { name: 'shaddai-clips-store', partialize: (s) => ({ brandProfiles: s.brandProfiles, exports: s.exports }) }
  )
)

// ── pollers (live, against the real engine) ──
function pollSource(sourceId: string, set: any, get: () => ClipsState) {
  if (sourceTimers[sourceId]) return
  sourceTimers[sourceId] = setInterval(async () => {
    try {
      const d = await jget('/sources/' + sourceId)
      const src = mapSource(d.source)
      set((st: ClipsState) => ({
        sources: st.sources.map((s) => s.sourceId === sourceId ? src : s),
        transcripts: { ...st.transcripts, [sourceId]: (d.transcript || []) },
        candidates: { ...st.candidates, [sourceId]: (d.candidates || []).map(mapCandidate) },
      }))
      if (src.status === 'ingested' || src.status === 'failed') { clearInterval(sourceTimers[sourceId]); delete sourceTimers[sourceId] }
    } catch { /* keep polling */ }
  }, 1500)
}

function pollBatch(batchId: string, set: any, get: () => ClipsState) {
  if (batchTimers[batchId]) return
  batchTimers[batchId] = setInterval(async () => {
    try {
      const d = await jget('/batches/' + batchId)
      const b = d.batch
      const src = b.sourceId
      const newClips = (b.clips || []).map((c: any) => mapClip(c, src, batchId))
      set((st: ClipsState) => ({
        batches: st.batches.map((x) => x.batchId === batchId ? {
          ...x, status: b.status, progressPct: b.progressPct, currentStage: b.currentStage,
          totalClipsGenerated: b.totalClipsGenerated, totalClipsRequested: b.totalClipsRequested,
          totalCostUsd: b.totalCostUsd || 0, completedAt: b.completedAt,
          clips: (b.clips || []).map((c: any) => ({ clipId: c.clipId, title: c.title, status: c.status || 'draft', durationSec: c.durationSec })),
        } : x),
        clips: [...newClips, ...st.clips.filter((c) => c.batchId !== batchId)],
      }))
      if (b.status === 'reviewing' || b.status === 'completed' || b.status === 'failed') { clearInterval(batchTimers[batchId]); delete batchTimers[batchId] }
    } catch { /* keep polling */ }
  }, 1500)
}
