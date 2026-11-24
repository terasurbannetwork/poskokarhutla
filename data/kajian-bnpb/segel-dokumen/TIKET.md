# TIKET: Segel dokumen dan verifikasi

Kerjakan urut. Tiket yang ditahan Q tidak dikerjakan sebelum pemilik menjawab atau menyetujui bawaannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| SG-01 | Migrasi segel (nomor kosong berikut saat dikerjakan; 0170 sudah dipakai LK-03) + sidik di `tests/warga/migrasi_beku.json` | warga-api | `migrasi_beku.test.mjs`; pemeriksa `migrasi-idempoten` | Q1 |
| SG-02 | Bagian Segel di `src/hak.js`: `stmtSegel`, cari, daftar, cabut, pemeriksa tabel | warga-api | `gerbang-d1`, `gerbang-d1-pindai` | SG-01 |
| SG-03 | `src/segel.js` fungsi murni `buatKode`, `normalKode`, `statusSegel` + U1 sampai U3 | warga-api | U1-U3 hijau | SG-02 |
| SG-04 | Rute publik `GET /api/verifikasi/<kode>` dengan hitung ulang sidik dan batas laju | warga-api | T6-T8, T11, T13; rute masuk `tests/warga/cakupan.json`; `guard-api`, `security-reviewer` | SG-03 |
| SG-05 | Sambung pembeku laporan karhutla (kunci dan ralat) | warga-api | T1, T2, T5, T12 | SG-04, Q1 |
| SG-06 | Sambung pembeku laporan bencana | warga-api | T3 | SG-05 |
| SG-07 | Sambung bekukan dokumen PB | warga-api | T4 | SG-05 |
| SG-08 | Halaman `public/verifikasi.*`; jalur berpola di `HTML_RUTE` dan pengecualian halaman terkunci seperti `/lapor/lacak` | layar-peta, warga-api | L1, L2; `selera-angka`, `inp-reviewer` | SG-04, Q2, Q3, Q10 |
| SG-09 | `public/inti/segel.js` dan blok QR di lembar cetak dokumen PB serta cetak laporan harian | inti-layar | L3; `gerbang-kertas-a4` | SG-07, Q6 |
| SG-10 | Rute cabut dan daftar staf, tab di halaman admin | warga-api, layar-peta | T9, T10; rute masuk `tests/warga/cakupan.json` | SG-04, Q5 |
| SG-11 | `tests/agen/gerbang-segel.test.mjs` | penulis-gerbang | gerbang merah pada fixture pembeku tanpa segel | SG-07 |
| SG-12 | QR di deck generator Python | pipa-data | - | Q4 |
| SG-13 | Segel `lj_beku` dan Laporan Berkala | warga-api | - | Q1, LJ dan LB selesai |
| SG-14 | Pemilik menerapkan migrasi segel 0171 dan 0172 di D1 produksi | pemilik | `wrangler d1 migrations apply` | SG-01 |

Catatan dari pemeriksaan SG-02 (24 Nov 2026), wajib dikerjakan di rutenya:

- SG-04: `segelCari` mengembalikan sidik penuh, `rujukan`, dan `dasar` untuk hitung ulang di Worker. Jawaban publik WAJIB diproyeksikan ulang: `sidik12` = 12 huruf pertama, `rujukan` dan `dasar` dibuang (KEAMANAN-PRIVASI). T6-T8 memeriksanya.
- SG-10: `segelCabut` tidak memvalidasi. Rute menormalkan kode (`normalKode`), menolak alasan di luar 5-500 huruf dengan 400, dan memetakan galat PK cabut kedua ke 409; galat D1 mentah tidak pernah sampai ke klien.
- SG-05 sampai SG-07 (pembeku): `penerbit` diisi nama lembaga (mis. "Pusdalops BNPB"), tidak pernah nama staf; satu uji memastikan kolom `penerbit`, `judul`, `wilayah` tanpa nama orang. Halaman `public/verifikasi.*` menulis ketiganya lewat `textContent`.
- SG-13: rute verifikasi belum punya pembaca sumber `lj`, jadi segel `lj` tampil Tidak cocok. Pembaca `lj_beku` di `src/segel.js` `isiSumber` wajib ada sebelum segel `lj` pertama disisipkan.
- SG-11: `gerbang-segel` ikut memeriksa tidak ada `UPDATE` atau `DELETE` ke `segel` dan `segel_cabut` di `src/**` (append-only hanya dijaga kode, tanpa trigger).
