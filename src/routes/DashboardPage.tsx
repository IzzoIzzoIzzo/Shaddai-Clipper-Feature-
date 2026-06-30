import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils'
import { Upload, Film, Clock, TrendingUp, ArrowRight, Sparkles, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClipsStore } from '@/stores/clipsStore'

export function DashboardPage() {
  const navigate = useNavigate()
  const sources = useClipsStore((s) => s.sources)
  const batches = useClipsStore((s) => s.batches)
  const clips = useClipsStore((s) => s.clips)

  const clipUsage = clips.length
  const clipLimit = 50

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between animate-fade-in">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-primary mb-2">● Now Editing</p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[0.95]">
            Cut the <span className="gradient-text">noise.</span><br />Ship the moments.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md">
            Drop a long-form video — SHADDAI finds the viral moments, writes the hooks, and renders clips for every platform.
          </p>
        </div>
        <Button size="lg" onClick={() => navigate('/clips/upload')} className="shrink-0">
          <Upload className="h-4 w-4" />
          New Source
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
        <Card className="card-hover stagger-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary-light">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sources.length}</p>
              <p className="text-xs text-muted-foreground">Sources Uploaded</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-success-light">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{batches.reduce((s, b) => s + b.totalClipsGenerated, 0)}</p>
              <p className="text-xs text-muted-foreground">Clips Generated</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-3">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-warning-light">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sources.reduce((s, src) => s + Math.round(src.durationSec / 60), 0)}m</p>
              <p className="text-xs text-muted-foreground">Total Content Processed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Monthly Clip Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressBar value={clipUsage} max={clipLimit} showLabel size="lg" className="mb-1" />
          <p className="text-xs text-muted-foreground">
            {clipUsage} of {clipLimit} clips used this month (Free tier)
          </p>
        </CardContent>
      </Card>

      {/* Recent Sources */}
      <section className="animate-slide-up stagger-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Sources</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/clips/sources')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source, i) => (
            <Card
              key={source.sourceId}
              className={cn('cursor-pointer card-hover', `stagger-${i + 1}`)}
              onClick={() => navigate(`/clips/sources/${source.sourceId}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{source.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{source.originalFilename}</p>
                  </div>
                  <Badge variant={source.status === 'ingested' ? 'success' : 'info'} size="sm">
                    {source.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDuration(source.durationSec)}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{formatFileSize(source.fileSizeBytes)}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{formatDate(source.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {sources.length === 0 && (
          <Card className="p-12 text-center">
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">No sources yet. Upload your first video to get started!</p>
            <Button onClick={() => navigate('/clips/upload')}>Upload Now</Button>
          </Card>
        )}
      </section>

      {/* Recent Batches */}
      <section className="animate-slide-up stagger-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Generations</h3>
        </div>
        {batches.length > 0 ? batches.map((batch) => (
          <Card key={batch.batchId} className="mb-3 card-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge variant={batch.status === 'reviewing' ? 'warning' : 'success'}>
                    {batch.status}
                  </Badge>
                  <span className="text-sm font-medium">{batch.totalClipsGenerated} clips generated</span>
                  <span className="text-xs text-muted-foreground flex gap-0.5">
                    {batch.platforms.map((p) => (
                      <span key={p}>{p === 'tiktok' ? '🎵' : p === 'reels' ? '📸' : p === 'x' ? '🐦' : p === 'linkedin' ? '💼' : '▶️'}</span>
                    ))}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ${batch.totalCostUsd.toFixed(2)} — {formatDate(batch.createdAt)}
                </div>
              </div>
              <ProgressBar value={batch.progressPct} showLabel size="sm" />
              <div className="flex items-center gap-2 mt-3">
                {batch.clips.map((clip) => (
                  <Badge key={clip.clipId} variant="default" size="sm" className="max-w-[140px] truncate">
                    {clip.title}
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate(`/clips/batches/${batch.batchId}`)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )) : (
          <Card className="p-12 text-center">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">No clip generations yet. Upload a source and generate your first clips!</p>
            <Button onClick={() => navigate('/clips/upload')}>
              <Upload className="h-4 w-4" />
              Upload Source
            </Button>
          </Card>
        )}
      </section>
    </div>
  )
}
