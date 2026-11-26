# DESAIN-TEKNIS: Kaji ulang pasca-kejadian

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `src/kaji_ulang.js` | Rute baca draf dan kaji ulang, tulis pelajaran, rekomendasi, status, pengesahan; `RUTE_KAJI_ULANG` digabung ke `RUTE_SIKLUS` di `src/siklus.js` | warga-api |
| `src/kaji_ulang_rakit.js` | Fungsi murni perakit linimasa dan durasi (tanpa env.DB), mengimpor `durasiTahap` dan `ringkasTahap` dari `src/sla.js` | warga-api |
| `src/hak.js` bagian Kaji ulang | Semua SQL: baca tugas terhubung, `ops_pelajaran`, `lf_riwayat`, `tw_*`, `sk_jejak`; tulis `ku_*`; baca `dl_tindak` per awalan; entri `MATRIKS` | warga-api |
| `src/dalops_tindak.js` dan `dlTindakTerkini` di `src/hak.js` | Kecualikan kunci berawalan `kaji\|` dari rute Dalops (Q10) | warga-api |
| `migrations/<nomor>_kaji_ulang.sql` | tiga tabel `ku_*` | warga-api |
| `public/siklus/kaji_ulang.js`, `kaji_ulang.css` | Kartu dan laci di halaman kejadian, gaya cetak | siklus |
| `tests/warga/kaji_ulang.test.mjs` | Uji integrasi D1 sungguhan | warga-api |
| `tests/siklus/layar_kaji_ulang.test.mjs` | Uji layar | siklus |

Dokumen ini ada di wilayah siklus; kode `src/` dan migrasi milik warga-api. Nomor migrasi diambil saat tiket KU-01 (cek `migrations/`, terakhir yang ada saat ditulis `0145_masuk_kode_akun.sql`, dan reservasi di `data/kajian-bnpb/*`). Kolom `dummy` tidak dipakai (aturan pemilik 11 Nov 2026: tanpa data dummy).

## D1

| Tabel | Kolom |
| --- | --- |
| `ku_kaji` | `kejadian_id` PK dan FK `sk_kejadian`, `status` CHECK (draf, disahkan), `versi` INTEGER, `mulai_oleh`, `dibuat`, `disahkan_oleh`, `disahkan_pada`, `potret` TEXT JSON (versi terkini, <= 100000, diisi saat sahkan), `diubah`; versi lama dipindah ke `ku_potret` |
| `ku_potret` | `kejadian_id` FK, `versi`, `potret`, `disahkan_oleh`, `disahkan_pada`; PK (kejadian_id, versi); append-only |
| `ku_pelajaran` | `id` PK 16 heks, `kejadian_id` FK (tanpa kab4: kaji ulang per kejadian, hanya staf pusat menulis), `kategori` CHECK (baik, perbaiki), `teks` 10 sampai 1000, `rujuk` JSON array peristiwa (<= 400), `asal_ops_id` TEXT nullable (id `ops_pelajaran` yang diangkat, tanpa FK karena CASCADE tugas), `versi_tambah` INTEGER (= `ku_kaji.versi` saat ditulis; 0 bila masih draf), `oleh`, `dibuat`; indeks (kejadian_id, dibuat) |
| `ku_rekomendasi` | `id` PK 16 heks, `kejadian_id` FK, `nomor` INTEGER, `kunci` TEXT UNIQUE (`kaji\|<KJ>\|<nn>`, 24 karakter, di dalam CHECK panjang `dl_tindak.kunci` 10 sampai 120), `teks` 10 sampai 400 (juga disalin ke `dl_tindak_log.langkah`), `unit` 2 sampai 80, `tenggat` TEXT tanggal (GLOB), `pelajaran_id` nullable, `tidak_dilanjutkan` 0 atau 1, `oleh`, `dibuat`; UNIQUE (kejadian_id, nomor) |

Aturan versi: `versi` naik 1 saat Sahkan pertama (0 menjadi 1) dan tiap Sahkan ulang; butir ber`versi_tambah` lebih besar dari versi potret yang dicetak tampil sebagai lampiran "setelah versi n". Pemicu: `ku_kaji` tidak boleh kembali dari disahkan ke draf; `ku_pelajaran` dan `ku_rekomendasi` tidak boleh diubah atau dihapus bila `ku_kaji.status` kejadiannya sudah disahkan (pola `lf_riwayat_tetap_ubah`); saat masih draf staf boleh mengubah teks. Status dan riwayat rekomendasi tinggal di `dl_tindak` dan `dl_tindak_log`; tabel itu tidak diubah. Nomor `nn` dua digit membatasi 99 rekomendasi per kejadian.

Kuota baca D1 (Free 5 juta per hari): tidak ada cron dan tidak ada pindai. Anggaran: paling banyak 14 kueri per permintaan baca draf, semua set-based (`IN (SELECT value FROM json_each(?))`), tidak pernah satu kueri per tugas (ALGORITMA 2a); konstanta `MAKS_KUERI_DRAF` diuji. Baca draf memakai indeks yang sudah ada (`sk_ks_kej`, `lf_riwayat_sel`, `tw_baris_sel`, `tugas_isian_tugas`, `ops_pelajaran_tugas`); tiap kueri diuji EXPLAIN (T9). Penyimpanan status rekomendasi memakai `dl_tindak` dengan indeks primer kunci; baca per awalan memakai `kunci >= 'kaji|KJ-...|' AND kunci < '...}'` (rentang di PK), bukan LIKE awalan acak.

## Rute

| Rute | Hak |
| --- | --- |
| `GET /api/siklus/kaji-ulang/kandidat` | STAF (Pimpinan baca) |
| `GET /api/siklus/kejadian/:id/kaji-ulang` | STAF, BP (kab wilayahnya, hanya yang disahkan, isi dari potret beku versi terkini, Q6) |
| `GET /api/siklus/kaji-ulang/disahkan` | BP saja: daftar kaji ulang disahkan di kab wilayah akun (lewat `/api/instansi/siklus/...`, dibaca tab Kaji ulang `/instansi`) |
| `POST /api/siklus/kejadian/:id/kaji-ulang` (mulai) | PDKO |
| `POST /api/siklus/kejadian/:id/kaji-ulang/pelajaran` | PDKO (BP baca-saja: MATRIKS_SK `sk_instansi`, Q13) |
| `POST /api/siklus/kejadian/:id/kaji-ulang/rekomendasi` | PDKO |
| `POST /api/siklus/kejadian/:id/kaji-ulang/rekomendasi/status` | PDKO; badan `{nomor, status, catatan}` ditulis ke `dl_tindak` dan `dl_tindak_log` satu batch |
| `GET /api/siklus/kejadian/:id/kaji-ulang/rekomendasi/riwayat?nomor=` | STAF |
| `POST /api/siklus/kejadian/:id/kaji-ulang/sahkan` | KO (Q3); dipakai juga untuk sahkan ulang |
| `GET /api/siklus/kaji-ulang/rekomendasi` | STAF; F-7 lintas kejadian |

Pengecualian Dalops dilakukan di SQL, bukan di JS: `dlTindakTerkini` (`src/hak.js:465`, LIMIT 2000) mendapat `AND (kunci < 'kaji|' OR kunci >= 'kaji}')`; menyaring sesudah LIMIT bisa menggusur baris banjir. Entri `ku_*` ditambahkan ke `MATRIKS_SK` (bukan `MATRIKS`): `sk_staf` baca dan tambah, `sk_instansi` baca, `admin` baca dan tambah.

Semua jawaban `cache-control: private, no-store`. Tabel `ku_*` atau `lf_*` atau `tw_*` belum ada: bagian itu 503 atau "belum diaktifkan", bukan 0. Batas laju dan header `x-pb: 1` untuk kiriman bersesi mengikuti pola `src/dalops_tindak.js` (pemakaian ulang `dlTindakLaju`).

## Pakai ulang, bukan menyalin

`dlStmtTindak`, `dlStmtTindakLog`, `dlTindakRiwayat`, `dlTindakLaju`, `dlNamaStaf` (`src/hak.js:465-471`) dipakai langsung. `RE_KUNCI` banjir tidak diubah; kaji ulang punya `RE_KUNCI_KAJI = /^kaji\|KJ-\d{4}-[0-9A-HJKMNP-TV-Z]{8}\|\d{2}$/`. Tulisan ke `sk_jejak` (pengesahan, mulai) lewat `skBatch` dan `skStmtJejak` agar INV-4 terpenuhi (`src/hak.js:114`).
