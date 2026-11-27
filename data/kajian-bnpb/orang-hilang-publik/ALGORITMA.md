# ALGORITMA: Orang hilang publik

Semua fungsi di bawah murni (tanpa D1, tanpa jaringan) kecuali bagian 7, dan hidup di `src/orang_hilang_murni.js` supaya bisa diuji tanpa Worker. Angka yang ditandai HIPOTESIS bukan hasil ukur dan diubah lewat konstanta tunggal di berkas itu.

## 1. Kelas orang dan anak

`kelasUmur(umur, kategori)`:

| Masukan | Kelas |
| --- | --- |
| umur bilangan 18 atau lebih | `dewasa` |
| umur bilangan 0 sampai 17 | `anak` |
| umur `Tidak tahu`, kosong, atau di luar 0 sampai 120 | `anak` (anggap anak sampai petugas memutuskan; D7) |
| kategori "balita, anak, remaja" tanpa angka | `anak` |

Kosong tidak pernah jadi 0. Kelas bukan vonis; petugas dapat mengubah kelas dengan alasan tercatat.

## 2. Bidang publik (daftar putih, D4)

`BIDANG_PUBLIK` per kelas. Fungsi `profilPublik(baris, kelas, pilihan)` mengembalikan objek **baru** hanya dengan kunci di bawah; kunci lain tidak ada. Bawaan K112 + Q1 sampai Q5.

| Bidang | dewasa | anak | Bentuk di publik |
| --- | --- | --- | --- |
| `nama` | nama lengkap (Q1) | inisial nama saja (Budi Santoso menjadi "B. S.") | teks |
| `panggilan` | ya | ya | teks |
| `foto` | sampai 3 terpilih dan lolos | tidak ada | URL turunan |
| `umur` | rentang 5 tahun (23 menjadi "20 sampai 24") | kategori (balita, anak, remaja) | teks |
| `kelamin` | ya bila diisi | **tidak** (Q5) | teks |
| `tinggi` | rentang 10 cm | **tidak** (Q5) | teks |
| `pakaian` | ya, teks tinjauan | ya | teks |
| `ciri` | hanya sesudah ditinjau | tidak | teks |
| `lokasi` | kecamatan dan kab/kota (Q3) | kecamatan dan kab/kota | teks |
| `waktu` | tanggal terakhir terlihat (tanpa jam) | tanggal | tanggal |
| `kejadian` | jenis, kab, tanggal mulai | sama | teks |
| `id` | token acak 16 byte (bukan id berurutan, Q17) | sama | token |

**Tidak pernah ada** di keluaran publik: `nomor_pencari`, `nomor_dicari`, `hubungan`, `berat`, `lokasi_terakhir` rinci, titik, `ciri` tak ditinjau, foto selain terpilih, status internal, nama pelapor. Uji: tanda tangan kunci keluaran sama dengan daftar di atas, bukan "tidak memuat kunci terlarang" saja (daftar putih, bukan daftar hitam).

Pembulatan: `rentangUmur(u) = [floor(u/5)*5, floor(u/5)*5+4]`, `rentangTinggi(t) = [floor(t/10)*10, +9]`. Nilai tidak diketahui tampil "belum diketahui", bukan 0.

## 3. Penyaring bencana (K116, D24 sampai D27)

Masukan: kab/kota lokasi terakhir terlihat (`kab`, kode 5 karakter), tanggal laporan, daftar kejadian dari rute baca sempit (OH-03). Keluaran: daftar kandidat untuk dipilih pelapor dan keputusan kelayakan.

Daftar kandidat: kejadian Buku Besar `sk_kejadian` yang
1. menyentuh `kab` (cocok `kab4` kejadian dengan kab laporan, sesuai pola `sk_kejadian` kab4), dan
2. berada dalam jendela: `mulai >= laporan - JENDELA_HARI` (HIPOTESIS 30 hari, Q22) **atau** fase masih aktif (belum `pasca`), dan
3. berjenis di `JENIS_SAH` bencana (bukan kecelakaan atau kasus non-bencana; Q23).

Urut: fase aktif dahulu, lalu terbaru. Paling banyak 8; sisanya lewat "bencana lain yang belum terdaftar".

Kelayakan tayang `layak(oh)`: benar hanya bila `oh.kejadian_id` terisi **dan** `oh.kejadian_oleh` terisi (petugas). Pilihan pelapor "belum terdaftar" menghasilkan `kejadian_id = null`; petugas boleh menautkan ke kejadian yang ada. Pilihan "bukan karena bencana" tidak menyimpan apa pun.

Pencocok kejadian: tidak ada yang baru. Fungsi kandidat memanggil pembaca yang ada (`src/kejadian_tautan.js`), dan `oh_publik` didaftarkan sebagai sumber `orang_hilang` hanya untuk tautan; sumber ini tidak membuat kejadian dan tidak mengubah fase (ditegakkan di gerbang ingest `src/siklus_kejadian.js`, seperti sumber `alun`).

## 4. Status tayang dan turun otomatis (K113 sampai K115)

Tabel transisi `PINDAH`:

| Dari | Ke | Syarat |
| --- | --- | --- |
| `draf` | `menunggu` | persetujuan versi sah tercatat, kejadian dipilih |
| `menunggu` | `tayang` | `layak`, aksi petugas dengan hak `tayang`, bendera `OH_PUBLIK` hidup |
| `menunggu` | `draf` | petugas "Minta perbaikan"; pelapor memperbaiki di Laporan saya lalu mengirim ulang (kembali ke `menunggu`) |
| `menunggu` | `turun` | ditolak atau dicabut |
| `tayang` | `turun` | status `lapor_cari` menjadi ditemukan atau tutup, dicabut, kedaluwarsa, dilaporkan, diturunkan petugas |
| `turun` (kedaluwarsa) | `menunggu` | pelapor menayangkan lagi, persetujuan sah |

Selain tabel ini ditolak. `turunOtomatis(statusCari)`: benar hanya untuk `ditemukan_selamat`, `ditemukan_meninggal`, dan `tutup` (K115); salah untuk `buka` dan `ke_sar` (Q25). Fungsi dipanggil di dua tempat: di jalur ubah status (`cariStatus`) dalam permintaan yang sama, dan oleh cron menit 17 untuk menyapu `oh_publik` berstatus `tayang` yang laporan induknya sudah ditemukan atau ditutup (bukan `ke_sar`). Kedaluwarsa: `tayang_waktu + MASA_TAYANG_HARI` (HIPOTESIS 30 hari, Q4).

Persetujuan sah: `versi === SETUJU_VERSI` dan tidak dicabut. Bila `SETUJU_VERSI` dinaikkan, persetujuan lama tidak sah untuk tayang ulang (profil lama tidak otomatis turun, tetapi tidak bisa diperpanjang tanpa persetujuan ulang).

## 5. Bentuk profil anak dan wali

`profilAnak`: bidang di bagian 2, kolom `anak`; himpunan kunci anak persis: `id`, `nama` (inisial), `panggilan`, `umur` (kategori), `pakaian`, `lokasi`, `waktu`, `kejadian` (sejalan Q5: tanpa kelamin, tinggi, foto, ciri). `waliSah`: pelapor menyatakan wali dan petugas mencatat verifikasi (telepon atau tatap muka) di `oh_riwayat`; tanpa catatan itu `layak` salah untuk kelas `anak` walaupun kejadian terkonfirmasi.

## 6. Saran kandidat cocok (hilang lawan ditemukan), lapis 1

Skor bukan angka tunggal: `alasan` berupa daftar boolean dan jarak. Untuk pasangan (hilang H, ditemukan T):

| Alasan | Aturan |
| --- | --- |
| `kab` | `T.kab` sama dengan `H.kab` atau bertetangga (daftar tetangga kab dari tabel wilayah, bukan jarak titik) |
| `waktu` | `T.waktu_temu` sesudah `H.waktu_terakhir` dan selisih paling lama `JENDELA_TEMU_HARI` (HIPOTESIS 21 hari) |
| `kelamin` | sama, atau salah satu tidak diketahui (tidak diketahui tidak menggugurkan) |
| `umur` | rentang saling beririsan dengan toleransi 5 tahun; tidak diketahui tidak menggugurkan |
| `pakaian` | hanya ditampilkan bila kedua pihak mengisi; **tidak dipakai menggugurkan** (orang berganti pakaian) |

Pasangan ditampilkan sebagai saran bila `kab` dan `waktu` benar dan tidak ada ketidakcocokan pasti pada `kelamin` atau `umur`. Urut menurut jumlah alasan benar, bukan angka. Nama dan nomor **tidak pernah** dipakai (AGENTS 2.15). Hanya petugas melihat saran; petugas memutuskan.

## 7. Cari lewat foto (D12), lapis 2, di belakang `OH_FOTO`

1. **Prasyarat**: sesi `/masuk` hidup; batas laju Q12 (`1 jam: 3, 1 hari: 10` per nomor, `1 jam: 30` per IP).
2. **Ciri dari foto penanya**: panggilan model yang ada untuk ciri (K105) mengembalikan rentang umur, kelamin tampak, rambut, ciri khusus; **tanpa nama**.
2b. **Penghenti anak (D32)**: bila perkiraan kelas umur dari ciri adalah `anak` atau `tidak_jelas` (juga bila model tidak menjawab kelas), pencarian **berhenti di sini**, tidak ada pembanding, dan penanya diarahkan ke petugas ("Foto ini sebaiknya diperiksa petugas").
3. **Saringan terstruktur**: dari profil `tayang` dewasa (anak dikecualikan dari pembanding, Q5), saring yang tidak bertentangan pasti dengan ciri (kelamin, rentang umur dengan toleransi). Urut dengan kecocokan ciri, ambil **maksimum 5** (`KANDIDAT_MAKS`, HIPOTESIS).
4. **Pembanding visual**: satu panggilan model dengan foto penanya dan sampai 5 foto kandidat turunan publik. Perintah: nilai kemiripan ciri yang tampak per kandidat, jawab hanya salah satu dari `mirip`, `sedikit`, `tidak`, `tidak_bisa`, beri satu kalimat alasan berbasis ciri, **jangan menyebut identitas**. Jawaban di luar daftar diabaikan (isi tidak pernah dipercaya).
5. **Susun hasil**: ambil `mirip` lalu `sedikit`, paling banyak 3. Bila tak ada, jawaban "tidak ada yang tampak mirip" **tidak** berarti orang itu tidak dicari.
6. **Catat**: `oh_cari_foto` menyimpan sha nomor, waktu, jumlah kandidat, tingkat tertinggi, tanpa foto, tanpa ciri, tanpa id profil kecuali bila penanya menekan "Hubungi petugas".

Kegagalan model (galat, waktu habis, penolakan kebijakan): jawaban "Pencarian foto sedang tidak bisa dipakai" dan laporan galat tanpa foto di log. Hasil tidak pernah dipaksa.

Jaminan yang diuji: fungsi susun hasil tidak menerima foto; tidak ada jalur kode yang menyimpan foto penanya; tingkat hanya dari daftar tertutup; maksimum 3 profil.

## 8. Pembersihan

| Data | Aturan |
| --- | --- |
| Foto publik turunan | dihapus bersama turun; sapuan cron menghapus sisa yatim lebih dari 1 jam |
| `oh_publik` baris | dianonimkan bersama `lapor_cari` (Q67, 730 hari sesudah ditutup); bidang publik tersalin dikosongkan |
| `oh_temu`, `oh_temu_foto` | 730 hari sesudah `ditutup_waktu`: kolom pribadi dikosongkan, berkas R2 dan baris foto dihapus |
| `oh_cari_foto` | 90 hari (HIPOTESIS), hanya statistik laju |
| `oh_info` | 180 hari sesudah selesai ditangani (HIPOTESIS), nomor pemberi dikosongkan |
| `oh_riwayat` | append-only; `catatan` = alasan baku plus teks pendek 140 huruf yang disaring `samarkan` (D31); catatan dianonimkan bersama `oh_publik` dan `oh_temu`; barisnya tidak dihapus |
