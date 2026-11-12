# DESAIN-TEKNIS: Pantauan Operasi Udara

## 1. Berkas dan pemilik

| Berkas | Isi | Pengerja |
| ------ | --- | -------- |
| `public/operasi_laporan.js` | kartu laporan, rumus murni layar (alasan, batas terang, kepatuhan) | `layar-peta` |
| `public/operasi_peta.js` | `OpsUdara`: muat data, `kelayakan`, foto armada | `layar-peta` |
| `public/operasi_peta.css` | gaya `#opsLaporan` | `layar-peta` |
| `src/operasi_udara.js` | rute `/api/operasi/*`, `catatOperasi` | `warga-api` |
| `src/operasi_hasil.js` | penilaian padam, api muncul lagi | `warga-api` |
| `migrations/0125_operasi_udara_pantau.sql` | kolom baru (§3) | `warga-api` → `migrasi-idempoten` |
| `scripts/wa/renlap_jam.mjs` | unggah PDF renlap sesudah dibuat | `wa-bot` |
| `scripts/operasi/prakiraan_base.py` | prakiraan per jam per base → `public/data/operasi/prakiraan_base.json` | `pipa-data` |
| `tests/warga/operasi_udara.test.mjs`, `tests/warga/operasi_monitor.test.mjs` | uji rute dan hasil | `warga-api` |
| `tests/operasi/*.test.mjs` | uji fungsi murni layar (pemilik folder menurut `ilmu.mjs`: `pipa-data`; `layar-peta` menulis, pemilik folder memeriksa) | `layar-peta` |

Tidak ada folder baru di `public/` atau `scripts/` selain berkas di atas.

## 2. Rute

| Rute | Hak | Masukan | Keluaran | Tiket |
| ---- | --- | ------- | -------- | ----- |
| `POST /api/operasi/renlap/pdf` | Mesin (`Bearer WA_MESIN`, pola `src/jarak_pandang.js`) | query `tanggal`, `versi` (pagi/malam), `base` (id op_base atau `SEMUA`); badan PDF mentah ≤ 15 MB | `{ok, kunci}` | UD-01 |
| `GET /api/operasi/renlap/pdf` | Baca (`/api/operasi/peta`) | `tanggal`, `versi`, `base` | PDF, `attachment`, `private, no-store`, `x-content-type-options: nosniff` | UD-01 |
| `GET /api/operasi/renlap/pdf/daftar` | Baca | `tanggal` | `[{versi, base, ukuran, diunggah}]` dari `MEDIA.list({prefix})` | UD-01 |
| `GET /api/operasi/peta` (ubah) | Baca | – | tambah `armada[].pertama` dari `op_lapor_pertama` (NULL bila tabel/baris belum ada) | UD-02 |
| `GET /api/operasi/status7` | Baca | `dari`, `sampai` (≤ 7 hari) | `{registrasi: [{tanggal, status}]}` 7 hari, satu kueri | UD-03 |
| `GET /api/operasi/monitor` (ubah) | Baca | – | `aksi[].muncul_lagi`, `aksi[].muncul_lagi_utc`, `aksi[].kab` | UD-06, UD-08 |

Batas laju: rute unggah mesin memakai batas yang sama dengan `POST /api/jarak-pandang`. Semua rute baca membatasi rentang ≤ 31 hari.

## 3. Skema D1 (migrasi 0125, tabel samping, idempoten)

`ALTER TABLE ADD COLUMN` tidak idempoten di D1, dan kode yang membaca kolom baru melempar `no such column` bila tayang sebelum migrasi
diterapkan di produksi. Jadi pola 0106 dipakai: **tabel samping** `CREATE TABLE IF NOT EXISTS`. Kode yang membacanya sudah aman lewat
`tanpaTabel()` (menangkap `no such table: op_`), sehingga urutan tayang dan migrasi tidak saling menunggu.

```sql
-- F-1: jam laporan PALING AWAL per pesawat per tanggal (bukan yang diproses pertama)
CREATE TABLE IF NOT EXISTS op_lapor_pertama (
  tanggal TEXT NOT NULL, registrasi TEXT NOT NULL, pertama INTEGER NOT NULL,   -- ms UTC jam terima pesan WA
  PRIMARY KEY (tanggal, registrasi));
-- catatOperasi: INSERT ... ON CONFLICT (tanggal, registrasi) DO UPDATE SET pertama = min(op_lapor_pertama.pertama, excluded.pertama)
-- min() membuat pemutaran ulang pesan lama (scripts/operasi/isi_ulang_wa.mjs) tetap benar.

-- F-10: api muncul lagi 24-72 jam sesudah aksi yang sudah dinilai padam
CREATE TABLE IF NOT EXISTS op_gerak_muncul (
  gerak_id INTEGER PRIMARY KEY,
  muncul_lagi_utc INTEGER,          -- jam titik FIRMS pertama dalam (t0+24 j, t0+72 j]; NULL = belum/tidak ada
  diperiksa_sampai INTEGER NOT NULL -- jam putaran FIRMS terakhir yang sudah diperiksa; aksi selesai dipantau bila >= t0+72 j
);
```
Baris sebelum migrasi tidak diisi dari `diubah` (yang tertimpa): jam laporan tanggal lama tampil "–".
Produksi: migrasi diterapkan pemilik (memori `ruang-bnpb`). Pemeriksa: `migrasi-idempoten`; cek juga `tests/warga/migrasi_beku.test.mjs`.

## 4. R2

Kunci: `operasi/renlap/<YYYY-MM-DD>/<pagi|malam>/<BASE|SEMUA>.pdf`, metadata `{diunggah, ukuran, sha}`. Disusun server dari nilai tervalidasi.

## 5. Pipeline

- `scripts/wa/renlap_jam.mjs`: `pdfDari()` hanya mengembalikan PDF GABUNGAN; helper baru mencari `Renlap <BASE> <tanggal> <versi>.pdf` di folder yang sama (`path.dirname`). Tiap PDF di-POST ke rute UD-01; gagal = log + kabar pemilik sekali per hari (pola `jarak_pandang_jam.mjs`). Idempoten lewat `state.renlap[kunci + ':unggah:' + base]`. Ukuran PDF bergambar nyata diukur dulu di UD-01 sebelum batas 15 MB dikunci.
- `scripts/operasi/prakiraan_base.py` (UD-09): stdlib, Open-Meteo hourly `visibility, wind_speed_10m, wind_gusts_10m, precipitation` untuk 9 base, 12 jam ke depan; keluaran cuaca (bukan data operasi) di `public/data/operasi/prakiraan_base.json`; dijalankan di workflow `jarak_pandang.yml`.
- `src/operasi_hasil.js` (UD-06): **kueri baru**, terpisah dari penilaian padam yang hanya melihat aksi 48 jam dengan `hasil IS NULL`: aksi `padam` berumur 24–72 jam yang `diperiksa_sampai < t0+72 j`, `ORDER BY jam_utc DESC LIMIT 200`, dicek terhadap putaran FIRMS tersimpan (`titik_terbaru`, 8 putaran). `muncul_lagi_utc` lengket: sekali terisi tidak pernah dikosongkan. Putaran yang terlewat tidak membuat aksi dianggap padam bertahan: hanya aksi dengan `diperiksa_sampai >= t0+72 j` yang masuk persen padam bertahan.
- **UD-05a (data)**: jam deteksi pertama cluster belum tersimpan (FIRMS hanya 8 putaran). Pipeline cluster (`scripts/data/**`, pengerja `pipa-data`) menulis `pertama_utc` per cluster dan mempertahankannya antarputaran; waktu respons (UD-05b) baru dihitung untuk cluster yang lahir sesudah UD-05a tayang.

## 6. Layar

| Tiket | Perubahan |
| ----- | --------- |
| UD-01 | kolom Renlap dan blok Renlap: tombol PDF di samping KML/GPX bila ada di daftar; tombol "PDF semua base" di kanan judul kartu Renlap |
| UD-02 | ubin "telat lapor", label jam laporan di kolom Siap, saklar "Telat lapor" |
| UD-03 | strip 7 hari di kartu armada dan pop-up, saklar "Rusak berulang" |
| UD-04 | kolom alasan di kartu target renlap; kartu Kepatuhan per base dan operator |
| UD-05 | kartu Celah jangkauan dan Respons |
| UD-06 | hasil "muncul lagi" di aksi, linimasa, persen padam bertahan |
| UD-07 | label batas terang di baris base |
| UD-08 | kartu Hasil per kabupaten |
| UD-09 | pita prakiraan 6 jam di baris base, asap rute di blok renlap |
| UD-10 | ADS-B: penanda di luar base dan sinyal hilang di kartu armada |
| UD-11 | operator: hari menganggur |

Fungsi murni layar (batas terang, alasan, kepatuhan, respons, status lapor) ditaruh di `public/operasi_laporan.js` dan diekspor lewat `window.OperasiLaporan` supaya bisa diuji di node.

## 7. Isian manual (K12, F-22 sampai F-31)

### 7.1 Berkas

| Berkas | Isi | Pengerja |
| ------ | --- | -------- |
| `src/operasi_isian.js` (baru) | rute `/api/operasi/isian/*`, validasi, tulis + riwayat; diekspor sebagai `RUTE_ISIAN` dan digabung ke `RUTE` di `src/worker.js` | `warga-api` |
| `src/operasi_udara.js` (ubah) | `catatOperasi` memeriksa `op_isian` sebelum menimpa butir (K15); `peta`/`monitor` menyertakan `sumber` tiap butir | `warga-api` |
| `migrations/0126_operasi_isian.sql` (nomor diperiksa ulang saat tiket UD-26; 0125 sudah dipakai `0125_indeks_baca_d1.sql`, jadi rencana 0125 di §3 ikut bergeser) | tabel §7.3 | `warga-api` → `migrasi-idempoten` |
| `public/operasi_isian.js` (baru) + gaya di `public/operasi_peta.css` | grup panel Isian, dialog formulir, pil manual, riwayat | `layar-peta` |
| `public/operasi_laporan.js` (ubah) | tombol Isi di Pembaruan data dan Perlu tindakan; kontrak dan personel dibaca dari rute, bukan berkas statis | `layar-peta` |
| `tests/warga/operasi_isian.test.mjs` (baru) | uji integrasi rute + D1 (Miniflare) | `warga-api` |

### 7.2 Rute

Semua tulis: `POST`, badan JSON ≤ 32 KB (foto: multipart ≤ 8 MB), hak tulis `stafPeran(env, req, PERAN_TULIS)` atau `modOK` (`src/posko.js`, moderator ber-`ADMIN_TOKEN`) dengan `PERAN_TULIS = ["pusdalops"]` (K14). **Bukan `adminOK`**: `adminOK` juga meloloskan akun gerbang `AKUN_SITUS*` yang dipakai pimpinan sebagai pembaca. Batas laju per pengisi: 60 tulis per 10 menit, dihitung dari `op_isian_log` (`SELECT count(*) WHERE oleh = ? AND waktu > ?`, memakai indeks `op_isian_log_oleh`), tanpa tabel baru. Semua baca memakai hak baca `/api/operasi/peta`.

| Rute | Masukan | Tulis ke | Tiket |
| ---- | ------- | -------- | ----- |
| `POST /api/operasi/isian/gelar` | `tanggal`, `base_id`, `butir: [{registrasi, status, alasan}]` (≤ 30) | `op_armada_status` (`sumber = 'manual'`) | UD-27 |
| `POST /api/operasi/isian/sortie` | `id?` (ubah), `tanggal`, `registrasi`, `jenis`, `jam_wib`, `misi`, `lokasi`, `lat?`, `lon?` | `op_gerak` (`wa_id` NULL) | UD-27 |
| `POST /api/operasi/isian/hasil` | `gerak_id`, `drops?`, `liter?`, `lapor?` | `op_gerak_hasil` (hanya kolom laporan; `hasil` padam/masih api tetap dari penilaian satelit `src/operasi_hasil.js`) | UD-27 |
| `POST /api/operasi/isian/temuan` | `id?`, `tanggal`, `jam_wib`, `registrasi`, `lat`, `lon`, `status`, `luas_klaim_ha?`, `lokasi?` | `op_temuan` (`wa_id` NULL) | UD-27 |
| `POST /api/operasi/isian/armada` | `registrasi`, `tipe`, `peran`, `operator`, `pemilik`, `base_id`, `bucket_liter?` | `op_armada` (upsert) | UD-28 |
| `POST /api/operasi/isian/kontrak` | `id?`, kolom K19 (operator, registrasi, peran, provinsi, mulai, selesai, plafon jam; tanpa harga) | `op_kontrak` | UD-28 |
| `POST /api/operasi/isian/personel` | `tanggal`, `prov`, `unsur: {tni, polri, manggala, bpbd, masyarakat, lainnya}`, `sumber_teks`; angka = akumulasi per provinsi per unsur s.d. tanggal itu (K16) | `op_personel` | UD-28 |
| `POST /api/operasi/isian/foto` | multipart: berkas jpeg/png/webp, `registrasi?`, `base_id?`, `ket?`; `lat`, `lon`, jam, dan tanggal DIBACA Worker dari EXIF berkas (K18), bukan dari isian; foto tanpa GPS EXIF ditolak 400 "foto tidak berkoordinat, nyalakan lokasi kamera" | R2 `operasi/foto/<tanggal>/<acak>.<ext>` + `op_foto_unggah` | UD-29 |
| `POST /api/operasi/isian/hapus` | `tabel`, `kunci`, `alasan` (5–300 karakter) | `op_isian.terhapus`, riwayat | UD-27 |
| `GET /api/operasi/isian/riwayat` | `tabel`, `kunci` atau `tanggal` | `[{waktu, oleh, aksi, sebelum, sesudah, alasan}]` ≤ 200 baris | UD-35 |
| `GET /api/operasi/kontrak`, `GET /api/operasi/personel` | `dari`, `sampai` (≤ 31 hari) | baca | UD-33 |

Jam diisi WIB di layar, disimpan ms UTC (konvensi `op_*`). Tanggal hanya hari ini dan 7 hari ke belakang; isian tanggal depan ditolak.

### 7.3 Skema D1 (semua `CREATE TABLE IF NOT EXISTS`, tanpa `ALTER`, pola §3)

```sql
-- penanda sumber per butir: tabel op_* lama tidak punya kolom oleh/terhapus, dan ALTER tidak idempoten di D1
CREATE TABLE IF NOT EXISTS op_isian (
  tabel TEXT NOT NULL CHECK (tabel IN ('op_armada_status','op_gerak','op_gerak_hasil','op_temuan','op_armada','op_kontrak','op_personel','op_foto_unggah')),
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 1 AND 80),     -- PK baris: 'tanggal|registrasi', id angka, dst.
  sumber TEXT NOT NULL DEFAULT 'manual' CHECK (sumber = 'manual'),   -- butir tanpa baris di sini = dari bot
  oleh TEXT NOT NULL,                                              -- 'staf:<id>' atau 'admin:<hash12>' (keluaran modOK); hanya baris MANUAL yang dicatat di sini
  waktu INTEGER NOT NULL,
  terhapus INTEGER NOT NULL DEFAULT 0 CHECK (terhapus IN (0,1)),
  PRIMARY KEY (tabel, kunci));
CREATE TABLE IF NOT EXISTS op_isian_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, waktu INTEGER NOT NULL, oleh TEXT, tabel TEXT NOT NULL, kunci TEXT NOT NULL,
  aksi TEXT NOT NULL CHECK (aksi IN ('isi','ubah','hapus','bot_dilewati','lengkapi')),
  sebelum TEXT CHECK (sebelum IS NULL OR (json_valid(sebelum) AND length(sebelum) <= 8192)),
  sesudah TEXT CHECK (sesudah IS NULL OR (json_valid(sesudah) AND length(sesudah) <= 8192)),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300));
CREATE INDEX IF NOT EXISTS op_isian_log_kunci ON op_isian_log(tabel, kunci, waktu);
CREATE INDEX IF NOT EXISTS op_isian_log_waktu ON op_isian_log(waktu);
CREATE INDEX IF NOT EXISTS op_isian_log_oleh ON op_isian_log(oleh, waktu);
-- sortie dan temuan manual: penanda kejadian supaya bot tidak menyisipkan kembaran (kunci id autoincrement tidak bisa dipakai bot)
CREATE TABLE IF NOT EXISTS op_isian_kejadian (
  jenis TEXT NOT NULL CHECK (jenis IN ('gerak','temuan')), tanggal TEXT NOT NULL, registrasi TEXT NOT NULL, sub TEXT NOT NULL,  -- gerak: jenis gerak; temuan: '*'
  id INTEGER NOT NULL, PRIMARY KEY (jenis, tanggal, registrasi, sub, id));
CREATE TABLE IF NOT EXISTS op_kontrak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16), operator TEXT NOT NULL, registrasi TEXT, peran TEXT CHECK (peran IS NULL OR peran IN ('patroli','wb','omc','patroli_wb')),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2), mulai TEXT NOT NULL, selesai TEXT, plafon_jam REAL CHECK (plafon_jam IS NULL OR plafon_jam BETWEEN 0 AND 10000),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300));          -- tanpa harga dan tarif (Q7)
CREATE TABLE IF NOT EXISTS op_personel (
  tanggal TEXT NOT NULL, prov TEXT NOT NULL CHECK (length(prov) = 2), unsur TEXT NOT NULL CHECK (unsur IN ('tni','polri','manggala','bpbd','masyarakat','lainnya')),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 0 AND 200000),   -- akumulasi s.d. tanggal (K16): dibaca nilai terakhir per prov dan unsur, TIDAK dijumlah antarhari
  sumber_teks TEXT CHECK (sumber_teks IS NULL OR length(sumber_teks) <= 120),
  PRIMARY KEY (tanggal, prov, unsur));
CREATE TABLE IF NOT EXISTS op_foto_unggah (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT NOT NULL, berkas TEXT NOT NULL, tipe TEXT NOT NULL CHECK (tipe IN ('image/jpeg','image/png','image/webp')),
  registrasi TEXT, base_id TEXT, jam_utc INTEGER, lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5), lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),   -- wajib, dari EXIF (K18)
  ket TEXT CHECK (ket IS NULL OR length(ket) <= 200));
```

Pembaca: butir yang `op_isian.terhapus = 1` tidak ditampilkan dan tidak dihitung. Semua pembaca `op_*` wajib ikut, bukan hanya layar: `peta`, `monitor`, `nilai`, `temuanMesin` (`/api/operasi/temuan` untuk Mac mini) di `src/operasi_udara.js`, `src/operasi_nilai.js`, cron lengkapi dan penilaian di `src/operasi_hasil.js`. Kuota D1: penanda tidak di-JOIN per baris; tiap rute membaca `op_isian` untuk rentang tanggalnya SEKALI (≤ beberapa ratus baris, terindeks) lalu menggabung di memori Worker. Bila tabel belum ada di produksi, `tanpaTabel()` membuat semua butir dianggap dari bot.
Cron lengkapi (`src/operasi_hasil.js`) yang mengisi lat/lon kosong: boleh mengisi baris manual, dan menulis riwayat `aksi = 'lengkapi'` (tambahkan nilai itu ke CHECK `aksi`). (K15)

### 7.4 Aturan bot dan manual (K15)

Penjagaan ada DI DALAM pernyataan tulis bot, bukan baca lalu tulis (dua permintaan bot bersamaan tidak boleh lolos):

| Tabel | Tulis bot sekarang (`src/operasi_udara.js`) | Penjagaan baru |
| ----- | ------------------------------------------- | -------------- |
| `op_armada_status` | `ON CONFLICT DO UPDATE` | `... DO UPDATE ... WHERE NOT EXISTS (SELECT 1 FROM op_isian WHERE tabel = 'op_armada_status' AND kunci = excluded.tanggal || '|' || excluded.registrasi)`; kolom `sumber` yang sudah ada diisi `'manual'` oleh isian manual |
| `op_gerak_hasil` | `ON CONFLICT DO UPDATE` | sama, kunci `gerak_id` |
| `op_gerak` | INSERT bila belum ada (tanggal, registrasi, jenis, jam_utc) | tambah syarat: tidak ada `op_isian_kejadian` (jenis 'gerak', tanggal, registrasi, sub = jenis gerak). Akibatnya bila staf sudah mengisi sortie "berangkat" pesawat itu hari itu, bot tidak menambah "berangkat" kedua walau jamnya beda; kalau memang ada dua sortie, staf mengisi keduanya |
| `op_temuan` | INSERT OR IGNORE (UNIQUE registrasi, tanggal, lat, lon) | koordinat bot dan manual jarang sama persis, jadi temuan dibiarkan berdampingan; layar menggabung temuan berjarak ≤ 300 m pesawat dan hari yang sama dan memakai yang manual [SEMENTARA] |

Bot yang dilewati dicatat `op_isian_log` aksi `bot_dilewati` (satu INSERT tambahan hanya saat terjadi). Bot TIDAK mencatat penanda apa pun untuk tulisannya sendiri (tanpa tulis D1 tambahan).
Hapus manual lalu bot datang lagi: penanda `terhapus = 1` tetap ada, jadi bot boleh menulis lagi (penjagaan memeriksa `terhapus = 0`). (K17)
`scripts/operasi/isi_ulang_wa.mjs` menulis SQL sendiri (`INSERT OR IGNORE`, `ON CONFLICT DO NOTHING`), tidak lewat penjagaan di atas: UD-27 menambahkan syarat `NOT EXISTS op_isian` / `op_isian_kejadian` yang sama ke SQL keluarannya.

### 7.5 Layar

- Butir OMC (F-30) hanya tampil untuk peran `tmc`: `src/omc.js` membatasi tulis ke `PERAN_TULIS = ["tmc"]`, peran lain akan kena 403.
- Grup panel kiri **Isian** (di bawah Kontrak) dengan butir F-22 sampai F-29; hanya tampil bila sesi punya hak tulis (peran dibaca dari `GET /api/staf/saya` di `src/staf.js`; Worker tetap memeriksa ulang di tiap rute tulis).
- Dialog satu pola untuk semua formulir: kepala navy L1 kecil, isian 40 px, pil pilihan untuk status, tombol Simpan di kanan bawah; Esc dan klik latar menutup. Klik Isi melukis dialog dulu, isi daftar pesawat menyusul (INP).
- Pil **manual** di sel yang nilainya dari isian manual; tooltip "diisi <staf> <jam> WIB".
- Kontrak dan Personel darat dibaca dari rute UD-33. Berkas statis lama tetap dibaca hanya sebagai cadangan berlabel "per 12 Okt" sampai tabel terisi, lalu dicabut di tiket yang sama.

### 7.6 Kontrak dan personel: dari berkas statis ke tabel

| Sekarang (berkas statis) | Sesudah UD-33 |
| ------------------------ | ------------- |
| `rekap_udara.json` kontrak: `kontrak_ke`, `penyedia`, `periode_teks`, `berjalan` | `op_kontrak`: `catatan` (nomor kontrak), `operator`, `mulai`/`selesai`; `berjalan` dihitung dari tanggal |
| `jam_operasi_menit`, `sortie`, `wb_drop`, `liter` (dipakai layar di `public/operasi_laporan.js` sekitar baris 856) | dihitung dari `op_gerak` dan `op_gerak_hasil` untuk registrasi dan rentang kontrak; jam operasi = jumlah selisih berangkat-kembali. Angka akumulasi sebelum bot terpasang (sebelum 27 Okt) tidak ada di D1: kartu menulis "dihitung sejak 27 Okt" dan berkas statis tetap tampil sebagai baris "rekap s.d. 25 Okt" terpisah, tidak dijumlah (prinsip 4) |
| `operasi_resmi.json.personel_darat`: satu angka nasional per 12 Okt | `op_personel` akumulasi per provinsi per unsur (K16); total nasional = jumlah nilai terakhir tiap provinsi; angka nasional lama tampil berlabel "per 12 Okt, rekap BNPB" sampai ada isian |

Batas tanggal "hari ini sampai 7 hari ke belakang" berlaku untuk gelar, sortie, hasil, temuan, personel, dan tanggal EXIF foto (foto lebih tua ditolak); TIDAK untuk `mulai`/`selesai` kontrak.

### 7.7 Foto unggahan

Rute baca sendiri `GET /api/operasi/foto-unggah/:id` (bukan `/api/operasi/foto/:id`, yang membaca `op_foto JOIN wa_masuk`): `content-type` dari kolom `tipe`, `x-content-type-options: nosniff`, `content-security-policy: sandbox`, `cache-control: private, no-store`. Galeri menggabung kedua sumber dengan id berawalan (`wa:`/`up:`) supaya tidak bertabrakan.
Unggah memakai ulang penjaga `Content-Length` 411/413 dari `src/foto.js` sebelum `formData()`. Pengurai EXIF ditulis sendiri di Worker (baca segmen APP1 JPEG, chunk `eXIf` PNG, chunk `EXIF` WEBP; hanya tag GPS dan `DateTimeOriginal`), tanpa pustaka baru; diuji dengan foto ponsel asli. SVG, GIF, HEIC ditolak tegas. Metadata EXIF tidak dibuang (`src/foto.js` sekarang menyimpan unggahan apa adanya); membuang EXIF butuh re-encode dan jadi keputusan terpisah, tidak diklaim.
