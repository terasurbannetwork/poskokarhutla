# DESAIN TEKNIS Ruang Unit BNPB: web `/bnpb/unit` dan pipeline data

Versi 1, 5 November 2026. Status: usulan, menunggu persetujuan sesi induk.

Dokumen ini spesifikasi pelaksanaan. Otoritasnya, berurutan: `KEPUTUSAN-UNIT.md` (bila sudah ada), `KEPUTUSAN-AWAL.md` (ID, fase, mesin, prinsip, U1-U12), `PRD.md`, `DESIGN-SYSTEM.md`, lalu dokumen ini, `RENCANA-UJI.md`, `TIKET.md`. Isi teknis tiap usulan diambil dari `riset/1-6`; dokumen ini tidak mengulang buktinya, hanya menjawab "berkas apa, fungsi apa, tabel apa, rute apa, rumus apa, jadwal apa". Bila sebuah keputusan di sini menyimpang dari riset, alasannya ditulis di tempat dan dirangkum di §10.

Semua rujukan `berkas:baris` diperiksa terhadap checkout 5 November 2026 (commit `230a5863` + perubahan kerja belum di-commit). Baris bisa bergeser; nama fungsi yang disebut tetap jadi jangkar.

Daftar isi: (1) arsitektur; (2) struktur berkas, migrasi, workflow, roster; (3) perbaikan F0; (4) mesin bersama MB-1 sampai MB-8; (5) sistem F1; (6) sistem F2; (7) sistem F3 dan T; (8) sumber data eksternal; (9) keamanan, privasi, kuota D1, pemantauan basi, uji; (10) catatan untuk sesi induk.

---

## 1. Arsitektur

### 1.1 Gambaran

```
 GITHUB ACTIONS data.yml (harian 21.20 WIB, satu langkah baru "Ruang Unit")        MAC MINI (scripts/wa/otomatis.mjs)
   masukan repo: public/data/**, public/data/bnpb/**, data/hukum/seed.sql            PDF Laphar dari WA (R2 wa/...)
   masukan luar (MB-8, MB-3): data.bnpb.go.id CKAN, gis.bnpb.go.id ArcGIS,             | pdftotext + laphar_arsip.mjs
   inalogpal.bnpb.go.id/Api, SIRUP (docs/pendanaan/sirup_tarik.py), JDIHN              v
           |                                                                  public/data/laphar_riwayat.json (KPOD-3)
           v                                                                           |
   scripts/bnpb/unit/*.py (stdlib, self-check --cek tanpa jaringan)                    | commit lewat jalur pipeline yang ada
           |                                                                           v
           +--> /tmp/unit/<nama>.json --wrangler r2 object put--> R2 poskokarhutla-foto  unit/<nama>.json, unit/indeks.json
           +--> public/inti/jam_aturan.json (MB-2, ditulis tangan dan di-commit; isinya pasal publik; dibaca pipeline)
           +--> public/data/bnpb/hukum/katalog.json (MB-1, sudah ada, ditambah kunci konflik)
                                         |
                                         v
 Cloudflare Worker centurisk97 (src/worker.js + src/unit.js baru, D1 poskowarga)
   GET  /bnpb/unit, /bnpb/unit/:kode         -> cangkang HTML staf (cek sesi di rute, 303 bila tamu)
   GET  /api/unit/indeks, /api/unit/data/:nama -> R2 unit/<nama>.json dialirkan apa adanya, sesudah stafOK
   POST /api/unit/ketuk                       -> D1 unit_ketuk (MB-7, konfirmasi satu ketuk)
   *    /api/unit/{akses,hibah,diklat}/*      -> D1 isian manusia kecil (RRI-1, PLP-3, DIK-1)
   *    /api/pengungsian/*                    -> D1 pengungsian_* (WIL-2)
   *    /api/meja/*                           -> sudah ada (src/meja.js), disentuh F0-2 dan F0-3
   cron "* * * * *" (satu-satunya jadwal)      -> tidak ditambah; Ruang Unit tidak memakai cron Worker
                                         |
                                         v
 Peramban staf: public/bnpb/unit/*.html|js|css (kode dan teks antarmuka saja, tanpa data)
```

### 1.2 Prinsip teknis yang mengikat

1. **Tidak ada data Ruang Unit di `public/`.** Seluruh `public/` terbit sebagai aset statis yang terbaca tanpa login (`wrangler.jsonc:8`, `run_worker_first` hanya `/*.html`). Keluaran pipeline Ruang Unit ditulis ke R2 `unit/<nama>.json` dan hanya dibaca lewat rute yang memeriksa sesi staf (pola `src/dalops.js:12-19` dan `src/sippa.js:542-555`). Ini menjalankan prinsip 5 KEPUTUSAN-AWAL (staf saja) dan bawaan U4 (panen sumber resmi tampil di layar staf saja). Dua pengecualian, keduanya berisi teks peraturan yang memang publik: `public/inti/jam_aturan.json` dan `public/inti/jam_aturan.js` (MB-2, KA §8) dan `public/data/bnpb/hukum/katalog.json` (sudah publik hari ini). `public/data/laphar_riwayat.json` (KPOD-3) sudah publik dan agregat; isinya tidak diubah sifatnya.
2. **JSON di R2 tidak di-commit.** Repo publik. Pipeline menulis ke `/tmp/unit/` lalu mengunggah (pola `data.yml:458-466`, pemicu SIPPA). Riwayat yang perlu dibandingkan antarhari (misalnya selisih versi SIRUP untuk IRT-2) disimpan di cache Actions `actions/cache`, bukan git.
3. **D1 hanya untuk isian manusia dan jejak** (prinsip 7). Tiap tabel baru di §6 menyimpan keputusan atau angka yang hanya bisa datang dari manusia. Hitungan tidak pernah ditulis ke D1.
4. **Rute memeriksa haknya sendiri sebelum menyentuh R2 atau D1.** Tamu tidak boleh tahu apakah sebuah berkas atau baris ada (`src/sippa.js:545`).
5. **Satu sumber angka aturan.** Tenggat, ambang, dan standar berpasal hanya ada di `public/inti/jam_aturan.json`, dengan fungsi hitung di `public/inti/jam_aturan.js` (MB-2, KA §8, PRD BT-4). Worker mengimpornya (pola `src/ews.js:13` mengimpor `../public/ews_tindakan.js`), layar mengimpornya, Python membaca JSON yang sama. Gerbang menolak angka tenggat tertanam di tempat lain (§4.2).
6. **Pipeline Python 3.12 stdlib**, self-check `--cek` dengan `assert` yang jalan tanpa jaringan (pola `scripts/bnpb/siaga.py --cek`, `scripts/bnpb/iku.py --uji`).
7. **Tidak ada jadwal cron Worker baru.** Akun Workers Free sudah memakai batas 5 jadwal (`src/worker.js:920`); worker ini memakai satu cron `* * * * *`. Semua jadwal Ruang Unit lewat GitHub Actions di workflow yang sudah ada.

### 1.3 Kapan JSON statis, kapan D1

| Jenis data | Tempat | Alasan | Contoh |
| --- | --- | --- | --- |
| Hasil hitungan berkala dari data repo atau sumber publik | R2 `unit/<nama>.json` | nol baca D1 untuk pengunjung; dibuat ulang tiap jalan | PERB-1, PLP-1, RRX-1, PUS-1 |
| Usulan baris dari dokumen yang menunggu ketuk staf | R2 `unit/usulan_<jenis>.json` (baris ber-id stabil) | usulan dibuat ulang tiap jalan; hanya keputusannya yang perlu diingat | KPOD-3, RRP-2, RRI-1, PSPB-1 |
| Keputusan staf atas usulan (terima, tolak, koreksi) | D1 `unit_ketuk` | isian manusia; ratusan baris per tahun | MB-7 |
| Angka yang hanya diketahui manusia di lapangan | D1 tabel khusus | tidak ada sumber mesin | WIL-2 pengungsian, RRI-1 status pulih, PLP-3 BAST, DIK-1 angkatan |
| Tenggat dan ambang berpasal | `public/inti/jam_aturan.json` + `public/inti/jam_aturan.js` | teks peraturan publik, satu sumber untuk JS dan Python | MB-2 |
| Data internal yang tidak boleh di D1 produksi (U9) | berkas lokal pemilik, di luar git | bawaan U9: tidak masuk D1 | IRT-1, KEU-1, KEU-2 |

Aturan pilihnya: bila sebuah angka bisa dihitung ulang dari masukan yang ada, ia JSON. Bila hilang begitu tidak disimpan dan asalnya manusia, ia D1.

### 1.4 Gerbang hak

**Peran.** Daftar peran staf tetap di `src/staf.js` `PERAN` dan dijaga trigger `staf_larik_sah` (dibuat ulang terakhir di `migrations/0104_staf_peran_lengkap.sql`, dicocokkan `tests/warga/pantau.test.mjs`). Usulan: satu peran baru `unit` ("Ruang Unit") untuk staf direktorat dan pusat di luar Dit. KPOD. Pemisahan per unit (staf PLP hanya melihat PLP) ditunda; semua data Ruang Unit adalah agregat tanpa data pribadi, jadi satu peran baca cukup. Migrasi `0111_staf_peran_unit.sql` (§2.2).

| Konstanta (di `src/unit.js`) | Isi | Dipakai untuk |
| --- | --- | --- |
| `P_UNIT_BACA` | `["unit", "pimpinan", "koordalops", "pusdalops", "operator_cc"]` | semua `GET` Ruang Unit; `operator_cc` ikut karena perannya memang "melihat semua halaman" (`src/staf.js:16-18`) |
| `P_UNIT_TULIS` | `["unit", "pimpinan", "koordalops", "pusdalops"]` | `POST /api/unit/*`; `operator_cc` tidak menulis |
| `P_WIL_TULIS` | `P_UNIT_TULIS` + akun instansi BPBD aktif (`src/instansi.js`) | `POST /api/pengungsian/*` (WIL-2), pola `src/korban.js` |
| `DATA_UNIT_TERBATAS` | nama berkas kelas T (KEAMANAN-PRIVASI §3.2), bagian dari `DATA_UNIT` | `GET /api/unit/data/:nama` untuk nama ini memakai `modAtauStaf`, bukan `stafOK` |

Pemeriksaan: `stafOK(env, req, P_UNIT_BACA)` (`src/staf.js:64`, adminOK ATAU sesi staf berperan) untuk berkas kelas S. Berkas di `DATA_UNIT_TERBATAS` dan semua rute tulis memakai `modAtauStaf(env, req, P_...)` (`src/staf.js:65`), karena `adminOK` meloloskan akun gerbang `AKUN_SITUS*` (`src/worker.js:438-442`) dan `modAtauStaf` tidak (KA §8, KEAMANAN-PRIVASI §2.3). Kiriman lewat sesi staf wajib header `x-pb: 1` (sudah ditegakkan `stafSesiSemua`, `src/staf.js:47`). Wilayah staf (`wilayahStaf`, `dalamWilayahStaf`, `src/staf.js:66-70`) ditegakkan di rute tulis yang membawa `prov`.

**Gerbang host `centurisk97.id`.** `halamanTerkunci` (`src/worker.js:719-727`) menganggap tiap rute GET non-`/api` sebagai halaman terkunci, dan pemeriksa di `src/worker.js:883-884` hanya meloloskan admin, `operator_cc`, peran Direktori, dan `PERAN_DALOPS` untuk jalur `MENU_PUSDALOPS` (`src/worker.js:58`). Staf berperan `unit` akan dipantulkan. Perubahan, pola SIPPA (`data/kajian-bnpb/pipa/DESAIN-TEKNIS.md` §1.4):

1. `src/worker.js:726`: regex pengecualian `^\/(api|admin|ews|ubin|pipa)(\/|$)` menjadi `^\/(api|admin|ews|ubin|pipa|bnpb\/unit)(\/|$)`. Rute `/bnpb/unit*` menjaga dirinya sendiri.
2. Tamu yang membuka `/bnpb/unit*` dialihkan 303 ke `/admin/masuk?ke=<jalur>` (satu pintu masuk staf, pola `src/drone.js:57` dan `src/command_center.js:379`; KA §8). `public/admin/pantau.js` menambah `^/bnpb/unit(/|$)` ke pola `ke` yang boleh diikuti sesudah masuk.
3. Sesi sah tanpa peran Ruang Unit: 403 halaman polos "Akunmu tidak punya akses Ruang Unit", tanpa pengalihan (mencegah pantulan tanpa akhir, dijaga `tests/warga/admin-403-pantul.test.mjs`; uji itu diperluas ke `public/bnpb/unit/*.js`).

**Router.** `src/worker.js:658-659` mengenali parameter jalur lewat daftar regex. Tambah dua pola: `^(\/bnpb\/unit)\/([a-z]{2,4})$` (kunci `/bnpb/unit/:kode`) dan `^(\/api\/unit\/data)\/([a-z0-9_]{1,40})$` (kunci `/api/unit/data/:nama`), sejajar dengan pola `/api/sippa/data/:nama` yang sudah ada.

### 1.5 Yang sudah ada dan dipakai ulang

| Bagian | Berkas | Dipakai untuk |
| --- | --- | --- |
| Binding D1 `DB` (poskowarga), R2 `MEDIA` (poskokarhutla-foto), `ASSETS` | `wrangler.jsonc` | semua |
| Sesi dan peran staf | `src/staf.js` `stafOK`, `stafPeran`, `dalamWilayahStaf` | §1.4 |
| Batas laju | `src/bnpb.js:12-19` `laju(env, kunci, aksi, batas)`, tabel `laju_bnpb` (0022), dibersihkan `bersihkanBnpb` di cron menit 17 | semua rute tulis |
| Cangkang halaman staf ber-CSP | `src/bnpb.js:43-48` `halamanBnpbPublik(env, url, berkas, {pribadi: true})` | `/bnpb/unit*` |
| Kartu laporan standar | `public/inti/kartu.css` (`.ex.ex-std`, `.ex-ey`, `.ex-tabel`, `.hl`), gerbang `tests/agen/gerbang-kartu-std.test.mjs` daftar `LAYAR` | MB-6 dan semua kartu |
| Meja Kerja | `src/meja.js`, `src/meja_spek.js`, `migrations/0026_meja.sql`, `public/bnpb/meja.js` | F0-2, F0-3, RRX-1, KS-1 |
| Pustaka hukum | `scripts/bnpb/hukum.py`, `public/data/bnpb/hukum/katalog.json`, `data/hukum/seed.sql`, `src/hukum.js`, `public/bnpb/hukum.js` | F0-1, MB-1, HUK-1, HUK-2, SPB-1 |
| Pola unggah R2 dari Actions | `data.yml:244-255`, `data.yml:458-466` (`npx --yes wrangler@4.42.0 r2 object put poskokarhutla-foto/...`) | semua keluaran |
| Pola "berkas lama dibiarkan bila gagal" | fungsi `stabil()` `data.yml:528-534` | langkah Ruang Unit |
| Gateway WA dan pengatur otomatis | `scripts/wa/otomatis.mjs` (`LAPORAN`, `ambilBahan`, `jalankanGenerator`), `src/wa_jenis.js` (`laphar_pdf` wajib) | KPOD-3 |

---

## 2. Struktur berkas

### 2.1 Berkas baru dan berubah

Pemilik dari `scripts/agents/roster.json` (`milik`): `ruang-bnpb` memegang `public/bnpb/**`, `scripts/bnpb/**`, `tests/bnpb/**`, `public/data/bnpb/**`; `inti-layar` memegang `public/inti/**` (termasuk `public/inti/jam_aturan.*`, KA §8); `warga-api` memegang `src/**`, `migrations/**`, `tests/warga/**`; `mekanik-mesin` memegang `.github/workflows/**`, `package.json`. Diperiksa ulang dengan `node scripts/agents/ilmu.mjs pemilik <berkas>` sebelum tiap tiket.

| Berkas | Baru/ubah | Isi | Pemilik |
| --- | --- | --- | --- |
| `scripts/bnpb/hukum.py` | ubah | F0-1: `cabut_daftar()`, `konflik_status()`, `status_teks` per dokumen, kunci `konflik` di katalog, kasus baru di `cek()` | ruang-bnpb |
| `public/data/bnpb/hukum/katalog.json` | ubah (dibangun ulang) | kunci `konflik`, medan `status_teks`, `dicabut_oleh` | ruang-bnpb |
| `data/hukum/seed.sql` | ubah (dibangun ulang) | relasi `mencabut` tambahan dari daftar berbutir | ruang-bnpb |
| `src/hukum.js` | ubah | `dicabut_oleh` di `cariHukum` dan `bacaDok` dari `hukum_relasi` | warga-api |
| `public/bnpb/hukum.js` | ubah | pil "Dicabut oleh X (menurut teks), JDIH masih BERLAKU" | ruang-bnpb |
| `public/inti/jam_aturan.json` | baru | MB-2: entri bersitasi, dibaca Worker, peramban, dan Python | inti-layar |
| `public/inti/jam_aturan.js` | baru | MB-2: fungsi tenggat murni atas `jam_aturan.json` | inti-layar |
| `src/meja_spek.js` | ubah | F0-2 (ambang dari MB-2, kolom renkon, destana, dsp), F0-3 (`tautKaji: "opsional"`, kolom `kejadian_ref`) | warga-api |
| `src/meja.js` | ubah | F0-3: `buat()` baris 114-121 | warga-api |
| `src/pengingat.js` | ubah | baris 56-57: teks dan tanda DSP baru | warga-api |
| `public/bnpb/meja.js`, `public/admin/meja.js` | ubah | peta warna status turunan baru; pilihan kaji cepat induk menjadi opsional | ruang-bnpb (public/bnpb), warga-api (public/admin) |
| `migrations/0110_meja_rehab_lepas.sql` | baru | F0-3 (§3.3) | warga-api |
| `migrations/0111_staf_peran_unit.sql` | baru | peran `unit` (§2.2) | warga-api |
| `migrations/0112_unit.sql` | baru | `unit_ketuk`, `akses_status`, `hibah_bast`, `diklat_angkatan` (§2.2) | warga-api |
| `migrations/0113_pengungsian.sql` | baru | WIL-2 (§6.15) | warga-api |
| `src/unit.js` | baru | `RUTE_UNIT`, `DATA_UNIT`, `DATA_UNIT_TERBATAS`, `KODE_UNIT`, `P_UNIT_*`, rute §1.1 | warga-api |
| `src/pengungsian.js` | baru | rute WIL-2 (pola `src/korban.js`) | warga-api |
| `src/worker.js` | ubah | impor `RUTE_UNIT` + spread di `RUTE` (dekat baris 621), regex router baris 658-659, regex host baris 726 | warga-api |
| `src/staf.js`, `public/admin/pantau.js` | ubah | `PERAN.unit = "Ruang Unit"`; pola `ke` | warga-api |
| `src/admin_halaman.js` | ubah | `HALAMAN_STAF` tidak disentuh (Ruang Unit bukan halaman `/admin/*`); tautan "Ruang Unit" di `GRUP_STAF` | warga-api |
| `public/bnpb/unit/index.html`, `unit.html`, `unit.js`, `unit.css` | baru | pintu dan cangkang satu unit; `unit.js` membaca kode dari jalur | ruang-bnpb |
| `public/bnpb/unit/katalog.js` | baru | 70 sistem: id, unit, fase, nama, berkas data, jenis tampilan; satu-satunya daftar di sisi layar | ruang-bnpb |
| `public/bnpb/unit/rapor.js` | baru | MB-6: perender kartu `.ex-std` dari skema JSON §4.6 | ruang-bnpb |
| `public/bnpb/unit/ketuk.js` | baru | MB-7: daftar usulan + tombol terima, tolak, koreksi | ruang-bnpb |
| `public/bnpb/unit/pd3.js`, `rrp3.js`, `jf1.js`, `wil1.js`, `mt1.js`, `jf2.js` | baru | tampilan interaktif yang tidak cukup dengan kartu rapor | ruang-bnpb |
| `public/ews_tindakan.js` | ubah | PD-3: `pesanStandar(peringatan, konteks)` murni | layar-peta (cek `ilmu.mjs pemilik`) |
| `scripts/bnpb/unit/` (`panen.py`, `jdih_daerah.py`, `skor.py`, `neraca.py`, `rapor.py`, `jalan.py`, dan satu berkas per sistem pada §5-§6) | baru | MB-3, MB-4, MB-5, MB-6, MB-8, pipeline sistem | ruang-bnpb |
| `scripts/umum/laphar_arsip.mjs`, `laphar_arsip.py` | ubah | KPOD-3: mode satu hari, medan `pendampingan` | pipa-umum |
| `scripts/wa/otomatis.mjs` | ubah | KPOD-3: entri `LAPORAN` baru "arsip laphar" | wa-bot |
| `tests/bnpb/unit_*.test.mjs` | baru | uji tanpa DB (§9.5; nama berkas menurut RU §1.1) | ruang-bnpb |
| `tests/warga/unit.test.mjs`, `tests/warga/unit_skema.test.mjs`, `tests/warga/unit_alur.test.mjs` | baru | rute dan skema D1 di Miniflare (pola `tests/warga/meja.test.mjs:1-12`) | warga-api |
| `tests/warga/meja.test.mjs` | ubah | kasus F0-2 dan F0-3 (§3.2, §3.3) | warga-api |
| `tests/warga/cakupan.json` | ubah | tiap rute, tabel, trigger baru di `diuji` | warga-api |
| `tests/warga/migrasi_beku.json` | ubah sesudah terap | sha256 0110-0113 | warga-api |
| `tests/agen/gerbang-jam-aturan.test.mjs` | baru | gerbang MB-2 (§4.2) | penulis-gerbang |
| `tests/agen/gerbang-status-hukum.test.mjs`, `tests/agen/gerbang-ruang-unit.test.mjs`, `tests/agen/gerbang-privasi-unit.test.mjs` | baru | G-2, G-4 dan G-6, G-5 (RU §6.1) | penulis-gerbang |
| `tests/agen/gerbang-kartu-std.test.mjs` | ubah | `public/bnpb/unit/unit.html` + `rapor.js` masuk `LAYAR` | penulis-gerbang |
| `.github/workflows/data.yml` | ubah | langkah "Ruang Unit" (§2.3) | mekanik-mesin |
| `package.json` | ubah | `"uji:layar"` (folder `tests/bnpb/`, sudah ada) dirangkai ke `"uji"`; tidak ada skrip `uji:unit` baru (TIKET P-5) | mekanik-mesin |

Tidak dibuat: berkas `.html` per sistem (satu cangkang `unit.html` untuk 22 unit), agen baru (§2.4), rute publik apa pun, tabel D1 untuk hasil hitungan.

### 2.2 Migrasi

Nomor terakhir di `migrations/` adalah `0109_ai_pengetahuan.sql`; nomor 0051 kosong tetapi tidak dipakai mundur. Migrasi baru: 0110 sampai 0113. Migrasi lama tidak disunting; `tests/warga/migrasi_beku.json` mengunci sha256 0001-0108 (termasuk `0026_meja.sql`, baris 29). Semua migrasi baru idempoten (`IF NOT EXISTS`, `DROP ... IF EXISTS` sebelum `CREATE`), diperiksa `migrasi-idempoten`. Migrasi produksi diterapkan pemilik (memori `ruang-bnpb`: "prod D1 migrations must be applied by owner").

`0110_meja_rehab_lepas.sql`: lihat §3.3.

`0111_staf_peran_unit.sql` (pola `0104`):

```sql
-- Peran staf 'unit' (Ruang Unit BNPB, data/kajian-bnpb/kedeputian/DESAIN-TEKNIS.md §1.4). Idempoten; 0104 tidak disunting.
-- Daftar HARUS sama dengan PERAN di src/staf.js dan public/admin/pantau.js (dijaga tests/warga/pantau.test.mjs).
DROP TRIGGER IF EXISTS staf_larik_sah;
DROP TRIGGER IF EXISTS staf_larik_ubah;
CREATE TRIGGER staf_larik_sah BEFORE INSERT ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc', 'direktori', 'unit'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
CREATE TRIGGER staf_larik_ubah BEFORE UPDATE OF peran, wilayah ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc', 'direktori', 'unit'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
```

`0112_unit.sql` (isian manusia Ruang Unit; kode kab = kode BPS 4 digit dari `public/data/bnpb/wilayah.json`, tidak seperti `meja_catatan.kab` yang menyimpan nama):

```sql
-- Ruang Unit BNPB: isian manusia (DESAIN-TEKNIS kedeputian §2.2). Hasil hitungan TIDAK di sini (R2 unit/). Idempoten.

-- MB-7: keputusan staf atas usulan baris di R2 unit/usulan_<berkas>.json. Hanya ditambah; keputusan terbaru per (berkas, usulan_id) yang berlaku.
CREATE TABLE IF NOT EXISTS unit_ketuk (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  berkas TEXT NOT NULL CHECK (length(berkas) BETWEEN 3 AND 40 AND berkas NOT GLOB '*[^a-z0-9_]*'),
  usulan_id TEXT NOT NULL CHECK (length(usulan_id) = 16 AND usulan_id NOT GLOB '*[^0-9a-f]*'),
  keputusan TEXT NOT NULL CHECK (keputusan IN ('terima', 'tolak', 'koreksi')),
  koreksi TEXT CHECK (koreksi IS NULL OR (json_valid(koreksi) AND json_type(koreksi) = 'object' AND length(koreksi) <= 2000)),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((keputusan = 'koreksi') = (koreksi IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS unit_ketuk_berkas ON unit_ketuk (berkas, usulan_id, waktu);
CREATE INDEX IF NOT EXISTS unit_ketuk_waktu ON unit_ketuk (waktu);
CREATE TRIGGER IF NOT EXISTS unit_ketuk_beku BEFORE UPDATE ON unit_ketuk
BEGIN SELECT RAISE(ABORT, 'keputusan ketuk tidak boleh diubah; tambahkan keputusan baru'); END;
CREATE TRIGGER IF NOT EXISTS unit_ketuk_tahan BEFORE DELETE ON unit_ketuk WHEN OLD.dummy = 0
BEGIN SELECT RAISE(ABORT, 'keputusan ketuk tidak boleh dihapus'); END;

-- RRI-1: status titik akses putus. titik_id = id stabil dari R2 unit/akses_putus.json. Hanya ditambah; status terbaru per titik yang berlaku.
CREATE TABLE IF NOT EXISTS akses_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titik_id TEXT NOT NULL CHECK (length(titik_id) = 16 AND titik_id NOT GLOB '*[^0-9a-f]*'),
  tgl TEXT NOT NULL CHECK (date(tgl) IS tgl),
  status TEXT NOT NULL CHECK (status IN ('putus', 'darurat', 'pulih')),
  sumber TEXT NOT NULL CHECK (sumber IN ('wa', 'isian')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS akses_status_titik ON akses_status (titik_id, tgl);
CREATE UNIQUE INDEX IF NOT EXISTS akses_status_satu ON akses_status (titik_id, tgl, status);
CREATE TRIGGER IF NOT EXISTS akses_status_beku BEFORE UPDATE ON akses_status
BEGIN SELECT RAISE(ABORT, 'status akses tidak boleh diubah; tambahkan baris baru'); END;

-- PLP-3: BAST hibah logistik dan peralatan (Juklak 3/2024). Diisi impor skrip dari lampiran Keputusan Deputi, bukan form.
CREATE TABLE IF NOT EXISTS hibah_bast (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  tahun INTEGER NOT NULL CHECK (tahun BETWEEN 2015 AND 2100),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR (length(kab) = 4 AND kab NOT GLOB '*[^0-9]*' AND substr(kab, 1, 2) = prov)),
  barang TEXT NOT NULL CHECK (length(barang) BETWEEN 2 AND 80),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 1 AND 10000000),
  satuan TEXT NOT NULL CHECK (length(satuan) BETWEEN 1 AND 20),
  tgl_bast TEXT NOT NULL CHECK (date(tgl_bast) IS tgl_bast),
  kedaluwarsa TEXT CHECK (kedaluwarsa IS NULL OR date(kedaluwarsa) IS kedaluwarsa),
  tgl_lapor TEXT CHECK (tgl_lapor IS NULL OR (date(tgl_lapor) IS tgl_lapor AND tgl_lapor >= tgl_bast)),
  sumber TEXT NOT NULL CHECK (sumber IN ('kepdep', 'inalogpal', 'isian')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL CHECK (diubah >= dibuat),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS hibah_bast_wilayah ON hibah_bast (prov, kab, tahun);
-- hanya tgl_lapor yang boleh berubah sesudah impor
CREATE TRIGGER IF NOT EXISTS hibah_bast_ubah BEFORE UPDATE ON hibah_bast
WHEN NEW.id != OLD.id OR NEW.tahun != OLD.tahun OR NEW.prov != OLD.prov OR NEW.kab IS NOT OLD.kab OR NEW.barang != OLD.barang
  OR NEW.jumlah != OLD.jumlah OR NEW.tgl_bast != OLD.tgl_bast OR NEW.sumber != OLD.sumber OR NEW.dibuat != OLD.dibuat
BEGIN SELECT RAISE(ABORT, 'hanya tanggal laporan penggunaan yang boleh diubah'); END;

-- DIK-1: angkatan pelatihan Pusdiklat PB, tanpa nama peserta (agregat per angkatan per kab).
CREATE TABLE IF NOT EXISTS diklat_angkatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  program TEXT NOT NULL CHECK (length(program) BETWEEN 3 AND 120),
  jenis TEXT NOT NULL CHECK (jenis IN ('teknis_dasar', 'teknis_lanjutan', 'teknis_kepemimpinan', 'fungsional')),
  tgl_mulai TEXT NOT NULL CHECK (date(tgl_mulai) IS tgl_mulai),
  tgl_selesai TEXT NOT NULL CHECK (date(tgl_selesai) IS tgl_selesai AND tgl_selesai >= tgl_mulai),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR (length(kab) = 4 AND kab NOT GLOB '*[^0-9]*' AND substr(kab, 1, 2) = prov)),
  n_peserta INTEGER NOT NULL CHECK (n_peserta BETWEEN 1 AND 5000),
  n_lulus INTEGER NOT NULL CHECK (n_lulus BETWEEN 0 AND n_peserta),
  penyelenggara TEXT NOT NULL CHECK (length(penyelenggara) BETWEEN 2 AND 80),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS diklat_angkatan_kab ON diklat_angkatan (prov, kab, tgl_selesai);
CREATE UNIQUE INDEX IF NOT EXISTS diklat_angkatan_unik ON diklat_angkatan (program, tgl_mulai, prov, ifnull(kab, ''));
```

Tidak dibuat: `ews_umpan` (PD-1; menunggu U11), `tlhp_rek` dan `anggaran_bulan` (IRT-1, KEU-2; bawaan U9 tidak masuk D1), `rpbd_laporan` (PSPB-2, fase T), `db_usulan` (MT-1 tahap 2, belum diminta), tabel meja baru `rpbd`/`rpkb` (koreksi lewat `unit_ketuk`, alasan §6.2).

### 2.3 Workflow

Tidak ada workflow baru dan tidak ada jadwal baru. Satu langkah ditambahkan ke `.github/workflows/data.yml` (harian 21.20 WIB, `cron: "20 14 * * *"`), sesudah langkah IKU BNPB (`data.yml:661-663`) supaya masukan `public/data/**` hari itu sudah terbit:

```yaml
      # Ruang Unit BNPB (data/kajian-bnpb/kedeputian/DESAIN-TEKNIS.md §2.3): hitungan ke /tmp/unit, unggah R2 unit/. Tidak di-commit (repo publik).
      # Harian untuk semua; mingguan (Senin UTC) dan bulanan (tanggal 1) memakai penanda yang sama dengan langkah "Hari uji logbook mingguan?".
      - name: Pulihkan cache Ruang Unit
        uses: actions/cache/restore@v4
        with: {path: data/raw/unit, key: unit-${{ github.run_id }}, restore-keys: unit-}
      - name: Ruang Unit (boleh gagal)
        continue-on-error: true
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          BPS_KEY: ${{ secrets.BPS_KEY }}
        run: |
          python3 scripts/bnpb/unit/jalan.py --cek
          python3 scripts/bnpb/unit/jalan.py harian $([ "$(date -u +%u)" = 1 ] && echo --mingguan) $([ "$(date -u +%d)" = 01 ] && echo --bulanan)
          gagal=0
          for f in /tmp/unit/*.json; do
            npx --yes wrangler@4.42.0 r2 object put poskokarhutla-foto/unit/$(basename "$f") --file "$f" --content-type application/json --remote || { echo "::warning title=Ruang Unit R2::$f gagal diunggah"; gagal=1; }
          done
          exit $gagal
      - name: Simpan cache Ruang Unit
        if: always()
        uses: actions/cache/save@v4
        with: {path: data/raw/unit, key: unit-${{ github.run_id }}}
```

`scripts/bnpb/unit/jalan.py` adalah satu-satunya pemanggil: daftar langkah tetap `LANGKAH = [(nama, modul, frekuensi)]`, tiap langkah dibungkus `try` sehingga satu sistem gagal tidak menghentikan yang lain, keluaran ditulis atomik (`.tmp` lalu `os.replace`), dan langkah yang gagal tidak menulis berkas sehingga R2 mempertahankan versi kemarin. `jalan.py` juga menulis `unit/indeks.json` (§9.4). `BPS_KEY` hanya untuk RRP-3 (IKK); kunci BPS di Keychain pemilik (`bps-webapi`) belum menjadi GitHub secret (memori `kunci-bps`), jadi sampai pemilik menambahkannya RRP-3 memakai berkas IKK terakhir di cache.

`data/raw/unit/` sudah di-gitignore oleh `data/raw/*` (`.gitignore:2`). Pembacaan D1 dari Actions (PUS-2, MB-7) memakai `npx wrangler@4.42.0 d1 execute poskowarga --remote --json --command "<SELECT>"` dengan token yang sama; satu kueri per kebutuhan per hari.

KPOD-3 tidak jalan di Actions: arsip PDF Laphar ada di Mac mini (`scripts/wa/otomatis.mjs`), lihat §5.6.

### 2.4 Roster agen

Tidak perlu agen baru. `ruang-bnpb` sudah memiliki `public/bnpb/**` dan `scripts/bnpb/**` (jadi `public/bnpb/unit/**` dan `scripts/bnpb/unit/**` tercakup), `warga-api` memiliki `src/**` dan `migrations/**`. Syarat otoritas membuat agen (AGENTS.md §1.5) belum terpenuhi: berkas yang disentuh semuanya berpemilik. Yang perlu: (1) `ruang-bnpb` menulis Kasus "Ruang Unit: R2 unit/, bukan public/data" lewat `node scripts/agents/ilmu.mjs kasus ruang-bnpb "..."`; (2) bila ilmu `ruang-bnpb` melewati plafon 40 KB setelah Ruang Unit masuk, sesi induk membuat agen `ruang-unit` lewat roster (otoritas AGENTS.md §1.5 butir ketiga), dengan `milik: ["public/bnpb/unit/**", "scripts/bnpb/unit/**", "tests/bnpb/unit_*"]`, `model: "sonnet"`.

---

## 3. Perbaikan F0

### 3.1 F0-1: status katalog JDIH

**Akar masalah (dibaca dari kode).** `relasi_dari()` (`scripts/bnpb/hukum.py:804-825`) menilai tiap sitasi dengan `_konteks()` (`hukum.py:771-780`): potongan `sesudah` berhenti di awal sitasi berikutnya (`hi = ms[k + 1].start()`), dibatasi 400 huruf, lalu dipotong di `;` pertama. Daftar berbutir Perban 4/2025 Pasal 60 berbentuk "Pada saat Peraturan Badan ini mulai berlaku: a. ... Nomor 6 Tahun 2021 ...; b. ... Nomor 7 Tahun 2021 ...; c. ... Nomor 1 Tahun 2022 ...; dan d. ... Nomor 2 Tahun 2022 ...; dicabut dan dinyatakan tidak berlaku." (teks diperiksa di `data/raw/hukum/teks/perban-nomor-4-tahun-2025.json`). Butir a sampai c tidak pernah melihat kata "dicabut" karena terpotong sitasi berikutnya; butir d terpotong `;` tepat sebelum "dicabut". Batas 400 huruf bukan penyebab utamanya (riset/6 §0 menyebut jendela; yang menentukan adalah potongan `;` dan sitasi tetangga).

Mesin yang sudah ada menangkap 15 pasangan `mencabut`/`mengganti` ke dokumen yang masih BERLAKU di katalog, yaitu 9 dokumen sasaran: `perka-8-2014`, `perka-4-2016`, `perban-2-2019`, `perka-7-2015`, `perka-4-2008`, `perka-17-2010`, `perban-5-2020`, `perban-4-2019`, `perka-1-2012` (dihitung dari `katalog.json` 5 Nov 2026). Ditambah 4 dari Pasal 60 Perban 4/2025: `perban-6-2021`, `perban-7-2021`, `perban-1-2022`, `perban-2-2022`. Jumlah yang terbukti: 13 (KA §5.0 F0-1); angka akhir keluar dari `konflik_status()` sesudah `hukum.py urai` dijalankan ulang di mesin pemilik.

**Perubahan `scripts/bnpb/hukum.py`.**

1. Fungsi baru di bawah `_konteks()`:

```python
RX_CABUT_BUKA = re.compile(r"pada saat\b[^:]{0,160}?\bmulai berlaku\s*:", re.I)
RX_CABUT_TUTUP = re.compile(r"\bdicabut\b|\bdinyatakan tidak berlaku\b", re.I)


def cabut_daftar(teks_, ms):
    """Indeks sitasi di dalam daftar berbutir 'Pada saat ... mulai berlaku: a. X; b. Y; dicabut dan dinyatakan tidak berlaku.'
    _konteks() memotong di ';' dan di sitasi tetangga, jadi butir daftar tidak pernah melihat kata penutupnya (Perban 4/2025 Pasal 60).
    Butir yang memuat 'tetap berlaku' atau 'diubah' dikecualikan."""
    b = RX_CABUT_BUKA.search(teks_)
    t = b and RX_CABUT_TUTUP.search(teks_, b.end())
    if not t:
        return set()
    out = set()
    for k, m in enumerate(ms):
        if not (b.end() <= m.start() < t.start()):
            continue
        akhir = teks_.find(";", m.end(), t.start())
        butir = teks_[m.end():akhir if akhir >= 0 else t.start()].lower()
        if not re.search(r"tetap berlaku|\bdiubah\b", butir):
            out.add(k)
    return out
```

2. `relasi_dari()`, di dalam `for sj, t in bahan:` sesudah `ms = list(...)`:

```python
        daftar = cabut_daftar(t, ms) if sj == "pasal" else set()
        for k, m in enumerate(ms):
            ke = kunci_sitasi(m)
            if ke == dok_id:
                continue
            sebelum, sesudah = _konteks(t, ms, k)
            sah = ke.split("-")[0] in SETARA or ke.split("-")[0] == dok_id.split("-")[0]
            j = jenis_relasi(sj, sebelum, sesudah, sah)
            if k in daftar and sah and j == "merujuk":
                j = "mencabut"
```

3. Fungsi baru `konflik_status(dok, relasi)` dan pemakaiannya di `bangun()` sebelum `return`:

```python
def konflik_status(dok, relasi):
    """Dokumen yang JDIH tulis BERLAKU padahal dicabut atau diganti dokumen BERLAKU lain menurut teksnya.
    Relasi 'mengubah' tidak dihitung: dokumen yang diubah tetap berlaku (riset/6 H1 aturan c)."""
    ber = {d["id"] for d in dok if (d["status"] or "").upper() == "BERLAKU"}
    oleh = {}
    for r in relasi:
        if r["jenis"] in ("mencabut", "mengganti") and r["dari"] in ber and r["ke"] in ber:
            oleh.setdefault(r["ke"], set()).add(r["dari"])
    return [{"dok": k, "status_jdih": "BERLAKU", "status_teks": "DICABUT", "dicabut_oleh": sorted(v)} for k, v in sorted(oleh.items())]

# di bangun(), sesudah periksa(dok, segmen, relasi):
    konflik = konflik_status(dok, relasi)
    dicabut = {x["dok"]: x["dicabut_oleh"] for x in konflik}
    for d in dok:
        d["status_teks"] = "DICABUT" if d["id"] in dicabut else (d["status"] or "").upper() or None
        d["dicabut_oleh"] = dicabut.get(d["id"], [])
# dan kunci baru di dict hasil: "konflik": konflik
```

`status` (JDIH) tidak ditimpa. Kolom D1 `hukum_dok` tidak berubah (tidak perlu migrasi): `src/hukum.js` menurunkan `dicabut_oleh` dari `hukum_relasi` yang sudah memuat relasi `mencabut` baru sesudah seed dibangun ulang.

4. `cek()` (`hukum.py:982`) ditambah kasus tetap:

```python
    t60 = ("Pada saat Peraturan Badan ini mulai berlaku: a. Peraturan Badan Nasional Penanggulangan Bencana Nomor 6 Tahun 2021 "
           "tentang A; b. Peraturan Badan Nasional Penanggulangan Bencana Nomor 7 Tahun 2021 tentang B; dan "
           "c. Peraturan Badan Nasional Penanggulangan Bencana Nomor 2 Tahun 2022 tentang C; dicabut dan dinyatakan tidak berlaku.")
    r = relasi_dari("perban-4-2025", [{"jenis": "pasal", "teks": t60}], "Judul uji")
    assert {k for (d, k, j), _ in r if j == "mencabut"} == {"perban-6-2021", "perban-7-2021", "perban-2-2022"}, r
    t_tetap = ("Pada saat Peraturan Badan ini mulai berlaku: a. Peraturan Badan Nasional Penanggulangan Bencana Nomor 6 Tahun 2021 "
               "tentang A tetap berlaku; b. Peraturan Badan Nasional Penanggulangan Bencana Nomor 7 Tahun 2021 tentang B; dicabut.")
    r = relasi_dari("perban-4-2025", [{"jenis": "pasal", "teks": t_tetap}], "Judul uji")
    assert {k for (d, k, j), _ in r if j == "mencabut"} == {"perban-7-2021"}, r
    kd = [{"id": "a", "status": "BERLAKU"}, {"id": "b", "status": "BERLAKU"}, {"id": "c", "status": "BERLAKU"}]
    kr = [{"dari": "a", "ke": "b", "jenis": "mencabut"}, {"dari": "a", "ke": "c", "jenis": "mengubah"}]
    assert [x["dok"] for x in konflik_status(kd, kr)] == ["b"]
```

**`src/hukum.js`.** Di `cariHukum` (baris 33), kolom SELECT ditambah subkueri; di `bacaDok` (baris 44), satu kueri tambahan:

```js
const DICABUT = "(SELECT group_concat(r.dari) FROM hukum_relasi r JOIN hukum_dok p ON p.id = r.dari WHERE r.ke = d.id AND r.jenis IN ('mencabut', 'mengganti') AND upper(p.status) = 'BERLAKU')";
// cariHukum: `SELECT s.id segmen, d.id dok, ..., d.status, ${DICABUT} dicabut_oleh, ...`
// bacaDok:  const c = await env.DB.prepare(`SELECT ${DICABUT} dicabut_oleh FROM hukum_dok d WHERE d.id = ?`).bind(id).first();
//           return {...dok, pdf, segmen, dicabut_oleh: c?.dicabut_oleh ? c.dicabut_oleh.split(",") : []};
```

Filter `status` di `cariHukum` (baris 30) tetap membaca kolom JDIH; hasil membawa `dicabut_oleh` sehingga layar dan asisten `/ai` (yang memakai fungsi yang sama) bisa menyebut "menurut teks sudah dicabut". Baca D1 tambahan: indeks `hukum_relasi_ke` (0052), paling banyak 20 subkueri per halaman hasil.

**`public/bnpb/hukum.js`.** Di samping `pilStatus(x.status)` (baris 135 dan 164): bila `x.dicabut_oleh?.length`, tampil pil merah "Dicabut oleh <singkatan nomor/tahun> menurut teks; JDIH masih BERLAKU" yang menaut ke dokumen pencabut. Bawaan U7: tampilan dikoreksi berlabel, daftar diteruskan pemilik.

**Bukti siap.** `python3 scripts/bnpb/hukum.py --cek` hijau; `python3 scripts/bnpb/hukum.py urai` membangun ulang katalog dan seed; gerbang `tests/agen/gerbang-status-hukum.test.mjs` (G-2, RU §3.1) membaca `katalog.json` dan menegaskan `konflik` memuat `perban-6-2021` dengan `dicabut_oleh` berisi `perban-4-2025`, dan `perka-4-2008` dengan `perban-3-2026` (fakta hukum yang tidak membusuk: pencabutan tidak pernah batal sendiri). Seed D1 diterapkan pemilik (`data/hukum/seed.sql`, DELETE lalu INSERT).

### 3.2 F0-2: ambang meja berdasar pasal

F0-2 sekaligus membuat kerangka MB-2 (`public/inti/jam_aturan.json` dan `jam_aturan.js`, §4.2) dengan entri yang dibutuhkan meja; entri lain ditambahkan saat KPOD-2.

**`src/meja_spek.js` baris 9-11** diganti:

```js
import {nilai} from "../public/inti/jam_aturan.js";   // MB-2: angka berpasal hanya di sana
/* ambang tanda bahaya. Berpasal = dari Jam Aturan; "internal" = tanda kerja tanpa pasal, tampil berlabel internal di layar */
export const AMBANG = {
  kaji_awal_jam: nilai("kaji_awal"),                 // 24: laporan awal 1 x 24 jam setelah tiba (Juklak 3/2022 hal. 8, 16)
  kaji_lanjutan_jam: nilai("kaji_lanjutan"),         // 72: laporan lanjutan 3 x 24 jam (Juklak 3/2022 hal. 8, 16)
  logistik_setuju_jam: 24,                           // internal
  dsp_lapor_tanggal: nilai("dsp_laporan_perkembangan"), // 5: paling lambat tiap tanggal 5 bulan berikutnya (Perban 4/2020 Pasal 21 ayat (1))
  dsp_spj_bulan: nilai("dsp_spj"),                   // 3: paling lambat 3 bulan setelah status berakhir (Perban 4/2020 Pasal 21 ayat (2))
  renkon_berlaku_tahun: nilai("renkon_berlaku"),     // 3 (Perban 2/2023 Pasal 21)
  renkon_reviu_bulan: nilai("renkon_reviu"),         // 6: reviu paling sedikit 6 bulan sekali (Perban 2/2023 Pasal 21)
  renkon_segera_hari: 90,                            // internal
  destana_nilai_tahun: nilai("destana_penilaian"),   // 3: penilaian mandiri paling sedikit tiap 3 tahun (Perban 7/2025 Pasal 14 ayat (5))
  destana_pasif_bulan: 12,                           // internal
  rehab_macet_hari: 60,                              // internal
};
export const AMBANG_INTERNAL = ["logistik_setuju_jam", "renkon_segera_hari", "destana_pasif_bulan", "rehab_macet_hari"];
```

`INDIKATOR_DESTANA` (baris 9) dihapus. Perban 7/2025 Pasal 13 menetapkan indikator Destana = SNI; SNI 8357:2017 belum ada di tangan (riset/2 §5), jadi kolom indikator ditiadakan, bukan dikarang.

**Kolom yang berubah** (isi `data` adalah JSON, jadi tidak perlu migrasi):

| Meja | Perubahan | Alasan |
| --- | --- | --- |
| `kaji_cepat` | `bahaya.belum_diverifikasi` memakai `AMBANG.kaji_awal_jam` (24). Teks: "dilaporkan lebih dari 24 jam belum diverifikasi (laporan awal Juklak 3/2022)" | `rec.dibuat` dipakai sebagai proksi waktu tiba TRC; dua tahap penuh (awal, lanjutan) adalah WIL-3 |
| `dsp` | kolom isian awal baru `tgl_status_berakhir` (tanggal, opsional) dan `laporan_terakhir` (tanggal, opsional, `maks: "hariini"`); `bahaya`: `laporan_terlambat`, `spj_terlambat` | Perban 4/2020 Pasal 21 ayat (1) dan (2) |
| `renkon` | `berlaku_sampai` tidak lagi wajib (bawaan `tgl_sah` + 3 tahun); kolom baru `reviu_terakhir` (tanggal, `maks: "hariini"`); `uji_terakhir` tetap (Pasal 19, tanpa tenggat); `turunan: ["berlaku", "segera_habis", "kedaluwarsa", "perlu_reviu"]`; `cek`: `berlaku_sampai` paling lambat `tgl_sah` + 3 tahun | Perban 2/2023 Pasal 21 |
| `destana` | kolom `indikator` dihapus; kolom baru `tgl_penilaian` (tanggal, `maks: "hariini"`); `turunan: ["aktif", "pasif", "penilaian_kedaluwarsa"]` | Perban 7/2025 Pasal 13, Pasal 14 ayat (5) dan (6) |

**Fungsi turunan** (`meja_spek.js:183-210`) diganti bagian renkon, destana, dsp, kaji cepat:

```js
const majuBulan = (t, n) => mundurBulan(t, -n);
const lima = t => { const d = new Date(t.slice(0, 7) + "-01T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 8) + String(AMBANG.dsp_lapor_tanggal).padStart(2, "0"); };   // tanggal 5 bulan sesudah t

// statusEfektif
if (meja === "renkon") {
  const sampai = d.berlaku_sampai || majuBulan(d.tgl_sah, 12 * AMBANG.renkon_berlaku_tahun), sisa = selisihHari(sampai, h);
  const reviu = [d.tgl_sah, d.reviu_terakhir].filter(Boolean).sort().at(-1);
  return sisa < 0 ? "kedaluwarsa" : sisa <= AMBANG.renkon_segera_hari ? "segera_habis" : reviu < mundurBulan(h, AMBANG.renkon_reviu_bulan) ? "perlu_reviu" : "berlaku";
}
if (meja === "destana") return d.kegiatan_terakhir && d.kegiatan_terakhir >= mundurBulan(h, AMBANG.destana_pasif_bulan) ? "aktif" : "pasif";

// tandaBahaya
if (meja === "kaji_cepat" && rec.status === "dilaporkan" && kini - rec.dibuat > AMBANG.kaji_awal_jam * JAM) out.push("belum_diverifikasi");
if (meja === "dsp" && rec.status === "cair") {
  if (h > lima(d.laporan_terakhir || d.tgl_cair)) out.push("laporan_terlambat");
  if (d.tgl_status_berakhir && h > majuBulan(d.tgl_status_berakhir, AMBANG.dsp_spj_bulan)) out.push("spj_terlambat");
}
if (meja === "renkon") { const s = statusEfektif(meja, rec, kini); if (s === "kedaluwarsa" || s === "perlu_reviu") out.push(s); }
if (meja === "destana") {
  if (statusEfektif(meja, rec, kini) === "pasif") out.push("pasif");
  if (!d.tgl_penilaian || d.tgl_penilaian < mundurBulan(h, 12 * AMBANG.destana_nilai_tahun)) out.push("penilaian_kedaluwarsa");
}
```

Catatan lama yang sudah memuat `indikator` atau `berlaku_sampai` tetap terbaca; `validasi()` hanya memeriksa kolom yang dikirim (`meja_spek.js:171-180`).

**Pemakai lain.** `src/pengingat.js:56-57`: kondisi `tanda.includes("spj_terlambat")` tetap, teks menjadi "DSP cair <tgl> belum SPJ lewat 3 bulan sesudah status berakhir <tgl_status_berakhir>", dan butir kedua untuk `laporan_terlambat` ("laporan perkembangan DSP jatuh tempo tanggal 5"). `public/bnpb/meja.js:13` dan `public/admin/meja.js:12`: `belum_diuji: "tunggu"` diganti `perlu_reviu: "tunggu"`, ditambah `penilaian_kedaluwarsa: "bahaya"`. Seed dummy `src/meja.js:494` (komentar `belum_diuji`) disesuaikan. Layar menampilkan ambang internal dengan label "tanda internal, bukan pasal" (dari `AMBANG_INTERNAL` lewat `spekPublik()`).

**Uji** (`tests/warga/meja.test.mjs`): baris 116-118 diganti kasus `perlu_reviu` (reviu 7 bulan lalu, sah 1 tahun lalu) dan `berlaku` (reviu 5 bulan lalu); kasus baru `berlaku_sampai` lebih dari `tgl_sah` + 3 tahun ditolak 400; baris 135 diganti dua kasus DSP (`tgl_cair` 1 Agustus dan hari ini 6 September: `laporan_terlambat`; `tgl_status_berakhir` 4 bulan lalu: `spj_terlambat`; tanpa `tgl_status_berakhir`: tidak ada `spj_terlambat`); baris 259 `belum_diuji` menjadi `perlu_reviu`; kasus Destana tanpa `tgl_penilaian` bertanda `penilaian_kedaluwarsa`. Semua dijalankan pada worker utuh dengan D1 Miniflare.

### 3.3 F0-3: meja `rehab` lepas dari syarat kaji cepat

**Kenapa perlu bangun ulang tabel.** Syarat itu ada di tiga tempat: CHECK tabel `CHECK ((meja = 'rehab') = (kaji_id IS NOT NULL))` (`0026_meja.sql:49`), trigger `meja_rehab_tautan` (`0026_meja.sql:58-62`), dan `src/meja.js:114-121`. CHECK tingkat tabel tidak bisa diubah di SQLite tanpa membangun ulang tabel (pola `0054_kunci_api_konsesi.sql`). `0026` dibekukan `migrasi_beku.json`, jadi perubahan lewat `0110`.

Tiga hal yang membuat bangun ulang `meja_catatan` lebih rawan daripada `0054`: (1) `meja_jejak.catatan_id REFERENCES meja_catatan (id) ON DELETE CASCADE` (`0026:82`): `DROP TABLE` dengan foreign key aktif menjalankan DELETE tersirat yang ikut mengosongkan `meja_jejak`; (2) `meja_stok` (`0026:99, 103`) menunjuk `meja_catatan` tanpa aksi; (3) trigger `meja_stok_sah` di tabel lain merujuk `meja_catatan` di badannya, dan `ALTER TABLE ... RENAME` menolak bila ada trigger yang merujuk tabel yang tidak ada. Penanganan: `PRAGMA defer_foreign_keys = true`, cadangkan `meja_jejak`, buang dan bangun ulang `meja_stok_sah`.

```sql
-- 0110: meja 'rehab' boleh tanpa kaji cepat induk (KEPUTUSAN-AWAL F0-3; riset/5 temuan 9). 0026 tidak disunting (migrasi_beku.json).
-- Yang berubah HANYA: CHECK kaji_id (rehab boleh NULL; meja lain tetap wajib NULL), trigger tautan (hanya bila kaji_id diisi),
-- dan indeks unik baru untuk rehab tanpa induk per (prov, kab, kejadian_ref). Kolom, CHECK lain, indeks lain, trigger lain disalin persis dari 0026.
-- Idempoten: sisa tabel sementara dari jalan terpotong dibuang dulu. Salinan memakai INSERT biasa, jadi baris yang melanggar membuat migrasi gagal
-- SEBELUM tabel lama dibuang. meja_jejak dicadangkan karena DROP TABLE menjalankan ON DELETE CASCADE.
PRAGMA defer_foreign_keys = true;
DROP TABLE IF EXISTS meja_catatan_baru;
DROP TABLE IF EXISTS meja_jejak_cadang;

CREATE TABLE meja_catatan_baru (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  meja TEXT NOT NULL CHECK (meja IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana', 'rehab', 'gudang')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kec TEXT CHECK (kec IS NULL OR length(kec) BETWEEN 2 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 2 AND 80),
  data TEXT NOT NULL CHECK (json_valid(data) AND json_type(data) = 'object' AND length(data) <= 6000),
  status TEXT NOT NULL,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL CHECK (diubah >= dibuat),
  oleh TEXT,
  petugas_id TEXT REFERENCES meja_petugas (id),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  kaji_id TEXT REFERENCES meja_catatan (id),
  stok INTEGER CHECK (stok IS NULL OR stok >= 0),
  klien_id TEXT CHECK (klien_id IS NULL OR length(klien_id) BETWEEN 8 AND 40),
  CHECK ((meja = 'kaji_cepat' AND status IN ('dilaporkan', 'diverifikasi', 'masuk_jitupasna'))
    OR (meja = 'logistik' AND status IN ('diminta', 'disetujui', 'dikirim', 'diterima'))
    OR (meja = 'dsp' AND status IN ('diajukan', 'disetujui', 'cair', 'spj', 'selesai', 'ditolak'))
    OR (meja = 'rehab' AND status IN ('jitupasna', 'usulan', 'disetujui', 'cair', 'dibangun', 'selesai', 'ditolak'))
    OR (meja IN ('renkon', 'destana', 'gudang') AND status = 'tercatat')),
  CHECK (meja = 'rehab' OR kaji_id IS NULL),
  CHECK ((meja = 'gudang') = (stok IS NOT NULL)),
  CHECK (meja NOT IN ('kaji_cepat', 'destana') OR desa IS NOT NULL),
  CHECK (meja != 'destana' OR kec IS NOT NULL)
);
INSERT INTO meja_catatan_baru (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, dummy, kaji_id, stok, klien_id)
  SELECT id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, dummy, kaji_id, stok, klien_id FROM meja_catatan;
CREATE TABLE meja_jejak_cadang AS SELECT * FROM meja_jejak;

DROP TRIGGER IF EXISTS meja_stok_sah;
DROP TABLE meja_catatan;   -- ikut membuang trigger meja_rehab_tautan, meja_catatan_ubah, dan indeks di tabel ini; mengosongkan meja_jejak (CASCADE)
ALTER TABLE meja_catatan_baru RENAME TO meja_catatan;
INSERT INTO meja_jejak (id, catatan_id, dari, ke, waktu, oleh, catatan, dummy, klien_id, diterima)
  SELECT id, catatan_id, dari, ke, waktu, oleh, catatan, dummy, klien_id, diterima FROM meja_jejak_cadang WHERE id NOT IN (SELECT id FROM meja_jejak);
DROP TABLE meja_jejak_cadang;

CREATE INDEX IF NOT EXISTS meja_catatan_wilayah ON meja_catatan (meja, prov, kab, status);
CREATE UNIQUE INDEX IF NOT EXISTS meja_catatan_klien ON meja_catatan (oleh, klien_id) WHERE klien_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meja_rehab_satu ON meja_catatan (kaji_id) WHERE meja = 'rehab';
CREATE UNIQUE INDEX IF NOT EXISTS meja_gudang_unik ON meja_catatan (prov, kab, lower(json_extract(data, '$.gudang')), json_extract(data, '$.barang')) WHERE meja = 'gudang';
CREATE UNIQUE INDEX IF NOT EXISTS meja_rehab_kejadian ON meja_catatan (prov, kab, json_extract(data, '$.kejadian_ref'))
  WHERE meja = 'rehab' AND kaji_id IS NULL AND json_extract(data, '$.kejadian_ref') IS NOT NULL;

-- tautan ke kaji cepat tetap dijaga, tetapi hanya bila kaji_id diisi
CREATE TRIGGER IF NOT EXISTS meja_rehab_tautan BEFORE INSERT ON meja_catatan
WHEN NEW.meja = 'rehab' AND NEW.kaji_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM meja_catatan k WHERE k.id = NEW.kaji_id AND k.meja = 'kaji_cepat' AND k.status = 'masuk_jitupasna' AND k.prov = NEW.prov AND k.kab = NEW.kab AND k.dummy = NEW.dummy)
BEGIN
  SELECT RAISE(ABORT, 'rehab harus tertaut ke kaji cepat masuk_jitupasna di kabupaten yang sama');
END;
-- disalin persis dari 0026:68-77
CREATE TRIGGER IF NOT EXISTS meja_catatan_ubah BEFORE UPDATE ON meja_catatan
WHEN NEW.meja != OLD.meja OR NEW.prov != OLD.prov OR NEW.kab != OLD.kab OR NEW.kaji_id IS NOT OLD.kaji_id
  OR (NEW.status != OLD.status AND (OLD.meja || ':' || OLD.status || '>' || NEW.status) NOT IN (
    'kaji_cepat:dilaporkan>diverifikasi', 'kaji_cepat:diverifikasi>masuk_jitupasna',
    'logistik:diminta>disetujui', 'logistik:disetujui>dikirim', 'logistik:dikirim>diterima',
    'dsp:diajukan>disetujui', 'dsp:diajukan>ditolak', 'dsp:disetujui>cair', 'dsp:cair>spj', 'dsp:spj>selesai',
    'rehab:jitupasna>usulan', 'rehab:usulan>disetujui', 'rehab:usulan>ditolak', 'rehab:disetujui>cair', 'rehab:cair>dibangun', 'rehab:dibangun>selesai'))
BEGIN
  SELECT RAISE(ABORT, 'perubahan meja, wilayah, atau status tidak sah');
END;
-- disalin persis dari 0026:112-117
CREATE TRIGGER IF NOT EXISTS meja_stok_sah BEFORE INSERT ON meja_stok
WHEN NOT EXISTS (SELECT 1 FROM meja_catatan WHERE id = NEW.gudang_id AND meja = 'gudang')
  OR (NEW.logistik_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM meja_catatan WHERE id = NEW.logistik_id AND meja = 'logistik'))
BEGIN
  SELECT RAISE(ABORT, 'transaksi stok harus untuk catatan gudang (dan logistik bila ada)');
END;
```

Jalan ulang aman: tabel sementara dibuang di awal; jalan kedua menyalin dari tabel yang sudah berskema baru ke tabel baru yang sama bentuknya. Produksi 5 Nov 2026: `meja_catatan` 0 baris (KEPUTUSAN-AWAL §2 butir 3), jadi risiko data nyata kecil, tetapi migrasi tetap ditulis untuk tabel berisi.

**`src/meja_spek.js` meja `rehab`**: `tautKaji: true` menjadi `tautKaji: "opsional"`; kolom isian awal baru `k("kejadian_ref", "Rujukan kejadian (nomor SK status atau id episode)", "teks", {maks: 80})`. Tanpa kaji cepat induk, `kejadian_ref` diisi dari jam pascabencana atau neraca rumah (RRX-1, RRP-1) dan dijaga unik oleh indeks `meja_rehab_kejadian`.

**`src/meja.js:114-121`** menjadi:

```js
  /* rehab: kaji cepat induk OPSIONAL (0110). Bila diisi: wajib masuk_jitupasna di kabupaten yang sama, wilayah disalin darinya. */
  let kajiId = null;
  if (b.o.kaji_id != null) {
    if (!M.tautKaji) return gagal(400, "kaji_id hanya untuk meja Rehab-rekon");
    if (typeof b.o.kaji_id !== "string" || !RE_ID.test(b.o.kaji_id)) return gagal(400, "kaji_id: id catatan kaji cepat (16 hex)");
    const kj = await env.DB.prepare("SELECT meja, status, prov, kab, kec, desa, dummy FROM meja_catatan WHERE id = ?").bind(b.o.kaji_id).first();
    if (!kj || kj.meja !== "kaji_cepat" || kj.status !== "masuk_jitupasna" || kj.prov !== prov || kj.kab !== kab || kj.dummy) return gagal(400, "kaji_id harus catatan kaji cepat berstatus masuk_jitupasna di kabupaten ini");
    kajiId = b.o.kaji_id; wl = {kec: kj.kec, desa: kj.desa};
  }
```

`UNIK.rehab` (`meja.js:93`) menjadi "kaji cepat atau kejadian ini sudah punya catatan rehab-rekon". `public/bnpb/meja.js:97`: label "Kaji cepat induk (opsional)" dan opsi kosong "Tanpa kaji cepat induk"; baris 156 mengirim `kaji_id` hanya bila dipilih.

**Uji.** `tests/warga/meja.test.mjs`: (1) rehab tanpa `kaji_id` dengan `kejadian_ref` diterima 201; (2) rehab tanpa `kaji_id` dua kali dengan `kejadian_ref` sama di kab yang sama ditolak 409; (3) rehab dengan `kaji_id` berstatus `dilaporkan` tetap ditolak 400 di Worker DAN di D1 langsung (INSERT SQL melewati Worker, trigger `meja_rehab_tautan` menolak); (4) meja `dsp` dengan `kaji_id` terisi ditolak CHECK D1 langsung; (5) migrasi 0110 diterapkan dua kali di D1 yang sudah berisi satu catatan, satu jejak, satu transaksi stok: jumlah baris ketiga tabel sama sebelum dan sesudah (membuktikan cadangan `meja_jejak` dan `defer_foreign_keys` bekerja). Semua dengan D1 Miniflare, migrasi apa adanya (`tests/warga/_bantu.mjs` `migrasi`).

### 3.4 Urutan dan bukti selesai F0

1. F0-1 (`ruang-bnpb`, lalu `warga-api` untuk `src/hukum.js`). Bukti: `python3 scripts/bnpb/hukum.py --cek`, `node --test tests/agen/gerbang-status-hukum.test.mjs`.
2. MB-2 kerangka (`inti-layar`), lalu F0-2 (`warga-api`). Bukti: `node --test tests/agen/gerbang-jam-aturan.test.mjs`, `node --test tests/warga/meja.test.mjs tests/warga/pengingat.test.mjs`.
3. F0-3 (`warga-api` + `migrasi-idempoten`). Bukti: `node --test tests/warga/meja.test.mjs`, `npm run uji:warga` hijau, `migrasi_beku.json` diperbarui sesudah pemilik menerapkan 0110 di produksi.

Pemeriksa: `migrasi-idempoten` (0110), `guard-api` (`src/meja.js`), `selera-angka` (pil hukum).

---

## 4. Mesin bersama

Semua mesin Python tinggal di `scripts/bnpb/unit/` dan diimpor sebagai modul (`from unit import panen`) oleh skrip sistem; `jalan.py` menambahkan `scripts/bnpb` ke `sys.path` sekali. Tiap mesin punya `cek()` tanpa jaringan.

### 4.1 MB-1 Status peraturan

| Bagian | Isi |
| --- | --- |
| Modul | `scripts/bnpb/hukum.py` (perluasan F0-1). Tidak ada berkas baru |
| Fungsi | `cabut_daftar(teks, ms)`, `konflik_status(dok, relasi)` (§3.1); `amanat(segmen)` untuk HUK-2 (§6.27) |
| Keluaran | `public/data/bnpb/hukum/katalog.json` kunci `konflik` dan medan dok `status_teks`, `dicabut_oleh`; R2 `unit/status_peraturan.json` (ringkasan untuk kartu HUK-1) |
| Jadwal | `hukum.py urai` dijalankan lokal oleh pemilik saat korpus dipanen (butuh `data/raw/hukum/teks/`, tidak di git); ringkasan R2 dibangkitkan harian dari `katalog.json` oleh `scripts/bnpb/unit/huk1.py` |

Skema `unit/status_peraturan.json`:

```json
{"dibuat": "2026-11-05T14:20:00Z", "sumber": [{"nama": "Katalog JDIH BNPB (dibangun Centurisk97)", "berkas": "public/data/bnpb/hukum/katalog.json", "dibangun": "<katalog.dibangun>"}],
 "label": "hitungan_kita", "basi_jam": 720,
 "ringkas": {"dok": 233, "berlaku_jdih": "<n>", "konflik": 13},
 "konflik": [{"dok": "perban-6-2021", "judul": "<judul>", "status_jdih": "BERLAKU", "status_teks": "DICABUT",
              "dicabut_oleh": [{"dok": "perban-4-2025", "judul": "<judul>"}]}]}
```

### 4.2 MB-2 Jam Aturan

| Bagian | Isi |
| --- | --- |
| Modul | data `public/inti/jam_aturan.json`; fungsi `public/inti/jam_aturan.js` (ES module, satu-satunya impor adalah JSON itu). Tanpa berkas bangkitan (KA §8, PRD BT-4) |
| Ekspor | `ATURAN` (larik), `nilai(kunci)`, `aturan(kunci)`, `tenggat(kunci, mulai)` -> tanggal ISO, `standar(kunci)` |
| Pemakai | `src/meja_spek.js` (F0-2), `public/bnpb/unit/*.js`, `public/inti/status_pedoman.js` (masa status), Python membaca `jam_aturan.json` (`scripts/bnpb/unit/aturan.py` `muat()`) |
| Jadwal | statis; berubah hanya lewat commit |

Bentuk entri di `jam_aturan.json` (ALGORITMA §3):

```json
[{"kunci": "kaji_awal", "jenis": "tenggat", "nilai": 24, "satuan": "jam", "sejak": "tiba_di_lokasi", "acuan": "juklak-3-2022", "letak": "hal. 8 dan 16",
  "kutipan": "paling lambat 1 x 24 jam setelah tiba di lokasi kejadian", "asumsi": false},
 ...]
```

Isi awal (semua acuan berstatus BERLAKU di `katalog.json`, diperiksa 5 Nov 2026). Nama kunci, nilai, dan pasal mengikuti ALGORITMA §3.1, yang menang bila berbeda (KA §8):

| Kunci | Nilai | Sejak | Acuan | Dipakai |
| --- | --- | --- | --- | --- |
| `kaji_mulai` | 24 jam | informasi diterima | Juklak 3/2022 BAB II huruf C angka 1 (hal. 7) | WIL-3 |
| `trc_bergerak` | 24 jam | perintah | Juklak 3/2022 hal. 8 | WIL-3 |
| `kaji_awal` | 24 jam | tiba di lokasi | Juklak 3/2022 hal. 8, 16 | F0-2, WIL-3 |
| `kaji_lanjutan` | 72 jam | tiba di lokasi | Juklak 3/2022 hal. 8, 16 | F0-2, WIL-3 |
| `dsp_laporan_kejadian` | 3 hari | kejadian | Perban 4/2020 Pasal 4 | KPOD-1, WIL-1 |
| `dsp_laporan_perkembangan` | tanggal 5 bulan berikutnya | cair atau laporan terakhir | Perban 4/2020 Pasal 21 ayat (1) | F0-2 |
| `dsp_spj` | 3 bulan | status berakhir | Perban 4/2020 Pasal 21 ayat (2) | F0-2, WIL-1 |
| `r3p` | 90 hari | mulai tanggap darurat | Perban 5/2017 Pasal 2 ayat (2) dan (3) | RRX-1 |
| `renkon_berlaku` | 3 tahun | penetapan | Perban 2/2023 Pasal 21 | F0-2, KS-1 |
| `renkon_reviu` | 6 bulan | penetapan atau reviu terakhir | Perban 2/2023 Pasal 21 | F0-2, KS-1 |
| `destana_penilaian` | 3 tahun | penilaian terakhir | Perban 7/2025 Pasal 14 ayat (5) | F0-2 |
| `destana_evaluasi` | 1 tahun | - | Perban 7/2025 Pasal 19 | REN-3 |
| `ews_evaluasi` | 4 bulan | - | Perban 2/2024 Pasal 29 ayat (1) | PD-1, REN-3 |
| `ews_rapat_platform` | 1 tahun | - | Perban 2/2024 Pasal 9 ayat (4) | REN-3 |
| `pengungsi_mutakhir` | 1 hari | data terakhir | Juknis 9/2023 hal. 10 | WIL-2 |
| `klaster_logistik_mutakhir` | 3 bulan | pemutakhiran terakhir | Juklak 16/2025 | OJL-3 |
| `hibah_rr_lapor` | 3 bulan, paling lambat 15 hari setelah tahap | tahap | Juklak 9/2024 | REN-3 |
| `tlhp` | 60 hari | LHP diterima | Pedoman 1/2025 | IRT-1, REN-3 |
| `pengaduan_berkadar` | 20 hari kerja | pengaduan diterima | Juklak 5/2025 | REN-3 |
| `pengaduan_tak_berkadar` | 15 hari kerja | pengaduan diterima | Juklak 5/2025 | REN-3 |
| `laporan_pelatihan` | 7 hari kerja | pelatihan selesai | Perban 2/2025 Pasal 14 | REN-3 |
| `jf_jp_tahun` | 20 JP per tahun | - | Perban 4/2025 Pasal 40 | JF-1 |
| `rpbd_monev` | 1 tahun | - | Perban 3/2026 Pasal 47 | PSPB-1 |
| `stok_minimal_jam` | 72 jam | - | Perka 23/2014 Pasal 1 angka 15 | PLP-1 |
| `stok_pr_umum`, `stok_pr_khusus` | 1%, 4% | - | Perka 23/2014 Pasal 12, Pasal 14 | PLP-1 |
| `stok_jiwa_per_paket` | 4 jiwa | - | Perka 23/2014 Pasal 11 | PLP-1 |
| `std_beras_kg` | 0,4 kg per orang per hari | - | Perka 7/2008 | MB-5 |
| `std_air_bersih_l` | 7 liter (3 hari pertama), lalu 15 liter per orang per hari | buka tempat | Perka 7/2008, Juklak 3/2022 hal. 25 | MB-5 |
| `std_air_minum_l` | 2,5 liter per orang per hari | - | Perka 7/2008 | MB-5 |
| `std_hunian_m2` | 3 m2 per orang | - | Perka 7/2008 | MB-5 |
| `std_jamban_jiwa` | 1 jamban per 20 orang | - | Perka 7/2008, Juklak 3/2022 hal. 25 | MB-5 |
| `std_sabun_kg` | 0,25 kg per orang per bulan | - | Perka 7/2008 | MB-5 |
| `std_sampah_kk` | 1 kantong untuk 3 keluarga per 3 hari | - | Juklak 3/2022 hal. 25 | MB-5 |
| `masa_status_kab`, `masa_status_prov`, `masa_status_nas` | 14 hari, 1 bulan, 3 bulan (batas atas) | penetapan | Pedoman Penetapan Status Keadaan Darurat 2016, tidak ada di JDIH | KPOD-1, WIL-1 (`asumsi: true`) |
| `hibah_logpal_lapor` | 12 bulan | BAST | tidak tertulis di Juklak 3/2024 | PLP-3 (`asumsi: true`, bawaan riset/4 Q4) |

Letak halaman Perka 7/2008 (hal. 9-12, riset/3 §2) diperiksa saat entri ditulis; kutipannya wajib persis.

**Fungsi `tenggat()`**: aturan per satuan, termasuk tanggal WIB, pangkas akhir bulan, `hari_kerja` tanpa libur nasional berlabel asumsi, dan `tanggal_bulan_berikut` (DSP), mengikuti ALGORITMA §3.2.

**Gerbang `tests/agen/gerbang-jam-aturan.test.mjs`** (tanpa DB, membaca berkas di git):
1. Tiap entri dengan `asumsi: false` punya `acuan` yang ada di `public/data/bnpb/hukum/katalog.json`, `status` BERLAKU, dan tidak ada di `konflik` (MB-1). Pesan gagal menyebut kunci, acuan, dan status yang ditemukan.
2. `kutipan` (dinormalkan: huruf kecil, spasi tunggal) ditemukan di baris `INSERT INTO hukum_segmen` milik dokumen `acuan` di `data/hukum/seed.sql` (berkas di git; `data/raw/hukum/teks/` tidak di git).
3. Entri `asumsi: true` wajib punya `catatan` dan tampil berlabel "asumsi" (diperiksa di `public/bnpb/unit/rapor.js`: pemanggil `labelAturan()`).
4. Tidak ada angka tenggat tertanam: grep `src/meja_spek.js`, `src/pengingat.js`, `public/inti/status_pedoman.js`, `scripts/bnpb/unit/*.py` untuk pola `(hari|jam|bulan)\s*[:=]\s*(24|72|90|30)\b` di luar daftar pengecualian internal (`AMBANG_INTERNAL`). Pesan gagal menyebut berkas dan baris.

Uji fungsi `tenggat()` di `tests/bnpb/unit_kembar.test.mjs` (RU §1.1 L3, kasus `tests/bnpb/fixtures/unit/acuan.json`) (fungsi murni: 31 Januari + 1 bulan, tanggal 5 bulan berikut dari 31 Desember, hari kerja melewati akhir pekan).

### 4.3 MB-3 Pemanen JDIH daerah

| Bagian | Isi |
| --- | --- |
| Modul | `scripts/bnpb/unit/jdih_daerah.py` |
| Fungsi | `cari(kata_kunci, kode_wilayah)` -> daftar dokumen `{judul, jenis, nomor, tahun, tgl_tetap, url, pemda}`; `kenali(judul)` -> `rpbd` / `renkon` / `rpkb` / `rencana_aksi` / `None`; `periode(judul)` -> `(mulai, akhir)` dari regex `Tahun (\d{4})\s*[-–]\s*(\d{4})`; `cocok_pemda(nama)` -> kode BPS lewat `scripts/bnpb/wilayah_kab.py` dan `norm()` + alias yang sudah ada |
| Keluaran | R2 `unit/jdih_daerah.json` (dokumen terkenali per pemda), dipakai PSPB-1 dan KS-1 |
| Jadwal | mingguan (`--mingguan`, KA §8) untuk semua jenis dokumen; cache per pemda 30 hari di `data/raw/unit/jdih/<kode>.json` |
| Jeda | 1 detik antarpermintaan (U5), User-Agent §8 |

Urutan sumber: (1) JDIHN `https://jdihn.go.id` (halaman depan HTTP 200, titik API belum diuji, riset/1 §6); langkah pertama tiket MB-3 adalah memeriksa apakah JDIHN punya pencarian yang bisa dibaca mesin; (2) bila tidak, situs JDIH provinsi yang memakai aplikasi seragam, diprobe per provinsi dengan daftar URL yang ditulis tangan di `scripts/bnpb/unit/jdih_situs.json`; (3) bila situs menolak, catat `diblokir` per pemda dan serahkan ke `scraper-antibot` sebagai tiket terpisah. Tidak ada pemanenan teks penuh; hanya metadata judul dan tanggal.

Skema `unit/jdih_daerah.json`:

```json
{"dibuat": "...", "label": "sekunder", "basi_jam": 240,
 "sumber": [{"nama": "JDIHN", "url": "https://jdihn.go.id", "diambil": "..."}],
 "cakupan": {"pemda": 552, "diperiksa": "<n>", "diblokir": "<n>"},
 "dok": [{"kode": "3321", "jenis_dok": "rpbd", "judul": "...", "nomor": "...", "tahun": 2025, "tgl_tetap": "2025-..-..",
          "periode": [2025, 2029], "periode_diduga": false, "url": "https://..."}]}
```

### 4.4 MB-4 Skor prioritas daerah

| Bagian | Isi |
| --- | --- |
| Modul | `scripts/bnpb/unit/skor.py` |
| Fungsi | `persentil(nilai_per_kab, arah)` -> `{kab: p}` di [0, 1], `arah = +1` (makin besar makin prioritas) atau `-1`; `skor(komponen, bobot)` -> `{kab: {skor, rinci}}` |
| Masukan bawaan | ALGORITMA §5.4: risiko = jiwa terpapar kelas tinggi, maksimum atas bahaya (`terpapar.json`), bukan `risiko_hvc.json` `R_total` (KA §8); celah kapasitas: `1 - ikd.json kab[k].c`; kejadian: jumlah 5 tahun lengkap di `dibi_kab_tahun.json`; celah layanan: diberikan tiap sistem pemakai |
| Keluaran | tidak menulis berkas sendiri; tiap pemakai menulis skornya di berkasnya beserta `bobot` dan `komponen` |

Rumus mengikuti ALGORITMA §5.2: q = maks(p, 0,01) untuk komponen persentil (persentil ALGORITMA §0.6), q = v untuk komponen mutlak; S = `exp(Σ_j w_j ln q_kj / Σ_j w_j)` hanya atas komponen yang punya data untuk kab itu (bobot sisanya dinormalkan ulang, pola `RAPOR` `src/meja_spek.js:13`); bila bobot komponen yang ada kurang dari separuh jumlah bobot, S = `null` ("data kurang"). Rata-rata geometrik dipilih karena KEPUTUSAN-AWAL §4 menulis "risiko x celah kapasitas x celah layanan": kab dengan satu komponen nyaris nol tidak terangkat oleh komponen lain. Bobot bawaan sama rata, tertulis di keluaran, dan diberi label "bobot sementara, belum diuji balik". `rinci` memuat p tiap komponen supaya layar bisa menjelaskan urutan.

`cek()`: kasus acuan A1-A10 ALGORITMA §5.6 (RU §2.2) dan invarian monoton terhadap tiap komponen ber-arah +1.

### 4.5 MB-5 Neraca kebutuhan

| Bagian | Isi |
| --- | --- |
| Modul | `scripts/bnpb/unit/neraca.py`; kembar JS `kebutuhanDasar(jiwa, hari_sejak_buka, kk)` di `public/inti/jam_aturan.js` untuk WIL-2 dan RRP-3 |
| Fungsi | `kebutuhan(jiwa, hari, std)` -> `{barang: jumlah}`; `neraca(kebutuhan, tersedia)` -> `{barang: {butuh, ada, celah, status}}` dengan status `cukup` / `kurang` / `belum_dilaporkan` |
| Standar | hanya dari `jam_aturan.json` (`std_*`, `stok_*`) |

Rumus kebutuhan per orang per hari (Perka 7/2008, Juklak 3/2022 hal. 25): beras = 0,4 kg x jiwa; air bersih = 7 l x jiwa pada hari 1-3 sejak buka, lalu 15 l; air minum = 2,5 l x jiwa; jamban = ceil(jiwa / 20); hunian = 3 m2 x jiwa; kantong sampah = ceil(KK / 3) per 3 hari; sabun = 0,25 kg x jiwa per bulan. `celah = max(0, butuh - ada)`; `ada` kosong (bukan 0) menghasilkan `belum_dilaporkan`, tidak pernah dianggap nol. Uji kembar `tests/bnpb/unit_kembar.test.mjs` menjalankan JS dan `python3 -I scripts/bnpb/unit/neraca.py --kembar <kasus>` pada kasus yang sama (pola uji kembar SIPPA).

### 4.6 MB-6 Rapor dari data

| Bagian | Isi |
| --- | --- |
| Modul Python | `scripts/bnpb/unit/rapor.py` `kartu(id, pil, judul, angka, kolom, baris, rumus, sumber, label)` -> dict; `berkas(nama, kartu, sumber, basi_jam)` menulis `/tmp/unit/<nama>.json` |
| Perender | `public/bnpb/unit/rapor.js` `render(kartu)` -> elemen `.ex.ex-std` (pil `.ex-ey`, judul kalimat temuan dengan angka `.hl`, tabel `.ex-tabel` menempel penuh, kepala tabel biru tua, definisi kolom di `title` kepala tabel, tanpa kaki keterangan; AGENTS.md §3.5) |
| Gerbang | `public/bnpb/unit/unit.html` dan `rapor.js` masuk `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs` |

Skema satu kartu (dipakai semua sistem bertampilan rapor):

```json
{"id": "plp1-ringkas", "sistem": "PLP-1", "pil": "Logistik",
 "judul": "{n} kab/kota belum punya data stok untuk 72 jam pertama", "angka": {"n": 514},
 "kolom": [{"k": "kab", "label": "Kab/kota"}, {"k": "beras_kg", "label": "Beras (kg)", "title": "JP x PR x 3 hari x 0,4 kg (Perka 23/2014 Pasal 11; Perka 7/2008)", "angka": true}],
 "baris": [{"kab": "Purbalingga", "beras_kg": 12693}],
 "rumus": "paket_pangan = JP x PR x H", "aturan": ["stok_pr_umum", "stok_minimal_jam", "std_beras_kg"],
 "label": "hitungan_kita", "sumber": ["terpapar"]}
```

`label` salah satu dari `resmi`, `sekunder`, `hitungan_kita`, `proksi` (prinsip 3); perender menampilkannya sebagai pil di samping pil kategori dan tidak pernah menulis angka `hitungan_kita` tanpa pil itu. `aturan` menunjuk kunci MB-2; perender menampilkan pasalnya di `title`. Angka diformat `public/inti/format.js` (ribuan titik, desimal koma).

Uji: `tests/bnpb/unit_layar.test.mjs` (perender pada fixture: pil label selalu ada, `.hl` hanya pada angka dari `angka`, tidak ada titik tengah U+00B7), dan `rapor.py --cek` (skema).

### 4.7 MB-7 Penerima dokumen

| Bagian | Isi |
| --- | --- |
| Modul Python | `scripts/bnpb/unit/terima.py`: `usulan(jenis, baris, sumber)` -> baris dengan `id = sha1(jenis + sumber_url + kunci_baris)[:16]`; `gabung(usulan, keputusan)` -> baris berstatus `menunggu` / `diterima` / `ditolak` / `dikoreksi` (koreksi menimpa medan yang dikoreksi) |
| D1 | `unit_ketuk` (§2.2) |
| Rute | `GET /api/unit/ketuk?berkas=`, `POST /api/unit/ketuk` (§4.9) |
| Layar | `public/bnpb/unit/ketuk.js`: daftar baris `menunggu` dari `unit/usulan_<berkas>.json`, tiap baris tiga tombol (terima, tolak, koreksi); tombol menulis ke D1 dan langsung menyembunyikan baris di klien |
| Jadwal | usulan dibangkitkan harian oleh sistem pemakai; `gabung()` membaca keputusan dari D1 lewat satu `wrangler d1 execute` per jalan: `SELECT berkas, usulan_id, keputusan, koreksi, waktu FROM unit_ketuk WHERE dummy = 0 ORDER BY waktu` |

Skema `unit/usulan_<berkas>.json`:

```json
{"dibuat": "...", "berkas": "laphar", "basi_jam": 48,
 "baris": [{"id": "9f2c0a1b3d4e5f60", "sumber": {"jenis": "pdf_wa", "nama": "Laporan Harian Dit. Koordalops 2026-11-05", "url": null},
            "label": "resmi", "isi": {"kab": "1116", "tanggal": "2026-11-05", "mengungsi_jiwa": 0}, "keyakinan": "pola_tetap"}]}
```

`keyakinan` = `pola_tetap` (pengurai deterministik) atau `pola_longgar` (regex berita). Usulan tidak pernah masuk tampilan angka sebelum `terima`, kecuali sumbernya berlabel `resmi` dan pengurainya `pola_tetap` (Laphar), yang tampil dengan pil "belum dikonfirmasi".

### 4.8 MB-8 Panen sumber resmi terbuka

| Bagian | Isi |
| --- | --- |
| Modul | `scripts/bnpb/unit/panen.py` |
| Fungsi | `ambil_json(url, cache, umur_jam, jeda=1.0)` (stdlib `urllib.request`, coba ulang 3 kali dengan jeda 2, 4, 8 detik, gagal keras dengan pesan berisi URL dan kode HTTP); `ckan(aksi, **param)`; `arcgis_daftar(folder)`; `arcgis_agregat(layanan, lapis, kolom)` (selalu `returnGeometry=false`, `outFields` daftar putih, tidak pernah `*` untuk layer bertitik); `inalogpal(api)`; `sirup(tahun, jalur)` membungkus `docs/pendanaan/sirup_tarik.py` |
| Cache | `data/raw/unit/<sumber>/<sha1 url>.json` + `.meta` (waktu ambil, status HTTP); dipulihkan antar-jalan oleh `actions/cache` |
| Atribusi | tiap keluaran memuat `sumber: [{nama, url, diambil, lisensi}]`; `lisensi: "tidak tertulis"` bila sumber tidak menyebutnya |
| Larangan | daftar `DILARANG` di modul (pola URL), dicek sebelum tiap permintaan; §8 |

Detail sumber di §8. `cek()`: `DILARANG` menolak `survey123`; `arcgis_agregat` menolak `outFields=*`; cache segar tidak memanggil jaringan (dipalsukan dengan `urlopen` tiruan).

### 4.9 Rute `src/unit.js`

| Metode dan jalur | Gerbang | Validasi | Batas laju | Keluaran |
| --- | --- | --- | --- | --- |
| `GET /bnpb/unit` | tamu: 303 `/admin/masuk?ke=/bnpb/unit`; sesi tanpa peran: 403 polos; `stafOK(P_UNIT_BACA)` | - | - | `halamanBnpbPublik(env, url, "unit/index", {pribadi: true})` |
| `GET /bnpb/unit/:kode` | sama | `kode` di `KODE_UNIT` (22 kode: perb, pspb, spb, pus, pd, ks, mt, kpod, wil, plp, ojl, rrx, rrp, rri, rrs, ren, keu, sdu, huk, irt, dik, jf), selain itu 404 | - | `unit/unit.html` |
| `GET /api/unit/indeks` | `stafOK(P_UNIT_BACA)` dulu, 401 bila gagal | - | - | R2 `unit/indeks.json` + `x-diperbarui` |
| `GET /api/unit/data/:nama` | `stafOK(P_UNIT_BACA)` sebelum nama dan R2; nama di `DATA_UNIT_TERBATAS` memakai `modAtauStaf(P_UNIT_BACA)` (akun gerbang 401) | `nama` di `DATA_UNIT` (daftar tetap), selain itu 404 tanpa menyentuh R2; 0 byte = 404 `belum_ada`; lebih dari 8 MB = 500 | - | badan R2 apa adanya, `cache-control: private, max-age=300`, `vary: cookie`, `x-content-type-options: nosniff` |
| `GET /api/unit/ketuk?berkas=` | `stafOK(P_UNIT_BACA)` | `berkas` di `DATA_UNIT` dengan awalan `usulan_` | - | keputusan terbaru per `usulan_id` untuk berkas itu (`SELECT ... WHERE berkas = ? AND dummy <= ? GROUP BY usulan_id HAVING waktu = max(waktu)`) |
| `POST /api/unit/ketuk` | `modAtauStaf(P_UNIT_TULIS)`, `x-pb: 1`, `tolakOrigin` | badan hanya `berkas`, `usulan_id` (16 heks), `keputusan`, `koreksi` (objek, kunci di daftar medan berkas itu, 2.000 huruf), `catatan` (200 huruf); kunci lain 400 | 300 per jam per staf (`laju(env, "staf:" + id, "unit.ketuk", [[JAM, 300]])`) | 201 baris tersimpan |
| `POST /api/unit/akses` | `modAtauStaf(P_UNIT_TULIS)`, `x-pb: 1` | `titik_id` ada di R2 `unit/akses_putus.json` (dibaca sekali per permintaan), `tgl` tidak lewat hari ini, `status` di tiga nilai | 120 per jam per staf | 201 |
| `POST /api/unit/hibah/:id/lapor` | `modAtauStaf(P_UNIT_TULIS)`, wilayah staf mencakup `prov` baris | `tgl_lapor` tanggal sah, tidak sebelum `tgl_bast`, tidak lewat hari ini | 120 per jam per staf | 200 |
| `POST /api/unit/diklat/unggah` | `modAtauStaf(P_UNIT_TULIS)` (peran `unit`, KA §8) | CSV maksimal 256 KB, 2.000 baris; kolom tetap `program,jenis,tgl_mulai,tgl_selesai,prov,kab,n_peserta,n_lulus,penyelenggara`; baris gagal dikembalikan per nomor baris, tidak ada yang tersimpan bila satu gagal (`DB.batch`) | 10 per hari per staf | 201 `{tersimpan, ulang}` |
| `GET /api/unit/diklat/ringkas` | `stafOK(P_UNIT_BACA)` | - | - | agregat per kab: angkatan dan lulus 5 tahun terakhir |

Impor BAST (PLP-3) tidak lewat rute: `scripts/bnpb/unit/plp3_impor.py` menulis berkas SQL yang diterapkan pemilik dengan `wrangler d1 execute` (pola seed hukum), karena sumbernya lampiran Keputusan Deputi sekali setahun.

Semua jawaban galat lewat `gagal()` (`src/worker.js`), tanpa membocorkan nama berkas R2 kepada tamu.

---

## 5. Sistem F1

Pola keluaran: kecuali disebut lain, tiap sistem menulis satu berkas R2 `unit/<nama>.json` berisi `{dibuat, sumber[], label, basi_jam, kartu: [<skema MB-6>], data: {...}}`, dibaca layar lewat `GET /api/unit/data/<nama>`, dan tampil sebagai kartu di `/bnpb/unit/<kode>`. "Tanpa D1" berarti tidak ada tabel baru dan tidak ada tulis D1.

### 5.1 PERB-1 Pemilih daerah pendampingan IKD

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/perb1.py` (memakai MB-4 untuk urutan) |
| Masukan | `public/data/bnpb/risiko_hvc.json` (`kab[k].H` per jenis, `v`), `ikd.json` (`kab[k].c`, raster kapasitas, proksi), `iku.json` (IKD provinsi resmi Lampiran 2), `terpapar.json` |
| Keluaran | `unit/pendampingan_ikd.json` |
| D1, rute | tanpa D1; rute data saja |
| Layar | `/bnpb/unit/perb`, kartu "25 kab/kota dengan manfaat IRB terbesar per rupiah" |
| Jadwal | bulanan |

Rumus (riset/1 §1.5; rumus RBI di catatan `1-rbi.md` hal. 53, Perka 2/2012 BERLAKU):
- H_k = maks_j H_kj (asumsi: riset tidak menyebut agregasi lintas jenis; ditulis "asumsi" di kartu), V_k = `v`, C_k = `c`.
- R_k(C) = (H_k x V_k x (1 - C))^(1/3).
- d_k = jarak C_k ke ambang kelas berikutnya: 0,40 bila C_k < 0,40; 0,80 bila 0,40 <= C_k < 0,80; 0 bila sudah di atas 0,80 (kab tidak masuk daftar). Ambang 0,40 dan 0,80 dari riset/1 §1.5, tidak berpasal di korpus: `asumsi: true` di MB-2 kunci `ikd_ambang_kelas`.
- Manfaat_k = n_k x [R_k(C_k) - R_k(C_k + d_k)], n_k = 1/514 (bawaan riset/1 pertanyaan 3, rata-rata sederhana).
- `naik_iku2` = benar bila C_k + d_k melewati 0,40 dan IKD provinsinya di Lampiran 2 di bawah 0,40 (ditampilkan sebagai kolom, bukan bonus angka, karena riset tidak menetapkan nilai B).
- Biaya proksi = jarak garis lurus pusat kab ke Jakarta (km) dari `public/data/bnpb/wilayah.json` + koordinat pusat kab yang sudah dipakai pipeline; urut menurun Manfaat_k / Biaya_k.

Skema `data`:

```json
{"n_kab": 514, "ambang_kelas": [0.4, 0.8], "bobot_irb": "1/514",
 "baris": [{"kab": "3303", "nama": "Purbalingga", "c": 0.463, "d": 0.337, "r_kini": "<R_k(C_k)>", "r_naik": "<R_k(C_k+d_k)>",
            "manfaat": "<n_k x selisih>", "jarak_km": "<km>", "rasio": "<manfaat/jarak>", "naik_iku2": false, "c_label": "proksi_raster"}]}
```

Kartu wajib berlabel `proksi` dan "bukan IRB resmi" selama nilai IKD resmi per kab tidak diberikan (U10). Uji `perb1.py --cek`: kab dengan C di atas 0,80 tidak masuk; Manfaat tidak negatif; dua kab dengan H dan V sama, kab yang C lebih rendah punya d lebih besar.

### 5.2 PUS-1 Rapor walidata Satu Data Bencana

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/pus1.py` (MB-8 `ckan`) |
| Masukan | `organization_list?all_fields=true`, `package_search?rows=1000&start=<n>` (berhalaman sampai habis), daftar 37 data prioritas LAKIP Lampiran 9 diketik sekali ke `scripts/bnpb/unit/data_prioritas.json` (dari `data/kajian-bnpb/pustaka/5-lakip.md` §6) |
| Keluaran | `unit/satu_data.json` |
| D1, rute | tanpa D1 |
| Layar | `/bnpb/unit/pus` (riset menyebut tab di `/pendataan`; KEPUTUSAN-AWAL §6 menaruh semua sistem di `/bnpb/unit/<kode>`, dan kartu ini bisa ditautkan dari `/pendataan`) |
| Jadwal | harian |

Rumus per organisasi CKAN (Perban 1/2023 Pasal 8 huruf b): `n_dataset`; `umur_median_hari` = median (hari ini - `metadata_modified`); `persen_metadata` = persen paket yang empat kolom wajibnya terisi (`notes`, `license_id`, `maintainer`, `frequency`; bawaan riset/1 PUS-1, daftar wajib final ditetapkan walidata); `basi` = paket dengan umur lebih dari 2 x periode `frequency` (paket tanpa `frequency` tidak dinilai basi, dihitung terpisah "tanpa periode"); `persen_prioritas_terbit` = persen dari 37 data prioritas yang cocok judul (normalisasi huruf kecil, kata kunci tertulis di `data_prioritas.json`).

```json
{"organisasi": [{"nama": "perb", "judul": "...", "n_dataset": 0, "umur_median_hari": null, "persen_metadata": null, "basi": 0}],
 "prioritas": {"n": 37, "terbit": "<n>", "rinci": [{"judul": "...", "paket": "<nama paket atau null>"}]},
 "total": {"organisasi": "<n>", "dataset": 515}}
```

Uji `--cek`: paket tanpa `frequency` tidak masuk basi; organisasi 0 dataset muncul dengan nilai `null`, bukan 0.

### 5.3 PD-3 Penyusun pesan peringatan berstandar

| Bagian | Isi |
| --- | --- |
| Fungsi | `pesanStandar(peringatan, konteks)` di `public/ews_tindakan.js` (murni, diimpor `src/ews.js` dan layar) |
| Masukan | peringatan dari rute publik yang sudah ada `GET /api/peringatan/aktif` (`src/peringatan.js:154`, jenis dan tingkat); konteks: `terpapar.json` (jiwa terpapar per kab), `siaga.json` (stok, desa langganan terisolir), kelas bahaya InaRISK di desa terdampak bila ada |
| Keluaran | teks enam baris; tombol "salin pesan WA" dan "unduh kartu PNG" |
| D1, rute | tanpa |
| Layar | `/bnpb/unit/pd` (`public/bnpb/unit/pd3.js`) dan tombol di `/peringatan` dan `/prediksi` bila pemilik setuju (layar publik, keputusan U2) |

Aturan (Perban 2/2024 Pasal 20 ayat (2) dan (4)): tepat enam baris berurutan: jenis potensi bencana termasuk turunannya, tingkatan (Waspada, Siaga, Awas; warna dari Pasal 20 ayat (4)), daya rusak (kelas bahaya InaRISK), potensi jiwa terpapar, prakiraan waktu kejadian, sumber daya. Unsur tanpa data ditulis "belum ada data", tidak dikarang. Tidak ada kirim otomatis ke warga (Perban 4/2022 Pasal 7: keputusan Kepala BNPB atau Kepala Daerah).

Uji `tests/bnpb/unit_pd3.test.mjs`: semua kombinasi jenis x tingkat menghasilkan 6 baris tak kosong; konteks kosong menghasilkan "belum ada data" di baris 3, 4, 6; teks tanpa titik tengah U+00B7.

### 5.4 KS-4 Kalender gladi pra-musim

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ks4.py` (riset menyebut perluasan `siaga.py`; dipisah supaya `siaga.json` publik tidak berubah sifat) |
| Masukan | `siaga.json` (musim bahaya per kab per bulan), `risiko_hvc.json` (bahaya teratas), `dibi_kab_tahun.json` (kejadian terburuk kab) |
| Keluaran | `unit/kalender_gladi.json` |
| Layar | `/bnpb/unit/ks`, kartu "N kab/kota masuk musim bahaya utama dalam 2 bulan; gladi disarankan bulan ini" + unduhan teks kerangka skenario per kab |
| Jadwal | bulanan |

Aturan: `bulan_gladi` = 1-2 bulan sebelum bulan awal musim bahaya utama kab; `bahaya_latih` = jenis dengan R tertinggi di `risiko_hvc.json`; `skenario_strategis` = kejadian DIBI terburuk kab untuk jenis itu (urut meninggal_hilang, lalu mengungsi, lalu rumah_rusak_berat), dasar Perban 2/2023 lampiran (sejarah kejadian terburuk). Gladi Ruang dan Gladi Lapang mengikuti Juklak 4/2026; keluaran hanya kerangka teks, bukan dokumen RGB.

### 5.5 KPOD-2 Jam Aturan

KPOD-2 adalah layar untuk MB-2 (§4.2). Tambahan di luar mesin:

| Bagian | Isi |
| --- | --- |
| Layar | `/bnpb/unit/kpod`, kartu "Jam Aturan: N tenggat berpasal, M asumsi": tabel kunci, nilai, sejak, acuan (tautan ke `/bnpb/hukum` dokumen dan pasal), kutipan, dipakai oleh |
| Masukan | `public/inti/jam_aturan.json` (bukan R2: berisi teks peraturan publik) |
| Perubahan lain | `public/inti/status_pedoman.js`: angka masa status yang tertanam diganti `nilai("masa_status_*")` (14 hari, 1 bulan, 3 bulan; ALGORITMA §3.1) dengan label asumsi |
| Uji | gerbang §4.2 |

### 5.6 KPOD-3 Laporan harian terurai otomatis dari PDF di WA

| Bagian | Isi |
| --- | --- |
| Jalur | Mac mini: `scripts/wa/otomatis.mjs` entri baru di `LAPORAN` (`otomatis.mjs:29`) "arsip_laphar" yang siap bila `laphar_pdf` hari itu tiba (`src/wa_jenis.js:7, 30`) |
| Langkah | unduh PDF dari R2 `wa/...` (fungsi `ambilBahan`), `pdftotext -layout`, `node scripts/umum/laphar_arsip.mjs --hari YYYY-MM-DD` (mode satu hari baru), simpan `data/raw/laphar/hari/YYYY-MM-DD.json` (gitignored), `python3 scripts/umum/laphar_arsip.py` menulis ulang `public/data/laphar_riwayat.json` |
| Medan baru | `pendampingan` (teks medan "Pendampingan BNPB" dari pengurai `public/laporan_urai.js`), disimpan per episode sebagai kelas kata kunci, bukan teks penuh (§6.13) |
| Keluaran | `public/data/laphar_riwayat.json` (sudah publik, agregat, tetap tanpa nama petugas) + R2 `unit/usulan_laphar.json` untuk baris yang ragu |
| Commit | lewat jalur commit yang sudah dipakai `otomatis.mjs` untuk generator lain |
| D1 | `unit_ketuk` hanya untuk baris ragu |
| Layar | `/bnpb/unit/kpod` kartu "Laphar terurai sampai <tanggal>, N hari bolong" dari `cakupan.sampai` dan `cakupan.tanpa_pdf` |

Ukuran berhasil yang diukur mesin: `cakupan.sampai` tidak tertinggal lebih dari 1 hari (riset/3 A3). Uji: `node --test tests/wa/` kasus baru "laphar_pdf tiba -> arsip_laphar siap"; `laphar_arsip.mjs --hari` pada satu PDF contoh tersimpan di `tests/wa/fixtures/` (PDF contoh dibersihkan dari nama petugas sebelum masuk repo).

### 5.7 PLP-1 Neraca stok penyangga 514 kab/kota

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/plp1.py` (MB-5), versi S tanpa stok dulu; pembaca INALOGPAL (`inalogpal.py` di MB-8) menyusul |
| Masukan | `terpapar.json` (`n`, `b`, `l`, `h[bahaya]` = [jiwa sedang+, rentan sedang+, jiwa tinggi, rentan tinggi], `scripts/bnpb/terpapar.py:16`), `dibi_kab_tahun.json` (`mengungsi`), stok: `Api/gudang_sumbar` INALOGPAL, meja `gudang` bila terisi |
| Keluaran | `unit/stok_penyangga.json` |
| Layar | `/bnpb/unit/plp`, kartu "N kab/kota belum punya data stok untuk 72 jam pertama" |
| Jadwal | bulanan (kebutuhan); harian untuk stok INALOGPAL bila U4 mengizinkan |

Rumus (Perka 23/2014 Pasal 11-14; Perka 7/2008):
- JP = `n` (Dukcapil). H = 3 hari (`stok_minimal_jam` / 24).
- Tiga skenario PR: 1% (Pasal 12), 4% (Pasal 14), PR_risiko = clamp(maks_bahaya h[bahaya][2] / n, 1%, 4%) berlabel asumsi.
- paket_pangan = JP x PR x H (orang-hari); paket_sandang = paket_papan = JP x PR x H / 4 (bacaan harfiah Pasal 11, berlabel; bacaan "per keluarga tanpa hari" = JP x PR / 4 tampil sebagai kolom kedua, bawaan riset/4 Q3).
- beras kg = paket_pangan x 0,4; air minum l = paket_pangan x 2,5; tambahan balita = PR x b x H.
- celah = max(0, kebutuhan - stok); stok kosong = `belum_dilaporkan`.
- Uji balik per kab: rasio maksimum tahunan mengungsi / n dari DIBI 2015-2025, dipangkas di persentil 99 (riset/4 P1: maks 258,5% menunjukkan pengungsi terhitung berulang); kab yang pernah melewati 1% ditandai calon PR 4%.

Contoh hitungan untuk Kab. Purbalingga (3303, n = 1.057.750, b = 70.551): PR 1%: paket_pangan = 1.057.750 x 0,01 x 3 = 31.732,5 orang-hari; beras = 12.693 kg; air minum = 79.331 liter; sandang (harfiah) = 7.933 paket; tambahan balita = 0,01 x 70.551 x 3 = 2.117 orang-hari.

```json
{"kab": [{"kode": "3303", "nama": "Purbalingga", "jp": 1057750,
          "skenario": {"pr1": {"pangan": 31732.5, "beras_kg": 12693, "air_minum_l": 79331, "sandang_harfiah": 7933, "sandang_keluarga": 2644, "balita": 2117},
                       "pr4": {}, "pr_risiko": {"pr": "<0,01..0,04>"}},
          "stok": null, "status": "belum_dilaporkan",
          "uji_balik": {"rasio_maks": "<0..1>", "tahun": "<tahun>", "lewat_1pct": false}}],
 "uji_balik_nasional": {"kab_tahun": 5654, "lewat_1pct": 209, "lewat_4pct": 85, "p95": 0.0058, "p99": 0.071}}
```

`plp1.py --cek` menghitung ulang contoh Purbalingga di atas sebagai `assert`.

### 5.8 RRX-1 Jam pascabencana per kab

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/rrx1.py` |
| Masukan | `public/data/status_darurat.json` (`sk[]`: `kab_kode`, `status`, `mulai`, `berakhir`, `perpanjangan`), `public/data/dibi_kejadian.json` (RB, RS, RR, jembatan dalam rentang SK), meja `rehab` (centang staf `tgl_r3p`, `tgl_usulan`) lewat satu `wrangler d1 execute` harian: `SELECT prov, kab, data, status FROM meja_catatan WHERE meja = 'rehab' AND dummy = 0` |
| Keluaran | `unit/jam_pascabencana.json` |
| D1 | tanpa tabel baru; meja `rehab` sesudah F0-3 dengan kolom data baru `tgl_r3p` (tanggal, opsional, `maks: "hariini"`) |
| Layar | `/bnpb/unit/rrx`; tombol "catat R3P" membuka isian meja `rehab` dengan `kejadian_ref` dan wilayah terisi |
| Jadwal | harian, sesudah `saran_status.py` di `data.yml` |

Aturan (Perban 5/2017 Pasal 2 ayat (2) dan (3), MB-2 `r3p`):
- Hari-0 = `mulai` SK pertama berstatus tanggap darurat untuk (kab, jenis); SK berurutan berjarak <= 14 hari digabung (pola `perpanjangan` yang sudah ada di `status_darurat.json`).
- Sisa = 90 - (hari ini - hari-0). Kelas: hijau > 30, kuning 1-30, merah <= 0 tanpa `tgl_r3p` tercatat.
- Layak didampingi bila RB + RS dari DIBI dalam rentang SK >= 100 rumah atau jembatan >= 1 (ambang internal, riset/5 D1).
- Beban stimulan kasar = RB x 60 + RS x 30 + RR x 15 (juta rupiah), tarif satu konstanta berlabel "tarif menurut rilis 2023-2024" (riset/5 pertanyaan 4); urutan prioritas menurut beban.
- `kejadian_ref` = nomor SK pertama; dipakai menautkan catatan meja `rehab`.

```json
{"kejadian": [{"kejadian_ref": "<nomor SK>", "prov": "11", "kab": "1116", "jenis": "banjir", "hari0": "2026-01-01",
               "sk": ["<nomor>", "<nomor>"], "sisa_hari": -218, "kelas": "merah", "r3p": null,
               "dibi": {"rb": 12358, "rs": 17028, "rr": 39793, "jembatan": "<n>"}, "beban_juta": "<n>", "layak": true}]}
```

(Angka RB, RS, RR contoh di atas adalah puncak episode Laphar Aceh Tamiang di `laphar_riwayat.json`; skrip memakai DIBI, bukan Laphar.)

### 5.9 RRP-3 Kalkulator Jitupasna permukiman

| Bagian | Isi |
| --- | --- |
| Fungsi | `public/bnpb/unit/rrp3.js` murni: `kerusakan(unit, harga)`, `kebutuhan(unit, satuan, ikk)`, `periksaGanda(huntap, stimulan_rb, rb_terverifikasi)` |
| Masukan | unit dari RRP-1 bila ada (otomatis), selain itu isian di layar; IKK BPS per kab dari `unit/ikk.json` (`scripts/bnpb/unit/ikk.py`, pola `scripts/bnpb/puso.py`, `BPS_KEY`) |
| Keluaran | unduhan CSV kolom formulir lampiran 7 Perka 15/2011; tidak ada simpan server |
| Jadwal | `ikk.py` tahunan (`--bulanan` di bulan Januari) |

Rumus (Perka 15/2011 hlm. 40, 41, 47): kerusakan = Σ_t unit_t x harga_t untuk t di {RB, RS, RR}; kebutuhan = Σ_t unit_t x satuan_t x IKK_kab / 100; tanda ganda bila huntap + stimulan RB > RB terverifikasi. IKK kab kosong memakai IKK provinsi dengan label. Uji `tests/bnpb/unit_rrp3.test.mjs`.

### 5.10 RRS-3 Daftar fasilitas sosial rusak

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/rrs3.py` |
| Masukan | fasilitas: `public/data/osm_nasional/<prov>.json` kunci `sekolah`, `puskesmas`, `rs`, `klinik`, `ibadah_n` ([lat, lon, nama]); jejak bahaya: `public/banjir/data/kejadian_aktif_geo.json`, `public/gempa/data/model_guncangan.json` (MMI >= VII), `public/longsor/data/kejadian.json`; pembanding `dibi_kejadian.json` (`f_pendidikan`) |
| Keluaran | `unit/fasilitas_sosial.json` |
| Layar | `/bnpb/unit/rrs`, kartu per kejadian: fasilitas di dalam jejak, urut jenis |
| Jadwal | harian (kejadian aktif) |

Riset/5 S3 memakai Dapodik; Dapodik belum diuji untuk dipanen dan berisiko menolak panen massal, jadi F1 memakai OSM yang sudah ada di repo dan menandai "cakupan OSM, batas bawah". Selisih jumlah sekolah dalam jejak lawan `f_pendidikan` DIBI kab ditampilkan sebagai tanda pendataan, bukan koreksi.

### 5.11 REN-1 Rapor Reformasi Birokrasi

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ren1.py` |
| Masukan | `data/kajian-bnpb/pustaka/5-lakip.md` baris komponen nilai RB 2024 (surat KemenPANRB B/793/RB.06/2025), pola regex `(?P<nama>[^;:]+?) (?P<nilai>[\d.,]+) \((?P<tertimbang>[\d,]+) dari (?P<bobot>[\d,]+)` |
| Keluaran | `unit/rb.json` |
| Layar | `/bnpb/unit/ren`, kartu "Poin RB yang hilang: X dari 100" |
| Jadwal | harian (berkas statis; berubah saat catatan LAKIP diperbarui) |

Rumus (riset/6 P1): poin_hilang = bobot - nilai_tertimbang; prioritas = poin_hilang x faktor kemudahan (1 untuk komponen yang cukup dikejar dengan ikut pengukuran: Indeks Kualitas Kebijakan dan Indeks Reformasi Hukum; 0,5 perubahan proses; 0,25 struktural; pemetaan komponen ke faktor ditulis di skrip dan berlabel "penilaian analis"). Pemilik komponen dari peta unit Renstra hal. 68 dan 119-139 (ditulis sekali di skrip). `--cek`: jumlah komponen terurai = 22; jumlah bobot sama dengan yang tertulis; Tata Kelola Pengadaan terurai 0,44 dari 2.

Riset/6 mengusulkan blok `rb` di `iku.py` (publik). Dokumen ini menaruhnya di R2 untuk konsisten dengan prinsip 5; data sumbernya memang publik (LAKIP), jadi pemindahan ke `/kinerja-bnpb` publik cukup satu keputusan pemilik.

### 5.12 REN-3 Kalender monev dan tenggat pelaporan

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ren3.py` |
| Masukan | MB-2 entri ber-`jenis: "tenggat"` dan berulang (`ews_evaluasi`, `destana_evaluasi`, `tlhp`, `laporan_pelatihan`, `hibah_rr_lapor`, `klaster_logistik_mutakhir`, `rpbd_monev`, `ews_rapat_platform`) |
| Keluaran | `unit/kalender_monev.json`: 12 bulan ke depan, per entri tanggal jatuh tempo, unit pemilik, acuan |
| Layar | `/bnpb/unit/ren`, kalender kartu |
| D1, WA | tanpa; pengingat WA lewat `wa_antre` hanya bila pemilik setuju (U11) |
| Jadwal | bulanan |

Tenggat yang bergantung pada peristiwa (TLHP 60 hari sejak LHP) ditampilkan sebagai aturan, bukan tanggal, karena tanggal peristiwanya tidak ada di sistem kita.

### 5.13 KEU-1 Penguji konsistensi angka LAKIP dan LK

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/keu1.py`, dijalankan lokal oleh pemilik: `python3 -I scripts/bnpb/unit/keu1.py <draf.pdf> > <di luar repo>/selisih.md` |
| Masukan | draf LAKIP atau LK (PDF, `pdftotext -layout` seperti `hukum.py`) |
| Keluaran | markdown daftar selisih dengan halaman; TIDAK ditulis ke repo, R2, atau D1 |
| Layar | tidak ada; kartu `/bnpb/unit/keu` hanya menjelaskan cara pakai |

Aturan (riset/6 K1): (a) jumlah baris = total; (b) persen dihitung ulang dari pagu dan realisasi, toleransi 0,01 poin; (c) angka yang sama di dua tabel identik; (d) basis persen (pagu total atau pagu efektif) disebut. `--cek` memakai tujuh selisih yang sudah tercatat di `5-lakip.md` bagian 7 sebagai kasus uji (contoh: Biro Keuangan 72,34% lawan hitung ulang 95,69%).

### 5.14 HUK-1 Pemeriksa status peraturan

HUK-1 adalah tampilan MB-1 (§4.1) dan perbaikan F0-1 (§3.1).

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/huk1.py` (dari `katalog.json`, tanpa jaringan) |
| Keluaran | `unit/status_peraturan.json` (§4.1) |
| Layar | `/bnpb/unit/huk`, kartu "13 peraturan tertulis BERLAKU di JDIH padahal dicabut menurut teksnya" + tautan ke `/bnpb/hukum`; unduhan CSV untuk diteruskan pemilik ke pengelola JDIH (U7) |
| Jadwal | harian |

### 5.15 JF-1 Kamus kompetensi terstruktur

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/jf1.py` |
| Masukan | segmen dokumen `perban-5-2024` dari `data/hukum/seed.sql` (di git; `data/raw/hukum/teks/perban-nomor-5-tahun-2024.json` mutu 0,999 dipakai bila ada di mesin lokal) |
| Keluaran | `unit/kompetensi.json` |
| Layar | `/bnpb/unit/jf` (`public/bnpb/unit/jf1.js`): cari kompetensi, lihat level 1-5 dan indikatornya, jenjang minimum |
| Jadwal | harian (murah; berubah hanya bila seed berubah) |

Aturan (riset/6 J1): pengurai kode `PB\.(\d{2})` menghasilkan nama, definisi, jenis (umum atau khusus), level 1-5 dengan indikator perilaku. Pemetaan jenjang ke level minimum bawaan (berlabel "bawaan, menunggu standar kompetensi PermenPANRB"): Ahli Pertama 2, Muda 3, Madya 4, Utama 5; Pranata Pemula 1, Terampil 2, Mahir 3, Penyelia 4. `--cek`: 58 kode terurai, tiap kode tepat 5 level. Kartu tambahan: kewajiban 20 JP per tahun (MB-2 `jf_jp_tahun`).

---

## 6. Sistem F2

### 6.1 PERB-2 Perkiraan berjalan kerugian ekonomi langsung

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/perb2.py` |
| Masukan | `dibi_kab_tahun.json` (rumah rusak berat; kolom rusak sedang dan ringan perlu ditambah di `scripts/banjir/kejadian.py`, pemilik `banjir`), `dibi_kejadian.json` (RB, RS, RR 365 hari), PDRB kab dan PDB nasional BPS (`scripts/bnpb/bps.py`, `BPS_KEY`) |
| Keluaran | `unit/kerugian.json` |
| Layar | `/bnpb/unit/perb` kartu "Kerugian rumah tahun berjalan" |
| Jadwal | bulanan |

Rumus (riset/1 PERB-2): kerugian_k,t = Σ_jenis (RB x c_rb + RS x c_rs + RR x c_rr); c = biaya satuan (bawaan riset/1 pertanyaan 2: dana stimulan rumah 60/30/15 juta, disebut sumbernya); proporsi = Σ kerugian / PDB. Gerbang jujur: hitung tahun 2025 dan bandingkan dengan angka resmi LAKIP Rp51,3 triliun; bila selisih lebih dari 30%, kartu menampilkan "belum layak" dan tidak menampilkan angka rupiah. Label: batas bawah (kerugian non-rumah tidak tertangkap).

### 6.2 PSPB-1 Register status RPBD 552 pemda

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/pspb1.py` (MB-3) |
| Masukan | `unit/jdih_daerah.json` jenis `rpbd`; koreksi staf dari `unit_ketuk` berkas `usulan_rpbd` |
| Keluaran | `unit/rpbd.json`, `unit/usulan_rpbd.json` |
| D1 | `unit_ketuk` saja |
| Layar | `/bnpb/unit/pspb` kartu "N dari 552 pemda punya RPBD berlaku menurut JDIH" + daftar koreksi |
| Jadwal | mingguan, mengikuti MB-3 (KA §8) |

Aturan (riset/1 PSPB-1; Perban 3/2026): status per pemda = `berlaku` (periode mencakup tahun ini), `habis`, `tidak_ditemukan`, `sesuai_3_2026` (ditetapkan sesudah 6 Okt 2026). Tanpa periode di judul: penetapan + 5 tahun bertanda `diduga`. Persen = berlaku / 552, dipisah prov (38) dan kab/kota (514). `tidak_ditemukan` berlabel "tidak terbit di JDIH, belum tentu tidak punya".

Menyimpang dari riset: riset/1 mengusulkan jenis meja `rpbd` di `src/meja_spek.js`. Menambah meja mengubah CHECK `meja IN (...)` di `meja_catatan`, `meja_petugas_sah`, dan `meja_ringkas` (`0026_meja.sql:20, 29, 132`), yang berarti bangun ulang tabel kedua sesudah 0110. Koreksi status RPBD adalah koreksi atas usulan mesin, jadi cukup `unit_ketuk` dengan `keputusan: "koreksi"` dan `koreksi: {status, periode, url}`. Riset juga mengusulkan `/api/v1/data/rpbd` publik; ditunda sesuai U2.

### 6.3 PSPB-3 Rapor indikator Sendai dan SDGs 11.b

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/pspb3.py` |
| Masukan | `dibi_kab_tahun.json`, penduduk dari `terpapar.json` (`n`), `unit/kerugian.json` (PERB-2), `unit/rpbd.json` (PSPB-1) |
| Keluaran | `unit/sendai.json` |
| Jadwal | bulanan |

Rumus (definisi UNDRR, riset/1 PSPB-3): A-1 = (meninggal + hilang) per 100.000 penduduk, rata-rata bergulir 10 tahun; B-1 = terdampak per 100.000; C-1 dari PERB-2 (kosong bila PERB-2 "belum layak"); E-1/E-2 dari PSPB-1. Penduduk Dukcapil tahun terakhir dipakai untuk semua tahun (berlabel). Definisi "terdampak" DIBI beda dengan UNDRR, ditulis di `title` kolom.

### 6.4 SPB-1 Peta NSPK per fase dan jenis bencana

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/spb1.py` (MB-1) |
| Masukan | `katalog.json` (`dok`, `subjek`, `relasi`, `konflik`); target Renstra Lampiran III diketik sekali ke `scripts/bnpb/unit/renstra_nspk.json` (tabelnya rusak di pdftotext, riset/1 SPB-1) |
| Keluaran | `unit/peta_nspk.json` |
| Layar | `/bnpb/unit/spb` matriks fase (pra, darurat, pasca) x jenis bencana, isi = jumlah dokumen berlaku menurut teks; daftar target Renstra lewat tahun |
| Jadwal | harian |

Aturan: fase dan jenis bencana per dokumen dari kamus kata kunci judul dan subjek (tertulis di skrip, bisa dikoreksi lewat `unit_ketuk` berkas `usulan_nspk`); dokumen di `konflik` dihitung sebagai tidak berlaku; target Renstra "terbit" bila ada dokumen BERLAKU yang judulnya cocok dan tahunnya >= tahun target - 1.

### 6.5 PUS-2 Usulan KIB 16 digit dan pencocok logbook ke DIBI

| Bagian | Isi |
| --- | --- |
| Fungsi | `kib(prov, kab, jenis, tanggal, indeks)` murni di `src/pusdalops_umum.js` (diuji node:test, kasus tetap Bogor 19 Sep 2023 = `3201101202309191`, Juknis 7/2023 hal. 7-8) |
| Skrip | `scripts/bnpb/unit/pus2.py` |
| Masukan | `logbook_kejadian` + `logbook_entri` (D1, `0088`, `0091`) lewat satu `wrangler d1 execute` harian (kolom wilayah, jenis, tanggal, angka dampak terakhir; tanpa teks bebas), `public/data/logbook_riwayat.json`, DIBI (`dibi_kejadian.json`), `wilayah.json` |
| Keluaran | `unit/kib_cocok.json` (agregat, tanpa teks bebas) + ekspor CSV per kolom Juknis "Daftar Data" |
| D1 | menyimpang dari riset: kolom `kib` di `logbook_kejadian` TIDAK ditambah. `0094_logbook_juklak.sql:2` mencatat bahwa `ALTER TABLE ADD COLUMN` tidak idempoten dan medan baru logbook tinggal di tabel samping; dan KIB usulan bisa dihitung ulang kapan saja dari kolom yang ada, jadi ia hitungan, bukan isian |
| Layar | `/bnpb/unit/pus` kartu "N kejadian logbook memenuhi ambang tetapi belum ada di DIBI sesudah 7 hari" |
| Jadwal | harian |

Aturan (riset/1 PUS-2; Juknis 7/2023): KIB_usulan = prov(2) + kab(2) + kode bencana (banjir 101, longsor 102, cuaca 104, kekeringan 105, karhutla 106, gempabumi 107, gunungapi 109, kebakaran permukiman 202, konflik sosial 301; jenis lain tanpa kode) + tanggal mulai (8) + indeks 1-9 untuk kejadian sejenis di kab dan hari yang sama. Ambang kejadian: minimal satu dari 1 meninggal, 50 orang terdampak/luka/mengungsi, 5 rumah atau fasilitas rusak, 1 hektar lahan, permintaan bantuan nasional, penetapan status. Cocok ke DIBI bila 15 digit pertama sama dengan toleransi tanggal plus minus 2 hari. Tiga daftar: cocok, logbook tanpa DIBI (lewat 7 hari), DIBI tanpa logbook. Selalu berlabel "KIB usulan".

### 6.6 PD-1 Rapor peringatan dini, laporan 4-bulanan

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/prediksi/rapor_peringatan.py` (pemilik `prediksi`, sesuai riset/2) |
| Masukan | D1 `peringatan` (`0010`) lewat satu `wrangler d1 execute` harian (jenis, tingkat, kab, mulai, berlaku_hingga); kejadian dari `logbook_riwayat.json` dan `dibi_kejadian.json` |
| Keluaran | `unit/rapor_peringatan.json` (bukan `public/prediksi/data/`, karena prinsip 5) |
| D1 | tanpa tabel baru. `ews_umpan` dan rute `POST /api/ews/umpan` ditunda sampai U11 (WA ke BPBD) terjawab |
| Layar | `/bnpb/unit/pd` kartu per jenis bahaya x tingkat; unduhan laporan 4-bulanan (teks templat) |
| Jadwal | harian; rekap 4-bulanan (Januari-April, Mei-Agustus, September-Desember) sesuai MB-2 `ews_evaluasi` |

Rumus (Perban 2/2024 Pasal 23, 28 ayat (4)): untuk peringatan p di kab k, jendela [mulai p, berlaku_hingga p + 24 jam]: hit = ada kejadian e di k; palsu = tidak ada e; terlewat = e tanpa p dalam 72 jam sebelumnya. POD = hit / (hit + terlewat); FAR = palsu / (hit + palsu), per jenis per tingkat. Tanpa umpan BPBD, "palsu" bisa terlalu tinggi karena logbook bukan daftar kejadian lengkap; kartu menulis keterbatasan itu di `title`.

### 6.7 PD-2 Peta cakupan layanan peringatan dini

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/pd2.py` |
| Masukan | `public/data/bnpb/desa/*.json` + `terpapar.json` (penduduk desa terpapar kelas tinggi), titik instrumen: OSM `emergency=siren` (tambahan tag di `scripts/scrape/tarik_osm.py fasilitas`, pemilik `pipa-data`), alat di D1 `sensor` (`0089`) bila ada; daftar penerima paket dari direktorat bila U10 berubah |
| Keluaran | `unit/cakupan_ews.json` |
| Layar | `/bnpb/unit/pd` peta desa terlayani/tidak (pola gambar SVG `public/bnpb/risiko.js`) + daftar usulan lokasi paket |
| Jadwal | bulanan |

Aturan (riset/2 PD-2): desa terlayani bila jarak pusat desa ke instrumen terdekat <= r (bawaan 2 km sirine, `asumsi: true` di MB-2 kunci `ews_radius_sirine_km`, berlabel hipotesis). Cakupan = Σ penduduk desa terpapar tinggi terlayani / Σ penduduk desa terpapar tinggi, per bahaya per kab. Prioritas paket = penduduk terpapar tak terlayani x frekuensi kejadian DIBI kab / kapasitas `ikd.json` (lewat MB-4). Angka kita dibandingkan 6% Renstra, selisih ditulis. Label "batas bawah dari OSM".

### 6.8 KS-1 Pemantau dokumen kesiapsiagaan daerah

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ks1.py` (MB-3) |
| Masukan | `unit/jdih_daerah.json` jenis `renkon`, `rpkb`, `rencana_aksi`; kejadian berstatus dari `status_darurat.json` (untuk RPKB perlu mutakhir); `risiko_hvc.json` (bahaya utama) |
| Keluaran | `unit/dokumen_siaga.json`, `unit/usulan_dokumen_siaga.json` |
| D1 | `unit_ketuk`; staf yang ingin mencatat renkon di meja `renkon` memakai tombol "salin ke Meja Kerja" yang membuka isian meja terisi |
| Layar | `/bnpb/unit/ks` kartu "N daerah punya renkon berlaku menurut JDIH" (pembanding IKK 4,27%) |
| Jadwal | mingguan, mengikuti MB-3 (KA §8) |

Aturan (Perban 2/2023 Pasal 21; Perban 9/2025 Pasal 26 ayat (2) huruf c): status per (daerah, bahaya) = `berlaku` (tgl_tetap + 3 tahun > hari ini), `segera_habis` (<= 90 hari), `kedaluwarsa`, `perlu_reviu` (> 6 bulan sejak penetapan, karena reviu tidak terlihat di JDIH); RPKB `perlu_mutakhir` bila sejak penetapan ada SK status darurat di daerah itu. Tenggat dari MB-2. Label "batas bawah: renkon yang ditetapkan lewat SK tidak terbit di JDIH".

### 6.9 KS-3 Kesenjangan lokasi evakuasi

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ks3.py` |
| Masukan | `public/data/osm_nasional/<prov>.json` (`titik_kumpul`, `sekolah`, `ibadah_n`, `pemerintahan`), `terpapar.json` + `desa/*.json`, zona bahaya yang sudah dipakai `terpapar.py` |
| Keluaran | `unit/evakuasi.json` |
| Layar | `/bnpb/unit/ks` daftar desa `kurang` + kandidat bangunan terdekat |
| Jadwal | bulanan |

Aturan (riset/2 KS-3): untuk desa terpapar tinggi, jarak pusat desa ke kandidat terdekat di luar zona bahaya; `kurang` bila > d_bahaya (tsunami 1 km, `asumsi: true`, perlu dicek ke pedoman TES; banjir dan erupsi parameter terpisah, bawaan 2 km berlabel asumsi). Kandidat tidak pernah disebut "lokasi evakuasi resmi". Cakupan OSM per kab (jumlah fasilitas per 10.000 penduduk) ditampilkan supaya kab dengan OSM tipis terbaca.

### 6.10 MT-1 Penyusun dan pra-telaah usulan Dana Bersama prabencana

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/mt1.py` (sekali, lalu bila juklak berubah) |
| Masukan | Lampiran I Juklak 4/2025 (kode 02.01.01-02.01.11 + kelas risiko ESMS), standar komponen biaya Juklak 2/2026 (278 halaman), `risiko_hvc.json`, `ikd.json`, `unit/dokumen_siaga.json` (KS-1), `unit/rpbd.json` (PSPB-1) |
| Keluaran | `unit/dana_bersama_katalog.json` |
| D1 | tanpa (tahap 1, riset/2 MT-1) |
| Layar | `/bnpb/unit/mt` (`public/bnpb/unit/mt1.js`): isian di peramban, ekspor PDF/Excel, tidak tersimpan di server |
| Jadwal | statis |

Aturan (riset/2 MT-1): skor prioritas usulan = 1 (sesuai RPB/RKPD, dicentang pemohon dengan tautan; pra-isi dari PSPB-1) + 1 (kab di kuartil atas risiko kita, berlabel "bukan IRBI resmi") + 1 (kegiatan termasuk subkegiatan SPM); kelas ESMS otomatis dari kode kegiatan; RAB = komponen x volume x harga satuan Juklak 2/2026, menandai komponen di atas standar; tolak bila lebih dari satu keluaran (Juklak 4/2025 Bab III C). Riset menilai L karena ekstraksi tabel 278 halaman; katalog menulis M. Bila ekstraksi standar biaya tidak selesai dalam satu tiket, versi pertama memuat kode kegiatan dan ESMS saja (lihat §10).

### 6.11 MT-2 Daerah prioritas mitigasi dan paket kegiatan

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/mt2.py` (MB-4) |
| Masukan | `risiko_hvc.json`, `dibi_kab_tahun.json`, `ikd.json`, keluaran modul bahaya (banjir, longsor, `public/pesisir` abrasi, kekeringan), kode kegiatan dari `dana_bersama_katalog.json` |
| Keluaran | `unit/mitigasi_prioritas.json` |
| Jadwal | bulanan |

Aturan (riset/2 MT-2): kab prioritas = kuartil atas S MB-4 atas risiko, celah kapasitas, dan kejadian (ALGORITMA §5.5 baris MT-2); pemetaan bahaya ke kegiatan tetap di `scripts/bnpb/unit/mitigasi_peta.json`: banjir -> 02.01.09 dan 02.01.07; longsor -> 02.01.10, dan 02.01.11 bila desa kelas tinggi berulang; abrasi -> 02.01.07 (mangrove). Tiap kab 1-3 kegiatan urut skor. Label "usulan analis, bukan rekomendasi resmi".

### 6.12 MT-3 Kalender kampanye dan sasaran edukasi per kab

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/mt3.py` |
| Masukan | `siaga.json` (musim), `terpapar.json` (penduduk dan rentan per desa di zona bahaya), `public/ews_tindakan.js` (pesan tindakan, dibaca lewat `node -e` yang mencetak JSON) |
| Keluaran | `unit/kampanye.json` |
| Jadwal | bulanan |

Aturan (riset/2 MT-3; Juklak 7/2026): tiap bulan, kab yang masuk musim bahaya dalam 1-2 bulan mendapat paket: pesan tindakan bahaya itu, 10 desa dengan penduduk terpapar terbesar, porsi rentan (`h[bahaya][3] / h[bahaya][2]`) untuk memilih saluran (tatap muka bila porsi rentan di atas ambang yang disetel direktorat; bawaan median nasional, berlabel). Riset menyebut porsi lansia dan balita terpisah; `terpapar.json` hanya menyimpan rentan gabungan (balita 0-4 + lansia >= 60, `terpapar.json` `metode`), jadi pemisahan butuh perubahan `terpapar.py` (lihat §10).

### 6.13 KPOD-1 Rapor intervensi status darurat

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/kpod1.py` |
| Masukan | `status_darurat.json`, `laphar_riwayat.json` episode dengan medan `pendampingan` (KPOD-3), meja `dsp` dan `logistik` lewat `wrangler d1 execute` (kosong = komponen dilewati, bukan nol), `public/data/bnpb/dit_wilayah.json` (WIL-1) |
| Keluaran | `unit/rapor_darurat.json` (agregat, tanpa nama) |
| Layar | `/bnpb/unit/kpod` kartu IKU Program 3 per bulan, per direktorat wilayah, per jenis, berdampingan dengan angka resmi LAKIP 100% |
| Jadwal | harian |

Aturan (riset/3 A1): untuk tiap SK s (kab k, mulai t0): `terpantau` = ada episode Laphar di k dengan |mulai - t0| <= 3 hari; `didampingi` = teks pendampingan tidak kosong dan tidak memuat kata tolak (daftar `TOLAK` di skrip: "belum", "tidak ada"); kelas pendampingan dari kata kunci: `dsp` (`/dana siap pakai|DSP|Rp/`), `logistik` (`/logistik|sembako|tenda|selimut/`), `personel` (`/tim|TRC|personel|pendampingan/`), `udara` (`/OMC|heli|water bombing/`); `tepat_waktu` = intervensi pertama <= 3 hari sesudah t0 (MB-2 `dsp_laporan_kejadian`). IKU = SK `didampingi` / SK, per bulan. Gerbang jujur: bila persentase SK berpasangan episode < 80%, kartu menampilkan "penjodohan wilayah belum cukup" alih-alih IKU. Kata kunci diuji pada 50 entri berlabel tangan (`tests/bnpb/fixtures/pendampingan_50.json`, tanpa nama orang) sebelum tampil: `--cek` menegaskan presisi dan recall masing-masing tercetak.

### 6.14 WIL-1 Meja Wilayah

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/wil1.py` |
| Data tetap | `public/data/bnpb/dit_wilayah.json`: 38 provinsi + IKN, tiap provinsi tepat di satu direktorat sesuai Perban 11/2025 Pasal 74, 77, 79A (riset/3 §1); gerbang `tests/bnpb/unit_wil1.test.mjs` (38 + 1 entri, tidak ada provinsi ganda, cocok dengan daftar pasal di berkas) |
| Masukan | `status_darurat.json`, `saran_status.json`, `laphar_riwayat.json` (`status: berjalan`, puncak, pendampingan), `/prediksi` (`public/prediksi/data/`), korban terverifikasi agregat lewat rute yang sudah ada saat staf membuka layar |
| Keluaran | `unit/meja_wilayah.json` (tiga antrean) |
| Layar | `/bnpb/unit/wil` (`public/bnpb/unit/wil1.js`, fungsi urut murni di berkas yang sama, diuji node), pemilih direktorat sebagai deretan pil penuh lebar; teks masa SK lewat `public/inti/status_pedoman.js` dan `public/semua/darurat.js` |
| Jadwal | harian |

Urutan antrean, tertinggi dulu (riset/3 W1): (1) episode berjalan dengan md > 0 atau mengungsi_jiwa >= 1.000 tanpa pendampingan; (2) SK berakhir <= 2 hari dan episode masih berjalan; (3) saran Tanggap Darurat tanpa SK lebih dari 3 hari (MB-2 `dsp_laporan_kejadian`); (4) SK berakhir, DSP cair, SPJ belum, sisa tenggat dari MB-2 `dsp_spj`; (5) prakiraan +1..+3 tingkat tinggi di kab berstatus siaga. Tiap butir membawa alasan satu kalimat dan sumbernya.

```json
{"direktorat": {"wil1": [{"urut": 1, "jenis": "tanpa_pendampingan", "prov": "11", "kab": "1116", "alasan": "...", "sumber": ["laphar_riwayat"], "tenggat": null}],
                "wil2": [], "wil3": []}}
```

Staf berwilayah (`staf.wilayah`) melihat direktorat yang provinsinya beririsan, selain itu ketiganya.

### 6.15 WIL-2 Pengungsi terpilah per tempat pengungsian

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/wil2.py` (rekap harian + panel selisih) |
| Masukan | otomatis: `mengungsi_jiwa` per kab per hari dari `laphar_riwayat.json` (angka pusat); manusia: D1 `pengungsian_*` (WA `#pengungsian` atau isian `/instansi`); pembanding berita lewat `scripts/berita/*.py` (berlabel sekunder) |
| Keluaran | `unit/pengungsian.json` (rekap per kab, tempat < 10 jiwa tidak ditampilkan per tempat) |
| D1 | `migrations/0113_pengungsian.sql` (di bawah) |
| Rute | `src/pengungsian.js`: `POST /api/pengungsian/tempat`, `POST /api/pengungsian/harian`, `GET /api/pengungsian/kab?kab=` (staf dan akun instansi BPBD aktif berwilayah; pola `src/korban.js`) |
| WA | jenis baru `pengungsian` di `src/wa_jenis.js`, pengurai deterministik `#pengungsian <nama tempat> KK <n> L0-11b <n> ...` (pola `public/laporan_urai.js`); pesan yang tidak cocok pola masuk antrean periksa, tidak ditebak. Hanya aktif bila U11 dijawab |
| Layar | `/bnpb/unit/wil` tab pengungsian; isian 11 angka di `public/instansi_*` |
| Jadwal | rekap harian; tulis kapan saja |

```sql
-- 0113: pengungsi terpilah per tempat pengungsian (Juknis 9/2023 hal. 17; Perban 3/2018 Pasal 12). Tanpa nama pengungsi, tanpa kontak koordinator. Idempoten.
CREATE TABLE IF NOT EXISTS pengungsian_tempat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) = 4 AND kab NOT GLOB '*[^0-9]*' AND substr(kab, 1, 2) = prov),
  kec TEXT CHECK (kec IS NULL OR length(kec) BETWEEN 2 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 2 AND 80),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  jenis TEXT NOT NULL CHECK (jenis IN ('massal', 'keluarga', 'mandiri')),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  buka TEXT NOT NULL CHECK (date(buka) IS buka),
  tutup TEXT CHECK (tutup IS NULL OR (date(tutup) IS tutup AND tutup >= buka)),
  kejadian_ref TEXT CHECK (kejadian_ref IS NULL OR length(kejadian_ref) <= 80),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS pengungsian_tempat_kab ON pengungsian_tempat (prov, kab, buka);
CREATE UNIQUE INDEX IF NOT EXISTS pengungsian_tempat_unik ON pengungsian_tempat (kab, lower(nama), buka);

CREATE TABLE IF NOT EXISTS pengungsian_harian (
  tempat_id TEXT NOT NULL REFERENCES pengungsian_tempat (id),
  tanggal TEXT NOT NULL CHECK (date(tanggal) IS tanggal),
  kk INTEGER NOT NULL CHECK (kk BETWEEN 0 AND 100000),
  l_0_11b INTEGER NOT NULL DEFAULT 0 CHECK (l_0_11b >= 0), p_0_11b INTEGER NOT NULL DEFAULT 0 CHECK (p_0_11b >= 0),
  l_12_59b INTEGER NOT NULL DEFAULT 0 CHECK (l_12_59b >= 0), p_12_59b INTEGER NOT NULL DEFAULT 0 CHECK (p_12_59b >= 0),
  l_5_12 INTEGER NOT NULL DEFAULT 0 CHECK (l_5_12 >= 0), p_5_12 INTEGER NOT NULL DEFAULT 0 CHECK (p_5_12 >= 0),
  l_13_17 INTEGER NOT NULL DEFAULT 0 CHECK (l_13_17 >= 0), p_13_17 INTEGER NOT NULL DEFAULT 0 CHECK (p_13_17 >= 0),
  l_18_59 INTEGER NOT NULL DEFAULT 0 CHECK (l_18_59 >= 0), p_18_59 INTEGER NOT NULL DEFAULT 0 CHECK (p_18_59 >= 0),
  l_60 INTEGER NOT NULL DEFAULT 0 CHECK (l_60 >= 0), p_60 INTEGER NOT NULL DEFAULT 0 CHECK (p_60 >= 0),
  hamil INTEGER NOT NULL DEFAULT 0 CHECK (hamil >= 0), menyusui INTEGER NOT NULL DEFAULT 0 CHECK (menyusui >= 0),
  disabilitas INTEGER NOT NULL DEFAULT 0 CHECK (disabilitas >= 0), terpisah_ortu INTEGER NOT NULL DEFAULT 0 CHECK (terpisah_ortu >= 0),
  sumber TEXT NOT NULL CHECK (sumber IN ('wa', 'isian')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (l_0_11b + p_0_11b + l_12_59b + p_12_59b + l_5_12 + p_5_12 + l_13_17 + p_13_17 + l_18_59 + p_18_59 + l_60 + p_60 <= 200000),
  PRIMARY KEY (tempat_id, tanggal)
) WITHOUT ROWID;
-- tanggal harian tidak boleh sebelum tempat dibuka atau sesudah ditutup
CREATE TRIGGER IF NOT EXISTS pengungsian_harian_sah BEFORE INSERT ON pengungsian_harian
WHEN NOT EXISTS (SELECT 1 FROM pengungsian_tempat t WHERE t.id = NEW.tempat_id AND NEW.tanggal >= t.buka AND (t.tutup IS NULL OR NEW.tanggal <= t.tutup))
BEGIN SELECT RAISE(ABORT, 'tanggal di luar masa buka tempat pengungsian'); END;
```

Kirim ulang untuk (tempat, tanggal) yang sama menimpa lewat `INSERT ... ON CONFLICT (tempat_id, tanggal) DO UPDATE` di rute (idempoten per hari). Kebutuhan dasar per tempat dihitung di klien dan di `wil2.py` dengan MB-5 (§4.5). Rekap kab = jumlah tempat dengan data <= 2 hari (MB-2 `pengungsi_mutakhir` x 2); tempat lebih tua ditandai basi dan tidak dijumlah. Panel selisih: `selisih = |pusat - daerah| / max(pusat, daerah)`; > 25% merah; sistem tidak memilih angka yang benar.

Rute: validasi semua angka bilangan bulat dalam batas CHECK; `kab` milik wilayah pelaku (`dalamWilayahStaf` atau cakupan akun instansi); `tempat_id` milik kab pelaku; batas laju 200 tulis per jam per pelaku; `GET` agregat per kab di-cache tepi 60 detik untuk staf (`cache-control: private`). Uji TEST.md: `tests/warga/unit_skema.test.mjs` dan `tests/warga/unit_alur.test.mjs` di Miniflare: CHECK jenis, trigger tanggal di luar masa buka DITOLAK lewat SQL langsung, kirim ulang hari yang sama tidak menggandakan baris, akun instansi kab lain ditolak 403, rekap mengabaikan tempat basi. Riset menilai WIL-2 berukuran L; katalog M (lihat §10).

### 6.16 WIL-3 Kaji cepat dua tahap yang drafnya terisi sendiri

| Bagian | Isi |
| --- | --- |
| Rute | `GET /api/meja/kaji_cepat/draf?kab=` di `src/meja.js`: membaca JSON statis saja (`terpapar.json`, `saran_status.json`, `status_darurat.json`, `laphar_riwayat.json` lewat `env.ASSETS`), tanpa D1; staf `P_UNIT_BACA` atau petugas meja berkode |
| Spek | meja `kaji_cepat` menambah status `awal_terkirim` dan `lanjutan_terkirim` |
| D1 | menambah status meja berarti mengubah CHECK status `meja_catatan` dan trigger `meja_catatan_ubah`: bangun ulang tabel kedua. Usulan: WIL-3 dikerjakan dengan memakai ulang pola migrasi 0110 dalam satu migrasi `0114_meja_kaji_dua_tahap.sql` hanya bila dua tahap memang diminta pemilik; bila tidak, cukup dua kolom data `tgl_awal` dan `tgl_lanjutan` dengan tanda dari MB-2 `kaji_awal` dan `kaji_lanjutan` tanpa status baru (tanpa migrasi). Bawaan dokumen ini: tanpa migrasi |
| Layar | tombol "draf kaji cepat" di isian meja; ekspor PDF Format-4 meniru gaya ekspor yang ada |

Aturan draf (riset/3 W3): cakupan wilayah dari laporan + sinyal; penduduk terpapar dari `terpapar.json`; rekomendasi status dari aturan `scripts/umum/saran_status.py` (Siaga bila hanya sinyal, Tanggap bila ada dampak terverifikasi; gempa tidak pernah Siaga); perkiraan masa dari median masa SK sejenis di provinsi itu. Label "saran"; yang menetapkan tetap kepala daerah.

### 6.17 PLP-2 Daftar pendek penerima hibah logpal

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/plp2.py` (MB-4) |
| Masukan | risiko kecamatan banjir agregat ke kab (`public/banjir/data/risiko_kecamatan.json`), `dibi_kab_tahun.json` (kejadian 5 tahun), `public/data/bnpb/kab_prioritas.json`, `unit/stok_penyangga.json` (celah stok PLP-1), standar peralatan Perka 17/2009 per provinsi (diketik sekali ke `scripts/bnpb/unit/standar_peralatan_2009.json`), `ikd.json` (kelembagaan), riwayat hibah (`hibah_bast` bila terisi) |
| Keluaran | `unit/hibah_prioritas.json` |
| Jadwal | bulanan |

Rumus (Juklak 3/2024, tujuh kriteria): skor = MB-4 atas komponen terukur (risiko, kejadian 5 tahun, celah stok, celah peralatan lawan Perka 17/2009, kelembagaan IKD, belum menerima 3 tahun terakhir). "Program prioritas nasional" dan "analisis strategis" tidak diskor; tampil kolom kosong untuk rapat. Bobot sama rata, satu tempat. Label "daftar pendek, keputusan tetap di rapat".

### 6.18 PLP-3 Pengingat kewajiban pasca-hibah dan kedaluwarsa

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/plp3_impor.py` (Excel/CSV lampiran Keputusan Deputi -> berkas SQL `INSERT INTO hibah_bast ... ON CONFLICT (id) DO NOTHING`, id = sha1(tahun, kab, barang, tgl_bast)[:16]; diterapkan pemilik) dan `plp3.py` (rekap harian dari `wrangler d1 execute`) |
| D1 | `hibah_bast` (§2.2) |
| Rute | `POST /api/unit/hibah/:id/lapor` (§4.9) |
| Keluaran | `unit/pasca_hibah.json` |
| Layar | `/bnpb/unit/plp` daftar penerima belum lapor, barang mendekati kedaluwarsa |
| WA | tidak dikirim sampai U11; nomor PIC tidak disimpan di tabel ini |
| Jadwal | harian |

Aturan: laporan penggunaan jatuh tempo 12 bulan setelah BAST (MB-2 `hibah_logpal_lapor`, asumsi); peringatan kedaluwarsa 90 dan 30 hari (internal); status hijau, kuning, merah. Tanpa daftar BAST (U10 bawaan: tidak tersedia), sistem kosong; tiket PLP-3 baru dikerjakan bila pemilik menyerahkan daftar.

### 6.19 OJL-2 Penempatan stok musiman dan menjelang kejadian

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ojl2.py` |
| Masukan | `unit/stok_penyangga.json` (PLP-1), `public/data/bnpb/kalender_operasi.json`, `stok_prapemusim.json`, `/prediksi` (`public/prediksi/data/`), gudang terdekat per kab: tanpa OJL-1 (F3) dipakai jarak garis lurus ke ibu kota provinsi dan gudang yang tercatat di meja `gudang`, berlabel "tanpa graf jalan" |
| Keluaran | `unit/prepositioning.json` |
| Jadwal | harian, sesudah langkah prediksi |

Aturan (riset/4 O2): musiman: target_stok(gudang, bulan) = Σ kab terlayani kebutuhan 72 jam x [bulan dalam musim kab]; saran pindah = selisih antargudang. Jelang kejadian: bila `/prediksi` memberi tingkat tinggi untuk kab dengan jarak ke gudang terdekat lebih dari ambang (bawaan setara 24 jam, berlabel asumsi), saran "kirim paket 72 jam untuk N jiwa", N = min(PR 1% x JP, jiwa terpapar tinggi). Saran, bukan perintah; tiap saran mencatat pemicunya. Pesan WA ke grup staf hanya bila U11.

### 6.20 OJL-3 Rapor Klaster Logistik dari API INALOGPAL

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ojl3.py` (MB-8 `inalogpal`) |
| Masukan | `Api/get_progress`, `Api/get_count_cluster_all`, `Api/get_count_cluster_sk_all`; beban kejadian 5 tahun per provinsi dari DIBI |
| Keluaran | `unit/klaster_logistik.json` |
| Layar | `/bnpb/unit/ojl` kartu "N provinsi ber-SK klaster; capaian e-monev 2026 tertinggi X%"; draf Format-5 triwulan (teks templat, bukan AI) |
| Jadwal | harian |

Aturan (Juklak 16/2025): per provinsi: SK ada atau tidak, capaian pra/darurat/pasca, hari sejak pembaruan, beban kejadian 5 tahun; merah bila beban di sepertiga teratas dan (capaian < 25% atau tanpa SK). Bila bentuk API berubah, skrip gagal keras dan R2 mempertahankan versi terakhir dengan tanggal terlihat. Tidak memanen `get_instansi_survey` (berisiko memuat nama dan kontak anggota; §8).

### 6.21 RRP-1 Neraca rumah rusak per kab

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/rrp1.py` (MB-5, MB-8 `arcgis_*`) |
| Masukan | `dibi_kejadian.json` (L), layer verifikasi ArcGIS per kejadian (V; folder dicari dari `https://gis.bnpb.go.id/server/rest/services?f=json`, pola nama `20xx_<jenis>_<wilayah>`, kolom `verif_rb`, `verif_rs`, `verif_rr`, `verif_tmk`, `total_rumah_verif`), jumlah bangunan per kec dari R2 `bangunan/kec.json` (`bangunan.yml`), tersalur dari `unit_ketuk` RRP-2 dan meja `rehab` |
| Keluaran | `unit/neraca_rumah.json` |
| Kamus | `scripts/bnpb/unit/kamus_layer.json`: per folder kejadian, layanan, lapis, dan pemetaan kolom ke L/V (bentuk layer beda tiap kejadian) |
| Jadwal | harian |

Rumus (riset/5 P1): kemajuan verifikasi = total_verif / L_total (boleh > 1); rasio susut RB = V_RB / L_RB; tanpa V, estimasi dari median rasio susut kejadian sejenis yang punya V (minimal 3 kab pembanding, kalau kurang "belum ada pembanding"); uji masuk akal: L_total kec > 0,8 x bangunan Open Buildings kec ditandai "periksa"; beban stimulan = RB x 60 + RS x 30 + RR x 15 juta, dua kolom (lapor, verifikasi). `--cek` memakai tangkapan layer NTT tersimpan (`scripts/bnpb/unit/fixtures/ntt_2026.json`, agregat kab): RB lapor 25.833, RB verifikasi 6.348, total verifikasi 120.574.

### 6.22 RRP-2 Panen angka pemulihan dari rilis resmi

| Bagian | Isi |
| --- | --- |
| Skrip | leksikon `scripts/berita/pemulihan.py` (pemilik mengikuti `scripts/berita/*`) + `scripts/bnpb/unit/rrp2.py` (MB-7) |
| Masukan | arsip berita `scripts/umum/berita.py` (kueri: huntara, huntap, dana tunggu hunian, stimulan rumah, rekening DTH) |
| Keluaran | `unit/usulan_pemulihan.json` |
| D1 | `unit_ketuk`; baris yang diterima diteruskan ke tracker `pemulihan` (`0096`) lewat rute baru `POST /api/pusdalops/pemulihan/terima` di `src/pemulihan.js` yang memanggil `buat`/`progres` yang sudah ada dengan `catatan` = URL sumber |
| Jadwal | harian |

Ekstraksi: pola "<angka> unit (huntara|huntap)" dan "<angka> (KK|rekening)" + nama kab dari `wilayah.json`; tiap angka menjadi usulan berlabel `sekunder` dengan URL dan tanggal. Presisi diuji dulu pada 30 artikel berlabel tangan (`tests/bnpb/fixtures/pemulihan_30.json`).

### 6.23 RRI-1 Daftar akses putus sampai pulih

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/rri1.py` (MB-8) |
| Masukan | layer `Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13` (341 titik prasarana publik, bukan PDP), DIBI jembatan per kab, OSM jalan dan jembatan (`osm_nasional` kunci `jembatan`; kelas jalan lewat Overpass mingguan bila perlu) |
| Keluaran | `unit/akses_putus.json` (titik ber-`id` stabil = sha1(sumber, objectid)[:16]) |
| D1 | `akses_status` (§2.2), rute `POST /api/unit/akses` |
| Layar | `/bnpb/unit/rri` tabel umur putus + peta titik |
| Jadwal | harian; OSM mingguan |

Aturan (riset/5 I1): titik dari beberapa sumber disatukan bila berjarak <= 200 m dan nama desa sama; kelas pemilik dari OSM terdekat <= 50 m (`trunk`/`primary` atau `ref` nasional -> nasional, `secondary` -> provinsi, lain -> kab/desa; estimasi); umur putus = hari ini - `dt`; status terbaru dari `akses_status`, bawaan `putus`; tanda "aset desa: tidak bisa hibah RR (Perban 4/2024 Pasal 5 huruf e)". Laporan WA "jembatan <nama> dibuka" menjadi usulan `unit_ketuk`, bukan tulis langsung, sampai U11.

### 6.24 RRS-1 Taksiran cepat kerugian pertanian per kab

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/rrs1.py`; kriteria uji dikunci dulu di `scripts/bnpb/unit/lab_kriteria/rrs1.json` (pola `scripts/data/lab_kriteria/`) |
| Masukan | poligon genangan modul banjir (`public/banjir/data/`), sawah dari ESA WorldCover kelas cropland (LBS ATR/BPN bila bisa diunduh), produktivitas dan harga GKP BPS (`BPS_KEY`), `public/data/bnpb/puso.json` untuk kalibrasi |
| Keluaran | `unit/rugi_tani.json` |
| Jadwal | harian selama kejadian banjir aktif |

Rumus (riset/5 S1): kerugian = luas sawah tergenang (ha) x P(puso | genangan >= 7 hari) x produktivitas (ton/ha) x harga GKP. P(puso) dikalibrasi dari `puso.json` terhadap luas genangan tahun yang sama. Bila kalibrasi tidak mengalahkan pembanding rata-rata kab (kriteria terkunci), kartu hanya menampilkan luas tergenang, bukan rupiah. Pemeriksa `validasi-model`.

### 6.25 REN-2 Peta belanja lawan peta risiko dari SIRUP

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/ren2.py` (memakai `docs/pendanaan/sirup_tarik.py` lewat MB-8 `sirup`) |
| Masukan | SIRUP BNPB penyedia dan swakelola (cache `docs/pendanaan/cache/*.json`), `terpapar.json`, `ikd.json` |
| Keluaran | `unit/belanja_risiko.json` |
| Jadwal | bulanan |

Rumus (riset/6 P2): pangsa_belanja_kab = pagu_kab / pagu_total_berlokasi; pangsa_kebutuhan_kab = terpapar_kab x (1 - kapasitas_kab) / Σ; rasio = pangsa_belanja / pangsa_kebutuhan; rasio < 0,5 pada kab 20% teratas kebutuhan = "kurang dilayani". Paket berlokasi pusat dikeluarkan dan dilaporkan terpisah. DSP tidak masuk RUP, dicatat. RUP adalah rencana, bukan realisasi (label).

### 6.26 SDU-1 Rapor tata kelola pengadaan

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/sdu1.py` (pipeline yang sama dipakai IRT-2) |
| Masukan | SIRUP penyedia dan swakelola BNPB; daftar tender publik SPSE BNPB (`https://spse.inaproc.id/bnpb`) bila bisa dibaca |
| Keluaran | `unit/pengadaan.json` (agregat, tanpa nama penyedia) |
| Jadwal | bulanan |

Rumus per tahun anggaran (riset/6 S1): porsi_triwulan1 = paket diumumkan untuk pemilihan Januari-Maret / total; porsi_epurchasing = pagu e-Purchasing / pagu penyedia; porsi_PDN, porsi_UMK dari `isPDN`, `isUMK`; porsi_PenL = pagu Penunjukan Langsung / pagu penyedia; kandidat konsolidasi = kelompok nama paket ternormalisasi (huruf kecil, tanpa angka, lokasi, bulan) dengan >= 3 paket PL/PenL dalam setahun dan jumlah pagu di atas ambang PL (ambang dari Perpres PBJ yang berlaku, dicek sebelum dipakai; sampai dicek, kolom ini `asumsi`). Bahasa: "kandidat konsolidasi", bukan tuduhan.

### 6.27 HUK-2 Pelacak amanat pengaturan turunan

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/huk2.py` (MB-1, membaca segmen dari `data/hukum/seed.sql`) |
| Keluaran | `unit/amanat.json` |
| D1 | tandai manual "terpenuhi" lewat `unit_ketuk` berkas `usulan_amanat` (riset menyebut JSON di repo; `unit_ketuk` dipakai supaya tidak ada commit untuk tiap tanda) |
| Jadwal | harian |

Aturan (riset/6 H2): regex kalimat delegasi per pasal (`ditetapkan oleh Kepala`, `diatur dengan Peraturan Badan`, `diatur lebih lanjut`, `tercantum dalam ... Keputusan`); terpenuhi bila ada dokumen lebih baru yang merujuk pasal itu (`hukum_relasi` jenis `merujuk`) atau judulnya cocok topik amanat (BM25 sederhana pada judul, stdlib); usia amanat sejak `tgl_tetap` dokumen induk. Contoh yang wajib terdeteksi di `--cek`: Perban 4/2025 Pasal 38, 41 ayat (2), 52 ayat (2), 53 ayat (3). Temuan lingkup Inspektorat II (Pasal 106 Perban 6/2025 masih menyebut Pusdalops) tampil sebagai catatan kartu (bawaan riset/6 pertanyaan 9).

### 6.28 IRT-1 Papan umur rekomendasi TLHP per unit

Bawaan U9: data TLHP tidak masuk D1 produksi. Desain F2 karenanya:

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/irt1.py`, dijalankan lokal oleh pemilik atas ekspor SIPTL/SIMHPNAS atau rekap Excel Bagian TU Itama |
| Keluaran | `<di luar repo>/tlhp_<tanggal>.html` (kartu `.ex-std` mandiri, satu berkas) |
| D1, R2, rute | tidak ada |

Rumus (Pedoman 1/2025; MB-2 `tlhp`): umur = hari sejak LHP diterima; merah bila umur > 60 hari dan status bukan "sesuai"; calon TPTD bila umur > 2 tahun dan teks ringkas memuat kata kunci kriteria TPTD (saran, bukan penetapan); %TL unit = sesuai / (total - TPTD) lawan target Renstra (75% BPK; 46% sampai 70% APIP). Bila U9 berubah menjadi ya, tabel `tlhp_rek` dan rute admin dari riset/6 I1 ditambahkan sebagai migrasi baru.

### 6.29 DIK-1 Peta sasaran diklat berbasis risiko

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/dik1.py` (MB-4) |
| Masukan | `terpapar.json`, `ikd.json`, `dibi_kab_tahun.json`, angkatan dari `diklat_angkatan` (`GET /api/unit/diklat/ringkas` dibaca lewat `wrangler d1 execute`) |
| D1 | `diklat_angkatan` (§2.2), unggah CSV `POST /api/unit/diklat/unggah` |
| Keluaran | `unit/diklat_sasaran.json` (agregat kab) |
| Jadwal | bulanan |

Rumus (ALGORITMA §5.5 baris DIK-1, KA §8): skor MB-4 atas risiko, celah kapasitas, dan kejadian (persentil) ditambah celah layanan mutlak `1 - min(alumni_lulus_5thn / sdm_pb_kab, 1)` (`sdm_pb_kab` bawaan 30 orang per BPBD, berlabel, riset/6 pertanyaan 6); bentuk lama `(1 + kejadian)` tidak dipakai; kab diurutkan dan dipilih sampai jumlah kab terlayani mencapai target persen Renstra (78% 2026). Tanpa unggahan, komponen celah layanan tidak ada dan kartu menulis "cakupan belum ada data" (bukan 0).

### 6.30 DIK-4 Bank tenaga pengajar dari direktori pakar

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/dik4.py` memakai pencocok BM25 di `scripts/kemitraan/**` (pemilik `kampus`; diimpor, tidak disalin) |
| Masukan | mata pelatihan dari kurikulum Pusdiklat (berkas e-Tangguh; DNS tidak menjawab saat riset, jadi daftar mata pelatihan diketik dari dokumen yang dimiliki pemilik ke `scripts/bnpb/unit/mata_pelatihan.json`), pakar dari data `/akademisi` dan `/direktori` (R2, staf) |
| Keluaran | `unit/pengajar.json`: per mata pelatihan, 5 calon dengan skor dan tautan profil `/direktori` |
| Aturan | pengecualian yang sama dengan `/direktori` (tanpa orang terkait kasus KPK, tanpa yang sudah meninggal; memori `direktori-tanpa-kasus-kpk`) diterapkan dengan memakai daftar pengecualian yang sudah ada, bukan salinan |
| Jadwal | bulanan |

### 6.31 JF-2 Hitung kebutuhan formasi JF per instansi

| Bagian | Isi |
| --- | --- |
| Skrip | `scripts/bnpb/unit/jf2.py` |
| Masukan | `dibi_kab_tahun.json`, `terpapar.json`, `public/data/bnpb/desa/*` (desa rawan), SK status dan aktivasi posko (`status_darurat.json`), norma waktu bawaan di `scripts/bnpb/unit/norma_waktu.json` (berlabel "bawaan", bisa diubah Pusbin) dan cakupan kegiatan per jenjang dari Lampiran Perban 4/2025 Pasal 12 ayat (3) |
| Keluaran | `unit/formasi_jf.json` (per prov dan kab, per jenjang) |
| Layar | `/bnpb/unit/jf` (`public/bnpb/unit/jf2.js`): pengubah norma waktu di klien, hitung ulang di peramban, ekspor CSV |
| Jadwal | bulanan |

Rumus (pola Analisis Beban Kerja KemenPANRB, riset/6 J2): kebutuhan_jenjang = Σ (volume_kegiatan_tahunan x norma_waktu_jam) / 1.250 jam kerja efektif per tahun. Volume dari proksi: renkon per ancaman dominan, kaji cepat per kejadian, penyuluhan per desa rawan, pendampingan posko per aktivasi. Tanpa tata cara resmi (Pasal 53 ayat (3) belum terbit), angka berlabel "usulan metode".

---

## 7. Sistem F3 dan T

### 7.1 F3 (ringkas)

| ID | Masalah | Data | Rumus inti | Syarat mulai |
| --- | --- | --- | --- | --- |
| PERB-3 | bukti IKD daerah tidak sesuai ketentuan (LAKIP hal. 20, 79) | JDIH daerah (MB-3), PSPB-1, KS-1 | per indikator berbasis dokumen: ditemukan (tautan) / tidak ditemukan / tidak bisa dicek; tidak pernah memberi skor | daftar 71 indikator IKD 2025 resmi; API JDIHN terbukti |
| SPB-2 | interoperabilitas aplikasi BNPB "sangat rendah" | isian `/pendataan` (`pdt_isian`, 0060), CKAN, PUS-3 | graf sistem -> data -> sistem; celah = data diketik ulang di dua sistem atau tanpa penerima | isian `/pendataan` cukup; nama aplikasi terverifikasi URL |
| PUS-3 | tidak ada angka ketersediaan layanan TIK publik | HEAD per 15 menit dari Actions (bukan Worker) | ketersediaan = probe sukses / total; insiden = 2 gagal berturut; 403 bot = "diblokir" | izin pemilik untuk probe; jadwal 15 menit butuh workflow baru (tidak ada yang 15 menit; `titik.yml` 3 jam) |
| PD-4 | konektivitas data K/L tidak tercatat | log tarikan pipeline kita | putus bila umur data > 2 x periode terbit; % jam tersambung per sumber | sebagian sudah ada di `src/sla.js`/`status_riwayat` (0042); tinggal rapor |
| KS-2 | sistem informasi Destana wajib (Perban 7/2025 Pasal 20) tidak ada | daftar Destana direktorat, SNI 8357:2017 | status belum/pratama/madya/utama; penilaian kedaluwarsa > 3 tahun; sasaran = desa terpapar tinggi `belum` | U10 daftar Destana; teks SNI |
| MT-4 | registri rambu (Perban 3/2025) | foto bergeotag `/petugas` atau WA | evaluasi tahunan, status bersih/rusak/pindah | isian lapangan berjalan (pola 0 baris) |
| WIL-4 | DSP tidak disandingkan dengan SK dan dampak | medan pendampingan Laphar (KPOD-3), berita, `status_darurat.json` | DSP tanpa SK dalam +/-7 hari; nilai per jiwa-hari di atas persentil 90 (n >= 10) | U8; internal R2, tanpa nama orang |
| OJL-1 | lokasi gudang belum dihitung dari risiko dan waktu tempuh | graf jalan OSM 38 provinsi (`scripts/scrape/akses.py`, kini 9 provinsi), DIBI, PLP-1 | p-median berkapasitas + cakupan <= 48 jam, greedy + tukar Teitz-Bart | graf nasional (L); daftar gudang berkoordinat (riset/4 Q6) |
| OJL-4 | inventaris `/instansi` hanya kategori karhutla | Perka 17/2009 | kelengkapan lawan standar provinsi | riset/4 Q7 (`/instansi` dibuka untuk semua bencana) |
| RRI-2 | praverifikasi hibah RR manual | lembar usulan pemda, jejak bahaya repo | 5 tanda per baris kegiatan (SK cocok, di dalam jejak <= 2 km, aset desa, nilai > 2 x median, kegiatan terlarang Pasal 5) | staf mau mengunggah; diolah di peramban saja |
| RRI-3 | aset hibah RR tidak dipantau terhadap bahaya baru | ekspor Mapping Aset (Format 15) | silang titik aset dengan paparan harian (`paparan_bangunan.py`) | U10 ekspor Mapping Aset |
| RRS-2 | tidak ada indikator pulih ekonomi | Black Marble VNP46A3, Open Buildings | indeks = radiansi / median 12 bulan pra-kejadian; pulih >= 0,95 tiga bulan berturut; uji plasebo | token Earthdata; lab dengan kriteria terkunci |
| KEU-2 | deviasi RPD per unit | ekspor SAKTI bulanan | deviasi = abs(realisasi_kum - RPD_kum) / RPD_kum; tanda > 5% atau proyeksi < 90% | U9 (bawaan: skrip lokal) |
| SDU-2 | bukti hadir pegawai lapangan untuk tukin | `/petugas` (`lp_absen`, 0097) | hari hadir di lokasi tugas per bulan, agregat | `/petugas` dipakai (tabel `orang` 0 baris) |
| SDU-3 | BMN lawan bahaya | ekspor SIMAK-BMN | skor bahaya per titik | pemilik menginginkan; lokasi aset sensitif |
| IRT-2 | sinyal risiko pengadaan | pipeline SDU-1 | skor kelompok paket: PenL non-darurat +2, berulang di atas ambang PL +2, diumumkan sesudah Oktober +1, swakelola honor besar +1, diubah berulang antarversi +1 | U9; pengecualian kode kegiatan darurat |
| IRT-3 | register risiko triwulanan (Juklak 17/2025) | target dan realisasi indikator | celah = 1 - capaian / target proporsional; kemungkinan 1-5 dari celah; dampak 1-5 dari bobot | SIM Manajemen Risiko resmi belum jelas ada |
| DIK-2 | STTP elektronik mudah dipalsukan | nomor STTP + SHA-256 | cocok hash di klien, tanpa nama terang | keputusan siapa menerbitkan nomor (riset/6 pertanyaan 5) |
| DIK-3 | retensi dan kemanfaatan (Perban 2/2025 Pasal 13) tidak diukur | WA +3 dan +6 bulan | tingkat jawab, skor kemanfaatan per program | U11; persetujuan nomor WA alumni |
| JF-3 | aplikasi JF (Perban 4/2025 Pasal 52) tidak ada | daftar pejabat JF instansi | jenjang, status penyesuaian, JP tahun berjalan < 20 | riset/6 pertanyaan 1; data ASN di balik login, hash NIP |

### 7.2 T (ditunda)

| ID | Alasan |
| --- | --- |
| PSPB-2 | menunggu siklus RPBD pertama menurut Perban 3/2026 dan bukti PSPB-1 dipakai (riset/1 pertanyaan 3) |
| SPB-3 | URL Portal Literasi Sejarah Bencana resmi belum ditemukan; tanpa pembanding, risiko tumpang tindih |
| PUS-4 | bnpb.go.id menolak pengambil otomatis; tanpa umpan rilis dari Pusdatinkom ia jadi isian manusia |
| HUK-3 | bawaan riset/6 pertanyaan 4: cukup lewat `/kemitraan` dan `/direktori` |

---

## 8. Sumber data eksternal

User-Agent semua permintaan: `Centurisk97/1.0 (+https://centurisk97.id; kontak: alamat EMAIL_TO di wrangler.jsonc)`. Semua lewat MB-8 kecuali JDIH daerah (MB-3) dan SIRUP (pembungkus skrip yang ada).

| Sumber | URL | Cara ambil | Jeda dan frekuensi | Cache | Atribusi | Dipakai |
| --- | --- | --- | --- | --- | --- | --- |
| Portal Satu Data BNPB (CKAN) | `https://data.bnpb.go.id/api/3/action/organization_list?all_fields=true`, `package_search?rows=1000&start=<n>` | JSON API (halaman web 403 ke mesin; API terbuka, diuji 5 Nov 2026) | 1 detik; harian | 20 jam | "Portal Satu Data BNPB, data.bnpb.go.id"; lisensi per paket (`license_id`) | PUS-1 |
| ArcGIS BNPB | `https://gis.bnpb.go.id/server/rest/services?f=json`; `.../<folder>/<layanan>/FeatureServer/<n>/query?where=1%3D1&outFields=<daftar putih>&returnGeometry=false&f=json` | REST; hanya agregat kab | 1 detik; harian | 20 jam | "Layanan GIS BNPB, gis.bnpb.go.id"; lisensi tidak tertulis | RRP-1, RRI-1 |
| INALOGPAL | `https://inalogpal.bnpb.go.id/Api/get_progress`, `get_count_cluster_all`, `get_count_cluster_sk_all`, `gudang_sumbar` | JSON tanpa login (riset/4 §3) | 1 detik; harian | 20 jam | "INALOGPAL BNPB"; syarat pakai tidak tertulis (U4: layar staf saja) | PLP-1, OJL-3 |
| SIRUP (LKPP) | lewat `docs/pendanaan/sirup_tarik.py` | skrip yang ada (cache dan coba ulang sudah ada) | bulanan | `docs/pendanaan/cache/` | "SIRUP LKPP, sirup.inaproc.id" | REN-2, SDU-1, IRT-2 |
| SPSE BNPB | `https://spse.inaproc.id/bnpb` | daftar tender publik; diprobe dulu | bulanan | 30 hari | "SPSE BNPB" | SDU-1 |
| JDIHN dan JDIH daerah | `https://jdihn.go.id` dan situs per provinsi (`scripts/bnpb/unit/jdih_situs.json`) | MB-3, metadata judul dan tanggal saja | 1 detik (U5); bulanan | 30 hari per pemda | "JDIH <pemda> lewat JDIHN" | PSPB-1, KS-1 |
| BPS WebAPI | lewat `scripts/bnpb/bps.py` | API berkunci `BPS_KEY` | tahunan (IKK), bulanan (PDRB, GKP) | 30 hari | "BPS" | PERB-2, RRP-3, RRS-1 |
| OSM | `public/data/osm_nasional/<prov>.json` (sudah dipanen `osm-nasional.yml`); tag tambahan lewat `scripts/scrape/tarik_osm.py` | berkas repo | mengikuti workflow yang ada | - | "© kontributor OpenStreetMap, ODbL" | RRS-3, KS-3, PD-2, RRI-1 |
| ESA WorldCover | rilis publik ESA | unduh sekali per provinsi | sekali | `data/raw/unit/worldcover/` | "ESA WorldCover, CC BY 4.0" | RRS-1 |

**Dilarang dipanen** (daftar `DILARANG` di `scripts/bnpb/unit/panen.py`, dicek sebelum tiap permintaan):

| Pola | Alasan |
| --- | --- |
| `gis.bnpb.go.id/.../survey123/...` (termasuk `perangkat_penilaian_awal_final`) | membuka nama, kontak, tanggal lahir responden ke publik (riset/5 §2); dilaporkan pemilik ke Pusdatinkom (U6), tidak dipanen |
| layer ArcGIS bertitik per rumah atau per orang (`rumah_rusak_*` titik, foto geotag) dengan geometri | PDP; hanya agregat kab dengan `returnGeometry=false` dan `outFields` daftar putih |
| `inalogpal.bnpb.go.id/Api/get_instansi_survey` dan kolom nama/nomor PIC anggota klaster | data pribadi anggota (riset/4 O3) |
| nama penyedia SIRUP/SPSE di keluaran | keluaran agregat saja (riset/6 S1); nama boleh ada di cache lokal, tidak masuk R2 |
| `bnpb.go.id/berita` dengan pengambil otomatis | 403; dihormati, tidak dihindari |
| Dapodik massal | belum diuji izinnya; RRS-3 memakai OSM |

---

## 9. Keamanan, privasi, kuota D1, pemantauan basi, uji

### 9.1 Keamanan rute

Daftar periksa `guard-api` untuk tiap rute di §4.9 dan §6.15: metode tepat (selain itu 405 dengan `allow`); hak diperiksa sebelum R2/D1; kiriman staf wajib `x-pb: 1` dan lolos `tolakOrigin`; semua kunci badan masuk daftar putih (`semuaKunci`, pola `src/meja.js:97`); semua teks lewat `tx()` dengan batas panjang; angka lewat `num()` dengan batas; tanggal lewat `tglSah` atau `date() IS`; batas laju di rute tulis lewat `laju()` (`src/bnpb.js`); galat tanpa jejak tumpukan; respons data staf `cache-control: private` dan `vary: cookie`. Layar memakai `esc()` untuk tiap teks dari data (judul dokumen JDIH daerah dan berita adalah masukan luar), diperiksa `security-reviewer`. Tidak ada `innerHTML` dari JSON tanpa `esc()`.

Kode sumber dan dokumentasi untuk Unit TIK (U1, Perban 10/2025 Pasal 24 ayat (4)): kartu tiap sistem memuat tautan ke berkas skripnya di repo dan ke dokumen ini.

### 9.2 Privasi

1. Tidak ada nama, NIK, nomor HP, tanggal lahir di R2 `unit/` maupun tabel D1 baru. `oleh` menyimpan id pelaku (`staf:<id>` atau id akun instansi), bukan nama.
2. Pengungsian: tanpa nama pengungsi, tanpa kontak koordinator (bawaan riset/3 pertanyaan 4); rekap per tempat disembunyikan bila < 10 jiwa.
3. Laphar: yang di-commit tetap agregat seperti sekarang; PDF (memuat nama petugas) tidak masuk repo.
4. TLHP, SAKTI, draf LAKIP: hanya di mesin pemilik (U9, KEU-1).
5. Fixture uji dari dokumen nyata dibersihkan dari nama sebelum masuk `tests/`.
6. `unit_ketuk.koreksi` dibatasi ke medan berkas usulan itu (daftar putih per berkas di `src/unit.js`), sehingga staf tidak bisa menyimpan teks bebas berisi data pribadi di luar `catatan` (200 huruf).

### 9.3 Kuota D1

Batas akun Free: 5 juta baris dibaca per hari dan 100 ribu baris ditulis per hari, dipakai bersama seluruh situs (memori `d1-kuota-baca`: 28 Okt 2026 pemindaian penuh pernah menghabiskan kuota dan menjatuhkan situs). Perkiraan untuk Ruang Unit dengan pemakaian sekitar 20 staf aktif per hari:

| Sumber baca | Per kejadian | Kejadian per hari | Baris dibaca per hari |
| --- | --- | --- | --- |
| `stafOK` per permintaan staf (sesi + staf, berindeks) | sekitar 2 | 20 staf x 10 permintaan | sekitar 400 |
| `GET /api/unit/ketuk?berkas=` (indeks `unit_ketuk_berkas`) | <= 200 | 50 | <= 10.000 |
| `laju()` di rute tulis (indeks `laju_bnpb_k`) | <= 300 | 100 tulis | <= 30.000 |
| Actions: `unit_ketuk` penuh | <= 5.000 (tahun pertama) | 1 | <= 5.000 |
| Actions: `meja_catatan` meja rehab, dsp, logistik (indeks `meja_catatan_wilayah`) | <= 2.000 | 1 | <= 2.000 |
| Actions: `peringatan` 120 hari (PD-1) | <= 20.000 | 1 | <= 20.000 |
| Actions: `logbook_kejadian` + `logbook_entri` (PUS-2), kolom terpilih | <= 30.000 | 1 | <= 30.000 |
| Actions: `hibah_bast`, `diklat_angkatan`, `pengungsian_*` | <= 10.000 | 1 | <= 10.000 |
| `src/hukum.js` subkueri `dicabut_oleh` | <= 40 per halaman | 50 | <= 2.000 |
| Jumlah | | | <= sekitar 110.000 (2,2% batas harian) |

Tulis: `unit_ketuk` + `laju_bnpb` + `akses_status` + `pengungsian_harian` di bawah 2.000 baris per hari kecuali saat kejadian besar (pengungsian: satu baris per tempat per hari; 500 tempat = 500 tulis). Tidak ada pemindaian penuh di jalur permintaan pengunjung. Kueri Actions yang membaca tabel besar wajib memilih kolom dan memakai `WHERE` berindeks; `tests/warga/unit.test.mjs` menjalankan `EXPLAIN QUERY PLAN` atas kueri `GET /api/unit/ketuk` dan menegaskan `USING INDEX unit_ketuk_berkas`.

R2: baca kelas B per permintaan data (10 juta per bulan gratis); 50 berkas x 20 staf x 30 hari jauh di bawahnya. Tulis kelas A: sekitar 40 unggahan per hari dari Actions.

### 9.4 Pemantauan basi

1. Tiap berkas R2 membawa `dibuat` (UTC) dan `basi_jam` (harian 48, mingguan 240, bulanan 1.080, statis null).
2. `jalan.py` menulis `unit/indeks.json`: `{dibuat, berkas: [{nama, sistem, dibuat, basi_jam, ok, galat}]}`; langkah gagal tercatat `ok: false` dengan pesan galat satu baris, berkas lama tetap di R2.
3. `GET /api/unit/indeks` menggabungkan indeks dengan `MEDIA.head("unit/<nama>.json").uploaded` per berkas (head kelas B, tanpa D1) dan mengembalikan `basi: true` bila umur > `basi_jam`.
4. Pintu `/bnpb/unit` dan tiap kartu menampilkan pil "basi sejak <tanggal>" bila basi; angka basi tetap tampil, tidak disembunyikan.
5. Langkah workflow menulis ringkasan ke `$GITHUB_STEP_SUMMARY`: daftar berkas gagal dan berkas basi. Ruang Unit tidak masuk `/api/status` (`src/worker.js:524`), supaya data staf yang basi tidak membuat situs publik melapor 503.

### 9.5 Uji (TEST.md)

| Logika di | Uji | Berkas |
| --- | --- | --- |
| fungsi murni JS (MB-2 `tenggat`, MB-5 `kebutuhanDasar`, MB-6 `render`, PD-3, RRP-3, WIL-1 urut, JF-2) | node:test tanpa DB | `tests/bnpb/unit_*.test.mjs` (`npm run uji:layar`) |
| fungsi murni Python (semua `scripts/bnpb/unit/*.py`) | `--cek` dengan assert, dijalankan `jalan.py --cek` sebelum tiap jalan | skrip itu sendiri |
| kembar JS-Python (MB-2, MB-5) | satu uji menjalankan keduanya | `tests/bnpb/unit_kembar.test.mjs` |
| CHECK, trigger, indeks D1 (0110-0113) | SQL langsung ke D1 Miniflare, yang salah DITOLAK | `tests/warga/unit_skema.test.mjs`, `tests/warga/meja.test.mjs` |
| rute dan gerbang peran | worker utuh di Miniflare (tamu 303, peran lain 403, `unit` 200, tanpa `x-pb` ditolak, nama di luar `DATA_UNIT` 404 tanpa menyentuh R2) | `tests/warga/unit.test.mjs` |
| alur lintas tabel WIL-2 (tempat -> harian -> rekap) | satu uji ujung ke ujung | `tests/warga/unit_alur.test.mjs` |
| aturan berpasal | gerbang tanpa DB | `tests/agen/gerbang-jam-aturan.test.mjs` |
| kartu standar | gerbang yang ada | `tests/agen/gerbang-kartu-std.test.mjs` |

Tiap rute dan tabel baru masuk `tests/warga/cakupan.json` daftar `diuji`; IRT-1, KEU-1 (skrip lokal) masuk `dikecualikan` dengan alasan "berjalan di mesin pemilik atas data internal, tidak ada jalur produksi". Pesan gagal menyebut angka dan sebab teknis.

---

## 10. Catatan untuk sesi induk

**Kontradiksi dan selisih angka**

1. PUS-2 (riset/1) mengusulkan kolom `kib` di `logbook_kejadian`; `0094_logbook_juklak.sql:2` melarang `ALTER ADD COLUMN` di tabel itu, dan KIB bisa dihitung ulang. Kolom tidak ditambah.
2. IRT-1 ada di F2 dengan desain D1 di riset/6, tetapi bawaan U9 "tidak masuk D1". Desain F2 di §6.28 adalah skrip lokal; bila U9 berubah, perlu migrasi baru.
3. PD-1, PLP-3, OJL-2 (pesan), WIL-2 (WA), RRI-1 (WA) bergantung pada WA ke BPBD atau staf; bawaan U11 "belum". Bagian WA dari kelimanya tidak dibangun; sisa sistemnya tetap jalan.
4. PLP-3 bergantung pada daftar BAST (U10 bawaan: tidak tersedia). Tanpa daftar, sistem kosong; usul: tiket PLP-3 dibuka hanya bila daftar diserahkan.
5. Riset/1 PSPB-1 mengusulkan `/api/v1/data/rpbd` publik, riset/4 dan riset/5 menulis keluaran ke `public/data/bnpb/` (publik). Prinsip 5 dan U2/U4 menahan semuanya di balik sesi staf; dokumen ini menaruh semua keluaran di R2 `unit/`. Konsekuensi: kartu tidak bisa dipakai di halaman publik tanpa keputusan per layar.
6. Ukuran: MT-1 dan WIL-2 ditulis L di riset, M di katalog; OJL-1 L dan sudah F3. Fase tidak diubah; MT-1 versi pertama dibatasi ke kode kegiatan dan ESMS bila ekstraksi Juklak 2/2026 melebihi satu tiket.
7. PERB-1 memakai ambang kelas IKD 0,40 dan 0,80 (riset/1), sedangkan `ikd.json` memakai `kelas_ambang` 0,33 dan 0,66 untuk raster. Ambang 0,40/0,80 tidak berpasal di korpus; ditandai asumsi di MB-2. Agregasi H lintas jenis (maks) juga asumsi dokumen ini.
8. MT-3 meminta porsi lansia dan balita terpisah; `terpapar.json` hanya menyimpan rentan gabungan per bahaya (`h[bahaya][1]`, `[3]`). Perlu perubahan `scripts/bnpb/terpapar.py` (pemilik `ruang-bnpb`) bila pemisahan wajib.

**Data yang tidak ditemukan atau belum diuji**

9. API JDIHN belum diuji (riset/1 §6); MB-3 diawali probe. Bila tidak ada API, PSPB-1 dan KS-1 bergantung pada situs JDIH provinsi satu per satu.
10. `public/data/bnpb/wilayah.json` memuat 513 kab, sedangkan `terpapar.json`, `ikd.json`, dan katalog menyebut 514. Perlu dicek kab mana yang hilang sebelum skrip memakai `wilayah.json` sebagai kamus kode.
11. `BPS_KEY` belum menjadi GitHub secret (memori `kunci-bps`); RRP-3, PERB-2, RRS-1 di Actions menunggu pemilik menambahkannya.
12. Halaman Perka 7/2008 untuk tiap standar (riset/3 menyebut hal. 9-12) dan letak pasal Juklak 3/2022 (riset menyebut halaman, bukan pasal) harus diperiksa kutipannya saat entri MB-2 ditulis; gerbang §4.2 akan menolak kutipan yang tidak ada di `seed.sql`.
13. Belum diperiksa apakah `RX_SITASI` juga menangkap "Berita Negara Republik Indonesia Tahun 2021 Nomor 1420" sebagai sitasi; bila ya, `cabut_daftar()` bisa menandai sitasi palsu. `cek()` §3.1 perlu satu kasus dengan frasa Berita Negara.

**Asumsi yang diambil**

14. Cangkang halaman memakai berkas `.html` di `public/bnpb/unit/` (pola `/bnpb/dalops`), bukan HTML yang dibangkitkan Worker seperti SIPPA. Cangkang tidak memuat data; rute menjaga datanya.
15. F0-2 sekaligus membuat kerangka MB-2 (`public/inti/jam_aturan.json` dan `jam_aturan.js`) karena ambang meja harus punya satu sumber berpasal; KPOD-2 (F1) melengkapi entrinya. Urutan U12 tetap: F0 dulu, lalu MB-1, MB-2, MB-6.
16. `kaji_cepat` memakai `rec.dibuat` sebagai proksi "tiba di lokasi" untuk ambang 24 jam; waktu tiba sebenarnya baru ada di WIL-3.
