# RISET: Pemetaan bekas longsor dari satelit

Fakta repo diperiksa 24 Nov 2026 (berkas). Rujukan luar adalah tolok ukur metode, belum diuji sendiri; angka kinerja mereka tidak dipakai sebagai klaim kita.

## Pemicu

Unggahan media sosial: citra sebelum 7/6/2024 dan sesudah 26/1/2026 di Tapanuli Tengah, kejadian 25/11/2025. Bekas longsor tampak sebagai goresan coklat di lereng berhutan, rapat di hampir seluruh bidang pandang. Unggahan itu tidak menyebut luas, sumber citra pasti, atau metode; tidak dipakai sebagai data.

## Tolok ukur luar

| Rujukan | Pelajaran untuk kita |
| --- | --- |
| HazMapper (Scheip dan Wegmann 2021, Natural Hazards and Earth System Sciences 21) | rdNDVI: penurunan NDVI relatif dari komposit maksimum sebelum dan sesudah, di Google Earth Engine, disaring lereng dan NDVI awal. Cepat dan terbuka, tetapi pengecoh tebangan dan panen tetap ada; penulisnya menyebut keluaran sebagai alat bantu penafsir, bukan inventaris. |
| Peta kerapatan longsor radar (Handwerger dkk. 2022, Natural Hazards and Earth System Sciences 22) | Perubahan hamburan balik Sentinel-1 cukup untuk peta kerapatan longsor saat awan menutup optik, bukan poligon tiap longsor. |
| Copernicus EMS rapid mapping | Peta longsor darurat dibuat analis dari citra resolusi tinggi; produk otomatis berstatus perlu verifikasi. |
| NASA LHASA dan Global Landslide Catalog | Peluang longsor dan titik kejadian; katalog berhenti diperbarui (sudah dicatat di `scripts/longsor/kejadian.py`). |

## Fakta repo (diperiksa)

| Fakta | Lokasi |
| --- | --- |
| Nowcast longsor kab-hari resep LHASA, pra-registrasi LHASA2 draf, belum dibekukan. | `scripts/longsor/model.py`, `scripts/longsor/PRAREG-LHASA2.md` |
| Label kejadian: DIBI per kab-hari, NASA GLC titik (salinan ArcGIS), tanggapan PVMBG titik 2020 sampai Mei 2023. | `scripts/longsor/kejadian.py`, `public/longsor/data/kejadian.json` |
| Zona kerentanan gerakan tanah per kecamatan (salinan terbuka sigi.pu.go.id). | `scripts/longsor/pvmbg.py` |
| Lereng dan tanah per sel. | `scripts/longsor/lab_lereng.py`, `scripts/longsor/lab_tanah.py` |
| Sentinel-2 L2A dari Earth Search (COG terbuka) dan Sentinel-1 RTC dari Planetary Computer (token SAS anonim), pencarian STAC, token, dan pemilihan adegan bersih untuk kotak sekitar 12 km per gambar. Komposit median berbulan, masker SCL per piksel, DEM, dan lereng BELUM ada; itu kode baru. | `scripts/data/citra.py`, `scripts/banjir/citra_banjir.py` |
| Air tak biasa Sentinel-1 per kab dengan frekuensi basah per orbit. | `scripts/banjir/s1_genangan.py` |
| Hilang tutupan Hansen GFC v1.13 dibaca per baris lewat HTTP Range. | `scripts/banjir/bukti_das.py` |
| Peringatan tebangan, hanya jendela 90 dan 30 hari terakhir, tanpa riwayat (tidak memuat Nov 2025). | `public/data/alert_tebang.json` |
| Pola kriteria terkunci bersidik dan vonis "menunggu, bukan nol". | `scripts/siklus/kerusakan_kriteria.json`, `data/kajian-bnpb/kerusakan-satelit/ALGORITMA.md` |
| Batas kecamatan dari batas wilayah BIG, disederhanakan bertopologi. | `public/geo/kecamatan/<prov>.json`, `scripts/geo/batas.py` |
| Lembar buta penafsir belum ada sebagai kode; hanya rencana di paket kampus. Paket ini membangunnya sendiri (LS-02). | `data/kajian-bnpb/kampus/TIKET.md` |

## Kesimpulan riset

1. Isyarat fisik bekas longsor besar di hutan tropis terlihat di 10 m; longsor kecil (di bawah sekitar 300 m2) dan longsor di kebun atau permukiman tidak.
2. Pengecoh terbesar adalah tebangan dan panen; tanpa saringan dan pelaporan terpisah, hasilnya menyesatkan (D5).
3. Kebenaran uji belum ada di repo; ini pembatas terbesar (Q1). Tanpa itu vonis tetap "menunggu uji".
