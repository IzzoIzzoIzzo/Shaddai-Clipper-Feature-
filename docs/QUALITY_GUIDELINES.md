# SHADDAI Clips — Output Quality Guidelines & Scoring

> **Document Owner:** Content Strategist
> **Status:** v1.0
> **Last Updated:** 2025-06-06

---

## 1. Quality Scoring System

Every generated clip is scored holistically across 5 dimensions. Scores determine whether clips pass review gate, are flagged for regeneration, or are ranked in the UI.

### Quality Dimensions

| Dimension | Weight | Max Score | What It Measures |
|-----------|--------|-----------|-----------------|
| **Hook Quality** | 25% | 10 | Does the hook make you stop scrolling? |
| **Caption Quality** | 20% | 10 | Is the caption clear, engaging, platform-fit? |
| **Video Production** | 20% | 10 | Is the clip well-cut, framed, rendered? |
| **Hashtag Relevance** | 15% | 10 | Are hashtags targeted and effective? |
| **Brand Fit** | 20% | 10 | Does the output match brand tone? |

**Overall Score:**
```
overall = (hook × 0.25) + (caption × 0.20) + (video × 0.20) + (hashtag × 0.15) + (brand × 0.20)
```

**Thresholds:**
| Overall Score | Grade | Action |
|-------------|-------|--------|
| ≥ 8.5 | ⭐ Excellent | Auto-approve (if auto-export enabled) |
| 7.0 – 8.4 | ✅ Good | Pass review gate, show as recommended |
| 5.0 – 6.9 | 🔶 Mixed | Flag for user review — may need edits |
| < 5.0 | ❌ Poor | Auto-regenerate (up to 2 retries) |

---

## 2. Hook Quality Scoring (Detailed Rubric)

### 2.1 Individual Hook Score

Each hook variant is scored independently:

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| **Curiosity gap intensity** | 25% | 0 = no curiosity, 10 = irresistible |
| **Specificity** | 20% | 0 = vague, 10 = named entities, numbers, concrete outcomes |
| **Emotional trigger** | 15% | 0 = flat, 10 = provokes strong emotion |
| **Brevity/scanability** | 20% | 0 = too long/complex, 10 = instantly parseable |
| **Novelty** | 10% | 0 = cliché/same-as-everyone, 10 = fresh angle |
| **Brand fit** | 10% | 0 = off-brand, 10 = perfectly aligned |

**Example scoring:**

> Hook: "The 1 question that got the founder a $50M check 🚀"
> - Curiosity: 9/10 (immediate information gap)
> - Specificity: 8/10 (named number, outcome, role)
> - Emotion: 7/10 (money + success triggers desire)
> - Brevity: 9/10 (12 words, instant read)
> - Novelty: 6/10 (curiosity formula is common but specific detail helps)
> - Brand fit: 8/10 (depends on brand)
> **Score: 7.8/10**

### 2.2 Hook Set Score

The overall hook quality score is the weighted average of all 5 variants, with the highest-scoring variant getting double weight:

```
hookSetScore = ((best × 2) + sum(others)) / (2 + count(others))
```

---

## 3. Caption Quality Scoring

### 3.1 Platform-Neutral Criteria

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| **Clarity of value** | 25% | Can reader understand what they'll learn in 3s? |
| **Structure & scannability** | 20% | Line breaks, paragraphing, bullet use |
| **Hook integration** | 15% | First line is grabber that leads into content |
| **Length optimization** | 15% | Hits sweet spot for platform (not too long/short) |
| **CTA effectiveness** | 15% | Clear, natural next step |
| **Grammar & polish** | 10% | No errors, natural flow |

### 3.2 Platform-Specific Bonuses

| Platform | Bonus Criterion | Points |
|----------|----------------|--------|
| TikTok | Uses trending format or reference | +0.5 |
| Reels | Visually paired with on-screen text | +0.5 |
| Shorts | SEO keyword in first 50 chars | +1.0 |
| X | Thread has logical arc | +1.0 |
| LinkedIn | Includes question for engagement | +0.5 |
| Email | Subject line avoids spam triggers | +1.0 |

---

## 4. Video Production Quality Scoring

### 4.1 Rendering Quality

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| **Transition smoothness** | 20% | No jump cuts, proper padding (±0.5s) |
| **Aspect ratio compliance** | 15% | Correct ratio for target platform |
| **Resolution & bitrate** | 15% | Meets platform min specs |
| **Text overlay readability** | 15% | Proper size, contrast, safe zone |
| **Audio sync & quality** | 15% | Lip sync, no distortion, normalized |
| **Subtitles accuracy** | 10% | Match spoken words, timed correctly |
| **Brand watermark** | 10% | Correctly positioned, non-intrusive |

### 4.2 Content Selection Quality

Scored at the clip candidate level:

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| **Narrative completeness** | 30% | Clip has beginning, middle, (implied) end |
| **Emotional peak capture** | 30% | Does clip include the most engaging moment? |
| **Context sufficiency** | 20% | Does it make sense standalone? |
| **Technical audio** | 20% | No background noise, clear speech |

---

## 5. Hashtag Quality Scoring

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| **Content relevance** | 35% | Do tags directly match clip topic? |
| **Volume appropriateness** | 20% | Not too broad (>50M) or too narrow (<500) |
| **Engagement potential** | 20% | Tags with active recent posts |
| **Platform compliance** | 15% | Correct count per platform, no banned tags |
| **Brand inclusion** | 10% | Brand tag always present |

---

## 6. Brand Fit Scoring

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| **Tone accuracy** | 30% | Hook and caption match profile toneVoice |
| **Avoid topic compliance** | 25% | Zero mentions of avoidTopics |
| **Key message alignment** | 20% | Natural incorporation of keyMessaging |
| **Style adherence** | 15% | styleNotes followed (e.g., "actionable, avoid buzzwords") |
| **Hashtag consistency** | 10% | brandHashtags included |

### Brand Fit Failure Conditions

A clip automatically fails brand fit if:
- **Tone voice mismatch > 2 categories** (e.g., profile says "professional" but output is "humorous")
- **Any avoidTopic mentioned** in hook, caption, or hashtags
- **Brand hashtag missing** despite being configured

---

## 7. Review Gate Logic

### 7.1 Auto-Export Flow

```
Generate Clip
    │
    ▼
Score all dimensions
    │
    ├── Overall ≥ 8.5 AND Brand Fit ≥ 8.0
    │   └── Auto-approve → queue for export (if autoExport=true)
    │
    ├── Overall 7.0–8.4 OR Brand Fit 6.0–7.9
    │   └── Manual review required → notify user
    │
    ├── Overall 5.0–6.9
    │   └── Flag for user edit → show quality warnings
    │
    └── Overall < 5.0 OR Brand Fit < 5.0
        └── Auto-regenerate (max 2 retries)
            ├── Successful → re-enter gate
            └── Failed 2x → flag as "generation failed" → notify user
```

### 7.2 Regeneration Triggers

A clip is automatically regenerated (up to 2 attempts) if:

1. **Hook quality < 5.0** — Reprompt with same content + "make this hook stronger"
2. **Caption quality < 5.0** — Reprompt with specific feedback
3. **Brand fit < 5.0** — Reprompt with stricter brand profile adherence
4. **Video rendering error** — Technical retry (no AI cost)
5. **Hashtag set rejected** — Regenerate with filtered vocabulary

---

## 8. User Feedback Collection

### 8.1 Implicit Signals

| User Action | Signal | Adjustment |
|------------|--------|------------|
| Exports without editing | ✅ Positive | Boost current generation parameters |
| Edits hook before export | ✏️ Preference signal | Log edited version as preference hint |
| Edits caption before export | ✏️ Preference signal | Log edited version |
| Regenerates hook set | 🔄 Dissatisfied | Adjust hook type distribution |
| Deletes clip | ❌ Rejection | Reduce similarity to this clip in future |
| Watches clip in dashboard (long dwell) | 👀 Interest | Similar content in future batches |

### 8.2 Explicit Feedback

Each clip supports a thimbs-up/thumbs-down rating:

```json
{
  "userRating": 1,  // 1 = up, -1 = down, null = unrated
  "userFeedback": "The hook was too clickbaity for our audience"
}
```

Feedback categories:
- **Hook too clickbaity** — Reduce curiosity/contrarian weighting
- **Caption too long** — Adjust sentence length preference
- **Wrong tone** — Identify tone mismatch direction
- **Not relevant** — Review topic selection
- **Perfect!** — Reinforce current settings

---

## 9. Quality Dashboard Metrics (for Users)

| Metric | What It Shows |
|--------|--------------|
| **Avg Hook Score** | Over last 20 clips — trending hook quality |
| **Avg Caption Score** | Over last 20 clips — caption effectiveness |
| **Brand Fit %** | Percentage of clips passing brand fit ≥ 7.0 |
| **Regeneration Rate** | Percentage auto-regenerated (target < 10%) |
| **User Satisfaction** | Thumbs-up rate (target > 80%) |
| **Export Rate** | Percentage of generated clips exported |

---

## 10. Continuous Improvement Pipeline

### Weekly Model Updates

1. Aggregate user edit patterns (anonymized)
2. Identify common hook/caption edits
3. Update prompt templates with anti-patterns
4. Refresh hashtag database (trending tags)
5. Tune quality scoring weights based on correlation with user satisfaction

### A/B Test Framework (V2)

```json
{
  "testName": "hook-format-v2-vs-v1",
  "variants": ["v1_template", "v2_template"],
  "split": 0.5,
  "metrics": ["userRating", "exportRate", "editRate"],
  "minSampleSize": 1000,
  "duration_hours": 168,
  "status": "running"
}
```

Winner is determined by statistical significance (p < 0.05) on export rate and user rating.

---

*End of Quality Guidelines Document v1.0*