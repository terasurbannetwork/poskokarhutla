# DESAIN-TEKNIS: Satu Pintu Masuk

Semua rujukan berkas dan baris diukur 15 Nov 2026; cek ulang sebelum dipakai.

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `src/masuk.js` (baru) | rute `/masuk` dan `/api/masuk/*`, kode, akun umum, pemilih ruang | `warga-api` |
| `src/hak.js` (ubah) | semua SQL paket ini (fungsi `mk*`); gerbang `gerbang-d1` melarang akses D1 di berkas `src` baru | `warga-api` |
| `src/masuk_sesi.js` (baru) | pembaca cookie `sesi_masuk` tanpa SQL; dipisah supaya `src/lapangan.js` dan `src/relawan.js` tidak mengimpor `masuk.js` secara melingkar | `warga-api` |
| `src/masuk_konst.js` (baru) | semua ambang ALGORITMA | `warga-api` |
| `src/masuk_undang.js` (baru) | anggota, undangan berantai, papan aktivasi | `warga-api` |
| `migrations/0133_masuk.sql` | tabel `mk_*`, `alun_penulis`, indeks `wa` | `warga-api` |
| `public/masuk.html`, `public/masuk.js`, `public/masuk.css` (baru) | layar L1 sampai L5 | sekarang jatuh ke `layar-peta` menurut `ilmu.mjs pemilik`; PM-01 menambah entri roster supaya menjadi milik `warga-api` seperti `public/admin/masuk.html` |
| `public/inti/undang.js` (baru) | kartu "Undang rekan" L6 | `inti-layar` |
| `public/admin/aktivasi.js` (baru) | papan aktivasi L7 | `warga-api` |
| `src/worker.js` (ubah) | daftar rute, `PUBLIK_TANPA_SESI`, `sesi_masuk` masuk regex `tolakOrigin` (`:659-662`) | `warga-api` |
| `src/statistik.js` (ubah) | `/admin/masuk` menautkan ke `/masuk`; tetap menerima sandi | `warga-api` |
| `src/instansi.js`, `src/pendataan.js`, `src/kemitraan_akun.js` (ubah) | tiap modul mengekspor `sesiUntuk`, `cabutSesi`, dan `aturSandi` miliknya | `warga-api` |
| `src/pemirsa.js` (ubah) | mengekspor `sesiUntuk` dan `cabutSesi`; rute Super Admin mengisi nomor pemirsa | `warga-api` |
| `src/staf.js` (ubah) | hanya `cabutSesi`; sesi staf tetap lewat `cobaMasukStaf` | `warga-api` |
| `src/lapangan.js` (ubah) | `cariOrang` dan `cariRelawan` menerima sesi bernomor sama (4.3) | `warga-api` |
| `src/lapangan_wa.js`, `src/lapangan_panel.js` (ubah) | aturan tarik dan pembersihan baris `otp`; pembersihan `mk_*` | `warga-api` |
| `src/alun.js`, `public/bnpb/alun-alun.js`, `public/admin/alun.js` (ubah) | kiriman dari akun yang masuk; kode contoh dan tombolnya dibuang | `warga-api`, `ruang-bnpb` |
| `scripts/wa/lapangan_tarik.mjs` (ubah) | jeda tarik 5 detik | `wa-bot` |
| `tests/warga/masuk*.test.mjs` (baru) | uji integrasi RENCANA-UJI | `warga-api` |
| `tests/agen/gerbang-pintu-masuk.test.mjs` (baru) | gerbang larangan PRD | `penulis-gerbang` |

Tidak ada folder baru di `public/` atau `scripts/`. `src/bnpb.js` (`pemegangKode`, dipakai delapan modul) tidak diubah.

## 2. Skema D1 (hanya `CREATE ... IF NOT EXISTS`)

```sql
CREATE TABLE IF NOT EXISTS mk_akun (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  wa TEXT NOT NULL UNIQUE CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 80),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  setuju_pdp INTEGER,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'diblokir')),
  dibuat INTEGER NOT NULL,
  terakhir_masuk INTEGER
);

CREATE TABLE IF NOT EXISTS mk_sesi (
  token_sha TEXT PRIMARY KEY CHECK (length(token_sha) = 64),
  mk_id TEXT NOT NULL REFERENCES mk_akun (id) ON DELETE CASCADE,
  kode_pada INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  habis INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mk_sesi_akun ON mk_sesi (mk_id);

CREATE TABLE IF NOT EXISTS mk_kode (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nomor_sha TEXT NOT NULL CHECK (length(nomor_sha) = 64),
  kode_sha TEXT NOT NULL CHECK (length(kode_sha) = 64),
  saluran TEXT NOT NULL CHECK (saluran IN ('wa', 'email')),
  coba INTEGER NOT NULL DEFAULT 0 CHECK (coba >= 0),
  dibuat INTEGER NOT NULL,
  habis INTEGER NOT NULL,
  dipakai INTEGER
);
CREATE INDEX IF NOT EXISTS mk_kode_nomor ON mk_kode (nomor_sha, dibuat);

CREATE TABLE IF NOT EXISTS mk_anggota (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  mk_id TEXT NOT NULL REFERENCES mk_akun (id) ON DELETE CASCADE,
  tabel TEXT NOT NULL CHECK (tabel IN ('instansi_akun')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  status TEXT NOT NULL CHECK (status IN ('aktif', 'menunggu', 'dicabut')),
  jalur TEXT NOT NULL CHECK (jalur IN ('undang', 'kontak', 'email', 'tinjau')),
  rujukan TEXT NOT NULL,
  oleh TEXT,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  UNIQUE (mk_id, tabel, akun_id)
);
CREATE INDEX IF NOT EXISTS mk_anggota_akun ON mk_anggota (tabel, akun_id, status);

CREATE TABLE IF NOT EXISTS mk_undang (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 80),
  tabel TEXT NOT NULL CHECK (tabel IN ('instansi_akun', 'pdt_akun')),
  akun_id TEXT CHECK (akun_id IS NULL OR length(akun_id) = 16),
  oleh_tabel TEXT NOT NULL, oleh_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'terkirim' CHECK (status IN ('terkirim', 'diterima', 'dicabut')),
  dibuat INTEGER NOT NULL,
  habis INTEGER NOT NULL,
  CHECK ((tabel = 'instansi_akun') = (akun_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS mk_undang_wa ON mk_undang (wa, status);
CREATE INDEX IF NOT EXISTS mk_undang_akun ON mk_undang (tabel, akun_id, status);

CREATE TABLE IF NOT EXISTS mk_domain (
  domain TEXT NOT NULL CHECK (length(domain) BETWEEN 4 AND 120),
  tabel TEXT NOT NULL CHECK (tabel IN ('instansi_akun')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL,
  PRIMARY KEY (domain, tabel, akun_id)
);

CREATE TABLE IF NOT EXISTS mk_masuk_log (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  mk_id TEXT NOT NULL, tabel TEXT NOT NULL, akun_id TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mk_masuk_log_akun ON mk_masuk_log (tabel, akun_id, waktu);

CREATE TABLE IF NOT EXISTS mk_pemirsa_wa (
  pemirsa_id TEXT PRIMARY KEY CHECK (length(pemirsa_id) = 16),
  wa TEXT NOT NULL UNIQUE CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mk_denyut (
  nama TEXT PRIMARY KEY, waktu INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS alun_penulis (
  pos_id TEXT PRIMARY KEY CHECK (length(pos_id) = 16),
  mk_id TEXT NOT NULL,
  label TEXT CHECK (label IS NULL OR length(label) <= 80)
);

CREATE INDEX IF NOT EXISTS staf_wa ON staf (wa);
CREATE INDEX IF NOT EXISTS instansi_akun_wa ON instansi_akun (wa);
CREATE INDEX IF NOT EXISTS pdt_akun_wa ON pdt_akun (wa);
CREATE INDEX IF NOT EXISTS km_akun_wa ON km_akun (wa);
CREATE INDEX IF NOT EXISTS orang_wa ON orang (wa);
CREATE INDEX IF NOT EXISTS kontak_pemangku_wa ON kontak_pemangku (wa);
```

Catatan skema yang sudah dicek:

- Berkasnya `migrations/0133_masuk.sql` (PM-02). Nomor 0131 dilewati karena dipesan paket paritas-bencana. Lolos pemeriksa `migrasi-idempoten`.
- `mk_masuk_log` dan `alun_penulis` sengaja tanpa FK ke `mk_akun`: log masuk harus bertahan sesudah akun dihapus, dan baris `alun_penulis` dihapus oleh kode hapus akun (PM-14).
- `relawan` sudah punya indeks unik `relawan_wa_aktif` (`migrations/0023_relawan.sql:82`); tidak ditambah indeks baru.
- `wa_antre.jenis` hanya ber-CHECK panjang 1 sampai 20 (`migrations/0095_lapangan_orang.sql`), jadi jenis `otp` diterima tanpa migrasi.
- `instansi_akun` unik per `(jenis, kunci_wilayah)` dan status aktif mewajibkan `surat = 1 AND kartu = 1` (`0029:37-40`). Karena itu paket ini tidak membuat atau mengaktifkan baris `instansi_akun`; ia hanya menambah anggota.
- Kolom sandi `pdt_akun` bernama `sandi_hash`; tabel lain `sandi_sha`. `aturSandi` ditulis di modulnya masing-masing karena format berbeda.
- `mk_masuk_log` mencatat siapa masuk ke akun mana. Isian modul instansi masih mencatat akun, bukan orang; menautkan tiap isian ke anggota butuh perubahan modul instansi dan di luar paket ini.
- Alun-alun memakai tabel samping `alun_penulis` karena `ALTER TABLE ADD COLUMN` tidak idempoten (pola migrasi 0041 dan 0047).

## 3. Rute

| Rute | Hak | Isi |
| --- | --- | --- |
| `GET /masuk` | publik | halaman; `?ke=` disaring `tujuan()` (`src/statistik.js:251`) |
| `POST /api/masuk/kode` | publik, Turnstile, laju | minta kode |
| `POST /api/masuk/periksa` | publik, laju | periksa kode, terbitkan sesi, jawab daftar ruang |
| `POST /api/masuk/pilih` | sesi akun umum | menerbitkan sesi satu akun saat satu nomor terikat ke beberapa akun berjenis sama |
| `POST /api/masuk/pemirsa_wa` | Super Admin | mengisi atau menghapus nomor WA pemirsa (D17) |
| `POST /api/masuk/sandi` | sesi akun umum, `kode_pada` 15 menit | sandi staf lewat `cobaMasukStaf` |
| `GET /api/masuk/saluran` | publik, tanpa data pribadi | apakah saluran WA dan email sedang hidup (ALUR A8) |
| `GET /api/masuk/saya` | sesi akun umum | profil dan daftar ruang |
| `POST /api/masuk/lengkapi` | sesi akun umum | nama, wilayah, persetujuan |
| `POST /api/masuk/mohon` | sesi akun umum | permohonan anggota |
| `POST /api/masuk/email`, `/email/periksa` | publik atau sesi | kode ke email (ALGORITMA 2.4) |
| `POST /api/masuk/atur-sandi` | sesi akun umum, `kode_pada` 15 menit | sandi baru akun non-staf |
| `POST /api/masuk/hapus` | sesi akun umum | hapus akun umum sendiri |
| `POST /api/masuk/keluar` | sesi | cabut semua sesi peramban ini |
| `GET /api/masuk/undang`, `POST`, `POST /api/masuk/undang/:id/cabut` | anggota aktif, pemilik akun, staf | undangan |
| `GET /api/masuk/anggota`, `POST /api/masuk/anggota/:id/cabut` | pemilik akun, admin | daftar dan cabut anggota |
| `GET /api/masuk/aktivasi` | staf atau admin | papan 514 kab/kota, cache tepi 5 menit |
| `POST /api/masuk/domain` | admin | peta domain ke akun |

Semua rute `POST`: header `x-pb: 1` dan `Origin` sama situs wajib (form lintas situs tidak bisa mengirimnya), `bacaBody` berbatas, jawaban `no-store`. Tabel belum ada: 503 "fitur belum diaktifkan (migrasi masuk belum dijalankan)" dengan pola `tabelBelum` (`src/alun.js:40`).

## 4. Penerbitan sesi

### 4.1 Akun umum

Cookie `sesi_masuk`: token acak 32 byte, disimpan `sha256` di `mk_sesi`; `HttpOnly; Secure; SameSite=Lax; Path=/`. Lax supaya tautan dari WA tetap membawa sesi; karena itu `sesi_masuk` ditambahkan ke regex cookie `tolakOrigin`.

### 4.2 Akun peran bercookie

`src/masuk.js` tidak menulis ke tabel sesi modul lain. Ia memanggil fungsi modul itu:

| Fungsi | Isi |
| --- | --- |
| `sesiUntuk(env, akunId, kini)` | mengembalikan **larik** baris `set-cookie` (instansi menerbitkan dua cookie dengan dua Path, `src/instansi.js:104`; kampus `SameSite=Strict`) |
| `cabutSesi(env, req)` | mencabut sesi modul itu untuk peramban ini dan mengembalikan larik `set-cookie` penghapus |
| `aturSandi(env, akunId, sandi, kini)` | menyimpan sandi dengan format modul itu dan mencabut sesi lain |

Staf: tidak ada `sesiUntuk`. `POST /api/masuk/sandi` memanggil `cobaMasukStaf` (`src/staf.js:114`) dengan username akun yang nomornya terbukti, jadi penguncian dan hitungan gagal ikut aturan staf. `wajib_ganti = 1` diarahkan ke ganti sandi seperti sekarang.

Cookie bernama sama saling menimpa, jadi sesi otomatis hanya terbit bila tepat satu akun untuk jenis itu. Bila lebih dari satu, orang memilih di pemilih ruang dan `POST /api/masuk/pilih` menerbitkan sesi akun terpilih.

Keluar memanggil `cabutSesi` tiap modul dan menghapus `sesi_masuk`. `sesi_admin` tidak disentuh pintu ini. Panjang `pemirsa.id` dicocokkan dengan migrasi 0036 saat PM-02.

### 4.3 Relawan dan petugas

Kode pribadi hanya tersimpan sebagai sha, jadi tidak bisa dikirim ulang. Dua fungsi pencari di `src/lapangan.js` (`cariOrang` di `:63`, penjaga petugas di `:72`, dan `cariRelawan`) diberi satu jalur tambahan: tanpa header `x-kode`, bila ada `sesi_masuk` sah dan syarat ALGORITMA 3 terpenuhi (nomor cocok, status sah, tepat satu baris), baris itu dikembalikan dengan tanda `lewat_sesi`.

Dengan tanda `lewat_sesi`, persetujuan dan daftar wajah, absen pindai wajah, unggah dan lihat foto, pencabutan pendaftaran relawan, jawaban penugasan relawan, dan data kesehatan relawan (`gol_darah`, `darurat_wa`) **tidak** dibuka; hanya profil ringkas, penugasan, teks logbook, dan status siap atau istirahat. Hak penuh tetap lewat tautan kode pribadi. `pemegangKode` di `src/bnpb.js` tidak diubah, jadi meja, riset, SIPPA, kemitraan, dan alun-alun tidak terpengaruh.

## 5. Gerbang WA

- `antre()` (`src/lapangan_wa.js:37`) mengurutkan `jenis = 'otp'` lebih dulu dan menerapkan ALGORITMA 2.3.
- `scripts/wa/lapangan_tarik.mjs` menarik tiap 5 detik (sekarang 60 detik, baris 53).
- Denyut: tarikan memperbarui satu baris `mk_denyut` (`UPDATE`), hanya bila nilainya sudah berumur lebih dari 60 detik. Paling banyak 1.440 tulis per hari. Tidak ada KV di `wrangler.jsonc`, jadi KV tidak dipakai.
- Baca D1 dari tarikan diukur sebelum dan sesudah (uji P-5); jeda dinaikkan bila tarikan melewati 100 ribu baris baca per hari.

## 6. Rahasia dan konfigurasi

| Nama | Guna | Bila kosong |
| --- | --- | --- |
| `MASUK_KUNCI` (baru, paling sedikit 32 karakter) | HMAC kode dan nomor | `/api/masuk/*` 503 |
| `TURNSTILE_SECRET`, `TURNSTILE_SITEKEY` | pelindung minta kode | minta kode 503 |
| `WA_KUNCI` | gerbang WA | saluran WA dianggap mati |
| `EMAIL_API_KEY`, `EMAIL_FROM` | cadangan email | saluran email mati (`emailAktif`, `src/ews.js:54`) |

## 7. Pembersihan berkala

Ditambahkan ke pembersihan yang ada di `src/lapangan_panel.js:494` (sejam sekali; tanpa jadwal cron baru):

- `wa_antre` jenis `otp` berumur lebih dari 5 menit dihapus.
- `mk_kode` berumur lebih dari 1 hari dihapus.
- `mk_sesi` yang habis dihapus.
- `mk_undang` terkirim yang lewat 14 hari ditandai dicabut; baris yang sudah 90 hari lewat masa berlakunya dihapus.
- `mk_masuk_log` berumur lebih dari 400 hari dihapus.

## 8. Ketahanan

| Keadaan | Perilaku |
| --- | --- |
| Migrasi belum jalan | `/masuk` menampilkan "belum aktif" dan tautan ke masuk dengan sandi |
| Kuota baca D1 habis | minta kode gagal tertutup (tidak mengirim); pintu sandi akun rahasia tetap jalan seperti sekarang (`lunak`, `src/statistik.js:254`) |
| Gerbang WA mati | ALUR A8 |

## 9. Catatan keputusan teknis

| No | Keputusan | Alternatif yang ditolak |
| --- | --- | --- |
| T1 | Sesi peran diterbitkan modulnya sendiri | satu cookie baru untuk semua peran: harus menyentuh tiap penjaga hak |
| T2 | Kode disimpan sebagai HMAC berahasia | sha256 polos: enam angka bisa ditebak balik dari basis data bocor |
| T3 | Akun tujuan harus terikat langsung ke nomor terbukti | lewat `orang_akun`: pemetaan basi bisa membuka akun bernomor lain |
| T4 | Banyak orang per akun instansi lewat `mk_anggota` | baris `instansi_akun` per orang: ditolak UNIQUE dan CHECK 0029 |
| T5 | Relawan dan petugas: sesi bernomor sama membuka hak terbatas | menerbitkan kode baru: mematikan tautan yang sedang dipakai di lapangan; hak penuh lewat satu faktor: terlalu lemah untuk data wajah |
| T6 | Denyut gerbang satu baris yang di-UPDATE | sisip `laju_bnpb` tiap tarikan: 17.280 tulis per hari |
