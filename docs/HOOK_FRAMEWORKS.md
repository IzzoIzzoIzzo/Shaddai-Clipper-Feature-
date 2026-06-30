# SHADDAI Clips — Hook Frameworks & Templates

> **Document Owner:** Content Strategist
> **Status:** v1.0
> **Last Updated:** 2025-06-06

---

## 1. Hook Architecture Overview

Hooks are the single most important element of a viral clip. The Hook Writer agent generates 3–5 variants per clip candidate using the frameworks below. Each hook type targets a different psychological trigger.

### Hook Output Model (matches API contract)

```json
{
  "hooks": {
    "curiosity": "...",
    "contrarian": "...",
    "quote": "...",
    "list": "...",
    "question": "..."
  }
}
```

### Hook Selection Rules

| Scenario | Preferred Hook Types |
|----------|---------------------|
| Clip has strong data/stats | List, Curiosity |
| Clip has emotional moment | Quote, Question |
| Clip has controversial take | Contrarian, Question |
| Clip has expert advice | Quote, List |
| Clip has story/narrative | Curiosity, Question |
| Clip has Q&A exchange | Question, Quote |

---

## 2. Hook Frameworks (5 Core Types)

### 2.1 Curiosity Gap Hook

**Psychological trigger:** Information gap — people hate not knowing.

**Formula:** `[Tease a specific result/secret] + [Just enough context] + [Emoji/ellipsis trigger]`

**Templates:**

| Template ID | Structure | Example |
|-------------|-----------|---------|
| `curiosity-1` | "The [number] [thing] that [achieved result]" | "The 1 question that got the founder a $50M check 🚀" |
| `curiosity-2` | "What [nobody/they] [verb] about [topic]" | "What nobody tells you about raising venture capital" |
| `curiosity-3` | "I asked [expert] [question]. Their answer shocked me." | "I asked a billionaire how he started. His answer shocked me." |
| `curiosity-4` | "This is why [common belief] is actually wrong." | "This is why cold emailing VCs is actually a waste of time" |
| `curiosity-5` | "[Expert] reveals the [thing] that changed everything" | "A YC partner reveals the 1 metric that changed how they evaluate startups" |
| `curiosity-6` | "The real reason [phenomenon] happens" | "The real reason 90% of startups fail in year one" |

**Length:** 40–70 characters (tight), 70–100 characters (loose)

**When it works:** Storytelling segments, personal anecdotes, before/after transformations

---

### 2.2 Contrarian Hook

**Psychological trigger:** Status quo rejection + "us vs. them" identity. People share things that make them feel smarter than the mainstream.

**Formula:** `[Stop/Don't/Avoid] + [conventional wisdom] + [better alternative]` OR `[Common belief] + is/was wrong`

**Templates:**

| Template ID | Structure | Example |
|-------------|-----------|---------|
| `contrarian-1` | "Stop [doing X]. Do [Y] instead." | "Stop optimizing your pitch deck. Do this instead." |
| `contrarian-2` | "[Common belief] is killing your [goal]" | "Perfectionism is killing your startup's growth" |
| `contrarian-3` | "Why [widely accepted thing] is actually [negative]" | "Why 'just build a great product' is actually terrible advice" |
| `contrarian-4` | "The [X] industry doesn't want you to know this" | "The VC industry doesn't want you to know this one trick" |
| `contrarian-5` | "Forget [common advice]. Here's what actually works." | "Forget 'follow your passion'. Here's what actually builds wealth." |
| `contrarian-6` | "Most people [do X]. Successful people [do Y]." | "Most people optimize for valuation. Smart founders optimize for control." |

**Length:** 45–80 characters

**When it works:** Segments where the speaker challenges conventional wisdom, debunks myths, or shares unpopular opinions

---

### 2.3 Numbered List Hook

**Psychological trigger:** Pattern recognition + easy cognitive commitment. Lists feel scannable and achievable.

**Formula:** `[Number] + [noun] + [promise/result]`

**Templates:**

| Template ID | Structure | Example |
|-------------|-----------|---------|
| `list-1` | "[Number] signs that [something is happening]" | "3 signs your startup is about to die" |
| `list-2` | "[Number] [things] that will [change outcome]" | "4 pricing changes that will 10x your revenue" |
| `list-3` | "The [number] [things] I [did/learned] to [achieve X]" | "The 5 calls I made to raise $10M in 2 weeks" |
| `list-4` | "[Number] [types] of [people/things] to avoid" | "7 types of investors you should never take money from" |
| `list-5` | "[Number] lessons from [experience/person]" | "3 fundraising lessons from a $50M founder" |
| `list-6` | "The top [number] [mistakes/things] [topic]" | "The top 5 mistakes founders make in board meetings" |

**Number psychology:** 3 (easy to remember), 5 (sweet spot), 7 (max cognitive load), 10 (for deep dives)

**Length:** 35–65 characters

**When it works:** Educational segments, structured advice, frameworks, step-by-step content

---

### 2.4 Quote Punch Hook

**Psychological trigger:** Social proof + wisdom transfer. Quotes feel shareable and quotable.

**Formula:** `"[Powerful short quote]" + — [Speaker]` OR `[Speaker] + [context] + "quote"`

**Templates:**

| Template ID | Structure | Example |
|-------------|-----------|---------|
| `quote-1` | `"[Powerful one-liner]" — @Speaker` | `"Fundraising is dating, not applying." — @founder_name` |
| `quote-2` | "[Speaker] just said what we're all thinking:" | "This founder just said what we're all thinking:" |
| `quote-3` | `"[Quote]" — [Speaker] + [context]` | `"Your first hire shouldn't be a CTO." — @YC_partner` |
| `quote-4` | `"The [noun] of [topic] is [insight]"` | `"The secret of fundraising is leverage, not polish"` |
| `quote-5` | "Best line I heard today:" + `"[quote]"` | "Best line I heard today: 'Revenue covers a multitude of sins'" |
| `quote-6` | "I'll never forget when [speaker] said..." | "I'll never forget when Paul Graham said 'Make something people want'" |

**Length:** 30–90 characters including attribution

**When it works:** Segments with a strong, memorable one-liner; expert interviews; emotional peaks

---

### 2.5 Question Hook

**Psychological trigger:** Curiosity + self-relevance — viewers instinctively answer before they can stop.

**Formula:** `[Open-ended/Provocative question] + [implied value in answer]`

**Templates:**

| Template ID | Structure | Example |
|-------------|-----------|---------|
| `question-1` | "Why do [people/VCs] [do X]?" | "Why do VCs ghost you after meeting?" |
| `question-2` | "What if [thing you believe] is [not true]?" | "What if your product-market fit score is lying to you?" |
| `question-3` | "How would you [solve X] in [scenario]?" | "How would you raise $1M with zero revenue?" |
| `question-4` | "What's the [one/single] thing that [determines X]?" | "What's the single metric that predicts startup success?" |
| `question-5` | "Do you [do X]? Here's why you should [Y] instead." | "Do you take every VC meeting? Here's why that's a mistake." |
| `question-6` | "When was the last time you [action]?" | "When was the last time you said no to a customer?" |

**Length:** 30–60 characters

**When it works:** Q&A segments, controversial topics, segments that challenge the viewer's self-assessment

---

## 3. Dynamic Hook Generation Rules

### 3.1 Tone Adaptation (from BrandProfile)

| Brand Voice | Hook Preference | Avoid |
|-------------|----------------|-------|
| Professional | List, Question (mild) | Exaggeration, hard emojis |
| Casual | Curiosity, Question | Overly formal structure |
| Humorous | Contrarian, Quote (funny) | Dry numbered lists |
| Educational | List, Curiosity | Clickbait-style hooks |
| Inspirational | Quote, Curiosity | Negative/contrarian hooks |
| Confrontational | Contrarian, Question | Soft/cautious hooks |

### 3.2 Length Optimization by Platform

| Platform | Hook Max Length | Notes |
|----------|----------------|-------|
| TikTok (on-screen text) | 55 characters | Must fit in top 1/3 of vertical video |
| TikTok (caption) | 150 characters | Full hook in caption |
| Instagram Reels | 65 characters | On-screen overlay text |
| YouTube Shorts | 60 characters | Title bar area |
| X/Twitter | 100 characters | Leaves room for hashtags + link |
| LinkedIn | 120 characters | First line of post, must hook skimmers |
| Email subject line | 60 characters | Must avoid spam triggers |

### 3.3 Visual Hook Overlay Rules (for video renderer)

```
┌─────────────────────┐
│                     │
│  ← Top 25% safe    │
│  ┌───────────────┐ │
│  │ HOOK TEXT     │ │ ← Center-safe zone, max 3 lines
│  │ white on dark │ │   48px+ font size
│  │ drop shadow   │ │
│  └───────────────┘ │
│                     │
│                     │
│  ← Speaker face     │
│                     │
│  ← Bottom 15%:     │
│    captions/subtitles│
└─────────────────────┘
```

### 3.4 Hook Quality Checklist (for scoring)

| Criterion | Weight | What Judges |
|-----------|--------|-------------|
| **Curiosity gap** | 25% | Does it make you want to see the answer? |
| **Specificity** | 20% | Numbers, names, concrete outcomes vs. vague claims |
| **Emotion** | 15% | Does it trigger curiosity, FOMO, surprise, or recognition? |
| **Brevity** | 15% | Can it be read in < 2 seconds? |
| **Clarity** | 15% | Is the topic immediately obvious? |
| **Brand alignment** | 10% | Does it match the brand voice profile? |

---

## 4. Hook Variant Ranking (Output Ordering)

When 5 hooks are generated per clip, they are ranked and returned in this priority:

1. **Top pick** — Highest predicted engagement (mixture of all factors)
2. **Curiosity variant** — Highest curiosity gap score
3. **Contrarian variant** — If applicable, highest novelty score
4. **Quote variant** — If applicable, highest quotability score
5. **Question variant** — Highest self-relevance score

The "top pick" uses an ensemble score:

```
ensemble_score = (curiosity_score × 0.30) + (specificity × 0.25) + (emotional_impact × 0.20) + (brevity × 0.15) + (brand_fit × 0.10)
```

---

## 5. Hook Testing & Learning

### A/B Test Template (Future V2 feature)

```json
{
  "hookTest": {
    "clipId": "clip_001",
    "variants": ["hook_a", "hook_b", "hook_c"],
    "platform": "tiktok",
    "winningHook": null,  // Set after 24h data
    "impressions": { "hook_a": 0, "hook_b": 0, "hook_c": 0 },
    "engagementRate": { "hook_a": 0, "hook_b": 0, "hook_c": 0 }
  }
}
```

### Learning Signals

- If user manually edits a hook generation → store edit pattern
- If user selects hook variant B over default A → preference signal
- If user thumbs-downs a hook type repeatedly → reduce frequency of that type

---

*End of Hook Frameworks Document v1.0*