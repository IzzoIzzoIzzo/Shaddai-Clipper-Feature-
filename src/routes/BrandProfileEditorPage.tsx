import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Palette, FileText, Film, Music, Volume2, Hash, Link, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'
import { uid } from '@/api/mockApi'
import type { BrandProfile, ToneVoice } from '@/types/api'
import { cn } from '@/lib/utils'

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'luxury', label: 'Luxury' },
]

const platformOptions = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram Reels' },
  { value: 'youtube', label: 'YouTube Shorts' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
]

export default function BrandProfileEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const existing = useClipsStore((s) => (id && id !== 'new' ? s.brandProfiles.find((p) => p.profileId === id) : undefined))
  const saveBrandProfile = useClipsStore((s) => s.saveBrandProfile)
  const isEditing = !!existing
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    description: existing?.targetAudience ?? '',
    tone: existing?.toneVoice ?? 'professional',
    platforms: existing?.platformPreferences
      ? [existing.platformPreferences.primaryPlatform, ...existing.platformPreferences.secondaryPlatforms]
      : ([] as string[]),
    visualPreferences: existing?.styleNotes ?? '',
    musicPreferences: '',
    voicePreferences: '',
    hashtags: existing?.brandHashtags.join(' ') ?? '',
    competitors: '',
    website: '',
  })

  const update = (field: string, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const togglePlatform = (platform: string) => {
    const current = form.platforms
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform]
    update('platforms', next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const hashtags = form.hashtags.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : '#' + h))
    const profile: BrandProfile = {
      profileId: existing?.profileId ?? uid('bp'),
      name: form.name,
      toneVoice: form.tone as ToneVoice,
      targetAudience: form.description,
      keyMessaging: existing?.keyMessaging ?? [],
      brandHashtags: hashtags,
      avoidTopics: existing?.avoidTopics ?? [],
      styleNotes: form.visualPreferences,
      sampleHooks: existing?.sampleHooks ?? [],
      sampleCaptions: existing?.sampleCaptions ?? [],
      platformPreferences: form.platforms.length
        ? { primaryPlatform: form.platforms[0]!, secondaryPlatforms: form.platforms.slice(1) }
        : undefined,
      isDefault: existing?.isDefault ?? false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveBrandProfile(profile)
    await new Promise((r) => setTimeout(r, 500))
    setSaving(false)
    addToast({
      type: 'success',
      title: isEditing ? 'Profile updated' : 'Profile created',
      message: `"${form.name}" has been saved successfully.`,
      duration: 4000,
    })
    navigate('/clips/settings')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/clips/settings')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'Edit Brand Profile' : 'Create Brand Profile'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? 'Update your brand identity and content preferences'
              : 'Define a new brand identity for content creation'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identity */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Palette className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Brand Identity</h2>
            </div>
            <p className="text-sm text-muted-foreground">Core information about your brand</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Brand Name"
              placeholder="e.g. ViralMind Media"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              icon={<Palette />}
              required
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground block">Description</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
                placeholder="Describe your brand's personality and style..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
            <Select
              label="Tone of Voice"
              options={toneOptions}
              value={form.tone}
              onChange={(e) => update('tone', e.target.value)}
            />
            <Input
              label="Website"
              placeholder="https://example.com"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              icon={<Globe />}
            />
          </CardContent>
        </Card>

        {/* Platforms */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Link className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Target Platforms</h2>
            </div>
            <p className="text-sm text-muted-foreground">Where you publish your content</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all',
                    form.platforms.includes(p.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Creative Preferences */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Film className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Creative Preferences</h2>
            </div>
            <p className="text-sm text-muted-foreground">Visual and audio style guides</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Film className="h-4 w-4 text-muted-foreground" />
                Visual Style
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
                placeholder="Color palette, lighting, transitions, aesthetic..."
                value={form.visualPreferences}
                onChange={(e) => update('visualPreferences', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  Music Preferences
                </label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
                  placeholder="Genres, mood, tempo..."
                  value={form.musicPreferences}
                  onChange={(e) => update('musicPreferences', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  Voice Preferences
                </label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
                  placeholder="Voice type, accent, energy..."
                  value={form.voicePreferences}
                  onChange={(e) => update('voicePreferences', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discovery */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Hash className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Discovery & Competition</h2>
            </div>
            <p className="text-sm text-muted-foreground">Help the AI find relevant content</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Hashtags / Keywords"
              placeholder="e.g. #viral #trending #content"
              value={form.hashtags}
              onChange={(e) => update('hashtags', e.target.value)}
              icon={<Hash />}
            />
            <Input
              label="Competitors / Inspirations"
              placeholder="e.g. MrBeast, Casey Neistat"
              value={form.competitors}
              onChange={(e) => update('competitors', e.target.value)}
              icon={<FileText />}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={!form.name || saving}>
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
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
