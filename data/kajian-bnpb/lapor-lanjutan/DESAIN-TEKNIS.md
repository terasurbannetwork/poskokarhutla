# DESAIN-TEKNIS: Data lanjutan BPBD

## Berkas dan pemilik

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `src/lapor_lanjut_spek.js` | spek tujuh jenis objek dan isian berkas, validasi, penanda, rekap, kondisi akhir, sidik (fungsi murni ALGORITMA) | `warga-api` |
| `src/lapor_lanjut.js` | rute `/api/lapor/data/*`, pembukaan berkas, tim dan token, pertanyaan harian, penutupan, dorong ke meja, terima ke Jitupasna | `warga-api` |
| `src/lapor_lanjut_mesin.js` | mesin murni percakapan WA tahap 2 tanpa AI (D24): rumah dan prasarana sekarang; tim, jawaban harian, penutupan menyusul (LJ-08, LJ-09, LJ-10) | `warga-api` |
| `src/lapor_ai.js` | gerbang izin: nomor aktif di `lj_tim` lolos hanya untuk jalur berkas (D11); selesai unggah video bersambung berkonteks objek menulis `lj_media` | `warga-api` |
| `src/lapor_lanjut_meja.js` | LJ-12: `dorongRekap` (rekap berkas ke meja `dampak` dan `pengungsi`, dipanggil sesudah tulis objek, batal, nihil) dan `terimaJitupasna` | `warga-api` |
| `src/meja_spek.js`, `src/meja.js` | LJ-12: kunci sistem `lapor_*` di data catatan `dampak` (`sistem`, `KOLOM_DAMPAK`) dan `lapor_berkas` di `pengungsi`; `meja.js` `ubah` menghitung ulang tanda `beda_sumber` dan menerima `terima_rekap` | `warga-api` |
| `src/hak.js` | entri `MATRIKS` tabel `lj_*` untuk rute lapor data | `warga-api` |
| `src/worker.js` | daftar rute (`RUTE_LAPOR`), halaman `/lapor/data` (kuki berkas, bukan sesi staf, jadi masuk `PUBLIK_TANPA_SESI` untuk halamannya saja) | `warga-api` |
| `migrations/0161_lapor_data.sql` | tabel `lj_*` | `warga-api` |
| `migrations/0165_lj_sesi.sql` | `lj_sesi`: draf percakapan WA per nomor anggota (D24) | `warga-api` |
| `tests/warga/cakupan.json` | entri tiap tabel dan rute baru | `warga-api` |
| `scripts/siklus/pasang.py` | usulan fase dari penutupan berkas lewat sumber `lapor_ai` yang sudah ada | `siklus` |
| `scripts/wa/**` (gateway) | ambil antrean `lj_kabar`, kirim, tandai terkirim | `wa-bot` |
| `public/lapor/data/index.html`, `data.js`, `data.css` | layar web per objek dan tim | `layar-peta` |
| rincian "Data lanjutan" di `public/lapor/meja*` dan pilihan sumber di layar meja `dampak` | layar staf | `layar-peta` |
| `tests/lapor/lanjut_spek.test.mjs`, `tests/lapor/lanjut_rute.test.mjs` | uji murni dan uji rute Miniflare | `warga-api` |
| `tests/lapor/lanjut_rekap.test.mjs` | LJ-12: uji murni gabungan rekap dan bahan Jitupasna, uji rute rekap ke meja dan Terima ke Jitupasna (Miniflare) | `warga-api` |

Folder baru `public/lapor/data/` berada di bawah `public/lapor/` (bukan folder akar baru).

## Skema D1 (0161, hanya `CREATE ... IF NOT EXISTS`, tanpa trigger, tanpa ALTER)

Ringkasan; berkas `migrations/0161_lapor_data.sql` adalah acuan dan memuat CHECK lengkap (format nomor WA, rentang koordinat, kunci R2 di `lapor/data/`, FK ke `lj_berkas` dan `lj_objek`, token selalu berkedaluwarsa).

```sql
CREATE TABLE IF NOT EXISTS lj_berkas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  induk TEXT NOT NULL CHECK (induk GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) <= 10),
  kejadian_id TEXT CHECK (kejadian_id IS NULL OR (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????')),
  kab4 TEXT CHECK (kab4 IS NULL OR (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*')),
  status TEXT NOT NULL CHECK (status IN ('terbuka', 'usul_tutup', 'selesai', 'selesai_catatan')),
  isian TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(isian) AND length(isian) <= 6000),
  ditutup INTEGER,                   -- waktu penutupan diterima staf; awal hitungan 5 tahun (D23)
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL,
  UNIQUE (induk, kab),
  CHECK ((status IN ('selesai', 'selesai_catatan')) = (ditutup IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS lj_tim (
  berkas TEXT NOT NULL, wa TEXT NOT NULL,
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 1 AND 120),
  peran TEXT NOT NULL CHECK (peran IN ('ketua', 'anggota')),
  token_sha TEXT UNIQUE CHECK (token_sha IS NULL OR length(token_sha) = 64),
  kedaluwarsa INTEGER,
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, dicabut INTEGER,
  PRIMARY KEY (berkas, wa)
);
CREATE TABLE IF NOT EXISTS lj_objek (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  berkas TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('rumah', 'prasarana', 'titik', 'jiwa', 'korban', 'usaha', 'kebutuhan')),
  urut INTEGER NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data) AND length(data) <= 4000),
  pribadi TEXT CHECK (pribadi IS NULL OR (json_valid(pribadi) AND length(pribadi) <= 2000)),
  titik_id TEXT,                     -- TP- untuk jiwa dan titik
  desa TEXT, lat REAL, lon REAL,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'batal')),
  klien_id TEXT UNIQUE,              -- idempoten untuk antrean luring
  oleh TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0,
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL,
  UNIQUE (berkas, jenis, urut)
);
CREATE TABLE IF NOT EXISTS lj_jejak (       -- append-only; pribadi hanya sidik (D4)
  id INTEGER PRIMARY KEY, objek TEXT, berkas TEXT NOT NULL,
  aksi TEXT NOT NULL, sebelum TEXT, sesudah TEXT, pribadi_sidik TEXT,
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lj_media (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  objek TEXT NOT NULL, kunci_r2 TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('foto', 'video', 'wajah', 'dokumen')),
  lat REAL, lon REAL, akurasi REAL, waktu_ambil INTEGER, waktu_terima INTEGER NOT NULL,
  lencana TEXT NOT NULL CHECK (lencana IN ('gps', 'exif', 'wa', 'tanpa')),
  pintu TEXT NOT NULL CHECK (pintu IN ('wa', 'web')), oleh TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lj_tanya (
  berkas TEXT NOT NULL, tgl TEXT NOT NULL CHECK (length(tgl) = 10),
  jawab TEXT, waktu INTEGER NOT NULL, PRIMARY KEY (berkas, tgl)
);
CREATE TABLE IF NOT EXISTS lj_kabar (       -- antrean pesan WA tahap 2 (D12)
  id INTEGER PRIMARY KEY, wa TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('pembuka', 'harian', 'tim', 'tutup')),
  teks TEXT NOT NULL CHECK (length(teks) <= 2000),
  dibuat INTEGER NOT NULL, terkirim INTEGER
);
CREATE TABLE IF NOT EXISTS lj_beku (        -- tanpa data pribadi (D14)
  berkas TEXT NOT NULL, versi INTEGER NOT NULL,
  isi TEXT NOT NULL, sidik TEXT NOT NULL CHECK (length(sidik) = 64),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL, PRIMARY KEY (berkas, versi)
);
CREATE TABLE IF NOT EXISTS lj_akses (       -- append-only (D22)
  id INTEGER PRIMARY KEY, berkas TEXT NOT NULL, objek TEXT,
  aksi TEXT NOT NULL CHECK (aksi IN ('buka', 'tampil_pribadi', 'media')),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL
);
```

Tambahan 0165 (LJ-05, D24), draf percakapan WA tahap 2, satu baris per nomor, tanpa trigger dan tanpa ALTER:

```sql
CREATE TABLE IF NOT EXISTS lj_sesi (
  wa TEXT PRIMARY KEY CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  berkas TEXT NOT NULL REFERENCES lj_berkas (id),
  keadaan TEXT NOT NULL CHECK (json_valid(keadaan) AND length(keadaan) <= 6000),   -- isian yang sedang diketik, termasuk pribadi; mesin menolak > 5500
  diubah INTEGER NOT NULL                                                         -- penjaga bentrok dua pesan serentak dan umur draf (24 jam)
);
```

Hak (`MATRIKS`): `lj_tim` baca, tambah, ubah, hapus; `lp_mesin` baca; `lp_cron` baca, hapus. Keadaan sesudah simpan tidak menyimpan isian apa pun (hanya jenis, desa, kecamatan terakhir).

Indeks: `lj_berkas (status)`, `lj_berkas (kejadian_id, kab4)`, `lj_objek (berkas, jenis, status)`, `lj_objek (titik_id)`, `lj_tim (wa)`, `lj_jejak (berkas, id)`, `lj_media (objek)`, `lj_kabar (terkirim, id)`, `lj_akses (berkas, waktu)`.

## R2

`lapor/data/<berkas>/<objek>/<media>.jpg|.vid|.pdf`. Foto wajah di `lapor/data/<berkas>/wajah/`. Disajikan hanya lewat rute berkuki atau bersesi dengan `Cache-Control: private, no-store`; kunci tidak bisa ditebak (id acak).

## Hak dan token

- Tautan dari WA membawa token anggota sekali pakai; halaman menukarnya ke kuki HttpOnly `lapor_data` (pola `lapor_perangkat`, 0159) lalu menghapus token dari URL. Sidik token di `lj_tim.token_sha`, `kedaluwarsa` (Q11).
- Hak dihitung per permintaan dari `lj_tim` (peran, dicabut) dan, untuk staf, dari sesi staf; tidak ada token bersama.
- Gambar media memakai kuki, tidak pernah token di query.

## Rute

| Metode dan jalur | Hak | Isi |
| --- | --- | --- |
| `GET /api/lapor/data/berkas` | tim berkas (kuki), staf | berkas, tim, rekap, objek; tim melihat `pribadi` utuh, staf tersamar |
| `GET /api/lapor/data/daftar` | staf Pusdalops, admin, akun lembaga (Q15) | daftar berkas lintas kab sesuai hak wilayah |
| `POST /api/lapor/data/tampil` | staf | satu objek `pribadi` utuh, tercatat `lj_akses` |
| `POST /api/lapor/data/objek` | tim berkas | tambah atau ubah (idempoten `klien_id`, 409 bila `rev` lama) |
| `POST /api/lapor/data/batal` | ketua; anggota untuk objek isiannya | `{objek, rev, alasan}`, batal dengan alasan |
| `POST /api/lapor/data/isian` | ketua berkas (anggota 403) | `{isian: {status_darurat, sk_nomor, sk_tanggal, posko: {nama, titik, nomor}, upaya, personel}}`, digabung ke `lj_berkas.isian` dengan satu `json_patch` (null menghapus butir); `posko.titik` harus titik aktif berkas ini; jejak `isian` (LJ-08) |
| `POST /api/lapor/data/nihil` | tim berkas | `{metrik, nihil: true\|false}`, hanya nama di `METRIK_NIHIL`; 409 bila metrik sudah punya objek aktif; objek baru atau diubah mencabut nihil metriknya di batch yang sama (jejak `nihil_cabut_otomatis`) (LJ-08) |
| `POST /api/lapor/data/foto` | tim berkas | foto JPEG kamera `{objek, data, gps, exif}`, EXIF dibuang, foto lama diberi penanda (tidak ditolak); video menyusul di LJ-18 |
| `POST /api/lapor/data/tim` | ketua lewat kuki (`tambah`, `cabut`, `token_baru` untuk anggota lain), staf Pusdalops dan admin (`cabut`, `pindah_ketua` Q14; wajib `berkas`) | body `{aksi: "tambah"\|"cabut"\|"pindah_ketua"\|"token_baru", wa, nama?, berkas?}`; `wa` dinormalkan (08.. atau +62.. jadi 62..); jawaban `{pesan, tim: [{wa, nama, peran, aktif}]}` (nomor tersamar bagi staf). `tambah`: tanpa konfirmasi admin (Q5), hanya saat berkas terbuka, 409 bila sudah aktif atau 20 anggota aktif (HIPOTESIS), nomor yang dulu dicabut diaktifkan ulang (token baru), token 30 hari (Q11) dikirim lewat `lj_kabar` jenis `tim`. `cabut`: tanpa syarat berkas terbuka, set `dicabut` dan kosongkan `token_sha` (kuki orang itu mati, yang lain tidak), draf `lj_sesi` dibuang, objek tetap; ketua tidak bisa dicabut (409). `pindah_ketua`: satu batch, ketua lama jadi anggota. Jejak `tim_*` (nomor tersamar plus sidik HMAC). WA: `tim`, `tim tambah <nomor> [nama]`, `tim cabut <nomor>`, `tautan` (tautan baru untuk diri sendiri); nama anggota ditanya di pesan pertamanya (draf `lj_sesi` tahap `nama`) (LJ-09) |
| `POST /api/lapor/data/tutup` | ketua lewat kuki (anggota 403); header `x-pb` | LJ-13: body `{tgl_selesai, sk_nomor?, sk_tanggal?, catatan?, konfirmasi}`. Tanpa `konfirmasi: true` = pratinjau `{rekap, kondisi}` tanpa menulis. Dengan konfirmasi: kondisi akhir dihitung dari daftar pada `tgl_selesai` (ALGORITMA 5), `lj_berkas` jadi `usul_tutup` dengan `isian.penutupan` (status akhir ikut tersimpan), versi baru di `lj_beku` (nomor versi diambil di SQL), jejak `usul_tutup`; 409 bila berkas atau objeknya berubah sejak dihitung. Tanggal tidak di masa depan; SK dan catatan tanpa nomor HP atau NIK. Foto kondisi akhir dan berkas SK menyusul di layar LJ-15 (`lj_media` berkunci objek). WA: `tutup`, `tutup 2`, `tutup 20-11-2026` (nomor = urutan pertanyaan harian) |
| `POST /api/lapor/data/terima` | staf Pusdalops BNPB dan admin (`hakData`, sama dengan Tampilkan); header `x-pb`; laju 60 per jam per staf | LJ-12: body `{berkas, aksi}`; aksi tertutup pada tabel `AKSI_TERIMA` di `src/lapor_lanjut.js`. `jitupasna` (D8): 409 bila berkas belum punya `kejadian_id`, Jitupasna kab belum dibuka (mesin tidak membuatnya), sedang dihitung atau ditinjau, atau final (pesan menyuruh membuka revisi); selain itu upsert baris `rusak` per (sektor, tingkat) lewat `klien_id` tetap `lj<berkas><indeks sektor><tingkat>` (terima ulang memperbarui, baris yang tak ada lagi dinolkan, tidak digandakan), jejak `sk_jejak` dan `lj_jejak`. LJ-13: `tutup` (hanya dari `usul_tutup`): status jadi `selesai` atau `selesai_catatan` dari `isian.penutupan.status`, `ditutup` = awal hitungan 5 tahun (D23), `lj_kabar` jenis `tutup` ke ketua, tiket `LA-` ke `selesai` dengan riwayat dan kabar status bila tidak ada berkas lain tiket itu yang masih `terbuka` atau `usul_tutup`. `buka` (`{berkas, aksi, alasan}`, 5 sampai 400 huruf tanpa nomor): dari status mana pun selain `terbuka` kembali `terbuka`, `ditutup` dikosongkan, `isian.penutupan` dihapus, ketua dikabari dengan alasannya; versi lama tetap, penutupan berikutnya versi baru. Tiket yang sudah `selesai` tidak ikut dibuka lagi |
| `GET /api/lapor/data/media?id=` | tim berkas, staf Pusdalops, akun lembaga kab (foto saja, bukan wajah) | sajikan media, tercatat `lj_akses` |

Semua rute: metode dibatasi, isian divalidasi spek, batas laju per nomor (pola rute lapor), ukuran foto mengikuti `lapor_foto`.

## Sambungan

- **Buku Besar.** `kejadian_id` dan `kab4` diisi saat tiket induk sudah ditempel `pasang.py` (dibaca dari tautan sumber `lapor_ai`). Tanpa itu, dorongan ke meja `dampak` tetap jalan (catatan meja tidak berkunci kejadian), tetapi Lifeline dan Jitupasna ditahan dan layar menulis "belum tertaut ke kejadian". Mesin tidak pernah membuat kejadian. Penutupan yang diterima staf menjadi usulan fase lewat `pasang.py`.
- **Meja `dampak` (LJ-12, tanpa migrasi).** Satu catatan per berkas; `meja_catatan.id` = `lj_berkas.id`, jadi dicari lewat PK (tanpa indeks ekspresi baru) dan dibuat `INSERT OR IGNORE` oleh pelaku `lj_rekap` (`oleh` = `lapor_lanjut`) dengan jenis, nama `<Jenis> <kab> (<induk>)`, dan tanggal dari tiket induk (`DAMPAK_DARI_LAPOR`; jenis tanpa padanan jatuh ke `lainnya`). "Kolom sistem" = kunci di `data` seperti `logbook_id`, dipertahankan `ubah`: `lapor_berkas`, `lapor_daftar` (rekap terakhir yang diterapkan), `lapor_sumber` (`{kolom: "daftar"}` = kolom diisi mesin), `lapor_nihil` (bagian yang pilihan "tidak ada"-nya dari mesin), `lapor_beda` (daftar kolom `beda_sumber`: angka ketikan lain dari daftar, keduanya disimpan), `lapor_rekap_baru` (`{nilai, nihil, waktu}`). Aturan di `gabungDampak` (murni): kolom kosong atau kolom bersumber daftar yang masih utuh diisi daftar, kolom ketikan tidak pernah ditimpa; nilai `null` tidak ditulis; bagian `rumah` atau `prasarana` yang seluruh metriknya nihil menjadi `nihil_<bagian>` (kolomnya dikosongkan, `bentrokNihil` menolak 0); catatan `diverifikasi` atau `masuk_logbook` tidak berubah isi dan hanya mendapat `lapor_rekap_baru` (`diubah` tidak maju); petugas memilih sumber dengan mengubah isi kolom (tanda dihitung ulang di `meja.js`), dan menerima rekap baru dengan `ubah` + `terima_rekap: true` (status kembali `dilaporkan`, seperti ubah isi biasa).
- **Pemicu rekap (LJ-12).** Sesudah tulis objek, batal, atau nihil, di request yang sama (`dorongRekap`), bukan cron: rekap selalu dihitung ulang penuh dari daftar sehingga yang terlewat sembuh pada tulis berikutnya; cron akan membaca semua berkas terbuka tiap menit (kuota baca D1) tanpa indeks "kotor" yang butuh migrasi. Biaya per tulis: 4 baca berindeks (berkas, objek berkas, catatan dampak lewat PK, satu batch catatan pengungsi bila ada titik berpengungsi); tulis hanya bila hasil berubah, dijaga isi lama (`data = ?`). Galat rekap ditelan ke log dan tidak menggagalkan tulis objek.
- **Meja `pengungsi` (LJ-12).** Satu catatan per (titik, tanggal WIB hari ini) lewat indeks unik 0135, dari `titikHari`: jumlah per kelompok umur dan L/P untuk jiwa aktif (semua jiwa punya umur dan jenis kelamin, jadi kelompok kosong = 0 dari data), `kk`, enam sektor `keb_*` apa adanya dari objek titik, `kejadian` dari jenis tiket induk (`BENCANA_DARI_LAPOR`), `lapor_berkas`. Dibuat bila ada jiwa aktif; catatan yang sudah ada hanya diperbarui bila `lapor_berkas` sama (catatan ketikan petugas atau berkas lain tidak disentuh); `kec` kosong (titik hanya punya desa). Hari lampau tidak ditulis ulang. Bila petugas pernah mengubah catatan (penulis terakhir di `meja_jejak` bukan `lapor_lanjut`), isinya tetap dan hanya diberi `lapor_rekap_baru` tanpa jejak baru. Jiwa terakhir keluar atau batal: catatan hari itu ditutup lewat `tgl_tutup` (= kemarin, atau `tgl_buka` bila titik baru buka hari ini sehingga baru berlaku besok; jalur sah satu-satunya tanpa migrasi), angka terakhir tidak diubah jadi 0, penanda `lapor_tutup`; dibuka lagi bila jiwa kembali.
- **Jumlah antarsumber.** `kumpul` di `src/meja.js` tidak menjumlah catatan `dampak` berkunci `lapor_berkas` bila ada catatan ketikan untuk kab dan kejadian yang sama; kejadian = jenis + tanggal (nama kejadian ketikan bebas, tak pernah sama dengan nama otomatis berkas). Dua kejadian berbeda berjenis dan bertanggal sama di satu kab dianggap satu (berkas tidak dijumlah: kurang, bukan lebih).
- **Batas yang diketahui (LJ-12).** (a) Penanda `foto_jauh`, `foto_lama`, dan sejenisnya belum dikonfirmasi petugas. (b) Invarian validasi jiwa (kepala keluarga, titik) dijaga saat simpan, tidak ditinjau ulang bila objek lain berubah sesudahnya. (c) `unit_asal = rekap_rumah_rusak` memberi label rekap pada baris yang bersumber daftar berkas, bukan tabel `rumah_rusak`. (d) Catatan pengungsi yang disunting petugas tidak punya jalur "terima rekap" (hanya tanda). (e) Titik buka hari ini yang jiwanya habis hari itu baru tertutup besok.
- **Lifeline.** Hanya lewat kolom prasarana meja `dampak` (D7).
- **Jitupasna.** `sk_jitupasna_baris` hanya dari rute terima; Jitupasna final menolak dengan pesan (D8). Sektor: rumah `perumahan`; prasarana lewat `SEKTOR_PRASARANA` (jembatan dan jalan `jalan_jembatan`, sinyal `telekomunikasi`, air `air_sanitasi`, sekolah `pendidikan`, faskes `kesehatan`, ibadah `agama`, kantor `sarana_pemerintahan`, pasar `perdagangan`, listrik, irigasi, transportasi, spbu memakai namanya sendiri dan jatuh ke `belum_terpeta` di Jitupasna, `lainnya` dilewati); unit = jumlah objek. Jalan ditahan dari Terima (masuk `dilewati.jalan_ditahan_satuan_harga_belum_dikonfirmasi`): satuan harga jalan belum dikonfirmasi (U10); jembatan tetap per unit. Hak `sk_*` hanya milik pelaku `lj_terima` (dipakai `terimaJitupasna` saja): baca `sk_kejadian` dan `sk_jitupasna`, baca, tambah, ubah `sk_jitupasna_baris`, tambah `sk_jejak`; `lp_staf` tidak mendapat hak itu. Rute `terima`: laju per IP 120 per jam sebelum autentikasi, lalu 60 per jam per staf, dan `dalamWilayahStaf` untuk provinsi berkas (staf berwilayah lain 403).
- **WA.** Mesin tahap 2 di `lapor_lanjut_mesin.js` (D24), disambung di `pesan()` dan `fotoPost()` `src/lapor_ai.js` pada jalur mesin (Bearer `WA_MESIN`) SEBELUM daftar izin: nomor dengan baris `lj_tim` aktif (dicabut kosong, berkas terbuka) yang punya `lj_sesi` atau mengetik perintah tahap 2 dilayani `pesanTim` dan `fotoTim` di `src/lapor_lanjut.js`, dengan jawaban berbentuk sama (`balasan`, `teksWa`, `status: "data_lanjutan"`); selain itu alur Lapor biasa tak berubah. Objek disimpan lewat `simpanObjek` yang sama dengan web (`oleh` = `tim:<wa>`, `klien_id` = `wa-<mulai>`), foto lewat `simpanFoto` (pintu `wa`, lencana `wa` bila gateway mengirim lokasi). Tidak ada router WA baru; antrean keluar `lj_kabar` diambil gateway.
- **Antrean keluar (LJ-11).** `kabarGet` (`src/lapor_ai.js`) menggabungkan `lapor_kabar`, `lapor_kabar_bpbd` (id `b<n>`) dan `lj_kabar` (id `l<n>`, jenis tetap, `url` dan `nomor` null, paling banyak 20 per putaran, `ljKabarAntre` di `hak.js`, indeks `lj_kabar_antre`). `kabarTerkirim` menerima `l<n>`: `terkirim` diisi dan `teks` jadi `-` (CHECK menolak kosong; pesan pembuka dan tim memuat token mentah). Cron menit 17 (`bersihkanLapor`, `ljKabarBersih`) menghapus pembuka belum terkirim lebih dari 1 hari dan baris terkirim lebih dari 30 hari. Gateway tidak berubah.
- **Pertanyaan harian (LJ-10).** `tanyaHarian` di `src/lapor_lanjut.js`, dipanggil `scheduled` (cabang `* * * * *`) dan hanya bekerja pada 16.00 dan 16.30 WIB (`JAM_TANYA_WIB`, bawaan Q3; menit 30 = ulang, idempoten lewat PK `lj_tanya`). Satu kueri `ljBelumTanya` (indeks `lj_berkas_status`, PK `lj_tanya`, PK `lj_tim`; bukan SCAN) menyaring berkas terbuka, ketua aktif, nomor di `lapor_izin` (gerbang F0); satu `lj_kabar` jenis `harian` per ketua (bernomor bila beberapa berkas, maks 200 berkas per putaran, dipotong "dan N berkas lain") dan satu `lj_tanya` per berkas dalam satu batch. Jawaban "masih" atau "selesai" (dengan nomor bila beberapa) ditangani `jawabHarian` lewat `pesanTim`, hanya untuk ketua dan hanya bila hari ini ada pertanyaan; "selesai" hanya mencatat, penutupan menunggu LJ-13.
- **Penutupan (LJ-13).** Begitu berkas tidak `terbuka`, semua tulis tim kalah di SQL, bukan hanya di kode: `ljStmtObjekBaru`, `ljStmtObjekUbah`, `ljStmtObjekBatal`, `ljStmtObjekTitik`, `ljStmtMediaBaru`, `ljStmtNihilCabut` memuat `EXISTS (lj_berkas status terbuka)` (`ljStmtIsian` dan `ljStmtNihil` sudah). Versi beku: objek diwakili sidik HMAC berkunci `SESI_KUNCI` (awalan `lj-beku:`), bukan SHA-256 polos; `lj_beku.sidik` = SHA-256 isi kanonik (dipakai segel); `lj_beku.oleh` = `ketua` tanpa nomor, siapa yang menutup ada di `lj_jejak`. Jawaban harian *selesai* menampilkan kondisi akhir dan mengajak membalas *tutup*; penutupan tidak pernah otomatis.
- **Cron.** Cron menit yang ada; pemeriksaan pertanyaan harian hanya pada menit jam kirim (ALGORITMA 6).

## ADR

1. **Satu tabel objek JSON**, bukan tabel per jenis: CHECK SQLite tidak bisa diubah tanpa membangun ulang tabel, dan spek jenis akan berubah (pola `meja_catatan`).
2. **`pribadi` kolom terpisah**: data pribadi bisa dikosongkan saat masa simpan 5 tahun habis (K9, D23) tanpa menyentuh rekap, jejak, atau versi.
3. **Tidak memakai tabel `korban` (0034)**: tabel itu satu baris per kejadian berisi jumlah dan CHECK bencana terbatas; tahap 2 per orang.
4. **Tidak memakai `lapor_kabar` atau `lapor_kabar_bpbd`**: CHECK jenis tertutup dan bentuknya per tiket atau per lembaga.
5. **Tidak membuat baris `orang`** untuk pengungsi atau korban: register `orang` untuk pegawai dan relawan.
