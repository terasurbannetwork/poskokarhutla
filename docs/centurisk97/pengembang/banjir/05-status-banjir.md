# Status banjir, uji balik, prospektif

Halaman ini menjelaskan metode status banjir per kecamatan, uji balik terhadap DIBI, dan catatan prospektif.

## 5. Status banjir per kecamatan (`scripts/banjir/status.py`)

Status 4 hari (`HARI = 4`, hari 0 sampai 3, `status.py:52`): 0 Normal, 1 Waspada, 2 Siaga, 3 Awas. Aturan pertama dari atas yang terpenuhi (`status.py:68`). Untuk hari d: `H3` = jumlah hujan tiga hari d-1 sampai d+1 (`GESER = -1`, `status.py:58`); `RK` = kelas sungai dari debit tertinggi hari d sampai d+2 pada titik sungai terdekat dalam 25 km (`RADIUS_SUNGAI_KM`, `status.py:53`); `I` = `imax` terbesar di jendela; `C` = CAPE terbesar di jendela; `P3` = peluang ansambel jumlah 3 hari 100 mm atau lebih; `B` = bahaya InaRISK.

```
Awas    RK = 3, atau H3 >= 120 dan B >= 0,66
Siaga   RK = 2, atau B >= 0,33 dan (H3 >= 80 atau I >= 30 atau P3 >= 0,5)
Waspada RK = 1, atau H3 >= 40, atau I >= 20, atau (C >= 2.500 dan H3 >= 40)
Normal  selain itu
```

Ambang H3 adalah 50, 100, 150 dikali `K_BANJIR = 0,8`, menjadi 40, 80, 120 mm (`status.py:59`). Jalur `I >= 30` dengan `B >= 0,33` adalah jalur banjir bandang. Penambahan `C >= 2.500` tidak menambah apa pun di atas `H3 >= 40` dan dipertahankan sebagai penanda sesuai spesifikasi.

![Empat tingkat status banjir dan syarat ambangnya: Normal, Waspada (H3 40 mm), Siaga (H3 80 mm), Awas (H3 120 mm); ambang dari scripts/banjir/status.py, berlabel hipotesis](gambar/banjir-tangga-status.svg)

Status longsor memakai mesin yang sama dengan ambang H3 30, 60, 90 mm (`K_LONGSOR = 0,6`), kejenuhan tanah, dan bahaya longsor (`status.py:82-100`):

```
jenuh   = (sm >= 0,45 dan A7 >= 25 mm); bila sm tidak ada: A7 >= 150 mm
Awas    H3 >= 90 dan jenuh dan B >= 0,66
Siaga   (H3 >= 60 dan jenuh dan B >= 0,66) atau (H3 >= 90 dan B >= 0,33) atau (I >= 20 dan B >= 0,66)
Waspada H3 >= 30 dan B >= 0,33
```

Rob pesisir ikut dibawa ke status wilayah tetapi tampil terpisah. Peluang status per kecamatan (jalur hujan) dihitung dari anggota ansambel untuk hari ke-0 sampai ke-3 dan horizon 24, 48, 72 jam (`status.py:103-121`). `status.json` hanya memuat kecamatan dengan level lebih dari 0, kunci `"prov|kab|kec"`.

Dasar ambang: dipilih dengan ERA5 sebagai prakiraan sempurna pada 2016 sampai 2021 dan lolos di 2022 sampai 2025. Ambang awal yang mengikuti kelas BMKG (100 dan 150 mm) terlalu tinggi untuk hujan sel 0,25 derajat, sehingga direkalibrasi. Intensitas `I` adalah rata-rata sel 0,25 derajat, sehingga jalur bandang konservatif. Nilai `sm` berasal dari model tanah ECMWF IFS, bukan pengukuran. Ambang 0,45 sama dengan jenuh untuk tekstur kasar sampai sedang dan sama atau di atas kapasitas lapang untuk tekstur halus; untuk tekstur sangat halus ia masih longgar. Siaga banjir tidak terbukti punya keterampilan di Kalimantan dan Bali serta Nusa Tenggara (batas bawah selang PSS memuat 0).

Aturan status ditulis ulang di peramban (`public/banjir/sim.js`, konstanta `AMBANG_B = [40, 80, 120]`, `AMBANG_L = [30, 60, 90]`) dan wajib sama dengan Python. Mengubah ambang berarti memperbarui `status.py`, JS cerminnya, menjalankan `uji_balik.py`, lalu memperbarui `validasi.json` dan `RISET-UJI-BALIK.md`.

## 6. Uji balik status terhadap DIBI (`scripts/banjir/uji_balik.py`, `validasi.json`)

- Satuan: kabupaten-hari. Level kabupaten adalah level kecamatan tertinggi di dalamnya. Semua hari dihitung, bukan hanya hari yang dicocokkan dengan kejadian.
- Hujan "sempurna": ERA5 (Open-Meteo archive, kisi 0,25 derajat) per sel terdekat. Kejadian: baris DIBI banjir atau bandang bernilai 1 atau lebih pada kabupaten dan tanggal itu (longsor memakai jenis longsor, tahun 2024 dibuang karena DIBI 2024 hanya mencatat 219 longsor).
- Ukuran per tingkat (Waspada, Siaga, Awas), dengan a kena, b alarm palsu, c luput, d benar-tenang:

```
POD = a/(a+c)    FAR = b/(a+b)    CSI = a/(a+b+c)    PSS = a/(a+c) - b/(b+d)
ETS = (a - ar)/(a + b + c - ar),  ar = (a+b)(a+c)/n
```

- Selang 95 persen: bootstrap blok (kabupaten kali tahun), 1.000 ulangan. Periode latih 2016 sampai 2021, uji 2022 sampai 2025 (`uji_balik.py:41`). Usulan aturan diterima hanya bila selang 95 persen selisih ETS (usulan dikurangi aturan berlaku) di periode uji seluruhnya di atas 0.
- Hasil di `public/banjir/data/validasi.json` (dibuat 15 November 2026), banjir periode uji: Waspada POD 0,569, FAR 0,965, ETS 0,018; Siaga POD 0,131, FAR 0,943, ETS 0,029; Awas POD 0,041, FAR 0,922, ETS 0,022. Aturan berlaku lawan aturan sebelum uji balik: selisih ETS uji +0,0062 dengan selang 95 persen [0,0031; 0,0092].
![Grafik batang POD dan FAR status banjir per tingkat pada periode uji 2022 sampai 2025: POD turun dari 0,569 ke 0,041 sementara FAR tetap di atas 0,92; sumber public/banjir/data/validasi.json](gambar/banjir-ujibalik-pod-far.svg)

- Pembacaan jujur: POD rendah dan FAR sangat tinggi. Alasan yang ditulis di berkas: DIBI mencatat per tanggal laporan dan kurang mencatat kejadian kecil, sehingga FAR tampak tinggi; jalur sungai GloFAS dan ansambel tidak diuji; skill nyata lebih rendah karena ERA5 dipakai sebagai prakiraan sempurna. Status adalah penanda siaga.
- Ukuran ketepatan per waktu-tunda tidak bisa dihitung di sini karena ERA5 sempurna membuat semua waktu-tunda identik. Itu tugas uji prospektif ([Status banjir, uji balik, prospektif](/docs/pengembang/banjir/status-banjir)).

## 7. Catatan prospektif (`prospektif.py`, `siaga_persentil.py`, `prediksi_kab2.py`)

- `prospektif.py` mencatat, tiap hari sesudah `status.py`, level banjir dan longsor tertinggi per kabupaten untuk waktu-tunda 0 sampai 3 beserta peluang Siaga jalur hujan. Berkas tidak pernah menyusut dan entri tidak pernah diubah (kode keluar 3 bila arsip menyusut, yang menggagalkan run). `prospektif.py skor` menilai POD, FAR, CSI Siaga per waktu-tunda bila tanggal sasaran sudah tercakup DIBI dengan margin 14 hari.
- Kriteria terdaftar 27 Oktober 2026 (`prospektif_skor.json`): kebenaran DIBI banjir atau bandang per kabupaten-hari, waktu-tunda primer 1, ambang status 2 (Siaga), minimal 60 hari dan 100 kejadian, blok 7 hari, bootstrap 1.000 ulangan, pembanding persistensi dan klimatologi. Layar menampilkan kemajuan menuju vonis (kartu "prospektif" di Insight). Berkas `prospektif.json` tidak dilacak git dan tidak tayang.
- `siaga_persentil.py` mencatat bayangan ambang Siaga per kabupaten dari persentil hujan lokal (40 kabupaten sampel), tanpa menyentuh `status.py`; vonis dikunci sekali. Protokol di `PRAREG-SIAGA-PERSENTIL.md`. Status: HIPOTESIS, `"pakai": false`.
- `prediksi_kab2.py` (KAB2-OPS) menulis arsip prakiraan model kabupaten-hari ke `data/banjir/arsip_kab2/YYYY-MM.jsonl`. Status: BELUM TERUJI dan TIDAK TAYANG; dinilai paling cepat 1 Juni 2027. Berjalan hanya bila sidik kandidat sama dengan baris sidik terakhir di HEAD.
