# DESIGN-SYSTEM: Pemetaan bangunan oleh relawan

Mengikuti `/kemitraan` (tiru `/akademisi`): muat `inti/tema.css`, `gaya.css`, `kepala.css`, tautkan `akademisi.css`. Kelas baru berawalan `.km-pm-`. Tanpa huruf kapital semua, tanpa titik tengah, tanpa kalimat kesimpulan di kepala kartu (AGENTS.md 3.5).

## Layar

| Layar | Isi |
| --- | --- |
| Daftar prioritas (staf) | Kartu `.ex.ex-std` berkepala "Kab prioritas pemetaan"; tabel `.ex-tabel`: kab, bahaya, bangunan pembanding, rasio, kelas, skor, pil "Belum diuji". Tombol Siapkan proyek per baris. |
| Paket proyek (staf) | Kartu "Paket proyek": peta AOI, teks instruksi, saran citra, hashtag, tombol Salin GeoJSON dan Unduh. Status dan tautan Tasking Manager. |
| Proyek terbuka (kampus) | Kartu per proyek: kab, tenggat, hashtag kampus, tombol Gabung. |
| Sumbangan | Kartu "Sumbangan kampus": tabel per kampus, agregat, tanpa nama orang. |

## Aturan

Kelas tipis, sedang, memadai memakai pil status berwarna dan berteks ("tipis"), bukan warna saja. Tiap angka berlabel "rasio OSM terhadap Open Buildings, data OSM per <tanggal>". Kab null tampil "Tidak ada data untuk wilayah ini", bukan nol. Dua kolom berdampingan berakhir sejajar; kartu berjarak 20 px. Tombol Gabung dan Siapkan memakai chrome urgen dan hasilnya tidak membekukan layar (INP); tabel besar lewat transition. Layar ditinjau pemilik di `http://localhost:8800/kemitraan`.
