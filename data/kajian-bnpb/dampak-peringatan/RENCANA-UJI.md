# RENCANA-UJI: Dampak peringatan dini dan status prakiraan

Uji `--cek` Python murni tanpa jaringan; fixture dibuat di dalam uji (poligon kecil, tiga kab fiktif berbentuk nyata, umpan CAP buatan, `--kini` tetap). Uji Node memakai `node:test` dan hanya mengimpor fungsi murni. `KATA_DILARANG` (kata yang menjanjikan keselamatan, "terdampak", "korban", "bebas", "padam") ada satu per bahasa (D32): Python di `scripts/siklus/dampak_peringatan.py`, JS di `tests/dampak-peringatan/kata_dilarang.mjs`; gerbang DP-22 menegaskan keduanya sama. Daftarnya tidak ditulis ulang di dokumen ini.

## Uji murni Python (`python3 -I scripts/siklus/dampak_peringatan.py --cek` dan `python3 -I scripts/prediksi/status_prakiraan.py --cek`)

| No | Kasus | Harapan |
| --- | --- | --- |
| P1 | umpan segar, daftar peringatan kosong | keluaran `peringatan = []`, teks "tidak ada peringatan aktif"; `jiwa` kab null (bukan 0); status tetap dihitung dari prakiraan |
| P2 | umpan CAP lebih tua dari 3 jam, atau sumber mati | R null, semua status berisi "belum terukur" (abu) atau tanda "sebagian sumber", `jiwa` null; tidak ada angka 0 |
| P3 | pembulatan: 7, 10, 54, 55, 99, 100, 995, 54.308, 1.083.781, null, 0 yang dihitung | kurang dari 10, 10, 50, 60, 100, 100, 1.000, 54.000, 1.100.000, null, 0 |
| P4 | pindai semua string yang kita buat (label status, tooltip, catatan, pesan push, nama kolom CSV) terhadap `KATA_DILARANG` | tidak ada kecocokan; nama peristiwa BMKG dan nama fasilitas dari sumber luar tidak dipindai |
| P5 | daftar izin kunci publik | `ringkas.json` dan `status.json` tidak memuat `desa`, nama fasilitas, titik fasilitas, atau kunci lain di luar daftar izin, termasuk bersarang |
| P6 | tiga sumber jiwa (WorldPop, Dukcapil, GHSL) pada satu zona | tiga angka terpisah di keluaran; tidak ada kolom yang sama dengan jumlah atau rata-ratanya |
| P7 | poligon seluruhnya di laut atau di luar kab | tidak membuat kab; dicatat `di_luar_wilayah`; jumlah penduduk 0 tidak dibuat |
| P8 | kab tanpa grid bangunan provinsi | `terliput: false`, `jiwa` null, fasilitas null; kab lain tetap dihitung |
| P9 | dua jalan dengan `--kini` dan umpan sama; lalu jalan ketiga dengan poligon sama tetapi `prediksi.json` berbeda | jalan kedua byte sama dengan pertama; hitung keterpaparan dilewati bila poligon sama; status pada jalan ketiga berubah sesuai masukan baru (status selalu dihitung ulang, D3) |
| P10 | tabel status: semua kombinasi E (0 sampai 3) kali K (rendah, sedang, tinggi, null) kali R (null, 0 sampai 3) kali bahaya (banjir, cuaca) kali tanggal sasaran d (0 sampai 3) | tiap hasil sama dengan tabel ALGORITMA 5; R hanya berpengaruh pada d = 0; kelas rendah dengan R kurang dari 3 tidak pernah di atas Siaga; Normal hanya bila P, R, dan K (atau CEX) tidak null; status kab = maksimum atas d |
| P11 | hapus satu sumber (P, R, atau K) dari kasus Normal | status berubah menjadi "belum terukur" (abu); bila E lebih dari 0 menjadi tingkat E dengan tanda "sebagian sumber" |
| P12 | sidik: ubah satu ambang di `status_prakiraan_kriteria.json` setelah uji dibuka | gagal; hash kriteria tidak cocok sidik |
| P13 | peristiwa tak dikenal ("Petir", nama baru) | `tak_dipetakan.n` naik, tidak ada paparan, tidak ada galat |
| P14 | desa dalam poligon: kelas rendah, sedang, tinggi, tak terliput | jumlah keempat kelas sama dengan jiwa desa dalam poligon per sumber (selisih pembulatan di bawah 1 persen); tak terliput tidak masuk rendah |
| P15 | fasilitas: koordinat kategori berkoordinat dan obvit | obvit hanya hitungan, tanpa koordinat; kab tanpa sumber null; fixture manual cocok dengan hitungan |
| P16 | keluaran publik | tidak ada kunci `desa` dan tidak ada nama fasilitas |
| P17 | karhutla (KHT): status per kab dari fixture kluster berstatus 0 sampai 3; kab tanpa kluster; keluaran karhutla segar lalu basi lebih dari 36 jam; vonis `ujibalik_status.json` "tidak lulus" lalu "lulus" | maksimum kluster aktif per kab; tanpa R dan tanpa K; kab tanpa kluster = tingkat 0 hanya bila segar, basi menjadi "belum terukur"; nama tingkat dari registri; pil hipotesis tetap selama vonis bukan "lulus" |
| P18 | status banjir dan longsor untuk satu kab | dua keluaran terpisah; penduduk tidak dijumlah antar dua bahaya, total dari gabungan zona |
| P19 | arsip harian | dua jalan di hari sama tidak menambah baris; baris lama tidak berubah |
| P20 | gerbang: entri `status_prakiraan` dengan selang batas bawah kurang dari atau sama dengan 0, atau vonis prospektif bukan lolos | `boleh_tampil` salah; pil hipotesis tetap |
| P21 | `bulat` pada nilai yang sama dua kali | hasil sama; fungsi murni |
| P22 | laki-laki dan perempuan: desa dengan `pria` 3.222 dan `wanita` 3.360, terpapar 1.000 | `jiwa_jk` perkiraan 490 dan 510 (rasio desa dikali terpapar), berlabel perkiraan; `pria` atau `wanita` kosong atau jumlah nol: null |
| P23 | poligon kecil yang tidak memuat satu pun titik pusat desa tetapi berpotongan dengan batas kab | kab tetap tersentuh dan dihitung (D35) |
| P24 | uji emas `paparan.py`: keluaran lama (kab, kecamatan, zona) sebelum dan sesudah perluasan DP-03 pada fixture yang sama | byte sama; hanya kunci baru per desa yang bertambah |
| P25 | `KATA_DILARANG` Python lawan JS | dua daftar sama persis |
| P26 | tabel `kelas_bahaya_kab.json`: kab tanpa sampel terliput | K null; kab dengan lebih dari 50 persen tak terliput K null; tidak pernah "rendah" untuk tak terliput |
| P27 | fasilitas dua sumber untuk satu kab (Dapodik dan OSM) | dua angka terpisah; tidak ada kunci jumlah; sumber tanpa data null |

## Uji Node (`node --test tests/dampak-peringatan/*.test.mjs`, `tests/lapor/*`, `tests/warga/dampak_peringatan.test.mjs`)

| No | Kasus | Harapan |
| --- | --- | --- |
| N1 | `status.json` tidak ada atau galat jaringan | Alun-alun, tab Besok, dan halaman bencana tampil seperti sekarang, tanpa galat |
| N2 | status belum lolos gerbang | pil "hipotesis" tampil di kartu kab, peta, Dalops, Layar Pimpinan, dan teks push |
| N3 | teks hijau Normal | tepat sama dengan D13; tidak ada ikon centang atau perisai; tooltip abu sesuai ALGORITMA 5 |
| N4 | teks push | memuat nama kab dan kecamatan, bukan kode; tanpa angka penduduk; memuat label hipotesis atau "prakiraan belum teruji"; tanpa `KATA_DILARANG` |
| N5 | status naik Normal ke Waspada, lalu Waspada ke Siaga, lalu turun | tepat dua notifikasi (naik saja, satu per perangkat per terbitan); turun tidak mengirim |
| N6 | CSV Dalops | kepala kolom dan angka dibulatkan sama dengan layar; tanpa nama orang |
| N7 | kartu Layar Pimpinan | menghitung kab Siaga dan Awas dari `status.json`; sumber basi menulis "belum terukur", bukan 0 |
| N8 | saklar Alun-alun | bawaan Kejadian; tampilan Peringatan tidak memuat kartu kejadian; kartu prakiraan tidak muncul di daftar kartu kejadian; baris kecil di kartu kejadian hanya tautan |
| N9 | baris kecil "Status prakiraan" di kartu kejadian | tidak mengubah status, angka, atau pita kejadian |
| N10 | `public/bencana.json` | `kemampuan.layar.status_dampak` berisi `["bnj","lsr"]` untuk banjir, `["kht"]` untuk karhutla, `["cex"]` untuk cuaca, dan `[]` di entri lain (termasuk `longsor`, yang berstatus mati dan berlayar induk banjir); `python3 -I scripts/umum/bencana.py uji` hijau; golden registri tidak mundur; halaman dengan daftar kosong tidak memuat modul |
| N11 | modul bersama pada halaman banjir (peta utama dan tab Longsor `public/banjir/longsor.js`) | peta utama hanya BNJ, tab Longsor hanya LSR; tidak ada salinan modul di `public/banjir`; tidak ada halaman `/longsor` |
| N12 | bundel `/prediksi` | tidak memuat data per desa dan tidak ada nama fasilitas |
| N13 | pindai teks klien | tanpa titik tengah sebagai pemisah, tanpa kata huruf kapital semua, tanpa `KATA_DILARANG`, tanpa literal warna baru |
| N14 | tautan peringatan `javascript:` | tampil sebagai teks, bukan tautan |
| N15 | rute staf | tanpa sesi 401; parameter `kab` bukan empat digit 400; publik hanya `ringkas` dan `status` |
| N17 | label penduduk di tab Besok dan kartu kab | "penduduk di area peringatan BMKG", di blok terpisah dari kolom Jiwa dan jiwa terpapar aturan dampak; tidak ada angka yang sama dengan jumlah ketiganya (D31) |
| N18 | dua pemicu (prakiraan dan status) menaikkan tingkat (kab, jenis) pada hari WIB yang sama untuk satu perangkat | tepat satu notifikasi; kenaikan kedua tidak dikirim; baris `pw_kirim_harian` tertulis; hari berikutnya boleh lagi (D30) |
| N19 | warna lapisan | hijau Normal dan abu belum terukur hanya di modul; tidak ada literal warna baru; registri tidak diubah warnanya |
| N16 | total nasional | dihitung dari gabungan zona, bukan jumlah per bahaya |

## Uji integrasi nyata

1. `python3 -I scripts/siklus/dampak_peringatan.py --umpan <CAP arsip nyata dengan "Hujan Lebat dan Petir">` di mesin pemilik: dua kab tersentuh, jumlah kab "belum terpetakan" dicatat di laporan DP-03; jumlah sama dengan hitung manual satu desa kecil.
2. Rute staf diuji `tests/warga/dampak_peringatan.test.mjs` terhadap D1 dan R2 tiruan lokal yang menjalankan kode Worker asli (tanpa mock yang meloloskan bug lintas lapis, AGENTS poin 3).
3. Uji balik: `python3 -I scripts/prediksi/status_prakiraan.py --uji-balik` menulis entri gerbang; pil hipotesis hilang hanya bila `boleh_tampil`.
4. Tinjau `http://localhost:8800/lapor/` (saklar Peringatan), `/prediksi`, `/bnpb/dalops`, `/admin/pimpinan`, dan halaman karhutla, banjir (peta utama dan tab Longsor), cuaca.

## Gerbang yang wajib hijau sebelum push

`python3 -I scripts/siklus/dampak_peringatan.py --cek`, `python3 -I scripts/prediksi/status_prakiraan.py --cek`, `node --test tests/dampak-peringatan/*.test.mjs`, `node --test tests/warga/dampak_peringatan.test.mjs`, `npm run uji:agen` (termasuk `gerbang-paket-modul`, `gerbang-ilmu-agent`, `gerbang-dampak-peringatan`, registri bencana), `node --test tests/agen/gerbang-token-warna.test.mjs`, `npm run uji:warga`.
