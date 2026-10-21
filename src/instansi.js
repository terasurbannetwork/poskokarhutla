/* Akun Instansi & Tugas Api. Skema: migrations/0029_instansi.sql. Aturan pemilik (21 Okt 2026):
   - Akun dibuat massal oleh admin (belum_klaim), wakil masuk lalu mengisi verifikasi (menunggu), admin aktif/tolak/cabut. Sandi acak 16 huruf tampil SEKALI
     ke admin (tidak disimpan, tidak di-log); yang disimpan sha256(garam akun + sandi). Tidak ada ganti sandi oleh pengguna; admin bisa reset (sesi dicabut).
   - Tugas api dibuat cron menit 18 dari public/data/tugas_kompleks.json. Id kompleks tidak stabil antarhari, jadi tugas dikunci ke LOKASI:
     kompleks dalam <= 2 km dari tugas terbuka di kabupaten yang sama digabung. Dua langkah: konfirmasi (6 jam) lalu kabar tindakan (tiap 24 jam sampai padam).
   - Tagih = admin menekan tautan wa.me berisi pesan siap kirim. TIDAK ada kiriman otomatis. "Terlambat" dihitung saat dibaca, bukan kolom.
   - Tiap rute instansi memeriksa sesi, status aktif, DAN cakupan wilayah tugas di Worker. Kontak/dokumen tidak pernah lewat rute publik.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), serentak bisa lolos satu-dua di atas batas. Perbandingan sandi memakai === pada hash (sandi 93 bit acak). */
import {json, gagal, acak, sha, bacaBody, bacaBytes, normalWA, ipHash} from "./worker.js";
import {tx, num, wib, tglSah, modOK, superOK, KENDALA, RE_PID, RE_EMAIL, cekKontak} from "./posko.js";
import {bersihMedia} from "./media_bersih.js";
import {laju} from "./bnpb.js";
import {nilaiGps, jaringanRelay} from "./gps.js";
import {jaringanHosting} from "./publik.js";
import {jenisBerkas, durasiMP4, ATURAN_MEDIA, jarakM} from "./foto.js";
import {km} from "./titik.js";
import {halamanAdmin} from "./statistik.js";
import {halamanInstansi, HALAMAN_STAF} from "./admin_halaman.js";
import {gudangTerdekat, siapkanKerahkan, lepasDariTugas} from "./inventaris.js";
import {modAtauStaf, dalamWilayahStaf, dariStaf, stafNyata, P_VALIDASI, P_KONSESI} from "./staf.js";
import {bersihkanPenugasan, dummyPenugasan, hapusDummyPenugasan} from "./penugasan.js";

const MENIT = 60e3, JAM = 36e5, HARI = 24 * JAM, TENGGAT_KONFIRMASI = 6 * JAM, TENGGAT_KABAR = 24 * JAM, SESI_UMUR = 30 * HARI, GABUNG_KM = 2, JAUH_KM = 5;
/* bacaan GPS boleh sampai 6 jam lalu: isian dari antrean luring terkirim saat sinyal kembali (sama dengan laporan regu posko, src/posko.js) */
const GPS_UMUR_MAKS = 6 * JAM;
const BBOX = {latMin: -11.5, latMaks: 6.5, lonMin: 94.5, lonMaks: 141.5}, MAKS_DOK = 3 * 1048576, MAKS_FOTO = 2 * 1048576, COOKIE = "sesi_instansi", MAKS_REKOMENDASI = 2000;
/* daftar tetap: sama dengan CHECK/trigger di 0029 dan public/instansi.js (dijaga instansi.test.mjs) */
export const JENIS = ["pemprov", "pemkab", "pemkot", "polda", "polres", "kodam", "kodim"];
export const STATUS_AKUN = ["belum_klaim", "menunggu", "aktif", "ditolak", "dicabut"];
export const HASIL = ["api_ada", "bukan_api", "sudah_padam"];
export const STATUS_API = ["menyala", "bara", "padam"];
export const LAHAN = ["gambut", "mineral", "campuran", "tidak_tahu"];
export const BANTUAN = {personel: "Personel", air_pompa: "Air dan pompa", alat_berat: "Alat berat", heli_water_bombing: "Helikopter water bombing", logistik: "Logistik", medis: "Medis", lainnya: "Lainnya"};
export const UNSUR = ["bpbd", "tni", "polri", "manggala_agni", "mpa", "damkar", "swasta", "relawan", "lainnya"];
export const ALAT = ["pompa", "selang_m", "jet_shooter", "heli_wb", "alat_berat", "drone_termal"];
const NAMA_JENIS = {pemprov: "Pemerintah Provinsi", pemkab: "Pemerintah Kabupaten", pemkot: "Pemerintah Kota", polda: "Polda", polres: "Polres", kodam: "Kodam", kodim: "Kodim"};

/* kode provinsi BPS -> [singkatan username, nama] */
export const PROV = {"11": ["aceh", "Aceh"], "12": ["sumut", "Sumatera Utara"], "13": ["sumbar", "Sumatera Barat"], "14": ["riau", "Riau"], "15": ["jambi", "Jambi"], "16": ["sumsel", "Sumatera Selatan"],
  "17": ["bengkulu", "Bengkulu"], "18": ["lampung", "Lampung"], "19": ["babel", "Kepulauan Bangka Belitung"], "21": ["kepri", "Kepulauan Riau"], "31": ["dki", "DKI Jakarta"], "32": ["jabar", "Jawa Barat"],
  "33": ["jateng", "Jawa Tengah"], "34": ["diy", "DI Yogyakarta"], "35": ["jatim", "Jawa Timur"], "36": ["banten", "Banten"], "51": ["bali", "Bali"], "52": ["ntb", "Nusa Tenggara Barat"],
  "53": ["ntt", "Nusa Tenggara Timur"], "61": ["kalbar", "Kalimantan Barat"], "62": ["kalteng", "Kalimantan Tengah"], "63": ["kalsel", "Kalimantan Selatan"], "64": ["kaltim", "Kalimantan Timur"],
  "65": ["kaltara", "Kalimantan Utara"], "71": ["sulut", "Sulawesi Utara"], "72": ["sulteng", "Sulawesi Tengah"], "73": ["sulsel", "Sulawesi Selatan"], "74": ["sultra", "Sulawesi Tenggara"],
  "75": ["gorontalo", "Gorontalo"], "76": ["sulbar", "Sulawesi Barat"], "81": ["maluku", "Maluku"], "82": ["malut", "Maluku Utara"], "91": ["papua", "Papua"], "92": ["papuabarat", "Papua Barat"],
  "93": ["papuaselatan", "Papua Selatan"], "94": ["papuatengah", "Papua Tengah"], "95": ["papuapegunungan", "Papua Pegunungan"], "96": ["papuabaratdaya", "Papua Barat Daya"]};
/* Kodam dan cakupan provinsinya. Korem dilewati: Kodim sudah per kabupaten/kota. */
// PERLU DICEK PEMILIK: cakupan Kodam per 2026
export const KODAM = [["iskandarmuda", "Iskandar Muda", ["11"]], ["bukitbarisan", "I/Bukit Barisan", ["12"]], ["tuankuimambonjol", "XX/Tuanku Imam Bonjol", ["13", "15"]],
  ["tuankutambusai", "XIX/Tuanku Tambusai", ["14", "21"]], ["sriwijaya", "II/Sriwijaya", ["16", "19"]], ["radininten", "XXI/Radin Inten", ["17", "18"]], ["jaya", "Jaya", ["31", "36"]],
  ["siliwangi", "III/Siliwangi", ["32"]], ["diponegoro", "IV/Diponegoro", ["33", "34"]], ["brawijaya", "V/Brawijaya", ["35"]], ["udayana", "IX/Udayana", ["51", "52", "53"]],
  ["tanjungpura", "XII/Tanjungpura", ["61"]], ["tambunbungai", "XXII/Tambun Bungai", ["62", "63"]], ["mulawarman", "VI/Mulawarman", ["64", "65"]], ["merdeka", "XIII/Merdeka", ["71", "75"]],
  ["palakawira", "XXIII/Palaka Wira", ["72", "76"]], ["hasanuddin", "XIV/Hasanuddin", ["73", "74"]], ["pattimura", "XVI/Pattimura", ["81", "82"]],
  ["cenderawasih", "XVII/Cenderawasih", ["91", "94", "95"]], ["kasuari", "XVIII/Kasuari", ["92", "96"]], ["mandalatrikora", "XXIV/Mandala Trikora", ["93"]]];

const slug = s => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const tolakMod = () => gagal(403, "fitur ini hanya untuk moderator ke atas (bukan akun gerbang situs)");
const tolakSesi = () => gagal(401, "belum masuk atau sesi berakhir; masuk lagi");
const aman = {"x-content-type-options": "nosniff"};

/* ================================================================ daftar akun (murni): pusat_kec.json -> definisi akun, deterministik */
/* nama yang bentrok mendapat singkatan provinsi, lalu angka; urutan tetap (prov, kabupaten), jadi hasilnya sama di tiap jalan */
export function susunDefs(kunciKec) {
  const defs = [], pakai = new Set();
  const unik = (dasar, prov) => { let u = dasar; if (pakai.has(u)) u = dasar + PROV[prov][0]; for (let i = 2; pakai.has(u); i++) u = dasar + PROV[prov][0] + i; pakai.add(u); return u; };
  for (const [kode, [s, nama]] of Object.entries(PROV)) {
    defs.push({jenis: "pemprov", tingkat: "prov", wilayah: `Provinsi ${nama}`, kunci: kode, cakupan: [kode], username: unik("pemprov" + s, kode)});
    defs.push({jenis: "polda", tingkat: "prov", wilayah: `Polda ${kode === "31" ? "Metro Jaya" : nama}`, kunci: kode, cakupan: [kode], username: unik(kode === "31" ? "poldametrojaya" : "polda" + s, kode)});
  }
  for (const [k, nama, cakupan] of KODAM) defs.push({jenis: "kodam", tingkat: "prov", wilayah: `Kodam ${nama}`, kunci: k, cakupan, username: unik("kodam" + k, cakupan[0])});
  const kab = new Set();
  for (const key of Object.keys(kunciKec)) { const [p, a] = key.split("|"); if (PROV[p] && a && a.length >= 2 && a !== "None") kab.add(`${p}|${a}`); }   // kabupaten "None" = galat data sumber, dilewati
  for (const key of [...kab].sort()) {
    const [p, a] = key.split("|"), kota = a.startsWith("Kota "), s = slug(kota ? a.slice(5) : a);
    if (!s) continue;
    const dasar = {pemkab: "pemkab", pemkot: "pemkot", polres: kota ? "polreskota" : "polres", kodim: kota ? "kodimkota" : "kodim"};
    for (const jenis of [kota ? "pemkot" : "pemkab", "polres", "kodim"])
      defs.push({jenis, tingkat: "kab", wilayah: `${jenis === "polres" ? "Polres" : jenis === "kodim" ? "Kodim" : kota ? "Pemerintah" : "Pemerintah Kabupaten"} ${a}`,
        kunci: key, cakupan: [p], prov: p, kab: a, username: unik(dasar[jenis] + s, p)});
  }
  return defs;
}
async function muatDefs(env) {
  try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/banjir/data/pusat_kec.json")); if (!r.ok) { r.body?.cancel(); return null; } return susunDefs(await r.json()); } catch (e) { return null; }
}

/* ================================================================ sandi */
const ABJAD = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";   // 57 huruf, tanpa 0 O 1 l I
export function sandiAcak(n = 16) {
  let s = "";
  while (s.length < n) for (const b of crypto.getRandomValues(new Uint8Array(32))) if (b < 228 && s.length < n) s += ABJAD[b % 57];   // 228 = 4 x 57: tanpa bias
  return s;
}
const hashSandi = async (garam, sandi) => sha(garam + sandi);
async function sandiBaru() { const sandi = sandiAcak(), garam = acak(16); return {sandi, garam, sandi_sha: await hashSandi(garam, sandi)}; }

/* ================================================================ sesi */
const cookieSet = (nilai, umur) => ["/instansi", "/api/instansi"].map(p => `${COOKIE}=${nilai}; Path=${p}; HttpOnly; Secure; SameSite=Lax; Max-Age=${umur}`);
const denganCookie = (r, daftar) => { for (const c of daftar) r.headers.append("set-cookie", c); return r; };
const KOLOM_AKUN = "id, username, jenis, tingkat, wilayah, cakupan, prov, kab, status, alasan, nama, nip, pangkat, jabatan, unit, email, wa, telepon_kantor, surat, kartu, dikirim, diputus, wajib_ganti, dummy";
const ringkas = a => ({id: a.id, username: a.username, jenis: a.jenis, tingkat: a.tingkat, wilayah: a.wilayah, status: a.status, alasan: a.alasan,
  wajib_ganti: !!a.wajib_ganti, verifikasi: {nama: a.nama, nip: a.nip, pangkat: a.pangkat, jabatan: a.jabatan, unit: a.unit, email: a.email, wa: a.wa, telepon_kantor: a.telepon_kantor, surat: !!a.surat, kartu: !!a.kartu}});
async function sesiDari(env, req, kini) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})(?:;|$)`));
  if (!m) return null;
  return env.DB.prepare(`SELECT ${KOLOM_AKUN.split(", ").map(k => "a." + k).join(", ")} FROM instansi_sesi s JOIN instansi_akun a ON a.id = s.akun_id WHERE s.token_sha = ? AND s.kedaluwarsa > ? AND a.status != 'dicabut'`)
    .bind(await sha(m[1]), kini).first();
}
/* akun masuk apa pun statusnya, atau Response galat */
async function akunMasuk(env, req, kini) { const a = await sesiDari(env, req, kini); return a || tolakSesi(); }
/* akun masuk DAN aktif */
export async function akunAktif(env, req, kini) {
  const a = await akunMasuk(env, req, kini); if (a instanceof Response) return a;
  if (a.status !== "aktif") return gagal(403, a.status === "ditolak" ? "verifikasi ditolak; perbaiki data lalu kirim ulang" : "akun belum aktif; lengkapi verifikasi dan tunggu persetujuan admin");
  /* sandi awal (CSV) atau hasil reset diketahui admin: sebelum membuat sandi baru, sesi hanya boleh ke rute gantisandi, keluar, dan saya */
  return a.wajib_ganti ? json({galat: "buat sandi baru dulu: sandi awal diketahui admin", wajib_ganti: true}, 403) : a;
}
const gagalBanyak = async (env, kunci, aksi, maks, kini) => (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(kunci, aksi, kini - JAM).first()).n >= maks;
const catatLaju = (env, kunci, aksi, kini) => env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(kunci, aksi, kini);

/* Sandi diverifikasi DULU: sandi benar selalu masuk, walau penghitung gagal penuh (penyerang tidak bisa mengunci pemilik). 429 hanya di jalur salah.
   Kunci: (username + IP) 8 per jam, pengaman banjir per username saja 200 per jam dan per IP 30 per jam. Username tak dikenal dihitung sama (tidak membocorkan keberadaannya). */
const LAJU_LOGIN = {userIp: 8, user: 200, ip: 30};
async function masuk(env, req, kini) {
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const user = typeof b.o.username === "string" ? b.o.username.trim().toLowerCase().slice(0, 60) : "", sandi = typeof b.o.sandi === "string" ? b.o.sandi.slice(0, 100) : "";
  const ip = await ipHash(env, req), kUserIp = "ui:" + (await sha(user + "|" + ip)).slice(0, 40), kUser = "u:" + (await sha(user)).slice(0, 40);
  const a = /^[a-z0-9]{5,60}$/.test(user) ? await env.DB.prepare("SELECT id, garam, sandi_sha, status FROM instansi_akun WHERE username = ?").bind(user).first() : null;
  const cek = await hashSandi(a?.garam ?? "0".repeat(32), sandi);   // hash tetap dihitung untuk username tak dikenal
  if (!a || a.status === "dicabut" || cek !== a.sandi_sha) {
    const kunci = await gagalBanyak(env, kUserIp, "instansi.gagal_ui", LAJU_LOGIN.userIp, kini) || await gagalBanyak(env, kUser, "instansi.gagal_u", LAJU_LOGIN.user, kini) || await gagalBanyak(env, ip, "instansi.gagal_ip", LAJU_LOGIN.ip, kini);
    if (!kunci) await env.DB.batch([catatLaju(env, kUserIp, "instansi.gagal_ui", kini), catatLaju(env, kUser, "instansi.gagal_u", kini), catatLaju(env, ip, "instansi.gagal_ip", kini)]);   // sudah terkunci: tidak menulis baris lagi
    return kunci ? gagal(429, "terlalu banyak percobaan masuk yang salah; coba lagi sejam lagi", {"retry-after": "3600"}) : gagal(401, "username atau sandi salah");   // satu pesan untuk semua sebab
  }
  const token = acak(32);
  await env.DB.batch([env.DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(await sha(token), a.id, kini, kini + SESI_UMUR),
    env.DB.prepare("DELETE FROM instansi_sesi WHERE akun_id = ? AND kedaluwarsa <= ?").bind(a.id, kini)]);
  const akun = await env.DB.prepare(`SELECT ${KOLOM_AKUN} FROM instansi_akun WHERE id = ?`).bind(a.id).first();
  return denganCookie(json({akun: ringkas(akun)}), cookieSet(token, SESI_UMUR / 1000));
}
/* jejak audit: satu pernyataan, bisa dipasang dalam batch yang sama dengan aksinya; syarat (mis. "changes() > 0") menjaga jejak tak ditulis bila aksinya kalah balapan */
const stmtJejak = (env, oleh, akunId, aksi, alasan, kini, syarat = "1") => env.DB.prepare("INSERT INTO instansi_jejak (waktu, oleh, akun_id, aksi, alasan) SELECT ?, ?, ?, ?, ? WHERE " + syarat).bind(kini, oleh, akunId, aksi, alasan ?? null);
/* Buat sandi baru: server membangkitkan sandi acak (alfabet dan panjang sama), tampil SEKALI ke pengguna saja; sandi CSV dan sandi reset hangus.
   Tanpa sandi pilihan pengguna (tanpa PBKDF2: batas CPU). Sesi lain akun ini dicabut, sesi yang dipakai tetap hidup. */
async function gantiSandi(env, req, kini) {
  const a = await akunMasuk(env, req, kini); if (a instanceof Response) return a;
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`)), s = await sandiBaru();
  await env.DB.batch([env.DB.prepare("UPDATE instansi_akun SET garam = ?, sandi_sha = ?, wajib_ganti = 0 WHERE id = ?").bind(s.garam, s.sandi_sha, a.id),
    env.DB.prepare("DELETE FROM instansi_sesi WHERE akun_id = ? AND token_sha != ?").bind(a.id, await sha(m[1])), stmtJejak(env, "pengguna", a.id, "ganti_sandi", null, kini)]);
  return json({sandi: s.sandi});   // tampil sekali; tidak disimpan, tidak di-log
}
async function keluar(env, req, kini) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`));
  if (m) await env.DB.prepare("DELETE FROM instansi_sesi WHERE token_sha = ?").bind(await sha(m[1])).run();
  return denganCookie(json({ok: true}), cookieSet("", 0));
}
async function saya(env, req, kini) {
  const a = await akunMasuk(env, req, kini); if (a instanceof Response) return a;
  return json({akun: ringkas(a), cakupan: jsonAman(a.cakupan), kab: a.kab, bantuan: BANTUAN, kendala: KENDALA, hasil: HASIL, lahan: LAHAN});
}

/* ================================================================ verifikasi */
const RE_NIP = /^[0-9A-Za-z .\/-]{5,30}$/;
const isian = (v, min, maks, nama, wajib = true) => {
  const s = tx(v, maks);
  if (s === undefined) return {g: `${nama} maksimal ${maks} karakter`};
  if (!s) return wajib ? {g: `${nama} wajib diisi`} : {v: null};
  return s.length < min ? {g: `${nama} minimal ${min} karakter`} : {v: s};
};
const BOLEH_VERIFIKASI = ["belum_klaim", "ditolak", "menunggu"];
async function verifikasi(env, req, kini) {
  const a = await akunMasuk(env, req, kini); if (a instanceof Response) return a;
  if (!BOLEH_VERIFIKASI.includes(a.status)) return gagal(409, a.status === "aktif" ? "akun sudah aktif" : "akun tidak bisa memverifikasi");
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, f = {nama: isian(o.nama, 2, 100, "nama lengkap"), nip: isian(o.nip, 5, 30, "NIP/NRP"), pangkat: isian(o.pangkat, 1, 60, "pangkat/golongan", false),
    jabatan: isian(o.jabatan, 2, 100, "jabatan"), unit: isian(o.unit, 2, 120, "unit kerja"), email: isian(o.email, 6, 254, "email dinas"), wa: isian(o.wa, 8, 30, "nomor WhatsApp"),
    telepon_kantor: isian(o.telepon_kantor, 5, 20, "telepon kantor", false)};
  for (const k of Object.keys(f)) if (f[k].g) return gagal(400, f[k].g);
  const v = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.v]));
  if (!RE_NIP.test(v.nip)) return gagal(400, "NIP/NRP hanya huruf, angka, titik, garis, spasi, 5-30 karakter");
  v.email = v.email.toLowerCase(); if (!RE_EMAIL.test(v.email)) return gagal(400, "email dinas tidak sah");
  v.wa = normalWA(v.wa); if (!v.wa) return gagal(400, "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)");
  if (v.telepon_kantor && !/^[0-9+ -]{5,20}$/.test(v.telepon_kantor)) return gagal(400, "telepon kantor hanya angka, +, spasi, garis");
  if (!a.surat || !a.kartu) return gagal(409, "unggah surat tugas atau SK dan foto kartu pegawai dulu");
  const r = await env.DB.prepare(`UPDATE instansi_akun SET status = 'menunggu', alasan = NULL, nama = ?, nip = ?, pangkat = ?, jabatan = ?, unit = ?, email = ?, wa = ?, telepon_kantor = ?, dikirim = ?
    WHERE id = ? AND status IN ('belum_klaim', 'ditolak', 'menunggu')`).bind(v.nama, v.nip, v.pangkat, v.jabatan, v.unit, v.email, v.wa, v.telepon_kantor, kini, a.id).run();
  return r.meta.changes ? json({status: "menunggu"}, 201) : gagal(409, "status akun berubah; muat ulang");
}
/* dokumen: surat tugas/SK (PDF atau JPEG) dan kartu pegawai (JPEG). R2 instansi/dok/<akun>/<jenis>. EXIF dibuang dari JPEG. */
const jenisDok = b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d ? "application/pdf" : jenisBerkas(b) === "image/jpeg" ? "image/jpeg" : null;
/* Content-Length wajib pada unggahan (411 bila kosong atau 0): batas laju dan ukuran ditegakkan SEBELUM body dibaca */
const tanpaPanjang = req => Number(req.headers.get("content-length")) > 0 ? null : gagal(411, "Content-Length wajib pada unggahan");
async function unggahDok(env, req, kini, jenis) {
  const a = await akunMasuk(env, req, kini); if (a instanceof Response) return a;
  if (!BOLEH_VERIFIKASI.includes(a.status)) return gagal(409, "dokumen tidak bisa diubah pada status akun ini");
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum aktif (R2 MEDIA)");
  const l = await laju(env, a.id, "instansi.unggah", [[JAM, 20]], kini); if (l) return l;   // sebelum membaca body: penolakan ikut terhitung
  const n = tanpaPanjang(req); if (n) return n;
  const u = await bacaBytes(req, MAKS_DOK); if (u.galat) return gagal(u.status || 400, u.galat);
  let b = u.b; const mime = jenisDok(b);   // jenis dari byte awal, bukan Content-Type
  if (!mime || (jenis === "kartu" && mime !== "image/jpeg")) return gagal(400, jenis === "kartu" ? "foto kartu pegawai harus JPEG" : "surat tugas harus PDF atau JPEG");
  if (mime === "image/jpeg") { b = bersihMedia(mime, b); if (!b) return gagal(400, "struktur JPEG tidak sah atau tidak lengkap"); }   // EXIF/XMP/ICC dibuang, data sesudah EOI dipotong
  const kunci = `instansi/dok/${a.id}/${jenis}`;
  await env.MEDIA.put(kunci, b, {httpMetadata: {contentType: mime}});
  try { await env.DB.prepare(`UPDATE instansi_akun SET ${jenis} = 1 WHERE id = ?`).bind(a.id).run(); } catch (e) { await env.MEDIA.delete(kunci); throw e; }
  return json({[jenis]: true, jenis: mime});
}
/* berkas dari R2 ke peramban: private, no-store, disandbox total (tanpa skrip), PDF diunduh bukan dibuka inline */
const SANDBOX = "sandbox; default-src 'none'";
async function kirimBerkas(env, kunci) {
  const o = env.MEDIA ? await env.MEDIA.get(kunci) : null, tipe = o?.httpMetadata?.contentType || "application/octet-stream";
  return o ? new Response(o.body, {headers: {"content-type": tipe, "cache-control": "private, no-store", ...aman, "content-security-policy": SANDBOX, "content-disposition": tipe === "application/pdf" ? 'attachment; filename="berkas.pdf"' : "inline"}}) : gagal(404, "berkas tidak ada");
}

/* ================================================================ tugas: lingkup, tenggat */
/* baris dummy hanya terlihat akun dummy (akun nyata tidak pernah melihat atau menyentuh data contoh) */
const SQL_DUMMY = a => a.dummy ? "1" : "t.dummy = 0";
const lingkupSql = a => a.tingkat === "kab" ? [`t.prov = ? AND lower(t.kab) = lower(?) AND ${SQL_DUMMY(a)}`, [a.prov, a.kab]] : [`t.prov IN (SELECT value FROM json_each(?)) AND ${SQL_DUMMY(a)}`, [a.cakupan]];
export const dalamLingkup = (a, t) => (a.dummy || !t.dummy) && (a.tingkat === "kab" ? t.prov === a.prov && String(t.kab).toLowerCase() === String(a.kab).toLowerCase() : JSON.parse(a.cakupan).includes(t.prov));
/* murni: tenggat berikutnya dan terlambat; tugas selesai (padam/bukan_api) tidak pernah terlambat */
/* durasi untuk teks buatan Worker; SAMA dengan fmt.durasi di public/inti/format.js (dijaga tests/warga/staf_halaman.test.mjs): "45 menit", "6 jam 24 menit", "1 hari 10 jam" */
export const durasi = ms => { const m = Math.max(1, Math.round(Math.abs(ms) / 6e4)), j = Math.floor(m / 60), d = Math.floor(j / 24); return d ? `${d} hari${j % 24 ? ` ${j % 24} jam` : ""}` : j ? `${j} jam${m % 60 ? ` ${m % 60} menit` : ""}` : `${m} menit`; };
/* ciri yang membedakan dua tugas serupa di satu kabupaten: koordinat, luas satelit, dan jam terdeteksi terakhir (kecamatan terdekat sudah ada di t.kec) */
const koord = (v, hemi) => `${Math.abs(v).toLocaleString("id-ID", {minimumFractionDigits: 3, maximumFractionDigits: 3})}° ${hemi}`;
export const ciriTugas = t => [`${koord(t.lat, t.lat < 0 ? "LS" : "LU")}, ${koord(t.lon, "BT")}`, t.luas_ha != null ? `luas satelit ${Math.round(t.luas_ha).toLocaleString("id-ID")} ha` : null,
  `terdeteksi ${new Date(t.terakhir_terdeteksi).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "")} WIB`].filter(Boolean).join(", ");
export function tenggat(t, kini) {
  if (t.status !== "buka") return {tenggat: null, terlambat: false, langkah: null};
  const konfirmasi = t.konfirmasi_pada == null, batas = konfirmasi ? t.dibuat + TENGGAT_KONFIRMASI : (t.isian_terakhir ?? t.konfirmasi_pada) + TENGGAT_KABAR;
  return {tenggat: batas, terlambat: kini > batas, langkah: konfirmasi ? "konfirmasi" : "kabar"};
}
export const jsonAman = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
const KOLOM_TUGAS = `t.id, t.prov, t.kab, t.kec, t.lat, t.lon, t.level, t.n24, t.luas_ha, t.dibuat, t.terakhir_terdeteksi, t.status, t.konfirmasi_pada, t.isian_terakhir, t.rekomendasi, t.akses, t.padam_verif, t.padam_pada, t.verif_pada, t.cek_ulang_pada, t.dummy,
  (SELECT hasil FROM tugas_isian WHERE tugas_id = t.id AND langkah = 'konfirmasi') hasil_konfirmasi,
  (SELECT min(m.waktu_ambil) FROM instansi_media m JOIN tugas_isian i ON i.id = m.isian_id WHERE i.tugas_id = t.id AND ((i.langkah = 'konfirmasi' AND i.hasil = 'api_ada') OR i.status_api IN ('menyala', 'bara'))) mulai_doc,
  (SELECT min(m.waktu_ambil) FROM instansi_media m WHERE m.isian_id = (SELECT i.id FROM tugas_isian i WHERE i.tugas_id = t.id AND (i.status_api = 'padam' OR (i.langkah = 'konfirmasi' AND i.hasil = 'sudah_padam')) ORDER BY i.dibuat LIMIT 1)) padam_doc,
  (SELECT min(mulai_padam) FROM tugas_isian WHERE tugas_id = t.id) mulai_manual,
  (SELECT luas_ha FROM tugas_isian WHERE tugas_id = t.id AND luas_ha IS NOT NULL ORDER BY dibuat DESC LIMIT 1) luas_konf,
  (SELECT json_object('dibuat', i.dibuat, 'status_api', i.status_api, 'regu', i.regu, 'personel', i.personel, 'personel_terlihat', i.personel_terlihat, 'personel_unsur', json(i.personel_unsur), 'alat', json(i.alat_dipakai))
     FROM tugas_isian i WHERE i.tugas_id = t.id AND i.langkah = 'tindakan' ORDER BY i.dibuat DESC LIMIT 1) sekarang`;
/* ===== kebutuhan (rekomendasi.kebutuhan dari pipeline). Angka boleh tunggal atau [rendah, tengah, tinggi]; yang dipakai membandingkan = nilai tengah. =====
   Bentuk: {target_hari, dasar:{luas_ha:[3]}, per_ha:{regu_hari, personel_hari, air_l, bbm_l, pompa_unit_hari}, total:{regu, personel, pompa:[{kelas,hp,unit:[3]}], selang_m, bor, heli, jet_shooter, ...}, hari_provinsi, energi, melampaui_rujukan_lapangan}.
   Luas terkonfirmasi = luas_ha isian terbaru yang mengisinya (konfirmasi atau kabar). Tanpa luas terkonfirmasi tidak ada kebutuhan berbasis luas dan tidak ada pil "kurang". */
const tengah = v => { const m = Array.isArray(v) ? (v.length === 3 ? v[1] : v[0]) : v; return typeof m === "number" && Number.isFinite(m) ? m : null; };
const kali = (v, f) => Array.isArray(v) ? (v.every(x => typeof x === "number" && Number.isFinite(x)) ? v.map(x => x * f) : null) : typeof v === "number" && Number.isFinite(v) ? v * f : null;
/* murni: per_ha x luas terkonfirmasi, per kunci (rentang dipertahankan). null bila tanpa luas atau tanpa per_ha. */
export function kebutuhanTerkonfirmasi(rek, luas) {
  const ph = rek?.kebutuhan?.per_ha;
  if (!(luas > 0) || !ph || typeof ph !== "object") return null;
  const x = {}; for (const [k, v] of Object.entries(ph)) { if (k === "personel_hari_rujukan") continue; const h = kali(v, luas); if (h != null) x[k] = h; }
  return Object.keys(x).length ? {luas_ha: luas, per_ha_x_luas: x} : null;
}
/* kunci kebutuhan (total, diskalakan ke luas terkonfirmasi) -> nilai di lapangan. [kunci, ambil dari total, ambil dari lapangan, satuan] */
const SELARAS = [["regu", t => tengah(t.regu), s => s.regu, "regu"], ["personel", t => tengah(t.personel), s => s.personel ?? s.personel_terlihat, "personel"],
  ["pompa", t => Array.isArray(t.pompa) ? t.pompa.reduce((a, p) => a + (tengah(p?.unit) ?? 0), 0) : tengah(t.pompa), s => s.alat?.pompa, "pompa"],
  ["jet_shooter", t => tengah(t.jet_shooter), s => s.alat?.jet_shooter, "jet shooter"], ["heli", t => tengah(t.heli), s => s.alat?.heli_wb, "heli"], ["selang_m", t => tengah(t.selang_m), s => s.alat?.selang_m, "m selang"]];
/* murni: hanya bila ADA luas terkonfirmasi, ADA kabar terakhir, dan hitungan satelit punya luas dasar. Kebutuhan total satelit diskalakan luas_terkonfirmasi / luas_satelit,
   lalu dibandingkan dengan yang ada di lapangan. Kembalian: [{kunci, perlu, ada, kurang, teks: "kurang 2 regu"}] */
export function kekurangan(rek, s, luas) {
  const k = rek?.kebutuhan, t = k?.total, dasar = tengah(k?.dasar?.luas_ha);
  if (!k || !t || typeof t !== "object" || !s || !(luas > 0) || !(dasar > 0)) return [];
  const rasio = luas / dasar, out = [];
  for (const [kunci, total, ambil, satuan] of SELARAS) {
    const tt = total(t); if (tt == null) continue;
    const perlu = Math.ceil(tt * rasio), ada = Number(ambil(s) ?? 0), kurang = perlu - ada;
    if (kurang > 0) out.push({kunci, perlu, ada, kurang, teks: `kurang ${kurang} ${satuan}`});
  }
  return out;
}
/* ===== verifikasi padam ("sudah padam belum?"). Status tugas tetap 'padam'; padam_verif menandai hasil pemeriksaan satelit sesudahnya.
   Label jujur: satelit tidak melihat bara bawah permukaan (gambut), jadi "terverifikasi" bukan jaminan padam total. ===== */
const RADIUS_PADAM_KM = 2, JAM_PADAM_AMAN = 24, JAM_PADAM_VERIF = 48, UMUR_PERIKSA_PADAM = 7 * HARI;
export function infoPadam(t, kini) {
  if (!t.padam_verif) return null;
  const jam = t.padam_pada == null ? 0 : (kini - t.padam_pada) / JAM, ulang = t.cek_ulang_pada != null;
  const L = {padam_terverifikasi: ["hijau", "Padam terverifikasi: tidak terdeteksi satelit 48 jam. Bara bawah permukaan tetap mungkin, cek ulang lapangan."],
    muncul_lagi: ["merah", `Api muncul lagi: ada titik panas baru dalam ${RADIUS_PADAM_KM} km sesudah dilaporkan padam. Tugas dibuka kembali.`],
    padam_dilaporkan: jam >= JAM_PADAM_AMAN ? ["emas", "Padam, belum ada titik baru 24 jam. Menunggu 48 jam untuk verifikasi satelit."] : ["emas", "Padam dilaporkan. Satelit diperiksa tiap 3 jam, belum ada titik baru."]}[t.padam_verif];
  return {status: t.padam_verif, tingkat: L[0], label: L[1], pada: t.padam_pada, verif_pada: t.verif_pada, cek_ulang: ulang, cek_ulang_pada: t.cek_ulang_pada,
    boleh_cek_ulang: t.status === "padam" && !ulang && t.padam_verif !== "muncul_lagi"};
}
const bentukTugas = (t, kini) => {
  const {sekarang, mulai_doc, padam_doc, mulai_manual, luas_konf, ...x} = t, rek = jsonAman(t.rekomendasi), s = jsonAman(sekarang);
  return {...x, rekomendasi: rek, akses: jsonAman(t.akses), padam: infoPadam(t, kini), ciri: ciriTugas(t), ...tenggat(t, kini),
    sekarang: s && {...s, personel_efektif: s.personel ?? s.personel_terlihat ?? null}, luas_terkonfirmasi: luas_konf, kebutuhan_konf: kebutuhanTerkonfirmasi(rek, luas_konf), kurang: kekurangan(rek, s, luas_konf),
    /* "terdokumentasi" = waktu FOTO/VIDEO, bukan jam mulai atau padam yang sebenarnya */
    dokumentasi: {mulai: mulai_doc, padam: padam_doc, durasi_ms: mulai_doc != null && padam_doc != null && padam_doc >= mulai_doc ? padam_doc - mulai_doc : null, mulai_manual}};
};
const urutTugas = (x, y) => (y.terlambat - x.terlambat) || (y.dibuat - x.dibuat);

async function daftarTugas(env, req, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const [w, p] = lingkupSql(a);
  const r = (await env.DB.prepare(`SELECT ${KOLOM_TUGAS} FROM tugas_api t WHERE ${w} AND (t.status = 'buka' OR t.dibuat > ?) ORDER BY t.dibuat DESC LIMIT 300`).bind(...p, kini - 3 * HARI).all()).results;
  /* PIC lapangan terakhir akun ini per kabupaten (terisi otomatis di konfirmasi berikutnya); WhatsApp milik akun itu sendiri */
  const pic = {}; for (const x of (await env.DB.prepare(`SELECT t.prov, lower(t.kab) kab, i.pic_nama, i.pic_jabatan, i.pic_wa, max(i.dibuat) waktu FROM tugas_isian i JOIN tugas_api t ON t.id = i.tugas_id
    WHERE i.akun_id = ? AND i.langkah = 'konfirmasi' GROUP BY t.prov, lower(t.kab)`).bind(a.id).all()).results) pic[`${x.prov}|${x.kab}`] = {nama: x.pic_nama, jabatan: x.pic_jabatan, wa: x.pic_wa};
  return json({kini, tugas: r.map(t => bentukTugas(t, kini)).sort(urutTugas), batas: {konfirmasi_jam: 6, kabar_jam: 24}, pic_kab: pic});
}
/* tugas di lingkup akun, atau 404: "tidak ada" dan "di luar wilayah" dijawab sama (tidak membocorkan id yang ada) */
export async function tugasDalam(env, a, id) {
  const t = await env.DB.prepare(`SELECT ${KOLOM_TUGAS} FROM tugas_api t WHERE t.id = ?`).bind(id).first();
  return t && dalamLingkup(a, t) ? t : gagal(404, "tugas tidak ada");
}
const bentukIsian = (x, admin) => ({id: x.id, langkah: x.langkah, dibuat: x.dibuat, oleh: {username: x.username, jenis: x.jenis, wilayah: x.wilayah}, lat: x.lat, lon: x.lon, akurasi: x.akurasi,
  jarak_km: x.jarak_km, jauh: x.jarak_km != null && x.jarak_km > JAUH_KM, gps_curiga: x.gps_curiga, hasil: x.hasil, pic_nama: x.pic_nama, pic_jabatan: x.pic_jabatan,
  ...(admin ? {pic_wa: x.pic_wa} : {}), tindakan: x.tindakan, kendala: jsonAman(x.kendala) ?? [], kendala_lain: x.kendala_lain, bantuan: jsonAman(x.bantuan) ?? [], bantuan_lain: x.bantuan_lain,
  personel: x.personel, personel_terlihat: x.personel_terlihat, personel_efektif: x.personel ?? x.personel_terlihat ?? null, personel_unsur: jsonAman(x.personel_unsur), regu: x.regu, alat_dipakai: jsonAman(x.alat_dipakai), mulai_padam: x.mulai_padam,
  luas_ha: x.luas_ha, padam_ha: x.padam_ha, status_api: x.status_api, kedalaman_bara_cm: x.kedalaman_bara_cm, lahan_teramati: x.lahan_teramati, dummy: x.dummy});
const SQL_ISIAN = `SELECT i.*, a.username, a.jenis, a.wilayah FROM tugas_isian i JOIN instansi_akun a ON a.id = i.akun_id WHERE i.tugas_id = ? ORDER BY i.dibuat`;
/* "terverifikasi" seperti layar foto publik (src/foto.js): kamera = diambil langsung lewat kamera, waktu = EXIF waktu terbaca, gps = EXIF GPS terbaca dan cocok dengan GPS perangkat (server menolak yang > 5 km) */
const bentukMedia = (m, lihatKoordinat = true) => ({id: m.id, isian_id: m.isian_id, jenis: m.jenis, durasi: m.durasi, waktu_ambil: m.waktu_ambil, sumber_waktu: m.sumber_waktu, exif_jarak: m.exif_jarak, jarak_km: m.jarak_km,
  exif_waktu: m.exif_waktu, exif_lat: lihatKoordinat ? m.exif_lat : null, exif_lon: lihatKoordinat ? m.exif_lon : null, exif_api_km: m.exif_api_km, kamera: !!m.kamera, terverifikasi: {kamera: !!m.kamera, waktu: m.exif_waktu != null, gps: m.exif_lat != null},   // koordinat EXIF hanya ke pengunggah, admin, dan staf; akun lain cukup jarak ke api dan tanda ini
 
  jauh: m.jarak_km != null && m.jarak_km > JAUH_KM, gps_curiga: m.gps_curiga, orang_terdeteksi: m.orang_terdeteksi, orang_sumber: m.orang_sumber, orang_bingkai: jsonAman(m.orang_bingkai), dummy: m.dummy});
const SQL_MEDIA = "SELECT id, akun_id, isian_id, jenis, durasi, waktu_ambil, sumber_waktu, exif_jarak, exif_waktu, exif_lat, exif_lon, exif_api_km, kamera, jarak_km, gps_curiga, orang_terdeteksi, orang_sumber, orang_bingkai, dummy FROM instansi_media WHERE tugas_id = ? AND isian_id IS NOT NULL ORDER BY waktu_ambil";
async function rincianTugas(env, req, id, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const t = await tugasDalam(env, a, id); if (t instanceof Response) return t;
  return json({tugas: bentukTugas(t, kini), isian: (await env.DB.prepare(SQL_ISIAN).bind(id).all()).results.map(x => bentukIsian(x, false)), media: (await env.DB.prepare(SQL_MEDIA).bind(id).all()).results.map(m => bentukMedia(m, m.akun_id === a.id)),
    gudang_terdekat: await gudangTerdekat(env, t, {provs: [t.prov], akunId: a.id})});   // null bila migrasi 0031 belum diterapkan
}

/* ================================================================ isian: GPS, konfirmasi, kabar */
const kunciIdem = s => typeof s === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(s);
const daftarKode = (v, boleh, maks) => v == null ? [] : Array.isArray(v) && v.length <= maks && v.every(x => typeof x === "string" && Object.hasOwn(boleh, x)) && new Set(v).size === v.length ? v : null;
/* aturan GPS perangkat sama dengan foto warga (src/foto.js) dan lapor regu (src/posko.js): bacaan <= 10 menit, akurasi <= 1000 m, nilaiGps untuk tolak/curiga */
async function periksaGps(env, req, o, t, a, kini) {
  const lat = num(o.lat, BBOX.latMin, BBOX.latMaks), lon = num(o.lon, BBOX.lonMin, BBOX.lonMaks), akurasi = num(o.akurasi, 0, 1000), waktu = num(o.waktu_gps, kini - GPS_UMUR_MAKS, kini + MENIT);
  if (lat == null || lon == null || akurasi == null || waktu == null || [lat, lon, akurasi, waktu].some(Number.isNaN))
    return gagal(400, "lokasi GPS perangkat wajib di dalam Indonesia: lat, lon, akurasi maksimal 1000 m, waktu_gps maksimal 6 jam lalu");
  const sebelum = await env.DB.prepare("SELECT lat, lon, dibuat FROM instansi_media WHERE akun_id = ? AND dibuat > ? AND dummy = 0 ORDER BY dibuat DESC LIMIT 1").bind(a.id, kini - HARI).first();
  const g = nilaiGps({negara: req.cf?.country, hosting: jaringanHosting(req.cf), relay: jaringanRelay(req.cf), zona: tx(o.zona, 40), prov: t.prov, lat, lon, waktuGps: waktu,
    sampel: Array.isArray(o.sampel) ? JSON.stringify(o.sampel) : o.sampel, sebelum: sebelum && {...sebelum, lewat: "akun"}, kini});
  if (g.tolak) return gagal(400, g.tolak);
  return {lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5, akurasi: Math.round(akurasi), waktu_gps: waktu, jarak_km: Math.round(km(lat, lon, t.lat, t.lon) * 10) / 10,
    gps_curiga: g.curiga.length ? g.curiga.join("; ").slice(0, 600) : null};
}
/* kolom opsional gambut (data kalibrasi estimasi kedalaman bara satelit): dipakai konfirmasi dan kabar */
function bacaGambut(o) {
  const cm = num(o.kedalaman_bara_cm, 0, 300, true);
  if (Number.isNaN(cm)) return {g: "kedalaman bara terukur harus bilangan bulat 0-300 cm"};
  if (o.lahan_teramati != null && o.lahan_teramati !== "" && !LAHAN.includes(o.lahan_teramati)) return {g: `lahan teramati harus ${LAHAN.join("/")}`};
  return {kedalaman_bara_cm: cm, lahan_teramati: o.lahan_teramati || null};
}
/* personel per unsur, regu, alat, dan waktu mulai padam (opsional di konfirmasi dan kabar). Total personel = jumlah unsur, dihitung SERVER dan menggantikan `personel`. */
function bacaPemadaman(o, kini) {
  const out = {mulai_padam: null, regu: null, personel_unsur: null, alat_dipakai: null, personel: undefined};
  const obj = (v, kunci, maks, nama) => {
    if (v == null) return null;
    if (typeof v !== "object" || Array.isArray(v)) return {g: `${nama} harus objek`};
    const x = {};
    for (const [k, n] of Object.entries(v)) {
      if (!kunci.includes(k)) return {g: `${nama}: kunci '${String(k).slice(0, 30)}' tidak dikenal (boleh: ${kunci.join(", ")})`};
      const m = num(n, 0, maks, true); if (m == null || Number.isNaN(m)) return {g: `${nama}.${k} harus bilangan bulat 0-${maks}`};
      x[k] = m;
    }
    return {x};
  };
  const u = obj(o.personel_unsur, UNSUR, 5000, "personel_unsur"); if (u?.g) return u;
  const al = obj(o.alat_dipakai, ALAT, 100000, "alat_dipakai"); if (al?.g) return al;
  const regu = num(o.regu, 0, 500, true), mulai = num(o.mulai_padam, kini - 7 * HARI, kini + 5 * MENIT, true);
  if (Number.isNaN(regu)) return {g: "regu harus bilangan bulat 0-500"};
  if (Number.isNaN(mulai)) return {g: "mulai_padam harus waktu (ms) dalam 7 hari terakhir sampai sekarang"};
  if (u) { const total = Object.values(u.x).reduce((a, b) => a + b, 0); if (total > 5000) return {g: `total personel ${total} melebihi 5000`}; out.personel_unsur = JSON.stringify(u.x); out.personel = total; }
  if (al) out.alat_dipakai = JSON.stringify(al.x);
  out.regu = regu; out.mulai_padam = mulai;
  return out;
}
const kolomPemadaman = pd => ({mulai_padam: pd.mulai_padam, regu: pd.regu, personel_unsur: pd.personel_unsur, alat_dipakai: pd.alat_dipakai});
/* INSERT ... SELECT ... WHERE syarat: baris hanya masuk bila syarat (keadaan tugas) masih berlaku saat batch jalan */
const sisipIsian = (env, kol, syarat, ikat) => {
  const k = Object.keys(kol);
  return env.DB.prepare(`INSERT INTO tugas_isian (${k.join(", ")}) SELECT ${k.map(() => "?").join(", ")} WHERE ${syarat}`).bind(...Object.values(kol), ...ikat);
};
const slugPT = n => "manual-" + String(n).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
/* usulan PIC perusahaan (kolom body: perusahaan_id?, nama_pt, kontak, jabatan, wa, email, telepon, catatan). Tanpa perusahaan_id (PT diisi manual) id dibuat dari nama. */
function cekUsulan(o) {
  const nama = tx(o.nama_pt, 120); if (!nama || nama.length < 2) return {galat: "nama perusahaan konsesi 2-120 karakter"};
  const pid = tx(o.perusahaan_id, 80) || slugPT(nama), kontak = tx(o.kontak, 80), jab = tx(o.jabatan, 60);
  if (kontak === undefined || jab === undefined) return {galat: "nama PIC maksimal 80 dan jabatan maksimal 60 karakter"};
  const c = cekKontak({perusahaan_id: pid, nama_pt: nama, kontak: kontak && jab ? `${kontak} (${jab})`.slice(0, 80) : kontak || jab, email: o.email, wa: o.wa, telepon: o.telepon, catatan: o.catatan});
  return c.galat ? {galat: "kontak perusahaan: " + c.galat} : c;
}
const stmtUsulan = (env, akunId, tugasId, v, kini, syarat = "1", ikat = []) => env.DB.prepare(`INSERT INTO usulan_kontak_pt (id, akun_id, tugas_id, perusahaan_id, nama_pt, kontak, email, wa, telepon, catatan, dibuat)
  SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${syarat}`).bind(acak(8), akunId, tugasId, v.perusahaan_id, v.nama_pt, v.kontak, v.email, v.wa, v.telepon, v.catatan, kini, ...ikat);

/* media yang dirujuk isian: milik akun ini, untuk tugas ini, belum dipakai isian lain. GPS isian diturunkan dari media (pertama), jarak = terdekat. */
async function ambilMedia(env, a, tugasId, o, min) {
  const ids = o.media ?? [];
  if (!Array.isArray(ids) || ids.length > 10 || !ids.every(x => typeof x === "string" && /^[0-9a-f]{16}$/.test(x)) || new Set(ids).size !== ids.length) return gagal(400, "media harus larik 1-10 id berkas (maksimal 10, tanpa ganda)");
  if (ids.length < min) return gagal(400, "unggah minimal satu foto atau video di lokasi dulu (rute /api/instansi/media), lalu rujuk id-nya di media");
  if (!ids.length) return {ids, M: [], g: {}, terlihat: null};
  const M = (await env.DB.prepare("SELECT id, lat, lon, akurasi, waktu_gps, jarak_km, gps_curiga, orang_terdeteksi FROM instansi_media WHERE akun_id = ? AND tugas_id = ? AND isian_id IS NULL AND id IN (SELECT value FROM json_each(?)) ORDER BY waktu_ambil, id")
    .bind(a.id, tugasId, JSON.stringify(ids)).all()).results;
  if (M.length !== ids.length) return gagal(400, "media tidak ditemukan, sudah dipakai isian lain, atau bukan milik Anda untuk tugas ini");
  const curiga = [...new Set(M.map(m => m.gps_curiga).filter(Boolean))].join("; ").slice(0, 600), ada = M.map(m => m.orang_terdeteksi).filter(n => n != null), jr = M.map(m => m.jarak_km).filter(x => x != null);
  return {ids, M, g: {lat: M[0].lat, lon: M[0].lon, akurasi: M[0].akurasi, waktu_gps: M[0].waktu_gps, jarak_km: jr.length ? Math.min(...jr) : null, gps_curiga: curiga || null},
    terlihat: ada.length ? Math.max(...ada) : null};   // MAKSIMUM per berkas, bukan jumlah: orang yang sama bisa muncul di beberapa foto
}
const SYARAT_MEDIA = "(SELECT count(*) FROM instansi_media WHERE isian_id IS NULL AND akun_id = ? AND tugas_id = ? AND id IN (SELECT value FROM json_each(?))) = ?";
/* pernyataan sesudah isian masuk: rujuk media ke isian, hitung personel_terlihat (maksimum) */
const ikatMedia = (env, iid, a, tugasId, ids) => [
  env.DB.prepare("UPDATE instansi_media SET isian_id = ?1 WHERE akun_id = ?2 AND tugas_id = ?3 AND isian_id IS NULL AND id IN (SELECT value FROM json_each(?4)) AND EXISTS (SELECT 1 FROM tugas_isian WHERE id = ?1)").bind(iid, a.id, tugasId, JSON.stringify(ids)),
  env.DB.prepare("UPDATE tugas_isian SET personel_terlihat = (SELECT max(orang_terdeteksi) FROM instansi_media WHERE isian_id = ?1) WHERE id = ?1").bind(iid)];

/* dilaporkan padam (?2 = 'padam'): verifikasi satelit dimulai dari waktu laporan (?1); keadaan lain tidak menyentuh kolomnya */
const SET_PADAM = `padam_verif = CASE WHEN ?2 = 'padam' THEN 'padam_dilaporkan' ELSE padam_verif END, padam_pada = CASE WHEN ?2 = 'padam' THEN ?1 ELSE padam_pada END,
  verif_pada = CASE WHEN ?2 = 'padam' THEN ?1 ELSE verif_pada END, cek_ulang_pada = CASE WHEN ?2 = 'padam' THEN NULL ELSE cek_ulang_pada END`;
async function konfirmasi(env, req, id, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const t = await tugasDalam(env, a, id); if (t instanceof Response) return t;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (!kunciIdem(o.klien_id)) return gagal(400, "klien_id wajib: 8-40 huruf/angka/garis (kunci kirim ulang)");
  const ulang = await env.DB.prepare("SELECT id FROM tugas_isian WHERE akun_id = ? AND klien_id = ? AND tugas_id = ?").bind(a.id, o.klien_id, id).first(); if (ulang) return json({id: ulang.id, ulang: true});
  if (t.status !== "buka") return gagal(409, "tugas ini sudah ditutup");
  if (t.konfirmasi_pada != null) return gagal(409, "tugas ini sudah dikonfirmasi; isi kabar tindakan");
  if (!HASIL.includes(o.hasil)) return gagal(400, `hasil harus ${HASIL.join("/")}`);
  const pic = {nama: isian(o.pic_nama, 2, 80, "nama PIC lapangan"), jabatan: isian(o.pic_jabatan, 2, 80, "jabatan atau instansi PIC lapangan"), wa: isian(o.pic_wa, 8, 30, "nomor WhatsApp PIC lapangan")};
  for (const x of Object.values(pic)) if (x.g) return gagal(400, x.g);
  const nomor = normalWA(pic.wa.v); if (!nomor) return gagal(400, "nomor WhatsApp PIC lapangan tidak sah (contoh 0812xxxxxxx)");
  const gb = bacaGambut(o); if (gb.g) return gagal(400, gb.g);
  if (o.status_api != null && !(["menyala", "bara"].includes(o.status_api) && o.hasil === "api_ada")) return gagal(400, "status_api di konfirmasi hanya menyala atau bara, dan hanya bila api ada");
  const pd = bacaPemadaman(o, kini); if (pd.g) return gagal(400, pd.g);
  const luasK = num(o.luas_ha, 0, 100000), padamK = num(o.padam_ha, 0, 100000);
  if ([luasK, padamK].some(Number.isNaN)) return gagal(400, "luas dan padam 0-100000 ha");
  if (padamK != null && luasK != null && padamK > luasK) return gagal(400, "luas padam tidak boleh melebihi luas terbakar");
  let usul = null; if (o.pt != null) { if (typeof o.pt !== "object" || Array.isArray(o.pt)) return gagal(400, "pt harus objek"); const c = cekUsulan(o.pt); if (c.galat) return gagal(400, c.galat); usul = c.v; }
  const md = await ambilMedia(env, a, id, o, 1); if (md instanceof Response) return md;   // konfirmasi wajib berfoto atau bervideo
  const l = await laju(env, a.id, "instansi.isi", [[JAM, 60]], kini); if (l) return l;
  const iid = acak(8), selesai = o.hasil === "bukan_api" ? "bukan_api" : o.hasil === "sudah_padam" ? "padam" : "buka";
  let hasil;
  try {
    hasil = await env.DB.batch([
      sisipIsian(env, {id: iid, tugas_id: id, akun_id: a.id, klien_id: o.klien_id, langkah: "konfirmasi", dibuat: kini, ...md.g, hasil: o.hasil, pic_nama: pic.nama.v, pic_jabatan: pic.jabatan.v, pic_wa: nomor, ...gb, ...kolomPemadaman(pd), personel: pd.personel ?? null, luas_ha: luasK, padam_ha: padamK, status_api: o.status_api ?? null},
        `EXISTS (SELECT 1 FROM tugas_api WHERE id = ? AND status = 'buka' AND konfirmasi_pada IS NULL) AND ${SYARAT_MEDIA}`, [id, a.id, id, JSON.stringify(md.ids), md.ids.length]),
      env.DB.prepare(`UPDATE tugas_api SET konfirmasi_pada = ?1, isian_terakhir = ?1, status = ?2, ${SET_PADAM} WHERE id = ?3 AND EXISTS (SELECT 1 FROM tugas_isian WHERE id = ?4)`).bind(kini, selesai, id, iid),
      ...ikatMedia(env, iid, a, id, md.ids),
      ...(usul ? [stmtUsulan(env, a.id, id, usul, kini, "EXISTS (SELECT 1 FROM tugas_isian WHERE id = ?)", [iid])] : [])]);
  } catch (e) { if (/UNIQUE/i.test(String(e.message || e))) return gagal(409, "tugas ini baru saja dikonfirmasi akun lain"); throw e; }
  if (!hasil[0].meta.changes) return gagal(409, "tugas sudah dikonfirmasi atau ditutup, atau media sudah dipakai isian lain");
  return json({id: iid, status: selesai, jarak_km: md.g.jarak_km, jauh: md.g.jarak_km > JAUH_KM, personel_terlihat: md.terlihat}, 201);
}
async function kabar(env, req, id, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const t = await tugasDalam(env, a, id); if (t instanceof Response) return t;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (!kunciIdem(o.klien_id)) return gagal(400, "klien_id wajib: 8-40 huruf/angka/garis (kunci kirim ulang)");
  const ulang = await env.DB.prepare("SELECT id FROM tugas_isian WHERE akun_id = ? AND klien_id = ? AND tugas_id = ?").bind(a.id, o.klien_id, id).first(); if (ulang) return json({id: ulang.id, ulang: true});
  if (t.status !== "buka") return gagal(409, "tugas ini sudah ditutup");
  if (t.hasil_konfirmasi !== "api_ada") return gagal(409, "konfirmasi dulu bahwa api ada di lokasi sebelum mengisi kabar tindakan");
  const tindakan = isian(o.tindakan, 2, 1000, "tindakan yang dilakukan", false); if (tindakan.g) return gagal(400, tindakan.g);
  const kendala = daftarKode(o.kendala, KENDALA, 6), bantuan = daftarKode(o.bantuan, BANTUAN, 7);
  if (!kendala) return gagal(400, `kendala harus larik dari: ${Object.keys(KENDALA).join(", ")}`);
  if (!bantuan) return gagal(400, `bantuan harus larik dari: ${Object.keys(BANTUAN).join(", ")}`);
  const kl = isian(o.kendala_lain, 1, 300, "kendala lain", false), bl = isian(o.bantuan_lain, 1, 300, "bantuan lain", false);
  if (kl.g || bl.g) return gagal(400, kl.g || bl.g);
  if (!STATUS_API.includes(o.status_api)) return gagal(400, `status_api harus ${STATUS_API.join("/")}`);
  const pd = bacaPemadaman(o, kini); if (pd.g) return gagal(400, pd.g);
  const personel = pd.personel ?? num(o.personel, 0, 5000, true), luas = num(o.luas_ha, 0, 100000), padam = num(o.padam_ha, 0, 100000);
  if ([personel, luas, padam].some(Number.isNaN)) return gagal(400, "personel bilangan bulat 0-5000, luas dan padam 0-100000 ha");
  if (padam != null && luas != null && padam > luas) return gagal(400, "luas padam tidak boleh melebihi luas terbakar");
  const gb = bacaGambut(o); if (gb.g) return gagal(400, gb.g);
  const md = await ambilMedia(env, a, id, o, o.status_api === "padam" ? 1 : 0); if (md instanceof Response) return md;   // melaporkan padam wajib minimal satu foto atau video lokasi padam
  /* alat dari inventaris yang dipakai (opsional): milik akun ini dan berstatus siap; jadi dikerahkan ke tugas ini dalam batch yang sama dengan isian */
  const kerahkan = o.alat_inventaris == null ? null : await siapkanKerahkan(env, a, id, o.alat_inventaris); if (kerahkan?.g) return gagal(kerahkan.s, kerahkan.g);
  const l = await laju(env, a.id, "instansi.isi", [[JAM, 60]], kini); if (l) return l;
  const iid = acak(8);
  const hasil = await env.DB.batch([
    sisipIsian(env, {id: iid, tugas_id: id, akun_id: a.id, klien_id: o.klien_id, langkah: "tindakan", dibuat: kini, ...md.g, tindakan: tindakan.v, kendala: JSON.stringify(kendala), kendala_lain: kl.v, bantuan: JSON.stringify(bantuan),
      bantuan_lain: bl.v, personel, luas_ha: luas, padam_ha: padam, status_api: o.status_api, ...gb, ...kolomPemadaman(pd)},
      `EXISTS (SELECT 1 FROM tugas_api WHERE id = ? AND status = 'buka' AND konfirmasi_pada IS NOT NULL) AND ${SYARAT_MEDIA}`, [id, a.id, id, JSON.stringify(md.ids), md.ids.length]),
    env.DB.prepare(`UPDATE tugas_api SET isian_terakhir = ?1, status = CASE WHEN ?2 = 'padam' THEN 'padam' ELSE status END, ${SET_PADAM} WHERE id = ?3 AND EXISTS (SELECT 1 FROM tugas_isian WHERE id = ?4)`).bind(kini, o.status_api, id, iid),
    ...ikatMedia(env, iid, a, id, md.ids), ...(kerahkan ? kerahkan.stmts(kini, "EXISTS (SELECT 1 FROM tugas_isian WHERE id = ?)", [iid]) : [])]);
  if (!hasil[0].meta.changes) return gagal(409, "tugas ini sudah ditutup, atau media sudah dipakai isian lain");
  if (o.status_api === "padam") await lepasDariTugas(env, id, kini);   // alat inventaris pulang siap; galat di sini tidak menggagalkan kabar
  return json({id: iid, status: o.status_api === "padam" ? "padam" : "buka", personel_terlihat: md.terlihat}, 201);
}

/* Cek ulang lapangan (sesudah dilaporkan padam): foto kedua di lokasi menutup pemeriksaan. Berlaku sekali per laporan padam; status tugas tetap 'padam'. */
const SYARAT_CEK_ULANG = "status = 'padam' AND padam_verif IN ('padam_dilaporkan', 'padam_terverifikasi') AND cek_ulang_pada IS NULL";
async function cekUlang(env, req, id, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const t = await tugasDalam(env, a, id); if (t instanceof Response) return t;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (!kunciIdem(o.klien_id)) return gagal(400, "klien_id wajib: 8-40 huruf/angka/garis (kunci kirim ulang)");
  const ulang = await env.DB.prepare("SELECT id FROM tugas_isian WHERE akun_id = ? AND klien_id = ? AND tugas_id = ?").bind(a.id, o.klien_id, id).first(); if (ulang) return json({id: ulang.id, ulang: true});
  if (t.status !== "padam" || !["padam_dilaporkan", "padam_terverifikasi"].includes(t.padam_verif)) return gagal(409, "cek ulang hanya untuk tugas yang dilaporkan padam");
  if (t.cek_ulang_pada != null) return gagal(409, "cek ulang lapangan untuk laporan padam ini sudah dikirim");
  const md = await ambilMedia(env, a, id, o, 1); if (md instanceof Response) return md;   // foto kedua di lokasi wajib
  const l = await laju(env, a.id, "instansi.isi", [[JAM, 60]], kini); if (l) return l;
  const iid = acak(8);
  const hasil = await env.DB.batch([
    sisipIsian(env, {id: iid, tugas_id: id, akun_id: a.id, klien_id: o.klien_id, langkah: "tindakan", dibuat: kini, ...md.g, tindakan: "Cek ulang lapangan: foto kedua di lokasi padam", kendala: "[]", bantuan: "[]", status_api: "padam"},
      `EXISTS (SELECT 1 FROM tugas_api WHERE id = ? AND ${SYARAT_CEK_ULANG}) AND ${SYARAT_MEDIA}`, [id, a.id, id, JSON.stringify(md.ids), md.ids.length]),
    env.DB.prepare("UPDATE tugas_api SET cek_ulang_pada = ?1 WHERE id = ?2 AND cek_ulang_pada IS NULL AND EXISTS (SELECT 1 FROM tugas_isian WHERE id = ?3)").bind(kini, id, iid),
    ...ikatMedia(env, iid, a, id, md.ids)]);
  if (!hasil[0].meta.changes) return gagal(409, "cek ulang sudah dikirim, tugas tidak lagi berstatus padam, atau media sudah dipakai isian lain");
  return json({id: iid, padam_verif: t.padam_verif, cek_ulang_pada: kini}, 201);
}

/* ================================================================ media: foto dan video per berkas, aturan SAMA dengan src/foto.js (ATURAN_MEDIA, jenisBerkas, durasiMP4) */
const MAKS_BINGKAI = 400 * 1024, MODEL_ORANG = "@cf/facebook/detr-resnet-50", SKOR_ORANG = 0.5;
/* murni: urutan sumber waktu = EXIF tervalidasi, lalu waktu GPS perangkat, lalu waktu unggah */
export function waktuMedia({exif, waktuGps, kini}) {
  if (Number.isFinite(exif) && exif <= kini + 10 * MENIT && kini - exif <= ATURAN_MEDIA.exifUmur) return {waktu: Math.min(exif, kini), sumber: "exif"};
  if (Number.isFinite(waktuGps) && waktuGps <= kini + MENIT && kini - waktuGps <= GPS_UMUR_MAKS) return {waktu: waktuGps, sumber: "gps"};
  return {waktu: kini, sumber: "unggah"};
}
/* hitung kotak "person" skor >= 0,5 per bingkai; hasil per berkas = MAKSIMUM bingkai (bukan jumlah). Tanpa binding AI atau semua bingkai gagal: null, tanpa galat. */
export async function hitungOrang(env, bingkai) {
  if (typeof env.AI?.run !== "function" || !bingkai.length) return null;
  const per = [];
  for (const f of bingkai.slice(0, 3)) {
    try { const r = await env.AI.run(MODEL_ORANG, {image: [...f]}); per.push(Array.isArray(r) ? Math.min(1000, r.filter(x => x?.label === "person" && x.score >= SKOR_ORANG).length) : null); }
    catch (e) { per.push(null); }
  }
  const ok = per.filter(n => n != null);
  return ok.length ? {maks: Math.max(...ok), per} : null;
}
/* Plafon hitungan AI global per hari untuk SEMUA akun (satu hitungan per foto atau bingkai): menjaga kuota Workers AI bila banyak akun disalahgunakan. Lewat plafon = hitungan kosong, berkas tetap tersimpan. */
const AI_GLOBAL_HARI = 5000;
const hitungLaju = async (env, kunci, aksi, jendela, kini) => (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > ?").bind(kunci, aksi, kini - jendela).first()).n;
async function unggahMedia(env, req, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum aktif (R2 MEDIA)");
  if (!(req.headers.get("content-type") || "").startsWith("multipart/form-data")) return gagal(400, "kirim sebagai multipart/form-data");
  /* semua batas dicek SEBELUM body dibaca: laju unggah, Content-Length wajib, ukuran total, jatah AI */
  const l = await laju(env, a.id, "instansi.unggah", [[JAM, 40]], kini); if (l) return l;
  const n0 = tanpaPanjang(req); if (n0) return n0;
  const M = ATURAN_MEDIA.maks, pjg = Number(req.headers.get("content-length"));
  if (pjg > M.video + 3 * MAKS_BINGKAI + M.thumb + 65536) return gagal(413, `kiriman ${Math.round(pjg / 1048576)} MB, maksimal ${M.video / 1048576} MB per berkas`);
  const aiBoleh = typeof env.AI?.run === "function" && !await gagalBanyak(env, a.id, "instansi.ai", 120, kini) && await hitungLaju(env, "semua", "instansi.ai.global", HARI, kini) < AI_GLOBAL_HARI;
  let f; try { f = await req.formData(); } catch (e) { return gagal(400, "formulir tidak terbaca"); }
  const v = k => f.get(k), n = k => (v(k) == null || v(k) === "" ? null : Number(v(k)));
  const tid = v("tugas_id"); if (typeof tid !== "string" || !/^[0-9a-f]{16}$/.test(tid)) return gagal(400, "tugas_id wajib");
  const t = await tugasDalam(env, a, tid); if (t instanceof Response) return t;
  if (t.status !== "buka" && !(t.status === "padam" && ["padam_dilaporkan", "padam_terverifikasi"].includes(t.padam_verif) && t.cek_ulang_pada == null)) return gagal(409, "tugas ini sudah ditutup");   // padam yang belum dicek ulang boleh menerima foto kedua
  const media = v("media"), thumb = v("thumb");
  if (!(media instanceof File) || !media.size) return gagal(400, "berkas foto atau video wajib");
  if (!(thumb instanceof File) || !thumb.size) return gagal(400, "thumbnail wajib (dibuat otomatis oleh halaman)");
  if (thumb.size > M.thumb) return gagal(400, `thumbnail ${Math.round(thumb.size / 1024)} KB, maksimal ${M.thumb / 1024} KB`);
  const b = new Uint8Array(await media.arrayBuffer()), tb = new Uint8Array(await thumb.arrayBuffer()), mime = jenisBerkas(b), mimeT = jenisBerkas(tb);   // jenis dari byte awal
  if (!mime) return gagal(400, "berkas bukan foto (JPEG/WebP) atau video (MP4/MOV/WebM)");
  if (mimeT !== "image/webp" && mimeT !== "image/jpeg") return gagal(400, "thumbnail harus WebP/JPEG");
  const jenis = mime.startsWith("video/") ? "video" : "foto";
  if (b.length > M[jenis]) return gagal(413, `${jenis} ${(b.length / 1048576).toFixed(1)} MB, maksimal ${M[jenis] / 1048576} MB`);
  let durasi = null;
  if (jenis === "video") {
    durasi = durasiMP4(b) ?? n("durasi");
    if (!Number.isFinite(durasi) || durasi <= 0) return gagal(400, "durasi video tidak terbaca");
    if (durasi > ATURAN_MEDIA.durasi + .5) return gagal(400, `video ${Math.round(durasi)} detik, maksimal ${ATURAN_MEDIA.durasi} detik`);
  }
  const bingkai = [];
  for (const k of ["bingkai0", "bingkai1", "bingkai2"]) {
    const x = v(k); if (!(x instanceof File) || !x.size) continue;
    if (x.size > MAKS_BINGKAI) return gagal(400, `bingkai ${Math.round(x.size / 1024)} KB, maksimal ${MAKS_BINGKAI / 1024} KB`);
    const u = new Uint8Array(await x.arrayBuffer()), m = jenisBerkas(u); if (m !== "image/jpeg" && m !== "image/webp") return gagal(400, "bingkai harus JPEG/WebP");
    bingkai.push(u);
  }
  /* metadata (EXIF, XMP, ICC, lokasi, komentar) dibuang dari berkas dan thumbnail SEBELUM disimpan; struktur tak biasa ditolak */
  const simpan = bersihMedia(mime, b); if (!simpan) return gagal(400, `struktur ${jenis} tidak sah atau tidak lengkap (berkas rusak atau bukan ${jenis} yang dikenal)`);
  const simpanT = bersihMedia(mimeT, tb); if (!simpanT) return gagal(400, "struktur thumbnail tidak sah");
  const g = await periksaGps(env, req, {lat: v("lat"), lon: v("lon"), akurasi: v("akurasi"), waktu_gps: v("waktu_gps"), sampel: v("sampel"), zona: v("zona")}, t, a, kini); if (g instanceof Response) return g;
  /* EXIF (dibaca peramban dari berkas asli): GPS harus dekat GPS perangkat, waktu harus baru; sama dengan foto.js */
  let exifJarak = null; const eLat = n("exif_lat"), eLon = n("exif_lon"), eT = n("exif_waktu");
  if (Number.isFinite(eLat) && Number.isFinite(eLon)) {
    exifJarak = Math.round(jarakM(g.lat, g.lon, eLat, eLon));
    if (exifJarak > ATURAN_MEDIA.exifJarak) return gagal(400, `berkas diambil ${(exifJarak / 1000).toFixed(1)} km dari posisi Anda sekarang; unggah dari lokasi pengambilan`);
  }
  if (Number.isFinite(eT) && eT <= kini + 10 * MENIT && kini - eT > ATURAN_MEDIA.exifUmur) return gagal(400, `berkas diambil ${Math.round((kini - eT) / HARI)} hari lalu; hanya 48 jam terakhir`);
  const w = waktuMedia({exif: eT, waktuGps: g.waktu_gps, kini});
  /* EXIF yang lolos (<= 5 km dari GPS perangkat, <= 48 jam) disimpan; jarak GPS EXIF ke titik api dihitung, dan lebih dari 5 km ditandai curiga untuk admin (bukan ditolak: lokasi foto ke api bisa wajar bila api luas) */
  const eOk = Number.isFinite(eLat) && Number.isFinite(eLon) && Math.abs(eLat) <= 90 && Math.abs(eLon) <= 180, eApi = eOk ? Math.round(km(eLat, eLon, t.lat, t.lon) * 10) / 10 : null;
  if (eApi != null && eApi > JAUH_KM) g.gps_curiga = [g.gps_curiga, `GPS EXIF foto ${eApi} km dari titik api`].filter(Boolean).join("; ").slice(0, 600);
  const eWaktu = Number.isFinite(eT) && eT <= kini + 10 * MENIT ? Math.round(Math.min(eT, kini)) : null, kamera = v("kamera") === "1" ? 1 : 0;
  /* hitung orang. FOTO: dari thumbnail JPEG yang DISIMPAN server (bukan bingkai kiriman, yang bisa dipalsukan). VIDEO: dari bingkai kiriman peramban; server tak bisa
     mengurai video, jadi angkanya diberi sumber "bingkai_klien" dan layar menyebutnya. Satu hitungan per gambar, dibatasi per akun per jam dan global per hari. */
  let orang = null, sumber = null;
  const kirimAI = jenis === "foto" ? (mimeT === "image/jpeg" ? [simpanT] : []) : bingkai;
  if (aiBoleh && kirimAI.length) {
    await env.DB.batch(kirimAI.flatMap(() => [catatLaju(env, a.id, "instansi.ai", kini), catatLaju(env, "semua", "instansi.ai.global", kini)]));
    orang = await hitungOrang(env, kirimAI).catch(() => null); if (orang) sumber = jenis === "foto" ? "thumbnail" : "bingkai_klien";
  }
  const id = acak(8);
  await env.MEDIA.put(`instansi/media/${id}`, simpan, {httpMetadata: {contentType: mime}});
  await env.MEDIA.put(`instansi/media/${id}_t`, simpanT, {httpMetadata: {contentType: mimeT}});
  try {
    await env.DB.prepare(`INSERT INTO instansi_media (id, akun_id, tugas_id, jenis, mime, ukuran, durasi, waktu_ambil, sumber_waktu, exif_jarak, lat, lon, akurasi, waktu_gps, jarak_km, gps_curiga, orang_terdeteksi, orang_sumber, orang_bingkai, dibuat, exif_waktu, exif_lat, exif_lon, kamera, exif_api_km)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, a.id, tid, jenis, mime, simpan.length, durasi, w.waktu, w.sumber, exifJarak, g.lat, g.lon, g.akurasi, g.waktu_gps, g.jarak_km, g.gps_curiga,
      orang ? orang.maks : null, sumber, orang ? JSON.stringify(orang.per) : null, kini, eWaktu, eOk ? Math.round(eLat * 1e5) / 1e5 : null, eOk ? Math.round(eLon * 1e5) / 1e5 : null, kamera, eApi).run();
  } catch (e) { await env.MEDIA.delete([`instansi/media/${id}`, `instansi/media/${id}_t`]); throw e; }   // baris gagal = berkas jangan yatim
  return json({id, jenis, waktu_ambil: w.waktu, sumber_waktu: w.sumber, orang_terdeteksi: orang ? orang.maks : null, orang_sumber: sumber, exif_jarak: exifJarak, exif_api_km: eApi, terverifikasi: {kamera: !!kamera, waktu: eWaktu != null, gps: eOk}, jarak_km: g.jarak_km, jauh: g.jarak_km > JAUH_KM}, 201);
}
/* media dan thumbnail dari R2 untuk akun dalam lingkup tugas atau admin; selalu private, no-store; Range didukung supaya video bisa digeser */
async function kirimMedia(env, req, m, id, thumb) {
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum aktif (R2 MEDIA)");
  const o = await env.MEDIA.get(`instansi/media/${id}${thumb ? "_t" : ""}`, thumb ? {} : {range: req.headers, onlyIf: req.headers});
  if (!o) return gagal(404, "berkas tidak ada");
  const h = new Headers({"content-type": thumb ? (o.httpMetadata?.contentType || "image/webp") : m.mime, ...aman, "cache-control": "private, no-store", "accept-ranges": "bytes", etag: o.httpEtag, "content-disposition": "inline", "content-security-policy": SANDBOX});
  if (!("body" in o)) return new Response(null, {status: 304, headers: h});
  if (o.range && !thumb && req.headers.has("range")) {
    const awal = o.range.offset ?? 0, pjg = o.range.length ?? (o.size - awal);
    h.set("content-range", `bytes ${awal}-${awal + pjg - 1}/${o.size}`); h.set("content-length", String(pjg));
    return new Response(o.body, {status: 206, headers: h});
  }
  h.set("content-length", String(o.size));
  return new Response(o.body, {headers: h});
}
async function lihatMedia(env, req, id, kini, thumb) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const m = await env.DB.prepare("SELECT m.mime, m.isian_id, m.akun_id, m.dummy md, t.prov, t.kab, t.dummy FROM instansi_media m JOIN tugas_api t ON t.id = m.tugas_id WHERE m.id = ?").bind(id).first();
  /* tidak ada, di luar wilayah, data contoh bagi akun nyata, atau belum dirujuk isian dan bukan milik pemanggil: semuanya 404 yang sama */
  if (!m || (!m.isian_id && m.akun_id !== a.id) || (m.md && !a.dummy) || !dalamLingkup(a, m)) return gagal(404, "berkas tidak ada");
  return kirimMedia(env, req, m, id, thumb);
}
async function mediaAdmin(env, req, id, thumb) {
  if (!await modAtauStaf(env, req, P_VALIDASI)) return tolakMod();
  const m = await env.DB.prepare("SELECT m.mime, m.dummy, t.prov FROM instansi_media m JOIN tugas_api t ON t.id = m.tugas_id WHERE m.id = ?").bind(id).first();
  return m && dalamWilayahStaf(req, [m.prov]) && !(stafNyata(req) && m.dummy) ? kirimMedia(env, req, m, id, thumb) : gagal(404, "berkas tidak ada");
}

/* ================================================================ usulan kontak PT dari instansi */
async function usulKontak(env, req, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  let tugasId = null;
  if (b.o.tugas_id != null) { if (typeof b.o.tugas_id !== "string" || !/^[0-9a-f]{16}$/.test(b.o.tugas_id)) return gagal(400, "tugas_id tidak sah"); const t = await tugasDalam(env, a, b.o.tugas_id); if (t instanceof Response) return t; tugasId = t.id; }
  const c = cekUsulan(b.o); if (c.galat) return gagal(400, c.galat);
  const l = await laju(env, a.id, "instansi.usulan", [[HARI, 20]], kini); if (l) return l;
  await stmtUsulan(env, a.id, tugasId, c.v, kini).run();
  return json({ok: true, perusahaan_id: c.v.perusahaan_id}, 201);
}
async function usulanSaya(env, req, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  return json({usulan: (await env.DB.prepare("SELECT id, perusahaan_id, nama_pt, status, alasan, dibuat FROM usulan_kontak_pt WHERE akun_id = ? ORDER BY dibuat DESC LIMIT 100").bind(a.id).all()).results});
}

/* ================================================================ cron menit 18: tugas dari tugas_kompleks.json */
const kompleksSah = k => k && typeof k === "object" && Number.isFinite(k.lat) && Number.isFinite(k.lon) && k.lat >= BBOX.latMin && k.lat <= BBOX.latMaks && k.lon >= BBOX.lonMin && k.lon <= BBOX.lonMaks
  && typeof k.prov === "string" && /^\d{2}$/.test(k.prov) && typeof k.kab === "string" && k.kab.length >= 2 && k.kab.length <= 60 && Number.isFinite(k.level) && k.level >= 0 && k.level <= 9;
/* rekomendasi: objek apa adanya sebagai JSON <= 2000 huruf. Lebih panjang dipotong BERURUTAN agar tetap JSON sah: buang catatan, lalu cara dari belakang, lalu alat. */
export function pasRekomendasi(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  const x = {...r}; let s = JSON.stringify(x);
  if (s.length <= MAKS_REKOMENDASI) return s;
  delete x.catatan; s = JSON.stringify(x); if (s.length <= MAKS_REKOMENDASI) return s;
  for (const k of ["cara", "alat"]) if (Array.isArray(x[k])) while (x[k].length && (s = JSON.stringify(x)).length > MAKS_REKOMENDASI) x[k] = x[k].slice(0, -1);
  s = JSON.stringify(x); return s.length <= MAKS_REKOMENDASI ? s : null;
}
/* migrasi 0029 belum diterapkan: cron mencatat {lewat} dan keluar tanpa melempar (cron lain tetap jalan) */
export const tanpaTabel = e => /no such table: (instansi_|tugas_|usulan_kontak_pt|penugasan)/i.test(String(e?.message || e));
/* akses (kunci saudara di tugas_kompleks.json): objek apa adanya sebagai JSON <= 1500 huruf. Terlalu panjang: daftar `bawa` dipotong dari belakang; masih panjang: null. */
const MAKS_AKSES = 1500;
export function pasAkses(a) {
  if (!a || typeof a !== "object" || Array.isArray(a)) return null;
  const x = {...a}; let s = JSON.stringify(x);
  if (s.length <= MAKS_AKSES) return s;
  if (Array.isArray(x.bawa)) while (x.bawa.length && (s = JSON.stringify(x)).length > MAKS_AKSES) x.bawa = x.bawa.slice(0, -1);
  s = JSON.stringify(x); return s.length <= MAKS_AKSES ? s : null;
}
/* "Sudah padam belum?": tugas yang dilaporkan padam diperiksa terhadap putaran titik panas FIRMS terbaru di D1 (titik_terbaru, diisi perbaruiTitik tiap 3 jam, jendela 24 jam per putaran).
   Titik baru (waktu SESUDAH laporan padam) dalam 2 km: muncul_lagi, tugas dibuka kembali (status buka, jendela kabar 24 jam dimulai lagi) dan menjadi butir Meja Pantau api_muncul_lagi.
   Tanpa titik baru: padam_terverifikasi setelah 48 jam, hanya bila putaran terbaru sudah mencakup 48 jam itu (putaran lama atau cron mati = belum terverifikasi). Berjalan di awal buatTugas. */
export async function verifikasiPadam(env, kini = Date.now()) {
  const T = (await env.DB.prepare(`SELECT id, lat, lon, padam_pada, padam_verif FROM tugas_api WHERE padam_verif IN ('padam_dilaporkan', 'padam_terverifikasi') AND status = 'padam' AND padam_pada > ? LIMIT 1000`).bind(kini - UMUR_PERIKSA_PADAM).all()).results;
  if (!T.length) return {periksa: 0, muncul: 0, terverifikasi: 0};
  const r = await env.DB.prepare("SELECT dibuat, isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first();
  if (!r) return {periksa: T.length, muncul: 0, terverifikasi: 0, lewat: "belum ada putaran titik panas"};
  let isi; try { isi = JSON.parse(r.isi); } catch (e) { return {periksa: T.length, muncul: 0, terverifikasi: 0, lewat: "putaran titik panas tidak terbaca"}; }
  const acuan = Date.parse(isi.acuan), baris = Array.isArray(isi.baris) && Number.isFinite(acuan) ? isi.baris.map(b => ({lat: b[0], lon: b[1], t: acuan + b[2] * JAM})) : [];
  const st = []; let muncul = 0, terverifikasi = 0;
  for (const t of T) {
    const kena = baris.some(b => b.t > t.padam_pada && km(b.lat, b.lon, t.lat, t.lon) <= RADIUS_PADAM_KM);
    if (kena) {
      muncul++;
      st.push(env.DB.prepare(`UPDATE tugas_api SET status = 'buka', padam_verif = 'muncul_lagi', verif_pada = ?1, isian_terakhir = ?1 WHERE id = ?2 AND status = 'padam' AND padam_verif IN ('padam_dilaporkan', 'padam_terverifikasi')`).bind(kini, t.id));
    } else if (t.padam_verif === "padam_dilaporkan" && kini - t.padam_pada >= JAM_PADAM_VERIF * JAM && r.dibuat >= t.padam_pada + JAM_PADAM_VERIF * JAM) {
      terverifikasi++;
      st.push(env.DB.prepare(`UPDATE tugas_api SET padam_verif = 'padam_terverifikasi', verif_pada = ?1 WHERE id = ?2 AND status = 'padam' AND padam_verif = 'padam_dilaporkan'`).bind(kini, t.id));
    }
  }
  for (let i = 0; i < st.length; i += CHUNK) await env.DB.batch(st.slice(i, i + CHUNK));
  return {periksa: T.length, muncul, terverifikasi};
}
/* Butir Meja Pantau api_muncul_lagi (dipanggil src/pantau.js): tugas yang dibuka kembali karena titik panas baru dan belum ada kabar tindakan sesudahnya. Hilang sendiri saat kabar baru masuk. */
export async function butirApiMunculLagi(env, kini, dummyOk) {
  try {
    const R = (await env.DB.prepare(`SELECT t.id, t.prov, t.kab, t.kec, t.lat, t.lon, t.luas_ha, t.terakhir_terdeteksi, t.dibuat, t.verif_pada, t.dummy FROM tugas_api t
      WHERE t.padam_verif = 'muncul_lagi' AND t.status = 'buka' ${dummyOk ? "" : "AND t.dummy = 0"}
        AND NOT EXISTS (SELECT 1 FROM tugas_isian i WHERE i.tugas_id = t.id AND i.langkah = 'tindakan' AND i.dibuat > t.verif_pada) ORDER BY t.verif_pada LIMIT 500`).all()).results;
    return R.map(t => ({id: `api-muncul:${t.id}:${t.verif_pada}`, jenis: "api_muncul_lagi", judul: `Api muncul lagi di ${[t.kec, t.kab].filter(Boolean).join(", ")} sesudah dilaporkan padam, ${durasi(kini - t.verif_pada)} lalu`,
      rincian: "Titik panas baru dalam 2 km sesudah laporan padam. Minta regu mengecek lapangan dan mengirim kabar tindakan.", provs: [t.prov], kab: t.kab, dibuat: t.verif_pada, tenggat: t.verif_pada + TENGGAT_KABAR, prioritas: 1, dummy: t.dummy}));
  } catch (e) { if (tanpaTabel(e) || /no such column/i.test(String(e?.message))) return []; throw e; }
}
export async function buatTugas(env, kini = Date.now()) {
  let padam = null;
  try { padam = await verifikasiPadam(env, kini); } catch (e) { if (!tanpaTabel(e) && !/no such (table: titik_terbaru|column)/i.test(String(e?.message || e))) console.error("verifikasi padam", e?.message); }   // galat di sini tidak boleh menahan pembuatan tugas
  try { const h = await buatTugasIsi(env, kini); return padam && padam.periksa ? {...h, padam} : h; } catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0029 belum diterapkan"}; throw e; }
}
async function buatTugasIsi(env, kini) {
  let berkas;
  try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/data/tugas_kompleks.json")); if (!r.ok) { r.body?.cancel(); return {lewat: "tugas_kompleks.json belum ada"}; } berkas = await r.json(); }
  catch (e) { return {lewat: "tugas_kompleks.json tidak terbaca"}; }
  const dibuat = Date.parse(berkas?.dibuat);
  if (!Number.isFinite(dibuat) || kini - dibuat > 6 * JAM) return {lewat: "tugas_kompleks.json lebih dari 6 jam atau tanpa waktu"};
  const ks = (Array.isArray(berkas.kompleks) ? berkas.kompleks : []).filter(kompleksSah).slice(0, 600);
  if (!ks.length) return {baru: 0, digabung: 0};
  const provs = [...new Set(ks.map(k => k.prov))];
  const buka = (await env.DB.prepare("SELECT id, prov, kab, lat, lon FROM tugas_api WHERE status = 'buka' AND prov IN (SELECT value FROM json_each(?)) LIMIT 5000").bind(JSON.stringify(provs)).all()).results;
  const st = []; let baru = 0, digabung = 0;
  for (const k of ks) {
    const kab = k.kab.toLowerCase(), terakhir = Math.round(dibuat - (Number.isFinite(k.jam_sejak) ? k.jam_sejak : 0) * JAM), n24 = Math.max(0, Math.round(k.n24) || 0), luas = Number.isFinite(k.luas) && k.luas >= 0 ? k.luas : null;
    const rek = pasRekomendasi(k.rekomendasi), akses = pasAkses(k.akses);
    let dekat = null, jarak = GABUNG_KM + 1e-9;
    for (const t of buka) if (t.prov === k.prov && t.kab.toLowerCase() === kab) { const d = km(k.lat, k.lon, t.lat, t.lon); if (d <= GABUNG_KM && d < jarak) { dekat = t; jarak = d; } }
    if (dekat) {
      digabung++;
      st.push(env.DB.prepare(`UPDATE tugas_api SET terakhir_terdeteksi = max(terakhir_terdeteksi, ?1), n24 = max(n24, ?2), level = max(level, ?3),
        luas_ha = CASE WHEN ?4 IS NULL THEN luas_ha ELSE max(coalesce(luas_ha, 0), ?4) END, rekomendasi = coalesce(?5, rekomendasi), akses = coalesce(?7, akses) WHERE id = ?6 AND status = 'buka'`)
        .bind(terakhir, n24, k.level, luas, rek, dekat.id, akses));
    } else {
      baru++;
      const id = acak(8); buka.push({id, prov: k.prov, kab: k.kab, lat: k.lat, lon: k.lon});   // kompleks berikutnya di run yang sama ikut bergabung
      st.push(env.DB.prepare(`INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, rekomendasi, akses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, k.prov, k.kab, typeof k.kec === "string" && k.kec && k.kec.length <= 60 ? k.kec : null, k.lat, k.lon, k.level, n24, luas, kini, terakhir, rek, akses));
    }
  }
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  return {baru, digabung};
}
/* retensi (cron menit 17): sesi kedaluwarsa; tugas dan isian 180 hari (foto R2 ikut dibuang) */
export async function bersihkanInstansi(env, kini = Date.now()) {
  try { return await bersihkanInstansiIsi(env, kini); } catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0029 belum diterapkan"}; throw e; }
}
async function bersihkanInstansiIsi(env, kini) {
  const lama = kini - 180 * HARI;
  /* media tugas > 180 hari dan media yatim (diunggah tapi tak pernah dirujuk isian) > 6 jam: berkas R2 ikut dibuang */
  const media = (await env.DB.prepare(`SELECT m.id FROM instansi_media m JOIN tugas_api t ON t.id = m.tugas_id WHERE (t.dibuat <= ?1 AND t.dummy = 0) OR (m.isian_id IS NULL AND m.dibuat <= ?2 AND m.dummy = 0) LIMIT 200`)
    .bind(lama, kini - 6 * JAM).all()).results;
  if (media.length && env.MEDIA) await env.MEDIA.delete(media.flatMap(x => [`instansi/media/${x.id}`, `instansi/media/${x.id}_t`]));
  if (media.length) await env.DB.prepare("DELETE FROM instansi_media WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(media.map(x => x.id))).run();
  /* alat yang masih dikerahkan ke tugas yang akan dihapus DIPULANGKAN dalam batch yang sama (kalau tidak, ON DELETE SET NULL menyisakan alat berstatus dikerahkan tanpa tugas, selamanya):
     jejak 'sistem' ditulis lebih dulu (butuh tugas_id lama), lalu alat kembali siap (servis bila rusak berat). Tabel alat (0031) belum ada = bagian ini dilewati. */
  const tua = "SELECT id FROM tugas_api WHERE dibuat <= ? AND dummy = 0";
  let alat = true; try { await env.DB.prepare("SELECT 1 FROM alat LIMIT 1").first(); } catch (e) { if (!/no such table: alat/i.test(String(e?.message || e))) throw e; alat = false; }
  const pulang = alat ? [env.DB.prepare(`INSERT INTO alat_jejak (waktu, oleh, alat_id, gudang_id, aksi, dari, ke, tugas_id, dummy) SELECT ?, 'sistem', a.id, a.gudang_id, 'status', 'dikerahkan', CASE WHEN a.kondisi = 'rusak_berat' THEN 'servis' ELSE 'siap' END, a.dikerahkan_ke_tugas, a.dummy
      FROM alat a WHERE a.status = 'dikerahkan' AND a.dikerahkan_ke_tugas IN (${tua})`).bind(kini, lama),
    env.DB.prepare(`UPDATE alat SET status = CASE WHEN kondisi = 'rusak_berat' THEN 'servis' ELSE 'siap' END, dikerahkan_ke_tugas = NULL, diubah = ? WHERE status = 'dikerahkan' AND dikerahkan_ke_tugas IN (${tua})`).bind(kini, lama)] : [];
  const r = await env.DB.batch([env.DB.prepare("DELETE FROM instansi_sesi WHERE kedaluwarsa <= ?").bind(kini), ...pulang,
    env.DB.prepare(`DELETE FROM instansi_media WHERE tugas_id IN (${tua})`).bind(lama),
    env.DB.prepare(`DELETE FROM tugas_isian WHERE tugas_id IN (${tua})`).bind(lama), env.DB.prepare("DELETE FROM tugas_api WHERE dibuat <= ? AND dummy = 0").bind(lama)]);
  const posisi = await bersihkanPenugasan(env, kini);   // posisi pelacak 30 hari; tabel 0035 belum ada = dilewati
  return {sesi: r[0].meta.changes, tugas: r[r.length - 1].meta.changes, media: media.length, alat_pulang: alat ? r[2].meta.changes : 0, ...(posisi ? {posisi} : {})};
}

/* ================================================================ admin (modOK: dokumen dan WhatsApp pribadi tidak untuk akun gerbang situs) */
const CHUNK = 50;
async function buatMassal(env, req, kini) {
  const mod = await modOK(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const mulai = num(b.o.mulai ?? 0, 0, 100000, true), batas = num(b.o.batas ?? 100, 1, 200, true);
  if (mulai == null || batas == null || Number.isNaN(mulai) || Number.isNaN(batas)) return gagal(400, "mulai bilangan bulat >= 0 dan batas 1-200");
  const defs = await muatDefs(env); if (!defs) return gagal(503, "pusat_kec.json tidak terbaca dari aset; daftar akun tidak bisa disusun");
  const irisan = defs.slice(mulai, mulai + batas), sandi = [], st = [];
  for (const d of irisan) {
    const s = await sandiBaru(); sandi.push(s.sandi);
    st.push(env.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`).bind(acak(8), d.username, d.jenis, d.tingkat, d.wilayah, d.kunci, JSON.stringify(d.cakupan), d.prov ?? null, d.kab ?? null, s.garam, s.sandi_sha, kini));
  }
  const dibuat = [];
  for (let i = 0; i < st.length; i += CHUNK) (await env.DB.batch(st.slice(i, i + CHUNK))).forEach((r, j) => { if (r.meta.changes) { const k = i + j; dibuat.push({username: irisan[k].username, jenis: irisan[k].jenis, wilayah: irisan[k].wilayah, sandi: sandi[k]}); } });
  const akhir = mulai + irisan.length;
  if (dibuat.length) await stmtJejak(env, mod, null, "buat_massal", `${dibuat.length} akun dibuat (urutan ${mulai} sampai ${akhir - 1})`, kini).run();
  return json({total: defs.length, mulai, berikut: akhir < defs.length ? akhir : null, dibuat, dilewati: irisan.length - dibuat.length});   // sandi hanya di respons ini; tidak disimpan, tidak di-log
}
const emailResmi = e => /\.(go\.id|mil\.id)$/i.test(e || "");
const barisAkun = a => ({...ringkas(a), dibuat: a.dibuat, dikirim: a.dikirim, email_resmi: a.email ? emailResmi(a.email) : null, cakupan: jsonAman(a.cakupan), dummy: a.dummy});
const KOLOM_ADMIN = KOLOM_AKUN + ", dibuat, dummy";
async function daftarAkun(env, req, url, kini) {
  if (!await modOK(env, req)) return tolakMod();
  const q = url.searchParams, jenis = q.get("jenis") || "", prov = q.get("prov") || "", status = q.get("status") || "", hal = Math.max(0, Number(q.get("hal")) | 0);
  if ((jenis && !JENIS.includes(jenis)) || (status && !STATUS_AKUN.includes(status)) || (prov && !/^\d{2}$/.test(prov))) return gagal(400, "filter jenis, status, atau prov tidak sah");
  const w = [], p = [];
  if (jenis) { w.push("jenis = ?"); p.push(jenis); }
  if (prov) { w.push("EXISTS (SELECT 1 FROM json_each(a.cakupan) WHERE value = ?)"); p.push(prov); }
  const dasar = w.length ? "WHERE " + w.join(" AND ") : "", dgStatus = w.concat(status ? ["status = ?"] : []).join(" AND ");
  const jumlah = Object.fromEntries(STATUS_AKUN.map(s => [s, 0]));
  for (const r of (await env.DB.prepare(`SELECT status, count(*) n FROM instansi_akun a ${dasar} GROUP BY status`).bind(...p).all()).results) jumlah[r.status] = r.n;
  const baris = (await env.DB.prepare(`SELECT ${KOLOM_ADMIN} FROM instansi_akun a ${dgStatus ? "WHERE " + dgStatus : ""} ORDER BY prov IS NULL DESC, cakupan, jenis, kab LIMIT 50 OFFSET ?`).bind(...p, ...(status ? [status] : []), hal * 50).all()).results;
  return json({akun: baris.map(barisAkun), jumlah, total: Object.values(jumlah).reduce((x, y) => x + y, 0), hal});
}
async function antrean(env, req) {
  if (!await modAtauStaf(env, req, P_VALIDASI)) return tolakMod();
  return json({akun: (await env.DB.prepare(`SELECT ${KOLOM_ADMIN} FROM instansi_akun WHERE status = 'menunggu' ORDER BY dikirim LIMIT 200`).all()).results.filter(a => dalamWilayahStaf(req, jsonAman(a.cakupan) || []) && !(stafNyata(req) && a.dummy)).map(barisAkun)});
}
/* setuju dan tolak membawa `dikirim` (waktu kirim verifikasi yang dilihat admin) dan UPDATE mensyaratkannya: bila wakil mengirim ulang data sesudah admin membuka kartu, 409 (bukan menyetujui data lain) */
async function ubahAkun(env, req, id, kini) {
  const mod = await modAtauStaf(env, req, P_VALIDASI); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const alasan = tx(b.o.alasan, 300); if (alasan === undefined) return gagal(400, "alasan maksimal 300 karakter");
  const ada = await env.DB.prepare("SELECT status, cakupan FROM instansi_akun WHERE id = ?").bind(id).first(); if (!ada) return gagal(404, "akun tidak ada");
  /* staf BNPB (verifikator/pusdalops) hanya memutus setuju/tolak untuk akun di wilayahnya; cabut dan reset sandi tetap moderator ke atas */
  if (dariStaf(mod) && (!["setuju", "tolak"].includes(b.o.aksi) || !dalamWilayahStaf(req, jsonAman(ada.cakupan) || []))) return gagal(403, "staf hanya boleh menyetujui atau menolak akun di wilayahnya");
  const cabutSesi = env.DB.prepare("DELETE FROM instansi_sesi WHERE akun_id = ?").bind(id);
  const ubah = (sql, ...x) => env.DB.prepare(sql).bind(...x);
  const aksi = b.o.aksi;
  if (aksi === "setuju" || aksi === "tolak") {
    if (!Number.isInteger(b.o.dikirim)) return gagal(400, "dikirim wajib: waktu kirim verifikasi yang sedang Anda periksa");
    if (aksi === "tolak" && (!alasan || alasan.length < 3)) return gagal(400, "alasan penolakan wajib (3-300 karakter); wakil membacanya lalu memperbaiki");
    const [r] = await env.DB.batch([aksi === "setuju" ? ubah("UPDATE instansi_akun SET status = 'aktif', alasan = NULL, diputus = ?, oleh = ? WHERE id = ? AND status = 'menunggu' AND dikirim = ?", kini, mod, id, b.o.dikirim)
      : ubah("UPDATE instansi_akun SET status = 'ditolak', alasan = ?, diputus = ?, oleh = ? WHERE id = ? AND status = 'menunggu' AND dikirim = ?", alasan, kini, mod, id, b.o.dikirim), stmtJejak(env, mod, id, aksi, alasan, kini, "changes() > 0")]);
    return r.meta.changes ? json({id, status: aksi === "setuju" ? "aktif" : "ditolak"}) : gagal(409, "data verifikasi berubah atau statusnya bukan menunggu; muat ulang lalu periksa lagi");
  }
  if (aksi === "cabut") {
    if (ada.status === "dicabut") return gagal(409, "akun sudah dicabut");
    await env.DB.batch([ubah("UPDATE instansi_akun SET status = 'dicabut', alasan = ?, diputus = ?, oleh = ? WHERE id = ?", alasan, kini, mod, id), cabutSesi, stmtJejak(env, mod, id, "cabut", alasan, kini)]);
    return json({id, status: "dicabut"});
  }
  if (aksi === "reset") {
    const s = await sandiBaru();
    await env.DB.batch([ubah("UPDATE instansi_akun SET garam = ?, sandi_sha = ?, wajib_ganti = 1, oleh = ? WHERE id = ?", s.garam, s.sandi_sha, mod, id), cabutSesi, stmtJejak(env, mod, id, "reset", alasan, kini)]);
    return json({id, sandi: s.sandi});   // tampil sekali; pengguna WAJIB membuat sandi baru saat masuk
  }
  return gagal(400, "aksi harus setuju/tolak/cabut/reset");
}
/* rincian satu akun untuk admin: data verifikasi dan jejak audit (siapa melakukan apa dan kapan) */
async function rincianAkun(env, req, id) {
  if (!await modAtauStaf(env, req, P_VALIDASI)) return tolakMod();
  const a = await env.DB.prepare(`SELECT ${KOLOM_ADMIN} FROM instansi_akun WHERE id = ?`).bind(id).first(); if (!a || !dalamWilayahStaf(req, jsonAman(a.cakupan) || [])) return gagal(404, "akun tidak ada");
  return json({akun: barisAkun(a), jejak: (await env.DB.prepare("SELECT waktu, oleh, aksi, alasan FROM instansi_jejak WHERE akun_id = ? ORDER BY id DESC LIMIT 100").bind(id).all()).results});
}
async function dokAdmin(env, req, id, jenis) {
  if (!await modAtauStaf(env, req, P_VALIDASI)) return tolakMod();
  const a = await env.DB.prepare(`SELECT ${jenis} ada, cakupan FROM instansi_akun WHERE id = ?`).bind(id).first();
  return a?.ada && dalamWilayahStaf(req, jsonAman(a.cakupan) || []) ? kirimBerkas(env, `instansi/dok/${id}/${jenis}`) : gagal(404, "berkas tidak ada");
}
/* pesan siap kirim untuk menagih; admin yang menekan tautan wa.me, tidak ada kiriman otomatis */
export function pesanTagih(t, untuk, kini, asal = "") {
  const d = tenggat(t, kini), lewat = Math.max(1, Math.round((kini - d.tenggat) / JAM)), tempat = [t.kec, t.kab].filter(Boolean).join(", ");
  return `Yth. ${untuk}. Tugas penanganan api di ${tempat} (koordinat ${Number(t.lat).toFixed(4)}, ${Number(t.lon).toFixed(4)}) belum ${d.langkah === "konfirmasi" ? "dikonfirmasi" : "ada kabar terbaru"}. ` +
    `Batas ${d.langkah === "konfirmasi" ? "6" : "24"} jam sudah lewat sekitar ${lewat} jam. Mohon segera ${d.langkah === "konfirmasi" ? "konfirmasi kondisi api di lokasi" : "kirim kabar tindakan"} lewat ${asal || ""}/instansi. Terima kasih.`;
}
const wa = (no, teks) => `https://wa.me/${no}?text=${encodeURIComponent(teks)}`;
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; }
/* tautan wa.me untuk menagih tugas yang terlambat: PIC lapangan (isian konfirmasi) dan wakil akun kabupaten yang aktif. Dipakai /admin/instansi dan Meja Pantau (src/pantau.js).
   Baris dummy: TIDAK pernah diberi tautan (nomornya bukan milik siapa pun). Kembalian: Map(id tugas -> [{untuk, tautan}]). */
export async function tautanTagih(env, daftar, kini, asal) {
  const ids = JSON.stringify(daftar.map(t => t.id)), kab = JSON.stringify([...new Set(daftar.map(t => `${t.prov}|${t.kab.toLowerCase()}`))]);
  const pic = new Map((await env.DB.prepare("SELECT tugas_id, pic_nama, pic_wa FROM tugas_isian WHERE langkah = 'konfirmasi' AND tugas_id IN (SELECT value FROM json_each(?))").bind(ids).all()).results.map(x => [x.tugas_id, x]));
  const wakil = (await env.DB.prepare("SELECT prov, kab, nama, wa, jenis, wilayah FROM instansi_akun WHERE status = 'aktif' AND dummy = 0 AND tingkat = 'kab' AND wa IS NOT NULL AND (prov || '|' || lower(kab)) IN (SELECT value FROM json_each(?)) ORDER BY jenis").bind(kab).all()).results;
  return new Map(daftar.map(t => {
    const p = pic.get(t.id), w = wakil.filter(x => x.prov === t.prov && x.kab.toLowerCase() === t.kab.toLowerCase()).slice(0, 3);
    return [t.id, t.dummy ? [] : [...(p ? [{untuk: `PIC lapangan ${p.pic_nama}`, jenis: "pic", nama: p.pic_nama, tautan: wa(p.pic_wa, pesanTagih(t, p.pic_nama, kini, asal))}] : []),
      ...w.map(x => ({untuk: `${x.nama} (${x.wilayah})`, jenis: "wakil", nama: `${x.nama} (${x.wilayah})`, tautan: wa(x.wa, pesanTagih(t, x.nama, kini, asal))}))]];
  }));
}
async function pantau(env, req, url, kini) {
  if (!await modAtauStaf(env, req, P_VALIDASI)) return tolakMod();
  const T = (await env.DB.prepare(`SELECT id, prov, kab, kec, lat, lon, level, status, dibuat, konfirmasi_pada, isian_terakhir, padam_verif, padam_pada, dummy,
    (SELECT hasil FROM tugas_isian WHERE tugas_id = tugas_api.id AND langkah = 'konfirmasi') hasil_konfirmasi FROM tugas_api WHERE status = 'buka' OR dibuat > ? ORDER BY dibuat DESC LIMIT 5000`).bind(kini - 60 * HARI).all()).results
    .filter(t => dalamWilayahStaf(req, [t.prov]) && !(stafNyata(req) && t.dummy));
  const per = new Map();
  for (const t of T) {
    const p = per.get(t.prov) || per.set(t.prov, {prov: t.prov, nama: PROV[t.prov]?.[1] ?? t.prov, aktif: 0, terkonfirmasi: 0, terlambat: 0, padam: 0, bukan_api: 0, selang: []}).get(t.prov), d = tenggat(t, kini);
    if (t.status === "buka") p.aktif++; else if (t.status === "padam") p.padam++; else p.bukan_api++;
    if (t.konfirmasi_pada != null) { p.terkonfirmasi++; p.selang.push(t.konfirmasi_pada - t.dibuat); }
    if (d.terlambat) p.terlambat++;
  }
  const provinsi = [...per.values()].map(({selang, ...p}) => ({...p, median_konfirmasi_menit: selang.length ? Math.round(median(selang) / MENIT) : null})).sort((x, y) => y.terlambat - x.terlambat || x.prov.localeCompare(y.prov));
  const akun = (await env.DB.prepare(`SELECT a.id, a.username, a.jenis, a.wilayah, a.status, a.dummy, a.cakupan, count(i.id) isian, sum(i.langkah = 'konfirmasi') konfirmasi, sum(i.langkah = 'tindakan') kabar, max(i.dibuat) terakhir
    FROM instansi_akun a LEFT JOIN tugas_isian i ON i.akun_id = a.id WHERE a.status = 'aktif' GROUP BY a.id ORDER BY isian DESC, a.username LIMIT 300`).all()).results
    .filter(a => dalamWilayahStaf(req, jsonAman(a.cakupan) || []) && !(stafNyata(req) && a.dummy)).map(({cakupan, ...a}) => a);
  const lambat = T.filter(t => tenggat(t, kini).terlambat).sort((x, y) => tenggat(x, kini).tenggat - tenggat(y, kini).tenggat).slice(0, 60), tagih = await tautanTagih(env, lambat, kini, url.origin);
  const terlambat = lambat.map(t => {
    const d = tenggat(t, kini);
    return {id: t.id, prov: t.prov, kab: t.kab, kec: t.kec, ciri: ciriTugas(t), dibuat: t.dibuat, langkah: d.langkah, tenggat: d.tenggat, lewat_jam: Math.round((kini - d.tenggat) / JAM * 10) / 10, padam: infoPadam(t, kini), dummy: t.dummy, tagih: tagih.get(t.id)};
  });
  return json({kini, provinsi, akun, terlambat});
}
async function rincianAdmin(env, req, id, kini) {
  if (!await modAtauStaf(env, req, P_VALIDASI)) return tolakMod();   // keputusan pemilik 21 Okt 2026: staf verifikator/pusdalops (dalam wilayahnya) membuka rincian dan media tugas
  const t = await env.DB.prepare(`SELECT ${KOLOM_TUGAS} FROM tugas_api t WHERE t.id = ?`).bind(id).first();
  if (!t || !dalamWilayahStaf(req, [t.prov]) || (stafNyata(req) && t.dummy)) return gagal(404, "tugas tidak ada");
  return json({tugas: bentukTugas(t, kini), isian: (await env.DB.prepare(SQL_ISIAN).bind(id).all()).results.map(x => bentukIsian(x, true)), media: (await env.DB.prepare(SQL_MEDIA).bind(id).all()).results.map(m => bentukMedia(m, true)),
    usulan: (await env.DB.prepare("SELECT id, perusahaan_id, nama_pt, status FROM usulan_kontak_pt WHERE tugas_id = ?").bind(id).all()).results, gudang_terdekat: await gudangTerdekat(env, t, {adminPic: true, dalam: p => dalamWilayahStaf(req, [p])})});
}
async function daftarUsulan(env, req, url) {
  if (!await modAtauStaf(env, req, P_KONSESI)) return tolakMod();
  const semua = url.searchParams.get("semua") === "1";
  const r = (await env.DB.prepare(`SELECT u.id, u.perusahaan_id, u.nama_pt, u.kontak, u.email, u.wa, u.telepon, u.catatan, u.status, u.alasan, u.dibuat, u.diputus, u.dummy, u.tugas_id, a.username, a.wilayah, a.cakupan cakupan_akun, (SELECT prov FROM tugas_api WHERE id = u.tugas_id) prov_usulan,
    (SELECT json_object('nama_pt', k.nama_pt, 'kontak', k.kontak, 'email', k.email, 'wa', k.wa, 'telepon', k.telepon, 'catatan', k.catatan, 'diubah', k.diubah) FROM kontak_pt k WHERE k.perusahaan_id = u.perusahaan_id) lama
    FROM usulan_kontak_pt u JOIN instansi_akun a ON a.id = u.akun_id ${semua ? "" : "WHERE u.status = 'menunggu'"} ORDER BY u.dibuat DESC LIMIT 300`).all()).results;
  /* kontak_lama = yang sudah di Kontak PT, ditampilkan berdampingan; menerima usulan atas kontak yang ada WAJIB mencentang timpa */
  return json({usulan: r.filter(u => dalamWilayahStaf(req, u.prov_usulan ? [u.prov_usulan] : jsonAman(u.cakupan_akun) || []) && !(stafNyata(req) && u.dummy)).map(({lama, prov_usulan, cakupan_akun, ...u}) => ({...u, kontak_lama: u.status === "menunggu" ? jsonAman(lama) : null, sudah_ada: lama ? 1 : 0}))});
}
async function putusUsulan(env, req, id, kini) {
  const mod = await modAtauStaf(env, req, P_KONSESI); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const alasan = tx(b.o.alasan, 300); if (alasan === undefined) return gagal(400, "alasan maksimal 300 karakter");
  const u = await env.DB.prepare("SELECT u.*, a.cakupan cakupan_akun, (SELECT prov FROM tugas_api WHERE id = u.tugas_id) prov_usulan FROM usulan_kontak_pt u JOIN instansi_akun a ON a.id = u.akun_id WHERE u.id = ?").bind(id).first();
  if (!u || !dalamWilayahStaf(req, u.prov_usulan ? [u.prov_usulan] : jsonAman(u.cakupan_akun) || [])) return gagal(404, "usulan tidak ada");
  if (u.status !== "menunggu") return gagal(409, `usulan sudah ${u.status}`);
  const tutup = s => env.DB.prepare("UPDATE usulan_kontak_pt SET status = ?, alasan = ?, diputus = ?, oleh = ? WHERE id = ? AND status = 'menunggu'").bind(s, alasan, kini, mod, id);
  if (b.o.aksi === "tolak") {
    const [r] = await env.DB.batch([tutup("ditolak"), stmtJejak(env, mod, u.akun_id, "tolak_usulan", `${u.perusahaan_id}${alasan ? ": " + alasan : ""}`.slice(0, 300), kini, "changes() > 0")]);
    return r.meta.changes ? json({id, status: "ditolak"}) : gagal(409, "usulan sudah diputus orang lain");
  }
  if (b.o.aksi !== "terima") return gagal(400, "aksi harus terima/tolak");
  const c = cekKontak(u); if (c.galat) return gagal(400, c.galat);
  if (await env.DB.prepare("SELECT 1 FROM kontak_pt WHERE perusahaan_id = ?").bind(u.perusahaan_id).first() && b.o.timpa !== true) return gagal(409, "perusahaan ini sudah punya kontak di Kontak PT; bandingkan lalu kirim ulang dengan timpa: true");
  /* satu transaksi: usulan ditutup, kontak di-upsert HANYA bila penutupan itu berhasil (kalah balapan = tidak ada yang berubah), lalu jejak */
  const [r] = await env.DB.batch([tutup("diterima"),
    env.DB.prepare(`INSERT INTO kontak_pt (id, perusahaan_id, nama_pt, kontak, email, wa, telepon, catatan, diubah, oleh) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0
      ON CONFLICT (perusahaan_id) DO UPDATE SET nama_pt = excluded.nama_pt, kontak = excluded.kontak, email = excluded.email, wa = excluded.wa, telepon = excluded.telepon, catatan = excluded.catatan, diubah = excluded.diubah, oleh = excluded.oleh, dummy = 0`)
      .bind(acak(8), c.v.perusahaan_id, c.v.nama_pt, c.v.kontak, c.v.email, c.v.wa, c.v.telepon, c.v.catatan, kini, mod),
    stmtJejak(env, mod, u.akun_id, "terima_usulan", u.perusahaan_id, kini, "changes() > 0")]);
  return r.meta.changes ? json({id, status: "diterima", perusahaan_id: u.perusahaan_id}) : gagal(409, "usulan sudah diputus orang lain");
}

/* ================================================================ dummy (DUMMY.md): satu halaman /admin/instansi = seluruh rantai hulu ke hilir:
   akun (tiap status) -> tugas (tiap keadaan: baru, terlambat, api ada, padam, bukan api) -> isian konfirmasi dan tindakan -> usulan kontak (tiap status).
   Sandi dummy acak dan tak pernah ditampilkan: tak bisa dipakai masuk. Dokumen dan foto tak ada di R2 (hanya penanda). */
const JPEG_CONTOH = Uint8Array.from([...Uint8Array.from(atob("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="), c => c.charCodeAt(0)), 0xff, 0xd9]);   // 1 piksel, dibangkitkan
const PDF_CONTOH = new TextEncoder().encode("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const KERANGKA_MP4 = Uint8Array.of(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31);   // bukan video yang bisa diputar: hanya penanda contoh
async function dummyIsi(env, kini, mod) {
  const ada = (await env.DB.prepare("SELECT (SELECT count(*) FROM tugas_api WHERE dummy = 1) + (SELECT count(*) FROM instansi_akun WHERE dummy = 1 AND username NOT LIKE 'dummyinv%') n").first()).n;
  if (ada) return gagal(409, `data dummy instansi sudah ada (${ada} baris hidup); hapus dulu dengan 🧹`);
  const defs = await muatDefs(env); if (!defs) return gagal(503, "pusat_kec.json tidak terbaca dari aset; dummy tidak bisa dibuat");
  const pk = defs.filter(d => d.tingkat === "kab" && d.jenis !== "polres" && d.jenis !== "kodim"), prov = pk.some(d => d.prov === "62") ? "62" : pk[0].prov;
  const K = pk.filter(d => d.prov === prov).slice(0, 3);
  if (K.length < 2) return gagal(503, "kabupaten contoh tidak cukup di aset");
  const st = [], akun = new Map(), garam = acak(16);
  const tambahAkun = (u, jenis, tingkat, wilayah, cakupan, kab, status, ekstra = {}) => {
    const id = acak(8); akun.set(u, id);
    const lengkap = status === "menunggu" || status === "aktif", v = lengkap ? {nama: `[DUMMY] ${wilayah}`, nip: "198001012005011001", pangkat: "Pembina IV/a", jabatan: "Kepala Pelaksana", unit: wilayah, email: `${u}@contoh.invalid`,
      wa: "62000000" + String(akun.size).padStart(3, "0"), telepon_kantor: "0536 300000", surat: 1, kartu: 1, dikirim: kini - 2 * HARI} : {};
    st.push(env.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, alasan, nama, nip, pangkat, jabatan, unit, email, wa, telepon_kantor, surat, kartu, dikirim, diputus, oleh, dibuat, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(id, u, jenis, tingkat, wilayah, "dummy|" + u, JSON.stringify(cakupan), tingkat === "kab" ? prov : null, kab, garam, acak(32), status, ekstra.alasan ?? null,
      v.nama ?? null, v.nip ?? null, v.pangkat ?? null, v.jabatan ?? null, v.unit ?? null, v.email ?? null, v.wa ?? null, v.telepon_kantor ?? null, v.surat ?? 0, v.kartu ?? 0, v.dikirim ?? null,
      status === "aktif" || status === "ditolak" || status === "dicabut" ? kini - HARI : null, status === "aktif" || status === "ditolak" || status === "dicabut" ? mod : null, kini - 3 * HARI));
  };
  tambahAkun("dummypemprov" + prov, "pemprov", "prov", `[DUMMY] Provinsi ${PROV[prov][1]}`, [prov], null, "aktif");
  tambahAkun("dummypolda" + prov, "polda", "prov", `[DUMMY] Polda ${PROV[prov][1]}`, [prov], null, "aktif");
  tambahAkun("dummykodam" + prov, "kodam", "prov", "[DUMMY] Kodam Tambun Bungai", [prov, "63"], null, "aktif");
  const [k0, k1] = K, pj = d => (d.jenis === "pemkot" ? "pemkot" : "pemkab");
  tambahAkun("dummy" + pj(k0) + prov + "a", pj(k0), "kab", `[DUMMY] ${k0.wilayah}`, [prov], k0.kab, "aktif");
  tambahAkun("dummypolres" + prov + "a", "polres", "kab", `[DUMMY] Polres ${k0.kab}`, [prov], k0.kab, "aktif");
  tambahAkun("dummykodim" + prov + "a", "kodim", "kab", `[DUMMY] Kodim ${k0.kab}`, [prov], k0.kab, "menunggu");
  tambahAkun("dummy" + pj(k1) + prov + "b", pj(k1), "kab", `[DUMMY] ${k1.wilayah}`, [prov], k1.kab, "aktif");
  tambahAkun("dummypolres" + prov + "c", "polres", "kab", `[DUMMY] Polres ${k1.kab} (baru dibuat)`, [prov], k1.kab, "belum_klaim");
  tambahAkun("dummypolres" + prov + "b", "polres", "kab", `[DUMMY] Polres ${k1.kab}`, [prov], k1.kab, "ditolak", {alasan: "Surat tugas tidak terbaca, unggah ulang yang lebih jelas"});
  tambahAkun("dummykodim" + prov + "b", "kodim", "kab", `[DUMMY] Kodim ${k1.kab}`, [prov], k1.kab, "dicabut", {alasan: "Pejabat dipindahtugaskan"});
  const A = akun, pengisiKab = [[A.get("dummy" + pj(k0) + prov + "a"), A.get("dummypolres" + prov + "a")], [A.get("dummy" + pj(k1) + prov + "b")]], pengisi = [[pengisiKab[0][0]]];
  /* tugas: tiap keadaan terisi. [kab, umur jam, status, konfirmasi (jam lalu | null), hasil, isian_terakhir (jam lalu)] */
  const TS = [[0, 1, "buka", null, null, null], [1, 8, "buka", null, null, null], [0, 12, "buka", 11, "api_ada", 3], [1, 40, "buka", 39, "api_ada", 30], [0, 20, "bukan_api", 19, "bukan_api", 19],
    [1, 30, "padam", 29, "sudah_padam", 29], [0, 50, "padam", 49, "api_ada", 6],
    [1, 80, "padam", 79, "api_ada", 55], [0, 70, "buka", 69, "api_ada", 2]];   // 7 = padam terverifikasi (sudah dicek ulang), 8 = padam lalu muncul lagi (dibuka kembali, belum ada kabar sesudahnya)
  /* verifikasi padam per tugas [padam_verif, padam_pada (jam lalu), verif_pada (jam lalu), cek_ulang (jam lalu)]: tiap keadaan terisi; 5 dan 6 = padam_dilaporkan (di atas dan di bawah 24 jam) */
  const VERIF = {5: ["padam_dilaporkan", 29, 29, null], 6: ["padam_dilaporkan", 6, 6, null], 7: ["padam_terverifikasi", 55, 3, 52], 8: ["muncul_lagi", 30, 2, null]};
  const AKSES = {jalan: {lat: -2.19, lon: 113.88, kelas: "primary", km_garis_lurus: 4.2}, kaki_km: 3.1, jam_tiba: 3.2, dari: {dari: "Posko Manggala Agni Contoh", jenis: "posko", km_jalan: 38, jam: 1.4}, jalan_kaki_jam: 1.8,
    bawa: [{barang: "Selang 2 inci", jumlah: 200, satuan: "m", status: "dipikul"}, {barang: "Pompa jinjing", jumlah: 2, satuan: "unit", status: "dipikul"}, {barang: "BBM", jumlah: 40, satuan: "liter", status: "dipikul"}]};
  const REK = JSON.stringify({cara: [{metode: "Sekat kanal dan pembasahan gambut", alasan: "Gambut di sekitar titik; api bawah permukaan"}, {metode: "Pemadaman darat dengan pompa portabel", alasan: "Akses jalan tersedia"}],
    alat: ["Pompa portabel", "Selang 2 inci", "Tongkat injektor"], bara_cm: [10, 30, 60], kebutuhan: {target_hari: 3, dasar: {luas_ha: [8, 12, 20], sumber: "satelit", rekonsiliasi_ha_per_piksel: 0.14}, per_ha: {regu_hari: 0.4, personel_hari: 6, air_l: 9000, bbm_l: 40, pompa_unit_hari: 0.8, personel_hari_rujukan: [45, 149]},
    total: {regu: [2, 4, 6], personel: [20, 40, 60], pompa: [{kelas: "tekanan_tinggi", hp: 10.7, unit: [12, 25, 40]}, {kelas: "jinjing_ringan", hp: 2.1, unit: [4, 8, 12]}], selang_m: [200, 400, 600], bor: [1, 2, 3], heli: [0, 1, 1], air_l_hari: [20000, 40000, 60000],
      jet_shooter: [2, 4, 6], lance_cm: [50, 100, 150], tangki_fleksibel: [1, 2, 3], mobil_tangki: [1, 2, 3]}, hari_provinsi: [2, 3, 7], melampaui_rujukan_lapangan: "Kebutuhan personel melebihi rujukan lapangan 45 sampai 149 personel-hari per ha",
    energi: {bbm_l_hari: [30, 60, 90], bbm_lengkap: true, jaringan_pln: null, genset: [{untuk: "celup", celup: [4, 8, 12], unit: [1, 2, 3], kva_hitung: 5.6, kva_komersial: 7.5}, {untuk: "logistik", unit: [1, 1, 1], kva_hitung: 3.1, kva_komersial: 5}]}}, catatan: "Contoh perkiraan, belum divalidasi lapangan"});
  const idT = TS.map(() => acak(8)), wk = [k0, k1];
  TS.forEach(([ki, umur, status, kf, , ir], i) => {
    const k = wk[ki], dibuat = kini - umur * JAM;
    const vf = VERIF[i];
    st.push(env.DB.prepare(`INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, rekomendasi, akses, padam_verif, padam_pada, verif_pada, cek_ulang_pada, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .bind(idT[i], prov, k.kab, `Kecamatan Contoh ${i + 1}`, -2.2 - i * 0.04, 113.9 + ki * 0.3 + i * 0.02, 2 + i % 2, 3 + i * 4, 5 + i * 13, dibuat, dibuat - 2 * JAM, status, kf == null ? null : kini - kf * JAM, ir == null ? (kf == null ? null : kini - kf * JAM) : kini - ir * JAM,
        i % 2 === 0 ? REK : null, i % 3 === 2 ? null : JSON.stringify(AKSES), vf ? vf[0] : null, vf ? kini - vf[1] * JAM : null, vf ? kini - vf[2] * JAM : null, vf && vf[3] != null ? kini - vf[3] * JAM : null));
  });
  /* isian: konfirmasi dulu, lalu tindakan; angka luas/padam konsisten (padam <= luas, padam penuh di tugas padam) */
  const KEND = Object.keys(KENDALA), BAN = Object.keys(BANTUAN), isi = [];
  let n = 0;
  const med = [], mediaDummy = [];
  /* tiap isian membawa 1-3 media (foto, sesekali video) dengan waktu ambil dari tiga sumber bergiliran dan hitungan orang mesin berbeda-beda; personel_terlihat = MAKSIMUM */
  const tambahIsi = (ti, langkah, jamLalu, kol) => {
    const P = pengisiKab[TS[ti][0]], akunId = P[n % P.length], k = wk[TS[ti][0]]; n++;
    const dibuat = kini - jamLalu * JAM, idI = acak(8), banyak = 1 + n % 3, orang = [3, 7, 5, 0, 4][n % 5];
    const g = {lat: -2.2 - ti * 0.04, lon: 113.9 + TS[ti][0] * 0.3 + ti * 0.02};
    const m = Array.from({length: banyak}, (_, j) => ({id: acak(8), video: j === 2, sumber: ["exif", "gps", "unggah"][(n + j) % 3], waktu: dibuat - (j + 1) * 2 * MENIT, orang: j === 1 && n % 4 === 0 ? null : Math.max(0, orang - j * 2)}));
    const ada = m.map(x => x.orang).filter(x => x != null);
    isi.push(sisipIsian(env, {id: idI, tugas_id: idT[ti], akun_id: akunId, klien_id: `dummy${n}-${acak(4)}`, langkah, dibuat, dummy: 1, personel_terlihat: ada.length ? Math.max(...ada) : null, ...kol}, "1", []));
    for (const x of m) mediaDummy.push({id: x.id, video: x.video});
    for (const x of m) med.push(env.DB.prepare(`INSERT INTO instansi_media (id, akun_id, tugas_id, isian_id, jenis, mime, ukuran, durasi, waktu_ambil, sumber_waktu, exif_jarak, lat, lon, akurasi, waktu_gps, jarak_km, gps_curiga, orang_terdeteksi, orang_bingkai, dibuat, exif_waktu, exif_lat, exif_lon, kamera, exif_api_km, dummy)
      VALUES (?, ?, ?, ?, ?, ?, 120000, ?, ?, ?, ?, ?, ?, 12, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(x.id, akunId, idT[ti], idI, x.video ? "video" : "foto", x.video ? "video/mp4" : "image/jpeg", x.video ? 25.5 : null, x.waktu, x.sumber,
      x.sumber === "exif" ? 40 : null, g.lat, g.lon, x.waktu, kol.jarak_km ?? 0.5, kol.gps_curiga ?? null, x.orang, x.orang == null ? null : JSON.stringify(x.video ? [x.orang, Math.max(0, x.orang - 1), x.orang] : [x.orang]), dibuat,
      /* EXIF contoh: foto dengan sumber waktu exif membawa waktu dan GPS EXIF (sekitar 40 m dari GPS perangkat); kamera bergiliran (kamera atau galeri) */
      x.sumber === "exif" ? x.waktu : null, x.sumber === "exif" ? g.lat + 0.0003 : null, x.sumber === "exif" ? g.lon + 0.0002 : null, (n + x.waktu) % 2 ? 1 : 0, x.sumber === "exif" ? Math.round(km(g.lat + 0.0003, g.lon + 0.0002, g.lat, g.lon) * 10) / 10 : null));
    return k;
  };
  const konf = (ti, jamLalu, hasil, jarak, extra = {}) => tambahIsi(ti, "konfirmasi", jamLalu, {lat: -2.2 - ti * 0.04, lon: 113.9 + TS[ti][0] * 0.3 + ti * 0.02, akurasi: 8 + ti * 5, waktu_gps: kini - jamLalu * JAM - 60e3, jarak_km: jarak,
    hasil, pic_nama: `Bambang Contoh ${ti + 1}`, pic_jabatan: "Kepala Desa", pic_wa: "6200000010" + ti, kedalaman_bara_cm: ti % 2 ? null : 20 + ti * 5, lahan_teramati: LAHAN[ti % 4], ...extra});
  konf(2, 11, "api_ada", 0.4); konf(3, 39, "api_ada", 7.8, {gps_curiga: "GPS tidak bergeser sedikit pun di 3 bacaan (contoh tanda curiga)"}); konf(4, 19, "bukan_api", 1.2); konf(5, 29, "sudah_padam", 0.9); konf(6, 49, "api_ada", 2.6);
  const tind = (ti, jamLalu, o) => tambahIsi(ti, "tindakan", jamLalu, {tindakan: `[Contoh] ${o.status_api === "padam" ? "Pembasahan dan pemadaman tuntas" : "Pemadaman darat dengan pompa portabel"}`, kendala: JSON.stringify([KEND[ti % 6], KEND[(ti + 3) % 6]]),
    kendala_lain: ti % 2 ? null : "Sumber air jauh dari lokasi", bantuan: JSON.stringify([BAN[ti % 7], BAN[(ti + 2) % 7]]), bantuan_lain: ti % 2 ? "Selang tambahan" : null,
    personel: 14 + ti, personel_unsur: JSON.stringify({bpbd: 4, tni: 3, manggala_agni: 5, mpa: 2 + ti}), regu: 3, alat_dipakai: JSON.stringify({pompa: 2, selang_m: 300, jet_shooter: 1, heli_wb: 0, alat_berat: ti % 2, drone_termal: 1}), mulai_padam: kini - (jamLalu + 1) * JAM, ...o});
  tind(2, 3, {luas_ha: 14, padam_ha: 5, status_api: "bara", kedalaman_bara_cm: 35, lahan_teramati: "gambut"}); tind(3, 30, {luas_ha: 40, padam_ha: 12, status_api: "menyala"});
  tind(6, 30, {luas_ha: 45, padam_ha: 20, status_api: "bara"}); tind(6, 6, {luas_ha: 45, padam_ha: 45, status_api: "padam"});
  konf(7, 79, "api_ada", 1.1); tind(7, 55, {luas_ha: 20, padam_ha: 20, status_api: "padam"}); tind(7, 52, {luas_ha: 20, padam_ha: 20, status_api: "padam", tindakan: "[Contoh] Cek ulang lapangan: foto kedua di lokasi padam"});
  konf(8, 69, "api_ada", 0.7); tind(8, 30, {luas_ha: 12, padam_ha: 12, status_api: "padam"});
  const U = [["menunggu", null], ["diterima", null], ["ditolak", "Kontak sudah tidak aktif"]];
  const usulan = U.map(([s, al], i) => env.DB.prepare(`INSERT INTO usulan_kontak_pt (id, akun_id, tugas_id, perusahaan_id, nama_pt, kontak, email, wa, telepon, catatan, status, alasan, dibuat, diputus, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .bind(acak(8), pengisi[0][0], idT[[2, 4, 2][i]], `dummy-ins-pt-${i + 1}`, `[DUMMY] PT Konsesi Contoh ${i + 1}`, `PIC Konsesi ${i + 1} (Manajer Lapangan)`, i === 1 ? null : `pic${i + 1}@contoh.invalid`, i === 0 ? null : "6200000020" + i, null, "Data contoh, bukan kontak asli", s, al, kini - (3 - i) * HARI, s === "menunggu" ? null : kini - HARI, s === "menunggu" ? null : mod));
  /* semua dalam satu transaksi berurutan: akun lebih dulu (FK), lalu tugas, isian, usulan */
  st.push(env.DB.prepare("UPDATE instansi_akun SET wajib_ganti = 0 WHERE dummy = 1"));
  for (let i = 0, semua = [...st, ...isi, ...med, ...usulan]; i < semua.length; i += CHUNK) await env.DB.batch(semua.slice(i, i + CHUNK));
  /* berkas contoh di R2 (gambar 1 piksel dan PDF mungil yang DIBANGKITKAN, bukan foto orang) supaya galeri dan dokumen tidak 404; hapus dummy ikut membuangnya */
  if (env.MEDIA) {
    for (const m of mediaDummy) { await env.MEDIA.put(`instansi/media/${m.id}`, m.video ? KERANGKA_MP4 : JPEG_CONTOH, {httpMetadata: {contentType: m.video ? "video/mp4" : "image/jpeg"}}); await env.MEDIA.put(`instansi/media/${m.id}_t`, JPEG_CONTOH, {httpMetadata: {contentType: "image/jpeg"}}); }
    for (const [u, id] of akun) if (["menunggu", "aktif"].includes((await env.DB.prepare("SELECT status FROM instansi_akun WHERE id = ?").bind(id).first())?.status)) {
      await env.MEDIA.put(`instansi/dok/${id}/surat`, PDF_CONTOH, {httpMetadata: {contentType: "application/pdf"}}); await env.MEDIA.put(`instansi/dok/${id}/kartu`, JPEG_CONTOH, {httpMetadata: {contentType: "image/jpeg"}});
    }
  }
  /* penugasan dan pelacak GPS (0035): tiap keadaan terisi; tabel belum ada = bagian ini dilewati (tugas dan isian tetap terisi) */
  let penugasan = 0;
  try { penugasan = await dummyPenugasan(env, kini, {akunKab: pengisiKab.map(p => p[0]), tugas: idT.map((id, i) => ({id, lat: -2.2 - i * 0.04, lon: 113.9 + TS[i][0] * 0.3 + i * 0.02, ki: TS[i][0], status: TS[i][2]}))}); }
  catch (e) { if (!/no such table: penugasan/i.test(String(e?.message || e))) throw e; }
  return json({ok: true, akun: akun.size, tugas: TS.length, isian: isi.length, media: med.length, usulan: U.length, penugasan}, 201);
}
/* hapus dummy: HANYA baris dummy. Tugas dan akun dummy yang masih dipakai baris NON-dummy (isian, media, usulan nyata) dilewati, tidak ikut terhapus beserta anak-anaknya (dilaporkan di `dilewati`). Objek R2 contoh ikut dibuang. */
async function dummyHapus(env) {
  const hitung = async (t, w = "dummy = 1") => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).first()).n;
  const n = {akun: await hitung("instansi_akun"), tugas: await hitung("tugas_api"), isian: await hitung("tugas_isian"), media: await hitung("instansi_media"), usulan: await hitung("usulan_kontak_pt")};
  try { await hapusDummyPenugasan(env); } catch (e) { if (!/no such table: penugasan/i.test(String(e?.message || e))) throw e; }   // sebelum tugas dan akun: FK penugasan
  const kunci = [...(await env.DB.prepare("SELECT id FROM instansi_media WHERE dummy = 1").all()).results.flatMap(x => [`instansi/media/${x.id}`, `instansi/media/${x.id}_t`]),
    ...(await env.DB.prepare("SELECT id FROM instansi_akun WHERE dummy = 1").all()).results.flatMap(x => [`instansi/dok/${x.id}/surat`, `instansi/dok/${x.id}/kartu`])];
  if (env.MEDIA) for (let i = 0; i < kunci.length; i += 500) await env.MEDIA.delete(kunci.slice(i, i + 500));
  await env.DB.batch([env.DB.prepare("DELETE FROM usulan_kontak_pt WHERE dummy = 1"), env.DB.prepare("DELETE FROM instansi_media WHERE dummy = 1"), env.DB.prepare("DELETE FROM tugas_isian WHERE dummy = 1"),
    env.DB.prepare("DELETE FROM tugas_api WHERE dummy = 1 AND NOT EXISTS (SELECT 1 FROM tugas_isian i WHERE i.tugas_id = tugas_api.id) AND NOT EXISTS (SELECT 1 FROM instansi_media m WHERE m.tugas_id = tugas_api.id)"),
    env.DB.prepare(`DELETE FROM instansi_akun WHERE dummy = 1 AND NOT EXISTS (SELECT 1 FROM tugas_isian i WHERE i.akun_id = instansi_akun.id) AND NOT EXISTS (SELECT 1 FROM instansi_media m WHERE m.akun_id = instansi_akun.id)
      AND NOT EXISTS (SELECT 1 FROM usulan_kontak_pt u WHERE u.akun_id = instansi_akun.id)`)]);
  return json({ok: true, ...n, dilewati: {akun: await hitung("instansi_akun"), tugas: await hitung("tugas_api")}});
}
async function dummy(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, kini, mod);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* Agregat untuk laporan harian: per provinsi, dari kabar TERAKHIR tiap tugas pada hari WIB `tanggal` (YYYY-MM-DD): jumlah tugas, regu, personel per unsur, dan alat.
   Personel dari isian tanpa rincian unsur (angka tunggal manual atau hitungan mesin) masuk `tanpa_unsur`; personel_total = jumlah unsur + tanpa_unsur. Baris dummy tidak ikut. */
export async function personelProvinsi(env, tanggal) {
  if (typeof tanggal !== "string" || !tglSah(tanggal)) throw new Error("tanggal harus YYYY-MM-DD yang sah");
  const mulai = Date.parse(tanggal + "T00:00:00+07:00"), akhir = mulai + HARI;
  const baris = (await env.DB.prepare(`SELECT t.prov, i.personel, i.personel_terlihat, i.personel_unsur, i.regu, i.alat_dipakai FROM tugas_isian i JOIN tugas_api t ON t.id = i.tugas_id
    WHERE i.langkah = 'tindakan' AND i.dummy = 0 AND t.dummy = 0 AND i.dibuat >= ?1 AND i.dibuat < ?2
      AND i.id = (SELECT i2.id FROM tugas_isian i2 WHERE i2.tugas_id = i.tugas_id AND i2.langkah = 'tindakan' AND i2.dibuat >= ?1 AND i2.dibuat < ?2 ORDER BY i2.dibuat DESC, i2.id DESC LIMIT 1)`).bind(mulai, akhir).all()).results;
  const per = new Map();
  for (const r of baris) {
    const p = per.get(r.prov) || per.set(r.prov, {prov: r.prov, nama: PROV[r.prov]?.[1] ?? r.prov, tugas: 0, regu: 0, personel_total: 0, unsur: Object.fromEntries(UNSUR.map(k => [k, 0])), tanpa_unsur: 0, alat: Object.fromEntries(ALAT.map(k => [k, 0]))}).get(r.prov);
    p.tugas++; p.regu += r.regu ?? 0;
    const un = jsonAman(r.personel_unsur);
    if (un) for (const [k, v] of Object.entries(un)) { if (k in p.unsur) { p.unsur[k] += v; p.personel_total += v; } }
    else { const x = r.personel ?? r.personel_terlihat ?? 0; p.tanpa_unsur += x; p.personel_total += x; }
    for (const [k, v] of Object.entries(jsonAman(r.alat_dipakai) || {})) if (k in p.alat) p.alat[k] += v;
  }
  return {tanggal, provinsi: [...per.values()].sort((a, b) => a.prov.localeCompare(b.prov))};
}

/* ================================================================ halaman /instansi + rute */
/* peta desktop: MapLibre dari cdnjs (dengan SRI di klien) dan ubin openfreemap, sama dengan /lapangan */
const CSP_INSTANSI = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://*.openfreemap.org; media-src 'self' blob:; connect-src 'self' https://*.openfreemap.org; worker-src blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
async function halamanPublik(env, url) {
  const r = await env.ASSETS.fetch(new Request(new URL("/instansi.html", url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman instansi tidak ada"); }
  return new Response(r.body, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...aman, "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow", "content-security-policy": CSP_INSTANSI}});
}
/* rute digabung ke RUTE di src/worker.js. Tanpa admin = sesi instansi (cookie sesi_instansi) di tiap handler; "modOK" = moderator ke atas; "superOK" = Super Admin. */
const RUTE_ASLI = {
  "GET /instansi": (env, req, url) => halamanPublik(env, url),
  "GET /admin/instansi": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanInstansi, HALAMAN_STAF.instansi),
  "POST /api/instansi/masuk": (env, req, url, kini) => masuk(env, req, kini),
  "POST /api/instansi/keluar": (env, req, url, kini) => keluar(env, req, kini),
  "GET /api/instansi/saya": (env, req, url, kini) => saya(env, req, kini),
  "POST /api/instansi/gantisandi": (env, req, url, kini) => gantiSandi(env, req, kini),
  "POST /api/instansi/verifikasi": (env, req, url, kini) => verifikasi(env, req, kini),
  "POST /api/instansi/surat": (env, req, url, kini) => unggahDok(env, req, kini, "surat"),
  "POST /api/instansi/kartu": (env, req, url, kini) => unggahDok(env, req, kini, "kartu"),
  "GET /api/instansi/tugas": (env, req, url, kini) => daftarTugas(env, req, kini),
  "GET /api/instansi/tugas/:id": (env, req, url, kini, ctx, id) => rincianTugas(env, req, id, kini),
  "POST /api/instansi/konfirmasi/:id": (env, req, url, kini, ctx, id) => konfirmasi(env, req, id, kini),
  "POST /api/instansi/kabar/:id": (env, req, url, kini, ctx, id) => kabar(env, req, id, kini),
  "POST /api/instansi/cekulang/:id": (env, req, url, kini, ctx, id) => cekUlang(env, req, id, kini),
  "POST /api/instansi/media": (env, req, url, kini) => unggahMedia(env, req, kini),
  "GET /api/instansi/media/:id": (env, req, url, kini, ctx, id) => lihatMedia(env, req, id, kini, false),
  "GET /api/instansi/thumb/:id": (env, req, url, kini, ctx, id) => lihatMedia(env, req, id, kini, true),
  "GET /api/instansi/kontak": (env, req, url, kini) => usulanSaya(env, req, kini),
  "POST /api/instansi/kontak": (env, req, url, kini) => usulKontak(env, req, kini),
  "POST /api/instansi/admin/buat": (env, req, url, kini) => buatMassal(env, req, kini),
  "GET /api/instansi/admin/akun": (env, req, url, kini) => daftarAkun(env, req, url, kini),
  "GET /api/instansi/admin/akun/:id": (env, req, url, kini, ctx, id) => rincianAkun(env, req, id),
  "GET /api/instansi/admin/antrean": (env, req) => antrean(env, req),
  "POST /api/instansi/admin/akun/:id": (env, req, url, kini, ctx, id) => ubahAkun(env, req, id, kini),
  "GET /api/instansi/admin/surat/:id": (env, req, url, kini, ctx, id) => dokAdmin(env, req, id, "surat"),
  "GET /api/instansi/admin/kartu/:id": (env, req, url, kini, ctx, id) => dokAdmin(env, req, id, "kartu"),
  "GET /api/instansi/admin/pantau": (env, req, url, kini) => pantau(env, req, url, kini),
  "GET /api/instansi/admin/tugas/:id": (env, req, url, kini, ctx, id) => rincianAdmin(env, req, id, kini),
  "GET /api/instansi/admin/media/:id": (env, req, url, kini, ctx, id) => mediaAdmin(env, req, id, false),
  "GET /api/instansi/admin/thumb/:id": (env, req, url, kini, ctx, id) => mediaAdmin(env, req, id, true),
  "GET /api/instansi/admin/usulan": (env, req, url) => daftarUsulan(env, req, url),
  "POST /api/instansi/admin/usulan/:id": (env, req, url, kini, ctx, id) => putusUsulan(env, req, id, kini),
  "POST /api/instansi/admin/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
/* Pembungkus semua rute: (1) kiriman bersesi instansi wajib header x-pb: 1 (cookie SameSite=Lax saja tidak menahan POST lintas situs dengan Origin kosong atau "null");
   (2) tabel 0029 belum ada = 503 yang jelas, bukan 500. Rute admin memakai token/cookie admin dan dijaga adminOK/modOK, jadi tidak ikut aturan (1). */
export const RUTE_INSTANSI = Object.fromEntries(Object.entries(RUTE_ASLI).map(([kunci, f]) => [kunci, async (env, req, ...sisa) => {
  if (req.method === "POST" && !kunci.includes("/admin/") && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman instansi wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman /instansi)");
  try { return await f(env, req, ...sisa); }
  catch (e) { if (tanpaTabel(e)) return gagal(503, "fitur instansi belum diaktifkan (migrasi 0029 belum diterapkan)"); throw e; }
}]));
