# Referensi: workflow, keluaran, uji

Halaman ini mendaftar workflow, jadwal, berkas keluaran, serta uji dan gerbang modul banjir.

## Workflow dan jadwal

| Workflow | Jadwal | Isi |
| --- | --- | --- |
| `.github/workflows/banjir.yml` | harian `20 0 * * *` UTC (07.20 WIB), batas 120 menit, grup konkurensi `data` | Uji aturan semua skrip (termasuk `subsiden` dan `proyeksi_tanah`), hujan, ansambel, peringatan, sungai, rob, pasut, status, uji balik mingguan (hari Minggu atau manual), posko, hulu, seri status, prospektif, dampak, laporan, arsip wilayah, terdampak, faktor orografi dan surut, arsip TMA, KAB2-OPS, arsip debit, penjaga data basi, terbit ke Cloudflare. Input manual: `bukti` (DAS dan citra), `genangan` (GSMaP Jakarta). Sebagian besar langkah `continue-on-error`; `prospektif.py` kode 3 menggagalkan run. |
| `.github/workflows/genangan_j4.yml` | harian `30 22 * * *` UTC (05.30 WIB) | Pengumpul prospektif J4, append-only ke `data/banjir/genangan/j4_*`, tanpa deploy. |
| `.github/workflows/m1_prospektif.yml` | `30 15 * * *` dan `30 21 * * *` UTC | Pengumpul prospektif M1 genangan. |
| `.github/workflows/gsmap_musim.yml` | manual | Panen GSMaP harian musim hujan Jakarta (butuh akun JAXA sebagai secret). |
| Worker terjadwal (satu cron `* * * * *`) | tiap menit; nowcast BMKG tiap menit kelipatan 10; hujan SIHKA menit yang berakhir 3 (kecuali menit 23) tiap 10 menit; SIHKA menit ke-23 tiap jam; sungai resmi (DSDA DKI dan SIPANTAU Tangerang) menit ke-38 tiap jam; dasar persentil sekali sehari 20 UTC | Tarikan SIHKA, hujan, nowcast BMKG, dan sungai resmi (`src/worker.js:1042-1049`, `src/sihka.js:166-175`, `src/nowcast.js`). |
| `.github/workflows/nowcast-bandang.yml` | tiap jam, `25 * * * *` | Menarik GSMaP NRT 30 jam terakhir lewat `scripts/banjir/nowcast_bandang.py tarik`, lalu mengarsipkan `fitur_<UTC>.json` ke R2 `arsip/nowcast_bandang/` tanpa menimpa (`arsip_nowcast.py`). Prospektif, tidak meng-commit data, tidak tayang (`nowcast-bandang.yml:1-12`). |
| `.github/workflows/panen-lab-banjir.yml` | manual; cron GloFAS `17 */4 * * *` dan jam_hujan bulanan `30 3 3 * *` | Panen IMERG per kabupaten dan debit GloFAS ke R2 `arsip/lab_banjir/` lewat `panen_lab.py`. Tanpa commit data, tanpa terbit, di luar grup konkurensi `data`. Cron GloFAS berhenti sendiri bila semua kabupaten sudah ada (penanda `glofas/_LENGKAP`) (`panen-lab-banjir.yml:1-12`, `:34-35`). |
| `.github/workflows/panen-s1-banjir.yml` | manual | Panen Sentinel-1 RTC per kabupaten lewat `s1_genangan.py` (Planetary Computer) ke R2 `arsip/lab_banjir/s1/`; tanpa commit data dan tanpa terbit (`panen-s1-banjir.yml:1-6`). |
| `.github/workflows/nowcast-jkt-imerg.yml` | manual | Unduh arsip IMERG Early 30 menit untuk Jakarta, bulan November sampai April, ke R2 `arsip/imerg_jkt/` untuk jalur A nowcast Jakarta (`nowcast-jkt-imerg.yml:1-8`). |

Langkah "Panen banjir, EMS, Charter, MCDWD, verifikasi SYNOP" di `banjir.yml:148-155` berjalan harian, boleh gagal, dan masing-masing memakai swa-uji sebelum panen: `ems.py` (aktivasi publik Copernicus EMS Rapid Mapping, keluaran `ems.json`), `charter.py` (daftar aktivasi International Charter Space and Major Disasters, `charter.json`, indeks bukan model), `mcdwd.py harian` (deteksi banjir MODIS harian per kabupaten dari lapisan NASA GIBS, `mcdwd.json`), dan `mcdwd_model.py prakira` (model peluang banjir terdeteksi MODIS besok per kabupaten, `mcdwd_model.json`, sasarannya hari tanpa awan saja). Keempatnya berstatus pengamatan atau lab dan tidak mengubah status banjir; vonis uji balik `mcdwd_model.py` belum terdokumentasi di dokumen ini. Unggah bukti DAS dan citra (`bukti_das.py`, `citra_banjir.py`) berjalan hanya lewat input manual `bukti`.

Jalur cache `public/banjir/data` dan `data/raw/banjir` wajib identik di `banjir.yml` (simpan dan pulihkan), `data.yml`, `titik.yml`, dan `terbit.yml`. Penjaga `jaga_banjir.py` menolak terbit bila `meta.json` lebih dari 36 jam atau `hujan.json` bukan hari ini WIB; pemeriksaan kesegaran data tayang menggagalkan bila banjir lebih dari 30 jam. Genangan satelit per kejadian dirancang masuk `siklus.yml` (belum ada langkahnya); penurunan tanah tidak punya langkah workflow dan berjalan manual tahunan di mesin pemilik.

## Berkas keluaran di `public/banjir/data/` (pilihan)

`status.json`, `meta.json`, `hujan.json`, `hujan_ansambel.json`, `peluang.json`, `sungai.json`, `rob.json`, `pasut.json`, `pasut_30h.json`, `pasang_astro.json`, `peringatan.json`, `bahaya.json`, `kejadian.json`, `kejadian_aktif_awal.json`, `kejadian_aktif_geo.json`, `dampak.json`, `paparan_kab.json`, `terpapar_hujan_kab.json`, `wilayah_hari.json` dan `hari/`, `laporan.json`, `terdampak.json`, `hulu.json`, `jeda_hulu.json`, `validasi.json`, `uji_aifs.json`, `prospektif_skor.json`, `siaga_persentil_log.json`, `genangan_nasional.json`, `genangan_historis/`, `genangan/` (Jakarta), `bukti/`, `replay/`, `subsiden_literatur.json`. Belum ada: `subsiden.json`, `proyeksi_tanah.json`. `public/banjir/data/prospektif.json` tidak dilacak git dan tidak tayang.

## Uji dan gerbang

| Perintah | Menjaga |
| --- | --- |
| `npm run uji:banjir` | Semua `tests/banjir/*.test.mjs` (layar murni, simulasi, genangan swa-uji, penurunan tanah, terdampak, kalender rob, dan lainnya). Jangan memakai `node --test tests/banjir` langsung. |
| `python3 scripts/banjir/<skrip>.py uji` | Swa-uji tiap skrip (daftar persis di langkah "Uji aturan" `banjir.yml`), mencakup `status`, `rob`, `subsiden`, `proyeksi_tanah` dan puluhan skrip lain. `genangan_nasional` tidak ada di daftar itu: swa-ujinya hanya dijalankan manual (`.github/workflows/banjir.yml:102`). |
| `python3 -I scripts/siklus/genangan_kriteria.py uji` dan `... prasyarat` | Swa-uji kriteria genangan satelit dan pemeriksaan sidik, jangkar, dan leluhur HEAD (butuh checkout `fetch-depth: 0`). |
| `npm run uji:siklus` | Skrip Siklus dan `tests/siklus`, termasuk Kaji Cepat. |
| `npm run uji:warga` | Termasuk `tests/warga/sihka*.test.mjs`, `logbook_sensor.test.mjs`, `jeda_sensor.test.mjs`. |
| `npm run uji:sensor` | `tests/sensor/` (payload biner, tanda, kunci alat, gateway, simulator, konsistensi). |
| `npm run uji:agen` | Gerbang repo, termasuk gerbang paket modul dan data beku. |
| `python3 scripts/banjir/uji_balik.py` | Uji balik status (mingguan di CI, boleh gagal; melanjutkan bila kuota habis). |
| `python3 scripts/banjir/prospektif.py skor` | Menilai catatan prospektif terhadap DIBI. |

Peringatan: berkas `* 2.*` adalah salinan nyasar sinkronisasi (pernah ikut commit) dan tidak boleh disunting atau dijalankan.
