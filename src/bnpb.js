/* Ruang Koordinasi BNPB: helper bersama modul relawan, alun-alun, riset, meja kerja (docs/bnpb/ARSITEKTUR.md).
   Skema: migrations/0022_bnpb_bersama.sql (laju_bnpb). Pola kode tanpa akun = kode regu Posko (src/posko.js reguDari). */
import {gagal, sha, acak, ipHash} from "./worker.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";

const JAM = 3600e3, HARI = 24 * JAM;

/* Batas laju per kunci: hitung lalu catat.
   ponytail: baca-lalu-tulis, permintaan serentak bisa lolos satu-dua di atas batas; pakai INSERT ... WHERE count < maks bila itu berarti.
   batas = [[jendela ms, maks], ...]; kunci = hash IP bergaram atau id pemegang kode. Lewat batas -> Response 429, lolos -> null. */
export async function laju(env, kunci, aksi, batas, kini = Date.now()) {
  for (const [jendela, maks] of batas) {
    const n = (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(kunci, aksi, kini - jendela).first()).n;
    if (n >= maks) return gagal(429, `batas ${aksi}: ${maks} per ${jendela >= HARI ? jendela / HARI + " hari" : jendela / JAM + " jam"} sudah tercapai`, {"retry-after": String(Math.ceil(jendela / 1000))});
  }
  await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(kunci, aksi, kini).run();
  return null;
}
export const lajuIP = async (env, req, aksi, batas, kini) => laju(env, await ipHash(env, req), aksi, batas, kini);

/* Kode pribadi tanpa akun: 26 hex acak, hanya sha256-nya disimpan. Tampilkan SEKALI, di fragmen (#k=) supaya tidak masuk log. */
export const kodeBaru = async () => { const kode = acak(13); return {kode, kode_sha: await sha(kode)}; };

/* Cari pemegang kode dari header `x-kode`. cari(kode_sha) -> baris atau null (modul menulis SELECT-nya sendiri, termasuk syarat dicabut).
   Kode sah lolos dulu; hanya tebakan salah dihitung per IP, > 300 gagal per jam = 429. Tidak dikenal dan dicabut dijawab sama (403). */
export async function pemegangKode(env, req, modul, cari, kini = Date.now()) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const k = (req.headers.get("x-kode") || "").trim().toLowerCase();
  const r = /^[0-9a-f]{26}$/.test(k) ? await cari(await sha(k)) : null;
  if (r) return r;   // kode sah lolos tanpa menyentuh penghitung kegagalan
  const ip = await ipHash(env, req), aksi = modul + ".kode_gagal";
  const n = (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(ip, aksi, kini - JAM).first()).n;
  if (n >= 300) return gagal(429, "terlalu banyak kode salah dari jaringan ini; coba lagi nanti", {"retry-after": "3600"});
  await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(ip, aksi, kini).run();
  return gagal(403, "kode tidak berlaku (salah atau sudah dicabut); minta tautan baru dari admin");
}

/* Halaman publik Ruang Koordinasi dari public/bnpb/<berkas>.html dengan CSP ketat (tanpa skrip/gaya inline). */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://*.openfreemap.org; connect-src 'self' https://*.openfreemap.org; worker-src blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
/* turnstile: true = halaman berformulir publik; bila TURNSTILE_SITEKEY diset, CSP mengizinkan widget challenges.cloudflare.com (skrip + bingkai) */
const CSP_TS = CSP.replace("script-src 'self'", "script-src 'self' https://challenges.cloudflare.com").replace("frame-ancestors", "frame-src https://challenges.cloudflare.com; frame-ancestors");
export async function halamanBnpbPublik(env, url, berkas, {pribadi = false, turnstile = false} = {}) {
  const r = await env.ASSETS.fetch(new Request(new URL(`/bnpb/${berkas}.html`, url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman tidak ada"); }
  return new Response(r.body, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": pribadi ? "no-store" : "public, max-age=300", "x-content-type-options": "nosniff",
    "referrer-policy": pribadi ? "no-referrer" : "strict-origin-when-cross-origin", ...(pribadi ? {"x-robots-tag": "noindex, nofollow"} : {}), "content-security-policy": turnstile && env.TURNSTILE_SITEKEY ? CSP_TS : CSP}});
}

/* cron menit 17 */
export const bersihkanBnpb = (env, kini = Date.now()) => env.DB.prepare("DELETE FROM laju_bnpb WHERE waktu <= ?").bind(kini - 2 * HARI).run();

/* halaman Ruang Koordinasi tanpa modul worker sendiri (datanya JSON statis atau endpoint ringkas modul lain) */
export const RUTE_BNPB = {
  "GET /bnpb": (env, req, url) => halamanBnpbPublik(env, url, "index"),
  "GET /risiko": (env, req, url) => halamanBnpbPublik(env, url, "risiko"),
  "GET /sitrep": (env, req, url) => halamanBnpbPublik(env, url, "sitrep"),
  "GET /kebutuhan": (env, req, url) => halamanBnpbPublik(env, url, "kebutuhan"),
  /* bukan "/kebakaran": jalur itu disisakan untuk entri registry bencana bila kelak ada */
  "GET /risiko-kebakaran": (env, req, url) => halamanBnpbPublik(env, url, "kebakaran"),
  /* berkas Gakkum konsesi: bahan awal, admin saja (data konsesi sendiri publik di /data/konsesi2026) */
  "GET /admin/gakkum": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("gakkum")),
  /* Layar Pimpinan: satu layar lintas sistem untuk pimpinan, dirakit di peramban dari API admin yang sudah ada (tanpa rute data baru) */
  "GET /admin/pimpinan": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("pimpinan")),
};
