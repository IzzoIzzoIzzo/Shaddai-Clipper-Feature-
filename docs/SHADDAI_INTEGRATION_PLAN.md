# SHADDAI Clips — Premium Feature Integration Plan (v91)

> Goal: integrate the real clip engine into SHADDAI as a **premium feature**,
> connected to the agents + media workflow, with matching UI. Multi-session.

## Discovery — how SHADDAI is built (verified 2026)

**Design tokens** (`public/index.html` `:root`): dark cyan/teal cyberpunk.
- `--accent: #00e5a0` (teal) + `#00c8ff` (cyan) · `--secondary: #ff7b3d` (orange) · `--danger: #ff4070` · `--bg: #0a0e1a` (navy-black).
- → Clipper re-skinned to match: primary `#00e5a0`, bg `#0a0e1a` (done in `src/index.css`).

**Views** (`showView('…')`): dashboard, agents, chat, **media**, **content-studio**, marketplace, commerce, billing, skills, workflow, settings, etc. → Clips lives under **media / content-studio**, added to nav with a premium lock.

**Agents:** real tool-using agents run via `POST /api/agent/run {agent, task}` → poll `GET /api/agent/task/:id` → `{status, result, tools_used}`. 7 agents (SHADDAI/ZEROX/ORACLE/NEXUS/TURTLE/QUILL/PIKADON). Engine in `backend/agent-engine.js`, 182 tools.

**Tier gating:** `tier`/`locked`/`premium` patterns already in the dashboard → reuse for the Clips premium gate.

## The clip engine (built, real, no mock)
`SHADDAI CLIPPER/server/` — self-contained: `ffmpeg-static` (cut/crop) + `@huggingface/transformers` Whisper (transcribe, WASM, no Python/Redis). Endpoints at `/api/clips/v1`: POST `/sources`, GET `/sources/:id`, POST `/generate`, GET `/batches/:id`, static `/files`. **Status: code complete; needs `npm install` + one real run to prove.**

## Architecture decision (the big one) ⚠️
ffmpeg + Whisper are CPU/RAM/disk heavy and produce large files. **Render's web tier will not run real video processing.** So the engine runs as a **separate service**, and SHADDAI proxies to it:

```
SHADDAI dashboard (Clips module, premium-gated)
        │  POST /api/clips/* (SHADDAI backend)
        ▼
SHADDAI backend  ──proxy──▶  Clip Engine service (ffmpeg + whisper)
        │                         (local desktop now; dedicated worker/GPU box or
        │                          cloud GPU later — premium jobs only)
        ▼
 x402 ledger debit (premium $) · agent narration (QUILL captions, TURTLE thumbs)
```

## Agent connection (the "seamless" part)
1. User uploads in the Clips module → SHADDAI backend forwards to the engine.
2. Engine transcribes + detects highlights → returns candidates.
3. **QUILL agent** (`/api/agent/run` agent=QUILL) writes hooks/captions per clip; **ZEROX** can price/meter; **TURTLE** rates thumbnails. Results stream into the existing agent chat feed.
4. Engine renders clips → SHADDAI serves them; x402 ledger debits a premium amount per render.

## Roadmap (feature-by-feature)
- [ ] **0. Prove engine** — `cd server && npm install && npm run test:e2e` (real speech video → transcript + rendered mp4).
- [ ] **1. v91 copy + safety** — work on current v91 `public/index.html`; back up before edits.
- [ ] **2. Clips module UI** — new `showView('clips')` panel in SHADDAI matching the dashboard (teal), premium-locked for non-Pro tiers.
- [ ] **3. Backend proxy** — `backend/clips-routes.js`: proxy `/api/clips/*` to the engine; gate by tier; debit x402 per render.
- [ ] **4. Agent wiring** — pipe candidates → QUILL for captions/hooks; surface in agent chat.
- [ ] **5. Media workflow** — hook Clips into Content Studio (source → clips → schedule/post via existing social posting).
- [ ] **6. Engine hosting** — decide the heavy-compute home (dedicated worker / cloud GPU) for production premium use.

## Open decisions for the owner
1. **Engine hosting** for production (local-only beta vs. a paid worker box vs. cloud GPU). Premium pricing depends on this.
2. **Brand**: keep the cinematic "Cutting Room" look (now teal to match) as a premium sub-brand, or fully flatten into the standard dashboard panels?
