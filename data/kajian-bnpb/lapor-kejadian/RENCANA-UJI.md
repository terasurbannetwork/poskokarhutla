# RENCANA-UJI: Kejadian dari Laporan Warga

Aturan pemilik: tiap perilaku di luar TypeScript atau JS murni (tabel D1, indeks, rute Worker, `pasang.py`) wajib punya uji
integrasi yang benar-benar menjalankannya; mock meloloskan kelas bug paling mahal (`~/.claude/TEST.md`, gerbang
`gerbang-test-integrasi`, registri `tests/e2e/cakupan.json`). Baca `~/.claude/TEST.md` sebelum LK-03 dan seterusnya.

## 1. Bagian uji

| Bagian | Menguji | Jenis | Letak (usulan) | Perintah bukti |
| --- | --- | --- | --- | --- |
| U1 | Aturan satu desa (A1) | fungsi murni, node:test | `tests/lapor/gugus_desa.test.mjs` | `node --test tests/lapor/gugus_desa.test.mjs` |
| U2 | `terverifikasiBpbd` (A3) | fungsi murni | `tests/lapor/verifikasi_bpbd.test.mjs` | idem |
| U3 | `kartuPublik` daftar putih dan tanpa bocor | fungsi murni plus gerbang | `tests/lapor/kartu_publik.test.mjs` | idem |
| U4 | Migrasi tabel baru idempoten, append-only | SQL nyata (D1 lokal atau SQLite) | `tests/lapor/lk_migrasi.test.mjs` | pola `tests/lapor/lanjut_migrasi.test.mjs` |
| U5 | Rute `hari-ini`, `tarik`, `usulkan` | rute Worker dengan D1 nyata | `tests/lapor/rute_kejadian.test.mjs` | `npm run uji:warga` |
| U6 | `pasang.py` sumber `lapor_ai` dan `usulan_staf` | self-check Python | blok uji `pasang.py` | `python3 -I scripts/siklus/pasang.py uji` |
| U7 | Alur ujung ke ujung: laporan, kelompok, cek BPBD, tayang, tarik, usul, pasang | integrasi lintas tabel dan proses | `tests/e2e/lapor_kejadian.test.mjs` terdaftar di `tests/e2e/cakupan.json` | `npm run uji:e2e` bila ada; bila belum, perintah yang ditulis di tiket |
| U8 | Layar publik | peramban pratinjau 1440 dan 390 | pemeriksaan layar LK-06 | tangkapan di `http://localhost:8800/lapor/hari-ini` |
| U9 | Beban baca D1 | uji beban | `tests/beban/` | angka baris terbaca per permintaan |
| U10 | Gerbang token warna dan kartu standar | gerbang yang ada | `tests/agen/gerbang-token-warna.test.mjs`, `gerbang-kartu-std.test.mjs`, `gerbang-tanpa-kesimpulan.test.mjs` | `npm run uji:agen` |

Fixture uji hanya berada di berkas uji, tidak masuk produk, tanpa data dummy di layar (aturan pemilik 11 Nov 2026).

## 2. Kasus per bagian

### U1 aturan satu desa
1. Dua nomor berbeda, jenis banjir, desa sama, selisih 10 jam, jarak 8 km: tersambung (aturan desa), satu gugus, `n_pelapor` 2.
2. Sama tetapi selisih 30 jam: tidak tersambung.
3. Desa berbeda, jarak 2 km, selisih 3 jam: tersambung oleh radius lama (tidak berubah).
4. Satu nomor melapor tiga kali di desa sama: tidak ada gugus, hitungan pelapor 1.
5. Rantai 80 jam di satu desa: dipotong di celah terbesar menjadi dua kejadian laporan.
6. Laporan `tidak_valid` tidak ikut menyambung.
7. Kekeringan dan abrasi tidak dihitung.
8. Jenis mode luas (gempa) tidak berubah.
9. Emas: masukan tanpa desa sama di luar jendela lama menghasilkan keluaran identik dengan versi sebelum perubahan (gugus, label, kode `GL-`).
10. Kode desa kosong pada salah satu: aturan desa tidak berlaku.

### U2 terverifikasi
Lima syarat satu per satu dibalik menjadi salah; kasus pengecekan Valid lalu Tidak valid (terakhir menang); `sebagian` salah; pemeriksa staf BNPB salah; `bpbd_klaim` salah; pemeriksa BPBD wilayah lain salah; versi laporan lebih baru dari pengecekan salah; tarikan aktif salah; tarikan dicabut benar; waktu sama maka `id` terbesar menang.

### U3 kartu publik
Laporan dengan semua kolom berisi penanda unik: tidak ada penanda di `JSON.stringify(kartu)`; kolom baru di baris D1 tidak muncul; satu pelapor: `nWarga` tidak ada dan waktu dibulatkan ke jam; dua pelapor: `nWarga` 2; rentang dampak benar (min dan maks), tidak dijumlah; angka kosong tidak pernah menjadi 0; titik 4 desimal dari pusat desa, bukan koordinat laporan.

### U4 sampai U5 basis data dan rute
Migrasi dua kali tanpa galat; `UPDATE` dan `DELETE` pada `lk_*` ditolak matriks hak; `GET hari-ini` tanpa sesi 200 dan hanya daftar putih; saklar mati 404; cache header ada; laju ke-121 dalam sejam 429; `tarik` oleh akun BPBD wilayah lain 403; `tarik` oleh staf 200 lalu kartu hilang pada muat berikut; `usulkan` oleh akun tanpa peran 403; `usulkan` tanpa laporan terverifikasi 422; `usulkan` dua kali 409 tanpa baris kedua; jenis tak terpetakan 422; kab lintas 422.

### U6 pasang.py
`lapor_ai` dengan `usulan_staf` tanpa kandidat: aksi `baru`, fase `terdeteksi`; tanpa `usulan_staf` tanpa kandidat: `tanpa_pasangan`; satu kandidat: `tambah` pada kedua; dua kandidat: `ambigu` dengan daftar kandidat; tanpa wilayah: `tanpa_wilayah`; dampak kosong; `(sumber, kode)` sudah ada: `sudah_ada` tanpa duplikat; urutan kanonik membuat ID sama pada dua jalan (INV-9).

### U7 ujung ke ujung
Mesin lokal atau D1 pengujian: kirim dua laporan desa sama dari dua nomor, BPBD cek Valid, kartu muncul di `/api/lapor/hari-ini`; BPBD ubah Tidak valid, kartu hilang; tarik dan cabut; usulkan, jalankan `pasang.py masuk` terhadap rute ingest uji, status usulan berubah di `GET /api/lapor/meja`.

### U8 layar
Keadaan kosong, memuat, gagal, satu kartu, banyak kartu; keyboard dan pembaca layar; tanpa literal warna baru; kartu tidak menempel (20 px); tanpa teks huruf kapital semua; tidak ada kata "aman"; klik saring tidak membekukan (INP, `inp-reviewer`).

## 3. Kriteria terima

| Tiket | Bukti |
| --- | --- |
| LK-01 | U1 hijau, emas identik |
| LK-02 | U2 hijau; bentuk penanda pemeriksa diputuskan dengan bukti kode |
| LK-03 | U4 hijau, pemeriksa `migrasi-idempoten` |
| LK-04 | U3 hijau |
| LK-05 | U5 bagian hari-ini hijau; U9 angka tercatat |
| LK-06 | U8, tautan tinjau lokal, `security-reviewer` |
| LK-07 | U5 bagian tarik hijau |
| LK-08 | tampilan meja dan U10 |
| LK-09 | U5 bagian usulkan |
| LK-10 | U6 hijau |
| LK-11 | U7 bagian status |
| LK-12 | U7 lengkap terdaftar di `tests/e2e/cakupan.json` dan jalan |
| LK-13 | pemeriksa bersih tanpa riwayat penulis (AGENTS 3.2) |

## 4. Yang diverifikasi pemeriksa bersih

Verifier adalah subagent baru tanpa riwayat penulisnya; ia menjalankan perintah bukti dan memeriksa sinyal nyata, bukan klaim "sudah beres" (AGENTS 3.2). Laporan pemeriksa mencatat perintah dan hasil.
