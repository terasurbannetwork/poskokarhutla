# DESAIN-TEKNIS: Akun BPBD dengan profil PIC

Rujukan baris diukur 23 Nov 2026 pada pohon kerja yang sedang diubah sesi lain; cek ulang sebelum memakai. Nomor migrasi diambil saat tiket PF-01 dikerjakan (terakhir di repo 0163, D8). Gerbang yang berlaku: `gerbang-d1` (akses D1 hanya di `src/hak.js`), `gerbang-d1-pindai` (kueri tidak memindai penuh), `migrasi_beku.json`, `gerbang-token-warna`, `gerbang-kartu-std`.

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `migrations/<nomor>_profil_bpbd.sql` (baru) | tabel `instansi_profil`, `instansi_sesi_profil`, `instansi_profil_log`, indeks, trigger | `warga-api` |
| `tests/warga/migrasi_beku.json` (ubah) | sidik migrasi baru | `warga-api` |
| `src/hak.js` (ubah) | semua SQL paket ini sebagai fungsi `pf*` (`pfProfilAkun`, `pfBuat`, `pfUbah`, `pfSetFoto`, `pfSetPin`, `pfReservasiPin`, `pfBatalReservasi`, `pfSesiBaru`, `pfSesiDari`, `pfSesiCabut`, `pfKirim`, `pfSetuju`, `pfCabut`, `pfLog`, `pfLogDaftar`, `pfBersih`); `lpAkunMeja` dikurangi jenis pemda (`ALGORITMA` bagian 11) | `warga-api` |
| `src/profil.js` (baru) | rute akun-level dan admin profil, kuki `sesi_profil`, pengubah PIN, foto | `warga-api` |
| `src/profil_konst.js` (baru) | semua ambang `ALGORITMA.md` bagian 1 | `warga-api` |
| `src/instansi.js` (ubah) | `masuk` membawa `profil_mode`; `akunAktif` meminta sesi profil untuk pemda; `gantiSandi`, `ubahAkun` aksi `cabut` dan `reset` mencabut sesi profil; `ubahAkun` aksi `setuju` mengaktifkan profil; `buatMassal` disaring pemda; pembungkus `RUTE_INSTANSI` menulis log `kerja`; `bersihkanInstansi` memangkas log; rute profil digabung ke `RUTE_ASLI` | `warga-api` |
| `src/lapor_ai.js` (ubah) | `hakMeja` membaca `sesiProfilDari` sebelum jalur `/masuk`; menulis log `meja` | `warga-api` |
| `src/masuk.js` (ubah) | `cariRuang` dan `sandiCalon` melewatkan akun jenis pemda (Q1); pesan petunjuk di jawaban | `warga-api` |
| `src/masuk_undang.js` (ubah) | undangan dan permohonan anggota untuk akun pemda ditolak | `warga-api` |
| `src/worker.js` (ubah) | `sesi_profil` masuk regex `tolakOrigin` (`:687`); gabungan rute profil | `warga-api` |
| `public/instansi.html`, `public/instansi.js` (ubah) | muat berkas profil, cabang `profil_mode` setelah `masuk`, hapus tautan WA untuk pemda | `warga-api` |
| `public/instansi_profil.js`, `public/instansi_profil.css` (baru) | layar L2 sampai L6 | `warga-api` (kelompok `public/instansi*`) |
| `public/admin/instansi.js` (ubah) | teks undangan baru, CSV, panggil blok profil | `warga-api` |
| `public/admin/instansi_profil.js` (baru) | layar L7 | `warga-api` |
| `public/lapor/meja.js` (ubah) | tautan masuk untuk BPBD menunjuk `/instansi` (baris 60) | `layar-peta` |
| `tests/warga/profil*.test.mjs`, `tests/warga/instansi.test.mjs`, `tests/warga/masuk*.test.mjs` (baru dan ubah) | RENCANA-UJI | `warga-api` |
| `tests/agen/gerbang-profil.test.mjs` (baru) | gerbang GP-* | `penulis-gerbang` |
| `public/admin/aktivasi.js`, `public/admin/aktivasi.css` (ubah, PF-07) | kolom jumlah PIC, status akun, menunggu, terakhir masuk, rincian profil, tombol kirim ulang | `warga-api` |
| `src/masuk_undang.js` (ubah, PF-07) | `hitungPapan` dan `aktivasi` memuat baris provinsi dan kolom profil; rute `POST /api/masuk/undang-ulang` | `warga-api` |
| `migrations/<nomor>_lapor_ambil.sql` (baru, PF-08) | tabel `lapor_ambil`, indeks | `warga-api` |
| `src/lapor_ai.js`, `src/lapor_meja_hak.js`, `src/hak.js` (ubah, PF-08 dan PF-09) | aksi `ambil`, label di daftar dan rincian meja, `GET /api/lapor/respons`, `GET` dan `POST /api/lapor/meja/:nomor/pic`; fungsi `pf*` dan `lp*` baru | `warga-api` |
| `public/lapor/meja.js`, `public/lapor/meja.css` (ubah, PF-08 dan PF-09) | tombol Ambil, label penangan, bagian PIC BPBD | `layar-peta` |
| `public/admin/pimpinan.js` (ubah, PF-08) | kartu "Respons laporan warga" di layar Pimpinan yang sudah ada | `ruang-bnpb` |
| `src/kontak.js`, `public/admin/kontak.js`, `public/admin/kontak.css` (ubah, PF-09) | `GET /api/kontak/admin/pic`, kolom jumlah PIC dan daftar PIC di baris BPBD | `warga-api` |
| `tests/warga/profil_papan.test.mjs`, `profil_ambil.test.mjs`, `profil_pic.test.mjs` (baru) | UP-33 sampai UP-38 | `warga-api` |
| `scripts/agents/roster.json`, `.claude/ilmu-agent/warga-api.md` | catatan wilayah dan ilmu | `mekanik-mesin` |

Tidak ada folder baru di `public/` atau `scripts/`. Kueri baru paket ini lewat fungsi `pf*` di `src/hak.js`, sehingga ratchet `tests/agen/fixtures/d1-sisa.json` dan `d1-pindai.json` tidak naik (GP-4). Berkas lama (`src/instansi.js`) tidak ditambah akses D1 langsung.

## 2. Skema D1 (hanya `CREATE ... IF NOT EXISTS`)

```sql
CREATE TABLE IF NOT EXISTS instansi_profil (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  jabatan TEXT NOT NULL CHECK (length(jabatan) BETWEEN 2 AND 100),
  nip TEXT NOT NULL CHECK (length(nip) BETWEEN 5 AND 30),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*'),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  foto INTEGER NOT NULL DEFAULT 0 CHECK (foto IN (0, 1)),
  pin_garam TEXT CHECK (pin_garam IS NULL OR length(pin_garam) = 16),
  pin_sha TEXT CHECK (pin_sha IS NULL OR (length(pin_sha) = 64 AND pin_sha NOT GLOB '*[^0-9a-f]*')),
  pin_wajib_ganti INTEGER NOT NULL DEFAULT 0 CHECK (pin_wajib_ganti IN (0, 1)),
  pin_pada INTEGER,
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'menunggu', 'aktif', 'dicabut')),
  salah_hari INTEGER NOT NULL DEFAULT 0 CHECK (salah_hari >= 0),
  hari_tgl INTEGER NOT NULL DEFAULT 0,
  kunci_admin INTEGER NOT NULL DEFAULT 0 CHECK (kunci_admin IN (0, 1)),
  disetujui INTEGER,
  oleh TEXT,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  terakhir_masuk INTEGER,
  CHECK ((pin_sha IS NULL) = (pin_garam IS NULL)),
  CHECK (status NOT IN ('menunggu', 'aktif') OR (pin_sha IS NOT NULL AND foto = 1))
);
CREATE INDEX IF NOT EXISTS instansi_profil_akun ON instansi_profil (akun_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS instansi_profil_nip ON instansi_profil (akun_id, nip) WHERE status != 'dicabut';
CREATE UNIQUE INDEX IF NOT EXISTS instansi_profil_email ON instansi_profil (akun_id, email) WHERE status != 'dicabut';

-- paling banyak 4 profil bukan dicabut per akun; D1 menjalankan penulisan satu per satu, jadi dua sisipan serentak tidak lolos bersama
CREATE TRIGGER IF NOT EXISTS instansi_profil_maks BEFORE INSERT ON instansi_profil
WHEN (SELECT count(*) FROM instansi_profil WHERE akun_id = NEW.akun_id AND status != 'dicabut') >= 4
BEGIN
  SELECT RAISE(ABORT, 'satu akun paling banyak 4 profil');
END;
-- akun yang bukan pemda tidak punya profil (jenis dijaga di Worker; trigger menjaga D1)
CREATE TRIGGER IF NOT EXISTS instansi_profil_jenis BEFORE INSERT ON instansi_profil
WHEN (SELECT jenis FROM instansi_akun WHERE id = NEW.akun_id) NOT IN ('pemprov', 'pemkab', 'pemkot')
BEGIN
  SELECT RAISE(ABORT, 'profil hanya untuk akun pemda');
END;

CREATE TABLE IF NOT EXISTS instansi_sesi_profil (
  token_sha TEXT PRIMARY KEY CHECK (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*'),
  profil_id TEXT NOT NULL REFERENCES instansi_profil (id) ON DELETE CASCADE,
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL CHECK (kedaluwarsa > dibuat)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS instansi_sesi_profil_profil ON instansi_sesi_profil (profil_id);
CREATE INDEX IF NOT EXISTS instansi_sesi_profil_akun ON instansi_sesi_profil (akun_id);
CREATE INDEX IF NOT EXISTS instansi_sesi_profil_kedaluwarsa ON instansi_sesi_profil (kedaluwarsa);

CREATE TABLE IF NOT EXISTS instansi_profil_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  profil_id TEXT CHECK (profil_id IS NULL OR length(profil_id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk', 'pin_ok', 'pin_salah', 'terkunci', 'terkunci_admin', 'ganti_profil', 'keluar',
    'profil_buat', 'profil_ubah', 'foto', 'pin_atur', 'pin_ganti', 'kirim', 'setuju', 'tolak', 'cabut', 'reset_pin', 'buka_kunci', 'kerja', 'meja')),
  rute TEXT CHECK (rute IS NULL OR length(rute) <= 100),
  objek TEXT CHECK (objek IS NULL OR length(objek) <= 40),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) BETWEEN 3 AND 40),
  ip TEXT CHECK (ip IS NULL OR length(ip) = 12)
);
CREATE INDEX IF NOT EXISTS instansi_profil_log_akun ON instansi_profil_log (akun_id, waktu);
CREATE INDEX IF NOT EXISTS instansi_profil_log_profil ON instansi_profil_log (profil_id, waktu);
CREATE INDEX IF NOT EXISTS instansi_profil_log_waktu ON instansi_profil_log (waktu);
CREATE TRIGGER IF NOT EXISTS instansi_profil_log_tetap_ubah BEFORE UPDATE ON instansi_profil_log
BEGIN SELECT RAISE(ABORT, 'log profil hanya bisa ditambah'); END;
-- hapus hanya baris yang umurnya lebih dari 730 hari (Q7)
CREATE TRIGGER IF NOT EXISTS instansi_profil_log_tetap_hapus BEFORE DELETE ON instansi_profil_log
WHEN OLD.waktu > (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 63072000000)
BEGIN SELECT RAISE(ABORT, 'log profil disimpan 2 tahun'); END;
```

Catatan skema:

1. Tidak ada `ALTER` pada tabel lama. Seluruh perubahan akun memakai kolom yang sudah ada (`status`, `nama`, `nip`, `jabatan`, `unit`, `email`, `wa`, `surat`, `kartu`, `dikirim`).
2. `ON DELETE CASCADE` ke `instansi_akun` ikut pembersihan akun; log tidak punya kunci asing supaya jejak bertahan selama retensi.
3. `foto` hanya penanda; berkas di R2 `instansi/profil/<akun_id>/<profil_id>`.
4. Kunci 15 menit tidak punya kolom: dihitung per profil dan IP dari `laju_bnpb` (`ALGORITMA` 3.3, N7). Kolom hanya menyimpan hitungan harian dan `kunci_admin`.

## 3. Rute (semua di bawah `/api/instansi`, jadi kuki berjalur sama dan `x-pb` berlaku)

Aturan pembungkus `RUTE_INSTANSI` tetap: POST non-admin wajib `x-pb: 1`; rute `/admin/` memakai `modOK` atau `modAtauStaf` seperti `ubahAkun`. Tabel belum ada: 503 (pola `tanpaTabel`). `PROFIL_KUNCI` kurang dari 32 karakter: 503 pada rute yang menyentuh PIN.

| Rute | Gerbang | Guna | Tiket |
| --- | --- | --- | --- |
| `POST /api/instansi/masuk` (ada) | publik, batas laju yang ada | jawaban ditambah `profil_mode`; log `masuk` | PF-02 |
| `GET /api/instansi/profil` | sesi akun (`akunMasuk`) | daftar profil akun: id, nama, jabatan, foto (bool), status, terkunci (waktu), lengkap, `pin_ada`; tanpa NIP, email, HP kecuali profil milik sesi profil aktif | PF-02 |
| `POST /api/instansi/profil` | sesi akun, akun pemda, status `belum_klaim`, `ditolak`, atau `aktif` (untuk profil keempat), laju `LAJU_BUAT_PROFIL` | buat profil `draf` (nama, jabatan, NIP, email, HP); 409 bila sudah 4 | PF-02 |
| `POST /api/instansi/profil/:id` | sesi akun untuk `draf` tanpa PIN; sesi profil profil itu untuk profil aktif | ubah data | PF-02 |
| `POST /api/instansi/profil/:id/foto` | sama | unggah foto JPEG (`bersihMedia`), `foto = 1` | PF-02 |
| `GET /api/instansi/profil/:id/foto` | sesi akun (profil milik akun yang sama) atau admin | berkas dengan CSP `sandbox`, `no-store` | PF-02 |
| `POST /api/instansi/profil/:id/pin` | sesi akun | dua mode: `{pin}` pada profil tanpa PIN mengatur PIN pertama; `{pin}` pada profil ber-PIN memeriksa PIN, menerbitkan sesi profil | PF-02 |
| `POST /api/instansi/profil/:id/gantipin` | sesi profil profil itu | `{lama, baru}`; wajib bila `pin_wajib_ganti = 1` | PF-02 |
| `POST /api/instansi/profil/keluar` | sesi profil | cabut sesi profil, hapus kuki; kembali ke pilih profil | PF-02 |
| `POST /api/instansi/kirim` | sesi akun, akun pemda | `ALGORITMA` bagian 6 | PF-02 |
| `GET /api/instansi/profil/log` | sesi profil | log lembaganya, berhalaman 50, terbaru dulu | PF-04 |
| `GET /api/instansi/admin/profil/:akunId` | `modAtauStaf` P_VALIDASI, wilayah | profil lengkap dengan NIP, email, HP | PF-06 |
| `POST /api/instansi/admin/profil/:id` | `modOK` (setuju profil keempat boleh `modAtauStaf` di wilayahnya) | aksi `setuju`, `cabut`, `reset_pin`, `buka_kunci` | PF-06 |
| `GET /api/instansi/admin/profil/:id/foto` | `modAtauStaf` | foto | PF-06 |
| `GET /api/instansi/admin/log` | `modOK` | log semua lembaga dengan saringan `akun`, `profil`, `jenis`, `hal` | PF-06 |

Rute lama yang berubah perilaku untuk akun pemda: `POST /api/instansi/verifikasi` ditolak dengan 409 "pakai pendaftaran PIC"; `surat` dan `kartu` tetap sama dan memakai `akunMasuk`.

## 4. Kuki sesi profil dan pembacaan oleh meja `/lapor`

| Kuki | Isi | Path | Alasan |
| --- | --- | --- | --- |
| `sesi_instansi` (ada) | token sesi akun | `/instansi`, `/api/instansi` | tidak diubah |
| `sesi_profil` (baru) | token sesi profil | `/instansi`, `/api/instansi`, `/api/lapor` | Path ketiga menutup celah di `src/lapor_ai.js:132` tanpa membuka kuki akun ke `/api/lapor` |

Atribut: `HttpOnly; Secure; SameSite=Lax; Max-Age=43200`. `sesi_profil` ditambahkan ke regex `tolakOrigin` (`src/worker.js:687`) supaya POST bersesi profil wajib Origin sama-situs, dan `/api/lapor` POST bersesi sudah wajib `x-pb` (`src/lapor_ai.js:139`). Keluar menghapus kuki di ketiga Path. Pembaca mengembalikan `pin_wajib_ganti`; bila 1, `akunAktif`, `hakMeja`, dan pembungkus rute menjawab 403 `pin_wajib_ganti` kecuali rute `gantipin`, `keluar`, dan `GET /profil` (`ALGORITMA` bagian 4). Fungsi pembaca `sesiProfilDari(env, req, kini)` hidup di berkas kecil tanpa SQL (`src/profil_sesi.js`, pola `src/masuk_sesi.js`) supaya `lapor_ai.js` tidak mengimpor `instansi.js` dan membentuk impor melingkar; SQL-nya `pfSesiDari` di `hak.js`.

## 5. Perubahan pada kode yang ada

1. **`akunAktif`** (`src/instansi.js:120`): tambah cabang pemda sesuai `ALGORITMA` bagian 5. Sekitar 50 pemakai tidak berubah satu pun; semua mendapat sesi profil lewat satu fungsi. Nilai kembalian ditambah `profil_id` dan `profil_nama`.
2. **Pembungkus `RUTE_INSTANSI`** (`:1758`): sesudah `f(...)` selesai dengan status di bawah 400 pada metode POST non-admin, tulis log `kerja` bila `WeakMap` permintaan memuat profil.
3. **`masuk`** (`:132`): tidak berubah sampai penerbitan sesi; jawaban ditambah `profil_mode` dan log `masuk`. Batas laju gagal tetap.
4. **`gantiSandi`** (`:153`): sebelum membalas, hapus semua `instansi_sesi_profil` akun itu. `ubahAkun` aksi `cabut` dan `reset` melakukan hal sama.
5. **`ubahAkun`** (`:1407`): `setuju` menambah pra-periksa 3 profil dan pembaruan profil `menunggu` menjadi `aktif` dalam batch yang sama; `tolak` mengembalikan profil `menunggu` ke `draf`.
6. **`buatMassal`** (`:1367`): saring `defs` ke jenis pemda sebelum `slice`.
7. **`hakMeja`** (`src/lapor_ai.js:134`) dan **`lpAkunMeja`** (`src/hak.js:2011`): lihat `ALGORITMA` bagian 11. `lpAkunMeja` memotong jenis pemda dari kedua cabang `UNION` (Q1).
8. **`cariRuang`** (`src/masuk.js:189-190`): akun instansi berjenis pemda tidak ikut menjadi ruang; `sandiCalon` (`:314`) juga. Anggota pemda yang sudah tercatat di `mk_anggota` dibiarkan di tabel tetapi tidak berlaku.
9. **Pembersihan** (`bersihkanInstansi`, `:1338`): hapus `instansi_sesi_profil` kedaluwarsa, `instansi_profil_log` lebih tua dari 730 hari, dan foto R2 profil `dicabut` lebih dari 30 hari.

## 6. Foto

Peramban membaca berkas dari kamera atau galeri (`<input type="file" accept="image/*" capture="user">` untuk tombol kamera), memperkecil sisi terpanjang 512 px di canvas, mengeluarkan JPEG kualitas 0,8. Worker: `tanpaPanjang`, `bacaBytes(req, MAKS_FOTO)`, `jenisDok` harus `image/jpeg`, `bersihMedia` membuang EXIF dan data sesudah EOI, simpan ke `instansi/profil/<akun_id>/<profil_id>` lalu `foto = 1`, laju `instansi.unggah` yang ada (20 per jam). Tidak ada pemanggilan Workers AI, tidak ada vektor wajah (K8).

## 7. Konfigurasi

| Rahasia | Fungsi | Bila kosong |
| --- | --- | --- |
| `PROFIL_KUNCI` (baru, minimal 32 karakter) | kunci HMAC PIN | rute PIN 503; tidak ada baris ditulis |

Pemilik mengisi rahasia lewat `wrangler secret put` di akun produksi; subagent tidak melakukannya.

## 8. Rencana indeks dan beban

Setiap kueri `pf*` memakai indeks di atas: pencarian profil per akun lewat `instansi_profil_akun`, sesi lewat kunci utama, log per akun lewat `instansi_profil_log_akun`. Pemeriksaan sesi profil di tiap permintaan menambah satu baca bergabung tiga tabel (kunci utama dan dua kunci utama); itu tambahan di atas satu baca sesi akun yang sudah ada di `akunAktif`. Log `kerja` menambah satu tulis per POST sukses. 553 akun dengan paling banyak 4 profil berarti paling banyak sekitar 2.200 baris profil. Gerbang `gerbang-d1-pindai` dijalankan untuk memastikan tidak ada `SCAN` baru.

## 9. Catatan keputusan (ADR)

| No | Keputusan | Alternatif | Alasan |
| --- | --- | --- | --- |
| A1 | Sesi profil di tabel dan kuki sendiri | `ALTER TABLE instansi_sesi ADD COLUMN profil_id` | `ALTER ... ADD COLUMN` tidak idempoten di SQLite; gerbang migrasi menolak |
| A2 | Data PIC pertama disalin ke kolom `instansi_akun` | bangun ulang `instansi_akun` tanpa CHECK | tabel punya belasan tabel anak dan puluhan titik pakai di `src/`; membangun ulang lebih berisiko daripada salinan |
| A3 | Tabel log baru | tambah aksi di `instansi_jejak.aksi` | enum tertutup dan trigger; butuh bangun ulang |
| A4 | PIN HMAC dengan rahasia env | PBKDF2 | batas CPU Worker; ruang 6 angka kecil, jadi rahasia env yang memberi nilai |
| A5 | Reservasi percobaan sebelum membandingkan | bandingkan lalu hitung | serangan serentak melewati batas |
| A6 | Log `meja` ditulis oleh `hakMeja` sebelum penangan | tulis sesudah hasil | penangan meja tersebar di dua berkas; riwayat meja sudah mencatat hasil |
| A7 | Satu cookie baru dengan tiga Path | memperlebar Path `sesi_instansi` ke `/` | memperlebar menyebarkan token akun ke semua rute |

## 10. Perluasan K11 sampai K13

Rujukan baris diukur 23 Nov 2026.

### 10.1 Skema `lapor_ambil` (migrasi PF-08, hanya `CREATE ... IF NOT EXISTS`)

```sql
CREATE TABLE IF NOT EXISTS lapor_ambil (
  nomor TEXT PRIMARY KEY,
  profil_id TEXT NOT NULL CHECK (length(profil_id) = 16),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  jabatan TEXT NOT NULL CHECK (length(jabatan) BETWEEN 2 AND 100),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 10 AND 300),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_ambil_akun ON lapor_ambil (akun_id, waktu);
CREATE INDEX IF NOT EXISTS lapor_ambil_waktu ON lapor_ambil (waktu);
```

Tanpa kunci asing ke `instansi_profil` supaya penghapusan data PIC (N6) tidak menghapus catatan penanganan; tabel hanya memuat nama dan jabatan, bukan NIP, email, atau HP. Statistik respons tidak butuh tabel lain: `lapor_sesi.terkirim` (masuk), `instansi_profil_log` (dilihat), `lapor_ambil.waktu` (ditangani). Bila uji `gerbang-d1-pindai` menunjukkan pindai penuh pada jendela 30 hari, PF-08 menambah `CREATE INDEX IF NOT EXISTS` pada tabel lama (idempoten), bukan `ALTER`.

### 10.2 Rute

| Rute | Gerbang | Guna | Tiket |
| --- | --- | --- | --- |
| `GET /api/masuk/aktivasi` (ada, `src/masuk_undang.js:347`) | `hakStaf` | ditambah `pic`, `pic_aktif`, `status_akun`, `menunggu`, baris provinsi; rincian memuat `profil[]` tersamar | PF-07 |
| `POST /api/masuk/undang-ulang` (baru) | `hakStaf`, `x-pb`, wilayah | `ALGORITMA` 12; menulis satu `wa_antre` jenis `undang_pf` atau mengembalikan `teks_salin` | PF-07 |
| `POST /api/lapor/meja/:nomor/ambil` (regex `src/lapor_ai.js:907` ditambah `ambil`) | `hakMeja` jenis `bpbd`, `x-pb`, `dalamWilayah` | `ALGORITMA` 13.1 | PF-08 |
| `GET /api/lapor/respons` (baru) | `hakMeja` jenis `bnpb` | `ALGORITMA` 13.2; tidak berbentuk `/meja/:x` agar tidak jatuh ke `mejaGet` | PF-08 |
| `GET /api/lapor/meja/:nomor/pic` dan `POST` (regex `mejaGet`, `mejaPost`) | `hakMeja` jenis `bnpb` | `ALGORITMA` 14 | PF-09 |
| `GET /api/kontak/admin/pic` (baru, `src/kontak.js`) | `adminOK` | PIC aktif satu BPBD, tersamar | PF-09 |

Rute `/api/lapor/*` bukan bagian `RUTE_INSTANSI`; log profil `meja` untuk `ambil` dan `pic` mengikuti `hakMeja` (bagian 5 butir 7). `POST /api/masuk/undang-ulang` memakai pembungkus masuk yang ada, bukan sesi profil.

### 10.3 Layar Kepala: satu rumah

`public/admin/pimpinan.js` sudah memuat tabel "Respons median" per kab (`:77`, data dari `src/meja.js:569`, untuk panggilan tugas api). Angka respons laporan warga ditempatkan di layar yang sama sebagai kartu `.ex.ex-std` baru, bukan layar baru. Konflik kecil: komentar kepala berkas menyebut "tanpa rute data baru"; PF-08 menambah satu rute (`/api/lapor/respons`) karena angkanya tidak ada di API lama, dan memperbarui komentar itu. Hak halaman Pimpinan mengikuti `HALAMAN_STAF.pimpinan` di `src/admin_halaman.js:33`.

### 10.4 Pertimbangan

| Hal | Keputusan |
| --- | --- |
| Papan sekarang mengandalkan `mk_anggota` dan `mk_masuk_log` | untuk akun pemda dibaca dari `instansi_profil`; kolom lama dibiarkan bagi jenis akun lain |
| `wa_antre.jenis` | `undang_pf` (panjang 9, batas 20); gerbang WA menarik semua jenis tanpa perubahan kode karena jenis hanya label (`src/lapangan_wa.js:42`) |
| Sandi di antrean | tidak pernah; GP-15 menjaga |
| Pimpinan membaca respons dari tabel log berumur 30 hari | `instansi_profil_log` retensi 730 hari cukup |
