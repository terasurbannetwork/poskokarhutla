# DESAIN-TEKNIS: Alun-alun Terpadu

Semua rujukan berkas dan baris diukur 15 Nov 2026; cek ulang sebelum dipakai. Pemilik berkas dicek dengan `node scripts/agents/ilmu.mjs pemilik <berkas>` saat tiket dikerjakan.

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `src/alun_konst.js` (baru) | ambang paket ini (24 jam, 36 jam, 7 hari, 90 hari, batas pemberitahuan) | `warga-api` |
| `src/alun_instansi.js` (baru) | rute `/api/instansi/alun*`: kotak masuk, rincian, balas sebagai lembaga, ubah status bantuan | `warga-api` |
| `src/alun.js` (ubah) | balasan lembaga dari halaman publik; pemicu pemberitahuan; tanda kejadian dan riwayat di jawaban baca; kartu "Belum ada di Buku Besar" di data admin | `warga-api` |
| `src/hak.js` (ubah) | sumber `alun` di `KT`; SQL kotak masuk, riwayat, tanda kejadian (gerbang D1 melarang akses D1 baru di berkas lain) | `warga-api` |
| `src/kejadian_tautan.js` (ubah) | sumber `alun` di rute ingest modul; rute ingest rekap | `warga-api` |
| `src/kabar.js` (ubah seperlunya) | jenis pemberitahuan alun-alun lewat `kabarkan()` | `warga-api` |
| `src/pb_ringkas.js` (ubah) | dua baris angka alun-alun di `operasi()` | `warga-api` |
| `migrations/<nomor>_alun_terpadu.sql` (baru) | tabel `alun_riwayat`; indeks kotak masuk | `warga-api` |
| `scripts/siklus/pasang.py` (ubah) | `alun` di `SUMBER_MODUL`; sumber ini tidak pernah membuat kejadian | `siklus` |
| `scripts/siklus/alun_rekap.py` (baru) | menghitung rekap dari rute ingest rekap; menulis berkas ke R2 privat | `siklus` |
| `.github/workflows/siklus.yml` (ubah) | satu langkah menjalankan `alun_rekap.py` | `mekanik-mesin` |
| `public/bnpb/alun-alun.js`, `.html`, `.css` (ubah) | daftar kabupaten, tanda kejadian, pil lembaga, riwayat, balas sebagai lembaga | `ruang-bnpb` |
| `public/instansi.html`, `public/instansi.js`, `public/instansi_alun.js` (baru) | tab dan kartu kotak masuk | `warga-api` |
| `public/admin/alun.js` (ubah) | kartu "Belum ada di Buku Besar" | `warga-api` |
| `public/admin/pimpinan.js` (ubah) | kartu "Alun-alun" dari berkas rekap | `ruang-bnpb` |
| `public/inti/dasbor_pimpinan.js` (ubah) | dua baris di larik `OPERASI` | `inti-layar` |
| `public/siklus/**` (ubah) | kartu "Kabar warga" di halaman kejadian | `siklus` |
| `tests/warga/alun_terpadu*.test.mjs` (baru) | uji integrasi RENCANA-UJI | `warga-api` |
| `tests/siklus/alun_rekap*.py` atau `.test.mjs` (baru) | uji rekap dan pencocok sumber `alun` | `siklus` |
| `tests/agen/gerbang-alun-terpadu.test.mjs` (baru) | gerbang larangan PRD | `penulis-gerbang` |

Tidak ada folder baru di `public/` atau `scripts/`.

## 2. Skema D1 (hanya `CREATE ... IF NOT EXISTS`)

```sql
CREATE TABLE IF NOT EXISTS alun_riwayat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  utas_id TEXT NOT NULL CHECK (length(utas_id) = 16),
  dari TEXT NOT NULL CHECK (dari IN ('terbuka', 'ditangani', 'selesai')),
  ke TEXT NOT NULL CHECK (ke IN ('terbuka', 'ditangani', 'selesai')),
  oleh_tabel TEXT NOT NULL CHECK (oleh_tabel IN ('instansi_akun', 'admin')),
  oleh_id TEXT NOT NULL,
  lembaga TEXT CHECK (lembaga IS NULL OR length(lembaga) <= 120),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 280),
  waktu INTEGER NOT NULL,
  CHECK (dari <> ke),
  CHECK (ke <> 'selesai' OR catatan IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS alun_riwayat_utas ON alun_riwayat (utas_id, waktu);

CREATE INDEX IF NOT EXISTS alun_utas_wilayah_status ON alun_utas (prov, kab, moderasi, dibuat);
CREATE INDEX IF NOT EXISTS alun_balas_petugas ON alun_balas (utas_id, petugas, dibuat);
```

- Riwayat append-only: dua trigger `BEFORE UPDATE` dan `BEFORE DELETE` yang menolak, dengan pengecualian penghapusan utas oleh moderator ditangani dengan menghapus riwayat lewat satu jalur kode yang tercatat (pola `dl_tindak`, `migrations/0128_dl_tindak.sql`; cara persisnya ditiru saat AT-02).
- Tabel `alun_utas` dan `alun_balas` tidak diubah. Status bantuan tetap di kolom `alun_utas.bantuan` yang ada.
- Tautan kejadian memakai `sk_kejadian_sumber` yang ada (`sumber = 'alun'`); tanpa tabel baru.
- Tanpa kolom contoh.

## 3. Rute

| Rute | Hak | Isi |
| --- | --- | --- |
| `GET /api/siklus/ingest/modul?sumber=alun` | sistem (`PIPA_TOKEN`) | baris ALGORITMA 1 untuk pencocok |
| `GET /api/siklus/ingest/alun_rekap` | sistem | baris rekap: utas 90 hari, waktu balasan lembaga pertama, status, tanda terverifikasi, kab4; tanpa teks isi, tanpa penulis |
| `GET /api/instansi/alun` | sesi instansi aktif | kotak masuk berhalaman, tersaring wilayah di SQL |
| `GET /api/instansi/alun/:id` | sesi instansi aktif, utas dalam wilayah | rincian, balasan, riwayat |
| `POST /api/instansi/alun/balas/:id` | seperti di atas | balasan lembaga |
| `POST /api/instansi/alun/status/:id` | seperti di atas, jenis akun pemprov, pemkab, pemkot | ubah status bantuan, tulis riwayat |
| `POST /api/alun/balas/:id` (ubah) | `sesi_masuk` + `lembaga: true` | balasan lembaga dari halaman publik (ALGORITMA 3) |
| `GET /api/alun`, `GET /api/alun/:id` (ubah) | publik | tambah `kejadian` (nomor dan tautan, hanya kejadian `publik = 1`), `lembaga` pada balasan, `riwayat` pada rincian |
| `GET /api/alun/admin` (ubah) | moderator | tambah `belum_di_buku` |
| `GET /api/siklus/kejadian/:id/alun` atau perluasan rute tautan yang ada | staf dan BPBD sesuai hak Siklus | kabar warga satu kejadian |

Catatan:

- Router hanya mengenal `:id` 16 heksadesimal di ujung jalur; nama rute tanpa tanda strip (gerbang cakupan tidak membaca strip).
- Rute instansi mengikuti penjaga modul instansi yang ada (header `x-pb`, sesi, lingkup). Rute publik alun-alun mempertahankan Turnstile dan batas laju; batas laju dicek sebelum pembacaan sesi.
- Jawaban baca publik tetap lewat `cacheTepi` 10 detik; `kejadian`, `lembaga`, dan `riwayat` adalah data pos, bukan data pemanggil.
- Tabel `alun_riwayat` belum ada: forum tetap jalan, riwayat kosong, ubah status menjawab 503.

## 4. Pipeline

- `pasang.py`: `alun` masuk `SUMBER_MODUL` dengan tanda `tanpa_buat = True`. Jalur yang membuat kejadian dari sumber dilewati untuk sumber bertanda itu; uji memastikannya.
- `alun_rekap.py`: stdlib saja. Menarik `ingest/alun_rekap` dengan kursor, menghitung ALGORITMA 4, menulis dua berkas ke R2 privat lewat cara unggah yang dipakai langkah Siklus lain: `alun/rekap/ringkas.json` (nasional, per provinsi, sepuluh kabupaten teratas) dan `alun/rekap/rinci.json` (semua kabupaten). Keduanya membawa `dihitung`, `rentang`, dan `sumber`.
- Worker menyajikan berkas itu lewat rute staf yang membaca R2 (satu `get`, tanpa D1): `GET /api/alun/rekap` untuk moderator, staf, dan pimpinan yang berhak membuka Layar Pimpinan.
- Jadwal: ikut jadwal `siklus.yml` yang ada. Tidak ada cron Worker baru (batas lima jadwal akun Free; gerbang anggaran).

## 5. Pemberitahuan

`tulis()` di `src/alun.js` sesudah menyimpan utas `butuh_bantuan`: `ctx.waitUntil(kabarAlun(...))`. `kabarAlun` mencari akun instansi wilayah (SQL di `hak.js`, berindeks), lalu memanggil `kabarkan()` dengan kunci `alun:<id>`. Batas per akun per jam di `alun_konst.js`.

## 6. Anggaran D1

| Jalur | Biaya baca | Penjaga |
| --- | --- | --- |
| Kotak masuk | satu kueri berindeks `(prov, kab, moderasi, dibuat)` per halaman | gerbang d1-pindai |
| Tanda kejadian di daftar publik | satu kueri `IN` ke `sk_kejadian_sumber` per halaman, di dalam cache 10 detik | cache |
| Rekap | dibaca pipeline lewat kursor sekali per jadwal; layar membaca R2 | D8 |
| Pemberitahuan | satu kueri akun wilayah per utas `butuh_bantuan` | batas laju tulis utas yang ada |

Statistik admin alun-alun yang sekarang memindai tabel diganti pembacaan berkas rekap pada tiket AT-08, sehingga plafon pindai `src/alun.js` di `tests/agen/fixtures/d1-pindai.json` turun; plafon itu hanya boleh menyusut.

## 7. Ketahanan

| Keadaan | Perilaku |
| --- | --- |
| Migrasi belum jalan | forum jalan; kotak masuk tampil tanpa riwayat; ubah status 503 |
| Migrasi Keterpaduan belum jalan | tanda kejadian kosong; ingest menjawab seperti sumber lain |
| Rekap belum ada atau lama | "Rekap belum tersedia" atau tanggal rekap terakhir |
| Tidak ada akun instansi di wilayah itu | pemberitahuan dilewati; pengingat admin tetap |
| `kabarkan()` gagal | utas tetap tersimpan |

## 8. Catatan keputusan teknis

| No | Keputusan | Alternatif yang ditolak |
| --- | --- | --- |
| T1 | Tautan kejadian lewat `sk_kejadian_sumber` | kolom `kejadian_id` di `alun_utas`: butuh `ALTER`, dan menyalin kebenaran |
| T2 | Kab4 dihitung saat ingest | disimpan saat tulis: butuh kolom baru dan basi bila peta kabupaten berubah |
| T3 | Rute lembaga di bawah `/api/instansi/alun` | mengubah path cookie instansi: menyentuh semua modul instansi |
| T4 | Rekap oleh pipeline ke R2 | kueri agregat saat layar dibuka: memindai tabel, memakan kuota |
| T5 | Riwayat status di tabel samping append-only | kolom JSON di utas: bisa ditimpa |
| T6 | Sumber `alun` bertanda tidak membuat kejadian | menyaring di Worker saja: pencocok tetap bisa membuat kejadian dari sumber baru |
