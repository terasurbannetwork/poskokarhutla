# TIKET: Log tindak lanjut Usulan langkah

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| TL-01 | `migrations/0128_dl_tindak.sql` + sidik di `tests/warga/migrasi_beku.json` | warga-api | `node --test tests/warga/migrasi_beku.test.mjs` | - |
| TL-02 | Fungsi SQL bagian Dalops tindak lanjut di `src/hak.js` | warga-api | `gerbang-d1`, `gerbang-d1-pindai` | TL-01 |
| TL-03 | `src/dalops_tindak.js` rute GET terkini, GET riwayat, POST; daftarkan di `RUTE_DALOPS` | warga-api | T1-T10 | TL-02 |
| TL-04 | `tests/warga/dalops_tindak.test.mjs` | warga-api | T1-T11 hijau | TL-03 |
| TL-05 | Layar: tanda status per langkah, hitungan pita | ruang-bnpb | tinjau lokal | TL-03 |
| TL-06 | Layar: dialog status, catatan, riwayat; baca-saja | ruang-bnpb | tinjau lokal; `inp-reviewer` | TL-05 |
| TL-07 | Pemilik menerapkan 0128 di D1 produksi | pemilik | `wrangler d1 migrations apply` | TL-01 |
| TL-08 | Bukti foto atau tautan (Q6) | - | - | Q6 |
