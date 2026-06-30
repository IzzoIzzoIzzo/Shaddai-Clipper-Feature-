import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { cn } from '@/lib/utils'
import { Upload, FileVideo } from 'lucide-react'
import { VALID_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { formatFileSize } from '@/lib/utils'

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError(null)
    if (!VALID_MIME_TYPES.includes(file.type as typeof VALID_MIME_TYPES[number])) {
      setError(`Unsupported file type. Supported: mp4, mov, webm, mp3, wav, m4a`)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Max: ${formatFileSize(MAX_FILE_SIZE)}`)
      return
    }
    onFile(file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={disabled ? undefined : handleClick}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
        isDragOver
          ? 'border-primary bg-primary-light'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        disabled && 'opacity-50 pointer-events-none',
        error && 'border-danger bg-danger-light'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,.webm,.mp3,.wav,.m4a"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {error ? (
        <div className="text-danger">
          <Upload className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm font-medium">{error}</p>
          <p className="text-xs mt-1">Click to try again</p>
        </div>
      ) : isDragOver ? (
        <div className="text-primary">
          <FileVideo className="h-10 w-10 mx-auto mb-3 animate-bounce" />
          <p className="text-sm font-medium">Drop your file here</p>
        </div>
      ) : (
        <div className="text-muted-foreground">
          <Upload className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm font-medium">Drop your video/audio here or click to browse</p>
          <p className="text-xs mt-1">
            Supports MP4, MOV, WebM, MP3, WAV, M4A — up to {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </div>
      )}
    </div>
  )
}