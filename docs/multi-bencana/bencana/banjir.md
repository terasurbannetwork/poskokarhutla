# Banjir, longsor, rob

Pengerja: `banjir`. Urutan: 1. Modul warisan (`warisan: true`), status registry `aktif`.
Audit akhir 19 Okt 2026 malam, HEAD c191384, kode dan data di checkout (data tayang dibuat CI tanpa commit; hanya
`kejadian_aktif_awal.json`, `prospektif.json`, `seri_status.json`, `/api/status` diperiksa langsung di produksi). Tabel
mengisi SETIAP komponen PAKET-FITUR (113 baris). Paritas diukur terhadap karhutla yang TAMPIL; komponen yang disembunyikan
seperti karhutla (posko, sarana, keputusan, informasi, metode) tetap dihitung ada. Berkas tanpa awalan ada di `scripts/banjir/` atau
`public/banjir/` (data: `public/banjir/data/`).

**Hitungan: ADA 70 / SEBAGIAN 36 / BELUM 5 / TIDAK BERLAKU 2** (pagi 19 Okt: 76 / 28 / 6 / 3).
Selisih turun bukan karena kode mundur: pemeriksaan sore lebih ketat (komponen tersembunyi tanpa uji, tanpa workflow, tanpa gerbang
otomatis kini SEBAGIAN). Kolom "Status paket": dibuat = ADA, diadaptasi = ADA dengan bentuk beda karena domain.

## Identitas

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `banjir` / `/banjir/` (k/B#### dilayani sejak e4c995d) |
| `kejadian.awalan` | `B` (kecamatan Siaga/Awas bersebelahan; live 19 Okt: 11 kejadian B0007..B0033) |
| `tab` tampil | peta, insight, berita, tren, dampak, sim, foto, tentang |
| `tab_sembunyi` | posko, informasi, metode, prakiraan, daftar, provinsi, rob, sungai, keputusan, sarana |
| `cron_worker` | kosong (SIHKA menit 23 lewat pengatur bersama) |
| Workflow | `banjir.yml` (18 skrip) + `lintas.yml` (berita) |
| Status | Aturan ambang Perka BNPB; ETS 0,02-0,03, FAR 0,92-0,96 diakui di layar. Protokol ambang per kabupaten (`ambang_wilayah.py`) ditulis dan lulus swa-uji tetapi BELUM dijalankan (data DIBI harian 2016-2021 tidak tersedia) dan tidak memengaruhi status |

## Tabel 113 komponen

| Kode | Komponen | Status paket | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | sebagian | SEBAGIAN | banjir/hujan.py, kejadian.py; banjir.yml:62-63,99-100 | Hujan harian ada; katalog BNPB/InaRISK hanya dijalankan bila belum ada, tak pernah diperbarui |
| A02 | Varian keluaran bertingkat | sebagian | SEBAGIAN | prakiraan72.json; status.py:103 | Tak ada varian 24/72/semua; prakiraan72 lokal kec kosong; tanpa plafon ukuran |
| A03 | Pengamatan hampir-waktu-nyata | sebagian | SEBAGIAN | src/sihka.js:146-150; worker.js:559,621; cakupan.json:19 | SIHKA sungai terukur per jam ada tetapi tak dipakai layar banjir |
| A04 | Entitas kejadian aktif | dibuat | ADA | banjir/kejadian_aktif.py; banjir.yml:122; kejadian_aktif_awal.json (11 kejadian live) | Kode stabil lewat cocokkan; kedaluwarsa saat tak Siaga |
| A05 | Atribut kejadian | dibuat | ADA | kejadian_aktif_awal.json | Penduduk, hujan 3 hari, bahaya InaRISK, sungai, skor; tanpa fasilitas terdekat |
| A06 | Geometri dampak | dibuat | ADA | kejadian_aktif_geo.json (42 KB) | Poligon gabungan kecamatan |
| A07 | Pemecahan muatan | dibuat | ADA | kejadian_aktif_awal 4 KB + geo 43 KB; kejadian.js:14-15 | Geometri dimuat malas |
| A08 | Cuaca pendukung | dibuat | ADA | hujan.json; banjir/hujan.py | Kisi 0,25 sendiri, bukan umum/jaring.py |
| A09 | Indeks bahaya harian | diadaptasi | ADA | banjir/status.py:68,88; RISET-PARAMETER.md | Ambang Perka BNPB direkalibrasi uji balik |
| A10 | Prakiraan ansambel | dibuat | ADA | banjir/ansambel_hujan.py; hujan_ansambel.json; peluang.json | 51 anggota, q10/50/90 |
| A11 | Kondisi latar | sebagian | SEBAGIAN | status.py SM_JENUH 0,45, A7_BASAH 25 mm | Ambang mutlak, bukan persentil klimatologi |
| A12 | Indeks khusus tambahan | sebagian | SEBAGIAN | sim_longsor.js; metode.js:721 | Indeks lereng ada, tak diuji balik |
| A13 | Aturan status 4 tingkat | diadaptasi | ADA | status.py; peringatan.json; ambang_wilayah.py | 4 tingkat; ambang per kabupaten BELUM dipakai (status.py i_waspada tetap 20) |
| A14 | Prioritas | sebagian | SEBAGIAN | kejadian_aktif_awal.json skor_rumus; registry prioritas [] | Skor ada tetapi belum dikalibrasi; tanpa angka tangkapan/presisi |
| A15 | Risiko riwayat 0–100 | dibuat | ADA | banjir/riwayat.py; riwayat.json | Kekerapan/besaran/tren |
| A16 | Kalender musim | dibuat | ADA | riwayat.py musim() La Nina vs biasa | Per dasarian per provinsi |
| A17 | Iklim | dibuat | ADA | umum/outlook12.py; outlook12.json | Memakai iklim bersama |
| A18 | Riwayat grid dan sejarah | dibuat | ADA | riwayat_grid.json; kejadian.json DIBI 11.374 | DIBI harian hanya 2023+; tanpa gerbang tidak-menyusut |
| A19 | Statistik per provinsi | dibuat | ADA | laporan.json; meta.json | Agregat dari status |
| A20 | Data lembaga | dibuat | ADA | peringatan.py; peringatan.json; bahaya.json | Label lembaga |
| A21 | Posko | dibuat | ADA | banjir/posko.py; posko.json; posko.js:137 | Tab posko tersembunyi seperti karhutla |
| A22 | Operasi | sebagian | SEBAGIAN | posko.js:137-206; param_banjir.json | JS saja, tanpa uji kesetaraan; tersembunyi |
| A23 | Aset udara | sebagian | SEBAGIAN | keputusan.js:156 | Hanya parameter biaya heli; tanpa pangkalan/rekomendasi aset |
| A24 | Keputusan ekonomi | sebagian | SEBAGIAN | keputusan.js (Monte Carlo, bootstrap, CBA) | Ada dan tersembunyi, tetapi tanpa uji |
| A25 | Preventif | sebagian | SEBAGIAN | tren.js:182; keputusan.js:42 | Saran pra-musim; tanpa profil/rencana pencegahan |
| A26 | Penanggung jawab lahan | tidak berlaku | TB | bukti_das.py | Tak ada penanggung jawab tunggal; konsesi per DAS hanya luasan. Bisa dibantah |
| A27 | Dampak | dibuat | ADA | banjir/dampak.py; dampak.json; dampak.js | Rupiah/emisi sengaja tak ditampilkan |
| A28 | Paparan penduduk | dibuat | ADA | dampak.py WorldPop; kejadian_aktif_awal.json | Per kecamatan dan per kejadian |
| A29 | Sekolah dan fasilitas | sebagian | SEBAGIAN | dampak.json cakupan 9 provinsi | Sekolah/faskes di luar 9 provinsi dibuang |
| A30 | Muatan Dashboard | belum | BELUM | tidak ada ringkasan.json | Dashboard belum ada |
| A31 | Cuaca per jam untuk simulasi | tidak berlaku | TB | hujan.json kolom jam; sim_genangan.js | Profil jam sudah di hujan.json |
| A32 | Citra satelit | sebagian | SEBAGIAN | banjir/citra_banjir.py; bukti/citra (54 berkas) | Manual, tak di workflow; bukan per kejadian |
| A33 | Berita | sebagian | SEBAGIAN | umum/berita.py; berita.json (16 Okt) | Basi 3 hari lokal; tanpa label uji khusus banjir |
| A34 | Video | belum | BELUM | berita.js:6 | Video belum ada |
| A35 | Data sektor | sebagian | SEBAGIAN | dampak.py jalan OSM | Tak ada kereta/pelabuhan/penerbangan |
| A36 | Kurasi tangan | dibuat | ADA | param_banjir.json | Ditulis tangan dengan kolom sumber |
| A37 | Meta | dibuat | ADA | meta.json; registry sumber_status 30 jam | Mengisi /api/status |
| A38 | Data statis bulanan | sebagian | SEBAGIAN | rob/titik.json, sungai_titik.json, pusat_kec.json | Di-commit; tak ada workflow statis banjir |
| A39 | Seri jangka pendek bergulir | sebagian | SEBAGIAN | banjir/seri_status.py; seri_status.json lokal 31 byte | Seri tumbuh di CI (live 3 hari per 19 Okt); benih lokal kosong |
| A40 | Data respons dan kontak | sebagian | SEBAGIAN | banjir/unit_respons.py; unit_respons.json (388 unit) | Tak ada di workflow; tersembunyi |
| B01 | Model prakiraan | sebagian | SEBAGIAN | uji_balik.py; ambang_wilayah.py | Aturan, bukan model terlatih; model per kabupaten belum jalan (data DIBI lengkap tak ada) |
| B02 | Uji balik aturan status | diadaptasi | ADA | validasi.json (POD/FAR/CSI/PSS/ETS + bootstrap); insight.js:241-246 | ETS rendah, FAR 0,92-0,96 diakui |
| B03 | Prospektif | sebagian | SEBAGIAN | prospektif.py (banjir.yml:123); live prospektif.json 1 terbit 19 Okt, 521 kab | Berjalan sejak 19 Okt; belum ada skor |
| B04 | Kasus historis | belum | BELUM | - | Galeri kejadian besar belum ada |
| B05 | Galat dan pendorong | sebagian | SEBAGIAN | bukti_das.py; RISET-BUKTI.md | Pendorong ada tetapi tak signifikan; tanpa galat per kejadian |
| B06 | Tren jangka panjang | sebagian | SEBAGIAN | tren.js; riwayat.py | Tanpa Theil-Sen/Mann-Kendall |
| B07 | Kesetaraan Python↔JS | sebagian | SEBAGIAN | metode.js:810-812 | Cek peramban saja, tanpa uji node/CI |
| B08 | Selang ketidakpastian | dibuat | ADA | validasi.json bootstrap blok; hujan_ansambel | Selang ada |
| B09 | Kinerja tercatat | dibuat | ADA | validasi.json; insight.js:241 | Kartu uji tampil |
| B10 | Dokumen riset | dibuat | ADA | banjir/RISET-*.md (5 berkas) | Ada sebelum aktif |
| C01 | Kepala + menu bencana | dibuat | ADA | banjir/index.html:271; inti/kepala.js | Dari registry |
| C02 | Tab dan URL bersih | dibuat | ADA | index.html:185-191; registry.test.mjs:21 | /banjir/k/B#### dilayani |
| C03 | Tema terang/gelap | dibuat | ADA | index.html #tema | Tanpa uji kontras |
| C04 | Waktu data | dibuat | ADA | index.html:65 | Dari meta.json |
| C05 | Panel kiri | diadaptasi | ADA | index.html:80-100 | Mode status/hujan/sungai/rob/riwayat |
| C06 | Rentang waktu | sebagian | SEBAGIAN | peta.js:17-19 | Hari status 0..3; tanpa Kemarin/72 jam/7 hari |
| C07 | Garis waktu prakiraan | dibuat | ADA | index.html:104; peta.js:255 | 4 hari prakiraan |
| C08 | Panel lapisan | dibuat | ADA | index.html:105-125; inti/peta/konteks.js | 8 kotak lapisan, muat malas |
| C09 | Choropleth wilayah + kartu hover | dibuat | ADA | peta.js:149-154 | Kartu hover |
| C10 | Gelembung cluster | dibuat | ADA | peta.js:448 | Gelembung skor |
| C11 | Popup titik | dibuat | ADA | peta.js:151,154 | Kartu titik sungai/rob |
| C12 | Laci kejadian | sebagian | SEBAGIAN | banjir/kejadian.js:65-79 | Tingkat/penduduk/hujan/skor + bagikan; tanpa cuaca/riwayat/simulasi; Respons terdekat dibuat dan disembunyikan |
| C13 | Legenda | dibuat | ADA | renderLegenda (peta.js) | Legenda kejadian ada |
| C14 | Insight | dibuat | ADA | banjir/insight.js (±18 eksibit) | Gaya kartu pil |
| C15 | Tabel kejadian | diadaptasi | ADA | insight.js:40-52 | Tabel kejadian B di Insight, bukan tab terpisah |
| C16 | Cerita | belum | BELUM | tidak ada cerita_banjir.js | - |
| C17 | Berita | sebagian | SEBAGIAN | banjir/berita.js; berita.json | Celah liputan/pantauan/video/internasional dibuang; data 16 Okt |
| C18 | Tren | dibuat | ADA | banjir/tren.js | Indeks 0-100 + kalender musim |
| C19 | Posko, Sarana, Operasi, Keputusan | dibuat | ADA | posko.js, keputusan.js | Tersembunyi; lihat A22/A24 |
| C20 | Dampak | dibuat | ADA | banjir/dampak.js | 5 bagian |
| C21 | Dashboard pimpinan | belum | BELUM | tidak ada ringkasan.js | Dashboard belum ada |
| C22 | Metode | sebagian | SEBAGIAN | banjir/metode.js (25 bab) | Tanpa bab skor kejadian, unit respons, ambang_wilayah |
| C23 | Simulasi | diadaptasi | ADA | sim.js, sim_genangan.js, sim_longsor.js | Belum divalidasi ke peta genangan nyata (tertulis di Metode) |
| C24 | Lapor Warga | dibuat | ADA | informasi_jenis.js:65-73; informasi.js:11; api.test.mjs:173 | Tab Informasi tersembunyi |
| C25 | Foto lapangan | dibuat | ADA | banjir/foto.js:4; src/foto.js:113 (17 dummy) | Kategori banjir di registry |
| C26 | Pop-up situasi hari ini | dibuat | ADA | sapa_banjir.js; sapa.test.mjs | Sekali per hari WIB |
| C27 | Bagikan | dibuat | ADA | bagikan.js:37-39,468 | Cabang banjir |
| C28 | OG per rute | dibuat | ADA | og.test.mjs:44-47; og_meta.js | /banjir/ dan /banjir/k/B0007 |
| C29 | i18n EN | sebagian | SEBAGIAN | i18n/en.json; kumpul.mjs:104 | 9 dari 14 string baru banjir belum di kamus; crawl 15 Okt |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | ADA | index.html:266-270 | Bersama |
| C31 | Muat / kosong / galat / luring | sebagian | SEBAGIAN | index.html:76; mulai.js:15 | Tanpa inti/muat.js; empat keadaan tak seragam |
| C32 | Mobile 375 px | sebagian | SEBAGIAN | - | Tangkapan 390 px manual 16 Okt; tanpa uji 375 px otomatis |
| C33 | Klik tidak membekukan | sebagian | SEBAGIAN | index.html:160 nanti() | Tanpa gerbang otomatis; hanya agen inp-reviewer |
| C34 | Halaman Tentang dan kartu bencana | dibuat | ADA | tentang.html:1015,1034 | Kartu aktif |
| C35 | Statistik publik | dibuat | ADA | registry.test.mjs:48; statistik.test.mjs:141 | Dari registry |
| C36 | Admin moderasi | sebagian | SEBAGIAN | admin/foto.js:8-10,56-58; admin/statistik.js:237 | Antrean laporan tanpa pemilah bahaya |
| C37 | Bagikan lanjutan | dibuat | ADA | bagikan.js:53,335 | Tanpa rekamVideo |
| C38 | Lapisan tambahan | dibuat | ADA | inti/peta/konteks.js; databaru.js:153-232 | Sekolah/faskes 9 provinsi |
| C39 | Kaki dan Tentang | dibuat | ADA | kaki.js:40; tentang.html | Bersama |
| D01 | Rute HTML | dibuat | ADA | bencana.generated.js:177; registry.test.mjs:18-36 | Dari registry |
| D02 | Route data cepat | sebagian | SEBAGIAN | src/sihka.js:146 | Satu-satunya /api/banjir/*; tanpa /terbaru; layar tak memakai |
| D03 | Cron | dibuat | ADA | worker.js:621 SIHKA menit 23 | Pengatur bersama, tanpa cron khas banjir |
| D04 | Status kesegaran | dibuat | ADA | registry sumber_status 30 jam | meta.json |
| D05 | Lapor warga | dibuat | ADA | migrations/0020; api.test.mjs:142,173 | banjir/longsor/rob |
| D06 | Foto | dibuat | ADA | migrations/0013; foto_bencana.test.mjs:60,64 | Kategori banjir diuji |
| D07 | Statistik | dibuat | ADA | migrations/0017; statistik.test.mjs:141 | hal banjir |
| D08 | OG meta | dibuat | ADA | og_meta.js; og.test.mjs:42-47 | - |
| D09 | Dummy | dibuat | ADA | src/foto.js:113,397 | Lencana contoh; Lapor Warga tanpa dummy seperti karhutla |
| D10 | Privasi | dibuat | ADA | worker.js:114 | Hash IP bergaram bersama |
| E01 | Self-check per skrip | sebagian | SEBAGIAN | banjir.yml:58 (18 skrip) | unit_respons, hulu, ambang_wilayah punya uji tetapi tak terdaftar |
| E02 | Cakupan route/tabel | dibuat | ADA | cakupan.json:19 | Hanya GET /api/banjir/sungai-ukur |
| E03 | Skema D1 | dibuat | ADA | skema.test.mjs; migrasi 0013/0017/0020 | Lulus |
| E04 | Registry | dibuat | ADA | gerbang-bencana.test.mjs 18/18 | Hijau |
| E05 | Duplikasi inti | dibuat | ADA | gerbang-inti.test.mjs | Hijau |
| E06 | Kesegaran data | sebagian | SEBAGIAN | banjir.yml:164-179 | URL_STATUS bawaan menunjuk worker yatim |
| E07 | Beban | dibuat | ADA | ukur_muat.mjs:51 (1550 KB); beban.mjs:26,30 | /banjir/k/ tak diukur |
| E08 | i18n | sebagian | SEBAGIAN | kumpul.mjs:104; laporan.json 15 Okt | Laporan crawl tak diperbarui |
| E09 | Kepemilikan berkas | dibuat | ADA | roster.json:54-70 | Hijau |
| E10 | Model agent | dibuat | ADA | roster banjir model sonnet | Hijau |
| F01 | Pengerja agent | dibuat | ADA | roster.json:54; ilmu-agent/banjir.md | - |
| F02 | Dokumen spesifikasi | dibuat | ADA | bencana/banjir.md (tabel 113 baris, audit 19 Okt malam) | Daftar periksa A01-F04 terisi apa adanya |
| F03 | Dokumen riset | dibuat | ADA | banjir/RISET-*.md | 5 berkas |
| F04 | Kredit dan lisensi | sebagian | SEBAGIAN | img/dummy/banjir/kredit.json | Tak ada public/banjir/kredit.json; sumber data tersebar di metode.js |
