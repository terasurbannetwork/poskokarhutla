# Penurunan tanah InSAR dan proyeksi

Halaman ini menjelaskan penurunan tanah dari InSAR dan proyeksi 10 dan 20 tahun.

## 16. Penurunan tanah dari InSAR (paket `penurunan-tanah`, lab, belum tayang)

Pipa: data tidak diproses di repo. Laju arah pandang satelit (LOS) dihitung di luar repo di mesin pemilik dengan LiCSBAS dari interferogram COMET LiCSAR (Sentinel-1). Skrip `scripts/banjir/subsiden.py` (stdlib saja) membaca laju LOS naik dan turun, vektor pandang `E`, `U`, dan `EQA.dem_par`, lalu:

```
v_LOS = E*vE + U*vU                 (vN diabaikan: orbit hampir kutub; LiCSBAS mm/tahun, positif = mendekati satelit)
piksel dibuang bila U <= 0,3, |v_LOS| >= 400 mm/tahun, atau tidak ada nilai   (U_MIN, SAH_MM)
dua geometri : selesaikan vU bila |E_a/U_a - E_t/U_t| >= 0,35 (DET_MIN), metode "dua"; bila kurang, rata-rata dua vLOS/U, metode "rata"
satu geometri: vU = v_LOS / U, metode "satu" (asumsi gerak murni vertikal)
satuan keluaran cm/tahun, negatif = turun
```

(`subsiden.py:28-32`, `:69`). Acuan: seluruh peta dikurangi median piksel area stabil (garis lintang batas, mis. -6,55 untuk Jakarta; angkanya ditulis di `referensi.median_dikurangkan_cm_thn`), sehingga gerak lempeng yang hampir seragam hilang. Galat acuan `e_ref` = simpangan piksel acuan dibagi akar jumlah piksel ditambah selisih median acuan naik dan turun (`galat_acuan`, `:144`).

Agregasi per kecamatan (`public/geo/kecamatan`, `agregasi`, `:103`): pengisian garis pindai poligon; kecamatan dilaporkan bila piksel valid 10 atau lebih (`MIN_PIKSEL`). Nilai: `med` (median), `p90` (kuantil 0,10, sisi paling dalam), `p10` (kuantil 0,90, sisi dangkal atau naik), `n`, `cakupan` persen, `galat` = 1,2533 kali akar((varians antarpiksel + rata-rata galat piksel kuadrat) / n), serta `galat_sumber` ("vstd" atau "antarpiksel_saja") dan `tgl_awal`, `tgl_akhir` deret. Galat ini adalah BATAS BAWAH (`galat_jenis: "batas_bawah_piksel_bebas"`) karena piksel InSAR berkorelasi ruang; pemilihan jumlah efektif (variogram atau bootstrap blok) belum diputuskan.

Gerbang pola (`gerbang_pola`, `:135`): median kecamatan Jakarta Utara harus lebih turun sekurang-kurangnya 1 cm/tahun dari Jakarta Selatan. Bila gagal, tidak ada berkas ditulis. Gerbang ini hanya menguji pola relatif utara-selatan, bukan besaran.

Validasi (ALGORITMA bagian 6): (1) pembanding literatur periode terdekat: nilai terdalam antarkecamatan (kuantil p90 terdalam) harus berada antara 0,5 dan 2 kali angka maksimum literatur kota, dan median kecamatan pesisir terdalam tidak boleh lebih dangkal dari laju terkecil literatur; (2) ujian tahan-waktu (laju separuh awal deret memprediksi pergeseran separuh akhir, galat median kurang dari 2 kali `s`); (3) pembanding GNSS atau levelling bila datanya ada; (4) laporan persentase kecamatan yang lolos gerbang dan yang cakupannya rendah. Kegagalan validasi memblokir tayangnya angka terukur: kota itu tetap tampil dari literatur berlabel.

Hasil terbaru (catatan riset 24 November 2026, `data/kajian-bnpb/penurunan-tanah/RISET.md` bagian 6.5 sampai 6.8), semuanya hipotesis:

| Percobaan | Hasil |
| --- | --- |
| Data pihak ketiga berlisensi CC0 (InSAR kerangka IGS14, berkas di `data/banjir/subsiden/`) | Tidak lolos gerbang pola (Jakarta Utara +0,55 lawan Selatan +0,1 cm/tahun). Hanya disimpan sebagai pembanding, tidak dipakai layar atau proyeksi. |
| LiCSBAS putaran 1 Jakarta (dua frame, deramp derajat 1, tanpa GACOS) | Gerbang pola gagal (Utara 0,0 lawan Selatan +0,95). Tidak layak dipakai; laju mentah di Bogor -77 mm/tahun tidak masuk akal secara fisik. |
| LiCSBAS putaran 2 (GACOS, jendela Jakarta, tanpa deramp), 2020 sampai 2023, acuan lintang -6,30 | Gerbang pola LOLOS (Utara -1,3 lawan Selatan +0,1 cm/tahun), 42 kecamatan, galat acuan 0,55 cm/tahun. Validasi literatur lolos (p90 terdalam 3,9 cm/tahun di dalam rentang 2,5 sampai 28). Ujian tahan-waktu belum dijalankan; data GNSS belum ada. |

Karena ujian tahan-waktu belum ada vonis, berkas `subsiden.json` dan `proyeksi_tanah.json` hasil putaran 2 TIDAK ditaruh di `public/` dan tidak tayang; berkas disimpan di luar repo di mesin pemilik. Angka kecamatan terdalam putaran 2 masih di bawah titik ukur Muara Baru dari literatur (sekitar 10 cm/tahun), dengan dugaan piksel 330 m dan masker koherensi menyaring cekungan paling cepat. Hanya Jakarta yang diproses; Semarang, Pekalongan, dan Surabaya belum, dan masing-masing butuh gerbang pola sendiri.

Dokumen KEPUTUSAN-PENURUNAN masih mencatat Q1 (izin menjalankan skrip LiCSBAS di luar repo) dengan bawaan "tidak diizinkan", padahal RISET 6.7 menyebut izin diberikan pemilik di percakapan 24 November 2026 (lihat Batasan).

Kutipan literatur (`subsiden_literatur.json`, diperbarui 21 Oktober 2026): rentang per kota dengan sitasi dan tanda verifikasi, tidak sebanding antarkota karena periode, metode, dan besaran berbeda. Contoh: Jakarta umumnya 1 sampai 15 cm/tahun (beberapa lokasi 20 sampai 28) untuk 1982 sampai 2010 dan lebih dari 5 cm/tahun untuk 2016 sampai 2020 (InSAR SBAS); Semarang sampai sekitar 19 cm/tahun. Dua sumber yang abstraknya diblokir penerbit sengaja tidak dimasukkan. Angka rerata 3,5 cm/tahun dari BRIN belum punya sumber primer di repo dan tidak ditampilkan.

## 17. Proyeksi penurunan tanah 10 dan 20 tahun (`scripts/banjir/proyeksi_tanah.py`)

Masukan `subsiden.json` (tanpa berkas itu skrip keluar tanpa menulis). Per kecamatan dengan cakupan 30 persen atau lebih dan deret 3 tahun atau lebih (`proyeksi_tanah.py:16-17`); selain itu tidak diproyeksikan:

```
s  = akar(galat^2 + e_ref^2)                      (e_ref kosong dihitung 0 dan tayang_ditahan = benar)
laju (cm turun/tahun): rendah = maks(0, -p10 - s), pusat = maks(0, -med), tinggi = maks(0, -p90 + s)
D(T) = laju x T untuk T = 10 dan 20, dibulatkan 1 cm      (urutan rendah <= pusat <= tinggi selalu berlaku)
basi bila umur data lebih dari 400 hari (BASI_HARI, HIPOTESIS)
```

Rentang adalah sebaran antarpiksel di dalam kecamatan ditambah galat, BUKAN selang kepercayaan statistik. Anggapan laju tetap ("bila laju bertahan"); tanpa skenario kebijakan air tanah. `rentang_sempit` menyala bila `galat_sumber` bukan "vstd". Tidak ada kunci gabungan dengan rob atau muka laut. Tahap elevasi (luas di bawah ambang pasang dengan DeltaDTM) belum ada; tanpa itu tidak ada kunci `elevasi` dan tidak ada angka "luas di bawah ambang". Angka gabungan rob dan penurunan baru boleh ada sesudah pra-registrasi dan uji balik terhadap `public/pesisir/data/rob_kejadian.json` lulus.
