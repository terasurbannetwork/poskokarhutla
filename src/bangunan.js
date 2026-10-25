/* Paparan bangunan (Google Open Buildings): berkas hasil pipeline (scripts/umum/bangunan.py, paparan_bangunan.py) tinggal di R2 MEDIA
   awalan bangunan/ , BUKAN di public/. Hanya pengguna masuk (adminOK) yang boleh membaca; tanpa MEDIA / berkas belum diunggah = 503/404 jelas. */
import {gagal, adminOK} from "./worker.js";

/* kode BPS provinsi (38), sama dengan scripts/geo/batas.py */
export const PROV = new Set("11 12 13 14 15 16 17 18 19 21 31 32 33 34 35 36 51 52 53 61 62 63 64 65 71 72 73 74 75 76 81 82 91 92 93 94 95 96".split(" "));

export async function kirim(env, kunci, belum = "data bangunan belum tersedia (pipeline belum berjalan)") {
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(kunci);
  if (!o) return gagal(404, belum);
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", "x-content-type-options": "nosniff"}});
}

/* auth PERTAMA, sebelum validasi/R2: tamu tak boleh tahu apakah berkas ada */
const jaga = f => async (env, req, url) => await adminOK(env, req) ? f(env, url) : gagal(403, "perlu masuk");

export const RUTE_BANGUNAN = {
  "GET /api/bangunan/terpapar": jaga(env => kirim(env, "bangunan/terpapar.json")),
  "GET /api/bangunan/kec": jaga(env => kirim(env, "bangunan/kec.json")),
  "GET /api/bangunan/grid": jaga((env, url) => {
    const p = url.searchParams.get("prov");
    return PROV.has(p) ? kirim(env, `bangunan/grid_${p}.json`) : gagal(400, "prov harus kode provinsi 2 digit");
  }),
};
