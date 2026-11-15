# DESAIN-TEKNIS: Status Lifeline

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `src/lifeline.js` | Rute baca kisi, baca laci sel, tetapkan status; fungsi usulan | warga-api |
| `src/hak.js` bagian Lifeline | SQL baca isyarat (indeks), tulis status + riwayat dalam satu batch | warga-api |
| `public/siklus/lifeline.js` | Kartu kisi dan laci di halaman kejadian | siklus |
| `public/bnpb/dalops*.js` | Ringkasan per kejadian | ruang-bnpb |
| `scripts/umum/lampu_malam.py` | Jalur VNP46A2 (LF-10) | pipa-umum |

## D1

Nomor migrasi diambil saat tiket (cek `migrations/` dan reservasi di `data/kajian-bnpb/*`).

| Tabel | Kolom |
| --- | --- |
| `lf_status` | `kejadian_id` FK `sk_kejadian`, `kab4`, `layanan` CHECK delapan nilai, `warna` CHECK (hijau, kuning, merah, abu), `catatan`, `oleh`, `diubah`; PK (kejadian_id, kab4, layanan) |
| `lf_riwayat` | append-only: `id`, kolom yang sama + `bukti` JSON (daftar {sumber, kode, jumlah, waktu}), `dibuat`; indeks (kejadian_id, kab4, layanan, dibuat) |
| `lf_usulan` | cache usulan: (kejadian_id, kab4, layanan) PK, `warna`, `isyarat` JSON, `dihitung` |

Kuota baca D1 (Free 5 juta per hari): indeks yang dibutuhkan BELUM ADA hari ini. `laporan` hanya berindeks (disembunyikan, kedaluwarsa) dan (lat, lon); `laporan_wilayah` (prov, kab) tanpa waktu; `logbook_entri` (kejadian_id, waktu) tanpa kab; `meja_catatan` (meja, prov, kab, status) tanpa waktu; `kendala` di JSON. LF-03 membuat migrasi indeks (paling sedikit `laporan (jenis, dibuat)` dan `meja_catatan (meja, prov, kab, diubah)`), dan tiap isyarat diuji EXPLAIN (T10). Isyarat yang tetap butuh pindai penuh tidak dipakai.

Pemetaan wilayah: ALGORITMA 3a (`kab4Dari`).

Jadwal: putaran usulan di cron Worker satu-satunya pada menit bebas 22 tiap jam (menit terpakai lihat `src/worker.js` blok CRON_GEMPA/CRON_TITIK); biaya per putaran dibatasi KJ aktif x kab x 8 layanan, berhenti bila melewati batas baca yang ditulis di konstanta. Hitung saat halaman dibuka hanya bila `lf_usulan.dihitung` lebih tua dari 15 menit.

## Rute

| Rute | Hak |
| --- | --- |
| `GET /api/siklus/kejadian/:id/lifeline` | staf, BPBD (kab wilayahnya), pimpinan baca |
| `GET /api/siklus/kejadian/:id/lifeline/sel?kab4=&layanan=` | sama |
| `POST /api/siklus/kejadian/:id/lifeline` | Pusdalops, Koordalops, BPBD kab wilayahnya (Q2) |

Rute di bawah awalan `/api/siklus` supaya ikut `RUTE_SIKLUS` dan pola hak yang sudah ada; BPBD lewat `/api/instansi/siklus/...`.
