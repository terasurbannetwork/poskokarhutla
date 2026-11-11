/* Pantau Dalops (/bnpb/dalops): layar staf Pusdalops/Koordalops untuk menindaklanjuti kab/kota terdampak karhutla, banjir, longsor, gempa, cuaca, kekeringan.
   Data kejadian dari logbook harian Pusdalops (isi internal, ada nama petugas) TIDAK boleh di public/ (repo publik):
   satu berkas JSON per jenis di R2 MEDIA kunci dalops/<jenis>.json, dibuat dan diunggah dari mesin pemilik lewat
   `python3 scripts/data/dalops_banjir.py --unggah`. Rute ini hanya meneruskan berkas itu setelah sesi staf lolos. */
import {gagal} from "./worker.js";
import {modAtauStaf} from "./staf.js";   // RU-109: akun gerbang AKUN_SITUS* bukan staf, tidak lolos (stafOK memakai adminOK)
import {halamanBnpbPublik} from "./bnpb.js";
import {bacaLaporan, dummyLaporan} from "./dalops_laporan.js";

export const PERAN_DALOPS = ["pusdalops", "koordalops", "pimpinan"];
/* Pantau = Karhutla, Banjir, Longsor, Gempa, Cuaca, Kekeringan (pemilik 5 Nov 2026), Gelombang Pasang, Kebakaran Permukiman (11 Nov 2026); satu rute per jenis, kunci R2 dalops/<jenis>.json */

async function data(env, req, jenis) {
  if (!(await modAtauStaf(env, req, PERAN_DALOPS))) return gagal(401, "masuk sebagai staf Pusdalops, Koordalops, atau Pimpinan");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(`dalops/${jenis}.json`);
  if (!o && jenis === "laporan") return new Response(JSON.stringify({versi: 1, diperbarui: null, hari: []}), {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "x-content-type-options": "nosniff"}});   // belum ada rekap masuk: kosong, bukan 404
  if (!o) return gagal(404, `data ${jenis} belum diunggah, jalankan scripts/data/dalops_banjir.py --unggah`);
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", vary: "cookie",
    "x-content-type-options": "nosniff", "x-diperbarui": o.uploaded.toISOString()}});
}

export const RUTE_DALOPS = {
  "GET /bnpb/dalops": (env, req, url) => halamanBnpbPublik(env, url, "dalops", {pribadi: true, bingkai: true}),   // layar staf; boleh dibingkai /admin/laporan
  "GET /api/dalops/banjir": (env, req) => data(env, req, "banjir"),
  "GET /api/dalops/longsor": (env, req) => data(env, req, "longsor"),
  "GET /api/dalops/karhutla": (env, req) => data(env, req, "karhutla"),
  "GET /api/dalops/gempa": (env, req) => data(env, req, "gempa"),
  "GET /api/dalops/cuaca": (env, req) => data(env, req, "cuaca"),
  "GET /api/dalops/kekeringan": (env, req) => data(env, req, "kekeringan"),
  "GET /api/dalops/gelombang": (env, req) => data(env, req, "gelombang"),     // gelombang pasang, abrasi, rob (11 Nov 2026)
  "GET /api/dalops/permukiman": (env, req) => data(env, req, "permukiman"),   // kebakaran permukiman (11 Nov 2026)
  "GET /api/dalops/laporan": (env, req, url) => bacaLaporan(env, req, url, data),   // Laporan Masuk: ringkasan rekap WA 07.00 (src/dalops_laporan.js)
  "POST /api/dalops/laporan/dummy": (env, req, url, kini) => dummyLaporan(env, req, kini),
};
