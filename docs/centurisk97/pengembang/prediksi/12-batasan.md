# Batasan dan perbedaan dokumen

Halaman ini merangkum batasan metode, selisih antara dokumen dan kode, serta hal yang sengaja dibatasi.

## Batasan metode

- Prakiraan hujan, asap, gelombang, dan angin bersumber dari model global dengan sel besar; satu titik pusat kab mewakili seluruh kab. Peluang hujan tanpa ansambel hanya skor kasar.
- Hampir semua kode belum punya cukup hari sasaran: pada audit 23 November 2026 semua kode berstatus "belum teruji". ASP, ROB, GEL, dan CEX belum punya sumber pengamatan sehingga menunggu.
- Klimatologi pembanding memakai arsip pengamatan sistem yang baru dikumpulkan sejak akhir Oktober 2026, bukan iklim bertahun-tahun; persistensi dinilai 0 atau 1 sehingga hampir selalu dikalahkan prakiraan berpeluang (catatan audit).
- Hari 31 Oktober sampai 16 November 2026 untuk prakiraan titik panas tidak pernah dinilai karena arsip pengamatan bocor; perbaikannya hanya berlaku ke depan.
- DIBI terisi susulan sehingga label banjir dan longsor tertunda 14 hari (45 hari untuk koreksi bulanan); logbook hanya memuat kejadian besar, sehingga "nol" di hari yang hanya punya logbook lebih lemah daripada DIBI.
- Kalibrasi dan koreksi fail-closed: bila belum lolos uji tahan, angka mentah dipakai.
- Dampak, jiwa terpapar, dan kebutuhan Sphere adalah perkiraan dari paparan dikali laju historis DIBI; belum diuji balik. Paparan longsor, karhutla, dan angin memakai seluruh penduduk wilayah sebagai batas atas. Data nelayan per kab tidak ada, sehingga jiwa untuk aturan melaut tidak diperkirakan.
- Peta jalan OSM tidak lengkap di daerah terpencil dan ruas di tepi kotak kab bisa tampak tunggal; Overpass publik sering 502 atau 504, kab yang gagal dicoba lagi besok.
- Tangga: pemetaan ZOM ke kabupaten belum ada (musim tampil nasional tanpa tingkat); nowcast BMKG hanya sampai provinsi (nama kecamatan di teks); sumber jam memerlukan salinan live karena salinan git bisa basi berminggu-minggu; sinyal belum diuji balik; anak tangga jam untuk ancaman kering (titik panas hari ini) tidak punya sumber dan kosong.
- Prediksi kekeringan kita (HTH sepekan dan peluang bulan) tanpa peringkat dan tidak ikut sinyal; ambang kekeringan lama gagal uji balik (`KEPUTUSAN-BESOK.md` D9).
- Bulan rawan dihitung dari DIBI versi hari ini, jadi ujinya cenderung terlalu menguntungkan; longsor dan kekeringan tidak lulus dan tampil sebagai hipotesis.
- Uji balik retrospektif `ujibalik.json` tidak dijalankan workflow; tab Ketepatan prakiraan menulis "Belum dijalankan" bila berkasnya tidak ada.
- Prakiraan lawan Kejadian belum dibangun (hanya PK-0 selesai); lihat di bawah.

## Selisih antara dokumen dan kode (kode menang)

1. `KEPUTUSAN-TANGGA.md` D6 menyebut batas basi iklim dan SPI sama-sama 14 hari; kode memakai 14 hari untuk iklim dan 45 hari untuk SPI (sesuai `ALGORITMA.md` bagian 6), `tangga.py:23`.
2. `DESAIN-TEKNIS.md` Tangga menyebut `prediksi.yml` tidak mengekspor `LIVE` ke langkah `jalan.py giliran`; kode sekarang memasang `LIVE` pada langkah itu (`prediksi.yml:65`). Tiga berkas sumber jam masih tidak ada dalam daftar tarik langkah "Tarik masukan segar"; `tangga.py` menariknya sendiri bila `LIVE` ada.
3. `KEPUTUSAN-BESOK.md` K3 (pil "teruji" atau "belum teruji") digantikan K17 (tiga keadaan, dihitung per hari sasaran). Teks `BATASAN` di `terbit.py:27` yang tampil di layar masih menyebut "30 pasangan", sedangkan aturan vonis sekarang 30 hari sasaran dengan selang bootstrap.
4. `.claude/ilmu-agent/prediksi.md` menyatakan belum ada workflow `/prediksi` dan belum ada `tests/prediksi/`; keduanya sudah ada (`.github/workflows/prediksi.yml`, `tests/prediksi/`). Ilmu agent juga hanya menyebut tab Besok, Rapor, dan Konfirmasi, sedangkan layar punya enam tab dan satu halaman ringkas.
5. `ALGORITMA.md` Tangga tidak memuat sumber `kita_kering`, `kita_bulan`, dan `kita_musim` (HTH sepekan, peluang kekeringan bulan, bulan rawan); ketiganya ada di kode, dan dua yang pertama ada di `prediksi-besok/ALGORITMA.md`.
6. Komentar `src/prediksi.js` dan `migrations/0079` merujuk `docs/prediksi/RANCANGAN.md`; berkas itu tidak diperiksa dalam penulisan dokumen ini.
7. Teks sumber yang ditulis ke arsip BNJ dan LSR di `catat.py:383` memuat nama produk lama, bukan Centurisk97; perlu diganti oleh pemilik berkas (data arsip yang sudah ditulis tidak boleh diubah).
8. Rancangan Prakiraan lawan Kejadian menyatakan Dalops akan memuat `prediksi.json` dan menghentikan pembacaan `status.json`; kode `public/bnpb/dalops.js` masih memakai `status.json` dan menyalakan prakiraan hanya untuk banjir dan longsor (`pra: false` pada jenis lain).

## Hal yang sengaja dibatasi

Modul tidak pernah menulis bahwa suatu wilayah bebas dari ancaman, tidak memberi skor gabungan lintas bencana atau lintas sumber (BMKG dan kita; DIBI dan logbook), tidak menjadikan warna peta sebagai angka, dan tidak memakai awan Himawari sebagai peringatan.
