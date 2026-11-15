# PRD: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md`. Fitur yang tidak tertulis di sini tidak dibuat. Kode dan bukti ada di `RISET.md`.

## 1. Masalah

Karhutla punya rantai penuh dari deteksi sampai pembuat dokumen, dan banjir menyusul. Tujuh bencana lain (longsor, pesisir, kualitas udara, kekeringan, cuaca ekstrem, gempa dan tsunami, gunung api) tertinggal. Pemilik meminta semuanya selengkap karhutla dan banjir (K1).

Akibat di lapangan hari ini:

- Operasi dan renlap hanya jalan untuk karhutla; renlap banjir berupa skrip CLI tanpa versi, penyimpanan, atau layar.
- Perubahan level gunung api, status kekeringan, dan PM2,5 tidak memicu peringatan tersambung (EWS dan CAP).
- Tidak ada pembuat sitrep, renops, atau laporan berkala yang bisa dipakai pimpinan untuk bencana selain karhutla dan banjir; perakit laporan berkala belum dibangun sama sekali.
- Tidak ada dashboard pimpinan dan tidak ada papan status darurat per wilayah.
- Model longsor dan cuaca belum lolos uji balik, tetapi angkanya sudah dekat dengan keputusan.

## 2. Pengguna

| Peran | Kebutuhan utama |
| --- | --- |
| Pusdalops dan staf berperan | buka operasi, susun renlap, terbitkan sitrep dan renops per bencana, pantau status darurat |
| BPBD (akun instansi) | operasi dan renlap untuk wilayah sendiri (Q3, bawaan sementara) |
| Pimpinan BNPB | satu dashboard lintas bencana dengan saringan jenis (Q2), laporan berkala, angka kesiapan |
| Pemilik sistem | hitungan ADA naik tanpa memundurkan karhutla dan banjir; tiap layar ditinjau di `http://localhost:8800` |
| Warga | peringatan dini tersambung untuk semua jenis dengan tangga tindakan |

## 3. Sasaran terukur per bencana

Sasaran dihitung dari audit 15 Nov 2026 atas 113 komponen. "Target ADA" = ADA + Sebagian + Belum = seluruh komponen yang berlaku; hitungan ini dihitung ulang oleh skrip pada tiket pertama karena K5 menambah komponen berlaku di gempa, cuaca, dan udara (G02, G03, G10).

| Bencana | ADA sekarang | Target ADA akhir F2 (Belum = 0) | Target ADA akhir F3 | Catatan |
| --- | --- | --- | --- | --- |
| Longsor | 33 | 45 | 108 | uji balik harus lolos sebelum angka dipakai keputusan (D6) |
| Pesisir | 37 | 61 | 109 | |
| Kualitas udara | 69 | 85 | 107 | |
| Kekeringan | 64 | 73 | 104 | pil hipotesis tetap sampai uji balik lolos |
| Cuaca ekstrem | 69 | 80 | 107 | |
| Gempa dan tsunami | 67 | 74 | 103 | |
| Gunung api | 78 | 86 | 107 | |
| Banjir | 75 | 79 | 110 | |

Aturan membaca: target akhir F2 = ADA sekarang + Belum sekarang (semua Belum menjadi ada atau sebagian; angka ini batas bawah, bukan janji); target akhir F3 = jumlah berlaku, dengan pengecualian A34 video (Q7 tidak dikerjakan, sehingga target nyata F3 dikurangi 1 per bencana) dan baris yang tertahan Q yang belum dijawab pemilik. Syarat lain yang berlaku untuk semua bencana:

| Ukuran | Nilai |
| --- | --- |
| Hitungan ADA karhutla dan banjir | tidak turun di tiket mana pun (generik tidak memundurkan modul matang, D4) |
| Gerbang dan uji | `npm run uji:agen`, `uji:warga`, dan uji per modul hijau di tiap tiket |
| G02, G03, G10 di gempa, cuaca, udara | ADA di akhir F2 (K5) |
| G08 laporan berkala | tiap bencana menyediakan angka yang dibutuhkan perakit; perakitnya paket `laporan-berkala` (D9) |
| G09 peringatan dini tersambung | ADA di gunung api, udara, kekeringan, pesisir di akhir F2 |
| B03 prospektif | tampil di layar semua bencana di akhir F3 |

## 4. Lingkup per alur kerja

Setiap fitur: kode F-n, bencana yang disentuh, peran pengguna, keluaran. "Semua" = delapan bencana D2 ditambah karhutla bila kolom menyebut karhutla. Kode komponen (G, A, B, C, E, F) merujuk `docs/multi-bencana/PAKET-FITUR.md` dan `PARITAS-2026-11-15.md`.

### W1 Operasi dan renlap generik (G01, G02, G03, G10, A22, A23)

| Kode | Fitur | Bencana | Peran | Keluaran |
| --- | --- | --- | --- | --- |
| F-1 | Operasi lapangan terbuka untuk semua jenis: penolakan selain karhutla di jalur operasi dilepas, kluster api tetap khusus karhutla | semua | Pusdalops, BPBD | operasi, status, dan riwayat per jenis di `/operasi` |
| F-2 | Jenis sarana dan sumber daya per bencana lewat registri (heli evakuasi, perahu, pompa, truk tangki, tenda, terpal, atap darurat, alat berat, masker) | semua | Pusdalops | daftar sarana, tampil di peta dan renlap |
| F-3 | Renlap generik berversi: target, sumber daya, rute, masa berlaku, tersimpan di R2 `operasi/renlap/`, layar, PDF, KML, GPX, teks WA | semua | Pusdalops, BPBD | berkas renlap per versi per jenis; `renlap_banjir.py` ditarik ke mesin satu |
| F-4 | Isian manual operasi non-karhutla oleh staf berperan dan akun instansi wilayah sendiri; aset udara gempa dan cuaca dari isian manual (Q3, Q4) | semua | Pusdalops, BPBD | catatan operasi berjejak, tanpa nama kru, tanpa biaya kontrak di `public/` (D8) |
| F-5 | Hasil tindakan dan kepatuhan renlap generik (target didatangi, alasan tidak, hasil) | semua | Pusdalops, pimpinan | persen kepatuhan dan hasil per jenis |
| F-6 | Alur tugas lapangan dan regu per jenis: daftar periksa dan jenis pesisir (alat berat longsor, SAR runtuhan gempa, barak gunung api, tangki kekeringan, masker udara) | longsor, pesisir, gempa, gunung api, kekeringan, udara | Pusdalops, regu | tugas dengan daftar periksa sesuai jenis |
| F-7 | Peta fasilitas sasaran satu per kabupaten: tempat evakuasi, faskes, sekolah, gudang, helipad, sumber air | semua | Pusdalops, BPBD | lapisan peta dan daftar untuk renlap |

### W2 Pembuat dokumen (G04, G08, G11, C19)

| Kode | Fitur | Bencana | Peran | Keluaran |
| --- | --- | --- | --- | --- |
| F-8 | Sitrep dari data per bencana: angka dari sistem, kalimat kebijakan ditulis staf | semua | Pusdalops | sitrep berversi, cetak A4 |
| F-9 | Renops dari data mengikuti kerangka Perka BNPB 24/2010 (isi lampiran [perlu cek]) | semua | Pusdalops | draf renops |
| F-10 | Laporan kejadian per KIB untuk jenis yang belum punya modul (longsor, pesisir, gunung api, gempa lengkap) di `laporan_kejadian.py` | longsor, pesisir, gunung api, gempa | Pusdalops | laporan per KIB |
| F-11 | Deck harian dan Penanganan per bencana lewat mesin deck yang ada dan bot WA | semua | Pusdalops, pimpinan | PPTX dan PDF di folder revisi (AGENTS.md 3.6) |
| F-12 | Renkon per bencana dipetakan ke `/siklus` | semua | Pusdalops, BPBD | renkon hidup; tanpa buku kejadian baru (D10) |
| F-13 | Penyedia angka ke laporan berkala Kepala BNPB per bencana (angka tersedia, kalimat kebijakan oleh staf) | semua | pimpinan | bagian laporan berkala; perakit dibangun di paket `laporan-berkala` |

### W3 Peringatan dini dan tangga tindakan (G09, G05)

| Kode | Fitur | Bencana | Peran | Keluaran |
| --- | --- | --- | --- | --- |
| F-14 | Aturan EWS dan CAP baru: kenaikan level gunung api, status kekeringan, PM2,5 dan asap, gelombang tinggi dan abrasi | gunung api, kekeringan, udara, pesisir | warga, Pusdalops | peringatan terpadu dengan label sumber |
| F-15 | Tangga tindakan per tingkat peringatan: checklist menyala otomatis saat tingkat berubah, dengan pelaksana dan batas waktu | semua | warga, Pusdalops, BPBD | entri `BENCANA` baru di `public/ews_tindakan.js` dan checklist di layar |
| F-16 | Pantau Dalops: jenis udara, gunung api, pesisir (cek kabar luar, saringan, tindak lanjut) | udara, gunung api, pesisir | Pusdalops | kartu dan saringan baru |
| F-17 | Ambang tangga dari naskah penerbit; sebelum dibaca, pakai ambang yang sudah ada di kode (Q9) | semua | Pusdalops | ambang tertulis dengan rujukan |

### W4 Dashboard pimpinan dan papan status darurat (C21, A30)

| Kode | Fitur | Bencana | Peran | Keluaran |
| --- | --- | --- | --- | --- |
| F-18 | Dashboard pimpinan lintas bencana dengan saringan jenis (Q2), model A utuh | semua | pimpinan | layar baru; masuk `LAYAR` dan `MODEL_A` di `tests/agen/gerbang-dasbor.test.mjs` |
| F-19 | Muatan ringkas per bencana untuk dashboard (A30) | semua | pimpinan | JSON ringkas per jenis |
| F-20 | Papan status darurat per wilayah: tingkat, nomor dan tanggal SK, masa berlaku, perpanjangan, hitung mundur; sumber `logbook_sk` (Q5) | semua | Pusdalops, pimpinan | papan dengan sinyal akan berakhir |

### W5 Keputusan ekonomi, pencegahan, prioritas (A24, A25, A14)

| Kode | Fitur | Bencana | Peran | Keluaran |
| --- | --- | --- | --- | --- |
| F-21 | Keputusan ekonomi: nilai paparan dan kebutuhan dalam rupiah bila koefisien bersumber (Q6); tanpa angka rupiah bila sumber tidak ada | semua | pimpinan | kartu ekonomi dengan sumber koefisien |
| F-22 | Pencegahan (preventif) per jenis: tindakan mitigasi dari daftar riset praktik | semua | BPBD | daftar tindakan per wilayah |
| F-23 | Prioritas wilayah per jenis (padanan A14 gunung api) | semua | Pusdalops, pimpinan | peringkat wilayah dengan rumus tertulis |

### W6 Bukti model (B01-B06, C16, C22)

| Kode | Fitur | Bencana | Peran | Keluaran |
| --- | --- | --- | --- | --- |
| F-24 | Perbaikan uji balik longsor (AUC lawan klimatologi) dan cuaca (hujan 50 mm ke atas) sebelum angkanya dipakai keputusan (D6) | longsor, cuaca | pemilik, validasi-model | laporan uji balik; pil hipotesis sampai lolos |
| F-25 | Prospektif berjalan dan tampil untuk semua (B03), termasuk gunung api dan kekeringan di `/prediksi` | semua | publik | kartu prospektif |
| F-26 | Kasus historis per bencana (B04) | semua | Pusdalops, publik | daftar kasus dari arsip kejadian |
| F-27 | Tren jangka panjang (B06) | longsor, cuaca, udara, kekeringan, gempa | publik | grafik tren interaktif dengan tooltip |
| F-28 | Galat dan pendorong model (B05), cerita (C16), metode (C22) | semua | publik | halaman metode dan cerita |

### W7 Data publik dan mesin mutu (A, E, F, C29, C32)

| Kode | Fitur | Bencana | Peran | Keluaran |
| --- | --- | --- | --- | --- |
| F-29 | Pasang data publik prioritas Tinggi berstatus Baru atau Sebagian (D7), satu skrip panen ber-`uji` dan satu langkah workflow per data | semua | mekanik-mesin | skrip dan jadwal; baris `DATA-PUBLIK.md` berubah jadi Dipakai |
| F-30 | Semua skrip ber-`uji` masuk CI; alarm data basi; perbaikan basi gempa, udara, pesisir | semua | mekanik-mesin | CI hijau; panel kesegaran |
| F-31 | i18n Inggris lengkap (E08, C29) sesudah F2 (Q8) | semua | publik | layar dan peringatan dua bahasa |
| F-32 | Mobile 375 px terukur ulang (C32) dan kredit serta lisensi data (F04) | semua | publik | laporan ukur dan halaman kredit |
| F-33 | Sisa temuan rusak audit yang masih ada sesudah grep ulang (RISET bagian 4): dummy tersisa, kepala kartu kalimat temuan di longsor, salinan nyasar; teks basi berita dan plafon ilmu agent sudah beres per 15 Nov | semua | pengerja pemilik | berkas bersih; gerbang hijau |

Jumlah: 33 fitur. Tiap fitur menjadi satu atau lebih tiket (TIKET.md, kode PB-*) dan menunggu paket dokumen lengkap (AGENTS.md 3.7).

## 5. Di luar lingkup

| Hal | Alasan |
| --- | --- |
| Video (A34) | Q7: tidak dikerjakan sampai pemilik memutuskan |
| Layar `/longsor` sendiri | Q1: tetap tab di `/banjir` dengan entri registri sendiri |
| Papan komando SKPDB (struktur komandan dan lima staf, notulen) dan gladi terjadwal berhasil terukur | diusulkan di riset praktik, tidak ada di keputusan K1-K10; ditanyakan ke pemilik bila diinginkan |
| Pembangun perakit laporan berkala | dibangun di paket `data/kajian-bnpb/laporan-berkala/`, bukan di sini (D9) |
| Buku kejadian baru | satu buku, `/siklus` (D10) |
| Model baru tanpa uji balik | D6 |
| Panen otomatis aset udara gempa dan cuaca | Q4: isian manual |
| Penarikan SK dari JDIH daerah | Q5: `logbook_sk` dulu |
| Perubahan pada gerbang, plafon, uji agar lolos | AGENTS.md bagian 9 |
| Deploy atau push dari subagent | AGENTS.md bagian 9 |

## 6. Larangan

Berlaku untuk semua tiket paket ini (dari aturan pemilik di `KEPUTUSAN-PARITAS.md` dan AGENTS.md):

1. Tidak ada data dummy dan tidak ada tombol 🧪 atau 🧹.
2. Kepala kartu berupa nama seksi, tanpa kalimat kesimpulan dan tanpa kaki sumber (AGENTS.md 3.5); layar dashboard memakai model A utuh dan masuk gerbang dasbor.
3. Tanpa huruf kapital dipaksa dan tanpa titik tengah sebagai pemisah; nama situs Centurisk97, tidak pernah "Pantau Bencana".
4. Angka antarsumber tidak dijumlah; angka karhutla hanya dari sistem; tidak pernah menulis "aman" tanpa pernyataan sumber resmi.
5. Nama kru atau relawan tidak disimpan di data operasi; biaya kontrak tidak masuk `public/`; D1 hanya lewat `src/hak.js` (D8).
6. Satu mesin per kemampuan (D1): tidak ada salinan per bencana.
7. Klik tidak membekukan layar (INP); tiap perilaku di luar TypeScript (trigger, constraint, route, fungsi SQL, alur lintas tabel) punya uji integrasi yang benar-benar menjalankannya, bukan mock.
8. Pertanyaan Q tidak dijawab dengan karangan; ambang dari [ingatan] tidak ditayangkan.
9. Hanya cabang main; tidak ada worktree; commit dengan path spesifik; subagent tidak commit dan tidak push.
10. Migrasi D1 diterapkan pemilik ke produksi; jangan mengasumsikan sudah jalan.

## 7. Fase dan urutan

| Fase | Isi | Syarat selesai |
| --- | --- | --- |
| F1 fondasi | W1 sampai W4 generik, dengan karhutla dan banjir sebagai pemakai pertama | hitungan ADA karhutla dan banjir tidak turun; uji generik hijau; tinjauan pemilik di `http://localhost:8800` |
| F2 pasang per bencana | menyalakan kemampuan F1 per bencana lewat `public/bencana.json` | Belum = 0 per bencana yang selesai |
| F3 lanjutan | W5, W6, W7 | target ADA akhir F3 pada bagian 3 |

Urutan bencana di F2 (D5), menurut celah audit terbesar: **longsor, pesisir, udara, kekeringan, cuaca, gempa dan tsunami, gunung api, banjir**. Alasan: celah audit terbesar didahulukan (komponen belum atau sebagian: longsor 75, pesisir 72, kekeringan 40, udara 38, cuaca 38, gempa 36, gunung api 29), dengan dua penyesuaian: udara sebelum kekeringan karena rantai asap yang sudah ada dan kemiripan W3, dan banjir (35) paling akhir karena ia sudah menjadi pemakai pertama pembuktian generik di F1 (D4). Urutan dikunci oleh D5 dan tidak diubah tanpa keputusan pemilik.

Pengerja per berkas mengikuti `node scripts/agents/ilmu.mjs pemilik <berkas>` (D11): `inti-layar` untuk `public/inti/**`, `warga-api` untuk `src/**` dan migrasi, pengerja bencana untuk `scripts/<id>/**` dan `public/<id>/**`, `mekanik-mesin` untuk workflow. Pemeriksa dari kolom "bisa" di `KATALOG.md`, bukan pengerja yang sama.

## 8. Ukuran keberhasilan

| Ukuran | Cara ukur | Ambang |
| --- | --- | --- |
| Hitungan ADA per bencana | skrip audit yang sama dijalankan ulang (bukan penilaian tangan) | mencapai target bagian 3 per fase |
| Tidak ada kemunduran karhutla dan banjir | hitungan ADA dan uji modulnya | tidak turun |
| Satu mesin | pencarian salinan per bencana untuk operasi, renlap, dokumen | nol salinan |
| Peringatan tersambung | uji integrasi EWS per jenis (`tests/warga/ews.test.mjs` pola) | tiap jenis baru punya uji yang menjalankan jalur sampai CAP |
| Kejujuran model | uji balik longsor dan cuaca lawan klimatologi | angka dipakai keputusan hanya bila lolos; lainnya berpil hipotesis |
| Dashboard | gerbang dasbor | layar baru lolos `gerbang-dasbor.test.mjs` |
| Tinjauan pemilik | tautan `http://localhost:8800/<halaman>` di laporan tiap tiket layar | disetujui pemilik |
| Data publik | baris `DATA-PUBLIK.md` | tiap data terpasang berstatus Dipakai dan berskrip ber-`uji` |
