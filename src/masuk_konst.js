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
/* PM-09 sampai PM-12: anggota, email terpetakan, undangan berantai, papan aktivasi (ALGORITMA §4, §5, §8) */
export const UNDANG_UMUR = 14 * HARI;            // umur satu undangan
export const UNDANG_HARIAN = 20;                 // undangan per pengundang per 24 jam
export const UNDANG_TERBUKA = 100;               // undangan terbuka (terkirim, belum habis) per pengundang
export const MOHON_MENUNGGU_MAKS = 5;            // permohonan anggota berstatus menunggu per akun umum
export const LAJU_IP_MOHON = [[JAM, 30]];        // POST /api/masuk/mohon per alamat
export const LAJU_IP_AKUN = [[JAM, 120]];        // GET /api/masuk/akun per alamat
export const LAJU_IP_UNDANG = [[JAM, 60]];       // POST dan cabut undangan, anggota per alamat
export const LAJU_IP_DOMAIN = [[JAM, 60]];       // POST /api/masuk/domain per alamat (admin)
export const LAJU_IP_EMAIL = [[JAM, 20]];        // POST /api/masuk/email per alamat
export const LAJU_EMAIL_GLOBAL = [[JAM, 100], [HARI, 500]];   // kode email semua orang; Resend punya kuota sendiri
export const KODE_EMAIL_MAKS = 4;                // baris kode email aktif yang diperiksa per (orang, akun, email)
export const PAPAN_CACHE = 5 * MENIT;            // umur hitungan papan aktivasi di cache tepi
export const PAPAN_JENDELA_LOG = 120 * HARI;     // log masuk yang dibaca papan; lebih tua dari ini tampil "lama"
export const LAMA_TIDAK_MASUK = 30 * HARI;       // lewat ini akun aktif berstatus "lama tidak masuk"
export const KONTAK_RINCI_MAKS = 200;            // kontak pemangku yang ditampilkan di rincian satu kabupaten
export const LAJU_UNDANG_ULANG_AKUN = [[JAM, 1]];     // kirim ulang undangan akun BPBD: satu per akun per jam (PF-07)
export const LAJU_UNDANG_ULANG_HARI = [[24 * JAM, 200]];   // dan 200 per hari untuk seluruh sistem
export const LAJU_IP_PAPAN = [[JAM, 120]];       // GET papan dan rincian per alamat
/* peta kategori kontak pemangku -> jenis akun instansi yang boleh dimasuki otomatis (ALGORITMA §4); kategori lain tidak aktif otomatis */
export const PETA_KATEGORI = {
  pemprov: ["bpbd", "kepala_daerah", "pemda"], pemkab: ["bpbd", "kepala_daerah", "pemda"], pemkot: ["bpbd", "kepala_daerah", "pemda"],
  polda: ["polri"], polres: ["polri"], kodam: ["tni"], kodim: ["tni"]};
export const RUMPUN = {pemda: ["pemprov", "pemkab", "pemkot"], aparat: ["polda", "polres", "kodam", "kodim"]};
/* akhiran milik umum: domain yang dipetakan admin harus punya satu label lagi di depannya; surel gratis tidak pernah dipetakan */
export const AKHIRAN_UMUM = ["go.id", "ac.id", "co.id", "or.id", "sch.id", "mil.id", "desa.id", "web.id", "net.id", "my.id", "biz.id", "id"];
export const SUREL_GRATIS = ["gmail.com", "yahoo.com", "yahoo.co.id", "outlook.com", "hotmail.com", "live.com", "icloud.com", "proton.me", "protonmail.com", "mail.com", "ymail.com"];
export const PERAN_AKTIVASI = ["verifikator", "pusdalops", "koordalops"];   // staf yang melihat papan dan mengundang (admin selalu)
export const UNDANG_JENDELA = HARI;              // jendela hitung UNDANG_HARIAN
export const DAFTAR_MAKS = 200;                  // baris daftar anggota, undangan, dan antrean tinjau per jawaban
export const UNDANG_PER_NOMOR = 3;               // undangan ke satu nomor tujuan per jendela, lintas pengundang
export const LAJU_IP_BACA = [[JAM, 120]];        // GET daftar undangan, anggota, antrean tinjau per alamat (bucket terpisah dari tulis)
/* PM-13 sampai PM-16: atur sandi, hapus akun, bukti ulang, kode lewat email (ALGORITMA §2.4, §6, §7) */
export const LAJU_IP_SANDI_BARU = [[JAM, 20]];   // POST /api/masuk/sandi_baru per alamat
export const LAJU_AKUN_SANDI_BARU = [[JAM, 10]]; // per akun umum
export const LAJU_IP_HAPUS = [[JAM, 20]];        // POST /api/masuk/hapus per alamat
export const BUKTI_ULANG = 180 * HARI;           // anggota yang selama ini tidak masuk ke akun lembaganya diperiksa ulang
export const LAJU_IP_KODE_EMAIL = [[JAM, 20]];   // POST /api/masuk/kode_email per alamat (sebelum Turnstile)
export const LAJU_NOMOR_KODE_EMAIL = [[15 * MENIT, 3], [HARI, 8]];   // per nomor, dihitung untuk semua permintaan (alamat cocok atau tidak)
export const LAJU_GLOBAL_KODE_EMAIL = [[JAM, 100], [HARI, 500]];     // kode email semua orang; Resend punya kuota sendiri
export const SANDI_MIN = 10;                     // sama dengan aturan sandi pendataan dan kampus (diperiksa modul masing-masing)
export const LAJU_IP_SAYA = [[JAM, 300]];       // GET /api/masuk/saya per alamat (juga ?lunak=1, probe halaman lain)
