/* Meja Pantau: antrean kerja harian staf BNPB. Skema: migrations/0030_staf.sql. Aturan pemilik (21 Okt 2026):
   - Butir TIDAK disimpan: dihitung saat dibaca dari sumbernya (tugas api, panggilan konsesi, akun instansi, usulan kontak). Butir yang kondisinya sudah tak berlaku
     hilang sendiri. Tabel pantau_tugas hanya menyimpan penugasan dan status (baru/dikerjakan/selesai/abaikan); pantau_jejak menyimpan siapa melakukan apa dan kapan.
   - butir.id = jenis + sumber + keadaan sumber, jadi hal yang kambuh sesudah selesai berid baru dan muncul lagi.
   - Disaring peran (jenis butir) dan wilayah (kode provinsi) staf. koordalops dan pimpinan melihat semua jenis; admin (ADMIN_TOKEN/AKUN_SITUS) melihat semuanya.
     pimpinan baca saja. Tautan tagih (nomor WA) hanya untuk moderator ke atas dan staf verifikator/pusdalops (sama dengan /admin/instansi).
   - Tidak ada kiriman otomatis dan tidak ada cron untuk butir; cron hanya membuang baris penugasan lama (bersihkanPantau).
   ponytail: butir dihitung ulang tiap GET dan tiap aksi (empat SELECT berbatas); bila lambat, cache tepi 30 detik per peran. Penugasan baca-lalu-tulis (dua koordinator serentak: yang terakhir menang, kedua-duanya tercatat di jejak).
   ponytail: "api di konsesi" = antrean panggilan Posko (cron sudah mencocokkan titik FIRMS dengan konsesi); tugas_api tidak dicocokkan poligon konsesi sendiri (poligon 2,5 MB per provinsi, di luar anggaran CPU baca). */
import {json, gagal, acak, bacaBody, adminOK} from "./worker.js";
import {modOK, superOK, tx, wib, RUTE_POSKO} from "./posko.js";
import {tenggat, tautanTagih, PROV, RUTE_INSTANSI, durasi as jam, ciriTugas, butirApiMunculLagi, butirCekUlang, bencanaPer} from "./instansi.js";
import {labelBencana} from "./tugas_bencana.js";
import {PERAN, P_VALIDASI, stafSesi, stafTertahan, stmtStaf, jejakStmt, sandiBaru, bungkusStaf, tanpaTabelStaf} from "./staf.js";
import {P_SIPPA_TULIS} from "./sippa.js";
import {alarmKeselamatan} from "./penugasan.js";
import {butirInventarisLama, butirP3k} from "./inventaris.js";
import {butirKorban} from "./korban.js";
import {butirOmcTanpaHasil} from "./omc.js";
import {butirLaporanKarhutla} from "./laporan_karhutla.js";
import {CSP_ADMIN, halamanBnpb} from "./admin_halaman.js";
import {kerangka} from "./statistik.js";

const JAM = 3600e3, HARI = 24 * JAM, MAKS_BACA = 5000, BATAS_RESPONS = 2 * JAM, TENGGAT_AKUN = 24 * JAM, TENGGAT_USULAN = 48 * JAM, UMUR_PANGGILAN = 14 * HARI, RETENSI = 120 * HARI;
export const STATUS = ["baru", "dikerjakan", "selesai", "abaikan"];
/* jenis butir -> {label, peran yang menanganinya, layar kerja}. koordalops dan pimpinan melihat semua jenis. Daftar tetap: sama dengan public/admin/pantau.js (dijaga pantau.test.mjs). */
export const JENIS = {
  api_konfirmasi: {label: "Api belum dikonfirmasi lapangan", peran: ["pusdalops"], tautan: "/admin/instansi"},
  api_kabar: {label: "Api belum ada kabar tindakan", peran: ["pusdalops"], tautan: "/admin/instansi"},
  konsesi_tanpa_kontak: {label: "Api di konsesi, perusahaan belum punya kontak", peran: ["analis_konsesi"], tautan: "/admin/posko"},
  panggilan_baru: {label: "Panggilan perusahaan belum dihubungi", peran: ["analis_konsesi"], tautan: "/admin/posko"},
  panggilan_lambat: {label: "Panggilan perusahaan belum direspons", peran: ["analis_konsesi"], tautan: "/admin/posko"},
  akun_menunggu: {label: "Akun instansi menunggu validasi", peran: ["verifikator", "pusdalops"], tautan: "/admin/instansi"},
  usulan_kontak: {label: "Usulan kontak PT menunggu", peran: ["analis_konsesi"], tautan: "/admin/instansi"},
  laporan_harian: {label: "Provinsi belum kirim laporan harian", peran: ["pusdalops"], tautan: "/admin/laporan-karhutla"},
  omc_tanpa_hasil: {label: "Sortie OMC belum ada hasil", peran: ["tmc"], tautan: "/admin/omc"},
  inventaris_lama: {label: "Inventaris lebih dari 30 hari belum diperbarui", peran: ["pusdalops"], tautan: "/admin/inventaris"},
  api_muncul_lagi: {label: "Api muncul lagi setelah dilaporkan padam", peran: ["pusdalops"], tautan: "/admin/instansi"},
  cek_ulang_jatuh_tempo: {label: "Cek ulang lapangan gambut lewat jadwal", peran: ["pusdalops"], tautan: "/admin/instansi"},
  darurat: {label: "DARURAT dari regu di lapangan", peran: ["pusdalops"], tautan: "/admin/instansi"},   // prioritas 0, tombol darurat di /lacak (src/penugasan.js)
  regu_sunyi: {label: "Regu tidak mengirim posisi", peran: ["pusdalops"], tautan: "/admin/instansi"},
  angin_ke_regu: {label: "Angin mengarah ke posisi regu", peran: ["pusdalops"], tautan: "/admin/instansi"},
  regu_rotasi: {label: "Regu melewati batas jam kerja, waktunya rotasi", peran: ["pusdalops"], tautan: "/admin/instansi"},
  korban_baru: {label: "Laporan korban jiwa belum diverifikasi", peran: ["pusdalops"], tautan: "/admin/korban"},   // prioritas 0 = tertinggi, di atas "Segera"
  p3k_kedaluwarsa: {label: "Barang P3K kedaluwarsa atau hampir kedaluwarsa", peran: ["pusdalops"], tautan: "/admin/inventaris"},
  p3k_stok: {label: "Stok P3K di bawah ambang", peran: ["pusdalops"], tautan: "/admin/inventaris"},
  sippa_alarm: {label: "Alarm telemetri kit SIPPA", peran: ["pusdalops"], tautan: "/pipa/telemetri"},
  sippa_titik: {label: "Titik panas baru dekat kompleks SIPPA zona A atau B", peran: ["pusdalops"], tautan: "/pipa/peta"},   // SP-103: ditulis cron FIRMS (src/sippa_titik.js)
  sippa_sos: {label: "SOS dari regu SIPPA di lapangan", peran: ["pusdalops"], tautan: "/pipa/peta"},   // SP-123: tombol SOS di form lapangan (src/sippa.js, tabel sippa_lapangan)
  sippa_selesai: {label: "Gelar SIPPA selesai", peran: ["pusdalops"], tautan: "/pipa/log"},   // SP-127: laporan selesai gelar dari regu
  sippa_mingguan_siap: {label: "Laporan mingguan SIPPA siap", peran: ["pusdalops"], tautan: "/pipa/laporan"},   // SP-145 butir 46: tiap Jumat 08.00 WIB; butir membawa tautan ?minggu=YYYY-Www sendiri
  sippa_mingguan: {label: "Laporan mingguan SIPPA belum dibuat", peran: ["pusdalops"], tautan: "/pipa/laporan"},   // SP-045, ADR-11: terhitung dari sippa_kit dan sippa_laporan, tanpa tabel dan cron baru   // src/sippa.js: sippa_alarm terbuka (DT §6.3.1); tanpa push baru
};
const LUAS = ["koordalops", "pimpinan"];
const tolakTulis = () => gagal(403, "peran pimpinan hanya membaca; penugasan dan perubahan status tidak diizinkan");

/* ================================================================ pelaku */
/* admin (ADMIN_TOKEN/AKUN_SITUS/sesi admin) ATAU sesi staf aktif; selain itu null */
async function aktor(env, req) {
  /* modOK, bukan adminOK: akun gerbang situs (AKUN_SITUS) bukan moderator dan tidak boleh melihat antrean kerja, penugasan, atau tautan tagih */
  const adm = await modOK(env, req);
  if (adm) return {oleh: adm, staf: null, admin: true, peran: Object.keys(PERAN), wilayah: [], dummy: true, mod: true, super: !!await superOK(env, req)};
  const s = await stafSesi(env, req);
  return s ? {oleh: "staf:" + s.id, staf: s, admin: false, peran: s.peran, wilayah: s.wilayah, dummy: !!s.dummy, mod: false, super: false} : null;
}
const tolakAktor = async (env, req) => {
  if (await adminOK(env, req)) return gagal(403, "akun gerbang situs bukan moderator; masuk sebagai moderator atau staf untuk membuka Meja Pantau");
  const t = await stafTertahan(env, req);   // sandi awal belum diganti: layar langsung menawarkan sandi baru
  return json({galat: "belum masuk sebagai staf atau admin; masuk lagi", ...(t ? {wajib_ganti: t} : {})}, 401);
};
const jenisBoleh = a => Object.keys(JENIS).filter(j => a.admin || a.peran.some(p => LUAS.includes(p) || JENIS[j].peran.includes(p)));
const koordinator = a => a.admin || a.peran.includes("koordalops");
const bisaTulis = a => a.admin || a.peran.some(p => p !== "pimpinan");
const bolehTagih = a => a.admin ? a.mod : a.peran.some(p => P_VALIDASI.includes(p));   // admin: seperti /admin/instansi (modOK; akun gerbang situs tidak)

/* ================================================================ pendeteksi: tiap fungsi -> [butir mentah]. Mentah = {id, jenis, judul, rincian, provs, kab, dibuat, tenggat, prioritas, dummy, tugas?} */
/* durasi dari ./instansi.js (jam): sama dengan layar, "6 jam 3 menit", bukan desimal jam */
const dumSql = (a, kolom = "dummy") => a.dummy ? "" : `AND ${kolom} = 0`;
async function tugasApi(env, kini, a) {
  const T = (await env.DB.prepare(`SELECT id, prov, kab, kec, lat, lon, luas_ha, terakhir_terdeteksi, status, dibuat, konfirmasi_pada, isian_terakhir, dummy FROM tugas_api WHERE status = 'buka' ${dumSql(a)} LIMIT ${MAKS_BACA}`).all()).results;
  const out = [], BC = await bencanaPer(env, T);   // tabel 0047 belum ada = semua karhutla
  for (const t of T) {
    const d = tenggat(t, kini); if (!d.terlambat) continue;
    const lewat = kini - d.tenggat, konf = d.langkah === "konfirmasi", tempat = [t.kec, t.kab].filter(Boolean).join(", "), sebut = labelBencana(BC.get(t.id)).sebut;   // karhutla = "Api" seperti dulu
    out.push({id: konf ? `api-konf:${t.id}` : `api-kabar:${t.id}:${t.isian_terakhir ?? t.konfirmasi_pada}`, jenis: konf ? "api_konfirmasi" : "api_kabar", ...(BC.get(t.id) && BC.get(t.id) !== "karhutla" ? {bencana: BC.get(t.id)} : {}),
      judul: `${sebut} di ${tempat} ${konf ? "belum dikonfirmasi lapangan" : "belum ada kabar tindakan"}, lewat ${jam(lewat)} dari batas ${konf ? 6 : 24} jam`, rincian: ciriTugas(t),
      provs: [t.prov], kab: t.kab, dibuat: t.dibuat, tenggat: d.tenggat, prioritas: lewat >= (konf ? 12 : 24) * JAM ? 1 : 2, dummy: t.dummy, tugas: t});
  }
  return out;
}
/* panggilan Posko (api di dalam konsesi, dicocokkan cron titik): tanpa kontak = butir b; baru = c1; dipanggil lewat batas 2 jam = c2 */
async function panggilan(env, kini, a) {
  const awal = wib(kini - UMUR_PANGGILAN), out = [];
  const tanpa = (await env.DB.prepare(`SELECT p.perusahaan_id, p.nama_pt, p.prov, min(p.kab) kab, sum(p.titik_n) titik, min(p.dibuat) dibuat, max(p.dummy) dummy FROM panggilan p
    WHERE p.status NOT IN ('selesai', 'abaikan') AND p.tanggal >= ? ${dumSql(a, "p.dummy")} AND NOT EXISTS (SELECT 1 FROM kontak_pt k WHERE k.perusahaan_id = p.perusahaan_id)
    GROUP BY p.perusahaan_id, p.prov LIMIT 500`).bind(awal).all()).results;
  for (const p of tanpa) {
    const batas = p.dibuat + BATAS_RESPONS;
    out.push({id: `konsesi:${p.perusahaan_id}:${p.prov}`, jenis: "konsesi_tanpa_kontak", judul: `${p.nama_pt} punya ${p.titik} titik api di konsesi, kontaknya belum ada`, rincian: "Tambahkan kontak PT atau terima usulan dari instansi",
      provs: [p.prov], kab: p.kab, dibuat: p.dibuat, tenggat: batas, prioritas: kini > batas ? 1 : 2, dummy: p.dummy});
  }
  const P = (await env.DB.prepare(`SELECT p.id, p.nama_pt, p.prov, p.kab, p.titik_n, p.status, p.dibuat, p.dipanggil_pada, p.batas, p.dummy, EXISTS (SELECT 1 FROM kontak_pt k WHERE k.perusahaan_id = p.perusahaan_id) ada_kontak
    FROM panggilan p WHERE p.tanggal >= ? ${dumSql(a, "p.dummy")} AND (p.status = 'baru' OR (p.status = 'dipanggil' AND p.batas < ?)) LIMIT 500`).bind(awal, kini).all()).results;
  for (const p of P) {
    if (p.status === "baru") {
      if (!p.ada_kontak) continue;   // sudah muncul sebagai konsesi_tanpa_kontak: tidak bisa dihubungi sebelum kontaknya ada
      const batas = p.dibuat + BATAS_RESPONS;
      out.push({id: `panggil-baru:${p.id}`, jenis: "panggilan_baru", judul: `${p.nama_pt} (${p.titik_n} titik api di konsesi) belum dihubungi`, rincian: null,
        provs: [p.prov], kab: p.kab, dibuat: p.dibuat, tenggat: batas, prioritas: kini > batas ? 1 : 2, dummy: p.dummy});
    } else out.push({id: `panggil-lambat:${p.id}:${p.dipanggil_pada}`, jenis: "panggilan_lambat", judul: `${p.nama_pt} belum merespons, lewat ${jam(kini - p.batas)} dari batas 2 jam`, rincian: null,
      provs: [p.prov], kab: p.kab, dibuat: p.dipanggil_pada, tenggat: p.batas, prioritas: 1, dummy: p.dummy});
  }
  return out;
}
/* alarm telemetri SIPPA yang masih terbuka; tutup otomatis saat pulih atau manual, lalu butirnya hilang sendiri. Keselamatan (dry run, tekanan lebih, CO) prioritas 1. Tabel 0058 belum ada = dilewati di kumpulkan() */
const LABEL_ALARM = {hisap_rendah: "tekanan hisap di bawah batas NPSH", debit_rendah: "debit di bawah 20% debit operasi", dry_run: "pompa kering (debit nol, mesin hidup)", tekanan_lebih: "tekanan buang di atas 88% PN",
  belum_dingin: "suhu gambut masih di atas 50 C setelah 24 jam", co_tinggi: "CO rata-rata 15 menit di atas 35 ppm", bbm_rendah: "BBM di bawah 20%", diam: "perangkat diam lebih dari 3 kali interval"};
const angkaPendek = n => String(Math.round(Number(n) * 100) / 100).replace(".", ",");
async function alarmSippa(env, kini, a) {
  const R = (await env.DB.prepare(`SELECT a.id, a.kode, a.nilai, a.ambang, a.mulai, a.dummy, p.tag, k.kode kit_kode, k.prov, k.kab FROM sippa_alarm a JOIN sippa_perangkat p ON p.id = a.perangkat_id JOIN sippa_kit k ON k.id = a.kit_id
    WHERE a.ditutup IS NULL ${dumSql(a, "a.dummy")} ORDER BY a.mulai LIMIT 500`).all()).results;
  return R.map(r => ({id: `sippa-alarm:${r.id}`, jenis: "sippa_alarm", judul: `Kit ${r.kit_kode}, ${r.tag}: ${LABEL_ALARM[r.kode]}`, rincian: r.nilai != null ? `Terukur ${angkaPendek(r.nilai)}, ambang ${angkaPendek(r.ambang)}, menyala ${jam(kini - r.mulai)} (ambang asumsi-kebijakan)` : `Menyala ${jam(kini - r.mulai)}`,
    provs: r.prov ? [r.prov] : [], kab: r.kab, dibuat: r.mulai, tenggat: null, prioritas: ["dry_run", "tekanan_lebih", "co_tinggi"].includes(r.kode) ? 1 : 2, dummy: r.dummy}));
}
/* SP-103: titik panas baru dalam 2 km dari kompleks zona A atau B; butir hidup 24 jam sejak alarm (sama dengan jendela anti-duplikat penulisnya). Id memuat waktu, jadi alarm 24 jam berikutnya butir baru. */
async function sippaTitik(env, kini, a) {
  const R = (await env.DB.prepare(`SELECT kompleks_id, prov, kab, zona, jarak_km, dibuat, dummy FROM sippa_titik_dekat WHERE dibuat > ? ${dumSql(a)} ORDER BY dibuat DESC LIMIT 500`).bind(kini - HARI).all()).results;
  return R.map(r => ({id: `sippa-titik:${r.kompleks_id}:${r.dibuat}`, jenis: "sippa_titik", judul: `Titik panas baru ${angkaPendek(r.jarak_km)} km dari kompleks ${r.kompleks_id} (zona ${r.zona}${r.kab ? ", " + r.kab : ""})`,
    rincian: "Cek pemicu dan kelayakan kompleks di SIPPA (zona konservatif, jarak garis lurus)", provs: [r.prov], kab: r.kab, dibuat: r.dibuat, tenggat: null, prioritas: r.zona === "A" ? 1 : 2, dummy: r.dummy}));
}
/* SP-123 SOS (prioritas 1) dan SP-127 gelar selesai (prioritas 2) dari form lapangan HP; hidup 24 jam sejak diterima, id memuat id butir jadi tiap SOS berdiri sendiri. Provinsi dari tugas di server. */
const bulat2 = v => typeof v === "number" ? Math.round(v * 100) / 100 : v;   // pimpinan (peran baca) melihat koordinat SOS kasar 0,01 seperti log SIPPA
const kodeData = s => { try { return JSON.parse(s) ?? {}; } catch (e) { return {}; } };
async function sippaLapangan(env, kini, a) {
  const penuh = a.admin || a.peran.some(p => P_SIPPA_TULIS.includes(p));   // koordinat penuh hanya peran tulis SIPPA (bukan sekadar 'selain pimpinan')
  const R = (await env.DB.prepare(`SELECT l.id, l.jenis, l.kompleks_id, l.prov, l.data, l.diterima, l.dummy, t.nama_regu, t.kab FROM sippa_lapangan l JOIN sippa_tugas t ON t.id = l.tugas_id
    WHERE l.jenis IN ('sos', 'selesai') AND l.diterima > ? ${dumSql(a, "l.dummy")} ORDER BY l.diterima DESC LIMIT 500`).bind(kini - HARI).all()).results;
  return R.map(r => {
    const d = kodeData(r.data), tempat = r.kompleks_id ?? r.kab;
    return r.jenis === "sos" ? {id: `sippa-sos:${r.id}`, jenis: "sippa_sos", judul: `SOS dari regu ${r.nama_regu} (${tempat})`, rincian: `Koordinat ${penuh ? d.lat : bulat2(d.lat)}, ${penuh ? d.lon : bulat2(d.lon)}${d.pesan ? ". " + d.pesan : ""}`,
        provs: [r.prov], kab: r.kab, dibuat: r.diterima, tenggat: null, prioritas: 1, dummy: r.dummy}
      : {id: `sippa-selesai:${r.id}`, jenis: "sippa_selesai", judul: `Gelar selesai di ${tempat}, ${d.alat_kembali?.length ?? 0} alat kembali, ${d.alat_hilang?.length ?? 0} hilang`, rincian: d.catatan ?? `Regu ${r.nama_regu}`,
        provs: [r.prov], kab: r.kab, dibuat: r.diterima, tenggat: null, prioritas: 2, dummy: r.dummy};
  });
}
const kodeProv = s => { try { const x = JSON.parse(s); return Array.isArray(x) ? x : []; } catch (e) { return []; } };
async function akunMenunggu(env, kini, a) {
  const R = (await env.DB.prepare(`SELECT id, wilayah, cakupan, dikirim, dummy FROM instansi_akun WHERE status = 'menunggu' ${dumSql(a)} ORDER BY dikirim LIMIT 500`).all()).results;
  return R.map(r => { const batas = r.dikirim + TENGGAT_AKUN;
    return {id: `akun:${r.id}:${r.dikirim}`, jenis: "akun_menunggu", judul: `Akun ${r.wilayah} menunggu validasi, dikirim ${jam(kini - r.dikirim)} lalu`, rincian: null,
      provs: kodeProv(r.cakupan), kab: null, dibuat: r.dikirim, tenggat: batas, prioritas: kini > batas ? 1 : 2, dummy: r.dummy}; });
}
async function usulanKontak(env, kini, a) {
  const R = (await env.DB.prepare(`SELECT u.id, u.nama_pt, u.dibuat, u.dummy, a.cakupan, t.prov tprov, t.kab FROM usulan_kontak_pt u JOIN instansi_akun a ON a.id = u.akun_id LEFT JOIN tugas_api t ON t.id = u.tugas_id
    WHERE u.status = 'menunggu' ${dumSql(a, "u.dummy")} ORDER BY u.dibuat LIMIT 500`).all()).results;
  return R.map(r => { const batas = r.dibuat + TENGGAT_USULAN;
    return {id: `usulan:${r.id}`, jenis: "usulan_kontak", judul: `Usulan kontak ${r.nama_pt} menunggu keputusan`, rincian: null, provs: r.tprov ? [r.tprov] : kodeProv(r.cakupan), kab: r.kab,
      dibuat: r.dibuat, tenggat: batas, prioritas: kini > batas ? 2 : 3, dummy: r.dummy}; });
}
/* PENGAIT untuk modul yang belum ada: kembalikan [] sampai tabel sumbernya lahir. Isi nanti mengikuti bentuk butir mentah di atas (id berisi keadaan sumber, provs, tenggat). */
const laporanHarianProvinsi = (env, kini, a) => butirLaporanKarhutla(env, kini, a.dummy);   // provinsi wajib yang belum mengirim laporan harian lewat 09.00 WIB (src/laporan_karhutla.js)
const omcTanpaHasil = (env, kini, a) => butirOmcTanpaHasil(env, kini, a.dummy);   // sortie OMC lebih dari 24 jam tanpa episode di omc_hasil.json (src/omc.js)
const inventarisLama = (env, kini, a) => butirInventarisLama(env, kini, a.dummy);   // gudang yang diubah > 30 hari lalu (src/inventaris.js)
const korbanBaru = (env, kini, a) => butirKorban(env, kini, a.dummy);   // laporan korban jiwa yang belum terverifikasi, prioritas 0 (src/korban.js)
const p3kButir = (env, kini, a) => butirP3k(env, kini, a.dummy);   // P3K kedaluwarsa dalam 30 hari atau stok di bawah ambang (src/inventaris.js)
const apiMunculLagi = (env, kini, a) => butirApiMunculLagi(env, kini, a.dummy);   // tugas dibuka kembali karena titik panas baru sesudah laporan padam (src/instansi.js)
const cekUlangJatuhTempo = (env, kini, a) => butirCekUlang(env, kini, a.dummy);   // tugas padam di gambut yang jadwal cek ulang H+1/H+3/H+7 lewat tanpa kunjungan berfoto (src/instansi.js)
const keselamatan = async (env, kini, a) => (await alarmKeselamatan(env, kini)).filter(b => a.dummy || !b.dummy);   // L3: darurat, regu sunyi, angin ke regu, rotasi (src/penugasan.js)
/* SP-045: pekan SIPPA dimulai Senin 07.40 WIB (00.40 UTC). Butir ada sepanjang pekan itu selama ada kit gelar/banjir dan tak ada laporan mingguan dalam 7 hari terakhir; id memuat tanggal Senin, jadi pekan berikutnya berid baru. Murni, diuji. */
export function awalMingguSippa(kini) {
  const g = new Date(kini - 40 * 60e3), mundur = (g.getUTCDay() + 6) % 7;   // 07.40 WIB = 00.40 UTC; geser 40 menit supaya batas pekan jatuh di 00.00 UTC; getUTCDay 1 = Senin
  const tgl = new Date(g.getTime() - mundur * HARI).toISOString().slice(0, 10);
  return {tgl, waktu: Date.parse(tgl + "T07:40:00+07:00")};
}
async function sippaMingguan(env, kini, a) {
  const K = (await env.DB.prepare(`SELECT status, prov, dummy FROM sippa_kit WHERE status IN ('gelar', 'banjir') ${dumSql(a)} LIMIT 500`).all()).results;
  if (!K.length) return [];
  const sudah = await env.DB.prepare(`SELECT 1 FROM sippa_laporan WHERE jenis = 'mingguan' AND waktu > ? ${dumSql(a)} LIMIT 1`).bind(kini - 7 * HARI).first();
  if (sudah) return [];
  const {tgl, waktu} = awalMingguSippa(kini), banjir = K.filter(k => k.status === "banjir").length, batas = waktu + 8 * JAM + 20 * 60e3;   // batas 16.00 WIB hari Senin
  return [{id: `sippa-mingguan:${tgl}`, jenis: "sippa_mingguan", judul: `${K.length} kit SIPPA bertugas (${banjir} banjir, ${K.length - banjir} gelar), belum ada laporan mingguan dalam 7 hari terakhir`,
    rincian: "Buka Laporan, pilih Mingguan, buat PDF, lalu centang Arsipkan", provs: [...new Set(K.map(k => k.prov).filter(Boolean))], kab: null, dibuat: waktu, tenggat: batas, prioritas: kini > batas ? 1 : 2, dummy: K.every(k => k.dummy) ? 1 : 0}];
}
/* SP-145 butir 46: Jumat 08.00 WIB sampai Senin 08.00 WIB, selama ada kit bertugas. Id memuat minggu ISO, jadi satu butir per minggu tanpa tabel dan tanpa cron baru (ADR-11). Murni, diuji. */
export function mingguSiap(kini) {
  const wib = kini + 7 * JAM, hariKe = Math.floor(wib / HARI), dow = (new Date(wib).getUTCDay() + 6) % 7;   // 0 = Senin
  let jumat = (hariKe - ((dow - 4 + 7) % 7)) * HARI + 8 * JAM;
  if (jumat > wib) jumat -= 7 * HARI;
  if (wib - jumat > 3 * HARI) return null;
  const kam = new Date(Math.floor(jumat / HARI) * HARI + (3 - 4) * HARI), th = kam.getUTCFullYear();   // Kamis pekan itu menentukan tahun ISO
  return {minggu: `${th}-W${String(Math.floor((kam - Date.UTC(th, 0, 1)) / HARI / 7) + 1).padStart(2, "0")}`, dibuat: jumat - 7 * JAM};
}
async function sippaMingguanSiap(env, kini, a) {
  const m = mingguSiap(kini); if (!m) return [];
  const K = (await env.DB.prepare(`SELECT prov, dummy FROM sippa_kit WHERE status IN ('gelar', 'banjir') ${dumSql(a)} LIMIT 500`).all()).results;
  if (!K.length) return [];
  if (await env.DB.prepare(`SELECT 1 FROM sippa_laporan WHERE jenis = 'mingguan' AND waktu >= ? ${dumSql(a)} LIMIT 1`).bind(m.dibuat).first()) return [];   // sudah diarsipkan pekan ini: butir hilang
  return [{id: `sippa-mingguan-siap:${m.minggu}`, jenis: "sippa_mingguan_siap", judul: `Laporan mingguan SIPPA ${m.minggu} siap dibuat dari ${K.length} kit bertugas`, rincian: "Buka Laporan, periksa ringkasan pekan ini, buat PDF, lalu centang Arsipkan",
    tautan: `/pipa/laporan?jenis=mingguan&minggu=${m.minggu}`, provs: [...new Set(K.map(k => k.prov).filter(Boolean))], kab: null, dibuat: m.dibuat, tenggat: null, prioritas: 2, dummy: K.every(k => k.dummy) ? 1 : 0}];
}
const DETEKTOR = [tugasApi, panggilan, akunMenunggu, usulanKontak, laporanHarianProvinsi, omcTanpaHasil, inventarisLama, korbanBaru, p3kButir, apiMunculLagi, cekUlangJatuhTempo, keselamatan, alarmSippa, sippaTitik, sippaMingguan, sippaMingguanSiap, sippaLapangan];

/* tabel sumber yang belum dimigrasi (mis. 0018 atau 0029) melewati detektornya saja; 0030 belum ada ditangani pembungkus rute */
async function kumpulkan(env, kini, a) {
  const boleh = new Set(jenisBoleh(a)), mentah = [];
  for (const f of DETEKTOR) {
    let r; try { r = await f(env, kini, a); } catch (e) { if (/no such table: (tugas_|instansi_|usulan_|panggilan|kontak_pt|gudang|alat|lk_|omc_|sippa_)/i.test(String(e?.message || e))) continue; throw e; }
    mentah.push(...r);
  }
  return mentah.filter(b => boleh.has(b.jenis) && (!a.wilayah.length || b.provs.some(p => a.wilayah.includes(p))));
}
const urut = (x, y) => x.prioritas - y.prioritas || (x.tenggat ?? Infinity) - (y.tenggat ?? Infinity) || x.dibuat - y.dibuat;

/* butir lengkap: mentah + penugasan. Kembalian {butir, staf: Map(id -> nama)} */
async function butirUntuk(env, kini, a, asal) {
  const mentah = await kumpulkan(env, kini, a);
  const ids = JSON.stringify(mentah.map(b => b.id));
  const tugas = new Map((await env.DB.prepare("SELECT butir_id, ditugaskan_ke, status, catatan, alasan, diubah, oleh FROM pantau_tugas WHERE butir_id IN (SELECT value FROM json_each(?))").bind(ids).all()).results.map(r => [r.butir_id, r]));
  const nama = new Map((await env.DB.prepare("SELECT id, nama FROM staf").all()).results.map(r => [r.id, r.nama]));
  const tagih = bolehTagih(a) ? await tautanTagih(env, mentah.filter(b => b.tugas).map(b => b.tugas), kini, asal) : new Map();
  const butir = mentah.sort(urut).map(({tugas: t, provs, ...b}) => {
    const p = tugas.get(b.id), prov = provs[0] ?? null;
    return {...b, label: JENIS[b.jenis].label, tautan: b.tautan ?? JENIS[b.jenis].tautan, prov, provs, prov_nama: prov ? PROV[prov]?.[1] ?? prov : "Nasional", umur: kini - b.dibuat, terlambat: b.tenggat != null && kini > b.tenggat,
      status: p?.status ?? "baru", ditugaskan_ke: p?.ditugaskan_ke ? {id: p.ditugaskan_ke, nama: nama.get(p.ditugaskan_ke) ?? "staf"} : null, catatan: p?.catatan ?? null, alasan: p?.alasan ?? null, diubah: p?.diubah ?? null,
      tagih: t ? tagih.get(t.id) ?? [] : undefined};
  });
  return {butir, nama};
}

/* ================================================================ rute baca */
async function baca(env, req, url, kini) {
  const a = await aktor(env, req); if (!a) return tolakAktor(env, req);
  const {butir} = await butirUntuk(env, kini, a, url.origin), aktif = butir.filter(b => b.status === "baru" || b.status === "dikerjakan"), saya = a.staf?.id;
  const per_jenis = Object.fromEntries(jenisBoleh(a).map(j => [j, aktif.filter(b => b.jenis === j).length]));
  return json({kini, saya: {id: saya ?? null, nama: a.staf?.nama ?? "Admin", peran: a.peran, wilayah: a.wilayah, admin: a.admin, super: a.super, koordinator: koordinator(a), baca_saja: !bisaTulis(a), dummy: a.dummy},
    jenis: Object.fromEntries(jenisBoleh(a).map(j => [j, JENIS[j].label])), peran: PERAN,
    ringkas: {aktif: aktif.length, terlambat: aktif.filter(b => b.terlambat).length, belum_ditugaskan: aktif.filter(b => !b.ditugaskan_ke).length, punyaku: saya ? aktif.filter(b => b.ditugaskan_ke?.id === saya).length : 0, per_jenis},
    staf: koordinator(a) ? (await env.DB.prepare(`SELECT id, nama, peran FROM staf WHERE status = 'aktif' ${dumSql(a)} ORDER BY nama LIMIT 500`).all()).results.map(r => ({...r, peran: JSON.parse(r.peran)})) : [],
    butir});
}

/* ================================================================ aksi pada butir */
const PILIHAN = ["ambil", "tugaskan", "lepas", "selesai", "abaikan", "buka"];
/* Jenis butir yang boleh ditandai "selesai" tangan. KOSONG: semua jenis sekarang berbasis kondisi (api terlambat, akun menunggu, usulan, panggilan, laporan, sortie, inventaris), dihitung ulang tiap baca
   dan HILANG SENDIRI saat kondisinya selesai. Menandai selesai selagi kondisinya masih berlaku hanya menyembunyikan pekerjaan yang belum dikerjakan; yang boleh: ambil, tugaskan, abaikan dengan alasan. */
const SELESAI_MANUAL = new Set();
async function ubahButir(env, req, url, kini) {
  const a = await aktor(env, req); if (!a) return tolakAktor(env, req);
  if (!bisaTulis(a)) return tolakTulis();
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const {id, aksi} = b.o;
  if (typeof id !== "string" || id.length < 5 || id.length > 120) return gagal(400, "id butir wajib");
  if (!PILIHAN.includes(aksi)) return gagal(400, `aksi harus ${PILIHAN.join("/")}`);
  const catatan = tx(b.o.catatan, 300), alasan = tx(b.o.alasan, 300);
  if (catatan === undefined || alasan === undefined) return gagal(400, "catatan dan alasan maksimal 300 karakter");
  if (aksi === "abaikan" && (!alasan || alasan.length < 3)) return gagal(400, "alasan mengabaikan wajib (3-300 karakter)");
  /* hanya butir yang sedang berlaku DAN terlihat oleh pelaku (peran, wilayah): selainnya 404 yang sama */
  const {butir} = await butirUntuk(env, kini, a, url.origin), x = butir.find(k => k.id === id);
  if (!x) return gagal(404, "butir tidak ada, sudah tidak berlaku, atau di luar peran dan wilayah Anda");
  if (aksi === "selesai" && !SELESAI_MANUAL.has(x.jenis)) return gagal(409, "butir ini berbasis kondisi dan hilang sendiri saat kondisinya selesai; gunakan Ambil, Tugaskan, atau Abaikan dengan alasan");
  const pegang = x.ditugaskan_ke?.id ?? null, saya = a.staf?.id ?? null, koord = koordinator(a);
  if (aksi !== "tugaskan" && aksi !== "ambil" && pegang && pegang !== saya && !koord) return gagal(409, `butir dipegang ${x.ditugaskan_ke.nama}; hanya koordinator yang bisa mengubahnya`);
  let ke = pegang, status = x.status;
  if (aksi === "ambil") {
    if (!saya) return gagal(400, "ambil hanya untuk staf; admin memakai tugaskan");
    if (pegang && pegang !== saya && !koord) return gagal(409, `butir sudah diambil ${x.ditugaskan_ke.nama}`);
    ke = saya; status = "dikerjakan";
  } else if (aksi === "tugaskan") {
    if (!koord) return gagal(403, "hanya koordinator (koordalops) atau admin yang menugaskan orang lain");
    ke = typeof b.o.ke === "string" && b.o.ke ? b.o.ke : null;
    if (ke && !await env.DB.prepare(`SELECT 1 FROM staf WHERE id = ? AND status = 'aktif' ${dumSql(a)}`).bind(ke).first()) return gagal(400, "staf tujuan tidak ada atau sudah dicabut");
    status = "baru";
  } else if (aksi === "lepas") { ke = null; status = "baru"; }
  else if (aksi === "selesai") status = "selesai";
  else if (aksi === "abaikan") status = "abaikan";
  else status = "baru";   // buka lagi
  const oleh = a.oleh, dummy = x.dummy ? 1 : 0;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO pantau_tugas (butir_id, jenis, ditugaskan_ke, status, catatan, alasan, dibuat, diubah, oleh, dummy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?8, ?9)
      ON CONFLICT (butir_id) DO UPDATE SET ditugaskan_ke = excluded.ditugaskan_ke, status = excluded.status, catatan = coalesce(excluded.catatan, catatan), alasan = excluded.alasan, diubah = excluded.diubah, oleh = excluded.oleh`)
      .bind(id, x.jenis, ke, status, catatan, status === "abaikan" ? alasan : null, kini, oleh, dummy),
    jejakStmt(env, oleh, "butir:" + id, aksi, ke, status === "abaikan" ? alasan : catatan, kini, dummy)]);
  return json({id, status, ditugaskan_ke: ke});
}
async function jejakButir(env, req, url) {
  const a = await aktor(env, req); if (!a) return tolakAktor(env, req);
  const id = url.searchParams.get("id") || "";
  if (id.length < 5 || id.length > 120) return gagal(400, "id butir wajib");
  const {butir} = await butirUntuk(env, Date.now(), a, url.origin);   // hanya butir yang terlihat oleh pelaku
  if (!butir.some(b => b.id === id)) return gagal(404, "butir tidak ada atau di luar peran dan wilayah Anda");
  const nama = new Map((await env.DB.prepare("SELECT id, nama FROM staf").all()).results.map(r => [r.id, r.nama]));
  return json({jejak: (await env.DB.prepare("SELECT waktu, oleh, aksi, ke, catatan FROM pantau_jejak WHERE obyek = ? ORDER BY id DESC LIMIT 100").bind("butir:" + id).all()).results
    .map(r => ({...r, oleh_nama: r.oleh.startsWith("staf:") ? nama.get(r.oleh.slice(5)) ?? "staf" : "Admin", ke_nama: r.ke ? nama.get(r.ke) ?? "staf" : null}))});
}

/* ================================================================ dummy (DUMMY.md): satu halaman = seluruh rantai hulu ke hilir.
   Hulu = sumber butir yang SUNGGUHAN: /admin/instansi (tugas, akun menunggu, usulan) dan /admin/posko (kontak, panggilan) mengisi dummy lewat rutenya sendiri
   (yang sudah ada dibiarkan, 409 dilewati). Di atasnya: staf contoh per peran (WA 62000000xxxx, sandi acak tak pernah ditampilkan: tak bisa dipakai masuk),
   satu panggilan tanpa kontak PT (butir b), dan penugasan contoh. Hilir = butir dihitung oleh pendeteksi yang sama dengan data asli. */
const STAF_CONTOH = [["Contoh Verifikator", ["verifikator"], []], ["Contoh Pusdalops", ["pusdalops"], []], ["Contoh Analis Konsesi", ["analis_konsesi"], []],
  ["Contoh Pusdalops Kalteng", ["pusdalops", "verifikator"], ["62"]], ["Contoh Koordinator", ["koordalops"], []], ["Contoh Pimpinan", ["pimpinan"], []], ["Contoh Operasi Udara", ["udara", "tmc"], []]];
async function rutaHulu(env, req, url, kini, kunci) {
  const h = new Headers(req.headers); h.delete("content-length"); h.set("content-type", "application/json");
  const f = kunci.endsWith("instansi") ? RUTE_INSTANSI["POST /api/instansi/admin/dummy"] : RUTE_POSKO["POST /api/posko/dummy"];   // dibaca saat jalan (siklus impor)
  const r = await f(env, new Request(req.url, {method: "POST", headers: h, body: JSON.stringify({aksi: kunci.startsWith("hapus") ? "hapus" : "isi"})}), url, kini, undefined);
  if (!r.ok && r.status !== 409) return r;
  r.body?.cancel(); return null;
}
async function dummyIsi(env, req, url, kini, oleh) {
  for (const k of ["isi-instansi", "isi-posko"]) { const g = await rutaHulu(env, req, url, kini, k); if (g) return g; }
  if ((await env.DB.prepare("SELECT count(*) n FROM staf WHERE dummy = 1").first()).n) return gagal(409, "staf dummy sudah ada; hapus dulu dengan 🧹");
  const st = [], ids = [];
  STAF_CONTOH.forEach(([nama, peran, wilayah], i) => {
    const v = {nama, nip: `99000000${i + 1}0000${i}`, unit: "Pusdalops BNPB (contoh)", email: `contoh${i + 1}@contoh.invalid`, wa: `62000000${String(i + 1).padStart(4, "0")}`, peran, wilayah};   // WA tak teralokasi: tanpa normalWA
    const id = acak(8); ids.push(id);
    st.push(sandiBaru().then(s => stmtStaf(env, id, `dummystaf${i + 1}`, v, s, kini, oleh, 1)));
  });
  const stmts = await Promise.all(st);
  /* butir b: panggilan hari ini untuk perusahaan yang kontaknya tidak ada (kontak dummy hanya dummy-pt-1..6) */
  stmts.push(env.DB.prepare(`INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, lat, lon, dibuat, dummy) VALUES (?, ?, 'dummy-pt-tanpa-kontak', '[DUMMY] PT Tanpa Kontak', '62', 'Kotawaringin Timur', 4, ?, -2.5, 113.2, ?, 1)
    ON CONFLICT (tanggal, perusahaan_id) DO NOTHING`).bind(acak(8), wib(kini), kini - 3 * JAM, kini - 3 * JAM));
  await env.DB.batch(stmts);
  /* penugasan contoh: ambil dua butir teratas untuk staf contoh yang cocok, satu diabaikan beralasan; dihitung dari butir sungguhan */
  const admin = {admin: true, peran: Object.keys(PERAN), wilayah: [], dummy: true, mod: false}, {butir} = await butirUntuk(env, kini, admin, url.origin), ada = butir.filter(b => b.dummy && b.status === "baru");
  const st2 = [], pilih = (jenis, i, status, alasan) => { const x = ada.find(b => jenis.includes(b.jenis) && !st2.some(s => s.id === b.id)); if (x) st2.push({id: x.id, jenis: x.jenis, ke: ids[i], status, alasan}); };
  pilih(["api_konfirmasi", "api_kabar"], 1, "dikerjakan"); pilih(["akun_menunggu"], 0, "dikerjakan"); pilih(["usulan_kontak"], 2, "baru"); pilih(["panggilan_lambat"], 2, "dikerjakan");
  pilih(["konsesi_tanpa_kontak"], 2, "abaikan", "Perusahaan sudah ditelepon langsung oleh Kasubdit, kontak menyusul");
  if (st2.length) await env.DB.batch(st2.flatMap(t => [env.DB.prepare("INSERT INTO pantau_tugas (butir_id, jenis, ditugaskan_ke, status, alasan, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)")
    .bind(t.id, t.jenis, t.ke, t.status, t.alasan ?? null, kini, kini, oleh), jejakStmt(env, oleh, "butir:" + t.id, t.status === "abaikan" ? "abaikan" : "tugaskan", t.ke, t.alasan ?? null, kini, 1)]));
  return json({ok: true, staf: ids.length, penugasan: st2.length, butir: butir.filter(b => b.dummy).length}, 201);
}
async function dummyHapus(env, req, url, kini) {
  const n = {staf: (await env.DB.prepare("SELECT count(*) n FROM staf WHERE dummy = 1").first()).n, penugasan: (await env.DB.prepare("SELECT count(*) n FROM pantau_tugas WHERE dummy = 1").first()).n};
  await env.DB.batch([env.DB.prepare("DELETE FROM pantau_tugas WHERE dummy = 1"), env.DB.prepare("DELETE FROM pantau_jejak WHERE dummy = 1"), env.DB.prepare("DELETE FROM staf WHERE dummy = 1"),
    env.DB.prepare("DELETE FROM panggilan WHERE perusahaan_id = 'dummy-pt-tanpa-kontak' AND dummy = 1")]);
  for (const k of ["hapus-instansi", "hapus-posko"]) { const g = await rutaHulu(env, req, url, kini, k); if (g) return g; }
  return json({ok: true, ...n});
}
async function dummy(env, req, url, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, req, url, kini, mod);
  if (b.o.aksi === "hapus") return dummyHapus(env, req, url, kini);
  return gagal(400, "aksi harus isi/hapus");
}

/* retensi (cron menit 17): penugasan yang butirnya sudah lama hilang (lebih dari 120 hari tak diubah). Jejak bukan dummy tidak pernah dihapus. */
export async function bersihkanPantau(env, kini = Date.now()) {
  try { return {penugasan: (await env.DB.prepare("DELETE FROM pantau_tugas WHERE diubah <= ? AND dummy = 0").bind(kini - RETENSI).run()).meta.changes}; }
  catch (e) { if (tanpaTabelStaf(e)) return {lewat: "migrasi 0030 belum diterapkan"}; throw e; }
}

/* ================================================================ halaman /admin/pantau: kerangka tanpa data (data dari /api/pantau yang dijaga sesi); masuk staf ada di halamannya sendiri */
const halaman = ctx => new Response(halamanBnpb("pantau", ctx), {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow", "content-security-policy": CSP_ADMIN}});
export const RUTE_PANTAU = Object.fromEntries(Object.entries({
  "GET /admin/pantau": async (env, req, url, kini) => halaman(await kerangka(env, req, kini)),
  "GET /api/pantau": (env, req, url, kini) => baca(env, req, url, kini),
  "POST /api/pantau/butir": (env, req, url, kini) => ubahButir(env, req, url, kini),
  "GET /api/pantau/jejak": (env, req, url) => jejakButir(env, req, url),
  "POST /api/pantau/dummy": (env, req, url, kini) => dummy(env, req, url, kini),
}).map(([k, f]) => [k, k.startsWith("GET /admin") ? f : bungkusStaf(f)]));
