# RISET: apa yang sudah ada di repo

## Prakiraan
- `scripts/prediksi/catat.py` membekukan prakiraan harian per kab (514, kode 4 digit Kepmendagri) untuk H+1 sampai H+3, append-only di `public/prediksi/data/arsip/<bulan>.jsonl`.
- `BNJ` dan `LSR` diambil dari `public/banjir/data/status.json` (level maksimum kecamatan di kab), sumber yang sama dengan prakiraan yang sekarang dibaca Dalops. Mengganti sumber Dalops ke `prediksi.json` tidak mengubah level banjir dan longsor.
- `terbit.py` menulis `prediksi.json` (tiga hari ke depan) dan `lalu.json` (prakiraan H+1 untuk hari-hari lampau, per kode per kab).
- `nilai.py` menilai prakiraan yang sudah matang lawan pengamatan: HJN (ERA5), API (FIRMS), BNJ dan LSR (DIBI, telat sekitar 14 hari). Baseline persistensi dan klimatologi wajib.
- `konfirmasi.py` menarik `GET /api/prediksi/konfirmasi` (regu, warga, groundcheck); aturan: regu = label, warga = positif lemah, groundcheck = audit.

## Kejadian
- `scripts/data/dalops_banjir.py` merakit kejadian per jenis dari logbook Pusdalops (privat, tidak di git) ke R2 `dalops/<jenis>.json`, disajikan `src/dalops.js` hanya untuk sesi staf. Tiap kejadian membawa `kab_kode`, `mulai`, `terakhir`, `surut`.
- `public/bnpb/dalops.js` sudah punya prakiraan tiga hari untuk banjir dan longsor (dari `status.json`); jenis lain `pra: false`.
- Lapor Bencana (`migrations/0155_lapor_ai.sql`): `lapor_sesi` membawa `jenis`, `tingkat` (warga, bpbd), `kab`, `lat`, `lon`; `lapor_tiket` membawa status; hasil periksa BPBD `valid`, `sebagian`, `tidak_valid` (`src/lapor_periksa.js`).
- Buku Besar Kejadian (`scripts/siklus/pasang.py`) adalah satu-satunya pencocok kejadian. Paket ini tidak membuat kejadian dan tidak mencocokkan kejadian antar sumber; ia hanya memeriksa ada atau tidaknya laporan per kab, tanggal, jenis.

## Praktik
- Verifikasi peringatan dini lazim memakai tabel kontingensi (hit, miss, false alarm, correct negative) dengan jendela waktu toleransi. Paket ini memakai bentuk yang sama tetapi menamai "false alarm" sebagai "belum ada laporan" karena label negatif dari laporan tidak bisa dipercaya.
