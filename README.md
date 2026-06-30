# SHADDAI Video Clipper

Standalone tool that turns a long video into short, vertical (or wide), captioned
clips. **Real pipeline, no mock:** it cuts and reframes with the bundled
[`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) binary and
transcribes with [Whisper via Transformers.js](https://www.npmjs.com/package/@huggingface/transformers)
(pure JS/WASM + ONNX — no Python, no Redis, no system FFmpeg install).

This project is **completely separate from the main SHADDAI dashboard.**

```
SHADDAI CLIPPER/
├── server/        ← the engine: Fastify + ffmpeg-static + Whisper  (this is what does the work)
├── src/           ← React + Vite frontend (Cutting Room UI)
├── index.html     ← Vite entry
├── vite.config.ts ← dev server proxies /api/clips + /files → engine on :8787
└── docs/          ← design + integration docs
```

## Quick start (easiest — one click)

**Double-click `START-CLIPPER.bat`.** It builds the app the first time, starts the
engine (which also serves the UI), and opens `http://localhost:8787` in your
browser. Drag in a video, get captioned vertical clips, download them. That's it.

> One process, one URL. The engine serves both the API and the built UI, so you
> don't need a separate frontend server for normal use.

## Quick start (developers — two processes)

For UI development with hot-reload you can run the engine and the Vite dev server
separately. The engine is the only part required to clip videos; the dev UI is optional.

### 1. Engine (backend) — required

```bash
cd server
npm install        # already installed; pulls the ffmpeg-static binary
npm start          # → Fastify engine on http://localhost:8787
                   # (or: npm run dev — same thing)
```

First successful boot prints:

```
[clips] real engine on http://localhost:8787  (model loads on first upload)
```

> **First-run note:** the Whisper model (`Xenova/whisper-tiny.en`, ~40 MB)
> downloads from the Hugging Face hub the **first time a video is transcribed**
> (i.e. on the first `POST /sources`), then is cached on disk. Boot + health +
> ffmpeg work happen without it.

### 2. Frontend UI (optional)

```bash
# from the project root (not server/)
npm install
npm run dev        # → http://localhost:5173, proxies API calls to the engine
```

## Engine HTTP contract (mounted at `/api/clips/v1`, port `8787`)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET  | `/api/clips/v1/health` | — | `{ ok, engine }` |
| POST | `/api/clips/v1/sources` | `multipart/form-data`, field `file` (the video) | `{ sourceId, status: "uploading" }` |
| GET  | `/api/clips/v1/sources` | — | `{ sources: Source[] }` |
| GET  | `/api/clips/v1/sources/:id` | — | `{ source, transcript: Segment[], candidates: Candidate[] }` |
| POST | `/api/clips/v1/generate` | `{ sourceId, candidateIds?, platforms? }` | `{ batchId, status: "queued" }` |
| GET  | `/api/clips/v1/batches/:id` | — | `{ batch }` |
| GET  | `/files/<sourceId>/clips/<clipId>_<platform>.mp4` | — | the rendered MP4 (static) |

**Async flow (clients poll):**

1. `POST /sources` with the video file → get a `sourceId`.
2. Poll `GET /sources/:id` until `source.status === "ingested"`
   (`uploading → normalizing → ingested | failed`). Now `candidates[]` are populated.
3. `POST /generate { sourceId, candidateIds?, platforms? }` → get a `batchId`.
   - `candidateIds` defaults to the top 3 detected highlights.
   - `platforms` defaults to `["tiktok","reels"]`. Valid: `tiktok`, `reels`,
     `youtube_shorts` (9:16) and `x`, `linkedin` (16:9).
4. Poll `GET /batches/:id` until `batch.status === "reviewing"`.
   Download URLs are in `batch.clips[].platformAssets[platform]`.

### Environment vars

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | HTTP port |
| `DATA_DIR` | `server/data` | where uploaded inputs + rendered clips are stored |
| `WHISPER_MODEL` | `Xenova/whisper-tiny.en` | any Transformers.js Whisper model id |

## Verify it works

```bash
cd server

npm run typecheck   # tsc --noEmit — passes clean

node smoke.mjs      # boots the engine, makes a synthetic clip with ffmpeg, then
                    # drives the REAL HTTP flow: upload → poll → generate →
                    # poll → fetch the rendered MP4. (Downloads Whisper model
                    # on the transcribe step the first time.)

npm run test:e2e    # builds testdata/test.mp4 from real speech, runs the actual
                    # extract → Whisper → render path, asserts real words + a
                    # >1KB MP4.
```

Quick manual check (engine running):

```bash
curl http://localhost:8787/api/clips/v1/health
# → {"ok":true,"engine":"ffmpeg-static + transformers.js whisper"}
```

## Real end-to-end clip (manual)

To produce a clip from one of your own videos:

1. Start the engine (`cd server && npm start`).
2. Upload: `curl -F "file=@/path/to/your_video.mp4" http://localhost:8787/api/clips/v1/sources`
3. Poll `GET /api/clips/v1/sources/<sourceId>` until `status: "ingested"`
   (the **first** transcribe downloads the ~40 MB Whisper model — allow a minute).
4. `curl -X POST http://localhost:8787/api/clips/v1/generate -H "Content-Type: application/json" -d '{"sourceId":"<id>","platforms":["tiktok"]}'`
5. Poll `GET /api/clips/v1/batches/<batchId>` until `status: "reviewing"`, then
   download the MP4 at the `platformAssets` URL under `/files/...`.

See [`server/README.md`](server/README.md) for architecture, security notes,
and dashboard-embedding details.
