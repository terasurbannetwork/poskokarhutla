/* Gerbang Insiden Kaya (IK-11; data/kajian-bnpb/insiden-kaya/RENCANA-UJI.md §5, KEAMANAN-PRIVASI §6).
   SEBAB: keluaran publik insiden memuat angka bangunan dan progresi api; koordinat sel/bangunan, nol palsu, atau kata "padam"/"aman"
   menyesatkan pembaca atau membocorkan data terkunci. AKIBAT bila bocor: terbit permanen di CDN. PERBAIKI: ubah keluaran/kode yang
   ditunjuk pesan; jangan melonggarkan gerbang ini. Pemeriksa murni diuji dengan fixture jahat (harus merah) dan sah (harus hijau);
   berkas data nyata (public/data/insiden_bangunan.json, progresi/*.json) diperiksa bila ada (dibuat CI, tidak di-commit). */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {AKAR, berkas, baca, buangKomentarJs, buangKomentarCss} from './fixtures/ratchet.mjs'

const ada = rel => fs.existsSync(path.join(AKAR, rel))
const TERLARANG = ['sel', 'sel_halus', 'kec', 'desa', 'lat', 'lon', 'i', 'j']
const KATA = /\b(padam|aman|penyebab|pelaku|sumber api)\b/i

const kunciSemua = (o, keluar = []) => {
  if (Array.isArray(o)) o.forEach(x => kunciSemua(x, keluar))
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { keluar.push(k); kunciSemua(v, keluar) }
  return keluar
}

/** Pelanggaran satu dokumen insiden_bangunan.json (bentuk keluaran paparan_insiden.py). */
export function periksaBangunan(d) {
  const t = []
  for (const k of kunciSemua(d)) if (TERLARANG.includes(k)) t.push(`kunci terlarang "${k}" (koordinat/sel/wilayah bocor)`)
  if (d.radius_m !== 500) t.push(`radius_m = ${d.radius_m}, harus 500`)
  if (d.ambang_keyakinan !== 0.7) t.push(`ambang_keyakinan = ${d.ambang_keyakinan}, harus 0.7`)
  for (const [id, e] of Object.entries(d.insiden || {})) {
    if (e.terliput === false) {
      for (const f of ['kumulatif', 'kini', 'luas_atap_m2']) if (e[f] !== null && e[f] !== undefined) t.push(`${id}: terliput:false tetapi ${f} = ${e[f]} (harus null, bukan 0)`)
    } else {
      for (const f of ['kumulatif', 'kini']) {
        const v = e[f]
        if (v != null && (v < 5 || v % 5)) t.push(`${id}: ${f} = ${v} mentah (harus null bila < 5, selebihnya kelipatan 5)`)
      }
      for (const f of ['kumulatif', 'kini']) if (e.tampil?.[f] && !/^(kurang dari 5|sekitar \d*[05])$/.test(e.tampil[f])) t.push(`${id}: tampil.${f} "${e.tampil[f]}" bukan bentuk "kurang dari 5"/"sekitar N"`)
    }
  }
  return t
}
/** Pelanggaran satu berkas progresi/<id>.json langsung (bukan arsip/petak). */
export function periksaProgresi(p, ukuran) {
  const t = []
  if (ukuran > 150 * 1024) t.push(`ukuran ${ukuran} B > 150 KB`)
  if ((p.isokron || []).length > 30) t.push(`isokron ${p.isokron.length} > 30`)
  for (const l of p.laju || []) if (l.terukur === false && (l.p90_km !== null || (l.laju ?? null) !== null)) t.push(`laju hari k=${l.k}: terukur:false tetapi p90_km/laju bukan null`)
  return t
}
/** Pelanggaran kode layar. */
export function periksaLayar(src, nama = 'layar') {
  const t = [], js = buangKomentarJs(src)
  const k = js.match(KATA); if (k) t.push(`${nama}: kata terlarang "${k[0]}"`)
  if (/\b(angka|fmt|esc|String)\(\s*e\.(kumulatif|kini)\b|\$\{\s*e\.(kumulatif|kini)\s*\}|\|\|\s*e\.(kumulatif|kini)\b(?!\s*[!=]=)/.test(js)) t.push(`${nama}: angka bangunan mentah (e.kumulatif/e.kini) dipakai sebagai tampilan; pakai teks e.tampil`)
  if (/\b(sel_halus|bangunan_\w*\.json|data\/terkunci)\b/.test(js)) t.push(`${nama}: menyentuh data terkunci/rincian sel`)
  return t
}

const bangunanSah = () => ({radius_m: 500, ambang_keyakinan: 0.7, cakupan_provinsi: ['63'], insiden: {
  '63-1': {terliput: true, kumulatif: 120, kini: null, luas_atap_m2: 5000, tampil: {kumulatif: 'sekitar 120', kini: 'kurang dari 5'}},
  '62-2': {terliput: false, kumulatif: null, kini: null, luas_atap_m2: null, alasan: 'grid belum dibuat'}}})

test('fixture sah lolos, tiap pelanggaran contoh membuat pemeriksa MERAH', () => {
  assert.deepEqual(periksaBangunan(bangunanSah()), [])
  const jahat = f => { const d = bangunanSah(); f(d); return periksaBangunan(d) }
  assert.ok(jahat(d => { d.insiden['63-1'].sel_halus = [[1, 2]] }).length, 'kunci sel_halus lolos')
  assert.ok(jahat(d => { d.insiden['63-1'].lat = -3.1 }).length, 'kunci lat lolos')
  assert.ok(jahat(d => { d.radius_m = 1000 }).length, 'radius 1000 lolos')
  assert.ok(jahat(d => { d.ambang_keyakinan = 0.5 }).length, 'ambang 0.5 lolos')
  assert.ok(jahat(d => { d.insiden['62-2'].kumulatif = 0 }).length, 'nol pada terliput:false lolos')
  assert.ok(jahat(d => { d.insiden['63-1'].kini = 3 }).length, 'angka < 5 mentah lolos')
  assert.ok(jahat(d => { d.insiden['63-1'].kumulatif = 123 }).length, 'angka tak dibulatkan lolos')
  assert.ok(jahat(d => { d.insiden['63-1'].tampil.kumulatif = '3 bangunan' }).length, 'teks tampil mentah lolos')
  const p = {isokron: [], laju: [{k: 1, terukur: false, p90_km: null}]}
  assert.deepEqual(periksaProgresi(p, 1000), [])
  assert.ok(periksaProgresi({isokron: [], laju: [{k: 1, terukur: false, p90_km: 0}]}, 10).length, 'p90_km 0 pada terukur:false lolos')
  assert.ok(periksaProgresi({isokron: Array(31).fill({}), laju: []}, 10).length, 'isokron 31 lolos')
  assert.ok(periksaProgresi(p, 151 * 1024).length, '> 150 KB lolos')
  assert.ok(periksaLayar('const a = "api sudah padam"').length, '"padam" lolos')
  assert.ok(periksaLayar('const a = "wilayah aman"').length, '"aman" lolos')
  assert.ok(periksaLayar('const x = angka(e.kumulatif)').length, 'fallback angka mentah lolos')
  assert.ok(periksaLayar('const x = t.kini || e.kini').length, 'fallback || e.kini lolos')
  assert.deepEqual(periksaLayar('const x = t.kini || "–" // padam hanya di komentar'), [])
})

test('insiden_kaya.js dan .css: tanpa kata terlarang, tanpa angka bangunan mentah, tanpa data terkunci', () => {
  assert.deepEqual(periksaLayar(baca('public/insiden_kaya.js'), 'public/insiden_kaya.js'), [])
  const css = buangKomentarCss(baca('public/insiden_kaya.css'))
  assert.doesNotMatch(css, KATA, 'insiden_kaya.css memuat kata terlarang')
})

test('berkas data publik nyata (bila sudah dibuat CI) bersih', () => {
  if (ada('public/data/insiden_bangunan.json')) assert.deepEqual(periksaBangunan(JSON.parse(baca('public/data/insiden_bangunan.json'))), [])
  const dir = 'public/data/progresi'
  if (ada(dir)) for (const f of fs.readdirSync(path.join(AKAR, dir)).filter(n => n.endsWith('.json'))) {
    const s = fs.readFileSync(path.join(AKAR, dir, f))
    assert.deepEqual(periksaProgresi(JSON.parse(s), s.length), [], `${dir}/${f}`)
  }
})

test('arsip progresi tidak terbit: public/.assetsignore memuat data/progresi/arsip/', () => {
  const baris = baca('public/.assetsignore').split('\n').map(s => s.trim())
  assert.ok(baris.includes('data/progresi/arsip/'), 'SEBAB: arsip petak deteksi (cache CI) tak boleh terbit. PERBAIKI: tambahkan baris "data/progresi/arsip/" ke public/.assetsignore')
})

test('data terkunci tak menyusup ke public/ dan insiden terkunci tak ikut unggah/commit', () => {
  const bocor = berkas('public', /\.(js|mjs|css|html)$/).filter(f => /\bsel_halus\b|data\/terkunci/.test(buangKomentarJs(baca(f))))
  assert.deepEqual(bocor, [], 'berkas public/ menyebut sel_halus/data/terkunci')
  const gi = baca('.gitignore'); assert.match(gi, /^data\/terkunci\/\s*$/m, '.gitignore harus mengabaikan data/terkunci/')
  for (const f of berkas('.github/workflows', /\.ya?ml$/)) for (const [n, b] of baca(f).split('\n').entries()) {
    if (/^\s*#/.test(b) || !/terkunci\/insiden/.test(b)) continue
    assert.doesNotMatch(b, /git add|path:|r2 object|upload/i, `${f}:${n + 1} mengunggah/commit data/terkunci/insiden/ (rincian sel, KEAMANAN-PRIVASI §6)`)
  }
  const yml = baca('.github/workflows/bangunan.yml')
  for (const m of yml.matchAll(/data\/terkunci\/(\S+)/g)) if (/^\s*(path:|-\s)/.test(yml.slice(yml.lastIndexOf('\n', m.index) + 1, m.index)) && !/^bangunan\b/.test(m[1])) assert.fail(`bangunan.yml mengunggah data/terkunci/${m[1]}, glob unggah harus data/terkunci/bangunan/*.json`)
})

test('ambang bangunan satu nilai: bangunan.py = 0.70, paparan_insiden.py mengimpor bukan menyalin', () => {
  assert.match(baca('scripts/umum/bangunan.py'), /^AMBANG_KEYAKINAN = 0\.70\s*$/m)
  const pi = baca('scripts/umum/paparan_insiden.py')
  assert.match(pi, /^AMBANG_BANGUNAN = B\.AMBANG_KEYAKINAN\s*$/m, 'AMBANG_BANGUNAN harus = B.AMBANG_KEYAKINAN')
  assert.doesNotMatch(pi, /AMBANG\w*\s*=\s*0?\.\d/, 'paparan_insiden.py tidak boleh punya ambang literal sendiri')
})
