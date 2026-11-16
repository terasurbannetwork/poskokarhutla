# Lampiran A, kelompok G: Kelembagaan dan tata kelola

Kelompok ini memuat empat paradoks yang tidak bisa dijawab oleh rumus. Pertanyaannya siapa yang berwenang
memutuskan, bagaimana keputusan itu diberi identitas, apa yang terjadi bila keputusan dikoreksi, dan apakah
aturan yang dirancang untuk bencana alam berlaku untuk bencana nonalam dan sosial. Jawaban teknis (jarak,
time window, ambang) tetap diperlukan, tetapi tidak berlaku bila tidak ada pihak yang jelas berwenang
menetapkannya dan tidak ada nomor yang menandai hasilnya. Angka tambahan dalam berkas ini dihitung oleh
`analisis/tambahan_EFG.py` (keluaran `analisis/hasil/tambahan_EFG.json`) dari tarikan Data dan Informasi Bencana
Indonesia (DIBI) 12 November 2026, snapshot DIBI repo, logbook Pusat Pengendalian Operasi (Pusdalops) BNPB, dan
berkas kluster karhutla harian. Pusat Data, Informasi, dan Komunikasi Kebencanaan disebut Pusdatinkom, selaku
walidata bencana. "Rancangan sistem internal" berarti dokumen `data/kajian-bnpb/siklus/` yang belum menjadi
peraturan.

---

### P-45 Siapa berwenang menyatakan "satu kejadian"

**Kelompok:** G. **Bergantung pada:** P-01, P-38, P-48. **Menentukan:** P-59, P-46.

1. **Kasus.** Logbook Pusdalops 2026 (arsip 1 Januari sampai 29 Oktober, 9.329 baris harian) menghasilkan jumlah
   kejadian yang berbeda tergantung kunci yang dipakai deduplication: 3.860 (jenis, provinsi, kabupaten,
   tanggal kejadian), 3.756 (kunci itu ditambah penggabungan kabupaten beririsan), 2.809 (jenis, provinsi,
   kabupaten, jeda sampai 7 hari), 2.913 (tanpa kabupaten), dan 8.715 bila tidak ada penghapusan sama sekali
   (`riset/SIM-KRITERIA.md` bagian 4). Aturan resmi tidak menyebut siapa yang memilih kunci itu dan atas dasar apa.
2. **Mengapa ini paradoks.** Jawaban A: pihak yang paling dekat dengan kejadian, yaitu Badan Penanggulangan
   Bencana Daerah (BPBD), paling tahu apakah dua laporan itu satu kejadian. Jawaban B: pihak pusat, yaitu
   Pusdatinkom, yang harus konsisten antardaerah. Bila keputusan diserahkan ke daerah, aturannya berbeda-beda;
   bila ke pusat, pusat memutuskan tanpa melihat lapangan.
3. **Jawaban aturan saat ini.** Juklak 7/2023 (Petunjuk Pelaksanaan Nomor 7 Tahun 2023) hlm. 7 Catatan c: kode
   referensi bencana untuk kejadian beberapa wilayah dan kejadian di laut "ditentukan oleh Pusat Data Informasi,
   dan Komunikasi Bencana melalui proses verifikasi". Hlm. 4: verifikasi di daerah dilakukan BPBD provinsi dan
   kabupaten/kota. Perban BNPB 1/2023 Pasal 8 huruf c menyerahkan "kriteria kejadian bencana" dan "nomor induk
   tiap-tiap kejadian bencana" kepada walidata; Pasal 25 ayat (4) membolehkan walidata mengembalikan data kepada
   produsen; Pasal 32 menyatakan penyelenggaraan satu data bencana dikecualikan pada saat kedaruratan, mengikuti
   sistem komando bila ada status darurat, dan dikoordinasikan BPBD bila tidak ada status. Tidak ada ketentuan
   tentang siapa memutuskan dua laporan sebagai satu kejadian di luar kasus lintas wilayah dan laut.
4. **Jawaban praktik dunia.** EM-DAT: pusat pencatat (CRED) memberi pengenal DisNo, satu entri per negara yang
   tertaut ke DisNo yang sama (doc.emdat.be/docs/data-structure-and-content/emdat-public-table/). GLIDE:
   nomor diterbitkan oleh pusat untuk kejadian yang dilaporkan mitra (glidenumber.net/glide/public/about.jsp).
   DesInventar: pencatat nasional menentukan pencatatan di unit geografis terendah (`riset/PUSTAKA.md`).
5. **Opsi penyelesaian.**
   - *Opsi A, Pusdatinkom memutuskan, BPBD mengusulkan (bawaan Q-08).* Jumlah kejadian: konsisten nasional.
     Tren: stabil. Keadilan antardaerah: baik, satu standar. Insentif pelapor: BPBD tidak punya alasan memecah
     kejadian. Beban pencatat: BPBD hanya mengusulkan; beban Pusdatinkom naik karena harus meninjau usulan.
   - *Opsi B, mesin mengusulkan dengan aturan tertulis, manusia (Pusdatinkom) menyetujui, semua dengan jejak.*
     Jumlah kejadian: reprodusibel. Tren: stabil selama aturan mesin tidak berubah. Keadilan antardaerah:
     seragam, karena aturan sama di semua daerah. Insentif pelapor: tidak ada alasan memecah laporan. Beban
     pencatat: kecil; risikonya aturan mesin keliru bila tidak ditinjau.
   - *Opsi C, BPBD memutuskan di wilayahnya, Pusdatinkom hanya untuk lintas wilayah.* Jumlah kejadian: cepat
     tersedia, tetapi dapat berbeda antardaerah. Tren: bergeser bila praktik daerah berubah. Keadilan
     antardaerah: aturan berbeda membuat angka tidak sebanding. Insentif pelapor: ada dorongan memecah
     kejadian. Beban pencatat: BPBD naik; beban Pusdatinkom turun.
6. **Uji empiris.** Menurut kunci V2 (tanpa tanggal), 464 dari 1.256 kejadian multihari (36,9 persen) memiliki lebih dari
   satu tanggal kejadian di logbook, sehingga kunci yang berbasis tanggal memecah kejadian yang sama. Sumber:
   `riset/SIM-KRITERIA.md` bagian 4 dan `analisis/hasil/uji_kunci_logbook.json`. Penerapan Opsi B ada pada
   rancangan sistem internal kita (Siklus Bencana, F1.2 dan F1.5): pasangan dibentuk mesin, pemindahan atau
   gabung dilakukan petugas dan dicatat sebagai jejak.
7. **Rekomendasi sementara.** Q-08: Pusdatinkom memutuskan, BPBD mengusulkan, dan mesin menyarankan dengan
   jejak [BAWAAN SEMENTARA]. Aturan yang tertulis (misalnya gabung kluster karhutla) boleh diterapkan mesin secara
   otomatis dengan jejak dan dapat dibatalkan Pusdatinkom; yang diputuskan Pusdatinkom hanya kasus di luar aturan
   atau yang disengketakan. Batas waktu pengesahan dan jalur keberatan BPBD belum ditulis.

---

### P-46 Koreksi setelah terbit

**Kelompok:** G. **Bergantung pada:** P-27, P-41, P-39. **Menentukan:** P-35, P-42.

1. **Kasus.** Dua snapshot DIBI di repo dibangun dengan cara yang sama: 28 Oktober 2026 dan 11 November 2026.
   Untuk tanggal kejadian 21 sampai 28 Oktober 2026, snapshot pertama memuat 48 kombinasi (hari, kabupaten, jenis)
   dengan 2.630 orang terdampak; snapshot kedua, 14 hari kemudian, memuat 73 kombinasi dengan 62.015 orang
   terdampak. Dua puluh enam kombinasi baru muncul, sehingga snapshot kedua memuat 52 persen lebih banyak kombinasi
   untuk pekan yang sama.
2. **Mengapa ini paradoks.** Jawaban A: angka yang sudah dilaporkan ke pimpinan tidak diubah, supaya dokumen
   resmi tetap konsisten. Jawaban B: angka dikoreksi bila ada data baru, supaya akurat. Mengubah membuat laporan
   lama keliru; tidak mengubah membuat angka resmi salah.
3. **Jawaban aturan saat ini.** Juklak 7/2023 hlm. 3 sampai 4: data dinamis berubah sesuai laporan
   perkembangan, data statis tetap dan disampaikan "sesuai dengan periode waktu yang telah ditentukan", yang
   tidak diisi angka. Tidak ada mekanisme koreksi, versi, atau pembekuan (`riset/REGULASI.md` bagian 9 butir
   13). Perban 1/2023 Pasal 25 ayat (4): walidata dapat mengembalikan data kepada produsen untuk diperbaiki;
   Pasal 30: walidata menentukan periode penyimpanan data historis. Catatan repo
   (`public/data/dibi_kejadian.json`): DIBI "sering diperbarui susulan".
4. **Jawaban praktik dunia.** Technical Guidance Sendai menuntut kriteria tetap dan metadata konsisten bila
   metodologi berubah, serta tenggat atribusi tertentu supaya angka dapat ditutup. PAGER menerbitkan ulang
   peringatan seiring perkiraan korban membaik. Kebijakan versi atau revisi EM-DAT, GLIDE, dan DesInventar tidak
   terverifikasi dalam bahan kami [BELUM TERVERIFIKASI].
5. **Opsi penyelesaian.**
   - *Opsi A, versi bernomor dengan tanggal rilis; statis dibekukan per periode, koreksi menjadi rilis baru
     dengan catatan perubahan.* Jumlah kejadian: per rilis stabil. Tren: dibandingkan antarrilis dengan
     catatan. Keadilan antardaerah: daerah yang terlambat melapor tidak dirugikan karena dapat masuk rilis
     berikutnya. Insentif pelapor: melapor tepat waktu tetap lebih baik. Beban pencatat: naik, demikian juga
     beban walidata.
   - *Opsi B, angka hidup tanpa versi, diberi label "per tanggal tarik".* Jumlah kejadian: berubah tiap
     tarikan. Tren: bergeser tanpa jejak, dan laporan lama tidak dapat direproduksi. Keadilan antardaerah:
     daerah yang melapor terlambat tampak lebih rendah pada tarikan awal. Insentif pelapor: kecil, karena
     tidak ada batas waktu. Beban pencatat: kecil dan murah bagi walidata.
   - *Opsi C, bekukan angka pada tiap laporan ke pimpinan dan sediakan tabel "angka terbit lawan angka kini".*
     Jumlah kejadian: dua angka, terbit dan kini. Tren: terbaca dengan koreksinya. Keadilan antardaerah:
     selisih tiap daerah terlihat. Insentif pelapor: melapor tepat waktu mengecilkan selisih. Beban pencatat:
     kecil bila tabel dihasilkan mesin; cocok untuk laporan harian dan Presiden.
6. **Uji empiris.** Untuk tanggal kejadian 13 November 2025 sampai 20 Oktober 2026 (3.851 kombinasi yang sama
   di kedua snapshot): 16 kombinasi (0,4 persen) berubah angka dampaknya dalam 14 hari; 4 kombinasi baru muncul;
   orang terdampak naik dari 11.001.235 menjadi 11.059.904 (0,5 persen); rumah rusak berat naik dari 97.803
   menjadi 97.918; korban meninggal tetap 1.872. Perubahan terbesar terjadi pada hari-hari terakhir
   (Kasus). Pada logbook Pusdalops, 157 kejadian (11,6 persen dari yang lebih dari satu hari) dikoreksi turun
   antarhari pada salah satu angka dampak. Catatan: snapshot repo dan tarikan mentah DIBI tidak
   dibandingkan karena cara menggabung baris kembar berbeda. Sumber: tambahan_EFG.py bagian P46 dan
   `riset/SIM-KRITERIA.md` bagian 4.
7. **Rekomendasi sementara.** Q-07: angka statis dibekukan per rilis dengan nomor versi (Opsi A), dan
   tabel "angka terbit lawan angka kini" (Opsi C) untuk laporan pimpinan [BAWAAN SEMENTARA].

---

### P-47 Bencana nonalam dan sosial

**Kelompok:** G. **Bergantung pada:** P-18, P-23, P-57. **Menentukan:** rancangan L2 dan L3.

1. **Kasus.** COVID-19 ditetapkan sebagai bencana nonalam nasional dari 13 April 2020 sampai 21 Juni 2023
   (Keppres 12/2020 dan Keppres 17/2023, 1.165 hari). Kementerian Kesehatan (2024), dikutip Renstra BNPB
   2025 sampai 2029, mencatat 6.811.945 kasus dan 161.870 meninggal sampai sekitar akhir Juni 2023
   (`data/kajian-bnpb/data/nonalam-sosial/covid19_nasional.csv`). Di tarikan DIBI 2024 sampai 12 November 2026,
   seluruh jenis epidemi dan wabah hanya 9 baris dengan 34 meninggal dan paling banyak 2.010 terdampak.
2. **Mengapa ini paradoks.** Jawaban A: satu aturan untuk semua jenis bencana menjamin keseragaman, dan Undang-Undang
   24/2007 Pasal 1 angka 1 sampai 4 memang menyatukan bencana alam, nonalam, dan sosial. Jawaban B: ambang dan
   skala yang dibuat untuk bahaya fisik tidak cocok untuk epidemi (kasus, bukan rumah rusak) atau konflik
   sosial (tidak ada hektare), dan unit "kabupaten per hari" tidak bermakna bagi epidemi nasional.
3. **Jawaban aturan saat ini.** Juklak 7/2023 menyebut 13 jenis ancaman: 9 alam (kode 101 sampai 109), 3 nonalam
   (201 epidemi dan wabah penyakit, 202 kebakaran gedung dan permukiman, 203 gagal teknologi), 1 sosial (301
   konflik sosial), dengan ambang yang sama. Celah yang dicatat di `riset/REGULASI.md` bagian 9 butir 18: epidemi
   memakai ambang yang sama tanpa definisi kasus atau sumber data sektor kesehatan. Ketidakselarasan kode:
   Lampiran I hlm. 19 menulis 202 dua kali (kebakaran gedung dan gagal teknologi), sedangkan Bab II hlm. 6 memberi
   gagal teknologi kode 203; Lampiran II hlm. 34 menulis "202. Epidemi". Panduan Lapjol Pusdalops 2025 tidak
   memberi kriteria "menonjol" untuk epidemi, kebakaran gedung, gagal teknologi, dan konflik sosial
   (`scripts/wa/panduan_resmi.json`, `menonjol: null`), sehingga jenis itu tidak menonjol lewat panduan.
4. **Jawaban praktik dunia.** EM-DAT memakai kriteria masuk (10 meninggal, 100 terdampak, atau
   deklarasi darurat) yang pada halaman protokolnya tidak dibedakan menurut tipe, dan mencatat bahwa kejadian biologis (epidemi) kurang tercakup
   (doc.emdat.be/docs/known-issues-and-limitations/specific-biases/). Cakupan Kerangka Sendai mencakup bahaya alam
   dan buatan manusia (A/71/644).
5. **Opsi penyelesaian.**
   - *Opsi A, satu ambang untuk semua jenis (keadaan sekarang).* Jumlah kejadian: epidemi dan sosial tidak
     bermakna. Tren: menyesatkan. Keadilan antardaerah: adil secara formal tetapi tidak setara dalam
     kenyataan. Insentif pelapor: kecil. Beban pencatat: nol.
   - *Opsi B, ambang dan satuan khusus per kelompok:* epidemi memakai penetapan otoritas kesehatan sebagai pintu
     masuk, konflik sosial memakai korban dan orang mengungsi. Jumlah kejadian: bermakna per kelompok. Tren:
     terbaca per kelompok. Keadilan antardaerah: baik antarkelompok. Insentif pelapor: pelapor perlu
     menunggu penetapan sektor. Beban pencatat: naik karena butuh sumber lain (Kementerian Kesehatan,
     kepolisian).
   - *Opsi C, pisahkan pencatatan: DIBI memuat bencana alam dan kejadian nonalam yang bersifat fisik; epidemi
     dan konflik dicatat di sistem sektor lain dan hanya direferensikan.* Jumlah kejadian: DIBI lebih
     sederhana, tetapi bencana nonalam keluar dari satu data bencana. Tren: deret nonalam terputus dari DIBI.
     Keadilan antardaerah: bergantung mutu sistem sektor tiap daerah. Insentif pelapor: pelapor melapor ke
     sektor lain. Beban pencatat: turun di DIBI, naik pada penautan antarsistem.
6. **Uji empiris.** DIBI 2024 sampai 12 November 2026, 15.974 baris: epidemi 9 baris (34 meninggal, 4.604
   terdampak, luka, dan mengungsi), gagal teknologi 9 baris (88 meninggal, paling banyak 63 dalam satu baris),
   konflik sosial 13 baris (54 meninggal, 29.731 terdampak, 974 rumah rusak): total 31 baris atau 0,19 persen.
   Sebagian besar memenuhi K1 sampai K3 (6 dari 9, 8 dari 9, 12 dari 13), jadi ambang hampir tidak menyaring jenis ini.
   Logbook CSV 2011 sampai 2026: 27 baris wabah, 95 konflik sosial, 25 kegagalan teknologi, dan 493
   "kecelakaan" yang tidak punya padanan langsung dalam 13 jenis Juklak [BELUM TERVERIFIKASI]. Pembanding: kebakaran gedung dan permukiman 1.105 baris DIBI.
   Rekap DIBI repo untuk jenis ini baru memuat 2018, 2019, dan 2024 sampai 2026, jadi bagaimana DIBI mencatat
   COVID-19 pada 2020 sampai 2023 belum diketahui [BELUM TERVERIFIKASI]. Sumber: tambahan_EFG.py bagian P47.
7. **Rekomendasi sementara.** Opsi B sebagai arah; lihat Q-42 [BAWAAN SEMENTARA: epidemi dan konflik
   dicatat dengan penetapan otoritas sektor sebagai pintu masuk ditambah M1 (1 orang meninggal atau hilang akibat
   langsung); ambang M2 sampai M5 tidak berlaku].

---

### P-59 Banyak sistem identitas

**Kelompok:** G. **Bergantung pada:** P-45, P-48, P-55. **Menentukan:** P-38, P-46.

1. **Kasus.** Setidaknya empat sistem identitas dipakai bersamaan: (a) Kode Identitas Bencana (KIB), 16 digit;
   (b) baris DIBI tanpa kolom KIB (26 kolom tarikan publik, tidak ada pengenal kejadian); (c) ID Buku Besar
   Kejadian pada rancangan sistem internal kita, bentuk `KJ-2026-9A2WGN3G`; dan (d) kode kluster karhutla harian
   `K0001` dan seterusnya.
2. **Mengapa ini paradoks.** Jawaban A: satu kejadian harus punya satu nomor agar semua sumber bisa ditautkan.
   Jawaban B: tiap sistem punya satuan yang berbeda (kejadian, baris wilayah-hari, kluster hari ini), sehingga
   satu nomor tidak dapat memuat semuanya.
3. **Jawaban aturan saat ini.** Juklak 7/2023 hlm. 6 sampai 7: KIB 16 digit, yaitu 2 angka provinsi, 2 angka
   kabupaten/kota, 3 angka kode bencana, 8 angka tanggal, dan 1 angka indeks; wilayah mengikuti episentrum
   (hlm. 7 Catatan a sampai c); 15 digit awal dihitung satu kejadian (hlm. 20). Indeks hanya satu digit,
   sehingga paling banyak sembilan kejadian sejenis per kabupaten per hari bila indeks dimulai dari 1 seperti
   contoh Juklak, dan KIB hanya memuat satu kabupaten sedangkan
   butir 4b menghitung kejadian per kabupaten terdampak. Panduan Logbook Pusdalops (01/PO.02/07/2025) memberi
   sufiks -001 untuk kejadian baru dan -002, -003 untuk pengkinian, dan menyatakan KIB cukup kode bencana bila
   kejadian meliputi beberapa kabupaten dalam satu provinsi. Perban 1/2023 Pasal 8 huruf c menyerahkan nomor
   induk kejadian kepada walidata.
4. **Jawaban praktik dunia.** EM-DAT: DisNo dari tahun dan urutan, satu DisNo untuk beberapa entri negara.
   GLIDE: dua huruf jenis, tahun, enam digit urut, dan kode negara tiga huruf (contoh EQ-2001-000033-IND)
   (`riset/PUSTAKA.md` butir 1 dan 4). Aturan GLIDE untuk kejadian berantai [BELUM TERVERIFIKASI].
5. **Opsi penyelesaian.**
   - *Opsi A, KIB sebagai satu-satunya nomor, diperluas dengan indeks lebih panjang dan induk lintas
     kabupaten.* Resmi dan sederhana, tetapi memerlukan perubahan Juklak. Jumlah kejadian: tidak berubah.
     Tren: stabil. Keadilan antardaerah: sama. Insentif pelapor: tidak ada alasan memecah nomor. Beban
     pencatat: naik sedikit.
   - *Opsi B, nomor induk-anak: satu induk per kejadian, satu anak per kabupaten, gaya EM-DAT.* Menjawab P-48
     dan P-05. Jumlah kejadian: nasional jelas, satu induk. Tren: jelas. Keadilan antardaerah: tiap
     kabupaten tetap tercatat sebagai anak. Insentif pelapor: tidak ada alasan memecah induk. Beban
     pencatat: naik sedikit; beban walidata naik karena menerbitkan nomor induk.
   - *Opsi C, nomor internal (KJ-) sebagai kunci kerja dan pemetaan satu arah ke KIB resmi.* Jumlah
     kejadian: tidak berubah. Tren: stabil selama tabel pemetaan terpelihara. Keadilan antardaerah: sama.
     Insentif pelapor: tidak ada. Beban pencatat: kecil; beban pemeliharaan tabel pemetaan ada pada
     Pusdatinkom. Tidak mengubah peraturan sekarang.
6. **Uji empiris.** Tarikan DIBI 12 November 2026: 714 dari 15.974 baris menggabungkan lebih dari satu baris
   mentah (kolom `n_baris`), maksimum 12; dua kombinasi (hari, kabupaten, jenis) memuat 10 dan 12 baris
   mentah, yang melebihi kapasitas indeks satu angka bila tiap baris mentah adalah kejadian terpisah (belum
   tentu). Logbook DOCX 2026: 551 kombinasi (hari, jenis, provinsi, kabupaten) punya lebih dari satu baris
   (maksimum 6); 1.234 dari 9.329 baris (13,2 persen) memuat lebih dari satu kabupaten (sampai 14); 511 baris
   (5,5 persen) tanpa kabupaten. Kluster karhutla 18 sampai 24 Oktober 2026 (`public/data/kluster_hari/*.json`,
   enam pasangan hari berurutan): dari 50.360 kluster hari ke-1 yang punya tetangga dalam 2 km pada hari ke-2,
   hanya 22 (0,04 persen) membawa kode yang sama; jarak antarpasangan berkode sama bermedian 1.089 sampai
   1.332 km. Kode itu memang urutan per hari, bukan identitas. Sumber: tambahan_EFG.py bagian P59.
7. **Rekomendasi sementara.** Opsi B untuk arah Juklak, dan Opsi C untuk masa transisi; kode kluster harian
   tidak pernah dipakai sebagai identitas kejadian (Siklus Bencana menyimpannya hanya sebagai pengenal hari).
   Nomor induk diterbitkan Pusdatinkom sebagai walidata, dan KIB 16 digit dimiliki tiap catatan kabupaten. Lihat Q-40 [BAWAAN SEMENTARA].

---

## Usulan pertanyaan terbuka

- **Q-40.** Siapa menerbitkan nomor induk kejadian (Perban 1/2023 Pasal 8 huruf c butir 3), dan dalam
  format apa untuk kejadian lintas kabupaten? [BAWAAN SEMENTARA] Pusdatinkom menerbitkan nomor induk kejadian nasional
  (KJN); tiap catatan kabupaten (CK) memakai KIB 16 digit dan membawa nomor induk itu.
- **Q-41.** Apa periode rilis data statis dan mekanisme versinya (Juklak hlm. 3 sampai 4 tidak mengisi
  periode)? [BAWAAN SEMENTARA] rilis bulanan bernomor versi, dibekukan per triwulan, koreksi sebagai rilis baru.
- **Q-42.** Apakah epidemi dan konflik sosial memakai ambang yang sama dengan bencana alam, atau pintu
  masuk berupa penetapan otoritas sektor? [BAWAAN SEMENTARA] penetapan otoritas sektor sebagai pintu masuk,
  ditambah M1; M2 sampai M5 tidak berlaku.
- **Q-43.** Bagaimana DIBI mencatat COVID-19 pada 2020 sampai 2023? [BAWAAN SEMENTARA] tidak diketahui;
  tidak dipakai sebagai contoh sampai Pusdatinkom menjawab.

## Daftar periksa

1. Salinan resmi Juklak 7/2023 dari JDIH BNPB (Q-02); kutipan hlm. 3 sampai 7, 19, 20, 34 diambil dari PDF UNFPA.
2. Tabel Petunjuk Pengisian hlm. 21 sampai 24 dan tabel jenis ancaman hlm. 5 sampai 6 perlu dicek visual.
3. Aturan GLIDE untuk kejadian lintas negara dan berantai [BELUM TERVERIFIKASI].
4. Kebijakan revisi EM-DAT, GLIDE, DesInventar [BELUM TERVERIFIKASI].
5. Cara DIBI mencatat COVID-19 pada 2020 sampai 2023 [BELUM TERVERIFIKASI].
6. Angka COVID-19 berasal dari kutipan Renstra BNPB 2025 sampai 2029 atas data Kementerian Kesehatan (2024),
   bukan dari sumber primer yang dibuka.
7. Snapshot DIBI repo (28 Oktober dan 11 November 2026) dibangun dengan penggabungan baris kembar yang tidak
   sama dengan tarikan mentah 12 November, sehingga hanya keduanya yang dibandingkan.
8. Panduan Logbook, Laphar, dan Lapjol Pusdalops berstatus draf (9 Juli 2025).
