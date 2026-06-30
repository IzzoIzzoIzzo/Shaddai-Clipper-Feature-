import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDuration } from '@/lib/utils'
import { PLATFORMS } from '@/lib/constants'
import { ArrowLeft, Check, Sparkles, SlidersHorizontal, Brain } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'

export function CandidateReviewPage() {
  const { sourceId } = useParams<{ sourceId: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const candidates = useClipsStore((s) => (sourceId ? s.candidates[sourceId] : undefined)) || []
  const generateClips = useClipsStore((s) => s.generateClips)
  const setCandidateSelection = useClipsStore((s) => s.setCandidateSelection)
  const [selected, setSelected] = useState<string[]>(() => candidates.slice(0, 3).map((c) => c.candidateId))
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'reels', 'x'])

  const toggleCandidate = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const autoSelect = () => {
    setSelected(candidates.slice(0, 3).map((c) => c.candidateId))
    addToast({ type: 'info', title: 'Top 3 selected', message: 'Auto-selected highest-scoring candidates', duration: 3000 })
  }

  const handleGenerate = () => {
    if (!sourceId || selected.length === 0) return
    setCandidateSelection(sourceId, selected)
    generateClips({ sourceId, candidateIds: selected, platforms: selectedPlatforms })
      .then((batchId) => {
        addToast({ type: 'info', title: 'Rendering started', message: `Cutting ${selected.length} clips across ${selectedPlatforms.length} platforms`, duration: 3000 })
        navigate(`/clips/batches/${batchId}`)
      })
      .catch((err) => addToast({ type: 'error', title: 'Generation failed', message: String(err.message), duration: 5000 }))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Source
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clip Candidates</h2>
          <p className="text-muted-foreground mt-1">Select the best moments to turn into viral clips</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={autoSelect}>
            <Sparkles className="h-4 w-4" /> Auto-select Top 3
          </Button>
        </div>
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((candidate, i) => {
          const isSelected = selected.includes(candidate.candidateId)
          const scoreColor = candidate.compositeScore >= 0.8
            ? 'bg-success-light text-success'
            : candidate.compositeScore >= 0.7
              ? 'bg-warning-light text-warning'
              : 'bg-muted text-muted-foreground'
          return (
            <Card
              key={candidate.candidateId}
              className={cn(
                'cursor-pointer transition-all card-hover',
                isSelected && 'ring-2 ring-primary shadow-md',
                `animate-fade-in stagger-${i + 1}`
              )}
              onClick={() => toggleCandidate(candidate.candidateId)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold', scoreColor)}>
                      {Math.round(candidate.compositeScore * 100)}
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </div>
                  <Badge variant="info" size="sm">{candidate.primaryTopic}</Badge>
                </div>

                <p className="text-sm mb-3 line-clamp-2 leading-relaxed">{candidate.summarySentence}</p>

                <div className="text-xs text-muted-foreground mb-3 font-mono">
                  {formatDuration(candidate.startSec)} – {formatDuration(candidate.endSec)}
                  <span className="text-muted-foreground/50"> ({formatDuration(candidate.durationSec)})</span>
                </div>

                {/* Signal bars */}
                <div className="space-y-1.5">
                  {Object.entries(candidate.signals).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize w-14">{key}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            val >= 0.8 ? 'bg-success' : val >= 0.6 ? 'bg-warning' : 'bg-muted-foreground/30'
                          )}
                          style={{ width: `${val * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1 mt-3">
                  {candidate.speakers.map((s) => (
                    <Badge key={s} size="sm" variant="default">
                      Speaker {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Generation Config */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-xs text-muted-foreground block mb-1.5">Target Platforms</span>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatforms((prev) =>
                      prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                    )}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-xs transition-all',
                      selectedPlatforms.includes(p.id)
                        ? 'border-primary bg-primary-light text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
              <Brain className="h-3.5 w-3.5" />
              Selected: <strong>{selected.length}</strong> / {candidates.length} candidates
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate */}
      <div className="flex items-center gap-3 animate-slide-up">
        <Button
          size="lg"
          disabled={selected.length === 0 || selectedPlatforms.length === 0}
          onClick={handleGenerate}
        >
          <Sparkles className="h-5 w-5" />
          Generate {selected.length} Clips
        </Button>
        <span className="text-xs text-muted-foreground">
          Est. cost: ~${(selected.length * selectedPlatforms.length * 0.03).toFixed(2)}
        </span>
      </div>
    </div>
  )
}
