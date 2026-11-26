/* Spek Lapor tanpa sinyal (data/kajian-bnpb/lapor-luring LR-02; KEPUTUSAN DL2, DL3; ALGORITMA 2, 3, 6).
   Satu definisi isian dan batas untuk HP (public/lapor/luring.js) dan Worker (bentukLuring di src/lapor_mesin.js, LR-07).
   ES module tanpa DOM, pola public/inti/spek.js (validatornya dipakai ulang, tidak ditulis kedua kali). Worker tetap memeriksa ulang semuanya.
   Kosong tidak pernah jadi nol: isian yang tidak dijawab tidak muncul di `data`, ringkasan bebas tidak pernah diurai jadi angka.
   Naikkan VERSI_SPEK bila isian atau batas berubah; Worker menerima versi ini dan satu versi sebelumnya (DESAIN-TEKNIS 7). */
import {periksa as periksaSpek} from "./spek.js";

export const VERSI_SPEK = 1;

/* sama dengan src/lapor_spek.js JENIS tanpa "lainnya" (pilihan Lapor darurat); tests/inti/luring_spek.test.mjs menjaga kesamaannya */
export const JENIS = [["banjir", "Banjir"], ["longsor", "Tanah longsor"], ["abrasi", "Gelombang pasang dan abrasi"], ["cuaca", "Cuaca ekstrem"], ["kekeringan", "Kekeringan"],
  ["karhutla", "Kebakaran hutan dan lahan"], ["gempa", "Gempa bumi"], ["tsunami", "Tsunami"], ["erupsi", "Erupsi gunung api"], ["kebakaran_gedung", "Kebakaran gedung dan permukiman"]];
export const WAKTU = [["sedang_berlangsung", "Sedang berlangsung"], ["kurang_1_jam", "Kurang dari 1 jam lalu"], ["hari_ini", "Hari ini, lebih dari 1 jam lalu"], ["kemarin", "Kemarin"]];
export const KORBAN = [["ya", "Ada orang terluka, hilang, atau terjebak"], ["tidak", "Tidak ada korban"], ["belum_tahu", "Belum tahu"]];
export const SUMBER_LOKASI = ["gps", "pilih"];

const MENIT = 6e4, JAM = 60 * MENIT, HARI = 24 * JAM;
/* Q1, Q3, Q4, Q9 dijawab pemilik 21 Nov 2026 ("gas semua") dengan bawaan sementara. Angka bertanda HIPOTESIS belum diuji di lapangan. */
export const BATAS = Object.freeze({
  ringkasan: 500,             // huruf (DL3)
  fotoPerButir: 3,            // Q9
  butir: 5,                   // butir laporan menunggu per perangkat, Q9 HIPOTESIS
  totalByte: 20 * 1024 * 1024, // semua blob saluran, Q9 HIPOTESIS
  umurMs: 14 * HARI,          // Q4, K13 keterpaduan
  majuMs: 5 * MENIT,          // waktu_klien paling jauh di depan jam terima
  fotoSegarMs: 5 * MENIT,     // K75, diukur terhadap waktu simpan (Q1)
  fotoToleransiMs: 2 * MENIT, // tambahan di Worker (ALGORITMA 3)
  fotoMundurMs: 48 * JAM,     // EXIF lebih tua dari ini ditolak (aturan lama)
  gpsUmurMs: 10 * MENIT,
  gpsAkurasiM: 1000,
  jarakExifM: 5000,
  jamGeserMs: 10 * MENIT,     // selisih jam HP lebih dari ini diberi tanda "jam HP jauh bergeser"
  pitaDaruratMs: 2 * JAM,     // Q3 HIPOTESIS
});

const id = d => d.map(x => x[0]);
const SPEK = {kolom: [
  {nama: "jenis", label: "Jenis kejadian", tipe: "pilihan", pilihan: id(JENIS), wajib: true},
  {nama: "waktu", label: "Waktu kejadian", tipe: "pilihan", pilihan: id(WAKTU), wajib: true},
  {nama: "korban", label: "Ada korban", tipe: "pilihan", pilihan: id(KORBAN), wajib: true},
  {nama: "ringkasan", label: "Ringkasan", tipe: "panjang", maks: BATAS.ringkasan},
]};
const TITIK = {kolom: [{nama: "t", label: "Lokasi", tipe: "koordinat"}]};
const KAB = /^\d{2}\.\d{2}$/;
const angka = v => typeof v === "number" && Number.isFinite(v);

/* lokasi: {lat, lon, akurasi, waktu, sumber: "gps"|"pilih"} atau {kab: "dd.dd", sumber: "pilih"} (Q7). Hasil {v} atau {g}. */
function lokasi(v) {
  if (v == null) return {g: "Lokasi wajib diisi"};
  if (typeof v !== "object" || Array.isArray(v) || !SUMBER_LOKASI.includes(v.sumber)) return {g: "Lokasi: bentuk tidak sah"};
  if (v.sumber === "pilih" && v.lat == null) return typeof v.kab === "string" && KAB.test(v.kab) ? {v: {kab: v.kab, sumber: "pilih"}} : {g: "Lokasi: kode kab/kota tidak sah"};
  const t = periksaSpek(TITIK, {t: v}); if (!t.ok) return {g: t.galat[0].pesan};
  if (!angka(v.akurasi) || v.akurasi < 0) return {g: "Lokasi: ketelitian GPS tidak sah"};
  if (v.waktu != null && !angka(v.waktu)) return {g: "Lokasi: waktu GPS tidak sah"};
  return {v: {...t.data.t, akurasi: Math.round(v.akurasi), ...(v.waktu != null ? {waktu: v.waktu} : {}), sumber: v.sumber}};
}

/* Periksa isian formulir luring. `kurang` = isian wajib yang kosong (untuk pesan di HP); `data` hanya berisi isian yang sah dan terisi. */
export function periksa(isi) {
  if (!isi || typeof isi !== "object" || Array.isArray(isi)) return {ok: false, kurang: [], galat: [{nama: "", pesan: "isi harus berupa objek"}], data: {}};
  const {lokasi: lok, ...lain} = isi;
  if (typeof lain.ringkasan === "string" && !lain.ringkasan.trim()) delete lain.ringkasan;   // ringkasan opsional: spasi saja = tidak diisi
  const r = periksaSpek({...SPEK, bebas: true}, lain);
  const galat = r.galat.slice(), data = {...r.data}, L = lokasi(lok);
  if (L.g) galat.push({nama: "lokasi", pesan: L.g}); else data.lokasi = L.v;
  const kosong = v => v == null || v === "";
  const kurang = [...SPEK.kolom.filter(c => c.wajib).map(c => c.nama), "lokasi"].filter(n => kosong(isi[n]));
  return {ok: !galat.length, kurang, galat, data};
}

/* Waktu simpan di HP (waktu_klien) diterima bila tidak lebih dari majuMs di depan jam terima dan tidak lebih tua dari umurMs. */
export const waktuKlienSah = (w, terima) => angka(w) && w <= terima + BATAS.majuMs && w >= terima - BATAS.umurMs;

/* Teks pita belum terkirim: jenis dan jam saja, tanpa lokasi atau nomor (ALGORITMA 2, Q6). Jam WIB bila tanpa zona. */
export function label(jenis, ms, zona = "Asia/Jakarta") {
  const j = JENIS.find(x => x[0] === jenis)?.[1] ?? "Laporan";
  const jam = new Date(ms).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zona}).replace(":", ".");
  return `${j}, ${jam}`;
}

/* Batas antrean sebelum simpan (ALGORITMA 6): {ok} atau {ok:false, pesan}. Tidak ada simpan sebagian. */
export function bolehSimpan({butirMenunggu = 0, foto = 0, byteTersimpan = 0, byteBaru = 0, sisaKuota = null} = {}) {
  if (butirMenunggu >= BATAS.butir) return {ok: false, pesan: `Sudah ada ${BATAS.butir} laporan menunggu sinyal. Kirim yang menunggu dulu.`};
  if (foto > BATAS.fotoPerButir) return {ok: false, pesan: `Paling banyak ${BATAS.fotoPerButir} foto per laporan.`};
  if (byteTersimpan + byteBaru > BATAS.totalByte) return {ok: false, pesan: "Penyimpanan laporan di HP ini penuh. Kirim yang menunggu dulu atau simpan tanpa foto."};
  if (sisaKuota != null && byteBaru > sisaKuota) return {ok: false, pesan: "Ruang penyimpanan HP tidak cukup. Simpan tanpa foto atau kosongkan ruang."};
  return {ok: true};
}
