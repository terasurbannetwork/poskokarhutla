# PRD: Kabar Alun-alun per kejadian

## Tujuan

Pembaca Alun-alun `/lapor` melihat satu kejadian bencana sebagai satu kartu yang memuat semua kabarnya sekaligus: laporan resmi BNPB, laporan warga, berita, dan media sosial, tiap kabar dengan nama sumbernya (K3, D2). Laporan harian tampil di peta yang bisa disentuh (K1).

## Pengguna

Publik pembaca Alun-alun. Sejak K5 (26 Nov 2026) kabar resmi tampil publik.

## Fitur

| ID | Fitur | Terima bila | Dasar |
| --- | --- | --- | --- |
| F-1 | Kejadian resmi dari laporan harian sebagai titik di peta Alun-alun | tiap kejadian ber-kab terpetakan punya satu titik di tengah kab/kota; kejadian tanpa kode kab hanya di daftar, berlabel "lokasi belum terpetakan" | K1, D5, D6 |
| F-2 | Kartu kejadian dengan empat pita sumber, urutan tetap: Resmi BNPB, Laporan warga, Berita, Media sosial | tiap pita menulis nama sumbernya; pita kosong ditulis "Belum ada", bukan angka nol | K3, D2 |
| F-3 | Angka resmi tampil sebagai angka, angka warga apa adanya per bidang (bukan rentang) berlabel "laporan warga", dan 0 dari warga tidak ditampilkan sebagai angka, berita dan medsos tanpa angka | tidak ada angka hasil penjumlahan antarsumber | D3 |
| F-4 | Laporan warga menempel pada kejadian resmi per kab, jenis, dan jendela tanggal | yang tidak menempel tampil sebagai kejadian "belum ada laporan resmi" | D1, ALGORITMA 4 |
| F-5 | Berita menempel lewat pencocok yang sudah ada, paling banyak 5 per kejadian, terbaru dulu | tiap berita: judul, media, jam terbit, tautan keluar | D7, D8 |
| F-6 | Kesegaran ditulis di kartu: "Laporan harian BNPB, cut-off <tanggal jam>"; lewat 48 jam menjadi "Laporan resmi terakhir <tanggal>" | label muncul di semua kartu resmi | D12 |
| F-7 | Pita Media sosial menampilkan "Belum tersambung" sampai Q1 dijawab | tidak ada angka, akun, atau unggahan | D9, D10 |
| F-8 | Saringan: Semua, Diikuti, jenis, dan status (berjalan, selesai) | kejadian selesai tampil di tampilan bawaan 7 hari sesudah laporan terakhir; sesudahnya tetap ada di berkas (tanda `selesai_lama`) dan hanya muncul lewat saringan Selesai (Q6) | Q6 |
| F-9 | Berkas kabar dibangun pipeline harian, bukan Worker | satu berkas `public/data/alun/kabar.json`, tanpa tabel D1 dan rute baru | D11 |

## Larangan

- Tidak menjumlah, merata-rata, atau menaruh angka antarsumber dalam satu kolom (D3).
- Tidak menerbitkan kolom `teks.*`, `tangani`, `perhatian`, `label` dari laporan harian (D4).
- Berita, warga, dan medsos tidak pernah mengubah status kejadian; status hanya dari laporan resmi (D13).
- Tidak menebak kab/kota dari nama yang tidak cocok persis (D5).
- Tidak menulis "aman", "padam", atau "sudah selesai" atas dasar selain laporan resmi.
- Tidak memakai `public/data/medsos_tiktok.json` atau menyimpan nama akun dan isi unggahan (D10).
- Laporan warga yang belum ditindaklanjuti tidak pernah tampil (`lapor-ai` K30).
- Kiriman Alun-alun warga tidak membuat kejadian resmi.

## Di luar cakupan fase pertama

Peringatan dini dan status gunung api dari halaman 1 dan 4 deck (Q7). Menu baru atau ganti nama tab (Q4). Portal resmi sebagai sumber berita (Q5).

## Pertanyaan terbuka (dari KEPUTUSAN, tidak dijawab di sini)

| No | Hal | Keadaan |
| --- | --- | --- |
| Q1 | Platform dan anggaran media sosial | belum diputuskan (bawaan sementara: belum tersambung, F-7) |
| Q2 | Angka laporan harian boleh publik | terjawab K5: boleh publik |
| Q3 | Siapa menerbitkan data resmi harian | belum diputuskan (bawaan sementara: langkah ekspor ikut `jalan.py` hari itu dan ikut commit laporan harian) |
| Q4 | Nama tab | belum diputuskan (bawaan sementara: tetap "Alun-alun") |
| Q5 | Sumber berita | belum diputuskan (bawaan sementara: Google News RSS lewat `berita.py`) |
| Q6 | Lama tampil sesudah selesai | belum diputuskan (bawaan sementara: 7 hari, lalu lewat saringan Selesai) |
| Q7 | Peringatan dini dan gunung api | belum diputuskan (bawaan sementara: tidak di fase pertama) |
