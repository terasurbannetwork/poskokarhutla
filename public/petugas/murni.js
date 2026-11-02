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
