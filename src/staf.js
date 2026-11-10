/* Akun staf BNPB per orang. Skema: migrations/0030_staf.sql. Aturan pemilik (21 Okt 2026):
   - Dibuat HANYA oleh Super Admin (nama, NIP, unit, email, WA, peran, wilayah). Tanpa klaim dokumen. Sandi acak 16 huruf tampil SEKALI, yang disimpan sha256(garam + sandi);
     wajib_ganti = 1 sampai staf membuat sandi baru (acak, tampil sekali), seperti akun instansi (src/instansi.js, mesin sandi yang sama).
   - Peran membuka rute admin yang sesuai sebagai JALUR TAMBAHAN: ADMIN_TOKEN/AKUN_SITUS tetap bekerja persis seperti sebelumnya.
       stafOK(env, req, peran)        = adminOK (token/akun gerbang/sesi admin) ATAU sesi staf berperan: untuk rute baru (Meja Pantau).
       modAtauStaf(env, req, peran)   = modOK ATAU sesi staf berperan: untuk rute lama yang berbasis modOK (akun gerbang tetap TIDAK lolos di sini).
   - Sesi staf = cookie sesi_staf (hanya hash di D1). Kiriman (bukan GET) lewat sesi staf wajib header x-pb: 1 (SameSite=Lax saja tidak menahan POST lintas situs berorigin kosong).
   - Wilayah staf (larik kode provinsi; kosong = nasional) ditegakkan di Meja Pantau dan di aksi tulis rute lama (dalamWilayahStaf).
   ponytail: batas laju masuk baca-lalu-tulis (laju_bnpb), serentak bisa lolos satu-dua di atas batas. Perbandingan sandi === pada hash (sandi 93 bit acak). */
import {json, gagal, acak, sha, bacaBody, normalWA, ipHash, adminOK} from "./worker.js";
import {tx, modOK, superOK, RE_EMAIL} from "./posko.js";
import {PROV, sandiAcak} from "./instansi.js";
import {aksesStaf, halamanAkun} from "./admin_halaman.js";
import {halamanAdmin} from "./statistik.js";
import {pemirsaSesi} from "./pemirsa.js";   // siklus dengan pemirsa.js (sandiBaru): hanya fungsi dipakai saat dijalankan, bukan saat evaluasi modul
import {Galat, pelakuSistem as SIS, pelakuAdmin as ADM, pelakuDiri, sesiDariToken, stafUntukMasuk, stafById, stafAdaNip, stafDaftar, hitungLaju, stmtLaju, stmtSesiBaru, stmtSesiBasi, stmtSesiLain, stmtSesiSemua,
  stmtSandi, stmtCabut, stmtPeran, stmtStafBaru, stmtJejak, tulisJejak, tulisSistem, hapusSesiToken, bersihkanSesi} from "./hak.js";

const JAM = 3600e3, HARI = 24 * JAM, SESI_UMUR = 30 * HARI, COOKIE = "sesi_staf";
/* daftar tetap: sama dengan trigger staf_larik_sah (0030, dibuat ulang 0085 dan 0099) dan public/admin/pantau.js (dijaga pantau.test.mjs).
   operator_cc = operator meja command center karhutla (src/command_center.js): tulis tindak lanjut alert level 3 di /api/cc/*, MELIHAT semua halaman centurisk97.id (GET) dan hak BACA monitor, SLA, OMC,
   inventaris, serta Meja Pantau tanpa jenis regu/akun. TETAP TERTUTUP: nama dan dokumen korban, dokumen dan WA akun instansi, NIP/WA staf, nama/posisi regu, buku kontak penuh, SIPPA, semua rute tulis modul lain. */
export const PERAN = {verifikator: "Verifikator akun instansi", pusdalops: "Pusdalops", analis_konsesi: "Analis konsesi", udara: "Operasi udara", tmc: "TMC/OMC", koordalops: "Koordinator Pusdalops", pimpinan: "Pimpinan", kemitraan: "Kemitraan kampus", operator_cc: "Operator command center", direktori: "Direktori saja"};
export const P_VALIDASI = ["verifikator", "pusdalops"], P_KONSESI = ["analis_konsesi"];
const RE_NIP = /^[0-9A-Za-z .\/-]{5,30}$/;
const SESI = new WeakMap();   // permintaan -> baris staf yang lolos stafSesi (dibaca dalamWilayahStaf tanpa query ulang)

const tabelBelum = e => /no such table: (staf|pantau_)/i.test(String(e?.message || e));
const baca = s => { try { return JSON.parse(s); } catch (e) { return []; } };
const bentuk = r => r && {...r, peran: baca(r.peran), wilayah: baca(r.wilayah)};
const ringkas = s => ({id: s.id, username: s.username, nama: s.nama, nip: s.nip, unit: s.unit, email: s.email, wa: s.wa, peran: s.peran, wilayah: s.wilayah, wajib_ganti: !!s.wajib_ganti, status: s.status, dibuat: s.dibuat, dummy: s.dummy});

/* ================================================================ sesi */
const tokenDari = req => (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})(?:;|$)`))?.[1] ?? null;
async function muatSesi(env, req, kini) {
  const t = tokenDari(req); if (!t) return null;
  return bentuk(await sesiDariToken(env, SIS, await sha(t), kini));
}
/* sesi staf yang boleh dipakai rute kerja: aktif, sandi awal sudah diganti, dan (untuk kiriman) header x-pb. Tanpa cookie: tanpa query. Tabel 0030 belum ada: null (rute lama tak terganggu). */
/* Peran 'direktori' (2 Nov 2026, Ka Biro Hukum Organisasi dan Kelembagaan): HANYA membuka Direktori (src/akademisi.js). Staf yang perannya cuma ini
   tidak dianggap bersesi oleh stafSesi, jadi semua rute kerja lain (Meja Pantau, laporan, SIPPA, drone, korban, kemitraan, command center) menolaknya tanpa disunting satu per satu. */
export const hanyaDirektori = peran => !!peran?.length && peran.every(p => p === "direktori");
export async function stafSesi(env, req, kini = Date.now()) {
  const s = await stafSesiSemua(env, req, kini);
  return s ? hanyaDirektori(s.peran) ? null : s : pemirsaSintetis(env, req);
}
/* ================================================================ akun pemirsa bertab 'pusdalops' (9 Nov 2026): MELIHAT menu Pusdalops, baca saja
   Daftar izin SATU konstanta, per rute (tanpa prefiks longgar). Lolos hanya bila metode GET/HEAD DAN path cocok DAN sesi pemirsa aktif memuat tab 'pusdalops'.
   TIDAK PERNAH masuk: POST/PUT/DELETE, /dummy, /api/wa/masuk, /api/wa/berkas (bahan WA mentah), jejak Meja Pantau (nama pelaku), foto/jejak operasi, vektor wajah, secret, token, nomor HP. */
export const IZIN_PEMIRSA_PUSDALOPS = [
  /^\/admin\/(pantau|laporan-karhutla|omc)$/,   // halaman (kerangka tanpa data); datanya lewat rute di bawah
  /^\/api\/dalops\/(banjir|longsor|karhutla|gempa|cuaca|kekeringan|laporan)$/,
  /^\/api\/logbook\/(buka|hari|sk\/aktif)$/, /^\/api\/logbook\/turunan\/(rapor_bpbd|rekomendasi|penanganan|serupa_\d{2})$/, /^\/api\/logbook\/kejadian\/[0-9a-f]{16}\/sk$/,
  /^\/api\/pusdalops\/(berantai|lapsus|medsos|medsos\/jeda|pemulihan|pemulihan\/ringkasan|rollcall|rollcall\/ringkasan)$/, /^\/api\/pusdalops\/(lapsus|pemulihan|rollcall)\/[0-9a-f]{16}$/,
  /^\/api\/operasi\/(peta|monitor|nilai)$/,
  /^\/api\/laporan-bnpb$/,
  /^\/api\/saham\/(konsesi|cari|dividen)$/, /^\/api\/saham\/[A-Za-z0-9.-]{1,12}\/(info|transaksi|grafik)$/,
  /^\/api\/pantau$/, /^\/api\/omc\/admin$/,
  /^\/api\/laporan-karhutla\/(hari|format-khusus|kiriman|snapshot\/[0-9-]{10})$/,
];
export async function pemirsaLihat(env, req) {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  if (!IZIN_PEMIRSA_PUSDALOPS.some(re => re.test(new URL(req.url).pathname))) return null;
  const p = await pemirsaSesi(env, req);
  if (!p?.tab.includes("pusdalops")) return null;
  SESI.set(req, {...p, id: "pemirsa:" + p.id, peran: ["operator_cc"], wilayah: [], dummy: 0});   // operator_cc = baca saja, butir keselamatan regu (TERTUTUP_OPERATOR, src/pantau.js) tersaring; nasional, bukan dummy: dalamWilayahStaf/stafNyata membacanya
  return p;
}
/* sesi staf semu untuk gerbang yang membaca identitas lewat stafSesi (Meja Pantau, Laporan Karhutla, kerangka halaman admin): peran 'operator_cc' = baca saja di semua gerbang itu */
const pemirsaSintetis = async (env, req) => { const p = await pemirsaLihat(env, req); return p && SESI.get(req); };
/* sama dengan stafSesi tetapi termasuk staf berperan 'direktori' saja: dipakai stafPeran (yang memeriksa peran eksplisit) dan Direktori */
export async function stafSesiSemua(env, req, kini = Date.now()) {
  if (!tokenDari(req)) return null;
  if (req.method !== "GET" && req.method !== "HEAD" && req.headers.get("x-pb") !== "1") return null;
  let s; try { s = await muatSesi(env, req, kini); } catch (e) { if (tabelBelum(e)) return null; throw e; }
  if (!s || s.wajib_ganti) return null;
  SESI.set(req, s);
  return s;
}
/* sesi sah tetapi sandi awal belum diganti: {nama} (layar Meja Pantau langsung menawarkan sandi baru tanpa panggilan /saya tambahan) */
export async function stafTertahan(env, req, kini = Date.now()) {
  if (!tokenDari(req)) return null;
  try { const s = await muatSesi(env, req, kini); return s?.wajib_ganti ? {nama: s.nama} : null; } catch (e) { if (tabelBelum(e)) return null; throw e; }
}
export async function stafPeran(env, req, peran) {
  const s = await stafSesiSemua(env, req);
  return s && peran.some(p => s.peran.includes(p)) ? "staf:" + s.id : null;
}
export async function stafOK(env, req, peran) { return (await adminOK(env, req)) || stafPeran(env, req, peran); }
export async function modAtauStaf(env, req, peran) {
  const p = (await modOK(env, req)) || await stafPeran(env, req, peran) || (peran.includes("pimpinan") && await pemirsaLihat(env, req));   // pemirsa = pimpinan baca saja: pemeriksaan peran tulis (mis. boleh_tulis OMC, ["tmc"]) tidak lolos
  return p && typeof p === "object" ? "pemirsa:" + p.id : p;
}
/* aksi tulis lewat sesi staf berwilayah: provinsi sasaran harus di wilayahnya (admin dan staf nasional: selalu boleh) */
export function dalamWilayahStaf(req, provs) {
  const s = SESI.get(req);
  return !s || !s.wilayah.length || provs.some(p => s.wilayah.includes(p));
}
export const wilayahStaf = req => SESI.get(req)?.wilayah ?? [];   // kosong = nasional (atau bukan staf)
/* pelaku staf (sesi) yang BUKAN akun dummy: rute lama yang dibuka untuk staf menyaring baris dummy darinya */
export const stafNyata = req => { const s = SESI.get(req); return !!s && !s.dummy; };
export const dariStaf = mod => typeof mod === "string" && mod.startsWith("staf:");

/* ================================================================ masuk, keluar, saya, ganti sandi */
const cookieSet = (nilai, umur) => `${COOKIE}=${nilai}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${umur}`;
const hashSandi = (garam, sandi) => sha(garam + sandi);
export async function sandiBaru(sandi = sandiAcak()) { const garam = acak(16); return {sandi, garam, sandi_sha: await hashSandi(garam, sandi)}; }
const gagalBanyak = async (env, kunci, aksi, maks, kini) => await hitungLaju(env, SIS, kunci, aksi, kini - JAM) >= maks;
const catatLaju = (env, kunci, aksi, kini) => stmtLaju(env, SIS, kunci, aksi, kini);
export const jejakStmt = (env, oleh, obyek, aksi, ke, catatan, kini, dummy = 0) => stmtJejak(env, ADM, oleh, obyek, aksi, ke, catatan, kini, dummy);   // pemanggil luar (pantau, sippa, ai) menulis jejak atas nama pelaku mereka

/* Sandi diverifikasi DULU (sandi benar selalu masuk, penyerang tidak bisa mengunci pemilik); 429 hanya di jalur salah. (username + IP) 8 per jam, per username 200, per IP 30. */
/* inti masuk staf, dipakai POST /api/staf/masuk (JSON) dan /admin/masuk (form satu pintu): {hasil: "ok", cookie, staf} | {hasil: "salah"} | {hasil: "kunci"} */
export async function cobaMasukStaf(env, req, user0, sandi0, kini) {
  const user = typeof user0 === "string" ? user0.trim().toLowerCase().slice(0, 60) : "", sandi = typeof sandi0 === "string" ? sandi0.slice(0, 100) : "";
  const ip = await ipHash(env, req), kUserIp = "si:" + (await sha(user + "|" + ip)).slice(0, 40), kUser = "su:" + (await sha(user)).slice(0, 40);
  const a = /^[a-z0-9]{5,60}$/.test(user) ? await stafUntukMasuk(env, SIS, user) : null;
  const cek = await hashSandi(a?.garam ?? "0".repeat(32), sandi);   // hash tetap dihitung untuk username tak dikenal
  if (!a || a.status !== "aktif" || cek !== a.sandi_sha) {
    const kunci = await gagalBanyak(env, kUserIp, "staf.gagal_ui", 8, kini) || await gagalBanyak(env, kUser, "staf.gagal_u", 200, kini) || await gagalBanyak(env, ip, "staf.gagal_ip", 30, kini);
    if (!kunci) await tulisSistem(env, SIS, [catatLaju(env, kUserIp, "staf.gagal_ui", kini), catatLaju(env, kUser, "staf.gagal_u", kini), catatLaju(env, ip, "staf.gagal_ip", kini)]);   // sudah terkunci: tidak menulis baris lagi (tidak membanjiri D1)
    return {hasil: kunci ? "kunci" : "salah"};
  }
  const token = acak(32);
  await tulisSistem(env, SIS, [stmtSesiBaru(env, SIS, await sha(token), a.id, kini, kini + SESI_UMUR), stmtSesiBasi(env, SIS, a.id, kini)]);
  const s = bentuk(await stafById(env, SIS, a.id));
  return {hasil: "ok", cookie: cookieSet(token, SESI_UMUR / 1000), staf: s};
}
async function masuk(env, req, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const m = await cobaMasukStaf(env, req, b.o.username, b.o.sandi, kini);
  if (m.hasil === "kunci") return gagal(429, "terlalu banyak percobaan masuk yang salah; coba lagi sejam lagi", {"retry-after": "3600"});
  if (m.hasil !== "ok") return gagal(401, "username atau sandi salah");
  const r = json({staf: ringkas(m.staf)}); r.headers.append("set-cookie", m.cookie); return r;
}
async function keluar(env, req) {
  const t = tokenDari(req);
  if (t) await hapusSesiToken(env, SIS, await sha(t));
  const r = json({ok: true}); r.headers.append("set-cookie", cookieSet("", 0)); return r;
}
async function saya(env, req, kini) {
  const s = await muatSesi(env, req, kini);
  return s ? json({staf: ringkas(s), peran: PERAN}) : gagal(401, "belum masuk atau sesi berakhir; masuk lagi");
}
/* sandi baru acak, tampil sekali; sesi lain staf ini dicabut, sesi yang dipakai tetap hidup */
async function gantiSandi(env, req, kini) {
  const s = await muatSesi(env, req, kini);
  if (!s) return gagal(401, "belum masuk atau sesi berakhir; masuk lagi");
  if (req.headers.get("x-pb") !== "1") return gagal(403, "kiriman wajib membawa header x-pb: 1");
  const n = await sandiBaru();
  const diri = pelakuDiri(s.id);
  await tulisJejak(env, diri, [stmtSandi(env, diri, s.id, n.garam, n.sandi_sha, 0), stmtSesiLain(env, diri, s.id, await sha(tokenDari(req)))], stmtJejak(env, diri, "staf:" + s.id, "staf:" + s.id, "ganti_sandi", null, null, kini, s.dummy));
  return json({sandi: n.sandi});
}

/* ================================================================ pengelolaan oleh Super Admin */
const tolakSuper = () => gagal(403, "akun staf hanya dikelola Super Admin (secret SUPER_ADMIN berisi awalan akun)");
const slug = s => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
/* murni: larik peran dan wilayah dari isian; {galat} atau {peran, wilayah} */
export function cekPeranWilayah(o) {
  const dari = (v, nama, boleh, maks) => v == null ? [] : Array.isArray(v) && v.length <= maks && v.every(x => typeof x === "string" && boleh(x)) && new Set(v).size === v.length ? v : null;
  const peran = dari(o.peran, "peran", x => Object.hasOwn(PERAN, x), 7), wilayah = dari(o.wilayah, "wilayah", x => Object.hasOwn(PROV, x), 40);
  if (!peran?.length) return {galat: `peran wajib, satu atau lebih dari: ${Object.keys(PERAN).join(", ")}`};
  if (!wilayah) return {galat: "wilayah harus larik kode provinsi BPS 2 digit tanpa duplikat (kosong = nasional)"};
  return {peran, wilayah};
}
const isian = (v, min, maks, nama) => { const s = tx(v, maks); return s === undefined ? {g: `${nama} maksimal ${maks} karakter`} : !s ? {g: `${nama} wajib diisi`} : s.length < min ? {g: `${nama} minimal ${min} karakter`} : {v: s}; };
/* murni: isian orang -> {v} atau {galat} */
export function cekStaf(o) {
  const f = {nama: isian(o.nama, 2, 100, "nama"), nip: isian(o.nip, 5, 30, "NIP"), unit: isian(o.unit, 2, 120, "unit"), email: isian(o.email, 6, 254, "email"), wa: isian(o.wa, 8, 30, "nomor WhatsApp")};
  for (const k of Object.keys(f)) if (f[k].g) return {galat: f[k].g};
  const v = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.v]));
  if (!RE_NIP.test(v.nip)) return {galat: "NIP hanya huruf, angka, titik, garis, spasi, 5-30 karakter"};
  v.email = v.email.toLowerCase(); if (!RE_EMAIL.test(v.email)) return {galat: "email tidak sah"};
  v.wa = normalWA(v.wa); if (!v.wa) return {galat: "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)"};
  const p = cekPeranWilayah(o); if (p.galat) return p;
  return {v: {...v, peran: p.peran, wilayah: p.wilayah}};
}
export const stmtStaf = (env, id, username, v, sandi, kini, oleh, dummy = 0) => stmtStafBaru(env, ADM, id, username, v, sandi, kini, oleh, dummy);
async function buat(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return tolakSuper();
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekStaf(b.o); if (c.galat) return gagal(400, c.galat);
  if (await stafAdaNip(env, ADM, c.v.nip)) return gagal(409, "NIP ini sudah punya akun staf; reset sandinya bila perlu");
  const s = await sandiBaru(), id = acak(8), dasar = "bnpb" + (slug(c.v.nama.split(/\s+/)[0]) || "staf").slice(0, 16);
  for (let i = 0; i < 5; i++) {
    const username = dasar + String(Math.floor(Math.random() * 900) + 100);
    try {
      await tulisJejak(env, ADM, [stmtStaf(env, id, username, c.v, s, kini, mod)], jejakStmt(env, mod, "staf:" + id, "buat", null, c.v.peran.join(","), kini));
      return json({staf: ringkas(bentuk(await stafById(env, ADM, id))), username, sandi: s.sandi}, 201);   // sandi tampil sekali
    } catch (e) { if (!/UNIQUE constraint failed: staf\.username/i.test(String(e?.message || e))) throw e; }
  }
  return gagal(409, "username bentrok berulang; coba lagi");
}
async function daftar(env, req) {
  if (!await superOK(env, req)) return tolakSuper();   // NIP, WA, email staf: Super Admin saja
  return json({staf: (await stafDaftar(env, ADM)).map(r => { const s = ringkas(bentuk(r)); return {...s, akses: aksesStaf(s.peran)}; }),
    peran: PERAN, akses: Object.fromEntries(Object.keys(PERAN).map(p => [p, aksesStaf([p])]))});
}
async function ubah(env, req, id, kini) {
  const mod = await superOK(env, req); if (!mod) return tolakSuper();
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const s = await stafById(env, ADM, id); if (!s) return gagal(404, "staf tidak ada");
  const cabutSesi = stmtSesiSemua(env, ADM, id), j = (aksi, c) => jejakStmt(env, mod, "staf:" + id, aksi, null, c, kini, s.dummy);
  if (b.o.aksi === "cabut") {
    if (s.status === "dicabut") return gagal(409, "staf sudah dicabut");
    await tulisJejak(env, ADM, [stmtCabut(env, ADM, id, kini), cabutSesi], j("cabut", null));
    return json({id, status: "dicabut"});
  }
  if (s.status === "dicabut") return gagal(409, "staf sudah dicabut; buat akun baru");
  if (b.o.aksi === "reset") {
    const n = await sandiBaru();
    await tulisJejak(env, ADM, [stmtSandi(env, ADM, id, n.garam, n.sandi_sha, 1), cabutSesi], j("reset", null));
    return json({id, sandi: n.sandi});   // tampil sekali; staf WAJIB membuat sandi baru saat masuk
  }
  if (b.o.aksi === "ubah") {
    const p = cekPeranWilayah(b.o); if (p.galat) return gagal(400, p.galat);
    await tulisJejak(env, ADM, [stmtPeran(env, ADM, id, p.peran, p.wilayah)], j("ubah", p.peran.join(",")));
    return json({id, peran: p.peran, wilayah: p.wilayah});
  }
  return gagal(400, "aksi harus cabut/reset/ubah");
}

/* retensi (cron menit 17): sesi kedaluwarsa */
export async function bersihkanStaf(env, kini = Date.now()) {
  try { return {sesi: await bersihkanSesi(env, SIS, kini)}; }
  catch (e) { if (tabelBelum(e)) return {lewat: "migrasi 0030 belum diterapkan"}; throw e; }
}

/* deklarasi fungsi (bukan const): terangkat, jadi aman dipakai modul yang saling impor dalam siklus (pantau.js) */
export function bungkusStaf(f) {
  return async (...a) => {
    try { return await f(...a); }
    catch (e) { if (e instanceof Galat) return gagal(e.status, e.status === 403 ? "dilarang" : e.message); if (tabelBelum(e)) return gagal(503, "akun staf belum diaktifkan (migrasi 0030_staf belum diterapkan)"); throw e; }
  };
}
/* rute digabung ke RUTE di src/worker.js. Tanpa admin = sesi staf di tiap handler; superOK = Super Admin; modOK = moderator ke atas. */
export const RUTE_STAF = Object.fromEntries(Object.entries({
  "POST /api/staf/masuk": (env, req, url, kini) => masuk(env, req, kini),
  "POST /api/staf/keluar": (env, req) => keluar(env, req),
  "GET /api/staf/saya": (env, req, url, kini) => saya(env, req, kini),
  "POST /api/staf/gantisandi": (env, req, url, kini) => gantiSandi(env, req, kini),
  "POST /api/staf/admin/buat": (env, req, url, kini) => buat(env, req, kini),
  "GET /api/staf/admin/daftar": (env, req) => daftar(env, req),
  "POST /api/staf/admin/:id": (env, req, url, kini, ctx, id) => ubah(env, req, id, kini),
}).map(([k, f]) => [k, bungkusStaf(f)]));
RUTE_STAF["GET /admin/akun"] = (env, req, url, kini) => halamanAdmin(env, req, kini, halamanAkun());
export const tanpaTabelStaf = tabelBelum;
