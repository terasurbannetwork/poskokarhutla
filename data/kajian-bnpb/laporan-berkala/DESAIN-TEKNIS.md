# DESAIN-TEKNIS: Laporan Berkala

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/berkala/hitung.py` | fungsi murni ALGORITMA 1 sampai 9 dan varian periode ALGORITMA 12, stdlib, validasi kode periode, pembulatan setengah ke atas; `python3 -I scripts/berkala/hitung.py uji` | `pipa-data` |
| `scripts/berkala/rakit.py` | potongan harian dan berkas angka per periode (bagian 2), argumen `--potong` atau `--periode <p> --kode <k>`, baca berkas produksi, unggah R2 lewat `put/get` yang diimpor dari `scripts/siklus/gudang.py`. Log Actions hanya mencetak jumlah baris dan status sumber, tidak pernah isi dalops atau angka laporan | `pipa-data` |
| `scripts/berkala/kegiatan.py` | panen daftar siaran pers bnpb.go.id untuk rentang periode (judul, tanggal, tautan), Q16 | `pipa-data` |
| `.github/workflows/berkala.yml` | jadwal `10 3 * * *` (satu job; periode yang dirakit hari itu menurut ALUR 1) dan `workflow_dispatch` (input `periode`, `kode`), concurrency `berkala`, rahasia `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` yang sudah ada | `mekanik-mesin` |
| `package.json` | skrip `uji:berkala` (Python uji + `node --test tests/berkala/*.test.mjs`), masuk `npm run uji` | `mekanik-mesin` |
| `migrations/<nomor berikut>_laporan_berkala.sql` | tabel versi dan jejak (bagian 3); nomor diambil saat LB-07 dikerjakan | `warga-api` |
| `src/laporan_berkala.js` | rute bagian 4; gerbang `adminOK` (`src/worker.js`) dan `stafPeran` untuk peran apa pun dan `pemirsaLihat` untuk GET (`src/staf.js`, K4); pembersih `bersihIsi` (sudah diekspor `src/laporan_bnpb.js`); kelengkapan dari `public/laporan_berkala_hitung.js` | `warga-api` |
| `src/worker.js` | satu baris `...RUTE_LAPORAN_BERKALA` di daftar rute (dekat `RUTE_LAPORAN_BNPB`); halaman tetap `/laporan-bnpb` | `warga-api` |
| `public/laporan_bnpb.html`, `public/laporan_bnpb.js` | jenis ketiga "Laporan Berkala", pemilih periode dan kode, memanggil modul berkala | `layar-peta` |
| `public/laporan_berkala.js` | isian per bab, pratinjau A4, Bekukan, Cetak, beda versi | `layar-peta` |
| `public/laporan_berkala_hitung.js` | modul ES murni: validasi kode periode (sama dengan `hitung.py`, diuji lawan fixture yang sama), kelengkapan per periode (ALGORITMA 10), beda versi (ALGORITMA 11), format tampilan | `layar-peta` |
| `public/laporan_berkala_cetak.css` | token dan komponen DESIGN-SYSTEM 2, `@page { size: A4 }` | `layar-peta` |
| `tests/berkala/*.test.mjs` | uji murni layar, uji kontrak, uji integrasi rute dan D1 | `layar-peta`, `warga-api` |

## 2. Objek R2 (bucket `poskokarhutla-foto`, awalan `berkala/`)

Bucket dipakai bersama media warga; semua kunci modul ini berawalan `berkala/` dan rute modul ini hanya membaca kunci yang dibentuk server dengan awalan itu.

| Kunci | Ditulis | Isi |
| --- | --- | --- |
| `berkala/potong/<YYYY-MM-DD>.json` | `rakit.py` tiap hari | potongan hari itu: `karhutla` per provinsi (`hot`, `luas`, `belum`, `padam`), `surut` per kab dari dalops banjir, `gunungapi` per gunung |
| `berkala/<periode>/<kode>/angka/<YYYY-MM-DD>.json`, `.../angka/terbaru.json` | `rakit.py` dalam jendela rakit periodenya (ALUR 1) | berkas angka (bawah) |
| `berkala/<periode>/<kode>/beku/v<N>.json` | rute Bekukan | salinan berkas angka yang dibekukan |
| `berkala/<periode>/<kode>/foto/<sha256>.jpg` | rute foto | foto dokumentasi |
| `berkala/<periode>/<kode>/kegiatan_calon.json` | `kegiatan.py` | `[{"tanggal", "judul", "tautan", "asal": "bnpb.go.id"}]` |

Berkas angka:

```json
{
  "v": 1, "periode": "bulanan", "kode": "2026-10", "rentang": ["2026-10-01", "2026-10-31"], "dirakit": "2026-11-11T03:12:40Z",
  "sumber": {
    "dibi": {"tarik": "2026-11-11", "kejadian": 348, "bukan_alam": {"Kebakaran Gedung dan Permukiman": 24}, "duplikat_dampak": 3, "status": "ok"},
    "dibi_tahun_lalu": {"asal": "siklus_bersih", "tarik": "2026-11-11", "status": "ok"},
    "karhutla": {"asal": "potong", "hari": 31, "status": "ok"},
    "dalops_banjir": {"asal": "potong", "hari": 31, "status": "ok"},
    "gunungapi": {"tanggal": "2026-11-01", "status": "ok"},
    "prakiraan_hujan": {"terbit": "2026-11-09", "status": "ok"},
    "peluang": {"asal": "logbook_riwayat", "tahun_penuh": [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2024, 2025], "status": "ok"}
  },
  "bab1": {}, "bab2": {}, "bab3": {}, "bab4": {}, "bab5": {}, "bab7": {},
  "lampiran": {},
  "usulan_temuan": [{"kode": "T1", "pil": "karhutla", "kalimat": "...", "angka": {}, "sumber": "..."}]
}
```

Kunci `babN` yang ada berbeda per periode (PRD tabel empat periode); harian tidak punya `bab7` dan `usulan_temuan`, tahunan menambah `riwayat_10_tahun` dan `lampiran.selisih_bulanan` (D13). Kunci wajib tiap periode ditetapkan di LB-01 dan LB-11/LB-12 bersama uji kontraknya (`tests/berkala/kontrak.test.mjs`). Perkiraan 150 sampai 400 KB.

## 3. Skema D1

```sql
CREATE TABLE IF NOT EXISTS laporan_berkala (
  periode TEXT NOT NULL CHECK (periode IN ('harian', 'mingguan', 'bulanan', 'tahunan')),
  kode TEXT NOT NULL CHECK (
    (periode = 'harian'   AND kode GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]' AND CAST(substr(kode, 6, 2) AS INTEGER) BETWEEN 1 AND 12 AND date(kode) = kode) OR
    (periode = 'mingguan' AND kode GLOB '[0-9][0-9][0-9][0-9]-W[0-5][0-9]' AND CAST(substr(kode, 7, 2) AS INTEGER) BETWEEN 1 AND 53) OR
    (periode = 'bulanan'  AND kode GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]' AND CAST(substr(kode, 6, 2) AS INTEGER) BETWEEN 1 AND 12) OR
    (periode = 'tahunan'  AND kode GLOB '[0-9][0-9][0-9][0-9]')),
  versi INTEGER NOT NULL CHECK (versi >= 0),                       -- 0 = draf, 1.. = beku
  isian TEXT NOT NULL CHECK (length(isian) <= 98304),              -- sama dengan MAKS_ISI src/laporan_bnpb.js
  angka_kunci TEXT NOT NULL CHECK (angka_kunci GLOB 'berkala/*' AND angka_kunci GLOB ('berkala/' || periode || '/' || kode || '/*')),
  angka_sha256 TEXT NOT NULL CHECK (length(angka_sha256) = 64),
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL,
  PRIMARY KEY (periode, kode, versi)
);
CREATE TRIGGER IF NOT EXISTS laporan_berkala_beku_ubah BEFORE UPDATE ON laporan_berkala
WHEN OLD.versi > 0 OR NEW.versi <> OLD.versi OR NEW.periode <> OLD.periode OR NEW.kode <> OLD.kode
BEGIN SELECT RAISE(ABORT, 'versi beku tidak bisa diubah'); END;
CREATE TRIGGER IF NOT EXISTS laporan_berkala_beku_hapus BEFORE DELETE ON laporan_berkala WHEN OLD.versi > 0
BEGIN SELECT RAISE(ABORT, 'versi beku tidak bisa dihapus'); END;
CREATE TABLE IF NOT EXISTS laporan_berkala_jejak (
  periode TEXT NOT NULL, kode TEXT NOT NULL, versi INTEGER NOT NULL,
  aksi TEXT NOT NULL CHECK (aksi IN ('simpan', 'bekukan', 'buka', 'cetak', 'foto')),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS laporan_berkala_jejak_kode ON laporan_berkala_jejak (periode, kode, waktu);
```

- **Simpan draf** memakai satu pernyataan: `INSERT ... ON CONFLICT (periode, kode, versi) DO UPDATE SET ... WHERE laporan_berkala.diubah = ?`; nol baris berubah = 409. Draf baru tanpa `diubah` yang bentrok juga 409, bukan 500.
- **Bekukan**: server menyalin objek angka draf ke `beku/v<N>.json`, menghitung sha256 sendiri, lalu dalam satu `batch` menyisipkan `versi = (SELECT MAX(versi)+1 ...)` dan baris jejak. Dua Bekukan bersamaan: PK menolak yang kedua, rute membalas 409.
- **Integritas angka**: R2 tidak bisa dikunci seperti D1, jadi tiap baca versi beku menghitung ulang sha256 objek dan membandingkannya dengan `angka_sha256`; beda = 500 dengan pesan "berkas angka versi ini berubah", dan tidak pernah ditampilkan diam-diam.
- **Validasi kode**: CHECK D1 hanya menjaga bentuk kasar (tanggal yang tidak ada di kalender seperti 2026-02-30, minggu 54 sampai 59, dan bulan 13 ditolak; minggu 53 di tahun yang hanya punya 52 minggu ISO masih lolos). Validasi lengkap ada di rute lewat fungsi murni modul JS: tanggal harus ada di kalender, minggu ISO harus ada di tahun itu, dan periode yang belum selesai ditolak.
- Tabel kecil (paling banyak sekitar 400 baris draf dan beku per tahun, didominasi harian); jejak dibaca hanya saat staf membuka riwayat. Aman untuk kuota baca D1.

## 4. Rute (`src/laporan_berkala.js`)

Semua rute memvalidasi `periode` (empat nilai) dan `kode` (bagian 3) sebelum menyentuh D1 atau R2; nilai salah = 400. Semua rute: hanya di situs Centurisk97 dan localhost (pemeriksaan host ditulis di rute ini, karena pemeriksaan di `src/worker.js` hanya menjaga halaman HTML); jawaban membawa `cache-control: private, no-store`; metode lain 405.

| Rute | Metode | Gerbang (K4) | Isi |
| --- | --- | --- | --- |
| `/api/laporan-berkala?daftar=1&periode=bulanan` | GET | semua yang masuk | `?periode=` wajib: daftar kode, versi, diubah untuk periode itu (paling baru 400 baris) |
| `/api/laporan-berkala?periode=bulanan&kode=2026-10[&versi=N]` | GET | semua yang masuk | baris isian; tanpa `versi` = draf bila ada, bila tidak versi beku terakhir; mencatat jejak `buka` |
| `/api/laporan-berkala/angka?periode=bulanan&kode=2026-10[&versi=N\|&tarik=terbaru]` | GET | semua yang masuk | berkas angka; kunci R2 dibentuk server dari parameter (tidak menerima kunci dari klien); versi beku diperiksa sha256 |
| `/api/laporan-berkala/foto?periode=bulanan&kode=2026-10&id=<sha256>` | GET | semua yang masuk | foto; `id` harus 64 heksa |
| `/api/laporan-berkala/kegiatan?periode=&kode=` | GET | admin | `kegiatan_calon.json` |
| `/api/laporan-berkala` | POST | admin | simpan draf `{periode, kode, isian, tarik, diubah}`; server memetakan `tarik` ke kunci `berkala/<periode>/<kode>/angka/<tarik>.json`, memastikan objeknya ada, dan menghitung sha256-nya |
| `/api/laporan-berkala/bekukan` | POST | admin | `{periode, kode, diubah}`; kelengkapan (ALGORITMA 10) diperiksa ulang di server dari isian tersimpan; 422 dengan daftar kekurangan |
| `/api/laporan-berkala/foto` | POST | admin | JPEG saja, sudah dikode ulang di peramban (bagian 5); server menolak bila byte awal bukan JPEG atau ada segmen APP1 `Exif`; batas ukuran sama dengan unggah foto yang ada; nama objek = sha256 isi |
| `/api/laporan-berkala/cetak` | POST | semua yang masuk | `{periode, kode, versi}`: hanya mencatat jejak `cetak` |

## 5. Layar

- `laporan_bnpb.js` membaca `?jenis=berkala&periode=bulanan&kode=2026-10` dan memanggil `window.LaporanBerkala.buka(akar, periode, kode)`; kode dua jenis lama tidak tersentuh.
- Pratinjau = HTML A4 di `<div class="lb-kertas">` per halaman; Cetak = `window.print()` dengan `laporan_berkala_cetak.css` yang menyembunyikan isian.
- Draf (versi 0) dicetak dengan tanda air "Draf, belum dibekukan" di tiap halaman; hanya versi beku yang tercetak tanpa tanda air.
- Peta: SVG dari `/geo/provinsi.json` dan berkas kab yang sudah dipakai layar lain. Grafik: SVG tangan, tanpa pustaka baru.
- Foto dikode ulang ke JPEG lewat `<canvas>` di peramban sebelum unggah (membuang EXIF dan lokasi GPS dari JPEG, PNG, dan WebP).
- Jenis berkala **tidak** menyimpan draf di localStorage (komputer kantor dipakai bersama); isian disimpan ke server dengan tombol Simpan dan pengingat sebelum meninggalkan halaman.

## 6. Jadwal dan beban

`berkala.yml` 03.10 UTC menghindari jadwal yang ada (daftar di `data/kajian-bnpb/siklus/DESAIN-TEKNIS.md`). Satu job sekitar 2 sampai 8 menit: unduh berkas `public/data` dari produksi sekali (bukan salinan git) lalu dipakai semua periode hari itu, satu `get` dalops, potongan harian dibaca dari R2 per periode (paling banyak 366 objek kecil untuk tahunan, dibaca paralel), satu `get` lapis Siklus tahun lalu (bulanan dan tahunan saja), dan dua `put` per periode yang dirakit. Tidak ada cron Worker baru (batas 5 jadwal akun Free).

## 7. ADR

- ADR-1 Tabel baru, bukan `laporan_bnpb`: CHECK jenis menolak `bulanan`, baris ditimpa, dan isi terbatas 96 KB (RISET 3).
- ADR-2 Rakit di Actions, bukan Worker: perlu berkas besar dan lapis Siklus; Worker hanya menyajikan.
- ADR-3 Cetak HTML: tanpa pustaka PDF baru, sama dengan `/bnpb/dokumen` (Q13).
- ADR-4 Versi beku dijaga trigger D1 dan sidik sha256 objek R2; uji integrasi menjalankan UPDATE, DELETE, dan objek yang diubah, dan ketiganya harus gagal.
- ADR-5 Satu tempat per rumus: hitung di Python, kelengkapan dan beda di modul JS yang dipakai layar dan Worker.
- ADR-6 Empat periode, satu mesin (D11): satu tabel dengan kolom `periode` dan `kode`, satu set rute, satu `rakit.py`, satu halaman cetak; periode hanya mengubah rentang, riwayat, pembanding, dan daftar bab. Alternatif empat tabel atau empat modul ditolak karena rumus dan arsip beku akan tersalin empat kali.
