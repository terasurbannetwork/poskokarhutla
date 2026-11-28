/* Satu Pintu Masuk, tiket PM-03 (data/kajian-bnpb/pintu-masuk/: ALGORITMA §2, DESAIN-TEKNIS §3-4, KEAMANAN-PRIVASI §2):
   minta dan periksa kode enam angka lewat WA, sesi akun umum (cookie sesi_masuk), profil minimal, keluar.
   Kode hanya disimpan sebagai HMAC berahasia MASUK_KUNCI, tidak pernah ada di jawaban API atau log. Pesan keluar lewat wa_antre (jenis 'otp'); tidak ada pembacaan WA masuk.
   PM-06: sesi peran (tiap modul menerbitkan dan mencabut sesinya sendiri; di sini tidak ada tulis ke tabel sesi/akun modul lain), pemilih ruang, keluar, nomor pemirsa.
   PM-08: lengkapi profil akun umum, halaman public/masuk.*.
   K25 (26 Nov 2026): kode tidak lagi membuka akun peran (staf, instansi, pendataan, kampus, pemirsa); pilih ruang, sandi sesudah kode, atur sandi, dan kode email dicabut. Belum di sini: undangan, email (PM-09 sampai PM-16). Semua ambang ada di masuk_konst.js. */
import {json, gagal, sha, hex, acak, bacaBody, bersihTeks, normalWA, turnstileOK, ipHash, cacheTepi} from "./worker.js";
import {PROV} from "./bangunan.js";
import {laju} from "./bnpb.js";
import {emailAktif} from "./ews.js";
import {superOK} from "./posko.js";
import {sesiUntuk as sesiInstansi, cabutSesi as cabutInstansi} from "./instansi.js";
import {sesiUntuk as sesiPendataan, cabutSesi as cabutPendataan} from "./pendataan.js";
import {sesiUntuk as sesiKampus, cabutSesi as cabutKampus} from "./kemitraan_akun.js";
import {sesiUntuk as sesiPemirsa, cabutSesi as cabutPemirsa} from "./pemirsa.js";
import {cabutSesi as cabutStaf} from "./staf.js";
import {STATUS_RELAWAN_ARR} from "./lapangan.js";
import {mkJedaTerakhir, mkKodeBaru, mkNaikCobaSemua, mkHanguskanBanyak, mkSelesaiKode, mkPakaiKode, mkDenyutBaca, mkAkunUntuk, mkSesiBaru, mkCabutSesi, mkLengkapi,
  mkOrangDariWa, mkRelawanDariWa, mkPemirsaAda, mkPemirsaWaSet,
  mkUndangTerima, mkAkunSaya, mkHapusAkun, mkAnggotaLama, mkAnggotaTurun, mkKontakCocok, mkAnggotaMenungguMilik} from "./hak.js";   // semua SQL di hak.js (gerbang d1)
import {sesiMasuk, tokenDari} from "./masuk_sesi.js";
import * as K from "./masuk_konst.js";

const BELUM = "fitur belum diaktifkan (migrasi masuk belum dijalankan)";
const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, BELUM); throw e; }
};
const kunciSah = env => typeof env.MASUK_KUNCI === "string" && env.MASUK_KUNCI.length >= K.KUNCI_MIN;   // kunci pendek = belum dikonfigurasi
const reKode = new RegExp(`^[0-9]{${K.KODE_DIGIT}}$`);
const galatKode = () => gagal(400, "kode salah atau kedaluwarsa");   // satu pesan untuk salah, habis waktu, habis coba, tanpa kode
const galatNomor = () => gagal(400, "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)");
const kukiSesi = (nilai, umurDetik) => `sesi_masuk=${nilai}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${umurDetik}`;

/* header x-pb: 1 dan Origin sama situs (kosong/"null" hanya bila peramban menyatakan Sec-Fetch-Site same-origin): form lintas situs tidak bisa memenuhinya */
function penjaga(req, url) {
  if (req.headers.get("x-pb") !== "1") return gagal(403, "kiriman wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman)");
  const o = req.headers.get("origin"), kosong = !o || o === "null";
  const sama = kosong ? req.headers.get("sec-fetch-site") === "same-origin" : URL.canParse(o) && new URL(o).host === url.host;
  return sama ? null : gagal(403, "origin lain ditolak");
}

const enc = new TextEncoder();
async function hmac(kunci, teks) {
  const k = await crypto.subtle.importKey("raw", enc.encode(kunci), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(teks)));
}
function samaWaktu(a, b) {   // dua hex berpanjang tetap
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/* enam angka seragam: nilai di atas kelipatan terbesar ditolak (tanpa bias modulo) */
function kodeAcak() {
  const m = 10 ** K.KODE_DIGIT, batas = Math.floor(2 ** 32 / m) * m, u = new Uint32Array(1);
  do crypto.getRandomValues(u); while (u[0] >= batas);
  return String(u[0] % m).padStart(K.KODE_DIGIT, "0");
}
/* laju() menghitung lalu mencatat; lewat batas -> 429 tanpa menyebut angka batas */
async function batas(env, kunci, aksi, b, kini, pesan = "terlalu sering, coba lagi nanti") {
  const r = await laju(env, kunci, aksi, b, kini);
  return r && gagal(429, pesan, {"retry-after": r.headers.get("retry-after") || "60"});
}

/* ---------------- minta kode (ALGORITMA 2.1) ---------------- */
async function mintaKode(env, req, url, kini) {
  if (!kunciSah(env) || !env.TURNSTILE_SECRET || !env.TURNSTILE_SITEKEY) return gagal(503, "masuk lewat kode belum dikonfigurasi");   // tanpa lolos-diam seperti turnstileOK
  const g = penjaga(req, url); if (g) return g;
  if (!req.headers.get("cf-connecting-ip")) return gagal(403, "alamat jaringan tidak terbaca");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const nomor = normalWA(b.o.wa); if (!nomor) return galatNomor();
  const ip = await batas(env, await ipHash(env, req), "masuk.minta_ip", K.LAJU_IP_MINTA, kini); if (ip) return ip;   // sebelum siteverify: token ngawur tidak memicu fetch tanpa hitungan
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const nsha = await hmac(env.MASUK_KUNCI, "wa|" + nomor);
  /* jeda sebelum laju per nomor: klik ganda tidak menghabiskan jatah nomor itu */
  const d = await mkJedaTerakhir(env, nsha, kini - K.JEDA_KIRIM);
  if (d) return gagal(429, "tunggu sebentar sebelum meminta kode lagi", {"retry-after": String(Math.ceil((d + K.JEDA_KIRIM - kini) / 1000))});
  const x = await batas(env, nsha, "masuk.minta_nomor", K.LAJU_NOMOR, kini); if (x) return x;
  const r = await batas(env, "global", "masuk.global", K.LAJU_GLOBAL, kini, "sedang ramai, coba beberapa menit lagi"); if (r) return r;
  const kode = kodeAcak(), id = acak(8);   // id yang sama dipakai baris wa_antre supaya penghapusan lewat kunci utama
  const pesan = `Kode masuk Centurisk97: ${kode}. Berlaku ${K.KODE_UMUR / 60e3} menit. Jangan berikan kode ini kepada siapa pun.`;
  await mkKodeBaru(env, id, nsha, await hmac(env.MASUK_KUNCI, nomor + "|" + kode), nomor, pesan, kini, kini + K.KODE_UMUR);
  return json({ok: true, tunggu: K.JEDA_KIRIM / 1000});   // sama untuk nomor dikenal maupun tidak
}

/* semua kode aktif satu kunci naik coba dulu, lalu dibandingkan satu per satu tanpa keluar lebih awal (D18); baris pemenang = satu pemanggil saja (UPDATE ... WHERE dipakai IS NULL).
   Dipakai kode WA dan kode email (src/masuk_undang.js). Mengembalikan baris pemenang atau null; kode aktif lain kunci itu hangus. */
export async function cocokKode(env, nsha, h, kini, maks) {
  const baris = await mkNaikCobaSemua(env, nsha, kini, maks);
  if (!baris.length) return null;
  const lewat = [];
  let menang = null;
  for (const r of baris) {
    if (r.coba > K.MAKS_COBA) { lewat.push(r.id); continue; }
    if (samaWaktu(r.kode_sha, h) && !menang) menang = r;
  }
  if (lewat.length) await mkHanguskanBanyak(env, lewat, kini);
  if (!menang || !await mkPakaiKode(env, menang.id, kini)) return null;   // permintaan serentak: hanya satu yang menang
  await mkSelesaiKode(env, nsha, menang.id, kini);   // kode aktif lain hangus, baris otp dihapus
  return menang;
}

/* ---------------- periksa kode (ALGORITMA 2.2) ---------------- */
async function periksaKode(env, req, url, kini) {
  if (!kunciSah(env)) return gagal(503, "masuk lewat kode belum dikonfigurasi");
  const g = penjaga(req, url); if (g) return g;
  if (!req.headers.get("cf-connecting-ip")) return gagal(403, "alamat jaringan tidak terbaca");
  const x = await batas(env, await ipHash(env, req), "masuk.periksa_ip", K.LAJU_IP_PERIKSA, kini); if (x) return x;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const nomor = normalWA(b.o.wa); if (!nomor) return galatNomor();
  const kode = typeof b.o.kode === "string" ? b.o.kode.trim() : "";
  if (!reKode.test(kode)) return galatKode();
  const nsha = await hmac(env.MASUK_KUNCI, "wa|" + nomor);
  const menang = await cocokKode(env, nsha, await hmac(env.MASUK_KUNCI, nomor + "|" + kode), kini, K.KODE_AKTIF_MAKS);
  if (!menang) return galatKode();
  if (menang.saluran === "email") return galatKode();   // K25: kode email hanya membuka akun peran, jalur itu dicabut
  /* nomor yang kodenya sah tetapi belum punya akun: akun umum kosong (nama, wilayah, persetujuan dilengkapi PM-08) */
  const a = await mkAkunUntuk(env, acak(8), nomor, kini);
  if (a.status !== "aktif") return gagal(403, "akun ini diblokir");
  await buktiUlang(env, a.id, nomor, kini);   // PM-14: anggota yang lama tidak masuk diperiksa ulang SEBELUM undangan baru dihitung
  await buktiNomor(env, a.id, nomor, kini);   // PM-09: undangan berlaku dan kontak bnpb dipakai
  const token = acak(32);
  await mkSesiBaru(env, await sha(token), a.id, kini, kini + K.SESI_UMUR_UMUM);
  /* K25 (pemilik 26 Nov 2026, "Sandi saja, WA hapus", lalu "Cabut dari login saja"): kode WA hanya membuktikan nomor untuk akun umum (tanda selamat, petugas dan relawan,
     alun-alun, undangan anggota). Kode tidak pernah lagi menerbitkan sesi akun staf, instansi, pendataan, kampus, atau pemirsa; akun itu masuk lewat sandi di /masuk. */
  const kuki = [kukiSesi(token, K.SESI_UMUR_UMUM / 1000)];
  const r = json({ok: true, lengkap: a.setuju_pdp > 0, ruang: (await cariRuang(env, nomor)).ruang.map(bersihRuang), menunggu: await menungguMilik(env, a.id)});   // K25: hanya petugas dan relawan
  for (const c of kuki) r.headers.append("set-cookie", c);
  return r;
}

/* PM-09 (ALGORITMA §5): undangan berlaku (pengundang masih berhak) ke akun instansi aktif menjadi anggota aktif saat kode sah. Pintu ini TIDAK PERNAH mengubah status pdt_akun
   (D19): pendaftaran pendataan memakai sandi dan nomor ketikan pendaftar yang tak dibuktikan, jadi persetujuannya tetap Super Admin. Tidak menyentuh instansi_akun. */
async function buktiNomor(env, mkId, nomor, kini) {
  await mkUndangTerima(env, mkId, nomor, kini);
}

/* PM-14 (ALGORITMA §7): anggota aktif yang 180 hari tidak masuk ke akun lembaganya: kontak pemangku yang cocok masih ada = tetap aktif; selain itu menunggu pemeriksaan.
   Undangan tidak dihitung ulang (sudah dipakai); email terpetakan tidak bisa diperiksa tanpa email baru, jadi jatuh ke menunggu. */
async function buktiUlang(env, mkId, nomor, kini) {
  for (const g of await mkAnggotaLama(env, mkId, kini - K.BUKTI_ULANG)) {
    const kategori = K.PETA_KATEGORI[g.jenis];
    if (kategori && await mkKontakCocok(env, nomor, kategori, g)) continue;
    await mkAnggotaTurun(env, g.id, kini);
  }
}
const menungguMilik = async (env, mkId) => (await mkAnggotaMenungguMilik(env, mkId)).map(x => x.wilayah);

/* ---------------- sesi akun umum ---------------- */
export {sesiMasuk};   // pembacanya ada di masuk_sesi.js
const samar = wa => "x".repeat(Math.max(0, wa.length - 4)) + wa.slice(-4);   // nomor tidak pernah tampil terang

/* ---------------- ruang: akun peran yang terikat langsung ke nomor terbukti (ALGORITMA 3) ---------------- */
const MODUL = () => ({instansi: {buat: sesiInstansi, cabut: cabutInstansi}, pendataan: {buat: sesiPendataan, cabut: cabutPendataan}, kemitraan: {buat: sesiKampus, cabut: cabutKampus}, pemirsa: {buat: sesiPemirsa, cabut: cabutPemirsa}});   // dibuat saat dipanggil: aman dari siklus impor
/* satu nama cookie per jenis: bila nomor terikat ke lebih dari satu akun sejenis, tidak ada sesi otomatis; tiap baris membawa `pilih` (id akun) dan perlu_pilih */
const tandaiPilih = ruang => {
  const n = {}; for (const e of ruang) if (e._s) n[e._s[0]] = (n[e._s[0]] || 0) + 1;
  return ruang.map(e => e._s && n[e._s[0]] > 1 ? {...e, pilih: e._s[2], perlu_pilih: true} : e);
};
const bersihRuang = ({_s, ...e}) => e;   // _s = [modul, tabel, akun id] hanya untuk server; `pilih` (id staf) tetap karena klien memilih akun staf lewat itu
async function cariRuang(env, nomor) {
  const ruang = [];
  const tambah = (jenis, nama_ruang, lembaga, wilayah, ke, butuh_sandi, _s, tambahan = {}) => ruang.push({jenis, nama_ruang, lembaga, wilayah, ke, butuh_sandi, ...tambahan, _s});
  /* K25 (26 Nov 2026): akun staf, instansi, pendataan, kampus, dan pemirsa tidak lagi dibuka lewat kode; hanya ruang tanpa sesi baru (petugas, relawan) yang tersisa */
  /* relawan dan petugas: tanpa cookie baru (DESAIN-TEKNIS 4.3); tepat satu baris, yang lain tidak dibuka */
  try {
    const o = await mkOrangDariWa(env, nomor), r = await mkRelawanDariWa(env, nomor, STATUS_RELAWAN_ARR);
    if (r.length === 1) tambah("relawan", "Relawan", "Relawan", r[0].kab, "/relawan/saya", false, null);
    if (o.length === 1 || o.length === 0 && r.length === 1) tambah("petugas", "Petugas lapangan", o[0]?.unit ?? "Lapangan", o[0]?.kab ?? r[0]?.kab ?? null, "/petugas", false, null);
  } catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }
  return {ruang};
}

/* saluran kode: WA hidup bila gerbang berdenyut dalam DENYUT_MATI, email bila pengirimnya terkonfigurasi; tanpa data pribadi */
async function saluran(env, kini) {
  const d = await mkDenyutBaca(env);
  return {wa: d != null && kini - d <= K.DENYUT_MATI, email: emailAktif(env)};
}
/* cache tepi 15 detik (cacheTepi, kunci tanpa query): tanpanya tiap permintaan membaca D1 dan header cache-control tidak berlaku di jalur ini */
const saluranPublik = (env, req, url, kini, ctx) => cacheTepi(req, ctx, 15, async () => json(await saluran(env, kini)), true);
async function saya(env, req, url, kini) {
  const tamu = () => url.searchParams.get("lunak") === "1" ? json({masuk: false}) : gagal(401, "belum masuk");
  if (!tokenDari(req)) return tamu();   // tanpa cookie berbentuk sah: tanpa laju dan tanpa D1 sama sekali
  const ip = await batas(env, await ipHash(env, req), "masuk.saya_ip", K.LAJU_IP_SAYA, kini); if (ip) return ip;   // sebelum sesiMasuk, juga untuk ?lunak=1
  const s = await sesiMasuk(env, req, kini);
  if (!s) return tamu();   // ?lunak=1: pemeriksaan diam-diam dari halaman lain (tanpa galat 401 di konsol)
  const ruang = tandaiPilih((await cariRuang(env, s.wa)).ruang), baru = kini - s.kode_pada <= K.BARU_KODE;
  /* hapus akun butuh kode baru: jumlah keanggotaan yang ikut hilang. Atur sandi lewat kode dicabut (K25), jadi `sandi` selalu kosong */
  const sandi = [];
  const anggotaN = baru ? (await mkAkunSaya(env, s.id, s.wa, K.AKUN_PER_JENIS)).filter(x => !x.pemilik).length : 0;
  return json({akun: {id: s.id, wa: samar(s.wa), nama: s.nama, prov: s.prov, kab: s.kab, lengkap: s.setuju_pdp > 0}, baru_kode: baru, ruang: ruang.map(bersihRuang), menunggu: await menungguMilik(env, s.id),
    ...(baru ? {sandi, anggota_n: anggotaN} : {}), saluran: await saluran(env, kini)});
}
/* cabut sesi akun umum peramban ini dan tiap sesi peran; mengembalikan cookie penghapus (instansi: dua Path). sesi_admin tidak disentuh. */
async function cabutPeramban(env, req) {
  const t = tokenDari(req);
  if (t) await mkCabutSesi(env, await sha(t));
  const kuki = [kukiSesi("", 0)];
  for (const cabut of [...Object.values(MODUL()).map(m => m.cabut), cabutStaf]) {
    try { kuki.push(...await cabut(env, req)); } catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }
  }
  return kuki;
}
async function keluar(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const x = await batas(env, await ipHash(env, req), "masuk.keluar_ip", K.LAJU_IP_KELUAR, kini); if (x) return x;
  const r = json({ok: true});
  for (const c of await cabutPeramban(env, req)) r.headers.append("set-cookie", c);
  return r;
}

/* ---------------- lengkapi profil akun umum (PM-08, ALUR A4): nama, wilayah, persetujuan pemrosesan data ---------------- */
const teksPendek = (v, maks, nama) => {
  if (typeof v !== "string") return {galat: nama + " wajib diisi"};
  const r = bersihTeks(v.trim(), maks); if (r.galat) return {galat: nama + ": " + r.galat};
  if (r.teks.length < 2 || /\[(?:tautan|nomor) dihapus\]/.test(r.teks)) return {galat: nama + " tidak sah (2 sampai " + maks + " huruf, tanpa tautan atau nomor)"};
  return r;
};
async function lengkapi(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.lengkapi_ip", K.LAJU_IP_LENGKAPI, kini); if (ip) return ip;
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.setuju !== true) return gagal(400, "persetujuan pemrosesan data wajib dicentang");
  const nama = teksPendek(b.o.nama, K.NAMA_MAKS, "nama"); if (nama.galat) return gagal(400, nama.galat);
  const kab = teksPendek(b.o.kab, K.KAB_MAKS, "kabupaten atau kota"); if (kab.galat) return gagal(400, kab.galat);
  if (typeof b.o.prov !== "string" || !PROV.has(b.o.prov)) return gagal(400, "provinsi tidak sah");
  await mkLengkapi(env, s.id, nama.teks, b.o.prov, kab.teks, kini);
  return json({ok: true, lengkap: true});
}

/* ---------------- hapus akun umum (PM-14, ALUR A10): akun lembaga tidak terhapus ---------------- */
async function hapusAkun(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.hapus_ip", K.LAJU_IP_HAPUS, kini); if (ip) return ip;
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  if (kini - s.kode_pada > K.BARU_KODE) return gagal(403, "masuk dengan kode lagi dulu (kode sudah lebih dari 15 menit)");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.yakin !== true) return gagal(400, "konfirmasi penghapusan wajib (yakin: true)");
  await mkHapusAkun(env, s.id);   // undangan berstatus 'diterima' buatan akun ini dibiarkan: anggota yang diundangnya tetap aktif
  const r = json({ok: true});
  for (const c of await cabutPeramban(env, req)) r.headers.append("set-cookie", c);
  return r;
}

/* ---------------- nomor pemirsa, hanya Super Admin (D17) ---------------- */
async function pemirsaWa(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const ip = await batas(env, await ipHash(env, req), "masuk.pemirsa_wa_ip", K.LAJU_IP_PEMIRSA_WA, kini); if (ip) return ip;
  const oleh = await superOK(env, req); if (!oleh) return gagal(403, "nomor pemirsa hanya diatur Super Admin");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const id = typeof b.o.pemirsa_id === "string" ? b.o.pemirsa_id : "";
  if (!/^[0-9a-f]{16}$/.test(id)) return gagal(400, "pemirsa_id tidak sah");
  const wa = b.o.wa == null ? null : normalWA(b.o.wa);
  if (b.o.wa != null && !wa) return galatNomor();
  if (!await mkPemirsaAda(env, id)) return gagal(404, "akun pemirsa tidak ada");
  try { await mkPemirsaWaSet(env, id, wa, String(oleh).slice(0, 40), kini); }
  catch (e) { if (/UNIQUE/i.test(String(e?.message || e))) return gagal(409, "nomor itu sudah dipakai akun pemirsa lain"); throw e; }
  return json({ok: true, pemirsa_id: id, wa: wa ? samar(wa) : null});
}

/* ---------------- halaman (PM-05): public/masuk.html milik PM-08; sebelum itu halaman sementara tanpa data ---------------- */
const CSP_MASUK = K.CSP_MASUK;
const halSementara = '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Masuk</title><body><h1>Masuk</h1><p>Halaman masuk belum tersedia. Coba lagi beberapa saat lagi.</p></body></html>';
async function halamanMasuk(env, req, url) {
  const a = await env.ASSETS.fetch(new Request(new URL("/masuk.html", url)));
  const h = {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY", "content-security-policy": CSP_MASUK};
  if (!a.ok) { a.body?.cancel(); return new Response(halSementara, {headers: h}); }
  return new Response(a.body, {headers: h});
}

export const RUTE_MASUK = {
  "GET /masuk": halamanMasuk,   // publik (K8, PUBLIK_TANPA_SESI); sesi dicek di API
  "POST /api/masuk/kode": tabelBelum(mintaKode),
  "POST /api/masuk/periksa": tabelBelum(periksaKode),
  "GET /api/masuk/saya": tabelBelum(saya),
  "POST /api/masuk/lengkapi": tabelBelum(lengkapi),
  "POST /api/masuk/hapus": tabelBelum(hapusAkun),
  "POST /api/masuk/pemirsa_wa": tabelBelum(pemirsaWa),   // bawaan rancangan `pemirsa-wa`; garis tengah tidak terbaca gerbang cakupan (regex [\\w/:])
  "GET /api/masuk/saluran": saluranPublik,   // tanpa sesi; tabel belum ada = wa false
  "POST /api/masuk/keluar": tabelBelum(keluar),
};
export {tabelBelum, kunciSah, penjaga, batas, hmac, samaWaktu, kodeAcak, galatKode, galatNomor, reKode, samar, cariRuang};   // dipakai src/masuk_undang.js
