# SHADDAI Clipper — "The Cutting Room" Design Spec

**Date:** 2026-06-30
**Status:** Approved design → ready for implementation plan
**Project:** `OneDrive/Desktop/SHADDAI CLIPPER`

---

## 0. Goal & guiding rule

Turn the already-working clipper engine into a finished, beautiful, **verified-working** product that:
1. Works standalone today with zero setup, and
2. Drops into the SHADDAI dashboard's media section later via one mount point, and
3. Saves LLM tokens through an embedded AURA layer.

**Guiding rule (owner's #1 priority): it must WORK and be TESTED/VERIFIED before any stretch art.**
Build order enforces this — C-tier art is gated behind a green verify pass.

**Anti-debug-swamp principle:** every agent-written text and every AI image is *optional with a deterministic fallback*. No narration call and no image call can ever block a clip from rendering. The existing proven pipeline (upload → transcribe → detect → render) is never removed; everything new is added **on top**.

---

## 1. Current state (verified facts, 2026-06-30)

- Engine `server/src/server.ts` (188 lines) is the real pipeline: ffmpeg-static + Transformers.js Whisper. No mock.
- `npm run test:e2e` **passes** on this machine: real speech → correct transcript → real 9:16 MP4 rendered (89,958 bytes).
- `npx tsc --noEmit` clean. ffmpeg binary present. Deps installed. Node v25.
- Frontend: 11 route pages (~2,597 lines TSX), Zustand stores, real API client.
- Known gaps: in-memory engine state (resets on restart); URL import is a "coming soon" stub (file upload works).
- Not a git repo currently.

---

## 2. Architecture — engine additions (3 small isolated units)

| Unit | File | Responsibility | Depends on |
|---|---|---|---|
| **AURA wrapper** | `server/src/aura.ts` (new, ~80 LOC, zero-dep) | `aura.text(key, fn)`: exact-hash cache → return cached else run `fn`, store, count tokens saved. Volatile-skip. `aura.stats()`. Env `AURA_URL` optionally proxies to live dashboard AURA. | none |
| **Narration layer** | `server/src/narrate.ts` (new, ~140 LOC) | `narrate(clip, transcriptExcerpt)` → `{ hook, caption, title, hashtags[], viralityScore, agentCredits }`. Each text field produced via `aura.text(...)`. LLM-optional; deterministic transcript-based fallback when no key. | `aura.ts` |
| **Engine wiring** | `server/src/server.ts` (edit) | After each clip renders, attach `clip.narration`. New endpoint `GET /api/clips/v1/aura/stats`. Optional `clip.coverUrl` when image gen enabled. | `narrate.ts`, `images.ts` |
| **HF image gen** | `server/src/images.ts` (new, ~90 LOC) | `generateCover(frame, title, topic)` via HF FLUX (`black-forest-labs/FLUX.1-schnell`). AURA-wrapped, cached to disk, optional/gated. Real frame extracted by ffmpeg as fallback cover. | `aura.ts`, `ffmpeg.ts` |

**Data flow (additions in brackets):**
```
upload → transcribe → detect candidates → render clip
   → [narrate(clip)  — AURA-wrapped, fallback-safe]
   → [optional generateCover(clip) — AURA-wrapped, gated]
   → clip = { ...existing, narration, coverUrl? }
```

### AURA behavior (mirrors backend/lib/aura.js concept)
- **FETCH:** exact-hash cache of `(taskType + normalized input)` → cached text/image path.
- **Volatile-skip:** never cache anything tagged volatile (n/a for clip copy, reserved for future).
- **Stats:** running `{ hits, misses, tokensSaved, imagesReused }` exposed at `/api/clips/v1/aura/stats` and surfaced live in the UI counter.
- **Config:** `AURA_URL` unset = local in-process wrapper (default, works offline). Set = forward narration/image-prompt calls to the dashboard's live AURA. **Zero code change to flip.**

### Narration fallbacks (the no-debug guarantee)
With **no API key**, deterministic outputs from the real transcript:
- `hook` = first strong sentence / question detected, trimmed to a punchy lead.
- `caption` = cleaned transcript excerpt.
- `title` = topic-cased summary (reuse existing `topicOf` + `titleFrom`).
- `hashtags` = topic + platform defaults (e.g. `#fyp #founders #money`).
- `viralityScore` = existing `compositeScore` (already computed).
With a key present, the LLM improves `hook/caption/title/hashtags`; AURA caches the call.

---

## 3. UI — "The Cutting Room"

Re-skins the existing `src/routes` pages into one cohesive console shell. The 11 pages stay; they gain the console treatment plus new narration + AURA panels. CSS-driven motion; React + Motion lib where available.

### Aesthetic direction
Cinematic editing console / signals-intelligence bay. Footage in raw, weapons-grade clips out.

- **Primary theme — Dark Cutting Room:** base `#0A0E1A`; faint bottom-center radial cyan backlight; ~3% film-grain overlay (`mix-blend-mode: overlay`); ultra-faint panel scanlines; panels float with `backdrop-filter: blur` + 1px cyan top-edge "bezel" highlight.
- **Secondary theme — Daylight Bay (toggle):** warm off-white base, same cyan/teal signal + amber money-accent, grain/scanlines dropped, surfaces become clean glass. Persisted in `uiStore`.
- **Color tokens (CSS vars):** `--base #0A0E1A`, `--signal #22D3EE`, `--signal-2 #2DD4BF`, `--money #FBBF24` (reserved ONLY for virality scores + the render button), plus theme-swapped neutrals.
- **Type:** Display = *Bricolage Grotesque*; Mono = *JetBrains Mono* (timecodes/scores/AURA stats/terminal lines); Body = neutral grotesk (*Geist*-like). No Inter/Roboto.

### Layout — three zones
- **Left rail "INTAKE":** sources as stacked evidence files; waveform sparkline + mono duration; pulsing cyan dot on active source.
- **Center "THE TABLE":** hero timeline rendered as a real waveform; detected highlights as glowing cyan capsules; amber bleeds into the glow as virality rises; hover shows a typing mono tooltip with the transcript excerpt.
- **Right rail "THE CUT":** selected clip narration card — hook in display type, caption, title, hashtag chips, radial amber virality gauge; below it the rendered vertical preview in a phone-shaped frame; AI cover (if enabled).

### Signature moments
1. **Boot:** scanline sweep top→bottom, staggered panel fade-up, mono terminal line `SHADDAI CUTTING ROOM // engine online`.
2. **Render:** scan-line sweeps timeline, highlights ignite one-by-one, **◊ AURA counter** ticks up live, finished clips slide into a "developed" tray.
3. **Empty state:** drifting HF-generated control-room scenery backdrop + line *"The table is clean. Feed it something."*

---

## 4. Hugging Face image generation (tiers)

Uses the same HF hub the Whisper model already loads from. Model: `black-forest-labs/FLUX.1-schnell` via HF Inference. Requires owner's HF token in env (`HF_TOKEN`); absent → all image features degrade to real ffmpeg-extracted frames / static placeholders.

- **Tier A — UI atmosphere art (CORE):** generate ONCE during build → save to `public/` as static assets (boot backdrop, empty-state scenery, loading art). Zero runtime cost/credits.
- **Tier B — Per-clip AI cover (CORE):** for each finished clip, optional branded cover = real extracted frame + FLUX stylized backdrop + AI title overlay. AURA-cached, gated by a UI toggle, never blocks render.
- **Tier C — Agent avatars + per-topic scenery (STRETCH, GATED):** only after the clipper is verified working end-to-end in the browser. Otherwise descoped to A+B for this build.

---

## 5. Dashboard pairing (media section)

Embeddable from the start; later drop-in is trivial.
- Whole UI mounts under one root + one base path; engine base via single config `CLIPS_API_BASE` (default `http://localhost:8787`).
- One mount point `<MediaClipper />`; dashboard media section renders it (div or iframe). No rebuild for the later integration.
- AURA: local wrapper now; set `AURA_URL` to the dashboard AURA endpoint later — no code change.
- Build sequence: **standalone working + verified FIRST** (owner's #1), then embed.

---

## 6. Test & verify plan (gates the stretch art)

1. Existing `npm run test:e2e` stays green (already passing).
2. `narrate.ts` unit test: with NO API key, returns real hook/caption/title/hashtags derived from a transcript; never throws.
3. AURA test: identical narration call #2 returns cached result and increments `tokensSaved`.
4. `images.ts` test: with NO `HF_TOKEN`, `generateCover` falls back to a real ffmpeg frame and never throws.
5. **Browser smoke (the verify gate):** boot engine + UI, drag in a real video, get clips WITH narration, watch the AURA counter move, confirm dark + light themes. Driven and shown to owner.
6. Only after #1–#5 pass → Tier C art is in scope.

---

## 7. Build approach — parallel agents (post-spec)

Three independent domains, no shared files → dispatch in parallel:
- **Agent A — Engine:** `aura.ts`, `narrate.ts`, `images.ts`, server wiring, all engine tests.
- **Agent B — UI:** Cutting Room shell + dark/light themes + narration & AURA panels + signature motion (frontend-design).
- **Agent C — Integration shell:** single `<MediaClipper />` mount point, `CLIPS_API_BASE`/`AURA_URL` config, dashboard-embed adapter.

Integration + full verify pass owned by the coordinator after agents return.

---

## 8. Out of scope (YAGNI for this build)

- URL import (stays a stub; file upload is the supported ingest).
- Persistent DB for engine state (in-memory is fine for single-user/beta).
- Live token billing / SHAD-Credits metering (separate dashboard integration build).
- Tier C art unless the verify gate passes.
