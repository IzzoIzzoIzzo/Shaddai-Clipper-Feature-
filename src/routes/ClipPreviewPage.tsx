import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Share2, Download, Check } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'

const PLATFORM_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  tiktok: { label: 'TikTok', icon: '🎵', color: 'text-secondary' },
  reels: { label: 'Instagram Reels', icon: '📸', color: 'text-purple' },
  youtube_shorts: { label: 'YouTube Shorts', icon: '▶️', color: 'text-danger' },
  x: { label: 'X / Twitter', icon: '🐦', color: 'text-info' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'text-primary' },
}

export function ClipPreviewPage() {
  const { clipId, platform } = useParams<{ clipId: string; platform: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)

  const clip = useClipsStore((s) => s.clips.find((c) => c.clipId === clipId))
  const platformInfo = PLATFORM_LABELS[platform || ''] || { label: platform || 'Unknown', icon: '▶️', color: '' }
  const asset = clip?.platformAssets[platform || '']
  const previewCaption = asset?.caption || asset?.postBody || clip?.captions.primary || ''

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to editor
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            <span className={platformInfo.color}>{platformInfo.icon}</span>{' '}
            {platformInfo.label} Preview
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">See how your clip will appear to viewers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            addToast({ type: 'success', title: 'Copied!', message: 'Preview link copied to clipboard.', duration: 3000 })
          }}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Download
          </Button>
        </div>
      </div>

      <Card className="card-hover">
        <CardContent className="p-8 flex flex-col items-center">
          {/* Phone Frame */}
          <div className="w-[320px] rounded-[2rem] border-4 border-border overflow-hidden bg-muted shadow-2xl">
            <div className="aspect-[9/16] flex items-center justify-center relative">
              <div className="text-center px-4">
                <div className="text-6xl mb-4 animate-float">{platformInfo.icon}</div>
                {clip ? (
                  <>
                    <p className="text-sm font-bold text-primary leading-snug">{clip.hooks.curiosity}</p>
                    <div className="w-full h-0.5 bg-foreground/10 rounded my-3" />
                    <p className="text-xs text-foreground/80 leading-relaxed">{previewCaption.slice(0, 160)}</p>
                    <p className="text-[10px] text-muted-foreground mt-3">{clip.title} · {clip.durationSec}s</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">Rendered Clip Preview</p>
                    <p className="text-xs text-muted-foreground mt-1">Clip ID: {clipId?.slice(0, 8)}...</p>
                  </>
                )}
              </div>
              {/* Top notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground/10 rounded-full" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-6 text-center max-w-sm">
            This is a platform-specific preview for {platformInfo.label}. In production, the rendered video
            with captions, overlays, and platform-optimized formatting will display here.
          </p>

          <div className="flex items-center gap-3 mt-6">
            <Button onClick={() => navigate(-1)}>
              <Check className="h-4 w-4" /> Looks Good
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back to Editor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
