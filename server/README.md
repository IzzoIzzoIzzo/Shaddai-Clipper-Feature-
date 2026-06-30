# SHADDAI Clips — Backend (real, self-contained pipeline)

This is the **real** clip engine. It does actual work — no mock, no Redis,
no Python, no system FFmpeg install:

- **Transcription:** Whisper in-process via Transformers.js
  (`@huggingface/transformers`, Apache-2.0). Pure JS/WASM + ONNX. The model
  (`Xenova/whisper-tiny.en`, ~40 MB) downloads from the HF hub on first run and
  is cached on disk.
- **Video ops:** `fluent-ffmpeg` bound to the bundled `ffmpeg-static` /
  `ffprobe-static` binaries (MIT). Real cut + center-crop reframe + H.264 encode.
- **API:** Fastify 5 + `@fastify/multipart` + `@fastify/cors` + `@fastify/static`.

It implements the same contract the frontend expects (`../src/types/api.ts`,
`API_BASE = /api/clips/v1`), so the UI talks to it directly (the Vite dev
proxy forwards `/api/clips` and `/files` to this engine — see `../vite.config.ts`).

> The previous version of this doc described a BullMQ + Python `faster-whisper`
> sidecar design. That was replaced by the in-process design above — there is
> nothing external to run anymore.

## Architecture

```
POST /sources (multipart upload)
   └─> Fastify writes file to data/<sourceId>/
        └─> processSource()  [async, fire-and-forget; poll GET /sources/:id]
             probe (ffprobe) → extract 16kHz mono f32 PCM (ffmpeg, in-memory)
             → Whisper transcribe (Transformers.js) → heuristic highlight detect

POST /generate { sourceId, candidateIds, platforms }
   └─> generateBatch()  [async; poll GET /batches/:id]
        for each candidate × platform:
          renderVerticalClip() = ffmpeg cut [start,end] + scale/crop to
          9:16 (tiktok/reels/youtube_shorts) or 16:9 (x/linkedin) + libx264 MP4
   └─> MP4s served at GET /files/<sourceId>/clips/<clipId>_<platform>.mp4
```

State is in-memory (single-user engine). Uploaded inputs + rendered clips live
on disk under `data/` (override with `DATA_DIR`).

## Run it

```
npm install        # installs ffmpeg-static (downloads the static binary)
npm start          # or: npm run dev — Fastify API on http://localhost:8787
```

Environment:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | HTTP port |
| `DATA_DIR` | `./data` | where inputs + rendered clips are stored |
| `WHISPER_MODEL` | `Xenova/whisper-tiny.en` | any Transformers.js-compatible Whisper model id |

## Endpoint contract (mounted at `/api/clips/v1`)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | — | `{ ok, engine }` |
| POST | `/sources` | `multipart/form-data` field `file` | `{ sourceId, status: 'uploading' }` |
| GET | `/sources` | — | `{ sources: Source[] }` |
| GET | `/sources/:id` | — | `{ source, transcript: Segment[], candidates: Candidate[] }` |
| POST | `/generate` | `{ sourceId, candidateIds?, platforms? }` | `{ batchId, status: 'queued' }` |
| GET | `/batches/:id` | — | `{ batch }` (poll `batch.status` until `reviewing`) |
| GET | `/files/<sourceId>/clips/<clipId>_<platform>.mp4` | — | the rendered MP4 (static) |

Notes:
- `/sources` and `/generate` are async — clients poll `GET /sources/:id`
  (status `uploading → normalizing → ingested|failed`) and `GET /batches/:id`
  (status `queued → generating → reviewing`).
- `candidateIds` defaults to the top 3 detected candidates; `platforms`
  defaults to `['tiktok','reels']`. Valid platforms: `tiktok`, `reels`,
  `youtube_shorts` (9:16); `x`, `linkedin` (16:9).
- A clip's downloadable URLs are in `batch.clips[].platformAssets[platform]`.

## Verify (no real video needed)

```
npm run test:e2e   # builds testdata/test.mp4 from real speech.wav, runs the
                   # actual extract→Whisper→render path, asserts real words +
                   # a >1KB MP4. PASS.

node smoke.mjs     # boots the Fastify server, generates a synthetic clip with
                   # ffmpeg, then drives the REAL HTTP flow: upload → poll →
                   # generate → poll → fetch the rendered MP4. SMOKE PASS.
```

## Dashboard embedding (later)

This engine is meant to back the dashboard **Media / Clips** tab, tier + x402
gated. The gate belongs in front of `POST /sources` and `POST /generate`
(return `402` to signal `premium_required` — the frontend store already handles
that status on upload). Everything else (transcript, candidates, rendered MP4s)
is real output safe to surface to the user.

## Security notes
- Every upload is validated by `probe()` (rejects sources with no audio track)
  before transcription/render.
- No shell strings: file paths go to ffmpeg via `fluent-ffmpeg` args, never an
  interpolated shell command. Transcript text is treated as untrusted and is
  only ever rendered as data, never executed.
- Pin versions (done) and run `npm audit` in CI before deploys.
