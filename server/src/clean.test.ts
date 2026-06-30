import assert from 'node:assert'
import { dedupeText } from './clean.ts'

// real garbled output observed from the engine on echoey audio
const garbled = "Yeah, I'm just trying to be a good person Yeah, I'm just trying to be a good person Yeah,"
const cleaned = dedupeText(garbled)
const occurrences = (cleaned.toLowerCase().match(/just trying to be a good person/g) || []).length
assert.equal(occurrences, 1, 'repeated phrase collapses to one occurrence -> got: ' + cleaned)

assert.equal(dedupeText('Yeah Yeah Yeah hello'), 'Yeah hello', 'repeated words collapse')
assert.equal(dedupeText('Hello world. Hello world. Done.'), 'Hello world. Done.', 'repeated sentences collapse')
assert.equal(dedupeText('A clean normal sentence with no repeats.'), 'A clean normal sentence with no repeats.', 'clean text untouched')
assert.equal(dedupeText(''), '', 'empty stays empty')

console.log('✅ clean.test PASS — "' + cleaned + '"')
