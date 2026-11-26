/* Bantu bersama modul operasi Pusdalops Gelombang 2 (src/pemulihan.js, src/lapsus.js, src/rollcall.js; migrasi 0096; spek 2026-11-01-pusdalops-standar.md).
   Gerbang urut: modAtauStaf(pusdalops|koordalops|pimpinan) PERTAMA -> body -> validasi -> laju tulis -> D1. Tabel belum ada (migrasi 0096 belum diterapkan) = 503 jelas, rute lain tak terpengaruh. */
import {json, gagal, acak, bacaBody} from "./worker.js";
import {modAtauStaf, dalamWilayahStaf} from "./staf.js";
import {superOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {PROV} from "./alun.js";
import {RE_HP2} from "./logbook.js";
export {json, gagal, acak};

export const HARI = 864e5, MENIT = 6e4, WIB = 7 * 36e5;
const PERAN = ["pusdalops", "koordalops", "pimpinan"], MAKS_BODY = 16384;
const KONTROL = /[\u0000-\u001f\u007f​-‏‪-‮﻿]/, RE_TGL = /^\d{4}-\d\d-\d\d$/;
export const NO_JSON = {"cache-control": "no-store"};

export const tolak = galat => { throw {galat}; };
/* jalankan validator yang boleh `tolak`; kembalikan {v} atau {r: 400} */
export const cek = fn => { try { return {v: fn()}; } catch (e) { if (e && typeof e.galat === "string") return {r: gagal(400, e.galat)}; throw e; } };
export const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "modul operasi Pusdalops belum diaktifkan (migrasi 0096_pusdalops_operasi, atau 0088_logbook untuk tautan kejadian, belum diterapkan)"); throw e; }
};

/* modul Gelombang 3 (migrasi 0098): 503 menyebut migrasinya, bukan 0096 */
export const tabelBelum3 = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "modul Pusdalops Gelombang 3 belum diaktifkan (migrasi 0098_pusdalops_gelombang3 belum diterapkan)"); throw e; }
};

/* teks bebas: tanpa karakter kontrol, tanpa nomor telepon/surel (privasi: instansi/tim, bukan orang). min 0 = boleh kosong -> null */
export function teks(v, nama, maks, min = 0) {
  if (v == null || v === "") { if (min) tolak(`${nama} wajib`); return null; }
  const t = typeof v === "string" ? v.trim() : "";
  if (typeof v !== "string" || KONTROL.test(v) || t.length < Math.max(min, 1) || t.length > maks) tolak(`${nama} ${Math.max(min, 1)}-${maks} karakter tanpa karakter kontrol`);
  const nf = t.normalize("NFKC"); if (RE_HP2.test(nf) || nf.includes("@")) tolak(`${nama} tidak boleh memuat nomor telepon atau surel`);
  return t;
}
/* opsional: kosong -> null, terisi harus lolos teks() dengan panjang minimum */
export const teksOpsi = (v, nama, maks, min = 1) => v == null || v === "" ? null : teks(v, nama, maks, min);
export const tglSah = v => typeof v === "string" && RE_TGL.test(v) && Number.isFinite(Date.parse(v + "T00:00:00Z")) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
export const tanggal = (v, nama, kini, { depan = 1, belakang = 400 } = {}) => {
  if (!tglSah(v)) tolak(`${nama} harus YYYY-MM-DD yang sah`);
  const t = Date.parse(v + "T00:00:00Z");
  if (t > kini + depan * HARI || t < kini - belakang * HARI) tolak(`${nama} di luar rentang wajar (maks ${depan} hari ke depan, ${belakang} hari ke belakang)`);
  return v;
};
export const tglWIB = kini => new Date(kini + WIB).toISOString().slice(0, 10);
export const kodeProv = (v, nama = "prov") => { if (typeof v !== "string" || !/^\d{2}$/.test(v) || !Object.hasOwn(PROV, v)) tolak(`${nama} harus kode provinsi 2 angka yang dikenal`); return v; };
/* kunci "prov|nama" -> {prov, kab} */
export function kabKunci(v, nama = "kab") {
  const [prov, kab, ...sisa] = typeof v === "string" ? v.split("|") : [];
  if (sisa.length || kab === undefined) tolak(`${nama} harus kunci wilayah "prov|nama"`);
  return {prov: kodeProv(prov, nama), kab: teks(kab, nama, 60, 2)};
}
export const koordinat = o => {
  if (o.lat == null && o.lon == null) return {lat: null, lon: null};
  if (typeof o.lat !== "number" || typeof o.lon !== "number" || !(o.lat >= -11.5 && o.lat <= 6.5) || !(o.lon >= 94 && o.lon <= 142)) tolak("lat dan lon wajib berpasangan di dalam Indonesia");
  return {lat: o.lat, lon: o.lon};
};
export const angka = (v, nama, maks, { bulat = false } = {}) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > maks || (bulat && !Number.isInteger(v))) tolak(`${nama} harus ${bulat ? "bilangan bulat" : "angka"} 0-${maks}`);
  return v;
};
export const pilih = (v, sah, nama) => { if (!sah.includes(v)) tolak(`${nama} harus salah satu: ${sah.join(", ")}`); return v; };

export const pintu = async (env, req) => { const o = await modAtauStaf(env, req, PERAN); return o ? String(o).slice(0, 64) : null; };
const TOLAK_STAF = () => gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
export const lajuTulis = (env, oleh, kini) => laju(env, "pd:" + oleh, "pusdalops_tulis", [[3600e3, 120]], kini);

/* baca: gerbang staf lalu isi(oleh) */
export async function bacaStaf(env, req, isi) { const oleh = await pintu(env, req); return oleh ? isi(oleh) : TOLAK_STAF(); }
/* tulis: gerbang staf, body JSON, lalu isi(o, oleh) */
export async function tulisStaf(env, req, isi) {
  const oleh = await pintu(env, req); if (!oleh) return TOLAK_STAF();
  const b = await bacaBody(req, MAKS_BODY); if (b.galat) return gagal(b.status || 400, b.galat);
  return isi(b.o, oleh);
}
/* dummy: Super Admin saja; isi(aksi, o) setelah aksi divalidasi */
export async function dummyStaf(env, req, isi) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "isi" && b.o.aksi !== "hapus") return gagal(400, "aksi harus isi/hapus");
  return isi(b.o.aksi);
}
/* staf berwilayah hanya menulis di provinsinya (admin dan staf nasional bebas); provs kosong = hanya nasional */
export const luarWilayah = (req, provs) => dalamWilayahStaf(req, provs) && provs.every(p => dalamWilayahStaf(req, [p])) ? null : gagal(403, "provinsi di luar wilayah staf");
export const idSah = v => typeof v === "string" && /^[0-9a-f]{16}$/.test(v);
export const persen = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : null;

/* KIB usulan 16 digit (Juknis 7/2023 hal. 7-8; kedeputian DESAIN-TEKNIS §6.5): prov(2) + kab(2) + kode bencana(3) + tanggal mulai YYYYMMDD(8) + indeks 1-9.
   Murni. kab = 2 angka (atau 4 angka berawalan prov). Jenis tanpa kode (mis. kecelakaan) atau masukan tak sah = null. Satu rumus dengan scripts/bnpb/unit/pus2.py (RU-085).
   Beda sengaja dengan KODE_BENCANA di logbook.js: daftar ini persis daftar DT §6.5. */
export const KODE_KIB = {banjir: "101", longsor: "102", cuaca: "104", kekeringan: "105", karhutla: "106", gempabumi: "107", gunungapi: "109", kebakaran_permukiman: "202", konflik_sosial: "301"};
export function kib(prov, kab, jenis, tanggal, indeks = 1) {
  if (!/^\d{2}$/.test(String(prov))) return null;
  const k4 = typeof kab === "string" && /^\d{4}$/.test(kab) ? kab : String(prov) + String(kab);
  if (!/^\d{4}$/.test(k4) || !k4.startsWith(String(prov)) || !Object.hasOwn(KODE_KIB, jenis) || !tglSah(tanggal) || !Number.isInteger(indeks) || indeks < 1 || indeks > 9) return null;
  return k4 + KODE_KIB[jenis] + tanggal.replaceAll("-", "") + indeks;
}
