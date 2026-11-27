// Sambungan laporan WA "OMC posko" ke Worker (SB-32 -> SB-33, K8). Bahan tetap mengalir ke jalur laporan; ini tambahan.
// Tidak pernah melempar dan tidak membalas ke WA. Log hanya status, tanpa isi pesan.
import { kenaliOmcPosko, uraiOmcPosko } from './urai_omc_posko.mjs'
import { PROV } from '../../src/lapor_wilayah.js'

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
const KODE = Object.fromEntries(Object.entries(PROV).map(([k, n]) => [norm(n), k]))

export async function kirimOmcPosko(teks, { env = process.env, fetch: f = globalThis.fetch, log = () => {} } = {}) {
  try {
    if (!env.WA_MESIN || !kenaliOmcPosko(teks)) return 'lewat'
    const o = uraiOmcPosko(teks)
    const prov_kode = o.provinsi && KODE[norm(o.provinsi)]
    if (!o.tanggal || !prov_kode) { log('[omc-posko] dilewati: tanggal atau provinsi tak dikenali'); return 'tak_dikenali' }
    const r = await f((env.WORKER_URL || 'https://centurisk97.id') + '/api/operasi/omc-posko', {
      method: 'POST', headers: { authorization: `Bearer ${env.WA_MESIN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ...o, prov_kode }), signal: AbortSignal.timeout(30_000),
    })
    log('[omc-posko] HTTP', r.status, prov_kode, o.tanggal)
    return r.ok ? 'terkirim' : `http_${r.status}`
  } catch (e) { log('[omc-posko] galat', String((e && e.name) || 'galat')); return 'galat' }
}
