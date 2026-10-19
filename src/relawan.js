/* Relawan: rekrutmen, verifikasi, penugasan, jam kerja, relawan kampus lewat MoU PTN. Skema: migrations/0023_relawan.sql.
   Rancangan: docs/bnpb/RENCANA-12-JAM.md R1, kontrak bersama docs/bnpb/ARSITEKTUR.md.
   Aturan pemilik (19 Okt 2026):
   - TANPA NIK dan TANPA KTP. Akses tanpa akun: kode pribadi 26 hex (relawan) dan kode koordinator (kampus), hanya sha256-nya disimpan.
   - Data pribadi (WA, email, kontak darurat, PIC kampus) hanya lewat rute admin (modOK) atau kode pemiliknya; rute publik hanya agregat.
   - Koordinator kampus hanya melihat/memverifikasi relawan kampusnya sendiri. Relawan hanya melihat dirinya.
   - Cabut diri = baris dianonimkan (hak UU PDP), bukan dihapus: jam kerja tetap sebagai angka tanpa identitas (lihat anonimkan).
   - Retensi: bersihkanRelawan (dipanggil cron) menganonimkan ditolak/nonaktif yang tak berubah 180 hari; daftar_hitam diminimalkan jadi hash WA/email saja.
   ponytail: pencocokan dihitung di JS atas <= 2000 kandidat siap tugas (cukup untuk ribuan relawan); bila jauh lebih besar, pindahkan penyaringan wilayah ke SQL.
   ponytail: pembatasan laju baca-lalu-tulis (src/bnpb.js); serentak bisa lolos satu-dua di atas batas. */
import {json, gagal, acak, bacaBody, cacheTepi, normalWA, turnstileOK, sha} from "./worker.js";
import {tx, num, wib, tglSah, RE_PROV, modOK, superOK} from "./posko.js";
import {laju, lajuIP, kodeBaru, pemegangKode, halamanBnpbPublik} from "./bnpb.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, MAKS_SESI_MENIT = 960;
/* daftar tetap: sama dengan CHECK/trigger di 0023 (dijaga tests/warga/relawan.test.mjs) dan public/bnpb/relawan.js (label) */
export const KEAHLIAN = {medis: "Medis", perawat: "Perawat", psikososial: "Psikososial", sar: "SAR", pemadaman: "Pemadaman", logistik: "Logistik", dapur_umum: "Dapur umum",
  distribusi: "Distribusi", gis_data: "GIS dan data", komunikasi: "Komunikasi", bahasa_isyarat: "Bahasa isyarat", teknik_bangunan: "Teknik bangunan", pendidikan_anak: "Pendidikan anak",
  pengemudi: "Pengemudi", lainnya: "Lainnya"};
export const STATUS = ["terdaftar", "diverifikasi", "siap_tugas", "ditugaskan", "bertugas", "selesai", "ditolak", "nonaktif", "daftar_hitam"];
export const JALUR = ["umum", "kampus", "organisasi"];
export const GOL_DARAH = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const STATUS_PENUGASAN = ["ditawarkan", "diterima", "ditolak", "bertugas", "selesai", "dibatalkan"];
export const ASURANSI = ["belum", "diajukan", "aktif", "tidak_perlu"];
export const STATUS_PERMINTAAN = ["buka", "ditutup"];
export const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung",
  "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten",
  "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur",
  "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
  "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
const BBOX = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5};
const RE_ID = /^[0-9a-f]{16}$/, RE_EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/, RE_BENCANA = /^[a-z0-9_-]{2,40}$/;
const AKTIF_PENDAFTAR = "('ditolak', 'nonaktif')";   // status yang tidak lagi menghitung kuota kampus dan tidak memblokir pendaftaran ulang
const SEGERA_HARI = 60;

const tolakMod = () => gagal(403, "akses ditolak: butuh moderator ke atas (bukan akun gerbang situs)");
const adm = async (env, req) => (await modOK(env, req)) || null;
const baris = r => r.results;
const salahBody = b => gagal(b.status || 400, b.galat);
const dalamBbox = (lat, lon) => lat >= BBOX.latMin && lat <= BBOX.latMaks && lon >= BBOX.lonMin && lon <= BBOX.lonMaks;
const hariAntara = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / HARI);
const hashKontak = (env, jenis, nilai) => sha(`${env.IP_SALT}|kontak|${jenis}|${nilai}`);
const urai = s => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const menitSesi = (masuk, keluar) => Math.max(0, Math.min(MAKS_SESI_MENIT, Math.round((keluar - masuk) / MENIT)));

/* status MoU: habis = tidak menerima pendaftar baru; segera_habis (<= 60 hari) masih menerima tapi ditandai */
export function statusMou(k, kini) {
  const h = wib(kini);
  if (k.berakhir < h) return {status: "habis", sisa_hari: hariAntara(h, k.berakhir)};
  if (k.mulai > h) return {status: "belum", sisa_hari: hariAntara(h, k.berakhir)};
  const sisa = hariAntara(h, k.berakhir);
  return {status: sisa <= SEGERA_HARI ? "segera_habis" : "aktif", sisa_hari: sisa};
}
const menerima = m => m.status === "aktif" || m.status === "segera_habis";

/* ================================================================ pendaftaran publik */
function cekDaftar(o) {
  const nama = tx(o.nama, 80), kab = tx(o.kab, 60), wa = normalWA(o.wa), email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  if (!nama || nama.length < 2) return {galat: "nama 2-80 karakter"};
  if (!wa) return {galat: "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)"};
  if (!email || email.length > 254 || !RE_EMAIL.test(email)) return {galat: "email tidak sah"};
  if (typeof o.prov !== "string" || !Object.hasOwn(PROV, o.prov)) return {galat: "provinsi domisili tidak dikenal"};
  if (!kab || kab.length < 2) return {galat: "kabupaten/kota domisili 2-60 karakter"};
  if (!JALUR.includes(o.jalur)) return {galat: `jalur harus salah satu dari ${JALUR.join(", ")}`};
  const kampus_id = o.jalur === "kampus" ? o.kampus_id : null;
  if (o.jalur === "kampus" && !(typeof kampus_id === "string" && RE_ID.test(kampus_id))) return {galat: "pilih kampus mitra"};
  const organisasi = tx(o.organisasi, 120);
  if (organisasi === undefined || (o.jalur === "organisasi" && (!organisasi || organisasi.length < 2))) return {galat: o.jalur === "organisasi" ? "nama organisasi 2-120 karakter" : "nama organisasi maksimal 120 karakter"};
  const k = o.keahlian;
  if (!Array.isArray(k) || !k.length || k.length > 15 || !k.every(x => typeof x === "string" && Object.hasOwn(KEAHLIAN, x)) || new Set(k).size !== k.length) return {galat: "pilih 1-15 keahlian dari daftar"};
  const sertifikat = tx(o.sertifikat, 300);
  if (sertifikat === undefined) return {galat: "sertifikat maksimal 300 karakter"};
  const hari = num(o.hari_per_minggu, 1, 7, true), maks = num(o.maks_hari, 1, 365, true);
  if (hari == null || Number.isNaN(hari)) return {galat: "hari per minggu harus 1-7"};
  if (maks == null || Number.isNaN(maks)) return {galat: "durasi siap tugas harus 1-365 hari"};
  if (typeof o.luar_provinsi !== "boolean") return {galat: "bersedia keluar provinsi harus ya atau tidak"};
  const gol = o.gol_darah == null || o.gol_darah === "" ? null : o.gol_darah;
  if (gol !== null && !GOL_DARAH.includes(gol)) return {galat: `golongan darah harus salah satu dari ${GOL_DARAH.join(", ")}`};
  const dn = tx(o.darurat_nama, 80), dw = normalWA(o.darurat_wa);
  if (!dn || dn.length < 2) return {galat: "nama kontak darurat 2-80 karakter"};
  if (!dw) return {galat: "nomor kontak darurat tidak sah"};
  if (o.setuju !== true) return {galat: "persetujuan pemrosesan data pribadi (UU PDP) wajib"};
  return {v: {nama, wa, email, prov: o.prov, kab, jalur: o.jalur, kampus_id, organisasi, keahlian: k, sertifikat, hari, maks, luar: o.luar_provinsi ? 1 : 0, gol, dn, dw}};
}
async function daftar(env, req, url, kini) {
  const b = await bacaBody(req, 8192); if (b.galat) return salahBody(b);
  const c = cekDaftar(b.o); if (c.galat) return gagal(400, c.galat);
  const v = c.v;
  const lj = await lajuIP(env, req, "relawan.daftar", [[JAM, 3], [HARI, 10]], kini); if (lj) return lj;   // laju dulu: Turnstile memanggil layanan luar
  if (!(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  /* batas per kontak (bukan hanya per IP): enumerasi satu nomor/email tidak lolos dengan ganti IP. Kunci = hash bergaram, WA/email mentah tidak masuk laju_bnpb */
  const wa_sha = await hashKontak(env, "wa", v.wa), email_sha = await hashKontak(env, "email", v.email);
  for (const h of [wa_sha, email_sha]) { const lk = await laju(env, h.slice(0, 32), "relawan.daftar_kontak", [[HARI, 3]], kini); if (lk) return lk; }
  if (v.kampus_id) {
    const k = await env.DB.prepare("SELECT id, mulai, berakhir, kuota FROM relawan_kampus WHERE id = ? AND dummy = 0").bind(v.kampus_id).first();
    if (!k) return gagal(404, "kampus mitra tidak ditemukan");
    if (!menerima(statusMou(k, kini))) return gagal(409, "kerja sama (MoU) kampus ini sedang tidak berlaku, jadi belum menerima pendaftar. Kamu bisa mendaftar lewat jalur umum.");
    const n = (await env.DB.prepare(`SELECT count(*) n FROM relawan WHERE kampus_id = ? AND anonim = 0 AND status NOT IN ${AKTIF_PENDAFTAR}`).bind(k.id).first()).n;
    if (n >= k.kuota) return gagal(409, "kuota relawan kampus ini sudah penuh. Hubungi koordinator kampusmu atau daftar lewat jalur umum.");
  }
  /* daftar_hitam dicocokkan lewat hash juga (barisnya bisa sudah diminimalkan oleh bersihkanRelawan) */
  const ada = await env.DB.prepare(`SELECT 1 FROM relawan WHERE (anonim = 0 AND status NOT IN ${AKTIF_PENDAFTAR} AND (wa = ?1 OR email = ?2)) OR (status = 'daftar_hitam' AND (wa_sha = ?3 OR email_sha = ?4)) LIMIT 1`)
    .bind(v.wa, v.email, wa_sha, email_sha).first();
  /* pesan generik: tidak menyebut kolom mana yang bentrok (oracle enumerasi) */
  const SUDAH = "Pendaftaran tidak dapat diproses dengan data ini. Jika kamu pernah mendaftar, pakai tautan pribadimu; kalau hilang, hubungi admin.";
  if (ada) return gagal(409, SUDAH);
  const id = acak(8), {kode, kode_sha} = await kodeBaru();
  try {
    await env.DB.prepare(`INSERT INTO relawan (id, kode_sha, nama, wa, email, prov, kab, jalur, kampus_id, organisasi, keahlian, sertifikat, hari_per_minggu, maks_hari, luar_provinsi, gol_darah,
      darurat_nama, darurat_wa, status, setuju_pdp, dibuat, diubah, wa_sha, email_sha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'terdaftar', 1, ?, ?, ?, ?)`)
      .bind(id, kode_sha, v.nama, v.wa, v.email, v.prov, v.kab, v.jalur, v.kampus_id, v.organisasi, JSON.stringify(v.keahlian), v.sertifikat, v.hari, v.maks, v.luar, v.gol, v.dn, v.dw, kini, kini, wa_sha, email_sha).run();
  } catch (e) { if (/UNIQUE/i.test(e?.message)) return gagal(409, SUDAH); throw e; }
  /* kode hanya ditampilkan SEKALI; di fragmen (#k=) supaya tidak masuk log server */
  return json({status: "terdaftar", kode, tautan: `${url.origin}/relawan/saya#k=${kode}`}, 201);
}

/* ================================================================ ringkasan publik (agregat; tanpa data pribadi) */
async function hitungRingkas(env, kini, dummy) {
  const d = dummy ? 1 : 0, h = wib(kini);
  const [prov, ahli, tot, tugas, jam, kampus] = await Promise.all([
    env.DB.prepare("SELECT prov, count(*) n FROM relawan WHERE status = 'siap_tugas' AND anonim = 0 AND dummy <= ?1 GROUP BY prov ORDER BY n DESC, prov").bind(d).all(),
    env.DB.prepare("SELECT j.value k, count(*) n FROM relawan r, json_each(r.keahlian) j WHERE r.status = 'siap_tugas' AND r.anonim = 0 AND r.dummy <= ?1 GROUP BY j.value ORDER BY n DESC, k").bind(d).all(),
    env.DB.prepare("SELECT count(*) n, sum(status = 'siap_tugas') siap FROM relawan WHERE anonim = 0 AND status NOT IN ('ditolak', 'nonaktif', 'daftar_hitam') AND dummy <= ?1").bind(d).first(),
    env.DB.prepare("SELECT count(*) n FROM relawan WHERE status = 'bertugas' AND anonim = 0 AND dummy <= ?1").bind(d).first(),
    env.DB.prepare("SELECT coalesce(sum(menit), 0) m, count(*) sesi FROM relawan_jam WHERE sah = 1 AND dummy <= ?1").bind(d).first(),
    env.DB.prepare(`SELECT k.id, k.nama, k.singkatan, k.prov, (SELECT count(*) FROM relawan r WHERE r.kampus_id = k.id AND r.anonim = 0 AND r.status NOT IN ${AKTIF_PENDAFTAR}) relawan
      FROM relawan_kampus k WHERE k.mulai <= ?2 AND k.berakhir >= ?2 AND k.dummy <= ?1 ORDER BY relawan DESC, k.nama LIMIT 200`).bind(d, h).all(),
  ]);
  return {dibuat: kini, relawan: tot.n, siap_tugas: tot.siap ?? 0, bertugas: tugas.n, jam_kerja_jam: Math.round(jam.m / 60 * 10) / 10, sesi_sah: jam.sesi,
    per_provinsi: baris(prov).map(r => ({prov: r.prov, nama: PROV[r.prov] || r.prov, n: r.n})), per_keahlian: baris(ahli).map(r => ({keahlian: r.k, nama: KEAHLIAN[r.k] || r.k, n: r.n})),
    kampus: baris(kampus).map(k => ({id: k.id, nama: k.nama, singkatan: k.singkatan, prov: k.prov, relawan: k.relawan}))};
}
async function ringkas(env, req, url, kini, ctx) {
  const konfig = {keahlian: KEAHLIAN, provinsi: PROV, golongan_darah: GOL_DARAH, turnstile: env.TURNSTILE_SITEKEY || null};
  /* ?dummy=1 hanya untuk admin (dan tidak pernah lewat cache tepi); selain itu parameter diabaikan */
  if (url.searchParams.get("dummy") === "1" && await modOK(env, req)) return json({...await hitungRingkas(env, kini, true), konfig});
  const kunci = new Request(new URL("/api/relawan/ringkas", url), {method: "GET"});
  return cacheTepi(kunci, ctx, 60, async () => json({...await hitungRingkas(env, kini, false), konfig}));
}

/* ================================================================ relawan (kode pribadi) */
const cariRelawan = env => sha_ => env.DB.prepare("SELECT * FROM relawan WHERE kode_sha = ?").bind(sha_).first();
const dariKode = (env, req, kini) => pemegangKode(env, req, "relawan", cariRelawan(env), kini);
export const ALUR = ["terdaftar", "diverifikasi", "siap_tugas", "ditugaskan", "bertugas", "selesai"];

async function relawanSaya(env, req, kini) {
  const r = await dariKode(env, req, kini); if (r instanceof Response) return r;
  const [tugas, jam, latihan, kampus] = await Promise.all([
    env.DB.prepare(`SELECT g.id, g.status, g.asuransi, g.dibuat, p.judul, p.bencana, p.prov, p.kab, p.mulai, p.selesai, p.catatan FROM relawan_penugasan g JOIN relawan_permintaan p ON p.id = g.permintaan_id
      WHERE g.relawan_id = ? ORDER BY g.dibuat DESC LIMIT 50`).bind(r.id).all(),
    env.DB.prepare(`SELECT j.id, j.masuk, j.keluar, j.menit, j.sah, p.judul FROM relawan_jam j JOIN relawan_penugasan g ON g.id = j.penugasan_id JOIN relawan_permintaan p ON p.id = g.permintaan_id
      WHERE j.relawan_id = ? ORDER BY j.masuk DESC LIMIT 100`).bind(r.id).all(),
    env.DB.prepare("SELECT nama, penyelenggara, tgl, berlaku_sampai FROM relawan_pelatihan WHERE relawan_id = ? ORDER BY tgl DESC LIMIT 50").bind(r.id).all(),
    r.kampus_id ? env.DB.prepare("SELECT nama, singkatan FROM relawan_kampus WHERE id = ?").bind(r.kampus_id).first() : null,
  ]);
  const jamRows = baris(jam), sah = jamRows.filter(j => j.sah === 1).reduce((a, j) => a + (j.menit || 0), 0);
  return json({relawan: {nama: r.nama, prov: r.prov, kab: r.kab, jalur: r.jalur, kampus: kampus?.nama ?? null, organisasi: r.organisasi, keahlian: urai(r.keahlian), sertifikat: r.sertifikat,
    hari_per_minggu: r.hari_per_minggu, maks_hari: r.maks_hari, luar_provinsi: !!r.luar_provinsi, status: r.status, alasan: r.status === "ditolak" ? r.alasan : null, dibuat: r.dibuat},
    alur: ALUR, penugasan: baris(tugas), jam: jamRows, jam_sah_menit: sah, pelatihan: baris(latihan), terbuka: jamRows.some(j => j.keluar == null)});
}
/* jam yang masih terbuka ditutup (dipakai cabut diri, nonaktif, daftar hitam) */
const tutupJam = (env, relawanId, kini) => env.DB.prepare("UPDATE relawan_jam SET keluar = ?1, menit = min(?3, max(0, (?1 - masuk) / 60000)) WHERE relawan_id = ?2 AND keluar IS NULL").bind(kini, relawanId, MAKS_SESI_MENIT);
const batalkanTugas = (env, relawanId, kini) => env.DB.prepare("UPDATE relawan_penugasan SET status = 'dibatalkan', diubah = ? WHERE relawan_id = ? AND status IN ('ditawarkan', 'diterima', 'bertugas')").bind(kini, relawanId);

async function ubahSaya(env, req, kini) {
  const r = await dariKode(env, req, kini); if (r instanceof Response) return r;
  const lj = await laju(env, r.id, "relawan.ubah", [[JAM, 60]], kini); if (lj) return lj;
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const o = b.o;
  if (r.status === "daftar_hitam") return gagal(403, "akunmu tidak bisa diubah. Hubungi admin.");
  if (o.aksi === "siap" || o.aksi === "istirahat") {
    const [dari, ke] = o.aksi === "siap" ? [["diverifikasi", "selesai"], "siap_tugas"] : [["siap_tugas"], "diverifikasi"];
    const x = await env.DB.prepare(`UPDATE relawan SET status = ?, diubah = ? WHERE id = ? AND status IN (${dari.map(() => "?").join(",")})`).bind(ke, kini, r.id, ...dari).run();
    return x.meta.changes ? json({status: ke}) : gagal(409, o.aksi === "siap" ? "kamu bisa menyatakan siap tugas setelah akunmu diverifikasi" : "status kamu sekarang bukan siap tugas");
  }
  if (o.aksi === "ketersediaan") {
    const hari = num(o.hari_per_minggu, 1, 7, true), maks = num(o.maks_hari, 1, 365, true);
    if (hari == null || Number.isNaN(hari)) return gagal(400, "hari per minggu harus 1-7");
    if (maks == null || Number.isNaN(maks)) return gagal(400, "durasi siap tugas harus 1-365 hari");
    if (typeof o.luar_provinsi !== "boolean") return gagal(400, "bersedia keluar provinsi harus ya atau tidak");
    await env.DB.prepare("UPDATE relawan SET hari_per_minggu = ?, maks_hari = ?, luar_provinsi = ?, diubah = ? WHERE id = ?").bind(hari, maks, o.luar_provinsi ? 1 : 0, kini, r.id).run();
    return json({hari_per_minggu: hari, maks_hari: maks, luar_provinsi: o.luar_provinsi});
  }
  if (o.aksi === "cabut") {
    if (o.konfirmasi !== "HAPUS") return gagal(400, 'ketik konfirmasi "HAPUS" untuk menghapus datamu');
    await anonimkan(env, r.id, kini);
    return json({dihapus: true});
  }
  return gagal(400, "aksi harus siap, istirahat, ketersediaan, atau cabut");
}
/* hak UU PDP. Dikosongkan: semua identitas dan kuasi-identifier (nama, kontak, kab, organisasi, kampus_id, keahlian, ketersediaan, gol. darah, sertifikat, alasan, pembuat/pemverifikasi `oleh`,
   tanggal verifikasi) di relawan; lat/lon check-in dan `oleh` di jam; polis, catatan nilai, `oleh` di penugasan; pelatihan dihapus. Yang TETAP: prov (agregat per provinsi), jalur, menit/sah jam kerja,
   status/asuransi/nilai penugasan, dan stempel dibuat/diubah sebagai angka tanpa identitas. hash WA/email hanya dipertahankan untuk daftar_hitam (penolak pendaftaran ulang; hitam=true). */
const anonimkan = (env, id, kini, hitam = false) => env.DB.batch([
  tutupJam(env, id, kini), batalkanTugas(env, id, kini),
  env.DB.prepare("DELETE FROM relawan_pelatihan WHERE relawan_id = ?").bind(id),
  env.DB.prepare("UPDATE relawan_jam SET lat = NULL, lon = NULL, oleh = NULL WHERE relawan_id = ?").bind(id),
  env.DB.prepare("UPDATE relawan_penugasan SET polis = NULL, nilai_catatan = NULL, oleh = NULL WHERE relawan_id = ?").bind(id),
  env.DB.prepare(`UPDATE relawan SET nama = '(dihapus)', wa = NULL, email = NULL, kab = '(dihapus)', organisasi = NULL, sertifikat = NULL, gol_darah = NULL, darurat_nama = NULL, darurat_wa = NULL,
    keahlian = '[]', alasan = NULL, kode_sha = NULL, kampus_id = NULL, hari_per_minggu = 1, maks_hari = 1, luar_provinsi = 0, diverifikasi = NULL, oleh = NULL,
    wa_sha = CASE WHEN ?3 THEN wa_sha END, email_sha = CASE WHEN ?3 THEN email_sha END, status = CASE WHEN ?3 THEN 'daftar_hitam' ELSE 'nonaktif' END, anonim = 1, diubah = ?1 WHERE id = ?2`).bind(kini, id, hitam ? 1 : 0),
]);
/* retensi (cron): ditolak/nonaktif tak berubah > 180 hari dianonimkan; daftar_hitam diminimalkan jadi hash WA/email. Mengembalikan jumlah baris. */
export async function bersihkanRelawan(env, kini = Date.now()) {
  const rows = baris(await env.DB.prepare("SELECT id, status FROM relawan WHERE anonim = 0 AND dummy = 0 AND status IN ('ditolak', 'nonaktif', 'daftar_hitam') AND diubah < ? ORDER BY diubah LIMIT 200").bind(kini - 180 * HARI).all());
  for (const r of rows) await anonimkan(env, r.id, kini, r.status === "daftar_hitam");
  return rows.length;
}

async function aksiPenugasanSaya(env, req, id, kini) {
  const r = await dariKode(env, req, kini); if (r instanceof Response) return r;
  const lj = await laju(env, r.id, "relawan.penugasan", [[JAM, 60]], kini); if (lj) return lj;
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const o = b.o;
  const g = await env.DB.prepare("SELECT id, status, permintaan_id FROM relawan_penugasan WHERE id = ? AND relawan_id = ?").bind(id, r.id).first();   // milik orang lain = tidak ada
  if (!g) return gagal(404, "penugasan tidak ditemukan");
  if (r.status === "daftar_hitam" || r.status === "nonaktif") return gagal(403, "akunmu sedang tidak aktif. Hubungi admin.");
  const salah = (dari) => gagal(409, `penugasan berstatus ${g.status}; aksi ini butuh ${dari.join(" atau ")}`);
  if (o.aksi === "terima") {
    if (g.status !== "ditawarkan") return salah(["ditawarkan"]);
    await env.DB.prepare("UPDATE relawan_penugasan SET status = 'diterima', diubah = ? WHERE id = ? AND status = 'ditawarkan'").bind(kini, g.id).run();
    return json({status: "diterima"});
  }
  if (o.aksi === "tolak") {
    if (g.status !== "ditawarkan") return salah(["ditawarkan"]);
    await env.DB.batch([env.DB.prepare("UPDATE relawan_penugasan SET status = 'ditolak', diubah = ? WHERE id = ? AND status = 'ditawarkan'").bind(kini, g.id),
      env.DB.prepare("UPDATE relawan SET status = 'siap_tugas', diubah = ? WHERE id = ? AND status = 'ditugaskan'").bind(kini, r.id)]);
    return json({status: "ditolak"});
  }
  if (o.aksi === "masuk") {
    if (g.status !== "diterima" && g.status !== "bertugas") return salah(["diterima", "bertugas"]);
    const lat = num(o.lat, -90, 90), lon = num(o.lon, -180, 180);
    if (Number.isNaN(lat) || Number.isNaN(lon) || (lat == null) !== (lon == null) || (lat != null && !dalamBbox(lat, lon))) return gagal(400, "lokasi harus berada di Indonesia (atau kosongkan)");
    try {
      await env.DB.batch([env.DB.prepare("INSERT INTO relawan_jam (id, relawan_id, penugasan_id, masuk, lat, lon) VALUES (?, ?, ?, ?, ?, ?)").bind(acak(8), r.id, g.id, kini, lat, lon),
        env.DB.prepare("UPDATE relawan_penugasan SET status = 'bertugas', diubah = ? WHERE id = ?").bind(kini, g.id),
        env.DB.prepare("UPDATE relawan SET status = 'bertugas', diubah = ? WHERE id = ? AND status IN ('ditugaskan', 'bertugas')").bind(kini, r.id)]);
    } catch (e) { if (/UNIQUE/i.test(e?.message)) return gagal(409, "kamu masih tercatat check-in. Check-out dulu."); throw e; }
    return json({masuk: kini});
  }
  if (o.aksi === "keluar") {
    const s = await env.DB.prepare("SELECT id, masuk FROM relawan_jam WHERE relawan_id = ? AND penugasan_id = ? AND keluar IS NULL").bind(r.id, g.id).first();
    if (!s) return gagal(409, "kamu belum check-in pada penugasan ini");
    const menit = menitSesi(s.masuk, kini);
    await env.DB.prepare("UPDATE relawan_jam SET keluar = ?, menit = ? WHERE id = ? AND keluar IS NULL").bind(kini, menit, s.id).run();
    return json({keluar: kini, menit});
  }
  return gagal(400, "aksi harus terima, tolak, masuk, atau keluar");
}

/* ================================================================ koordinator kampus (kode kampus) */
const cariKampus = env => h => env.DB.prepare("SELECT id, nama, singkatan, no_mou, mulai, berakhir, kuota, prov FROM relawan_kampus WHERE kode_sha = ?").bind(h).first();
const dariKodeKampus = (env, req, kini) => pemegangKode(env, req, "kampus", cariKampus(env), kini);
const SQL_KAMPUS_RELAWAN = `SELECT r.id, r.nama, r.prov, r.kab, r.keahlian, r.status, r.alasan, r.dibuat,
  (SELECT coalesce(sum(menit), 0) FROM relawan_jam j WHERE j.relawan_id = r.id AND j.sah = 1) jam_sah_menit,
  (SELECT coalesce(sum(menit), 0) FROM relawan_jam j WHERE j.relawan_id = r.id AND j.sah = 0 AND j.keluar IS NOT NULL) jam_menunggu_menit,
  (SELECT count(*) FROM relawan_jam j WHERE j.relawan_id = r.id) sesi
  FROM relawan r WHERE r.kampus_id = ? AND r.anonim = 0 ORDER BY r.dibuat DESC LIMIT 2000`;
const ringkasKampus = (k, kini, terisi) => ({nama: k.nama, singkatan: k.singkatan, no_mou: k.no_mou, mulai: k.mulai, berakhir: k.berakhir, kuota: k.kuota, terisi, ...statusMou(k, kini)});

async function kampusSaya(env, req, kini) {
  const k = await dariKodeKampus(env, req, kini); if (k instanceof Response) return k;
  const rows = baris(await env.DB.prepare(SQL_KAMPUS_RELAWAN).bind(k.id).all());   // tanpa WA/email/kontak darurat: itu hanya untuk admin
  const terisi = rows.filter(r => !["ditolak", "nonaktif"].includes(r.status)).length;
  const jamSesi = baris(await env.DB.prepare(`SELECT j.id, j.relawan_id, r.nama, j.masuk, j.keluar, j.menit, j.sah FROM relawan_jam j JOIN relawan r ON r.id = j.relawan_id
    WHERE r.kampus_id = ? AND r.anonim = 0 AND j.keluar IS NOT NULL ORDER BY j.masuk DESC LIMIT 500`).bind(k.id).all());
  return json({kampus: ringkasKampus(k, kini, terisi), relawan: rows.map(r => ({...r, keahlian: urai(r.keahlian)})), jam: jamSesi});
}
async function putusKampus(env, req, id, kini) {
  const k = await dariKodeKampus(env, req, kini); if (k instanceof Response) return k;
  const lj = await laju(env, k.id, "relawan.putus_relawan", [[JAM, 600]], kini); if (lj) return lj;   // koordinator memutus banyak mahasiswa: batas longgar
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const aksi = b.o.aksi, alasan = tx(b.o.alasan, 300);
  if (aksi !== "verifikasi" && aksi !== "tolak") return gagal(400, "aksi harus verifikasi atau tolak");
  if (alasan === undefined) return gagal(400, "alasan maksimal 300 karakter");
  const r = await env.DB.prepare("SELECT status FROM relawan WHERE id = ? AND kampus_id = ? AND anonim = 0").bind(id, k.id).first();   // relawan kampus lain = tidak ada
  if (!r) return gagal(404, "relawan tidak ditemukan di kampusmu");
  const ke = aksi === "verifikasi" ? "diverifikasi" : "ditolak";
  const x = await env.DB.prepare("UPDATE relawan SET status = ?, alasan = ?, diverifikasi = ?, diubah = ?, oleh = ? WHERE id = ? AND kampus_id = ? AND status = 'terdaftar'")
    .bind(ke, aksi === "tolak" ? alasan : null, aksi === "verifikasi" ? kini : null, kini, "kampus:" + k.id, id, k.id).run();
  return x.meta.changes ? json({id, status: ke}) : gagal(409, `relawan berstatus ${r.status}; hanya yang masih terdaftar yang bisa diputuskan`);
}
async function putusJam(env, req, id, kini, kampus) {
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const AKSI_JAM = {sah: 1, tolak: 2, menunggu: 0}, ke = typeof b.o.aksi === "string" && Object.hasOwn(AKSI_JAM, b.o.aksi) ? AKSI_JAM[b.o.aksi] : undefined;
  if (ke === undefined) return gagal(400, "aksi harus sah, tolak, atau menunggu");
  const oleh = kampus ? "kampus:" + kampus.id : "admin";
  const sql = `UPDATE relawan_jam SET sah = ?, oleh = ? WHERE id = ? AND keluar IS NOT NULL ${kampus ? "AND relawan_id IN (SELECT id FROM relawan WHERE kampus_id = ?)" : ""}`;
  const x = await env.DB.prepare(sql).bind(ke, oleh, id, ...(kampus ? [kampus.id] : [])).run();
  return x.meta.changes ? json({id, sah: ke}) : gagal(404, "sesi jam kerja tidak ditemukan (atau belum check-out)");
}
async function putusJamKampus(env, req, id, kini) {
  const k = await dariKodeKampus(env, req, kini); if (k instanceof Response) return k;
  const lj = await laju(env, k.id, "relawan.putus_jam", [[JAM, 600]], kini); if (lj) return lj;
  return putusJam(env, req, id, kini, k);
}
/* sel CSV: awalan = + - @ diberi tanda kutip tunggal supaya tidak dibaca sebagai rumus oleh Excel */
const sel = v => { let s = v == null ? "" : String(v); if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (kepala, rows, nama) => new Response("﻿" + [kepala, ...rows].map(r => r.map(sel).join(",")).join("\r\n") + "\r\n",
  {headers: {"content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nama}"`, "cache-control": "no-store", "x-content-type-options": "nosniff"}});
const jam1 = m => Math.round(m / 60 * 100) / 100;
async function csvKampus(env, req, kini) {
  const k = await dariKodeKampus(env, req, kini); if (k instanceof Response) return k;
  const rows = baris(await env.DB.prepare(SQL_KAMPUS_RELAWAN).bind(k.id).all());
  return csv(["nama", "provinsi", "kabupaten_kota", "status", "keahlian", "sesi", "jam_sah", "jam_menunggu_validasi"],
    rows.map(r => [r.nama, PROV[r.prov] || r.prov, r.kab, r.status, urai(r.keahlian).map(x => KEAHLIAN[x] || x).join("; "), r.sesi, jam1(r.jam_sah_menit), jam1(r.jam_menunggu_menit)]),
    `rekap-relawan-${(k.singkatan || "kampus").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${wib(kini)}.csv`);
}

/* ================================================================ admin: relawan */
const AKSI_RELAWAN = {
  verifikasi: {dari: ["terdaftar"], ke: "diverifikasi"},
  tolak: {dari: ["terdaftar", "diverifikasi"], ke: "ditolak"},
  siap: {dari: ["diverifikasi", "selesai"], ke: "siap_tugas"},
  nonaktifkan: {dari: ["terdaftar", "diverifikasi", "siap_tugas", "selesai"], ke: "nonaktif"},
  aktifkan: {dari: ["nonaktif"], ke: "diverifikasi"},
  daftar_hitam: {dari: STATUS.filter(s => s !== "daftar_hitam"), ke: "daftar_hitam", alasan: true},
  pulihkan: {dari: ["daftar_hitam"], ke: "nonaktif", alasan: true},
};
const SQL_ADMIN_RELAWAN = `SELECT r.id, r.nama, r.wa, r.email, r.prov, r.kab, r.jalur, r.kampus_id, k.nama kampus, r.organisasi, r.keahlian, r.sertifikat, r.hari_per_minggu, r.maks_hari, r.luar_provinsi,
  r.gol_darah, r.darurat_nama, r.darurat_wa, r.status, r.alasan, r.dibuat, r.diverifikasi, r.anonim, r.dummy,
  (SELECT coalesce(sum(menit), 0) FROM relawan_jam j WHERE j.relawan_id = r.id AND j.sah = 1) jam_sah_menit,
  (SELECT count(*) FROM relawan_penugasan g WHERE g.relawan_id = r.id) penugasan
  FROM relawan r LEFT JOIN relawan_kampus k ON k.id = r.kampus_id`;
function saringRelawan(url) {
  const s = url.searchParams, w = ["r.anonim = 0"], p = [];
  const status = s.get("status"), prov = s.get("prov"), ahli = s.get("keahlian"), jalur = s.get("jalur"), q = s.get("q");
  if (status) { if (!STATUS.includes(status)) return {galat: "status tidak dikenal"}; w.push("r.status = ?"); p.push(status); }
  if (prov) { if (!RE_PROV.test(prov)) return {galat: "prov harus 2 digit"}; w.push("r.prov = ?"); p.push(prov); }
  if (ahli) { if (!Object.hasOwn(KEAHLIAN, ahli)) return {galat: "keahlian tidak dikenal"}; w.push("EXISTS (SELECT 1 FROM json_each(r.keahlian) WHERE value = ?)"); p.push(ahli); }
  if (jalur) { if (!JALUR.includes(jalur)) return {galat: "jalur tidak dikenal"}; w.push("r.jalur = ?"); p.push(jalur); }
  if (q) { if (q.length > 60) return {galat: "pencarian maksimal 60 karakter"}; w.push("r.nama LIKE ? ESCAPE '\\'"); p.push("%" + q.replace(/[\\%_]/g, "\\$&") + "%"); }
  return {w, p};
}
const bentukRelawan = r => ({...r, keahlian: urai(r.keahlian), luar_provinsi: !!r.luar_provinsi});
async function daftarAdmin(env, req, url) {
  if (!await adm(env, req)) return tolakMod();
  const f = saringRelawan(url); if (f.galat) return gagal(400, f.galat);
  const [rows, hitung] = await Promise.all([
    env.DB.prepare(`${SQL_ADMIN_RELAWAN} WHERE ${f.w.join(" AND ")} ORDER BY r.dibuat DESC LIMIT 1000`).bind(...f.p).all(),
    env.DB.prepare("SELECT status, count(*) n FROM relawan WHERE anonim = 0 GROUP BY status").all(),
  ]);
  return json({relawan: baris(rows).map(bentukRelawan), hitung: Object.fromEntries(baris(hitung).map(h => [h.status, h.n])), keahlian: KEAHLIAN, provinsi: PROV, status: STATUS});
}
async function csvAdmin(env, req, url) {
  if (!await adm(env, req)) return tolakMod();
  const f = saringRelawan(url); if (f.galat) return gagal(400, f.galat);
  const rows = baris(await env.DB.prepare(`${SQL_ADMIN_RELAWAN} WHERE ${f.w.join(" AND ")} ORDER BY r.dibuat DESC LIMIT 5000`).bind(...f.p).all());
  return csv(["nama", "wa", "email", "provinsi", "kabupaten_kota", "jalur", "kampus", "organisasi", "keahlian", "sertifikat", "hari_per_minggu", "maks_hari", "luar_provinsi", "gol_darah", "kontak_darurat", "wa_darurat", "status", "jam_sah", "penugasan", "dummy"],
    rows.map(r => [r.nama, r.wa, r.email, PROV[r.prov] || r.prov, r.kab, r.jalur, r.kampus, r.organisasi, urai(r.keahlian).join("; "), r.sertifikat, r.hari_per_minggu, r.maks_hari, r.luar_provinsi ? "ya" : "tidak",
      r.gol_darah, r.darurat_nama, r.darurat_wa, r.status, jam1(r.jam_sah_menit), r.penugasan, r.dummy]), `relawan-${wib(Date.now())}.csv`);
}
async function rincianAdmin(env, req, id) {
  if (!await adm(env, req)) return tolakMod();
  const r = await env.DB.prepare(`${SQL_ADMIN_RELAWAN} WHERE r.id = ?`).bind(id).first(); if (!r) return gagal(404, "relawan tidak ada");
  const [latihan, tugas, jam] = await Promise.all([
    env.DB.prepare("SELECT id, nama, penyelenggara, tgl, berlaku_sampai FROM relawan_pelatihan WHERE relawan_id = ? ORDER BY tgl DESC").bind(id).all(),
    env.DB.prepare(`SELECT g.id, g.status, g.asuransi, g.nilai, p.judul FROM relawan_penugasan g JOIN relawan_permintaan p ON p.id = g.permintaan_id WHERE g.relawan_id = ? ORDER BY g.dibuat DESC`).bind(id).all(),
    env.DB.prepare("SELECT id, masuk, keluar, menit, sah FROM relawan_jam WHERE relawan_id = ? ORDER BY masuk DESC LIMIT 100").bind(id).all(),
  ]);
  return json({relawan: bentukRelawan(r), pelatihan: baris(latihan), penugasan: baris(tugas), jam: baris(jam)});
}
async function ubahAdmin(env, req, url, id, kini) {
  const mod = await adm(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const aksi = b.o.aksi, alasan = tx(b.o.alasan, 300);
  const r = await env.DB.prepare("SELECT id, status, anonim FROM relawan WHERE id = ?").bind(id).first(); if (!r) return gagal(404, "relawan tidak ada");
  if (r.anonim) return gagal(409, "data relawan ini sudah dihapus atas permintaannya");
  if (aksi === "kode_baru") {
    const {kode, kode_sha} = await kodeBaru();
    await env.DB.prepare("UPDATE relawan SET kode_sha = ?, diubah = ?, oleh = ? WHERE id = ?").bind(kode_sha, kini, mod, id).run();
    return json({kode, tautan: `${url.origin}/relawan/saya#k=${kode}`});   // sekali tampil
  }
  const t = Object.hasOwn(AKSI_RELAWAN, aksi) ? AKSI_RELAWAN[aksi] : null;
  if (!t) return gagal(400, `aksi harus salah satu dari ${[...Object.keys(AKSI_RELAWAN), "kode_baru"].join(", ")}`);
  if (alasan === undefined) return gagal(400, "alasan maksimal 300 karakter");
  if (t.alasan && (!alasan || alasan.length < 3)) return gagal(400, "alasan wajib diisi (3-300 karakter)");
  if (!t.dari.includes(r.status)) return gagal(409, `relawan berstatus ${r.status}; aksi ${aksi} butuh ${t.dari.join(" atau ")}`);
  if (r.status === "bertugas" && t.ke !== "daftar_hitam") return gagal(409, "relawan masih bertugas; selesaikan penugasannya dulu");
  const berhenti = ["ditolak", "nonaktif", "daftar_hitam"].includes(t.ke);
  try {
    await env.DB.batch([
      ...(berhenti ? [tutupJam(env, id, kini), batalkanTugas(env, id, kini)] : []),
      env.DB.prepare("UPDATE relawan SET status = ?, alasan = ?, diverifikasi = CASE WHEN ? = 'diverifikasi' THEN ? ELSE diverifikasi END, diubah = ?, oleh = ? WHERE id = ? AND status = ?")
        .bind(t.ke, aksi === "verifikasi" || aksi === "siap" || aksi === "aktifkan" ? null : alasan, t.ke, kini, kini, mod, id, r.status),
    ]);
  } catch (e) { if (/UNIQUE/i.test(e?.message)) return gagal(409, "nomor WA atau email ini sudah dipakai relawan aktif lain"); throw e; }
  return json({id, status: t.ke});
}

/* ================================================================ admin: kampus + MoU */
function cekKampus(o) {
  const nama = tx(o.nama, 120), singkatan = tx(o.singkatan, 20), no_mou = tx(o.no_mou, 80), pic = tx(o.pic_nama, 80), jabatan = tx(o.pic_jabatan, 80), catatan = tx(o.catatan, 500);
  const email = o.pic_email == null || o.pic_email === "" ? null : typeof o.pic_email === "string" ? o.pic_email.trim().toLowerCase() : undefined;
  const wa = o.pic_wa == null || o.pic_wa === "" ? null : normalWA(o.pic_wa), kuota = num(o.kuota, 1, 100000, true);
  if (!nama || nama.length < 3) return {galat: "nama kampus 3-120 karakter"};
  if (singkatan === undefined || (singkatan && singkatan.length < 2)) return {galat: "singkatan 2-20 karakter"};
  if (typeof o.prov !== "string" || !Object.hasOwn(PROV, o.prov)) return {galat: "provinsi kampus tidak dikenal"};
  if (!no_mou || no_mou.length < 3) return {galat: "nomor MoU 3-80 karakter"};
  if (typeof o.mulai !== "string" || !tglSah(o.mulai) || typeof o.berakhir !== "string" || !tglSah(o.berakhir)) return {galat: "tanggal mulai dan berakhir harus YYYY-MM-DD"};
  if (o.berakhir < o.mulai) return {galat: "tanggal berakhir tidak boleh sebelum tanggal mulai"};
  if (!pic || pic.length < 2) return {galat: "nama PIC 2-80 karakter"};
  if (jabatan === undefined) return {galat: "jabatan PIC maksimal 80 karakter"};
  if (email === undefined || (email && (email.length > 254 || !RE_EMAIL.test(email)))) return {galat: "email PIC tidak sah"};
  if (wa === null && o.pic_wa) return {galat: "WA PIC tidak sah"};
  if (kuota == null || Number.isNaN(kuota)) return {galat: "kuota 1-100.000"};
  if (catatan === undefined) return {galat: "catatan maksimal 500 karakter"};
  return {v: {nama, singkatan, prov: o.prov, no_mou, mulai: o.mulai, berakhir: o.berakhir, pic, jabatan, email, wa, kuota, catatan}};
}
const SQL_KAMPUS = `SELECT k.id, k.nama, k.singkatan, k.prov, k.no_mou, k.mulai, k.berakhir, k.pic_nama, k.pic_jabatan, k.pic_email, k.pic_wa, k.kuota, k.catatan, k.dibuat, k.dummy, k.kode_sha IS NOT NULL kode_aktif,
  (SELECT count(*) FROM relawan r WHERE r.kampus_id = k.id AND r.anonim = 0 AND r.status NOT IN ${AKTIF_PENDAFTAR}) terisi,
  (SELECT count(*) FROM relawan r WHERE r.kampus_id = k.id AND r.anonim = 0 AND r.status = 'terdaftar') antre,
  (SELECT coalesce(sum(j.menit), 0) FROM relawan_jam j JOIN relawan r ON r.id = j.relawan_id WHERE r.kampus_id = k.id AND j.sah = 1) jam_sah_menit
  FROM relawan_kampus k`;
async function daftarKampusAdmin(env, req, kini) {
  if (!await adm(env, req)) return tolakMod();
  return json({kampus: baris(await env.DB.prepare(`${SQL_KAMPUS} ORDER BY k.berakhir, k.nama LIMIT 500`).all()).map(k => ({...k, kode_aktif: !!k.kode_aktif, ...statusMou(k, kini)}))});
}
async function buatKampus(env, req, url, kini) {
  const mod = await adm(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const c = cekKampus(b.o); if (c.galat) return gagal(400, c.galat);
  const v = c.v, id = acak(8), {kode, kode_sha} = await kodeBaru();
  await env.DB.prepare(`INSERT INTO relawan_kampus (id, nama, singkatan, prov, no_mou, mulai, berakhir, pic_nama, pic_jabatan, pic_email, pic_wa, kuota, catatan, kode_sha, dibuat, diubah, oleh)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, v.nama, v.singkatan, v.prov, v.no_mou, v.mulai, v.berakhir, v.pic, v.jabatan, v.email, v.wa, v.kuota, v.catatan, kode_sha, kini, kini, mod).run();
  return json({id, kode, tautan: `${url.origin}/kampus#k=${kode}`}, 201);   // kode koordinator sekali tampil
}
async function ubahKampus(env, req, url, id, kini) {
  const mod = await adm(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  if (!await env.DB.prepare("SELECT 1 FROM relawan_kampus WHERE id = ?").bind(id).first()) return gagal(404, "kampus tidak ada");
  if (b.o.aksi === "kode_baru") {
    const {kode, kode_sha} = await kodeBaru();
    await env.DB.prepare("UPDATE relawan_kampus SET kode_sha = ?, diubah = ?, oleh = ? WHERE id = ?").bind(kode_sha, kini, mod, id).run();
    return json({kode, tautan: `${url.origin}/kampus#k=${kode}`});
  }
  if (b.o.aksi === "cabut_kode") { await env.DB.prepare("UPDATE relawan_kampus SET kode_sha = NULL, diubah = ?, oleh = ? WHERE id = ?").bind(kini, mod, id).run(); return json({id, kode_aktif: false}); }
  if (b.o.aksi === "ubah") {
    const c = cekKampus(b.o); if (c.galat) return gagal(400, c.galat);
    const v = c.v;
    await env.DB.prepare(`UPDATE relawan_kampus SET nama = ?, singkatan = ?, prov = ?, no_mou = ?, mulai = ?, berakhir = ?, pic_nama = ?, pic_jabatan = ?, pic_email = ?, pic_wa = ?, kuota = ?, catatan = ?, diubah = ?, oleh = ? WHERE id = ?`)
      .bind(v.nama, v.singkatan, v.prov, v.no_mou, v.mulai, v.berakhir, v.pic, v.jabatan, v.email, v.wa, v.kuota, v.catatan, kini, mod, id).run();
    return json({id});
  }
  return gagal(400, "aksi harus ubah, kode_baru, atau cabut_kode");
}

/* ================================================================ admin: permintaan + pencocokan */
function cekPermintaan(o) {
  const judul = tx(o.judul, 120), kab = tx(o.kab, 60), catatan = tx(o.catatan, 500), lat = num(o.lat, BBOX.latMin, BBOX.latMaks), lon = num(o.lon, BBOX.lonMin, BBOX.lonMaks);
  if (!judul || judul.length < 3) return {galat: "judul 3-120 karakter"};
  if (typeof o.bencana !== "string" || !RE_BENCANA.test(o.bencana)) return {galat: "bencana tidak sah (huruf kecil, angka, garis)"};
  if (typeof o.prov !== "string" || !Object.hasOwn(PROV, o.prov)) return {galat: "provinsi tidak dikenal"};
  if (!kab || kab.length < 2) return {galat: "kabupaten/kota 2-60 karakter"};
  if (Number.isNaN(lat) || Number.isNaN(lon) || (lat == null) !== (lon == null)) return {galat: "lat dan lon harus berpasangan dan berada di Indonesia (atau kosongkan keduanya)"};
  const butuh = o.butuh;
  if (!Array.isArray(butuh) || !butuh.length || butuh.length > 15) return {galat: "isi 1-15 kebutuhan keahlian"};
  const pakai = new Set();
  for (const x of butuh) {
    const n = num(x?.jumlah, 1, 1000, true);
    if (!x || typeof x.keahlian !== "string" || !Object.hasOwn(KEAHLIAN, x.keahlian) || pakai.has(x.keahlian) || n == null || Number.isNaN(n)) return {galat: "tiap kebutuhan: keahlian dari daftar (tanpa ulang) dan jumlah 1-1000"};
    pakai.add(x.keahlian);
  }
  if (typeof o.mulai !== "string" || !tglSah(o.mulai) || typeof o.selesai !== "string" || !tglSah(o.selesai)) return {galat: "tanggal mulai dan selesai harus YYYY-MM-DD"};
  if (o.selesai < o.mulai) return {galat: "tanggal selesai tidak boleh sebelum tanggal mulai"};
  if (catatan === undefined) return {galat: "catatan maksimal 500 karakter"};
  return {v: {judul, bencana: o.bencana, prov: o.prov, kab, lat, lon, butuh: butuh.map(x => ({keahlian: x.keahlian, jumlah: Number(x.jumlah)})), mulai: o.mulai, selesai: o.selesai, catatan}};
}
async function buatPermintaan(env, req, kini) {
  const mod = await adm(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const c = cekPermintaan(b.o); if (c.galat) return gagal(400, c.galat);
  const v = c.v, id = acak(8);
  await env.DB.prepare("INSERT INTO relawan_permintaan (id, judul, bencana, prov, kab, lat, lon, butuh, mulai, selesai, catatan, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, v.judul, v.bencana, v.prov, v.kab, v.lat, v.lon, JSON.stringify(v.butuh), v.mulai, v.selesai, v.catatan, kini, mod).run();
  return json({id}, 201);
}
async function daftarPermintaan(env, req) {
  if (!await adm(env, req)) return tolakMod();
  const rows = baris(await env.DB.prepare(`SELECT p.id, p.judul, p.bencana, p.prov, p.kab, p.lat, p.lon, p.butuh, p.mulai, p.selesai, p.status, p.catatan, p.dibuat, p.dummy,
    (SELECT count(*) FROM relawan_penugasan g WHERE g.permintaan_id = p.id AND g.status IN ('ditawarkan', 'diterima', 'bertugas', 'selesai')) ditugaskan
    FROM relawan_permintaan p ORDER BY p.status, p.mulai DESC LIMIT 300`).all());
  return json({permintaan: rows.map(p => ({...p, butuh: urai(p.butuh), dibutuhkan: urai(p.butuh).reduce((a, x) => a + (x.jumlah || 0), 0)}))});
}
/* Pencocokan: hanya siap_tugas (dummy dengan dummy, asli dengan asli). Skor = 4 per keahlian cocok + wilayah (kab sama 4, prov sama 3, luar provinsi 1 bila bersedia)
   + 2 bila durasi siap tugas cukup - 1 per penugasan dalam 90 hari terakhir (beban). Tanpa keahlian cocok, atau luar provinsi tanpa kesediaan = tidak masuk. */
export function hitungKandidat(p, cand, kini) {
  const butuh = new Set(urai(p.butuh).map(x => x.keahlian)), lama = hariAntara(p.mulai, p.selesai) + 1, out = [];
  for (const c of cand) {
    const ahli = urai(c.keahlian), cocok = ahli.filter(x => butuh.has(x));
    if (!cocok.length) continue;
    const wil = c.prov === p.prov ? (c.kab.toLowerCase() === p.kab.toLowerCase() ? "sama_kab" : "sama_prov") : c.luar_provinsi ? "luar" : null;
    if (!wil) continue;
    const cukup = c.maks_hari >= lama, skor = 4 * cocok.length + {sama_kab: 4, sama_prov: 3, luar: 1}[wil] + (cukup ? 2 : 0) - c.beban;
    out.push({id: c.id, nama: c.nama, prov: c.prov, kab: c.kab, jalur: c.jalur, keahlian: ahli, cocok, wilayah: wil, cukup_waktu: cukup, maks_hari: c.maks_hari, beban: c.beban, skor});
  }
  return out.sort((a, b) => b.skor - a.skor || a.beban - b.beban || a.nama.localeCompare(b.nama, "id")).slice(0, 50);
}
async function rincianPermintaan(env, req, id, kini) {
  if (!await adm(env, req)) return tolakMod();
  const p = await env.DB.prepare("SELECT * FROM relawan_permintaan WHERE id = ?").bind(id).first(); if (!p) return gagal(404, "permintaan tidak ada");
  const cand = baris(await env.DB.prepare(`SELECT r.id, r.nama, r.prov, r.kab, r.jalur, r.keahlian, r.maks_hari, r.luar_provinsi,
      (SELECT count(*) FROM relawan_penugasan g WHERE g.relawan_id = r.id AND g.status IN ('ditawarkan', 'diterima', 'bertugas', 'selesai') AND g.dibuat > ?2) beban
    FROM relawan r WHERE r.status = 'siap_tugas' AND r.anonim = 0 AND r.dummy = ?3 AND NOT EXISTS (SELECT 1 FROM relawan_penugasan g WHERE g.permintaan_id = ?1 AND g.relawan_id = r.id) LIMIT 2000`)
    .bind(id, kini - 90 * HARI, p.dummy).all());
  const tugas = baris(await env.DB.prepare(`SELECT g.id, g.relawan_id, r.nama, g.status, g.asuransi, g.nilai FROM relawan_penugasan g JOIN relawan r ON r.id = g.relawan_id WHERE g.permintaan_id = ? ORDER BY g.dibuat`).bind(id).all());
  return json({permintaan: {...p, butuh: urai(p.butuh)}, kandidat: hitungKandidat(p, cand, kini), penugasan: tugas});
}
async function ubahPermintaan(env, req, id, kini) {
  const mod = await adm(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const p = await env.DB.prepare("SELECT id, dummy, status FROM relawan_permintaan WHERE id = ?").bind(id).first(); if (!p) return gagal(404, "permintaan tidak ada");
  if (b.o.aksi === "tutup" || b.o.aksi === "buka") {
    await env.DB.prepare("UPDATE relawan_permintaan SET status = ? WHERE id = ?").bind(b.o.aksi === "tutup" ? "ditutup" : "buka", id).run();
    return json({id, status: b.o.aksi === "tutup" ? "ditutup" : "buka"});
  }
  if (b.o.aksi !== "tugaskan") return gagal(400, "aksi harus tugaskan, tutup, atau buka");
  if (p.status !== "buka") return gagal(409, "permintaan sudah ditutup");
  if (typeof b.o.relawan_id !== "string" || !RE_ID.test(b.o.relawan_id)) return gagal(400, "relawan_id tidak sah");
  const r = await env.DB.prepare("SELECT id, status, dummy, anonim FROM relawan WHERE id = ?").bind(b.o.relawan_id).first();
  if (!r || r.anonim || r.dummy !== p.dummy) return gagal(404, "relawan tidak ditemukan");
  const gid = acak(8);
  const x = await env.DB.prepare("UPDATE relawan SET status = 'ditugaskan', diubah = ?, oleh = ? WHERE id = ? AND status = 'siap_tugas'").bind(kini, mod, r.id).run();   // gerbang atomik: dua admin tak menugaskan orang yang sama
  if (!x.meta.changes) return gagal(409, `relawan berstatus ${r.status}; hanya yang siap_tugas bisa ditugaskan`);
  try { await env.DB.prepare("INSERT INTO relawan_penugasan (id, permintaan_id, relawan_id, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(gid, id, r.id, kini, kini, mod, p.dummy).run(); }
  catch (e) { await env.DB.prepare("UPDATE relawan SET status = 'siap_tugas' WHERE id = ? AND status = 'ditugaskan'").bind(r.id).run(); if (/UNIQUE/i.test(e?.message)) return gagal(409, "relawan ini sudah pernah ditugaskan di permintaan ini"); throw e; }
  return json({id: gid, status: "ditawarkan"}, 201);
}

/* ================================================================ admin: penugasan, penilaian, asuransi, pelatihan, jam */
async function daftarPenugasan(env, req) {
  if (!await adm(env, req)) return tolakMod();
  return json({penugasan: baris(await env.DB.prepare(`SELECT g.id, g.status, g.asuransi, g.polis, g.nilai, g.nilai_catatan, g.dibuat, g.dummy, r.id relawan_id, r.nama, r.prov, p.id permintaan_id, p.judul, p.bencana, p.mulai, p.selesai,
      (SELECT coalesce(sum(menit), 0) FROM relawan_jam j WHERE j.penugasan_id = g.id AND j.sah = 1) jam_sah_menit
    FROM relawan_penugasan g JOIN relawan r ON r.id = g.relawan_id JOIN relawan_permintaan p ON p.id = g.permintaan_id ORDER BY g.dibuat DESC LIMIT 1000`).all()),
    jam: baris(await env.DB.prepare(`SELECT j.id, j.penugasan_id, r.nama, j.masuk, j.keluar, j.menit, j.sah, j.lat, j.lon FROM relawan_jam j JOIN relawan r ON r.id = j.relawan_id ORDER BY j.masuk DESC LIMIT 500`).all())});
}
async function ubahPenugasan(env, req, id, kini) {
  const mod = await adm(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const o = b.o, g = await env.DB.prepare("SELECT id, status, relawan_id FROM relawan_penugasan WHERE id = ?").bind(id).first(); if (!g) return gagal(404, "penugasan tidak ada");
  if (o.aksi === "asuransi") {
    const polis = tx(o.polis, 60);
    if (!ASURANSI.includes(o.asuransi)) return gagal(400, `asuransi harus salah satu dari ${ASURANSI.join(", ")}`);
    if (polis === undefined) return gagal(400, "nomor polis maksimal 60 karakter");
    await env.DB.prepare("UPDATE relawan_penugasan SET asuransi = ?, polis = ?, diubah = ?, oleh = ? WHERE id = ?").bind(o.asuransi, polis, kini, mod, id).run();
    return json({id, asuransi: o.asuransi});
  }
  if (o.aksi === "nilai") {
    const n = num(o.nilai, 1, 5, true), catatan = tx(o.catatan, 300);
    if (n == null || Number.isNaN(n)) return gagal(400, "nilai harus bilangan bulat 1-5");
    if (catatan === undefined) return gagal(400, "catatan maksimal 300 karakter");
    if (g.status !== "selesai") return gagal(409, "penilaian hanya untuk penugasan yang sudah selesai (purna tugas)");
    await env.DB.prepare("UPDATE relawan_penugasan SET nilai = ?, nilai_catatan = ?, diubah = ?, oleh = ? WHERE id = ?").bind(n, catatan, kini, mod, id).run();
    return json({id, nilai: n});
  }
  if (o.aksi === "selesai") {
    if (g.status !== "bertugas" && g.status !== "diterima") return gagal(409, `penugasan berstatus ${g.status}; selesai butuh bertugas atau diterima`);
    if (await env.DB.prepare("SELECT 1 FROM relawan_jam WHERE penugasan_id = ? AND keluar IS NULL").bind(id).first()) return gagal(409, "relawan masih tercatat check-in; minta check-out dulu");
    await env.DB.batch([env.DB.prepare("UPDATE relawan_penugasan SET status = 'selesai', diubah = ?, oleh = ? WHERE id = ?").bind(kini, mod, id),
      env.DB.prepare("UPDATE relawan SET status = 'selesai', diubah = ? WHERE id = ? AND status IN ('ditugaskan', 'bertugas')").bind(kini, g.relawan_id)]);
    return json({id, status: "selesai"});
  }
  if (o.aksi === "batalkan") {
    if (g.status !== "ditawarkan" && g.status !== "diterima") return gagal(409, `penugasan berstatus ${g.status}; batalkan butuh ditawarkan atau diterima`);
    await env.DB.batch([env.DB.prepare("UPDATE relawan_penugasan SET status = 'dibatalkan', diubah = ?, oleh = ? WHERE id = ?").bind(kini, mod, id),
      env.DB.prepare("UPDATE relawan SET status = 'siap_tugas', diubah = ? WHERE id = ? AND status = 'ditugaskan'").bind(kini, g.relawan_id)]);
    return json({id, status: "dibatalkan"});
  }
  return gagal(400, "aksi harus asuransi, nilai, selesai, atau batalkan");
}
async function putusJamAdmin(env, req, id, kini) { if (!await adm(env, req)) return tolakMod(); return putusJam(env, req, id, kini, null); }

async function daftarPelatihan(env, req, kini) {
  if (!await adm(env, req)) return tolakMod();
  const h = wib(kini);
  return json({pelatihan: baris(await env.DB.prepare(`SELECT l.id, l.relawan_id, r.nama relawan, l.nama, l.penyelenggara, l.tgl, l.berlaku_sampai, l.dummy FROM relawan_pelatihan l JOIN relawan r ON r.id = l.relawan_id
    ORDER BY l.tgl DESC LIMIT 1000`).all()).map(l => ({...l, kedaluwarsa: !!l.berlaku_sampai && l.berlaku_sampai < h}))});
}
async function tambahPelatihan(env, req, kini) {
  const mod = await adm(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  const o = b.o, nama = tx(o.nama, 120), pen = tx(o.penyelenggara, 120), sampai = o.berlaku_sampai == null || o.berlaku_sampai === "" ? null : o.berlaku_sampai;
  if (typeof o.relawan_id !== "string" || !RE_ID.test(o.relawan_id)) return gagal(400, "relawan_id tidak sah");
  if (!nama || nama.length < 2) return gagal(400, "nama pelatihan 2-120 karakter");
  if (pen === undefined) return gagal(400, "penyelenggara maksimal 120 karakter");
  if (typeof o.tgl !== "string" || !tglSah(o.tgl)) return gagal(400, "tanggal pelatihan harus YYYY-MM-DD");
  if (sampai !== null && (typeof sampai !== "string" || !tglSah(sampai) || sampai < o.tgl)) return gagal(400, "berlaku sampai harus YYYY-MM-DD dan tidak sebelum tanggal pelatihan");
  const r = await env.DB.prepare("SELECT dummy, anonim FROM relawan WHERE id = ?").bind(o.relawan_id).first();
  if (!r || r.anonim) return gagal(404, "relawan tidak ditemukan");
  const id = acak(8);
  await env.DB.prepare("INSERT INTO relawan_pelatihan (id, relawan_id, nama, penyelenggara, tgl, berlaku_sampai, dibuat, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, o.relawan_id, nama, pen, o.tgl, sampai, kini, mod, r.dummy).run();
  return json({id}, 201);
}
async function hapusPelatihan(env, req, id) {
  if (!await adm(env, req)) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  if (b.o.aksi !== "hapus") return gagal(400, "aksi harus hapus");
  const x = await env.DB.prepare("DELETE FROM relawan_pelatihan WHERE id = ?").bind(id).run();
  return x.meta.changes ? json({id}) : gagal(404, "pelatihan tidak ada");
}

/* ================================================================ dummy (DUMMY.md): satu halaman /admin/relawan = seluruh rantai, hulu ke hilir */
const TABEL_DUMMY = ["relawan_kampus", "relawan", "relawan_permintaan", "relawan_penugasan", "relawan_jam", "relawan_pelatihan"];
const tglGeser = (kini, hari) => wib(kini + hari * HARI);
async function dummyIsi(env, kini, mod) {
  const hidup = (await env.DB.prepare("SELECT (SELECT count(*) FROM relawan_kampus WHERE dummy = 1) + (SELECT count(*) FROM relawan WHERE dummy = 1) + (SELECT count(*) FROM relawan_permintaan WHERE dummy = 1) n").first()).n;
  if (hidup) return gagal(409, `data dummy relawan sudah ada (${hidup} baris hidup); hapus dulu dengan 🧹`);
  const st = [], p = (sql, ...a) => st.push(env.DB.prepare(sql).bind(...a));
  /* kampus: aktif panjang, MoU <= 60 hari habis, MoU sudah habis. kode_sha NULL: dummy tak bisa dipakai masuk */
  const KAMPUS = [["Universitas Contoh Borneo", "UCB", "62", 300, 40], ["Institut Contoh Sumatera", "ICS", "16", 30, 25], ["Universitas Contoh Nusantara", "UCN", "64", -20, 15]];
  const idK = KAMPUS.map(() => acak(8));
  KAMPUS.forEach(([nama, singkatan, prov, selisih, kuota], i) => p(`INSERT INTO relawan_kampus (id, nama, singkatan, prov, no_mou, mulai, berakhir, pic_nama, pic_jabatan, pic_email, pic_wa, kuota, catatan, kode_sha, dibuat, diubah, oleh, dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1)`, idK[i], nama, singkatan, prov, `MoU/CONTOH/${i + 1}/2026`, tglGeser(kini, selisih - 365), tglGeser(kini, selisih), `PIC Contoh ${i + 1}`, "Wakil Rektor III",
    `pic${i + 1}@contoh.invalid`, `62800001${String(i).padStart(4, "0")}`, kuota, "[Contoh] data dummy", kini, kini, mod));
  /* relawan: tiap status minimal satu; jalur dan wilayah dibagi bergiliran */
  const SEBARAN = ["terdaftar", "terdaftar", "terdaftar", "diverifikasi", "diverifikasi", "siap_tugas", "siap_tugas", "siap_tugas", "siap_tugas", "siap_tugas", "ditugaskan", "ditugaskan", "bertugas", "bertugas",
    "selesai", "selesai", "selesai", "ditolak", "nonaktif", "daftar_hitam"];
  const WIL = [["62", "Kota Palangka Raya"], ["62", "Pulang Pisau"], ["16", "Ogan Komering Ilir"], ["61", "Kubu Raya"], ["64", "Kota Samarinda"], ["14", "Pelalawan"]];
  const AHLI = [["medis", "perawat"], ["pemadaman", "sar"], ["logistik", "dapur_umum", "pengemudi"], ["psikososial", "pendidikan_anak"], ["gis_data", "komunikasi"], ["sar", "teknik_bangunan"], ["distribusi", "logistik"], ["bahasa_isyarat", "komunikasi"]];
  const NAMA = ["Aditya", "Bunga", "Cahya", "Dimas", "Eka", "Fajar", "Gita", "Hasan", "Intan", "Joko", "Kirana", "Lukman", "Maya", "Nur", "Okta", "Putri", "Rizky", "Sari", "Tegar", "Umar"];
  const R = SEBARAN.map((status, i) => {
    const w = WIL[i % WIL.length], jalur = ["umum", "kampus", "organisasi"][i % 3], k = jalur === "kampus" ? Math.floor(i / 3) % 3 : null;
    return {id: acak(8), status, jalur, k, prov: w[0], kab: w[1], ahli: AHLI[i % AHLI.length], nama: `${NAMA[i]} Contoh`, hari: 2 + i % 5, maks: [7, 14, 30, 60][i % 4], luar: i % 3 === 0 ? 1 : 0, dibuat: kini - (i + 1) * 2 * HARI};
  });
  R.forEach((r, i) => p(`INSERT INTO relawan (id, kode_sha, nama, wa, email, prov, kab, jalur, kampus_id, organisasi, keahlian, sertifikat, hari_per_minggu, maks_hari, luar_provinsi, gol_darah, darurat_nama, darurat_wa,
      status, alasan, setuju_pdp, dibuat, diubah, diverifikasi, oleh, dummy) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1)`,
    r.id, r.nama, `6280000${String(i + 1).padStart(5, "0")}`, `relawan${i + 1}@contoh.invalid`, r.prov, r.kab, r.jalur, r.k == null ? null : idK[r.k], r.jalur === "organisasi" ? "Komunitas Contoh Peduli" : null,
    JSON.stringify(r.ahli), i % 2 ? "Pertolongan Pertama Dasar" : null, r.hari, r.maks, r.luar, GOL_DARAH[i % 8], `Keluarga ${NAMA[i]}`, `6280001${String(i + 1).padStart(5, "0")}`,
    r.status, r.status === "ditolak" ? "[Contoh] data tidak lengkap" : r.status === "daftar_hitam" ? "[Contoh] melanggar ketentuan lapangan" : null, r.dibuat, kini,
    ["terdaftar", "ditolak"].includes(r.status) ? null : r.dibuat + HARI, ["terdaftar"].includes(r.status) ? null : mod));
  /* permintaan: dua buka, satu ditutup (sudah purna) */
  const IDP = [acak(8), acak(8), acak(8)];
  [["Dukungan pemadaman Pulang Pisau", "karhutla", "62", "Pulang Pisau", [["pemadaman", 6], ["medis", 2], ["logistik", 3]], 2, 14, "buka"],
    ["Dapur umum dan psikososial banjir OKI", "banjir", "16", "Ogan Komering Ilir", [["dapur_umum", 4], ["psikososial", 2]], -3, 7, "buka"],
    ["Pos kesehatan asap Palangka Raya", "karhutla", "62", "Kota Palangka Raya", [["medis", 3], ["perawat", 3]], -30, -10, "ditutup"]].forEach(([judul, bencana, prov, kab, butuh, a, b, status], i) =>
    p("INSERT INTO relawan_permintaan (id, judul, bencana, prov, kab, lat, lon, butuh, mulai, selesai, status, catatan, dibuat, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
      IDP[i], judul, bencana, prov, kab, [-2.2, -3.1, -2.2][i], [114.0, 105.2, 113.9][i], JSON.stringify(butuh.map(([keahlian, jumlah]) => ({keahlian, jumlah}))), tglGeser(kini, a), tglGeser(kini, b), status, "[Contoh] data dummy", kini - 5 * HARI, mod));
  /* penugasan + jam: dua ditawarkan/diterima, dua bertugas (satu sesi masih terbuka), tiga selesai berpenilaian */
  const idx = s => R.map((r, i) => [r, i]).filter(([r]) => r.status === s).map(([r]) => r);
  const tugas = [], tg = (r, perm, status, asuransi, nilai, catatan) => { const id = acak(8); tugas.push({id, r, perm}); p("INSERT INTO relawan_penugasan (id, permintaan_id, relawan_id, status, asuransi, polis, nilai, nilai_catatan, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
    id, IDP[perm], r.id, status, asuransi, asuransi === "aktif" ? "POLIS-CONTOH-" + id.slice(0, 6) : null, nilai, catatan, kini - 3 * HARI, kini - HARI, mod); return id; };
  const [d1, d2] = idx("ditugaskan"), [b1, b2] = idx("bertugas"), [s1, s2, s3] = idx("selesai");
  tg(d1, 0, "ditawarkan", "belum", null, null); tg(d2, 0, "diterima", "diajukan", null, null);
  const gb1 = tg(b1, 1, "bertugas", "aktif", null, null), gb2 = tg(b2, 1, "bertugas", "tidak_perlu", null, null);
  const gs1 = tg(s1, 2, "selesai", "aktif", 5, "[Contoh] sangat andal"), gs2 = tg(s2, 2, "selesai", "aktif", 4, "[Contoh] tepat waktu"), gs3 = tg(s3, 2, "selesai", "tidak_perlu", 3, "[Contoh] cukup");
  /* sesi: masuk/keluar nyata, menit dihitung dari selisihnya, sah bergilir (1, 0, 2) */
  const sesi = (r, g, hariLalu, mulaiJam, lamaJam, sah, terbuka = false) => { const masuk = kini - hariLalu * HARI + mulaiJam * JAM, keluar = terbuka ? null : masuk + lamaJam * JAM;
    p("INSERT INTO relawan_jam (id, relawan_id, penugasan_id, masuk, keluar, lat, lon, menit, sah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
      acak(8), r.id, g, masuk, keluar, -2.2 + Math.random() * 0.05, 114 + Math.random() * 0.05, keluar == null ? null : menitSesi(masuk, keluar), sah, sah ? mod : null); };
  sesi(b1, gb1, 3, -6, 8, 1); sesi(b1, gb1, 2, -6, 7.5, 1); sesi(b1, gb1, 1, -6, 6, 0); sesi(b1, gb1, 0, -3, 3, 0, true);
  sesi(b2, gb2, 2, -7, 5, 1); sesi(b2, gb2, 1, -7, 9, 2);
  sesi(s1, gs1, 28, -6, 8, 1); sesi(s1, gs1, 27, -6, 8, 1); sesi(s1, gs1, 26, -6, 7, 1); sesi(s2, gs2, 28, -6, 6, 1); sesi(s2, gs2, 27, -6, 5, 1); sesi(s3, gs3, 28, -6, 4, 1); sesi(s3, gs3, 27, -6, 3, 0);
  /* pelatihan: satu sudah kedaluwarsa */
  [[R[5], "Pertolongan Pertama (BTCLS)", "PMI Contoh", -200, 165], [R[6], "Dasar SAR Banjir", "Basarnas Contoh", -400, -35], [R[7], "Pemadaman Karhutla Dasar", "Manggala Agni Contoh", -90, 640],
    [R[8], "Psikososial Pascabencana", "BPBD Contoh", -60, null], [s1, "Manajemen Dapur Umum", "Dinsos Contoh", -150, 300], [b1, "Penggunaan Pompa Portabel", "Damkar Contoh", -120, 245]].forEach(([r, nama, pen, a, b]) =>
    p("INSERT INTO relawan_pelatihan (id, relawan_id, nama, penyelenggara, tgl, berlaku_sampai, dibuat, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)", acak(8), r.id, nama, pen, tglGeser(kini, a), b == null ? null : tglGeser(kini, b), kini, mod));
  for (let i = 0; i < st.length; i += 80) await env.DB.batch(st.slice(i, i + 80));
  return json({ok: true, kampus: KAMPUS.length, relawan: R.length, permintaan: IDP.length, penugasan: tugas.length, jam: 13, pelatihan: 6}, 201);
}
async function dummyHapus(env) {
  const n = {};
  for (const t of TABEL_DUMMY) n[t] = (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE dummy = 1`).first()).n;
  await env.DB.batch(["relawan_jam", "relawan_pelatihan", "relawan_penugasan", "relawan_permintaan", "relawan", "relawan_kampus"].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE dummy = 1`)));   // anak dulu
  return json({ok: true, kampus: n.relawan_kampus, relawan: n.relawan, permintaan: n.relawan_permintaan, penugasan: n.relawan_penugasan, jam: n.relawan_jam, pelatihan: n.relawan_pelatihan});
}
async function dummy(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return salahBody(b);
  if (b.o.aksi === "isi") return dummyIsi(env, kini, mod);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* halaman pendaftaran: CSP bersama melarang skrip luar, sedangkan widget Turnstile (bila diaktifkan) butuh challenges.cloudflare.com.
   Pelonggaran hanya di halaman ini dan hanya bila TURNSTILE_SITEKEY diset. */
async function halamanDaftar(env, url) {
  const r = await halamanBnpbPublik(env, url, "relawan");
  if (!r.ok || !env.TURNSTILE_SITEKEY) return r;
  const h = new Headers(r.headers);
  h.set("content-security-policy", h.get("content-security-policy").replace("script-src 'self'", "script-src 'self' https://challenges.cloudflare.com").replace("worker-src", "frame-src https://challenges.cloudflare.com; worker-src"));
  return new Response(r.body, {status: r.status, headers: h});
}

/* ================================================================ rute */
/* digabung ke RUTE di src/worker.js. Auth: "-" publik, "kode" = x-kode (relawan atau koordinator), "mod" = modOK, "super" = superOK.
   Migrasi diterapkan manual di produksi: tabel belum ada -> 503, bukan 500. */
const lindungi = rute => Object.fromEntries(Object.entries(rute).map(([k, f]) => [k, async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(e?.message || "")) return gagal(503, "fitur relawan belum diaktifkan (migrasi 0023 belum diterapkan)"); throw e; }
}]));
export const RUTE_RELAWAN = lindungi({
  "GET /relawan": (env, req, url) => halamanDaftar(env, url),
  "GET /relawan/saya": (env, req, url) => halamanBnpbPublik(env, url, "relawan-saya", {pribadi: true}),
  "GET /kampus": (env, req, url) => halamanBnpbPublik(env, url, "kampus", {pribadi: true}),
  "GET /admin/relawan": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("relawan")),
  "GET /api/relawan/ringkas": (env, req, url, kini, ctx) => ringkas(env, req, url, kini, ctx),
  "POST /api/relawan/daftar": (env, req, url, kini) => daftar(env, req, url, kini),
  "GET /api/relawan/saya": (env, req, url, kini) => relawanSaya(env, req, kini),
  "POST /api/relawan/saya": (env, req, url, kini) => ubahSaya(env, req, kini),
  "POST /api/relawan/saya/penugasan/:id": (env, req, url, kini, ctx, id) => aksiPenugasanSaya(env, req, id, kini),
  "GET /api/relawan/kampus/saya": (env, req, url, kini) => kampusSaya(env, req, kini),
  "GET /api/relawan/kampus/csv": (env, req, url, kini) => csvKampus(env, req, kini),
  "POST /api/relawan/kampus/relawan/:id": (env, req, url, kini, ctx, id) => putusKampus(env, req, id, kini),
  "POST /api/relawan/kampus/jam/:id": (env, req, url, kini, ctx, id) => putusJamKampus(env, req, id, kini),
  "GET /api/relawan/admin/relawan": (env, req, url) => daftarAdmin(env, req, url),
  "GET /api/relawan/admin/relawan/:id": (env, req, url, kini, ctx, id) => rincianAdmin(env, req, id),
  "POST /api/relawan/admin/relawan/:id": (env, req, url, kini, ctx, id) => ubahAdmin(env, req, url, id, kini),
  "GET /api/relawan/admin/csv": (env, req, url) => csvAdmin(env, req, url),
  "GET /api/relawan/admin/kampus": (env, req, url, kini) => daftarKampusAdmin(env, req, kini),
  "POST /api/relawan/admin/kampus": (env, req, url, kini) => buatKampus(env, req, url, kini),
  "POST /api/relawan/admin/kampus/:id": (env, req, url, kini, ctx, id) => ubahKampus(env, req, url, id, kini),
  "GET /api/relawan/admin/permintaan": (env, req) => daftarPermintaan(env, req),
  "POST /api/relawan/admin/permintaan": (env, req, url, kini) => buatPermintaan(env, req, kini),
  "GET /api/relawan/admin/permintaan/:id": (env, req, url, kini, ctx, id) => rincianPermintaan(env, req, id, kini),
  "POST /api/relawan/admin/permintaan/:id": (env, req, url, kini, ctx, id) => ubahPermintaan(env, req, id, kini),
  "GET /api/relawan/admin/penugasan": (env, req) => daftarPenugasan(env, req),
  "POST /api/relawan/admin/penugasan/:id": (env, req, url, kini, ctx, id) => ubahPenugasan(env, req, id, kini),
  "POST /api/relawan/admin/jam/:id": (env, req, url, kini, ctx, id) => putusJamAdmin(env, req, id, kini),
  "GET /api/relawan/admin/pelatihan": (env, req, url, kini) => daftarPelatihan(env, req, kini),
  "POST /api/relawan/admin/pelatihan": (env, req, url, kini) => tambahPelatihan(env, req, kini),
  "POST /api/relawan/admin/pelatihan/:id": (env, req, url, kini, ctx, id) => hapusPelatihan(env, req, id),
  "POST /api/relawan/dummy": (env, req, url, kini) => dummy(env, req, kini),
});
