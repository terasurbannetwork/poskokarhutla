// Pemicu jarak pandang BMKG: sekali per jam WIB, jam 05-18 WIB. MATI bawaan (env JARAK_PANDANG=1).
// Menjalankan scripts/cuaca/metar.py (Python 3.12 venv ~/.wa-bot/py), membaca public/udara/data/jarak_pandang.json, POST ke ${WORKER_URL}/api/jarak-pandang (Bearer WA_MESIN).
// Hanya kirim bila sumber memuat "BMKG" (NOAA = cadangan, tidak boleh menimpa data BMKG di Worker). Berkas keluaran dikembalikan ke versi git.
// Galat: log + kabar PEMILIK sekali per hari, tidak pernah ke PENERIMA; dicoba lagi tick berikut tanpa kabar ulang.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const { rumah, RUMAH } = createRequire(import.meta.url)('./umum.cjs')
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const KELUARAN = ['public/udara/data/jarak_pandang.json', 'public/banjir/data/cuaca_metar.json']

export const diJendela = (jam) => jam >= 5 && jam < 19

export async function jalankanJarakPandang({ env, now, jam, state, simpan, kering, dep, log, pemilik }) {
  if (env.JARAK_PANDANG !== '1' || !diJendela(jam)) return []
  const w = new Date(now.getTime() + 7 * 3600e3).toISOString()
  const hari = w.slice(0, 10), kunci = w.slice(0, 13) // YYYY-MM-DDTHH (WIB)
  state.jarak_pandang ||= {}; state.gagal ||= {}
  if (state.jarak_pandang[kunci]) return []
  if (kering) return [{ id: 'jarak_pandang', status: 'kering' }]
  const kunciGagal = 'jarak_pandang:' + hari
  const pyBin = rumah(env.WA_PY_BIN) || path.join(RUMAH, 'py', 'bin')
  const opsi = { cwd: REPO, timeout: 5 * 60e3, maxBuffer: 20e6, env: { ...process.env, PATH: pyBin + path.delimiter + (process.env.PATH || '') } }
  try {
    try {
      await dep.exec(path.join(pyBin, 'python3'), ['scripts/cuaca/metar.py'], opsi)
      const isi = (dep.baca || ((p) => fs.readFileSync(p, 'utf8')))(path.join(REPO, KELUARAN[0]))
      const data = JSON.parse(isi)
      if (!String(data.sumber || '').includes('BMKG')) {
        log('jarak pandang: sumber bukan BMKG, tidak dikirim:', data.sumber)
        state.jarak_pandang[kunci] = 'noaa'; simpan()
        return [{ id: 'jarak_pandang', status: 'bukan-bmkg' }]
      }
      const r = await dep.fetch(`${(env.WORKER_URL || '').replace(/\/$/, '')}/api/jarak-pandang`, {
        method: 'POST', headers: { Authorization: `Bearer ${env.WA_MESIN || ''}`, 'Content-Type': 'application/json' },
        body: isi, signal: AbortSignal.timeout(60e3),
      })
      if (!r.ok) throw new Error(`Worker menolak ${r.status}`)
      state.jarak_pandang[kunci] = true; delete state.gagal[kunciGagal]; simpan()
      return [{ id: 'jarak_pandang', status: 'dikirim' }]
    } finally {
      try { await dep.exec('git', ['checkout', '--', ...KELUARAN], { cwd: REPO, timeout: 30e3 }) } catch (e) { log('git checkout keluaran gagal', e.message) }
    }
  } catch (x) {
    const ujung = String(x.stderr || x.message || x).trim().split('\n').filter(Boolean).pop() || ''
    log('GALAT jarak pandang', ujung)
    if (!state.gagal[kunciGagal]) {
      state.gagal[kunciGagal] = true; simpan()
      if (pemilik) try { await dep.kirimTeks(pemilik, `Bot jarak pandang ${kunci} gagal: ${ujung.slice(0, 300)}`) } catch (e) { log('kabar pemilik gagal', e.message) }
    }
    return [{ id: 'jarak_pandang', status: 'galat', alasan: ujung.slice(0, 200) }]
  }
}
