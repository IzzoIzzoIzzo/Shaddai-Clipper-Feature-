import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { DropZone } from '@/components/ui/drop-zone'
import { formatFileSize, cn } from '@/lib/utils'
import { PLATFORMS } from '@/lib/constants'
import { Upload, Link, Youtube, Check, ArrowRight, X, Globe } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'

type UploadTab = 'file' | 'url'

export function UploadPage() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const uploadSource = useClipsStore((s) => s.uploadSource)
  const importUrl = useClipsStore((s) => s.importUrl)
  const [tab, setTab] = useState<UploadTab>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'reels'])
  const [createdSourceId, setCreatedSourceId] = useState<string | null>(null)

  const handleFile = (file: File) => {
    setSelectedFile(file)
    setUploading(true)
    let pct = 0
    const interval = setInterval(() => {
      pct += Math.random() * 15
      if (pct >= 100) {
        pct = 100
        clearInterval(interval)
        // upload the real bytes to the engine — kicks off ffmpeg + Whisper
        uploadSource(file).then((sourceId) => {
          setCreatedSourceId(sourceId)
          setUploaded(true)
          setUploading(false)
          addToast({ type: 'success', title: 'Upload complete!', message: `${file.name} is being transcribed & analyzed.`, duration: 5000 })
        }).catch((err) => {
          setUploading(false)
          const premium = String(err.message).includes('premium')
          addToast({ type: premium ? 'info' : 'error', title: premium ? 'Premium feature' : 'Upload failed', message: premium ? 'Clips is a premium feature — connect a paid tier.' : String(err.message), duration: 6000 })
        })
      }
      setUploadProgress(Math.min(pct, 100))
    }, 300)
  }

  const switchTab = (newTab: UploadTab) => {
    setTab(newTab)
    handleReset()
  }

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleUrlImport = () => {
    if (!urlInput.trim()) return
    setUploading(true)
    addToast({ type: 'info', title: 'Importing URL...', message: 'Fetching content from the provided URL.', duration: 3000 })
    let pct = 0
    const interval = setInterval(() => {
      pct += Math.random() * 20
      if (pct >= 100) {
        pct = 100
        clearInterval(interval)
        importUrl(urlInput).then((sourceId) => {
          setCreatedSourceId(sourceId)
          setUploading(false)
          setUploaded(true)
          addToast({ type: 'info', title: 'Heads up', message: 'URL import is coming soon — upload a file to process for real now.', duration: 6000 })
        })
      }
      setUploadProgress(Math.min(pct, 100))
    }, 400)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    setUploading(false)
    setUploaded(false)
    setUrlInput('')
    setCreatedSourceId(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload Source</h2>
        <p className="text-muted-foreground mt-1">Upload a video, podcast, or livestream to generate viral clips</p>
      </div>

      {/* Upload Tab Toggle */}
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => switchTab('file')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'file' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Upload className="h-4 w-4" />
          Upload File
        </button>
        <button
          onClick={() => switchTab('url')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'url' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Globe className="h-4 w-4" />
          Import from URL
        </button>
      </div>

      {/* Upload Area */}
      {tab === 'file' ? (
        <Card className="card-hover">
          <CardContent className="p-6">
            {!selectedFile ? (
              <DropZone onFile={handleFile} />
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-light">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleReset} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {uploading && (
                  <div className="space-y-2 animate-fade-in">
                    <ProgressBar value={uploadProgress} showLabel size="md" />
                    <p className="text-xs text-muted-foreground animate-pulse-soft">
                      {uploadProgress < 100 ? 'Uploading to SHADDAI storage...' : 'Processing upload...'}
                    </p>
                  </div>
                )}
                {uploaded && (
                  <div className="flex items-center gap-2 text-success text-sm animate-fade-in">
                    <Check className="h-4 w-4" />
                    Upload complete! File is being processed.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="card-hover">
          <CardContent className="p-6">
            {!uploading && !uploaded ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-danger" />
                  <span className="text-sm font-medium">Import from YouTube, Vimeo, or direct URL</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  />
                  <Button disabled={!urlInput.trim()} onClick={handleUrlImport}>Import</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-light">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Import from URL</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{urlInput}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleReset} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {uploading && (
                  <div className="space-y-2">
                    <ProgressBar value={uploadProgress} showLabel size="md" />
                    <p className="text-xs text-muted-foreground animate-pulse-soft">
                      Downloading and processing content...
                    </p>
                  </div>
                )}
                {uploaded && (
                  <div className="flex items-center gap-2 text-success text-sm">
                    <Check className="h-4 w-4" />
                    URL imported successfully!
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Selection */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-sm">Target Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  selectedPlatforms.includes(p.id)
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                {selectedPlatforms.includes(p.id) && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 animate-fade-in">
        {uploaded ? (
          <>
            <Button onClick={() => navigate(createdSourceId ? `/clips/sources/${createdSourceId}` : '/clips/sources')}>
              View Source <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/clips/sources')}>
              All Sources
            </Button>
          </>
        ) : (
          <Button disabled={!selectedFile && !urlInput.trim()} onClick={tab === 'url' ? handleUrlImport : undefined}>
            Start Processing <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
        {selectedFile && (
          <Button variant="ghost" onClick={handleReset} disabled={uploading}>
            Cancel
          </Button>
        )}
      </div>

      {/* Success Banner */}
      {uploaded && (
        <Card className="bg-primary-light border-primary/20 animate-slide-up">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-1 rounded-full bg-primary/10">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-primary">Upload Complete!</p>
              <p className="text-primary/80 mt-0.5">
                Your source is being processed. We'll notify you when transcription is complete and clip candidates are ready for review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
