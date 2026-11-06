# Riset Ruang Unit BNPB (5 Nov 2026)

Indeks enam riset unit yang menjadi dasar `KEPUTUSAN-AWAL.md`. Tiap berkas memuat tugas dan fungsi unit (dikutip dari Perban 6/2025 jo. 11/2025 dengan nomor pasal), kerja nyata dari juklak dan juknis di korpus JDIH lokal, sistem resmi yang sudah ada (dengan URL), modul repo yang sudah ada, usulan sistem beserta cara pembuatannya, pertanyaan untuk pemilik, dan sumber yang tidak bisa diakses.

| Berkas | Unit |
| --- | --- |
| `riset/1-sistem-strategi.md` | Deputi Sistem dan Strategi (Dit. PERB, PSPB, SPB) dan Pusdatinkom |
| `riset/2-pencegahan.md` | Deputi Pencegahan (Dit. Peringatan Dini, Kesiapsiagaan, Mitigasi) |
| `riset/3-penanganan-darurat.md` | Deputi Penanganan Darurat (Dit. KPOD, Dit. Wilayah I-III) |
| `riset/4-logistik.md` | Deputi Logistik dan Peralatan (Dit. Pengelolaan, Dit. Optimasi Jaringan) |
| `riset/5-rehab-rekon.md` | Deputi Rehabilitasi dan Rekonstruksi (Dit. RR Perumahan, Infrastruktur, Sosial Ekonomi dan Lingkungan Hidup) |
| `riset/6-sestama-irtama-pusat.md` | Sekretariat Utama (4 biro), Inspektorat Utama, Pusdiklat PB, Pusbin JF Kebencanaan |

## Cara riset dikerjakan

1. Teks OTK dibaca dari korpus JDIH lokal (`data/raw/hukum/teks/`), bukan dari ingatan model. Kutipan tusi dicocokkan kata per kata.
2. Juklak, juknis, dan perban per unit dicari di `public/data/bnpb/hukum/katalog.json`. Status BERLAKU dicek, dan pencabutan yang tidak tercatat di katalog dicatat sebagai temuan (F0-1).
3. Sistem resmi dicari di web (bnpb.go.id, data.bnpb.go.id, gis.bnpb.go.id, inalogpal.bnpb.go.id, Renstra BNPB 2025-2029, berita resmi). Yang tidak bisa diverifikasi dengan URL tidak ditulis sebagai fakta.
4. Kode repo dicek supaya usulan tidak mengulang yang sudah ada.

## Batas riset

Riset ini tidak mewawancarai pegawai unit. Kerja nyata disimpulkan dari peraturan, Renstra, LAKIP 2025 yang ada di repo (`data/kajian-bnpb/pustaka/5-lakip.md`), dan publikasi resmi. Bagian "Sumber yang tidak bisa diakses" di tiap berkas mencatat celahnya. Langkah pertama sebelum membangun sistem F2 adalah konfirmasi singkat ke unit pengguna lewat pemilik.
