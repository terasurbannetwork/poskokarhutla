# RISET: Laporan Bulanan

Riset dilakukan 12 Nov 2026 di repo ini dan pada contoh Laporan Bencana Oktober 2026 (PDF A4, 25 halaman). Tujuannya satu: untuk tiap angka di contoh, apakah sistem kita sudah menghitungnya, dan dari mana.

## 1. Bentuk contoh Oktober 2026

Sampul berfoto, daftar isi, Ringkasan Eksekutif (4 kartu angka, 4 temuan, dukungan yang dimohon), Bab 1 sampai 7, Lampiran. Tiap bab bencana berpola sama: sebaran (peta, tabel), riwayat (grafik bulanan), dampak (kartu angka), action plan tiga kolom, dokumentasi foto. 10 tabel, 11 gambar, 5 peta. Tiap tabel dan gambar punya baris sumber dengan tanggal tarik.

Catatan dari contoh yang menjadi pertanyaan pemilik (KEPUTUSAN):

- Gelar Kepala BNPB berbeda dengan catatan pemilik (dijawab K3).
- Huruf kapital di pil dan kepala tabel (Q5).
- Foto dari media (Q7).
- Model hujan "CHIRPS, NOAA RONI, DMI" per wilayah: ditemukan di `scripts/umum/iklim_outlook.py` (K6).
- Angka Oktober 2025 diambil dari surat, bukan DIBI (Q3).

## 2. Kebutuhan data lawan sumber yang ada

| Kebutuhan (bab) | Sumber di repo | Jadwal | Status |
| --- | --- | --- | --- |
| Kejadian dan dampak per hari, kab, jenis (1, 3, 4, 5, Lampiran) | `scripts/umum/dibi_kejadian.py` ke `public/data/dibi_kejadian.json`: satu baris per hari x kab x jenis dengan kolom `kejadian` (banyak kejadian); nama jenis mentah DIBI (31 nama, termasuk jenis bukan bencana alam, perlu peta jenis, ALGORITMA 2); kolom meninggal, hilang, luka, terdampak, mengungsi, rumah rusak berat/sedang/ringan, terendam, fasilitas | `data.yml` harian | Ada, jendela 365 hari |
| Bulan yang sama tahun lalu (1.2) | lapis bersih Siklus R2 `siklus/bersih/dibi/<YYYY>.jsonl.gz` (`scripts/siklus/bersih_dibi.py`); tahunan per kab `public/data/bnpb/dibi_kab_tahun.json` (2015 sampai 2025, tanpa bulan) | `siklus.yml` `riwayat` (dispatch) | Sebagian: perlu dibaca dari R2 |
| Hotspot, luas terbakar, belum padam per provinsi per hari (2.1, 2.2) | `scripts/data/peta_karhutla.py` ke `public/data/peta_karhutla.json`: `prov[kode]` dengan deret harian `hot`, `luas`, `belum`, `padam` (tahun berjalan; 312 hari pada 8 Nov 2026). `titik_tahun.json` (prov x bulan) juga ada tetapi hanya tahun berjalan | `titik.yml` 3 jam | Ada; potongan harian disimpan supaya laporan Desember yang disusun Januari tetap punya deret |
| Laporan daerah lawan satelit (2.3) | `dibi_kejadian.json` jenis karhutla; `public/data/bnpb/rekonsiliasi_dalops_dibi.json` | `data.yml` | Ada |
| Status surut per kab (3.1) | `scripts/data/dalops_banjir.py` (`surut()`) ke R2 privat `dalops/banjir.json`, disajikan `src/dalops.js`; kode kab beda bentuk dengan DIBI (`73.17`), perlu dinormalkan | manual di mesin pemilik, hanya 30 hari terakhir | Sebagian: privat, manual, perlu potongan harian |
| Cuaca ekstrem dan kekeringan per kab (4.1) | DIBI (di atas); `scripts/kekeringan/status.py` ke `public/data/kekeringan_*.json` | `lintas.yml` | Ada |
| Hujan tiga bulan ke depan (4.4), indeks ENSO (7.1) | `scripts/umum/iklim_outlook.py` ke `public/data/iklim_outlook.json`: CHIRPS v2.0, RONI NOAA CPC, DMI NOAA PSL, OLS per wilayah dengan uji balik leave-one-out; wilayah sama dengan Gambar 9 contoh. Juga `kekeringan_prakiraan.json` (ECMWF SEAS5) dan `outlook12.json` | `data.yml` tiap Senin | Ada (K6) |
| Gempa per peristiwa (5.1) | `scripts/gempa/*` ke `public/gempa/data/*` | `gempa.yml` | Ada |
| Status gunung api per tanggal (5.1) | `scripts/gunungapi/magma.py` ke `public/gunungapi/data/gunung.json`, `perubahan_level.json`, `riwayat_level.json` | `titik.yml`, `lintas.yml` | Ada; status "per 1 bulan berikutnya" ditangkap rakit tanggal 1 |
| Kegiatan BNPB dan tautan (6, Lampiran) | belum ada panen siaran pers bnpb.go.id; `scripts/data/berita.py` hanya Google News karhutla | | Tidak ada (Q16) |
| Kartu operasi: personel, armada, OMC, garam (2.4) | `omc_arsip.json`, `logbook_omc.json`, rekap manual `data/laporan-bnpb/omc-rekap/` | sebagian manual | Sebagian (Q15) |
| Peluang banjir dan longsor bulan depan per kab (7.1) | `public/data/logbook_riwayat.json` (kab x jenis x bulan per tahun, `tahun_penuh` 2014 sampai 2020, 2024, 2025, dibangun `scripts/data/logbook_bersih.py`); `outlook12.json`. Modul `/prediksi` tidak cocok: produknya +1 sampai +3 hari | diperbarui manual | Sebagian: data ada, hitungan peluang bulan depan per kab belum ada (Q12) |

## 3. Layar yang ada: `/laporan_bnpb`

- `public/laporan_bnpb.html` dan `laporan_bnpb.js` (pemilik `layar-peta`), dua jenis: `harian` (empat keluaran: laporan harian, konferensi pers, Matador, naskah jubir) dan `presiden`.
- Simpan: `GET/POST /api/laporan-bnpb` (`src/laporan_bnpb.js`, wajib admin; pemirsa bertab pusdalops hanya GET), tabel D1 `laporan_bnpb (jenis, tanggal, isi, diubah, oleh)`, `CHECK (jenis IN ('harian','presiden'))`, CHECK isi 128 KB tetapi rute membatasi 96 KB (`MAKS_ISI` 98.304), satu baris per (jenis, tanggal) dan ditimpa. Gerbang: `adminOK` (`src/worker.js`) dan `pemirsaLihat` (`src/staf.js`, daftar `IZIN_PEMIRSA_PUSDALOPS`). Pemeriksaan host di `src/worker.js` hanya menjaga halaman HTML; rute API dilayani di alamat mana pun.
- PPTX dan PDF dibuat di klien (pptxgenjs 3.12, jsPDF 2.5.1 dari CDN). Draf di localStorage.
- Arsip: `public/arsip_laporan.js` membaca daftar harian.

Akibat untuk rancangan:

1. Tabel `laporan_bnpb` tidak cocok untuk bulanan: CHECK jenis menolak `bulanan` (mengubahnya berarti membangun ulang tabel), barisnya ditimpa (berlawanan dengan D3), dan 96 KB terlalu kecil untuk berkas angka. Maka tabel baru khusus versi bulanan, berkas angka di R2.
2. Pola gerbang admin, pembersih isian `bersihIsi`, dan pemilih jenis di layar dipakai ulang.
3. Pola cetak A4 `window.print()` sudah ada di `/bnpb/dokumen` (`public/bnpb/dokumen.js`, CSS A4).

## 4. Penulis R2 dari Actions

`scripts/siklus/gudang.py` menulis R2 lewat biner `wrangler@4.42.0` dengan rahasia `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` yang sudah ada di repo. Rakit bulanan memakai fungsi `put/get` yang sama (diimpor, bukan disalin).

## 5. Kesimpulan riset

Sekitar dua pertiga angka contoh bisa dirakit dari berkas yang sudah dihitung tiap hari. Celah: bulan yang sama tahun lalu (baca R2 Siklus), status surut (privat, perlu ditangkap harian), siaran pers (panen baru, Q16), model hujan per wilayah (Q14), peluang bulan depan (Q12), kartu operasi (Q15).
