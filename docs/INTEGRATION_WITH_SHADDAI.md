# SHADDAI Clipper → SHADDAI Integration Brief

*Reference for wiring the Clipper into the main SHADDAI build. Written 2026-06-11.*

---

## 1. What the Clipper actually is
An **AI content-repurposing pipeline**: long video/audio → transcript → AI finds clip-worthy moments → you review candidates → edit → AI writes hooks + captions in your brand voice → render vertical/short clips → export per platform (TikTok/Reels/Shorts/X/LinkedIn/Email).

**Pipeline stages** (`PIPELINE_STAGES` in `src/lib/constants.ts`):
`queued → ingesting → transcribing → detecting → generating → rendering → exporting`

## 2. Its stack (the mismatch to plan around)
- **React 19 + Vite 6 + TypeScript + Tailwind 4** SPA (`shaddai-clips-frontend`)
- State: **zustand** (`uiStore`, `wsStore`), **@tanstack/react-query**, forms via **react-hook-form + zod**
- **12 routes** (`src/routes/`): Dashboard, Upload, Sources, SourceDetail, CandidateReview, ClipEditor, ClipPreview, BatchProgress, ExportQueue, BrandProfiles, BrandProfileEditor
- Builds to static assets via `vite build` → `dist/`
- **SHADDAI is single-file vanilla HTML/JS** → React can't be inlined. Integration is about (a) where the built SPA lives and (b) implementing the backend it calls.

## 3. How it connects to SHADDAI (the important part)
The frontend is **backend-agnostic** — it only talks to one base URL:
- `src/lib/constants.ts`: **`API_BASE = '/api/clips/v1'`**
- `src/api/client.ts`: every call is `fetch(`/api/clips/v1${endpoint}`)` with headers:
  - `Authorization: Bearer <localStorage 'shaddai_token'>`  ← **SHADDAI's Firebase ID token can populate this**
  - `Content-Type: application/json`, `X-Request-Id: <uuid>`
- `vite.config.ts` dev proxy: **`/api` → `http://localhost:3000`** ← **this is SHADDAI's exact backend port.**
- Realtime: `wsStore.ts` opens a WebSocket (`WS_BASE`), generic `{type,payload}` messages, `.on(type, handler)`. Used for live pipeline progress.

**=> The Clipper already expects to live behind SHADDAI's backend.** Integration = implement `/api/clips/v1/*` on SHADDAI's Express server + serve the built SPA, and set `localStorage.shaddai_token` from SHADDAI's existing Firebase auth.

## 4. Backend API surface SHADDAI must provide (`docs/API_CONTRACTS.md`)
Public (`/api/clips/v1`, JWT required):
- `POST /sources/upload` · `POST /sources/import` (URL) · `GET /sources/:id` (poll status)
- `POST /transcripts` · `GET /transcripts/:id`
- `POST /clips/detect` · `GET /clips/candidates/:transcriptId?limit&minScore`
- `POST /clips/generate` · `POST /clips/generate/all` · `GET /batches/:batchId`
- `GET /clips/:clipId` · `PUT /clips/:clipId` · `POST /clips/batch-approve` · `POST /clips/:clipId/export` · `GET /clips?cursor&limit`
- `POST /brand-profiles` (+ `/quick`) · `GET|PUT|DELETE /brand-profiles/:id`
- `WS /ws?token=<jwt>` — pipeline progress events
- Webhook callbacks: `POST /webhooks/{tiktok,x}/callback`

Internal (server-to-server): `usage/record`, `users/:id/quota`, `agents/dispatch`, `workflows/*`, `storage/presigned-{upload,download}`.

## 5. Pipeline tech it assumes (`PIPELINE_AND_INTEGRATION.md`)
| Stage | Engine | Notes |
|---|---|---|
| Ingest/import | yt-dlp + FFmpeg normalize | URL or upload |
| Transcribe | **Deepgram Nova-2** ($0.0043/min), fallback **Whisper large-v3**, local Whisper.cpp | word-level timestamps |
| Detect | **GPT-4o / Claude** over transcript segments + FFmpeg audio-energy | scores clip candidates |
| Hooks/Captions | GPT-4o-mini / **Claude Haiku** + Brand Tone Memory | per-platform |
| Render | **FFmpeg** (cut, 9:16 reframe, burn-in captions) | `-c copy` fast path |
| Export | platform webhooks / presigned download | |

Data models (`DATA_MODELS.md`, Prisma/Postgres): User, Team, **Source, Transcript, ClipCandidate, GenerationBatch, Clip, ClipVersion, ClipExport, BrandProfile**, PlatformConnection, UsageMetering. Job queue assumes **Redis** (`clip:jobs`, `clip:events`).

## 6. What SHADDAI ALREADY has that maps (reuse, don't rebuild)
- **Backend on :3000** (Express) — mount `/api/clips/v1` here.
- **Key resolver** `backend/lib/keys.js` → already resolves `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, etc. Add `DEEPGRAM_API_KEY` to the catalog for transcription.
- **Agent engine** (`/api/agent/run`, 7 agents, real tool loop) → detect/hook/caption stages can be **agent tasks** (QUILL=captions/hooks, ORACLE/NEXUS=detect) instead of bespoke services.
- **Firebase auth** already issues an ID token client-side → set `localStorage.shaddai_token` from it so the Clipper's `Authorization: Bearer` just works.
- **Video tooling**: `backend/video-providers.js` + a "VIDEO CLIPPER" tile already exists in Media Studio (paste URL → MP4/MP3) — the import/ingest seam is partly there.
- **Stripe + x402 ledger** → the Clipper's `UsageMetering`/quota can debit the same credit balance.

## 7. Integration approaches (pick in the other tab)
**A — Mount as a sub-app (recommended, lowest friction):** `vite build` → copy `dist/` to SHADDAI `public/clips/`; serve at `/clips`. Add a **Media Studio "🎬 Clip Studio" tile** that opens `/clips` (new tab or iframe), passing the Firebase token via `localStorage.shaddai_token`. Implement `/api/clips/v1/*` on SHADDAI's backend. **Keeps the single-file build untouched; React app stays React.**

**B — Port the UI into the single-file build (most work):** re-implement the 12 routes as vanilla views inside `index.html`. Maximum cohesion, but it's a large rewrite of a polished React app — not worth it now.

**C — Backend-only first (fastest value):** implement just `/sources/import` + `/transcripts` + `/clips/detect` + render as **SHADDAI agent tools**, and add a *simple vanilla* "Clip Studio" panel in Media Studio that calls them. Defer the full React UI. Good MVP; grow into A later.

**Recommendation: C → A.** Ship a real backend clip pipeline as agent tools + a simple Media Studio panel (C) so it works inside the existing build now; later mount the full React SPA at `/clips` (A) for the rich editor. Avoid B.

## 8. Concrete next steps (for the integration tab)
1. Add `DEEPGRAM_API_KEY` (+ confirm `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`) to `backend/lib/keys.js` catalog.
2. New `backend/clips-routes.js` mounted at `/api/clips/v1` — start with `import` (yt-dlp), `transcripts` (Deepgram→Whisper fallback), `clips/detect` (agent/LLM), `clips/:id/export` (FFmpeg). Use JSON files first (no Postgres/Redis) to match SHADDAI's stack; swap to a DB only if needed.
3. Reuse the **agent engine** for detect/hook/caption; reuse **keys.js** for provider keys; debit the **x402 ledger** for usage.
4. Bridge auth: on SHADDAI sign-in, `localStorage.setItem('shaddai_token', <firebaseIdToken>)` so the Clipper SPA authenticates.
5. When ready, `vite build` the Clipper → `public/clips/`, add the Media Studio tile.

## 9. Gotchas
- Clipper assumes **Postgres + Redis + presigned object storage**; SHADDAI uses **JSON files + local disk**. For beta, back the clip entities with JSON and store media on disk/`generated-output/` — don't pull in Postgres/Redis unless scale demands it (matches the "no rewrite" rule).
- WebSocket: SHADDAI can either implement `/api/clips/v1/ws` or have the SPA **poll** `GET /sources/:id` / `GET /batches/:id` (simpler for MVP).
- FFmpeg/yt-dlp must be available on Render (add to build) — or run ingest via a provider API.
- Keep all provider keys server-side via `keys.js`; never ship them in the built SPA.
