/* Fungsi murni modul Lapangan (tanpa DOM): dipakai app.js, panel.js, dan tests/lapangan. */
export const RE_KODE = /^[0-9a-f]{26}$/;

/* "#k=<26 heks>" -> kode huruf kecil, selain itu null (fragmen lain, panjang salah, bukan heks) */
export function bacaKode(hash) {
  const m = /^#k=([0-9a-fA-F]{26})$/.exec(String(hash ?? ""));
  return m ? m[1].toLowerCase() : null;
}

/* status wajah dari API -> label Indonesia dan kelas warna pil (.lp-pil.<kelas>); status asing tidak dianggap terdaftar */
const STATUS = {
  belum: ["Belum daftar", "kuning"],
  terdaftar: ["Terdaftar", "hijau"],
  dihapus: ["Dihapus", "abu"],
};
export const statusWajah = s => { const [label, kelas] = Object.hasOwn(STATUS, s) ? STATUS[s] : ["Belum daftar", "kuning"]; return {label, kelas, daftar: s === "terdaftar"}; };

export const labelJenis = j => j === "relawan" ? "Relawan BNPB" : j === "pegawai" ? "Pegawai" : "";

/* kalimat manusiawi untuk status HTTP; tanpa pesan internal server */
export function pesanGalat(status) {
  if (status === 401) return "Tautan pribadimu tidak dikenali. Minta tautan baru ke admin.";
  if (status === 403) return "Kamu belum punya izin untuk membuka bagian ini.";
  if (status === 429) return "Terlalu sering mencoba. Tunggu sebentar lalu ulangi.";
  if (status >= 500) return "Server sedang bermasalah. Ulangi sebentar lagi.";
  return "Tidak bisa terhubung. Periksa sinyal lalu ulangi.";
}

/* pemeriksaan CSV sisi klien sebelum dikirim; server tetap memvalidasi penuh. Mengembalikan {jumlah, galat|null} */
export const KOLOM_CSV = ["nama", "nip", "unit", "jabatan", "wa", "email", "prov", "kab"];
export const MAKS_CSV = 1_000_000;
export function cekCsv(teks) {
  const t = String(teks ?? "").replace(/^﻿/, "").trim();
  if (!t) return {jumlah: 0, galat: "CSV kosong. Tempel isi CSV atau pilih berkas."};
  if (t.length > MAKS_CSV) return {jumlah: 0, galat: "CSV terlalu besar. Pecah jadi beberapa berkas."};
  const baris = t.split(/\r?\n/).filter(x => x.trim());
  const kepala = baris[0].split(/[,;\t]/).map(x => x.trim().toLowerCase());
  if (!kepala.includes("nama")) return {jumlah: 0, galat: "Baris pertama harus judul kolom dan memuat kolom nama."};
  const tak = kepala.filter(k => !KOLOM_CSV.includes(k));
  if (tak.length) return {jumlah: 0, galat: `Kolom tidak dikenal: ${tak.join(", ")}.`};
  return {jumlah: baris.length - 1, galat: null};
}

export const tautanLapangan = (asal, kode) => `${asal}/petugas#k=${kode}`;

/* paling banyak `maks` baris pertama + jumlah sisa (tabel ditolak tidak dirender sampai ribuan tr) */
export const potong = (daftar, maks = 100) => ({tampil: daftar.slice(0, maks), sisa: Math.max(0, daftar.length - maks)});

/* ---------- tahap B: absen, jarak, riwayat ---------- */
export const pesanGps = kode => kode === 1 ? "Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan peramban, lalu ulangi."
  : kode === 3 ? "Lokasi belum didapat. Pindah ke tempat terbuka lalu ulangi." : "Lokasi tidak tersedia di perangkat ini.";

/* jarak lingkaran besar (meter); hanya untuk tampilan jarak di beranda, penilaian jarak tetap di server */
export function jarakM(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(a)));
}
export const teksJarak = m => !Number.isFinite(m) ? "" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;

/* tautan Renlap dari server: hanya https:// atau jalur situs sendiri (bukan javascript: atau data:) */
export const tautanAman = u => typeof u === "string" && (/^https:\/\/[^\s"'<>]+$/.test(u) || /^\/[^\s"'<>/][^\s"'<>]*$/.test(u)) ? u : null;

const ALASAN = {
  wajah_belum_daftar: "wajah belum terdaftar", wajah_rendah: "wajah kurang jelas", wajah_berbeda: "wajah tampak berbeda dari yang terdaftar",
  tantangan_gagal: "gerakan di layar belum terbaca", hidup_rendah: "pindai wajah kurang meyakinkan", gps_curiga: "lokasi perlu dicek",
  luar_radius: "di luar radius tugas", jam_hp: "jam HP berbeda dari jam server", luring: "dikirim tanpa sinyal",
  luring_lama: "dikirim terlalu lama setelah kejadian", sampel_acak: "dipilih acak untuk dicek peninjau", jaringan_beda: "jaringan berbeda dari biasanya", wajah_baru: "wajah baru terdaftar, perlu dicek",
  foto_ganda: "foto ini sudah pernah dipakai", nonce_tidak_sah: "sesi absen tidak sah atau sudah terpakai", gps_ditolak: "lokasi ditolak",
};
/* kode alasan server -> kalimat; luar_radius memuat jarak bila ada */
export function teksAlasan(kode, jarakMeter) {
  const t = Object.hasOwn(ALASAN, kode) ? ALASAN[kode] : "perlu diperiksa";
  return kode === "luar_radius" && Number.isFinite(jarakMeter) ? `di luar radius tugas (${teksJarak(jarakMeter)})` : t;
}

/* jawaban POST /api/petugas/absen -> teks hasil. jam = teks jam yang sudah diformat ("07.42 WIB"). */
export function hasilAbsen(r, jenis, jam) {
  const j = jenis === "pulang" ? "pulang" : "masuk";
  const alasan = (Array.isArray(r.alasan) ? r.alasan : []).map(a => teksAlasan(a, r.jarak_m));
  if (r.status === "lolos" || r.status === "sah") return {kelas: "hijau", judul: `Absen ${j} tercatat ${jam}`, alasan: []};
  if (r.status === "tolak") return {kelas: "merah", judul: `Absen ${j} ditolak`, alasan};
  return {kelas: "kuning", judul: `Menunggu tinjauan: ${alasan.join(", ") || "perlu diperiksa"}`, alasan};
}

/* waktu dari server bisa angka ms atau teks ISO */
export const keMs = w => { const n = typeof w === "number" ? w : Date.parse(w); return Number.isFinite(n) ? n : NaN; };

/* GET /api/petugas/riwayat -> daftar baris seragam terbaru dulu. Menerima {absen:[], logbook:[]} atau {baris:[{tipe,...}]}. */
const LABEL_STATUS = {lolos: ["Lolos", "hijau"], sah: ["Sah", "hijau"], tinjau: ["Menunggu tinjauan", "kuning"], tolak: ["Ditolak", "merah"]};
export function barisRiwayat(d) {
  const a = (d?.absen || []).map(x => ({tipe: "absen", id: x.id, waktu: keMs(x.waktu), judul: x.jenis === "pulang" ? "Absen pulang" : "Absen masuk", status: x.status, tugas: x.tugas || x.judul || "", alasan: x.alasan || [], jarak_m: x.jarak_m}));
  const l = (d?.logbook || []).map(x => ({tipe: "logbook", id: x.id, waktu: keMs(x.waktu ?? x.tanggal), judul: "Logbook", status: x.terkunci ? "terkunci" : "terbuka", tugas: x.tugas || x.judul || "", alasan: []}));
  const lain = (d?.baris || []).map(x => ({tipe: x.tipe === "logbook" ? "logbook" : "absen", id: x.id, waktu: keMs(x.waktu), judul: x.tipe === "logbook" ? "Logbook" : x.jenis === "pulang" ? "Absen pulang" : "Absen masuk", status: x.status, tugas: x.tugas || "", alasan: x.alasan || [], jarak_m: x.jarak_m}));
  return [...a, ...l, ...lain].filter(x => Number.isFinite(x.waktu)).sort((p, q) => q.waktu - p.waktu)
    .map(x => { const [label, kelas] = Object.hasOwn(LABEL_STATUS, x.status) ? LABEL_STATUS[x.status] : x.status === "terkunci" ? ["Terkunci", "abu"] : x.status === "terbuka" ? ["Bisa disunting", "kuning"] : ["", "abu"]; return {...x, label, kelas}; });
}

/* tugas yang berlaku hari ini dari saya.tugas (server sudah menyaring); ambil yang dipilih bila ada, selain itu yang pertama */
export const pilihTugas = (tugas, id) => (Array.isArray(tugas) ? tugas : []).find(t => t.id === id) ?? (Array.isArray(tugas) ? tugas[0] : null) ?? null;

/* tombol beranda: masuk dulu, lalu pulang; null = keduanya sudah */
export function langkahAbsen(hariIni) {
  if (!hariIni?.absen_masuk) return "masuk";
  if (!hariIni?.absen_pulang) return "pulang";
  return null;
}
