import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { PIPELINE_STAGES } from '@/lib/constants'
import { cn, formatDuration, getStageEmoji } from '@/lib/utils'
import { Check, Loader2, Sparkles, Clock, DollarSign, Cpu, FolderOpen, ArrowLeft } from 'lucide-react'
import type { BatchClipSummary } from '@/types/api'
import { useClipsStore } from '@/stores/clipsStore'

const stageOrder = PIPELINE_STAGES.map((s) => s.id) as string[]

export function BatchProgressPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  const batch = useClipsStore((s) => s.batches.find((b) => b.batchId === batchId))

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <button onClick={() => navigate('/clips')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <Card className="p-16 text-center">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Batch not found.</p>
        </Card>
      </div>
    )
  }

  const currentStageIdx = stageOrder.indexOf(batch.currentStage as string)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Generation Progress</h2>
        <p className="text-muted-foreground mt-1">
          {batch.status === 'reviewing'
            ? 'Clips ready for review!'
            : 'Processing your content through the AI pipeline...'}
        </p>
      </div>

      {/* Pipeline Stages */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isDone = idx < currentStageIdx
              const isCurrent = idx === currentStageIdx
              const isPending = idx > currentStageIdx
              return (
                <div key={stage.id} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500',
                      isDone && 'bg-success-light text-success',
                      isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30 animate-pulse-soft',
                      isPending && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : getStageEmoji(stage.id)}
                  </div>
                  <span
                    className={cn(
                      'text-xs text-center leading-tight',
                      isCurrent && 'text-primary font-medium',
                      isDone && 'text-success',
                      isPending && 'text-muted-foreground'
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>

          <ProgressBar value={batch.progressPct} showLabel size="lg" className="mb-2" />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {batch.status !== 'reviewing' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                {batch.currentStage === 'generating'
                  ? `Generating clips... ${batch.totalClipsGenerated}/${batch.totalClipsRequested} done`
                  : `Processing: ${batch.currentStage} stage`}
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-success" />
                Processing complete! Review your clips below.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up">
        {[
          { icon: DollarSign, label: 'Estimated Cost', value: `$${batch.totalCostUsd.toFixed(2)}`, color: 'text-warning', bg: 'bg-warning-light' },
          { icon: Cpu, label: 'Tokens Used', value: batch.aiTokensUsed.toLocaleString(), color: 'text-purple', bg: 'bg-purple-light' },
          { icon: Clock, label: 'Duration', value: formatDuration(batch.processingDurationSec || 0), color: 'text-info', bg: 'bg-info-light' },
        ].map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <p className="font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generated Clips */}
      <section className="animate-slide-up stagger-3">
        <h3 className="text-lg font-semibold mb-4">Generated Clips</h3>
        <div className="space-y-2">
          {batch.clips.map((clip, i) => (
            <ClipRow key={clip.clipId} clip={clip} index={i} onClick={() => navigate(`/clips/clips/${clip.clipId}`)} />
          ))}
        </div>
      </section>

      {/* Actions */}
      {batch.status === 'reviewing' && (
        <div className="flex items-center gap-3 animate-slide-up">
          <Button size="lg" onClick={() => navigate(`/clips/clips/${batch.clips[0]?.clipId}`)}>
            <Sparkles className="h-4 w-4" />
            Review All Clips
          </Button>
          <Button variant="outline" size="lg">
            View Details
          </Button>
        </div>
      )}
    </div>
  )
}

function ClipRow({ clip, index, onClick }: { clip: BatchClipSummary; index: number; onClick: () => void }) {
  const statusColors: Record<string, BadgeProps['variant']> = {
    draft: 'success',
    rendering: 'info',
    generating: 'warning',
  }

  return (
    <Card
      className={cn('cursor-pointer card-hover', `animate-fade-in stagger-${index + 1}`)}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getStageEmoji(clip.status)}</span>
          <div>
            <p className="text-sm font-medium">{clip.title}</p>
            <p className="text-xs text-muted-foreground">{formatDuration(clip.durationSec)}</p>
          </div>
        </div>
        <Badge variant={statusColors[clip.status] || 'default'} size="sm">
          {clip.status}
        </Badge>
      </CardContent>
    </Card>
  )
}
