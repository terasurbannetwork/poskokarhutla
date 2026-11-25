# Paparan, fasilitas, dan satelit

Halaman ini merinci agregasi bangunan, kelas bahaya, fasilitas vital, pembagian jiwa, dan perkiraan satelit.

## Agregasi bangunan dan paparan (F2.1, F2.2)

Sumber: Google Open Buildings v3 (ambang 0,70) pada grid 0,01 derajat dan grid halus 110 meter, `penduduk.json` (WorldPop), titik pusat desa Dukcapil, dan poligon zona bahaya. Frekuensi: kejadian aktif dihitung ulang tiap 3 jam, grid bangunan dikelola oleh pipeline bangunan.

Sebuah bangunan (sel halus) dianggap berada di zona bila pusat selnya di dalam poligon zona, atau dalam radius untuk karhutla. Sel yang menyilang batas zona tidak dibagi. Zona yang dipakai: karhutla radius 1, 3, dan 5 km kumulatif dari kluster aktif, banjir dari poligon kejadian aktif, gempa dari pita MMI, gunung api dari KRB I, II, III. Desa tanpa poligon memakai sel halus yang ditetapkan ke titik pusat desa Dukcapil terdekat dalam kecamatan yang sama (Voronoi), dengan ketelitian rendah.

Contoh uji karhutla: sel berjarak 0,9 km (100 bangunan), 2,5 km (200), 4,9 km (300), 6 km (400) menghasilkan radius 1 km = 100, 3 km = 300, 5 km = 600; sel 6 km tidak dihitung.

## Kelas bahaya InaRISK per sel (F2.3)

Nilai bahaya H di pusat sel halus diambil dari layanan citra InaRISK BNPB. Aturan:

```
tak ada data atau gagal ambil -> kelas null ("tidak terliput"), bukan rendah
H < 0,33                      -> rendah
0,33 <= H <= 0,66             -> sedang
H > 0,66                      -> tinggi
```

Batas ini sama dengan `scripts/bnpb/terpapar.py`. Sumber resmi batas tidak ditemukan, sehingga keluaran memuat `batas_versi` dan catatan itu. Label `estimasi-model`.

## Fasilitas vital (F2.4)

Titik fasilitas di dalam zona dihitung per sumber, tidak dijumlah antarsumber: Dapodik/EMIS (sekolah), Geofabrik OSM, Overture places, dan Wikidata. Pemetaan tag OSM ke kategori adalah asumsi kebijakan. Jalan dihitung sebagai jumlah panjang ruas yang titik tengahnya di zona, dan merupakan batas atas. Contoh: 5 sekolah Dapodik dan 3 OSM di zona ditulis "Dapodik 5, OSM 3, selisih 2", bukan 8.

## Pembagian jiwa (F2.5)

```
WorldPop (per kecamatan K):  J_wp = jumlah_K  P_K x (n_terpapar_K / n_K)
Dukcapil (per desa d):       J_dk = jumlah_d  P_d x (n_terpapar_d / n_d)
GHSL POP (100 m):            J_gh = jumlah nilai piksel yang pusatnya di zona
selisih = maks(J) - min(J)
```

Pembagian sebanding jumlah bangunan adalah asumsi kebijakan. Tiga hasil berdampingan, tidak dirata-rata. Contoh: WorldPop 3.000, Dukcapil 3.032, GHSL 2.700, selisih 332.

## Perkiraan kerusakan bangunan dari satelit (hanya tahap uji)

Rancangan: bangunan terendam banjir dari Sentinel-1 RTC (ambang absolut VV, kisi minus 16 sampai minus 20 dB, dipilih hanya pada bagian kalibrasi) dibandingkan dengan DIBI per kabupaten. Syarat lulus (hipotesis, dikunci sebelum citra dilihat): n uji paling sedikit 30 pasangan kabupaten dan kejadian, rho Spearman paling sedikit 0,3, mengalahkan plasebo dan pembanding naif terkuat dengan selisih paling sedikit 0,05, dan batas bawah selisih bootstrap CI90 di atas nol. Kriteria dikunci dengan sidik SHA-256 di `scripts/siklus/kerusakan_kriteria.json` dan `kerusakan_sidik.json`. Kriteria versi 1 gagal kelayakan. Versi 2 terkunci atas persetujuan pemilik. Hasil uji asap atas 3 pasangan kalibrasi belum cukup untuk vonis (n kurang dari 20), dan satelit belum jelas mengalahkan plasebo. Uji gempa berstatus gagal (Cianjur 2022). Uji karhutla ditunda. Karena belum ada vonis lulus, tidak ada angka bangunan rusak dari satelit yang tampil.

## Genangan satelit per kejadian banjir (pendukung kaji banjir)

Pipeline lab `scripts/siklus/genangan_kriteria.py` menyiapkan kriteria uji genangan Copernicus GFM per kejadian. Bila kelak lulus, hasilnya menjadi model kaji kedua `banjir_gfm`. Hingga kini model tersebut tidak ada di kode Worker maupun di CHECK tabel `sk_kaji`.
