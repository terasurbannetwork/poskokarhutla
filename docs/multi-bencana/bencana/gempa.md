# Gempa bumi dan tsunami: daftar periksa PAKET-FITUR (113 komponen + G01-G11)

Audit 15 Nov 2026, HEAD f3ab401e2. Setiap baris dibuka di kodenya hari ini, uji dijalankan (21 skrip `uji` hijau, 4 `uji_js_*` hijau, `tests/gempa` 32/32). Paritas diukur terhadap karhutla;
sebelumnya audit 19 Okt 2026 (ADA 69 / SEBAGIAN 25 / BELUM 10 / TIDAK BERLAKU 9 dari 113).

Status: **dibuat**, **diadaptasi** (bentuk beda karena domain), **sebagian**, **belum**, **tidak berlaku** (alasan satu kalimat). ADA = dibuat + diadaptasi.

## Hitungan

Pokok A01-F04 (113): **ADA 67 / SEBAGIAN 29 / BELUM 7 / TIDAK BERLAKU 10** (19 Okt: 69 / 25 / 10 / 9).
Dengan G01-G11 (124): **ADA 70 / SEBAGIAN 32 / BELUM 9 / TIDAK BERLAKU 13**.

## Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id`, awalan | `gempa`, `G` (G0001...; live G0004..G0016) |
| `rute` / `data` | `/gempa/` / `/gempa/data/` (laporan harian `/gempa/laporan.html`) |
| `tab` | peta, insight, katalog, berita, tren, kejadian, dampak, informasi, metode, sim, foto, tentang; `tab_sembunyi` = informasi, metode |
| Tingkat registry | status tsunami resmi BMKG 0-3, tanpa tingkat buatan |
| Cron Worker | `* * * * *`: autogempa tiap menit; gempaterkini, gempadirasakan, USGS tiap 5 menit |
| Workflow | `gempa.yml` harian 01.10 UTC (prospektif susulan, laporan, peluang, DART/EMSC, arsip InaTEWS); `statis.yml` bulanan (riwayat, risiko, InaRISK, sesar, bukti); `lintas.yml` harian (dampak, berita, tsunami_zona, beruntun) |
| Pengerja | `gempa` |

## Tabel

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | diadaptasi | BMKG autogempa/gempaterkini/gempadirasakan + USGS FDSN dipanen Worker (`src/gempa.js:176` TUGAS, urai murni `:47`, `:66`); satu sumber mati tidak mematahkan yang lain, gabung BMKG+USGS <=90 dtk/100 km; fixture dan `tests/warga/gempa.test.mjs` hijau. Katalog historis: `scripts/gempa/riwayat.py`. |
| A02 | Varian keluaran bertingkat | diadaptasi | Bukan berkas bertingkat: `/api/gempa/terbaru?jam=24/72/168/720` (`src/gempa.js:232,260`), batas 3000 baris, cache tepi per jam. |
| A03 | Pengamatan hampir-waktu-nyata | dibuat | Cron tiap menit (`wrangler.jsonc:16`, `src/worker.js:615`): autogempa tiap menit, sisanya tiap 5 menit -> D1 `gempa` -> `/api/gempa/terbaru` cache 60 dtk. Live 19 Okt 20.03 WIB: `/api/status` gempa_terbaru umur 0 jam (ambang 0,5). |
| A04 | Entitas kejadian aktif | dibuat | Susulan kecil kini ditautkan: `src/gempa.js:158,172` tautkanSusulanKecil (M<5 dalam jendela GK), diuji `tests/warga/gempa.test.mjs:166`. Kejadian G aktif via `/api/gempa/kejadian`. |
| A05 | Atribut kejadian | sebagian | Laci (`public/gempa/laci.js:31-56`) memuat M, jenis magnitudo, kedalaman, MMI Dirasakan, prov/kab, status tsunami, peluang susulan, penduduk per kelas MMI, fasilitas, gelombang, risiko provinsi. Belum: sesar terdekat, riwayat M>=6 radius 100 km, kelas InaRISK, kecamatan terdampak per kejadian. |
| A06 | Geometri dampak | diadaptasi | Isoseismal MMI 3-9 sebagai lingkaran dari GMPE (`public/gempa/kejadian.js:45-56`, berlabel perkiraan), bukan kontur ShakeMap; ShakeMap BMKG hanya tautan keluar. Lapisan `sesar.geojson`, `batas_lempeng.geojson`. |
| A07 | Pemecahan muatan | diadaptasi | Tidak ada pemecahan awal/geo: muatan memang kecil (`/api/gempa/kejadian` 3,7 KB). Rute `/gempa/` terukur 418 KB, plafon 480 (`tests/beban/ukur_muat.mjs:49-51`). |
| A08 | Cuaca pendukung | tidak berlaku | Cuaca bukan pemicu gempa. |
| A09 | Indeks bahaya harian | dibuat | `scripts/gempa/guncangan.py` (BSSA14/Zhao06 -> PGA, Worden12 -> MMI) kembar `guncangan.js`, kesetaraan `uji_js_guncangan.py`; koefisien dicocokkan ke OpenQuake 16 Okt. `model_guncangan.json` `kinerja_uji.status` = belum_diuji (ditulis apa adanya). |
| A10 | Prakiraan ansambel | diadaptasi | Bukan ansambel IFS: `peluang.json` (skema peluang/1) = laju Poisson 12 bulan (36 wilayah) + peluang susulan 7 hari (`peluang_gempa.py`, `susulan.py`). Uji balik laju 1990-2015 vs 2016-2025 tercatat (nasional M5+ teramati 1120, di luar selang 90% 1144-1258). |
| A11 | Kondisi latar | tidak berlaku | Tidak ada kondisi latar (tanah, iklim) yang mengubah peluang gempa. |
| A12 | Indeks khusus tambahan | tidak berlaku | Tidak ada indeks riset tambahan yang lolos uji balik; PFVI khusus gambut karhutla. |
| A13 | Aturan status 4 tingkat | diadaptasi | Status resmi BMKG tak ditafsir ulang (`src/gempa.js:26` uraiPotensi); aturan Siaga/Waspada kejadian `src/peringatan.js:39` tingkatGempa, diuji `tests/warga/peringatan.test.mjs`; tingkat tsunami per zona `scripts/gempa/tsunami_zona.py` (`lintas.yml:335`). Tingkat per kabupaten ala `aturan.py` tetap tidak ada. |
| A14 | Prioritas | sebagian | Kartu 'Perlu perhatian' di pop-up (tsunami BMKG, dirasakan; `sapa.js:26-35`), tanpa ambang dari uji balik; registry `prioritas` kosong. |
| A15 | Risiko riwayat 0–100 | dibuat | `risiko.json` 0-100: 38 provinsi, 514 kabupaten, 7.268 kecamatan, radius 100 km, bobot 50:30:20 (`riwayat.py`); tampil di Tren (`tren.js:37`) dan laci (`laci.js:52`). |
| A16 | Kalender musim | tidak berlaku | Gempa tidak bermusim. |
| A17 | Iklim | tidak berlaku | Gempa tidak bergantung ENSO/IOD. |
| A18 | Riwayat grid dan sejarah | sebagian | `riwayat_m5.json`, `riwayat_grid.json`, `riwayat_prov.json` ada, tetapi komit terakhir 16 Okt dan `meta.json` akhir 16 Okt walau `statis.yml:7` jalan tiap tanggal 2 (`0 19 2 * *`): putaran 2 Nov tidak mengubah riwayat, periksa log apakah riwayat.py gagal. |
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
| A32 | Citra satelit | sebagian | `scripts/gempa/citra.py` (dirantai di `statis.yml:94`) menulis `public/gempa/data/citra.json` (2,9 KB) untuk kejadian darat M>=6,5 saja; tidak ada kejadian baru sejak itu dan belum tampil sebagai pembanding sebelum/sesudah karhutla. |
| A33 | Berita | sebagian | `scripts/gempa/berita.py` dijadwalkan `lintas.yml:268-270`, tetapi berkas terlacak `public/banjir/data/berita_gempa.json` berstempel 16 Okt (artikel terbaru 16 Okt); registry `sumber_status` 30 jam (`bencana.json:677`) akan menandai basi bila yang terbit sama. Sentimen belum teruji, judul EN belum. |
| A34 | Video | belum | Tidak ada video gempa (`berita.js:6` dibuang). |
| A35 | Data sektor | diadaptasi | Bandara di zona guncangan: `public/gempa/kata.js:83-86` memakai `gunungapi/data/bandara.json` (140 bandara) lewat model fasilitas yang sama; NOTAM tidak ada. |
| A36 | Kurasi tangan | dibuat | `factsheet_gempa.json`: 8 kasus, tiap baris punya sumber dan tanggal (dicocokkan ke halaman sumber 19 Okt). |
| A37 | Meta | sebagian | `/api/gempa/status` dan `/api/status` hidup, tetapi `public/gempa/data/meta.json` berstempel 16 Okt (lihat A18). |
| A38 | Data statis bulanan | dibuat | `statis.yml:69-90` bulanan: riwayat, bahaya InaRISK, sesar GEM, bukti (Overpass); batimetri ETOPO sekali. |
| A39 | Seri jangka pendek bergulir | dibuat | `laporan.json` 60 hari per provinsi dan kabupaten (`laporan_gempa.py`, `gempa.yml` harian 01.10 UTC; live 19 Okt). |
| A40 | Data respons dan kontak | sebagian | `bpbd.json` + Kontak BPBD terdekat di laci (`laci.js`), disembunyikan CSS seperti karhutla; tidak ada Basarnas/stasiun BMKG. |
| B01 | Model prakiraan | dibuat | Model susulan Reasenberg-Jones dengan keragaman a (`susulan.py`, `model_susulan.json` terbit m5 = true; m6 dan m_1 tidak terbit) + GMPE; stdlib; latih 2000-2019, validasi 2020-2022, uji 2023 sampai 7 hari lalu dibuka sekali (18 Okt). |
| B02 | Uji balik aturan status | sebagian | Susulan M5: n 406, BSS 0,002 terhadap pembanding klimatologi (nyaris setara), tercatat jujur; guncangan `belum_diuji`. Tidak ada aturan status yang diuji balik. |
| B03 | Prospektif | sebagian | `prospektif_susulan.json` bertambah harian (`gempa.yml` langkah prospektif, komit 14 Nov), `emsc_prospektif.json` jalan; `prospektif_guncangan.json` masih terakhir 18 Okt (kosong) dan `pager.py catat` tidak terjadwal, jadi prospektif PAGER tidak menumpuk. |
| B04 | Kasus historis | diadaptasi | Galeri 'Gempa merusak' di Tren dari `factsheet_gempa.json` (8 kasus, `tren.js:46-55`), bukan 123 kejadian model lipat. |
| B05 | Galat dan pendorong | diadaptasi | Reliabilitas dan diagnostik di `model_susulan.json` dan bab Metode; pendorong paparan = alasan `bukti.json`. Tidak ada kartu galat terpisah (disembunyikan di karhutla). |
| B06 | Tren jangka panjang | sebagian | Tren per bulan dan per tahun per kelas M (`tren.js`) dan komponen tren di risiko; tanpa uji tren (Theil-Sen/Mann-Kendall). |
| B07 | Kesetaraan Python↔JS | sebagian | `uji_js_susulan.py` dan `uji_js_guncangan.py` jalan di `gempa.yml:34-35`; `uji_js_tsunami.py` dan `uji_js_pager.py` hijau lokal 15 Nov tetapi tidak dipanggil workflow mana pun. |
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
| C14 | Insight | dibuat | Insight (`insight.js:14-16`): kartu terkini, dirasakan, susulan, peluang, provinsi, riwayat, tsunami, bukti, tabel. |
| C15 | Tabel kejadian | dibuat | Tab Kejadian: tabel G dengan kepala gelap, urut, paginasi 10/hal (`kejadian.js:11-17`). |
| C16 | Cerita | sebagian | Kartu Cerita ada di mesin bersama (`inti/cerita.js`, dimuat `index.html:148`); Insight gempa belum memakainya sebagai modul sendiri seperti karhutla. |
| C17 | Berita | sebagian | Volume harian, Sorotan, Topik, Daftar (`berita.js`). Dibuang: nada/sentimen (belum teruji), peta berita, celah liputan, pantauan media, video, berita internasional; judul EN belum. |
| C18 | Tren | dibuat | Tren 5 kartu (`tren.js:59`): per bulan, per tahun, kedalaman, risiko, gempa merusak; tanpa kalender musim. |
| C19 | Posko, Sarana, Operasi, Keputusan | belum | Posko, Sarana, Operasi, Keputusan belum. (tersembunyi di karhutla) |
| C20 | Dampak | sebagian | Tab Dampak (`dampak.js`): penduduk per kelas bahaya, per provinsi, MMI gempa terbesar, fasilitas rawan; kerusakan bangunan (`kerusakan.js`, `kalibrasi_kerusakan.json`) dan PAGER (`pager.js`) tampil. Belum: korban/kerugian historis DIBI terpadu, jalan/jembatan. |
| C21 | Dashboard pimpinan | belum | Tidak ada `ringkasan.js`; `/gempa/laporan.html` (kontrak laporan v1, 60 hari) sebagian padanannya. (tersembunyi di karhutla) |
| C22 | Metode | dibuat | `metode.js`: bab guncangan, susulan, tsunami, evakuasi, bukti, paparan, laporan, batasan; tab disembunyikan (`tab_sembunyi`) tetapi dapat dibuka `/gempa/metode`. |
| C23 | Simulasi | dibuat | Simulasi (`sim.js` 450 baris, `tsunami.js`): 8 skenario sesar/megathrust, gelombang P/S, tsunami air dangkal, evakuasi, ilustrasi peringatan dini; dibuka dari laci. |
| C24 | Lapor Warga | sebagian | Tab Informasi kini ada di layar (`index.html:139,190`, `tab.js:5` tersembunyi dari nav seperti karhutla, terbuka lewat `/gempa/informasi`); migrasi 0020 di D1 produksi tidak dapat diperiksa dengan GET. |
| C25 | Foto lapangan | sebagian | Tab Foto (`index.html`, kategori registry); 14 foto dummy `public/img/dummy/gempa` sudah dipensiunkan pemilik 11 Nov, jadi galeri nyata bergantung kiriman warga; lapis Foto di Overlay belum. |
| C26 | Pop-up situasi hari ini | dibuat | Pop-up Situasi gempa hari ini (`sapa.js`), sekali per hari WIB. |
| C27 | Bagikan | dibuat | Adaptor `bagikan.js` + mesin bersama: gambar 4:5/9:16/1:1, xlsx/pdf/pptx. |
| C28 | OG per rute | sebagian | `/gempa/`, `/gempa/peta`, `/gempa/k/G0016` punya og sendiri (`src/og_meta.js:20-24`, live 19 Okt). Tetapi og:image kejadian jatuh ke `ringkasan.png` (gambar karhutla) dan deskripsi berbunyi '12 Okt: 1 gempa M 5+' padahal terkuat 18 Okt. Per provinsi belum. |
| C29 | i18n EN | sebagian | `en.json` memuat 'Perkiraan gelombang di pantai terdekat' tetapi tidak 'Peluang susulan 7 hari ke depan' dan 'Indeks risiko riwayat provinsi'; tab Katalog BMKG dan Kejadian belum diaudit EN. |
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
| D09 | Dummy | tidak berlaku | Pemilik pensiunkan data dummy 11 Nov 2026. |
| D10 | Privasi | dibuat | Bersama: hash IP bergaram harian, DNT/GPC (`src/publik.js`, `tests/warga/klien.test.mjs`). |
| E01 | Self-check per skrip | sebagian | Self-check `uji` hijau lokal 15 Nov untuk 21 skrip (bahaya, batimetri, berita, bukti, dampak, guncangan, laporan_gempa, peluang_gempa, riwayat, sesar, susulan, beruntun, tsunami_zona, inatews, dart, emsc, gnss, pager, katalog_pdf, kajian_magma, citra) dan 4 `uji_js_*`; `tests/gempa/*.test.mjs` 32/32. Tidak terdaftar di workflow: pager, katalog_pdf, kajian_magma, vs30, `uji_js_tsunami`, `uji_js_pager`. |
| E02 | Cakupan route/tabel | dibuat | `cakupan.json`: tabel gempa/gempa_kejadian/gempa_sumber, GET `/api/gempa/*`, cron gempa. |
| E03 | Skema D1 | dibuat | `skema.test.mjs` + `gempa.test.mjs` (enam berkas uji warga terkait, 79 tes, hijau 19 Okt). |
| E04 | Registry | dibuat | `gerbang-bencana.test.mjs` hijau (`uji:agen` 57/57 pada 19 Okt malam). |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau; komit `c191384` membuatnya memblokir. |
| E06 | Kesegaran data | sebagian | `/api/status` memuat gempa_terbaru, tetapi `lintas.yml` Periksa kesegaran memakai URL bawaan lama kecuali `vars.URL_STATUS` diisi (tidak diperiksa ulang 15 Nov). |
| E07 | Beban | dibuat | `ukur_muat.mjs` plafon `/gempa/` 480 KB (terukur 418), `beban.mjs` bobot 5. |
| E08 | i18n | sebagian | `kumpul.mjs` meng-crawl `/gempa/`; di `public/i18n/en.json` hanya 1 dari 3 judul laci uji ('Perkiraan gelombang di pantai terdekat'); 'Peluang susulan 7 hari ke depan' dan 'Indeks risiko riwayat provinsi' tidak ada. |
| E09 | Kepemilikan berkas | dibuat | Agen `gempa` memiliki `scripts/gempa/**` dan `public/gempa/**` (`ilmu.mjs pemilik`); `gerbang-ilmu-agent` hijau. |
| E10 | Model agent | dibuat | `.claude/agents/gempa.md` `model: sonnet`; `gerbang-model-agent` hijau. |
| F01 | Pengerja agent | dibuat | Agen `gempa` di roster; ilmu 16 KB. |
| F02 | Dokumen spesifikasi | dibuat | Berkas ini; 113 baris + G01-G11 terisi 15 Nov. |
| F03 | Dokumen riset | sebagian | Lihat B10. |
| F04 | Kredit dan lisensi | sebagian | Kredit foto dummy ada; atribusi peta di `bahaya_meta.json` tampil di peta. Halaman Tentang (Sumber data) tidak menyebut USGS, GEM sesar (CC BY-SA), PB2002, NOAA ETOPO; tidak ada `public/gempa/kredit.json`. |

## Komponen baru (audit 15 Nov)

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | diadaptasi | `src/instansi.js:644,1027,1170,1176` (gempa: penutupan Tanpa dampak, kedaluwarsa 72 jam), `src/penugasan.js:43` daftar bekal gempa; `lintas.yml:293` tugas_<id>.json mengambil `GEMPA_API`; `tests/warga/tugas_bencana.test.mjs`. Tidak ada level 3 / sinyal reda khas gempa. |
| G02 | Operasi udara/darat | tidak berlaku | Tidak ada aset udara respons gempa di data terbuka; `src/operasi_*.js` dan `public/operasi_*` tidak menyebut gempa. |
| G03 | Sarana lapangan terencana | belum | `src/sippa.js` dan `public/pipa/**` tidak memuat gempa (grep 15 Nov); SIPPA khusus pipa karhutla/banjir. |
| G04 | Laporan harian/penanganan otomatis | sebagian | `public/gempa/laporan.html` + `laporan.json` (harian, `laporan_gempa.py`, `gempa.yml:42`); `src/laporan_bencana.js:1` laporan multi-bahaya memuat gempa; `public/bnpb/dokumen_laphar.js` menyebut gempa; bot WA `scripts/wa/urai_laporan.py:72` memetakan kode 107/108. Deck PPTX khusus gempa tidak ada. |
| G05 | Dalops: cek kabar luar, saringan, tindak lanjut | diadaptasi | `scripts/data/dalops_kabar.py:30` sumber gempa `berita_gempa.json`, uji P9 tingkat provinsi `:302`; `public/bnpb/dalops.js:21,28` saringan gempa dan lapisan gempa BMKG `:236-252`; tindak lanjut `src/dalops_tindak.js` generik. Kabar luar bergantung berita_gempa yang basi (A33). |
| G06 | Prakiraan +1..+3 hari dinilai prospektif | sebagian | `scripts/prediksi/dampak.py:5,23` dan `public/prediksi/prediksi.js:205-215` hanya menampilkan risiko riwayat/InaRISK per kab; tanpa prakiraan harian (gempa tak diprakirakan; `prospektif_susulan.json` terpisah dari /prediksi). |
| G07 | Semai awan dan prakiraan asap | tidak berlaku | Gempa tidak dipengaruhi cuaca dan tidak ada asap. |
| G08 | Masuk laporan berkala Kepala BNPB | belum | `scripts/berkala/` tidak ada di repo; paket `data/kajian-bnpb/laporan-berkala` belum berkode, tidak ada rujukan gempa. |
| G09 | Peringatan dini tersambung (EWS, CAP) | dibuat | `src/ews.js:29,47-50,221-230` (radius gempa, tsunami 500 km, cron tiap menit), `src/peringatan.js:37-40` (Waspada/Siaga), `src/ews_email.js` emailGempa; `tests/warga/ews.test.mjs`, `peringatan.test.mjs`. |
| G10 | Renlap lengkap | tidak berlaku | Renlap Operasi Udara karhutla; gempa tidak punya rencana operasi udara harian. |
| G11 | Pembuat dokumen | sebagian | Factsheet `factsheet_gempa.json`, bagikan PDF/PPTX/xlsx lewat `bagikan.js`, `laporan.html`; siklus Kaji Cepat gempa `scripts/siklus/kaji_gempa.py` (`siklus.yml:105`), `src/siklus_kaji.js:12` MODEL gempa; sitrep dan laporan kejadian per KIB belum khusus gempa. |

## Catatan

- Dasar bukti 15 Nov: `node --test tests/gempa/*.test.mjs` 32 lulus; `python3 scripts/gempa/<skrip>.py uji` 21 hijau; `uji_js_susulan/guncangan/tsunami/pager` hijau. Tidak ada uji worker dijalankan (di luar wilayah).
- Segar di git: laporan.json, peluang.json, prospektif_susulan.json, tsunami_zona.json, beruntun.json (14 Nov), inatews_katalog.json (14 Nov 22.38 UTC). Basi: meta/riwayat 16 Okt, berita_gempa 16 Okt, dart/gnss 29 Okt, model_guncangan 18 Okt (belum_diuji).
- Komponen tersembunyi di karhutla tidak menghalangi status aktif; belum di sini artinya kode memang belum ada.
