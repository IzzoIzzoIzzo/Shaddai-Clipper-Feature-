import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDuration, formatFileSize, formatDate, cn } from '@/lib/utils'
import { ArrowLeft, Sparkles, Play, FileVideo, Info, Loader2, FolderOpen } from 'lucide-react'
import { useClipsStore } from '@/stores/clipsStore'

const emotionVariants: Record<string, BadgeProps['variant']> = {
  positive: 'success',
  insightful: 'info',
  curious: 'warning',
  emphatic: 'purple',
  confident: 'success',
  reflective: 'default',
  provocative: 'purple',
  authoritative: 'info',
}

export function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>()
  const navigate = useNavigate()
  const source = useClipsStore((s) => s.sources.find((x) => x.sourceId === sourceId))
  const segments = useClipsStore((s) => (sourceId ? s.transcripts[sourceId] : undefined)) || []

  // Not found
  if (!source) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <button
          onClick={() => navigate('/clips/sources')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Sources
        </button>
        <Card className="p-16 text-center">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Source not found. It may have been deleted.</p>
        </Card>
      </div>
    )
  }

  // Still processing (uploading / normalizing) — no transcript yet
  const processing = source.status === 'uploading' || source.status === 'normalizing'
  if (processing) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <button
          onClick={() => navigate('/clips/sources')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Sources
        </button>
        <Card className="p-16 text-center">
          <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
          <h2 className="text-lg font-semibold">{source.title}</h2>
          <p className="text-muted-foreground mt-1">
            {source.status === 'uploading' ? 'Ingesting & extracting audio…' : 'Transcribing & detecting highlights…'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">This page updates automatically when processing finishes.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate('/clips/sources')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Sources
      </button>

      {/* Source Info */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-light shrink-0">
                <FileVideo className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{source.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{source.originalFilename}</p>
              </div>
            </div>
            <Badge variant={source.status === 'ingested' ? 'success' : 'info'}>{source.status}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Duration', value: formatDuration(source.durationSec) },
              { label: 'Size', value: formatFileSize(source.fileSizeBytes) },
              { label: 'Resolution', value: source.metadata.resolution },
              { label: 'Uploaded', value: formatDate(source.createdAt) },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-lg bg-muted">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <p className="font-medium mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 animate-slide-up">
        <Button onClick={() => navigate(`/clips/sources/${sourceId}/candidates`)} size="lg">
          <Sparkles className="h-4 w-4" />
          Generate Clips
        </Button>
        {source.transcriptId && (
          <Badge variant="success" size="sm" className="text-xs">
            <Play className="h-3 w-3 mr-1" /> Transcribed
          </Badge>
        )}
      </div>

      {/* Transcript Preview */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="h-4 w-4 text-muted-foreground" />
            Transcript Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {segments.slice(0, 8).map((seg, i) => (
              <div
                key={seg.id}
                className={cn(
                  'flex gap-3 text-sm p-3 rounded-lg transition-colors hover:bg-muted/50',
                  i > 0 && 'border-t border-border/50'
                )}
              >
                <div className="text-xs text-muted-foreground w-14 shrink-0 pt-0.5 font-mono">
                  {formatDuration(seg.startSec)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs text-primary">Speaker {seg.speaker}</span>
                    <span className="text-[10px] text-muted-foreground">{(seg.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-foreground">{seg.text}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {seg.topics.map((topic) => (
                      <Badge key={topic} size="sm" variant="info">{topic}</Badge>
                    ))}
                    <Badge size="sm" variant={emotionVariants[seg.emotion] || 'default'}>
                      {seg.emotion}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Technical Metadata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {Object.entries(source.metadata).map(([key, val]) => (
              <div key={key} className="p-2 rounded-lg bg-muted">
                <span className="text-muted-foreground capitalize">{key}</span>
                <p className="font-medium mt-0.5">{String(val)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
