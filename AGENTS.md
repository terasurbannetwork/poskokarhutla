# AGENTS.md: Pantau Bencana (poskokarhutla)

DNA semua agent dan subagent di repo ini. Disalin ramping dari `AGENTS.md`
gemah-ripah (15 Okt 2026) dan disesuaikan ke stack repo ini: Cloudflare Worker
+ D1, layar vanilla JS tanpa build step, pipeline Python 3.12 stdlib di GitHub
Actions yang meng-commit JSON ke `public/data`.

## 0. Gerbang konteks, sebelum tool apa pun

1. Baris modulnya di peta modul §2.
2. `node scripts/agents/ilmu.mjs pemilik <berkas>`: siapa pengerja pemiliknya.
3. `node scripts/agents/ilmu.mjs baca <agent>`: ilmu + jejak kerja terakhirnya.

Lalu ucapkan kontrak kerjanya: CAKUPAN (berkas yang disentuh) · DI LUAR (yang
tidak) · BUKTI SIAP (perintah yang membuktikan selesai).

## 1. Router

| Kerja                                              | Agent                                       |
| -------------------------------------------------- | ------------------------------------------- |
| Berkas punya pemilik                               | pengerja pemiliknya (`ilmu.mjs pemilik`)    |
| Model / indeks risiko / uji balik berubah          | pengerja pemiliknya → `validasi-model`      |
| Route worker, unggah foto, form warga              | `warga-api` → `guard-api` + `security-reviewer` |
| Migrasi D1                                         | `warga-api` → `migrasi-idempoten`           |
| Kartu, pop-up, angka di layar                      | `layar-peta` → `selera-angka` + `inp-reviewer` |
| Layar `/pipa` (SIPPA), uji `tests/sippa`           | `sippa` → `inp-reviewer` + `selera-angka`   |
| Slide, PPT, deck, paparan, presentasi              | Skill `ppt-konsultan` (`~/.claude/skills/ppt-konsultan`, mesin `bnpb/scripts/deck.py`): sampul + penyaji, daftar isi, pembatas seksi, logo KRIS di tiap slide; PPTX apa pun wajib lolos `bnpb/scripts/aturan_slide.py` sebelum dikirim. Skill `deck-bnpb` dan `ppt-format-bnpb` PENSIUN; bukan HTML |
| Surat dinas BNPB (audiensi, undangan, permohonan)  | Skill `surat-bnpb` (`data/kajian-bnpb/skill/surat-bnpb`, mesin `scripts/buat_surat.py`): Word berkop, tujuan ke unit kerja sama bukan Rektor, nomor HP tidak masuk repo |
| Aturan baru butuh gerbang / uji integrasi          | `penulis-gerbang`                           |
| Workflow, package.json, settings, mesin agent      | `mekanik-mesin`                             |
| Sebelum commit besar                               | `higiene-repo`                              |

Daftar lengkap berikut bisa/tidak bisa: **`.claude/ilmu-agent/KATALOG.md`** (generate).

### 1.3 Kebijakan model

Opus MERENCANAKAN, model murah MENGERJAKAN. Yang menentukan tingkatnya bentuk
kerjanya, bukan pentingnya modul:

| Bentuk kerja                                                     | Model    | Contoh                                                         |
| ---------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| Cocokkan pola, hitung, lapor: aturannya tertulis rapi            | `haiku`  | `guard-api`, `migrasi-idempoten`, `higiene-repo`, `selera-angka` |
| Baca beberapa berkas, simpulkan, usulkan atau kerjakan perbaikan | `sonnet` | semua pengerja, `validasi-model`, `security-reviewer`          |
| Rancang arah, putuskan trade-off, pegang kontrak                 | `opus`   | sesi induk sendiri                                             |

- Tiap `.claude/agents/*.md` WAJIB punya `model:`; generator menolak entri roster tanpa model.
- Agent bawaan (`general-purpose`, `Explore`, `Plan`) tanpa berkas diturunkan ke
  Sonnet oleh `env.CLAUDE_CODE_SUBAGENT_MODEL` di `.claude/settings.json`.
  Gerbangnya `tests/agen/gerbang-model-agent.test.mjs`.
- Naik tingkat butuh alasan: isi `model: "opus"` per panggilan HANYA untuk
  rancangan model risiko baru atau perubahan skema D1 berisiko.
- Prompt agent menyebut BERKAS/glob-nya, bukan domainnya.
- Langkah yang bebas satu sama lain dikirim PARALEL dalam satu pesan.

### 1.5 Orkestrator: pengetahuan armada, ilmu agent, dan otoritas membuat agent

Tiga ingatan, semuanya di repo supaya ikut ke mesin mana pun:

| Berkas                                  | Isinya                                                  | Siapa menulis                          |
| --------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| `.claude/ilmu-agent/KATALOG.md`         | tiap agent: kelas, model, bisa, tidak bisa, wilayah     | generate dari roster; jangan disunting |
| `.claude/ilmu-agent/<nama>.md`          | peta berkas, aturan, ranjau, gerbang, Kasus             | agentnya sendiri (`ilmu.mjs kasus`)    |
| `.claude/ilmu-agent/jejak/<nama>.jsonl` | berkas apa yang sudah diperiksa/dikerjakan, di blob apa | agentnya sendiri (`ilmu.mjs catat`)    |
| `.claude/ilmu-agent/prompt/<bulan>.jsonl` | tiap prompt pemilik, disamarkan, berlabel agent       | hook `UserPromptSubmit` (`prompt-catat`) |

**Prompt pemilik jadi konteks.** `ilmu.mjs baca <agent>` ikut menampilkan 10
prompt terakhir berlabel agent itu; `ilmu.mjs prompt <regex>` mencari semuanya.
Repo ini publik: penyamaran di `samarkan()` satu-satunya penjaga, jadi melemahkannya
haram. Keputusan pemilik di prompt disuling jadi aturan lewat `ilmu.mjs kasus`;
log prompt ikut di-commit bersama kerjaan sesi itu (`git commit -- .claude/ilmu-agent/prompt`).

**Tidak ulang review tanpa menelan perubahan.** Jejak dikunci ke blob git
berkasnya DAN hash definisi agent; `ilmu.mjs cek` menjawab `LEWATI` hanya
kalau keduanya sama dengan vonis terakhir.

**Cara merakit:** (1) `ilmu.mjs pemilik <berkas>` menunjuk pengerjanya;
(2) pemeriksa dipilih dari kolom "bisa" katalog, TIDAK PERNAH pengerja yang
sama (§3.2); (3) rakitan 1 pengerja + 1–3 pemeriksa, paling banyak 4–5 jalan
bersamaan; (4) pelajaran merakit ditulis lewat `ilmu.mjs kasus orkestrator "…"`.

**Otoritas membuat agent, berdiri tanpa izin per kasus**, kapan pun: berkas
yang harus disentuh tidak punya pemilik dan kelas kerjanya akan berulang;
kelas kerja yang sama dua kali jatuh ke `general-purpose`; atau ilmu satu
agent menembus plafon 40 KB. Pintunya satu: entri di `scripts/agents/roster.json`
→ `npm run agents:build` → isi `.claude/ilmu-agent/<nama>.md` dari kode nyata →
sebut agent barunya di laporan akhir. Agent baru tidak pernah boleh push,
deploy, atau melonggarkan gerbang; mencabut agent tetap keputusan pemilik.

Gerbangnya `tests/agen/gerbang-ilmu-agent.test.mjs` (`npm run uji:agen`):
katalog & definisi segar, tiap agent punya ilmu terisi, tiap berkas kode tepat
satu pemilik, dan jejak benar-benar melewati yang tak berubah lalu memeriksa
ulang yang berubah.

## 2. Peta modul

| Modul               | Berkas                                                        | Keluaran / jadwal                                   | Pengerja        |
| ------------------- | ------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Pipeline karhutla   | `scripts/data/**`, `scripts/scrape/**`, `scripts/geo/**`      | `public/data/*.json`; `data.yml` harian, `titik.yml` 3-jam, `statis.yml` | `pipa-data`     |
| Model sebaran       | `scripts/sebaran/**`, `public/sebaran_model.js`, `public/sim_*` | `public/data/model_sebaran.json`, `prospektif.json` | `model-sebaran` |
| Banjir & rob        | `scripts/banjir/**`, `public/banjir/**`                       | `banjir.yml` harian                                 | `banjir`        |
| Worker & warga      | `src/**`, `migrations/**`, `public/warga`, `public/admin`     | D1 + R2; satu cron `* * * * *` (batas 5 jadwal akun Free): FIRMS → D1 menit 15 tiap 3 jam UTC, bersih-bersih menit 17           | `warga-api`     |
| Layar publik        | `public/index.html`, `public/*.js/css`, i18n, OG              | Cloudflare static assets; `terbit.yml`              | `layar-peta`    |
| Modifikasi cuaca    | `scripts/omc/**`, `public/omc/**`                             | `public/udara/data/omc_*.json`; dirantai di `udara.yml` | `cuaca-udara`   |
| SIPPA `/pipa`       | `public/pipa/**`, `tests/sippa/**` (layar); `src/sippa.js`, `migrations/0055-0057` (warga-api); `scripts/data/sippa/**` (pipa-data) | R2 `sippa/`, D1 `sippa_*`; pemicu harian di `data.yml` | `sippa`         |
| Neraca air Jawa     | `scripts/air/neraca/**`, `data/kajian-bnpb/neraca-air/**`     | `public/data/neraca_air/*.json`; lokal, iklim ERA5-Land ditarik bertahap (belum ada workflow) | `neraca-air`    |
| Mesin repo          | `.github/workflows/**`, `package.json`, `scripts/agents/**`   | —                                                   | `mekanik-mesin` |
| Gerbang             | `tests/agen/**`, `tests/beban/**`                             | `npm run uji:agen`                                  | `penulis-gerbang` |
| Kemitraan kampus `/kemitraan` | `public/kemitraan*`, `public/kemitraan/**`, `public/data/kemitraan/**`, `scripts/kemitraan/**`, `tests/kemitraan/**` (layar+pipeline); `src/kemitraan*.js`, `migrations/0080-0084` (warga-api) | D1 `km_*`, R2 `kemitraan/`; `kemitraan.yml` harian, `kemitraan-pakar.yml` bulanan | `kampus` |
| Ruang Unit `/bnpb/unit` | `public/bnpb/unit/**`, `scripts/bnpb/unit/**` (ruang-bnpb); `src/unit*.js`, migrasi Ruang Unit (warga-api) | R2 `unit/`, rute `/api/unit/*`; langkah di `data.yml` | `ruang-bnpb` |
| Lapangan `/petugas` | `public/petugas/**`, `tests/lapangan/**`, `scripts/lapangan/**`, `data/kajian-bnpb/lapangan/**` (lapangan); `src/lapangan*.js`, `migrations/0095-0098` (warga-api) | D1 `orang`, `lp_*`, `wa_antre`; R2 `lapangan/` | `lapangan` |
| Siklus Bencana `/siklus` | `public/siklus/**`, `scripts/siklus/**`, `tests/siklus/**`, `data/kajian-bnpb/siklus/**`; `src/siklus*.js`, migrasi `sk_*` (warga-api) | D1 `sk_*`, R2 `siklus/`; `siklus.yml` | `siklus` |
| Inventori LogPal `/logpal` | `public/logpal/**`, `public/data/logpal/**`, `scripts/logpal/**`, `data/kajian-bnpb/logpal/**`; `src/logpal.js`, `migrations/0112` (warga-api) | D1 `logpal_*`; rute `/api/instansi/logpal/*` | `warga-api` |

### 2.1 SIPPA (pipa portabel karhutla dan banjir): baca dulu, baru bangun

Sebelum menyentuh apa pun tentang SIPPA (halaman `/pipa`, buku kajian pipa,
data pipa), baca dokumen di `data/kajian-bnpb/pipa/` dengan urutan otoritas ini:

1. `KEPUTUSAN-SIPPA.md`: keputusan pemilik 1–53, menang atas semuanya.
2. `PRD.md`: lingkup, fitur, larangan.
3. `DESIGN-SYSTEM.md`: token, komponen, wireframe tiap layar.
4. `DESAIN-TEKNIS.md`: berkas, model data, skema D1, rute, rumus.
5. `KERANGKA-BUKU.md`: isi buku per bab.
6. `RENCANA-UJI.md`: kriteria terima dan perintah bukti.
7. `TIKET.md`: urutan kerja; ambil tiket, kerjakan hanya cakupannya.

Fitur, layar, atau bab yang tidak ada di dokumen itu tidak dibuat. Bila dokumen
bertentangan atau kurang, berhenti dan tanya pemilik; jangan mengarang arah.

### 2.2 Kemitraan Kampus (`/kemitraan`): baca dulu, baru bangun

Sebelum menyentuh apa pun tentang Kemitraan Kampus (profil daerah, belanja masalah,
pencocokan pakar, riset dan dana, satgas kampus, talenta), baca dokumen di
`data/kajian-bnpb/kampus/` dengan urutan otoritas ini:

1. `KEPUTUSAN-KAMPUS.md`: keputusan pemilik, menang atas semuanya.
2. `PRD.md`: lingkup, peran, fitur F-*, larangan.
3. `ALUR.md`: alur ujung ke ujung tiap peran dan status.
4. `ALGORITMA.md`: rumus masalah, pakar, solusi, pertanyaan, skor, uji kejujuran.
5. `PROFIL-DAERAH.md`: skema profil dan isi buku per bab.
6. `DESIGN-SYSTEM.md`: tiru `/akademisi`; komponen `.km-*`.
7. `DESAIN-TEKNIS.md`: berkas, D1 0080–0084, rute, pipeline, ADR.
8. `KEAMANAN-PRIVASI.md`: matriks hak, PDP, berkas.
9. `RENCANA-UJI.md`: kriteria terima dan perintah bukti.
10. `TIKET.md`: urutan kerja `KM-*`; ambil tiket, kerjakan hanya cakupannya.

Aturan berhentinya sama dengan §2.1.

### 2.3 Pegawai dan Relawan Lapangan (`/petugas`): baca dulu, baru bangun

Sebelum menyentuh apa pun tentang data induk pegawai dan relawan, absen pindai wajah, logbook harian lapangan, atau
panggilan relawan lewat bot WA, baca dokumen di `data/kajian-bnpb/lapangan/` dengan urutan otoritas ini:

1. `KEPUTUSAN-LAPANGAN.md`: keputusan pemilik, menang atas semuanya.
2. `RISET.md` (+ `riset/R1-R3`): GitHub yang ditiru, praktik lazim, kode repo yang dipakai ulang.
3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md` (sudut wajah, ambang, status absen),
6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md` (berkas, D1 0095-0098, rute), 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`LP-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Vektor wajah tidak pernah keluar dari Worker.

### 2.4 Ruang Unit BNPB (`/bnpb/unit`): baca dulu, baru bangun

Sebelum menyentuh apa pun tentang sistem untuk kedeputian, direktorat, pusat, biro, dan inspektorat BNPB
(Jam Aturan, status peraturan, neraca kebutuhan, skor prioritas daerah, rapor dari data, perbaikan ambang meja), baca dokumen di
`data/kajian-bnpb/kedeputian/` dengan urutan otoritas ini:

1. `KEPUTUSAN-AWAL.md` (dan `KEPUTUSAN-UNIT.md` bila sudah ada, yang menang): ID sistem, mesin bersama MB-1..MB-8, fase F0-F3, prinsip, pertanyaan pemilik U1-U12.
2. `riset/1-6` dan `RISET.md`: tusi tiap unit dari Perban 6/2025 jo. 11/2025, sistem resmi yang sudah ada, bukti per usulan.
3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`RU-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Data staf hanya di R2 `unit/` lewat rute staf, tidak di `public/data`.

### 2.5 Inventori LogPal (`/logpal`): baca dulu, baru bangun

Sebelum menyentuh apa pun tentang stok gudang BNPB dan BPBD, mutasi, stok opname, permintaan bantuan logistik, atau impor data gudang, baca dokumen di
`data/kajian-bnpb/logpal/` dengan urutan otoritas ini:

1. `KEPUTUSAN-LOGPAL.md`: keputusan pemilik dan pertanyaan terbuka; menang atas semuanya. Jangan menjawab pertanyaan terbuka dengan karangan.
2. `RISET.md` (+ `riset/R1-R3`): syarat audit BMN dan BMD, praktik dunia, sistem Indonesia.
3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`LG-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Data gudang asli tidak pernah masuk repo; `scripts/logpal/impor.mjs` menulis SQL ke luar repo.

### 2.6 Silang Sumber (`/bnpb/rapor-sumber`, `/bnpb/silang`, tsunami per zona, gempa beruntun, kalender ancaman): baca dulu, baru bangun

Sebelum menyentuh rapor sumber, beda sumber resmi lawan model, tsunami per zona, deteksi gempa beruntun, atau kalender ancaman daerah, baca dokumen di
`data/kajian-bnpb/silang-sumber/` dengan urutan otoritas ini:

1. `KEPUTUSAN-SILANG.md`: keputusan pemilik dan pertanyaan terbuka; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`SS-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Modul ini tidak menulis di `public/prediksi/**` atau `scripts/prediksi/**`.

### 2.7 Tangga Peringatan (`/prediksi`, tab Tangga): baca dulu, baru bangun

Sebelum menyentuh apa pun tentang tangga skala (musim, bulan, dasarian, 10 hari, sepekan, 3 hari, jam), pernyataan BMKG per kab/kota, atau sinyal "menguat" dan "belum selaras", baca dokumen di
`data/kajian-bnpb/tangga/` dengan urutan otoritas ini:

1. `KEPUTUSAN-TANGGA.md`: keputusan pemilik, menang atas semuanya; Q yang terbuka tidak dijawab dengan karangan.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md` (peringkat per sumber, sinyal, batas basi),
6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md` (`scripts/prediksi/tangga.py` -> `public/prediksi/data/tangga.json`), 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`TG-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Tidak pernah menulis "aman"; BMKG dan prediksi kita terpisah; tanpa skor gabungan sebelum uji balik. Pengerja: `prediksi`.

### 2.6 Formulir Juklak di Meja Kerja: baca dulu, baru bangun

Sebelum menyentuh meja `pengungsi`, `pengaduan`, `klaster`, `risiko`, atau pelengkap `kaji_cepat`, baca dokumen di
`data/kajian-bnpb/juklak/` dengan urutan otoritas ini: `KEPUTUSAN-JUKLAK.md` (menang atas semuanya), lalu PRD, ALUR, ALGORITMA, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET.

Aturan berhentinya sama dengan §2.1. Identitas pelapor pengaduan tidak pernah masuk `data`, rekap, atau ekspor.

### 2.7 Rantai Satu Kejadian, Kalender Kewajiban, Rapor SPM: baca dulu, baru bangun

Sebelum menyentuh rantai per KIB, kalender tenggat per BPBD, atau rapor SPM, baca dokumen di `data/kajian-bnpb/rantai/` dengan urutan otoritas ini: `KEPUTUSAN-RANTAI.md` (menang atas semuanya), RISET, PRD, ALUR, ALGORITMA, DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET (`RT-*`), GLOSARIUM.

Aturan berhentinya sama dengan §2.1. Pertanyaan terbuka di KEPUTUSAN tidak dijawab dengan karangan. Rantai digabung ke F1 Buku Besar Kejadian program Siklus Bencana (`data/kajian-bnpb/siklus/`, keputusan pemilik 10 Nov 2026): tidak ada dua buku kejadian.

### 2.9 Siklus Bencana (`/siklus`): baca dulu, baru bangun

Sebelum menyentuh apa pun tentang Buku Besar Kejadian, Peta Paparan per Bangunan, Kaji Cepat Otomatis, Jitupasna dan R3P, Renkon Hidup dan Gladi, Risiko Masa Depan, atau Pintu Tunggal, baca dokumen di
`data/kajian-bnpb/siklus/` dengan urutan otoritas ini (kode ada di `public/siklus/**`, `scripts/siklus/**`, `tests/siklus/**`, `src/siklus*.js`):

1. `KEPUTUSAN-AWAL.md`: keputusan pemilik, bawaan awal, dan pertanyaan terbuka U1 dan seterusnya; menang atas semuanya. Jangan menjawab pertanyaan terbuka dengan karangan.
2. `RISET.md` (+ `riset/R1-R3`): kode repo yang dipakai ulang, sumber data yang teruji, praktik dan peraturan.
3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`SK-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Paparan rinci hanya di R2 di balik sesi; angka antarsumber tidak dijumlah.

### 2.10 Operasi Udara (`/operasi`, bagian Operasi Udara): baca dulu, baru bangun

Sebelum menyentuh pantauan operasi udara (laporan gelar armada, kelayakan terbang, renlap dan PDF/KML/GPX-nya, respons, hasil padam dan api muncul lagi, kepatuhan, kontrak, perawatan), baca dokumen di
`data/kajian-bnpb/operasi-udara/` dengan urutan otoritas ini (kode di `public/operasi_laporan.js`, `public/operasi_peta.*`, `src/operasi_udara.js`, `src/operasi_hasil.js`, `scripts/operasi/**`):

1. `KEPUTUSAN-UDARA.md`: keputusan pemilik K1 dan seterusnya, pertanyaan terbuka Q1–Q12 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md` (F-1..F-21), 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md` (rute, migrasi 0125, R2 `operasi/renlap/`), 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`UD-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Nama kru tidak pernah disimpan; biaya kontrak tidak pernah masuk `public/`; tiap tiket layar ditinjau pemilik di `http://localhost:8800/operasi`.

### 2.11 Cek Kabar Luar (`/bnpb/dalops`, kejadian belum dilaporkan selesai): baca dulu, baru bangun

Sebelum menyentuh pemeriksaan kabar luar (berita, data alam) untuk kejadian Pantau Dalops yang belum dilaporkan selesai, baca dokumen di
`data/kajian-bnpb/cek-kabar/` dengan urutan otoritas ini (kode di `scripts/data/dalops_kabar.py` dan `scripts/data/dalops_banjir.py` milik `pipa-data`; `public/bnpb/dalops*.js` milik `ruang-bnpb`):

1. `KEPUTUSAN-CEK-KABAR.md`: keputusan pemilik, keputusan rancangan D1–D7, pertanyaan terbuka Q1–Q6 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`CK-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Label tidak pernah menutup kejadian; penutupan hanya dari laporan resmi. Tanpa rute Worker dan tabel D1 baru.

### 2.12 Laporan Berkala Kepala BNPB (`/laporan-bnpb`, jenis Laporan Berkala: harian, mingguan, bulanan, tahunan): baca dulu, baru bangun

Sebelum menyentuh laporan bencana berkala kepada Presiden (perakit angka per periode, versi beku, cetak A4), baca dokumen di
`data/kajian-bnpb/laporan-berkala/` dengan urutan otoritas ini (kode di `scripts/berkala/**` milik `pipa-data`; `public/laporan_berkala*`, `public/laporan_bnpb*`, `tests/berkala/**` milik `layar-peta`; `src/laporan_berkala.js` dan migrasinya milik `warga-api`):

1. `KEPUTUSAN-BERKALA.md`: keputusan pemilik, keputusan rancangan D1–D13, pertanyaan terbuka Q1–Q27 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`LB-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Angka dihitung mesin, kalimat kebijakan ditulis staf; versi beku tidak pernah ditimpa; tidak ada versi publik; tidak ada buku kejadian kedua.

### 2.13 Log tindak lanjut Usulan langkah (`/bnpb/dalops`, menu Penanganan): baca dulu, baru bangun

Sebelum menyentuh status, catatan, atau riwayat langkah di seksi Usulan langkah, baca dokumen di
`data/kajian-bnpb/tindak-langkah/` dengan urutan otoritas ini (kode di `src/dalops_tindak.js`, bagian Dalops tindak lanjut `src/hak.js`, `migrations/0128_dl_tindak.sql`, `tests/warga/dalops_tindak.test.mjs` milik `warga-api`; layar di `public/bnpb/dalops.js` milik `ruang-bnpb`):

1. `KEPUTUSAN-TINDAK.md`: keputusan pemilik K1–K3, rancangan D1–D6, pertanyaan terbuka Q1–Q6 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`TL-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Riwayat append-only; status tidak pernah mengubah daftar langkah; tidak ada data log di `public/`.

### 2.14 Peluang Semai Awan dan Prakiraan Asap (`/operasi`, seksi Peluang semai): baca dulu, baru bangun

Sebelum menyentuh zona semai awan (OMC), awan layak semai, prakiraan asap 24 jam untuk seksi ini, tampilan Pos komando, Tinjau BMKG, Mitra, atau target renlap dari zona, baca dokumen di
`data/kajian-bnpb/semai-awan/` dengan urutan otoritas ini (kode di `scripts/operasi/semai*` milik `pipa-data`; `scripts/udara/lintasan.py` milik `cuaca-udara`; `public/operasi_semai*` milik `layar-peta`; `src/operasi_semai.js` dan migrasi `op_semai_target` milik `warga-api`):

1. `KEPUTUSAN-SEMAI.md`: keputusan pemilik S1–S11, rancangan D1–D10, pertanyaan terbuka Q1–Q17 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md` (+ `riset/R1-R3`: sains semai, data dan model, cerna Nimbus), 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md` (gerbang, Q D T, zona, asap, uji prospektif), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`SA-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Zona adalah usulan, tidak pernah masuk renlap sendiri; tidak ada klaim "akan hujan" atau "memadamkan"; mesin asap tetap satu (`lintasan.py`).

### 2.15 Keterpaduan (nomor kejadian, antrean luring, spek formulir, titik pengungsian, satu orang): baca dulu, baru bangun

Sebelum menautkan modul ke Buku Besar Kejadian, menyentuh antrean luring IndexedDB atau spek formulir lintas modul, titik pengungsian, atau pemetaan akun ke register `orang`, baca dokumen di
`data/kajian-bnpb/keterpaduan/` dengan urutan otoritas ini (kode di `public/inti/antre.js`, `public/inti/spek.js`, `public/inti/kj_tanda.js` milik `inti-layar`; `src/kejadian_tautan.js` dan migrasi paket ini milik `warga-api`; sumber baru `scripts/siklus/pasang.py` milik `siklus`):

1. `KEPUTUSAN-KETERPADUAN.md`: keputusan pemilik K1-K7, rancangan D1-D13, jawaban pemilik K8-K14 (15 Nov 2026); menang atas semuanya.
2. `RISET.md` (+ `INVENTARIS-INPUT.md`), 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`KP-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Tidak ada router WA bersama (pemilik: "jangan"); tidak ada buku kejadian kedua; pencocok kejadian tetap satu (`pasang.py`); orang tidak pernah dicocokkan dari nama.

### 2.16 Paritas Bencana (semua bencana selengkap karhutla dan banjir): baca dulu, baru bangun

Sebelum menyentuh kemampuan lintas bencana (operasi dan renlap untuk semua jenis, pembuat dokumen sitrep/renops/laporan per KIB, tangga tindakan dan peringatan dini semua jenis, dashboard pimpinan dan papan status darurat, keputusan ekonomi dan prioritas wilayah, registri `kemampuan` di `public/bencana.json`, pemasangan data publik dari `docs/multi-bencana/DATA-PUBLIK.md`), baca dokumen di
`data/kajian-bnpb/paritas-bencana/` dengan urutan otoritas ini (kode tersebar di pemilik masing-masing: `public/inti/**` milik `inti-layar`, `src/**` dan migrasi milik `warga-api`, `scripts/<id>/**` dan `public/<id>/**` milik pengerja bencana, workflow milik `mekanik-mesin`; cek `ilmu.mjs pemilik`):

1. `KEPUTUSAN-PARITAS.md`: keputusan pemilik K1–K10, rancangan D1–D14, pertanyaan terbuka Q1–Q37 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md` (F-1..F-33, alur kerja W1–W7), 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md` (dashboard model A, K4), 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`PB-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Dibangun sekali di inti dan dinyalakan per bencana lewat registri, tanpa salinan per bencana; karhutla dan banjir tidak boleh mundur (uji golden PB-03); model tanpa uji balik tampil sebagai hipotesis.

### 2.17 Satu Pintu Masuk (`/masuk`, kode sekali pakai lewat WA, akun umum, undangan berantai, papan aktivasi): baca dulu, baru bangun

Sebelum menyentuh cara orang masuk (halaman `/masuk`, kode sekali pakai, akun umum `mk_*`, aktif otomatis, undangan berantai, papan aktivasi 514 kab/kota, daftar halaman publik `PUBLIK_TANPA_SESI`), baca dokumen di
`data/kajian-bnpb/pintu-masuk/` dengan urutan otoritas ini (kode di `src/masuk*.js`, `public/masuk.*`, `public/admin/aktivasi.js`, migrasi `mk_*`, `tests/warga/masuk*.test.mjs` milik `warga-api`; `public/inti/undang.js` milik `inti-layar`; `scripts/wa/lapangan_tarik.mjs` milik `wa-bot`):

1. `KEPUTUSAN-MASUK.md`: keputusan pemilik K1–K13, rancangan D1–D23, bawaan sementara Q2, Q3, Q4, Q6; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md` (F-1..F-14), 4. `ALUR.md`, 5. `ALGORITMA.md` (kode, batas laju, pencocokan nomor, anggota aktif otomatis), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`PM-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Sesi peran tetap diterbitkan modulnya sendiri; pintu lama tidak ditutup; staf selalu wajib sandi dan akun rahasia tidak pernah lewat kode; paket ini tidak membuat baris `staf` atau `instansi_akun`; tidak pernah membaca WA masuk; kode tidak pernah tersimpan atau tercatat dalam bentuk terbaca.

### 2.18 Misi Udara (renlap flight semua bencana: dropping, pantau, evakuasi, angkut, pencarian, kunjungan): baca dulu, baru bangun

Sebelum menyentuh flight plan helikopter per jenis misi, pemeriksaan zona terbang per bencana (radius gunung api, abu, tsunami, cuaca), pembaca titik dari tautan Google Maps, atau pola pencarian, baca dokumen di
`data/kajian-bnpb/misi-udara/` dengan urutan otoritas ini (kode di `scripts/umum/misi_udara.py`, `scripts/umum/zona_terbang.py`, `scripts/umum/batas_terbang.json`, `scripts/umum/misi_templat.json` milik `pipa-umum`; `scripts/wa/misi_udara.mjs` milik `wa-bot`; `src/pb_misi.js` dan migrasi `pb_misi`, `pb_misi_hasil` milik `warga-api`; `public/inti/misi_udara.*` milik `inti-layar`):

1. `KEPUTUSAN-MISI.md`: keputusan pemilik K1–K6, rancangan D1–D9, pertanyaan terbuka Q1–Q17 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md` (F-1..F-15, enam jenis misi), 4. `ALUR.md`, 5. `ALGORITMA.md` (zona, belokan, daya tahan, kelayakan), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`MU-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Usulan, bukan perintah terbang, dan tidak pernah menulis "aman"; zona dan ambang hanya dari sumber, angka tanpa sumber tidak dikodekan; tanpa nama orang; keluaran tidak di `public/` dan jenis kunjungan tidak di-commit; satu mesin di `scripts/umum/`, tanpa `renlap_<bencana>.py`; renlap karhutla dan semai awan tidak diubah.

### 2.19 Status Lifeline per kab/kota (listrik, sinyal, air, jalan, BBM, faskes, pangan, pengungsian): baca dulu, baru bangun

Sebelum menyentuh status layanan dasar per kejadian dan kab, baca dokumen di
`data/kajian-bnpb/lifeline/` dengan urutan otoritas ini (kode di `src/lifeline.js` dan bagian Lifeline `src/hak.js` milik `warga-api`; `public/siklus/lifeline.js` milik `siklus`; ringkasan `/bnpb/dalops` milik `ruang-bnpb`; jalur VNP46A2 `scripts/umum/lampu_malam.py` milik `pipa-umum`):

1. `KEPUTUSAN-LIFELINE.md`: keputusan pemilik K1-K2, rancangan D1-D9, pertanyaan terbuka Q1-Q7 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md` (ambang HIPOTESIS), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`LF-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Mesin tidak pernah menetapkan status resmi; tidak ada warna selain abu tanpa bukti; IODA per provinsi tidak pernah jadi warna kab; lampu malam baru dipakai sesudah uji balik lulus.

### 2.20 Siapa mengerjakan apa di mana (3W) dan pintu tawaran bantuan: baca dulu, baru bangun

Sebelum menyentuh register organisasi luar, baris 3W per kejadian dan kab per klaster, tautan bertoken organisasi, atau tawaran bantuan dan pencocokannya ke kebutuhan, baca dokumen di
`data/kajian-bnpb/tiga-w/` dengan urutan otoritas ini (kode di `src/tiga_w.js`, bagian TigaW `src/hak.js`, gabungan rute di `src/siklus.js`, pendaftaran `/bantu` di `src/worker.js` milik `warga-api`; `public/siklus/tiga_w.js` milik `siklus`; `public/bantu.*` milik `layar-peta`; `public/inti/klaster.js` milik `inti-layar`):

1. `KEPUTUSAN-TIGA-W.md`: keputusan pemilik K1-K4, rancangan D1-D8, pertanyaan terbuka Q1-Q7 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`TW-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Tanpa router WA; mesin tidak memutuskan tawaran; organisasi hanya melihat baris miliknya; tidak publik.

### 2.21 Kaji ulang pasca-kejadian (after-action review per kejadian Buku Besar): baca dulu, baru bangun

Sebelum menyentuh draf kaji ulang otomatis dari linimasa sistem, pelajaran dan rekomendasi staf, pelacakan rekomendasi lewat mesin log tindak lanjut, baca dokumen di
`data/kajian-bnpb/kaji-ulang/` dengan urutan otoritas ini (kode di `src/` dan migrasinya milik `warga-api`; layar di `public/siklus/` milik `siklus`):

1. `KEPUTUSAN-KAJI-ULANG.md`: keputusan pemilik, rancangan, dan pertanyaan terbuka dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`KU-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Draf dari data sistem, kalimat pelajaran ditulis staf; bagian tanpa data tertulis "tidak ada data", tidak pernah nol; riwayat rekomendasi append-only.

### 2.22 Peta kerusakan bangunan dari satelit (masuk Jitupasna /siklus): baca dulu, baru bangun

Sebelum menyentuh perkiraan bangunan rusak dari citra satelit sesudah kejadian, validasi per jenis bahaya, penerimaan staf ke Jitupasna, baca dokumen di
`data/kajian-bnpb/kerusakan-satelit/` dengan urutan otoritas ini (pipeline satelit milik `siklus` dan `pipa-umum` sesuai berkasnya; perubahan D1 Jitupasna milik `warga-api`):

1. `KEPUTUSAN-KERUSAKAN.md`: keputusan pemilik, rancangan, dan pertanyaan terbuka dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`KS-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Validasi dulu per jenis bahaya; tanpa vonis lulus tidak ada angka rusak; keluaran satelit selalu berlabel perkiraan dan hanya masuk Jitupasna lewat penerimaan staf; gempa tetap gagal sampai metode baru lulus.

### 2.23 Penurunan tanah dari radar satelit (InSAR) dan proyeksi rob: baca dulu, baru bangun

Sebelum menyentuh laju penurunan tanah per wilayah pesisir dari InSAR, proyeksi genangan rob 10-20 tahun, baca dokumen di
`data/kajian-bnpb/penurunan-tanah/` dengan urutan otoritas ini (pipeline `scripts/banjir/subsiden.py` dan layar `public/banjir/**` milik `banjir`):

1. `KEPUTUSAN-PENURUNAN.md`: keputusan pemilik, rancangan, dan pertanyaan terbuka dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`PT-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Rob dan penurunan tanah tampil terpisah berlabel; tanpa angka gabungan sebelum uji balik; berkas beku sidik J4 tidak disunting; unduh data hanya sesudah izin pemilik (Q1).

### 2.24 Pembiayaan risiko (kerugian per kejadian lawan dana DSP dan PFB, pemantau parametrik): baca dulu, baru bangun

Sebelum menyentuh perkiraan kerugian per kejadian, pembanding dana siap pakai dan Pooling Fund Bencana, atau pemantau ambang parametrik, baca dokumen di
`data/kajian-bnpb/pembiayaan-risiko/` dengan urutan otoritas ini (kode dan migrasi milik `warga-api`; layar staf milik `ruang-bnpb`):

1. `KEPUTUSAN-PEMBIAYAAN.md`: keputusan pemilik, rancangan, dan pertanyaan terbuka dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`PR-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Tanpa model kerugian yang lulus uji tidak ada angka kerugian sebelum Jitupasna; saldo DSP dan PFB hanya dari pemberi data resmi (Q1); pemantau parametrik hanya bila ada polis resmi; data uang tidak pernah di `public/`.

### 2.25 Pemetaan bangunan oleh relawan (HOT Tasking Manager, kampus mitra): baca dulu, baru bangun

Sebelum menyentuh metrik kelengkapan bangunan OSM per kab, daftar prioritas pemetaan, penyiapan proyek HOT, atau sumbangan pemeta kampus, baca dokumen di
`data/kajian-bnpb/pemetaan-relawan/` dengan urutan otoritas ini (pipeline `scripts/pemetaan/**`, konstanta layar `public/pemetaan/**`, dan uji `tests/kemitraan/pemetaan_*` milik `kampus`; kode Worker milik `warga-api`):

1. `KEPUTUSAN-PEMETAAN.md`: keputusan pemilik, rancangan, dan pertanyaan terbuka dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`HR-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Sistem hanya menyiapkan proyek; mengajukannya ke HOT adalah tindakan keluar oleh pemegang akun (Q1); nama mahasiswa tidak publik; paparan tidak beralih sumber tanpa keputusan pemilik (Q5).

### 2.26 Alun-alun Terpadu (`/alun-alun`, kotak masuk alun-alun di `/instansi`, kabar warga per kejadian, rekap untuk pimpinan): baca dulu, baru bangun

Sebelum menyentuh kabupaten baku utas alun-alun, tautannya ke Buku Besar Kejadian, kotak masuk alun-alun akun instansi, balasan atas nama lembaga, status dan riwayat bantuan, tanda tidak valid, pemberitahuan kebutuhan ke BPBD, atau rekap alun-alun untuk Layar Pimpinan, baca dokumen di
`data/kajian-bnpb/alun-terpadu/` dengan urutan otoritas ini (kode di `src/alun.js`, `src/alun_instansi.js`, `src/alun_konst.js`, bagian alun di `src/hak.js`, `src/kejadian_tautan.js`, `src/siklus_kejadian.js`, `src/siklus_kab.js`, `public/instansi_alun.js`, `public/admin/alun.js` milik `warga-api`; `public/bnpb/alun-alun.*` dan `public/admin/pimpinan.js` milik `ruang-bnpb`; `scripts/siklus/alun_rekap.py`, aturan sumber `alun` di `scripts/siklus/pasang.py`, dan `public/siklus/**` milik `siklus`):

1. `KEPUTUSAN-ALUN.md`: keputusan pemilik K1–K7, rancangan D1–D18, pertanyaan terbuka Q1–Q13 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md` (F-1..F-12), 4. `ALUR.md`, 5. `ALGORITMA.md` (utas yang ditautkan, hak wilayah, ukuran rekap, pemberitahuan), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`AT-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Kiriman alun-alun tidak pernah membuat kejadian atau mengubah fasenya (dijaga di pencocok dan di rute ingest Worker); pencocok tetap satu (`pasang.py`); kabupaten utas berkode baku; pemberitahuan hanya untuk kiriman terverifikasi dan tanpa judul; rekap dihitung pipeline, tanpa judul dan tanpa data orang; tidak ada versi publik, mitra, pemirsa, atau Laporan Berkala sebelum pemilik menjawab Q1, Q2, Q11, Q12; tidak pernah menulis "aman"; label lembaga diambil server dan hanya untuk balasan lembaga; tanpa trigger dan tanpa `ALTER` pada tabel `alun_*`.

### 2.27 Tab Besok di `/prediksi` (tabel, peta, Perlu tindakan, gelombang, angin, kekeringan pekan dan bulan): baca dulu, baru bangun

Sebelum menyentuh tabel dan peta tab Besok, kode arsip `GEL` dan `CEX`, aturan melaut dan angin kencang, atau anak tangga kering kita di skala sepekan dan bulan, baca dokumen di
`data/kajian-bnpb/prediksi-besok/` dengan urutan otoritas ini (kode di `scripts/prediksi/**`, `public/prediksi/**`, `tests/prediksi/**` milik `prediksi`):

1. `KEPUTUSAN-BESOK.md`: keputusan pemilik K1–K11, rancangan D1–D12, pertanyaan terbuka Q1–Q5 dengan bawaan sementara; menang atas semuanya. Untuk tab Tangga `data/kajian-bnpb/tangga/KEPUTUSAN-TANGGA.md` tetap berlaku.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md`, 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`BS-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Arsip tetap append-only; GEL dan CEX "belum teruji" sampai ada pengamatan; prediksi kekeringan kita tanpa peringkat dan tidak ikut sinyal Tangga; tanpa abrasi harian; tidak pernah menulis "aman".

### 2.28 Tindakan lapangan per bencana di operasi generik (`/operasi`, seksi Sarana dan fasilitas): baca dulu, baru bangun

Sebelum menyentuh katalog tindakan dan `kemampuan.tindakan` di registri, persen tindakan dari logbook Pusdalops, kolom tindakan di hasil renlap, atau `per_tindakan` di kepatuhan, baca dokumen di
`data/kajian-bnpb/tindakan-operasi/` dengan urutan otoritas ini (kode di `public/bencana.json` dan `public/inti/renlap.*` milik `inti-layar`; `scripts/umum/bencana.py` milik `pipa-umum`; `scripts/data/logbook_tindakan.py` milik `pipa-data`; `src/pb_isian.js`, bagian PB di `src/hak.js`, `migrations/0153_pb_renlap_tindakan.sql` milik `warga-api`; `public/operasi_laporan.js` milik `layar-peta`):

1. `KEPUTUSAN-TINDAKAN.md`: keputusan pemilik K1–K3, rancangan D1–D9, pertanyaan terbuka Q1–Q4 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md` (kata kunci, ambang 2 persen), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`TO-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Daftar tindakan hanya dari logbook atau sumber kedua tercatat, tanpa karangan; pemadaman, water bombing, dan patroli api tetap di modul karhutla; teks logbook asli tidak pernah masuk `public/`.

### 2.29 Bot Laporan WA dengan Claude API (forward bahan, `buat`, revisi lewat chat, `final` ke Drive tim IT): baca dulu, baru bangun

Sebelum menyentuh mesin proyek laporan di bot WA, pemanggil Claude API, operasi ubah deck, kunci angka sistem, atau tabel `bl_*`, baca dokumen di
`data/kajian-bnpb/bot-laporan/` dengan urutan otoritas ini (kode di `scripts/wa/proyek.mjs`, `scripts/wa/claude.mjs`, `scripts/wa/claude/**`, kecerdasan percakapan V2.1 `scripts/wa/maksud.mjs`, versi dan ikon `scripts/wa/versi.mjs`, `scripts/wa/hias.cjs`, mesin agen V2 `scripts/wa/agen.mjs`, `scripts/wa/agen_pagar.mjs`, `scripts/wa/agen_isi.py`, `scripts/wa/agen/**`, `tests/wa/**` milik `wa-bot`; `data/laporan-bnpb/generator/ubah.py` dan perubahan generator milik `pipa-data`; `src/wa_proyek.js`, bagian bot laporan `src/hak.js`, migrasi `bl_*` milik `warga-api`):

1. `KEPUTUSAN-BOT-LAPORAN.md`: keputusan pemilik K1–K30 (V2: K22–K28, V2.1: K29–K30), rancangan D1–D35 (V2: D14–D29, V2.1: D30–D35), pertanyaan terbuka Q1–Q24 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md` (F-1..F-15), 4. `ALUR.md`, 5. `ALGORITMA.md` (kutipan, operasi ubah, kunci, banding 7 hari), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`BL-*`, V2 dan V2.1 `BV-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Bot V1: Claude tidak pernah menulis angka sistem dan tidak pernah menyunting PPTX langsung; deck selalu dari generator yang ada. Bot V2 (`BL_VERSI=2`, K23): agen Claude Code menyempurnakan deck generator di ruang kerjanya sendiri, angka sistem dijaga pagar angka mesin, agen tidak pernah mengirim, mengunggah, commit, atau mengubah generator. Bot V2.1 (K29, K30): kalimat bebas dipahami Claude Haiku, *final* dan *batal* dari kalimat bebas selalu ditanya dulu, rapikan bahan tidak pernah menambah angka (pagar D31), kumpul revisi dikerjakan sekali saat *lanjut*. Tiap perubahan perilaku bot menaikkan `VERSI` dan changelog (gerbang `tests/wa/versi.test.mjs`); versi append-only; hanya nomor terdaftar; kunci API hanya di `.env` mesin; jalur terjadwal `otomatis.mjs` tidak diubah.

### 2.30 Lapor Bencana BNPB (chatbot AI pelaporan kejadian, pintu WA dan web `/lapor`, monitoring dan peta `/lapor/meja`): baca dulu, baru bangun

Sebelum menyentuh pelaporan kejadian lewat chatbot (identitas pelapor, isian data umum dan khusus yang dituntun AI, foto bergeotag, tiket dan PDF laporan, monitoring dan dashboard peta), baca dokumen di
`data/kajian-bnpb/lapor-ai/` dengan urutan otoritas ini (kode di `src/lapor_spek.js`, `src/lapor_mesin.js`, `src/lapor_model.js`, `src/samarkan.js` dan rute nanti milik `warga-api`; `public/lapor/**` milik `layar-peta`; `scripts/lapor/**` dan sambungan gateway `scripts/wa/**` milik `wa-bot`; agent `lapor-ai` dibuat di LA-00):

1. `KEPUTUSAN-LAPOR-AI.md`: keputusan pemilik K1–K30, rancangan D1–D22, pertanyaan terbuka Q1–Q15 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md` (putaran, isian berikutnya, kutipan angka, identitas, tiket), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`LA-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Kode memegang alur, AI hanya mengurai berkutipan; angka tanpa kutipan dibuang dan kosong tidak pernah jadi nol; laporan warga tidak pernah membuat kejadian resmi atau tampil publik; nomor WA pelapor hanya di monitoring staf, tidak pernah di repo; tinjau di `http://localhost:8800/lapor/` (server tinjau menjawab `/api/lapor/*` dengan mesin lokal, tidak meneruskan ke produksi).

### 2.31 Data lanjutan BPBD (Lapor Bencana tahap 2 dan 3: rumah, prasarana, pengungsi, korban per objek, tim, penutupan): baca dulu, baru bangun

Sebelum menyentuh pendataan per objek sesudah laporan awal BPBD (rumah per rumah, prasarana, tempat pengungsian dan pengungsi per jiwa, korban per orang, usaha, kebutuhan, tim BPBD, pertanyaan harian, penutupan dan versi beku), baca dokumen di
`data/kajian-bnpb/lapor-lanjutan/` dengan urutan otoritas ini (kode di `src/lapor_lanjut*.js`, langkah tahap 2 di `src/lapor_mesin.js`, `migrations/0161_lapor_data.sql`, `tests/lapor/lanjut_*` milik `warga-api`; `src/meja*.js` bagian sumber daftar milik `warga-api`; usulan fase di `scripts/siklus/pasang.py` milik `siklus`; antrean `lj_kabar` di gateway `scripts/wa/**` milik `wa-bot`; `public/lapor/data/**` dan rincian di `public/lapor/meja*` milik `layar-peta`):

1. `KEPUTUSAN-LANJUTAN.md`: keputusan pemilik K1–K10, rancangan D1–D23, pertanyaan terbuka Q1–Q15 (Q4 dan Q1 terjawab K9, K10) dengan bawaan sementara; menang atas semuanya. Paket induk `data/kajian-bnpb/lapor-ai/` tetap berlaku.
2. `RISET.md`, 3. `PRD.md` (F-1..F-15), 4. `ALUR.md`, 5. `ALGORITMA.md` (spek objek, penanda, rekap, kondisi akhir), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`LJ-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Hanya tingkat `bpbd` terkonfirmasi; angka rekap dihitung dari daftar, tidak diketik; kosong tidak pernah jadi nol; tidak ada pencocokan orang; data pribadi tidak pernah di `public/` atau pesan WA ke luar tim; penutupan dan fase Buku Besar hanya lewat penerimaan staf; versi beku tidak pernah ditimpa; data pribadi dihapus 5 tahun sesudah penutupan (K9).

### 2.32 Prakiraan lawan Kejadian (`/bnpb/dalops`, prakiraan `/prediksi` di Dalops, seksi Prakiraan dan kejadian, titik Lapor Bencana di peta): baca dulu, baru bangun

Sebelum menyentuh prakiraan di Dalops, pencocokan prakiraan dengan kejadian Dalops dan laporan Lapor Bencana, rute titik laporan untuk Dalops, atau label logbook untuk rapor `/prediksi`, baca dokumen di
`data/kajian-bnpb/prediksi-kejadian/` dengan urutan otoritas ini (kode di `public/bnpb/dalops*.js` dan `tests/bnpb/dalops_prakiraan*` milik `ruang-bnpb`; `src/dalops.js` dan `src/prediksi.js` milik `warga-api`; `scripts/prediksi/**` milik `prediksi`):

1. `KEPUTUSAN-PREDIKSI-KEJADIAN.md`: keputusan pemilik K1-K6, rancangan D1-D10, pertanyaan terbuka Q1-Q4 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md`, 4. `ALUR.md`, 5. `ALGORITMA.md` (jendela plus minus satu hari, empat kotak, label logbook), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`PK-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Prakiraan tetap satu mesin (`scripts/prediksi`), Dalops hanya membaca; tidak ada "salah alarm" dan tidak ada "aman"; laporan warga hanya bukti positif; data laporan tidak pernah di `public/` atau `/prediksi`; DIBI dan logbook dinilai terpisah, tanpa rata-rata; tanpa tombol pindah sisi panel.

## 3. Bentuk kerja

### 3.2 Verifier wajib konteks bersih

Penulis kode bukan pengulasnya. Verifier = subagent baru tanpa riwayat
pekerjanya, dan memeriksa sinyal nyata (self-check hijau, uji balik jalan,
`npm run uji:warga` hijau), bukan klaim "sudah beres".

### 3.3 Hanya main (pemilik, 16 Okt sampai 9 Nov 2026)

Pemilik tidak pernah mau ada branch atau worktree. Semua kerja langsung di `main`,
tanpa pengecualian, termasuk agent. Hook `scripts/agents/tolak-branch.mjs` menolak
`git checkout -b`, `git switch -c`, `git branch <nama>`, `git worktree add`, push ke
selain `main`, `isolation: "worktree"`, dan `EnterWorktree`. Gerbangnya
`tests/agen/gerbang-tanpa-branch.test.mjs`.

Checkout utama sering dipegang beberapa sesi Claude sekaligus dan index git-nya
dipakai bersama. Fan-out yang membaca aman jalan bersamaan; agent penulis jalan satu
per satu, atau bersamaan hanya bila berkasnya disebut di brief dan tidak beririsan.
Commit dengan path spesifik (`git commit -- <berkas>`), jangan `git add -A`.
Push pakai `npm run dorong`: antre per repo, menyusul `main`, lalu push lewat uji pre-push.

Sisa branch yang sudah masuk `main` disapu hook `Stop` lewat
`scripts/agents/sapu-branch.sh` (gerbang `tests/agen/gerbang-sapu-branch.test.mjs`).
Branch lain yang ditemukan dilaporkan ke pemilik beserta perintah hapusnya.

### 3.4 Aturan pemilik masuk gerbang, bukan memory

Tiap kali pemilik bilang "catat" atau mengulang koreksi, tanya dulu apakah
mesin bisa memeriksanya. Kalau bisa, aturannya dijadikan gerbang uji
(`tests/agen/**`) atau hook (`.claude/settings.json`) di giliran yang sama,
dan pelanggaran yang sudah ada dibetulkan di commit yang sama. Memory cuma
untuk fakta, penunjuk, dan selera yang tidak terukur. Status dan to-do masuk
docs/TIKET. Aturan yang bertentangan dengan aturan lama ditanyakan ke pemilik,
lalu yang kalah dihapus. Latar dan rencana kerjanya ada di
`docs/buku-pegangan/AUDIT-ATURAN-HARNESS.md`.

### 3.5 Kartu laporan standar (4 Nov 2026)

Tiap bagian layar laporan (tab Insight/Tren/Dampak, menu Operasi, `/bnpb/*`) adalah satu
kartu `.ex.ex-std` dari `public/inti/kartu.css`: pil kategori `.ex-ey`, judul berupa kalimat
temuan dengan angka disorot `.hl`, isi (tabel `.ex-tabel` menempel penuh, kepala tabel biru
tua). Tanpa kaki keterangan/sumber (pemilik 4 Nov 2026: "hilangkan"); definisi kolom masuk
`title` kepala tabel. Tombol atau pemilih bagian di kanan judul. Jangan
membuat kepala bagian sendiri (bilah gelap, `.head` + h2 lepas). Layar laporan baru masuk
daftar `LAYAR` di gerbang `tests/agen/gerbang-kartu-std.test.mjs`.
Sejak 15 Nov 2026 gerbang itu juga menegakkan pembaruan di bawah: kepala kartu tanpa `.hl` (kalimat temuan) dan tanpa kaki Sumber; layar lama
ditampung ratchet `tests/agen/fixtures/kartu_std.json` (hanya boleh menyusut, hapus entri saat berkas bersih), layar yang sudah dirombak
(`WAJIB_BERSIH` di `fixtures/kartu_std.mjs`) tanpa pengecualian.

**Pembaruan 11 Nov 2026 (pemilik: "gausah ada kesimpulan ini", "Catet ya gausah ada yang gini. Jelek banget"):**
kepala kartu = NAMA SEKSI berikon (mis. "Base dan armada", "Renlap"), bukan kalimat temuan, dan isi kartu
tidak memuat kalimat kesimpulan sama sekali. Angka temuan tampil di Ringkasan dan pop-up, bukan sebagai kalimat
di kepala atau di baris pertama kartu. Berlaku untuk layar yang dibangun atau dirombak mulai tanggal ini; layar
lama dirapikan saat disentuh. Kartu boleh dilipat (`<details>`) dan dikelompokkan dengan pil kategori.
Gerbangnya `tests/agen/gerbang-tanpa-kesimpulan.test.mjs` (layar `/operasi` dulu; layar lain masuk daftarnya saat dirombak).

**Pembaruan 11 Nov 2026 malam (pemilik: "highlight belakang gelap cuma untuk yang atas"):** di layar yang memakai tingkat wadah
(`/operasi`, `data/kajian-bnpb/operasi-udara/DESIGN-SYSTEM.md` §8), latar gelap hanya untuk kepala halaman (L1). Kepala bagian
dan kepala kartu terang (biru muda, teks navy). Kepala tabel tetap navy tua bertulisan putih (pemilik, malam yang sama: "pakai format tabel biasa").

### 3.6 Folder revisi laporan harian (9 Nov 2026)

Tiap keluaran Laporan Kejadian Bencana Harian dan Laporan Penanganan Pengendalian Karhutla masuk foldernya sendiri di folder hari:
`Revisi 3/<nama deck>.pptx` dan `.pdf`, nama berkas tanpa `(rev3)`. Skrip harian menyerahkannya lewat `lewat_deck.serah_revisi`.
Deck lain belum kena aturan ini. Gerbangnya `tests/agen/gerbang-folder-revisi.test.mjs`.

### 3.7 Fitur besar: paket dokumen dulu, baru kode (10 Nov 2026)

Pemilik: "disiapkan semuanya dari hulu ke hilir baru dikerjakan kodingannya biar ga jelek". Fitur atau modul besar lahir berurutan: KEPUTUSAN, RISET, PRD, ALUR, ALGORITMA, DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET, GLOSARIUM di `data/kajian-bnpb/<modul>/`, diperiksa pemeriksa bersih, lalu bagian "baca dulu, baru bangun" di §2 dan agent pengerjanya, baru tiket pertama dikerjakan. Pertanyaan yang belum dijawab pemilik ditulis dengan bawaan sementara yang ditandai, tidak dikarang. Folder baru di `public/` atau `scripts/` tanpa paket ditolak. Gerbangnya `tests/agen/gerbang-paket-modul.test.mjs`, pengingatnya `scripts/agents/pengingat-paket.mjs`.

### 3.8 Tinjau di lokal dulu (11 Nov 2026)

Pemilik meninjau tiap perubahan layar di lokal, tanpa menunggu push dan terbit GitHub. Server tinjau tetap ada di
**http://localhost:8800**: kode (HTML, JS, CSS) dari folder kerja, data, API, dan login dari centurisk97.id
(`scripts/agents/tinjau_lokal.mjs`, launchd `id.centurisk97.tinjau-lokal`, dipasang pemilik sekali lewat `npm run tinjau:pasang`).
Tiap sesi yang mengubah layar menutup laporannya dengan tautan `http://localhost:8800/<jalur>` halaman itu; bila port 8800
tidak menjawab, jalankan `npm run tinjau` di latar dan sebut itu. Pemilik masuk sendiri lewat `/admin/masuk` di localhost;
tulisan lewat server ini mengenai PRODUKSI. Gerbangnya `tests/agen/gerbang-tinjau-lokal.test.mjs`.

### 3.9 Merek dulu, atom dulu, baru layar (15 Nov 2026)

Pemilik: hasil tanpa panduan "masih slop dan generic (belum ada branding)"; resepnya "bikin atomic elements terus baru ke components".
Tiap layar, dashboard, atau artifact visual dibangun berurutan: token di `public/inti/tema.css`, element dengan semua keadaannya,
blocks, baru layar; gaya baru tidak muncul di tingkat blocks atau layar. Panduan lengkap dan sembilan ciri slop ada di `~/.claude/DESAIN.md`
(artifact https://claude.ai/artifact/Ef9FKm77jDE5uzHVYCrZ4u). Yang bisa diperiksa mesin: literal warna di `public/**/*.css` di luar
`tema.css` tidak boleh bertambah. Gerbangnya `tests/agen/gerbang-token-warna.test.mjs`, daftar sisa `tests/agen/fixtures/token-warna-sisa.json`
(hanya boleh menyusut; kurangi saat berkasnya disentuh). Deklarasi `--nama:` tidak dihitung, jadi palet lokal lewat properti kustom
ditolak di tinjauan, bukan oleh mesin. Butir lain panduan itu belum digerbangi.

## 6. Review

| Permukaan berubah                          | Pengulas                                  |
| ------------------------------------------ | ----------------------------------------- |
| Model, indeks risiko, uji balik            | `validasi-model`                          |
| Route worker, foto, form, secret, header   | `guard-api`, `security-reviewer`          |
| Migrasi D1                                 | `migrasi-idempoten`                       |
| Kartu, pop-up, angka di layar              | `selera-angka`                            |
| Handler klik/tab/geser peta                | `inp-reviewer`                            |
| Commit besar                               | `higiene-repo`                            |

Pengulas melapor, tidak auto-fix. Pengerja pemiliknya yang membetulkan.

## 9. Batas mati

- Tidak ada `wrangler deploy` atau push ke produksi dari subagent.
- Gerbang, plafon, dan uji haram dilemahkan untuk meloloskan kerjaan sendiri.
- Subagent tidak commit dan tidak push; sesi induk yang melakukannya.
- Berkas `* 2.*` adalah salinan nyasar sinkronisasi; jangan disunting atau dipakai.
- Secret tidak pernah masuk berkas yang dilacak git.
