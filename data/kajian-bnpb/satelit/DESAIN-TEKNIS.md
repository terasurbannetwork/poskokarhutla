# DESAIN-TEKNIS: Pemantauan satelit

## 1. Berkas dan pemilik

Pemilik dicek dengan `node scripts/agents/ilmu.mjs pemilik <berkas>` (25 Nov 2026). Folder baru: tidak ada (D2).

| Berkas | Perubahan | Pemilik |
| --- | --- | --- |
| `scripts/data/himawari.py` | tulis `status_sumber` dan `sejak` ke R2 saat gagal sambung (bukan diam); coba `ftplib.FTP_TLS` (FTPS eksplisit 21, implisit 990 lewat subkelas kecil `ssl`) sebelum FTP polos | `pipa-data` |
| `src/himawari.js`, bagian status di `src/worker.js` | `/api/status` dan `/api/himawari` membawa `status_sumber`, ambang ALUR 3 | `warga-api` |
| `public/inti/satelit.js`, `public/inti/satelit.css` (baru) | kartu Satelit, pil status sumber, pembaca `gerbang.js` gagal-tertutup | `inti-layar` |
| `scripts/umum/himawari_pindai.py` (baru) | pemindai bersama: daftar pindaian S3, unduh 6 kanal x 4 segmen, kisi, geometri matahari dan satelit, panggil detektor, tulis keluaran; mode `uji`, `jalan --pindai`, `ukur` | `pipa-umum` |
| `scripts/udara/awan_himawari.py` | tidak diubah; fungsi `baca_segmen`, `tb`, `proyeksi` diimpor pemindai lewat `importlib` (pola `_muat` di `label_dalops.py`) | `cuaca-udara` |
| `scripts/data/api_himawari.py` (baru) + `api_himawari.kriteria.json`, `api_himawari.sidik` | detektor api kontekstual (ALGORITMA 1), `penanda` diimpor dari `himawari.py`; mode `uji`, `prasyarat`, `vonis` | `pipa-data` (+ `validasi-model`) |
| `scripts/gunungapi/abu_satelit.py` (baru) + kriteria, sidik | detektor abu (ALGORITMA 2); label dari `arsip_magma.py` | `gunungapi-kering` (+ `validasi-model`) |
| `scripts/udara/awan_tumbuh.py` | mode 10 menit, puncak tembus, paralaks (ALGORITMA 3); definisi 30 menit tetap dihitung | `cuaca-udara` (+ `validasi-model`) |
| `scripts/gunungapi/kawah.py` (baru), `scripts/gunungapi/so2.py` (baru) + kriteria, sidik | FIRMS 5 km kawah (kunci `FIRMS_MAP_KEY`, pola `firms.py`); SO2 TROPOMI OFFL lewat fungsi OPeNDAP `tropomi.py` yang diimpor | `gunungapi-kering` |
| `scripts/banjir/genangan_harian.py` (baru) | baris harian per kab aktif dari `genangan_nasional.hitung_pasangan` (ALGORITMA 5); tanpa pembaca GFM kedua | `banjir` |
| `scripts/kekeringan/vhi.py` (baru) | baca VHI NOAA STAR (Q9), rerata per kab per minggu | `gunungapi-kering` |
| `scripts/udara/asap_aod.py` (baru) | AI per kab per hari dari keluaran `tropomi.py`, skor lawan PM2.5 | `cuaca-udara` |
| `public/data/gerbang/satelit.json` (baru) | satu entri per detektor dan versi kriteria, ditulis lewat `scripts/umum/gerbang.py` | ditulis detektor masing-masing; berkas didaftarkan ke `pipa-umum` di ST-00 |
| `src/satelit_picu.js` (baru), satu baris di cron `src/worker.js` | cek pindaian S3 dan dispatch `satelit.yml` (bagian 3) | `warga-api` (+ `guard-api`, `security-reviewer`) |
| `src/alarm_himawari.js` | terima sumber `l1b` hanya bila entri gerbang `api_himawari` `boleh_tampil` dan vonis prospektif `lolos` | `warga-api` |
| `migrations/<nomor>_alarm_himawari_sumber.sql` | `alarm_himawari` tambah kolom `sumber TEXT NOT NULL DEFAULT 'wlf'`; nomor dipilih saat tiket | `warga-api` (+ `migrasi-idempoten`) |
| `.github/workflows/satelit.yml` (baru) | `workflow_dispatch` dengan masukan `pindai`, `concurrency: satelit` tanpa batal, batas waktu 8 menit | `mekanik-mesin` |
| `.github/workflows/lintas.yml`, `banjir.yml`, `statis.yml`, `udara.yml` | langkah harian kawah, SO2, genangan harian, VHI, asap | `mekanik-mesin` |
| Pemasangan kartu di `public/index.html`, `public/instansi*.js`, `public/gunungapi/**`, `public/cuaca/**`, `public/banjir/**`, `public/kekeringan/**`, `public/udara/**` | memakai `inti/satelit.js` | `layar-peta`, `warga-api`, `gunungapi-kering`, `cuaca-udara`, `banjir` |
| `tests/inti/satelit.test.mjs` (baru) | uji layar murni | `inti-layar` |

## 2. Pemindai (`himawari_pindai.py`)

- Kunci S3: `AHI-L1b-FLDK/YYYY/MM/DD/HHMM/HS_H09_YYYYMMDD_HHMM_Bnn_FLDK_R20_S0n10.DAT.bz2`. Daftar lewat `?list-type=2&prefix=` (XML, `xml.etree` stdlib).
- Unduh paralel 24 berkas dengan `concurrent.futures.ThreadPoolExecutor` (8 utas), dekompresi `bz2` per berkas, langsung ke `array('H')` per segmen; berkas mentah tidak disimpan.
- Kisi: piksel 2 km dalam kotak Indonesia (sekitar 94-142 BT, 11 LS-7 LU). Tiap detektor menerima kanal yang dimintanya saja.
- Detektor didaftar di satu kamus `DETEKTOR = {"api": ..., "abu": ..., "awan": ...}`; satu detektor gagal tidak menghentikan yang lain, keluarannya `{"status": "galat", "pesan": ...}`.
- Sasaran waktu hitung: unduh + hitung <= 4 menit di runner GitHub (18 MB terukur 4,5 detik untuk satu kanal; 70 MB diperkirakan < 1 menit unduh). `ukur` mencatat per pindaian: MB, detik unduh, detik hitung.

### 2.1 Anggaran latensi (jujur)

| Komponen | Perkiraan | Diukur di |
| --- | --- | --- |
| Pindai mulai sampai berkas S07 lengkap di S3 | 11-14 menit [terukur 24 Nov] | `ukur` (LastModified S3 lawan jam pindai) |
| Tik Worker sampai dispatch | 0-1 menit | `picu.json` (`dipicu_ms`) |
| Dispatch sampai runner mulai | 0,5-3 menit, bisa lebih saat GitHub padat [belum diverifikasi] | `run_started_at` API GitHub |
| Unduh + hitung | 1-4 menit | `ukur` |
| Unggah R2 sampai Worker melihat etag | 0-1 menit | etag Worker |

Jumlah: sekitar 13-23 menit. Sasaran yang jujur: **median <= 25 menit, p90 <= 35 menit** dari jam mulai pindai sampai keluaran terbaca Worker. Alasannya: 11-14 menit pertama milik JMA dan NOAA, dan antre runner GitHub tidak bisa kita kendalikan. Batas waktu job 8 menit; run yang melewatinya gagal, penanda `selesai` tidak ditulis, dan pindaian disusul (bagian 3).

## 3. Pemicu dan susulan (Q2, Q15)

```
src/satelit_picu.js, dipanggil dari cron * * * * * yang ada:
  baca R2 data/satelit/picu.json -> {pindai: {dipicu_ms, coba}} untuk 6 jam terakhir (kunci idempoten = YYYYMMDDHHMM)
  calon = pindaian kelipatan 10 menit dalam [sekarang - 6 jam, sekarang - 11 menit]
          yang belum punya data/satelit/selesai/<pindai>
          dan (belum dipicu, atau dipicu > 20 menit lalu dengan coba < 3)
  urut terbaru dulu ; periksa paling banyak 6 calon per tik:
     GET https://noaa-himawari9.s3.amazonaws.com/?list-type=2&prefix=AHI-L1b-FLDK/YYYY/MM/DD/HHMM/  (host tetap, satu halaman)
     bila 6 kanal x S04-S07 ada: dispatch satelit.yml {pindai} dengan GITHUB_TOKEN (sudah dipakai jaga_jadwal.js) ; paling banyak 3 dispatch per tik
  tulis picu.json sekali per tik bila berubah ; buang entri > 6 jam ; calon coba = 3 yang tetap gagal -> gagal_tetap (dihitung di /api/status)
```

- Batas per tik: <= 6 subrequest S3 + <= 3 subrequest GitHub + 2 operasi R2, jauh di bawah batas subrequest Worker; cron yang sama tetap menjalankan tugas lamanya.
- Susulan sesudah Worker mati 1 jam: 6 pindaian tertunda, habis dalam 2 tik. Lebih dari 6 jam: tidak disusul otomatis (Q15).
- Duplikat: (1) kunci idempoten per pindaian di `picu.json`; (2) `satelit.yml` memakai `concurrency: {group: satelit-${{ inputs.pindai }}, cancel-in-progress: false}`, jadi pindaian berbeda boleh jalan bersamaan, sedangkan dispatch kedua untuk pindaian yang sama menunggu, dan GitHub hanya menyimpan satu antrean per grup (antrean lama diganti yang baru, keduanya pindaian sama); (3) langkah pertama run membaca `data/satelit/selesai/<pindai>` dan keluar tanpa menulis bila ada; (4) semua kunci tulis disusun dari pindaian, jadi run ganda yang lolos hanya menulis ulang isi yang sama.
- Mac mini tidak dipakai (Q2). Tanpa cron baru (batas 5 jadwal akun).

## 4. Penyimpanan

| Tempat | Isi | Batas |
| --- | --- | --- |
| R2 `data/satelit/{api,abu,awan}.json` | pindaian terakhir, ditimpa | <= 500 KB tiap berkas |
| R2 `arsip/satelit/_potong/<jenis>/YYYYMMDD/HHMM.json.gz` | potongan per pindaian, sementara (<= 2 hari) | <= 200 KB keras, rerata sasaran <= 50 KB |
| R2 `arsip/satelit/<jenis>/YYYY/MM/DD.jsonl.gz` | arsip padat per hari per jenis | total Q5 |
| R2 `data/satelit/selesai/<pindai>` | penanda kosong; pemadatan harian hanya menghapus penanda yang pindaiannya lebih tua dari jendela susulan 6 jam, supaya pindaian 18.00-23.50 UTC tidak terpicu ulang sesudah pemadatan | 0 byte |
| R2 `data/satelit/{kawah,genangan_harian}.json` | harian | <= 300 KB |
| R2 `data/satelit/picu.json` | pindaian 6 jam terakhir yang dipicu | < 8 KB |
| D1 `alarm_himawari` (+ kolom `sumber`) | baris alarm api yang lolos aturan | pola yang ada |
| `public/data/gerbang/satelit.json` | vonis | < 100 KB (aturan gerbang) |
| `public/gunungapi/data/{kawah_satelit,so2_satelit}.json`, `public/kekeringan/data/vhi_kab.json`, `public/udara/data/asap_satelit.json` | ringkasan harian atau mingguan | < 300 KB |

Arsip 10 menit tidak masuk repo (Q4). Abu dan konveksi tidak membuat baris D1 sebelum vonis lolos dan Q6; bila nanti perlu, tabel baru dirancang di tiket sendiri, bukan diselipkan. Pemadatan harian jalan di langkah `data.yml` yang sudah ada.

### 4.1 Hitungan anggaran per bulan (30 hari, 4.320 pindaian, 3 jenis Himawari)

| Pos | Rumus | Kelas A | Kelas B |
| --- | --- | --- | --- |
| Tulis terbaru | 3 x 4.320 | 12.960 | - |
| Tulis potongan | 3 x 4.320 | 12.960 | - |
| Tulis `selesai` | 4.320 | 4.320 | - |
| Run: cek `selesai` | 4.320 | - | 4.320 |
| Pemadatan harian: list, tulis | 3 x 30 x 3 | 270 | - |
| Pemadatan: baca potongan | 3 x 4.320 | - | 12.960 |
| Worker: baca `picu.json` tiap menit | 43.200 | - | 43.200 |
| Worker: tulis `picu.json` | sekitar 4.500 | 4.500 | - |
| Worker: cek etag 3 berkas tiap menit | 3 x 43.200 | - | 129.600 |
| Worker: cek `selesai` calon | <= 6 per tik saat ada calon, sekitar 20.000 | - | 20.000 |
| **Jumlah** | | **sekitar 35.000** | **sekitar 210.000** |

Hapus objek tidak dihitung kelas A atau B [belum diverifikasi aturan tagihan R2 terbaru]. Penyimpanan: rerata 15 KB x 3 jenis x 4.320 = sekitar 0,2 GB per bulan; pada batas rerata 50 KB = 0,65 GB per bulan; 13 bulan pada batas = 8,4 GB. Kuota gratis R2 akun ini dan pemakaian modul lain dicek di dasbor di ST-03A sebelum arsip dinyalakan [belum diverifikasi angka kuota akun]. GitHub: 4.320 dispatch per bulan, sekitar 6 per jam rata-rata, jauh di bawah batas API per jam token.

## 5. Bentuk keluaran per pindaian

```json
{"acuan": "2026-11-25T03:00Z", "status_sumber": "hidup", "sejak": null, "versi_kriteria": 1,
 "vonis": "menunggu", "sumber": "Himawari-9 L1b (JMA) lewat NOAA ODD",
 "awan_persen": 41.2, "titik": [{"lon": 113.91, "lat": -2.21, "kelas": "kuat", "frp_mw": 40, "tb07": 331.4, "dt": 18.2}]}
```

`awan_persen` wajib supaya "tidak terdeteksi" tidak dibaca sebagai bebas api. Abu: `gunung` per kode MAGMA. Awan: per kab4.

## 6. Kunci dan rahasia

`FIRMS_MAP_KEY`, `EARTHDATA_TOKEN`, `GITHUB_TOKEN` (Worker), akun R2: sudah ada sebagai secret Actions dan Worker; tidak ada secret baru. S3 NOAA tanpa kredensial.
