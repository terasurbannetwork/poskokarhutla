# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute API, tabel D1, dan penyimpanan R2 untuk modul banjir.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `public/banjir/index.html` | Halaman tunggal `/banjir`; daftar tab (`TABS`, `TAB_SEMBUNYI`), pemuat skrip. Skrip `mulai.js` dimuat terakhir. |
| `public/banjir/peta.js`, `lapis_ekstra.js`, `lapis_air.js`, `lapis_genangan_historis.js`, `hujan_kini.js`, `pos_air.js`, `terdampak.js`, `wilayah.js`, `kejadian.js` | Peta, lapisan, kartu pos, tabel wilayah, kejadian aktif. |
| `public/banjir/insight.js`, `dini.js`, `resmi_bmkg.js`, `tren.js`, `dampak.js`, `metode.js`, `keputusan.js`, `kalender_rob.js` | Tab dan kartu. |
| `public/banjir/sim.js`, `sim_genangan.js`, `sim_kerja.js`, `sim_tampak.js`, `sim_hand.js`, `sim_lahan.js`, `sim_longsor.js`, `sim_tanggap.js` | Simulasi skenario dan genangan 3D. |
| `public/banjir/replay.html`, `replay.js`, `replay_kerja.js` | Replay Maret 2025. |
| `public/banjir/laporan.html`, `laporan-das.html`, `bukti.js` | Laporan harian dan bukti DAS. |
| `scripts/banjir/status.py`, `hujan.py`, `ansambel_hujan.py`, `sungai.py`, `bahaya.py`, `rob.py`, `pasut.py`, `pasang_astro.py`, `peringatan.py` | Pipeline harian status dan rob. |
| `scripts/banjir/kejadian_aktif.py`, `dampak.py`, `dampak_kab.py`, `laporan_banjir.py`, `wilayah_hari.py`, `terdampak.py`, `seri_status.py`, `posko.py`, `rob_presiden.py`, `hulu.py`, `jeda_hulu.py` | Turunan dan ringkasan. |
| `scripts/banjir/uji_balik.py`, `prospektif.py`, `siaga_persentil.py`, `ambang_persentil.py`, `prediksi_kab2.py`, `uji_aifs.py`, `jaga_banjir.py` | Pengujian, catatan prospektif, dan penjaga data basi. |
| `scripts/banjir/genangan_nasional.py`, `gfm_label.py`, `genangan_historis.py`, `kedalaman_genangan.py`, `citra_banjir.py`, `bukti_das.py`, `mcdwd.py`, `opera_dswx.py`, `charter.py`, `ems.py` | Genangan dan pengamatan satelit. |
| `scripts/banjir/genangan/**` (`mesin.mjs`, `gsmap.py`, `petabencana.py`, `kalibrasi_j3.py`, `kalibrasi_j4.py`, `j4_operasi.py`, `kunci_j3.py`, `kunci_j4.py`, `skor_j3.py`, `skor_j4.py`, `m1_kumpul.py`) | Genangan Jakarta J1 sampai J4 dan M1. |
| `scripts/banjir/subsiden.py`, `scripts/banjir/proyeksi_tanah.py` | Penurunan tanah dan proyeksi (lab). |
| `scripts/siklus/kaji_banjir.py`, `scripts/siklus/genangan_kriteria.py`, `genangan_kriteria.json`, `genangan_sidik.json` | Kaji Cepat banjir dan kriteria genangan satelit. |
| `src/sihka.js`, `src/sungai_resmi.js`, `src/hujan.js`, `src/nowcast.js` | Pos sungai, hujan terukur, nowcast BMKG. |
| `src/sensor.js`, `sensor/**`, `tests/sensor/**` | Sensor milik sendiri, firmware, gateway, simulator. |
| `src/siklus_kaji.js`, `migrations/0122_sk_kaji.sql` | Kaji Cepat per kejadian. |
| `public/bencana.json` | Registri bencana `banjir`: tab, tingkat, warna, `kemampuan`. Kemampuan yang menyala (`public/bencana.json:416-470`): `operasi` benar; `renlap` dengan sarana `perahu_karet`, `perahu_motor`, `pompa_air`, `tenda`, `air_bersih_unit`, `dapur_umum`, `alat_berat` dan bobot `banjir`; `ews` dengan kunci `banjir` dan `rob` serta tangga benar; `dasbor` dengan ringkasan `banjir` dan papan SK benar; `dokumen` kosong; `ekonomi`, `pencegahan`, `prioritas` salah; daftar `tindakan` lapangan 19 jenis (`kaji_cepat`, `evakuasi`, `logistik`, `pantau`, `pembersihan`, `pengungsian`, `posko`, `imbauan`, `dapur_umum`, `kesehatan`, `alat_berat`, `tanggul`, `perbaikan_darurat`, `pompa`, `sar`, `buka_akses`, `air_bersih`, `status_darurat`, `omc`). Kunci `kemampuan.alat` (panel sensor dan CCTV) belum ada di registri; itu rencana paket `ews`. |

Dokumen riset di `scripts/banjir/`: `RISET-PARAMETER.md`, `RISET-ROB.md`, `RISET-UJI-BALIK.md`, `RISET-SUBSIDEN.md`, serta pra-registrasi `PRAREG-*.md`. Paket dokumen: `data/kajian-bnpb/genangan-satelit/`, `penurunan-tanah/`, `ews/`.

## Rute API

| Metode dan jalur | Hak | Keterangan |
| --- | --- | --- |
| `GET`, `HEAD /api/banjir/sungai-ukur` | publik | Baris `sihka_status` apa adanya, cache tepi 10 menit; 503 bila belum siap (`src/sihka.js:211`). |
| `GET`, `HEAD /api/banjir/sungai-ukur/pos/<id>` | publik | Riwayat 24 jam satu pos; id maksimum 40 karakter dan harus terdaftar (404 bila tidak); cache 10 menit (`src/sihka.js:203`). |
| `GET /api/banjir/hujan-ukur` | publik | Hujan terukur pos (`src/hujan.js`). |
| `GET /api/cuaca/nowcast` | publik | Area peringatan nowcast BMKG yang sedang berlaku (`src/nowcast.js`). |
| `POST /api/sensor/baca` | alat bertanda HMAC | Bacaan sensor; 401 bila tanda salah, 403 bila alat tidak aktif (`src/sensor.js:58`). |
| `POST /api/sensor/lapor` | gateway bertanda HMAC | Laporan teks desa tanpa sinyal ke antrean pengingat (`src/sensor.js:77`). |
| `GET /api/sensor/status` | pusdalops, koordalops, pimpinan | Status alat; 403 bagi yang lain; `BASI` 1 jam (`src/sensor.js:97`). |
| `GET /api/siklus/kaji`, `GET /api/siklus/kaji/:sid` | staf dan BPBD (`STAF`, `BP`) | Daftar dan rincian Kaji Cepat (`src/siklus_kaji.js:116-117`). |
| `POST /api/siklus/kaji/:sid/status` | pusdalops, koordalops (`PDKO`) | Ubah status Kaji. |
| `POST /api/siklus/ingest/kaji` | sistem | Pipeline mengirim hasil Kaji. |
| `GET /api/alat/pos`, `GET /api/alat/seri` | belum ada | Dirancang paket `ews`. |
| `GET /api/siklus/kaji/:sid/berkas/:nama` | belum ada | Dirancang paket `genangan-satelit`. |

Halaman `/banjir/`, tab, dan `/banjir/k/B0001` dilayani `ruteBencana()` dari registri (`src/worker.js:723`, `src/bencana.js`); `html_handling` bernilai `none` sehingga jalur seperti `/banjir/laporan-das` butuh rute di worker.

## Tabel D1 dan migrasi

| Tabel | Migrasi | Isi |
| --- | --- | --- |
| `sihka_baca`, `sihka_pos`, `sihka_dasar` | `0016_sihka.sql`, `0068_hujan_sihka.sql` | Bacaan (kunci primer pos dan waktu t), pos, dasar persentil. |
| `sungai_meta` dan turunannya | `0066_sungai_resmi.sql` | Pos berambang resmi DSDA dan SIPANTAU. |
| `cuaca_sumber` (kunci `sihka`, `sihka_status`) | migrasi cuaca | Satu baris status pos yang diteruskan rute. |
| `sensor_alat`, `sensor_baca`, `sensor_lapor` | `0089_sensor.sql` | Alat (jenis `tma`, `hujan`, `longsor`, `gambut`, `gas`, `gateway`), bacaan (kunci primer alat dan waktu), laporan desa. Jenis `geofon` belum ada. |
| `pengingat` | migrasi pengingat (0088) | Antrean ambang sensor dan laporan desa; jenis `sensor_ambang`, `sensor_lapor`. |
| `sk_kaji` | `0122_sk_kaji.sql` | Kaji Cepat; `model IN ('gempa', 'banjir_jam1')`, `yakin` terkunci `estimasi-model`, `ringkas` maksimum 1.500 byte. Nilai `banjir_gfm` belum ada dan butuh migrasi baru. |

Penurunan tanah dan genangan nasional tidak memakai D1 dan tidak ada rute Worker; keluarannya berkas statis di `public/banjir/data/`.

## Penyimpanan R2

- `arsip/pos_sungai/` arsip harian bacaan pos SIHKA (`scripts/banjir/arsip_pos.py`).
- `arsip/floodhub/YYYY/MM/DD/` respons mentah Google Flood Forecasting (`scripts/banjir/floodhub.py`, hanya bila kunci tersedia).
- `siklus/saji/kaji/` hasil Kaji Cepat (`banjir_jam1`); `siklus/saji/kaji_berkas/` dirancang untuk sel dan PNG genangan satelit.
- `ews/` dirancang untuk cache seri sumber luar dan daftar CCTV (belum ada).
