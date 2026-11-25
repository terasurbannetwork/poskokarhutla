# DESAIN-TEKNIS: Semai Redistribusi Banjir dan Penguji Efektivitas

## 1. Berkas

Tidak ada folder baru di `public/` atau `scripts/`. Satu berkas skrip baru (`scripts/omc/efek_banjir.py`) dan satu migrasi baru; selebihnya
perluasan berkas induk.

| Berkas | Perubahan | Pemilik |
| ------ | --------- | ------- |
| `scripts/operasi/semai.py` | argumen `--tujuan karhutla|banjir` (bawaan `karhutla`); adaptor `kisi_pengarah(ctx)` yang mengemas `u_pengarah`, `v_pengarah` per langkah ke kisi bentuk `angin_di` (m/s x 10, `jam` per 3 jam); cabang banjir: muat sasaran (§3), kandidat hulu, gerbang GB1 sampai GB4, faktor H dan P, tulis `semai_banjir.json`; subperintah `uji` menambah kasus banjir; `uji golden` (§6) | `pipa-data` |
| `scripts/operasi/semai_murni.py` | fungsi murni baru `faktor_h(tiba, lo, penuh, hi)`, `lolos_gb(...)`, `pilih_sasaran(prediksi, bmkg_kab10, tetap, manual, hari, b)`; `skor`, `zona_nms`, `jendela_85`, `faktor_t` dipakai ulang tanpa diubah | `pipa-data` |
| `scripts/operasi/semai_bobot.json` | blok baru `banjir` (`versi_banjir`, `sasaran_tetap`, ambang Q6, koridor, jarak, tiba, angin lemah, bobot); kunci lain tidak diubah | `pipa-data` |
| `scripts/operasi/fixture_semai_banjir.json` | potongan nyata satu putaran sekitar Jabodetabek dan Laut Jawa (3 x 3 derajat) + potongan `prediksi.json` dan `cuaca_bmkg_kab10.json` hari itu | `pipa-data` |
| `scripts/operasi/fixture_semai_golden.json` | `semai.json` karhutla dari fixture induk, dibekukan sebelum SB-02 | `pipa-data` |
| `scripts/udara/lintasan.py` | hanya fungsi baru `mundur(A, l, lon, lat, jam0, jam_maks, langkah_menit)` di atas `angin_di` dan `geser` yang ada (u, v dibalik); kisi `A` datang dari adaptor `semai.py`. `semai()` dan keluaran `lintasan.json` tidak diubah | `cuaca-udara` |
| `scripts/omc/efek_banjir.py` | penguji Lapis A (`lapis-a tarik`, `lapis-a analisis`) dan Lapis B (`lapis-b`), `uji` luring; mengimpor `efek.py` (`baca_kab`, `tetangga`, `baca_chirps`, `ambil_ifs`, `resid`, `ols`, `t_kuantil`), tidak menyalinnya | `cuaca-udara` |
| `data/kajian-bnpb/semai-banjir/riset/PRAREG-A.md`, `PRAREG-A.sidik` | pra-registrasi Lapis A dari RENCANA-UJI §6, disidik sebelum tarik data | `pipa-data` (menurut `ilmu.mjs pemilik`) |
| `.github/workflows/semai.yml` | langkah "Semai banjir" sesudah langkah karhutla (`continue-on-error: true`), unggah `semai_banjir.json` dan arsip `_banjir`; langkah "Rapor banjir" (`efek_banjir.py lapis-b`) | `mekanik-mesin` |
| `src/operasi_semai.js` | `NAMA_SAH` menerima `semai_banjir.json`, `arsip/\d{10}_banjir.json`, `rapor_banjir.json`; `zona_id` `^\d{10}-B?[A-E]$` dan arsip dipilih dari awalan; untuk zona `-B` server menulis `hari_sasaran` dan `sasaran` dari arsip ke `alasan_json`; rute sasaran (§4); `SEMAI_TOKEN` (§4.1) | `warga-api` |
| `migrations/<nomor>_semai_sasaran.sql` | tabel `op_semai_sasaran` (§4); nomor diperiksa saat tiket | `warga-api` |
| `public/operasi_semai.js` | saklar tujuan, muat malas `semai_banjir.json`, lapisan sasaran, kartu Sasaran hari ini, dialog Tambah sasaran, Rapor | `layar-peta` |
| `public/operasi_semai_murni.js` | port JS `faktor_h`, skor dan zona tujuan banjir (uji silang) | `layar-peta` |
| `public/operasi_semai.css` | gaya `.sm-sasaran*`, `.sm-tujuan*` | `layar-peta` |
| `public/renlap_omc.js` | membaca `zona_id` berawalan `B`, menulis "OMC banjir, sasaran ..." di judul, PDF, KML, GPX; rute terbang tidak berubah | `layar-peta` |
| `public/inti/tema.css` | token `--sm-sasaran` | `inti-layar` |
| `tests/operasi/semai_banjir*.test.mjs` | uji silang Python lawan JS tujuan banjir, uji layar | `pipa-data` (menurut `ilmu.mjs pemilik`) |
| `tests/warga/operasi_semai.test.mjs` | kasus baru rute target `-B` dan rute sasaran | `warga-api` |

`public/bencana.json` tidak diubah: `banjir.kemampuan.tindakan` sudah memuat `omc`.

## 2. Keluaran R2 `operasi/semai/semai_banjir.json`

```json
{
  "dibuat": "2026-11-25T22:20:00Z", "tujuan": "banjir", "versi_bobot": "1", "versi_banjir": "1",
  "putaran": {"model": "ECMWF IFS", "res": 0.1, "init": "2026-11-25T12:00:00Z", "lisensi": "CC BY 4.0"},
  "hari_sasaran": "2026-11-26",
  "sumber": {"prediksi": {"dibuat": "2026-11-25T18:40:19+07:00", "vonis_bnj": "belum teruji"}, "bmkg_kab10": {"dibuat": "..."}, "manual": {"n": 2}},
  "sasaran": [{"kab": "3172", "nama": "Kota Jakarta Utara", "prov": "31", "asal": ["bmkg", "tetap"], "tenggang": 1,
               "bnj_lv": 2, "hjn_p50": 0.34, "cakupan": "kab", "zona": ["2026112512-BA"], "alasan_kosong": null}],
  "langkah": [18, 21, 24, 27, 30, 33],
  "raster": {"awan": "awan_{l}.png"},
  "alasan_kosong": null,
  "zona": [{"id": "2026112512-BA", "huruf": "A", "tujuan": "banjir", "lat": -5.8, "lon": 106.6, "skor": 0.59, "langkah": 27,
            "jendela": ["2026-11-26T03:00Z", "2026-11-26T06:00Z"], "jendela_teks": "10.00 sampai 13.00 WIB", "zona_waktu": "WIB",
            "prov_kode": "36", "prov": "Banten", "kota": "lepas pantai dekat Kota Tangerang", "laut": true,
            "hujan": {"lat": -5.82, "lon": 106.65, "tau_menit": 30},
            "Q": 0.566, "H": 0.5, "P": 1.0, "komp": {"cape": 0.53, "air": 0.36, "rh": 1, "geser": 0.54, "naik": 0.4},
            "cegat": [{"kab": "3172", "tiba_jam": 3.5, "masuk": {"lat": -6.1, "lon": 106.85}}],
            "base": {"id": "...", "icao": "WIHH", "nama": "Halim Perdanakusuma", "km": 45, "menit": 10, "perkiraan": true, "terdaftar": false},
            "alasan": {"sasaran": ["3172"], "C": "...", "H": "...", "P": "...", "B": "..."}}],
  "kandidat_kolom": ["lat", "lon", "langkah", "Q", "H", "P", "sasaran_idx", "laut", "cape", "air", "rh", "geser", "naik"],
  "kandidat_sasaran": [[-5.8, 106.6, 27, 0.566, 0.5, 1.0, 0, 1, 0.53, 0.36, 1, 0.54, 0.4]]
}
```

- `zona[].alasan.sasaran` wajib ada: rute target menyimpan `alasan` ke `alasan_json`, dan Lapis B membaca sasaran dari sana.
- Arsip `operasi/semai/arsip/<putaran>_banjir.json` = salinan tanpa `kandidat_sasaran` dan raster (append-only, langkah "Arsip putaran"
  yang sama, cek ada dulu).
- `rapor_banjir.json` di R2 (bukan `public/`, KEPUTUSAN D9, Q4): `{dibuat, lapis_a: {...} | null, lapis_b: {n, n_hari, efek, ci95, p,
  mde, vonis, plasebo: {...}, terkonfirmasi_bmkg: {...}}}`.
- Batas ukuran `semai_banjir.json` 300 KB.

## 3. Masukan sasaran di pipeline

| Masukan | Cara baca | Gagal |
| ------- | --------- | ----- |
| `public/prediksi/data/prediksi.json` | berkas di checkout (di-commit `prediksi.yml`) | tidak ada atau basi > 36 jam: asal `prakiraan` dilewati, ditulis di `sumber` |
| `public/banjir/data/cuaca_bmkg_kab10.json` | berkas di checkout | sama |
| `semai_bobot.json` `banjir.sasaran_tetap` | berkas | wajib ada; galat bila rusak |
| `op_semai_sasaran` | `GET /api/operasi/semai/sasaran?tanggal=<d>` dengan `SEMAI_TOKEN` (§4.1) | tanpa rahasia atau gagal: asal `manual` dilewati, peringatan di log dan `sumber.manual.galat` |

## 4. D1 dan rute

```sql
-- migrations/<nomor>_semai_sasaran.sql
CREATE TABLE IF NOT EXISTS op_semai_sasaran (
  id         TEXT PRIMARY KEY,                 -- crypto.randomUUID
  kab        TEXT NOT NULL CHECK (length(kab) = 4),  -- kode BPS kab/kota
  tanggal    TEXT NOT NULL,                    -- hari sasaran WIB
  catatan    TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  oleh       TEXT NOT NULL,                    -- id akun, bukan nama
  dibuat     TEXT NOT NULL,
  terhapus   TEXT, alasan_hapus TEXT, dihapus_oleh TEXT
);
CREATE INDEX IF NOT EXISTS op_semai_sasaran_tgl ON op_semai_sasaran(tanggal);
CREATE UNIQUE INDEX IF NOT EXISTS op_semai_sasaran_unik ON op_semai_sasaran(kab, tanggal) WHERE terhapus IS NULL;
```

`op_semai_target` (0129) tidak diubah: tujuan diturunkan dari `zona_id` (KEPUTUSAN D6).

| Rute | Hak | Isi |
| ---- | --- | --- |
| `GET /api/operasi/semai/berkas/<nama>` | sama dengan induk | daftar nama tetap ditambah `semai_banjir.json`, `arsip/<10 angka>_banjir.json`, `rapor_banjir.json` |
| `POST /api/operasi/semai/target` | S7 induk | `zona_id` `^\d{10}-B?[A-E]$`; awalan `B` membaca `arsip/<putaran>_banjir.json`; aturan lain sama |
| `GET /api/operasi/semai/sasaran?tanggal=` | pembaca `/operasi` atau token pipeline `SEMAI_TOKEN` | daftar sasaran manual aktif |
| `POST /api/operasi/semai/sasaran` | Q12: `pusdalops`, `tmc`, moderator | `{kab, tanggal, catatan?}`; `kab` ada di daftar kab repo; tanggal hari ini atau besok WIB; 409 bila sudah aktif; 30 isian per hari per akun (429) |
| `POST /api/operasi/semai/sasaran/hapus` | Q12 | `{id, alasan}` 5 sampai 300 huruf, hapus lunak |

### 4.1 `SEMAI_TOKEN` (jalur auth baru)

Repo belum punya token pipeline untuk membaca rute staf: `scripts/omc/nilai.py` membaca `/api/omc/sortie` yang publik (`src/omc.js`).
Maka jalur ini dirinci dan diperiksa `security-reviewer`:

- **Simpan.** Satu nilai acak >= 32 byte dibuat pemilik, disimpan dua kali: Worker secret `SEMAI_TOKEN` (`wrangler secret put`) dan
  GitHub secret `SEMAI_TOKEN` untuk `semai.yml`. Tidak pernah di berkas, log, atau keluaran.
- **Kirim.** Header `Authorization: Bearer <token>`, hanya ke host produksi Worker.
- **Rute.** Hanya `GET /api/operasi/semai/sasaran` dan `GET /api/operasi/semai/target`. Metode lain atau rute lain dengan token ini: 403.
  Token tidak menghasilkan sesi dan tidak membawa peran.
- **Banding.** Waktu tetap: hash SHA-256 kedua nilai lewat `crypto.subtle.digest`, lalu bandingkan semua byte tanpa keluar awal
  (pola banding waktu tetap yang dipakai Worker untuk rahasia lain bila ada; bila tidak ada, fungsi kecil di `src/operasi_semai.js`).
- **Rahasia Worker kosong.** Jalur token mati (401), tidak ada nilai cadangan.
- **Ganti.** Pemilik mengganti dua secret bersamaan; tidak ada daftar token lama.

Tidak ada cron Cloudflare baru dan tidak ada baca D1 terjadwal di Worker (gerbang anggaran CF, memori kuota baca D1). Pipeline membaca
sasaran sekali per putaran; Lapis B membaca target sekali per hari lewat rute `GET /api/operasi/semai/target` yang ada (rentang tanggal
ditambah `?sejak=`) dan memakai `alasan_json.hari_sasaran`, bukan kolom `tanggal`.

## 5. Jadwal dan biaya

- `semai.yml` yang sama; langkah banjir sekitar 3 menit (kandidat jauh lebih sedikit dari grid penuh karena hanya koridor hulu).
- `efek_banjir.py lapis-b` di langkah terakhir `semai.yml` putaran 22.00 UTC; CHIRPS prelim terbit beberapa hari terlambat, jadi
  sasaran-hari dinilai saat hujannya terbit (tanpa mengubah nilai yang sudah dinilai: rapor ditulis ulang dari awal dari arsip tiap kali).
- Lapis A dijalankan lokal, sekali, oleh pengerja; `data/raw/omc_banjir` tidak di-commit.

## 6. Uji golden karhutla

`python3 scripts/operasi/semai.py uji golden`: jalankan fixture induk dengan `--tujuan karhutla`, bandingkan dengan
`fixture_semai_golden.json` (kecuali `dibuat`); berbeda satu byte = gagal. Ditambah: `semai.py` tanpa `--tujuan` sama dengan
`--tujuan karhutla`. Gerbang ini jalan di tiap tiket yang menyentuh `semai*.py`, `semai_bobot.json`, atau `lintasan.py`.
