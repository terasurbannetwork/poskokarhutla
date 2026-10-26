/* Pendataan Satu Data BNPB, Fase 1 (docs/bnpb/PENDATAAN.md). Skema: migrations/0060_pendataan.sql. Spek bersama peramban dan Worker: public/bnpb/pendataan_spek.js.
   - Responden membuat akun sendiri di /pendataan (status menunggu sampai Super Admin menyetujui). Sandi pilihan sendiri >= 10 huruf, PBKDF2-SHA256 100.000 iterasi.
   - Sesi = cookie sesi_pendataan (hanya sha256 di D1). Kiriman lewat sesi wajib header x-pb: 1 (pola src/staf.js).
   - Akun aktif mengisi isian miliknya dan MEMBACA isian terkirim rekan satu unit (nama pengisi saja, tanpa WA/email). Super Admin (superOK) melihat semuanya.
   - Tabel belum dimigrasi di produksi: rute membalas 503 sopan.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), serentak bisa lolos satu-dua di atas batas. Pencocokan unit_lain 'lainnya' tanpa beda huruf hanya untuk ASCII (lower() SQLite). */
import {json, gagal, acak, sha, bacaBody, bacaBytes, normalWA, ipHash, turnstileOK, adminOK} from "./worker.js";
import {tx, superOK, RE_EMAIL} from "./posko.js";
import {sandiAcak} from "./instansi.js";
import {laju, lajuIP, halamanBnpbPublik} from "./bnpb.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";
import * as S from "../public/bnpb/pendataan_spek.js";

const JAM = 3600e3, HARI = 24 * JAM, SESI_UMUR = 30 * HARI, COOKIE = "sesi_pendataan", MAKS_ISIAN = 200, MAKS_JSON = 65536;
const tabelBelum = e => /no such table: pdt_/i.test(String(e?.message || e));
const UNIT_KUNCI = Object.keys(S.UNIT);
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");

/* ================================================================ sandi dan sesi */
export async function hashSandi(garam, sandi) {
  const k = await crypto.subtle.importKey("raw", enc.encode(sandi), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name: "PBKDF2", hash: "SHA-256", salt: enc.encode(garam), iterations: 100000}, k, 256));
}
const samaTeks = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const sandiBaru = async sandi => { const garam = acak(16); return {garam, sandi_hash: await hashSandi(garam, sandi)}; };
const cookieSet = (nilai, umur) => `${COOKIE}=${nilai}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${umur}`;
const tokenDari = req => (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})(?:;|$)`))?.[1] ?? null;
const akunRingkas = a => ({id: a.id, username: a.username, nama: a.nama, nip: a.nip, jabatan: a.jabatan, unit: a.unit, unit_lain: a.unit_lain, email: a.email, wa: a.wa, status: a.status, wajib_ganti: !!a.wajib_ganti});
async function muatSesi(env, req, kini) {
  const t = tokenDari(req); if (!t) return null;
  return env.DB.prepare("SELECT a.* FROM pdt_sesi s JOIN pdt_akun a ON a.id = s.akun_id WHERE s.token_sha = ? AND s.kedaluwarsa > ? AND a.status = 'aktif'").bind(await sha(t), kini).first();
}
/* {a} bila sesi sah, atau {res} Response galat. isian = rute kerja: sandi awal hasil reset wajib diganti dulu. */
async function sesi(env, req, kini, {tulis = true, isian = true} = {}) {
  if (!tokenDari(req)) return {res: gagal(401, "belum masuk atau sesi berakhir; masuk lagi")};
  if (tulis && req.headers.get("x-pb") !== "1") return {res: gagal(403, "kiriman wajib membawa header x-pb: 1")};
  const a = await muatSesi(env, req, kini);
  if (!a) return {res: gagal(401, "belum masuk atau sesi berakhir; masuk lagi")};
  if (isian && a.wajib_ganti) return {res: gagal(403, "kamu harus membuat sandi baru dulu sebelum mengisi")};
  return {a};
}

/* ================================================================ daftar, masuk, keluar, saya, ganti sandi */
const RE_NIP = /^[0-9A-Za-z .\/-]{5,30}$/;
/* murni: isian orang -> {v} atau {galat} */
export function cekDaftar(o) {
  const t = (k, min, maks, nama) => { const s = tx(o[k], maks); return s === undefined ? {g: `${nama} maksimal ${maks} karakter`} : !s ? {g: `${nama} wajib diisi`} : s.length < min ? {g: `${nama} minimal ${min} karakter`} : {v: s}; };
  const f = {nama: t("nama", 2, 100, "nama"), jabatan: t("jabatan", 2, 120, "jabatan"), email: t("email", 6, 254, "email"), wa: t("wa", 8, 30, "nomor WhatsApp")};
  for (const x of Object.values(f)) if (x.g) return {galat: x.g};
  const v = {nama: f.nama.v, jabatan: f.jabatan.v, email: f.email.v.toLowerCase(), wa: normalWA(f.wa.v)};
  if (!RE_EMAIL.test(v.email)) return {galat: "email tidak sah"};
  if (!v.wa) return {galat: "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)"};
  const nip = tx(o.nip, 30); if (nip === undefined) return {galat: "NIP maksimal 30 karakter"};
  if (nip && !RE_NIP.test(nip)) return {galat: "NIP hanya huruf, angka, titik, garis, spasi, 5 sampai 30 karakter"};
  v.nip = nip || null;
  if (typeof o.unit !== "string" || !UNIT_KUNCI.includes(o.unit)) return {galat: "unit tidak dikenal"};
  v.unit = o.unit;
  const ul = tx(o.unit_lain, 120);
  if (ul === undefined) return {galat: "nama unit maksimal 120 karakter"};
  if (v.unit === "lainnya" && (!ul || ul.length < 2)) return {galat: "tulis nama unitmu (minimal 2 karakter)"};
  v.unit_lain = v.unit === "lainnya" ? ul : null;
  v.username = typeof o.username === "string" ? o.username.trim().toLowerCase() : "";
  if (!/^[a-z0-9]{5,30}$/.test(v.username)) return {galat: "username 5 sampai 30 karakter, huruf kecil dan angka saja"};
  if (typeof o.sandi !== "string" || o.sandi.length < 10 || o.sandi.length > 100) return {galat: "sandi minimal 10 huruf"};
  v.sandi = o.sandi;
  return {v};
}
async function daftar(env, req, kini) {
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekDaftar(b.o); if (c.galat) return gagal(400, c.galat);
  const lj = await lajuIP(env, req, "pendataan.daftar", [[JAM, 5], [HARI, 20]], kini); if (lj) return lj;   // laju dulu: Turnstile memanggil layanan luar
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const v = c.v;
  if ((await env.DB.prepare("SELECT count(*) n FROM pdt_akun WHERE status = 'menunggu'").first()).n >= 500) return gagal(503, "antrean pendaftaran sedang penuh; coba lagi besok");
  const ada = await env.DB.prepare("SELECT username, email FROM pdt_akun WHERE username = ? OR email = ?").bind(v.username, v.email).first();
  if (ada?.username === v.username) return gagal(409, "username sudah dipakai; pilih yang lain");
  if (ada) return json({status: "menunggu"}, 201);   // email sudah terdaftar: jawaban sama dengan sukses supaya keberadaan akun pegawai tidak bisa dicek dari luar
  const n = await sandiBaru(v.sandi);
  try {
    await env.DB.prepare(`INSERT INTO pdt_akun (id, username, nama, nip, jabatan, unit, unit_lain, email, wa, garam, sandi_hash, wajib_ganti, status, dibuat, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'menunggu', ?, 0)`).bind(acak(8), v.username, v.nama, v.nip, v.jabatan, v.unit, v.unit_lain, v.email, v.wa, n.garam, n.sandi_hash, kini).run();
  } catch (e) { if (/UNIQUE constraint failed: pdt_akun\.username/i.test(String(e?.message || e))) return gagal(409, "username sudah dipakai; pilih yang lain"); if (/UNIQUE constraint failed/i.test(String(e?.message || e))) return json({status: "menunggu"}, 201); throw e; }
  return json({status: "menunggu"}, 201);
}
const gagalBanyak = async (env, kunci, aksi, maks, kini) => (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(kunci, aksi, kini - JAM).first()).n >= maks;
const catatLaju = (env, kunci, aksi, kini) => env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(kunci, aksi, kini);
const PESAN_STATUS = {menunggu: "akun kamu menunggu persetujuan Super Admin", ditolak: "pendaftaran akunmu ditolak; hubungi Pusdatin BNPB", dicabut: "akunmu sudah dicabut; hubungi Pusdatin BNPB"};
/* Sandi diperiksa DULU; hanya jalur salah yang dihitung dan bisa 429. Status akun baru dibuka sesudah sandi benar. (username + IP) 8 per jam, per username 200, per IP 30. */
async function masuk(env, req, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const user = typeof b.o.username === "string" ? b.o.username.trim().toLowerCase().slice(0, 60) : "", sandi = typeof b.o.sandi === "string" ? b.o.sandi.slice(0, 100) : "";
  const ip = await ipHash(env, req), kUserIp = "pi:" + (await sha(user + "|" + ip)).slice(0, 40), kUser = "pu:" + (await sha(user)).slice(0, 40);
  const a = /^[a-z0-9]{5,60}$/.test(user) ? await env.DB.prepare("SELECT * FROM pdt_akun WHERE username = ?").bind(user).first() : null;
  /* Beda dari staf.js: sandi di sini pilihan sendiri (bisa ditebak), jadi kunci diperiksa SEBELUM sandi. Sesudah terkunci sandi benar pun 429,
     kalau tidak, 429 hanya menghentikan pencatatan, bukan tebakan. Harganya: penyerang bisa mengunci satu username dari satu IP selama sejam. */
  const kunci = await gagalBanyak(env, kUserIp, "pendataan.gagal_ui", 8, kini) || await gagalBanyak(env, kUser, "pendataan.gagal_u", 200, kini) || await gagalBanyak(env, ip, "pendataan.gagal_ip", 30, kini);
  if (kunci) return gagal(429, "terlalu banyak percobaan masuk yang salah; coba lagi sejam lagi", {"retry-after": "3600"});
  const cek = await hashSandi(a?.garam ?? "0".repeat(32), sandi);   // hash tetap dihitung untuk username tak dikenal
  if (!a || !samaTeks(cek, a.sandi_hash)) {
    await env.DB.batch([catatLaju(env, kUserIp, "pendataan.gagal_ui", kini), catatLaju(env, kUser, "pendataan.gagal_u", kini), catatLaju(env, ip, "pendataan.gagal_ip", kini)]);
    return gagal(401, "username atau sandi salah");
  }
  if (a.status !== "aktif") return gagal(403, PESAN_STATUS[a.status] || "akun belum aktif");
  const token = acak(32);
  await env.DB.batch([env.DB.prepare("INSERT INTO pdt_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(await sha(token), a.id, kini, kini + SESI_UMUR),
    env.DB.prepare("DELETE FROM pdt_sesi WHERE akun_id = ? AND kedaluwarsa <= ?").bind(a.id, kini)]);
  const r = json({akun: akunRingkas(a)}); r.headers.append("set-cookie", cookieSet(token, SESI_UMUR / 1000)); return r;
}
async function keluar(env, req) {
  const t = tokenDari(req);
  if (t) await env.DB.prepare("DELETE FROM pdt_sesi WHERE token_sha = ?").bind(await sha(t)).run();
  const r = json({ok: true}); r.headers.append("set-cookie", cookieSet("", 0)); return r;
}

/* ---------------- bentuk isian ---------------- */
const baca = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
const berkasBentuk = r => ({id: r.id, nama: r.nama, mime: r.mime, ukuran: r.ukuran, dibuat: r.dibuat});
function kelompok(berkas) { const m = new Map(); for (const b of berkas) { if (!m.has(b.isian_id)) m.set(b.isian_id, []); m.get(b.isian_id).push(berkasBentuk(b)); } return m; }
const isianBentuk = (r, m) => ({id: r.id, jenis: r.jenis, status: r.status, isi: baca(r.isi), dibuat: r.dibuat, diubah: r.diubah, dikirim: r.dikirim, berkas: m.get(r.id) || []});
const BKOLOM = "b.id, b.isian_id, b.nama, b.mime, b.ukuran, b.dibuat";
/* kondisi 'satu unit' terhadap pemilik isian o (alias): unit sama; 'lainnya' juga nama unit yang sama tanpa beda huruf */
const SATU_UNIT = "o.unit = ?1 AND (o.unit <> 'lainnya' OR lower(o.unit_lain) = lower(?2))";
const satuUnit = (a, o) => a.unit === o.unit && (a.unit !== "lainnya" || String(a.unit_lain).toLowerCase() === String(o.unit_lain).toLowerCase());

async function saya(env, req, kini) {
  const s = await sesi(env, req, kini, {tulis: false, isian: false}); if (s.res) return s.res;
  const a = s.a;
  if (a.wajib_ganti) return json({akun: akunRingkas(a), isian: [], rekan: [], pesan: "kamu harus membuat sandi baru dulu sebelum mengisi"});
  const [mine, bm, rk, br] = await Promise.all([
    env.DB.prepare("SELECT * FROM pdt_isian WHERE akun_id = ? ORDER BY diubah DESC LIMIT 200").bind(a.id).all(),
    env.DB.prepare(`SELECT ${BKOLOM} FROM pdt_berkas b JOIN pdt_isian i ON i.id = b.isian_id WHERE i.akun_id = ? ORDER BY b.dibuat`).bind(a.id).all(),
    env.DB.prepare(`SELECT i.id, i.jenis, i.isi, i.dikirim, o.nama pengisi FROM pdt_isian i JOIN pdt_akun o ON o.id = i.akun_id WHERE i.status = 'terkirim' AND o.id <> ?3 AND o.status = 'aktif' AND o.dummy = 0 AND ${SATU_UNIT} ORDER BY i.dikirim DESC LIMIT 500`).bind(a.unit, a.unit_lain ?? "", a.id).all(),
    env.DB.prepare(`SELECT ${BKOLOM} FROM pdt_berkas b JOIN pdt_isian i ON i.id = b.isian_id JOIN pdt_akun o ON o.id = i.akun_id WHERE i.status = 'terkirim' AND o.id <> ?3 AND o.status = 'aktif' AND o.dummy = 0 AND ${SATU_UNIT} ORDER BY b.dibuat`).bind(a.unit, a.unit_lain ?? "", a.id).all(),
  ]);
  const mb = kelompok(bm.results), rb = kelompok(br.results);
  return json({akun: akunRingkas(a), isian: mine.results.map(r => isianBentuk(r, mb)),
    rekan: rk.results.map(r => ({id: r.id, jenis: r.jenis, isi: baca(r.isi), dikirim: r.dikirim, pengisi: r.pengisi, berkas: rb.get(r.id) || []}))});
}
async function gantiSandi(env, req, kini) {
  const s = await sesi(env, req, kini, {isian: false}); if (s.res) return s.res;
  const a = s.a, b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.sandi_lama !== "string" || typeof b.o.sandi !== "string") return gagal(400, "sandi_lama dan sandi wajib");
  if (b.o.sandi.length < 10 || b.o.sandi.length > 100) return gagal(400, "sandi baru minimal 10 huruf");
  const lj = await laju(env, a.id, "pendataan.gantisandi", [[JAM, 10]], kini); if (lj) return lj;
  if (!samaTeks(await hashSandi(a.garam, b.o.sandi_lama.slice(0, 100)), a.sandi_hash)) return gagal(401, "sandi lama salah");
  if (b.o.sandi === b.o.sandi_lama) return gagal(400, "sandi baru harus beda dari yang lama");
  const n = await sandiBaru(b.o.sandi);
  await env.DB.batch([env.DB.prepare("UPDATE pdt_akun SET garam = ?, sandi_hash = ?, wajib_ganti = 0 WHERE id = ?").bind(n.garam, n.sandi_hash, a.id),
    env.DB.prepare("DELETE FROM pdt_sesi WHERE akun_id = ? AND token_sha != ?").bind(a.id, await sha(tokenDari(req)))]);
  return json({ok: true});
}

/* ================================================================ isian */
async function simpanIsian(env, req, kini) {
  const s = await sesi(env, req, kini); if (s.res) return s.res;
  const a = s.a, b = await bacaBody(req, 70000); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (typeof o.jenis !== "string" || !S.JENIS.includes(o.jenis)) return gagal(400, "jenis harus data, aplikasi, atau umum");
  if (typeof o.kirim !== "boolean") return gagal(400, "kirim harus true atau false");
  if (o.id != null && !(typeof o.id === "string" && /^[0-9a-f]{16}$/.test(o.id))) return gagal(400, "id isian tidak sah");
  const lj = await laju(env, a.id, "pendataan.isian", [[JAM, 300]], kini); if (lj) return lj;
  const lama = o.id ? await env.DB.prepare("SELECT * FROM pdt_isian WHERE id = ? AND akun_id = ?").bind(o.id, a.id).first() : null;
  if (o.id && !lama) return gagal(404, "isian tidak ada");
  if (lama && lama.jenis !== o.jenis) return gagal(400, "jenis isian tidak bisa diubah");
  const p = S.periksaIsian(o.jenis, o.isi, o.kirim); if (p.galat) return gagal(400, p.galat);
  const teks = JSON.stringify(p.isi);
  if (enc.encode(teks).length > MAKS_JSON) return gagal(413, `isian lebih dari ${MAKS_JSON} byte`);
  const status = o.kirim ? "terkirim" : "draf", dikirim = o.kirim ? kini : null;
  if (lama) {
    await env.DB.prepare("UPDATE pdt_isian SET isi = ?, status = ?, diubah = ?, dikirim = ? WHERE id = ? AND akun_id = ?").bind(teks, status, kini, dikirim, lama.id, a.id).run();
    return json({isian: await satuIsian(env, lama.id)});
  }
  if ((await env.DB.prepare("SELECT count(*) n FROM pdt_isian WHERE akun_id = ?").bind(a.id).first()).n >= MAKS_ISIAN) return gagal(409, `batas ${MAKS_ISIAN} isian per akun sudah tercapai`);
  if (o.jenis === "umum" && await env.DB.prepare("SELECT 1 FROM pdt_isian WHERE akun_id = ? AND jenis = 'umum'").bind(a.id).first()) return gagal(409, "isian kebutuhan dan kendala hanya satu per akun; ubah yang sudah ada");
  const id = acak(8);
  try { await env.DB.prepare("INSERT INTO pdt_isian (id, akun_id, unit, jenis, isi, status, dibuat, diubah, dikirim, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)").bind(id, a.id, a.unit, o.jenis, teks, status, kini, kini, dikirim).run(); }
  catch (e) { if (/UNIQUE constraint failed/i.test(String(e?.message || e))) return gagal(409, "isian kebutuhan dan kendala hanya satu per akun"); throw e; }
  return json({isian: await satuIsian(env, id)}, 201);
}
async function satuIsian(env, id) {
  const [r, b] = await Promise.all([env.DB.prepare("SELECT * FROM pdt_isian WHERE id = ?").bind(id).first(), env.DB.prepare(`SELECT ${BKOLOM} FROM pdt_berkas b WHERE b.isian_id = ? ORDER BY b.dibuat`).bind(id).all()]);
  return isianBentuk(r, kelompok(b.results));
}
const hapusR2 = (env, daftar) => Promise.all(daftar.map(b => env.MEDIA?.delete(`pendataan/${b.isian_id}/${b.id}`).catch(() => {})));
async function hapus(env, req, kini, id) {
  const s = await sesi(env, req, kini); if (s.res) return s.res;
  const i = await env.DB.prepare("SELECT id FROM pdt_isian WHERE id = ? AND akun_id = ?").bind(id, s.a.id).first(); if (!i) return gagal(404, "isian tidak ada");
  const bs = (await env.DB.prepare("SELECT id, isian_id FROM pdt_berkas WHERE isian_id = ?").bind(id).all()).results;
  await hapusR2(env, bs);
  await env.DB.batch([env.DB.prepare("DELETE FROM pdt_berkas WHERE isian_id = ?").bind(id), env.DB.prepare("DELETE FROM pdt_isian WHERE id = ?").bind(id)]);
  return json({ok: true});
}

/* ================================================================ berkas */
const OOXML = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
const mulai = (b, ...x) => x.every((v, i) => b[i] === v);
/* murni: isi byte cocok dengan jenis yang diklaim */
export function magicSah(mime, b) {
  if (mime === "application/pdf") return mulai(b, 0x25, 0x50, 0x44, 0x46);
  if (OOXML.includes(mime)) return mulai(b, 0x50, 0x4b, 0x03, 0x04);
  if (mime === "application/vnd.ms-excel" || mime === "application/msword") return mulai(b, 0xd0, 0xcf, 0x11, 0xe0);
  if (mime === "image/png") return mulai(b, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mime === "image/jpeg") return mulai(b, 0xff, 0xd8, 0xff);
  if (mime === "text/csv") { if (b.includes(0)) return false; try { new TextDecoder("utf-8", {fatal: true}).decode(b); return true; } catch (e) { return false; } }
  return false;
}
const namaBersih = t => String(t).normalize("NFC").replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "").replace(/[\/\\]/g, "_").replace(/\s+/g, " ").trim();
async function unggah(env, req, kini, id) {
  const s = await sesi(env, req, kini); if (s.res) return s.res;
  const a = s.a;
  const i = await env.DB.prepare("SELECT id FROM pdt_isian WHERE id = ? AND akun_id = ?").bind(id, a.id).first(); if (!i) return gagal(404, "isian tidak ada");
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum tersedia");
  const mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!Object.hasOwn(S.BERKAS.tipe, mime)) return gagal(415, "jenis berkas tidak diterima (PDF, Excel, CSV, Word, PowerPoint, PNG, JPEG)");
  let nama; try { nama = namaBersih(decodeURIComponent(req.headers.get("x-nama") || "")); } catch (e) { return gagal(400, "x-nama tidak sah"); }
  if (!nama || nama.length > 160) return gagal(400, "nama berkas 1 sampai 160 karakter (header x-nama)");
  const lj = await laju(env, a.id, "pendataan.unggah", [[JAM, 60]], kini); if (lj) return lj;
  if ((await env.DB.prepare("SELECT count(*) n FROM pdt_berkas WHERE isian_id = ?").bind(id).first()).n >= S.BERKAS.per_isian) return gagal(409, `maksimal ${S.BERKAS.per_isian} berkas per isian`);
  const r = await bacaBytes(req, S.BERKAS.maks); if (r.galat) return gagal(r.status || 400, r.galat);
  if (!r.b.length) return gagal(400, "berkas kosong");
  if (!magicSah(mime, r.b)) return gagal(400, "isi berkas tidak cocok dengan jenisnya");
  const bid = acak(8), kunci = `pendataan/${id}/${bid}`;
  await env.MEDIA.put(kunci, r.b, {httpMetadata: {contentType: mime}});
  try { await env.DB.prepare("INSERT INTO pdt_berkas (id, isian_id, nama, mime, ukuran, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, 0)").bind(bid, id, nama, mime, r.b.length, kini).run(); }
  catch (e) { await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
  return json({berkas: {id: bid, nama, mime, ukuran: r.b.length, dibuat: kini}}, 201);
}
const rfc5987 = t => encodeURIComponent(t).replace(/['()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
async function unduh(env, req, kini, id) {
  const r = await env.DB.prepare("SELECT b.nama, b.mime, b.isian_id, i.status, i.akun_id, o.unit, o.unit_lain, o.status status_akun, o.dummy FROM pdt_berkas b JOIN pdt_isian i ON i.id = b.isian_id JOIN pdt_akun o ON o.id = i.akun_id WHERE b.id = ?").bind(id).first();
  const a = await muatSesi(env, req, kini);
  const pemilik = !!(r && a && !a.wajib_ganti && (r.akun_id === a.id || (r.status === "terkirim" && r.status_akun === "aktif" && !r.dummy && satuUnit(a, r))));
  if (!pemilik) {
    if (!await superOK(env, req)) return a ? gagal(404, "berkas tidak ada") : gagal(401, "belum masuk atau sesi berakhir; masuk lagi");
    if (!r) return gagal(404, "berkas tidak ada");
  }
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum tersedia");
  const o = await env.MEDIA.get(`pendataan/${r.isian_id}/${id}`); if (!o) return gagal(404, "berkas tidak ada");
  const asli = r.nama.replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(o.body, {headers: {"content-type": r.mime, "content-disposition": `attachment; filename="${asli}"; filename*=UTF-8''${rfc5987(r.nama)}`, "x-content-type-options": "nosniff", "cache-control": "private, no-store"}});
}
async function hapusBerkas(env, req, kini, id) {
  const s = await sesi(env, req, kini); if (s.res) return s.res;
  const b = await env.DB.prepare("SELECT b.id, b.isian_id FROM pdt_berkas b JOIN pdt_isian i ON i.id = b.isian_id WHERE b.id = ? AND i.akun_id = ?").bind(id, s.a.id).first(); if (!b) return gagal(404, "berkas tidak ada");
  await hapusR2(env, [b]);
  await env.DB.prepare("DELETE FROM pdt_berkas WHERE id = ?").bind(id).run();
  return json({ok: true});
}

/* ================================================================ Super Admin: monitoring */
const tolakSuper = () => gagal(403, "hanya Super Admin (secret SUPER_ADMIN berisi awalan akun)");
const STATUS_UNIT = ["Belum ada akun", "Akun menunggu", "Belum mengisi", "Draf", "Sudah kirim"];
/* murni: akun[] dan isian[] (baris D1) milik satu unit -> baris monitoring */
export function barisUnit(akun, isian) {
  const aktif = akun.filter(a => a.status === "aktif"), menunggu = akun.filter(a => a.status === "menunggu");
  const kirim = j => isian.filter(i => i.status === "terkirim" && i.jenis === j).length, draf = isian.filter(i => i.status === "draf").length;
  const terkirim = isian.filter(i => i.status === "terkirim");
  const status = aktif.length ? (terkirim.length ? "Sudah kirim" : isian.length ? "Draf" : "Belum mengisi") : menunggu.length ? "Akun menunggu" : "Belum ada akun";
  return {status, akun_aktif: aktif.length, akun_menunggu: menunggu.length, data: kirim("data"), aplikasi: kirim("aplikasi"), umum: kirim("umum"), draf,
    terakhir: terkirim.reduce((m, i) => Math.max(m, i.dikirim || 0), 0) || null, pic: aktif.filter(a => !a.dummy).map(a => ({nama: a.nama, wa: a.wa}))};   // nomor akun dummy bisa milik orang sungguhan: tanpa tautan tagih
}
async function ringkas(env, req) {
  if (!await superOK(env, req)) return tolakSuper();
  const [ak, is, br] = await Promise.all([
    env.DB.prepare("SELECT id, username, nama, nip, jabatan, unit, unit_lain, email, wa, status, wajib_ganti, dibuat, diputus, dummy FROM pdt_akun ORDER BY dibuat DESC LIMIT 2000").all(),
    env.DB.prepare("SELECT * FROM pdt_isian ORDER BY diubah DESC LIMIT 5000").all(),
    env.DB.prepare(`SELECT ${BKOLOM}, b.dummy FROM pdt_berkas b ORDER BY b.dibuat LIMIT 10000`).all()]);
  const akun = ak.results, per = new Map(akun.map(a => [a.id, a])), mb = kelompok(br.results);
  const lih = a => a.unit === "lainnya" ? "lainnya:" + String(a.unit_lain).toLowerCase() : a.unit;
  const grup = new Map();
  for (const a of akun) { const k = lih(a); if (!grup.has(k)) grup.set(k, {akun: [], isian: [], unit_lain: a.unit_lain}); grup.get(k).akun.push(a); }
  for (const i of is.results) { const a = per.get(i.akun_id); if (a) grup.get(lih(a)).isian.push(i); }
  const kosongG = {akun: [], isian: []};
  const unit = S.UNIT_SASARAN.map(k => ({kunci: k, nama: S.UNIT[k], ...barisUnit((grup.get(k) || kosongG).akun, (grup.get(k) || kosongG).isian)}));
  const lainnya = [...grup.entries()].filter(([k]) => k.startsWith("lainnya:")).map(([, g]) => ({unit_lain: g.unit_lain, ...barisUnit(g.akun, g.isian)})).sort((x, y) => x.unit_lain.localeCompare(y.unit_lain, "id"));
  const semua = [...unit, ...lainnya], jml = k => semua.reduce((n, u) => n + u[k], 0);
  return json({ringkas: {unit_total: unit.length, unit_sudah: unit.filter(u => u.status === "Sudah kirim").length, akun_aktif: akun.filter(a => a.status === "aktif").length, akun_menunggu: akun.filter(a => a.status === "menunggu").length,
      data: jml("data"), aplikasi: jml("aplikasi"), umum: jml("umum"), draf: jml("draf")},
    unit, lainnya,
    akun: akun.map(a => ({...a, wajib_ganti: !!a.wajib_ganti, isian: is.results.filter(i => i.akun_id === a.id).length})),
    isian: is.results.map(i => { const a = per.get(i.akun_id) || {}; return {...isianBentuk(i, mb), akun_id: i.akun_id, unit: i.unit, unit_lain: a.unit_lain ?? null, pengisi: a.nama ?? "", jabatan: a.jabatan ?? "", dummy: i.dummy,
      judul: S.judulIsian(i.jenis, baca(i.isi))}; }),
    status_unit: STATUS_UNIT});
}
async function aksiAkun(env, req, kini, id) {
  const mod = await superOK(env, req); if (!mod) return tolakSuper();
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  const a = await env.DB.prepare("SELECT id, username, status FROM pdt_akun WHERE id = ?").bind(id).first(); if (!a) return gagal(404, "akun tidak ada");
  const cabutSesi = env.DB.prepare("DELETE FROM pdt_sesi WHERE akun_id = ?").bind(id);
  const ubah = (dari, ke, putus) => dari.includes(a.status) ? env.DB.batch([env.DB.prepare("UPDATE pdt_akun SET status = ?, diputus = ?, diputus_oleh = ? WHERE id = ?").bind(ke, putus ? kini : null, putus ? mod : null, id), cabutSesi]).then(() => json({id, status: ke})) : gagal(409, `akun berstatus ${a.status}, aksi ini tidak berlaku`);
  switch (b.o.aksi) {
    case "setujui": return ubah(["menunggu", "ditolak", "dicabut"], "aktif", false);
    case "tolak": return ubah(["menunggu"], "ditolak", true);
    case "cabut": return ubah(["aktif"], "dicabut", true);
    case "reset": {
      if (a.status !== "aktif") return gagal(409, "hanya akun aktif yang bisa direset");
      const sandi = sandiAcak(), n = await sandiBaru(sandi);
      await env.DB.batch([env.DB.prepare("UPDATE pdt_akun SET garam = ?, sandi_hash = ?, wajib_ganti = 1 WHERE id = ?").bind(n.garam, n.sandi_hash, id), cabutSesi]);
      return json({id, username: a.username, sandi});   // tampil sekali
    }
    default: return gagal(400, "aksi harus setujui, tolak, cabut, atau reset");
  }
}

/* ---------------- ekspor CSV ---------------- */
const sel = v => { let t = String(v ?? "").replace(/\r?\n/g, " ").trim(); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
const wibMenit = t => t ? new Date(t + 7 * JAM).toISOString().slice(0, 16).replace("T", " ") : "";
async function ekspor(env, req, url) {
  if (!await superOK(env, req)) return tolakSuper();
  const jenis = url.searchParams.get("jenis") || "";
  if (!S.JENIS.includes(jenis)) return gagal(400, "jenis harus data, aplikasi, atau umum");
  const rs = (await env.DB.prepare("SELECT i.*, o.nama pengisi, o.jabatan, o.unit_lain FROM pdt_isian i JOIN pdt_akun o ON o.id = i.akun_id WHERE i.jenis = ? ORDER BY i.unit, i.diubah DESC LIMIT 5000").bind(jenis).all()).results;
  const kolom = S.KOLOM[jenis], baris = [["Unit", "Pengisi", "Jabatan", "Status", "Dikirim (WIB)", ...kolom.map(c => c.label)].map(sel).join(",")];
  for (const r of rs) { const isi = baca(r.isi);
    baris.push([r.unit === "lainnya" ? "Lainnya: " + r.unit_lain : S.UNIT[r.unit], r.pengisi, r.jabatan, r.status, wibMenit(r.dikirim), ...kolom.map(c => S.teksKolom(c, isi))].map(sel).join(",")); }
  return new Response("\uFEFF" + baris.join("\r\n") + "\r\n", {headers: {"content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="pendataan-${jenis}.csv"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff"}});
}

/* ================================================================ dummy (DUMMY.md) */
const NAMA_DATA = ["Rekap kejadian bencana harian", "Data korban dan pengungsi", "Laporan kerusakan rumah", "Stok logistik gudang regional", "Realisasi anggaran tanggap darurat",
  "Peta rawan bencana kabupaten", "Daftar personel siaga", "Rekap bantuan tersalur"];
const NAMA_APL = ["Dasbor Data Bencana", "Sistem Informasi Logistik", "Aplikasi Laporan Lapangan", "Peta Kejadian Interaktif"];
function isiDummy(jenis, n, lainnya, kirim) {
  let o;
  if (jenis === "data") o = {nama: `${NAMA_DATA[n % NAMA_DATA.length]} ${2020 + (n % 6)}`, isi: "Jumlah kejadian, korban, rumah rusak, dan luas terdampak per kabupaten", jenis_data: ["Kejadian bencana", "Dampak dan korban"], bencana: ["Banjir", "Tanah longsor"],
    frekuensi: ["Harian", "Mingguan", "Bulanan"][n % 3], jam_siap: "08:00", bentuk: ["Excel atau CSV", "PDF"], pembuat: "Analis data", dilaporkan_ke: ["Kepala BNPB", "Direktur"], disimpan_di: "Basis data internal",
    cara_akses: ["Ekspor berkas (Excel, CSV)"], cakupan: "Kabupaten/kota", keyakinan: "Laporan BPBD", akses: "Terbatas internal BNPB dan K/L", berbagi: ["Siap ekspor berkala"], ketersediaan: "Ada dan rutin", sejak: 2015 + (n % 8)};
  else if (jenis === "aplikasi") o = {nama: `${NAMA_APL[n % NAMA_APL.length]} ${n + 1}`, alamat: "https://contoh.go.id/aplikasi", penjelasan: "Dipakai tim untuk merekap dan menampilkan data kejadian", fungsi: ["Basis data", "Dasbor atau visualisasi"],
    data_disimpan: "Kejadian, korban, dan kerusakan per wilayah", pengelola: S.UNIT_SASARAN.map(k => S.UNIT[k])[n % 10], pengembang: "Tim internal unit", pengguna: ["Unit sendiri", "Seluruh BNPB"], status: "Aktif dipakai", akses_data: ["Dasbor web"]};
  else o = {kebutuhan: "Data korban dan kerusakan yang terbarui tiap hari dan seragam antar unit", prioritas: "Korban, pengungsi, rumah rusak", kendala: ["Format tidak seragam", "Data sering terlambat"], kendala_cerita: "Kiriman dari daerah sering telat",
    usul: "Satu format baku untuk semua unit", setuju: "Ya, dengan catatan", setuju_catatan: "Data keuangan perlu persetujuan pimpinan"};
  if (lainnya && jenis === "data") Object.assign(o, {jenis_data: ["Spasial atau peta", "Lainnya"], jenis_data_lain: "Citra drone lapangan", cara_akses: ["API", "Lainnya"], cara_akses_lain: "Grup WA koordinasi", ketersediaan: "Ada sebagian", alasan: "Baru sebagian provinsi yang mengirim"});
  if (lainnya && jenis === "aplikasi") Object.assign(o, {fungsi: ["Peta atau GIS", "Lainnya"], fungsi_lain: "Pemantauan drone"});
  const p = S.periksaIsian(jenis, o, kirim); if (p.galat) throw new Error("dummy pendataan tidak lolos periksaIsian: " + p.galat);
  return p.isi;
}
/* [unit, unit_lain, status akun, [[jenis, kirim, lainnya?], ...]] */
const RENCANA = [
  ["pusdatin", null, "aktif", [["data", 1], ["data", 1], ["data", 1, 1], ["data", 0], ["aplikasi", 1], ["aplikasi", 1], ["umum", 1]]],
  ["pusdatin", null, "aktif", [["data", 1], ["aplikasi", 0]]],
  ["dalops", null, "aktif", [["data", 1], ["data", 1], ["data", 0], ["umum", 1]]],
  ["dalops", null, "menunggu", []],
  ["pdw1", null, "aktif", [["data", 1, 1]]],
  ["pdw1", null, "dicabut", []],
  ["pdw2", null, "aktif", [["data", 0], ["data", 0]]],
  ["pdw3", null, "aktif", []],
  ["rrp", null, "menunggu", []],
  ["rri", null, "aktif", [["aplikasi", 1, 1], ["umum", 0]]],
  ["logistik", null, "aktif", [["data", 1], ["data", 1], ["aplikasi", 1]]],
  ["logistik", null, "aktif", [["aplikasi", 1]]],
  ["jaringan_logistik", null, "ditolak", []],
  ["lainnya", "Biro Hukum dan Kerja Sama", "aktif", [["data", 1, 1]]],
  ["lainnya", "biro hukum dan kerja sama", "aktif", [["umum", 1]]],
];
const PDF_MINIMAL = enc.encode("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
async function dummy(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return tolakSuper();
  const b = await bacaBody(req, 256); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "hapus") {
    const bs = (await env.DB.prepare("SELECT id, isian_id FROM pdt_berkas WHERE dummy = 1 OR isian_id IN (SELECT id FROM pdt_isian WHERE dummy = 1)").all()).results;
    await hapusR2(env, bs);
    const hit = await env.DB.batch([
      env.DB.prepare("DELETE FROM pdt_berkas WHERE dummy = 1 OR isian_id IN (SELECT id FROM pdt_isian WHERE dummy = 1)"),
      env.DB.prepare("DELETE FROM pdt_isian WHERE dummy = 1"),
      env.DB.prepare("DELETE FROM pdt_sesi WHERE akun_id IN (SELECT id FROM pdt_akun WHERE dummy = 1)"),
      env.DB.prepare("DELETE FROM pdt_akun WHERE dummy = 1")]);
    return json({ok: true, dihapus: {berkas: hit[0].meta.changes, isian: hit[1].meta.changes, akun: hit[3].meta.changes}});
  }
  if (b.o.aksi !== "isi") return gagal(400, "aksi harus isi atau hapus");
  if ((await env.DB.prepare("SELECT count(*) n FROM pdt_akun WHERE dummy = 1").first()).n) return gagal(409, "data dummy sudah ada; hapus dulu sebelum mengisi lagi");
  const st = [], tanda = acak(2);
  let n = 0, nIsian = 0, berkasPertama = null;
  for (const [unit, ul, status, isian] of RENCANA) {
    n++;
    const aid = acak(8), garam = acak(16), hash = await sha(acak(16));   // tak bisa dipakai masuk
    const kecil = unit.replace(/[^a-z0-9]/g, "");
    st.push(env.DB.prepare(`INSERT INTO pdt_akun (id, username, nama, nip, jabatan, unit, unit_lain, email, wa, garam, sandi_hash, wajib_ganti, status, dibuat, diputus, diputus_oleh, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 1)`).bind(aid, `dummy${kecil}${tanda}${n}`.slice(0, 30), `Responden Dummy ${n}`, "19800101" + String(n).padStart(2, "0"), "Staf Pengolah Data", unit, ul, `dummy${n}.${tanda}@contoh.go.id`, "62812000000" + String(n).padStart(2, "0"),
      garam, hash, status, kini - n * HARI, status === "ditolak" || status === "dicabut" ? kini - HARI : null, status === "ditolak" || status === "dicabut" ? mod : null));
    isian.forEach(([jenis, kirim, lain], k) => {
      const iid = acak(8), t = kini - (n * 3 + k) * 3600e3;
      st.push(env.DB.prepare("INSERT INTO pdt_isian (id, akun_id, unit, jenis, isi, status, dibuat, diubah, dikirim, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
        .bind(iid, aid, unit, jenis, JSON.stringify(isiDummy(jenis, nIsian++, !!lain, !!kirim)), kirim ? "terkirim" : "draf", t - 3600e3, t, kirim ? t : null));
      if (!berkasPertama && jenis === "data" && kirim) berkasPertama = iid;
    });
  }
  const bid = acak(8);
  if (env.MEDIA && berkasPertama) {
    await env.MEDIA.put(`pendataan/${berkasPertama}/${bid}`, PDF_MINIMAL, {httpMetadata: {contentType: "application/pdf"}});
    st.push(env.DB.prepare("INSERT INTO pdt_berkas (id, isian_id, nama, mime, ukuran, dibuat, dummy) VALUES (?, ?, 'contoh-dokumen-dummy.pdf', 'application/pdf', ?, ?, 1)").bind(bid, berkasPertama, PDF_MINIMAL.length, kini));
  }
  try { await env.DB.batch(st); } catch (e) { if (env.MEDIA && berkasPertama) await env.MEDIA.delete(`pendataan/${berkasPertama}/${bid}`).catch(() => {}); throw e; }
  return json({ok: true, akun: RENCANA.length, isian: nIsian, berkas: env.MEDIA && berkasPertama ? 1 : 0}, 201);
}

/* ================================================================ rute */
export function bungkusPendataan(f) {
  return async (...a) => {
    try { return await f(...a); }
    catch (e) { if (tabelBelum(e)) return gagal(503, "pendataan belum diaktifkan (migrasi 0060_pendataan belum diterapkan)"); throw e; }
  };
}
const HALAMAN_ADMIN = async (env, req, kini) => {
  if (!await superOK(env, req) && await adminOK(env, req)) return gagal(403, "halaman ini hanya untuk Super Admin");
  return halamanAdmin(env, req, kini, halamanBnpb("pendataan"));
};
export const RUTE_PENDATAAN = Object.fromEntries(Object.entries({
  "GET /api/pendataan/konfig": env => json({turnstile: env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY || null}),
  "POST /api/pendataan/daftar": (env, req, url, kini) => daftar(env, req, kini),
  "POST /api/pendataan/masuk": (env, req, url, kini) => masuk(env, req, kini),
  "POST /api/pendataan/keluar": (env, req) => keluar(env, req),
  "GET /api/pendataan/saya": (env, req, url, kini) => saya(env, req, kini),
  "POST /api/pendataan/gantisandi": (env, req, url, kini) => gantiSandi(env, req, kini),
  "POST /api/pendataan/isian": (env, req, url, kini) => simpanIsian(env, req, kini),
  "POST /api/pendataan/hapus/:id": (env, req, url, kini, ctx, id) => hapus(env, req, kini, id),
  "POST /api/pendataan/berkas/:id": (env, req, url, kini, ctx, id) => unggah(env, req, kini, id),
  "GET /api/pendataan/berkas/:id": (env, req, url, kini, ctx, id) => unduh(env, req, kini, id),
  "POST /api/pendataan/berkas-hapus/:id": (env, req, url, kini, ctx, id) => hapusBerkas(env, req, kini, id),
  "GET /api/pendataan/admin/ringkas": (env, req) => ringkas(env, req),
  "POST /api/pendataan/admin/akun/:id": (env, req, url, kini, ctx, id) => aksiAkun(env, req, kini, id),
  "GET /api/pendataan/admin/ekspor": (env, req, url) => ekspor(env, req, url),
  "POST /api/pendataan/dummy": (env, req, url, kini) => dummy(env, req, kini),
}).map(([k, f]) => [k, bungkusPendataan(f)]));
RUTE_PENDATAAN["GET /pendataan"] = (env, req, url) => halamanBnpbPublik(env, url, "pendataan", {pribadi: true, turnstile: true});
RUTE_PENDATAAN["GET /admin/pendataan"] = (env, req, url, kini) => HALAMAN_ADMIN(env, req, kini);
