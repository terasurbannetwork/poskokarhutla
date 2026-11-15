# ALGORITMA: Kaji ulang pasca-kejadian

Semua ambang kandidat di bawah adalah **HIPOTESIS** (Q1). Mesin hanya menyusun fakta; pelajaran dan rekomendasi selalu tulisan staf (D6). Prinsip tunggal: data yang tidak ada ditulis "tidak ada data", tidak pernah 0, dan angka dari sumber berbeda tidak dijumlah.

## 1. Kandidat kejadian besar (Q1)

Kejadian berfase transisi, pemulihan, atau selesai (sama dengan Q1 dan ALUR A1) yang memenuhi salah satu:

| Kriteria | Sumber |
| --- | --- |
| Menyentuh 3 kab atau lebih | `count(sk_kejadian_kab)` |
| Pernah ada sel Lifeline merah | `lf_riwayat` warna merah (bila tabel ada) |
| Masa tanggap lebih dari 7 hari | `tanggap_akhir - tanggap_mulai`; kosong salah satu = kriteria dilewati, tidak dihitung nol |
| Ditandai staf | tombol "Mulai kaji ulang" |

Alasan lolos ditampilkan sebagai daftar (bukan skor). Kejadian fase dibatalkan atau digabung tidak pernah kandidat. Kueri memakai indeks `sk_kej_mulai` dengan batas 120 kejadian terbaru, tanpa pindai penuh; bila tabel `lf_*` belum ada, kriteria itu dilewati dengan catatan.

## 2. Perakitan linimasa

Setiap peristiwa = `{waktu, tahap, sumber, ket, ref}`. Urut waktu naik. Potret beku dibatasi 100000 karakter: bila lebih, peristiwa terlama dipangkas dan potret memuat "n peristiwa tidak dimuat" (tidak diam). Peristiwa tanpa waktu tidak dimasukkan; ia dihitung di "celah" (bagian 4).

| Tahap | Peristiwa | Waktu dari |
| --- | --- | --- |
| deteksi | Kejadian tercatat | `sk_kejadian.dibuat` |
| deteksi | Deteksi per tugas (karhutla atau banjir menurut jenis tugas) | `waktuTahap(t).w.deteksi` (`src/sla.js:76`); `perkiraan = true` diberi tanda dan tidak dihitung di durasi |
| tugas | Tugas dibuka | `tugas_api.dibuat` |
| konfirmasi | Konfirmasi lapangan | `tugas_api.konfirmasi_pada` |
| respons | Kabar tindakan, tiba | `tugas_isian.dibuat`, `penugasan.tiba_pada` (peran saja, tanpa nama) |
| padam | Dilaporkan padam, muncul lagi, terverifikasi | `padam_pada`, `tugas_muncul.waktu`, `verif_pada` |
| fase | Perubahan fase | `sk_jejak` obyek kejadian aksi fase (waktu, dari, ke); bila hanya `fase_diubah` yang ada, satu peristiwa "fase terakhir" |
| layanan | Perubahan warna layanan dasar | `lf_riwayat.dibuat` (kab, layanan, warna; tanpa isi bukti warga) |
| koordinasi | Organisasi mulai berkegiatan, tawaran bantuan masuk | `tw_baris.mulai`, `tw_tawaran.dibuat` (hitungan per klaster, tanpa nama kontak) |
| pulih | Fase pemulihan dan selesai | `sk_jejak` fase |

Tugas terhubung: `sk_kejadian_sumber` dengan `sumber = 'tugas_api'`, `status = 'terpasang'`, `kejadian_id = KJ`. Satu kejadian paling banyak 200 tugas dibaca; lebihnya dicatat "n tugas tidak dimuat", bukan diam. Kata peristiwa mengikuti jenis tugas lewat `src/tugas_bencana.js` (`labelBencana`, `bencanaId`), bukan kata karhutla tetap. Tautan dibuat `pasang.py` secara berkala di luar Worker, jadi tugas yang baru dibuka bisa belum bertaut; draf menampilkan "belum bertaut ke kejadian" untuk jeda itu, bukan menganggap tugasnya tidak ada.

## 2a. Anggaran kueri

Tidak ada kueri per tugas. Tiap tabel sumber dibaca SEKALI per permintaan dengan `WHERE tugas_id IN (SELECT value FROM json_each(?))` (ID tugas terhubung sebagai JSON, maksimal 200), pola `muatTugas` dan `perkaya` di `src/sla.js`. Tabel: `tugas_api` (dengan subkueri tiba dan kabar), `tugas_isian`, `penugasan`, `tugas_muncul`, `ops_pelajaran`, ditambah `sk_kejadian`, `sk_kejadian_kab`, `sk_kejadian_sumber`, `sk_jejak`, `lf_riwayat`, `tw_baris`, `tw_tawaran`. Batas tetap: paling banyak 14 kueri D1 per permintaan baca draf, ditulis sebagai konstanta `MAKS_KUERI_DRAF` dan diuji (T9). Bagian lain (garis, permintaan, drop) tidak dimuat di draf; tersedia lewat tautan ke linimasa per tugas.

## 3. Durasi tahap

`durasiTahap` membutuhkan kolom yang sama dengan subkueri `muatTugas` (`src/sla.js:56-65`): `dibuat`, `konfirmasi_pada`, `padam_pada`, `verif_pada`, `padam_verif`, `terdeteksi_awal`, `himawari_awal`, `tiba` (min `penugasan.tiba_pada`), dan `kabar` (min `tugas_isian.dibuat` dengan `langkah = 'tindakan'`). Kueri per kejadian wajib menghasilkan kolom itu (satu kueri set-based, bagian 2a) dan menjatuhkan kolom awal bila migrasi 0043 belum ada, seperti `muatTugas`.

Untuk tiap tugas terhubung panggil `durasiTahap` (`src/sla.js:82`); ringkas per kejadian dengan `ringkasTahap` (`:91`) dan `persen`: n tugas yang punya durasi, median, persentil 90, dan hitungan dalam target hanya untuk tahap bertarget (tugas ke konfirmasi 6 jam, konfirmasi ke kabar 24 jam; `src/sla.js:25`). Tahap tanpa target tidak diberi vonis. Satu tugas tunggal tidak diberi persentil: tampil nilai dan "n = 1".

Durasi tingkat kejadian (tidak berasal dari tugas):

| Ukuran | Rumus | Bila tidak ada |
| --- | --- | --- |
| Deteksi ke fase tanggap | `fase tanggap` dikurangi `sk_kejadian.dibuat` | tidak ada data bila jejak fase tanggap tidak ada |
| Tanggap ke pulih | waktu fase pemulihan dikurangi waktu fase tanggap | sama |
| Layanan merah ke hijau pertama | per (kab, layanan), `lf_riwayat` | tidak ada data bila tidak pernah hijau |

Urutan terbalik (selesai tercatat sebelum mulai) = null, bukan nol dan bukan angka negatif, sesuai `durasiTahap`.

## 4. Celah data

Daftar tegas tahap yang tidak punya data: tiap tahap tanpa peristiwa, tiap tugas tanpa konfirmasi, tiap layanan tanpa riwayat padahal kab-nya terdampak, dan sumber yang tabelnya belum ada (migrasi belum terapan; pola `no such table` menghasilkan "belum diaktifkan", bukan 0). Celah menjadi bahan pertanyaan "apa yang kurang tercatat", bukan angka.

## 5. Catatan lapangan

Untuk tiap tugas terhubung baca `ops_pelajaran` (id, catatan, dibuat). Tampil sebagai kutipan dengan tanda "catatan lapangan", dan tombol "angkat" menyalin teksnya ke `ku_pelajaran` (D4). Kolom `oleh` tidak ditampilkan.

## 6. Angka antarsumber

Hitungan tugas (sistem kita), 3W (organisasi), dan Lifeline (status staf) tampil dalam kartu terpisah. Tidak ada total gabungan dan tidak ada skor kinerja gabungan.

## 7. Status rekomendasi

| Keadaan | Aturan |
| --- | --- |
| Terbuka | status `dl_tindak` belum atau proses |
| Tertutup | status selesai dan catatan penutup 20 sampai 300 karakter |
| Lewat tenggat | terbuka dan `tenggat` lebih kecil dari hari ini (WIB); tidak mengubah status |
| Tanpa tenggat | tidak diizinkan: tenggat wajib saat rekomendasi dibuat |

Tingkat penyelesaian = tertutup dibagi seluruh rekomendasi kejadian itu, ditulis "x dari n". Kejadian tanpa rekomendasi: "tidak ada data", bukan 100 persen.

## 8. Uji jujur

Sesudah 10 kejadian pertama yang disahkan, bandingkan kandidat Q1 dengan keputusan staf (berapa kandidat yang tidak dikaji, berapa kejadian di luar kriteria yang tetap dikaji) dan kalibrasi ambang.
