# RISET: Tangga Peringatan

Hanya yang diperiksa di repo ini pada 10 Nov 2026. Tidak ada klaim tentang sistem lain yang tidak dibuka.

## 1. Masukan yang ada dan skemanya (dibaca dari berkas)

| Anak tangga | Berkas | Cakupan sumber | Isi yang dipakai |
| --- | --- | --- | --- |
| Musim | `public/banjir/data/iklim_bmkg_arsip.json` `.artikel[<slug>]` hub `prediksi-musim` | nasional | `judul`, `tanggal`, `fakta.enso_fase`, `fakta.zom[]` (`topik`, `label`, `zom`, `persen`). Tidak ada ZOM per kabupaten. |
| Bulan | `iklim_bmkg_arsip.json` `.narasi["pch_bln\|..."]` dan `["psh_bln\|..."]` | kabupaten | `periode`, `wilayah[].kategori`, `wilayah[].rentang`, `wilayah[].kab[]` (`prov`, `nama`, `kode` internal), `diambil`. 7 bulan ke depan. |
| Dasarian | idem `pch_das`, `psh_das` | kabupaten | 3 dasarian ke depan. |
| Kekeringan dasarian | `public/banjir/data/peringatan_bmkg.json` | kecamatan | `data[PROVINSI][tingkat 1/2/3][KABUPATEN] = [kecamatan]`; 1 Waspada, 2 Siaga, 3 Awas (`scripts/kekeringan/peringatan_bmkg.py`); `tanggal`, `rentang`. |
| 10 hari | `public/banjir/data/cuaca_bmkg_kab10.json` | kabupaten | `kab["11.01"].hari[10]` (`tgl`, `kondisi`, `tmin`, `tmax`), 515 entri; satu entri gabungan "71.05/71.10". |
| Sepekan | `cuaca_sepekan.json` `.artikel.prakiraan[]` | provinsi | `periode`, `tingkat[]` (`Awas`, `Siaga`, `Angin`) dengan `kode_prov[]`, `sedang_kode_prov[]`, `terbit`. |
| Sepekan kering | `karhutla_bmkg.json` | provinsi | `rekomendasi.perhatian_khusus`, `potensi_fwi.per_pulau[].risiko_tertinggi`, `asap.provinsi_berasap`, `berlaku_dari/sampai`. |
| 3 hari BMKG | `cuaca_factsheet.json` `.ensemble_3hari[]` | provinsi | `peluang_persen`, `ambang_mm`, `ada_wilayah`, `kode_prov[]`. |
| 3 hari kita | `public/prediksi/data/prediksi.json` | kabupaten | `kab[].BNJ/LSR/API/ASP`, `waspada[]`, `kode[K].vonis`. |
| Jam | `peringatan.json` `.nowcast[]` | kecamatan (nama), provinsi (kode) | `event`, `severity`, `selesai`, `wilayah`, `prov[]`. |
| Jam | `cuaca_petir.json` `.kabupaten[]` | kabupaten | `kode_prov`, `kab`, `n` (jendela 30 menit). |
| Jam | `public/udara/data/awan_himawari.json` | kabupaten | `kab[<id>].persen_dingin`, `tinggi_puncak_km_perkiraan`; label "uji kelayakan, bukan peringatan". |

## 2. Temuan yang mengubah rancangan

1. Kode kabupaten di berkas iklim dan awan bukan Kepmendagri. Dicoba: 511 dari 513 kabupaten di `pch_bln` cocok lewat `dasar.pencari(prov, nama)`; dua sisanya tidak cocok nama. Kode `kab10` cocok dengan id Kepmendagri untuk 509 dari 515 entri secara nama persis; lima entri DKI cocok setelah "Adm." diperluas; satu entri gabungan dilewati.
2. Berkas iklim tidak menyebut tanggal terbit tiap narasi per kabupaten, hanya `diambil`. Tanggal yang tampil di layar diberi kata "diambil".
3. SPI per kabupaten tidak tersedia sebagai data (hanya gambar/PDF). Sifat hujan (Bawah Normal, Normal, Atas Normal, Jauh di Atas Normal) adalah satu-satunya ukuran penyimpangan per kabupaten untuk bulan dan dasarian.
4. Prakiraan sepekan BMKG hanya menyebut provinsi yang masuk Awas, Siaga, dan "sedang"; provinsi yang tidak disebut bukan "normal", hanya tidak disebut.
5. `peringatan.json` di repo bisa basi (salinan git terakhir 13 Okt 2026); pembaruan datang dari workflow. Karena itu ada batas basi (KEPUTUSAN D6).
6. Prakiraan kondisi harian BMKG 10 hari tidak punya kelas "Hujan Lebat" pada 10 Nov 2026 (nilai yang muncul: Berawan, Hujan Ringan, Udara Kabur, Cerah Berawan, Cerah, Kabut/Asap, Hujan Petir, Petir, Hujan Sedang).

## 3. Yang sengaja tidak diriset

Pemetaan ZOM ke kabupaten (Q1), kecamatan ke kabupaten (Q6), dan pembacaan PDF SPI (Q5) bukan bagian paket ini.
