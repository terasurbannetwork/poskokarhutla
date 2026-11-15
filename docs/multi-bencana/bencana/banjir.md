# Banjir, longsor, rob

Pengerja: `banjir`. Urutan: 1. Modul warisan (`warisan: true`), status registry `aktif`.
Audit 15 Nov 2026, HEAD f3ab401e2, kode dan berkas di checkout; data tayang (CI tanpa commit) diperiksa di centurisk97.id:
`meta.json` (14 Nov 2026 14.15 WIB), `kejadian_aktif_awal.json` (21 kejadian), `prospektif.json` (27 terbit), `prospektif_skor.json`,
`peluang.json`, `seri_status.json`, `/api/status`. Self-check: `tests/banjir` 218 uji lulus; `status.py`, `prospektif.py`,
`kejadian_aktif.py uji` ok. Tabel mengisi SETIAP komponen PAKET-FITUR (113 baris) ditambah G01-G11. Paritas diukur terhadap karhutla
yang TAMPIL; komponen tersembunyi seperti karhutla tetap dihitung ada bila terjadwal dan diuji. Berkas tanpa awalan ada di
`scripts/banjir/` atau `public/banjir/` (data: `public/banjir/data/`).

**Hitungan 15 Nov (113 baris A01-F04): ADA 75 / SEBAGIAN 31 / BELUM 4 / TIDAK BERLAKU 3**
(19 Okt malam: 70 / 36 / 5 / 2; 19 Okt pagi: 76 / 28 / 6 / 3).
Komponen baru G01-G11: ADA 5 / SEBAGIAN 4 / BELUM 1 / TIDAK BERLAKU 1.
Gabungan 124 baris: ADA 80 / SEBAGIAN 35 / BELUM 5 / TIDAK BERLAKU 4.
Kolom "Status paket": dibuat = ADA, diadaptasi = ADA dengan bentuk beda karena domain (kolom ini disalin dari audit lama).

## Identitas

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `banjir` / `/banjir/` (k/B#### dilayani) |
| `kejadian.awalan` | `B` (kecamatan Siaga/Awas bersebelahan; live 14 Nov: 21 kejadian aktif) |
| `tab` tampil | peta, insight, longsor, berita, tren, dampak, sim, foto (tab_sembunyi bencana.json: posko, informasi, metode, prakiraan, daftar, provinsi, rob, sungai, keputusan, sarana, replay, tentang) |
| `cron_worker` | kosong (SIHKA lewat pengatur bersama; worker.js:883) |
| Workflow | `banjir.yml` (cron 20 0 * * *, sekitar 30 langkah) + `lintas.yml` (berita), `m1_prospektif.yml`, `genangan_j4.yml`, `nowcast-bandang.yml` (tiap jam), `panen-lab-banjir.yml`, `panen-s1-banjir.yml`, `gsmap_musim.yml`, `data.yml` (uji logbook mingguan) |
| Status | Aturan ambang Perka BNPB; ETS 0,02-0,03, FAR 0,92-0,96 diakui di layar. Ambang per kabupaten dan persentil Siaga dicatat append-only tetapi BELUM memengaruhi `status.py` |

## Tabel 113 komponen

| Kode | Komponen | Status paket | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | sebagian | SEBAGIAN | banjir/hujan.py, ansambel_hujan.py, peluang_banjir.py, peringatan.py; banjir.yml:107-127; bahaya.py dan kejadian.py banjir.yml:181-185 | Hujan, ansambel, peluang, nowcast BMKG harian; katalog InaRISK/BNPB hanya dibuat bila berkasnya belum ada, tak pernah diperbarui |
| A02 | Varian keluaran bertingkat | sebagian | SEBAGIAN | prakiraan72.json; status.py:103 | Tak ada varian 24/72/semua; prakiraan72 lokal kec kosong; tanpa plafon ukuran |
| A03 | Pengamatan hampir-waktu-nyata | sebagian | ADA | src/sihka.js:213-223; layar: pos_air.js:241,391, eksperimen.js:73; tests/banjir/pos_air.test.mjs; tests/warga/cakupan.json:165-168 | SIHKA tinggi muka air dan hujan terukur dipakai layar (bukti naik dari SEBAGIAN) |
| A04 | Entitas kejadian aktif | dibuat | ADA | banjir/kejadian_aktif.py; banjir.yml:263; live 14 Nov: 21 kejadian | Kode stabil lewat cocokkan; kedaluwarsa saat tak Siaga |
| A05 | Atribut kejadian | dibuat | ADA | kejadian_aktif_awal.json | Penduduk, hujan 3 hari, bahaya InaRISK, sungai, skor; tanpa fasilitas terdekat |
| A06 | Geometri dampak | dibuat | ADA | kejadian_aktif_geo.json (42 KB) | Poligon gabungan kecamatan |
| A07 | Pemecahan muatan | dibuat | ADA | kejadian_aktif_awal 4 KB + geo 43 KB; kejadian.js:14-15 | Geometri dimuat malas |
| A08 | Cuaca pendukung | dibuat | ADA | hujan.json; banjir/hujan.py | Kisi 0,25 sendiri, bukan umum/jaring.py |
| A09 | Indeks bahaya harian | diadaptasi | ADA | banjir/status.py:68,88; RISET-PARAMETER.md | Ambang Perka BNPB direkalibrasi uji balik |
| A10 | Prakiraan ansambel | dibuat | ADA | banjir/ansambel_hujan.py, peluang_banjir.py; hujan_ansambel.json; peluang.json (live 14 Nov, ECMWF 51 anggota) | Peluang 50 dan 100 mm per kabupaten tiga hari; dipakai peringatan WA dan EWS |
| A11 | Kondisi latar | sebagian | SEBAGIAN | status.py SM_JENUH 0,45, A7_BASAH 25 mm | Ambang mutlak, bukan persentil klimatologi |
| A12 | Indeks khusus tambahan | sebagian | SEBAGIAN | sim_longsor.js; metode.js:721 | Indeks lereng ada, tak diuji balik |
| A13 | Aturan status 4 tingkat | diadaptasi | ADA | banjir/status.py:68 (i_waspada=20 bawaan); ambang_wilayah.py dan ambang_persentil.py; siaga_persentil.py banjir.yml:269 | 4 tingkat; ambang per kabupaten dan persentil Siaga dicatat append-only, BELUM mengubah status.py |
| A14 | Prioritas | sebagian | SEBAGIAN | kejadian_aktif_awal.json skor_rumus; registry prioritas [] | Skor ada tetapi belum dikalibrasi; tanpa angka tangkapan/presisi |
| A15 | Risiko riwayat 0–100 | dibuat | ADA | banjir/riwayat.py; riwayat.json | Kekerapan/besaran/tren |
| A16 | Kalender musim | dibuat | ADA | riwayat.py musim() La Nina vs biasa | Per dasarian per provinsi |
| A17 | Iklim | dibuat | ADA | umum/outlook12.py; outlook12.json | Memakai iklim bersama |
| A18 | Riwayat grid dan sejarah | dibuat | ADA | riwayat_grid.json; kejadian.json DIBI 11.374 | DIBI harian hanya 2023+; tanpa gerbang tidak-menyusut |
| A19 | Statistik per provinsi | dibuat | ADA | laporan.json; meta.json | Agregat dari status |
| A20 | Data lembaga | dibuat | ADA | peringatan.py; peringatan.json; bahaya.json | Label lembaga |
| A21 | Posko | dibuat | ADA | banjir/posko.py; posko.json; posko.js:137 | Tab posko tersembunyi seperti karhutla |
| A22 | Operasi | sebagian | SEBAGIAN | posko.js; scripts/umum/renlap.py (kandidat, rute, KML/GPX/WA banjir, PB-15) + scripts/operasi/renlap_banjir.py (CLI manual PDF/daftar/peta/rencana); data/laporan-bnpb/generator/penanganan_banjir.py | Renlap dan penanganan banjir ada tetapi dijalankan tangan atau bot, tak ada di workflow banjir, tak di layar banjir |
| A23 | Aset udara | sebagian | SEBAGIAN | scripts/umum/renlap.py (BASE bandara, rute tetangga terdekat); src/sippa.js:25,35 (kit banjir, pindah_banjir); keputusan.js:156 | Base heli banjir belum ada di seed 0103; rekomendasi aset belum |
| A24 | Keputusan ekonomi | sebagian | SEBAGIAN | keputusan.js (Monte Carlo, bootstrap, CBA) | Ada dan tersembunyi, tetapi tanpa uji |
| A25 | Preventif | sebagian | SEBAGIAN | tren.js:182; keputusan.js:42 | Saran pra-musim; tanpa profil/rencana pencegahan |
| A26 | Penanggung jawab lahan | tidak berlaku | TB | bukti_das.py | Tak ada penanggung jawab tunggal; konsesi per DAS hanya luasan. Bisa dibantah |
| A27 | Dampak | dibuat | ADA | banjir/dampak.py; dampak.json; dampak.js | Rupiah/emisi sengaja tak ditampilkan |
| A28 | Paparan penduduk | dibuat | ADA | dampak.py WorldPop; kejadian_aktif_awal.json | Per kecamatan dan per kejadian |
| A29 | Sekolah dan fasilitas | sebagian | SEBAGIAN | dampak.json cakupan 9 provinsi | Sekolah/faskes di luar 9 provinsi dibuang |
| A30 | Muatan Dashboard | belum | BELUM | tidak ada ringkasan.json | Dashboard belum ada |
| A31 | Cuaca per jam untuk simulasi | tidak berlaku | TB | hujan.json kolom jam; sim_genangan.js | Profil jam sudah di hujan.json |
| A32 | Citra satelit | sebagian | SEBAGIAN | banjir/opera_dswx.py + geoglows.py banjir.yml:137-143; panen-s1-banjir.yml (manual); ems.py charter.py mcdwd.py banjir.yml:148-157; citra_banjir.py (manual) | Katalog OPERA harian ada; citra per kejadian belum dan tak tampil di laci kejadian |
| A33 | Berita | sebagian | SEBAGIAN | umum/berita.py; berita.json (16 Okt) | Basi 3 hari lokal; tanpa label uji khusus banjir |
| A34 | Video | belum | BELUM | berita.js:6 | Video belum ada |
| A35 | Data sektor | sebagian | SEBAGIAN | dampak.py jalan OSM | Tak ada kereta/pelabuhan/penerbangan |
| A36 | Kurasi tangan | dibuat | ADA | param_banjir.json | Ditulis tangan dengan kolom sumber |
| A37 | Meta | dibuat | ADA | meta.json; registry sumber_status 30 jam | Mengisi /api/status |
| A38 | Data statis bulanan | sebagian | SEBAGIAN | rob/titik.json, sungai_titik.json, pusat_kec.json | Di-commit; tak ada workflow statis banjir |
| A39 | Seri jangka pendek bergulir | sebagian | ADA | banjir/seri_status.py banjir.yml:262; live seri_status.json 17 Okt sampai 14 Nov | Seri tumbuh harian di CI; benih lokal kosong |
| A40 | Data respons dan kontak | sebagian | ADA | banjir/unit_respons.py banjir.yml:224-228 (bulanan, uji di banjir.yml:102); unit_respons.json | Terjadwal dan diuji; tampilannya (Respons terdekat) tersembunyi |
| B01 | Model prakiraan | sebagian | SEBAGIAN | banjir/prediksi_kab2.py banjir.yml:323-324; model_kab2_ops.py; arsip_kab2; AUDIT-MODEL-2026-11.md | Prakiraan KAB2 diarsipkan prospektif; yang menentukan status tetap aturan ambang Perka BNPB, bukan model terlatih |
| B02 | Uji balik aturan status | diadaptasi | ADA | validasi.json; insight.js:241-246 | POD/FAR/CSI/PSS/ETS + bootstrap. Berkas live bertanggal 13 Okt 2026 dan tidak diperbarui harian (uji_balik.py tak ada di langkah jalan workflow, hanya self-check) |
| B03 | Prospektif | sebagian | ADA | banjir/prospektif.py banjir.yml:264-267; live prospektif.json 27 terbit (19 Okt sampai 14 Nov), prospektif_skor.json dengan kriteria terkunci (jangkar_commit) | Berjalan dan dinilai harian; vonis berjalan "belum cukup data" (ETS model 0,035 vs klimatologi 0,055 pada tunda 0) |
| B04 | Kasus historis | belum | SEBAGIAN | public/banjir/replay.html, replay.js, tests/banjir/replay.test.mjs; genangan_historis.py; lapis_genangan_historis.js | Pemutar ulang kejadian ada tetapi tab replay tersembunyi (bencana.json tab_sembunyi); bukan galeri kasus historis bernarasi |
| B05 | Galat dan pendorong | sebagian | SEBAGIAN | banjir/bukti_das.py, faktor_kec.py, dampak_sensitivitas.py; RISET-BUKTI.md | Pendorong ada tetapi tak signifikan; tanpa galat per kejadian |
| B06 | Tren jangka panjang | sebagian | SEBAGIAN | tren.js; riwayat.py | Tanpa Theil-Sen/Mann-Kendall |
| B07 | Kesetaraan Python↔JS | sebagian | SEBAGIAN | metode.js:810-812 | Cek peramban saja, tanpa uji node/CI |
| B08 | Selang ketidakpastian | dibuat | ADA | validasi.json bootstrap blok; hujan_ansambel | Selang ada |
| B09 | Kinerja tercatat | dibuat | ADA | validasi.json; insight.js:241 | Kartu uji tampil |
| B10 | Dokumen riset | dibuat | ADA | scripts/banjir/RISET-*.md (14 berkas), PRAREG-*.md (18), AUDIT-MODEL-2026-11.md | Jauh melampaui karhutla |
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
| C12 | Laci kejadian | sebagian | SEBAGIAN | banjir/kejadian.js:3-15; kejadian_aktif_awal.json, kejadian_aktif_geo.json | Tingkat, penduduk, hujan, skor, bagikan; tanpa cuaca, riwayat, simulasi, tugas lapangan; Respons terdekat dibuat dan disembunyikan |
| C13 | Legenda | dibuat | ADA | renderLegenda (peta.js) | Legenda kejadian ada |
| C14 | Insight | dibuat | ADA | banjir/insight.js (±18 eksibit) | Gaya kartu pil |
| C15 | Tabel kejadian | diadaptasi | ADA | insight.js:40-52 | Tabel kejadian B di Insight, bukan tab terpisah |
| C16 | Cerita | belum | BELUM | public/cerita_karhutla.js saja; tidak ada cerita banjir | - |
| C17 | Berita | sebagian | SEBAGIAN | banjir/berita.js; berita.json | Celah liputan/pantauan/video/internasional dibuang; data 16 Okt |
| C18 | Tren | dibuat | ADA | banjir/tren.js | Indeks 0-100 + kalender musim |
| C19 | Posko, Sarana, Operasi, Keputusan | dibuat | ADA | posko.js, keputusan.js | Tersembunyi; lihat A22/A24 |
| C20 | Dampak | dibuat | ADA | banjir/dampak.js | 5 bagian |
| C21 | Dashboard pimpinan | belum | SEBAGIAN | public/inti/dasbor_pimpinan.js; public/bnpb/pimpinan.js; src/pb_ringkas.js; public/bencana.json (dasbor.ringkas) | PB-30/31/47: GET /api/pb/ringkas dan /bnpb/pimpinan membaca ringkas per bencana; angka belum diuji dengan data produksi dan tidak dijumlah antarsumber |
| C22 | Metode | sebagian | SEBAGIAN | banjir/metode.js (915 baris, 141 KB); tab metode tersembunyi (bencana.json tab_sembunyi) | Banyak bab (hujan, ambang, uji balik, bukti), tetapi tab tersembunyi dan bab skor kejadian, unit respons, ambang_wilayah tak lengkap |
| C23 | Simulasi | diadaptasi | ADA | sim.js, sim_genangan.js, sim_longsor.js | Belum divalidasi ke peta genangan nyata (tertulis di Metode) |
| C24 | Lapor Warga | dibuat | ADA | informasi_jenis.js:65-73; informasi.js:11; api.test.mjs:173 | Tab Informasi tersembunyi |
| C25 | Foto lapangan | dibuat | ADA | banjir/foto.js:4; src/foto.js:113; tests/warga/foto_bencana.test.mjs | TEMUAN: foto dummy masih ada di public/img/dummy/banjir (000.jpg dst) padahal data dummy dipensiunkan 11 Nov 2026 |
| C26 | Pop-up situasi hari ini | dibuat | ADA | banjir/sapa_banjir.js; tests/banjir/sapa.test.mjs | Sekali per hari WIB |
| C27 | Bagikan | dibuat | ADA | bagikan.js:37-39,468 | Cabang banjir |
| C28 | OG per rute | dibuat | ADA | og.test.mjs:44-47; og_meta.js | /banjir/ dan /banjir/k/B0007 |
| C29 | i18n EN | sebagian | SEBAGIAN | i18n/en.json; kumpul.mjs:104 | 9 dari 14 string baru banjir belum di kamus; crawl 15 Okt |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | ADA | index.html:266-270 | Bersama |
| C31 | Muat / kosong / galat / luring | sebagian | SEBAGIAN | index.html:76; mulai.js:15; tidak ada public/inti/muat.js | Empat keadaan tak seragam |
| C32 | Mobile 375 px | sebagian | SEBAGIAN | - | Tangkapan 390 px manual 16 Okt; tanpa uji 375 px otomatis |
| C33 | Klik tidak membekukan | sebagian | SEBAGIAN | index.html:160 nanti() | Tanpa gerbang otomatis; hanya agen inp-reviewer |
| C34 | Halaman Tentang dan kartu bencana | dibuat | ADA | tentang.html:1015,1034 | Kartu aktif |
| C35 | Statistik publik | dibuat | ADA | registry.test.mjs:48; statistik.test.mjs:141 | Dari registry |
| C36 | Admin moderasi | sebagian | SEBAGIAN | admin/foto.js:8-10,56-58; admin/statistik.js:237 | Antrean laporan tanpa pemilah bahaya |
| C37 | Bagikan lanjutan | dibuat | ADA | bagikan.js:53,335 | Tanpa rekamVideo |
| C38 | Lapisan tambahan | dibuat | ADA | inti/peta/konteks.js; databaru.js:153-232 | Sekolah/faskes 9 provinsi |
| C39 | Kaki dan Tentang | dibuat | ADA | kaki.js:40; tentang.html | Bersama |
| D01 | Rute HTML | dibuat | ADA | bencana.generated.js:177; registry.test.mjs:18-36 | Dari registry |
| D02 | Route data cepat | sebagian | ADA | src/sihka.js:213-223 (sungai-ukur, hujan-ukur, sungai-ukur/pos/:id); worker.js:883; tests/warga/cakupan.json:165-168 | Tiga rute dipakai layar (pos_air.js, eksperimen.js); /terbaru tak ada tetapi data statis di /banjir/data/ |
| D03 | Cron | dibuat | ADA | worker.js:621 SIHKA menit 23 | Pengatur bersama, tanpa cron khas banjir |
| D04 | Status kesegaran | dibuat | ADA | registry sumber_status 30 jam | meta.json |
| D05 | Lapor warga | dibuat | ADA | migrations/0020; api.test.mjs:142,173 | banjir/longsor/rob |
| D06 | Foto | dibuat | ADA | migrations/0013; foto_bencana.test.mjs:60,64 | Kategori banjir diuji |
| D07 | Statistik | dibuat | ADA | migrations/0017; statistik.test.mjs:141 | hal banjir |
| D08 | OG meta | dibuat | ADA | og_meta.js; og.test.mjs:42-47 | - |
| D09 | Dummy | dibuat | TB | - | Pemilik pensiunkan data dummy 11 Nov 2026. TEMUAN sisa: src/instansi.js:1618,1637 (tombol contoh banjir), public/img/dummy/banjir/ |
| D10 | Privasi | dibuat | ADA | worker.js:114 | Hash IP bergaram bersama |
| E01 | Self-check per skrip | sebagian | SEBAGIAN | banjir.yml:102 (35 skrip dijalankan self-check) | Sekitar 58 skrip banjir punya `uji` tetapi tak di daftar (ambang_wilayah, ambang_persentil, model_kab*, label_*, opera_dswx dan geoglows jalan inline); tests/banjir 29 berkas, 218 uji lulus |
| E02 | Cakupan route/tabel | dibuat | ADA | tests/warga/cakupan.json:165-168,883-887 | Rute /api/banjir/* dan uji-banjir terdaftar; table push_banjir dan uji_banjir |
| E03 | Skema D1 | dibuat | ADA | skema.test.mjs; migrasi 0013/0017/0020 | Lulus |
| E04 | Registry | dibuat | ADA | gerbang-bencana.test.mjs 18/18 | Hijau |
| E05 | Duplikasi inti | dibuat | ADA | gerbang-inti.test.mjs | Hijau |
| E06 | Kesegaran data | sebagian | ADA | banjir/jaga_banjir.py banjir.yml:345-346; banjir.yml:382-393 (URL_STATUS centurisk97.id); tests/agen/gerbang-cache-banjir.test.mjs | Temuan lama (URL_STATUS ke worker yatim) sudah dibetulkan; gerbang cache lulus |
| E07 | Beban | dibuat | ADA | tests/beban/ukur_muat.mjs; tests/beban/beban.mjs:26,30 | /banjir/k/ belum diukur |
| E08 | i18n | sebagian | SEBAGIAN | kumpul.mjs:104; laporan.json 15 Okt | Laporan crawl tak diperbarui |
| E09 | Kepemilikan berkas | dibuat | ADA | roster.json:54-70 | Hijau |
| E10 | Model agent | dibuat | ADA | roster banjir model sonnet | Hijau |
| F01 | Pengerja agent | dibuat | ADA | roster.json:54; ilmu-agent/banjir.md | - |
| F02 | Dokumen spesifikasi | dibuat | ADA | docs/multi-bencana/bencana/banjir.md (audit 15 Nov, 113 + 11 baris) | - |
| F03 | Dokumen riset | dibuat | ADA | scripts/banjir/RISET-*.md (14), PRAREG-*.md (18) | - |
| F04 | Kredit dan lisensi | sebagian | SEBAGIAN | public/img/dummy/banjir/kredit.json (foto dummy); tidak ada public/banjir/kredit.json | Sumber data tersebar di metode.js; kredit dummy ikut dibuang saat dummy dihapus |

## Komponen baru (audit 15 Nov)

| Kode | Komponen | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | SEBAGIAN | src/tugas_bencana.js; src/penugasan.js:42 (daftar periksa banjir); src/instansi.js:1242,1637; migrasi 0047-0049 | Tugas banjir (buka, surut dilaporkan, surut terverifikasi) ada; kluster, poligon, angin, level 3 dan kabar regu karhutla-only (operasi_lapangan.js:163 menolak non-karhutla) |
| G02 | Operasi udara/darat | SEBAGIAN | scripts/umum/renlap.py (SKOR banjir, bagi_base, kirim) + operasi/renlap_banjir.py (daftar, peta, buat PDF); src/operasi_lapangan.js:614; src/operasi_udara.js 0 rujukan banjir | Renlap udara pantau banjir ada sebagai CLI manual (pemilik 15 Nov); tak ada pantauan operasi udara banjir di /operasi, tak terjadwal |
| G03 | Sarana lapangan terencana | ADA | src/sippa.js:25-35,54 (kit, templat, pindah_banjir); public/pipa/layar_pemicu.js; tests/sippa/formulir.test.mjs | SIPPA mencakup banjir |
| G04 | Laporan harian/penanganan otomatis | ADA | scripts/wa/otomatis.mjs:42 (penanganan_banjir.py, cut-off 17.00 WIB); data/laporan-bnpb/generator/penanganan_banjir.py; scripts/wa/peringatan_banjir.mjs; src/laporan_bencana.js | Peringatan WA hujan lebat mati sampai PENERIMA_PERINGATAN_BANJIR diisi |
| G05 | Dalops: cek kabar luar, saringan, tindak lanjut | ADA | scripts/data/dalops_banjir.py banjir.yml:370-378; public/bnpb/dalops.js:1-14; src/dalops_tindak.js:11 | Pantau Banjir Dalops, kabar luar harian, tindak lanjut kunci banjir|... |
| G06 | Prakiraan +1..+3 hari dinilai prospektif | ADA | scripts/prediksi/aturan.json:13 (banjir); public/prediksi/data/prediksi.json; banjir/prospektif.py | Banjir masuk /prediksi dan punya prospektif sendiri |
| G07 | Semai awan dan prakiraan asap | TB | - | Semai awan dan asap untuk karhutla dan kekeringan; tak ada kaitan operasional dengan banjir |
| G08 | Masuk laporan berkala Kepala BNPB | BELUM | scripts/berkala/ dan src/laporan_berkala.js tidak ada; hanya paket dokumen data/kajian-bnpb/laporan-berkala/ | Banjir belum masuk karena mesin berkalanya belum dibangun |
| G09 | Peringatan dini tersambung (EWS, CAP) | ADA | src/ews.js:194-214; src/peringatan.js:90-108; src/push.js:151-202 (migrasi 0064); src/berantai.js | Status kecamatan, rob, kejadian aktif Siaga/Awas, push naik status, peringatan berantai |
| G10 | Renlap lengkap | SEBAGIAN | scripts/umum/renlap.py + renlap_keluaran.py (KML, GPX, TXT WA, JSON; PDF masih operasi/renlap_banjir.py) | Target titik tengah kecamatan, bukan genangan; tanpa versi, R2 operasi/renlap/, atau tampilan di layar; base heli banjir belum ada |
| G11 | Pembuat dokumen | SEBAGIAN | penanganan_banjir.py; renlap_banjir.py peta (PDF titik belum surut Aceh dan Sumut, b6d185500); laporan_banjir.py; src/laporan_bencana.js | Laporan penanganan dan peta PDF ada; sitrep, renkon, surat dan laporan per KIB banjir belum |
