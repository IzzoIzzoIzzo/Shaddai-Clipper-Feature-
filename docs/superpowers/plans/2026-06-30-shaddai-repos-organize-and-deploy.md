# SHADDAI Repos — Organize, License, SEO & Deploy (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to work this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This is an ops/docs/deploy plan (git + config + copy), not TDD code — "verify" steps replace unit tests where there is nothing to unit-test.

**Goal:** Get the clipper live on Render, wire it into the dashboard, add licenses + SEO across the projects, and safely bring the main private `IzzoIzzoIzzo/Shaddai` repo up to date — without overwriting diverged work.

**Architecture:** Three git repos. (1) `Shaddai-Clipper-Feature-` = the standalone clipper (its own Render service). (2) `IzzoIzzoIzzo/Shaddai` = the main private product (dashboard + Shaddai World; auto-deploys to Render). (3) Working folder `SHADDAI-MASTER-BACKUP-20260630` = local, not a git repo. The clipper embeds into the dashboard via iframe (Pro-gated).

**Ordering principle:** SAFE → RISKY. Do the low-risk, unambiguous work first (A, D-clipper, E-clipper, Render deploy). The HIGH-RISK main-repo sync (C) is last and is gated behind a read-only divergence assessment + explicit owner go/no-go. **Never force-push or bulk-overwrite the main repo without the checkpoint in Task 6.**

**Blocking decision (must be answered before Task 5–6):** Which is source of truth — the working folder or the `Shaddai` repo? Task 5 produces the evidence; the owner decides at the Task 6 checkpoint.

---

## Task 1: Clipper repo — README, LICENSE, description, SEO meta (SAFE)

**Repo:** `Shaddai-Clipper-Feature-` (local: `SHADDAI CLIPPER/`)
**Files:** Create `LICENSE`, refine `README.md`, add SEO meta to `index.html`, set GitHub description/topics.

- [ ] **Step 1: Add a LICENSE.** Decide license first (see Task 4 decision). Default assumption: proprietary "All rights reserved" (it's a paid product). Create `SHADDAI CLIPPER/LICENSE`:
```
Copyright (c) 2026 SHADDAI / IzzoIzzoIzzo. All rights reserved.

This software and its source code are proprietary and confidential.
No permission is granted to use, copy, modify, or distribute this software,
in whole or in part, without the express written permission of the owner.
```

- [ ] **Step 2: Add SEO / social meta** to `SHADDAI CLIPPER/index.html` `<head>` (title, description, Open Graph, Twitter card):
```html
<title>SHADDAI Clipper — Long videos into captioned vertical shorts</title>
<meta name="description" content="Turn long videos into captioned, vertical short clips for TikTok, Reels & Shorts. Auto-transcribed, highlight-detected, ready to post. Part of the SHADDAI agent platform.">
<meta property="og:title" content="SHADDAI Clipper">
<meta property="og:description" content="Long videos → captioned vertical shorts. Auto-transcribed & highlight-detected.">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

- [ ] **Step 3: Verify build still works** (SEO meta must not break Vite):
Run: `cd "SHADDAI CLIPPER" && npm run build`
Expected: `built in …` success, no errors.

- [ ] **Step 4: Set the GitHub repo description + topics.**
Run: `gh repo edit IzzoIzzoIzzo/Shaddai-Clipper-Feature- --description "SHADDAI Clipper — turn long videos into captioned vertical shorts (ffmpeg + Whisper). Pro feature of the SHADDAI platform." --add-topic video,ffmpeg,whisper,shorts,shaddai`

- [ ] **Step 5: Commit + push.**
```bash
cd "SHADDAI CLIPPER"
git add LICENSE README.md index.html
git commit -m "docs: add LICENSE + SEO meta + repo description"
git push origin main
```

---

## Task 2: Deploy the clipper to Render (SAFE — owner action + verify)

**Depends on:** Task 1 pushed. Needs the owner's Render account (I can't log in).

- [ ] **Step 1: Owner creates the Render service.** Render → New → Blueprint → pick `Shaddai-Clipper-Feature-` (reads `render.yaml`). Plan: Starter min, Standard recommended. Create.

- [ ] **Step 2: Wait for first deploy to go green.** Render shows "Live". Note the service URL.

- [ ] **Step 3: Verify the hosted engine boots.**
Run (replace URL): `curl -s https://<clipper-url>/api/clips/v1/health`
Expected: `{"ok":true,"engine":"ffmpeg-static + transformers.js whisper"}`

- [ ] **Step 4: Verify the hosted UI serves.**
Run: `curl -s -o /dev/null -w "%{http_code}\n" https://<clipper-url>/clips`
Expected: `200`

- [ ] **Step 5: If URL ≠ `shaddai-clipper.onrender.com`, record the real URL** for Task 3 (dashboard `CLIP_ENGINE` + CSP).

---

## Task 3: Wire the clipper into the dashboard `index.html` (MEDIUM)

**Target:** the authoritative dashboard `index.html` (decided in Task 6; until then, apply to whichever copy is confirmed current). Surgical edits only — do NOT replace the whole file.

> The exact edits already exist and are proven in the working folder `SHADDAI-MASTER-BACKUP-20260630/public/index.html`. Re-apply these five changes to the authoritative file.

- [ ] **Step 1: CSP `connect-src`** — add the clipper origins. Find the `connect-src` list, append:
`http://localhost:8787 http://127.0.0.1:8787 https://<clipper-url>`

- [ ] **Step 2: CSP `frame-src`** — add the same origins after `'self'`.

- [ ] **Step 3: Module tile copy** — update the VIDEO CLIPPER tile subtitle to `Long video → captioned vertical shorts` / `SHADDAI engine · ffmpeg + Whisper · TikTok/Reels`.

- [ ] **Step 4: Replace `_openClipperOverlay()`** with the Pro-gated iframe-embed version (localhost in dev, `<clipper-url>` in prod), plus the health probe `_clipperProbe()` and the fallback, and rename the old cobalt overlay to `_openClipperLegacy()`. (Full code is in the working-folder version — copy those functions verbatim, updating the prod URL.)

- [ ] **Step 5: Verify** — extract the inserted JS block and syntax-check:
`node --check <extracted-block>.js` → Expected: no output (valid).

- [ ] **Step 6: Commit to the main repo** (only after Task 6 confirms it's safe):
```bash
git add public/index.html
git commit -m "feat(media): wire Video Clipper module to the hosted clip engine (Pro-gated)"
```

---

## Task 4: License decision + files across repos (SAFE — needs 1 decision)

- [ ] **Step 1: Owner picks the license model** (blocking): **(a) Proprietary/all-rights-reserved** (recommended for a paid product), or **(b) source-available** (e.g. BSL/PolyForm), or **(c) open (MIT/Apache-2.0)** for parts meant to be public.

- [ ] **Step 2: Add the chosen `LICENSE`** to each repo root that needs it (`Shaddai-Clipper-Feature-` from Task 1; `Shaddai` in Task 6's branch).

- [ ] **Step 3: Add a short license line** to each README ("Licensed under … — see LICENSE").

- [ ] **Step 4: Commit** in each repo where added.

---

## Task 5: READ-ONLY divergence assessment of the main repo (SAFE — produces the evidence)

**No writes. This is the safety gate's input.** Working folder = `SHADDAI-MASTER-BACKUP-20260630`; fresh clone already at `Desktop/_shaddai_deploy`.

- [ ] **Step 1: Compare the dashboards.**
Run: `diff <(git -C _shaddai_deploy show HEAD:public/index.html) "SHADDAI-MASTER-BACKUP-20260630/public/index.html" | wc -l`
Record how different they are (lines changed).

- [ ] **Step 2: List what the repo has that the folder might not (and vice-versa).**
Run: `diff -rq _shaddai_deploy "SHADDAI-MASTER-BACKUP-20260630" 2>/dev/null | grep -v "\.git" | head -60`
Record: files only-in-repo, only-in-folder, and differing.

- [ ] **Step 3: Check for large binaries** in the folder that shouldn't go to git (Shaddai World models/images):
Run: `find "SHADDAI-MASTER-BACKUP-20260630" -type f -size +5M -not -path "*/node_modules/*" | head -30`
Record the big-asset list → these need a `.gitignore`/LFS/host-elsewhere decision.

- [ ] **Step 4: Check repo's `.gitignore` + last commit date** to see how stale it is.
Run: `cat _shaddai_deploy/.gitignore; git -C _shaddai_deploy log -1 --format="%ci %s"`

- [ ] **Step 5: Write findings** into `docs/superpowers/notes/repo-divergence-2026-06-30.md` (repo-only files, folder-only files, big binaries, recommended sync direction).

---

## Task 6: SAFETY CHECKPOINT — owner decides sync direction (GATE)

- [ ] **Step 1: Present the Task 5 findings** to the owner: what differs, what would be added/overwritten, big-binary risk.

- [ ] **Step 2: Owner chooses the direction:**
  - **(a) Folder → repo** (folder is truth): bring the repo up to the folder, excluding big binaries (gitignore/LFS).
  - **(b) Repo → folder** (repo is truth): only apply the clipper wiring (Task 3) to the repo; leave the rest.
  - **(c) Selective**: cherry-pick specific files (dashboard + world) after review.

- [ ] **Step 3: Do NOT proceed to Task 7 until the owner picks (a), (b), or (c).**

---

## Task 7: Execute the main-repo sync on a BRANCH (HIGH — reversible)

**Never commit straight to `main`. Use a branch + PR so it's reviewable and revertible before it hits production Render.**

- [ ] **Step 1: Branch the clone.**
Run: `git -C _shaddai_deploy checkout -b clipper-and-sync`

- [ ] **Step 2: Apply the chosen changes** from Task 6 (copy the agreed files into the clone; add `.gitignore` entries for big binaries so they're excluded; apply Task 3 clipper wiring; add LICENSE from Task 4).

- [ ] **Step 3: Review the diff before committing.**
Run: `git -C _shaddai_deploy add -A && git -C _shaddai_deploy status && git -C _shaddai_deploy diff --cached --stat`
Expected: only intended files; NO node_modules/big binaries; sane file count. If anything unexpected, stop and fix `.gitignore`.

- [ ] **Step 4: Commit + push the branch.**
```bash
git -C _shaddai_deploy commit -m "feat: clipper wiring + sync dashboard/world + LICENSE + SEO"
git -C _shaddai_deploy push -u origin clipper-and-sync
```

- [ ] **Step 5: Open a PR** for owner review (does not deploy prod until merged):
Run: `gh pr create -R IzzoIzzoIzzo/Shaddai --base main --head clipper-and-sync --title "Clipper wiring + repo sync + licenses + SEO" --body "See commit. Review before merge — merging triggers Render deploy."`

- [ ] **Step 6: Owner reviews + merges** → Render auto-deploys the dashboard. Verify the live dashboard loads and Media → Video Clipper embeds the hosted engine.

---

## Task 8: SEO across dashboard + Shaddai World (SAFE — in the same branch)

- [ ] **Step 1: Dashboard `<head>`** — ensure `<title>`, `meta description`, Open Graph (`og:title/description/image/url`), and Twitter card are present and on-brand. Add if missing.

- [ ] **Step 2: Shaddai World `<head>`** (`public/SHADDAI-WORLD-3D.html`) — same set, world-specific copy.

- [ ] **Step 3: Verify** each page still loads (open locally / curl 200) and titles render.

- [ ] **Step 4: Include in the Task 7 branch/PR** (don't create a separate deploy).

---

## Self-Review (against the ask)

- **"Update the clipper"** → Task 1 (README/LICENSE/SEO/description) + push.
- **"Licenses everything"** → Task 4 (decision) applied in Tasks 1 & 7.
- **"SEO wording everything"** → Task 1 (clipper), Task 8 (dashboard + world).
- **"Organize all info"** → Task 5 note + Task 7 structured branch/PR; docs consolidated per repo.
- **"Update main repo with world + clipper + dashboard"** → Tasks 5→6→7 (assessment → decision → branch/PR sync), clipper embedded via Task 3 wiring.
- **Render deploy** → Task 2.
- **Placeholder scan:** `<clipper-url>` is an intentional runtime value from Task 2, resolved before Task 3. License text finalized at Task 4 decision. No other placeholders.
- **Scope check:** multi-subsystem, so it's decomposed into safe sub-tasks with a hard gate (Task 6) before the one high-risk action.
- **Consistency:** `CLIP_ENGINE` prod URL is set once (Task 2) and reused in Task 3 + CSP; branch name `clipper-and-sync` consistent Tasks 7–8.
