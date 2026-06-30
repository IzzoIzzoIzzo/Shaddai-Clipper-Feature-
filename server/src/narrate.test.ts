import assert from 'node:assert'
import { narrate } from './narrate.ts'

// No API key in env for this test → exercises the deterministic fallback path.
delete process.env.OPENAI_API_KEY
delete process.env.LLM_URL

const clip = {
  startSec: 0, endSec: 18, durationSec: 18, compositeScore: 0.82,
  primaryTopic: 'money',
  transcriptExcerpt: 'The biggest secret is knowing when to walk away from a bad deal. Never show desperation.',
}

const n = await narrate(clip, ['tiktok', 'reels'])

assert.ok(n.hook && n.hook.length > 0, 'hook produced from transcript with no API key')
assert.ok(n.caption && n.caption.length > 0, 'caption produced')
assert.ok(n.title && n.title.length > 0, 'title produced')
assert.ok(Array.isArray(n.hashtags) && n.hashtags.length >= 3, 'at least 3 hashtags')
assert.ok(n.hashtags.every((h) => h.startsWith('#')), 'hashtags are #-prefixed')
assert.equal(n.viralityScore, 0.82, 'virality score carried from compositeScore')
assert.ok(n.agentCredits.copy && n.agentCredits.score, 'agent credits attributed')

console.log('✅ narrate.test PASS', n)
