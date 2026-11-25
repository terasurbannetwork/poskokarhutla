# Aturan Prioritas provinsi

Halaman ini menjelaskan aturan Prioritas provinsi yang berasal dari kajian ambang hotspot, dan aturan yang sebenarnya dipakai layar.

## Kajian sumber

Sumber: kajian IMRaD "Kajian Ambang Hotspot untuk Penetapan Provinsi Prioritas Penanganan Karhutla di Indonesia" (10 November 2026), disimpan di `data/kajian-bnpb/ambang-hotspot/` sebagai dokumen Word, PDF, dan PPTX. Paket ini tidak memuat berkas KEPUTUSAN, PRD, ALGORITMA, atau DESAIN-TEKNIS; tidak ada dokumen keputusan tertulis selain komentar kode.

Data kajian: 19.912 provinsi-minggu MODIS 2002 sampai 2025 dan 11.628 provinsi-minggu VIIRS S-NPP 2012 sampai 2025, dipadukan dengan gambut, ENSO, cuaca, FWI, luas GWIS, DIBI, IRBI, logbook Pusdalops, dan SK status. Metode: regresi logistik, F1, indeks Youden, model campuran Gaussian pada log H7, bootstrap blok tahun, validasi antartahun dan uji tertahan (VIIRS dilatih 2012 sampai 2022, diuji 2023 sampai 2025). Kejadian besar didefinisikan dengan prinsip konsentrasi: kelompok teratas yang menyumbang 80 persen beban 14 hari berikutnya, dengan batas 50,3 hotspot VIIRS per hari (11,3 persen provinsi-minggu).

Hasil utama:

| Temuan | Nilai |
| --- | --- |
| Garis masuk (rata-rata 7 hari, VIIRS S-NPP) | 50 hotspot per hari |
| Garis keluar | 25, selama 7 hari |
| F1 aturan ambang lawan daftar enam teratas (uji tertahan) | 0,681 lawan 0,462 |
| F1 aturan masuk-keluar harian | 0,624 lawan 0,444 |
| H50 kejadian besar 14 hari | 64 (selang 58 sampai 75) VIIRS; 17 (16 sampai 19) MODIS |
| AUC rata-rata 7 hari lawan angka satu hari | 0,956 lawan 0,932 |
| Jumlah absolut lawan kepadatan per luas | AUC 0,956 lawan 0,917 |
| Bobot gambut terbaik (kejadian besar 14 hari) | 1,5 (VIIRS) dan 2 (MODIS); 2,5 dan 4 untuk 30 hari |
| Ambang pada Oktober dan November | sekitar 1,5 kali dan 2 kali |
| Keluar keliru | 4,3 persen (2 dari 46) uji tertahan; 11,0 persen (237 kejadian) seluruh periode |
| Rasio angka laporan terhadap S-NPP | rata-rata 3,0; sekitar 2,4 sesudah S-NPP pensiun |

Kajian menyimpulkan ambang universal sebagai garis dasar dengan penyesuaian situasional. Keterkaitan bersifat asosiatif, bukan sebab akibat. Hubungan dengan dampak yang dilaporkan lebih lemah (korelasi puncak H7 dengan jumlah kejadian DIBI per provinsi-tahun 0,39; dengan jumlah terdampak 0,13).

## Aturan yang dipakai layar

**Aturan yang dipakai layar** (`public/prioritas.js:5-9`): sesudah uji balik ulang `scripts/data/uji_ambang_prioritas.py` pada VIIRS S-NPP 2023 sampai 2025, pemilik memilih pada 11 November 2026 rata-rata 3 hari (bukan 7 hari), garis dasar VIIRS masuk 60 dan keluar 30, keluar sesudah 3 hari berturut-turut di bawah garis keluar. Garis dasar dikalikan rasio satelit:

```
rasio 3,0 (jendela berakhir sampai 2026-11-02) : masuk 180, keluar 90
rasio 2,4 (sesudahnya, S-NPP pensiun)           : masuk 144, keluar 72
H3(hari)  = rata-rata hotspot harian 3 hari lengkap terakhir per provinsi
masuk     : H3 >= garis masuk                   (hari berjalan dibuang)
keluar    : H3 < garis keluar selama 3 hari berturut-turut
```

![Garis masuk dan keluar Prioritas provinsi dalam satuan laporan BNPB: 180 dan 90 sampai 2 November 2026, 144 dan 72 sesudahnya. Sumber angka: public/prioritas.js baris 8, dirujuk di bagian ini.](gambar/pipeline-karhutla-ambang-prioritas.svg)

Skrip uji memvariasikan jendela (1, 3, 7 hari) dan lama keluar (3, 7 hari) serta garis masuk 40, 60, 70, 80 dengan keluar setengahnya, dan memakai kejadian besar yang sama dengan kajian (rata-rata 14 hari berikutnya >= 50,3), dinilai tiap Senin Juli sampai November. Hasil angka skrip tidak disimpan di repo; hanya tercetak saat dijalankan, sehingga angka pemilihan 60 dan 30 tidak dapat dicek ulang dari berkas hasil ("belum terdokumentasi di kode").

## Status uji balik

Status uji balik: ambang kajian LULUS pada uji tertahan terhadap daftar enam teratas untuk kejadian besar; ambang situasional (Oktober, November, La Niña) hanya tercatat di teks panel, tidak dihitung otomatis. Variabel yang belum diuji menurut kajian: tinggi muka air gambut, riwayat bakar lokasi penuh, bahan bakar, kapasitas, tata kelola.
