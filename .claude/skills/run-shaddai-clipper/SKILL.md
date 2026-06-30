---
name: run-shaddai-clipper
description: Run, build, test, smoke, or screenshot the SHADDAI Clipper — the AI video-clipping engine (ffmpeg + Whisper) and its Vite/React frontend. Use when asked to launch the clipper, drive the clip pipeline, or verify upload→transcribe→render works.
---

The SHADDAI Clipper turns a long video into short clips. Two parts:
- **`server/`** — the real engine (Fastify + `ffmpeg-static` cut/crop + `@huggingface/transformers` Whisper transcription). **No Redis, no Python, no LLM key.** This is the drivable core.
- **root** — a Vite/React frontend that calls the engine via a dev proxy.

The agent path is a **self-booting HTTP smoke driver** (`server/smoke.mjs`) that boots the engine and drives the whole pipeline. Paths below are relative to the unit root (the `SHADDAI CLIPPER/` folder).

## Prerequisites
- Node 18+ (uses global `fetch`/`FormData`/`Blob`). Verified on Node 22/25.
- No system packages: `ffmpeg-static` + `ffprobe-static` ship their own binaries; `tsx` runs the TS directly. No `apt-get` needed.

## Build
```bash
cd server && npm install          # engine deps (incl. ffmpeg-static, ffprobe-static, transformers, tsx)
```
For the frontend (human path only):
```bash
npm install                       # at the unit root
```

## Run (agent path) — the smoke driver
From `server/`, one command boots the engine + drives upload → transcribe → detect → render → fetch:
```bash
cd server && node smoke.mjs
```
Expected tail (verified):
```
3/6  POST /sources (multipart upload)…
4/6  poll /sources/:id until ingested …
5/6  POST /generate + poll /batches/:id …
6/6  fetch the rendered clip file… → ~80000 bytes
✅ SMOKE PASS — upload → transcribe → detect → render → playable clip
```
**First run downloads the Whisper model (~40MB)** on the transcribe step (a few seconds–minutes once). The driver uses port 8799 and cleans up the engine on exit. It generates a synthetic test video (color + sine tone), so it needs **no** speech sample.

Real-speech end-to-end test (Windows only — uses System.Speech TTS to make a spoken video):
```bash
cd server && npm run test:e2e
```

## Direct engine run (for manual HTTP poking)
```bash
cd server && npm run dev          # engine on http://localhost:8787
curl http://localhost:8787/api/clips/v1/health   # {"ok":true,...}
```

## Run (human path) — the UI
```bash
cd server && npm run dev          # leave the engine running on :8787
# in another shell, at the unit root:
npm run build && npm run preview  # serves the built UI; the dev proxy sends /api/clips → :8787
```
Open the printed URL and upload a video. (Verified the build: 1665 modules, 0 errors.)

## Gotchas (the battle scars)
- **`Cannot find ffprobe`** — `ffmpeg-static` ships only `ffmpeg`, NOT `ffprobe`. The engine wires `ffprobe-static` in `src/ffmpeg.ts`; if you copy the ffmpeg setup elsewhere, set the ffprobe path too.
- **`.ts` imports need `tsx`** — scripts run `node --import tsx/esm src/server.ts`. Plain `node` (or tsc-emitted JS) won't resolve the explicit `.ts` import extensions. `tsx` is a runtime dependency (not just dev).
- **Synthetic/instrumental audio → empty transcript.** Whisper returns no segments for a pure tone; the engine then emits **one fallback "opening" candidate** so the pipeline still renders a clip. That's why the smoke (sine-tone video) still produces an MP4.
- **First transcribe is slow** — model download + load. Subsequent runs are fast (tiny.en ≈ realtime on CPU).
- **Windows:** `/tmp` does not exist; write temp files under the project (the engine uses `DATA_DIR`/`testdata`). `npm run test:e2e` depends on Windows TTS and won't run on Linux.
- **No LLM key needed** — transcription is local Whisper. (The agent *narration* features in the wider product need a key, but the clip engine does not.)

## Troubleshooting
- Smoke hangs at step 4 → first model download in progress; give it a few minutes, watch `[whisper] loading model` on stderr.
- `engine did not come up` → another process on the port; set `PORT=<free>` before `node smoke.mjs`.
- Clip is 0 bytes → check `ffmpeg-static`/`ffprobe-static` installed (`ls server/node_modules/ffmpeg-static/`).
