import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, Save, Check, Share2, Sparkles, Hash, Type, MessageSquare, FolderOpen } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'

const PLATFORM_TABS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'reels', label: 'Reels', icon: '📸' },
  { id: 'youtube_shorts', label: 'Shorts', icon: '▶️' },
  { id: 'x', label: 'X', icon: '🐦' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
]

const HOOK_BADGES: Record<string, BadgeProps['variant']> = {
  curiosity: 'info',
  contrarian: 'purple',
  quote: 'success',
  list: 'warning',
  question: 'danger',
} as const

export function ClipEditorPage() {
  const { clipId } = useParams<{ clipId: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const clip = useClipsStore((s) => s.clips.find((c) => c.clipId === clipId))
  const updateClip = useClipsStore((s) => s.updateClip)
  const enqueueExport = useClipsStore((s) => s.enqueueExport)
  const [selectedHook, setSelectedHook] = useState<string>('curiosity')
  const [activePlatform, setActivePlatform] = useState('tiktok')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [primaryCaption, setPrimaryCaption] = useState(clip?.captions.primary ?? '')
  const [secondaryCaption, setSecondaryCaption] = useState(clip?.captions.secondary ?? '')

  if (!clip) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <button onClick={() => navigate('/clips')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <Card className="p-16 text-center">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Clip not found. Generate clips from a source to see them here.</p>
        </Card>
      </div>
    )
  }

  const handleSave = () => {
    setSaving(true)
    updateClip(clip.clipId, { captions: { primary: primaryCaption, secondary: secondaryCaption } })
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      addToast({ type: 'success', title: 'Draft saved', message: 'Your clip changes have been saved.', duration: 3000 })
    }, 600)
  }

  const handleApprove = () => {
    updateClip(clip.clipId, { status: 'approved' })
    addToast({
      type: 'success',
      title: 'Clip approved!',
      message: 'Ready for export. Navigate to Export Queue to publish.',
      duration: 4000,
      action: { label: 'View Queue', onClick: () => navigate('/clips/export-queue') },
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">{clip.title}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{clip.durationSec}s</span>
              <span className="text-muted-foreground/30">•</span>
              <span>Score: {(clip.compositeScore * 100).toFixed(0)}</span>
              <span className="text-muted-foreground/30">•</span>
              <Badge variant="default" size="sm">{clip.status}</Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? 'Saved!' : 'Save Draft'}
          </Button>
          <Button onClick={handleApprove}>
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Preview Area */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎬</div>
                  <p className="text-sm font-medium">Video Preview</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Clip: {Math.floor(clip.startSec / 60)}:{Math.round(clip.startSec % 60).toString().padStart(2, '0')} – {Math.floor(clip.endSec / 60)}:{Math.round(clip.endSec % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Preview */}
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-1 mb-4 border-b border-border pb-2">
                {PLATFORM_TABS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlatform(p.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
                      activePlatform === p.id
                        ? 'bg-primary-light text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <span>{p.icon}</span>
                    <span className="hidden sm:inline">{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <div className="w-[280px] rounded-2xl border-4 border-border overflow-hidden bg-muted shadow-lg">
                  <div className="aspect-[9/16] flex items-center justify-center text-muted-foreground text-sm">
                    {activePlatform === 'x' ? (
                      <div className="p-4 text-left w-full">
                        <p className="font-medium mb-3 flex items-center gap-1.5">🐦 Thread Preview</p>
                        <div className="space-y-3">
                          <div className="p-2 rounded-lg bg-card text-xs border border-border">
                            <p className="font-medium mb-1">Tweet 1</p>
                            <p className="text-muted-foreground">{clip.captions.primary.slice(0, 130)}...</p>
                          </div>
                          <div className="p-2 rounded-lg bg-card text-xs border border-border">
                            <p className="font-medium mb-1">Tweet 2</p>
                            <p className="text-muted-foreground">{clip.captions.secondary.slice(0, 100)}...</p>
                          </div>
                        </div>
                      </div>
                    ) : activePlatform === 'linkedin' ? (
                      <div className="p-4 text-left w-full">
                        <p className="font-medium mb-3 flex items-center gap-1.5">💼 LinkedIn Post</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{clip.captions.primary}</p>
                      </div>
                    ) : (
                      <div className="text-center p-4 w-full">
                        <p className="text-base font-bold text-primary mb-3 leading-snug">
                          {clip.hooks[selectedHook as keyof typeof clip.hooks]}
                        </p>
                        <div className="w-full h-0.5 bg-muted-foreground/20 rounded my-3" />
                        <p className="text-xs text-muted-foreground">[Video playing — {clip.durationSec}s]</p>
                        <div className="mt-3 p-2 rounded-lg bg-foreground/5 text-xs text-left">{clip.captions.primary.slice(0, 80)}...</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hooks */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Hooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(clip.hooks).map(([type, text]) => (
                <div
                  key={type}
                  onClick={() => setSelectedHook(type)}
                  className={cn(
                    'p-3 rounded-lg border text-sm cursor-pointer transition-all',
                    selectedHook === type
                      ? 'border-primary bg-primary-light'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={HOOK_BADGES[type] || 'default'} size="sm">
                      {type}
                    </Badge>
                    {selectedHook === type && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Captions */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Captions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Primary</label>
                <textarea
                  value={primaryCaption}
                  onChange={(e) => { setPrimaryCaption(e.target.value); setSaved(false) }}
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Secondary</label>
                <textarea
                  value={secondaryCaption}
                  onChange={(e) => { setSecondaryCaption(e.target.value); setSaved(false) }}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Hashtags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Core', tags: clip.hashtags.core, variant: 'info' as const },
                { label: 'Niche', tags: clip.hashtags.niche, variant: 'purple' as const },
                { label: 'Brand', tags: clip.hashtags.brand, variant: 'warning' as const },
              ].map((group) => (
                <div key={group.label}>
                  <span className="text-xs text-muted-foreground font-medium">{group.label}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.tags.map((tag) => (
                      <Badge key={tag} variant={group.variant} size="sm">{tag}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/clips/clips/${clipId}/preview/tiktok`)}
            >
              <Share2 className="h-4 w-4" /> Preview
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                enqueueExport(clip.clipId, activePlatform)
                addToast({ type: 'info', title: 'Export queued', message: `Publishing to ${activePlatform}…`, duration: 3000 })
                navigate('/clips/export-queue')
              }}
            >
              <Type className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
