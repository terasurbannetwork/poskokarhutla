// SA-24 Peringatan sebelum subuh (data/kajian-bnpb/semai-awan, K Q17): ringkasan peluang semai dari putaran 22 UTC (05.00 WIB),
// dikirim sekali sehari ke grup Pusdalops. Proses sendiri (launchd 05.15, 05.45, 06.15, 06.45 WIB), TIDAK menyentuh otomatis.mjs.
// MATI bawaan: env PENERIMA_SEMAI kosong. Data dari R2 lewat GET /api/operasi/semai/berkas/semai.json (rute staf; login akun
// pusdalops LOGBOOK_USER/LOGBOOK_SANDI seperti logbook_wa.mjs). Teks memakai fungsi murni layar (public/operasi_semai_murni.js),
// bukan salinan. Tanpa LLM. Galat: log + kabar PEMILIK sekali per hari, tidak pernah ke penerima.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { depBawaan } from './logbook_wa.mjs'

const { muatEnv, daftar, RUMAH } = createRequire(import.meta.url)('./umum.cjs')
const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const mod = await import(pathToFileURL(path.join(AKAR, 'public/operasi_semai_murni.js')).href)
const M = globalThis.OpsSemaiMurni || mod.default

export const BASI_JAM = 9      // prakiraan lebih tua dari ini dianggap putaran sebelumnya (putaran 10 UTC = 12 jam sebelum 22 UTC)
export const SLOT_AKHIR = 6.5  // jam WIB desimal: sesudah ini, data yang masih basi dikabari "belum tersedia" sekali
export const TERATAS = 3
const BATAS = 'Usulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG.'
const wibTgl = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10)
const hariTgl = (ms) => M.hariJam(new Date(ms).toISOString()).split(',')[0]   // 'Kam 26 Nov'

export const umurJam = (data, kini) => (data?.dibuat ? (kini - Date.parse(data.dibuat)) / 3600e3 : null)
export const basi = (data, kini) => { const u = umurJam(data, kini); return u == null || u > BASI_JAM || u < -1 }

export const teksBelumAda = (kini) => `Peluang semai ${hariTgl(kini)}: data putaran pagi belum tersedia. Buka seksi Peluang semai di Operasi Udara untuk melihat putaran terakhir.\n${BATAS}`

// KEAMANAN-PRIVASI §3: teks keluar memakai blok `mitra` (dibulatkan server). Cadangan: rumus semai_murni.bulat_mitra, floor(x/0.5+0.5)*0.5.
const bulat = (x) => Math.floor(x / 0.5 + 0.5) * 0.5
const koordMitra = (x) => { const m = x.mitra || { lat: bulat(x.lat), lon: bulat(x.lon) }; return `${m.lat.toFixed(1)}, ${m.lon.toFixed(1)}` }

// Fungsi murni: semai.json (tujuan karhutla) -> teks WA. Tidak memanggil apa pun.
export function susun(data, kini) {
  const cl = data.cluster || [], zs = (data.zona || []).slice(0, TERATAS), a = data.asap, l = a?.lintas
  const mw = data.api?.frp_mw ?? cl.reduce((t, c) => t + (+c.frp24 || 0), 0)
  const z = (x) => `- ${x.huruf} ${x.prov || 'wilayah belum tercatat'}, sekitar ${koordMitra(x)}, ${M.jendela(x) || 'jendela belum tercatat'}; ketinggian ${M.ketinggianTeks(x)}; bahan ${M.bahanTeks(x)}`
  const out = [`Peluang semai awan, ${hariTgl(kini)}, putaran ${M.putaranTeks(data.putaran)}`,
    `Api: ${M.fmt(data.api?.n_cluster ?? cl.length)} cluster besar, ${M.fmt(mw)} MW`]
  out.push(zs.length ? `Zona usulan teratas:\n${zs.map(z).join('\n')}` : M.kalimatKosong(data.alasan_kosong, data))
  out.push(`Asap: ${M.asapKalimat(data)}`)
  if (l) out.push(`Perlu tindakan: asap ${M.asapKalimat(data)}${l.kota ? `, kota terdekat ${l.kota}` : ''}. Buka seksi Peluang semai di Operasi Udara untuk rincian dan pembahasan.`)
  out.push(BATAS)
  return out.join('\n')
}

const bacaState = (b) => { try { return JSON.parse(fs.readFileSync(b, 'utf8')) } catch { return {} } }

// dep: { api(method, jalur) -> {status,json}, kirimTeks(target, teks), kini }. Mengembalikan {status, teks?}.
export async function jalankan({ env, dep, kering = false, kini = Date.now(), berkas = path.join(RUMAH, 'semai_subuh.json'), log = console.log }) {
  const penerima = daftar(env.PENERIMA_SEMAI)
  if (!penerima.length) return { status: 'mati' }
  const hari = wibTgl(kini), jam = new Date(kini + 7 * 3600e3).getUTCHours() + new Date(kini).getUTCMinutes() / 60
  const st = bacaState(berkas), e = (st[hari] ||= { terkirim: [], selesai: false })
  if (e.selesai) return { status: 'sudah terkirim' }
  const simpan = () => { if (!kering) { for (const k of Object.keys(st)) if (k < wibTgl(kini - 7 * 864e5)) delete st[k]; fs.writeFileSync(berkas, JSON.stringify(st), { mode: 0o600 }) } }
  const galat = async (pesan) => {
    log('GALAT', pesan)
    if (e.galat !== pesan && !kering) { e.galat = pesan; simpan(); const p = daftar(env.PEMILIK)[0]; if (p) try { await dep.kirimTeks(p, `Peringatan sebelum subuh ${hari} gagal: ${pesan.slice(0, 300)}`) } catch (x) { log('kabar pemilik gagal', x.message) } }
    return { status: 'galat', alasan: pesan }
  }
  let teks
  try {
    const r = await dep.api('GET', '/api/operasi/semai/berkas/semai.json')
    if (r.status === 404 || (r.status === 200 && basi(r.json, kini))) {
      if (jam < SLOT_AKHIR) return { status: 'tunggu', alasan: 'putaran pagi belum terbit' }
      teks = teksBelumAda(kini)
    } else if (r.status !== 200) throw new Error('semai.json HTTP ' + r.status)
    else teks = susun(r.json, kini)
  } catch (x) { return await galat(String(x.message || x)) }
  if (kering) { log('[kering] akan kirim ke', penerima.length, 'penerima\n' + teks); return { status: 'kering', teks } }
  try {
    for (const t of penerima) { if (e.terkirim.includes(t)) continue; await dep.kirimTeks(t, teks); e.terkirim.push(t); simpan() }
    e.selesai = true; delete e.galat; simpan()
  } catch (x) { return await galat(String(x.message || x)) }
  return { status: 'terkirim', teks }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  muatEnv()
  const d = depBawaan(process.env)
  const h = await jalankan({ env: process.env, dep: { api: d.api, kirimTeks: d.kirimTeks }, kering: process.argv.includes('--kering') })
  console.log(new Date().toISOString(), 'semai_subuh', h.status, h.alasan || '')
}
