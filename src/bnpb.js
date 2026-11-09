/* Ruang Koordinasi BNPB: helper bersama modul relawan, alun-alun, riset, meja kerja (docs/bnpb/ARSITEKTUR.md).
   Skema: migrations/0022_bnpb_bersama.sql (laju_bnpb). Pola kode tanpa akun = kode regu Posko (src/posko.js reguDari). */
import {gagal, sha, acak, ipHash} from "./worker.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb, HALAMAN_STAF} from "./admin_halaman.js";

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
   Kode sah lolos dulu; hanya tebakan salah dihitung per IP, > `maks` (default 300) gagal per jam = 429. Tidak dikenal dan dicabut dijawab sama (403). */
export async function pemegangKode(env, req, modul, cari, kini = Date.now(), maks = 300) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const k = (req.headers.get("x-kode") || "").trim().toLowerCase();
  const r = /^[0-9a-f]{26}$/.test(k) ? await cari(await sha(k)) : null;
  if (r) return r;   // kode sah lolos tanpa menyentuh penghitung kegagalan
  const ip = await ipHash(env, req), aksi = modul + ".kode_gagal";
  const n = (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(ip, aksi, kini - JAM).first()).n;
  if (n >= maks) return gagal(429, "terlalu banyak kode salah dari jaringan ini; coba lagi nanti", {"retry-after": "3600"});
  await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(ip, aksi, kini).run();
  return gagal(403, "kode tidak berlaku (salah atau sudah dicabut); minta tautan baru dari admin");
}

/* Halaman publik Ruang Koordinasi dari public/bnpb/<berkas>.html dengan CSP ketat (tanpa skrip/gaya inline). */
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://*.openfreemap.org; connect-src 'self' https://*.openfreemap.org; worker-src blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
/* turnstile: true = halaman berformulir publik; bila TURNSTILE_SITEKEY diset, CSP mengizinkan widget challenges.cloudflare.com (skrip + bingkai) */
const CSP_PRATINJAU = CSP.replace("worker-src blob:", "worker-src 'self' blob:");   // worker PDF.js dari /vendor/pdfjs untuk pratinjau /bnpb/katalog-dokumen
const CSP_TS = CSP.replace("script-src 'self'", "script-src 'self' https://challenges.cloudflare.com").replace("frame-ancestors", "frame-src https://challenges.cloudflare.com; frame-ancestors");
/* citra: true = peta berlapis citra satelit Esri (pola peta utama); hanya halaman yang memerlukannya yang mendapat host ubin ini */
const CSP_CITRA = CSP.replace("img-src 'self' data: blob: https://*.openfreemap.org", "img-src 'self' data: blob: https://*.openfreemap.org https://server.arcgisonline.com")
  .replace("connect-src 'self' https://*.openfreemap.org", "connect-src 'self' https://*.openfreemap.org https://server.arcgisonline.com");
export async function halamanBnpbPublik(env, url, berkas, {pribadi = false, turnstile = false, bingkai = false, citra = false, gambar = "", pratinjau = false} = {}) {
  const r = await env.ASSETS.fetch(new Request(new URL(`/bnpb/${berkas}.html`, url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman tidak ada"); }
  return new Response(r.body, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": pribadi ? "no-store" : "public, max-age=300", "x-content-type-options": "nosniff",
    "referrer-policy": pribadi ? "no-referrer" : "strict-origin-when-cross-origin", ...(pribadi ? {"x-robots-tag": "noindex, nofollow"} : {}), "content-security-policy": pratinjau ? CSP_PRATINJAU : citra ? CSP_CITRA : turnstile && env.TURNSTILE_SITEKEY ? CSP_TS : bingkai ? CSP.replace("frame-ancestors 'none'", "frame-ancestors 'self'").replace("img-src 'self'", gambar ? `img-src 'self' ${gambar}` : "img-src 'self'") : CSP}});   // bingkai: boleh dibingkai situs sendiri (/admin/laporan); halaman lain tetap none
}

/* cron menit 17 */
export const bersihkanBnpb = (env, kini = Date.now()) => env.DB.prepare("DELETE FROM laju_bnpb WHERE waktu <= ?").bind(kini - 2 * HARI).run();

/* halaman Ruang Koordinasi tanpa modul worker sendiri (datanya JSON statis atau endpoint ringkas modul lain) */
export const RUTE_BNPB = {
  "GET /bnpb/logbook": (env, req, url) => halamanBnpbPublik(env, url, "logbook", {pribadi: true, bingkai: true}),   // layar staf; dibingkai /admin/laporan (frame-ancestors 'self')
  "GET /bnpb/operasi": (env, req, url) => halamanBnpbPublik(env, url, "operasi", {pribadi: true}),   // layar staf: pemulihan, Laporan Khusus, roll call (W2)
  /* Operasi udara pindah ke peta utama (pemilik 3 Nov 2026): tab Operasi di "/" (public/operasi_peta.js); alamat lama dialihkan */
  "GET /bnpb/operasi-lapangan": () => new Response(null, {status: 302, headers: {location: "/operasi", "cache-control": "no-store"}}),   // layar staf: peta operasi udara harian (OP-3), data dari /api/operasi/peta
  "GET /bnpb/dokumen": (env, req, url) => halamanBnpbPublik(env, url, "dokumen", {pribadi: true}),   // layar staf: BAST, Laporan Menonjol, Shift, Rekap Mingguan dari logbook
  "GET /bnpb/katalog-dokumen": (env, req, url) => halamanBnpbPublik(env, url, "katalog-dokumen", {pribadi: true, pratinjau: true}),   // katalog dokumen repo, terbuka tanpa login sementara, noindex; isi lewat /api/bnpb/katalog-dokumen
  "GET /bnpb/bahan": (env, req, url) => halamanBnpbPublik(env, url, "bahan", {pribadi: true}),   // layar staf: bahan laporan harian dari logbook, kirim ke WA (menu Pusdalops)
  "GET /bnpb/saham": (env, req, url) => halamanBnpbPublik(env, url, "saham", {pribadi: true, bingkai: true, gambar: "https://assets.stockbit.com"}),   // layar staf: data saham lewat proksi /api/saham/* (src/saham.js)
  "GET /bnpb/perencanaan": (env, req, url) => halamanBnpbPublik(env, url, "perencanaan", {pribadi: true}),   // layar staf: kab prioritas (beban laporan), kalender operasi, stok pra-musim
  "GET /bnpb": (env, req, url) => halamanBnpbPublik(env, url, "index"),
  "GET /risiko": (env, req, url) => halamanBnpbPublik(env, url, "risiko"),
  "GET /kinerja-bnpb": (env, req, url) => halamanBnpbPublik(env, url, "kinerja"),
  "GET /sitrep": (env, req, url) => halamanBnpbPublik(env, url, "sitrep"),
  "GET /kebutuhan": (env, req, url) => halamanBnpbPublik(env, url, "kebutuhan"),
  "GET /bnpb/siaga": (env, req, url) => halamanBnpbPublik(env, url, "siaga"),   // kalender siaga pra-musim (data /data/bnpb/siaga.json)
  /* bukan "/kebakaran": jalur itu disisakan untuk entri registry bencana bila kelak ada */
  "GET /risiko-kebakaran": (env, req, url) => halamanBnpbPublik(env, url, "kebakaran"),
  /* berkas Gakkum konsesi: bahan awal, admin saja (data konsesi sendiri publik di /data/konsesi2026) */
  "GET /admin/gakkum": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("gakkum")),
  /* Layar Pimpinan: satu layar lintas sistem untuk pimpinan, dirakit di peramban dari API admin yang sudah ada (tanpa rute data baru) */
  "GET /admin/pimpinan": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("pimpinan")),
  /* Kinerja pemantauan: tiga tab (Data, Proses, Lapangan) dari GET /api/sla (src/sla.js). Hak sama persis dengan API: adminOK (token, akun gerbang AKUN_SITUS, sesi admin) ATAU sesi staf berperan apa pun (SEMUA_PERAN). Staf tanpa peran/anonim ke login. */
  "GET /admin/kinerja": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("kinerja"), HALAMAN_STAF.kinerja),
};
