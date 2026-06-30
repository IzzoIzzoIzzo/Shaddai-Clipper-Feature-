# SHADDAI Clips — Frontend Architecture & Component Plan

> **Document Owner:** Frontend Engineer
> **Status:** v1.0 — Research Complete
> **Last Updated:** 2025-06-06

---

## 1. Framework Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Build tool** | Vite 6 | Fastest HMR, memory-light, native ESM. Better than CRA or Next.js for a focused module. |
| **UI library** | React 19 + TypeScript 5 | As specified in our stack. Strict mode, use() hook for promises. |
| **Routing** | React Router v7 | File-based routing via Vite plugin, lazy loading for code-split pages. |
| **Styling** | Tailwind CSS v4 | Zero-runtime CSS, utility-first, small bundle, fast iteration. |
| **UI Components** | shadcn/ui (Radix primitives) | Accessible, unstyled, composable, tree-shakeable. No heavy design system dependency. |
| **Server state** | TanStack Query v5 | Caching, deduplication, optimistic updates, pagination, WebSocket integration via query invalidation. |
| **Client state** | Zustand | Minimal boilerplate, no provider nesting, works outside React for WebSocket handler. |
| **Form handling** | React Hook Form + Zod | Runtime validation matching backend Zod schemas. |
| **Icons** | Lucide React | Lightweight, tree-shakeable, consistent icon set. |
| **WebSocket** | Native WebSocket + Zustand store | Lightweight, direct connection to `wss://api.shaddai.ai/clips/v1/ws`. |
| **HTTP client** | fetch + TanStack Query | No heavy axios dependency. Thin wrapper for auth headers. |

> **Memory note:** Vite + React + Tailwind + shadcn/ui is one of the most memory-efficient stacks. Dev server consumes ~200-300MB.

---

## 2. Route Map

```
/clips                          → Dashboard (sources list, recent batches)
/clips/upload                   → Upload / Import source
/clips/sources/:sourceId        → Source detail (transcript, candidates)
/clips/sources/:sourceId/candidates → Candidate review & selection
/clips/batches/:batchId         → Batch progress & results
/clips/clips/:clipId            → Clip detail editor (hooks, captions, platforms, export)
/clips/clips/:clipId/preview/:platform → Platform-specific preview
/clips/export-queue             → Export queue status
/clips/settings                 → Brand profiles list
/clips/settings/brand/:profileId → Brand profile editor
/clips/settings/brand/new       → New brand profile

# Also integrated into SHADDAI main nav:
/                              → Main dashboard (includes clips summary widget)
```

### 2.1 Route Component Tree

```
<App>
  <ShaddaiLayout>                    ← Imports existing SHADDAI shell
    <Sidebar />
    <TopBar />                        ← Breadcrumbs, user menu, tier badge
    <main>
      <Outlet />                      ← Route-matched page below
    </main>
    <RealtimeToast />                 ← WebSocket-driven notifications
  </ShaddaiLayout>
</App>
```

---

## 3. Component Hierarchy (Atomic Design)

### 3.1 Page-Level Components

```
pages/
├── DashboardPage            ← Sources list, recent batches, quick-upload CTA
├── UploadPage               ← File dropzone + URL import form
├── SourceDetailPage         ← Transcript viewer, candidate timeline, batch history
├── CandidateReviewPage      ← Candidate cards with scores, select/approve/reject
├── BatchProgressPage        ← Live progress bar, clip list per batch
├── ClipEditorPage           ← Full edit view: hooks, captions, hashtags, platforms
├── ClipPreviewPage          ← Per-platform video preview with mockups
├── ExportQueuePage          ← Queue of pending/exporting/published exports
├── BrandProfilesPage        ← List of brand profiles
├── BrandProfileEditorPage   ← Create/edit brand profile form
└── SettingsPage             ← General settings (tier, API keys, connected platforms)
```

### 3.2 Feature Components (Templates)

```
templates/
├── SourceUploadForm         ← Drag-drop zone, file validation, progress bar
├── ImportUrlForm            ← URL input with platform selector
├── SourceCard               ← Thumbnail, title, duration, status badge, date
├── SourceList               ← Sortable, filterable list/grid of sources
├── TranscriptTimeline       ← Segmented waveform with labels, clickable segments
├── TranscriptSegment        ← Single segment row: text, speaker, timestamp, score bar
├── ClipCandidateCard        ← Score badge, summary, speakers, topic tags, actions
├── ClipCandidateList        ← Sortable candidate grid with multi-select
├── ClipEditorToolbar        ← Edit actions, save, approve, export
├── HookSelector             ← 5 hook variants displayed as editable cards
├── CaptionEditor            ← Primary + secondary editable captions
├── HashtagEditor            ← Core + niche + brand tag pills, add/remove
├── PlatformVariantGrid      ← Per-platform assets: video, caption, thread/post
├── PlatformPreviewFrame     ← Device mockup (phone/desktop) with clip
├── PlatformSelector         ← Multi-select checkboxes for platforms
├── BatchProgressBar         ← Animated progress with stage labels
├── BatchClipCard            ← Small clip card inside batch view
├── BrandProfileCard         ← Profile name, tone type, audience, actions
├── BrandProfileForm         ← Full profile editor with live preview
├── ExportQueueItem          ← Platform icon, status, retry/cancel, external link
└── TierBadge                ← User tier display with upgrade CTA
```

### 3.3 Shared / Primitive Components

```
shared/
├── Button                   ← Variants: primary, secondary, ghost, danger, icon
├── Input                    ← Text input with label, error state, icon prefix
├── Select                   ← Dropdown select
├── Textarea                 ← Multi-line text input
├── Badge                    ← Status/chip badges (colors per status)
├── Card                     ← Container with padding, shadow, hover state
├── Dialog                   ← Modal dialog
├── Toast                    ← Notification toast (success, error, info, progress)
├── ProgressBar              ← Linear progress
├── Spinner                  ← Loading spinner / skeleton
├── Tabs                     ← Tab navigation
├── Toggle                   ← Toggle switch
├── DropdownMenu             ← Dropdown menu
├── Tooltip                  ← Hover tooltip
├── Separator                ← Divider line
├── Skeleton                 ← Loading skeleton placeholder
└── EmptyState               ← Empty state with icon, message, CTA
```

### 3.4 Feature-Specific Subcomponents

```
clip-editor/
├── ClockRangeSlider         ← Range slider for clip start/end trimming
├── HookCard                 ← Single hook with edit, copy, select, thumbs up/down
├── CaptionPreview           ← Caption rendered as it appears on each platform
├── HashtagPill              ← Individual hashtag with remove button
├── PlatformTab              ← Tab per platform with asset status
├── ThreadPreview            ← Rendered X/Twitter thread cards
├── LinkedInPostPreview      ← Rendered LinkedIn post
├── VideoPlayer              ← Custom video player with clip range, subtitles
└── ExportButton             ← Export with platform selection dropdown

source-detail/
├── AudioWaveform            ← Clickable waveform with segment highlights
├── SpeakerLabel             ← Colored speaker indicator
├── TopicTag                 ← Topic chip
├── EmotionIndicator         ← Emoji/icon + label for segment emotion
└── ClipBoundaryMarker       ← Line/time indicator on waveform
```

---

## 4. State Management Architecture

### 4.1 Server State (TanStack Query)

```typescript
// Query keys structure
const queryKeys = {
  sources: {
    all: ['sources'],
    list: (filters: SourceFilters) => ['sources', 'list', filters],
    detail: (id: string) => ['sources', 'detail', id],
  },
  transcripts: {
    detail: (id: string) => ['transcripts', id],
  },
  candidates: {
    list: (transcriptId: string) => ['candidates', transcriptId],
  },
  clips: {
    all: ['clips'],
    detail: (id: string) => ['clips', 'detail', id],
    byBatch: (batchId: string) => ['clips', 'batch', batchId],
  },
  batches: {
    detail: (id: string) => ['batches', id],
    list: (filters: BatchFilters) => ['batches', 'list', filters],
  },
  brandProfiles: {
    all: ['brand-profiles'],
    detail: (id: string) => ['brand-profiles', id],
  },
  exports: {
    list: (filters: ExportFilters) => ['exports', 'list', filters],
  },
  quota: {
    current: ['quota'],
  },
};
```

### 4.2 Client State (Zustand)

```typescript
// UI state store
interface UIState {
  // Upload state
  uploadProgress: Record<string, number>;          // sourceId -> 0-100
  uploadQueue: UploadItem[];
  
  // Selection state
  selectedCandidateIds: string[];                   // multi-select
  selectedClipIds: string[];                        // batch operations
  
  // Editor state
  activeEditClipId: string | null;
  editDirtyFlags: Record<string, boolean>;          // unsaved changes
  
  // WebSocket
  wsConnected: boolean;
  wsReconnectAttempts: number;
  
  // Notifications
  toasts: Toast[];
  
  // Actions
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  setUploadProgress: (sourceId: string, pct: number) => void;
  toggleCandidateSelection: (id: string) => void;
  // ...
}

// WebSocket event store
interface WSState {
  batchProgress: Record<string, BatchProgress>;
  latestEvents: WSEvent[];
  connect: (token: string) => void;
  disconnect: () => void;
  subscribeBatch: (batchId: string) => void;
}
```

### 4.3 WebSocket Integration

```
Connect → wss://api.shaddai.ai/clips/v1/ws?token=<jwt>
  ↓
Listener → auto-reconnect (exponential backoff 1s → 30s max)
  ↓
Route events to TanStack Query invalidation:
  clip.progress   → invalidate batch query, update batchProgress store
  clip.candidates → invalidate candidates query, show toast
  clip.generated  → invalidate batch + clips queries, show toast
  clip.exported   → invalidate export query, show success toast
  clip.error      → show error toast with retry action
```

---

## 5. Data Flow Diagrams

### 5.1 Upload Flow

```
User clicks "Upload" → UploadPage
  ↓
Dropzone accepts file
  ├── Client-side validation (type, size, duration via ffprobe.wasm?)
  ├── Show validation errors immediately
  └── Call POST /v1/sources/upload (presigned URL flow)
       ↓
  Monitor upload progress via XMLHttpRequest.upload.onprogress
       ↓
  Store sourceId + poll GET /v1/sources/:id
       ↓
  status = "ingested" → Navigate to source detail
  status = "failed"   → Show error with retry
```

### 5.2 Candidate Review Flow

```
Source is ingested + transcribed
  ↓
GET /v1/clips/candidates/:transcriptId → candidate list
  ↓
Render ClipCandidateCard grid (sorted by score)
  ↓
User selects candidates (multi-select) or clicks "Auto-select top N"
  ↓
User configures: platforms, hooks per clip, duration range, brand profile
  ↓
POST /v1/clips/generate (with candidateIds)
  ↓
Navigate to BatchProgressPage → WebSocket progress updates
  ↓
Complete → navigate to batch detail with clip list
```

### 5.3 Clip Edit → Approve → Export Flow

```
Batch complete → Clip list in "draft" status
  ↓
User clicks clip → ClipEditorPage
  ↓
Edit hooks (select variant or type custom)
  ↓
Edit captions (primary + secondary)
  ↓
Edit hashtags (core + niche + brand)
  ↓
Preview per platform (PlatformPreviewFrame)
  ↓
Click "Approve" → PUT /v1/clips/:id { status: "approved" }
  ↓
Click "Export" → POST /v1/clips/:id/export { platforms: [...] }
  ↓
Navigate to ExportQueuePage → WebSocket export status updates
```

---

## 6. Key UI/UX Patterns

### 6.1 Clip Candidate Grid

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Sort by: [Score ↓]  Filter: [All Topics ▾]  [Score: 0.5+]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ ⭐ 0.87           │  │ ⭐ 0.82           │              │
│  │ "The most impor-  │  │ "Why VCs ghost    │              │
│  │ tant thing in     │  │ you after meeting"│              │
│  │ fundraising..."   │  │                   │              │
│  │                   │  │                   │              │
│  │ [Speaker A]       │  │ [Speaker A, B]    │              │
│  │ #fundraising #vc  │  │ #vc #psychology   │              │
│  │ 1:05 - 2:05       │  │ 3:30 - 4:15       │              │
│  │                   │  │                   │              │
│  │ [✓ Select]        │  │ [  Select]        │              │
│  └───────────────────┘  └───────────────────┘              │
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ ⭐ 0.74           │  │ ⭐ 0.68           │              │
│  │ ...               │  │ ...               │              │
│  └───────────────────┘  └───────────────────┘              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Selected: 3/25   Top pick: auto-defined   [Generate Clips ▸] │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Clip Editor Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to batch  [Save Draft]  [Approve & Export ▾]        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │   Video Player          │  │  Hooks                     │ │
│  │   (with trim handles)   │  │                             │ │
│  │                         │  │  ┌──────────────────────┐  │ │
│  │                         │  │  │ 🔥 Curiosity (top)   │  │ │
│  │                         │  │  │ "The 1 question that │  │ │
│  │                         │  │  │ got..."              │  │ │
│  │                         │  │  └──────────────────────┘  │ │
│  │                         │  │  ┌──────────────────────┐  │ │
│  │                         │  │  │ ⚡ Contrarian        │  │ │
│  │                         │  │  │ "Stop optimizing..." │  │ │
│  │                         │  │  └──────────────────────┘  │ │
│  │                         │  │  ┌──────────────────────┐  │ │
│  │                         │  │  │ 💬 Quote             │  │ │
│  │                         │  │  │ ...                  │  │ │
│  │                         │  │  └──────────────────────┘  │ │
│  │                         │  │                             │ │
│  │                         │  │  Captions                  │ │
│  │                         │  │  ┌──────────────────────┐  │ │
│  │                         │  │  │ Primary: textarea   │  │ │
│  │                         │  │  └──────────────────────┘  │ │
│  │                         │  │  ┌──────────────────────┐  │ │
│  │                         │  │  │ Secondary: textarea  │  │ │
│  │                         │  │  └──────────────────────┘  │ │
│  │                         │  │                             │ │
│  │                         │  │  Hashtags                  │ │
│  │                         │  │  [#vc] [#fundraising] [+] │ │
│  │                         │  │                             │ │
│  └─────────────────────────┘  └────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Platform Variants                                       │ │
│  │  [TikTok] [Reels] [Shorts] [X] [LinkedIn] [Email]       │ │
│  │                                                          │ │
│  │  Selected: TikTok                                         │ │
│  │  ┌───── 9:16 phone mockup ─────┐                         │ │
│  │  │  ┌──────────────────────┐  │                         │ │
│  │  │  │ Hook text overlay    │  │                         │ │
│  │  │  │                      │  │                         │ │
│  │  │  │   [Video playing]    │  │                         │ │
│  │  │  │                      │  │                         │ │
│  │  │  │   Subtitles          │  │                         │ │
│  │  │  └──────────────────────┘  │                         │ │
│  │  │  Caption: "..."            │                         │ │
│  │  └────────────────────────────┘                         │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Batch Progress View

```
┌──────────────────────────────────────────────────────────────┐
│  Generation Progress                                          │
│                                                              │
│  [Ingest ✓] → [Transcribe ✓] → [Detect ✓] → [Generate ●] → [Render] → [Export]
│                                                                          
│  ████████████████████████████░░░░░░░░░  72%                      
│  Generating clips... Estimated 45s remaining                   
│                                                              
│  Clips generated: 2/3                                        
│                                                              
│  ┌──────────────────────────────────────────────────────┐   
│  │ ✅ Clip 1: "The Walking Away Strategy"   [View ▸]   │   
│  │ ✅ Clip 2: "Why VCs Ghost You"           [View ▸]   │   
│  │ ⏳ Clip 3: "Term Sheet Red Flags"        [--]       │   
│  └──────────────────────────────────────────────────────┘   
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Responsive Design Strategy

| Breakpoint | Layout | Notes |
|------------|--------|-------|
| **≥ 1280px** (desktop) | 2-column clip editor, side-by-side | Full editing workspace |
| **≥ 768px** (tablet) | 2-column collapses to single, side panel slides | Candidate grid: 2 cards per row |
| **< 768px** (mobile) | Single column, bottom sheet for panels | Upload still works, editor is scrollable |
| **< 480px** (small phone) | Minimal UI, essential actions only | Video preview takes priority |

The SHADDAI dashboard shell already handles responsive nav — we focus on content area responsiveness.

---

## 8. Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **LCP** (Largest Contentful Paint) | < 2s | Code-split routes, lazy load heavy components |
| **FID** (First Input Delay) | < 100ms | No blocking JS, web workers for heavy computations |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Fixed aspect ratio containers for video/thumbnails |
| **Bundle size** (initial) | < 150KB gzipped | Tree-shaking, dynamic imports for editors |
| **API call cache hit rate** | > 80% | TanStack Query stale times: candidates 5min, clips 2min |
| **WebSocket reconnect** | < 3s | Exponential backoff, immediate on tab refocus |
| **Optimistic updates** | Immediate | Approve/reject actions update UI before server confirms |

---

## 9. Accessibility (a11y)

| Requirement | Implementation |
|-------------|---------------|
| **Keyboard navigation** | All interactive elements focusable, Tab order logical, Enter/Space for actions |
| **Screen reader** | ARIA labels on icon buttons, live regions for progress updates, proper heading hierarchy |
| **Color contrast** | WCAG AA minimum (4.5:1 for normal text, 3:1 for large text) |
| **Focus indicators** | Visible focus ring on all interactive elements |
| **Motion reduction** | Respect `prefers-reduced-motion` — disable animations, use instant transitions |
| **Form validation** | Error messages linked to inputs via `aria-describedby` |

---

## 10. Error & Empty States

### Error States
- **Upload failure**: Error toast with retry button. File stays in dropzone.
- **Transcription failure**: Warning badge on source card. "Retry transcription" button.
- **Generation failure**: Error state on batch card. "Retry failed clips" button.
- **Network offline**: Banner at top: "You're offline. Changes saved locally."
- **Rate limited**: Toast: "You've hit your tier limit. [Upgrade] or try again in X minutes."
- **404/not found**: Empty state with "Source not found" illustration + "Go to dashboard" CTA.

### Empty States
- **No sources yet**: Upload illustration + "Upload your first video to get started" CTA
- **No clips yet**: "Select candidates and generate clips" CTA
- **No brand profiles**: "Create your first brand profile for consistent tone" CTA
- **No exports yet**: "Approve and export your clips" CTA

---

## 11. Integration Points with Existing SHADDAI Dashboard

### Shared Shell
- Reuse SHADDAI sidebar navigation (adding "Clips" section)
- Reuse SHADDAI top bar (user menu, tier badge, notifications)
- Reuse SHADDAI theme variables (CSS custom properties for colors, spacing, typography)

### Shared Components to Leverage
- `Button`, `Input`, `Select`, `Badge`, `Dialog`, `Toast` — if SHADDAI has these, extend; otherwise build with shadcn/ui
- `Avatar` — user profile avatar
- `DropdownMenu` — user menu

### Clip Module Nav Items
```
SHADDAI Dashboard
├── Overview
├── Clips              <── New section
│   ├── Sources
│   ├── My Clips
│   ├── Export Queue
│   └── Brand Profiles
├── Agents
├── Workflows
└── Settings
```

### Embedded Widgets for Main Dashboard
- **Quick upload widget**: Drag-and-drop area on main dashboard
- **Recent clips widget**: Last 5 clips with status
- **Usage widget**: "You've used 12/50 clips this month"
- **Activity feed**: Real-time generation/export events

---

## 12. File Structure

```
shaddai-clips-frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
├── src/
│   ├── main.tsx                       ← Entry point
│   ├── App.tsx                        ← Router setup
│   ├── index.css                      ← Tailwind imports + global styles
│   │
│   ├── api/
│   │   ├── client.ts                  ← Fetch wrapper with auth
│   │   ├── sources.ts                 ← Source CRUD operations
│   │   ├── transcripts.ts
│   │   ├── candidates.ts
│   │   ├── clips.ts
│   │   ├── batches.ts
│   │   ├── brandProfiles.ts
│   │   ├── exports.ts
│   │   └── types.ts                   ← TypeScript interfaces matching API
│   │
│   ├── routes/
│   │   ├── index.tsx                  ← Route definitions
│   │   ├── DashboardPage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── SourceDetailPage.tsx
│   │   ├── CandidateReviewPage.tsx
│   │   ├── BatchProgressPage.tsx
│   │   ├── ClipEditorPage.tsx
│   │   ├── ClipPreviewPage.tsx
│   │   ├── ExportQueuePage.tsx
│   │   ├── BrandProfilesPage.tsx
│   │   ├── BrandProfileEditorPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui primitives
│   │   ├── shared/                    ← Shared feature components
│   │   ├── templates/                 ← Feature templates
│   │   ├── clip-editor/              ← Clip editor subcomponents
│   │   └── source-detail/            ← Source detail subcomponents
│   │
│   ├── stores/
│   │   ├── uiStore.ts                ← Zustand UI store
│   │   └── wsStore.ts                ← Zustand WebSocket store
│   │
│   ├── hooks/
│   │   ├── useSources.ts             ← TanStack Query hooks for sources
│   │   ├── useTranscripts.ts
│   │   ├── useCandidates.ts
│   │   ├── useClips.ts
│   │   ├── useBatches.ts
│   │   ├── useBrandProfiles.ts
│   │   ├── useExports.ts
│   │   ├── useWebSocket.ts            ← WebSocket connection + event handler
│   │   └── useDebounce.ts
│   │
│   ├── lib/
│   │   ├── utils.ts                   ← cn() helper, formatDuration, etc.
│   │   ├── validators.ts             ← Client-side Zod schemas
│   │   ├── constants.ts              ← Platform list, tier limits, MIME types
│   │   └── platformFormatters.ts     ← Platform-specific text formatters
│   │
│   └── types/
│       ├── api.ts                     ← API response/request types
│       ├── models.ts                  ← Domain model interfaces
│       └── events.ts                  ← WebSocket event types
│
├── public/
│   └── illustrations/                 ← Empty state illustrations
│
└── shadcn-components.json             ← shadcn/ui component registry
```

---

## 13. Implementation Phasing

### Phase 1: Foundation (Current sprint)
- [ ] Scaffold Vite + React + TypeScript project
- [ ] Set up Tailwind CSS + shadcn/ui
- [ ] Set up routing (React Router v7)
- [ ] Set up TanStack Query + Zustand
- [ ] Build shared primitive components (Button, Input, Card, Badge, Toast, etc.)
- [ ] Build API client + type definitions
- [ ] Build DashboardPage (sources list)
- [ ] Build UploadPage with dropzone
- [ ] Build SourceDetailPage (basic)

### Phase 2: Core Clipping Flow
- [ ] Build CandidateReviewPage with candidate cards
- [ ] Build BatchProgressPage with progress bar
- [ ] Build ClipEditorPage (hooks, captions, hashtags)
- [ ] Build PlatformVariantGrid + PlatformPreviewFrame

### Phase 3: Polish & Integration
- [ ] Clip editor: video player with trim handles
- [ ] Export flow: queue, retry, status
- [ ] Brand Profiles: CRUD + selection in generation flow
- [ ] WebSocket integration for real-time updates
- [ ] Responsive layout polish

### Phase 4: Advanced Features
- [ ] Transcript timeline with waveform visualization
- [ ] Batch operations (approve all, export all)
- [ ] Error states, empty states, loading skeletons
- [ ] Performance optimization (bundle analysis, lazy loading)
- [ ] Accessibility audit

---

## 14. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Browser video codec support** | Clip preview may not play in all browsers | Use web-compatible H.264, fallback to poster image, show format info |
| **Large file uploads** | Timeouts, memory pressure, poor UX | Presigned URL upload (direct to S3/R2), chunked upload, progress bar |
| **WebSocket reconnect storms** | Multiple tabs cause duplicate connections | Shared worker or broadcast channel for tab coordination |
| **Clip editor complexity** | Too many fields, overwhelming UX | Progressive disclosure: hooks first, captions second, platforms last |
| **SHADDAI shell integration** | Style conflicts, component duplication | Use CSS custom properties for theming, document component interfaces |

---

*End of Frontend Architecture Document v1.0*
