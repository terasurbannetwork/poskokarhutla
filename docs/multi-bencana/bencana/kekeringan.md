# Kekeringan

Pengerja: `gunungapi-kering` (registry `pengerja: "kekeringan"` bukan id roster). Urutan: 6. Status registry: `aktif`.
Audit ulang 15 Nov 2026 (sebelumnya 19 Okt 2026 malam, HEAD c191384), kode dan data di checkout, tanpa jaringan. Tabel di bawah mengisi SETIAP komponen PAKET-FITUR
(113 baris). Paritas diukur terhadap karhutla yang TAMPIL; komponen yang sengaja disembunyikan seperti karhutla (tab
`metode`, `posko`) tetap dihitung ada. Bukti `berkas:baris` memakai singkatan: `kekeringan/` = `scripts/kekeringan/` atau
`public/kekeringan/` menurut ekstensinya; `kekeringan_*.json`, `dampak_kekeringan.json`, `posko_kekeringan.json` di `public/data/`.

**Hitungan 15 Nov (HEAD f3ab401e2): ADA 64 / SEBAGIAN 31 / BELUM 9 / TIDAK BERLAKU 9** (19 Okt malam: 62 / 33 / 9 / 9). Komponen baru G01-G11: ADA 0 / SEBAGIAN 6 / BELUM 5 / TIDAK BERLAKU 0.
Kolom "Status paket": dibuat = ADA, diadaptasi = ADA dengan bentuk beda karena domain, sebagian dan belum ditulis apa adanya,
tidak berlaku = alasan di kolom catatan (yang paling bisa dibantah: A03/D03, A23, C06).

## Identitas

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `kekeringan` / `/kekeringan/` |
| `kejadian.awalan` | `D` ("Wilayah kekeringan": gugus kabupaten Siaga/Awas) |
| `tab` | peta, insight, berita, tren, dampak, posko, foto, tentang, metode (tersembunyi: metode, posko) |
| `cron_worker` | kosong; sumber paling cepat harian |
| Workflow | `lintas.yml` harian 02:10 UTC menjalankan `status.py` yang merantai 12 turunan (hth, prakiraan, padi, ujibalik, laporan, neraca, resmi, peringatan_bmkg, bukti, dampak, posko, riwayat), plus `peluang_kering.py` dan `gdo.py` (registry masih menulis `data.yml`, keliru); `statis.yml` bulanan untuk embung |
| Status | Deteksi Pantau Bencana, ambang berstatus HIPOTESIS: uji balik vs DIBI + 21 kandidat penyetelan menyatakan belum layak (POD 0,10-0,38, FAR 0,95-0,99), status tidak diubah, pil hipotesis di semua angka |

## Tabel 113 komponen

| Kode | Komponen | Status paket | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | dibuat | ADA | kekeringan/hth.py, spi.py, resmi.py; `lintas.yml:233-235` (`status.py` merantai 12 turunan), `status.py:216` RANTAI | Open-Meteo harian + POWER bulanan + DIBI/SK BNPB; `status.py uji` hijau 15 Nov (padi dilewati karena bahan gagal, lokal) |
| A02 | Varian keluaran bertingkat | tidak berlaku | TB | kekeringan_meta.json | Status potret harian, bukan arus kejadian; seri 30 hari di A39 |
| A03 | Pengamatan hampir-waktu-nyata | tidak berlaku | TB | bencana.json cron_worker [] | Sumber tercepat harian (HTH cache 6 jam, SPI bulanan); CAP kering/kemarau lewat cron peringatan bersama. Bisa dibantah |
| A04 | Entitas kejadian aktif | sebagian | SEBAGIAN | umum/kejadian.py:283 adaptor_kekeringan; lintas.yml:126-133 | Kode D0001 ada (44 gugus saat dijalankan lokal), tetapi kejadian_kekeringan_* tak ada di repo dan halaman kekeringan tak membacanya (hanya /semua) |
| A05 | Atribut kejadian | sebagian | SEBAGIAN | kejadian.py:292; kejadian/kekeringan-3201.json | Ada prov/kab/jiwa/tingkat; tanpa InaRISK, fasilitas terdekat, skor |
| A06 | Geometri dampak | sebagian | SEBAGIAN | kejadian.py adaptor (_geo 1,18 MB) | Poligon gugus kabupaten ada, tak diterbitkan ke repo dan tak digambar di peta kekeringan |
| A07 | Pemecahan muatan | sebagian | SEBAGIAN | kejadian.py _awal 18 KB + _geo; ukur_muat.mjs:51 | Pemecahan ada; pembaca hanya public/semua/kejadian.js:30 |
| A08 | Cuaca pendukung | dibuat | ADA | kekeringan/hth.py, tanah.py, neraca.py | Hujan harian, tanah, ET0 Open-Meteo/POWER; kuota dicatat |
| A09 | Indeks bahaya harian | diadaptasi | ADA | kekeringan/spi.py:142 uji, hth.py | SPI-3/6 + HTH; diuji matematis (bukan contoh terbitan WMO langsung) |
| A10 | Prakiraan ansambel | diadaptasi | ADA | kekeringan/prakiraan.py; kekeringan_prakiraan.json | 51 anggota SEAS5; peluang SPI-3 <= -1/-1,5/-2 + HTH 31/61 hari |
| A11 | Kondisi latar | sebagian | SEBAGIAN | kekeringan_meta.json tanah {tgl 2026-10-13, sel 12} | Persentil tanah hanya 12 dari 611 sel dan bertanggal 13 Okt |
| A12 | Indeks khusus tambahan | sebagian | SEBAGIAN | kekeringan/neraca.py, padi.py; kekeringan_padi.json | Neraca FAO-56 dan padi ada, tanpa uji balik ke puso; berlabel indikator |
| A13 | Aturan status 4 tingkat | diadaptasi | ADA | kekeringan/status.py:46-60; peta.js isiSK; insight.js:13 kartu `bmkg` | 4 tingkat; tanah hanya menaikkan satu tingkat; SK BNPB dan Peringatan resmi BMKG tampil terpisah dari status kita |
| A14 | Prioritas | sebagian | SEBAGIAN | kekeringan_ujibalik.json kejadian.vonis; registry prioritas [] | Angka uji balik tertulis (POD 0,10-0,38, FAR 0,95-0,99) tetapi tak ada penanda prioritas |
| A15 | Risiko riwayat 0–100 | dibuat | ADA | kekeringan/riwayat.py:9,76; kekeringan_riwayat.json | Bobot 0,5/0,3/0,2 sama dengan karhutla |
| A16 | Kalender musim | dibuat | ADA | kekeringan_riwayat.json kalender; kekeringan/tren.js:51 | Nasional + 38 provinsi, El Nino vs rerata |
| A17 | Iklim | dibuat | ADA | kekeringan/app.js:98 membaca data/iklim.json; insight.js:56 | ONI/IOD/CPC bersama |
| A18 | Riwayat grid dan sejarah | dibuat | ADA | kekeringan_riwayat.json 1991-2025 + DIBI 2023-26 | 35 tahun per kabupaten; tanpa gerbang tidak-menyusut |
| A19 | Statistik per provinsi | dibuat | ADA | kekeringan_wilayah.json | Agregat provinsi dan kabupaten |
| A20 | Data lembaga | dibuat | ADA | kekeringan_resmi.json (79 SK 2025); `peringatan_bmkg.py` di RANTAI `status.py:216`; insight.js:13-15 kartu "Peringatan resmi BMKG"; komit a30dedf54 | BMKG kini tampil per kabupaten (arsip per dasarian), bukan gambar saja; SK hanya 2025 sehingga status resmi SK kosong |
| A21 | Posko | diadaptasi | ADA | kekeringan/posko.py; posko_kekeringan.json (1.410 posko, 275 kab) | Greedy gugus kecamatan 15 km; tab disembunyikan seperti karhutla |
| A22 | Operasi | sebagian | SEBAGIAN | kekeringan/posko.py LITER_ORANG_HARI 15, KAP_TANGKI_L 5000 | Hanya liter dan rit tangki; tanpa koefisien lo/mid/hi atau regu |
| A23 | Aset udara | belum | BELUM | `scripts/operasi/semai.py` (awan layak semai) dan `semai_ifs.py` kini ada; tak ada zona untuk kekeringan | Alasan 19 Okt ("tak ada data awan") basi: data awan ada di semai karhutla. Hujan buatan untuk kekeringan belum dibuat |
| A24 | Keputusan ekonomi | belum | BELUM | - | Biaya respons vs kerugian dihindari belum dibuat |
| A25 | Preventif | belum | BELUM | - | Profil/rencana pencegahan (embung, sumur bor, tanam) belum dibuat |
| A26 | Penanggung jawab lahan | diadaptasi | ADA | kekeringan_bukti.json gambut.daftar (450 kompleks); peta.js lapisanSumber | Kompleks gambut netral tanpa nama perusahaan |
| A27 | Dampak | dibuat | ADA | kekeringan/dampak.py:100; dampak_kekeringan.json | Terpapar, tahunan BNPB, sawah/lahan, sekolah/fasilitas; tanpa jaringan |
| A28 | Paparan penduduk | dibuat | ADA | dampak_kekeringan.json terpapar (147,9 jt Siaga+, 18,9 jt Awas) | WorldPop per kecamatan |
| A29 | Sekolah dan fasilitas | sebagian | SEBAGIAN | dampak_kekeringan.json sekolah_fasilitas kab_tercakup 33 dari 246 | sekolah/fasilitas hanya 9 provinsi prioritas; lapisan peta dari registry tetap ada |
| A30 | Muatan Dashboard | belum | BELUM | ringkasan.json hanya karhutla | Muatan dashboard kekeringan belum ada |
| A31 | Cuaca per jam untuk simulasi | tidak berlaku | TB | kekeringan/simulasi.js | Kebutuhan harian/mingguan, bukan per jam; neraca memakai ET0 harian |
| A32 | Citra satelit | sebagian | SEBAGIAN | kekeringan/peta.js NASA.pasang(["smap","suhu"]) | GIBS SMAP/suhu saja; tanpa NDVI atau citra sebelum/sesudah |
| A33 | Berita | sebagian | SEBAGIAN | berita_kekeringan.json (1.500 artikel, 16 Okt); kekeringan/berita.py | Sentimen tak teruji dan tak ditampilkan; data 3 hari lokal; METODE.batas salah |
| A34 | Video | belum | BELUM | kekeringan/berita.js:6 | Tak ada skrip video kekeringan |
| A35 | Data sektor | diadaptasi | ADA | kekeringan/padi.py; kekeringan_padi.json (508 kab) | Sektor padi tadah hujan (selisih vs Normal Markov), bukan data puso |
| A36 | Kurasi tangan | belum | BELUM | tidak ada factsheet_kekeringan.json | Tak ada berkas kurasi tangan; kekeringan_bnpb.json hasil panen otomatis |
| A37 | Meta | dibuat | ADA | kekeringan_meta.json dibuat 19 Okt 17:57; registry sumber_status | Mengisi /api/status |
| A38 | Data statis bulanan | dibuat | ADA | kekeringan/embung.py; `statis.yml:101` (bulanan); public/kekeringan/data/embung.json, tutupan.json, hindcast.json, peluang_bayangan*.json | `gdo.py` harian `lintas.yml:246`. `hindcast`, `tutupan`, `peluang_bayangan` (bayangan.py) dibuat tangan, tanpa workflow |
| A39 | Seri jangka pendek bergulir | dibuat | ADA | kekeringan_hth.json nasional.seri; kekeringan_laporan.json; kekeringan_tren.json | Seri 30 hari/dasarian; tanpa gerbang tidak-menyusut |
| A40 | Data respons dan kontak | dibuat | ADA | posko_kekeringan.json bpbd.pusdalops; bpbd.json (13 Okt) | Kontak BPBD bersama; tanpa PDAM/Basarnas; tab posko tersembunyi |
| B01 | Model prakiraan | sebagian | SEBAGIAN | kekeringan/prakiraan.py; bayangan.py -> peluang_bayangan.json (AUC-PR 0,175 vs klimatologi 0,134); insight.js:273 | Model bayangan berdampingan diuji (FAR sekitar 88%, bukan peringatan), tanpa workflow; SEAS5 mentah belum diuji balik |
| B02 | Uji balik aturan status | diadaptasi | ADA | kekeringan/ujibalik.py; kekeringan_ujibalik.json (19:00, DIBI, 21 kandidat, bootstrap 2000); insight.js:136 | Vonis "belum layak" tampil apa adanya; pil hipotesis aktif. Versi live masih 00:38 (lihat PARITAS) |
| B03 | Prospektif | sebagian | SEBAGIAN | kekeringan_prospektif.json (1 terbit, hasil {}); prakiraan.py:575 | Append-only ada, belum ada target dinilai (Nov 2026) |
| B04 | Kasus historis | belum | BELUM | - | Galeri kejadian besar belum ada (hanya grafik DIBI tahunan) |
| B05 | Galat dan pendorong | sebagian | SEBAGIAN | insight.js:56 exEnso; ujibalik prospek | ENSO sebagai pendorong; tanpa analisis galat formal |
| B06 | Tren jangka panjang | sebagian | SEBAGIAN | kekeringan/riwayat.py tren | Tren hanya komponen risiko; tanpa Theil-Sen/Mann-Kendall |
| B07 | Kesetaraan Python↔JS | dibuat | ADA | kekeringan/neraca.py:504-508 (node), dijalankan `lintas.yml:105` lewat `neraca.py uji`; tests/kekeringan/sim_tanggap.test.mjs 9 dari 9 lolos | Kesetaraan Python dan JS kini di CI (boleh gagal) |
| B08 | Selang ketidakpastian | sebagian | SEBAGIAN | ujibalik bootstrap 2000; prakiraan 51 anggota | Selang POD/FAR/CSI ada; tanpa P10/P90 terkalibrasi untuk SPI prakiraan |
| B09 | Kinerja tercatat | dibuat | ADA | insight.js:136-158; metode.js:22 | Kinerja uji tampil apa adanya dengan vonis |
| B10 | Dokumen riset | sebagian | SEBAGIAN | kekeringan/RISET-AMBANG.md, RISET-LABEL.md | Dua berkas (ambang, label); SPI, prakiraan, padi, neraca, bayangan tanpa RISET |
| C01 | Kepala + menu bencana | dibuat | ADA | index.html:60-64; inti/kepala.js | Menu dari registry |
| C02 | Tab dan URL bersih | dibuat | ADA | app.js:65-77; tests/warga/api.test.mjs:95 | URL bersih /kekeringan/<tab> |
| C03 | Tema terang/gelap | dibuat | ADA | app.js:84; peta.js DASAR | Tema terang/gelap |
| C04 | Waktu data | dibuat | ADA | app.js:96 | Waktu data dari meta |
| C05 | Panel kiri | sebagian | SEBAGIAN | peta.js renderCrumb/renderDaftar/#cari | Crumb, cari, daftar terurut ada; tanpa mode Riwayat/Kejadian |
| C06 | Rentang waktu | tidak berlaku | TB | index.html | Status potret harian/bulanan. Bisa dibantah (ada seri HTH 30 hari) |
| C07 | Garis waktu prakiraan | diadaptasi | ADA | peta.js blnPeta | Segmen 3 bulan SEAS5 menggantikan garis waktu |
| C08 | Panel lapisan | diadaptasi | ADA | index.html:94-106; peta.js UBIN; inti/peta/konteks.js | 7 mode data + embung, gambut, konteks, NASA |
| C09 | Choropleth wilayah + kartu hover | dibuat | ADA | peta.js kartuWilayah/kartuSel | Choropleth + kartu hover |
| C10 | Gelembung cluster | tidak berlaku | TB | - | Tak ada titik pengamatan; yang digambar poligon dan kisi |
| C11 | Popup titik | dibuat | ADA | peta.js kartuHth/kartuPrak/kartuSel | Popup sel per mode |
| C12 | Laci kejadian | sebagian | SEBAGIAN | peta.js Analisa.wilayah (dialog) | Dialog wilayah ada; tanpa laci, tanpa /k/D####, tanpa bagikan per kejadian |
| C13 | Legenda | dibuat | ADA | peta.js renderLegenda; inti/peta/legenda.js | Legenda dok |
| C14 | Insight | dibuat | ADA | insight.js:13 (10 kartu) | Gaya kartu Insight |
| C15 | Tabel kejadian | sebagian | SEBAGIAN | insight.js:79 exTabel | Tabel wilayah ada; tak ada tab/tabel kejadian D |
| C16 | Cerita | dibuat | ADA | `Cerita.daftar("kekeringan", ...)` insight.js:290 (mesin bersama inti/cerita.js) | Cerita dari data 1991-2025 |
| C17 | Berita | sebagian | SEBAGIAN | kekeringan/berita.js:24-188 | Volume, topik, media, peta ada; sentimen, internasional, ruang krisis dibuang; data 16 Okt |
| C18 | Tren | dibuat | ADA | kekeringan/tren.js:72 | 7 kartu tren |
| C19 | Posko, Sarana, Operasi, Keputusan | sebagian | SEBAGIAN | kekeringan/posko.js (30 baris) | Posko tersembunyi dengan 2 kartu; tanpa Sarana/Operasi/Keputusan |
| C20 | Dampak | dibuat | ADA | kekeringan/dampak.js | 5 bagian dampak domain |
| C21 | Dashboard pimpinan | belum | BELUM | tidak ada ringkasan.js | Dashboard pimpinan belum ada |
| C22 | Metode | sebagian | SEBAGIAN | kekeringan/metode.js | Tanpa bab neraca/simulasi, posko, risiko riwayat, dampak, embung |
| C23 | Simulasi | diadaptasi | ADA | kekeringan/simulasi.js (332 baris), simulasi.html | Neraca FAO-56 180 hari + skenario; tersambung dari akhir Insight, bukan tab registry |
| C24 | Lapor Warga | dibuat | ADA | index.html:123,157 (`p-informasi`, `informasi.js data-halaman="kekeringan"`); app.js:65 tab `informasi`; informasi_jenis.js:100-105 | Tab disembunyikan lewat `tab_sembunyi` seperti karhutla |
| C25 | Foto lapangan | dibuat | ADA | kekeringan/foto.js:4; src/foto.js:113; img/dummy/kekeringan (16 foto + kredit) | Foto tampil; komentar app.js:66-68 basi |
| C26 | Pop-up situasi hari ini | dibuat | ADA | kekeringan/sapa.js | Provinsi, kabupaten, HTH, perubahan pekan, prakiraan |
| C27 | Bagikan | sebagian | SEBAGIAN | kekeringan/bagikan.js:22 | Hanya satu templat "ringkas"; tanpa per-wilayah/kejadian |
| C28 | OG per rute | sebagian | SEBAGIAN | src/og_meta.js:13; index.html:21-29; scripts/og/buat.py | Pratinjau per bencana; gambar memakai ringkasan.png; tanpa deskripsi per tab |
| C29 | i18n EN | sebagian | SEBAGIAN | i18n/en.json; kumpul.mjs:109 | Beberapa label baru belum di kamus ("Seberapa tepat", "Antre air", "Sawah puso"); crawl terakhir 15 Okt |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | ADA | index.html:145-148 | Bersama |
| C31 | Muat / kosong / galat / luring | dibuat | ADA | index.html #muat; app.js:96; mulai.js:8-11 | Muat/kosong/galat; tanpa keadaan luring terpisah |
| C32 | Mobile 375 px | sebagian | SEBAGIAN | kekeringan.css (3 @media); peta.js kiriPad | Penyesuaian layar kecil ada; tak ada uji 375 px |
| C33 | Klik tidak membekukan | dibuat | ADA | app.js:4 nanti(); jejak inp-reviewer 17-19 Okt | Pola dipakai; temuan ringan belum ditutup tertulis |
| C34 | Halaman Tentang dan kartu bencana | dibuat | ADA | index.html #p-tentang; tentang.html | Kartu dari registry |
| C35 | Statistik publik | dibuat | ADA | src/statistik.js:15,18; statistik.test.mjs:115 | Pemilah dari registry |
| C36 | Admin moderasi | sebagian | SEBAGIAN | admin/foto.js:8-10,58,76 | Foto dan dummy per bencana ada; antrean laporan tanpa pemilah bahaya |
| C37 | Bagikan lanjutan | dibuat | ADA | bagikan.js:53,335-339 | QR/WA bersama; tanpa "Bagikan video" |
| C38 | Lapisan tambahan | dibuat | ADA | peta.js konteks.js pasang(peta,"kekeringan"); embung, gambut | Lapisan konteks dari registry |
| C39 | Kaki dan Tentang | dibuat | ADA | index.html:147 kaki.js; tentang.html | Bersama |
| D01 | Rute HTML | dibuat | ADA | tests/warga/registry.test.mjs:26,80 | /kekeringan/ dan /kekeringan/metode |
| D02 | Route data cepat | tidak berlaku | TB | - | Tanpa tabel/route cepat; data statis harian |
| D03 | Cron | tidak berlaku | TB | bencana.json cron_worker [] | Lihat A03 |
| D04 | Status kesegaran | dibuat | ADA | bencana.json sumber_status; lintas.yml langkah akhir | CI merah bila basi |
| D05 | Lapor warga | dibuat | ADA | migrations/0020; src/worker.js:194,215-217 | Menerima, menyimpan, menyaring bahaya=kekeringan |
| D06 | Foto | dibuat | ADA | migrations/0013; foto_bencana.test.mjs | Foto per bencana dari registry |
| D07 | Statistik | dibuat | ADA | migrations/0017; statistik.test.mjs | stat_hari menerima id bencana |
| D08 | OG meta | dibuat | ADA | src/og_meta.js:13; og.test.mjs:51 | Profil dari registry |
| D09 | Dummy | tidak berlaku | TB | Dummy dipensiunkan pemilik 11 Nov 2026 | `JUMLAH_DUMMY` di src/foto.js milik warga-api; `public/img/dummy/kekeringan/` masih ada |
| D10 | Privasi | dibuat | ADA | jejak.js (data-halaman=kekeringan) | Hash IP bergaram bersama |
| E01 | Self-check per skrip | sebagian | SEBAGIAN | `lintas.yml:105-106,233-235,246`; `statis.yml:101`; berita/dampak loop `:268-274` | Dari 27 skrip, CI menjalankan uji: neraca, ujibalik, ambang, ambang2, dampak, posko, uji_rantai, status, peluang_kering, gdo, embung, berita. Tidak: hth, prakiraan, padi, bayangan, hindcast, fao, tutupan, label, bukti, riwayat, resmi |
| E02 | Cakupan route/tabel | tidak berlaku | TB | tests/warga/cakupan.json | Tak ada route/tabel khas kekeringan |
| E03 | Skema D1 | dibuat | ADA | skema.test.mjs:222,264 | Lulus |
| E04 | Registry | dibuat | ADA | gerbang-bencana.test.mjs:51 | Lulus |
| E05 | Duplikasi inti | dibuat | ADA | gerbang-inti.test.mjs | Lulus |
| E06 | Kesegaran data | dibuat | ADA | bencana.json sumber_status; lintas.yml | 503 bila basi |
| E07 | Beban | dibuat | ADA | beban.mjs:27,37; ukur_muat.mjs:49-51 (480 KB, plafon 550) | Terdaftar |
| E08 | i18n | sebagian | SEBAGIAN | kumpul.mjs:109 | Dicrawl, tetapi laporan.json (15 Okt) belum memuat kekeringan |
| E09 | Kepemilikan berkas | dibuat | ADA | ilmu.mjs pemilik: kekeringan/**, public/kekeringan/** = gunungapi-kering | Data kekeringan_* tanpa pemilik (seperti data lain) |
| E10 | Model agent | dibuat | ADA | roster.json:381-397 model sonnet | Lulus |
| F01 | Pengerja agent | dibuat | ADA | roster.json:381; ilmu-agent/gunungapi-kering.md | Ilmu terisi dari kode |
| F02 | Dokumen spesifikasi | dibuat | ADA | bencana/kekeringan.md (tabel 113 baris + G01-G11, audit 15 Nov) | Daftar periksa A01-F04 terisi apa adanya |
| F03 | Dokumen riset | sebagian | SEBAGIAN | kekeringan/RISET-AMBANG.md | Satu berkas riset; metode lain di docstring |
| F04 | Kredit dan lisensi | belum | BELUM | tidak ada public/kekeringan/kredit.json | Hanya img/dummy/kekeringan/kredit.json; NASA POWER tak di Tentang |

## Komponen baru (audit 15 Nov)

Fitur karhutla yang lahir sesudah 19 Okt. Status = apakah kekeringan sudah tercakup (bukan karhutla).

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | sebagian | `scripts/umum/tugas.py:18` tugas kekeringan (Awas / Siaga, `kejadian_kekeringan_awal.json` D####), dijadwalkan `lintas.yml:293`; `src/penugasan.js:46` daftar periksa kekeringan (hanya APD). Tanpa kabar regu atau level 3; kejadian D tidak digambar di layar (A04). |
| G02 | Operasi udara/darat | belum | `src/operasi_udara.js`, `operasi_lapangan.js`, `operasi_isian.js` tanpa kekeringan; dropping air/TMC kekeringan belum (A23). |
| G03 | Sarana lapangan terencana (SIPPA) | belum | SIPPA mencakup pipa portabel karhutla dan banjir; `public/pipa/layar_data.js:27,45` hanya memakai pemicu kemarau dan debit kemarau untuk karhutla. Tanpa jalur air bersih kekeringan. |
| G04 | Laporan harian/penanganan otomatis (deck, bot WA) | sebagian | `data/laporan-bnpb/generator/harian.py:196` blok kekeringan (`KR`) dan kolom air bersih; `scripts/wa/urai_laporan.py` + `uji_urai_laporan.py:233-241` mengurai laporan kekeringan; `laporan_kejadian.py:52` MODUL kekeringan dengan `pemicu: []` (belum memicu). |
| G05 | Dalops: cek kabar luar, saringan, tindak lanjut | sebagian | `dalops_kabar.py:23,31,137` (kekeringan, ambang 14 hari, berita + `gdo.json`); `dalops_banjir.py:36`; `public/bnpb/dalops.js:23,29,1057` jenis kekeringan (kabar). Tindak lanjut `dalops_tindak.js` generik, tidak diuji khusus kekeringan. |
| G06 | Prakiraan +1..+3 hari dinilai prospektif (/prediksi) | sebagian | `kekeringan_prospektif.json` (1 terbit, hasil kosong, dasarian/bulan), bukan +1..+3 hari; `scripts/prediksi/tangga.py:224` memuat peringatan BMKG kekeringan di tab Tangga. `prediksi.json` tanpa kode kekeringan. |
| G07 | Semai awan dan prakiraan asap | belum | `scripts/operasi/semai*` hanya zona asap karhutla; tanpa zona hujan buatan untuk kekeringan. |
| G08 | Masuk laporan berkala Kepala BNPB | belum | `scripts/berkala/` belum ada; `KEPUTUSAN-BERKALA.md:71` merujuk tabel cuaca dan kekeringan 12 baris, kodenya belum dibangun. |
| G09 | Peringatan dini tersambung (EWS, Peringatan Dini, CAP) | sebagian | Peringatan resmi BMKG kekeringan tampil di Insight (`peringatan_bmkg.py`, arsip dasarian); tetapi `public/ews_tindakan.js` `BENCANA` tanpa kekeringan dan `src/peringatan.js:186` CAP tanpa jenis kekeringan, jadi tidak ada langganan email atau CAP. |
| G10 | Renlap (rencana operasi harian) | belum | Tidak ada renlap kekeringan (`renlap.py`, `renlap_banjir.py` saja). |
| G11 | Pembuat dokumen: laporan harian, sitrep, laporan kejadian, renkon, cetak A4 | sebagian | `public/kekeringan/laporan.html` + `kekeringan/laporan.py` (laporan harian), `laporan_kejadian.py:52` per KIB tanpa pemicu; sitrep/renkon bersama belum punya jalur kekeringan. |

## Catatan audit 15 Nov

- Dasar bukti: `node --test tests/kekeringan/sim_tanggap.test.mjs` 9 dari 9; `status.py uji`, `gdo.py uji`, `peringatan_bmkg.py uji` hijau lokal; `npm run uji:agen` tidak dijalankan. Tanpa jaringan: semua angka "live" 19 Okt tidak diperiksa ulang (A11, A33, A37, A40, B02, B03, C25 memakai data lokal yang bertanggal 2 Nov atau lebih lama).
- Temuan basi: A23 (alasan "tak ada data awan") salah sejak `scripts/operasi/semai.py`; `public/kekeringan/app.js:66-68` komentar "Hapus foto dari sini" basi (foto sudah punya `foto.js`); A20 "BMKG hanya gambar" sudah tidak benar (kartu Peringatan resmi BMKG).
- Tanpa workflow dan tanpa uji CI: `bayangan.py`, `hindcast.py`, `tutupan.py`, `fao.py`, `label.py` (selain lewat rantai `status.py`); hasilnya (`public/kekeringan/data/hindcast.json`, `tutupan.json`, `peluang_bayangan*.json`) dibuat tangan.
- Status registry: `kekeringan` menyatakan `pengerja: gunungapi-kering` (sudah benar); `cron_worker` kosong.
