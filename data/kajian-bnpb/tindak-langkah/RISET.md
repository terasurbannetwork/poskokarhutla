# RISET: Log tindak lanjut Usulan langkah

## Kode repo yang dipakai ulang

| Kebutuhan | Yang sudah ada | Dipakai bagaimana |
| --- | --- | --- |
| Isian staf dengan jejak siapa dan kapan | `src/operasi_isian.js` + tabel `op_isian`, `op_isian_log` (migrasi 0126) | Pola pengisi `staf:<id>` / `admin:<hash>`, batas laju dari tabel log, pembungkus 503 bila tabel belum ada |
| Hak baca layar Dalops | `modAtauStaf(env, req, PERAN_DALOPS)` di `src/staf.js` | Sama dengan `/api/dalops/<jenis>` |
| Hak tulis | `modOK` (`src/posko.js`), `stafPeran`, `dalamWilayahStaf` (`src/staf.js`) | Sama dengan isian Operasi Udara |
| SQL di satu pintu | `src/hak.js` (bagian Operasi isian) | Fungsi bernama per pernyataan |
| Uji integrasi | `tests/warga/_bnpb.mjs` (`siapkan`, Miniflare + D1 sungguhan) | `tests/warga/dalops_tindak.test.mjs` |
| Daftar langkah | `H.mitigasi()` di `public/bnpb/dalops_hitung.js`; layar `bagianMitigasi()` di `public/bnpb/dalops.js` | Kunci langkah dibentuk di layar dari `kab_kode` dan label jenis langkah |

## Praktik lazim

Daftar tindak lanjut di pusat pengendalian operasi umumnya berupa action log: tiap butir punya pemilik, status, waktu pembaruan terakhir, dan riwayat yang tidak bisa diubah. Pola yang sama dipakai di ICS (Incident Command System) formulir ICS-214 Activity Log: catatan kegiatan berurutan waktu per unit. Fase ini hanya memakai status dan catatan, tanpa penugasan ke orang tertentu.
