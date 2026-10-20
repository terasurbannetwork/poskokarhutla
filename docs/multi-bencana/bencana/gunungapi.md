# Letusan gunung api: daftar periksa PAKET-FITUR (113 komponen)

Audit akhir paritas **19 Okt 2026 malam** (registry `status: "aktif"`). Setiap baris dibuka di kodenya atau diperiksa di data live
`https://centurisk97.terasurbannetwork.workers.dev` (hanya GET), bukan ditebak dari nama. Paritas diukur terhadap karhutla yang TAMPIL;
komponen yang disembunyikan di karhutla ditandai "(tersembunyi di karhutla)" dan tetap dihitung belum bila kodenya belum ada.

Status: **dibuat** (komponen ada dan lolos gerbangnya), **diadaptasi** (bentuk beda karena domain), **sebagian** (ada, ada yang kurang, kekurangannya ditulis),
**belum**, **tidak berlaku** (alasan satu kalimat). Pemetaan ke hitungan audit: ADA = dibuat + diadaptasi.

## Hitungan

**ADA 67 / SEBAGIAN 26 / BELUM 13 / TIDAK BERLAKU 7** (jumlah 113).
Rincian: dibuat 52, diadaptasi 15, sebagian 26, belum 13, tidak berlaku 7.

| Kelompok | Baris | ADA | Sebagian | Belum | TB |
| --- | --- | --- | --- | --- | --- |
| A data dan pipeline | 40 | 19 | 8 | 8 | 5 |
| B model dan uji balik | 10 | 4 | 4 | 2 | 0 |
| C layar publik | 39 | 27 | 7 | 3 | 2 |
| D worker dan D1 | 10 | 7 | 3 | 0 | 0 |
| E gerbang dan uji | 10 | 8 | 2 | 0 | 0 |
| F armada dan dokumen | 4 | 2 | 2 | 0 | 0 |

## Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id`, awalan | `gunungapi`, `V` (V0001..V0027 live) |
| `rute` / `data` | `/gunungapi/` / `/gunungapi/data/` (turunan harian di `/banjir/data/`; laporan harian `/gunungapi/laporan.html`) |
| `tab` | peta, insight, berita, tren, kejadian, dampak, simulasi, foto, tentang, metode (tersembunyi) |
| Tingkat registry | Level I-IV resmi PVMBG, tanpa tingkat buatan |
| Cron Worker | `* * * * *`: MAGMA tiap 30 menit (menit%30==7), satu permintaan |
| Workflow | `lintas.yml` harian (`magma.py` -> `abu.py` -> `laporan.py`, `peluang_abu.py`, `dampak.py`, `berita.py`, `kejadian.py`); `paparan.py` dan `citra.py` tanpa workflow |
| Pengerja | `gunungapi-kering` (registry masih menulis `gunungapi`) |

## Tabel

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | diadaptasi | MAGMA Indonesia (PVMBG): tingkat-aktivitas, laporan harian, informasi-letusan (`scripts/gunungapi/magma.py`), cache `data/raw/gunungapi`. Tanpa cadangan (GVP 403 dari luar peramban, GDACS terlalu sedikit; `magma.py:1-15`). Contoh tersimpan di `scripts/gunungapi/contoh/`; `magma.py uji` hijau. |
| A02 | Varian keluaran bertingkat | tidak berlaku | Status adalah satu potret terkini (daftar letusan 30 terakhir sudah di `gunungapi_status.json`); tidak ada potongan 24/72/semua. |
| A03 | Pengamatan hampir-waktu-nyata | dibuat | Cron menit%30==7 (`src/worker.js:617`) -> D1 `gunungapi_level`/`gunungapi_ubah` -> `/api/gunungapi/terbaru` cache 60 dtk (`src/gunungapi.js:38,91`). Live 19 Okt 20.0 WIB: umur 18 menit, basi false. Baru berjalan sejak 19 Okt: kolom `diubah` semua = waktu pertama terlihat. |
| A04 | Entitas kejadian aktif | dibuat | Satu kejadian V per gunung Level II ke atas (`scripts/umum/kejadian.py:267` adaptor_gunungapi, masa aktif 3 hari, kode stabil tidak dipakai ulang); live `kejadian_gunungapi_awal.json` 27 kejadian V0001..V0027. |
| A05 | Atribut kejadian | diadaptasi | Nama, tempat, provinsi/kabupaten, level, mulai/terakhir, pusat di JSON kejadian; laci menambah radius, jiwa dalam radius, rekomendasi, erupsi terbaru (`public/gunungapi/peta.js:214-232`). |
| A06 | Geometri dampak | dibuat | `kejadian_gunungapi_geo.json` dan `paparan_geo.json` (poligon KRB, rute evakuasi); cincin radius rekomendasi di peta. |
| A07 | Pemecahan muatan | dibuat | `kejadian_gunungapi_{awal,geo,nomor}.json` (live 200) dan `paparan.json` + `paparan_geo.json` dimuat malas; plafon `/gunungapi/` 760 KB (terukur 656). |
| A08 | Cuaca pendukung | dibuat | Angin ECMWF IFS lapisan tekanan 850..200 hPa dari Open-Meteo (`abu.py`), cache `data/raw/gunungapi`, kuota dicatat di `lintas.yml:85-96`. |
| A09 | Indeks bahaya harian | diadaptasi | Model abu Lagrangian + sebaran Suzuki (`abu.py`, kembar `abu_model.js`) dan lahar LAHARZ/awan panas H/L (`sim_lahar.js`); level resmi PVMBG tetap status. `abu.py uji` dan `uji_abu.py` hijau. |
| A10 | Prakiraan ansambel | dibuat | `abu_peluang.json`: 18 anggota deterministik + 51 anggota ensemble IFS untuk Level >= II, 3 ambang abu, 701 wilayah (`peluang_abu.py`, `lintas.yml:96`). |
| A11 | Kondisi latar | tidak berlaku | Tidak ada kondisi latar terukur yang menentukan letusan. |
| A12 | Indeks khusus tambahan | tidak berlaku | Tidak ada indeks riset tambahan yang lolos uji balik. |
| A13 | Aturan status 4 tingkat | diadaptasi | Level resmi PVMBG I-IV apa adanya (registry tingkat 0-3, `app.js` LEVEL); tidak ada tingkat buatan Pantau Bencana (`insight.js:4`). Perubahan level dicatat di D1 `gunungapi_ubah`. |
| A14 | Prioritas | diadaptasi | Level >= III disorot di pop-up ('Gunung Siaga dan Awas', `sapa.js`) dan tabel V; registry `prioritas` kosong, tanpa ambang uji balik. |
| A15 | Risiko riwayat 0–100 | belum | Indeks risiko riwayat letusan 0-100 belum ada; riwayat GVP tak terjangkau skrip. Hanya hitungan tahunan BNPB di Tren/Dampak. |
| A16 | Kalender musim | tidak berlaku | Letusan tidak bermusim. |
| A17 | Iklim | tidak berlaku | Letusan tidak bergantung ENSO/IOD. |
| A18 | Riwayat grid dan sejarah | sebagian | `gunungapi_status.json`: riwayat level 4 hari + 30 letusan terakhir; arsip VONA 2023- untuk uji; BNPB tahunan 2010-2024. Katalog historis letusan sejak 1900 belum. |
| A19 | Statistik per provinsi | dibuat | `laporan_gunungapi.json` 10 hari, 16 provinsi (`laporan.py`); kartu per provinsi di Insight/Berita. |
| A20 | Data lembaga | dibuat | MAGMA/PVMBG (level, rekomendasi, VONA), BNPB tahunan (`dampak_gunungapi.json`), InaRISK bahaya gunung api sebagai proksi zona. |
| A21 | Posko | belum | Posko pengungsian belum. (tersembunyi di karhutla) |
| A22 | Operasi | belum | Kebutuhan masker/air/tenda belum. (tersembunyi di karhutla) |
| A23 | Aset udara | belum | Pangkalan heli evakuasi belum. (tersembunyi di karhutla) |
| A24 | Keputusan ekonomi | belum | Keputusan ekonomi belum. (tersembunyi di karhutla) |
| A25 | Preventif | sebagian | Evakuasi desa KRB III/II ke titik aman via jalan OSM (Dijkstra, waktu median/maks; `paparan.py`, laci `peta.js:266`). Rencana pencegahan/latihan belum. |
| A26 | Penanggung jawab lahan | diadaptasi | Izin tambang WIUP badan usaha di dalam zona (`paparan.json` tambang, lapisan Tambang); hanya badan usaha, tanpa nama pribadi. |
| A27 | Dampak | sebagian | `dampak.py`: jiwa terpapar per level + tahunan BNPB 2010-2024 (kejadian, meninggal, terdampak, mengungsi, rumah rusak) + paparan. Tanpa rupiah (sengaja), lahan pertanian, emisi; sekolah/faskes hanya 30 gunung. |
| A28 | Paparan penduduk | dibuat | WorldPop 1 km: cincin 3/5/10/15 km, per zona KRB dan desa (`paparan.py`); `penduduk_radius` terisi 24 dari 69 gunung. |
| A29 | Sekolah dan fasilitas | dibuat | Desa, sekolah, faskes, titik kumpul OSM dalam 20 km (`paparan.py`): 30 gunung, termasuk semua 27 Level >= II. Gunung baru naik level tidak otomatis masuk (tidak ada workflow, lihat A38). |
| A30 | Muatan Dashboard | belum | Tidak ada `ringkasan.json`. (tersembunyi di karhutla) |
| A31 | Cuaca per jam untuk simulasi | diadaptasi | Angin lapisan atas 72 jam dimuat untuk Simulasi (`sim.js:31-41`) dan `abu_gunungapi.json`. |
| A32 | Citra satelit | sebagian | `citra.py` Sentinel-2 sebelum/sesudah untuk 5 peristiwa (Lewotobi, Marapi, Merapi, Ruang, Semeru) tampil di laci (`peta.js:274`); tidak ada workflow yang menjalankan `citra.py`. |
| A33 | Berita | sebagian | `berita_gunungapi.json` 1500 artikel/120 hari, topik, cerita (`scripts/gunungapi/berita.py`, `lintas.yml:117`). `sentimen_teruji` false, judul EN tidak diterjemahkan. |
| A34 | Video | belum | Tidak ada video gunung api (`berita.js:6` dibuang). |
| A35 | Data sektor | diadaptasi | Bandara di jalur abu skenario 72 jam (`abu_gunungapi.json` bandara_terdampak, peluang per bandara, lapisan Bandara, kartu Insight). METAR/penerbangan waktu nyata belum. |
| A36 | Kurasi tangan | belum | Tidak ada kurasi tangan setara `factsheet_gunungapi.json`. |
| A37 | Meta | diadaptasi | `gunungapi_status.json` (sumber, dibuat, jumlah_level) + `/api/gunungapi/terbaru` (dibuat, umur_menit, basi); tanpa `meta.json` terpisah. |
| A38 | Data statis bulanan | sebagian | `paparan.json`, `paparan_geo.json`, `gunung.json`, `citra/` ada di `public/gunungapi/data` tetapi `paparan.py` dan `citra.py` tidak ada di workflow mana pun (`lintas.yml:85-86` menyebut statis.yml, `statis.yml` tidak memuatnya). |
| A39 | Seri jangka pendek bergulir | sebagian | Riwayat level + erupsi 4 hari (`gunungapi_status.json` riwayat), `laporan_gunungapi.json` 10 hari per provinsi; belum 100 hari atau per kabupaten. |
| A40 | Data respons dan kontak | sebagian | Kontak resmi hanya dari teks rekomendasi (`magma.py:93` urai_kontak): 2 dari 27 gunung Level >= II pada data lokal, 0 pada data live 19 Okt (belum terbit); tidak ada daftar pos terstruktur. |
| B01 | Model prakiraan | diadaptasi | Model abu Lagrangian 5000 partikel + lahar LAHARZ; skenario 'jika meletus sekarang', bukan prakiraan letusan; stdlib. |
| B02 | Uji balik aturan status | sebagian | `uji_abu.py`: arah abu vs VONA. Berambang: 4 kejadian, 25% dalam 45 derajat, p = 0,68 (tak lebih baik dari acak); sebaran mentah: 29 kejadian, 72%, p ~ 1e-7. Hubungan level-letusan belum diuji. |
| B03 | Prospektif | belum | Tidak ada catatan prospektif append-only untuk arah abu/VONA. |
| B04 | Kasus historis | sebagian | Citra sebelum/sesudah 5 peristiwa pilihan + BNPB tahunan 2010-2024; galeri kejadian besar belum. |
| B05 | Galat dan pendorong | diadaptasi | Kartu Insight 'kinerja' (`insight.js:104`), `contoh/uji_balik_detail.json`, bab Metode memuat uji balik. |
| B06 | Tren jangka panjang | belum | Tidak ada uji tren jangka panjang. |
| B07 | Kesetaraan Python↔JS | sebagian | `uji_setara.mjs` (selisih maks 1e-14 derajat) dan `uji_lahar.mjs` (15 uji) hijau lokal 19 Okt, tetapi tidak dijalankan workflow atau `tests/`. |
| B08 | Selang ketidakpastian | dibuat | Ansambel 18/51 anggota, bobot sama, 3 ambang (`peluang_abu.py`); jangkauan abu dan peluang per bandara. |
| B09 | Kinerja tercatat | dibuat | `uji_balik` dan `uji_balik_tipis` tampil apa adanya (n kecil, p) di Metode dan Insight (`metode.js:11-32`). |
| B10 | Dokumen riset | sebagian | Sitasi dan alasan di docstring skrip dan bab Metode; berkas `RISET-*.md` terpisah belum ada. |
| C01 | Kepala + menu bencana | dibuat | Kepala + menu bencana dari registry (`inti/kepala.js`). |
| C02 | Tab dan URL bersih | dibuat | Tab (`app.js:49,52`) dan `/gunungapi/k/V0001` (`peta.js:236`); live 200 untuk `/gunungapi/`, `/gunungapi/simulasi`, `/gunungapi/k/V0001`. |
| C03 | Tema terang/gelap | dibuat | `#tema` + `pb-tema`. |
| C04 | Waktu data | dibuat | `#upd` dari `gunungapi_status.json` dibuat. |
| C05 | Panel kiri | diadaptasi | Seg Level, cari gunung/provinsi, daftar urut (`index.html:80-86`); tanpa crumb atau mode Real Time/Riwayat. |
| C06 | Rentang waktu | tidak berlaku | Status gunung adalah potret terkini; satu-satunya jendela waktu (jam ke-24/48/72 skenario) ada di C07. |
| C07 | Garis waktu prakiraan | diadaptasi | Seg jam ke-24/48/72 untuk jejak abu skenario di legenda (`peta.js:193-196`). |
| C08 | Panel lapisan | dibuat | Overlay 3 grup, 10 ubin (gunung, radius, nama, abu, bandara, KRB, rute, sekolah, tambang, satelit), muat malas (`peta.js:5-11`) + lapisan konteks (`peta.js:38`). |
| C09 | Choropleth wilayah + kartu hover | tidak berlaku | Gunung adalah titik; zona rawan berupa poligon KRB, bukan area administratif. |
| C10 | Gelembung cluster | diadaptasi | Segitiga berwarna level PVMBG dan nama gunung; 69 titik tetap, tanpa klaster. |
| C11 | Popup titik | dibuat | Kartu hover + dialog klik dengan level, radius, rekomendasi. |
| C12 | Laci kejadian | diadaptasi | Dialog modal gunung (`peta.js:214-232`): level, radius, rekomendasi PVMBG, kontak, erupsi terbaru, skenario abu 72 jam, paparan KRB, evakuasi, citra, Simulasi, bagikan, kode V. Bukan laci samping. |
| C13 | Legenda | dibuat | `renderLegenda` (`peta.js:189-203`): level, radius, abu, bandara, KRB, paparan. |
| C14 | Insight | dibuat | 9 kartu (`insight.js:11`): status, letusan, perubahan, bandara, peluang, KRB, tambang, kinerja, daftar. |
| C15 | Tabel kejadian | dibuat | Tab Kejadian: tabel V, kepala gelap, urut, paginasi (`kejadian.js`). |
| C16 | Cerita | belum | Tidak ada `cerita_gunungapi.js`. |
| C17 | Berita | sebagian | Volume harian, peta berita, Sorotan, Topik, Daftar (`berita.js:28`). Dibuang: nada/sentimen (belum teruji), celah liputan, pantauan media, video, internasional; judul EN belum. |
| C18 | Tren | dibuat | `tren.js`: riwayat level dan erupsi per hari (butuh >= 2 hari data), BNPB tahunan; tanpa kalender musim. |
| C19 | Posko, Sarana, Operasi, Keputusan | belum | Posko, Sarana, Operasi, Keputusan belum. (tersembunyi di karhutla) |
| C20 | Dampak | sebagian | `dampak.js` 6 bagian: penduduk, riwayat BNPB, KRB, sekolah/faskes, evakuasi, bandara. Paparan baru 30 dari 69 gunung; tanpa rupiah dan lahan pertanian. |
| C21 | Dashboard pimpinan | belum | Tidak ada `ringkasan.js`; `/gunungapi/laporan.html` (kontrak v1) sebagian padanannya. (tersembunyi di karhutla) |
| C22 | Metode | dibuat | `metode.js`: arti level PVMBG, sumber, model abu, uji balik, lahar, paparan, batasan; tab disembunyikan tetapi dapat dibuka. |
| C23 | Simulasi | dibuat | `sim.js` (438), `sim_lahar.js`, `sim_kerja.js` (Web Worker), halaman mandiri `simulasi.html`: abu 3D + angin 72 jam, lahar/awan panas, perlakuan radius evakuasi. |
| C24 | Lapor Warga | sebagian | Backend: jenis abu, lahar, gemuruh (`informasi_jenis.js:80-85`) dan migrasi 0020 (produksi belum terverifikasi); tab Informasi tidak ada di layar gunung api. (tersembunyi di karhutla) |
| C25 | Foto lapangan | sebagian | Tab Foto (galeri, kirim GPS via `../foto.js`, 4 kategori) dan 14 foto dummy berlisensi (`img/dummy/gunungapi/kredit.json`); live 0 foto (dummy belum diisi); lapis Foto di Overlay belum. |
| C26 | Pop-up situasi hari ini | dibuat | Pop-up 'Situasi gunung api hari ini' (`sapa.js`, `pb_sapa_gunungapi`): gunung Siaga/Awas, erupsi 24 jam, bandara di jalur abu. |
| C27 | Bagikan | dibuat | Adaptor `bagikan.js`: satu gunung dari dialog (`peta.js:229`) dan ringkasan; mesin bersama. |
| C28 | OG per rute | sebagian | `/gunungapi/` ber-og khas (`gunungapi.png`, live 200) tetapi `/gunungapi/k/V0001` memakai `ringkasan.png` (gambar karhutla); per gunung/provinsi belum. |
| C29 | i18n EN | sebagian | `en.json` memuat kosakata gunung api (komit `0f2ecb1`). Judul dialog/Insight seperti 'Skenario abu 72 jam', 'Kontak resmi', 'Paparan per zona KRB', 'Citra satelit sebelum dan sesudah', 'Jejak abu skenario' tidak ada di `en.json`; `laporan.json` i18n bertanggal 15 Okt. |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | `persetujuan.js`, `jejak.js data-halaman="gunungapi"`, `pesan.js`, `kaki.js` (`index.html:152-155`). |
| C31 | Muat / kosong / galat / luring | dibuat | `#muat` 'Memuat status gunung api…', pesan kosong per tab ('Belum ada tren.', 'Data kejadian gunung api belum tersedia.'). |
| C32 | Mobile 375 px | sebagian | Belum ada audit 375/390 px ulang sejak 16 Okt; tab Kejadian dan dialog baru tak diukur, tidak ada uji otomatis. |
| C33 | Klik tidak membekukan | dibuat | `nanti()` (`angka.js:3`), simulasi di Web Worker (`sim_kerja.js`), lapisan paparan dimuat malas; INP gunung api belum diukur ulang sejak 16 Okt. |
| C34 | Halaman Tentang dan kartu bencana | dibuat | `tentang.html` kartu Letusan Gunung Api aktif (`bencana-gunungapi.jpg`). |
| C35 | Statistik publik | dibuat | `/statistik` dengan pemilah dari registry (`public/admin/statistik.js:237`). |
| C36 | Admin moderasi | dibuat | Admin foto/statistik/pesan lintas bencana (`public/admin/foto.js:56-77`). |
| C37 | Bagikan lanjutan | dibuat | `bagi.js` (QR, WhatsApp, UTM) bersama lewat `bagikan.js:53`. |
| C38 | Lapisan tambahan | dibuat | `konteks.js` dipasang `peta.js:38` (penduduk, jalan; sekolah/fasilitas dilewati karena sudah ada lapisan paparan) + KRB, rute, sekolah, tambang dari `paparan.json`. |
| C39 | Kaki dan Tentang | dibuat | `kaki.js` + `tentang.html` bersama. |
| D01 | Rute HTML | dibuat | `ruteBencana()` (`src/worker.js:474`); live 200 untuk `/gunungapi/`, `/gunungapi/simulasi`, `/gunungapi/k/V0001`. |
| D02 | Route data cepat | dibuat | `/api/gunungapi/terbaru` cache tepi 60 dtk (`src/gunungapi.js:91`), di `cakupan.json`. |
| D03 | Cron | dibuat | `perbaruiGunungapi` dari cron tiap menit, menit%30==7, satu permintaan MAGMA per putaran, galat = data lama utuh (`src/gunungapi.js:38`, `tests/warga/gunungapi_arsip.test.mjs`). |
| D04 | Status kesegaran | dibuat | Registry `sumber_status` gunungapi 30 jam (live umur 2,4 jam) + berita. Catatan: yang diawasi berkas CI `gunungapi_status.json`, bukan `umur_menit` D1, jadi cron MAGMA mati tidak menandai `/api/status` basi. |
| D05 | Lapor warga | sebagian | Jenis abu/lahar/gemuruh di katalog dan skema (migrasi 0020, `skema.test.mjs` hijau); layar gunung api tidak memakainya dan 0020 produksi belum terverifikasi. |
| D06 | Foto | dibuat | `foto.bencana` + 4 kategori registry; live `/api/foto?bencana=gunungapi` 200. |
| D07 | Statistik | dibuat | `stat_hari.hal` dari registry, `data-halaman="gunungapi"`. |
| D08 | OG meta | sebagian | Lihat C28: kejadian V memakai gambar karhutla; deskripsi OG memakai data hari ini (19 Okt: 3 siaga, 24 waspada) dan benar. |
| D09 | Dummy | sebagian | 14 foto dummy (`JUMLAH_DUMMY`, `src/foto.js:113`) dan tombol dummy foto di `/admin/foto`; `gunungapi_level`/`gunungapi_ubah` dibaca layar tanpa tombol dummy. |
| D10 | Privasi | dibuat | Bersama: hash IP bergaram harian, DNT/GPC. |
| E01 | Self-check per skrip | sebagian | `magma.py`, `peluang_abu.py` (`lintas.yml:90,96`) dan `berita`/`dampak` (`:117`) menjalankan `uji`; `abu.py`, `laporan.py`, `paparan.py`, `citra.py`, `uji_abu.py` punya `uji` (hijau lokal 19 Okt) tetapi tidak dijalankan workflow. |
| E02 | Cakupan route/tabel | dibuat | `cakupan.json`: tabel gunungapi_level/ubah, GET `/api/gunungapi/terbaru`, cron gunungapi. |
| E03 | Skema D1 | dibuat | `skema.test.mjs` + `gunungapi_arsip.test.mjs` hijau 19 Okt. |
| E04 | Registry | dibuat | `gerbang-bencana.test.mjs` hijau (`uji:agen` 57/57). |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau. |
| E06 | Kesegaran data | dibuat | Sumber `gunungapi` dan `berita_gunungapi` di `/api/status`. Catatan CI sama dengan gempa (`lintas.yml:189` mengarah ke worker yatim). |
| E07 | Beban | dibuat | `ukur_muat.mjs` plafon `/gunungapi/` 760 KB (terukur 656), `beban.mjs` bobot 3. |
| E08 | i18n | sebagian | `kumpul.mjs` meng-crawl `/gunungapi/`; hasil 19 Okt hanya di pesan komit; `laporan.json` i18n 15 Okt. |
| E09 | Kepemilikan berkas | dibuat | Agen `gunungapi-kering` memiliki `scripts/gunungapi/**` dan `public/gunungapi/**`; registry `pengerja` masih tertulis `gunungapi` (nama lama). |
| E10 | Model agent | dibuat | `.claude/agents/gunungapi-kering.md` `model: sonnet`. |
| F01 | Pengerja agent | dibuat | Agen `gunungapi-kering` (berbagi dengan kekeringan); ilmu 25,7 KB, di bawah plafon 40 KB. |
| F02 | Dokumen spesifikasi | dibuat | Berkas ini; 113 baris terisi. |
| F03 | Dokumen riset | sebagian | Lihat B10. |
| F04 | Kredit dan lisensi | sebagian | Kredit foto dummy ada; laci memuat atribusi (ODbL, WorldPop, KRB PVMBG 2018). Halaman Tentang (Sumber data) tidak menyebut MAGMA/PVMBG/ESDM; tidak ada `public/gunungapi/kredit.json`. |

## Catatan

- Dasar bukti 19 Okt: `npm run uji:agen` 57/57, enam berkas `tests/warga` terkait 79 tes hijau, `uji` hijau untuk abu, berita, citra, dampak, laporan, magma, paparan, peluang_abu, uji_abu, plus `uji_setara.mjs` dan `uji_lahar.mjs` (dua terakhir di luar CI).
- Live: `/api/gunungapi/terbaru` 69 gunung (umur 18 menit, basi false), `kejadian_gunungapi_awal.json` 27 kejadian, `/api/status` tanpa sumber basi.
- Data lokal repo tertinggal dari live; angka berlabel "live" diambil dari worker.
- Komponen tersembunyi di karhutla tidak menghalangi status aktif; belum di sini artinya kodenya memang belum ada.
