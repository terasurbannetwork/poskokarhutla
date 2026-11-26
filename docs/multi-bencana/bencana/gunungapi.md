# Letusan gunung api: daftar periksa PAKET-FITUR (113 komponen)

Audit paritas **15 Nov 2026, HEAD f3ab401e2** (audit sebelumnya: 19 Okt 2026 malam). Setiap baris dibuka ulang di kode, workflow, dan data checkout hari ini;
audit ini tanpa jaringan, jadi angka "live" 19 Okt tidak diperiksa ulang dan tidak dijadikan bukti. Paritas diukur terhadap karhutla yang TAMPIL;
komponen yang disembunyikan di karhutla ditandai "(tersembunyi di karhutla)". Berkas yang ada tetapi tanpa workflow, tanpa uji, atau tanpa kartu di layar dihitung sebagian.

Status: **dibuat**, **diadaptasi** (bentuk beda karena domain), **sebagian**, **belum**, **tidak berlaku** (alasan satu kalimat). ADA = dibuat + diadaptasi.

## Hitungan

**15 Nov: ADA 78 / SEBAGIAN 21 / BELUM 8 / TIDAK BERLAKU 6** (jumlah 113; dibuat 61, diadaptasi 17).
**19 Okt: ADA 67 / SEBAGIAN 26 / BELUM 13 / TIDAK BERLAKU 7** (dibuat 52, diadaptasi 15).
Komponen baru G01-G11 (di luar 113): ADA 0 / SEBAGIAN 5 / BELUM 4 / TIDAK BERLAKU 2.

| Kelompok | ADA | Sebagian | Belum | TB |
| --- | --- | --- | --- | --- |
| A data dan pipeline | 24 | 7 | 6 | 3 |
| B model dan uji balik | 6 | 4 | 0 | 0 |
| C layar publik | 30 | 5 | 2 | 2 |
| D worker dan D1 | 8 | 1 | 0 | 1 |
| E gerbang dan uji | 8 | 2 | 0 | 0 |
| F armada dan dokumen | 2 | 2 | 0 | 0 |

## Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id`, awalan | `gunungapi`, `V` (V0001..V0027 live) |
| `rute` / `data` | `/gunungapi/` / `/gunungapi/data/` (turunan harian di `/banjir/data/`; laporan harian `/gunungapi/laporan.html`) |
| `tab` | peta, insight, berita, tren, kejadian, dampak, simulasi, foto, tentang, metode (tersembunyi) |
| Tingkat registry | Level I-IV resmi PVMBG, tanpa tingkat buatan |
| Cron Worker | `* * * * *`: MAGMA tiap 30 menit (menit%30==7), satu permintaan |
| Workflow | `lintas.yml` harian (`magma.py` -> `abu.py` -> `prospektif.py` -> `laporan.py`, `peluang_abu.py`, `dampak.py`, `berita.py`, `mirova.py`, `kejadian.py`, `paparan.py`, `citra.py`), `titik.yml:282` `magma.py cepat`, `statis.yml:109-110` `paparan.py` dan `citra.py`; tanpa workflow: `risiko.py`, `riwayat_level.py`, `arsip_magma.py`, `factsheet.py`, `pop_grid.py`, `panen_*` |
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
| A11 | Kondisi latar | diadaptasi | `kegempaan.json` (jenis gempa vulkanik per gunung, dari `magma.py`, diterbitkan lewat `lintas.yml:170`) dan `rezim_letusan.json` (21.183 VONA sejak 2018-05, `arsip_magma.py`) dipakai Insight/Metode (`insight.js:301`). Bukan pemicu letusan terukur; hanya latar. `rezim_letusan.json` dibuat tangan, `arsip_magma.py` tanpa workflow. |
| A12 | Indeks khusus tambahan | diadaptasi | MIROVA daya radiatif termal (`mirova.py`, `lintas.yml:245`, `mirova.json` 14 Nov) dimuat `app.js`/`peta.js`; lisensi nonkomersial, atribusi di berkas. Tanpa uji balik. |
| A13 | Aturan status 4 tingkat | diadaptasi | Level resmi PVMBG I-IV apa adanya (registry tingkat 0-3, `app.js` LEVEL); tidak ada tingkat buatan Pantau Bencana (`insight.js:4`). Perubahan level dicatat di D1 `gunungapi_ubah`. |
| A14 | Prioritas | diadaptasi | Level >= III disorot di pop-up ('Gunung Siaga dan Awas', `sapa.js`) dan tabel V; registry `prioritas` kosong, tanpa ambang uji balik. |
| A15 | Risiko riwayat 0–100 | sebagian | `risiko.py` -> `risiko.json` (GVP 1900-2025, 1.309 letusan, bobot 50/30/20, kelas 4) tampil di `insight.js`, `tren.js`, `app.js`; `risiko.py uji` hijau 15 Nov. Tidak ada workflow yang menjalankannya (berkas dibuat 19 Okt) dan tidak diuji balik (riwayat, bukan prakiraan). |
| A16 | Kalender musim | tidak berlaku | Letusan tidak bermusim. |
| A17 | Iklim | tidak berlaku | Letusan tidak bergantung ENSO/IOD. |
| A18 | Riwayat grid dan sejarah | dibuat | Riwayat per gunung: `data/catatan/*.jsonl` (69 gunung, di-commit harian `lintas.yml:166`), `riwayat_level.json` (arsip Pusdalops), `rezim_letusan.json` 2018-2026, `risiko.json` 1900-2025, BNPB tahunan 2010-2024. Tiga terakhir dibuat tangan, tanpa workflow. |
| A19 | Statistik per provinsi | dibuat | `laporan_gunungapi.json` 10 hari, 16 provinsi (`laporan.py`); kartu per provinsi di Insight/Berita. |
| A20 | Data lembaga | dibuat | MAGMA/PVMBG (level, rekomendasi, VONA), BNPB tahunan (`dampak_gunungapi.json`), InaRISK bahaya gunung api sebagai proksi zona. |
| A21 | Posko | belum | Posko pengungsian belum. (tersembunyi di karhutla) |
| A22 | Operasi | sebagian | public/bencana.json; scripts/umum/renlap.py; public/inti/renlap.js. Renlap dan sarana per registri ada; koefisien kebutuhan regu belum bersumber |
| A23 | Aset udara | belum | Pangkalan heli evakuasi belum. (tersembunyi di karhutla) |
| A24 | Keputusan ekonomi | belum | Keputusan ekonomi belum. (tersembunyi di karhutla) |
| A25 | Preventif | sebagian | Evakuasi desa KRB III/II ke titik aman via jalan OSM (Dijkstra, waktu median/maks; `paparan.py`, laci `peta.js:266`). Rencana pencegahan/latihan belum. |
| A26 | Penanggung jawab lahan | diadaptasi | Izin tambang WIUP badan usaha di dalam zona (`paparan.json` tambang, lapisan Tambang); hanya badan usaha, tanpa nama pribadi. |
| A27 | Dampak | sebagian | `dampak.py`: jiwa terpapar per level + tahunan BNPB 2010-2024 (kejadian, meninggal, terdampak, mengungsi, rumah rusak) + paparan. Tanpa rupiah (sengaja), lahan pertanian, emisi; sekolah/faskes hanya 30 gunung. |
| A28 | Paparan penduduk | dibuat | WorldPop 1 km: cincin 3/5/10/15 km, per zona KRB dan desa (`paparan.py`); `penduduk_radius` terisi 24 dari 69 gunung. |
| A29 | Sekolah dan fasilitas | dibuat | `paparan.py` kini 69 gunung (53 dengan desa/sekolah), `paparan.json` 7 Nov 2026, dijalankan `lintas.yml:205` dan `statis.yml:109` (bukan lagi 30 gunung). Cacat: grid `pop/*.json` (`pop_grid.py`, tanpa workflow) tetap 30 berkas, lihat Catatan. |
| A30 | Muatan Dashboard | belum | Tidak ada `ringkasan.json`. (tersembunyi di karhutla) |
| A31 | Cuaca per jam untuk simulasi | diadaptasi | Angin lapisan atas 72 jam dimuat untuk Simulasi (`sim.js:31-41`) dan `abu_gunungapi.json`. |
| A32 | Citra satelit | sebagian | `citra.py` Sentinel-2 sebelum/sesudah untuk 5 peristiwa (12 PNG) tampil di laci (`peta.js:274`); kini dijadwalkan (`lintas.yml:207`, `statis.yml:110`) tetapi isinya peristiwa tetap, tanpa citra gunung yang sedang naik level. |
| A33 | Berita | sebagian | `berita_gunungapi.json` 1500 artikel/120 hari, topik, cerita (`scripts/gunungapi/berita.py`, `lintas.yml:117`). `sentimen_teruji` false, judul EN tidak diterjemahkan. |
| A34 | Video | belum | Tidak ada video gunung api (`berita.js:6` dibuang). |
| A35 | Data sektor | diadaptasi | Bandara di jalur abu skenario 72 jam (`abu_gunungapi.json` bandara_terdampak, peluang per bandara, lapisan Bandara, kartu Insight). METAR/penerbangan waktu nyata belum. |
| A36 | Kurasi tangan | dibuat | `factsheet.py` -> `factsheet_gunungapi.json` (NOAA NCEI, GVP, BNPB; tiap angka berURL sumber, 19 Okt), dipakai `app.js`/`insight.js`/`tren.js`; `factsheet.py uji` hijau. Kurasi tangan, tanpa workflow. |
| A37 | Meta | diadaptasi | `gunungapi_status.json` (sumber, dibuat, jumlah_level) + `/api/gunungapi/terbaru` (dibuat, umur_menit, basi); tanpa `meta.json` terpisah. |
| A38 | Data statis bulanan | dibuat | `paparan.py` dan `citra.py` kini dijalankan `statis.yml:109-110` dan `lintas.yml:205-207`; `paparan.json` terbit 5, 6, 7 Nov (komit bot "data: paparan gunung api"). |
| A39 | Seri jangka pendek bergulir | sebagian | Riwayat level + erupsi 4 hari (`gunungapi_status.json` riwayat), `laporan_gunungapi.json` 10 hari per provinsi; belum 100 hari atau per kabupaten. |
| A40 | Data respons dan kontak | sebagian | Kontak resmi hanya dari teks rekomendasi (`magma.py:93` urai_kontak): 2 dari 27 gunung Level >= II pada data lokal, 0 pada data live 19 Okt (belum terbit); tidak ada daftar pos terstruktur. |
| B01 | Model prakiraan | diadaptasi | Model abu Lagrangian 5000 partikel + lahar LAHARZ; skenario 'jika meletus sekarang', bukan prakiraan letusan; stdlib. (`public/gunungapi/abu_model.js`, `public/gunungapi/sim_lahar.js:1`) |
| B02 | Uji balik aturan status | sebagian | `uji_abu.py`: arah abu vs VONA. Berambang: 4 kejadian, 25% dalam 45 derajat, p = 0,68 (tak lebih baik dari acak); sebaran mentah: 29 kejadian, 72%, p ~ 1e-7. Hubungan level-letusan belum diuji. |
| B03 | Prospektif | sebagian | `prospektif.py` dirantai `magma.py:693-696`, `prospektif_abu.json` di-commit `lintas.yml:371` (507 dicatat, 481 dinilai, 7 Nov, append-only, ambang 45 derajat). Tidak ada kartu di layar gunung api yang membacanya (tanpa `prospektif_abu` di `public/gunungapi/*.js`) dan belum masuk /prediksi. |
| B04 | Kasus historis | sebagian | Citra sebelum/sesudah 5 peristiwa pilihan + BNPB tahunan 2010-2024; galeri kejadian besar belum. |
| B05 | Galat dan pendorong | diadaptasi | Kartu Insight 'kinerja' (`insight.js:104`), `contoh/uji_balik_detail.json`, bab Metode memuat uji balik. |
| B06 | Tren jangka panjang | dibuat | `tren.py` Mann-Kendall + Theil-Sen atas BNPB tahunan, dipanggil `dampak.py` (`lintas.yml:268-274`), kartu tren di `insight.js:91-105`; `tren.py uji` hijau 15 Nov. |
| B07 | Kesetaraan Python↔JS | dibuat | `uji_setara.mjs` dan `uji_lahar.mjs` dijalankan `lintas.yml:100-101` (boleh gagal); `tests/gunungapi/sim_tanggap.test.mjs` 14 dari 15 lolos (satu gagal, lihat Catatan). |
| B08 | Selang ketidakpastian | dibuat | Ansambel 18/51 anggota, bobot sama, 3 ambang (`peluang_abu.py`); jangkauan abu dan peluang per bandara. |
| B09 | Kinerja tercatat | dibuat | `uji_balik` dan `uji_balik_tipis` tampil apa adanya (n kecil, p) di Metode dan Insight (`metode.js:11-32`). |
| B10 | Dokumen riset | sebagian | Sitasi dan alasan di docstring skrip dan bab Metode; berkas `RISET-*.md` terpisah belum ada. |
| C01 | Kepala + menu bencana | dibuat | Kepala + menu bencana dari registry (`inti/kepala.js`). |
| C02 | Tab dan URL bersih | dibuat | Tab (`app.js:49,52`) dan `/gunungapi/k/V0001` (`peta.js:236`); live 200 untuk `/gunungapi/`, `/gunungapi/simulasi`, `/gunungapi/k/V0001`. |
| C03 | Tema terang/gelap | dibuat | `#tema` + `pb-tema`. (`public/gunungapi/app.js:97`) |
| C04 | Waktu data | dibuat | `#upd` dari `gunungapi_status.json` dibuat. |
| C05 | Panel kiri | diadaptasi | Seg Level, cari gunung/provinsi, daftar urut (`index.html:80-86`); tanpa crumb atau mode Real Time/Riwayat. |
| C06 | Rentang waktu | tidak berlaku | Status gunung adalah potret terkini; satu-satunya jendela waktu (jam ke-24/48/72 skenario) ada di C07. |
| C07 | Garis waktu prakiraan | diadaptasi | Seg jam ke-24/48/72 untuk jejak abu skenario di legenda (`peta.js:193-196`). |
| C08 | Panel lapisan | dibuat | Overlay 3 grup, 10 ubin (gunung, radius, nama, abu, bandara, KRB, rute, sekolah, tambang, satelit), muat malas (`peta.js:5-11`) + lapisan konteks (`peta.js:38`). |
| C09 | Choropleth wilayah + kartu hover | tidak berlaku | Gunung adalah titik; zona rawan berupa poligon KRB, bukan area administratif. |
| C10 | Gelembung cluster | diadaptasi | Segitiga berwarna level PVMBG dan nama gunung; 69 titik tetap, tanpa klaster. (`public/gunungapi/peta.js:2`) |
| C11 | Popup titik | dibuat | Kartu hover + dialog klik dengan level, radius, rekomendasi. (`public/gunungapi/peta.js:278`) |
| C12 | Laci kejadian | diadaptasi | Dialog modal gunung (`peta.js:214-232`): level, radius, rekomendasi PVMBG, kontak, erupsi terbaru, skenario abu 72 jam, paparan KRB, evakuasi, citra, Simulasi, bagikan, kode V. Bukan laci samping. |
| C13 | Legenda | dibuat | `renderLegenda` (`peta.js:189-203`): level, radius, abu, bandara, KRB, paparan. |
| C14 | Insight | dibuat | 9 kartu (`insight.js:11`): status, letusan, perubahan, bandara, peluang, KRB, tambang, kinerja, daftar. |
| C15 | Tabel kejadian | dibuat | Tab Kejadian: tabel V, kepala gelap, urut, paginasi (`kejadian.js`). |
| C16 | Cerita | dibuat | `Cerita.daftar("gunungapi", ...)` di `insight.js:311` (mesin bersama `inti/cerita.js`), data dari `Insight.dataCerita()`. |
| C17 | Berita | sebagian | Volume harian, peta berita, Sorotan, Topik, Daftar (`berita.js:28`). Dibuang: nada/sentimen (belum teruji), celah liputan, pantauan media, video, internasional; judul EN belum. |
| C18 | Tren | dibuat | `tren.js`: riwayat level dan erupsi per hari (butuh >= 2 hari data), BNPB tahunan; tanpa kalender musim. |
| C19 | Posko, Sarana, Operasi, Keputusan | sebagian | public/inti/renlap.js; public/inti/pb_titik.js. Seksi sarana dan renlap tampil di /operasi; sub-tab Keputusan belum |
| C20 | Dampak | dibuat | `dampak.js` 6 bagian (penduduk, riwayat BNPB, KRB, sekolah/faskes, evakuasi, bandara); paparan kini 69 gunung. Tanpa rupiah dan lahan pertanian (lihat A27). |
| C21 | Dashboard pimpinan | sebagian | public/inti/dasbor_pimpinan.js; public/bnpb/pimpinan.js; src/pb_ringkas.js; public/bencana.json (dasbor.ringkas). PB-30/31/47: GET /api/pb/ringkas dan /bnpb/pimpinan membaca ringkas per bencana; angka belum diuji dengan data produksi dan tidak dijumlah antarsumber |
| C22 | Metode | dibuat | `metode.js`: arti level PVMBG, sumber, model abu, uji balik, lahar, paparan, batasan; tab disembunyikan tetapi dapat dibuka. |
| C23 | Simulasi | dibuat | `sim.js` (438), `sim_lahar.js`, `sim_kerja.js` (Web Worker), halaman mandiri `simulasi.html`: abu 3D + angin 72 jam, lahar/awan panas, perlakuan radius evakuasi. |
| C24 | Lapor Warga | dibuat | `index.html:128,164` (`p-informasi`, `../informasi.js data-halaman="gunungapi"`), tab `informasi` ada di `app.js:56`; disembunyikan lewat `tab_sembunyi` seperti karhutla (`public/bencana.json`). Jenis abu, lahar, gemuruh di `informasi_jenis.js:80-85`. |
| C25 | Foto lapangan | sebagian | Tab Foto (galeri, kirim GPS via `../foto.js`, 4 kategori); foto dummy tidak lagi sah (11 Nov), `public/img/dummy/gunungapi/` masih ada; lapis Foto di Overlay belum. Jumlah foto live tidak diperiksa ulang. |
| C26 | Pop-up situasi hari ini | dibuat | Pop-up 'Situasi gunung api hari ini' (`sapa.js`, `pb_sapa_gunungapi`): gunung Siaga/Awas, erupsi 24 jam, bandara di jalur abu. |
| C27 | Bagikan | dibuat | Adaptor `bagikan.js`: satu gunung dari dialog (`peta.js:229`) dan ringkasan; mesin bersama. |
| C28 | OG per rute | sebagian | `/gunungapi/` ber-og khas (`gunungapi.png`, live 200) tetapi `/gunungapi/k/V0001` memakai `ringkasan.png` (gambar karhutla); per gunung/provinsi belum. |
| C29 | i18n EN | sebagian | `en.json` memuat kosakata gunung api (komit `0f2ecb1`). Judul dialog/Insight seperti 'Skenario abu 72 jam', 'Kontak resmi', 'Paparan per zona KRB', 'Citra satelit sebelum dan sesudah', 'Jejak abu skenario' tidak ada di `en.json`; `laporan.json` i18n bertanggal 15 Okt. |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | `persetujuan.js`, `jejak.js data-halaman="gunungapi"`, `pesan.js`, `kaki.js` (`index.html:152-155`). |
| C31 | Muat / kosong / galat / luring | dibuat | `#muat` 'Memuat status gunung api…', pesan kosong per tab ('Belum ada tren.', 'Data kejadian gunung api belum tersedia.'). (`public/gunungapi/index.html:85`, `public/gunungapi/tren.js:160`) |
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
| D05 | Lapor warga | dibuat | Jenis abu/lahar/gemuruh di katalog dan skema (migrasi 0020, `skema.test.mjs`); layar memakainya lewat tab informasi (C24). 0020 di produksi tidak diperiksa ulang 15 Nov (tanpa jaringan). |
| D06 | Foto | dibuat | `foto.bencana` + 4 kategori registry; live `/api/foto?bencana=gunungapi` 200. (`public/gunungapi/foto.js:1`) |
| D07 | Statistik | dibuat | `stat_hari.hal` dari registry, `data-halaman="gunungapi"`. (`migrations/0017_statistik_bencana.sql`, `src/statistik.js`) |
| D08 | OG meta | sebagian | Lihat C28: kejadian V memakai gambar karhutla; deskripsi OG memakai data hari ini (19 Okt: 3 siaga, 24 waspada) dan benar. |
| D09 | Dummy | tidak berlaku | Data dummy dipensiunkan pemilik 11 Nov 2026. `JUMLAH_DUMMY` masih ada di `src/foto.js` (milik warga-api, bukan wilayah ini), `public/img/dummy/gunungapi/` masih berisi foto. |
| D10 | Privasi | dibuat | Bersama: hash IP bergaram harian, DNT/GPC. (`src/statistik.js:3`) |
| E01 | Self-check per skrip | sebagian | `lintas.yml:100-104,162,205-207,224,245`: `uji_setara`, `uji_lahar`, `uji_abu`, `abu`, `laporan`, `magma`, `paparan`, `citra`, `peluang_abu`, `mirova`; `berita`/`dampak` lewat loop `:268-274`. Tanpa uji di workflow: `risiko`, `tren`, `factsheet`, `arsip_magma`, `riwayat_level`, `pop_grid`, `panen_*` (`prospektif.py` dirantai `magma.py`, tanpa `uji`). Lokal 15 Nov hijau: magma, risiko, tren, prospektif, factsheet. |
| E02 | Cakupan route/tabel | dibuat | `cakupan.json`: tabel gunungapi_level/ubah, GET `/api/gunungapi/terbaru`, cron gunungapi. |
| E03 | Skema D1 | dibuat | `skema.test.mjs` + `gunungapi_arsip.test.mjs` hijau 19 Okt. |
| E04 | Registry | dibuat | `gerbang-bencana.test.mjs` hijau (`uji:agen` 57/57). |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau. |
| E06 | Kesegaran data | dibuat | Sumber `gunungapi` dan `berita_gunungapi` di `/api/status`. Catatan CI sama dengan gempa (`lintas.yml:189` mengarah ke worker yatim). |
| E07 | Beban | dibuat | `ukur_muat.mjs` plafon `/gunungapi/` 760 KB (terukur 656), `beban.mjs` bobot 3. |
| E08 | i18n | sebagian | `kumpul.mjs` meng-crawl `/gunungapi/`; hasil 19 Okt hanya di pesan komit; `laporan.json` i18n 15 Okt. |
| E09 | Kepemilikan berkas | dibuat | Agen `gunungapi-kering` memiliki `scripts/gunungapi/**` dan `public/gunungapi/**`; registry `pengerja` masih tertulis `gunungapi` (nama lama). |
| E10 | Model agent | dibuat | `.claude/agents/gunungapi-kering.md` `model: sonnet`. |
| F01 | Pengerja agent | dibuat | Agen `gunungapi-kering` (berbagi dengan kekeringan); ilmu 25,7 KB, di bawah plafon 40 KB. (`scripts/agents/roster.json`, `.claude/agents/gunungapi-kering.md`) |
| F02 | Dokumen spesifikasi | dibuat | Berkas ini; 113 baris terisi. (`docs/multi-bencana/bencana/gunungapi.md`) |
| F03 | Dokumen riset | sebagian | Lihat B10. |
| F04 | Kredit dan lisensi | sebagian | Kredit foto dummy ada; laci memuat atribusi (ODbL, WorldPop, KRB PVMBG 2018). Halaman Tentang (Sumber data) tidak menyebut MAGMA/PVMBG/ESDM; tidak ada `public/gunungapi/kredit.json`. |

## Komponen baru (audit 15 Nov)

Fitur karhutla yang lahir sesudah 19 Okt. Status = apakah gunung api sudah tercakup (bukan karhutla).

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | sebagian | `scripts/umum/tugas.py` membuat tugas gunung api (Awas IV / Siaga III, rekomendasi teks resmi PVMBG) dan `lintas.yml:293` menjadwalkannya; `src/penugasan.js:44` memuat daftar periksa gunung api (APD, masker abu). Tanpa kabar regu atau level 3 khas gunung api; berkas `tugas_gunungapi.json` tidak ada di checkout (cache CI). |
| G02 | Operasi udara/darat | sebagian | public/bencana.json (operasi, renlap.sarana, bobot hipotesis); scripts/umum/renlap.py; public/inti/renlap.js; public/inti/pb_titik.js. PB-45: seksi operasi dan sarana tampil di /operasi lewat registri; belum ada pantauan udara khusus dan bobot masih hipotesis |
| G03 | Sarana lapangan terencana (SIPPA) | tidak berlaku | SIPPA mencakup pipa portabel karhutla dan banjir (`KEPUTUSAN-SIPPA.md`); letusan tidak memakai pipa air. |
| G04 | Laporan harian/penanganan otomatis (deck, bot WA) | sebagian | `data/laporan-bnpb/generator/harian.py` memuat ancaman dan kawasan gunung api (`ga_ancaman`/`ga_kawasan`); `scripts/umum/status_darurat.py:94` mengenali kata gunung api. `scripts/wa/**` tanpa penanganan khusus gunung api; `laporan_kejadian.py:13` menyebut gunung api belum memicu laporan. |
| G05 | Dalops: cek kabar luar, saringan, tindak lanjut | ada | src/dalops.js:35; scripts/data/dalops_kabar.py:23; public/bnpb/dalops_gunungapi.js. PB-46b: jenis gunung api di Dalops dengan level PVMBG apa adanya, tanpa ambang hari karangan; tindak lanjut generik |
| G06 | Prakiraan +1..+3 hari dinilai prospektif (/prediksi) | sebagian | Tidak ada kode gunung api di `public/prediksi/data/prediksi.json` (HJN, ASP, API, BNJ, LSR, ROB). Padanannya `prospektif_abu.json` (B03, arah abu vs VONA, 481 dinilai) berdiri sendiri. |
| G07 | Semai awan dan prakiraan asap | tidak berlaku | Semai awan dan asap karhutla (`scripts/operasi/semai*`, `lintas.py`) tidak berlaku untuk abu vulkanik; model abu sendiri di `abu.py`. |
| G08 | Masuk laporan berkala Kepala BNPB | belum | `scripts/berkala/` belum ada di checkout; `KEPUTUSAN-BERKALA.md:40` merencanakan potongan status gunung api harian (D10), kodenya belum dibangun. |
| G09 | Peringatan dini tersambung (EWS, Peringatan Dini, CAP) | sebagian | src/ews.js; public/ews_tindakan.js; migrations/0137_peringatan_x.sql; tests/warga/ews.test.mjs. PB-38a/46a/36c: penilai tiap jam lewat ASSETS ke peringatan_x; migrasi 0137_peringatan_x.sql belum diterapkan di produksi, jadi belum ADA (hanya kenaikan level resmi PVMBG; kamus tindakan per tingkat disalin dari pedoman_krb.json) |
| G10 | Renlap (rencana operasi harian) | sebagian | public/bencana.json (operasi, renlap.sarana, bobot hipotesis); scripts/umum/renlap.py; public/inti/renlap.js; public/inti/pb_titik.js. PB-45: sumber target, KML/GPX/teks WA lewat renlap umum; belum ada versi terbit di produksi atau PDF khusus jenis |
| G11 | Pembuat dokumen: laporan harian, sitrep, laporan kejadian, renkon, cetak A4 | sebagian | `/gunungapi/laporan.html` + `laporan.py` (laporan harian kontrak v1) dan `data/laporan-bnpb/generator/harian.py` (G04); `laporan_kejadian.py:13` belum memicu per KIB untuk gunung api; sitrep/renkon bersama tanpa jalur gunung api. |

## Catatan

- Dasar bukti 15 Nov: `node --test tests/gunungapi/sim_tanggap.test.mjs` 14 lolos, 1 gagal; `tests/kekeringan` 9 dari 9; `uji` hijau lokal untuk `magma`, `risiko`, `tren`, `prospektif`, `factsheet`. `npm run uji:agen` tidak dijalankan di audit ini.
- Temuan rusak: `tests/gunungapi/sim_tanggap.test.mjs:70` ("grid penduduk per gunung konsisten...") gagal ENOENT `public/gunungapi/data/pop/ambang.json`. `paparan.json` (7 Nov) berisi 69 gunung sedangkan `pop/` hanya 30 berkas; `pop_grid.py` tidak ada di workflow mana pun. Perlu menjalankan `pop_grid.py` untuk 39 gunung atau memasukkannya ke workflow.
- Temuan basi: baris 19 Okt yang menyebut `paparan.py`/`citra.py` tanpa workflow dan paparan "30 dari 69 gunung" sudah tidak benar (A29, A32, A38 diperbarui). Data lokal repo tertinggal dari produksi (mis. `gunungapi_status.json` 10 Nov, `abu_gunungapi.json` 2 Nov), jadi angka berdasarkan data lokal.
- Tidak berlaku diberi alasan; D09 dibalik karena dummy dipensiunkan 11 Nov.
- Komponen tersembunyi di karhutla tidak menghalangi status aktif; belum di sini artinya kodenya memang belum ada.
