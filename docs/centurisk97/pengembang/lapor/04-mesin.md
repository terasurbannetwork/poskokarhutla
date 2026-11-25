# Mesin percakapan, tiket, dan susulan

Halaman ini menjelaskan mesin percakapan yang dipegang kode, identitas pelapor, lokasi, siklus tiket, dan laporan susulan.

## Mesin percakapan: kode memegang alur, AI hanya mengurai

Sumber: pesan pelapor (teks, lokasi, foto) dan isian yang sudah ada di sesi. Berkas: `src/lapor_mesin.js`, `src/lapor_spek.js`.

Langkah satu putaran:

1. Perintah ditangani kode tanpa AI (`batal`, `ulang`, `kirim`, `belum tahu`, `tidak ada`, angka pilihan, lokasi, foto).
2. Teks pelapor disamarkan lebih dulu (alamat surel diganti `[email]`, nomor HP `[nomor HP]`, NIK 16 digit `[NIK]`; `src/samarkan.js:10`), lalu dikirim ke model dengan skema keluaran: daftar isian `{nama, nilai, kutipan}`, tebakan jenis, penanda darurat jiwa, penilaian topik pesan, dan satu id tanggapan (bukan kalimat).
3. Kode memvalidasi keluaran model (`src/lapor_mesin.js:51`): nama isian harus ada di spek dan berlaku untuk jenis laporan; kutipan harus ditemukan di teks pelapor; isian angka harus berada dalam batas wajar per isian dan angkanya harus muncul di kutipan (digit atau bilangan tertulis seperti "dua belas", `angkaDalam` di `src/lapor_mesin.js:30`), kecuali nilai 0 dengan kata negasi seperti "tidak ada"; isian teks hanya boleh memakai kata yang diucapkan pelapor. Yang gagal dibuang diam-diam dan isiannya tetap kosong.
4. Kode memilih isian berikutnya dari spek dengan urutan: wajib awal (jenis, subjenis, waktu, lokasi, kronologi), lalu kelompok korban, warga terdampak, pengungsian, kerusakan rumah, kelompok rentan, fasilitas dan jalan, layanan dasar, data khusus, kebutuhan. Isian yang sudah ditanyakan dua kali tanpa jawaban menjadi "belum didata".
5. Model tidak menulis kalimat ke pelapor. Ia hanya memilih satu id tanggapan (`simpati`, `terima_kasih`, `tenang`, `tidak_ada`), dan kalimatnya diambil dari tabel tetap `TANGGAPAN` di kode; id di luar tabel menjadi tanggapan kosong. Isian teks hanya boleh memakai kata yang diucapkan pelapor sendiri (`src/lapor_mesin.js:73-74` dan `80-84`).
6. Tanpa kunci model, mesin memakai pertanyaan templat dan penguraian angka sederhana; layanan tetap jalan.

Gerbang topik: layanan ini hanya mencatat laporan kejadian bencana. Model menilai topik tiap pesan (`bencana`, `bukan_bencana`, `minta_data`), dan kode juga menyaring tanpa model pesan yang jelas meminta data, membelokkan asisten, atau menyuruh tugas umum. Pesan di luar topik tidak masuk laporan dan dijawab kalimat tolak tetap (`TOLAK`). Sesudah 3 pesan di luar topik dalam satu sesi (`BATAS_LUAR`), sesi itu berjalan tanpa model dengan alur templat. Panggilan model juga dibatasi 30 per sesi (`BATAS_MODEL_SESI`). Pesan yang memuat kata kejadian atau angka tidak ditolak oleh saringan kode, tetapi diserahkan ke penilaian model. Rujukan: `src/lapor_mesin.js:78-90`, penerapan di `src/lapor_mesin.js:779-792`.

Model: gerbang `src/lapor_model.js:9` memanggil Claude Messages API dengan keluaran terstruktur, batas waktu 15 detik, 2.048 token keluaran, dan model bawaan `claude-sonnet-5-5` (dapat diganti lewat variabel lingkungan model). Kunci API hanya di rahasia Worker; tanpa kunci model bernilai kosong. Pesan sistem di-cache sisi penyedia.

Status uji: perilaku mesin diuji tanpa jaringan di `tests/lapor/mesin.test.mjs`. Ketepatan penguraian model terhadap uji emas dengan model nyata belum terdokumentasi di kode; ambang yang berkaitan dengan "putaran wajar" (selesai dalam 5 menit dan paling banyak 8 balasan) adalah target PRD, bukan hasil ukur.

## Identitas pelapor dan tingkat sumber

- `lapor_pelapor` menyimpan nama, peran, kab, dan jabatan per nomor; hanya terlihat oleh staf monitoring, tidak masuk log, tidak masuk `public/data`, dan tidak dikirim ke model.
- Tingkat sumber: `bpbd` bila nomor dikonfirmasi admin di `lapor_izin` (`naikBpbd`, `src/lapor_ai.js:203`), `bpbd_klaim` bila pelapor hanya memilih peran BPBD, selain itu `warga`. Nomor ketikan di web tidak pernah dinaikkan menjadi `bpbd`.

## Lokasi dan wilayah

Sumber: `public/geo/provinsi.json` (poligon provinsi), `public/geo/desa/<kab>.json` (poligon desa), `public/data/desa_cari.json` (nama desa, kecamatan, kab). Koordinat dipetakan ke provinsi, kab/kota, kecamatan, dan desa lewat uji titik-dalam-poligon (`src/lapor_wilayah.js`). Batas disederhanakan dan bukan batas resmi desa, jadi pelapor selalu mengonfirmasi dan desa sekitar ditawarkan sebagai pilihan. Titik valid bila lintang antara -12 dan 7 serta bujur antara 94 dan 142 pada penerima API (`titikSah`, `src/lapor_ai.js`). Pengetikan nama tempat dicocokkan ke `desa_cari.json`: satu cocok diterima sebagai ketelitian "perkiraan tingkat desa", beberapa cocok menjadi pilihan.

## Tiket, status, dan dokumen

Status tiket: baru, dilihat, ditelaah, diteruskan, ditindaklanjuti, selesai, tidak_valid (`src/lapor_tampil.js:13`). Peralihan yang sah (`src/lapor_tampil.js:16`):

![Peralihan status tiket laporan dari baru sampai selesai atau tidak valid, termasuk pembukaan kembali ke ditelaah](gambar/lapor-status.svg)

Status "dilihat" otomatis tertulis saat petugas membuka laporan baru (aksi `lihat`, dicatat sesudah penangan sukses). Membuka kembali tiket Selesai atau Tidak valid ke Ditelaah wajib dengan catatan. Riwayat tiket (`lapor_tiket_riwayat`) hanya bertambah. Pengiriman laporan ditulis dalam satu batch D1 (versi 1, nomor, tiket, riwayat awal, antrean dokumen); gagal satu berarti gagal semua. Nomor `LA-DDMMYY-NN` urut per tanggal WIB dari tabel `lapor_urut`.

Dokumen PDF dan Word dirakit di Mac mini oleh `scripts/wa/lapor_pdf.mjs` yang menarik antrean `GET /api/lapor/pdf/antre`, menjalankan `scripts/lapor/dokumen.py` (python-docx lalu LibreOffice), dan mengunggah hasilnya. Percobaan gagal diulang sesudah 5 menit, paling banyak 3 kali; laporan tetap sah tanpa dokumen.

## Susulan

Syarat dan perilaku ada di `src/lapor_tampil.js:19` dan `simpanSusulan` (`src/lapor_ai.js:232`): jendela 72 jam, kurang dari 10 versi, isian terkunci (jenis, subjenis, lokasi, waktu, RT/RW). Satu batch menulis versi baru, ringkasan perubahan, baris riwayat tiket bercatatan "susulan v{n}", dan antrean dokumen untuk versi itu. Kunci (nomor, versi) menolak dua susulan serentak; yang kalah mengulang.
