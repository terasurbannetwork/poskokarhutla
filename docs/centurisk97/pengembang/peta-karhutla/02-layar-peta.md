# Layar peta dan laci cluster

Halaman ini menguraikan perilaku tab Peta (panel, tanggal, ukuran, lapisan) dan isi laci cluster, dengan rujukan ke kode.

## Peta (tab Peta)

Peta memakai MapLibre dengan dasar peta OpenFreeMap yang mengikuti tema terang atau gelap.

**Panel kiri.** Kotak cari menerima nama wilayah, taman nasional, gunung, konsesi, atau kode cluster seperti K001. Tiga tombol isi panel (`data-m`) memilih daftar Wilayah (`wil`), Riwayat (`riw`), atau Cluster (`kom`). Daftar wilayah turun bertingkat: provinsi, kabupaten/kota, kecamatan, dengan remah roti di atas panel. Tiap baris menampilkan angka menurut ukuran yang dipilih, status, dan tren mini.

**Tanggal data.** Pilihan Hari ini dan Kemarin, ditambah "Tanggal lain" yang membuka kalender. Hari yang bisa dipilih adalah tujuh hari terakhir (dari `hotspot.json`) dan hari arsip tahun 2026 yang jumlah titiknya sama dengan atau di atas ambang di `data/titik_hari/indeks.json` (`public/index.html:3071` sampai `3097`). Satu pilihan berarti satu hari kalender WIB; tidak ada akumulasi 72 jam atau tujuh hari di tombol ini.

**Ukuran.** Empat ukuran mewarnai wilayah dan mengisi kolom angka (`public/index.html:1906`):

| Ukuran | Arti |
| --- | --- |
| Hotspot | Jumlah lokasi unik titik panas pada hari terpilih |
| Cluster | Jumlah cluster pada hari terpilih |
| Luas terbakar | Perkiraan hektare dari titik NOAA-20 dan NOAA-21; periode bisa satu hari, 7 hari, 30 hari, tahun ini, atau bulan-bulan pilihan |
| Belum padam | Perkiraan hektare api yang masih terdeteksi; ini stok pada satu hari, bukan aliran, sehingga tidak dijumlah antarhari |

Di tingkat wilayah yang sudah dipilih (turun ke provinsi atau lebih dalam) ukuran selalu jatuh ke Hotspot kecuali Cluster dipilih (`ukurAktif`, `public/index.html:1910`).

**Prakiraan cuaca.** Kartu "Prakiraan cuaca (siang)" memilih hari prakiraan untuk lapisan FWI, angin, asap, dan hujan. Ini pemilih terpisah dari Tanggal data karena mengacu ke hari mendatang, bukan hari titik panas yang sudah terdeteksi.

**Hotspot mundur.** Bila hari ini belum punya satu pun titik yang dihitung (data FIRMS belum terbit, atau baru lewat pukul 00.00 WIB), tampilan mundur ke hari terakhir yang punya titik dan menandainya, supaya angka 0 tidak terbaca sebagai "tidak ada api" (`public/index.html:1934`, uji di `tests/agen/hotspot-mundur.test.mjs`).

**Overlay.** Tombol lapisan membuka empat grup (`public/index.html:1566` sampai `1612`):

| Grup | Lapisan |
| --- | --- |
| Api dan respons | Titik panas, Cluster, Warna wilayah, Luas terbakar per kabupaten, Masih terdeteksi per kabupaten (perkiraan satelit), Lokasi langganan api, Citra satelit dan titik panas Himawari 10 menit, Citra harian, Medan 3D, Foto lapangan warga |
| Cuaca dan asap | FWI, Angin, Api 3D (ilustrasi), Cahaya matahari (ilustrasi), PM2.5, PM10, AQI (ISPU), Hujan |
| Lahan | Lahan gambut, Kesatuan Hidrologis Gambut, peta moratorium PIPPIB 2026-I, Areal terbakar (Kemenhut), konsesi dan kawasan hutan lewat pil di ubin grup |
| Infrastruktur | Markas Manggala Agni, Pangkalan helikopter dan pesawat, METAR (jarak pandang bandara) |

Ada juga tombol Banding (membandingkan dua citra) dan Timelapse (GIF citra harian area yang sedang dilihat).

**Warna dan pil status.** Status cluster memakai empat tingkat: Pencegahan rutin, Patroli terpadu, Siaga pemadaman awal, dan Prioritas pemadaman (`scripts/data/aturan.py:57`). Pil "Firespot (satelit, metode Kemenhut)" menandai cluster yang lolos saringan api nyata, dan "Mungkin firespot, perlu dicek" menandai yang belum (`public/index.html:3302`).

**Hal yang sering disalahpahami.**

- Angka titik panas adalah lokasi unik per hari, bukan jumlah baris deteksi mentah. Karena itu tidak sama dengan angka SiPongi atau GIS BNPB (lihat [Titik panas yang dihitung](/docs/pengembang/peta-karhutla/titik-panas)).
- Luas pada cluster adalah luas indikatif dari piksel, bukan luas terbakar. Laci cluster menampilkannya sebagai rentang (30 persen sampai 100 persen luas piksel).
- Cluster yang "tidak terdeteksi" belum tentu sudah tidak menyala: awan, asap, atau jeda lintasan bisa menutupi, dan bara gambut bisa bertahan di bawah permukaan.

## Laci cluster (pop-up insiden)

Mengklik cluster di peta atau daftar membuka laci cluster (`Laci.buka`, `public/index.html:3303`). Di layar sempit dan saat dibuka dari pop-up, isinya tampil dalam dialog. Bagian yang bisa dilipat:

| Bagian | Isi |
| --- | --- |
| Kepala | Kode cluster, kecamatan dan kabupaten, pil status, pil firespot, koordinat; tombol simulasi 72 jam, Google Maps, bagikan lewat WhatsApp, bagikan tautan |
| Api saat ini | Piksel aktif 24 jam, hari menyala, perbandingan deteksi dengan kemarin, luas indikatif, deteksi VIIRS 7 hari, waktu deteksi pertama dan terakhir |
| Insiden api | Nama desa dan kabupaten, lencana bukti (kuat atau tunggal), kota terdekat, persen petak 375 m yang pernah punya api 2012 sampai 2025, status terlihat satelit atau tak terlihat, dan laju "muncul lagi" untuk insiden tak terdeteksi (`public/pembanding.js:27` sampai `75`) |
| Alasan peringkat | Batang porsi tujuh komponen skor; diberi pil hipotesis (`public/pembanding.js:84`) |
| Penjelasan status | Dua bahan status: ukuran api (kecil, sedang, besar) dan cuaca (kelas FWI), dengan hasilnya |
| Cuaca di lokasi | FWI, FFMC, DC beserta kelasnya; suhu, kelembapan, angin |
| Lahan dan penanggung jawab | Bahaya InaRISK, apakah di lahan gambut |
| Gambut terbakar di bawah permukaan (estimasi) | Luas, kedalaman, massa, dan emisi CO2, CH4, CO dengan tiga skenario; hanya tampil bila data lengkap |
| Respons terdekat | Ada di kode, tetapi disembunyikan di layar (CSS `public/index.html:187`, 13 Oktober 2026, atas permintaan pemilik). Isi yang dibangun: posko yang disarankan, Daops terdekat dengan regu, jarak dan waktu tempuh darat perkiraan, kantor BPBD (`public/index.html:3363`) |
| Tren lokasi dan prakiraan | Watak kebakaran sekitar pusat cluster dari arsip VIIRS 2012 sampai 2026 (`public/riwayat_sel.js`) |
| Tindakan yang disarankan | Ada di kode, tetapi disembunyikan di layar (CSS `public/index.html:187`, bersama kontainer `.l5-akses`). Isi yang dibangun: daftar tindakan menurut tingkat status (`public/index.html:3369`) |
| Riwayat kecamatan | Titik per tahun, puncak, indeks risiko; tombol "Analisa lengkap" |

Kartu "Perkembangan api" dan "Bangunan dekat api" per insiden dirancang untuk laci ini tetapi belum dipasang (lihat [Fitur yang belum ada di layar](/docs/pengembang/peta-karhutla/layar-rencana) dan [Batasan](/docs/pengembang/peta-karhutla/batasan)).
