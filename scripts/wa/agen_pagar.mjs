// Pagar angka bot V2 (data/kajian-bnpb/bot-laporan: K4, K23, D17, A11). MURNI: tanpa I/O, diuji dengan isi buatan.
// Masukan isi deck dari scripts/wa/agen_isi.py: {slides: [{n, tersembunyi, shapes: [{nama, teks, tabel?, tampak, alt?}]}], lain: [{bagian, teks}],
// media: [{bagian, sha256}], luar: [{bagian, target}]}; kunci dari <deck>.kunci.json ({slide, shape, sel?: [baris, kolom], angka}).
// Angka sistem (hotspot, firespot, luas terbakar, luas belum padam) hanya boleh tetap persis; shape terkunci boleh hilang hanya bila
// slide asalnya hilang utuh. Di slide (atau bagian) yang menyebut angka sistem, tiap angka harus ada di deck dasar atau bahan.

// ---------- normalisasi: NFKC, buang karakter format (zero width, soft hyphen), angka Unicode ke ASCII ----------
export function normal(s) {
  return String(s ?? '').normalize('NFKC').replace(/\p{Cf}/gu, '')
    .replace(/\p{Nd}/gu, (d) => { const c = d.codePointAt(0); for (const awal of [0x660, 0x6f0, 0x966, 0x9e6, 0xe50, 0xff10]) if (c >= awal && c < awal + 10) return String(c - awal); return d })
}
const rapi = (s) => normal(s).replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
const label = (s) => rapi(s).replace(/[±~]?\d[\d.,]*/g, ' ').replace(/[%()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

// ---------- angka: nilai dengan aturan Indonesia, tanggal, tahun, dan jam dilewati ----------
const BULAN = 'jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|agt|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?'
const BUKAN_UKURAN = new RegExp([
  `\\b\\d{1,2}\\s*(?:${BULAN})\\b(?:\\s+\\d{4})?`, // 17 Nov, 17 November 2026
  '\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\b', '\\b\\d{4}-\\d{2}-\\d{2}\\b', // 17/11/2026, 2026-11-17
  '\\b\\d{1,2}[.:]\\d{2}(?:\\s*(?:WIB|WITA|WIT))?(?![\\d.,])', // 18.00, 07.00 WIB
  '\\b20\\d{2}\\b', // tahun
].join('|'), 'gi')
export function nilai(token) {
  let t = String(token).replace(/^[±~]/, '').replace(/\s/g, '')
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.') // 1.234 / 1.250,75
  else if (/^\d+,\d+$/.test(t)) t = t.replace(',', '.') // 12,5
  else if (!/^\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? String(n) : null
}
export function angkaDi(teks) {
  const bersih = normal(teks).replace(BUKAN_UKURAN, ' ')
  const out = []
  // "1 234" (pemisah ribuan spasi) dibaca satu angka; "1.234" dan "1,5" seperti biasa
  for (const m of bersih.matchAll(/[±~]?\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|[±~]?\d+(?:[.,]\d+)?/g)) {
    const v = nilai(m[0].replace(/ (?=\d{3})/g, '.')); if (v !== null) out.push(v)
  }
  return out
}

// ---------- kata kunci angka sistem (setelah normalisasi, huruf besar-kecil diabaikan) ----------
// Luas untuk deck berangka sistem (penanganan karhutla); sempit untuk deck tanpa kunci (laporan harian bencana: "rumah terbakar",
// "listrik padam" sah dengan angka hasil jumlah agen).
const KATA_LUAS = /hot\s*-?\s*spot|titik\s+panas|titik\s+api|fire\s*-?\s*spot|terbakar|padam|kebakaran|karhutla/i
const KATA_SEMPIT = /hot\s*-?\s*spot|titik\s+panas|titik\s+api|fire\s*-?\s*spot|luas\s+(?:lahan\s+)?terbakar|lahan\s+terbakar|belum\s+padam|karhutla/i

// ---------- isi ----------
const shapesDari = (isi) => (Array.isArray(isi?.slides) ? isi.slides : []).flatMap((s) => (s.shapes || []).map((x) => ({ ...x, slide: s.n, tersembunyi: !!s.tersembunyi })))
function kelompok(shapes) { const m = new Map(); for (const x of shapes) m.set(x.nama, [...(m.get(x.nama) || []), x]); return m }
const sel = (x, [b, k]) => (Array.isArray(x?.tabel) && Array.isArray(x.tabel[b]) ? x.tabel[b][k] : undefined)
const teksShape = (x) => [...(Array.isArray(x.tabel) ? x.tabel.flat().map(String) : [String(x.teks ?? '')]), String(x.alt ?? '')]
function semuaTeks(isi) {
  const out = []
  for (const x of shapesDari(isi)) out.push(...teksShape(x))
  for (const l of (isi?.lain || [])) out.push(String(l.teks ?? ''))
  return out
}
const himpunanAngka = (teksArr) => { const s = new Set(); for (const t of teksArr) for (const a of angkaDi(t)) s.add(a); return s }
const KUNCI_API = /sk-ant-[\w-]{10,}/

// -> {lolos, langgar, dihapus, tanpaSumber, dariKemarin}
export function periksa(isiDasar, isiKeluar, kunci, { izin = [], kemarin = null } = {}) {
  // slide yatim (dihapus dari daftar presentasi tetapi bagiannya tertinggal di ZIP) = slide terhapus: tidak tampil di mana pun (sapu bug 19 Nov)
  const isiTampil = { ...isiKeluar, slides: (isiKeluar?.slides || []).filter((s) => !s.yatim) }
  const D = kelompok(shapesDari(isiDasar)), K = kelompok(shapesDari(isiTampil))
  const langgar = [], dihapus = []
  const kunciArr = (Array.isArray(kunci) ? kunci : []).filter((e) => e && e.shape != null)
  const namaKeluar = new Set(shapesDari(isiTampil).map((x) => x.nama))
  // slide dasar dianggap hilang utuh bila kurang dari 20% nama shape-nya masih ada di keluaran
  const slideHilang = (n) => {
    const s = (isiDasar?.slides || []).find((x) => x.n === n)
    const nama = (s?.shapes || []).map((x) => x.nama)
    return nama.length > 0 && nama.filter((x) => namaKeluar.has(x)).length < Math.max(1, nama.length * 0.2)
  }

  // 1. shape terkunci, dicocokkan lewat nama di slide mana pun (kelompok bila nama tidak unik)
  for (const nama of new Set(kunciArr.map((e) => e.shape))) {
    const es = kunciArr.filter((e) => e.shape === nama)
    const d = D.get(nama) || [], k = K.get(nama) || []
    const judul = `${es[0].angka || 'angka sistem'} (slide ${es[0].slide})`
    const selDikunci = es.filter((e) => Array.isArray(e.sel))
    if (!k.length) {
      if (slideHilang(es[0].slide)) { dihapus.push(`${judul} (slide dihapus)`); continue }
      langgar.push(`${judul}: shape angka sistem hilang atau diganti nama, padahal slide-nya masih ada`)
      continue
    }
    if (k.length !== d.length) { langgar.push(`${judul}: jumlah shape angka sistem berubah (${d.length} menjadi ${k.length})`); continue }
    if (k.some((x) => x.tersembunyi || x.tampak === false)) { langgar.push(`${judul}: angka sistem disembunyikan`); continue }
    if (selDikunci.length) {
      for (const e of selDikunci) {
        if (k.some((x) => sel(x, e.sel) === undefined)) { langgar.push(`${judul}: sel tabel angka sistem hilang`); continue }
        const lama = d.map((x) => rapi(sel(x, e.sel))).sort().join('|'), baru = k.map((x) => rapi(sel(x, e.sel))).sort().join('|')
        if (lama !== baru) langgar.push(`${judul}: sel tabel berubah ("${lama}" menjadi "${baru}")`)
      }
    } else {
      const lama = d.map((x) => rapi(x.teks)).sort().join('|'), baru = k.map((x) => rapi(x.teks)).sort().join('|')
      if (lama !== baru) langgar.push(`${judul}: berubah ("${lama.replace(/\n/g, ' ')}" menjadi "${baru.replace(/\n/g, ' ')}")`)
    }
  }
  // label shape terkunci yang muncul di shape lain (disalin atau dipindah) harus membawa angka yang sama. Shape terkunci lain dan pasangan
  // (label, angka) yang sudah ada di deck dasar tidak dihitung: hotspot "678 titik" dan firespot "139 titik" berlabel sama (sapu bug 19 Nov:
  // deck penanganan tanpa perubahan pun ditolak).
  const namaTerkunci = new Set(kunciArr.map((e) => e.shape))
  const pasanganDasar = new Set(shapesDari(isiDasar).map((y) => label(y.teks) + '#' + angkaDi(y.teks).join('|')))
  const labelLanggar = new Set()
  for (const nama of new Set(kunciArr.filter((e) => !Array.isArray(e.sel)).map((e) => e.shape))) {
    for (const x of D.get(nama) || []) {
      const lab = label(x.teks), angkaLama = angkaDi(x.teks).join('|')
      if (lab.length < 4) continue
      for (const y of shapesDari(isiTampil)) {
        if (y.nama === nama || namaTerkunci.has(y.nama) || y.tabel || label(y.teks) !== lab) continue
        const ang = angkaDi(y.teks).join('|')
        if (ang !== angkaLama && !pasanganDasar.has(lab + '#' + ang)) labelLanggar.add(`slide ${y.slide}: label "${lab}" disalin dengan angka lain`)
      }
    }
  }
  langgar.push(...labelLanggar)

  // 2-3. lingkup (slide atau bagian lain) yang menyebut angka sistem: tiap angka ukuran harus ada di deck dasar atau bahan
  const sah = new Set([...himpunanAngka(semuaTeks(isiDasar)), ...himpunanAngka(Array.isArray(izin) ? izin : [izin])])
  const KATA = kunciArr.length ? KATA_LUAS : KATA_SEMPIT
  const lingkup = [
    ...(isiKeluar?.slides || []).map((s) => ({ tempat: `slide ${s.n}${s.tersembunyi ? ' (tersembunyi)' : ''}`, teks: (s.shapes || []).flatMap(teksShape) })),
    ...(isiKeluar?.lain || []).map((l) => ({ tempat: String(l.bagian).replace(/^ppt\//, ''), teks: [String(l.teks ?? '')] })),
  ]
  for (const l of lingkup) {
    if (!l.teks.some((t) => KATA.test(normal(t)))) continue
    const asing = [...himpunanAngka(l.teks)].filter((a) => !sah.has(a))
    if (asing.length) langgar.push(`${l.tempat}: angka ${asing.slice(0, 5).map((a) => a.replace('.', ',')).join(', ')} di bagian yang memuat angka sistem tidak ada di deck dasar maupun bahan`)
  }

  // 4. media, grafik, berkas tertanam baru; tautan eksternal baru; kunci API di teks
  const sidik = new Set([...(isiDasar?.media || []), ...(kemarin?.media || [])].map((m) => m.sha256))
  for (const m of (isiKeluar?.media || [])) if (!sidik.has(m.sha256)) langgar.push(`${String(m.bagian).replace(/^ppt\//, '')}: gambar, grafik, atau berkas tertanam baru tidak boleh ditambahkan`)
  const luarLama = new Set((isiDasar?.luar || []).map((x) => x.target))
  for (const x of (isiKeluar?.luar || [])) if (!luarLama.has(x.target)) langgar.push(`${x.bagian}: tautan eksternal baru tidak boleh ditambahkan`)
  if (semuaTeks(isiKeluar).some((t) => KUNCI_API.test(t))) langgar.push('deck memuat teks berbentuk kunci API')

  // 5. asal angka (peringatan): angka di luar lingkup angka sistem yang tidak ada di dasar, bahan, maupun kemarin
  const dariKem = kemarin ? himpunanAngka(semuaTeks(kemarin)) : new Set()
  const tanpaSumber = new Set(), dariKemarin = new Set()
  for (const a of himpunanAngka(semuaTeks(isiKeluar))) {
    if (sah.has(a)) continue
    if (dariKem.has(a)) dariKemarin.add(a); else tanpaSumber.add(a)
  }
  const tampil = (s) => [...s].slice(0, 10).map((a) => a.replace('.', ','))
  return { lolos: langgar.length === 0, langgar: [...new Set(langgar)], dihapus, tanpaSumber: tampil(tanpaSumber), dariKemarin: tampil(dariKemarin) }
}
