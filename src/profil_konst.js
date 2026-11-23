/* Semua ambang paket Akun BPBD dengan profil PIC di satu tempat (data/kajian-bnpb/profil-bpbd/ALGORITMA.md bagian 1).
   Nilai awal = bawaan sementara Q2, Q7, Q8; mengubahnya cukup di sini. Waktu dalam milidetik. Tanpa SQL. */
const MENIT = 60e3, JAM = 36e5, HARI = 24 * JAM;
export const PEMDA = ["pemprov", "pemkab", "pemkot"];
export const adaPemda = jenis => PEMDA.includes(jenis);
export const K = {
  PIN_DIGIT: 6,
  PROFIL_MAKS: 4,          // profil bukan dicabut per akun (K6)
  PROFIL_WAJIB: 3,         // profil lengkap sebelum kirim (K6)
  SALAH_BERUNTUN: 5,       // salah dalam jendela KUNCI, per profil dan IP (N7)
  KUNCI: 15 * MENIT,
  SALAH_HARI: 10,          // salah dalam sehari kalender WIB, lalu kunci sampai admin membuka
  SESI_PROFIL: 12 * JAM,
  LAJU_PIN_AKUN: [[JAM, 30]],
  LAJU_PIN_IP: [[JAM, 60]],
  LAJU_BUAT_PROFIL: [[JAM, 12]],
  LAJU_UNGGAH_FOTO: [[JAM, 20]],
  LAJU_UBAH_PROFIL: [[JAM, 60]],     // ubah data profil per akun (G2)
  LAJU_AJUKAN: [[JAM, 20]],          // ajukan dan kirim per akun (G2)
  FOTO_MAKS: 2 * 1048576,
  LOG_RETENSI_HARI: 730,
  FOTO_CABUT_HARI: 30,
  LOG_HALAMAN: 50,
  KUKI: "sesi_profil",
  KUKI_PATH: ["/instansi", "/api/instansi", "/api/lapor"],
};
export const ACTION = {PIN_SALAH: "profil.pin_salah", PIN_AKUN: "profil.pin_akun", PIN_IP: "profil.pin_ip", BUAT: "profil.buat", UBAH: "profil.ubah", AJUKAN: "profil.ajukan"};
export {MENIT, JAM, HARI};
