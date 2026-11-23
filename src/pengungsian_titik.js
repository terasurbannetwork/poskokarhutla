/* Keterpaduan KP-19: register titik pengungsian (TP-). GET /api/pengungsian/titik?kab4= (daftar + putaran terakhir + basi), POST /api/pengungsian/titik (buat; 409 + titik dekat
   bila < 200 m dari titik lain, kecuali paksa:true), POST /api/pengungsian/titik/tutup ({id, tutup?}); PATCH tidak dipasang karena router worker.js hanya GET/POST.
   Hak: petugas meja kab (x-kode, meja pengungsi) hanya kab4-nya sendiri; staf pusat (moderator, staf Pusdalops/Koordalops). Data operasi, tidak ada rute publik.
   SQL di src/hak.js (tp*). Rancangan: data/kajian-bnpb/keterpaduan/ALGORITMA.md 4, KEPUTUSAN D9 dan K11 dan K12. */
import {json, gagal, bacaBody} from "./worker.js";
import {pelaku} from "./meja.js";
import {laju} from "./bnpb.js";
import {teksBersih} from "./meja_spek.js";
import {tglSah} from "./pusdalops_umum.js";
import {NAMA_KAB4, kab4Dari} from "./siklus_kab.js";
import * as H from "./hak.js";

const LAJU_TULIS = [[36e5, 60]];
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", WIB = 7 * 36e5, BASI_HARI = 3;
export const BOX = 0.002, DEKAT_M = 200;
const JENIS = ["terkonsentrasi", "tidak_terkonsentrasi"], RE_ID = /^TP-[A-Z2-7]{8}$/, RE_KJ = /^KJ-\d{4}-[0-9A-Za-z]{8}$/;
const hariIni = kini => new Date(kini + WIB).toISOString().slice(0, 10);
export const kodeTp = () => "TP-" + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => BASE32[b % 32]).join("");
const rad = x => x * Math.PI / 180;
export const jarakM = (a, b, c, d) => { const h = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2; return 12742e3 * Math.asin(Math.sqrt(h)); };
const aman = f => async (...a) => { try { return await f(...a); } catch (e) { if (/no such table: titik_pengungsian/i.test(String(e?.message || e))) return gagal(503, "Titik pengungsian belum diaktifkan"); throw e; } };

/* {oleh, kab4 (petugas: kab sendiri, null = semua)} atau Response */
async function hak(env, req) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  if (p.petugas) {
    const kab4 = kab4Dari(p.petugas.prov, p.petugas.kab);
    return p.petugas.meja.includes("pengungsi") && kab4 ? {oleh: p.oleh, kab4, petugasId: p.petugas.id} : gagal(403, "kodemu tidak mencakup meja pengungsi di kabupaten yang dikenal");
  }
  return p.ulp ? gagal(403, "peran ini tidak mengelola titik pengungsian") : {oleh: p.oleh, kab4: null};
}
const kabSah = k => typeof k === "string" && Object.hasOwn(NAMA_KAB4, k);

async function daftar(env, req, url, kini) {
  const h = await hak(env, req); if (h instanceof Response) return h;
  const kab4 = url.searchParams.get("kab4") ?? h.kab4;
  if (!kabSah(kab4)) return gagal(400, "kab4 wajib: kode kabupaten 4 digit");
  if (h.kab4 && kab4 !== h.kab4) return gagal(403, "kamu hanya boleh melihat titik di kabupatenmu sendiri");
  const hi = hariIni(kini), titik = (await H.tpDaftar(env, kab4)).map(t => ({...t, basi: !t.tutup && (!t.putaran_terakhir || (Date.parse(hi) - Date.parse(t.putaran_terakhir)) / 864e5 > BASI_HARI)}));
  return json({titik});
}

async function buat(env, req, url, kini) {
  const h = await hak(env, req); if (h instanceof Response) return h;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, x = Object.keys(o).find(k => !["kab4", "nama", "jenis_tempat", "kec", "desa", "lat", "lon", "kejadian_id", "buka", "paksa"].includes(k)); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const kab4 = o.kab4 ?? h.kab4;
  if (!kabSah(kab4)) return gagal(400, "kab4 wajib: kode kabupaten 4 digit");
  if (h.kab4 && kab4 !== h.kab4) return gagal(403, "kamu hanya boleh membuat titik di kabupatenmu sendiri");
  const nama = typeof o.nama === "string" ? o.nama.trim().replace(/\s+/g, " ") : "";
  if (nama.length < 2 || nama.length > 120) return gagal(400, "nama titik 2-120 huruf");
  const g = teksBersih(nama); if (g) return gagal(400, `nama: ${g}`);
  if (!JENIS.includes(o.jenis_tempat)) return gagal(400, `jenis_tempat harus salah satu dari ${JENIS.join(", ")}`);
  const wil = {};
  for (const f of ["kec", "desa"]) {
    if (o[f] == null) { wil[f] = null; continue; }
    const t = typeof o[f] === "string" ? o[f].trim().replace(/\s+/g, " ") : "";
    if (!t || t.length > 80) return gagal(400, `${f}: teks 1-80 huruf`);
    const g2 = teksBersih(t); if (g2) return gagal(400, `${f}: ${g2}`);
    wil[f] = t;
  }
  const {kec, desa} = wil;
  const ada = o.lat != null || o.lon != null;
  if (ada && !(Number.isFinite(o.lat) && Number.isFinite(o.lon) && o.lat >= -11.5 && o.lat <= 6.5 && o.lon >= 94 && o.lon <= 141.5)) return gagal(400, "lat dan lon harus berpasangan dan di dalam Indonesia");
  if (o.kejadian_id != null && !(typeof o.kejadian_id === "string" && RE_KJ.test(o.kejadian_id))) return gagal(400, "kejadian_id bukan kode kejadian Siklus");
  if (o.buka != null && !tglSah(o.buka)) return gagal(400, "buka harus YYYY-MM-DD yang sah");
  if (o.paksa != null && typeof o.paksa !== "boolean") return gagal(400, "paksa harus true atau false");
  if (o.kejadian_id != null && !await H.tpKejadianKab(env, o.kejadian_id, kab4)) return gagal(400, "kejadian_id tidak mencakup kabupaten titik ini");
  if (h.petugasId) { const l = await laju(env, h.petugasId, "titik.tulis", LAJU_TULIS, kini); if (l) return l; }
  if (ada && o.paksa !== true) {
    const dekat = (await H.tpSekitar(env, kab4, o.lat, o.lon, BOX)).map(t => ({id: t.id, nama: t.nama, jarak_m: Math.round(jarakM(o.lat, o.lon, t.lat, t.lon))})).filter(t => t.jarak_m < DEKAT_M).sort((a, c) => a.jarak_m - c.jarak_m);
    if (dekat.length) return json({galat: "ada titik pengungsian kurang dari 200 m dari sini; pakai titik itu atau kirim ulang dengan paksa:true", dekat}, 409);
  }
  const id = kodeTp();
  try { await H.tpSisip(env, id, kab4.slice(0, 2), kab4, kec, desa, nama, o.jenis_tempat, ada ? o.lat : null, ada ? o.lon : null, o.kejadian_id ?? null, o.buka ?? null, kini, h.oleh); }
  catch (e) { if (/FOREIGN KEY/i.test(String(e?.message || e))) return gagal(400, "kejadian_id tidak ditemukan"); throw e; }
  return json({titik: {id, kab4, nama, jenis_tempat: o.jenis_tempat, kec, desa, lat: ada ? o.lat : null, lon: ada ? o.lon : null, kejadian_id: o.kejadian_id ?? null, buka: o.buka ?? null, tutup: null}}, 201);
}

async function tutup(env, req, url, kini) {
  const h = await hak(env, req); if (h instanceof Response) return h;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.id !== "string" || !RE_ID.test(b.o.id)) return gagal(400, "id titik: TP- dan 8 karakter");
  if (b.o.tutup != null && !tglSah(b.o.tutup)) return gagal(400, "tutup harus YYYY-MM-DD yang sah");
  const t = await H.tpById(env, b.o.id);
  if (!t || (h.kab4 && t.kab4 !== h.kab4)) return gagal(404, "titik tidak ditemukan");   // di luar kab petugas tampak sama dengan tidak ada
  const hi = hariIni(kini), tgl = b.o.tutup ?? hi;
  if (tgl > hi) return gagal(400, "tanggal tutup tidak boleh di masa depan");
  if (t.buka && tgl < t.buka) return gagal(400, "tanggal tutup tidak boleh sebelum tanggal buka");
  if (h.petugasId) { const l = await laju(env, h.petugasId, "titik.tulis", LAJU_TULIS, kini); if (l) return l; }
  if (!await H.tpTutup(env, t.id, tgl)) return gagal(409, "titik sudah ditutup");
  return json({id: t.id, tutup: tgl});
}

export const RUTE_PENGUNGSIAN_TITIK = {
  "GET /api/pengungsian/titik": aman(daftar),
  "POST /api/pengungsian/titik": aman(buat),
  "POST /api/pengungsian/titik/tutup": aman(tutup),
};
