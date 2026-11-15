/* Satu Pintu Masuk (data/kajian-bnpb/pintu-masuk/ALGORITMA.md §2, §6): SEMUA ambang di satu tempat (gerbang G-6).
   Jendela laju = [[jendela ms, maks], ...], dipakai `laju()` src/bnpb.js. Ambang rancangan agent, bisa diubah pemilik di sini saja. */
const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM;

export const KODE_DIGIT = 6;                 // panjang kode sekali pakai
export const KODE_UMUR = 5 * MENIT;          // umur satu kode
export const MAKS_COBA = 5;                  // percobaan per kode; yang keenam menghanguskan
export const JEDA_KIRIM = MENIT;             // jarak minimal antar permintaan kode untuk satu nomor
export const LAJU_NOMOR = [[15 * MENIT, 3], [HARI, 8]];
export const LAJU_IP_MINTA = [[JAM, 30]];    // jaringan seluler berbagi alamat
export const LAJU_IP_PERIKSA = [[JAM, 60]];
export const LAJU_GLOBAL = [[JAM, 300], [HARI, 2000]];   // melindungi nomor gerbang dari pemblokiran WhatsApp
export const SESI_UMUR_UMUM = 30 * HARI;     // sesi akun umum (Q6, bawaan sementara)
export const BARU_KODE = 15 * MENIT;         // "baru masuk dengan kode" (syarat atur sandi, PM-13)

/* PM-03 perbaikan */
export const KUNCI_MIN = 32;                 // MASUK_KUNCI lebih pendek dianggap kosong
export const LAJU_IP_KELUAR = [[JAM, 60]];
export const KODE_AKTIF_MAKS = 5;            // baris kode aktif yang diperiksa per nomor (laju nomor sudah membatasi 3 per 15 menit)
/* PM-04 gerbang WA, denyut, pembersihan (DESAIN-TEKNIS 5 dan 7, ALGORITMA 2.3) */
export const OTP_UMUR = KODE_UMUR;           // baris otp lebih tua dari ini tidak pernah ditarik dan dibuang pembersih
export const OTP_ULANG = 20e3;               // otp yang gagal ditarik ulang tiap 20 detik
export const DENYUT_JEDA = MENIT;            // denyut ditulis paling sering sekali per menit
export const DENYUT_MATI = 5 * MENIT;        // denyut lebih tua dari ini = saluran WA terganggu
export const RETENSI_KODE = HARI;            // mk_kode
export const RETENSI_UNDANG = 90 * HARI;     // mk_undang, dihitung sesudah masa berlakunya lewat
export const RETENSI_LOG = 400 * HARI;       // mk_masuk_log
/* PM-06/PM-07: peran, sandi staf, rute Super Admin */
export const LAJU_IP_SANDI = [[JAM, 20]];    // POST /api/masuk/sandi per alamat; tebakan sandi staf juga dihitung aturan staf (8 per jam per username dan IP)
export const LAJU_AKUN_SANDI = [[JAM, 10]];  // per akun umum yang membuktikan nomor
export const AKUN_PER_JENIS = 5;             // paling banyak akun peran per jenis yang dibuka satu nomor (anggaran subrequest Worker)
/* perbaikan PM-05..07 */
export const LAJU_IP_PILIH = [[JAM, 60]];        // POST /api/masuk/pilih per alamat
export const LAJU_IP_PEMIRSA_WA = [[JAM, 30]];   // POST /api/masuk/pemirsa_wa per alamat
/* PM-08: lengkapi profil akun umum */
export const LAJU_IP_LENGKAPI = [[JAM, 30]];     // POST /api/masuk/lengkapi per alamat
export const NAMA_MAKS = 80;                     // sama dengan CHECK mk_akun.nama
export const KAB_MAKS = 60;                      // sama dengan CHECK mk_akun.kab
