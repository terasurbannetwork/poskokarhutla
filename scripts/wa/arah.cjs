// Arah pesan masuk gateway bot laporan (BL-09; data/kajian-bnpb/bot-laporan: Q1, Q14, K11, D8). Murni, diuji tests/wa/arah.test.mjs.
//  arah()         : ke perintah.mjs, ke mesin proyek tanpa diteruskan ke Worker (perintah proyek), diteruskan lalu ke proyek, atau diteruskan saja.
//  buatAntre()    : satu tangani proyek per pengirim pada satu waktu, pengirim lain tidak menunggu.
//  buatPenunggu() : proyek menunggu hasil POST /api/wa/gateway (wa_id) sebelum bahan ditempel.
//  buatTerlewat() : K11, satu T-TERLEWAT per nomor terdaftar per jendela mati, dihitung dari detak terakhir sampai tersambung lagi.
//  isiBerkas()    : gambar sebagai pesan gambar berketerangan, lainnya sebagai dokumen.
const fs = require('fs')
const path = require('path')

// Perintah mesin proyek (Q14 dan ALUR B-C): `kirim ulang ...` dan `status <tanggal>` tidak termasuk, tetap di perintah.mjs.
// Angka menu draf 1 sampai 4 (boleh berspasi atau bertitik) juga perintah: tidak pernah jadi bahan di Worker. `ya` tidak di sini: hanya perintah
// selama tanya batal berlaku, jadi diputuskan proyek.klasifikasi (jalur 'bahan+proyek' teks saja, lewat pilihJalur).
const KATA_PROYEK = /^(buat\b.*|status|bantuan|panduan|lanjut|ulangi|hitung|tunggu|(final|batal|versi|pptx)( p-\d{6}-\d{2})?|balik (ke )?v?\d+|[1-4][\s.]*)$/
const ANGKA_MENU = /^[1-4][\s.]*$/
const KATA_TUNTUN = /^(lanjut|ulangi|buat saja|hitung|tunggu)$/ // K17/K18: diteruskan = bahan, tidak pernah perintah
// diteruskan: pesan berlabel Diteruskan tidak pernah jadi angka menu (bahan biasa).
// Ekor bukan huruf atau angka dibuang ("lanjut\", "final!", "lanjut."), sama dengan proyek.normalPerintah.
function perintahProyek(teks, diteruskan = false) {
  const asli = String(teks ?? '').trim()
  const t = asli.toLowerCase().replace(/[^\p{L}\p{N}]+$/u, '').replace(/\s+/g, ' ')
  if (!t || t.length > 60 || /\n/.test(asli)) return false
  if (diteruskan && (ANGKA_MENU.test(t) || KATA_TUNTUN.test(t))) return false
  return KATA_PROYEK.test(t)
}

// -> 'perintah' | 'proyek' (perintah proyek, tidak diteruskan) | 'bahan+proyek' (teruskan, lalu proyek dengan wa_id) | 'bahan' (teruskan saja).
// cmd = hasil perintah.cegat (dipanggil dengan proyek: BL_PROYEK && pribadi, jadi grup tetap memakai perilaku lama).
function arah({ proyek = false, pribadi = false, terdaftar = false, grupOps = false, lama = false, adaMedia = false, teks = '', cmd = null, diteruskan = false } = {}) {
  if (cmd && cmd.aksi !== 'proyek') return 'perintah'
  if (!proyek || !pribadi || grupOps || !terdaftar) return cmd ? 'perintah' : 'bahan'
  if (lama) return 'bahan' // K11: susulan tidak pernah ke proyek; jalur terjadwal tetap menerimanya
  const tuntunTerusan = diteruskan && !adaMedia && !perintahProyek(teks, true) && perintahProyek(teks, false) // kata tuntun diteruskan = bahan
  if ((cmd && cmd.aksi === 'proyek' && !tuntunTerusan) || (!adaMedia && perintahProyek(teks, diteruskan))) return 'proyek'
  return 'bahan+proyek'
}

// Teks saja dari nomor terdaftar: proyek.klasifikasi (tanpa efek samping) -> 'langsung' (perintah/revisi: tidak ke Worker, tanpa wa_id) | 'bahan'.
// Belum diekspor atau galat = 'bahan' (perilaku sebelum BL-10).
async function pilihJalur(Pr, pesan, ctx) {
  if (!Pr || typeof Pr.klasifikasi !== 'function') return 'bahan'
  try {
    const k = await Pr.klasifikasi(pesan, ctx)
    return k === 'perintah' || k === 'revisi' ? 'langsung' : 'bahan'
  } catch { return 'bahan' }
}

// Tanda "Diteruskan" WhatsApp (contextInfo.isForwarded) pada isi pesan yang sudah dinormalkan.
const JENIS_ISI = ['extendedTextMessage', 'documentMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentWithCaptionMessage']
function diteruskan(c) {
  if (!c || typeof c !== 'object') return false
  for (const j of JENIS_ISI) {
    const x = c[j]
    if (x && x.contextInfo && x.contextInfo.isForwarded) return true
    if (x && x.message && diteruskan(x.message)) return true
  }
  return false
}

// messageTimestamp Baileys bisa number, string, atau Long (protobuf): -> milidetik, atau null bila tidak jelas.
function tsMs(x) {
  if (x == null) return null
  const n = typeof x === 'object' && typeof x.toNumber === 'function' ? x.toNumber() : Number(String(x))
  return Number.isFinite(n) && n > 0 ? n * 1000 : null
}

function buatAntre({ log = () => {} } = {}) {
  const ekor = new Map()
  return {
    tambah(kunci, kerja) {
      const ini = (ekor.get(kunci) || Promise.resolve()).then(kerja).catch((e) => log('[antre] galat', String((e && e.message) || e)))
      ekor.set(kunci, ini)
      ini.then(() => { if (ekor.get(kunci) === ini) ekor.delete(kunci) })
      return ini
    },
    sibuk: (kunci) => ekor.has(kunci),
  }
}

function buatPenunggu({ batasMs = 30 * 60e3, setT = setTimeout, clearT = clearTimeout } = {}) {
  const tunggu = new Map()
  return {
    tunggu(id) {
      return new Promise((selesai) => {
        const t = setT(() => { tunggu.delete(id); selesai(null) }, batasMs)
        if (t && t.unref) t.unref()
        tunggu.set(id, (hasil) => { clearT(t); tunggu.delete(id); selesai(hasil) })
      })
    },
    selesai(id, hasil) { const f = tunggu.get(id); if (f) f(hasil); return !!f },
  }
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const wib = (ms) => new Date(ms + 7 * 3600e3)
const jam = (ms) => { const d = wib(ms); return `${String(d.getUTCHours()).padStart(2, '0')}.${String(d.getUTCMinutes()).padStart(2, '0')}` }
const tgl = (ms) => { const d = wib(ms); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}` }
function teksTerlewat(dari, sampai) {
  const sah = (x) => Number.isFinite(x) && x > 0
  if (!sah(dari) || !sah(sampai)) return '*Pesan belum diproses*\n\nBot tadi mati, pesan selama itu tidak diproses.\nKirim ulang bila masih perlu.' // jendela tidak jelas: tanpa jam, tidak pernah NaN
  const rentang = tgl(dari) === tgl(sampai) ? `jam ${jam(dari)} sampai ${jam(sampai)}` : `${tgl(dari)} jam ${jam(dari)} sampai ${tgl(sampai)} jam ${jam(sampai)}`
  return `*Pesan belum diproses*\n\nBot tadi mati ${rentang}.\nPesan di jam itu tidak diproses. Kirim ulang bila masih perlu.`
}

// state berkas: {detak, terkirim: {nomor: kunci jendela}}. kirim(nomor, teks) -> {ok}. Gagal kirim diulang sampai `ulang` kali.
function buatTerlewat({ berkas, kini = Date.now, kirim, log = () => {}, setT = setTimeout, jedaUlang = 60e3, ulang = 5 } = {}) {
  let st = { detak: 0, terkirim: {} }
  try { st = { ...st, ...JSON.parse(fs.readFileSync(berkas, 'utf8')) } } catch {}
  if (!st.terkirim || typeof st.terkirim !== 'object') st.terkirim = {}
  let jendela = null
  const sedang = new Set()
  const simpan = () => {
    try { fs.mkdirSync(path.dirname(berkas), { recursive: true, mode: 0o700 }); fs.writeFileSync(berkas, JSON.stringify(st), { mode: 0o600 }) } catch (e) { log('[terlewat] galat simpan', String(e.message || e)) }
  }
  const detak = () => { st.detak = kini(); simpan() }
  // Dipanggil saat WA tersambung: mati sejak detak terakhir (saat masih tersambung) sampai sekarang.
  function buka() {
    const t = kini()
    jendela = { dari: st.detak || null, sampai: t, kunci: String(t) }
    for (const [n, k] of Object.entries(st.terkirim)) if (t - Number(k) > 7 * 86400e3) delete st.terkirim[n]
    detak()
    return jendela
  }
  async function coba(nomor, teks, sisa) {
    let r
    try { r = await kirim(nomor, teks) } catch (e) { r = { ok: false, error: String(e.message || e) } }
    if (r && r.ok) { st.terkirim[nomor] = jendela.kunci; simpan(); sedang.delete(nomor); log('[terlewat] terkirim'); return true }
    if (sisa <= 1) { sedang.delete(nomor); log('[terlewat] gagal', r && r.error); return false }
    const t = setT(() => coba(nomor, teks, sisa - 1), jedaUlang)
    if (t && t.unref) t.unref()
    return false
  }
  // Susulan dari nomor terdaftar yang belum pernah diproses: T-TERLEWAT tepat sekali per nomor per jendela.
  function susulan(nomor, waktu) {
    if (!jendela || !nomor) return null
    if (st.terkirim[nomor] === jendela.kunci || sedang.has(nomor)) return null
    sedang.add(nomor)
    const w = Number(waktu), dari = Number(jendela.dari) || (Number.isFinite(w) && w > 0 ? w : null)
    const teks = teksTerlewat(dari == null ? null : Math.min(dari, jendela.sampai), jendela.sampai)
    return coba(nomor, teks, ulang)
  }
  return { buka, detak, susulan, state: () => st }
}

// Kiriman berkas draf yang ditolak batas per menit atau antrean slot (429) diulang sesudah jendela menit, paling banyak `ulang` kali.
// Penolakan lain (batas harian, per tujuan, soket tertutup) tidak diulang. kirim() -> {ok, code, error} dari sendPaced.
async function kirimUlangMenit(kirim, { ulang = 3, jeda = 61e3, tidur = (ms) => new Promise((r) => { const t = setTimeout(r, ms); if (t && t.unref) t.unref() }), log = () => {} } = {}) {
  let x
  for (let i = 0; i <= ulang; i++) {
    try { x = await kirim() } catch (e) { return { ok: false, error: String((e && e.message) || e) } }
    if (x && x.ok) return x
    if (!(x && x.code === 429 && /per menit|antrean/.test(String(x.error || '')))) return x || { ok: false }
    if (i < ulang) { log('ditahan', x.error, 'diulang sesudah jendela menit'); await tidur(jeda) }
  }
  return x
}

// Q1 dan D8: pratinjau slide dikirim sebagai pesan gambar berketerangan; PDF dan PPTX sebagai dokumen.
function isiBerkas(p, nama, caption, mimetype, opsi = {}) {
  const mime = String(mimetype || 'application/octet-stream')
  if (/^image\//.test(mime) && !opsi.dokumen) return { image: { url: p }, caption: String(caption || ''), mimetype: mime }
  return { document: { url: p }, fileName: String(nama || path.basename(p)), mimetype: mime, caption: String(caption || '') }
}

// Ulang final bot laporan (BL-12, T10): jalankan() = proyek.ulangFinal(ctx). Tiap `jeda` (10 menit) bila terhubung, dan sekali `awal` (1 menit)
// sesudah buka() (WA tersambung). Tidak pernah tumpang tindih: panggilan saat yang lama masih jalan dilewati. Galat dicatat tanpa nomor utuh.
function buatUlangFinal({ jalankan, terhubung = () => true, log = () => {}, jeda = 10 * 60e3, awal = 60e3, setT = setTimeout, setI = setInterval, clearT = clearTimeout } = {}) {
  let jalan = false, tunda = null, detak = null
  const samar = (s) => String(s).replace(/\d{6,}/g, (x) => x.slice(0, 4) + '***')
  async function sekali() {
    if (jalan || !terhubung()) return 'lewat'
    jalan = true
    try {
      const h = await jalankan()
      if (Array.isArray(h) && h.length) log('[final] ulang', h.map((x) => `${x.id} ${x.status}`).join(', '))
      return 'jalan'
    } catch (e) { log('[final] ulang gagal', samar((e && e.message) || e)); return 'galat' } finally { jalan = false }
  }
  return {
    sekali,
    mulai() { if (!detak) { detak = setI(() => { sekali() }, jeda); if (detak && detak.unref) detak.unref() } },
    buka() { if (tunda) clearT(tunda); tunda = setT(() => { tunda = null; sekali() }, awal); if (tunda && tunda.unref) tunda.unref() },
  }
}

module.exports = { perintahProyek, arah, buatAntre, buatPenunggu, buatTerlewat, buatUlangFinal, teksTerlewat, isiBerkas, pilihJalur, diteruskan, tsMs, kirimUlangMenit }
