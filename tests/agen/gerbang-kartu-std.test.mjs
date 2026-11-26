/* Gerbang kartu laporan standar .ex-std (pemilik 4 Nov 2026 "ini standar ke depannya"; DIPERBARUI 15 Nov 2026 mengikuti AGENTS.md 3.5
   pembaruan 11 Nov: "gausah ada kesimpulan ini"). Tiap bagian layar laporan = satu kartu: pil kategori, KEPALA = NAMA SEKSI (bukan kalimat
   temuan, tanpa angka .hl), isi (tabel menempel penuh), tanpa kaki keterangan/sumber. Angka temuan tampil di isi/Ringkasan.
   Gaya tunggalnya di public/inti/kartu.css. Kode lama yang belum dirombak ditampung daftar ratchet fixtures/kartu_std.json (plafon hanya boleh
   turun; kunci bersih = hapus entri). WAJIB_BERSIH tak boleh masuk daftar. Pemindainya fixtures/kartu_std.mjs (statis, bukan render).
   Layar laporan baru: tambahkan ke LAYAR (skrip + halaman HTML) dan ke SCOPE bila direktori baru.
   Kembaran sempit untuk /operasi: gerbang-tanpa-kesimpulan.test.mjs. */
import { fileURLToPath } from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, existsSync} from 'node:fs'
import {berkas, muatDaftar, banding, tegas} from './fixtures/ratchet.mjs'
import {pindai, ukurSemua, SCOPE, WAJIB_BERSIH} from './fixtures/kartu_std.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))   /* .pathname rusak di Windows ('D:\D:\...') */
const baca = p => readFileSync(ROOT + p, 'utf8')

const LAYAR = [
  {skrip: 'public/bnpb/dalops.js', html: 'public/bnpb/dalops.html', lama: [/dl-kepala/, /class:\s*"bn-blok",\s*id/]},
  {skrip: 'public/bnpb/katalog-dokumen.js', html: 'public/bnpb/katalog-dokumen.html', lama: []},
  {skrip: 'public/bnpb/silang.js', html: 'public/bnpb/silang.html', lama: []},
  {skrip: 'public/bnpb/rapor-sumber.js', html: 'public/bnpb/rapor-sumber.html', lama: []},
  {skrip: 'public/bnpb/kebutuhan_pasar.js', html: 'public/bnpb/kebutuhan.html', lama: []},
  {skrip: 'public/bnpb/saham.js', html: 'public/bnpb/saham.html', lama: [/class:\s*"bn-blok",\s*"data-panel"/]},
  {skrip: 'public/operasi_laporan.js', html: 'public/index.html', lama: []},
  {skrip: 'public/alat_gambar.js', html: 'public/index.html', lama: []},
  {skrip: 'public/banjir/sungai_induk.js', html: 'public/banjir/index.html', lama: []},
  {skrip: 'public/prediksi/laporan_layar.js', html: 'public/prediksi/index.html', lama: []},
  {skrip: 'public/siklus/inti.js', html: 'public/siklus/index.html', lama: []},
  {skrip: 'public/siklus/publik.js', html: 'public/siklus/publik.html', lama: []},
  {skrip: 'public/insiden_kaya.js', html: 'public/index.html', lama: []},
  {skrip: 'public/desa-waspada/desa-waspada.js', html: 'public/desa-waspada/index.html', lama: []},
  // Ruang Unit (G-3, RU-031). menunggu = HTML belum dibuat tiketnya; begitu berkasnya ada, syarat kartu.css berlaku tanpa sunting di sini.
  {skrip: 'public/bnpb/unit/rapor.js', html: 'public/bnpb/unit/unit.html', lama: [], menunggu: 'RU-020'},
]

test('kartu.css memuat semua bagian kartu standar', () => {
  const css = baca('public/inti/kartu.css').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const sel of ['.ex.ex-std', '.ex-std>.ex-hd', '.ex-std .ex-ey', '.ex-std .ex-jd>h3', '.ex-std .hl', '.ex-std>.ex-bd', '.ex-std .ex-tabel'])
    assert.ok(css.includes(sel + '{') || css.includes(sel + ','), `kartu.css tidak punya aturan ${sel}`)
})

for (const l of LAYAR) {
  test(`${l.skrip} memakai kartu standar`, () => {
    const js = baca(l.skrip)
    assert.match(js, /ex-std/, 'bagian layar harus dibungkus kartu .ex-std')
    assert.match(js, /ex-ey/, 'kartu harus punya pil kategori .ex-ey')
    assert.doesNotMatch(js, /Sumber: |class:\s*"ex-ft"/, 'kartu standar tanpa kaki keterangan/sumber (pemilik 4 Nov 2026)')
    for (const re of l.lama) assert.doesNotMatch(js, re, `pola kepala lama ${re} masih dipakai`)
    if (l.menunggu && !existsSync(ROOT + l.html)) return   // cangkang belum ada (tiket l.menunggu)
    assert.match(baca(l.html), /\/inti\/kartu\.css/, `${l.html} harus memuat /inti/kartu.css`)
  })
}

// G-3 (RU-031): tiap skrip Ruang Unit yang merender kartu wajib ada di LAYAR. Meta-uji direktori lawan daftar, supaya layar baru tidak lolos diam-diam.
const MERENDER = /ex-std|(?<![\w$.])(?:\w+\.)?kartu\w*\(/
const belumTerdaftar = (isi, layar) => Object.entries(isi).filter(([f, src]) => MERENDER.test(src) && !layar.some(l => l.skrip === f)).map(([f]) => f)
test('tiap public/bnpb/unit/*.js yang merender kartu terdaftar di LAYAR', () => {
  const isi = Object.fromEntries(berkas('public/bnpb/unit', /\.js$/).map(f => [f, baca(f)]))
  assert.ok(Object.keys(isi).includes('public/bnpb/unit/rapor.js'), 'public/bnpb/unit/rapor.js hilang: meta-uji membaca direktori yang salah')
  assert.deepEqual(belumTerdaftar(isi, LAYAR), [],
    'SEBAB: skrip Ruang Unit merender kartu (.ex-std atau kartu()) tetapi tidak ada di LAYAR gerbang-kartu-std.test.mjs.\nAKIBAT: syarat kartu standar dan kartu.css tidak diperiksa untuk layar itu.\nPERBAIKI: tambahkan {skrip, html, lama: []} ke LAYAR (RENCANA-UJI Ruang Unit 6.2) di commit yang sama dengan layarnya.')
  for (const l of LAYAR.filter(l => l.menunggu)) assert.ok(existsSync(ROOT + l.skrip), `${l.skrip} terdaftar tetapi tidak ada`)
})
test('meta-uji G-3 menolak public/bnpb/unit/contoh.js fiktif yang tidak terdaftar', () => {
  const palsu = {'public/bnpb/unit/contoh.js': 'el.innerHTML = `<section class="ex ex-std"><span class="ex-ey">x</span></section>`',
    'public/bnpb/unit/kartu2.js': 'UnitRapor.kartu(k)', 'public/bnpb/unit/rapor.js': '<section class="ex ex-std">', 'public/bnpb/unit/bantu.js': 'const a = 1'}
  assert.deepEqual(belumTerdaftar(palsu, LAYAR), ['public/bnpb/unit/contoh.js', 'public/bnpb/unit/kartu2.js'], 'meta-uji buta terhadap layar Ruang Unit yang tidak terdaftar')
})

// Layar yang membangun kartunya lewat kartu() dari inti.js (sudah di LAYAR): tak boleh membuat kepala bagian sendiri.
for (const skrip of ['public/siklus/kaji.js', 'public/siklus/pulih.js', 'public/siklus/renkon.js', 'public/siklus/gladi.js', 'public/siklus/masadepan.js', 'public/siklus/pintu.js', 'public/siklus/registri.js']) {
  test(`${skrip} memakai kartu() dari inti.js, tanpa kepala sendiri`, () => {
    const js = baca(skrip)
    assert.match(js, /import\s*\{[^}]*\bkartu\b[^}]*\}\s*from\s*"\.\/inti\.js"/, 'harus mengimpor kartu dari ./inti.js')
    assert.match(js, /\bkartu\(/, 'bagian layar harus dibangun dengan kartu(')
    assert.doesNotMatch(js, /Sumber: |class:\s*"ex-ft"|class:\s*"head"|"h2"/, 'tanpa kaki sumber dan tanpa kepala bagian sendiri')
  })
}

// Aturan baru (3.5, 11 Nov 2026): kepala kartu bukan kalimat temuan (tanpa .hl), tanpa sumber/kaki. Kode lama = ratchet menyusut.
test('kepala kartu = nama seksi, tanpa kaki sumber: kode lama hanya boleh menyusut', () => {
  const daftar = Object.fromEntries(Object.entries(muatDaftar('kartu_std.json', ukurSemua())).filter(([k]) => !k.startsWith('_')))
  tegas(assert, banding(ukurSemua(), daftar),
    'kartu_std.json\nSEBAB: kepala kartu memuat hl()/.hl (kalimat temuan) atau kartu memberi kaki "Sumber:" (AGENTS.md 3.5, 11 Nov 2026).\nAKIBAT: pemilik menolak kalimat kesimpulan di kartu.\nPERBAIKI: kepala = nama seksi (angka temuan ke isi/Ringkasan; kalimat boleh jadi title), sumber ke isi bila perlu.')
})
test('layar yang sudah dirombak wajib bersih tanpa pengecualian', () => {
  const u = ukurSemua(), daftar = muatDaftar('kartu_std.json')
  for (const f of WAJIB_BERSIH) {
    assert.deepEqual(Object.keys(u).filter(k => k.startsWith(f + '#')), [], `${f} sudah dirombak: tidak boleh melanggar aturan 3.5 baru`)
    assert.deepEqual(Object.keys(daftar).filter(k => k.startsWith(f + '#')), [], `${f} tidak boleh ada di daftar pengecualian`)
  }
  assert.ok(WAJIB_BERSIH.every(f => berkas(f.replace(/\/[^/]+$/, ''), /\.js$/).includes(f)), 'WAJIB_BERSIH menunjuk berkas yang tidak ada')
})

// Bukti gerbang tidak buta: fixture jahat harus tertangkap, fixture sah lolos.
test('pemindai menangkap kepala kalimat temuan dan kaki sumber', () => {
  const jahat = {
    posisi: 'const x = kartu("Hujan", `${Kartu.hl(fmt(n))} area berhujan lebat`, isi, "");',
    objek: 'kartu({ey: "Kaji", judul: ["Kaji ", hl("belum")], isi: []})',
    h3: 'return `<h3>${hl(fmt(n))} base</h3>`;',
    h3judul: 'return `<header><h3>${judul}</h3></header>`;',
    sumber: 'this.kartu("Angin", "Angin", isi, "Open-Meteo")',
    kaki: 'return `<footer class="ex-ft">Sumber: BMKG</footer>`;',
  }
  for (const [nama, src] of Object.entries(jahat)) {
    const r = pindai(src)
    assert.ok(r.judulHl + r.sumber + r.kaki > 0, `fixture jahat "${nama}" lolos: gerbang buta`)
  }
  const sah = [
    'Kartu.kartu(EY.status, "Status longsor kecamatan", isi, "")',
    'const isi = `Ada ${hl(fmt(n))} area`; return bagian("Renlap", isi);',
    'kartu({ey: "Kaji cepat", judul: "Kaji cepat", isi: [hl("5")]})',
    'return `<h3>${nama}</h3>`; // NAMA_SEKSI\nconst NAMA_SEKSI = {}; <h3>${judul}</h3>',
  ]
  for (const src of sah) assert.deepEqual(pindai(src), {judulHl: 0, sumber: 0, kaki: 0}, `fixture sah ditolak: ${src}`)
})
