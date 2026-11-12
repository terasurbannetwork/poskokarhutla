# TIKET: Pantauan Operasi Udara (`UD-*`)

Kerjakan berurutan. Ambil satu tiket, kerjakan hanya cakupannya, buktikan dengan perintah di `RENCANA-UJI.md`, minta pemilik meninjau
di `http://localhost:8800/operasi`, baru tiket berikutnya. Tiket yang menunggu Q tidak dikerjakan sebelum Q dijawab.

| Tiket | Fitur | Cakupan | Pengerja → pemeriksa | Menunggu |
| ----- | ----- | ------- | -------------------- | -------- |
| UD-00 | Mesin uji | skrip `uji:operasi` di `package.json` dan masuk `npm run uji` | `mekanik-mesin` → `penulis-gerbang` | – |
| UD-01 | F-15 PDF renlap | rute unggah, baca, daftar (`src/operasi_udara.js`); unggah di bot (`scripts/wa/renlap_jam.mjs`); tombol PDF di layar | `warga-api` + `wa-bot` + `layar-peta` → `guard-api`, `security-reviewer` | Q12 (bawaan dipakai) |
| UD-02 | F-1 telat lapor | migrasi 0125 tabel `op_lapor_pertama`; `catatOperasi` min(); `/api/operasi/peta` kirim `pertama`; ubin dan saklar telat | `warga-api` + `layar-peta` → `migrasi-idempoten`, `selera-angka` | Q1 (bawaan dipakai) |
| UD-03 | F-2 rusak berulang | rute `status7`; strip 7 hari di kartu armada dan pop-up; saklar | `warga-api` + `layar-peta` → `inp-reviewer` | Q2 (bawaan dipakai) |
| UD-04 | F-13, F-14 kepatuhan dan alasan | fungsi murni alasan dan kepatuhan; alasan di kartu target; kartu kepatuhan per base dan operator | `layar-peta` → `selera-angka` | – |
| UD-05a | F-7 data | pipeline cluster menyimpan `pertama_utc` dan mempertahankannya antarputaran | `pipa-data` → `validasi-model` | – |
| UD-05b | F-7 celah dan respons | fungsi murni celah (bisa langsung) dan respons (cluster sesudah UD-05a); kartu Celah jangkauan dan Respons | `layar-peta` → `validasi-model`, `selera-angka` | Q10 (bawaan dipakai) |
| UD-06 | F-10 api muncul lagi | migrasi 0125 tabel `op_gerak_muncul`; kueri 24–72 jam baru; `src/operasi_hasil.js`; tampil di aksi, linimasa, persen padam bertahan | `warga-api` + `layar-peta` → `validasi-model` | – |
| UD-07 | F-4 batas terang | fungsi surya NOAA; label di baris base | `layar-peta` → `selera-angka` | – |
| UD-08 | F-12 hasil per kabupaten | kab per aksi (kab_kode temuan, kalau kosong desa terdekat `public/data/osm/desa.json`); kartu Hasil per kabupaten | `warga-api` + `layar-peta` → `selera-angka` | – |
| UD-09 | F-3, F-5 prakiraan (model) dan asap CAMS | `scripts/operasi/prakiraan_base.py` di `jarak_pandang.yml`; pita 6 jam; asap CAMS di target renlap | `pipa-data` + `mekanik-mesin` + `layar-peta` → `selera-angka` | – |
| UD-10 | F-9 di luar base, sinyal hilang | posisi ADS-B terakhir per armada di `/api/operasi/jejak`; penanda di kartu armada | `warga-api` + `layar-peta` → `inp-reviewer` | – |
| UD-11 | F-21 hari menganggur | dari kpi monitor; kolom di kartu Operator | `layar-peta` → `selera-angka` | biaya: Q7 |
| UD-18 | K9 pemilih periode | mode Hari/Minggu/Bulan/Rentang (≤ 31 hari, `/api/operasi/monitor` dari..sampai sudah ada) di `public/operasi_laporan.js`; kartu kegiatan dijumlah sepanjang periode, kartu keadaan per hari terakhir (Q13) | `layar-peta` → `inp-reviewer`, `selera-angka` | Q13 (bawaan dipakai) |
| UD-18b | K9 12 Bulan | rute rekap bulanan `/api/operasi/bulanan` (12 baris per bulan, satu kueri teragregasi, hemat kuota D1) | `warga-api` → `guard-api` | – |
| UD-19 | K10 cari dan ekspor | bilah cari (base, registrasi, operator, lokasi) menyaring baris tanpa render ulang; ekspor Excel (SheetJS sudah dipakai repo?) dan PDF cetak seksi tampil | `layar-peta` → `inp-reviewer`, `selera-angka` | Q15 (bawaan dipakai) |
| UD-20 | K11 tata letak seksi | deret tab seksi, kartu periode (UD-18) dan bilah cari (UD-19) di bawah Ringkasan, isi per seksi | `layar-peta` → `inp-reviewer` | Q14 (bawaan dipakai) |
| UD-21 | Model A kerangka | panel seksi kiri, kepala satu baris, tampilan Ringkasan dua kolom, hash per seksi (DESIGN-SYSTEM §7); menggantikan pil kategori UD-20 | `layar-peta` → `inp-reviewer`, `selera-angka` | – |
| UD-22 | Model A seksi | tiap seksi terbuka bawaan; lipatan hanya foto dan ADS-B; Operasi Darat memakai kerangka yang sama | `layar-peta` → `inp-reviewer` | – |
| UD-23 | Aksi dan temuan berdaftar | cari, saring base/misi/hasil, kelompok per hari, ekspor CSV (menutup sebagian UD-19) | `layar-peta` → `selera-angka` | – |
| UD-24 | Mode TV | `?tv=1`: sembunyikan kontrol, huruf besar, segar sendiri 5 menit | `layar-peta` | – |
| UD-12 | F-8 liter dan sumber air | liter perkiraan berlabel; sumber air terdekat | `warga-api` + `layar-peta` | Q8, Q9 |
| UD-13 | F-11 luas sebelum dan sesudah | luas cluster atau dNBR | `model-sebaran` → `validasi-model` | Q11 |
| UD-14 | F-6 NOTAM | sumber NOTAM per bandara base | – | Q6 |
| UD-15 | F-16, F-17 perawatan dan jam kru | masukan data perawatan dan jam terbang harian | – | Q3, Q4 |
| UD-16 | F-18 insiden | kanal laporan insiden dan hak bacanya | – | Q5 |
| UD-17 | F-19, F-20 sisa kontrak dan biaya | plafon jam dan tarif kontrak di balik sesi | – | Q7 |

## Sudah selesai sebelum paket ini (11 Nov 2026, dicatat supaya tidak dikerjakan ulang)

- Kolom Kode, label kelayakan berwarna dalam slot sejajar, base per pulau bisa dilipat, saringan pulau dan kondisi.
- Kartu armada berfoto, pop-up histori armada berlinimasa, dokumentasi dengan strip foto.
- Renlap per base bisa dilipat dengan progres didatangi, unduhan KML dan GPX.
- Tabel operator muat tanpa geser dengan bilah utilisasi.
- Feed METAR BMKG lewat bot Mac mini, antrean `jarak_pandang.yml` sendiri.
- Kartu peta operasi udara (K8).

| UD-25 | F-15 renlap siap cetak (pemilik 11 Nov 2026: "tiap hari ada icon renlap yang langsung dibuka ... sesuai bentuk ini" dengan contoh Renlap Merauke 30 Okt) | halaman `/renlap-cetak?base=&tgl=&versi=` (`public/renlap_cetak.*`) merender di peramban pola `scripts/operasi/renlap_pdf.py`: peta rute di citra Esri + urutan CP, tabel leg pilot, satu halaman per CP; cetak = simpan PDF. Tombol "Renlap" di kaki kartu Renlap tiap base. Tidak menggantikan UD-01 (PDF bot di R2) | selesai 11 Nov 2026 |

## Isian manual (K12, 12 Nov 2026)

Urutan: UD-26 → UD-27 → UD-30 → UD-31 → sisanya. Rute dulu, layar sesudah rutenya hijau. Migrasi produksi diterapkan pemilik.

| Tiket | Isi | Pengerja → pemeriksa | Menunggu |
| ----- | --- | -------------------- | -------- |
| UD-26 | Migrasi `0126_operasi_isian.sql` (DESAIN-TEKNIS §7.3), nomor diperiksa ulang | `warga-api` → `migrasi-idempoten` | – |
| UD-27 | `src/operasi_isian.js` (`PERAN_TULIS = ["pusdalops"]`, K14): rute gelar, sortie, hasil, temuan, hapus, riwayat; penjagaan bot di dalam pernyataan tulis `catatOperasi` dan SQL `isi_ulang_wa.mjs` (DESAIN-TEKNIS §7.4); semua pembaca `op_*` melewati butir terhapus (§7.3); uji integrasi RENCANA-UJI §4 | `warga-api` → `guard-api`, `security-reviewer` | – (K14, K15, K17) |
| UD-28 | Rute armada (data induk), kontrak, personel | `warga-api` → `guard-api` | – (K16, K19) |
| UD-29 | Rute unggah foto + rute baca berkas; galeri Dokumentasi membaca `op_foto` dan `op_foto_unggah` | `warga-api` → `security-reviewer` | – (K18: koordinat dan jam dari EXIF, wajib) |
| UD-30 | Layar: grup panel Isian, dialog bersama, tombol Isi di Pembaruan data dan Perlu tindakan | `layar-peta` → `inp-reviewer` | UD-27 |
| UD-31 | Formulir gelar armada per base (pil status, alasan wajib untuk tidak siap) | `layar-peta` → `inp-reviewer`, `selera-angka` | UD-30 |
| UD-32 | Formulir sortie, hasil water bombing, temuan api pilot (titik dari klik peta atau ketik koordinat) | `layar-peta` → `inp-reviewer` | UD-30 |
| UD-33 | Formulir armada, kontrak, personel; layar Kontrak dan personel darat membaca rute, berkas statis dicabut | `layar-peta` → `selera-angka` | UD-28 |
| UD-34 | Formulir unggah foto (seret dan lepas, beberapa berkas, pratinjau) | `layar-peta` → `inp-reviewer` | UD-29 |
| UD-35 | Pil manual, riwayat per butir, hapus lunak dari layar | `layar-peta` → `selera-angka` | UD-27 |
| UD-36 | OMC: tautan "Isi OMC" ke `/admin/omc` di grup Isian dan kartu Modifikasi cuaca, hanya untuk peran `tmc` (`src/omc.js` `PERAN_TULIS`) | `layar-peta` | – |
