# KEPUTUSAN-SATELIT: Pemantauan satelit semua bencana, Himawari 10 menit dulu

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

Rujukan silang: `data/kajian-bnpb/kemampuan-inti/KEPUTUSAN-KEMAMPUAN.md` K7 sampai K10, tiket KI-87 (paket ini) dan KI-88 (tiket paket ini dikerjakan). Riset dasar: `RISET.md` di folder ini.

## Masalah

1. Alarm titik panas Himawari mati sejak 18 Nov 2026. FTP JAXA P-Tree (`ftp.ptree.jaxa.jp`) menolak sambungan pada port 21, 990, dan 2051, dari GitHub maupun dari Mac pemilik; situs P-Tree membalas 404. `scripts/data/himawari.py` berhenti tanpa menulis, `/api/status` hanya menyebut "basi", dan kolom `himawari_awal` di tugas api kosong tanpa pemberitahuan.
2. Repo sudah punya pembaca Himawari L1b stdlib (`scripts/udara/awan_himawari.py`) dari bucket publik NOAA `noaa-himawari9`: latensi sekitar 13 menit, sekitar 12 MB per kanal IR untuk Indonesia, tanpa kredensial. Pembaca itu baru dipakai untuk awan dingin per 3 jam dan awan tumbuh per 30 menit.
3. Bencana lain yang bisa dilihat satelit (abu, konveksi, panas kawah, SO2, genangan harian, kekeringan vegetasi, asap) belum dipantau atau belum dinilai lawan label.
4. Jadwal GitHub Actions tidak bisa diandalkan (12 dari 192 run terjadwal dalam 4 hari); `jaga_jadwal.mjs` memicu ulang. Worker punya satu cron `* * * * *` (batas akun 5 jadwal).

## Keputusan pemilik

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K1 | 25 Nov 2026 | "Terapkan yang satelit". |
| K2 | 25 Nov 2026 | "Gas kan semua yang bisa dideteksi satelit gas. Terutama Himawari lagi soalnya data nya per 10 menit". |
| K3 | 25 Nov 2026 | "Oke tolong dirakit". |
| K4 | 25 Nov 2026 | Label uji memakai laporan Dalops: "Ya uji dengan dalops". Pembaca bersama `scripts/umum/label_dalops.py` sudah ada (KI-79, KEPUTUSAN-KEMAMPUAN K8). |
| K5 | 25 Nov 2026 | "Gw mau sempurna". |
| K6 | 10 Nov 2026 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu pemindai Himawari untuk semua produk: `scripts/umum/himawari_pindai.py` mengunduh sekali per pindaian (B07, B08, B11, B13, B14, B15, segmen S04 sampai S07, sekitar 70 MB) dan memanggil detektor per bencana. Fungsi baca HSD dan proyeksi diimpor dari `scripts/udara/awan_himawari.py`, tidak disalin. | Satu mesin per kemampuan (AGENTS 2.48); satu unduhan, banyak keluaran. |
| D2 | Tanpa folder modul baru di `public/` atau `scripts/`. Pemindai di `scripts/umum/`, detektor di folder bencananya (`scripts/data/`, `scripts/gunungapi/`, `scripts/udara/`, `scripts/banjir/`, `scripts/kekeringan/`). | Pemilik berkas tetap jelas; gerbang folder modul tidak perlu pengecualian. |
| D3 | Status sumber wajib untuk tiap sumber satelit: `acuan`, `status_sumber` (`hidup`, `terlambat`, `terputus`), `sejak`. Layar menulis "sumber terputus sejak <jam WIB>", tidak pernah 0 dan tidak pernah diam. Status sumber bukan model, jadi boleh tampil tanpa vonis. | Kegagalan 18 Nov tidak terlihat di layar; hilang tidak pernah 0. |
| D4 | Detektor api sendiri dari L1b NOAA (B07, B14) dibangun sebagai sumber cadangan permanen yang tidak bergantung pada akun JAXA. WLF P-Tree tetap di kode; bila pulih, keduanya jalan berdampingan pada jendela yang sama. | RISET 1.2 dan 2.1; Q3 menentukan apakah boleh menggantikan. |
| D5 | Tiap detektor punya berkas kriteria terkunci (`<nama>.kriteria.json`) dan sidik (`scripts/umum/sidik.py`) sebelum satu pun data uji dinilai. Vonis ditulis ke `public/data/gerbang/satelit.json` dengan aturan `scripts/umum/gerbang.py`; layar membaca gagal-tertutup lewat `public/inti/gerbang.js`. | Pra-registrasi dan gerbang gagal-tertutup per KI (KEPUTUSAN-KEMAMPUAN). |
| D6 | Pembanding wajib per detektor lewat `scripts/umum/pembanding.py`: persistensi dan klimatologi pada jumlah alarm yang sama. Selang 95 persen lewat `scripts/umum/selang.py`. | Aturan gerbang inti. |
| D7 | Label: Dalops lewat `scripts/umum/label_dalops.py` (karhutla, banjir, cuaca, kekeringan) sebagai label utama; DIBI label kedua, tidak dijumlah. Api juga lawan VIIRS 375 m; abu lawan VONA PVMBG; kawah dan SO2 lawan kenaikan level MAGMA; asap lawan PM2.5. Kab-bulan tak teramati (`label_mutu`) tidak dinilai, bukan negatif. | K4; RISET 2. |
| D8 | Model tanpa vonis `lolos` berlabel hipotesis dan tidak dikirim ke luar: tidak ke kabar Posko, WA, EWS email, atau tugas api. Hanya tampil di layar staf berpil hipotesis. | Aturan KEMAMPUAN; K5. |
| D9 | Status resmi terpisah: BMKG (peringatan cuaca), PVMBG (level, VONA), VAAC Darwin dan Tokyo (abu penerbangan). Deteksi kita tidak pernah mengubah, menggabung, atau merata-rata status resmi; kartunya berdampingan. | Aturan AGENTS; satu pemilik status. |
| D10 | Titik panas angka utama tetap VIIRS (definisi angka utama). Titik Himawari tampil di lapis terpisah dan tidak dijumlah dengan VIIRS atau MODIS. | AGENTS 2.43 dan 2.46. |
| D11 | Penyimpanan: hasil per pindaian ke R2 `data/satelit/<jenis>.json` (ditimpa) dan arsip `arsip/satelit/<jenis>/YYYY/MM/DD/HHMM.json.gz`. D1 hanya baris alarm yang lolos aturan dan vonis. `public/data` hanya ringkasan harian dan rapor uji lewat workflow harian yang sudah ada; hasil 10 menit tidak di-commit. | Kuota baca D1 Free; commit beruntun memicu terbit. |
| D12 | Python stdlib saja di jalur 10 menit (`bz2`, `struct`, `array`, `urllib`, `json`, `gzip`). NetCDF dan HDF5 tidak dipakai kecuali sumber menyediakan CSV, PNG berpalet, atau OPeNDAP ASCII/DAP4 (pola `scripts/udara/tropomi.py`). | Pola repo. |
| D13 | Genangan harian per kab (butir 5) memakai `scripts/banjir/genangan_nasional.py` apa adanya; tidak ada pembaca GFM kedua dan tidak ada ambang radar sendiri. Bersinggungan dengan paket `genangan-satelit`: paket itu menang untuk Kaji Cepat per kejadian. | KEPUTUSAN-GENANGAN D1, K2. |
| D14 | Asap memakai Aerosol Index TROPOMI yang sudah dipanen `scripts/udara/tropomi.py`; tidak ada indeks asap L1b buatan sendiri sebelum Q11 dijawab. AOD JAXA ARP menunggu P-Tree. | Model baru tanpa uji ditolak; sumber P-Tree mati. |
| D15 | Kosakata: tidak pernah "aman", "padam", "bebas api", "tidak ada abu", "cerah". Yang dipakai: "tidak terdeteksi satelit pada pindaian <jam>", "tertutup awan", "sumber terputus". | Aturan AGENTS; satelit bukan negatif. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Boleh menghubungi JAXA P-Tree atas nama akun yang ada untuk menanyakan alamat dan protokol baru? | **[BAWAAN SEMENTARA]** agent menyiapkan teks surel saja; pemilik yang mengirim. Agent tidak mengirim pesan apa pun. | ST-02 |
| Q2 | Pemicu 10 menit lewat workflow yang dipicu Worker (`workflow_dispatch`)? | **[BAWAAN SEMENTARA]** ya: cron Worker `* * * * *` yang sudah ada mengecek pindaian baru di S3 lalu memicu `satelit.yml` sekali per pindaian. Mac mini (launchd) tidak dipakai; cadangan hanya bila pemilik memintanya. | ST-03 |
| Q3 | Detektor api L1b boleh menggantikan WLF bila lolos uji, atau hanya berdampingan? | **[BAWAAN SEMENTARA]** berdampingan; penggantian hanya dengan jawaban pemilik sesudah vonis. Selama WLF mati, L1b tampil sebagai satu-satunya lapis Himawari berpil hipotesis. | ST-06 |
| Q4 | Arsip per pindaian di-commit ke repo? | **[BAWAAN SEMENTARA]** tidak. Arsip hanya di R2 `arsip/satelit/`; repo hanya ringkasan harian dan rapor uji. | ST-03 |
| Q5 | Anggaran R2 untuk arsip satelit? | **[BAWAAN SEMENTARA, HIPOTESIS]** <= 1 GB per bulan untuk semua jenis, simpan 13 bulan (satu musim kebakaran penuh plus satu bulan), JSON gz per pindaian <= 200 KB. Dikunci sesudah ST-03 mengukur seminggu. | ST-03, ST-05 |
| Q6 | Alarm satelit dikirim ke EWS email? | **[BAWAAN SEMENTARA]** tidak, sampai vonis `lolos` DAN pemilik menjawab ya. Status "sumber terputus" juga tidak dikirim ke luar. | ST-06, ST-14 |
| Q7 | Data L1b JMA lewat NOAA boleh tampil di layar publik? Syarat atribusi? | **[BAWAAN SEMENTARA]** staf saja sampai syarat atribusi JMA dan NOAA dicek di ST-00; atribusi "Himawari-9 (JMA), lewat NOAA Open Data Dissemination" di kartu Metode. | ST-00, ST-14 |
| Q8 | Riwayat Actions berisi sekitar 144 run per hari dari `satelit.yml`; dapat diterima? | **[BAWAAN SEMENTARA]** ya, repo publik tidak membayar menit. Run yang tidak menemukan pindaian baru keluar dalam < 30 detik. | ST-03 |
| Q9 | Kekeringan vegetasi dari NOAA STAR VHI: format ASCII per wilayah atau grid? | **[BAWAAN SEMENTARA]** deret ASCII per provinsi bila tersedia; grid NetCDF tidak dipakai (D12). Bila tidak ada format terbaca stdlib, ST-12 ditutup "tidak dapat dibangun" dan dilaporkan. | ST-12 |
| Q10 | Genangan GFM harian per kab tampil publik di `/banjir`? | **[BAWAAN SEMENTARA]** staf saja, sejalan dengan KEPUTUSAN-GENANGAN Q1. | ST-11 |
| Q11 | Asap: cukup TROPOMI Aerosol Index (OFFL 2 sampai 4 hari), atau bangun indeks asap Himawari L1b sendiri? | **[BAWAAN SEMENTARA]** TROPOMI AI saja (D14); indeks L1b sendiri tidak dibangun. | ST-13 |
| Q12 | SO2: NRT TROPOMI tidak ada di S3 awan (diuji 30 Okt 2026, `tropomi.py`); OFFL telat 2 sampai 4 hari. Dipakai tetap? | **[BAWAAN SEMENTARA]** ya, OFFL berlabel "data 2 sampai 4 hari lalu", tidak pernah sebagai peringatan. | ST-10 |
| Q13 | Ambang lulus per detektor? | **[BAWAAN SEMENTARA]** aturan `gerbang.py` apa adanya (selisih lawan pembanding > 0 dan batas bawah selang 95 persen > 0, pada jumlah alarm sama); angka ambang detektor dikunci di kriteria sebelum dinilai. | ST-05, ST-08 s.d. ST-13 |
| Q14 | Butir RISET di luar tujuh prioritas (kabut malam, GSMaP_NOW, LST) dikerjakan? | **[BAWAAN SEMENTARA]** ya, sesudah ST-13, karena K2 "semua yang bisa dideteksi"; GSMaP_NOW dan LST tertahan sampai FTP JAXA pulih. | ST-15 s.d. ST-17 |
