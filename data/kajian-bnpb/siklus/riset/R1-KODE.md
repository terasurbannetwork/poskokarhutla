# R1 Audit kode yang dipakai ulang (Siklus Bencana, 10 November 2026)

Dibaca dari berkas sungguhan; ukuran dan baris dihitung dari berkas lokal. `KEPUTUSAN-AWAL.md` menang; butir yang menuntut perubahannya ada di bagian I.

## A. F1 Buku Besar Kejadian

### A.1 Kode yang ada

| Berkas | Isi nyata |
| --- | --- |
| `scripts/bnpb/kunci_kejadian.py` | `JENIS` :33 memetakan jenis DIBI dan Dalops ke 10 kunci (banjir, longsor, cuaca, kekeringan, karhutla, gempa, gunungapi, tsunami, gelombang, kebakaran_permukiman); `daftarkan_jenis()`; `kab_kunci(nama, prov)` :82; `satuan()` :101; `pasangkan()` :117 (satu-satu, rakus dari selisih terkecil, jendela 3 hari); `gabung()` :143 (banyak sumber jadi gugus). Punya `--cek`. |
| `scripts/bnpb/rekonsiliasi_dalops_dibi.py` | `main()` :267. Keluaran `public/data/bnpb/rekonsiliasi_dalops_dibi.json` (192 KB), HANYA agregat provinsi x tahun x jenis, sengaja tanpa baris kejadian (privasi logbook). Masukan lokal saja. |
| `scripts/umum/kejadian.py` | `proses()` :185, kode stabil `<awalan>NNNN`, nomor tidak dipakai ulang (`kejadian_<id>_nomor.json`), `MASA` :32 (cuaca 1, udara 2, gunungapi 3, kekeringan 14 hari), `ADAPTOR` :348. Keluaran `_awal.json` + `_geo.json` di `public/banjir/data` (`lintas.yml:291`). |
| `public/bencana.json` | Awalan: karhutla K, banjir B, pesisir P, cuaca C, gempa G, udara U, gunungapi V, kekeringan D. |

### A.2 Sumber: baris, rentang, kunci wilayah

| Sumber | Berkas dan ukuran | Baris, rentang | Kunci wilayah | Catatan |
| --- | --- | --- | --- | --- |
| DIBI harian publik | `public/data/dibi_kejadian.json` 722 KB | 4.404 baris, 28 Okt 2025 sampai 28 Okt 2026 | `prov_kode`, `kab_kode` bertitik (`73.17`), `kab` | 13 kolom dampak (meninggal, hilang, luka, terdampak, mengungsi, rr_berat/sedang/ringan, terendam, fasilitas pendidikan, kantor, jembatan, umum). Penghasil `scripts/umum/dibi_kejadian.py` |
| DIBI kab x tahun | `public/data/bnpb/dibi_kab_tahun.json` 394 KB | 10.813 baris, 2015-2025 | BPS 4 digit | TANPA tanggal; tidak bisa dipasangkan per kejadian |
| DIBI harian penuh | `data/raw/bnpb/dibi_harian/*.json` 8,4 MB, gitignored | 57.161 baris, 2011-2026 (2025: 8.941) | `id_kab_bps`, `dt` epoch ms | kolom kej, md, hil, luka, rb, rs, rr. Hanya di mesin pemilik |
| Logbook CSV | `data/pusdalops/logbook_kejadian.csv`, DILACAK git | 56.685 baris, 2011-2026 | `kab_kode` `32\|Bogor` (93% terisi) | KOTOR: 644 tanggal kosong, sekitar 10 tahun mustahil (2030, 2103, 2923, 9202) |
| Logbook publik | `public/data/logbook_kejadian.json` 595 KB | 2.232 baris, 1 Jan-29 Okt 2026 | `kab_kode` `33.18` | jenis, mulai, kec[], kk, jiwa, rumah, ha, surut |
| Banjir | `public/banjir/data/kejadian.json` 1,8 MB | `kejadian_dibi` 11.374 baris sejak 14 Okt 2023; agregat 2008-2026, 512 kab | `PP\|nama` | jenis gabung `banjir_longsor`; 2024 selisih 1.457 lawan 1.420 dengan dibi_kab_tahun |
| Lintas bencana | `kejadian_gunungapi_awal.json` 8 KB (V0001-V0027); banjir aktif `kejadian_aktif_awal.json` 4 KB (11 kejadian `B0007`...) | cuaca, udara, kekeringan TIDAK ada di git (dibuat CI) | `PP\|nama`; banjir `PP\|kab\|kec` | `kejadian[{kode, nama, jenis, prov[], kab[], mulai, terakhir, aktif, besaran{nilai,satuan,ket}, pusat}]`; banjir: skor, level_tertinggi, penduduk, bbox |
| Karhutla | `kejadian_karhutla_awal.json`, ditulis `scripts/data/harian.py:742` (fungsi :818), TIDAK ada di git | hanya level 3 | `PP\|kab` | dibaca `public/semua/kejadian.js`. `kluster_awal.json`: 12.683 titik, id `K0001` |
| Gempa | D1 `gempa`, `gempa_kejadian` (`migrations/0009`), `GET /api/gempa/kejadian[/:kode]` (`src/gempa.js:262-283`) | `G0001`..., 30 hari, maks 200, cache tepi 60 dtk | `prov`, `kab` nama | kode, nama, lat, lon, m, mulai, akhir, aktif, jumlah; detail memuat daftar gempa (tsunami, dirasakan, mmi_maks, shakemap = nama PNG, pager = warna) |
| Sungai dan rob | D1 `sihka_baca(pos,t,v)`, `sihka_pos`, `sihka_dasar` (`0016`); `public/pesisir/data/rob_kejadian.json` 53 KB (565 kejadian, 179 kab) | tiap jam (`src/sihka.js`) | `pos` uuid, x/y EPSG:3857; rob `PP\|nama` | satu-satunya deret muka air, tanpa kabupaten. `src/sitrep.js` hanya arsip per hari, tanpa identitas kejadian |
| Logbook hidup | D1 `logbook_kejadian` + `logbook_entri` (`0088`, `0091`, `0117`) | diisi staf | `prov` + `kab` nama | entri = deret md, hilang, luka, mengungsi, rumah_rb/rs/rr/terendam, luas_ha, kendala[], kebutuhan[]; satu-satunya riwayat dampak yang bergerak |
| Korban | D1 `korban` (`0034`, `0093`), `src/korban.js` | satu baris = satu laporan | `prov`, `kab` | `korbanHari` :242, `RUTE_KORBAN` :313; nama korban hanya staf |
| Rumah rusak | D1 `rumah_rusak` (`0024`), `src/rumah_rusak.js` | satu baris = satu rumah | `prov` 2 digit, `kab`, `kec` nama | `RUTE_RUMAH_RUSAK` :173, `bacaRekap` :93, `KOLOM_V1` :32 (koordinat 4 desimal). Jejak koreksi tak bisa diubah |

### A.3 Risiko bentrok F1

- `public/semua/kejadian.js` membaca berkas `_awal.json` dan `/api/gempa/kejadian`; bentuknya tidak boleh berubah, Buku Besar jadi lapis di atasnya. Baris logbook per kejadian tidak boleh masuk `public/`.
- Sesi lain menulis meja `dampak` (Juklak 7/2023, `data/kajian-bnpb/juklak/DATA-DAMPAK.md`): satu catatan per kejadian per kabupaten, KIB dihitung server, pemasangan ke Logbook. Tumpang tindih dengan F1 dan F4.
- `docs/bnpb/PETA-SAMBUNGAN-DATA.md` bagian 5 mencatat selisih antar sumber (titik panas lima angka, banjir tahunan dua umpan, level gunung api, luas terbakar); korban dan status banjir BELUM diperiksa.

## B. Bersama

### B.1 Tiga konvensi kunci wilayah

| Konvensi | Contoh | Dipakai |
| --- | --- | --- |
| `PP\|nama peta` (kec: `PP\|kab\|kec`) | `32\|Bogor` | kunci_kejadian, kejadian.py, banjir, logbook D1, `public/geo` |
| BPS 4 digit | `1105` | `public/data/bnpb/wilayah.json` (513 kab), `hvc_dasar.kab_kode`, IRBI, terpapar.json, kemitraan (514 berkas) |
| DIBI bertitik | `73.17` | dibi_kejadian.json, logbook_kejadian.json |

Jembatan: `kab_kunci()` (jadi `PP|nama`), `hvc_dasar.kab_kode()` (jadi BPS). Pusat kecamatan: `public/banjir/data/pusat_kec.json` (7.274).

### B.2 Pola halaman Worker

- `wrangler.jsonc:8`: `run_worker_first: ["/*.html", "/logpal/*"]`, `html_handling: "none"`. Semua `.html` lewat Worker; JS/CSS/JSON di `public/siklus/` dilayani sebagai aset TANPA Worker (terbuka) kecuali jalurnya masuk `run_worker_first` (pola LogPal, `asetSah`).
- Halaman bersih didaftarkan di `HTML_RUTE` (`src/worker.js:~694`, `[regex, "/siklus/index.html", "/siklus"]`); tabel `RUTE` :568 (satu spread per modul); gerbang `hostTerkunci` :689. Penjaga sendiri: LogPal; sub-router `layaniKm` :884.
- Satu cron Worker `* * * * *`; kerja berat lewat Actions dengan grup concurrency sendiri (`bangunan.yml:21`). `pintu.js` (`KARTU`) sedang diubah sesi lain.
- Peran staf (`src/staf.js:23`) 10 (verifikator, pusdalops, koordalops, pimpinan, kemitraan, direktori, dst.); tidak ada peran Siklus.

### B.3 Tombol dummy dan uji

- Aturan `~/.claude/DUMMY.md`: dua ikon (isi untuk halaman terbuka, hapus semua), Super Admin, periode terpampang, semua ember status terisi, angka dari rantai nyata, muat ulang penuh. Contoh nyata: LogPal `public/logpal/logpal.js:775-778` + `POST /api/instansi/logpal/dummy`; SIPPA `public/pipa/dummy.js`; `POST /api/meja/dummy`. Pola data: kolom `dummy` 0/1, indeks parsial `WHERE dummy = 1`, staf nyata tidak melihat baris dummy (`dummyOk`).
- Uji Worker: `tests/warga/_bnpb.mjs` `siapkan(nama)` menjalankan `src/worker.js` utuh di Miniflare + D1 lokal dengan migrasi apa adanya, jaringan luar diblok; helper `api(metode, jalur, body, header)`, `ADMIN`, `GERBANG`; `_bantu.mjs` (`migrasi()`, `pecah()`).
- `tests/warga/cakupan.json`: tiap rute `src/worker.js` dan tiap tabel/trigger `migrations/` wajib ada di `diuji` atau `dikecualikan`; `antre` hanya menyusut. `/api/siklus/*` dan `sk_*` tunduk kecuali `tests/siklus` punya registri sendiri.
- Belum ada: `npm run uji:siklus`, `tests/e2e`, gerbang-dummy global. Gerbang yang menyentuh: `tests/agen/gerbang-peta-data.test.mjs` (sumber eksternal baru wajib punya pemakai dan jadwal), `gerbang-kartu-std`, `gerbang-tipografi`, `tests/warga/migrasi_beku.json`.

### B.4 Pola unggah R2

Bucket `poskokarhutla-foto` (binding `MEDIA`): `npx --yes wrangler@4.42.0 r2 object put "poskokarhutla-foto/<awalan>/<berkas>" --file ... --remote` (`bangunan.yml:94`). `siklus/` belum dipakai. Unggah bersyarat (tidak menimpa versi lebih lengkap): `panen-s1-banjir.yml`. Antar job lewat `actions/cache` (kunci `data-`, `banjir-`, `bangunan-grid-`).

## C. F2 Peta Paparan per Bangunan

| Komponen | Nyata |
| --- | --- |
| `scripts/umum/bangunan.py` | Open Buildings v3 (CC BY 4.0), ubin S2 level 6, ambang keyakinan 0,70. Titik pusat ke sel halus 110 m, lalu grid 0,01 derajat dan hitungan per kecamatan. Keluaran TERKUNCI `data/terkunci/bangunan/`: `grid_<prov>.json` {lat0, lon0, step, cells[[i,j,n,luas_m2]]}, `halus_<prov>.json`, `kec.json` (kecamatan: [n, luas_m2]). Batas: `scripts/geo/batas.py`, `public/geo/`. Mentah 1,7 GB (`data/raw/bangunan`, gitignored). `--semua` = 278 ubin, sekitar 12,7 GB. |
| Grid yang sudah ada | HANYA 3 provinsi, lokal, dibuat 27 Okt 2026: 13 Sumbar (15.764 sel, 2,10 juta bangunan; halus 5,1 MB), 33 Jateng (27.226 sel, 17,56 juta; halus 19,7 MB), 63 Kalsel (15.232 sel, 1,85 juta; halus 3,6 MB). `kec.json` 39 KB: 21.505.794 bangunan, 910 kecamatan. `terpapar.json` belum ada lokal. 35 provinsi lain belum ada. |
| `scripts/umum/paparan_bangunan.py` | Silang grid dengan bahaya yang sudah terbit: karhutla (1/3/5 km dari kluster aktif + jejak 72 jam), banjir (poligon `kejadian_aktif_geo.json`; rob `tersedia:false`), gempa (MMI M>=5, 30 hari, lewat `guncangan.py`), gunung api (KRB). Provinsi tanpa grid ditandai `terliput:false`. Presisi +-0,8 km. Tidak ada kelas InaRISK per bangunan. |
| `src/bangunan.js` | 3 rute `GET /api/bangunan/{terpapar,kec,grid?prov=}` membaca R2 `bangunan/*`; `adminOK` pertama; `private, no-store`. Tool MCP `bangunan_terpapar` (`src/mcp.js:209`) memakainya. Tidak ada rute fasilitas, desa, atau jiwa. |
| `.github/workflows/bangunan.yml` | `bulanan` (cron `30 20 3 * *`): unduh semua, cache `bangunan-grid-`, unggah semua `*.json` (termasuk `halus_*`) ke R2. `harian` (cron `30 8 * * *`): grid dari cache, hitung ulang `terpapar.json`; cache kosong hanya memberi peringatan. Grid 35 provinsi lain di R2 atau cache BELUM diverifikasi. |
| `scripts/bnpb/terpapar.py` | Penduduk rentan per KABUPATEN: Dukcapil ArcGIS (83.489 desa, titik pusat) x InaRISK di titik pusat (ambang 0,33 dan 0,66), 5 bahaya. Keluaran `public/data/bnpb/terpapar.json` 107 KB: `kab{kode:{n,b,l,d,h{bahaya:[jiwa_sedang+, rentan_sedang+, jiwa_tinggi, rentan_tinggi]}}}`; lisensi Dukcapil tidak dinyatakan. |
| Pembaca InaRISK | Raster TIDAK disimpan; dibaca dari ArcGIS `gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_*/ImageServer`: `scripts/banjir/bahaya.py` (`bahaya.json` 746 KB, maks 10 titik per kecamatan; mode `kelas`: `computeHistograms` per poligon, `bahaya_kelas.json` 693 KB, persen luas rendah/sedang/tinggi), `scripts/gempa/bahaya.py` (`inarisk_gempa.json` 228 KB), `terpapar.py`. |
| Fasilitas vital | `public/data/fasilitas.json` 921 KB: 10.619 titik OSM (sekolah, rs, faskes), hanya 9 provinsi prioritas karhutla. `public/data/sekolah.json` 7,4 MB: 65.551 baris Dapodik/EMIS berkoordinat (jenjang, siswa, kec, desa). `rs_kapasitas.py`: SIRANAP TIDAK TERJANGKAU (DNS gagal 29 Okt), `tt_kosong` null. POI Overture (`logistik.py`) hanya tahap lab. Penduduk: `public/data/penduduk.json` (WorldPop 2026, 286,8 juta, per kecamatan). |

Risiko bentrok F2: kontrak `terpapar.json`, `kec.json`, `grid_<prov>.json` dipakai `src/bangunan.js` dan MCP; perluasan harus berkas BARU.

## D. F3 Kaji Cepat Otomatis

| Komponen | Nyata |
| --- | --- |
| Sentinel-1 | `scripts/banjir/s1_genangan.py` (Planetary Computer, numpy rasterio pystac-client): VV < -18 dB, frekuensi basah < 0,25 pada orbit sama (min 6 adegan), buang air permanen JRC GSW > 50; piksel sekitar 67 m. Keluaran per KABUPATEN `{kode, km2_kab, meta, adegan[{tanggal, orbit, teramati, km2, fraksi}]}`: deret adegan, BUKAN poligon dan bukan kejadian. `panen-s1-banjir.yml`: hanya `workflow_dispatch`, 20 kab teratas, sejak 2017, ke R2 `arsip/lab_banjir/s1/<KODE>.json`. Tidak ada pembaca di repo. |
| GFM dan model | GFM `scripts/banjir/genangan/gfm.py` (STAC EODC, Equi7 20 m): ringkasan kecamatan DKI saja (`gfm_kec.json` 151 KB). Model genangan Jakarta `j4_operasi.py` (uji prospektif J4 terkunci 28 Okt; sidik membekukan `sim_genangan.js` dan `umum.py` sampai Apr 2027). |
| Dampak banjir | `scripts/banjir/dampak.py` -> `public/banjir/data/dampak.json` 5,8 KB: kecamatan Siaga/Awas hari ini x penduduk, sekolah+siswa, puskesmas/RS, jalan kelas 1-3 "berisiko terputus" (batas atas, bukan jalan pasti tergenang). |
| Gempa (paling siap) | `scripts/gempa/guncangan.py`: BSSA14, Zhao 2006, Worden 2012; Vs30 seragam 400 m/s; hanya mean; `mmi_kecamatan()` :151 per pusat kecamatan. `scripts/gempa/pager.py`: fatalitas USGS PAGER (pita kali/bagi 4), kembaran `public/gempa/pager.js`, arsip prospektif `public/gempa/data/prospektif_pager.json` (BERKAS BELUM ADA); rumah rusak TIDAK dipasang. Kalibrasi `public/gempa/data/kalibrasi_kerusakan.json`: 8 gempa kerak, kalib 3,06, `faktor_loo` 5,34 (model meleset sampai 5 kali). `prospektif_guncangan.json`: 0 dicatat. Katalog `riwayat_m5.json` 694 KB. |
| "ShakeMap" | Di `src/gempa.js` hanya nama berkas PNG BMKG (`shakemap`, regex :56, URL :245) dan warna PAGER USGS. Bukan grid. |
| Lampu malam | `scripts/umum/lampu_malam.py`: Black Marble VNP46 via GIBS WMS, rasio pasca/dasar per kecamatan, masker awan malam. Docstring: BELUM LAYAK TERBIT; uji balik `lampu_malam_validasi.json` gagal (Palu 2018 tertutup, alarm palsu Bali 2025). Butuh `EARTHDATA_TOKEN` + VNP46A2 LAADS. Jangan disambung ke workflow atau layar. |
| Laporan | `src/laporan_bencana.js` (`lkb_*`, `0048`): laporan harian multi-bahaya per provinsi, bukan perkiraan dampak. `public/banjir/keputusan.js`: biaya-manfaat tahunan per provinsi (bootstrap, stimulan + huntara): rumus uang yang bisa dipakai F4. |

## E. F4 Jitupasna ke R3P Digital

| Komponen | Nyata |
| --- | --- |
| Mesin meja | `src/meja.js` + spek `src/meja_spek.js`: `MEJA` :43, `kaji_cepat` :44, `renkon` :107, `rehab` :133, `gudang` :164, `pengungsi` :178. Rute `src/meja.js:666-681` (`/api/meja/*`). |
| Tabel | `meja_catatan` (`0026`, dibangun ulang di `0110`; `0118_meja_juklak.sql` sedang membangunnya lagi, belum dilacak git): id, `meja` (CHECK daftar), prov, kab, kec, desa, `data` TEXT JSON <= 6.000 karakter, status (CHECK per meja), dibuat, diubah, oleh, petugas_id, dummy, kaji_id, stok, klien_id. Indeks unik `meja_rehab_satu (kaji_id)` dan `meja_rehab_kejadian (prov,kab,kejadian_ref)`; trigger `meja_rehab_tautan` dan `meja_catatan_ubah` (daftar transisi sah). |
| Kaji cepat | `dilaporkan` -> `diverifikasi` (petugas) -> `masuk_jitupasna` (admin). Kolom: rumah_rb/rs/rr, sekolah, faskes, ibadah, jalan_km, jembatan, korban, mengungsi, terancam/terdampak (jiwa, KK), kelompok rentan, kebutuhan, rekomendasi status darurat (Juklak 3/2022). Wajib desa. |
| Rehab | `jitupasna` -> `usulan` (petugas) -> `disetujui`/`ditolak` (admin) -> `cair` (admin) -> `dibangun` (petugas) -> `selesai` (admin). Kolom: kejadian_ref, rumah_rb/rs/rr diusulkan, nilai usulan/disetujui/cair, rumah_dibangun, enam tanggal; `cek` menolak nilai melebihi tahap sebelumnya; tanda `macet` (ASUMSI). TIDAK ada hitungan nilai kerusakan, harga satuan, atau draf R3P; kata R3P/HSBGN tidak ada di `src/` maupun `public/`. |
| Rumah rusak | `src/rumah_rusak.js`, `0024`: bencana, tanggal, lat/lon, prov, kab, kec, tingkat (berat/sedang/ringan), foto, pelapor, status sah/ditolak. Rute `/rumah-rusak`, `/api/rumah-rusak[/rekap]`. Tanpa luas, jenis bangunan, atau nilai. |
| Pemulihan | `src/pemulihan.js` 11 KB, `0096`: `pemulihan` (jenis huntara, huntap, dana_tunggu_hunian, jembatan_gantung, sumur_bor; target, realisasi, satuan, status, `kejadian_id` TANPA FK, sengaja) + `pemulihan_progres`. Rute `/api/pusdalops/pemulihan[/progres, /ringkasan, /:id, /dummy]`. Ini sudah "pemantauan pelaksanaan". |
| Lapangan | `src/lapangan.js` 55 KB (`/api/petugas/*`; tabel `orang`, `lp_tugas`, `lp_absen`, `lp_logbook`, `lp_logbook_foto`, `wa_antre`); vektor wajah tidak keluar Worker. Form luring: SIPPA `public/pipa/antre.js` (IndexedDB, idempoten `ON CONFLICT(id) DO NOTHING`, batas 200 butir). |
| Naskah | `data/kajian-bnpb/naskah/rehab/` (bab 1-12, lampiran A-M, `deck.json`) = buku Grand Design Rehab-Rekon (Sumatra 2025) (R3P sebagai dokumen, bukan skema); paket angka `data/kajian-bnpb/data/{dibi,irbi,turunan,skenario-*}`. |
| Harga satuan | Tidak ada HSBGN atau Perka di repo atau `pustaka.json`. Hanya parameter stimulan di `keputusan.js` dan `turunan/profil_kerugian.csv` (asumsi-kebijakan). U4 tetap terbuka. |

Risiko bentrok F4: CHECK `meja` dan status di `meja_catatan` tidak bisa di-ALTER (butuh bangun ulang, pola 0110/0118; 0118 sedang jalan). Pakai tabel `sk_*` dengan kolom teks penaut tanpa FK (pola `pemulihan.kejadian_id`). Satu rehab satu kaji (indeks unik) dan `data` <= 6.000 karakter tidak muat ratusan rumah; R3P butuh tabel sendiri.

## F. F5 Renkon Hidup dan Gladi

| Komponen | Nyata |
| --- | --- |
| Meja renkon | `src/meja_spek.js:107`: metadata dokumen saja (bencana, judul, tgl_sah, berlaku_sampai bawaan 3 tahun menurut Perban 2/2023 Pasal 21, reviu_terakhir, uji_terakhir, tautan). Tidak ada isi renkon. |
| Pengingat | `src/pengingat.js`: `JENIS` :18 (renkon, rehab_macet, stok_rendah, logistik_lambat, prioritas_dampak, dst.), `SEGERA_HARI = 60`, `buatPengingat` :160, `susunEmail` :223. CHECK `jenis` di tabel `pengingat` (dibangun ulang di `0088`): jenis baru butuh bangun ulang. |
| LogPal | `src/logpal.js` 50 KB (`RUTE_LOGPAL` :436-447): `logpal_gudang`, `logpal_barang` (baik + rusak + belum dinilai), `logpal_mutasi`, `logpal_opname[_baris]`, `logpal_permintaan` (`items` JSON, `jiwa`, tahap maju satu langkah), `logpal_tahap`, `logpal_kebutuhan`, `logpal_statis`, `logpal_bantuan`. Data asli di luar repo. Meja `gudang` adalah stok kedua yang terpisah. Personel: `orang`, `lp_*`, `src/relawan.js` (`siap_tugas`), bot WA `wa_antre`. |
| Replay | `public/banjir/replay.*` + `public/banjir/data/replay/maret2025.{json, bin.gz 1,6 MB, _cari.json 1,6 MB}`. SATU kejadian (Jabodetabek 2-5 Mar 2025, 96 jam, kisi 60 m), model inersia lokal, DEM FABDEM (CC BY-NC-SA 4.0: NC). Validasi 47 laporan: `pod_10cm` 0,043 (0,261 bila 3x3 sel). Label "Model sederhana, bukan prakiraan". Tidak ada pembangkit replay lain. |
| Kebutuhan | `scripts/bnpb/kebutuhan.py` -> `public/banjir/data/kebutuhan_musim.json` (karhutla saja: klimatologi x koefisien ASUMSI x tarif ASUMSI; "perkiraan, belum diuji balik"). `public/data/bnpb/logbook_kebutuhan.json` 868 KB: kebutuhan tercatat di logbook, dasar empiris. |

Risiko bentrok F5: lisensi NC replay; `pengingat` dan `meja` butuh bangun ulang tabel untuk jenis baru.

## G. F6 Risiko Masa Depan dan Tata Ruang

| Komponen | Nyata |
| --- | --- |
| Proyeksi iklim | TIDAK ADA di repo: pencarian NEX-GDDP, CMIP6, CORDEX, SSP hanya menemukan `KEPUTUSAN-AWAL.md`. Yang ada: ERA5-Land dan Open-Meteo (`scripts/air/neraca`, `musim.json`, `iklim_bmkg.json`). Semua sumber F6 baru, tunduk butir 16 dan 29. |
| Profil daerah | `scripts/kemitraan/profil_daerah.py` -> `public/data/kemitraan/daerah/<kode IRBI>.json` x 514 (17 MB total, 30-35 KB tiap berkas, plafon `MAKS_BYTE` 60.000). Blok mencakup wilayah, penduduk, irbi, inarisk_kec, kejadian (tren Theil-Sen), fasilitas, semua bahaya, model, masalah. Tiap blok `{..., sumber, tanggal, yakin}`; `yakin` = resmi, terverifikasi, estimasi-model, asumsi-kebijakan; data hilang = null. Milik agent `kampus`. |
| Indeks risiko, pesisir, kawasan | `scripts/bnpb/risiko.py` -> `risiko_kecamatan.json` (bahaya = maksimum per jenis; kekeringan hipotesis, POD 0,23 FAR 0,93); `risiko_hvc.py` -> `public/data/bnpb/risiko_hvc.json` 171 KB; `ujibalik_risiko.py`; `inarisk_vs_kejadian.py` -> 23 KB; `kerentanan.json`; `kab_prioritas.json`; `ikd.json`, `iku.json`. Pesisir: `scripts/pesisir/abrasi.py` (Landsat sejak 1988, situs terpilih, `abrasi.json` 163 KB, bukan nasional). Kawasan: PIPPIB `public/data/lahan/pippib/*.json`, konsesi `public/data/konsesi2026/*`; tanpa RTRW. |
| Bangunan tumbuh | Hanya Open Buildings (satu epoch, 3 provinsi) dan OSM Jakarta `gedung_kec.json`. GHSL BUILT-S: hanya skrip ubin `scripts/geo/ubin_tahap2.py` (gdal + pmtiles); data mentah tidak ada. `docs/sumber-lapisan.md:23`: lisensi atribusi, status BELUM. Tidak ada deret multi-epoch. |

Risiko bentrok F6: 514 berkas per kabupaten menghabiskan jatah 200 berkas `public/` (butir 28) bila ditiru; pakai satu berkas per provinsi atau R2. Kamus `yakin` kemitraan (4 nilai) perlu disatukan dengan 6 nilai butir 8.

## H. F7 Pintu Tunggal

- `/semua`: `public/semua/{index.html, semua.js, kejadian.js, dampak.js, darurat.js, analisis.js}`, digerakkan `public/bencana.json` + `public/inti/adapter.js` (`ADAPTOR` per id; tanpa adaptor atau data, diam-diam tidak tampil). `kejadian.js`: `PEMBACA` per bencana, `BASI_HARI = 3`, tautan `/<bencana>/k/<kode>`.
- Kepala `public/inti/kepala.js` (menu dari registri, `IKON` 8 SVG); `public/bnpb/pintu.js` (`KARTU`); `public/inti/profil_wilayah.js` (`ProfilWilayah.buka(kode4)`).
- MCP `src/mcp.js` 32 KB: `POST /mcp` stateless. Alat publik: titik_api_terkini, status_kabupaten, laporan_harian, kualitas_udara, peringatan_aktif, daftar_wilayah, riwayat_lokasi, peraturan_bnpb. Alat berkunci `X-API-Key` + cakupan: rumah_rusak, rumah_rusak_rekap, bangunan_terpapar, konsesi_perusahaan, laporan_bnpb (`kunciSah` di `src/api_v1.js`).
- AI `src/ai.js` 37 KB (`RUTE` :383-400): agen, percakapan, pengetahuan FTS5, satu gerbang `tanyaModel`. Alat = alat PUBLIK MCP saja; angka hanya dari hasil alat. Semua `/api/ai/*` butuh sesi staf + `x-pb`.
- Hak: `src/hak.js` (matriks tabel x aksi x pelaku, khusus staf), peran `src/staf.js:23`, `aksesStaf` di `src/admin_halaman.js`; akun instansi `src/instansi.js` (path `/api/instansi`); pemirsa `src/pemirsa.js`.

## I. Temuan yang mengubah rancangan

1. **`K####` tidak stabil** (`scripts/data/harian.py:658` memberi ulang id tiap hari urut skor; `citra.py` memakai sel 0,02 derajat). B, V, C, U, D stabil lewat `nomor.json` (cache CI, bisa kedaluwarsa); G di D1. F1 butuh ID Siklus sendiri yang memetakan (sumber, kode sumber); karhutla lewat sel atau kompleks. Butir 17 benar hanya untuk non-karhutla.
2. **Tiga kunci wilayah**; `wilayah.json` 513 kab, kemitraan dan IRBI 514. Tambahkan butir kanonik (usul BPS 4 digit) dengan jembatan `kab_kunci` dan `hvc_dasar.kab_kode`.
3. **DIBI harian di repo hanya setahun** (4.404 baris). Riwayat 2011-2026 (57.161 baris) hanya di mesin pemilik; Buku Besar historis di CI butuh langkah unggah ke R2 yang belum ada.
4. **`logbook_kejadian.csv` dilacak git dan kotor** (644 tanggal kosong, sekitar 10 tahun mustahil), padahal rekonsiliasi sengaja tanpa baris kejadian. Putuskan: agregat publik saja, atau baris di R2/D1 staf.
5. **Meja `dampak` (Juklak 7/2023) dan migrasi `0118` ditulis sesi lain**, memegang `meja_catatan` dan pemasangan kejadian. Tetapkan satu pemilik pemasangan (`kunci_kejadian.pasangkan`); migrasi Siklus mulai 0119 atau lebih (cek saat tiket).
6. **F3 gempa jauh lebih siap daripada banjir** (MMI per kecamatan, PAGER, kalibrasi; model meleset sampai 5 kali; rumah rusak gempa tidak ada). "ShakeMap" di butir 19 keliru: hanya nama PNG BMKG dan warna PAGER; yang dipakai `guncangan.py`.
7. **F3 banjir tanpa genangan per kejadian**: S1 = deret per kabupaten, manual, pilot 20 kab, tanpa pembaca; GFM hanya Jakarta. Jam pertama = kecamatan Siaga/Awas x penduduk x `dampak.json`.
8. **`lampu_malam.py` belum layak terbit** (uji balik gagal, butuh `EARTHDATA_TOKEN`). Butir 19: mesin ada, fungsi `malam()` belum valid.
9. **F2 baru 3 provinsi** (13, 33, 63), lokal; 35 lain tidak terverifikasi di R2 atau cache. InaRISK tidak disimpan, jadi kelas bahaya per bangunan butuh sampling per sel. `halus_33.json` 19,7 MB: 38 provinsi mendekati plafon butir 27.
10. **F4 tanpa skema R3P, harga satuan, atau nilai kerusakan** (U4 terbuka). Pakai `sk_*`, jangan menambah meja ke `meja_catatan`.
11. **F5: replay satu kejadian**, DEM NC, POD 0,04 sampai 0,26. Gladi nyata lebih masuk akal dari `logbook_entri` + `logbook_kebutuhan.json`. Renkon meja hanya metadata; isinya lahir di `sk_*`.
12. **F6 tanpa data proyeksi iklim**, GHSL tanpa data mentah; semua sumber baru wajib masuk registri (`peta-data`). Kamus `yakin` kemitraan (4 nilai) disatukan dengan 6 nilai butir 8.
13. **JS dan CSS statis terbuka**: hanya `.html` dan `/logpal/*` lewat Worker. Halaman staf Siklus mengambil data lewat API bersesi, atau `/siklus/*` ditambah ke `run_worker_first`; butir 14 dan 15 butuh putusan.
14. **Tidak ada `uji:siklus`, `tests/e2e`, atau gerbang-dummy di repo**; `RENCANA-UJI.md` memilih `cakupan.json` atau registri sendiri.
15. **Peran staf tidak cukup** (10 peran; Juklak Q1 mengubah daftar yang sama): terjemahkan butir 15 ke peran yang ada atau peran baru lewat migrasi trigger `staf_larik_sah`.
16. **Panen S1 dan lampu malam belum punya pemakai nyata**; gerbang `peta-data` menolaknya. Jangan sebut "sudah ada" sebelum F3 membacanya.
