# Deploying the SHADDAI Clipper to Render

The clipper runs as its **own Render web service** (always-on). The SHADDAI
dashboard embeds it via iframe and gates it to **Pro tier**. One service hosts
both the clip API and the UI (the engine serves the built `dist/`).

## What's already done (in this repo)
- `render.yaml` — the Render blueprint (build + start + health check + env).
- Engine binds `process.env.PORT` and host `0.0.0.0` (Render-compatible).
- Engine serves the built UI, so the service URL shows the full clipper.
- Dashboard (`SHADDAI-MASTER-BACKUP-20260630/public/index.html`) is already wired:
  - Media → **VIDEO CLIPPER** embeds `CLIP_ENGINE` (localhost in dev, the Render URL in prod).
  - Gated to Pro (`tier >= pro`); lower tiers see an Upgrade prompt.
  - CSP already allows `https://shaddai-clipper.onrender.com`.

## Steps to actually deploy (needs your accounts)

### 1. Put this repo on GitHub
This folder is a local git repo. Create a GitHub repo and push:
```bash
cd "SHADDAI CLIPPER"
git remote add origin https://github.com/<you>/shaddai-clipper.git
git push -u origin main
```

### 2. Create the Render service
- Render → **New → Blueprint** → pick the `shaddai-clipper` repo → it reads `render.yaml`.
- Or **New → Web Service** manually with:
  - Build: `npm install && npm run build && npm --prefix server install`
  - Start: `cd server && node --import tsx/esm src/server.ts`
  - Health check path: `/api/clips/v1/health`
  - Plan: **Starter min**; **Standard (2 GB) recommended** — Whisper transcription is RAM-heavy.

### 3. Set env vars in Render (optional but recommended)
| Var | Purpose |
|---|---|
| `HF_TOKEN` | enables HF FLUX AI covers (else a real video frame is used) |
| `COVERS` | set `on` with `HF_TOKEN` to turn AI covers on |
| `OPENAI_API_KEY` | better hooks/captions (else deterministic fallbacks) |
| `WHISPER_MODEL` | `Xenova/whisper-tiny.en` (default) or `Xenova/whisper-base.en` if on a bigger plan |

### 4. Point the dashboard at the deployed URL
After Render gives you the URL (likely `https://shaddai-clipper.onrender.com`):
- If it matches that default, you're done — the dashboard already uses it in prod.
- If different, update **two places** in `public/index.html`:
  1. `var CLIP_ENGINE = ... 'https://YOUR-URL'` (the prod branch).
  2. CSP `frame-src` and `connect-src` — add `https://YOUR-URL`.
- Or at runtime set `window.CLIP_ENGINE = 'https://YOUR-URL'` before opening the module.

## Known limits on Render (beta-acceptable)
- **Storage is ephemeral** — rendered clips are download-now; they vanish on
  restart/redeploy. To persist, uncomment the `disk:` block in `render.yaml` (paid).
- **Free tier** (512 MB, spins down idle) will likely **OOM on real videos** — use it
  only to prove the deploy boots; run real traffic on Starter/Standard.
- **Long/large uploads** can hit request timeouts — keep hosted beta to shorter videos.

## Local dev still works unchanged
Double-click `START-CLIPPER.bat` → engine at `http://localhost:8787`; the dashboard's
prod-vs-local detection uses localhost automatically.
