# SHADDAI Clips — Brand Voice Setup Wizard

> **Document Owner:** Content Strategist
> **Status:** v1.1 — Setup wizard for S2.2.2 onboarding
> **Last Updated:** 2025-06-06

---

## Overview

The Brand Voice Setup Wizard collects the user's tone and style preferences so the AI agents generate hooks and captions that sound like them. The output populates a `BrandProfile` used in every generation request.

### Two Paths

| Path | Screens | Est. Time | Endpoint |
|------|---------|-----------|----------|
| **Quick Wizard** | 4 simple questions | < 2 min | `POST /v1/brand-profiles/quick` |
| **Full Setup** | 8 questions with sliders/samples | 5-7 min | `POST /v1/brand-profiles` |

---

## Quick Wizard (4 Screens)

### Screen 1 — Tone

```
🎯 What's your brand's vibe?

Pick your primary tone:

○  Professional — Authoritative, polished, corporate
○  Casual — Conversational, relatable, everyday
○  Humorous — Witty, funny, entertaining
○  Educational — Informative, teaching-focused
○  Inspirational — Uplifting, motivational
○  Confrontational — Bold, controversial, edgy
○  Custom — I'll describe it

[Next →]  [Skip → use defaults]
```

### Screen 2 — Audience

```
👥 Who are you trying to reach?

Describe your audience in a sentence or two.

Example: "Early-stage founders raising seed rounds"
Example: "Marketing managers at B2B companies"
Example: "Christians interested in practical theology"

[_____________________________]

[Next →]  [Skip]
```

### Screen 3 — Style

```
✏️ What words should you avoid?

List topics, words, or themes you never want associated with your brand.
(One per line, optional)

Example:
• Politics
• Profanity
• Competitor names
• "Synergy", "disrupt"

[_____________________________]
[_____________________________]
[_____________________________]

[Next →]  [Skip]
```

### Screen 4 — Sample

```
💡 Got a hook style you love?

Paste an example hook you'd write or admire. This helps the AI match your voice.

[_____________________________]

Example: "The 1 question that got the founder a $50M check"

[Finish →]  [Skip]
```

### Quick Wizard → Output JSON

```json
{
  "name": "My Brand",
  "toneVoice": "casual",
  "targetAudience": "Early-stage founders raising seed rounds",
  "avoidTopics": ["politics", "profanity"],
  "sampleHooks": ["The 1 question that got the founder a $50M check"],
  "voiceCharacteristics": {
    "formalLevel": 0.5,
    "emotionLevel": 0.5,
    "humorLevel": 0.3,
    "jargonLevel": 0.3,
    "sentenceLengthPreference": "medium",
    "emojiUsage": "moderate",
    "storytellingPreference": 0.5,
    "dataDrivenness": 0.3,
    "controversyTolerance": 0.2,
    "firstPersonPreference": true
  }
}
```

---

## Full Setup Wizard (8 Screens)

### Section 1 — Identity (Screens 1-2)

**Screen 1: Profile Name**

```
Give this profile a name. You can create multiple profiles later.

Profile Name: [___________________________]
Examples: "Podcast Voice", "LinkedIn Professional", "Social Fun"

[Next →]
```

**Screen 2: Primary Tone**

```
Choose your dominant brand voice:

[Professional] [Casual] [Humorous]
[Educational] [Inspirational] [Confrontational]

Secondary tone (optional, for nuance):
[None] [Professional] [Casual] [Humorous] [Educational] [Inspirational]

[Next →]
```

### Section 2 — Audience & Topics (Screens 3-5)

**Screen 3: Target Audience**

```
Describe your ideal audience. Be specific.

Who are they? What do they care about? What problem do they have?

[_____________________________]
[_____________________________]
[_____________________________]

Example: "B2B SaaS founders raising $1-10M who are tired of generic advice"

[Next →]
```

**Screen 4: Key Messages**

```
What are the 3-5 core ideas your brand communicates consistently?

These get woven naturally into hooks and captions.

1. [______________________________]
2. [______________________________]
3. [______________________________]
4. [______________________________] (optional)
5. [______________________________] (optional)

Examples:
• "Fundraising is relationship-driven, not transaction-driven"
• "Know your numbers cold"
• "Start before you're ready"

[Next →]
```

**Screen 5: Topics to Avoid**

```
Are there any topics, words, or themes you NEVER want in your content?

(One per line. Be specific.)

[_____________________________]
[_____________________________]
[_____________________________]
[_____________________________]

Examples:
• Politics / Religion (unless you're a ministry profile)
• Get-rich-quick schemes
• Competitor names
• Buzzwords like "synergy", "disrupt", "pivot"

[Next →]
```

### Section 3 — Voice Nuance (Screen 6)

**Screen 6: Voice Sliders**

```
Fine-tune your brand's voice. Drag each slider to where it feels right.

Casual ←────●─────────→ Formal
Neutral ←──────●───────→ Passionate
Simple ←────●─────────→ Technical
None ←●────────────────→ Witty
Direct ←────●───────────→ Story-driven
Opinion ←───────●───────→ Data-driven
Safe ←●────────────────→ Bold
No emojis ←─●───────────→ Heavy emojis
Short sentences ←─●───────→ Long sentences

[Next →]
```

### Section 4 — Style Details (Screens 7-8)

**Screen 7: Style Notes**

```
Any additional guidance for the AI?

[________________________________________]
[________________________________________]
[________________________________________]

Example: "Keep it actionable. Short sentences. Always include a specific takeaway."

[Next →]
```

**Screen 8: Platform Preferences + Sample**

```
Where do you post most?

Primary Platform:
○ TikTok  ○ Reels  ○ Shorts  ○ X  ○ LinkedIn  ○ Email

Also post on (check all that apply):
○ TikTok  ○ Reels  ○ Shorts  ○ X  ○ LinkedIn  ○ Email

---

Optional: Share a hook or caption you love to help the AI match your style.

Sample Hook: [_____________________________]
Sample Caption: [_____________________________]
[________________________________________]

[Finish → Save Profile]
```

### Full Setup → Output JSON

```json
{
  "name": "Podcast Voice",
  "toneVoice": "casual",
  "targetAudience": "B2B SaaS founders raising $1-10M",
  "keyMessaging": [
    "Fundraising is relationship-driven",
    "Know your numbers cold",
    "Start before you're ready"
  ],
  "brandHashtags": [],
  "avoidTopics": ["politics", "get-rich-quick schemes", "synergy", "disrupt"],
  "styleNotes": "Keep it actionable. Short sentences. Always include a takeaway.",
  "voiceCharacteristics": {
    "formalLevel": 0.3,
    "emotionLevel": 0.7,
    "humorLevel": 0.4,
    "jargonLevel": 0.3,
    "sentenceLengthPreference": "short",
    "emojiUsage": "moderate",
    "storytellingPreference": 0.6,
    "dataDrivenness": 0.4,
    "controversyTolerance": 0.2,
    "firstPersonPreference": true
  },
  "sampleHooks": ["The 1 question that got the founder a $50M check"],
  "sampleCaptions": [],
  "platformPreferences": {
    "primaryPlatform": "tiktok",
    "secondaryPlatforms": ["reels", "x"]
  },
  "brandHashtags": [],
  "isDefault": true
}
```

---

## API Contract

### Quick Setup

```http
POST /v1/brand-profiles/quick
Content-Type: application/json

{
  "toneVoice": "casual",
  "targetAudience": "Early-stage founders raising seed rounds",
  "avoidTopics": ["politics"],
  "sampleHook": "The 1 question that got the founder a $50M check"
}
```

**Response 201:**
```json
{
  "profileId": "bp_abc123",
  "name": "My Brand",
  "toneVoice": "casual",
  "voiceCharacteristics": { ... },
  "createdAt": "2025-06-06T12:00:00Z"
}
```

### Full Setup

```http
POST /v1/brand-profiles
Content-Type: application/json

{
  "name": "Podcast Voice",
  "toneVoice": "casual",
  "targetAudience": "B2B SaaS founders raising $1-10M",
  "keyMessaging": ["Fundraising is relationship-driven"],
  "avoidTopics": ["politics", "get-rich-quick"],
  "styleNotes": "Keep it actionable.",
  "voiceCharacteristics": {
    "formalLevel": 0.3,
    "emotionLevel": 0.7,
    "humorLevel": 0.4
  },
  "sampleHooks": ["The 1 question..."],
  "platformPreferences": {
    "primaryPlatform": "tiktok"
  },
  "brandHashtags": ["#mybrand"],
  "isDefault": true
}
```

---

## UI States

### Empty State (no profile yet)

```
┌───────────────────────────────────────────┐
│      🎤  No brand voice set yet            │
│                                            │
│  A voice profile helps the AI sound        │
│  like YOU. Takes less than 2 minutes.      │
│                                            │
│  [⚡ Quick Wizard — 4 quick questions]     │
│  [🎨 Full Setup — dial in every detail]   │
│  [Skip for now → use defaults]             │
│                                            │
│  You can change this later in Settings.    │
└───────────────────────────────────────────┘
```

### Validation Errors

| Field | Error | When |
|-------|-------|------|
| profile name | "Name is required" | Empty |
| tone voice | "Select a tone" | None selected |
| audience | "Tell us about your audience (min 10 chars)" | Too short |
| avoidTopics | Soft warning — skip allowed | 0 topics |

### Success State

```
┌───────────────────────────────────────────┐
│     ✅  Brand profile saved!               │
│                                            │
│  "Podcast Voice" is now your active voice. │
│  All future clips will use this tone.      │
│                                            │
│  [🎬 Generate my first clip]               │
│  [⚙️ Edit profile]                         │
└───────────────────────────────────────────┘
```

---

## Profile Injection Into Agent Prompts

When a brand profile exists, inject this block into the Hook Writer and Caption Writer system prompts:

```
--- BRAND PROFILE ---
Tone: {toneVoice}
Audience: {targetAudience}
Key Messages: {keyMessaging}
Avoid: {avoidTopics}
Style: {styleNotes}
Voice: formal={formalLevel}, emotional={emotionLevel}, humor={humorLevel}
--- END PROFILE ---
```

If no profile exists, omit the block entirely. The AI defaults to professional-neutral.

---

*End of Brand Voice Setup Wizard v1.1*