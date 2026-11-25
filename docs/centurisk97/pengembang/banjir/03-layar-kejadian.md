# Layar kejadian, DAS, pos, Kaji Cepat

Halaman ini menjelaskan layar kejadian aktif, bukti DAS, replay, laporan harian, pos sungai, dan Kaji Cepat.

## Kejadian banjir aktif (`/banjir/k/B0007`, contoh kode)

Siapa: publik. Kejadian aktif adalah gugus kecamatan bersebelahan yang berstatus Siaga atau lebih hari ini. Klik gugus pada peta atau buka tautan dengan kode `B` dan nomor. Kartu memuat tingkat tertinggi, jumlah kecamatan, penduduk, hujan 3 hari, indeks bahaya, titik sungai, dan skor 0 sampai 100 yang rumusnya terbuka (Metode 8). Kejadian yang tidak lagi Siaga hilang dari berkas; bila gugus yang sama muncul lagi, ia kejadian baru dengan nomor baru.

## Bukti DAS hulu (`/banjir/laporan-das.html`)

Siapa: publik. Untuk daerah langganan banjir, halaman memuat batas daerah tangkapan di hulu, hutan hilang per tahun, konsesi di hulu, dan citra satelit sebelum dan sesudah dengan penggeser (`public/banjir/bukti.js`, data `public/banjir/data/bukti/`). Citra radar menampilkan "gelap baru" sebagai indikasi, bukan luas banjir resmi.

## Replay banjir Jabodetabek (`/banjir/replay.html`)

Siapa: publik. Pemutar ulang banjir 2 sampai 5 Maret 2025 di Jabodetabek di atas medan 3D (`public/banjir/replay.js`, data `public/banjir/data/replay/maret2025.json`). Pemutaran adalah rekonstruksi untuk pembelajaran, bukan prakiraan.

## Laporan harian (`/banjir/laporan.html`)

Siapa: publik. Laporan harian banjir, longsor, dan rob dengan jendela 14 hari dan metrik berupa keadaan harian maksimum (`scripts/banjir/laporan_banjir.py`). Hari tanpa catatan bernilai kosong, tidak diisi mundur. Tingkat kabupaten hanya diketahui untuk hari ini. Tidak ada tombol cetak atau ekspor khusus di kode halaman ini (belum terdokumentasi di kode).

## Pos tinggi air sungai (lapisan "Pos tinggi air")

Siapa: publik. Klik pos untuk membuka kartu dan grafik 24 jam (`/api/banjir/sungai-ukur/pos/<id>`). Pos yang macet atau lama tampil redup dan nilainya tidak dijadikan warna tingkat. Data berasal dari SIHKA Kementerian PU Ditjen SDA dan pos berambang resmi DSDA DKI serta SIPANTAU Tangerang.

## Kaji Cepat banjir per kejadian (`/siklus/kaji/:id`)

Siapa: staf (Pusdalops, Koordalops) dan BPBD untuk kejadian wilayahnya. Hak ubah status Kaji hanya Pusdalops dan Koordalops (`src/siklus_kaji.js:116-119`). Model yang ada hari ini adalah `banjir_jam1` (jam pertama, dari kecamatan Siaga atau Awas). Model `banjir_gfm` dari genangan satelit belum dibuat (Metode 15).

Arti: rentang jiwa [bawah, batas atas] dari sumber jiwa yang berdampingan, tanpa dijumlah. Tanpa kedalaman, tertulis "kedalaman belum tersedia". Label keyakinan selalu "estimasi-model" (`scripts/siklus/kaji_banjir.py`).
