// LP-021: tarik antrean WA modul /petugas (GET /api/petugas/wa/antre), kirim satu per satu lewat
// limiter gateway, lapor berkelompok (POST /api/petugas/wa/hasil). Dipasang di proses gateway.
import { normalWa } from './umum.cjs'

const GALAT_MAKS = 200
// Hasil yang belum berhasil dilapor disimpan di sini; id di dalamnya tidak dikirim ulang.
// ponytail: memori proses saja; gateway restart sebelum lapor = server menarik ulang setelah 10 menit.
export function buat({ worker, kunci, kirim, fetchFn = fetch, log = () => {}, timeoutMs = 15000 }) {
  const tertunda = new Map() // id -> {id, ok, galat?}
  const dilapor = new Set() // id yang sudah sukses dilapor: tidak dikirim ulang
  let jalan = false
  const head = { 'x-wa-kunci': kunci, 'content-type': 'application/json' }
  const panggil = (path, init) => fetchFn(worker + path, { ...init, headers: head, signal: AbortSignal.timeout(timeoutMs) })

  async function lapor() {
    if (!tertunda.size) return
    const hasil = [...tertunda.values()]
    try {
      const r = await panggil('/api/petugas/wa/hasil', { method: 'POST', body: JSON.stringify({ hasil }) })
      if (r.ok) for (const h of hasil) { tertunda.delete(h.id); dilapor.add(h.id); if (dilapor.size > 5000) dilapor.delete(dilapor.values().next().value) }
      else log('[lapangan] lapor ditolak', r.status)
    } catch (e) { log('[lapangan] lapor gagal', String(e?.message || e)) }
  }

  async function putaran() {
    if (jalan) return { lewat: true }
    jalan = true
    let n = 0
    try {
      await lapor() // sisa laporan putaran lalu dulu
      let r
      try { r = await panggil('/api/petugas/wa/antre', { method: 'GET' }) } catch (e) { log('[lapangan] tarik gagal', String(e?.message || e)); return { n } }
      if (!r.ok) { log('[lapangan] tarik ditolak', r.status); return { n } }
      const { pesan = [] } = await r.json().catch(() => ({}))
      for (const p of pesan) {
        if (!p || p.id == null || tertunda.has(p.id) || dilapor.has(p.id)) continue
        const tujuan = normalWa(p.tujuan)
        if (!tujuan || !p.pesan) { tertunda.set(p.id, { id: p.id, ok: false, galat: 'tujuan atau pesan tidak sah' }); continue }
        let k
        try { k = await kirim(tujuan, String(p.pesan)) } catch (e) { k = { ok: false, galat: String(e?.message || e) } }
        if (k.tunda) break // limiter/WA belum siap: jangan lapor, server menarik ulang
        tertunda.set(p.id, k.ok ? { id: p.id, ok: true } : { id: p.id, ok: false, galat: String(k.galat || 'gagal').slice(0, GALAT_MAKS) })
        n++
      }
      await lapor()
      return { n }
    } finally { jalan = false }
  }

  return { putaran, tertunda }
}

export function mulai(opsi, tiapMs = 60000) {
  const t = buat(opsi)
  const id = setInterval(() => t.putaran().catch(() => {}), tiapMs)
  id.unref?.()
  return t
}
