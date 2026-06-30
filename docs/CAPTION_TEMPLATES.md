# SHADDAI Clips — Caption Templates & Platform Strategy

> **Document Owner:** Content Strategist
> **Status:** v1.0
> **Last Updated:** 2025-06-06

---

## 1. Caption Architecture

Each generated clip produces two caption variants:

```
captions: {
  primary: "2–3 sentence caption optimized for scroll-stopping",
  secondary: "Shorter, punchier caption for quick consumption"
}
```

The Caption Writer agent generates these using platform-specific templates below.

### Caption Length Rules by Platform

| Platform | Primary Max | Secondary Max | Best Caption Length |
|----------|-------------|---------------|-------------------|
| **TikTok** | 150 chars | 100 chars | 80–120 chars (under the fold text) |
| **Instagram Reels** | 2,200 chars | 150 chars | 100–200 chars (first line is critical) |
| **YouTube Shorts** | 100 chars (title) | 500 chars (desc) | Title: 40–60 chars |
| **X/Twitter** | 280 chars | 140 chars | First tweet: 200–260 chars |
| **LinkedIn** | 3,000 chars | 150 chars | 600–1,200 chars (sweet spot) |
| **Email subject** | 60 chars | 40 chars | Subject: 30–50 chars |

---

## 2. Platform-Specific Caption Templates

### 2.1 TikTok Captions

**Format:** Hook-first, hashtag-heavy, conversational.

**Structure:**
```
[Scroll-stopping hook sentence]
[2–3 sentence value/context]
[Call to action]
[Hashtag cluster]
```

**Templates:**

| ID | Style | Template | Example |
|----|-------|----------|---------|
| `tt-1` | Educational | "[Hook]. Here's the breakdown: [key insight]. [Actionable tip]. Save this for later 📌" | "The 1 question that got this founder $50M. Here's the breakdown: VCs smell desperation. Walk in ready to walk out. Save this for later 📌" |
| `tt-2` | Storytelling | "[Hook] [Brief story setup] [Punchline/outcome]. [Lesson]. Follow for more [topic] 🔥" | "I asked a billionaire how he started. He said 'I sold shoes from my trunk.' 3 years later, $100M. The lesson? Start before you're ready. Follow for more startup stories 🔥" |
| `tt-3` | Controversial | "[Slightly spicy take] [Why you're wrong if you disagree]. [Nuance/context]. [CTA] Don't @ me." | "Cold emailing VCs is a waste of time. If you're spending hours crafting perfect outreach, you're doing it wrong. Warm intros > cold emails, every time. Don't @ me." |
| `tt-4` | Q&A | "Question: [question]? Answer: [answer]. Here's why: [reason]. [Follow/CTA]" | "Question: When should you raise your Series A? Answer: When you don't need it. Here's why: desperation kills valuation. Follow for more fundraising tips 💰" |

---

### 2.2 Instagram Reels Captions

**Format:** First 2 lines are critical (they appear before "more"). Storytelling + community vibe.

**Structure:**
```
[Line 1: Hook — must grab in first 125 chars before fold]
[Line 2-3: Context/value]
[Line 4: CTA + engagement bait (comment prompt)]
[5–8 relevant hashtags]
```

**Templates:**

| ID | Style | First 125 Chars Template |
|----|-------|-------------------------|
| `ig-1` | Educational | "Stop [bad practice]. Here's what actually works 👇\n[2-3 bullet points of value]\nTag a founder who needs to see this." |
| `ig-2` | Behind-the-scenes | "Nobody talks about [hidden part of process]. [Speaker] shares what really happens 👀\n[Insight/lesson]\nSave this for your next [meeting/call]!" |
| `ig-3` | Emotional | "[Emotional hook question]\n[Speaker's vulnerable moment/story]\nWe've all been there. Comment [emoji] if you relate." |
| `ig-4` | Checklist | "[Number] things I wish I knew about [topic]:\n1️⃣ [point 1]\n2️⃣ [point 2]\n3️⃣ [point 3]\nDouble tap if this was helpful ❤️" |

**Hashtag strategy for Reels:**
- 3 high-volume (500K+ posts): e.g. #entrepreneurship #startup #founder
- 3 medium-volume (50K–500K): e.g. #venturecapital #fundraisingtips #startupadvice
- 2 niche (1K–50K): e.g. #saasfounder #seedfunding

---

### 2.3 YouTube Shorts Captions

**Format:** Title-driven (the title IS the caption). Description is secondary for SEO.

**Title templates:**

| ID | Style | Template |
|----|-------|----------|
| `ys-1` | How-to | "How to [do X] in [timeframe/simple steps] 🔥" |
| `ys-2` | Question | "[Provocative question]? (Here's the truth)" |
| `ys-3` | List | "[Number] [things] [outcome] 💯" |
| `ys-4` | Story | "I [action] and [unexpected result] 😱" |

**Description templates:**

| ID | Style | Template |
|----|-------|----------|
| `ys-d1` | Standard | "Full breakdown in the comments! [1-sentence summary]\n\n#shorts #[topic] #[niche]" |
| `ys-d2` | Expanded | "[Same as hook but slightly expanded]\n\nComment [prompt] if you agree!\n\n#shorts #[topic] #[niche]" |

---

### 2.4 X/Twitter Post & Thread

**Format:** Punchy, high-signal-to-noise. Threads expand clip insight.

**Single post template:**
```
[Punchy hook — 80-120 chars]

[MEDIA: clip video]

[Value sentence — 40-80 chars]
[Optional: 2-3 related hashtags]
```

**Thread templates (4-5 tweets):**

| ID | Style | Structure |
|----|-------|-----------|
| `x-th-1` | Deep dive | 1: Hook tweet + video clip\n2: "Here's the breakdown 🧵"\n3: Key insight #1\n4: Key insight #2\n5: CTA + question |
| `x-th-2` | Framework | 1: "A framework for [topic]:" + video\n2: Step 1 — [label]\n3: Step 2 — [label]\n4: Step 3 — [label]\n5: "Save this thread. Follow @[user] for more." |
| `x-th-3` | Hot take | 1: Hot take statement + video\n2: "Let me explain 🧵"\n3: Nuance/evidence\n4: Personal experience\n5: "What's your take? 👇" |

**Thread generation rules:**
- Each tweet: 150–250 characters
- Thread: 4–5 tweets total (including opener with video)
- Last tweet always has a question or CTA
- No hashtags in thread body (use 1–2 in last tweet only)

---

### 2.5 LinkedIn Post Templates

**Format:** Professional but not boring. Value-first, story-forward. Long-form is okay.

**Structure:**
```
[Line break]
[Hook line — 60-80 chars, bold first sentence]

[2-4 short paragraphs, each 1-3 lines]

[Numbered framework or key takeaway bullets]

[Call to action — question preferred]

[3-5 hashtags]
```

**Templates:**

| ID | Style | Template |
|----|-------|----------|
| `li-1` | Insight share | "Most founders get [topic] wrong.\n\nThey think [common misconception].\n\nBut here's what [expert/speaker] taught me:\n\n→ [Insight 1]\n→ [Insight 2]\n→ [Insight 3]\n\nThe result? [Outcome].\n\nHave you experienced this? Drop your take in the comments 👇\n\n#[hashtag1] #[hashtag2] #[hashtag3]" |
| `li-2` | Story-driven | "[Relatable struggle question]?\n\nA few years ago, I [short personal/professional story].\n\n[Speaker] broke it down perfectly in [context of clip]:\n\n[Quote or key insight]\n\nThis changed how I think about [topic].\n\nWould love to hear your thoughts — [question]?\n\n#[hashtag1] #[hashtag2] #[hashtag3]" |
| `li-3` | List/framework | "[Number] lessons on [topic] from [speaker/experience]:\n\n1. [Lesson 1]\n2. [Lesson 2]\n3. [Lesson 3]\n4. [Lesson 4]\n5. [Lesson 5]\n\nWhich one resonates most with you?\n\n[Video attachment]\n\n#[hashtag1] #[hashtag2] #[hashtag3]" |
| `li-4` | Hot take | "I used to believe [old belief].\n\nThen [speaker/event] changed my mind.\n\nHere's why: [reasoning].\n\nIf you're still [old behavior], consider this:\n[Evidence/data from clip]\n\nI'm curious — what's a belief you've changed recently?\n\n#[hashtag1] #[hashtag2] #[hashtag3]" |

**LinkedIn formatting rules:**
- Every paragraph separated by a blank line
- No more than 3 sentences per paragraph
- Use bullets (→, •, —) for lists, not numbered unless framework
- Keep total post 600–1,200 characters
- Video should auto-play (upload natively or link)

---

### 2.6 Email / Newsletter Template

**Format:** Short, skimmable, link-driven.

**Structure:**
```
Subject: [Hook — 30-50 chars, avoid CAPS and $$$]

Preheader: [1-sentence teaser — 50-100 chars]

[Greeting]

[1-2 sentence intro hook]

▶️ [Link text: "Watch the full clip"]
[Link or embed]

[1-2 sentence value summary]

[Optional: 1 supporting stat or quote]

[CTA — question or reply prompt]

— [Sender name]
```

**Templates:**

| ID | Style | Subject Line Template |
|----|-------|----------------------|
| `em-1` | Curiosity | "The [number] [thing] that [achieved result]" |
| `em-2` | Urgent | "[Topic] advice you can't afford to miss" |
| `em-3` | Personalized | "[Name], here's what [speaker] said about [topic]" |
| `em-4` | Question | "Quick question about [topic]?" |

---

## 3. CTA (Call to Action) Library

Generated CTAs vary by platform and content type.

### CTA Categories

| Category | Emotion | Best For | Examples |
|----------|---------|----------|----------|
| **Engagement bait** | Curiosity | TikTok, Reels | "Comment your hot take 👇" |
| **Save/Bookmark** | Utility | TikTok, Reels, Shorts | "Save this for your next meeting 📌" |
| **Follow** | Identity | All platforms | "Follow for more [topic] 🔥" |
| **Question** | Curiosity | LinkedIn, X | "Which of these resonates with you?" |
| **Share/Tag** | Social | TikTok, Reels | "Tag a founder who needs to hear this" |
| **Link** | Action | LinkedIn, Email, X | "Full episode linked in bio/comment" |
| **Download** | Utility | Email | "Get the full transcript here →" |

### Platform-Specific CTA Rules

| Platform | CTA Placement | Max CTAs | Best CTA Type |
|----------|---------------|----------|---------------|
| TikTok | End of caption | 1 | Save + Follow |
| Reels | End of caption | 1 | Comment + Save |
| Shorts | End of description | 1 | Comment |
| X | Last tweet in thread | 1 | Question (reply) |
| LinkedIn | Last paragraph | 1-2 | Question + Tag |
| Email | Middle + end | 2 | Link + Reply |

---

## 4. Caption Quality Scoring

| Criterion | Weight | Judges |
|-----------|--------|--------|
| **Hook-present** | 20% | First line is a grabber |
| **Value clarity** | 25% | Can reader understand the takeaway in 3 seconds? |
| **Platform fit** | 20% | Length, tone, and format match platform norms |
| **CTA strength** | 15% | Clear next action for the viewer |
| **Readability** | 10% | Short sentences, line breaks, scannable |
| **Brand voice** | 10% | Matches brand tone profile |

### Rejection Thresholds

A caption is rejected and regenerated if:
- First 60 chars contain no hook element
- Engagement bait CTA is missing on TikTok/Reels
- LinkedIn post exceeds 1,500 chars with no line breaks
- X post > 280 chars (before media)
- Email subject > 60 chars or contains spam words

---

## 5. Accessibility Caption Rules

Every generated clip gets an alt-text/accessibility caption:

```
altText: "Clip excerpt from [source title]: [speaker] discusses [topic]. [1-2 sentence summary]."
```

**Format:** Plain text, no emojis, no hashtags, under 280 characters.

---

*End of Caption Templates Document v1.0*