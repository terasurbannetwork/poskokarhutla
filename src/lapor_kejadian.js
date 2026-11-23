/* Kejadian dari laporan warga (paket data/kajian-bnpb/lapor-kejadian/, tiket LK-02, ALGORITMA A3, keputusan D4, bawaan Q4).
   Fungsi murni tanpa D1: rute meja, halaman publik hari ini (LK-05), dan rekonsiliasi tiga sumber (lapor-ai LA-76) memakai satu penentu yang sama.

   Bentuk penanda pemeriksa (diputuskan di LK-02 dengan bukti kode):
   lapor_periksa.oleh dan lapor_tiket_riwayat.pelaku hanya teks cakupanMeja().pelaku ("BPBD Kabupaten X, Nama" atau nama staf BNPB
   yang bebas, src/lapor_meja_hak.js:16). Nama staf BNPB bisa berbunyi "BPBD ...", dan teks tidak memuat kode wilayah akun, jadi jenis
   dan wilayah pemeriksa TIDAK bisa diturunkan dengan pasti dari teks. Karena itu rute periksa menulis tabel samping lk_periksa_akun
   (migrasi 0168) dari cakupan sesi, dan pengecekan lama tanpa baris samping dihitung belum terverifikasi (aman: tidak pernah tayang). */
import {dalamWilayah} from "./lapor_meja_hak.js";

/* urutan "terakhir": waktu menurun, id menurun bila waktu sama (A3 butir 1) */
const lebihBaru = (a, b) => a.waktu !== b.waktu ? a.waktu > b.waktu : a.id > b.id;
const terakhir = xs => (xs || []).reduce((m, x) => !m || lebihBaru(x, m) ? x : m, null);

/* pemeriksa BPBD wilayah: akun pemda (cakupanMeja jenis "bpbd") yang wilayahnya mencakup wilayah laporan. Staf BNPB, admin, dan
   peran pelapor yang hanya mengaku (bpbd_klaim) tidak pernah cukup (Q4, D19). */
export function pemeriksaBpbdWilayah(akun, wilayah) {
  if (!akun || akun.jenis !== "bpbd" || !/^\d{2}$/.test(String(akun.prov || ""))) return false;
  if (akun.tingkat !== "prov" && akun.tingkat !== "kab") return false;
  return dalamWilayah({jenis: "bpbd", tingkat: akun.tingkat, prov: akun.prov, kab: akun.kab || null, kabNama: akun.kabNama || akun.kab_nama || null}, wilayah);
}

/* laporan = {status, wilayah: {provKode, kabKode, kab}} dari kode wilayah laporan, bukan isian pelapor;
   periksa = [{id, hasil, waktu, akun: {jenis, tingkat, prov, kab, kabNama} | null}];
   versi = [{waktu}] baris lapor_versi; tarikan = [{id, aktif, waktu}] baris lk_tarik untuk kejadian laporannya.
   Benar hanya bila lima syarat A3 semuanya benar. */
export function terverifikasiBpbd(laporan, periksa, versi = [], tarikan = []) {
  const p = terakhir(periksa);
  if (!p || p.hasil !== "valid") return false;                                    // 1: terakhir Valid; sebagian dan tidak_valid salah
  if (!pemeriksaBpbdWilayah(p.akun, laporan?.wilayah)) return false;             // 2: BPBD wilayah laporan
  if (!laporan || laporan.status === "tidak_valid") return false;                 // 3: tiket bukan Tidak valid
  if ((versi || []).some(v => v.waktu > p.waktu)) return false;                  // 4: tidak ada versi sesudah pengecekan
  if (terakhir(tarikan)?.aktif) return false;                                     // 5: tarikan terakhir aktif = ditarik
  return true;
}

/* waktu verifikasi laporan = waktu pengecekan Valid terakhirnya; null bila belum terverifikasi */
export const waktuVerifikasi = (laporan, periksa, versi, tarikan) => terverifikasiBpbd(laporan, periksa, versi, tarikan) ? terakhir(periksa).waktu : null;

/* kejadian laporan: terverifikasi bila paling sedikit satu anggota terverifikasi; hanya anggota terverifikasi yang memberi angka (A3, A5).
   anggota = [{nomor, laporan, periksa, versi}]; tarikan berlaku untuk kejadian laporannya. */
export function kejadianTerverifikasi(anggota, tarikan = []) {
  const sah = (anggota || []).map(a => ({nomor: a.nomor, waktu: waktuVerifikasi(a.laporan, a.periksa, a.versi, tarikan)})).filter(a => a.waktu != null);
  return {terverifikasi: sah.length > 0, waktu: sah.length ? Math.max(...sah.map(a => a.waktu)) : null, anggota: sah.map(a => a.nomor)};
}

/* penanda samping untuk lk_periksa_akun dari cakupan sesi meja (cakupanMeja); hanya kolom wilayah, tanpa nama orang */
export const penandaPemeriksa = c => c?.jenis === "bpbd"
  ? {jenis: "bpbd", tingkat: c.tingkat, prov: c.prov, kab: c.kab || null, kab_nama: c.kabNama ? String(c.kabNama).slice(0, 100) : null}
  : {jenis: "bnpb", tingkat: null, prov: null, kab: null, kab_nama: null};
