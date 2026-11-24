# Kajian longsor dari luar: apa yang bisa dipakai, apa yang tidak

Tanggal: 24 November 2026. Bahan: unggahan media sosial yang dikirim pemilik (Spasia, RUSLE Cisarua; catatan
pelatihan MaxEnt Karangkobar, Banjarnegara; peta kerawanan longsor DAS Kuranji, Padang). Pasangan catatan banjir:
`scripts/banjir/RISET-KAJIAN-LUAR.md`. Belum ada kode atau layar yang berubah. Angka dikutip dari unggahannya.

## 1. Ringkasan

Ketiga bahan membuat peta kerawanan dari faktor fisik (skor berbobot, MaxEnt, atau rumus erosi). Tak satu pun menguji
petanya lawan kejadian yang tidak dipakai menyusunnya, dan tak satu pun membandingkan dengan tebakan sederhana. Model
longsor kita sendiri sudah gagal tiga kali dengan cara serupa: AUC 0,7045 lawan klimatologi kabupaten x bulan 0,7772
(`PRAREG-LHASA2.md`). Hambatan utamanya label (kebiasaan melapor antarkabupaten), bukan kurang faktor. Jadi bahan ini
tidak mengubah arah model kita.

## 2. Penilaian per bahan

### 2.1 RUSLE untuk Cisarua sebelum longsor Januari 2026

- Klaim: tekanan sudah terbentuk sebelum longsor. Faktor R naik (hujan tahunan 2025 sekitar 3.800 mm, 2024 sekitar
  2.900 mm), LS besar (lereng di atas 40% paling luas), C naik (NDVI turun ke 0,58 pada 2023, lalu 0,63), P sekitar 1.
  Rata-rata kehilangan tanah naik dari sekitar 77 ton/ha/tahun (2024) ke sekitar 95 (2025), disebut "sinyal kondisi
  pra-kritis".
- Masalah:
  - RUSLE menghitung erosi permukaan (lembar dan alur), bukan gerakan massa tanah. Longsor dalam tidak dimodelkan
    oleh rumus ini;
  - K, LS, dan P hampir tetap dari tahun ke tahun, dan NDVI 2025 sama dengan 2024. Jadi lonjakan 2025 hampir
    seluruhnya ikut hujan tahunan. "Sinyal erosi" itu sebenarnya "tahun itu basah";
  - peta R hanya beberapa piksel besar (data hujan kasar), dan K hanya dua nilai;
  - hanya satu kejadian, dilihat ke belakang. Tidak diperiksa berapa tempat atau tahun lain yang soil loss-nya
    sama tinggi tetapi tidak longsor. Tanpa itu, peringatan palsu tidak terukur;
  - kelas bahaya erosi melompat dari "sedang 60–80" ke "berat 180–480"; rentang 80–180 tidak punya kelas.
- Untuk kita: tidak dipakai. Hujan tahunan sudah tidak cukup sebagai pemicu; model kita memakai hujan 7 hari di atas
  P95, dan LHASA2 sedang menguji hujan hari-H serta anteseden.

### 2.2 MaxEnt longsor Kecamatan Karangkobar, Banjarnegara

- Metode: MaxEnt di QGIS, faktor jenis batuan, lereng (DEMNAS), tata guna lahan, jarak sungai, jarak kelurusan.
  Variabel dengan korelasi Pearson di atas 0,8 dibuang (lereng dan jarak kelurusan 0,812). 25% titik acak untuk uji,
  10 ulangan. Hasil: AUC latih 0,846, AUC uji 0,907. Kontribusi: tata guna lahan 49,7%, litologi 28,6%, lereng 12,4%,
  jarak sungai 6,8%, jarak kelurusan 2,5%.
- Masalah:
  - AUC uji lebih tinggi dari AUC latih. Itu tanda titik uji terlalu mirip titik latih: titik longsor bergerombol,
    dan pembagian acak menaruh tetangga dekat di kedua sisi. Uji yang jujur memakai blok wilayah atau waktu terpisah;
  - AUC MaxEnt dihitung lawan latar acak, bukan lawan tempat yang terbukti tidak longsor. Nilainya naik hanya karena
    wilayah kajian dibuat lebih luas;
  - tata guna lahan menyumbang hampir separuh. Titik longsor yang dicatat biasanya di dekat jalan dan permukiman,
    jadi tata guna lahan bisa lebih banyak mengukur di mana orang melapor;
  - sumber titik longsor tidak disebut (penanya di kolom komentar juga menanyakannya);
  - Cramer's V di bawah 0,5 disebut "aman"; itu hanya ambang kebiasaan, bukan uji.
- Untuk kita: Karangkobar dan Banjarnegara adalah wilayah longsor berulang yang baik sebagai kasus uji. Titik longsor
  di sini bisa dicari di NASA Global Landslide Catalog dan DIBI yang sudah kita pakai (`kejadian.py`), bukan dari
  unggahan ini.

### 2.3 Peta kerawanan longsor DAS Kuranji, Padang

- Metode: skor 1–5 dan bobot, lalu overlay di ArcGIS. Bobot (Krisnandi dkk. 2021; Mukhlisa dkk. 2022): lereng 30%,
  curah hujan tahunan 20%, tipe batuan 20%, jenis tanah 15%, penggunaan lahan 15%. Hasil: 66,42% dari 22.469,56 ha
  masuk kelas tinggi dan sangat tinggi.
- Masalah:
  - peta yang menandai dua pertiga wilayah sebagai rawan tidak membantu memilih prioritas. Nilai peta ada pada
    kemampuannya memisahkan, bukan pada besarnya angka rawan;
  - peta curah hujan berupa poligon Thiessen dari beberapa stasiun, sehingga skor hujan melompat di garis poligon,
    bukan mengikuti medan;
  - tegalan dan sawah diberi skor tertinggi (5), di atas hutan (3). Sawah umumnya di dataran, jadi skor ini bisa
    menaikkan kerawanan di tempat datar;
  - tidak ada titik longsor yang ditumpangkan untuk memeriksa peta;
  - kalimat "wajar kalau di hulu longsor sering terjadi" menarik sebab dari peta yang belum diuji.
- Untuk kita: Padang (Kuranji) muncul juga di kajian banjir BRIN dan kejadian November 2025. Layak jadi wilayah uji
  bersama banjir dan longsor bila kita punya label titik untuk Sumatra Barat.

### 2.4 Spasia Geosolutions: MaxEnt longsor Kabupaten Garut

- Metode sama dengan MaxEnt banjir Garut mereka: jalan, sungai, lereng, DEM, penggunaan lahan, tekstur tanah.
  AUC latih 0,770, tanpa AUC uji.
- Masalah: sama dengan §2.2. Kurva respons jalan turun tajam menjauhi jalan, jadi model terutama belajar di mana titik
  longsor dicatat. Peta prediksi tampak seperti peta lereng dan jaringan sungai. Kabupaten dipilih karena "sudah
  dikenal rawan", jadi kesimpulannya melingkar.
- Untuk kita: tidak dipakai.

### 2.5 CSLE dan inventaris longsor, Loess Plateau (Tiongkok)

- Metode: longsor dipetakan dari citra Google Earth resolusi tinggi di Dongzhiyuan Tableland, lalu erosi dihitung
  dengan CSLE (R, K, LS, B, E, T) di 15 sub-DAS. Erosi rata-rata sekitar 50 ton/ha/tahun. Regresi luas dan volume
  longsor terhadap erosi: R² 0,68 pada kelas erosi di atas 10 ton/ha/tahun.
- Penilaian: ini bukan peta kerawanan, tetapi hubungan antara jumlah longsor dan laju erosi per sub-DAS. R² 0,68 dari
  15 sub-DAS adalah sampel kecil, dan keduanya dipengaruhi lereng yang sama, jadi sebagian hubungan bisa berasal dari
  lereng, bukan dari longsor itu sendiri. Tanah loess tebal 100 sampai 300 m tidak mirip lereng vulkanik Indonesia.
- Untuk kita: satu pelajaran yang berlaku: inventaris longsor dari citra resolusi tinggi (poligon bekas longsor) jauh
  lebih baik sebagai label daripada titik laporan. Bila ada inventaris poligon untuk wilayah Indonesia (misalnya dari
  pemetaan pasca-kejadian), itu calon label uji pertama untuk LHASA2.

### 2.6 RUSLE dan SEDD, Karimpuzha (India)

- Isi: erosi bisa mencapai ratusan ton/ha/tahun, tetapi hasil sedimen yang sampai ke sungai rata-rata hanya sekitar
  6,3 ton/ha/tahun. Dari 355 unit respons hidrologi (HRU), 71 ditetapkan sebagai prioritas konservasi.
  Sumber: ScienceDirect S2772809923000497.
- Penilaian: pelajaran pentingnya benar: erosi di lereng tidak sama dengan sedimen di sungai. Angka Cisarua (§2.1)
  dalam ton/ha/tahun karena itu tidak bisa dibaca sebagai material yang akan menimbun hilir.
- Untuk kita: relevan bagi neraca air dan pendangkalan sungai, bukan peringatan longsor. Tidak ada tindakan.

## 3. Aturan yang ditegaskan ulang

- Peta kerawanan longsor diuji lawan kejadian di blok wilayah atau waktu yang ditahan, dan harus mengalahkan
  klimatologi kabupaten x bulan, pembanding yang sudah dipakai `PRAREG-LHASA2.md`.
- AUC uji yang lebih tinggi dari AUC latih dibaca sebagai tanda kebocoran, bukan prestasi.
- Peta yang menandai sebagian besar wilayah sebagai rawan dilaporkan bersama persentase luas yang ditandai, supaya
  pembaca tahu seberapa tajam petanya.
- Tidak pernah menulis "aman" atau "rawan" sebagai vonis untuk satu tempat.
