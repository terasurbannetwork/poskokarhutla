# KEPUTUSAN-GENANGAN: Peta genangan satelit per kejadian banjir dan dampaknya

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Kaji Cepat banjir di program Siklus (F3.3, `data/kajian-bnpb/siklus/ALGORITMA.md`) hari ini menghitung paparan dari poligon kecamatan berstatus Siaga atau Awas, bukan dari genangan yang terukur. Dokumen Siklus menulis "Sentinel-1 tanpa pembaca, GFM hanya DKI". Catatan itu sudah usang: `scripts/banjir/genangan_nasional.py` (commit 4325a4da5) sudah membaca Copernicus GFM se-Indonesia per kecamatan tanpa GDAL, dengan kontrol latar dan cakupan, tetapi keluarannya hanya dipakai `scripts/prediksi/dampak.py`, tidak dijadwalkan, dan tidak sampai ke layar kejadian.

Pembanding yang memicu paket ini: halaman `/banjir` GeoAI Peduli (new-geoaipeduli.geotwinverse.ai) untuk banjir Sumatera 26 Nov sampai 6 Des 2025. Halaman itu menampilkan genangan radar, luas per kabupaten, penduduk di area genangan (WorldPop), lahan tergenang per kelas (ESA WorldCover), geser musim kering lawan saat banjir untuk radar dan optik, dan citra semu SWIR.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 24 Nov 2026: sesudah analisis halaman GeoAI Peduli, pemilik menjawab "Ya, siapkan paket" atas usulan empat bagian: (1) peta genangan satelit per kejadian besar di Kaji Cepat Siklus dari Copernicus GFM; (2) dampak dari genangan terukur: penduduk di area genangan, lahan tergenang per kelas WorldCover, persen luas kabupaten; (3) geser sebelum dan sesudah untuk radar dan optik; (4) citra semu SWIR Sentinel-2. |
| K2 | 24 Nov 2026, bagian yang sama: tiga hal TIDAK ditiru: ambang radar buatan sendiri tanpa uji (lab DKI kita gagal, `public/banjir/data/lab/genangan_radar_ringkas.md`), penggeser "Ambang deteksi" yang menyetel angka di tangan pengguna, dan "Hitung di area tampilan" yang butuh komputasi server. |
| K3 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Sumber genangan satu: Copernicus GFM lewat `scripts/banjir/genangan_nasional.py`. Tidak ada ambang radar kedua, tidak ada pembaca GFM kedua. | K2; satu mesin per kebutuhan (aturan Siklus). |
| D2 | Satuan kerja = kejadian banjir Buku Besar (`KJ-`) dengan kab anggotanya. Pasangan GFM diambil untuk tiap kab anggota, lintasan terbaik (cakupan terbesar) dari paling banyak 4 kandidat dalam 0 sampai 12 hari sesudah `mulai` (aturan `genangan_nasional`), pra 8 sampai 45 hari sebelum lintasan dengan syarat tambahan pra jatuh sebelum `mulai` supaya pembanding tidak berisi air banjir (ALGORITMA 1). | Kaji Cepat hidup per kejadian (F3, SK-051 dst.). |
| D3 | Angka yang tampil: luas tergenang baru (ha) per kab dan kecamatan, cakupan teramati (persen), luas ter-mask (ha) terpisah, dan persen tergenang dari luas teramati. Tanpa cakupan sah (ALGORITMA 2) tidak ada angka luas: "tidak teramati", bukan 0. | Radar buta di kota padat; GFM bukan negatif. |
| D4 | Penduduk di area genangan memakai mesin paparan F2 apa adanya (`paparan.hitung_kab`, bobot bangunan per kecamatan dan desa); yang baru hanya pembuat zona dari sel tergenang (zona bawah dan atas, ALGORITMA 4). Sumber jiwa berdampingan dengan rentang masing-masing, tidak dicampur. | Satu mesin paparan (KA Siklus; AGENTS 2.41). |
| D5 | Lahan tergenang per kelas ESA WorldCover v200 2021 dihitung pada titik sampel yang sama dengan genangan. WorldCover COG dibaca dengan `tiff_mini` (deflate, ubin 1024, uint8; diperiksa 24 Nov 2026 pada ubin N03E096). Tanpa GDAL. | Pembaca yang ada cukup; pola `genangan_nasional`. |
| D6 | Bangunan terendam TIDAK tampil di paket ini. `genangan_nasional.boleh_tampil.bangunan` tetap `false` (Demak 2024 5 sampai 12 kali di bawah DIBI) dan angka bangunan milik paket `kerusakan-satelit` (vonis KS-03). | Satu pemilik angka bangunan; tanpa vonis tidak ada angka rusak (AGENTS 2.22). |
| D7 | Semua angka satelit berlabel `estimasi-model` dan berpil "perkiraan radar". Berdampingan dengan DIBI, Logbook, dan isian petugas; tidak dijumlah, tidak dirata-rata, tidak menggantikan. | Angka antarsumber tidak dijumlah (AGENTS 2.9). |
| D8 | Model kaji baru `banjir_gfm` di `sk_kaji`, di samping `banjir_jam1`. `banjir_jam1` tidak berubah (uji golden). | Kaji Cepat jam pertama tetap jalan sebelum lintasan satelit ada. |
| D9 | Rincian per kab, kecamatan, dan kelas lahan tinggal di satu JSON R2 per model (`siklus/saji/kaji/<kj>_banjir_gfm_v<n>.json`, <= 100 KB, disaring per kab untuk BP); sel dan PNG di `siklus/saji/kaji_berkas/` dengan satu rute baca baru berdaftar izin (DESAIN-TEKNIS 4 dan 5); semua di balik sesi; D1 hanya ringkasan. | Aturan paparan rinci Siklus; batas `ringkas` 1.500 byte. |
| D10 | Citra sebelum dan sesudah (radar VV, optik warna asli, optik semu SWIR) dirender sekali per kab kejadian ke PNG oleh pipeline (pola `citra_banjir.py`), bukan ubin hidup dari pihak ketiga. Layar memakai penggeser yang sudah ada di `public/banjir/bukti.js`, dipindah ke inti. | Tanpa ketergantungan peladen luar saat dibuka; satu komponen geser. |
| D11 | Tanpa ambang yang bisa disetel pengguna dan tanpa hitung ulang di peramban. | K2. |
| D12 | Tidak pernah menulis "aman", "tidak banjir", atau "surut" dari radar. Kab tanpa genangan teramati ditulis "tidak ada genangan yang teramati radar pada lintasan <tanggal>". | Radar bukan negatif; satu lintasan satu jam. |
| D13 | Batas "pra sebelum `mulai`" dihitung pada tengah malam WIB tanggal `mulai`, bukan UTC. | Lintasan Sentinel-1 di Indonesia sekitar 22.00 UTC; batas UTC meloloskan pra yang secara WIB sudah jatuh pada hari banjir. Catatan: penyaring kandidat lintasan masih membandingkan waktu UTC dengan `mulai`, jadi lintasan 22.00 UTC pada `mulai` dikurangi 1 (05.00 WIB hari `mulai`) tidak ikut kandidat; ini hanya mengurangi kandidat, tidak membuat angka palsu. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Tampil publik di `/banjir` juga, atau staf saja di `/siklus/kaji/:id`? | **[BAWAAN SEMENTARA]** staf saja dulu. Luas per kecamatan yang sudah ada di `public/banjir/data/genangan_nasional.json` tidak berubah. | GS-11, GS-14 |
| Q2 | Kejadian mana yang dihitung? | **[BAWAAN SEMENTARA]** kejadian banjir Buku Besar berfase `tanggap` atau yang dibuka staf secara manual; arsip hanya untuk uji balik. | GS-03 |
| Q3 | Penduduk di area genangan tampil sebelum uji balik lulus? | **[BAWAAN SEMENTARA]** tampil dengan pil hipotesis (Siklus PRD F3-08, KA 11), seperti Kaji Cepat lain; berbeda dengan bangunan (D6) karena ini paparan, bukan kerusakan. | GS-07 |
| Q4 | Ambang cakupan sah? | **[BAWAAN SEMENTARA, HIPOTESIS]** cakupan teramati >= 10 persen luas kab (sama dengan kriteria `kedalaman_genangan.py`) dan `sinyal_lemah` false. | GS-02 |
| Q5 | Kebenaran uji balik? | **[BAWAAN SEMENTARA]** DIBI terdampak dan rumah terendam per kab-hari; hanya peringkat besar-kecil antarkab yang dinilai (Spearman), bukan angka mutlak. | GS-02 |
| Q6 | Kedalaman FwDET (`scripts/banjir/kedalaman_genangan.py`) dipakai untuk kurva JRC? | **[BAWAAN SEMENTARA]** tidak; FwDET masih eksperimen tanpa vonis. "Kedalaman belum tersedia" tetap tertulis. | tidak menahan |
| Q7 | Anggaran jaringan dan R2 per kejadian? | **[BAWAAN SEMENTARA, HIPOTESIS]** baca Range GFM <= 400 MB per kejadian, WorldCover <= 300 MB, PNG <= 120 KB per citra, total R2 per kejadian <= 5 MB. Dikunci sesudah GS-03 mengukur kejadian Sumatera 2025. | GS-12 |
| Q8 | Optik Sentinel-2 dari mana? | **[BAWAAN SEMENTARA]** Earth Search Element84 (COG terbuka, pola `scripts/data/citra.py`); adegan paling bersih 0 sampai 15 hari sesudah `mulai`. Bila semua berawan, kartu optik "tertutup awan", radar tetap. | GS-05 |
| Q9 | Jadwal? | **[BAWAAN SEMENTARA]** langkah di `siklus.yml` sesudah lintasan GFM tersedia (GFM terbit dalam beberapa jam sesudah lintasan); hitung ulang paling sering sekali per lintasan baru per kejadian. | GS-12 |
| Q10 | Paket `kerusakan-satelit` (KS-02) memakai ambang VV absolut sendiri untuk bangunan terendam, berbeda dengan D1 paket ini. Disatukan ke GFM? | **[BAWAAN SEMENTARA]** paket ini tidak mengubah KS; dua jalur tetap terpisah sampai pemilik memutuskan. Pasangan kalibrasi KS (205, 209, 212, 218) dikeluarkan dari bagian uji paket ini (ALGORITMA 7). | tidak menahan |
| Q11 | Mode riwayat (uji balik) memakai jendela 0 sampai 6 hari sesudah tanggal DIBI dan pra 8 sampai 45 hari sebelum lintasan, jadi pra selalu jatuh paling lambat 2 hari sebelum tanggal DIBI dan syarat pra sebelum acuan tidak pernah mengikat. Tanggal DIBI adalah tanggal lapor; pra 2 sampai 7 hari sebelumnya bisa sudah tergenang. Perlu margin, misalnya pra paling lambat acuan dikurangi N hari? | **[BAWAAN SEMENTARA]** tanpa margin tambahan; kriteria GS-02 sudah terkunci. Keterbatasan ini ditulis di laporan vonis GS-13. Bila pemilik memilih margin, kriteria versi 2 dikunci ulang sebelum GS-13 dihitung. | GS-13 |
| Q12 | `ringkas` D1 `banjir_gfm` (rentang penduduk, luas baru, jumlah kab) adalah agregat semua kab satu kejadian; akun BPBD (BP) yang hanya berhak atas satu kab ikut melihat agregat itu, sementara JSON hasil sudah disaring per kab4. Boleh? | **[BAWAAN SEMENTARA]** sama dengan `banjir_jam1` hari ini (DESAIN-TEKNIS 4): ringkas tingkat kejadian tampil utuh; rincian per kab tetap disaring. Bila pemilik menolak, ringkas untuk BP dihitung ulang dari kab dalam lingkupnya. | GS-11 |
