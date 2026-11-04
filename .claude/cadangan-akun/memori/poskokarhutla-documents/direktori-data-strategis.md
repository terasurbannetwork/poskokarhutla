---
name: direktori-data-strategis
description: "30 Oct 2026 owner approved 13 new public datasets for the Direktori Jaringan Kebencanaan; harvest folder, what already existed, integrated and live 31 Oct (commit 9c11e7c5)"
metadata:
  node_type: memory
  type: project
  originSessionId: a4b1caa3-be36-4d0f-b93c-ad692346256d
  modified: 2026-10-30T10:26:17.670Z
---

On 30 Oct 2026 the owner approved ("gas") 13 new public datasets for /direktori: APBD BTT + disaster spending per pemda (DJPK SIKD), e-Katalog LKPP disaster goods, Dana Desa for disasters, OCHA FTS per event, BAZNAS/LAZ Kemenag permits + AHU legal status (plus Kemensos PUB permits), LKPP blacklist, BNSP assessors/certificate holders + Basarnas rescuers, WHO EMT + INSARAG USAR Indonesia, Pos SAR/Tagana/KSB, PMI/MDMC/LPBI NU per kab, DJKI patents, BIMA/RIIM/Kedaireka grants, GARUDA journals/authors, Zenodo/Mendeley/GitHub, and a funding radar (open calls matched to experts).

Second batch approved same day: critical facilities (RS/puskesmas/sekolah/bandara/pelabuhan/Bulog/SPBU/BTS), Destana/SPAB/Forum PRB, road and bridge condition, satellite activations, post-disaster documents, ReliefWeb/HDX per event, PetaBencana reports, IRBI/IKD/SPM, Wikidata/ROR/ORCID cross IDs, and monthly auto-update for every new dataset (not built yet). Official data requests still needed (not public): Tagana/KSB (Kemensos PSKBA), PMI/MDMC/LPBI NU branch lists, Podes microdata, e-SPM.

Not chosen: realisasi tender LPSE, Retraction Watch, JDIH matrix, PROPER, DPR komisi, AHA DELSA, roster siaga, network analytics.

Already existed before (do not re-harvest): BTT 2024 in old scratchpad `wilayah_anggaran.json` (not shown on screen yet), FTS per donor country (`negara_donor`), 71 INSARAG teams (`respons_internasional`), SKKNI/LSP/357 trainers (`pelatih`), 614 grants (`hibah_riset`), ~210 LAZ, 80 PMI.

Harvest finished 30 Oct; durable copy at `~/direktori-panen/2026-10-30/` (rules ATURAN.md, scripts in skrip/), old /tmp data backed up to `~/direktori-panen/lama-a3a5d4c7/`, pre-upload R2 copies in `~/direktori-panen/cadangan-r2-2026-10-30/`.

Integrated 30 Oct via `scripts/akademisi/sambung_panen.mjs <panen> <r2 kini> <keluar>` then `hubung.mjs`: lembaga +275 (Pos SAR without guessed induk, PMI kab, LPBI NU, tim respons EMT/USAR/DVI, 55 e-Katalog vendors), hibah_riset +249, pendanaan +5 radar skema, new R2 files wilayah_daya / lembaga_ekstra / pakar_ekstra / kejadian_ekstra (allowlisted in src/akademisi.js), patents as graph nodes N:, 95 aliases in hubung ALIAS. Screen: Wilayah cards (fiscal, facilities, roads/SPAB), lembaga "Izin dan integritas", pakar Paten + ORCID, kejadian international trail. DJPK rows carry anggaran AND realisasi: keep separate. GARUDA authors barely overlap directory pakar (2 names): candidate new pakar, not enrichment. Not on screen yet: GitHub repos, Zenodo datasets, kampus ROR/Wikidata. Monthly auto-update (direktori-bulanan) NOT built. Hit: Refa Tech Solutions active LKPP blacklist. Live 31 Oct; another session later overwrote R2 lembaga.json and dropped the 275 additions, re-merged 31 Oct: always download fresh R2 inputs before re-running sambung_panen.

Wave 2 (31 Oct, commit d4e7c23c, harvest in `~/direktori-panen/2026-10-31/`): readiness score per kab (`kesiapanDaerah` in sambung_panen.mjs, percentiles of BTT/jiwa, faskes, lembaga, pakar; gap vs risk; quadrant map in Wilayah), region PDF, "Cocok mengajukan" on funding schemes, InaRISK IRBI per hazard (risk score, not pure hazard), GDACS (18 kejadian), ORARI/RAPI + Asperindo/INSA (name-only firms skipped), Basarnas fleet, LAZ/BAZNAS funds (only BAZNAS has a disaster line). Empty or blocked: Blue/Green Book (Bappenas DNS/403 from this Mac), PSC 119/ambulans/damkar (no national recap), Pooling Fund disbursements. Monthly workflow refreshes LKPP blacklist + CEMS and re-merges all panen files from R2 `akademisi/panen/`; weekly local task `radar-dana-direktori` (Mon 07:00) adds funding calls.

Wave 3 (31 Oct, commit e2d1be89): Wilayah "Kondisi terkini" card from own system files (prediksi besok, titik24 if under 12 h old, MAGMA level from abu_gunungapi, status_darurat); need index (BPS P0/air/sanitasi/IPM for 472 kab + IKP Bapanas 514) folded into readiness gap as "beban" = risiko + kebutuhan; SIMAS masjid/musala 503 kab; OSM damkar/helipad/titik kumpul (1,421 points, thin outside Java); theses per kampus (OAI-PMH, 12 kampus, strict title filter) in R2 `tesis`. Blocked or dropped: lansia/disabilitas per kab (BPS key), Dapodik (WAF), Kitabisa (Cloudflare), TJSL BUMN, SNI (only English titles from news), sirene tsunami (mixed-year counts), hibah RR (4 rows). lembaga_gabung.mjs had rejected 14 "tanggap-ormas" lembaga from another session, which broke the monthly dry run; fixed.

**Why:** owner wants the directory to show fiscal capacity vs risk, integrity flags, field capacity and funding.

**How to apply:** each new dataset needs a DATA_AKADEMISI entry in src/akademisi.js, a hubung.mjs link + test, and a screen section; coordinate with any other session editing public/akademisi.js. Apply the KPK/ACT exclusions ([[direktori-tanpa-kasus-kpk]]) and [[direktori-semua-terhubung]].

31 Okt malam: skor kesiapan diuji balik lawan dampak DIBI per kejadian (ujiKesiapan di sambung_panen.mjs, hasil di wilayah_daya.kesiapan.uji, dihitung ulang tiap bulan). Hasil: 474 kab, skor vs korban r -0,02, tidak lulus, layar berlabel Hipotesis. Kesenjangan hanya lemah (rumah rusak r 0,15). Perbaikan rumus berikutnya: uji per jenis bencana (banjir saja), jangan klaim skor tervalidasi sebelum lulus. Jadwal pengingat lokal ditolak auto mode; gantinya anotasi ::warning:: di direktori-bulanan.yml.

1 Nov 2026 gelombang 4 live (commit abbc675d, R2 backup cadangan/2026-11-01/): tesis 4.791 dari 17 kampus (OAI-PMH, harvester in session scratchpad tesis_panen.py; many repos 403), 139 international projects (WB/ADB/JICA/IATI via d-portal) merged into pendanaan with dedupe vs lembaga_3w, 19 UKRI grants into hibah_riset, Sentinel Asia activations linked to 23 big events, per-kab Indeks Desa 2024 / SPM Trantibumlinmas (not disaster-only, not in score) / Satu Data datasets / renkon+perda PB. Blocked: PDDikti (401), BRIN dataverse (robots), ACIAR/ADB site (403), Podes (BPS key), Destana/KSB/Tagana (no open national data). OpenAlex funder harvest per pakar pending quota reset (script panen2/skrip2/pendanaan.py).
