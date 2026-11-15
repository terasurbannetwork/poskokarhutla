# DESAIN-TEKNIS: Misi Udara

Otoritas: `KEPUTUSAN-MISI.md`. Pemilik berkas dicek dengan `node scripts/agents/ilmu.mjs pemilik <berkas>` sebelum disentuh.

## 1. Berkas

| Berkas | Isi | Pemilik | Tahap |
| ------ | --- | ------- | ----- |
| `scripts/umum/misi_udara.py` | mesin: baca titik, rute tetap, templat misi, belokan, daya tahan, pola cari; subperintah `buat`, `uji` | `pipa-umum` | 1 |
| `scripts/umum/zona_terbang.py` | pembentuk zona dari data tiap bencana, pemeriksa ruas lawan zona, kelayakan terbang | `pipa-umum` | 1 |
| `scripts/umum/batas_terbang.json` | angka batas dan tabel tipe helikopter, tiap baris bersumber (D5) | `pipa-umum` | 1 |
| `scripts/umum/misi_templat.json` | bidang isian, waktu di titik, dan daftar periksa per jenis misi dan per bencana | `pipa-umum` | 1 |
| `scripts/umum/renlap_keluaran.py` | KML, GPX, teks WA, PDF bersama (tiket Paritas PB-13); Misi Udara menambah halaman misi dan tabel zona | `pipa-umum` | 1 |
| `scripts/operasi/renlap_banjir.py` | `rencana` dan `susun_tetap` dipindah lalu dihapus (D9) | `pipa-data` | 1 |
| `tests/agen/gerbang-misi-udara.test.mjs` | menjalankan `python3 -I scripts/umum/misi_udara.py uji` dan memeriksa keluaran | `penulis-gerbang` | 1 |
| `scripts/wa/misi_udara.mjs` | pengurai pesan permintaan dan pengirim PDF | `wa-bot` | 2 |
| `migrations/<nomor berikut>_pb_misi.sql` | tabel `pb_misi` dan `pb_misi_hasil` | `warga-api` | 2 |
| `src/pb_misi.js` | rute `/api/pb/misi*`, hak di `src/hak.js` | `warga-api` | 2 |
| `public/inti/misi_udara.js`, `public/inti/misi_udara.css` | formulir, pratinjau peta, unduh | `inti-layar` | 3 |
| `public/operasi_laporan.js` | satu seksi Misi udara yang memanggil komponen inti | `layar-peta` | 3 |

Tidak ada folder baru di `public/` atau `scripts/`.

## 2. Ketergantungan pada Paritas

| Tiket Paritas | Yang dipakai | Bila belum selesai |
| ------------- | ------------ | ------------------ |
| PB-13 `scripts/umum/renlap.py`, `renlap_keluaran.py` | fungsi keluaran dan geometri bersama | per 15 Nov kedua berkas sudah ada di folder kerja (belum di-commit) dan `renlap_keluaran.py` sudah memuat `kml`, `gpx`, `teks`, `cari_chrome`, `ke_pdf`; fungsi peta (`bingkai`, `svg_rute`, `penanda`) masih di `scripts/operasi/renlap_pdf.py` dan diimpor dari sana sampai PB-13 memindahnya |
| PB-12, PB-14 pola pemicu workflow, HMAC, R2 tulis sekali | pola ditiru, tabelnya tidak dipakai | tahap 2 menunggu polanya ada |
| PB-15 hapus `renlap_banjir.py` | – | MU-03 hanya memindah lalu menghapus dua fungsi `rencana` dan `susun_tetap`; berkasnya dihapus PB-15. Bila PB-15 jalan lebih dulu, dua fungsi itu dipindah ke `misi_udara.py` di PB-15 tanpa ubah perilaku |
| PB-18 `public/inti/renlap.js` | kartu daftar flight plan | tahap 3 menunggu |

## 3. Antarmuka perintah baris (tahap 1)

```
python3 -I scripts/umum/misi_udara.py buat --bencana banjir --misi dropping \
  --base "WIMK|Lanud Soewondo|3.5589|98.6719" \
  --titik "Lapangan SMPN 2 Sultan Daulat|2.7843, 97.8936|darat=30" \
  --titik "Pandan|https://maps.app.goo.gl/...|menyusul" \
  [--tipe AW139] [--kecepatan 200] [--berangkat 2026-11-16T07:00+07:00] [--zona zona_manual.json] [--keluar DIR]
python3 -I scripts/umum/misi_udara.py uji
```

`--base` juga menerima kode dari `public/data/udara.json` (ICAO atau id). Bawaan `--keluar`: `~/Documents/Laporan-Harian-BNPB/misi-udara/<tanggal>/`
(di luar repo, D7). Untuk misi selain `kunjungan`, `--keluar` boleh menunjuk `data/laporan-bnpb/paparan/`.

## 4. Bentuk JSON keluaran

```json
{"versi": 1, "bencana": "banjir", "misi": "dropping", "dibuat": "2026-11-15T17:40:00+07:00",
 "status": "tidak memotong zona yang diketahui",
 "base": {"kode": "WIMK", "nama": "Lanud Soewondo", "lat": 3.5589, "lon": 98.6719},
 "tipe": null, "kecepatan_kmj": 200,
 "titik": [{"urut": 1, "nama": "...", "lat": 2.7843, "lon": 97.8936, "peran": "darat", "menyusul": false, "di_titik_mnt": 30}],
 "leg": [{"no": 1, "dari": "WIMK", "ke": "T1", "haluan": 225, "km": 122.1, "nm": 65.9, "mnt": 36.6, "belokan": null}],
 "total": {"km": 491, "nm": 265, "terbang_mnt": 147, "di_titik_mnt": 30},
 "zona": [{"id": "ga-sinabung", "bencana": "gunungapi", "tingkat": "larangan", "hasil": "tidak terpotong", "jarak_km": 41, "sumber": "PVMBG lewat MAGMA", "waktu_data": "..."}],
 "tidak_diperiksa": [{"sumber": "cuaca_metar.json", "alasan": "basi sejak ..."}],
 "daya_tahan": {"hasil": "daya tahan tipe belum ada datanya"},
 "sementara": ["Q3", "Q4"]}
```

Tanpa nama orang di bidang mana pun. `sementara` memuat Q yang bawaannya dipakai, dan dicetak di kaki PDF.

## 5. PDF

Tiga halaman tetap ditambah satu per titik darat bila diminta:

1. Peta rute di atas citra, zona larangan digambar (lingkaran merah transparan, poligon bergaris), tabel urutan titik, empat angka ringkas.
2. Tabel leg untuk pilot: koordinat tujuan DMS dan desimal, haluan sejati, km, NM, menit; baris belokan diberi tanda.
3. Pemeriksaan dan daftar periksa: tabel zona (hasil, sumber, jam data), baris "tidak diperiksa", kelayakan terbang, daya tahan, daftar periksa misi, daftar yang perlu diputuskan.

Dicetak dengan Chrome headless seperti `renlap_pdf.py` (ini PDF kerja lapangan, bukan deck; deck tetap lewat skill `ppt-konsultan`).

## 6. Penyimpanan (tahap 2)

Flight plan misi tidak disimpan di `pb_renlap`: tabel itu satu renlap per bencana, provinsi, dan tanggal (kunci unik Paritas), sedangkan
flight plan bisa melintasi provinsi dan ada beberapa per hari. Misi Udara punya dua tabel samping sendiri dan awalan R2 sendiri.

```sql
CREATE TABLE IF NOT EXISTS pb_misi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  rencana TEXT NOT NULL CHECK (length(rencana) = 16),
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla','banjir','longsor','pesisir','cuaca','udara','kekeringan','gempa','gunungapi')),
  misi TEXT NOT NULL CHECK (misi IN ('dropping','pantau','evakuasi','angkut','cari','kunjungan')),
  tanggal TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('diminta','terbit','gagal','dibatalkan')),
  status_zona TEXT CHECK (status_zona IN ('tidak_memotong','dibelokkan','perlu_diputuskan','ditolak')),
  tipe TEXT, total_km REAL, terbang_mnt REAL,
  dibuat TEXT NOT NULL,
  UNIQUE (rencana, versi)
);
CREATE INDEX IF NOT EXISTS pb_misi_tgl ON pb_misi (tanggal, misi);
CREATE TABLE IF NOT EXISTS pb_misi_hasil (
  misi_id TEXT PRIMARY KEY,
  hasil TEXT NOT NULL CHECK (hasil IN ('terlaksana','sebagian','batal')),
  alasan TEXT, muatan_kg REAL, orang INTEGER, catatan TEXT,
  dicatat TEXT NOT NULL
);
```

`rencana` menyatukan versi dari flight plan yang sama (F-3: titik menyusul lalu dibuat ulang); flight plan lain di hari yang sama punya `rencana` lain.
Tanpa kolom nama orang; `catatan` dan `alasan` dibatasi panjangnya dan ditolak bila memuat pola nomor telepon atau NIK (pola penyaring yang sudah ada di `src/`).
Hanya `CREATE ... IF NOT EXISTS`; tabel Paritas (`pb_renlap`, `pb_renlap_hasil`) tidak disentuh dan tidak dipakai.
Berkas di R2: `operasi/misi/<tanggal>/<id>/` berisi `misi.json`, PDF, KML, GPX, teks; ditulis sekali. Awalan ini terpisah dari
`operasi/renlap/` supaya rute baca renlap Paritas tidak bisa membuka flight plan misi, termasuk jenis `kunjungan`.
Semua kueri lewat `src/hak.js`, tiap kueri diuji `EXPLAIN`. Nomor migrasi diambil saat tiket dikerjakan (nomor berikut yang kosong), ditinjau `migrasi-idempoten`.

## 7. Rute (tahap 2)

| Rute | Metode | Hak | Isi |
| ---- | ------ | --- | --- |
| `/api/pb/misi` | POST | `pusdalops` (Q10) | permintaan: `bencana`, `misi`, `tanggal`, `base`, `titik[]` (koordinat saja, bukan tautan), `tipe?`, `zona_manual[]?`, `rencana?` untuk versi berikut; membuat baris `diminta` dan memicu workflow |
| `/api/pb/misi/selesai` | POST | tanda tangan HMAC dari workflow | menulis berkas ke R2 dan mengubah status ke `terbit` atau `gagal` |
| `/api/pb/misi` | GET | baca `/api/operasi/peta`; jenis `kunjungan` hanya `pusdalops` | daftar per tanggal dan bencana |
| `/api/pb/misi/berkas` | GET | sama | PDF, KML, GPX dari R2 |
| `/api/pb/misi/hasil` | POST | `pusdalops` (Q10) | catat hasil (F-15) |
| `/api/pb/misi/zona` | GET | sama dengan GET daftar | zona yang berlaku sekarang untuk pratinjau layar |

Pola pemicu workflow dan tanda tangan HMAC meniru rute renlap Paritas (PB-12, PB-14) tanpa memakai tabelnya. Worker tidak menghitung rute dan
tidak membuka tautan pendek (Q11): layar hanya mengirim koordinat.

## 8. Kuota baca D1

Daftar flight plan dibaca dengan indeks `(tanggal, misi)` dan batas 50 baris; tidak ada cron baru. Zona dibaca dari berkas statis,
bukan D1.

## 9. Keputusan arsitektur

| ADR | Keputusan | Alasan |
| --- | --------- | ------ |
| 1 | Zona dibentuk saat flight plan dibuat, tidak disimpan sebagai lapisan sendiri | data sumbernya sudah ada di `public/`; lapisan kedua bisa basi sendiri |
| 2 | Belokan hanya untuk lingkaran | satu-satunya zona resmi berbentuk pasti; poligon diserahkan ke orang |
| 3 | Kelayakan terbang ditulis ulang di Python dengan kasus uji bersama, rumus JS tidak diubah | layar Operasi Udara tidak boleh mundur; kasus uji bersama menjaga keduanya sama |
| 4 | Keluaran bawaan di luar repo | repo publik (D7) |
