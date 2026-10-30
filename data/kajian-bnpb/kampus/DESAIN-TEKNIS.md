# DESAIN-TEKNIS: Kemitraan Kampus

Dokumen ketujuh dalam urutan otoritas. Kalah dari KP, PRD, ALUR, ALG, PD, DS; menang atas
KM, RU, TIKET. Versi 1.0, 30 Okt 2026. DT menjawab "bagaimana persisnya"; TIKET menjawab
"siapa dan kapan". Penyimpangan dari PRD dicatat sebagai ADR (§9).

Rujukan kode diperiksa pada main 30 Okt 2026 (`c527285c`+).

## 1. Arsitektur

```
Pipeline (GitHub Actions, Python 3.12 stdlib)          Worker (src/kemitraan*.js)           Layar (public/kemitraan*)
 kemitraan.yml harian 02.30 UTC                          RUTE_KEMITRAAN di src/worker.js        kemitraan.html (8 tampilan)
  kode.py → profil_daerah.py → public/data/kemitraan/*   - halaman: /kemitraan, /buku, /panduan,  buku.html, panduan.html,
 kemitraan-pakar.yml bulanan tgl 2                         /daftar, /saya, /masuk, /sertifikat      daftar.html, saya.html,
  korpus.py → indeks_bm25.py → cocok_pakar.py → R2          - API /api/kemitraan/*                 masuk.html, sertifikat.html
 (pakai OPENALEX_KEY + wrangler R2)                       D1: km_* (0080–0084) + tabel lama      inti.js (helper KM), <tampilan>.js
                                                          R2 MEDIA: kemitraan/*, akademisi/*
```
Gerbang hak: staf (`stafOK` + peran baru `kemitraan`), akun KK (pola pendataan), kode
pribadi (pola relawan/meja), SA (`superOK`). Detail KM.

## 2. Berkas

### 2.1 Baru
| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `migrations/0080_km_dasar.sql` | km_kampus, km_akun, km_sesi, km_anggota, km_perjanjian, km_bpbd_kode, km_jejak | warga-api |
| `migrations/0081_km_masalah.sql` | km_masalah, km_masalah_pakar, km_kunjungan, km_jawaban, km_koreksi | warga-api |
| `migrations/0082_km_riset.sql` | km_donor, km_panggilan_donor, km_proposal, km_konsorsium, km_hibah_panggilan, km_hibah_proposal, km_telaah, km_inovasi, km_agenda_sumber | warga-api |
| `migrations/0083_km_satgas.sql` | km_satgas, km_satgas_anggota, km_piket, km_aktivasi, km_panggilan, km_aktivasi_laporan, km_sertifikat, km_pelajaran, km_pl_kode | warga-api |
| `migrations/0084_km_talenta.sql` | km_magang, km_magang_lamar, km_mentor, km_desa, km_desa_catatan, km_dampingan, km_bumn, km_modul | warga-api |
| `src/kemitraan.js` | RUTE_KEMITRAAN (halaman + gerbang + dummy) | warga-api |
| `src/kemitraan_akun.js` | daftar kampus/anggota, masuk KK, kode | warga-api |
| `src/kemitraan_masalah.js` | masalah, kunjungan, jawaban, koreksi, pakar | warga-api |
| `src/kemitraan_riset.js` | donor, proposal, hibah, telaah, inovasi, agenda | warga-api |
| `src/kemitraan_satgas.js` | satgas, piket, aktivasi, panggilan, sertifikat | warga-api |
| `src/kemitraan_talenta.js` | magang, mentor, desa, dampingan, bumn, modul | warga-api |
| `src/kemitraan_hitung.js` | fungsi murni: skor (ALG §3.4, §7, §8, §9), cocok BM25 ringkas (§4.6), status MoU | warga-api |
| `public/kemitraan.html`, `public/kemitraan.css` | cangkang + komponen `.km-` | kampus |
| `public/kemitraan/inti.js` | helper `window.KM` (DS §4) | kampus |
| `public/kemitraan/hitung.js` | cermin JS fungsi murni ALG (skor, generator pertanyaan, syarat) | kampus |
| `public/kemitraan/konst.js` | bobot/ambang ALG, identik `scripts/kemitraan/konst.py` | kampus |
| `public/kemitraan/{daerah,masalah,riset,dana,satgas,talenta,kampus,dasbor}.js` | satu tampilan per berkas | kampus |
| `public/kemitraan/{buku,panduan,daftar,saya,masuk,sertifikat}.{html,js}`, `buku.css` | halaman turunan | kampus |
| `public/kemitraan/qr.js` | pembuat QR SVG lokal (port QR kecil, byte mode, ECC M) | kampus |
| `public/data/kemitraan/{kode.json,kode_gagal.json,daerah/*.json,prov/*.json,ringkas.json,pertanyaan.json,kamus.json,uji_cocok.json}` | keluaran pipeline | kampus |
| `scripts/kemitraan/{konst.py,kode.py,profil_daerah.py,masalah.py,korpus.py,indeks_bm25.py,cocok_pakar.py,cocok_baru.py,pertanyaan.py,uji_cocok.py}` | pipeline + `--cek` | kampus |
| `scripts/kemitraan/{kamus.json,pertanyaan.json}` | taksonomi + templat (sumber; disalin ke public oleh pipeline) | kampus |
| `.github/workflows/kemitraan.yml`, `kemitraan-pakar.yml` | jadwal | mekanik-mesin |
| `tests/warga/kemitraan_*.test.mjs` | rute + D1 (Miniflare) | warga-api / penulis-gerbang |
| `tests/kemitraan/*.test.mjs`, `tests/kemitraan/fixtures/acuan.json` | fungsi murni, paritas Py/JS, gerbang teks | kampus / penulis-gerbang |
| `tests/bnpb/kemitraan_layar.test.mjs` | layar 1440/390 Chrome CDP | kampus |
| `tests/kemitraan/cakupan.json` | registri diuji/dikecualikan/antre | penulis-gerbang |

### 2.2 Berubah
| Berkas | Perubahan |
| --- | --- |
| `src/worker.js` | (1) satu cabang di `rute()`: jalur berawalan `/kemitraan` atau `/api/kemitraan/` diserahkan ke `ruteKm(metode, jalur)` di `src/kemitraan.js` (ADR-07); (2) gerbang situs centurisk97.id (`adminOK`, worker.js:801) DILEWATI untuk awalan itu, karena modul menjaga dirinya lewat `hakKm`; (3) `tolakOrigin` (worker.js:605) mengenali cookie `sesi_kemitraan` |
| `src/staf.js` + `migrations/0085_staf_peran_kemitraan.sql` | `PERAN.kemitraan = "Kemitraan kampus"`; migrasi `DROP TRIGGER IF EXISTS staf_larik_sah` dan `staf_larik_ubah`, lalu `CREATE TRIGGER` dengan daftar peran + `kemitraan` (preseden 0077), karena trigger 0030:29,37 menolak peran baru |
| `src/pengingat.js` | 7 detektor km (§6.4) menulis ke `km_pengingat` (ADR-06); `/admin/pengingat` membaca gabungan `pengingat` + `km_pengingat` |
| `src/akademisi.js` | TIDAK diubah. Worker modul ini tidak pernah memuat `induk.json` (±5 MB, jauh di atas 10 ms CPU); hanya `kemitraan/cocok/<kab4>.json` dan `indeks_bm25/<B>.json` |
| `tests/warga/migrasi_beku.json` | sha256 0080–0084 |
| `scripts/agents/roster.json` | agent `kampus` (§2.3) |
| `AGENTS.md` | baris peta modul + §2.2 urutan dokumen |
| `public/inti/kepala.js` | tautan menu "Kemitraan" berikon (tiket KM-A10); disembunyikan bila `/api/kemitraan/saya` 401 |
| `package.json` | skrip `uji:kemitraan` (tiket KM-A11) |

### 2.3 Agent baru `kampus`
Kelas pengerja, model sonnet. Wilayah: `public/kemitraan*`, `public/kemitraan/**`,
`public/data/kemitraan/**`, `scripts/kemitraan/**`, `tests/kemitraan/**`,
`tests/bnpb/kemitraan_*`, `data/kajian-bnpb/kampus/**`. Bisa: layar, pipeline, fungsi
murni modul ini. Tidak bisa: `src/**`, `migrations/**` (milik `warga-api`), workflow
(milik `mekanik-mesin`). Ilmu awal: ringkasan DS + ALG + PD.

## 3. Model data D1

**Gaya diikuti** (`migrations/0023_relawan.sql`, `0026`, `0053`, `0056`): id TEXT 16 hex;
waktu INTEGER ms UTC; tanggal TEXT `YYYY-MM-DD`; `prov` 2 digit; `kab` = **kode IRBI 4
digit** (`kab4`) untuk tabel baru (beda dengan tabel lama yang memakai nama; konversi
lewat `kode.json`); CHECK panjang semua teks; `dummy INTEGER NOT NULL DEFAULT 0 CHECK
(dummy IN (0,1))` di SEMUA tabel; enum di CHECK identik dengan konstanta JS (dijaga uji);
kode pribadi hanya `kode_sha` 64 hex; trigger alur `RAISE(ABORT,'<nama>: …')`.
Idempoten: hanya `CREATE … IF NOT EXISTS`. Satu tabel didefinisikan sekali.

Singkatan CHECK di bawah: `ID16` = `CHECK (length(X)=16 AND X NOT GLOB '*[^0-9a-f]*')`,
`SHA` = 64 hex, `KAB4` = `length=4 AND NOT GLOB '*[^0-9]*'`, `PROV` = 2 digit,
`T(n,m)` = `length BETWEEN n AND m`, `TGL` = `GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
`DUM` = kolom dummy baku. Pengerja menulis CHECK lengkap, bukan singkatan.

### 3.1 Migrasi 0080_km_dasar.sql
```sql
CREATE TABLE IF NOT EXISTS km_kampus (           -- perluasan institusi (0023), 1:1
  institusi_id TEXT PRIMARY KEY REFERENCES institusi(id),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','aktif','ditolak','dicabut')),
  peran TEXT CHECK (peran IS NULL OR peran IN ('simpul','satelit','mitra')),
  simpul_id TEXT,                                  -- satelit menunjuk simpul (institusi.id)
  kota TEXT CHECK (kota IS NULL OR length(kota) BETWEEN 2 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  web TEXT CHECK (web IS NULL OR (length(web) <= 200 AND web GLOB 'https://*')),
  nama_akademisi TEXT CHECK (nama_akademisi IS NULL OR length(nama_akademisi) <= 160), -- kunci ke akademisi/kampus.json
  pusat_studi TEXT CHECK (pusat_studi IS NULL OR (json_valid(pusat_studi) AND json_type(pusat_studi)='array')),
  fasilitas TEXT CHECK (fasilitas IS NULL OR (json_valid(fasilitas) AND json_type(fasilitas)='array')),
     -- [{jenis:'posko'|'gudang'|'pengungsian'|'rs_pendidikan'|'lab', nama, kapasitas, lat, lon}]
  surat_r2 TEXT CHECK (surat_r2 IS NULL OR surat_r2 GLOB 'kemitraan/surat/*'),
  mk_dibuka INTEGER CHECK (mk_dibuka IS NULL OR mk_dibuka BETWEEN 2026 AND 2035),     -- ADR-03: tahun terakhir MK kebencanaan dibuka (isian KK)
  renkon_ada INTEGER CHECK (renkon_ada IS NULL OR renkon_ada BETWEEN 2026 AND 2035),  -- ADR-03: tahun renkon kampus berlaku (isian KK)
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 500),
  disetujui INTEGER, oleh TEXT,
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, dummy … DUM
);
CREATE TABLE IF NOT EXISTS km_akun (             -- koordinator kampus (pola pdt_akun 0060)
  id TEXT PRIMARY KEY ID16,
  institusi_id TEXT NOT NULL REFERENCES institusi(id),
  peran TEXT NOT NULL DEFAULT 'kk' CHECK (peran IN ('kk')),
  nama TEXT NOT NULL T(2,80), jabatan TEXT T(2,100),
  email TEXT NOT NULL UNIQUE CHECK (length(email) <= 120 AND email LIKE '%_@_%._%'),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  garam TEXT, sandi_sha TEXT,                      -- NULL sampai atur sandi
  atur_sha TEXT, atur_sampai INTEGER,              -- tautan atur sandi sekali pakai (72 jam)
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','aktif','ditolak','dicabut')),
  gagal INTEGER NOT NULL DEFAULT 0, kunci_sampai INTEGER,
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, dummy … DUM
);
CREATE TABLE IF NOT EXISTS km_sesi (sha TEXT PRIMARY KEY SHA, akun_id TEXT NOT NULL REFERENCES km_akun(id),
  dibuat INTEGER NOT NULL, sampai INTEGER NOT NULL CHECK (sampai > dibuat), dummy … DUM);
CREATE TABLE IF NOT EXISTS km_anggota (          -- perluasan relawan (0023), 1:1
  relawan_id TEXT PRIMARY KEY REFERENCES relawan(id),
  unsur TEXT NOT NULL CHECK (unsur IN ('dosen','tendik','mahasiswa','alumni')),
  prodi TEXT CHECK (prodi IS NULL OR length(prodi) BETWEEN 2 AND 100),
  angkatan INTEGER CHECK (angkatan IS NULL OR angkatan BETWEEN 1960 AND 2035),   -- mahasiswa: masuk; alumni: lulus
  instansi TEXT CHECK (instansi IS NULL OR length(instansi) BETWEEN 2 AND 120),  -- alumni
  kab4_kerja TEXT CHECK (kab4_kerja IS NULL OR (length(kab4_kerja)=4 AND kab4_kerja NOT GLOB '*[^0-9]*')),
  mentor INTEGER NOT NULL DEFAULT 0 CHECK (mentor IN (0,1)),
  akademisi_id TEXT CHECK (akademisi_id IS NULL OR akademisi_id GLOB 'A[0-9]*'),  -- dosen yang ada di /akademisi
  latih_kaji_cepat INTEGER NOT NULL DEFAULT 0 CHECK (latih_kaji_cepat IN (0,1)),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, dummy … DUM
);
CREATE TABLE IF NOT EXISTS km_perjanjian (
  id TEXT PRIMARY KEY ID16, institusi_id TEXT REFERENCES institusi(id),   -- NULL = MoU payung (Kemdiktisaintek, BRIN, LPDP)
  jenis TEXT NOT NULL CHECK (jenis IN ('mou_payung','mou_kampus','pks_pendampingan','pks_satgas','lainnya')),  -- mou_relawan & pks_riset TETAP di institusi_perjanjian (ADR-05)
  nomor TEXT NOT NULL T(3,80), pihak TEXT NOT NULL T(3,200),
  mulai TEXT NOT NULL TGL, berakhir TEXT NOT NULL TGL,
  berkas_r2 TEXT CHECK (berkas_r2 IS NULL OR berkas_r2 GLOB 'kemitraan/perjanjian/*.pdf'),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT, dummy … DUM,
  CHECK (berakhir > mulai)                         -- CHECK tabel SELALU di akhir daftar kolom (SQLite)
);
CREATE TABLE IF NOT EXISTS km_bpbd_kode (       -- juga dipakai tim pendataan sementara
  id TEXT PRIMARY KEY ID16, kode_sha TEXT NOT NULL UNIQUE SHA,
  kab4 TEXT NOT NULL KAB4, prov TEXT NOT NULL PROV,
  nama TEXT NOT NULL T(2,80), jabatan TEXT T(2,100), wa TEXT …(62…),
  jenis TEXT NOT NULL DEFAULT 'bpbd' CHECK (jenis IN ('bpbd','tim_pendataan')),
  berlaku INTEGER NOT NULL, dicabut INTEGER,
  dibuat INTEGER NOT NULL, oleh TEXT, dummy … DUM
);
CREATE TABLE IF NOT EXISTS km_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tabel TEXT NOT NULL T(3,40), baris TEXT NOT NULL T(1,40),
  dari TEXT CHECK (dari IS NULL OR length(dari) <= 40), ke TEXT CHECK (ke IS NULL OR length(ke) <= 40),
  aksi TEXT NOT NULL T(2,40), oleh TEXT NOT NULL T(2,80), catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  waktu INTEGER NOT NULL, dummy … DUM
);
CREATE INDEX IF NOT EXISTS idx_km_jejak ON km_jejak (tabel, baris);
-- km_pl_kode (kode pribadi non-anggota: penelaah, pakar piket, pembimbing) DIBUAT DI 0080,
-- karena km_telaah (0082) merujuknya. Kolom: lihat §3.4.
-- km_pengingat: antrean pengingat modul ini (ADR-06), kolom sama dengan tabel pengingat (0028)
-- kecuali jenis (CHECK daftar §6.4) dan sumber_id (T(1,60), boleh bukan 16 hex).
CREATE TRIGGER IF NOT EXISTS km_jejak_beku_u BEFORE UPDATE ON km_jejak BEGIN SELECT RAISE(ABORT,'km_jejak_beku: jejak tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS km_jejak_beku_d BEFORE DELETE ON km_jejak WHEN OLD.dummy = 0 BEGIN SELECT RAISE(ABORT,'km_jejak_beku: jejak tidak boleh dihapus'); END;
```
Catatan: relawan jalur `kampus` dengan `kampus_id` = institusi; status relawan memakai
alur lama (terdaftar → diverifikasi → siap_tugas …). Unsur/latihan di `km_anggota`.

### 3.2 Migrasi 0081_km_masalah.sql
```sql
CREATE TABLE IF NOT EXISTS km_masalah (
  id TEXT PRIMARY KEY ID16,
  kab4 TEXT NOT NULL KAB4, prov TEXT NOT NULL PROV,
  bahaya TEXT NOT NULL CHECK (bahaya IN ('banjir','longsor','gempa','tsunami','gunungapi','kekeringan','karhutla','cuaca_ekstrem','abrasi_rob','udara','multi')),
  aspek TEXT NOT NULL CHECK (aspek IN ('A1','A2','A3','A4','A5','A6','A7','A8','A9','A10')),
  sumber TEXT NOT NULL CHECK (sumber IN ('otomatis','bpbd','unit','lapangan')),
  auto_id TEXT CHECK (auto_id IS NULL OR length(auto_id) <= 60),   -- 'auto-6211-banjir-A2'
  judul TEXT NOT NULL T(5,120), uraian TEXT CHECK (uraian IS NULL OR length(uraian) BETWEEN 50 AND 2000),
  dampak TEXT CHECK (dampak IS NULL OR length(dampak) <= 1000),
  kebutuhan TEXT CHECK (kebutuhan IS NULL OR (json_valid(kebutuhan) AND json_type(kebutuhan)='array')),
  pernah TEXT CHECK (pernah IS NULL OR length(pernah) <= 1000),
  bukti TEXT CHECK (bukti IS NULL OR (json_valid(bukti) AND json_type(bukti)='array')),     -- beku saat diambil
  lampiran TEXT CHECK (lampiran IS NULL OR (json_valid(lampiran) AND json_array_length(lampiran) <= 3)),
  nilai TEXT CHECK (nilai IS NULL OR json_valid(nilai)),        -- {U,C,R,J}
  skor REAL CHECK (skor IS NULL OR skor BETWEEN 0 AND 1),
  kelas TEXT CHECK (kelas IS NULL OR kelas IN ('P1','P2','P3')),
  status TEXT NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan','ditelaah','tervalidasi','digabung','ditolak','dicocokkan','diambil','berjalan','selesai')),
  induk_id TEXT,                                 -- bila digabung
  pengaju TEXT NOT NULL T(2,80),                 -- 'bpbd:<id kode>' / 'staf:<username>'
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 500),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, dummy … DUM,
  CHECK (status <> 'digabung' OR induk_id IS NOT NULL),
  CHECK (sumber <> 'otomatis' OR auto_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_km_masalah_auto ON km_masalah (auto_id) WHERE auto_id IS NOT NULL AND dummy = 0;
CREATE INDEX IF NOT EXISTS idx_km_masalah_kab ON km_masalah (kab4, status);
-- alur sah (sama dengan ALUR_MASALAH di src/kemitraan_masalah.js)
CREATE TRIGGER IF NOT EXISTS km_masalah_alur BEFORE UPDATE OF status ON km_masalah
WHEN NEW.status <> OLD.status AND (OLD.status || '>' || NEW.status) NOT IN (
 'diajukan>ditelaah','diajukan>tervalidasi','diajukan>ditolak','diajukan>digabung',
 'ditelaah>tervalidasi','ditelaah>ditolak','ditelaah>digabung',
 'tervalidasi>dicocokkan','dicocokkan>diambil','tervalidasi>diambil',
 'diambil>berjalan','berjalan>selesai','ditolak>ditelaah')
BEGIN SELECT RAISE(ABORT,'km_masalah_alur: transisi status tidak sah'); END;

CREATE TABLE IF NOT EXISTS km_masalah_pakar (
  id TEXT PRIMARY KEY ID16, masalah_id TEXT NOT NULL REFERENCES km_masalah(id),
  akademisi_id TEXT NOT NULL CHECK (akademisi_id GLOB 'A[0-9]*'),
  peringkat INTEGER NOT NULL CHECK (peringkat BETWEEN 1 AND 10), skor REAL NOT NULL CHECK (skor BETWEEN 0 AND 1),
  pecah TEXT NOT NULL CHECK (json_valid(pecah)),                  -- {teks,rumpun,lokal,mutu,jarak,rekam}
  status TEXT NOT NULL DEFAULT 'disarankan' CHECK (status IN ('disarankan','dihubungi','bersedia','tidak','tanpa_jawaban')),
  dihitung INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT, dummy … DUM,
  UNIQUE (masalah_id, akademisi_id)
);
CREATE TABLE IF NOT EXISTS km_kunjungan (
  id TEXT PRIMARY KEY ID16, kab4 TEXT NOT NULL KAB4, tanggal TEXT NOT NULL TGL,
  tim TEXT NOT NULL CHECK (json_valid(tim) AND json_type(tim)='array' AND json_array_length(tim) BETWEEN 1 AND 12),
  narasumber TEXT NOT NULL CHECK (json_valid(narasumber) AND json_type(narasumber)='array'),
  status TEXT NOT NULL DEFAULT 'rencana' CHECK (status IN ('rencana','berjalan','selesai','batal')),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL, dummy … DUM
);
CREATE TABLE IF NOT EXISTS km_jawaban (
  id TEXT PRIMARY KEY ID16, kunjungan_id TEXT NOT NULL REFERENCES km_kunjungan(id),
  klien_id TEXT NOT NULL CHECK (length(klien_id) BETWEEN 8 AND 40),     -- id PER JAWABAN dibuat klien (bukan per kiriman)
  narasumber TEXT NOT NULL CHECK (narasumber IN ('bpbd','bappeda','pu','dinkes','dinsos','kades','warga','usaha')),
  templat_id TEXT NOT NULL T(2,40), masalah_id TEXT REFERENCES km_masalah(id),
  auto_id TEXT CHECK (auto_id IS NULL OR length(auto_id) <= 60),   -- jawaban atas masalah otomatis yang belum diambil: server mengambilnya dulu lalu mengisi masalah_id
  pilihan TEXT CHECK (pilihan IS NULL OR pilihan IN ('ya','sebagian','tidak')),
  teks TEXT CHECK (teks IS NULL OR length(teks) <= 3000), angka REAL,
  dibuat INTEGER NOT NULL, waktu_klien INTEGER, oleh TEXT NOT NULL, dummy … DUM,   -- nama kolom sama dengan antre.js
  UNIQUE (kunjungan_id, klien_id)
);
CREATE TABLE IF NOT EXISTS km_koreksi (
  id TEXT PRIMARY KEY ID16, kab4 TEXT NOT NULL KAB4, kunjungan_id TEXT REFERENCES km_kunjungan(id),
  jalur TEXT NOT NULL T(3,80),                    -- jalur JSON profil, mis. 'kapasitas.rpb'
  lama TEXT CHECK (lama IS NULL OR length(lama) <= 200), baru TEXT NOT NULL T(1,200),
  sumber TEXT NOT NULL T(3,200),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','diterima','ditolak')),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL, dummy … DUM
);
```

### 3.3 Migrasi 0082_km_riset.sql
Tabel dan kolom kunci (pengerja menulis CHECK lengkap gaya §3):
- `km_donor` (id, nama T(2,120), jenis `internasional|nasional|bumn|swasta|filantropi`,
  bahaya JSON array ⊂ 11 bahaya ∪ {'semua'}, aspek JSON array ⊂ A1..A10, syarat_mitra TEXT ≤ 500,
  status `siap|terbatas|belum`, tautan https, catatan ≤ 1000, dibuat, diubah, DUM).
- `km_panggilan_donor` (id, donor_id FK, judul T(5,200), buka TGL, tenggat TGL, nilai_maks
  INTEGER ≥ 0 (rupiah), mata_uang `IDR|USD|EUR|JPY|AUD|KRW`, tautan, DUM; CHECK tenggat ≥ buka).
- `km_proposal` (id, masalah_id FK nullable, donor_id FK nullable, panggilan_id FK nullable,
  judul T(5,200), ketua_institusi FK institusi, status `ide|tim|draf|diajukan|lolos|ditolak|berjalan|selesai`,
  nilai_diminta, nilai_disetujui, dana_pendamping (INTEGER rupiah ≥ 0), surat_nomor
  (`GLOB 'KM/SD/[0-9][0-9][0-9][0-9]/*'` UNIQUE), berkas_r2, diajukan_tgl, hasil_tgl,
  pelajaran ≤ 2000, DUM). Trigger `km_proposal_alur`: ide>tim, tim>draf, draf>diajukan,
  diajukan>lolos, diajukan>ditolak, lolos>berjalan, berjalan>selesai, (mundur) draf>tim, tim>ide.
- `km_konsorsium` (id, proposal_id FK, jenis `kampus|pakar|mitra_ln|unit_bnpb|bpbd`, rujukan
  (institusi_id/akademisi_id/teks), nama T(2,160), negara (2 huruf) nullable, peran
  `ketua|anggota|pendamping`, DUM; UNIQUE(proposal_id, jenis, rujukan)).
- `km_hibah_panggilan` (id, tahun, judul, agenda JSON array id riset_agenda, pagu INTEGER,
  kuota_per_kampus 1–5, rubrik JSON `[{kriteria, bobot}]` dengan Σbobot=100 (dijaga JS +
  trigger: `coalesce((SELECT SUM(json_extract(value,'$.bobot')) FROM json_each(NEW.rubrik)),0) <> 100` → ABORT; rubrik kosong ikut ditolak), tenggat TGL, status `draf|buka|telaah|diumumkan`, DUM).
- `km_hibah_proposal` (id, panggilan_id FK, institusi_id FK, masalah_id FK nullable,
  judul, ketua T(2,80), anggota JSON, metode ≤ 5000, anggaran INTEGER, berkas_r2, nilai REAL,
  bendera_selisih 0/1, status `diajukan|ditelaah|lolos|cadangan|tidak|ditarik`,
  riset_usulan_id (diisi saat lolos), DUM).
- `km_telaah` (id, hibah_proposal_id FK, penelaah_akademisi_id, pl_kode_id FK km_pl_kode,
  skor JSON `{kriteria: 0..5}`, catatan ≤ 3000, dikirim INTEGER nullable, DUM;
  trigger `km_telaah_beku`: UPDATE setelah dikirim ditolak).
- `km_inovasi` (id, institusi_id FK, nama, masalah_id nullable, bahaya, tkt 1–9, tkt_bukti JSON
  array 9 butir, tkt_verif 1–9 nullable, uji `belum|dijadwalkan|lolos|gagal`, uji_kab4, uji_tgl,
  ekatalog `belum|proses|tayang`, kontak, DUM).
- `km_agenda_sumber` (agenda_id FK riset_agenda, masalah_id FK km_masalah, PK keduanya, DUM).

### 3.4 Migrasi 0083_km_satgas.sql
- `km_satgas` (id, institusi_id FK; `CREATE UNIQUE INDEX uq_km_satgas ON km_satgas(institusi_id) WHERE dummy=0`, ketua_relawan_id, wakil_kampus_id,
  wakil_mahasiswa_id, wakil_alumni_id (semua FK relawan nullable), radius_km 10–1000,
  status (dihitung, disimpan cache) `belum_lengkap|siap|terbatas|tidak_siap`, DUM).
  Aturan status (`status_satgas`): `belum_lengkap` bila ketua atau salah satu dari 3 wakil kosong;
  `siap` bila lengkap, ≥ 10 anggota `siap_tugas`, ≥ 3 anggota punya baris `relawan_pelatihan`
  dengan `berlaku_sampai` NULL atau ≥ hari ini; `terbatas` bila lengkap dan 3–9 anggota siap;
  `tidak_siap` bila lengkap dan < 3 anggota siap.
  Trigger: wakil_mahasiswa harus unsur mahasiswa, wakil_alumni unsur alumni (EXISTS ke km_anggota).
- `km_satgas_anggota` (satgas_id, relawan_id, PK keduanya, DUM).
- `km_pl_kode` (id, kode_sha SHA UNIQUE, jenis `penelaah|pakar_piket|pembimbing`, akademisi_id
  nullable, nama T(2,80), wa, berlaku, dicabut, DUM) — kode pribadi non-anggota. **Dibuat di 0080.**
- `km_piket` (id, minggu TGL (Senin), rumpun (13 nilai /akademisi), akademisi_id, peran
  `utama|cadangan`, pl_kode_id FK, jawab `belum|bersedia|tidak`, dijawab INTEGER, DUM;
  UNIQUE(minggu, rumpun, akademisi_id)).
- `km_aktivasi` (id, judul T(5,160), bahaya (11), kab4, prov, tanggal TGL, lat, lon, radius_km
  50–500, kebutuhan JSON `[{keahlian, jumlah}]`, sumber `peringatan|dibi|manual`, sumber_id,
  status `buka|tutup`, dibuka INTEGER, ditutup INTEGER nullable, oleh, DUM,
  permintaan_id FK relawan_permintaan NOT NULL: dibuat bersama aktivasi (ADR-08), karena
  `relawan_penugasan.permintaan_id` NOT NULL (0023:117)).
- `km_panggilan` (id, aktivasi_id FK, relawan_id FK nullable, akademisi_id nullable,
  jenis `anggota|pakar`, urutan REAL, dikirim INTEGER nullable, jawab `belum|bersedia|tidak`,
  hari_tersedia 1–30 nullable, dijawab INTEGER nullable, penugasan_id FK relawan_penugasan
  nullable, DUM; UNIQUE(aktivasi_id, relawan_id), UNIQUE(aktivasi_id, akademisi_id)).
- `km_aktivasi_laporan` (id, aktivasi_id FK, tanggal TGL, institusi_id, anggota_hadir INTEGER,
  ringkas ≤ 2000, angka JSON, oleh, DUM; UNIQUE(aktivasi_id, institusi_id, tanggal)).
- `km_aktivasi_meja` (aktivasi_id, meja_petugas_id FK meja_petugas, PK keduanya, DUM) —
  tim kaji cepat; kode meja dicabut otomatis saat aktivasi ditutup (cron bersih menit 17).
- `km_sertifikat` (id 16 hex, jenis `satgas|magang|pelatihan`, relawan_id FK, nama_tampil
  T(2,80), institusi_nama, peran, jam REAL, rujukan_id (aktivasi/magang), terbit TGL,
  dicabut nullable, DUM).
- `km_pelajaran` (id, aktivasi_id FK UNIQUE, kerangka JSON, analisis ≤ 10000, penulis_akademisi_id,
  status `draf|terbit`, DUM).

### 3.5 Migrasi 0084_km_talenta.sql
- `km_magang` (id, penyelenggara `bnpb|bpbd`, unit T(2,120), kab4 nullable (wajib bila bpbd),
  kuota 1–50, keahlian JSON, mulai TGL, selesai TGL (> mulai), pembimbing_nama, pembimbing_wa,
  pl_kode_id (pembimbing), status `draf|buka|tutup|berjalan|selesai`, DUM).
- `km_magang_lamar` (id, magang_id FK, relawan_id FK, motivasi ≤ 1000, cv_r2, status
  `diajukan|diterima|ditolak|cadangan|berjalan|dinilai|selesai|mundur`, meja_petugas_id
  nullable, nilai JSON `{b1..b6: 1..5}`, catatan_pembimbing ≤ 2000, sertifikat_id, DUM;
  UNIQUE(magang_id, relawan_id); trigger `km_magang_lamar_alur`, transisi sah:
  diajukan>diterima, diajukan>ditolak, diajukan>cadangan, cadangan>diterima, cadangan>ditolak,
  diterima>berjalan, berjalan>dinilai, dinilai>selesai, diajukan>mundur, diterima>mundur, berjalan>mundur).
- `km_mentor` (id, mentor_relawan_id FK (unsur alumni, mentor=1), lamar_id FK, status
  `disarankan|dipasangkan|selesai`, DUM).
- `km_desa` (id, institusi_id FK, desa_kode `GLOB '[0-9][0-9].[0-9][0-9].[0-9][0-9].[0-9][0-9][0-9][0-9]'`,
  kab4, nama_desa, tema JSON, mulai TGL, status `aktif|pasif`, DUM; UNIQUE(institusi_id, desa_kode)).
- `km_desa_catatan` (id, desa_id FK, tanggal TGL, angkatan, kegiatan ≤ 2000, temuan ≤ 2000,
  rencana ≤ 1000, foto JSON ≤ 3, oleh, DUM).
- `km_dampingan` (id, kab4, institusi_id FK, jenis `KRB|RPB|IKD|renkon|destana`, mulai, tenggat,
  status `berjalan|disusun|selesai|kedaluwarsa|batal`, dana `swakelola|apbd|hibah|lainnya`,
  bukti_r2, DUM). Indeks: `CREATE UNIQUE INDEX uq_km_dampingan ON km_dampingan(kab4, jenis, institusi_id)
  WHERE dummy=0 AND status IN ('berjalan','disusun')` (UNIQUE…WHERE tidak boleh di dalam CREATE TABLE).
- `km_bumn` (id, nama, jenis `bumn|swasta`, bidang_tjsl ≤ 300, kab4 JSON array, status
  `baru|dijajaki|sepakat|tidak`, catatan, DUM).
- `km_modul` (id, judul, kategori `mk|rps|latih_korps|kkn|kaji_cepat|lainnya`, versi T(1,20),
  berkas_r2, mime `application/pdf|…docx|…pptx`, ukuran ≤ 10.485.760, unduh INTEGER default 0,
  terbit TGL, DUM).

## 4. Kontrak API

### 4.1 Aturan bersama
- Hak: **ST** staf peran `kemitraan` atau admin; **PM** + `pimpinan`; **SA** `superOK`;
  **KK** sesi `km_sesi` (cookie `sesi_kemitraan`, HttpOnly, Secure, SameSite=Strict,
  header wajib `x-km: 1`); **AG** `x-kode` → relawan.kode_sha + km_anggota; **BP** `x-kode`
  → km_bpbd_kode berlaku; **PL** `x-kode` → km_pl_kode berlaku; **PB** publik.
- Halaman `/kemitraan/saya` menerima satu kode; server menentukan jenisnya (AG/BP/PL)
  dengan mencari sha di tiga tabel (urutan tetap) dan menjawab `{jenis}`.
- Semua POST lewat `tolakOrigin`. Body JSON ≤ 64 KB; unggah berkas `multipart` ≤ batas
  per jenis; cek magic byte (PDF `%PDF`, JPG `FFD8FF`, PNG `89504E47`, DOCX/PPTX `504B0304`).
- Laju (per IP per jam, tabel `laju_bnpb` 0022): daftar 10, masuk 20 (kunci akun 15 menit
  setelah 5 gagal), kode 60, tulis lain 300.
- Galat: `{galat:"<kalimat baku>"}` + status 400/401/403/404/409/413/429/503. 503 bila
  tabel belum dimigrasi (`lindungi()` pola relawan).
- Jawaban daftar dipaginasi `?hal=&per=` (per ≤ 100).

### 4.2 Halaman
| Jalur | Hak | Perilaku |
| --- | --- | --- |
| `GET /kemitraan` | ST, PM, KK | cangkang; tanpa sesi → layar masuk (tautan `/admin` staf, `/kemitraan/masuk` KK) |
| `GET /kemitraan/buku?kab=&prov=` | ST, PM, KK, BP (kabnya) | halaman cetak; BP lewat `#k=` |
| `GET /kemitraan/panduan?kab=&masalah=&n=` | ST, BP | cetak panduan |
| `GET /kemitraan/daftar` | PB | form kampus/anggota (Turnstile bila ada sitekey) |
| `GET /kemitraan/masuk` | PB | form masuk KK + atur sandi `?atur=<token>` |
| `GET /kemitraan/saya` | PB (cangkang) | halaman berkode: kode di `#k=` tidak sampai ke server, jadi halaman publik tanpa data; hak ditegakkan `/api/kemitraan/saya` (KM-A09) |
| `GET /kemitraan/sertifikat/:id` | PB | verifikasi: nama tampil, kampus, peran, jam, tanggal, status; tanpa kontak |

> **Catatan KM-A09 (30 Okt 2026):** `/buku` (SA/ST/PM/KK) dan `/panduan` (SA/ST) kini 303 ke `/kemitraan/masuk` tanpa sesi. Akibatnya BP (kode `#k=`) belum bisa membuka keduanya lewat navigasi. KM-B08 dan KM-C02-js wajib memutuskan: jadikan cangkang publik (data dari API berhak) atau beri BP sesi. Sampai itu, baris tabel di atas untuk BP belum terpenuhi.

### 4.3 API (ringkas; masukan divalidasi sesuai CHECK §3)
| Metode dan jalur | Hak | Masukan | Laju | Jawaban |
| --- | --- | --- | --- | --- |
| `GET /api/kemitraan/publik/ringkas` | PB | – | cache 10 mnt | angka agregat (kampus aktif, anggota per unsur k≥5, modul) |
| `GET /api/kemitraan/publik/kampus` | PB | – | cache | daftar kampus aktif (nama, prov) untuk form daftar |
| `GET /api/kemitraan/publik/modul` / `GET …/modul/:id` | PB | – | 600 | daftar / unduh R2 (hitung++) |
| `POST /api/kemitraan/daftar/kampus` | PB | multipart: form F-D2 + surat PDF | 10 | 201 `{ok}` |
| `POST /api/kemitraan/daftar/anggota` | PB | form F-D2 | 10 | 201 `{ok}` (tanpa bocor duplikat) |
| `POST /api/kemitraan/masuk` / `…/atur-sandi` / `…/keluar` | PB/KK | email+sandi / token+sandi | 20 | cookie |
| `GET /api/kemitraan/saya` | AG/BP/PL/KK | – | 60 | `{jenis, profil, panggilan[], tugas[], …}` sesuai jenis |
| `GET /api/kemitraan/daerah/:kab4/pakar?masalah=` | ST, PM, KK, BP(kabnya) | – | 300 | top-10 dari R2 `cocok` / hitung (§5.2) |
| `GET /api/kemitraan/masalah?kab4=&status=&b=&a=&kelas=` | ST, PM, KK, BP(kabnya) | – | 300 | daftar |
| `POST /api/kemitraan/masalah` | ST, BP | F-M4 | 60 | 201 |
| `POST /api/kemitraan/masalah/ambil` | ST | `{auto_id}` | 60 | 201 (409 bila sudah) |
| `POST /api/kemitraan/masalah/:id/status` | ST | `{ke, nilai?, induk_id?, alasan?}` | 300 | 200 |
| `POST /api/kemitraan/masalah/:id/pakar/:aid` | ST | `{status}` | 300 | 200 |
| `POST /api/kemitraan/kunjungan` / `…/:id/status` | ST | – | 60 | – |
| `POST /api/kemitraan/kunjungan/:id/jawaban` | ST, BP(tim) | larik ≤ 100 jawaban, idempoten `klien_id` | 300 | `{diterima, duplikat}` |
| `POST /api/kemitraan/koreksi` / `…/:id` | ST, BP / ST | – | 60 | – |
| `GET/POST /api/kemitraan/kampus[/:id]` | ST (semua), KK (miliknya) | profil, setujui/tolak (ST) | 300 | – |
| `POST /api/kemitraan/kampus/:id/anggota/:rid` | KK, ST | `{aksi: setujui|tolak|kode}` | 300 | kode sekali tampil |
| `GET/POST /api/kemitraan/perjanjian[/:id]` | ST, KK (miliknya) | multipart PDF | 60 | – |
| `POST /api/kemitraan/bpbd-kode` | ST | kab4, nama, berlaku | 60 | kode sekali |
| `…/donor`, `…/donor/:id/panggilan` | ST (tulis), PM/KK (baca) | – | 300 | – |
| `…/proposal`, `…/proposal/:id`, `…/proposal/:id/konsorsium`, `…/proposal/:id/surat` | ST, KK (ketua/anggota) | – | 300 | surat → DOCX |
| `…/hibah`, `…/hibah/:id/proposal`, `…/hibah/:id/telaah`, `…/hibah/:id/umumkan` | ST / KK / PL | – | 300 | – |
| `…/inovasi[/:id]` | KK (tulis miliknya), ST (verifikasi) | – | 300 | – |
| `POST /api/kemitraan/agenda/susun` / `…/terbit` | ST | `{tahun}` | 10 | draf / terbit |
| `…/satgas[/:id]`, `…/satgas/:id/anggota` | KK (miliknya), ST | – | 300 | – |
| `…/piket?minggu=`, `POST …/piket` | ST | – | 300 | kode PL |
| `POST /api/kemitraan/aktivasi` | ST | §3.4 | 30 | 201 + calon (ALG §9) |
| `POST /api/kemitraan/aktivasi/:id/panggil` | ST | `{calon:[…]}` | 60 | `{panggilan:[{id, wa_url}]}` |
| `POST /api/kemitraan/panggilan/:id/kirim` | ST | – | 600 | tandai dikirim |
| `POST /api/kemitraan/panggilan/:id/jawab` | AG, PL | `{jawab, hari?}` | 60 | 200 |
| `POST /api/kemitraan/aktivasi/:id/tugaskan` / `…/kajicepat` / `…/laporan` / `…/tutup` | ST / ST / KK,ST / ST | – | 300 | – |
| `…/sertifikat` (ST/KK terbit), `…/pelajaran/:aktivasi` | ST, KK, pakar PL | – | 300 | – |
| `…/magang`, `…/magang/:id/lamar` (AG), `…/lamar/:id/status` (ST,BP), `…/lamar/:id/nilai` (PL pembimbing) | | – | 300 | – |
| `…/mentor`, `…/desa`, `…/desa/:id/catatan`, `…/dampingan`, `…/bumn`, `…/modul` (ST unggah) | | – | 300 | – |
| `GET /api/kemitraan/dasbor` | ST, PM | `?tahun=` | 60 | 14 indikator (§6.3) |
| `POST /api/kemitraan/dummy` | SA | `{aksi}` | 10 | ringkas jumlah |

## 5. Fungsi murni dan perhitungan

### 5.1 Tempat
Python `scripts/kemitraan/*.py` (pipeline) dan JS `src/kemitraan_hitung.js` (worker) +
`public/kemitraan/hitung.js` (layar) untuk rumus yang dipakai di tiga tempat. Kasus acuan
`tests/kemitraan/fixtures/acuan.json` berisi masukan + keluaran per rumus (≥ 5 kasus
per rumus, termasuk tepi: null, seri, nol). Uji paritas menjalankan ketiganya.

| Fungsi | ALG | Py | JS worker | JS layar |
| --- | --- | --- | --- | --- |
| `persentil(xs, x)` | §3.1 | ✓ | ✓ | – |
| `theil_sen(seri)` | §3.1 | ✓ | – | – |
| `skor_auto(komp)` | §3.2 | ✓ | ✓ | ✓ |
| `masalah_aturan(profil)` | §3.3 | ✓ | – | – |
| `skor_bpbd(nilai, auto)` | §3.4 | – | ✓ | ✓ |
| `jaccard(a,b)` | §3.5 | ✓ | ✓ | – |
| `token(teks)` | §4.2 | ✓ | ✓ | ✓ |
| `bm25(q, d, stat)` | §4.3 | ✓ | ✓ | – |
| `skor_pakar(komp)` + `ragam(daftar)` | §4.5 | ✓ | ✓ | – |
| `kalimat(abstrak)` + `solusi(kal, q)` | §5 | ✓ | – | – |
| `syarat(ekspr, profil)` + `susun_panduan(…)` | §6 | ✓ | – | ✓ |
| `aktif_kampus(…)` | §7 | – | ✓ | – |
| `cocok_donor(m,d)` | §8 | – | ✓ | ✓ |
| `urut_panggil(…)` | §9 | – | ✓ | – |
| `status_perjanjian(berakhir, kini)` | – | – | ✓ | ✓ |

### 5.2 Pakar untuk masalah BPBD (worker)
1. Muat `kemitraan/cocok/<kab4>.json` (R2). Bila masalah otomatis dengan (B,A) sama
   ada, pakai daftarnya (peringkat ulang hanya bila teks berbeda Jaccard < 0.5).
2. Selain itu: muat `kemitraan/indeks_bm25/<B>.json` (≤ 400 KB; berisi `N, avgdl, df{t},
   posting{t: [[pakar_idx, karya_idx, tf_judul, tf_isi, panjang]]}`, `pakar[]` ringkas
   `{id, kampus, lat, lon, h_pct, baru_pct, rumpun[], lokal{kab4[],prov[]}, rekam}`).
3. Hitung §4.3–§4.5 dengan **anggaran operasi**, bukan waktu (`Date.now()` di Workers tidak
   bergerak selama komputasi sinkron): jumlahkan panjang posting list semua token kueri;
   bila > `KM_MAKS_POSTING` (konst, 20.000) atau kandidat > 400, jangan hitung: kembalikan
   `{status:"antre"}`; masalah tetap `tervalidasi` dan diisi `cocok_baru.py` (harian).
4. Simpan hasil ke `km_masalah_pakar` (peringkat 1–10) dan status masalah `dicocokkan`.

### 5.3 Ekspor untuk pipeline
`GET /api/kemitraan/ekspor/masalah-antre` dengan header `x-pipa-token` (secret
`KM_PIPA_TOKEN`, dibandingkan waktu-tetap) → masalah status `tervalidasi` tanpa pakar.
`POST /api/kemitraan/ekspor/cocok` mengunggah hasil. `GET /api/kemitraan/ekspor/rekam` →
`[akademisi_id]` yang tercatat di km_masalah_pakar bersedia, km_piket bersedia, km_konsorsium,
km_telaah (komponen E ALG §4.4). `GET /api/kemitraan/ekspor/kapasitas` → per kab4:
kampus pendamping, desa binaan (dipakai `profil_daerah.py`). Hanya dipanggil workflow.

## 6. Alur teknis penting

### 6.1 Kode pribadi
`kodeBaru()` (`src/bnpb.js:23`, 26 hex) → simpan `kode_sha`; kode tampil sekali di
jawaban; wa.me dibangun klien: `https://wa.me/<62…>?text=<encodeURIComponent(teks baku +
https://<host>/kemitraan/saya#k=<kode>)>`. Kode tidak pernah masuk log/URL kueri.

### 6.2 Atur sandi KK
Token 32 hex, `atur_sha` + `atur_sampai` (72 jam), sekali pakai (dikosongkan setelah
dipakai). Sandi ≥ 10 huruf → `hashSandi(garam, sandi)` (`src/pendataan.js:22`,
PBKDF2-SHA256 100k). Sesi 12 jam, sha di `km_sesi`.

### 6.3 Kueri indikator (dasbor, slide 28)
| No | Indikator | Kueri (dummy=0, tahun T) |
| --- | --- | --- |
| 1 | Kampus mitra ber-MoU | COUNT km_kampus aktif ∩ km_perjanjian mou_kampus aktif |
| 2 | Provinsi tercakup bank masalah | COUNT DISTINCT prov km_masalah status ≥ tervalidasi |
| 3 | Kampus menawarkan MK | COUNT km_kampus aktif dengan `mk_dibuka = T` (isian KK, ADR-03) |
| 4 | Hibah riset bersama | COUNT km_hibah_proposal lolos tahun T |
| 5 | Artikel bersama terbit | COUNT riset_luaran jenis artikel disetujui tahun T (dari usulan bertaut km) |
| 6 | Naskah kebijakan ringkas | COUNT riset_luaran jenis policy_brief tahun T |
| 7 | Inovasi diuji lapangan | COUNT km_inovasi uji ∈ (lolos, gagal) |
| 8 | Proposal ke donor internasional | COUNT km_proposal diajukan+ dengan donor jenis internasional |
| 9 | Anggota korps relawan terlatih | COUNT DISTINCT relawan jalur kampus yang punya ≥ 1 baris `relawan_pelatihan` (tabel tak punya kolom lulus; baris = ikut) |
| 10 | Desa tangguh binaan kampus | COUNT km_desa aktif |
| 11 | Pakar terdaftar siaga | COUNT DISTINCT akademisi_id km_piket jawab bersedia tahun T |
| 12 | Kab/kota didampingi KRB dan RPB | COUNT DISTINCT kab4 km_dampingan jenis ∈ (KRB,RPB) status ≠ batal |
| 13 | Kampus punya rencana kontinjensi | COUNT km_kampus aktif dengan `renkon_ada ≥ T` (isian KK, ADR-03) |
| 14 | Dana mitra per Rp1 APBN (%) | Σ dana_pendamping proposal lolos / Σ pagu hibah BNPB tahun T × 100 |

### 6.4 Cron (di dispatcher `W.scheduled`, src/worker.js:840)
- 00:40 UTC (pengingat): 7 detektor km → `km_pengingat`: `km_perjanjian` (≤ 60 hari / habis ≤ 30 hari),
  `km_tenggat_donor` (≤ 30 dan ≤ 7 hari), `km_masalah_basi` (diajukan > 14 hari), `km_telaah_lambat`
  (telaah belum dikirim 7 hari setelah ditugaskan), `km_piket_kosong` (Kamis; rumpun tanpa pakar
  bersedia minggu depan; sumber_id = `<minggu>-<rumpun>`), `km_magang_nilai` (selesai periode tanpa
  nilai 7 hari), `km_kampus_menunggu` (kampus/akun menunggu > 3 hari).
- menit 17 (bersih): cabut kode meja aktivasi tutup; hapus `km_sesi` kedaluwarsa; anonim
  anggota cabut (pola relawan 180 hari berlaku karena di tabel relawan).
- Tidak ada cron baru (batas 5).

## 7. Pipeline

### 7.1 `kemitraan.yml` (harian 02.30 UTC, sesudah `lintas.yml`; group `data` antre)
```
python3 scripts/kemitraan/kode.py --cek && python3 scripts/kemitraan/kode.py
python3 scripts/kemitraan/profil_daerah.py --cek && python3 scripts/kemitraan/profil_daerah.py
python3 scripts/kemitraan/pertanyaan.py --cek        # salin pertanyaan.json + kamus.json ke public
python3 scripts/kemitraan/profil_daerah.py --jaga            # tolak commit bila < 514 berkas atau tanggal mundur (jaga_segar.py TIDAK dipakai: hanya memeriksa meta/hotspot)
python3 scripts/kemitraan/cocok_baru.py                       # masalah antre → R2 + POST ekspor/cocok
git commit -- public/data/kemitraan                         # pola commit pipeline lain
```
Waktu ≤ 10 menit. Memori ≤ 2 GB (baca berkas per prov). Secret: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID` (baca R2 `akademisi/kampus.json` untuk `kampus_terdekat`, tulis
`kemitraan/cocok/`), `KM_PIPA_TOKEN` (ekspor kapasitas/rekam/masalah-antre).

### 7.2 `kemitraan-pakar.yml` (bulanan tanggal 2, 03.00 UTC + dispatch)
```
wrangler r2 object get poskokarhutla-foto/akademisi/induk.json → /tmp (tidak di-commit)
python3 scripts/kemitraan/korpus.py    # OpenAlex works per pakar, cache R2, ≤ 8 req/dtk, lanjut-dari-terakhir
python3 scripts/kemitraan/indeks_bm25.py   # → R2 kemitraan/indeks_bm25/<B>.json
python3 scripts/kemitraan/cocok_pakar.py   # → R2 kemitraan/cocok/<kab4>.json
python3 scripts/kemitraan/uji_cocok.py --bila-ada-label  # → public/data/kemitraan/uji_cocok.json
```
Batas waktu job 6 jam; korpus dapat dicicil (status di R2 `kemitraan/korpus/_status.json`).
Secret: `OPENALEX_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `KM_PIPA_TOKEN`.

## 8. Keamanan, performa, dummy
- KM berisi rinci hak dan PDP. CSP halaman: `script-src 'self'`, CDN hanya xlsx/docx/jspdf
  versi yang sama dengan /akademisi untuk ekspor daftar pendek (sudah diizinkan di CSP
  akademisi; salin entri).
- `_headers`: berkas statis baru ±40 → periksa `scripts/terbit/versi.py` (≤ 100 aturan;
  pakai pola `/kemitraan/*` satu aturan).
- Performa: JSON daerah ≤ 60 KB; daftar 514 kab dari `ringkas.json` (≤ 120 KB) bukan
  memuat 514 berkas; buku memuat 1 berkas daerah + geo prov.
- Dummy: kampus dummy bernama "Universitas Contoh N" (N 1–3), kab4 dummy memakai kab nyata
  tetapi `dummy=1`; kode surat `KM/SD/<tahun>/D…`; dasbor `WHERE dummy=0`.

## 9. ADR
### ADR-01 Kunci kab = kode IRBI 4 digit (DITERIMA)
Konteks: empat skema kode di repo (PD §2). Opsi: BPS, Kemendagri, IRBI. Keputusan: IRBI,
karena profil wilayah dan IRBI (sumber risiko utama) memakainya, dan crosswalk eksplisit.
Konsekuensi: tabel lama ber-nama di-join lewat `kode.json`.

### ADR-02 Anggota memakai tabel `relawan` (DITERIMA)
Konteks: KP 4 (tiru yang ada). Relawan sudah punya status, jam, penugasan, PDP, anonim.
Keputusan: anggota = relawan jalur kampus + `km_anggota`. Konsekuensi: alur status relawan
berlaku; unsur alumni menempel ke kampus asal.

### ADR-03 Indikator 3 dan 13 tidak bisa dihitung dari aktivitas (PERLU PEMILIK †)
Tidak ada data yang mencatat kampus membuka MK atau memiliki renkon. Bawaan: KK mengisi
tahun di profil kampus, kolom `mk_dibuka` dan `renkon_ada` (§3.1). Dasbor menandai
"isian kampus, belum diverifikasi".

### ADR-04 Hitung pakar sebagian di pipeline (DITERIMA)
CPU Worker Free ±10 ms tidak cukup untuk BM25 atas puluhan ribu karya. Masalah otomatis
dihitung bulanan; masalah baru dicoba di worker dengan indeks ringkas, sisanya malam.

### ADR-05 Perjanjian lama tetap di `institusi_perjanjian` (DITERIMA)
`mou_relawan` dan `pks_riset` beserta pengingatnya sudah hidup (0023:26-41, pengingat.js:19).
`km_perjanjian` hanya untuk jenis baru (mou_payung, mou_kampus, pks_pendampingan, pks_satgas,
lainnya). Lembar kampus menampilkan gabungan keduanya. Anggota kemitraan TIDAK lewat
`/api/relawan/daftar` (yang mewajibkan MoU berkuota, relawan.js:101-107); `kemitraan_akun.js`
menyisip `relawan` jalur `kampus` langsung, jadi kuota MoU relawan tidak berlaku untuk modul ini.
Kode koordinator lama (`institusi.kode_sha`, halaman `/kampus`) tetap jalan; KK baru setara.

### ADR-06 Pengingat modul di tabel sendiri `km_pengingat` (DITERIMA)
`pengingat.jenis` ber-CHECK 9 nilai dan `sumber_id` wajib 16 karakter (0028:21-22); membangun
ulang tabel lama melanggar aturan migrasi idempoten. `km_pengingat` (0080) bentuknya sama,
`jenis` = 7 nilai §6.4, `sumber_id` T(1,60). `src/pengingat.js` menjalankan detektor km dan
menulis ke tabel itu; layar membaca UNION keduanya.

### ADR-07 Sub-router modul (DITERIMA)
`rute()` hanya mengenali `:id` 16 hex di ujung jalur (worker.js:613-614). Modul ini butuh
`/api/kemitraan/masalah/:id/status`, `…/kampus/:id/anggota/:rid`, `…/masalah/:id/pakar/:aid`
(id OpenAlex `A\d+`), `…/daerah/:kab4/pakar`. Satu cabang di worker menyerahkan semua jalur
berawalan `/kemitraan` dan `/api/kemitraan/` ke `ruteKm(metode, jalur)` (src/kemitraan.js) yang
mencocokkan pola sendiri: `:id` = 16 hex, `:rid` = 16 hex, `:aid` = `A[0-9]{4,12}`, `:kab4` =
4 digit, lainnya 404. Gerbang situs centurisk97.id dilewati untuk awalan itu; `hakKm` yang menjaga.

### ADR-08 Aktivasi membuat `relawan_permintaan` (DITERIMA)
`relawan_penugasan.permintaan_id` NOT NULL (0023:117) dan `relawan_jam` butuh penugasan. Saat
aktivasi dibuat, `kemitraan_satgas.js` menyisip satu `relawan_permintaan` (kab = nama dari
kode.json, keahlian/jumlah = kebutuhan aktivasi, status sesuai relawan.js) dan menyimpan id-nya
di `km_aktivasi.permintaan_id`. Tutup aktivasi menutup permintaan itu.

### ADR-09 Siap tugas ditekan anggota sendiri (DITERIMA)
Status relawan `diverifikasi → siap_tugas` hanya lewat aksi relawan "siap" (relawan.js:251,426).
KK menyetujui → `diverifikasi`. Halaman saya AG menampilkan tombol **Saya siap bertugas**
yang memanggil aksi relawan lama yang sama → `siap_tugas`. Calon aktivasi (ALG §9) hanya
`siap_tugas`; layar satgas menampilkan jumlah `diverifikasi` belum siap sebagai pengingat KK.

### 10. Pemetaan kolom ke tabel lama

**Anggota → `relawan`** (kolom wajib 0023:50-58): `nama, wa, email, prov` dari form; `kab` =
nama kab dari `kode.json[kab4].nama`; `jalur='kampus'`, `kampus_id` = institusi; `keahlian`
dari form; `hari_per_minggu=1`, `maks_hari=3`, `luar_provinsi=0` (bawaan, bisa diubah di halaman
saya); `setuju_pdp` = waktu centang. **WA/email sudah ada di `relawan`** (indeks unik
0023:82,85): tidak membuat baris baru; buat `km_anggota` menunjuk relawan yang ada setelah KK
menyetujui; jawaban daftar tetap identik (anti-oracle).

**Hibah lolos → `riset_usulan`** (0025:35-53): `mitra_id` = mitra_riset kampus (buat bila belum);
`agenda_id` = agenda panggilan pertama; `judul`; `ketua`; `anggota` = gabungan nama dipotong 400;
`bencana` = id registry `public/bencana.json` (saat ini: karhutla, banjir, gempa, cuaca, udara,
gunungapi, kekeringan) atau `lintas`: banjir→banjir, longsor→banjir, abrasi_rob→banjir,
gempa→gempa, tsunami→gempa, gunungapi→gunungapi, kekeringan→kekeringan, karhutla→karhutla,
cuaca_ekstrem→cuaca, udara→udara, multi→lintas (konstanta `KE_REGISTRI` di konst; uji
membandingkan dengan bencana.json); `wilayah` = nama kab/prov ≤ 120; `metode` = ringkasan ≤ 800 (form hibah
membatasi 800, bukan 5000); `mulai`/`selesai` dari form; `luaran_rencana` dari form;
`nomor_pks` = **nomor SK/PKS hibah yang WAJIB diisi ST saat Umumkan** (CHECK 0025:52);
`status='disetujui'`.

**Topik agenda → `riset_agenda`** (0025:5-15): `judul`; `latar` = bukti terkuat ≤ 800;
`bencana` (peta sama di atas); `tema` dari aspek: A1→pemodelan_bahaya, A2→peringatan_dini,
A3→teknologi, A4→kebijakan_anggaran, A5→kebijakan_anggaran, A6→kerentanan_sosial,
A7→kesehatan, A8→logistik, A9→rehab_rekon, A10→kebijakan_anggaran; `prioritas` P1→1, P2→2,
P3→3; `luaran` = "Model, data, atau rekomendasi untuk {aspek}" ≤ 400. Tidak ada kolom
`km_sumber`; asal agenda dicatat di `km_agenda_sumber`.

**Mitra aktivasi**: `kontak_pemangku.kategori` tidak punya basarnas/pmi (0053:9). Tampilkan
kategori `tni, polri, bpbd, bnpb, pemda` + `lainnya` yang `lembaga` mengandung "Basarnas",
"SAR" atau "PMI" di prov/kab aktivasi.

**Tim kaji cepat**: `meja_petugas` tidak punya kolom berlaku; cron bersih (menit 17) mengisi
`dicabut` untuk meja_petugas di `km_aktivasi_meja` bila aktivasi `tutup` ATAU dibuat > 14 hari.
Isian kaji cepat ditautkan lewat `meja_catatan.petugas_id ∈ km_aktivasi_meja` (tanpa kolom baru).
