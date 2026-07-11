<div align="center">

# SHADDAI Clipper

### Free, self-hosted Opus Clip alternative — turn long videos into captioned vertical shorts

*Drop in a long video. Get back scroll-stopping, captioned 9:16 clips for TikTok, Reels, and YouTube Shorts — powered by local **Whisper** transcription and **ffmpeg**. No API key. No per-use fee. Runs on your machine or deploys to Render in one click.*

<br>

[![License: MIT](https://img.shields.io/badge/license-MIT-00ff88?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Self-Hosted](https://img.shields.io/badge/self--hosted-yes-9b5de5?style=for-the-badge)](#quickstart)
[![No API Key](https://img.shields.io/badge/API%20key-not%20required-00b4d8?style=for-the-badge)](#features)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-f77f00?style=for-the-badge)](https://github.com/IzzoIzzoIzzo/Shaddai-Clipper-Feature-/pulls)

[**𝕏 @shaddaiAI**](https://x.com/shaddaiAI) · [**Built by @IzzoSol**](https://x.com/IzzoSol) · [**SHADDAI Platform**](https://github.com/IzzoIzzoIzzo/Shaddai)

</div>

---

## Why

Paid clipping tools (Opus Clip, Vizard, Munch) charge $30–$100/month, upload your footage to their servers, and lock finished clips behind a paywall. If you post regularly — podcasts, interviews, long-form tutorials — those costs compound fast and your raw footage leaves your control.

SHADDAI Clipper is the engine that powers the Media Studio inside [SHADDAI](https://github.com/IzzoIzzoIzzo/Shaddai). Extracted here as a standalone MIT tool: same real pipeline, zero subscription, runs entirely on your hardware.

---

## Features

- **Local Whisper transcription — no API key, no per-use cost.** Uses `@huggingface/transformers` (ONNX/WASM) to run OpenAI's `whisper-tiny.en` in-process. The ~40 MB model downloads once from HuggingFace Hub and is cached on disk. No Python, no external service, no cloud upload.

- **Windowed transcription with live progress.** Long videos are processed in 2-minute sliding windows so the UI stays responsive and you see real progress — not a frozen spinner — on a 45-minute podcast.

- **Real audio-energy highlight detection.** The same 16kHz PCM buffer used for transcription is re-used to measure per-window loudness (RMS). Clips that score higher on vocal energy, question-hook keywords, and sentiment signals are ranked first. A timeline-diversity pass ensures highlights are spread across the whole video, not clustered at the start.

- **ffmpeg cut and crop — no mocks.** Uses `ffmpeg-static` (no system install required) to cut the source at exact timestamps and center-crop to the target aspect ratio. No temp files for the common case — PCM is piped in memory straight to Whisper.

- **9:16 vertical output** for TikTok, Instagram Reels, and YouTube Shorts. **16:9 horizontal output** for X (Twitter) and LinkedIn. Select multiple platforms per clip; each renders as a separate MP4.

- **Burned-in captions.** When `burnCaptions: true`, a clip-relative `.srt` file is generated (timings shifted so the window starts at 0) and passed to ffmpeg's `subtitles` filter. Captions are permanently embedded in the video — no separate subtitle file needed for upload.

- **SRT and TXT transcript export.** Download the full transcript as a `.srt` (SubRip) or `.txt` file. The SRT is ready to attach to any video or import into an editor.

- **Editable transcript.** After transcription, edit any mis-heard word or phrase via the API (`PATCH /sources/:id/transcript`). Edited text flows through to captions and narration copy.

- **Auto-written clip copy — fallback-safe.** Each clip gets a suggested hook, caption, title, and hashtags. With an `OPENAI_API_KEY` set, copy is LLM-generated. Without one, a deterministic fallback derives punchy copy from the real transcript — every clip gets usable metadata regardless.

- **AI thumbnail covers — optional.** Set `COVERS=on` plus an `HF_TOKEN` to generate a FLUX AI thumbnail for each clip. When disabled (the default), a real video frame is extracted at the clip start instead. Either way, every clip has a cover.

- **Concurrency queue for multi-user use.** CPU-bound jobs (Whisper transcription, ffmpeg render) are capped at `MAX_JOBS` simultaneous workers (default: 2). Extra uploads queue and show `status: queued` rather than crashing the process.

- **One-command launch on Windows.** Double-click `START-CLIPPER.bat`. It builds the app on first run, starts the engine, and opens `http://localhost:8787` in your browser. No separate terminal for the frontend.

- **Render-deployable.** `render.yaml` is included. Push to GitHub, connect to Render, click Apply. One service hosts the API, the rendered clips, and the React UI.

- **Polished, themeable UI.** A React interface with a cinematic "Cutting Room" boot sequence and **four switchable themes** — Cutting Room (dark cinematic), Arcade, Abstract Gallery, and Luxury Editorial — each with its own palette, fonts, and texture. Pick your look from the header (deep-link with `?theme=arcade`).

- **Built-in media gallery.** Every rendered clip lands in an in-app Gallery — browse, preview, play, and download your shorts in one place, with per-platform download and one-click caption copy.

- **Free during beta.** Usage-credit plumbing (balance, spend, gating) is built in but runs **unlimited and free** while in beta — flip a single flag to switch on billing later. No card, no limits today.

- **Gallery federation.** A `GET /api/clips/v1/gallery` endpoint returns all rendered clips in a standard `MediaAsset` shape so the [SHADDAI dashboard](https://github.com/IzzoIzzoIzzo/Shaddai) can surface them in its unified media gallery.

---

## How It Works

```
1. Upload         POST /api/clips/v1/sources (multipart video, up to 1 GB)
       ↓
2. Probe          ffprobe reads duration + stream info
       ↓
3. PCM extract    ffmpeg decodes audio → 16kHz mono Float32 in memory (no temp file)
       ↓
4. Transcribe     Whisper tiny.en runs in 2-min windows; live progress reported
       ↓
5. Detect         Audio-energy + linguistic scoring → top 5 diverse highlights
       ↓
6. Generate       POST /api/clips/v1/generate (pick candidates + platforms)
       ↓
7. Render         ffmpeg cuts + center-crops + burns captions (one MP4 per platform)
       ↓
8. Download       GET /files/:sourceId/clips/:filename (stream or download)
```

Poll `GET /api/clips/v1/sources/:id` after upload to track transcription progress. Poll `GET /api/clips/v1/batches/:id` during rendering to track clip progress.

---

## Quickstart

**Prerequisites:** Node.js 18+. No ffmpeg system install needed — `ffmpeg-static` is bundled.

### Windows (one click)

```bat
REM Clone the repo, then:
START-CLIPPER.bat
```

First run builds the app (about one minute). After that, the engine is live at `http://localhost:8787` and opens automatically.

### Manual (any OS)

```bash
# Clone
git clone https://github.com/IzzoIzzoIzzo/Shaddai-Clipper-Feature-.git
cd Shaddai-Clipper-Feature-

# Install deps
npm install
cd server && npm install && cd ..

# Build frontend
npm run build

# Start engine (serves built UI + API + clip files)
cd server && npm start
# → http://localhost:8787
```

### Dev mode (live-reload frontend)

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend (Vite proxies /api/clips and /files to :8787)
npm run dev
# → http://localhost:5173
```

**First upload note:** Whisper `tiny.en` downloads ~40 MB from HuggingFace Hub on the first video upload and is cached. Subsequent runs skip the download.

---

## Self-Host / Deploy

Full instructions: [DEPLOY-RENDER.md](DEPLOY-RENDER.md)

**Short version:**

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → New → Blueprint → select the repo.
3. Render reads `render.yaml` and deploys automatically.
4. Add a Render Disk (`/var/data`, 10 GB) so rendered clips survive restarts.

The deployed service runs at `https://shaddai-clipper.onrender.com` by default and is iframe-embeddable (used by the SHADDAI dashboard).

**Recommended plan:** Standard (2 GB RAM). Whisper + ffmpeg together exceed 512 MB; the free/starter tier will OOM on real videos.

**Key environment variables** (already set in `render.yaml`):

| Variable | Default | Notes |
|---|---|---|
| `WHISPER_MODEL` | `Xenova/whisper-tiny.en` | Swap for `whisper-base.en` on Standard+ for higher accuracy |
| `MAX_JOBS` | `2` | Concurrent CPU-bound job cap |
| `MAX_UPLOAD_MB` | `300` | Per-upload size cap |
| `HF_TOKEN` | — | Optional — only needed for AI FLUX covers |
| `OPENAI_API_KEY` | — | Optional — richer LLM-written clip copy |

---

## Comparison

| Feature | SHADDAI Clipper | Opus Clip | Vizard | Munch |
|---|---|---|---|---|
| **Cost** | Free (MIT) | $29–$149/mo | $30–$99/mo | $49–$199/mo |
| **Self-hosted** | Yes | No | No | No |
| **Your footage leaves your machine** | No | Yes | Yes | Yes |
| **Transcription** | Local Whisper (no key) | Cloud | Cloud | Cloud |
| **Burned-in captions** | Yes | Yes | Yes | Yes |
| **SRT / TXT export** | Yes | Paid tier | Paid tier | Paid tier |
| **Editable transcript** | Yes | Yes | Yes | Yes |
| **9:16 + 16:9 output** | Yes | Yes | Yes | Yes |
| **Concurrency queue** | Yes (configurable) | Managed | Managed | Managed |
| **Deploy on your server** | Yes (Render / any Node host) | No | No | No |
| **API access** | Full REST API | Limited | Limited | No |
| **Open source** | Yes (MIT) | No | No | No |

---

## FAQ

**Is it really free?**
Yes. MIT license. No subscription, no usage metering, no account required. Run it locally or host it yourself.

**Does it need an API key?**
No. Whisper transcription, ffmpeg rendering, highlight detection, and clip copy generation all work without any API key. The optional integrations — `OPENAI_API_KEY` for richer LLM copy, `HF_TOKEN` for AI thumbnail covers — are additive.

**What video lengths does it handle?**
Transcription is windowed in 2-minute slices, so there is no hard length limit from the engine. The default upload cap is 1 GB locally (300 MB on Render Standard). A 60-minute video takes roughly 10–20 minutes to transcribe on a typical CPU using `whisper-tiny.en`.

**What formats does it accept?**
Any format ffmpeg can decode: MP4, MOV, WebM, MKV, AVI, and more. The input is probed with ffprobe before processing; anything without an audio track is rejected cleanly.

**Where do clips save?**
Rendered MP4s are written to `./data/<sourceId>/clips/` (or `DATA_DIR` if set). They are served at `/files/:sourceId/clips/:filename`. On Render with a persistent disk attached they survive restarts; without the disk they are available immediately for download but lost on restart.

**Can I use a more accurate Whisper model?**
Yes. Set `WHISPER_MODEL=Xenova/whisper-base.en` (or `whisper-small.en`) for better accuracy at the cost of more RAM and slower transcription. Recommended only on Standard plan (2 GB) or above.

**Can it run headlessly / via API?**
Yes. The full pipeline is exposed as a REST API (`/api/clips/v1/*`). The React UI is optional — you can drive the engine directly with `curl` or any HTTP client.

---

## Roadmap

- [ ] Subject-tracking reframe (YOLO/ByteTrack sidecar to replace center-crop)
- [ ] Speaker diarization (multi-speaker labels in transcript)
- [ ] Word-level caption animation (karaoke-style highlight)
- [ ] Batch export scheduler
- [ ] Webhook callbacks on job completion
- [ ] SQLite/LevelDB persistence (replace in-memory state for multi-restart durability)
- [ ] Chunked upload for very large files (bypass HTTP timeout on slow connections)

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss the direction.

```bash
# Run the end-to-end test suite (engine must be running on :8787)
cd server && npm run verify:features

# Type-check
cd server && npm run typecheck
npm run build
```

**If this saves you a Opus Clip subscription, consider starring the repo — it helps others find it.**

[![Star this repo](https://img.shields.io/github/stars/IzzoIzzoIzzo/Shaddai-Clipper-Feature-?style=social)](https://github.com/IzzoIzzoIzzo/Shaddai-Clipper-Feature-)

---

## The SHADDAI Family

| Repo | What |
|---|---|
| [**Shaddai**](https://github.com/IzzoIzzoIzzo/Shaddai) | The sovereign AI agent empire — 7 agents, 200+ real tools |
| [**aura**](https://github.com/IzzoIzzoIzzo/aura) | Zero-dep LLM token-saver · CLI + MCP server + library |
| [**Shaddai-Clipper-Feature-**](https://github.com/IzzoIzzoIzzo/Shaddai-Clipper-Feature-) | *(this)* Long video → captioned vertical shorts |

---

## License

[MIT](LICENSE) — © 2026 [@IzzoSol](https://x.com/IzzoSol)

<div align="center">

**Built by [@IzzoSol](https://x.com/IzzoSol) · Follow [@shaddaiAI](https://x.com/shaddaiAI)**

</div>
