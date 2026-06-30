// ============================================================
// Cover images. HF FLUX when HF_TOKEN + COVERS=on; else a real
// ffmpeg-extracted frame. AURA-wrapped on the prompt. Never throws.
// ============================================================
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { aura } from './aura.ts'
import { extractFrame } from './ffmpeg.ts'

interface CoverOpts { input: string; outDir: string; atSec: number; title: string; topic: string }

const HF_MODEL = process.env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell'

async function fluxCover(o: CoverOpts): Promise<string | null> {
  if (!process.env.HF_TOKEN || process.env.COVERS !== 'on') return null
  const prompt = `cinematic dark teal and cyan vertical thumbnail backdrop for a short video about ${o.topic}, dramatic lighting, no text`
  // AURA dedupes identical prompts; on any failure aura returns '' → null.
  const dataUrl = await aura.text('cover', prompt, async () => {
    const res = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt }),
    })
    if (!res.ok) throw new Error('hf ' + res.status)
    const buf = Buffer.from(await res.arrayBuffer())
    return 'data:image/png;base64,' + buf.toString('base64')
  })
  if (!dataUrl) return null
  const out = join(o.outDir, `cover_${Date.now()}.png`)
  await writeFile(out, Buffer.from(dataUrl.split(',')[1]!, 'base64'))
  return out
}

/** Always returns a usable cover path. FLUX if enabled+ok, else a real frame. */
export async function generateCover(o: CoverOpts): Promise<string> {
  try {
    const flux = await fluxCover(o)
    if (flux) return flux
  } catch { /* fall through to frame */ }
  const frame = join(o.outDir, `frame_${Date.now()}.jpg`)
  return extractFrame(o.input, frame, o.atSec)
}
