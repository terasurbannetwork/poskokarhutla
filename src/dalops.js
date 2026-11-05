/* Pantau Dalops (/bnpb/dalops): layar staf Pusdalops/Koordalops untuk menindaklanjuti kab/kota terdampak karhutla, banjir, longsor.
   Data kejadian dari logbook harian Pusdalops (isi internal, ada nama petugas) TIDAK boleh di public/ (repo publik):
   satu berkas JSON per jenis di R2 MEDIA kunci dalops/<jenis>.json, dibuat dan diunggah dari mesin pemilik lewat
   `python3 scripts/data/dalops_banjir.py --unggah`. Rute ini hanya meneruskan berkas itu setelah sesi staf lolos. */
import {gagal} from "./worker.js";
import {stafOK} from "./staf.js";
import {halamanBnpbPublik} from "./bnpb.js";

export const PERAN_DALOPS = ["pusdalops", "koordalops", "pimpinan"];
/* Pantau = Karhutla, Banjir, Longsor (pemilik 5 Nov 2026); satu rute per jenis, kunci R2 dalops/<jenis>.json */

async function data(env, req, jenis) {
  if (!(await stafOK(env, req, PERAN_DALOPS))) return gagal(401, "masuk sebagai staf Pusdalops, Koordalops, atau Pimpinan");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(`dalops/${jenis}.json`);
  if (!o) return gagal(404, `data ${jenis} belum diunggah, jalankan scripts/data/dalops_banjir.py --unggah`);
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", vary: "cookie",
    "x-content-type-options": "nosniff", "x-diperbarui": o.uploaded.toISOString()}});
}

export const RUTE_DALOPS = {
  "GET /bnpb/dalops": (env, req, url) => halamanBnpbPublik(env, url, "dalops", {pribadi: true, bingkai: true}),   // layar staf; boleh dibingkai /admin/laporan
  "GET /api/dalops/banjir": (env, req) => data(env, req, "banjir"),
  "GET /api/dalops/longsor": (env, req) => data(env, req, "longsor"),
  "GET /api/dalops/karhutla": (env, req) => data(env, req, "karhutla"),
};
