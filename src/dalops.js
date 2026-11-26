/* Pantau Dalops (/bnpb/dalops): layar staf Pusdalops/Koordalops untuk menindaklanjuti kab/kota terdampak karhutla, banjir, longsor, gempa, cuaca, kekeringan.
   Data kejadian dari logbook harian Pusdalops (isi internal, ada nama petugas) TIDAK boleh di public/ (repo publik):
   satu berkas JSON per jenis di R2 MEDIA kunci dalops/<jenis>.json, dibuat dan diunggah dari mesin pemilik lewat
   `python3 scripts/data/dalops_banjir.py --unggah`. Rute ini hanya meneruskan berkas itu setelah sesi staf lolos. */
import {gagal} from "./worker.js";
import {modAtauStaf} from "./staf.js";   // RU-109: akun gerbang AKUN_SITUS* bukan staf, tidak lolos (stafOK memakai adminOK)
import {halamanBnpbPublik} from "./bnpb.js";
import {bacaLaporan, dummyLaporan} from "./dalops_laporan.js";
import {RUTE_TINDAK} from "./dalops_tindak.js";
import {lajuIP} from "./bnpb.js";
import {tglSah, wib} from "./posko.js";
import {lpTitikDalops, pelakuLpStaf} from "./hak.js";

import {PERAN_DALOPS} from "./gerbang_halaman.js";   // nilai tinggal di modul daun gerbang (dipakai bolehHalaman tanpa mengimpor modul ini)
export {PERAN_DALOPS};
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

/* Titik laporan Lapor Bencana di peta Dalops (data/kajian-bnpb/prediksi-kejadian/, PK-4, D10). Jenis Dalops -> jenis lapor (ALGORITMA "Pasangan jenis").
   Sesi staf Dalops yang sama dengan /api/dalops/* (Q3). Hanya tiket, jenis, tingkat, kab, lat, lon, waktu, status, periksa: tanpa nama, WA, isi, foto. tidak_valid dibuang di SQL. */
const JENIS_LAPOR = {banjir: ["banjir"], longsor: ["longsor"], cuaca: ["cuaca"], gelombang: ["abrasi", "tsunami"], karhutla: ["karhutla"]};
const MAKS_SEJAK_HARI = 14, HARI_MS = 864e5;
async function titikLaporan(env, req, url, kini = Date.now()) {
  if (!(await modAtauStaf(env, req, PERAN_DALOPS))) return gagal(401, "masuk sebagai staf Pusdalops, Koordalops, atau Pimpinan");
  const lim = await lajuIP(env, req, "dalops.lapor", [[600e3, 60]], kini); if (lim) return lim;
  const jenis = url.searchParams.get("jenis") || "", sejak = url.searchParams.get("sejak") || wib(kini - 7 * HARI_MS);
  if (!Object.hasOwn(JENIS_LAPOR, jenis)) return gagal(400, "jenis harus salah satu dari: " + Object.keys(JENIS_LAPOR).join(", "));
  if (!tglSah(sejak)) return gagal(400, "sejak harus YYYY-MM-DD");
  if (sejak < wib(kini - MAKS_SEJAK_HARI * HARI_MS)) return gagal(400, `sejak maksimal ${MAKS_SEJAK_HARI} hari lalu`);
  let baris;
  try { baris = await lpTitikDalops(env, pelakuLpStaf, JENIS_LAPOR[jenis], Date.parse(sejak + "T00:00:00+07:00")); }
  catch (e) { if (/no such table: lapor_/i.test(String(e?.message))) return gagal(503, "laporan belum tersedia (migrasi Lapor Bencana belum diterapkan)"); throw e; }
  const laporan = baris.map(r => ({tiket: r.tiket, jenis: r.jenis, tingkat: r.tingkat === "bpbd" ? "bpbd" : "warga", kab: r.kab, lat: r.lat, lon: r.lon, waktu: r.waktu, status: r.status, periksa: r.periksa || null}));
  return new Response(JSON.stringify({laporan}), {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "x-content-type-options": "nosniff"}});
}

export const RUTE_DALOPS = {
  ...RUTE_TINDAK,   // log tindak lanjut Usulan langkah (data/kajian-bnpb/tindak-langkah/)
  "GET /bnpb/dalops": (env, req, url) => halamanBnpbPublik(env, url, "dalops", {pribadi: true, bingkai: true}),   // layar staf; boleh dibingkai /admin/laporan
  "GET /api/dalops/banjir": (env, req) => data(env, req, "banjir"),
  "GET /api/dalops/longsor": (env, req) => data(env, req, "longsor"),
  "GET /api/dalops/karhutla": (env, req) => data(env, req, "karhutla"),
  "GET /api/dalops/gempa": (env, req) => data(env, req, "gempa"),
  "GET /api/dalops/cuaca": (env, req) => data(env, req, "cuaca"),
  "GET /api/dalops/kekeringan": (env, req) => data(env, req, "kekeringan"),
  "GET /api/dalops/gelombang": (env, req) => data(env, req, "gelombang"),     // gelombang pasang, abrasi, rob (11 Nov 2026)
  "GET /api/dalops/permukiman": (env, req) => data(env, req, "permukiman"),   // kebakaran permukiman (11 Nov 2026)
  "GET /api/dalops/gunungapi": (env, req) => data(env, req, "gunungapi"),     // gunung api dari logbook dan MAGMA (PB-46b)
  "GET /api/dalops/udara": (env, req) => data(env, req, "udara"),             // kualitas udara dan asap (PB-38b)
  "GET /api/dalops/laporan": (env, req, url) => bacaLaporan(env, req, url, data),   // Laporan Masuk: ringkasan rekap WA 07.00 (src/dalops_laporan.js)
  "GET /api/dalops/lapor": (env, req, url, kini) => titikLaporan(env, req, url, kini),   // titik Lapor Bencana untuk peta (PK-4)
  "POST /api/dalops/laporan/dummy": (env, req, url, kini) => dummyLaporan(env, req, kini),
};
