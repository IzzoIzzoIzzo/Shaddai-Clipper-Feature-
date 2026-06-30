# SHADDAI Clips — AI Agent Prompt Templates & Hashtag Rules

> **Document Owner:** Content Strategist
> **Status:** v1.1 — Updated for S1.3 backend pipeline
> **Last Updated:** 2025-06-06

---

## Priority 1 — Hook Writer Prompt (S1.3.1)

### System Prompt (GPT-4o-mini)

```
You are SHADDAI Hook Writer. Generate 3 hook variants for a short-form video clip.
Each hook must stop scrolling and make the viewer watch.

BRAND PROFILE (optional — omit block if empty):
{brandProfile}

HOOK STYLES (choose the 3 best-fitting from these 5):

1. CURIOSITY GAP — "The [number] [thing] that got [result]" / "What nobody tells you about [topic]"
   → Creates information gap. Be specific. Don't give away answer.

2. CONTRARIAN — "Stop [X]. Do [Y] instead." / "Why [common belief] is wrong"
   → Challenges convention. Must be defensible from clip. No rage-bait.

3. NUMBERED LIST — "[Number] [things] that [outcome]" / "[Number] [signs/mistakes/lessons]"
   → Cognitive commitment. Use 3, 5, or 7. Must match content.

4. QUOTE PUNCH — "\"[quote]\"" — attribution / "Best line: '[quote]'"
   → Verbatim from clip. Attribute speaker if known.

5. QUESTION — "Why do [people] [X]?" / "What if [belief] is wrong?"
   → Self-relevant. Open-ended. Answerable from clip.

OUTPUT JSON:
{
  "hooks": [
    {"type": "curiosity", "text": "..."},
    {"type": "contrarian", "text": "..."},
    {"type": "list", "text": "..."}
  ]
}

RULES:
- Each hook: 30-100 chars
- NO clickbait the clip doesn't deliver (e.g. "You won't believe...")
- NO vague claims ("This one trick...")
- USE specific nouns, numbers, names from transcript
- Pick 3 styles that best fit — not all 5
- Order by predicted engagement (best first)
```

### User Message Template

```
CLIP:
Summary: {clipSummary}
Transcript excerpt: "{transcriptExcerpt}"
Topic: {primaryTopic}
Emotion: {emotion}
Speaker: {speakerName} ({speakerRole})
Key quote: "{keyQuote}"
Key data: {keyData}

Generate 3 hook variants.
```

---

## Priority 2 — Caption Writer Prompt (S1.3.3)

### System Prompt (GPT-4o-mini)

```
You are SHADDAI Caption Writer. Write 2 captions for a short-form video clip:
- PRIMARY: 2-3 sentences that deliver value and drive action
- SECONDARY: 1 punchy sentence (shorter, shareable standalone)

PLATFORM: {platform}

PLATFORM RULES:

--- TIKTOK ---
Primary: max 150 chars | Secondary: max 100 chars
Structure: Hook line → Value → CTA
CTA: Save, Follow, or Comment
Tone: Casual, energetic, "friend sharing a secret"
Hashtags in output: 3-5

--- INSTAGRAM REELS ---
Primary: max 2,200 chars (keep under 200) | Secondary: max 150 chars
Structure: First 2 lines hook → Value → Line break → CTA → Hashtags
First 125 chars appear before "more" fold — make them count
CTA: Comment prompt
Hashtags in output: 5-8

--- YOUTUBE SHORTS ---
Title (primary): max 100 chars (best 40-60)
Description (secondary): max 500 chars
Title is the hook. Description is context + CTA + 3 hashtags
Tone: Informative, search-optimized
Hashtags in output: 3

--- X/TWITTER ---
Primary: max 280 chars (best 200-260) | Secondary: max 140 chars
Structure: Punchy hook → Value → (media) → optional 1 hashtag
CTA: Reply with opinion
Tone: Smart, witty, high signal-to-noise
Hashtags in output: 0-1

--- LINKEDIN ---
Primary: max 3,000 chars (best 600-1,200) | Secondary: max 150 chars
Structure: Line break → Hook → 2-4 short ¶s → Bullets → Question → 3-5 hashtags
Tone: Professional, insightful, generous. Not promotional.
Every ¶ max 3 sentences. Line breaks between ¶s.
Hashtags in output: 3-5

OUTPUT JSON:
{
  "primary": "Full caption...",
  "secondary": "Punchier version...",
  "hashtags": "#tag1 #tag2 #tag3"
}

RULES:
- First line MUST grab (hook or surprise)
- CTA must feel natural, not forced
- NO spam ("check this out!!!", "link in bio!!!!")
- Match brand tone if brand profile provided
```

### User Message Template

```
CLIP: "{clipSummary}"
HOOK: {selectedHook}
TOPIC: {primaryTopic}
SPEAKER: {speakerName}

{brandProfile ? "BRAND: " + brandProfile : ""}

Write primary + secondary caption for {platform}.
```

---

## Priority 4 — Hashtag Generation Rules (No AI Call)

For MVP speed, hashtags are generated via rule-based mapping — no GPT call needed.

### Input
```
clip = {
  primaryTopic: string,          // e.g. "fundraising-strategy"
  secondaryTopics: string[],     // e.g. ["pitch-deck", "venture-capital"]
  emotion: string,              // e.g. "insightful"
  brandHashtags: string[]       // from BrandProfile, e.g. ["#shaddai", "#thestartupshow"]
  platform: string              // "tiktok" | "reels" | "shorts" | "x" | "linkedin"
}
```

### Algorithm

```
function generateHashtags(clip):
    // Step 1: Map primary topic → core hashtags
    core = TOPIC_HASHTAG_MAP[clip.primaryTopic] ?? fallback(clip.primaryTopic)
    
    // Step 2: Pick niche tags from secondary topics
    niche = []
    for topic in clip.secondaryTopics:
        if topic in TOPIC_HASHTAG_MAP:
            niche.push(TOPIC_HASHTAG_MAP[topic][0])  // first tag from map
    
    // Step 3: Add emotion tag if available
    emotionTag = EMOTION_HASHTAG_MAP[clip.emotion] ?? null
    if emotionTag: niche.push(emotionTag)
    
    // Step 4: Add brand hashtags
    brand = clip.brandHashtags.slice(0, 2)
    
    // Step 5: Apply platform limits
    return PLATFORM_LIMITS[clip.platform](core, niche, brand)
```

### Topic → Hashtag Mapping Table

```javascript
const TOPIC_HASHTAG_MAP = {
  // Entrepreneurship & Business
  "entrepreneurship":    ["#entrepreneurship", "#startup", "#business"],
  "startup-advice":      ["#startup", "#founder", "#startuplife"],
  "business-strategy":   ["#businessstrategy", "#strategy", "#growth"],
  "leadership":          ["#leadership", "#management", "#leadershipdevelopment"],
  "productivity":        ["#productivity", "#efficiency", "#worksmarter"],
  "innovation":          ["#innovation", "#technology", "#future"],

  // Fundraising & VC
  "venture-capital":     ["#venturecapital", "#vc", "#startupfunding"],
  "fundraising":         ["#fundraising", "#raisecapital", "#founderadvice"],
  "pitch-deck":          ["#pitchdeck", "#investorpitch", "#startupfunding"],
  "investing":           ["#investing", "#angelinvestor", "#venturecapital"],
  "valuation":           ["#valuation", "#startupvaluation", "#equity"],

  // Marketing & Growth
  "marketing":           ["#marketing", "#digitalmarketing", "#growth"],
  "growth-hacking":      ["#growthhacking", "#growth", "#marketingstrategy"],
  "social-media":        ["#socialmedia", "#contentmarketing", "#socialmedia strategy"],
  "branding":            ["#branding", "#personalbrand", "#brandstrategy"],
  "seo":                 ["#seo", "#seotips", "#contentmarketing"],

  // Product & Tech
  "product-design":      ["#productdesign", "#uxdesign", "#uidesign"],
  "software":            ["#software", "#saas", "#tech"],
  "ai":                  ["#artificialintelligence", "#ai", "#machinelearning"],
  "engineering":         ["#engineering", "#softwareengineering", "#coding"],

  // Sales & Revenue
  "sales":               ["#sales", "#salestips", "#b2b"],
  "revenue":             ["#revenu", "#monetization", "#businessmodel"],
  "pricing":             ["#pricing", "#pricingstrategy", "#saaspricing"],

  // Personal Development
  "mindset":             ["#mindset", "#successmindset", "#growthmindset"],
  "habits":              ["#habits", "#dailyroutine", "#discipline"],
  "career-advice":       ["#careeradvice", "#career", "#professionaldevelopment"],

  // Content Creation
  "content-creation":    ["#contentcreator", "#contentcreation", "#creator"],
  "video-production":    ["#videoproduction", "#videoediting", "#contentcreator"],
  "writing":             ["#writing", "#copywriting", "#contentwriting"],

  // Specific Niches
  "saas":                ["#saas", "#b2bsaas", "#software"],
  "ecommerce":           ["#ecommerce", "#onlinestore", "#entrepreneurship"],
  "remote-work":         ["#remotework", "#wfh", "#digitalnomad"],
  "freelancing":         ["#freelancer", "#freelancing", "#freelancelife"],

  // Ministry & Speaking
  "ministry":            ["#ministry", "#faith", "#church"],
  "speaking":            ["#publicspeaking", "#speaking", "#keynote"],
  "storytelling":        ["#storytelling", "#narrative", "#communication"],
  "coaching":            ["#coaching", "#lifecoach", "#mentorship"],

  // Health & Wellness
  "health":              ["#health", "#wellness", "#healthyliving"],
  "mental-health":       ["#mentalhealth", "#mindfulness", "#wellbeing"],
  "fitness":             ["#fitness", "#workout", "#health"],

  // Finance
  "personal-finance":    ["#personalfinance", "#money", "#financialfreedom"],
  "wealth-building":     ["#wealth", "#investing", "#financialindependence"],
};

// Fallback: if topic not in map, generate from topic-slug
function fallback(topicSlug) {
  const words = topicSlug.replace(/-/g, " ");
  return [`#${words.replace(/ /g, "")}`, `#${words.replace(/ /g, "tips")}`];
}
```

### Emotion → Hashtag Mapping

```javascript
const EMOTION_HASHTAG_MAP = {
  "insightful":   "#wisdom",
  "inspiring":    "#inspiration",
  "controversial":"#hottake",
  "humorous":     "#funny",
  "educational":  "#learntok",
  "emotional":    "#storytime",
  "surprising":   "#mindblown",
  "motivational": "#motivation",
  "practical":    "#howto",
  "warning":      "#cautionarytale",
};
```

### Platform Limit Functions

```javascript
const PLATFORM_LIMITS = {
  "tiktok": (core, niche, brand) => {
    // Max 5 total: 2 core + 2 niche + 1 brand
    return [...core.slice(0, 2), ...niche.slice(0, 2), ...brand.slice(0, 1)];
  },
  "reels": (core, niche, brand) => {
    // Max 8 total: 3 core + 3 niche + 2 brand
    return [...core.slice(0, 3), ...niche.slice(0, 3), ...brand.slice(0, 2)];
  },
  "shorts": (core, niche, brand) => {
    // Max 3 total: 1 core + 1 niche + 1 brand
    return [...core.slice(0, 1), ...niche.slice(0, 1), ...brand.slice(0, 1)];
  },
  "x": (core, niche, brand) => {
    // Max 1 total: 1 brand or 1 niche, prefer brand
    return brand.length > 0 ? brand.slice(0, 1) : niche.slice(0, 1);
  },
  "linkedin": (core, niche, brand) => {
    // Max 5 total: 2 core + 2 niche + 1 brand
    return [...core.slice(0, 2), ...niche.slice(0, 2), ...brand.slice(0, 1)];
  },
};
```

### Hashtag String Output

```javascript
function formatHashtagString(tagsArray) {
  return tagsArray.map(t => t.startsWith('#') ? t : '#' + t).join(' ');
}
// Example: "#venturecapital #fundraising #startup #shaddai"
```

### Example Walkthrough

**Input:**
```json
{
  "primaryTopic": "fundraising",
  "secondaryTopics": ["pitch-deck", "venture-capital"],
  "emotion": "insightful",
  "brandHashtags": ["#shaddai", "#thestartupshow"],
  "platform": "tiktok"
}
```

**Step 1 — Core:** `["#fundraising", "#raisecapital", "#founderadvice"]`
**Step 2 — Niche:** `["#pitchdeck", "#venturecapital"]` + emotion `"#wisdom"` → `["#pitchdeck", "#venturecapital", "#wisdom"]`
**Step 3 — Brand:** `["#shaddai", "#thestartupshow"]`
**Step 4 — TikTok limit (2 core, 2 niche, 1 brand):** `["#fundraising", "#raisecapital", "#pitchdeck", "#venturecapital", "#shaddai"]`
**Output:** `"#fundraising #raisecapital #pitchdeck #venturecapital #shaddai"`

---

## Backend Integration Notes

### Hook Writer Call
```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: HOOK_SYSTEM_PROMPT },
    { role: "user", content: HOOK_USER_MESSAGE }
  ],
  temperature: 0.7,
  max_tokens: 500,
  response_format: { type: "json_object" }
});
```

### Caption Writer Call
```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: CAPTION_SYSTEM_PROMPT.replace("{platform}", platform) },
    { role: "user", content: CAPTION_USER_MESSAGE }
  ],
  temperature: 0.6,
  max_tokens: 800,
  response_format: { type: "json_object" }
});
```

### Hashtag Generation (No AI Call)
```javascript
const hashtags = generateHashtags({
  primaryTopic: clip.primaryTopic,
  secondaryTopics: extractTopics(transcriptSegments),
  emotion: clip.emotion,
  brandHashtags: brandProfile?.brandHashtags ?? [],
  platform: batch.platforms[0]
});
```

---

*End of Prompt Templates & Hashtag Rules v1.1*