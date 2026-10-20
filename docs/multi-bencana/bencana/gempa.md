# Gempa bumi dan tsunami: daftar periksa PAKET-FITUR (113 komponen)

Audit akhir paritas **19 Okt 2026 malam** (registry `status: "aktif"`). Setiap baris dibuka di kodenya atau diperiksa di data live
`https://centurisk97.terasurbannetwork.workers.dev` (hanya GET), bukan ditebak dari nama. Paritas diukur terhadap karhutla yang TAMPIL;
komponen yang disembunyikan di karhutla ditandai "(tersembunyi di karhutla)" dan tetap dihitung belum bila kodenya belum ada.

Status: **dibuat** (komponen ada dan lolos gerbangnya), **diadaptasi** (bentuk beda karena domain), **sebagian** (ada, ada yang kurang, kekurangannya ditulis),
**belum**, **tidak berlaku** (alasan satu kalimat). Pemetaan ke hitungan audit: ADA = dibuat + diadaptasi.

## Hitungan

**ADA 69 / SEBAGIAN 25 / BELUM 10 / TIDAK BERLAKU 9** (jumlah 113).
Rincian: dibuat 57, diadaptasi 12, sebagian 25, belum 10, tidak berlaku 9.

| Kelompok | Baris | ADA | Sebagian | Belum | TB |
| --- | --- | --- | --- | --- | --- |
| A data dan pipeline | 40 | 17 | 8 | 7 | 8 |
| B model dan uji balik | 10 | 7 | 3 | 0 | 0 |
| C layar publik | 39 | 28 | 7 | 3 | 1 |
| D worker dan D1 | 10 | 7 | 3 | 0 | 0 |
| E gerbang dan uji | 10 | 8 | 2 | 0 | 0 |
| F armada dan dokumen | 4 | 2 | 2 | 0 | 0 |

## Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id`, awalan | `gempa`, `G` (G0001...; live G0004..G0016) |
| `rute` / `data` | `/gempa/` / `/gempa/data/` (laporan harian `/gempa/laporan.html`) |
| `tab` | peta, insight, berita, tren, kejadian, dampak, metode (tersembunyi), sim, foto, tentang; `tab_sembunyi` = metode |
| Tingkat registry | status tsunami resmi BMKG 0-3, tanpa tingkat buatan |
| Cron Worker | `* * * * *`: autogempa tiap menit; gempaterkini, gempadirasakan, USGS tiap 5 menit |
| Workflow | `gempa.yml` harian 01.10 UTC (prospektif susulan, laporan, peluang); `statis.yml` bulanan (riwayat, risiko, InaRISK, sesar, bukti); `lintas.yml` harian (dampak, berita) |
| Pengerja | `gempa` |

## Tabel

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | diadaptasi | BMKG autogempa/gempaterkini/gempadirasakan + USGS FDSN dipanen Worker (`src/gempa.js:176` TUGAS, urai murni `:47`, `:66`); satu sumber mati tidak mematahkan yang lain, gabung BMKG+USGS <=90 dtk/100 km; fixture dan `tests/warga/gempa.test.mjs` hijau. Katalog historis: `scripts/gempa/riwayat.py`. |
| A02 | Varian keluaran bertingkat | diadaptasi | Bukan berkas bertingkat: `/api/gempa/terbaru?jam=24/72/168/720` (`src/gempa.js:232,260`), batas 3000 baris, cache tepi per jam. |
| A03 | Pengamatan hampir-waktu-nyata | dibuat | Cron tiap menit (`wrangler.jsonc:16`, `src/worker.js:615`): autogempa tiap menit, sisanya tiap 5 menit -> D1 `gempa` -> `/api/gempa/terbaru` cache 60 dtk. Live 19 Okt 20.03 WIB: `/api/status` gempa_terbaru umur 0 jam (ambang 0,5). |
| A04 | Entitas kejadian aktif | sebagian | Kejadian G ada: `src/gempa.js:156` kelompokkan (jendela jarak Gardner-Knopoff, masa aktif 3/7 hari, kode stabil), live `/api/gempa/kejadian` 13 kejadian G0004..G0016. Tetapi hanya gempa M>=5 yang ditautkan (`kej`): susulan M<5 tidak pernah terhitung, semua 13 kejadian live berjumlah 1 (kolom Susulan selalu 0). |
| A05 | Atribut kejadian | sebagian | Laci (`public/gempa/laci.js:31-56`) memuat M, jenis magnitudo, kedalaman, MMI Dirasakan, prov/kab, status tsunami, peluang susulan, penduduk per kelas MMI, fasilitas, gelombang, risiko provinsi. Belum: sesar terdekat, riwayat M>=6 radius 100 km, kelas InaRISK, kecamatan terdampak per kejadian. |
| A06 | Geometri dampak | diadaptasi | Isoseismal MMI 3-9 sebagai lingkaran dari GMPE (`public/gempa/kejadian.js:45-56`, berlabel perkiraan), bukan kontur ShakeMap; ShakeMap BMKG hanya tautan keluar. Lapisan `sesar.geojson`, `batas_lempeng.geojson`. |
| A07 | Pemecahan muatan | diadaptasi | Tidak ada pemecahan awal/geo: muatan memang kecil (`/api/gempa/kejadian` 3,7 KB). Rute `/gempa/` terukur 418 KB, plafon 480 (`tests/beban/ukur_muat.mjs:49-51`). |
| A08 | Cuaca pendukung | tidak berlaku | Cuaca bukan pemicu gempa. |
| A09 | Indeks bahaya harian | dibuat | `scripts/gempa/guncangan.py` (BSSA14/Zhao06 -> PGA, Worden12 -> MMI) kembar `guncangan.js`, kesetaraan `uji_js_guncangan.py`; koefisien dicocokkan ke OpenQuake 16 Okt. `model_guncangan.json` `kinerja_uji.status` = belum_diuji (ditulis apa adanya). |
| A10 | Prakiraan ansambel | diadaptasi | Bukan ansambel IFS: `peluang.json` (skema peluang/1) = laju Poisson 12 bulan (36 wilayah) + peluang susulan 7 hari (`peluang_gempa.py`, `susulan.py`). Uji balik laju 1990-2015 vs 2016-2025 tercatat (nasional M5+ teramati 1120, di luar selang 90% 1144-1258). |
| A11 | Kondisi latar | tidak berlaku | Tidak ada kondisi latar (tanah, iklim) yang mengubah peluang gempa. |
| A12 | Indeks khusus tambahan | tidak berlaku | Tidak ada indeks riset tambahan yang lolos uji balik; PFVI khusus gambut karhutla. |
| A13 | Aturan status 4 tingkat | sebagian | Status resmi BMKG didahulukan dan tak pernah ditafsir 'aman' (`src/gempa.js:26` uraiPotensi, registry tingkat 0-3, laci/pita/pop-up). Tingkat Pantau Bencana per kabupaten (`bencana/gempa.md` rencana awal) belum dibuat: tidak ada `scripts/gempa/aturan.py`. |
| A14 | Prioritas | sebagian | Kartu 'Perlu perhatian' di pop-up (tsunami BMKG, dirasakan; `sapa.js:26-35`), tanpa ambang dari uji balik; registry `prioritas` kosong. |
| A15 | Risiko riwayat 0–100 | dibuat | `risiko.json` 0-100: 38 provinsi, 514 kabupaten, 7.268 kecamatan, radius 100 km, bobot 50:30:20 (`riwayat.py`); tampil di Tren (`tren.js:37`) dan laci (`laci.js:52`). |
| A16 | Kalender musim | tidak berlaku | Gempa tidak bermusim. |
| A17 | Iklim | tidak berlaku | Gempa tidak bergantung ENSO/IOD. |
| A18 | Riwayat grid dan sejarah | dibuat | `riwayat_m5.json` (M5+ sejak 1900), `riwayat_grid.json` 0,1 derajat, `riwayat_prov.json`; M>=4,5 lengkap sejak 2000. `meta.json` akhir 16 Okt (bulanan, `statis.yml:69-90`). |
| A19 | Statistik per provinsi | dibuat | `riwayat_prov.json` (per provinsi per tahun, nilai b), `laporan.json` prov + 61 kabupaten (60 hari), `risiko.json` prov. |
| A20 | Data lembaga | dibuat | BMKG (Potensi, Dirasakan, Shakemap), USGS PAGER (kolom `pager`), `public/data/bpbd.json` BNPB; label lembaga di kartu. |
| A21 | Posko | belum | Tidak ada tab/modul posko gempa. (tersembunyi di karhutla) |
| A22 | Operasi | belum | Koefisien tenda/air/SAR belum ada. (tersembunyi di karhutla) |
| A23 | Aset udara | tidak berlaku | Tidak ada aset udara respons gempa dalam data terbuka. |
| A24 | Keputusan ekonomi | belum | Keputusan ekonomi (biaya respons vs kerugian) belum ada. (tersembunyi di karhutla) |
| A25 | Preventif | sebagian | Jalur evakuasi tsunami di Simulasi (`sim.js:154-250`) dan fasilitas rawan `bukti.json` (di atas sesar, MMI VII, pesisir rendah, tanpa tempat tinggi dalam 2 km). Rencana mitigasi bangunan/latihan evakuasi belum. |
| A26 | Penanggung jawab lahan | tidak berlaku | Gempa tidak punya penanggung jawab lahan. |
| A27 | Dampak | sebagian | `dampak.py` = paparan bahaya InaRISK x WorldPop (`dampak_gempa.json`), penduduk per MMI per gempa, `bukti.json`. Belum: korban historis DIBI, kelas PAGER, jalan/jembatan, kerugian rupiah. |
| A28 | Paparan penduduk | dibuat | `GempaGuncangan.paparan` + `penduduk.json` per kecamatan (`kata.js:64-`); `dampak_gempa.json` 3 kelas bahaya. |
| A29 | Sekolah dan fasilitas | dibuat | `bukti.json` 1,45 MB (sekolah Dapodik/OSM, RS, bangunan publik; `ringkas` = sebelum pangkas ke plafon 1,5 MB) + lapisan konteks sekolah/fasilitas/jalan (`peta.js:58` -> `inti/peta/konteks.js`). |
| A30 | Muatan Dashboard | belum | Tidak ada `ringkasan.json`; `laporan.json` (83 KB) hanya sebagian padanannya. (tersembunyi di karhutla) |
| A31 | Cuaca per jam untuk simulasi | tidak berlaku | Simulasi gempa/tsunami tidak butuh cuaca per jam. |
| A32 | Citra satelit | belum | Citra sebelum/sesudah untuk gempa M>=6,5 belum ada. |
| A33 | Berita | sebagian | `berita_gempa.json` 1500 artikel/120 hari, topik, cerita (`scripts/gempa/berita.py`, `lintas.yml:117`). `sentimen_teruji` false (label uji manusia 0 dari 200), judul EN tidak diterjemahkan (`berita_en.json` cocok 1 dari 200 judul). |
| A34 | Video | belum | Tidak ada video gempa (`berita.js:6` dibuang). |
| A35 | Data sektor | belum | Bandara/NOTAM untuk gempa belum ada. |
| A36 | Kurasi tangan | dibuat | `factsheet_gempa.json`: 8 kasus, tiap baris punya sumber dan tanggal (dicocokkan ke halaman sumber 19 Okt). |
| A37 | Meta | diadaptasi | `gempa/data/meta.json` (sumber, waktu ambil, cacah) + `/api/gempa/status` + `/api/status` gempa_terbaru. |
| A38 | Data statis bulanan | dibuat | `statis.yml:69-90` bulanan: riwayat, bahaya InaRISK, sesar GEM, bukti (Overpass); batimetri ETOPO sekali. |
| A39 | Seri jangka pendek bergulir | dibuat | `laporan.json` 60 hari per provinsi dan kabupaten (`laporan_gempa.py`, `gempa.yml` harian 01.10 UTC; live 19 Okt). |
| A40 | Data respons dan kontak | sebagian | `bpbd.json` (kantor BNPB, data lama) + 'Kontak BPBD terdekat' di laci (`laci.js:56`) disembunyikan CSS seperti 'Respons terdekat' karhutla. Tidak ada unit Basarnas/stasiun BMKG. (tersembunyi di karhutla) |
| B01 | Model prakiraan | dibuat | Model susulan Reasenberg-Jones dengan keragaman a (`susulan.py`, `model_susulan.json` terbit m5 = true; m6 dan m_1 tidak terbit) + GMPE; stdlib; latih 2000-2019, validasi 2020-2022, uji 2023 sampai 7 hari lalu dibuka sekali (18 Okt). |
| B02 | Uji balik aturan status | sebagian | Susulan M5: n 406, BSS 0,002 terhadap pembanding klimatologi (nyaris setara), tercatat jujur; guncangan `belum_diuji`. Tidak ada aturan status yang diuji balik. |
| B03 | Prospektif | dibuat | `prospektif_susulan.json` append-only (`gempa.yml` langkah prospektif; 2 entri tercatat, 0 dinilai karena baru) dan `prospektif_guncangan.json` (kosong). |
| B04 | Kasus historis | diadaptasi | Galeri 'Gempa merusak' di Tren dari `factsheet_gempa.json` (8 kasus, `tren.js:46-55`), bukan 123 kejadian model lipat. |
| B05 | Galat dan pendorong | diadaptasi | Reliabilitas dan diagnostik di `model_susulan.json` dan bab Metode; pendorong paparan = alasan `bukti.json`. Tidak ada kartu galat terpisah (disembunyikan di karhutla). |
| B06 | Tren jangka panjang | sebagian | Tren per bulan dan per tahun per kelas M (`tren.js`) dan komponen tren di risiko; tanpa uji tren (Theil-Sen/Mann-Kendall). |
| B07 | Kesetaraan Python↔JS | dibuat | `uji_js_susulan.py` dan `uji_js_guncangan.py` jalan di `gempa.yml`; `uji_js_tsunami.py` (invarian fisik) ada dan hijau tetapi belum masuk workflow. |
| B08 | Selang ketidakpastian | dibuat | Rentang 10-90% susulan hanya sampai `rentang_maks_mu` (`kata.js:60`); selang Poisson 90% di `peluang.json`. |
| B09 | Kinerja tercatat | dibuat | `kinerja_uji` tampil di Metode apa adanya, termasuk 'belum diuji' untuk guncangan (`metode.js:31`). |
| B10 | Dokumen riset | sebagian | Sitasi dan alasan lengkap di docstring skrip dan bab Metode; berkas `RISET-GMPE.md`/`RISET-SUSULAN.md` terpisah belum ada (hanya `docs/multi-bencana/RINCI-GEMPA.md`). |
| C01 | Kepala + menu bencana | dibuat | Kepala + menu bencana dari registry (`inti/kepala.js`, `index.html` details.bencana). |
| C02 | Tab dan URL bersih | dibuat | Tab dan URL bersih (`tab.js:19`, `mulai.js:36-40`): live 200 untuk `/gempa/peta`, `/gempa/kejadian`, `/gempa/sim`, `/gempa/k/G0016`. |
| C03 | Tema terang/gelap | dibuat | `#tema` + kunci `pb-tema` (`tab.js:28`), `peta.setStyle` saat ganti. |
| C04 | Waktu data | dibuat | `#upd` 'Data <jam WIB>' dari `/api/gempa/terbaru` (`mulai.js:9-14`). |
| C05 | Panel kiri | diadaptasi | Crumb, cari provinsi/lokasi, daftar urut (`peta.js`); tanpa seg Real Time/Riwayat/Kompleks (riwayat = overlay 'Gempa besar sejak 1900'). |
| C06 | Rentang waktu | dibuat | Garis waktu 24 jam / 72 jam / 7 hari (`#garisWaktu`, `renderRentang`). |
| C07 | Garis waktu prakiraan | tidak berlaku | Gempa tidak punya prakiraan harian indeks; jendela waktu pengamatan ada di C06. |
| C08 | Panel lapisan | dibuat | Overlay 3 grup, 8 ubin (wilayah, gempa, riwayat, kekerapan, InaRISK, lempeng, sesar, satelit) + lapisan konteks, muat malas (`peta.js:24-29`). |
| C09 | Choropleth wilayah + kartu hover | dibuat | Choropleth `prov-fill` + kartu hover bersama (`inti/peta/lapis.js`). |
| C10 | Gelembung cluster | diadaptasi | Lingkaran berukuran menurut M dan berwarna menurut kedalaman (`peta.js:34-36`); tanpa gelembung klaster. |
| C11 | Popup titik | dibuat | Kartu hover `Peta.kartuGempa` + laci saat klik: jam, M, kedalaman, sumber. |
| C12 | Laci kejadian | diadaptasi | Laci `#laci`: status tsunami resmi, kekuatan, dirasakan, peluang susulan, penduduk per MMI, gelombang pantai, risiko provinsi, BPBD (tersembunyi), tautan Simulasi, bagikan `/gempa/k/<G>` (`laci.js`). Belum: cuaca, lahan, riwayat radius. |
| C13 | Legenda | dibuat | `renderLegenda` inti (`peta.js:213`), hanya lapisan yang terlihat. |
| C14 | Insight | dibuat | 13 kartu (`insight.js:14`): terkini, dirasakan, susulan, peluang, provinsi, riwayat, tsunami, 5 kartu bukti, tabel. |
| C15 | Tabel kejadian | dibuat | Tab Kejadian: tabel G dengan kepala gelap, urut, paginasi 10/hal (`kejadian.js:11-17`). |
| C16 | Cerita | belum | Tidak ada `cerita_gempa.js` (Cerita karhutla adalah modul Insight). |
| C17 | Berita | sebagian | Volume harian, Sorotan, Topik, Daftar (`berita.js`). Dibuang: nada/sentimen (belum teruji), peta berita, celah liputan, pantauan media, video, berita internasional; judul EN belum. |
| C18 | Tren | dibuat | Tren 5 kartu (`tren.js:59`): per bulan, per tahun, kedalaman, risiko, gempa merusak; tanpa kalender musim. |
| C19 | Posko, Sarana, Operasi, Keputusan | belum | Posko, Sarana, Operasi, Keputusan belum. (tersembunyi di karhutla) |
| C20 | Dampak | sebagian | Tab Dampak (`dampak.js`): penduduk per kelas bahaya InaRISK, per provinsi, MMI gempa terbesar 7 hari, fasilitas rawan. Belum: korban/kerugian historis, kelas PAGER. |
| C21 | Dashboard pimpinan | belum | Tidak ada `ringkasan.js`; `/gempa/laporan.html` (kontrak laporan v1, 60 hari) sebagian padanannya. (tersembunyi di karhutla) |
| C22 | Metode | dibuat | `metode.js`: bab guncangan, susulan, tsunami, evakuasi, bukti, paparan, laporan, batasan; tab disembunyikan (`tab_sembunyi`) tetapi dapat dibuka `/gempa/metode`. |
| C23 | Simulasi | dibuat | Simulasi (`sim.js` 450 baris, `tsunami.js`): 8 skenario sesar/megathrust, gelombang P/S, tsunami air dangkal, evakuasi, ilustrasi peringatan dini; dibuka dari laci. |
| C24 | Lapor Warga | sebagian | Backend: jenis guncang, rusak_gedung, tsunami_tanda (`informasi_jenis.js:74-79`) dan migrasi 0020; komit `1ee44ab` menyatakan 0020 belum diterapkan di D1 produksi (tak bisa diperiksa dengan GET). Tab Informasi tidak ada di layar gempa. (tersembunyi di karhutla) |
| C25 | Foto lapangan | sebagian | Tab Foto (galeri, kirim GPS via `../foto.js`, 5 kategori registry) dan 14 foto dummy berlisensi (`img/dummy/gempa/kredit.json`, bukan 100); live `/api/foto?bencana=gempa` 0 foto (dummy belum diisi); lapis Foto di Overlay belum. |
| C26 | Pop-up situasi hari ini | dibuat | Pop-up 'Situasi gempa hari ini' (`sapa.js`, `inti/sapa.js`), sekali per hari WIB (`pb_sapa_gempa`). |
| C27 | Bagikan | dibuat | Adaptor `bagikan.js` + mesin bersama: gambar 4:5/9:16/1:1, xlsx/pdf/pptx. |
| C28 | OG per rute | sebagian | `/gempa/`, `/gempa/peta`, `/gempa/k/G0016` punya og sendiri (`src/og_meta.js:20-24`, live 19 Okt). Tetapi og:image kejadian jatuh ke `ringkasan.png` (gambar karhutla) dan deskripsi berbunyi '12 Okt: 1 gempa M 5+' padahal terkuat 18 Okt. Per provinsi belum. |
| C29 | i18n EN | sebagian | `en.json` memuat kosakata gempa (komit `0f2ecb1`, kebocoran 5-10 saat crawl). Judul laci/Kejadian ('Peluang susulan 7 hari ke depan', 'Perkiraan gelombang di pantai terdekat', 'Indeks risiko riwayat provinsi', 'Memuat kejadian gempa…'), kartu 'Gempa merusak' tidak ada di `en.json`. |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | `persetujuan.js`, `jejak.js data-halaman="gempa"`, `pesan.js`, `kaki.js` (`index.html:161-164`). |
| C31 | Muat / kosong / galat / luring | dibuat | `#muat`, 'Belum ada data', pesan kosong/galat per tab (`mulai.js`, `kejadian.js`). |
| C32 | Mobile 375 px | sebagian | 390 px lolos tanpa scroll horizontal pada audit 16 Okt; tab Kejadian, laci baru, dan isoseismal belum diukur di 375 px, tidak ada uji otomatis. |
| C33 | Klik tidak membekukan | dibuat | Pola `nanti()` di tab/klik (`tab.js:19`, `kejadian.js`), hitung isoseismal/penduduk di luar klik; INP 16 Okt di bawah 100 ms (tab baru belum diukur ulang). |
| C34 | Halaman Tentang dan kartu bencana | dibuat | `tentang.html` kartu Gempa aktif (tujuh bencana, komit `f59388c`). |
| C35 | Statistik publik | dibuat | `/statistik` dengan pemilah halaman dari registry (`public/admin/statistik.js:237`, `tests/warga/statistik.test.mjs`). |
| C36 | Admin moderasi | dibuat | Admin foto/statistik/pesan lintas bencana, kategori dari registry, dummy per bencana (`public/admin/foto.js:56-77`). |
| C37 | Bagikan lanjutan | dibuat | `bagi.js` (QR, WhatsApp, UTM) dimuat lewat `bagikan.js:53`, bersama. |
| C38 | Lapisan tambahan | diadaptasi | `inti/peta/konteks.js` (penduduk, sekolah, fasilitas, jalan; `peta.js:58`) + InaRISK/sesar/lempeng; item khas karhutla (hutan hilang, bekas terbakar) tak berlaku. |
| C39 | Kaki dan Tentang | dibuat | `kaki.js` + `tentang.html` (`tim.json`, `mitra.json`) bersama. |
| D01 | Rute HTML | dibuat | `ruteBencana()` dari registry (`src/worker.js:474`); live 200 untuk `/gempa/`, `/gempa/peta`, `/gempa/kejadian`, `/gempa/sim`, `/gempa/k/G0001`. |
| D02 | Route data cepat | dibuat | `/api/gempa/terbaru/kejadian/status` cache tepi 60 dtk (`src/gempa.js:260-282`), tercatat di `tests/warga/cakupan.json`. |
| D03 | Cron | dibuat | `perbaruiGempa` dipanggil `src/worker.js:615` dari cron tiap menit; uji `cron gempa`. |
| D04 | Status kesegaran | dibuat | Registry `sumber_status`: gempa_terbaru 0,5 jam + berita_gempa 30 jam; live `/api/status` ok, basi kosong. |
| D05 | Lapor warga | sebagian | Jenis gempa/tsunami sudah di katalog dan skema (migrasi 0020, `tests/warga/skema.test.mjs` hijau); layar gempa tidak memakainya dan 0020 produksi belum terverifikasi. |
| D06 | Foto | dibuat | `foto.bencana` + kategori dari registry (`src/foto.js:22-24,87`); live `/api/foto?bencana=gempa` 200 dengan 5 kategori. |
| D07 | Statistik | dibuat | `stat_hari.hal` dari registry (migrasi 0017), `data-halaman="gempa"`. |
| D08 | OG meta | sebagian | Lihat C28: rute ber-og, tetapi gambar kejadian salah (karhutla) dan deskripsi basi. |
| D09 | Dummy | sebagian | 14 foto dummy (`JUMLAH_DUMMY`, `src/foto.js:113`) dan tombol dummy foto di `/admin/foto`; tabel `gempa`/`gempa_kejadian` dibaca layar tanpa tombol dummy (data live, tidak bisa diisi bila sumber mati). |
| D10 | Privasi | dibuat | Bersama: hash IP bergaram harian, DNT/GPC (`src/publik.js`, `tests/warga/klien.test.mjs`). |
| E01 | Self-check per skrip | sebagian | 11 skrip gempa punya `uji` dan terdaftar di `gempa.yml` (11/11 hijau lokal 19 Okt) + dua `uji_js_*`; `uji_js_tsunami.py` tidak terdaftar di workflow mana pun. |
| E02 | Cakupan route/tabel | dibuat | `cakupan.json`: tabel gempa/gempa_kejadian/gempa_sumber, GET `/api/gempa/*`, cron gempa. |
| E03 | Skema D1 | dibuat | `skema.test.mjs` + `gempa.test.mjs` (enam berkas uji warga terkait, 79 tes, hijau 19 Okt). |
| E04 | Registry | dibuat | `gerbang-bencana.test.mjs` hijau (`uji:agen` 57/57 pada 19 Okt malam). |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau; komit `c191384` membuatnya memblokir. |
| E06 | Kesegaran data | dibuat | `/api/status` memuat gempa_terbaru. Catatan: langkah CI 'Periksa kesegaran' memakai default `poskokarhutla.terasurbannetwork.workers.dev` (balasan 404, worker tak ada) kecuali `vars.URL_STATUS` diisi (`lintas.yml:189`). |
| E07 | Beban | dibuat | `ukur_muat.mjs` plafon `/gempa/` 480 KB (terukur 418), `beban.mjs` bobot 5. |
| E08 | i18n | sebagian | `kumpul.mjs` meng-crawl `/gempa/`, tetapi hasil 19 Okt hanya ada di pesan komit; `scripts/i18n/laporan.json` bertanggal 15 Okt; laci dan Kejadian belum tercakup. |
| E09 | Kepemilikan berkas | dibuat | Agen `gempa` memiliki `scripts/gempa/**` dan `public/gempa/**` (`ilmu.mjs pemilik`); `gerbang-ilmu-agent` hijau. |
| E10 | Model agent | dibuat | `.claude/agents/gempa.md` `model: sonnet`; `gerbang-model-agent` hijau. |
| F01 | Pengerja agent | dibuat | Agen `gempa` di roster; ilmu 16 KB. |
| F02 | Dokumen spesifikasi | dibuat | Berkas ini; 113 baris terisi. |
| F03 | Dokumen riset | sebagian | Lihat B10. |
| F04 | Kredit dan lisensi | sebagian | Kredit foto dummy ada; atribusi peta di `bahaya_meta.json` tampil di peta. Halaman Tentang (Sumber data) tidak menyebut USGS, GEM sesar (CC BY-SA), PB2002, NOAA ETOPO; tidak ada `public/gempa/kredit.json`. |

## Catatan

- Dasar bukti 19 Okt: `npm run uji:agen` 57/57, enam berkas `tests/warga` terkait (gempa, gunungapi_arsip, registry, og, foto_bencana, skema) 79 tes hijau, 11 `scripts/gempa/*.py uji` hijau.
- Live: `/api/gempa/terbaru` 12 gempa 72 jam (D1 dibuat 20.0 WIB), `/api/gempa/kejadian` 13 kejadian, `/api/status` tanpa sumber basi.
- Data lokal repo tertinggal dari live (mis. kontak PVMBG, `gunungapi_status.json`); angka berlabel "live" diambil dari worker.
- Komponen tersembunyi di karhutla (posko, sarana, operasi, keputusan, ringkasan, informasi, metode) tidak menghalangi status aktif (aturan `PAKET-FITUR.md`); belum di sini artinya kodenya memang belum ada.
