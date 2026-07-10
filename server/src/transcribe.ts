// ============================================================
// Real transcription — Whisper running in-process via Transformers.js
// (@huggingface/transformers, Apache-2.0). Pure JS/WASM+ONNX: no Python,
// no native build, no external service. Model downloads from the HF hub
// on first use and is cached on disk.
// ============================================================

import { pipeline, env } from '@huggingface/transformers'

// Download models from the hub (cache under node_modules/.cache or HF_HOME)
env.allowLocalModels = false

export interface Segment {
  startSec: number
  endSec: number
  text: string
  speaker?: string
}

// tiny.en is the default — it is ~3-5x faster than base.en on CPU, which matters
// a lot for real long-form videos (a 25-min upload is unusable on base.en/CPU).
// Override with WHISPER_MODEL='Xenova/whisper-base.en' (or small.en) for higher
// accuracy on shorter clips or when a GPU is available.
const MODEL = process.env.WHISPER_MODEL || 'Xenova/whisper-tiny.en'

// lazy singleton — the model load is expensive, do it once
let _asr: any = null
let _loading: Promise<any> | null = null
export async function getTranscriber() {
  if (_asr) return _asr
  if (!_loading) {
    console.log(`[whisper] loading model ${MODEL} (first run downloads it)…`)
    _loading = pipeline('automatic-speech-recognition', MODEL).then((p) => {
      _asr = p
      console.log('[whisper] model ready')
      return p
    })
  }
  return _loading
}

const SR = 16000
const WINDOW_SEC = 120 // transcribe long audio in 2-min windows (progress + bounded memory)

function mapChunks(chunks: any[], offsetSec: number): Segment[] {
  return chunks
    .map((c) => ({
      startSec: Number(c.timestamp?.[0] ?? 0) + offsetSec,
      endSec: Number(c.timestamp?.[1] ?? (Number(c.timestamp?.[0] ?? 0) + 2)) + offsetSec,
      text: String(c.text || '').trim(),
    }))
    .filter((s) => s.text.length > 0)
}

/**
 * Transcribe 16kHz mono Float32 PCM into timestamped segments.
 * For long audio, runs in WINDOW_SEC slices so we can report progress and keep
 * each model call bounded — a 25-min upload no longer looks frozen. `onProgress`
 * receives a 0..1 fraction after each window.
 */
export async function transcribePCM(
  samples: Float32Array,
  onProgress?: (frac: number) => void,
): Promise<Segment[]> {
  const asr = await getTranscriber()
  const opts = { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 }
  const WIN = WINDOW_SEC * SR

  // Short clip → single pass.
  if (samples.length <= WIN) {
    const out: any = await asr(samples, opts)
    onProgress?.(1)
    const chunks: any[] = out?.chunks || []
    if (chunks.length) return mapChunks(chunks, 0)
    const text = String(out?.text || '').trim()
    return text ? [{ startSec: 0, endSec: samples.length / SR, text }] : []
  }

  // Long audio → sliding windows with progress.
  const segments: Segment[] = []
  for (let start = 0; start < samples.length; start += WIN) {
    const end = Math.min(start + WIN, samples.length)
    const slice = samples.subarray(start, end)
    const offset = start / SR
    const out: any = await asr(slice, opts)
    const chunks: any[] = out?.chunks || []
    if (chunks.length) segments.push(...mapChunks(chunks, offset))
    else {
      const text = String(out?.text || '').trim()
      if (text) segments.push({ startSec: offset, endSec: end / SR, text })
    }
    onProgress?.(Math.min(1, end / samples.length))
  }
  return segments
}
