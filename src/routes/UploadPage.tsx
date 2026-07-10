import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatFileSize, cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'
import { MAX_FILE_SIZE } from '@/lib/constants'
import {
  Film,
  Upload,
  FileVideo,
  X,
  ArrowRight,
  Link,
  Clapperboard,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────
function zeroPad(n: number, len = 2) {
  return String(Math.floor(n)).padStart(len, '0')
}
function toTimecode(bytes: number) {
  const fake = Math.floor(bytes / 1_000_000)
  const h = zeroPad(Math.floor(fake / 3600))
  const m = zeroPad(Math.floor((fake % 3600) / 60))
  const s = zeroPad(fake % 60)
  const f = zeroPad(Math.floor((bytes % 1_000_000) / 41_666), 2)
  return `${h}:${m}:${s}:${f}`
}

// ─── Perforation strip ────────────────────────────────────────
function PerforationStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-[5px] py-[3px] px-2 overflow-hidden select-none',
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 w-[8px] h-[13px] rounded-[2px] bg-border opacity-50"
        />
      ))}
    </div>
  )
}

// ─── Corner viewfinder brackets ───────────────────────────────
function FrameCorners({ active, error }: { active: boolean; error?: boolean }) {
  const color = error
    ? 'border-danger'
    : active
      ? 'border-primary'
      : 'border-muted-foreground/30'
  const opacity = active || error ? 'opacity-100' : 'opacity-60'
  const size = active ? 'w-7 h-7' : 'w-5 h-5'
  const cls = cn('absolute transition-all duration-400', size, opacity)
  return (
    <>
      <span className={cn(cls, 'top-3 left-3 border-t-2 border-l-2', color)} />
      <span className={cn(cls, 'top-3 right-3 border-t-2 border-r-2', color)} />
      <span className={cn(cls, 'bottom-3 left-3 border-b-2 border-l-2', color)} />
      <span className={cn(cls, 'bottom-3 right-3 border-b-2 border-r-2', color)} />
    </>
  )
}

// ─── Reel icon decorations ────────────────────────────────────
function ReelDecoration({ className }: { className?: string }) {
  return (
    <div className={cn('relative shrink-0', className)} aria-hidden>
      {/* outer ring */}
      <div className="w-9 h-9 rounded-full border-2 border-border flex items-center justify-center">
        {/* hub */}
        <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/40" />
      </div>
      {/* spokes */}
      {[0, 60, 120].map((deg) => (
        <div
          key={deg}
          className="absolute top-1/2 left-1/2 w-[14px] h-[1.5px] bg-muted-foreground/30 origin-left"
          style={{ transform: `translate(0, -50%) rotate(${deg}deg)` }}
        />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export function UploadPage() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const uploadSource = useClipsStore((s) => s.uploadSource)

  const [file, setFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── validation ──
  const validateAndSet = useCallback((f: File) => {
    setFileError(null)
    if (!f.type.startsWith('video/')) {
      setFileError('Only video files are accepted — MP4, MOV, WEBM')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError(`File too large — max ${formatFileSize(MAX_FILE_SIZE)}`)
      return
    }
    setFile(f)
  }, [])

  // ── drag handlers ──
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the drop zone itself (not a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }

  // ── upload ──
  const handleUpload = async () => {
    if (!file || uploading) return
    setUploading(true)
    try {
      const id = await uploadSource(file)
      setSourceId(id)
      setUploaded(true)
      addToast({
        type: 'success',
        title: 'Intake complete',
        message: `${file.name} is being transcribed and analyzed.`,
        duration: 5000,
      })
      setTimeout(() => navigate(`/clips/sources/${id}`), 1200)
    } catch (err) {
      setUploading(false)
      const isPremium = String((err as Error).message).includes('premium')
      addToast({
        type: isPremium ? 'info' : 'error',
        title: isPremium ? 'Premium feature' : 'Upload failed',
        message: isPremium
          ? 'Full processing requires a paid tier — connect in Settings.'
          : String((err as Error).message),
        duration: 7000,
      })
    }
  }

  const handleReset = () => {
    setFile(null)
    setFileError(null)
    setUploading(false)
    setUploaded(false)
    setSourceId(null)
  }

  const handleUrlComingSoon = () => {
    addToast({
      type: 'info',
      title: 'URL import — coming soon',
      message: 'Drop a video file to process right now.',
      duration: 4000,
    })
  }

  // ── derived ──
  const hasFile = Boolean(file)
  const dropZoneActive = isDragOver && !hasFile
  const canUpload = hasFile && !uploading && !uploaded

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">

      {/* ── Header ── */}
      <header className="mb-7 stagger-1 animate-fade-in">
        <div className="flex items-center gap-2.5 mb-2">
          <Clapperboard className="h-4 w-4 text-primary" aria-hidden />
          <span className="font-mono text-[10px] text-primary tracking-[0.2em] uppercase">
            Intake Bay / IN-01
          </span>
          <span className="rec-dot inline-block w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden />
        </div>
        <h1 className="font-display text-4xl font-bold text-foreground tracking-tight leading-none mb-1.5">
          Load Source
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Drop a video — ffmpeg and Whisper take it from there.
        </p>
      </header>

      {/* ── FRAME WRAPPER — film-strip top ── */}
      <div className="stagger-2 animate-fade-in">

        {/* Film perforations — top rail */}
        <div className="bg-surface border border-border rounded-t-xl overflow-hidden">
          <div className="flex items-center justify-between px-3">
            <ReelDecoration className="opacity-50" />
            <PerforationStrip className="flex-1" />
            <ReelDecoration className="opacity-50 scale-x-[-1]" />
          </div>
        </div>

        {/* ── MAIN DROP ZONE ── */}
        <div
          className={cn(
            'relative bg-card border-x border-border transition-all duration-300',
            dropZoneActive && 'bg-primary-light border-primary',
            fileError && 'border-danger',
            uploaded && 'border-success/30',
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="region"
          aria-label="Video intake drop zone"
        >
          <FrameCorners active={dropZoneActive || hasFile} error={Boolean(fileError)} />

          {/* ── IDLE / EMPTY state ── */}
          {!hasFile && !fileError && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'w-full flex flex-col items-center justify-center gap-6 py-24 px-10 cursor-pointer',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset',
                'transition-all duration-300 group',
              )}
              aria-label="Click to browse for a video file"
            >
              {/* Central icon well */}
              <div
                className={cn(
                  'relative flex items-center justify-center w-24 h-24 rounded-2xl border-2 transition-all duration-300',
                  dropZoneActive
                    ? 'border-primary bg-primary-light scale-110 shadow-[0_0_32px_-4px_var(--color-primary)]'
                    : 'border-border bg-surface group-hover:border-primary/40 group-hover:bg-primary-light/30 group-hover:scale-105',
                )}
              >
                {/* Crosshair lines */}
                <span
                  className={cn(
                    'absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 transition-colors duration-300',
                    dropZoneActive ? 'bg-primary/40' : 'bg-border/60 group-hover:bg-primary/20',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'absolute top-1/2 left-3 right-3 h-px -translate-y-1/2 transition-colors duration-300',
                    dropZoneActive ? 'bg-primary/40' : 'bg-border/60 group-hover:bg-primary/20',
                  )}
                  aria-hidden
                />
                {dropZoneActive ? (
                  <FileVideo className="h-10 w-10 text-primary animate-bounce relative z-10" />
                ) : (
                  <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors duration-300 relative z-10" />
                )}
              </div>

              {/* Label cluster */}
              <div className="text-center space-y-2">
                <p
                  className={cn(
                    'font-display text-xl font-semibold transition-colors duration-200',
                    dropZoneActive ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {dropZoneActive ? 'Release to load footage' : 'Drop footage here'}
                </p>
                <p className="text-muted-foreground text-sm">
                  or{' '}
                  <span className="text-primary underline underline-offset-4 decoration-primary/40">
                    browse files
                  </span>{' '}
                  — video/* up to{' '}
                  <span className="font-mono text-foreground">{formatFileSize(MAX_FILE_SIZE)}</span>
                </p>
              </div>

              {/* Format badge row */}
              <div className="flex items-center gap-2">
                {['MP4', 'MOV', 'WEBM'].map((fmt, i) => (
                  <span
                    key={fmt}
                    className="font-mono text-[10px] text-muted-foreground/60 tracking-[0.18em] uppercase px-2.5 py-1 border border-border rounded bg-surface"
                  >
                    {fmt}
                  </span>
                ))}
                <span className="font-mono text-[10px] text-muted-foreground/40 tracking-widest">
                  · up to 500MB
                </span>
              </div>
            </button>
          )}

          {/* ── ERROR state ── */}
          {!hasFile && fileError && (
            <div className="flex flex-col items-center justify-center gap-5 py-24 px-10 text-center animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-danger-light border border-danger/30 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
              <div className="space-y-1.5">
                <p className="font-display text-base font-semibold text-danger">{fileError}</p>
                <button
                  type="button"
                  onClick={() => { setFileError(null); inputRef.current?.click() }}
                  className="font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors tracking-wide"
                >
                  TRY AGAIN
                </button>
              </div>
            </div>
          )}

          {/* ── FILE LOADED state ── */}
          {hasFile && file && (
            <div
              className={cn(
                'relative py-10 px-10 space-y-7',
                uploading && 'scan-line',
              )}
            >
              {/* File identity */}
              <div className="flex items-start gap-5">
                <div
                  className={cn(
                    'shrink-0 w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-300',
                    uploaded
                      ? 'bg-success-light border-success/40'
                      : 'bg-primary-light border-primary/30',
                  )}
                >
                  {uploaded ? (
                    <CheckCircle2 className="h-7 w-7 text-success animate-scale-in" />
                  ) : (
                    <Film className="h-7 w-7 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-display font-semibold text-foreground text-base truncate leading-snug">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    <span className="w-px h-3 bg-border" aria-hidden />
                    <span className="font-mono text-[10px] text-primary/70 tracking-widest">
                      TC {toTimecode(file.size)}
                    </span>
                    <span className="w-px h-3 bg-border" aria-hidden />
                    <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                      {file.type.split('/')[1] ?? 'video'}
                    </span>
                  </div>
                </div>

                {!uploading && !uploaded && (
                  <button
                    onClick={handleReset}
                    className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Uploading — progress shimmer */}
              {uploading && !uploaded && (
                <div className="space-y-3 animate-fade-in">
                  <div className="relative h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: '40%',
                        background: 'linear-gradient(90deg, transparent, var(--color-primary), var(--color-primary), transparent)',
                        animation: 'scan 1.6s ease-in-out infinite',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rec-dot inline-block w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
                    <p className="font-mono text-[10px] text-muted-foreground tracking-[0.18em] uppercase animate-pulse-soft">
                      Uploading to engine — standby
                    </p>
                  </div>
                </div>
              )}

              {/* Upload success */}
              {uploaded && (
                <div className="flex items-center gap-3 animate-scale-in">
                  <Zap className="h-4 w-4 text-success shrink-0" />
                  <p className="font-mono text-xs text-success tracking-wide">
                    Intake complete — routing to source detail&hellip;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) validateAndSet(f)
              e.target.value = ''
            }}
          />
        </div>

        {/* Film perforations — bottom rail */}
        <div className="bg-surface border border-border rounded-b-xl overflow-hidden">
          <div className="flex items-center justify-between px-3">
            <ReelDecoration className="opacity-30 scale-x-[-1]" />
            <PerforationStrip className="flex-1" />
            <ReelDecoration className="opacity-30" />
          </div>
        </div>

      </div>

      {/* ── CTA row ── */}
      <div className="pt-5 flex items-center gap-3 stagger-3 animate-fade-in">
        {!uploaded ? (
          <Button
            size="lg"
            disabled={!canUpload}
            loading={uploading}
            onClick={handleUpload}
            className="gap-2.5 font-display tracking-tight"
          >
            {uploading ? 'Processing…' : 'Upload & Process'}
            {!uploading && <ArrowRight className="h-4 w-4" />}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => navigate(sourceId ? `/clips/sources/${sourceId}` : '/clips/sources')}
            className="gap-2 font-display tracking-tight"
          >
            View Source <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {hasFile && !uploading && !uploaded && (
          <Button variant="ghost" size="lg" onClick={handleReset} className="text-muted-foreground">
            Clear
          </Button>
        )}
      </div>

      {/* ── URL IMPORT — coming soon ── */}
      <div className="pt-4 stagger-4 animate-fade-in">
        <div className="relative rounded-xl border border-dashed border-border overflow-hidden">
          {/* disabled overlay */}
          <div className="absolute inset-0 bg-background/55 backdrop-blur-[1.5px] pointer-events-none z-10" />

          {/* "OFFLINE" watermark */}
          <span
            className="absolute right-3 bottom-2 font-mono text-[9px] text-muted-foreground/25 tracking-[0.22em] uppercase pointer-events-none z-0 select-none"
            aria-hidden
          >
            URL IMPORT / OFFLINE
          </span>

          <div className="flex items-center gap-3 px-4 py-3.5 opacity-45">
            <Link className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=… (coming soon)"
              disabled
              className="flex-1 bg-transparent font-mono text-sm text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleUrlComingSoon}
              disabled
              className="shrink-0 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase border border-border rounded px-2.5 py-1 pointer-events-auto cursor-not-allowed hover:border-muted-foreground/40 transition-colors"
              aria-label="URL import coming soon"
            >
              Soon
            </button>
          </div>
        </div>

        {/* Helper caption */}
        <p className="mt-2 font-mono text-[10px] text-muted-foreground/40 tracking-widest text-center uppercase">
          File upload is the primary intake — URL import ships in v2
        </p>
      </div>

    </div>
  )
}
