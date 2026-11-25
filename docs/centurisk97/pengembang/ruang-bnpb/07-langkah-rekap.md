# Peringatan, usulan langkah, rekap

Halaman ini menjelaskan metode status peringatan dini, usulan langkah, rekap WA, dan rekonsiliasi dengan DIBI.

## Status peringatan dini per kab

`statusKab` mengambil level tertinggi semua kecamatan per hari dari `/banjir/data/status.json` (kunci `b` banjir, `l` longsor). `siaga` memilih kab dengan level 2 atau lebih (Waspada = 1, Siaga = 2, Awas = 3) di salah satu hari, urut level tertinggi, lalu yang sepekan ini sudah tercatat, lalu hujan tiga hari. Level resmi ini tidak dihitung ulang.

## Usulan langkah dan log tindak lanjut

`mitigasi` (`dalops_hitung.js:181`) menyusun satu kelompok per kab/kota dengan prioritas Terdampak belum surut, Awas, Siaga, lalu Pantauan khusus. Langkah hanya dari data yang ada:

- Terdampak belum surut: "Penuhi kebutuhan", "Atasi kendala" dari logbook; "Konfirmasi status surut ke BPBD" bila laporan terakhir lebih lama dari hari acuan; "Tuntaskan pendataan dampak" bila KK dan jiwa kosong; bila tidak ada, "Lanjutkan penanganan dan laporkan perkembangan".
- Awas dan Siaga: kecamatan berlevel tertinggi yang sudah punya posko lapangan (jenis permanen atau siaga) diberi "Posko ...", yang belum diberi "siapkan evakuasi ...", dan kecamatan berlereng level 2 atau lebih diberi "pantau lereng ...". Tenggat dari hari pertama level tercapai, atau "Sekarang".
- Pantauan khusus: kab berlevel 1 yang sepekan ini sudah surut.

Log tindak lanjut menempelkan status ke langkah. Kunci langkah `banjir|<2 digit prov>|<nama kab>|<jenis langkah>` dengan jenis posko, evakuasi, lereng, kebutuhan, kendala, konfirmasi, pendataan, pantau, atau lanjut (`src/dalops_tindak.js:11`). Status: belum, proses, selesai. Tiap simpan menimpa baris keadaan terkini di `dl_tindak` dan menambah satu baris di `dl_tindak_log` (riwayat append-only, termasuk teks langkah saat itu). Batas 120 perubahan per 10 menit per pengisi, catatan paling banyak 300 huruf, badan maksimal 4096 byte. Layar hanya membaca baris 60 hari terakhir; yang lebih lama dianggap belum. Pita menampilkan jumlah selesai dari jumlah langkah. Langkah selesai yang muncul lagi esok harinya tidak dibuka otomatis (bawaan sementara).

![Siklus status langkah tindak lanjut: belum, proses, selesai. Tiap simpan menimpa keadaan terkini di dl_tindak dan menambah satu baris riwayat di dl_tindak_log. Sumber: src/dalops_tindak.js.](gambar/ruang-bnpb-siklus-tindak.svg)

## Rekap WA harian dan Laporan Masuk

`hariDariRekap` (`src/dalops_laporan.js:16`) mengurai teks rekap menjadi satu entri hari: tanggal, jumlah laporan masuk, jumlah menonjol, dan kejadian (jenis, provinsi, lokasi, tempat, sifat baru atau pengkinian, status berjalan, belum, atau selesai). Hanya ringkasan: tanpa dampak, kondisi, teks mentah, nama, nomor, dan tanpa luas karhutla dari WA. Rekap gagal bila jumlah menonjol tidak terbaca atau tidak ada kejadian terurai. Arsip maksimal 30 hari, satu entri per tanggal, rekap yang berhasil tidak ditimpa oleh yang gagal. Tanggal yang melewati besok WIB ditolak. Layar menghitung (`ringkasLaporan`, `dalops_hitung.js:271`): kejadian terbuka bila muncul dalam 14 hari sebelum T dan kemunculan terakhir bukan selesai (`JENDELA_TERBUKA = 14`); perlu ditagih bila tidak ada di rekap T; kandidat tertutup bila tanpa kabar lebih dari 7 hari (`USUL_TUTUP = 7`); pemeriksaan "tanpa pertama" baru aktif setelah arsip berumur 7 hari (`MULAI_CEK = 7`).

## Rekonsiliasi Dalops lawan DIBI

`scripts/bnpb/rekonsiliasi_dalops_dibi.py` dengan kunci dari `kunci_kejadian.py`. Satuan banding adalah hari x kabupaten x jenis (rekaman kembar sehari digabung, karena DIBI membagi satu kejadian lintas kabupaten dengan jumlah kejadian 0,5). Pemasangan satu-satu rakus dalam jendela plus minus 3 hari, diurut dari selisih terkecil. Tahun dibandingkan hanya bila kedua sumber punya data dan logbook paling sedikit 300 hari; tanggal akhir adalah tanggal terakhir yang dimiliki keduanya. Keluaran hanya agregat provinsi x tahun x jenis. Tidak menyimpulkan sumber mana yang benar.
