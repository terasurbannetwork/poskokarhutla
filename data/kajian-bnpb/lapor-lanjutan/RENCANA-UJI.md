# RENCANA-UJI: Data lanjutan BPBD

Perilaku yang tinggal di luar TypeScript (migrasi, CHECK, rute, R2, cron, kuki) diuji dengan menjalankannya: Miniflare dengan D1 dan R2 sungguhan dan migrasi apa adanya, pola `tests/lapor/rute.test.mjs` (`siapkan` dari `tests/warga/_bnpb.mjs`). Tanpa mock untuk D1.

## 1. Uji murni (`tests/lapor/lanjut_spek.test.mjs`)

| Kriteria | Kasus |
| --- | --- |
| Spek tiap jenis menolak isian wajib kosong dan menerima `tidak_tahu` | tujuh jenis |
| `nilai(m)`: jumlah bila ada objek, 0 bila nihil, `null` bila tidak keduanya | meninggal dengan hanya korban hilang = `null` |
| Mengisi objek pada metrik nihil mencabut nihilnya | nihil lalu tambah 1 |
| Rekap rumah, korban, prasarana, rincian umur dan L/P sesuai ALGORITMA 4; objek batal tidak ikut | 3 RB, 1 batal, rekap 2 |
| Rumah terendam tidak rusak tidak masuk bahan Jitupasna | `tingkat='tidak_rusak'`, terendam ya |
| `mengungsi(t)` di batas tanggal | keluar = t tidak dihitung |
| Penanda menyala tepat di ambangnya | 499 m dan 501 m |
| `nik_ganda` tidak menyala antarjenis dan antarberkas | jiwa dan korban NIK sama; dua berkas |
| Status `selesai_catatan` bila hilang, ungsi, putus lebih dari nol atau `null` | empat kasus |
| Sidik versi stabil untuk isi yang sama; berbeda bila satu objek berubah; isi versi tanpa kunci `pribadi` | dua urutan sisip |

## 2. Uji rute (`tests/lapor/lanjut_rute.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Tiket `bpbd` terkirim di kab izinnya membuka berkas; `warga`, `bpbd_klaim`, dan `bpbd` di luar kab izinnya tidak | baris `lj_berkas` |
| Laporan kedua dalam kelompok KJ dan kab sama tidak membuat berkas kedua | `UNIQUE (induk, kab)` |
| Anggota lolos gerbang izin hanya di jalur berkas, ditolak di jalur laporan `bpbd` lain | dua permintaan |
| Anggota yang dicabut ditolak 403; anggota lain tetap bisa | tiga permintaan |
| Token sekali pakai: dipakai dua kali ditolak; kuki kedaluwarsa ditolak | dua permintaan |
| `klien_id` sama dua kali = satu objek (antrean luring) | jumlah baris |
| Tabrakan `rev` ditolak 409 | dua ubah serentak |
| Respons tanpa kuki atau sesi tidak pernah memuat nama, HP, NIK | pindai respons |
| Respons staf memuat `pribadi` tersamar; Tampilkan utuh dan tercatat `lj_akses` | isi respons, baris log |
| `lj_jejak` tidak memuat isi `pribadi` terbaca | pindai tabel |
| Media dengan `Cache-Control: private, no-store`, 404 tanpa kuki atau sesi | kepala respons |
| Video bersambung berkonteks objek berakhir sebagai baris `lj_media` jenis `video` | tabel |
| Rekap masuk satu catatan meja `dampak` berkolom `lapor_berkas`; angka ketikan berbeda tetap ada dan bertanda `beda_sumber` | `meja_catatan` |
| Catatan `diverifikasi` tidak berubah isi, hanya bertanda `rekap_baru` | `meja_catatan` |
| Rekap harian titik masuk meja `pengungsi` dengan `titik_id` dan tanggal; enam sektor terbawa | indeks unik 0135 |
| Berkas tanpa `kejadian_id` tidak menulis Jitupasna dan tidak membuat `sk_kejadian` | tabel |
| Jitupasna hanya terisi lewat rute terima staf; Jitupasna final menolak | sebelum dan sesudah |
| Pertanyaan harian: tidak jalan di luar menit jam kirim; satu per berkas per tanggal WIB; hanya nomor boleh kirim fase; teks tanpa nama dan HP | `lj_tanya`, `lj_kabar` |
| Penutupan membekukan versi tanpa data pribadi; ubah sesudahnya membuat versi 2, versi 1 utuh | `lj_beku` |
| Tiket `LA-` baru `selesai` sesudah staf menerima penutupan | `lapor_tiket` |

## 3. Uji mesin WA (`tests/lapor/mesin.test.mjs`, ditambah)

| Kriteria | Kasus |
| --- | --- |
| Isian `pribadi` diurai kode dan tidak pernah masuk muatan panggilan AI | penyadap pemanggil model di uji |
| Pesan pembuka tahap 2 hanya untuk tingkat `bpbd` | tiga tingkat |
| `tim tambah`, `tim cabut`, jawaban `masih` dan `selesai` | percakapan rekaan |

## 4. Uji luring (`tests/inti/` pola uji `antre.js` yang ada)

| Kriteria | Kasus |
| --- | --- |
| Butir berisi `pribadi` dan wajah lewat saluran `rahasia`, tidak pernah di localStorage atau IndexedDB | periksa penyimpanan sesudah antre |
| Butir non-pribadi tersimpan dan terkirim ulang sekali (`klien_id`) | putus lalu sambung |

## 5. Bukti siap F0

```bash
node --test tests/lapor/lanjut_spek.test.mjs tests/lapor/lanjut_rute.test.mjs tests/lapor/mesin.test.mjs
```

```bash
npm run uji:warga
```

```bash
npm run uji:agen
```

Ditambah tinjau pemilik di `http://localhost:8800/lapor/data/` dan rincian di `http://localhost:8800/lapor/meja`, dengan nomor uji rekaan (bukan nomor pemilik).

## 6. Metrik F0 untuk lanjut F1

- 20 objek campuran dari WA dan web oleh dua anggota tanpa salah rekap.
- Isian luring 5 objek terkirim utuh sesudah daring.
- Satu berkas ditutup dengan status `selesai_catatan` dan dibuka lagi menjadi versi 2.
