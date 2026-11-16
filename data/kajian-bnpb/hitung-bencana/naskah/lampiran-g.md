# Lampiran G. Sumber Data dan Catatan Metode

Semua jalur berkas relatif ke `data/kajian-bnpb/hitung-bencana/` kecuali yang diawali `data/`, `public/`, atau `scripts/` (relatif ke akar repo). Skrip ada di `analisis/` dan keluaran di `analisis/hasil/`. Lampiran ini memuat 12 kelompok sumber (G.1.1 sampai G.1.12) dan 12 skrip (G.2). Satu "baris DIBI" adalah satu kombinasi hari, kabupaten/kota, dan jenis bencana. Angka antarsumber tidak dijumlah.

## G.1 Sumber data

### G.1.1 DIBI, tarikan dasbor publik

- Nama: Data dan Informasi Bencana Indonesia (DIBI), baris mentah tanpa penggabungan.
- URL: `https://dibi.bnpb.go.id/api/v1/chart/data` (antarmuka data bagan dasbor publik).
- Berkas: `analisis/hasil/dibi_mentah_2024_2026.json`.
- Tanggal tarik: 12 November 2026 (stempel di berkas: 2026-11-12T15:04).
- Periode: 1 Januari 2024 sampai 12 November 2026, 15.974 baris (2024: 3.752; 2025: 8.946; 2026 sampai tanggal tarik: 3.276).
- Satuan: baris DIBI.
- Kolom yang dipakai: `dt` (tanggal), `provinsi`, `kabupaten`, `id_kab_bps`, `jenis_bencana`, `kategori_bencana`, `is_bencana`, `jumlah_kejadian`, `meninggal`, `hilang`, `luka_sakit`, `menderita`, `mengungsi`, `rumah_rusak_berat`, `rumah_rusak_sedang`, `rumah_rusak_ringan`, `rumah_terendam`, `pendidikan_rusak`, `rumah_ibadat_rusak`, `fasyankes_rusak`, `fasum_rusak`, `kantor_rusak`, `jembatan_rusak`.
- Cara pengolahan: K1 = meninggal paling sedikit 1; K2 = menderita, luka, dan mengungsi dijumlah paling sedikit 50; K3 = rumah rusak berat, sedang, dan ringan ditambah satuan pendidikan, rumah ibadah, fasilitas kesehatan, kantor, dan jembatan rusak paling sedikit 5. Tanggal dibaca menurut zona WIB.
- Skrip: `analisis/tarik_dibi.py` (tarikan), `analisis/uji_kriteria.py` (uji kriteria dan kepekaan), `analisis/tambahan_A.py`, `tambahan_C.py`, `tambahan_D.py`, `tambahan_EFG.py` (angka tambahan per kelompok paradoks), `analisis/uji_logbook_csv.py` (katalog anomali DIBI).
- Keluaran: `analisis/hasil/uji_kriteria.json`, `tambahan_A.json`, `tambahan_C.json`, `tambahan_D.json`, `tambahan_EFG.json`, `anomali_dibi.json`.
- Keterbatasan: bukan unduhan resmi walidata; dikoreksi susulan sehingga tarikan ulang bisa berbeda; 2024 tidak lengkap; tanpa kolom luas lahan, permintaan bantuan, dan status darurat (K4 sampai K6 tidak teruji); arti resmi `is_bencana` dan `jumlah_kejadian` pecahan belum dikonfirmasi Pusdatinkom.

### G.1.2 DIBI, rekaman terolah di repo

- Nama: rekaman DIBI yang sudah digabung oleh sistem kita, dipakai sebagai pembanding dan bukan sebagai dasar uji.
- Berkas: `public/data/dibi_kejadian.json` (snapshot 28 Oktober 2026, 28 Oktober 2025 sampai 28 Oktober 2026), `data/laporan-bnpb/bulanan/2026-10/masukan/dibi_kejadian.json` (snapshot 11 November 2026), `data/kajian-bnpb/data/dibi/kejadian_besar.csv` (29 kejadian besar dengan beberapa versi angka per metrik).
- Skrip: `analisis/tambahan_EFG.py`, `analisis/tambahan_D.py`.
- Keluaran: `analisis/hasil/tambahan_EFG.json`, `tambahan_D.json`.
- Keterbatasan: berasal dari sumber yang sama dengan G.1.1 dan mewarisi keterbatasannya; catatan di `public/data/dibi_kejadian.json` bahwa DIBI tidak memiliki kolom rumah ibadah dan fasilitas kesehatan bertentangan dengan tarikan mentah, yang memiliki keduanya.

### G.1.3 Logbook Pusdalops, DOCX harian

- Nama: logbook harian Pusat Pengendalian Operasi BNPB 2026.
- Berkas: arsip lokal 302 berkas harian di folder logbook 2026 Pusdalops (di luar repo); hasil urai di `analisis/hasil/logbook_baris_harian.json`.
- Periode: 1 Januari sampai 29 Oktober 2026.
- Satuan: baris harian mentah sebelum penggabungan.
- Jumlah: 9.329 baris terurai; 1.461 baris tabel dilewati karena tanpa tanggal atau provinsi, seperti pengurai acuan.
- Kolom yang dipakai: jenis, provinsi, kabupaten/kota, tanggal kejadian, tanggal laporan, dan angka dampak (meninggal, terdampak, mengungsi, luka, rumah rusak berat, sedang, ringan, hektare).
- Cara pengolahan: pengurai disalin tanpa perubahan dari `data/laporan-bnpb/bulanan/2026-10/logbook_okt.py`, lalu lima varian deduplication key (V1, V1g, V2, V3, V4) dan tiga aturan angka (maks, jumlah, terakhir) dibandingkan.
- Skrip: `analisis/urai_logbook_mentah.py`, `analisis/uji_kunci_logbook.py`.
- Keluaran: `analisis/hasil/logbook_baris_harian.json`, `analisis/hasil/uji_kunci_logbook.json`.
- Keterbatasan: angka dampak diambil dari teks bebas dengan pola, sehingga hektare dan meninggal dapat terinflasi; hektare tidak dipakai untuk menguji K4; arsip berakhir 29 Oktober 2026.

### G.1.4 Logbook Pusdalops, CSV 2011 sampai 2026

- Nama: arsip logbook kejadian Pusdalops.
- Berkas: `data/pusdalops/logbook_kejadian.csv`.
- Periode: 2011 sampai 1 November 2026, 56.685 baris.
- Satuan: kejadian pada tingkat catatan dengan jumlah laporan (`n_laporan`) dan hari dilaporkan (`hari_dilaporkan`).
- Kolom yang dipakai: `tgl_kejadian`, `pertama_dicatat`, `n_laporan`, `hari_dilaporkan`, jenis, `kabkota`, provinsi, `ha` (karhutla).
- Cara pengolahan: profil kualitas data (tanggal tidak sah, kunci kembar, multi-kabupaten), jumlah per tahun, dan pembandingan jumlah kejadian 2026 antarsumber.
- Skrip: `analisis/uji_logbook_csv.py`.
- Keluaran: `analisis/hasil/logbook_csv.json`, `anomali_dibi.json`, `banding_sumber_2026.json`.
- Keterbatasan: tanpa kolom korban jiwa dan terdampak; 659 tanggal kejadian tidak sah (644 kosong, sisanya salah ketik tahun); luas karhutla memuat salah urai (contoh baris Majalengka 13 September 2023); kelengkapan arsip sebelum 2013 rendah sehingga tren 2011 sampai 2012 tidak dipakai.

### G.1.5 Logbook Koordalops

- Nama: logbook kejadian Koordalops.
- Berkas: `data/laporan-bnpb/bulanan/2026-10/masukan/logbook_kejadian.json`.
- Periode: 1 Januari sampai 11 November 2026, 2.346 kejadian (446 tanpa tanggal mulai).
- Cara pengolahan: hanya dibandingkan jumlahnya per jenis dengan sumber lain (Tabel antarsumber di `riset/SIM-KRITERIA.md` bagian 7); tidak dijumlahkan.
- Skrip: `analisis/uji_logbook_csv.py`.
- Keluaran: `analisis/hasil/banding_sumber_2026.json`.
- Keterbatasan: memisahkan kekeringan sebagai kategori sendiri dan hampir tidak memuat kebakaran permukiman; definisi "kejadian" tidak sama dengan sumber lain.

### G.1.6 Hotspot FIRMS VIIRS

- Nama: NASA FIRMS, sensor VIIRS pada satelit S-NPP, NOAA-20, dan NOAA-21.
- Berkas: tiga arsip yang digabung dan dibuang kembarannya: `data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-22/firms-raw-15-22okt.tar.gz` (15 sampai 22 Oktober 2026), `data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-25/firms-7hari-publik-25okt-0721.tar.gz` (17 sampai 24 Oktober 2026), dan cache generator laporan `data/laporan-bnpb/generator/cache/raw/VIIRS_*_NRT-<tanggal>.csv` (24 Oktober sampai 11 November 2026).
- Periode: 15 Oktober 2026 pukul 03.19 UTC sampai 11 November 2026 pukul 18.37 UTC (28 hari kalender UTC).
- Satuan: deteksi satelit; piksel 375 m dihitung unik untuk luas.
- Jumlah: 420.428 deteksi VIIRS; 311.804 di daratan Indonesia (poligon kecamatan `public/geo/kecamatan`, lewat `scripts/data/wilayah.py`); 295.488 setelah keyakinan rendah dibuang (16.316 rendah, 286.354 nominal, 9.134 tinggi); 140.813 piksel unik.
- Kolom yang dipakai: lintang, bujur, tanggal dan jam akuisisi, keyakinan, satelit, lebar dan panjang piksel (`scan`, `track`).
- Cara pengolahan: komponen terhubung single-linkage pada jarak D dan selisih waktu W; luas proxy = piksel unik x 14,0625 ha.
- Skrip: `analisis/sim_data.py` (pemuat dan cache), `analisis/sim_karhutla.py` (simulasi).
- Keluaran: `analisis/hasil/sim_karhutla.json`.
- Keterbatasan: arsip hanya 28 hari dan hotspot bukan luas terbakar. S-NPP berhenti didistribusikan 1 November 2026 pukul 13.00 UTC. Data 22 Oktober pada arsip pertama parsial dan dilengkapi arsip kedua; kejadian di tepi arsip terpotong; bukan backtest terhadap kejadian resmi; sumber panas non-api tidak disaring; kabupaten ditentukan dari poligon yang disederhanakan.

### G.1.7 Hotspot dan kluster pembanding

- Nama: arsip sistem kita untuk pembanding dan rekonstruksi.
- Berkas: `public/data/hotspot.json` (5 sampai 12 Oktober 2026, VIIRS nominal dan tinggi), `public/data/kluster.json` (12.683 kluster, snapshot 12 Oktober), `public/data/kluster_hari/*.json` (tujuh berkas, 18 sampai 24 Oktober).
- Skrip: `analisis/tambahan_B.py` (hotspot per provinsi lawan baris karhutla DIBI, P-40 dan paradoks kelompok B), `analisis/sim_karhutla.py` (validasi rekonstruksi aturan sistem).
- Keluaran: `analisis/hasil/tambahan_B.json`, `tambahan_B_p13.json`, `tambahan_B_p16.json`, `tambahan_B_p17_p58.json`, `tambahan_B_p18_p19.json`, `tambahan_B_p20.json`, `tambahan_B_p51.json`, `tambahan_B_p62.json`.
- Keterbatasan: provinsi hotspot diturunkan dari dua digit pertama kode wilayah; berkas tidak menyimpan `scan` dan `track`, sehingga rekonstruksi memakai nilai batas atas dan hasilnya hanya perkiraan.

### G.1.8 Data bahaya dan luas pembanding

- Nama: katalog gempa BMKG, ringkasan USGS, dan luas karhutla resmi serta satelit.
- Berkas: `public/gempa/data/katalog_merusak.json`, `public/gempa/data/factsheet_gempa.json`, `public/data/luas_resmi.json`, `public/data/luas_satelit.json`.
- Skrip: `analisis/tambahan_C.py`.
- Keluaran: `analisis/hasil/tambahan_C.json`.
- Keterbatasan: korban dan kerusakan di katalog BMKG ditulis sebagai teks bebas; magnitudo dari BMKG dan USGS tidak selalu satu skala (P-22).

### G.1.9 Silang sumber resmi yang sudah ada

- Nama: rekonsiliasi Dalops dan DIBI serta silang DIBI dan logbook.
- Berkas: `public/data/bnpb/rekonsiliasi_dalops_dibi.json` dan `public/data/silang_dibi_logbook.json`.
- Cara pengolahan: hanya dikutip sebagai pembanding, tidak dihitung ulang. Rekonsiliasi Dalops dan DIBI memakai satuan hari x kabupaten x jenis dengan jendela 3 hari. Silang DIBI dan logbook mencakup 2015 sampai 2022 dan tidak mencakup 2026.
- Keterbatasan: periode dan satuan berbeda dari tarikan kajian ini.

### G.1.10 Regulasi

- Nama: Juklak BNPB 7/2023, Perban BNPB 1/2023, UU 24/2007, PP 21/2008, Perpres 17/2018, Perban BNPB 4/2020, Perka BNPB 8/2011, 7/2012, dan 15/2011, serta panduan Pusdalops 2025.
- Berkas: `riset/REGULASI.md` (kutipan dan letak halaman); sumber teks di `data/hukum/teks/` (korpus JDIH lokal) dan, untuk Juklak 7/2023, salinan PDF UNFPA Indonesia (`https://indonesia.unfpa.org/sites/default/files/pub-pdf/juklak_standar_data_kejadian_dan_dampak_bencana.pdf`).
- Ringkasan panduan Pusdalops (draf Juli 2025): `scripts/wa/panduan_resmi.json`.
- Tanggal baca: 12 November 2026.
- Keterbatasan: teks Juklak 7/2023 bukan dari JDIH BNPB dan halaman 1, 10, 26, 52, dan 53 berupa gambar yang belum terbaca; semua kutipannya masuk daftar periksa sampai salinan resmi diperoleh (Q-02). Panduan Pusdalops berstatus draf. UU 24/2007, PP 21/2008, dan Perpres 39/2019 dibaca dari JDIH BPK dan tidak ada di korpus lokal.

### G.1.11 Pustaka dan praktik internasional

- Nama: EM-DAT, DesInventar, Kerangka Sendai, GLIDE, USGS PAGER, GDACS, serta praktik Jepang, Amerika Serikat, Filipina, India, dan Australia.
- Berkas: `riset/PUSTAKA.md` (tiap entri menyebut URL dan tanggal dibuka).
- Tanggal baca: 12 November 2026.
- Keterbatasan: butir yang tidak dapat dibuka ditandai [BELUM TERVERIFIKASI] di berkas itu, misalnya aturan pemulihan bencana Australia (DRFA), kelas ukuran kebakaran NWCG, dokumen IRDR 2014, NatCat dan Sigma, dan tahun asal kriteria EM-DAT.

### G.1.12 Katalog paradoks dan dependency map

- Nama: katalog 65 paradoks beserta graf hubungannya.
- Berkas: `naskah/lampiran-a-A.md` sampai `lampiran-a-G.md`, `riset/DAFTAR-PARADOKS.md`.
- Cara pengolahan: hubungan diambil dari baris "Bergantung pada" dan "Menentukan" tiap paradoks; 239 hubungan arah; jumlah paradoks yang ditentukan langsung dan skor PageRank pada graf yang dibalik.
- Keluaran: `analisis/hasil/peta_ketergantungan.json`, `analisis/hasil/ringkas_katalog.txt`.
- Skrip: `analisis/peta_ketergantungan.py` (PageRank pada graf terbalik, faktor redaman 0,85, 60 iterasi). Menjalankannya ulang menghasilkan 65 paradoks dan 239 hubungan, sama dengan Bab 5.
- Keterbatasan: hubungan ditetapkan per kelompok, sehingga hubungan antarkelompok cenderung kurang tercatat.

## G.2 Daftar skrip dan cara menjalankan ulang

Semua perintah dijalankan dari folder `analisis/` dengan Python 3. Perintah yang memakai tarikan jaringan atau arsip lokal ditandai.

| Skrip | Perintah | Keluaran | Catatan |
| --- | --- | --- | --- |
| `tarik_dibi.py` | `python tarik_dibi.py` | `hasil/dibi_mentah_2024_2026.json` | Perlu jaringan ke `dibi.bnpb.go.id`. Menimpa tarikan 12 November 2026; angka dapat berubah karena DIBI dikoreksi susulan. |
| `uji_kriteria.py` | `python uji_kriteria.py` | `hasil/uji_kriteria.json` | Perlu hasil `tarik_dibi.py`. |
| `urai_logbook_mentah.py` | `python urai_logbook_mentah.py` | `hasil/logbook_baris_harian.json` | Perlu paket `python-docx` dan arsip logbook lokal di luar repo. |
| `uji_kunci_logbook.py` | `python uji_kunci_logbook.py` | `hasil/uji_kunci_logbook.json` | Perlu hasil `urai_logbook_mentah.py`. |
| `uji_logbook_csv.py` | `python uji_logbook_csv.py` | `hasil/logbook_csv.json`, `anomali_dibi.json`, `banding_sumber_2026.json` | Membaca `data/pusdalops/logbook_kejadian.csv`. |
| `sim_data.py` | tidak dijalankan sendiri | cache `.npz` di folder sementara | Pemuat arsip FIRMS untuk `sim_karhutla.py`. |
| `sim_karhutla.py` | `python sim_karhutla.py [berkas_cache.npz]` | `hasil/sim_karhutla.json` | Perlu paket `numpy` dan `scipy`; sekitar 3 menit. Argumen cache boleh dikosongkan. |
| `tambahan_A.py` | `python tambahan_A.py` | `hasil/tambahan_A.json` | Perlu hasil `tarik_dibi.py`. |
| `tambahan_B.py` | `python tambahan_B.py` | `hasil/tambahan_B.json` dan delapan berkas `tambahan_B_p*.json` | Membaca `public/data/hotspot.json`. |
| `tambahan_C.py` | `python tambahan_C.py` | `hasil/tambahan_C.json` | Memakai fungsi `muat` dari `uji_kriteria.py`. |
| `tambahan_D.py` | `python tambahan_D.py` | `hasil/tambahan_D.json` | Membaca `data/kajian-bnpb/data/dibi/kejadian_besar.csv`. |
| `tambahan_EFG.py` | `python tambahan_EFG.py` | `hasil/tambahan_EFG.json` | Membaca banyak sumber (DIBI, logbook, FIRMS 24 Oktober sampai 12 November, kluster harian). |

Urutan yang aman untuk mengulang dari awal terdiri dari 6 skrip utama lalu 5 skrip tambahan, yaitu `tarik_dibi.py`, `uji_kriteria.py`, `urai_logbook_mentah.py`, `uji_kunci_logbook.py`, `uji_logbook_csv.py`, `sim_karhutla.py`, lalu semua `tambahan_*.py`. Hasil tarikan DIBI yang baru tidak akan sama persis dengan angka di naskah. Untuk mereproduksi angka naskah, pakai berkas `hasil/dibi_mentah_2024_2026.json` yang sudah ada dan lewati `tarik_dibi.py`.

## G.3 Catatan privasi

- Nama korban, petugas, dan pelapor tidak disimpan di berkas analisis maupun di naskah. Pengurai logbook hanya menyimpan angka dan nama wilayah.
- Nomor telepon tidak disimpan dan tidak dikutip.
- Contoh kejadian di naskah memakai jenis bahaya, wilayah administrasi, dan tanggal, tanpa identitas orang.
- Rincian nilai per kabupaten dan baris DIBI hanya berasal dari antarmuka publik DIBI. Logbook harian dan arsip CSV adalah data internal Pusdalops; hanya angka agregat yang masuk naskah.
- Berkas logbook DOCX asli berada di luar repo dan tidak ikut diterbitkan.
