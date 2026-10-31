/* Kemitraan Kampus: cangkang rute, gerbang hak, halaman. Skema: migrations/0080-0084 (km_*), peran staf 0085.
   Rancangan: data/kajian-bnpb/kampus/DESAIN-TEKNIS.md §4.1-§4.2 dan ADR-07, KEAMANAN-PRIVASI.md §1 dan §3. Rute fitur (masalah, riset, satgas, ...) menyusul per tiket.
   Hak (hakKm): SA = Super Admin; ST = moderator ke atas (bukan akun gerbang situs) atau staf peran `kemitraan`; PM = staf peran `pimpinan`; KK = sesi km_sesi (cookie sesi_kemitraan,
   kiriman wajib header x-km: 1); AG/BP/PL = header x-kode, dicari berurutan di relawan(+km_anggota), km_bpbd_kode, km_pl_kode (berlaku, tidak dicabut). PB = publik (tanpa hakKm).
   Gerbang situs centurisk97.id dilewati untuk awalan /kemitraan dan /api/kemitraan/ (src/worker.js): modul ini yang menjaga dirinya.
   ponytail: GET /api/kemitraan/saya tidak dibatasi laju sendiri (tebakan kode salah sudah dihitung pemegangKode); tambah laju 60/jam bila kemudian mengembalikan data berat. */
import {gagal, json, sha, tolakOrigin} from "./worker.js";
import {modOK, superOK} from "./posko.js";
import {pemegangKode, CSP} from "./bnpb.js";
import {stafSesi} from "./staf.js";
import {lindungi} from "./relawan.js";

const COOKIE = "sesi_kemitraan";
const tokenKm = req => (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})(?:;|$)`))?.[1] ?? null;
const baca = req => req.method === "GET" || req.method === "HEAD";

/* Siapa yang memanggil. {peran: 'ST'|'PM'|'SA'|'KK'|'AG'|'BP'|'PL'|null, oleh, ...konteks}. peran null = tanpa hak; bila x-kode dikirim tetapi salah/dicabut/kedaluwarsa,
   `tolak` berisi Response 403/429 siap kirim (hitung gagal per IP ada di pemegangKode). Tabel km_* belum ada melempar "no such table": rute dibungkus lindungi() jadi 503. */
export async function hakKm(env, req, kini = Date.now()) {
  const m = await modOK(env, req);
  if (m) return {peran: (await superOK(env, req)) ? "SA" : "ST", oleh: m, wilayah: []};
  const s = await stafSesi(env, req, kini);   // aktif, sandi awal sudah diganti, dan (kiriman) x-pb
  if (s?.peran.includes("kemitraan")) return {peran: "ST", oleh: "staf:" + s.id, wilayah: s.wilayah};
  if (s?.peran.includes("pimpinan")) return {peran: "PM", oleh: "staf:" + s.id, wilayah: s.wilayah};
  const t = tokenKm(req);
  if (t && (baca(req) || req.headers.get("x-km") === "1")) {
    const a = await env.DB.prepare("SELECT a.id, a.institusi_id, a.nama FROM km_sesi s JOIN km_akun a ON a.id = s.akun_id WHERE s.sha = ? AND s.sampai > ? AND a.status = 'aktif'").bind(await sha(t), kini).first();
    if (a) return {peran: "KK", oleh: "kk:" + a.id, akun_id: a.id, institusi_id: a.institusi_id, nama: a.nama};
  }
  if (req.headers.has("x-kode")) {
    const r = await pemegangKode(env, req, "km", cariKode(env, kini), kini, 60);
    return r instanceof Response ? {peran: null, tolak: r} : r;
  }
  return {peran: null};
}
/* urutan tetap (DT §4.1): relawan yang punya baris km_anggota -> kode BPBD -> kode PL. Tidak ketemu = null. */
const cariKode = (env, kini) => async kodeSha => {
  const ag = await env.DB.prepare("SELECT r.id, r.kampus_id, a.unsur FROM relawan r JOIN km_anggota a ON a.relawan_id = r.id WHERE r.kode_sha = ? AND r.anonim = 0 AND r.dummy = 0 AND r.status IN ('diverifikasi', 'siap_tugas', 'ditugaskan', 'bertugas', 'selesai')").bind(kodeSha).first();
  if (ag) return {peran: "AG", oleh: "ag:" + ag.id, relawan_id: ag.id, kampus_id: ag.kampus_id, unsur: ag.unsur};
  const bp = await env.DB.prepare("SELECT id, kab4, prov, jenis FROM km_bpbd_kode WHERE kode_sha = ? AND dicabut IS NULL AND berlaku > ?").bind(kodeSha, kini).first();
  if (bp) return {peran: "BP", oleh: "bp:" + bp.id, kode_id: bp.id, kab4: bp.kab4, prov: bp.prov, jenis: bp.jenis};
  const pl = await env.DB.prepare("SELECT id, jenis, akademisi_id FROM km_pl_kode WHERE kode_sha = ? AND dicabut IS NULL AND berlaku > ?").bind(kodeSha, kini).first();
  return pl ? {peran: "PL", oleh: "pl:" + pl.id, kode_id: pl.id, jenis: pl.jenis, akademisi_id: pl.akademisi_id} : null;
};

/* ================================================================ halaman (DT §4.2) */
/* Isi HTML dari tiket KM-A10 (public/kemitraan.html, public/kemitraan/<halaman>.html). Sebelum ada: cangkang layar masuk tanpa skrip. Halaman tidak membawa data;
   hak ditegakkan API (hakKm). Tamu tetap 200 (layar masuk), bukan dialihkan ke /admin/masuk. */
const CANGKANG = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Kemitraan Kampus</title></head>
<body><main><h1>Kemitraan Kampus</h1><p>Masuk untuk melanjutkan.</p><p><a href="/admin/pantau?ke=%2Fkemitraan">Masuk staf BNPB</a> | <a href="/kemitraan/masuk">Masuk koordinator kampus</a></p></main></body></html>`;
async function halaman(env, url, berkas) {
  const r = env.ASSETS ? await env.ASSETS.fetch(new Request(new URL(berkas, url))) : null;
  if (r?.ok) return new Response(r.body, {headers: tajuk()});
  r?.body?.cancel();
  return new Response(CANGKANG, {headers: tajuk()});
}
const tajuk = () => ({"content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow", "content-security-policy": CSP});

/* Halaman yang hanya untuk sesi (staf/KK): tanpa hak yang sesuai, 303 ke layar masuk. Kode BP/AG/PL tidak bisa membuka halaman ini lewat navigasi (kode ada di fragmen #k=, dikirim
   skrip sebagai x-kode ke API), jadi hak BP di buku/panduan ditegakkan API-nya, bukan halamannya. */
async function halamanHak(env, req, url, kini, boleh, berkas) {
  const h = await hakKm(env, req, kini);
  return boleh.includes(h.peran) ? halaman(env, url, berkas) : new Response(null, {status: 303, headers: {location: "/kemitraan/masuk", "cache-control": "no-store"}});
}

/* ================================================================ API */
async function saya(env, req, kini) {
  const h = await hakKm(env, req, kini);
  return h.tolak ?? (h.peran ? json({jenis: h.peran}) : gagal(401, "belum masuk atau kode tidak diberikan"));
}
/* pemegang rute fitur yang belum dibangun: hak diperiksa dulu supaya tamu tidak bisa membedakan rute ada/tidak, lalu 501 */
const belumAda = async (env, req, url, kini) => {
  const h = await hakKm(env, req, kini);
  return h.tolak ?? (h.peran ? gagal(501, "fitur ini belum tersedia") : gagal(401, "belum masuk atau kode tidak diberikan"));
};

/* kunci `METODE /jalur`; :id dan :rid = 16 hex, :aid = id OpenAlex (A + 4-12 angka), :kab4 = 4 digit. Pola lain = 404 (ADR-07). */
export const RUTE_KEMITRAAN = lindungi({
  "GET /kemitraan": (env, req, url) => halaman(env, url, "/kemitraan.html"),
  "GET /kemitraan/masuk": (env, req, url) => halaman(env, url, "/kemitraan/masuk.html"),
  "GET /kemitraan/daftar": (env, req, url) => halaman(env, url, "/kemitraan/daftar.html"),
  "GET /kemitraan/saya": (env, req, url) => halaman(env, url, "/kemitraan/saya.html"),
  "GET /kemitraan/buku": (env, req, url, kini) => halamanHak(env, req, url, kini, ["SA", "ST", "PM", "KK"], "/kemitraan/buku.html"),
  "GET /kemitraan/panduan": (env, req, url, kini) => halamanHak(env, req, url, kini, ["SA", "ST"], "/kemitraan/panduan.html"),
  "GET /kemitraan/sertifikat/:id": (env, req, url) => halaman(env, url, "/kemitraan/sertifikat.html"),
  "GET /api/kemitraan/saya": (env, req, url, kini) => saya(env, req, kini),
  /* penampung pola :kab4, :id, :aid; diganti pemilik sebenarnya oleh KM-C03 / KM-C08 */
  "GET /api/kemitraan/daerah/:kab4/pakar": belumAda,
  "POST /api/kemitraan/masalah/:id/pakar/:aid": belumAda,
}, "fitur kemitraan kampus belum diaktifkan", "kemitraan: tabel km_* belum ada (migrasi 0080-0085 belum diterapkan)");

const POLA = {id: "[0-9a-f]{16}", rid: "[0-9a-f]{16}", aid: "A\\d{4,12}", kab4: "\\d{4}"};
const TABEL = Object.entries(RUTE_KEMITRAAN).map(([k, f]) => {
  const [metode, jalur] = k.split(" "), nama = [];
  const re = new RegExp("^" + jalur.replace(/:(\w+)/g, (_, n) => { nama.push(n); return `(${POLA[n]})`; }) + "$");
  return {metode, re, nama, f};
});
/* sub-router (ADR-07): {f, p} untuk metode+jalur yang dikenal, selain itu null. jalur sudah tanpa garis miring penutup. */
export function ruteKm(metode, jalur) {
  for (const r of TABEL) {
    if (r.metode !== metode) continue;
    const m = r.re.exec(jalur);
    if (m) return {f: r.f, p: Object.fromEntries(r.nama.map((n, i) => [n, m[i + 1]]))};
  }
  return null;
}

/* Dipanggil src/worker.js untuk jalur berawalan /kemitraan atau /api/kemitraan/. null = bukan urusan modul (aset statis /kemitraan/inti.js dst. dilayani seperti biasa). */
export async function layaniKm(env, req, url, ctx) {
  const jalur = url.pathname.replace(/\/+$/, "") || "/", api = jalur.startsWith("/api/kemitraan/");
  const c = ruteKm(req.method === "HEAD" ? "GET" : req.method, jalur);
  if (!c) {
    const ok = ["GET", "POST"].filter(m => ruteKm(m, jalur));
    if (!ok.length) return api ? gagal(404, "rute tidak ada") : null;   // bukan rute modul: aset statis (/kemitraan/inti.js dst.) dilayani seperti biasa
    return gagal(405, "metode tidak diizinkan", {allow: ok.join(", ")});   // jalur ada tetapi metode lain (termasuk OPTIONS): jangan jatuh ke aset
  }
  if (req.method === "POST") {   // CSRF: tolakOrigin mengenali cookie sesi_kemitraan (Origin kosong/asing ditolak)
    const x = tolakOrigin(req, url); if (x) return x;
    if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  }
  try { return await c.f(env, req, url, Date.now(), ctx, c.p); }
  catch (e) { console.error("kemitraan", url.pathname, e); return gagal(500, "galat server"); }
}
