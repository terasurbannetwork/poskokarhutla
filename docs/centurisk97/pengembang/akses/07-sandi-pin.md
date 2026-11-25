# Sandi, sesi, dan PIN profil

Halaman ini menguraikan metode sandi, penguncian, sesi, dan PIN profil BPBD.

## M4. Sandi, penguncian, dan sesi

Sandi akun instansi dan staf dihitung `hashSandi(garam, sandi)` dan hanya hash yang disimpan. Hash tetap dihitung untuk username tak dikenal supaya waktu jawaban tidak membedakan. Sandi diverifikasi lebih dulu; sandi benar selalu masuk walaupun penghitung gagal penuh, dan 429 hanya muncul di jalur salah.

| Kunci hitung gagal | Batas per jam |
| --- | --- |
| username dan IP | 8 |
| username saja | 200 |
| IP saja | 30 |

(`LAJU_LOGIN` di `src/instansi.js:148`, nilai staf sama di `src/staf.js:121`.) Sesi akun instansi dan staf berlaku 30 hari. Sandi baru dibuat acak oleh server (bukan pilihan pengguna), tampil sekali, dan mencabut sesi lain. Sandi pendataan dan kampus dipilih sendiri, minimal 10 karakter (`SANDI_MIN`). Atur sandi lewat `/masuk` mensyaratkan masuk dengan kode dalam 15 menit terakhir.

Pengamanan permintaan: kiriman bersesi instansi dan LogPal wajib header `x-pb: 1`; `Origin` harus sama situs; kuki `sesi_instansi` hanya berlaku pada Path `/instansi` dan `/api/instansi`, sehingga semua rute akun instansi wajib di bawah `/api/instansi`.

## M5. PIN profil BPBD

Aturan PIN (`pinSah`, `src/profil.js:29`): tepat 6 angka. Ditolak: semua angka sama, deret naik atau turun (melingkar 9 ke 0), pola berulang seperti 121212, 123123, 112233, palindrom seperti 123321, dan sama dengan 6 angka terakhir nomor HP profil itu. PIN sementara dari admin dibangkitkan acak seragam (nilai di atas 4.000.000.000 dibuang supaya tanpa bias modulo) dan diulang sampai lolos `pinSah`.

Penyimpanan: HMAC-SHA256 bergaram per profil, berkunci rahasia `PROFIL_KUNCI` (minimal 32 karakter; kurang dari itu 503 dan tidak ada baris ditulis). Perbandingan memakai `samaPanjang` (waktu tetap).

Percobaan dihitung dulu lewat reservasi atomik (`pfReservasiPin`), baru dibandingkan, sehingga tebakan serentak tidak melampaui batas.

| Besaran (`src/profil_konst.js`) | Nilai |
| --- | --- |
| Profil bukan dicabut per akun | paling banyak 4 |
| Profil lengkap sebelum kirim | 3 |
| Salah beruntun per profil dan IP | 5 dalam 15 menit, lalu terkunci sampai jam buka |
| Salah dalam satu hari kalender WIB | 10, lalu terkunci sampai admin membuka |
| Sesi profil | 12 jam |
| Batas PIN per akun, per IP | 30, 60 per jam |
| Buat profil, ubah profil, unggah foto, ajukan | 12, 60, 20, 20 per jam per akun |
| Retensi log profil | 730 hari |

Rute akun-level tidak pernah menerima `akun_id` dari klien. "Profil tidak ada" dan "profil bukan milik akun ini" dijawab sama (403). Foto hanya JPEG, EXIF dibuang, tanpa vektor wajah dan tanpa pencocokan wajah (K8). Log `instansi_profil_log` hanya menambah (trigger menolak UPDATE dan DELETE untuk baris berumur kurang dari 730 hari); isi badan, pesan, foto, dan PIN tidak pernah masuk.

Kunci harian per profil dapat dipakai pemegang sandi lembaga untuk mengunci profil rekannya sampai admin membuka; risiko ini diterima dan terlihat di log (catatan `ponytail` di `src/profil.js`).
