# SHADDAI Clips — Backend Porting Guide (mock → real)

> **Status:** the frontend is finished and runs end-to-end on a mock backend
> (`src/api/mockApi.ts` + `src/stores/clipsStore.ts`). This guide maps each
> mock generator to the real open-source building block that replaces it when
> we build the backend into SHADDAI. All repos below were verified to exist.

## How the mock is structured (so the swap is clean)

- **`src/api/mockApi.ts`** — pure functions that simulate each pipeline stage
  (`makeTranscript`, `makeCandidates`, `makeClip`, hook/caption/hashtag writers).
  Each maps 1:1 to a backend step.
- **`src/stores/clipsStore.ts`** — owns state + simulates async with timers.
  To go real: replace the timer sims with `apiClient(...)` calls (the client
  already exists at `src/api/client.ts`, pointed at `/api/clips/v1`) and drive
  status updates from WebSocket events (`src/stores/wsStore.ts`, `WS_BASE`).
- **`src/types/api.ts`** — the contract. Keep these shapes; the backend returns them.

## Stage-by-stage mapping

| Mock function | Real backend step | Best open-source building block |
|---|---|---|
| `makeTranscript()` | Audio extract + transcribe w/ word timestamps | **`SYSTRAN/faster-whisper`** (speed) or **`m-bain/whisperX`** (tightest word timing for animated captions). Run as a Python sidecar the Node worker calls. `ggml-org/whisper.cpp` if CPU-only/local. |
| `makeCandidates()` | Highlight / viral-moment detection | No good standalone lib — this is a **transcript → LLM scoring** step. Model the prompt on `SamurAIGPT/AI-Youtube-Shorts-Generator`. Keep our composite-score signal shape (`linguistic/audio/sentiment/qa`). |
| `makeClip()` video assembly | Cut clip + reframe to 9:16 + burn captions | **FFmpeg via `child_process`** (`crop`/`scale`/`pad` + `ass`/`subtitles` filter). For subject-tracking reframe, port `KazKozDev/auto-vertical-reframe` (YOLOv11 + ByteTrack) or MediaPipe AutoFlip as a Python sidecar. |
| hook/caption/hashtag writers | LLM copy generation | SHADDAI already has the LLM layer (agent-engine + keys.js). Reuse QUILL/ZEROX agents + the hook frameworks in `docs/HOOK_FRAMEWORKS.md`. |
| `clipsStore` timers | Job orchestration | **`taskforcesh/bullmq`** (Redis-backed queue) — one worker per stage: ingest → transcribe → detect → generate → render → export. |
| `uploadSource()` | Presigned upload + storage | Cloudflare R2 / S3 presigned URLs (see `docs/BUILD_ORDER.md` S1.1.5). |

## Reference repos (verified)

**Transcription:** `SYSTRAN/faster-whisper` (~14k) · `m-bain/whisperX` (~13k) · `ggml-org/whisper.cpp` (~38k) · `openai/whisper` (~70k)
**Full-pipeline references:** `SamurAIGPT/AI-Youtube-Shorts-Generator` (best whole-pipeline + highlight logic) · `RayVentura/ShortGPT` (~7.4k) · `FujiwaraChoki/supoclip` · `Shaarav4795/ClippedAI` · `mutonby/openshorts`
**Reframe 9:16:** `KazKozDev/auto-vertical-reframe` · `kamilstanuch/Autocrop-vertical` · `gauravzazz/smart-reframe` · MediaPipe AutoFlip (`google-ai-edge/mediapipe`, legacy/unmaintained but solid algorithm)
**Captions:** `absadiki/subsai` (~1.5k) — or just FFmpeg `ass`/`subtitles` filter directly (recommended)
**Node infra:** `taskforcesh/bullmq` (job queue) · `fluent-ffmpeg/node-fluent-ffmpeg` ⚠️ **archived May 2025** — prefer spawning FFmpeg directly.

### Caveats flagged by research
- No popular dedicated "highlight detection" library — treat as an LLM-over-transcript step, not a dependency.
- "ClipAnything" is a commercial product (clipanything.ai), **not** a confirmed OSS repo — don't assume it exists.
- `node-fluent-ffmpeg` is archived — spawn FFmpeg via `child_process` for a new backend.

## Recommended first integration (smallest real slice)
1. Wire `clipsStore.uploadSource` → real `POST /api/clips/v1/sources` (presigned upload).
2. BullMQ worker: `faster-whisper` sidecar → store transcript (replaces `makeTranscript`).
3. LLM highlight scoring (SHADDAI agents) → candidates (replaces `makeCandidates`).
4. FFmpeg cut + center-crop 9:16 + caption burn → clip MP4 (replaces `makeClip` video).
5. Flip `clipsStore` reads from timers to `apiClient` + `wsStore` events.

Steps 1–5 give a real MVP that matches the finished UI exactly, because the UI
only depends on `src/types/api.ts`, which is unchanged.
