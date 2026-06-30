import assert from 'node:assert'
import { Aura } from './aura.ts'

let calls = 0
const aura = new Aura()
const fn = async () => { calls++; return 'HELLO ' + calls }

const a = await aura.text('hook', 'same input', fn)
const b = await aura.text('hook', 'same input', fn)   // identical → cached
const c = await aura.text('hook', 'other input', fn)  // different → miss

assert.equal(a, 'HELLO 1', 'first call runs fn')
assert.equal(b, 'HELLO 1', 'second identical call returns cached value')
assert.equal(c, 'HELLO 2', 'different input runs fn again')
assert.equal(calls, 2, 'fn ran exactly twice (one was cached)')

const s = aura.stats()
assert.equal(s.hits, 1, 'one cache hit')
assert.equal(s.misses, 2, 'two misses')
assert.ok(s.tokensSaved > 0, 'tokensSaved counted for the hit')

console.log('✅ aura.test PASS', s)
