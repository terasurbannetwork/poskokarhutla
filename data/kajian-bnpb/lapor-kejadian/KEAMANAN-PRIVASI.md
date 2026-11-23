# KEAMANAN-PRIVASI: Kejadian dari Laporan Warga

Melengkapi `lapor-ai/KEAMANAN-PRIVASI.md`. Perubahan utama: untuk laporan terverifikasi BPBD saja, D7 dan Q11
dilonggarkan oleh K86 dan K87. Bagian ini menulis yang tetap dilindungi.

## 1. Yang berubah dan yang tetap

| Hal | Sebelum | Sesudah paket ini |
| --- | --- | --- |
| Laporan belum terverifikasi BPBD | tidak publik, tidak membuat kejadian resmi | SAMA |
| Laporan terverifikasi BPBD | tidak publik (D7), kecuali ditindaklanjuti atau selesai di Alun-alun (Q14) | boleh tampil di halaman hari ini tanpa data pribadi (K86); boleh diusulkan ke Buku Besar oleh staf (K87) |
| Nama, WA, koordinat pelapor, foto, kronologi, catatan petugas | tidak publik | SAMA, tanpa pengecualian |
| Pembuatan kejadian resmi | hanya pencocok otomatis menempel (D29) | usulan staf boleh mendirikan; hanya lewat pencocok; fase `terdeteksi` |
| Alun-alun | Q14 | tidak diubah |

## 2. Data pribadi

Tidak pernah keluar dari Worker ke halaman publik: nama, nomor WA (utuh atau disamarkan), peran, jabatan, nomor tiket `LA-`,
koordinat pelapor, ketelitian lokasi, foto dan video beserta lencana, transkrip, teks bebas, catatan pengecekan, nama petugas,
identitas perangkat, IP. Daftar putih ada di `DESAIN-TEKNIS.md` bagian 5; objek publik dibangun dari kosong sehingga kolom baru tidak bocor sendiri.

Gerbang uji "tanpa bocor": uji memberi laporan dengan semua kolom terisi nilai penanda unik (nomor WA, nama, nomor tiket, koordinat pelapor, catatan) lalu menyatakan tidak ada penanda itu di seluruh teks jawaban JSON dan HTML halaman (`RENCANA-UJI.md`).

## 3. Risiko dan penahan

| Risiko | Penahan |
| --- | --- |
| Pelapor di desa kecil dikenali dari desa, jenis, dan menit kejadian | waktu dibulatkan ke jam untuk satu pelapor (Q19); tanpa foto, tanpa kronologi, tanpa RT/RW; lokasi hanya desa; titik pusat desa |
| Titik peta dikira lokasi pelapor | titik selalu pusat desa dari register wilayah, tidak pernah koordinat laporan (pola D84) |
| Laporan palsu lolos verifikasi | verifikasi hanya akun lembaga BPBD yang wilayahnya cocok, catatan wajib, `bpbd_klaim` (D19) tidak cukup; tarikan cepat (D8) |
| Akun BPBD disalahgunakan | log akses dan riwayat pengecekan (D95, D108) tetap; pengecekan append-only |
| Angka dikutip wartawan sebagai angka resmi korban | label "Menurut laporan warga, tidak dijumlah dan bukan data resmi korban" di tiap kartu; tanpa total; tidak ada angka dari sumber lain di halaman yang sama (A5) |
| Halaman kosong dibaca sebagai "tidak ada kejadian" | teks keadaan kosong menyatakan sebaliknya (DESIGN-SYSTEM bagian 2) |
| Penyalahgunaan batas laju atau peningkatan baca D1 | cache tepi 60 detik, batas laju per IP 120 per jam, saklar mati menjawab 404 (DESAIN-TEKNIS 4, 7) |
| XSS lewat nama wilayah atau subjenis | semua teks dari data luar dimasukkan lewat `textContent`, tidak pernah `innerHTML` (pemeriksa `security-reviewer`) |
| Penandaan salah satu laporan menarik seluruh kejadian | tarikan per kejadian laporan, dapat dicabut, jejak append-only |
| Wilayah mengikuti isian pelapor yang bisa dipalsukan | hak wilayah pemeriksa diperiksa dari kode wilayah laporan di server (D95), bukan dari isian |
| Usulan memasukkan angka warga ke Buku Besar sebagai angka resmi | dampak dikosongkan di rekaman (A6); label keyakinan "laporan warga, diverifikasi BPBD" |
| Dua klik mendirikan dua kejadian resmi | kunci unik `lk_usulan`; pencocok mengecek `(sumber, kode)` sudah ada (`pasang.py:272`) |
| Kejadian resmi didirikan dari satu laporan keliru | fase `terdeteksi`, tidak naik otomatis (U16); staf Siklus bisa membatalkan atau menggabung lewat fungsi yang sudah ada |

## 4. Hak akses

| Tindakan | Siapa | Dicek di |
| --- | --- | --- |
| Baca halaman dan `GET /api/lapor/hari-ini` | siapa saja | batas laju |
| Tarik atau tampilkan lagi | staf BNPB; akun BPBD wilayah laporan | Worker per permintaan, wilayah dari kode wilayah laporan |
| Usulkan ke Buku Besar | staf berhak (Q11) | Worker; izin sama dengan peran siklus antrean (`PDKO`) |
| Putuskan antrean | peran siklus yang sudah ada | `src/siklus_kejadian.js:470` |
| Lihat nomor WA pelapor | tidak berubah: layar petugas saja (Q12 paket induk) | `src/hak.js` |

## 5. Retensi

`lk_tarik` dan `lk_usulan` tidak memuat data pribadi pelapor (hanya kode, nomor tiket, jenis, kab, nama lembaga, nama akun petugas).
Nomor tiket di `lk_usulan.anggota` terhapus dari makna pribadi saat data pribadi laporan dihapus menurut aturan paket induk
(5 tahun sesudah penutupan, K9 paket `lapor-lanjutan`, dan perintah `hapus data` pelapor); baris `lk_*` tidak membocorkan isi laporan.
Permintaan hapus data oleh pelapor menarik kartunya dari halaman publik pada muat berikutnya karena laporan tidak lagi memenuhi D4.

## 6. Yang tidak dilakukan

Tidak membaca WA masuk baru; tidak mengirim notifikasi ke wartawan; tidak menandai orang; tidak memakai AI untuk memutuskan terverifikasi atau tayang (kode memegang alur); tidak menulis "aman" di layar; tidak ada skor gabungan; tidak ada pengusulan otomatis.

## 7. Pemeriksa

`security-reviewer` (rute publik, header, XSS, kebocoran), `guard-api` (rute baru: metode, hak, validasi, laju), `migrasi-idempoten` (tabel baru), `selera-angka` (label dan angka), `inp-reviewer` (saring jenis dan peta). Pengulas melapor, tidak auto-fix (AGENTS 6).
