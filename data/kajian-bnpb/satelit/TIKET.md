# TIKET: Pemantauan satelit

Kerjakan urut menurut nilai keputusan lapangan dibagi usaha (RISET 3.1); ambil satu tiket, kerjakan hanya cakupannya. Pengerja tidak memeriksa dirinya sendiri (AGENTS 3.2). Tiket layar ditinjau pemilik di `http://localhost:8800`. Induk: KI-87 (paket), KI-88 (tiket ini).

| Tiket | Isi | Berkas | Pengerja | Pemeriksa | Bergantung | Q | Bukti siap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ST-00 | Daftarkan berkas baru di roster pemilik; cek syarat atribusi JMA dan NOAA ODD; bagian "baca dulu, baru bangun" di AGENTS.md §2 (sesi induk) | `scripts/agents/roster.json`, `AGENTS.md` | `mekanik-mesin` (+ sesi induk) | `higiene-repo` | - | Q7 | T17 |
| ST-01 | **Butir 1a.** Status "sumber terputus" untuk WLF dan semua sumber satelit: tulis `status_sumber`, `/api/status`, kartu Satelit, kolom Himawari di tugas api tidak lagi kosong diam | `scripts/data/himawari.py`, `src/himawari.js`, `src/worker.js` (bagian status), `public/inti/satelit.*`, `tests/inti/satelit.test.mjs` | `pipa-data`, `warga-api`, `inti-layar` | `guard-api`, `selera-angka` | ST-00 | - | T1, T2, T3 |
| ST-02 | **Butir 1b.** Coba FTPS `FTP_TLS` (21 eksplisit, 990 implisit); siapkan teks surel JAXA untuk pemilik | `scripts/data/himawari.py` | `pipa-data` | `security-reviewer` | ST-01 | Q1 | T1 |
| ST-03 | **Butir 1c.** Pemindai bersama 10 menit dan pemicu Worker; ukur seminggu, usulkan angka Q5 | `scripts/umum/himawari_pindai.py`, `src/satelit_picu.js`, `src/worker.js` (cron), `.github/workflows/satelit.yml` | `pipa-umum`, `warga-api`, `mekanik-mesin` | `guard-api`, `security-reviewer` | ST-00 | Q2, Q4, Q5, Q8 | T4, T5, T6, T20 |
| ST-04 | **Butir 1d.** Detektor api kontekstual B07/B14 dari L1b, tulis kriteria dan sidik sebelum menilai | `scripts/data/api_himawari.py`, `.kriteria.json`, `.sidik` | `pipa-data` | `validasi-model` | ST-03 | Q13 | T7, T8 |
| ST-05 | **Butir 1e.** Uji api lawan VIIRS (+ WLF arsip), pembanding persistensi dan klimatologi, vonis ke `gerbang/satelit.json` | `scripts/data/api_himawari.py`, `public/data/gerbang/satelit.json` | `pipa-data` | `validasi-model` | ST-04, arsip >= 4 minggu | Q5, Q13 | T9 |
| ST-06 | **Butir 1f.** Migrasi kolom `sumber`, `alarm_himawari` menerima `l1b` hanya bila lolos | `migrations/<nomor>_alarm_himawari_sumber.sql`, `src/alarm_himawari.js` | `warga-api` | `migrasi-idempoten`, `guard-api` | ST-05 | Q3, Q6 | T10 |
| ST-07 | Pemilik menerapkan migrasi di D1 produksi | - | pemilik | - | ST-06 | - | `wrangler d1 migrations apply` |
| ST-08 | **Butir 2.** Abu split-window terkoreksi uap air, kotak gunung level >= II, kriteria lalu vonis lawan VONA | `scripts/gunungapi/abu_satelit.py`, kriteria, sidik | `gunungapi-kering` | `validasi-model` | ST-03 | Q13 | T11 |
| ST-09 | **Butir 3.** Konveksi 10 menit + puncak tembus + paralaks, kriteria lalu vonis lawan Dalops cuaca (puting beliung, cuaca ekstrem) | `scripts/udara/awan_tumbuh.py`, kriteria, sidik | `cuaca-udara` | `validasi-model` | ST-03 | Q13 | T12 |
| ST-10 | **Butir 4.** Panas kawah FIRMS + SO2 TROPOMI OFFL, kriteria lalu vonis lawan level MAGMA | `scripts/gunungapi/kawah.py`, `scripts/gunungapi/so2.py`, `lintas.yml` | `gunungapi-kering`, `mekanik-mesin` | `validasi-model`, `security-reviewer` (token) | ST-00 | Q12, Q13 | T13 |
| ST-11 | **Butir 5.** Genangan GFM harian per kab aktif pola insiden karhutla, vonis lawan Dalops banjir | `scripts/banjir/genangan_harian.py`, `banjir.yml` | `banjir`, `mekanik-mesin` | `validasi-model` | ST-00; tidak mengubah tiket GS-* | Q10, Q13 | T14 |
| ST-12 | **Butir 6.** VHI mingguan per kab, vonis lawan Dalops kekeringan dan SPI-3 | `scripts/kekeringan/vhi.py`, `statis.yml` | `gunungapi-kering`, `mekanik-mesin` | `validasi-model` | ST-00 | Q9, Q13 | T15 |
| ST-13 | **Butir 7.** Asap AI TROPOMI per kab, vonis lawan PM2.5 | `scripts/udara/asap_aod.py`, `udara.yml` | `cuaca-udara`, `mekanik-mesin` | `validasi-model` | ST-00 | Q11, Q13 | T16 |
| ST-14 | Pemasangan kartu Satelit di layar bencana dan kolom tugas api | `public/index.html`, `public/instansi*.js`, `public/gunungapi/**`, `public/cuaca/**`, `public/banjir/**`, `public/kekeringan/**`, `public/udara/**` | `layar-peta`, `warga-api`, `gunungapi-kering`, `cuaca-udara`, `banjir` | `inp-reviewer`, `selera-angka` | ST-01, lalu per detektor | Q6, Q7, Q10 | T3, T18, T19 |
| ST-15 | Lanjutan: kabut malam lawan METAR | detektor di `himawari_pindai.py` lewat `scripts/udara/` | `cuaca-udara` | `validasi-model` | ST-03 | Q14 | uji detektor + vonis |
| ST-16 | Lanjutan: GSMaP_NOW per kab | `scripts/banjir/genangan/gsmap.py` | `banjir` | `validasi-model` | FTP JAXA pulih | Q14 | `python3 -I scripts/banjir/genangan/gsmap.py uji` |
| ST-17 | Lanjutan: LST split-window komposit harian | `scripts/kekeringan/` | `gunungapi-kering` | `validasi-model` | ST-12 bervonis | Q14 | uji detektor + vonis |

Catatan urutan: ST-01 dan ST-02 dikerjakan hari ini karena kerugian sedang berjalan; ST-04 dan ST-05 menunggu arsip pemindai minimal empat minggu kecuali periode uji diambil dari arsip L1b NOAA historis (bucket menyimpan riwayat), yang diputuskan di kriteria ST-04.
