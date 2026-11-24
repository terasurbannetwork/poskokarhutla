# PRD: Kejadian dari Laporan Warga

Lingkup mengikuti K85, K86, K87 di `KEPUTUSAN-LAPOR-KEJADIAN.md`. Yang tidak tertulis di sini tidak dibuat.

## 1. Tujuan

1. Laporan warga yang berulang di satu desa terbaca sebagai satu kejadian dengan jumlah pelapornya (K85).
2. Wartawan dan warga punya satu halaman hari ini berisi hanya laporan yang sudah diverifikasi BPBD, tanpa data pribadi (K86).
3. Staf bisa mengusulkan kejadian laporan yang sudah diverifikasi BPBD menjadi kejadian resmi dengan satu klik, tanpa membuat buku kejadian kedua (K87).

## 2. Peran

| Peran | Melihat | Melakukan |
| --- | --- | --- |
| Pembaca publik (wartawan, warga) | halaman `/lapor/hari-ini` | membaca, membagikan, mencetak |
| Staf BNPB meja | kejadian laporan, pelapor, status usulan | menarik dari halaman publik, mengusulkan ke Buku Besar bila berhak (Q11) |
| Akun BPBD kab/kota atau provinsi | kejadian laporan di wilayahnya | memverifikasi (sudah ada), menarik dari halaman publik di wilayahnya |
| Staf Siklus (peran antrean) | usulan di antrean tinjau | memilih kandidat atau mendirikan kejadian |
| Pelapor | tidak ada tampilan baru | laporannya bisa tampil tanpa identitas bila terverifikasi |

## 3. Fitur

| ID | Fitur | Keputusan | Larangan |
| --- | --- | --- | --- |
| F-1 | Aturan satu desa di pengelompokan laporan | K85, D2, D3 | Tidak mengubah radius dan jendela lama; satu nomor tidak mendirikan gugus sendirian |
| F-2 | Jumlah pelapor di meja: "N pelapor" pada kepala kejadian laporan | K85 | Tidak menjumlah angka dampak |
| F-3 | Definisi terverifikasi BPBD (fungsi tunggal) | D4 | Tidak ada definisi kedua di layar mana pun |
| F-4 | Halaman `/lapor/hari-ini`: daftar dan peta kejadian laporan terverifikasi 24 jam terakhir | K86 | Tanpa nama, WA, nomor tiket, koordinat pelapor, foto, kronologi bebas, catatan petugas |
| F-5 | Label sumber di tiap kartu: "Laporan warga, diverifikasi BPBD (nama kab/kota)" | K86 | Tidak ditulis "resmi" atau "terkonfirmasi BNPB"; tidak ada total korban hari ini |
| F-6 | Tarik dari halaman publik (staf BNPB dan BPBD wilayah) | D8 | Tidak menghapus laporan; tarikan append-only |
| F-7 | Saklar rilis halaman publik dan usulan | D12 | Tanpa saklar tidak dirilis |
| F-8 | Tombol "Usulkan ke Buku Besar" di rincian meja untuk kejadian laporan yang punya laporan terverifikasi | K87 | Bukan tombol "buat kejadian"; hanya usul yang diproses pencocok |
| F-9 | Status usulan di meja: diusulkan, terpasang ke kejadian resmi KJ-..., didirikan baru, menunggu tinjau, tanpa wilayah | D11 | Tidak ada status buatan Worker |
| F-10 | Tautan dari meja ke kejadian resmi di `/siklus` | D11 | Tanpa menyalin isi Buku Besar |

## 4. Di luar lingkup

- Foto, video, dan galeri di halaman publik (Q8).
- Perubahan Alun-alun K30 (Q10).
- Notifikasi push atau WA ke wartawan.
- Unduhan, JSON, RSS (Q17).
- Penaikan fase kejadian resmi ke terverifikasi (tetap staf, U16).
- Skor gabungan atau "tingkat keyakinan" angka.
- Penggabungan angka laporan warga dengan DIBI, logbook, BMKG, atau titik panas.
- Membuat kejadian resmi dari laporan yang belum terverifikasi BPBD.
- Pengusulan otomatis tanpa klik staf.
- Mengubah ambang radius dan jendela lama A9.

## 5. Ukuran keberhasilan

Bukan klaim; diukur dari data F0 sesudah rilis, ditulis "belum tersedia" sampai ada:

| Ukuran | Cara hitung |
| --- | --- |
| Persentase pasangan laporan yang oleh staf dinilai "satu kejadian" dan dikelompokkan aturan desa | sampel penilaian staf lawan keluaran A9 (menyetel Q1) |
| Median menit dari verifikasi Valid sampai tayang di halaman publik | dua stempel waktu tersimpan |
| Jumlah tarikan staf per 100 kartu tayang | `lk_tarik` |
| Persentase usulan yang menempel, berdiri baru, atau masuk antrean | `sk_kejadian_sumber` sumber `lapor_ai` |

## 6. Prinsip

Tanpa data dummy dan tanpa tombol uji. Tidak pernah menulis "aman" di layar publik; keadaan kosong ditulis
"Belum ada laporan terverifikasi dalam 24 jam terakhir. Ini bukan berarti tidak ada kejadian." Tanpa kalimat
kesimpulan di kepala kartu (AGENTS 3.5): kepala kartu adalah nama seksi.
