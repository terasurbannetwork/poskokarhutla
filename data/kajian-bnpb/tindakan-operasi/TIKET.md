# TIKET: tindakan lapangan per bencana (TO-*)

| Tiket | Cakupan | Pengerja → pemeriksa | Bukti |
| --- | --- | --- | --- |
| TO-01 | `scripts/data/logbook_tindakan.py` (POLA, hitung, `uji`), `public/data/bnpb/logbook_tindakan.json` | `pipa-data` | `python3 -I scripts/data/logbook_tindakan.py uji` |
| TO-02 | Katalog `tindakan` dan `kemampuan.tindakan` di `public/bencana.json`, `TINDAKAN` dan validasi di `scripts/umum/bencana.py`, bangkitkan `src/bencana.generated.js`; longsor `operasi: true` dengan sarana dan bobot (D8) | `inti-layar` + `pipa-umum` → `validasi-model` (bobot longsor hipotesis tetap berlabel) | `python3 -I scripts/umum/bencana.py uji` |
| TO-03 | `migrations/0153_pb_renlap_tindakan.sql` | `warga-api` → `migrasi-idempoten` | migrasi dua kali di uji |
| TO-04 | `src/hak.js`, `src/pb_isian.js` (`hasil` dan `kepatuhan`), `tests/warga/pb_hasil.test.mjs` | `warga-api` → `guard-api`, `security-reviewer` | `node --test tests/warga/pb_hasil.test.mjs` |
| TO-05 | `public/inti/renlap.js`, `public/inti/renlap.css`, `public/operasi_laporan.js`, `tests/layar/pb_renlap.test.mjs` | `inti-layar` + `layar-peta` → `selera-angka`, `inp-reviewer` | `node --test tests/layar/pb_renlap.test.mjs` |
| TO-06 | Jumlah per tindakan (orang, liter, unit): menunggu Q4 | - | - |
| TO-07 | Penutup: gerbang repo, tinjau lokal `http://localhost:8800/operasi`, pemilik menerapkan migrasi 0153 di produksi | sesi induk → `higiene-repo` | `npm run uji:agen` |

Urutan: TO-01 dan TO-02 bebas satu sama lain; TO-03 sebelum TO-04; TO-05 sesudah TO-02 dan TO-04 (kontrak rute).
