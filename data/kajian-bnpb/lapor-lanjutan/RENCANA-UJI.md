# RENCANA-UJI: Data lanjutan BPBD

Perilaku yang tinggal di luar TypeScript (migrasi, CHECK, rute, R2, cron) diuji dengan menjalankannya: Miniflare dengan D1 dan R2 sungguhan dan migrasi apa adanya, pola `tests/lapor/rute.test.mjs` (`siapkan` dari `tests/warga/_bnpb.mjs`). Tanpa mock untuk D1.

## 1. Uji murni (`tests/lapor/lanjut_spek.test.mjs`)

| Kriteria | Kasus |
| --- | --- |
| Spek tiap jenis menolak isian wajib kosong dan menerima nilai "nihil/tidak_tahu" | tujuh jenis |
| Kosong tidak pernah jadi 0; bagian nihil bernilai 0 | rekap dengan dan tanpa nihil |
| Rekap rumah dan korban sesuai ALGORITMA 4; objek batal tidak ikut | 3 RB, 1 batal, rekap 2 |
| `mengungsi(t)` menghitung masuk dan keluar dengan benar di batas tanggal | keluar = t tidak dihitung |
| Penanda `foto_jauh`, `foto_lama`, `dobel_titik`, `nik_ganda`, `tanpa_titik` menyala tepat di ambangnya | 499 m dan 501 m |
| `nik_ganda` tidak pernah menyala antarberkas | dua berkas, NIK sama |
| Status penutupan `selesai_catatan` bila ada hilang, ungsi, atau putus | tiga kasus masing-masing |
| Sidik versi stabil untuk isi yang sama, berbeda bila satu objek berubah | dua urutan sisip |

## 2. Uji rute (`tests/lapor/lanjut_rute.test.mjs`)

| Kriteria | Bukti |
| --- | --- |
| Tiket `bpbd` terkirim membuka berkas; `warga` dan `bpbd_klaim` tidak | baris `lj_berkas` ada atau tidak |
| Laporan kedua dalam kelompok KJ dan kab sama tidak membuat berkas kedua | `UNIQUE (induk, kab)` |
| Anggota bisa tambah objek; yang dicabut ditolak 403 dan token lama tidak berlaku | dua permintaan |
| `klien_id` sama dua kali = satu objek (antrean luring) | jumlah baris |
| Tabrakan `rev` ditolak 409 | dua ubah serentak |
| Rute tanpa sesi tidak pernah mengembalikan nama, HP, NIK | pindai respons |
| Media disajikan dengan `Cache-Control: private, no-store` dan 404 tanpa sesi | kepala respons |
| Rekap masuk catatan meja `dampak`; angka ketikan berbeda tetap ada dan bertanda beda sumber | isi `meja_catatan` |
| Rekap harian titik masuk meja `pengungsi` dengan `titik_id` dan tanggal | indeks unik 0135 |
| Prasarana putus menghasilkan `lf_usulan`, tidak pernah `lf_status` | dua tabel |
| Jitupasna hanya terisi lewat rute terima staf | sebelum dan sesudah terima |
| Pertanyaan harian satu per berkas per tanggal WIB, hanya ke nomor boleh kirim fase | `lj_tanya`, antrean `lapor_kabar` |
| Penutupan membekukan versi; ubah sesudahnya membuat versi 2, versi 1 utuh | `lj_beku` |
| Tiket `LA-` baru `selesai` sesudah staf menerima penutupan | `lapor_tiket` |
| Staf Tampilkan HP tercatat di `lapor_akses` | baris log |

## 3. Bukti siap F0

```bash
node --test tests/lapor/lanjut_spek.test.mjs tests/lapor/lanjut_rute.test.mjs
```

```bash
npm run uji:warga
```

```bash
npm run uji:agen
```

Ditambah tinjau pemilik di `http://localhost:8800/lapor/data/` dan rincian di `http://localhost:8800/lapor/meja`, dengan nomor uji rekaan (bukan nomor pemilik).

## 4. Metrik F0 untuk lanjut F1

- 20 objek campuran dari WA dan web oleh dua anggota tanpa salah rekap.
- Isian luring 5 objek terkirim utuh sesudah daring.
- Satu berkas ditutup dengan status `selesai_catatan` dan dibuka lagi menjadi versi 2.
