# Gelombang pasang dan abrasi (pesisir)

Pengerja: `pesisir`. Entri registry `pesisir` (aktif, awalan kejadian `P`), layar `/pesisir/` (`public/pesisir/`, 6 tab; Lapor Warga tersembunyi). Tiga bahaya: abrasi (`scripts/pesisir/abrasi.py`), rob (`scripts/banjir/rob.py`, `pasut.py`, milik banjir), gelombang tinggi (`banjir/data/cuaca_gelombang.json`, peringatan BMKG). Dokumen metode abrasi terpisah di `bencana/abrasi.md` (tidak disentuh).

Audit 15 Nov 2026, HEAD f3ab401e2, kode dan data di checkout (rob.json 13 Okt, cuaca_gelombang 18 Okt, pasut_30h 29 Okt, abrasi.json 2 Nov: data tayang dibuat CI tanpa commit). Tabel mengisi SETIAP komponen PAKET-FITUR (113 baris) plus G01-G11. D09 tidak berlaku (dummy dipensiunkan 11 Nov 2026).

**Hitungan: ADA 37 / SEBAGIAN 48 / BELUM 24 / TIDAK BERLAKU 4** (19 Okt 2026: belum diaudit). Komponen baru G01-G11: ADA 0 / SEBAGIAN 5 / BELUM 5 / TIDAK BERLAKU 1.

## Temuan utama

- `abrasi.py` tidak dijadwalkan workflow mana pun; `abrasi.json` dibuat 2 Nov, usulan langkah `statis.yml` di `abrasi.md` belum dipasang. Registry memberi batas basi 9000 jam.
- Registry menamai awalan `P` tetapi tidak ada `kejadian_pesisir_*.json`; adaptor kejadian di `lintas.yml` hanya C, U, V, D, jadi tidak ada entitas kejadian, laci, atau deep link.
- `scripts/berita/pesisir.py` jalan di `lintas.yml:276-277` tetapi `/pesisir/` tidak punya tab Berita dan `berita_pesisir.json` tidak ada di checkout.
- Hanya rob yang tersambung ke EWS (`src/ews.js:210`), prospektif (`catat.py:19`), dan deck banjir; gelombang dan abrasi belum.
- Tanpa Dampak, Metode, Posko/Operasi/Keputusan, Sapa, Dashboard, dan simulasi. Uji layar `tests/pesisir/layar.test.mjs` 11 tes hijau, `abrasi.py uji` dan `rob_label.py uji` lolos.
## Tabel 113 komponen

| Kode | Komponen | Status paket | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | sebagian | SEBAGIAN | scripts/pesisir/abrasi.py; banjir/pasut.py (banjir.yml:157-160); banjir/rob.py (banjir.yml:173-179); lintas.yml:276-277 | Abrasi Landsat tidak dijadwalkan workflow; rob, pasang, gelombang dijadwalkan lewat banjir.yml |
| A02 | Varian keluaran bertingkat | belum | BELUM | - | Tidak ada varian keluaran bertingkat |
| A03 | Pengamatan hampir-waktu-nyata | sebagian | SEBAGIAN | public/banjir/data/pasut_30h.json; cuaca_gelombang.json; rob.json | Seri harian/30 hari, tanpa pengamatan realtime muka laut; checkout: rob 13 Okt, gelombang 18 Okt, pasut 29 Okt |
| A04 | Entitas kejadian aktif | belum | BELUM | - | Registry menamai awalan P tetapi tidak ada kejadian_pesisir_*.json; adaptor lintas.yml hanya C, U, V, D |
| A05 | Atribut kejadian | belum | BELUM | - | Tanpa entitas kejadian aktif |
| A06 | Geometri dampak | sebagian | SEBAGIAN | public/pesisir/data/abrasi.json (167 transek garis) | Transek garis pantai, bukan geometri dampak |
| A07 | Pemecahan muatan | sebagian | SEBAGIAN | abrasi.json 163 KB; rob_kejadian.json 53 KB | Dimuat utuh sekali, tanpa pemecahan awal/geo |
| A08 | Cuaca pendukung | diadaptasi | ADA | banjir/data/cuaca_gelombang.json; pasut_30h.json; scripts/prediksi/catat.py:19 (muka laut SMOC) | Open-Meteo Marine dan BMKG Maritim |
| A09 | Indeks bahaya harian | diadaptasi | ADA | banjir/rob.py; public/pesisir/pesisir.js:17 (Waspada p95, Siaga p99); tests/pesisir/layar.test.mjs:59 | Tingkat rob dari ambang persentil titik |
| A10 | Prakiraan ansambel | sebagian | SEBAGIAN | banjir/rob_presiden.py (rob 14 hari, banjir.yml:204-207) | Pasang astro 14 hari, bukan ansambel |
| A11 | Kondisi latar | diadaptasi | ADA | banjir.yml:128 (ambang 29 tahun per titik); banjir/data/rob/ambang.json | Ambang persentil iklim titik |
| A12 | Indeks khusus tambahan | diadaptasi | ADA | abrasi.py (laju regresi, ci95 AR(1), kelas, keyakinan, tinjau) | Setara DEA Coastlines; belum koreksi pasut |
| A13 | Aturan status 4 tingkat | sebagian | SEBAGIAN | src/bencana.generated.js tingkat 0-3; pesisir.js:17 | Rob punya 4 tingkat; gelombang model dan abrasi hanya kelas, tanpa aturan status terpadu |
| A14 | Prioritas | belum | BELUM | registry pesisir prioritas [] | Tidak ada skor prioritas |
| A15 | Risiko riwayat 0–100 | sebagian | SEBAGIAN | public/pesisir/tren.js; rob_kejadian.json kab_tahun | Tren abrasi per situs dan kejadian rob per tahun; tanpa skor 0-100 |
| A16 | Kalender musim | sebagian | SEBAGIAN | public/banjir/kalender_rob.js | Kalender rob ada di layar banjir, tidak di /pesisir/ |
| A17 | Iklim | belum | BELUM | - | ENSO/anomali muka laut belum dipakai |
| A18 | Riwayat grid dan sejarah | dibuat | ADA | rob_kejadian.json (565 kejadian 2012-2026, 179 kab); abrasi.json 1988-kini | Sumber Pusdalops, logbook, DIBI |
| A19 | Statistik per provinsi | sebagian | SEBAGIAN | rob_kejadian.json kab[] | Per kabupaten, tanpa agregat provinsi |
| A20 | Data lembaga | dibuat | ADA | banjir/data/peringatan_bmkg.json; resmi_bmkg.js; DIBI | Peringatan gelombang BMKG tersaring (layar.test.mjs:71) |
| A21 | Posko | sebagian | SEBAGIAN | banjir/rob_presiden.py (posko pesisir untuk /presiden) | Bukan posko pesisir di layar |
| A22 | Operasi | belum | SEBAGIAN | public/bencana.json; scripts/umum/renlap.py; public/inti/renlap.js | Renlap dan sarana per registri ada; koefisien kebutuhan regu belum bersumber |
| A23 | Aset udara | tidak berlaku | TB | - | Tidak ada aset udara untuk rob/abrasi |
| A24 | Keputusan ekonomi | belum | BELUM | - | Tanpa analisis biaya tanggul/pompa/mangrove |
| A25 | Preventif | belum | BELUM | - | Tanpa profil/rencana pencegahan (mangrove, tanggul, relokasi) |
| A26 | Penanggung jawab lahan | tidak berlaku | TB | - | Pantai publik; tidak ada penanggung jawab tunggal |
| A27 | Dampak | belum | BELUM | - | Tanpa dampak.json pesisir |
| A28 | Paparan penduduk | belum | BELUM | - | Tanpa penduduk terpapar rob |
| A29 | Sekolah dan fasilitas | sebagian | SEBAGIAN | src/bencana.generated.js lapisan penduduk/sekolah/fasilitas/jalan | Lapisan konteks ada; tanpa hitung paparan |
| A30 | Muatan Dashboard | belum | BELUM | - | Tanpa ringkasan.json |
| A31 | Cuaca per jam untuk simulasi | tidak berlaku | TB | - | Gelombang jam dari cuaca_gelombang.json, tak butuh produk terpisah |
| A32 | Citra satelit | sebagian | SEBAGIAN | abrasi.py (Landsat 4-9 C2 L2 via Planetary Computer) | Citra dipakai untuk garis pantai, tidak ditampilkan sebagai citra sebelum/sesudah |
| A33 | Berita | sebagian | SEBAGIAN | scripts/berita/pesisir.py; lintas.yml:276-277 | Tab Berita tidak ada di /pesisir/; berita_pesisir.json tak ada di checkout |
| A34 | Video | belum | BELUM | - | Video belum ada |
| A35 | Data sektor | sebagian | SEBAGIAN | banjir/data/cuaca_maritim.json | Data maritim ada; tidak dipakai untuk pelayaran di layar |
| A36 | Kurasi tangan | dibuat | ADA | abrasi.py SITUS (kotak tulis tangan); rob_label.py; abrasi.json catatan[], sumber | Berkolom sumber |
| A37 | Meta | dibuat | ADA | abrasi.json dibuat; registry sumber_status (4 sumber); tests/warga/tepi.test.mjs:89 | Mengisi /api/status |
| A38 | Data statis bulanan | sebagian | SEBAGIAN | abrasi.json (dibuat 2 Nov) | Usulan statis.yml di abrasi.md belum dipasang; tidak ada workflow abrasi |
| A39 | Seri jangka pendek bergulir | sebagian | SEBAGIAN | pasut_30h.json; rob.json hari | Tanpa seri_status pesisir |
| A40 | Data respons dan kontak | belum | BELUM | - | Tanpa unit respons, BPBD pesisir, atau kontak |
| B01 | Model prakiraan | sebagian | SEBAGIAN | abrasi.py (laju_10th) | Ekstrapolasi laju, bukan model prakiraan terlatih |
| B02 | Uji balik aturan status | sebagian | SEBAGIAN | abrasi.py validasi (tabel literatur); rob_label.py; layar.test.mjs | Abrasi dibanding literatur: Indramayu tidak cocok; uji balik rob terhadap kejadian belum dihitung POD/FAR |
| B03 | Prospektif | sebagian | SEBAGIAN | scripts/prediksi/catat.py:19-20 (kolom ROB) | Rob dinilai prospektif; gelombang dan abrasi tidak |
| B04 | Kasus historis | belum | BELUM | - | Hanya arsip rob_kejadian, bukan galeri kasus |
| B05 | Galat dan pendorong | sebagian | SEBAGIAN | abrasi.md vonis per kasus; saringan lompatan (layar.test.mjs:26) | Ada pemeriksa bersih; tanpa pendorong |
| B06 | Tren jangka panjang | dibuat | ADA | public/pesisir/tren.js; abrasi.py nilai_transek (regresi, AR(1)); layar.test.mjs:89 | Arah per situs dari cacah transek |
| B07 | Kesetaraan Python↔JS | sebagian | SEBAGIAN | hitung.js (JS) vs abrasi.py ringkas (Python) | Diuji lewat node di layar.test.mjs, tanpa uji kesetaraan terhadap keluaran Python |
| B08 | Selang ketidakpastian | dibuat | ADA | abrasi.json ci95; tren rentang antarkuartil | Selang ada |
| B09 | Kinerja tercatat | dibuat | ADA | abrasi.json catatan[]; layar.test.mjs | Catatan kejujuran tampil |
| B10 | Dokumen riset | sebagian | SEBAGIAN | banjir/RISET-ROB.md; docs/multi-bencana/bencana/abrasi.md | Tidak ada scripts/pesisir/RISET-*.md |
| C01 | Kepala + menu bencana | dibuat | ADA | public/pesisir/index.html; registry pesisir | Dari registry |
| C02 | Tab dan URL bersih | dibuat | ADA | public/pesisir/pesisir.js:35 (6 tab) | Peta, Insight, Tren, Foto, Tentang, Lapor Warga (tersembunyi) |
| C03 | Tema terang/gelap | dibuat | ADA | index.html tema | Bersama |
| C04 | Waktu data | sebagian | SEBAGIAN | pesisir.js:17; index.html | Waktu data dari beberapa berkas; tanpa meta pesisir tunggal |
| C05 | Panel kiri | diadaptasi | ADA | pesisir.js MODE_LAPIS | Mode rob, ombak, abrasi |
| C06 | Rentang waktu | sebagian | SEBAGIAN | pesisir.js:15 (HARI_INI, ?sekarang) | Satu hari dipilih |
| C07 | Garis waktu prakiraan | sebagian | SEBAGIAN | pesisir.js:30 (adaGel) | Hari prakiraan rob/gelombang, bukan garis waktu penuh |
| C08 | Panel lapisan | dibuat | ADA | public/pesisir/peta.js:19-23 (lapis.js) | Lapisan modular |
| C09 | Choropleth wilayah + kartu hover | sebagian | SEBAGIAN | peta.js | Rob titik dan transek; choropleth wilayah tidak ada |
| C10 | Gelembung cluster | sebagian | SEBAGIAN | peta.js | Titik, bukan gelembung terkluster |
| C11 | Popup titik | dibuat | ADA | peta.js:71-80 | Kartu hover/popup titik |
| C12 | Laci kejadian | belum | BELUM | - | Tanpa laci kejadian (tak ada kejadian P) |
| C13 | Legenda | dibuat | ADA | peta.js | Legenda |
| C14 | Insight | diadaptasi | ADA | public/pesisir/insight.js (61 baris); grafik.js | Gaya kartu bersama |
| C15 | Tabel kejadian | sebagian | SEBAGIAN | insight.js | Daftar transek tercepat mundur; bukan tabel kejadian |
| C16 | Cerita | belum | BELUM | - | Tidak ada cerita pesisir |
| C17 | Berita | belum | BELUM | public/pesisir/pesisir.js:35 (tab tanpa Berita) | Berita dikumpulkan tetapi tidak ditampilkan |
| C18 | Tren | dibuat | ADA | public/pesisir/tren.js | Tren abrasi dan rob per tahun |
| C19 | Posko, Sarana, Operasi, Keputusan | belum | SEBAGIAN | public/inti/renlap.js; public/inti/pb_titik.js | Seksi sarana dan renlap tampil di /operasi; sub-tab Keputusan belum |
| C20 | Dampak | belum | BELUM | - | Tanpa tab Dampak |
| C21 | Dashboard pimpinan | belum | SEBAGIAN | public/inti/dasbor_pimpinan.js; public/bnpb/pimpinan.js; src/pb_ringkas.js; public/bencana.json (dasbor.ringkas) | PB-30/31/47: GET /api/pb/ringkas dan /bnpb/pimpinan membaca ringkas per bencana; angka belum diuji dengan data produksi dan tidak dijumlah antarsumber |
| C22 | Metode | sebagian | SEBAGIAN | public/pesisir/tentang.js (22 baris) | Tanpa tab Metode; metode ada di abrasi.md dan banjir/metode.js |
| C23 | Simulasi | belum | BELUM | - | Tanpa simulasi genangan rob dari laut |
| C24 | Lapor Warga | sebagian | SEBAGIAN | migrations/0090_pesisir.sql; lapor_bahaya abrasi, gelombang_pasang | Tab Informasi tersembunyi |
| C25 | Foto lapangan | dibuat | ADA | public/foto.js:12; src/foto.js:73-75; public/pesisir/foto.js | Kategori abrasi, rob, gelombang |
| C26 | Pop-up situasi hari ini | belum | BELUM | - | Tanpa pop-up situasi |
| C27 | Bagikan | sebagian | SEBAGIAN | public/bagikan.js:502; registry bagikan | Rekomendasi rob ada; tanpa template pesisir |
| C28 | OG per rute | sebagian | SEBAGIAN | src/og_meta.js; registry og | Tanpa kasus pesisir di og.test.mjs |
| C29 | i18n EN | sebagian | SEBAGIAN | public/i18n/en.json (40 sebutan); i18n.js | Tanpa crawl per rute /pesisir/ |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | ADA | index.html | Bersama |
| C31 | Muat / kosong / galat / luring | sebagian | SEBAGIAN | pesisir.js:57-59 (data kosong dibuang) | Tanpa kerangka muat/galat per tab |
| C32 | Mobile 375 px | sebagian | SEBAGIAN | - | Tanpa uji 375 px otomatis |
| C33 | Klik tidak membekukan | sebagian | SEBAGIAN | index.html nanti() | Tanpa gerbang otomatis |
| C34 | Halaman Tentang dan kartu bencana | sebagian | SEBAGIAN | public/pesisir/tentang.js | Kartu bencana di Tentang belum dicek |
| C35 | Statistik publik | dibuat | ADA | tests/warga/registry.test.mjs:48; skema.test.mjs:303 | hal pesisir terdaftar |
| C36 | Admin moderasi | sebagian | SEBAGIAN | src/admin_halaman.js | Pemilah bahaya, tanpa antrean pesisir khusus |
| C37 | Bagikan lanjutan | sebagian | SEBAGIAN | public/bagi.js | Bersama |
| C38 | Lapisan tambahan | sebagian | SEBAGIAN | registry lapisan; peta.js | Konteks pesisir terbatas |
| C39 | Kaki dan Tentang | dibuat | ADA | kaki.js; tentang.js | Bersama |
| D01 | Rute HTML | dibuat | ADA | src/bencana.generated.js:363-369 | Dari registry |
| D02 | Route data cepat | sebagian | SEBAGIAN | src/dalops.js:33 (GET /api/dalops/gelombang) | Tanpa /api/pesisir/terbaru |
| D03 | Cron | sebagian | SEBAGIAN | src/ews.js:210 (rob tiap jam, jarak 10 km) | Gelombang dan abrasi tanpa EWS; registry cron_worker kosong |
| D04 | Status kesegaran | dibuat | ADA | registry sumber_status 4 sumber; tests/warga/tepi.test.mjs:89 | abrasi 9000 jam |
| D05 | Lapor warga | sebagian | SEBAGIAN | migrations/0090_pesisir.sql; lapor_bahaya | Tak ada uji api.test untuk jenis pesisir |
| D06 | Foto | dibuat | ADA | migrations/0090_pesisir.sql; src/foto.js:73-75 | Kategori pesisir |
| D07 | Statistik | dibuat | ADA | skema.test.mjs:303 | hal pesisir |
| D08 | OG meta | sebagian | SEBAGIAN | registry og pesisir | Tanpa uji |
| D09 | Dummy | tidak berlaku | TB | - | Pemilik pensiunkan data dummy 11 Nov 2026 |
| D10 | Privasi | dibuat | ADA | worker.js:114 | Bersama |
| E01 | Self-check per skrip | sebagian | SEBAGIAN | tests/pesisir/layar.test.mjs (11 tes); abrasi.py uji; rob_label.py uji | Tidak dipicu workflow |
| E02 | Cakupan route/tabel | belum | BELUM | tests/warga/cakupan.json | Tanpa entri route pesisir |
| E03 | Skema D1 | dibuat | ADA | tests/warga/skema.test.mjs:275-276 | 0090_pesisir.sql |
| E04 | Registry | dibuat | ADA | tests/agen/gerbang-bencana.test.mjs:51 (pesisir) | Hijau |
| E05 | Duplikasi inti | dibuat | ADA | gerbang-inti.test.mjs | Bersama |
| E06 | Kesegaran data | dibuat | ADA | tests/agen/gerbang-kesegaran.test.mjs:32 (pesisir) | Registry mengawasi 4 sumber |
| E07 | Beban | belum | BELUM | tests/beban/ukur_muat.mjs | Rute /pesisir/ tak diukur |
| E08 | i18n | sebagian | SEBAGIAN | kumpul.mjs | Tanpa kunci /pesisir/ |
| E09 | Kepemilikan berkas | dibuat | ADA | roster.json:549; ilmu-agent/pesisir.md | Hijau |
| E10 | Model agent | dibuat | ADA | roster pesisir model sonnet | Hijau |
| F01 | Pengerja agent | dibuat | ADA | roster.json:549 | - |
| F02 | Dokumen spesifikasi | dibuat | ADA | docs/multi-bencana/bencana/pesisir.md | Audit ini; abrasi.md = dokumen metode abrasi, terpisah |
| F03 | Dokumen riset | sebagian | SEBAGIAN | banjir/RISET-ROB.md; abrasi.md | Tak ada RISET di scripts/pesisir |
| F04 | Kredit dan lisensi | sebagian | SEBAGIAN | abrasi.json sumber[]; rob_kejadian.json sumber | Tidak ada kredit.json; tidak ada kartu kredit di tentang |

## Komponen baru (audit 15 Nov)

Fitur karhutla yang lahir sesudah 19 Okt. Status = apakah bencana ini sudah tercakup fitur itu.

| Kode | Komponen | Status paket | Audit | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | belum | BELUM | src/instansi.js:335 | Tugas lapangan belum punya jenis pesisir |
| G02 | Operasi udara/darat | belum | SEBAGIAN | public/bencana.json (operasi, renlap.sarana, bobot hipotesis); scripts/umum/renlap.py; public/inti/renlap.js; public/inti/pb_titik.js | PB-35: seksi operasi dan sarana tampil di /operasi lewat registri; belum ada pantauan udara khusus dan bobot masih hipotesis |
| G03 | Sarana lapangan terencana (SIPPA) | belum | SEBAGIAN | public/inti/pb_titik.js; public/bencana.json (renlap.sarana) | PB-35: sarana lapangan terencana lewat titik sarana umum, bukan SIPPA pipa; belum ada kit khusus jenis |
| G04 | Laporan harian/penanganan otomatis (deck, bot WA) | sebagian | SEBAGIAN | data/laporan-bnpb/generator/situasi_banjir.py (rob pesisir 66 titik) | Rob ikut deck banjir; gelombang dan abrasi tidak |
| G05 | Dalops: cek kabar luar, saringan per bencana, tindak lanjut | sebagian | SEBAGIAN | src/dalops.js:33; scripts/data/dalops_banjir.py (gelombang_pasang) | Saringan gelombang pasang ada; rob tidak ikut; cek kabar luar terbatas |
| G06 | Prakiraan +1..+3 hari dinilai prospektif (/prediksi) | sebagian | SEBAGIAN | scripts/prediksi/catat.py:19-20 (ROB) | Hanya rob; gelombang dan abrasi tidak |
| G07 | Semai awan dan prakiraan asap | tidak berlaku | TB | - | Semai awan tidak relevan pesisir |
| G08 | Masuk laporan berkala Kepala BNPB | belum | BELUM | - | Tak ada di perakit berkala |
| G09 | Peringatan dini tersambung (EWS, CAP) | sebagian | SEBAGIAN | src/ews.js:35,210; public/bencana.json (ews.kunci pesisir); migrations/0137_peringatan_x.sql | PB-38a/46a/36c: penilai tiap jam lewat ASSETS ke peringatan_x; migrasi 0137_peringatan_x.sql belum diterapkan di produksi, jadi belum ADA (gelombang BMKG diteruskan; rob lama tetap) |
| G10 | Renlap (rencana operasi harian) lengkap | belum | SEBAGIAN | public/bencana.json (operasi, renlap.sarana, bobot hipotesis); scripts/umum/renlap.py; public/inti/renlap.js; public/inti/pb_titik.js | PB-35: sumber target, KML/GPX/teks WA lewat renlap umum; belum ada versi terbit di produksi atau PDF khusus jenis |
| G11 | Pembuat dokumen (laporan, sitrep, renkon, cetak A4) | sebagian | SEBAGIAN | data/laporan-bnpb/generator/situasi_banjir.py | Hanya sebagai bagian deck banjir |
