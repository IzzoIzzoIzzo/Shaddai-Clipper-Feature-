# SHADDAI Clips — Brand Tone Memory Schema

> **Document Owner:** Content Strategist
> **Status:** v1.0
> **Last Updated:** 2025-06-06

---

## 1. Brand Tone Memory System

The Brand Tone Memory system stores per-user/team voice preferences and injects them into hook, caption, and formatting agents. This document defines the schema, injection patterns, and learning loop.

### Data Model (from Architecture)

```prisma
model BrandProfile {
  id        String @id @default(cuid())
  userId    String
  teamId    String?
  name      String
  toneVoice ToneVoice
  targetAudience String
  keyMessaging   String[]
  brandHashtags  String[]
  avoidTopics    Text[]
  styleNotes     String?
  voiceCharacteristics Json?
  sampleHooks    String[]
  sampleCaptions String[]
  platformPreferences Json?
  isDefault Boolean @default(false)
  learningEnabled Boolean @default(true)
}
```

---

## 2. Voice Characteristics Schema

The `voiceCharacteristics` JSON field captures fine-grained style preferences:

```json
{
  "voiceCharacteristics": {
    "formalLevel": 0.7,
    "emotionLevel": 0.3,
    "jargonLevel": 0.2,
    "sentenceLengthPreference": "medium",
    "humorLevel": 0.1,
    "storytellingPreference": 0.6,
    "dataDrivenness": 0.4,
    "controversyTolerance": 0.2,
    "punctuationStyle": "standard",
    "emojiUsage": "sparing",
    "firstPersonPreference": true,
    "pronounStyle": "neutral"
  }
}
```

### Dimension Definitions

| Dimension | Range | 0.0 | 0.5 | 1.0 |
|-----------|-------|-----|-----|-----|
| `formalLevel` | 0.0–1.0 | "Hey guys!" | "Hello everyone" | "Esteemed colleagues" |
| `emotionLevel` | 0.0–1.0 | Dry/neutral | Warm | Passionate/effusive |
| `jargonLevel` | 0.0–1.0 | Simple words | Industry terms | Deep technical/niche |
| `sentenceLengthPreference` | short/medium/long | "Do this." | "Do this and you'll see results." | Multi-clause |
| `humorLevel` | 0.0–1.0 | No jokes | Light humor | Witty/sarcastic |
| `storytellingPreference` | 0.0–1.0 | Bullet points | Brief anecdotes | Full narratives |
| `dataDrivenness` | 0.0–1.0 | Qualitative | Mix | Stats & evidence required |
| `controversyTolerance` | 0.0–1.0 | Safe/neutral | Mild takes | Pushing boundaries |
| `emojiUsage` | none/sparing/moderate/heavy | N/A | Only in hook | Every sentence |
| `firstPersonPreference` | bool | Third person | N/A | "I" / "we" |
| `punctuationStyle` | standard/dramatic/minimal | N/A | N/A | N/A |

---

## 3. Platform Preferences Schema

```json
{
  "platformPreferences": {
    "primaryPlatform": "tiktok",
    "secondaryPlatforms": ["reels", "shorts"],
    "platformToneOverrides": {
      "linkedin": {
        "formalLevel": 0.8,
        "emotionLevel": 0.2
      },
      "tiktok": {
        "humorLevel": 0.6,
        "emojiUsage": "moderate"
      }
    }
  }
}
```

When platform-specific overrides exist, they override the base voice characteristics for that platform only.

---

## 4. Prompt Injection Templates

### 4.1 Hook Writer Injection

```
--- BRAND PROFILE ---
Brand: {profile.name}
Voice: {profile.toneVoice} (formal:{formalLevel}, emotional:{emotionLevel}, humor:{humorLevel})
Audience: {profile.targetAudience}
Key Messages: {profile.keyMessaging.join("; ")}
Must Avoid: {profile.avoidTopics.join("; ")}
Style: {profile.styleNotes}

Generate hooks that:
- Match the {toneVoice} tone
- Use {sentenceLengthPreference} sentence lengths
- Are {firstPersonPreference ? "first-person" : "third-person"} perspective
- Use {"sparing" if emojiUsage === "sparing" else emojiUsage} emojis
- {dataDrivenness > 0.5 ? "Include specific numbers or data points where possible" : "Focus on qualitative insight"}

AVAILABLE HOOK TYPES: curiosity, contrarian, list, quote, question
Choose types that best fit the clip content and brand voice.
--- END BRAND PROFILE ---
```

### 4.2 Caption Writer Injection

```
--- BRAND PROFILE (Caption Adaptation) ---
Brand: {profile.name}
Tone: {profile.toneVoice}
Platform: {targetPlatform} (note: formalOverride={formalOverride}, emotionOverride={emotionOverride})

Guidelines:
- {formalOverride > 0.6 ? "Use complete sentences, professional vocabulary" : "Conversational tone, casual language"}
- {emotionOverride < 0.3 ? "Keep emotionally neutral, focus on facts" : "Connect emotionally with audience"}
- Lead with highest-value insight first
- Use {firstPersonPreference ? "first-person perspective ('I', 'we')" : "third-person or direct address"}
- {profile.styleNotes}

Platform-specific:
- {platform === "linkedin" ? "Paragraph breaks every 2-3 lines. Professional but not stiff." : ""}
- {platform === "tiktok" ? "Short, punchy sentences. One idea per line." : ""}
- {platform === "x" ? "Maximum impact per character. Use thread if more depth needed." : ""}
--- END PROFILE ---
```

### 4.3 Formatting Agent Injection

```
--- BRAND PROFILE (Formatting) ---
Brand: {profile.name}
Platform: {targetPlatform}
Audience: {profile.targetAudience}

Style notes for content presentation:
- {profile.styleNotes}
- {controversyTolerance < 0.3 ? "Avoid provocative framing" : "Can use strong opinion framing"}
- {dataDrivenness > 0.5 ? "Highlight statistics and numbers visually" : "Focus on narrative flow"}
--- END PROFILE ---
```

---

## 5. Learning Loop (Profile Refinement)

### 5.1 Feedback Signals

| Signal | Source | Action |
|--------|--------|--------|
| User edits hook | Manual override | Store as `sampleHook` preference hint |
| User selects variant B over A | UI interaction | Increase weight of that hook type |
| User thumbs-down | Explicit feedback | Reduce frequency; check if type mismatch |
| User changes tone | BrandProfile update | Immediate re-application |
| User exports without editing | Implicit approval | Positive reinforcement of current profile |

### 5.2 Automated Profile Proposals

After collecting 5+ edit signals, the system proposes profile updates:

```json
{
  "proposedUpdate": {
    "profileId": "bp_abc123",
    "reason": "Based on your last 7 clip edits, we noticed you prefer shorter hooks and more emojis.",
    "suggestedChanges": {
      "voiceCharacteristics.sentenceLengthPreference": "short",
      "voiceCharacteristics.emojiUsage": "moderate"
    },
    "confidence": 0.82,
    "appliedEdits": 7
  }
}
```

### 5.3 Reversion Safety

- All auto-suggestions require user approval (opt-in)
- Profile version history maintained (last 10 edits stored)
- One-click revert to previous profile version

---

## 6. Default Brand Profiles by Industry

### 6.1 Tech/Startup (Default)

```json
{
  "toneVoice": "CASUAL",
  "voiceCharacteristics": {
    "formalLevel": 0.3,
    "emotionLevel": 0.7,
    "jargonLevel": 0.3,
    "sentenceLengthPreference": "short",
    "humorLevel": 0.4,
    "emojiUsage": "moderate"
  },
  "targetAudience": "Tech founders, startup employees, investors"
}
```

### 6.2 Corporate/B2B

```json
{
  "toneVoice": "PROFESSIONAL",
  "voiceCharacteristics": {
    "formalLevel": 0.8,
    "emotionLevel": 0.2,
    "jargonLevel": 0.5,
    "sentenceLengthPreference": "medium",
    "humorLevel": 0.1,
    "emojiUsage": "none"
  },
  "targetAudience": "Enterprise decision makers, executives"
}
```

### 6.3 Education/Learning

```json
{
  "toneVoice": "EDUCATIONAL",
  "voiceCharacteristics": {
    "formalLevel": 0.5,
    "emotionLevel": 0.5,
    "jargonLevel": 0.3,
    "sentenceLengthPreference": "medium",
    "humorLevel": 0.2,
    "emojiUsage": "sparing",
    "storytellingPreference": 0.8
  },
  "targetAudience": "Students, lifelong learners, professionals upskilling"
}
```

### 6.4 Creator/Influencer

```json
{
  "toneVoice": "CASUAL",
  "voiceCharacteristics": {
    "formalLevel": 0.1,
    "emotionLevel": 0.9,
    "jargonLevel": 0.1,
    "sentenceLengthPreference": "short",
    "humorLevel": 0.7,
    "emojiUsage": "heavy",
    "firstPersonPreference": true
  },
  "targetAudience": "Social media audience, followers, community"
}
```

### 6.5 Ministry/Nonprofit

```json
{
  "toneVoice": "INSPIRATIONAL",
  "voiceCharacteristics": {
    "formalLevel": 0.4,
    "emotionLevel": 0.8,
    "jargonLevel": 0.1,
    "sentenceLengthPreference": "medium",
    "humorLevel": 0.2,
    "emojiUsage": "sparing",
    "storytellingPreference": 0.9
  },
  "targetAudience": "Congregation, donors, community members"
}
```

---

## 7. Initial Profile Onboarding

When a new user signs up without completing a brand profile, the system generates an initial profile by:

1. **Analyzing uploaded source content** — Extract tone from existing videos (if available)
2. **Industry selection** — User selects industry → applies default profile
3. **Quick Setup Wizard** — 3 questions:
   - "Which best describes your tone?" (dropdown: 6 tone voices)
   - "Who is your audience?" (free text)
   - "Share a hook style you love" (optional, free text)

Minimum viable profile (created automatically):
```json
{
  "name": "My Brand",
  "toneVoice": "PROFESSIONAL",
  "targetAudience": "",
  "keyMessaging": [],
  "brandHashtags": [],
  "avoidTopics": [],
  "voiceCharacteristics": "{}"
}
```

---

*End of Brand Tone Memory Document v1.0*