# Kualitas udara dan asap

Pengerja: agen `cuaca-udara` (satu agen untuk cuaca dan udara). Urutan: 4. Modul sendiri yang mencakup asap karhutla dan polusi; asap karhutla dibaca dari data karhutla tanpa mengubahnya.
Ringkasan paritas: `PARITAS-UDARA.md`.

**Audit 15 Nov 2026, HEAD `f3ab401e2`** (kode dibaca ulang baris demi baris; data live dari `centurisk97.id`, hanya GET; self-check dan uji dijalankan hari ini). Hitungan 113 komponen `PAKET-FITUR.md` (A01-F04): **ADA 69** (dibuat 52, diadaptasi 17), **SEBAGIAN 22**, **BELUM 16**, **TIDAK BERLAKU 6**. Banding audit 19 Okt malam: ADA 65 / SEBAGIAN 25 / BELUM 17 / TIDAK BERLAKU 6. Komponen baru G01-G11 (di bawah tabel): ADA 3, SEBAGIAN 2, BELUM 3, TIDAK BERLAKU 3.

Temuan utama 15 Nov: pengamatan BMKG masuk (PM2,5 27 stasiun, kualitas bulanan, TROPOMI, awan Himawari), kejadian U dan riwayat/musim kini live, prakiraan metar_prakiraan terisi, PM2,5 dinilai di /prediksi, lintasan asap menyuplai seksi semai. Tetap lemah: ISPU resmi KLHK tidak terjangkau, koreksi bias stasiun tidak aktif (`n_stasiun` 0), skor METAR turun (hit 35,1%, FAR 34,8%, CSI 29,6%), tidak ada saran kesehatan resmi, Dalops, EWS/CAP, laporan berkala, atau dokumen riset.

Catatan kebijakan: `PAKET-FITUR.md` melarang status `aktif` selama ada baris "belum". Registry sudah `aktif` lewat tahap buka bertahap (`tests/agen/gerbang-bencana.test.mjs`, tabel TAHAP) dan tidak ada gerbang yang membaca tabel ini, jadi baris sebagian dan belum di bawah ditulis apa adanya dan keputusan membukanya tetap milik pemilik.

## 1. Identitas registry (keadaan sebenarnya)

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `udara` / `/udara/` (halaman tambahan `/udara/laporan.html`; Simulasi adalah tab) |
| `kejadian.awalan` | `U` (registry: "Stasiun tercemar"; isi sebenarnya: gugus kab/kota PM2,5 24 jam di atas 55,4 µg/m³) |
| `cron_worker` | kosong: CAMS terbit dua kali sehari, tidak ada tugas Worker; jarak pandang tiap jam lewat `jarak_pandang.yml` |
| Pipeline | `udara.yml` 06.40 dan 18.40 UTC menjalankan `scripts/udara/jalan.py` (angin, prakiraan, riwayat, musim_asap, lintasan, atribusi, rentan, laporan_udara, asal, peluang_udara) dan mengomit `public/udara/data`; `lintas.yml` menjalankan berita, dampak, dan kejadian U |
| Tab | peta, insight, berita, tren, kejadian, dampak, simulasi, foto, tentang, informasi, metode; `informasi` dan `metode` tersembunyi. Kejadian kini punya data live |
| `sumber_status` | kualitas = `/udara/data/prakiraan.json` (18 jam), berita_udara (30 jam) |

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| ISPU resmi KLHK | tidak terjangkau dari CI | **tidak ada**; diakui di Metode |
| Stasiun terukur | WAQI opsional tidak aktif; PM2,5 stasiun BMKG (27 stasiun, `bmkg_pm25.json`) tampil sebagai pengamatan | koreksi bias tidak aktif: `koreksi.status` "belum", `n_stasiun` 0 (live 15 Nov); MOS dari stasiun BMKG di `openaq_mos.json` |
| Pengamatan | METAR jarak pandang (NOAA/IEM), 14 bandara | Titik bandara dan bahan uji hindcast |
| Tingkat Pantau Bencana | PM2,5 CAMS rata-rata 24 jam, titik potong P.14/2020 (55,4/150,4/250,4) | Normal/Waspada/Siaga/Awas per kab/kota; selalu berpil "perkiraan model CAMS, belum dikoreksi" |

Kategori (registry): Baik 0-15,5, Sedang sampai 55,4, Tidak sehat sampai 150,4, Sangat tidak sehat sampai 250,4, Berbahaya di atasnya (PM2,5 24 jam, µg/m³). Nilai per jam disebut "PM2,5 per jam", bukan kategori.
Data CAMS: `jalan_model` 18 Okt 12.00 UTC pada terbitan 19 Okt 07.42 UTC (umur model ±20 jam saat terbit).

## 3. Kejadian

`scripts/umum/kejadian.py:244`: gugus kab/kota bersebelahan dengan PM2,5 24 jam di atas 55,4, masa aktif 2 hari. `kejadian_udara_awal.json` (6 kejadian, dibuat 14 Nov 16.58 WIB) dan `_geo.json` terbit live; laporan per kasus di `public/udara/data/kejadian/` (9 berkas + indeks). Tidak ada `tugas_udara.json` (G01).

## 4. Model dan uji balik

- CAMS global (±40 km) per kab/kota, plume atribusi api/PLTU/latar (`atribusi.py`), lintasan maju (`lintasan.py`) dan mundur (`asal.py`), simulasi partikel Lagrangian di peramban, peluang dari 729 varian (`peluang_udara.py`).
- Koreksi bias per stasiun dikodekan tetapi tidak aktif (tanpa data stasiun).
- Uji (live 15 Nov): hindcast CAMS vs METAR HZ/FU, 810 hari-bandara, 27 bandara: hit 35,1%, FAR 34,8%, CSI 29,6%; prakiraan (`metar_prakiraan`, n=702): hit 27,9%, FAR 45,7%, CSI 22,6%. Bukan stasiun ukur. Angka 19 Okt (45,3 / 15,8 / 41,8) basi.
- 108 dari 415 kota ditandai tak terpercaya di atribusi (model sumber >1,5x CAMS) dan tidak diberi persen.

## 5. Layar, warga, dan media (keadaan sebenarnya)

- Peta: status 514 kota, PM2,5 interpolasi, lintasan asap, jarak pandang bandara, GIBS CO, lapisan konteks. Insight 8 kartu; Dampak 4 bagian; Simulasi 3D dengan 6 skenario; Berita 5 kartu.
- Tren 5 kartu; `riwayat.json` dan `musim_asap.json` kini terbit sehingga kartunya terisi. Insight: 9 kartu terdaftar di `insight.js:13` ditambah kartu `prakiraan.js`.
- Warga: jenis `asap_tebal`, `sesak_napas`, `jarak_pandang` ada di server dan katalog; tab Informasi tidak dipasang. Foto: asap atau kabut, jarak pandang, lainnya (foto dummy dipensiunkan pemilik 11 Nov).
- Saran kesehatan per kategori sengaja tidak ditulis (belum ada teks resmi yang bisa dikutip).

## 6. Tabel 113 baris

Status: `dibuat` dan `diadaptasi` = ADA (diadaptasi = bentuk berbeda karena domain, alasan tertulis); `sebagian` = ada tetapi tidak memenuhi gerbang atau belum tayang; `belum` = tidak ada; `tidak berlaku` = alasan satu kalimat. Paritas diukur terhadap karhutla yang TAMPIL (tab Dashboard, Posko, Informasi, Kompleks, Metode karhutla tersembunyi, dan kartu uji/galat model di Insight).

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | diadaptasi | Sumber utama model CAMS (Open-Meteo Air Quality, 514 kab/kota, `scripts/udara/prakiraan.py`), kini ditambah pengamatan: PM2,5 stasiun BMKG per jam (`scripts/udara/bmkg_pm25.py`, langkah di `scripts/udara/jalan.py:17`; live `udara/data/bmkg_pm25.json` 200, 27 stasiun, dibuat 15 Nov 03.05Z) dan METAR jarak pandang (`jarak_pandang.json`, `jarak_pandang.yml`). Stasiun WAQI tetap tidak ada (`koreksi.n_stasiun` 0 di `prakiraan.json`). |
| A02 | Varian keluaran bertingkat | sebagian | Tidak ada potongan 24/72/semua. Satu `prakiraan.json` 72 jam per jam (442 KB, 514 kota) + riwayat r24 31-120 hari di cache + `laporan.json` 32 hari. |
| A03 | Pengamatan hampir-waktu-nyata | diadaptasi | Pengamatan hampir waktu nyata hanya untuk jarak pandang: `.github/workflows/jarak_pandang.yml` tiap jam 22-10 UTC (`udara/data/jarak_pandang.json` live dibuat 15 Nov 11.59 WIB). PM2,5 BMKG ikut jadwal `udara.yml` 06.40 dan 18.40 UTC; tidak ada `cron_worker` (CAMS terbit dua kali sehari). |
| A04 | Entitas kejadian aktif | dibuat | Kode U#### dari `scripts/umum/kejadian.py:244` (`adaptor_udara`: gugus kab bersebelahan PM2,5 24 jam >55,4, masa aktif 2 hari `:32`). Live 15 Nov: `banjir/data/kejadian_udara_awal.json` 200 (6 kejadian, dibuat 14 Nov 16.58 WIB), `_geo.json` 200 (145 KB); laporan per kasus `udara/data/kejadian/index-udara.json` 200 + 9 berkas `udara-NNNN.json`. |
| A05 | Atribut kejadian | sebagian | Atribut kejadian: PM2,5 maks, kab, jiwa, pusat. Belum ada polutan dominan, durasi jam, sumber dugaan, atau tautan kompleks karhutla di kejadian (atribusi ada di laci kota, bukan kejadian). |
| A06 | Geometri dampak | dibuat | Peta PM2,5 diinterpolasi dari titik kab/kota ke sel 0,25 derajat (`public/udara/peta.js:44`). Poligon kejadian `kejadian_udara_geo.json` live 200, 145 KB, dimuat malas. |
| A07 | Pemecahan muatan | dibuat | Pemisahan `_awal` (2,7 KB) dan `_geo` (145 KB) kini terbit live; plafon muat /udara/ 710 KB di `tests/beban/ukur_muat.mjs:51` (terukur 618 KB, `:49`). |
| A08 | Cuaca pendukung | dibuat | `scripts/udara/angin.py`: angin 10 m, 925 dan 850 hPa + tinggi lapisan batas, tiap 3 jam, kisi 1 derajat (846 titik/jalan), kuota tertulis di docstring. |
| A09 | Indeks bahaya harian | diadaptasi | ISPU dihitung hanya dari PM2,5 rata-rata 24 jam dengan titik potong P.14/2020 (`scripts/udara/alat.py:18`, `kualitas.py`, `public/udara/murni.js:5`), tanpa PM10/O3/NO2/SO2/CO; berlabel "perkiraan model, bukan ISPU resmi". Titik potong diuji `tests/udara/layar.test.mjs:6`. |
| A10 | Prakiraan ansambel | diadaptasi | Tidak ada ansambel CAMS. `scripts/udara/peluang_udara.py` memakai 729 varian (27 sebaran x 27 emisi) = sensitivitas asumsi atribusi, bukan ketidakpastian atmosfer; galat CAMS tidak masuk (`peluang_udara.py:3-9`). Peluang melewati 55,4/150,4/250,4 per kab 3 hari (`peluang.json`, 463 wilayah). |
| A11 | Kondisi latar | belum | Tidak ada anomali PM2,5 terhadap klimatologi; arsip CAMS di repo hanya 31-120 hari (`scripts/udara/musim_asap.py:8`). |
| A12 | Indeks khusus tambahan | sebagian | Atribusi sumber PM2,5 api/PLTU/latar (plume Gauss + Briggs, `scripts/udara/atribusi.py`; `atribusi.json` live 313 KB, dibuat 15 Nov 03.04Z; 307 kota terpercaya, 108 tidak: model >1,5x CAMS pada 19 Okt, tidak dihitung ulang). Ditambah CO dan Aerosol Index TROPOMI (`scripts/udara/tropomi.py`, `tropomi_seri.json`). Tampil di Insight "Sumber asap" dan laci kota; tidak ada indeks riset yang lolos uji pembanding. |
| A13 | Aturan status 4 tingkat | dibuat | Normal/Waspada/Siaga/Awas dari r24 55,4/150,4/250,4 (`murni.js:5-11`, `kualitas.py`); registry memakai 5 kategori Baik-Berbahaya (`public/bencana.json`). Status resmi KLHK tidak ada (A20). |
| A14 | Prioritas | belum | `prioritas: []` (`public/bencana.json` (blok registry)); tidak ada ambang prioritas dari uji balik. |
| A15 | Risiko riwayat 0–100 | belum | Tidak ada risiko riwayat 0-100 untuk udara. |
| A16 | Kalender musim | sebagian | `scripts/udara/musim_asap.py` -> `musim_asap.json` (live 200, 1,2 KB, `sd` 2026-11-15): median titik panas nasional per bulan + min/maks; penanda musim bakar, bukan ukuran asap; nasional, bukan per dasarian per provinsi. |
| A17 | Iklim | dibuat | `public/data/iklim.json` (ONI, IOD) dipakai bersama dan dibaca `musim_asap.py`; kartu ENSO Tren (`public/udara/tren.js:92` memuat `enso`). |
| A18 | Riwayat grid dan sejarah | sebagian | Riwayat analisis CAMS di `laporan.json` (live 136 KB, dibuat 15 Nov 10.04 WIB) dan cache `r24_kota.json`; `riwayat.json` kini live 200 (31 KB, kolom `tgl`, `prov`). Arsip PM2,5 stasiun multi-tahun lewat `scripts/udara/openaq_arsip.py` (data/raw, tidak di-commit, tidak dijadwalkan). Bukan arsip CAMS sejak 2013. |
| A19 | Statistik per provinsi | dibuat | `laporan.json` nasional + 38 provinsi + 365 kab (live 163 KB), `prakiraan.json` per kab, `riwayat.py` per provinsi. |
| A20 | Data lembaga | sebagian | Data lembaga kini ada sebagian: PM2,5 stasiun BMKG (pengukuran, `bmkg_pm25.json`) dan kualitas udara bulanan BMKG (SPM, ozon, SO2, NO2; `kualitas_bmkg.json` + `kualitas_bmkg_arsip.json`, `scripts/udara/kualitas_bmkg.py` di `arsip-bmkg.yml`; live dibuat 13 Nov, bulanan, `tertinggal_bulan` jujur). ISPU resmi KLHK tetap tidak terjangkau dan tidak ditampilkan (`public/udara/metode.js:26`). |
| A21 | Posko | belum | "Ruang udara bersih" tidak ada; tidak ada data sekolah/fasilitas berpemurni udara. |
| A22 | Operasi | tidak berlaku | Udara tidak punya operasi lapangan atau kebutuhan alat berat/tenda; langkah warga masuk saran kesehatan (A25). |
| A23 | Aset udara | tidak berlaku | Aset udara (heli, OMC) adalah respons karhutla; udara hanya membaca asap dari kompleks karhutla. |
| A24 | Keputusan ekonomi | sebagian | Beban kesehatan: tambahan kasus ISPA per hari dengan selang rendah-tinggi dari CI RR (`scripts/udara/rentan.py:20`, proksi Heroux 2015/HRAPIE); tanpa rupiah (`public/udara/dampak.js:5`) dan tanpa Monte Carlo keputusan. |
| A25 | Preventif | belum | Tidak ada saran kesehatan atau mitigasi: sengaja tidak ditulis karena belum ada teks resmi Kemenkes/KLHK yang bisa dikutip (`public/udara/kejadian.js:5-6`). |
| A26 | Penanggung jawab lahan | dibuat | Lintasan dan asal asap menyebut badan usaha pemegang konsesi dan PLTU saja (`scripts/udara/lintasan.py`, `asal.py`, `namaBag` `public/udara/prakiraan.js:15`), dengan catatan "lokasi titik panas di areal izin, bukan penetapan pembakar". |
| A27 | Dampak | dibuat | `rentan.py` (balita, lansia, ISPA, sekolah, bandara; 9 asumsi bernama) dan `dampak_udara.py` (kecamatan >55,4: penduduk, sekolah, siswa, faskes, RS). |
| A28 | Paparan penduduk | dibuat | WorldPop per kab/kota (`kota.json` jiwa, `kota.py`); live: sekitar 92 juta jiwa di kategori tidak sehat+ hari ini (perkiraan model). |
| A29 | Sekolah dan fasilitas | dibuat | 300 sekolah berisiko di `rentan.json` (Dapodik/EMIS), faskes di `dampak_udara.py`, lapisan konteks "Sekolah & faskes" (`konteks.js:15`). |
| A30 | Muatan Dashboard | belum | Tidak ada Dashboard/`ringkasan.json` (karhutla menyembunyikannya). |
| A31 | Cuaca per jam untuk simulasi | dibuat | `angin.json` (506 KB live) 3 lapis x 72 jam untuk lintasan dan Simulasi. |
| A32 | Citra satelit | diadaptasi | GIBS AIRS karbon monoksida (`public/inti/peta/nasa.js:10`, dipasang `Peta.init`), TROPOMI CO dan Aerosol Index (`scripts/udara/tropomi.py`, `tropomi_kisi.json` live; butuh `EARTHDATA_TOKEN`, `udara.yml`), awan dingin Himawari-9 per kabupaten (`scripts/udara/awan_himawari.py`, `awan_himawari.json`, `arsip-bmkg.yml`; dibuat 13 Nov). Sentinel sebelum/sesudah tidak relevan. |
| A33 | Berita | sebagian | `scripts/udara/berita.py` -> `berita_udara.json` (1.500 artikel, 235 kab; live dibuat 19 Okt 10.52 UTC via `lintas.yml:112`). Sentimen tak teruji, tanpa label uji >=200. |
| A34 | Video | belum | Tidak ada video (`public/udara/berita.js:6`). |
| A35 | Data sektor | dibuat | METAR jarak pandang 14 bandara (`rentan.json`, lapisan "Jarak pandang bandara"), rumus Koschmieder di `rentan.py`, 27 bandara dalam uji METAR. |
| A36 | Kurasi tangan | belum | Tidak ada berkas kurasi tangan; `pltu.json` adalah dataset WRI, bukan kurasi. |
| A37 | Meta | dibuat | `public/udara/data/meta.json` dan `prakiraan.json.dibuat`; `/api/status` kualitas umur 5,2 jam (ambang 18). |
| A38 | Data statis bulanan | sebagian | `pltu.json` (WRI GPPD v1.3, `scripts/udara/pltu.py:3`) dan `kota.json` (`kota.py:3`) dibangun sekali dengan tangan, tidak dijadwalkan di `statis.yml` (grep 15 Nov: tak ada). |
| A39 | Seri jangka pendek bergulir | dibuat | `laporan.json` 32 hari per kab/provinsi/nasional (kontrak LAPORAN-HARIAN, `scripts/udara/laporan_udara.py`), `r24_kota` bergulir 120 hari, `riwayat.json` kini terbit, halaman `/udara/laporan.html`. |
| A40 | Data respons dan kontak | belum | Tidak ada unit respons atau kontak untuk udara. |
| B01 | Model prakiraan | sebagian | CAMS + plume atribusi + simulasi Lagrangian ada. Koreksi bias stasiun dikodekan (`prakiraan.py`) tetapi tidak aktif: `koreksi.status` "belum", `n_stasiun` 0, `faktor_median` 1,0 (live 15 Nov). Penggantinya MOS PM2,5 dari 27 stasiun BMKG (`scripts/udara/openaq_mos.py`, `openaq_mos.json` dibuat 15 Nov; OpenAQ "MENUNGGU KUNCI") dan ensambel GEOS-CF (`geoscf.py`, `geoscf.json` dibuat 1 Nov, basi 14 hari) yang belum menjadi angka layar utama. |
| B02 | Uji balik aturan status | diadaptasi | Hindcast CAMS vs METAR HZ/FU (810 hari-bandara, 27 bandara), live 15 Nov: hit 35,1%, FAR 34,8%, CSI 29,6% (`prakiraan.json` `galat.metar`); angka 19 Okt (45,3 / 15,8 / 41,8) sudah tidak berlaku. Bukan terhadap stasiun. Uji MOS/ensambel waktu 60/40 di `scripts/udara/pm25_mos.py` dan `uji_panen.py` (`uji_panen_pm25.json`, 30 Okt). |
| B03 | Prospektif | diadaptasi | `galat.metar_prakiraan` kini terisi (live 15 Nov: n=702 hari-bandara, hit 27,9%, FAR 45,7%, CSI 22,6%; sebelumnya null); `arsip_jalan` maks 90 hari; PM2,5 CAMS dinilai juga di `/prediksi` (kode ASP, `scripts/prediksi/catat.py:17,259`). Dinilai terhadap METAR, bukan stasiun ukur. |
| B04 | Kasus historis | belum | Tidak ada galeri episode asap besar (2015, 2019, 2023). |
| B05 | Galat dan pendorong | sebagian | Galat METAR (tabel hit/luput/alarm palsu/benar negatif) ada untuk analisis dan prakiraan; galat stasiun `null`; "pendorong" hanya atribusi (A12). |
| B06 | Tren jangka panjang | belum | Tidak ada uji tren jangka panjang. |
| B07 | Kesetaraan Python↔JS | sebagian | Titik potong ada di `scripts/udara/alat.py:18` (Python) dan `public/udara/murni.js:5`, `app.js`, `sim/model.js` (JS); tiap sisi diuji sendiri (`tests/udara/layar.test.mjs`, `sim.test.mjs`; 15 Nov 54 uji lulus untuk cuaca+udara), tidak ada uji silang Python-JS. |
| B08 | Selang ketidakpastian | diadaptasi | `peluang.json`: P10/P50/P90 dan peluang melewati 3 ambang dari 729 varian; hanya sensitivitas asumsi atribusi, galat CAMS tidak masuk (`peluang_udara.py:3-9`). |
| B09 | Kinerja tercatat | dibuat | Hit/FAR/CSI + CI ditampilkan di kartu "Galat model" (`public/udara/prakiraan.js:109` `exGalat`) dan Metode; tiap kartu berangka berpil "perkiraan model CAMS, belum dikoreksi" (`PIL_MODEL`); kartu `rapor` dan `kualitas` di Insight (`public/udara/insight.js:13`). |
| B10 | Dokumen riset | belum | Tidak ada `scripts/udara/RISET-*.md`. |
| C01 | Kepala + menu bencana | dibuat | `details.bencana` di `public/udara/index.html` + `inti/kepala.js`. |
| C02 | Tab dan URL bersih | dibuat | `/udara/<tab>` dan `/udara/k/U0001` (`public/udara/mulai.js`), tab sembunyi `informasi`, `metode` (registry). Tab Kejadian kini punya data live (A04). Simulasi adalah tab. |
| C03 | Tema terang/gelap | dibuat | Tema `pb-tema` bersama (`app.js`). |
| C04 | Waktu data | dibuat | `#upd` dari `prakiraan.json` (live 15 Nov: dibuat 03.04Z, `/api/status` kualitas umur 3,8 jam, ambang 18). |
| C05 | Panel kiri | diadaptasi | Crumb + pil model + cari provinsi + tabel 39 baris provinsi yang bisa diurut (`public/udara/index.html:62-82`); tanpa mode. |
| C06 | Rentang waktu | diadaptasi | Seg 3 hari + geser jam 72 jam per kota (`#jamKota`); tanpa chip rentang. |
| C07 | Garis waktu prakiraan | dibuat | `#garisWaktu` hari, `#jamKota` geser jam, pilihan lapis angin (`public/udara/prakiraan.js`). |
| C08 | Panel lapisan | diadaptasi | Ubin Status kota, Lintasan asap, PM2,5, Satelit, Penduduk, Sekolah & faskes, Jarak pandang bandara (hanya bila METAR segar); CO AIRS lewat `nasa.js`. Jumlah ubin tidak dihitung ulang 15 Nov. |
| C09 | Choropleth wilayah + kartu hover | dibuat | Raster PM2,5 interpolasi (`peta.js:44`), `prov-fill` untuk hover/klik provinsi (`:46`), kartu hover bersama. |
| C10 | Gelembung cluster | diadaptasi | 514 titik kota berwarna status dengan `circle-sort-key` sehingga yang terparah di atas (`prakiraan.js:38`); bukan klaster angka. |
| C11 | Popup titik | dibuat | Hover/klik titik kota (PM2,5, status) dan METAR (jarak pandang, kelas). |
| C12 | Laci kejadian | sebagian | Laci provinsi (PM2,5 per hari, jiwa per kategori, kab paling terpapar) dan laci kota (4 hari, grafik 72 jam, atribusi api/PLTU/latar, tautan kompleks karhutla; `prakiraan.js:92-98`); laci kejadian ringkas (`kejadian.js:laci`). Tanpa saran kesehatan, sekolah/RS terdekat, riwayat, tautan simulasi. |
| C13 | Legenda | dibuat | `#legenda` dok (kelas PM2,5 24 jam, jarak pandang). |
| C14 | Insight | diadaptasi | `public/udara/insight.js:13` mendaftar 9 kartu (jiwa, kab, pel, asal, jarak, bmkg, kualitas, tropo, rapor) ditambah kartu dari `public/udara/prakiraan.js` (Prakiraan 72 jam, Galat model, Sumber asap). Tanpa "hari Tidak Sehat per kota per tahun" (data multi-tahun tidak ada). Beberapa kepala kartu masih kalimat temuan dan memakai kaki "Sumber:" (`insight.js:40`), melanggar `AGENTS.md` 3.5. |
| C15 | Tabel kejadian | dibuat | Tab Kejadian lengkap (`public/udara/kejadian.js`) dengan data live `kejadian_udara_awal.json` (6 kejadian) dan `_geo.json`. |
| C16 | Cerita | belum | Tidak ada `cerita_udara.js`. |
| C17 | Berita | sebagian | 5 kartu (live 3.340 berita/30 hari); tanpa sentimen, video, internasional (`berita.js:6`). |
| C18 | Tren | diadaptasi | 5 kartu (`public/udara/tren.js:92`: jiwa, rata, provinsi, musim, enso); `riwayat.json` dan `musim_asap.json` kini live 200 sehingga kartunya terisi (dulu 404). Indeks risiko 0-100 tidak ada. |
| C19 | Posko, Sarana, Operasi, Keputusan | belum | Tidak ada Posko/Sarana/Operasi/Keputusan. |
| C20 | Dampak | diadaptasi | 4 bagian (Balita dan lansia, Kasus ISPA, Sekolah berisiko, Jarak pandang bandara; `public/udara/dampak.js:9`); tanpa korban/kerugian (BNPB tidak mencatat udara), tanpa emisi. |
| C21 | Dashboard pimpinan | belum | Tidak ada Dashboard pimpinan. |
| C22 | Metode | sebagian | Metode ada (`public/udara/metode.js`): kategori, sumber, cara hitung, batasan, prakiraan, lintasan, atribusi, rentan, simulasi, peluang, asal; mengakui ISPU resmi dan koreksi stasiun belum ada (`:26`). Tanpa contoh hitung hari ini; baris "Berita: diperbarui tangan" (`:18`, `:51`) basi karena berita dijalankan harian di `lintas.yml`. |
| C23 | Simulasi | dibuat | Simulasi partikel Lagrangian di peramban (`public/udara/sim/model.js`, 15 uji `tests/udara/sim.test.mjs`), tampilan 3D (`tiga.js`), 6 skenario (Dasar, Api padam 50%, Padamkan kompleks, Angin berbalik, Angin melemah, PLTU mati; `model.js:248-255`) dan daftar batas model. |
| C24 | Lapor Warga | sebagian | Server dan katalog siap: 3 jenis udara (`public/informasi_jenis.js:99-103`), migrasi 0020. Jenis lama karhutla `udara/sehat/ruang` tetap bahaya karhutla (`:47,53`, tidak dipindah). Tab Informasi tidak terpasang di /udara. |
| C25 | Foto lapangan | dibuat | `public/udara/foto.js:4` + `public/foto.js` bersama; kategori asap/jarak_pandang/lainnya dari registry. Foto dummy berlisensi masih tertinggal di `public/img/dummy/udara/` tetapi data dummy dipensiunkan pemilik (11 Nov). |
| C26 | Pop-up situasi hari ini | dibuat | `public/udara/sapa.js` lewat `inti/sapa.js`, kunci `pb_sapa_udara`. |
| C27 | Bagikan | dibuat | `public/udara/bagikan.js:10` tema `udara`. |
| C28 | OG per rute | dibuat | `src/og_meta.js` memetakan `/udara/` dan `/udara/k/U…`; `/data/og/udara.png` live 200 (`scripts/og/buat.py:167`). |
| C29 | i18n EN | sebagian | `scripts/i18n/kumpul.mjs:107` memuat /udara/. `scripts/i18n/laporan.json` terakhir diukur 15 Okt, tidak diukur ulang; kartu baru (bmkg, kualitas, tropo, rapor) belum terbukti nol kebocoran. |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | `persetujuan.js`, `jejak.js`, `kaki.js`, `pesan.js` terunduh di live. |
| C31 | Muat / kosong / galat / luring | sebagian | Spinner muat, pesan kosong per tab, kartu tanpa data dibuang; Simulasi punya cadangan "Simulasi belum tersedia" (`prakiraan.js:Simulasi.render`); keadaan luring tidak ada. |
| C32 | Mobile 375 px | sebagian | Terakhir diukur manual 19 Okt (emulasi 375x812, `scrollWidth` 375, delapan tab); tidak diukur ulang 15 Nov, tidak ada uji otomatis, dan kartu bertambah. Diturunkan sampai ada uji. |
| C33 | Klik tidak membekukan | dibuat | `nanti()` (`public/udara/app.js:4`); simulasi berat berjalan bertahap di `requestAnimationFrame` (`public/udara/sim/sim.js:1`); jejak `inp-reviewer`. Tidak diukur ulang hari ini. |
| C34 | Halaman Tentang dan kartu bencana | dibuat | Tab Tentang (iframe) dan kartu bencana di Tentang. |
| C35 | Statistik publik | dibuat | `src/statistik.js:18` `HAL` dari registry. |
| C36 | Admin moderasi | sebagian | Admin foto memakai pemilah bencana dari registry, tetapi `public/admin/foto.js:1,21` masih memuat tombol dummy padahal pemilik mensyaratkan disembunyikan (11 Nov). Pemilik berkas: `warga-api`. |
| C37 | Bagikan lanjutan | diadaptasi | `bagi.js` (QR, WhatsApp, UTM) terunduh di live; "Bagikan video" tidak ada. |
| C38 | Lapisan tambahan | diadaptasi | Lapisan konteks registry (penduduk, sekolah+faskes) + GIBS CO; tanpa lapisan khas karhutla. |
| C39 | Kaki dan Tentang | dibuat | `kaki.js` dan halaman Tentang bersama. |
| D01 | Rute HTML | dibuat | Rute `/udara/`, `/udara/k/…` dari `src/bencana.generated.js`; live 200. |
| D02 | Route data cepat | tidak berlaku | Tidak ada route cepat: data statis `/udara/data/*.json` yang terbit dua kali sehari. |
| D03 | Cron | tidak berlaku | `cron_worker: []` (`public/bencana.json` (blok registry)); tidak ada tugas Worker. |
| D04 | Status kesegaran | dibuat | `sumber_status`: kualitas = `prakiraan.json` (ambang 18 jam), berita_udara (30 jam) (registry blok udara); live 15 Nov `/api/status` `basi: []`, kualitas umur 3,8 jam, berita_udara 20,9 jam. |
| D05 | Lapor warga | dibuat | `laporan.bahaya='udara'` + 3 jenis (migrasi 0020, `src/worker.js`); antarmuka belum terpasang (C24). |
| D06 | Foto | dibuat | `foto.bencana` (migrasi 0013), `KAT_BENCANA`; `tests/warga/foto_bencana.test.mjs`. |
| D07 | Statistik | dibuat | `stat_hari.hal` dari registry (migrasi 0017). |
| D08 | OG meta | dibuat | `src/og_meta.js` membaca registry. |
| D09 | Dummy | tidak berlaku | Pemilik mempensiunkan data dummy dan tombol 🧪/🧹 pada 11 Nov 2026. |
| D10 | Privasi | dibuat | Mesin bersama (hash IP bergaram, DNT/GPC); jalur udara tidak menyimpan data pribadi baru. |
| E01 | Self-check per skrip | dibuat | 15 Nov: `python3 scripts/udara/<skrip>.py uji` hijau untuk 20 skrip (alat, angin, asal, atribusi, bmkg_pm25, dampak_udara, geoscf, kota, kualitas, kualitas_bmkg, laporan_udara, lintasan, musim_asap, openaq_mos, peluang_udara, pltu, prakiraan, rentan, riwayat, tropomi); `udara.yml` menjalankan `uji` tiap skrip sebelum pipeline (`:57-61`). Belum dijalankan ulang hari ini: `berita`, `isi_riwayat`, `openaq_arsip`, `pm25_1km`, `pm25_mos`, `uji_panen`. |
| E02 | Cakupan route/tabel | tidak berlaku | Udara tidak menambah route atau tabel Worker; `cakupan.json` tidak punya baris udara. |
| E03 | Skema D1 | dibuat | Katalog jenis laporan vs migrasi 0020 dijaga dua arah oleh `tests/warga/skema.test.mjs`. |
| E04 | Registry | dibuat | 15 Nov: `node --test tests/agen/gerbang-bencana.test.mjs tests/agen/gerbang-ilmu-agent.test.mjs tests/agen/gerbang-inti.test.mjs` 16 dari 16 hijau. |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau. |
| E06 | Kesegaran data | dibuat | `/api/status` memuat kualitas dan berita_udara (live: tak ada yang basi); `jaga.yml`. |
| E07 | Beban | dibuat | `tests/beban/beban.mjs:27` /udara/ bobot 4; `ukur_muat.mjs:49-51` terukur 618 KB, plafon 710 KB. |
| E08 | i18n | sebagian | Crawl dua arah mencakup /udara/ (`kumpul.mjs:107`) tetapi kebocoran 5-10, bukan nol. |
| E09 | Kepemilikan berkas | dibuat | Semua berkas dimiliki agen `cuaca-udara` (`gerbang-ilmu-agent` hijau). Catatan: `.claude/ilmu-agent/cuaca-udara.md` 41.159 byte, di atas plafon 40 KB `AGENTS.md` 1.5. |
| E10 | Model agent | dibuat | `.claude/agents/cuaca-udara.md` `model: sonnet`. |
| F01 | Pengerja agent | dibuat | Satu pengerja `cuaca-udara` untuk dua modul (`scripts/agents/roster.json:473`); registry kini `pengerja: "cuaca-udara"` dan `workflow: "udara.yml"` (cocok; ketidakcocokan 19 Okt sudah dibereskan). |
| F02 | Dokumen spesifikasi | dibuat | Dokumen ini, daftar periksa A01-F04 dan G01-G11 terisi dari audit 15 Nov 2026. |
| F03 | Dokumen riset | belum | Tidak ada `scripts/udara/RISET-*.md`. |
| F04 | Kredit dan lisensi | sebagian | Atribusi OpenAQ, penyedia asal, GMAO, dan BMKG tertulis di dalam berkas data (`openaq_mos.json` `atribusi`, `bmkg_pm25.json` `sumber`). Tidak ada `public/udara/kredit.json`; tidak terbukti Tentang menyebut WRI GPPD (CC BY 4.0), METAR/IEM, Dapodik, NASA GMAO GEOS-CF. |


## Komponen baru (audit 15 Nov)

Fitur karhutla yang lahir sesudah audit 19 Okt (G01-G11). Status = apakah bencana ini sudah tercakup fitur itu (bukan karhutla). Bukti berkas:baris atau jalur data yang ada hari ini.

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | sebagian | Sisi Worker siap: daftar bawaan regu udara (N95, kacamata) `src/penugasan.js:47`, aturan tutup tugas bahaya tanpa sinyal reda otomatis termasuk udara (`src/instansi.js:1027`, `:1221`). Tetapi `scripts/umum/tugas.py:374` sengaja menegaskan tidak ada adaptor/berkas `tugas_udara`; `data/tugas_udara.json` live 404. |
| G02 | Operasi udara/darat | tidak berlaku | Operasi udara/darat adalah respons karhutla (aset udara, OMC); udara hanya membaca asap, sama dengan A23. |
| G03 | Sarana lapangan terencana (SIPPA) | tidak berlaku | SIPPA hanya untuk karhutla dan banjir; `src/sippa.js` tidak punya jalur udara. |
| G04 | Laporan harian/penanganan otomatis (deck, bot WA) | sebagian | Lampiran udara di deck harian (`data/laporan-bnpb/generator/harian_lampiran.py:110` `halaman_udara`: kab/kota PM2,5 tidak sehat 3 hari per provinsi), `udara/data/laporan.json` + `/udara/laporan.html`, dan WA jarak pandang jam-jaman (`scripts/wa/jarak_pandang_jam.mjs`). Tanpa deck Penanganan khusus udara. |
| G05 | Dalops: cek kabar luar, saringan per bencana, tindak lanjut | belum | Pantau Dalops tidak punya jenis udara: `public/bnpb/dalops.js:22,28` dan `src/dalops.js:31` hanya karhutla, banjir, longsor, gempa, cuaca, kekeringan; `scripts/data/dalops_kabar.py:29` tanpa sumber berita udara. |
| G06 | Prakiraan +1..+3 hari dinilai prospektif (/prediksi) | diadaptasi | Prakiraan PM2,5 +1..+3 hari dinilai: kode `ASP` di `scripts/prediksi/catat.py:17,40,259` (batas P.14/2020 sama dengan `scripts/udara/alat.py`), tampil di `public/prediksi/prediksi.js:8,72`; `prediksi.yml` harian 01.50 UTC. Basis prakiraan tetap CAMS, belum dikoreksi stasiun. |
| G07 | Semai awan dan prakiraan asap | dibuat | Prakiraan asap 24 jam untuk seksi Peluang semai disuplai mesin satu-satunya `scripts/udara/lintasan.py` (mode semai `:252-255`, dibaca `scripts/operasi/semai.py:873,914`; `.github/workflows/semai.yml` 10.00 dan 22.00 UTC); awan dingin Himawari `scripts/udara/awan_himawari.py` dibaca `semai.py:860`. |
| G08 | Masuk laporan berkala Kepala BNPB | belum | `data/kajian-bnpb/laporan-berkala/PRD.md` tidak memuat bab udara/asap; tidak ada perakit `scripts/berkala/`. |
| G09 | Peringatan dini tersambung (EWS, Peringatan Dini, CAP) | belum | `src/ews.js` dan `src/peringatan.js` tidak punya aturan PM2,5/asap (hanya karhutla, banjir, longsor, cuaca, rob, gempa); registry hanya menyaring teks peringatan BMKG berkata kunci asap|kabut (`peringatan_relevan`). |
| G10 | Renlap lengkap (target, sumber daya, rute, PDF/KML/GPX, versi) | tidak berlaku | Renlap milik Operasi Udara karhutla; udara tidak punya operasi lapangan (sama dengan A22). |
| G11 | Pembuat dokumen (laporan harian PPTX/PDF, sitrep, laporan kejadian, renkon, cetak A4) | diadaptasi | Laporan kejadian per kasus `udara/data/kejadian/udara-NNNN.json` (`scripts/umum/laporan_kejadian.py`, modul udara: asal dari lintasan mundur), lampiran udara deck harian (`harian_lampiran.py:110`), `/udara/laporan.html`. Tanpa sitrep, renkon, atau cetak A4 khas udara. |
