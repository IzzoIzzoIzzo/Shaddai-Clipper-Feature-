// ============================================================
// Real FFmpeg pipeline ops — the concrete work the mock's
// makeClip()/makeTranscript() only simulated.
//
// Uses fluent-ffmpeg (MIT, ~8k★, npm: fluent-ffmpeg) bound to the
// ffmpeg-static binary (MIT) so no system FFmpeg install is required.
//
// NOTE: fluent-ffmpeg's repo was archived May 2025 but the published
// npm package is stable + widely used; we pin it and keep ops thin so
// swapping to a direct child_process spawn later is trivial.
// ============================================================

import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path)

async function ensureDir(file: string) {
  await mkdir(dirname(file), { recursive: true })
}

/** Extract a mono 16kHz WAV (what Whisper wants) from any source. */
export function extractAudio(input: string, outWav: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await ensureDir(outWav)
    ffmpeg(input)
      .noVideo()
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => resolve(outWav))
      .on('error', reject)
      .save(outWav)
  })
}

/**
 * Decode audio to 16kHz mono Float32 PCM in memory — the exact format
 * Transformers.js Whisper wants. Streams raw f32le from ffmpeg and packs
 * it into a Float32Array (no temp file).
 */
export function extractPCM16k(input: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const stream = ffmpeg(input)
      .noVideo()
      .audioFrequency(16000)
      .audioChannels(1)
      .format('f32le')
      .on('error', reject)
      .pipe()
    stream.on('data', (d: Buffer) => chunks.push(d))
    stream.on('end', () => {
      const buf = Buffer.concat(chunks)
      const n = Math.floor(buf.byteLength / 4)
      const out = new Float32Array(n)
      for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4)
      resolve(out)
    })
  })
}

/**
 * Cut [startSec, endSec], reframe to vertical 9:16 (center crop), and
 * burn an .ass/.srt subtitle file if provided. Outputs H.264 MP4.
 *
 * Center-crop is the safe default; a subject-tracking reframe (YOLO/
 * ByteTrack sidecar — see docs/BACKEND_PORTING_GUIDE.md) can replace the
 * crop filter later without changing this signature.
 */
export function renderVerticalClip(opts: {
  input: string
  outMp4: string
  startSec: number
  endSec: number
  subtitlePath?: string
  aspect?: '9:16' | '16:9' | '1:1'
}): Promise<string> {
  const { input, outMp4, startSec, endSec, subtitlePath, aspect = '9:16' } = opts
  const duration = Math.max(0.1, endSec - startSec)

  // target dims per aspect (1080-wide family)
  const dims = aspect === '16:9' ? [1920, 1080] : aspect === '1:1' ? [1080, 1080] : [1080, 1920]
  const [w, h] = dims

  // scale to cover, then center-crop to exact target
  const filters = [
    `scale=${w}:${h}:force_original_aspect_ratio=increase`,
    `crop=${w}:${h}`,
  ]
  if (subtitlePath) {
    // escape path for the subtitles filter (Windows drive colons etc.)
    const esc = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')
    filters.push(`subtitles='${esc}'`)
  }

  return new Promise(async (resolve, reject) => {
    await ensureDir(outMp4)
    ffmpeg(input)
      .setStartTime(startSec)
      .duration(duration)
      .videoFilters(filters)
      .videoCodec('libx264')
      .outputOptions(['-preset veryfast', '-crf 21', '-movflags +faststart', '-pix_fmt yuv420p'])
      .audioCodec('aac')
      .on('end', () => resolve(outMp4))
      .on('error', reject)
      .save(outMp4)
  })
}

/** Grab a single JPG frame at `atSec` — the safe fallback cover. */
export function extractFrame(input: string, outJpg: string, atSec: number): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await ensureDir(outJpg)
    ffmpeg(input)
      .seekInput(Math.max(0, atSec))
      .frames(1)
      .outputOptions(['-q:v 3'])
      .on('end', () => resolve(outJpg))
      .on('error', reject)
      .save(outJpg)
  })
}

/** Probe duration/streams — used to validate uploads before queueing. */
export function probe(input: string): Promise<{ durationSec: number; hasAudio: boolean; width?: number; height?: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(input, (err, data) => {
      if (err) return reject(err)
      const v = data.streams.find((s) => s.codec_type === 'video')
      const hasAudio = data.streams.some((s) => s.codec_type === 'audio')
      resolve({
        durationSec: Number(data.format.duration) || 0,
        hasAudio,
        width: v?.width,
        height: v?.height,
      })
    })
  })
}
