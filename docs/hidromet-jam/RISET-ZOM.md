# RISET-ZOM: data Zona Musim BMKG dan prakiraan musim hujan 2026/2027 (H24, Q4)

Diperiksa 24 Nov 2026 dengan UA repo, jeda 2 detik, tanpa login, tanpa blokir atau CAPTCHA.

## Yang ada di situs BMKG

| Sumber | Bentuk | Isi |
| ------ | ------ | --- |
| `https://www.bmkg.go.id/iklim/prediksi-musim` (hub, Nuxt `__NUXT_DATA__`) | HTML + JSON Nuxt | daftar artikel prediksi musim; 2026/27 = slug `prediksi-musim-hujan-2026-2027-di-indonesia` (terbit 2 Okt 2026) |
| `.../prediksi-musim-hujan-2026-2027-di-indonesia` | teks artikel + 1 PDF tertanam | HANYA agregat nasional (lihat bawah). Tidak ada tabel per ZOM, tidak ada GeoJSON, tidak ada API |
| `https://content.bmkg.go.id/wp-content/uploads/00_Buku-PMH2026-27_fullver_ttd.pdf` | PDF, 88.305.173 byte (88 MB), HTTP 200 tanpa auth | "Buku Prakiraan Musim Hujan 2026/27". Satu-satunya tempat rincian per ZOM yang ditemukan (peta + tabel per provinsi, diduga). BELUM dibuka |
| `.../prediksi-musim-kemarau-tahun-2026-di-indonesia` | sama, PDF `Buku-PMK26.pdf` | musim kemarau, bukan tugas ini |
| Pencarian web | nihil | tidak ada GeoJSON, shapefile, ArcGIS, atau CSV ZOM publik; buletin stasiun (mis. stamet-tampapadang, staklim) memuat potongan regionalnya dalam PDF |
| `dataweb.bmkg.go.id` | gagal TLS dari python (`TLSV1_ALERT_PROTOCOL_VERSION`) | tak bisa diuji; tidak dikejar |

Halaman tebakan `/iklim/zona-musim`, `/iklim/prediksi-musim/prakiraan-musim-hujan` = 404.

## Angka agregat yang terbaca dari teks artikel (bisa diurai otomatis, bukan per ZOM)

- Total 699 ZOM (normal 1991-2020; 583 ZOM dua musim atau lebih, 116 satu musim).
- Awal musim hujan 2026/27: November 2026 = 185 ZOM (24,66% luas), Desember 2026 = 266 ZOM (17,31%).
- Awal vs normal: MUNDUR 529 ZOM (61,08%), SAMA 26 ZOM (2,15%).
- Puncak: Desember 2026 155 ZOM, Januari 2027 162 ZOM, Februari 2027 190 ZOM; MUNDUR 332 ZOM, SAMA 275 ZOM.
- Sifat hujan NORMAL 510 ZOM (69,76%); durasi LEBIH PENDEK 482 ZOM (51,90%). El Nino sangat kuat (ENSO JJA +2,20).

## Kesimpulan dan tiket yang terhenti

Tidak ada data per ZOM yang dapat dibaca mesin di halaman web BMKG. Poligon ZOM tidak diterbitkan di situ sama sekali. Per-ZOM (id, nama, awal/puncak dasarian, normal, sifat, cakupan kab) hanya mungkin dari buku PDF di `content.bmkg.go.id`, dan:

1. host itu DI LUAR daftar host `iklim_bmkg.py` dan aturannya "PDF diunduh pemilik, bukan oleh skrip, tidak masuk repo" (pola `pdf_lokal`/`urai_spi_pdf` + `pdftotext`). Pengerja tidak mengunduh 88 MB tanpa izin.
2. Apakah tabel di PDF berupa teks (bisa `pdftotext -layout`) atau gambar peta belum diketahui. Kalau gambar, tidak boleh diketik dari gambar (aturan tiket).
3. Tanpa poligon ZOM, pemetaan kab -> ZOM hanya bisa dari daftar kabupaten per ZOM di tabel PDF (jika ada), cocokkan nama ke kode repo seperti `kab_indeks`.

Fungsi faktor fase A8 (`hari_sejak_awal`, kelas peralihan ±30 hari / puncak / lainnya) belum ditulis: masukannya (awal dan puncak per ZOM) belum ada. Rumusnya sederhana dan bisa langsung dibuat begitu `zom.json` terisi.

## Yang dibutuhkan dari pemilik (jawaban Q4 diperluas)

Unduh sendiri PDF di atas ke folder lokal (mis. `~/Downloads`, tidak masuk repo), atau beri izin eksplisit agar skrip mengunduhnya sekali. Lalu `pdftotext -layout` dicek: bila tabel per ZOM berupa teks, `scripts/cuaca/zom.py` + fixture (cuplikan halaman teks) + mode `uji` dapat dibangun. Alternatif: minta berkas ZOM resmi ke BMKG/BNPB (opsi pertama Q4).
