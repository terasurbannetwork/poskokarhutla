# GLOSARIUM: Pemantauan satelit

| Istilah | Arti di paket ini |
| --- | --- |
| Himawari-9 | Satelit cuaca geostasioner Jepang (JMA) di sekitar 140,7 BT; memotret seluruh piringan bumi tiap 10 menit. |
| AHI | Advanced Himawari Imager, kamera Himawari dengan 16 kanal. |
| L1b, HSD | Data tingkat 1b (radiansi terkalibrasi) dalam format Himawari Standard Data; dibaca stdlib oleh `awan_himawari.py`. |
| FLDK, segmen | Pindaian piringan penuh, dibagi 10 segmen utara ke selatan; Indonesia ada di S04 sampai S07. |
| Pindaian | Satu potret FLDK, diberi nama jam mulainya (kelipatan 10 menit, UTC). |
| Kanal B07, B08, B11, B13, B14, B15 | Inframerah 3,9; 6,2; 8,6; 10,4; 11,2; 12,4 mikrometer. |
| Tb | Suhu kecerahan (K) yang dihitung dari radiansi satu kanal. |
| NOAA ODD | NOAA Open Data Dissemination; bucket S3 publik `noaa-himawari9` tanpa kredensial. |
| WLF | Wild Fire, produk titik panas Himawari L2 JAXA di P-Tree; sumbernya terputus sejak 18 Nov 2026. |
| P-Tree | Layanan data Himawari JAXA lewat FTP berakun. |
| Detektor kontekstual | Piksel api dibandingkan dengan latar sekitarnya (rerata dan simpangan baku), bukan ambang tetap saja. |
| Latar | Piksel sah di jendela sekitar calon api, tanpa awan, air, dan calon api lain. |
| Kilau matahari | Pantulan matahari dari air atau atap pada sudut tertentu yang membuat kanal 3,9 um tampak panas. |
| FRP | Fire Radiative Power, daya radiasi api (MW). |
| Penanda dini | Titik Himawari yang terlihat berulang dan belum terlihat VIIRS; aturan PKH-04 di `himawari.penanda()`. |
| Waktu dahulu | Menit antara titik Himawari pertama dan VIIRS pertama di gugus yang sama. |
| BTD, split-window | Selisih Tb dua kanal berdekatan (B13 dikurangi B15); bernilai negatif pada abu silikat. |
| Koreksi uap air | Pengurangan bias BTD karena uap air tropis, diregresikan dari piksel cerah di kotak yang sama. |
| VONA | Volcano Observatory Notice for Aviation dari PVMBG; label abu. |
| VAAC | Volcanic Ash Advisory Centre (Darwin, Tokyo); status resmi abu penerbangan, terpisah dari deteksi kita. |
| Puncak tembus (OT) | Overshooting top: puncak awan konvektif yang menembus tropopause, jauh lebih dingin dari sekitarnya. |
| Paralaks | Pergeseran posisi puncak awan tinggi di citra geostasioner menjauhi titik subsatelit. |
| TROPOMI | Instrumen Sentinel-5P untuk SO2, CO, dan Aerosol Index; satu lintasan sehari. |
| OFFL, NRTI | Produk TROPOMI offline (2 sampai 4 hari) dan hampir waktu nyata; NRTI tidak tersedia di S3 awan. |
| Aerosol Index (AI) | Indeks penyerap aerosol UV TROPOMI; AI >= 1 dipakai sebagai tanda asap. |
| GFM | Copernicus Global Flood Monitoring dari radar Sentinel-1; dibaca `genangan_nasional.py`. |
| VHI | Vegetation Health Index NOAA STAR: gabungan kondisi vegetasi (VCI) dan suhu (TCI), 0 sampai 100. |
| Status sumber | `hidup`, `terlambat`, `terputus`; tiap keluaran satelit wajib membawanya. |
| Kriteria terkunci | Berkas ambang, metrik, pembanding, dan periode uji yang di-commit dan disidik sebelum data uji dibaca. |
| Pembanding | Persistensi dan klimatologi pada jumlah alarm sama (`scripts/umum/pembanding.py`). |
| Vonis | `menunggu`, `lolos`, `gagal`, `tak dapat dinilai`; ditulis lewat `scripts/umum/gerbang.py`. |
| Hipotesis | Label angka dari detektor yang belum ber-vonis `lolos`; tidak dikirim ke luar. |
| Tak teramati | Kab, hari, atau piksel tanpa bacaan sah (awan, di luar lintasan, sumber putus, label tak terbit); bukan 0. |
| Dalops | Laporan harian Pusdalops atau Dirdalops BNPB per kab per hari; label utama (K4), dibaca `label_dalops.py`. |
