/* Buku kontak pemangku kepentingan (/admin/kontak): gubernur, bupati, wali kota, BPBD, TNI, Polri, Manggala Agni, dan lainnya.
   Skema: migrations/0053_kontak.sql (tabel kontak_pemangku). Hanya admin (adminOK) yang MEMBACA; tidak ada rute publik, API v1, atau MCP yang memuatnya.
   Registrasi publik /daftar-kontak hanya MENULIS baris berstatus menunggu (laju per IP dan per nomor, Turnstile bila aktif); admin menyetujui.
   Kolom notif/ambang disiapkan untuk notifikasi kejadian per wilayah; pengirimnya belum ada. Pengirim nanti WAJIB menyaring status = 'aktif' AND diverifikasi IS NOT NULL:
   registrasi publik tidak membuktikan kepemilikan nomor/email, jadi admin menandai nomor sudah dicek sebelum kontak menerima pesan. */
import {json, gagal, acak, sha, adminOK, bacaBody, turnstileOK} from "./worker.js";
import {PROV} from "./relawan.js";
import {laju, lajuIP, halamanBnpbPublik} from "./bnpb.js";

const JAM = 3600e3, HARI = 24 * JAM;

export const KATEGORI = {kepala_daerah: "Kepala daerah", bpbd: "BPBD", tni: "TNI", polri: "Polri", kemenhut: "Kemenhut / Manggala Agni", bmkg: "BMKG",
  bnpb: "BNPB", pemda: "Dinas / pemda lain", swasta: "Swasta / konsesi", lainnya: "Lainnya"};
export const AMBANG = ["semua", "siaga", "awas"];
const MAKS_IMPOR = 1000, MAKS_MENUNGGU = 500;
const KOLOM = "id, nama, jabatan, lembaga, kategori, prov, kab, wa, email, telepon, ajudan, ajudan_wa, notif, ambang, diverifikasi, catatan, status, setuju_pdp, dibuat, diubah, oleh";

const bersih = t => String(t).normalize("NFC").replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, "").replace(/\s+/g, " ").trim();
/* murni: nomor apa pun bentuknya ("0812-3456 789", "+62 812…", "812…") -> "62812…"; null bila kosong; false bila tidak sah */
export function normalWa(t) {
  if (t == null || bersih(t) === "") return null;
  let d = String(t).replace(/[^0-9]/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1); else if (d.startsWith("8")) d = "62" + d;
  return /^628[0-9]{7,12}$/.test(d) ? d : false;
}

/* murni: objek masukan -> {k} (baris siap simpan, tanpa id/waktu) atau {galat}. kabSah(prov, kab) memeriksa ejaan kab terhadap pusat_kec. */
export function sahkanKontak(o, kabSah) {
  if (!o || typeof o !== "object") return {galat: "data kontak harus objek"};
  const teks = (k, min, maks, wajib) => {
    const v = o[k] == null ? "" : typeof o[k] === "string" ? bersih(o[k]) : null;
    if (v === null) return {galat: `${k} harus teks`};
    if (!v) return wajib ? {galat: `${k} wajib diisi`} : {v: null};
    return v.length < min || v.length > maks ? {galat: `${k} ${min}-${maks} karakter`} : {v};
  };
  const k = {};
  for (const [kol, min, maks, wajib] of [["nama", 2, 100, 1], ["jabatan", 2, 100, 1], ["lembaga", 2, 120], ["ajudan", 2, 100], ["catatan", 1, 500]]) {
    const r = teks(kol, min, maks, wajib); if (r.galat) return r; k[kol] = r.v;
  }
  if (!Object.hasOwn(KATEGORI, o.kategori)) return {galat: "kategori tidak dikenal"};
  k.kategori = o.kategori;
  k.prov = o.prov == null || o.prov === "" ? null : String(o.prov);
  if (k.prov !== null && !Object.hasOwn(PROV, k.prov)) return {galat: "kode provinsi tidak dikenal"};
  const kab = teks("kab", 2, 60); if (kab.galat) return kab; k.kab = kab.v;
  if (k.kab && !k.prov) return {galat: "kabupaten/kota butuh provinsi"};
  if (k.kab && !kabSah(k.prov, k.kab)) return {galat: `kabupaten/kota "${k.kab}" tidak ada di ${PROV[k.prov]}`};
  for (const kol of ["wa", "ajudan_wa"]) { const w = normalWa(o[kol]); if (w === false) return {galat: `${kol === "wa" ? "nomor WA" : "WA ajudan"} tidak sah: pakai nomor seluler Indonesia`}; k[kol] = w; }
  const em = teks("email", 6, 254); if (em.galat) return em;
  k.email = em.v && em.v.toLowerCase();
  if (k.email && !/^[^\s@<>,;"?&=#%]+@[^\s@<>,;"?&=#%]+\.[^\s@<>,;"?&=#%]{2,}$/.test(k.email)) return {galat: "email tidak sah"};
  const tel = teks("telepon", 5, 20); if (tel.galat) return tel;
  if (tel.v && !/^[0-9+ -]+$/.test(tel.v)) return {galat: "telepon hanya angka, spasi, +, -"};
  k.telepon = tel.v;
  if (!k.wa && !k.email) return {galat: "isi minimal satu: nomor WA atau email"};
  k.notif = o.notif == null ? 1 : o.notif === true || o.notif === 1 || o.notif === "1" ? 1 : o.notif === false || o.notif === 0 || o.notif === "0" ? 0 : null;
  if (k.notif === null) return {galat: "notif harus 0 atau 1"};
  k.ambang = o.ambang == null || o.ambang === "" ? "siaga" : o.ambang;
  if (!AMBANG.includes(k.ambang)) return {galat: "ambang harus semua, siaga, atau awas"};
  k.diverifikasi = o.diverifikasi == null || o.diverifikasi === "" ? null : Number(o.diverifikasi);
  if (k.diverifikasi !== null && !(Number.isInteger(k.diverifikasi) && k.diverifikasi > 1.5e12 && k.diverifikasi < 4e12)) return {galat: "diverifikasi harus waktu ms"};
  return {k};
}

/* ejaan kab per provinsi dari pusat_kec.json (aset statis), sekali per isolat */
let KAB = null;
async function kabSet(env) {
  if (KAB) return KAB;
  const r = await env.ASSETS.fetch(new Request("https://aset.lokal/banjir/data/pusat_kec.json"));
  if (!r.ok) throw new Error("pusat_kec.json " + r.status);
  KAB = new Set(Object.keys(await r.json()).map(x => x.split("|").slice(0, 2).join("|")));
  return KAB;
}
const siap = async env => { const s = await kabSet(env); return (p, k) => s.has(`${p}|${k}`); };
const URUT = ["nama", "jabatan", "lembaga", "kategori", "prov", "kab", "wa", "email", "telepon", "ajudan", "ajudan_wa", "notif", "ambang", "diverifikasi", "catatan"];
const simpan = (env, id, k, kini, mod, status = "aktif") => env.DB.prepare(`INSERT INTO kontak_pemangku (id, ${URUT.join(", ")}, status, setuju_pdp, dibuat, diubah, oleh) VALUES (?, ${URUT.map(() => "?").join(", ")}, ?, ?, ?, ?, ?)`)
  .bind(id, ...URUT.map(c => k[c]), status, status === "menunggu" ? kini : null, kini, kini, mod);

/* registrasi publik: pemangku kepentingan mendaftarkan dirinya; masuk sebagai menunggu. Jawaban sama untuk nomor baru atau yang sudah ada (tanpa oracle). */
async function daftar(env, req, kini) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.setuju !== true) return gagal(400, "persetujuan pemrosesan data pribadi (UU PDP) wajib");
  const {diverifikasi, ...o} = b.o;   // hanya admin yang menandai nomor sudah dicek
  const s = sahkanKontak(o, await siap(env)); if (s.galat) return gagal(400, s.galat);
  const lj = await lajuIP(env, req, "kontak.daftar", [[JAM, 5], [HARI, 20]], kini); if (lj) return lj;   // laju dulu: Turnstile memanggil layanan luar
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  for (const v of [s.k.wa, s.k.email].filter(Boolean)) { const lk = await laju(env, (await sha(env.IP_SALT + "|kontak|" + v)).slice(0, 32), "kontak.daftar_nomor", [[HARI, 3]], kini); if (lk) return lk; }
  try {
    /* ponytail: hitung-lalu-tulis, kiriman serentak bisa lolos satu-dua di atas batas. Batas ini menahan banjir antrean bila Turnstile belum diaktifkan. */
    if ((await env.DB.prepare("SELECT count(*) n FROM kontak_pemangku WHERE status = 'menunggu'").first()).n >= MAKS_MENUNGGU) return gagal(503, "antrean registrasi sedang penuh; coba lagi besok");
    await simpan(env, acak(8), s.k, kini, "registrasi", "menunggu").run();
  } catch (e) { if (tanpaTabel(e)) { console.error("kontak.daftar", e?.message); return gagal(503, "layanan belum siap; coba lagi nanti"); } throw e; }
  return json({ok: true}, 201);
}

const tolak = () => gagal(403, "token admin salah atau ADMIN_TOKEN belum diset");
const tanpaTabel = e => /no such table/i.test(String(e?.message || e)) ? gagal(503, "buku kontak belum aktif: migrasi D1 0053_kontak belum diterapkan") : null;

export const RUTE_KONTAK = {
  "GET /daftar-kontak": (env, req, url) => halamanBnpbPublik(env, url, "kontak", {turnstile: true}),
  "GET /api/kontak/konfig": env => json({provinsi: PROV, kategori: KATEGORI, ambang: AMBANG, turnstile: env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY || null}),
  "POST /api/kontak/daftar": (env, req, url, kini) => daftar(env, req, kini),
  "POST /api/kontak/admin/setujui/:id": async (env, req, url, kini, ctx, id) => {
    const mod = await adminOK(env, req); if (!mod) return tolak();
    const r = await env.DB.prepare("UPDATE kontak_pemangku SET status = 'aktif', diubah = ?, oleh = ? WHERE id = ? AND status = 'menunggu'").bind(kini, mod, id).run();
    return r.meta.changes ? json({id, status: "aktif"}) : gagal(404, "kontak menunggu tidak ditemukan");
  },
  "GET /api/kontak/admin": async (env, req) => {
    if (!await adminOK(env, req)) return tolak();
    try { return json({kontak: (await env.DB.prepare(`SELECT ${KOLOM} FROM kontak_pemangku ORDER BY status = 'aktif', prov IS NOT NULL, prov, kab IS NOT NULL, kab, kategori, nama`).all()).results, provinsi: PROV, kategori: KATEGORI, ambang: AMBANG}); }
    catch (e) { return tanpaTabel(e) || Promise.reject(e); }
  },
  "POST /api/kontak/admin": async (env, req, url, kini) => {
    const mod = await adminOK(env, req); if (!mod) return tolak();
    const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
    const s = sahkanKontak(b.o, await siap(env)); if (s.galat) return gagal(400, s.galat);
    const id = acak(8);
    try { await simpan(env, id, s.k, kini, mod).run(); } catch (e) { return tanpaTabel(e) || Promise.reject(e); }
    return json({kontak: await env.DB.prepare(`SELECT ${KOLOM} FROM kontak_pemangku WHERE id = ?`).bind(id).first()}, 201);
  },
  /* ubah: semua kolom ditimpa (layar mengirim formulir utuh) */
  "POST /api/kontak/admin/:id": async (env, req, url, kini, ctx, id) => {
    const mod = await adminOK(env, req); if (!mod) return tolak();
    const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
    const s = sahkanKontak(b.o, await siap(env)); if (s.galat) return gagal(400, s.galat);
    const r = await env.DB.prepare(`UPDATE kontak_pemangku SET ${URUT.map(c => c + " = ?").join(", ")}, diubah = ?, oleh = ? WHERE id = ?`).bind(...URUT.map(c => s.k[c]), kini, mod, id).run();
    return r.meta.changes ? json({kontak: await env.DB.prepare(`SELECT ${KOLOM} FROM kontak_pemangku WHERE id = ?`).bind(id).first()}) : gagal(404, "kontak tidak ditemukan");
  },
  "POST /api/kontak/admin/hapus/:id": async (env, req, url, kini, ctx, id) => {
    if (!await adminOK(env, req)) return tolak();
    const r = await env.DB.prepare("DELETE FROM kontak_pemangku WHERE id = ?").bind(id).run();
    return r.meta.changes ? json({id, dihapus: true}) : gagal(404, "kontak tidak ditemukan");
  },
  /* impor massal dari CSV (diurai di peramban): semua baris sah atau tidak ada yang masuk; galat menyebut nomor baris */
  "POST /api/kontak/admin/impor": async (env, req, url, kini) => {
    const mod = await adminOK(env, req); if (!mod) return tolak();
    const b = await bacaBody(req, 600_000); if (b.galat) return gagal(b.status || 400, b.galat);
    const baris = b.o.baris;
    if (!Array.isArray(baris) || !baris.length || baris.length > MAKS_IMPOR) return gagal(400, `baris harus larik 1-${MAKS_IMPOR} kontak`);
    const cek = await siap(env), galat = [], sah = [];
    baris.forEach((o, i) => { const s = sahkanKontak(o, cek); if (s.galat) galat.push(`baris ${i + 2}: ${s.galat}`); else sah.push(s.k); });   // baris 1 = judul kolom CSV
    if (galat.length) return json({galat: `${galat.length} baris ditolak, tidak ada yang disimpan`, rincian: galat.slice(0, 50)}, 400);
    try { await env.DB.batch(sah.map(k => simpan(env, acak(8), k, kini, mod))); } catch (e) { return tanpaTabel(e) || Promise.reject(e); }
    return json({masuk: sah.length}, 201);
  },
};
