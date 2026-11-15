# RISET: Keterpaduan

## 1. Benchmark luar negeri

| Sistem | Yang ditiru | Pelajaran |
| --- | --- | --- |
| IRWIN (kebakaran hutan AS) | Hub yang memberi satu ID per insiden dan mengalirkan data antara sistem dispatch, pemesanan sumber daya, laporan situasi, dan sistem keputusan. | Tanpa satu ID, beberapa sistem melaporkan luas berbeda untuk api yang sama sampai ada orang yang menyamakannya. Insiden dibuat di satu titik (dispatch lokal) dengan cara baku. |
| GLIDE (ADRC) | Nomor kejadian global `jenis-tahun-urut-negara`, dipakai lebih dari 20 lembaga; tinjauan CRED 2025 menaikkan kejadian EM-DAT yang bernomor GLIDE sekitar 74 persen. | Nomor lokal tetap perlu, GLIDE hanya ditempel. |
| ODK dan KoboToolbox (XLSForm) | Satu definisi formulir dipakai ponsel luring, web, dan ekspor. | Validasi tidak pernah ditulis dua kali. |
| IOM Displacement Tracking Matrix | Kaji cepat dalam 72 jam pertama bencana alam, lalu kaji ulang per putaran di lokasi yang sama. | Lokasi butuh kode tetap supaya putaran bisa dibandingkan. |

Sumber: doi.gov/wildlandfire/hello-my-name-irwin, wildfire.gov/application/data-management-irwin, glidenumber.net/glide/public/about.jsp, emdat.be/news/2025/08/major-glide-number-update, kerangka metode DTM 2022 (displacement-tracking-matrix.github.io).

## 2. Keadaan repo (diukur 15 Nov 2026)

### 2.1 Kejadian

- `sk_kejadian` (`migrations/0120_sk_kejadian.sql:5-33`): `id` `KJ-YYYY-` + 8 huruf base32 dari SHA-256 kunci pendiri `jenis|kab4|mulai` (`src/siklus_hitung.js:9-21`), wilayah `prov` + `kab4`, tanggal teks.
- `sk_kejadian_sumber` (`:58-80`): UNIQUE (`sumber`, `kode`, `dummy`), status terpasang, ambigu, tanpa_wilayah, ditolak. Sumber hari ini: dibi, logbook (CSV, bukan tabel D1), usgs, bmkg, banjir, gunungapi, karhutla (sel 0,02 derajat).
- Pencocok: `scripts/siklus/pasang.py bertahap` (`:260-304`): jenis sama, kab4 termasuk, selisih mulai paling banyak 3 hari; satu kandidat tambah, nol baru, lebih dari satu ambigu.
- Tabel modul tanpa tautan: `tugas_api` (kab berupa nama), `logbook_kejadian` (kab nama), `sippa_tugas` (kab nama), `lp_tugas` (koordinat), `gempa_kejadian` (koordinat), `lapsus_kejadian` (merujuk `logbook_kejadian.id`), `op_isian_kejadian`, `pantau_tugas`, `tugas_bencana` (tanpa wilayah).
- Nama kab ke kab4 sudah ada di Python (`kunci.kab4`, `pasang.py:94`).

### 2.2 Antrean luring

Enam: `public/lacak_lapor.js` (`pb_lacak`), `public/instansi.js` (`pb_instansi`), `public/petugas/antre.js` (`lp-antre`), `public/bnpb/antre.js` (`pb_antre`), `public/pipa/antre.js` (`sippa-antre`), `public/siklus/antre.js` (`siklus-antre`). Sama: IndexedDB, kirim urut terlama, coba ulang untuk 408/429/5xx/jaringan. Beda: kunci ganda (`klien_id` di empat, tidak terlihat di petugas), mundur (hanya lacak dan pipa), butir ditolak (ditahan atau dibuang), batch (pipa 200, siklus 100), foto (dua tahap di lacak, instansi, pipa), umur (7 hari, 14 hari, peringatan 5 jam). Tidak ada Background Sync.

### 2.3 Spek formulir

`src/meja_spek.js` (server + `GET /api/meja/spek` + templat Excel `scripts/bnpb/templat_dampak.py`), `public/pipa/formulir.js` (dipakai `src/sippa.js` dan antrean), `uji_pilot_spek`, `pendataan_spek`. Nama tipe berbeda (`pilih` lawan `pilihan`, `angka` lawan `bulat`). Validasi hanya di server: `src/operasi_isian.js`, `src/sippa_lapangan.js` (salinan klien `cekFase2`). Validasi hanya di klien: `public/siklus/antre.js`. Bukan spek formulir: `laporan_bnpb_spek` (skema LLM), `hukum_spek`, `laporan_karhutla_spek`.

### 2.4 Pengungsian

Meja `pengungsi` (`src/meja_spek.js:247-276`, Juklak 9/2023): agregat tanpa nama, satu catatan per tempat per hari, kunci unik `(prov, kab, lower(nama_tempat), tgl_data)` (`migrations/0119_meja_dampak.sql:100`), tanpa koordinat, field `kejadian` berupa jenis bencana, bukan nomor kejadian. `pendataan_ke` sudah ada.

### 2.5 Identitas

`staf` (`0030`), `instansi_akun` (`0029`), `pemirsa` (`0036`), `pdt_akun` (`0060`), `km_akun` (`0080`), `orang` (`0095`, sudah punya `staf_id` dan `relawan_id`). WA disimpan polos `62...`; tiga fungsi normal: `normalWA` (`src/worker.js:147`), `normalWa` (`src/kontak.js:20`), `normalNo` (`src/wa.js:23`). `src/hak.js` adalah gerbang D1 untuk staf, bukan pemersatu akun.

## 3. Jalur input data lapangan

Inventaris jalur input tiap data non-publik (form web, WA, impor) dan data yang belum punya jalur dicatat di `INVENTARIS-INPUT.md`.
