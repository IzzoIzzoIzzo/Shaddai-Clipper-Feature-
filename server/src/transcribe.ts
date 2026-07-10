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

// Default to base.en for clearly better accuracy than tiny.en. Override with
// WHISPER_MODEL (e.g. 'Xenova/whisper-tiny.en' on RAM-constrained hosts like
// Render free tier, or 'Xenova/whisper-small.en' for even higher accuracy).
const MODEL = process.env.WHISPER_MODEL || 'Xenova/whisper-base.en'

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

/** Transcribe 16kHz mono Float32 PCM into timestamped segments. */
export async function transcribePCM(samples: Float32Array): Promise<Segment[]> {
  const asr = await getTranscriber()
  const out: any = await asr(samples, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  })
  const chunks: any[] = out?.chunks || []
  if (chunks.length) {
    return chunks
      .map((c) => ({
        startSec: Number(c.timestamp?.[0] ?? 0),
        endSec: Number(c.timestamp?.[1] ?? (Number(c.timestamp?.[0] ?? 0) + 2)),
        text: String(c.text || '').trim(),
      }))
      .filter((s) => s.text.length > 0)
  }
  // no timestamps returned — single block
  const text = String(out?.text || '').trim()
  return text ? [{ startSec: 0, endSec: samples.length / 16000, text }] : []
}
