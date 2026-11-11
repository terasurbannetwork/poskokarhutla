# RENCANA-UJI: Cek Kabar Luar

## Uji murni Python (`python3 scripts/data/dalops_kabar.py --uji`)

Tanpa jaringan; fixture dibuat di dalam uji.

| No | Kasus | Harapan |
| --- | --- | --- |
| P1 | Artikel `kab` sama, tanggal sesudah laporan terakhir, judul "Ratusan warga Kudus masih mengungsi akibat banjir" | label `masih`, dasar `berita` |
| P1b | Artikel cocok tapi hanya topik `kejadian` dan `pencegahan` ("Antisipasi banjir, BPBD bersihkan saluran") | diabaikan, label `belum_ada` |
| P1c | Kejadian longsor, artikel `berita.json` yang hanya menyebut banjir | tidak cocok (`KATA_JENIS`) |
| P1d | `kab_kode` berisi dua kab, artikel menyebut kab kedua | cocok |
| P2 | Artikel hanya `prov` sama | tidak cocok |
| P3 | Judul "Banjir di Rembang sudah surut, warga kembali ke rumah" | arah `pulih`, label `mungkin_selesai` |
| P4 | Judul "Banjir Demak, air mulai surut" | bukan `pulih` (`SUDAH` banjir meminta "sudah/telah surut"); tanpa kata `AKTIF` dan tanpa topik korban/penanganan: diabaikan |
| P5 | Artikel pulih 9 Nov dan artikel masih 10 Nov | label `masih` (yang lebih baru menang) |
| P6 | Pulih dan masih di tanggal yang sama | `masih` |
| P7 | Tanpa artikel, senyap 4 hari, banjir, `status.json` level 0 semua kecamatan | `mungkin_selesai`, dasar `alam` |
| P8 | Tanpa artikel, senyap 4 hari, banjir, ada kecamatan level 2 | `belum_ada` (alam aktif tanpa artikel tidak cukup untuk `masih`) |
| P8b | Tanpa artikel, cuaca, senyap 10 hari | `belum_ada` (cuaca tanpa sinyal alam, tidak ada di `AMBANG`) |
| P9 | Gempa tingkat provinsi `"53|(provinsi)"` dengan artikel prov 53 | cocok |
| P10 | Bahan jenis gagal diunduh | `belum_ada`, catatan "sumber tidak terjangkau" |
| P11 | `arsipkan()` dua kali di hari sama | satu baris per `(hari, jenis, id)` |
| P12 | Baris `surut: true`, termasuk baris dari R2 yang sebelumnya punya `luar` (jalur `--wa`) | tidak punya kolom `luar` |
| P13 | `bukti` lebih dari 5 artikel | dipotong 5, terbaru dulu |

## Uji layar (`node --test tests/bnpb/dalops.test.mjs`)

| No | Kasus | Harapan |
| --- | --- | --- |
| L1 | `perluDitanya` dengan tiga label | urutan mungkin_selesai, belum_ada, masih; senyap menurun; kelompok `mungkin_selesai` berangka lengkap ikut masuk |
| L1b | `kelompok` dengan dua baris `masih` dan `mungkin_selesai` di kab sama | label kelompok `masih` |
| L2 | `pesanWA` label `mungkin_selesai` | memuat "mohon konfirmasi apakah sudah selesai", tidak memuat judul berita |
| L3 | Ringkasan | jumlah tiga angka = jumlah baris belum selesai |
| L4 | Tautan bukti `javascript:` | tampil sebagai teks, bukan `<a>` |
| L5 | Berkas lama tanpa kolom `luar` | layar tetap jalan, label tidak tampil |
| L6 | Pemirsa baca-saja | `.dl-wa` tersembunyi (aturan di `menu_pusdalops.css`, dijaga `tests/warga/pemirsa_pusdalops.test.mjs`) |

## Uji integrasi nyata

`CEK_KABAR_DASAR=https://centurisk97.id python3 scripts/data/dalops_banjir.py --jenis banjir` di mesin pemilik: berkas keluaran punya kolom `luar` di semua baris belum selesai, dan minimal satu artikel cocok bila `berita.json` hari itu punya artikel ber-`kab` yang sama. Dicatat di laporan tiket CK-04.

## Rapor (CK-07)

`python3 scripts/data/dalops_kabar.py --rapor` sesudah 60 hari arsip: tabel a/b/c/n per jenis per label (ALGORITMA 6). Tanpa persen bila n < 30.

## Gerbang yang wajib hijau sebelum push

`npm run uji:agen`, `node --test tests/bnpb/dalops.test.mjs`, `python3 scripts/data/dalops_banjir.py --uji`, `python3 scripts/data/dalops_kabar.py --uji`.
