# Gambut, konsesi, dan KHG

Halaman ini menjelaskan estimasi bara gambut, KHG, kelembapan tanah, dan lapisan konsesi.

## 12. Gambut: estimasi bara, KHG, kelembapan tanah

**Estimasi bara per kompleks** (`scripts/data/gambut_bara.py`): ESTIMASI, belum divalidasi lapangan. Rumus:

```
E = A x D x BD x CC x EF
A  = jumlah sel unik ~375 m berdeteksi di peta gambut x 14,0625 ha,
     dibatasi luas kompleks, dikali FRAKSI_TERBAKAR (0,10 ; 0,30 ; 1,00)
D  = kedalaman terbakar 15 sampai 51 cm (D_BAWAH, D_ATAS); skenario tengah
     = 15 + 36 x indeks persistensi; dipotong ke muka air proksi bila ada
BD = 0,07 ; 0,10 ; 0,15 t/m3        CC = 1,0
EF (t gas per t bahan kering) : CO2 1,703 ; CH4 0,021 ; CO 0,210
```

Skenario rendah, tengah, tinggi dikombinasi ujung ke ujung; bukan selang kepercayaan. Indeks persistensi = porsi sel 750 m di gambut yang terdeteksi pada >= 2 tanggal WIB berbeda DAN setidaknya sekali pada malam hari (18.00 sampai 06.00 WIB). Nilai 15 cm adalah rata-rata dikurangi simpangan baku dari studi PNAS 2009 (33 plus minus 18 cm), nilai 51 cm adalah rata-rata studi Nature 2002 yang belum dicek ke teks lengkap. Faktor emisi CO belum diverifikasi ke dokumen asli. Muka air adalah proksi PFVI dari hujan dan ET0, bukan pengukuran. Bila isian lapangan tersedia, `pasang_kalibrasi()` mengganti D_BAWAH dan D_ATAS dengan p10 sampai p90 kedalaman isian pada n >= 10 insiden gambut. Hasil ini perkiraan lokal per cluster dan tidak boleh dijumlahkan dengan estimasi emisi nasional (`dampak.py`).

**KHG** (`scripts/scrape/khg.py`, `scripts/data/khg_prioritas.py`): 518 poligon KHG dari BRGM PRIMS. Lisensi PRIMS melarang mengubah isi poligon; poligon hanya disederhanakan untuk tampilan dan dibaca untuk menghitung titik di dalamnya. Tiap KHG dihitung titik 7 hari, 30 hari, dan musim berjalan serta jumlah kompleks aktif; hanya KHG dengan titik musim > 0 yang terbit. `musim_lengkap: false` berarti ada hari sejak 1 Januari yang belum terisi sehingga angka musim batas bawah. Isi mundur memakai FIRMS area API dengan anggaran `MAKS_REQ` 45 permintaan per jalan (`khg_prioritas.py:34`).

**Kelembapan tanah** (`scripts/data/tanah_gambut.py`, tiket PKH-43): kurva bulanan ERA5-Land per provinsi gambut, rata-rata tertimbang luas KHG dari sampai 3 KHG terluas per provinsi. Ini model tanah mineral, bukan muka air gambut; bulan tanpa data berisi null.

Catatan sumber gambut: poligon gambut dari GFW peatlands v20230315 (CC BY 4.0). KHG nasional 651 unit (SK 2017) tidak tersedia terbuka; server SIPPEG tidak membalas saat diuji. Jangan mengandalkan `prims:gambut_250k` untuk Kalimantan Timur karena tidak memuat poligon di sana.

## 13. Konsesi

`scripts/scrape/konsesi.py` membangun `konsesi.geojson`; `scripts/data/konsesi_kompleks.py` menghitung porsi titik tiap kompleks per jenis konsesi.

Sumber (rincian: `docs/sumber-lapisan.md`):

| Jenis | Sumber | Catatan |
| --- | --- | --- |
| Sawit | GFW `gfw_oil_palm` v20191031 (data Kementerian Kehutanan, tahun sumber 2012, pembaruan 2014) | bukan tutupan; grup dari GFW |
| HTI dan HPH | GDB resmi PBPH Mei 2026, 541 PBPH aktif; kode FCODE ZM03040240 hutan tanaman, ZM03040160 hutan alam, ZM03040280 restorasi atau multiusaha (dimasukkan hph) | diterima pemilik dari kementerian dengan izin terbit ulang (20 November 2026); GDB tidak di-commit |
| Tambang | PPKH Januari 2026, hanya bagian di kawasan hutan | tambang di areal penggunaan lain butuh token dan tidak dipakai |
| Riwayat | HTI Trase 2020 sampai 2022 dan HPH GFW 2014 | dimuat `aktif: false` hanya bila nama pemegang tidak ada di PBPH 2026 dan titik wakil di luar semua PBPH 2026 |

Kebijakan tampilan: nama pemegang dan grup tampil; nomor izin dan kasus per perusahaan tidak diterbitkan; fitur model "pemegang pernah disanksi" terbit sebagai satu angka per poligon (`sanksi_th`) tanpa nama. Titik konsesi diuji lewat pencocokan lokasi titik panas ke poligon; satu titik dapat jatuh di dua jenis yang tumpang tindih, sehingga porsi per jenis boleh berjumlah lebih dari 1. Bahasa keluaran netral: kaitan lokasi, bukan vonis dan bukan tuduhan.
