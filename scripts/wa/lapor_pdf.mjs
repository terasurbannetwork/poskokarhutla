// LA-20: antrean PDF Lapor Bencana. Tarik GET /api/lapor/pdf/antre -> [{nomor, versi, bahan}], unduh foto ke folder sementara,
// jalankan scripts/lapor/dokumen.py (docx + pdf lewat LibreOffice), unggah keduanya ke /api/lapor/pdf/:nomor/:versi?jenis=pdf|docx.
// Jalan sekali per panggilan (launchd StartInterval) atau dipanggil putaran() dari proses lain. Tanpa LLM, tanpa kirim WA.
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { muatEnv } from './umum.cjs'

const jalan = promisify(execFile)
const DOKUMEN = path.join(path.dirname(fileURLToPath(import.meta.url)), '../lapor/dokumen.py')
const samar = (s) => String(s ?? '').replace(/\d{6,}/g, (x) => x.slice(0, 4) + '***')
const aman = (s) => String(s).replace(/[^\w.-]/g, '_')

export function buat({ worker, mesin, fetchFn = fetch, log = () => {}, python = 'python3', kerja = os.tmpdir(), skrip = DOKUMEN, timeoutMs = 60000, lo = 180000 } = {}) {
  const base = String(worker || '').replace(/\/$/, '')
  const bearer = { authorization: `Bearer ${mesin || ''}` }
  const sama = (u) => { try { return new URL(u, base + '/').origin === new URL(base).origin } catch { return false } }

  async function satu({ nomor, versi, bahan }) {
    const dir = fs.mkdtempSync(path.join(kerja, 'lapor-pdf-'))
    try {
      const b = { ...bahan, foto: [] }
      for (const [i, f] of (Array.isArray(bahan?.foto) ? bahan.foto : []).entries()) {
        if (!f?.url) continue
        try {
          if (!sama(f.url)) throw new Error('URL bukan origin Worker')
          const r = await fetchFn(new URL(f.url, base + '/'), { headers: bearer, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) })
          if (!r.ok) throw new Error('HTTP ' + r.status)
          const berkas = path.join(dir, `foto-${i}.berkas`)
          fs.writeFileSync(berkas, Buffer.from(await r.arrayBuffer()), { mode: 0o600 })
          const { url, ...sisa } = f
          b.foto.push({ ...sisa, berkas })
        } catch (e) { log('[lapor-pdf] foto dilewati', aman(nomor), samar(e?.message || e)) }
      }
      const masuk = path.join(dir, 'bahan.json'), dasar = path.join(dir, aman(nomor))
      fs.writeFileSync(masuk, JSON.stringify(b), { mode: 0o600 })
      await jalan(python, [skrip, masuk, dasar], { timeout: lo })
      for (const jenis of ['pdf', 'docx']) {
        const r = await fetchFn(`${base}/api/lapor/pdf/${encodeURIComponent(nomor)}/${encodeURIComponent(versi)}?jenis=${jenis}`, {
          method: 'POST', headers: { ...bearer, 'content-type': jenis === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
          body: fs.readFileSync(`${dasar}.${jenis}`), signal: AbortSignal.timeout(timeoutMs),
        })
        if (!r.ok) throw new Error(`unggah ${jenis} HTTP ${r.status}`)
      }
      return true
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  }

  async function putaran() {
    if (!base || !mesin) return { n: 0, mati: true }
    let antre
    try { const r = await fetchFn(base + '/api/lapor/pdf/antre', { headers: bearer, signal: AbortSignal.timeout(20000) }); if (!r.ok) { log('[lapor-pdf] antre HTTP', r.status); return { n: 0 } } const j = await r.json(); antre = Array.isArray(j) ? j : j.antre || [] } catch (e) { log('[lapor-pdf] antre gagal', samar(e?.message || e)); return { n: 0 } }
    let n = 0
    for (const a of antre) {
      if (!a?.nomor || a.versi == null) continue
      try { await satu(a); n++ } catch (e) { log('[lapor-pdf] gagal', aman(a.nomor), samar(String(e?.message || e).slice(0, 200))) } // Worker menarik ulang yang belum terunggah
    }
    return { n }
  }
  return { putaran, satu }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  muatEnv()
  const e = process.env
  buat({ worker: e.WORKER_URL || 'https://centurisk97.id', mesin: e.WA_MESIN, python: e.LAPOR_PY || 'python3', log: (...a) => console.log(new Date().toISOString(), ...a) })
    .putaran().then((r) => console.log(new Date().toISOString(), '[lapor-pdf]', JSON.stringify(r)))
}
