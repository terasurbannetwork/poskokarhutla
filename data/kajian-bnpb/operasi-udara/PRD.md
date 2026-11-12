# PRD: Pantauan Operasi Udara

Tunduk pada `KEPUTUSAN-UDARA.md`. Fitur yang tidak tertulis di sini tidak dibuat.

## 1. Masalah

Pusdalops dan pimpinan BNPB mengendalikan 55 armada udara di 9 base tiap hari, tetapi layar hanya menjawab "berapa sortie".
Pertanyaan harian pimpinan belum terjawab dalam satu layar: armada mana yang belum lapor, apakah boleh terbang 3–6 jam ke depan,
cluster prioritas mana yang tidak terjangkau, seberapa cepat armada datang, apakah api benar padam, apakah renlap dipatuhi,
apakah pesawat aman dioperasikan, dan berapa sisa jam kontrak.

## 2. Pengguna

| Peran | Kebutuhan utama |
| ----- | --------------- |
| Pusdalops (koordalops udara) | siapa belum lapor, celah jangkauan, renlap lawan realisasi, unduh PDF/KML/GPX renlap |
| Pimpinan BNPB | ringkasan kesiapan, waktu respons, hasil padam, kepatuhan per operator, sisa kontrak |
| Satgas udara di base | renlap base sendiri dan berkas navigasinya |

Hak baca mengikuti `/api/operasi/peta` (staf berperan, moderator, akun gerbang). Angka biaya mengikuti Q7.

## 3. Fitur

| Kode | Kelompok | Fitur | Bergantung Q |
| ---- | -------- | ----- | ------------ |
| F-1 | Kesiapan | Jam laporan gelar armada masuk per base, tanda **telat** lewat batas waktu | Q1 |
| F-2 | Kesiapan | Riwayat tidak siap 7 hari per pesawat, tanda **rusak berulang** | Q2 |
| F-3 | Boleh terbang | Prakiraan cuaca 3–6 jam per base (jarak pandang, angin, hujan) | – |
| F-4 | Boleh terbang | Batas terang: matahari terbit dan terbenam per base, sisa jam terang | – |
| F-5 | Boleh terbang | Asap di base dan target renlap dari model CAMS (PM2.5, AOD), berlabel "model" | – |
| F-6 | Boleh terbang | NOTAM per bandara base | Q6 |
| F-7 | Pelaksanaan | **Celah jangkauan** dan **waktu respons** cluster: titik panas pertama sampai aksi armada pertama (respons butuh jam deteksi pertama yang disimpan mulai UD-05a) | Q10 |
| F-8 | Pelaksanaan | Liter air per jatuhan dan jarak ke sumber air terdekat | Q8, Q9 |
| F-9 | Pelaksanaan | Armada di luar base dan sinyal ADS-B hilang | – |
| F-10 | Hasil | **Api muncul lagi** dalam 72 jam sesudah water bombing | – |
| F-11 | Hasil | Luas terbakar sebelum dan sesudah aksi | Q11 |
| F-12 | Hasil | Rekap hasil per kabupaten | – |
| F-13 | Renlap | **Kepatuhan renlap** per base dan per operator (persen target didatangi) | – |
| F-14 | Renlap | Alasan target tidak didatangi (cuaca, armada tidak siap, di luar jangkauan, tanpa keterangan) | – |
| F-15 | Renlap | **PDF renlap** per base dan gabungan bisa diunduh dari layar | Q12 |
| F-16 | Keselamatan | Jam terbang per pesawat lawan jadwal inspeksi | Q3 |
| F-17 | Keselamatan | Jam kerja kru per hari per pesawat (tanpa nama) | Q4 |
| F-18 | Keselamatan | Laporan insiden dan nyaris celaka | Q5 |
| F-19 | Kontrak | Sisa jam kontrak dan perkiraan tanggal habis | Q7 |
| F-20 | Kontrak | Biaya per jam terbang dan per jatuhan | Q7 |
| F-21 | Kontrak | Hari siap tapi tidak terbang (biaya menganggur) per operator | Q7 |

Urutan pengerjaan ada di `TIKET.md`: yang datanya sudah ada dan tidak menunggu Q dikerjakan dulu (F-15, F-1, F-13, F-14, F-7, F-10, F-12, F-4, F-9, F-3, F-5, F-21).

## 4. Ukuran berhasil

- Pusdalops tahu base yang belum lapor sebelum 08.00 tanpa membuka WA.
- Tiap cluster prioritas punya status jangkauan dan waktu respons.
- Persen padam ≥ 24 jam tidak lagi menghitung api yang muncul lagi dalam 72 jam sebagai padam tanpa tanda.
- PDF, KML, dan GPX renlap tiap base bisa diunduh dari layar dalam satu klik.

## 5. Larangan

- Tidak menyimpan nama, NIK, atau nomor HP kru dan pilot.
- Tidak menampilkan angka bawaan sementara sebagai angka pasti.
- Tidak menulis "aman terbang". Kelayakan terbang adalah penanda dari METAR dan prakiraan; keputusan terbang tetap milik pilot dan operator.
- Tidak menjumlah angka antarsumber.
- Tidak menambah kueri D1 terjadwal tanpa menghitung kuota baca (memori `d1-kuota-baca`).

## 6. Isian manual (K12, 12 Nov 2026)

Tujuan: data yang biasanya masuk lewat bot WA tetap bisa diisi staf langsung di `/operasi` bila bot terlambat, pesan WA tidak terbaca, atau sumbernya memang tidak lewat WA (kontrak, personel darat).

| F | Data | Tempat simpan | Sekarang masuk lewat |
| - | ---- | ------------- | -------------------- |
| F-22 | Gelar armada harian per pesawat: status (siap, siaga, operasi, tidak siap) dan alasan | `op_armada_status` | bot WA |
| F-23 | Sortie: berangkat, kembali, batal, misi, lokasi, koordinat | `op_gerak` | bot WA |
| F-24 | Hasil water bombing: jatuhan, liter, laporan padam atau masih berasap | `op_gerak_hasil` (kolom `drops`, `liter`, `lapor`) | bot WA |
| F-25 | Temuan api pilot: koordinat, status (fs, berasap, berasap tipis, clear), luas klaim, lokasi | `op_temuan` | bot WA |
| F-26 | Data induk armada: tipe, peran, operator, pemilik, base, kapasitas bucket (menutup "armada tanpa tipe", "armada tanpa base") | `op_armada` | seed migrasi dan bot |
| F-27 | Kontrak armada (K19) | tabel baru `op_kontrak` | berkas statis `public/data/operasi/rekap_udara.json` |
| F-28 | Personel darat per provinsi, angka akumulasi (K16) | tabel baru `op_personel` | berkas statis `public/data/operasi_resmi.json` (per 12 Okt) |
| F-29 | Foto dokumentasi | tabel baru `op_foto_unggah` + R2 `operasi/foto/` | bot WA (`op_foto`) |
| F-30 | Modifikasi cuaca (OMC) | `omc_operasi`, sortie OMC | sudah ada formulir `/admin/omc` (`src/omc.js`); layar hanya menautkan, tidak membuat formulir kedua |
| F-31 | Riwayat isian: siapa, kapan, sebelum dan sesudah, alasan | tabel baru `op_isian_log` | – |

Tidak bisa diisi manual (larangan tetap): hotspot, firespot, luas terbakar, belum padam (hanya dari sistem kita), METAR (BMKG), posisi ADS-B, renlap dan targetnya (mesin `scripts/operasi/renlap.py`), status "didatangi" (dihitung dari aksi, F-23 yang mengubahnya).

Ukuran berhasil: tiap butir di kotak "Pembaruan data" dan tiap angka di Ringkasan yang berasal dari laporan bisa diperbaiki staf dalam satu dialog tanpa membuka WA atau D1.
