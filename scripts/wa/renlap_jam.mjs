// Pemicu renlap Operasi Lapangan (spek operasi-lapangan.md bagian 6): malam sesudah 20.00 WIB, pagi sesudah 07.00 WIB (data dipotong jam 07, pemilik 4 Nov 2026), sekali sehari.
// MATI bawaan (env RENLAP=1). Menjalankan renlap.py --kirim-api (Worker menyimpan draf, tampil di layar), lalu renlap_pdf.py
// (PDF bergambar per base) yang dikirim ke PEMILIK saja. TIDAK mengirim ke grup WA (keputusan K2).
// Galat: log + kabar PEMILIK sekali per versi per hari, tidak pernah ke PENERIMA.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const { rumah, RUMAH } = createRequire(import.meta.url)('./umum.cjs')
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Jendela per versi (jam WIB desimal). Pagi dibatasi sebelum 12.00: lewat itu versi pagi sudah basi, jalan berikut tidak mengejarnya.
export const VERSI = [
  { versi: 'malam', dari: 20, sampai: 24 },
  { versi: 'pagi', dari: 7, sampai: 12 },
]
// PDF yang dikirim dari keluaran renlap_pdf.py: baris "GABUNGAN ... -> <jalur>.pdf" saja (satu pesan; gateway membatasi
// 8 pesan per nomor per hari), atau PDF tunggal bila hanya satu base bertarget.
export const pdfDari = (stdout) => {
  const baris = String(stdout || '').split('\n').map((l) => [l.startsWith('GABUNGAN'), l.match(/ -> (.+\.pdf)$/)?.[1]]).filter((x) => x[1])
  const gab = baris.filter((x) => x[0]).map((x) => x[1])
  return gab.length ? gab : baris.map((x) => x[1]).slice(0, 1)
}
export const jatuhTempo = (jam) => VERSI.filter((v) => jam >= v.dari && jam < v.sampai)

// `state` = isi state.json (dimutasi), `simpan` menulisnya. Mengembalikan daftar hasil per versi.
export async function jalankanRenlap({ env, now, tanggal, jam, state, simpan, kering, dep, log, pemilik, dasar = RUMAH }) {
  if (env.RENLAP !== '1') return []
  state.renlap ||= {}; state.gagal ||= {}
  const hasil = []
  for (const { versi } of jatuhTempo(jam)) {
    const kunci = `${tanggal}:${versi}`
    if (state.renlap[kunci + ':pdf']) continue
    if (kering) { hasil.push({ id: 'renlap:' + versi, status: 'kering' }); continue }
    const pyBin = rumah(env.WA_PY_BIN) || path.join(RUMAH, 'py', 'bin')
    const o = { cwd: REPO, timeout: 5 * 60e3, maxBuffer: 20e6,
      env: { ...process.env, PATH: pyBin + path.delimiter + (process.env.PATH || ''), WORKER: env.WORKER_URL || 'https://centurisk97.id', WA_MESIN: env.WA_MESIN || '' } }
    const py = path.join(pyBin, 'python3')
    const langkah = [
      ['renlap:' + versi, kunci, () => dep.exec(py, ['scripts/operasi/renlap.py', 'buat', '--versi', versi, '--kirim-api'], o)],
      // PDF menyusul draf: gagal PDF tidak membatalkan draf, dicoba lagi tick berikut dengan kunci sendiri.
      // Ditulis di <rumah>/keluaran: gateway hanya mau mengirim berkas dari sana.
      ['renlap-pdf:' + versi, kunci + ':pdf', async () => {
        const r = await dep.exec(py, ['scripts/operasi/renlap_pdf.py', 'buat', '--versi', versi, '--out', path.join(dasar, 'keluaran', tanggal, 'renlap-' + versi)], { ...o, timeout: 15 * 60e3 })
        const pdf = pdfDari(r?.stdout)
        if (!pdf.length) throw new Error('renlap_pdf tidak menghasilkan PDF')
        if (pemilik) for (const p of pdf) await dep.kirimFile(pemilik, p, path.basename(p), `Renlap ${versi} ${tanggal}, semua base. PDF per base ada di ${path.dirname(p)}`, 'application/pdf')
      }],
    ]
    for (const [id, k, jalan] of langkah) {
      if (state.renlap[k]) continue
      try {
        await jalan()
        state.renlap[k] = true; delete state.gagal['renlap:' + k]; simpan()
        hasil.push({ id, status: 'dibuat' })
      } catch (x) {
        const ujung = String(x.stderr || x.message || x).trim().split('\n').filter(Boolean).pop() || ''
        log('GALAT', id, ujung)
        hasil.push({ id, status: 'galat', alasan: ujung.slice(0, 200) })
        if (!state.gagal['renlap:' + k]) { // sekali per langkah per hari; jalan berikut mencoba lagi tanpa kabar
          state.gagal['renlap:' + k] = true; simpan()
          if (pemilik) try { await dep.kirimTeks(pemilik, `Bot ${id} ${tanggal} gagal: ${ujung.slice(0, 300)}`) } catch (e) { log('kabar pemilik gagal', e.message) }
        }
        break // PDF butuh JSON renlap hari ini
      }
    }
  }
  return hasil
}
