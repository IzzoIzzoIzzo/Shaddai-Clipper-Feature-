# Deploying SHADDAI Clipper to Render

One web service runs the whole app — the Fastify engine serves the compiled React UI
(`dist/`) plus the clip API (`/api/clips/v1`) and rendered files (`/files/`).
No separate static site, no CDN step, no extra services.

---

## How It Works

```
GitHub push → main
      ↓
Render build
  npm install                    # frontend deps
  npm run build                  # tsc -b && vite build → dist/
  npm --prefix server install    # server deps (fastify, transformers.js, ffmpeg-static)
      ↓
Render start (from project root)
  npm --prefix server start
  → node --import tsx/esm server/src/server.ts
  → CWD = server/, so ../dist resolves to the built React UI
  → binds process.env.PORT on 0.0.0.0
      ↓
Live URL  https://shaddai-clipper.onrender.com
  /                    React UI (SPA, falls back to index.html)
  /api/clips/v1/*      Fastify clip API
  /files/:id/clips/*   Rendered MP4 download/stream
```

The service is **iframe-embeddable** — no `X-Frame-Options` header is set and
CORS is `origin: true`, so the SHADDAI dashboard can embed it freely.

---

## Prerequisites

- Render account (render.com)
- GitHub account with the `IzzoIzzoIzzo/Shaddai-Clipper-Feature-` repo accessible to Render
- The repo already has `render.yaml` at the root — Render reads it automatically

---

## Deploy Steps

### Step 1 — Confirm the repo is on GitHub

```bash
# From the project root (SHADDAI CLIPPER folder):
git remote -v
# Should show: origin  https://github.com/IzzoIzzoIzzo/Shaddai-Clipper-Feature-.git

# If not set up yet:
git remote add origin https://github.com/IzzoIzzoIzzo/Shaddai-Clipper-Feature-.git
git push -u origin main
```

### Step 2 — Connect repo to Render via Blueprint

1. Go to **render.com/dashboard**
2. Click **New** → **Blueprint**
3. Connect your GitHub account if not already connected
4. Search for and select **Shaddai-Clipper-Feature-**
5. Render detects `render.yaml` and shows a preview of the service
6. Click **Apply** — Render creates the service and starts the first build

> Alternatively: **New** → **Web Service** → connect repo → paste the build/start
> commands manually (see render.yaml for exact values).

### Step 3 — Add the Persistent Disk (required for clips to survive restarts)

`render.yaml` defines the disk but Render may require you to confirm it in the UI:

1. In the Render dashboard, open the **shaddai-clipper** service
2. Go to **Disks** in the left sidebar
3. Confirm a disk named **clipper-data** is attached at `/var/data` with 10 GB
4. If it is not there: click **Add Disk** → name `clipper-data` → mount `/var/data` → 10 GB

Without the disk, rendered MP4s are stored in ephemeral memory and vanish on every
restart or redeploy. Users can still download clips immediately, but nothing persists.

### Step 4 — Verify env vars

The following are set by `render.yaml` and should already appear under
**Service → Environment**:

| Variable | Value in render.yaml | Notes |
|---|---|---|
| `NODE_VERSION` | `20` | Node 20 LTS |
| `DATA_DIR` | `/var/data` | Must match the disk mountPath |
| `WHISPER_MODEL` | `Xenova/whisper-tiny.en` | Default — fastest, lowest RAM |
| `MAX_JOBS` | `2` | Max simultaneous transcribe/render jobs |
| `MAX_UPLOAD_MB` | `300` | Per-upload cap in MB |
| `HF_HOME` | `/var/data/hf-cache` | Whisper model cache (on the disk = survives redeploys) |
| `COVERS` | `off` | Set to `on` + add `HF_TOKEN` to enable AI thumbnail covers |

**Optional secrets** (click "Add Environment Variable" for each):

| Variable | When to set |
|---|---|
| `HF_TOKEN` | If you want AI-generated covers via HF FLUX (COVERS=on). Not needed for transcription. |
| `OPENAI_API_KEY` | Richer AI-written hooks/captions. Leave unset for deterministic fallback. |

`PORT` is **not** in the list — Render injects it automatically. Do not set it manually.

### Step 5 — Watch the first build

Build takes 3–6 minutes:
1. `npm install` + `npm run build` (frontend TypeScript compile + Vite bundle)
2. `npm --prefix server install` (downloads ffmpeg-static ~50 MB binary + server deps)

Start takes an additional 30–60 seconds on the first request:
- Whisper `tiny.en` (~40 MB ONNX model) downloads from HuggingFace Hub on the first
  video upload and is cached at `HF_HOME` (`/var/data/hf-cache`).
  Subsequent restarts skip the download if the disk is attached.

### Step 6 — Point the SHADDAI dashboard at the live URL

After deploy, Render shows the service URL (likely `https://shaddai-clipper.onrender.com`).

If the URL matches that default, the main SHADDAI dashboard is already wired — no changes needed.

If Render assigns a different URL, update **two places** in the main dashboard's `public/index.html`:

```javascript
// 1. The CLIP_ENGINE variable (prod branch):
var CLIP_ENGINE = 'https://YOUR-ACTUAL-URL.onrender.com'

// 2. The Content-Security-Policy meta tag — frame-src and connect-src:
// Add:  https://YOUR-ACTUAL-URL.onrender.com
```

---

## Environment Variable Reference

| Variable | Default (in server code) | Render override | Purpose |
|---|---|---|---|
| `PORT` | `8787` | Render injects automatically | HTTP bind port |
| `DATA_DIR` | `./data` (relative to server/) | `/var/data` | Clip + upload storage root |
| `WHISPER_MODEL` | `Xenova/whisper-tiny.en` | Set in render.yaml | Transcription model |
| `MAX_JOBS` | `2` | Set in render.yaml | Concurrent CPU-heavy job cap |
| `MAX_UPLOAD_MB` | `1024` | `300` in render.yaml | Per-request upload size cap |
| `HF_HOME` | OS default (~/.cache/huggingface) | `/var/data/hf-cache` | Transformers.js model cache |
| `HF_TOKEN` | — | Optional secret | HF gated model access / FLUX covers |
| `OPENAI_API_KEY` | — | Optional secret | AI hook/caption generation |
| `COVERS` | `off` | `off` in render.yaml | Enable HF FLUX AI covers (`on`/`off`) |

---

## RAM Sizing

Whisper runs locally in-process via Transformers.js (ONNX/WASM — no API key, no per-use cost).
The `tiny.en` model uses roughly 200–300 MB of RAM. Add ffmpeg decode buffers for the active
video and Node.js overhead and you comfortably exceed 512 MB under real load.

| Plan | RAM | Verdict |
|---|---|---|
| Free | 512 MB | Boots but OOMs on real video — demo only |
| Starter | 512 MB | Same as free for memory — use for smoke testing |
| **Standard** | **2 GB** | **Recommended minimum for production** |
| Pro | 4 GB | Use if you bump to `whisper-base.en` or `whisper-small.en` |

`render.yaml` is set to `plan: standard`. Downgrade to `starter` only to test boot cost.

---

## Concurrency Queue

`MAX_JOBS=2` means at most 2 videos can be actively transcribing or rendering at the
same time. A third upload queues and shows `status: queued` to the user rather than
crashing the host. Tune this value up only after confirming RAM headroom in Render metrics.

---

## Persistent Disk

Rendered MP4s are written to `DATA_DIR` (`/var/data`). Without the Render Disk:

- Files survive until the next deploy or restart (Render's ephemeral storage)
- Users can still download clips immediately after generation
- Nothing is accessible after a restart — the `/files/` URLs return 404

With the disk (configured in render.yaml, 10 GB):

- Clips persist across restarts, redeploys, and service sleep/wake cycles
- The Whisper model cache (`HF_HOME`) also lands on the disk, saving ~40 MB download on each restart
- Render bills disk storage separately (roughly $1.50/GB/month)

---

## Dashboard Integration

The SHADDAI main dashboard embeds this service as an iframe in **Media → VIDEO CLIPPER**,
gated to Pro tier. Key technical facts:

| Aspect | Detail |
|---|---|
| Iframe-embeddable | Yes — no `X-Frame-Options` header; CORS is `origin: true` |
| Auth forwarding | `src/api/client.ts` sends `Authorization: Bearer <token>` from `localStorage.shaddai_token` |
| Tier gating | Dashboard checks `tier >= pro`; lower tiers see upgrade prompt |
| CSP allowlist | Dashboard CSP already includes `https://shaddai-clipper.onrender.com` |
| Local dev | `START-CLIPPER.bat` → engine on `http://localhost:8787`; dashboard auto-uses localhost |

---

## Local Dev (unchanged)

```bat
REM Windows — double-click or run:
START-CLIPPER.bat
```

```bash
# Manual:
npm install
cd server && npm install && cd ..
npm run dev            # Frontend on :5173 (Vite + HMR)
cd server && npm start # Engine on :8787
```

Vite proxies `/api/clips` and `/files` to `:8787` in dev, so the UI talks to the
local engine without CORS issues.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: `tsc -b` error | TypeScript errors in src/ | Check Render build logs; fix type errors locally first |
| Start fails: `Cannot find ../dist` | Build didn't produce dist/ | Check build logs for Vite errors |
| OOM crash | Whisper + ffmpeg exceed plan RAM | Upgrade to Standard plan |
| Clips 404 after restart | No disk attached | Add disk at /var/data in Render dashboard |
| First upload slow | Whisper model downloading | Normal — ~40 MB download on cold start; cached after first run |
| Port binding error | PORT conflict | Do not set PORT env var manually; let Render inject it |
| CORS error from dashboard | Fetch blocked | CORS is `origin: true` — check for CSP issues in the dashboard HTML instead |
