# Referensi: tabel, workflow, uji

Halaman ini mendaftar tabel, penyimpanan objek, workflow, berkas keluaran, dan uji Siklus Bencana.

## Tabel D1 dan migrasi

| Migrasi | Isi |
| --- | --- |
| `0120_sk_kejadian.sql` | `sk_kejadian`, `sk_kejadian_kab`, `sk_kejadian_alias`, `sk_kejadian_sumber`, `sk_jejak`, pemicu fase |
| `0122_sk_kaji.sql` | `sk_kaji` (model gempa atau banjir_jam1, yakin terkunci `estimasi-model`) |
| `0123_sk_pulih.sql` | `sk_harga`, `sk_jitupasna`, `sk_jitupasna_baris`, `sk_r3p`, `sk_r3p_kegiatan`, pemicu kunci final |
| `0124_sk_renkon.sql` | `sk_renkon`, `sk_gladi` |
| `0125_indeks_baca_d1.sql`, `0142_lifeline_indeks.sql`, `0146_indeks_fk_kejadian.sql` | indeks untuk menekan baca D1 |
| `0134_titik_pengungsian.sql`, `0135_meja_pengungsi_titik.sql` | titik pengungsian dan tautan meja pengungsi |
| `0138_orang_akun.sql`, `0139_orang_tinjau.sql` | pasangan akun ke orang dan daftar tinjau |
| `0141_lifeline.sql` | `lf_status`, `lf_riwayat` (append-only), `lf_usulan` (cache) |
| `0143_tiga_w.sql` | `org`, `tw_baris`, `tw_token`, `tw_tawaran`, `tw_tawaran_riwayat` |
| `0147_kaji_ulang.sql` | `ku_kaji`, `ku_potret`, `ku_pelajaran`, `ku_rekomendasi` |
| `0148_pembiayaan.sql` | `pb_saldo`, `pb_skema`, `pb_model` (belum dipakai kode lain) |

Tabel `sk_*` memiliki kolom `dummy`. Migrasi produksi diterapkan pemilik. Bila migrasi belum terapan, rute Siklus menjawab 503 dengan pesan jelas (contoh "Siklus Bencana belum diaktifkan", "Status Lifeline belum diaktifkan", "Kaji ulang belum diaktifkan"), dan layar tetap tampil tanpa fitur itu.

## R2

Bucket media dipakai dengan awalan `siklus/mentah/<sumber>/<tahun>/` (salinan apa adanya, hanya tambah), `siklus/bersih/<jenis>/<tahun>.jsonl.gz` (dinormalkan), dan `siklus/saji/<fitur>/...` (agregat untuk layar, termasuk `paparan/`, `paparan/kab/`, `paparan/rinci/`, `fasilitas/`, `kaji/KJ-*`, `manifest.json`, `laporan_bersih.json`). Contoh dummy ada di `siklus/saji/_dummy/paparan/`. Plafon awalan `siklus/` adalah 4.000.000.000 byte (asumsi kebijakan), dicek lewat manifest, bukan pindai R2. Paparan rinci hanya di R2 di balik sesi. Berkas baru di `public/` program ini dibatasi 200.

## Workflow dan jadwal

`.github/workflows/siklus.yml` (nama "Siklus Bencana (gudang R2)") tidak melakukan commit dan tidak menerbitkan situs. Keluaran hanya ke R2 lewat `gudang.py`, yang hanya mengunggah berkas yang sidiknya berubah. Jadwal cron (UTC):

| Cron | Job | Isi |
| --- | --- | --- |
| `50 3 * * *` | harian | uji registri, panen DIBI harian, bersih DIBI, pasang kejadian (jendela 3 hari), unggah |
| `20 1-22/3 * * *` | kaji | panen ShakeMap USGS, pasang kejadian hidup, paparan kejadian aktif, kaji gempa, kaji banjir, unggah |
| `50 5 * * 0` | mingguan | panen adapter G1 dan fasilitas, fasilitas semua kabupaten, unggah |
| `40 4 5 * *` | bulanan | Geofabrik, fasilitas dan kelas bahaya semua kabupaten, CHIRPS dan PSMSL, BPS IKK dan IHPB, unggah |
| manual `mode=riwayat` | riwayat | bersihkan DIBI dan Logbook, arsip kejadian beku, lapis saji, unggah ribuan berkas arsip |
| manual `mode=lab` | lab | iklim_lab (NEX-GDDP) dan ghsl_lab (GHSL), unggah |

Grup concurrency `siklus-batch` dan `siklus-kaji`. Rahasia yang dipakai: token API Cloudflare, ID akun Cloudflare, dan token pipeline (nilainya tidak dicatat di repo). Tidak ada cron Worker baru untuk Siklus. Usulan Lifeline dihitung saat halaman dibuka, bukan oleh cron.

## Berkas keluaran di public

Keluaran besar tidak di-commit. Yang ada di `public/siklus/data/`: `atribusi.json`, `kamus.json`, `masa_depan_ringkas.json`.

## Uji dan gerbang

| Perintah | Isi |
| --- | --- |
| `npm run uji:siklus` | self-check semua `scripts/siklus/*.py uji`, lalu `tests/siklus/*.test.mjs` dan `tests/warga/siklus_*.test.mjs` |
| `npm run uji:warga` | rute, hak, dan migrasi Worker |
| `npm run uji:agen` | gerbang repo |

Uji layar `tests/siklus/layar_*.test.mjs` memakai server statis, API palsu, dan Chrome (helper `_layar.mjs`), termasuk `lifeline_layar.test.mjs` dan `tiga_w_layar.test.mjs`. Uji lain: `hitung.test.mjs` (paritas Worker dan peramban), `paritas.test.mjs` (konstanta JS dan Python), `gerbang_cakupan.test.mjs`, `gerbang_publik.test.mjs`, `gerbang_registri.test.mjs`, `kerusakan_kunci.test.mjs` (sidik kriteria kerusakan). Gerbang yang menjaga modul: `tests/agen/gerbang-paket-modul.test.mjs` (paket dokumen lengkap), `gerbang-peta-data.test.mjs` (data baru wajib punya pemakai dan jadwal), `gerbang-kartu-std.test.mjs` (kartu laporan standar), `gerbang-d1.test.mjs` (SQL hanya di `src/hak.js`), dan `tests/warga/pembiayaan_skema.test.mjs` (skema pembiayaan).
