# DESAIN-TEKNIS: tindakan lapangan per bencana

## 1. Berkas dan pemilik

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `public/bencana.json` | kunci puncak `tindakan` {kode: label}; `kemampuan.tindakan` per entri; longsor `operasi: true` | `inti-layar` |
| `scripts/umum/bencana.py` | tuple `TINDAKAN`, validasi katalog dan `kemampuan.tindakan`; generator ikut membawa kunci baru | `pipa-umum` |
| `src/bencana.generated.js` | dibangkitkan `python3 scripts/umum/bencana.py js` | (bangkitan) |
| `scripts/data/logbook_tindakan.py` | hitung persen, subperintah `uji` | `pipa-data` |
| `public/data/bnpb/logbook_tindakan.json` | keluaran agregat | `pipa-data` |
| `migrations/0153_pb_renlap_tindakan.sql` | tabel samping | `warga-api` |
| `src/hak.js` | `PB_SQL_TINDAKAN_HASIL`, `pbStmtTindakanHasil*`, `pbPerTindakan`, `MATRIKS` | `warga-api` |
| `src/pb_isian.js` | validasi `tindakan` di `hasil`, `per_tindakan` di `kepatuhan` | `warga-api` |
| `public/inti/renlap.js`, `public/inti/renlap.css` | kartu Tindakan, kolom Tindakan, rekap | `inti-layar` |
| `public/operasi_laporan.js` | meneruskan `tindakan` dan katalog ke `PbRenlap.pasang` | `layar-peta` |

## 2. Registri

```json
{"versi": 1, "tindakan": {"kaji_cepat": "Kaji cepat dan pendataan", "...": "..."}, "bencana": [{"id": "longsor", "kemampuan": {"operasi": true, "tindakan": ["kaji_cepat", "pembersihan", "..."], "...": "..."}}]}
```

`periksa()`: kunci `tindakan` puncak = objek, kuncinya sama persis dengan `TINDAKAN` (urutan diabaikan), label string tak kosong tanpa em dash; `kemampuan.tindakan` list wajib di tiap entri, tiap kode ada di katalog, tanpa ganda; entri dengan `operasi: false` wajib `tindakan: []`.

## 3. Migrasi 0153

```sql
CREATE TABLE IF NOT EXISTS pb_renlap_tindakan (
  renlap_id TEXT NOT NULL REFERENCES pb_renlap (id) ON DELETE CASCADE,
  target_no INTEGER NOT NULL CHECK (target_no BETWEEN 1 AND 500),
  tindakan TEXT NOT NULL CHECK (length(tindakan) BETWEEN 2 AND 30 AND tindakan NOT GLOB '*[^a-z_]*'),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL,
  PRIMARY KEY (renlap_id, target_no, tindakan));
```

Kode tidak dikunci dengan daftar di CHECK (Paritas D13: CHECK berdaftar tidak bisa diubah tanpa membangun ulang tabel). Daftar dijaga Worker dari registri. Tidak ada indeks tambahan: kueri rekap lewat `pb_renlap_tanggal` lalu PK.

## 4. Rute

`POST /api/pb/hasil` (sudah ada): tiap butir boleh membawa `tindakan` (ALGORITMA 4). Satu batch: upsert hasil, satu `DELETE ... WHERE renlap_id = ?1 AND target_no IN (SELECT value FROM json_each(?2))` untuk semua butir bertindakan, satu `INSERT ... SELECT ... FROM json_each(?2)` untuk semua pasangan [target_no, kode], lalu satu `pb_log` (tabel `pb_renlap_hasil`, sesudah `{butir, didatangi, tindakan: <jumlah kode>}`). Bila batch gagal karena `pb_renlap_tindakan` belum ada: ulang tanpa pernyataan tindakan, jawab `{ok: true, butir, tindakan: false, pesan}`.

`GET /api/pb/kepatuhan` (sudah ada): tambahan kueri `SELECT t.tindakan, count(*) n FROM pb_renlap r JOIN pb_renlap_tindakan t ON t.renlap_id = r.id WHERE <saringan sama dengan rinci, hanya versi terbaru terbit/selesai> GROUP BY t.tindakan`, dijalankan terpisah; tabel tak ada = `per_tindakan` tidak dikirim.

## 5. Layar

`PbRenlap.pasang(host, {bencana, tindakan: [[kode, label], ...], logbook})`. `operasi_laporan.js` membaca katalog dari `/bencana.json` yang sudah diambil, dan `logbook_tindakan.json` diambil `renlap.js` sendiri sekali per muat (gagal = kolom persen "tidak tercatat").
