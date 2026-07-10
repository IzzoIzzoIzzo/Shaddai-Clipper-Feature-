import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Palette, Film, Hash, Link, Users,
  MessageSquare, ShieldAlert, Sparkles, Star, SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'
import { uid } from '@/api/mockApi'
import type { BrandProfile, ToneVoice } from '@/types/api'

// ── Exact ToneVoice options from types/api.ts ────────────────────────────────
const TONE_OPTIONS: { value: ToneVoice; label: string }[] = [
  { value: 'professional',    label: 'Professional' },
  { value: 'casual',          label: 'Casual' },
  { value: 'humorous',        label: 'Humorous' },
  { value: 'educational',     label: 'Educational' },
  { value: 'inspirational',   label: 'Inspirational' },
  { value: 'confrontational', label: 'Confrontational' },
  { value: 'custom',          label: 'Custom' },
]

const PLATFORM_OPTIONS = [
  { value: 'tiktok',          label: 'TikTok' },
  { value: 'reels',           label: 'Instagram Reels' },
  { value: 'youtube_shorts',  label: 'YouTube Shorts' },
  { value: 'x',               label: 'X / Twitter' },
  { value: 'linkedin',        label: 'LinkedIn' },
]

const SENTENCE_LENGTH_OPTIONS = [
  { value: 'short',   label: 'Short & punchy' },
  { value: 'medium',  label: 'Medium — balanced' },
  { value: 'long',    label: 'Long-form prose' },
  { value: 'mixed',   label: 'Mixed' },
]

// ── textarea helper ──────────────────────────────────────────────────────────
function Textarea({
  label, icon, placeholder, value, onChange, minHeight = 80,
}: {
  label?: string
  icon?: React.ReactNode
  placeholder?: string
  value: string
  onChange: (v: string) => void
  minHeight?: number
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
          {icon && <span className="[&>svg]:h-4 [&>svg]:w-4 text-muted-foreground">{icon}</span>}
          {label}
        </label>
      )}
      <textarea
        style={{ minHeight }}
        className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
          placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2
          focus:ring-primary/30 focus:border-primary transition-colors resize-y"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// ── range slider helper ──────────────────────────────────────────────────────
function SliderField({
  label, value, onChange, min = 0, max = 10, step = 1,
}: {
  label: string; value: number; onChange: (n: number) => void
  min?: number; max?: number; step?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="font-mono text-xs text-primary">{value}/{max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full bg-muted cursor-pointer"
      />
    </div>
  )
}

// ── section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon, title, description, children,
}: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode
}) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-primary">
          <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

// ── parse comma/space/newline delimited list ─────────────────────────────────
function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseHashtags(raw: string): string[] {
  return parseList(raw).map((h) => (h.startsWith('#') ? h : '#' + h))
}

// ── main component ───────────────────────────────────────────────────────────
export default function BrandProfileEditorPage() {
  const { id }              = useParams<{ id: string }>()
  const navigate            = useNavigate()
  const addToast            = useUIStore((s) => s.addToast)
  const existing            = useClipsStore((s) =>
    id && id !== 'new' ? s.brandProfiles.find((p) => p.profileId === id) : undefined
  )
  const saveBrandProfile    = useClipsStore((s) => s.saveBrandProfile)
  const isEditing           = !!existing
  const [saving, setSaving] = useState(false)

  // ── Form state — mirrors BrandProfile exactly ─────────────────────────────
  const [name, setName] = useState(existing?.name ?? '')
  const [toneVoice, setToneVoice] = useState<ToneVoice>(existing?.toneVoice ?? 'professional')
  const [targetAudience, setTargetAudience] = useState(existing?.targetAudience ?? '')
  const [keyMessagingRaw, setKeyMessagingRaw] = useState(existing?.keyMessaging.join('\n') ?? '')
  const [brandHashtagsRaw, setBrandHashtagsRaw] = useState(existing?.brandHashtags.join(' ') ?? '')
  const [avoidTopicsRaw, setAvoidTopicsRaw] = useState(existing?.avoidTopics.join('\n') ?? '')
  const [styleNotes, setStyleNotes] = useState(existing?.styleNotes ?? '')
  const [sampleHooksRaw, setSampleHooksRaw] = useState(existing?.sampleHooks.join('\n') ?? '')
  const [sampleCaptionsRaw, setSampleCaptionsRaw] = useState(existing?.sampleCaptions.join('\n') ?? '')
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false)

  // platformPreferences
  const [primaryPlatform, setPrimaryPlatform] = useState(
    existing?.platformPreferences?.primaryPlatform ?? ''
  )
  const [secondaryPlatforms, setSecondaryPlatforms] = useState<string[]>(
    existing?.platformPreferences?.secondaryPlatforms ?? []
  )

  // voiceCharacteristics
  const [formalLevel, setFormalLevel] = useState(existing?.voiceCharacteristics?.formalLevel ?? 5)
  const [emotionLevel, setEmotionLevel] = useState(existing?.voiceCharacteristics?.emotionLevel ?? 5)
  const [jargonLevel, setJargonLevel] = useState(existing?.voiceCharacteristics?.jargonLevel ?? 3)
  const [sentenceLengthPreference, setSentenceLengthPreference] = useState(
    existing?.voiceCharacteristics?.sentenceLengthPreference ?? 'medium'
  )

  const toggleSecondaryPlatform = (platform: string) => {
    setSecondaryPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)

    const profile: BrandProfile = {
      profileId:    existing?.profileId ?? uid('bp'),
      name:         name.trim(),
      toneVoice,
      targetAudience: targetAudience.trim(),
      keyMessaging:   parseList(keyMessagingRaw),
      brandHashtags:  parseHashtags(brandHashtagsRaw),
      avoidTopics:    parseList(avoidTopicsRaw),
      styleNotes:     styleNotes.trim() || undefined,
      sampleHooks:    parseList(sampleHooksRaw),
      sampleCaptions: parseList(sampleCaptionsRaw),
      voiceCharacteristics: {
        formalLevel,
        emotionLevel,
        jargonLevel,
        sentenceLengthPreference,
      },
      platformPreferences: primaryPlatform
        ? { primaryPlatform, secondaryPlatforms }
        : undefined,
      isDefault,
      createdAt:  existing?.createdAt ?? new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    }

    saveBrandProfile(profile)

    // Brief visual feedback
    await new Promise((r) => setTimeout(r, 400))
    setSaving(false)

    addToast({
      type:    'success',
      title:   isEditing ? 'Profile updated' : 'Profile created',
      message: `"${name}" has been saved.`,
      duration: 4000,
    })

    navigate('/clips/settings')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/clips/settings')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-0.5">
            Settings / Brand Profiles
          </p>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {isEditing ? 'Edit Brand Profile' : 'New Brand Profile'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? 'Update your brand identity and content preferences'
              : 'Define a new brand identity for consistent clip output'}
          </p>
        </div>
      </div>

      {/* ── Film-strip divider ── */}
      <div className="film-strip rounded-full" />

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── 1. Brand Identity ── */}
        <Section icon={<Palette />} title="Brand Identity" description="Core information about your brand">
          <Input
            label="Brand Name"
            placeholder="e.g. ViralMind Media"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<Palette />}
            required
          />

          <Select
            label="Tone of Voice"
            options={TONE_OPTIONS}
            value={toneVoice}
            onChange={(e) => setToneVoice(e.target.value as ToneVoice)}
          />

          <Textarea
            label="Target Audience"
            icon={<Users />}
            placeholder="Describe your ideal viewer — demographics, interests, platform behaviour…"
            value={targetAudience}
            onChange={setTargetAudience}
            minHeight={72}
          />

          {/* ── Default profile toggle ── */}
          <div
            onClick={() => setIsDefault((v) => !v)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none',
              isDefault
                ? 'border-primary/50 bg-primary-light text-primary'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80',
            )}
          >
            <div className={cn(
              'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all',
              isDefault ? 'border-primary bg-primary' : 'border-muted-foreground',
            )}>
              {isDefault && <Star className="h-2.5 w-2.5 text-primary-foreground" />}
            </div>
            <div>
              <p className="text-sm font-medium">Set as default profile</p>
              <p className="text-xs opacity-70">Used automatically when no profile is selected</p>
            </div>
          </div>
        </Section>

        {/* ── 2. Voice Characteristics ── */}
        <Section
          icon={<SlidersHorizontal />}
          title="Voice Characteristics"
          description="Fine-tune how the AI writes and speaks"
        >
          <SliderField label="Formality Level" value={formalLevel} onChange={setFormalLevel} />
          <SliderField label="Emotional Energy" value={emotionLevel} onChange={setEmotionLevel} />
          <SliderField label="Jargon / Technical Language" value={jargonLevel} onChange={setJargonLevel} />

          <Select
            label="Sentence Length Preference"
            options={SENTENCE_LENGTH_OPTIONS}
            value={sentenceLengthPreference}
            onChange={(e) => setSentenceLengthPreference(e.target.value)}
          />
        </Section>

        {/* ── 3. Key Messaging & Style ── */}
        <Section
          icon={<MessageSquare />}
          title="Key Messaging & Style"
          description="What your brand always says — and how it looks"
        >
          <Textarea
            label="Key Messaging Pillars"
            icon={<Sparkles />}
            placeholder={`One per line:\nWe help creators grow on social.\nAuthenticity over perfection.`}
            value={keyMessagingRaw}
            onChange={setKeyMessagingRaw}
            minHeight={100}
          />

          <Textarea
            label="Visual / Style Notes"
            icon={<Film />}
            placeholder="Color palette, transitions, caption style, lighting, B-roll direction…"
            value={styleNotes}
            onChange={setStyleNotes}
            minHeight={80}
          />
        </Section>

        {/* ── 4. Discovery & Hashtags ── */}
        <Section
          icon={<Hash />}
          title="Discovery & Hashtags"
          description="Brand hashtags used on every clip"
        >
          <Textarea
            label="Brand Hashtags"
            icon={<Hash />}
            placeholder="#viral #trending #yourBrand — space or comma separated"
            value={brandHashtagsRaw}
            onChange={setBrandHashtagsRaw}
            minHeight={60}
          />

          <Textarea
            label="Avoid Topics"
            icon={<ShieldAlert />}
            placeholder={`Topics the AI must never surface:\nPolitics\nCompetitor names\nControversial subjects`}
            value={avoidTopicsRaw}
            onChange={setAvoidTopicsRaw}
            minHeight={80}
          />
        </Section>

        {/* ── 5. Target Platforms ── */}
        <Section
          icon={<Link />}
          title="Target Platforms"
          description="Where you publish — primary platform drives aspect ratio"
        >
          {/* Primary platform radio-style */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Primary Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPrimaryPlatform((prev) => prev === p.value ? '' : p.value)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all',
                    primaryPlatform === p.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/50',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary platforms */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Also publish to</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS
                .filter((p) => p.value !== primaryPlatform)
                .map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => toggleSecondaryPlatform(p.value)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all',
                      secondaryPlatforms.includes(p.value)
                        ? 'bg-surface border-primary/50 text-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/30',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
            </div>
          </div>
        </Section>

        {/* ── 6. Sample Content ── */}
        <Section
          icon={<Sparkles />}
          title="Sample Content"
          description="Example hooks and captions the AI can learn from"
        >
          <Textarea
            label="Sample Hooks"
            placeholder={`One per line — opening lines that grab attention:\n"You won't believe what happened when..."\n"The one thing nobody tells you about..."`}
            value={sampleHooksRaw}
            onChange={setSampleHooksRaw}
            minHeight={100}
          />

          <Textarea
            label="Sample Captions"
            placeholder={`One per line — full clip captions as examples:\n"This changed everything for me. Save this if you're a creator."`}
            value={sampleCaptionsRaw}
            onChange={setSampleCaptionsRaw}
            minHeight={100}
          />
        </Section>

        {/* ── Submit bar ── */}
        <div className="flex items-center gap-3 pt-2 pb-6">
          <Button type="submit" disabled={!name.trim() || saving}>
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? 'Save Changes' : 'Create Profile'}
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/clips/settings')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
