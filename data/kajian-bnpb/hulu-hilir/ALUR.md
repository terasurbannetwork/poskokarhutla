# ALUR: Hulu ke hilir per kejadian

## 1. Pipeline (dijalankan manual dan per kejadian; tidak ada cron, Q11)

1. Staf (PD atau KO) menandai kejadian banjir atau banjir bandang di Buku Besar sebagai "kaji hulu ke hilir", atau pipeline dijalankan manual dengan `--kj <KJ-...>`. Kejadian harus berfase tanggap atau lebih.
2. Pilih DAS (ALGORITMA 1): dari kecamatan genangan terbesar (data `banjir_gfm` bila ada, kalau tidak dari kecamatan anggota kejadian) tentukan sampai tiga sub-DAS keluaran. Staf boleh mengganti dengan kode HydroBASINS.
3. Susun DAS hulu: `indeks_basin`, `hulu`, `larutkan`, `sederhana`; luas dan titik keluaran divalidasi dengan `validasi` yang sama dengan Bukti DAS.
4. Ambil DEM: ubin GLO-30 yang menutupi bbox DAS ke `data/raw/banjir/dem/` bila belum ada (cache, tidak di-commit).
5. Cuplik Hansen (S=4) dan beri tiap titik cuplik penanda: kelas lereng, zona, dan tahun hilang; hitung per tahun per kelas per zona per sub-DAS.
6. Sempadan: ambil garis sungai (Q2) di dalam DAS, bentuk koridor 100 m kiri kanan, cuplik ulang Hansen di dalam koridor (S sesuai uji HH-04), hitung kelas sempadan per sub-DAS.
7. Label waktu: hasil per tahun dikelompokkan terhadap tahun kejadian Y (sebelum, tahun Y, sesudah). Bila alert tersedia (Q5), tahun Y dipecah menjadi sebelum tanggal mulai dan sesudahnya.
8. Hujan: IMERG 30 menit untuk jendela `[mulai - 3 hari, mulai + 3 hari]` (dengan token), CHIRPS harian jendela yang sama dan jendela peringkat. Bobot sel dari irisan sel dan DAS.
9. Genangan: baca `banjir_gfm` dari R2 (bukan hitung ulang); baca produk resmi UNOSAT atau Charter bila ada dan lisensinya jelas; gabungkan titik genangan dengan DEM untuk zona; hitung kilometer jalan dan desa tergenang untuk tiap sumber terpisah.
10. Paparan: ringkasan penduduk di area genangan diambil dari `banjir_gfm` (mesin paparan F2), tidak dihitung lagi di sini.
10a. Bekas longsor (K11): komposit Sentinel-2 sebelum dan sesudah menurut jendela Q21, deteksi objek oleh `lereng_kejadian.py` (D17), golongan tutupan sebelum (D19), jarak ke sungai dan pelebaran alur (D21), PNG lokasi (D22). Tanpa token dan tanpa unduhan besar bagian ini tidak jalan dan tertulis alasannya.
11. Uji bahaya: porsi sel genangan di kelas tinggi dan lawannya (ALGORITMA 8); hanya jalan bila kriteria terkunci (HH-11).
12. Susun keluaran: ringkasan ke `sk_kaji` (model `hulu_hilir`, status `dihitung`), rincian ke R2 `siklus/saji/kaji/<kj>_hulu_hilir_v<n>.json`, PNG peta ke R2 `siklus/saji/kaji_berkas/<kj>/hulu_hilir/v<n>/`.
13. Lintasan GFM baru, alert baru, atau produk resmi baru membuat versi baru (`versi` plus satu); versi lama tetap.

## 2. Status kaji

Sama dengan Kaji Cepat Siklus: `dihitung`, `diperiksa`, `dipakai`, `ditarik`. Ubah status hanya PD dan KO, tarik wajib alasan 3 sampai 300 karakter. Bagian yang kosong tidak membuat status gagal; ia tampil dengan alasannya.

## 3. Alur layar (staf)

1. Staf membuka `/siklus/kaji/:id`. Di bawah kartu Jam pertama dan kartu Genangan radar ada kartu "Hulu ke hilir" dengan pil "keadaan, bukan sebab" dan pil hipotesis.
2. Kartu menampilkan enam angka ringkas (dua baris tiga sel): luas DAS, persen hutan hilang tahun kejadian di lereng lebih dari 40 persen, persen hutan hilang yang berlabel "sebelum", puncak hujan IMERG, persen genangan di zona hilir, dan hasil uji bahaya (lulus, tidak terbukti, atau belum dinilai).
3. Tujuh segmen: Hutan dan lereng, Sempadan, Zona, Hujan, Genangan, Bekas longsor, Bahaya. Tiap segmen satu tabel atau satu bagan sederhana dengan tooltip (selera pemilik: tiap grafik interaktif).
4. Tombol "Cetak A4" membuka lampiran cetak yang sama dengan nomor versi dan tanggal data.
5. Dari kaji ulang (`public/siklus/kaji_ulang.js`) ada satu baris tautan "Hulu ke hilir versi n" bila ada; saat kaji ulang disahkan, enam angka ringkas dibekukan di potret bersama nomor versi.

## 4. Alur kosong

| Keadaan | Kartu |
| --- | --- |
| Belum ada lintasan GFM | "Genangan radar belum ada"; hutan, sempadan, hujan tetap tampil |
| DAS tidak terpetakan (kecamatan tak ada di HydroBASINS) | "DAS tidak dapat ditentukan untuk kecamatan ini"; bagian lain tidak jalan |
| Tanpa token Earthdata | Hujan IMERG "tidak tersedia di mesin ini"; CHIRPS tetap |
| Tahun kejadian di luar Hansen (2026 ke atas) | "Tahun kejadian belum tercakup data hutan"; tahun sebelumnya tetap tampil sebagai "sebelum" |
| Zona tidak ada di DAS | "Tidak ada area di atas 500 mdpl" |
| Produk resmi tidak tersedia sebagai data | "Produk resmi belum tersedia sebagai data" lengkap dengan sumber yang dicek dan tanggalnya |
| Citra sesudah berawan, tak ada adegan dalam jendela Q21 | "Citra sesudah belum cukup bersih"; atau hasil berlabel "perubahan antara dua tanggal" bila jendela dilebarkan |
| Kriteria ambang bekas longsor belum terkunci (Q19) | segmen Bekas longsor disembunyikan |
| Kriteria uji bahaya belum terkunci | bagian Bahaya disembunyikan, bukan diisi |
