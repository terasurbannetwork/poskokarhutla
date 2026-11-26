# Banding sumber data, beruntun, Alun-alun

Halaman ini menjelaskan metode rapor sumber, beda sumber, gempa beruntun, kalender ancaman, moderasi Alun-alun, dan dashboard pimpinan.

## Rapor sumber (silang sumber F1)

`scripts/bnpb/silang/rapor_sumber.py`, jadwal harian di `lintas.yml` (02.10 UTC) sesudah cuaca dan DIBI. Pasangan: satu baris prakiraan (sumber, bahaya, daerah, tanggal target, tenggang, tanggal beku, tingkat); tanggal beku harus lebih awal dari tanggal target, yang melanggar dibuang dan dihitung. Sumber yang dinilai: BMKG sepekan (Siaga atau Awas berarti hujan menyala, Angin Kencang berarti angin menyala; Sedang dibaca Waspada) dan prospektif Centurisk97 (hujan menyala bila ada kecamatan Siaga atau Awas, angin menyala bila embusan 54 km/jam atau lebih, `ANGIN_KMJ`). Sumber lain dicatat di `dilewati` dengan alasan, misalnya arsip tanpa jam ambil atau tanpa ambang tertulis.

Kejadian lawan: DIBI dan logbook (dan SYNOP belum dipetakan). Pemetaan jenis (HIPOTESIS awal): hujan ke banjir, banjir bandang, banjir genangan, tanah longsor, gerakan tanah, cuaca ekstrem; angin ke angin kencang, angin topan, puting beliung, cuaca ekstrem. Satuan hitung hari x provinsi, nasional adalah jumlah provinsi.

```
a = menyala dan terjadi     b = menyala tidak terjadi
c = tidak menyala terjadi   d = tidak menyala tidak terjadi
POD = a/(a+c)   FAR = b/(a+b)   CSI = a/(a+b+c)
ar  = (a+b)(a+c)/(a+b+c+d)    ETS = (a - ar)/(a+b+c - ar)   bagi nol = null
```

Gerbang: hari dinilai kurang dari 30 berstatus `belum_cukup` (tanpa angka); jumlah hari kalender berkejadian kurang dari 30 berstatus `n_kurang` (hanya a b c d dan n); selebihnya `angka` dengan selang Wilson 95 persen untuk POD dan FAR. Kejadian DIBI dan logbook hanya dinilai sampai tanggal terakhir dikurangi 14 hari (`LAG = 14`) karena telat lapor. Pembanding persistensi (ada kejadian di provinsi itu pada hari beku) disertakan. Arsip bulanan `rapor_sumber_arsip/YYYY-MM.jsonl` bersifat append-only dan tidak diisi mundur. Status per 10 November 2026: 36 sel semuanya `belum_cukup`.

## Beda sumber (silang sumber F3)

`scripts/bnpb/silang/beda_sumber.py` membandingkan prakiraan BMKG dan model Centurisk97 untuk hujan (mm per hari) dan gelombang (m). Tiap nilai diubah ke peringkat 0 sampai 3 memakai `beda_sumber_peta.json` (HIPOTESIS awal, label di tiap baris): hujan 0, 50, 100, 150 mm per hari; gelombang 0, 2,5, 4, 6 m. Status `perlu_dicek` bila selisih peringkat 2 atau lebih, atau untuk besaran kontinu rasio `maks / maks(min, 0,1 m)` lebih dari 2. Bila salah satu sumber tidak ada pada hari itu, statusnya `tidak_dibandingkan`, bukan "sama". Angin tidak dibandingkan (BMKG memberi angin rata-rata, model embusan) dan titik panas tidak dibandingkan (satu sumber). Tidak ada kolom "yang benar". Per 10 November 2026: 968 pasangan hujan dibandingkan, semuanya selaras, dan gelombang 3.090 baris tidak dibandingkan.

## Deteksi gempa beruntun dan kalender ancaman (silang sumber F5 dan F6)

Dua keluaran terkait paket ini yang dimiliki modul lain (`scripts/gempa/beruntun.py`, `scripts/umum/kalender_ancaman.py`):

- Gempa beruntun: jumlah gempa M 4,5 ke atas dalam 7 hari di lingkaran 30 km sekitar gunung api (`M_MIN = 4,5`, `DETEKSI_HARI = 7`, `R_KM = 30`), dibandingkan dengan laju historis USGS M 4,5 ke atas sejak 2000 di lingkaran yang sama (laju = (n + 0,5) / hari). Kejutan dinilai dengan peluang ekor binomial negatif (memperhitungkan kelebihan varians), dengan dispersi alpha yang diestimasi dari uji mundur mingguan leave-one-year-out; peluang itu dikalikan jumlah sasaran, dan tanda `perlu_dicek` hanya bila peluang terkoreksi kurang dari 0,01 (`AMBANG_P`, HIPOTESIS awal) dan N paling sedikit 3. Poisson hanya dihitung sebagai pembanding, dan berkas keluaran bermode `historis_usgs_m45_nb` (`scripts/gempa/beruntun.py:39, 86, 207, 268, 352`; `public/gempa/data/beruntun.json`). Berlabel "Deteksi Centurisk97", bukan prediksi gempa dan bukan peringatan, "belum teruji". Hanya M 4,5 ke atas, jadi kawanan gempa kecil vulkanik tidak terlihat dan ditampilkan terpisah dari data MAGMA. Per 23 November 2026: 69 sasaran, semuanya berstatus biasa.
- Kalender ancaman: per kab, bahaya, dan bulan, dua kolom berdampingan tanpa skor gabungan: laju kejadian dari logbook tahun penuh (p = tahun yang bulan itu punya kejadian dibagi jumlah tahun, selalu bersama pembilang dan penyebut; `p` dikosongkan bila total setahun kurang dari 5, atau sel itu hanya ada di dua tahun atau kurang, atau n kurang dari 3) dan label narasi prakiraan BMKG yang dicocokkan lewat nama wilayah. Bulan tanpa narasi tertulis "tidak disebut". Bukan prediksi Centurisk97 dan bukan uji balik.

## Alun-alun: moderasi dan tautan

Label lembaga PM-15: bila penulis masuk lewat `/masuk`, label hanya dipasang bila ia pemilik nomor atau anggota aktif tepat satu akun instansi aktif; label tidak membawa id akun maupun nomor, dan akun yang diblokir tidak boleh menulis (`src/alun.js:98, 141`).

Kode dasar (`src/alun.js`): teks dibersihkan `bersihTeks` (kata kasar ditolak, tautan dan nomor HP dibuang). Lokasi dibulatkan dua desimal (sekitar 1 km). Batas laju: tulis 5 per jam dan 20 per hari, balas 20 per jam, suara 120 per jam, laporan 20 per jam, terjawab 30 per jam (`src/alun.js:29`). Ada plafon global 200 utas baru per jam, satu utas maksimal 300 balasan, dan sematan maksimal 5. Laporan dari 5 jaringan berbeda (`AMBANG_ADUAN = 5`) menyembunyikan konten secara otomatis, kecuali pengumuman, balasan petugas, dan utas butuh bantuan (itu hanya berstatus dilaporkan untuk ditinjau moderator). Aduan hanya dihitung dari manusia yang lolos Turnstile. Nama tampil yang memuat sebutan petugas atau instansi resmi ditolak. Teruskan ke relawan atau logistik membuat permintaan sungguhan lewat validasi modul tujuan, dan menandai utas `ditangani` bila masih `terbuka`.

Rancangan Alun-alun Terpadu (belum dikodekan, dari `data/kajian-bnpb/alun-terpadu/`): kabupaten baku dengan kode 4 digit di tabel samping `alun_wilayah`; kotak masuk per akun instansi di `/instansi`; balasan atas nama lembaga lewat `alun_lembaga`; status bantuan terbuka, ditangani, selesai dengan alasan baku dan riwayat append-only di `alun_riwayat`; tanda tidak valid di `alun_tanda`; sumber ketujuh Buku Besar Kejadian yang tidak pernah membuat kejadian atau mengubah fase; rekap oleh `scripts/siklus/alun_rekap.py` tanpa judul, nama, dan nomor. Semuanya HIPOTESIS rancangan; empat pertanyaan pemilik (Q1, Q2, Q11, Q12) menentukan siapa di luar pelaksana yang boleh melihat rekap.

## Dashboard pimpinan lintas bencana

`GET /api/pb/ringkas` (`src/pb_ringkas.js:51`). Per bencana: berkas statis `public/data/ringkas/<id>.json` apa adanya (status segar, basi, mati tetap tampil, angka null tetap null) ditambah hitungan operasi D1 yang murah, tiap angka berbentuk `{nilai, sumber, waktu}`: renlap terbit hari ini dan 30 hari, kepatuhan (kunjungan terhadap target, satu desimal), tindakan terbuka, SK berlaku, dan SK berakhir dalam 7 hari (`AMBANG_BERAKHIR = 7`, bawaan sementara). Hitungan D1 dicache isolate 5 menit dengan kunci hak, hari, dan wilayah. Tabel yang belum ada menghasilkan `null`, bukan nol. Angka antarsumber tidak dijumlahkan.
