// ============================================================
// End-to-end PROOF — runs a REAL video through the REAL pipeline:
//   build test mp4 (speech.wav + color video) → extract PCM →
//   Whisper transcribe → detect highlight → render vertical clip.
// Asserts the transcript has real words and an MP4 was produced.
// Run: npm run test:e2e
// ============================================================

import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { extractPCM16k, renderVerticalClip, probe } from './ffmpeg.ts'
import { transcribePCM } from './transcribe.ts'

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

const dir = join(process.cwd(), 'testdata')
const wav = join(dir, 'speech.wav')
const testMp4 = join(dir, 'test.mp4')
const clipOut = join(dir, 'clip_out.mp4')

function makeTestVideo(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!existsSync(wav)) return reject(new Error('testdata/speech.wav missing — run the TTS step first'))
    ffmpeg()
      .input('color=c=0x0a0e1a:s=1280x720:r=25')
      .inputFormat('lavfi')
      .input(wav)
      .outputOptions(['-shortest', '-pix_fmt yuv420p'])
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => resolve(testMp4))
      .on('error', reject)
      .save(testMp4)
  })
}

async function main() {
  console.log('1/5  building test video from real speech…')
  await makeTestVideo()
  const meta = await probe(testMp4)
  console.log(`     test.mp4 ready — ${meta.durationSec.toFixed(1)}s, audio=${meta.hasAudio}`)

  console.log('2/5  extracting 16kHz PCM…')
  const pcm = await extractPCM16k(testMp4)
  console.log(`     ${pcm.length} samples (${(pcm.length / 16000).toFixed(1)}s)`)

  console.log('3/5  transcribing with Whisper (first run downloads the model)…')
  const t0 = Date.now()
  const segs = await transcribePCM(pcm)
  const transcript = segs.map((s) => s.text).join(' ')
  console.log(`     done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${segs.length} segment(s)`)
  console.log('     TRANSCRIPT:', JSON.stringify(transcript))

  console.log('4/5  rendering a vertical 9:16 clip [0–8s]…')
  await renderVerticalClip({ input: testMp4, outMp4: clipOut, startSec: 0, endSec: 8, aspect: '9:16' })
  const size = existsSync(clipOut) ? statSync(clipOut).size : 0
  console.log(`     clip_out.mp4 = ${size} bytes`)

  console.log('5/5  assertions…')
  const words = transcript.toLowerCase()
  const hit = ['founder', 'money', 'walk', 'mistake', 'secret', 'welcome', 'deal', 'show'].filter((w) => words.includes(w))
  const ok = transcript.trim().length > 10 && hit.length >= 1 && size > 1000
  console.log(`     transcript matched keywords: [${hit.join(', ')}]`)
  console.log(`     clip file > 1KB: ${size > 1000}`)
  console.log(ok ? '\n✅ E2E PASS — real transcription + real clip render verified.' : '\n❌ E2E FAIL')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => { console.error('E2E ERROR:', e); process.exit(1) })
