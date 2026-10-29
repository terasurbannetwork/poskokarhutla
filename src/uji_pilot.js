/* Uji pilot SIPPA Kalteng tanpa login (keputusan SIPPA 58, 59): dossier 10 lokasi + laporan bukti lapangan berfoto.
   - GET /uji-pilot: halaman statis (public/pipa/uji_pilot.html), CSP ketat, no-store, noindex. Token ada di fragmen URL (#t=<36 hex>),
     tidak pernah di path atau query, jadi tidak masuk log; peramban mengirimnya lewat header x-uji.
   - Satu token untuk seluruh tim (siapa pun yang memegang tautan). Hanya sha256-nya di kode (TOKEN_SHA); token dibagikan pemilik.
     Mengganti token = ganti TOKEN_SHA lalu terbitkan; tautan lama langsung mati.
   - Data dossier (src/uji_pilot_data.js, dibangkitkan scripts/data/sippa/pilot/ekspor_web.py) hanya dikirim bila token cocok.
   - Laporan = satu foto bukti per tahap: GPS 3 bacaan + cek anti GPS palsu (src/gps.js) dan cek EXIF (dekat dan baru), pola src/foto.js.
     Metadata foto dibuang (src/media_bersih.js) sebelum masuk R2 MEDIA uji-pilot/<id>; GPS dan waktu yang lolos dicatat di D1 (migrasi 0061).
   - Tebakan token salah dihitung per IP (laju_bnpb uji_pilot.gagal, > 300 per jam = 429); token benar tidak dihitung. */
import {json, gagal, acak, sha, shaBytes, ipHash, bersihTeks} from "./worker.js";
import {superOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {jenisBerkas, jarakM} from "./foto.js";
import {bersihMedia} from "./media_bersih.js";
import {nilaiGps, jaringanRelay} from "./gps.js";
import {jaringanHosting} from "./publik.js";
import {TAHAP, TAHAP_ID, PETAK, MAKS, cekIsi} from "../public/pipa/uji_pilot_spek.js";
import {DATA} from "./uji_pilot_data.js";

export const TOKEN_SHA = "904695bf239cfe25dc8c48e0d32825e443508cebf41a146d018d2ca36f7ac105";
const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM;
export const BATAS_UJI = {foto: 8 * 1048576, thumb: 300 * 1024, akurasi: 1000, gpsUmur: 10 * MENIT, exifJarak: 5000, exifUmur: 48 * JAM,
  lapor: [[JAM, 60], [HARI, 400]], gagal: 300};
const RE_TOKEN = /^[0-9a-f]{36}$/;
const KEPALA = {"cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow"};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
const PETAK_LOKASI = new Map(DATA.lokasi.map(l => [l.no, l.petak]));
const tanpaTabel = e => /no such table: (main\.)?uji_pilot_lapor/i.test(String(e?.message || e));
const belumMigrasi = () => gagal(503, "laporan uji belum aktif (migrasi 0061 belum dijalankan)");

/* token dari header x-uji: cocok -> null; salah -> Response (403, atau 429 bila IP sudah terlalu sering salah) */
async function cekToken(env, req, kini) {
  const t = req.headers.get("x-uji") || "";
  /* UJI_PILOT_SHA hanya dihormati di harness uji (IP_SALT "garam-uji"): var yang tersetel di produksi tidak bisa mengganti token tanpa commit */
  const sah = env.UJI_PILOT_SHA && env.IP_SALT === "garam-uji" ? env.UJI_PILOT_SHA : TOKEN_SHA;
  if (RE_TOKEN.test(t) && await sha(t) === sah) return null;
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");   // tanpa garam tebakan tidak bisa dibatasi
  if (env.DB) {
    const ip = await ipHash(env, req);
    const n = (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'uji_pilot.gagal' AND waktu > ?").bind(ip, kini - JAM).first()).n;
    if (n >= BATAS_UJI.gagal) return gagal(429, "terlalu banyak percobaan tautan salah; coba lagi sejam lagi", {"retry-after": "3600"});
    await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'uji_pilot.gagal', ?)").bind(ip, kini).run();
  }
  return gagal(403, "tautan uji tidak berlaku; minta tautan baru ke koordinator");
}
const kepalaJson = r => { for (const [k, v] of Object.entries(KEPALA)) r.headers.set(k, v); return r; };

async function halaman(env, req, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "metode tidak diizinkan", {allow: "GET, HEAD"});
  const r = await env.ASSETS.fetch(new Request(new URL("/pipa/uji_pilot.html", url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman uji tidak ada"); }
  return new Response(req.method === "HEAD" ? null : r.body, {headers: {"content-type": "text/html; charset=utf-8", ...KEPALA, "content-security-policy": CSP}});
}

async function data(env, req, url, kini) {
  const x = await cekToken(env, req, kini); if (x) return x;
  return kepalaJson(json({...DATA, tahap: TAHAP, admin: !!await superOK(env, req)}));
}

const KOLOM = "id, lokasi, tahap, petak, isi, catatan, nama, regu, lat, lon, akurasi, jarak_petak_m, diambil, exif_waktu, exif_jarak, gps_curiga, mime, dibuat, dummy";
async function daftar(env, req, url, kini) {
  const x = await cekToken(env, req, kini); if (x) return x;
  const lokasi = url.searchParams.get("lokasi");
  if (lokasi !== null && !/^([1-9]|10)$/.test(lokasi)) return gagal(400, "lokasi harus 1 sampai 10");
  try {
    const r = await env.DB.prepare(`SELECT ${KOLOM} FROM uji_pilot_lapor ${lokasi ? "WHERE lokasi = ?" : ""} ORDER BY diambil DESC, rowid DESC LIMIT 1000`).bind(...(lokasi ? [Number(lokasi)] : [])).all();
    return kepalaJson(json({lapor: r.results.map(b => ({...b, isi: JSON.parse(b.isi)}))}));
  } catch (e) { if (tanpaTabel(e)) return kepalaJson(json({lapor: [], belum_aktif: true})); throw e; }   // sengaja 200: dossier tetap terbaca, layar menulis "laporan belum aktif"
}

/* CSV untuk analisis vonis keputusan 53: satu baris per laporan, isi dipecah jadi kolom (suhu dijadikan JSON) */
const sel = v => { if (v == null) return ""; let s = typeof v === "object" ? JSON.stringify(v) : String(v); if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
async function csv(env, req, url, kini) {
  const x = await cekToken(env, req, kini); if (x) return x;
  let r; try { r = await env.DB.prepare(`SELECT ${KOLOM} FROM uji_pilot_lapor WHERE dummy = 0 ORDER BY lokasi, diambil`).all(); }
  catch (e) { if (tanpaTabel(e)) return belumMigrasi(); throw e; }
  const medan = [...new Set(TAHAP.flatMap(t => t.medan.map(m => m.nama)))];
  const kol = ["id", "lokasi", "tahap", "petak", "diambil_wib", ...medan, "catatan", "nama", "regu", "lat", "lon", "akurasi", "jarak_petak_m", "exif_waktu", "exif_jarak", "gps_curiga"];
  const wib = ms => new Date(ms + 7 * JAM).toISOString().slice(0, 16).replace("T", " ");
  const baris = r.results.map(b => { const i = JSON.parse(b.isi); return kol.map(k => sel(k === "diambil_wib" ? wib(b.diambil) : k in i ? i[k] : b[k])).join(","); });
  return new Response([kol.join(","), ...baris].join("\r\n") + "\r\n", {headers: {...KEPALA, "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="uji-pilot-kalteng-${new Date(kini).toISOString().slice(0, 10).replaceAll("-", "")}.csv"`}});
}

async function lapor(env, req, url, kini) {
  const x = await cekToken(env, req, kini); if (x) return x;
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum tersedia");
  if (!(req.headers.get("content-type") || "").startsWith("multipart/form-data")) return gagal(400, "kirim sebagai multipart/form-data");
  const pjg = Number(req.headers.get("content-length") || 0);
  if (!(pjg > 0)) return gagal(411, "Content-Length wajib pada unggahan");
  if (pjg > BATAS_UJI.foto + BATAS_UJI.thumb + 65536) return gagal(413, `kiriman terlalu besar, foto maksimal ${BATAS_UJI.foto / 1048576} MB`);
  let f; try { f = await req.formData(); } catch (e) { return gagal(400, "formulir tidak terbaca"); }
  const v = k => f.get(k), n = k => (v(k) == null || v(k) === "" ? null : Number(v(k)));

  const lokasi = n("lokasi"); if (!Number.isInteger(lokasi) || !PETAK_LOKASI.has(lokasi)) return gagal(400, "lokasi harus 1 sampai 10");
  const tahap = String(v("tahap") || ""), petak = v("petak") ? String(v("petak")) : null;
  let isiMentah = {}; try { isiMentah = JSON.parse(String(v("isi") || "{}")); } catch (e) { return gagal(400, "isi bukan JSON"); }
  if (typeof isiMentah !== "object" || isiMentah === null || Array.isArray(isiMentah)) return gagal(400, "isi harus objek");
  const cat = bersihTeks(String(v("catatan") || ""), MAKS.catatan); if (cat.galat) return gagal(400, "catatan: " + cat.galat);
  const c = cekIsi(tahap, petak, isiMentah, cat.teks); if (!c.ok) return gagal(400, c.galat.join("; "));
  const isi = JSON.stringify(c.isi); if (isi.length > MAKS.isi) return gagal(400, "isian terlalu panjang");
  const nm = bersihTeks(String(v("nama") || ""), MAKS.nama); if (nm.galat) return gagal(400, "nama: " + nm.galat);
  const rg = bersihTeks(String(v("regu") || ""), MAKS.regu); if (rg.galat) return gagal(400, "regu: " + rg.galat);

  const lat = n("lat"), lon = n("lon"), akurasi = n("akurasi"), waktuGps = n("waktu_gps");
  if (![lat, lon, akurasi, waktuGps].every(Number.isFinite)) return gagal(400, "lokasi GPS wajib: izinkan akses lokasi lalu ambil foto lagi");
  if (lat < -11.5 || lat > 6.5 || lon < 94.5 || lon > 141.5) return gagal(400, "lokasi GPS di luar Indonesia");
  if (akurasi < 0 || akurasi > BATAS_UJI.akurasi) return gagal(400, `akurasi GPS ±${Math.round(akurasi)} m terlalu lemah; coba di tempat terbuka`);
  if (Math.abs(kini - waktuGps) > BATAS_UJI.gpsUmur) return gagal(400, "lokasi GPS sudah lama; ambil ulang lokasi lalu kirim");

  const foto = v("foto"), thumb = v("thumb");
  if (!(foto instanceof File) || !foto.size) return gagal(400, "foto bukti wajib");
  if (!(thumb instanceof File) || !thumb.size || thumb.size > BATAS_UJI.thumb) return gagal(400, "gambar kecil wajib (dibuat otomatis oleh halaman), maksimal 300 KB");
  if (foto.size > BATAS_UJI.foto) return gagal(413, `foto maksimal ${BATAS_UJI.foto / 1048576} MB`);
  const b = new Uint8Array(await foto.arrayBuffer()), tb = new Uint8Array(await thumb.arrayBuffer());
  const mime = jenisBerkas(b), mimeT = jenisBerkas(tb);
  if (mime !== "image/jpeg" && mime !== "image/webp") return gagal(400, "foto harus JPEG atau WebP");
  if (mimeT !== "image/jpeg" && mimeT !== "image/webp") return gagal(400, "gambar kecil harus JPEG atau WebP");

  /* EXIF dibaca peramban dari berkas asli: harus dekat posisi sekarang dan diambil 48 jam terakhir */
  let exifJarak = null, diambil = kini, exifWaktu = 0;
  const eLat = n("exif_lat"), eLon = n("exif_lon"), eT = n("exif_waktu");
  if (Number.isFinite(eLat) && Number.isFinite(eLon)) {
    exifJarak = Math.round(jarakM(lat, lon, eLat, eLon));
    if (exifJarak > BATAS_UJI.exifJarak) return gagal(400, `foto diambil ${(exifJarak / 1000).toFixed(1)} km dari posisi sekarang; kirim dari lokasi pengambilan`);
  }
  if (Number.isFinite(eT) && eT <= kini + 10 * MENIT) {
    if (kini - eT > BATAS_UJI.exifUmur) return gagal(400, "foto lebih tua dari 48 jam; ambil foto baru");
    diambil = Math.min(eT, kini); exifWaktu = 1;
  }

  const ip = await ipHash(env, req);
  const l = await laju(env, ip, "uji_pilot.lapor", BATAS_UJI.lapor, kini); if (l) return l;
  let sebelum = null;
  try { sebelum = await env.DB.prepare("SELECT lat, lon, dibuat, 'ip' lewat FROM uji_pilot_lapor WHERE ip_hash = ? AND dibuat > ? AND dummy = 0 ORDER BY dibuat DESC LIMIT 1").bind(ip, kini - HARI).first(); }
  catch (e) { if (tanpaTabel(e)) return belumMigrasi(); throw e; }
  const gps = nilaiGps({negara: req.cf?.country, hosting: jaringanHosting(req.cf), relay: jaringanRelay(req.cf), zona: v("zona"), prov: "62", lat, lon, waktuGps, sampel: v("sampel"), sebelum, kini});
  if (gps.tolak) return gagal(400, gps.tolak);

  const simpan = bersihMedia(mime, b), simpanT = bersihMedia(mimeT, tb);
  if (!simpan || !simpanT) return gagal(400, "struktur foto tidak sah (berkas rusak)");
  const id = acak(8), [pla, plo] = PETAK_LOKASI.get(lokasi);
  const hapusBerkas = () => env.MEDIA.delete([`uji-pilot/${id}`, `uji-pilot/${id}_t`]).catch(() => {});   // galat hapus tidak boleh menutupi galat asli
  try {
    await env.MEDIA.put(`uji-pilot/${id}`, simpan, {httpMetadata: {contentType: mime}});
    await env.MEDIA.put(`uji-pilot/${id}_t`, simpanT, {httpMetadata: {contentType: mimeT}});
    await env.DB.prepare(`INSERT INTO uji_pilot_lapor (id, lokasi, tahap, petak, isi, catatan, nama, regu, lat, lon, akurasi, jarak_petak_m, diambil, exif_waktu, exif_jarak,
      gps_curiga, mime, ukuran, sha256, dibuat, ip_hash, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
      .bind(id, lokasi, tahap, petak, isi, cat.teks || null, nm.teks || null, rg.teks || null, Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, Math.round(akurasi),
        Math.round(jarakM(lat, lon, pla, plo)), diambil, exifWaktu, exifJarak, gps.curiga.join(", ").slice(0, 600) || null, mime, simpan.length, await shaBytes(simpan), kini, ip).run();
  } catch (e) { await hapusBerkas(); if (tanpaTabel(e)) return belumMigrasi(); throw e; }
  return kepalaJson(json({id, diambil, jarak_petak_m: Math.round(jarakM(lat, lon, pla, plo)), curiga: gps.curiga}, 201));
}

/* foto dan gambar kecil: hanya dengan token (img biasa tidak bisa mengirim header, jadi halaman mengambilnya lewat fetch lalu blob) */
async function berkas(env, req, url, kini, ctx, id, kecil) {
  const x = await cekToken(env, req, kini); if (x) return x;
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum tersedia");
  const o = await env.MEDIA.get(`uji-pilot/${id}${kecil ? "_t" : ""}`); if (!o) return gagal(404, "foto tidak ada");
  return new Response(o.body, {headers: {...KEPALA, "content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, max-age=3600"}});
}

/* dummy (DUMMY.md): admin saja; mengisi SEMUA tahap untuk lokasi yang sedang dibuka, tanpa foto (layar memakai citra lokasi sebagai pengganti) */
async function dummy(env, req, url, kini) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  let o; try { o = await req.json(); } catch (e) { return gagal(400, "badan bukan JSON"); }
  try {
    if (o?.aksi === "hapus") { const r = await env.DB.prepare("DELETE FROM uji_pilot_lapor WHERE dummy = 1").run(); return json({dihapus: r.meta.changes}); }
    if (o?.aksi !== "isi" || !PETAK_LOKASI.has(o.lokasi)) return gagal(400, "aksi isi butuh lokasi 1 sampai 10, atau aksi hapus");
    const ada = (await env.DB.prepare("SELECT count(*) n FROM uji_pilot_lapor WHERE dummy = 1 AND lokasi = ?").bind(o.lokasi).first()).n;
    if (ada) return json({dibuat: 0, sudah_ada: ada});
    const [pla, plo] = PETAK_LOKASI.get(o.lokasi), st = [], mulai = kini - 26 * JAM;
    const kisi = (dasar) => Object.fromEntries([1, 2, 3, 4, 5].map(t => [String(t), [dasar + t * 3, dasar + 18 + t * 2, dasar + 30 - t, dasar + 12 + t]]));
    const contoh = [["tiba", null, {n_orang: 9, jenis: "karhutla"}, 0], ["pompa", null, {jenis_air: "kanal", dalam_air_cm: 60, lebar_air_m: 4}, 50],
      ["air_mengalir", null, {air_sampai_lance: 1, tekanan_pompa_bar: 4.1, tekanan_lance_bar: 2.6, panjang_selang_m: 120}, 95],
      ...PETAK.flatMap((pt, i) => [["petak_sebelum", pt, {tebal_gambut_cm: 280 + i * 20, muka_air_cm: 70, asap: 2, suhu: kisi(48)}, 110 + i * 5],
        ["injeksi", pt, pt[0] === "L" ? {menit: 50, tusukan: 25, tekanan_lance_bar: 2.4, tahan_2bar_menit: 42} : {menit: 35}, 140 + i * 10],
        ["petak_sesudah", pt, {asap: pt[0] === "L" ? 0 : 1, suhu: kisi(pt[0] === "L" ? 26 : 34)}, 210 + i * 5],
        ["petak_24j", pt, {asap: pt[0] === "L" ? 0 : 1, nyala_ulang: pt === "K2" ? 1 : 0, suhu: kisi(pt[0] === "L" ? 24 : 36)}, 24 * 60 + 110 + i * 5]]),
      ["bongkar", null, {jam_pompa: 3.5, bbm_l: 12, kecelakaan: 0, bocor_henti_menit: 0, alat_kembali_pct: 100}, 290],
      ["kendala", null, {}, 70]];
    for (const [tahap, petak, isi, menit] of contoh) {
      const t = mulai + menit * MENIT, la = pla + (Math.random() - .5) * 4e-4, lo = plo + (Math.random() - .5) * 4e-4;
      st.push(env.DB.prepare(`INSERT INTO uji_pilot_lapor (id, lokasi, tahap, petak, isi, catatan, nama, regu, lat, lon, akurasi, jarak_petak_m, diambil, exif_waktu, dibuat, dummy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)`).bind(acak(8), o.lokasi, tahap, petak, JSON.stringify(isi), tahap === "kendala" ? "Contoh: kopling bocor di gulung ke-4, diganti karet perapat 10 menit." : null,
        "Contoh Petugas", "Regu Contoh Daops", la, lo, 8, Math.round(jarakM(la, lo, pla, plo)), t, t));
    }
    await env.DB.batch(st);
    return json({dibuat: st.length}, 201);
  } catch (e) { if (tanpaTabel(e)) return belumMigrasi(); throw e; }
}

export const RUTE_UJI_PILOT = {
  "GET /uji-pilot": halaman,
  "HEAD /uji-pilot": halaman,
  "GET /api/uji-pilot": data,
  "GET /api/uji-pilot/lapor": daftar,
  "POST /api/uji-pilot/lapor": lapor,
  "GET /api/uji-pilot/lapor.csv": csv,
  "GET /api/uji-pilot/foto/:id": (env, req, url, kini, ctx, id) => berkas(env, req, url, kini, ctx, id, false),
  "GET /api/uji-pilot/kecil/:id": (env, req, url, kini, ctx, id) => berkas(env, req, url, kini, ctx, id, true),
  "POST /api/uji-pilot/dummy": dummy,
};
