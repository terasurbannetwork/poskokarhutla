# Paket fitur standar per bencana

Daftar ini adalah semua yang dimiliki karhutla per 15 Okt 2026, dipecah jadi komponen bernomor.
Tiap bencana baru wajib mengisi SETIAP baris dengan salah satu dari tiga nilai:

- **dibuat**: komponen ada dan lolos gerbangnya,
- **diadaptasi**: bentuknya berbeda karena domain, dan perbedaannya ditulis,
- **tidak berlaku**: dengan alasan satu kalimat yang bisa dibantah (bukan "belum sempat").

Bencana tidak boleh berstatus `aktif` di registry selama ada baris kosong atau "belum"
(dijaga `tests/agen/gerbang-bencana.test.mjs`, butir 7).

**Paritas diukur terhadap karhutla yang TAMPIL, bukan yang disembunyikan.** Pemilik sudah
menyembunyikan sebagian fitur karhutla (ledger memori `fitur-disembunyikan`; `TAB_SEMBUNYI` di
`public/index.html` ±baris 1696 = ringkasan, posko, informasi, kompleks, metode; di laci,
"Respons terdekat" dan "Tindakan yang disarankan" disembunyikan, ±baris 198; kartu uji/galat model
di Insight disembunyikan). Komponen seperti itu **tetap dibuat di kode** untuk bencana baru, tetapi
ikut disembunyikan dengan cara yang sama (`tab_sembunyi`, bagian laci tersembunyi) dan tidak
menghalangi status `aktif`. Membukanya adalah keputusan pemilik per bencana. Satu pengecualian:
halaman Metode wajib ada (gerbang butir 6) walaupun tersembunyi, karena itu tempat rumus diuji orang.

Kolom "Rujukan karhutla" menunjuk kode yang ditiru. Kolom "Cara membuat" adalah resep generik;
spesifik per bencana ada di `bencana/<id>.md`.

## A. Data dan pipeline

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | FIRMS 4 sensor NRT, 7 hari (`harian.py hotspot`) | Katalog kejadian/pengamatan resmi bencana itu | Skrip `scripts/<id>/amati.py` memanen sumber utama + cadangan; simpan mentah ke cache Actions; keluaran tabel `{kolom, baris}` dengan `acuan` wilayah | `uji` memeriksa skema respons nyata dari berkas contoh tersimpan |
| A02 | Varian keluaran bertingkat | `hotspot24/72/semua.json` | `<pengamatan>24/72/semua.json` | Satu fungsi tulis, tiga potongan waktu, kolom sama | Ukuran tiap berkas di bawah plafon |
| A03 | Pengamatan hampir-waktu-nyata | Cron Worker FIRMS → D1 `titik_terbaru` → `/api/titik`, `titik_live.js` | `kejadian_langsung` → `/api/<id>/terbaru` | `src/<id>.js` dengan `perbarui<Id>(env)`; dipanggil pengatur cron; layar menimpa data harian | Uji Miniflare: cron mengisi D1, route menjawab, data basi ditandai |
| A04 | Entitas kejadian aktif | Kompleks api: DBSCAN VIIRS 1,5 km, aktif 72/168 jam (`harian.py dbscan`) | "Kejadian" bencana itu dengan kode `<awalan>0001` | Aturan pengelompokan atau satu-baris-satu-kejadian; masa aktif tertulis; kode stabil antar-run | `uji`: kode tidak berubah bila data sama; kejadian kedaluwarsa tepat waktu |
| A05 | Atribut kejadian | Luas, FWI terdekat, gambut, kawasan, konsesi, penanggung jawab, Daops terdekat, risiko riwayat, skor, `api24` | Besaran, lokasi administratif, kondisi pemicu, bahaya InaRISK, fasilitas terdekat, paparan penduduk, skor | Pakai `scripts/umum/wilayah.py`, `inarisk.py`, `penduduk.py` | `uji` invarian: tiap kejadian punya prov/kab/kec |
| A06 | Geometri dampak | Garis api organik (`garis_api.py`: raster 375 m, closing, marching squares, Chaikin) | Area dampak (guncangan, KRB, sel hujan, area kering) | Poligon dari model atau sumber resmi; disederhanakan; dipecah `<x>_awal` + `<x>_geo` dimuat malas | Ukuran `_awal` kecil; poligon valid |
| A07 | Pemecahan muatan | `kluster_awal.json` + `kluster_geo.json` | `kejadian_awal.json` + `kejadian_geo.json` | Atribut ringan dulu, geometri belakangan | `ukur_muat.mjs` per rute |
| A08 | Cuaca pendukung | Open-Meteo per sel 0,5° untuk FWI | Variabel pemicu bencana itu | `scripts/umum/jaring.py` + kisi bersama | Kuota dicatat |
| A09 | Indeks bahaya harian | FWI Kanada (`fwi.py`) | Indeks fisik domain (mis. HTH/SPI kekeringan, intensitas hujan longsor) | Rumus diterbitkan, dikutip sumbernya, self-check terhadap contoh literatur | `uji` mencocokkan contoh terbitan |
| A10 | Prakiraan ansambel | ECMWF IFS 51 anggota → P(FWI≥7), P(≥14), median, P10/P90 (`ansambel.py`) | Peluang melewati ambang domain | Ansambel Open-Meteo; peluang per sel per hari | Kuota; anggota hilang ditangani |
| A11 | Kondisi latar | Kelembapan tanah vs iklim 2015–2025 (`tanah.py`) | Anomali latar domain | Persentil terhadap klimatologi; klimatologi dicache | Persentil 0–100 |
| A12 | Indeks khusus tambahan | PFVI gambut (`pfvi.py`, lapisan disembunyikan) | Indeks riset domain | Hanya bila ada uji balik; boleh disembunyikan | `validasi-model` |
| A13 | Aturan status 4 tingkat | `aturan.py`: STATUS, kelas, keparahan, cuaca hanya menaikkan | Status Pantau Bencana per wilayah; status resmi lembaga ditampilkan terpisah dan didahulukan | `scripts/umum/status.py` + ambang domain di `scripts/<id>/aturan.py` | `uji` + uji balik (B02) |
| A14 | Prioritas | `PRIOR_PX=15` dan FWI≥7, uji balik 2019/2023 tertulis di docstring | Kejadian yang butuh perhatian pertama | Ambang dari uji balik, angka tangkapan/presisi ditulis | Angka di docstring = angka di `validasi.json` |
| A15 | Risiko riwayat 0–100 | 50% kekerapan, 30% besaran, 20% tren (`risiko_riwayat`) | Sama | `scripts/umum/riwayat.py` | `uji` |
| A16 | Kalender musim | Per dasarian per provinsi, El Niño vs biasa (`musim.py`) | Musim domain (hujan, kemarau, erupsi tidak musiman → "tidak berlaku") | idem | idem |
| A17 | Iklim | ONI/RONI, DMI, status CPC (`iklim.py`) | Dipakai bersama: `public/data/umum/iklim.json` | Pindah ke `data/umum` | — |
| A18 | Riwayat grid dan sejarah | `riwayat_grid.json` 0,1°, `sejarah.json` VIIRS 2015– | Katalog historis domain | Arsip resmi + grid kekerapan | Jumlah baris historis tidak menyusut |
| A19 | Statistik per provinsi | `wilayah.json` (harian, kluster, level, FWI maks) | idem | Agregat dari A04/A13 | — |
| A20 | Data lembaga | `bnpb.json` (BNPB karhutla), `inarisk.json`, `bpbd.json` | Status/rilis resmi lembaga domain | Panen apa adanya, label lembaga | `status-resmi` |
| A21 | Posko | Greedy maximum coverage, bobot kompleks, desa OSM, 4 tingkat (`posko.py`) | Lokasi pos/pengungsian/aju | `scripts/umum/posko.py`, bobot domain | `uji` cakupan ≥ target |
| A22 | Operasi | Regu-hari, mop-up, titik bor, heli; `KOEF` lo/mid/hi bersumber (`operasi.py`) | Kebutuhan sumber daya domain (tenda, air bersih, alat berat, SAR) | Koefisien bersumber, Python↔JS setara | `uji` kesetaraan node |
| A23 | Aset udara | Pangkalan heli, OMC (`udara_rekom.py`) | Aset udara/logistik domain atau "tidak berlaku" | — | — |
| A24 | Keputusan ekonomi | Regresi luas~titik, Monte Carlo lo/mid/hi (`keputusan.py`) | Biaya respons vs kerugian dihindari | idem | `uji` |
| A25 | Preventif | Profil + rencana pencegahan (`preventif.py`) | Mitigasi domain | idem | idem |
| A26 | Penanggung jawab lahan | Konsesi tanpa nama perusahaan (`konsesi_kompleks.py`) | Pemilik/pengelola aset terdampak bila relevan | Netral, tanpa nama pribadi | `security-reviewer` privasi |
| A27 | Dampak | `dampak.py`: udara, ISPA, sekolah, lintas batas, lahan, emisi, ekonomi, kerugian, asumsi | Dampak domain dari data yang sama | Dihitung tanpa jaringan dari JSON lain, asumsi bernama | `cek()` + `uji` |
| A28 | Paparan penduduk | WorldPop per sel/kecamatan (`penduduk.py`) | Penduduk di area dampak | `scripts/umum/penduduk.py` | — |
| A29 | Sekolah dan fasilitas | `sekolah.py`, `fasilitas.json`, OSM | Fasilitas di area dampak (RS, sekolah, jembatan) | Data statis bulanan dipakai bersama | — |
| A30 | Muatan Dashboard | `ringkasan.json` | idem | Potongan ringan dari JSON lain | Ukuran ≤ 50 KB |
| A31 | Cuaca per jam untuk simulasi | `cuaca_jam.py` per sel 0,5° | Bila ada simulasi | idem | — |
| A32 | Citra satelit | Sentinel-2 COG HTTP Range, cadangan GIBS (`citra.py`), tidak pernah gagal | Citra sebelum/sesudah area kejadian | idem, keluar 0 bila gagal | — |
| A33 | Berita | Google News RSS, geocoding, sentimen 2 dimensi, EN, arsip bergulir, label uji (`berita.py`) | Kueri dan topik domain | `scripts/umum/berita.py` + kueri `scripts/<id>/berita_kueri.json` | Label uji ≥ 200 per bencana; akurasi dilaporkan |
| A34 | Video | YouTube Data API, anggaran kuota (`video.py`) | idem | Kuota per bencana | — |
| A35 | Data sektor | Penerbangan + METAR (`penerbangan.py`, `metar.py`) | Sektor terdampak domain (penerbangan untuk abu vulkanik, pelayaran untuk gelombang) | idem | — |
| A36 | Kurasi tangan | `factsheet_karhutla.json`, `luas_resmi.json`, `operasi_resmi.json` | `factsheet_<id>.json` dll. | Berkas berkolom `sumber` dan `tanggal` | Tiap baris punya sumber |
| A37 | Meta | `meta.json`: dibuat, data_terakhir, hari_wib, status | idem | `simpan.py` menaruh `dibuat` pertama | `/api/status` |
| A38 | Data statis bulanan | `statis.yml`: OSM, kanal, jalan, penduduk, konsesi | Lapisan statis domain (KRB, sesar, zona tsunami) | Bulanan, di-commit | — |
| A39 | Seri jangka pendek bergulir | `scripts/data/harian30.py` → `harian30.json` (100 hari per prov/kab, hanya di cache Actions), `tren_karhutla.json` | Seri harian kejadian/indeks per wilayah | Bergulir, dicache | Panjang seri tidak menyusut |
| A40 | Data respons dan kontak | `scripts/scrape/daops.py` → `daops.json`; kurasi `tim.json`, `kontak.json`, `mitra.json` | Unit respons domain (BPBD, Basarnas, pos PVMBG, stasiun BMKG) dan kontak | Panen + kurasi tangan bersumber | Tiap baris punya sumber |

## B. Model, uji balik, kejujuran angka

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| B01 | Model prakiraan | GBDT stdlib 40 fitur, pohon datar dievaluasi di peramban (`scripts/sebaran/`) | Model prakiraan domain yang realistis dengan stdlib | Latih 2015–22, validasi 2023, uji 2024–26 dibuka sekali | `validasi-model` |
| B02 | Uji balik aturan status | Tangkap 90–95%, presisi 35–53% (2019/2023); banjir: POD/FAR/CSI/PSS/ETS, bootstrap blok vs DIBI | idem terhadap katalog kejadian | `scripts/umum/ujibalik.py` | Angka di layar = angka di JSON |
| B03 | Prospektif | Catatan append-only tiap 3 jam, dinilai 72 jam kemudian (`prospektif.py`) | idem | `scripts/umum/prospektif.py` | Berkas tidak pernah menyusut |
| B04 | Kasus historis | 123 kejadian, model lipat tanpa bocoran (`kasus.py`) | Galeri kejadian besar masa lalu | idem | — |
| B05 | Galat dan pendorong | `galat.py`, `pendorong.py` | idem | idem | — |
| B06 | Tren jangka panjang | Theil-Sen, Mann-Kendall (`musim_awal.py`) | idem | idem | — |
| B07 | Kesetaraan Python↔JS | `uji_js.py`, `operasi.py uji` lewat node | Tiap rumus yang ada di dua bahasa | Uji node di blok "Uji aturan" | Wajib |
| B08 | Selang ketidakpastian | CQR P10/P90, Platt (`model_sebaran.json`) | idem | idem | — |
| B09 | Kinerja tercatat | `kinerja_uji` di JSON model, tampil apa adanya | idem | — | `selera-angka` |
| B10 | Dokumen riset | `RISET-SEBARAN.md`, `RISET-PFVI.md`, `PAPER-PFVI.md` | `scripts/<id>/RISET-*.md` | Ditulis saat tahap riset | Ada sebelum `aktif` |

## C. Layar publik

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| C01 | Kepala + menu bencana | `header.top`, `details.bencana` | Dari registry | `inti/kepala.js` | `gerbang-bencana` butir 2 |
| C02 | Tab dan URL bersih | 13 tab, `TAB_SEMBUNYI`, `ALIAS`, `/k/K0001` | Dari registry | `inti/tab.js` | Uji rute worker |
| C03 | Tema terang/gelap | `#tema`, `pk-tema`, `Peta.gantiDasar` | Satu kunci tema untuk semua bencana | `inti/tema.js` | Kontras AA |
| C04 | Waktu data | `#upd` | idem | dari `meta.json` | — |
| C05 | Panel kiri | Crumb, mode Real Time/Riwayat/Kompleks, cari, daftar, sakelar tren | Mode Sekarang/Riwayat/Kejadian | `inti/panel.js` | INP |
| C06 | Rentang waktu | Hari ini / Kemarin / 72 jam / 7 hari | Sesuai irama bencana | `inti/rentang.js` | — |
| C07 | Garis waktu prakiraan | `#garisWaktu`, `#fwiHari` | Hari prakiraan indeks domain | idem | — |
| C08 | Panel lapisan | 4 kelompok, ~25 lapisan, muat malas | Kelompok: Kejadian & respons, Pemicu, Bahaya statis, Infrastruktur | `inti/lapis.js` | Muat malas diuji |
| C09 | Choropleth wilayah + kartu hover | `wil-fill`, `SKALA_WIL`, `kartuTip` (lambang, angka, tren) | idem | `inti/peta.js` | — |
| C10 | Gelembung cluster | `prio-klaster`, angka tidak bertumpuk | idem | idem | — |
| C11 | Popup titik | Jam, sensor, keyakinan, FRP | Atribut pengamatan domain | idem | `selera-angka` |
| C12 | Laci kejadian | 9 bagian: saat ini, cuaca, penjelasan status, tindakan, respons terdekat, lahan, InaRISK, riwayat, simulasi; bagikan `/k/<id>`, Google Maps | Bagian yang sama dengan isi domain | `inti/laci.js` + bagian khas | `selera-angka`, `inp-reviewer` |
| C13 | Legenda | `renderLegenda` | idem | idem | — |
| C14 | Insight | ~14 exhibit + modul tambahan; gaya kartu pil tanpa subjudul/KPI (memori pemilik) | Exhibit domain, lihat daftar minimum di `bencana/<id>.md` | `inti/insight.js` | Memori "Gaya kartu Insight" |
| C15 | Tabel kejadian | `#kompleks`, `Tabel` | idem | `inti/tabel.js` | — |
| C16 | Cerita | `cerita_karhutla.js` (bab: penempatan regu, 25 tahun, musim, pendorong, model, uji model) | `cerita_<id>.js` | Setelah data historis lengkap | — |
| C17 | Berita | Volume harian + sentimen, filter, nasional/internasional, ruang krisis media | idem | Inti berita bersama | — |
| C18 | Tren | Indeks risiko 0–100, kalender musim, historis | idem | `inti/tren.js` | — |
| C19 | Posko, Sarana, Operasi, Keputusan | 4 sub-tab | idem | `inti/posko.js` | Kesetaraan Python↔JS |
| C20 | Dampak | 10 bagian `JUDUL` | Bagian dampak domain | `public/<id>/dampak.js` | `selera-angka` |
| C21 | Dashboard pimpinan | 6 bagian: situasi, keputusan hari ini, prakiraan 72 jam, sentimen, penanggung jawab & sumber daya, sumber | idem | `public/<id>/ringkasan.js` | — |
| C22 | Metode | Per bab: singkatnya, alur, contoh hitung dengan data hari ini, rincian teknis, batasan | idem, semua rumus A09–A27 dan B01–B03 | `inti/metode.js` | Tiap rumus di kode punya bab |
| C23 | Simulasi | Fisika FBP + Dijkstra 72 jam, skenario, mode Perlakuan, model data | Simulasi domain bila ada model fisik yang jujur; jika tidak: "tidak berlaku" | `public/<id>/sim.js` | `validasi-model` |
| C24 | Lapor Warga | `informasi.js`, jenis per bahaya | Jenis laporan domain | `informasi_jenis.js` + migrasi rujukan | `skema.test.mjs` |
| C25 | Foto lapangan | `foto.js`: kirim GPS, galeri, peta, rincian, upvote, komentar, aduan, dummy 100 foto berlisensi | Kategori foto domain; dummy foto domain berlisensi | registry `foto_kategori` | `foto.test.mjs` |
| C26 | Pop-up situasi hari ini | `sapa.js`: naik/turun, kejadian baru, bertahan, asap, peringatan BMKG | Isi domain | `inti/sapa.js` + penyuntik | Sekali per hari WIB |
| C27 | Bagikan | Gambar IG 4:5/9:16/1:1, template, xlsx/pdf/pptx | Template domain | `bagikan.js` cabang `<id>` | — |
| C28 | OG per rute | `/`, `/peta`, `/k/K0001`, `?wil=62`, `/f/:id` | `/<id>/...` | `scripts/umum/og.py`, `og_meta.js` | `og.test.mjs` |
| C29 | i18n EN | Kamus 6.618 entri + 24 pola, crawl kebocoran | `en-<id>.json` + glosarium domain | idem | Crawl nol kebocoran |
| C30 | Persetujuan, jejak, pesan, kaki | Bersama | Bersama | — | `klien.test.mjs` |
| C31 | Muat / kosong / galat / luring | Kerangka muat, pesan kosong per tab | idem | `inti/muat.js` | Tiap tab punya empat keadaan |
| C32 | Mobile 375 px | Tanpa scroll horizontal, target sentuh ≥ 44 px | idem | — | Uji 375 px |
| C33 | Klik tidak membekukan | Pola `nanti()`, chrome urgent, subtree deferred (INP.md) | idem | — | `inp-reviewer` |
| C34 | Halaman Tentang dan kartu bencana | `tentang.html` hero 5 bencana | Kartu dari registry | `inti/kepala.js` atau splice | Ikon benar, status dari registry |
| C35 | Statistik publik | `/statistik` dengan pemilah halaman | Pemilah bencana | Dari registry | — |
| C36 | Admin moderasi | `src/admin_halaman.js`, `public/admin/{foto,statistik,pesan,masuk}.js`: antrean laporan/foto, pesan, statistik, dummy 🧪/🧹 | Pemilah `bahaya` di semua antrean; dummy per bencana | Satu panel admin untuk semua bencana | `uji:warga` |
| C37 | Bagikan lanjutan | `public/bagi.js` (QR, WhatsApp, lembar bawaan, UTM), "Bagikan video" Insight Musim (`rekamVideo`) | idem | Bersama | — |
| C38 | Lapisan tambahan | `public/lapisan5.js` (hutan hilang, bekas terbakar, sekolah, fasilitas, Daops, lencana iklim), `public/databaru.js` (peringatan BMKG, ansambel, tanah) | Lapisan konteks domain | Modul tambalan `public/<id>/lapisan.js` | Muat malas |
| C39 | Kaki dan Tentang | `public/kaki.js` (`kontak.json`), `tentang.html` (`tim.json`, `mitra.json`) | Bersama, dengan kartu bencana dari registry | — | — |

## D. Worker dan D1

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| D01 | Rute HTML | `HTML_RUTE`, `HALAMAN` | Dari registry | ARSITEKTUR §4 | Uji rute |
| D02 | Route data cepat | `/api/titik` cache tepi 600 s | `/api/<id>/terbaru` cache 30–60 s | `src/<id>.js` | `cakupan.json` |
| D03 | Cron | `15 */3 * * *` FIRMS, `17 * * * *` bersih-bersih | Pengatur satu menit | `src/jadwal.js` | Uji jadwal |
| D04 | Status kesegaran | `SUMBER_STATUS` | Dari registry | — | CI merah bila basi |
| D05 | Lapor warga | Tabel `laporan`, batas laju, Turnstile, CSRF, `bersihTeks` | Jenis domain | Migrasi rujukan | `api.test.mjs` |
| D06 | Foto | `foto` + suka/komentar/aduan/audit/laju | `foto.bahaya` | Migrasi 0009 | `foto.test.mjs` |
| D07 | Statistik | `stat_hari.hal`, `HAL` | Dari registry | Migrasi 0009 | `statistik.test.mjs` |
| D08 | OG meta | `og_meta.js` | Rute bencana | — | `og.test.mjs` |
| D09 | Dummy | Tombol 🧪/🧹, kolom `dummy`, lencana "contoh" (DUMMY.md) | Tiap tabel baru yang dibaca layar bertombol dummy | `POST /api/<id>/dummy` bila ada tabel D1 khas | `05-dummy-jejak` pola DUMMY.md |
| D10 | Privasi | Hash IP bergaram harian, garam dimusnahkan, DNT/GPC | Sama | — | `security-reviewer` |

## E. Gerbang dan uji

| Kode | Komponen | Rujukan karhutla | Untuk bencana baru |
| --- | --- | --- | --- |
| E01 | Self-check per skrip | `python3 x.py uji`, blok "Uji aturan" di `data.yml` | Tiap skrip `scripts/<id>/*.py` punya `uji` dan terdaftar di workflow |
| E02 | Cakupan route/tabel | `tests/warga/cakupan.json`, utang hanya menyusut | Route dan tabel baru langsung `diuji` |
| E03 | Skema D1 | `skema.test.mjs` di `node:sqlite` | Tabel rujukan vs katalog vs registry |
| E04 | Registry | — | `gerbang-bencana.test.mjs` |
| E05 | Duplikasi inti | — | `gerbang-inti.test.mjs` |
| E06 | Kesegaran data | `/api/status` 503 + langkah akhir CI | Sumber bencana masuk registry |
| E07 | Beban | `beban.mjs` 100 rb/hari lonjakan 50×, `ukur_muat.mjs` | Dijalankan per rute bencana |
| E08 | i18n | `kumpul.mjs` crawl dua arah | Per rute bencana |
| E09 | Kepemilikan berkas | `gerbang-ilmu-agent` | Pengerja baru memiliki semua berkas bencana |
| E10 | Model agent | `gerbang-model-agent` | Agent baru wajib `model:` |

## F. Armada dan dokumen

| Kode | Komponen | Untuk bencana baru |
| --- | --- | --- |
| F01 | Pengerja agent | Entri roster, `npm run agents:build`, ilmu dari kode nyata |
| F02 | Dokumen spesifikasi | `docs/multi-bencana/bencana/<id>.md` dengan daftar periksa A01–F04 terisi |
| F03 | Dokumen riset | `scripts/<id>/RISET-*.md` (sumber, ambang, uji balik) |
| F04 | Kredit dan lisensi | Semua sumber data dan foto tercatat di `public/<id>/kredit.json` dan halaman Tentang |
