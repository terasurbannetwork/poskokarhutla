// G5: laporan BPBD di grup WA -> draf entri logbook baku (ber-KIB) -> staf piket konfirmasi -> POST ke logbook.
// Tanpa LLM. Pengurai = scripts/wa/urai_laporan.py (memakai ulang scripts/data/logbook_pusdalops.py). Dunia luar disuntik lewat `dep`.
//   grup BPBD (LOGBOOK_GRUP)  : tiap pesan teks -> draf -> ringkasan ke LOGBOOK_STAF
//   staf piket (LOGBOOK_STAF) : "OK <kode>" [yakin] | "BATAL <kode>" | "KOREKSI <kode>" + baris medan=nilai | "DRAF"
// Nama orang dan nomor HP disaring SEBELUM draf disimpan/dikirim/di-POST (RE_HP2 dari src/logbook.js).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import '../../src/worker.js' // urutan wajib: logbook.js dan worker.js saling impor, mulai dari worker.js
import { periksaEntri, RE_HP2, JENIS } from '../../src/logbook.js'

const { normalWa, daftar, RUMAH } = createRequire(import.meta.url)('./umum.cjs')
const AKAR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const HARI = 864e5
const ANGKA = { md: 'meninggal', hilang: 'hilang', luka: 'luka', mengungsi_jiwa: 'mengungsi jiwa', mengungsi_kk: 'mengungsi KK', rumah_rb: 'rumah rusak berat',
  rumah_rs: 'rumah rusak sedang', rumah_rr: 'rumah rusak ringan', rumah_terendam: 'rumah terendam', luas_ha: 'luas ha' }
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// ---------------------------------------------------------------- saring HP dan nama
const TGL_JAM = /\d{4}-\d\d-\d\d|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[.:]\d{2}/g
const GELAR = '(?:Bapak|Bpk|Pak|Ibu|Bu|Sdr|Sdri|Saudara|Saudari|Hj|Kapten|Kapt|Letkol|Mayor|Serka|Serda|Kopda|Praka|Kompol|AKP|Iptu|Aiptu|Bripka|Brigadir|dr|drg)'
const NAMA = `[A-Z][A-Za-z'’]+`
const RE_NAMA = [
  new RegExp(`\\b${GELAR}\\.?\\s+${NAMA}(?:\\s+${NAMA}){0,3}`, 'g'),
  new RegExp(`\\b(?:atas nama|a\\.n\\.?|an\\.)\\s+${NAMA}(?:\\s+${NAMA}){0,3}`, 'gi'),
]
const RE_BARIS_KONTAK = /^[ \t]*(?:pelapor|narahubung|kontak|contact|cp|pj|penanggung jawab|dilaporkan oleh|nama)\b[^\n]*$/gim
const RE_HP_TEGAS = /(?:\+?62|\b0)[\s-]?8\d[\d\s.-]{6,}\d|\(?\b0\d{2,3}\)?[\s-]?\d{5,8}\b/g

// ponytail: pola gelar + huruf kapital, bukan NER; nama tanpa gelar lolos. Staf melihat catatan di ringkasan sebelum OK. Naikkan bila staf sering mengoreksi.
export function saring(t) {
  let s = String(t || '').normalize('NFKC').replace(RE_BARIS_KONTAK, '[kontak dihapus]').replace(RE_HP_TEGAS, '[nomor]')
  const simpan = []
  s = s.replace(TGL_JAM, (m) => `\u0001${simpan.push(m) - 1}\u0001`)   // tanggal/jam jangan ikut dianggap nomor
  s = s.replace(new RegExp(RE_HP2.source, 'g'), '[nomor]').replace(/\u0001(\d+)\u0001/g, (_, i) => simpan[i])
  s = s.replace(/\S+@\S+/g, '[surel]')
  for (const re of RE_NAMA) s = s.replace(re, '[nama]')
  return s
}

// ---------------------------------------------------------------- wilayah, KIB
const norm = (x) => String(x || '').toLowerCase().replace(/\bkabupaten\b|\bkab\.?\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
export function cariKab(namaUrai, provKode, kab) {
  if (!namaUrai) return null
  const kota = /^kota\b/i.test(namaUrai), n = norm(namaUrai.replace(/^kota( administrasi)?\b\.?/i, ''))
  const ada = kab.filter((k) => (!provKode || k.prov === provKode) && (
    kota ? /^kota\b/i.test(k.nama) && norm(k.nama.replace(/^kota( administrasi)?\b/i, '')) === n : !/^kota\b/i.test(k.nama) && norm(k.nama) === n))
  return ada.length === 1 ? ada[0] : null
}
const cariNama = (teks, kab) => { // koreksi staf: "Kota Padang", "Garut", "32|Garut"
  const [p, nm] = teks.includes('|') ? teks.split('|') : [null, teks]
  return cariKab(nm.trim(), p, kab)
}
export const kunciKab = (k) => `${k.prov}|${k.nama}`

// ---------------------------------------------------------------- draf
export function buatDraf({ teks, waktu, urai, kab }) {
  const i = urai.isian, k = cariKab(i.kab, urai.prov_kode, kab)
  const sk = {}
  const d = { jenis: JENIS.includes(i.jenis) ? i.jenis : null, kab_kode: k && kunciKab(k), kab_bps: k?.kode || null, kab_nama: k?.nama || null,
    kec: i.kec || null, desa: i.desa || null, mulai: i.mulai || null }
  sk.jenis = d.jenis ? (urai.resmi?.kode_dibi ? 0.9 : 0.7) : 0
  sk.kab = k ? 0.95 : 0
  sk.kec = d.kec ? 0.7 : 0; sk.desa = d.desa ? 0.7 : 0
  sk.mulai = !d.mulai ? 0.3 : d.mulai.includes('T') ? 0.9 : 0.7
  if (!d.mulai) d.mulai = new Date(waktu).toISOString().slice(0, 16)   // jatuh ke waktu pesan, ditandai skor rendah
  for (const m of Object.keys(ANGKA)) { d[m] = i[m] ?? null; if (d[m] != null) sk[m] = 0.8 }
  d.kendala = i.kendala || []; d.kebutuhan = i.kebutuhan || []
  sk.kendala = d.kendala.length ? 0.6 : 0; sk.kebutuhan = d.kebutuhan.length ? 0.6 : 0
  d.catatan = saring(i.catatan).slice(0, 1000) || null
  const src = saring(i.sumber_instansi || '').trim()
  d.sumber_instansi = (src || (k ? `BPBD ${k.nama}` : '')).slice(0, 80) || null
  sk.sumber = src ? 0.9 : 0.5
  d.skor = sk
  d.kosong = ['jenis', 'kab_kode'].filter((m) => !d[m])
  return d
}
const mulaiIso = (m) => new Date(/T/.test(m) ? m + '+07:00' : m + 'T00:00:00+07:00').toISOString()
export function badanEntri(d, waktu, yakin = false) {
  const b = { waktu, kab_bps: d.kab_bps || undefined, kendala: d.kendala, kebutuhan: d.kebutuhan, catatan: d.catatan, sumber_instansi: d.sumber_instansi, ...(yakin ? { yakin: true } : {}) }
  for (const m of Object.keys(ANGKA)) b[m] = d[m]
  return b
}
export const badanKejadian = (d, waktu, yakin) => ({ jenis: d.jenis, kab_kode: d.kab_kode, kab_bps: d.kab_bps || undefined, kec: d.kec, desa: d.desa,
  mulai: mulaiIso(d.mulai), ...badanEntri(d, waktu, yakin) })
// kejadian terbuka: kab sama (daftar sudah per kab dari /api/logbook/buka) + jenis sama + entri terakhir <= 3 hari
export const cocok = (d, kejadian, kini) => (kejadian || []).filter((k) => k.jenis === d.jenis && kini - k.terakhir <= 3 * HARI).sort((a, b) => b.terakhir - a.terakhir)[0] || null

// ---------------------------------------------------------------- teks ke/dari staf
const tgl = (m) => { const t = new Date(Date.parse(/T/.test(m) ? m + '+07:00' : m + 'T00:00:00+07:00') + 7 * 36e5); return `${t.getUTCDate()} ${BLN[t.getUTCMonth()]} ${t.getUTCFullYear()}${/T/.test(m) ? ` ${m.slice(11, 16).replace(':', '.')} WIB` : ''}` }
const pct = (v) => `${Math.round((v || 0) * 100)}%`
export function ringkas(d, kode, kej, galat) {
  const L = [`DRAF LOGBOOK ${kode}`, `Jenis: ${d.jenis || '?'} (${pct(d.skor.jenis)})`,
    `Lokasi: ${[d.kab_nama || '?', d.kec && 'Kec. ' + d.kec, d.desa && 'Desa ' + d.desa].filter(Boolean).join(', ')} (${pct(d.skor.kab)})`,
    `Mulai: ${tgl(d.mulai)} (${pct(d.skor.mulai)})`]
  const dam = Object.entries(ANGKA).filter(([m]) => d[m] != null).map(([m, n]) => `${n} ${d[m]}`)
  L.push(`Dampak: ${dam.join(', ') || 'tidak dilaporkan'}`, `Kendala: ${d.kendala.join(', ') || '-'}`, `Kebutuhan: ${d.kebutuhan.join(', ') || '-'}`,
    `Sumber: ${d.sumber_instansi || '?'} (${pct(d.skor.sumber)})`, `Catatan: ${(d.catatan || '-').slice(0, 300)}`)
  L.push(kej ? `Tindak: entri lanjutan ke kejadian ${kej.id}${kej.kib ? ` (KIB ${kej.kib})` : ''}` : `Tindak: kejadian baru${d.kab_bps && d.jenis ? ' (KIB dibuat server)' : ''}`)
  const rendah = Object.entries(d.skor).filter(([, v]) => v > 0 && v < 0.6).map(([m]) => m)
  if (d.kosong.length) L.push(`WAJIB dilengkapi: ${d.kosong.join(', ')}`)
  if (rendah.length) L.push(`Periksa (yakin rendah): ${rendah.join(', ')}`)
  if (galat) L.push(`Server menolak draf ini: ${galat}`)
  L.push(`Balas: OK ${kode} | BATAL ${kode} | KOREKSI ${kode} lalu baris medan=nilai (jenis, kab, kec, desa, mulai, md, hilang, luka, mengungsi_jiwa, mengungsi_kk, rumah_rb, rumah_rs, rumah_rr, rumah_terendam, luas_ha, kendala, kebutuhan, sumber, catatan)`)
  return L.join('\n')
}
export function parseBalasan(teks) {
  const [baris0, ...sisa] = String(teks || '').trim().split('\n')
  const m = /^(ok|batal|koreksi)\s+([a-z0-9]{4,8})\b\s*(.*)$/i.exec(baris0.trim())
  if (m) {
    const aksi = m[1].toLowerCase(), baris = [m[3], ...sisa].map((x) => x.trim()).filter(Boolean)
    return { aksi, kode: m[2].toLowerCase(), yakin: aksi === 'ok' && /\byakin\b/i.test(m[3]), medan: aksi === 'koreksi' ? baris : [] }
  }
  return /^draf\s*$/i.test(baris0.trim()) ? { aksi: 'daftar' } : null
}
const LIST = (v) => v.split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean)
export function terapKoreksi(d, baris, kab) {
  const n = { ...d, skor: { ...d.skor } }, galat = []
  for (const b of baris) {
    const [, k, v = ''] = /^([a-z_]+)\s*=\s*(.*)$/i.exec(b) || []
    if (!k) { galat.push(`baris tidak dikenal: ${b.slice(0, 40)}`); continue }
    const key = k.toLowerCase()
    if (key === 'jenis') { if (!JENIS.includes(v.trim())) galat.push(`jenis harus salah satu: ${JENIS.join(', ')}`); else { n.jenis = v.trim(); n.skor.jenis = 1 } }
    else if (key === 'kab') { const w = cariNama(v, kab); if (!w) galat.push(`kab tidak ditemukan: ${v} (tulis "Kota Padang" atau "Garut", boleh "32|Garut")`); else Object.assign(n, { kab_kode: kunciKab(w), kab_bps: w.kode, kab_nama: w.nama }, { skor: { ...n.skor, kab: 1 } }) }
    else if (key === 'kec' || key === 'desa') { n[key] = saring(v).slice(0, 60) || null; n.skor[key] = 1 }
    else if (key === 'mulai') { if (!/^\d{4}-\d\d-\d\d([ T]\d\d[:.]\d\d)?$/.test(v.trim())) galat.push('mulai harus YYYY-MM-DD atau YYYY-MM-DD HH:MM'); else { const m = v.trim().replace(' ', 'T').replace('.', ':'); if (Number.isNaN(Date.parse(m.length > 10 ? m + '+07:00' : m))) galat.push('mulai bukan tanggal sah'); else { n.mulai = m; n.skor.mulai = 1 } } }
    else if (Object.hasOwn(ANGKA, key)) { const t = v.trim(), x = t === '-' || t === '' ? null : Number(t.replace(',', '.')); if (x !== null && !/^\d+([.,]\d+)?$/.test(t)) galat.push(`${key} harus angka >= 0`); else { n[key] = x; n.skor[key] = 1 } }
    else if (key === 'kendala' || key === 'kebutuhan') { n[key] = LIST(v); n.skor[key] = 1 }
    else if (key === 'sumber') { n.sumber_instansi = saring(v).slice(0, 80) || null; n.skor.sumber = 1 }
    else if (key === 'catatan') n.catatan = saring(v).slice(0, 1000) || null
    else galat.push(`medan tidak dikenal: ${key}`)
  }
  n.kosong = ['jenis', 'kab_kode'].filter((m) => !n[m])
  return { draf: n, galat }
}

// LOGBOOK_STAF = nomor perorangan saja (JID grup ditolak: siapa pun anggota grup bisa membalas OK). Kosong/bermasalah = fitur mati.
export function nomorStaf(env = process.env) {
  const d = daftar(env.LOGBOOK_STAF)
  if (d.some((x) => x.includes('@'))) { if (!nomorStaf.peringatan) { nomorStaf.peringatan = true; console.warn('[logbook] LOGBOOK_STAF harus nomor perorangan, bukan JID/grup; fitur logbook mati') } return new Set() }
  return new Set(d.map(normalWa).filter(Boolean))
}
// Arah pesan masuk: 'grup' = diurai TAPI tetap mengalir ke jalur bahan laporan; 'staf' = balasan OK/BATAL/KOREKSI/DRAF DARI nomor staf, dicegat penuh; null = bukan urusan logbook.
export function arah(jid, dari, teks, env = process.env) {
  const staf = nomorStaf(env)
  if (!env.LOGBOOK_GRUP || !staf.size) return null
  if (daftar(env.LOGBOOK_GRUP).includes(jid)) return 'grup'
  return parseBalasan(teks) && staf.has(normalWa(dari)) ? 'staf' : null
}

// ---------------------------------------------------------------- state
const BERKAS = (rumah) => path.join(rumah, 'logbook.json')
function muat(rumah) { try { return JSON.parse(fs.readFileSync(BERKAS(rumah), 'utf8')) } catch { return { draf: {}, terlihat: [] } } }
function simpan(rumah, st, kini) {
  for (const [k, v] of Object.entries(st.draf)) if (kini - v.dibuat > 3 * HARI) delete st.draf[k]
  st.terlihat = st.terlihat.slice(-500)
  fs.mkdirSync(rumah, { recursive: true, mode: 0o700 })
  const tmp = BERKAS(rumah) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(st), { mode: 0o600 }); fs.renameSync(tmp, BERKAS(rumah))
}

// ---------------------------------------------------------------- orkestrasi
// pesan = {id, jid, dari, teks, waktu(ms)}. Diserialkan satu rantai (state berkas + OK ganda aman) sekaligus membatasi urai ke 1 proses python.
let rantai = Promise.resolve()
export function masuk(pesan, o) { const h = rantai.then(() => masukSerial(pesan, o)); rantai = h.catch(() => {}); return h }
const MAKS_DRAF = 50
async function masukSerial(pesan, { env = process.env, dep, rumah = RUMAH, kini = Date.now() } = {}) {
  const grup = new Set(daftar(env.LOGBOOK_GRUP)), staf = nomorStaf(env)
  if (!staf.size) return 'mati'
  const dariStaf = staf.has(normalWa(pesan.dari))
  const kirim = (t) => Promise.all([...staf].map((s) => dep.kirimTeks(s + '@s.whatsapp.net', t)))
  const st = muat(rumah)
  if (dariStaf && parseBalasan(pesan.teks)) {
    const b = parseBalasan(pesan.teks)
    if (b.aksi === 'daftar') { await kirim(Object.keys(st.draf).length ? 'Draf menunggu: ' + Object.entries(st.draf).map(([k, v]) => `${k} (${v.draf.kab_nama || '?'} ${v.draf.jenis || '?'})`).join(', ') : 'Tidak ada draf menunggu.'); return 'daftar' }
    const e = st.draf[b.kode]
    if (!e) { await kirim(`Kode ${b.kode} tidak ada, sudah terpakai, atau kedaluwarsa (3 hari).`); return 'tak-ada' }
    if (b.aksi === 'batal') { delete st.draf[b.kode]; simpan(rumah, st, kini); await kirim(`Draf ${b.kode} dibatalkan.`); return 'batal' }
    try {
      if (b.aksi === 'koreksi') {
        const r = terapKoreksi(e.draf, b.medan, dep.kab)
        if (r.galat.length) { await kirim(`Koreksi ${b.kode} ditolak: ${r.galat.join('; ')}`); return 'koreksi-galat' }
        e.draf = r.draf; simpan(rumah, st, kini)
        await kirim(ringkas(e.draf, b.kode, await cariKejadian(e.draf, dep, kini))); return 'koreksi'
      }
      // OK
      if (e.draf.kosong.length) { await kirim(`Draf ${b.kode} belum lengkap: ${e.draf.kosong.join(', ')}. Pakai KOREKSI.`); return 'belum-lengkap' }
      const kej = await cariKejadian(e.draf, dep, kini)
      const body = kej ? badanEntri(e.draf, e.waktu, b.yakin) : badanKejadian(e.draf, e.waktu, b.yakin)
      const p = periksaEntri(body, kini); if (p.galat) { await kirim(ringkas(e.draf, b.kode, kej, p.galat) + (p.wajar ? `\nAngka memang benar? Balas: OK ${b.kode} YAKIN` : '')); return 'ditolak-lokal' }
      delete st.draf[b.kode]; simpan(rumah, st, kini)   // dihapus SEBELUM POST: OK ganda tidak membuat entri ganda
      let r
      try { r = await dep.api('POST', kej ? `/api/logbook/kejadian/${kej.id}/entri` : '/api/logbook/kejadian', body) }
      catch (x) { r = { status: 0, json: { galat: String(x?.message || x) } } }
      if (r.status >= 200 && r.status < 300) { await kirim(`Draf ${b.kode} masuk logbook${kej ? ` sebagai entri lanjutan (kejadian ${kej.id})` : ' sebagai kejadian baru'}${r.json?.kejadian?.kib ? `, KIB ${r.json.kejadian.kib}` : ''}.`); return kej ? 'entri' : 'kejadian' }
      const st2 = muat(rumah); st2.draf[b.kode] = e; simpan(rumah, st2, kini)   // gagal: draf kembali supaya bisa diulang
      await kirim(`Draf ${b.kode} gagal masuk logbook: HTTP ${r.status} ${String(r.json?.galat || '').slice(0, 200)}${r.json?.wajar ? `\nAngka memang benar? Balas: OK ${b.kode} YAKIN` : ''}`)
      return 'gagal-post'
    } catch (x) { await kirim(`Draf ${b.kode} gagal diproses: ${String(x?.message || x).slice(0, 200)}`).catch(() => {}); return 'galat' }
  }
  if (!grup.has(pesan.jid)) return 'abaikan'
  const izin = daftar(env.WA_IZIN).map(normalWa)
  if (izin.length && !izin.includes(normalWa(pesan.dari))) return 'bukan-izin'
  if (st.terlihat.includes(pesan.id)) return 'ulang'
  st.terlihat.push(pesan.id)
  const teks = String(pesan.teks || '').trim()
  if (teks.length < 40) { simpan(rumah, st, kini); return 'pendek' }
  if (Object.keys(st.draf).length >= MAKS_DRAF) { simpan(rumah, st, kini); return 'penuh' }
  const urai = await dep.urai(saring(teks).replace(/\[(?:nomor|nama|surel|kontak dihapus)\]/g, ''))
  if (!urai.isian.jenis) { simpan(rumah, st, kini); return 'bukan-laporan' }
  const d = buatDraf({ teks, waktu: pesan.waktu, urai, kab: dep.kab })
  const kode = crypto.randomBytes(3).toString('hex')
  st.draf[kode] = { draf: d, waktu: pesan.waktu, dibuat: kini }
  simpan(rumah, st, kini)
  await kirim(ringkas(d, kode, await cariKejadian(d, dep, kini)))
  return 'draf'
}
async function cariKejadian(d, dep, kini) {
  if (!d.kab_kode || !d.jenis) return null
  const r = await dep.api('GET', '/api/logbook/buka?kab=' + encodeURIComponent(d.kab_kode))
  return r.status === 200 ? cocok(d, r.json?.kejadian, kini) : null
}

// ---------------------------------------------------------------- dunia luar
export const kepalaApi = (host, kuki, json) => ({ origin: new URL(host).origin, ...(kuki ? { cookie: kuki } : {}), ...(json ? { 'content-type': 'application/json' } : {}) })   // tolakOrigin (src/worker.js) menolak POST bersesi tanpa Origin sama-host
export function depBawaan(env = process.env) {
  const gateway = `http://127.0.0.1:${env.PORT || 3101}`, host = env.WORKER_URL || 'https://centurisk97.id'
  const u = new URL(host)
  if (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname)) throw new Error('WORKER_URL harus https:// (sandi staf dikirim ke sana)')
  let kuki = null, tahanSampai = 0
  const masukStaf = async () => {   // sandi akun staf (peran pusdalops) dari .env; cookie sesi_staf di memori
    if (Date.now() < tahanSampai) throw new Error('login staf ditahan 15 menit sesudah ditolak (hindari kunci akun)')
    const r = await fetch(host + '/api/staf/masuk', { method: 'POST', headers: kepalaApi(host, null, true), body: JSON.stringify({ username: env.LOGBOOK_USER, sandi: env.LOGBOOK_SANDI }) })
    kuki = r.ok ? (r.headers.get('set-cookie') || '').split(';')[0] : null
    if (!kuki) { if (r.status === 401) tahanSampai = Date.now() + 15 * 60e3; throw new Error('login staf logbook gagal: HTTP ' + r.status) }
  }
  const api = async (method, jalur, body) => {
    for (let i = 0; i < 2; i++) {
      if (!kuki) await masukStaf()
      const r = await fetch(host + jalur, { method, headers: kepalaApi(host, kuki, body), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) })
      if (r.status === 401 && i === 0) { kuki = null; continue }   // sesi kedaluwarsa: satu login ulang; 403 = ditolak sungguhan, bukan alasan login ulang
      return { status: r.status, json: await r.json().catch(() => ({})) }
    }
    return { status: 401, json: { galat: 'sesi staf ditolak' } }
  }
  const py = fs.existsSync(path.join(env.WA_PY_BIN || path.join(RUMAH, 'py', 'bin'), 'python3')) ? path.join(env.WA_PY_BIN || path.join(RUMAH, 'py', 'bin'), 'python3') : 'python3'
  const urai = (teks) => new Promise((ok, tidak) => {
    const p = execFile(py, [path.join(AKAR, 'scripts', 'wa', 'urai_laporan.py')], { timeout: 30000, maxBuffer: 1 << 22 }, (e, out) => (e ? tidak(e) : ok(JSON.parse(out))))
    p.stdin.end(teks)
  })
  const kab = JSON.parse(fs.readFileSync(path.join(AKAR, 'public', 'data', 'bnpb', 'wilayah.json'), 'utf8')).kab
  const tidur = (ms) => new Promise((r) => setTimeout(r, ms))
  const kirimTeks = async (target, message) => {
    for (let i = 0; i < 6; i++) {
      const r = await fetch(gateway + '/send', { method: 'POST', headers: { 'content-type': 'application/json', authorization: env.GATEWAY_TOKEN || '' }, body: JSON.stringify({ target, message }) })
      if (r.ok) return
      if (![429, 503].includes(r.status) || i === 5) throw new Error(`gateway /send HTTP ${r.status}`)
      await tidur(25000)
    }
  }
  return { api, urai, kab, kirimTeks }
}
