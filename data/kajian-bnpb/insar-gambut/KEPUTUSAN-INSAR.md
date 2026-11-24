# KEPUTUSAN-INSAR: Kedalaman gambut hilang dari InSAR (PKH-34)

Dokumen ini menang atas semua dokumen lain di folder ini. Paket ini memuat satu tiket pembanding pantaukarhutla.com: PKH-34 (kedalaman gambut hilang dari InSAR untuk menggantikan kedalaman bakar literatur `D_BAWAH, D_ATAS` di `scripts/data/gambut_bara.py`, lab dulu).
Keputusan pemilik ditulis dengan tanggal dan kalimat aslinya bila tersedia. Pertanyaan yang belum dijawab pemilik ditulis sebagai **Q**, dengan bawaan sementara bertanda **[SEMENTARA]**.
Bawaan sementara boleh dipakai untuk membangun, tetapi tidak boleh tampil di layar sebagai angka pasti: layar menandainya "hipotesis" sampai Q dijawab dan uji lulus.

## Keputusan pemilik

Nomor K mengikuti `data/kajian-bnpb/pembanding-pantaukarhutla/TIKET.md` (bagian "Keputusan pemilik 24 Nov 2026") supaya rujukan silang tidak bergeser.

| No | Tanggal | Keputusan | Berlaku di paket ini | Kalimat pemilik |
| -- | ------- | --------- | -------------------- | --------------- |
| K1 | 24 Nov 2026 | Kelompok G (PKH-33 sampai 45) ikut jalan dengan urutan bawaan Q8 pembanding; PKH-34 dan PKH-37 tetap lewat paket dokumen dulu lalu kode (AGENTS §3.7). Dalam urutan itu PKH-34 paling akhir. | ya | "Gas semua" |

Pemilik belum memutuskan apa pun yang khusus tentang InSAR gambut selain K1. Semua yang lain di bawah adalah rancangan (D) atau pertanyaan (Q).

Aturan turunan dari TIKET pembanding yang mengikat paket ini:

- Lab dulu: tidak ada angka InSAR yang masuk `gambut_bara.py`, `dampak.py`, atau layar sebelum uji lulus (D7).
- Pakai mesin LiCSBAS yang ada (`scripts/banjir/subsiden.py` dan paket `data/kajian-bnpb/penurunan-tanah/`), tanpa mesin kedua (D2).
- Hipotesis sampai uji lulus.

## Rancangan (D)

| D | Keputusan rancangan | Alasan |
| - | ------------------- | ------ |
| D1 | **Pertanyaan yang dijawab**: apakah penurunan permukaan tambahan di area terbakar (lawan area tidak terbakar di sekitarnya) dari InSAR cukup dekat dengan kedalaman bakar literatur (33 ± 18 cm, Ballhorn dkk. 2009; rentang kita 15 sampai 51 cm) untuk menggantikannya, dan bila tidak, mengapa. Jawaban "tidak, dan inilah sebabnya" adalah hasil sah. | Pembanding (Geoaccess) melaporkan tambahan 1,26 cm, kira-kira 25 kali lebih kecil dari literatur; selisih itu harus dijelaskan sebelum dipakai. |
| D2 | **Satu mesin InSAR.** Laju LOS dihitung di luar repo oleh LiCSBAS lewat jalur milik paket `penurunan-tanah` (`~/licsbas/lb.sh`, `~/licsbas/ambil.py`; aturan izin di Q1 paket itu). Skrip lab baru `scripts/data/insar_gambut.py` (stdlib) **tidak** menghitung interferogram; ia membaca keluaran yang sama dengan `subsiden.py` (fungsi `baca_par`, `baca_raw`, `vertikal`, `kuantil`) dan hanya membandingkan area. Pemrosesan L-band (ALOS-2) bukan LiCSBAS dan bukan mesin di repo: ia dikerjakan di luar repo dan hanya hasil laju LOS format float32 yang masuk (Q4). | Aturan pemilik di TIKET pembanding; `subsiden.py` sudah menulis "Data TIDAK diproses di repo". |
| D3 | **Wilayah dan musim lab**: sekitar Palangka Raya, Kalimantan Tengah, 1 Juli sampai 30 September 2026 (sama dengan Geoaccess, supaya angka kita dan angkanya bisa disandingkan), ditambah satu jendela pasca-api 30 sampai 90 hari sesudah api terakhir di area yang sama. Ketersediaan bingkai LiCSAR di sana belum diperiksa (IG-01). | Memisahkan pemadatan dan oksidasi pasca-api dari penurunan saat api. |
| D4 | **Topeng terbakar** dari dNBR Sentinel-2 yang sama dengan `scripts/data/luas_citra.py` (dNBR > 0,27 dan NBR pasca < 0,2), dipotong pada poligon gambut `public/data/lahan/gambut.geojson`. **Kontrol** = piksel gambut tidak terbakar di cincin 2 sampai 20 km dari topeng terbakar (cincin 0 sampai 2 km dibuang karena bercampur), kontrol latar cincin 2 sampai 4 km di `luas_citra.py` dicatat sebagai pembanding. | Kontrol berbeda dari area terbakar hanya oleh api; cincin dekat tercemar. |
| D5 | **Kedalaman InSAR** `D_insar = α × Δh_tambahan`, dengan `Δh_tambahan` = median vertikal area terbakar dikurangi median vertikal kontrol (cm). `α` bawaan 1,0 [SEMENTARA, Q3]: Geoaccess menulis α tanpa mendefinisikannya; hitung balik angkanya (0,0126 m, kerapatan 0,1 t/m3, 10.000, C-organik 0,55, 44/12) konsisten dengan α = 1. | Hitungan balik, bukan karangan. |
| D6 | **Penjelasan selisih diuji, bukan diduga.** Tiga dugaan ditulis sebagai hipotesis yang diuji di IG-04: (a) fase C-band 5,6 cm salah bungkus (phase aliasing) bila laju penurunan terlalu besar antar piksel dan antar pasangan; (b) dekorelasi di piksel terbakar sehingga yang terukur hanya piksel yang masih koheren (bias seleksi); (c) yang terukur adalah pemadatan dan oksidasi pasca-api, bukan kedalaman terbakar. Angka ambang dugaan (a) di RISET pembanding (penurunan ± 1,4 cm per 12 hari) belum diverifikasi: IG-04 menghitung ulang dari panjang gelombang. | Menjawab D1 dengan bukti. |
| D7 | **Tidak ada perubahan perilaku produk sebelum lulus.** `D_BAWAH, D_ATAS` tetap literatur. Bila vonis `lulus`, jalur masuk memakai mekanisme kalibrasi yang sudah ada (`pasang_kalibrasi` di `gambut_bara.py` dan `scripts/data/kalibrasi.py`), bukan kode baru di rumus, dan tampil berpil hipotesis (IG-07, menunggu Q2). | Satu jalur kalibrasi; rumus emisi tidak disentuh. |
| D8 | **Vonis dikunci sebelum angka dilihat**, di RENCANA-UJI §2. Tiga vonis: `selaras` (InSAR dan literatur tumpang tindih), `meremehkan` (InSAR di bawah literatur dan penyebabnya tercatat), `tak_terukur` (koherensi atau jumlah piksel kurang). Hanya `selaras` membuka IG-07. | Menghindari menyetel kriteria sesudah melihat hasil. |
| D9 | **Tak terukur bukan nol.** Area terbakar tanpa piksel koheren cukup tampil "tak terukur" di laporan lab, tidak 0 cm. | Prinsip repo. |
| D10 | **Tidak dibangun di paket ini**: layar publik, peta penurunan gambut, notifikasi, pemantauan berkelanjutan semua gambut Indonesia, pemisahan CH4 dan CO dari InSAR, dan koreksi muka air (hanya dicatat sebagai pembaur). | Lab dulu. |

## Prinsip yang mengikat semua tiket

1. **Tidak ada data dummy** (standar pemilik 11 Nov 2026). Uji memakai berkas kecil buatan sendiri hanya di `tests/`, tidak di produk.
2. **Tak terukur bukan nol.**
3. **Satu mesin per fungsi.** LiCSBAS satu (paket `penurunan-tanah`); kalibrasi `D` satu (`pasang_kalibrasi`).
4. **Hipotesis sampai lulus.** Angka InSAR berpil hipotesis di mana pun ia tampil.
5. **Kriteria dikunci sebelum hasil.**
6. **Unduh data hanya sesudah izin pemilik** (aturan paket `penurunan-tanah`, Q1).
7. Teks Indonesia lewat `bahasa-indonesia-plain`; tidak ada kata vonis keselamatan, tidak ada kata sebab atau pelaku.

## Pertanyaan terbuka untuk pemilik

| Q | Pertanyaan | Bawaan sementara |
| - | ---------- | ---------------- |
| Q1 | Boleh menjalankan unduhan LiCSAR dan LiCSBAS untuk Palangka Raya (jalur paket `penurunan-tanah`)? Unduhan besar dan makan hari komputasi. | [SEMENTARA] tidak dijalankan sampai pemilik mengizinkan atau menjalankannya sendiri; IG-03 sampai IG-04 menunggu |
| Q2 | Kalau vonis `selaras`, D InSAR boleh menggantikan atau mempersempit D literatur di rentang skenario `gambut_bara.py`? | [SEMENTARA] tidak menggantikan; hanya ditampilkan berdampingan dengan literatur dan berpil hipotesis |
| Q3 | Nilai `α` (rasio penurunan permukaan ke gambut hilang)? Sumber pembanding tidak mendefinisikannya. | [SEMENTARA] 1,0; peka terhadap 0,5 dan 2 dicatat di laporan lab, bukan di produk |
| Q4 | L-band ALOS-2: sumber data, lisensi, dan siapa yang memprosesnya di luar repo? | [SEMENTARA] tidak dikerjakan; hanya dicatat di laporan lab sebagai kandidat sesudah C-band punya penjelasan; jangan mengunduh sebelum jawaban |
| Q5 | Satu wilayah lab (Palangka Raya) cukup, atau perlu satu wilayah kedua (mis. Sumatra Selatan) sebelum vonis? | [SEMENTARA] satu wilayah; vonis berlaku hanya untuk wilayah itu dan musim itu |
| Q6 | Ambang koherensi dan jumlah piksel minimum di RENCANA-UJI §2 diterima? | [SEMENTARA] angka di RENCANA-UJI §2 adalah tebakan perancang, bukan hasil pengukuran; dikunci sebelum lab jalan, diubah hanya oleh pemilik |
