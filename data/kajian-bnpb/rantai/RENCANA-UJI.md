# RENCANA-UJI

Prinsip (TEST.md): perilaku di luar TypeScript/JS (trigger, constraint, CHECK, urutan migrasi, rute) diuji dengan D1 sungguhan lewat Miniflare seperti `tests/warga/meja.test.mjs`, bukan mock. Fungsi murni diuji tanpa DB. Mock tidak diterima sebagai bukti untuk trigger atau hak.

## 1. Perintah bukti

| Perintah | Membuktikan |
| --- | --- |
| `node --test tests/bnpb/rantai_murni.test.mjs` | ALGORITMA §1 dan §2 murni (contoh angka di bawah) |
| `node --test --test-concurrency=1 tests/warga/rantai.test.mjs` | migrasi, trigger, rute, hak, dummy dengan D1 sungguhan |
| `node --test --test-concurrency=1 tests/warga/meja.test.mjs` | spek meja dan CHECK/trigger tetap sama (dua meja SPM) |
| `npm run uji:agen` | `gerbang-jam-aturan`, `gerbang-d1`, `gerbang-paket-modul`, `gerbang-dummy`, kembaran JSON/JS |
| `npm run uji:warga` | seluruh suite Worker |
| `npm run uji:layar` | layar ruang BNPB |

## 2. Kriteria terima per fitur

### Rantai
1. Tautkan catatan dengan KIB sah satu kabupaten: 200, baris `rantai_tautan` ada, jejak ada.
2. KIB tidak ada, KIB wilayah lain, dan KIB berbeda kabupaten dengan catatan: ketiganya 404 dengan badan sama.
3. Catatan `pengaduan`: ditolak di rute dan di D1 (INSERT langsung ke `rantai_tautan` melanggar trigger).
4. Dua tautan untuk satu catatan: yang kedua menimpa lewat rute, melanggar PRIMARY KEY bila INSERT langsung.
5. Contoh murni ALGORITMA §1 (kaji 24 jam: `umur_macet_hari` 0 dan 2) hijau.
6. Jalur ditandai `tidak_berlaku` tidak pernah macet; pulihkan mengembalikan penilaian.
7. Petugas kabupaten A tidak melihat KIB kabupaten B di daftar, detail, maupun saran.
8. Kejadian tanpa KIB: layar menulis alasan, tidak ada baris tebakan.
9. Daftar 60 kejadian dengan paginasi 25: halaman kedua dan ketiga benar; urutan macet pasal sebelum mandek.
10. Pernyataan D1 per `GET /api/rantai/daftar` paling banyak 3; per detail paling banyak 10.

### Kalender
1. Kunci baru lolos `gerbang-jam-aturan` (acuan BERLAKU, kutipan ada di halaman).
2. Contoh ALGORITMA §2: SPPH 2026-01-31 tahap I jatuh tempo 2026-05-15; akhir pelaksanaan 2026-12-31 memberi 2027-03-01, 2027-04-30, 2027-05-03; RPBD 2026-02-28 memberi 2028-02-28; pelatihan Jumat 2026-11-06 memberi 2026-11-17.
3. `hibah_setor` berstatus `periksa` setelah lewat, `terpenuhi` setelah ditandai dengan keterangan; tidak pernah dihitung `lewat` sebelum dikonfirmasi.
4. Baris tanpa jangkar berstatus `tanpa_jangkar`, bukan galat.
5. Satu jangkar dobel (kunci, kabupaten, rujukan sama): ditolak UNIQUE.
6. `kw_penuhi` bertanggal masa depan: ditolak trigger.
7. Kalender menampilkan label asumsi untuk `jam_dekat_hari` dan untuk `hari_kerja` selama `libur_nasional` kosong.
8. Tanpa sesi: 401 atau 303; tidak ada rute publik.

### Rapor SPM
1. Contoh ALGORITMA §3: enam operasi memberi n = 6, memenuhi = 4, persen 67, median 22,5; empat operasi memberi "3 dari 4" tanpa persen.
2. Urutan cap waktu salah (`t_siap` sebelum `t_lapor`) ditolak; selisih lebih dari 7 hari ditolak.
3. Tempuh menampilkan dua deret (semua, dan `hambatan = tidak`).
4. Laporan akhir 15 hari setelah penghentian terhitung terlambat; 14 hari tidak.
5. Juklak 4 dan 5 memuat `ada_angka: false`.
6. Skor komposit `gabungSkor` dan `RAPOR.bobot` tidak berubah (uji regresi nilai lama).
7. `/api/meja/rapor/publik` tidak memuat kunci `spm`.
8. Dua meja baru muncul di `spekPublik`, dalam CHECK `meja_catatan`, dan dalam trigger `meja_petugas_sah`; `meja.test.mjs` hijau.

### Tampilan dan klik
- Dummy: dua ikon, hanya Super Admin, isi sesuai halaman; `gerbang-dummy` dan `05-dummy-jejak.sql` hijau; layar kosong tanpa dummy menulis penyebabnya.
- INP: memilih baris kejadian, tab, filter, dan paginasi tidak membekukan layar; `inp-reviewer` dan `inp-sweep` tanpa temuan.
- `selera-angka` tanpa temuan pada kartu rantai, kalender, SPM (format Indonesia, satuan, sumber disebut, n kecil).
- Kartu memakai `.ex.ex-std`; `gerbang-kartu-std` hijau setelah dua layar baru masuk daftar `LAYAR`.

## 3. Pembukuan D1

Uji integrasi menghitung jumlah pernyataan D1 per rute dengan pembungkus `env.DB` dan menegaskan batas di §2. Batas ini menjaga kuota baca harian (DESAIN-TEKNIS §6).

## 4. Yang tidak diuji

Isi laporan hibah (tetap di E-Pelaporan BNPB), tanda tangan elektronik, dan penarikan data peraturan otomatis tidak ada di lingkup. Pembuktian di produksi menunggu pemilik menerapkan migrasi (RT-14).
