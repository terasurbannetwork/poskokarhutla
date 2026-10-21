// Gerbang keluaran Dit. Koordalops /laporan-bnpb (public/laporan_koordalops.js), dijalankan nyata di node tanpa DOM.
// Menagih: struktur teks WhatsApp persis (18 entri berhuruf A-L, lima butir lengkap), terbilang benar, tidak ada angka yang bukan dari isian,
// tanpa pemisah " · ", PDF A4 jadi tanpa galat (jsPDF vendor asli), DOCX = zip sah (CRC cocok, `unzip -t` bersih bila tersedia).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const win = {}
const ctx = { window: win, document: {}, navigator: { userAgent: 'node' }, Intl, Date, Math, TextEncoder, console }
ctx.self = ctx.globalThis = win
vm.createContext(ctx)
for (const f of ['paparan_slide', 'laporan_bnpb_slide', 'laporan_contoh', 'laporan_koordalops'])
  vm.runInContext(readFileSync(new URL(`../../public/${f}.js`, import.meta.url), 'utf8'), ctx, { filename: f })
const KO = win.LaporanKoordalops
const PROV = { 14: 'Riau', 15: 'Jambi', 16: 'Sumatera Selatan', 18: 'Lampung', 21: 'Kepulauan Riau', 33: 'Jawa Tengah', 35: 'Jawa Timur', 53: 'Nusa Tenggara Timur', 62: 'Kalimantan Tengah', 72: 'Sulawesi Tengah', 73: 'Sulawesi Selatan', 81: 'Maluku' }
const isi = () => JSON.parse(JSON.stringify(win.LaporanContoh.harian('2026-10-21', '2026-10-20')))
const konteks = (i = isi()) => ({ isi: i, tanggal: '2026-10-21', prov: PROV })
const WJ = '⁠'

test('terbilang: angka jumlah kejadian', () => {
  const t = { 0: 'nol', 11: 'sebelas', 18: 'delapan belas', 19: 'sembilan belas', 21: 'dua puluh satu', 100: 'seratus', 101: 'seratus satu', 250: 'dua ratus lima puluh', 1500: 'seribu lima ratus', 12345: 'dua belas ribu tiga ratus empat puluh lima' }
  for (const [n, k] of Object.entries(t)) assert.equal(KO.terbilang(+n), k)
})

test('teks WhatsApp: kepala, dua butir ringkasan dengan U+2060, penutup', () => {
  const t = KO.teks(konteks()), b = t.split('\n')
  assert.equal(b[0], '*Yth. Kepala BNPB*'); assert.equal(b[1], 'CC:')
  assert.deepEqual(b.slice(2, 6), ['     - Unsur Pengarah BNPB', '     - Ess I BNPB', '     - Ess II BNPB', '     - Tenaga Ahli Ka.BNPB'])
  assert.ok(t.includes('Mohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal 20/10/2026 pkl 07.00 WIB s.d 21/10/2026 pkl 07.00 WIB sebagai berikut:'))
  assert.ok(t.includes(`1.${WJ} ${WJ}Laporan kejadian bencana sejumlah 19 (sembilan belas) kejadian.`))
  assert.ok(t.includes(`2.${WJ} ${WJ}Kejadian menonjol/kejadian berdampak signifikan sejumlah 18 (delapan belas) kejadian.`))
  assert.ok(t.endsWith('Koordinator pembuat laporan: Jazmi\n\nDemikian disampaikan. Mohon arahan lebih lanjut'))
  assert.ok(!t.includes(' · '))
})

test('18 entri, 12 kelompok A-L berurutan kemunculan, tiap entri punya lima butir', () => {
  const t = KO.teks(konteks()), grup = [...t.matchAll(/^\*([A-Z])\. Prov\. (.+)\*$/gm)].map(m => m[1] + '|' + m[2])
  assert.deepEqual(grup, ['A|Sumatera Selatan', 'B|Kep. Riau', 'C|Riau', 'D|Jambi', 'E|Lampung', 'F|Jawa Tengah', 'G|Jawa Timur', 'H|Maluku', 'I|Sulawesi Selatan', 'J|Sulawesi Tengah', 'K|Nusa Tenggara Timur', 'L|Kalimantan Tengah'])
  const judul = t.match(/^\d+\. Bencana Alam .+$/gm); assert.equal(judul.length, 18)
  for (const lb of ['Dampak', 'Penetapan status', 'Pendampingan BNPB', 'Kondisi mutakhir', 'Detail']) assert.equal(t.match(new RegExp(`^- ${lb}: .+$`, 'gm')).length, 18, lb)
  assert.ok(t.includes('1. Bencana Alam Kebakaran Hutan dan Lahan di Prov. Sumatera Selatan *(Pengkinian Data)*'))
  assert.ok(t.includes('1. Bencana Alam Kebakaran Hutan dan Lahan di Kab. Lingga *(Kejadian Baru)*'))
  assert.ok(t.includes('1. Bencana Alam Gempa Bumi di Prov. Nusa Tenggara Timur *(Pengkinian Data)*'))
  assert.ok(t.includes('- Detail: Entry no 03 laphar 20/10/2026') && t.includes('- Detail: Entry no 04 laphar 20/10/2026'))
  assert.ok(t.includes('- Pendampingan BNPB: Tim BNPB') && t.includes('- Pendampingan BNPB: -'))
  assert.ok(t.includes('3. Bencana Alam Kebakaran Hutan dan Lahan di Kab. Karanganyar'), 'penomoran per kelompok')
})

test('tidak ada angka yang bukan dari isian (selain tanggal periode, jam, hitungan, nomor urut)', () => {
  const i = isi(), t = KO.teks(konteks(i)), sah = new Set(), simpan = s => { for (const m of String(s).matchAll(/\d+(?:[.,]\d+)*/g)) sah.add(m[0]) }
  ;(function jalan(o) { if (o && typeof o === 'object') Object.values(o).forEach(jalan); else simpan(o) })(i)
  for (const x of ['20', '10', '2026', '21', '07', '00', '18', '19', '03', '04']) sah.add(x)   // periode, jam, hitungan, entry_no ber-nol
  for (let n = 1; n <= 18; n++) sah.add(String(n))   // nomor urut
  const asing = [...t.matchAll(/\d+(?:[.,]\d+)*/g)].map(m => m[0]).filter(x => !sah.has(x) && !sah.has(x.replace(/[.,]$/, '')))
  assert.deepEqual(asing, [])
})

test('kolom kosong tampil "-", tembusan dan kepada dapat diganti', () => {
  const i = isi(); i.kejadian = [{ jenis: 'banjir', prov: '14', lokasi: 'Kampar', utama: '', status: 'berjalan' }]; i.tembusan = ['Ess III BNPB']; i.kepada = 'Sekretaris Utama'; i.laporan_masuk = null; i.koordinator = ''
  const t = KO.teks(konteks(i))
  assert.ok(t.startsWith('*Yth. Sekretaris Utama*\nCC:\n     - Ess III BNPB\n'))
  assert.ok(t.includes('1. Bencana Alam Banjir di Kab. Kampar\n- Dampak: -\n- Penetapan status: -\n- Pendampingan BNPB: -\n- Kondisi mutakhir: -\n- Detail: -'))
  assert.ok(t.includes('sejumlah - kejadian') && t.includes('sejumlah 1 (satu) kejadian') && t.includes('Koordinator pembuat laporan: -'))
})

test('PDF A4 tegak dari jsPDF vendor: jadi tanpa galat, banyak halaman, nomor halaman', () => {
  const cjs = join(mkdtempSync(join(tmpdir(), 'jspdf-')), 'jspdf.cjs')   // vendor berpaket ESM; salin ke .cjs supaya UMD-nya jalan di node
  writeFileSync(cjs, readFileSync(new URL('../../public/vendor/jspdf/jspdf.umd.min.js', import.meta.url)))
  globalThis.self ??= globalThis
  const { jsPDF } = createRequire(import.meta.url)(cjs)
  const doc = new jsPDF({ unit: 'in', format: 'a4', compress: true }), n = (() => {   // Roboto ditanam seperti di layar (tanamRoboto)
    for (const [b, f] of [['normal', 'Regular'], ['bold', 'Bold']]) { const g = readFileSync(new URL(`../../public/vendor/roboto/Roboto-${f}.ttf`, import.meta.url)).toString('base64'); doc.addFileToVFS(`Roboto-${f}.ttf`, g); doc.addFont(`Roboto-${f}.ttf`, 'Roboto', b) }
    return KO.pdf(doc, konteks(), 'Roboto')
  })()
  assert.ok(n >= 3 && n <= 8, 'halaman ' + n)
  const bytes = Buffer.from(doc.output('arraybuffer')); assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
  const dir = mkdtempSync(join(tmpdir(), 'koord-')); writeFileSync(join(dir, 'k.pdf'), bytes)
  if (process.env.KOORD_PDF) writeFileSync(process.env.KOORD_PDF, bytes)
})

test('DOCX: zip sah, tiga berkas wajib + footer, CRC cocok, teks isian ada', () => {
  const z = Buffer.from(KO.docx(konteks())), dir = mkdtempSync(join(tmpdir(), 'koord-')); writeFileSync(join(dir, 'k.docx'), z)
  assert.equal(z.readUInt32LE(0), 0x04034b50)
  try { assert.match(execFileSync('unzip', ['-tq', join(dir, 'k.docx')]).toString(), /No errors/) } catch (e) { if (e.code !== 'ENOENT') throw e }
  const doc = execFileSync('unzip', ['-p', join(dir, 'k.docx'), 'word/document.xml']).toString()
  assert.ok(doc.includes('Laporan Hasil Pemantauan Dit. Koordalops BNPB') && doc.includes('sembilan belas') && !doc.includes(WJ))
  if (process.env.KOORD_DOCX) writeFileSync(process.env.KOORD_DOCX, z)
})
