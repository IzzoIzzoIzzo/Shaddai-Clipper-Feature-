# SHADDAI Clips — Frontend Technology Research & Recommendations

> **Document Owner:** Frontend Engineer
> **Status:** v1.0 — Research Complete
> **Date:** 2025-06-06

---

## 1. Framework Choice

### Recommendation: **Vite + React 19 + TypeScript 5**

After evaluating three approaches, here's the analysis:

| Criterion | Vite + React | Next.js (App Router) | Other (Svelte, Vue) |
|-----------|-------------|---------------------|---------------------|
| **SHADDAI compatibility** | ✅ React-based, matches existing dashboard | ✅ React-based but heavier | ❌ Different framework = maintenance burden |
| **Dev memory footprint** | ~200-300MB | ~500-800MB (Node server + build) | Varies |
| **Bundle size (initial)** | ~80-120KB gzipped | ~100-150KB gzipped (server components help) | Similar |
| **Build speed** | ~2-3s cold start | ~10-20s cold start | Depends |
| **HMR speed** | Instant (< 50ms) | ~200-500ms (slower with many routes) | Varies |
| **File-based routing** | Via plugin (vite-plugin-pages) | Built-in | Varies |
| **SSR/SSG need?** | No — this is a dashboard tool | Overkill — dashboard is client-side | N/A |
| **Server actions need?** | No — all API calls go to backend | Overhead we don't need | N/A |
| **Learning curve** | Low (team knows React) | Medium (App Router quirks) | High (new framework) |

**Why not Next.js:**
- SHADDAI Clips is an authenticated dashboard tool, not a public-facing content site
- No SSR benefit for a dashboard (SEO irrelevant, users are logged in)
- Next.js server actions duplicate the backend API (which already exists)
- Build tooling conflicts with existing SHADDAI bundler config
- Memory budget: Next.js dev server uses significantly more RAM

**Why Vite specifically:**
- Native ESM with fast HMR via esbuild
- Tree-shaking built-in via Rollup
- `vite-plugin-pages` for file-based routing (optional but nice)
- `vite-plugin-svgr` for SVG imports as React components
- TypeScript support out of the box
- Smaller `node_modules` footprint

**Why React 19 specifically:**
- `use()` hook simplifies promise-based data loading
- Server components not used (dashboard is client-side), but `use()` is available client-side
- `useOptimistic()` for optimistic UI updates on approve/export
- `useActionState()` for form submissions (upload, brand profile forms)
- Better hydration error handling

### Key Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0"
  }
}
```

---

## 2. Component Architecture

### 2.1 Component Tree

```
App
├── ShaddaiLayout (reuse existing dashboard shell)
│   ├── Sidebar
│   │   ├── NavItem("Dashboard")
│   │   ├── NavSection("Clips")
│   │   │   ├── NavItem("Sources")
│   │   │   ├── NavItem("My Clips")
│   │   │   ├── NavItem("Export Queue")
│   │   │   └── NavItem("Brand Profiles")
│   │   └── NavItem("Settings")
│   ├── TopBar (breadcrumbs, user menu, tier badge)
│   └── <Outlet/> (route content)
│
├── Routes:
│   ├── DashboardPage
│   │   ├── QuickUploadWidget (mini dropzone)
│   │   ├── RecentSourcesList
│   │   ├── RecentBatchesList
│   │   └── UsageWidget ("12/50 clips this month")
│   │
│   ├── UploadPage
│   │   ├── FileDropzone (drag-and-drop + click)
│   │   │   ├── FileTypeValidator
│   │   │   ├── FileSizeIndicator
│   │   │   └── UploadProgressBar
│   │   ├── ImportUrlForm
│   │   │   ├── UrlInput
│   │   │   └── PlatformSelector
│   │   └── RecentUploadsList
│   │
│   ├── SourceDetailPage
│   │   ├── SourceMetadata
│   │   │   ├── ThumbnailGallery
│   │   │   ├── DurationBadge
│   │   │   ├── FileInfoTable
│   │   │   └── StatusBadge
│   │   ├── TranscriptTimeline
│   │   │   ├── AudioWaveform (interactive)
│   │   │   ├── SegmentList
│   │   │   │   └── TranscriptSegment (speaker, text, time, score)
│   │   │   └── ClipBoundaryMarkers
│   │   └── ActionBar
│   │       ├── DetectClipsButton
│   │       └── ViewCandidatesButton
│   │
│   ├── CandidateReviewPage
│   │   ├── CandidateFilters (sort, score, topic, speaker)
│   │   ├── CandidateGrid
│   │   │   └── ClipCandidateCard
│   │   │       ├── ScoreBadge
│   │   │       ├── SummarySentence
│   │   │       ├── SpeakerTags
│   │   │       ├── TopicTags
│   │   │       ├── DurationLabel
│   │   │       ├── SignalBars (linguistic, audio, sentiment, QA)
│   │   │       └── SelectionCheckbox
│   │   ├── GenerationConfigPanel
│   │   │   ├── PlatformSelector (multi-select)
│   │   │   ├── HooksPerClipSlider (1-5)
│   │   │   ├── DurationRangeSlider (15-90s)
│   │   │   └── BrandProfileSelector
│   │   └── GenerateButton
│   │
│   ├── BatchProgressPage
│   │   ├── PipelineProgressBar
│   │   │   ├── StageIndicator("Ingest ✓")
│   │   │   ├── StageIndicator("Transcribe ✓")
│   │   │   ├── StageIndicator("Detect ✓")
│   │   │   ├── StageIndicator("Generate ●")
│   │   │   ├── StageIndicator("Render ○")
│   │   │   └── StageIndicator("Export ○")
│   │   ├── ProgressDetails
│   │   │   ├── ProgressPercent
│   │   │   └── EstimatedTimeRemaining
│   │   └── BatchClipList
│   │       └── BatchClipCard (status, title, duration)
│   │
│   ├── ClipEditorPage
│   │   ├── VideoPreviewPane
│   │   │   ├── VideoPlayer (HTML5 + trim handles)
│   │   │   └── ClockRangeSlider
│   │   ├── ContentEditorPane
│   │   │   ├── HookSelector
│   │   │   │   └── HookCard (5 variants: curiosity, contrarian, quote, list, question)
│   │   │   │       ├── EditableText
│   │   │   │       ├── SelectButton
│   │   │   │       └── ThumbsUp/Down
│   │   │   ├── CaptionEditor
│   │   │   │   ├── PrimaryCaptionTextarea
│   │   │   │   └── SecondaryCaptionTextarea
│   │   │   ├── HashtagEditor
│   │   │   │   ├── CoreHashtags (tag pills)
│   │   │   │   ├── NicheHashtags (tag pills)
│   │   │   │   └── BrandHashtags (tag pills)
│   │   │   └── PlatformVariantGrid
│   │   │       └── PlatformTab (TikTok, Reels, Shorts, X, LinkedIn, Email)
│   │   │           └── PlatformPreviewFrame
│   │   │               ├── PhoneMockup (9:16)
│   │   │               ├── DesktopMockup (16:9)
│   │   │               └── CaptionPreview
│   │   └── ClipActions
│   │       ├── SaveDraftButton
│   │       ├── ApproveButton
│   │       └── ExportButton (with platform dropdown)
│   │
│   ├── ExportQueuePage
│   │   ├── ExportFilters (platform, status, date)
│   │   ├── ExportList
│   │   │   └── ExportQueueItem
│   │   │       ├── PlatformIcon
│   │   │       ├── StatusBadge (pending/exporting/published/failed)
│   │   │       ├── ExternalLink (when published)
│   │   │       ├── RetryButton (on failure)
│   │   │       └── CancelButton
│   │   └── BulkActions
│   │
│   ├── BrandProfilesPage
│   │   ├── ProfileList
│   │   │   └── BrandProfileCard
│   │   │       ├── Name
│   │   │       ├── ToneVoiceBadge
│   │   │       ├── TargetAudience
│   │   │       ├── DefaultBadge
│   │   │       ├── EditButton
│   │   │       └── DeleteButton
│   │   └── CreateProfileButton
│   │
│   └── BrandProfileEditorPage
│       ├── ToneVoiceSelector
│       ├── KeyMessagingList
│       ├── BrandHashtagsEditor
│       ├── AvoidTopicsEditor
│       ├── StyleNotesTextarea
│       ├── SampleHooksList
│       └── SaveButton
│
└── Global
    ├── RealtimeToast (WebSocket-driven notifications)
    ├── UpgradeModal (tier limit reached)
    └── ConfirmDialog (destructive actions)
```

### 2.2 Component Architecture Principles

1. **Composition over configuration** — Small, focused components composed in pages
2. **Colocation** — Components live close to their routes
3. **Server state separation** — Components fetch their own data via hooks, not props drilling
4. **Progressive disclosure** — Complex features like the clip editor reveal panels step by step
5. **Optimistic UI** — Approve/reject actions show immediate feedback, roll back on error

---

## 3. Video Preview Strategy

### Recommendation: **Native HTML5 Video API + Custom Controls**

After evaluating options:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Native HTML5 `<video>`** | Zero deps, universal support, memory-light, works in all browsers | Limited styling, no built-in trim | ✅ Primary — wrap in custom React component |
| **video.js** | Plugin ecosystem, skinning, HLS/DASH support | Heavy (300KB+), overkill for simple previews | ❌ Too heavy for our use case |
| **Plyr** | Clean UI, lightweight (~50KB) | No trim support, limited API | ⚠️ Consider for player UI only |
| **react-player** | Simple API, many sources | Abstraction layer — bugs when customizing | ❌ We need direct HTML5 API access for trim |
| **ffprobe.wasm** | Client-side duration/codec check | Slow, large WASM binary (~10MB) | ❌ Use backend ffprobe instead |

### Implementation Plan

```typescript
// src/components/clip-editor/VideoPlayer.tsx
// Custom video player with:
// 1. Standard playback controls (play/pause, volume, fullscreen)
// 2. Clip boundary indicators (start/end markers on seek bar)
// 3. Trim handle drag for adjusting clip range
// 4. Time display (current / duration)
// 5. Caption overlay (SRT burn-in simulation)
// 6. Aspect ratio letterbox (pillarbox for vertical, or crop guide overlay)

interface VideoPlayerProps {
  src: string;              // Presigned URL
  startSec: number;         // Clip start boundary
  endSec: number;           // Clip end boundary
  platform?: Platform;      // Affects aspect ratio overlay
  onTrimChange?: (start: number, end: number) => void;
  onTimeUpdate?: (time: number) => void;
}
```

**Trim UX Pattern** (inspired by OpusClip):
- Two handles on the seek bar (left = start, right = end)
- Handles snap to word-level timestamps from transcript
- Grayed-out regions outside clip range
- Drag handles or nudge with arrow keys
- Minimum clip duration enforced (configurable, default 15s)
- Visual preview of duration at top

**Performance considerations:**
- Lazy load video player component (only mounts on ClipEditorPage)
- Use `preload="metadata"` to avoid loading entire video
- H.264 encoded clips ensure broad browser compatibility
- Fallback poster image for unsupported codecs
- Memory: close video source when navigating away from editor

### Platform Preview Mockups

Rather than rendering actual video per platform (which would require N renders), use a **video frame + device mockup** approach:

```
┌─────────────────────┐
│  Device Mockup      │
│  ┌───────────────┐  │
│  │  Status bar   │  │
│  │  ───────────  │  │
│  │               │  │
│  │  [Video frame │  │
│  │   at current  │  │
│  │   time]       │  │
│  │               │  │
│  │  ───────────  │  │
│  │  Caption text │  │
│  │  overlay      │  │
│  └───────────────┘  │
│  Caption: "..."      │
└─────────────────────┘
```

- Phone mockup: CSS-styled phone frame with rounded corners, notch
- Desktop mockup: 16:9 letterbox frame
- The actual video plays in both, but shown at platform-specific aspect ratio
- Overlay style changes per platform (TikTok: bold text top 1/3, Reels: centered, LinkedIn: standard)

---

## 4. State Management

### 4.1 Three-Layer Approach

```
┌───────────────────────────────────────────────────────┐
│ Layer 1: Server State (TanStack Query v5)              │
│ - Source list & detail                                 │
│ - Transcript data + segments                           │
│ - Clip candidates                                      │
│ - Generated clips (hooks, captions, platform assets)   │
│ - Batch status + progress                              │
│ - Export queue                                         │
│ - Brand profiles                                       │
│ - User quota/tier                                      │
│                                                        │
│ Features: caching, stale-while-revalidate, optimistic   │
│ updates, pagination, auto-refetch, mutation lifecycle   │
├───────────────────────────────────────────────────────┤
│ Layer 2: Client UI State (Zustand)                     │
│ - Upload progress (file → presigned URL → ingested)    │
│ - Candidate selection (array of selected IDs)          │
│ - Editor dirty flags (unsaved changes tracking)        │
│ - Active edit clip ID                                  │
│ - Toast notifications                                  │
│ - Sidebar collapsed state                              │
├───────────────────────────────────────────────────────┤
│ Layer 3: WebSocket State (Zustand + native WS)         │
│ - Connection status (connected/reconnecting/disconnected)│
│ - Batch progress (live updates)                        │
│ - Latest events (for toast triggers)                   │
│ - Reconnect attempts                                   │
└───────────────────────────────────────────────────────┘
```

### 4.2 Key Hooks Structure

```typescript
// src/hooks/useSources.ts
function useSources(filters: SourceFilters)       // GET /v1/sources list
function useSource(id: string)                     // GET /v1/sources/:id
function useUploadSource()                         // POST /v1/sources/upload (mutation)
function useImportSource()                         // POST /v1/sources/import (mutation)

// src/hooks/useCandidates.ts
function useCandidates(transcriptId: string)       // GET /v1/clips/candidates/:transcriptId
function useDetectClips()                          // POST /v1/clips/detect (mutation)

// src/hooks/useClips.ts
function useClip(id: string)                       // GET /v1/clips/:id
function useUpdateClip()                           // PUT /v1/clips/:id (mutation)
function useBatchApprove()                         // POST /v1/clips/batch-approve (mutation)
function useGenerateClips()                        // POST /v1/clips/generate (mutation)
function useGenerateAllClips()                     // POST /v1/clips/generate/all (mutation)

// src/hooks/useBatches.ts
function useBatch(id: string)                      // GET /v1/batches/:id
function useBatches(filters: BatchFilters)         // GET /v1/batches list

// src/hooks/useExports.ts
function useExportClip()                           // POST /v1/clips/:id/export (mutation)

// src/hooks/useBrandProfiles.ts
function useBrandProfiles()                        // GET /v1/brand-profiles
function useCreateBrandProfile()                   // POST /v1/brand-profiles (mutation)
function useUpdateBrandProfile()                   // PUT /v1/brand-profiles/:id (mutation)

// src/hooks/useWebSocket.ts
function useWebSocket(token: string)               // Manages WS connect/disconnect/reconnect
```

### 4.3 WebSocket Event → Store → UI Flow

```
WS Event: clip.progress
  ↓
wsStore.updateBatchProgress(batchId, { stage, progressPct, estimatedRemainingSec })
  ↓
BatchProgressPage renders via Zustand selector
  ↓
Also invalidates TanStack Query: queryClient.invalidateQueries({ queryKey: ['batches', batchId] })

WS Event: clip.candidates
  ↓
Show toast: "25 clip candidates ready for review"
  ↓
Invalidate: queryClient.invalidateQueries({ queryKey: ['candidates', transcriptId] })

WS Event: clip.generated
  ↓
Show toast: "3 clips generated! Ready for review"
  ↓
Invalidate: ['clips', 'batch', batchId], ['batches', batchId]

WS Event: clip.exported
  ↓
Show toast: "Published to TikTok!"
  ↓
Invalidate: ['exports'], ['clips', 'detail', clipId]

WS Event: clip.error
  ↓
Show error toast with stage name and retry button
  ↓
Mark affected batch/clip with error state
```

---

## 5. API Integration Pattern

### 5.1 Architecture

```
Browser (React)
   │
   ├── REST (TanStack Query) ───→ https://api.shaddai.ai/clips/v1/...
   │                              Authorization: Bearer <jwt>
   │                              Idempotency: X-Request-Id
   │
   ├── WebSocket ───────────────→ wss://api.shaddai.ai/clips/v1/ws?token=<jwt>
   │                              Subscribe: { type: "subscribe", data: { batchId } }
   │                              Events: progress, candidates, generated, exported, error
   │
   └── Presigned URL Upload ────→ https://storage.shaddai.ai/sources/...
                                   Direct PUT upload (no API proxy)
```

### 5.2 REST Client Setup

```typescript
// src/api/client.ts
const API_BASE = 'https://api.shaddai.ai/clips/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // Build URL with query params
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)));
    url += `?${searchParams.toString()}`;
  }
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      'X-Request-Id': crypto.randomUUID(),
      ...fetchOptions.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.error?.code, error.error?.message);
  }
  
  return response.json();
}
```

### 5.3 Upload Pattern (Presigned URL)

Uploads use a 3-step pattern to avoid large file proxying through our API server:

```
1. POST /v1/sources/upload (multipart: file metadata only)
   ← { sourceId, uploadUrl (presigned), status: "uploading" }

2. PUT {uploadUrl} (binary file, direct to storage)
   ← 200 OK

3. GET /v1/sources/:sourceId (poll until status = "ingested" or "failed")
   ← { sourceId, status: "ingested", ... }
```

On the frontend, step 2 uses `XMLHttpRequest` (not `fetch`) for `upload.onprogress` events:

```typescript
function uploadFile(file: File, uploadUrl: string, onProgress: (pct: number) => void) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    
    xhr.onload = () => xhr.status === 200 ? resolve(xhr.response) : reject(xhr.statusText);
    xhr.onerror = () => reject('Upload failed');
    xhr.send(file);
  });
}
```

### 5.4 Polling vs WebSocket

| Scenario | Mechanism | Rationale |
|----------|-----------|-----------|
| **Upload progress** | XHR `upload.onprogress` | Real data from browser API, no server roundtrip |
| **Source ingestion status** | Polling (3s interval, max 30s) | Short operation, simple fallback |
| **Transcription progress** | WebSocket `clip.progress` | Long operation (1-5 min), WS saves polling |
| **Candidate detection** | WebSocket `clip.candidates` | Event-driven, immediate notification |
| **Clip generation** | WebSocket `clip.progress` | Longest operation (3-10 min), live updates |
| **Export status** | WebSocket `clip.exported` + polling fallback | Event-driven with retry safety |
| **Batch list** | REST (TanStack Query, refetch on focus) | Cheap endpoint, user returns to page |

### 5.5 Optimistic Updates

Key mutations that benefit from optimistic updates:

```typescript
// Approve clip — show immediately, revert on error
useMutation({
  mutationFn: (clipId: string) => apiClient(`/v1/clips/${clipId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'approved' }),
  }),
  onMutate: async (clipId) => {
    await queryClient.cancelQueries({ queryKey: ['clips', 'detail', clipId] });
    const previous = queryClient.getQueryData(['clips', 'detail', clipId]);
    queryClient.setQueryData(['clips', 'detail', clipId], (old: Clip) => ({
      ...old, status: 'approved' as const,
    }));
    return { previous };
  },
  onError: (err, clipId, context) => {
    queryClient.setQueryData(['clips', 'detail', clipId], context?.previous);
    addToast({ type: 'error', message: 'Failed to approve clip' });
  },
});

// Select candidate — toggle immediately
// Reject candidate — hide immediately with undo toast
```

---

## 6. Dashboard Integration

### 6.1 Layout Integration

SHADDAI Clips will **not** build its own shell layout. Instead it will:

1. **Detect the SHADDAI dashboard shell** via a provided `<ShaddaiShell>` context
2. **Inject itself as a child route** under `/clips/*`
3. **Use shared CSS variables** for theming consistency

```typescript
// In the SHADDAI dashboard router:
{
  path: '/clips',
  element: <ShaddaiShell>  // Provides sidebar, topbar, etc.
    <ClipsLayout />        // May add clip-specific sub-nav
  </ShaddaiShell>,
  children: [
    { index: <ClipsDashboardPage /> },
    { path: 'upload', <UploadPage /> },
    { path: 'sources/:sourceId', <SourceDetailPage /> },
    // ... etc
  ],
}
```

### 6.2 Nav Integration

New items to add to SHADDAI's sidebar navigation:

```
📊 Overview          (existing)
📹 Clips             (NEW — collapsible section)
  ├── 📁 Sources
  ├── 🎬 My Clips
  ├── 📤 Export Queue
  └── 🏷️ Brand Profiles
🤖 Agents            (existing)
⚙️ Settings          (existing)
```

### 6.3 Theming Integration

Use CSS custom properties from SHADDAI's design system:

```css
/* SHADDAI theme variables (consumed by our components) */
:root {
  --color-primary: var(--shaddai-primary, #6366f1);
  --color-primary-foreground: var(--shaddai-primary-foreground, #ffffff);
  --color-muted: var(--shaddai-muted, #f1f5f9);
  --color-muted-foreground: var(--shaddai-muted-foreground, #64748b);
  --color-border: var(--shaddai-border, #e2e8f0);
  --color-background: var(--shaddai-background, #ffffff);
  --color-foreground: var(--shaddai-foreground, #0f172a);
  --radius: var(--shaddai-radius, 0.5rem);
  --font-sans: var(--shaddai-font-sans, 'Inter', sans-serif);
  /* ... etc */
}
```

### 6.4 Embedded Dashboard Widgets

The main SHADDAI dashboard can embed clip-specific widgets:

```
┌─────────────────────────────────────────────────────┐
│  📹 Quick Clip Generation                           │
│  ┌─────────────────────────────────────────────────┐│
│  │  Drop your video here or paste a URL            ││
│  │                                                 ││
│  │  [Choose File]  or  [Paste YouTube Link ▸]      ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  📊 Clip Usage                                       │
│  You've used 12 of 50 clips this month              │
│  ████████████░░░░░░░░░░░░░░░░░░░░  24%              │
│  [Upgrade to Pro ▸]                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🆕 Recent Activity                                  │
│  • ✅ 3 clips ready for review (2 min ago)          │
│  • 📤 Published to TikTok (15 min ago)              │
│  • 📁 "Podcast Ep.42" ingested (1 hour ago)         │
└─────────────────────────────────────────────────────┘
```

---

## 7. UX Patterns — Competitive Research

### 7.1 Opus Clip (opus.pro)

**Market position:** #1 AI clip generator. 16M+ users. Focuses on YouTube → Shorts pipeline.

**Key UX patterns observed:**
- **URL-first upload**: Prominent textbox for "Video link" (YouTube URL) + file upload as secondary
- **Carousel showcase**: Rotating examples showing "1 video → 10 clips" transformation
- **ClipAnything**: Click on transcript text to create a clip (direct transcript → clip mapping)
- **ReframeAnything**: Auto-reframe for different aspect ratios
- **Brand templates**: Pre-built templates for consistent styling
- **Team workspace**: Collaborative clip review
- **Tiered feature reveal**: "New Agent Opus" highlighted as premium feature

**What to steal:**
1. **URL + upload dual input** — Accept both file upload AND YouTube/Vimeo/RSS links
2. **Transcript-click clipping** — Click any transcript segment to create a clip instantly
3. **Score badges** — Visual highlight scores (87%) on candidate cards
4. **Carousel demos** — Show the transformation in onboarding

**What to avoid:**
5. Too much hero animation on landing page (we're a dashboard, not a marketing site)
6. Single-platform focus (we need multi-platform from day 1)

### 7.2 Descript (descript.com)

**Market position:** Professional video/podcast editor. Text-based editing. Used by top creators.

**Key UX patterns observed:**
- **Text-based editing**: Edit video by editing transcript text (delete words = delete video)
- **Timeline + script**: Side-by-side video timeline and transcript script
- **AI-powered features**: Speech to Text, Video Enhancer, Split Audio, YouTube Clip Maker
- **Tools suite**: Broad set of standalone tools (not just clipping)
- **Enterprise readiness**: Teams, Enterprise tiers, security certifications
- **Community + education focus**: Guides, tutorials, community events

**What to steal:**
1. **Transcript → video mapping** — Editable transcript with word-level timestamps
2. **Side-by-side layout** — Video on one side, content editor on the other (our clip editor layout)
3. **AI tool categorization** — Clear naming for each AI feature (ours: Detect, Generate, Format)
4. **Progress indicators** — Per-stage visual feedback during processing

**What to avoid:**
5. Desktop app mentality (we're purely web-based, must work in browser)
6. Complex timeline editing (we do automated clip generation, not manual NLE)
7. Feature overload (Descript has too many tools — we focus on one pipeline)

### 7.3 Kapwing (kapwing.com)

**Market position:** Online video editor for teams. 30M+ creators. Focus on collaboration.

**Key UX patterns observed:**
- **AI-first tools**: Smart Cut, AI Video Generator, Repurpose Studio, Clean Audio
- **Repurpose Studio** — The closest to our product: long-form → short-form
- **Role-based landing**: Separate CTAs for Marketers, Internal Comms, Creators, Educators
- **Team collaboration**: Shared workspaces, comments on timeline
- **Template-first**: Video templates, meme templates, collage templates
- **Pricing anchor**: Free tier with "Try Kapwing Free" prominently placed

**What to steal:**
1. **Smart Cut** — The AI-powered silence/pause removal concept (we could add this to our renderer)
2. **Role-based filter** — Ask "what type of creator are you?" on first visit to tune defaults
3. **Template system** — Pre-built hook/caption templates for different content types
4. **"Repurpose Studio" positioning** — Our product is exactly this, name resonates
5. **Template gallery** — Show what's possible with before/after examples

**What to avoid:**
6. Too many entry points (Kapwing has 20+ tools — confusing for new users)
7. Load time (Kapwing's editor is JS-heavy and slow to mount)
8. Generic AI positioning (Kapwing's AI features are broad but not deep)

### 7.4 UX Pattern Comparison Matrix

| UX Pattern | OpusClip | Descript | Kapwing | Our Approach |
|-----------|----------|----------|---------|-------------|
| **Upload entry** | URL-first, file second | File-first | File + template | Dual: URL + file, depends on user tier |
| **Clip selection** | Transcript-click + auto | Text-based edit | Smart Cut | Auto-detect with candidate grid + manual transcript-click refinement |
| **Editing UX** | Minimal (select & export) | Full NLE timeline | Drag-and-drop timeline | Hook/caption/hashtag editor (not NLE) — text-focused |
| **Progress feedback** | Simple spinner | Stage indicators | Loading skeleton | Pipeline progress bar with stage labels + percent |
| **Approval workflow** | Individual clip review | N/A (editor) | Team comments | Select → approve → export (3-step gate) |
| **Multi-platform** | TikTok primarily | Export as file | Download as file | 6 platforms simultaneously (TikTok, Reels, Shorts, X, LinkedIn, Email) |
| **Brand/tone** | Brand templates | N/A | N/A | Full brand profile system with tone learning |
| **Collaboration** | Team workspace | Shared projects | Team workspace | Via SHADDAI teams module |

### 7.5 Key UX Decisions for SHADDAI Clips

Based on competitive research, these are our differentiating UX choices:

1. **Batch intelligence** — 10-50 curated clips in one pass (OpusClip does 1-10)
2. **Platform-native** — 6 platforms with distinct formatting (competitors do 1-3)
3. **Brand tone memory** — Learning system, not static templates
4. **Human-in-the-loop** — 3-step gate: select → approve → export (not fully automated, not fully manual)
5. **Pipeline transparency** — Show the pipeline stages with progress (builds trust during processing)
6. **Score transparency** — Show WHY a clip was selected (signal breakdown: linguistic, audio, sentiment, QA)
7. **Hook variety** — 5 hook types per clip, user selects preferred variant
8. **Cost transparency** — Show estimated cost before generation, actual cost after

---

## 8. Technology Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Browser video codec incompatibility | Medium | High | Test on Chrome, Firefox, Safari, Edge. Serve H.264 Baseline profile. Show format info with fallback poster. |
| WebSocket connection drops during long generation | High | Medium | Auto-reconnect with exponential backoff. Polling fallback. Show connection status indicator. |
| Large file upload failures | Medium | High | Chunked upload strategy. Resume from last chunk. 5 retry attempts. |
| Memory leaks from video player re-mounting | Medium | Medium | Use `useEffect` cleanup to revoke object URLs. Unload video on unmount. Pool video elements. |
| API rate limiting during rapid edits | Low | Medium | Debounce autosave. Queue mutations. Show rate limit warnings proactively. |
| State inconsistency after WebSocket reconnection | Low | High | Full TanStack Query refetch on reconnect. Compare server state with client state. |

---

## 9. Implementation Roadmap

```
Week 1: Foundation
  ├── Scaffold Vite + React + TS project
  ├── Install + configure shadcn/ui components
  ├── Set up routing (React Router v7)
  ├── Build API client + type definitions
  ├── Set up TanStack Query + Zustand
  └── Build layout integration with SHADDAI shell

Week 2: Core Pages
  ├── Dashboard page (sources list + widgets)
  ├── Upload page (dropzone + URL import)
  ├── Source detail page (metadata + transcript)
  └── Candidate review page (grid + selection)

Week 3: Clip Generation Flow
  ├── Batch progress page (pipeline + progress)
  ├── Clip editor page (hooks, captions, hashtags)
  ├── Platform variant preview
  └── Generate/approve/export mutations

Week 4: Polish
  ├── Brand profiles CRUD
  ├── Export queue page
  ├── WebSocket integration
  ├── Error/empty/loading states
  ├── Responsive design pass
  └── Accessibility audit
```

---

*End of Frontend Research Document v1.0*