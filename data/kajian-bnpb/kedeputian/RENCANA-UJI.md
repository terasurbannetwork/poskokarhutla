# Rencana Uji dan Kriteria Terima Ruang Unit BNPB

Versi 5 November 2026. Cakupan: perbaikan F0-1 sampai F0-3, mesin bersama MB-1 sampai MB-8, 15 sistem F1, dan 31 sistem F2 dari `KEPUTUSAN-AWAL.md` §5. Sistem F3 dan T tidak punya kriteria terima di sini; yang diuji untuk mereka hanya satu hal: tidak ada kartu atau rute yang lahir untuk mereka (§6.2 gerbang G-6).

Otoritas, dari yang paling menang: `KEPUTUSAN-UNIT.md` (bila sudah ada), `KEPUTUSAN-AWAL.md`, `PRD.md`, `DESIGN-SYSTEM.md`, `DESAIN-TEKNIS.md`, berkas ini, `TIKET.md`. Standar uji: `~/.claude/TEST.md`. Bukti teknis tiap rumus: `riset/1` sampai `riset/6`. Berkas ini tidak menambah sistem. Ia menetapkan perintah apa yang harus keluar 0 supaya sebuah butir boleh disebut selesai, dan kasus acuan yang angkanya dihitung tangan.

Nama skrip (`scripts/bnpb/unit/<nama>.py`), kunci kepala JSON, dan nama berkas kode di bawah mengikuti `DESAIN-TEKNIS.md`. Nama berkas uji dan gerbang (`tests/**`) di berkas ini baku untuk semua dokumen (KA §8). Isi rumus, nama kunci Jam Aturan, dan kasus acuan mengikuti `ALGORITMA.md` (KA §8).

## 0. Aturan dasar

### 0.1 Definisi selesai

Sebuah butir selesai bila dan hanya bila empat hal terpenuhi:

1. Perintah bukti di baris butir itu keluar dengan kode 0 di checkout bersih (keadaan yang ada di git, bukan berkas lokal yang belum dilacak).
2. Butir itu terdaftar di registri cakupan yang benar, di daftar `diuji` (nilai = potongan nama uji yang benar-benar ada) atau `dikecualikan` (nilai = alasan). Registrinya: `tests/warga/cakupan.json` untuk rute, tabel, dan trigger (registri yang sudah ada); `tests/bnpb/unit_cakupan.json` (baru) untuk pipeline, fungsi murni, layar, dan berkas Jam Aturan.
3. Pengulas wajib (AGENTS.md §6) melapor tanpa temuan kritis terbuka, dan pengulas itu subagent baru tanpa riwayat pekerjanya (AGENTS.md §3.2). Untuk Ruang Unit: `selera-angka` dan `inp-reviewer` untuk tiap layar; `guard-api` dan `security-reviewer` untuk tiap rute; `migrasi-idempoten` untuk tiap migrasi; `validasi-model` untuk PERB-1, PLP-1 (uji balik DIBI), RRS-1, PD-1, dan tiap skor MB-4.
4. Angka yang tampil di layar cocok dengan kasus acuan §2 untuk masukan acuan yang sama.

Yang tidak dihitung sebagai bukti: unit test bermock untuk perilaku di luar JS (TEST.md), tangkapan layar tanpa angka terukur, klaim di pesan commit, dan laporan "sudah beres" dari pengerjanya.

### 0.2 Empat aturan TEST.md di Ruang Unit

| Aturan | Bentuknya di Ruang Unit |
| --- | --- |
| Lapisan ditentukan letak logika | rumus tenggat, skor, dan neraca yang tinggal di Python diuji dengan self-check `--cek` yang menjalankan rumusnya; yang tinggal di JS diuji `node:test`; CHECK dan trigger meja diuji SQL sungguhan di `node:sqlite`; rute `/api/unit/*` dan halaman `/bnpb/unit/*` diuji dengan memanggil handler worker di Miniflare; alur Jam Aturan ke meja ke pengingat diuji ujung ke ujung |
| Uji bahwa yang salah DITOLAK | tiap ambang tanpa pasal ditolak gerbang; tiap acuan ke dokumen TIDAK BERLAKU ditolak; rehab tanpa kaji_id DITERIMA sesudah F0-3 tetapi rehab dengan kaji_id liar tetap ditolak; tamu yang membuka layar unit ditolak; kolom data pribadi di keluaran ditolak |
| Invarian, bukan potret | "nol relasi mencabut dari dokumen berlaku ke dokumen berlaku", "tiap ambang punya pasal yang teksnya ada di korpus", "stok tidak dilaporkan tidak pernah terhitung 0", "514 baris kab/kota, masing-masing tepat sekali" berlaku selamanya. Angka seperti "13 dokumen salah status" tidak pernah dijadikan asersi |
| Pesan gagal menyebut angka dan sebab | contoh wajib: `jam-aturan: kunci dsp_spj nilai 3 bulan, acuan perban-4-2020 Pasal 21 ayat (2): kutipan "paling lambat 3 (tiga) bulan setelah masa status" tidak ditemukan di data/raw/hukum/teks/perban-nomor-4-tahun-2020.json (21 halaman, mutu 0,998); periksa OCR atau ejaan kutipan` |

### 0.3 Berhenti di galat pertama

- Uji `node:test` baru memakai pola yang sudah ada: variabel `rusak` seperti `tests/warga/skema.test.mjs` baris 17-21 (uji SQL dibungkus `BEGIN … ROLLBACK` oleh runner, bukan oleh berkas uji; uji sesudah yang gagal melempar "tidak dijalankan: … gagal lebih dulu"), dan `berantai()` dari `tests/warga/_bnpb.mjs` untuk uji rute.
- Self-check Python memakai `--cek` (konvensi `scripts/bnpb/`: `hukum.py --cek`, `siaga.py --cek`) dengan `assert` biasa. Satu `assert` gagal = keluar bukan 0. Skrip menulis keluaran hanya sesudah `--cek` lolos di langkah CI yang sama (pola `data.yml` baris 537: `siaga.py --cek && … siaga.py`).
- Langkah CI memakai bash bawaan Actions (`set -e`), langkah uji sebelum langkah unggah atau deploy.

### 0.4 Keadaan infrastruktur per 5 November 2026 (diperiksa di repo)

| Hal | Keadaan | Akibat untuk rencana ini |
| --- | --- | --- |
| `public/bnpb/unit/`, `scripts/bnpb/unit/` | belum ada | semua berkas uji Ruang Unit baru |
| Migrasi terakhir | `migrations/0109_ai_pengetahuan.sql` | migrasi Ruang Unit mulai 0110; nomor dicek ulang saat menulis, karena sesi lain bisa mendahului |
| Skrip `package.json` | ada `uji:agen`, `uji:warga`, `uji:sippa`, `uji:banjir`, `uji:udara`, `uji:prediksi`, `uji:wa`, `uji:kemitraan`, `uji:layar` (`tests/bnpb/*.test.mjs`), `uji` | **`uji:layar` tidak dirangkai ke `uji` dan tidak dijalankan `terbit.yml`** (yang jalan hanya `uji:agen`, `uji:warga`, `uji:sippa`). Uji Ruang Unit di `tests/bnpb/` tidak akan pernah jalan di CI sampai `mekanik-mesin` merangkainya (§8) |
| `tests/bnpb/_peramban.mjs` | Chrome headless lewat CDP tanpa dependensi; tanpa Chrome, uji dilewati dengan pesan jelas | dipakai untuk uji render kartu L7 |
| `tests/warga/_bantu.mjs` | `migrasi()`, `pecah()` | dipakai uji skema L4 |
| `tests/warga/_bnpb.mjs` | `siapkan()` (Miniflare + D1 + R2 lokal), `berantai()`, kepala `ADMIN` | dipakai uji rute L5 |
| `tests/warga/sihka.test.mjs`, `tests/warga/pusdalops_gelombang3.test.mjs` | pola `meta.rows_read` dan `EXPLAIN QUERY PLAN` | dipakai uji kuota D1 §7.2 |
| `tests/warga/migrasi_beku.test.mjs` + `migrasi_beku.json` | menolak migrasi lama yang disunting | F0-3 tidak boleh menyunting `0026_meja.sql`; perubahannya migrasi baru |
| `tests/agen/gerbang-kartu-std.test.mjs` | `LAYAR` berisi 3 layar; kartu wajib `.ex-std`, `.ex-ey`, `.hl`; **kaki "Sumber: " dan `.ex-ft` dilarang** | prinsip 3 (tiap angka membawa sumber) diwujudkan sebagai atribut `data-sumber` dan `title` per angka dan pil label (KA §3 prinsip 3), bukan kaki kartu; lihat G-3 dan G-4 butir c |
| `src/meja_spek.js` baris 11 | `AMBANG = {kaji_verifikasi_jam: 72, logistik_setuju_jam: 24, dsp_spj_hari: 30, renkon_segera_hari: 90, renkon_uji_hari: 365, destana_pasif_bulan: 12, rehab_macet_hari: 60}`; dipakai juga `src/pengingat.js` baris 55, 57, 63 | F0-2 menyentuh dua berkas dan dua berkas uji (`tests/warga/meja.test.mjs`, `tests/warga/pengingat.test.mjs`) |
| `migrations/0026_meja.sql` baris 49 | CHECK tingkat tabel `(meja = 'rehab') = (kaji_id IS NOT NULL)`, trigger `meja_rehab_tautan` baris 58, indeks unik `meja_rehab_satu` baris 63; `meja_jejak` dan `meja_stok` ber-FK ke `meja_catatan` | F0-3 butuh bangun ulang tabel `meja_catatan` (SQLite tidak bisa mengubah CHECK) di 0110, satu-satunya bangun ulang meja (KA §8); uji §3.3 |
| `tests/warga/meja.test.mjs` baris 423 | menegaskan "rehab tanpa kaji_id" DITOLAK | F0-3 membalik asersi ini atas keputusan pemilik; pembalikan dicatat di pesan commit dan registri, bukan dilemahkan diam-diam |
| `public/data/bnpb/hukum/katalog.json` | 233 dokumen (193 BERLAKU, 40 TIDAK BERLAKU); 15 baris relasi `mencabut`/`mengganti` dari dokumen BERLAKU ke dokumen BERLAKU (9 dokumen sasaran unik); empat pencabutan Perban 4/2025 Pasal 60 tidak tertangkap | dasar uji F0-1 §3.1 |
| `scripts/bnpb/hukum.py` | `_konteks()` membatasi 160 karakter sebelum dan 400 sesudah sitasi; self-check `cek()` lewat `--cek` | F0-1 ditambah kasus acuan di `cek()` |
| Gerbang halaman staf | `src/worker.js`: `/bnpb/*.html` hanya lewat `BNPB_BERSIH`; gerbang sesi `hostTerkunci()` hanya berlaku untuk host produksi (`centurisk97.id` dan workers.dev produksi); `halamanTerkunci()`; aset statis (JS, JSON) **tidak lewat Worker** | uji "staf saja" wajib memakai kepala `Host: centurisk97.id`; JSON di `public/data/**` selalu terbuka untuk siapa pun, jadi keluaran Ruang Unit ke R2 `unit/<nama>.json` (KA §3 prinsip 7) |
| Agent pemilik | `ruang-bnpb` memegang `public/bnpb/**`, `scripts/bnpb/**`, `tests/bnpb/**` (`scripts/agents/roster.json` baris 514-531); `inti-layar` memegang `public/inti/**`, termasuk `public/inti/jam_aturan.*` (KA §8) | berkas baru langsung punya pemilik; `gerbang-ilmu-agent.test.mjs` tetap hijau |

---

## 1. Strategi per lapisan

### 1.1 Peta lapisan, alat, dan perintah

| No | Lapisan | Logika yang tinggal di sana | Alat (pola repo yang disalin) | Berkas uji | Perintah bukti | Kapan jalan |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Fungsi murni Python | rumus MB-2, MB-4, MB-5, PERB-1, RRX-1, REN-1, KEU-1, PUS-1, pencocok MB-1 | `--cek` dengan `assert` atas kasus acuan §2, pola `scripts/bnpb/hukum.py cek()` | di dalam skrip | `for s in scripts/bnpb/unit/*.py; do python3 -I "$s" --cek \|\| exit 1; done` | lokal sebelum commit; di workflow sebelum skrip menulis keluaran |
| L2 | Fungsi murni JS | `public/bnpb/unit/*_hitung.js` (RRP-3 kalkulator, PD-3 pesan, kebutuhan dasar WIL-2, pembaca Jam Aturan di klien) | `node:test` + impor ESM atau `node:vm`, pola `tests/agen/status-pedoman.test.mjs` | `tests/bnpb/unit_<id>.test.mjs` | `npm run uji:layar` | tiap perubahan `public/bnpb/unit/**` |
| L3 | Kembar JS dan Python | rumus yang hidup di dua bahasa: Jam Aturan (dibaca `src/meja_spek.js` dan `scripts/bnpb/unit/*.py`), kebutuhan dasar (pipeline dan kalkulator klien) | `node:test` memanggil `python3 -I` lewat `execFileSync`, pola `tests/sippa/kembar.test.mjs` di dokumen SIPPA; toleransi relatif 0,1% | `tests/bnpb/unit_kembar.test.mjs` | `npm run uji:layar` | sama dengan L2 |
| L4 | Skema D1 | migrasi 0110+ (F0-3 bangun ulang `meja_catatan`, kolom baru meja, tabel kecil F2 bila ada) | `node:sqlite` `DatabaseSync(":memory:")`, migrasi apa adanya lewat `migrasi()` dan `pecah()`, `PRAGMA foreign_keys = ON`, `BEGIN … ROLLBACK` dibungkus runner, pola `tests/warga/skema.test.mjs` | `tests/warga/unit_skema.test.mjs` | `node --test tests/warga/unit_skema.test.mjs` (juga lewat `npm run uji:warga`) | tiap perubahan `migrations/**` |
| L5 | Rute dan hak | `GET /bnpb/unit`, `GET /bnpb/unit/<kode>`, `GET /api/unit/indeks`, `GET /api/unit/data/:nama` (JSON staf dari R2 `unit/<nama>.json`, pola `src/dalops.js` baris 15-25), rute tulis `/api/unit/*`, perubahan `src/meja.js`, `src/pengingat.js` | Miniflare lewat `siapkan()`, akun staf dibuat lewat rute sungguhan, kepala `Host: centurisk97.id`, pola `tests/warga/dalops.test.mjs` | `tests/warga/unit.test.mjs`, `tests/warga/meja.test.mjs` (diperbarui) | `npm run uji:warga` | tiap perubahan `src/**` |
| L6 | Alur lintas tahap | Jam Aturan → `meja_spek.js` → `pengingat.js` → kartu; neraca rumah (RRP-1) → meja `rehab` tanpa kaji_id (F0-3) → RRX-1 | Miniflare, satu basis data, langkah berurutan `berantai()` | `tests/warga/unit_alur.test.mjs` | `npm run uji:warga` | tiap perubahan `src/meja*.js`, `src/pengingat.js`, berkas Jam Aturan |
| L7 | Layar | kartu `.ex-std`, label sumber per angka, sel kosong "belum dilaporkan", INP | `node:test` statis + `tests/bnpb/_peramban.mjs` (Chrome headless) untuk render dengan fixture | `tests/bnpb/unit_layar.test.mjs` | `npm run uji:layar` | tiap perubahan `public/bnpb/unit/**` |
| L8 | Gerbang tanpa basis data | Jam Aturan bersitasi, status hukum, kartu standar, staf saja, privasi, registri cakupan, katalog 70 ID | `node:test` membaca berkas | `tests/agen/gerbang-jam-aturan.test.mjs`, `gerbang-status-hukum.test.mjs`, `gerbang-ruang-unit.test.mjs`, `gerbang-privasi-unit.test.mjs` (semua baru), `gerbang-kartu-std.test.mjs` (diperluas) | `npm run uji:agen` | tiap commit (pre-push dan `terbit.yml`) |
| L9 | Pipeline di jaringan | MB-3 (JDIHN), MB-8 (CKAN, ArcGIS, INALOGPAL, SIRUP), MB-7 (PDF WA) | self-check `--cek` dengan tangkapan tersimpan di `tests/bnpb/fixtures/unit/` (tanpa jaringan); tarikan sungguhan hanya di workflow terjadwal | di dalam skrip + fixture | `python3 -I scripts/bnpb/unit/<nama>.py --cek` | `--cek` di tiap commit; tarikan nyata terjadwal (§8) |

### 1.2 Kenapa tiga bentuk uji D1

- **Constraint dan trigger (L4)** diuji di `node:sqlite` karena hanya bentuk ini yang memberi `BEGIN … ROLLBACK` per uji yang dibungkus runner (TEST.md butir 1). D1 adalah SQLite, jadi semantik CHECK, trigger, indeks parsial, dan `json_extract` sama.
- **Idempotensi migrasi** diuji dengan menjalankan `pecah(migrasi())` dua kali di basis data yang sama dan mengharapkan nol galat. Untuk bangun ulang tabel F0-3 ini syarat yang paling mudah gagal (lihat §3.3).
- **Rute (L5, L6)** diuji di Miniflare karena perilakunya bergantung pada sesi, R2, kepala, dan `db.batch`. Basis data baru per berkas uji.

### 1.3 Perintah ringkas

| Tujuan | Perintah |
| --- | --- |
| Semua uji Ruang Unit tanpa jaringan | `npm run uji:agen && npm run uji:layar && npm run uji:warga && for s in scripts/bnpb/unit/*.py; do python3 -I "$s" --cek \|\| exit 1; done` |
| Hanya F0 | `python3 -I scripts/bnpb/hukum.py --cek && node --test tests/agen/gerbang-status-hukum.test.mjs tests/agen/gerbang-jam-aturan.test.mjs tests/warga/meja.test.mjs tests/warga/pengingat.test.mjs tests/warga/unit_skema.test.mjs tests/warga/migrasi_beku.test.mjs` |
| Satu sistem | `python3 -I scripts/bnpb/unit/<nama>.py --cek && node --test tests/bnpb/unit_<id>.test.mjs` |
| Pemilik berkas | `npm run uji:agen` (memuat `gerbang-ilmu-agent.test.mjs`) |

---

## 2. Kasus acuan rumus

Semua angka di bawah dihitung tangan pada 5 November 2026 dari rumus di `riset/1-6` dan teks pasal yang dicek di korpus `data/raw/hukum/teks/`. Masukan berlabel "fixture" adalah angka uji, bukan angka resmi. Kasus disimpan di `tests/bnpb/fixtures/unit/acuan.json` dan dibaca oleh self-check Python dan uji JS yang sama (L3). Hari ini acuan untuk semua kasus = `2026-11-05`, zona waktu WIB (UTC+7, tanpa musim panas).

### 2.1 MB-2 Jam Aturan

Berkas Jam Aturan: data `public/inti/jam_aturan.json` dan fungsi `public/inti/jam_aturan.js` (KA §8), dibaca JS dan Python dari JSON yang sama. Tiap entri memuat `{kunci, jenis, nilai, satuan, sejak, acuan (id katalog), letak, kutipan, asumsi, catatan}`; entri `asumsi: true` wajib `catatan` (ALGORITMA §3). Nama kunci mengikuti ALGORITMA §3.1.

Aturan hitung kalender yang diuji (tafsir kita, ditulis di berkasnya):

- "N bulan sesudah t" = tanggal yang sama N bulan kemudian; bila tanggal itu tidak ada, dipangkas ke hari terakhir bulan itu.
- "N tahun" = 12 x N bulan dengan aturan pangkas yang sama.
- "x 24 jam" dihitung dari cap waktu, bukan tanggal.
- "hari kerja" = Senin sampai Jumat dikurangi daftar libur nasional di berkas Jam Aturan; selama daftar libur kosong, keluaran berlabel "tanpa libur nasional, asumsi".
- Cap waktu disimpan UTC, tanggal diturunkan di WIB: `2026-11-05T17:30:00Z` adalah 6 November 2026 WIB.

| Kunci | Nilai | Acuan dan kutipan (dicek di korpus 5 Nov 2026) | Masukan | Keluaran yang diharapkan |
| --- | --- | --- | --- | --- |
| `dsp_laporan_kejadian` | 3 hari | `perban-4-2020` Pasal 4: "paling lambat 3 (tiga) hari sejak terjadinya ancaman atau kejadian Bencana" | kejadian 2026-11-02 | tenggat 2026-11-05; laporan 2026-11-05 tepat waktu; 2026-11-06 terlambat 1 hari |
| `dsp_laporan_perkembangan` | tanggal 5 bulan berikutnya | `perban-4-2020` Pasal 21 ayat (1): "paling lambat setiap tanggal 5 (lima) bulan berikutnya" | cair 2026-01-20; cair 2026-01-05; cair 2026-12-10 | 2026-02-05; 2026-02-05 (bukan hari itu juga); 2027-01-05 (tahun berganti) |
| `dsp_spj` | 3 bulan sesudah status berakhir | `perban-4-2020` Pasal 21 ayat (2): "paling lambat 3 (tiga) bulan setelah masa status keadaan darurat bencana berakhir" | berakhir 2026-01-15; 2026-05-31; 2025-11-30 | 2026-04-15; 2026-08-31; 2026-02-28 (dipangkas) |
| `kaji_mulai` | 1 x 24 jam sesudah informasi | `juklak-3-2022` BAB II huruf C angka 1: "Kaji cepat dilakukan paling lambat 1 x 24 jam setelah informasi" | informasi diterima 2026-11-05 08.00 WIB | 2026-11-06 08.00 WIB |
| `kaji_awal` | 1 x 24 jam | `juklak-3-2022`: "paling lambat 1 x 24 jam" (gerbang mencocokkan kutipan lengkap di teks) | tiba 2026-11-05 08.00 WIB; tiba 2026-12-31 23.30 WIB | 2026-11-06 08.00 WIB; 2027-01-01 23.30 WIB |
| `kaji_lanjutan` | 3 x 24 jam | `juklak-3-2022`: "paling lambat 3 x 24 jam setelah tiba di lokasi kejadian" | tiba 2026-11-05 08.00 WIB | 2026-11-08 08.00 WIB |
| `trc_bergerak` | 1 x 24 jam sesudah perintah | `juklak-3-2022` hal. 8 menurut riset 3 §2 (kutipan dicek gerbang) | perintah 2026-11-05 10.00 WIB | 2026-11-06 10.00 WIB |
| `r3p` | 90 hari sejak hari-0 | `perban-5-2017` Pasal 2 ayat (2): "paling lama 90 (sembilan puluh) hari" | hari-0 2026-08-07 | tenggat 2026-11-05; sisa hari ini 0 (lihat §2.6) |
| `renkon_berlaku` | 3 tahun | `perban-2-2023` Pasal 21 ayat (1): "berlaku untuk jangka waktu 3 (tiga) tahun" | ditetapkan 2024-03-01; 2024-02-29 | berlaku sampai 2027-03-01; 2027-02-28 |
| `renkon_reviu` | 6 bulan | `perban-2-2023` Pasal 21 ayat (2): "paling sedikit 6 (enam) bulan sekali" | reviu terakhir 2026-04-30 | reviu berikut 2026-10-30; hari ini `perlu_reviu` (lewat 6 hari) |
| `destana_penilaian` | 3 tahun | `perban-7-2025` Pasal 14 ayat (5): "paling sedikit setiap 3 (tiga) tahun" | penilaian terakhir 2023-10-01 | jatuh tempo 2026-10-01; hari ini `penilaian_kedaluwarsa` |
| `ews_evaluasi` | 4 bulan | `perban-2-2024` Pasal 29 ayat (1): "minimal 1 (satu) kali dalam kurun waktu 4 (empat) bulan" | evaluasi terakhir 2026-07-01 | paling lambat 2026-11-01; hari ini lewat 4 hari |
| `pengungsi_mutakhir` | 1 hari | `juknis-9-2023` hal. 10 menurut riset 3 §2 ("setiap hari") | data tempat 2026-11-03 | basi (umur 2 hari > 1); WIL-2 tidak menjumlahnya bila umur > 2 hari (riset 3 W2) |
| `laporan_pelatihan` | 7 hari kerja | Perban 2/2025 Pasal 14 menurut riset 6 §6.2 | pelatihan selesai Jumat 2026-11-06 | 2026-11-17 (Senin 9 sampai Selasa 17, tanpa libur nasional, berlabel asumsi) |
| `masa_status_kab`, `_prov`, `_nas` | 14 hari, 1 bulan, 3 bulan (batas atas) | Pedoman Penetapan Status 2016, **bukan dokumen JDIH** (riset 3 §2; `public/inti/status_pedoman.js` baris 4) | | wajib `asumsi: true` dengan `catatan` "pedoman non-JDIH"; layar menulis "asumsi" (Catatan butir 3) |
| `renkon_segera_hari`, `logistik_setuju_jam`, `destana_pasif_bulan`, `rehab_macet_hari` | 90, 24, 12, 60 | tidak ada pasal (riset 2 temuan 5 menyebut `destana_pasif_bulan` boleh dipertahankan sebagai tanda internal) | | wajib `asumsi: true`; gerbang G-1 menolak bila tanda asumsi hilang |
| `hibah_logpal_lapor` (PLP-3) | 12 bulan sesudah BAST | Juklak 3/2024 tidak menyebut angka (riset 4 Q4) | BAST 2025-11-30 | 2026-11-30; berlabel asumsi |

Invarian yang diuji untuk semua kunci (200 masukan acak berbenih tetap, benih dicetak saat gagal):

- tenggat ≥ peristiwa, dan tenggat bertambah bila peristiwa bertambah (monoton);
- fungsi sama dua kali memberi hasil sama;
- tenggat tidak pernah jatuh di tanggal yang tidak ada (31 April, 29 Februari tahun bukan kabisat).

Yang wajib ditolak: masukan tanggal kosong atau tidak sah memberi `null` dan alasan, bukan tanggal 1970; satuan di luar daftar ALGORITMA §3 (`jam`, `hari`, `hari_kerja`, `hari_kalender`, `bulan`, `tahun`, `tanggal_bulan_berikut`, dan satuan standar `kg_orang_hari` dan seterusnya) ditolak saat berkas dimuat.

### 2.2 MB-4 Skor prioritas daerah

Satu rumus untuk semua pemakai: rata-rata geometrik berbobot dari persentil (`ALGORITMA.md` §5.2, KA §8). Komponen risiko bawaan = jiwa terpapar kelas tinggi, bukan `R_total` (ALGORITMA §5.4); konfigurasi per pemakai (MT-2, DIK-1, PLP-2, PD-2, OJL-2) di ALGORITMA §5.5. Kasus acuan disalin dari ALGORITMA §5.6 (masukan fixture; p dan v diberikan langsung):

| Kasus | Masukan (fixture) | Diharapkan |
| --- | --- | --- |
| A1 (dulu P1) | 4 komponen persentil, p = 0,9; 0,5; 0,7; 0,1; bobot sama | S = (0,9 x 0,5 x 0,7 x 0,1)^(1/4) = 0,42129 |
| A2 (dulu P3) | A1 tanpa komponen ke-4 untuk kab itu | S = (0,9 x 0,5 x 0,7)^(1/3) = 0,68041; `hilang` memuat komponen ke-4 dan kartu menyebutnya |
| A3 lantai | A1 dengan p ke-4 = 0 | q = 0,01; S = 0,23691 |
| A4 mutlak nol (dulu M2) | A1 dengan komponen ke-4 mutlak v = 0 (cakupan 1,5 dipangkas 1) | S = 0 |
| A5 DIK-1 (dulu M1) | p risiko 0,8; celah kapasitas 0,7; kejadian 0,5; cakupan 12/30 = 0,4 sehingga v = 0,6 | S = (0,8 x 0,7 x 0,5 x 0,6)^(1/4) = 0,64022 |
| A6 DIK-1 tanpa cakupan | A5 tanpa unggahan | S = (0,8 x 0,7 x 0,5)^(1/3) = 0,65421; "cakupan belum ada data", bukan 0 |
| A7 bobot | p = 0,9; 0,5; 0,1; w = 2; 1; 1 | S = 0,44860; bobot tampil 0,5; 0,25; 0,25 |
| A8 data kurang (dulu M3) | 4 komponen, hanya 1 ada | S = `null`, "data kurang", tidak diurutkan sebagai 0 |
| A9 persentil seri | nilai [10, 20, 20, 40] | p = [0; 0,5; 0,5; 1] |
| A10 PLP-2 biner | p 0,9; 0,5; 0,7 dan "sudah menerima" v = 0,5 | S = 0,62997 (lawan 0,74917 bila belum) |
| P2 PLP-2 kriteria rapat | kriteria "program prioritas nasional" dan "analisis strategis" | tidak diskor mesin; kolom kosong untuk rapat (riset 4 P2) |

Invarian: S di [0, 1]; menaikkan p atau v satu komponen tidak pernah menurunkan S (diuji 500 pasangan acak berbenih); jumlah bobot ternormal yang tampil = 1 dengan toleransi 1e-9; urutan stabil untuk skor sama (urut kode wilayah); keluaran selalu berlabel sesuai ALGORITMA §5.5 ("daftar pendek, keputusan tetap di rapat" untuk PLP-2, "usulan analis" untuk MT-2) atau "bukan IRB resmi" (PERB-1). Kata "prioritas" di judul kartu hanya bila uji balik ALGORITMA §5.7 lulus.

### 2.3 MB-5 Neraca kebutuhan

#### PLP-1 stok penyangga (Perka 23/2014)

Rumus dicek di teks `perka-nomor-23-tahun-2014.json`: Pasal 11 huruf a "Jumlah Penduduk x Prosentase x Hari", huruf b dan c "Jumlah Penduduk x Prosentase x Hari/ 4 Jiwa"; Pasal 12 ayat (2) "1% dari jumlah penduduk (asumsi)"; Pasal 14 ayat (2) "4% dari jumlah penduduk". H = 3 hari (72 jam, Pasal 1 angka 15 menurut riset 4). Turunan barang dari Perka 7/2008 (dicek di teks `perka-nomor-7-tahun-2008.json`): "beras 400 gram per orang per hari", "air minum diberikan sejumlah 2.5 liter per orang per hari".

| Kasus | Masukan (fixture) | Diharapkan |
| --- | --- | --- |
| S1 umum | JP 500.000; PR 1%; H 3 | paket pangan 15.000 orang-hari; sandang 3.750; papan 3.750 (bacaan harfiah Pasal 11, berlabel "bacaan harfiah"); beras 6.000 kg; air minum 37.500 liter |
| S2 khusus | JP 500.000; PR 4%; H 3 | pangan 60.000; sandang 15.000; papan 15.000; beras 24.000 kg; air minum 150.000 liter |
| S3 balita | balita 40.000; PR 1%; H 3 | tambahan balita 1.200 |
| S4 PR risiko | terpapar tinggi maks 12.500 dari JP 500.000 | PR 2,5% (dalam rentang); berlabel "asumsi platform" |
| S5 PR risiko di bawah | terpapar tinggi 2.000 | 0,4% dipangkas ke 1% |
| S6 PR risiko di atas | terpapar tinggi 40.000 | 8% dipangkas ke 4% |
| S7 stok kurang | kebutuhan beras S1 6.000 kg; stok 4.500 kg | kesenjangan 1.500 kg; status `kurang` |
| S8 stok cukup | stok 6.000 kg | kesenjangan 0; status `cukup` (batas inklusif, stok ≥ kebutuhan) |
| S9 stok tidak dilaporkan | stok tidak ada | status `belum_dilaporkan`, kesenjangan `null`, sel tampil "stok belum dilaporkan", bukan 0 (riset 4 P1) |
| S10 Q3 | bacaan "satu paket per keluarga tanpa hari" | sandang dan papan 1.250; tampil berdampingan dengan bacaan harfiah sampai pemilik menjawab Q3 |

Uji balik (diperiksa `validasi-model`, bukan potret): rasio pengungsi DIBI per penduduk dipangkas di persentil 99 sebelum dihitung; kab-tahun dengan rasio di atas 1% dilaporkan sebagai jumlah dan persen dari kab-tahun berdata, dengan penyebutnya. Angka riset 4 (209 dari 5.654 kab-tahun, 3,7%) dipakai hanya sebagai reproduksi masukan beku dengan sha256 `dibi_kab_tahun.json` dicatat di uji, sehingga perubahan data memberi pesan "masukan berubah", bukan merah diam-diam.

Invarian: tepat 514 baris kab/kota, tiap kode sekali; kebutuhan PR 4% = 4 x kebutuhan PR 1% untuk kab yang sama; JP negatif atau bukan angka ditolak.

#### WIL-2 kebutuhan dasar per tempat pengungsian (Perka 7/2008, Juklak 3/2022)

Kutipan dicek: "air bersih diberikan sejumlah 7 liter pada tiga hari pertama, selanjutnya 15 liter per orang per hari"; "3 (tiga) meter persegi per orang"; "Satu jamban keluarga digunakan maksimal untuk 20 orang"; "250 gram sabun mandi setiap bulan". Kantong sampah 1 per 3 keluarga per 3 hari dari Juklak 3/2022 hal. 25 menurut riset 3 §2.

| Kasus | Masukan (fixture) | Diharapkan |
| --- | --- | --- |
| K1 buka 2 hari lalu (hari ke-3, ALGORITMA §6.3) | 230 jiwa; 61 KK; tempat buka 2 hari lalu | beras 92 kg/hari; air bersih 1.610 liter/hari; jamban 12; hunian 690 m2; kantong sampah 21 per 3 hari; sabun mandi 57,5 kg/bulan |
| K2 buka 4 hari lalu (hari ke-5) | sama, buka 4 hari lalu | air bersih 3.450 liter/hari |
| K3 batas jamban | 20 jiwa; 21 jiwa | 1; 2 |
| K4 panel selisih | pusat 4.385; daerah 18.908 (Aceh Utara, riset 3 §3) | selisih 76,8%, merah (> 25%); kedua angka tampil dengan sumber dan tanggal, sistem tidak memilih |
| K5 basi | data tempat berumur 3 hari | tidak dijumlah ke rekap kab, ditandai basi |

#### RRP-1 neraca rumah rusak

| Kasus | Masukan (layer NTT 2026, riset 5 §5.2) | Diharapkan |
| --- | --- | --- |
| R1 susut | Nagekeo RB lapor 4.079, RB terverifikasi 314 | rasio susut RB 0,077 |
| R2 kemajuan > 1 | lapor total 95.750; terverifikasi total 120.574 | kemajuan 1,259 (boleh di atas 1) |
| R3 beban stimulan | lapor RB 25.833, RS 22.110, RR 47.807; verifikasi RB 6.348, RS 15.815, RR 32.062; tarif 60/30/15 juta | lapor Rp2.930.385 juta (sekitar Rp2,93 T); verifikasi Rp1.336.260 juta (sekitar Rp1,34 T); berlabel "estimasi kita" |
| R4 pembanding kurang | kejadian tanpa V, hanya 2 kab pembanding | "belum ada pembanding" (minimal 3 kab, riset 5 P1) |

Snapshot layer NTT disimpan sebagai fixture agregat kab (tanpa titik, tanpa kolom pribadi); uji memakai fixture itu, bukan layer hidup.

### 2.4 PERB-1 pemilih daerah pendampingan IKD

Rumus riset 1 §1.5: `R(C) = (H x V x (1 - C))^(1/3)`, `manfaat = n x [R(C) - R(C + d)]`, `d` = jarak ke ambang kelas berikutnya (0,40 atau 0,80), `n = 1/514`. Kelas yang diuji (tafsir kita, Catatan butir 4): rendah C < 0,40; sedang 0,40 ≤ C < 0,80; tinggi C ≥ 0,80.

| Kasus | H, V, C (fixture) | d | R(C) | R(C + d) | Selisih | Manfaat (x 1/514) |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | 0,8; 0,6; 0,35 | 0,05 | 0,67824 | 0,66039 | 0,01786 | 0,00003474 |
| E2 | 0,8; 0,6; 0,78 | 0,02 | 0,47267 | 0,45789 | 0,01478 | 0,00002876 |
| E3 | 0,8; 0,6; 0,10 | 0,30 | 0,75595 | 0,66039 | 0,09557 | 0,00018593 |
| E4 | C = 0,40 tepat | 0,40 (ke 0,80) | | | | sudah sedang; kasus ini menguji bahwa d tidak pernah 0 |
| E5 | C = 0,85 | tidak ada kelas berikut | | | | tidak masuk daftar, alasan "sudah kelas tinggi" |

Bonus IKU 2 (`+B` bila naik melewati 0,40 dan provinsi di bawah 0,40 pada LAKIP Lampiran 2) diuji sebagai ada atau tidak ada, dengan nilai B dari berkas konfigurasi yang tampil. Invarian: tiap baris berlabel "bukan IRB resmi" dan "C proksi raster" selama nilai IKD resmi per kab tidak ada (U10); tidak ada kab dengan d ≤ 0; urutan menurut manfaat dibagi biaya proksi.

### 2.5 RRP-3 kalkulator Jitupasna permukiman (Perka 15/2011)

Rumus riset 5 P3 (Perka 15/2011 hlm 40 dan 47): `kerusakan = Σ unit_t x harga_t`, `kebutuhan = Σ unit_t x satuan_t x IKK_kab / 100`, t ∈ {RB, RS, RR}.

| Kasus | Masukan (fixture kecuali tarif) | Diharapkan |
| --- | --- | --- |
| J1 | RB 120, RS 300, RR 800; harga kerusakan 150/75/25 juta (fixture); satuan biaya 60/30/15 juta (tarif rilis, riset 5 §1); IKK kab 112,5 | kerusakan Rp60.500 juta; kebutuhan dasar Rp28.200 juta; kebutuhan berindeks Rp31.725 juta |
| J2 ganda | huntap 50, stimulan RB 90, RB terverifikasi 120 | tanda "periksa hitung ganda" (140 > 120, Perka 15/2011 hlm 41) |
| J3 ganda batas | huntap 30, stimulan RB 90 | tanpa tanda (120 = 120) |
| J4 IKK kab kosong | IKK prov 108,0 | memakai 108,0 dengan label "IKK provinsi" |
| J5 IKK kosong semua | | kebutuhan berindeks `null` dan alasan; kerusakan tetap terhitung |
| J6 masukan liar | unit negatif, unit pecahan | ditolak di masukan, sebelum hitung |

Invarian: kebutuhan linear terhadap unit (dua kali unit = dua kali kebutuhan); berkas CSV unduhan memuat kolom yang sama dengan kolom formulir lampiran 7 Perka 15/2011 (daftar kolom dibekukan di fixture sekali dari teks).

### 2.6 RRX-1 jam pascabencana per kab (R3P 90 hari)

Aturan riset 5 D1: hari-0 = `mulai` SK pertama berstatus tanggap darurat untuk (kab, kejadian); SK berurutan berjarak ≤ 14 hari digabung; `sisa = 90 - (hari ini - hari-0)`; hijau > 30, kuning 1 sampai 30, merah ≤ 0 tanpa R3P tercatat; layak didampingi bila RB + RS ≥ 100 (bawaan, berlabel asumsi) atau jembatan ≥ 1; beban = RB x 60 + RS x 30 + RR x 15 juta.

| Kasus | Masukan (fixture) | Diharapkan |
| --- | --- | --- |
| X1 gabung | SK1 tanggap 2026-08-01 s.d. 2026-08-14; SK2 tanggap 2026-08-20 s.d. 2026-09-02 (jeda 6 hari) | satu kejadian; hari-0 2026-08-01; berjalan 96 hari; sisa -6; merah |
| X2 pisah | SK2 mulai 2026-08-29 (jeda 15 hari) | dua kejadian |
| X3 hijau | hari-0 2026-10-01 | berjalan 35; sisa 55; hijau |
| X4 kuning | hari-0 2026-08-20 | berjalan 77; sisa 13; kuning |
| X5 batas | hari-0 2026-08-07 | berjalan 90; sisa 0; merah |
| X6 R3P tercatat | X1 dengan centang "R3P ditetapkan" di meja `rehab` | bukan merah; kelas `selesai` |
| X7 siaga saja | hanya SK siaga | tidak memulai jam |
| X8 layak | RB 40, RS 70, RR 200 | layak (110 ≥ 100); beban Rp7.500 juta |
| X9 jembatan | RB 10, RS 20, jembatan 1 | layak |

Invarian: tiap jam menampilkan nomor SK sumbernya (riset 5 D1 risiko); kejadian lintas jenis bencana tidak digabung.

### 2.7 Kasus acuan sistem F1 dan F2 lain

| Sistem | Rumus (riset) | Masukan | Diharapkan | Yang ditolak |
| --- | --- | --- | --- | --- |
| REN-1 | `poin_hilang = bobot - nilai_tertimbang` (riset 6 P1) | IKK 0 dari 1,5; tindak lanjut LAPOR 0,6 dari 1,5; Sistem Merit 2,78 dari 4; Capaian IKU 5,5 dari 7 | 1,5; 0,9; 1,22; 1,5 | nilai tertimbang > bobot ditolak saat muat |
| KEU-1 | persen dihitung ulang dari pagu dan realisasi, toleransi 0,01 poin (riset 6 K1) | Biro Keuangan 137,2 dari 143,4 tertulis 72,34% | hitung ulang 95,68%; selisih ditandai dengan halaman (Catatan butir 5) | baris tanpa basis persen (pagu total atau efektif) ditandai "basis tidak disebut" |
| PUS-1 | basi = umur > 2 x periode pembaruan (riset 1 PUS-1) | dataset bulanan (30 hari) berumur 75; 60 | basi; tidak basi (batas eksklusif) | periode tidak dinyatakan: "periode tidak dinyatakan", bukan basi |
| KS-4 | bulan gladi = 1 sampai 2 bulan sebelum awal musim (riset 2 KS-4) | musim mulai November; Januari | September dan Oktober; November dan Desember tahun sebelumnya | kab tanpa musim di `siaga.json`: tanpa saran |
| PD-3 | enam unsur Pasal 20 ayat (2) Perban 2/2024 | peringatan banjir Siaga tanpa data sumber daya | enam baris; baris sumber daya "belum ada data" | pesan dengan kurang dari 6 baris ditolak uji |
| PD-1 | POD = hit/(hit + terlewat); FAR = palsu/(hit + palsu) (riset 2 PD-1) | hit 12, terlewat 4, palsu 20 | POD 0,75; FAR 0,625 | n hit + terlewat < 10 per jenis: "belum cukup data" |
| KPOD-1 | IKU = SK didampingi / SK; terpantau bila \|mulai episode - t0\| ≤ 3 hari (riset 3 A1) | 10 SK, 7 berpasangan episode, 5 didampingi | fungsi: terpantau 70%; IKU 50%; kartu tidak menampilkan IKU karena terpantau < 80% dan menampilkan pesan penjodohan (ALGORITMA §7.3, DT §6.13); angka resmi LAKIP tampil berdampingan | episode berjarak 4 hari tidak dipasangkan |
| PLP-2 | MB-4 §2.2 (A10, P2) | | | |
| DIK-1 | MB-4 §2.2 (A5, A6) | | | |
| IRT-1 | merah bila umur > 60 hari dan status bukan "sesuai" (riset 6 I1) | umur 61 belum sesuai; 60 belum sesuai; 200 sesuai | merah; tidak merah; tidak merah | |
| SDU-1 | `porsi_epurchasing = pagu e-Purchasing / pagu penyedia` (riset 6 S1) | fixture SIRUP 2025 beku | 43,2% (reproduksi riset 6, sha256 masukan dicatat) | nama penyedia di keluaran ditolak gerbang privasi |
| OJL-3 | merah bila beban kejadian di sepertiga teratas dan capaian < 25% atau tanpa SK (riset 4 O3) | Aceh 11,87% ber-SK beban teratas; Banten 0% | merah; merah bila bebannya sepertiga teratas, selain itu tidak | |
| WIL-1 | urutan antrean 1 sampai 5 (riset 3 W1) | satu kab per tipe | urutan tipe 1, 2, 3, 4, 5; tiap butir membawa kalimat alasan dan sumber | butir tanpa sumber |

---

## 3. Uji F0

### 3.1 F0-1 status katalog hukum

Perubahan: `scripts/bnpb/hukum.py` membaca ulang klausul pencabutan (jendela `_konteks()` dilebarkan khusus untuk pasal penutup "Pada saat Peraturan … mulai berlaku" sampai kata "dicabut", riset 6 H1 butir b), menambah `status_teks` dan `konflik` di `katalog.json`, dan mempertahankan status asal JDIH di `status_jdih` (U7: kita koreksi tampilan dengan label "menurut teks").

Dokumen yang wajib berstatus efektif TIDAK BERLAKU sesudah F0-1, dengan alasannya:

| Dokumen | Dicabut oleh | Tertangkap mesin sekarang? |
| --- | --- | --- |
| `perka-1-2012` Pedoman Umum Destana | Perban 7/2025 Pasal 22 (riset 2) | ya, relasi ada, status belum dibetulkan |
| `perka-7-2015` Rambu | Perban 3/2025 Pasal 33 (riset 2; ada ketentuan peralihan 5 tahun) | ya |
| `perka-4-2008` Pedoman Penyusunan RPB | Perban 3/2026 Pasal 50 (riset 1) | ya |
| `perka-4-2016` Pelatihan PB | Perban 2/2025 (riset 6) | ya |
| `perban-6-2021`, `perban-7-2021`, `perban-1-2022`, `perban-2-2022` | Perban 4/2025 Pasal 60 (riset 6) | **tidak**: jarak kata "dicabut" ke sitasi melebihi jendela |
| `perban-4-2019` | Perban 6/2025 (relasi katalog) | ya |
| `perban-5-2020` | Perban 5/2025 (relasi katalog) | ya |
| `perka-8-2014` | Perban 10/2025 (relasi katalog) | ya |
| `perban-2-2019` | Perban 3/2024 (relasi katalog) | ya |
| `perka-17-2010` Pedoman Umum RR | Perban 5/2017 (relasi katalog; riset 5 §1) | ya |

Kontrol yang wajib TETAP BERLAKU:

| Dokumen | Alasan |
| --- | --- |
| `perban-6-2025` OTK | diubah Perban 11/2025, tidak dicabut; ditautkan ke pengubahnya (riset 6 H1 butir c) |
| `perban-4-2020` DSP | hanya dirujuk (contoh relasi `juklak-1-2023 → perban-4-2020 merujuk`) |
| Perpres 9/2021 dalam fixture `cek()` yang sudah ada | "tetap berlaku" di kalimat yang sama dengan pencabutan dokumen lain; BNPB juga tidak mencabut peraturan di atasnya (`SETARA` di `hukum.py`) |

Kasus penolakan yang ditambahkan ke `cek()` (teks fixture pendek, bukan teks asli):

1. Daftar berbutir panjang seperti Perban 4/2025 Pasal 60: empat sitasi, kata "dicabut dan dinyatakan tidak berlaku" sesudah butir keempat, jarak lebih dari 400 karakter dari butir pertama. Harus menghasilkan empat relasi `mencabut`.
2. Kalimat yang mencabut satu pasal ("Pasal 5 Peraturan X dicabut") tidak mengubah status dokumen X.
3. Judul yang dikutip ("Perubahan atas Peraturan Y") di bagian Mengingat tetap `mengingat`, bukan `mengubah`.
4. Sitasi di Menimbang yang menyebut "telah dicabut" untuk dokumen ketiga tidak memindahkan pencabutan ke dokumen yang sedang dibaca.

Invarian di `tests/agen/gerbang-status-hukum.test.mjs` (tanpa DB, membaca `katalog.json`):

- jumlah relasi `mencabut` atau `mengganti` dari dokumen berstatus efektif BERLAKU ke dokumen berstatus efektif BERLAKU = 0; pesan gagal mencetak tiap pasangan;
- tiap dokumen dengan `status_teks` berbeda dari `status_jdih` ada di daftar `konflik` dengan id pencabut;
- `perban-6-2021` tercatat dicabut oleh `perban-4-2025` (satu-satunya asersi id tetap, karena itu kasus yang membuktikan jendela sudah dilebarkan).

Perintah bukti: `python3 -I scripts/bnpb/hukum.py --cek && node --test tests/agen/gerbang-status-hukum.test.mjs && node --test tests/warga/hukum.test.mjs` (seed D1 `hukum_dok` ikut membawa status baru; `src/hukum.js` dan layar `public/bnpb/hukum.js` menampilkan pil "Dicabut oleh X menurut teks, JDIH masih BERLAKU").

### 3.2 F0-2 ambang meja yang tidak berdasar pasal

Perubahan: `AMBANG` di `src/meja_spek.js` baris 11 diganti pembacaan berkas Jam Aturan; `src/pengingat.js` baris 55, 57, 63 ikut membaca berkas yang sama.

| Ambang lama | Pengganti | Kasus uji (hari ini 2026-11-05) | Diharapkan |
| --- | --- | --- | --- |
| `renkon_uji_hari: 365` | `renkon_berlaku` 3 tahun + `renkon_reviu` 6 bulan; kolom data `reviu_terakhir` | ditetapkan 2024-03-01, reviu 2026-04-30 | status `perlu_reviu`; dengan reviu 2026-06-01: `berlaku` |
| | | ditetapkan 2023-10-01 | `kedaluwarsa` (berakhir 2026-10-01) |
| | | catatan lama dengan `uji_terakhir` dan tanpa `reviu_terakhir` | terbaca tanpa galat; reviu dihitung dari tanggal tetap; tanda `belum_diuji` tidak ada lagi |
| `INDIKATOR_DESTANA` enam butir karangan | kosong sampai teks SNI 8357:2017 tersedia; tambah `tgl_penilaian` dan tanda `penilaian_kedaluwarsa` > 3 tahun | penilaian 2023-10-01 | `penilaian_kedaluwarsa` |
| | | isian lama yang memuat `tim_siaga` | tetap terbaca untuk riwayat, tidak lagi ditawarkan sebagai pilihan |
| `dsp_spj_hari: 30` | `dsp_laporan_perkembangan` tanggal 5 + `dsp_spj` 3 bulan sesudah status berakhir; kolom data `tgl_status_berakhir` | cair 2026-09-10, status berakhir 2026-09-30, belum SPJ | tanda laporan perkembangan bila laporan Oktober belum ada setelah 2026-11-05; tanda SPJ tidak muncul sampai 2026-12-30 |
| | | cair tanpa `tgl_status_berakhir` | tanda "tanggal status berakhir belum diisi", bukan tanda SPJ palsu |
| `kaji_verifikasi_jam: 72` satu tahap | dua tahap 24 jam (awal) dan 72 jam (lanjutan) | tiba +25 jam tanpa laporan awal | tanda "laporan awal lewat 1 x 24 jam" |
| | | tiba +70 jam dengan laporan awal | tanpa tanda |
| | | tiba +73 jam tanpa lanjutan | tanda "laporan lanjutan lewat 3 x 24 jam" |
| `logistik_setuju_jam`, `renkon_segera_hari`, `destana_pasif_bulan`, `rehab_macet_hari` | tetap, pindah ke Jam Aturan berlabel `asumsi` | teks tanda bahaya di layar | memuat kata "asumsi" |

Yang ditolak: `grep` gerbang G-1 menemukan objek literal `AMBANG = {` atau angka tenggat bernama di `src/meja_spek.js`, `src/pengingat.js`, `public/inti/status_pedoman.js`, `scripts/bnpb/unit/**` (riset 3 A2: "nol angka tenggat tertanam di luar berkas Jam Aturan").

Berkas uji yang berubah di commit yang sama: `tests/warga/meja.test.mjs` (baris 138 menegaskan `AMBANG.logistik_setuju_jam` 24; diganti asersi ke Jam Aturan dengan nilai yang sama), `tests/warga/pengingat.test.mjs`. Asersi lama yang benar tidak dihapus; yang salah karena aturan berubah diganti dengan asersi pasal yang baru.

Perintah bukti: `node --test tests/agen/gerbang-jam-aturan.test.mjs tests/warga/meja.test.mjs tests/warga/pengingat.test.mjs`.

### 3.3 F0-3 meja rehab tanpa kaji_id

Perubahan: `migrations/0110_meja_rehab_lepas.sql` (hanya F0-3; KA §8) membangun ulang `meja_catatan` tanpa CHECK `(meja = 'rehab') = (kaji_id IS NOT NULL)`, diganti `CHECK (kaji_id IS NULL OR meja = 'rehab')`; trigger `meja_rehab_tautan` diganti versi yang hanya jalan `WHEN NEW.meja = 'rehab' AND NEW.kaji_id IS NOT NULL`; `src/meja.js` baris 114-121 menerima rehab tanpa kaji_id dengan kec dan desa dari badan permintaan.

Uji skema di `tests/warga/unit_skema.test.mjs` (`node:sqlite`, `BEGIN … ROLLBACK` per uji oleh runner):

| No | Diberikan | Ketika | Maka |
| --- | --- | --- | --- |
| R1 | basis data dengan migrasi sampai 0109 dan 3 catatan rehab tertaut, 2 catatan gudang, 4 baris `meja_stok`, 5 baris `meja_jejak` | migrasi F0-3 dijalankan | jumlah baris tiap tabel sama; isi tiap kolom sama baris per baris; `PRAGMA foreign_key_check` kosong |
| R2 | sesudah R1 | daftar `sqlite_master` | indeks `meja_catatan_wilayah`, `meja_catatan_klien`, `meja_rehab_satu`, `meja_gudang_unik` dan trigger `meja_rehab_tautan`, `meja_catatan_ubah` ada lagi; tidak ada objek lain yang hilang dibanding sebelum migrasi |
| R3 | | migrasi dijalankan dua kali | nol galat (idempoten) |
| R4 | | sisip rehab tanpa kaji_id, status `jitupasna` | diterima |
| R5 | | sisip rehab dengan kaji_id liar | DITOLAK |
| R6 | | sisip rehab dengan kaji_id kaji cepat di kab lain | DITOLAK, pesan "rehab harus tertaut ke kaji cepat masuk_jitupasna di kabupaten yang sama" |
| R7 | | sisip catatan `gudang` dengan kaji_id | DITOLAK |
| R8 | dua rehab tanpa kaji_id di kab yang sama | sisip keduanya | diterima (indeks unik parsial tidak menyamakan NULL) |
| R9 | rehab tertaut | sisip rehab kedua dengan kaji_id yang sama | DITOLAK (satu rehab per kaji cepat tetap berlaku) |
| R10 | rehab tanpa kaji_id | UPDATE kaji_id dari NULL ke id sah | DITOLAK oleh `meja_catatan_ubah` (perilaku lama dipertahankan; Catatan butir 6) |

Uji rute di `tests/warga/meja.test.mjs`: `POST` rehab tanpa kaji_id dengan kab sah = 201; kaji_id bukan 16 hex = 400; kaji_id untuk meja selain rehab = 400 "kaji_id hanya untuk meja Rehab-rekon" (perilaku lama). Asersi baris 423 "rehab tanpa kaji_id" dibalik dari DITOLAK ke DITERIMA dengan komentar yang menyebut F0-3 dan `KEPUTUSAN-AWAL.md` §5.0.

Uji alur di `tests/warga/unit_alur.test.mjs`: baris neraca RRP-1 untuk satu kab → catatan rehab tanpa kaji_id → centang "R3P ditetapkan" → jam RRX-1 kab itu berkelas `selesai`.

Perintah bukti: `node --test tests/warga/unit_skema.test.mjs tests/warga/meja.test.mjs tests/warga/unit_alur.test.mjs tests/warga/migrasi_beku.test.mjs`. `migrasi_beku` membuktikan `0026_meja.sql` tidak disunting.

---

## 4. Kriteria terima mesin bersama

| Mesin | Diberikan / Ketika / Maka | Bukti |
| --- | --- | --- |
| MB-1 Status peraturan | §3.1 lengkap; ditambah: dokumen tanpa teks (halaman 0, misalnya `juklak-7-2024`) berstatus `tidak_bisa_dicek`, bukan BERLAKU menurut teks | `python3 -I scripts/bnpb/hukum.py --cek`; G-2 |
| MB-2 Jam Aturan | §2.1; tiap kunci lolos G-1; tiap pembaca (meja, pengingat, pipeline) memakai nilai yang sama: uji kembar membaca berkas dari JS dan Python dan membandingkan 20 kasus | `node --test tests/agen/gerbang-jam-aturan.test.mjs tests/bnpb/unit_kembar.test.mjs` |
| MB-3 Pemanen JDIH daerah | dengan 5 halaman JDIHN tersimpan (fixture): judul "Rencana Penanggulangan Bencana Daerah Tahun 2025-2029" memberi periode 2025-2029 status `berlaku`; judul tanpa periode memberi penetapan + 5 tahun berlabel "diduga" (riset 1 PSPB-1); jeda antar permintaan ≥ 1 detik dan cache 30 hari (U5) dibuktikan dengan jam palsu di uji; halaman galat 5xx memberi `tidak_bisa_dicek`, bukan `tidak_ditemukan` | `python3 -I scripts/bnpb/unit/jdih_daerah.py --cek` |
| MB-4 Skor prioritas | §2.2 | `python3 -I scripts/bnpb/unit/skor.py --cek` |
| MB-5 Neraca kebutuhan | §2.3 | `python3 -I scripts/bnpb/unit/neraca.py --cek`; kembar JS untuk kalkulator klien |
| MB-6 Rapor dari data | tiap indikator rapor membawa `rumus` (teks), `masukan` (berkas dan tanggal), dan `nilai`; indikator dengan masukan kosong tampil "belum ada data" dan tidak ikut rata-rata; kartu lolos G-3 | `npm run uji:layar`; G-3 |
| MB-7 Penerima dokumen | dari 3 PDF Laphar tersimpan (fixture, teks hasil `pdftotext -layout`), pengurai yang sudah ada (`public/laporan_urai.js`) memberi baris berlabel `resmi`; dari 3 artikel fixture berlabel `sekunder`; tidak ada baris yang masuk tabel tanpa ketuk setuju staf (uji rute: `POST` setuju oleh tamu ditolak 403, oleh staf 200, baris kedua dengan kunci sama idempoten) | `npm run uji:wa`; `npm run uji:warga` |
| MB-8 Panen sumber terbuka | dengan tangkapan tersimpan CKAN `package_search`, layer ArcGIS agregat kab, API INALOGPAL `get_progress`, dan satu halaman SIRUP: tiap keluaran membawa `atribusi` (URL dan tanggal tarik); permintaan ArcGIS memakai daftar `outFields` tertulis, bukan `*` (G-5); bila sumber berubah bentuk, skrip keluar bukan 0 dan berkas lama dipertahankan dengan tanggalnya | `python3 -I scripts/bnpb/unit/panen.py --cek`; G-5 |

---

## 5. Kriteria terima per sistem

Format kolom: Diberikan (keadaan awal) / Ketika (aksi) / Maka (hasil terukur). "Layar" berarti kartu di `/bnpb/unit/<kode>` yang lolos G-3, G-4, dan uji render L7. Semua layar: staf saja (G-4), angka berlabel sumber (G-3), tanpa data pribadi (§7.1).

### 5.1 F1 (15 sistem)

| ID | Diberikan | Ketika | Maka | Perintah bukti |
| --- | --- | --- | --- | --- |
| PERB-1 | `ikd.json`, `kerentanan.json`, `risiko_hvc.json`, `terpapar.json`, `iku.json` di repo | pipeline jalan | daftar urut kab dengan manfaat, biaya proksi, dan alasan; kasus §2.4 cocok 1e-5; tiap baris berlabel "bukan IRB resmi" dan "C proksi" | `python3 -I scripts/bnpb/unit/perb1.py --cek && node --test tests/bnpb/unit_perb1.test.mjs` |
| PUS-1 | tangkapan CKAN (`organization_list`, `package_search`) | pipeline jalan | per produsen: jumlah dataset, umur median, persen metadata wajib terisi (`notes`, `license_id`, `maintainer`, `frequency`), persen data prioritas terbit; produsen 0 dataset tampil 0 (itu data, bukan kosong); kasus basi §2.7 | `python3 -I scripts/bnpb/unit/pus1.py --cek` |
| PD-3 | satu peringatan per tingkat (Waspada, Siaga, Awas) dan konteks `terpapar.json`, `siaga.json` | `pesanStandar(peringatan, konteks)` | tepat enam baris berurutan sesuai Pasal 20 ayat (2); tingkat dan warna dari ayat (4); unsur kosong "belum ada data"; tidak ada tombol kirim otomatis ke warga (Perban 4/2022 Pasal 7) | `node --test tests/bnpb/unit_pd3.test.mjs` |
| KS-4 | `siaga.json`, `risiko_hvc.json`, `dibi_kab_tahun.json` | pipeline jalan | per kab: bulan gladi (kasus §2.7), bahaya yang dilatih, kerangka skenario dari kejadian terburuk DIBI; kab tanpa musim tanpa saran | `python3 -I scripts/bnpb/unit/ks4.py --cek` |
| KPOD-2 | berkas Jam Aturan | G-1 jalan | semua kunci §2.1 ada, bersitasi atau berlabel asumsi; meja dan pengingat membaca berkas ini (F0-2) | `node --test tests/agen/gerbang-jam-aturan.test.mjs` |
| KPOD-3 | PDF Laphar hari itu di R2 `wa/…` (fixture lokal 3 hari) | langkah otomatis Mac mini (riset 3 A3) | `data/raw/laphar/hari/YYYY-MM-DD.json` tertulis; medan `pendampingan` terisi; `laphar_riwayat.json` `cakupan.sampai` maju satu hari; yang di-commit tetap agregat (tanpa nama petugas, §7.1) | `npm run uji:wa`; `node --test tests/bnpb/unit_kpod3.test.mjs` |
| PLP-1 | `terpapar.json`, `dibi_kab_tahun.json`; stok dari meja `gudang` bila ada | pipeline jalan | 514 baris; kasus §2.3 S1 sampai S10; uji balik DIBI dengan sha256 masukan | `python3 -I scripts/bnpb/unit/plp1.py --cek` |
| RRX-1 | `status_darurat.json`, `dibi_kejadian.json`, meja `rehab` | pipeline jalan | kasus §2.6 X1 sampai X9; tiap jam membawa nomor SK | `python3 -I scripts/bnpb/unit/rrx1.py --cek && node --test tests/warga/unit_alur.test.mjs` |
| RRP-3 | unit dari RRP-1 bila ada, isian staf bila tidak | kalkulator di peramban | kasus §2.5 J1 sampai J6; CSV unduhan sesuai kolom lampiran 7; tidak ada data yang dikirim ke server (uji: tidak ada `fetch` POST di berkas) | `node --test tests/bnpb/unit_rrp3.test.mjs` |
| RRS-3 | jejak bahaya kejadian (fixture banjir poligon dan MMI ≥ VII) dan referensi sekolah fixture | silang | daftar sekolah dan puskesmas di dalam jejak urut murid; selisih terhadap `f_pendidikan` DIBI kab ditandai; keluaran hanya lewat rute staf | `python3 -I scripts/bnpb/unit/rrs3.py --cek` |
| REN-1 | 22 komponen RB di `data/kajian-bnpb/pustaka/5-lakip.md` | pipeline jalan | tabel komponen, bobot, nilai, poin hilang, pemilik; kasus §2.7 | `python3 -I scripts/bnpb/unit/ren1.py --cek` |
| REN-3 | berkas Jam Aturan | layar kalender | tiap tenggat tampil dengan pasal; tenggat hari kerja sesuai §2.1 | `python3 -I scripts/bnpb/unit/ren3.py --cek && node --test tests/bnpb/unit_ren3.test.mjs` |
| KEU-1 | satu PDF atau XLSX draf di folder di luar git | `keu1.py` jalan lokal | laporan selisih berhalaman; kasus §2.7; berkas masukan tidak pernah ter-commit (G-5 butir c) | `python3 -I scripts/bnpb/unit/keu1.py --cek` |
| HUK-1 | `katalog.json` sesudah F0-1 | layar hukum | pil konflik per dokumen; daftar konflik bisa diunduh untuk Biro Hukum (U7) | §3.1 dan `python3 -I scripts/bnpb/unit/huk1.py --cek` |
| JF-1 | `data/raw/hukum/teks/perban-nomor-5-tahun-2024.json` | pengurai jalan | jumlah kode PB terurai = jumlah kode `PB.\d\d` unik di teks (riset 6 J1 membaca 58); tiap kode punya 5 level; pemetaan jenjang bawaan berlabel "bawaan" | `python3 -I scripts/bnpb/unit/jf1.py --cek` |

Catatan untuk JF-1: asersi "sama dengan 58" adalah potret. Invarian yang dipakai: jumlah kode terurai sama dengan jumlah kode unik yang ditemukan regex di teks, dan tidak ada kode tanpa 5 level. Angka 58 dicetak di pesan uji sebagai pembanding.

### 5.2 F2 (31 sistem)

Sistem F2 yang menunggu jawaban pemilik diuji hanya untuk bagian yang tidak menunggu; bagian yang menunggu masuk `antre` di registri dengan nomor pertanyaannya.

| ID | Kriteria terima inti | Yang wajib ditolak | Perintah bukti | Menunggu |
| --- | --- | --- | --- | --- |
| PERB-2 | kerugian per kab dari DIBI x biaya satuan; uji balik ke angka resmi 2025 (Rp51,3 T); selisih > 30% = layar "belum layak" alih-alih angka (riset 1 PERB-2) | angka tampil ketika uji balik gagal | `python3 -I scripts/bnpb/unit/perb2.py --cek` | biaya satuan (riset 1 §1.6 butir 2) |
| PSPB-1 | 552 baris (514 + 38); status `berlaku`, `habis`, `tidak_ditemukan`, `sesuai_3_2026` dari MB-3; `tidak_ditemukan` berlabel "bukan berarti tidak punya" | baris ganda per pemda | `python3 -I scripts/bnpb/unit/pspb1.py --cek` | U5 |
| PSPB-3 | A-1 per 100.000 penduduk rata-rata bergulir 10 tahun; B-1 per 100.000; E dari PSPB-1 | penduduk nol memberi `null` | `python3 -I scripts/bnpb/unit/pspb3.py --cek` | |
| SPB-1 | matriks fase x jenis bencana x jenis NSPK berisi jumlah dokumen berlaku efektif (sesudah F0-1); target Renstra Lampiran III (kutipan manual sekali, dibekukan sebagai fixture) sudah atau belum terbit | dokumen TIDAK BERLAKU terhitung di matriks | `python3 -I scripts/bnpb/unit/spb1.py --cek` | |
| PUS-2 | KIB usulan 16 digit; contoh Juknis 7/2023 banjir Kab. Bogor 19 Sep 2023 = `3201101202309191`; cocok DIBI bila 15 digit pertama sama dengan toleransi tanggal ±2 hari; label selalu "KIB usulan" | jenis tanpa kode (kecelakaan) diberi KIB; kata "KIB resmi" di layar | `python3 -I scripts/bnpb/unit/pus2.py --cek && node --test tests/warga/unit.test.mjs` (fungsi `kib()` di `src/pusdalops_umum.js`) | |
| PD-1 | §2.7; rapor 4-bulanan terbentuk dari D1 `peringatan` dan logbook/DIBI | rapor tanpa pembanding n | `python3 -I scripts/prediksi/rapor_peringatan.py --cek` | U11 untuk umpan WA (rute `POST /api/ews/umpan` masuk `antre`) |
| PD-2 | desa terlayani bila jarak ≤ r (bawaan 2 km berlabel hipotesis); cakupan = penduduk terlayani / penduduk terpapar tinggi; label "batas bawah dari OSM" | radius tanpa label | `python3 -I scripts/bnpb/unit/pd2.py --cek` | U10 |
| KS-1 | status `berlaku`, `segera_habis`, `kedaluwarsa`, `perlu_reviu` dari Jam Aturan; RPKB `perlu_mutakhir` bila ada kejadian berstatus sesudah penetapan | angka berlabel selain "batas bawah" | `python3 -I scripts/bnpb/unit/ks1.py --cek` | U5 |
| KS-3 | desa terpapar tinggi tanpa titik evakuasi kandidat dalam d (tsunami 1 km, berlabel dugaan) | kandidat disebut "lokasi evakuasi resmi" | `python3 -I scripts/bnpb/unit/ks3.py --cek` | |
| MT-1 | RAB = komponen x volume x harga dari tabel Juklak 2/2026; komponen di atas standar ditandai; lebih dari satu keluaran ditolak; tidak ada simpan D1 di tahap awal | usulan dua keluaran | `python3 -I scripts/bnpb/unit/mt1.py --cek && node --test tests/bnpb/unit_mt1.test.mjs` | riset 2 §4 butir 4 |
| MT-2 | 1 sampai 3 kegiatan per kab dari pemetaan bahaya ke kode 02.01.xx; label "usulan analis" | kegiatan tanpa kode | `python3 -I scripts/bnpb/unit/mt2.py --cek` | |
| MT-3 | kab yang masuk musim 1 sampai 2 bulan ke depan dapat paket konten; porsi lansia dan balita agregat desa | kolom by name | `python3 -I scripts/bnpb/unit/mt3.py --cek` | |
| KPOD-1 | §2.7; angka LAKIP tampil berdampingan; kata kunci pendampingan diuji pada 50 entri berlabel tangan (fixture) sebelum tampil (riset 3 A1) | presisi < 0,8 pada 50 entri = kartu tidak tampil | `python3 -I scripts/bnpb/unit/kpod1.py --cek` | |
| WIL-1 | `dit_wilayah.json` 38 provinsi + IKN, tiap provinsi tepat satu direktorat, cocok teks Pasal 74, 77, 79A Perban 11/2025; antrean §2.7 | provinsi di dua direktorat atau tidak di mana pun | `python3 -I scripts/bnpb/unit/wil1.py --cek && node --test tests/bnpb/unit_wil1.test.mjs` | |
| WIL-2 | §2.3 K1 sampai K5; migrasi `pengungsian_*` diuji L4 (CHECK jenis, PK `tempat_id+tanggal`, tanpa kolom nama dan kontak); rekap publik sembunyikan tempat < 10 jiwa | tempat < 10 jiwa muncul di rekap; kolom kontak koordinator | `python3 -I scripts/bnpb/unit/wil2.py --cek && npm run uji:warga` | U11 (jalur WA), riset 3 §8 butir 4 |
| WIL-3 | draf laporan awal terisi dari laporan warga, sinyal, `terpapar.json`; rekomendasi berlabel "saran"; gempa tidak pernah Siaga; rute pra-isi tanpa baca D1 (§7.2) | rekomendasi tanpa label saran | `npm run uji:warga` | |
| PLP-2 | §2.2 A10 dan P2; label "daftar pendek, keputusan tetap di rapat" | kriteria rapat diskor mesin | `python3 -I scripts/bnpb/unit/plp2.py --cek` | U10 (riwayat hibah) |
| PLP-3 | tenggat 12 bulan sesudah BAST berlabel asumsi; peringatan 90 dan 30 hari sebelum kedaluwarsa | nomor WA pribadi di tabel (§7.1) | `python3 -I scripts/bnpb/unit/plp3_impor.py --cek && npm run uji:warga` | U10, U11 |
| OJL-2 | saran pindah stok musiman dari O1 dan P1; saran jelang kejadian bila jam tempuh > 24 jam; tiap saran membawa masukan pemicunya; label "prediksi dinilai prospektif" | saran tanpa masukan pemicu | `python3 -I scripts/bnpb/unit/ojl2.py --cek` | O1 (F3) untuk jam tempuh; tanpa O1 hanya bagian musiman |
| OJL-3 | §2.7; Api berubah bentuk = keluar bukan 0, berkas lama tetap dengan tanggal terlihat | nama dan nomor PIC anggota klaster di keluaran | `python3 -I scripts/bnpb/unit/ojl3.py --cek` | U4 |
| RRP-1 | §2.3 R1 sampai R4; hanya agregat kab | titik per rumah dipanen | `python3 -I scripts/bnpb/unit/rrp1.py --cek` | U4 |
| RRP-2 | usulan baris berlabel `sekunder` dengan URL dan tanggal; masuk tracker `pemulihan` hanya sesudah ketuk staf; presisi ekstraksi diukur pada 30 artikel berlabel tangan | baris tanpa URL sumber; tulis tanpa ketuk | `python3 -I scripts/bnpb/unit/rrp2.py --cek && npm run uji:warga` (rute `POST /api/pusdalops/pemulihan/terima`) | |
| RRI-1 | titik dari beberapa sumber disatukan bila ≤ 200 m dan desa sama; kelas pemilik dari OSM ≤ 50 m berlabel estimasi; tanda "aset desa: tidak bisa hibah RR (Perban 4/2024 Pasal 5 huruf e)"; tabel `akses_status` CHECK status diuji L4 | status di luar `putus`, `darurat`, `pulih` | `python3 -I scripts/bnpb/unit/rri1.py --cek && npm run uji:warga` | U4 |
| RRS-1 | bila kalibrasi P(puso) tidak mengalahkan pembanding rata-rata kab, keluaran hanya luas tergenang (riset 5 S1); kriteria uji dikunci sebelum hasil dilihat | rupiah tampil ketika kalibrasi gagal | `python3 -I scripts/bnpb/unit/rrs1.py --cek` | |
| REN-2 | rasio pangsa belanja / pangsa kebutuhan; < 0,5 pada 20% kab teratas = "kurang dilayani"; paket berlokasi pusat dilaporkan terpisah; catatan "RUP adalah rencana" | paket pusat dihitung ke DKI | `python3 -I scripts/bnpb/unit/ren2.py --cek` | |
| SDU-1 | §2.7; kelompok kandidat konsolidasi dengan label "kandidat"; ambang PL dari Perpres PBJ yang berlaku dicatat di Jam Aturan dengan acuannya | nama penyedia di keluaran; kata "pemecahan paket" | `python3 -I scripts/bnpb/unit/sdu1.py --cek` | |
| HUK-2 | regex kalimat delegasi per pasal; amanat terpenuhi bila ada dokumen lebih baru yang merujuk pasal itu atau judulnya cocok; contoh wajib: Perban 4/2025 Pasal 38, 41 ayat (2), 52 ayat (2), 53 ayat (3) terdeteksi sebagai amanat | amanat dari dokumen TIDAK BERLAKU efektif | `python3 -I scripts/bnpb/unit/huk2.py --cek` | |
| IRT-1 | §2.7; dijalankan sebagai skrip lokal yang menghasilkan laporan untuk pemilik (U9 bawaan), tanpa tabel D1 dan tanpa rute | migrasi yang membuat tabel `tlhp_*` (G-5) | `python3 -I scripts/bnpb/unit/irt1.py --cek` | U9 |
| DIK-1 | §2.2 A5 dan A6; tanpa unggahan alumni, komponen celah layanan tidak ada dan kartu menulis "cakupan belum ada data" | cakupan 0 ditampilkan ketika data tidak ada | `python3 -I scripts/bnpb/unit/dik1.py --cek` | riset 6 §9 butir 6 |
| DIK-4 | daftar calon pengajar per mata pelatihan dari pencocok BM25 `scripts/kemitraan/**`; aturan direktori (tanpa orang terkait kasus KPK) ikut berlaku | calon dari daftar pengecualian direktori | `python3 -I scripts/bnpb/unit/dik4.py --cek && npm run uji:kemitraan` | |
| JF-2 | `kebutuhan = Σ volume x norma_waktu / 1.250 jam`; norma waktu bawaan berlabel "bawaan"; contoh fixture: volume 40 kaji cepat x 25 jam + 12 renkon x 60 jam = 1.720 jam, kebutuhan 1,376 orang | norma waktu tanpa label | `python3 -I scripts/bnpb/unit/jf2.py --cek` | riset 6 §9 butir 7 |

---

## 6. Gerbang mekanis baru

Semua gerbang di `tests/agen/**` (jalan lewat `npm run uji:agen`, pre-push, dan `terbit.yml`), tanpa basis data. Tiap pemeriksa ditulis sebagai fungsi murni dan diuji menolak masukan palsu di berkas yang sama (pola `tests/agen/gerbang-anggaran-cf.test.mjs`). Pemilik pengerja: `penulis-gerbang`.

### 6.1 Daftar gerbang

| Kode | Berkas | Menjaga | Masukan palsu yang wajib ditolak di uji dirinya |
| --- | --- | --- | --- |
| G-1 | `tests/agen/gerbang-jam-aturan.test.mjs` | tiap kunci Jam Aturan punya `acuan` yang ada di `katalog.json` dengan status efektif BERLAKU (sesudah F0-1, jadi juga tidak di daftar `konflik`), `letak`, dan `kutipan` yang ditemukan (spasi dinormalkan) di `data/raw/hukum/teks/<slug>.json`; atau `asumsi: true` dengan `catatan` tidak kosong. Tidak ada objek `AMBANG = {` atau literal tenggat bernama di luar berkas Jam Aturan (`src/meja_spek.js`, `src/pengingat.js`, `public/inti/status_pedoman.js`, `scripts/bnpb/unit/**`) | kunci beracuan `perka-1-2012`; kunci dengan kutipan yang tidak ada di teks; kunci tanpa `letak` dan tanpa `asumsi`; `asumsi: true` dengan `catatan` kosong; berkas `src/x.js` yang memuat `dsp_spj_hari: 30` |
| G-2 | `tests/agen/gerbang-status-hukum.test.mjs` | §3.1 invarian | katalog fixture dengan satu relasi mencabut antardokumen BERLAKU |
| G-3 | perluasan `tests/agen/gerbang-kartu-std.test.mjs` | tiap `public/bnpb/unit/*.js` yang merender kartu ada di `LAYAR` (meta-uji: daftar berkas di direktori dibandingkan dengan `LAYAR`, sehingga layar baru yang lupa didaftarkan gagal); syarat kartu standar yang sudah ada (`.ex-std`, `.ex-ey`, `.hl`, tanpa "Sumber: " dan tanpa `.ex-ft`) | berkas `public/bnpb/unit/contoh.js` fiktif yang tidak terdaftar |
| G-4 | `tests/agen/gerbang-ruang-unit.test.mjs` butir a | tiap jalur `/bnpb/unit` dan `/bnpb/unit/<kode>` tercatat di `HTML_RUTE` dan tidak ada di `PUBLIK_TANPA_SESI` (`src/worker.js`); tiap rute `/api/unit/*` memanggil `stafOK`, atau `modAtauStaf` untuk berkas di `DATA_UNIT_TERBATAS` dan semua rute tulis (KA §8, KEAMANAN-PRIVASI §2.3). Bukti perilaku ada di uji rute L5 (§7.4) | jalur unit di `PUBLIK_TANPA_SESI` |
| G-4 | butir b | tiap JSON keluaran Ruang Unit (fixture R2 `unit/<nama>.json`) punya kepala DT `dibuat`, `sumber`, `label`, `basi_jam`; tiap angka yang berada di kunci `nilai` punya saudara `sumber` dengan `label` ∈ {`resmi`, `sekunder`, `hitungan_kita`, `proksi`} (DT §4.6; asumsi lewat entri Jam Aturan `asumsi: true` atau konstanta berlabel, ALGORITMA §0.3), `asal` (berkas atau URL), dan `tanggal` | berkas tanpa `dibuat` atau `basi_jam`; angka tanpa `sumber`; label di luar daftar |
| G-4 | butir c | layar menaruh sumber per angka sebagai atribut (`data-sumber` dan `title`) pada elemen angka, bukan kaki kartu; uji render L7 memeriksa tiap `.hl` dan tiap sel angka `.ex-tabel` | `.hl` tanpa `data-sumber` |
| G-4 | butir d | label wajib per sistem ada di keluarannya: PERB-1 "bukan IRB resmi", PUS-2 "KIB usulan", PLP-2 "daftar pendek", SDU-1 "kandidat konsolidasi", WIL-3 "saran"; kata terlarang tidak ada: nama platform lama (daftar kata yang sama dengan aturan pemilik "tanpa nama lama, tulis Centurisk97"), "IRB resmi" tanpa "bukan", "KIB resmi", titik tengah (gerbang titik tengah yang sudah ada diperluas ke `public/bnpb/unit/**` bila belum mencakup) | layar fixture yang memuat nama platform lama |
| G-4 | butir e | registri `tests/bnpb/unit_cakupan.json` punya tiga daftar; tiap ID F1 dan F2 dari tabel `KEPUTUSAN-AWAL.md` §5.1 ada di `diuji`, `dikecualikan`, atau `antre`; `antre` hanya boleh menyusut (jumlah dibandingkan dengan nilai di registri itu sendiri, pola `tests/warga/cakupan.json`) | ID F1 yang tidak terdaftar; `antre` bertambah |
| G-6 | butir f | tiap kartu di `public/bnpb/unit/**` membawa ID yang ada di tabel §5.1 dengan fase F1 atau F2; tidak ada kartu untuk ID berfase F3 atau T | kartu `WIL-4` (F3) |
| G-5 | `tests/agen/gerbang-privasi-unit.test.mjs` | §7.1 | lihat §7.1 |

Gerbang G-1 membaca katalog dan teks di `public/data/bnpb/hukum/` dan `data/raw/hukum/teks/`. Bila berkas teks belum diunduh dari iCloud (riset 3 §9 mencatat berkas korpus sempat tertahan), gerbang gagal dengan pesan "berkas teks <slug> tidak terbaca (iCloud?)", tidak pernah lolos diam-diam.

### 6.2 Masuk daftar `LAYAR` kartu standar

Tiap layar baru Ruang Unit ditambahkan ke `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs` di commit yang sama dengan layarnya, dengan bentuk:

```js
{skrip: 'public/bnpb/unit/plp.js', html: 'public/bnpb/unit/plp.html', lama: []},
```

Pintu `/bnpb/unit` (kartu per kedeputian) juga masuk `LAYAR` bila ia merender kartu temuan. Layar lama yang dipakai ulang lewat tautan (kinerja, perencanaan, siaga, hukum, meja) tidak didaftarkan ulang kecuali kartu Ruang Unit ditaruh di dalamnya; bila riset menyarankan "tab baru di `public/bnpb/kinerja.js`" dan DESAIN-TEKNIS mengikutinya, layar itu wajib masuk `LAYAR` juga (Catatan butir 2).

---

## 7. Uji privasi, kuota D1, basi, dan staf saja

### 7.1 Privasi (G-5, `tests/agen/gerbang-privasi-unit.test.mjs`)

Prinsip 6 `KEPUTUSAN-AWAL.md`: tidak memanen nama, kontak, atau tanggal lahir orang.

| Butir | Diperiksa | Ditolak |
| --- | --- | --- |
| a | kolom tabel di migrasi Ruang Unit (0110 ke atas yang menyebut tabel unit) dan kunci JSON keluaran Ruang Unit | nama kolom atau kunci yang cocok `^(nama(_orang\|_pengungsi\|_koordinator\|_pejabat\|_penyedia)?\|nik\|nip\|kk_no\|telepon\|tel\|hp\|wa\|no_wa\|nomor_wa\|email\|surel\|tgl_lahir\|tanggal_lahir\|alamat(_rumah)?)$`; nama tempat, desa, dan lembaga diizinkan lewat daftar putih bernama (`nama_tempat`, `nama_desa`, `nama_lembaga`) |
| b | skrip panen `scripts/bnpb/unit/**` | URL yang memuat `perangkat_penilaian_awal` (layer Survey123 yang membuka data pribadi, U6); `outFields=*` ke `gis.bnpb.go.id`; permintaan ArcGIS tanpa `returnGeometry=false` untuk layer titik rumah |
| c | berkas yang dilacak git | berkas masukan internal KEU-1 dan IRT-1 (pola nama di `.gitignore` yang dicek ada); temuan audit dan nama pejabat tidak pernah di repo publik (riset 6 I1) |
| d | nomor WA (PLP-3, PD-1, DIK-3 bila kelak dibangun) | nomor terang di D1; yang boleh: hash dengan garam dari secret, atau nomor kantor yang disetujui |
| e | rekap publik WIL-2 | tempat dengan < 10 jiwa (riset 3 W2) |

Uji dirinya: satu migrasi fixture dengan kolom `no_wa TEXT`, satu skrip fixture dengan `outFields=*`, satu JSON fixture dengan kunci `nik`; ketiganya wajib gagal dengan pesan yang menyebut berkas dan nama kolom.

### 7.2 Kuota D1

Prinsip 7: hasil hitungan berkala ditulis JSON di R2 `unit/<nama>.json`; D1 hanya untuk isian manusia dan jejak. Batas acuan: D1 Free 5 juta baca per hari (catatan pemilik 28 Okt 2026: kueri cron memakan kuota dan situs mati).

| Uji | Cara | Lolos bila |
| --- | --- | --- |
| Tanpa D1 untuk pengunjung layar unit | Miniflare: buka `/bnpb/unit/<kode>` dan semua `GET /api/unit/*` dengan sesi staf, jumlahkan `meta.rows_read` semua kueri (pola `tests/warga/sihka.test.mjs` baris 226) | 0 baris dibaca untuk rute yang hanya menyajikan JSON R2; untuk rute dengan D1 (meja, pengungsian, akses_status), ≤ 50 baris per permintaan dengan 1.000 baris fixture di tabel |
| Indeks | `EXPLAIN QUERY PLAN` di `node:sqlite` untuk tiap kueri baru (pola `tests/warga/pusdalops_gelombang3.test.mjs` baris 257) | tidak ada `SCAN` atas tabel tanpa `LIMIT` kecil; pesan gagal mencetak rencana kueri |
| Tanpa cron baru yang membaca D1 | `tests/agen/gerbang-anggaran-cf.test.mjs` yang sudah ada | tugas baru di `scheduled()` hanya pada menit tetap; Ruang Unit tidak menambah tugas cron yang membaca D1 (perhitungan di Actions) |
| Tulis | uji rute | tiap tulis isian idempoten per kunci (misalnya `tempat_id+tanggal`), jadi kirim ulang tidak menambah baris |

### 7.3 Basi

| Uji | Lolos bila |
| --- | --- |
| Tiap JSON keluaran Ruang Unit punya `dibuat` (ISO 8601 UTC) dan `basi_jam` (harian 48, mingguan 240, bulanan 1.080; DT §9.4) | G-4 butir b menolak berkas tanpa keduanya |
| Fungsi murni `umurData(dibuat, basi_jam, kini)` (L2) | umur > `basi_jam` = `basi` (ALGORITMA §0.8); selain itu `segar`; `basi_jam` null = `statis`; masukan rusak = `tidak_diketahui` |
| Layar | kartu dengan data basi menampilkan tanggal data dan kata "basi" di pil, tidak menyembunyikan angkanya |
| Pipeline gagal tarik | skrip keluar bukan 0, berkas lama dipertahankan (bukan ditimpa kosong), langkah workflow menulis `::error` untuk keluaran yang dibaca layar keputusan dan `::warning` untuk rapor; diuji dengan fixture galat 5xx di `--cek` |
| Masukan tahunan (REN-1, PERB-1) | berkas dibangun ulang bulanan dengan `basi_jam` 1.080; umur masukan tahunan (LAKIP) dicatat di `sumber`, bukan di `basi_jam`, sehingga LAKIP yang terlambat (riset 6 P1) tidak membuat layar merah sebelum waktunya |

### 7.4 Staf saja (uji perilaku, L5)

Di `tests/warga/unit.test.mjs`, Miniflare, kepala `Host: centurisk97.id`:

| No | Diberikan | Ketika | Maka |
| --- | --- | --- | --- |
| S1 | tamu tanpa sesi | `GET /bnpb/unit` dan `GET /bnpb/unit/plp` | 303 ke `/admin/masuk?ke=…` |
| S2 | tamu | `GET /bnpb/unit/plp.html` langsung | 301 ke jalur bersih atau 404, tidak pernah 200 (pola `BNPB_BERSIH`) |
| S3 | tamu | `GET /api/unit/data/stok_penyangga` | 401, badan tanpa data; nama di luar `DATA_UNIT` juga 401 (tamu tidak tahu berkas ada) |
| S4 | staf dengan peran yang diizinkan | S1 dan S3 | 200; JSON sama dengan objek R2 |
| S5 | akun pemirsa (`src/pemirsa.js`) tanpa tab unit | S1 | dialihkan ke tab pertamanya |
| S6 | staf | `POST` ke rute baca saja | 405 |
| S7 | permintaan dari origin lain | `POST` rute tulis | ditolak `tolakOrigin` |
| S8 | akun gerbang `AKUN_SITUS*` | `GET /api/unit/data/pengadaan` (kelas T), `GET /api/unit/data/stok_penyangga` (kelas S), `POST` rute tulis | 401; 200; 401 (`modAtauStaf`, KEAMANAN-PRIVASI §2.3) |

Catatan: di host workers.dev non-produksi gerbang `hostTerkunci()` tidak berlaku, jadi uji tanpa kepala `Host` produksi akan lolos palsu. Uji S1 tanpa kepala `Host: centurisk97.id` wajib ditulis sebagai pembanding yang menunjukkan perbedaannya.

---

## 8. Jadwal CI

TEST.md butir 4: suite yang menyentuh database sungguhan atau jaringan tidak jalan tiap push.

| Kelompok | Isi | Kapan jalan | Di mana |
| --- | --- | --- | --- |
| Gerbang | G-1 sampai G-6 | tiap push (cepat, tanpa DB, tanpa jaringan) | pre-push (`gerbang-uji-sebelum-push.test.mjs` sudah memasangnya) dan `terbit.yml` langkah `npm run uji:agen` |
| Fungsi murni JS dan render | `tests/bnpb/unit_*.test.mjs` | saat `public/bnpb/**` berubah | `terbit.yml` (dipicu `terbit_antre.yml` hanya untuk perubahan `public/**` selain data, `src/**`, `wrangler.jsonc`); **butuh `mekanik-mesin` menambah langkah `npm run uji:layar` dan merangkainya ke `npm run uji`** |
| D1 dan rute (Miniflare, `node:sqlite`) | `tests/warga/unit*.test.mjs`, `meja.test.mjs`, `pengingat.test.mjs` | saat `src/**` atau `migrations/**` berubah | `terbit.yml` langkah `npm run uji:warga` yang sudah ada |
| Self-check Python tanpa jaringan | `--cek` semua `scripts/bnpb/unit/*.py` | tepat sebelum skripnya menulis keluaran | langkah workflow terjadwal (`data.yml` harian untuk pipeline harian; bulanan untuk pipeline bulanan) |
| Tarikan jaringan sungguhan | MB-3 JDIHN (mingguan, KA §8, U5), MB-8 CKAN dan INALOGPAL (harian, U4), ArcGIS agregat kab (harian), SIRUP (bulanan) | jadwal saja, tidak pernah tiap push | `data.yml` atau workflow bulanan yang sudah ada (`direktori-bulanan.yml` sebagai pola jadwal); tambah tugas di jadwal yang ada, bukan workflow tiap push |
| Peramban | `tests/bnpb/_peramban.mjs` | saat layar berubah; lewat dengan pesan jelas bila Chrome tidak ada | lokal dan `terbit.yml` (runner Ubuntu punya Chrome) |
| Lokal saja | KEU-1, IRT-1 (data internal, U9) | dijalankan pemilik | tidak pernah di CI |

Biaya: tiap langkah baru di `terbit.yml` diukur menitnya pada run pertama dan dicatat di registri cakupan; bila `uji:layar` menambah lebih dari 2 menit, uji peramban dipisah ke dispatch manual.

---

## 9. Catatan untuk sesi induk

1. **`uji:layar` tidak pernah jalan di CI.** `package.json` punya `uji:layar` (`tests/bnpb/*.test.mjs`), tetapi `npm run uji` tidak memanggilnya dan `terbit.yml` hanya menjalankan `uji:agen`, `uji:warga`, `uji:sippa`. Uji layar Ruang Unit yang ditaruh di `tests/bnpb/` (wilayah `ruang-bnpb`) mati sampai `mekanik-mesin` merangkainya. Saya tidak memeriksa apakah `npm run uji:layar` hijau hari ini.
2. **Letak kartu.** `KEPUTUSAN-AWAL.md` §6 menaruh kartu di `/bnpb/unit/<kode>`, sedangkan riset menyarankan tab di layar lama (`kinerja.js` untuk PERB-1, REN-1, PSPB-3; `perencanaan.js` untuk PLP-1; `siaga.js` untuk KS-4; `pendataan.*` untuk PUS-1). Saya mengikuti KEPUTUSAN. Bila DESAIN-TEKNIS memilih tab di layar lama, layar itu wajib masuk `LAYAR` kartu standar.
3. **Masa status 14 hari, 1 bulan, 3 bulan tidak punya pasal JDIH.** Angka itu dari Pedoman Penetapan Status 2016 (non-JDIH, riset 3 §2) dan tertanam di `public/inti/status_pedoman.js` baris 4. Gerbang G-1 akan memaksanya berlabel asumsi. Bila pemilik menganggap pedoman itu sah, perlu cara mencatat acuan non-JDIH di katalog.
4. **Batas kelas IKD.** Riset 1 menyebut ambang 0,40 dan 0,80 tanpa menyebut apakah batasnya inklusif. Saya mengambil sedang 0,40 ≤ C < 0,80. Perlu dicek ke Dit. PERB.
5. **Angka KEU-1 di riset.** Riset 6 §2.2 menulis Biro Keuangan 137,2/143,4 = 95,69%. Hitungan ulang memberi 95,6764%, dibulatkan 95,68%. Kasus acuan memakai 95,68.
6. **F0-3 dan pemicu ubah.** Trigger `meja_catatan_ubah` (0026 baris 68-69) menolak perubahan kaji_id. Sesudah F0-3, rehab yang lahir tanpa kaji_id tidak bisa ditautkan belakangan. Saya mempertahankan perilaku itu (uji R10). Bila pemilik ingin tautan belakangan, trigger perlu diubah dan R10 dibalik.
7. **F0-3 butuh bangun ulang tabel.** CHECK `(meja = 'rehab') = (kaji_id IS NOT NULL)` tingkat tabel; SQLite tidak bisa mengubahnya tanpa membuat tabel baru, menyalin, menghapus, dan mengganti nama, sementara `meja_jejak` dan `meja_stok` ber-FK ke `meja_catatan`. Idempotensi bangun ulang (R3) bukan hal sepele untuk D1; `migrasi-idempoten` wajib memeriksa. Produksi `meja_catatan` 0 baris (riset 5 §3), jadi risiko data kecil, tetapi migrasi tetap dijalankan pemilik di produksi.
8. **Ukuran yang berbeda.** KEPUTUSAN menulis MT-1 dan WIL-2 berukuran M; riset menulis L (MT-1: ekstraksi tabel 278 halaman Juklak 2/2026; WIL-2: migrasi, rute, pengurai WA). Kriteria terima di sini tidak bergantung pada ukuran, tetapi TIKET perlu tahu.
9. **IRT-1 lawan U9.** Riset 6 I1 mengusulkan tabel D1 `tlhp_rek` dan rute admin; U9 bawaan "tidak, skrip lokal". Berkas ini mengikuti U9: G-5 menolak tabel `tlhp_*`.
10. **RRP-1 dan `outFields=*`.** Riset 5 P1 menulis kueri ArcGIS dengan `outFields=*`. G-5 menolaknya dan meminta daftar kolom tertulis, supaya kolom pribadi yang kelak ditambah ke layer tidak ikut terpanen.
11. **Kutipan yang belum saya cocokkan sendiri.** Kutipan untuk `perban-4-2020`, `perban-5-2017`, `perban-2-2023`, `juklak-3-2022` (1 x 24 jam dan 3 x 24 jam), `perka-7-2008`, `perka-23-2014`, `perban-7-2025`, `perban-2-2024` sudah saya cari di teks korpus dan ditemukan. Untuk `trc_bergerak`, `pengungsi_mutakhir` (Juknis 9/2023), `laporan_pelatihan` (Perban 2/2025 Pasal 14), dan Pasal 1 angka 15 Perka 23/2014 saya mengandalkan riset; G-1 yang akan memastikannya. Pangkal 24 jam kaji cepat sudah dipecah jadi tiga kunci (`kaji_mulai`, `trc_bergerak`, `kaji_awal`; ALGORITMA §3.1).
12. **Asumsi kalender.** Aturan pangkas akhir bulan untuk "N bulan" dan "hari kerja tanpa libur nasional" adalah tafsir kita, bukan pasal. Keduanya ditulis sebagai asumsi di berkas Jam Aturan.
