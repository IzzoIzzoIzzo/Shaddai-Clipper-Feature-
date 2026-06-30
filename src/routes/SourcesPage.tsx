import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDuration, formatFileSize, formatDate, cn } from '@/lib/utils'
import { Upload, Search, ArrowRight, FolderOpen } from 'lucide-react'
import { useClipsStore } from '@/stores/clipsStore'

export function SourcesPage() {
  const navigate = useNavigate()
  const sources = useClipsStore((s) => s.sources)
  const [search, setSearch] = useState('')

  const filtered = sources.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.originalFilename.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sources</h2>
          <p className="text-muted-foreground mt-1">All your uploaded content</p>
        </div>
        <Button onClick={() => navigate('/clips/upload')}>
          <Upload className="h-4 w-4" />
          Upload New
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search sources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
      </div>

      {/* Source List */}
      <div className="space-y-3">
        {filtered.map((source, i) => (
          <Card
            key={source.sourceId}
            className={cn('cursor-pointer card-hover', `animate-fade-in stagger-${i + 1}`)}
            onClick={() => navigate(`/clips/sources/${source.sourceId}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{source.title}</h3>
                    <Badge
                      variant={source.status === 'ingested' ? 'success' : source.status === 'failed' ? 'danger' : 'info'}
                      size="sm"
                    >
                      {source.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{source.originalFilename}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1.5" />
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{formatDuration(source.durationSec)}</span>
                <span className="text-muted-foreground/30">•</span>
                <span>{formatFileSize(source.fileSizeBytes)}</span>
                <span className="text-muted-foreground/30">•</span>
                <span>{formatDate(source.createdAt)}</span>
                {source.transcriptId && (
                  <>
                    <span className="text-muted-foreground/30">•</span>
                    <span className="text-success font-medium">Transcribed</span>
                  </>
                )}
              </div>
              {source.errorMessage && (
                <p className="text-xs text-danger mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                  {source.errorMessage}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-16 text-center animate-fade-in">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {search ? 'No sources matching your search.' : 'No sources yet. Upload your first video!'}
            </p>
            {!search && (
              <Button onClick={() => navigate('/clips/upload')} className="mt-4">
                <Upload className="h-4 w-4" />
                Upload Now
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
