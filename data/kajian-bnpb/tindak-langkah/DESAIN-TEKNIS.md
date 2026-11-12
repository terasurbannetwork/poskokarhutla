# DESAIN-TEKNIS: Log tindak lanjut Usulan langkah

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `migrations/0128_dl_tindak.sql` | dua tabel + indeks, hanya `CREATE ... IF NOT EXISTS` | warga-api |
| `src/hak.js` | bagian "Dalops tindak lanjut": `dlTindakTerkini`, `dlTindakRiwayat`, `dlTindakLaju`, `dlStmtTindak`, `dlStmtTindakLog`, `dlNamaStaf` | warga-api |
| `src/dalops_tindak.js` | rute, validasi, hak | warga-api |
| `src/dalops.js` | `...RUTE_TINDAK` di `RUTE_DALOPS` | warga-api |
| `public/bnpb/dalops.js`, `public/bnpb/dalops.css` | tanda status, hitungan pita, dialog | ruang-bnpb |
| `tests/warga/dalops_tindak.test.mjs` | uji integrasi Miniflare | warga-api |
| `tests/warga/migrasi_beku.json` | sidik 0128 | warga-api |

## Skema (0128)

```sql
CREATE TABLE IF NOT EXISTS dl_tindak (
  kunci TEXT PRIMARY KEY CHECK (length(kunci) BETWEEN 10 AND 120),
  status TEXT NOT NULL CHECK (status IN ('belum','proses','selesai')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) <= 40), waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS dl_tindak_waktu ON dl_tindak(waktu);
CREATE TABLE IF NOT EXISTS dl_tindak_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 10 AND 120),
  status TEXT NOT NULL CHECK (status IN ('belum','proses','selesai')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  langkah TEXT CHECK (langkah IS NULL OR length(langkah) <= 400),
  oleh TEXT NOT NULL CHECK (length(oleh) <= 40), waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS dl_tindak_log_kunci ON dl_tindak_log(kunci, id);
CREATE INDEX IF NOT EXISTS dl_tindak_log_oleh ON dl_tindak_log(oleh, waktu);
```

## Rute

| Rute | Hak | Isi |
| --- | --- | --- |
| `GET /api/dalops/tindak` | `modAtauStaf(PERAN_DALOPS)` | `{boleh_tulis, butir: [{kunci, status, catatan, waktu, oleh_nama}]}`, 60 hari, maks 2000 |
| `GET /api/dalops/tindak/riwayat?kunci=` | sama | `[{waktu, status, catatan, langkah, oleh_nama}]` terbaru dulu, maks 100 |
| `POST /api/dalops/tindak` | `modOK` atau `stafPeran(["pusdalops","koordalops"])` + `dalamWilayahStaf` | `{kunci, status, catatan?, langkah?}` -> 201 `{ok, kunci, status, waktu}` |

Semua jawaban `cache-control: private, no-store`. Tabel 0128 belum ada: 503 dengan pesan migrasi.
