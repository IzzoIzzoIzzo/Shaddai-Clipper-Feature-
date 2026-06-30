import assert from 'node:assert'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import { generateCover } from './images.ts'

// Build a tiny 2s test video (color source) so extractFrame has real input.
const dir = join(process.cwd(), 'data', '_covtest')
const vid = join(dir, 'in.mp4')
import { mkdirSync } from 'node:fs'
mkdirSync(dir, { recursive: true })
execFileSync(ffmpegPath as string, ['-y', '-f', 'lavfi', '-i', 'color=c=teal:s=320x240:d=2', '-pix_fmt', 'yuv420p', vid], { stdio: 'ignore' })

delete process.env.HF_TOKEN // force the real-frame fallback path
const cover = await generateCover({ input: vid, outDir: dir, atSec: 1, title: 'Test', topic: 'money' })

assert.ok(existsSync(cover), 'a cover image file exists')
assert.ok(/\.(jpg|png)$/.test(cover), 'cover is an image file')
console.log('✅ images.test PASS', cover)
