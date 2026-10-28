/* Direktori pakar kebencanaan /akademisi (docs/bnpb/RENCANA-AKADEMISI.md). Keputusan pemilik 28 Okt 2026: HANYA staf BNPB dan admin.
   Data pribadi ribuan dosen TIDAK boleh di public/ (aset statis) maupun di repo (repo publik): satu berkas JSON di R2 MEDIA,
   kunci akademisi/induk.json, diunggah dari mesin pemilik (scripts tidak ikut repo). Rute ini hanya meneruskan berkas itu setelah sesi lolos. */
import {gagal} from "./worker.js";
import {stafOK, PERAN} from "./staf.js";

const KUNCI = "akademisi/induk.json";

async function induk(env, req) {
  if (!(await stafOK(env, req, Object.keys(PERAN)))) return gagal(401, "masuk sebagai staf BNPB atau admin");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(KUNCI);
  if (!o) return gagal(503, "data akademisi belum diunggah ke R2");
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store",
    "x-content-type-options": "nosniff", "x-diperbarui": o.uploaded.toISOString()}});
}

export const RUTE_AKADEMISI = {"GET /api/akademisi": (env, req) => induk(env, req)};
