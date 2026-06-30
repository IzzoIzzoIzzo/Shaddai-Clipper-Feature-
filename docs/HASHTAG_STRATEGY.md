# SHADDAI Clips — Hashtag Strategy & Recommendation Engine

> **Document Owner:** Content Strategist
> **Status:** v1.0
> **Last Updated:** 2025-06-06

---

## 1. Hashtag Architecture

Each clip generates three tiers of hashtags matching the data model:

```json
{
  "hashtags": {
    "core": ["#venturecapital", "#fundraising", "#startup"],
    "niche": ["#founderadvice", "#saastips", "#pitchdeck"],
    "brand": ["#shaddai", "#thestartupshow"]
  }
}
```

| Tier | Count | Volume Range | Purpose |
|------|-------|-------------|---------|
| Core | 3 | 500K–10M+ posts | Discovery from broad audiences |
| Niche | 3 | 10K–500K posts | Targeted audience, higher engagement |
| Brand | 1–2 | Custom | Brand identity, trademark, campaign tracking |

**Total hashtags per post:** 7–8 (varies by platform)

---

## 2. Platform-Specific Hashtag Rules

### TikTok

| Rule | Specification |
|------|--------------|
| **Max hashtags** | 5 total (3 core + 2 niche/brand) |
| **Placement** | End of caption, on their own line |
| **Mix** | 2 high-volume + 2 mid-volume + 1 brand |
| **Avoid** | Overly generic (#fyp, #viral, #foryou) — low conversion |
| **Trending** | Check platform trends hook; add 1 trending if relevant |

### Instagram Reels

| Rule | Specification |
|------|--------------|
| **Max hashtags** | 8 total (3 core + 3 niche + 2 brand) |
| **Placement** | End of caption after line break, OR first comment |
| **Best mix** | 3 high + 3 medium + 2 brand |
| **Reel boost** | Add 1 location hashtag if relevant |
| **Avoid** | Banned hashtags (check current list) |

### YouTube Shorts

| Rule | Specification |
|------|--------------|
| **Max hashtags** | 3–5 total |
| **Placement** | End of description |
| **Best mix** | 1 broad + 2 specific + 1 brand |
| **Note** | First 3 hashtags appear above title — prioritize wisely |

### X/Twitter

| Rule | Specification |
|------|--------------|
| **Max hashtags** | 2 total (only in last tweet of thread, or none) |
| **Placement** | Last tweet only, at the very end |
| **Strategy** | Use sparingly — X engagement drops with 3+ hashtags |
| **Best** | 1 niche + 1 brand, or none at all |

### LinkedIn

| Rule | Specification |
|------|--------------|
| **Max hashtags** | 5 total |
| **Placement** | Bottom of post, 1 per line |
| **Best mix** | 2 broad industry + 2 niche + 1 brand |
| **Strategy** | LinkedIn algorithm rewards hashtag relevance over volume |

### Email

| Rule | Specification |
|------|--------------|
| **Hashtags** | None in email body |
| **Social sharing** | Add hashtag suggestions for readers who share to social |

---

## 3. Hashtag Generation Rules

### 3.1 Core Hashtag Selection (Broad Reach)

Generated from:
1. **Primary topic** of the clip candidate (highest weight)
2. **Secondary topics** from transcript segments
3. **Video title keywords** (if provided)

**Algorithm:**
```
topics = extract_topics_from_clip(transcript_segment)
core_tags = lookup_broad_tags(topics, min_volume=500K)
# Filter out banned/trending-sensitive tags
# Pick top 3 by volume
```

### 3.2 Niche Hashtag Selection (Targeted Engagement)

Generated from:
1. **Specific phrases** in clip summary sentence
2. **Speaker identity** (role, industry, expertise area)
3. **Emotion/sentiment** of the segment
4. **Content format** (e.g., #tip, #storytime, #tutorial)

**Algorithm:**
```
specific_terms = extract_key_phrases(clip_summary, speaker_context)
niche_tags = lookup_niche_tags(specific_terms, volume_range=[10K, 500K])
# Filter for engagement rate > 2%
# Pick top 3 by relevance score
```

### 3.3 Brand Hashtag Selection

Generated from:
1. **BrandProfile.brandHashtags** (always included if available)
2. **Content series name** (e.g., #TheStartupShow)
3. **Campaign hashtags** (if any)

**Rules:**
- Always include at least 1 brand hashtag from profile
- If brand has 2+ hashtags, include top 2
- If no brand profile, use platform-specific generic (#shaddai)

---

## 4. Hashtag Quality Scoring

| Criterion | Weight | What Judges |
|-----------|--------|-------------|
| **Relevance** | 35% | Does the hashtag directly relate to clip content? |
| **Volume-healthy** | 25% | Avoid too-broad (>10M) and too-narrow (<1K) |
| **Engagement rate** | 20% | Tags with active communities (recent posts with likes/comments) |
| **Not banned** | 15% | Not on platform shadowban lists |
| **Novelty** | 5% | Avoid same 5 tags on every post |

### Rejection Conditions

A hashtag set is rejected and regenerated if:
- Core tag volume < 100K or > 50M
- Niche tag volume < 500 or > 1M
- Any tag is on banned/shadowban list
- Duplicate tags in same set
- More than 1 generic platform tag (#fyp, #explore, #reels)

---

## 5. Hashtag Database (Initial Seed)

### Broad Topic → Core Hashtag Mapping

| Topic Area | Core Hashtag 1 | Core Hashtag 2 | Core Hashtag 3 |
|------------|---------------|---------------|---------------|
| Entrepreneurship | #entrepreneurship | #startup | #business |
| Fundraising | #venturecapital | #fundraising | #investing |
| SaaS | #saas | #software | #tech |
| Marketing | #marketing | #digitalmarketing | #growth |
| Leadership | #leadership | #management | #career |
| Product | #productdesign | #productivity | #innovation |
| Sales | #sales | #salesstrategy | #b2b |
| AI/Tech | #artificialintelligence | #machinelearning | #technews |
| Personal Finance | #personalfinance | #wealth | #money |
| Health/Wellness | #health | #wellness | #mentalhealth |
| Content Creation | #contentcreator | #socialmedia | #creatoreconomy |
| Education | #education | #learning | #knowledge |

### Emotion → Niche Hashtag Mapping

| Emotion | Niche Tags |
|---------|-----------|
| Insightful | #wisdom #lifelessons #deepthoughts |
| Controversial | #unpopularopinion #hottake #changemymind |
| Inspiring | #motivation #inspiration #mindset |
| Humorous | #funny #comedy #relatable |
| Educational | #howto #tutorial #learntok |
| Emotional | #storytime #real #vulnerability |

---

## 6. Hashtag Trend Detection (Future V2)

```json
{
  "trendingTags": {
    "platform": "tiktok",
    "date": "2025-06-06",
    "relevant": [
      {"tag": "#startupfunding", "volume": "trending_up", "context": "VC summer" },
      {"tag": "#founderlife", "volume": "rising", "context": "" }
    ]
  }
}
```

When available, inject 1 trending tag into the core set if relevance score > 0.7.

---

*End of Hashtag Strategy Document v1.0*