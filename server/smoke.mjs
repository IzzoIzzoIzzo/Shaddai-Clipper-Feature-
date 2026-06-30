// smoke.mjs — self-booting HTTP driver for the SHADDAI Clip engine.
// Boots the server, generates a synthetic test video (ffmpeg-static, no TTS),
// then drives the REAL pipeline over HTTP: upload → poll transcribe/detect →
// generate → poll render → fetch the rendered MP4. Asserts a playable clip.
//
// Run from server/:  node smoke.mjs
// First run downloads the Whisper model (~40MB) on the transcribe step.
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const PORT = process.env.PORT || '8799';
const BASE = `http://127.0.0.1:${PORT}/api/clips/v1`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function makeTestVideo() {
  mkdirSync('testdata', { recursive: true });
  const out = join('testdata', 'smoke.mp4');
  if (existsSync(out)) return Promise.resolve(out);
  return new Promise((res, rej) => {
    // synthetic: color video + sine tone, 8s — pipeline runs, transcript may be empty
    const p = spawn(ffmpegPath, ['-y','-f','lavfi','-i','color=c=0x0a0e1a:s=640x360:d=8:r=24',
      '-f','lavfi','-i','sine=frequency=220:duration=8','-pix_fmt','yuv420p','-shortest', out]);
    p.on('close', c => c === 0 ? res(out) : rej(new Error('ffmpeg exit ' + c)));
    p.on('error', rej);
  });
}

async function main() {
  console.log('1/6  building synthetic test video…');
  const vid = await makeTestVideo();

  console.log('2/6  booting engine on :' + PORT + ' …');
  const srv = spawn(process.execPath, ['--import', 'tsx/esm', 'src/server.ts'],
    { env: { ...process.env, PORT }, stdio: ['ignore', 'ignore', 'inherit'] });
  const done = (code) => { try { srv.kill(); } catch {} process.exit(code); };

  // wait for health
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    try { const r = await fetch(BASE + '/health'); up = r.ok; } catch {} if (!up) await sleep(500);
  }
  if (!up) { console.error('engine did not come up'); return done(1); }
  console.log('     engine healthy');

  console.log('3/6  POST /sources (multipart upload)…');
  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(vid)], { type: 'video/mp4' }), 'smoke.mp4');
  const up1 = await (await fetch(BASE + '/sources', { method: 'POST', body: fd })).json();
  const sourceId = up1.sourceId;
  console.log('     sourceId', sourceId);

  console.log('4/6  poll /sources/:id until ingested (downloads Whisper model on first run)…');
  let src, cands = [];
  for (let i = 0; i < 90; i++) {
    const d = await (await fetch(BASE + '/sources/' + sourceId)).json();
    src = d.source; cands = d.candidates || [];
    if (src.status === 'ingested') break;
    if (src.status === 'failed') { console.error('source failed:', src.errorMessage); return done(1); }
    await sleep(1500);
  }
  console.log('     status', src.status, '· candidates', cands.length, '· transcript segs', (cands.length ? '✓' : '0 (synthetic audio → ok)'));

  console.log('5/6  POST /generate + poll /batches/:id …');
  const ids = cands.slice(0, 1).map(c => c.candidateId);
  const gen = await (await fetch(BASE + '/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, candidateIds: ids, platforms: ['tiktok'] }) })).json();
  let batch;
  for (let i = 0; i < 90; i++) {
    const d = await (await fetch(BASE + '/batches/' + gen.batchId)).json();
    batch = d.batch; if (batch.status === 'reviewing') break; await sleep(1500);
  }
  const clip = (batch.clips || [])[0];
  console.log('     batch', batch.status, '· clips', (batch.clips || []).length);

  console.log('6/6  fetch the rendered clip file…');
  const path = clip && Object.values(clip.platformAssets || {})[0];
  if (!path) { console.error('no clip rendered'); return done(1); }
  const buf = await (await fetch('http://127.0.0.1:' + PORT + path)).arrayBuffer();
  console.log('     ', path, '→', buf.byteLength, 'bytes');

  const ok = buf.byteLength > 1000;
  console.log(ok ? '\n✅ SMOKE PASS — upload → transcribe → detect → render → playable clip' : '\n❌ SMOKE FAIL');
  done(ok ? 0 : 1);
}
main().catch(e => { console.error('SMOKE ERROR:', e); process.exit(1); });
