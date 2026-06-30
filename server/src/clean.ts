// ============================================================
// Transcript cleanup. Whisper repeats chunks on music / echoey / silent
// audio ("Yeah Yeah Yeah", or a whole sentence emitted 3×). This collapses
// those repeats so captions/hooks read cleanly. Pure + deterministic.
// ============================================================

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/gi, '')

/** Collapse consecutive repeated words, repeated phrases, and repeated sentences. */
export function dedupeText(text: string): string {
  if (!text) return text

  // 1) collapse immediate duplicate words ("Yeah Yeah Yeah" → "Yeah")
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const w1: string[] = []
  for (const w of words) {
    if (w1.length && norm(w1[w1.length - 1]!) === norm(w) && norm(w).length > 0) continue
    w1.push(w)
  }
  let s = w1.join(' ')

  // 2) collapse a repeated multi-word phrase run (2..12 word units repeated back-to-back)
  for (let n = 12; n >= 2; n--) {
    const re = new RegExp('\\b((?:\\S+\\s+){' + (n - 1) + '}\\S+)(?:\\s+\\1\\b)+', 'gi')
    s = s.replace(re, '$1')
  }

  // 3) collapse consecutive duplicate sentences
  const sents = s.split(/(?<=[.!?])\s+/)
  const out: string[] = []
  for (const snt of sents) {
    if (out.length && norm(out[out.length - 1]!) === norm(snt)) continue
    out.push(snt)
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}
