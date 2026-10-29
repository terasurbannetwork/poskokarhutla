// Peringatan dini hujan lebat per kabupaten H+1..H+3 dari peluang.json (kontrak peluang/1, scripts/banjir/peluang_banjir.py).
// Peluang kabupaten = MAKSIMUM atas titik 1 derajat, ditulis apa adanya. Tanpa LLM.
// Ambang: peluang hujan harian 50 mm atau lebih >= 10% (batas yang sama dengan status.py layak(), di bawahnya "kemungkinan kecil");
// kata peluang dari scripts/umum/peluang.py KATA. Bukan status banjir: itu urusan Waspada/Siaga/Awas di situs.
// Penerima: env PENERIMA_PERINGATAN_BANJIR (kosong = MATI).
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const KATA = [[0.10, 'kemungkinan kecil'], [0.40, 'mungkin'], [0.70, 'cukup mungkin'], [1.01, 'kemungkinan besar']]
export const AMBANG = 0.10
export const TOP = 5

const geser = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10)
const tglId = (d) => { const x = new Date(d + 'T00:00:00Z'); return `${HARI[x.getUTCDay()]}, ${x.getUTCDate()} ${BULAN[x.getUTCMonth()]} ${x.getUTCFullYear()}` }
const pct = (p) => `${Math.round(p * 100).toLocaleString('id-ID')}%`
const kata = (p) => KATA.find(([b]) => p < b)[1]

// -> null bila tak ada kabupaten di atas ambang pada ketiga hari.
export function susun(peluang, tanggal, { top = TOP, ambang = AMBANG } = {}) {
  const kab = Object.values(peluang.wilayah || {}).filter((w) => w.tingkat === 'kabupaten')
  const blok = []
  for (let n = 1; n <= 3; n++) {
    const t = geser(tanggal, n)
    const baris = kab.map((w) => { const h = (w.hari || []).find((x) => x.t === t); return h && h.p && h.p[0] != null ? { nama: w.nama, a: h.p[0], b: h.p[1] } : null })
      .filter((x) => x && x.a >= ambang).sort((x, y) => y.a - x.a || (y.b || 0) - (x.b || 0) || x.nama.localeCompare(y.nama))
    blok.push({ t, n: baris.length, baris: baris.slice(0, top) })
  }
  if (!blok.some((b) => b.n)) return null
  const dibuat = String(peluang.dibuat || '').slice(0, 10)
  const isi = blok.map((b) => `${tglId(b.t)}\n` + (b.n ? b.baris.map((x) => `- ${x.nama}: ${pct(x.a)} hujan 50 mm atau lebih (${kata(x.a)})` + (x.b >= ambang ? `, ${pct(x.b)} hujan 100 mm atau lebih` : '')).join('\n') + (b.n > b.baris.length ? `\n(${b.n - b.baris.length} kabupaten lain di atas ambang)` : '') : '- tidak ada kabupaten dengan peluang 10% atau lebih'))
  return [`Peringatan dini hujan lebat per kabupaten, ${tglId(tanggal)}`, '', ...isi.flatMap((s) => [s, '']),
    `Peluang kabupaten adalah nilai tertinggi dari titik prakiraan (kotak 1 derajat) di wilayahnya, bukan peluang di seluruh kabupaten. Hanya kabupaten dengan peluang 10% atau lebih yang ditulis. Ini peluang hujan, bukan status banjir.`,
    `Sumber: ECMWF IFS ansambel ${peluang.anggota || 51} anggota lewat Open-Meteo, dibuat ${tglId(dibuat).replace(/^\w+, /, "")}, pengolahan Pantau Bencana (centurisk97.id/banjir).`].join('\n')
}

// Kirim sekali per tanggal ke tiap penerima. Mengembalikan status untuk log/hasil.
export async function peringatanBanjir({ env, dep, tanggal, state, simpan, kering, log, galat, jamWib }) {
  const penerima = String(env.PENERIMA_PERINGATAN_BANJIR || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!penerima.length) return { id: 'peringatan_banjir', status: 'mati' }
  if (jamWib < 7) return { id: 'peringatan_banjir', status: 'tunggu', alasan: 'belum 07.00 WIB' }
  const kunci = `peringatan_banjir:${tanggal}`
  const e = (state.laporan[kunci] ||= { terkirim: [], selesai: false })
  if (e.selesai) return { id: 'peringatan_banjir', status: 'sudah terkirim' }
  let p
  try {
    const r = await dep.fetch(`${env.SITUS_BANJIR || env.WORKER_URL || 'https://centurisk97.id'}/banjir/data/peluang.json`)
    if (!r.ok) throw new Error('HTTP ' + r.status)
    p = await r.json()
  } catch (x) { await galat(kunci, `Gagal membaca peluang.json: ${x.message}`); return { id: 'peringatan_banjir', status: 'galat' } }
  const dibuatWib = new Date(Date.parse(p.dibuat) + 7 * 3600e3).toISOString().slice(0, 10)
  if (p.versi !== 'peluang/1' || dibuatWib !== tanggal) { log('peringatan_banjir tunggu: peluang.json dibuat', p.dibuat); return { id: 'peringatan_banjir', status: 'tunggu', alasan: `peluang.json dibuat ${dibuatWib}` } }
  const teks = susun(p, tanggal)
  if (!teks) { if (!kering) { e.selesai = true; simpan() } return { id: 'peringatan_banjir', status: 'tidak ada peringatan' } }
  try {
    for (const t of penerima) {
      if (e.terkirim.includes(t)) continue
      if (kering) { log('[kering] akan kirim peringatan banjir ke', t.replace(/\d(?=\d{4})/g, '*'), '\n' + teks); continue }
      await dep.kirimTeks(t, teks); e.terkirim.push(t); simpan()
    }
    if (!kering) { e.selesai = true; delete state.gagal[kunci]; simpan() }
  } catch (x) { await galat(kunci, x.message); return { id: 'peringatan_banjir', status: 'galat', alasan: x.message } }
  return { id: 'peringatan_banjir', status: kering ? 'kering' : 'terkirim', teks }
}
