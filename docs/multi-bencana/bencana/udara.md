# Kualitas udara dan asap

Pengerja: agen `cuaca-udara` (satu agen untuk cuaca dan udara). Urutan: 4. Modul sendiri yang mencakup asap karhutla dan polusi; asap karhutla dibaca dari data karhutla tanpa mengubahnya.
Ringkasan paritas: `PARITAS-UDARA.md`.

**Audit paritas akhir: 19 Okt 2026 malam** (HEAD `14d9be3`; kode dibaca satu per satu, data live dari `centurisk97.terasurbannetwork.workers.dev`, hanya GET). Hitungan 113 komponen `PAKET-FITUR.md`: **ADA 65** (dibuat 51, diadaptasi 14), **SEBAGIAN 25**, **BELUM 17**, **TIDAK BERLAKU 6**. Audit pagi 19 Okt: ADA 42 / SEBAGIAN 33 / BELUM 28 / TB 10.

Catatan kebijakan: `PAKET-FITUR.md` melarang status `aktif` selama ada baris "belum". Registry sudah `aktif` lewat tahap buka bertahap (`tests/agen/gerbang-bencana.test.mjs`, tabel TAHAP) dan tidak ada gerbang yang membaca tabel ini, jadi baris sebagian dan belum di bawah ditulis apa adanya dan keputusan membukanya tetap milik pemilik.

## 1. Identitas registry (keadaan sebenarnya)

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `udara` / `/udara/` (halaman tambahan `/udara/laporan.html`; Simulasi adalah tab) |
| `kejadian.awalan` | `U` (registry: "Stasiun tercemar"; isi sebenarnya: gugus kab/kota PM2,5 24 jam di atas 55,4 µg/m³) |
| `cron_worker` | kosong: CAMS terbit dua kali sehari, tidak ada tugas Worker |
| Pipeline | `udara.yml` 06.40 dan 18.40 UTC menjalankan `scripts/udara/jalan.py` (angin, prakiraan, riwayat, musim_asap, lintasan, atribusi, rentan, laporan_udara, asal, peluang_udara) dan mengomit `public/udara/data`; `lintas.yml` menjalankan berita, dampak, dan kejadian U |
| Tab | peta, insight, berita, tren, kejadian, dampak, simulasi, foto, tentang; `metode` tersembunyi. Live: Kejadian dibuang sampai datanya terbit |
| `sumber_status` | kualitas = `/udara/data/prakiraan.json` (18 jam), berita_udara (30 jam) |

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| ISPU resmi KLHK | tidak terjangkau dari CI | **tidak ada**; diakui di Metode |
| Stasiun terukur | WAQI opsional (`WAQI_TOKEN` dikirim di `udara.yml:59`) | **tidak ada**: `koreksi.status` "belum", `n_stasiun` 0 pada data live |
| Pengamatan | METAR jarak pandang (NOAA/IEM), 14 bandara | Titik bandara dan bahan uji hindcast |
| Tingkat Pantau Bencana | PM2,5 CAMS rata-rata 24 jam, titik potong P.14/2020 (55,4/150,4/250,4) | Normal/Waspada/Siaga/Awas per kab/kota; selalu berpil "perkiraan model CAMS, belum dikoreksi" |

Kategori (registry): Baik 0-15,5, Sedang sampai 55,4, Tidak sehat sampai 150,4, Sangat tidak sehat sampai 250,4, Berbahaya di atasnya (PM2,5 24 jam, µg/m³). Nilai per jam disebut "PM2,5 per jam", bukan kategori.
Data CAMS: `jalan_model` 18 Okt 12.00 UTC pada terbitan 19 Okt 07.42 UTC (umur model ±20 jam saat terbit).

## 3. Kejadian

`scripts/umum/kejadian.py:242`: gugus kab/kota bersebelahan dengan PM2,5 24 jam di atas 55,4, masa aktif 2 hari. `kejadian_udara_awal.json` dan `_geo.json` belum terbit
(404 live pada 19 Okt malam; lokal menghasilkan 9 kejadian aktif). Laporan kejadian per kab Siaga sudah tayang di `public/udara/data/kejadian/` (14 kab).

## 4. Model dan uji balik

- CAMS global (±40 km) per kab/kota, plume atribusi api/PLTU/latar (`atribusi.py`), lintasan maju (`lintasan.py`) dan mundur (`asal.py`), simulasi partikel Lagrangian di peramban, peluang dari 729 varian (`peluang_udara.py`).
- Koreksi bias per stasiun dikodekan tetapi tidak aktif (tanpa data stasiun).
- Uji: hindcast CAMS vs METAR HZ/FU, 810 hari-bandara, 27 bandara: hit 45,3%, FAR 15,8%, CSI 41,8% (CI bootstrap 95%). Bukan stasiun, bukan prakiraan 24-72 jam; `galat.metar_prakiraan` null sampai >=50 hari-bandara.
- 108 dari 415 kota ditandai tak terpercaya di atribusi (model sumber >1,5x CAMS) dan tidak diberi persen.

## 5. Layar, warga, dan media (keadaan sebenarnya)

- Peta: status 514 kota, PM2,5 interpolasi, lintasan asap, jarak pandang bandara, GIBS CO, lapisan konteks. Insight 8 kartu; Dampak 4 bagian; Simulasi 3D dengan 6 skenario; Berita 5 kartu.
- Tren di kode 5 kartu, tetapi `riwayat.json` dan `musim_asap.json` belum terbit (404 live) sehingga Tren live hanya 2 kartu berisi 3 hari prakiraan.
- Warga: jenis `asap_tebal`, `sesak_napas`, `jarak_pandang` ada di server dan katalog; tab Informasi tidak dipasang. Foto: asap atau kabut, jarak pandang, lainnya (15 foto dummy berlisensi).
- Saran kesehatan per kategori sengaja tidak ditulis (belum ada teks resmi yang bisa dikutip).

## 6. Tabel 113 baris

Status: `dibuat` dan `diadaptasi` = ADA (diadaptasi = bentuk berbeda karena domain, alasan tertulis); `sebagian` = ada tetapi tidak memenuhi gerbang atau belum tayang; `belum` = tidak ada; `tidak berlaku` = alasan satu kalimat. Paritas diukur terhadap karhutla yang TAMPIL (tab Dashboard, Posko, Informasi, Kompleks, Metode karhutla tersembunyi, dan kartu uji/galat model di Insight).

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | sebagian | Sumber utama adalah model CAMS (Open-Meteo Air Quality, 514 kab/kota, `scripts/udara/prakiraan.py`), bukan pengamatan. Pengamatan hanya METAR jarak pandang (NOAA/IEM, 14 bandara di `rentan.json`). Stasiun WAQI dikodekan (`prakiraan.py:72-123`) tetapi belum ada data: `koreksi.status` "belum", `n_stasiun` 0 (live). |
| A02 | Varian keluaran bertingkat | sebagian | Tidak ada potongan 24/72/semua. Satu `prakiraan.json` 72 jam per jam (442 KB, 514 kota) + riwayat r24 31-120 hari di cache + `laporan.json` 32 hari. |
| A03 | Pengamatan hampir-waktu-nyata | tidak berlaku | CAMS terbit dua kali sehari dan tidak ada pengamatan realtime; `cron_worker: []` (`public/bencana.json:699`); `udara.yml` 06.40 dan 18.40 UTC cukup. |
| A04 | Entitas kejadian aktif | sebagian | Kode U#### ada: `scripts/umum/kejadian.py:242` (gugus kab bersebelahan dengan PM2,5 24 jam >55,4; masa aktif 2 hari `:32`). Berkas `kejadian_udara_awal.json` BELUM terbit (404 live; langkah baru di `lintas.yml:128`). Lokal ke folder sementara: 9 kejadian aktif (mis. U0001 Jambi-Palembang 6 kab, U0002 Jabodetabek-Jabar 22 kab). Terpisah dan sudah tayang: laporan kejadian per kab Siaga (`public/udara/data/kejadian/index-udara.json`, 14 kab). |
| A05 | Atribut kejadian | sebagian | Atribut kejadian: PM2,5 maks, kab, jiwa, pusat. Belum ada polutan dominan, durasi jam, sumber dugaan, atau tautan kompleks karhutla di kejadian (atribusi ada di laci kota, bukan kejadian). |
| A06 | Geometri dampak | dibuat | Peta PM2,5 diinterpolasi dari titik kab/kota ke sel 0,25 derajat (`public/udara/peta.js:44`). Poligon kejadian ke `kejadian_udara_geo.json` (lokal 384 KB, dimuat malas; belum terbit). |
| A07 | Pemecahan muatan | sebagian | Pemisahan `_awal` (4 KB lokal) dan `_geo` (384 KB lokal) ada di kode tetapi belum terbit; belum masuk `ukur_muat.mjs` (/udara/ terukur 618 KB, plafon 710 KB). |
| A08 | Cuaca pendukung | dibuat | `scripts/udara/angin.py`: angin 10 m, 925 dan 850 hPa + tinggi lapisan batas, tiap 3 jam, kisi 1 derajat (846 titik/jalan), kuota tertulis di docstring. |
| A09 | Indeks bahaya harian | diadaptasi | ISPU dihitung hanya dari PM2,5 rata-rata 24 jam dengan titik potong P.14/2020 (`scripts/udara/alat.py:18`, `kualitas.py`, `public/udara/murni.js:5`), tanpa PM10/O3/NO2/SO2/CO; berlabel "perkiraan model, bukan ISPU resmi". Titik potong diuji `tests/udara/layar.test.mjs:6`. |
| A10 | Prakiraan ansambel | diadaptasi | Tidak ada ansambel CAMS. `scripts/udara/peluang_udara.py` memakai 729 varian (27 sebaran x 27 emisi) = sensitivitas asumsi atribusi, bukan ketidakpastian atmosfer; galat CAMS tidak masuk (`peluang_udara.py:3-9`). Peluang melewati 55,4/150,4/250,4 per kab 3 hari (`peluang.json`, 463 wilayah). |
| A11 | Kondisi latar | belum | Tidak ada anomali PM2,5 terhadap klimatologi; arsip CAMS di repo hanya 31-120 hari (`scripts/udara/musim_asap.py:8`). |
| A12 | Indeks khusus tambahan | sebagian | Atribusi sumber PM2,5 api/PLTU/latar (plume Gauss + Briggs, rentang dari 1.458 kombinasi; `scripts/udara/atribusi.py`): 307 kota terpercaya, 108 tidak (model >1,5x CAMS). Tampil di Insight "Sumber asap" dan laci kota. Belum ada uji balik terhadap kejadian. |
| A13 | Aturan status 4 tingkat | dibuat | Normal/Waspada/Siaga/Awas dari r24 55,4/150,4/250,4 (`murni.js:5-11`, `kualitas.py`); registry memakai 5 kategori Baik-Berbahaya (`public/bencana.json`). Status resmi KLHK tidak ada (A20). |
| A14 | Prioritas | belum | `prioritas: []` (`public/bencana.json:737`); tidak ada ambang prioritas dari uji balik. |
| A15 | Risiko riwayat 0–100 | belum | Tidak ada risiko riwayat 0-100 untuk udara. |
| A16 | Kalender musim | sebagian | `scripts/udara/musim_asap.py` -> `musim_asap.json`: median titik panas nasional per bulan + ENSO per tahun + PM2,5 CAMS per bulan (>=10 hari); penanda musim bakar, bukan ukuran asap; nasional, bukan per dasarian per provinsi. BELUM terbit: 404 live. |
| A17 | Iklim | dibuat | `public/data/iklim.json` (ONI, IOD) dipakai bersama dan dibaca `musim_asap.py`; kartu ENSO Tren menunggu `musim_asap.json` (A16). |
| A18 | Riwayat grid dan sejarah | sebagian | Riwayat analisis CAMS 31 hari di `laporan.json` dan 120 hari di cache `r24_kota.json`; isi awal 45 hari (`isi_riwayat.py`). Bukan arsip sejak 2013; `riwayat.json` 404 live. |
| A19 | Statistik per provinsi | dibuat | `laporan.json` nasional + 38 provinsi + 365 kab (live 163 KB), `prakiraan.json` per kab, `riwayat.py` per provinsi. |
| A20 | Data lembaga | belum | ISPU KLHK tidak terjangkau dari CI dan tidak ditampilkan (`public/udara/metode.js` mengakuinya); tidak ada status resmi lembaga lain. |
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
| A32 | Citra satelit | diadaptasi | GIBS AIRS karbon monoksida (`public/inti/peta/nasa.js:10`, dipasang `Peta.init`) dan dasar satelit; AOD/citra asap tidak ada; Sentinel sebelum/sesudah tidak relevan. |
| A33 | Berita | sebagian | `scripts/udara/berita.py` -> `berita_udara.json` (1.500 artikel, 235 kab; live dibuat 19 Okt 10.52 UTC via `lintas.yml:112`). Sentimen tak teruji, tanpa label uji >=200. |
| A34 | Video | belum | Tidak ada video (`public/udara/berita.js:6`). |
| A35 | Data sektor | dibuat | METAR jarak pandang 14 bandara (`rentan.json`, lapisan "Jarak pandang bandara"), rumus Koschmieder di `rentan.py`, 27 bandara dalam uji METAR. |
| A36 | Kurasi tangan | belum | Tidak ada berkas kurasi tangan; `pltu.json` adalah dataset WRI, bukan kurasi. |
| A37 | Meta | dibuat | `public/udara/data/meta.json` dan `prakiraan.json.dibuat`; `/api/status` kualitas umur 5,2 jam (ambang 18). |
| A38 | Data statis bulanan | sebagian | `pltu.json` (WRI GPPD v1.3) dan `kota.json` dibangun sekali dengan tangan (`pltu.py:3`, `kota.py:3`), tidak dijadwalkan di `statis.yml`. |
| A39 | Seri jangka pendek bergulir | dibuat | `laporan.json` 32 hari per kab/provinsi/nasional (kontrak LAPORAN-HARIAN, `laporan_udara.py`), `r24_kota` bergulir 120 hari, halaman `/udara/laporan.html`; `riwayat.json` untuk Tren menunggu run berikutnya. |
| A40 | Data respons dan kontak | belum | Tidak ada unit respons atau kontak untuk udara. |
| B01 | Model prakiraan | sebagian | CAMS + plume atribusi + simulasi Lagrangian ada. Koreksi bias per stasiun dikodekan (`prakiraan.py:8`) tetapi tidak aktif: `koreksi.status` "belum", `n_stasiun` 0, `faktor_median` 1,0 (live; `WAQI_TOKEN` dikirim di `udara.yml:59` tetapi tidak menghasilkan stasiun). |
| B02 | Uji balik aturan status | diadaptasi | Hindcast CAMS vs METAR HZ/FU (810 hari-bandara, 27 bandara): hit 45,3%, FAR 15,8%, CSI 41,8% dengan CI bootstrap 95% (`prakiraan.json` `galat.metar`). Bukan terhadap stasiun dan bukan prakiraan 24-72 jam. |
| B03 | Prospektif | sebagian | `arsip_jalan` menyimpan r24 tiap jalan (maks 90 hari, `prakiraan.py:215`); `galat.metar_prakiraan` masih null sampai >=50 hari-bandara (`:35`). |
| B04 | Kasus historis | belum | Tidak ada galeri episode asap besar (2015, 2019, 2023). |
| B05 | Galat dan pendorong | sebagian | Galat METAR (tabel hit/luput/alarm palsu/benar negatif) ada; galat stasiun null; "pendorong" hanya atribusi (A12), tidak ada `pendorong`. |
| B06 | Tren jangka panjang | belum | Tidak ada uji tren jangka panjang. |
| B07 | Kesetaraan Python↔JS | sebagian | Titik potong ada di `alat.py:18` (Python) dan `murni.js:5`, `app.js:14`, `sim/model.js` (JS); tiap sisi diuji sendiri (`tests/udara/layar.test.mjs:6`, `sim.test.mjs:110`), tidak ada uji silang Python-JS. |
| B08 | Selang ketidakpastian | diadaptasi | `peluang.json`: P10/P50/P90 dan peluang melewati 3 ambang dari 729 varian; hanya sensitivitas asumsi atribusi, galat CAMS tidak masuk (`peluang_udara.py:3-9`). |
| B09 | Kinerja tercatat | dibuat | Hit/FAR/CSI + CI ditampilkan di kartu "Galat model" (`public/udara/prakiraan.js:109`) dan Metode; tiap kartu berangka berpil "perkiraan model CAMS, belum dikoreksi"; jejak `selera-angka` 38 entri. |
| B10 | Dokumen riset | belum | Tidak ada `scripts/udara/RISET-*.md`. |
| C01 | Kepala + menu bencana | dibuat | `details.bencana` di `public/udara/index.html` + `inti/kepala.js`. |
| C02 | Tab dan URL bersih | dibuat | `/udara/<tab>` dan `/udara/k/U0001` (`public/udara/mulai.js:12`). Live: 8 tab (Peta, Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang); Kejadian dibuang karena datanya 404. |
| C03 | Tema terang/gelap | dibuat | Tema `pb-tema` bersama (`app.js`). |
| C04 | Waktu data | dibuat | `#upd` "Data 19 Okt 14.42 WIB" dari `prakiraan.json`. |
| C05 | Panel kiri | diadaptasi | Crumb + pil model + cari provinsi + tabel 39 baris provinsi yang bisa diurut (`public/udara/index.html:62-82`); tanpa mode. |
| C06 | Rentang waktu | diadaptasi | Seg 3 hari + geser jam 72 jam per kota (`#jamKota`); tanpa chip rentang. |
| C07 | Garis waktu prakiraan | dibuat | `#garisWaktu` hari, `#jamKota` geser jam, pilihan lapis angin (`public/udara/prakiraan.js`). |
| C08 | Panel lapisan | diadaptasi | Live 6 ubin (Status kota, Lintasan asap, PM2,5, Satelit, Penduduk, Sekolah & faskes); "Jarak pandang bandara" hanya bila METAR segar; CO AIRS lewat `nasa.js`. |
| C09 | Choropleth wilayah + kartu hover | dibuat | Raster PM2,5 interpolasi (`peta.js:44`), `prov-fill` untuk hover/klik provinsi (`:46`), kartu hover bersama. |
| C10 | Gelembung cluster | diadaptasi | 514 titik kota berwarna status dengan `circle-sort-key` sehingga yang terparah di atas (`prakiraan.js:38`); bukan klaster angka. |
| C11 | Popup titik | dibuat | Hover/klik titik kota (PM2,5, status) dan METAR (jarak pandang, kelas). |
| C12 | Laci kejadian | sebagian | Laci provinsi (PM2,5 per hari, jiwa per kategori, kab paling terpapar) dan laci kota (4 hari, grafik 72 jam, atribusi api/PLTU/latar, tautan kompleks karhutla; `prakiraan.js:92-98`); laci kejadian ringkas (`kejadian.js:laci`). Tanpa saran kesehatan, sekolah/RS terdekat, riwayat, tautan simulasi. |
| C13 | Legenda | dibuat | `#legenda` dok (kelas PM2,5 24 jam, jarak pandang). |
| C14 | Insight | diadaptasi | 8 kartu (Prakiraan 72 jam, Galat model, Sumber asap, Jiwa terpapar, Kab/kota, Peluang, Asal asap, Jarak pandang; `prakiraan.js:138`, `insight.js:13`). Tanpa "hari Tidak Sehat per kota per tahun" (data multi-tahun tidak ada). |
| C15 | Tabel kejadian | sebagian | Tab Kejadian lengkap (`public/udara/kejadian.js`) tetapi tidak tampil di produksi karena datanya 404 (A04). |
| C16 | Cerita | belum | Tidak ada `cerita_udara.js`. |
| C17 | Berita | sebagian | 5 kartu (live 3.340 berita/30 hari); tanpa sentimen, video, internasional (`berita.js:6`). |
| C18 | Tren | sebagian | Kode Tren 5 kartu (Jiwa terpapar, PM2,5 nasional, Provinsi, Kalender musim asap, ENSO; `tren.js:92`), tetapi live hanya 2 kartu dan 3 hari prakiraan karena `riwayat.json` dan `musim_asap.json` 404. Indeks risiko 0-100 tidak ada. |
| C19 | Posko, Sarana, Operasi, Keputusan | belum | Tidak ada Posko/Sarana/Operasi/Keputusan. |
| C20 | Dampak | diadaptasi | 4 bagian (Balita dan lansia, Kasus ISPA, Sekolah berisiko, Jarak pandang bandara; `public/udara/dampak.js:9`); tanpa korban/kerugian (BNPB tidak mencatat udara), tanpa emisi. |
| C21 | Dashboard pimpinan | belum | Tidak ada Dashboard pimpinan. |
| C22 | Metode | sebagian | Metode ada (`public/udara/metode.js`): kategori, sumber, cara hitung, batasan, prakiraan, lintasan, atribusi, rentan, simulasi, peluang, asal; mengakui koreksi stasiun belum ada. Tanpa contoh hitung hari ini; baris "Berita: diperbarui tangan" (`metode.js:18`) usang; klaim riwayat Tren belum terpenuhi di live. |
| C23 | Simulasi | dibuat | Simulasi partikel Lagrangian di peramban (`public/udara/sim/model.js`, 15 uji `tests/udara/sim.test.mjs`), tampilan 3D (`tiga.js`), 6 skenario (Dasar, Api padam 50%, Padamkan kompleks, Angin berbalik, Angin melemah, PLTU mati; `model.js:248-255`) dan daftar batas model. |
| C24 | Lapor Warga | sebagian | Server dan katalog siap: 3 jenis udara (`public/informasi_jenis.js:94-98`), migrasi 0020. Jenis lama karhutla `udara/sehat/ruang` tetap bahaya karhutla (`:47,53`, tidak dipindah). Tab Informasi tidak terpasang di /udara. |
| C25 | Foto lapangan | dibuat | `public/udara/foto.js:4` + `public/foto.js` bersama; kategori asap/jarak_pandang/lainnya (`public/bencana.json:682`); 15 foto dummy berlisensi (`public/img/dummy/udara/kredit.json`). Live: tab Foto kosong. |
| C26 | Pop-up situasi hari ini | dibuat | `public/udara/sapa.js` lewat `inti/sapa.js`, kunci `pb_sapa_udara`. |
| C27 | Bagikan | dibuat | `public/udara/bagikan.js:10` tema `udara`. |
| C28 | OG per rute | dibuat | `src/og_meta.js` memetakan `/udara/` dan `/udara/k/U…`; `/data/og/udara.png` live 200 (`scripts/og/buat.py:167`). |
| C29 | i18n EN | sebagian | Kebocoran EN 5-10 per bencana, belum nol (commit 0f2ecb1); `kumpul.mjs:107` memuat /udara/; tab Kejadian dan kartu atribusi baru belum dicrawl. |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | `persetujuan.js`, `jejak.js`, `kaki.js`, `pesan.js` terunduh di live. |
| C31 | Muat / kosong / galat / luring | sebagian | Spinner muat, pesan kosong per tab, kartu tanpa data dibuang; Simulasi punya cadangan "Simulasi belum tersedia" (`prakiraan.js:Simulasi.render`); keadaan luring tidak ada. |
| C32 | Mobile 375 px | dibuat | Diukur 19 Okt malam di live, emulasi 375x812: `scrollWidth` = 375 di delapan tab. Belum ada uji otomatis. |
| C33 | Klik tidak membekukan | dibuat | `nanti()` (`app.js:4`); simulasi berat berjalan bertahap di `requestAnimationFrame` 10 ms per potongan (`sim/sim.js:1-4`); jejak `inp-reviewer`. |
| C34 | Halaman Tentang dan kartu bencana | dibuat | Tab Tentang (iframe) dan kartu bencana di Tentang. |
| C35 | Statistik publik | dibuat | `src/statistik.js:18` `HAL` dari registry. |
| C36 | Admin moderasi | dibuat | Admin foto dan statistik memakai pemilah bencana dari registry; dummy 🧪/🧹 per bencana. |
| C37 | Bagikan lanjutan | diadaptasi | `bagi.js` (QR, WhatsApp, UTM) terunduh di live; "Bagikan video" tidak ada. |
| C38 | Lapisan tambahan | diadaptasi | Lapisan konteks registry (penduduk, sekolah+faskes) + GIBS CO; tanpa lapisan khas karhutla. |
| C39 | Kaki dan Tentang | dibuat | `kaki.js` dan halaman Tentang bersama. |
| D01 | Rute HTML | dibuat | Rute `/udara/`, `/udara/k/…` dari `src/bencana.generated.js`; live 200. |
| D02 | Route data cepat | tidak berlaku | Tidak ada route cepat: data statis `/udara/data/*.json` yang terbit dua kali sehari. |
| D03 | Cron | tidak berlaku | `cron_worker: []` (`public/bencana.json:699`); tidak ada tugas Worker. |
| D04 | Status kesegaran | dibuat | `sumber_status`: kualitas = `prakiraan.json` (ambang 18 jam), berita_udara (30 jam) (`public/bencana.json:638`; commit d77b3c7); live kualitas umur 5,2 jam. |
| D05 | Lapor warga | dibuat | `laporan.bahaya='udara'` + 3 jenis (migrasi 0020, `src/worker.js:194,215-217`); antarmuka belum terpasang (C24). |
| D06 | Foto | dibuat | `foto.bencana` (migrasi 0013), `KAT_BENCANA`; `tests/warga/foto_bencana.test.mjs`. |
| D07 | Statistik | dibuat | `stat_hari.hal` dari registry (migrasi 0017). |
| D08 | OG meta | dibuat | `src/og_meta.js` membaca registry. |
| D09 | Dummy | dibuat | Foto dummy 15 + tombol 🧪/🧹 (`src/foto.js:113`); udara tidak punya tabel D1 khas. |
| D10 | Privasi | dibuat | Mesin bersama (hash IP bergaram, DNT/GPC); jalur udara tidak menyimpan data pribadi baru. |
| E01 | Self-check per skrip | dibuat | `udara.yml:52-55` menjalankan `uji` semua `scripts/udara/*.py` sebelum pipeline (16 skrip dijalankan malam ini, semua lulus); uji berita/dampak di `lintas.yml:112`. |
| E02 | Cakupan route/tabel | tidak berlaku | Udara tidak menambah route atau tabel Worker; `cakupan.json` tidak punya baris udara. |
| E03 | Skema D1 | dibuat | Katalog jenis laporan vs migrasi 0020 dijaga dua arah oleh `tests/warga/skema.test.mjs`. |
| E04 | Registry | dibuat | `tests/agen/gerbang-bencana.test.mjs`: `npm run uji:agen` 57/57 hijau malam ini. |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau. |
| E06 | Kesegaran data | dibuat | `/api/status` memuat kualitas dan berita_udara (live: tak ada yang basi); `jaga.yml`. |
| E07 | Beban | dibuat | `tests/beban/beban.mjs:27` /udara/ bobot 4; `ukur_muat.mjs:49-51` terukur 618 KB, plafon 710 KB. |
| E08 | i18n | sebagian | Crawl dua arah mencakup /udara/ (`kumpul.mjs:107`) tetapi kebocoran 5-10, bukan nol. |
| E09 | Kepemilikan berkas | dibuat | Semua berkas dimiliki agen `cuaca-udara` (`gerbang-ilmu-agent` hijau). |
| E10 | Model agent | dibuat | `.claude/agents/cuaca-udara.md` `model: sonnet`. |
| F01 | Pengerja agent | diadaptasi | Satu pengerja `cuaca-udara` untuk dua modul (`scripts/agents/roster.json:355`); registry `pengerja: "udara"` (`public/bencana.json:701`) tidak cocok dengan nama agen. |
| F02 | Dokumen spesifikasi | dibuat | Dokumen ini, daftar periksa A01-F04 terisi dari audit 19 Okt 2026 malam (sebelumnya hanya rencana R/A/T). |
| F03 | Dokumen riset | belum | Tidak ada `scripts/udara/RISET-*.md`. |
| F04 | Kredit dan lisensi | sebagian | Kredit foto dummy per bencana ada (`public/img/dummy/udara/kredit.json`). Tidak ada `public/udara/kredit.json`; Tentang tidak menyebut WRI Global Power Plant Database (CC BY 4.0, wajib atribusi), METAR/IEM, atau Dapodik. |
