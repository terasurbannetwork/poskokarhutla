# RENCANA-UJI: Segel dokumen

Uji integrasi menjalankan Worker sungguhan di Miniflare dengan migrasi nyata (`~/.claude/TEST.md`), bukan mock. Daftarkan di `tests/warga/cakupan.json`.

## Uji murni (`tests/warga/segel.test.mjs`, bagian murni)

| ID | Kasus | Harapan |
| --- | --- | --- |
| U1 | `buatKode()` 1.000 kali | semua 10 huruf, hanya abjad Crockford, tanpa duplikat |
| U2 | `normalKode("abcde-fghjk")`, `"0O1IL"` | huruf besar tanpa tanda hubung; O jadi 0, I dan L jadi 1 |
| U3 | `statusSegel` empat keadaan | Berlaku, Ada versi lebih baru, Dicabut, Tidak cocok; Dicabut menang atas Tidak cocok |

## Uji integrasi

| ID | Kasus | Harapan |
| --- | --- | --- |
| T1 | kunci laporan karhutla nyata | tepat satu baris `segel` jenis `lk`, sidik sama dengan `lk_snapshot.hash`, jawaban kunci membawa kode |
| T2 | ralat laporan karhutla | segel kedua versi 1; kode pertama berstatus Ada versi lebih baru dengan `terbaru` = kode kedua |
| T3 | kunci laporan bencana (banjir) | segel `lkb` sama seperti T1 |
| T4 | bekukan dokumen PB | segel `pb`, sidik sama dengan `pb_dokumen.sha` |
| T5 | baris sumber dummy | tidak ada segel |
| T6 | `GET /api/verifikasi/<kode>` | 200, tanpa kunci `isi`, tanpa angka isi; `x-robots-tag: noindex` |
| T7 | kode tidak ada, kode salah format | dua-duanya 404 dengan badan sama |
| T8 | isi `lk_snapshot` diubah langsung lewat SQL uji (trigger `lk_snapshot_tetap_ubah` dihapus dulu di basis data uji) | status Tidak cocok, tanpa cache, tercatat |
| T9 | cabut oleh moderator | 201; status Dicabut; cabut kedua 409 |
| T10 | cabut oleh staf pusdalops, tamu, akun gerbang | 403 |
| T11 | 61 pencarian dari IP sama dalam 10 menit | yang ke-61 dijawab 429 |
| T12 | tabel segel belum ada | kunci laporan tetap 200, tanpa segel, snapshot tertulis |
| T13 | dicabut lalu dibuka segera | status Dicabut, `cache-control: no-store` |

## Uji layar

| ID | Kasus | Bukti |
| --- | --- | --- |
| L1 | `/verifikasi/<kode>` di 375 px | tinjau lokal `http://localhost:8800/verifikasi/<kode>`, tanpa gulir mendatar |
| L2 | pilih PDF yang sama dan yang berbeda | "Berkas cocok" dan "Berkas berbeda"; tab Network tanpa unggahan |
| L3 | cetak dokumen PB | blok QR di halaman pertama, A4, terbaca kamera HP |

## Gerbang

- `tests/agen/gerbang-segel.test.mjs`: tiap berkas `src` yang menulis `INSERT INTO lk_snapshot`, `lkb_snapshot`, atau memanggil `pbDokBeku` juga memanggil `stmtSegel` atau `segelPb`.
- `gerbang-kertas-a4`, `gerbang-token-warna`, `gerbang-kartu-std` berlaku untuk layar baru.

Perintah bukti: `node --test tests/warga/segel.test.mjs tests/agen/gerbang-segel.test.mjs` lalu `npm run uji:warga`.
