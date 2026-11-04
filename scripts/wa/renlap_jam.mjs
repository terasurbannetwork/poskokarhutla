// Pemicu renlap Operasi Lapangan (spek operasi-lapangan.md bagian 6): malam sesudah 20.00 WIB, pagi sesudah 07.00 WIB (data dipotong jam 07, pemilik 4 Nov 2026), sekali sehari.
// MATI bawaan (env RENLAP=1). Hanya menjalankan renlap.py --kirim-api (Worker menyimpan draf, tampil di layar). TIDAK mengirim ke grup WA (keputusan K2).
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
export const jatuhTempo = (jam) => VERSI.filter((v) => jam >= v.dari && jam < v.sampai)

// `state` = isi state.json (dimutasi), `simpan` menulisnya. Mengembalikan daftar hasil per versi.
export async function jalankanRenlap({ env, now, tanggal, jam, state, simpan, kering, dep, log, pemilik }) {
  if (env.RENLAP !== '1') return []
  state.renlap ||= {}; state.gagal ||= {}
  const hasil = []
  for (const { versi } of jatuhTempo(jam)) {
    const kunci = `${tanggal}:${versi}`
    if (state.renlap[kunci]) continue
    if (kering) { hasil.push({ id: 'renlap:' + versi, status: 'kering' }); continue }
    try {
      const pyBin = rumah(env.WA_PY_BIN) || path.join(RUMAH, 'py', 'bin')
      await dep.exec(path.join(pyBin, 'python3'), ['scripts/operasi/renlap.py', 'buat', '--versi', versi, '--kirim-api'], {
        cwd: REPO, timeout: 5 * 60e3, maxBuffer: 20e6,
        env: { ...process.env, PATH: pyBin + path.delimiter + (process.env.PATH || ''), WORKER: env.WORKER_URL || 'https://centurisk97.id', WA_MESIN: env.WA_MESIN || '' },
      })
      state.renlap[kunci] = true; delete state.gagal['renlap:' + kunci]; simpan()
      hasil.push({ id: 'renlap:' + versi, status: 'dibuat' })
    } catch (x) {
      const ujung = String(x.stderr || x.message || x).trim().split('\n').filter(Boolean).pop() || ''
      log('GALAT renlap', versi, ujung)
      hasil.push({ id: 'renlap:' + versi, status: 'galat', alasan: ujung.slice(0, 200) })
      if (!state.gagal['renlap:' + kunci]) { // sekali per versi per hari; jalan berikut mencoba lagi tanpa kabar
        state.gagal['renlap:' + kunci] = true; simpan()
        if (pemilik) try { await dep.kirimTeks(pemilik, `Bot renlap ${versi} ${tanggal} gagal: ${ujung.slice(0, 300)}`) } catch (e) { log('kabar pemilik gagal', e.message) }
      }
    }
  }
  return hasil
}
