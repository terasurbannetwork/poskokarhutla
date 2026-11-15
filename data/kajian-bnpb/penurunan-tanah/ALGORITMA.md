# ALGORITMA: Penurunan tanah dan proyeksi

Semua nilai ambang dan skenario di bawah adalah **HIPOTESIS** sampai validasi (bagian 6) lulus. Bagian 1 sampai 3 sudah dikodekan di `scripts/banjir/subsiden.py`; bagian 4 sampai 6 baru.

## 1. Dekomposisi vertikal (ada: `subsiden.py:68`)

Laju LOS satelit per piksel: v_LOS = E*vE + U*vU (vN diabaikan karena orbit hampir kutub). E dan U adalah komponen vektor pandang. LiCSBAS memberi mm per tahun, positif mendekati satelit (tanah naik), sehingga vertikal negatif berarti turun.

- Dua geometri (naik dan turun): selesaikan vU dari dua persamaan bila |E_a/U_a - E_t/U_t| >= 0,35 (`DET_MIN`); bila kurang, ambil rerata dua nilai vLOS/U dan tandai metode "rata".
- Satu geometri: vU = vLOS / U dengan asumsi gerak murni vertikal; tandai metode "satu".
- Piksel dibuang bila U <= 0,3, |vLOS| >= 400 mm per tahun, atau NaN.
- Satuan keluaran cm per tahun (bagi 10).

Gerak lempeng: `vlos_eur.tif` LiCSAR memuat proyeksi gerak lempeng 12,9 sampai 14,1 mm per tahun di Jakarta (RISET-SUBSIDEN.md:8). LiCSBAS tidak mengurangkannya; ia hilang hanya lewat pengurangan acuan (bagian 2), yang sah karena gerak lempeng hampir seragam di jendela kota. Periode frame naik dan turun bisa berbeda; periode tiap frame dicatat di berkas dan selisihnya ditulis di kartu (dua geometri dengan periode berbeda mengandung galat bila laju berubah).

Asumsi: gerak horizontal kecil dibanding vertikal di dataran aluvial. Tidak berlaku di lereng atau dekat patahan; kecamatan seperti itu perlu catatan bila muncul.

## 2. Acuan

Seluruh peta dikurangi median piksel area stabil (bawaan: lintang sampai -6,55 untuk Jakarta, dataran tinggi di selatan). Angka median acuan ditulis di `subsiden.json` (`referensi.median_dikurangkan_cm_thn`). Penurunan di acuan sendiri tidak mungkin diukur; galat acuan masuk ke ketidakpastian (bagian 4).

## 3. Agregasi per kecamatan (ada: `subsiden.py:102`)

Pengisian garis pindai poligon kecamatan; piksel valid dikumpulkan. Laporkan bila n >= 10 (`MIN_PIKSEL`): med (median), p90 sisi turun (kuantil 0,10 karena negatif turun, yaitu 90 persen piksel tidak lebih dalam dari itu), n, dan cakupan persen (piksel valid dibagi piksel di dalam poligon). Tambahan baru: p10 sisi naik (kuantil 0,90), galat baku median dari galat piksel LiCSBAS (`vstd`) dan simpangan antarpiksel, dan tanggal awal dan akhir deret.

Kecamatan dengan cakupan di bawah 30 persen tampil dengan label "cakupan rendah"; angka tidak disembunyikan, tetapi tidak dipakai di proyeksi (bagian 4).

Tahap kelurahan (Q4): sama, dengan `public/geo/desa/<kab>.json` (properti `kd`); aturan n minimum dinaikkan menurut ukuran poligon dan diatur saat tiket PT-09.

## 4. Ketidakpastian dan proyeksi (baru)

Per kecamatan dengan cakupan >= 30 persen:

- Tanda: laju negatif = turun. Laju pusat r = med; r_d = p90 sisi turun (kuantil 0,10, angka paling negatif); r_l = kuantil 0,90 (paling dangkal atau naik). Rentang p10 sampai p90 ini adalah sebaran antarpiksel di dalam kecamatan (keragaman ruang), BUKAN selang kepercayaan statistik.
- Dua galat dipisah. Galat statistik e_st = galat baku median dari galat piksel `vstd` LiCSBAS. Catatan: agregasi `subsiden.py:102-120` hari ini mengabaikan `vstd` per piksel (hanya median dan kuantil nilai laju); `vstd` harus dibaca di PT-03 sebelum e_st bisa dihitung. Galat acuan e_ref = simpangan antarpiksel area acuan dibagi akar jumlah piksel acuan efektif, ditambah selisih median acuan antar-geometri. Definisi s = akar(e_st kuadrat + e_ref kuadrat); keduanya ditulis terpisah di berkas.
- Penurunan kumulatif untuk T = 10 dan 20 tahun, dalam cm turun (positif): D(T) = -r * T. Rentang rendah memakai r_l dikurangi s (hasil dibatasi 0 dari bawah bila tanda r_l naik), rentang tinggi memakai r_d ditambah s; rendah <= pusat <= tinggi selalu berlaku karena r_d <= r <= r_l. Keluaran ditulis sebagai tiga angka (rendah, pusat, tinggi) dalam cm, dibulatkan 1 cm.
- Anggapan laju tetap. Laju bisa turun (pembatasan air tanah, tanggul) atau naik (pembangunan). Pada Q5 tidak ada skenario kebijakan; layar menulis "bila laju bertahan".
- Periode deret kurang dari 3 tahun: proyeksi tidak dihitung.

Proyeksi penurunan ini TIDAK dijumlahkan dengan prakiraan muka laut dan tidak dimasukkan ke status rob (D1). Bila DeltaDTM tersedia (Q6): untuk tiap kecamatan hitung luas dan persentase piksel DeltaDTM dengan elevasi di bawah ambang pasang tinggi stasiun terdekat (p90 stasiun, `pasut30`) sesudah dikurangi D(T) tiap rentang, dengan MAE DeltaDTM 0,43 m ditulis di sampingnya. Hasil ini adalah "elevasi dibanding ambang, setelah tanah turun", bukan probabilitas rob.

## 5. Gerbang pola

Per kota, sebelum menulis: Jakarta memakai gerbang yang ada (`subsiden.py:124`, utara lebih turun dari selatan minimal 1 cm per tahun). Gerbang itu hanya menguji pola relatif utara-selatan, BUKAN besaran: laju yang salah skala atau salah acuan tetap lolos. Acuan `ref_lat` dipilih manual (-6,55 untuk Jakarta) dan dilaporkan; besaran diuji di bagian 6. Kota lain butuh gerbang sendiri sebelum diterbitkan: Semarang (pesisir Tanjung Emas dan Genuk lebih turun dari Tembalang), Pekalongan (utara lebih turun dari selatan), Surabaya (belum ada rujukan pola; kota ini tampil terukur hanya sesudah validasi bagian 6). Gerbang baru ditulis di tiket PT-05 dan diperiksa `validasi-model`.

## 6. Validasi

Kegagalan validasi MEMBLOKIR tayangnya angka terukur dan proyeksi: kota itu tetap tampil dari literatur berlabel (aturan layar di ALUR A4). Alasan: angka tanpa acuan besaran yang cocok bisa salah satu orde. (Bila pemilik ingin tetap menayangkan dengan label "di luar rentang literatur", itu Q12, bawaan sementara: tidak.)

1. Pembanding utama, periode terdekat: Sidiq dkk. 2021 (SBAS Sentinel-1, 2016-2020) untuk Jakarta (maksimum lebih dari 5 cm per tahun), Semarang (8), Pekalongan (7); Anjasmara dkk. 2020 untuk Surabaya (4,5, laju LOS, tidak setara vertikal). Abidin dkk. 2011 dan 2013 (1982-2011) hanya pembanding sekunder karena periodenya jauh berbeda. **HIPOTESIS ambang**: lulus bila nilai terdalam antar kecamatan kota itu (kuantil p90 terdalam) berada antara 0,5 kali dan 2 kali angka maksimum Sidiq 2021 (untuk Jakarta yang ditulis "lebih dari 5": batas bawah 2,5 dan batas atas rentang maksimum Abidin, 28). Median kecamatan pesisir terdalam tidak boleh lebih dangkal dari laju terkecil literatur kota. Di luar itu: gagal.
2. Ujian tahan-waktu: laju dari separuh awal deret (misal 2019 sampai 2022) dipakai memprediksi pergeseran kumulatif separuh akhir (2023 sampai 2025) dari deret LiCSBAS yang sama. Lulus bila galat prediksi median kurang dari 2 kali s (bagian 4). Catatan: ini menguji kestabilan laju, bukan ketepatan terhadap kebenaran; laju yang berubah gagal.
3. GNSS atau levelling (Q11): bias, RMSE, dan korelasi di titik yang sama; ambang ditetapkan setelah data ada. Sebelum itu semua keluaran tetap hipotesis.
4. Uji jujur: laporkan persentase kecamatan yang lolos gerbang dan yang cakupannya rendah.

Angka gabungan dengan rob (Q10): tidak boleh sampai ada pra-registrasi dan uji balik terhadap `rob_kejadian.json`.

## 7. Basi

`subsiden.json` yang lebih tua dari 400 hari tampil dengan tanda "data lebih dari satu tahun" (satu siklus tahunan ditambah toleransi sekitar 35 hari untuk keterlambatan penyegaran manual). Laju tanah bergerak lambat sehingga data setahun masih berguna untuk proyeksi, tetapi tanda wajib agar pembaca tahu penyegaran terlewat. Proyeksi tidak dihitung ulang dari data basi tanpa tanda itu. Ambang 400 hari adalah hipotesis (tidak ada ukuran empiris kecepatan perubahan laju).
