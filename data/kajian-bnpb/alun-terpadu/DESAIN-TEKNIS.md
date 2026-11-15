# DESAIN-TEKNIS: Alun-alun Terpadu

Rujukan berkas diukur 15 Nov 2026 dan sudah dikoreksi pemeriksa bersih; nomor baris sengaja tidak ditulis rinci karena berkasnya sering berubah. Cek ulang nama fungsi sebelum dipakai. Pemilik berkas dicek dengan `node scripts/agents/ilmu.mjs pemilik <berkas>` saat tiket dikerjakan.

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `src/alun_konst.js` (baru) | ambang paket ini, daftar alasan baku | `warga-api` |
| `src/alun_instansi.js` (baru) | rute `/api/instansi/alun*`: kotak masuk, rincian, balas atas nama lembaga, ubah status, tandai tidak valid | `warga-api` |
| `src/alun.js` (ubah) | kabupaten baku saat tulis; pemicu pemberitahuan; tanda kejadian, penanda lembaga, dan riwayat di jawaban baca; pelapor membuka lagi; moderator dan Teruskan menulis riwayat; cabut tautan saat sembunyikan atau hapus; label lembaga tidak lagi pada kiriman pribadi; daftar nama resmi diperluas | `warga-api` |
| `src/hak.js` (ubah) | sumber `alun` di `KT`; pelaku baru di `MATRIKS` untuk pembacaan `sk_*`; SQL kotak masuk, wilayah, lembaga, riwayat, tanda, tautan (gerbang D1 melarang akses D1 baru di berkas lain) | `warga-api` |
| `src/kejadian_tautan.js` (ubah) | sumber `alun` di rute ingest modul dan di daftar `TERLIHAT`; rute ingest rekap | `warga-api` |
| `src/siklus_kejadian.js` (ubah) | rute ingest kejadian menolak aksi `baru` untuk sumber `alun` | `warga-api` |
| `src/siklus_kab.js` (ubah) | fungsi pemeriksa kode kabupaten terhadap provinsi; nama baku dari kode | `warga-api` |
| `src/kabar.js` (ubah seperlunya) | jenis kabar alun-alun lewat `kabarkan()`; isi tanpa teks bebas (sesuai kepala berkas itu) | `warga-api` |
| `src/worker.js` (ubah) | pendaftaran rute; `tulis` alun-alun menerima `ctx` | `warga-api` |
| `migrations/<nomor>_alun_terpadu.sql` (baru) | tabel samping dan indeks (bagian 2) | `warga-api` |
| `scripts/siklus/pasang.py` (ubah) | aturan khusus sumber `alun` (ALGORITMA 3) | `siklus` |
| `scripts/siklus/alun_rekap.py` (baru) | menghitung rekap dari rute ingest rekap; menulis ke gudang | `siklus` |
| `.github/workflows/siklus.yml` (ubah) | satu langkah menjalankan `alun_rekap.py` | `mekanik-mesin` |
| `public/bnpb/alun-alun.js`, `.html`, `.css` (ubah) | daftar kabupaten berkode, tanda kejadian, pil lembaga, riwayat, tombol "belum selesai" | `ruang-bnpb` |
| `public/instansi.html`, `public/instansi.js`, `public/instansi_alun.js` (baru) | tab dan kartu kotak masuk | `warga-api` |
| `public/admin/alun.js` (ubah) | alasan baku saat moderator mengubah status; antrean "ditandai tidak valid"; kartu "Belum ada di Buku Besar" | `warga-api` |
| `public/admin/pimpinan.js` (ubah) | kartu "Alun-alun" dari berkas rekap | `ruang-bnpb` |
| `public/siklus/**` (ubah) | kartu "Kabar warga" di halaman kejadian | `siklus` |
| `tests/warga/alun_terpadu*.test.mjs` (baru) | uji integrasi RENCANA-UJI | `warga-api` |
| `tests/siklus/**` (baru) | uji aturan pencocok sumber `alun` dan uji rekap | `siklus` |
| `tests/agen/gerbang-alun-terpadu.test.mjs` (baru) | gerbang larangan PRD | `penulis-gerbang` |

Tidak ada folder baru di `public/` atau `scripts/`. `public/inti/dasbor_pimpinan.js` dan `src/pb_ringkas.js` tidak disentuh (Q11).

## 2. Skema D1 (hanya `CREATE ... IF NOT EXISTS`)

```sql
CREATE TABLE IF NOT EXISTS alun_wilayah (
  utas_id TEXT PRIMARY KEY CHECK (length(utas_id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*' AND substr(kab4, 1, 2) = prov)
);
CREATE INDEX IF NOT EXISTS alun_wilayah_kab ON alun_wilayah (kab4);
CREATE INDEX IF NOT EXISTS alun_wilayah_prov ON alun_wilayah (prov);

CREATE TABLE IF NOT EXISTS alun_lembaga (
  pos_id TEXT PRIMARY KEY CHECK (length(pos_id) = 16),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  lembaga TEXT NOT NULL CHECK (length(lembaga) BETWEEN 2 AND 120),
  dibuat INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS alun_riwayat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  utas_id TEXT NOT NULL CHECK (length(utas_id) = 16),
  dari TEXT NOT NULL CHECK (dari IN ('terbuka', 'ditangani', 'selesai')),
  ke TEXT NOT NULL CHECK (ke IN ('terbuka', 'ditangani', 'selesai')),
  pelaku TEXT NOT NULL CHECK (pelaku IN ('instansi', 'admin', 'pelapor', 'teruskan')),
  akun_id TEXT,
  lembaga TEXT CHECK (lembaga IS NULL OR length(lembaga) <= 120),
  alasan TEXT CHECK (alasan IS NULL OR alasan IN ('bantuan_tiba', 'instansi_lain', 'tidak_ditemukan', 'ganda', 'lainnya', 'belum_selesai')),
  catatan_staf TEXT CHECK (catatan_staf IS NULL OR length(catatan_staf) <= 280),
  waktu INTEGER NOT NULL,
  CHECK (dari <> ke),
  CHECK (ke <> 'selesai' OR alasan IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS alun_riwayat_utas ON alun_riwayat (utas_id, waktu);

CREATE TABLE IF NOT EXISTS alun_tanda (
  utas_id TEXT PRIMARY KEY CHECK (length(utas_id) = 16),
  tanda TEXT NOT NULL CHECK (tanda IN ('tidak_valid')),
  alasan TEXT NOT NULL CHECK (alasan IN ('bukan_kebutuhan', 'ganda', 'luar_wilayah', 'lainnya')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS alun_tanda_akun ON alun_tanda (akun_id, waktu);

CREATE INDEX IF NOT EXISTS alun_utas_kursor ON alun_utas (dibuat, id);
CREATE INDEX IF NOT EXISTS alun_balas_utas_petugas ON alun_balas (utas_id, petugas, dibuat);
```

Catatan:

- Tanpa trigger. Riwayat append-only dijaga kode (tidak ada rute yang mengubah atau menghapus) dan gerbang G-7. Menghapus utas menghapus utas dulu, lalu baris `alun_riwayat`, `alun_tanda`, `alun_wilayah`, `alun_lembaga`, `alun_penulis`, dan tautan kejadiannya, dalam satu jalur kode.
- `alun_utas` dan `alun_balas` tidak diubah. Status tetap di `alun_utas.bantuan`.
- `alun_penulis.mk_id` wajib terisi (`migrations/0133_masuk.sql`), jadi balasan dari kotak masuk instansi tidak memakainya; penanda lembaga ada di `alun_lembaga`.
- Indeks kursor `(dibuat, id)` mengikuti pola `migrations/0132_indeks_kursor_modul.sql`.
- Tautan kejadian memakai `sk_kejadian_sumber` yang ada (`sumber = 'alun'`).
- `akun_id` di riwayat dan tanda tidak pernah keluar ke jawaban publik; daftar kolom jawaban ditulis eksplisit.

## 3. Rute

| Rute | Hak | Isi |
| --- | --- | --- |
| `GET /api/siklus/ingest/modul` dengan sumber `alun` | sistem (`PIPA_TOKEN`) | baris ALGORITMA 2, kontrak sama dengan sumber lain |
| `POST /api/siklus/ingest/kejadian` (ubah) | sistem | menolak aksi `baru` untuk sumber `alun` |
| `GET /api/siklus/ingest/alun_rekap` | sistem | baris ALGORITMA 9; hanya kolom yang sudah publik atau hitungan; tanpa judul |
| `GET /api/instansi/alun` | sesi instansi aktif | kotak masuk berhalaman, tersaring wilayah di SQL atas `alun_wilayah` |
| `GET /api/instansi/alun/:id` | sesi instansi aktif, utas dalam wilayah | rincian, balasan, riwayat (termasuk catatan staf) |
| `POST /api/instansi/alun/balas/:id` | seperti di atas | balasan atas nama lembaga |
| `POST /api/instansi/alun/status/:id` | seperti di atas, jenis akun pemprov, pemkab, pemkot | ubah status, tulis riwayat |
| `POST /api/instansi/alun/tanda/:id` | sesi instansi aktif, utas dalam wilayah | tandai tidak valid |
| `POST /api/alun` (ubah) | publik seperti sekarang | menerima `kab4`; menulis `alun_wilayah`; memicu pemberitahuan sesuai ALGORITMA 8 |
| `POST /api/alun/buka/:id` | pelapor (kode pemilik atau `sesi_masuk` penulis) | menyatakan belum selesai |
| `GET /api/alun`, `GET /api/alun/:id` (ubah) | publik | tambah `kejadian` (hanya kejadian yang lolos syarat ringkasan publik), `lembaga` pada balasan, `riwayat` publik pada rincian |
| `POST /api/alun/admin/:id` (ubah) | moderator | ubah status wajib alasan untuk selesai; sembunyikan dan hapus mencabut tautan; cabut tanda tidak valid |
| `GET /api/alun/admin` (ubah) | moderator | antrean "ditandai tidak valid"; statistik dibaca dari rekap |
| `GET /api/alun/rekap` | admin; staf berperan pimpinan, koordalops, pusdalops | membaca berkas rekap dari R2; rincian tersaring `wilayahStaf` |
| rute Siklus untuk kabar warga satu kejadian | sesuai hak Siklus | utas terpasang yang masih tampil |

Catatan:

- Router hanya mengenal `:id` 16 heksadesimal di ujung jalur; nama rute tanpa tanda strip.
- Rute `/api/instansi/alun*` memakai penjaga modul instansi yang ada (header `x-pb`, sesi, lingkup). Rute `/api/alun/*` dijaga pemeriksa Origin yang ada (`tolakOrigin`), Turnstile, dan batas laju; batas laju dicek sebelum pembacaan sesi.
- Jawaban baca publik lewat `cacheTepi` 10 detik. Tanda kejadian digabungkan hanya di jalur publik dan hanya untuk kejadian yang memenuhi syarat ringkasan publik (syarat yang sama dengan `skKejadianPublik`). Jalur moderator yang tanpa cache tidak memakai fungsi yang sama untuk menampilkan kejadian belum publik; staf melihat tautan lewat rute Siklus. Ada uji bahwa jawaban ber-cache sama untuk pemanggil bersesi staf dan tamu.
- Pembacaan tabel `sk_*` dari alun-alun lewat `sedia()` dengan pelaku yang didaftarkan di `MATRIKS`.
- Nama peran staf untuk rute rekap dicocokkan dengan `src/staf.js` saat AT-09c.
- Tabel paket ini belum ada: forum tetap jalan; kabupaten tetap divalidasi tetapi tanpa baris wilayah; kotak masuk dan ubah status menjawab 503.

## 4. Pipeline

- `pasang.py`: `alun` masuk `SUMBER_MODUL` dan paling akhir di `PRIORITAS_MASUK`; cabang khusus sesuai ALGORITMA 3 (melewati pemeriksaan satu-entri-per-sumber, tidak pernah `baru`, tidak dihitung untuk siap verifikasi).
- `alun_rekap.py`: stdlib saja. Menarik `ingest/alun_rekap` dengan kursor, menghitung ALGORITMA 9, menulis lewat gudang Siklus ke kunci di bawah `siklus/saji/alun/` (`rekap_ringkas.json`, `rekap_rinci.json`); gudang menolak kunci di luar `siklus/`. Kedua berkas membawa `dihitung`, `rentang`, `sumber`.
- Jadwal: ikut jadwal `siklus.yml` yang ada. Tidak ada cron Worker baru.

## 5. Pemberitahuan

`tulis()` alun-alun menerima `ctx` dari perute (perubahan kecil di pendaftaran rute). Sesudah menyimpan utas yang memenuhi ALGORITMA 8: `ctx.waitUntil(kabarAlun(...))`. `kabarAlun` mencari akun instansi wilayah lewat kode kabupaten (SQL berindeks di `hak.js`; tidak memakai daftar 500 akun pertama), memeriksa batas per wilayah dan per akun lewat tabel laju yang ada, lalu memanggil `kabarkan()` dengan kunci `alun:<id>`.

## 6. Anggaran D1

| Jalur | Biaya | Penjaga |
| --- | --- | --- |
| Kotak masuk | kueri berindeks atas `alun_wilayah` lalu utas per halaman | gerbang d1-pindai |
| Tanda kejadian di daftar publik | satu kueri `IN` ke `sk_kejadian_sumber` per halaman, di dalam cache 10 detik | cache |
| Ingest modul dan rekap | kursor `(dibuat, id)` berindeks; sekali per jadwal | indeks baru |
| Rekap di layar | satu baca R2, tanpa D1 | D13 |
| Pemberitahuan | satu kueri akun wilayah per utas terverifikasi | batas ALGORITMA 8 |

Statistik admin alun-alun yang sekarang memindai tabel diganti pembacaan rekap pada AT-09c; plafon pindai `src/alun.js` di `tests/agen/fixtures/d1-pindai.json` turun dan hanya boleh menyusut.

## 7. Ketahanan

| Keadaan | Perilaku |
| --- | --- |
| Migrasi paket ini belum jalan | forum jalan; kotak masuk dan ubah status 503; tanpa pemberitahuan |
| Migrasi Keterpaduan belum jalan | tanda kejadian kosong |
| Rekap belum ada atau lama | "Rekap belum tersedia" atau tanggal rekap terakhir |
| Tidak ada akun instansi di wilayah itu | tanpa pemberitahuan; pengingat admin `bantuan_terbuka` tetap |
| `kabarkan()` gagal | utas tetap tersimpan |

## 8. Catatan keputusan teknis

| No | Keputusan | Alternatif yang ditolak |
| --- | --- | --- |
| T1 | Tautan kejadian lewat `sk_kejadian_sumber` | kolom `kejadian_id` di `alun_utas`: butuh `ALTER` dan menyalin kebenaran |
| T2 | Kode kabupaten disimpan saat tulis di tabel samping | dihitung dari teks saat dibaca: tiga pencocok nama berbeda memberi hasil berbeda |
| T3 | Rute lembaga di bawah `/api/instansi/alun` | mengubah path cookie instansi: menyentuh semua modul instansi |
| T4 | Rekap oleh pipeline ke gudang privat | kueri agregat saat layar dibuka: memindai tabel |
| T5 | Riwayat tanpa trigger, dijaga kode dan gerbang | trigger penolak: menggagalkan penghapusan utas |
| T6 | Larangan membuat kejadian di pencocok dan di rute Worker | hanya di pencocok: rute Worker menerima aksi dari sumber mana pun |
| T7 | Penanda lembaga di tabel samping | kolom `petugas`: mencampur petugas pusat dan lembaga daerah, dan menempel ke kiriman pribadi |
| T8 | Tautan dicabut di Worker saat moderasi | aksi ingest "lepas" dari pipeline: pipeline tidak tahu utas yang sudah hilang |
