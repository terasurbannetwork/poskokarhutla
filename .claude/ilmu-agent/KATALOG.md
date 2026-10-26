# Katalog armada agent — pengetahuan orkestrator

> DI-GENERATE dari `scripts/agents/roster.json` (`npm run agents:build`). Jangan disunting tangan.
> Armada: **22 agent**. Aturan memakainya dan otoritas membuat agent baru: `AGENTS.md` §1.5.

Cara memakai katalog ini:

1. **Siapa pemilik berkasnya?** `node scripts/agents/ilmu.mjs pemilik <berkas...>`. Pengerja pemiliknya
   yang mengerjakan; berkas tanpa pemilik = kerja orkestrator, atau tanda agent baru perlu lahir.
2. **Siapa memverifikasi?** Pemeriksa yang kolom "bisa"-nya cocok, TIDAK PERNAH pengerja yang sama.
3. **Rakitan** = 1 pengerja + 1–3 pemeriksa, maksimal 4–5 jalan bersamaan.
4. Agent baru biasanya langsung terdaftar di tool Agent begitu berkasnya mendarat. Kalau namanya belum
   muncul, panggil `general-purpose` dengan prompt "Kamu adalah <nama>: baca `.claude/agents/<nama>.md`
   dan jalankan `node scripts/agents/ilmu.mjs baca <nama>` dulu".

## Pengerja domain — memiliki wilayah berkas, boleh menyunting di wilayahnya (13)

| Agent | Model | Bisa | Tidak bisa | Wilayah |
| --- | --- | --- | --- | --- |
| `pipa-data` | sonnet | membangun & membetulkan skrip pipeline data karhutla dan JSON keluarannya | model ML sebaran; tampilan layar; worker Cloudflare | `scripts/data/**`, `scripts/scrape/**`, `scripts/geo/**` +5 |
| `model-sebaran` | sonnet | membangun, melatih ulang, dan menguji model sebaran/eskalasi serta evaluator JS-nya | pipeline data mentah; worker; memverifikasi kejujuran uji baliknya sendiri (itu validasi-model) | `scripts/sebaran/**`, `public/sebaran_model.js`, `public/insight_sebaran*.js` +2 |
| `banjir` | sonnet | membangun & membetulkan pipeline dan layar banjir/rob | karhutla; worker warga | `scripts/banjir/**`, `public/banjir/**`, `tests/banjir/**` +1 |
| `gempa` | sonnet | membangun & membetulkan pipeline, model guncangan/susulan, dan layar modul gempa & tsunami | worker dan D1 (warga-api); karhutla; banjir; menyunting .github/workflows | `scripts/gempa/**`, `public/gempa/**`, `tests/gempa/**` |
| `warga-api` | sonnet | membangun & membetulkan worker, route API, skema D1, alur laporan warga dan admin | pipeline data; model; deploy | `src/**`, `migrations/**`, `wrangler*.jsonc` +10 |
| `layar-peta` | sonnet | membangun & membetulkan layar peta, kartu, pop-up, bagikan, i18n | pipeline data; model; worker & D1 | `public/*.html`, `public/*.js`, `public/*.css` +12 |
| `inti-layar` | sonnet | membangun dan memecah modul inti layar, registry bencana, halaman bencana berkerangka | pipeline data; worker & D1; workflow | `public/inti/**`, `public/bencana.json`, `public/semua/**` |
| `pipa-umum` | sonnet | membangun dan menguji pustaka pipeline bersama, subperintah bencana.py | layar; worker; workflow; logika domain satu bencana | `scripts/umum/**`, `scripts/berita/**` |
| `sippa` | sonnet | membangun dan membetulkan layar /pipa, fungsi hitung murni JS, mesin Studio, adegan 3D, laporan PDF, dan uji tests/sippa | worker dan D1; pipeline Python; vendor pustaka (layar-peta); memeriksa kerjanya sendiri | `public/pipa/**`, `tests/sippa/**` |
| `cuaca-udara` | sonnet | membangun pipeline dan layar modul cuaca ekstrem dan udara | worker dan D1 (warga-api); karhutla; banjir; gempa; menyunting .github/workflows | `scripts/cuaca/**`, `scripts/udara/**`, `public/cuaca/**` +6 |
| `gunungapi-kering` | sonnet | membangun pipeline dan layar modul gunung api dan kekeringan | worker dan D1 (warga-api); karhutla; banjir; gempa; menyunting .github/workflows | `scripts/gunungapi/**`, `scripts/kekeringan/**`, `public/gunungapi/**` +3 |
| `ruang-bnpb` | sonnet | membangun halaman publik Ruang Koordinasi BNPB dan pipeline indeks risiko/kebutuhan | worker & D1; model sebaran; deploy | `public/bnpb/**`, `scripts/bnpb/**`, `tests/bnpb/**` +4 |
| `pesisir` | sonnet | membangun & membetulkan pipeline abrasi garis pantai dan keluarannya | worker dan D1; layar banjir; karhutla; menyunting .github/workflows | `scripts/pesisir/**`, `public/pesisir/**`, `tests/pesisir/**` |

## Pengerja platform — kerja menyeberang domain (layar, uji, gerbang, mesin, migrasi) (2)

| Agent | Model | Bisa | Tidak bisa | Wilayah |
| --- | --- | --- | --- | --- |
| `mekanik-mesin` | sonnet | merawat workflow, skrip npm, settings, mesin agent | logika domain di skrip yang dipanggil workflow | `.github/workflows/**`, `package.json`, `package-lock.json` +5 |
| `penulis-gerbang` | sonnet | menulis gerbang dan uji integrasi lintas modul | memperbaiki kode domain yang digerbang | `tests/agen/**`, `tests/beban/**` |

## Pemeriksa — read-only, verifier berkonteks bersih (AGENTS.md §3.2) (7)

| Agent | Model | Bisa | Tidak bisa | Wilayah |
| --- | --- | --- | --- | --- |
| `validasi-model` | sonnet | memeriksa kebocoran, kalibrasi, dan kejujuran klaim kinerja model | menyunting kode; membangun model | — |
| `guard-api` | haiku | memeriksa gerbang tiap route worker | menyunting kode; menilai logika bisnis route | — |
| `migrasi-idempoten` | haiku | memeriksa migrasi D1 idempoten dan berurutan | menyunting migrasi; merancang skema | — |
| `higiene-repo` | haiku | memeriksa salinan nyasar, secret ter-commit, berkas besar | menyunting atau menghapus berkas | — |
| `selera-angka` | haiku | memeriksa format, satuan, dan sumber angka di layar | menyunting layar; memeriksa kebenaran model | — |
| `security-reviewer` | sonnet | memeriksa celah keamanan dan privasi | menyunting kode | — |
| `inp-reviewer` | sonnet | memeriksa responsivitas interaksi layar | menyunting layar | — |

## Lapangan — membaca produksi dan memanen sumber luar (0)

| Agent | Model | Bisa | Tidak bisa | Wilayah |
| --- | --- | --- | --- | --- |
