/* Foto & video lapangan: warga mengunggah dari lokasinya, admin menyetujui, peta & galeri menampilkan yang tayang.
   Skema: migrations/0007_foto.sql. Berkas di R2 (binding MEDIA): foto/<id> (media) dan foto/<id>_t (thumbnail WebP/JPEG).
   Tanpa binding MEDIA semua rute menulis/membaca berkas menjawab 503 (situs lain tetap jalan).

   Lokasi "beneran dari situ": koordinat = GPS perangkat saat unggah (peramban, akurasi <= 1 km, dibaca <= 10 menit lalu),
   pengguna tidak bisa memilih titik. Bila foto masih membawa GPS/waktu EXIF, keduanya dicocokkan: > 5 km dari GPS perangkat
   atau diambil > 48 jam lalu = ditolak. Sisanya (GPS palsu lewat aplikasi pengubah lokasi) disaring admin; lencana di antrean
   admin menunjukkan apa yang terverifikasi. ponytail: GPS peramban bisa dipalsukan; atestasi perangkat (Play Integrity/App
   Attest) butuh aplikasi asli, bukan web.

   Publik tidak pernah melihat email, hash IP, atau baris dummy (dummy hanya untuk admin bersesi lewat ?dummy=1),
   kecuali FOTO_DUMMY_PUBLIK = "1" menayangkannya sebagai contoh. */
import {json, gagal, acak, sha, ipHash, turnstileOK, adminOK, bersihTeks, bacaBody, cacheTepi} from "./worker.js";
import {wilayah, cariWilayah} from "./titik.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM;
export const BATAS_FOTO = {unggah: [[JAM, 5], [HARI, 20]], komentar: [[JAM, 10], [HARI, 50]], suka: [[JAM, 120]], aduan: [[JAM, 20]]};
export const KATEGORI = {api: "Api", asap: "Asap", padam: "Pemadaman", dampak: "Dampak", lainnya: "Lainnya"};
const ALASAN = ["tidak_relevan", "palsu", "kasar", "pribadi", "lainnya"];
const MAKS = {foto: 3 * 1048576, video: 30 * 1048576, thumb: 300 * 1024}, MAKS_DURASI = 60, AKURASI_MAKS = 1000;
const EXIF_JARAK_MAKS = 5000, EXIF_UMUR_MAKS = 48 * JAM, GPS_UMUR_MAKS = 10 * MENIT, UMUR_DAFTAR = 90 * HARI;
const jarakM = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371e3; };
const RE_EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const tanpaMedia = () => gagal(503, "penyimpanan foto belum diaktifkan (R2 binding MEDIA)");

async function laju(env, ip, aksi, kini) {
  for (const [jendela, maks] of BATAS_FOTO[aksi]) {
    const r = await env.DB.prepare("SELECT count(*) n FROM foto_laju WHERE ip_hash = ? AND aksi = ? AND waktu > ?").bind(ip, aksi, kini - jendela).first();
    if (r.n >= maks) return gagal(429, `batas ${aksi}: ${maks} per ${jendela / JAM} jam sudah tercapai`, {"retry-after": String(Math.ceil(jendela / 1000))});
  }
  await env.DB.prepare("INSERT INTO foto_laju (ip_hash, aksi, waktu) VALUES (?, ?, ?)").bind(ip, aksi, kini).run();
  return null;
}

/* ---------------- jenis berkas dari byte awal, bukan dari nama/Content-Type kiriman ---------------- */
export function jenisBerkas(b) {
  const s = (i, n) => String.fromCharCode(...b.subarray(i, i + n));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "image/webp";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  if (s(4, 4) === "ftyp") return s(8, 2) === "qt" ? "video/quicktime" : "video/mp4";
  return null;
}
/* durasi MP4/MOV dari kotak mvhd (detik). null = tidak ketemu (WebM, berkas rusak): durasi kiriman peramban yang dipakai. */
export function durasiMP4(b) {
  for (let i = 4; i < b.length - 32; i++) {
    if (b[i] !== 0x6d || b[i + 1] !== 0x76 || b[i + 2] !== 0x68 || b[i + 3] !== 0x64) continue;   // "mvhd"
    const v = new DataView(b.buffer, b.byteOffset + i + 4), versi = v.getUint8(0);
    const skala = versi === 1 ? v.getUint32(20) : v.getUint32(12), durasi = versi === 1 ? Number(v.getBigUint64(24)) : v.getUint32(16);
    return skala ? durasi / skala : null;
  }
  return null;
}

/* ---------------- baris -> objek publik (tanpa email, hash IP, flag dummy) ---------------- */
const KOLOM_PUBLIK = "id, jenis, kategori, lat, lon, prov, kab, kec, keterangan, nama, tampil_nama, diambil, dibuat, exif_waktu, exif_jarak, kamera, durasi, suka, komentar, dilihat";
const publik = r => ({id: r.id, jenis: r.jenis, kategori: r.kategori, lat: r.lat, lon: r.lon, prov: r.prov, kab: r.kab, kec: r.kec, keterangan: r.keterangan,
  kredit: r.tampil_nama ? r.nama : null, diambil: r.diambil, dibuat: r.dibuat, durasi: r.durasi, suka: r.suka, komentar: r.komentar, dilihat: r.dilihat || 0,
  terverifikasi: {kamera: !!r.kamera, waktu: !!r.exif_waktu, gps: r.exif_jarak != null}, contoh: r.dummy ? true : undefined});

async function daftar(env, req, url, kini, ctx) {
  const lihatDummy = url.searchParams.get("dummy") === "1" && await adminOK(env, req, kini);
  /* FOTO_DUMMY_PUBLIK = "1" (wrangler.jsonc): dummy yang tayang ikut di daftar publik, tetap berlencana "contoh" (pemilik, 15 Okt 2026) */
  const dummyPublik = env.FOTO_DUMMY_PUBLIK === "1";
  const ambil = async () => {
    const r = await env.DB.prepare(`SELECT ${KOLOM_PUBLIK}, dummy FROM foto WHERE status = 'tayang' AND dibuat > ? ${lihatDummy || dummyPublik ? "" : "AND dummy = 0"} ORDER BY dibuat DESC LIMIT 1000`)
      .bind(kini - UMUR_DAFTAR).all();
    return json({foto: r.results.map(publik), kategori: KATEGORI});
  };
  return lihatDummy ? ambil() : cacheTepi(req, ctx, 60, ambil);
}

async function rincian(env, req, id, kini, ctx) {
  const r = await env.DB.prepare(`SELECT ${KOLOM_PUBLIK}, status, dummy FROM foto WHERE id = ?`).bind(id).first();
  if (!r || (r.status !== "tayang" && !(await adminOK(env, req, kini)))) return gagal(404, "foto tidak ada atau belum disetujui");
  /* hitung dilihat (hanya yang tayang); di belakang supaya respons tidak menunggu tulis */
  if (r.status === "tayang") { const t = env.DB.prepare("UPDATE foto SET dilihat = dilihat + 1 WHERE id = ?").bind(id).run().catch(() => {}); ctx?.waitUntil ? ctx.waitUntil(t) : await t; }
  const ip = env.IP_SALT ? await ipHash(env, req) : "";
  const [k, s] = await env.DB.batch([
    env.DB.prepare("SELECT id, nama, teks, dibuat FROM foto_komentar WHERE foto_id = ? AND disembunyikan = 0 ORDER BY dibuat DESC LIMIT 200").bind(id),
    env.DB.prepare("SELECT 1 FROM foto_suka WHERE foto_id = ? AND ip_hash = ?").bind(id, ip)]);
  return json({...publik(r), komentar_daftar: k.results, suka_saya: s.results.length > 0});
}

/* media & thumbnail dari R2; yang belum tayang hanya untuk admin. Dukung Range (video bisa digeser tanpa unduh penuh). */
/* 100 foto karhutla berbeda dari Wikimedia Commons (lisensi bebas, kredit di /img/dummy/kredit.json); dua digit hex terakhir id dummy = nomor fotonya */
const ASET_DUMMY = Array.from({length: 100}, (_, i) => `/img/dummy/${String(i).padStart(3, "0")}.jpg`);
async function media(env, req, url, id, kini, thumb) {
  const r = await env.DB.prepare("SELECT status, mime, dummy FROM foto WHERE id = ?").bind(id).first();
  if (!r) return gagal(404, "foto tidak ada");
  const tayang = r.status === "tayang";
  if (!tayang && !(await adminOK(env, req, kini))) return gagal(404, "foto belum disetujui");
  if (r.dummy) {   // dummy menunjuk foto contoh di aset statis (tidak ada berkas R2)
    const a = await env.ASSETS.fetch(new Request(new URL(ASET_DUMMY[parseInt(id.slice(-2), 16) % ASET_DUMMY.length], url)));
    if (!a.ok) return gagal(404, "aset contoh tidak ada");   // jangan balas 200 kosong: kartu jadi abu-abu tanpa galat
    return new Response(a.body, {headers: {"content-type": a.headers.get("content-type") || "image/jpeg", "cache-control": "private, max-age=300"}});
  }
  if (!env.MEDIA) return tanpaMedia();
  const kunci = `foto/${id}${thumb ? "_t" : ""}`;
  const o = await env.MEDIA.get(kunci, thumb ? {} : {range: req.headers, onlyIf: req.headers});
  if (!o) return gagal(404, "berkas tidak ada");
  const h = new Headers({"content-type": thumb ? (o.httpMetadata?.contentType || "image/webp") : r.mime, "x-content-type-options": "nosniff",
    "cache-control": tayang ? "public, max-age=3600" : "private, no-store", "accept-ranges": "bytes", etag: o.httpEtag, "content-disposition": "inline"});
  if (!("body" in o)) return new Response(null, {status: 304, headers: h});
  if (o.range && !thumb && req.headers.has("range")) {
    const awal = o.range.offset ?? 0, pjg = o.range.length ?? (o.size - awal);
    h.set("content-range", `bytes ${awal}-${awal + pjg - 1}/${o.size}`); h.set("content-length", String(pjg));
    return new Response(o.body, {status: 206, headers: h});
  }
  h.set("content-length", String(o.size));
  return new Response(o.body, {headers: h});
}

/* ---------------- unggah (multipart) ---------------- */
async function unggah(env, req, url, kini) {
  if (!env.MEDIA) return tanpaMedia();
  if (!(req.headers.get("content-type") || "").startsWith("multipart/form-data")) return gagal(400, "kirim sebagai multipart/form-data");
  const pjg = Number(req.headers.get("content-length") || 0);
  if (pjg > MAKS.video + MAKS.thumb + 65536) return gagal(413, `kiriman ${Math.round(pjg / 1048576)} MB, maksimal ${MAKS.video / 1048576} MB`);
  let f; try { f = await req.formData(); } catch (e) { return gagal(400, "formulir tidak terbaca"); }
  const v = k => f.get(k), n = k => (v(k) == null || v(k) === "" ? null : Number(v(k)));

  const kategori = String(v("kategori") || "");
  if (!KATEGORI[kategori]) return gagal(400, `kategori harus ${Object.keys(KATEGORI).join("/")}`);
  if (v("setuju") !== "1") return gagal(400, "centang persetujuan unggah dulu");
  const lat = n("lat"), lon = n("lon"), akurasi = n("akurasi"), waktuGps = n("waktu_gps");
  if (![lat, lon, akurasi, waktuGps].every(Number.isFinite)) return gagal(400, "lokasi GPS perangkat wajib (izinkan akses lokasi)");
  if (akurasi < 0 || akurasi > AKURASI_MAKS) return gagal(400, `akurasi GPS ${Math.round(akurasi)} m terlalu lemah (maksimal ${AKURASI_MAKS} m); coba di tempat terbuka`);
  if (Math.abs(kini - waktuGps) > GPS_UMUR_MAKS) return gagal(400, "lokasi GPS sudah lama; ambil ulang lokasi lalu kirim");
  const W = await wilayah(env), kunci = cariWilayah(W, lat, lon);
  if (!kunci) return gagal(400, `lokasi ${lat.toFixed(4)}, ${lon.toFixed(4)} tidak berada di wilayah daratan Indonesia`);
  const [prov, kab, kec] = kunci.split("|");

  const media = v("media"), thumb = v("thumb");
  if (!(media instanceof File) || !media.size) return gagal(400, "berkas foto/video wajib");
  if (!(thumb instanceof File) || !thumb.size) return gagal(400, "thumbnail wajib (dibuat otomatis oleh halaman)");
  if (thumb.size > MAKS.thumb) return gagal(400, `thumbnail ${Math.round(thumb.size / 1024)} KB, maksimal ${MAKS.thumb / 1024} KB`);
  const b = new Uint8Array(await media.arrayBuffer()), tb = new Uint8Array(await thumb.arrayBuffer());
  const mime = jenisBerkas(b), mimeT = jenisBerkas(tb);
  if (!mime) return gagal(400, "berkas bukan foto (JPEG/WebP) atau video (MP4/MOV/WebM)");
  if (mimeT !== "image/webp" && mimeT !== "image/jpeg") return gagal(400, "thumbnail harus WebP/JPEG");
  const jenis = mime.startsWith("video/") ? "video" : "foto";
  if (b.length > MAKS[jenis]) return gagal(413, `${jenis} ${(b.length / 1048576).toFixed(1)} MB, maksimal ${MAKS[jenis] / 1048576} MB`);
  let durasi = null;
  if (jenis === "video") {
    durasi = durasiMP4(b) ?? n("durasi");
    if (!Number.isFinite(durasi) || durasi <= 0) return gagal(400, "durasi video tidak terbaca");
    if (durasi > MAKS_DURASI + .5) return gagal(400, `video ${Math.round(durasi)} detik, maksimal ${MAKS_DURASI} detik`);
  }

  /* EXIF (dibaca peramban dari berkas asli sebelum dikompres): GPS harus dekat GPS perangkat, waktu harus baru */
  let exifJarak = null, diambil = kini, exifWaktu = 0;
  const eLat = n("exif_lat"), eLon = n("exif_lon"), eT = n("exif_waktu");
  if (Number.isFinite(eLat) && Number.isFinite(eLon)) {
    exifJarak = Math.round(jarakM(lat, lon, eLat, eLon));
    if (exifJarak > EXIF_JARAK_MAKS) return gagal(400, `foto diambil ${(exifJarak / 1000).toFixed(1)} km dari posisi Anda sekarang; unggah dari lokasi pengambilan`);
  }
  if (Number.isFinite(eT) && eT <= kini + 10 * MENIT) {
    if (kini - eT > EXIF_UMUR_MAKS) return gagal(400, `foto diambil ${Math.round((kini - eT) / HARI)} hari lalu; hanya foto 48 jam terakhir`);
    diambil = Math.min(eT, kini); exifWaktu = 1;
  }

  const ket = bersihTeks(v("keterangan")); if (ket.galat) return gagal(400, "keterangan: " + ket.galat);
  const nm = bersihTeks(String(v("nama") || "").slice(0, 60)); if (nm.galat) return gagal(400, "nama: " + nm.galat);
  const tampil = v("tampil_nama") === "1" && nm.teks ? 1 : 0;
  const email = String(v("email") || "").trim();
  if (email && (email.length > 254 || !RE_EMAIL.test(email))) return gagal(400, "alamat email tidak sah");
  if (!(await turnstileOK(env, v("turnstile"), req))) return gagal(403, "verifikasi Turnstile gagal");
  const ip = await ipHash(env, req), l = await laju(env, ip, "unggah", kini); if (l) return l;

  const id = acak(8);
  await env.MEDIA.put(`foto/${id}`, b, {httpMetadata: {contentType: mime}});
  await env.MEDIA.put(`foto/${id}_t`, tb, {httpMetadata: {contentType: mimeT}});
  try {
    await env.DB.prepare(`INSERT INTO foto (id, jenis, kategori, lat, lon, akurasi, prov, kab, kec, keterangan, nama, tampil_nama, email, diambil, dibuat,
      exif_waktu, exif_jarak, kamera, ukuran, durasi, mime, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, jenis, kategori, Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, Math.round(akurasi), prov, kab, kec, ket.teks, nm.teks, tampil, email,
        diambil, kini, exifWaktu, exifJarak, v("kamera") === "1" ? 1 : 0, b.length, durasi, mime, ip).run();
  } catch (e) { await env.MEDIA.delete([`foto/${id}`, `foto/${id}_t`]); throw e; }   // baris gagal = berkas jangan yatim
  return json({id, status: "menunggu", wilayah: {prov, kab, kec}}, 201);
}

/* ---------------- suka (sakelar), komentar, aduan ---------------- */
async function suka(env, req, id, kini) {
  const ip = await ipHash(env, req), l = await laju(env, ip, "suka", kini); if (l) return l;
  const f = await env.DB.prepare("SELECT status FROM foto WHERE id = ?").bind(id).first();
  if (f?.status !== "tayang") return gagal(404, "foto tidak ada atau belum disetujui");
  const ada = await env.DB.prepare("SELECT 1 FROM foto_suka WHERE foto_id = ? AND ip_hash = ?").bind(id, ip).first();
  await env.DB.prepare(ada ? "DELETE FROM foto_suka WHERE foto_id = ? AND ip_hash = ?" : "INSERT INTO foto_suka (foto_id, ip_hash, waktu) VALUES (?, ?, ?)")
    .bind(...(ada ? [id, ip] : [id, ip, kini])).run();
  const r = await env.DB.prepare("SELECT suka FROM foto WHERE id = ?").bind(id).first();
  return json({suka: r.suka, suka_saya: !ada});
}
async function komentar(env, req, id, kini) {
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const t = bersihTeks(b.o.teks); if (t.galat) return gagal(400, t.galat);
  if (!t.teks) return gagal(400, "komentar kosong");
  const nm = bersihTeks(String(b.o.nama ?? "").slice(0, 60)); if (nm.galat) return gagal(400, "nama: " + nm.galat);
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const f = await env.DB.prepare("SELECT status FROM foto WHERE id = ?").bind(id).first();
  if (f?.status !== "tayang") return gagal(404, "foto tidak ada atau belum disetujui");
  const ip = await ipHash(env, req), l = await laju(env, ip, "komentar", kini); if (l) return l;
  const kid = acak(8);
  await env.DB.prepare("INSERT INTO foto_komentar (id, foto_id, nama, teks, dibuat, ip_hash) VALUES (?, ?, ?, ?, ?, ?)").bind(kid, id, nm.teks, t.teks, kini, ip).run();
  return json({id: kid, nama: nm.teks, teks: t.teks, dibuat: kini}, 201);
}
async function aduan(env, req, id, kini) {
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const jenis = b.o.jenis === "komentar" ? "komentar" : "foto", alasan = b.o.alasan;
  if (!ALASAN.includes(alasan)) return gagal(400, `alasan harus ${ALASAN.join("/")}`);
  const ada = await env.DB.prepare(jenis === "foto" ? "SELECT 1 FROM foto WHERE id = ? AND status = 'tayang'" : "SELECT 1 FROM foto_komentar WHERE id = ? AND disembunyikan = 0").bind(id).first();
  if (!ada) return gagal(404, `${jenis} tidak ada`);
  const ip = await ipHash(env, req), l = await laju(env, ip, "aduan", kini); if (l) return l;
  await env.DB.prepare("INSERT OR IGNORE INTO foto_aduan (target, jenis, ip_hash, alasan, waktu) VALUES (?, ?, ?, ?, ?)").bind(id, jenis, ip, alasan, kini).run();
  return json({ok: true});
}

/* ---------------- admin: antrean, keputusan, data dummy ---------------- */
async function adminDaftar(env, req, url, kini) {
  if (!(await adminOK(env, req, kini))) return gagal(403, "admin wajib masuk");
  if (url.searchParams.get("komentar") === "1")
    return json((await env.DB.prepare(`SELECT k.id, k.foto_id, k.nama, k.teks, k.dibuat, k.disembunyikan, k.aduan, k.dummy, f.kab FROM foto_komentar k JOIN foto f ON f.id = k.foto_id
      ORDER BY k.disembunyikan DESC, k.aduan DESC, k.dibuat DESC LIMIT 300`).all()).results);
  const st = ["menunggu", "tayang", "ditolak"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "menunggu";
  const [r, n] = await env.DB.batch([
    env.DB.prepare(`SELECT *, substr(ip_hash, 1, 8) pengirim FROM foto WHERE status = ? ORDER BY dibuat ${st === "menunggu" ? "ASC" : "DESC"} LIMIT 300`).bind(st),
    env.DB.prepare("SELECT status, count(*) n FROM foto GROUP BY status")]);
  return json({foto: r.results.map(({ip_hash, ...x}) => x), jumlah: Object.fromEntries(n.results.map(x => [x.status, x.n]))});
}
const AKSI = ["setujui", "tolak", "hapus", "sembunyikan_komentar", "tampilkan_komentar"];
async function adminAksi(env, req, url, id, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "admin wajib masuk");
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const aksi = b.o.aksi, alasan = String(b.o.alasan ?? "").slice(0, 200);
  if (!AKSI.includes(aksi)) return gagal(400, `aksi harus ${AKSI.join("/")}`);
  const catat = env.DB.prepare("INSERT INTO audit_foto (waktu, moderator, aksi, target, alasan) VALUES (?, ?, ?, ?, ?)").bind(kini, mod, aksi, id, alasan);
  if (aksi.endsWith("_komentar")) {
    const r = await env.DB.prepare("SELECT 1 FROM foto_komentar WHERE id = ?").bind(id).first(); if (!r) return gagal(404, "komentar tidak ada");
    const sembunyi = aksi === "sembunyikan_komentar" ? 1 : 0;
    await env.DB.batch([...(sembunyi ? [] : [env.DB.prepare("DELETE FROM foto_aduan WHERE target = ?").bind(id)]),
      env.DB.prepare("UPDATE foto_komentar SET disembunyikan = ?, aduan = CASE WHEN ? = 0 THEN 0 ELSE aduan END WHERE id = ?").bind(sembunyi, sembunyi, id), catat]);
    return json({ok: true});
  }
  const f = await env.DB.prepare("SELECT dummy FROM foto WHERE id = ?").bind(id).first(); if (!f) return gagal(404, "foto tidak ada");
  if (aksi === "tolak" && !alasan) return gagal(400, "tulis alasan penolakan");
  if (aksi === "hapus") {
    await env.DB.batch([env.DB.prepare("DELETE FROM foto WHERE id = ?").bind(id), catat]);
    if (env.MEDIA && !f.dummy) await env.MEDIA.delete([`foto/${id}`, `foto/${id}_t`]);
    return json({ok: true});
  }
  /* setujui = tayang dan aduan lama dihapus (diadukan lagi = antre lagi); tolak = tidak tayang, berkas dibuang cron 30 hari */
  await env.DB.batch([...(aksi === "setujui" ? [env.DB.prepare("DELETE FROM foto_aduan WHERE target = ?").bind(id)] : []),
    env.DB.prepare("UPDATE foto SET status = ?, alasan = ?, aduan = CASE WHEN ? = 'tayang' THEN 0 ELSE aduan END WHERE id = ?")
      .bind(aksi === "setujui" ? "tayang" : "ditolak", alasan, aksi === "setujui" ? "tayang" : "ditolak", id), catat]);
  return json({ok: true});
}

/* Dummy (aturan pemilik ~/.claude/DUMMY.md): lokasi = pusat kecamatan sungguhan di provinsi prioritas karhutla; tiap ember
   status (menunggu/tayang/ditolak), kategori, kredit tampil/anonim, verifikasi EXIF ada/tidak, suka, komentar (tampil &
   tersembunyi), dan aduan terisi. Ember dicapai lewat pintunya: lahir 'menunggu', lalu UPDATE seperti tombol admin; suka &
   komentar baru setelah tayang (trigger menolak sebelumnya). Gerbang "sudah ada" menghitung baris dummy yang MASIH hidup. */
const PROV_DUMMY = ["62", "16", "61", "14", "15", "64", "63"];
const KET_DUMMY = ["Api masih menyala di lahan gambut belakang kebun", "Asap tebal sejak pagi, jarak pandang sekitar 200 m", "Regu Manggala Agni sedang memadamkan",
  "Lahan bekas terbakar kemarin, masih ada bara", "Warga membantu membuat sekat bakar", "Asap mulai menipis setelah hujan semalam", "Sumur bor untuk pemadaman di dekat kanal"];
const N_DUMMY = 100;
const NAMA_DUMMY = ["Rina", "Budi S.", "Pak Darto", "", "Siti", "", "Yoga"];
async function dummy(env, req, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "admin wajib masuk");
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const catat = (aksi, n) => env.DB.prepare("INSERT INTO audit_foto (waktu, moderator, aksi, target, alasan) VALUES (?, ?, ?, 'dummy', ?)").bind(kini, mod, aksi, `${n} baris`);
  if (b.o.aksi === "hapus") {
    const n = (await env.DB.prepare("SELECT count(*) n FROM foto WHERE dummy = 1").first()).n;
    const r = await env.DB.batch([env.DB.prepare("DELETE FROM foto_komentar WHERE dummy = 1"), env.DB.prepare("DELETE FROM foto WHERE dummy = 1"), catat("hapus_dummy", n)]);
    return json({ok: true, foto: n, komentar: r[0].meta.changes});   // meta.changes foto ikut menghitung baris cascade
  }
  if (b.o.aksi !== "isi") return gagal(400, "aksi harus isi/hapus");
  const ada = (await env.DB.prepare("SELECT count(*) n FROM foto WHERE dummy = 1").first()).n;
  if (ada) return gagal(409, `data dummy masih ada (${ada} foto); hapus dulu bila ingin mengisi ulang`);
  const W = await wilayah(env), kec = [];
  for (const g of W.grid.values()) for (const k of g) if (PROV_DUMMY.includes(k[2].slice(0, 2))) kec.push(k);
  kec.sort((a, b) => a[2] < b[2] ? -1 : 1);
  const pilih = Array.from({length: N_DUMMY}, (_, i) => kec[Math.floor((i * 7919) % kec.length)]);
  const ipPalsu = i => sha(`dummy-${i}`), KAT = Object.keys(KATEGORI), st = [], ids = [];
  for (let i = 0; i < pilih.length; i++) {
    const [la, lo, kunci] = pilih[i], [prov, kab, kc] = kunci.split("|"), id = acak(7) + i.toString(16).padStart(2, "0"), nama = NAMA_DUMMY[i % NAMA_DUMMY.length];
    const dibuat = kini - (i * 1.5 + 1) * JAM, exifW = i % 3 !== 2, exifJ = i % 4 === 0 ? 40 + i * 13 : null;
    ids.push(id);
    st.push(env.DB.prepare(`INSERT INTO foto (id, jenis, kategori, lat, lon, akurasi, prov, kab, kec, keterangan, nama, tampil_nama, email, diambil, dibuat, exif_waktu, exif_jarak,
      kamera, ukuran, mime, ip_hash, dummy) VALUES (?, 'foto', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'image/webp', ?, 1)`)
      .bind(id, KAT[i % KAT.length], la + ((i % 5) - 2) * .004, lo + ((i % 3) - 1) * .004, 8 + (i * 17) % 90, prov, kab, kc, "[Contoh] " + KET_DUMMY[i % KET_DUMMY.length],
        nama, nama && i % 2 === 0 ? 1 : 0, i % 3 === 0 ? `warga${i}@contoh.id` : "", exifW ? dibuat - 25 * MENIT : dibuat, dibuat, exifW ? 1 : 0, exifJ, i % 2, 180000 + i * 9000, await ipPalsu(i % 9)));
  }
  /* ember: 0,1 menunggu (yang terbaru, seperti antrean nyata); tiap ke-6 ditolak; sisanya tayang */
  ids.forEach((id, i) => { if (i < 3) return; const tolak = i % 6 === 5;
    st.push(env.DB.prepare("UPDATE foto SET status = ?, alasan = ? WHERE id = ?").bind(tolak ? "ditolak" : "tayang", tolak ? "Foto tidak menunjukkan api/asap" : "", id)); });
  const KOM = ["Semoga cepat padam 🙏", "Di kampung sebelah juga berasap", "Terima kasih infonya, kami kirim regu", "Masih ada asap jam 5 sore tadi"];
  for (let i = 3; i < ids.length; i++) {
    if (i % 6 === 5) continue;
    const ns = (i * 5) % 13, sv = [];   // satu INSERT banyak baris per foto: 100 foto tetap jauh di bawah batas kueri per panggilan D1
    for (let s = 0; s < ns; s++) sv.push(ids[i], await ipPalsu(100 + s), kini - s * MENIT);
    if (ns) st.push(env.DB.prepare(`INSERT INTO foto_suka (foto_id, ip_hash, waktu) VALUES ${Array(ns).fill("(?, ?, ?)").join(", ")}`).bind(...sv));
    for (let k = 0; k < i % 4; k++) st.push(env.DB.prepare("INSERT INTO foto_komentar (id, foto_id, nama, teks, dibuat, disembunyikan, ip_hash, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(acak(8), ids[i], ["", "Andi", "Warga Kapuas"][k % 3], KOM[(i + k) % KOM.length], kini - (k + 1) * 20 * MENIT, i === 7 && k === 0 ? 1 : 0, await ipPalsu(200 + k)));
  }
  st.push(env.DB.prepare("INSERT INTO foto_aduan (target, jenis, ip_hash, alasan, waktu) VALUES (?, 'foto', ?, 'tidak_relevan', ?)").bind(ids[7], await ipPalsu(300), kini));
  st.push(catat("isi_dummy", ids.length));
  await env.DB.batch(st);
  return json({ok: true, foto: ids.length}, 201);
}

/* cron: foto ditolak > 30 hari dihapus beserta berkasnya; jejak laju > 2 hari dibuang */
export async function bersihkanFoto(env, kini = Date.now()) {
  const tolak = (await env.DB.prepare("SELECT id, dummy FROM foto WHERE status = 'ditolak' AND dibuat <= ? LIMIT 200").bind(kini - 30 * HARI).all()).results;
  if (tolak.length && env.MEDIA) await env.MEDIA.delete(tolak.filter(x => !x.dummy).flatMap(x => [`foto/${x.id}`, `foto/${x.id}_t`]));
  const r = await env.DB.batch([...tolak.map(x => env.DB.prepare("DELETE FROM foto WHERE id = ?").bind(x.id)),
    env.DB.prepare("DELETE FROM foto_laju WHERE waktu <= ?").bind(kini - 2 * HARI)]);
  return {foto: tolak.length, laju: r.at(-1).meta.changes};
}

/* pratinjau tautan /f/<id>: judul, keterangan, thumbnail (hanya yang tayang & bukan dummy) */
export async function ogFoto(env, url, id) {
  const r = await env.DB.prepare("SELECT kategori, keterangan, kab, kec, prov, diambil, nama, tampil_nama FROM foto WHERE id = ? AND status = 'tayang' AND dummy = 0").bind(id).first();
  if (!r) return null;
  const tgl = new Date(r.diambil).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"});
  return {judul: `${KATEGORI[r.kategori]} di ${r.kec}, ${r.kab} · Foto Lapangan`, desk: `${r.keterangan || "Foto lapangan warga"} (${tgl} WIB${r.tampil_nama ? ", oleh " + r.nama : ""})`,
    gambar: `${url.origin}/api/foto/thumb/${id}`, url: `${url.origin}/f/${id}`};
}

/* rute: kunci "METODE /jalur" (":id" = 16 hex di ujung), digabung ke RUTE di src/worker.js */
export const RUTE_FOTO = {
  "GET /api/foto": (env, req, url, kini, ctx) => daftar(env, req, url, kini, ctx),
  "POST /api/foto": (env, req, url, kini) => unggah(env, req, url, kini),
  /* wilayah dari koordinat GPS (tanpa simpan, tanpa log): layar "kamu terdeteksi di …" sebelum mengambil foto */
  "GET /api/foto/lokasi": async (env, req, url) => {
    const lat = Number(url.searchParams.get("lat")), lon = Number(url.searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -12 || lat > 8 || lon < 94 || lon > 142) return gagal(400, "koordinat di luar Indonesia");
    const k = cariWilayah(await wilayah(env), lat, lon); if (!k) return json({ada: false});
    const [prov, kab, kec] = k.split("|"); return json({ada: true, prov, kab, kec});
  },
  "GET /api/foto/konfig": (env) => json({turnstile: env.TURNSTILE_SITEKEY || null, media: !!env.MEDIA, batas: {...MAKS, durasi: MAKS_DURASI, akurasi: AKURASI_MAKS}, kategori: KATEGORI}),
  "GET /api/foto/:id": (env, req, url, kini, ctx, id) => rincian(env, req, id, kini, ctx),
  "GET /api/foto/media/:id": (env, req, url, kini, ctx, id) => media(env, req, url, id, kini, false),
  "GET /api/foto/thumb/:id": (env, req, url, kini, ctx, id) => media(env, req, url, id, kini, true),
  "POST /api/foto/suka/:id": (env, req, url, kini, ctx, id) => suka(env, req, id, kini),
  "POST /api/foto/komentar/:id": (env, req, url, kini, ctx, id) => komentar(env, req, id, kini),
  "POST /api/foto/aduan/:id": (env, req, url, kini, ctx, id) => aduan(env, req, id, kini),
  "GET /api/foto/admin": (env, req, url, kini) => adminDaftar(env, req, url, kini),
  "POST /api/foto/admin/:id": (env, req, url, kini, ctx, id) => adminAksi(env, req, url, id, kini),
  "POST /api/foto/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
