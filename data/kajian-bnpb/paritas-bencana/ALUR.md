# ALUR: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md`, lingkup di `PRD.md`, rumus di `ALGORITMA.md`. Alur ujung ke ujung per peran dan per bencana. Kode F-n merujuk `PRD.md` bagian 4. Jam dalam WIB. Bencana yang dimaksud: banjir (termasuk rob), longsor, pesisir dan abrasi, cuaca ekstrem, kualitas udara dan asap, gempa dan tsunami, gunung api, kekeringan; karhutla acuan.

## 1. Rantai satu kejadian (berlaku sama untuk semua bencana)

Satu rantai, satu mesin (D1). Perbedaan antarbencana hanya pada pemicu, isi tangga tindakan, jenis sarana, dan kolom angka sitrep; semuanya dibaca dari registri `public/bencana.json` dan tabel ambang di `ALGORITMA.md`, bukan dari percabangan per bencana.

| Langkah | Kejadian | Mesin yang berjalan | Keluaran yang terlihat | Fitur |
| --- | --- | --- | --- | --- |
| 1. Peringatan masuk | Sumber resmi atau model menaikkan tingkat satu wilayah (BMKG, PVMBG/MAGMA, status model banjir, longsor, kekeringan, ISPU) | `src/ews.js` (`nilaiTitik`, cron gempa tiap menit), `src/peringatan.js` (`aturanGempa` dan aturan lain) menulis baris `peringatan` | peringatan terpadu di `/peringatan`, email, push, CAP, kartu di Pantau Dalops | F-14 |
| 2. Tangga tindakan menyala | Tingkat berubah atau baru muncul | `tindakanUntuk(bencana, tingkat)` di `public/ews_tindakan.js` memberi daftar tindakan; checklist per wilayah dibuat dengan pelaksana dan batas waktu | checklist di layar warga dan di meja Pusdalops | F-15 |
| 3. Konfirmasi dan rapat | Pusdalops memeriksa kabar luar dan fakta lapangan | `scripts/data/dalops_kabar.py`, `src/dalops_tindak.js` | label kabar, log tindak lanjut append-only | F-16 |
| 4. Saran status | Tingkat melewati ambang saran | `scripts/umum/saran_status.py` menulis `public/data/saran_status.json` | saran Siaga Darurat atau Tanggap Darurat, bukan penetapan | F-20 |
| 5. Operasi dibuka | Staf atau BPBD membuka operasi untuk wilayah dan jenis | rute operasi generik (`src/operasi_lapangan.js`, tugas di `src/penugasan.js`) | operasi di `/operasi` seksi jenis itu | F-1, F-6 |
| 6. Renlap dibuat | Mesin renlap memberi target, sumber daya, rute, masa berlaku | `scripts/umum/renlap.py` (satu mesin, DESAIN-TEKNIS), simpan versi di R2 `operasi/renlap/` | renlap berversi, PDF, KML, GPX, teks WA | F-3 |
| 7. Isian dan hasil | Regu mengisi hasil; staf mengisi manual bila sumber tidak ada | `src/operasi_isian.js`, `src/operasi_hasil.js` | persen kepatuhan dan hasil per jenis | F-4, F-5 |
| 8. Dokumen dirakit | Sitrep, renops, laporan per KIB, deck | `scripts/umum/laporan_kejadian.py`, mesin deck, bot WA | berkas versi beku, cetak A4 | F-8 sampai F-11 |
| 9. Status darurat | SK diisi staf ke `logbook_sk` | `src/logbook.js`, papan status | papan per wilayah dengan hitung mundur | F-20 |
| 10. Penutupan | Tidak ada lagi sinyal aktif dan staf menutup kejadian | `src/logbook.js` menutup; Buku Besar Kejadian `/siklus` | kejadian berstatus selesai, arsip | F-12 |
| 11. Pasca | Jitupasna, R3P, kasus historis, penilaian model | `/siklus`, `scripts/prediksi/nilai.py`, arsip kejadian | kasus historis, kartu prospektif | F-12, F-25, F-26 |

Aturan lintas langkah:

1. Satu buku kejadian: Buku Besar Kejadian `/siklus`. Kejadian per bencana dipetakan ke sana, tidak membuat buku baru (D10).
2. Angka antarsumber tidak dijumlah; angka karhutla hanya dari sistem; label "belum diperbarui" dipakai bila sumber basi, tidak pernah "aman" (`sumberBasi` di `src/ews.js`).
3. Tiap langkah yang menulis ke D1 lewat `src/hak.js`; peran dicek di sana (D8).
4. Nama kru dan relawan tidak disimpan di data operasi; biaya kontrak tidak masuk `public/`.
5. Langkah 5 sampai 7 tidak otomatis: operasi tidak pernah dibuka oleh peringatan sendiri. Peringatan hanya menawarkan "buka operasi" ke staf.

## 2. Alur per peran

### 2.1 Staf Pusdalops (`stafPeran`)

1. Buka `/operasi`. Pilih jenis bencana di saringan (satu layar, saringan jenis, Q2 bawaan).
2. Lihat ubin ringkasan jenis itu: wilayah bertingkat Siaga ke atas, operasi aktif, renlap yang akan kedaluwarsa, sumber basi.
3. Buka kartu Peringatan: tiap baris memuat wilayah, tingkat, label sumber (resmi atau hitungan model), dan checklist tangga tindakan. Centang pelaksanaan; tiap centang menulis log (siapa peran, kapan), tanpa nama kru.
4. Bila perlu, tekan "buka operasi" pada wilayah. Isi: jenis, wilayah, tujuan, masa berlaku. Sistem membuat tugas di `src/penugasan.js` dengan daftar periksa sesuai jenis (F-6).
5. Mesin renlap menyusun target dan sumber daya; staf memeriksa, mengubah bobot yang berpil hipotesis hanya lewat berkas bobot, lalu menerbitkan versi. Versi lama tidak ditimpa.
6. Isi isian manual (F-4) bila sumber tidak ada: aset udara gempa atau cuaca (Q4), hasil regu, posko. Tiap isian berjejak dan bisa dikoreksi, tidak dihapus keras.
7. Buka Pembuat dokumen: pilih jenis dokumen (sitrep, renops, laporan KIB, deck) dan periode. Angka terisi dari sistem; kalimat kebijakan ditulis staf. Terbitkan sebagai versi beku.
8. Isi SK status darurat di papan (F-20). Papan menghitung mundur dan menandai "akan berakhir" sebelum tmt selesai.
9. Tutup operasi lalu kejadian; kejadian masuk arsip dan kasus historis.

Keadaan kosong dan galat: tanpa operasi aktif, layar menulis "belum ada operasi untuk jenis ini" dengan tombol buka; sumber basi menampilkan "data belum diperbarui" per sumber; migrasi D1 belum diterapkan (`no such table`) dibalas kosong dengan catatan, bukan galat 500 (pola `tanpaTabel` di `src/operasi_hasil.js:15`).

### 2.2 BPBD lewat akun instansi (Q3 bawaan)

1. Masuk sebagai akun instansi; akun terikat wilayah (provinsi atau kabupaten) lewat `src/instansi.js`.
2. Hanya melihat dan menulis operasi, renlap, dan isian untuk wilayah sendiri. Wilayah lain hanya terbaca ringkas untuk koordinasi.
3. Tidak dapat menerbitkan sitrep tingkat nasional dan tidak dapat mengisi SK provinsi bila akunnya kabupaten.
4. Peringatan untuk wilayahnya muncul di beranda akun dengan checklist tangga tindakan bagian BPBD.
5. Usulan dari BPBD (target, sarana) berstatus draf sampai staf Pusdalops menerbitkan, bila operasi lintas wilayah.

Hak tulis dipertegas di `src/operasi_isian.js:12` (`PERAN_TULIS`, hari ini hanya `pusdalops`); perubahan itu satu tiket hak akses yang menahan W1 (Q3).

### 2.3 Pimpinan BNPB

1. Buka dashboard pimpinan (F-18, model A). Satu layar lintas bencana dengan saringan jenis (Q2 bawaan).
2. Ubin atas: wilayah Siaga ke atas per jenis, operasi aktif, kepatuhan renlap, SK yang akan berakhir, sumber basi.
3. Kartu per jenis dibuka dari ubin; kepala kartu nama seksi, tanpa kalimat kesimpulan (AGENTS.md 3.5).
4. Buka laporan berkala: angka per bencana tersedia dari muatan ringkas (F-13, F-19), kalimat kebijakan ditulis staf; perakit dibangun di paket `laporan-berkala` (D9).
5. Tidak ada tombol menulis di dashboard; tindak lanjut dilakukan staf.

### 2.4 Publik

1. Buka `/peringatan` atau layar bencana; masukkan lokasi atau izinkan lokasi.
2. Melihat peringatan terpadu untuk lokasi: bencana, tingkat, label sumber, hari (hari ini, besok, lusa), dan tangga tindakan warga dari `public/ews_tindakan.js`.
3. Berlangganan email (konfirmasi dua langkah), push, atau CAP; peringatan baru hanya terkirim saat tingkat naik atau jenis baru (`src/ews.js`, `src/berantai.js`).
4. Bila sumber basi, layar menulis "data belum diperbarui", tidak pernah "aman".
5. Peringatan bersumber model yang belum lolos uji balik membawa pil hipotesis dan tidak dikirim lewat email, push, dan CAP (ALGORITMA bagian 2.5).

## 3. Alur per bencana

Tiap tabel mengikuti rantai bagian 1. Kolom "pemicu" adalah sumber yang dipakai ulang atau dibangun; angka ambang ada di `ALGORITMA.md`. "Ada" berarti sudah ada di kode pada 15 Nov 2026, "baru" berarti dibangun di paket ini.

### 3.1 Longsor (urutan F2 pertama, D5)

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | status longsor per kecamatan dari `public/banjir/data/status.json` (kunci `l`) masuk `nilaiTitik` | ada (`src/ews.js` baris banjir dan longsor) |
| Tangga tindakan | kamus `longsor` di `public/ews_tindakan.js`; checklist per kecamatan, pelaksana BPBD dan camat | tangga warga ada, checklist per wilayah baru |
| Operasi | alat berat, SAR timbunan, evakuasi; daftar periksa jenis longsor di `src/penugasan.js` | daftar periksa baru |
| Renlap | target lereng kritis dan jalur, sumber daya alat berat dan regu SAR, masa berlaku 14 hari seperti `RENLAP_BERLAKU_MS` | baru, lewat mesin renlap tunggal |
| Dokumen | laporan KIB longsor di `laporan_kejadian.py` (modul baru), sitrep, renops | baru |
| Status darurat | SK dari `logbook_sk`; saran dari `saran_status.py` `sinyal_longsor` | saran ada |
| Penutupan dan pasca | zona merah menunggu rekomendasi Badan Geologi; kejadian ke `/siklus`; uji balik longsor harus lolos sebelum angka dipakai keputusan (D6) | uji balik baru |

### 3.2 Pesisir dan abrasi

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | gelombang tinggi BMKG, rob (`rob.json`), abrasi (`scripts/pesisir/abrasi.py`); rob sudah di `src/ews.js` | gelombang dan abrasi baru |
| Tangga tindakan | kamus `rob` ada; kamus `pesisir` baru (nelayan, pelabuhan, sempadan) | baru |
| Operasi | `src/instansi.js:335` `bencanaPer` ditambah jenis pesisir; perahu, alat berat, relokasi | baru |
| Renlap | target transek kritis dan rumah terancam; sarana perahu | baru |
| Dokumen | laporan KIB pesisir (modul baru); logbook sudah punya jenis gelombang pasang | modul baru |
| Pasca | status mangrove dan pemecah gelombang; kasus historis dari DIBI; jadwal `abrasi.py` diverifikasi jalan | baru |

### 3.3 Kualitas udara dan asap

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | PM2,5 rata-rata 24 jam menurut ISPU (`scripts/udara/kualitas.py` `BATAS`), prakiraan CAMS; sumber ISPU KLHK tidak terjangkau dari CI, bawaan Q24: PM2,5 BMKG dan OpenAQ dengan label sumber | aturan EWS dan CAP baru, jenis `udara` |
| Tangga tindakan | kamus `udara` baru: masker, ruang bebas asap, sekolah kurangi kegiatan luar ruang (selaras `aturan.json` id `asap`) | baru |
| Operasi | distribusi masker dan ruang udara bersih (K5); sarana masker dan pembersih udara | baru |
| Renlap | target kecamatan berpopulasi rentan dan sekolah dari `scripts/udara/dampak_udara.py`; titik distribusi | baru |
| Dokumen | modul `udara` di `laporan_kejadian.py` ada; sitrep dan renops baru | sebagian |
| Pasca | ISPA terhubung ke ISPU; kasus historis; tren jangka panjang (F-27) | baru |

### 3.4 Kekeringan

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | `public/data/kekeringan_wilayah.json` (`lv` per kabupaten, SPI-3 dan kelembapan tanah); ambang masih hipotesis | aturan EWS baru berpil hipotesis |
| Tangga tindakan | kamus `kekeringan` baru: air bersih, tangki, pangan, peringatan puso; tindakan resmi memakai status dari penetapan kepala daerah | baru |
| Operasi | jadwal tangki air dan embung (`scripts/kekeringan/embung.py`); tugas kekeringan ada di `scripts/umum/tugas.py` | sebagian |
| Renlap | target desa tanpa air, sumber air, rute tangki | baru |
| Dokumen | modul `kekeringan` di `laporan_kejadian.py` ada (potret hari ini, tanpa arsip harian) | sebagian |
| Pasca | hindcast `scripts/kekeringan/hindcast.py`; pil hipotesis dilepas hanya bila uji balik lolos | ada |

### 3.5 Cuaca ekstrem

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | poligon nowcast BMKG diteruskan; tingkat dari CAP `severity` (`CUACA_TINGKAT` di `src/ews.js`) | ada |
| Tangga tindakan | kamus `cuaca` ada; checklist per wilayah baru | sebagian |
| Operasi | distribusi terpal dan atap darurat, pembersihan jalan (K5) | baru |
| Renlap | target rumah rusak dan ruas jalan tertutup pohon; sarana gergaji, alat berat | baru |
| Dokumen | modul `cuaca` ada; sitrep dan renops baru | sebagian |
| Pasca | uji balik hujan 50 mm ke atas diperbaiki (F-24) sebelum angka dipakai keputusan | baru |

### 3.6 Gempa dan tsunami

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | cron tiap menit; `aturanGempa` menulis `gempa` (Waspada, Siaga) dan `tsunami` (Awas) | ada |
| Tangga tindakan | kamus `gempa` dan `tsunami` ada (tsunami tanpa tingkat 1); checklist per wilayah dengan pelaksana baru | sebagian |
| Operasi | SAR runtuhan, evakuasi, tenda, air (K5); alur tugas gempa ada di `src/penugasan.js:42-47` | sebagian |
| Renlap | target bangunan runtuh dan titik pengungsian; sarana tenda dan alat berat | baru |
| Dokumen | laporan KIB gempa lengkap (F-10); sitrep dan renops | baru |
| Status darurat | gempa dan tsunami tidak pernah diberi saran Siaga (`saran_status.py`: mendadak, hal. 7 pedoman) | aturan ada |
| Pasca | Jitupasna ke R3P di `/siklus`; paparan bangunan (`scripts/umum/paparan_bangunan.py`) | ada |

### 3.7 Gunung api

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | kenaikan level PVMBG (Normal, Waspada, Siaga, Awas) dari `scripts/gunungapi/riwayat_level.py` menaikkan baris `peringatan`; hari ini tidak memicu EWS | aturan EWS dan CAP baru, jenis `gunungapi` |
| Tangga tindakan | rekomendasi PVMBG per level sebagai checklist; barak per KRB | baru |
| Operasi | barak, evakuasi per KRB, sarana masker, truk; dalops tanpa gunung api dibetulkan (`dalops_kabar.py:23`) | baru |
| Renlap | target desa dalam KRB dan jalur evakuasi; `pop_grid.py` 39 gunung harus terjadwal | baru |
| Dokumen | laporan KIB gunung api (F-10); VONA dan abu dirujuk, bukan disalin | baru |
| Pasca | lahar hujan, relokasi; kasus historis | sebagian |

### 3.8 Banjir dan rob (pemakai pertama F1, D4)

| Langkah | Alur | Status |
| --- | --- | --- |
| Peringatan | status per kecamatan, rob per titik pesisir; tangga status Normal sampai Awas dari `scripts/banjir/status.py` | ada |
| Operasi dan renlap | `scripts/operasi/renlap_banjir.py` (CLI) ditarik ke mesin renlap tunggal: versi, R2, layar | baru |
| Dokumen | modul `banjir` di `laporan_kejadian.py` ada; deck Penanganan banjir ada | sebagian |
| Laporan berkala | G08 menunggu perakit paket `laporan-berkala` | menunggu |
| Pasca | `validasi.json` basi dibetulkan; peringatan WA banjir menunggu `PENERIMA_PERINGATAN_BANJIR` diisi pemilik | pemilik |

### 3.9 Karhutla (acuan, ikut menerima G08)

Alur karhutla tidak berubah. Ia menjadi bukti generik tidak memundurkan modul matang (D4): hitungan ADA tidak turun, `src/operasi_lapangan.js:163` tetap menolak kluster api untuk selain karhutla, dan G08 laporan berkala ikut disediakan angkanya.

## 4. Alur data publik dan mesin mutu (W7)

1. Tiap data publik prioritas Tinggi berstatus Baru atau Sebagian (D7) mendapat satu skrip panen ber-`uji` dan satu langkah workflow.
2. Skrip menulis ke `public/data/<modul>/`; di akhir, `scripts/umum/jaring.py` pola dipakai ulang bila perlu jaringan.
3. Alarm data basi memeriksa umur berkas terhadap batas per sumber (ALGORITMA bagian 7); status basi tampil di panel kesegaran dan di `sumberBasi`.
4. Baris `docs/multi-bencana/DATA-PUBLIK.md` berubah menjadi Dipakai hanya bila skrip, uji, dan jadwal ada.
5. Hitung ulang paritas berjalan otomatis (ALGORITMA bagian 8) dan hasilnya menggantikan tabel audit tangan.

## 5. Tinjauan pemilik

Tiap tiket layar menutup laporannya dengan tautan `http://localhost:8800/<halaman>` (AGENTS.md 3.8). Pemilik masuk sendiri lewat `/admin/masuk` di localhost; Claude tidak mengetik login. Tulisan lewat server tinjau mengenai produksi, jadi tinjauan layar tulis dilakukan pemilik sendiri; uji tulis otomatis berjalan di D1 lokal uji, tanpa data dummy di produksi.

## Pertanyaan untuk KEPUTUSAN

> Catatan orkestrator 15 Nov 2026: pertanyaan di bagian ini sudah dipindah ke KEPUTUSAN-PARITAS.md (Q1 sampai Q37) dan dinomori ulang di sana. Bila isi atau bawaan berbeda, KEPUTUSAN yang berlaku. Untuk rute layar baru berlaku Q13 (papan status darurat dilebur ke `siaga.html`, pembuat dokumen di `/bnpb/sitrep`, dashboard pimpinan `/bnpb/pimpinan`); panel kiri berlaku D12.
