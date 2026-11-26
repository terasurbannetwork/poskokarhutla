# Tanah longsor

Pengerja: `longsor`. Bukan entri registry sendiri: longsor tinggal sebagai tab `Longsor` di layar Banjir & Longsor (`/banjir/#longsor`, `public/banjir/longsor.js`), status per kecamatan memakai `scripts/banjir/status.py`. Modul `longsor` hanya mengurus data dan nowcast (`scripts/longsor/**` -> `public/longsor/data/`).

Audit 15 Nov 2026, HEAD f3ab401e2, kode dan data di checkout (data tayang dibuat CI). Tabel mengisi SETIAP komponen PAKET-FITUR (113 baris) plus G01-G11. Berkas tanpa awalan ada di `scripts/longsor/` atau `public/longsor/data/`; `banjir/` = `scripts/banjir/` atau `public/banjir/`. D09 tidak berlaku (data dummy dipensiunkan pemilik 11 Nov 2026).

**Hitungan: ADA 33 / SEBAGIAN 63 / BELUM 12 / TIDAK BERLAKU 5** (19 Okt 2026: belum diaudit). Komponen baru G01-G11: ADA 5 / SEBAGIAN 2 / BELUM 3 / TIDAK BERLAKU 1.

## Temuan utama

- Uji balik v2 (515 sel hujan, 453 kab, 2.227 positif): GAGAL. AUC model 0,7047, klimatologi 0,7773, selisih -0,104..-0,050 (`public/longsor/data/uji_balik.json`). Layar menyebut itu terang-terangan (`public/banjir/longsor.js:46`).
- `nowcast.json` (14 Nov): 68 tinggi, 57 sedang, `tanpa_nilai` 4.120 dari 7.270 kecamatan, karena P95 hujan baru ada untuk 515 dari 948 sel (kuota Open-Meteo harian).
- Judul kartu tab Longsor berupa kalimat temuan (`longsor.js:31,46,54`), bertentangan dengan AGENTS.md 3.5 (pembaruan 11 Nov). Milik banjir/layar-peta.
- Tidak ada layar, workflow, atau entri registry longsor sendiri; jadwalnya menumpang `lintas.yml:241-253`.
## Tabel 113 komponen

| Kode | Komponen | Status paket | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | sebagian | SEBAGIAN | scripts/longsor/kejadian.py; statis.yml:161,170; scripts/longsor/tanggapan_pvmbg.py | Label GLC (berhenti 2021), DIBI longsor 2015-kini, MAGMA tanggapan 1.096 kejadian; hujan dari banjir/hujan.json. Pengamatan longsor langsung tidak ada |
| A02 | Varian keluaran bertingkat | sebagian | SEBAGIAN | banjir/data/status.json (l per kec, 4 hari); public/longsor/data/nowcast.json | Tidak ada varian 24/72/semua; nowcast tunggal tinggi/sedang |
| A03 | Pengamatan hampir-waktu-nyata | sebagian | SEBAGIAN | lintas.yml:241-253 (nowcast longsor harian); src/ews.js:194-196 | Hampir-waktu-nyata hanya dari hujan 7 hari teramati; tanpa pengamatan longsor realtime |
| A04 | Entitas kejadian aktif | sebagian | SEBAGIAN | banjir/kejadian_aktif.py (kejadian B gabungan banjir+longsor) | Longsor tidak punya entitas kejadian dan awalan sendiri |
| A05 | Atribut kejadian | sebagian | SEBAGIAN | kejadian_aktif_awal.json (kejadian B) | Atribut banjir; tanpa lereng, zona PVMBG, atau kerentanan S per kejadian |
| A06 | Geometri dampak | sebagian | SEBAGIAN | kejadian_aktif_geo.json (poligon gabungan kecamatan) | Poligon kecamatan, bukan zona longsoran |
| A07 | Pemecahan muatan | diadaptasi | ADA | nowcast.json 3 KB; longsor.js:12 (kerentanan.json 538 KB dimuat malas) | Muatan awal ringan |
| A08 | Cuaca pendukung | sebagian | SEBAGIAN | banjir/hujan.json (a7); scripts/longsor/hujan_riwayat.py | P95 hujan baru 515 dari 948 sel (cache gitignored, kuota Open-Meteo); nowcast.json tanpa_nilai 4.120 dari 7.270 kec |
| A09 | Indeks bahaya harian | diadaptasi | ADA | scripts/longsor/rumus.py (bahaya, jumlah7, P95); banjir/status.py:88 | Indeks S x hujan 7 hari/P95 gaya LHASA; self-check lolos |
| A10 | Prakiraan ansambel | sebagian | SEBAGIAN | banjir/ansambel_hujan.py; scripts/prediksi/catat.py:16 (kolom LSR) | Peluang Siaga longsor dari ansambel hujan banjir; nowcast LHASA tanpa ansambel |
| A11 | Kondisi latar | sebagian | SEBAGIAN | banjir/status.py SM_JENUH 0,45, A7_BASAH 25 mm | Ambang mutlak, bukan persentil kelembapan tanah; SWI longsor belum tercakup (PRAREG-LHASA2.md) |
| A12 | Indeks khusus tambahan | diadaptasi | ADA | scripts/longsor/kerentanan (model.py kerentanan); kerentanan.json 538 KB; pvmbg.json; tanah.json | Lereng, zona PVMBG, sesar, tanah; tanah 95 persen HSG D nyaris tak membedakan. Gagal uji balik (B02) |
| A13 | Aturan status 4 tingkat | diadaptasi | ADA | banjir/status.py:88 level_longsor; status.py:297-306 (uji); nowcast bahaya tinggi/sedang | 4 tingkat di status.json; nowcast 3 kelas |
| A14 | Prioritas | belum | BELUM | registry banjir prioritas [] | Tidak ada skor prioritas longsor |
| A15 | Risiko riwayat 0–100 | sebagian | SEBAGIAN | banjir/riwayat.py; riwayat_grid_longsor.json; kerentanan.json S 0..1 | Risiko riwayat banjir+longsor ada; S statis bukan skor 0-100 kekerapan/besaran/tren |
| A16 | Kalender musim | diadaptasi | ADA | scripts/prediksi/kalender.py:9 (JENIS longsor); longsor.js:54 (kalender_risiko.json) | Kalender musim per bulan |
| A17 | Iklim | dibuat | ADA | umum/outlook12.py bersama | Dipakai bersama, tidak khusus longsor |
| A18 | Riwayat grid dan sejarah | dibuat | ADA | kejadian.json (DIBI+GLC+PVMBG); riwayat_grid_longsor.json; logbook_riwayat.json | GLC hanya 2017-2018 beririsan dengan hujan riwayat |
| A19 | Statistik per provinsi | sebagian | SEBAGIAN | public/data/logbook_riwayat.json; insight.js:273 (per provinsi) | Agregat per provinsi dari logbook; tanpa berkas wilayah longsor |
| A20 | Data lembaga | dibuat | ADA | pvmbg.json (sigi.pu.go.id); tanggapan_pvmbg.json (MAGMA); banjir/bahaya.json (InaRISK) | Sumber ESDM vsi/geoportal dilarang robots, tidak disentuh |
| A21 | Posko | sebagian | SEBAGIAN | banjir/posko.py; metode.js:405-423 | Posko banjir menghitung kejadian longsor kabupaten; tersembunyi, tanpa posko longsor khusus |
| A22 | Operasi | belum | BELUM | - | Tidak ada regu-hari, alat berat, atau jalur evakuasi longsor |
| A23 | Aset udara | tidak berlaku | TB | - | Longsor tidak memakai heli/OMC; alat berat dan SAR darat, bukan komponen udara |
| A24 | Keputusan ekonomi | belum | BELUM | public/banjir/keputusan.js:10,175 | Kerugian longsor sengaja tidak dihitung |
| A25 | Preventif | belum | BELUM | - | Tidak ada profil/rencana pencegahan longsor (mitigasi lereng, drainase) |
| A26 | Penanggung jawab lahan | tidak berlaku | TB | - | Lereng bukan milik satu pengelola; tidak ada penanggung jawab tunggal |
| A27 | Dampak | sebagian | SEBAGIAN | banjir/dampak.py; dampak.json (9 provinsi) | Dampak ditulis untuk banjir; longsor tanpa bagian dampak sendiri (dampak.js:0 sebutan longsor) |
| A28 | Paparan penduduk | sebagian | SEBAGIAN | banjir/dampak.py WorldPop | Penduduk per kecamatan ada; paparan khusus zona longsor belum |
| A29 | Sekolah dan fasilitas | sebagian | SEBAGIAN | dampak.json cakupan 9 provinsi | Sekolah/faskes di zona longsor di luar 9 provinsi belum |
| A30 | Muatan Dashboard | belum | BELUM | - | Tidak ada ringkasan.json longsor |
| A31 | Cuaca per jam untuk simulasi | tidak berlaku | TB | - | Nowcast harian (hujan 7 hari); profil jam tidak dipakai |
| A32 | Citra satelit | belum | BELUM | - | Tidak ada citra bekas longsoran |
| A33 | Berita | sebagian | SEBAGIAN | scripts/umum/berita.py; banjir/data/berita.json (kueri banjir, longsor, rob) | Berita bersama banjir; tanpa leksikon dan label uji khusus longsor |
| A34 | Video | belum | BELUM | public/banjir/berita.js | Video belum ada |
| A35 | Data sektor | belum | BELUM | - | Tidak ada data jalan/jembatan tertutup longsor |
| A36 | Kurasi tangan | sebagian | SEBAGIAN | scripts/longsor/ambang_kab_param.json; ambang_kab_hasil.json | Parameter ambang per kabupaten tertulis dengan sumber; belum dipakai layar |
| A37 | Meta | sebagian | SEBAGIAN | nowcast.json (dibuat, jendela_akhir); scripts/agents/kesegaran.py:28 (30 jam) | Tercakup gerbang kesegaran; bukan sumber_status registry (modul tak punya entri registry) |
| A38 | Data statis bulanan | sebagian | SEBAGIAN | statis.yml:161,170 (kejadian.json bulanan) | tanah, kerentanan, pvmbg, tanggapan dibuat lab sekali dan di-commit tangan, tanpa jadwal |
| A39 | Seri jangka pendek bergulir | sebagian | SEBAGIAN | nowcast.json riwayat (8 hari); banjir/seri_status.json | Seri pendek ada; tanpa harian30 longsor |
| A40 | Data respons dan kontak | sebagian | SEBAGIAN | banjir/unit_respons.py (388 unit) | Unit BPBD bersama banjir; tanpa pos PVMBG dan Basarnas per kab |
| B01 | Model prakiraan | sebagian | SEBAGIAN | scripts/longsor/model.py; PRAREG-LHASA2.md (draf) | Model ada tetapi GAGAL uji; layar tetap v1, jalur pemulihan belum jalan |
| B02 | Uji balik aturan status | diadaptasi | ADA | public/longsor/data/uji_balik.json (AUC, POD/FAR, bootstrap blok 36 blok); tests/longsor/longsor.test.mjs | Vonis GAGAL tertulis apa adanya: AUC model 0,7047 vs klimatologi 0,7773; POD kelas sedang+ 0,168, FAR 0,987 |
| B03 | Prospektif | sebagian | SEBAGIAN | banjir/prospektif.py (kolom l di prospektif.json) | Status banjir/longsor dinilai prospektif; nowcast LHASA tidak |
| B04 | Kasus historis | belum | BELUM | - | Tidak ada galeri kejadian longsor besar |
| B05 | Galat dan pendorong | sebagian | SEBAGIAN | uji_balik.json (hujan-saja, S, klim, pvmbg); AUDIT-MODEL-2026-11.md | Pembanding lengkap; pendorong dan galat per wilayah belum |
| B06 | Tren jangka panjang | belum | BELUM | - | Tanpa Theil-Sen/Mann-Kendall untuk longsor |
| B07 | Kesetaraan Python↔JS | tidak berlaku | TB | - | Rumus nowcast hanya di Python; tidak ada salinan JS (sim_longsor.js model lain, fisika lereng) |
| B08 | Selang ketidakpastian | sebagian | SEBAGIAN | uji_balik.json ci_bootstrap_blok | Selang pada AUC; tanpa selang pada nilai nowcast |
| B09 | Kinerja tercatat | dibuat | ADA | uji_balik.json; longsor.js:46 (menyebut belum lulus) | Vonis tampil di layar |
| B10 | Dokumen riset | dibuat | ADA | scripts/longsor/RISET-AMBANG-KAB.md; PRAREG-LHASA2.md; banjir/RISET-LOGBOOK-LONGSOR.md | Ada sebelum layar |
| C01 | Kepala + menu bencana | sebagian | SEBAGIAN | banjir/index.html:108; registry banjir | Longsor tak punya entri menu; tab dalam Banjir & Longsor |
| C02 | Tab dan URL bersih | diadaptasi | ADA | banjir/index.html:136,205 (#longsor) | Tab hash, tanpa URL /longsor/ |
| C03 | Tema terang/gelap | dibuat | ADA | index.html #tema | Bersama |
| C04 | Waktu data | dibuat | ADA | banjir/index.html:65 | Bersama; nowcast.json dibuat tidak ditampilkan terpisah |
| C05 | Panel kiri | sebagian | SEBAGIAN | banjir/peta.js (NAMA_B l) | Mode status banjir/longsor, tanpa mode kerentanan |
| C06 | Rentang waktu | sebagian | SEBAGIAN | banjir/peta.js:17-19 | Hari 0..3 |
| C07 | Garis waktu prakiraan | dibuat | ADA | index.html:104; peta.js:255 | Status 4 hari |
| C08 | Panel lapisan | sebagian | SEBAGIAN | banjir/metode.js:180 (bahaya InaRISK longsor) | PVMBG, kerentanan S, dan nowcast bukan lapisan peta |
| C09 | Choropleth wilayah + kartu hover | dibuat | ADA | banjir/peta.js (status l per kec) | Choropleth + kartu hover |
| C10 | Gelembung cluster | sebagian | SEBAGIAN | banjir/peta.js:448 | Gelembung kejadian B, bukan kejadian longsor |
| C11 | Popup titik | sebagian | SEBAGIAN | banjir/peta.js:151,154 | Kartu kecamatan, tanpa titik longsoran |
| C12 | Laci kejadian | sebagian | SEBAGIAN | banjir/kejadian.js:65-79 | Laci kejadian B |
| C13 | Legenda | dibuat | ADA | renderLegenda (`public/banjir/peta.js:305`) | Bersama |
| C14 | Insight | diadaptasi | ADA | public/banjir/longsor.js (4 kartu: status, nowcast, musim, riwayat); insight.js:121-125 | Ada; judul kartu berupa kalimat temuan (longsor.js:31,46,54) yang kini dilarang |
| C15 | Tabel kejadian | sebagian | SEBAGIAN | longsor.js (daftar tinggi/sedang) | Daftar kecamatan di tab, bukan tabel kejadian |
| C16 | Cerita | belum | BELUM | - | Tidak ada cerita_longsor.js |
| C17 | Berita | sebagian | SEBAGIAN | banjir/berita.js | Berita bersama banjir |
| C18 | Tren | sebagian | SEBAGIAN | longsor.js:54; banjir/tren.js | Kalender musim, tanpa indeks risiko 0-100 longsor |
| C19 | Posko, Sarana, Operasi, Keputusan | sebagian | SEBAGIAN | banjir/posko.js; keputusan.js | Sub-tab banjir tersembunyi; longsor tak tercakup |
| C20 | Dampak | sebagian | SEBAGIAN | banjir/dampak.js | Tanpa bagian longsor |
| C21 | Dashboard pimpinan | belum | SEBAGIAN | public/inti/dasbor_pimpinan.js; public/bnpb/pimpinan.js; src/pb_ringkas.js; public/bencana.json (dasbor.ringkas) | PB-30/31/47: GET /api/pb/ringkas dan /bnpb/pimpinan membaca ringkas per bencana; angka belum diuji dengan data produksi dan tidak dijumlah antarsumber |
| C22 | Metode | sebagian | SEBAGIAN | banjir/metode.js:226-256 (bab Status tanah longsor) | Tanpa bab kerentanan S, PVMBG, nowcast LHASA, uji balik |
| C23 | Simulasi | sebagian | SEBAGIAN | banjir/sim_longsor.js (62 baris, lereng tak-hingga SINMAP) | Ada, belum diuji ke longsor nyata |
| C24 | Lapor Warga | dibuat | ADA | src/bencana.generated.js lapor_bahaya banjir (longsor); tests/warga/api.test.mjs:173 | Tab Informasi tersembunyi |
| C25 | Foto lapangan | dibuat | ADA | src/foto.js:68; public/foto.js; tests/warga/foto_bencana.test.mjs | Kategori longsor ada |
| C26 | Pop-up situasi hari ini | sebagian | SEBAGIAN | banjir/sapa_banjir.js (2 sebutan longsor) | Pop-up gabungan banjir |
| C27 | Bagikan | sebagian | SEBAGIAN | public/bagikan.js cabang banjir | Tanpa template longsor |
| C28 | OG per rute | sebagian | SEBAGIAN | og_meta.js; og.test.mjs:44-47 | OG /banjir/, tanpa rute longsor |
| C29 | i18n EN | sebagian | SEBAGIAN | public/i18n/en.json | Kamus longsor.js belum dicek crawl |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | ADA | index.html:266-270 | Bersama |
| C31 | Muat / kosong / galat / luring | sebagian | SEBAGIAN | longsor.js:23 (Memuat status) | Muat dan kosong ada; galat luring tidak |
| C32 | Mobile 375 px | sebagian | SEBAGIAN | - | Tanpa uji 375 px otomatis |
| C33 | Klik tidak membekukan | sebagian | SEBAGIAN | longsor.js memakai nanti() bersama | Tanpa gerbang otomatis |
| C34 | Halaman Tentang dan kartu bencana | sebagian | SEBAGIAN | tentang.html kartu banjir | Longsor tak punya kartu |
| C35 | Statistik publik | sebagian | SEBAGIAN | registry.test.mjs:48 | Hanya hal banjir |
| C36 | Admin moderasi | sebagian | SEBAGIAN | admin/foto.js:8-10 | Pemilah banjir; tanpa antrean longsor khusus |
| C37 | Bagikan lanjutan | sebagian | SEBAGIAN | public/bagi.js | Bersama |
| C38 | Lapisan tambahan | sebagian | SEBAGIAN | inti/peta/konteks.js | Lapisan banjir bersama |
| C39 | Kaki dan Tentang | dibuat | ADA | kaki.js:40; tentang.html | Bersama |
| D01 | Rute HTML | sebagian | SEBAGIAN | src/bencana.generated.js:177 (/banjir/) | Tidak ada rute /longsor/ |
| D02 | Route data cepat | sebagian | SEBAGIAN | src/dalops.js:28 (GET /api/dalops/longsor); src/sihka.js:146 | Tanpa /api/longsor/terbaru; layar membaca berkas statis |
| D03 | Cron | sebagian | SEBAGIAN | src/ews.js:194-196 (dinilai tiap jam); lintas.yml:241 | Nowcast di Actions, EWS di Worker; tanpa cron khas |
| D04 | Status kesegaran | sebagian | SEBAGIAN | scripts/agents/kesegaran.py:28; tests/agen/gerbang-kesegaran.test.mjs:32 | Dijaga gerbang kesegaran, bukan registry sumber_status |
| D05 | Lapor warga | dibuat | ADA | migrations/0020; api.test.mjs:173 | lapor_bahaya banjir mencakup longsor |
| D06 | Foto | dibuat | ADA | migrations/0013; src/foto.js:68 | Kategori longsor |
| D07 | Statistik | sebagian | SEBAGIAN | migrations/0017; statistik.test.mjs:141 | Hanya hal banjir |
| D08 | OG meta | sebagian | SEBAGIAN | og_meta.js | Hanya rute banjir |
| D09 | Dummy | tidak berlaku | TB | - | Pemilik pensiunkan data dummy 11 Nov 2026 |
| D10 | Privasi | dibuat | ADA | worker.js:114 | Bersama |
| E01 | Self-check per skrip | diadaptasi | ADA | tests/longsor/longsor.test.mjs (7 self-check Python + 5 gerbang JSON); lintas.yml:247 (model.py diri) | Hanya model.py diri dipicu workflow; dasar, rumus, kejadian, hujan_riwayat, pvmbg, tanggapan hanya di uji lokal/CI uji |
| E02 | Cakupan route/tabel | sebagian | SEBAGIAN | tests/warga/cakupan.json (tanpa entri longsor) | GET /api/dalops/longsor di dalops.test.mjs, tak terdaftar cakupan |
| E03 | Skema D1 | sebagian | SEBAGIAN | migrasi 0013/0017/0020 | Tanpa tabel khas longsor |
| E04 | Registry | sebagian | SEBAGIAN | tests/agen/gerbang-bencana.test.mjs (banjir saja) | Longsor bukan entri registry |
| E05 | Duplikasi inti | dibuat | ADA | gerbang-inti.test.mjs | Bersama |
| E06 | Kesegaran data | dibuat | ADA | tests/agen/gerbang-kesegaran.test.mjs:32; kesegaran.py:28 (30 jam) | nowcast.json dibuat 14 Nov 16:49 |
| E07 | Beban | sebagian | SEBAGIAN | tests/beban/ukur_muat.mjs | Rute banjir; longsor tak diukur |
| E08 | i18n | sebagian | SEBAGIAN | kumpul.mjs | Per rute banjir, tanpa kunci longsor |
| E09 | Kepemilikan berkas | dibuat | ADA | roster.json (longsor); ilmu-agent/longsor.md | Hijau |
| E10 | Model agent | dibuat | ADA | roster longsor model sonnet (`scripts/agents/roster.json`, `.claude/agents/longsor.md`) | Hijau |
| F01 | Pengerja agent | dibuat | ADA | scripts/agents/roster.json; .claude/ilmu-agent/longsor.md | - |
| F02 | Dokumen spesifikasi | dibuat | ADA | docs/multi-bencana/bencana/longsor.md | Audit ini |
| F03 | Dokumen riset | dibuat | ADA | scripts/longsor/RISET-AMBANG-KAB.md; PRAREG-LHASA2.md | Dua berkas riset |
| F04 | Kredit dan lisensi | sebagian | SEBAGIAN | kejadian.py (sumber GLC, DIBI); pvmbg.py | Tidak ada kredit.json longsor; kredit GLC/SoilGrids/PVMBG tersebar di docstring |

## Komponen baru (audit 15 Nov)

Fitur karhutla yang lahir sesudah 19 Okt. Status = apakah bencana ini sudah tercakup fitur itu.

| Kode | Komponen | Status paket | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | sebagian | SEBAGIAN | src/instansi.js:335 bencanaPer; src/penugasan.js | Tugas lapangan generik per bencana; tidak ada alur longsor khusus (alat berat, evakuasi) |
| G02 | Operasi udara/darat | belum | BELUM | - | Operasi udara/darat tidak mencakup longsor |
| G03 | Sarana lapangan terencana (SIPPA) | belum | BELUM | public/pipa/** | SIPPA hanya karhutla dan banjir |
| G04 | Laporan harian/penanganan otomatis (deck, bot WA) | diadaptasi | ADA | data/laporan-bnpb/generator/harian_prediksi.py; situasi_banjir.py; laporan banjir dan longsor mingguan | Longsor ikut deck harian dan sepekan; bot WA tak khusus |
| G05 | Dalops: cek kabar luar, saringan per bencana, tindak lanjut | dibuat | ADA | src/dalops.js:28; scripts/data/dalops_banjir.py (14 sebutan); dalops_kabar.py | Saringan longsor ada; tindak lanjut generik |
| G06 | Prakiraan +1..+3 hari dinilai prospektif (/prediksi) | diadaptasi | ADA | scripts/prediksi/catat.py:16 (LSR); nilai.py:7-8,37; kalender.py:9 | +1..+3 hari dinilai terhadap DIBI longsor; uji balik model sendiri GAGAL |
| G07 | Semai awan dan prakiraan asap | tidak berlaku | TB | - | Semai awan tidak relevan longsor |
| G08 | Masuk laporan berkala Kepala BNPB | sebagian | SEBAGIAN | data/kajian-bnpb/laporan-berkala/ALGORITMA.md | Longsor termasuk jenis di rancangan; perakit belum dicek |
| G09 | Peringatan dini tersambung (EWS, CAP) | dibuat | SEBAGIAN | src/ews.js:194-196; tests/warga/ews.test.mjs | Longsor dinilai tiap jam dari status kecamatan; PB-34a: penilai longsor hipotesis (uji balik gagal) tidak ditulis ke peringatan_x dan tidak dikirim keluar, tampil lewat /api/ews/cek |
| G10 | Renlap (rencana operasi harian) lengkap | belum | BELUM | - | Renlap longsor tidak ada |
| G11 | Pembuat dokumen (laporan, sitrep, renkon, cetak A4) | diadaptasi | ADA | data/laporan-bnpb/generator/harian_prediksi.py; paparan banjir-longsor mingguan | Deck ada; sitrep/renkon khusus longsor tidak |
