# Layar armada, peta, renlap, kinerja

Halaman ini menjelaskan bagian layar Operasi untuk tindak lanjut, base dan armada, peta, peluang semai, renlap, dan kinerja.

## Tindak lanjut

Seksi Tindak lanjut memuat dua kartu:

- **Rencana tindakan**: daftar tindakan yang disarankan (minta laporan gelar armada, tanyakan kapan armada siap kembali, pertimbangkan geser armada atau patroli darat, jadwalkan sortie ke target renlap, lengkapi data) dalam bentuk matriks base dikali tindakan dan kartu ringkas (`public/operasi_laporan.js:535`).
- **Data belum lengkap**: enam jenis kekurangan data dengan pop-up berisi daftar baris yang kosong (`kurangData`, `public/operasi_laporan.js:523`).

Pengisian data yang kurang dilakukan oleh staf lewat bot WhatsApp atau melalui API isian manual (lihat Referensi teknis). Layar belum memiliki formulir isian (lihat Batasan).

## Base dan armada

Kartu "Tabel base dan armada" mengelompokkan base per pulau (Sumatera, Kalimantan, Jawa, Bali dan Nusa Tenggara, Sulawesi, Maluku, Papua) dan bisa dilipat. Cara pakai:

1. Klik sebuah base untuk melihat rincian armada (foto, tipe, operator, kapasitas bucket, jumlah sortie dan water bombing).
2. Klik sebuah armada untuk membuka pop-up histori semua kegiatannya.
3. Pada tiap kartu armada ada label **Sudah lapor** atau **Belum lapor** di kiri atas foto. Status rinci (Siap, Beroperasi, Siaga, Tidak siap) ada di badan kartu.

Arti status: **Siap**, **Siaga**, dan **Beroperasi** dihitung sebagai armada yang dapat dipakai; **Tidak siap** tidak. Armada tanpa laporan hari itu berstatus "Belum lapor" dan tidak dihitung sebagai tidak siap.

Kelayakan terbang base (pil Layak terbang, Terbatas, Tidak layak, atau "Tanpa METAR" dan "METAR basi") adalah penanda dari data METAR BMKG, bukan keputusan terbang. Metodenya ada di bagian Metode.

## Peta operasi dan badan air kandidat serok

Kartu **Peta operasi** menggambar base beserta jangkauannya, cluster api, target renlap, dan aksi armada. Kartu **Badan air kandidat serok** menampilkan badan air di sekitar base yang ukurannya cukup untuk pesawat amfibi menyerok air.

Cara pakai badan air: pilih salah satu dari enam tipe pesawat (AT-802F, US-2, CL-415, DHC-515, AG600M, Be-200ES), lalu lihat jumlah kandidat per base dan daftar terdekat serta lapisan peta. Yang sering disalahpahami:

- Tipe pesawat adalah bahan kajian dari sebuah laporan evaluasi, bukan data armada. Indonesia belum mengoperasikan pesawat amfibi pemadam.
- Kata yang dipakai adalah "kandidat". Kedalaman dan tinggi gelombang tidak ada di data peta, sehingga tidak dinilai.
- Sungai tidak dihitung kandidat dan tampil di kolom "Sungai belum dinilai", karena kotak batas ruas sungai berkelok melebihkan panjang dan lebar lintasan lurus.
- Panjang dan lebar adalah perkiraan dari kotak batas di OpenStreetMap.

## Peluang semai

Seksi ini menampilkan zona semai awan (modifikasi cuaca), prakiraan awan layak semai, dan prakiraan asap 24 jam. Seksi ini diatur paket tersendiri (`data/kajian-bnpb/semai-awan/`, `AGENTS.md` 2.14) dan hanya diringkas di sini. Alamat langsung: `/operasi#semai`. Zona hanyalah usulan model; zona tidak masuk renlap dengan sendirinya. Pusdalops dan peran `tmc` dapat mencatat target renlap OMC dari zona, dan halaman cetak renlap OMC ada di `/renlap-omc?zona=<putaran>-<kode>` (`src/worker.js:736`). Layar tidak menghitung ulang rute; rute dan ketinggian berasal dari arsip putaran.

## Renlap dan sortie

Kartu **Renlap** per base menampilkan target patroli dan target water bombing yang diusulkan untuk hari terbang itu, versi **malam** (dibuat sesudah pukul 20.00 WIB untuk besok) atau **pagi** (dibuat sesudah pukul 07.00 WIB untuk hari ini). Jika kedua versi ada, versi pagi yang dipakai untuk penilaian.

Cara pakai:

1. Buka seksi **Renlap dan sortie**.
2. Pada kartu sebuah base, lihat target bernomor beserta alasannya (titik baru, lama berapi, gambut, kekeringan bahan bakar, dekat permukiman, belum ditangani).
3. Unduh waypoint lewat tombol **KML** atau **GPX** (tanpa tulisan di tombol; pemilik meminta ikon saja). Berkas dibuat di peramban dan berisi titik base, target bernomor, dan garis rute (`public/operasi_laporan.js:399`).
4. Untuk lembar cetak, buka `/renlap-cetak?base=<kode>&tgl=<YYYY-MM-DD>&versi=<pagi|malam>` (tombol Renlap di kaki kartu). Halaman memuat peta rute di atas citra Esri, tabel leg untuk pilot, lalu satu halaman per titik periksa. Cetak berarti simpan sebagai PDF dari peramban (`public/renlap_cetak.js`).

Arti label: **target didatangi** berarti ada aksi armada base itu yang koordinatnya berjarak 10 km atau kurang dari target (`RENLAP_KM`, `public/operasi_laporan.js:141`). Ini perkiraan; jejak ADS-B belum dipakai untuk menentukannya.

Kartu **Aksi armada** menampilkan sortie dan aksi water bombing hari itu, lengkap dengan hasil penilaian satelit (lihat Metode). Kartu **Temuan pilot** menampilkan laporan pilot (api berasap, berasap tipis, clear) dengan koordinat dan kabupaten.

Hal yang sering disalahpahami:

- Renlap bukan perintah terbang. Komando operasi udara ada pada TNI AU dan PIC.
- Usulan dibuat hanya bila ada titik panas sistem Centurisk97 dan data pendukung. Bila tidak ada data, kartu menulis "Belum ada" dan tidak mengarang target.
- Tombol PDF dari bot (unggahan PDF renlap bergambar ke layar) belum ada; PDF hanya dari halaman cetak (lihat Batasan).

## Kinerja: Tren, Efektivitas, Operator, Dokumentasi

- **Tren 30 hari.** Empat grafik batang harian selama 30 hari sampai tanggal terpilih: sortie, aksi water bombing, aksi padam 24 jam atau lebih, dan titik panas nasional (aksi dari `/api/operasi/monitor`, titik panas dari `/data/harian30.json`; `public/operasi_laporan.js:886`). Kepala kartu tetap nama seksi.
- **Efektivitas.** Ubin metrik M1 sampai M11 dari `/api/operasi/nilai` (tujuh hari), dikelompokkan menjadi Ketepatan sasaran, Hasil pemadaman, Kesiapan dan respons, serta Mutu data dan kendala (`public/operasi_laporan.js:1197`). Klik ubin untuk peringkat per base (terburuk di atas). Ubin tanpa data masuk baris "Belum ada data". Arti tiap metrik ada di bagian Metode.
- **Operator.** Tabel per operator: jumlah armada, hari siap, hari terbang, utilisasi (hari siap yang benar-benar terbang, maksimal 100 persen), sortie, aksi water bombing, padam, dan jam 2026.
- **Dokumentasi foto.** Galeri foto yang masuk lewat grup satgas dan dipasangkan ke aksi. **Jejak ADS-B** menampilkan posisi armada Centurisk97 dari penerima ADS-B bila tersedia.
