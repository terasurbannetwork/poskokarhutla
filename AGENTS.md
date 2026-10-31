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

## 3. Bentuk kerja

### 3.2 Verifier wajib konteks bersih

Penulis kode bukan pengulasnya. Verifier = subagent baru tanpa riwayat
pekerjanya, dan memeriksa sinyal nyata (self-check hijau, uji balik jalan,
`npm run uji:warga` hijau), bukan klaim "sudah beres".

### 3.3 Isolasi pekerja

Checkout utama sering dipegang beberapa sesi Claude sekaligus dan index git-nya
dipakai bersama. Fan-out yang membaca aman di tree yang sama; fan-out yang
menulis pakai `isolation: "worktree"`. Commit dengan path spesifik
(`git commit -- <berkas>`), jangan `git add -A`.

### 3.4 Aturan pemilik masuk gerbang, bukan memory

Tiap kali pemilik bilang "catat" atau mengulang koreksi, tanya dulu apakah
mesin bisa memeriksanya. Kalau bisa, aturannya dijadikan gerbang uji
(`tests/agen/**`) atau hook (`.claude/settings.json`) di giliran yang sama,
dan pelanggaran yang sudah ada dibetulkan di commit yang sama. Memory cuma
untuk fakta, penunjuk, dan selera yang tidak terukur. Status dan to-do masuk
docs/TIKET. Aturan yang bertentangan dengan aturan lama ditanyakan ke pemilik,
lalu yang kalah dihapus. Latar dan rencana kerjanya ada di
`docs/buku-pegangan/AUDIT-ATURAN-HARNESS.md`.

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
