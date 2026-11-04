// Pembungkus OCR tempelan foto (Vision macOS). Gagal apa pun = null: foto tetap terkirim tanpa stempel.
// Juga ambil-frame video (ffmpeg) dan pilihFrame murni untuk video grup operasi.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFile } = require('child_process')
const { RUMAH } = require('./umum.cjs')

const SUMBER = path.join(__dirname, 'ocr', 'stempel.swift')
const BIN = path.join(RUMAH, 'bin', 'stempel')
const MAKS = 4000
const KOORD = /\d\s*°|°\s*\d|\d{1,2}[.,]\d{3,}\s*[NSEWU]\b/i
let siap = null // Promise<string|null>: jalur biner, dikompilasi sekali per proses

const jalankan = (cmd, args, timeout) => new Promise((ok, gagal) => execFile(cmd, args, { timeout, maxBuffer: 8 << 20 }, (e, o) => (e ? gagal(e) : ok(o))))

function kompilasi() {
  return (async () => {
    const hash = crypto.createHash('sha1').update(fs.readFileSync(SUMBER)).digest('hex')
    const tanda = BIN + '.sha1'
    if (fs.existsSync(BIN) && fs.existsSync(tanda) && fs.readFileSync(tanda, 'utf8') === hash) return BIN
    fs.mkdirSync(path.dirname(BIN), { recursive: true, mode: 0o700 })
    await jalankan('swiftc', ['-O', SUMBER, '-o', BIN], 180000)
    fs.writeFileSync(tanda, hash)
    return BIN
  })().catch(() => null)
}

async function bacaStempel(jalur, batas = 20000) {
  if (process.platform !== 'darwin') return null
  try {
    siap = siap || kompilasi()
    const bin = await siap
    if (!bin) { siap = null; return null }
    const t = (await jalankan(bin, [jalur], batas)).trim().slice(0, MAKS)
    return t || null
  } catch { return null }
}

const adaKoordinat = (t) => KOORD.test(t || '')

// Frame pertama yang teksnya memuat koordinat; tak ada = frame tengah. Daftar kosong = -1.
function pilihFrame(teks) {
  if (!teks.length) return -1
  const i = teks.findIndex(adaKoordinat)
  return i >= 0 ? i : Math.floor(teks.length / 2)
}

// Hingga `maks` frame (1 per 3 dtk, lebar 1280) ke direktori `ke`; kembalikan daftar jalur. Tanpa ffmpeg / gagal = [].
async function ambilFrame(video, ke, maks = 6) {
  const ff = fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg'
  try {
    await jalankan(ff, ['-y', '-loglevel', 'error', '-protocol_whitelist', 'file', '-f', 'mp4', '-i', video, '-vf', 'fps=1/3,scale=1280:-2', '-frames:v', String(maks), '-q:v', '3', path.join(ke, 'f%02d.jpg')], 60000)
  } catch { return [] }
  return fs.readdirSync(ke).filter((f) => /^f\d+\.jpg$/.test(f)).sort().map((f) => path.join(ke, f))
}

// Satu frame terpilih dari video: { jpg: Buffer, stempel } atau null. Video dan frame sementara dihapus.
async function frameVideo(buf, kerja) {
  fs.mkdirSync(kerja, { recursive: true, mode: 0o700 })
  const dir = fs.mkdtempSync(path.join(kerja, 'vid-'))
  try {
    const v = path.join(dir, 'asli.mp4')
    fs.writeFileSync(v, buf, { mode: 0o600 })
    const frame = await ambilFrame(v, dir)
    if (!frame.length) return null
    const teks = []
    for (const f of frame) teks.push((await bacaStempel(f)) || '')
    const i = pilihFrame(teks)
    return { jpg: fs.readFileSync(frame[i]), stempel: teks[i] || null }
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

module.exports = { bacaStempel, pilihFrame, adaKoordinat, ambilFrame, frameVideo }
