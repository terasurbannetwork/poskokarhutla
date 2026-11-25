# Data, grid, pelacak, dan fitur

Halaman ini mencatat data, grid, pelacak peristiwa, dan fitur yang masuk ke model.

## Data, grid, dan pembagian waktu

| Data | Isi | Resolusi dan frekuensi | Dipakai di |
| --- | --- | --- | --- |
| VIIRS S-NPP | Titik panas 375 m, keyakinan nominal dan tinggi, vegetasi saja (`viirs.csv` 2015 sampai Okt 2026, `viirs_2012_2014.csv`) | Dua lintasan per hari (sekitar 13.30 dan 01.30 lokal); celah FIRMS 8 Mei sampai 1 Jun 2026 | Peristiwa, label, model sel, model membesar |
| VIIRS NOAA-20 | Mulai Apr 2018 (`viirs_noaa20.csv`) | Sekitar 50 menit dari S-NPP | Fitur model membesar, target indeks 7 hari, sensor utama pengganti |
| VIIRS NOAA-21 | Hanya arsip pendamping untuk uji | NRT dan arsip standar sebagian | Pendamping setelah S-NPP pensiun |
| MODIS | 2002 sampai 2026 | Harian | Tren 25 tahun, riwayat terbakar 0,1 derajat |
| Cuaca per jam latih | ERA5 lewat Open-Meteo archive, 1.623 pasangan (tahun, sel 0,5 derajat) ditambah 681 pasangan tambahan 14 Okt | Per jam | Fitur latih dan uji balik |
| Cuaca prakiraan | Open-Meteo forecast, 33 hari lalu dan 3 sampai 4 hari ke depan per sel 0,5 derajat | Per jam, di-cache per hari | Peramban, jejak api, uji prospektif |
| ENSO dan IOD | ONI (NOAA CPC), DMI HadISST (NOAA PSL) | Bulanan | Fitur `oni`, `dmi` |
| Lahan | Gambut, kawasan hutan, konsesi (sawit, HTI, HPH, tambang), sanksi karhutla, kanal OSM, jalan, desa, penduduk WorldPop 0,25 derajat, riwayat grid | Berkas di `public/data/` dan `public/data/lahan/` | Fitur lahan |
| Cuaca harian indeks 7 hari | NASA POWER (MERRA-2), unduhan berhenti 31 Des 2025 | Harian per sel 0,5 derajat | Hanya uji balik indeks 7 hari (tidak dipakai produksi P1) |

Peta gambut diganti pada 26 Okt 2026 dari lapisan global (33,8 juta hektare) ke peta gambut 1:250.000 Kementan/BBSDLP lewat PRIMS (11,4 juta hektare; Kalimantan Timur tetap lapisan lama). Seluruh angka model membesar dihitung ulang dengan peta baru; angka lama tersimpan di riwayat git sebagai pembanding.

Kisi model sel adalah sel 0,003375 derajat (sekitar 375 m, 14,0625 hektare) dengan titik nol 94 BT dan 12 LS, 14.300 kolom, kunci sel `baris * 14300 + kolom` (`scripts/sebaran/umum.py:18`, `public/sebaran_model.js` baris 10). Kisi indeks 7 hari adalah sel 0,05 derajat (sekitar 5,5 km), titik nol 94,5 BT dan 6,5 LU, 940 kolom kali 360 baris (`risiko_mingguan.py`).

Hari kebakaran adalah jendela 06.00 sampai 06.00 waktu matahari setempat, supaya lintasan malam (sekitar 01.30) masuk hari sebelumnya.

Pembagian waktu (`latih.py:36`, fungsi `bagian`): latih 2015 sampai 2022, validasi 2023 (semua penyetelan), uji 2024 sampai 2026 (dibuka sekali di langkah 6 `latih_jalan.py`). Putaran penyetelan dijalankan dengan `SEBARAN_TANPA_UJI=1` yang berhenti sebelum uji dibuka (`latih_jalan.py:412`). Model yang diekspor ke peramban dilatih ulang pada semua tahun, sedangkan angka `kinerja_uji` berasal dari model 2015 sampai 2022.


![Pembagian tahun: latih 2015 sampai 2022, validasi 2023, uji 2024 sampai 2026 yang dibuka sekali.](gambar/model-sebaran-pembagian-waktu.svg)

![Alur data model sebaran dari titik panas, cuaca, dan lahan sampai model_sebaran.json, gerbang pembanding, tab Simulasi, jejak api, dan peringatan email.](gambar/model-sebaran-alur-data.svg)

## Pelacak peristiwa (`lacak.py`)

Dua deteksi dihubungkan bila jaraknya 750 m atau kurang dan selisih waktunya 24 jam atau kurang (`JARAK = 750.0`, `JEDA = 24 * 60` menit, `lacak.py:25`). Peristiwa adalah komponen terhubung (union-find): api yang menyala berminggu-minggu tetap satu peristiwa selama tiap celah antar-deteksinya 24 jam atau kurang, dan dua api yang bertemu menyatu. Pada 2015 sampai 2026 tercatat 1.153.289 peristiwa dari 2,92 juta deteksi (68 persen berukuran satu sel); 557 peristiwa mencapai 100 sel (1.400 hektare). Resolusi waktu paling halus yang jujur adalah per lintasan, bukan per jam; "per jam" di peramban adalah pembagian luas harian menurut ISI per jam, bukan pengamatan.

## Fitur dan indeks cuaca kebakaran (`fitur.py`, `cuaca.py`, `sebaran_model.js`)

Jangkar adalah waktu sebuah lintasan VIIRS. Pada jangkar p: sel terbakar adalah semua sel terdeteksi hingga p, sel aktif adalah yang terdeteksi dalam 24 jam terakhir, dan target adalah sel baru terdeteksi dalam (p, p + 24 jam]. Sel calon adalah sel yang belum terbakar dalam jari-jari R = 5 sel (Chebyshev; sekitar 1,9 km) dari sel aktif; jari-jari ini menampung sekitar 97 persen sel baru per lintasan (`fitur.py:22`).

Indeks cuaca kebakaran dihitung dengan sistem FWI Kanada: kode harian siang setempat dengan masa panas 30 hari yang dimulai dari FFMC 85, DMC 6, DC 15 (sama dengan peramban yang meminta 30 hari data lalu); FFMC per jam dengan port `hffmc` (Van Wagner 1977) dibawa sampai jam jangkar. Implementasi peramban (`ffmcH`, `dmcH`, `dcH`, `buiD`, `fwiD`, `hffmc`) harus identik dengan Python.

Empat puluh fitur model sel (`FITUR_SEL`, `fitur.py:26`, urutan sama dengan kolom `model_sebaran.json`):

1. Geometri dan keadaan api: `jarak_m` (ke sel aktif terdekat), `tetangga8`, `aktif24`, `searah`, `angin_searah`, `log_luas`, `log_baru24`, `umur_jam`, `log_frp`, `malam`.
2. Cuaca 24 jam: `ws`, `ws_maks`, `rh_min`, `t_maks`, `vpd_maks`, `hujan24`, `hujan72`, `hari_kering`.
3. Kode kekeringan: `ffmc`, `dmc`, `dc`, `bui`, `isi_maks`, `fwi`.
4. Lahan: `gambut`, `hutan`, `produksi`, `apl`, `kebun`, `hti`, `hph`, `tambang`, `sanksi`, `kanal_km`, `jalan_km`, `desa_km`, `penduduk_km2`, `riwayat_f`.
5. Iklim: `oni`, `dmi`.

Fitur yang hanya untuk riset (bekas terbakar 1 sampai 3 tahun, tahun sejak terbakar, jarak sungai) tidak ada di peramban dan tidak boleh masuk model ekspor. Fitur sanksi hanya memakai sanksi yang sudah dijatuhkan pada tahun api (`fitur.py:296`), dan fitur hanya dihitung dari lintasan sampai jangkar. Urutan pemecah seri sel aktif (kunci terkecil menang) disamakan antara Python dan JavaScript (`fitur.py:277`).
