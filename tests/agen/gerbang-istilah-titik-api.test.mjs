/* Ratchet istilah (PKH-32): layar memakai "titik panas" (hotspot), bukan "titik api". Dipindai: public/**\/*.{html,js}
   (tanpa vendor/ dan salinan " 2."). Dihitung: kemunculan "titik api" (tanpa peka huruf, spasi apa pun) di teks, di luar komentar JS/HTML.
   Baris yang memuat penanda `istilah-resmi` (komentar di baris itu atau baris sebelumnya) dikecualikan: kutipan istilah resmi BNPB.
   BATAS: kunci JSON/variabel tak ber-spasi tidak terjumlah (bukan teks layar); string/regex berisi "//" bisa memotong baris lebih awal
   (komentar `//` dibuang kasar); teks dalam string yang kebetulan di komentar blok ikut terbuang.
   Daftar: fixtures/titik-api-sisa.json ({berkas: jumlah}, hanya boleh menyusut; perintis: ISI_DAFTAR=1). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, buangKomentarJs, tegas } from './fixtures/ratchet.mjs'

const RE = /titik\s+api/gi
const TANDA = /istilah-resmi/

export function hitung(kode) {
  const baris = kode.split('\n')
  const dikecualikan = baris.map((b, i) => TANDA.test(b) || (i > 0 && TANDA.test(baris[i - 1])))
  const bersih = buangKomentarJs(kode.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '))).split('\n')
  return bersih.reduce((n, b, i) => n + (dikecualikan[i] ? 0 : (b.match(RE) || []).length), 0)
}

test('"titik api" di teks layar tidak bertambah (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('public', /\.(html|js)$/)) { const n = hitung(baca(f)); if (n) ukur[f] = n }
  const m = banding(ukur, muatDaftar('titik-api-sisa.json', ukur)).map((x) => x + ' | sebab: istilah baku layar "titik panas" (PKH-32); perbaiki: ganti jadi "titik panas", atau tandai kutipan resmi BNPB dengan komentar `istilah-resmi`')
  tegas(assert, m, 'titik-api-sisa.json')
})

test('pemeriksa: pelanggaran tertangkap, pengecualian dan komentar lolos', () => {
  assert.equal(hitung('el.textContent = "Ada 3 titik api"'), 1)
  assert.equal(hitung('<p>Titik  Api aktif</p>'), 1)
  assert.equal(hitung('x("TITIK API")\ny("titik api")'), 2)
  assert.equal(hitung('// titik api di komentar\n/* titik api */ ok()\n<!-- titik api -->'), 0)
  assert.equal(hitung('// istilah-resmi\nt = "titik api"'), 0)
  assert.equal(hitung('t = "titik api" // istilah-resmi: kutipan BNPB'), 0)
  assert.equal(hitung('const titik_api = 1; const titikApi = 2'), 0)
})
