# Lampiran A, kelompok F: Penyajian

Kelompok ini memuat tujuh paradoks yang muncul sesudah kejadian dihitung: angka yang sama bisa menyesatkan
bergantung pada cara menyajikannya. Penyebabnya berbeda-beda (pelaporan yang makin lengkap, deret yang
terputus, dampak yang timpang, alat ukur yang berganti, wilayah yang dimekarkan, arsip yang bolong), tetapi
akibatnya sama: pembaca menarik simpulan tren yang tidak ada. Angka tambahan dalam berkas ini dihitung oleh
`analisis/tambahan_EFG.py` (keluaran `analisis/hasil/tambahan_EFG.json`) dari tarikan Data dan Informasi Bencana
Indonesia (DIBI) 12 November 2026, logbook Pusat Pengendalian Operasi (Pusdalops) BNPB, dan arsip hotspot
repo. Periode "12 bulan" berarti 13 November 2025 sampai 12 November 2026. Satuan DIBI adalah baris (hari,
kabupaten/kota, jenis bencana), bukan kejadian utuh.

---

### P-35 Spurious trend

**Kelompok:** F. **Bergantung pada:** P-39, P-46, P-61. **Menentukan:** P-36, P-55.

1. **Kasus.** Jumlah baris DIBI naik dari 3.752 (2024) menjadi 8.946 (2025), kenaikan 138 persen. Pada logbook
   Pusdalops dalam berkas `data/pusdalops/logbook_kejadian.csv`, jumlah kejadian per tahun melonjak dari 247 (2012)
   menjadi 2.201 (2013), lalu dari 3.977 (2024) menjadi 5.899 (2025), naik 48 persen. Tidak ada bukti bahwa
   bahaya meningkat sebesar itu; penyebab yang terlihat adalah perubahan pencatatan (hari pencatatan logbook 67
   pada 2012 lawan 349 pada 2013; kolom penanda `is_bencana` DIBI berubah isi).
2. **Mengapa ini paradoks.** Jawaban A: angka resmi adalah angka resmi, kenaikan tercatat berarti kenaikan.
   Jawaban B: sebagian besar kenaikan adalah artefak pelaporan, sehingga membacanya sebagai tren bahaya
   menyesatkan. Keduanya benar: angka tersebut memang yang tercatat, dan memang bukan tren bahaya.
3. **Jawaban aturan saat ini.** Tidak diatur. Juklak 7/2023 tidak memuat aturan membandingkan tahun atau
   menandai series break deret. Satu-satunya catatan di repo tentang series break datang dari Perka BNPB 8/2011 dan
   7/2012 (kejadian lintas wilayah dihitung satu) lawan Juklak 7/2023 (dihitung per wilayah terdampak), yang
   dikutip `data/kajian-bnpb/data/dibi/README.md` sebagai salah satu sebab series break deret DIBI 2024.
4. **Jawaban praktik dunia.** Dokumentasi EM-DAT menyatakan pencatatan naik sejak 1960-an karena berdirinya
   lembaga pencatat dan kemajuan komunikasi, dan sejak September 2023 menandai data sebelum tahun 2000 sebagai
   "Historic" dengan anjuran kuat tidak dipakai untuk analisis tren (doc.emdat.be/docs/known-issues-and-limitations/specific-biases/).
   Technical Guidance Kerangka Sendai mengharuskan kriteria tetap sepanjang rentang data 2005 sampai 2030 dan
   metadata yang konsisten bila metodologi berubah (`riset/PUSTAKA.md` butir 3).
5. **Opsi penyelesaian.**
   - *Opsi A, tren hanya pada deret dengan aturan dan kelengkapan konstan; series break ditandai.* Jumlah kejadian:
     tidak diubah, tetapi sebelum series break tidak dibandingkan. Tren: hanya terbaca pada deret sebanding.
     Keadilan antardaerah: terjaga. Insentif pelapor: tidak berubah. Beban pencatat: nol; beban analis kecil.
   - *Opsi B, bagi dengan ukuran upaya pelaporan* (kejadian per hari pencatatan, atau hanya indikator yang
     sedikit bergantung pelaporan seperti korban meninggal). Jumlah kejadian: tidak diubah. Tren: lebih jujur,
     tetapi lebih sulit dijelaskan kepada pimpinan. Keadilan antardaerah: daerah dengan upaya pelaporan rendah
     tidak tampak turun. Insentif pelapor: tidak berubah. Beban pencatat: nol, tetapi pencatat diminta
     mencatat hari pencatatan; beban analis sedang.
   - *Opsi C, bekukan deret lama dan terbitkan deret baru bernomor versi* (lihat P-46). Jumlah kejadian: dua
     deret terpisah. Tren: rapi per deret, tetapi memutus riwayat. Keadilan antardaerah: sama untuk semua
     daerah pada tiap deret. Insentif pelapor: tidak berubah. Beban pencatat: kecil; beban walidata naik
     karena harus memelihara dua deret.
6. **Uji empiris.** Jan sampai Okt 2024, 2025, dan 2026: jumlah kejadian logbook CSV 3.045, 4.826, dan 3.622
   (naik 58 persen, lalu turun 25 persen); baris DIBI Jan sampai Okt 2025 lawan 2026: 7.746 lawan 3.181 (turun
   59 persen), dan 4.422 lawan 2.436 bila hanya yang `is_bencana` benar (turun 45 persen). Korban meninggal DIBI
   Jan sampai Okt: 453 (2024), 663 (2025), 556 (2026); baris naik 153 persen pada 2024 ke 2025 (3.058 ke 7.746)
   sedangkan korban meninggal naik 46 persen. `is_bencana` salah: 93 baris (2024), 3.705 (2025), 771 (2026),
   yaitu series break aturan hitung (`riset/SIM-KRITERIA.md` bagian 1.4). Kejadian per hari pencatatan logbook: 12,6
   (2016) sampai 16,2 (2025). Sumber: tambahan_EFG.py bagian P35 dan `riset/SIM-KRITERIA.md` bagian 5.
7. **Rekomendasi sementara.** Opsi A dan B digabung: tren hanya pada deret sebanding, dengan korban meninggal
   sebagai indikator pendamping, dan setiap grafik deret bertanda series break 2025 serta series break pada tahun mulai
   berlakunya kerangka ini; terapkan [BAWAAN SEMENTARA] di Q-07.

---

### P-36 Paradoks Simpson

**Kelompok:** F. **Bergantung pada:** P-35, P-55. **Menentukan:** aturan penyajian S (Bab 6.6).

1. **Kasus.** Paradoks Simpson terjadi bila tren di tiap subkelompok berlawanan dengan tren gabungan, karena
   komposisi kelompok bergeser. Kami mencarinya pada DIBI, 1 Januari sampai 31 Oktober 2025 lawan 2026. Hasilnya:
   **tidak ditemukan pembalikan tegas**. Yang ditemukan adalah perbedaan arah yang mirip.
2. **Mengapa ini paradoks.** Jawaban A: tren nasional adalah gambaran paling penting untuk pimpinan. Jawaban B:
   tren nasional bisa menyembunyikan arah yang berlawanan di sebagian besar daerah atau jenis, sehingga
   keputusan nasional salah sasaran. Keduanya masuk akal.
3. **Jawaban aturan saat ini.** Tidak diatur.
4. **Jawaban praktik dunia.** Tidak ditemukan aturan penyajian khusus dalam bahan kami [BELUM TERVERIFIKASI].
   Dokumentasi EM-DAT mengingatkan bahwa sulit menyimpulkan pendorong tren dari angka agregat karena pencatatan
   berubah (halaman specific-biases).
5. **Opsi penyelesaian.**
   - *Opsi A, tren nasional selalu disertai uraian per jenis dan per provinsi.* Jumlah kejadian: tidak
     berubah. Tren: terbaca di semua tingkat. Keadilan antardaerah: terlihat. Insentif pelapor: daerah tahu
     posisinya. Beban pencatat: nol; beban penyaji naik sedikit.
   - *Opsi B, uji pembalikan otomatis sebelum tren terbit.* Mesin menandai bila arah nasional berlawanan
     dengan mayoritas subkelompok. Jumlah kejadian: tidak berubah. Tren: ditandai bila terbalik. Keadilan
     antardaerah: tidak dipengaruhi langsung. Insentif pelapor: tidak ada. Beban pencatat: nol; murah bagi
     penyaji karena otomatis.
   - *Opsi C, standardisasi: bandingkan dengan komposisi tetap* (bobot jenis atau provinsi dari tahun dasar).
     Jumlah kejadian: tidak berubah, tetapi disajikan sebagai angka terstandar. Tren: efek komposisi hilang,
     tetapi sulit dijelaskan. Keadilan antardaerah: bergantung pemilihan tahun dasar. Insentif pelapor:
     tidak ada. Beban pencatat: nol; beban analis sedang.
6. **Uji empiris.** DIBI Jan sampai Okt 2025 lawan 2026. (a) Jumlah baris nasional turun dari 7.746 ke 3.181;
   36 dari 38 provinsi turun, 2 naik; 9 dari 10 kelompok jenis turun (kekeringan naik dari 47 ke 129, karhutla
   hanya turun 18 persen dari 1.376 ke 1.132, sedangkan banjir turun dari 2.261 ke 741). Bagian karhutla dalam
   baris naik dari 17,8 ke 35,6 persen: pergeseran komposisi nyata. (b) Persen baris yang lolos K1 sampai K3
   naik dari 38,5 ke 41,8 persen secara nasional; tujuh kelompok jenis berukuran memadai (20 baris atau lebih
   tiap tahun) semuanya naik (misalnya banjir 68,6 ke 77,2 persen, cuaca ekstrem 38,6 ke 57,4 persen), jadi
   tidak ada pembalikan menurut jenis. Menurut provinsi, 12 dari 28 naik dan 16 turun, jadi arah nasional (naik)
   berbeda dari mayoritas provinsi tetapi bukan semuanya. (c) Korban meninggal: nasional turun 16 persen (663 ke
   556), tetapi 11 provinsi naik; tanpa gempa, turunnya 40 persen (661 ke 396). (d) Orang
   terdampak: nasional turun 8,5 persen (6,64 juta ke 6,08 juta), namun 13 provinsi naik. Simpulan: Simpson
   tegas tidak ditemukan pada periode ini; perbedaan arah antara nasional dan provinsi nyata. Sumber:
   tambahan_EFG.py bagian P36.
7. **Rekomendasi sementara.** Opsi A dan B: setiap tren nasional terbit bersama jumlah subkelompok yang
   berlawanan arah, dan mesin menandai pembalikan penuh bila ada [BAWAAN SEMENTARA]. Contoh pembalikan penuh
   yang sungguh terjadi belum ada; jangan dikarang. Bila diperlukan ilustrasi untuk pelatihan, tandai [ILUSTRASI].

---

### P-37 Long tail

**Kelompok:** F. **Bergantung pada:** P-32, P-01. **Menentukan:** P-65, aturan penyajian S.

1. **Kasus.** Dalam 12 bulan DIBI, satu baris (banjir Aceh Utara, 28 November 2025) memuat 246 meninggal, 739.710
   terdampak, luka, dan mengungsi, serta 91.286 rumah rusak. Baris itu dan baris yang hanya memuat 1 meninggal
   sama-sama bernilai satu kejadian.
2. **Mengapa ini paradoks.** Jawaban A: jumlah kejadian adalah ukuran yang jelas dan sederhana. Jawaban B: bila
   sebagian kecil kejadian memikul hampir seluruh dampak, rata-rata dan jumlah kejadian tidak mewakili kejadian
   tipikal dan menyesatkan.
3. **Jawaban aturan saat ini.** Juklak 7/2023 menetapkan "jumlah bencana" sebagai ukuran total dengan satuan
   kejadian (Lampiran II huruf B butir 1) dan tidak mengatur penyajian dampak yang timpang.
4. **Jawaban praktik dunia.** EM-DAT memuat kejadian besar dan mencatat bias ambang: kematian kumulatif kejadian
   kecil bisa melampaui kejadian besar (halaman specific-biases). Kerangka Sendai melaporkan indikator sebagai
   agregat tahunan dan tidak bertumpu pada jumlah kejadian (`riset/PUSTAKA.md` butir 3). Pustaka lain tentang
   statistik long tail tidak kami buka [BELUM TERVERIFIKASI].
5. **Opsi penyelesaian.**
   - *Opsi A, jumlah kejadian selalu bersama jumlah dampak, median, dan peringkat satu kejadian terbesar.*
     Jumlah kejadian: tidak berubah. Tren: terbaca bersama dampak. Keadilan antardaerah: pembaca langsung
     melihat ketimpangan. Insentif pelapor: tidak ada. Beban pencatat: nol.
   - *Opsi B, kurva kumulatif (berapa kejadian memikul 50 dan 90 persen dampak).* Jumlah kejadian: tidak
     berubah. Tren: terbaca sebagai pergeseran bentuk kurva. Keadilan antardaerah: paling jujur, tetapi
     membutuhkan penjelasan untuk pembaca awam. Insentif pelapor: tidak ada. Beban pencatat: nol; beban
     penyaji sedang.
   - *Opsi C, jumlah kejadian per kelas keparahan (L3) sebagai tabel utama.* Jumlah kejadian: tersaji per
     kelas. Tren: terbaca per kelas. Keadilan antardaerah: membaik bila kelasnya relatif. Insentif pelapor:
     kelas dapat memicu pembesaran angka. Beban pencatat: nol; fokus bergeser dari "berapa" ke "seberapa besar".
6. **Uji empiris.** DIBI 12 bulan, 4.185 baris. Meninggal: 1.897 total; 94,8 persen baris tanpa korban
   meninggal; 8 baris memikul separuh; 41 baris (1 persen) memikul 85,5 persen; satu baris 13,0 persen. Terdampak,
   luka, dan mengungsi: 12.501.851; median 10 per baris, rata-rata 2.987; 19 baris memikul separuh; 1 persen
   baris teratas 64,0 persen. Rumah rusak (berat, sedang, ringan): 397.670; hanya 4 baris memikul separuh dan satu
   baris 23,0 persen. Tanpa baris Aceh Utara, total meninggal turun 13,0 persen (1.897 ke 1.651) dan terdampak
   turun 5,9 persen. Dari 1.903 baris yang lolos ambang, 1.245 (65,4 persen) memiliki terdampak di bawah 1.000,
   meninggal di bawah 5, dan rumah rusak di bawah 50. Sumber: tambahan_EFG.py bagian P37; `riset/SIM-KRITERIA.md`
   bagian 3.
7. **Rekomendasi sementara.** Opsi A dan C; angka rata-rata dilarang berdiri sendiri pada tabel dampak (aturan
   penyajian S, Bab 6.6).

---

### P-43 Hotspot lawan lokasi unik

**Kelompok:** F. **Bergantung pada:** P-40, P-44. **Menentukan:** P-13, P-60.

1. **Kasus.** Repo kita menghitung hotspot sebagai lokasi unik per hari kalender WIB: satu sel sekitar 375
   m dihitung sekali per hari tanpa memedulikan jumlah satelit dan lintasan (`scripts/data/titik_unik.py`).
   Dokumentasi berkas itu mencatat bahwa pada 25 Oktober 2026 sebanyak 433 dari 704 titik NOAA-21 di Kalimantan
   Tengah jatuh di sel yang sudah terdeteksi satelit lain hari itu, dan angkanya tidak sama dengan SiPongi atau
   sistem lain yang memakai titik mentah. Angka SiPongi sendiri tidak ada di repo, jadi pembandingan langsung
   belum bisa dilakukan [BELUM TERVERIFIKASI].
2. **Mengapa ini paradoks.** Jawaban A: jumlah hotspot adalah jumlah deteksi, karena itu yang dilihat
   satelit. Jawaban B: satu api yang sama dilihat beberapa satelit dan beberapa lintasan, sehingga deteksi
   mentah menghitung api yang sama berulang. Dua lembaga bisa memakai kata "hotspot" untuk dua ukuran.
3. **Jawaban aturan saat ini.** Tidak diatur dalam Juklak 7/2023 maupun Perban 1/2023. Keputusan pemilik 25
   Oktober 2026 menetapkan lokasi unik per hari, semua satelit, semua keyakinan (docstring `titik_unik.py`).
4. **Jawaban praktik dunia.** Pembanding definisi Badan Meteorologi, Klimatologi, dan Geofisika (BMKG, lembar
   fakta 19 Oktober 2026, dikutip docstring itu): titik mentah MODIS Terra dan Aqua, VIIRS S-NPP, VIIRS NOAA-20,
   keyakinan tinggi saja, dalam batas provinsi; cocok persis 1.744 titik nasional 18 Oktober 2026.
   GDACS memakai perimeter kebakaran dari produk GWIS, bukan titik (`riset/PUSTAKA.md` butir 7).
5. **Opsi penyelesaian.**
   - *Opsi A, satu definisi baku (lokasi unik per hari) dan semua definisi lain dilabeli.* Jumlah kejadian:
     jumlah "hotspot" tidak berubah di sistem kita. Tren: konsisten. Keadilan antardaerah: tidak
     terpengaruh. Insentif pelapor: tidak ada, karena data berasal dari satelit. Beban pencatat: nol.
   - *Opsi B, dua deret berdampingan, mentah dan unik, dengan nama berbeda* (mengikuti pola Q-03). Jumlah
     kejadian: dua angka. Tren: dua deret terbaca terpisah. Keadilan antardaerah: sama. Insentif pelapor:
     tidak ada. Beban pencatat: nol; menghindari salah paham antarlembaga, tetapi menambah angka yang harus
     dijelaskan.
   - *Opsi C, ikuti definisi lembaga lain agar angka cocok.* Jumlah kejadian: mengikuti lembaga lain. Tren:
     bergantung perubahan definisi lembaga itu. Keadilan antardaerah: sama, tetapi informasi keyakinan rendah
     yang penting untuk api gambut terbuang (docstring `titik_unik.py` mengutip Tansey dkk. 2008 dan Sofan
     dkk. 2019). Insentif pelapor: tidak ada. Beban pencatat: nol; mudah dibandingkan.
6. **Uji empiris.** Arsip Fire Information for Resource Management System (FIRMS) tembolok generator laporan,
   25 Oktober sampai 11 November 2026 (18 hari), sel 375 m, semua keyakinan, MODIS ikut, tidak disaring ke daratan
   Indonesia: deteksi mentah 117.910 lawan 97.875 lokasi-hari unik; rasio per hari 1,09 sampai 1,32, total 1,20.
   Untuk 26 Oktober sampai 11 November, lokasi unik 81.239 lawan 3.268 titik menurut definisi mirip BMKG (MODIS,
   S-NPP, NOAA-20, keyakinan tinggi; hitungan kami, MODIS tinggi ditafsirkan 80 atau lebih): rasio 14 sampai 99
   per hari, 24,9 secara keseluruhan; sebagian besar selisih ini berasal dari saringan keyakinan, bukan dari
   double counting. Dalam Kajian Ambang Hotspot (10 November 2026, slide 8) rasio hotspot laporan BNPB terhadap
   hitungan VIIRS S-NPP berubah dari 1,97 (2019) menjadi 3,33 (2024) dan 2,95 (2025): satuan laporan sendiri
   tidak tetap. Sumber: tambahan_EFG.py bagian P43.
7. **Rekomendasi sementara.** Opsi A dengan Opsi B untuk perbandingan: setiap angka hotspot wajib memuat
   nama definisinya dan daftar satelit aktif hari itu.

---

### P-44 Pergantian alat ukur

**Kelompok:** F. **Bergantung pada:** P-43, P-35. **Menentukan:** P-40.

1. **Kasus.** Satelit Suomi National Polar-orbiting Partnership (S-NPP) pembawa sensor VIIRS (Visible Infrared
   Imaging Radiometer Suite) pensiun pada 1 November 2026 (`riset/SIM-KARHUTLA.md`; Kajian Ambang Hotspot, 10
   November 2026). Jumlah hotspot harian turun dari puluhan ribu pada 22 Oktober ke sekitar 2.000 sampai
   5.000 pada awal November. Bagian penurunan yang berasal dari api padam dan bagian yang berasal dari pergantian alat belum terpisahkan.
2. **Mengapa ini paradoks.** Jawaban A: angka yang turun adalah angka yang turun, api berkurang. Jawaban B:
   sebagian penurunan adalah hilangnya satu satelit dan tidak mencerminkan api. Hujan awal musim ikut menurunkan
   angka sehingga dua penyebab tidak bisa dipisahkan tanpa metode khusus.
3. **Jawaban aturan saat ini.** Tidak diatur. Kajian ambang kita menetapkan padanan baru antara satuan VIIRS dan
   satuan laporan: 50 VIIRS setara sekitar 120 hotspot laporan (rasio 2,4), bukan 150 (rasio 3,0), karena
   hitungan tanpa S-NPP tersisa sekitar 79 persen.
4. **Jawaban praktik dunia.** Technical Guidance Sendai menuntut kriteria tetap sepanjang rentang data dan
   metadata konsisten bila metodologi berubah. Dokumentasi EM-DAT memperlihatkan bias waktu akibat perubahan
   teknologi pencatatan (`riset/PUSTAKA.md`).
5. **Opsi penyelesaian.**
   - *Opsi A, catat daftar sensor aktif per hari sebagai metadata.* Jumlah kejadian: jumlah titik tidak
     diubah. Tren: analis dapat memisahkan periode. Keadilan antardaerah: tidak terpengaruh. Insentif
     pelapor: tidak ada. Beban pencatat: nol (otomatis).
   - *Opsi B, deret sambung: koreksi angka sesudah pensiun dengan rasio yang diukur pada periode tumpang
     tindih.* Jumlah kejadian: angka sesudah pensiun dikoreksi naik. Tren: terjaga, bergantung pada
     kestabilan rasio. Keadilan antardaerah: bisa bergeser bila rasio berbeda per wilayah. Insentif
     pelapor: tidak ada. Beban pencatat: nol; beban analis sedang.
   - *Opsi C, hentikan perbandingan lintas series break dan mulai deret baru pada 1 November 2026.* Jumlah
     kejadian: dua deret terpisah. Tren: jujur, tetapi memutus ambang yang dikalibrasi dengan data lama.
     Keadilan antardaerah: sama. Insentif pelapor: tidak ada. Beban pencatat: nol; beban analis kecil.
6. **Uji empiris.** Cache FIRMS 25 Oktober sampai 11 November 2026: untuk 26 sampai 31 Oktober, bila deteksi
   S-NPP dibuang, tersisa 79,7 persen lokasi unik dan 72,2 persen deteksi mentah (kajian ambang: sekitar 79
   persen untuk satuan laporan). Rata-rata lokasi unik per hari: 6.431 (26 sampai 31 Oktober) menjadi 3.727 (3
   sampai 11 November), turun 42 persen, padahal pensiun S-NPP sendiri menjelaskan sekitar 20 persen; sisa
   penurunan sekitar 27 persen (0,579 dibagi 0,797) tidak dapat dipisahkan menjadi pengaruh cuaca dan faktor
   lain tanpa data tambahan. Catatan: dalam cache, deteksi S-NPP terakhir jatuh pada hari WIB 2 November,
   sementara catatan simulasi menyebut distribusi berhenti 1 November 13.00 UTC; selisih satu hari ini perlu
   dikonfirmasi [BELUM TERVERIFIKASI]. Sumber: tambahan_EFG.py bagian P44.
7. **Rekomendasi sementara.** Opsi A dan B: simpan sensor aktif per hari dan terbitkan deret sambung dengan
   garis series break 1 November 2026 [BAWAAN SEMENTARA].

---

### P-55 Pemekaran wilayah

**Kelompok:** F. **Bergantung pada:** P-35, P-59. **Menentukan:** P-36, penyajian per kapita.

1. **Kasus.** Dalam paket rekap DIBI per provinsi (`data/kajian-bnpb/data/dibi/rekap_provinsi_tahunan.csv`,
   ditarik 23 Oktober 2026), provinsi kode 94 (Papua Tengah) punya kejadian sejak 2008, kode 95 (Papua
   Pegunungan) dan 93 (Papua Selatan) sejak 2013, kode 96 (Papua Barat Daya) sejak 2009, dan kode 65 (Kalimantan
   Utara) sejak 2009, sedangkan provinsi-provinsi itu baru dibentuk belakangan (Kalimantan Utara sekitar 2012,
   empat provinsi Papua baru pada 2022; dasar hukum dan tanggalnya [BELUM TERVERIFIKASI]). Artinya kejadian lama
   diberi kode provinsi baru. Catatan paket nonalam-sosial menambahkan bahwa awalan `id_kab_bps` DIBI berbeda
   dengan kode provinsi Kemendagri pada 26 baris Papua (mis. Papua Pegunungan 95 lawan 94xx).
2. **Mengapa ini paradoks.** Jawaban A: wilayah dicatat menurut batas saat kejadian, karena itulah fakta
   administratif saat itu. Jawaban B: wilayah dicatat menurut batas terkini, supaya deret waktu per wilayah tidak
   putus. Keduanya mengubah angka provinsi lama dan baru.
3. **Jawaban aturan saat ini.** Tidak diatur. Kode Identitas Bencana memakai 2 angka provinsi dan 2 angka
   kabupaten (Juklak 7/2023 hlm. 6 sampai 7) tanpa menyebut kode lama yang berubah.
4. **Jawaban praktik dunia.** Tidak ditemukan dalam bahan kami [BELUM TERVERIFIKASI]. DesInventar menyarankan
   resolusi seragam pada unit geografis terendah (`riset/PUSTAKA.md` butir 2), yang membantu karena unit
   terendah lebih jarang berubah.
5. **Opsi penyelesaian.**
   - *Opsi A, simpan kode wilayah saat kejadian dan sediakan tabel konkordansi ke batas terkini.* Jumlah
     kejadian: per wilayah bisa disajikan dua cara. Tren: stabil bila memakai batas terkini. Keadilan
     antardaerah: wilayah induk dan pemekaran sebanding pada batas terkini. Insentif pelapor: tidak ada
     alasan menggeser kode wilayah. Beban pencatat: nol; beban pemelihara tabel kecil.
   - *Opsi B, ubah semua catatan ke batas terkini.* Jumlah kejadian: per wilayah mengikuti batas terkini.
     Tren: sederhana bagi analis. Keadilan antardaerah: sebanding, tetapi fakta wilayah saat kejadian
     terhapus dan sulit dilacak balik ke laporan asli. Insentif pelapor: tidak ada. Beban pencatat: nol;
     beban analis sekali jalan.
   - *Opsi C, agregasi ke unit yang tidak berubah* (kabupaten terkecil atau pulau). Jumlah kejadian: tetap
     per unit tetap. Tren: stabil. Keadilan antardaerah: sebanding, tetapi kurang berguna bagi pimpinan
     provinsi. Insentif pelapor: tidak ada. Beban pencatat: nol; beban analis sedang.
6. **Uji empiris.** Rekap DIBI per tahun menunjukkan deret provinsi baru panjang sejak 2008 sampai 2013, yaitu
   indikasi pemetaan ke batas terkini (belum dikonfirmasi ke Pusdatinkom). Yang belum ada: daftar kabupaten yang
   berpindah provinsi dan tanggal efektifnya. Sumber: rekap_provinsi_tahunan.csv dan README paket nonalam-sosial.
7. **Rekomendasi sementara.** Opsi A, dengan pertanyaan Q-37; kode wilayah catatan kabupaten diambil pada tanggal dampak pertamanya, dengan tabel padanan kode lama dan baru.

---

### P-61 Hari tanpa laporan

**Kelompok:** F. **Bergantung pada:** P-35, P-39. **Menentukan:** P-35.

1. **Kasus.** Arsip logbook Pusdalops dalam berkas CSV memuat kejadian yang pertama dicatat pada 365 dari 365 hari di
   2025, tetapi hanya pada 342 hari di 2021, 271 hari pada 2022, dan 327 hari pada 2023. Pada 2022 ada 94 hari tanpa
   satu pun kejadian yang dicatat pertama, tersebar di tiap bulan (2 sampai 10 hari per bulan) dengan rentang
   terpanjang 8 hari (7 sampai 14 November 2022). Pada 2023 seluruh 38 hari kosong jatuh antara Januari dan Mei.
2. **Mengapa ini paradoks.** Jawaban A: hari tanpa catatan berarti hari tanpa kejadian, jadi nol. Jawaban B: hari
   tanpa catatan sering berarti arsip bolong, bukan tanpa kejadian, dan memasukkan nol menciptakan penurunan
   palsu. Dari 2016 sampai 2020 dan 2024 sampai 2025, hampir setiap hari ada catatan, sehingga hari kosong pada
   2021 sampai 2023 patut dicurigai sebagai bolong arsip.
3. **Jawaban aturan saat ini.** Tidak diatur. Juklak 7/2023 menyebut data dinamis disampaikan minimal sehari
   sekali pada keadaan darurat, tetapi tidak membedakan "tidak ada kejadian" dari "tidak ada laporan".
4. **Jawaban praktik dunia.** Tidak ditemukan dalam bahan kami [BELUM TERVERIFIKASI]. Dokumentasi EM-DAT
   menyatakan data hilang (missingness) tidak acak dan memprediksi hilangnya data menurut tahun dan jenis (Jones
   dkk. 2022, nature.com/articles/s41597-022-01667-x).
5. **Opsi penyelesaian.**
   - *Opsi A, tandai eksplisit hari "tidak ada berkas" berbeda dari "nol kejadian"* dan keluarkan dari
     penyebut tren. Jumlah kejadian: tidak diubah. Tren: aman. Keadilan antardaerah: daerah dengan arsip
     bolong tidak tampak aman. Insentif pelapor: mendorong arsip lengkap. Beban pencatat: kecil (cek
     kelengkapan harian).
   - *Opsi B, normalisasi per hari tercatat.* Jumlah kejadian: tidak diubah. Tren: menolong deret lama,
     tetapi menganggap hari yang ada mewakili hari yang hilang. Keadilan antardaerah: daerah yang arsipnya
     bolong dinilai dari hari yang tersisa. Insentif pelapor: kecil. Beban pencatat: nol.
   - *Opsi C, isi hari kosong dengan interpolasi.* Jumlah kejadian: bertambah dari angka karangan. Tren:
     tampak mulus, tetapi tidak dianjurkan karena mengarang data. Keadilan antardaerah: menyamakan daerah
     yang bolong dengan yang lengkap. Insentif pelapor: tidak ada dorongan melengkapi arsip. Beban
     pencatat: nol.
6. **Uji empiris.** Logbook DOCX harian 1 Januari sampai 29 Oktober 2026: 302 dari 302 hari ada berkas; tidak ada
   hari hilang, tetapi 1.461 baris tabel tidak terurai (tanpa tanggal atau provinsi), dan 11 hari memuat kurang
   dari separuh median 28 baris per hari (paling sedikit 9 baris pada 8 Juni 2026). Logbook CSV: kejadian
   2021 ke 2022 turun 17,2 persen (3.768 ke 3.119); per hari yang ada catatannya, kejadian justru naik dari 11,0
   ke 11,5 (4,5 persen), sedangkan per hari kalender turun dari 10,3 ke 8,5. Hari kosong 2022 setara 25,8 persen
   tahun, cukup untuk menjelaskan seluruh penurunan 17,2 persen, tetapi penyebab sebenarnya perlu konfirmasi ke
   Pusdalops. DIBI: 2 hari
   tanpa baris pada 2024 dari 366; nol pada 2025 dan 2026. Sumber: tambahan_EFG.py bagian P61 dan
   `riset/SIM-KRITERIA.md` bagian 5.
7. **Rekomendasi sementara.** Opsi A; lihat Q-38 [BAWAAN SEMENTARA: hari kosong diperlakukan sebagai
   tidak diketahui sampai Pusdalops menjawab].

---

## Usulan pertanyaan terbuka

- **Q-37.** Apakah DIBI menyimpan kode wilayah saat kejadian dan batas terkini, atau hanya salah satu?
  Siapa memelihara tabel konkordansi pemekaran? [BAWAAN SEMENTARA] kami menyimpan keduanya; batas terkini untuk
  penyajian, batas saat kejadian untuk arsip.
- **Q-38.** Pada tahun-tahun logbook dengan hari kosong (2021 sampai 2023), apakah itu bolong arsip atau
  memang tidak ada kejadian baru? [BAWAAN SEMENTARA] diperlakukan sebagai tidak diketahui, tidak sebagai nol.
- **Q-39.** Siapa menetapkan definisi baku "hotspot" untuk laporan resmi BNPB: lokasi unik, atau titik
  mentah? [BAWAAN SEMENTARA] lokasi unik per hari WIB seperti keputusan 25 Oktober 2026, dengan nama definisi
  tertulis di tiap angka.

## Daftar periksa

1. Dasar hukum dan tanggal pembentukan Kalimantan Utara dan empat provinsi Papua baru [BELUM TERVERIFIKASI].
2. Dugaan DIBI memetakan kejadian lama ke batas terkini [BELUM TERVERIFIKASI]; perlu konfirmasi Pusdatinkom.
3. Angka SiPongi untuk hari yang sama tidak tersedia di repo [BELUM TERVERIFIKASI].
4. Definisi mirip BMKG dalam hitungan kami (MODIS keyakinan tinggi ditafsirkan 80 atau lebih) tidak sama persis
   dengan definisi lembaga itu.
5. Tanggal berhentinya distribusi S-NPP (1 November 13.00 UTC lawan deteksi terakhir hari WIB 2 November di cache)
   [BELUM TERVERIFIKASI].
6. Rasio laporan terhadap VIIRS dalam Kajian Ambang Hotspot diambil dari slide, bukan dihitung ulang.
7. Aturan penyajian tren pada praktik negara lain tidak ditemukan [BELUM TERVERIFIKASI].
8. Angka logbook DOCX berasal dari penguraian teks bebas; 1.461 baris tidak terurai.
