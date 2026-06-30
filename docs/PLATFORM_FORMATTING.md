# SHADDAI Clips — Platform Formatting Rules

> **Document Owner:** Content Strategist
> **Status:** v1.0
> **Last Updated:** 2025-06-06

---

## 1. Platform Matrix

| Parameter | TikTok | Instagram Reels | YouTube Shorts | X/Twitter | LinkedIn | Email |
|-----------|--------|----------------|---------------|-----------|----------|-------|
| Aspect Ratio | 9:16 | 9:16 | 9:16 | 16:9 / 1:1 | 16:9 / 4:5 | N/A |
| Resolution | 1080×1920 | 1080×1920 | 1080×1920 | 1920×1080 | 1920×1080 | N/A |
| Max Duration | 60s | 90s | 60s | 140s | 10min | N/A |
| Optimal Duration | 21–34s | 15–30s | 15–45s | 30–60s | 30–90s | N/A |
| Format | H.264 MP4 | H.264 MP4 | H.264 MP4 | H.264 MP4 | H.264 MP4 | HTML |
| Audio | AAC 128kbps | AAC 128kbps | AAC 128kbps | AAC 128kbps | AAC 128kbps | N/A |
| Max File Size | 500MB | 650MB | 500MB | 512MB | 5GB | N/A |
| Caption Overlay | Yes — burn-in | Yes — optional SRT | Yes — burn-in | Optional | Minimal | N/A |
| Text Overlay | Hook top 1/3 | Hook top 1/3 | Hook top 1/3 | Subtitles only | Subtitles only | N/A |

---

## 2. Video Formatting Rules

### 2.1 Aspect Ratio Adaptation

When source video is landscape (16:9) and target is vertical (9:16):

```
┌───────────────────────┐
│                       │
│  ┌─────────────────┐  │
│  │                 │  │
│  │  9:16 Crop      │  │
│  │  (center 55%)   │  │
│  │                 │  │
│  │                 │  │
│  └─────────────────┘  │
│                       │
│  ← 16:9 Source Frame →│
└───────────────────────┘
```

**Rules:**
- When source 16:9 → 9:16: Center-crop with intelligent tracking (detect speaker face, keep in frame)
- When source 9:16 → 16:9: Add blurred background extension (50% opacity blur of source)
- When source 4:3 or other: Letterbox or smart-crop to target ratio
- Never stretch or distort: maintain source aspect ratio always

### 2.2 Safe Zones

```
9:16 Vertical                          16:9 Horizontal
┌─────────────────────┐                ┌─────────────────────────────────────┐
│ ███████████████████ │  Top 12%       │                                     │
│ ██ HOOK  TEXT   ██ │  (hook area)   │     ████████████████████████        │
│ ███████████████████ │                │     ██ HOOK TEXT (optional) ██      │
│                     │                │     ████████████████████████        │
│                     │                │                                     │
│    Content Area     │                │          Content Area               │
│                     │                │                                     │
│                     │                │                                     │
│     ███████████     │  Bottom 15%    │         ████████████████            │
│     ██ Subs  ██     │  (subtitles)   │         ██ Subtitles ██            │
│     ███████████     │                │         ████████████████            │
└─────────────────────┘                └─────────────────────────────────────┘
```

### 2.3 Text Overlay Rules

| Element | Font | Size | Color | Position | Animation |
|---------|------|------|-------|----------|-----------|
| Hook | Sans-serif bold (Montserrat/Inter) | 48–60px | White on dark band | Top 12% safe zone | Fade in (0.3s) |
| Lower third (speaker name) | Sans-serif regular | 32px | White + semi-transparent bg | Bottom-left safe zone | Slide up |
| Subtitles | Sans-serif | 28px | White on 60% black bg | Bottom 15% safe zone | Word-by-word highlight |
| Key numbers/stats | Display bold | 64–80px | Accent color (brand) | Any safe zone | Scale pop |

### 2.4 Video Styling

| Style Element | TikTok | Reels | Shorts | X | LinkedIn |
|--------------|--------|-------|--------|---|----------|
| Subtitles | Required — always on | Required | Required | Optional | Optional |
| Hook overlay | Required | Required | Required | Optional | Not recommended |
| Transitions | Fast cuts (300ms) | Smooth (500ms) | Standard | Minimal | Minimal |
| Background music | Trending audio | Optional ambient | Optional | None | None |
| Brand watermark | Free tier only | Free tier only | Free tier only | None | None |

---

## 3. Tonality & Voice Guidelines per Platform

### TikTok
- **Tone:** Casual, energetic, street-smart
- **First 3 seconds:** MUST grab attention — no slow intros
- **Pacing:** Fast cuts, high energy, minimal silence
- **Text on screen:** Hook visible throughout, key words highlighted
- **Vibe:** "Friend sharing a secret" not "expert lecturing"

### Instagram Reels
- **Tone:** Polished, aesthetic, aspirational
- **First 3 seconds:** Visually compelling + hook
- **Pacing:** Slightly slower than TikTok, more breathing room
- **Text on screen:** Tasteful overlays, branded fonts
- **Vibe:** "Curated insight" — premium but approachable

### YouTube Shorts
- **Tone:** Informative, helpful, clear
- **First 3 seconds:** Hook + clear topic indicator
- **Pacing:** Standard educational pacing
- **Text on screen:** Hook in title area, captions below
- **Vibe:** "Quick lesson" — Google-friendly, search-optimized

### X/Twitter
- **Tone:** Smart, witty, contrarian (when appropriate)
- **Format:** Native video + thread expansion
- **Text:** No aggressive overlay, clean subtitles if needed
- **Vibe:** "Interesting take" — shareable opinion, not promo

### LinkedIn
- **Tone:** Professional, insightful, generous
- **Format:** Native video + long-form text post
- **Text:** Minimal video overlays, professional subtitles
- **Vibe:** "Valuable perspective" — thought leadership, not self-promotion

### Email
- **Tone:** Direct, personal, value-first
- **Format:** Short intro + embedded/linked video + key takeaway
- **Vibe:** "Insider insight" — like a personal note from a curator

---

## 4. Clip Duration Optimization

### Duration Sweet Spots by Content Type

| Content Type | Optimal Duration | Max Duration | Reasoning |
|-------------|----------------|-------------|-----------|
| Single insight/advice | 15–25s | 45s | Short attention, quick value |
| Story/anecdote | 30–45s | 75s | Needs time for narrative arc |
| Tutorial/how-to | 30–60s | 90s | Step-by-step needs room |
| Interview excerpt | 20–40s | 60s | Quote + reaction is enough |
| Controversial take | 15–30s | 45s | Long = loses punch |
| Emotional moment | 20–35s | 50s | Impact peaks early |

### Clip Candidate Duration Filtering

Clip candidates from Detection are filtered by these rules before Generation:

```
if (composite_score > 0.8) AND (duration between 15s AND 60s):
    auto_select for generation
elif (composite_score > 0.7) AND (duration between 15s AND 75s):
    mark as candidate for manual review
else:
    auto_reject (or archive for "all candidates" view)
```

---

## 5. Platform Export Readiness

### Pre-Export Checklist

| Check | TikTok | Reels | Shorts | X | LinkedIn |
|-------|--------|-------|--------|---|----------|
| Duration ≤ max | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resolution correct | ✅ | ✅ | ✅ | ✅ | ✅ |
| Aspect ratio correct | ✅ | ✅ | ✅ | ✅ | N/A |
| Hook overlay present | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Subtitles burned in | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Caption < max chars | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hashtags ≤ limit | ✅ | ✅ | ✅ | ✅ | ✅ |
| No banned words | ✅ | ✅ | ✅ | ✅ | ✅ |
| Brand watermark (if tier) | ✅ | ✅ | ✅ | N/A | N/A |

---

*End of Platform Formatting Rules Document v1.0*