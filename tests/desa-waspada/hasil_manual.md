# Hasil periksa manual DW-10 (RENCANA-UJI §4, kriteria terima 5)

Tanggal: 24 Nov 2026. Pemeriksa: `validasi-model`, konteks bersih. Keluaran yang diperiksa: `public/data/desa_waspada.json` (dibuat 2026-11-24 23:36 WIB, acuan titik 2026-10-12 12:27 UTC).

Cara memilih, ditetapkan sebelum membuka angka desa: satu provinsi per wilayah yang diminta (Jambi, Kalimantan Tengah, Nusa Tenggara Timur), lalu baris tengah (indeks n/2) di antara baris provinsi itu pada daftar yang dimaksud. Jambi dari daftar A, Nusa Tenggara Timur dari daftar B, Kalimantan Tengah bebas (diambil dari A supaya ada titik untuk dicocokkan).

Hitung ulang memakai kode sendiri (titik-dalam-poligon dengan lubang, pengelompokan petak 375 m per hari, kisi gambut 0,001 dan 0,0005 derajat), bukan fungsi `desa_waspada.py`. Hanya `riwayat_petak.Petak` dipakai untuk membaca `riwayat_petak.bin`. Sumber mentah: `hotspot.json` (sensor N, N20, N21, keyakinan nominal/tinggi, 168 jam, satu titik per petak per hari), `public/geo/desa/<kab>.json`, `riwayat_petak.bin`, `lahan/gambut.geojson`, `prediksi.json`.

## Ringkasan

| Desa | Provinsi | Daftar | Titik 7 hari | Tahun terbakar | Gambut | Peluang kab/kota |
| --- | --- | --- | --- | --- | --- | --- |
| Sungai Sayang (15.07.05.2001) | Jambi | A | cocok, 21 dari 23 hitung ulang = 91% (catatan 1) | cocok | cocok (selisih 0,1 poin) | cocok |
| Oeteta (53.01.07.2004) | Nusa Tenggara Timur | B | cocok (0 dan 0) | cocok | nilai sama, tampil kosong bukan 0 (catatan 2) | cocok |
| Sei Bakau (62.11.08.2008) | Kalimantan Tengah | A (bebas) | cocok (30 dan 30) | cocok | cocok (selisih 0,9 poin) | cocok |

Kriteria: titik di poligon >= 80% (lulus: 91% terendah), tahun terbakar sama (lulus), gambut selisih <= 20 poin persen (lulus), peluang sama dengan `prediksi.json` (lulus). Vonis DW-10: lulus untuk ketiga desa, dengan tiga catatan di bawah.

## 1. Sungai Sayang, Sadu, Tanjung Jabung Timur, Jambi (daftar A)

| Angka | Keluaran | Hitung ulang | Cocok |
| --- | --- | --- | --- |
| titik7 | 21 | 23 (petak-hari unik di poligon; 30 baris lolos sensor/keyakinan/168 jam sebelum dedup) | selisih 2, 91% (catatan 1) |
| titik24 | 3 | 3 | ya |
| terakhir | 2026-10-12 13:57 | 2026-10-12 13:57 | ya |
| tahun (petak terbanyak, >= 3 tahun) | 5 | 5 (55 dari 299 petak punya >= 3 tahun) | ya |
| tahun_akhir | 2019 | 2019 | ya |
| gambut | 0,46 | 0,459 (kisi 0,001) dan 0,458 (kisi 0,0005) | ya |
| p1, p2, p3 | 3, 3, 3 | `kab` 1507 `API` 0,03 x3 | ya |

Catatan: seluruh 23 titik berlabel wilayah `15|Tanjung Jabung Timur|Sadu`; tidak ada yang jatuh di poligon desa lain. Baris keyakinan rendah di poligon pada 168 jam: 0.

## 2. Oeteta, Sulamu, Kupang, Nusa Tenggara Timur (daftar B)

| Angka | Keluaran | Hitung ulang | Cocok |
| --- | --- | --- | --- |
| titik7, titik24 | 0, 0 | 0 baris `hotspot.json` dalam poligon (semua sensor, semua jam) | ya (kriteria 80% tak teruji: tak ada titik) |
| terakhir | kosong | kosong | ya |
| tahun | 6 | 6 (48 dari 153 petak >= 3 tahun) | ya |
| tahun_akhir | 2025 | 2025 | ya |
| gambut | kosong (null) | 0,0 (0 poligon gambut menyentuh kotak desa; kisi 0,001 dan 0,0005 sama-sama 0 dari 2815 dan 11245 titik) | nilai sama, tampil kosong (catatan 2) |
| p1, p2, p3 | 19, 19, 19 | `kab` 5301 `API` 0,19 x3 | ya |

## 3. Sei Bakau, Sebangau Kuala, Pulang Pisau, Kalimantan Tengah (daftar A, bebas)

| Angka | Keluaran | Hitung ulang | Cocok |
| --- | --- | --- | --- |
| titik7 | 30 | 30 (45 baris sebelum dedup) | ya |
| titik24 | 7 | 7 | ya |
| terakhir | 2026-10-12 13:34 | 2026-10-12 13:34 | ya |
| tahun | 4 | 4 (12 dari 680 petak >= 3 tahun) | ya |
| tahun_akhir | 2023 | 2023 | ya |
| gambut | 0,28 | 0,271 (kisi 0,001 dan 0,0005) | ya, selisih 0,9 poin |
| p1, p2, p3 | 34, 34, 34 | `kab` 6211 `API` 0,34 x3 | ya |

Catatan: 3 baris keyakinan rendah di poligon dibuang dengan benar (tidak masuk titik7).

## Catatan temuan (bukan kegagalan kriteria)

1. Selisih titik7 Sungai Sayang (21 lawan 23) berasal dari urutan dedup: `titik_unik` menyatukan petak-hari lebih dulu di seluruh `hotspot.json`, titik terbaru yang menang. Dua petak-hari di tepi desa (petak 316763650 tanggal 10-09, petak 316783650 tanggal 10-10) punya titik terbaru di luar poligon, sehingga petak itu tidak dihitung ke desa ini. Satu petak-hari tetap dihitung sekali, jadi tidak ada hitung ganda; hanya desa tepi bisa kurang beberapa titik. Cocok dengan definisi "unik per petak per hari" di `batasan`.
2. Desa di kab yang kotaknya tidak menyentuh poligon gambut sama sekali (Kupang) tidak diberi nilai 0,0 oleh `statik()` (kembali lebih awal di `per_kab`), jadi `gambut` tampil kosong ("tanpa data") padahal hitung ulang menghasilkan 0. Aman (tidak mengarang nol, sesuai batasan "kosong berarti tanpa data") tetapi kosong ini sebenarnya "dihitung, tidak ada gambut". Keputusan teks layar milik `pipa-data`/`layar-peta`.
3. Acuan titik 2026-10-12 sementara `dibuat` 2026-11-24: `public/data/hotspot.json` lokal bertanggal 2 Nov dan belum disegarkan (43 hari lebih tua dari berkas keluaran), jadi "titik 7 hari" di sini dihitung terhadap acuan tersebut, bukan terhadap hari ini. Pemeriksaan ini mengesahkan logika pencocokan, bukan kesegaran data. Di produksi pastikan `titik.yml` menyegarkan `hotspot.json` sebelum `desa_waspada.py` jalan, dan layar menampilkan `acuan`.
