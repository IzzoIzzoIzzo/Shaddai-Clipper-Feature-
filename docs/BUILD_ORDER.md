# SHADDAI Clips — Build Order & Task Breakdown

> **Document Owner:** Product Architect
> **Status:** v1.0 — Sprint Roadmap
> **Last Updated:** 2025-06-06

---

## Overview

This document breaks the SHADDAI Clips engine into **3 phases** with specific, assignable engineering tasks. Each phase produces a shippable increment. Dependencies are explicit so the team can parallelize where possible.

**Team roles mapping:**
- 🖥️ **FE** = Frontend Engineer
- ⚙️ **BE** = Backend Engineer
- 📝 **CS** = Content Strategist
- 🏛️ **PA** = Product Architect (me)
- ✅ **LD** = Lead (review/approval)

---

## Phase 1: MVP — The Working Pipeline

**Goal:** A user can upload a video, get 3 auto-generated clips, and download them.
**Timeline estimate:** 2-3 weeks
**Team:** ⚙️ BE (primary), 🖥️ FE (secondary), 📝 CS (consulting)

### S1.1 — Foundation Setup (Week 1)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **1.1.1** | Scaffold Hono API server with TypeScript | ⚙️ BE | None (fresh start) | 1 day |
| **1.1.2** | Set up Prisma schema with core tables: `User`, `Source`, `Transcript`, `Clip`, `GenerationBatch` | ⚙️ BE | 1.1.1 | 1 day |
| **1.1.3** | Set up PostgreSQL database + run initial migration | ⚙️ BE | 1.1.2 | 0.5 day |
| **1.1.4** | Set up Redis + BullMQ queue infrastructure | ⚙️ BE | 1.1.1 | 1 day |
| **1.1.5** | Set up Cloudflare R2 bucket + presigned URL logic | ⚙️ BE | 1.1.1 | 0.5 day |
| **1.1.6** | Copy existing SHADDAI auth middleware (JWT validation) | ⚙️ BE | 1.1.1 | 0.5 day |
| **1.1.7** | Create source upload endpoint with file validation (MIME, size, duration) | ⚙️ BE | 1.1.2, 1.1.5 | 1 day |
| **1.1.8** | Create source GET endpoint + source listing | ⚙️ BE | 1.1.2 | 0.5 day |

### S1.2 — Transcription & Highlight Detection (Week 1-2)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **1.2.1** | Audio extraction from video (FFmpeg via fluent-ffmpeg) | ⚙️ BE | 1.1.5 | 1 day |
| **1.2.2** | Deepgram Nova-2 integration (API client, key management, retry logic) | ⚙️ BE | 1.2.1 | 1.5 days |
| **1.2.3** | Whisper API fallback integration | ⚙️ BE | 1.2.2 | 0.5 day |
| **1.2.4** | Transcript storage (segments with word-level timestamps) | ⚙️ BE | 1.1.2, 1.2.2 | 0.5 day |
| **1.2.5** | **Highlight detection — simplified:** Rule-based scoring using text signals only (key phrases, named entities, question detection) + audio energy (FFmpeg volume peaks) | ⚙️ BE | 1.2.4 | 2 days |
| **1.2.6** | Clip candidate generation: merge adjacent high-scoring segments, enforce min/max duration | ⚙️ BE | 1.2.5 | 1 day |
| **1.2.7** | POST /v1/transcripts and POST /v1/clips/detect endpoints | ⚙️ BE | 1.2.4, 1.2.6 | 1 day |

### S1.3 — Basic Generation & Rendering (Week 2)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **1.3.1** | Hook writer agent (GPT-4o-mini): generate 3 hook variants per clip | ⚙️ BE | 1.2.6 | 1 day |
| **1.3.2** | 📝 CS: Provide prompt templates and hook examples for 1.3.1 | 📝 CS | None (parallel) | 0.5 day |
| **1.3.3** | Caption writer agent (GPT-4o-mini): generate primary + secondary caption | ⚙️ BE | 1.3.1 | 0.5 day |
| **1.3.4** | Basic hashtag generation (rule-based topic → hashtag mapping) | ⚙️ BE | 1.2.4 (topic extraction) | 0.5 day |
| **1.3.5** | **Video rendering:** FFmpeg clip extraction (H.264, MP4) — single format, center crop to vertical 9:16 | ⚙️ BE | 1.2.6 | 1.5 days |
| **1.3.6** | POST /v1/clips/generate endpoint (auto-select top 3 candidates) | ⚙️ BE | 1.3.1–1.3.5 | 1 day |
| **1.3.7** | Presigned download URLs for rendered clips | ⚙️ BE | 1.3.5, 1.1.5 | 0.5 day |
| **1.3.8** | BullMQ worker pool: wire up the full pipeline as a job queue (ingest → transcribe → detect → generate → render) | ⚙️ BE | 1.3.6 | 1 day |

### S1.4 — MVP UI (Week 3)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **1.4.1** | Scaffold Vite + React + TypeScript + Tailwind + shadcn/ui + React Router | 🖥️ FE | None (parallel to S1.1-S1.3) | 1 day |
| **1.4.2** | Upload page: drag-and-drop file upload with progress indicator | 🖥️ FE | 1.1.7 (API ready) | 1.5 days |
| **1.4.3** | Source list page: table of uploaded sources with status badges | 🖥️ FE | 1.1.8 (API ready) | 1 day |
| **1.4.4** | Processing status page: polling-based progress view (WebSocket in Phase 2) | 🖥️ FE | 1.3.8 (job queue) | 1 day |
| **1.4.5** | Results page: show 3 generated clips with download buttons, hook/caption preview | 🖥️ FE | 1.3.6, 1.3.7 | 2 days |
| **1.4.6** | SHADDAI shell integration: add Clips nav item, reuse sidebar/layout | 🖥️ FE | 1.4.1 | 1 day |
| **1.4.7** | ✅ LD: End-to-end test & sign-off | ✅ LD | 1.4.5, 1.4.6 | Review |

### MVP Deliverable
> ✅ User uploads video → sees processing → downloads 3 clips with hooks + captions + hashtags

---

## Phase 2: Core — Full Pipeline

**Goal:** All agents, brand memory, 5 platform formats, review workflow, WebSocket real-time.
**Timeline estimate:** 3-4 weeks
**Team:** All members

### S2.1 — Advanced Detection & Generation (Week 4)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **2.1.1** | **Full composite scoring:** implement all 7 signals (linguistic, audio energy, sentiment intensity, Q&A pairs, narrative position, speech velocity, callouts) | ⚙️ BE | 1.2.5 (MVP detection) | 2 days |
| **2.1.2** | Sentiment/emotion tagging per segment (GPT-4o-mini) | ⚙️ BE | 1.2.4 | 1 day |
| **2.1.3** | Topic extraction per segment (KeyBERT or GPT-4o-mini) | ⚙️ BE | 1.2.4 | 1 day |
| **2.1.4** | Speaker diarization enrichment (name mapping, speaker-role detection) | ⚙️ BE | 1.2.2 | 1 day |
| **2.1.5** | Candidate parameter tuning: configurable score thresholds, min/max duration per user | ⚙️ BE | 2.1.1 | 0.5 day |
| **2.1.6** | Retry logic + dead letter queue for failed jobs | ⚙️ BE | 1.3.8 | 1 day |

### S2.2 — Brand Tone Memory (Week 4-5)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **2.2.1** | `BrandProfile` Prisma model + CRUD endpoints | ⚙️ BE | 1.1.2 | 1 day |
| **2.2.2** | 📝 CS: Brand profile questionnaire design (tone, audience, key messaging, style) | 📝 CS | None | 1 day |
| **2.2.3** | Prompt injection: inject brand profile into hook/caption generation context | ⚙️ BE | 2.2.1, 1.3.1 | 1 day |
| **2.2.4** | Brand profile UI: create/edit form in settings | 🖥️ FE | 2.2.1, 2.2.2 | 2 days |
| **2.2.5** | Profile selector in generation flow (dropdown on generate page) | 🖥️ FE | 2.2.4 | 1 day |
| **2.2.6** | 📝 CS: Define feedback collection mechanism (thumbs up/down, free-text notes) | 📝 CS | None | 0.5 day |
| **2.2.7** | Edit capture: store user edits on clips, pattern detection for profile suggestions | ⚙️ BE | 2.2.1, 1.3.3 | 1.5 days |

### S2.3 — 5-Platform Formatting (Week 5)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **2.3.1** | 📝 CS: Finalize platform formatting rules doc (already drafted) | 📝 CS | None | 0.5 day refine |
| **2.3.2** | Platform-specific formatter agent: generate TikTok, Reels, Shorts, X, LinkedIn variants | ⚙️ BE | 1.3.1, 1.3.3 | 2 days |
| **2.3.3** | X/Twitter thread expansion (3-5 tweet thread from clip insight) | ⚙️ BE | 2.3.2 | 1 day |
| **2.3.4** | LinkedIn post expansion (800-1200 char professional writeup) | ⚙️ BE | 2.3.2 | 1 day |
| **2.3.5** | Aspect ratio rendering per platform: vertical 9:16, horizontal 16:9, intelligent center tracking | ⚙️ BE | 1.3.5 | 2 days |
| **2.3.6** | Caption burn-in for TikTok/Shorts (FFmpeg drawtext overlay) | ⚙️ BE | 2.3.5 | 1 day |
| **2.3.7** | SRT subtitle generation for Reels (platform-native captions) | ⚙️ BE | 2.3.5 | 0.5 day |
| **2.3.8** | Watermark/logo overlay (brand configurable, mandatory for free tier) | ⚙️ BE | 2.3.5 | 1 day |
| **2.3.9** | 📝 CS: Quality guidelines scoring — implement automated quality checks per dimension | 📝 CS + ⚙️ BE | 2.3.2 | 1 day |

### S2.4 — Review & Approval Workflow (Week 5-6)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **2.4.1** | Clip status state machine (draft → reviewed → approved → exported → archived) | ⚙️ BE | 1.1.2 | 1 day |
| **2.4.2** | PUT /v1/clips/:id (edit hooks, captions, status transitions) | ⚙️ BE | 2.4.1 | 1 day |
| **2.4.3** | POST /v1/clips/batch-approve | ⚙️ BE | 2.4.2 | 0.5 day |
| **2.4.4** | Clip editor UI: editable hooks, captions, hashtags with real-time preview | 🖥️ FE | 2.4.2 | 3 days |
| **2.4.5** | Platform preview pane (simulate how clip looks on each platform) | 🖥️ FE | 2.4.4, 2.3.5 | 2 days |
| **2.4.6** | Approval queue UI: review, reject, edit, approve clips in batch | 🖥️ FE | 2.4.3 | 2 days |
| **2.4.7** | WebSocket integration: real-time progress for batch generation | ⚙️ BE + 🖥️ FE | 1.3.8, 2.4.6 | 1.5 days |

### S2.5 — Export & Platform Publishing (Week 6)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **2.5.1** | `PlatformConnection` model + OAuth token storage (encrypted) | ⚙️ BE | 1.1.2 | 1 day |
| **2.5.2** | TikTok API: OAuth flow + video upload | ⚙️ BE | 2.5.1, 2.3.5 | 2 days |
| **2.5.3** | YouTube Shorts API: OAuth flow + video upload | ⚙️ BE | 2.5.1, 2.3.5 | 2 days |
| **2.5.4** | X/Twitter API: tweet with media + thread posting | ⚙️ BE | 2.5.1, 2.3.3 | 1.5 days |
| **2.5.5** | LinkedIn API: post with video + text | ⚙️ BE | 2.5.1, 2.3.4 | 1.5 days |
| **2.5.6** | Export queue UI: pending → publishing → published status per platform | 🖥️ FE | 2.5.2–2.5.5 | 2 days |
| **2.5.7** | Platform connection UI (OAuth login buttons) | 🖥️ FE | 2.5.1 | 1 day |
| **2.5.8** | Webhook callbacks from platforms (publish confirmation, performance data) | ⚙️ BE | 2.5.2–2.5.5 | 1 day |

### S2.6 — Billing Integration (Week 6-7)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **2.6.1** | `UsageMetering` model + event emission per pipeline stage | ⚙️ BE | 1.1.2, 1.3.8 | 1 day |
| **2.6.2** | Quota check before job dispatch (look up user tier from SHADDAI billing) | ⚙️ BE | 2.6.1 | 1 day |
| **2.6.3** | Usage dashboard widget (clips used this month, remaining) | 🖥️ FE | 2.6.1 | 1 day |
| **2.6.4** | Tier upgrade prompts at quota limits | 🖥️ FE | 2.6.2 | 0.5 day |

### Phase 2 Deliverable
> ✅ Full pipeline: upload → transcribe → detect (7 signals) → generate (5 hooks, 2 captions, hashtags) → format (5 platforms + threads) → review → export to platforms. Brand profiles active. Usage tracked.

---

## Phase 3: Scale — Batch, Teams & Advanced Features

**Goal:** Power users can generate 50 clips at once, team collaboration, AI learning loops.
**Timeline estimate:** 3-4 weeks

### S3.1 — Batch Generation & Auto-Selection (Week 8)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **3.1.1** | Batch generation endpoint: `/v1/clips/generate/all` with auto-select N candidates | ⚙️ BE | 2.1.5, 2.3.2 | 1 day |
| **3.1.2** | Parallel clip rendering (render multiple clips concurrently, capped at tier limit) | ⚙️ BE | 1.3.5, 1.1.4 | 2 days |
| **3.1.3** | Batch generation UI: select source → configure params → see progress bar across all clips | 🖥️ FE | 3.1.1, 2.4.7 | 2 days |
| **3.1.4** | Smart clip deduplication (similar-content clips merged/ranked) | ⚙️ BE | 2.1.1 | 1.5 days |
| **3.1.5** | Pause/resume/cancel batch jobs | ⚙️ BE | 1.3.8 | 1 day |

### S3.2 — Team Collaboration (Week 8-9)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **3.2.1** | Team + TeamMembership models + CRUD (shared sources, clips, brand profiles) | ⚙️ BE | 1.1.2 | 1 day |
| **3.2.2** | Shared brand profiles across team members | ⚙️ BE | 3.2.1, 2.2.1 | 0.5 day |
| **3.2.3** | Role-based permissions (admin, member, viewer) for team resources | ⚙️ BE | 3.2.1 | 1 day |
| **3.2.4** | Team workspace UI: member management, shared sources list | 🖥️ FE | 3.2.1 | 2 days |
| **3.2.5** | Activity feed: who generated what, clip approvals, exports | ⚙️ BE + 🖥️ FE | 3.2.1 | 1.5 days |

### S3.3 — AI Learning Loop (Week 9-10)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **3.3.1** | Clip version history: track every edit on hook, caption, or hashtag | ⚙️ BE | 2.4.2 | 1 day |
| **3.3.2** | User feedback aggregation (thumbs, ratings, edit patterns) | ⚙️ BE | 2.2.6, 3.3.1 | 1 day |
| **3.3.3** | Auto-profile refinement: after N edits, suggest profile updates to user | ⚙️ BE | 3.3.2, 2.2.7 | 2 days |
| **3.3.4** | A/B hook testing: auto-rotate hooks across exports, report best performers | ⚙️ BE | 2.5.2–2.5.5 | 2 days |
| **3.3.5** | Performance dashboard: views, engagement per clip per platform | 🖥️ FE | 3.3.4, 2.5.8 | 2 days |
| **3.3.6** | 📝 CS: Refine prompt templates based on A/B results and feedback | 📝 CS | 3.3.3, 3.3.4 | Ongoing |

### S3.4 — Advanced Rendering & Storage (Week 10-11)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **3.4.1** | Intelligent center tracking: detect face/main subject, keep in frame during crop | ⚙️ BE | 2.3.5 | 2 days |
| **3.4.2** | Auto-caption styling: dynamic text sizing based on content length | ⚙️ BE | 2.3.6 | 1 day |
| **3.4.3** | Storage lifecycle: auto-cleanup raw files after 30d, clips after 90d | ⚙️ BE | 1.1.5 | 0.5 day |
| **3.4.4** | Bulk export (ZIP package of all platforms per clip set) | ⚙️ BE | 2.3.5 | 1 day |
| **3.4.5** | Email newsletter variant (HTML render with hook + clip thumbnail + CTA) | ⚙️ BE | 2.3.2 | 1 day |

### S3.5 — Platform Automation (Week 11)

| ID | Task | Owner | Dependencies | Effort |
|----|------|-------|-------------|--------|
| **3.5.1** | Auto-schedule: calendar-based publishing (pick dates/times, auto-export) | ⚙️ BE + 🖥️ FE | 2.5.2–2.5.5 | 2 days |
| **3.5.2** | Content calendar UI: drag-drop clips onto calendar dates | 🖥️ FE | 3.5.1 | 2 days |
| **3.5.3** | Webhook performance callbacks (views, likes, shares per platform) | ⚙️ BE | 2.5.8 | 1 day |
| **3.5.4** | Weekly performance report (auto-generated email) | ⚙️ BE | 3.5.3 | 1 day |

### Phase 3 Deliverable
> ✅ Batch generation (50 clips), team workspaces, AI learning from edits, content calendar, performance analytics

---

## 2. Dependency Graph (Textual)

```
S1.1 ──────────────────────────────────────────┐
  │                                              │
  ├── S1.2 ── S1.3 ── S1.4 (MVP)                │
  │         │                                    │
  │         └── S2.1 ──┐                         │
  │                     ├── S2.3 ── S2.5         │
  │            S2.2 ────┘        │               │
  │                              └── S2.6        │
  │                                     │        │
  │                            S2.4─────┘        │
  │                                               │
  └── S3.1 ── S3.2 ── S3.3 ── S3.4 ── S3.5     │
```

**Parallel tracks:**
- S1.4 (Frontend MVP) runs in parallel with S1.1–S1.3 (Backend MVP)
- S2.2 (Brand Profile) and S2.1 (Advanced Detection) run in parallel
- S3.2 (Teams) and S3.1 (Batch) can partially overlap
- 📝 CS work is mostly parallel (templates, prompts, quality guidelines)

---

## 3. Team Allocation Per Sprint

| Sprint | Week | ⚙️ BE Tasks | 🖥️ FE Tasks | 📝 CS Tasks | 🏛️ PA Tasks |
|--------|------|-------------|-------------|-------------|-------------|
| **S1** | 1 | 1.1.1→1.1.8, 1.2.1→1.2.4 | 1.4.1 (scaffold) | 1.3.2 (hook prompts) | Review BE/FE decisions |
| **S2** | 2 | 1.2.5→1.2.7, 1.3.1→1.3.8 | 1.4.2, 1.4.3 | — | 📝 Produce this doc |
| **S3** | 3 | Bugfixes, polish | 1.4.4→1.4.7 | — | ✅ MVP review |
| **S4** | 4 | 2.1.1→2.1.6, 2.2.1, 2.2.3 | 2.2.4, 2.2.5 | 2.2.2, 2.2.6 | Architecture refinement |
| **S5** | 5 | 2.3.2→2.3.8, 2.4.1→2.4.3 | 2.4.4→2.4.6 | 2.3.1, 2.3.9 | Cross-module integration review |
| **S6** | 6 | 2.5.1→2.5.5, 2.6.1→2.6.2 | 2.4.7, 2.5.6→2.5.7 | — | ✅ Phase 2 review |
| **S7** | 7-8 | 3.1.1→3.1.5, 3.2.1→3.2.3 | 3.1.3, 3.2.4→3.2.5 | — | Performance audit |
| **S8** | 9 | 3.3.1→3.3.4 | 3.3.5 | 3.3.6 | Learning loop design review |
| **S9** | 10-11 | 3.4.1→3.4.5, 3.5.1, 3.5.3→3.5.4 | 3.5.2 | — | ✅ Phase 3 review |

---

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Deepgram API latency/cost | Medium | High | Whisper fallback ready; batch transcripts to reduce per-minute cost |
| FFmpeg rendering quality (center crop losing speaker) | Medium | Medium | Phase 3 adds intelligent center tracking (3.4.1). For MVP, use center-crop. |
| Platform API rate limits (TikTok/X) | High | Medium | Queue exports with rate limiting; user sees "queued" status, not errors |
| AI token costs exceed margin at scale | Medium | High | Monitor per-user cost; switch to GPT-4o-mini/Claude Haiku for generation; cache aggressively |
| Free tier abuse (spam uploads) | Medium | Low | Strict rate limits, mandatory account, ClamAV scan, file type constraints |
| Diarization quality on poor audio | High | Medium | Flag low-confidence segments for manual review; user can override speaker labels |

---

## 5. First Sprint Assignment (Sprint 1 — Week 1)

If the lead wants to kick off immediately, here are the first tasks to assign:

| To | Task ID | What |
|----|---------|------|
| ⚙️ Backend Engineer | **1.1.1** → **1.1.4** | Hono API scaffold, Prisma + Postgres, Redis + BullMQ, R2 storage |
| 🖥️ Frontend Engineer | **1.4.1** | Vite + React + Tailwind + shadcn scaffold, route setup |
| 📝 Content Strategist | **1.3.2** (soon) + **2.2.2** | Hook prompt templates + brand questionnaire |
| 🏛️ Product Architect | **This document** + review support | Available for design clarifications |

---

*End of Build Order Document v1.0*