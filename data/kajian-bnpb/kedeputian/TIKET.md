# TIKET Ruang Unit BNPB: daftar kerja berurutan

Versi 1, 5 November 2026. Daftar tiket untuk membangun Ruang Unit BNPB (`/bnpb/unit`): perbaikan F0, mesin bersama MB-1 sampai MB-8 beserta kerangka rute, layar, dan pipeline yang dipakai semuanya, 15 sistem F1, dan 31 sistem F2. Sistem F3 dan T hanya masuk tabel "belum dijadwalkan" (§5). Satu sesi mengambil satu tiket, mengerjakan hanya cakupannya, lalu sesi induk menandai statusnya di §2.

Urutan otoritas (AGENTS.md §2.4): `KEPUTUSAN-UNIT.md` (bila sudah ada) > `KEPUTUSAN-AWAL.md` > `PRD.md` > `DESIGN-SYSTEM.md` > `DESAIN-TEKNIS.md` > `RENCANA-UJI.md` > berkas ini. Berkas ini hanya mengatur urutan, pembagian kerja, dan bukti selesai; isi teknis tetap di dokumen di atasnya dan tidak disalin ulang. Bila tiket bertentangan dengan dokumen di atasnya, dokumen di atasnya menang dan sesi induk membetulkan tiket lebih dulu. Selisih antardokumen saudara yang ditemukan saat menulis tiket ini dikumpulkan di §0.2 dengan bawaan yang dipakai tiket; sesi induk mengesahkan atau membalik bawaan itu di RU-000.

Singkatan: KA = `KEPUTUSAN-AWAL.md`; PRD = `PRD.md`; DS = `DESIGN-SYSTEM.md`; DT = `DESAIN-TEKNIS.md`; RU = `RENCANA-UJI.md`; `kedeputian/` = `data/kajian-bnpb/kedeputian/`. Rujukan ditulis dengan nomor bagian (contoh "DT §4.2").

---

> **Untuk pekerja agen:** tiket dikerjakan satu per satu dengan pola superpowers:subagent-driven-development yang disesuaikan ke AGENTS.md (AGENTS.md menang bila bertentangan; lihat §1.1). Langkah memakai kotak centang (`- [ ]`).

**Tujuan:** F0 selesai dan terbit paling lambat 15 Nov 2026; kerangka, mesin MB-1, MB-2, MB-4, MB-5, MB-6, MB-7 (versi Laphar), MB-8 (versi CKAN), dan 15 sistem F1 terbit di balik sesi staf paling lambat 20 Des 2026; 31 sistem F2 terbit bertahap Januari sampai Maret 2027 (PRD §4.1 sampai §4.3). Tiap sistem berguna dengan data yang sudah ada tanpa isian panjang (KA §3 prinsip 1).

**Arsitektur:** pipeline Python 3.12 stdlib di `scripts/bnpb/unit/` dijalankan satu langkah "Ruang Unit" di `.github/workflows/data.yml` (harian 21.20 WIB), menulis `/tmp/unit/<nama>.json` lalu mengunggahnya ke R2 `poskokarhutla-foto` kunci `unit/` (tidak di-commit, repo publik). Cloudflare Worker `centurisk97` (`src/unit.js` baru, `src/worker.js`) melayani cangkang `/bnpb/unit` dan `/bnpb/unit/:kode` serta rute data staf yang memeriksa sesi sebelum menyentuh R2. D1 `poskowarga` hanya menyimpan isian manusia dan jejak (`unit_ketuk`, `akses_status`, `hibah_bast`, `diklat_angkatan`, `pengungsian_*`). Layar vanilla JS tanpa build step di `public/bnpb/unit/**` hanya memuat kode dan teks antarmuka; semua angka datang dari rute staf. Tenggat dan ambang berpasal hanya di satu tempat, Jam Aturan di `public/inti/` (MB-2). Gambaran lengkap DT §1.1.

**Teknologi:** Cloudflare Worker + D1 + R2; Miniflare untuk uji rute (`tests/warga/_bnpb.mjs`); `node:sqlite` untuk uji skema (`tests/warga/_bantu.mjs`); `node:test`; Chrome headless lewat `tests/bnpb/_peramban.mjs` untuk uji render; Python 3.12 stdlib dengan self-check `--cek`; `wrangler@4.42.0` dari Actions; `pdftotext` di Mac mini untuk Laphar. Tanpa pustaka baru, tanpa CDN.

**Cara kerja agen:** satu pengerja per tiket, satu sampai tiga pemeriksa berkonteks bersih yang bukan pengerjanya (AGENTS.md §1.5, §3.2); pengerja menulis di worktree bila ada tiket menulis lain yang jalan bersamaan (AGENTS.md §3.3); subagent tidak pernah commit, push, atau deploy (AGENTS.md §9); commit, terap migrasi, dan terbit hanya di tiket bertanda **[induk]**; yang hanya bisa dilakukan pemilik ditulis di baris **Pemilik** tiap tiket dan dikumpulkan di §6.

## 0. Batasan global dan putusan selisih

### 0.1 Batasan global (berlaku untuk setiap tiket)

| Batasan | Nilai |
| --- | --- |
| Rute halaman | `/bnpb/unit` dan `/bnpb/unit/:kode`, `kode` di 22 kode KA §1 huruf kecil (`perb pspb spb pus pd ks mt kpod wil plp ojl rrx rrp rri rrs ren keu sdu huk irt dik jf`), selain itu 404 (DT §4.9) |
| Rute data | lihat §0.2 P-1; tamu 401 identik untuk berkas ada dan tidak ada; nama di luar daftar tetap `DATA_UNIT` 404 tanpa menyentuh R2 (DT §4.9) |
| Akses | staf saja (KA prinsip 5, U2 bawaan); tamu `/bnpb/unit*` 303 ke `/admin/masuk?ke=<jalur>`; sesi tanpa peran Ruang Unit 403 polos tanpa pengalihan (DT §1.4); berkas `DATA_UNIT_TERBATAS` dan semua rute tulis memakai `modAtauStaf`, bukan `stafOK`, supaya akun gerbang `AKUN_SITUS*` ditolak (KA §8, P-14) |
| Data | tidak ada data Ruang Unit di `public/` kecuali Jam Aturan (teks pasal publik) dan `public/data/bnpb/hukum/katalog.json` yang sudah publik (DT §1.2 butir 1); hasil hitungan tidak pernah ditulis ke D1 |
| Label angka | tiap angka membawa sumber di atribut `data-sumber` dan `title` serta pil label; tanpa kaki "Sumber:" dan tanpa `.ex-ft` (KA prinsip 3, AGENTS.md §3.5, DS §5, RU §6.1 G-4 butir c) |
| Kartu | `.ex.ex-std` dari `public/inti/kartu.css`; komponen baru hanya `un-*` di `public/bnpb/unit/unit.css` (DS §5.2); tiap layar baru masuk `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs` di commit yang sama |
| Privasi | tanpa nama orang, NIK, NIP, nomor HP, tanggal lahir di R2 `unit/` dan tabel D1 baru; `oleh` = id pelaku; daftar `DILARANG` di `scripts/bnpb/unit/panen.py` (DT §8, §9.2, RU §7.1) |
| Migrasi | nomor dicek ulang `ls migrations/` di awal tiket (terakhir di main 5 Nov 2026: `0109_ai_pengetahuan.sql`; rencana 0110 sampai 0113, DT §2.2; 0110 hanya F0-3, KA §8); idempoten; migrasi yang sudah diterapkan tidak disunting (`tests/warga/migrasi_beku.json`); tiap tabel punya kolom `dummy`; produksi diterapkan pemilik |
| Kuota D1 | tidak ada cron Worker baru; tidak ada pemindaian penuh di jalur permintaan; kueri baru berindeks dan dibuktikan `EXPLAIN QUERY PLAN` (DT §9.3, RU §7.2) |
| Pipeline | Python 3.12 stdlib; tiap skrip punya `--cek` tanpa jaringan yang dijalankan `jalan.py --cek` sebelum menulis; langkah gagal tidak menimpa berkas R2 kemarin; tanpa workflow baru dan tanpa jadwal baru (DT §2.3) |
| Teks | Bahasa Indonesia lugas; angka id-ID lewat `public/inti/format.js` (ribuan titik, desimal koma); tanpa titik tengah U+00B7; tanpa nama platform lama, tulis Centurisk97; BNPB dan BPBD adalah "kita"; label tetap DS §11.4 |
| Model armada | pengerja `sonnet`; pemeriksa berpola (`guard-api`, `migrasi-idempoten`, `higiene-repo`, `selera-angka`) `haiku`; `validasi-model`, `security-reviewer` `sonnet`; `opus` hanya sesi induk (AGENTS.md §1.3) |

### 0.2 Putusan selisih antardokumen (diambil sesi induk di RU-000)

Sesi induk memutus sebagian besar selisih pada 5 Nov 2026 (KA §8); dokumen saudara sudah diselaraskan ke putusan itu. Baris bertanda **bawaan** masih menunggu RU-000.

| No | Selisih | Putusan | Status |
| --- | --- | --- | --- |
| P-1 | Bentuk kunci R2 dan rute data | R2 `unit/<nama>.json`; `GET /api/unit/data/:nama` dan `GET /api/unit/indeks` sesudah `stafOK` (DT §4.9) | diputus KA §8 |
| P-2 | Nama peran staf baru | `unit` (migrasi 0111), daftar `P_UNIT_BACA` dan `P_UNIT_TULIS` bentuk DT §1.4 | diputus KA §8 |
| P-3 | Bentuk Jam Aturan | data `public/inti/jam_aturan.json`, fungsi `public/inti/jam_aturan.js`; tanpa berkas bangkitan dan tanpa butir kembar di gerbang DT §4.2 | diputus KA §8 |
| P-4 | Bangun ulang `meja_catatan` | 0110 hanya F0-3; RPBD, RPKB, tahap R3P, dan kaji cepat dua tahap lewat `unit_ketuk` atau hitungan, tanpa bangun ulang kedua | diputus KA §8; RU-009 tidak lagi ditahan |
| P-5 | Skrip uji layar. DT §2.1: `uji:unit` baru. `package.json` sudah punya `uji:layar` (`tests/bnpb/*.test.mjs`), yang tidak dirangkai ke `uji` dan tidak jalan di `terbit.yml` (RU §0.4, §9 butir 1) | rangkai `uji:layar` ke `uji` dan `terbit.yml`; tanpa `uji:unit` | **bawaan**, menunggu RU-000; alasan: `tests/bnpb/unit_*.test.mjs` sudah tercakup glob `uji:layar` |
| P-6 | Pengerja `public/inti/jam_aturan.*` | `inti-layar`; berkas uji di `tests/bnpb/` (milik `ruang-bnpb`) boleh ditulis pengerja yang sama dalam tiket MB-2 atas izin sesi induk | diputus KA §8 |
| P-7 | Kepala berkas R2 | kunci DT: `dibuat`, `basi_jam` (harian 48, mingguan 240, bulanan 1.080), `label` dari `resmi`, `sekunder`, `hitungan_kita`, `proksi`; teks pil di layar menurut DS §11.4 | diputus KA §8 |
| P-8 | Tujuan pengalihan tamu | `/admin/masuk?ke=<jalur>` | diputus KA §8 |
| P-9 | Hak baca. PRD §3.2: entri `unit: SEMUA_PERAN` di `HALAMAN_STAF` `src/admin_halaman.js`. DT §2.1: `HALAMAN_STAF` tidak disentuh, Ruang Unit bukan halaman `/admin/*`, hak lewat `P_UNIT_BACA` | DT, ditambah tautan di `GRUP_STAF` | **bawaan**, menunggu RU-000; alasan: `/bnpb/unit` tidak dilayani cangkang admin; perlu konfirmasi sesi induk karena PRD menang |
| P-10 | Jumlah F0-1 | 13 terbukti; uji memakai invarian (RU §0.2), bukan angka | diputus KA §5.0 |
| P-11 | Nama skrip dan nama uji | nama skrip, kunci kepala JSON, dan nama berkas kode menurut DT; nama berkas uji dan gerbang menurut RU | diputus KA §8 |
| P-12 | Letak kutipan untuk gerbang G-1. RU §6.1: `data/raw/hukum/teks/<slug>.json` (tidak di git). DT §4.2 butir 2: baris `hukum_segmen` di `data/hukum/seed.sql` (di git) | DT | **bawaan**, menunggu RU-000; alasan: gerbang harus jalan di checkout bersih (RU §0.1 butir 1) |
| P-13 | MB-4 di F1 atau F2 | F1 (RU-027), karena PERB-1 (F1) memakainya; rumus ALGORITMA §5.2 | diputus KA §8 |
| P-14 | Akun gerbang `AKUN_SITUS*` lolos `stafOK` (KEAMANAN-PRIVASI §2.3) | berkas kelas terbatas (`DATA_UNIT_TERBATAS`) dan semua rute tulis memakai `modAtauStaf`; celah yang sama di rute Dalops ditutup di RU-109 | diputus KA §8 |

---

## 1. Aturan yang berlaku untuk semua tiket

1. **Gerbang konteks dulu** (AGENTS.md §0): `node scripts/agents/ilmu.mjs pemilik <berkas>` untuk tiap berkas di baris **Berkas**, `node scripts/agents/ilmu.mjs baca <agent>`, lalu ucapkan kontrak CAKUPAN (baris **Berkas**), DI LUAR (baris **Di luar**), BUKTI SIAP (baris **Bukti**). Bila pemilik berkas berbeda dari pengerja tiket, berhenti dan tanya sesi induk.
2. **Baca dulu, baru bangun** (AGENTS.md §2.4): bagian dokumen di baris **Rujukan** dibaca sebelum menulis kode. Bila tiket kurang atau bertentangan dengan dokumen, berhenti dan tanya sesi induk; jangan mengarang arah.
3. **Satu pengerja, satu sampai tiga pemeriksa, pemeriksa bukan pengerja yang sama** (AGENTS.md §1.5, §3.2, §6). Pemeriksa memeriksa sinyal nyata (perintah bukti hijau, uji yang menolak masukan salah), melapor, tidak membetulkan.
4. **Isolasi** (AGENTS.md §3.3): tiket menulis yang jalan bersamaan dengan tiket menulis lain memakai `isolation: "worktree"`, paling banyak 4 sampai 5 bersamaan. Sesudah agen selesai: `git worktree unlock` bila terkunci, merge ke `main` oleh sesi induk, hapus branch dan worktree di sesi yang sama, `git branch` hanya menyisakan `main`. `data/raw/**` tidak ikut worktree; tiket yang membaca `data/raw/hukum/teks/` (RU-002, RU-050) dijalankan di checkout utama tanpa worktree.
5. **Batas mati** (AGENTS.md §9): subagent tidak commit, tidak push, tidak `wrangler deploy`, tidak menerapkan migrasi ke `--remote`, tidak melonggarkan gerbang, tidak menyunting berkas `* 2.*`, tidak menaruh secret di berkas terlacak.
6. **Prompt subagent** memuat baris "You are a subagent. Don't run memo. Do not commit, push, or deploy." dan menyebut berkas atau glob, bukan domain.
7. **Uji mengikuti letak logika** (`~/.claude/TEST.md`, RU §1.1): fungsi murni Python = `--cek`; fungsi murni JS = `node:test`; CHECK, trigger, indeks D1 = SQL langsung di `node:sqlite` dengan migrasi apa adanya; rute = worker utuh di Miniflare dengan kepala `Host: centurisk97.id`; alur lintas tabel = satu uji ujung ke ujung. Tiap uji membuktikan yang salah DITOLAK, memakai invarian (bukan potret data), dan pesan gagalnya menyebut angka dan sebab teknis.
8. **Registri cakupan**: tiap rute, tabel, trigger baru masuk `tests/warga/cakupan.json`; tiap pipeline, fungsi murni, layar masuk `tests/bnpb/unit_cakupan.json` (RU §0.1 butir 2); daftar `antre` hanya boleh menyusut.
9. **Selesai berarti** (RU §0.1): perintah **Bukti** keluar 0 di checkout bersih, butir terdaftar di registri, pemeriksa tanpa temuan kritis terbuka, angka di layar cocok dengan kasus acuan RU §2. Status `selesai` di §2 diberikan sesi induk saat commit.

### 1.1 Prosedur eksekusi standar

Sesi induk, per tiket:

- [ ] Ambil ringkasan tiket: `mkdir -p .superpowers/sdd/TIKET && awk -v id=RU-NNN '/^#### RU-/{p=($2==id)} /^##+ [0-9]/{p=0} p' data/kajian-bnpb/kedeputian/TIKET.md > .superpowers/sdd/TIKET/RU-NNN-brief.md`
- [ ] Catat BASE (`git rev-parse HEAD` di worktree tiket) di `.superpowers/sdd/TIKET/progress-unit.md`. Tiket bertanda `RU-NNN: complete` di sana tidak dikirim ulang.
- [ ] Kirim pengerja (agen di baris **Pengerja**) dengan: posisi tiket; jalur ringkasan; antarmuka dari tiket hulu yang sudah selesai; putusan §0.2 yang menyangkut tiket; jalur laporan `.superpowers/sdd/TIKET/RU-NNN-report.md`; baris prompt §1 butir 6.
- [ ] Pengerja bekerja TDD untuk logika tidak sepele: uji gagal dulu karena alasan yang benar, kode minimal, uji hijau, perintah **Bukti** dijalankan, laporan ditulis (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED; berkas berubah; keluaran bukti; keraguan).
- [ ] Paket tinjauan `git -C <worktree> diff BASE --stat` dan `git -C <worktree> diff -U10 BASE` ke `.superpowers/sdd/TIKET/RU-NNN-review.md`; kirim pemeriksa (konteks bersih). Vonis wajib dua: sesuai spesifikasi dan mutu.
- [ ] Putaran perbaikan paling banyak 5 (1 sampai 3 pengerja yang sama, 4 sampai 5 pengerja baru); temuan kecil dicatat `RU-NNN: minor (ditunda): ...`; putusan atas selisih dicatat `Ruling: <putusan> | <alasan> | <biaya bila salah>`.
- [ ] Selesai: `RU-NNN: complete (worktree <nama>, tinjauan bersih)`, status §2 menjadi `tinjau`; status `selesai` diberikan tiket [induk] yang meng-commit.

`.superpowers/` sudah di-gitignore (SIPPA SP-003). Ukuran: **S** kurang dari setengah hari sesi, **M** sekitar satu hari sesi. Tidak ada tiket L: sistem ukuran L (MT-1, WIL-2) dipecah per sub-langkah.

---

## 2. Papan status

Urutan baris = urutan nomor; urutan ambil yang disarankan ada di kolom Gel. (§4). Status: `belum`, `jalan`, `tinjau`, `selesai`, `tertahan (<penghambat>)`.

| ID | Judul | Pengerja | Pemeriksa | Gel. | Ukuran | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RU-000 | [induk] Kontrak, rakitan, putusan §0.2 | sesi induk | pemilik | 0 | S | selesai 5 Nov |
| RU-001 | F0-1 pembaca daftar pencabutan di `hukum.py` | `ruang-bnpb` | `penulis-gerbang` | 1 | S | selesai 5 Nov |
| RU-002 | F0-1 bangun ulang katalog dan seed | `ruang-bnpb` | `higiene-repo` | 2 | S | selesai 5 Nov |
| RU-003 | F0-1 `dicabut_oleh` di `src/hukum.js` | `warga-api` | `guard-api` | 3 | S | selesai 5 Nov |
| RU-004 | F0-1 pil "dicabut menurut teks" di layar hukum | `ruang-bnpb` | `selera-angka`, `security-reviewer` | 3 | S | selesai 5 Nov |
| RU-005 | G-2 gerbang status hukum | `penulis-gerbang` | `general-purpose` baru | 3 | S | selesai 5 Nov |
| RU-006 | MB-2 kerangka Jam Aturan berisi kunci meja | `inti-layar` | `penulis-gerbang` | 1 | S | selesai 5 Nov |
| RU-007 | G-1 gerbang Jam Aturan | `penulis-gerbang` | `general-purpose` baru | 3 | M | selesai 5 Nov |
| RU-008 | F0-2 ambang meja dan pengingat dari Jam Aturan | `warga-api` | `guard-api` | 2 | M | selesai 5 Nov |
| RU-009 | F0-3 migrasi 0110 dan uji skema R1-R10 | `warga-api` | `migrasi-idempoten` | 1 | M | selesai 5 Nov |
| RU-010 | F0-3 rute meja rehab tanpa kaji cepat | `warga-api` | `guard-api` | 2 | S | selesai 5 Nov |
| RU-011 | Layar meja `/bnpb` untuk F0-2 dan F0-3 | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 3 | S | selesai 5 Nov |
| RU-012 | [induk] Commit F0, terap produksi, terbit | sesi induk | `higiene-repo` | 3 | S | belum |
| RU-013 | `migrasi_beku.json` sesudah 0110 diterapkan | `warga-api` | `migrasi-idempoten` | 4 | S | selesai 5 Nov |
| RU-014 | MB-1 status `tidak_bisa_dicek` | `ruang-bnpb` | `penulis-gerbang` | 4 | S | belum |
| RU-015 | MB-2 lengkap: semua kunci dan `tenggat()` | `inti-layar` | `penulis-gerbang` | 4 | M | belum |
| RU-016 | MB-2 pembaca Python dan uji kembar | `ruang-bnpb` | `penulis-gerbang` | 5 | S | belum |
| RU-017 | Uji layar masuk `uji` dan `terbit.yml` | `mekanik-mesin` | `higiene-repo` | 1 | S | belum |
| RU-018 | Migrasi 0111 peran `unit` | `warga-api` | `migrasi-idempoten` | 4 | S | belum |
| RU-019 | Rute baca `src/unit.js` dan gerbang host | `warga-api` | `guard-api`, `security-reviewer` | 5 | M | belum |
| RU-020 | Cangkang `/bnpb/unit`, katalog 70 ID, registri | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 5 | M | belum |
| RU-021 | Pelari pipeline `jalan.py` dan `indeks.json` | `ruang-bnpb` | `higiene-repo` | 4 | S | belum |
| RU-022 | Langkah "Ruang Unit" di `data.yml` | `mekanik-mesin` | `higiene-repo` | 5 | S | belum |
| RU-023 | G-4 dan G-6 gerbang Ruang Unit | `penulis-gerbang` | `general-purpose` baru | 6 | M | belum |
| RU-024 | G-5 gerbang privasi unit | `penulis-gerbang` | `security-reviewer` | 6 | S | belum |
| RU-025 | MB-3 uji JDIHN dan daftar situs JDIH provinsi | `ruang-bnpb` | `higiene-repo` | 10 | S | belum |
| RU-026 | MB-3 `jdih_daerah.py` | `ruang-bnpb` | `security-reviewer` | 10 | M | belum |
| RU-027 | MB-4 `skor.py` | `ruang-bnpb` | `validasi-model` | 4 | S | belum |
| RU-028 | MB-5 `neraca.py` | `ruang-bnpb` | `selera-angka` | 4 | S | belum |
| RU-029 | MB-5 `kebutuhanDasar` JS dan uji kembar | `inti-layar` | `penulis-gerbang` | 9 | S | belum |
| RU-030 | MB-6 `rapor.py` dan perender `rapor.js` | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 4 | M | belum |
| RU-031 | G-3 perluasan gerbang kartu standar | `penulis-gerbang` | `general-purpose` baru | 5 | S | belum |
| RU-032 | MB-7 migrasi 0112 dan uji skema | `warga-api` | `migrasi-idempoten` | 7 | M | belum |
| RU-033 | MB-7 rute ketuk | `warga-api` | `guard-api`, `security-reviewer` | 7 | S | belum |
| RU-034 | MB-7 `terima.py` dan layar `ketuk.js` | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 7 | M | belum |
| RU-035 | MB-8 `panen.py` inti dan CKAN | `ruang-bnpb` | `security-reviewer` | 4 | M | belum |
| RU-036 | MB-8 ArcGIS, INALOGPAL, SIRUP | `ruang-bnpb` | `security-reviewer` | 10 | M | belum |
| RU-037 | HUK-1 kartu status peraturan | `ruang-bnpb` | `selera-angka` | 6 | S | belum |
| RU-038 | KPOD-2 kartu Jam Aturan | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 6 | S | belum |
| RU-039 | KPOD-2 masa status dari Jam Aturan | `inti-layar` | `penulis-gerbang` | 6 | S | belum |
| RU-040 | RRX-1 `rrx1.py` dan kartu jam pascabencana | `ruang-bnpb` | `selera-angka` | 6 | M | belum |
| RU-041 | RRX-1 kolom `tgl_r3p` dan uji alur | `warga-api` | `guard-api` | 6 | S | belum |
| RU-042 | PLP-1 neraca stok penyangga | `ruang-bnpb` | `validasi-model`, `selera-angka` | 7 | M | belum |
| RU-043 | PERB-1 pemilih daerah pendampingan IKD | `ruang-bnpb` | `validasi-model`, `selera-angka` | 7 | M | belum |
| RU-044 | PUS-1 rapor walidata Satu Data | `ruang-bnpb` | `selera-angka` | 7 | S | belum |
| RU-045 | KPOD-3 arsip Laphar mode satu hari | `pipa-umum` | `security-reviewer` | 8 | S | belum |
| RU-046 | KPOD-3 entri `arsip_laphar` di pengatur WA | `wa-bot` | `security-reviewer` | 8 | S | tertahan (gateway WA mati sejak 4 Nov, OUTSTANDING E1) |
| RU-047 | KPOD-3 kartu cakupan Laphar | `ruang-bnpb` | `selera-angka` | 8 | S | belum |
| RU-048 | REN-1 rapor Reformasi Birokrasi | `ruang-bnpb` | `selera-angka` | 8 | S | belum |
| RU-049 | REN-3 kalender monev | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 8 | S | belum |
| RU-050 | JF-1 kamus kompetensi | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 8 | S | belum |
| RU-051 | PD-3 `pesanStandar` | `layar-peta` | `penulis-gerbang` | 9 | S | belum |
| RU-052 | PD-3 layar penyusun pesan | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 9 | S | belum |
| RU-053 | KS-4 kalender gladi | `ruang-bnpb` | `selera-angka` | 9 | S | belum |
| RU-054 | RRP-3 kalkulator Jitupasna | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 9 | S | belum |
| RU-055 | RRS-3 fasilitas sosial rusak | `ruang-bnpb` | `selera-angka` | 9 | S | belum |
| RU-056 | KEU-1 penguji konsistensi LAKIP dan LK | `ruang-bnpb` | `higiene-repo` | 9 | S | belum |
| RU-057 | [induk] Tinjauan dan terbit F1 | sesi induk | pemeriksa per lapisan | 9 | M | belum |
| RU-058 | PERB-2 kolom rusak sedang dan ringan DIBI | `banjir` | `validasi-model` | 10 | S | belum |
| RU-059 | PERB-2 kerugian ekonomi berjalan | `ruang-bnpb` | `validasi-model` | 10 | M | belum |
| RU-060 | PSPB-3 rapor Sendai dan SDGs 11.b | `ruang-bnpb` | `validasi-model` | 10 | S | belum |
| RU-061 | MT-2 daerah prioritas mitigasi | `ruang-bnpb` | `validasi-model` | 10 | S | belum |
| RU-062 | PLP-2 daftar pendek hibah logpal | `ruang-bnpb` | `validasi-model` | 10 | M | belum |
| RU-063 | OJL-2 penempatan stok | `ruang-bnpb` | `validasi-model` | 10 | M | belum |
| RU-064 | OJL-3 rapor Klaster Logistik | `ruang-bnpb` | `security-reviewer`, `selera-angka` | 10 | S | belum |
| RU-065 | RRP-1 neraca rumah rusak | `ruang-bnpb` | `security-reviewer`, `validasi-model` | 10 | M | belum |
| RU-066 | RRS-1 kunci kriteria uji | `ruang-bnpb` | `validasi-model` | 10 | S | belum |
| RU-067 | RRS-1 taksiran kerugian pertanian | `ruang-bnpb` | `validasi-model` | 10 | M | belum |
| RU-068 | DIK-1 rute unggah dan ringkas diklat | `warga-api` | `guard-api`, `security-reviewer` | 10 | S | belum |
| RU-069 | DIK-1 peta sasaran diklat | `ruang-bnpb` | `validasi-model` | 10 | S | belum |
| RU-070 | REN-2 belanja lawan risiko | `ruang-bnpb` | `validasi-model` | 10 | S | belum |
| RU-071 | SDU-1 rapor tata kelola pengadaan | `ruang-bnpb` | `security-reviewer`, `selera-angka` | 10 | M | belum |
| RU-072 | [induk] Tinjauan dan terbit F2 Januari | sesi induk | pemeriksa per lapisan | 10 | S | belum |
| RU-073 | PSPB-1 register status RPBD | `ruang-bnpb` | `selera-angka` | 11 | S | belum |
| RU-074 | KS-1 pemantau dokumen kesiapsiagaan | `ruang-bnpb` | `selera-angka` | 11 | S | belum |
| RU-075 | SPB-1 peta NSPK | `ruang-bnpb` | `selera-angka` | 11 | S | belum |
| RU-076 | HUK-2 pelacak amanat | `ruang-bnpb` | `penulis-gerbang` | 11 | M | belum |
| RU-077 | KPOD-1 rapor intervensi status darurat | `ruang-bnpb` | `validasi-model` | 11 | M | belum |
| RU-078 | WIL-1 data direktorat wilayah | `ruang-bnpb` | `penulis-gerbang` | 11 | S | belum |
| RU-079 | WIL-1 Meja Wilayah | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 11 | M | belum |
| RU-080 | WIL-3 rute draf kaji cepat | `warga-api` | `guard-api` | 11 | S | belum |
| RU-081 | WIL-3 tombol draf dan ekspor | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 11 | S | belum |
| RU-082 | RRI-1 daftar akses putus | `ruang-bnpb` | `security-reviewer` | 11 | M | belum |
| RU-083 | RRI-1 rute status akses | `warga-api` | `guard-api` | 11 | S | belum |
| RU-084 | PUS-2 fungsi `kib()` | `warga-api` | `penulis-gerbang` | 11 | S | belum |
| RU-085 | PUS-2 pencocok logbook ke DIBI | `ruang-bnpb` | `selera-angka` | 11 | S | belum |
| RU-086 | [induk] Tinjauan dan terbit F2 Februari | sesi induk | pemeriksa per lapisan | 11 | S | belum |
| RU-087 | PD-1 rapor peringatan dini | `prediksi` | `validasi-model` | 12 | M | belum |
| RU-088 | PD-1 kartu dan unduhan 4-bulanan | `ruang-bnpb` | `selera-angka` | 12 | S | belum |
| RU-089 | PD-2 tag sirine OSM | `pipa-data` | `higiene-repo` | 12 | S | belum |
| RU-090 | PD-2 cakupan layanan peringatan dini | `ruang-bnpb` | `validasi-model` | 12 | M | belum |
| RU-091 | KS-3 kesenjangan lokasi evakuasi | `ruang-bnpb` | `selera-angka` | 12 | S | belum |
| RU-092 | MT-1 katalog kode kegiatan dan ESMS | `ruang-bnpb` | `selera-angka` | 12 | M | belum |
| RU-093 | MT-1 standar biaya Juklak 2/2026 | `ruang-bnpb` | `selera-angka` | 12 | M | belum |
| RU-094 | MT-1 penyusun usulan di peramban | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 12 | M | belum |
| RU-095 | MT-3 kalender kampanye | `ruang-bnpb` | `selera-angka` | 12 | S | belum |
| RU-096 | WIL-2 migrasi 0113 dan uji skema | `warga-api` | `migrasi-idempoten` | 12 | M | belum |
| RU-097 | WIL-2 rute pengungsian dan uji alur | `warga-api` | `guard-api`, `security-reviewer` | 12 | M | belum |
| RU-098 | WIL-2 isian 11 angka di layar instansi | `warga-api` | `inp-reviewer`, `security-reviewer` | 12 | S | belum |
| RU-099 | WIL-2 rekap, panel selisih, tab layar | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 12 | M | belum |
| RU-100 | PLP-3 impor BAST dan rekap | `ruang-bnpb` | `security-reviewer` | 12 | S | tertahan (U10) |
| RU-101 | PLP-3 rute laporan pasca-hibah | `warga-api` | `guard-api` | 12 | S | tertahan (U10) |
| RU-102 | RRP-2 leksikon berita pemulihan | `pipa-umum` | `validasi-model` | 12 | S | belum |
| RU-103 | RRP-2 rute terima pemulihan | `warga-api` | `guard-api`, `security-reviewer` | 12 | S | belum |
| RU-104 | RRP-2 usulan pemulihan dan kartu | `ruang-bnpb` | `selera-angka` | 12 | S | belum |
| RU-105 | IRT-1 papan umur TLHP (lokal) | `ruang-bnpb` | `security-reviewer` | 12 | S | belum |
| RU-106 | DIK-4 bank tenaga pengajar | `ruang-bnpb` | `security-reviewer` | 12 | S | belum |
| RU-107 | JF-2 hitung kebutuhan formasi | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | 12 | M | belum |
| RU-108 | [induk] Tinjauan dan terbit F2 Maret | sesi induk | pemeriksa per lapisan | 12 | S | belum |
| RU-109 | F0 akun gerbang `AKUN_SITUS*` ditolak di data staf (Dalops, Ruang Unit) | `warga-api` | `guard-api`, `security-reviewer` | 1 | S | selesai 5 Nov |

Jumlah: 110 tiket (RU-000 sampai RU-109): 15 F0 (RU-000 sampai RU-013, RU-109), 23 mesin dan kerangka (RU-014 sampai RU-036), 21 F1 (RU-037 sampai RU-057), 51 F2 (RU-058 sampai RU-108). Semua 15 sistem F1 dan 31 sistem F2 KA §5.1 punya tiket.

---

## 3. Tiket

Bentuk tiap tiket: **Tujuan**; **Berkas** (path persis; hanya ini yang boleh disentuh); **Di luar**; **Dependensi**; **Pengerja / pemeriksa**; **Langkah**; **Bukti**; **Pemilik** (yang hanya bisa dilakukan pemilik); **Rujukan**; **Ukuran**. Baris "tidak ada" pada **Pemilik** berarti tiket tidak menunggu pemilik.

### 3.A F0: perbaikan (5-15 Nov 2026)

#### RU-000 [induk] Kontrak, rakitan, putusan §0.2
- **Tujuan:** sesi induk mengesahkan atau membalik bawaan P-5, P-9, P-12 (putusan lain sudah diambil, §0.2), menetapkan rakitan pengerja dan pemeriksa gelombang 1 sampai 5, dan mencatatnya.
- **Berkas:** `.claude/ilmu-agent/orkestrator.md` (lewat `node scripts/agents/ilmu.mjs kasus orkestrator "..."`); berkas ini (§0.2, §2) bila ada putusan yang dibalik.
- **Di luar:** menulis kode; menjawab U1 sampai U12 atas nama pemilik.
- **Dependensi:** tidak ada.
- **Pengerja / pemeriksa:** sesi induk (opus) / pemilik membaca rakitan.
- **Langkah:**
  - [x] P-1 sampai P-4, P-6 sampai P-8, P-10, P-11, P-13, P-14 diputus sesi induk 5 Nov 2026 (KA §8, §0.2); RU-006, RU-009, RU-018, RU-019 tidak lagi menunggu putusan.
  - [ ] Sahkan atau balik P-5, P-9, P-12.
  - [ ] Catat putusan sebagai `Ruling:` di `.superpowers/sdd/TIKET/progress-unit.md` dan sebagai Kasus orkestrator.
  - [ ] Bila putusan dibalik, betulkan tiket terdampak di berkas ini sebelum tiketnya dikirim.
  - [ ] Tanyakan ke pemilik: U2, U4, U5, U7, U10, U11 (bawaan KA §7 dipakai sampai dijawab).
- **Bukti:** `node scripts/agents/ilmu.mjs baca orkestrator`.
- **Pemilik:** membaca rakitan; menjawab U-pertanyaan bila mau (bawaan berlaku bila tidak).
- **Rujukan:** KA §7; PRD §2.2, §2.3, §10; DT §10; RU §9; DS Catatan. **Ukuran:** S

#### RU-001 F0-1 pembaca daftar pencabutan di `hukum.py`
- **Tujuan:** `relasi_dari()` menangkap pencabutan dalam daftar berbutir ("Pada saat ... mulai berlaku: a. ...; b. ...; dicabut dan dinyatakan tidak berlaku"), dan katalog mencatat konflik status menurut teks lawan menurut JDIH. Penyebab yang dibetulkan: potongan `;` dan sitasi tetangga di `_konteks()`, bukan jendela 400 huruf (DT §3.1, KA §5.0 F0-1).
- **Berkas:** `scripts/bnpb/hukum.py` (fungsi baru `cabut_daftar()`, `konflik_status()`, pemakaian di `relasi_dari()` dan `bangun()`, medan `status_teks` dan `dicabut_oleh`, kunci `konflik`, kasus baru di `cek()`).
- **Di luar:** menjalankan `hukum.py urai` (RU-002); `src/hukum.js`; layar; memperlebar jendela `_konteks()`.
- **Dependensi:** RU-000.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `penulis-gerbang` (memeriksa bahwa kasus `cek()` benar-benar menolak, bukan hanya menerima).
- **Langkah:**
  - [ ] Tulis kasus `cek()` dulu (DT §3.1 butir 4) dan lihat gagal: daftar tiga sitasi Pasal 60 menghasilkan tepat tiga `mencabut`; butir "tetap berlaku" dikecualikan; `konflik_status` mengabaikan relasi `mengubah`.
  - [ ] Tambah empat kasus penolakan RU §3.1 (daftar lebih dari 400 huruf dengan empat sitasi; pencabutan satu pasal tidak mengubah status dokumen; judul kutipan di Mengingat tetap `mengingat`; "telah dicabut" di Menimbang tidak memindahkan pencabutan).
  - [ ] Tambah kasus frasa "Berita Negara Republik Indonesia Tahun 2021 Nomor 1420" di dalam daftar: tidak boleh menjadi relasi `mencabut` (DT §10 butir 13).
  - [ ] Tulis `cabut_daftar()` dan `konflik_status()` persis DT §3.1; `status` JDIH tidak ditimpa.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/hukum.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §3.1; RU §3.1; KA §5.0 F0-1. **Ukuran:** S

#### RU-002 F0-1 bangun ulang katalog dan seed
- **Tujuan:** katalog dan seed dibangun ulang dengan relasi dan konflik baru; fakta pencabutan yang tidak membusuk dikunci gerbang G-2 (RU-005).
- **Berkas:** `public/data/bnpb/hukum/katalog.json` (dibangun ulang), `data/hukum/seed.sql` (dibangun ulang).
- **Di luar:** menyunting isi katalog dengan tangan; `src/hukum.js`.
- **Dependensi:** RU-001.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `higiene-repo` (ukuran diff seed, tidak ada berkas `data/raw/**` ikut).
- **Langkah:**
  - [ ] Jalankan di checkout utama, bukan worktree (`data/raw/hukum/teks/` gitignored): `python3 scripts/bnpb/hukum.py urai`.
  - [ ] Bandingkan `konflik` dengan daftar 13 di DT §3.1 dan RU §3.1; selisih dilaporkan, tidak dipaksakan cocok.
  - [ ] Laporkan ke RU-005 bahwa `konflik` memuat `perban-6-2021` (dicabut `perban-4-2025`) dan `perka-4-2008` (dicabut `perban-3-2026`); asersinya ditulis di gerbang G-2, bukan berkas uji terpisah (nama uji menurut RU, KA §8).
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/hukum.py --cek`.
- **Pemilik:** sesudah RU-012, menerapkan seed ke produksi: `npx wrangler@4.42.0 d1 execute poskowarga --remote --file data/hukum/seed.sql`; meneruskan daftar konflik ke Biro Hukum atau pengelola JDIH (U7 bawaan).
- **Rujukan:** DT §3.1 "Bukti siap"; RU §3.1. **Ukuran:** S

#### RU-003 F0-1 `dicabut_oleh` di `src/hukum.js`
- **Tujuan:** pencarian hukum dan pembaca dokumen membawa `dicabut_oleh` dari `hukum_relasi`, dipakai layar `/bnpb/hukum` dan asisten `/ai`.
- **Berkas:** `src/hukum.js` (`cariHukum`, `bacaDok`), `tests/warga/hukum.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** filter `status` (tetap kolom JDIH); skema `hukum_dok` (tidak berubah).
- **Dependensi:** RU-002.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Langkah:**
  - [ ] Uji Miniflare dulu: seed fixture dua dokumen BERLAKU dengan relasi `mencabut`; `bacaDok` dokumen sasaran mengembalikan `dicabut_oleh` berisi pencabut; dokumen yang hanya `mengubah` mengembalikan larik kosong.
  - [ ] Subkueri `DICABUT` persis DT §3.1; uji `EXPLAIN QUERY PLAN` memakai indeks `hukum_relasi_ke`.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/hukum.test.mjs`.
- **Pemilik:** tidak ada (seed lewat RU-002).
- **Rujukan:** DT §3.1 "`src/hukum.js`", §9.3. **Ukuran:** S

#### RU-004 F0-1 pil "dicabut menurut teks" di layar hukum
- **Tujuan:** di samping pil status, dokumen dengan `dicabut_oleh` menampilkan pil merah yang menaut ke pencabut; bawaan U7.
- **Berkas:** `public/bnpb/hukum.js` (dekat `pilStatus(x.status)`).
- **Di luar:** `public/bnpb/hukum.html` kecuali bila pil butuh kelas yang sudah ada; komponen baru.
- **Dependensi:** RU-003.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka` (teks pil, tanpa titik tengah), `security-reviewer` (`esc()` atas judul pencabut).
- **Langkah:**
  - [ ] Pil "Dicabut oleh <nomor/tahun> menurut teks; JDIH masih BERLAKU" bertaut ke dokumen pencabut; warna dari token yang ada (DS §4.2 arti semantik).
  - [ ] Semua teks dari data lewat `esc()`.
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:layar && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §3.1 "`public/bnpb/hukum.js`"; DS §7.8. **Ukuran:** S

#### RU-005 G-2 gerbang status hukum
- **Tujuan:** invarian RU §3.1 dijaga tanpa DB di tiap push.
- **Berkas:** `tests/agen/gerbang-status-hukum.test.mjs` (baru).
- **Di luar:** `hukum.py`.
- **Dependensi:** RU-002.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `general-purpose` baru berkonteks bersih.
- **Langkah:**
  - [ ] Fungsi pemeriksa murni + uji dirinya: katalog fixture dengan satu relasi `mencabut` antardokumen BERLAKU yang tidak tercatat di `konflik` wajib ditolak, pesan mencetak pasangan.
  - [ ] Invarian atas `katalog.json` nyata: tiap dokumen dengan `status_teks` berbeda dari `status` ada di `konflik` dengan id pencabut; `perban-6-2021` dicabut `perban-4-2025`, `perka-4-2008` dicabut `perban-3-2026`; kontrol `perban-6-2025` dan `perban-4-2020` tidak di `konflik`.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/agen/gerbang-status-hukum.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** RU §3.1, §6.1 G-2. **Ukuran:** S

#### RU-006 MB-2 kerangka Jam Aturan berisi kunci meja
- **Tujuan:** satu sumber tenggat berpasal untuk ambang meja F0-2 (putusan P-3, P-6, KA §8).
- **Berkas:** `public/inti/jam_aturan.json` (baru; entri `kaji_awal`, `kaji_lanjutan`, `dsp_laporan_perkembangan`, `dsp_spj`, `renkon_berlaku`, `renkon_reviu`, `destana_penilaian`, dan empat ambang internal `logistik_setuju_jam`, `renkon_segera_hari`, `destana_pasif_bulan`, `rehab_macet_hari` berlabel `asumsi: true` dengan `catatan`), `public/inti/jam_aturan.js` (baru; `nilai()`, `aturan()`, `tenggat()` untuk satuan `jam`, `bulan`, `tahun`, `tanggal_bulan_berikut`), `tests/bnpb/unit_kembar.test.mjs` (baru; kasus fungsi murni JS; sisi Python dan `acuan.json` ditambah RU-016).
- **Di luar:** kunci lain DT §4.2 (RU-015); `src/meja_spek.js` (RU-008).
- **Dependensi:** tidak ada (P-3, P-6 diputus KA §8).
- **Pengerja / pemeriksa:** `inti-layar` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Cari tiap kutipan di baris `INSERT INTO hukum_segmen` dokumen acuan di `data/hukum/seed.sql`; kutipan ditulis persis. Pangkal 24 jam kaji cepat memakai tiga kunci ALGORITMA §3.1 (`kaji_mulai` setelah informasi diterima, `trc_bergerak`, `kaji_awal` setelah tiba); nama kunci menurut ALGORITMA §3.1.
  - [ ] Uji fungsi murni dulu: 31 Januari + 1 bulan, tanggal 5 bulan berikut dari 31 Desember, 24 jam dari tengah malam WIB.
  - [ ] Tulis JSON dan fungsi; JS membaca JSON lewat impor JSON (Worker dan Node) dan `fetch` di peramban.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_kembar.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §3.2, §4.2; PRD BT-4; ALGORITMA §3; RU §2.1. **Ukuran:** S

#### RU-007 G-1 gerbang Jam Aturan
- **Tujuan:** tiap ambang punya pasal BERLAKU yang teksnya ada, atau berlabel asumsi; tidak ada angka tenggat tertanam di luar Jam Aturan.
- **Berkas:** `tests/agen/gerbang-jam-aturan.test.mjs` (baru).
- **Di luar:** isi `jam_aturan.json`.
- **Dependensi:** RU-002 (katalog berkonflik), RU-006.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `general-purpose` baru.
- **Langkah:**
  - [ ] Pemeriksa murni dan uji dirinya menolak lima masukan palsu RU §6.1 G-1 (acuan `perka-1-2012`; kutipan yang tidak ada; tanpa pasal dan tanpa asumsi; `asumsi: true` tanpa catatan; berkas fixture memuat `dsp_spj_hari: 30`).
  - [ ] Butir DT §4.2 nomor 1 sampai 4 atas berkas nyata; kutipan dicari di `data/hukum/seed.sql` (P-12), spasi dan huruf dinormalkan.
  - [ ] Grep angka tertanam di `src/meja_spek.js`, `src/pengingat.js`, `public/inti/status_pedoman.js`, `scripts/bnpb/unit/*.py`. Selama RU-008 dan RU-039 belum selesai, gerbang ini merah atas berkas lama; tiket ini selesai bersama RU-008 di commit yang sama, sedangkan `status_pedoman.js` masuk daftar pengecualian bertanggal yang dicabut RU-039.
  - [ ] Pesan gagal persis pola RU §0.2 baris terakhir.
- **Bukti:** `node --test tests/agen/gerbang-jam-aturan.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.2 "Gerbang"; RU §6.1 G-1, §6.1 catatan teks iCloud. **Ukuran:** M

#### RU-008 F0-2 ambang meja dan pengingat dari Jam Aturan
- **Tujuan:** `AMBANG` meja membaca Jam Aturan; renkon, Destana, DSP, dan kaji cepat memakai tenggat berpasal; `INDIKATOR_DESTANA` karangan dihapus.
- **Berkas:** `src/meja_spek.js` (`AMBANG`, `AMBANG_INTERNAL`, kolom `renkon`, `destana`, `dsp`, `kaji_cepat`, fungsi turunan), `src/pengingat.js` (teks dan tanda DSP), `src/meja.js` (komentar seed dummy `belum_diuji`), `public/admin/meja.js` (peta warna status), `tests/warga/meja.test.mjs`, `tests/warga/pengingat.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** meja `rehab` (RU-010); `public/bnpb/meja.js` (RU-011); migrasi.
- **Dependensi:** RU-006.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Langkah:**
  - [ ] Ganti asersi lama yang salah karena aturan berubah dengan kasus RU §3.2 (renkon `perlu_reviu` dan `berlaku`; `kedaluwarsa` 3 tahun; `berlaku_sampai` lebih dari `tgl_sah` + 3 tahun ditolak 400; DSP `laporan_terlambat` dan `spj_terlambat`; tanpa `tgl_status_berakhir` tanpa `spj_terlambat`; kaji cepat 24 jam dan 72 jam; Destana `penilaian_kedaluwarsa`); asersi lama yang benar tetap.
  - [ ] Ubah kode persis DT §3.2; catatan lama dengan `indikator` dan `uji_terakhir` tetap terbaca.
  - [ ] Teks tanda ambang internal memuat "asumsi" (RU §3.2 baris terakhir tabel).
  - [ ] Jalankan bukti bersama RU-007.
- **Bukti:** `node --test tests/agen/gerbang-jam-aturan.test.mjs tests/warga/meja.test.mjs tests/warga/pengingat.test.mjs`.
- **Pemilik:** tidak ada (data meja di JSON, tanpa migrasi).
- **Rujukan:** DT §3.2; RU §3.2. **Ukuran:** M

#### RU-009 F0-3 migrasi 0110 dan uji skema R1-R10
- **Tujuan:** CHECK dan trigger `meja_catatan` membolehkan rehab tanpa kaji cepat induk, tanpa kehilangan `meja_jejak` dan `meja_stok`.
- **Berkas:** `migrations/0110_meja_rehab_lepas.sql` (baru; nomor dicek ulang), `tests/warga/unit_skema.test.mjs` (baru), `tests/warga/cakupan.json`.
- **Di luar:** `migrations/0026_meja.sql` (beku); jenis meja baru dan bangun ulang kedua (tidak dibuat, KA §8); `src/meja.js`.
- **Dependensi:** tidak ada (P-4 diputus KA §8).
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Langkah:**
  - [ ] `ls migrations/`; bila 0110 sudah dipakai sesi lain, ambil nomor kosong berikut dan perbarui tiket hilir (RU-010, RU-013).
  - [ ] Tulis uji R1 sampai R10 RU §3.3 dulu (`node:sqlite`, migrasi apa adanya lewat `migrasi()` dan `pecah()`, `PRAGMA foreign_keys = ON`, `BEGIN ... ROLLBACK` dibungkus runner), ditambah kasus DT §3.3 butir 5 (jalan dua kali di basis berisi; jumlah baris tiga tabel sama).
  - [ ] Tulis migrasi persis DT §3.3 (`defer_foreign_keys`, cadangan `meja_jejak`, buang dan bangun ulang `meja_stok_sah`, indeks `meja_rehab_kejadian`).
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit_skema.test.mjs tests/warga/migrasi_beku.test.mjs && npm run uji:warga`.
- **Pemilik:** menerapkan 0110 di produksi di RU-012.
- **Rujukan:** DT §3.3; RU §3.3; KA §8 baris migrasi meja. **Ukuran:** M

#### RU-010 F0-3 rute meja rehab tanpa kaji cepat
- **Tujuan:** `POST` meja rehab diterima tanpa `kaji_id` dengan `kejadian_ref`; tautan ke kaji cepat tetap dijaga bila diisi.
- **Berkas:** `src/meja_spek.js` (meja `rehab`: `tautKaji: "opsional"`, kolom `kejadian_ref`), `src/meja.js` (`buat()`, `UNIK.rehab`), `tests/warga/meja.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** `public/bnpb/meja.js` (RU-011); kolom `tgl_r3p` (RU-041).
- **Dependensi:** RU-009, RU-008 (berkas sama, urut).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Langkah:**
  - [ ] Balik asersi "rehab tanpa kaji_id DITOLAK" menjadi DITERIMA dengan komentar yang menyebut F0-3 dan KA §5.0 (RU §0.4).
  - [ ] Uji DT §3.3 "Uji" butir 1 sampai 4 dan RU §3.3 uji rute (201; dua kali `kejadian_ref` sama 409; `kaji_id` berstatus `dilaporkan` 400 di Worker dan ditolak trigger lewat SQL langsung; `kaji_id` bukan 16 heks 400; `kaji_id` di meja lain 400).
  - [ ] Kode persis DT §3.3 "`src/meja.js:114-121`".
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/meja.test.mjs tests/warga/unit_skema.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §3.3; RU §3.3. **Ukuran:** S

#### RU-011 Layar meja `/bnpb` untuk F0-2 dan F0-3
- **Tujuan:** layar Meja Kerja staf mengikuti status turunan baru dan pilihan kaji cepat induk yang opsional.
- **Berkas:** `public/bnpb/meja.js` (peta warna `perlu_reviu`, `penilaian_kedaluwarsa`; label "Kaji cepat induk (opsional)", opsi "Tanpa kaji cepat induk", `kaji_id` dikirim hanya bila dipilih; label "tanda internal, bukan pasal").
- **Di luar:** `public/admin/meja.js` (RU-008).
- **Dependensi:** RU-008, RU-010.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Ubah sesuai DT §3.2 "Pemakai lain" dan §3.3 "`public/bnpb/meja.js:97`".
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:layar && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §3.2, §3.3. **Ukuran:** S

#### RU-012 [induk] Commit F0, terap produksi, terbit
- **Tujuan:** F0 tayang dan produksi selaras.
- **Berkas:** commit dengan path spesifik atas berkas RU-001 sampai RU-011, RU-109, dan `.claude/ilmu-agent/prompt/` sesi itu (`git commit -- <berkas>`).
- **Di luar:** `git add -A`.
- **Dependensi:** RU-001 sampai RU-011 dan RU-109 berstatus `tinjau`.
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`.
- **Langkah:**
  - [ ] Bukti gabungan F0 hijau di checkout bersih.
  - [ ] `higiene-repo` sebelum commit besar.
  - [ ] Commit, push `main`, tunggu `terbit.yml` hijau, periksa aset tayang dan `/api/status`.
  - [ ] Minta pemilik menerapkan 0110 dan seed hukum; sesudahnya buka RU-013.
  - [ ] Sapu branch (`bash scripts/agents/sapu-branch.sh`), `git branch` hanya `main`.
- **Bukti:** `python3 -I scripts/bnpb/hukum.py --cek && node --test tests/agen/gerbang-status-hukum.test.mjs tests/agen/gerbang-jam-aturan.test.mjs tests/bnpb/unit_kembar.test.mjs tests/warga/meja.test.mjs tests/warga/pengingat.test.mjs tests/warga/unit_skema.test.mjs tests/warga/migrasi_beku.test.mjs tests/warga/hukum.test.mjs tests/warga/dalops.test.mjs`.
- **Pemilik:** `npx wrangler@4.42.0 d1 migrations apply poskowarga --remote` (0110); `npx wrangler@4.42.0 d1 execute poskowarga --remote --file data/hukum/seed.sql`; meneruskan daftar konflik (U7).
- **Rujukan:** DT §3.4; PRD §4.1 gerbang F0. **Ukuran:** S

#### RU-013 `migrasi_beku.json` sesudah 0110 diterapkan
- **Tujuan:** 0110 dibekukan sha256-nya supaya tidak disunting lagi.
- **Berkas:** `tests/warga/migrasi_beku.json`.
- **Di luar:** isi migrasi.
- **Dependensi:** RU-012 dan konfirmasi pemilik bahwa 0110 sudah diterapkan.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Langkah:**
  - [ ] Tambah sha256 0110 dengan pola entri yang ada.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/migrasi_beku.test.mjs`.
- **Pemilik:** menyatakan 0110 sudah diterapkan.
- **Rujukan:** DT §2.1 baris `migrasi_beku.json`. **Ukuran:** S

#### RU-109 Akun gerbang `AKUN_SITUS*` tidak membaca data staf
- **Tujuan:** menutup celah KEAMANAN-PRIVASI §2.3 (putusan P-14): `stafOK` = `adminOK` ATAU sesi staf berperan (`src/staf.js:64`), dan `adminOK` menerima akun gerbang `AKUN_SITUS*` (`src/worker.js:438-442`, `akunGerbang()`), sehingga pemegang akun gerbang yang dibagikan untuk melihat situs bisa membaca data staf. Rute Dalops yang sudah tayang (`src/dalops.js:13`, data logbook dengan nama petugas) terbuka hari ini; Ruang Unit tidak boleh mewarisinya.
- **Berkas:** `src/dalops.js` (`data()`: `stafOK` diganti `modAtauStaf(env, req, PERAN_DALOPS)`, `src/staf.js:65`), `tests/warga/dalops.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** `adminOK` dan `akunGerbang()` (tetap meloloskan akun gerbang untuk halaman yang memang boleh dilihat); `src/unit.js` (belum ada; aturannya dibawa RU-019, RU-033, RU-068, RU-083, RU-097, RU-101: berkas di `DATA_UNIT_TERBATAS` dan semua rute tulis memakai `modAtauStaf`, berkas kelas S tetap `stafOK`).
- **Dependensi:** tidak ada.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Langkah:**
  - [ ] Uji Miniflare dulu dan lihat gagal: akun gerbang (`AKUN_SITUS_UJI` di env uji, kepala `Host: centurisk97.id`) meminta `GET /api/dalops/banjir`, `/longsor`, `/karhutla` mendapat 401 tanpa badan data; sesi staf `pusdalops` 200; `ADMIN_TOKEN` (moderator) 200; tamu 401.
  - [ ] Periksa pemanggil `stafOK` lain yang menyajikan data staf (`grep -n "stafOK(" src/*.js`) dan laporkan daftarnya ke sesi induk; yang di luar `src/dalops.js` tidak disunting di tiket ini.
  - [ ] Ganti penjaga di `data()`; pesan 401 tetap sama.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/dalops.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada (tayang lewat RU-012).
- **Rujukan:** KEAMANAN-PRIVASI §2.3, §13.1 butir 2, §13.2 butir 7; DT §1.4, §4.9; KA §8 baris rute baca. **Ukuran:** S

### 3.B Mesin bersama dan kerangka (16 Nov-20 Des 2026; MB-3 dan sebagian MB-8 Januari 2027)

Kerangka (RU-017 sampai RU-024) bukan mesin bernomor, tetapi dipakai semua mesin dan sistem: peran, rute, cangkang layar, pelari pipeline, langkah workflow, dan gerbang. Ia ditaruh di antara MB-2 dan MB-3 karena MB-6 dan semua kartu membutuhkannya.

#### RU-014 MB-1 status `tidak_bisa_dicek`
- **Tujuan:** dokumen tanpa teks (halaman 0, contoh `juklak-7-2024`) berstatus menurut teks `tidak_bisa_dicek`, bukan BERLAKU.
- **Berkas:** `scripts/bnpb/hukum.py` (`bangun()`, `cek()`), `public/data/bnpb/hukum/katalog.json` (dibangun ulang), `data/hukum/seed.sql` (dibangun ulang).
- **Di luar:** `amanat()` (RU-076).
- **Dependensi:** RU-012.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Kasus `cek()`: dokumen tanpa segmen mendapat `status_teks: "TIDAK_BISA_DICEK"`; dokumen bersegmen tidak terpengaruh.
  - [ ] Bangun ulang di checkout utama.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/hukum.py --cek && node --test tests/agen/gerbang-status-hukum.test.mjs`.
- **Pemilik:** menerapkan seed baru ke produksi bersama RU-057.
- **Rujukan:** RU §4 baris MB-1; DT §4.1. **Ukuran:** S

#### RU-015 MB-2 lengkap: semua kunci dan `tenggat()`
- **Tujuan:** semua kunci ALGORITMA §3.1 (DT §4.2 tabel "Isi awal" mengikutinya) ada, bersitasi atau berlabel asumsi; `tenggat()` mendukung `hari` dan `hari_kerja`; `standar()` untuk kunci `std_*` dan `stok_*`.
- **Berkas:** `public/inti/jam_aturan.json`, `public/inti/jam_aturan.js`, `tests/bnpb/unit_kembar.test.mjs`.
- **Di luar:** pembaca Python (RU-016); `status_pedoman.js` (RU-039); `kebutuhanDasar` (RU-029).
- **Dependensi:** RU-006, RU-007.
- **Pengerja / pemeriksa:** `inti-layar` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Kutipan tiap kunci dicari di `data/hukum/seed.sql`; kunci yang kutipannya tidak ditemukan dilaporkan, tidak dikarang (RU §9 butir 11); `masa_status_*` dan `hibah_logpal_lapor` `asumsi: true`; tambah `ikd_ambang_kelas` (0,40 dan 0,80) dan `ews_radius_sirine_km` (2) berlabel asumsi (DT §5.1, §6.7).
  - [ ] Kasus RU §2.1 sebagai uji fungsi murni (hari kerja melewati akhir pekan; libur nasional tidak dihitung).
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_kembar.test.mjs tests/agen/gerbang-jam-aturan.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.2; RU §2.1, §4 baris MB-2. **Ukuran:** M

#### RU-016 MB-2 pembaca Python dan uji kembar
- **Tujuan:** pipeline membaca Jam Aturan dari JSON yang sama; nilai JS dan Python identik.
- **Berkas:** `scripts/bnpb/unit/aturan.py` (baru; `muat()`, `nilai()`, `tenggat()`, `--cek`), `tests/bnpb/unit_kembar.test.mjs` (diperluas dari RU-006; 20 kasus dari `tests/bnpb/fixtures/unit/acuan.json`), `tests/bnpb/fixtures/unit/acuan.json` (baru, kasus RU §2).
- **Di luar:** sistem pemakai.
- **Dependensi:** RU-015.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Tulis `acuan.json` dari tabel RU §2.1; uji kembar memanggil `python3 -I scripts/bnpb/unit/aturan.py --kembar <kasus>` lewat `execFileSync`.
  - [ ] Tulis `aturan.py` dengan `assert` atas kasus yang sama.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/aturan.py --cek && node --test tests/bnpb/unit_kembar.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.2 "Pemakai"; RU §1.1 L3, §4 baris MB-2. **Ukuran:** S

#### RU-017 Uji layar masuk `uji` dan `terbit.yml`
- **Tujuan:** uji `tests/bnpb/*.test.mjs` (termasuk `unit_*`) benar-benar jalan di CI (putusan P-5).
- **Berkas:** `package.json` (rangkai `uji:layar` ke `uji` dengan pola kode keluar yang sama), `.github/workflows/terbit.yml` (langkah "Uji layar BNPB" `npm run uji:layar` sesudah `uji:sippa`).
- **Di luar:** isi uji `tests/bnpb/`.
- **Dependensi:** RU-000.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`.
- **Langkah:**
  - [ ] Jalankan `npm run uji:layar` di checkout bersih dulu; bila ada uji lama yang merah, laporkan ke sesi induk dan jangan merangkai sampai pemiliknya membetulkan (gerbang tidak dilonggarkan).
  - [ ] Rangkai; ukur menit tambahan pada run pertama (RU §8 biaya).
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:layar && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** RU §0.4, §8, §9 butir 1; DT §2.1 baris `package.json`. **Ukuran:** S

#### RU-018 Migrasi 0111 peran `unit`
- **Tujuan:** staf direktorat dan pusat di luar Dit. KPOD bisa masuk Ruang Unit dengan satu peran baru `unit` (putusan P-2, KA §8).
- **Berkas:** `migrations/0111_staf_peran_unit.sql` (baru; persis DT §2.2), `src/staf.js` (`PERAN.unit = "Ruang Unit"`), `public/admin/pantau.js` (`PERAN` dan pola `ke` `^/bnpb/unit(/|$)`), `tests/warga/pantau.test.mjs`, `tests/warga/unit_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** `0104` (beku); peran per unit.
- **Dependensi:** RU-009 (berkas uji skema sama).
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Langkah:**
  - [ ] Cek nomor migrasi.
  - [ ] Uji skema: staf dengan peran `unit` diterima; peran `unitx` dan peran ganda ditolak trigger; daftar trigger cocok dengan `PERAN` di dua berkas JS (`pantau.test.mjs`).
  - [ ] Tulis migrasi dan perubahan JS.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit_skema.test.mjs tests/warga/pantau.test.mjs && npm run uji:warga`.
- **Pemilik:** menerapkan 0111 di produksi di RU-057; membuat akun staf `unit` pertama lewat `/admin/akun`.
- **Rujukan:** DT §1.4, §2.2; PRD §3.2, BT-2. **Ukuran:** S

#### RU-019 Rute baca `src/unit.js` dan gerbang host
- **Tujuan:** cangkang halaman dan data R2 hanya untuk staf; tamu tidak tahu berkas ada atau tidak.
- **Berkas:** `src/unit.js` (baru; `RUTE_UNIT`, `DATA_UNIT`, `DATA_UNIT_TERBATAS`, `KODE_UNIT`, `P_UNIT_BACA`, `P_UNIT_TULIS`; `GET /bnpb/unit`, `GET /bnpb/unit/:kode`, `GET /api/unit/indeks`, `GET /api/unit/data/:nama`), `src/worker.js` (impor dan spread di `RUTE`, regex router, regex host `halamanTerkunci`), `src/admin_halaman.js` (tautan "Ruang Unit" di `GRUP_STAF`), `tests/warga/unit.test.mjs` (baru), `tests/warga/admin-403-pantul.test.mjs` (diperluas ke `public/bnpb/unit/*.js`), `tests/warga/cakupan.json`.
- **Di luar:** rute tulis (RU-033, RU-068, RU-083, RU-097, RU-101); isi `DATA_UNIT` tumbuh di tiket sistem.
- **Dependensi:** RU-018, RU-109 (pola `modAtauStaf`), RU-000 (P-9).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Langkah:**
  - [ ] Uji Miniflare S1 sampai S7 RU §7.4 dengan `Host: centurisk97.id` dan pembanding tanpa kepala itu; tujuan pengalihan `/admin/masuk?ke=` (P-8); S8 akun gerbang: kelas T 401, kelas S 200 (KEAMANAN-PRIVASI §2.3); `kode` di luar 22 kode 404; `nama` di luar `DATA_UNIT` 404 tanpa menyentuh R2; 0 byte 404 `belum_ada`.
  - [ ] Uji kuota: `meta.rows_read` rute data hanya `stafOK` (RU §7.2 baris pertama).
  - [ ] Uji `indeks`: berkas lebih tua dari `basi_jam` ditandai `basi: true` dari `MEDIA.head()` (DT §9.4 butir 3).
  - [ ] Tulis rute persis DT §1.4 dan §4.9; `catatHTML` dipanggil dari rute halaman unit (PRD §10 data tidak ditemukan butir terakhir).
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit.test.mjs tests/warga/admin-403-pantul.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §1.4, §4.9, §9.1, §9.4; RU §7.2, §7.4. **Ukuran:** M

#### RU-020 Cangkang `/bnpb/unit`, katalog 70 ID, registri
- **Tujuan:** pintu kartu per kedeputian dan pusat, satu cangkang untuk 22 halaman unit dengan keadaan kosong "belum ada sistem", satu daftar sistem di sisi layar, dan registri cakupan Ruang Unit.
- **Berkas:** `public/bnpb/unit/index.html`, `public/bnpb/unit/unit.html`, `public/bnpb/unit/unit.js`, `public/bnpb/unit/unit.css`, `public/bnpb/unit/katalog.js` (70 ID KA §5.1: id, unit, fase, nama, berkas data, jenis tampilan), `tests/bnpb/unit_layar.test.mjs` (baru), `tests/bnpb/unit_cakupan.json` (baru; `diuji`, `dikecualikan`, `antre`; semua 46 ID F1 dan F2 mula-mula di `antre`).
- **Di luar:** perender kartu (RU-030); data sistem.
- **Dependensi:** RU-019 (kontrak rute), DS §3, §7.0 sampai §7.2, §8.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Urutan muat dan cangkang persis DS §3 (`tema.css` sebelum `bnpb.css`, tanpa skrip inline, kepala `.ad-top`).
  - [ ] Keadaan layar DS §8.1 sampai §8.6 (memeriksa akses, kosong, galat, basi, tanpa hak, dijalankan lokal); ponsel DS §9; aksesibilitas DS §10.
  - [ ] Uji render dengan `tests/bnpb/_peramban.mjs`: pintu menampilkan 22 unit; `/bnpb/unit/plp` tanpa data menampilkan keadaan kosong, tanpa angka nol palsu.
  - [ ] Kartu tiap sistem memuat tautan ke berkas skrip di repo dan ke DT (U1 bawaan, DT §9.1).
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_layar.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DS §3, §5, §7.0 sampai §7.2, §8 sampai §10; DT §2.1; PRD §7.1, §7.2; RU §0.1 butir 2. **Ukuran:** M

#### RU-021 Pelari pipeline `jalan.py` dan `indeks.json`
- **Tujuan:** satu pemanggil untuk semua langkah Ruang Unit, tahan gagal per langkah, keluaran atomik, indeks basi.
- **Berkas:** `scripts/bnpb/unit/jalan.py` (baru; `LANGKAH = [(nama, modul, frekuensi)]` mula-mula kosong, `--cek`, mode `harian`, `--mingguan`, `--bulanan`, menulis `/tmp/unit/indeks.json`), `scripts/bnpb/unit/__init__.py` bila perlu untuk impor `from unit import ...`.
- **Di luar:** langkah sistem (didaftarkan tiket sistem); workflow (RU-022).
- **Dependensi:** RU-000.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `higiene-repo`.
- **Langkah:**
  - [ ] `--cek` dengan langkah tiruan: satu langkah melempar galat tidak menghentikan langkah lain; langkah gagal tidak menulis berkas; `indeks.json` mencatat `ok: false` dan galat satu baris; `.tmp` lalu `os.replace`.
  - [ ] `--cek` menjalankan `--cek` tiap modul yang terdaftar sebelum mode jalan.
  - [ ] Ringkasan ke `$GITHUB_STEP_SUMMARY` bila variabel ada.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/jalan.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §2.3, §9.4. **Ukuran:** S

#### RU-022 Langkah "Ruang Unit" di `data.yml`
- **Tujuan:** pipeline Ruang Unit jalan harian di workflow yang sudah ada, mengunggah ke R2 `unit/`, tidak meng-commit.
- **Berkas:** `.github/workflows/data.yml` (tiga langkah DT §2.3 sesudah langkah IKU BNPB).
- **Di luar:** workflow baru; jadwal baru.
- **Dependensi:** RU-021.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`.
- **Langkah:**
  - [ ] Salin langkah persis DT §2.3 (cache, `continue-on-error`, `jalan.py --cek` lalu `harian`, loop unggah dengan `::warning`).
  - [ ] Periksa YAML dengan pola uji workflow yang ada di `tests/agen/` bila ada; laporkan bila tidak ada.
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:agen`; `workflow_dispatch` `data.yml` sesudah RU-057 (oleh sesi induk).
- **Pemilik:** menambahkan GitHub secret `BPS_KEY` dari Keychain `bps-webapi` (dibutuhkan RU-054, RU-059, RU-067; DT §2.3, §10 butir 11).
- **Rujukan:** DT §2.3; RU §8. **Ukuran:** S

#### RU-023 G-4 dan G-6 gerbang Ruang Unit
- **Tujuan:** staf saja, sumber per angka, label wajib, registri cakupan, dan larangan kartu F3/T dijaga tanpa DB.
- **Berkas:** `tests/agen/gerbang-ruang-unit.test.mjs` (baru; butir a sampai f RU §6.1), `tests/agen/gerbang-titik-tengah.test.mjs` (diperluas ke `public/bnpb/unit/**` bila belum mencakup).
- **Di luar:** layar dan pipeline.
- **Dependensi:** RU-019, RU-020.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `general-purpose` baru.
- **Langkah:**
  - [ ] Pemeriksa murni dan uji dirinya untuk tiap masukan palsu RU §6.1 G-4 dan G-6; butir a: rute `/api/unit/*` memanggil `stafOK`, atau `modAtauStaf` untuk `DATA_UNIT_TERBATAS` dan semua rute tulis (P-14); butir b memakai kunci DT (`dibuat`, `basi_jam`, `label`, P-7) atas fixture `tests/bnpb/fixtures/unit/r2/*.json`; butir e membaca `tests/bnpb/unit_cakupan.json` dan katalog KA §5.1 lewat `public/bnpb/unit/katalog.js`; butir f menolak kartu ber-ID F3 atau T.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/agen/gerbang-ruang-unit.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** RU §6.1 G-4, G-6, §7.3. **Ukuran:** M

#### RU-024 G-5 gerbang privasi unit
- **Tujuan:** tidak ada kolom atau kunci data pribadi, tidak ada panen layer pribadi, tidak ada berkas internal ter-commit.
- **Berkas:** `tests/agen/gerbang-privasi-unit.test.mjs` (baru).
- **Di luar:** `.gitignore` (bila pola KEU-1 dan IRT-1 belum ada, laporkan ke `mekanik-mesin`).
- **Dependensi:** RU-020.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `security-reviewer`.
- **Langkah:**
  - [ ] Butir a sampai e RU §7.1; uji dirinya menolak migrasi fixture `no_wa TEXT`, skrip fixture `outFields=*`, JSON fixture berkunci `nik`, dengan pesan menyebut berkas dan nama kolom.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/agen/gerbang-privasi-unit.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** RU §7.1; DT §8 "Dilarang dipanen", §9.2. **Ukuran:** S

#### RU-025 MB-3 uji JDIHN dan daftar situs JDIH provinsi
- **Tujuan:** memastikan apakah JDIHN punya pencarian yang bisa dibaca mesin sebelum pemanen ditulis.
- **Berkas:** `scripts/bnpb/unit/jdih_situs.json` (baru; per provinsi: URL, aplikasi, hasil probe), `tests/bnpb/fixtures/unit/jdih/` (baru; 5 halaman tersimpan, tanpa data pribadi).
- **Di luar:** pemanen; menghindari blokir situs.
- **Dependensi:** RU-000 (U5 bawaan ya).
- **Pengerja / pemeriksa:** `ruang-bnpb` / `higiene-repo`.
- **Langkah:**
  - [ ] Probe `https://jdihn.go.id` dengan User-Agent DT §8 dan jeda 1 detik; catat titik pencarian dan bentuk jawabannya.
  - [ ] Bila tidak ada pencarian mesin, probe situs JDIH 38 provinsi; situs yang menolak dicatat `diblokir` dan diajukan sebagai tiket `scraper-antibot` terpisah ke sesi induk.
  - [ ] Simpan 5 halaman fixture untuk RU-026.
- **Bukti:** `python3 -I -c "import json; d=json.load(open('scripts/bnpb/unit/jdih_situs.json')); assert len(d) == 38, len(d)"`.
- **Pemilik:** tidak ada (U5 bawaan berlaku).
- **Rujukan:** DT §4.3 "Urutan sumber", §10 butir 9. **Ukuran:** S

#### RU-026 MB-3 `jdih_daerah.py`
- **Tujuan:** dokumen RPBD, renkon, RPKB, dan rencana aksi per pemda dikenali dari metadata judul dan tanggal.
- **Berkas:** `scripts/bnpb/unit/jdih_daerah.py` (baru; `cari`, `kenali`, `periode`, `cocok_pemda`, cache 30 hari di `data/raw/unit/jdih/`), `scripts/bnpb/unit/jalan.py` (daftar langkah mingguan, KA §8).
- **Di luar:** teks penuh dokumen; PSPB-1 dan KS-1.
- **Dependensi:** RU-025, RU-021.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer` (`esc` hilir, jeda, User-Agent).
- **Langkah:**
  - [ ] `--cek` atas fixture RU §4 baris MB-3: periode 2025-2029 `berlaku`; tanpa periode = penetapan + 5 tahun `diduga`; jeda 1 detik dan cache 30 hari dibuktikan jam palsu; 5xx memberi `tidak_bisa_dicek`.
  - [ ] Tulis modul; `cocok_pemda` lewat `scripts/bnpb/wilayah_kab.py`.
  - [ ] Periksa selisih 513 lawan 514 kab di `public/data/bnpb/wilayah.json` (DT §10 butir 10) dan laporkan kab yang hilang.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/jdih_daerah.py --cek && python3 -I scripts/bnpb/unit/jalan.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.3; RU §4 baris MB-3. **Ukuran:** M

#### RU-027 MB-4 `skor.py`
- **Tujuan:** satu fungsi skor prioritas daerah dengan bobot tampil (putusan P-13: dibangun di F1).
- **Berkas:** `scripts/bnpb/unit/skor.py` (baru; `persentil`, `skor`, `--cek`).
- **Di luar:** sistem pemakai.
- **Dependensi:** RU-000.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek` atas kasus acuan A1-A10 (ALGORITMA §5.6, RU §2.2) dan invarian monoton.
  - [ ] Rata-rata geometrik berbobot persis ALGORITMA §5.2, komponen bawaan §5.4 (risiko = jiwa terpapar kelas tinggi, bukan `R_total`); label "Asumsi: bobot sementara"; tidak ada mode jumlah berbobot (KA §8).
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/skor.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** ALGORITMA §5; DT §4.4; RU §2.2. **Ukuran:** S

#### RU-028 MB-5 `neraca.py`
- **Tujuan:** kebutuhan dari standar lawan ketersediaan, dengan `belum_dilaporkan` yang tidak pernah dianggap nol.
- **Berkas:** `scripts/bnpb/unit/neraca.py` (baru; `kebutuhan`, `neraca`, `--cek`, `--kembar <kasus>`).
- **Di luar:** kembar JS (RU-029).
- **Dependensi:** RU-016.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek` atas kasus RU §2.3 (PLP-1 S1 sampai S10, WIL-2 K1 sampai K5, RRP-1 R1 sampai R4 bagian neraca).
  - [ ] Standar hanya dari Jam Aturan lewat `aturan.py`.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/neraca.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.5; RU §2.3. **Ukuran:** S

#### RU-029 MB-5 `kebutuhanDasar` JS dan uji kembar
- **Tujuan:** hitung kebutuhan dasar per tempat pengungsian di klien sama persis dengan Python.
- **Berkas:** `public/inti/jam_aturan.js` (fungsi `kebutuhanDasar(jiwa, hari_sejak_buka, kk)`), `tests/bnpb/unit_kembar.test.mjs` (diperluas; kasus MB-5).
- **Di luar:** layar WIL-2.
- **Dependensi:** RU-028, RU-015.
- **Pengerja / pemeriksa:** `inti-layar` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Uji kembar menjalankan JS dan `python3 -I scripts/bnpb/unit/neraca.py --kembar` pada kasus `acuan.json`; toleransi relatif 0,1%.
  - [ ] Tulis fungsi; standar dari JSON Jam Aturan.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_kembar.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.5; RU §1.1 L3. **Ukuran:** S

#### RU-030 MB-6 `rapor.py` dan perender `rapor.js`
- **Tujuan:** satu skema kartu dan satu perender `.ex-std` untuk semua sistem bertampilan rapor; label sumber per angka.
- **Berkas:** `scripts/bnpb/unit/rapor.py` (baru; `kartu()`, `berkas()`, `--cek`), `public/bnpb/unit/rapor.js` (baru; `render(kartu)`), `tests/bnpb/unit_layar.test.mjs` (diperluas; perender kartu), `tests/bnpb/fixtures/unit/r2/contoh.json` (baru).
- **Di luar:** `gerbang-kartu-std.test.mjs` (RU-031).
- **Dependensi:** RU-020.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Uji perender dulu: pil label selalu ada; `.hl` hanya pada angka dari `angka`; tiap `.hl` dan sel angka membawa `data-sumber` dan `title`; tanpa titik tengah; indikator tanpa masukan tampil "belum ada data" dan tidak ikut rata-rata (RU §4 baris MB-6).
  - [ ] Skema persis DT §4.6; rupa persis DS §7.6 dan §5.2 (`.un-lbl`, `.un-per`).
  - [ ] `rapor.py --cek` menolak kartu tanpa `label` atau dengan label di luar daftar.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/rapor.py --cek && node --test tests/bnpb/unit_layar.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.6; DS §5.2, §7.6; RU §4 baris MB-6. **Ukuran:** M

#### RU-031 G-3 perluasan gerbang kartu standar
- **Tujuan:** tiap `public/bnpb/unit/*.js` yang merender kartu terdaftar di `LAYAR`; layar baru yang lupa didaftarkan gagal.
- **Berkas:** `tests/agen/gerbang-kartu-std.test.mjs` (entri `public/bnpb/unit/unit.html` dengan `unit.js` dan `rapor.js`; meta-uji daftar berkas direktori lawan `LAYAR`).
- **Di luar:** melonggarkan syarat kartu yang sudah ada.
- **Dependensi:** RU-030.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `general-purpose` baru.
- **Langkah:**
  - [ ] Uji diri menolak berkas fiktif `public/bnpb/unit/contoh.js` yang tidak terdaftar.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/agen/gerbang-kartu-std.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** RU §6.1 G-3, §6.2; DT §4.6 "Gerbang". **Ukuran:** S

#### RU-032 MB-7 migrasi 0112 dan uji skema
- **Tujuan:** tabel isian manusia Ruang Unit: `unit_ketuk`, `akses_status`, `hibah_bast`, `diklat_angkatan`.
- **Berkas:** `migrations/0112_unit.sql` (baru; persis DT §2.2), `tests/warga/unit_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** rute; `pengungsian_*` (RU-096).
- **Dependensi:** RU-018 (nomor dan berkas uji).
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Langkah:**
  - [ ] Cek nomor migrasi.
  - [ ] Uji SQL langsung yang salah DITOLAK: `unit_ketuk` UPDATE ditolak, DELETE baris nyata ditolak, `koreksi` tanpa `keputusan = 'koreksi'` ditolak; `akses_status` status di luar tiga nilai ditolak, baris kembar per (titik, tgl, status) ditolak; `hibah_bast` mengubah selain `tgl_lapor` ditolak, `tgl_lapor` sebelum `tgl_bast` ditolak; `diklat_angkatan` `n_lulus > n_peserta` ditolak; migrasi dua kali tanpa galat.
  - [ ] Uji `EXPLAIN QUERY PLAN` kueri `GET /api/unit/ketuk` memakai `unit_ketuk_berkas` (DT §9.3).
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit_skema.test.mjs && npm run uji:warga`.
- **Pemilik:** menerapkan 0112 di produksi di RU-057.
- **Rujukan:** DT §2.2, §9.3; RU §1.1 L4. **Ukuran:** M

#### RU-033 MB-7 rute ketuk
- **Tujuan:** staf menyetujui, menolak, atau mengoreksi usulan baris dengan satu ketuk.
- **Berkas:** `src/unit.js` (`GET /api/unit/ketuk?berkas=`, `POST /api/unit/ketuk`, daftar putih medan koreksi per berkas), `tests/warga/unit.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** layar (RU-034).
- **Dependensi:** RU-032, RU-019.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Langkah:**
  - [ ] Uji Miniflare: tamu 401; akun gerbang `AKUN_SITUS*` 401 (`modAtauStaf`, RU-109); `pimpinan` menulis 201; `operator_cc` menulis 403; tanpa `x-pb` ditolak; origin lain ditolak; kunci badan liar 400; medan koreksi di luar daftar 400; batas laju 300 per jam; `GET` mengembalikan keputusan terbaru per `usulan_id`.
  - [ ] Tulis rute persis DT §4.9.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.7, §4.9, §9.1, §9.2 butir 6; RU §4 baris MB-7. **Ukuran:** S

#### RU-034 MB-7 `terima.py` dan layar `ketuk.js`
- **Tujuan:** usulan baris ber-id stabil dari dokumen, digabung dengan keputusan staf; layar antrean setuju.
- **Berkas:** `scripts/bnpb/unit/terima.py` (baru; `usulan()`, `gabung()`, pembaca `unit_ketuk` lewat satu `wrangler d1 execute`), `public/bnpb/unit/ketuk.js` (baru), `tests/bnpb/unit_ketuk.test.mjs` (baru), `tests/agen/gerbang-kartu-std.test.mjs` (entri `LAYAR` bila `ketuk.js` merender kartu; izin sesi induk karena berkas milik `penulis-gerbang`).
- **Di luar:** pengurai sistem (KPOD-3, RRP-2, dan seterusnya).
- **Dependensi:** RU-033, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] `--cek`: id = sha1 16 heks stabil antarjalan; `gabung` memberi `menunggu`, `diterima`, `ditolak`, `dikoreksi`; koreksi menimpa hanya medan yang dikoreksi; usulan tanpa ketuk tidak masuk angka kecuali `resmi` + `pola_tetap` berpil "belum dikonfirmasi".
  - [ ] Layar rupa DS §7.7; tombol menyembunyikan baris di klien tanpa menunggu render ulang (INP).
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/terima.py --cek && node --test tests/bnpb/unit_ketuk.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.7; DS §7.7; RU §4 baris MB-7. **Ukuran:** M

#### RU-035 MB-8 `panen.py` inti dan CKAN
- **Tujuan:** satu pustaka ambil-data dengan atribusi, cache, jeda, coba ulang, dan daftar larangan; versi CKAN untuk PUS-1.
- **Berkas:** `scripts/bnpb/unit/panen.py` (baru; `ambil_json`, `ckan`, `DILARANG`, `--cek`), `tests/bnpb/fixtures/unit/ckan/` (tangkapan `organization_list` dan `package_search`).
- **Di luar:** ArcGIS, INALOGPAL, SIRUP (RU-036).
- **Dependensi:** RU-021, RU-024.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`.
- **Langkah:**
  - [ ] `--cek` dengan `urlopen` tiruan: cache segar tidak memanggil jaringan; coba ulang 2, 4, 8 detik; gagal keras menyebut URL dan kode HTTP; `DILARANG` menolak `survey123`; sumber berubah bentuk keluar bukan 0.
  - [ ] Tiap keluaran membawa `sumber: [{nama, url, diambil, lisensi}]`.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/panen.py --cek && node --test tests/agen/gerbang-privasi-unit.test.mjs`.
- **Pemilik:** tidak ada (U4 bawaan: ya, agregat, layar staf saja).
- **Rujukan:** DT §4.8, §8; RU §4 baris MB-8. **Ukuran:** M

#### RU-036 MB-8 ArcGIS, INALOGPAL, SIRUP
- **Tujuan:** pembaca agregat ArcGIS BNPB, API publik INALOGPAL, dan pembungkus SIRUP untuk sistem F2.
- **Berkas:** `scripts/bnpb/unit/panen.py` (`arcgis_daftar`, `arcgis_agregat`, `inalogpal`, `sirup`), `tests/bnpb/fixtures/unit/arcgis/`, `tests/bnpb/fixtures/unit/inalogpal/`, `tests/bnpb/fixtures/unit/sirup/`.
- **Di luar:** `docs/pendanaan/sirup_tarik.py` (dipakai, tidak diubah); SPSE (diprobe di RU-071).
- **Dependensi:** RU-035.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`.
- **Langkah:**
  - [ ] `--cek`: `arcgis_agregat` menolak `outFields=*` dan selalu `returnGeometry=false`; `inalogpal` menolak `get_instansi_survey`; nama penyedia SIRUP tidak keluar dari modul ke keluaran.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/panen.py --cek && node --test tests/agen/gerbang-privasi-unit.test.mjs`.
- **Pemilik:** tidak ada (U4 bawaan; U6: pemilik melaporkan layer Survey123 ke Pusdatinkom).
- **Rujukan:** DT §4.8, §8; RU §4 baris MB-8, §9 butir 10. **Ukuran:** M

### 3.C Sistem F1 (minggu 48-51, 23 Nov-20 Des 2026)

Pola tiap tiket sistem pipeline: skrip `scripts/bnpb/unit/<nama>.py` dengan `--cek` atas kasus RU §2, didaftarkan di `LANGKAH` `jalan.py`, nama berkasnya ditambahkan ke `DATA_UNIT` (`src/unit.js`, lewat tiket `warga-api` terkecil di gelombang yang sama atau langkah tambahan di RU-057), kartu lewat `rapor.js` di `/bnpb/unit/<kode>`, ID dipindah dari `antre` ke `diuji` di `tests/bnpb/unit_cakupan.json`. Penambahan nama ke `DATA_UNIT` dikumpulkan sesi induk menjadi satu suntingan `warga-api` per gelombang supaya `src/unit.js` tidak disentuh pengerja `ruang-bnpb`.

#### RU-037 HUK-1 kartu status peraturan
- **Tujuan:** kartu "N peraturan tertulis BERLAKU di JDIH padahal dicabut menurut teksnya" dengan unduhan CSV untuk Biro Hukum.
- **Berkas:** `scripts/bnpb/unit/huk1.py` (baru; keluaran `unit/status_peraturan.json` skema DT §4.1), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** `hukum.py`.
- **Dependensi:** RU-014, RU-030, RU-021.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek` atas katalog fixture: jumlah konflik = panjang `konflik`; dokumen tanpa teks dihitung terpisah.
  - [ ] Kartu rupa DS §7.8, tautan ke `/bnpb/hukum`.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/huk1.py --cek && node --test tests/agen/gerbang-status-hukum.test.mjs`.
- **Pemilik:** U7 meneruskan CSV.
- **Rujukan:** DT §4.1, §5.14; RU §5.1 baris HUK-1; PRD §6.19. **Ukuran:** S

#### RU-038 KPOD-2 kartu Jam Aturan
- **Tujuan:** kartu "Jam Aturan: N tenggat berpasal, M asumsi" yang dibaca langsung dari `public/inti/jam_aturan.json` (teks pasal publik, bukan R2).
- **Berkas:** `public/bnpb/unit/unit.js` atau berkas tampilan yang ditunjuk `katalog.js` untuk KPOD-2, `tests/bnpb/unit_layar.test.mjs`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** isi Jam Aturan.
- **Dependensi:** RU-015, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Tabel kunci, nilai, sejak, acuan (tautan dokumen dan pasal di `/bnpb/hukum`), kutipan, dipakai oleh; entri asumsi berpil "asumsi" (G-1 butir 3, `labelAturan()`).
  - [ ] Uji render dengan fixture.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/agen/gerbang-jam-aturan.test.mjs tests/bnpb/unit_layar.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.5; DS §7.5; RU §5.1 baris KPOD-2. **Ukuran:** S

#### RU-039 KPOD-2 masa status dari Jam Aturan
- **Tujuan:** angka masa status 14, 31, 92 hari di `status_pedoman.js` dibaca dari kunci `masa_status_*` berlabel asumsi.
- **Berkas:** `public/inti/status_pedoman.js`, `tests/agen/status-pedoman.test.mjs` (bila asersinya menyebut angka lama), `tests/agen/gerbang-jam-aturan.test.mjs` (cabut pengecualian bertanggal RU-007; izin sesi induk).
- **Di luar:** `public/semua/darurat.js`.
- **Dependensi:** RU-015.
- **Pengerja / pemeriksa:** `inti-layar` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Ganti angka dengan `nilai("masa_status_*")`; teks tampil berlabel asumsi (RU §9 butir 3).
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.5 "Perubahan lain"; RU §9 butir 3. **Ukuran:** S

#### RU-040 RRX-1 `rrx1.py` dan kartu jam pascabencana
- **Tujuan:** jam 90 hari R3P per kejadian per kab, kelas hijau, kuning, merah, dan urutan beban stimulan.
- **Berkas:** `scripts/bnpb/unit/rrx1.py` (baru; keluaran `unit/jam_pascabencana.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** kolom meja (RU-041).
- **Dependensi:** RU-016, RU-030, RU-012 (F0-3 terbit).
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek` atas kasus RU §2.6 X1 sampai X9 (penggabungan SK berjarak paling lama 14 hari, sisa hari, kelas, ambang layak, `kejadian_ref`).
  - [ ] Pembacaan meja `rehab` lewat satu `wrangler d1 execute` per jalan dengan `WHERE meja = 'rehab' AND dummy = 0`; tanpa token di `--cek`.
  - [ ] Kartu rupa DS §7.5; tombol "catat R3P" membuka isian meja `rehab` dengan `kejadian_ref` dan wilayah terisi.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/rrx1.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.8; RU §2.6, §5.1 baris RRX-1; DS §7.5. **Ukuran:** M

#### RU-041 RRX-1 kolom `tgl_r3p` dan uji alur
- **Tujuan:** staf mencentang R3P di meja `rehab`, dan alur neraca, catatan rehab tanpa kaji cepat, jam RRX-1 teruji ujung ke ujung.
- **Berkas:** `src/meja_spek.js` (kolom data `tgl_r3p` dan `tgl_usulan`, tanggal opsional, `maks: "hariini"`), `tests/warga/unit_alur.test.mjs` (baru), `tests/warga/meja.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** migrasi (kolom data JSON).
- **Dependensi:** RU-010, RU-040.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Langkah:**
  - [ ] Uji alur RU §3.3 baris terakhir: catatan rehab tanpa `kaji_id` dengan `kejadian_ref`, centang `tgl_r3p`, hasil `rrx1.py` atas data D1 Miniflare berkelas selesai; `tgl_r3p` di masa depan ditolak 400.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit_alur.test.mjs tests/warga/meja.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.8 baris D1; RU §1.1 L6, §3.3. **Ukuran:** S

#### RU-042 PLP-1 neraca stok penyangga
- **Tujuan:** kebutuhan stok 72 jam pertama untuk 514 kab/kota pada tiga skenario PR, dengan uji balik DIBI.
- **Berkas:** `scripts/bnpb/unit/plp1.py` (baru; keluaran `unit/stok_penyangga.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** stok INALOGPAL `gudang_sumbar` (menyusul sesudah RU-036, tiket ini membiarkan stok `belum_dilaporkan`).
- **Dependensi:** RU-028, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model` (uji balik, pemangkasan persentil 99), `selera-angka`.
- **Langkah:**
  - [ ] `--cek` menghitung ulang contoh Purbalingga DT §5.7 dan kasus RU §2.3 S1 sampai S10; 514 baris, tiap kab tepat sekali; stok kosong tidak pernah 0.
  - [ ] Uji balik DIBI dengan sha256 masukan di keluaran.
  - [ ] Kartu rupa DS §7.4; label `hitungan_kita` dan dua bacaan Pasal 11 berlabel.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/plp1.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.7; RU §2.3, §5.1 baris PLP-1; DS §7.4. **Ukuran:** M

#### RU-043 PERB-1 pemilih daerah pendampingan IKD
- **Tujuan:** daftar urut kab dengan manfaat penurunan IRB per biaya proksi, berlabel "bukan IRB resmi" dan "C proksi".
- **Berkas:** `scripts/bnpb/unit/perb1.py` (baru; keluaran `unit/pendampingan_ikd.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** nilai IKD resmi per kab (U10).
- **Dependensi:** RU-027, RU-015 (`ikd_ambang_kelas`), RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`, `selera-angka`.
- **Langkah:**
  - [ ] `--cek` atas kasus RU §2.4 (cocok 1e-5) dan DT §5.1 (C di atas 0,80 tidak masuk; manfaat tidak negatif; C lebih rendah memberi d lebih besar).
  - [ ] Batas kelas sedang 0,40 ≤ C < 0,80 (RU §9 butir 4), agregasi H = maks berlabel asumsi.
  - [ ] Kartu rupa DS §7.3; label wajib G-4 butir d.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/perb1.py --cek && node --test tests/agen/gerbang-ruang-unit.test.mjs`.
- **Pemilik:** U10: nilai IKD 2025 per kab bila bisa diminta ke Dit. PERB (bawaan: tidak tersedia, proksi raster).
- **Rujukan:** DT §5.1, §10 butir 7; RU §2.4, §5.1 baris PERB-1; DS §7.3. **Ukuran:** M

#### RU-044 PUS-1 rapor walidata Satu Data
- **Tujuan:** rapor per produsen data dari API CKAN data.bnpb.go.id dan persen 37 data prioritas yang terbit.
- **Berkas:** `scripts/bnpb/unit/pus1.py` (baru; keluaran `unit/satu_data.json`), `scripts/bnpb/unit/data_prioritas.json` (baru; diketik dari `data/kajian-bnpb/pustaka/5-lakip.md` §6), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** tab di `/pendataan` (cukup tautan).
- **Dependensi:** RU-035, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek` atas fixture CKAN: paket tanpa `frequency` tidak dihitung basi; produsen 0 dataset tampil (nilai `null` untuk median dan persen); kasus basi RU §2.7.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/pus1.py --cek`.
- **Pemilik:** tidak ada (U4 bawaan).
- **Rujukan:** DT §5.2; RU §5.1 baris PUS-1, §2.7. **Ukuran:** S

#### RU-045 KPOD-3 arsip Laphar mode satu hari
- **Tujuan:** satu PDF Laphar hari itu diurai dan ditambahkan ke `laphar_riwayat.json` dengan medan `pendampingan` sebagai kelas kata kunci.
- **Berkas:** `scripts/umum/laphar_arsip.mjs` (mode `--hari YYYY-MM-DD`), `scripts/umum/laphar_arsip.py` (medan `pendampingan`), `tests/wa/fixtures/` (satu PDF contoh dibersihkan dari nama petugas, atau teks `pdftotext` hasilnya), `tests/wa/laphar_arsip_hari.test.mjs` (baru).
- **Di luar:** pengatur WA (RU-046); arti teks penuh pendampingan.
- **Dependensi:** RU-034 (usulan baris ragu).
- **Pengerja / pemeriksa:** `pipa-umum` / `security-reviewer` (fixture tanpa nama orang).
- **Langkah:**
  - [ ] Uji mode satu hari pada fixture: `data/raw/laphar/hari/YYYY-MM-DD.json` tertulis; `cakupan.sampai` maju satu hari; yang di-commit tetap agregat.
  - [ ] Baris ragu ditulis ke `/tmp/unit/usulan_laphar.json` lewat `terima.py`.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/wa/laphar_arsip_hari.test.mjs` (berkas uji baru di `tests/wa/`, milik `wa-bot`, ditulis pengerja ini atas izin sesi induk; `npm run uji:wa` tidak menjalankan seluruh `tests/wa/`, jadi berkas ini juga dirangkai ke sana oleh RU-046).
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.6; RU §5.1 baris KPOD-3. **Ukuran:** S

#### RU-046 KPOD-3 entri `arsip_laphar` di pengatur WA
- **Tujuan:** begitu `laphar_pdf` hari itu tiba, Mac mini menjalankan arsip satu hari dan meng-commit lewat jalur generator yang sudah ada.
- **Berkas:** `scripts/wa/otomatis.mjs` (entri `LAPORAN` "arsip_laphar"), `tests/wa/otomatis.test.mjs`, `package.json` (tambah `tests/wa/otomatis.test.mjs` dan `tests/wa/laphar_arsip_hari.test.mjs` ke `uji:wa`; izin sesi induk karena milik `mekanik-mesin`).
- **Di luar:** `src/wa_jenis.js` (jenis `laphar_pdf` sudah ada).
- **Dependensi:** RU-045.
- **Pengerja / pemeriksa:** `wa-bot` / `security-reviewer`.
- **Langkah:**
  - [ ] Uji kasus "laphar_pdf tiba, arsip_laphar siap".
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/wa/otomatis.test.mjs && npm run uji:wa`.
- **Pemilik:** memastikan gateway WA di Mac mini hidup (OUTSTANDING E1) dan memasang ulang layanan launchd sesudah tiket ini terbit.
- **Rujukan:** DT §5.6. **Ukuran:** S

#### RU-047 KPOD-3 kartu cakupan Laphar
- **Tujuan:** kartu "Laphar terurai sampai <tanggal>, N hari bolong" di `/bnpb/unit/kpod`.
- **Berkas:** `tests/bnpb/unit_kpod3.test.mjs` (baru), berkas tampilan KPOD di `public/bnpb/unit/` menurut `katalog.js`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** `laphar_riwayat.json` (dibaca, tidak diubah).
- **Dependensi:** RU-045, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] Kartu dari `cakupan.sampai` dan `cakupan.tanpa_pdf`; uji: tertinggal lebih dari 1 hari menampilkan pil basi.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_kpod3.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.6 baris Layar. **Ukuran:** S

#### RU-048 REN-1 rapor Reformasi Birokrasi
- **Tujuan:** kartu "Poin RB yang hilang: X dari 100" per komponen dan pemiliknya.
- **Berkas:** `scripts/bnpb/unit/ren1.py` (baru; keluaran `unit/rb.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** `scripts/bnpb/iku.py` (P-11).
- **Dependensi:** RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: 22 komponen terurai; jumlah bobot sama dengan yang tertulis; Tata Kelola Pengadaan 0,44 dari 2; kasus RU §2.7.
  - [ ] Faktor kemudahan berlabel "penilaian analis".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ren1.py --cek`.
- **Pemilik:** memutus kelak apakah kartu ini boleh pindah ke `/kinerja-bnpb` publik (U2).
- **Rujukan:** DT §5.11; RU §5.1 baris REN-1. **Ukuran:** S

#### RU-049 REN-3 kalender monev
- **Tujuan:** 12 bulan tenggat pelaporan berulang dengan pasal dan unit pemilik.
- **Berkas:** `scripts/bnpb/unit/ren3.py` (baru; keluaran `unit/kalender_monev.json`), `tests/bnpb/unit_ren3.test.mjs` (baru; render), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** pengingat WA (U11).
- **Dependensi:** RU-016, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] `--cek`: tenggat hari kerja sesuai RU §2.1; tenggat berpemicu peristiwa (TLHP) tampil sebagai aturan, bukan tanggal.
  - [ ] Kartu rupa DS §7.5.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ren3.py --cek && node --test tests/bnpb/unit_ren3.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.12; RU §5.1 baris REN-3. **Ukuran:** S

#### RU-050 JF-1 kamus kompetensi
- **Tujuan:** kamus PB.01 sampai PB.58 terstruktur dengan level 1 sampai 5, indikator, dan jenjang minimum bawaan.
- **Berkas:** `scripts/bnpb/unit/jf1.py` (baru; keluaran `unit/kompetensi.json`), `public/bnpb/unit/jf1.js` (baru; cari dan lihat level), `tests/bnpb/unit_layar.test.mjs`, `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`, `tests/agen/gerbang-kartu-std.test.mjs` (entri `LAYAR`; izin sesi induk).
- **Di luar:** standar kompetensi PermenPANRB.
- **Dependensi:** RU-030, RU-015 (`jf_jp_tahun`).
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer` (pencarian tidak membekukan layar).
- **Langkah:**
  - [ ] `--cek` invarian RU §5.1 catatan JF-1: jumlah kode terurai = jumlah kode `PB.\d\d` unik di teks; tiap kode 5 level; 58 dicetak sebagai pembanding, bukan asersi.
  - [ ] Masukan `data/hukum/seed.sql` (di git); `data/raw/hukum/teks/perban-nomor-5-tahun-2024.json` dipakai bila ada (checkout utama).
  - [ ] Pencarian di klien lewat `nanti()` bila lebih dari 50 ms.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/jf1.py --cek && node --test tests/bnpb/unit_layar.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.15; RU §5.1 baris JF-1; DS §7.9. **Ukuran:** S

#### RU-051 PD-3 `pesanStandar`
- **Tujuan:** fungsi murni penyusun pesan peringatan enam baris berstandar Perban 2/2024 Pasal 20.
- **Berkas:** `public/ews_tindakan.js` (fungsi `pesanStandar(peringatan, konteks)`), `tests/bnpb/unit_pd3.test.mjs` (baru; izin sesi induk karena milik `ruang-bnpb`).
- **Di luar:** tombol di `/peringatan` dan `/prediksi` (U2); layar unit (RU-052).
- **Dependensi:** RU-000.
- **Pengerja / pemeriksa:** `layar-peta` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Uji dulu: semua jenis x tingkat memberi 6 baris tak kosong; konteks kosong memberi "belum ada data" di baris 3, 4, 6; tanpa titik tengah; tidak ada fungsi kirim.
  - [ ] Tulis fungsi; `src/ews.js` tetap mengimpor berkas yang sama.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_pd3.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.3; RU §5.1 baris PD-3. **Ukuran:** S

#### RU-052 PD-3 layar penyusun pesan
- **Tujuan:** staf menyusun pesan dari peringatan aktif dan konteks kab, lalu menyalin teks WA atau mengunduh kartu PNG.
- **Berkas:** `public/bnpb/unit/pd3.js` (baru), `tests/bnpb/unit_layar.test.mjs`, `tests/bnpb/unit_cakupan.json`, `tests/agen/gerbang-kartu-std.test.mjs` (entri `LAYAR`; izin sesi induk).
- **Di luar:** kirim otomatis ke warga (Perban 4/2022 Pasal 7).
- **Dependensi:** RU-051, RU-020.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Rupa DS §7.9; konteks dari `GET /api/peringatan/aktif`, `terpapar.json`, `siaga.json`.
  - [ ] Uji: tidak ada `fetch` POST di berkas.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_pd3.test.mjs tests/bnpb/unit_layar.test.mjs && npm run uji:agen`.
- **Pemilik:** memutus kelak tombol di layar publik (U2).
- **Rujukan:** DT §5.3; DS §7.9. **Ukuran:** S

#### RU-053 KS-4 kalender gladi
- **Tujuan:** bulan gladi per kab 1 sampai 2 bulan sebelum musim bahaya utama, dengan kerangka skenario dari kejadian terburuk DIBI.
- **Berkas:** `scripts/bnpb/unit/ks4.py` (baru; keluaran `unit/kalender_gladi.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** `scripts/bnpb/siaga.py` dan `siaga.json` publik (P-11).
- **Dependensi:** RU-016, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek` atas kasus RU §2.7; kab tanpa musim tanpa saran.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ks4.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.4; RU §5.1 baris KS-4. **Ukuran:** S

#### RU-054 RRP-3 kalkulator Jitupasna
- **Tujuan:** kalkulator kerusakan dan kebutuhan permukiman di peramban dengan IKK BPS, unduhan CSV lampiran 7 Perka 15/2011, tanpa simpan server.
- **Berkas:** `public/bnpb/unit/rrp3.js` (baru; `kerusakan`, `kebutuhan`, `periksaGanda`), `scripts/bnpb/unit/ikk.py` (baru; keluaran `unit/ikk.json`, pola `scripts/bnpb/puso.py`), `tests/bnpb/unit_rrp3.test.mjs` (baru), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`, `tests/agen/gerbang-kartu-std.test.mjs` (entri `LAYAR`; izin sesi induk).
- **Di luar:** RRP-1 (unit otomatis menyusul di RU-065).
- **Dependensi:** RU-020, RU-021.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Uji kasus RU §2.5 J1 sampai J6; tidak ada `fetch` POST; IKK kab kosong memakai IKK provinsi berlabel.
  - [ ] `ikk.py --cek` tanpa jaringan; tanpa `BPS_KEY` memakai berkas cache terakhir.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_rrp3.test.mjs && python3 -I scripts/bnpb/unit/ikk.py --cek`.
- **Pemilik:** GitHub secret `BPS_KEY` (RU-022).
- **Rujukan:** DT §5.9; RU §2.5, §5.1 baris RRP-3; DS §7.9. **Ukuran:** S

#### RU-055 RRS-3 fasilitas sosial rusak
- **Tujuan:** daftar fasilitas sosial OSM di dalam jejak bahaya per kejadian, berlabel "cakupan OSM, batas bawah".
- **Berkas:** `scripts/bnpb/unit/rrs3.py` (baru; keluaran `unit/fasilitas_sosial.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** Dapodik (dilarang sampai diuji izinnya, DT §8).
- **Dependensi:** RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek` atas fixture poligon banjir dan MMI ≥ VII; selisih lawan `f_pendidikan` DIBI ditandai, bukan dikoreksi.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/rrs3.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §5.10; RU §5.1 baris RRS-3; DS Catatan butir 9. **Ukuran:** S

#### RU-056 KEU-1 penguji konsistensi LAKIP dan LK
- **Tujuan:** skrip lokal pemilik yang menulis daftar selisih angka berhalaman dari draf PDF; kartu `/bnpb/unit/keu` hanya cara pakai.
- **Berkas:** `scripts/bnpb/unit/keu1.py` (baru), `tests/bnpb/unit_cakupan.json` (`dikecualikan` dengan alasan "berjalan di mesin pemilik atas data internal"), `tests/warga/cakupan.json` (bila registri itu yang memuat pengecualian lokal).
- **Di luar:** R2, D1, rute; berkas masukan di git.
- **Dependensi:** RU-020.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `higiene-repo` (tidak ada draf ter-commit, pola `.gitignore` ada).
- **Langkah:**
  - [ ] `--cek` memakai tujuh selisih di `5-lakip.md` bagian 7; Biro Keuangan 137,2/143,4 dibulatkan 95,68% (RU §9 butir 5).
  - [ ] Kartu "Dijalankan lokal" DS §8.6.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/keu1.py --cek && node --test tests/agen/gerbang-privasi-unit.test.mjs`.
- **Pemilik:** menjalankan `python3 -I scripts/bnpb/unit/keu1.py <draf.pdf> > <di luar repo>/selisih.md` saat draf ada.
- **Rujukan:** DT §5.13; RU §5.1 baris KEU-1; DS §8.6. **Ukuran:** S

#### RU-057 [induk] Tinjauan dan terbit F1
- **Tujuan:** kerangka, mesin F1, dan 15 sistem F1 tayang di balik sesi staf.
- **Berkas:** commit path spesifik atas tiket RU-013 sampai RU-056 yang berstatus `tinjau`; satu suntingan `warga-api` atas `DATA_UNIT` di `src/unit.js` untuk semua berkas F1.
- **Di luar:** `git add -A`; sistem F2.
- **Dependensi:** RU-014 sampai RU-024, RU-027, RU-028, RU-030 sampai RU-035, RU-037 sampai RU-056.
- **Pengerja / pemeriksa:** sesi induk / tinjauan menyeluruh berkonteks bersih per lapisan (`guard-api` dan `security-reviewer` untuk `src/unit.js`; `selera-angka` dan `inp-reviewer` untuk `public/bnpb/unit/**`; `validasi-model` untuk PERB-1, PLP-1, MB-4; `higiene-repo`).
- **Langkah:**
  - [ ] Perintah ringkas RU §1.3 baris pertama hijau di checkout bersih.
  - [ ] Pemilik menerapkan 0111 dan 0112, dan seed hukum RU-014.
  - [ ] Commit, push, tunggu `terbit.yml` hijau; `workflow_dispatch` `data.yml`; periksa `/api/unit/indeks` dengan sesi staf: semua berkas F1 `ok: true`.
  - [ ] Gerbang F1 PRD §4.2 dicentang; sapu branch.
- **Bukti:** `npm run uji:agen && npm run uji:layar && npm run uji:warga && for s in scripts/bnpb/unit/*.py; do python3 -I "$s" --cek || exit 1; done`.
- **Pemilik:** `npx wrangler@4.42.0 d1 migrations apply poskowarga --remote` (0111, 0112); seed hukum; akun staf `unit` pertama.
- **Rujukan:** PRD §4.2 gerbang F1; RU §1.3, §8. **Ukuran:** M

### 3.D Sistem F2 Januari 2027 (MB-4, MB-5, MB-8 lengkap)

#### RU-058 PERB-2 kolom rusak sedang dan ringan DIBI
- **Tujuan:** `dibi_kab_tahun.json` membawa rumah rusak sedang dan ringan, tidak hanya berat.
- **Berkas:** `scripts/banjir/kejadian.py`, `public/data/dibi_kab_tahun.json` (dibangun ulang oleh pipeline).
- **Di luar:** skrip Ruang Unit.
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `banjir` / `validasi-model` (pemakai lama kolom tidak berubah).
- **Langkah:**
  - [ ] Tambah kolom; self-check yang ada diperluas; pemakai lama tetap hijau.
  - [ ] Jalankan bukti.
- **Bukti:** self-check `scripts/banjir/kejadian.py` yang sudah ada (perintahnya dibaca pengerja dari ilmu `banjir`) dan `npm run uji:banjir`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.1 baris Masukan. **Ukuran:** S

#### RU-059 PERB-2 kerugian ekonomi berjalan
- **Tujuan:** kerugian rumah per kab tahun berjalan dengan gerbang jujur lawan angka resmi 2025.
- **Berkas:** `scripts/bnpb/unit/perb2.py` (baru; keluaran `unit/kerugian.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** kerugian non-rumah.
- **Dependensi:** RU-058, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek`: selisih lebih dari 30% lawan Rp51,3 triliun memberi `belum_layak` dan tanpa angka rupiah; label batas bawah.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/perb2.py --cek`.
- **Pemilik:** biaya satuan bila bawaan stimulan 60, 30, 15 juta tidak diterima (riset/1 pertanyaan 2); `BPS_KEY`.
- **Rujukan:** DT §6.1; RU §5.2 baris PERB-2. **Ukuran:** M

#### RU-060 PSPB-3 rapor Sendai dan SDGs 11.b
- **Tujuan:** indikator A-1, B-1, C-1, E-1, E-2 per 100.000 penduduk dari data yang ada.
- **Berkas:** `scripts/bnpb/unit/pspb3.py` (baru; keluaran `unit/sendai.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** PSPB-1 (E kosong sampai RU-073 terbit).
- **Dependensi:** RU-059, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek`: penduduk nol memberi `null`; C-1 kosong bila PERB-2 `belum_layak`; definisi terdampak di `title` kolom.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/pspb3.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.3; RU §5.2 baris PSPB-3. **Ukuran:** S

#### RU-061 MT-2 daerah prioritas mitigasi
- **Tujuan:** kab kuartil atas risiko dan kapasitas rendah dengan 1 sampai 3 kegiatan berkode 02.01.xx.
- **Berkas:** `scripts/bnpb/unit/mt2.py` (baru; keluaran `unit/mitigasi_prioritas.json`), `scripts/bnpb/unit/mitigasi_peta.json` (baru), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** katalog Dana Bersama lengkap (RU-092).
- **Dependensi:** RU-027, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek`: kegiatan tanpa kode ditolak; label "usulan analis".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/mt2.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.11; RU §5.2 baris MT-2. **Ukuran:** S

#### RU-062 PLP-2 daftar pendek hibah logpal
- **Tujuan:** skor kriteria terukur Juklak 3/2024 untuk rapat; kriteria rapat tidak diskor.
- **Berkas:** `scripts/bnpb/unit/plp2.py` (baru; keluaran `unit/hibah_prioritas.json`), `scripts/bnpb/unit/standar_peralatan_2009.json` (baru), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** riwayat hibah sebelum U10.
- **Dependensi:** RU-027, RU-042.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek` kasus RU §2.2 A10 dan P2 (ALGORITMA §5.5 baris PLP-2); kolom "program prioritas nasional" dan "analisis strategis" kosong; label "daftar pendek, keputusan tetap di rapat".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/plp2.py --cek && node --test tests/agen/gerbang-ruang-unit.test.mjs`.
- **Pemilik:** U10: daftar penerima hibah logpal 3 tahun (bawaan: kriteria "belum menerima" kosong).
- **Rujukan:** DT §6.17; RU §5.2 baris PLP-2. **Ukuran:** M

#### RU-063 OJL-2 penempatan stok
- **Tujuan:** saran pindah stok musiman dan kirim paket 72 jam menjelang kejadian, tanpa graf jalan.
- **Berkas:** `scripts/bnpb/unit/ojl2.py` (baru; keluaran `unit/prepositioning.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** OJL-1 (F3); pesan WA (U11).
- **Dependensi:** RU-042, RU-027.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek`: tiap saran membawa pemicu; label "tanpa graf jalan" dan ambang 24 jam berlabel asumsi.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ojl2.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.19; RU §5.2 baris OJL-2; PRD §10 butir 6. **Ukuran:** M

#### RU-064 OJL-3 rapor Klaster Logistik
- **Tujuan:** rapor per provinsi dari API publik INALOGPAL dan draf Format-5 triwulan.
- **Berkas:** `scripts/bnpb/unit/ojl3.py` (baru; keluaran `unit/klaster_logistik.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** `get_instansi_survey`.
- **Dependensi:** RU-036.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`, `selera-angka`.
- **Langkah:**
  - [ ] `--cek` kasus RU §2.7; Api berubah bentuk keluar bukan 0; tanpa nama dan nomor PIC.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ojl3.py --cek && node --test tests/agen/gerbang-privasi-unit.test.mjs`.
- **Pemilik:** tidak ada (U4 bawaan).
- **Rujukan:** DT §6.20; RU §5.2 baris OJL-3. **Ukuran:** S

#### RU-065 RRP-1 neraca rumah rusak
- **Tujuan:** rumah rusak lapor lawan verifikasi lawan tersalur per kab, hanya agregat.
- **Berkas:** `scripts/bnpb/unit/rrp1.py` (baru; keluaran `unit/neraca_rumah.json`), `scripts/bnpb/unit/kamus_layer.json` (baru), `scripts/bnpb/unit/fixtures/ntt_2026.json` (baru, agregat kab), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** titik per rumah; layer Survey123.
- **Dependensi:** RU-036, RU-028.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`, `validasi-model`.
- **Langkah:**
  - [ ] `--cek` kasus RU §2.3 R1 sampai R4 dan fixture NTT (RB lapor 25.833, RB verifikasi 6.348, total verifikasi 120.574).
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/rrp1.py --cek && node --test tests/agen/gerbang-privasi-unit.test.mjs`.
- **Pemilik:** tidak ada (U4 bawaan).
- **Rujukan:** DT §6.21; RU §2.3, §5.2 baris RRP-1. **Ukuran:** M

#### RU-066 RRS-1 kunci kriteria uji
- **Tujuan:** kriteria lulus kalibrasi P(puso) dikunci sebelum hasil dilihat.
- **Berkas:** `scripts/bnpb/unit/lab_kriteria/rrs1.json` (baru; pola `scripts/data/lab_kriteria/`).
- **Di luar:** menjalankan model.
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] Tulis pembanding (rata-rata kab), metrik, ambang lulus, pembagian waktu; sesi induk meng-commit berkas ini sebelum RU-067 dikirim.
- **Bukti:** `python3 -I -c "import json; json.load(open('scripts/bnpb/unit/lab_kriteria/rrs1.json'))"`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.24; RU §5.2 baris RRS-1. **Ukuran:** S

#### RU-067 RRS-1 taksiran kerugian pertanian
- **Tujuan:** luas sawah tergenang per kab; rupiah hanya bila kalibrasi lulus kriteria terkunci.
- **Berkas:** `scripts/bnpb/unit/rrs1.py` (baru; keluaran `unit/rugi_tani.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** mengubah `lab_kriteria/rrs1.json`.
- **Dependensi:** RU-066.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek`: kalibrasi gagal memberi keluaran tanpa rupiah.
  - [ ] Unduh WorldCover sekali ke `data/raw/unit/worldcover/`.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/rrs1.py --cek`.
- **Pemilik:** `BPS_KEY`.
- **Rujukan:** DT §6.24; RU §5.2 baris RRS-1. **Ukuran:** M

#### RU-068 DIK-1 rute unggah dan ringkas diklat
- **Tujuan:** Pusdiklat mengunggah CSV angkatan tanpa nama peserta; agregat per kab terbaca.
- **Berkas:** `src/unit.js` (`POST /api/unit/diklat/unggah`, `GET /api/unit/diklat/ringkas`), `tests/warga/unit.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** migrasi (0112 sudah).
- **Dependensi:** RU-057 (0112 di produksi).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Langkah:**
  - [ ] Uji: akun gerbang `AKUN_SITUS*` 401 dan peran `unit` 201 (`modAtauStaf`, KA §8); CSV lebih dari 256 KB atau 2.000 baris ditolak; satu baris gagal = nol tersimpan (`DB.batch`), galat per nomor baris; kolom di luar daftar tetap ditolak; 10 unggahan per hari per staf.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.9 baris diklat; RU §5.2 baris DIK-1. **Ukuran:** S

#### RU-069 DIK-1 peta sasaran diklat
- **Tujuan:** kebutuhan diklat per kab dan prioritas sampai target Renstra 78%; cakupan tampil hanya bila unggahan ada.
- **Berkas:** `scripts/bnpb/unit/dik1.py` (baru; keluaran `unit/diklat_sasaran.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** nama peserta.
- **Dependensi:** RU-068, RU-027.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek` kasus RU §2.2 A5 dan A6 (ALGORITMA §5.5 baris DIK-1); tanpa unggahan "cakupan belum ada data", bukan 0.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/dik1.py --cek`.
- **Pemilik:** meminta Pusdiklat mengisi CSV angkatan 5 tahun (riset/6 pertanyaan 6).
- **Rujukan:** DT §6.29; RU §5.2 baris DIK-1. **Ukuran:** S

#### RU-070 REN-2 belanja lawan risiko
- **Tujuan:** rasio pangsa belanja SIRUP lawan pangsa kebutuhan per kab; paket pusat dilaporkan terpisah.
- **Berkas:** `scripts/bnpb/unit/ren2.py` (baru; keluaran `unit/belanja_risiko.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** DSP (tidak di RUP).
- **Dependensi:** RU-036.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek`: paket pusat tidak dihitung ke DKI; label "RUP adalah rencana".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ren2.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.25; RU §5.2 baris REN-2. **Ukuran:** S

#### RU-071 SDU-1 rapor tata kelola pengadaan
- **Tujuan:** porsi triwulan 1, e-Purchasing, PDN, UMK, Penunjukan Langsung, dan kandidat konsolidasi, tanpa nama penyedia.
- **Berkas:** `scripts/bnpb/unit/sdu1.py` (baru; keluaran `unit/pengadaan.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`, `public/inti/jam_aturan.json` (kunci ambang PL berlabel asumsi sampai Perpres dicek; izin sesi induk karena milik `inti-layar`).
- **Di luar:** IRT-2 (F3).
- **Dependensi:** RU-036.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`, `selera-angka`.
- **Langkah:**
  - [ ] Probe SPSE BNPB; bila tidak terbaca, catat dan lanjut dengan SIRUP saja.
  - [ ] `--cek` kasus RU §2.7; kata "pemecahan paket" ditolak; label "kandidat konsolidasi".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/sdu1.py --cek && node --test tests/agen/gerbang-ruang-unit.test.mjs tests/agen/gerbang-privasi-unit.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.26; RU §5.2 baris SDU-1. **Ukuran:** M

#### RU-072 [induk] Tinjauan dan terbit F2 Januari
- **Tujuan:** sistem RU-058 sampai RU-071 tayang.
- **Berkas:** commit path spesifik; suntingan `DATA_UNIT` gelombang ini.
- **Di luar:** `git add -A`.
- **Dependensi:** RU-058 sampai RU-071.
- **Pengerja / pemeriksa:** sesi induk / tinjauan per lapisan, `higiene-repo`.
- **Langkah:**
  - [ ] Bukti RU-057 hijau; commit, push, `terbit.yml` hijau, `data.yml` dispatch, `/api/unit/indeks` semua `ok`.
  - [ ] Sapu branch.
- **Bukti:** sama dengan RU-057.
- **Pemilik:** tidak ada.
- **Rujukan:** PRD §4.3. **Ukuran:** S

### 3.E Sistem F2 Februari 2027 (MB-3, MB-1 tahap amanat)

#### RU-073 PSPB-1 register status RPBD
- **Tujuan:** status RPBD 552 pemda menurut JDIH, dengan koreksi staf lewat `unit_ketuk`.
- **Berkas:** `scripts/bnpb/unit/pspb1.py` (baru; keluaran `unit/rpbd.json`, `unit/usulan_rpbd.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** jenis meja `rpbd` (tidak dibuat, KA §8); API publik (U2).
- **Dependensi:** RU-026, RU-034.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: 552 baris (514 + 38), tidak ada baris ganda per pemda; `tidak_ditemukan` berlabel "bukan berarti tidak punya"; `sesuai_3_2026` sesudah 6 Okt 2026.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/pspb1.py --cek`.
- **Pemilik:** tidak ada (U5 bawaan).
- **Rujukan:** DT §6.2; RU §5.2 baris PSPB-1. **Ukuran:** S

#### RU-074 KS-1 pemantau dokumen kesiapsiagaan
- **Tujuan:** status renkon, RPKB, rencana aksi per daerah dan bahaya menurut JDIH dan Jam Aturan.
- **Berkas:** `scripts/bnpb/unit/ks1.py` (baru; keluaran `unit/dokumen_siaga.json`, `unit/usulan_dokumen_siaga.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** jenis meja `rpkb` (tidak dibuat, KA §8).
- **Dependensi:** RU-026, RU-034.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: `berlaku`, `segera_habis`, `kedaluwarsa`, `perlu_reviu` dari Jam Aturan; RPKB `perlu_mutakhir` bila ada SK sesudah penetapan; label "batas bawah".
  - [ ] Tombol "salin ke Meja Kerja" membuka isian meja `renkon` terisi.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ks1.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.8; RU §5.2 baris KS-1. **Ukuran:** S

#### RU-075 SPB-1 peta NSPK
- **Tujuan:** matriks fase x jenis bencana berisi dokumen berlaku menurut teks, dan target Renstra yang lewat tahun.
- **Berkas:** `scripts/bnpb/unit/spb1.py` (baru; keluaran `unit/peta_nspk.json`), `scripts/bnpb/unit/renstra_nspk.json` (baru; diketik sekali dari Renstra Lampiran III), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** `hukum.py`.
- **Dependensi:** RU-014, RU-034.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: dokumen di `konflik` tidak dihitung berlaku.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/spb1.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.4; RU §5.2 baris SPB-1. **Ukuran:** S

#### RU-076 HUK-2 pelacak amanat
- **Tujuan:** amanat pengaturan turunan per pasal dan apakah sudah terpenuhi.
- **Berkas:** `scripts/bnpb/hukum.py` (`amanat(segmen)`), `scripts/bnpb/unit/huk2.py` (baru; keluaran `unit/amanat.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** JSON tanda manual di repo (diganti `unit_ketuk` berkas `usulan_amanat`).
- **Dependensi:** RU-014, RU-034.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `penulis-gerbang`.
- **Langkah:**
  - [ ] `--cek` wajib mendeteksi Perban 4/2025 Pasal 38, 41 ayat (2), 52 ayat (2), 53 ayat (3); amanat dari dokumen tidak berlaku menurut teks ditolak.
  - [ ] Catatan kartu tentang Pasal 106 Perban 6/2025.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/hukum.py --cek && python3 -I scripts/bnpb/unit/huk2.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.27; RU §5.2 baris HUK-2. **Ukuran:** M

#### RU-077 KPOD-1 rapor intervensi status darurat
- **Tujuan:** IKU Program 3 dihitung dari SK, Laphar, dan meja, berdampingan dengan angka resmi LAKIP.
- **Berkas:** `scripts/bnpb/unit/kpod1.py` (baru; keluaran `unit/rapor_darurat.json`), `tests/bnpb/fixtures/pendampingan_50.json` (baru, tanpa nama orang), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** nama petugas.
- **Dependensi:** RU-047, RU-078.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] Label tangan 50 entri sebelum kata kunci ditulis; `--cek` mencetak presisi dan recall; presisi di bawah 0,8 menyembunyikan kartu.
  - [ ] Penjodohan SK dan episode di bawah 80% menampilkan "penjodohan wilayah belum cukup".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/kpod1.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.13; RU §2.7, §5.2 baris KPOD-1. **Ukuran:** M

#### RU-078 WIL-1 data direktorat wilayah
- **Tujuan:** 38 provinsi + IKN masing-masing tepat di satu Dit. Wilayah sesuai Perban 11/2025 Pasal 74, 77, 79A.
- **Berkas:** `public/data/bnpb/dit_wilayah.json` (baru; teks pasal publik), `tests/bnpb/unit_wil1.test.mjs` (baru).
- **Di luar:** antrean.
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Uji: 38 + 1 entri; tidak ada provinsi ganda atau tanpa direktorat; cocok dengan kutipan pasal di berkas.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_wil1.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.14 baris Data tetap; RU §5.2 baris WIL-1. **Ukuran:** S

#### RU-079 WIL-1 Meja Wilayah
- **Tujuan:** tiga antrean "siapa yang diurus hari ini" per direktorat wilayah dengan alasan satu kalimat dan sumber.
- **Berkas:** `scripts/bnpb/unit/wil1.py` (baru; keluaran `unit/meja_wilayah.json`), `public/bnpb/unit/wil1.js` (baru; fungsi urut murni dan layar), `tests/bnpb/unit_wil1.test.mjs` (baru), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`, `tests/agen/gerbang-kartu-std.test.mjs` (entri `LAYAR`; izin sesi induk).
- **Di luar:** `public/bnpb/wilayah.js` (berkas lain, DS Catatan butir 5).
- **Dependensi:** RU-078, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Uji urutan lima kelas DT §6.14 dan kasus RU §2.7; staf berwilayah melihat direktorat yang beririsan.
  - [ ] Pemilih direktorat deretan pil penuh lebar `.ad-tabs` (DS §5.1).
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/wil1.py --cek && node --test tests/bnpb/unit_wil1.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.14; DS §7.10; RU §5.2 baris WIL-1. **Ukuran:** M

#### RU-080 WIL-3 rute draf kaji cepat
- **Tujuan:** draf laporan awal kaji cepat terisi dari JSON statis tanpa baca D1; dua tahap lewat kolom data (KA §8).
- **Berkas:** `src/meja.js` (`GET /api/meja/kaji_cepat/draf?kab=`), `src/meja_spek.js` (kolom `tgl_awal`, `tgl_lanjutan`, tanda dari `kaji_awal` dan `kaji_lanjutan`), `tests/warga/meja.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** status meja baru dan migrasi 0114.
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Langkah:**
  - [ ] Uji: rute membaca `env.ASSETS` saja, `meta.rows_read` hanya untuk gerbang hak; rekomendasi berlabel "saran"; gempa tidak pernah Siaga.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/meja.test.mjs && npm run uji:warga`.
- **Pemilik:** memutus apakah status dua tahap penuh diminta (bila ya, migrasi baru per DT §6.16).
- **Rujukan:** DT §6.16; RU §5.2 baris WIL-3. **Ukuran:** S

#### RU-081 WIL-3 tombol draf dan ekspor
- **Tujuan:** tombol "draf kaji cepat" di isian meja dan ekspor PDF Format-4.
- **Berkas:** `public/bnpb/meja.js`.
- **Di luar:** `public/admin/meja.js` (cukup bila sesi induk meminta, tiket `warga-api` terpisah).
- **Dependensi:** RU-080.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Ekspor meniru gaya ekspor yang ada; label "saran".
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:layar && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.16 baris Layar. **Ukuran:** S

#### RU-082 RRI-1 daftar akses putus
- **Tujuan:** titik jalan dan jembatan putus dari beberapa sumber disatukan, umur putus, kelas pemilik, tanda aset desa.
- **Berkas:** `scripts/bnpb/unit/rri1.py` (baru; keluaran `unit/akses_putus.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** laporan WA langsung (U11; lewat usulan `unit_ketuk`).
- **Dependensi:** RU-036, RU-034.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`.
- **Langkah:**
  - [ ] `--cek`: penyatuan ≤ 200 m dan desa sama; kelas pemilik dari OSM ≤ 50 m berlabel estimasi; id stabil.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/rri1.py --cek`.
- **Pemilik:** tidak ada (U4 bawaan).
- **Rujukan:** DT §6.23; RU §5.2 baris RRI-1. **Ukuran:** M

#### RU-083 RRI-1 rute status akses
- **Tujuan:** staf mencatat status putus, darurat, pulih per titik.
- **Berkas:** `src/unit.js` (`POST /api/unit/akses`), `tests/warga/unit.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** layar.
- **Dependensi:** RU-082, RU-057 (0112 di produksi).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Langkah:**
  - [ ] Uji: akun gerbang `AKUN_SITUS*` 401 (`modAtauStaf`, RU-109); `titik_id` yang tidak ada di R2 `unit/akses_putus.json` 400; tanggal masa depan 400; status di luar tiga nilai 400; 120 per jam.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.9 baris akses. **Ukuran:** S

#### RU-084 PUS-2 fungsi `kib()`
- **Tujuan:** KIB usulan 16 digit Juknis 7/2023 sebagai fungsi murni.
- **Berkas:** `src/pusdalops_umum.js` (`kib()`), `tests/warga/unit.test.mjs`.
- **Di luar:** kolom `kib` di `logbook_kejadian` (tidak ditambah, DT §6.5).
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `warga-api` / `penulis-gerbang`.
- **Langkah:**
  - [ ] Uji: Bogor 19 Sep 2023 = `3201101202309191`; jenis tanpa kode (kecelakaan) tidak diberi KIB.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.5; RU §5.2 baris PUS-2. **Ukuran:** S

#### RU-085 PUS-2 pencocok logbook ke DIBI
- **Tujuan:** tiga daftar: cocok, logbook tanpa DIBI lewat 7 hari, DIBI tanpa logbook; selalu "KIB usulan".
- **Berkas:** `scripts/bnpb/unit/pus2.py` (baru; keluaran `unit/kib_cocok.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** teks bebas logbook.
- **Dependensi:** RU-084.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: rumus KIB sama dengan `kib()` (kasus tetap yang sama); toleransi tanggal plus minus 2 hari; kueri D1 memilih kolom, tanpa teks bebas.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/pus2.py --cek && node --test tests/agen/gerbang-ruang-unit.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.5; RU §5.2 baris PUS-2. **Ukuran:** S

#### RU-086 [induk] Tinjauan dan terbit F2 Februari
- **Tujuan:** sistem RU-073 sampai RU-085 tayang.
- **Berkas:** commit path spesifik; suntingan `DATA_UNIT`.
- **Di luar:** `git add -A`.
- **Dependensi:** RU-073 sampai RU-085.
- **Pengerja / pemeriksa:** sesi induk / tinjauan per lapisan, `higiene-repo`.
- **Langkah:**
  - [ ] Bukti RU-057 hijau; commit, push, `terbit.yml` hijau, `data.yml` dispatch, `/api/unit/indeks` semua `ok`.
  - [ ] Sapu branch.
- **Bukti:** sama dengan RU-057.
- **Pemilik:** tidak ada.
- **Rujukan:** PRD §4.3. **Ukuran:** S

### 3.F Sistem F2 Maret 2027 (MB-7 umum, peran tulis)

#### RU-087 PD-1 rapor peringatan dini
- **Tujuan:** POD dan FAR per jenis bahaya per tingkat dari D1 `peringatan` lawan logbook dan DIBI; rekap 4-bulanan.
- **Berkas:** `scripts/prediksi/rapor_peringatan.py` (baru; keluaran `/tmp/unit/rapor_peringatan.json`, bukan `public/prediksi/data/`).
- **Di luar:** `ews_umpan` dan `POST /api/ews/umpan` (U11, masuk `antre`).
- **Dependensi:** RU-021.
- **Pengerja / pemeriksa:** `prediksi` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek` kasus RU §2.7; rapor tanpa n pembanding ditolak; keterbatasan "palsu" ditulis di `title`.
  - [ ] Daftarkan di `LANGKAH` `jalan.py` lewat sesi induk (berkas milik `ruang-bnpb`).
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/prediksi/rapor_peringatan.py --cek`.
- **Pemilik:** U11 untuk umpan balik BPBD.
- **Rujukan:** DT §6.6; RU §5.2 baris PD-1. **Ukuran:** M

#### RU-088 PD-1 kartu dan unduhan 4-bulanan
- **Tujuan:** kartu per jenis x tingkat dan unduhan teks templat laporan 4-bulanan di `/bnpb/unit/pd`.
- **Berkas:** berkas tampilan PD di `public/bnpb/unit/` menurut `katalog.js`, `scripts/bnpb/unit/jalan.py` (langkah `rapor_peringatan`), `tests/bnpb/unit_layar.test.mjs`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** rumus.
- **Dependensi:** RU-087, RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] Uji render dengan fixture; jendela Januari-April, Mei-Agustus, September-Desember dari `ews_evaluasi`.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_layar.test.mjs && python3 -I scripts/bnpb/unit/jalan.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.6 baris Layar. **Ukuran:** S

#### RU-089 PD-2 tag sirine OSM
- **Tujuan:** panen OSM nasional membawa titik `emergency=siren`.
- **Berkas:** `scripts/scrape/tarik_osm.py` (fasilitas), keluaran `public/data/osm_nasional/*.json` lewat workflow yang ada.
- **Di luar:** Ruang Unit.
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `pipa-data` / `higiene-repo` (ukuran berkas).
- **Langkah:**
  - [ ] Tambah tag; self-check skrip diperluas.
  - [ ] Jalankan bukti.
- **Bukti:** self-check `scripts/scrape/tarik_osm.py` yang ada (perintah dari ilmu `pipa-data`).
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.7 baris Masukan. **Ukuran:** S

#### RU-090 PD-2 cakupan layanan peringatan dini
- **Tujuan:** penduduk terpapar tinggi yang terlayani instrumen per bahaya per kab, prioritas paket.
- **Berkas:** `scripts/bnpb/unit/pd2.py` (baru; keluaran `unit/cakupan_ews.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** daftar penerima paket (U10).
- **Dependensi:** RU-089, RU-027, RU-015 (`ews_radius_sirine_km`).
- **Pengerja / pemeriksa:** `ruang-bnpb` / `validasi-model`.
- **Langkah:**
  - [ ] `--cek`: radius tanpa label ditolak; label "batas bawah dari OSM"; selisih lawan 6% Renstra ditulis.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/pd2.py --cek`.
- **Pemilik:** U10: daftar penerima paket sirine (bawaan: tidak tersedia).
- **Rujukan:** DT §6.7; RU §5.2 baris PD-2. **Ukuran:** M

#### RU-091 KS-3 kesenjangan lokasi evakuasi
- **Tujuan:** desa terpapar tinggi tanpa kandidat bangunan evakuasi dalam jarak bahaya.
- **Berkas:** `scripts/bnpb/unit/ks3.py` (baru; keluaran `unit/evakuasi.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** lokasi evakuasi resmi.
- **Dependensi:** RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: kata "lokasi evakuasi resmi" ditolak; jarak tsunami 1 km dan banjir 2 km berlabel asumsi; cakupan OSM per kab tampil.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/ks3.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.9; RU §5.2 baris KS-3. **Ukuran:** S

#### RU-092 MT-1 katalog kode kegiatan dan ESMS
- **Tujuan:** tahap pertama MT-1 (F2*): kode kegiatan 02.01.01 sampai 02.01.11 dan kelas risiko ESMS dari Lampiran I Juklak 4/2025.
- **Berkas:** `scripts/bnpb/unit/mt1.py` (baru; keluaran `unit/dana_bersama_katalog.json`), `tests/bnpb/unit_cakupan.json`.
- **Di luar:** standar biaya (RU-093).
- **Dependensi:** RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: 11 kode, tiap kode satu kelas ESMS; usulan lebih dari satu keluaran ditolak (Juklak 4/2025 Bab III C).
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/mt1.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.10, §10 butir 6; KA §5.1 catatan F2*. **Ukuran:** M

#### RU-093 MT-1 standar biaya Juklak 2/2026
- **Tujuan:** tahap kedua: komponen dan harga satuan Juklak 2/2026 (278 halaman) masuk katalog. Bila ekstraksi tidak selesai dalam satu sesi, tiket dipecah per bab dan katalog tetap terpakai dengan kode dan ESMS saja.
- **Berkas:** `scripts/bnpb/unit/mt1.py`, `scripts/bnpb/unit/standar_biaya_2026.json` (baru).
- **Di luar:** layar.
- **Dependensi:** RU-092.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] Ekstrak dengan `pdftotext -layout`; tiap baris membawa halaman sumber.
  - [ ] `--cek`: komponen di atas standar ditandai; contoh RU §5.2 baris MT-1.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/mt1.py --cek`.
- **Pemilik:** menyerahkan PDF Juklak 2/2026 bila tidak ada di korpus.
- **Rujukan:** DT §6.10; RU §5.2 baris MT-1. **Ukuran:** M

#### RU-094 MT-1 penyusun usulan di peramban
- **Tujuan:** isian usulan Dana Bersama dengan skor pra-telaah, ekspor PDF dan Excel, tidak tersimpan di server.
- **Berkas:** `public/bnpb/unit/mt1.js` (baru), `tests/bnpb/unit_mt1.test.mjs` (baru), `tests/bnpb/unit_cakupan.json`, `tests/agen/gerbang-kartu-std.test.mjs` (entri `LAYAR`; izin sesi induk).
- **Di luar:** tabel `db_usulan` (DT §2.2 "Tidak dibuat").
- **Dependensi:** RU-093, RU-073, RU-074.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] Uji: RAB = komponen x volume x harga; dua keluaran ditolak; tidak ada `fetch` POST; label "bukan IRBI resmi".
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/bnpb/unit_mt1.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.10; DS §7.9; RU §5.2 baris MT-1. **Ukuran:** M

#### RU-095 MT-3 kalender kampanye
- **Tujuan:** paket kampanye per kab 1 sampai 2 bulan sebelum musim bahaya: pesan tindakan, 10 desa terpapar terbesar, saluran menurut porsi rentan.
- **Berkas:** `scripts/bnpb/unit/mt3.py` (baru; keluaran `unit/kampanye.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** pemisahan lansia dan balita di `terpapar.py` (DT §10 butir 8; tiket terpisah bila pemilik mewajibkan).
- **Dependensi:** RU-051.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: kolom nama orang ditolak; ambang porsi rentan bawaan median nasional berlabel.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/mt3.py --cek`.
- **Pemilik:** memutus apakah porsi lansia dan balita wajib terpisah.
- **Rujukan:** DT §6.12; RU §5.2 baris MT-3. **Ukuran:** S

#### RU-096 WIL-2 migrasi 0113 dan uji skema
- **Tujuan:** tabel tempat pengungsian dan rekap harian terpilah (F2*), tanpa nama pengungsi dan tanpa kontak koordinator.
- **Berkas:** `migrations/0113_pengungsian.sql` (baru; persis DT §6.15), `tests/warga/unit_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** rute.
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Langkah:**
  - [ ] Cek nomor migrasi.
  - [ ] Uji SQL: jenis di luar daftar ditolak; tanggal di luar masa buka ditolak trigger; PK (tempat, tanggal); jumlah jiwa di atas batas ditolak; migrasi dua kali tanpa galat; tidak ada kolom yang cocok pola G-5.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit_skema.test.mjs tests/agen/gerbang-privasi-unit.test.mjs && npm run uji:warga`.
- **Pemilik:** menerapkan 0113 di produksi di RU-108.
- **Rujukan:** DT §6.15; RU §5.2 baris WIL-2. **Ukuran:** M

#### RU-097 WIL-2 rute pengungsian dan uji alur
- **Tujuan:** staf dan akun instansi BPBD mencatat tempat dan angka harian; rekap kab mengabaikan tempat basi.
- **Berkas:** `src/pengungsian.js` (baru; `POST /api/pengungsian/tempat`, `POST /api/pengungsian/harian`, `GET /api/pengungsian/kab?kab=`), `src/worker.js` (impor rute), `tests/warga/unit_alur.test.mjs` (diperluas; alur WIL-2), `tests/warga/cakupan.json`.
- **Di luar:** jenis WA `pengungsian` di `src/wa_jenis.js` (U11, §5 tabel tertahan).
- **Dependensi:** RU-096.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Langkah:**
  - [ ] Uji ujung ke ujung tempat, harian, rekap; akun gerbang `AKUN_SITUS*` 401 di rute tulis (RU-109); kirim ulang hari yang sama tidak menggandakan; akun instansi kab lain 403; tempat lebih tua dari 2 hari tidak dijumlah; 200 tulis per jam.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit_alur.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.15 baris Rute; RU §1.1 L6, §5.2 baris WIL-2. **Ukuran:** M

#### RU-098 WIL-2 isian 11 angka di layar instansi
- **Tujuan:** BPBD mengisi angka harian per tempat di layar `/instansi` yang sudah dipakai.
- **Berkas:** satu berkas `public/instansi_*.js` (nama dipilih sesi induk sebelum tiket dikirim; pola `public/instansi_korban.js`) dan pemanggilnya di `public/instansi.js`.
- **Di luar:** layar staf (RU-099).
- **Dependensi:** RU-097.
- **Pengerja / pemeriksa:** `warga-api` / `inp-reviewer`, `security-reviewer`.
- **Langkah:**
  - [ ] Isian angka bulat dengan batas CHECK; kebutuhan dasar dihitung di klien lewat `kebutuhanDasar` (RU-029).
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.15 baris Layar. **Ukuran:** S

#### RU-099 WIL-2 rekap, panel selisih, tab layar
- **Tujuan:** rekap harian per kab dan panel selisih pusat lawan daerah di tab pengungsian `/bnpb/unit/wil`.
- **Berkas:** `scripts/bnpb/unit/wil2.py` (baru; keluaran `unit/pengungsian.json`), `public/bnpb/unit/wil1.js` (tab pengungsian), `tests/bnpb/unit_wil1.test.mjs`, `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** memilih angka yang benar (sistem tidak memilih).
- **Dependensi:** RU-097, RU-079, RU-029.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer`.
- **Langkah:**
  - [ ] `--cek` kasus RU §2.3 K1 sampai K5; tempat di bawah 10 jiwa tidak tampil per tempat; selisih di atas 25% merah.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/wil2.py --cek && node --test tests/bnpb/unit_wil1.test.mjs tests/bnpb/unit_kembar.test.mjs`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.15; RU §2.3, §7.1 butir e. **Ukuran:** M

#### RU-100 PLP-3 impor BAST dan rekap
- **Tujuan:** daftar BAST hibah logpal dari lampiran Keputusan Deputi menjadi SQL yang diterapkan pemilik; rekap harian kewajiban dan kedaluwarsa.
- **Berkas:** `scripts/bnpb/unit/plp3_impor.py` (baru), `scripts/bnpb/unit/plp3.py` (baru; keluaran `unit/pasca_hibah.json`), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** nomor PIC; WA (U11).
- **Dependensi:** RU-057; daftar BAST dari pemilik.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`.
- **Langkah:**
  - [ ] `--cek`: id sha1 stabil; `ON CONFLICT (id) DO NOTHING`; jatuh tempo 12 bulan berlabel asumsi; peringatan 90 dan 30 hari.
  - [ ] SQL hasil ditulis di luar repo.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/plp3_impor.py --cek && python3 -I scripts/bnpb/unit/plp3.py --cek`.
- **Pemilik:** U10: menyerahkan daftar BAST; menerapkan SQL hasil impor dengan `npx wrangler@4.42.0 d1 execute poskowarga --remote --file <berkas>`.
- **Rujukan:** DT §6.18, §10 butir 4. **Ukuran:** S

#### RU-101 PLP-3 rute laporan pasca-hibah
- **Tujuan:** staf mencatat tanggal laporan penggunaan per baris BAST.
- **Berkas:** `src/unit.js` (`POST /api/unit/hibah/:id/lapor`), `tests/warga/unit.test.mjs`, `tests/warga/cakupan.json`.
- **Di luar:** impor.
- **Dependensi:** RU-100.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Langkah:**
  - [ ] Uji: akun gerbang `AKUN_SITUS*` 401 (`modAtauStaf`, RU-109); wilayah staf tidak mencakup `prov` 403; `tgl_lapor` sebelum `tgl_bast` atau masa depan 400; 120 per jam.
  - [ ] Jalankan bukti.
- **Bukti:** `node --test tests/warga/unit.test.mjs && npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §4.9 baris hibah. **Ukuran:** S

#### RU-102 RRP-2 leksikon berita pemulihan
- **Tujuan:** angka huntara, huntap, DTH, stimulan dari arsip berita menjadi usulan berlabel sekunder.
- **Berkas:** `scripts/berita/pemulihan.py` (baru), `tests/bnpb/fixtures/pemulihan_30.json` (baru; 30 artikel berlabel tangan; izin sesi induk karena `tests/bnpb/` milik `ruang-bnpb`).
- **Di luar:** rute.
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `pipa-umum` / `validasi-model` (presisi pada 30 artikel).
- **Langkah:**
  - [ ] Label 30 artikel dulu; self-check mencetak presisi.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/berita/pemulihan.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.22; RU §5.2 baris RRP-2. **Ukuran:** S

#### RU-103 RRP-2 rute terima pemulihan
- **Tujuan:** baris usulan yang diterima staf diteruskan ke tracker `pemulihan` dengan URL sumber.
- **Berkas:** `src/pemulihan.js` (`POST /api/pusdalops/pemulihan/terima`), `tests/warga/unit.test.mjs` atau berkas uji pemulihan yang sudah ada, `tests/warga/cakupan.json`.
- **Di luar:** skema `pemulihan` (0096).
- **Dependensi:** RU-033.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Langkah:**
  - [ ] Uji: tanpa ketuk `terima` di `unit_ketuk` ditolak; baris tanpa URL ditolak; memanggil `buat`/`progres` yang ada.
  - [ ] Jalankan bukti.
- **Bukti:** `npm run uji:warga`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.22 baris D1. **Ukuran:** S

#### RU-104 RRP-2 usulan pemulihan dan kartu
- **Tujuan:** `unit/usulan_pemulihan.json` harian dan antrean setuju di `/bnpb/unit/rrp`.
- **Berkas:** `scripts/bnpb/unit/rrp2.py` (baru), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** leksikon.
- **Dependensi:** RU-102, RU-103, RU-034.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`.
- **Langkah:**
  - [ ] `--cek`: tiap usulan berlabel `sekunder` dengan URL dan tanggal.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/rrp2.py --cek`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.22. **Ukuran:** S

#### RU-105 IRT-1 papan umur TLHP (lokal)
- **Tujuan:** skrip lokal pemilik yang menghasilkan satu berkas HTML kartu `.ex-std` umur rekomendasi TLHP per unit; tanpa D1, R2, rute (U9 bawaan).
- **Berkas:** `scripts/bnpb/unit/irt1.py` (baru), `tests/bnpb/unit_cakupan.json` (`dikecualikan` beralasan).
- **Di luar:** tabel `tlhp_*` (G-5 menolak).
- **Dependensi:** RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`.
- **Langkah:**
  - [ ] `--cek` kasus RU §2.7 atas fixture buatan tanpa nama pejabat; calon TPTD berlabel "saran".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/irt1.py --cek && node --test tests/agen/gerbang-privasi-unit.test.mjs`.
- **Pemilik:** menjalankan skrip atas ekspor SIPTL/SIMHPNAS atau rekap Excel Itama di mesin sendiri; U9 bila ingin masuk D1.
- **Rujukan:** DT §6.28; RU §5.2 baris IRT-1. **Ukuran:** S

#### RU-106 DIK-4 bank tenaga pengajar
- **Tujuan:** 5 calon pengajar per mata pelatihan dari pencocok BM25 yang sudah ada, dengan pengecualian direktori yang sama.
- **Berkas:** `scripts/bnpb/unit/dik4.py` (baru; keluaran `unit/pengajar.json`), `scripts/bnpb/unit/mata_pelatihan.json` (baru), `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`.
- **Di luar:** `scripts/kemitraan/**` (diimpor, tidak disalin atau diubah).
- **Dependensi:** RU-057.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `security-reviewer`.
- **Langkah:**
  - [ ] `--cek`: calon dari daftar pengecualian direktori ditolak; daftar pengecualian dibaca dari sumber yang ada, bukan salinan.
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/dik4.py --cek && npm run uji:kemitraan`.
- **Pemilik:** menyerahkan daftar mata pelatihan Pusdiklat (e-Tangguh tidak terjangkau saat riset).
- **Rujukan:** DT §6.30; RU §5.2 baris DIK-4. **Ukuran:** S

#### RU-107 JF-2 hitung kebutuhan formasi
- **Tujuan:** kebutuhan formasi JF per jenjang per prov dan kab dengan norma waktu yang bisa diubah di klien.
- **Berkas:** `scripts/bnpb/unit/jf2.py` (baru; keluaran `unit/formasi_jf.json`), `scripts/bnpb/unit/norma_waktu.json` (baru), `public/bnpb/unit/jf2.js` (baru), `tests/bnpb/unit_layar.test.mjs`, `scripts/bnpb/unit/jalan.py`, `tests/bnpb/unit_cakupan.json`, `tests/agen/gerbang-kartu-std.test.mjs` (entri `LAYAR`; izin sesi induk).
- **Di luar:** tata cara resmi Pasal 53 ayat (3).
- **Dependensi:** RU-030.
- **Pengerja / pemeriksa:** `ruang-bnpb` / `selera-angka`, `inp-reviewer` (hitung ulang di klien lewat `nanti()`).
- **Langkah:**
  - [ ] `--cek` contoh RU §5.2 (1.720 jam, 1,376 orang); norma tanpa label "bawaan" ditolak; label "usulan metode".
  - [ ] Jalankan bukti.
- **Bukti:** `python3 -I scripts/bnpb/unit/jf2.py --cek && node --test tests/bnpb/unit_layar.test.mjs && npm run uji:agen`.
- **Pemilik:** tidak ada.
- **Rujukan:** DT §6.31; RU §5.2 baris JF-2. **Ukuran:** M

#### RU-108 [induk] Tinjauan dan terbit F2 Maret
- **Tujuan:** sistem RU-087 sampai RU-107 tayang; gerbang F2 PRD §4.3 dicentang.
- **Berkas:** commit path spesifik; suntingan `DATA_UNIT`.
- **Di luar:** `git add -A`.
- **Dependensi:** RU-087 sampai RU-107 (kecuali yang `tertahan`).
- **Pengerja / pemeriksa:** sesi induk / tinjauan menyeluruh atas rentang F2, satu gelombang perbaikan, satu tinjauan ulang; `higiene-repo`.
- **Langkah:**
  - [ ] Bukti RU-057 hijau; pemilik menerapkan 0113; commit, push, `terbit.yml` hijau, `data.yml` dispatch, `/api/unit/indeks` semua `ok`.
  - [ ] Semua baris `Ruling:` F0 sampai F2 dilaporkan ke pemilik.
  - [ ] Sapu branch.
- **Bukti:** sama dengan RU-057.
- **Pemilik:** `npx wrangler@4.42.0 d1 migrations apply poskowarga --remote` (0113).
- **Rujukan:** PRD §4.3 gerbang F2. **Ukuran:** S

---

## 4. Gelombang

Gelombang = kelompok tiket yang boleh jalan bersamaan sesudah gelombang sebelumnya selesai (tiket tanpa ketergantungan boleh maju). Tanggal mengikuti PRD §4.

| Gel. | Waktu | Tiket |
| --- | --- | --- |
| 0 | 5 Nov 2026 | RU-000 |
| 1 | 6-8 Nov | RU-001, RU-006, RU-009, RU-017, RU-109 |
| 2 | 9-11 Nov | RU-002, RU-008, RU-010 |
| 3 | 12-15 Nov | RU-003, RU-004, RU-005, RU-007, RU-011, RU-012 |
| 4 | minggu 47 awal | RU-013, RU-014, RU-015, RU-018, RU-021, RU-027, RU-028, RU-030, RU-035 |
| 5 | minggu 47 akhir | RU-016, RU-019, RU-020, RU-022, RU-031 |
| 6 | minggu 48 | RU-023, RU-024, RU-037 sampai RU-041 |
| 7 | minggu 49 | RU-032, RU-033, RU-034, RU-042, RU-043, RU-044 |
| 8 | minggu 50 | RU-045 sampai RU-050 |
| 9 | minggu 51 | RU-029, RU-051 sampai RU-057 |
| 10 | Januari 2027 | RU-025, RU-026, RU-036, RU-058 sampai RU-072 |
| 11 | Februari 2027 | RU-073 sampai RU-086 |
| 12 | Maret 2027 | RU-087 sampai RU-108 |

Jalur kritis F0: RU-006 ke RU-008 bersama RU-007 ke RU-012; RU-009 ke RU-010 ke RU-012; dan RU-109 ke RU-012. Jalur kritis F1: RU-018 ke RU-019 ke RU-020 ke RU-030 ke sistem; RU-021 ke RU-022.

---

## 5. Belum dijadwalkan: F3 dan T

Tidak ada kartu, rute, atau tabel untuk ID di bawah (gerbang G-6, RU-023). Tiket dibuat sesi induk saat syarat terpenuhi dan pemilik setuju (PRD §4.4). Bagian sistem F2 yang menunggu jawaban pemilik juga dicatat di sini.

| ID | Fase | Syarat mulai atau alasan ditunda (DT §7) |
| --- | --- | --- |
| PERB-3 | F3 | daftar 71 indikator IKD 2025 resmi; API JDIHN terbukti (RU-025) |
| SPB-2 | F3 | isian `/pendataan` cukup; nama aplikasi terverifikasi URL |
| PUS-3 | F3 | izin pemilik untuk probe; jadwal 15 menit butuh workflow baru |
| PD-4 | F3 | rapor dari `src/sla.js` dan `status_riwayat` (0042) |
| KS-2 | F3 | U10 daftar Destana; teks SNI 8357:2017 |
| MT-4 | F3 | isian lapangan `/petugas` atau WA berjalan |
| WIL-4 | F3 | U8; internal R2 tanpa nama orang |
| OJL-1 | F3 | graf jalan OSM 38 provinsi (kini 9); daftar gudang berkoordinat |
| OJL-4 | F3 | `/instansi` dibuka untuk semua bencana (riset/4 Q7) |
| RRI-2 | F3 | staf mau mengunggah lembar usulan; diolah di peramban |
| RRI-3 | F3 | U10 ekspor Mapping Aset |
| RRS-2 | F3 | token Earthdata; lab dengan kriteria terkunci |
| KEU-2 | F3 | U9 (bawaan skrip lokal); format ekspor SAKTI |
| SDU-2 | F3 | `/petugas` dipakai (tabel `orang` masih 0 baris) |
| SDU-3 | F3 | pemilik menginginkan; lokasi aset sensitif |
| IRT-2 | F3 | U9; pengecualian kode kegiatan darurat |
| IRT-3 | F3 | kejelasan SIM Manajemen Risiko resmi |
| DIK-2 | F3 | keputusan siapa menerbitkan nomor STTP |
| DIK-3 | F3 | U11; persetujuan nomor WA alumni |
| JF-3 | F3 | riset/6 pertanyaan 1; data ASN di balik login, hash NIP |
| PSPB-2 | T | menunggu siklus RPBD pertama Perban 3/2026 dan bukti PSPB-1 dipakai |
| SPB-3 | T | URL Portal Literasi Sejarah Bencana resmi belum ditemukan |
| PUS-4 | T | bnpb.go.id menolak pengambil otomatis |
| HUK-3 | T | cukup lewat `/kemitraan` dan `/direktori` |
| WIL-2 jalur WA | bagian F2 | U11 (jenis `pengungsian` di `src/wa_jenis.js`, pengurai `#pengungsian`) |
| PD-1 umpan BPBD | bagian F2 | U11 (`ews_umpan`, `POST /api/ews/umpan`) |
| PLP-3, OJL-2, RRI-1 pesan WA | bagian F2 | U11 |

---

## 6. Yang dilakukan pemilik

| Kapan | Aksi | Tiket |
| --- | --- | --- |
| kapan saja | menjawab U1 sampai U12 (bawaan berlaku sampai dijawab) | RU-000 |
| sesudah RU-012 | terapkan 0110; terapkan `data/hukum/seed.sql`; teruskan daftar konflik ke Biro Hukum (U7); konfirmasi untuk RU-013 | RU-002, RU-012, RU-013 |
| sebelum Januari 2027 | tambah GitHub secret `BPS_KEY` | RU-022, RU-054, RU-059, RU-067 |
| RU-057 | terapkan 0111 dan 0112; seed hukum RU-014; buat akun staf `unit` pertama | RU-014, RU-018, RU-032 |
| RU-046 | hidupkan gateway WA Mac mini dan pasang ulang layanan | RU-046 |
| bila bisa | U10: IKD 2025 per kab, penerima sirine, penerima hibah 3 tahun, daftar BAST | RU-043, RU-062, RU-090, RU-100 |
| bila ada | draf LAKIP dan LK (KEU-1), ekspor TLHP (IRT-1), PDF Juklak 2/2026, daftar mata pelatihan Pusdiklat, CSV angkatan diklat | RU-056, RU-105, RU-093, RU-106, RU-069 |
| RU-100 | terapkan SQL impor BAST | RU-100 |
| RU-108 | terapkan 0113 | RU-096, RU-108 |
| kelak | U2 pembukaan layar publik per layar; dua tahap kaji cepat penuh; pemisahan lansia dan balita | RU-048, RU-052, RU-080, RU-095 |

---

## Catatan untuk sesi induk

**Kontradiksi antardokumen yang masih terbuka** (bawaan tiket di §0.2; diputus di RU-000; sisanya sudah diputus KA §8):

1. Hak baca (P-9): PRD `HALAMAN_STAF` lawan DT `P_UNIT_BACA`. Tiket memakai DT.
2. Izin lintas pemilik. Beberapa tiket menyentuh berkas uji atau gerbang milik agen lain (`tests/bnpb/unit_kembar.test.mjs`, `tests/bnpb/unit_pd3.test.mjs`, entri `LAYAR` di `gerbang-kartu-std.test.mjs`, `public/inti/jam_aturan.json` di SDU-1, `tests/bnpb/fixtures/pemulihan_30.json`); semuanya ditandai "izin sesi induk". Bila sesi induk tidak mau izin lintas pemilik, tiket itu perlu dipecah satu lagi per pemilik.
3. DT menulis skrip `uji:unit` baru; `uji:layar` yang sudah ada mencakup `tests/bnpb/unit_*`. Tiket merangkai `uji:layar` (P-5). RU-017 berhenti bila `uji:layar` hari ini merah; RU §9 butir 1 mencatat belum ada yang memeriksanya.

**Yang tidak ditemukan atau belum pasti**

4. Penambahan nama berkas ke `DATA_UNIT` di `src/unit.js` tiap sistem baru tidak punya tiket sendiri; tiket ini menyerahkannya ke sesi induk sebagai satu suntingan `warga-api` per gelombang (catatan pembuka §3.C). Bila sesi induk mau bentuk lain (misalnya `DATA_UNIT` dibangkitkan dari `katalog.js`), itu keputusan desain di luar dokumen mana pun.
5. Nama berkas isian pengungsian di `/instansi` (RU-098) tidak disebut DT ("`public/instansi_*`"); dipilih sesi induk.
6. Perintah self-check `scripts/banjir/kejadian.py` (RU-058) dan `scripts/scrape/tarik_osm.py` (RU-089) tidak saya periksa; tiket menyerahkannya ke ilmu agen pemiliknya.
7. Pengurai Laphar RU-045 butuh satu PDF contoh tanpa nama petugas; belum ada di `tests/wa/fixtures/`.
8. `data/raw/hukum/teks/` ada di checkout utama mesin ini (5 Nov 2026), jadi RU-002 dan RU-014 bisa dijalankan sesi tanpa menunggu pemilik, asalkan tanpa worktree.

**Asumsi yang diambil**

9. Kerangka (peran, rute, cangkang, pelari, workflow, gerbang) ditaruh di bagian mesin bersama, di antara MB-2 dan MB-3, karena tidak punya nomor MB sendiri dan dibutuhkan MB-6.
10. Tiket [induk] terbit dibuat per gelombang besar (F0, F1, tiap bulan F2), bukan per sistem, mengikuti pola rilis SIPPA.
11. PLP-3 (RU-100, RU-101) ditulis berstatus `tertahan (U10)` sesuai DT §10 butir 4; tiketnya siap bila daftar BAST datang.
12. Label tangan untuk KPOD-1 (50 entri) dan RRP-2 (30 artikel) dikerjakan pengerja dan diperiksa `validasi-model`; bila sesi induk mau label dari staf Koordalops, itu menjadi aksi pemilik.
13. Ukuran tiket memakai skala SIPPA (S kurang dari setengah hari sesi, M sekitar satu hari); MT-1 dan WIL-2 (F2*) masing-masing dipecah tiga dan empat tiket.


## Lampiran sesi induk: celah terbuka dari pemeriksaan bersih (5 Nov 2026)

Dikerjakan di tiket yang disebut; sesi yang mengambil tiket itu wajib menutupnya sebelum menandai selesai.

- [ ] RU-000: gerbang G-1 membaca kutipan dari `data/hukum/seed.sql` (dilacak git), bukan `data/raw/hukum/teks/` yang di-gitignore (putusan P-12 diambil sesi induk: seed.sql). G-1 juga mencocokkan kutipan dengan pasal yang disebut, bukan hanya dengan dokumennya.
- [ ] Tiket migrasi `0112_unit`: komentar `hibah_bast` diselaraskan dengan trigger `hibah_bast_ubah` (kolom yang boleh berubah ditulis sama di keduanya).
- [ ] Tiket WIL-2: tambah rute untuk menutup tempat pengungsian (`tutup`), sesuai langkah 7 ALUR WIL-2.
- [ ] Tiket MB-6 dan sistem hilir (RRX-1, KPOD-1, WIL-1): tiap keluaran membawa umur masukannya (`sumber[].dibuat`), dan kartu menandai basi bila masukan basi.
- [ ] Tiket KPOD-3: jalur commit otomatis dari Mac mini tidak boleh menyapu atau tersapu commit "gas" pemilik; tulis ke R2, bukan ke git.
- [ ] RU-022 dan RU-054: cek dulu `gh secret list`; `statis.yml` sudah memakai `secrets.BPS_KEY`, jadi aksi pemilik "menambah secret" mungkin sudah tidak perlu.
- [ ] RU-056 (KEU-1) tertahan sampai pemilik memberi draf LAKIP; tandai di papan saat diambil.

## Catatan sesi induk F0 (5 Nov 2026)

- RU-109b (tambahan): akun gerbang juga ditolak di `src/logbook.js`, `src/pusdalops_umum.js` (ikut rollcall, pemulihan, lapsus, berantai), `src/wa_form.js`, `src/medsos_antre.js`, `src/sensor.js`; uji `tests/warga/gerbang_bukan_staf.test.mjs`. `src/akademisi.js` (13 pemanggil `stafOK`) menunggu keputusan pemilik: akun gerbang boleh membaca direktori atau tidak.
- Jam Aturan: data ditulis literal di `public/inti/jam_aturan.js` karena Miniflare tidak memuat impor JSON; `jam_aturan.json` tetap sebagai kembar untuk Python dan G-1, dijaga uji kembar di `tests/bnpb/unit_kembar.test.mjs`.
- Migrasi 0110 sudah dibekukan di `tests/warga/migrasi_beku.json`; penerapan ke D1 produksi tetap aksi pemilik (RU-012).
- `tests/bnpb/hukum_pil.test.mjs` adalah draf gagal yang belum dilacak git; hapus dengan izin pemilik (`/allow-test-change`), penggantinya `tests/bnpb/hukum_pil_layar.test.mjs`.
- Ilmu `warga-api` melewati plafon 40 KB; bagian Kasus perlu diringkas (`mekanik-mesin`) sebelum kasus baru bisa dicatat.
