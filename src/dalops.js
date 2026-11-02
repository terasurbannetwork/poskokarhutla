/* Pantau Banjir Dalops (/bnpb/dalops): layar staf Pusdalops/Koordalops untuk menindaklanjuti kab/kota terdampak banjir.
   Data kejadian dari logbook harian Pusdalops (isi internal, ada nama petugas) TIDAK boleh di public/ (repo publik):
   satu berkas JSON di R2 MEDIA kunci dalops/banjir.json, dibuat dan diunggah dari mesin pemilik lewat
   `python3 scripts/data/dalops_banjir.py --unggah`. Rute ini hanya meneruskan berkas itu setelah sesi staf lolos. */
import {gagal} from "./worker.js";
import {stafOK} from "./staf.js";
import {halamanBnpbPublik} from "./bnpb.js";

export const PERAN_DALOPS = ["pusdalops", "koordalops", "pimpinan"];
const KUNCI = "dalops/banjir.json";

async function banjir(env, req) {
  if (!(await stafOK(env, req, PERAN_DALOPS))) return gagal(401, "masuk sebagai staf Pusdalops, Koordalops, atau Pimpinan");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(KUNCI);
  if (!o) return gagal(404, "data belum diunggah, jalankan scripts/data/dalops_banjir.py --unggah");
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", vary: "cookie",
    "x-content-type-options": "nosniff", "x-diperbarui": o.uploaded.toISOString()}});
}

export const RUTE_DALOPS = {
  "GET /bnpb/dalops": (env, req, url) => halamanBnpbPublik(env, url, "dalops", {pribadi: true, bingkai: true}),   // layar staf; boleh dibingkai /admin/laporan
  "GET /api/dalops/banjir": banjir,
};
