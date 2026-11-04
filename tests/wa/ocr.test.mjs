// OCR tempelan foto grup operasi (scripts/wa/ocr.cjs). Uji OCR sungguhan hanya di macOS (Vision + swiftc).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { bacaStempel, pilihFrame, adaKoordinat } = createRequire(import.meta.url)('../../scripts/wa/ocr.cjs')

test('OCR sungguhan: tempelan memuat tanggal dan koordinat', { skip: process.platform !== 'darwin', timeout: 240000 }, async () => {
  const foto = new URL('./bahan/stempel-contoh.jpg', import.meta.url).pathname
  await bacaStempel(foto) // pemanasan: kompilasi swiftc + muat model Vision (panggilan pertama bisa lewat 20 dtk)
  const t = await bacaStempel(foto)
  assert.ok(t, 'OCR kosong')
  assert.match(t, /3 Nov 2026/)
  assert.match(t, /1°17'1"S/)
  assert.match(t, /110°53/)
})

test('frameVideo: video sintetis dari foto contoh (ffmpeg) menghasilkan frame berstempel', { skip: process.platform !== 'darwin', timeout: 240000 }, async (t) => {
  const { execFileSync } = await import('node:child_process')
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path')
  const { frameVideo } = createRequire(import.meta.url)('../../scripts/wa/ocr.cjs')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-vid-'))
  try {
    const mp4 = path.join(dir, 's.mp4') // video 10 dtk dari foto contoh (ffmpeg Homebrew tanpa drawtext)
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '5', '-i', new URL('./bahan/stempel-contoh.jpg', import.meta.url).pathname,
        '-t', '10', '-vf', 'scale=1280:-2', '-pix_fmt', 'yuv420p', mp4])
    } catch { return t.skip('ffmpeg tidak tersedia') }
    const r = await frameVideo(fs.readFileSync(mp4), path.join(dir, 'kerja'))
    assert.ok(r && r.jpg.length > 1000, 'tidak ada frame')
    assert.match(r.stempel || '', /3 Nov 2026/)
    assert.deepEqual(fs.readdirSync(path.join(dir, 'kerja')), [], 'sisa berkas sementara')
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('pilihFrame: frame pertama berkoordinat, tanpa koordinat = tengah, kosong = -1', () => {
  assert.equal(pilihFrame([]), -1)
  assert.equal(pilihFrame(['', 'BNPB', '1°17\'1"S 110°53\'33"E', '0°1\'2"N 109°3\'4"E']), 2)
  assert.equal(pilihFrame(['a', 'b', 'c', 'd', 'e']), 2)
  assert.equal(pilihFrame(['a']), 0)
  assert.equal(adaKoordinat('Altitude 33.5msnm'), false)
})
