/* Satu Pintu Masuk, tiket PM-03 (data/kajian-bnpb/pintu-masuk/: ALGORITMA §2, DESAIN-TEKNIS §3-4, KEAMANAN-PRIVASI §2):
   minta dan periksa kode enam angka lewat WA, sesi akun umum (cookie sesi_masuk), profil minimal, keluar.
   Kode hanya disimpan sebagai HMAC berahasia MASUK_KUNCI, tidak pernah ada di jawaban API atau log. Pesan keluar lewat wa_antre (jenis 'otp'); tidak ada pembacaan WA masuk.
   Belum di sini: akun peran, sandi staf, undangan, email, halaman (PM-06 sampai PM-16). Semua ambang ada di masuk_konst.js. */
import {json, gagal, sha, hex, acak, bacaBody, normalWA, turnstileOK, ipHash} from "./worker.js";
import {laju} from "./bnpb.js";
import {emailAktif} from "./ews.js";
import {mkJedaTerakhir, mkKodeBaru, mkNaikCobaSemua, mkHanguskanBanyak, mkSelesaiKode, mkPakaiKode, mkDenyutBaca, mkAkunUntuk, mkSesiBaru, mkSesiDari, mkCabutSesi} from "./hak.js";   // semua SQL di hak.js (gerbang d1)
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
  /* semua kode aktif nomor itu naik coba dulu, lalu dibandingkan satu per satu tanpa keluar lebih awal (D18) */
  const baris = await mkNaikCobaSemua(env, nsha, kini, K.KODE_AKTIF_MAKS);
  if (!baris.length) return galatKode();
  const h = await hmac(env.MASUK_KUNCI, nomor + "|" + kode), lewat = [];
  let menang = null;
  for (const r of baris) {
    if (r.coba > K.MAKS_COBA) { lewat.push(r.id); continue; }
    if (samaWaktu(r.kode_sha, h) && !menang) menang = r;
  }
  if (lewat.length) await mkHanguskanBanyak(env, lewat, kini);
  if (!menang) return galatKode();
  if (!await mkPakaiKode(env, menang.id, kini)) return galatKode();   // permintaan serentak: hanya satu yang menang
  await mkSelesaiKode(env, nsha, menang.id, kini);   // kode aktif lain nomor itu hangus, baris otp dihapus
  /* nomor yang kodenya sah tetapi belum punya akun: akun umum kosong (nama, wilayah, persetujuan dilengkapi PM-08) */
  const a = await mkAkunUntuk(env, acak(8), nomor, kini);
  if (a.status !== "aktif") return gagal(403, "akun ini diblokir");
  const token = acak(32);
  await mkSesiBaru(env, await sha(token), a.id, kini, kini + K.SESI_UMUR_UMUM);
  return json({ok: true, lengkap: a.setuju_pdp === 1, ruang: []}, 200, {"set-cookie": kukiSesi(token, K.SESI_UMUR_UMUM / 1000)});   // ruang diisi PM-06
}

/* ---------------- sesi akun umum ---------------- */
const tokenDari = req => /(?:^|;\s*)sesi_masuk=([0-9a-f]{64})(?:;|$)/.exec(req.headers.get("cookie") || "")?.[1] ?? null;
/* pembaca sesi untuk tiket lain: baris {kode_pada, id, wa, nama, prov, kab, setuju_pdp} atau null. Melempar bila tabel mk_* belum ada (pemanggil menangkap). */
export async function sesiMasuk(env, req, kini = Date.now()) {
  const t = tokenDari(req); if (!t) return null;
  return mkSesiDari(env, await sha(t), kini);
}
const samar = wa => "•".repeat(wa.length - 4) + wa.slice(-4);   // nomor tidak pernah tampil terang

/* saluran kode: WA hidup bila gerbang berdenyut dalam DENYUT_MATI, email bila pengirimnya terkonfigurasi; tanpa data pribadi */
async function saluran(env, kini) {
  const d = await mkDenyutBaca(env);
  return {wa: d != null && kini - d <= K.DENYUT_MATI, email: emailAktif(env)};
}
async function saluranPublik(env, req, url, kini) { return json(await saluran(env, kini), 200, {"cache-control": "public, max-age=15"}); }
async function saya(env, req, url, kini) {
  const s = await sesiMasuk(env, req, kini); if (!s) return gagal(401, "belum masuk");
  return json({akun: {id: s.id, wa: samar(s.wa), nama: s.nama, prov: s.prov, kab: s.kab, lengkap: s.setuju_pdp === 1}, baru_kode: kini - s.kode_pada <= K.BARU_KODE, ruang: [], saluran: await saluran(env, kini)});   // ruang diisi PM-06
}
async function keluar(env, req, url, kini) {
  const g = penjaga(req, url); if (g) return g;
  const x = await batas(env, await ipHash(env, req), "masuk.keluar_ip", K.LAJU_IP_KELUAR, kini); if (x) return x;
  const t = tokenDari(req);
  if (t) await mkCabutSesi(env, await sha(t));
  return json({ok: true}, 200, {"set-cookie": kukiSesi("", 0)});
}

export const RUTE_MASUK = {
  "POST /api/masuk/kode": tabelBelum(mintaKode),
  "POST /api/masuk/periksa": tabelBelum(periksaKode),
  "GET /api/masuk/saya": tabelBelum(saya),
  "GET /api/masuk/saluran": saluranPublik,   // tanpa sesi; tabel belum ada = wa false
  "POST /api/masuk/keluar": tabelBelum(keluar),
};
